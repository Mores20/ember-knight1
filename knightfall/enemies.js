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

export const makeEnemy = o => o.type === 'bat' ? new Bat(o) : o.type === 'shield' ? new ShieldGoblin(o)
  : o.type === 'archer' ? new Archer(o) : o.type === 'wisp' ? new Wisp(o) : o.type === 'crawler' ? new Crawler(o)
  : o.type === 'shade' ? new Shade(o) : o.type === 'husk' ? new Husk(o) : new Goblin(o);
