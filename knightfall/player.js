import { keys, pressed } from './input.js';
import { sfx } from './audio.js';
const MAXV = 230, ACC = 1900, GRAV = 1700, JV = -620, CUT = -240, DASH_V = 480, DASH_VG = 403, DASH_T = .22;
export const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export class Player {
  constructor() { this.w = 22; this.h = 34; this.hp = 3; this.reset(80, 386); }
  reset(x, y) { Object.assign(this, { x, y, vx: 0, vy: 0, face: 1, ground: false, groundSolid: null, coyote: 0, buf: 0, swing: 0, inv: 0, kb: 0, run: 0, hits: new Set(), dashT: 0, dashCd: 0, dashUsed: false, root: 0,
      debuffs: { smother: 0, heavy: 0, snuff: 0 } }); }
  // Short hitbox in front of the knight, only live during the middle of the swing.
  sword() {
    if (this.swing <= .1 || this.swing > .2) return null;
    return { x: this.face > 0 ? this.x + this.w : this.x - 36, y: this.y + 2, w: 36, h: 28 };
  }
  hurt(fx, g) {
    if (this.inv > 0) return;
    this.hp--; this.inv = 1.2; this.vy = -300; this.vx = this.x < fx ? -240 : 240; this.kb = .25;
    g.shake(9); g.stop(.1); sfx.hurt();
  }
  update(dt, solids, g) {
    const ride = this.groundSolid;                               // moving platforms carry the rider (S5)
    if (ride && ride.kind === 'move') { this.x += ride.dx; this.y += ride.dy; }
    if (this.root > 0) this.root -= dt;                            // snares pin you in place for a beat
    for (const k in this.debuffs) if (this.debuffs[k] > 0) this.debuffs[k] -= dt;   // hexes burn off
    const heavy = this.debuffs.heavy > 0;
    const dir = this.root > 0 ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (this.ground) this.dashUsed = false;                       // ember dash refills on touchdown
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.dashT > 0) this.dashT -= dt;                         // mid-surge: hold speed, no acceleration
    else {
      if (this.kb > 0) this.kb -= dt;
      else { const d = dir * MAXV * (heavy ? .65 : 1) * (this.swing > 0 ? .6 : 1) - this.vx, a = ACC * (this.ground && this.dashCd > 0 ? 2.4 : 1) * dt; this.vx += Math.abs(d) < a ? d : Math.sign(d) * a; }
      if (dir && this.swing <= 0) this.face = dir;
    }
    if (pressed.dash && this.dashT <= 0 && this.dashCd <= 0 && !this.dashUsed && g.abil.dash && !heavy) {
      this.dashT = DASH_T; this.dashCd = .4; this.dashUsed = true; // one surge per airtime
      this.vx = this.face * (this.ground ? DASH_VG : DASH_V);       // vy is kept: dashing at apex carries furthest
      sfx.dash();
    }
    this.coyote = this.ground ? .1 : this.coyote - dt;            // coyote time
    this.buf = pressed.jump ? .12 : this.buf - dt;                // jump buffering
    if (this.dashT <= 0) {                                        // gravity and jumping wait for the surge to end
      if (this.buf > 0 && this.coyote > 0 && this.root <= 0) { this.vy = JV * (heavy ? .82 : 1); this.buf = this.coyote = 0; this.ground = false; sfx.jump(); }
      if (!keys.jump && this.vy < CUT) this.vy = CUT;             // variable jump height
      this.vy = Math.min(this.vy + GRAV * dt, 900);
    }
    if (pressed.atk && this.swing <= 0) { this.swing = .26; this.hits = new Set(); sfx.swing(); }
    this.swing -= dt; this.inv -= dt;
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
    if (this.ground && !was) sfx.land();
    this.run += Math.abs(this.vx) * dt * .05;
  }
}
