import { hit } from './player.js';
import { sfx } from './audio.js';
import { Husk } from './enemies.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const FLOOR = 420;

// The Ash King. Three phases, reusing the Warden's vocabulary:
//   1  cleave / volley / charge
//   2  Ember Husk adds join, everything speeds up
//   3  the hall goes dark and he can only be struck inside your own light
export class AshKing {
  constructor(d) {
    this.w = 64; this.h = 92;
    this.x0 = d.x; this.y0 = d.y; this.x = d.x; this.y = d.y;
    this.wake = d.wake ?? 560;
    this.max = d.hp || 24; this.hp = this.max;
    this.title = 'THE ASH KING'; this.scale = 1.5;
    this.dir = -1; this.st = 'dormant'; this.t = 0; this.cool = 1;
    this.atk = null; this.wind = 0; this.flash = 0; this.iframe = 0;
    this.shots = []; this.waves = [];
    this.phase = 1; this.lit = 1; this.stunT = 1.1; this.added = 0;
  }
  get alive() { return this.hp > 0; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  reset() {
    this.x = this.x0; this.y = this.y0; this.hp = this.max; this.dir = -1;
    this.st = 'dormant'; this.t = 0; this.cool = 1; this.atk = null; this.wind = 0;
    this.flash = 0; this.iframe = 0; this.shots = []; this.waves = [];
    this.phase = 1; this.lit = 1; this.added = 0;
  }

  fire(p) {
    const sx = this.x + this.w / 2 + this.dir * 30, sy = this.y + 30;
    const t = .9, vx = (p.x + p.w / 2 - sx) / t;
    this.shots.push({ x: sx, y: sy, vx, vy: -360, life: 2.6, spin: 0 });
    sfx.ember();
  }
  spawnWave(d) {
    this.waves.push({ x: this.x + this.w / 2 - 22 + d * 10, y: FLOOR - 18, w: 44, h: 18, vx: d * 430, life: 1.9 });
  }
  stun(g, dur) {
    if (this.st === 'dead' || this.st === 'gone' || this.st === 'dormant' || this.st === 'rise') return;
    this.st = 'stun'; this.t = 0; this.stunT = dur; g.shake(8);
  }
  parry(p, g) {
    if (p.swing <= 0 || !this.shots.length) return 0;
    const bw = 48, box = { x: p.face > 0 ? p.x + p.w : p.x - bw, y: p.y - 4, w: bw, h: 42 };
    let n = 0;
    for (const s of this.shots) {
      if (s.reflected) continue;
      if (!hit(box, { x: s.x - 9, y: s.y - 9, w: 18, h: 18 })) continue;
      const tx = this.x + this.w / 2, ty = this.y + 34, t = .3;
      s.reflected = 1; s.vx = (tx - s.x) / t; s.vy = (ty - s.y) / t; s.spin = 0;
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, sp = 70 + Math.random() * 150; g.parts.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, l: .5, col: '#ffd479' }); }
      n++;
    }
    if (n) { sfx.parry(); g.shake(3); g.stop(.05); }
    return n;
  }

  takeHit(sw) {
    if (this.st === 'dormant' || this.st === 'rise' || this.st === 'charge' || this.st === 'enrage'
      || this.st === 'dead' || this.st === 'gone') return 0;
    if (!hit(sw, this.box())) return 0;
    if (this.phase === 3 && !this.lit) return 0;                 // in the dark only light can reach him
    if (this.iframe > 0) return 0;
    this.iframe = .28; this.flash = .14; this.hp--;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.t = 0; this.shots = []; this.waves = []; }
    else if (this.phase === 1 && this.hp <= this.max * 2 / 3) {
      this.phase = 2; this.st = 'enrage'; this.t = 0;
    } else if (this.phase === 2 && this.hp <= this.max / 3) {
      this.phase = 3; this.st = 'enrage'; this.t = 0;
    }
    return 1;
  }

  tickHazards(dt, p, g) {
    for (const s of this.shots) {
      s.spin = (s.spin || 0) + dt * (s.reflected ? 24 : 12);
      if (s.reflected) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (hit({ x: s.x - 9, y: s.y - 9, w: 18, h: 18 }, this.box())) { s.done = 1; sfx.hit(); this.stun(g, 1.2); }
        else if (s.x < 0 || s.x > 1700 || s.y < 0) s.done = 1;
      } else {
        s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        if (hit(p, { x: s.x - 9, y: s.y - 9, w: 18, h: 18 })) { p.hurt(s.x, g); s.life = 0; }
        if (s.y > FLOOR - 6 || s.life <= 0) s.done = 1;
      }
    }
    this.shots = this.shots.filter(s => !s.done);
    for (const w of this.waves) {
      w.x += w.vx * dt; w.life -= dt;
      if (hit(p, w)) p.hurt(w.x + w.w / 2, g);
      if (w.life <= 0 || (w.vx > 0 ? w.x > 1500 : w.x < 60)) w.done = 1;
    }
    this.waves = this.waves.filter(w => !w.done);
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
    if (this.st === 'dead') { if (this.t > 2.0) this.st = 'gone'; return; }
    if (this.st === 'rise') { if (this.t > 1.2) { this.st = 'idle'; this.t = 0; this.cool = .8; } return; }
    if (this.st === 'enrage') {
      if (this.t > 1.2) { this.st = 'idle'; this.t = 0; this.cool = .5; }
      return;
    }
    if (this.st !== 'charge') this.dir = dx < 0 ? -1 : 1;

    if (this.st === 'idle') {
      this.cool -= dt;
      if (dist > 200) this.x = clamp(this.x + Math.sign(dx) * (ph === 3 ? 95 : 70) * dt, 60, 1500 - this.w);
      if (this.cool <= 0) {
        const fast = ph > 1;
        let pick = dist < 240 ? 'cleave' : dist < 620 ? 'volley' : 'charge';
        if (ph === 3 && Math.random() < .3) pick = 'double';
        this.atk = pick;
        this.wind = (pick === 'cleave' ? .55 : pick === 'volley' ? .7 : .62) * (fast ? .75 : 1);
        this.st = 'wind'; this.t = 0; sfx.wind();
      }
    } else if (this.st === 'wind') {
      if (this.t >= this.wind) {
        this.t = 0;
        if (this.atk === 'cleave') {
          this.st = 'act'; this.act = .3; this.pair = 1;
          this.waves.push({ x: this.dir > 0 ? this.x + this.w - 12 : this.x - 32, y: FLOOR - 18, w: 44, h: 18, vx: this.dir * 430, life: 1.8 });
          g.shake(9); sfx.heavy();
        } else if (this.atk === 'double') {
          this.st = 'act'; this.act = .8; this.pair = 0; this.spawnWave(-1); this.spawnWave(1);
          g.shake(11); sfx.heavy();
        } else if (this.atk === 'volley') {
          this.st = 'volley'; this.fired = 1; this.need = ph > 1 ? 4 : 3; this.fire(p);
        } else {
          this.st = 'charge'; this.vx = this.dir * (ph === 3 ? 600 : 520); this.ct = 0; sfx.charge();
        }
      }
    } else if (this.st === 'act') {
      if (this.atk === 'double' && this.pair === 0 && this.t >= .34) { this.pair = 1; this.spawnWave(-1); this.spawnWave(1); g.shake(7); sfx.heavy(); }
      if (this.t >= this.act) { this.st = 'recover'; this.t = 0; }
    } else if (this.st === 'volley') {
      const gap = ph > 1 ? .15 : .18;
      if (this.fired < this.need && this.t >= this.fired * gap) { this.fire(p); this.fired++; }
      else if (this.fired >= this.need && this.t >= this.need * gap + .45) { this.st = 'recover'; this.t = 0; }
    } else if (this.st === 'charge') {
      this.x += this.vx * dt; this.ct += dt;
      if (this.x < 60 || this.x > 1500 - this.w || this.ct > .95) {
        this.x = clamp(this.x, 60, 1500 - this.w);
        this.st = 'rest'; this.t = 0; this.restT = ph === 3 ? .7 : 1.0;
        g.shake(7); sfx.boom();
      }
    } else if (this.st === 'rest') {
      if (this.t > this.restT) { this.st = 'recover'; this.t = 0; }
    } else if (this.st === 'stun') {
      if (this.t > this.stunT) { this.st = 'recover'; this.t = 0; }
    } else if (this.st === 'recover') {
      if (this.t > (ph > 1 ? .34 : .5)) { this.st = 'idle'; this.t = 0; this.cool = ph === 3 ? .3 : ph === 2 ? .5 : .8; }
    }

    if (this.st === 'enrage' || this.st === 'idle') {              // phase beats
      if (this.phase === 2 && !this.added) {
        this.added = 1;
        g.enemies.push(new Husk({ x: 220, y: FLOOR - 30, hp: 2 }), new Husk({ x: 380, y: FLOOR - 30, hp: 2 }));
      }
      if (this.phase === 3 && this.added === 1) {
        this.added = 2;
        g.l.darkZones = [[0, g.l.w]];                              // the hall goes dark
        g.dark = Math.max(g.dark, .35);
      }
    }

    const contact = this.st === 'idle' || this.st === 'wind' || this.st === 'act'
      || this.st === 'volley' || this.st === 'charge' || this.st === 'rest' || this.st === 'recover';
    if (contact && hit(p, this.box())) p.hurt(bx, g);
    this.moving = Math.abs(this.x - x0) > .02;
  }
}
