import { hit } from './player.js';
import { sfx } from './audio.js';
import { Hexer } from './enemies.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const FLOOR = 420;
const HOVER = 250;                 // his feet while he floats: high enough that a sword cannot reach
const GRAV = 1300;

// The Ash King, second fight. He is not the Warden in a new coat: he never brawls.
// He hangs above the arena and denies the ground - ember rain, snares, fire on the ledges, a shove
// for anyone who crowds him, eruptions that punish standing still, a grasp that punishes staying
// grounded, a heavy meteor that cracks ledges away, and twin bolts to parry. Steel does nothing
// against the ward (takeHit returns clang), so the only opening is his own spell: swing an Ember
// Bolt back into him, the ward breaks, he drops to the floor stunned, and only then does the sword bite.
export class AshKing {
  constructor(d) {
    this.w = 64; this.h = 92;
    this.x0 = d.x; this.y0 = FLOOR - this.h;                 // dormant: standing at the back of the hall
    this.x = d.x; this.y = this.y0;
    this.hover = d.hover ?? HOVER;
    this.wake = d.wake ?? 560;
    this.anchors = d.anchors || [300, 620, 990, 1330];
    this.max = d.hp || 24; this.hp = this.max;
    this.title = 'THE ASH KING'; this.sheet = 'king';
    this.dir = -1; this.st = 'dormant'; this.t = 0; this.cool = 1.2;
    this.atk = null; this.lastAtk = null; this.wind = 1;
    this.flash = 0; this.iframe = 0; this.lit = 1;
    this.phase = 1; this.stunT = 2.4; this.vy = 0;
    this.tx = d.x; this.closeT = 0; this.streak = 0; this.sinceBolt = 0;
    this.drops = []; this.snares = []; this.rings = []; this.burns = []; this.bolts = [];
    this.erupts = []; this.grasps = []; this.meteors = [];
    this.comboed = 0; this.casts = 0; this.fireLit = 0; this.summon = 0;
  }
  get alive() { return this.hp > 0; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  reset() {
    this.x = this.x0; this.y = this.y0; this.hp = this.max; this.dir = -1;
    this.st = 'dormant'; this.t = 0; this.cool = 1.2; this.atk = null; this.lastAtk = null; this.wind = 1;
    this.flash = 0; this.iframe = 0; this.lit = 1;
    this.phase = 1; this.stunT = 2.4; this.vy = 0;
    this.tx = this.x0; this.closeT = 0; this.streak = 0; this.sinceBolt = 0;
    this.drops = []; this.snares = []; this.rings = []; this.burns = []; this.bolts = [];
    this.erupts = []; this.grasps = []; this.meteors = [];
    this.comboed = 0; this.casts = 0; this.fireLit = 0; this.summon = 0;
  }

  /* ---- geometry ---- */
  surfaceUnder(g, x) {                                        // the first thing a falling ember meets
    let best = FLOOR;
    for (const s of g.l.solids) {
      if (s.pass || s.off) continue;
      if (x < s.x || x > s.x + s.w) continue;
      if (s.y > 100 && s.y < best) best = s.y;
    }
    return best;
  }
  crack(g, x, surf) {                                         // remove a ledge for a while, never below two
    const ledges = g.l.solids.filter(s => s.oneway);
    const alive = ledges.filter(s => !s.off);
    const target = ledges.find(s => x >= s.x && x <= s.x + s.w && Math.abs(s.y - surf) < 2);
    if (!target || alive.length <= 2) return null;
    target.off = 1; target.crackT = 4;
    return target;
  }

  /* ---- spellbook ---- */
  pickTarget(p) {
    const px = p.x + p.w / 2;
    let best = this.anchors[0], bd = -1;
    for (const ax of this.anchors) {                          // nearest anchor that is still a safe distance away
      const d = Math.abs(ax - px);
      if (d >= 250 && (bd < 0 || d < bd)) { best = ax; bd = d; }
    }
    if (bd < 0) for (const ax of this.anchors) { const d = Math.abs(ax - px); if (d > bd) { best = ax; bd = d; } }
    this.tx = best;
  }
  pickAtk(p) {
    const ph = this.phase;
    const opts = ['rain', 'snare', 'bolt', 'erupt'];
    if (ph >= 2) opts.push('burn', 'twin', 'meteor', 'bolt');
    if (ph === 3) opts.push('grasp', 'rain', 'bolt');
    let pick;
    if (this.sinceBolt >= (ph >= 2 ? 1 : 2)) pick = 'bolt';   // never leave the player without an opening
    else {
      pick = opts[(Math.random() * opts.length) | 0];
      if (pick === this.lastAtk && Math.random() < .7) pick = opts[(Math.random() * opts.length) | 0];
    }
    this.atk = pick; this.lastAtk = pick;
    if (pick !== 'bolt') this.sinceBolt++;
  }
  windFor(atk) {
    const ph = this.phase;
    if (atk === 'repulse') return .35;
    if (atk === 'bolt') return .55;                           // the parry stays readable
    if (atk === 'meteor') return ph === 3 ? .7 : .8;
    if (atk === 'rain') return ph === 3 ? .55 : ph === 2 ? .65 : .75;
    if (atk === 'erupt' || atk === 'grasp') return ph === 3 ? .5 : ph === 2 ? .6 : .7;
    if (atk === 'burn') return ph === 3 ? .5 : ph === 2 ? .55 : .6;
    if (atk === 'snare') return .55;                          // never below half a second
    return .6;
  }
  start(atk, p) {
    this.atk = atk; this.st = 'wind'; this.t = 0; this.moving = false;
    this.wind = this.windFor(atk);
    sfx.wind();
  }
  pickLedge(p, g) {
    if (p.groundSolid && p.groundSolid.oneway) return p.groundSolid;
    let best = null, bd = 1e9;
    for (const s of g.l.solids) {
      if (!s.oneway || s.off) continue;
      const d = Math.abs((s.x + s.w / 2) - (p.x + p.w / 2));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  cast(p, g) {
    const ph = this.phase, px = p.x + p.w / 2;
    this.st = 'act'; this.t = 0; this.casts++;
    if (this.atk === 'meteor' && g.l.solids.filter(s => s.oneway && !s.off).length <= 2) this.atk = 'rain';
    if (this.atk === 'rain') {
      const n = 3 + (ph >= 2 ? 1 : 0) + (ph === 3 ? 1 : 0);
      const spread = [0, -120, 120, -240, 240];
      for (let i = 0; i < n; i++) {
        const x = clamp(px + (spread[i] ?? (i - n / 2) * 120) * (ph === 3 ? 1.1 : 1), 70, g.l.w - 70);
        this.drops.push({ x, y: 96, delay: .82, vy: 0, surf: this.surfaceUnder(g, x), live: 0 });
      }
      sfx.ember();
    } else if (this.atk === 'snare') {
      for (let i = 0; i < 3; i++) {
        const x = clamp(px + (i - 1) * 92 + (Math.random() - .5) * 26, 70, g.l.w - 70);
        this.snares.push({ x, y: this.surfaceUnder(g, x), delay: .45 + i * .07, life: 1.5, armed: 0 });
      }
      sfx.ember();
    } else if (this.atk === 'bolt' || this.atk === 'twin') {
      const twin = this.atk === 'twin';
      const sx = this.x + this.w / 2 + this.dir * 26, sy = this.y + 38;
      const heavy = !twin && this.streak >= 3;                // three unparried: give them a slower one
      const sp = heavy ? 185 : 250, r = heavy ? 14 : 10;
      const shots = twin ? [{ dx: -20, t: 0 }, { dx: 70, t: .3 }] : [{ dx: 0, t: 0 }];
      for (const sh of shots) {
        const tx = px + sh.dx, ty = p.y + p.h * .45, d = Math.hypot(tx - sx, ty - sy) || 1;
        this.bolts.push({ x: sx, y: sy, vx: (tx - sx) / d * sp, vy: (ty - sy) / d * sp, r, heavy, life: 4 + sh.t, reflected: 0, spin: 0, delay: sh.t });
      }
      this.streak++; this.sinceBolt = 0;
      sfx.ember();
    } else if (this.atk === 'erupt') {
      const n = ph === 3 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const x = clamp(px + (i - (n - 1) / 2) * 118, 70, g.l.w - 70);
        this.erupts.push({ x, surf: this.surfaceUnder(g, x), delay: .55 + i * .16, t: 0, life: .38 });
      }
      sfx.ember();
    } else if (this.atk === 'grasp') {
      const x = clamp(px, 70, g.l.w - 70);
      this.grasps.push({ x, y: this.surfaceUnder(g, x), delay: .7, t: 0, life: .55 });
      sfx.ember();
    } else if (this.atk === 'meteor') {
      const x = clamp(px, 90, g.l.w - 90);
      this.meteors.push({ x, y: 70, delay: .7, vy: 0, surf: this.surfaceUnder(g, x), t: 0 });
      sfx.ember();
    } else if (this.atk === 'burn') {
      const ledge = this.pickLedge(p, g);
      if (ledge) { this.burns.push({ x0: ledge.x + 6, x1: ledge.x + ledge.w - 6, y: ledge.y, delay: .7, life: 2.0 }); sfx.torch(); }
      else {
        this.drops.push({ x: px, y: 96, delay: .6, vy: 0, surf: this.surfaceUnder(g, px), live: 0 });
        sfx.ember();
      }
    } else if (this.atk === 'repulse') {
      const cx = this.x + this.w / 2;
      this.rings.push({ x: cx, y: this.y + 54, r: 12, t: 0, life: .45 });
      if (Math.abs(px - cx) < 210 && Math.abs((p.y + p.h) - (this.y + this.h)) < 240) {
        p.vx = (px < cx ? -1 : 1) * 470; p.vy = -320; p.kb = .35;
      }
      g.shake(10); sfx.boom();
    }
    this.cool = ph === 3 ? .4 : ph === 2 ? .65 : .9;
    this.closeT = 0;
  }

  /* ---- the ward ---- */
  stun(g, dur) {
    if (this.st === 'stun' || this.st === 'dead' || this.st === 'gone' || this.st === 'dormant' || this.st === 'rise' || this.st === 'enrage') return;
    this.st = 'stun'; this.t = 0; this.stunT = dur; this.vy = 0; this.comboed = 0;
    this.drops = []; this.snares = []; this.burns = []; this.bolts = [];   // a clean punish window
    this.rings = []; this.erupts = []; this.grasps = []; this.meteors = [];
    g.shake(9); sfx.boom();
  }
  parry(p, g) {
    if (p.swing <= 0 || !this.bolts.length) return 0;
    const bw = 48, box = { x: p.face > 0 ? p.x + p.w : p.x - bw, y: p.y - 4, w: bw, h: 42 };
    let n = 0;
    for (const b of this.bolts) {
      if (b.reflected || b.delay > 0) continue;
      if (!hit(box, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) continue;
      const tx = this.x + this.w / 2, ty = this.y + 44, t = .28;
      b.reflected = 1; b.vx = (tx - b.x) / t; b.vy = (ty - b.y) / t;
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, sp = 70 + Math.random() * 150; g.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, l: .5, col: '#ffd479' }); }
      n++;
    }
    if (n) { this.streak = 0; sfx.parry(); g.shake(3); g.stop(.05); }
    return n;
  }
  takeHit(sw) {
    if (this.st === 'dormant' || this.st === 'rise' || this.st === 'enrage' || this.st === 'dead' || this.st === 'gone') return 0;
    if (!hit(sw, this.box())) return 0;
    if (this.st !== 'stun') return 2;                          // the ward: every other swing clangs
    if (this.phase === 3 && !this.lit) return 0;               // in the dark only light can reach him
    if (this.iframe > 0) return 0;
    this.iframe = .26; this.flash = .12; this.hp--;
    if (this.hp <= 0) {
      this.hp = 0; this.st = 'dead'; this.t = 0; this.vy = 0;
      this.drops = []; this.snares = []; this.burns = []; this.bolts = []; this.rings = [];
      this.erupts = []; this.grasps = []; this.meteors = [];
    } else if (this.phase === 1 && this.hp <= this.max * 2 / 3) { this.phase = 2; this.st = 'enrage'; this.t = 0; this.summon = 1; }
    else if (this.phase === 2 && this.hp <= this.max / 3) { this.phase = 3; this.st = 'enrage'; this.t = 0; this.summon = 1; }
    return 1;
  }
  lightArena(g) {
    this.fireLit = 1;
    for (const b of (g.l.braziers || [])) g.l.lights.push([b[0], b[1], 120]);
    g.l.darkZones = [[0, g.l.w]];                              // the snuff: the hall goes dark
    g.dark = Math.max(g.dark, .35);
    g.shake(7);
  }
  puff(g) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.28, sp = 30 + Math.random() * 90;
      g.parts.push({ x: this.x + this.w / 2, y: this.y + this.h - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, l: .5, col: '#8f9bb8' });
    }
  }

  /* ---- hazards ---- */
  tickHazards(dt, p, g) {
    for (const s of g.l.solids) if (s.crackT > 0) { s.crackT -= dt; if (s.crackT <= 0) { s.crackT = 0; s.off = 0; } }

    for (const d of this.drops) {
      if (d.delay > 0) { d.delay -= dt; continue; }
      d.vy += 1500 * dt; d.y += d.vy * dt;
      if (d.y >= d.surf - 6) {
        d.done = 1;
        if (hit(p, { x: d.x - 15, y: d.surf - 30, w: 30, h: 30 })) p.hurt(d.x, g);
        g.shake(4); sfx.hit();
        for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, sp = 50 + Math.random() * 140; g.parts.push({ x: d.x, y: d.surf - 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, l: .45, col: '#ffb066' }); }
      }
    }
    this.drops = this.drops.filter(d => !d.done);

    for (const s of this.snares) {
      if (s.delay > 0) { s.delay -= dt; if (s.delay <= 0) s.armed = 1; }
      else { s.life -= dt; if (s.life <= 0) s.done = 1; }
      if (!s.armed || s.done) continue;
      if (Math.abs((p.x + p.w / 2) - s.x) < 24 && Math.abs((p.y + p.h) - s.y) < 16 && p.root <= 0) {
        p.root = .5; p.vx = 0; sfx.block(); g.shake(2);
      }
    }
    this.snares = this.snares.filter(s => !s.done);

    for (const e of this.erupts) {                             // the floor breaks in a line: be off it
      if (e.delay > 0) { e.delay -= dt; continue; }
      e.t += dt;
      if (e.t >= e.life) { e.done = 1; continue; }
      if (hit(p, { x: e.x - 14, y: e.surf - 66, w: 28, h: 66 })) p.hurt(e.x, g);
    }
    this.erupts = this.erupts.filter(e => !e.done);

    for (const gr of this.grasps) {                            // a hand out of the ash: be airborne
      if (gr.delay > 0) { gr.delay -= dt; continue; }
      gr.t += dt;
      if (gr.t >= gr.life) { gr.done = 1; continue; }
      if (Math.abs((p.x + p.w / 2) - gr.x) < 22 && Math.abs((p.y + p.h) - gr.y) < 22 && p.root <= 0) {
        p.root = .55; p.vx = 0; sfx.block(); g.shake(2);
      }
    }
    this.grasps = this.grasps.filter(gr => !gr.done);

    for (const me of this.meteors) {                           // heavy, slow, and it takes the ledge with it
      me.t += dt;
      if (me.delay > 0) { me.delay -= dt; continue; }
      me.vy += 900 * dt; me.y += me.vy * dt;
      if (me.y >= me.surf - 12) {
        me.done = 1;
        if (hit(p, { x: me.x - 34, y: me.surf - 46, w: 68, h: 46 })) p.hurt(me.x, g);
        g.shake(11); sfx.boom();
        this.crack(g, me.x, me.surf);
        for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, sp = 60 + Math.random() * 170; g.parts.push({ x: me.x, y: me.surf - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70, l: .55, col: i % 3 ? '#ffb066' : '#cfd8ee' }); }
      }
    }
    this.meteors = this.meteors.filter(me => !me.done);

    for (const r of this.rings) { r.t += dt; r.r = 12 + 198 * Math.min(1, r.t / .3); if (r.t > r.life) r.done = 1; }
    this.rings = this.rings.filter(r => !r.done);

    for (const b of this.burns) {
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.life -= dt; if (b.life <= 0) b.done = 1;
      if (hit(p, { x: b.x0, y: b.y - 18, w: b.x1 - b.x0, h: 18 })) p.hurt((b.x0 + b.x1) / 2, g);
    }
    this.burns = this.burns.filter(b => !b.done);

    for (const b of this.bolts) {
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.spin = (b.spin || 0) + dt * (b.reflected ? 24 : 10);
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.reflected) {
        if (hit({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, this.box())) {
          b.done = 1;
          this.stun(g, this.phase === 3 ? 2.0 : this.phase === 2 ? 2.2 : 2.4);
        }
      } else if (hit(p, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
        p.hurt(b.x, g); b.done = 1;
      }
      if (b.life <= 0 || b.x < 40 || b.x > g.l.w - 40 || b.y < 16) b.done = 1;
    }
    this.bolts = this.bolts.filter(b => !b.done);
  }

  update(dt, p, g) {
    const x0 = this.x;
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.iframe > 0) this.iframe -= dt;
    this.tickHazards(dt, p, g);

    const px = p.x + p.w / 2, bx = this.x + this.w / 2, dx = px - bx, dist = Math.abs(dx);
    const ph = this.phase;
    this.lit = g.lightAt ? g.lightAt(bx, this.y + this.h / 2) : 1;

    if (this.st === 'dormant') {
      if (p.x + p.w > this.wake) { this.st = 'rise'; this.t = 0; this.dir = dx < 0 ? -1 : 1; g.shake(10); sfx.wake(); }
      return;
    }
    if (this.st === 'gone') return;

    if (this.st === 'dead') {
      if (this.y < FLOOR - this.h) {                           // one fall, one impact
        this.vy += GRAV * dt;
        this.y = Math.min(this.y + this.vy * dt, FLOOR - this.h);
        if (this.y >= FLOOR - this.h) { this.y = FLOOR - this.h; this.vy = 0; g.shake(9); sfx.boom(); this.puff(g); }
      }
      if (this.t > 2.2) this.st = 'gone';
      return;
    }
    if (this.st === 'rise') {
      const hy = this.hover - this.h;                          // hover is a feet height
      this.y += (hy - this.y) * Math.min(1, dt * 3.2);
      this.dir = dx < 0 ? -1 : 1;
      if (this.t > 1.15) { this.y = hy; this.st = 'idle'; this.t = 0; this.cool = .6; this.pickTarget(p); }
      return;
    }
    if (this.st === 'enrage') {
      this.y += ((this.hover - this.h) - this.y) * Math.min(1, dt * 3.2);
      if (ph === 3 && !this.fireLit) this.lightArena(g);
      if (this.summon && this.t > .45) {                         // a caster answers the call
        this.summon = 0;
        if (!g.enemies.some(e => e.summoned && !e.dead)) {
          const hx = clamp(this.x + (this.dir > 0 ? -130 : 130), 130, g.l.w - 130);
          g.enemies.push(new Hexer({ x: hx, y: 240, x0: hx - 150, x1: hx + 150, hp: 3, dmg: 1, summoned: 1 }));
          g.shake(7); sfx.wake();
          for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, sp = 40 + Math.random() * 110; g.parts.push({ x: hx + 11, y: 256, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, l: .55, col: '#8f9bb8' }); }
        }
      }
      if (this.t > 1.2) { this.st = 'idle'; this.t = 0; this.cool = .45; this.pickTarget(p); this.comboed = 0; }
      return;
    }
    if (this.st === 'stun') {
      if (this.y < FLOOR - this.h) {                           // only while he is still in the air
        this.vy += GRAV * dt;
        this.y = Math.min(this.y + this.vy * dt, FLOOR - this.h);
        if (this.y >= FLOOR - this.h) {
          this.y = FLOOR - this.h; this.vy = 0;
          g.shake(8); sfx.boom(); this.puff(g);                // one impact, once
        }
      }
      if (this.t > this.stunT) { this.st = 'recover'; this.t = 0; }
      return;
    }
    if (this.st === 'recover') {
      const ty = this.hover - this.h;
      this.y += (ty - this.y) * Math.min(1, dt * 5.5);
      if (this.t > (this.y < ty - 6 ? .5 : .3)) { this.st = 'idle'; this.t = 0; this.cool = .4; this.pickTarget(p); this.puff(g); this.comboed = 0; }
      return;
    }

    this.dir = dx < 0 ? -1 : 1;

    if (this.st === 'idle') {
      this.cool -= dt;
      const ax = this.tx;
      if (Math.abs(ax - bx) > 6) this.x = clamp(this.x + Math.sign(ax - bx) * (ph === 3 ? 125 : 95) * dt, 70, g.l.w - 70 - this.w);
      this.y = (this.hover - this.h) + Math.sin(this.t * 2.2) * 3;
      this.closeT = dist < 195 ? this.closeT + dt : 0;
      if (this.closeT > .7) { this.start('repulse', p); return; }   // crowding him gets you shoved off
      if (this.cool <= 0) { this.pickAtk(p); this.start(this.atk, p); }
    } else if (this.st === 'wind') {
      this.y = (this.hover - this.h) + Math.sin(this.t * 2.2) * 2;
      if (this.t >= this.wind) this.cast(p, g);
    } else if (this.st === 'act') {
      if (this.t >= .32) {
        const chance = ph === 3 ? .75 : ph === 2 ? .45 : 0;    // brutal: chains in phase 2 and 3
        if (!this.comboed && this.atk !== 'repulse' && Math.random() < chance) {
          this.comboed = 1;
          this.pickAtk(p);
          const next = this.atk;
          this.start(next, p);
          this.wind += .1;                                     // the follow-up is a touch slower to read
        } else {
          this.comboed = 0;
          this.st = 'recover'; this.t = 0;
        }
      }
    }

    this.moving = Math.abs(this.x - x0) > .02;
  }
}
