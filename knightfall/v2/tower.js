// Area III bosses: the Clapper Golem (rafters mini-boss) and the Cracked Carillon.
import { sfx } from '../audio.js';
import { hit } from '../player.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const burst = (g, x, y, n, col) => {
  if (!g || !g.parts) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, sp = 50 + Math.random() * 150;
    g.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, l: .4 + Math.random() * .25, col });
  }
};

export class ClapperGolem {
  constructor(o) {
    Object.assign(this, {
      kind: 'clappergolem', type: 'boss', name: 'THE CLAPPER GOLEM', sealed: 'THE GOLEM KEEPS THE RAFTERS',
      x: o.x, y: o.y, w: 42, h: 46, hp: o.hp || 6, maxHp: o.hp || 6, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: .8, atk: 'pendulum', hitDone: 0, deadT: 0,
      waves: [],
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return 0;
    if (this.st !== 'recover') { this.flash = .08; return 2; }   // only the glowing core is open
    this.hp--; this.flash = .14;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0; this.waves.length = 0; sfx.bossDie(); }
    return 1;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.st === 'dormant') {
      if (p.x > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(7); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    this.updateHazards(dt, p, g);
    if (this.st === 'wake') { if (this.stT > 1.0) { this.st = 'idle'; this.stT = 0; this.cool = .7; } return; }
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    this.dir = dx < 0 ? -1 : 1;
    if (this.st === 'idle') {
      if (dist > 78) this.x = clamp(this.x + this.dir * 38 * dt, 1080, 2120 - this.w);
      this.cool -= dt;
      if (this.cool <= 0) {
        this.atk = dist < 150 ? 'pendulum' : 'stomp';
        this.st = 'wind'; this.stT = 0; sfx.wind();
      }
      return;
    }
    if (this.st === 'wind') {
      if (this.stT > .6) {
        this.st = 'act'; this.stT = 0; this.hitDone = 0;
        sfx.heavy(); g.shake(8); g.stop(.05);
        if (this.atk === 'stomp') {
          this.waves.push({ x: cx, dir: -1, y: this.y + this.h - 40, t: 0 });
          this.waves.push({ x: cx, dir: 1, y: this.y + this.h - 40, t: 0 });
          burst(g, cx, this.y + this.h - 6, 10, '#e8cdb0');
        } else {
          burst(g, cx + this.dir * 34, this.y + 22, 10, '#e8cdb0');
        }
      }
      return;
    }
    if (this.st === 'act') {
      if (!this.hitDone && this.atk === 'pendulum') {
        const box = this.dir > 0
          ? { x: cx - 8, y: this.y + 6, w: 118, h: 42 }
          : { x: cx - 110, y: this.y + 6, w: 118, h: 42 };
        if (hit(p, box)) { this.hitDone = 1; p.hurt(cx, g); }
      }
      if (this.stT > .3) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > 1.5) { this.st = 'idle'; this.stT = 0; this.cool = .8; }
    }
  }
  updateHazards(dt, p, g) {
    for (const w of this.waves) {
      w.t += dt; w.x += w.dir * 320 * dt;
      if (hit(p, { x: w.x - 16, y: w.y, w: 32, h: 44 })) p.hurt(w.x, g);
      if (w.t > 1.7 || w.x < -40 || w.x > (g.l.w || 2200) + 40) w.done = 1;
    }
    this.waves = this.waves.filter(w => !w.done);
  }
}

export class CrackedCarillon {
  constructor(o) {
    Object.assign(this, {
      kind: 'carillon', type: 'boss', name: 'THE CRACKED CARILLON', sealed: 'THE CARILLON RINGS THE LAST HOUR',
      x: o.x, y: o.y, baseY: o.y, openY: 368, w: 46, h: 40, hp: o.hp || 8, maxHp: o.hp || 8, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: .8, phase: 1, beat: 0, beatT: 0,
      deadT: 0, waves: [], drops: [],
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st !== 'open') return this.st === 'dead' || this.st === 'dormant' || this.st === 'wake' ? 0 : 2;
    this.hp--; this.flash = .14;
    if (this.hp <= this.maxHp / 2 && this.phase === 1) this.phase = 2;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0; this.waves.length = 0; this.drops.length = 0; sfx.bossDie(); }
    return 1;
  }
  interval() { return this.phase === 2 ? .48 : .72; }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.st === 'dormant') {
      if (p.x > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(8); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    this.updateHazards(dt, p, g);
    if (this.st === 'wake') {
      if (this.stT > 1.1) { this.st = 'idle'; this.stT = 0; this.cool = .6; }
      return;
    }
    const cx = this.x + this.w / 2;
    this.dir = (p.x + p.w / 2) < cx ? -1 : 1;
    if (this.st === 'idle') {
      this.y = this.baseY;
      this.cool -= dt;
      if (this.cool <= 0) { this.st = 'wind'; this.stT = 0; sfx.bellLow(); }
      return;
    }
    if (this.st === 'wind') {
      this.y = this.baseY + 24;                                   // the cluster leans in
      if (this.stT > (this.phase === 2 ? .55 : .75)) {
        this.st = 'pattern'; this.stT = 0; this.beat = 0; this.beatT = 0;
      }
      return;
    }
    if (this.st === 'pattern') {
      this.y = this.baseY;
      this.beatT -= dt;
      if (this.beat < 4 && this.beatT <= 0) {
        this.emit(this.beat, p, g);
        this.beat++;
        this.beatT = this.interval();
      }
      if (this.beat >= 4 && this.beatT <= 0) {
        this.st = 'open'; this.stT = 0; this.y = this.openY;
        sfx.bell(); burst(g, cx, this.openY + 20, 12, '#e8c96a'); g.shake(4);
      }
      return;
    }
    if (this.st === 'open') {
      this.y = this.openY;
      if (this.stT > (this.phase === 2 ? 1.7 : 2.3)) { this.st = 'idle'; this.stT = 0; this.y = this.baseY; this.cool = .6; }
    }
  }
  emit(i, p, g) {
    const cx = this.x + this.w / 2;
    if (i % 2 === 0) {
      this.waves.push({ x: cx, dir: -1, y: 420 - 44, t: 0 });
      this.waves.push({ x: cx, dir: 1, y: 420 - 44, t: 0 });
      sfx.toll(); g.shake(5);
    } else {
      this.drops.push({ x: clamp(p.x + p.w / 2, 1150, 1780), y: 80, vy: 0, t: 0, warn: .55, dead: 0 });
      sfx.bellLow(); g.shake(3);
    }
  }
  updateHazards(dt, p, g) {
    for (const w of this.waves) {
      w.t += dt; w.x += w.dir * 330 * dt;
      if (hit(p, { x: w.x - 16, y: w.y, w: 32, h: 44 })) p.hurt(w.x, g);
      if (w.t > 1.8 || w.x < -40 || w.x > (g.l.w || 1800) + 40) w.done = 1;
    }
    this.waves = this.waves.filter(w => !w.done);
    for (const d of this.drops) {
      d.t += dt;
      if (d.t < d.warn) { d.y = 80; continue; }
      d.vy += 1900 * dt; d.y += d.vy * dt;
      if (!d.dead && hit(p, { x: d.x - 16, y: d.y, w: 32, h: 30 })) p.hurt(d.x, g);
      if (d.y + 30 >= 420) { d.y = 390; d.dead = 1; }
    }
    this.drops = this.drops.filter(d => !d.dead);
  }
}
