// Area II bosses: the Crypt Warden (shielded mini-boss) and the Crypt Matron (cistern boss).
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

export class CryptWarden {
  constructor(o) {
    Object.assign(this, {
      kind: 'cryptwarden', type: 'boss', name: 'THE CRYPT WARDEN', sealed: 'THE WARDEN HOLDS THE NAVE',
      x: o.x, y: o.y, w: 34, h: 40, hp: o.hp || 6, maxHp: o.hp || 6, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: 0, atk: 'chain', shield: 1, hitDone: 0, deadT: 0,
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return 0;
    if (this.shield) { this.flash = .08; return 2; }
    this.hp--; this.flash = .14;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0; sfx.bossDie(); }
    return 1;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.st === 'dormant') {
      if (p.x > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(7); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    if (this.st === 'wake') { if (this.stT > 1.0) { this.st = 'idle'; this.stT = 0; this.cool = .5; } return; }
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    this.dir = dx < 0 ? -1 : 1;
    if (this.st === 'idle') {
      this.shield = 1;
      if (dist > 70) this.x = clamp(this.x + this.dir * 44 * dt, 1220, 1960 - this.w);
      this.cool -= dt;
      if (this.cool <= 0) {
        this.atk = dist < 120 ? 'chain' : 'slam';
        this.st = 'wind'; this.stT = 0; sfx.wind();
      }
      return;
    }
    if (this.st === 'wind') {
      if (this.stT > (this.atk === 'chain' ? .5 : .65)) {
        this.st = 'act'; this.stT = 0; this.hitDone = 0; this.shield = 0;
        sfx.heavy(); g.shake(8); g.stop(.05);
        burst(g, cx + this.dir * 26, this.y + this.h - 5, 12, '#9fd6c8');
      }
      return;
    }
    if (this.st === 'act') {
      if (!this.hitDone) {
        const box = this.atk === 'chain'
          ? { x: cx - 52, y: this.y + 22, w: 104, h: 20 }
          : { x: cx - 36, y: this.y + 2, w: 72, h: 38 };
        if (hit(p, box)) { this.hitDone = 1; p.hurt(cx, g); }
      }
      if (this.stT > .22) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'recover') {
      this.shield = 0;
      if (this.stT > 1.1) { this.st = 'idle'; this.stT = 0; this.cool = .5; this.shield = 1; }
    }
  }
}

export class CryptMatron {
  constructor(o) {
    Object.assign(this, {
      kind: 'matron', type: 'boss', name: 'THE CRYPT MATRON', sealed: 'THE MATRON HOLDS THE CISTERN',
      x: o.x, y: o.y, baseY: o.y, w: 42, h: 48, hp: o.hp || 12, maxHp: o.hp || 12, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: 1, phase: 1, deadT: 0,
      hands: [], leeches: [], wave: null,
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st !== 'recover') return this.st === 'dead' || this.st === 'dormant' || this.st === 'wake' ? 0 : 2;
    this.hp--; this.flash = .14;
    if (this.hp <= 6 && this.phase === 1) this.phase = 2;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0; sfx.bossDie(); }
    return 1;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.st === 'dormant') {
      if (p.x > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(7); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    if (this.st === 'wake') { if (this.stT > 1.1) { this.st = 'idle'; this.stT = 0; this.cool = .6; } return; }
    if (this.phase === 2) {
      g.water = Math.min(g.water || 500, 434);
      this.recoverT = .95;
    } else this.recoverT = 1.3;
    const cx = this.x + this.w / 2;
    this.dir = (p.x + p.w / 2) < cx ? -1 : 1;
    this.y = this.st === 'recover' ? this.baseY + 50 : this.baseY + Math.sin(this.t * 1.8) * 5;
    if (this.st === 'idle') {
      this.cool -= dt;
      if (this.cool <= 0) {
        const pick = Math.random();
        this.atk = pick < .38 ? 'hands' : pick < .72 ? 'leeches' : 'surge';
        this.st = 'wind'; this.stT = 0; sfx.wind();
      }
    } else if (this.st === 'wind') {
      if (this.stT > (this.atk === 'hands' ? .7 : this.atk === 'leeches' ? .5 : .6)) {
        if (this.atk === 'hands') this.castHands(p, g);
        else if (this.atk === 'leeches') this.castLeeches(p, g);
        else this.castSurge(g);
        this.st = 'recover'; this.stT = 0;
      }
    } else if (this.st === 'recover') {
      if (this.stT > this.recoverT) { this.st = 'idle'; this.stT = 0; this.cool = .7; }
    }

    for (const h of this.hands) {
      h.t += dt;
      if (!h.fired && h.t > .5) { h.fired = 1; g.shake(5); sfx.ember(); burst(g, h.x, h.y, 8, '#cfd8ee'); }
      if (h.fired && h.t < .95 && hit(p, { x: h.x - 15, y: h.y - 74, w: 30, h: 74 })) p.hurt(h.x, g);
      if (h.t > 1.1) h.done = 1;
    }
    this.hands = this.hands.filter(h => !h.done);
    for (const l of this.leeches) {
      l.vy += 700 * dt; l.y += l.vy * dt;
      if (hit(p, { x: l.x - 8, y: l.y - 10, w: 16, h: 22 })) { l.done = 1; p.hurt(l.x, g); }
      if (l.y > 430 || l.y > (g.l.h || 640)) l.done = 1;
    }
    this.leeches = this.leeches.filter(l => !l.done);
    if (this.wave) {
      this.wave.x += this.wave.dir * 260 * dt; this.wave.t += dt;
      if (hit(p, { x: this.wave.x - 16, y: this.wave.y, w: 32, h: 62 })) p.hurt(this.wave.x, g);
      if (this.wave.t > 2.6 || this.wave.x < -60 || this.wave.x > 1660) this.wave = null;
    }
  }
  castHands(p, g) {
    this.hands.push({ x: p.x + p.w / 2, y: p.y + p.h, t: 0, fired: 0 });
  }
  castLeeches(p, g) {
    for (let k = -1; k <= 1; k++) this.leeches.push({ x: p.x + p.w / 2 + k * 64, y: 110, vy: 30 });
  }
  castSurge(g) {
    this.wave = { x: this.x + this.w / 2, dir: this.dir, y: this.baseY + 54, t: 0 };
    sfx.heavy();
  }
}
