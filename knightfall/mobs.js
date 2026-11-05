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
// Six-frame flap: the wing tip sweeps from high to low, the membrane follows one frame late,
// and the body bobs against it. Swoop uses two tighter frames for the dive.
function batFrame(i, swoop) {
  const c = B.newCell(), cx = 16, cy = 12 + (swoop ? 0 : [0, -1, -1, 0, 1, 1][i] ?? 0);
  const tip = swoop ? [-3, -6][i] ?? -4 : [-7, -5, 0, 4, 1, -4][i] ?? -4;
  const spread = swoop ? [9, 11][i] ?? 10 : [13, 15, 14, 12, 11, 12][i] ?? 13;
  const droop = swoop ? 6 : [5, 7, 8, 7, 5, 4][i] ?? 5;
  for (const s of [-1, 1]) {
    B.shape(c, [
      [[cx + s * 2, cy - 3], [cx + s * (spread - 5), cy + tip - 2], [cx + s * spread, cy + tip + 3], [cx + s * (spread - 2), cy + tip + droop], [cx + s * 2, cy + 2]],
      [[cx + s * 3, cy - 1], [cx + s * (spread - 2), cy + tip + droop - 1], [cx + s * 4, cy + 4]],
    ], [M.wing, M.wingL, M.wingD]);
    B.dpoly(c, [B.rect(cx + s * spread - 1, cy + tip + 2, 1, 1)], M.wingD);   // wing claw
  }
  B.shape(c, [B.ell(cx, cy, 5, 4.5, 10)], [M.wing, M.wingL, M.wingD]);
  B.shape(c, [[[cx - 4, cy - 3], [cx - 6, cy - 9], [cx - 1, cy - 5]]], [M.wing, M.wingL, M.wingD]);
  B.shape(c, [[[cx + 4, cy - 3], [cx + 6, cy - 9], [cx + 1, cy - 5]]], [M.wing, M.wingL, M.wingD]);
  B.dpoly(c, [B.rect(cx - 3, cy - 1, 2, 2), B.rect(cx + 1, cy - 1, 2, 2)], M.em);
  B.dpoly(c, [B.rect(cx - 1, cy + 3, 2, 2)], M.wingD);                          // tail
  return c;
}

/* ---------------- goblin ---------------- */
// Hunched raider: hooded head, long ears, a ragged tunic and a notched dagger. Four-step walk
// (leg stride, arm swing, torso bob) and a two-frame strike: coil, then lunge.
function goblinFrame(state, i, shield) {
  const c = G.newCell(), cx = 16, fy = 38;
  const walk = state === 'walk' ? i / 4 * 6.283 : 0;
  const strike = state === 'strike';
  const bob = state === 'walk' ? (i % 2) : state === 'idle' ? (i ? 1 : 0) : shield && i ? 1 : 0;
  const stride = state === 'walk' ? Math.round(Math.sin(walk) * 3) : shield ? (i ? 1 : -1) : 0;
  const swing = state === 'walk' ? Math.round(Math.sin(walk) * 2) : shield ? (i ? 1 : -1) : 0;
  const lean = (strike && i === 0 ? -2 : 0) + (strike && i === 1 ? 3 : 0);
  const hipY = 29 + bob, headY = 16 + bob, armY = 25 + bob;

  for (const [lx, off, lift] of [[12, stride, stride > 0], [19, -stride, stride < 0]]) {   // legs
    const midY = fy - 4 - (lift ? 1 : 0), footY = fy - 2 - (lift ? 1 : 0);
    G.shape(c, [G.limb([lx, hipY - 2], [lx + off * .6, midY], 4)], [M.skin, M.skinL, M.skinD]);
    G.shape(c, [G.limb([lx + off * .6, midY], [lx + off, footY], 3)], [M.skin, M.skinL, M.skinD]);
    G.shape(c, [G.rect(lx + off - 2, footY, 5, 2)], [M.skin, M.skinL, M.skinD]);
  }
  G.shape(c, [G.ell(cx + lean * .25, 25 + bob, 8, 7, 12)], [M.skin, M.skinL, M.skinD]);     // torso
  G.shape(c, [[[cx - 7 + lean, 24 + bob], [cx + 7 + lean, 24 + bob], [cx + 5 + lean, 33 + bob],
    [cx + 2 + lean, 31 + bob], [cx - 1 + lean, 34 + bob], [cx - 4 + lean, 31 + bob], [cx - 6 + lean, 33 + bob]]],
    [M.rag, M.ragL, M.ragD]);                                                                // ragged tunic
  G.shape(c, [G.rect(cx - 5 + lean, 29 + bob, 10, 2)], [M.bronze, M.bronzeL, M.bronzeD]);   // belt
  G.dpoly(c, [G.rect(cx - 1 + lean, 29 + bob, 2, 2)], M.bronzeL);
  G.shape(c, [G.limb([cx - 5 + lean, armY], [cx - 9 - swing, 31 + bob], 3)], [M.skin, M.skinL, M.skinD]);   // back arm

  G.shape(c, [G.ell(cx + lean, headY, 8, 7, 12)], [M.skin, M.skinL, M.skinD]);              // head
  G.shape(c, [G.ell(cx + lean + 3, headY + 4, 5, 3, 10)], [M.skin, M.skinL, M.skinD]);      // jaw
  G.shape(c, [[[cx - 7 + lean, headY - 1], [cx - 13 + lean, headY - 6], [cx - 6 + lean, headY + 4]]], [M.skin, M.skinL, M.skinD]);
  G.shape(c, [[[cx + 7 + lean, headY - 2], [cx + 13 + lean, headY - 7], [cx + 6 + lean, headY + 3]]], [M.skin, M.skinL, M.skinD]);
  G.shape(c, [[[cx - 8 + lean, headY + 1], [cx - 7 + lean, headY - 7], [cx - 2 + lean, headY - 11], [cx + 4 + lean, headY - 9],
    [cx + 8 + lean, headY - 2], [cx + 5 + lean, headY + 1], [cx + 1 + lean, headY - 2], [cx - 4 + lean, headY - 2]]],
    [M.rag, M.ragL, M.ragD]);                                                                // hood
  G.dpoly(c, [G.rect(cx - 6 + lean, headY - 2, 4, 2), G.rect(cx + 2 + lean, headY - 2, 4, 2)], M.ink);
  G.dpoly(c, [G.rect(cx - 5 + lean, headY - 2, 2, 1), G.rect(cx + 3 + lean, headY - 2, 2, 1)], M.em);
  G.dpoly(c, [G.rect(cx + 2 + lean, headY + 2, 2, 1)], M.skinD);
  G.dpoly(c, [G.rect(cx + 1 + lean, headY + 5, 4, 1)], M.ink);
  G.dpoly(c, [G.rect(cx + lean, headY + 5, 1, 1), G.rect(cx + 5 + lean, headY + 5, 1, 1)], M.steelL);   // tusks

  if (shield) {                                                                              // helm + nasal
    G.shape(c, [[[cx - 8 + lean, headY - 2], [cx - 6 + lean, headY - 9], [cx + 6 + lean, headY - 9], [cx + 8 + lean, headY - 2],
      [cx + 3 + lean, headY - 4], [cx - 3 + lean, headY - 4]]], [M.steel, M.steelL, M.steelD]);
    G.dpoly(c, [G.rect(cx - 1 + lean, headY - 7, 2, 8)], M.steelD);
    G.shape(c, [[[cx - 2 + lean, headY - 10], [cx + 1 + lean, headY - 13], [cx + 4 + lean, headY - 10]]], [M.rag, M.ragL, M.ragD]);
  }

  const hx = strike ? (i === 0 ? cx + 3 : cx + 9) : cx + 9 + swing;                          // dagger arm
  const hy = strike ? (i === 0 ? 18 + bob : 27 + bob) : 28 + bob;
  G.shape(c, [G.limb([cx + 5 + lean, armY], [hx, hy], 3)], [M.skin, M.skinL, M.skinD]);
  G.shape(c, [G.ell(hx, hy, 2, 2, 8)], [M.skin, M.skinL, M.skinD]);
  const dx = strike ? (i === 0 ? 4 : 6) : 5, dy = strike && i === 0 ? -3 : -4;
  G.shape(c, [[[hx, hy], [hx + dx, hy + dy], [hx + dx + 1, hy + dy + 1], [hx + 1, hy + 1]]], [M.steel, M.steelL, M.steelD]);
  G.dpoly(c, [G.rect(hx + 1, hy - 1, 2, 2)], M.bronzeL);
  if (strike && i === 1) G.dpoly(c, [G.rect(hx + dx - 1, hy + dy + 1, 1, 1)], M.steelD);
  G.shape(c, [G.ell(cx + 6 + lean, 23 + bob, 4, 3, 8)], [M.bronze, M.bronzeL, M.bronzeD]);   // pauldron
  G.dpoly(c, [G.rect(cx + 6 + lean, 22 + bob, 1, 1)], M.bronzeL);

  if (shield) {                                                                              // bronze kite shield
    const up = shield === 'guard';
    const sx = cx + (up ? 8 : 9), sy = (up ? 9 : 21) + bob;
    G.shape(c, [[[sx, sy], [sx + 7, sy + 4], [sx + 6, sy + 12], [sx, sy + 18], [sx - 6, sy + 12], [sx - 7, sy + 4]]],
      [M.bronze, M.bronzeL, M.bronzeD]);
    G.dpoly(c, [G.ell(sx, sy + 9, 2.6, 2.6, 8)], M.em);
    G.dpoly(c, [G.rect(sx - 1, sy + 8, 1, 3), G.rect(sx + 1, sy + 8, 1, 3)], M.hot);
    G.dpoly(c, [G.rect(sx - 5, sy + 3, 1, 1), G.rect(sx + 4, sy + 3, 1, 1), G.rect(sx - 4, sy + 15, 1, 1), G.rect(sx + 3, sy + 15, 1, 1)], M.bronzeL);
    if (!up) G.dpoly(c, [G.rect(sx - 2, sy - 3, 4, 2)], M.bronzeD);
  }
  return c;
}

/* ---------------- rows / drawing ---------------- */
export const ROWS = {
  bat: { fly: 6, swoop: 2 },
  goblin: { walk: 4, idle: 2, strike: 2 },
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
