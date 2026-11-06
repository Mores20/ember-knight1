import { sfx } from './audio.js';
import { hit } from './player.js';

// Is there floor under this point? Walking enemies use it so they never patrol off a ledge.
const floorUnder = (g, x, feet) => !!g && g.l.solids.some(s => typeof s.x === 'number' && !s.pass && !s.off
  && x >= s.x - 1 && x <= s.x + s.w + 1 && Math.abs(s.y - feet) < 8);

export class Goblin {
  constructor(o) { Object.assign(this, { type: 'goblin', w: 24, h: 30, hp: 1, dir: 1, sp: 55, flash: 0, t: 0 }, o); }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt;
    const nx = this.x + this.dir * this.sp * dt;
    if (g && !floorUnder(g, this.dir > 0 ? nx + this.w + 2 : nx - 2, this.y + this.h)) this.dir *= -1;
    else this.x = nx;
    if (this.x < this.x0) this.dir = 1;
    if (this.x + this.w > this.x1) this.dir = -1;
  }
  hit(d) { this.hp--; this.flash = .12; this.x += d * 10; return this.hp <= 0; }
}

// Road Scavenger: grabs loose coins, bolts when the knight closes in, and drops the sack when
// killed. If it gets away, the coins reappear where they were: the tally can never be lost.
export class Scavenger {
  constructor(o) {
    Object.assign(this, { type: 'scavenger', w: 24, h: 30, hp: 1, dir: 1, sp: 46, flash: 0, t: 0, carry: [], st: 'patrol', stT: 0, escaped: 0 }, o);
    this.x0 = o.x0 != null ? o.x0 : (o.x || 0) - 120;
    this.x1 = o.x1 != null ? o.x1 : (o.x || 0) + 120;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    if (this.st === 'gone') return;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, near = Math.abs(px - cx) < 110;
    if (near && this.st !== 'flee') { this.st = 'flee'; this.stT = 0; }
    if (!near && this.st === 'flee' && this.stT > .8) { this.st = 'patrol'; this.stT = 0; }

    if (this.st === 'flee') {
      const dir = Math.sign(cx - px) || this.dir;
      this.dir = dir;
      this.x += dir * 112 * dt;
      if (this.x < this.x0 - 150 || this.x > this.x1 + 150) this.escape(g);
      return;
    }

    let target = null;
    if (g && g.coins) for (const c of g.coins) {
      if (c.got || c.taken) continue;
      if (Math.abs(c.x - cx) < 260 && Math.abs(c.y - (this.y + this.h)) < 90) { target = c; break; }
    }
    if (target) {
      const dx = target.x - cx;
      this.dir = dx < 0 ? -1 : 1;
      this.x += Math.sign(dx) * this.sp * 1.55 * dt;
      if (Math.abs(dx) < 13) {
        target.taken = 1;
        this.carry.push(target);
        if (g && g.parts) for (let k = 0; k < 4; k++) g.parts.push({ x: target.x, y: target.y, vx: (Math.random() - .5) * 40, vy: -30 - Math.random() * 30, l: .35, col: '#ffd84a' });
        sfx.land();
      }
      return;
    }
    const nx = this.x + this.dir * this.sp * dt;
    if (g && !floorUnder(g, this.dir > 0 ? nx + this.w + 2 : nx - 2, this.y + this.h)) this.dir *= -1;
    else this.x = nx;
    if (this.x < this.x0) { this.x = this.x0; this.dir = 1; }
    if (this.x + this.w > this.x1) { this.x = this.x1 - this.w; this.dir = -1; }
  }
  escape(g) {
    this.st = 'gone'; this.escaped = 1; this.dead = 1;
    for (const c of this.carry) { c.taken = 0; c.x = c.ox != null ? c.ox : c.x; c.y = c.oy != null ? c.oy : c.y; }
    this.carry.length = 0;
    if (g) g.scavEscaped = (g.scavEscaped || 0) + 1;
  }
  drop(g) {
    const n = this.carry.length;
    this.carry.forEach((c, i) => { c.taken = 0; c.x = this.x + this.w / 2 + (i % 3 - 1) * 18; c.y = this.y + this.h - 5; });
    this.carry.length = 0;
    if (g && g.parts) for (let k = 0; k < n * 5; k++) g.parts.push({ x: this.x + this.w / 2, y: this.y + this.h - 8, vx: (Math.random() - .5) * 90, vy: -40 - Math.random() * 70, l: .5, col: '#ffd84a' });
    return n;
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Cinder Crow: perched above the causeway, flares its wings, then dives in a straight line.
// The flare is the tell; the recovery is the punish window.
export class Crow {
  constructor(o) {
    Object.assign(this, { type: 'crow', w: 22, h: 18, hp: 2, t: 0, flash: 0, dir: -1, st: 'perch', stT: 0, vx: 0, vy: 0 }, o);
    this.x0 = o.x; this.baseY = o.y;
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2;
    if (this.st === 'perch') {
      this.dir = px < cx ? -1 : 1;
      this.x = this.x0; this.y = this.baseY + Math.sin(this.t * 2) * 1.5;
      if (Math.abs(px - cx) < 300 && this.stT > 1.0) { this.st = 'flare'; this.stT = 0; sfx.wind(); }
    } else if (this.st === 'flare') {
      this.dir = px < cx ? -1 : 1;
      if (this.stT > .55) {
        this.st = 'dive'; this.stT = 0;
        const tx = p.x + p.w / 2, ty = p.y + p.h / 2;
        const dx = tx - (this.x + this.w / 2), dy = ty - (this.y + this.h / 2), d = Math.hypot(dx, dy) || 1;
        this.vx = dx / d * 430; this.vy = dy / d * 430;
      }
    } else if (this.st === 'dive') {
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.stT > .48 || this.y > 430 || this.x < 0) { this.st = 'recover'; this.stT = 0; this.vx = this.vy = 0; }
    } else if (this.st === 'recover') {
      if (this.stT > 1.2) { this.st = 'return'; this.stT = 0; }
    } else if (this.st === 'return') {
      const dx = this.x0 - this.x, dy = this.baseY - this.y, d = Math.hypot(dx, dy) || 1;
      this.x += dx / d * 260 * dt; this.y += dy / d * 260 * dt;
      if (d < 6) { this.x = this.x0; this.y = this.baseY; this.st = 'perch'; this.stT = 0; }
    }
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }
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
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    const nx = this.x + this.dir * this.sp * dt;
    if (g && !floorUnder(g, this.dir > 0 ? nx + this.w + 2 : nx - 2, this.y + this.h)) this.dir *= -1;
    else this.x = nx;
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
    const nx = this.x + this.dir * this.sp * dt;
    if (g && !floorUnder(g, this.dir > 0 ? nx + this.w + 2 : nx - 2, this.y + this.h)) this.dir *= -1;
    else this.x = nx;
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
    const step = this.lit ? -Math.sign(dx) * 55 : Math.sign(dx) * this.sp;   // recoils from the light
    const nx = this.x + step * dt, feet = this.y0 + this.h;
    if (!g || floorUnder(g, step > 0 ? nx + this.w + 2 : nx - 2, feet)) this.x = nx;
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
    if (Math.abs(dx) > 18) {
      const nx = this.x + Math.sign(dx) * this.sp * dt;
      if (!g || floorUnder(g, Math.sign(dx) > 0 ? nx + this.w + 2 : nx - 2, this.y + this.h)) this.x = nx;
    }
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }
}

export class Hexer {
  constructor(o) {
    Object.assign(this, {
      type: 'hexer', w: 22, h: 30, hp: 3, dir: 1, sp: 46, t: 0, flash: 0,
      st: 'idle', stT: 0, hex: 'smother', lastHex: '', cool: 2.4 + Math.random() * 1.2, applied: null,
      bT: 0, bJump: 0, blinkCd: 0, dying: 0, dmg: 0, summoned: 0, y0: o.y,
      x0: (o.x || 0) - 150, x1: (o.x || 0) + 150,
    }, o);
    this.maxHp = this.hp;
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
        hex: this.hex, dmg: this.dmg, dur, t: 3.6, spin: 0, pierce: this.pierce || 0, from: this });
    }
    sfx.ember();
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.blinkCd -= dt;
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) {
        if (this.applied && p.debuffs && p.debuffs[this.applied] > 0) p.debuffs[this.applied] = 0;   // the hex dies with the caster
        this.dead = 1;
      }
      return;
    }

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

// Mire Leech: hangs from the flooded ceiling, drips, then drops when the knight passes under.
// It crawls for a while, then retracts. Hit it on the ground or while it falls.
export class MireLeech {
  constructor(o) {
    Object.assign(this, { type: 'leech', w: 18, h: 26, hp: 2, x: o.x, y: o.y, y0: o.y, t: 0, st: 'hang', stT: 0, flash: 0, vy: 0, dir: 1, drip: 0 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx;
    if (this.st === 'hang') {
      this.y = this.y0 + Math.sin(this.t * 2) * 2;
      this.drip -= dt;
      if (this.drip <= 0) {
        this.drip = 1.2;
        if (g.parts) g.parts.push({ x: cx, y: this.y + this.h, vx: 0, vy: 20, l: .3, col: '#9fd6c8' });
      }
      if (Math.abs(dx) < 70 && p.y > this.y && this.stT > 1.4) { this.st = 'drop'; this.stT = 0; this.vy = 0; sfx.wind(); }
    } else if (this.st === 'drop') {
      this.vy += 900 * dt; this.y += this.vy * dt;
      const feet = this.y + this.h;
      let land = null;
      if (g) for (const s of g.l.solids) if (typeof s.x === 'number' && !s.pass && !s.off && cx > s.x && cx < s.x + s.w && feet >= s.y - 2 && feet <= s.y + 20) {
        if (!land || s.y < land.y) land = s;
      }
      if (land) { this.y = land.y - this.h; this.st = 'crawl'; this.stT = 0; this.dir = dx < 0 ? -1 : 1; }
      else if (feet > (g.l.water || g.l.h)) this.dead = 1;
    } else if (this.st === 'crawl') {
      this.dir = dx < 0 ? -1 : 1;
      this.x += this.dir * 26 * dt;
      this.y += Math.sin(this.t * 8) * .4;
      if (this.stT > 5) { this.st = 'retract'; this.stT = 0; }
    } else if (this.st === 'retract') {
      this.y -= 90 * dt;
      if (this.y <= this.y0) { this.y = this.y0; this.st = 'hang'; this.stT = 0; }
    }
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Wick Skull: floats and shrieks, calling a goblin to its position. Kill it to stop the calls.
export class WickSkull {
  constructor(o) {
    Object.assign(this, { type: 'skull', w: 20, h: 22, hp: 2, x: o.x, y: o.y, y0: o.y, t: 0, st: 'float', stT: 0, flash: 0, cool: 1.0, summons: 0 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt; this.cool -= dt;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx;
    this.y = this.y0 + Math.sin(this.t * 2.2) * 5;
    this.dir = dx < 0 ? -1 : 1;
    if (this.st === 'float' && this.cool <= 0 && Math.abs(dx) < 280) { this.st = 'shriek'; this.stT = 0; }
    if (this.st === 'shriek' && this.stT > .65) {
      this.st = 'float'; this.stT = 0; this.cool = 4;
      this.summon(g);
    }
  }
  summon(g) {
    if (!g || this.summons >= 3) return;
    let floor = null;
    for (const s of g.l.solids) if (typeof s.x === 'number' && !s.pass && !s.off && this.x + this.w / 2 > s.x && this.x + this.w / 2 < s.x + s.w && s.y > this.y) {
      if (!floor || s.y < floor.y) floor = s;
    }
    if (!floor) return;
    const e = makeEnemy({ type: 'goblin', x: this.x, y: floor.y - 30, x0: this.x - 90, x1: this.x + 120, hp: 1 });
    e.summoned = 1;
    g.enemies.push(e);
    this.summons++; sfx.ember();
  }
  hit() { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Peal Wraith: a bell-tower spirit that screams an expanding ring of sound.
// The ring is a clean circle: jump clear of its height or dash through it.
export class PealWraith {
  constructor(o) {
    Object.assign(this, { type: 'pealwraith', w: 24, h: 30, hp: 2, x: o.x, y: o.y, y0: o.y, t: 0, st: 'float', stT: 0, cool: 1.4, flash: 0, dir: -1, ring: null, stun: 0 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt; this.cool -= dt;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const dx = (p.x + p.w / 2) - cx, dy = (p.y + p.h / 2) - cy;
    this.dir = dx < 0 ? -1 : 1;
    this.y = this.y0 + Math.sin(this.t * 2.4) * 6;
    if (this.st === 'float') {
      if (this.cool <= 0 && Math.abs(dx) < 340 && Math.abs(dy) < 150) {
        this.st = 'scream'; this.stT = 0; this.ring = { r: 14, max: 190, hit: 0 }; sfx.wind();
      }
    } else if (this.st === 'scream') {
      if (!this.ring) { this.st = 'float'; this.stT = 0; this.cool = 3; return; }
      this.ring.r += 210 * dt;
      const px = p.x + p.w / 2, py = p.y + p.h / 2;
      const d = Math.hypot(px - cx, py - cy);
      if (!this.ring.hit && Math.abs(d - this.ring.r) < 16 && Math.abs(py - cy) < 50 && p.inv <= 0 && p.dashT <= 0) {
        this.ring.hit = 1; p.hurt(cx, g);
      }
      if (this.ring.r >= this.ring.max) { this.ring = null; this.st = 'float'; this.stT = 0; this.cool = 3; }
    }
  }
  hit(d) {
    this.hp--; this.flash = .12; this.x += (d || 0) * 8;
    this.ring = null; this.st = 'float'; this.stT = 0; this.cool = Math.max(this.cool, 1.2);
    return this.hp <= 0;
  }
}

// Royal Revenant: a ghostly guard with a long spear. It patrols slowly, then
// telegraphs a long thrust. A perfect guard turns the thrust into a stagger.
export class RoyalRevenant {
  constructor(o) {
    Object.assign(this, { type: 'revenant', w: 26, h: 40, hp: 2, x: o.x, y: o.y, y0: o.y, t: 0,
      st: o.rise ? 'down' : 'patrol', stT: 0, flash: 0, dir: -1, cool: .6, hitDone: 0, rise: o.rise ? 1 : 0 }, o);
  }
  strike(p, g) {
    if (p.inv > 0) return;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2;
    const front = (px - cx) * this.dir > -12;
    const gd = p.guard && p.guard();
    if (gd && front && p.parry > 0) {
      this.st = 'stagger'; this.stT = 0; p.inv = .5;
      g.shake(6); g.stop(.05); sfx.parry(); g.parryMsg = 2.2;
      return;
    }
    if (gd && front) {
      p.vx = this.dir * 180; p.inv = .35;
      g.shake(3); sfx.block(); g.blockMsg = 1;
      return;
    }
    p.hurt(cx, g);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    if (this.st === 'down') {
      if (dist < 220) { this.st = 'rise'; this.stT = 0; sfx.wind(); }
      return;
    }
    if (this.st === 'rise') {
      if (this.stT > .8) { this.st = 'patrol'; this.stT = 0; this.cool = .4; }
      return;
    }
    this.dir = dx < 0 ? -1 : 1;
    if (this.st === 'patrol') {
      this.cool -= dt;
      if (dist > 90) this.x += this.dir * 26 * dt;
      if (dist < 150 && this.cool <= 0) { this.st = 'wind'; this.stT = 0; sfx.wind(); }
      return;
    }
    if (this.st === 'wind') {
      if (this.stT > .55) { this.st = 'thrust'; this.stT = 0; this.hitDone = 0; sfx.swing(); }
      return;
    }
    if (this.st === 'thrust') {
      if (!this.hitDone) {
        const box = this.dir > 0
          ? { x: cx + 4, y: this.y + 8, w: 100, h: 26 }
          : { x: cx - 104, y: this.y + 8, w: 100, h: 26 };
        if (hit(p, box)) { this.hitDone = 1; this.strike(p, g); }
      }
      if (this.stT > .22) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > .8) { this.st = 'patrol'; this.stT = 0; this.cool = .9; }
      return;
    }
    if (this.st === 'stagger') {
      if (this.stT > 1.2) { this.st = 'patrol'; this.stT = 0; this.cool = .8; }
    }
  }
  hit(d) {
    this.hp--; this.flash = .12; this.x += (d || 0) * 8;
    this.st = 'recover'; this.stT = 0;
    return this.hp <= 0;
  }
}

// Ash Bloom: a stationary flower. It opens and spits seeds in the dark and
// clamps shut while a lantern lamp or torch is near.
export class AshBloom {
  constructor(o) {
    Object.assign(this, { type: 'ashbloom', w: 26, h: 34, hp: 2, x: o.x, y: o.y, t: 0, flash: 0,
      st: 'open', stT: 0, cool: 1.1, seeds: [], lit: 0, shots: 0 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    this.lit = !!(g && g.litAt && g.litAt(this.x + this.w / 2, this.y + this.h / 2));
    if (this.lit) {
      this.st = 'closed'; this.stT = 0;
    } else {
      if (this.st === 'closed') { this.st = 'opening'; this.stT = 0; }
      if (this.st === 'opening' && this.stT > .5) { this.st = 'open'; this.stT = 0; this.cool = .8; }
      if (this.st === 'open') {
        this.cool -= dt;
        if (this.cool <= 0) { this.fire(p); this.cool = 2.2; }
      }
    }
    for (const s of this.seeds) {
      s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
      if (hit(p, { x: s.x - 5, y: s.y - 5, w: 10, h: 10 })) { p.hurt(s.x, g); s.done = 1; }
      if (s.t > 2 || s.y > (g.l.h || 640)) s.done = 1;
    }
    this.seeds = this.seeds.filter(s => !s.done);
  }
  fire(p) {
    if (!p) return;
    const cx = this.x + this.w / 2, cy = this.y + 12;
    const tx = p.x + p.w / 2, ty = p.y + p.h / 2, t = .9;
    const vx = (tx - cx) / t, vy = (ty - cy - .5 * 900 * t * t) / t;
    for (let k = -1; k <= 1; k++) this.seeds.push({ x: cx, y: cy, vx: vx + k * 36, vy, t: 0 });
    this.shots = (this.shots || 0) + 1;
    sfx.ember();
  }
  hit(d) { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Thorn Creeper: lies buried until the knight gets close, rustles, then crawls.
export class ThornCreeper {
  constructor(o) {
    Object.assign(this, { type: 'creeper', w: 28, h: 20, hp: 1, x: o.x, y: o.y, y0: o.y, t: 0, flash: 0,
      dir: -1, st: 'buried', stT: 0 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    if (this.st === 'buried') {
      if (dist < 150) { this.st = 'rustle'; this.stT = 0; }
      return;
    }
    if (this.st === 'rustle') {
      if (this.stT > .45) { this.st = 'crawl'; this.stT = 0; }
      return;
    }
    if (this.st === 'crawl') {
      this.dir = dx < 0 ? -1 : 1;
      if (dist > 24) {
        const nx = this.x + this.dir * 78 * dt;
        const floor = g && g.l.solids.some(s => typeof s.x === 'number' && !s.pass && !s.off
          && nx + (this.dir > 0 ? this.w : 0) >= s.x && nx + (this.dir > 0 ? this.w : 0) <= s.x + s.w
          && Math.abs(s.y - (this.y + this.h)) < 10);
        if (floor || !g) this.x = nx; else this.dir *= -1;
      }
    }
  }
  hit(d) { this.hp--; this.flash = .12; this.x += (d || 0) * 8; this.st = 'crawl'; this.stT = 0; return this.hp <= 0; }
}

// Slag Smith: a squat foundry hand who lobs slag that leaves a burning puddle.
export class SlagSmith {
  constructor(o) {
    Object.assign(this, { type: 'slagsmith', w: 32, h: 36, hp: 2, x: o.x, y: o.y, t: 0, flash: 0,
      cool: 1.2, dir: -1, shots: [], puddles: [] }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.cool -= dt;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx;
    this.dir = dx < 0 ? -1 : 1;
    if (this.cool <= 0 && Math.abs(dx) < 460 && Math.abs((p.y + p.h / 2) - (this.y + this.h / 2)) < 300) {
      this.throw(p); this.cool = 2.3;
    }
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
      else if (s.t > 2.6 || s.y > (g ? g.l.h : 1800)) s.done = 1;
    }
    this.shots = this.shots.filter(s => !s.done);
    for (const b of this.puddles) {
      b.t += dt;
      if (b.t < 2.2 && Math.abs((p.x + p.w / 2) - b.x) < 28 && Math.abs((p.y + p.h) - b.y) < 8) p.hurt(b.x, g);
    }
    this.puddles = this.puddles.filter(b => b.t < b.life);
  }
  throw(p) {
    const cx = this.x + this.w / 2, cy = this.y + 8;
    const tx = p.x + p.w / 2, ty = p.y + p.h / 2, t = 1.0;
    const vx = (tx - cx) / t, vy = (ty - cy - .5 * 900 * t * t) / t;
    this.shots.push({ x: cx, y: cy, vx, vy, t: 0 });
    sfx.ember();
  }
  hit(d) { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Rust Wisp: a drifting rust-spark that never chases, only drifts on its line.
export class RustWisp {
  constructor(o) {
    Object.assign(this, { type: 'rustwisp', w: 20, h: 20, hp: 1, x: o.x, y: o.y, x0: o.x, y0: o.y,
      t: Math.random() * 6, flash: 0, range: o.range || 90, phase: o.phase || 0 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt;
    this.x = this.x0 + Math.sin(this.t * .8 + this.phase) * this.range;
    this.y = this.y0 + Math.sin(this.t * 1.7 + this.phase) * 16;
  }
  hit(d) { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Page Moth: drawn toward a burning spark or lamp; otherwise it flutters toward
// the knight. A soft distraction, not a chaser.
export class PageMoth {
  constructor(o) {
    Object.assign(this, { type: 'pagemoth', w: 18, h: 14, hp: 1, x: o.x, y: o.y, x0: o.x, y0: o.y,
      t: 0, flash: 0, dir: -1 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    let tx = p.x + p.w / 2, ty = p.y + p.h / 2, best = 420;
    for (const s of g.sparks || []) { const d = Math.hypot(s.x - cx, s.y - cy); if (d < best) { best = d; tx = s.x; ty = s.y; } }
    for (const l of g.lamps || []) { const d = Math.hypot(l.x - cx, l.y - cy); if (d < best) { best = d; tx = l.x; ty = l.y; } }
    const dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy) || 1;
    const sp = best < 420 ? 92 : 26;
    this.x += dx / d * sp * dt;
    this.y += dy / d * sp * dt + Math.sin(this.t * 3) * 10 * dt;
    this.dir = dx < 0 ? -1 : 1;
  }
  hit(d) { this.hp--; this.flash = .12; return this.hp <= 0; }
}

// Stack Sentinel: a stone reader that freezes while lit and lunges in the dark.
export class StackSentinel {
  constructor(o) {
    Object.assign(this, { type: 'sentinel', w: 28, h: 36, hp: 2, x: o.x, y: o.y, y0: o.y,
      t: 0, flash: 0, dir: -1, st: 'still', stT: 0, cool: .6, vx: 0, lit: 0 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.stT += dt;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, dist = Math.abs(dx);
    this.lit = !!(g && g.litAt && g.litAt(cx, this.y + this.h / 2));
    if (this.lit) { this.st = 'still'; this.stT = 0; this.cool = Math.max(this.cool, .4); return; }
    if (this.st === 'still') {
      this.dir = dx < 0 ? -1 : 1;
      this.cool -= dt;
      if (dist < 280 && this.cool <= 0) { this.st = 'wind'; this.stT = 0; sfx.wind(); }
      return;
    }
    if (this.st === 'wind') {
      this.dir = dx < 0 ? -1 : 1;
      if (this.stT > .5) { this.st = 'lunge'; this.stT = 0; this.vx = this.dir * 360; }
      return;
    }
    if (this.st === 'lunge') {
      this.x += this.vx * dt;
      this.x = Math.max(this.x0 ?? this.x, Math.min(this.x1 ?? this.x, this.x));
      if (this.stT > .35) { this.st = 'recover'; this.stT = 0; }
      return;
    }
    if (this.st === 'recover') {
      if (this.stT > .9) { this.st = 'still'; this.stT = 0; this.cool = 1.2; }
    }
  }
  hit(d) { this.hp--; this.flash = .12; this.x += (d || 0) * 6; this.st = 'recover'; this.stT = 0; return this.hp <= 0; }
}

// Ward Echo: a floating ward shard that fires slow bolts. A perfect guard
// sends a bolt back into it; the echo is the parry lesson for the last area.
export class WardEcho {
  constructor(o) {
    Object.assign(this, { type: 'wardecho', w: 26, h: 26, hp: 2, x: o.x, y: o.y, y0: o.y,
      t: 0, flash: 0, cool: 1.4, dir: -1 }, o);
  }
  update(dt, p, g) {
    this.t += dt; this.flash -= dt; this.cool -= dt;
    this.y = this.y0 + Math.sin(this.t * 2.1) * 5;
    const cx = this.x + this.w / 2, px = p.x + p.w / 2;
    this.dir = px < cx ? -1 : 1;
    if (this.cool <= 0 && Math.abs(px - cx) < 560) {
      this.cool = 2.6;
      const sy = this.y + 13, tx = px, ty = p.y + p.h / 2, d = Math.hypot(tx - cx, ty - sy) || 1;
      g.orbs.push({ x: cx, y: sy, vx: (tx - cx) / d * 150, vy: (ty - sy) / d * 150, r: 8, t: 6, reflected: 0 });
      sfx.ember();
    }
  }
  hit(d) { this.hp--; this.flash = .12; return this.hp <= 0; }
}

export const makeEnemy = o => o.type === 'bat' ? new Bat(o) : o.type === 'shield' ? new ShieldGoblin(o)
  : o.type === 'archer' ? new Archer(o) : o.type === 'wisp' ? new Wisp(o) : o.type === 'crawler' ? new Crawler(o)
  : o.type === 'shade' ? new Shade(o) : o.type === 'husk' ? new Husk(o) : o.type === 'hexer' ? new Hexer(o)
  : o.type === 'scavenger' ? new Scavenger(o) : o.type === 'crow' ? new Crow(o)
  : o.type === 'leech' ? new MireLeech(o) : o.type === 'skull' ? new WickSkull(o)
  : o.type === 'pealwraith' ? new PealWraith(o) : o.type === 'revenant' ? new RoyalRevenant(o)
  : o.type === 'ashbloom' ? new AshBloom(o) : o.type === 'creeper' ? new ThornCreeper(o)
  : o.type === 'slagsmith' ? new SlagSmith(o) : o.type === 'rustwisp' ? new RustWisp(o)
  : o.type === 'pagemoth' ? new PageMoth(o) : o.type === 'sentinel' ? new StackSentinel(o)
  : o.type === 'wardecho' ? new WardEcho(o) : new Goblin(o);
