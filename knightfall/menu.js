// Main menu: title screen, phase select, controls and a new-game confirm. Self-contained: the host game gives it
// the save, audio callbacks and an onAction handler, forwards key codes to key(), and calls update(dt) / draw(ctx).
//   const menu = createMenu({ save, audio: { move, select, back, toggleMute, isMuted }, onAction });
//   onAction gets { type: 'continue' } | { type: 'new' } | { type: 'phase', index } | { type: 'color', index }
// save (optional): { level: 0-based index, cleared: [bool x8] (array or {0:true,...}), skin }. No save -> CONTINUE is greyed out.
import { THEMES, FLAME, POP } from './themes.js';
import { drawKnight, setKnight, SKIN_NAMES, SKINS } from './sprites.js';
const W = 960, H = 540, GY = 440, FONT = n => `bold ${n}px "Courier New",monospace`;
const GLYPH = {
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'], T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
};
const CONTROLS = [['MOVE', 'ARROWS / A D'], ['JUMP', 'SPACE / W / UP'], ['ATTACK', 'J / X'], ['DASH', 'SHIFT'], ['LANTERN', 'E'], ['MENU', 'ESC'], ['MUTE', 'M'], ['RESTART', 'R']];

export function createMenu({ save = null, audio = {}, onAction = () => {} } = {}) {
  let screen = 'main', sel = 0, t = 0, fade = 0, stars = Array.from({ length: 70 }, (_, i) => [(i * 137.5) % W, (i * 53.3) % 300, i % 3 + 1]);
  const ash = Array.from({ length: 70 }, (_, i) => ({ x: (i * 97) % W, y: (i * 61) % H, v: 14 + (i % 7) * 4, s: 1 + (i % 3 === 0 ? 1 : 0) })), embers = [];
  const cleared = i => !!(Array.isArray(save?.cleared) ? save.cleared[i] : save?.cleared?.[i]);
  const unlocked = i => i === 0 || cleared(i - 1);
  const mainItems = () => [{ label: 'CONTINUE', off: !save, act: () => onAction({ type: 'continue' }) },
    { label: 'NEW GAME', act: () => save ? go('confirm') : onAction({ type: 'new' }) },
    { label: 'PHASE SELECT', act: () => go('phases') }, { label: 'KNIGHT COLOURS', act: () => go('colors') },
    { label: 'CONTROLS', act: () => go('controls') },
    { label: `SOUND: ${audio.isMuted?.() ? 'OFF' : 'ON'}`, act: () => audio.toggleMute?.(), quiet: 1 }];
  const firstOn = () => mainItems().findIndex(i => !i.off);
  sel = Math.max(0, firstOn());
  function go(s) {
    screen = s;
    sel = s === 'main' ? Math.max(0, firstOn())
      : s === 'phases' ? Math.max(0, Math.min(7, save?.level ?? 0))
      : s === 'colors' ? Math.max(0, SKIN_NAMES.indexOf(save?.skin || 'iron')) : 0;
    if (s === 'phases' && !unlocked(sel)) sel = 0;
  }
  const step = (n, d, ok) => { let i = sel; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (ok(i)) { sel = i; return true; } } return false; };

  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const T = (ctx, s, x, y, size, col = '#e4ecff', al = 'left') => { ctx.font = FONT(size); ctx.textAlign = al; ctx.fillStyle = col; ctx.fillText(s, x, y); };
  function word(ctx, s, x, y, k) {
    for (const pass of [0, 1]) { let cx = x; for (const ch of s) { if (ch !== ' ') GLYPH[ch].forEach((row, r) => [...row].forEach((v, c) => { if (v === '1') R(ctx, pass ? (r < 4 ? '#e4ecff' : '#9fb0d8') : '#05070f', cx + c * k + (pass ? 0 : k * .6), y + r * k + (pass ? 0 : k * .6), k, k); })); cx += 6 * k; } }
  }
  function flame(ctx, x, y, s, ph) {                      // gold flame, 3 layers, flickers
    const n = Math.round(10 + Math.sin(ph * 11) * 1.5 + Math.sin(ph * 7.3));
    for (let r = 0; r < n; r++) { const u = r / n, yy = y - (r + 1) * s, w = (u < .15 ? 7 : 8 * (1 - u * .8)) * s, sway = Math.round(Math.sin(ph * 9 + r * .6) * u * 1.5) * s;
      R(ctx, FLAME.edge, x - w / 2 + sway, yy, w, s); if (u < .85) R(ctx, FLAME.mid, x - w * .36 + sway, yy, w * .72, s); if (u < .55) R(ctx, FLAME.core, x - w * .16 + sway, yy, w * .32, s); }
  }
  function glow(ctx, x, y, r, a) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, `rgba(255,226,140,${a})`); g.addColorStop(1, 'rgba(255,226,140,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over'; }
  function ridge(ctx, k, col, base, amp, wd) { const o = t * 3 * k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (let i = Math.floor(o / wd) - 1; i <= Math.ceil((o + W) / wd) + 1; i++) { const x = i * wd - o, h = amp * (.5 + .5 * Math.sin(i * 2.7 + 1)); ctx.lineTo(x, base - h); ctx.lineTo(x + wd / 2, base - h * .4); } ctx.lineTo(W + wd, H); ctx.fill(); }
  function castle(ctx) {
    const c = '#0a0f22'; R(ctx, c, 650, 250, 290, GY - 250);
    for (const [x, y, w] of [[650, 170, 46], [742, 118, 54], [846, 176, 46], [904, 214, 40]]) { R(ctx, c, x, y, w, GY - y); for (let xx = x; xx < x + w - 4; xx += 12) R(ctx, c, xx, y - 8, 7, 8); }
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(738, 118); ctx.lineTo(769, 70); ctx.lineTo(800, 118); ctx.fill();
    for (const [x, y] of [[664, 200], [758, 150], [862, 206], [680, 290], [880, 290], [912, 250]]) R(ctx, '#05070f', x, y, 10, 16);
    R(ctx, '#05070f', 788, 392, 36, GY - 392); R(ctx, '#05070f', 794, 384, 24, 10);                      // gate
    R(ctx, '#1c1430', 782, 288, 28, 44); R(ctx, '#1c1430', 786, 282, 20, 8);                              // throne-room window
    if (t % 5 < 4.5) { R(ctx, '#ff8a3d', 788, 304, 5, 3); R(ctx, '#ff8a3d', 800, 304, 5, 3); }          // the King, watching
  }
  function panel(ctx, title, h) { R(ctx, 'rgba(5,7,15,.82)', 60, 236, 430, h); R(ctx, '#2f3750', 60, 236, 430, 2); R(ctx, '#2f3750', 60, 236 + h - 2, 430, 2); T(ctx, title, 84, 268, 20, '#7fe3ff'); }

  return {
    setSave(s) { save = s; if (screen === 'main') sel = Math.max(0, firstOn()); },
    update(dt) {
      t += dt; fade = Math.min(1, fade + dt * 1.6);
      for (const a of ash) { a.y += a.v * dt; a.x -= a.v * .35 * dt; if (a.y > H) { a.y = -4; a.x = Math.random() * (W + 80); } if (a.x < -4) a.x = W; }
      if (Math.random() < dt * 14) embers.push({ x: 430 + (Math.random() - .5) * 6, y: GY - 62, vx: (Math.random() - .5) * 14, vy: -26 - Math.random() * 24, l: 1.4 });
      for (const e of embers) { e.x += e.vx * dt; e.y += e.vy * dt; e.l -= dt; } while (embers.length && embers[0].l <= 0) embers.shift();
    },
    screenName() { return screen; },
    key(code) {
      const up = code === 'ArrowUp' || code === 'KeyW', dn = code === 'ArrowDown' || code === 'KeyS', ok = code === 'Enter' || code === 'Space' || code === 'KeyJ', back = code === 'Escape' || code === 'Backspace';
      if (code === 'KeyM') { audio.toggleMute?.(); return true; }
      if (screen === 'main') {
        const it = mainItems();
        if (up || dn) { if (step(it.length, up ? -1 : 1, i => !it[i].off)) audio.move?.(); return true; }
        if (ok && !it[sel].off) { it[sel].quiet ? audio.move?.() : audio.select?.(); it[sel].act(); return true; }
      } else if (screen === 'phases') {
        if (up || dn) { if (step(8, up ? -1 : 1, unlocked)) audio.move?.(); return true; }
        if (ok && unlocked(sel)) { audio.select?.(); onAction({ type: 'phase', index: sel }); return true; }
        if (back) { audio.back?.(); go('main'); return true; }
      } else if (screen === 'colors') {
        if (up || dn) { sel = (sel + (dn ? 1 : SKIN_NAMES.length - 1)) % SKIN_NAMES.length; setKnight(SKIN_NAMES[sel]); audio.move?.(); return true; }
        if (ok) { audio.select?.(); onAction({ type: 'color', index: sel }); return true; }
        if (back) { setKnight(save?.skin || 'iron'); audio.back?.(); go('main'); return true; }
      } else if (screen === 'confirm') {
        if (ok) { audio.select?.(); onAction({ type: 'new' }); return true; }
        if (back) { audio.back?.(); go('main'); return true; }
      } else if (ok || back) { audio.back?.(); go('main'); return true; }
      return false;
    },
    draw(ctx, dy = 0) {
      ctx.setTransform(1, 0, 0, 1, 0, dy); ctx.imageSmoothingEnabled = false;
      const th = THEMES[0], g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky); g.addColorStop(1, th.sky2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e4ecff'; for (const [x, y, z] of stars) { ctx.globalAlpha = .3 + .5 * Math.abs(Math.sin(t * .8 + x)); ctx.fillRect(x, y, z, z); } ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter'; const mg = ctx.createRadialGradient(560, 110, 20, 560, 110, 170); mg.addColorStop(0, 'rgba(180,200,255,.28)'); mg.addColorStop(1, 'rgba(180,200,255,0)'); ctx.fillStyle = mg; ctx.fillRect(380, -60, 360, 340); ctx.globalCompositeOperation = 'source-over';
      R(ctx, '#e4ecff', 548, 98, 24, 24); R(ctx, '#e4ecff', 544, 102, 32, 16); R(ctx, '#e4ecff', 552, 94, 16, 32);
      ridge(ctx, .25, '#0f1730', 360, 100, 240); ridge(ctx, .5, '#131c3a', 420, 60, 170); castle(ctx);
      R(ctx, th.stone, 0, GY, W, H - GY); R(ctx, th.stoneLit, 0, GY, W, 3); for (let y = GY + 16; y < H; y += 18) R(ctx, '#232a3f', 0, y, W, 2);
      const fg = ctx.createLinearGradient(0, GY, 0, H); fg.addColorStop(0, 'rgba(5,7,15,0)'); fg.addColorStop(1, 'rgba(5,7,15,.85)'); ctx.fillStyle = fg; ctx.fillRect(0, GY, W, H - GY);
      R(ctx, '#3a4262', 427, GY - 50, 6, 50); R(ctx, '#232a3f', 421, GY - 54, 18, 6); glow(ctx, 430, GY - 66, 110, .3 + Math.sin(t * 9) * .04); flame(ctx, 430, GY - 52, 2, t);
      ctx.save(); ctx.translate(540, GY); ctx.scale(1.5, 1.5); drawKnight(ctx, 'idle', t, 0, 0, 0, 1); ctx.restore();
      for (const a of ash) { ctx.globalAlpha = .5; R(ctx, '#8f9bb8', a.x, a.y, a.s, a.s); } ctx.globalAlpha = 1;
      for (const e of embers) { ctx.globalAlpha = Math.max(0, e.l / 1.4); R(ctx, FLAME.mid, e.x, e.y, 2, 2); } ctx.globalAlpha = 1;
      word(ctx, 'EMBER', 70, 46, 9); word(ctx, 'KNIGHT', 70, 124, 9); flame(ctx, 400, 100, 2.6, t + 1);
      T(ctx, 'A FLAME KEPT IS A FLAME LOST', 72, 214, 15, '#7fe3ff');
      if (screen === 'main') {
        const it = mainItems(); it.forEach((m, i) => { const y = 264 + i * 33, on = i === sel;
          if (on) flame(ctx, 86, y - 2, 1.5, t + i); T(ctx, m.label, 112, y, 26, m.off ? '#4a5578' : on ? '#e4ecff' : '#8f9bb8'); });
      } else if (screen === 'phases') {
        panel(ctx, 'SELECT PHASE', 246);
        THEMES.forEach((th2, i) => { const y = 296 + i * 24 + 14, on = i === sel, lock = !unlocked(i);
          if (on) R(ctx, 'rgba(127,227,255,.14)', 68, y - 17, 414, 22);
          R(ctx, th2.sky2, 80, y - 12, 8, 12); R(ctx, th2.stone, 90, y - 12, 8, 12); R(ctx, th2.accent, 100, y - 12, 8, 12);
          T(ctx, th2.name, 120, y, 16, lock ? '#4a5578' : on ? '#e4ecff' : '#8f9bb8');
          T(ctx, cleared(i) ? 'CLEARED' : lock ? 'LOCKED' : save?.level === i ? 'CURRENT' : '', 470, y, 14, cleared(i) ? POP.dash : lock ? '#4a5578' : FLAME.mid, 'right'); });
      } else if (screen === 'colors') {
        panel(ctx, 'KNIGHT COLOURS', 206);
        SKIN_NAMES.forEach((k, i) => {
          const y = 296 + i * 24 + 14, on = i === sel, sk = SKINS[k];
          if (on) R(ctx, 'rgba(127,227,255,.14)', 68, y - 17, 414, 22);
          R(ctx, sk.a, 80, y - 12, 8, 12); R(ctx, sk.b, 90, y - 12, 8, 12);
          R(ctx, sk.cape, 100, y - 12, 8, 12); R(ctx, sk.rust, 110, y - 12, 8, 12);
          T(ctx, k.toUpperCase(), 128, y, 16, on ? '#e4ecff' : '#8f9bb8');
          T(ctx, (save?.skin || 'iron') === k ? 'WORN' : '', 470, y, 14, POP.dash, 'right');
        });
      } else if (screen === 'controls') {
        panel(ctx, 'CONTROLS', 206); CONTROLS.forEach(([a, k], i) => { const y = 296 + i * 24 + 14; T(ctx, a, 84, y, 16, '#8f9bb8'); T(ctx, k, 470, y, 16, '#e4ecff', 'right'); });
      } else {
        panel(ctx, 'START OVER?', 150); T(ctx, 'Your saved progress will be erased.', 84, 312, 16, '#8f9bb8'); T(ctx, 'ENTER  yes, start over', 84, 352, 16, '#e4ecff'); T(ctx, 'ESC    keep my save', 84, 380, 16, '#e4ecff');
      }

      if (fade < 1) { ctx.fillStyle = `rgba(5,7,15,${1 - fade})`; ctx.fillRect(0, 0, W, H); }
    },
  };
}
