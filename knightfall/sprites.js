// Procedural 8-bit knight: every frame is built pixel by pixel on a 32x32 canvas,
// cached, then drawn at 2x with smoothing off so the pixels stay crisp.
import { POP, TRAIL } from './themes.js';
const N = 32, SC = 2, OX = 4, OY = 9;
const K = { o: '#05070f', a: POP.knight, b: '#a7b7d9', c: '#3e4c6e', m: '#f4f8ff', cape: POP.cape, cape2: '#2748c8', em: TRAIL.mid, eg: TRAIL.core };
const R = (g, c, x, y, w, h) => { g.fillStyle = K[c]; g.fillRect(Math.round(x) + OX, Math.round(y) + OY, w, h); };

// Sword drawn along angle a from the hand (0 = forward, -PI/2 = up). Ember arc trail when swinging.
function sword(g, hx, hy, a, trail) {
  if (trail != null) for (let b = trail; b < a; b += .2) { R(g, 'em', hx + Math.cos(b) * 11, hy + Math.sin(b) * 11, 2, 2); R(g, 'eg', hx + Math.cos(b) * 8, hy + Math.sin(b) * 8, 1, 1); }
  for (let t = 3; t <= 12; t++) R(g, t > 10 ? 'm' : 'a', hx + Math.cos(a) * t, hy + Math.sin(a) * t, 2, 2);
  R(g, 'b', hx + Math.cos(a) * 2 - 1, hy + Math.sin(a) * 2 - 1, 3, 3);
}

function knight(g, o) {
  const { lean: x = 0, bob: y = 0, capeL = 4, la = [0, 0], lb = [0, 0], dash = 0, a = -1.57, trail = null, streak = 0 } = o;
  if (dash) for (let k = 0; k < 4; k++) R(g, k % 2 ? 'eg' : 'em', k, 9 + k * 3, Math.max(2, streak - k * 2), 1);   // speed lines
  const cx = 7 + x - capeL;
  R(g, 'cape', cx, 10 + y, capeL + 2, 9); R(g, 'cape2', cx + 1, 15 + y, capeL, 2); R(g, 'cape', cx + 2, 19 + y, capeL - 1, 1);
  if (dash) { R(g, 'b', 2 + x, 19, 9, 3); R(g, 'c', 1 + x, 20, 3, 2); R(g, 'a', 13 + x, 18, 6, 3); R(g, 'c', 17 + x, 19, 3, 2); }
  else for (const [lx, [dx, l], c] of [[8, la, 'b'], [12, lb, 'a']]) { R(g, c, lx + dx, 17, 3, 6 - l); R(g, 'c', lx + dx, 21 - l, 4, 2); }
  R(g, 'b', 6 + x, 11 + y, 2, 5);                                           // back arm
  R(g, 'a', 7 + x, 9 + y, 9, 9); R(g, 'b', 7 + x, 9 + y, 2, 9); R(g, 'c', 7 + x, 15 + y, 9, 1); R(g, 'b', 8 + x, 9 + y, 7, 1); R(g, 'm', 11 + x, 11 + y, 2, 2);
  R(g, 'a', 8 + x, 2 + y, 8, 8); R(g, 'b', 8 + x, 2 + y, 8, 1); R(g, 'b', 8 + x, 9 + y, 8, 1); R(g, 'o', 11 + x, 5 + y, 5, 2);
  R(g, 'cape', 10 + x, 0 + y, 4, 2); R(g, 'cape', 7 + x, 1 + y, 4, 2);       // plume
  R(g, 'a', 14 + x, 10 + y, 3, 3); R(g, 'a', 15 + x, 12 + y, 3, 2); R(g, 'c', 17 + x, 13 + y, 2, 2);
  sword(g, 18 + x, 13 + y, a, trail);
}

const POSE = {
  idle: i => ({ bob: i >> 1, capeL: 3 + (i & 1) }),
  run: i => { const p = i / 6 * 6.283, s = Math.round(Math.sin(p) * 3); return { lean: 1, bob: i % 3 ? 0 : 1, capeL: 6 + (i & 1), la: [s, Math.cos(p) > .3 ? 3 : 0], lb: [-s, Math.cos(p) < -.3 ? 3 : 0], a: .9 }; },
  air: () => ({ lean: 1, capeL: 6, la: [-2, 0], lb: [2, 3], a: .9 }),
  dash: i => ({ lean: 3, bob: 2, capeL: 8, dash: 1, a: 0, streak: 8 + i * 3 }),
  attack: i => ({ lean: [-1, 1, 2, 1][i], la: [-2, 0], lb: [3, 0], a: [-2.2, -1.2, -.1, .8][i], trail: i ? -2.2 : null }),
};
const FR = { idle: 4, run: 6, air: 1, dash: 3, attack: 4 }, FPS = { idle: 5, run: 11 };
const mk = fn => { const c = document.createElement('canvas'); c.width = c.height = N; fn(c.getContext('2d')); return c; };
const cache = {};
for (const s in FR) cache[s] = Array.from({ length: FR[s] }, (_, i) => mk(g => knight(g, POSE[s](i))));

// s = state, t = seconds (idle/run loop), u = 0..1 progress (attack/dash), cx/fy = feet centre on screen.
export function drawKnight(ctx, s, t, u, cx, fy, face) {
  const n = FR[s], i = (s === 'attack' || s === 'dash') ? Math.min(n - 1, Math.floor(u * n)) : Math.floor(t * (FPS[s] || 1)) % n;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(cx, fy - N * SC); ctx.scale(face, 1);
  ctx.drawImage(cache[s][i], -N * SC / 2, 0, N * SC, N * SC); ctx.restore();
}
// All frames in one PNG-ready canvas: one row per animation.
export function sheet() {
  const c = document.createElement('canvas'), keys = Object.keys(FR);
  c.width = N * Math.max(...Object.values(FR)); c.height = N * keys.length;
  const g = c.getContext('2d'); keys.forEach((s, r) => cache[s].forEach((f, i) => g.drawImage(f, i * N, r * N)));
  return c;
}
