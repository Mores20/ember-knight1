// Bats and goblins as pixel sprites, same pipeline as the knight and the Warden.
// Cells are authored at 1x and drawn at 2x with smoothing off.
import { kit, px, toCanvas } from './pixel.js';

const M = {
  ink: '#05070f', em: '#ff8a3d', hot: '#ffd08a', hit: '#ffe0c4',
  skin: '#56684e', skinL: '#72866a', skinD: '#3b4a38',       // muted green-grey goblin, lifted to the knight's value
  rag: '#2f3750', ragL: '#3a4262', ragD: '#1a2033',
  steel: '#cfd8ee', steelL: '#eef3ff', steelD: '#8f9bb8',
  bronze: '#7b5530', bronzeL: '#a97a44', bronzeD: '#4a3219',
  wing: '#3a4460', wingL: '#a3aecb', wingD: '#1c2438',
};
const B = kit(32, 24);                                        // bat cell
const G = kit(32, 40);                                        // goblin cell
const STEELISH = [M.skin, M.skinL, M.skinD, M.steel, M.steelL, M.steelD, M.bronze, M.bronzeL, M.bronzeD, M.rag, M.ragL, M.ragD].map(px);

/* ---------------- bat ---------------- */
function batFrame(i, swoop) {
  const c = B.newCell(), cx = 16, cy = 12;
  const tip = swoop ? -4 : [-7, -3, 4, -3][i] ?? -4;
  const spread = swoop ? 10 : 13;
  for (const s of [-1, 1]) {
    B.shape(c, [
      [[cx + s * 2, cy - 3], [cx + s * (spread - 3), cy + tip - 1], [cx + s * spread, cy + tip + 3], [cx + s * 2, cy + 2]],
      [[cx + s * 3, cy - 1], [cx + s * (spread - 2), cy + tip + 7], [cx + s * 4, cy + 4]],
    ], [M.wing, M.wingL, M.wingD]);
  }
  B.shape(c, [B.ell(cx, cy, 5, 4.5, 10)], [M.wing, M.wingL, M.wingD]);
  B.shape(c, [[[cx - 4, cy - 3], [cx - 5, cy - 8], [cx - 1, cy - 5]]], [M.wing, M.wingL, M.wingD]);
  B.shape(c, [[[cx + 4, cy - 3], [cx + 5, cy - 8], [cx + 1, cy - 5]]], [M.wing, M.wingL, M.wingD]);
  B.dpoly(c, [B.rect(cx - 3, cy - 1, 2, 2), B.rect(cx + 1, cy - 1, 2, 2)], M.em);
  return c;
}

/* ---------------- goblin ---------------- */
function goblinFrame(state, i, shield) {
  const c = G.newCell(), cx = 16, fy = 38;
  const walk = state === 'walk' ? i / 4 * 6.283 : 0;
  const bob = state === 'walk' ? (i % 2) : (state === 'idle' && i ? 1 : 0);
  const step = state === 'walk' ? Math.round(Math.sin(walk) * 2) : 0;
  const hipY = 30 + bob, headY = 16 + bob, armY = 25 + bob;

  for (const [lx, off] of [[12, step], [18, -step]]) {         // legs
    G.shape(c, [G.rect(lx - 2, hipY - 1, 4, fy - hipY + off)], [M.skin, M.skinL, M.skinD]);
  }
  G.shape(c, [G.ell(cx, 26 + bob, 8, 8, 10)], [M.skin, M.skinL, M.skinD]);          // hunched torso
  G.shape(c, [[[cx - 7, 28 + bob], [cx + 7, 28 + bob], [cx + 5, 34 + bob], [cx - 5, 34 + bob]]], [M.rag, M.ragL, M.ragD]);
  G.shape(c, [G.limb([cx - 6, armY], [cx - 9, armY + 6], 3)], [M.skin, M.skinL, M.skinD]);  // back arm
  G.shape(c, [G.ell(cx, headY, 8, 7, 12)], [M.skin, M.skinL, M.skinD]);             // head
  G.shape(c, [[[cx - 7, headY - 1], [cx - 11, headY - 5], [cx - 6, headY + 3]]], [M.skin, M.skinL, M.skinD]);
  G.shape(c, [[[cx + 7, headY - 1], [cx + 11, headY - 5], [cx + 6, headY + 3]]], [M.skin, M.skinL, M.skinD]);
  G.dpoly(c, [G.rect(cx - 5, headY - 2, 2, 2), G.rect(cx + 3, headY - 2, 2, 2)], M.em);
  G.dpoly(c, [G.rect(cx - 2, headY + 3, 4, 1)], M.ink);

  const hx = cx + 8, hy = state === 'strike' ? armY - 2 : armY + 4;
  G.shape(c, [G.limb([cx + 6, armY], [hx, hy], 3)], [M.skin, M.skinL, M.skinD]);    // dagger arm
  const bx = hx + 1, by = hy - 3;
  G.shape(c, [[[bx, by - 5], [bx + 2, by], [bx, by + 2], [bx - 2, by]]], [M.steel, M.steelL, M.steelD]);

  if (shield) {                                                                     // bronze kite shield
    const up = shield === 'guard';
    const sx = cx + (up ? 5 : 6), sy = (up ? 10 : 19) + bob;
    G.shape(c, [[[sx, sy], [sx + 6, sy + 4], [sx + 5, sy + 12], [sx, sy + 17], [sx - 5, sy + 12], [sx - 6, sy + 4]]],
      [M.bronze, M.bronzeL, M.bronzeD]);
    G.dpoly(c, [G.ell(sx, sy + 8, 2.4, 2.4, 8)], M.em);
  }
  return c;
}

/* ---------------- rows / drawing ---------------- */
export const ROWS = {
  bat: { fly: 4, swoop: 2 },
  goblin: { walk: 4, idle: 2, strike: 1 },
  shield: { guard: 2, open: 2 },
};
export const META = {
  bat: { w: 32, h: 24, ax: 16, ay: 12 },
  goblin: { w: 32, h: 40, ax: 16, ay: 38 },
  shield: { w: 32, h: 40, ax: 16, ay: 38 },
};

export function frame(kind, state, i = 0, o = {}) {
  const idx = i % ROWS[kind][state];
  let c;
  if (kind === 'bat') c = batFrame(idx, state === 'swoop');
  else c = goblinFrame(state, idx, kind === 'shield' ? state : null);
  if (o.flash) { const h = px(M.hit); for (let k = 0; k < c.length; k++) if (STEELISH.includes(c[k])) c[k] = h; }
  return c;
}

const cache = {};
// (cx, cy) = the anchor from META: goblin feet-centre, bat centre. face = -1 mirrors.
export function drawMob(ctx, kind, state, i, cx, cy, face = 1, o = {}) {
  const m = META[kind], idx = i % ROWS[kind][state];
  const k = `${kind}|${state}|${idx}|${o.flash ? 1 : 0}`;
  cache[k] ??= toCanvas(frame(kind, state, idx, o), m.w, m.h);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy); ctx.scale(face, 1);
  ctx.drawImage(cache[k], -m.ax * 2, -m.ay * 2, m.w * 2, m.h * 2);
  ctx.restore();
}
