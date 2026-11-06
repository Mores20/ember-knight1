// Area VII mini-boss: the Lampless Curator. A shade that only becomes solid
// (and hittable) while standing in light. In the dark it hunts and lunges.
import { sfx } from '../audio.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class LamplessCurator {
  constructor(o) {
    Object.assign(this, {
      kind: 'curator', type: 'boss', name: 'THE LAMPLESS CURATOR', sealed: 'THE CURATOR KEEPS THE READING LEDGE',
      x: o.x, y: o.y, w: 32, h: 50, hp: o.hp || 8, maxHp: o.hp || 8, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: .8, lit: 0, deadT: 0, vx: 0,
      x0: (o.x || 0) - 220, x1: (o.x || 0) + 220, deathLine: '',
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return 0;
    if (!this.lit) { this.flash = .08; return 2; }                 // shadow: the blade passes through
    this.hp--; this.flash = .14;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0; sfx.bossDie(); }
    return 1;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    this.lit = !!(g.litAt && g.litAt(cx, cy));
    if (this.st === 'dormant') {
      if (p.x + p.w > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(8); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    if (this.st === 'wake') { if (this.stT > 1.0) { this.st = 'float'; this.stT = 0; this.cool = .6; } return; }
    const px = p.x + p.w / 2, dx = px - cx;
    this.dir = dx < 0 ? -1 : 1;
    if (this.lit) {                                                // recoils, but can be hit
      this.st = 'lit'; this.stT = 0;
      this.x = clamp(this.x - Math.sign(dx) * 46 * dt, this.x0, this.x1);
      this.y += Math.sin(this.t * 2.4) * 6 * dt;
      return;
    }
    if (this.st === 'lit') { this.st = 'float'; this.stT = 0; this.cool = .5; }
    if (this.st === 'float') {
      this.y = 370 + Math.sin(this.t * 1.8) * 6;
      if (Math.abs(dx) > 110) this.x = clamp(this.x + Math.sign(dx) * 34 * dt, this.x0, this.x1);
      this.cool -= dt;
      if (this.cool <= 0 && Math.abs(dx) < 300) { this.st = 'wind'; this.stT = 0; sfx.wind(); }
      return;
    }
    if (this.st === 'wind') {
      this.dir = dx < 0 ? -1 : 1;
      if (this.stT > .55) { this.st = 'lunge'; this.stT = 0; this.vx = this.dir * 390; }
      return;
    }
    if (this.st === 'lunge') {
      this.x = clamp(this.x + this.vx * dt, this.x0, this.x1);
      if (this.stT > .32) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > 1.0) { this.st = 'float'; this.stT = 0; this.cool = 1.0; }
    }
  }
}
