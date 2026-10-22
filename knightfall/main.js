import { pressed, clearPressed, hits } from './input.js';
import * as A from './audio.js';
import { LEVELS, TOTAL_COINS, PROLOGUE, EPILOGUE } from './level.js';
import { Player, hit } from './player.js';
import { makeEnemy } from './enemies.js';
import { AshWarden } from './boss.js';
import { AshKing } from './king.js';
import { createMenu } from './menu.js';
import * as SND from './sound.js';
import { drawKing } from './ashking.js';
import { drawKnight, setKnight, SKIN_NAMES, SKINS } from './sprites.js';
import { drawWarden as drawWardenSprite, drawMote } from './ashwarden.js';
import { drawMob } from './mobs.js';
import * as NEWMOBS from './mobsprites.js';
import { THEMES, POP } from './themes.js';
import { drawSolid, drawTorch, drawCoin, drawHeartPickup, drawSpikes, SWATCH } from './tiles.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d'), VW = 960, VH = 540;
const BAR = 34, BARB = 18, SH = VH;                   // status strips cut into the 960x540 frame
const BOT = VH - BARB;                                // nothing important below this line
const C = { bg: '#0b1021', stone: '#232a3f', stone2: '#2f3750', moon: '#dfe8ff', ember: '#ff8a3d', ink: '#05070f', rim: 'rgba(255,138,61,.55)' };
const stars = Array.from({ length: 60 }, (_, i) => [(i * 137.5) % VW, (i * 53.3) % 300, i % 3 + 1]);
let g;

/* ---- persistent run (S1/S9): hearts, coins and unlocks survive phases AND reloads ---- */
const SAVE_KEY = 'emberknight.v1';
const freshRun = () => ({ lvl: 0, hp: 2, coins: 0, time: 0, abil: { dash: false, lantern: false }, got: {}, lit: {}, cleared: LEVELS.map(() => false),
  skin: 'iron', emberSword: false, titled: false });
function loadRun() {
  try {
    const s = typeof localStorage !== 'undefined' ? localStorage.getItem(SAVE_KEY) : null;
    if (s) {
      const r = JSON.parse(s);
      if (r && typeof r.hp === 'number') {
        const out = { ...freshRun(), ...r, abil: { ...freshRun().abil, ...(r.abil || {}) } };
        out.cleared = LEVELS.map((_, i) => !!(Array.isArray(r.cleared) && r.cleared[i]));
        out.emberSword = !!r.emberSword; out.titled = !!r.titled;
        if (!SKIN_NAMES.includes(out.skin)) out.skin = 'iron';
        return out;
      }
    }
  } catch (e) { /* private mode, or node harness */ }
  return freshRun();
}
let run = loadRun();
setKnight(run.skin, run.emberSword);
function saveRun() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(SAVE_KEY, JSON.stringify(run)); } catch (e) {} }
const picked = (i, k) => (run.got[i] = run.got[i] || { c: [], h: [] })[k];   // per-phase pickup ledger

const stopMusic = () => { SND.stopMusic(); A.setJingle(true); };   // back to the chiptune when no boss owns the room

function loadLevel(i) {
  stopMusic();
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
    bossCue: 0, bossPhaseCue: 1, bossPrev: null,
    grant: 0, grantKind: 'dash', boss: l.king ? new AshKing(l.king) : l.boss ? new AshWarden(l.boss) : null, sealT: 0, slain: 0,
    lamps: [], sparks: [], arrows: [], lamp: run.abil.lantern ? 3 : 0, wind: l.wind || [],
    tide: l.tide ? { y: l.tide.y0 } : null, tideT: l.tide ? 5 : 2, trails: [],
    switches: (l.switches || []).map(s => ({ ...s, on: 0 })), reveal: 0, revealShown: 0,
    lanternSigil: l.lantern ? { ...l.lantern, got: run.abil.lantern ? 1 : 0 } : null,
    parts: [], cam: { x: Math.max(0, Math.min(l.w - VW, p.x - 380)), y: camY }, shk: 0, stopT: 0, t: 0, cp: l.cps[0],
    style: l.style || 'road',
    state: 'play', time: 0, msg: 7.5, win: 0, card: null, dark: 0,
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
  g.card = { t: 0, dur: 7.0, next, title: title || `PHASE ${next + 1}`, sub: sub || LEVELS[next].name };   // long enough to read the lore
}
function nextPhase() {
  stopMusic();
  const nx = g.lvl + 1;
  run.hp = g.p.hp;
  run.cleared[g.lvl] = true;                                     // unlocks this phase in the menu
  saveRun();
  if (nx >= LEVELS.length) {
    g.state = 'win'; g.win = 0;
    g.litCount = Object.values(run.lit).reduce((n, a) => n + a.length, 0);
    run.titled = true; run.emberSword = true; setKnight(run.skin, true); saveRun();   // the title and the ember sword, for good
    A.sfx.win(); return;
  }
  enterCard(nx);
}

/* ---- menus: menu.js owns the title screen, phases, colours, controls and new-game confirm ---- */
const hasProgress = () => run.time > 0 || run.coins > 0 || run.lvl > 0 || run.abil.dash || run.abil.lantern || run.cleared.some(Boolean);
const menu = createMenu({
  save: null,
  audio: {
    move: () => A.sfx.land(), select: () => A.sfx.coin(), back: () => A.sfx.block(),
    swing: () => A.sfx.swing(), kill: () => A.sfx.kill(),   // the menu diorama's quiet fight
    toggleMute: () => { A.toggle(); SND.setMuted(A.isMuted()); syncMenu(); },
    isMuted: () => A.isMuted(),
  },
  onAction: a => menuAction(a),
});
function syncMenu() { menu.setSave(hasProgress() ? { level: run.lvl, cleared: run.cleared, skin: run.skin } : null); }
function menuAction(a) {
  if (a.type === 'continue') { g.state = 'play'; A.sfx.grant(); }
  else if (a.type === 'new') newJourney();
  else if (a.type === 'phase') { loadLevel(a.index); g.state = 'play'; saveRun(); syncMenu(); }
  else if (a.type === 'color') { run.skin = SKIN_NAMES[a.index] || 'iron'; setKnight(run.skin, run.emberSword); saveRun(); syncMenu(); }
}
function newJourney() {
  const skin = run.skin;
  run = { ...freshRun(), skin };
  setKnight(run.skin, false);
  stopMusic();
  saveRun();
  syncMenu();
  g.story = { pages: PROLOGUE, i: 0, after: 'level0', t: 0 };
  g.state = 'story';
}
function updateStory(dt) {
  g.story.t += dt;                                                 // one second to read before a key can skip
  if (g.story.t < 1) return;
  if (pressed.atk || pressed.ok || pressed.jump) {
    g.story.i++; g.story.t = 0;
    if (g.story.i >= g.story.pages.length) {
      g.story = null;
      loadLevel(0); saveRun();
    } else A.sfx.land();
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
  stopMusic(); g.bossCue = 0; g.bossPhaseCue = 1; g.bossPrev = null;
  if (g.tide) { g.tide.y = Math.min(g.l.tide.y0, g.cp[1] + 280); g.tideT = 2; } };   // VI: the tide drops back under you
// Enemy hurtboxes reach slightly past the drawn body so swings feel generous.
// Contact damage keeps the tight box, so nothing hurts you from further away.
const PAD = { goblin: [5, 5], shield: [5, 5], bat: [6, 8] };
const reach = e => { const [px, py] = PAD[e.type] || [4, 4]; return { x: e.x - px, y: e.y - py, w: e.w + px * 2, h: e.h + py * 2 }; };

function update(dt) {
  const p = g.p; g.t += dt; g.msg -= dt;
  if (g.state === 'menu') { menu.update(dt); return; }
  if (g.state === 'story') { updateStory(dt); return; }
  if (g.state === 'win') { g.win += dt; if ((pressed.atk || pressed.jump) && g.win < 16.8) g.win = 16.8; return; }
  if (g.state === 'card') {                                       // between-phase card: hold, then boot next
    g.card.t += dt;
    if (g.card.t >= g.card.dur || ((pressed.atk || pressed.jump) && g.card.t > .6)) loadLevel(g.card.next);
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
  if (g.boss) {                                                   // recorded cues: theme, tells, phases, death
    const b = g.boss, king = b.sheet === 'king', prev = g.bossPrev || {};
    if (b.st !== 'dormant' && !g.bossCue) {
      g.bossCue = 1;
      SND.sting(king ? 'kingIntro' : 'wardenIntro', .6);
      SND.music(king ? 'kingMusic' : 'wardenMusic');
      A.setJingle(!SND.playing());                              // the recorded theme takes over: no chiptune under it
    }
    if (b.st === 'wind' && prev.st !== 'wind') SND.sting(king ? 'kingAttack' : 'wardenAttack', .5);
    if (king && b.phase > (g.bossPhaseCue || 1)) {
      g.bossPhaseCue = b.phase;
      SND.sting(b.phase === 3 ? 'kingPhase3' : 'kingPhase2');
    }
    if (b.hp <= 0 && (prev.hp || 1) > 0) { stopMusic(); SND.sting(king ? 'kingDeath' : 'wardenDeath', .65); }
    g.bossPrev = { st: b.st, hp: b.hp };
  }

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
  ctx.setTransform(1, 0, 0, 1, 0, BAR); ctx.drawImage(darkCv, 0, 0);
  for (const [x, y, r] of near) glow(x - c.x, y - c.y, r * .7, .16 * g.dark);            // warm pooled light
}

function renderCard() {                                            // S3: between-phase card
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, VW, VH);
  const a = Math.min(1, g.card.t * 1.6), b = Math.min(1, Math.max(0, g.card.t - .5) * 2);
  const CL = LEVELS[g.card.next];
  ctx.globalAlpha = a; T(g.card.title, VW / 2, 200, 22, 'center', '#8f9bb8');
  ctx.globalAlpha = b; T(g.card.sub, VW / 2, 252, 42, 'center');
  if (CL && CL.line) { ctx.globalAlpha = Math.max(0, b - .15); T(CL.line, VW / 2, 302, 18, 'center', C.ember); }
  if (CL && CL.lore) { ctx.globalAlpha = Math.max(0, b - .35); T(CL.lore, VW / 2, 336, 15, 'center', '#cfd8ee'); }
  ctx.globalAlpha = Math.min(1, Math.max(0, (g.card.t - 1.2) * 1.5));   // the prompt waits a beat, so a held key cannot skip
  T('J / X  to continue', VW / 2, 400, 15, 'center', '#8f9bb8'); ctx.globalAlpha = 1;
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
// Ash King: game state -> [sprite row, frame index]
function kingAnim(b) {
  const loop = (s, n, fps) => [s, Math.floor(b.t * fps) % n];
  switch (b.st) {
    case 'dormant': case 'rise': return ['idle', 0];
    case 'idle': return loop('idle', 2, 2);                      // he floats; walk frames would read as stomping
    case 'enrage': return b.phase === 3 ? ['snuff', Math.min(3, Math.floor(b.t / 1.2 * 4))] : ['rage', Math.min(2, Math.floor(b.t / 1.2 * 3))];
    case 'wind': {
      const k = Math.min(1, b.t / (b.wind || 1));
      if (b.atk === 'repulse') return ['cleave_wind', Math.min(2, Math.floor(k * 3))];
      return ['volley_wind', Math.min(2, Math.floor(k * 3))];     // any spell: the sceptre gathers
    }
    case 'act': return b.atk === 'repulse' ? ['cleave_slam', Math.min(1, Math.floor(b.t / .32 * 2))] : ['volley_throw', 0];
    case 'volley': return ['volley_throw', 0];
    case 'charge': return loop('charge', 3, 10);
    case 'recover': return loop('rest', 2, 2);
    case 'rest': return loop('rest', 2, 2);
    case 'stun': return loop('stun', 2, 6);
    case 'dead': case 'gone': return ['dead', Math.min(4, Math.floor(b.t / 2.2 * 5))];
    default: return loop('idle', 2, 2);
  }
}

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
  ctx.globalAlpha = b.st === 'rise' ? .25 + .75 * Math.min(1, b.t / 1.1) : 1;
  if (b.sheet === 'king') drawKing(ctx, ...kingAnim(b), cx, fy, b.dir, { phase: b.phase, flash: b.flash > 0, scale: 3 });
  else { const fr = wardenFrame(b); drawWardenSprite(ctx, fr[0], fr[1], cx, fy, b.dir, fr[2]); }
  ctx.globalAlpha = 1;

  if (b.st === 'wind' && b.atk !== 'repulse') {                    // any spell: the sceptre gathers them
    const n = b.phase === 3 ? 5 : b.phase === 2 ? 4 : 3;
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

  /* ---- the King's spells, drawn in world space ---- */
  for (const drop of b.drops || []) {                              // ember rain: the ring you must leave
    const down = drop.delay <= 0;
    ctx.strokeStyle = down ? 'rgba(255,220,150,.9)' : `rgba(255,170,80,${.35 + .45 * Math.abs(Math.sin(g.t * 12))})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(drop.x - 26, drop.surf - 3); ctx.lineTo(drop.x + 26, drop.surf - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(drop.x - 18, drop.surf - 8); ctx.lineTo(drop.x + 18, drop.surf - 8); ctx.stroke();
    if (!down) {                                                   // a standing shimmer marks the column
      const colH = 24 + 10 * Math.abs(Math.sin(g.t * 6 + drop.x));
      ctx.strokeStyle = 'rgba(255,150,70,.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(drop.x, drop.surf - 10); ctx.lineTo(drop.x, drop.surf - 10 - colH); ctx.stroke();
    }
    if (down) {
      glow(drop.x, drop.y, 26, .5);
      ctx.fillStyle = '#ffd479'; ctx.fillRect(drop.x - 3, drop.y - 8, 6, 12);
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(drop.x - 1, drop.y - 4, 2, 8);
    }
  }
  for (const sn of b.snares || []) {                               // snare pools: standing here pins you
    const w = 46;
    ctx.fillStyle = sn.armed ? 'rgba(255,110,50,.55)' : 'rgba(255,90,40,.28)';
    ctx.fillRect(sn.x - w / 2, sn.y - 4, w, 6);
    for (let i = 0; i < 4; i++) {
      const ox = -w / 2 + 7 + i * 12, h = 4 + Math.abs(Math.sin(g.t * 8 + i * 1.7)) * (sn.armed ? 12 : 4);
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(sn.x + ox, sn.y - 4 - h, 3, h);
    }
  }
  for (const ring of b.rings || []) {                              // the shove
    ctx.strokeStyle = `rgba(255,150,80,${.75 * (1 - ring.t / ring.life)})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, 7); ctx.stroke();
  }
  for (const fire of b.burns || []) {                              // a ledge set alight
    if (fire.delay > 0) {
      ctx.strokeStyle = `rgba(255,190,110,${.4 + .4 * Math.abs(Math.sin(g.t * 14))})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fire.x0, fire.y - 2); ctx.lineTo(fire.x1, fire.y - 2); ctx.stroke();
    } else {
      for (let x = fire.x0; x < fire.x1; x += 12) {
        const h = 7 + Math.abs(Math.sin(g.t * 9 + x * .27)) * 15;
        ctx.fillStyle = '#ff4d1c'; ctx.fillRect(x, fire.y - h, 9, h);
        ctx.fillStyle = '#ffd479'; ctx.fillRect(x + 3, fire.y - h * .6, 4, h * .6);
      }
      glow((fire.x0 + fire.x1) / 2, fire.y - 8, 60, .18);
    }
  }
  for (const e of b.erupts || []) {                                // eruption: the floor breaks in a line
    if (e.delay > 0) {
      ctx.fillStyle = `rgba(255,110,40,${.18 + .18 * Math.abs(Math.sin(g.t * 14))})`;
      ctx.fillRect(e.x - 15, e.surf - 4, 30, 4);
      ctx.strokeStyle = 'rgba(255,170,90,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(e.x - 9, e.surf - 3); ctx.lineTo(e.x - 5, e.surf - 9); ctx.lineTo(e.x, e.surf - 3);
      ctx.lineTo(e.x + 5, e.surf - 9); ctx.lineTo(e.x + 9, e.surf - 3); ctx.stroke();
    } else {
      const k = Math.max(0, Math.min(1, e.t / e.life)), h = 6 + 60 * Math.sin(Math.PI * k);
      ctx.fillStyle = '#ff5a24'; ctx.fillRect(e.x - 12, e.surf - h, 24, h);
      ctx.fillStyle = '#ffd479'; ctx.fillRect(e.x - 5, e.surf - h, 10, h);
      glow(e.x, e.surf - h * .5, 40, .35);
    }
  }
  for (const gr of b.grasps || []) {                                // ash grasp: an outline closes, then a hand
    const armed = gr.delay <= 0;
    ctx.fillStyle = `rgba(18,8,24,${armed ? .45 : .22 + .12 * Math.abs(Math.sin(g.t * 12))})`;
    ctx.fillRect(gr.x - 22, gr.y - 5, 44, 5);
    if (armed) {
      const h = 46 * Math.sin(Math.PI * Math.min(1, gr.t / (gr.life * .7)));
      ctx.strokeStyle = '#cfd8ee'; ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(gr.x + i * 9, gr.y); ctx.lineTo(gr.x + i * 13, gr.y - h); ctx.stroke(); }
      glow(gr.x, gr.y - h * .5, 26, .18);
    }
  }
  for (const me of b.meteors || []) {                               // a heavy ember with a ledge's name on it
    ctx.strokeStyle = `rgba(255,120,40,${.35 + .3 * Math.abs(Math.sin(g.t * 10))})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(me.x - 20, me.surf - 3); ctx.lineTo(me.x + 20, me.surf - 3); ctx.stroke();
    if (me.delay <= 0) {
      glow(me.x, me.y, 46, .5);
      ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(me.x, me.y, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd479'; ctx.beginPath(); ctx.arc(me.x - 2, me.y - 2, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,150,70,.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(me.x, me.y - 28); ctx.lineTo(me.x, me.y - 10); ctx.stroke();
    }
  }

  for (const bolt of b.bolts || []) {                              // Ember Bolt: swing it home
    glow(bolt.x, bolt.y, bolt.reflected ? 46 : bolt.heavy ? 40 : 26, bolt.reflected ? .55 : .4);
    ctx.save(); ctx.translate(bolt.x, bolt.y); ctx.rotate(bolt.spin || 0);
    ctx.fillStyle = bolt.reflected ? '#fff6e0' : bolt.heavy ? '#ff5a24' : '#ff8a3d';
    ctx.strokeStyle = bolt.reflected ? '#ffd479' : '#ffc08a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, bolt.r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, bolt.r + 3.5, .4, 2.6); ctx.stroke();
    ctx.restore();
  }

  for (const s of b.shots || []) {                                 // ember spikes: lobbed, or sent home
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
  for (const w of b.waves || []) {                                 // ground shockwave: jump it
    const n = 3, sp = w.w / n;
    ctx.fillStyle = '#ff4d1c'; ctx.strokeStyle = '#ffb066'; ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) {
      const x0 = w.x + i * sp;
      ctx.beginPath(); ctx.moveTo(x0, w.y + w.h); ctx.lineTo(x0 + sp / 2, w.y - 6); ctx.lineTo(x0 + sp, w.y + w.h); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    glow(w.x + w.w / 2, w.y + w.h / 2, 46, .3);
  }
}

/* ---- the status strips: everything that used to float over the arena ---- */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function drawStrips() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#04060c'; ctx.fillRect(0, 0, VW, BAR); ctx.fillRect(0, BOT, VW, BARB);
  ctx.fillStyle = 'rgba(255,138,61,.30)'; ctx.fillRect(0, BAR - 1, VW, 1);
  ctx.fillStyle = 'rgba(255,138,61,.16)'; ctx.fillRect(0, BOT, VW, 1);
  const playing = g.state === 'play', p = g.p;
  const midY = 22, botY = VH - 5;

  if (playing) {
    for (let i = 0; i < 3; i++) {
      heart(22 + i * 25, 16, 16);
      if (i < p.hp) { ctx.fillStyle = C.moon; ctx.fill(); }
      else { ctx.strokeStyle = '#39415c'; ctx.lineWidth = 1.6; ctx.stroke(); }
    }
    ctx.fillStyle = '#f2eac0'; ctx.beginPath(); ctx.arc(112, 16, 6, 0, 7); ctx.fill();
    T(`x ${run.coins}/${TOTAL_COINS}`, 124, midY, 13, 'left', '#cfd8ee');
    let ax = 224;
    if (run.abil.dash) {                                             // one surge per airtime
      ctx.strokeStyle = p.dashUsed ? '#39415c' : C.ember; ctx.lineWidth = 2.5;
      for (let i = 0; i < 2; i++) { const x = ax + i * 8; ctx.beginPath(); ctx.moveTo(x, 11); ctx.lineTo(x + 6, 17); ctx.lineTo(x, 23); ctx.stroke(); }
      ax += 26;
    }
    if (run.abil.lantern) {                                          // three sparks of light
      for (let i = 0; i < 3; i++) {
        const on = i < g.lamp, x = ax + i * 13;
        ctx.fillStyle = on ? POP.lantern : '#2a3348'; ctx.fillRect(x, 11, 8, 12);
        ctx.fillStyle = on ? '#ffd84a' : '#39415c'; ctx.fillRect(x + 2, 13, 4, 7);
      }
    }
    const tm = g.time;
    T(`${String(tm / 60 | 0).padStart(2, '0')}:${(tm % 60).toFixed(1).padStart(4, '0')}`, VW - 18, midY, 15, 'right', '#cfd8ee');
    if (A.isMuted()) T('M', VW - 78, 13, 10, 'right', '#5d6a8a');
  } else {
    T('EMBER KNIGHT', 18, midY, 12, 'left', '#5d6a8a');
  }

  if (playing && g.boss && g.boss.st !== 'dormant' && g.boss.hp > 0) {   // boss bar, in the frame
    const n = g.boss.max, bw = Math.min(340, n * 24), bx = VW / 2 - bw / 2;
    T((g.boss.title || 'THE ASH WARDEN') + (g.boss.phase > 1 ? '  ' + ['', 'I', 'II', 'III'][g.boss.phase] : ''), VW / 2, 12, 10, 'center', C.ember);
    for (let i = 0; i < n; i++) {
      const w = (bw - (n - 1) * 3) / n;
      ctx.fillStyle = i < g.boss.hp ? (g.boss.phase === 2 ? '#ff2d00' : '#ff4d1c') : '#2a3348';
      ctx.fillRect(bx + i * (w + 3), 19, w, 6);
    }
  } else if (playing) {
    T(LEVELS[g.lvl].name, VW / 2, midY, 12, 'center', '#4a5578');
  }

  const rom = ROMAN[g.lvl] || '';
  if (playing) T(`${rom} \u00b7 ${LEVELS[g.lvl].name}`, 18, botY, 11, 'left', '#5d6a8a');
  T(playing
    ? '\u2190 \u2192 MOVE   SPACE JUMP   J ATTACK   SHIFT DASH   E LANTERN   M MUTE   R RESTART   ESC MENU'
    : g.state === 'menu' ? (menu.screenName() === 'main' ? '\u2191\u2193 SELECT   ENTER CONFIRM   M MUTE' : 'ENTER / ESC  BACK')
      : g.state === 'win' ? '' : 'A FLAME KEPT IS A FLAME LOST',
    VW / 2, botY, 11, 'center', '#4a5578');
  if (playing) {
    const cpT = g.l.torches.filter(t => t.cp);
    if (cpT.length) T(`TORCHES ${cpT.filter(t => t.lit).length}/${cpT.length}`, VW - 18, botY, 11, 'right', '#5d6a8a');
    else if (run.titled) T('THE EMBER KNIGHT', VW - 18, botY, 11, 'right', C.ember);
  }
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, SH);             // the surround is part of the screen
  if (g.state === 'card') renderCard();
  else if (g.state === 'story') renderStory();
  else renderWorld();
  drawStrips();
}

function renderWorld() {
  const p = g.p;
  let camT = Math.max(0, Math.min(g.l.w - VW, p.x - 380));
  if (g.boss && g.boss.st !== 'dormant' && g.boss.hp > 0) {       // keep the boss in frame during the fight
    const bx = g.boss.x + g.boss.w / 2;
    const mid = p.x + (bx - p.x) * .45;
    camT = Math.max(0, Math.min(g.l.w - VW, mid - VW / 2));
    camT = Math.max(camT, bx + 130 - VW);                          // and never let him slip off the edge
    camT = Math.min(camT, bx - 130);
    camT = Math.max(camT, p.x + p.w + 90 - VW);                    // but the player matters more
    camT = Math.min(camT, p.x - 90);
    camT = Math.max(0, Math.min(g.l.w - VW, camT));
  }
  g.cam.x += (camT - g.cam.x) * .12;
  const ty = g.l.vscroll ? Math.max(0, Math.min(g.l.h - VH, p.y - 270)) : 0;   // S4: climb only when the level says so
  g.cam.y += (ty - g.cam.y) * .12;
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  const th = g.l.theme != null ? THEMES[g.l.theme] : null;
  const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, th ? th.sky : C.bg); sky.addColorStop(1, th ? th.sky2 : '#18203f');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = C.moon; for (const [x, y, z] of stars) { ctx.globalAlpha = .3 + .4 * Math.abs(Math.sin(g.t * .8 + x)); ctx.fillRect(x, y, z, z); } ctx.globalAlpha = 1;
  const mx = 760 - g.cam.x * .04;
  ctx.globalCompositeOperation = 'lighter'; const mg = ctx.createRadialGradient(mx, 110, 20, mx, 110, 150); mg.addColorStop(0, 'rgba(180,200,255,.25)'); mg.addColorStop(1, 'rgba(180,200,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - 150, -40, 300, 300); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#e8efff'; ctx.beginPath(); ctx.arc(mx, 110, 34, 0, 7); ctx.fill();
  ridge(.25, '#0f1730', 330, 100, 240); ridge(.5, '#131c3a', 400, 70, 170);

  ctx.setTransform(1, 0, 0, 1, -g.cam.x + (Math.random() - .5) * g.shk * 2, BAR - g.cam.y + (Math.random() - .5) * g.shk * 2);
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

  // HUD lives in the status strips now: see drawStrips()
  ctx.setTransform(1, 0, 0, 1, 0, BAR);                            // overlays are screen space, not world space
  if (g.grant > 0) {                                               // teaching banner, on the safe ledge
    ctx.globalAlpha = Math.min(1, g.grant / .5) * Math.min(1, (3.6 - g.grant) * 2.5);
    ctx.fillStyle = 'rgba(5,7,15,.72)'; ctx.fillRect(VW / 2 - 250, 166, 500, 76);
    T(g.grantKind === 'lantern' ? 'EMBER LANTERN' : 'EMBER DASH', VW / 2, 205, 32, 'center', C.ember);
    T(g.grantKind === 'lantern' ? 'E \u2014 throw a spark of light' : 'SHIFT \u2014 one surge per jump', VW / 2, 232, 16, 'center');
    ctx.globalAlpha = 1;
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
  if (g.msg > 0 && g.state !== 'menu' && g.state !== 'win' && !(g.boss && g.boss.st !== 'dormant')) { ctx.globalAlpha = Math.min(1, g.msg); T(g.l.title, VW / 2, 90, 40, 'center'); if (g.l.hint) T(g.l.hint, VW / 2, 118, 15, 'center', '#8f9bb8'); if (g.l.line) T(g.l.line, VW / 2, 142, 17, 'center', '#dfe8ff'); ctx.globalAlpha = 1; }
  if (g.state === 'win') {
    const t = g.win;
    ctx.fillStyle = `rgba(5,7,15,${Math.min(.9, t * 1.6)})`; ctx.fillRect(0, 0, VW, VH);
    if (t < 5.0) {                                                 // what you kept
      const n = Math.min(26, g.litCount || 0), gap = n > 1 ? Math.min(32, (VW - 220) / n) : 0;
      const x0 = VW / 2 - (n - 1) * gap / 2;
      for (let i = 0; i < n; i++) drawTorch(ctx, x0 + i * gap, 300, t > .4 + i * .07, g.t + i * .4);
      T('THE EMBER HEART', VW / 2, 120, 34, 'center');
      if (n) T(`${n} flame${n === 1 ? '' : 's'} kept`, VW / 2, 336, 16, 'center', '#8f9bb8');
    }
    if (t >= 5.0 && t < 8.2) {                                     // the soul rises
      const k = Math.min(1, (t - 5.0) / 2.4), sy = 360 - k * 150;
      glow(VW / 2, sy, 100, .55);
      drawKing(ctx, 'fx', Math.floor(t * 8) % 2, VW / 2, sy + 74, 1, { scale: 2 });   // the flame he swallowed, freed
      if (t > 5.8) T('his ember soul', VW / 2, 420, 16, 'center', '#8f9bb8');
    }
    if (t >= 8.2 && t < 11.6) {                                    // it takes the blade
      const k = Math.max(0, 1 - Math.abs((t - 9.0) / 1.4));
      ctx.fillStyle = `rgba(255,208,138,${.45 * k})`; ctx.fillRect(0, 0, VW, VH);
      T('THE BLADE CATCHES', VW / 2, 260, 26, 'center', '#ffd08a');
      T('a king\u2019s ember, set in steel', VW / 2, 298, 16, 'center', '#cfd8ee');
    }
    if (t >= 11.4 && t < 16.4) {                                   // the title
      const k = Math.min(1, (t - 11.4) * 1.4);
      ctx.globalAlpha = k;
      T('THE EMBER KNIGHT', VW / 2, 250, 42, 'center', C.ember);
      T('a title, earned', VW / 2, 286, 17, 'center', '#cfd8ee');
      ctx.globalAlpha = 1;
      if (t > 13.4) { ctx.globalAlpha = Math.min(1, (t - 13.4) * 1.2); T('They did not call him that for the fire in his sword.', VW / 2, 342, 16, 'center', '#8f9bb8'); T('They called him that because he would not stay down.', VW / 2, 366, 16, 'center', '#8f9bb8'); ctx.globalAlpha = 1; }
    }
    if (t >= 16.8) {                                               // epilogue + walking away
      const kx = 300 + Math.min(1, (t - 16.8) / 5.5) * 720;
      drawKnight(ctx, 'run', t, 0, kx, 470, 1);
      const a1 = Math.min(1, Math.max(0, (t - 16.8) / 1.8));
      ctx.globalAlpha = a1; T(EPILOGUE[0], VW / 2, 150, 16, 'center', '#cfd8ee'); ctx.globalAlpha = 1;
      const a2 = Math.min(1, Math.max(0, (t - 19.0) / 1.8));
      ctx.globalAlpha = a2; T(EPILOGUE[1], VW / 2, 180, 16, 'center', '#cfd8ee'); ctx.globalAlpha = 1;
      const a3 = Math.min(1, Math.max(0, (t - 21.2) / 1.8));
      ctx.globalAlpha = a3; T(EPILOGUE[2], VW / 2, 216, 16, 'center', '#dfe8ff'); ctx.globalAlpha = 1;
      if (t > 23.8) {
        T(`Coins ${run.coins}/${TOTAL_COINS}      Time ${g.time.toFixed(1)}s`, VW / 2, 330, 16, 'center', '#8f9bb8');
        T('R  replay      ESC  phase select', VW / 2, 366, 15, 'center', C.ember);
      }
    }
  }
  if (g.state === 'menu') menu.draw(ctx, BAR);
}

function renderStory() {
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, VW, VH);
  const wrap = (s, n) => {
    const out = [], words = String(s).split(' ');
    let ln = '';
    for (const w of words) {
      if ((ln + ' ' + w).trim().length > n) { if (ln) out.push(ln); ln = w; }
      else ln = (ln ? ln + ' ' : '') + w;
    }
    if (ln) out.push(ln);
    return out;
  };
  const lines = wrap(g.story.pages[g.story.i], 58);
  T('EMBER KNIGHT', VW / 2, 140, 22, 'center', '#8f9bb8');
  lines.forEach((ln, k) => T(ln, VW / 2, 248 + k * 34 - (lines.length - 1) * 17, 18, 'center', '#dfe8ff'));
  T(`${g.story.i + 1} / ${g.story.pages.length}`, VW / 2, VH - 70, 14, 'center', '#8f9bb8');
  const ready = Math.min(1, Math.max(0, (g.story.t - 1) * 2));       // the prompt waits until the page has settled
  ctx.globalAlpha = ready; T('J / ENTER  continue', VW / 2, VH - 56, 15, 'center', C.ember); ctx.globalAlpha = 1;
}

let last = 0;
function frame(ts) {
  const dt = Math.min(.033, (ts - last) / 1000 || 0); last = ts;
  if (g.state === 'menu') {
    while (hits.length) menu.key(hits.shift());
  } else {
    hits.length = 0;
    if (pressed.menu) { syncMenu(); g.state = 'menu'; hits.length = 0; pressed.menu = false; }
    if (pressed.restart) { if (g.state !== 'card') loadLevel(g.lvl); pressed.restart = false; }
    if (pressed.mute) { A.toggle(); SND.setMuted(A.isMuted()); pressed.mute = false; }
  }
  if (g.stopT > 0) g.stopT -= dt;                                  // hit-stop: freeze, keep buffered input
  else { update(dt); clearPressed(); }
  render(); requestAnimationFrame(frame);
}
addEventListener('keydown', () => A.init());
addEventListener('beforeunload', saveRun);
loadLevel(run.lvl); syncMenu(); g.state = 'menu';                    // menu.js draws the title screen
requestAnimationFrame(frame);

// test hook for the headless harness (no runtime cost, never drawn)
export const dbg = { get g() { return g; }, get run() { return run; }, loadLevel, enterCard, nextPhase, save: saveRun,
  start: () => { g.state = 'play'; }, setKnight, SKINS, menu, menuAction, syncMenu, newJourney, SND };
