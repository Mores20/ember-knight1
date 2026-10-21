// The Ash Warden: procedural sprite sheet (boss). Same pipeline as the knight:
// authored at 1x with hard pixels (no anti-aliasing, no gradients), drawn at 2x with smoothing off.
// Pure pixel buffers up top (runs in Node too); thin canvas helpers at the bottom.
const CW = 80, CH = 72, GY = 70, CX = 40;   // wide enough for the axe head; rows 70-71 are the soles
const C = { out: '#0e1626', d: '#2b3350', m: '#39425f', p: '#454f70', e: '#8f9bb8', b: '#cfd8ee', dd: '#202844',
  cape: '#2b3b86', cape2: '#1d2863', em: '#ff8a3d', hot: '#ffd08a', face: '#7d88a6', faceL: '#aab4d0', faceD: '#5a6585',
  rim: '#2a3348', haft: '#5b3d22', haftL: '#7b5530', haftD: '#3d2916', blade: '#c9d4f0', bladeL: '#e6ecff', hit: '#ffe0c4' };
import { kit, px, toCanvas } from './pixel.js';
const { newCell, put, fillPoly, shape, dpoly, line, limb, ell, rect, rotp, place } = kit(CW, CH);

const HAFT = [[-8, -1.5], [17, -1.5], [17, 1.5], [-8, 1.5]];
const HEAD = [[15, -2], [16, -10], [22, -14], [27, -13], [25, -6], [23, 0], [25, 6], [27, 13], [22, 14], [16, 10], [15, 2]];
const KITE = [[0, -12], [8, -8], [7, 3], [0, 13], [-7, 3], [-8, -8]];
const HELM = [[-5, -7], [4, -7], [6, -3], [6, 5], [3, 7], [-4, 7], [-6, 4], [-6, -4]];
const HORN_B = [[-3, -7], [-9, -6], [-14, -10], [-14, -17], [-10, -12], [-4, -10]], HORN_F = [[3, -7], [8, -7], [13, -10], [13, -17], [9, -12], [3, -10]];

const D = { hip: [0, -18], sh: [4, -29], head: [4, -8], ha: 0, lf: [7, 0], lb: [-7, 0], hand: [7, -17], ang: 2.85, two: 0, axe: null, axeFree: 0,
  fh: null, shield: [11, -25, .05], sf: 1, cape: [19, 3, 0], seam: 1, rot: null, sparks: null, ox: 0 };

function warden(P, ph2) {
  const p = { ...D, ...P }, c = newCell(), [hx, hy] = p.hip, [sx, sy] = p.sh;
  const tr = ([x, y], r = p.rot) => { if (r) { const [a, rx, ry, ox = 0] = r, dx = x - rx, dy = y - ry; x = rx + dx * Math.cos(a) - dy * Math.sin(a) + ox; y = ry + dx * Math.sin(a) + dy * Math.cos(a); } return [CX + x + p.ox, GY + y]; };
  const S = polys => polys.map(q => q.map(pt => tr(pt)));
  const st = m => ph2 ? [m[0], C.em, m[2]] : m;                       // phase 2: every plate edge glows ember
  const SD = st([C.d, C.p, C.dd]), SM = st([C.m, C.e, C.d]), SP = st([C.p, C.b, C.m]);
  const pt = (t, dx, dy) => [hx + (sx - hx) * t + dx, hy + (sy - hy) * t + dy];
  const seam = pts => { if (p.seam <= 0) return; const hi = p.seam > 1.2;
    for (let i = 0; i < pts.length - 1; i++) { const a = tr(pts[i]), b = tr(pts[i + 1]); line(c, a, b, hi ? C.hot : C.em); line(c, [a[0] + 1, a[1]], [b[0] + 1, b[1]], C.em); } };

  // --- cape (tattered, drags / lifts) ---
  const [cl, cs, cf] = p.cape;
  const hem = [[hx - 4 - cs * .3, hy + cl - 5 - cf], [hx - 7 - cs * .5, hy + cl - cf], [hx - 11 - cs * .6, hy + cl - 6 - cf], [hx - 15 - cs * .8, hy + cl - 1 - cf], [hx - 18 - cs, hy + cl - 9 - cf]];
  shape(c, S([[[sx - 6, sy - 2], [sx - 1, sy + 4], [hx + 1, hy + 8], ...hem, [sx - 14 - cs * .8, sy + 8]]]), [C.cape, C.cape, C.cape2]);
  if (ph2) for (const q of [hem[1], hem[3], hem[4]]) { const t = tr(q); put(c, t[0] + 1, t[1] - 1, C.em); put(c, t[0] - 2, t[1] - 2, C.hot); }

  const leg = (f, kb, mat) => { const k = f.length > 2 ? [f[2], f[3]] : [(hx + f[0]) / 2 + kb, (hy + f[1]) / 2], ft = [f[0], f[1]];
    shape(c, S([limb([hx, hy], k, 7), limb(k, ft, 6), [[ft[0] - 4, ft[1] - 4], [ft[0] + 7, ft[1] - 4], [ft[0] + 8, ft[1]], [ft[0] - 4, ft[1]]]]), mat); return k; };
  leg(p.lb, -1, SD);
  shape(c, S([ell(sx - 5, sy + 3, 6, 5)]), SD);                      // far pauldron

  const hand2 = [p.hand[0] - 7 * Math.cos(p.ang), p.hand[1] - 7 * Math.sin(p.ang)];
  const farT = p.two ? hand2 : p.fh || (p.shield ? [p.shield[0] - 1, p.shield[1]] : null);
  const behind = !p.sf && !p.fh && !p.two;
  const farArm = () => { if (!farT) return; const a = [sx - 3, sy + 3], el = [(a[0] + farT[0]) / 2 - 1, (a[1] + farT[1]) / 2 + 4.5]; shape(c, S([limb(a, el, 5), limb(el, farT, 4.5)]), SD); shape(c, S([ell(farT[0], farT[1], 3, 3, 8)]), SP); };
  const shieldDraw = () => { if (!p.shield) return; const [x, y, a] = p.shield, face = KITE.map(([u, v]) => [u * .62, v * .62 - 1]);
    shape(c, S([place(KITE, x, y, a)]), [C.rim, C.p, C.dd]); shape(c, S([place(face, x, y, a)]), [C.face, C.faceL, C.faceD], false);
    dpoly(c, S([place(ell(0, -2, 2.4, 2.4, 8), x, y, a)]), ph2 ? C.hot : C.em); };
  if (behind) { farArm(); shieldDraw(); } else if (p.shield && !p.sf) shieldDraw();

  // --- torso, legs, tasset ---
  shape(c, S([[[hx - 6, hy + 1], [sx - 8, sy + 3], [sx - 5, sy - 3], [sx + 7, sy - 3], [sx + 10, sy + 6], [hx + 7, hy + 1]]]), st([C.m, C.e, C.d]));
  seam([pt(.15, 3, 0), pt(.35, 1, 0), pt(.5, 5, 0), pt(.8, 3, 0)]); seam([pt(.1, -3, 0), pt(.35, -4, 1)]);
  if (ph2) { seam([pt(.55, -3, 0), pt(.7, 0, 1), pt(.9, -2, 2)]); seam([pt(.3, 6, 0), pt(.45, 8, 1)]); }
  leg(p.lf, 3, SM);
  shape(c, S([[[hx - 7, hy], [hx + 8, hy], [hx + 10, hy + 8], [hx - 9, hy + 9]]]), SD);
  seam([[hx + 1, hy + 2], [hx + 3, hy + 6]]);

  // --- head: horns, great-helm, two ember slits ---
  const hc = [sx + p.head[0], sy + p.head[1]], HR = q => S([rotp(q, p.ha, 0, 0).map(([x, y]) => [x + hc[0], y + hc[1]])]);
  shape(c, HR(HORN_B), SD); shape(c, HR(HORN_F), SM); shape(c, HR(HELM), SM);
  const eye = ph2 ? C.hot : C.em; dpoly(c, HR(rect(-1, -2, 3, 1.8)), eye); dpoly(c, HR(rect(3, -2, 3, 1.8)), eye);
  if (ph2) { const t = HR([[-2, -6], [0, -2], [-1, 1]])[0]; line(c, t[0], t[1], C.em); line(c, t[1], t[2], C.em); }
  if (!behind) farArm();

  // --- near arm, great-axe ---
  const G = p.axe || [p.hand[0], p.hand[1], p.ang], SA = polys => polys.map(q => q.map(pt2 => tr(pt2, p.axeFree ? null : p.rot)));
  const ns = [sx + 3, sy + 3], hd = p.hand, el = [(ns[0] + hd[0]) / 2 - 1, (ns[1] + hd[1]) / 2 + 4.5];
  shape(c, S([limb(ns, el, 5), limb(el, hd, 4.5)]), SM);
  shape(c, S([ell(sx + 2, sy, 9, 5.5)]), SP);                       // near pauldron (broad)
  shape(c, SA([place(HAFT, G[0], G[1], G[2])]), [C.haft, C.haftL, C.haftD]);
  shape(c, S([ell(hd[0], hd[1], 3, 3, 8)]), SP);
  shape(c, SA([place(HEAD, G[0], G[1], G[2])]), [C.blade, C.bladeL, C.e]);
  if (p.shield && p.sf) shieldDraw();                               // raised shield sits in front of the chest
  if (ph2) { const t = tr([sx + 1, sy]), u = tr([sx + 6, sy + 3]); line(c, t, u, C.em); }
  if (p.sparks) for (const [x, y] of p.sparks) { const t = tr([x, y]); put(c, t[0], t[1], C.hot); put(c, t[0] + 1, t[1] + 1, C.em); put(c, t[0] - 1, t[1], C.em); }
  if (ph2) rimLight(c);
  return c;
}
// Phase 2: 1px ember rim along the sprite's own top-left silhouette (there is no contour ring).
function rimLight(c) {
  const z = (x, y) => x < 0 || y < 0 || x >= CW || y >= CH ? 0 : c[y * CW + x], add = [];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (!c[y * CW + x]) continue;
    if (!z(x - 1, y) || !z(x, y - 1)) add.push(y * CW + x);
  }
  for (const i of add) c[i] = px(C.em);
}

// ---------------------------------------------------------------- poses (local coords: feet at 0, +x forward)
const guard = b => ({ sh: [4, -29 - b], shield: [11, -25 - b, .05] });
const T = { cleaveHand: [[4, -33], [2, -35], [0, -37]], cleaveAng: [-2.3, -2.6, -2.85] };
const kneel = { lf: [8, 0, 8, -9], lb: [-12, 0, -4, -1], shield: [-8, -11, .4], sf: 0 };
const POSES = {
  guard: [guard(0), guard(1)],
  open: [{ shield: [-3, -13, .3], sf: 0, hand: [3, -22], ang: -.1, lf: [8, 0], lb: [-6, 0] },
         { hip: [2, -18], sh: [6, -29], shield: [-1, -13, .3], sf: 0, hand: [5, -22], ang: -.1, lf: [10, 0], lb: [-4, 0] }],
  stalk: [0, 1, 2, 3].map(i => { const a = i / 4 * 6.283, s = Math.sin(a) * 5, b = i & 1;
    return { hip: [0, -18 + b], sh: [4, -29 + b], lf: [6 + s, -Math.max(0, Math.cos(a)) * 3], lb: [-6 - s, -Math.max(0, -Math.cos(a)) * 3], shield: [11, -25 + b, .05], cape: [19, 7, 0] }; }),
  cleave_wind: [0, 1, 2].map(i => ({ hip: [-1, -18], sh: [2 - i * 2, -29 + (i > 1 ? 1 : 0)], ha: -.1 - i * .1, lf: [9, 0], lb: [-7, 0], hand: T.cleaveHand[i], ang: T.cleaveAng[i], two: 1, shield: [-9, -22, .3], sf: 0, cape: [20, 5, i * 2] })),
  cleave_slam: [{ hip: [3, -15], sh: [11, -23], head: [3, -6], ha: .25, lf: [10, 0, 13, -8], lb: [-8, 0, -3, -8], hand: [14, -22], ang: 1.0, two: 1, shield: [-4, -18, .3], sf: 0, cape: [18, 4, 3], ox: -5 },
                { hip: [5, -13], sh: [14, -20], head: [3, -5], ha: .4, lf: [11, 0, 14, -7], lb: [-8, 0, -2, -7], hand: [15, -22], ang: 1.25, two: 1, shield: [-3, -16, .3], sf: 0, cape: [16, 3, 0], ox: -5 }],
  volley_wind: [[14, -33], [15, -37], [16, -41]].map((fh, i) => ({ sh: [3, -29], fh, shield: [-9, -22, .3], sf: 0, cape: [19, 3, i * 2] })),
  volley_throw: [{ hip: [2, -18], sh: [7, -28], ha: .1, fh: [23, -29], hand: [6, -17], shield: [-9, -22, .3], sf: 0, cape: [20, 12, 5] }],
  charge_wind: [{ hip: [-2, -13], sh: [9, -23], head: [4, -3], ha: .35, lf: [10, 0, 12, -8], lb: [-8, 0, -8, -5], hand: [4, -15], ang: 3.05, shield: [-9, -10, .4], sf: 0, cape: [14, 8, 0], ox: -2 },
                { hip: [-3, -11], sh: [11, -20], head: [4, -2], ha: .5, lf: [11, 0, 13, -7], lb: [-9, 0, -9, -4], hand: [3, -13], ang: 3.05, shield: [-10, -9, .4], sf: 0, cape: [14, 10, 0], ox: -2 }],
  charge: [{ lf: [10, -4, 9, -12], lb: [-14, 0, -9, -6] }, { lf: [3, -5, 5, -10], lb: [-8, -2, -7, -8] }, { lf: [12, 0, 10, -9], lb: [-12, -6, -8, -10] }]
    .map((l, i) => ({ hip: [-3, -14], sh: [8, -19], head: [5, -3], ha: .6, ...l, hand: [8, -12], ang: 3.0, ox: -1, shield: [-10, -9, .4], sf: 0, cape: [12, 16, 0],
      sparks: [[[-17, 0], [-14, -3], [-20, -4]], [[-16, -1], [-20, 0], [-13, -5]], [[-18, -3], [-21, -1], [-15, 0]]][i] })),
  rest: [0, 1].map(i => ({ hip: [-2, -17], sh: [7, -26 + i], head: [4, -3], ha: .4 - i * .05, lf: [6, 0, 4, -9], lb: [-8, 0, -5, -9], hand: [12, -25], ang: 1.5, two: 1, shield: [-7, -12, .2], sf: 0, cape: [18, 3, 0] })),
  stun: [{ hip: [0, -13], sh: [4, -24], head: [4, -5], ha: .7, lf: [6, 0, 10, -6], lb: [-7, 0, -5, -7], hand: [5, -10], axe: [6, -19, .9], shield: [-6, -12, .5], sf: 0, cape: [17, 3, 0], ox: -2 },
         { hip: [0, -11], sh: [3, -22], head: [4, -3], ha: -.35, lf: [6, 0, 11, -5], lb: [-9, 0, -4, -3], hand: [5, -9], axe: [4, -12, .45], shield: [-6, -10, .5], sf: 0, cape: [15, 3, 0] }],
  enrage: [{ hip: [-4, -11], sh: [3, -22], head: [4, -3], ha: .8, ...kneel, hand: [3, -10], axe: [3, -10, .45], cape: [12, 3, 0] },
           { hip: [-3, -12], sh: [4, -24], head: [4, -5], ha: -.35, ...kneel, hand: [3, -10], axe: [3, -10, .45], seam: 1.8, cape: [13, 3, 3] },
           { head: [3, -8], ha: -.45, hand: [14, -28], ang: -1.0, fh: [-13, -33], shield: [-15, -33, .3], sf: 0, cape: [20, 5, 8], seam: 2, ox: -3 },
           { ...guard(0), seam: 1.8 }],
  dead: [{ hip: [-3, -18], sh: [-2, -29], head: [2, -7], ha: -.4, lf: [4, -3], lb: [-9, 0, -7, -9], hand: [2, -21], axe: [2, -21, 1.5], shield: [-8, -20, .5], sf: 0, seam: .8, cape: [19, 10, 4] },
         { hip: [-4, -11], sh: [-3, -22], head: [2, -4], ha: .6, lf: [-2, 0, 5, -3], lb: [-10, 0, 1, -3], hand: [1, -10], axe: [6, -3, .05], shield: [-9, -11, .5], sf: 0, seam: .6, cape: [10, 6, 0] },
         { hip: [-4, -11], sh: [-3, -22], head: [2, -4], ha: .6, lf: [-2, 0, 5, -3], lb: [-10, 0, 1, -3], hand: [1, -10], axe: [6, -3, .05], axeFree: 1, shield: [-9, -11, .5], sf: 0, seam: .4, cape: [10, 6, 0], rot: [-.8, -6, -1, 3] },
         { hip: [0, -17], sh: [3, -28], lf: [3, 0], lb: [-3, 0], hand: [2, -12], axe: [6, -3, .05], axeFree: 1, shield: [-9, -14, .3], sf: 0, seam: .3, cape: [16, 0, 0], rot: [-1.5, 0, -8, 16] }],
};
// Separate 3px star sparks for the volley: the engine animates / orbits these itself.
const mote = i => { const c = newCell(); put(c, CX, CH >> 1, C.hot); for (const [x, y] of i ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(c, CX + x, (CH >> 1) + y, C.em); return c; };

export const ROWS = [...Object.keys(POSES), 'motes'];
export const COUNTS = Object.fromEntries([...Object.entries(POSES).map(([k, v]) => [k, v.length]), ['motes', 2]]);
const STEEL = [C.d, C.m, C.p, C.e, C.b, C.dd, C.face, C.faceL, C.faceD, C.rim, C.blade, C.bladeL].map(px);
// state, frame index, { phase2, flash } -> Uint32Array(64*64) of packed RGBA (little-endian ABGR)
export function frame(state, i = 0, o = {}) {
  const c = state === 'motes' ? mote(i) : warden(POSES[state][i % POSES[state].length], !!o.phase2);
  if (o.flash) { const h = px(C.hit); for (let k = 0; k < c.length; k++) if (STEEL.includes(c[k])) c[k] = h; }   // "hit": steel -> #ffe0c4
  return c;
}
// Whole sheet: one row per animation, 64px cells, left-aligned.
export function buildSheet(o = {}) {
  const w = CW * 4, h = CH * ROWS.length, out = new Uint32Array(w * h);
  ROWS.forEach((s, r) => { for (let i = 0; i < COUNTS[s]; i++) { const f = frame(s, i, o); for (let y = 0; y < CH; y++) out.set(f.subarray(y * CW, y * CW + CW), (r * CH + y) * w + i * CW); } });
  return { w, h, data: out };
}

// ---------------------------------------------------------------- canvas helpers (browser)
export const sheetCanvas = o => { const s = buildSheet(o); return toCanvas(s.data, s.w, s.h); };
const cache = {};
// Draw one frame at 2x, feet-centre pivot at (cx, fy), facing right (face = -1 mirrors).
export function drawWarden(ctx, state, i, cx, fy, face = 1, o = {}) {
  const k = `${state}${i % COUNTS[state]}${o.phase2 ? 'p' : ''}${o.flash ? 'f' : ''}`; cache[k] ??= toCanvas(frame(state, i, o), CW, CH);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(cx, fy - CH * 2); ctx.scale(face, 1); ctx.drawImage(cache[k], -CW, 0, CW * 2, CH * 2); ctx.restore();
}
// A single star mote centred on (cx, cy) - the embers circling his hand during the volley wind-up.
const moteCache = {};
export function drawMote(ctx, i, cx, cy) {
  const k = i % 2; moteCache[k] ??= toCanvas(frame('motes', k), CW, CH);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(moteCache[k], cx - CW, cy - CH, CW * 2, CH * 2); ctx.restore();
}
