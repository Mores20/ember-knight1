import { pressed, clearPressed } from './input.js';
import * as A from './audio.js';
import { LEVELS, TOTAL_COINS } from './level.js';
import { Player, hit } from './player.js';
import { makeEnemy } from './enemies.js';
import { AshWarden } from './boss.js';
import { AshKing } from './king.js';
import { drawKnight } from './sprites.js';
import { drawWarden as drawWardenSprite, drawMote } from './ashwarden.js';
import { drawMob } from './mobs.js';
import * as NEWMOBS from './mobsprites.js';
import { THEMES, POP } from './themes.js';
import { drawSolid, drawTorch, drawCoin, drawHeartPickup, drawSpikes, SWATCH } from './tiles.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d'), VW = 960, VH = 540;
const C = { bg: '#0b1021', stone: '#232a3f', stone2: '#2f3750', moon: '#dfe8ff', ember: '#ff8a3d', ink: '#05070f', rim: 'rgba(255,138,61,.55)' };
const stars = Array.from({ length: 60 }, (_, i) => [(i * 137.5) % VW, (i * 53.3) % 300, i % 3 + 1]);
let g;

/* ---- persistent run (S1/S9): hearts, coins and unlocks survive phases AND reloads ---- */
const SAVE_KEY = 'emberknight.v1';
const freshRun = () => ({ lvl: 0, hp: 2, coins: 0, time: 0, abil: { dash: false, lantern: false }, got: {}, lit: {}, cleared: LEVELS.map(() => false) });
function loadRun() {
  try {
    const s = typeof localStorage !== 'undefined' ? localStorage.getItem(SAVE_KEY) : null;
    if (s) {
      const r = JSON.parse(s);
      if (r && typeof r.hp === 'number') {
        const out = { ...freshRun(), ...r, abil: { ...freshRun().abil, ...(r.abil || {}) } };
        out.cleared = LEVELS.map((_, i) => !!(Array.isArray(r.cleared) && r.cleared[i]));
        return out;
      }
    }
  } catch (e) { /* private mode, or node harness */ }
  return freshRun();
}
let run = loadRun();
function saveRun() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(SAVE_KEY, JSON.stringify(run)); } catch (e) {} }
const picked = (i, k) => (run.got[i] = run.got[i] || { c: [], h: [] })[k];   // per-phase pickup ledger

function loadLevel(i) {
  run.lvl = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
  const L = LEVELS[run.lvl], gotC = picked(run.lvl, 'c'), gotH = picked(run.lvl, 'h');
  const litSet = run.lit[run.lvl] = run.lit[run.lvl] || [];      // torches you lit stay lit across reloads
  const l = { ...L,
    lights: (L.lights || []).map(v => v.slice()),
    solids: L.solids.map(s => ({ ...s })),                       // fresh mutable copy (crumble/move state)
    torches: L.torches.map((t, k) => {
      const o = Array.isArray(t) ? { x: t[0], y: t[1], lit: 1 } : { ...t };
      return { ...o, i: k, lit: o.lit || litSet.includes(k) ? 1 : 0 };
    }),
  };
  const p = new Player(); p.reset(L.spawn[0], L.spawn[1]);
  p.hp = Math.max(1, Math.min(3, run.hp));                       // hearts carry across phases
  const camY = l.vscroll ? Math.max(0, Math.min(l.h - VH, p.y - 270)) : 0;   // open straight onto the climb
  g = { l, lvl: run.lvl, p, abil: run.abil, enemies: l.enemies.map(makeEnemy),
    coins: l.coins.map(([x, y], k) => ({ x, y, k, got: gotC.includes(k) ? 1 : 0 })),
    hearts: l.hearts.map(([x, y], k) => ({ x, y, k, got: gotH.includes(k) ? 1 : 0 })),
    sigil: l.sigil ? { ...l.sigil, got: run.abil.dash ? 1 : 0 } : null,   // already earned stays earned
    grant: 0, grantKind: 'dash', boss: l.king ? new AshKing(l.king) : l.boss ? new AshWarden(l.boss) : null, sealT: 0, slain: 0,
    lamps: [], sparks: [], arrows: [], lamp: run.abil.lantern ? 3 : 0, wind: l.wind || [],
    tide: l.tide ? { y: l.tide.y0 } : null, tideT: l.tide ? 5 : 2, trails: [],
    switches: (l.switches || []).map(s => ({ ...s, on: 0 })), reveal: 0, revealShown: 0,
    lanternSigil: l.lantern ? { ...l.lantern, got: run.abil.lantern ? 1 : 0 } : null,
    parts: [], cam: { x: Math.max(0, Math.min(l.w - VW, p.x - 380)), y: camY }, shk: 0, stopT: 0, t: 0, cp: l.cps[0],
    style: l.style || 'road',
    state: 'play', time: 0, msg: 5, win: 0, card: null, dark: 0,
    shake: n => { g.shk = Math.max(g.shk, n); }, stop: t => { g.stopT = Math.max(g.stopT, t); } };
  g.lightAt = lightAt;
}

// Gameplay light: lit torches, burning lantern sparks and level embers. The player's own aura is
// deliberately NOT included - it only cuts the dark veil, so "in light" stays a real state.
function lightAt(x, y) {
  for (const t of g.l.torches) if (t.lit && Math.hypot(t.x - x, (t.y - 34) - y) < 175) return 1;
  for (const w of g.switches) if (w.on && Math.hypot(w.x - x, (w.y - 30) - y) < 175) return 1;
  for (const l of g.lamps) if (Math.hypot(l.x - x, l.y - y) < 140) return 1;
  for (const [ex, ey] of g.l.lights) if (Math.hypot(ex - x, ey - y) < 120) return 1;
  return 0;
}

// between-phase card (S3): holds the old screen dark, then boots the next level
function enterCard(next, title, sub) {
  g.state = 'card';
  g.card = { t: 0, dur: 2.4, next, title: title || `PHASE ${next + 1}`, sub: sub || LEVELS[next].name };
}
function nextPhase() {
  const nx = g.lvl + 1;
  run.hp = g.p.hp;
  run.cleared[g.lvl] = true;                                     // unlocks this phase in the menu
  saveRun();
  if (nx >= LEVELS.length) { g.state = 'win'; g.win = 0; g.litCount = Object.values(run.lit).reduce((n, a) => n + a.length, 0); A.sfx.win(); return; }
  enterCard(nx);
}

/* ---- phase select (Esc): finished phases can be revisited ---- */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const unlocked = i => i === 0 || i === run.lvl || !!(run.cleared && run.cleared[i]);
function toggleMenu() {
  if (g.state === 'menu') { g.state = g.menu.from || 'play'; return; }
  if (g.state !== 'play' && g.state !== 'win') return;
  g.menu = { sel: Math.max(0, Math.min(LEVELS.length - 1, run.lvl)), t: 0, from: g.state };
  g.state = 'menu';
  A.sfx.coin();
}
function moveSel(d) {
  const n = LEVELS.length;
  for (let k = 1; k <= n; k++) {
    const i = ((g.menu.sel + d * k) % n + n) % n;
    if (unlocked(i)) { g.menu.sel = i; A.sfx.land(); return; }
  }
}
function updateMenu(dt) {
  g.menu.t += dt;
  if (pressed.left) moveSel(-1);
  if (pressed.right) moveSel(1);
  if (pressed.atk || pressed.ok) {
    const i = g.menu.sel;
    if (!unlocked(i)) { A.sfx.block(); return; }
    A.sfx.grant();
    loadLevel(i); saveRun();                                     // hearts, coins and the dash travel with you
  }
}

// S5: moving platforms write dx/dy so the rider can be carried; crumble platforms
// rattle when stood on, drop out, then fade back in.
function tickSolids(dt) {
  const p = g.p;
  for (const s of g.l.solids) {
    if (s.kind === 'move') {
      s.t = (s.t || 0) + dt * (s.sp || 1);
      const nx = s.x0 + Math.sin(s.t + (s.ph || 0)) * (s.ax || 0), ny = s.y0 + Math.sin(s.t + (s.ph || 0)) * (s.ay || 0);
      s.dx = nx - s.x; s.dy = ny - s.y; s.x = nx; s.y = ny;
    } else { s.dx = s.dy = 0; }
    if (s.kind === 'crumble') {
      if (s.st === undefined) { s.st = 'idle'; s.t = 0; }
      else s.t += dt;
      if (s.st === 'idle') { if (p.groundSolid === s) { s.st = 'shake'; s.t = 0; A.sfx.crumble(); } }
      else if (s.st === 'shake' && s.t > .45) { s.st = 'gone'; s.t = 0; }
      else if (s.st === 'gone' && s.t > 1.5) { s.st = 'back'; s.t = 0; }
      else if (s.st === 'back' && s.t > .8) { s.st = 'idle'; s.t = 0; }
      s.off = s.st === 'gone';
      s.fade = s.st === 'gone' ? 0 : s.st === 'back' ? Math.min(1, s.t / .8) : 1;
    }
  }
}
const spark = (x, y, n, col) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 160; g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, l: .5 + Math.random() * .3, col }); } };
const respawn = () => { const p = g.p; p.reset(g.cp[0], g.cp[1] - p.h); p.inv = 1.5; g.shake(6); if (g.boss) g.boss.reset();
  if (g.tide) { g.tide.y = Math.min(g.l.tide.y0, g.cp[1] + 280); g.tideT = 2; } };   // VI: the tide drops back under you
// Enemy hurtboxes reach slightly past the drawn body so swings feel generous.
// Contact damage keeps the tight box, so nothing hurts you from further away.
const PAD = { goblin: [5, 5], shield: [5, 5], bat: [6, 8] };
const reach = e => { const [px, py] = PAD[e.type] || [4, 4]; return { x: e.x - px, y: e.y - py, w: e.w + px * 2, h: e.h + py * 2 }; };

function update(dt) {
  const p = g.p; g.t += dt; g.msg -= dt;
  if (g.state === 'menu') { updateMenu(dt); return; }
  if (g.state === 'win') { g.win += dt; return; }
  if (g.state === 'card') {                                       // between-phase card: hold, then boot next
    g.card.t += dt;
    if (g.card.t >= g.card.dur || pressed.atk || pressed.jump) loadLevel(g.card.next);
    return;
  }
  g.time += dt; run.time += dt;
  tickSolids(dt);
  for (const wz of g.wind) {                                       // V: ash wind shoves you along
    const ph = (g.time + (wz.ph || 0)) % (wz.on + wz.off);
    wz.active = ph < wz.on;
    if (wz.active && p.x + p.w > wz.x && p.x < wz.x + wz.w) p.x += wz.dir * wz.force * dt;
  }
  for (const s of g.l.solids) if (s.litOnly) {                     // VII: bridges that exist only in light
    const perm = s.group && g.switches.some(w => w.on && w.group === s.group);
    s.pass = !(perm || g.lightAt(s.x + s.w / 2, s.y + s.h / 2));
  }
  for (const sw of g.switches) {                                   // lantern bowls
    if (sw.on) continue;
    let lit = false;
    for (const l of g.lamps) if (Math.hypot(l.x - sw.x, l.y - (sw.y - 26)) < 64) lit = true;
    const s = p.sword();
    if (s && hit(s, { x: sw.x - 12, y: sw.y - 58, w: 24, h: 58 })) lit = true;
    if (lit) {
      sw.on = 1; A.sfx.torch(); g.shake(4); spark(sw.x, sw.y - 30, 18, POP.lantern);
      if (!g.revealShown && g.l.reveal) { g.reveal = 5; g.revealShown = 1; }
    }
  }
  if (g.reveal > 0) g.reveal -= dt;
  p.update(dt, g.l.solids, g);
  if (g.l.vscroll) {                                             // tower: the highest lit checkpoint wins
    let best = g.l.cps[0];
    for (const c of g.l.cps) if (c[1] < best[1]) best = c;
    for (const t of g.l.torches) if (t.cp && t.lit && t.y < best[1]) best = [t.x, t.y];
    g.cp = best;
  } else if (p.ground) {                                         // checkpoints: fixed points + lit cp torches
    let best = g.l.cps[0];
    for (const c of g.l.cps) if (p.x > c[0]) best = c;
    for (const t of g.l.torches) if (t.cp && t.lit && p.x > t.x && t.x > best[0]) best = [t.x, t.y];
    g.cp = best;
  }
  const s = p.sword();
  if (s) {
    for (const t of g.l.torches) if (!t.lit && hit(s, { x: t.x - 10, y: t.y - 58, w: 20, h: 58 })) {
      t.lit = 1; run.lit[g.lvl].push(t.i); saveRun(); A.sfx.torch();   // light = checkpoint
      spark(t.x, t.y - 56, 12, C.ember); g.shake(2);
    }
    for (const e of g.enemies) if (!p.hits.has(e) && hit(s, reach(e))) {
      p.hits.add(e);
      if (e.type === 'shade' && !e.lit) continue;                  // shades only take steel inside light
      if (e.blocking && e.blocking(p.face)) {                    // shield up: clang, no damage
        A.sfx.block(); spark(e.x + e.w / 2, e.y + e.h / 2, 7, '#c9d4f0'); g.shake(3); g.stop(.05);
        continue;
      }
      const dead = e.hit(p.face);
      g.stop(.08); g.shake(5); A.sfx.hit(); spark(e.x + e.w / 2, e.y + e.h / 2, dead ? 18 : 8, C.ember);
      if (dead) { e.dead = 1; A.sfx.kill(); }
    }
    if (g.boss) {
      const r = g.boss.takeHit(s);
      if (r === 2) {                                            // the kite shield eats it
        A.sfx.block(); g.stop(.04); g.shake(2);
        spark(g.boss.x + g.boss.w / 2 + g.boss.dir * 10, g.boss.y + 36, 5, '#c9d4f0');
      } else if (r === 1) {                                     // the Warden has hyper-armour: no flinch
        A.sfx.hit(); g.stop(.06); g.shake(5); spark(g.boss.x + g.boss.w / 2, g.boss.y + 34, 10, C.ember);
        if (!g.boss.alive) { g.slain = 3.4; g.shake(16); A.sfx.bossDie(); spark(g.boss.x + g.boss.w / 2, g.boss.y + 34, 44, C.ember); }
      }
    }
  }
  g.enemies = g.enemies.filter(e => !e.dead);
  for (const e of g.enemies) {
    e.update(dt, p, g);
    if (hit(p, e) && !(e.type === 'wisp' && e.scared)) p.hurt(e.x + e.w / 2, g);
  }
  if (g.boss) { g.boss.parry(p, g); g.boss.update(dt, p, g); }

  /* ---- Ember Lantern ---- */
  if (g.lanternSigil && !g.lanternSigil.got && hit(p, { x: g.lanternSigil.x - 12, y: g.lanternSigil.y - 12, w: 24, h: 24 })) {
    g.lanternSigil.got = 1; run.abil.lantern = true; g.lamp = 3; saveRun();
    g.grant = 3.6; g.grantKind = 'lantern'; A.sfx.grant();
    spark(g.lanternSigil.x, g.lanternSigil.y, 26, POP.lantern); g.shake(4);
  }
  if (pressed.lamp && run.abil.lantern && g.lamp > 0) {
    g.lamp--;
    g.sparks.push({ x: p.x + p.w / 2 + p.face * 8, y: p.y + 10, vx: p.face * 250, vy: -300, t: 0 });
    A.sfx.lamp();
  }
  for (const s of g.sparks) {
    s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
    const sb = { x: s.x - 4, y: s.y - 4, w: 8, h: 8 };
    let land = s.y > g.l.h - 4 || s.t > 2;
    for (const o of g.l.solids) if (!o.off && hit(sb, o)) { land = true; s.y = o.y - 2; break; }   // catches even on an unlit bridge
    if (land) { s.done = 1; g.lamps.push({ x: s.x, y: s.y, t: 4 }); }
  }
  g.sparks = g.sparks.filter(s => !s.done);
  for (const l of g.lamps) l.t -= dt;
  g.lamps = g.lamps.filter(l => l.t > 0);
  for (const t of g.l.torches) {
    if (t.lit) {                                                   // standing in torchlight refills the lantern
      if (Math.hypot(t.x - (p.x + p.w / 2), (t.y - 40) - (p.y + p.h / 2)) < 54) g.lamp = 3;
    } else for (const l of g.lamps) if (Math.hypot(t.x - l.x, (t.y - 46) - l.y) < 46) {
      t.lit = 1; run.lit[g.lvl].push(t.i); saveRun(); A.sfx.torch(); spark(t.x, t.y - 56, 12, C.ember);
    }
  }

  /* ---- arrows ---- */
  for (const a of g.arrows) {
    a.vy += 150 * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
    const ab = { x: a.x - 6, y: a.y - 4, w: 12, h: 8 };
    if (a.reflected) {
      for (const e of g.enemies) if (e.type === 'archer' && hit(ab, e)) {
        a.done = 1; e.flash = .12; if (e.hit()) { e.dead = 1; A.sfx.kill(); } else A.sfx.hit();
        break;
      }
    } else if (hit(p, ab)) { p.hurt(a.x, g); a.done = 1; }
    for (const o of g.l.solids) if (!o.off && !o.pass && hit(ab, o)) { a.done = 1; break; }
    if (a.life <= 0 || a.x < -60 || a.x > g.l.w + 60 || a.y > g.l.h) a.done = 1;
  }
  g.arrows = g.arrows.filter(a => !a.done);
  if (p.swing > 0 && g.arrows.length) {                            // a live swing sends an arrow home
    const bw = 48, box = { x: p.face > 0 ? p.x + p.w : p.x - bw, y: p.y - 4, w: bw, h: 42 };
    for (const a of g.arrows) if (!a.reflected && hit(box, { x: a.x - 6, y: a.y - 4, w: 12, h: 8 })) {
      a.reflected = 1; a.vx = -a.vx * 1.6; a.vy = -a.vy * .2;
      A.sfx.parry(); g.stop(.04); g.shake(2); spark(a.x, a.y, 8, '#ffd479');
    }
  }
  for (const c of g.coins) if (!c.got && hit(p, { x: c.x - 9, y: c.y - 9, w: 18, h: 18 })) { c.got = 1; run.coins++; picked(g.lvl, 'c').push(c.k); saveRun(); A.sfx.coin(); }
  for (const h of g.hearts) if (!h.got && p.hp < 3 && hit(p, { x: h.x - 11, y: h.y - 11, w: 22, h: 22 })) { h.got = 1; p.hp++; picked(g.lvl, 'h').push(h.k); saveRun(); A.sfx.heart(); }
  if (g.sigil && !g.sigil.got && hit(p, { x: g.sigil.x - 12, y: g.sigil.y - 12, w: 24, h: 24 })) {
    g.sigil.got = 1; run.abil.dash = true; saveRun(); g.grant = 3.6; g.grantKind = 'dash';   // the ember dash, for good
    A.sfx.grant(); spark(g.sigil.x, g.sigil.y, 26, C.ember); g.shake(4);
  }
  if (g.grant > 0) g.grant -= dt;
  const fell = p.y > g.l.h; if (fell) p.hp--;
  if (p.hp <= 0) { p.hp = 3; respawn(); A.sfx.die(); saveRun(); } else if (fell) { respawn(); A.sfx.hurt(); }
  for (const hz of g.l.hazards) if (hz.type === 'spike' && p.inv <= 0 && hit(p, hz)) {   // S6: damage + respawn
    p.hp--; g.shake(6);
    if (p.hp <= 0) { p.hp = 3; respawn(); A.sfx.die(); saveRun(); } else { respawn(); A.sfx.hurt(); }
  }
  if (g.tide) {                                                    // VI: the rising ember tide
    if (g.tideT > 0) g.tideT -= dt; else g.tide.y -= g.l.tide.speed * dt;
    if (p.y + p.h > g.tide.y - 2) {
      p.hp--; g.shake(8);
      if (p.hp <= 0) { p.hp = 3; respawn(); A.sfx.die(); saveRun(); } else { respawn(); A.sfx.hurt(); }
    }
  }
  for (const tr of g.trails) {                                     // crawler slag still burns for a moment
    tr.t -= dt;
    if (tr.t > 0 && p.inv <= 0 && hit(p, { x: tr.x - 12, y: tr.y - 9, w: 24, h: 11 })) p.hurt(tr.x, g);
  }
  g.trails = g.trails.filter(tr => tr.t > 0);
  if (hit(p, g.l.gate)) {
    if (g.boss && g.boss.hp > 0) {                               // the door stays shut while he stands
      if (g.sealT <= 0) { g.sealT = 1.5; A.sfx.sealed(); g.shake(3); }
    } else nextPhase();
  }
  if (g.sealT > 0) g.sealT -= dt;
  if (g.slain > 0) g.slain -= dt;
  run.hp = p.hp;
  for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; q.l -= dt; }
  g.parts = g.parts.filter(q => q.l > 0);
  g.shk *= .88; if (g.shk < .3) g.shk = 0;
  const darkNow = g.l.darkZones.some(z => p.x > z[0] && p.x < z[1]);   // S7: fade into unlit stretches
  g.dark += ((darkNow ? 1 : 0) - g.dark) * Math.min(1, dt * 5);
}

const T = (s, x, y, size, al = 'left', col = C.moon) => { ctx.font = `bold ${size}px "Courier New",monospace`; ctx.textAlign = al; ctx.fillStyle = col; ctx.fillText(s, x, y); };
function heart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * .8); ctx.bezierCurveTo(x - s * .9, y + s * .2, x - s * .5, y - s * .4, x, y + s * .05); ctx.bezierCurveTo(x + s * .5, y - s * .4, x + s * .9, y + s * .2, x, y + s * .8); }
function ridge(k, col, base, amp, wd) {
  const o = g.cam.x * k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH);
  for (let i = Math.floor(o / wd) - 1; i <= Math.ceil((o + VW) / wd) + 1; i++) { const x = i * wd - o, h = amp * (.5 + .5 * Math.sin(i * 2.7 + 1)); ctx.lineTo(x, base - h); ctx.lineTo(x + wd / 2, base - h * .4); }
  ctx.lineTo(VW + wd, VH); ctx.fill();
}
function glow(x, y, r, a) {
  ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(x, y, 2, x, y, r);
  gr.addColorStop(0, `rgba(255,138,61,${a})`); gr.addColorStop(1, 'rgba(255,138,61,0)');
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
}

function knight(p) {
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;           // i-frame blink
  const st = p.dashT > 0 ? 'dash' : p.swing > 0 ? 'attack' : !p.ground ? 'air' : Math.abs(p.vx) > 20 ? 'run' : 'idle';
  const u = st === 'dash' ? 1 - p.dashT / .24 : st === 'attack' ? 1 - p.swing / .26 : 0;
  drawKnight(ctx, st, g.t, u, p.x + p.w / 2, p.y + p.h, p.face);
}
function drawEnemy(e) {
  const flash = { flash: e.flash > 0 };
  if (e.type === 'archer') {
    const n = Math.min(2, Math.floor((e.stT || 0) / .55 * 3));
    NEWMOBS.drawMob(ctx, 'archer', e.st === 'shoot' ? 'shoot' : e.st === 'draw' ? 'draw' : 'idle', e.st === 'draw' ? n : 0,
      e.x + e.w / 2, e.y + e.h, e.dir, flash);
  } else if (e.type === 'husk') {
    NEWMOBS.drawMob(ctx, 'husk', 'walk', Math.floor(e.t * 8), e.x + e.w / 2, e.y + e.h, e.dir, flash);
  } else if (e.type === 'shade') {
    NEWMOBS.drawMob(ctx, 'shade', e.lit ? 'lit' : 'shadow', Math.floor(e.t * 5), e.x + e.w / 2, e.y + e.h, e.dir, flash);
  } else if (e.type === 'crawler') {
    NEWMOBS.drawMob(ctx, 'crawler', 'crawl', Math.floor(e.t * 6), e.x + e.w / 2, e.y + e.h, e.dir, flash);
  } else if (e.type === 'wisp') {
    NEWMOBS.drawMob(ctx, 'wisp', e.scared ? 'scared' : 'float', Math.floor(e.t * 8), e.x + e.w / 2, e.y + e.h / 2, e.dir, flash);
  } else if (e.type === 'bat') {
    const face = Math.cos(e.t * e.sp + e.ph) >= 0 ? 1 : -1;
    drawMob(ctx, 'bat', 'fly', Math.floor(e.t * 14 + e.ph * 3), e.x + e.w / 2, e.y + e.h / 2, face, flash);
  } else if (e.type === 'shield') {
    drawMob(ctx, 'shield', e.st === 'down' ? 'open' : 'guard', Math.floor(e.t * 6), e.x + e.w / 2, e.y + e.h, e.dir, flash);
  } else {
    drawMob(ctx, 'goblin', 'walk', Math.floor(e.t * 9), e.x + e.w / 2, e.y + e.h, e.dir, flash);
  }
}

// S7: darkness closes in and only torches, fire and your own ember reveal the world.
// The veil lives on its own canvas so punching light holes cuts the veil, not the world.
const darkCv = document.createElement('canvas'); darkCv.width = VW; darkCv.height = VH;
const dctx = darkCv.getContext('2d');
function darken() {
  const p = g.p, c = g.cam, px = p.x + p.w / 2, py = p.y + p.h / 2;
  const vis = x => x > c.x - 280 && x < c.x + VW + 280, lights = [[px, py, 122]];
  for (const t of g.l.torches) if (t.lit && vis(t.x)) lights.push([t.x, t.y - 56, 165]);
  for (const l of g.lamps) if (vis(l.x)) lights.push([l.x, l.y, 150]);
  for (const w of g.switches) if (w.on && vis(w.x)) lights.push([w.x, w.y - 30, 175]);
  for (const s of g.sparks) if (vis(s.x)) lights.push([s.x, s.y, 80]);
  for (const [x, y, r] of g.l.lights) if (vis(x)) lights.push([x, y - 6, r]);              // ember footholds
  for (const hz of g.l.hazards) if (vis(hz.x)) lights.push([hz.x + hz.w / 2, hz.y + hz.h / 2, 112]);   // spikes smoulder
  for (const q of g.coins) if (!q.got && vis(q.x)) lights.push([q.x + 9, q.y + 9, 60]);    // a coin's glint
  lights.sort((a, b) => (a[0] - px) ** 2 + (a[1] - py) ** 2 - ((b[0] - px) ** 2 + (b[1] - py) ** 2));
  const near = lights.slice(0, 18);
  dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, VW, VH); dctx.globalAlpha = g.dark;
  dctx.fillStyle = 'rgba(3,4,10,.96)'; dctx.fillRect(0, 0, VW, VH);
  dctx.globalCompositeOperation = 'destination-out';                                     // punch visibility holes
  for (const [x, y, r] of near) {
    const sx = x - c.x, sy = y - c.y;
    const gr = dctx.createRadialGradient(sx, sy, 6, sx, sy, r);
    gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(.3, 'rgba(0,0,0,.82)');
    gr.addColorStop(.65, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = gr; dctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  dctx.globalCompositeOperation = 'source-over'; dctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(darkCv, 0, 0);
  for (const [x, y, r] of near) glow(x - c.x, y - c.y, r * .7, .16 * g.dark);            // warm pooled light
}

function renderCard() {                                            // S3: between-phase card
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, VW, VH);
  const a = Math.min(1, g.card.t * 1.6), b = Math.min(1, Math.max(0, g.card.t - .5) * 2);
  ctx.globalAlpha = a; T(g.card.title, VW / 2, 232, 30, 'center', C.ember);
  ctx.globalAlpha = b; T(g.card.sub, VW / 2, 292, 42, 'center');
  const CL = LEVELS[g.card.next];
  if (CL && CL.line) { ctx.globalAlpha = Math.max(0, b - .15); T(CL.line, VW / 2, 344, 17, 'center', '#cfd8ee'); }
  ctx.globalAlpha = Math.max(0, b - .3); T('J / X  to continue', VW / 2, 400, 15, 'center', '#8f9bb8');
  ctx.globalAlpha = 1;
}

function drawThrone(t) {                                           // the empty seat the Warden guards
  const { x, y, w, h } = t;
  ctx.fillStyle = C.stone;
  ctx.beginPath(); ctx.moveTo(x + 8, y + h); ctx.lineTo(x + 8, y + 12); ctx.lineTo(x + 32, y);
  ctx.lineTo(x + w - 32, y); ctx.lineTo(x + w - 8, y + 12); ctx.lineTo(x + w - 8, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.stone2; ctx.fillRect(x + 24, y + 22, w - 48, h - 44);
  ctx.fillStyle = C.ink; ctx.fillRect(x + 20, y + h - 34, w - 40, 8);
  ctx.fillStyle = C.stone; ctx.fillRect(x, y + 54, 22, 16); ctx.fillRect(x + w - 22, y + 54, 22, 16);
  ctx.fillStyle = C.ember;
  ctx.fillRect(x + 12, y + 18, 10, 30); ctx.fillRect(x + w - 22, y + 18, 10, 30);
  ctx.fillRect(x + 34, y + 30, w - 68, 4);
  glow(x + w / 2, y + 26, 70, .16);
}

// The Ash Warden. Everything he is about to do is painted orange first.
// game state -> [sprite row, frame index, draw options]
function wardenFrame(b) {
  const o = { phase2: b.phase === 2, flash: b.flash > 0 };
  const loop = (s, n, fps) => [s, Math.floor(b.t * fps) % n, o];
  switch (b.st) {
    case 'dormant': return ['enrage', 0, o];
    case 'rise': return ['enrage', Math.min(1, Math.floor(b.t / 1.15 * 2)), o];
    case 'guard': return b.moving ? loop('stalk', 4, 8) : loop('guard', 2, 2);
    case 'open': case 'recover': return loop('open', 2, 5);
    case 'rest': return loop('rest', 2, 2);
    case 'stun': return loop('stun', 2, 6);
    case 'enrage': return ['enrage', Math.min(3, Math.floor(b.t / 1.3 * 4)), o];
    case 'dead': case 'gone': return ['dead', Math.min(3, Math.floor(b.t / 1.8 * 4)), o];
    case 'charge': return loop('charge', 3, 10);
    case 'act': return ['cleave_slam', Math.min(1, Math.floor(b.t / (b.act || .3) * 2)), o];
    case 'volley': return ['volley_throw', 0, o];
    case 'wind': {
      const k = Math.min(1, b.t / (b.wind || 1));
      if (b.atk === 'volley') return ['volley_wind', Math.min(2, Math.floor(k * 3)), o];
      if (b.atk === 'charge') return ['charge_wind', Math.min(1, Math.floor(k * 2)), o];
      return ['cleave_wind', Math.min(2, Math.floor(k * 3)), o];
    }
    default: return loop('guard', 2, 2);
  }
}

function drawWarden(b) {
  const cx = b.x + b.w / 2, fy = b.y + b.h, dead = b.st === 'dead' || b.st === 'gone';

  if (b.st === 'wind') {                                           // --- the tells ---
    const p = .55 + .45 * Math.abs(Math.sin(g.t * 9));
    if (b.atk === 'cleave') {
      ctx.fillStyle = `rgba(255,77,28,${.3 * p})`;
      ctx.beginPath(); ctx.moveTo(cx, fy); ctx.lineTo(cx + b.dir * 250, fy); ctx.lineTo(cx + b.dir * 250, fy - 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,190,110,${.95 * p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + b.dir * 22, fy - 1); ctx.lineTo(cx + b.dir * 250, fy - 1); ctx.stroke();
      ctx.lineWidth = 2;                                            // chevrons running out along the floor
      for (let i = 0; i < 4; i++) {
        const d = 70 + i * 46 + (g.t * 90 % 46);
        ctx.beginPath(); ctx.moveTo(cx + b.dir * d, fy - 12); ctx.lineTo(cx + b.dir * (d + 14), fy - 12); ctx.stroke();
      }
    } else if (b.atk === 'double') {                                 // both directions, twice
      ctx.fillStyle = `rgba(255,77,28,${.26 * p})`;
      for (const d of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(cx, fy); ctx.lineTo(cx + d * 230, fy); ctx.lineTo(cx + d * 230, fy - 30); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = `rgba(255,190,110,${.9 * p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 230, fy - 1); ctx.lineTo(cx + 230, fy - 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 150, fy - 14); ctx.lineTo(cx + 150, fy - 14); ctx.stroke();
    } else if (b.atk === 'charge') {
      ctx.strokeStyle = `rgba(255,77,28,${.6 * p})`; ctx.lineWidth = 3;
      ctx.setLineDash([16, 12]); ctx.lineDashOffset = -g.t * 90;
      ctx.beginPath(); ctx.moveTo(cx, fy - 3); ctx.lineTo(cx + b.dir * 500, fy - 3); ctx.stroke();   // the true charge length
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
  }

  if (b.st === 'enrage') {                                         // the turn: he flares and calls the fire
    const k = b.t / 1.3;
    for (let i = 0; i < 3; i++) {
      const f = (k * 2.4 + i / 3) % 1, r = 40 + f * 210;
      ctx.strokeStyle = `rgba(255,130,60,${.55 * (1 - f)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, fy - 38, r, 0, 7); ctx.stroke();
    }
    glow(cx, fy - 38, 170, .5);
  }

  if (!dead && b.st !== 'dormant') glow(cx, fy - 44, b.phase === 2 ? 88 : 66, b.phase === 2 ? .24 : .14);
  const fr = wardenFrame(b);                                        // the pixel sprite does the body
  ctx.globalAlpha = b.st === 'rise' ? .25 + .75 * Math.min(1, b.t / 1.1) : 1;
  const sc = b.scale || 1;
  if (sc !== 1) { ctx.save(); ctx.translate(cx, fy); ctx.scale(sc, sc); ctx.translate(-cx, -fy); }
  drawWardenSprite(ctx, fr[0], fr[1], cx, fy, b.dir, fr[2]);
  if (sc !== 1) ctx.restore();
  ctx.globalAlpha = 1;

  if (b.st === 'wind' && b.atk === 'volley') {                     // gathering embers in the off hand
    const n = b.phase === 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const aa = g.t * 7 + i * 6.283 / n, r = 15 + Math.sin(g.t * 9 + i) * 3;
      const ox = cx + b.dir * 34 + Math.cos(aa) * r, oy = b.y + 12 + Math.sin(aa) * r * .6;
      glow(ox, oy, 24, .3);
      drawMote(ctx, i % 2, ox, oy);
    }
  }
  if (b.st === 'stun') {                                           // dazed: the punish window
    for (let i = 0; i < 3; i++) {
      const aa = g.t * 5 + i * 2.09, sx = cx + Math.cos(aa) * 24, sy = b.y - 8 + Math.sin(aa) * 7;
      glow(sx, sy, 18, .3);
      ctx.fillStyle = '#ffd479';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, 7); ctx.fill();
    }
  }

  for (const s of b.shots) {                                       // ember spikes: lobbed, or sent home
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin || 0);
    ctx.fillStyle = s.reflected ? '#fff6e0' : '#ff7a33';
    ctx.strokeStyle = s.reflected ? '#ffd479' : '#ffb066'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 ? 4.5 : 11, a = i * Math.PI / 4;
      if (i) ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); else ctx.moveTo(rad, 0);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    glow(s.x, s.y, s.reflected ? 44 : 28, s.reflected ? .5 : .3);
    if (s.reflected) {
      ctx.strokeStyle = 'rgba(255,240,200,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * .03, s.y - s.vy * .03); ctx.stroke();
    }
  }
  for (const w of b.waves) {                                       // ground shockwave: jump it
    const n = 3, sp = w.w / n;
    ctx.fillStyle = '#ff4d1c'; ctx.strokeStyle = '#ffb066'; ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) {
      const x0 = w.x + i * sp;
      ctx.beginPath(); ctx.moveTo(x0, w.y + w.h); ctx.lineTo(x0 + sp / 2, w.y - 6); ctx.lineTo(x0 + sp, w.y + w.h); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    glow(w.x + w.w / 2, w.y + w.h / 2, 46, .3);
  }
}

function render() {
  if (g.state === 'card') return renderCard();
  const p = g.p;
  let camT = Math.max(0, Math.min(g.l.w - VW, p.x - 380));
  if (g.boss && g.boss.st !== 'dormant' && g.boss.hp > 0) {       // keep the Warden in frame during the fight
    const mid = p.x + (g.boss.x + g.boss.w / 2 - p.x) * .45;
    camT = Math.max(0, Math.min(g.l.w - VW, mid - VW / 2));
  }
  g.cam.x += (camT - g.cam.x) * .12;
  const ty = g.l.vscroll ? Math.max(0, Math.min(g.l.h - VH, p.y - 270)) : 0;   // S4: climb only when the level says so
  g.cam.y += (ty - g.cam.y) * .12;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const th = g.l.theme != null ? THEMES[g.l.theme] : null;
  const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, th ? th.sky : C.bg); sky.addColorStop(1, th ? th.sky2 : '#18203f');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = C.moon; for (const [x, y, z] of stars) { ctx.globalAlpha = .3 + .4 * Math.abs(Math.sin(g.t * .8 + x)); ctx.fillRect(x, y, z, z); } ctx.globalAlpha = 1;
  const mx = 760 - g.cam.x * .04;
  ctx.globalCompositeOperation = 'lighter'; const mg = ctx.createRadialGradient(mx, 110, 20, mx, 110, 150); mg.addColorStop(0, 'rgba(180,200,255,.25)'); mg.addColorStop(1, 'rgba(180,200,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - 150, -40, 300, 300); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#e8efff'; ctx.beginPath(); ctx.arc(mx, 110, 34, 0, 7); ctx.fill();
  ridge(.25, '#0f1730', 330, 100, 240); ridge(.5, '#131c3a', 400, 70, 170);

  ctx.setTransform(1, 0, 0, 1, -g.cam.x + (Math.random() - .5) * g.shk * 2, -g.cam.y + (Math.random() - .5) * g.shk * 2);
  for (const s of g.l.solids) {
    if (s.off) continue;                                           // crumbled away
    const rx = s.st === 'shake' ? (Math.random() - .5) * 3 : 0;    // rattle while it gives way
    if (s.pass) {                                                  // lit-only bridge, currently dark
      ctx.strokeStyle = 'rgba(185,189,245,.30)'; ctx.lineWidth = 2; ctx.setLineDash([7, 7]);
      ctx.strokeRect(s.x + rx, s.y, s.w, s.h); ctx.setLineDash([]); continue;
    }
    if (s.fade !== undefined && s.fade < 1) ctx.globalAlpha = s.fade;
    drawSolid(ctx, { x: s.x + rx, y: s.y, w: s.w, h: s.h }, g.style, s.broken);
    if (s.fade !== undefined && s.fade < 1) ctx.globalAlpha = 1;
  }
  for (const wz of g.wind) if (wz.active) {                       // V: visible ash streaks
    ctx.strokeStyle = 'rgba(207,216,238,.20)'; ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) { const t = (g.t * 240 + k * 97) % (wz.w + 140), x = wz.x - 70 + (wz.dir > 0 ? t : wz.w + 70 - t), y = 290 + (k * 53) % 140; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wz.dir * 28, y - 3); ctx.stroke(); }
  }
  for (const hz of g.l.hazards) if (hz.type === 'spike') drawSpikes(ctx, hz);   // S6: orange danger
  const G = g.l.gate, seal = g.boss && g.boss.hp > 0;              // castle gate
  if (g.l.throne) drawThrone(g.l.throne);                          // the seat behind it
  ctx.fillStyle = C.stone2; ctx.fillRect(G.x - 14, G.y - 16, G.w + 28, G.h + 16);
  ctx.fillStyle = seal ? '#3b2b22' : '#cfe0ff'; ctx.beginPath(); ctx.moveTo(G.x, G.y + G.h); ctx.lineTo(G.x, G.y + 28); ctx.arc(G.x + G.w / 2, G.y + 28, G.w / 2, Math.PI, 0); ctx.lineTo(G.x + G.w, G.y + G.h); ctx.fill();
  if (seal) {                                                      // a ward over the door until he falls
    const sx = G.x + G.w / 2, sy = G.y + G.h / 2 + 8;
    ctx.strokeStyle = C.ember; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sx, sy, 18, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 11, sy); ctx.lineTo(sx + 11, sy); ctx.stroke();
    glow(sx, sy, 52, .2);
  }
  if (g.l.bell) {                                                  // the bell itself, hung over the tower's door
    ctx.save(); ctx.translate(G.x + G.w / 2, G.y - 44); ctx.rotate(Math.sin(g.t * 1.5) * .1);
    ctx.strokeStyle = '#8f9bb8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -6); ctx.stroke();
    ctx.fillStyle = '#c9b06b'; ctx.strokeStyle = '#6b5a2e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-15, 2); ctx.quadraticCurveTo(-13, -16, 0, -17); ctx.quadraticCurveTo(13, -16, 15, 2); ctx.lineTo(18, 6); ctx.lineTo(-18, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a7333'; ctx.beginPath(); ctx.arc(0, 10, 4, 0, 7); ctx.fill();
    ctx.restore();
  }
  for (const { x, y, lit, cp } of g.l.torches) {
    const f = 1 + Math.sin(g.t * 12 + x) * .15;
    drawTorch(ctx, x, y, lit, g.t + x * .017);
    if (lit) glow(x, y - 56, 110 * f, .32);
    else if (cp) {                                                 // cold wick: swing your sword to light it
      ctx.strokeStyle = 'rgba(255,179,71,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 52, 12, 0, 7); ctx.stroke();
    }
  }
  for (const sw of g.switches) {                                   // lantern bowls: swing or throw to wake them
    ctx.fillStyle = C.ink; ctx.fillRect(sw.x - 4, sw.y - 22, 8, 22);
    ctx.fillStyle = sw.on ? POP.lantern : '#3a4257'; ctx.fillRect(sw.x - 10, sw.y - 28, 20, 8);
    if (sw.on) {
      glow(sw.x, sw.y - 32, 130, .3);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(sw.x - 4, sw.y - 37, 8, 10);
      ctx.fillStyle = POP.lantern; ctx.fillRect(sw.x - 2, sw.y - 35, 4, 6);
    } else {
      ctx.strokeStyle = 'rgba(255,242,176,.32)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sw.x, sw.y - 26, 14, 0, 7); ctx.stroke();
    }
  }
  for (const [x, y] of g.l.lights) {                               // Crypt: embers marking the footholds
    const f = 1 + Math.sin(g.t * 9 + x) * .18;
    ctx.fillStyle = C.ember; ctx.beginPath(); ctx.arc(x, y - 6, 3 * f, 0, 7); ctx.fill();
  }
  for (const s of g.sparks) {                                      // a thrown spark, still in the air
    glow(s.x, s.y, 56, .4);
    ctx.fillStyle = POP.lantern; ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
  }
  for (const l of g.lamps) {                                       // a burning lantern
    const k = Math.min(1, l.t / .6), f = 1 + Math.sin(g.t * 12 + l.x) * .12;
    glow(l.x, l.y, 150 * k, .34 * k);
    ctx.fillStyle = POP.lantern; ctx.beginPath(); ctx.arc(l.x, l.y, 3.4 * f, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,242,176,${.4 * k})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(l.x, l.y, 9, 0, 7); ctx.stroke();
  }
  for (const c of g.coins) if (!c.got) drawCoin(ctx, c.x, c.y + Math.sin(g.t * 3 + c.x) * 2, g.t + c.x * .11);
  for (const h of g.hearts) if (!h.got) drawHeartPickup(ctx, h.x, h.y - 8 + Math.sin(g.t * 3) * 2, 22);
  if (g.sigil && !g.sigil.got) {                                   // the ember dash, waiting on its ledge
    const sy = g.sigil.y + Math.sin(g.t * 2.4) * 5, r = 10 + Math.sin(g.t * 5) * 1.5;
    ctx.save(); ctx.translate(g.sigil.x, sy); ctx.rotate(g.t * 1.4);
    ctx.fillStyle = C.ember; ctx.strokeStyle = C.moon; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * .68, 0); ctx.lineTo(0, r); ctx.lineTo(-r * .68, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    glow(g.sigil.x, sy, 74, .3);
  }
  if (g.lanternSigil && !g.lanternSigil.got) {                     // the Ember Lantern, waiting on its ledge
    const sy = g.lanternSigil.y + Math.sin(g.t * 2.2) * 5, lx = g.lanternSigil.x;
    glow(lx, sy, 88, .32);
    ctx.fillStyle = POP.lantern; ctx.fillRect(lx - 6, sy - 7, 12, 14);
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(lx - 4, sy - 5, 8, 10);
    ctx.fillStyle = C.ink; ctx.fillRect(lx - 7, sy - 11, 14, 3); ctx.fillRect(lx - 2, sy - 14, 4, 3);
    ctx.strokeStyle = POP.lantern; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, sy + 2, 15, 0, 7); ctx.stroke();
  }
  for (const tr of g.trails) {                                     // fresh slag patches
    const k = Math.max(.25, tr.t / .8);
    ctx.fillStyle = `rgba(255,120,40,${.55 * k})`; ctx.fillRect(tr.x - 6, tr.y - 6 - k * 4, 12, 8 + k * 4);
    ctx.fillStyle = `rgba(255,208,138,${.5 * k})`; ctx.fillRect(tr.x - 2, tr.y - 8 - k * 4, 4, 6);
  }
  if (g.tide) {                                                    // the ember tide
    const ty = g.tide.y;
    const grd = ctx.createLinearGradient(0, ty - 6, 0, ty + 220);
    grd.addColorStop(0, 'rgba(255,170,90,.8)'); grd.addColorStop(.22, 'rgba(255,77,28,.8)'); grd.addColorStop(1, 'rgba(92,24,8,.96)');
    ctx.fillStyle = grd; ctx.fillRect(-200, ty, g.l.w + 400, g.l.h + 400);
    ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = -200; x <= g.l.w + 200; x += 24) {
      const y = ty + Math.sin(x * .011 + g.t * 2.2) * 5 + Math.sin(x * .027 - g.t * 3.1) * 3;
      if (x === -200) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let k = 0; k < 8; k++) glow(((g.t * 60 + k * 271) % (g.l.w + 200)) - 100, ty + 12, 70, .18);
  }
  for (const e of g.enemies) drawEnemy(e);
  for (const a of g.arrows) {                                      // bolts, hot once reflected
    const d = Math.hypot(a.vx, a.vy) || 1, ux = a.vx / d, uy = a.vy / d;
    ctx.strokeStyle = a.reflected ? '#fff2b0' : '#ffb066'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - ux * 15, a.y - uy * 15); ctx.stroke();
    ctx.fillStyle = a.reflected ? '#ffffff' : C.ember; ctx.fillRect(a.x - 2, a.y - 2, 4, 4);
  }
  if (g.boss) drawWarden(g.boss);
  knight(p);
  for (const q of g.parts) { ctx.globalAlpha = Math.min(1, q.l * 2); ctx.fillStyle = q.col; ctx.fillRect(q.x, q.y, 3, 3); } ctx.globalAlpha = 1;
  if (g.dark > .01) darken();                                      // S7: torchlight only

  ctx.setTransform(1, 0, 0, 1, 0, 0);                              // HUD
  for (let i = 0; i < 3; i++) { heart(30 + i * 30, 18, 22); if (i < p.hp) { ctx.fillStyle = C.moon; ctx.fill(); } else { ctx.strokeStyle = '#4a5578'; ctx.lineWidth = 2; ctx.stroke(); } }
  ctx.fillStyle = '#f2eac0'; ctx.beginPath(); ctx.arc(30, 62, 8, 0, 7); ctx.fill();
  T(`x ${run.coins}/${TOTAL_COINS}`, 46, 68, 18);
  const cpT = g.l.torches.filter(t => t.cp);                        // Crypt: torch-checkpoint tally
  if (cpT.length) {
    const lit = cpT.filter(t => t.lit).length;
    ctx.fillStyle = lit ? C.ember : '#4a5578';
    ctx.beginPath(); ctx.moveTo(30, 84); ctx.quadraticCurveTo(37, 92, 30, 98); ctx.quadraticCurveTo(23, 92, 30, 84); ctx.fill();
    T(`x ${lit}/${cpT.length}`, 46, 96, 18, 'left', lit ? C.moon : '#8f9bb8');
  }
  const tm = g.time; T(`${String(tm / 60 | 0).padStart(2, '0')}:${(tm % 60).toFixed(1).padStart(4, '0')}`, VW - 24, 36, 20, 'right');
  if (A.isMuted()) T('MUTED', VW - 24, 60, 14, 'right', '#8f9bb8');
  if (run.abil.dash) {                                             // earned: dash charge chevrons
    ctx.strokeStyle = p.dashUsed ? '#3a4257' : C.ember; ctx.lineWidth = 2.5;
    for (let i = 0; i < 2; i++) { const x = 26 + i * 8; ctx.beginPath(); ctx.moveTo(x, 108); ctx.lineTo(x + 6, 116); ctx.lineTo(x, 124); ctx.stroke(); }
  }
  if (run.abil.lantern) {                                          // lantern charges
    for (let i = 0; i < 3; i++) {
      const on = i < g.lamp;
      ctx.fillStyle = on ? POP.lantern : '#3a4257'; ctx.fillRect(26 + i * 12, 134, 8, 10);
      ctx.fillStyle = on ? '#ffd84a' : '#2a3348'; ctx.fillRect(28 + i * 12, 136, 4, 6);
    }
  }
  if (g.grant > 0) {                                               // teaching banner, on the safe ledge
    ctx.globalAlpha = Math.min(1, g.grant / .5) * Math.min(1, (3.6 - g.grant) * 2.5);
    ctx.fillStyle = 'rgba(5,7,15,.72)'; ctx.fillRect(VW / 2 - 250, 166, 500, 76);
    T(g.grantKind === 'lantern' ? 'EMBER LANTERN' : 'EMBER DASH', VW / 2, 205, 32, 'center', C.ember);
    T(g.grantKind === 'lantern' ? 'E \u2014 throw a spark of light' : 'SHIFT \u2014 one surge per jump', VW / 2, 232, 16, 'center');
    ctx.globalAlpha = 1;
  }
  if (g.boss && g.boss.st !== 'dormant' && g.boss.hp > 0) {         // boss health
    const n = g.boss.max, bw = Math.min(360, n * 26), bx = VW / 2 - bw / 2, by = 30;
    T((g.boss.title || 'ASH WARDEN') + (g.boss.phase > 1 ? '  ' + ['', 'I', 'II', 'III'][g.boss.phase] : ''), VW / 2, 20, 13, 'center', C.ember);
    for (let i = 0; i < n; i++) {
      const w = (bw - (n - 1) * 3) / n;
      ctx.fillStyle = i < g.boss.hp ? (g.boss.phase === 2 ? '#ff2d00' : '#ff4d1c') : '#2a3348';
      ctx.fillRect(bx + i * (w + 3), by + 4, w, 7);
    }
  }
  if (g.boss && g.boss.st === 'enrage') {
    ctx.globalAlpha = Math.min(1, g.boss.t * 2) * Math.min(1, (1.3 - g.boss.t) * 3);
    T('THE ASH WARDEN BURNS BRIGHTER', VW / 2, 168, 24, 'center', C.ember);
    ctx.globalAlpha = 1;
  }
  if (g.sealT > 0 && g.state !== 'win') {
    ctx.globalAlpha = Math.min(1, g.sealT);
    T('THE WAY IS SEALED', VW / 2, 168, 22, 'center', C.ember);
    ctx.globalAlpha = 1;
  }
  if (g.reveal > 0 && g.l.reveal) {                                // VII: the reveal beat
    ctx.globalAlpha = Math.min(1, g.reveal / .6);
    ctx.fillStyle = 'rgba(5,7,15,.82)'; ctx.fillRect(VW / 2 - 340, 168, 680, 54);
    T(g.l.reveal, VW / 2, 202, 18, 'center', '#dfe8ff');
    ctx.globalAlpha = 1;
  }
  if (g.slain > 0) {
    ctx.globalAlpha = Math.min(1, g.slain / .5);
    T('THE ASH WARDEN FALLS', VW / 2, 168, 30, 'center', C.ember);
    T('THE WAY IS OPEN', VW / 2, 198, 16, 'center');
    ctx.globalAlpha = 1;
  }
  if (g.msg > 0 && g.state !== 'menu' && g.state !== 'win') { ctx.globalAlpha = Math.min(1, g.msg); T(g.l.title, VW / 2, 90, 40, 'center'); if (g.l.hint) T(g.l.hint, VW / 2, 118, 15, 'center', '#8f9bb8'); if (g.l.line) T(g.l.line, VW / 2, 142, 17, 'center', '#dfe8ff'); T(`\u2190 \u2192 / A D move    SPACE jump    J / X attack${run.abil.dash ? '    SHIFT dash' : ''}    M mute    R restart    ESC phases`, VW / 2, VH - 24, 15, 'center'); ctx.globalAlpha = 1; }
  if (g.state === 'win') {
    ctx.fillStyle = `rgba(5,7,15,${Math.min(.88, g.win * 1.5)})`; ctx.fillRect(0, 0, VW, VH);
    if (g.win > .25) {
      const n = Math.min(26, g.litCount || 0), gap = n > 1 ? Math.min(32, (VW - 220) / n) : 0;
      const x0 = VW / 2 - (n - 1) * gap / 2;
      for (let i = 0; i < n; i++) drawTorch(ctx, x0 + i * gap, 258, g.win > .5 + i * .07, g.t + i * .4);
      T('THE EMBER HEART', VW / 2, 112, 38, 'center');
      if (n) T(`${n} flame${n === 1 ? '' : 's'} kept`, VW / 2, 296, 16, 'center', '#8f9bb8');
      if (g.win > 1.9) T('A flame kept is a flame lost.', VW / 2, 344, 20, 'center', C.ember);
      if (g.win > 2.4) T('Share it.', VW / 2, 374, 22, 'center', C.moon);
      if (g.win > 1.1) T(`Coins  ${run.coins} / ${TOTAL_COINS}`, VW / 2, 424, 20, 'center');
      if (g.win > 1.3) T(`Time   ${g.time.toFixed(1)}s`, VW / 2, 452, 20, 'center');
      if (g.win > 2.6) T('R  replay      ESC  phase select', VW / 2, 502, 16, 'center', C.ember);
    }
  }
  if (g.state === 'menu') renderMenu();
}

function renderMenu() {
  const n = LEVELS.length, sel = g.menu.sel;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(5,7,15,.93)'; ctx.fillRect(0, 0, VW, VH);
  T('SELECT PHASE', VW / 2, 92, 30, 'center', C.ember);
  const top = 150, rowH = Math.min(72, Math.floor((VH - 236) / n));
  for (let i = 0; i < n; i++) {
    const y = top + i * rowH, on = sel === i, open = unlocked(i);
    const done = !!(run.cleared && run.cleared[i]), cur = i === run.lvl;
    const x0 = 168, wd = VW - 336;
    if (on && open) {
      ctx.fillStyle = 'rgba(255,138,61,.13)'; ctx.fillRect(x0, y - 27, wd, 56);
      ctx.strokeStyle = C.ember; ctx.lineWidth = 2; ctx.strokeRect(x0, y - 27, wd, 56);
    }
    ctx.globalAlpha = open ? 1 : .3;
    ctx.fillStyle = SWATCH[LEVELS[i].style] || C.stone; ctx.fillRect(x0 + 14, y - 9, 18, 18);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x0 + 14, y - 9, 18, 18);
    T(`${ROMAN[i]}   ${LEVELS[i].name}`, x0 + 46, y + 7, 21, 'left', on && open ? C.ember : C.moon);
    if (done) T('\u2713', x0 + wd - 20, y + 7, 22, 'right', C.ember);
    else if (!open) T('LOCKED', x0 + wd - 20, y + 5, 14, 'right', '#8f9bb8');
    else if (cur) T('CURRENT', x0 + wd - 20, y + 5, 13, 'right', '#8f9bb8');
    ctx.globalAlpha = 1;
  }
  T('\u2190 \u2192  select      J / ENTER  begin      ESC  back', VW / 2, VH - 44, 15, 'center', '#8f9bb8');
}

let last = 0;
function frame(ts) {
  const dt = Math.min(.033, (ts - last) / 1000 || 0); last = ts;
  if (pressed.menu) { toggleMenu(); pressed.menu = false; }
  if (pressed.restart) { if (g.state !== 'card') loadLevel(g.lvl); pressed.restart = false; }
  if (pressed.mute) { A.toggle(); pressed.mute = false; }
  if (g.stopT > 0) g.stopT -= dt;                                  // hit-stop: freeze, keep buffered input
  else { update(dt); clearPressed(); }
  render(); requestAnimationFrame(frame);
}
addEventListener('keydown', () => A.init());
addEventListener('beforeunload', saveRun);
loadLevel(run.lvl); requestAnimationFrame(frame);                 // resume at the saved phase

// test hook for the headless harness (no runtime cost, never drawn)
export const dbg = { get g() { return g; }, get run() { return run; }, loadLevel, enterCard, nextPhase, save: saveRun };
