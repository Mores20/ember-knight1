// The Ash King (final boss): procedural 64x64 sprite sheet, same pipeline as ashwarden.js.
// Tall, gaunt and regal: a bone-ash crown, hollow ember eyes, a long ash beard, a tattered violet mantle and
// robe, and the swallowed flame guttering inside a rib-cage window in his chest. He wields a caged-ember
// sceptre. Flat look by default (no contour rings; value steps + edge lights separate the shapes).
// Faces right. Pure pixel buffers (runs in Node too); canvas helpers at the bottom.
const CELL = 64, GY = 62;
const C = { out: '#05070f', em: '#ff8a3d', hot: '#ffd08a', warn: '#ff4d1c', hole: '#0b0a14', ash: '#8f9bb8', ashL: '#cfd8ee', ashD: '#5a6585', flash: '#ffe0c4' };
const H = {}; const px = h => H[h] ??= (() => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; })();
const newCell = () => new Uint32Array(CELL * CELL);
const put = (c, x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < CELL && y < CELL) c[y * CELL + x] = px(col); };
let OUTLINE = false;
function fillPoly(pts, m) {
  for (let y = 0; y < CELL; y++) {
    const yc = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - .5)); x < Math.min(CELL, Math.ceil(xs[k + 1] - .5)); x++) m[y * CELL + x] = 1;
  }
}
// fill + (optional 2px hard outline) + 3 shades from mask edges: mat = [fill, edge-lit (top/left), shade (bottom/right)]
function shape(c, polys, mat, outline = OUTLINE) {
  const m = new Uint8Array(CELL * CELL); for (const q of polys) fillPoly(q, m);
  if (outline) for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if (m[y * CELL + x])
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (dx * dx === 4 && dy * dy === 4) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < CELL && Y < CELL && !m[Y * CELL + X]) c[Y * CELL + X] = px(C.out); }
  for (let i = 0; i < m.length; i++) if (m[i]) c[i] = px(!m[i - 1] || !m[i - CELL] ? mat[1] : !m[i + 1] || !m[i + CELL] ? mat[2] : mat[0]);
}
function dpoly(c, polys, col) { const m = new Uint8Array(CELL * CELL); for (const q of polys) fillPoly(q, m); for (let i = 0; i < m.length; i++) if (m[i]) c[i] = px(col); }
function line(c, a, b, col) {
  let [x0, y0] = a.map(Math.round); const [x1, y1] = b.map(Math.round), dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { put(c, x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
const limb = (a, b, w) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2; return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]; };
const ell = (x, y, rx, ry, n = 12) => Array.from({ length: n }, (_, i) => [x + Math.cos(i / n * 6.283) * rx, y + Math.sin(i / n * 6.283) * ry]);
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const rotp = (pts, a, ox, oy) => pts.map(([x, y]) => { const dx = x - ox, dy = y - oy; return [ox + dx * Math.cos(a) - dy * Math.sin(a), oy + dx * Math.sin(a) + dy * Math.cos(a)]; });
const place = (pts, x, y, a) => rotp(pts, a, 0, 0).map(([u, v]) => [u + x, v + y]);

const SHAFT = [[-10, -1.2], [16, -1.2], [16, 1.2], [-10, 1.2]];
const PRONGS = [[[17, -3], [19, -8], [22, -4]], [[17, 3], [19, 8], [22, 4]], [[24, -2], [28, 0], [24, 2]]];
const HEAD = [[-4, -7], [4, -7], [5, -2], [3, 6], [-3, 6], [-5, -1]];
const CROWN = [[-5, -5], [-5, -8], [-4, -12], [-2, -8], [0, -13], [2, -8], [4, -12], [5, -8], [5, -5]];
const BEARD = [[-3, 5], [4, 5], [3, 10], [1, 16], [-1, 11], [-3, 14]];
const mats = ph => ({
  robe: ph === 3 ? ['#1a1230', '#3a2d66', '#0e0a1c'] : ['#2a1f45', '#4a3a7a', '#1a1230'],
  skirt: ph === 3 ? ['#241a42', '#4a3a7a', '#150e2a'] : ['#33265a', '#5a49a0', '#231942'],
  plate: ph === 2 ? ['#2f3750', C.em, '#232a3f'] : ph === 3 ? ['#232a3f', '#5a6585', '#1a2033'] : ['#2f3750', '#8f9bb8', '#232a3f'],
  plateD: ph === 2 ? ['#232a3f', C.em, '#1a2033'] : ['#232a3f', '#3a4262', '#1a2033'],
  bone: ['#cfd8ee', '#e4ecff', '#8f9bb8'], ash: [C.ash, C.ashL, C.ashD], face: ['#1a1626', '#3a3358', '#0b0a14'], shaft: [C.ashD, C.ashL, '#3a4262'] });

const D = { hip: [0, -22], sh: [3, -37], head: [2, -7], ha: 0, hand: [14, -22], ang: -1.57, sc: null, scFree: 0, fh: null, two: 0,
  fl: 1, sway: 0, drag: 0, cape: [3, 0], lf: [4, 0], lb: [-4, 0], eyes: 0, dis: 0, rot: null, ox: 0, pile: 0, ember: 1 };

function king(P, ph) {
  const p = { ...D, ...P }, c = newCell(), [hx, hy] = p.hip, [sx, sy] = p.sh, M = mats(ph);
  const tr = ([x, y], r = p.rot) => { if (r) { const [a, rx, ry, ox = 0] = r, dx = x - rx, dy = y - ry; x = rx + dx * Math.cos(a) - dy * Math.sin(a) + ox; y = ry + dx * Math.sin(a) + dy * Math.cos(a); } return [32 + x + p.ox, GY + y]; };
  const S = polys => polys.map(q => q.map(pt => tr(pt)));
  if (p.pile) {                                                                   // final frame: a mound of ash, the crown, one last ember
    shape(c, S([[[-13, 0], [-10, -4], [-4, -7], [2, -8], [7, -5], [12, -1], [14, 0]]]), M.ash);
    for (let y = 40; y < CELL; y++) for (let x = 0; x < CELL; x++) if ((x + y) % 3 === 0 && c[y * CELL + x] && y < 56) c[y * CELL + x] = px(C.ashD);
    shape(c, S([CROWN.map(([x, y]) => [x + 3, y - 7])]), M.bone); put(c, ...tr([3, -9]), C.em); put(c, ...tr([-2, -4]), C.hot);
    return c;
  }
  const hot = ph === 3 || p.eyes ? C.hot : C.em;
  // mantle (behind everything) + ruff collar
  const [cs, cf] = p.cape;
  shape(c, S([[[sx - 5, sy - 2], [sx + 1, sy + 3], [hx + 2, hy + 6], [hx - 4 - cs * .3, -3 - cf], [hx - 7 - cs * .5, -1 - cf], [hx - 11 - cs * .6, -5 - cf], [hx - 15 - cs * .8, -2 - cf], [hx - 19 - cs, -8 - cf], [sx - 12 - cs * .8, sy + 7]]]), M.robe);
  shape(c, S([[[sx - 8, sy + 2], [sx - 11, sy - 7], [sx - 6, sy - 3], [sx - 6, sy - 12], [sx - 2, sy - 4], [sx + 1, sy - 9], [sx + 3, sy - 2], [sx + 2, sy + 3]]]), M.robe);
  if (ph === 2) for (const q of [[hx - 11 - cs * .6, -5 - cf], [hx - 15 - cs * .8, -2 - cf], [hx - 7 - cs * .5, -1 - cf]]) { const t = tr(q); put(c, t[0] + 1, t[1] - 1, C.em); put(c, t[0] - 2, t[1] - 2, C.hot); }
  // robe skirt with a ragged hem, boots peeking out
  const sw = p.sway, dr = p.drag;
  shape(c, S([[[hx - 6, hy], [hx + 7, hy], [hx + 11, hy + 9], [hx + 12 + sw - dr * .2, -4], [hx + 9 + sw - dr * .3, -2], [hx + 5 + sw - dr * .4, -5], [hx + 1 - dr * .5, -2], [hx - 3 - dr * .6, -5], [hx - 7 - dr * .7, -2], [hx - 11 - dr * .8, -4], [hx - 9, hy + 9]]]), M.skirt);
  for (const f of [p.lb, p.lf]) shape(c, S([rect(f[0] - 3, f[1] - 4, 9, 4)]), M.plateD);
  // gaunt torso with the rib-cage window and the swallowed flame
  shape(c, S([[[hx - 5, hy + 2], [sx - 6, sy + 3], [sx - 4, sy - 2], [sx + 6, sy - 2], [sx + 8, sy + 5], [hx + 5, hy + 2]]]), M.plate);
  const cx = hx + (sx - hx) * .42 + 2.5, cy = hy + (sy - hy) * .42; dpoly(c, S([rect(cx - 3.5, cy - 5, 7, 10)]), C.hole);
  const f = p.fl * (ph === 3 ? .3 : 1);
  if (f > .05) { dpoly(c, S([[[cx - 2.5, cy + 4.5], [cx - 1.5, cy + 4.5 - 3 * f], [cx, cy + 4.5 - 7 * f], [cx + 1.5, cy + 4.5 - 3.5 * f], [cx + 2.5, cy + 4.5]]]), C.em);
    dpoly(c, S([[[cx - 1, cy + 4.5], [cx, cy + 4.5 - 3.5 * f], [cx + 1, cy + 4.5]]]), C.hot); } else put(c, ...tr([cx, cy + 4]), C.ashD);
  for (const bx of [-2, 0.5, 3]) line(c, tr([cx + bx - .5, cy - 5]), tr([cx + bx - .5, cy + 5]), C.ash);
  if (ph === 2) { line(c, tr([hx + 4, hy - 2]), tr([hx + 6, hy - 8]), C.em); line(c, tr([hx - 3, hy - 3]), tr([hx - 4, hy - 8]), C.em); }
  // arms
  const G = p.sc || [p.hand[0], p.hand[1], p.ang], SA = polys => polys.map(q => q.map(pt => tr(pt, p.scFree ? null : p.rot)));
  const hand2 = [p.hand[0] - 7 * Math.cos(G[2]), p.hand[1] - 7 * Math.sin(G[2])];
  const arm = (from, to, dir) => { const el = [(from[0] + to[0]) / 2 - 1.5 * dir, (from[1] + to[1]) / 2 + 4]; shape(c, S([limb(from, el, 4), limb(el, to, 3.6)]), M.plateD); shape(c, S([ell(to[0], to[1], 2.8, 2.8, 8)]), M.ash); };
  arm([sx - 3, sy + 3], p.two ? hand2 : p.fh || [sx - 5, sy + 19], 1);
  shape(c, S([[[sx - 6, sy + 2], [sx - 4, sy - 4], [sx - 1, sy], [sx + 1, sy + 6], [sx - 3, sy + 7]]]), M.plateD);   // far pauldron
  // head: beard, hollow face, ember eyes, ash crown
  const hc = [sx + p.head[0], sy + p.head[1]], HR = q => S([rotp(q, p.ha, 0, 0).map(([x, y]) => [x + hc[0], y + hc[1]])]);
  shape(c, HR(BEARD), M.ash); shape(c, HR(HEAD), M.face);
  dpoly(c, HR(rect(-1, -3, 1.8, 3.4)), hot); dpoly(c, HR(rect(2.5, -3, 1.8, 3.4)), hot);
  shape(c, HR(CROWN), M.bone); dpoly(c, HR(rect(-.8, -8.5, 1.8, 1.8)), ph >= 2 ? C.hot : C.em);
  if (ph === 2) { const t = HR([[1, -8], [2, -11], [1, -13]])[0]; line(c, t[0], t[1], C.em); line(c, t[1], t[2], C.em); }
  // near arm + sceptre
  arm([sx + 3, sy + 3], p.hand, -1);
  shape(c, SA([place(SHAFT, G[0], G[1], G[2])]), M.shaft);
  shape(c, SA(PRONGS.map(q => place(q, G[0], G[1], G[2]))), M.bone);
  shape(c, SA([place(ell(20, 0, 4.2, 4.2, 10), G[0], G[1], G[2])]), M.plateD);
  const oc = ph === 3 ? C.ashD : C.em; dpoly(c, SA([place(ell(20, 0, 2.4, 2.4, 8), G[0], G[1], G[2])]), oc); if (ph !== 3) dpoly(c, SA([place(ell(20, 0, 1.1, 1.1, 6), G[0], G[1], G[2])]), C.hot);
  shape(c, S([[[sx - 5, sy + 3], [sx - 3, sy - 5], [sx + 1, sy - 1], [sx + 4, sy - 8], [sx + 7, sy - 1], [sx + 11, sy + 2], [sx + 8, sy + 8], [sx - 1, sy + 8]]]), M.plate);   // spiked near pauldron
  if (ph === 2) line(c, tr([sx + 1, sy + 1]), tr([sx + 6, sy + 4]), C.em);
  if (p.dis) for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if ((((x * 73856093) ^ (y * 19349663)) >>> 0 & 255) / 255 < p.dis) c[y * CELL + x] = 0;
  if (ph === 3) rim(c);
  return c;
}
// Phase 3 (the dark phase): 1px pale rim-light so he still reads when the room goes black.
function rim(c) {
  const z = (x, y) => x < 0 || y < 0 ? 0 : c[y * CELL + x], E = [px(C.em), px(C.hot)], add = [];
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) { const v = c[y * CELL + x]; if (v && !E.includes(v) && (!z(x - 1, y) || !z(x, y - 1))) add.push(y * CELL + x); }
  for (const i of add) c[i] = px(C.ashL);
}

// ---------------------------------------------------------------- poses (feet at y=0, +x forward)
const idle = i => ({ sh: [3, -37 + i * .6], fl: 1 + i * .15 });
const POSES = {
  idle: [idle(0), idle(1)],
  walk: [0, 1, 2, 3].map(i => { const a = i / 4 * 6.283, s = Math.sin(a) * 3; return { hip: [0, -22 + (i & 1) * .6], lf: [4 + s, -Math.max(0, Math.cos(a)) * 2], lb: [-4 - s, -Math.max(0, -Math.cos(a)) * 2], sway: s * .5, drag: 4, cape: [6, 0] }; }),
  cleave_wind: [0, 1, 2].map(i => ({ hip: [-1, -22], sh: [1 - i * 2, -37], ha: -.1 - i * .1, hand: [[4, -38], [3, -39], [2, -40]][i], ang: [-2.2, -2.4, -2.6][i], two: 1, cape: [4 + i, i * 2] })),
  cleave_slam: [{ hip: [3, -18], sh: [10, -30], head: [3, -6], ha: .3, hand: [14, -30], ang: 1.0, two: 1, lf: [9, 0], lb: [-5, 0], sway: 3, cape: [3, 0] },
                { hip: [5, -16], sh: [13, -27], head: [3, -5], ha: .45, hand: [15, -28], ang: 1.25, two: 1, lf: [11, 0], lb: [-4, 0], sway: 4, cape: [2, 0] }],
  volley_wind: [[14, -45], [15, -49], [16, -53]].map((fh, i) => ({ fh, cape: [4, i * 2] })),
  volley_throw: [{ hip: [2, -22], sh: [7, -36], ha: .1, fh: [24, -37], cape: [12, 5], sway: 3 }],
  charge_wind: [{ hip: [-2, -17], sh: [9, -30], head: [4, -4], ha: .35, lf: [8, 0], lb: [-7, 0], hand: [4, -18], ang: 3.05, cape: [8, 0], drag: 4, ox: -2 },
                { hip: [-3, -15], sh: [11, -27], head: [4, -4], ha: .5, lf: [9, 0], lb: [-8, 0], hand: [3, -16], ang: 3.05, cape: [9, 0], drag: 5, ox: -2 }],
  charge: [{ lf: [10, -3], lb: [-12, 0] }, { lf: [4, -4], lb: [-7, -2] }, { lf: [11, 0], lb: [-11, -5] }]
    .map(l => ({ hip: [-3, -18], sh: [9, -30], head: [5, -4], ha: .6, ...l, hand: [6, -20], ang: 3.0, cape: [16, 0], drag: 12, sway: 8, ox: -1, eyes: 1 })),
  rest: [0, 1].map(i => ({ hip: [-1, -21], sh: [8, -33 + i], head: [3, -5], ha: .4 - i * .05, hand: [13, -33], ang: 1.5, two: 1, fl: .7, cape: [3, 0], sway: 2 })),
  stun: [{ hip: [0, -16], sh: [3, -29], head: [3, -6], ha: .7, hand: [5, -14], sc: [6, -19, .9], fl: .6, cape: [3, 0], lf: [6, 0], lb: [-6, 0] },
         { hip: [0, -13], sh: [3, -26], head: [3, -5], ha: -.35, hand: [5, -12], sc: [4, -12, .5], fl: .5, cape: [3, 0], lf: [7, 0], lb: [-7, 0] }],
  rage: [{ hip: [-2, -18], sh: [4, -30], head: [3, -4], ha: .7, hand: [8, -46], fh: [-1, -46], sc: [8, -3, .05], fl: 1, cape: [6, 3] },
         { hip: [0, -22], sh: [3, -36], ha: -.4, fl: 1.7, eyes: 1, cape: [5, 2] },
         { hand: [16, -30], ang: -1.2, fh: [-14, -33], fl: 1.7, eyes: 1, cape: [20, 8] }],
  snuff: [{ sh: [3, -36], head: [3, -5], ha: .5, hand: [6, -31], fh: [1, -31], sc: [16, -30, 1.5], fl: 1 },
          { sh: [3, -36], head: [3, -5], ha: .6, hand: [6, -30], fh: [1, -30], sc: [16, -30, 1.5], fl: .5 },
          { sh: [3, -35], head: [3, -4], ha: .7, hand: [6, -30], fh: [1, -30], sc: [16, -30, 1.5], fl: .15 },
          { sh: [3, -37], ha: -.3, hand: [17, -34], fh: [-13, -34], sc: [20, -30, 1.5], fl: 0, eyes: 1, cape: [14, 6] }],
  dead: [{ hip: [-3, -22], sh: [-2, -36], head: [1, -7], ha: -.4, hand: [6, -26], sc: [8, -16, .9], fl: .8, cape: [8, 2], lf: [3, -3], lb: [-6, 0] },
         { hip: [-4, -13], sh: [-2, -27], head: [2, -5], ha: .5, hand: [3, -14], sc: [-2, -3, .05], fl: .5, cape: [4, 0], lf: [-2, 0], lb: [-10, 0] },
         { hip: [-4, -13], sh: [-2, -26], head: [2, -4], ha: .6, hand: [3, -13], sc: [-2, -3, .05], fl: .3, cape: [4, 0], lf: [-2, 0], lb: [-10, 0], dis: .3 },
         { hip: [-4, -12], sh: [-2, -24], head: [2, -3], ha: .7, hand: [3, -12], sc: [-2, -3, .05], fl: .1, cape: [4, 0], lf: [-2, 0], lb: [-10, 0], dis: .65 },
         { pile: 1 }],
};
// FX: the freed flame (2 frames) and 3px ember motes (2 frames), separate so the engine can animate them.
const fx = i => { const c = newCell(); if (i < 2) { const h = 13 + i * 2; dpoly(c, [[[26, 44], [28, 44 - h * .5], [31, 44 - h], [34, 44 - h * .55], [36, 44]]], C.em); dpoly(c, [[[29, 44], [31, 44 - h * .55], [33, 44]]], C.hot); }
  else { put(c, 32, 32, C.hot); for (const [x, y] of i === 3 ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(c, 32 + x, 32 + y, C.em); } return c; };

export const ROWS = [...Object.keys(POSES), 'fx'];
export const COUNTS = { ...Object.fromEntries(Object.entries(POSES).map(([k, v]) => [k, v.length])), fx: 4 };
// state, frame, { phase: 1|2|3, flash, outline } -> Uint32Array(64*64)
export function frame(state, i = 0, o = {}) {
  OUTLINE = !!o.outline;
  const c = state === 'fx' ? fx(i) : king(POSES[state][i % POSES[state].length], o.phase || 1);
  if (o.flash && state !== 'fx') { const keep = new Set([C.em, C.hot, C.warn].map(px)), h = px(C.flash); for (let k = 0; k < c.length; k++) if (c[k] && !keep.has(c[k])) c[k] = h; }
  return c;
}
export function buildSheet(o = {}) {
  const w = CELL * 5, h = CELL * ROWS.length, out = new Uint32Array(w * h);
  ROWS.forEach((s, r) => { for (let i = 0; i < COUNTS[s]; i++) { const f = frame(s, i, o); for (let y = 0; y < CELL; y++) out.set(f.subarray(y * CELL, y * CELL + CELL), (r * CELL + y) * w + i * CELL); } });
  return { w, h, data: out };
}
const toCanvas = (u32, w = CELL, h = CELL) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(u32.buffer, u32.byteOffset, u32.byteLength), w, h), 0, 0); return cv; };
export const sheetCanvas = o => { const s = buildSheet(o); return toCanvas(s.data, s.w, s.h); };
const cache = {};
// scale = 2 by default; the Ash King is drawn at 3 (a giant, and 3 keeps the pixel grid crisp).
export function drawKing(ctx, state, i, cx, fy, face = 1, o = {}) {
  const sc = o.scale || 2, k = `${state}${i}${o.phase || 1}${o.flash ? 'f' : ''}${o.outline ? 'o' : ''}`;
  cache[k] ??= toCanvas(frame(state, i, o));
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, fy - (CELL - 2) * sc); ctx.scale(face, 1);
  ctx.drawImage(cache[k], -CELL * sc / 2, 0, CELL * sc, CELL * sc);
  ctx.restore();
}
