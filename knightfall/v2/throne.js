// Area IV bosses: the Fallen Royal Guard (the Captain) and the Ash Warden.
import { sfx } from '../audio.js';
import { hit } from '../player.js';
import { AshWarden } from '../boss.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const burst = (g, x, y, n, col) => {
  if (!g || !g.parts) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, sp = 50 + Math.random() * 150;
    g.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, l: .4 + Math.random() * .25, col });
  }
};

export class FallenCaptain {
  constructor(o) {
    Object.assign(this, {
      kind: 'captain', type: 'boss', name: 'THE FALLEN ROYAL GUARD', sealed: 'THE CAPTAIN HOLDS THE POST',
      x: o.x, y: o.y, baseY: o.y, w: 36, h: 46, hp: o.hp || 8, maxHp: o.hp || 8, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: .8, atk: 'bash', hitDone: 0, deadT: 0,
      vx: 0, vy: 0, stunT: 0, waves: [], deathLine: 'Hold the door... I tried.',
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return 0;
    if (this.st !== 'recover' && this.st !== 'stun') { this.flash = .08; return 2; }   // the shield
    this.hp--; this.flash = .14;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0; this.waves.length = 0; sfx.bossDie(); }
    return 1;
  }
  stun(g, dur) {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return;
    this.st = 'stun'; this.stunT = dur; this.stT = 0;
    g.shake(7); g.stop(.05); sfx.parry();
  }
  strike(p, g, box) {
    if (p.inv > 0) return;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2;
    const front = (px - cx) * this.dir > -16;
    const gd = p.guard && p.guard();
    if (gd && front && p.parry > 0) {
      this.stun(g, 1.6); p.inv = .5;
      burst(g, px, p.y + p.h / 2, 16, '#fff2b0');
      g.parryMsg = 2.2;
      return;
    }
    if (gd && front) {
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
      if (p.x + p.w > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(7); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    this.updateWaves(dt, p, g);
    if (this.st === 'wake') { if (this.stT > 1.0) { this.st = 'idle'; this.stT = 0; this.cool = .8; } return; }
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    this.dir = dx < 0 ? -1 : 1;
    if (this.st === 'idle') {
      if (dist > 96) this.x = clamp(this.x + this.dir * 42 * dt, 1080, 1820 - this.w);
      this.cool -= dt;
      if (this.cool <= 0) {
        this.atk = dist < 120 ? 'bash' : dist < 200 ? 'sweep' : 'leap';
        this.st = 'wind'; this.stT = 0; sfx.wind();
      }
      return;
    }
    if (this.st === 'wind') {
      if (this.stT > (this.atk === 'sweep' ? .75 : .6)) {
        if (this.atk === 'leap') {
          this.st = 'leap'; this.stT = 0; this.vy = -430; this.vx = this.dir * 330; sfx.jump();
        } else {
          this.st = 'act'; this.stT = 0; this.hitDone = 0;
          g.shake(6); sfx.heavy();
          burst(g, cx + this.dir * 30, this.y + 26, 8, '#cfd8ee');
        }
      }
      return;
    }
    if (this.st === 'act') {
      if (!this.hitDone) {
        const box = this.atk === 'sweep'
          ? (this.dir > 0 ? { x: cx - 10, y: this.y + 10, w: 150, h: 34 } : { x: cx - 140, y: this.y + 10, w: 150, h: 34 })
          : (this.dir > 0 ? { x: cx + 4, y: this.y + 8, w: 78, h: 32 } : { x: cx - 82, y: this.y + 8, w: 78, h: 32 });
        if (hit(p, box)) { this.hitDone = 1; this.strike(p, g, box); }
      }
      if (this.stT > (this.atk === 'sweep' ? .3 : .22)) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'leap') {
      this.x = clamp(this.x + this.vx * dt, 1080, 1820 - this.w);
      this.y += this.vy * dt; this.vy += 1500 * dt;
      if (this.y >= this.baseY) {
        this.y = this.baseY; this.st = 'recover'; this.stT = 0;
        this.waves.push({ x: cx, dir: -1, y: this.y + this.h - 36, t: 0 });
        this.waves.push({ x: cx, dir: 1, y: this.y + this.h - 36, t: 0 });
        g.shake(9); g.stop(.06); sfx.heavy();
        burst(g, cx, this.y + this.h - 4, 14, '#c9d4f0');
      }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > 1.2) { this.st = 'idle'; this.stT = 0; this.cool = .7; }
      return;
    }
    if (this.st === 'stun') {
      if (this.stT > (this.stunT || 1.6)) { this.st = 'recover'; this.stT = 0; }
    }
  }
  updateWaves(dt, p, g) {
    for (const w of this.waves) {
      w.t += dt; w.x += w.dir * 300 * dt;
      if (hit(p, { x: w.x - 14, y: w.y, w: 28, h: 36 })) p.hurt(w.x, g);
      if (w.t > 1.4 || w.x < -40 || w.x > (g.l.w || 1900) + 40) w.done = 1;
    }
    this.waves = this.waves.filter(w => !w.done);
  }
}

export class ThroneWarden extends AshWarden {
  constructor(o) {
    super({ ...o, wake: o.wake != null ? o.wake : 1200 });
    this.kind = 'warden'; this.type = 'boss';
    this.name = o.name || 'THE ASH WARDEN';
    this.sealed = o.sealed || 'THE WARDEN HOLDS THE THRONE';
    this.maxHp = this.max;
    this.deathLine = 'He told me to hold the door. He never said which side.';
    this.deadT = 0; this.diedFlag = 0;
  }
  update(dt, p, g) {
    super.update(dt, p, g);
    if (this.st === 'dead' || this.st === 'gone') this.deadT += dt;
  }
}
