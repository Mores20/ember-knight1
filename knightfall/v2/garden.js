// Area V bosses: the Gardener Golem (greenhouse mini-boss) and Mother Blight.
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

export class GardenerGolem {
  constructor(o) {
    Object.assign(this, {
      kind: 'gardenergolem', type: 'boss', name: 'THE GARDENER GOLEM', sealed: 'THE GOLEM TENDS THE GREENHOUSE',
      x: o.x, y: o.y, w: 44, h: 64, hp: o.hp || 6, maxHp: o.hp || 6, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: .8, atk: 'slam', hitDone: 0, deadT: 0,
      coreT: 0, armor: 1, waves: [], seeds: [], deathLine: '',
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return 0;
    if (this.coreT <= 0) { this.flash = .08; return 2; }             // the root cage
    this.hp--; this.flash = .14;
    if (this.hp <= 0) { this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0; this.waves.length = 0; this.seeds.length = 0; sfx.bossDie(); }
    return 1;
  }
  expose() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return false;
    this.coreT = 3.5; this.armor = 0; this.st = 'open'; this.stT = 0;
    return true;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.coreT > 0) { this.coreT -= dt; if (this.coreT <= 0) this.armor = 1; }
    if (this.st === 'dormant') {
      if (p.x + p.w > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(7); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    this.updateHazards(dt, p, g);
    if (this.st === 'wake') { if (this.stT > 1.1) { this.st = 'idle'; this.stT = 0; this.cool = .7; } return; }
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    this.dir = dx < 0 ? -1 : 1;
    if (this.st === 'open') {
      if (this.coreT <= 0) { this.st = 'idle'; this.stT = 0; this.cool = .8; }
      return;
    }
    if (this.st === 'idle') {
      if (dist > 110) this.x = clamp(this.x + this.dir * 30 * dt, 1200, 2040 - this.w);
      this.cool -= dt;
      if (this.cool <= 0) {
        this.atk = dist < 140 ? 'slam' : dist < 260 ? 'whip' : 'seeds';
        this.st = 'wind'; this.stT = 0; sfx.wind();
      }
      return;
    }
    if (this.st === 'wind') {
      if (this.stT > .65) {
        this.st = 'act'; this.stT = 0; this.hitDone = 0;
        g.shake(7); g.stop(.05);
        if (this.atk === 'slam') {
          this.waves.push({ x: cx, dir: -1, y: this.y + this.h - 34, t: 0 });
          this.waves.push({ x: cx, dir: 1, y: this.y + this.h - 34, t: 0 });
          burst(g, cx, this.y + this.h - 4, 12, '#7fc47a');
        } else if (this.atk === 'seeds') {
          this.fireSeeds(p);
        } else {
          sfx.heavy();
        }
      }
      return;
    }
    if (this.st === 'act') {
      if (!this.hitDone && this.atk === 'whip') {
        const box = this.dir > 0
          ? { x: cx - 8, y: this.y + this.h - 34, w: 170, h: 34 }
          : { x: cx - 162, y: this.y + this.h - 34, w: 170, h: 34 };
        if (hit(p, box)) { this.hitDone = 1; p.hurt(cx, g); }
      }
      if (this.stT > (this.atk === 'seeds' ? .4 : .3)) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > 1.2) { this.st = 'idle'; this.stT = 0; this.cool = .8; }
    }
  }
  fireSeeds(p) {
    const cx = this.x + this.w / 2, cy = this.y + 16;
    const tx = p.x + p.w / 2, ty = p.y + p.h / 2, t = 1.0;
    const vx = (tx - cx) / t, vy = (ty - cy - .5 * 900 * t * t) / t;
    for (let k = -1; k <= 1; k++) this.seeds.push({ x: cx, y: cy, vx: vx + k * 40, vy, t: 0 });
    sfx.ember();
  }
  updateHazards(dt, p, g) {
    for (const w of this.waves) {
      w.t += dt; w.x += w.dir * 300 * dt;
      if (hit(p, { x: w.x - 14, y: w.y, w: 28, h: 34 })) p.hurt(w.x, g);
      if (w.t > 1.5 || w.x < -40 || w.x > (g.l.w || 2100) + 40) w.done = 1;
    }
    this.waves = this.waves.filter(w => !w.done);
    for (const s of this.seeds) {
      s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
      if (hit(p, { x: s.x - 5, y: s.y - 5, w: 10, h: 10 })) { p.hurt(s.x, g); s.done = 1; }
      if (s.t > 1.8 || s.y > (g.l.h || 640)) s.done = 1;
    }
    this.seeds = this.seeds.filter(s => !s.done);
  }
}

export class MotherBlight {
  constructor(o) {
    Object.assign(this, {
      kind: 'motherblight', type: 'boss', name: 'MOTHER BLIGHT', sealed: 'MOTHER BLIGHT HOLDS THE HEARTROOT',
      x: o.x, y: o.y, baseY: o.y, w: 70, h: 100, hp: o.hp || 12, maxHp: o.hp || 12, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: 1, atk: 'roots', phase: 1,
      coreT: 0, armor: 1, deadT: 0, waves: [], bombs: [], thorns: [],
      deathLine: 'They only wanted to grow.',
    }, o);
    this.maxHp = this.hp;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return 0;
    if (this.coreT <= 0) { this.flash = .08; return 2; }             // thorn armour
    this.hp--; this.flash = .14;
    if (this.hp <= this.maxHp / 2 && this.phase === 1) this.phase = 2;
    if (this.hp <= 0) {
      this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0;
      this.waves.length = 0; this.bombs.length = 0; this.thorns.length = 0; sfx.bossDie();
    }
    return 1;
  }
  expose() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return false;
    this.coreT = this.phase === 2 ? 2.6 : 3.8; this.armor = 0;
    return true;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.coreT > 0) { this.coreT -= dt; if (this.coreT <= 0) this.armor = 1; }
    if (this.st === 'dormant') {
      if (p.x + p.w > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(9); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    this.updateHazards(dt, p, g);
    if (this.st === 'wake') { if (this.stT > 1.2) { this.st = 'idle'; this.stT = 0; this.cool = .8; } return; }
    const cx = this.x + this.w / 2;
    this.dir = (p.x + p.w / 2) < cx ? -1 : 1;
    if (this.st === 'idle') {
      this.cool -= dt;
      if (this.cool <= 0) {
        const pick = Math.random();
        this.atk = pick < .38 ? 'roots' : pick < .7 ? 'bombs' : 'thorns';
        this.st = 'wind'; this.stT = 0; sfx.wind();
      }
      return;
    }
    if (this.st === 'wind') {
      if (this.stT > (this.phase === 2 ? .55 : .72)) {
        this.st = 'act'; this.stT = 0;
        if (this.atk === 'roots') {
          this.waves.push({ x: cx, dir: -1, y: 420 - 40, t: 0 });
          this.waves.push({ x: cx, dir: 1, y: 420 - 40, t: 0 });
          sfx.heavy(); g.shake(8);
        } else if (this.atk === 'bombs') {
          for (let k = -1; k <= 1; k++) this.bombs.push({ x: clamp(p.x + p.w / 2 + k * 90, 1080, 1960), t: 0, delay: .9 });
          sfx.ember();
        } else {
          for (let k = 0; k < 4; k++) {
            const a = -1.1 + k * .32, sp = 260 + k * 16;
            this.thorns.push({ x: cx, y: this.y + 30, vx: Math.cos(a) * sp * this.dir, vy: Math.sin(a) * sp - 120, t: 0 });
          }
          sfx.swing();
        }
      }
      return;
    }
    if (this.st === 'act') {
      if (this.stT > .38) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > (this.phase === 2 ? 1.0 : 1.4)) { this.st = 'idle'; this.stT = 0; this.cool = this.phase === 2 ? .55 : .8; }
    }
  }
  updateHazards(dt, p, g) {
    for (const w of this.waves) {
      w.t += dt; w.x += w.dir * 320 * dt;
      if (hit(p, { x: w.x - 16, y: w.y, w: 32, h: 40 })) p.hurt(w.x, g);
      if (w.t > 1.8 || w.x < -40 || w.x > (g.l.w || 2000) + 40) w.done = 1;
    }
    this.waves = this.waves.filter(w => !w.done);
    for (const b of this.bombs) {
      b.t += dt;
      if (b.t >= b.delay) {
        b.done = 1; g.shake(5);
        if (Math.abs((p.x + p.w / 2) - b.x) < 58 && Math.abs((p.y + p.h / 2) - 386) < 60) p.hurt(b.x, g);
        burst(g, b.x, 400, 10, '#7fc47a');
      }
    }
    this.bombs = this.bombs.filter(b => !b.done);
    for (const s of this.thorns) {
      s.vy += 800 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
      if (hit(p, { x: s.x - 5, y: s.y - 5, w: 10, h: 10 })) { p.hurt(s.x, g); s.done = 1; }
      if (s.t > 1.8 || s.y > (g.l.h || 640)) s.done = 1;
    }
    this.thorns = this.thorns.filter(s => !s.done);
  }
}
