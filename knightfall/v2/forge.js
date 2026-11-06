// Area VI boss: the Slag Foreman. He fights at the summit while the ember tide
// climbs in steps. Hammer slam, arcing slag that leaves burning puddles, and a
// low chain sweep. His furnace core is open except while he is swinging.
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

export class SlagForeman {
  constructor(o) {
    Object.assign(this, {
      kind: 'slagforeman', type: 'boss', name: 'THE SLAG FOREMAN', sealed: 'THE FOREMAN KEEPS THE SUMMIT',
      x: o.x, y: o.y, w: 50, h: 64, hp: o.hp || 12, maxHp: o.hp || 12, wake: o.wake || 0,
      dir: -1, st: 'dormant', stT: 0, t: 0, flash: 0, cool: .9, atk: 'slam', hitDone: 0, deadT: 0,
      phase: 1, waves: [], shots: [], puddles: [], deathLine: '',
    }, o);
    this.maxHp = this.hp;
    this.floor = this.y + this.h;
  }
  get alive() { return this.hp > 0; }
  takeHit() {
    if (this.st === 'dead' || this.st === 'dormant' || this.st === 'wake') return 0;
    if (this.st === 'act') { this.flash = .08; return 2; }       // the hammer's momentum
    this.hp--; this.flash = .14;
    if (this.hp <= this.maxHp / 2 && this.phase === 1) this.phase = 2;
    if (this.hp <= 0) {
      this.hp = 0; this.st = 'dead'; this.stT = 0; this.deadT = 0;
      this.waves.length = 0; this.shots.length = 0; this.puddles.length = 0; sfx.bossDie();
    }
    return 1;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.st === 'dormant') {
      if (p.x + p.w > this.wake) { this.st = 'wake'; this.stT = 0; g.shake(9); sfx.wake(); }
      return;
    }
    if (this.st === 'dead') { this.deadT += dt; return; }
    this.updateHazards(dt, p, g);
    if (this.st === 'wake') { if (this.stT > 1.0) { this.st = 'idle'; this.stT = 0; this.cool = .8; } return; }
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    this.dir = dx < 0 ? -1 : 1;
    if (this.st === 'idle') {
      if (dist > 130) this.x = clamp(this.x + this.dir * 34 * dt, 1020, 1720 - this.w);
      this.cool -= dt;
      if (this.cool <= 0) {
        const r = Math.random();
        this.atk = dist < 170 ? (r < .5 ? 'slam' : 'chain') : r < .55 ? 'slag' : 'slam';
        this.st = 'wind'; this.stT = 0; sfx.wind();
      }
      return;
    }
    if (this.st === 'wind') {
      if (this.stT > (this.phase === 2 ? .5 : .65)) {
        this.st = 'act'; this.stT = 0; this.hitDone = 0;
        g.shake(8); g.stop(.05);
        if (this.atk === 'slam') {
          this.waves.push({ x: cx, dir: -1, y: this.floor - 34, t: 0 });
          this.waves.push({ x: cx, dir: 1, y: this.floor - 34, t: 0 });
          burst(g, cx, this.floor - 4, 12, '#ff8a3d');
          sfx.heavy();
        } else if (this.atk === 'slag') {
          this.throwSlag(p, this.phase === 2 ? 3 : 2);
        } else {
          sfx.chain ? sfx.chain() : sfx.heavy();
        }
      }
      return;
    }
    if (this.st === 'act') {
      if (!this.hitDone && this.atk === 'chain') {
        const box = this.dir > 0
          ? { x: cx - 10, y: this.floor - 44, w: 230, h: 44 }
          : { x: cx - 220, y: this.floor - 44, w: 230, h: 44 };
        if (hit(p, box)) { this.hitDone = 1; p.hurt(cx, g); }
      }
      if (this.stT > (this.atk === 'slag' ? .4 : .32)) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > (this.phase === 2 ? 1.0 : 1.3)) { this.st = 'idle'; this.stT = 0; this.cool = .8; }
    }
  }
  throwSlag(p, n) {
    const cx = this.x + this.w / 2, cy = this.y + 12;
    for (let k = 0; k < n; k++) {
      const t = 1.0, tx = p.x + p.w / 2 + (k - (n - 1) / 2) * 80, ty = p.y + p.h / 2;
      this.shots.push({ x: cx, y: cy, vx: (tx - cx) / t, vy: (ty - cy - .5 * 900 * t * t) / t, t: 0 });
    }
    sfx.ember();
  }
  updateHazards(dt, p, g) {
    for (const w of this.waves) {
      w.t += dt; w.x += w.dir * 320 * dt;
      if (hit(p, { x: w.x - 14, y: w.y, w: 28, h: 34 })) p.hurt(w.x, g);
      if (w.t > 1.6 || w.x < 900 || w.x > 1800) w.done = 1;
    }
    this.waves = this.waves.filter(w => !w.done);
    for (const s of this.shots) {
      s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
      const box = { x: s.x - 5, y: s.y - 5, w: 10, h: 10 };
      if (hit(p, box)) { p.hurt(s.x, g); s.done = 1; this.puddles.push({ x: s.x, y: s.y + 6, t: 0, life: 2.4 }); continue; }
      let land = null;
      if (g) for (const o of g.l.solids) if (!o.off && !o.pass && typeof o.x === 'number'
        && s.x > o.x && s.x < o.x + o.w && s.y >= o.y - 6 && s.y <= o.y + 12) {
        if (!land || o.y < land.y) land = o;
      }
      if (land) { s.done = 1; this.puddles.push({ x: s.x, y: land.y, t: 0, life: 2.4 }); }
      else if (s.t > 2.6 || s.y > (g ? g.l.h : 1600)) s.done = 1;
    }
    this.shots = this.shots.filter(s => !s.done);
    for (const b of this.puddles) {
      b.t += dt;
      if (b.t < 2.2 && Math.abs((p.x + p.w / 2) - b.x) < 30 && Math.abs((p.y + p.h) - b.y) < 8) p.hurt(b.x, g);
    }
    this.puddles = this.puddles.filter(b => b.t < b.life);
  }
}
