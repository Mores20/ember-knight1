// Pixel models for the five new mobs. 32x32 cells, feet on the bottom row, facing right (engine mirrors).
// Flat look, no contour rings: a dark body, a "lift" tone for value separation, and an orange rim on the
// top/front edge plus orange eyes. Colours come from themes.js. Pure pixel buffers (runs in Node too).
import { MOBS as M, THREAT as X } from './themes.js';
const N = 32, FLASH = '#ffe0c4', PALE = '#8f9bb8', STRING = '#8f9bb8', LITLIFT = '#4a52a8', WOODL = '#7b5530';
const H = {}; const px = h => H[h] ??= (() => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; })();
const cell = () => new Uint32Array(N * N);
const R = (c, col, x, y, w = 1, h = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const xx = Math.round(x) + i, yy = Math.round(y) + j; if (xx >= 0 && yy >= 0 && xx < N && yy < N) c[yy * N + xx] = px(col); } };
const disc = (c, col, cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) R(c, col, cx + x, cy + y); };
const ring = (c, col, cx, cy, r) => { for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = x * x + y * y; if (d >= r * r - r && d <= r * r + r) R(c, col, cx + x, cy + y); } };
function line(c, col, x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { R(c, col, x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
// Orange rim: body/lift pixels with empty space above or in front of them.
function rim(c, cols, col) {
  const B = new Set(cols.map(px)), add = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (B.has(c[i]) && (!(y ? c[i - N] : 0) || !(x < N - 1 ? c[i + 1] : 0))) add.push(i); }
  for (const i of add) c[i] = px(col);
}

// ---- V: Ash Archer — hooded, slender; draws a bow, arrow tip goes hot on the last draw frame (the tell).
function archer(st, i) {
  const c = cell(), B = M.archer, b = st === 'idle' ? i : 0, p = st === 'draw' ? [2, 5, 8][i] : 0;
  R(c, B.body, 12, 25, 3, 7); R(c, B.body, 16, 25, 3, 7); R(c, B.lift, 12, 25, 1, 7);
  R(c, B.body, 10, 13 + b, 11, 7); R(c, B.body, 9, 19 + b, 13, 7); R(c, B.lift, 10, 13 + b, 2, 13);
  R(c, B.body, 9, 26 + b, 2, 2); R(c, B.body, 13, 26 + b, 2, 1); R(c, B.body, 18, 26 + b, 3, 2);
  R(c, B.body, 11, 5 + b, 9, 9); R(c, B.body, 12, 4 + b, 7, 1); R(c, B.lift, 11, 5 + b, 2, 8);
  const eye = st === 'draw' && i === 2 ? X.hot : X.eye; R(c, eye, 14, 9 + b, 2, 1); R(c, eye, 18, 9 + b, 2, 1);
  R(c, B.body, 19, 15 + b, 5, 2);
  rim(c, [B.body, B.lift], X.rim);
  for (let y = 8; y <= 26; y++) R(c, WOODL, 23 + Math.round(3 * Math.sin((y - 8) / 18 * Math.PI)), y + b);
  line(c, STRING, 23, 8 + b, 23 - p, 17 + b); line(c, STRING, 23 - p, 17 + b, 23, 26 + b);
  if (st === 'draw') { R(c, B.arrow, 23 - p, 17 + b, 7 + p, 1); if (i) R(c, B.hot, 29, 17 + b); R(c, B.lift, 22 - p, 16 + b, 2, 3); }
  if (st === 'shoot') { R(c, B.hot, 29, 16, 1, 3); R(c, X.eye, 30, 17, 2, 1); }
  return c;
}

// ---- V-VI: Cinder Wisp — dark orb, orange ring, orbiting sparks. Burst = telegraph then explosion.
// When light makes it flee, ring and eyes go pale: pale = harmless, orange = danger.
function wisp(st, i) {
  const c = cell(), B = M.wisp, cx = 16, cy = 15;
  const body = (r, eye, rc) => { disc(c, B.body, cx, cy, r); for (let y = -r; y < 0; y++) for (let x = -r; x < 0; x++) if (x * x + y * y <= r * r - 2) R(c, B.lift, cx + x, cy + y);
    ring(c, rc, cx, cy, r + 1); R(c, eye, cx - 3, cy - 1, 2, 2); R(c, eye, cx + 1, cy - 1, 2, 2); };
  if (st === 'float') { const r = 6 + (i & 1); body(r, X.eye, B.ring); for (let k = 0; k < 3; k++) { const a = i * 1.57 + k * 2.09; R(c, B.hot, cx + Math.cos(a) * 11, cy + Math.sin(a) * 11); } R(c, B.ring, cx, cy + r + 3, 1, 2); }
  else if (st === 'burst') {
    if (i === 0) { body(8, X.hot, B.hot); ring(c, B.ring, cx, cy, 10); }
    else if (i === 1) { body(7, X.hot, B.ring); for (let k = 0; k < 8; k++) { const a = k * .785; line(c, B.ring, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14); R(c, B.hot, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14); } }
    else { ring(c, B.ring, cx, cy, 13); ring(c, B.hot, cx, cy, 10); for (let k = 0; k < 10; k++) { const a = k * .63 + .3; R(c, B.hot, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); } }
  } else body(5 + (i & 1), B.scaredEye, PALE);
  return c;
}

// ---- VI: Slag Crawler — three humps with glowing seams; the 'trail' tile is the burning ground it leaves.
function crawler(st, i) {
  const c = cell(), B = M.crawler;
  if (st === 'trail') {
    for (let x = 0; x < N; x++) { const h = 2 + Math.round(2 * Math.sin(x * .7 + i * 2.1) + 2); R(c, B.trail, x, 32 - h, 1, h); const k = Math.max(0, h - 2); if (k) R(c, B.hot, x, 32 - k, 1, k); }
    R(c, B.hot, (i * 11 + 5) % 30, 24 - (i * 3) % 4); R(c, B.hot, (i * 7 + 19) % 30, 22 - (i * 2) % 3); return c;
  }
  for (let k = 0; k < 3; k++) { const h = 6 + ((i + k) % 3 === 0 ? 2 : 0), x = 5 + k * 7; R(c, B.body, x, 31 - h, 7, h - 1); R(c, B.body, x + 1, 30 - h, 5, 1); R(c, B.lift, x + 1, 30 - h, 5, 1); R(c, B.trail, x + 3, 28 - h, 1, 2); }
  R(c, B.body, 2, 26, 4, 4); R(c, B.body, 0, 28, 3, 2); R(c, B.lift, 2, 26, 3, 1);
  for (const x of [11, 18]) { R(c, B.trail, x, 24, 1, 6); R(c, B.hot, x, 27); }
  R(c, B.body, 25, 22, 6, 8); R(c, B.lift, 25, 22, 6, 1); R(c, X.eye, 28, 24, 2, 2);
  for (let k = 0; k < 3; k++) R(c, B.lift, 7 + k * 7, 30, 3, (i + k) & 1 ? 2 : 2);
  rim(c, [B.body, B.lift], X.rim); return c;
}

// ---- VII: Shade — ragged ghost. 'shadow' = dim rim, dithered, untouchable; 'lit' = solid, hittable; 'strike' lunges.
function shade(st, i) {
  const c = cell(), B = M.shade, lit = st === 'lit', strike = st === 'strike', bob = Math.round(Math.sin(i * 2.1)), f = strike ? 2 : 0;
  const sc = lit ? B.litBody : B.body, lc = lit ? LITLIFT : B.lift;
  R(c, sc, 10 + f, 10 + bob, 12, 14); for (let k = 0; k < 6; k++) R(c, sc, 10 + f + k * 2, 24 + bob, 2, (k + i) & 1 ? 6 : 3);
  R(c, sc, 11 + f, 5 + bob, 10, 7); R(c, sc, 12 + f, 4 + bob, 8, 1); R(c, lc, 10 + f, 10 + bob, 2, 14);
  if (strike) { R(c, sc, 22, 14, 8, 2); R(c, sc, 29, 12, 1, 2); R(c, sc, 29, 16, 1, 2); } else R(c, sc, 22 + f, 14 + bob, 3, 2);
  // dither with the dim rim colour rather than punching holes, so the rim pass cannot speckle the body
  if (st === 'shadow') for (let y = 18; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) & 1 && c[y * N + x]) c[y * N + x] = px(B.shadowRim);
  rim(c, [sc, lc], st === 'shadow' ? B.shadowRim : X.rim);
  const e = lit ? B.litEye : strike ? X.hot : X.eye; R(c, e, 15 + f, 8 + bob, 2, 2); R(c, e, 18 + f, 8 + bob, 2, 2);
  return c;
}

// ---- VIII: Ember Husk — a small echo of the Warden: horned helm, cracked body, little axe.
function axe(c, B, hx, hy, a) {
  const co = Math.cos(a), si = Math.sin(a);
  for (let t = 0; t <= 9; t++) R(c, WOODL, hx + co * t, hy + si * t, 2, 1);
  const ex = hx + co * 10, ey = hy + si * 10;
  for (let u = -4; u <= 4; u++) { const d = Math.abs(u) > 2 ? 2 : 3; for (let t = 0; t < d; t++) R(c, t ? B.lift : '#3a4262', ex + co * t - si * u, ey + si * t + co * u); R(c, X.rim, ex + co * d - si * u, ey + si * d + co * u); R(c, X.rim, ex + co * (d + 1) - si * u, ey + si * (d + 1) + co * u); }
}
function husk(st, i) {
  const c = cell(), B = M.husk; let lean = 0, b = 0, s = 0, hot = false, a = 1.1, hx = 20, hy = 19;
  if (st === 'idle') { b = i; hy = 19 + b; }
  else if (st === 'walk') { s = Math.round(Math.sin(i / 4 * 6.283) * 2); b = i & 1; hy = 19 + b; }
  else if (st === 'cleave_wind') { lean = -1; hot = i === 1; a = [-1.9, -2.5][i]; hx = 19; hy = 13; }
  else if (st === 'cleave') { lean = 3; b = 3; hot = true; a = 1.0; hx = 23; hy = 19; }
  else { lean = 3; b = 3; hot = true; a = 3.0; hx = 15; hy = 22; }               // charge
  R(c, B.body, 11 + s, 25, 4, 7); R(c, B.body, 17 - s, 25, 4, 7); R(c, B.lift, 10 + s, 30, 5, 2); R(c, B.lift, 16 - s, 30, 5, 2);
  R(c, B.body, 9 + lean, 13 + b, 13, 12); R(c, B.lift, 9 + lean, 13 + b, 3, 12); R(c, B.lift, 9 + lean, 21 + b, 13, 1);
  R(c, B.body, 11 + lean, 5 + b, 10, 9); R(c, B.body, 9 + lean, 2 + b, 2, 5); R(c, B.body, 21 + lean, 2 + b, 2, 5); R(c, B.lift, 11 + lean, 5 + b, 2, 8);
  R(c, B.body, 18 + lean, 15 + b, 4, 2);
  rim(c, [B.body, B.lift], X.rim);
  const eye = hot ? X.hot : X.eye; R(c, eye, 15 + lean, 9 + b, 2, 1); R(c, eye, 18 + lean, 9 + b, 2, 1);
  R(c, B.crack, 13 + lean, 15 + b, 1, 4); R(c, B.crack, 14 + lean, 18 + b, 1, 3); R(c, B.hot, 13 + lean, 16 + b);
  axe(c, B, hx, hy, a);
  if (st === 'charge') for (const y of [10, 14, 18]) R(c, B.crack, 0, y, 7, 1);
  return c;
}

// ---- V-VIII: Ash Hexer — floating hooded caster. Its spells apply debuffs instead of damage.
// Orb tells: Smother = orange, Heavy Hex = flickering orange, Snuff Hex = pale. 'bolt' = the three projectiles, 'icons' = HUD debuff badges.
function hexer(st, i) {
  const c = cell(), B = M.hexer, PALE2 = B.pale;
  const robe = (b, lean = 0) => {
    R(c, B.body, 11 + lean, 14 + b, 10, 7); R(c, B.body, 10 + lean, 20 + b, 12, 7);
    R(c, B.body, 10 + lean, 27 + b, 2, 2); R(c, B.body, 14 + lean, 27 + b, 2, 3); R(c, B.body, 18 + lean, 27 + b, 3, 2);
    R(c, B.body, 12 + lean, 6 + b, 9, 9); R(c, B.body, 13 + lean, 4 + b, 6, 2); R(c, B.body, 11 + lean, 2 + b, 5, 2); R(c, B.body, 8 + lean, 1 + b, 4, 2);
    R(c, B.body, 20 + lean, 16 + b, 5, 3); R(c, B.lift, 11 + lean, 14 + b, 2, 13); R(c, B.lift, 12 + lean, 6 + b, 2, 8); R(c, B.lift, 24 + lean, 16 + b, 2, 2);
  };
  const eyes = (b, lean = 0, col = X.eye) => { R(c, col, 15 + lean, 10 + b, 2, 1); R(c, col, 18 + lean, 10 + b, 2, 1); };
  const staff = (x, top, tilt, orbCol, r = 2) => { for (let y = top + 3; y < 30; y++) R(c, WOODL, x + Math.round(tilt * (1 - (y - top) / (30 - top))), y); disc(c, orbCol, x + tilt, top, r); if (r > 1) R(c, B.orbLift, x + tilt - 1, top - 1); };
  const wisps = k => { R(c, PALE, 12 + k * 3, 31); R(c, PALE, 19 - k * 2, 30); R(c, PALE, 16 + k, 31); };
  const dither = (par, y0 = 0) => { for (let y = y0; y < N; y++) for (let x = 0; x < N; x++) if (((x + y) & 1) === par) c[y * N + x] = 0; };
  const smoke = (r, n) => { for (let k = 0; k < n; k++) { const a = k * 6.283 / n + r; R(c, PALE, 16 + Math.cos(a) * r, 18 + Math.sin(a) * r * .8); } };
  if (st === 'idle') { robe(i); rim(c, [B.body, B.lift], X.rim); eyes(i); staff(26, 6 + i, 0, B.orb); wisps(i); return c; }
  if (st.startsWith('cast')) {
    const kind = st.slice(5), col = kind === 'snuff' ? PALE2 : X.eye;
    if (i === 0) { robe(0); rim(c, [B.body, B.lift], X.rim); eyes(0, 0, kind === 'snuff' ? PALE2 : X.hot); staff(26, 6, 0, col, 3); ring(c, col, 26, 6, 5); if (kind === 'heavy') R(c, B.body, 25, 5, 2, 2); }
    else if (i === 1) { robe(0, 1); rim(c, [B.body, B.lift], X.rim); eyes(0, 1, col === PALE2 ? PALE2 : X.hot); staff(24, 7, 5, col, 3);
      if (kind === 'smother') { R(c, col, 30, 6, 2, 3); R(c, PALE, 31, 10); R(c, PALE, 30, 4); } else { R(c, col, 28, 14, 4, 1); R(c, kind === 'snuff' ? PALE2 : X.hot, 29, 14, 2, 1); } }
    else { robe(0); rim(c, [B.body, B.lift], X.rim); eyes(0); staff(26, 6, 0, B.orb); R(c, col, 28, 4); R(c, col, 24, 3); wisps(1); }
    return c;
  }
  if (st === 'blink') {
    if (i === 1) { smoke(9, 12); smoke(5, 8); R(c, X.eye, 15, 16, 2, 1); R(c, X.eye, 18, 16, 2, 1); return c; }
    robe(0); rim(c, [B.body, B.lift], X.rim); eyes(0); staff(26, 6, 0, B.orb); dither(i ? 0 : 1); smoke(i ? 6 : 9, 10); return c;
  }
  if (st === 'die') {
    if (i === 0) { robe(4, -1); rim(c, [B.body, B.lift], X.rim); eyes(4, -1); line(c, WOODL, 24, 22, 30, 28); disc(c, B.orb, 30, 28, 2); }
    else if (i === 1) { R(c, B.body, 8, 25, 16, 5); R(c, B.body, 10, 22, 12, 3); R(c, B.body, 13, 20, 6, 2); R(c, B.body, 18, 18, 5, 2); R(c, B.lift, 10, 22, 2, 8); rim(c, [B.body, B.lift], X.rim); disc(c, B.orb, 27, 29, 1); }
    else { R(c, B.orb, 9, 27, 14, 3); R(c, B.orb, 12, 25, 8, 2); R(c, B.lift, 17, 23, 5, 2); dither(1, 25); R(c, X.eye, 16, 28); R(c, PALE, 8, 24); R(c, PALE, 21, 22); R(c, PALE, 13, 21); }
    return c;
  }
  if (st === 'bolt') {
    if (i === 0) { for (const [x, y, r] of [[12, 16, 5], [18, 13, 4], [19, 19, 4]]) ring(c, X.rim, x, y, r + 1); for (const [x, y, r] of [[12, 16, 5], [18, 13, 4], [19, 19, 4]]) { disc(c, B.body, x, y, r); R(c, B.lift, x - 2, y - 2, 2, 1); } R(c, PALE, 6, 12); R(c, PALE, 24, 21); R(c, PALE, 22, 8); }
    else if (i === 1) { for (let x = 6; x <= 26; x++) { const h = Math.round(3 * Math.sqrt(Math.max(0, 1 - ((x - 16) / 10) ** 2))); R(c, B.body, x, 16 - h, 1, 2 * h + 1); } rim(c, [B.body], X.rim); R(c, X.eye, 10, 16, 12, 1); R(c, X.hot, 14, 16, 5, 1); R(c, X.eye, 3, 15, 2, 1); R(c, X.eye, 1, 17, 2, 1); }
    else { disc(c, B.body, 18, 16, 4); ring(c, PALE2, 18, 16, 5); R(c, PALE2, 17, 15, 2, 2); for (let x = 3; x < 13; x++) R(c, PALE2, x, 15 + (x % 3), 1, 1); }
    return c;
  }
  // icons: 12x12 HUD badges with an orange rim: slow cloud, heavy arrow, snuffed candle
  R(c, X.body, 10, 10, 12, 12); for (const [x, y, w, h] of [[10, 10, 12, 1], [10, 21, 12, 1], [10, 10, 1, 12], [21, 10, 1, 12]]) R(c, X.rim, x, y, w, h);
  if (i === 0) { R(c, PALE2, 12, 15, 8, 3); R(c, PALE2, 14, 13, 4, 2); R(c, PALE2, 13, 18, 2, 1); R(c, PALE2, 17, 18, 2, 1); }
  else if (i === 1) { R(c, PALE2, 15, 12, 2, 5); R(c, PALE2, 13, 16, 6, 1); R(c, PALE2, 14, 17, 4, 1); R(c, PALE2, 15, 18, 2, 1); R(c, PALE2, 12, 19, 8, 1); }
  else { R(c, PALE2, 15, 16, 2, 5); R(c, PALE2, 16, 14, 1, 2); R(c, X.eye, 13, 12); R(c, X.eye, 18, 12); R(c, X.eye, 14, 13, 4, 1); R(c, X.eye, 13, 14); R(c, X.eye, 18, 14); }
  return c;
}

const DRAW = { archer, wisp, crawler, shade, husk, hexer };
export const MOB_STATES = { archer: { idle: 2, draw: 3, shoot: 1 }, wisp: { float: 4, burst: 3, scared: 2 }, crawler: { crawl: 4, trail: 3 },
  shade: { shadow: 3, lit: 3, strike: 2 }, husk: { idle: 2, walk: 4, cleave_wind: 2, cleave: 1, charge: 2 },
  hexer: { idle: 2, cast_smother: 3, cast_heavy: 3, cast_snuff: 3, blink: 3, die: 3, bolt: 3, icons: 3 } };
// Anchor inside the cell: feet-centre for walkers, centre for the floating wisp.
export const ANCHOR = { archer: [16, 31], wisp: [16, 15], crawler: [16, 31], shade: [16, 31], husk: [16, 31], hexer: [16, 31] };
const BODY = { archer: [M.archer.body, M.archer.lift], wisp: [M.wisp.body, M.wisp.lift], crawler: [M.crawler.body, M.crawler.lift],
  shade: [M.shade.body, M.shade.lift, M.shade.litBody, LITLIFT], husk: [M.husk.body, M.husk.lift], hexer: [M.hexer.body, M.hexer.lift] };
// mob, state, frame index, { flash } -> Uint32Array(32*32) packed RGBA. flash: body tones -> #ffe0c4 for the hit frame.
export function frame(mob, st, i = 0, o = {}) {
  const c = DRAW[mob](st, i);
  if (o.flash) { const set = new Set(BODY[mob].map(px)), h = px(FLASH); for (let k = 0; k < c.length; k++) if (set.has(c[k])) c[k] = h; }
  return c;
}
// One mob's sheet: one row per state, 32px cells, left-aligned.
export function buildSheet(mob, o = {}) {
  const rows = Object.entries(MOB_STATES[mob]), w = N * 4, h = N * rows.length, out = new Uint32Array(w * h);
  rows.forEach(([st, n], r) => { for (let i = 0; i < n; i++) { const f = frame(mob, st, i, o); for (let y = 0; y < N; y++) out.set(f.subarray(y * N, y * N + N), (r * N + y) * w + i * N); } });
  return { w, h, data: out };
}
export function buildAll(o = {}) {
  const parts = Object.keys(MOB_STATES).map(m => buildSheet(m, o)), w = parts[0].w, h = parts.reduce((s, p) => s + p.h, 0), out = new Uint32Array(w * h); let y = 0;
  for (const p of parts) { out.set(p.data, y * w); y += p.h; } return { w, h, data: out };
}

// ---- browser helpers
const toCanvas = (u32, w = N, h = N) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(u32.buffer, u32.byteOffset, u32.byteLength), w, h), 0, 0); return cv; };
export const sheetCanvas = (mob, o) => { const s = mob ? buildSheet(mob, o) : buildAll(o); return toCanvas(s.data, s.w, s.h); };
const iconCache = {};
// A 12x12 debuff badge from the hexer's icons row, blitted cleanly at any scale.
export function drawBadge(ctx, i, x, y, s = 1) {
  iconCache[i] ??= toCanvas(frame('hexer', 'icons', i));
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(iconCache[i], 10, 10, 12, 12, x, y, 12 * s, 12 * s);
  ctx.restore();
}
const cache = {};
// Draw at 2x; (cx, cy) is the anchor from ANCHOR (feet for walkers, centre for the wisp). face = -1 mirrors.
export function drawMob(ctx, mob, st, i, cx, cy, face = 1, o = {}) {
  const [ax, ay] = ANCHOR[mob], k = `${mob}${st}${i}${o.flash ? 'f' : ''}`;
  cache[k] ??= toCanvas(frame(mob, st, i, o));
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(cx, cy); ctx.scale(face, 1);
  ctx.drawImage(cache[k], -ax * 2, -ay * 2, N * 2, N * 2); ctx.restore();
}
