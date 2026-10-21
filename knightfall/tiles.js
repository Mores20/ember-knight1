// World art: platform tiles, torches, coins, hearts and spike rows - all pixel sprites
// generated once and cached as canvases (1 art px = 2 screen px, same as the characters).
import { kit } from './pixel.js';
import { THEMES, FLAME, POP } from './themes.js';
// colours derived from a phase theme (only the new phases V-VIII use these)
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const h2 = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => h2(hx(a).map((v, i) => v + (hx(b)[i] - v) * k));
const fromTheme = t => ({ cap: t.stoneLit, hi: mix(t.stone, '#ffffff', .16), base: t.stone, lo: mix(t.stone, '#05070f', .55), seam: mix(t.stone, '#05070f', .36), speck: mix(t.accent, t.stone, .45) });

const STYLES = {
  road: { cap: '#dfe8ff', hi: '#3a4262', base: '#232a3f', lo: '#1a2033', seam: '#171d2e', speck: '#3f4a6b' },
  crypt: { cap: '#a9c2b0', hi: '#33443b', base: '#1e2a2b', lo: '#0f1718', seam: '#141e1e', speck: '#2f4a3f' },
  tower: { cap: '#e8cdb0', hi: '#4a3b33', base: '#3a2f2a', lo: '#241c18', seam: '#1d1714', speck: '#6b4a2a' },
  throne: { cap: '#e6ecff', hi: '#4a5068', base: '#3a3f52', lo: '#252a3a', seam: '#202437', speck: '#8a5a2e' },
};
STYLES.ash = fromTheme(THEMES[4]);
STYLES.forge = fromTheme(THEMES[5]);
STYLES.archive = fromTheme(THEMES[6]);
STYLES.heart = fromTheme(THEMES[7]);
export const SWATCH = Object.fromEntries(Object.entries(STYLES).map(([k, v]) => [k, v.cap]));
const rnd = (x, y) => { let n = (x * 374761393 + y * 668265263) >>> 0; n = (n ^ (n >> 13)) * 1274126177 >>> 0; return (n >>> 8) % 100; };
const cv2 = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ---------------- platforms ---------------- */
const solCache = new Map();
function makeSolid(w, h, style, broken) {
  const st = STYLES[style] || STYLES.road;
  const aw = Math.max(4, Math.round(w / 2)), ah = Math.max(3, Math.round(h / 2));
  const extra = broken ? 10 : 0;
  const cv = cv2(aw, ah + extra), g = cv.getContext('2d');
  const P = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

  for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) P(x, y, st.base);
  for (let y = 3; y < ah - 1; y++) {                                   // brick courses, staggered
    if ((y - 3) % 8 === 0) { for (let x = 0; x < aw; x++) P(x, y, st.seam); continue; }
    const off = ((y - 3) >> 3) % 2 ? 5 : 0;
    for (let x = off; x < aw; x += 10) P(x, y, st.seam);
  }
  for (let y = 3; y < ah - 2; y++) for (let x = 1; x < aw - 1; x++) if (rnd(x, y) < 4) P(x, y, st.speck);
  for (let y = 0; y < ah; y++) { P(0, y, st.hi); P(aw - 1, y, st.lo); } // side edges
  for (let x = 0; x < aw; x++) { P(x, ah - 1, st.lo); P(x, 2, st.seam); } // under-lip + shade
  for (let x = 0; x < aw; x++) { P(x, 0, st.cap); P(x, 1, st.hi); }    // pale standing cap

  if (broken) {                                                         // jagged underside
    for (let x = 0; x < aw; x++) {
      const d = 2 + rnd(x, 11) % 7;
      for (let k = 0; k < d; k++) P(x, ah + k, k === d - 1 ? st.lo : st.base);
    }
  }
  return cv;
}
export function drawSolid(ctx, s, style, broken) {
  const key = `${style}|${s.w}|${s.h}|${broken ? 1 : 0}`;
  let cv = solCache.get(key);
  if (!cv) { cv = makeSolid(s.w, s.h, style, broken); solCache.set(key, cv); }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, s.x, s.y, cv.width * 2, cv.height * 2);
}

/* ---------------- torch ---------------- */
const T = kit(14, 32);
const torchCache = {};
function torchFrame(lit, i) {
  const c = T.newCell();
  T.shape(c, [T.rect(6, 11, 3, 20)], ['#5b3d22', '#7b5530', '#3d2916']);   // pole
  T.shape(c, [T.rect(4, 7, 7, 4)], ['#232a3f', '#8f9bb8', '#141a2b']);    // bowl
  if (!lit) { T.shape(c, [[[6, 2], [9, 7], [6, 8], [3, 7]]], ['#3a4257', '#5a6585', '#232a3f']); return c; }
  const hh = [5, 6, 4][i];
  T.shape(c, [[[7, 7 - hh], [9.5, 7], [4.5, 7]], [[4, 5], [10, 5], [10.5, 8], [3.5, 8]]],
    [FLAME.mid, FLAME.core, FLAME.edge]);
  T.dpoly(c, [T.ell(7, 4, 1.8, 2.4, 6)], FLAME.core);                      // hot core
  return c;
}
const torchCv = (lit, i) => {
  const d = torchFrame(lit, i), cv = cv2(14, 32);
  cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.buffer, 0, d.byteLength), 14, 32), 0, 0);
  return cv;
};
export function drawTorch(ctx, x, y, lit, t) {
  const i = lit ? Math.floor(t * 9) % 3 : 0, k = `${lit ? 1 : 0}|${i}`;
  torchCache[k] ??= torchCv(!!lit, i);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(torchCache[k], x - 14, y - 64, 28, 64);
}

/* ---------------- coin + heart ---------------- */
const CO = kit(10, 10), coinCache = {};
function coinFrame(i) {
  const c = CO.newCell(), w = [8, 5, 3][i];
  CO.shape(c, [CO.ell(5, 5, w / 2, 4.2, 12)], [POP.coin, mix(POP.coin, '#ffffff', .5), mix(POP.coin, '#05070f', .42)], false);   // no outline: it is tiny and bright
  return c;
}
export function drawCoin(ctx, x, y, t) {
  const i = Math.floor(t * 3.2) % 3;
  coinCache[i] ??= (() => {
    const d = coinFrame(i), cv = cv2(10, 10);
    cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.buffer, 0, d.byteLength), 10, 10), 0, 0);
    return cv;
  })();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(coinCache[i], x - 10, y - 10, 20, 20);
}

const HE = kit(14, 12), heartCache = {};
export function drawHeartPickup(ctx, x, y, s = 24) {
  heartCache.px ??= (() => {
    const c = HE.newCell();
    HE.shape(c, [[[7, 11], [2, 6], [2, 3], [4, 1], [6, 2], [7, 4], [8, 2], [10, 1], [12, 3], [12, 6]]],
      [POP.heart, mix(POP.heart, '#ffffff', .45), mix(POP.heart, '#05070f', .38)], false);
    const cv = cv2(14, 12);
    cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(c.buffer, 0, c.byteLength), 14, 12), 0, 0);
    return cv;
  })();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(heartCache.px, x - s * .58, y - s * .5, s * 1.16, s);
}

/* ---------------- spikes ---------------- */
const spikeCache = new Map();
function makeSpikes(w, h) {
  const aw = Math.max(4, Math.round(w / 2)), ah = Math.max(4, Math.round(h / 2));
  const n = Math.max(1, Math.round(w / 14)), sw = aw / n;
  const cv = cv2(aw, ah), g = cv.getContext('2d');
  const P = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  for (let x = 0; x < aw; x++) {
    const f = (x % sw) / sw, e = Math.abs(f * 2 - 1);
    const hh = Math.max(1, Math.round((1 - e) * (ah - 1)));
    for (let y = ah - 1 - hh; y < ah; y++) P(x, y, y === ah - 1 ? '#7a1e08' : f < .35 ? '#ffb066' : '#ff4d1c');
  }
  return cv;
}
export function drawSpikes(ctx, hz) {
  const key = `${hz.w}x${hz.h}`;
  let cv = spikeCache.get(key);
  if (!cv) { cv = makeSpikes(hz.w, hz.h); spikeCache.set(key, cv); }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, hz.x, hz.y, cv.width * 2, cv.height * 2);
}
