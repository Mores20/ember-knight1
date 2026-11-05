// Per-environment backdrop art: layered silhouettes plus drifting particles.
// Everything here is screen-space and drawn before the world transform, so each style can
// have its own parallax without touching level data. No state, no allocations per frame.
import { THEMES } from './themes.js';

const IDX = { road: 0, crypt: 1, tower: 2, throne: 3, ash: 4, forge: 5, archive: 6, heart: 7 };
export const BACKDROP_STYLES = Object.keys(IDX);
export const OUTDOOR = { road: 1, tower: 1, ash: 1, heart: 1 };   // these keep the stars and moon

const VW = 960, VH = 540;
const wrap = (v, n) => ((v % n) + n) % n;
const clamp01 = v => Math.max(0, Math.min(1, v));

function hills(ctx, th, shift, base, amp, col, a) {
  ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-40, VH + 20);
  for (let x = -40; x <= VW + 40; x += 24) {
    const y = base + Math.sin((x + shift) * .006) * amp + Math.sin((x + shift) * .017 + 1.7) * amp * .45;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VW + 40, VH + 20); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}

function beam(ctx, x0, y0, x1, y1, w, col, a) {
  ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.globalAlpha = 1;
}

function column(ctx, x, y, w, h, th, a) {
  ctx.globalAlpha = a; ctx.fillStyle = th.stone;
  ctx.fillRect(x, y, w, h);                                    // shaft
  ctx.fillRect(x - 7, y - 12, w + 14, 12);                     // capital
  ctx.fillRect(x - 9, y + h - 10, w + 18, 10);                 // base
  ctx.fillStyle = th.stoneLit; ctx.globalAlpha = a * .35;      // a worn highlight
  ctx.fillRect(x + 3, y, 2, h - 10);
  ctx.globalAlpha = 1;
}

function motes(ctx, t, n, col, speed, up, size = 1.5, drift = 10) {
  for (let i = 0; i < n; i++) {
    const x = wrap(i * 137.7 + t * drift + Math.sin(t * .7 + i) * 14, VW + 60) - 30;
    const raw = i * 83.3 + t * speed * (1 + (i % 4) * .18);
    const y = up ? VH + 30 - wrap(raw, VH + 60) : wrap(raw, VH + 60) - 30;
    ctx.globalAlpha = .10 + (i % 4) * .045;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, i % 9 === 0 ? size * 1.6 : size, i % 9 === 0 ? size * 1.6 : size);
  }
  ctx.globalAlpha = 1;
}

/* ---------------- I: the Ember Road ---------------- */
function road(ctx, th, t, camX) {
  hills(ctx, th, camX * .20, 318, 30, th.stone, .42);
  hills(ctx, th, camX * .42 + 240, 392, 18, th.sky2, .85);

  const kx = 690 - camX * .08;                                 // a ruined keep on the horizon
  ctx.globalAlpha = .40; ctx.fillStyle = th.stone;
  ctx.fillRect(kx, 214, 150, 210); ctx.fillRect(kx + 16, 178, 38, 46);
  ctx.fillRect(kx + 104, 192, 30, 32);
  for (let i = 0; i < 6; i++) ctx.fillRect(kx + i * 25, 204, 16, 12);
  ctx.fillStyle = th.stoneLit; ctx.globalAlpha = .16;
  ctx.fillRect(kx + 58, 258, 14, 22); ctx.fillRect(kx + 86, 258, 14, 22);
  ctx.globalAlpha = 1;

  for (let b = -520; b < 1600; b += 520) {                      // broken arches along the road
    const x = b - camX * .16;
    if (x < -180 || x > VW + 180) continue;
    ctx.globalAlpha = .32; ctx.fillStyle = th.stone;
    ctx.fillRect(x, 300, 26, 130); ctx.fillRect(x + 120, 320, 26, 110);
    ctx.beginPath(); ctx.moveTo(x - 4, 300); ctx.quadraticCurveTo(x + 73, 238, x + 150, 320);
    ctx.lineWidth = 18; ctx.strokeStyle = th.stone; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  motes(ctx, t, 46, '#cfd8ee', 26, false, 1.4, 8);              // falling ash
}

/* ---------------- II: the Sunken Crypt ---------------- */
function crypt(ctx, th, t, camX) {
  hills(ctx, th, camX * .25, 386, 12, th.sky2, .9);
  for (let i = -1; i < 9; i++) {                                // a drowned colonnade
    const x = i * 170 - camX * .14;
    if (x < -80 || x > VW + 80) continue;
    const h = 210 + ((i * 53) % 70);
    column(ctx, x, 350 - h, 26, h, th, .30);
    ctx.globalAlpha = .10; ctx.fillStyle = th.accent;           // its reflection
    ctx.fillRect(x - 2, 372, 30, Math.min(90, h * .4));
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(4,18,20,.55)'; ctx.fillRect(0, 366, VW, 90);
  for (let i = 0; i < 6; i++) {                                  // mist
    const x = wrap(i * 240 + t * 11, VW + 300) - 150;
    ctx.globalAlpha = .05; ctx.fillStyle = th.accent; ctx.fillRect(x, 332 - i * 7, 190, 9); ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 4; i++) {                                  // chains from the dark
    const x = 110 + i * 230 - camX * .10, len = 70 + (i * 41) % 70;
    ctx.globalAlpha = .30; ctx.strokeStyle = th.stoneLit; ctx.lineWidth = 1;
    for (let k = 4; k < len; k += 8) { ctx.beginPath(); ctx.arc(x, k, 3, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  motes(ctx, t, 22, th.accent, 8, true, 1.3, 5);                // slow motes in the still air
}

/* ---------------- III: the Bell Tower ---------------- */
function tower(ctx, th, t, camX) {
  hills(ctx, th, camX * .22, 356, 24, th.stone, .35);
  for (let i = -1; i < 5; i++) {                                 // slit windows in the far wall
    const x = i * 250 - camX * .09;
    if (x < -80 || x > VW + 80) continue;
    ctx.globalAlpha = .35; ctx.fillStyle = th.stone;
    ctx.fillRect(x, 96, 46, 170);
    ctx.globalAlpha = .22; ctx.fillStyle = th.stoneLit;
    ctx.fillRect(x + 10, 110, 26, 96); ctx.beginPath(); ctx.arc(x + 23, 110, 13, Math.PI, 0); ctx.fill();
    ctx.globalAlpha = 1;
  }
  beam(ctx, -40, 424, VW + 40, 368, 12, th.stone, .40);          // timber frame
  beam(ctx, -40, 206, VW + 40, 206, 8, th.stone, .30);
  for (let i = 0; i < 5; i++) {
    const x = i * 240 - camX * .16;
    beam(ctx, x, 80, x + 46, 206, 9, th.stone, .26);
    beam(ctx, x + 46, 206, x, 360, 7, th.stone, .20);
  }
  const bellX = 300 - camX * .12;                                // a distant bell, still swinging
  if (bellX > -120 && bellX < VW + 120) {
    ctx.save(); ctx.translate(bellX, 150); ctx.rotate(Math.sin(t * .9) * .05);
    ctx.globalAlpha = .30; ctx.strokeStyle = th.stoneLit; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(0, -22); ctx.stroke();
    ctx.fillStyle = th.stoneLit;
    ctx.beginPath(); ctx.moveTo(-22, 8); ctx.quadraticCurveTo(-19, -22, 0, -24);
    ctx.quadraticCurveTo(19, -22, 22, 8); ctx.lineTo(27, 14); ctx.lineTo(-27, 14); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  motes(ctx, t, 20, th.stoneLit, 7, false, 1.2, 6);              // dust
}

/* ---------------- IV: the Throne ---------------- */
function throne(ctx, th, t, camX) {
  ctx.globalAlpha = .30; ctx.fillStyle = th.sky2;                // a deep hall
  ctx.fillRect(0, 90, VW, VH - 90); ctx.globalAlpha = 1;
  for (let i = -1; i < 5; i++) {                                 // columns and banners
    const x = i * 280 - camX * .10;
    if (x < -100 || x > VW + 100) continue;
    column(ctx, x, 120, 42, 320, th, .34);
    const bx = x + 108;
    ctx.globalAlpha = .16; ctx.fillStyle = th.accent;
    ctx.beginPath(); ctx.moveTo(bx, 104); ctx.lineTo(bx + 84, 104); ctx.lineTo(bx + 84, 300);
    ctx.lineTo(bx + 42, 330); ctx.lineTo(bx, 300); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .30; ctx.strokeStyle = th.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx + 42, 160); ctx.lineTo(bx + 58, 186); ctx.lineTo(bx + 42, 212);
    ctx.lineTo(bx + 26, 186); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 3; i++) {                                  // low braziers
    const x = 150 + i * 340 - camX * .06, y = 396 + (i % 2) * 8;
    ctx.globalAlpha = .30; ctx.fillStyle = th.stone; ctx.fillRect(x - 10, y, 20, 24);
    ctx.globalAlpha = .16 + Math.sin(t * 4 + i) * .04; ctx.fillStyle = th.accent;
    ctx.beginPath(); ctx.arc(x, y - 4, 12 + Math.sin(t * 6 + i) * 2, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  motes(ctx, t, 18, th.stoneLit, 5, false, 1.2, 5);
}

/* ---------------- V: the Ashen Gardens ---------------- */
function ash(ctx, th, t, camX) {
  hills(ctx, th, camX * .18, 340, 18, th.stone, .34);
  for (let i = -1; i < 8; i++) {                                 // a dead orchard
    const x = i * 170 - camX * .15;
    if (x < -90 || x > VW + 90) continue;
    const h = 110 + ((i * 37) % 80);
    ctx.globalAlpha = .34; ctx.strokeStyle = th.stone; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x, 430); ctx.lineTo(x + 3, 430 - h); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 3, 430 - h * .62); ctx.lineTo(x - 26, 430 - h * .82);
    ctx.moveTo(x + 3, 430 - h * .72); ctx.lineTo(x + 34, 430 - h * .9);
    ctx.moveTo(x + 3, 430 - h * .45); ctx.lineTo(x + 28, 430 - h * .58);
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = .30; ctx.fillStyle = th.stone;               // a toppled statue
  const sx = 640 - camX * .20;
  ctx.fillRect(sx, 392, 120, 20);
  ctx.beginPath(); ctx.arc(sx + 96, 386, 20, 0, 7); ctx.fill();
  ctx.globalAlpha = .18; ctx.fillStyle = th.accent;              // moss
  ctx.fillRect(sx + 8, 394, 30, 4); ctx.fillRect(sx + 60, 396, 42, 3);
  ctx.globalAlpha = 1;
  motes(ctx, t, 54, '#cfd8ee', 34, false, 1.7, 12);              // heavy ash
}

/* ---------------- VI: the Drowned Forge ---------------- */
function forge(ctx, th, t, camX) {
  for (let i = -1; i < 5; i++) {                                 // chimney stacks
    const x = i * 250 - camX * .09;
    if (x < -90 || x > VW + 90) continue;
    const h = 190 + ((i * 47) % 90);
    ctx.globalAlpha = .34; ctx.fillStyle = th.stone;
    ctx.fillRect(x, VH - h, 54, h); ctx.fillRect(x - 8, VH - h - 16, 70, 16);
    ctx.globalAlpha = .12; ctx.fillStyle = th.accent;
    ctx.fillRect(x + 16, VH - h + 26, 22, 8);
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = .30; ctx.strokeStyle = th.stoneLit; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(-20, 168); ctx.lineTo(300, 168); ctx.lineTo(300, 250); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(660, 140); ctx.lineTo(980, 140); ctx.lineTo(980, 236); ctx.stroke();
  ctx.globalAlpha = 1;
  const gx = 800 - camX * .12, gy = 250, gr = 52;                 // a great gear
  ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * .18);
  ctx.globalAlpha = .26; ctx.strokeStyle = th.stone; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(0, 0, gr, 0, 7); ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * (gr - 6), Math.sin(a) * (gr - 6));
    ctx.lineTo(Math.cos(a) * (gr + 12), Math.sin(a) * (gr + 12)); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  const glowX = 320 - camX * .05;
  const grd = ctx.createRadialGradient(glowX, 410, 10, glowX, 410, 150);   // furnace light
  grd.addColorStop(0, 'rgba(111,211,255,.16)'); grd.addColorStop(1, 'rgba(111,211,255,0)');
  ctx.fillStyle = grd; ctx.fillRect(glowX - 160, 250, 320, 320);
  motes(ctx, t, 30, '#6fd3ff', 30, true, 1.4, 7);                 // rising sparks
  ctx.globalAlpha = .07; ctx.strokeStyle = th.accent; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let x = -20; x <= VW + 20; x += 30) {
      const y = 330 + i * 26 + Math.sin(x * .03 + t * 1.4 + i) * 5;
      if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ---------------- VII: the Silent Archive ---------------- */
function archive(ctx, th, t, camX) {
  ctx.globalAlpha = .34; ctx.fillStyle = th.sky2;                 // the stacks
  ctx.fillRect(0, 70, VW, VH - 70); ctx.globalAlpha = 1;
  for (let i = -1; i < 6; i++) {
    const x = i * 220 - camX * .10;
    if (x < -130 || x > VW + 130) continue;
    ctx.globalAlpha = .30; ctx.fillStyle = th.stone;
    ctx.fillRect(x, 96, 156, 330);
    for (let r = 0; r < 3; r++) {
      const sy = 132 + r * 96;
      ctx.globalAlpha = .40; ctx.fillStyle = th.sky;
      ctx.fillRect(x + 8, sy, 140, 26);
      for (let b = 0; b < 8; b++) {
        const bh = 12 + ((i * 13 + r * 7 + b * 5) % 12);
        ctx.globalAlpha = .28 + (b % 3) * .06;
        ctx.fillStyle = b % 4 === 0 ? th.accent : th.stoneLit;
        ctx.fillRect(x + 13 + b * 17, sy + 26 - bh, 10, bh);
      }
    }
    ctx.globalAlpha = 1;
  }
  const lx = 820 - camX * .13;                                    // a hanging lamp
  ctx.globalAlpha = .40; ctx.strokeStyle = th.stoneLit; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 96); ctx.stroke();
  ctx.globalAlpha = .22 + Math.sin(t * 2.2) * .04;
  ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(lx, 102, 10, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 18; i++) {                                  // drifting pages
    const x = wrap(i * 173.1 + t * (8 + i % 4) + Math.sin(t + i) * 12, VW + 80) - 40;
    const y = wrap(i * 97.7 + t * (9 + i % 3), VH + 80) - 40;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * .4 + i);
    ctx.globalAlpha = .20 + (i % 3) * .05; ctx.fillStyle = th.accent;
    ctx.fillRect(-4, -3, 8, 6); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/* ---------------- VIII: the Ember Heart ---------------- */
function heart(ctx, th, t, camX) {
  hills(ctx, th, camX * .16, 400, 16, th.stone, .35);
  for (let i = -1; i < 7; i++) {                                  // crystal spires
    const x = i * 190 - camX * .11;
    if (x < -110 || x > VW + 110) continue;
    const h = 100 + ((i * 59) % 130);
    ctx.globalAlpha = .18; ctx.fillStyle = th.accent;
    ctx.beginPath(); ctx.moveTo(x, 436); ctx.lineTo(x + 44, 436 - h); ctx.lineTo(x + 88, 436); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .16; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(x + 30, 436); ctx.lineTo(x + 44, 436 - h); ctx.lineTo(x + 58, 436); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const px = 480 - camX * .04;
  const grd = ctx.createRadialGradient(px, 452, 20, px, 452, 280);   // the hearth's pulse
  grd.addColorStop(0, `rgba(255,208,138,${.10 + Math.sin(t * 1.6) * .03})`);
  grd.addColorStop(1, 'rgba(255,208,138,0)');
  ctx.fillStyle = grd; ctx.fillRect(px - 300, 160, 600, 380);
  motes(ctx, t, 34, '#ffd08a', 26, true, 1.5, 9);                 // embers rising
}

const DRAW = { road, crypt, tower, throne, ash, forge, archive, heart };

export function drawBackdrop(ctx, style, t, camX, camY = 0, vw = VW, vh = VH) {
  const th = THEMES[IDX[style] != null ? IDX[style] : 0];
  if (!th) return;
  const drift = Math.max(0, camY) * .05;                         // the far layers lag the climb
  ctx.save();
  if (drift) ctx.translate(0, -drift);
  DRAW[style in DRAW ? style : 'road'](ctx, th, t, camX, camY, vw, vh);
  ctx.restore();
}
