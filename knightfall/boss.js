import { hit } from './player.js';
import { sfx } from './audio.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const FLOOR = 420;                                                              // the throne room floor

// The Ash Warden. Three attacks, and every one is announced in orange first:
//   cleave - slams the floor; a shockwave runs along the ground   -> jump it
//   volley - lobbed ember spikes land where you were standing     -> parry or move
//   charge - a body rush; he plants himself afterwards            -> punish the rest
// Phase 2 (half health) adds the double shockwave and speeds everything up.
//
// His kite shield is up while he stalks you (guard) and comes down when he commits
// (open, attacks, recovery, rest). Only a parried spike actually dazes him.
export class AshWarden {
  constructor(d) {
    this.w = 56; this.h = 76;
    this.x0 = d.x; this.y0 = d.y; this.x = d.x; this.y = d.y;
    this.wake = d.wake ?? 1350;
    this.max = d.hp || 16; this.hp = this.max;
    this.dir = -1; this.st = 'dormant'; this.t = 0; this.cool = 0;
    this.atk = null; this.wind = 0; this.flash = 0; this.iframe = 0;
    this.shots = []; this.waves = [];
    this.phase = 1; this.forced = null; this.last = null; this.stunT = 1.15;
    this.guardT = 0; this.restT = 0; this.blockFlash = 0; this.moving = false;
  }
  get alive() { return this.hp > 0; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  reset() {
    this.x = this.x0; this.y = this.y0; this.hp = this.max;
    this.dir = -1; this.st = 'dormant'; this.t = 0; this.cool = 0;
    this.atk = null; this.wind = 0; this.flash = 0; this.iframe = 0;
    this.shots = []; this.waves = [];
    this.phase = 1; this.forced = null; this.last = null;
    this.guardT = 0; this.restT = 0; this.blockFlash = 0;
  }

  enterGuard() { this.st = 'guard'; this.t = 0; this.guardT = this.phase === 2 ? 1.2 : 1.6; }
  enterOpen() { this.st = 'open'; this.t = 0; this.cool = this.phase === 2 ? 1.0 : 1.4; }

  fire(p) {
    const sx = this.x + this.w / 2 + this.dir * 26, sy = this.y + 24;
    const t = .95, vx = (p.x + p.w / 2 - sx) / t;                               // a high, readable lob
    this.shots.push({ x: sx, y: sy, vx, vy: -368, life: 2.6, spin: 0 });
    sfx.ember();
  }

  spawnWave(d) {
    this.waves.push({ x: this.x + this.w / 2 - 22 + d * 8, y: FLOOR - 18, w: 44, h: 18, vx: d * 430, life: 1.9 });
  }

  stun(g, dur) {
    if (this.st === 'dead' || this.st === 'gone' || this.st === 'dormant' || this.st === 'rise') return;
    this.st = 'stun'; this.t = 0; this.stunT = dur; g.shake(8);
  }

  // A swing that catches an ember spike sends it home. Returns how many were turned.
  parry(p, g) {
    if (p.swing <= 0 || !this.shots.length) return 0;
    const bw = 48, box = { x: p.face > 0 ? p.x + p.w : p.x - bw, y: p.y - 4, w: bw, h: 42 };
    let n = 0;
    for (const s of this.shots) {
      if (s.reflected) continue;
      if (!hit(box, { x: s.x - 9, y: s.y - 9, w: 18, h: 18 })) continue;
      const tx = this.x + this.w / 2, ty = this.y + 28, t = .3;                 // straight back at his chest
      s.reflected = 1; s.vx = (tx - s.x) / t; s.vy = (ty - s.y) / t; s.spin = 0;
      spark(g, s.x, s.y);
      n++;
    }
    if (n) { sfx.parry(); g.shake(3); g.stop(.05); }
    return n;
  }

  // 0 = nothing, 1 = damage, 2 = the shield ate it
  takeHit(sw) {
    if (this.st === 'dormant' || this.st === 'rise' || this.st === 'charge' || this.st === 'enrage'
      || this.st === 'dead' || this.st === 'gone') return 0;
    if (!hit(sw, this.box())) return 0;
    if (this.st === 'guard') { this.blockFlash = .18; return 2; }
    if (this.iframe > 0) return 0;
    this.iframe = .3; this.flash = .14; this.hp--;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.t = 0; this.shots = []; this.waves = []; }
    else if (this.phase === 1 && this.hp <= this.max / 2) {                      // half health: he burns brighter
      this.phase = 2; this.st = 'enrage'; this.t = 0; this.forced = 'double';
    }
    return 1;
  }

  tickHazards(dt, p, g) {
    for (const s of this.shots) {
      s.spin += dt * (s.reflected ? 24 : 12);
      if (s.reflected) {                                                         // coming home: no gravity, no mercy
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (hit({ x: s.x - 9, y: s.y - 9, w: 18, h: 18 }, this.box())) {
          s.done = 1; sfx.hit(); this.stun(g, 1.3);
        } else if (s.x < 0 || s.x > 2400 || s.y < 0) s.done = 1;
      } else {
        s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        if (hit(p, { x: s.x - 9, y: s.y - 9, w: 18, h: 18 })) { p.hurt(s.x, g); s.life = 0; }
        if (s.y > FLOOR - 6 || s.life <= 0) { s.done = 1; }
      }
    }
    this.shots = this.shots.filter(s => !s.done);
    for (const w of this.waves) {
      w.x += w.vx * dt; w.life -= dt;
      if (hit(p, w)) p.hurt(w.x + w.w / 2, g);
      if (w.life <= 0 || (w.vx > 0 ? w.x > 2300 : w.x < 40)) w.done = 1;
    }
    this.waves = this.waves.filter(w => !w.done);
  }

  update(dt, p, g) {
    const x0 = this.x;
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.iframe > 0) this.iframe -= dt;
    if (this.blockFlash > 0) this.blockFlash -= dt;
    this.tickHazards(dt, p, g);

    const px = p.x + p.w / 2, bx = this.x + this.w / 2, dx = px - bx, dist = Math.abs(dx);
    const p2 = this.phase === 2;

    if (this.st === 'dormant') {
      if (p.x + p.w > this.wake) {
        this.st = 'rise'; this.t = 0; this.dir = dx < 0 ? -1 : 1;
        g.shake(8); sfx.wake();
      }
      return;
    }
    if (this.st === 'gone') return;
    if (this.st === 'dead') { if (this.t > 1.8) this.st = 'gone'; return; }
    if (this.st === 'rise') {
      if (this.t > 1.15) this.enterGuard();
      return;
    }
    if (this.st === 'enrage') {                                                 // invulnerable, then he lets go
      if (this.t > 1.3) { this.st = 'open'; this.t = 0; this.cool = .3; }
      return;
    }
    if (this.st !== 'charge') this.dir = dx < 0 ? -1 : 1;

    if (this.st === 'guard') {                                                  // shield up: stalk, do not commit
      this.guardT -= dt;
      if (dist > 210) this.x = clamp(this.x + Math.sign(dx) * (p2 ? 85 : 60) * dt, 110, 2160 - this.w);
      if (this.guardT <= 0) this.enterOpen();
    } else if (this.st === 'open') {                                            // shield down: the window
      this.cool -= dt;
      if (dist > 170) this.x = clamp(this.x + Math.sign(dx) * (p2 ? 105 : 70) * dt, 110, 2160 - this.w);
      if (this.cool <= 0) {
        let pick;
        if (this.forced) { pick = this.forced; this.forced = null; }             // the double leads phase 2
        else {
          const base = dist < 240 ? 'cleave' : dist < 560 ? 'charge' : 'volley';
          if (p2) {
            const r = Math.random();
            if (r < .2 && this.last !== 'double') pick = 'double';
            else if (r < .45) pick = ['cleave', 'volley', 'charge'].filter(a => a !== base && a !== this.last)[0] || base;
            else pick = base;
          } else pick = base;
        }
        this.last = pick; this.atk = pick;
        this.wind = (pick === 'cleave' ? .55 : pick === 'volley' ? .7 : .62) * (p2 ? .7 : 1);
        this.st = 'wind'; this.t = 0; sfx.wind();
      }
    } else if (this.st === 'wind') {
      if (this.t >= this.wind) {
        this.t = 0;
        if (this.atk === 'cleave') {
          this.st = 'act'; this.act = .3; this.pair = 1;
          this.waves.push({ x: this.dir > 0 ? this.x + this.w - 12 : this.x - 32, y: FLOOR - 18, w: 44, h: 18, vx: this.dir * 430, life: 1.8 });
          g.shake(8); sfx.heavy();
        } else if (this.atk === 'double') {
          this.st = 'act'; this.act = .8; this.pair = 0;
          this.spawnWave(-1); this.spawnWave(1);
          g.shake(10); sfx.heavy();
        } else if (this.atk === 'volley') {
          this.st = 'volley'; this.fired = 1; this.need = p2 ? 4 : 3; this.fire(p);
        } else {
          this.st = 'charge'; this.vx = this.dir * (p2 ? 600 : 520); this.ct = 0; sfx.charge();
        }
      }
    } else if (this.st === 'act') {
      if (this.atk === 'double' && this.pair === 0 && this.t >= .34) {          // second pair: jump, land, jump
        this.pair = 1; this.spawnWave(-1); this.spawnWave(1); g.shake(7); sfx.heavy();
      }
      if (this.t >= this.act) { this.st = 'recover'; this.t = 0; }
    } else if (this.st === 'volley') {
      const gap = p2 ? .15 : .18;
      if (this.fired < this.need && this.t >= this.fired * gap) { this.fire(p); this.fired++; }
      else if (this.fired >= this.need && this.t >= this.need * gap + .45) { this.st = 'recover'; this.t = 0; }
    } else if (this.st === 'charge') {
      this.x += this.vx * dt; this.ct += dt;
      if (this.x < 110 || this.x > 2160 - this.w || this.ct > .95) {
        this.x = clamp(this.x, 110, 2160 - this.w);
        this.st = 'rest'; this.t = 0; this.restT = p2 ? .8 : 1.0;               // spent, not dazed
        g.shake(6); sfx.boom();
      }
    } else if (this.st === 'rest') {
      if (this.t > this.restT) this.enterGuard();
    } else if (this.st === 'stun') {
      if (this.t > this.stunT) { this.st = 'recover'; this.t = 0; }
    } else if (this.st === 'recover') {
      if (this.t > (p2 ? .32 : .5)) this.enterGuard();
    }

    const contact = this.st === 'guard' || this.st === 'open' || this.st === 'wind' || this.st === 'act'
      || this.st === 'volley' || this.st === 'charge' || this.st === 'recover' || this.st === 'rest';
    if (contact && hit(p, this.box())) p.hurt(bx, g);
    this.moving = Math.abs(this.x - x0) > .02;
  }
}

function spark(g, x, y) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * 6.28, sp = 70 + Math.random() * 150;
    g.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, l: .35 + Math.random() * .25, col: '#ffd479' });
  }
}
