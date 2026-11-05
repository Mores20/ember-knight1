import { keys, pressed } from './input.js';
import { sfx } from './audio.js';
const MAXV = 230, ACC = 1900, GRAV = 1700, JV = -620, CUT = -240, DASH_V = 480, DASH_VG = 403, DASH_T = .22;
export const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export class Player {
  constructor() { this.w = 22; this.h = 34; this.hp = 3; this.reset(80, 386); }
  reset(x, y) { Object.assign(this, { x, y, vx: 0, vy: 0, face: 1, ground: false, groundSolid: null, coyote: 0, buf: 0, swing: 0, inv: 0, kb: 0, run: 0, hits: new Set(), dashT: 0, dashCd: 0, dashUsed: false, root: 0, crushed: 0, aim: 'side', shield: 0, block: 0, parry: 0,
      debuffs: { smother: 0, heavy: 0, snuff: 0 } }); }
  // Short hitbox in front of the knight, only live during the middle of the swing.
  sword() {
    if (this.swing <= .1 || this.swing > .2) return null;
    const cx = this.x + this.w / 2;
    if (this.aim === 'up') return { x: cx - 20, y: this.y - 34, w: 40, h: 38 };             // overhead cut
    if (this.aim === 'down') return { x: cx - 20, y: this.y + this.h - 4, w: 40, h: 38 };    // plunge
    return { x: this.face > 0 ? this.x + this.w : this.x - 36, y: this.y + 2, w: 36, h: 28 };
  }
  // Raised guard: a small shield hitbox in front. Live only while the block key is held.
  guard() {
    if (!this.block) return null;
    const cx = this.x + this.w / 2;
    return this.face > 0 ? { x: cx + 4, y: this.y + 1, w: 20, h: 30 } : { x: cx - 24, y: this.y + 1, w: 20, h: 30 };
  }
  hurt(fx, g) {
    if (this.inv > 0) return;
    if (this.shield > 0) {                                        // the Ember Shield eats one hit
      this.shield = 0; this.inv = .8; this.vy = -140; this.kb = .12;
      g.shake(6); g.stop(.04); sfx.block(); return;
    }
    this.hp--; this.inv = 1.2; this.vy = -300; this.vx = this.x < fx ? -240 : 240; this.kb = .25;
    g.shake(9); g.stop(.1); sfx.hurt();
  }
  update(dt, solids, g) {
    const ride = this.groundSolid;                               // moving platforms carry the rider
    if (ride && (ride.kind === 'move' || ride.kind === 'sink')) { this.x += ride.dx || 0; this.y += ride.dy || 0; }
    if (this.root > 0) this.root -= dt;                            // snares pin you in place for a beat
    for (const k in this.debuffs) if (this.debuffs[k] > 0) this.debuffs[k] -= dt;   // hexes burn off
    const heavy = this.debuffs.heavy > 0;
    this.parry = Math.max(0, this.parry - dt);                     // perfect-parry window after the block press
    this.block = g.blockEnabled && keys.block && !heavy ? 1 : 0;
    if (g.blockEnabled && pressed.block && !heavy) this.parry = .16;
    const dir = this.root > 0 ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (this.ground) this.dashUsed = false;                       // ember dash refills on touchdown
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.dashT > 0) this.dashT -= dt;                         // mid-surge: hold speed, no acceleration
    else {
      if (this.kb > 0) this.kb -= dt;
      else { const d = dir * MAXV * (heavy ? .65 : 1) * (this.swing > 0 ? .6 : 1) * (this.block ? .35 : 1) - this.vx, a = ACC * (this.ground && this.dashCd > 0 ? 2.4 : 1) * dt; this.vx += Math.abs(d) < a ? d : Math.sign(d) * a; }
      if (dir && this.swing <= 0) this.face = dir;
    }
    if (pressed.dash && this.dashT <= 0 && this.dashCd <= 0 && !this.dashUsed && g.abil.dash && !heavy && !this.block) {
      this.dashT = DASH_T; this.dashCd = .4; this.dashUsed = true; // one surge per airtime
      let ax = dir, ay = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (!ax && !ay) { ax = this.face; ay = 0; }                    // neutral dash keeps the facing
      const len = Math.hypot(ax, ay) || 1; ax /= len; ay /= len;
      if (ax) this.face = Math.sign(ax);
      const surge = this.ground && !ay ? DASH_VG : DASH_V;            // a pure ground dash is the short one
      this.vx = ax * surge;
      if (ay) this.vy = ay * surge;                                  // flat dashes keep their vertical momentum
      sfx.dash();
      sfx.dash();
    }
    this.coyote = this.ground ? .1 : this.coyote - dt;            // coyote time
    this.buf = pressed.jump ? .12 : this.buf - dt;                // jump buffering
    if (this.dashT <= 0) {                                        // gravity and jumping wait for the surge to end
      if (this.buf > 0 && this.coyote > 0 && this.root <= 0) { this.vy = JV * (heavy ? .82 : 1); this.buf = this.coyote = 0; this.ground = false; sfx.jump(); }
      if (!keys.jump && this.vy < CUT) this.vy = CUT;             // variable jump height
      this.vy = Math.min(this.vy + GRAV * dt, 900);
    }
    if (pressed.atk && this.swing <= 0) {
      this.swing = .26; this.hits = new Set();
      this.aim = keys.up ? 'up' : (keys.down && !this.ground) ? 'down' : 'side';
      sfx.swing();
    }
    this.swing -= dt; this.inv -= dt;
    this.crushed = this.separate(solids);                            // resolve anything we were already inside first
    this.x += this.vx * dt;
    for (const s of solids) {
      if (s.off || s.pass || s.oneway) continue;                        // one-way ledges never block a walk
      if (hit(this, s)) {                                               // shove out the way that moves us least;
        this.x = this.vx > 0 ? s.x - this.w                            //   vx names the side for a wall we ran into,
          : this.vx < 0 ? s.x + s.w
          : (this.x + this.w - s.x <= s.x + s.w - this.x ? s.x - this.w : s.x + s.w);   //   but a moving solid needs the nearer edge
        this.vx = 0;
      }
    }
    const was = this.ground, wasBottom = this.y + this.h;
    this.y += this.vy * dt; this.ground = false; this.groundSolid = null;
    for (const s of solids) {
      if (s.off || s.pass) continue;                                       // crumbled platform: no collision
      if (s.oneway) {                                                      // thin ledge: land on it, jump up through it
        if (this.vy < 0 || wasBottom > s.y + 6) continue;
        if (hit(this, s)) { this.y = s.y - this.h; this.vy = 0; this.ground = true; this.groundSolid = s; }
        continue;
      }
      if (hit(this, s)) { if (this.vy > 0) { this.y = s.y - this.h; this.ground = true; this.groundSolid = s; } else this.y = s.y + s.h; this.vy = 0; }
    }
    if (this.separate(solids)) this.crushed = 1;                     // still buried after the move: a true crush
    if (this.ground && !was) sfx.land();
    this.run += Math.abs(this.vx) * dt * .05;
  }

  // Push out of any solid we overlap, along the smallest axis (deterministic, never random).
  // Returns 1 if a solid still contains us afterwards - a true crush.
  separate(solids) {
    for (let pass = 0; pass < 2; pass++) {
      let fixed = false;
      for (const s of solids) {
        if (s.off || s.pass || s.oneway || !hit(this, s)) continue;
        const left = (this.x + this.w) - s.x, right = (s.x + s.w) - this.x;
        const top = (this.y + this.h) - s.y, bottom = (s.y + s.h) - this.y;
        if (Math.min(left, right) <= Math.min(top, bottom)) { this.x += left < right ? -left : right; this.vx = 0; }
        else { this.y += top < bottom ? -top : bottom; this.vy = 0; }
        fixed = true;
      }
      if (!fixed) break;
    }
    for (const s of solids) {
      if (s.off || s.pass || s.oneway) continue;
      if (hit(this, s)) return 1;
    }
    return 0;
  }
}
