// Shared pixel-art kit: hard-edged polygons, 2px outline, 3-step shading.
// Each module makes its own kit for its cell size:  const K = kit(32, 24);
// Buffers are packed ABGR Uint32 (little-endian -> RGBA for ImageData).
const H = {};
export const px = h => H[h] ??= (() => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; })();

export function kit(CW, CH) {
  const newCell = () => new Uint32Array(CW * CH);
  const put = (c, x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < CW && y < CH) c[y * CW + x] = px(col); };

  function fillPoly(pts, m) {
    for (let y = 0; y < CH; y++) {
      const yc = y + .5, xs = [];
      for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - .5)); x < Math.min(CW, Math.ceil(xs[k + 1] - .5)); x++) m[y * CW + x] = 1;
    }
  }

  // Flat, knight-style edges: no contour ring by default. mat = [fill, edge-lit (top/left), shade (bottom/right)].
  function shape(c, polys, mat, outline = false) {
    const m = new Uint8Array(CW * CH); for (const q of polys) fillPoly(q, m);
    if (outline) for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (m[y * CW + x])
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < CW && Y < CH && !m[Y * CW + X]) c[Y * CW + X] = px('#0e1626'); }
    for (let i = 0; i < m.length; i++) if (m[i]) {
      const L = i % CW === 0 ? 0 : m[i - 1], R = i % CW === CW - 1 ? 0 : m[i + 1];
      c[i] = px(!L || !m[i - CW] ? mat[1] : !R || !m[i + CW] ? mat[2] : mat[0]);
    }
  }

  function dpoly(c, polys, col) { const m = new Uint8Array(CW * CH); for (const q of polys) fillPoly(q, m); for (let i = 0; i < m.length; i++) if (m[i]) c[i] = px(col); }

  function line(c, a, b, col) {
    let [x0, y0] = a.map(Math.round); const [x1, y1] = b.map(Math.round), dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { put(c, x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }

  const limb = (a, b, w) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2; return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]; };
  const ell = (x, y, rx, ry, n = 12) => Array.from({ length: n }, (_, i) => [x + Math.cos(i / n * 6.283) * rx, y + Math.sin(i / n * 6.283) * ry]);
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const rotp = (pts, a, ox, oy) => pts.map(([x, y]) => { const dx = x - ox, dy = y - oy; return [ox + dx * Math.cos(a) - dy * Math.sin(a), oy + dx * Math.sin(a) + dy * Math.cos(a)]; });
  const place = (pts, x, y, a) => rotp(pts, a, 0, 0).map(([u, v]) => [u + x, v + y]);

  return { CW, CH, newCell, put, fillPoly, shape, dpoly, line, limb, ell, rect, rotp, place };
}

export const toCanvas = (u32, w, h) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(u32.buffer, u32.byteOffset, u32.byteLength), w, h), 0, 0);
  return cv;
};
