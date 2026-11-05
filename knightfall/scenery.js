// World scenery: props that tell the kingdom's story, and the veil that hides an alcove until
// the knight is close. Drawn in world space behind the player; none of it collides.
import { THEMES } from './themes.js';

const IDX = { road: 0, crypt: 1, tower: 2, throne: 3, ash: 4, forge: 5, archive: 6, heart: 7 };
const pal = style => THEMES[IDX[style] != null ? IDX[style] : 0];
const r = (ctx, x, y, w, h, col, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; };
const line = (ctx, x0, y0, x1, y1, col, w, a = 1) => {
  ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.globalAlpha = 1;
};

function grave(ctx, p, c) {
  ctx.globalAlpha = .55; ctx.fillStyle = c.stone;
  ctx.beginPath(); ctx.ellipse(p.x + 2, p.y - 4, 26, 7, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  const w = 26, h = 34, x = p.x - w / 2, y = p.y - h - 4;
  ctx.globalAlpha = .8; ctx.fillStyle = c.stone; ctx.fillRect(x, y + 8, w, h - 8);
  ctx.beginPath(); ctx.arc(p.x, y + 8, w / 2, Math.PI, 0); ctx.fill();
  r(ctx, x + 3, y + 12, 2, 18, c.lit, .28);
  line(ctx, p.x - 6, y + 16, p.x + 6, y + 16, c.lit, 1.5, .35);
  line(ctx, p.x, y + 26, p.x + 7, y + 18, c.lit, 1, .22);         // a crack
  ctx.globalAlpha = 1;
}

function statue(ctx, p, c) {
  r(ctx, p.x - 24, p.y - 10, 48, 10, c.stone, .85);
  r(ctx, p.x - 18, p.y - 18, 36, 8, c.stone, .7);
  ctx.globalAlpha = .8; ctx.fillStyle = c.stone;
  ctx.beginPath(); ctx.moveTo(p.x - 15, p.y - 18); ctx.lineTo(p.x - 9, p.y - 66);
  ctx.lineTo(p.x + 9, p.y - 66); ctx.lineTo(p.x + 15, p.y - 18); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x, p.y - 76, 11, 0, 7); ctx.fill();
  r(ctx, p.x - 8, p.y - 70, 16, 6, c.sky, .35);                    // the shadowed face
  line(ctx, p.x - 4, p.y - 76, p.x - 1, p.y - 76, c.lit, 1.5, .35);
  line(ctx, p.x + 1, p.y - 76, p.x + 4, p.y - 76, c.lit, 1.5, .35);
  line(ctx, p.x - 12, p.y - 40, p.x - 15, p.y - 22, c.lit, 1, .2); // a weathered crack
  ctx.globalAlpha = 1;
}

function bones(ctx, p, c) {
  r(ctx, p.x - 20, p.y - 4, 40, 3, c.lit, .35);
  r(ctx, p.x - 14, p.y - 8, 18, 3, c.stoneLit, .45);
  r(ctx, p.x + 4, p.y - 9, 14, 3, c.stoneLit, .4);
  ctx.globalAlpha = .8; ctx.fillStyle = c.stoneLit;
  ctx.beginPath(); ctx.arc(p.x + 2, p.y - 14, 7, 0, 7); ctx.fill();
  r(ctx, p.x - 1, p.y - 15, 2, 2, c.sky, .9);
  r(ctx, p.x + 4, p.y - 15, 2, 2, c.sky, .9);
  ctx.globalAlpha = 1;
}

function cart(ctx, p, c) {
  const x = p.x, y = p.y;
  ctx.globalAlpha = .75; ctx.strokeStyle = c.stone; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 32, y - 30); ctx.lineTo(x + 26, y - 24);
  ctx.lineTo(x + 22, y - 10); ctx.lineTo(x - 30, y - 16); ctx.closePath(); ctx.stroke();
  for (let i = 0; i < 3; i++) line(ctx, x - 28 + i * 18, y - 28 + i * 2, x - 24 + i * 18, y - 13 + i * 2, c.stone, 2, .6);
  ctx.globalAlpha = .7;
  for (const wx of [x - 24, x + 18]) {
    ctx.beginPath(); ctx.arc(wx, y - 8, 9, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(wx, y - 8, 2, 0, 7); ctx.stroke();
  }
  line(ctx, x + 24, y - 22, x + 38, y - 34, c.stone, 2, .5);      // a broken shaft
  ctx.globalAlpha = 1;
}

function anvil(ctx, p, c) {
  r(ctx, p.x - 12, p.y - 14, 24, 14, c.stone, .9);
  ctx.globalAlpha = .85; ctx.fillStyle = c.stone;
  ctx.beginPath(); ctx.moveTo(p.x - 20, p.y - 26); ctx.lineTo(p.x + 18, p.y - 26);
  ctx.lineTo(p.x + 12, p.y - 16); ctx.lineTo(p.x - 8, p.y - 16); ctx.closePath(); ctx.fill();
  r(ctx, p.x - 26, p.y - 28, 14, 5, c.stone, .85);
  r(ctx, p.x - 16, p.y - 25, 2, 8, c.lit, .25);
  ctx.globalAlpha = 1;
}

function shelf(ctx, p, c) {
  const w = 58, h = 88, x = p.x - w / 2, y = p.y - h;
  r(ctx, x, y, w, h, c.stone, .55);
  r(ctx, x + 4, y + 6, w - 8, h - 10, c.sky, .45);
  for (let row = 0; row < 3; row++) {
    const sy = y + 14 + row * 24;
    r(ctx, x + 4, sy, w - 8, 2, c.stone, .9);
    for (let b = 0; b < 5; b++) {
      const bh = 9 + ((p.x + row * 7 + b * 5) % 9);
      r(ctx, x + 7 + b * 9, sy - bh, 6, bh, b % 3 === 0 ? c.accent : c.stoneLit, .35 + (b % 2) * .1);
    }
  }
  ctx.globalAlpha = 1;
}

function crystal(ctx, p, c, t) {
  const pulse = .16 + Math.sin(t * 2.1 + p.x) * .045;
  const grd = ctx.createRadialGradient(p.x, p.y - 20, 4, p.x, p.y - 20, 46);
  grd.addColorStop(0, `rgba(255,208,138,${pulse})`); grd.addColorStop(1, 'rgba(255,208,138,0)');
  ctx.fillStyle = grd; ctx.fillRect(p.x - 48, p.y - 68, 96, 96);
  for (const [ox, hh, ww] of [[-10, 42, 12], [6, 56, 16], [20, 34, 9]]) {
    ctx.globalAlpha = .7; ctx.fillStyle = c.accent;
    ctx.beginPath(); ctx.moveTo(p.x + ox - ww / 2, p.y); ctx.lineTo(p.x + ox, p.y - hh);
    ctx.lineTo(p.x + ox + ww / 2, p.y); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .35; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(p.x + ox - 1, p.y); ctx.lineTo(p.x + ox, p.y - hh);
    ctx.lineTo(p.x + ox + 3, p.y); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function tree(ctx, p, c) {
  const h = 72 + (p.x % 40);
  line(ctx, p.x, p.y, p.x + 3, p.y - h, c.stone, 8, .7);
  line(ctx, p.x + 2, p.y - h * .62, p.x - 22, p.y - h * .82, c.stone, 4, .6);
  line(ctx, p.x + 3, p.y - h * .72, p.x + 30, p.y - h * .94, c.stone, 4, .6);
  line(ctx, p.x + 2, p.y - h * .42, p.x - 18, p.y - h * .54, c.stone, 3, .5);
  line(ctx, p.x + 3, p.y - h * .9, p.x + 12, p.y - h * 1.02, c.stone, 2.5, .5);
  r(ctx, p.x - 8, p.y - 3, 18, 3, c.lit, .18);
  ctx.globalAlpha = 1;
}

function arch(ctx, p, c) {
  r(ctx, p.x - 42, p.y - 88, 15, 88, c.stone, .6);
  r(ctx, p.x + 26, p.y - 74, 15, 74, c.stone, .55);
  ctx.globalAlpha = .55; ctx.strokeStyle = c.stone; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(p.x - 42, p.y - 88); ctx.quadraticCurveTo(p.x, p.y - 132, p.x + 30, p.y - 84);
  ctx.stroke();
  ctx.globalAlpha = .3; ctx.strokeStyle = c.lit; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x - 34, p.y - 86); ctx.quadraticCurveTo(p.x, p.y - 120, p.x + 24, p.y - 80);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function chain(ctx, p, c) {
  const len = p.h || 120;
  ctx.globalAlpha = .4; ctx.strokeStyle = c.stoneLit; ctx.lineWidth = 1.5;
  for (let y = p.y; y < p.y + len; y += 10) {
    ctx.beginPath(); ctx.ellipse(p.x, y, 3, 5, 0, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function banner(ctx, p, c, t) {
  const w = 54, h = p.h || 140, x = p.x - w / 2, y = p.y;
  const sway = Math.sin(t * .9 + p.x) * 3;
  ctx.globalAlpha = .45; ctx.fillStyle = c.sky; ctx.fillRect(x - 3, y - 6, w + 6, 6);
  ctx.globalAlpha = .55; ctx.fillStyle = c.stone;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y);
  ctx.lineTo(x + w + sway, y + h); ctx.lineTo(x + w / 2 + sway, y + h - 14);
  ctx.lineTo(x + sway, y + h); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = .6; ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + w / 2 + sway * .5, y + 24);
  ctx.lineTo(x + w / 2 + 9 + sway * .5, y + 44);
  ctx.lineTo(x + w / 2 + sway * .5, y + 64);
  ctx.lineTo(x + w / 2 - 9 + sway * .5, y + 44); ctx.closePath(); ctx.stroke();
  ctx.globalAlpha = 1;
}

function rubble(ctx, p, c) {
  const seeds = [0, 1, 2, 3, 4, 5];
  seeds.forEach((i, k) => {
    const w = 8 + ((p.x + i * 17) % 12), h = 5 + ((p.x + i * 11) % 9);
    r(ctx, p.x - 26 + k * 9, p.y - h, w, h, c.stone, .55 + (k % 2) * .12);
  });
  r(ctx, p.x - 28, p.y - 2, 58, 2, c.lit, .15);
}

const DRAW = { grave, statue, bones, cart, anvil, shelf, crystal, tree, arch, chain, banner, rubble };
export const SCENERY_TYPES = Object.keys(DRAW);

export function drawProps(ctx, props, style, t) {
  if (!props || !props.length) return;
  const c = pal(style);
  for (const p of props) {
    const fn = DRAW[p.type];
    if (fn) fn(ctx, p, c, t);
  }
}

// A dark arch with a faint ember rune; fades as the knight gets close, then stays gone.
export function drawSecretVeil(ctx, s, style, alpha, t) {
  if (alpha <= .02) return;
  const c = pal(style), { x, y, w, h } = s;
  ctx.save();
  ctx.globalAlpha = alpha * .96; ctx.fillStyle = '#05070f';
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = alpha * .55; ctx.strokeStyle = c.stone; ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.globalAlpha = alpha * .38; ctx.strokeStyle = c.lit; ctx.lineWidth = 1;
  ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
  const cx = x + w / 2, cy = y + h / 2;
  ctx.globalAlpha = alpha * (.24 + Math.sin(t * 2.6) * .10);
  ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 10, cy); ctx.lineTo(cx, cy + 13);
  ctx.lineTo(cx - 10, cy); ctx.closePath(); ctx.stroke();
  ctx.globalAlpha = alpha * .12; ctx.fillStyle = c.sky;
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 12 + i * 29, y + 16 + (i % 3) * 9, 14, 3);
  ctx.restore();
}
