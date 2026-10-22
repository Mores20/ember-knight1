import { sfx } from './audio.js';

export class Goblin {
  constructor(o) { Object.assign(this, { type: 'goblin', w: 24, h: 30, hp: 1, dir: 1, sp: 55, flash: 0, t: 0 }, o); }
  update(dt) {
    this.t += dt; this.flash -= dt; this.x += this.dir * this.sp * dt;
    if (this.x < this.x0) this.dir = 1;
    if (this.x + this.w > this.x1) this.dir = -1;
  }
  hit(d) { this.hp--; this.flash = .12; this.x += d * 10; return this.hp <= 0; }
}

export class Bat {
  constructor(o) { Object.assign(this, { type: 'bat', w: 26, h: 14, t: 0, hp: 1 }, o); this.update(0); }
  update(dt) {
    this.t += dt;
    const a = this.t * this.sp + this.ph, m = (this.x0 + this.x1) / 2, h = (this.x1 - this.x0) / 2;
    this.x = m + h * Math.sin(a) - this.w / 2;
    this.y = this.y0 + this.ay * Math.pow(Math.sin(a * 2), 2);   // two swoops per sweep
  }
  hit() { this.hp--; return true; }
}

// Shielded goblin: keeps its guard up while it patrols, drops it every few seconds.
// A swing into the guard is a harmless clang — hit it while the shield is down,
// or get behind it while it walks away.
export class ShieldGoblin {
  constructor(o) { Object.assign(this, { type: 'shield', w: 26, h: 32, dir: 1, sp: 34, flash: 0, t: 0, hp: 2, st: 'guard', stT: 0, guard: 1.4, down: .8 }, o); }
  update(dt) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    this.x += this.dir * this.sp * dt;
    if (this.x < this.x0) this.dir = 1;
    if (this.x + this.w > this.x1) this.dir = -1;
    if (this.st === 'guard' && this.stT >= this.guard) { this.st = 'down'; this.stT = 0; }
    else if (this.st === 'down' && this.stT >= this.down) { this.st = 'guard'; this.stT = 0; }
  }
  blocking(d) { return this.st === 'guard' && d === -this.dir; }   // d = the direction the blow comes from
  hit(d) { this.hp--; this.flash = .12; this.x += d * 12; return this.hp <= 0; }
}

// Ash Archer: plants itself, telegraphs with a long draw, then looses a slow arrow.
// Arrows can be parried back like the Warden's spikes.
export class Archer {
  constructor(o) {
    Object.assign(this, { type: 'archer', w: 24, h: 32, hp: 2, dir: -1, flash: 0, t: 0, st: 'idle', stT: 0, cool: 1.1, range: 470 }, o);
  }
  update(dt, p, g) {
    if (!p) return;
    this.t += dt; this.flash -= dt; this.stT += dt;
    const px = p.x + p.w / 2, cx = this.x + this.w / 2;
    if (Math.abs(px - cx) > 20) this.dir = px < cx ? -1 : 1;
    if (this.st === 'idle' && this.stT > this.cool && Math.abs(px - cx) < this.range) { this.st = 'draw'; this.stT = 0; }
    else if (this.st === 'draw' && this.stT > .55) { this.st = 'shoot'; this.stT = 0; this.fire(p, g); }
    else if (this.st === 'shoot' && this.stT > .28) { this.st = 'idle'; this.stT = 0; this.cool = 1.5; }
  }
  fire(p, g) {
    const sx = this.x + this.w / 2 + this.dir * 12, sy = this.y + 12;
    const dx = (p.x + p.w / 2) - sx, dy = (p.y + 14) - sy, d = Math.hypot(dx, dy) || 1, sp = 360;
    g.arrows.push({ x: sx, y: sy, vx: dx / d * sp, vy: dy / d * sp, life: 3, reflected: 0 });
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Cinder Wisp: drifts at you, but any real light makes it recoil and go harmless (pale).
export class Wisp {
  constructor(o) {
    Object.assign(this, { type: 'wisp', w: 22, h: 22, hp: 1, t: 0, flash: 0, dir: 1, sp: 92, scared: 0 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    let dx = cx - px, dy = cy - py; const d = Math.hypot(dx, dy) || 1;
    this.scared = g.lightAt ? g.lightAt(cx, cy) : 0;
    const sp = this.scared ? 160 : this.sp;
    this.x += dx / d * sp * dt;
    this.y += dy / d * sp * dt + Math.sin(this.t * 2.3) * 14 * dt;
    this.dir = dx < 0 ? -1 : 1;
  }
  hit() { this.hp--; return this.hp <= 0; }
}

// Slag Crawler: slow, armoured, ignores knockback, and leaves a short-lived burning trail.
export class Crawler {
  constructor(o) {
    Object.assign(this, { type: 'crawler', w: 30, h: 20, hp: 2, dir: 1, sp: 42, t: 0, flash: 0, drop: 0, x0: o.x, x1: (o.x || 0) + 140 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt;
    this.x += this.dir * this.sp * dt;
    if (this.x < this.x0) this.dir = 1;
    if (this.x + this.w > this.x1) this.dir = -1;
    this.drop -= dt;
    if (this.drop <= 0 && g.trails) {
      this.drop = .16;
      g.trails.push({ x: this.x + this.w / 2, y: this.y + this.h, t: .8 });
    }
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }      // no knockback: it is slag
}

// Shade: only solid and hittable inside light; in the dark it drifts at you, faint and untouchable.
export class Shade {
  constructor(o) {
    Object.assign(this, { type: 'shade', w: 24, h: 30, hp: 2, dir: 1, sp: 34, t: 0, flash: 0, lit: 0, y0: o.y, x0: o.x - 80, x1: (o.x || 0) + 120 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    this.lit = g.lightAt ? g.lightAt(cx, cy) : 0;
    const dx = (p.x + p.w / 2) - cx;
    if (this.lit) this.x -= Math.sign(dx) * 55 * dt;             // recoils from the light
    else this.x += Math.sign(dx) * this.sp * dt;
    this.dir = dx < 0 ? -1 : 1;
    this.x = Math.max(this.x0, Math.min(this.x1, this.x));
    this.y = this.y0 + Math.sin(this.t * 2.1) * 5;
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Ember Husk: a small echo of the Warden that walks you down. No tricks, just pressure.
export class Husk {
  constructor(o) {
    Object.assign(this, { type: 'husk', w: 22, h: 30, hp: 2, dir: 1, sp: 62, t: 0, flash: 0, st: 'walk' }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt;
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2);
    this.dir = dx < 0 ? -1 : 1;
    if (Math.abs(dx) > 18) this.x += Math.sign(dx) * this.sp * dt;
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }
}

export class Hexer {
  constructor(o) {
    Object.assign(this, {
      type: 'hexer', w: 22, h: 30, hp: 3, dir: 1, sp: 46, t: 0, flash: 0,
      st: 'idle', stT: 0, hex: 'smother', lastHex: '', cool: 2.4 + Math.random() * 1.2,
      bT: 0, bJump: 0, blinkCd: 0, dying: 0, dmg: 0, summoned: 0, y0: o.y,
      x0: (o.x || 0) - 150, x1: (o.x || 0) + 150,
    }, o);
  }
  cast() {
    const opts = ['smother', 'heavy', 'snuff'].filter(k => k !== this.lastHex);
    this.hex = opts[(Math.random() * opts.length) | 0];
    this.lastHex = this.hex;
    this.st = 'cast'; this.stT = 0;
    sfx.wind();
  }
  fire(g, p) {
    const sx = this.x + this.w / 2, sy = this.y + 12;
    const px = p.x + p.w / 2, py = p.y + p.h * .45;
    const base = Math.atan2(py - sy, px - sx);
    const dur = this.hex !== 'snuff' ? 8 : (this.dmg ? 3.5 : 5);
    g.hexOrbs ??= [];
    for (const a of [-.24, 0, .24]) {
      g.hexOrbs.push({ x: sx, y: sy, vx: Math.cos(base + a) * 155, vy: Math.sin(base + a) * 155,
        hex: this.hex, dmg: this.dmg, dur, t: 3.6, spin: 0 });
    }
    sfx.ember();
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.blinkCd -= dt;
    if (this.dying > 0) { this.dying -= dt; if (this.dying <= 0) this.dead = 1; return; }

    const cx = this.x + this.w / 2, px = p.x + p.w / 2;
    const dx = px - cx, dist = Math.abs(dx);
    this.dir = dx < 0 ? -1 : 1;
    this.y = this.y0 + Math.sin(this.t * 2.1) * 6;

    if (this.st === 'blink') {                                    // a smear, a step sideways, a reappearance
      this.bT += dt;
      if (!this.bJump && this.bT > .18) {
        this.bJump = 1;
        this.x = Math.max(this.x0, Math.min(this.x1, this.x + (this.dir > 0 ? -150 : 150)));
        for (let k = 0; k < 10; k++) {
          const a = Math.random() * 6.28, sp = 20 + Math.random() * 70;
          g.parts.push({ x: cx, y: this.y + 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, l: .4, col: '#8f9bb8' });
        }
      }
      if (this.bT > .42) { this.st = 'idle'; this.stT = 0; this.bT = 0; this.bJump = 0; }
      return;
    }
    if (this.st === 'cast') {
      this.stT += dt;
      if (this.stT >= .9) {
        this.st = 'idle'; this.stT = 0;
        this.cool = 3.2 + Math.random() * 1.4;
        this.fire(g, p);
      }
      return;
    }

    if (dist < 120 && this.blinkCd <= 0) { this.st = 'blink'; this.bT = 0; this.bJump = 0; this.blinkCd = 5; return; }
    if (dist > 250) this.x += Math.sign(dx) * this.sp * dt;
    else if (dist < 170) this.x -= Math.sign(dx) * this.sp * dt;
    this.x = Math.max(this.x0, Math.min(this.x1, this.x));
    this.cool -= dt;
    if (this.cool <= 0) this.cast();
  }
  hit() {
    if (this.dying > 0 || this.st === 'blink') return false;      // untouchable mid-blink
    this.hp--; this.flash = .12;
    if (this.hp <= 0) { this.hp = 0; this.dying = .45; return false; }   // let the die row play
    if (this.blinkCd <= 0) { this.st = 'blink'; this.bT = 0; this.bJump = 0; this.blinkCd = 5; }
    return false;
  }
}

export const makeEnemy = o => o.type === 'bat' ? new Bat(o) : o.type === 'shield' ? new ShieldGoblin(o)
  : o.type === 'archer' ? new Archer(o) : o.type === 'wisp' ? new Wisp(o) : o.type === 'crawler' ? new Crawler(o)
  : o.type === 'shade' ? new Shade(o) : o.type === 'husk' ? new Husk(o) : o.type === 'hexer' ? new Hexer(o) : new Goblin(o);
