// The Gatekeeper Brute: the first real boss. Two telegraphed attacks, and a perfect guard
// against the charge turns his own momentum into a long stun.
import { sfx } from '../audio.js';
import { hit } from '../player.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const burst = (g, x, y, n, col) => {
  if (!g || !g.parts) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, sp = 40 + Math.random() * 140;
    g.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, l: .4 + Math.random() * .25, col });
  }
};

export class GatekeeperBrute {
  constructor(o) {
    Object.assign(this, {
      type: 'brute', x: o.x, y: o.y, w: 40, h: 44, hp: o.hp || 8, maxHp: o.hp || 8,
      wake: o.wake != null ? o.wake : 0, dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0,
      atk: 'slam', cool: 0, vx: 0, hitDone: 0, deadT: 0,
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  stun(t = 1.5) {
    if (this.st === 'dead') return;
    this.st = 'stunned'; this.stT = 0; this.stunT = t; this.vx = 0;
  }
  takeHit() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return 0;
    if (this.st === 'charge') return 2;                          // hyper-armour: clang, no damage
    this.hp--; this.flash = .14;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0; sfx.bossDie(); }
    return 1;
  }
  strike(p, g, box) {
    if (p.inv > 0) return;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2;
    const front = (px - cx) * this.dir > -12;
    const gd = p.guard && p.guard();
    if (gd && front && p.parry > 0) {                            // perfect guard: stun him
      this.stun(1.5); p.inv = .5;
      g.shake(8); g.stop(.06); sfx.parry(); burst(g, px, p.y + p.h / 2, 16, '#fff2b0');
      g.parryMsg = 2.2;
      return;
    }
    if (gd && front) {                                           // normal guard: held, pushed
      p.vx = this.dir * 210; p.inv = .4;
      g.shake(4); sfx.block(); burst(g, px, p.y + p.h / 2, 6, '#7fe3ff');
      g.blockMsg = 1;
      return;
    }
    p.hurt(cx, g);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.st === 'dormant') {
      if (p.x > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(8); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    if (this.st === 'wake') {
      if (this.stT > 1.1) { this.st = 'idle'; this.stT = 0; this.cool = .7; }
      return;
    }
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    if (this.st !== 'charge') this.dir = dx < 0 ? -1 : 1;
    if (this.st === 'stunned') {
      if (this.stT > (this.stunT || 1.5)) { this.st = 'idle'; this.stT = 0; this.cool = .8; }
      return;
    }
    if (this.st === 'wind') {
      const slam = this.atk === 'slam';
      if (this.stT > (slam ? .62 : .55)) {
        if (slam) {
          this.st = 'act'; this.stT = 0; this.hitDone = 0;
          g.shake(9); g.stop(.06); sfx.heavy();
        } else {
          this.st = 'charge'; this.stT = 0; this.vx = this.dir * 400; this.hitDone = 0; sfx.charge();
        }
      }
      return;
    }
    if (this.st === 'act') {
      if (!this.hitDone) {
        const box = { x: cx - 46, y: this.y + 6, w: 92, h: 38 };
        if (hit(p, box)) { this.hitDone = 1; this.strike(p, g, box); }
      }
      if (this.stT > .22) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'charge') {
      this.x += this.vx * dt;
      if (this.x < 890 || this.x > 1120 - this.w || this.stT > .75) {
        this.x = clamp(this.x, 890, 1120 - this.w);
        this.st = 'recover'; this.stT = 0; this.vx = 0;
      }
      if (!this.hitDone) {
        const box = { x: this.x - 6, y: this.y + 6, w: this.w + 12, h: this.h - 6 };
        if (hit(p, box)) { this.hitDone = 1; this.strike(p, g, box); }
      }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > .85) { this.st = 'idle'; this.stT = 0; this.cool = .45; }
      return;
    }
    // idle / stalk
    if (dist > 74) this.x += this.dir * 52 * dt;
    this.x = clamp(this.x, 890, 1120 - this.w);
    this.cool -= dt;
    if (this.cool <= 0) {
      if (dist < 140) { this.atk = 'slam'; this.st = 'wind'; this.stT = 0; sfx.wind(); }
      else if (dist < 340) { this.atk = 'charge'; this.st = 'wind'; this.stT = 0; sfx.wind(); }
      else this.cool = .4;
    }
  }
}
