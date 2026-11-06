// Area VIII boss: the Ash King. Reuses the shipped v1 three-phase moveset and
// adds the v2 perfect-guard reflection for his Ember Bolts.
import { AshKing } from '../king.js';
import { hit } from '../player.js';
import { sfx } from '../audio.js';

export class EmberKing extends AshKing {
  constructor(o) {
    super({ ...o, hp: o.hp || 18 });
    this.kind = 'king'; this.type = 'boss';
    this.name = o.name || 'THE ASH KING';
    this.sealed = o.sealed || 'THE ASH KING HOLDS THE EMBER HEART';
    this.maxHp = this.max;
    this.deadT = 0;
    this.deathLine = 'A flame kept is a flame lost. Share it.';
  }
  update(dt, p, g) {
    super.update(dt, p, g);
    if (this.st === 'dead' || this.st === 'gone') this.deadT += dt;
  }
  parry(p, g) {
    let n = super.parry(p, g);                                   // sword-swing parry
    if (p.block && p.guard) {
      const gd = p.guard();
      for (const b of this.bolts) {
        if (b.reflected || b.delay > 0) continue;
        if (!hit(gd, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) continue;
        if (p.parry > 0) {                                        // perfect guard: send it home
          const tx = this.x + this.w / 2, ty = this.y + 44, t = .28;
          b.reflected = 1; b.vx = (tx - b.x) / t; b.vy = (ty - b.y) / t;
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * 6.28, sp = 70 + Math.random() * 150;
            g.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, l: .5, col: '#ffd479' });
          }
          n++;
          g.parryMsg = 2.2; sfx.parry(); g.shake(3); g.stop(.05);
        } else {                                                  // a normal guard stops it
          b.done = 1; g.blockMsg = 1; sfx.block(); g.shake(2);
          for (let i = 0; i < 6; i++) {
            const a = Math.random() * 6.28, sp = 40 + Math.random() * 90;
            g.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, l: .35, col: '#7fe3ff' });
          }
        }
      }
      if (n) this.streak = 0;
    }
    return n;
  }
}
