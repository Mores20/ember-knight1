// Ember Knight v2 vertical slice: tutorial road -> Cinderhaven -> Area I.
// A separate, lean loop so the shipped game keeps its own state machine.
import { pressed, clearPressed, keys } from '../input.js';
import * as A from '../audio.js';
import { Player, hit } from '../player.js';
import { makeEnemy } from '../enemies.js';
import { drawKnight, setKnight, SKIN_NAMES } from '../sprites.js';
import { drawMob } from '../mobs.js';
import { drawSolid, drawTorch, drawCoin, drawHeartPickup } from '../tiles.js';
import { drawBackdrop } from '../backdrop.js';
import { drawProps, drawSecretVeil } from '../scenery.js';
import { THEMES, POP } from '../themes.js';
import { SCENES, TOTAL_COINS } from './levels.js';
import { bootRun, saveRun as persist, readV1, importV1Run, freshRun } from './save.js';
import { GatekeeperBrute } from './brute.js';
import { CryptWarden, CryptMatron } from './crypt.js';
import { ClapperGolem, CrackedCarillon } from './tower.js';
import { FallenCaptain, ThroneWarden } from './throne.js';
import { GardenerGolem, MotherBlight } from './garden.js';
import { SlagForeman } from './forge.js';
import { drawWarden as drawWardenSprite, drawMote } from '../ashwarden.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const VW = 960, VH = 540, BAR = 34, BARB = 18, BOT = VH - BARB;
const C = { bg: '#0b1021', moon: '#dfe8ff', ember: '#ff8a3d', ink: '#05070f', gold: '#ffd27a' };

let run = bootRun();
let sceneId = run.tutorialDone ? 'hub' : 'tutorial';
let g;
setKnight(run.skin, run.emberSword);

const T = (s, x, y, size, al = 'left', col = C.moon) => {
  ctx.font = `bold ${size}px "Courier New",monospace`; ctx.textAlign = al; ctx.fillStyle = col; ctx.fillText(s, x, y);
};
const heart = (x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y + s * .8); ctx.bezierCurveTo(x - s * .9, y + s * .2, x - s * .5, y - s * .4, x, y + s * .05); ctx.bezierCurveTo(x + s * .5, y - s * .4, x + s * .9, y + s * .2, x, y + s * .8); };
function glow(x, y, r, a) {
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 2, x, y, r);
  gr.addColorStop(0, `rgba(255,138,61,${a})`); gr.addColorStop(1, 'rgba(255,138,61,0)');
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over';
}
function goldGlow(x, y, r, a) {
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 2, x, y, r);
  gr.addColorStop(0, `rgba(255,210,122,${a})`); gr.addColorStop(1, 'rgba(255,210,122,0)');
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over';
}
const spark = (x, y, n, col) => {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, sp = 60 + Math.random() * 160;
    g.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, l: .5 + Math.random() * .3, col });
  }
};
const save = () => { if (g) { run.hp = Math.max(1, Math.min(3, g.p.hp)); run.shield = g.p.shield ? 1 : 0; } persist(run); };

function litAt(x, y) {
  if (!g) return false;
  for (const t of g.l.torches) if (t.lit && Math.hypot(t.x - x, (t.y - 42) - y) < 130) return true;
  for (const l of g.lamps) if (Math.hypot(l.x - x, l.y - y) < 120) return true;
  for (const s of g.sparks) if (Math.hypot(s.x - x, s.y - y) < 90) return true;
  return false;
}

function loadScene(id) {
  const L = SCENES[id];
  if (!L) return;
  sceneId = id;
  run.scene = id;
  const got = run.got[id] = run.got[id] || { c: [], h: [] };
  const litSet = run.lit[id] = run.lit[id] || [];
  const l = {
    ...L,
    solids: L.solids.map(s => ({ ...s })),
    props: L.props || [],
    secrets: (L.secrets || []).map((s, k) => ({ ...s, k })),
    grants: (L.grants || []).map(x => ({ ...x })),
    torches: L.torches.map((t, k) => {
      const o = Array.isArray(t) ? { x: t[0], y: t[1], lit: 1 } : { ...t };
      return { ...o, i: k, lit: o.lit || litSet.includes(k) ? 1 : 0 };
    }),
  };
  const stage = run.cleared.I ? 2 : 1;
  for (const s of l.solids) if (s.kind === 'sink') { s.baseY = s.baseY != null ? s.baseY : s.y; s.depth = s.depth || 16; s.dy = 0; }
  for (const s of l.solids) if (s.kind === 'lift') { s.baseY = s.baseY != null ? s.baseY : s.y; s.rise = s.rise || 90; s.on = 0; s.dy = 0; }
  for (const s of l.solids) if (s.thorn) { s.burn = 0; s.off = 0; }
  for (const s of l.solids) if (s.kind === 'move') {
    s.x0 = s.x; s.y0 = s.y;
    if (s.toX == null) s.toX = s.x;
    if (s.toY == null) s.toY = s.y;
    s.dx = 0; s.dy = 0;
  }
  if (id === 'hub' && stage === 1 && l.hub && l.hub.barrier) {
    l.solids.push({ ...l.hub.barrier, barrier: 1 });              // Market Lane is shut until Area I falls
  }
  const p = new Player(); p.reset(L.spawn[0], L.spawn[1]);
  p.hp = Math.max(1, Math.min(3, run.hp));
  p.shield = run.shield ? 1 : 0;
  const camX = Math.max(0, Math.min(l.w - VW, p.x - 380));
  const camY = l.vertical ? Math.max(0, Math.min(l.h - VH, p.y - 300)) : 0;
  g = {
    l, id, p, abil: run.abil, stage,
    enemies: (l.enemies || []).map(makeEnemy),
    coins: l.coins.map(([x, y], k) => ({ x, y, ox: x, oy: y, k, taken: 0, got: got.c.includes(k) ? 1 : 0 })),
    hearts: l.hearts.map(([x, y], k) => ({ x, y, k, got: got.h.includes(k) ? 1 : 0 })),
    secrets: l.secrets, props: l.props, got,
    boss: makeBoss(l.boss),
    bossSeen: 0, bossMsg: 0, bossLine: 0, bossLineText: '', bossLineDone: 0,
    water: l.water || null,
    tide: l.tide ? l.tide.start : null,
    tideSpeed: l.tide ? (l.tide.speed || 8) : 0,
    tideStepT: l.tideStep ? l.tideStep.every : 0,
    tideMsg: 0,
    bells: (l.bells || []).map(b => ({ ...b, ring: 0 })),
    ringFx: [],
    lantern: l.lantern ? { ...l.lantern, got: run.abil.lantern ? 1 : 0 } : null,
    herb: l.herb ? { ...l.herb, got: !!run.herbPatch } : null,
    lamp: run.abil.lantern ? 3 : 0, sparks: [], lamps: [], dim: 0,
    parts: [], orbs: [], wardT: 1.2,
    cam: { x: camX, y: camY }, shk: 0, stopT: 0, t: 0, time: 0, msg: 3.2,
    cp: l.cps[0], fade: 0, fadeTo: null, fadeAfter: null,
    paused: false, pauseSel: 0, dialog: null, prompt: '', near: null, shop: null,
    shopStock: id === 'hub' ? [2, 1, 1, 1] : null,
    found: 0, foundName: '', grant: 0, grantKind: 'dash', healMsg: 0,
    stageMsg: id === 'hub' && (stage === 2 || run.cleared.III || run.cleared.IV || run.cleared.V || run.cleared.VI) ? 3.2 : 0,
    stageMsgKind: run.cleared.VI ? 'forge' : run.cleared.V ? 'garden' : run.cleared.IV ? 'throne' : run.cleared.III ? 'bells' : 'wake',
    dummyT: 0, parryMsg: 0, state: 'play', blockEnabled: true,
    tutStep: 0, wardHp: l.ward ? (l.ward.hp || 3) : 0, wardBroken: !l.ward,
    wardBlocks: 0, dummyHits: 0, kills: 0, cpT: 0, wardMsg: 0, blockMsg: 0, sealMsg: 0,
    shake: n => { g.shk = Math.max(g.shk, n); },
    stop: t => { g.stopT = Math.max(g.stopT, t); },
  };
  g.litAt = litAt;
  persist(run);
}

const respawn = () => {
  const p = g.p;
  p.reset(g.cp[0], g.cp[1] - p.h);
  p.inv = 1.5;
  if (g.tide != null) g.tide = Math.min(g.l.h - 20, g.cp[1] + 110);
  g.shake(6);
};

function transition(to, after) {
  if (!to) return;
  g.fade = .45; g.fadeTo = to; g.fadeAfter = after || null;
}

function tickFade(dt) {
  g.fade -= dt;
  if (g.fade > 0) return;
  const to = g.fadeTo, after = g.fadeAfter;
  g.fade = 0; g.fadeTo = null; g.fadeAfter = null;
  if (after) after();
  if (to) loadScene(to);
}

const gateOpen = gate => {
  if (gate.open) return true;
  const m = /^(.+)Cleared$/.exec(gate.openWhen || '');
  return m ? !!run.cleared[m[1]] : false;
};

const AREA_LEVELS = { I: ['a1', 'a2', 'a3'], II: ['b1', 'b2', 'b3', 'b4'], III: ['c1', 'c2', 'c3', 'c4'], IV: ['d1', 'd2', 'd3', 'd4', 'd5'], V: ['e1', 'e2', 'e3', 'e4'], VI: ['f1', 'f2', 'f3'] };
function areaStart(area) {
  const ids = AREA_LEVELS[area] || [];
  const arr = run.levels[area] || [];
  const i = ids.findIndex((_, k) => !arr[k]);
  return i < 0 ? ids[0] : ids[i];
}
function markLevel(area, index) {
  const arr = run.levels[area] = run.levels[area] || [];
  arr[index] = true;
}

const makeBoss = o => !o ? null
  : o.kind === 'cryptwarden' ? new CryptWarden(o)
  : o.kind === 'matron' ? new CryptMatron(o)
  : o.kind === 'clappergolem' ? new ClapperGolem(o)
  : o.kind === 'carillon' ? new CrackedCarillon(o)
  : o.kind === 'captain' ? new FallenCaptain(o)
  : o.kind === 'warden' ? new ThroneWarden(o)
  : o.kind === 'gardenergolem' ? new GardenerGolem(o)
  : o.kind === 'motherblight' ? new MotherBlight(o)
  : o.kind === 'slagforeman' ? new SlagForeman(o)
  : new GatekeeperBrute(o);

/* ---- the Sketchy Merchant: the D2 shop, paid from the gold purse ---- */
const SHOP_ITEMS = [
  { name: 'ASHROOT POTION', price: 15, blurb: 'one heart back', sold: 'Chew it. Do not ask what is in it.',
    can: () => g.p.hp < 3, apply: () => { g.p.hp = Math.min(3, g.p.hp + 1); } },
  { name: 'CLEANSING FLASK', price: 20, blurb: 'wash off a hex', sold: 'Tastes like a wet boot. It works.',
    can: () => true, apply: () => { for (const k in g.p.debuffs) g.p.debuffs[k] = 0; } },
  { name: 'EMBER SHIELD', price: 35, blurb: 'eats one hit', sold: 'Hold it up. Try not to die.',
    can: () => true, unlock: () => !!run.cleared.I, apply: () => { g.p.shield = 1; run.shield = 1; } },
  { name: 'GREATER HEART', price: 40, blurb: 'two hearts back', sold: 'For the truly battered.',
    can: () => g.p.hp < 3, unlock: () => !!run.cleared.I, apply: () => { g.p.hp = Math.min(3, g.p.hp + 2); } },
];
function openShop() { g.shop = { sel: 0, msg: '' }; A.sfx.grant(); }
function shopUpdate() {
  const s = g.shop;
  if (pressed.up || pressed.down) {
    s.sel = (s.sel + (pressed.down ? 1 : SHOP_ITEMS.length - 1)) % SHOP_ITEMS.length;
    A.sfx.land();
  }
  if (pressed.talk) { g.shop = null; A.sfx.block(); return; }
  if (!pressed.ok) return;
  const i = s.sel, it = SHOP_ITEMS[i];
  if (it.unlock && !it.unlock()) { s.msg = 'Not for the likes of you. Not yet.'; A.sfx.block(); return; }
  if (g.shopStock[i] <= 0) { s.msg = 'Sold out. Tragic.'; A.sfx.block(); return; }
  if (!it.can()) { s.msg = 'You do not need that.'; A.sfx.block(); return; }
  if (run.gold < it.price) { s.msg = 'You are short. Also tragic.'; A.sfx.block(); return; }
  run.gold -= it.price; g.shopStock[i]--; it.apply();
  s.msg = it.sold; A.sfx.coin(); save();
}
function drawShop() {
  const s = g.shop;
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  ctx.fillStyle = 'rgba(5,7,15,.55)'; ctx.fillRect(0, 0, VW, VH);
  const w = 690, h = 310, x = (VW - w) / 2, y = 116;
  ctx.fillStyle = 'rgba(5,7,15,.96)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2f3750'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
  T('THE SKETCHY MERCHANT', x + 24, y + 30, 20, 'left', C.ember);
  T('"You broke the Brute. He owed me money."', x + 24, y + 54, 12, 'left', '#8f9bb8');
  T('GOLD ' + run.gold, x + w - 24, y + 30, 16, 'right', '#ffd84a');
  SHOP_ITEMS.forEach((it, i) => {
    const iy = y + 86 + i * 42, on = i === s.sel, locked = it.unlock && !it.unlock();
    if (on) { ctx.fillStyle = 'rgba(127,227,255,.12)'; ctx.fillRect(x + 12, iy - 18, w - 24, 34); }
    T(it.name, x + 24, iy, 15, 'left', locked ? '#4a5578' : on ? '#e4ecff' : '#cfd8ee');
    T(it.blurb, x + 292, iy, 12, 'left', '#5d6a8a');
    T(locked ? 'LOCKED' : g.shopStock[i] > 0 ? it.price + 'g  x' + g.shopStock[i] : 'SOLD OUT',
      x + w - 24, iy, 14, 'right', locked ? '#4a5578' : g.shopStock[i] > 0 ? '#ffd84a' : '#5d6a8a');
  });
  T(s.msg || '', x + 24, y + h - 34, 13, 'left', '#8f9bb8');
  T('\u2191\u2193 SELECT   ENTER BUY   F LEAVE', x + w - 24, y + h - 34, 11, 'right', '#4a5578');
}

function nearest() {
  const p = g.p, cx = p.x + p.w / 2;
  if (g.l.hub) {
    const h = g.l.hub;
    const near = (x, y, r = 72) => Math.abs(cx - x) < r && Math.abs((p.y + p.h) - y) < 70;
    for (const gate of h.gates) if (!gate.pass && near(gate.x + gate.w / 2, gate.y + gate.h)) return { type: 'gate', obj: gate, label: gateOpen(gate) ? 'F  ENTER' : 'F  GATE' };
    if (near(h.hearth.x, h.hearth.y, 64)) return { type: 'hearth', obj: h.hearth, label: 'F  REST' };
    for (const npc of h.npcs) if (near(npc.x, npc.y, 56)) return { type: 'npc', obj: npc, label: 'F  TALK' };
    if (g.stage === 2 && h.market) {
      const m = h.market.merchant;
      if (near(m.x, m.y, 60)) return { type: 'merchant', obj: m, label: 'F  TRADE' };
    }
  }
  return null;
}

function talkTo(npc) {
  const stage = g.stage;
  const lines = (npc.lines && npc.lines[stage]) || (npc.lines && npc.lines[1]) || ['...'];
  const rec = run.talked[npc.id];
  const n = rec && rec.stage === stage ? (rec.n || 0) : 0;
  const pages = [{ who: npc.name, text: lines[n % lines.length] }];
  if (n === 0) pages.push({ who: 'KNIGHT', text: stage === 1 ? 'I\u2019ll have this kingdom conquered by dawn.' : 'Hm. Maybe it\u2019s harder than I thought.' });
  run.talked[npc.id] = { stage, n: n + 1 };
  save();
  g.dialog = { pages, i: 0, t: 0 };
  A.sfx.grant();
}

function useNear() {
  const n = g.near;
  if (!n) return;
  if (n.type === 'gate') {
    const gate = n.obj;
    if (gateOpen(gate)) {
      if (gate.to) {
        const dest = gate.area ? areaStart(gate.area) : gate.to;
        transition(dest, () => { run.hp = g.p.hp; persist(run); });
      } else g.dialog = { pages: [{ who: 'MARKET LANE', text: 'The lane is open. The merchant is still setting up his stall.' }], i: 0, t: 0 };
    } else {
      g.dialog = { pages: [{ who: 'SEALED GATE', text: gate.closed || 'Sealed in ash.' }], i: 0, t: 0 };
      A.sfx.block();
    }
  } else if (n.type === 'hearth') {
    g.p.hp = 3; run.hp = 3; save();
    g.healMsg = 2.2; goldGlow(n.obj.x, n.obj.y - 28, 90, .35);
    A.sfx.grant(); spark(n.obj.x, n.obj.y - 30, 12, '#ffd27a');
  } else if (n.type === 'npc') talkTo(n.obj);
  else if (n.type === 'merchant') openShop();
}

function fireWard() {
  const w = g.l.ward, p = g.p;
  if (!w || g.wardHp <= 0) return;
  const sx = w.x, sy = w.y - 42;
  const tx = p.x + p.w / 2, ty = p.y + p.h * .45;
  const d = Math.hypot(tx - sx, ty - sy) || 1;
  g.orbs.push({ x: sx, y: sy, vx: (tx - sx) / d * 132, vy: (ty - sy) / d * 132, r: 7, t: 7, reflected: 0 });
  g.wardT = w.cool || 1.6;
  A.sfx.ember();
}

function ringBell(b) {
  b.ring = 1.1;
  g.ringFx.push({ x: b.x, y: b.y + 26, t: 0 });
  A.sfx.bell(); g.shake(3);
  for (const e of g.enemies) if (Math.abs(e.x + e.w / 2 - b.x) < 380 && Math.abs(e.y - b.y) < 260) e.stun = 2;
  for (const s of g.l.solids) if (s.kind === 'lift' && s.bell === b.id) s.on = 1;
}

function breakWard() {
  if (g.wardBroken) return;
  g.wardHp = 0; g.wardBroken = true; g.wardMsg = 3.2; g.shake(8);
  g.orbs.length = 0;
  A.sfx.grant(); spark(g.l.ward.x, g.l.ward.y - 40, 30, '#ffd479');
}

function updateOrbs(dt) {
  const p = g.p;
  for (const o of g.orbs) {
    o.t -= dt; o.x += o.vx * dt; o.y += o.vy * dt;
    const box = { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
    const gd = p.guard();
    if (gd && hit(gd, box)) {
      g.wardBlocks++;
      if (p.parry > 0) {
        o.reflected = 1; o.vx *= -1.28; o.vy *= -1.28;
        g.parryMsg = 2.2; A.sfx.parry(); spark(o.x, o.y, 12, '#fff2b0'); g.stop(.05); g.shake(3);
      } else {
        o.done = 1; g.blockMsg = 1.0; A.sfx.block(); spark(o.x, o.y, 7, '#7fe3ff'); g.shake(2);
        if (g.wardHp > 0) { g.wardHp--; if (g.wardHp <= 0) breakWard(); }
      }
    } else if (p.inv <= 0 && hit(p, box)) {
      o.done = 1; p.hurt(o.x, g);
    }
    if (o.reflected && g.l.ward && g.wardHp > 0 && Math.abs(o.x - g.l.ward.x) < 30 && Math.abs(o.y - (g.l.ward.y - 30)) < 54) {
      o.done = 1; breakWard();
    }
    if (o.t <= 0 || o.x < -80 || o.x > g.l.w + 80) o.done = 1;
  }
  g.orbs = g.orbs.filter(o => !o.done);
}

function update(dt) {
  const p = g.p;
  g.t += dt; g.time += dt; g.msg -= dt;
  if (g.fade > 0) { tickFade(dt); return; }
  if (g.shop) { shopUpdate(); return; }
  if (g.dialog) {
    g.dialog.t += dt;
    if ((pressed.talk || pressed.ok) && g.dialog.t > .15) {
      g.dialog.i++;
      g.dialog.t = 0;
      if (g.dialog.i >= g.dialog.pages.length) g.dialog = null; else A.sfx.land();
    }
    return;
  }
  if (g.paused) {
    const opts = g.l.kind === 'tutorial' ? ['RESUME', 'SKIP TUTORIAL'] : g.l.kind === 'level' ? ['RESUME', 'RETURN TO HUB'] : ['RESUME', 'REPLAY TUTORIAL'];
    if (pressed.up) { g.pauseSel = (g.pauseSel + opts.length - 1) % opts.length; A.sfx.land(); }
    if (pressed.down) { g.pauseSel = (g.pauseSel + 1) % opts.length; A.sfx.land(); }
    if (pressed.ok) {
      if (g.pauseSel === 1 && g.l.kind === 'tutorial') { run.tutorialDone = true; run.abil.dash = true; run.hp = p.hp; run.scene = 'hub'; save(); loadScene('hub'); }
      else if (g.pauseSel === 1 && g.l.kind === 'level') { run.hp = p.hp; run.scene = 'hub'; save(); loadScene('hub'); }
      else if (g.pauseSel === 1 && g.l.kind === 'hub') replayTutorial();
      else { g.paused = false; A.sfx.block(); }
    }
    return;
  }

  if (g.found > 0) g.found -= dt;
  if (g.grant > 0) g.grant -= dt;
  if (g.healMsg > 0) g.healMsg -= dt;
  if (g.stageMsg > 0) g.stageMsg -= dt;
  if (g.bossMsg > 0) g.bossMsg -= dt;
  if (g.bossLine > 0) g.bossLine -= dt;
  if (g.parryMsg > 0) g.parryMsg -= dt;
  if (g.dummyT > 0) g.dummyT -= dt;
  if (g.cpT > 0) g.cpT -= dt;
  if (g.wardMsg > 0) g.wardMsg -= dt;
  if (g.blockMsg > 0) g.blockMsg -= dt;
  if (g.sealMsg > 0) g.sealMsg -= dt;

  for (const s of g.l.solids) if (s.kind === 'sink') {            // sinking stone dips under the knight
    const on = p.ground && Math.abs((p.y + p.h) - s.y) < 3 && p.x + p.w > s.x && p.x < s.x + s.w;
    const target = s.baseY + (on ? s.depth : 0), old = s.y;
    s.y += (target - s.y) * Math.min(1, dt * (on ? 5 : 2.5));
    s.dy = s.y - old;
  }
  for (const s of g.l.solids) if (s.kind === 'lift') {            // a rung bell raises its platform
    const target = s.baseY - (s.on ? s.rise : 0), old = s.y;
    s.y += (target - s.y) * Math.min(1, dt * 3.2);
    s.dy = s.y - old;
  }
  for (const s of g.l.solids) if (s.kind === 'move') {            // chain-driven platforms
    const oldX = s.x, oldY = s.y;
    const k = .5 - .5 * Math.cos((g.t + (s.phase || 0)) * (Math.PI * 2 / (s.period || 4)));
    if (s.axis === 'x') s.x = s.x0 + (s.toX - s.x0) * k;
    else s.y = s.y0 + (s.toY - s.y0) * k;
    s.dx = s.x - oldX; s.dy = s.y - oldY;
  }
  for (const b of g.bells) if (b.ring > 0) b.ring -= dt;
  g.ringFx = g.ringFx.filter(f => (f.t += dt) < .9);
  p.update(dt, g.l.solids, g);
  if (g.boss) {
    const was = g.boss.st;
    if (g.boss.parry) g.boss.parry(p, g);
    g.boss.update(dt, p, g);
    if ((g.boss.st === 'wake' || g.boss.st === 'rise') && was !== g.boss.st && !g.bossSeen) { g.bossSeen = 1; g.bossMsg = 2.6; }
    if (g.boss.deathLine && g.boss.hp <= 0 && !g.bossLineDone) {
      g.bossLineDone = 1; g.bossLine = 5.5; g.bossLineText = g.boss.deathLine;
    }
  }
  if (p.hp <= 0) { p.hp = 3; A.sfx.die(); respawn(); save(); }

  // checkpoints
  if (p.ground) {
    let best = g.l.cps[0];
    if (g.l.vertical) {
      for (const c of g.l.cps) if (p.y + p.h <= c[1] + 20 && c[1] < best[1]) best = c;
      for (const t of g.l.torches) if (t.cp && t.lit && t.y < best[1]) best = [t.x, t.y];
    } else {
      for (const c of g.l.cps) if (p.x > c[0]) best = c;
      for (const t of g.l.torches) if (t.cp && t.lit && p.x > t.x && t.x > best[0]) best = [t.x, t.y];
    }
    g.cp = best;
  }

  // tutorial grants and prompts
  for (const gr of g.l.grants || []) if (!gr.done && !run.abil[gr.abil] && p.x > gr.x) {
    gr.done = 1; run.abil[gr.abil] = true; g.grant = 3.4; g.grantKind = gr.abil;
    save(); A.sfx.grant(); spark(p.x + p.w / 2, p.y + p.h / 2, 16, C.ember);
  }
  if (g.l.steps) {
    for (let n = 0; n < g.l.steps.length; n++) {
      if (g.tutStep >= g.l.steps.length - 1) break;
      const st = g.l.steps[g.tutStep];
      if (st.done && st.done(g)) { g.tutStep++; A.sfx.land(); continue; }
      const nx = g.l.steps[g.tutStep + 1];
      if (!st.hold && nx && nx.at != null && p.x > nx.at) { g.tutStep++; A.sfx.land(); continue; }
      break;
    }
    const step = g.l.steps[Math.min(g.tutStep, g.l.steps.length - 1)];
    g.prompt = step ? step.text : '';
    g.promptKey = step ? step.key : '';
    g.promptNo = Math.min(g.tutStep + 1, g.l.steps.length);
  } else { g.prompt = ''; g.promptKey = ''; g.promptNo = 0; }

  // exits
  const ex = g.l.exit;
  if (ex && hit(p, ex)) {
    const held = (g.l.ward && g.wardHp > 0) || (g.boss && g.boss.hp > 0);
    if (held) {
      if (g.sealMsg <= 0) { g.sealMsg = 2.4; A.sfx.block(); }
    } else {
      transition(ex.to, () => {
        if (ex.tutorial) { run.tutorialDone = true; run.abil.dash = true; }
        if (ex.level != null) markLevel(ex.area || 'I', ex.level);
        if (ex.complete) { run.cleared[ex.area] = true; A.sfx.grant(); } else A.sfx.land();
        run.hp = p.hp; run.scene = ex.to; save();
      });
      return;
    }
  }

  // hub interaction
  g.near = g.l.hub ? nearest() : null;
  if (g.near && pressed.talk) useNear();

  // practice dummy
  const d = g.l.dummy || g.l.hub?.dummy;
  if (d && g.dummyT <= 0) {
    const s = p.sword();
    if (s && hit(s, { x: d.x - 16, y: d.y - 48, w: 32, h: 48 })) {
      g.dummyT = .35; g.dummyHits++; spark(d.x, d.y - 30, 6, '#ffd08a'); A.sfx.block(); g.shake(2);
    }
  }

  // training ward
  if (g.l.ward && g.wardHp > 0) {
    const w = g.l.ward;
    const dist = Math.abs((p.x + p.w / 2) - w.x);
    g.wardT -= dt;
    if (dist < w.range && g.wardT <= 0 && p.inv <= 0 && !g.dialog && g.kills > 0) fireWard();
  }
  updateOrbs(dt);

  // sword: torches, enemies
  const s = p.sword();
  if (s) {
    for (const t of g.l.torches) if (!t.lit && hit(s, { x: t.x - 10, y: t.y - 58, w: 20, h: 58 })) {
      t.lit = 1;
      if (!run.lit[g.id].includes(t.i)) run.lit[g.id].push(t.i);
      if (t.cp) g.cpT = 2.2;
      A.sfx.torch(); spark(t.x, t.y - 56, 12, C.ember); g.shake(2); save();
    }
    for (const e of g.enemies) if (!p.hits.has(e) && hit(s, { x: e.x - 4, y: e.y - 4, w: e.w + 8, h: e.h + 8 })) {
      p.hits.add(e);
      const dead = e.hit(p.face);
      if (dead && e.type === 'scavenger') e.drop(g);
      g.stop(.07); g.shake(5); A.sfx.hit(); spark(e.x + e.w / 2, e.y + e.h / 2, dead ? 18 : 8, C.ember);
      if (dead) { e.dead = 1; g.kills++; A.sfx.kill(); }
    }
    for (const b of g.bells) if (!p.hits.has(b) && hit(s, { x: b.x - 16, y: b.y, w: 32, h: 50 })) {
      p.hits.add(b); ringBell(b);
    }
    if (g.boss && g.boss.hp > 0 && !p.hits.has(g.boss)
      && hit(s, { x: g.boss.x - 4, y: g.boss.y - 4, w: g.boss.w + 8, h: g.boss.h + 8 })) {
      p.hits.add(g.boss);
      const r = g.boss.takeHit(s);
      if (r === 2) { A.sfx.block(); spark(g.boss.x + g.boss.w / 2, g.boss.y + 24, 7, '#c9d4f0'); g.shake(3); g.stop(.04); }
      else if (r === 1) {
        A.sfx.hit(); spark(g.boss.x + g.boss.w / 2, g.boss.y + 24, g.boss.hp <= 0 ? 40 : 9, C.ember);
        g.stop(.06); g.shake(g.boss.hp <= 0 ? 16 : 5);
      }
    }
  }
  g.enemies = g.enemies.filter(e => !e.dead);
  for (const e of g.enemies) {
    if (e.stun > 0) {                                              // a bell ring stops the tower dead
      e.stun -= dt;
      if (e.type === 'pealwraith') { e.ring = null; if (e.st === 'scream') { e.st = 'float'; e.stT = 0; } }
      continue;
    }
    e.update(dt, p, g);
    if (hit(p, e) && p.inv <= 0) p.hurt(e.x + e.w / 2, g);
  }

  // pickups
  for (const c of g.coins) if (!c.got && !c.taken && hit(p, { x: c.x - 9, y: c.y - 9, w: 18, h: 18 })) {
    c.got = 1; run.coins++; run.gold++; g.got.c.push(c.k); A.sfx.coin(); save();
  }
  for (const h of g.hearts) if (!h.got && p.hp < 3 && hit(p, { x: h.x - 11, y: h.y - 11, w: 22, h: 22 })) {
    h.got = 1; p.hp++; g.got.h.push(h.k); A.sfx.heart(); save();
  }

  // ---- Ember Lantern ----
  if (g.lantern && !g.lantern.got && hit(p, { x: g.lantern.x - 12, y: g.lantern.y - 12, w: 24, h: 24 })) {
    g.lantern.got = 1; run.abil.lantern = true; g.lamp = 3; save();
    g.grant = 3.6; g.grantKind = 'lantern'; A.sfx.grant();
    spark(g.lantern.x, g.lantern.y, 26, '#ffd479'); g.shake(4);
  }
  if (g.herb && !g.herb.got && hit(p, { x: g.herb.x - 14, y: g.herb.y - 14, w: 28, h: 28 })) {
    g.herb.got = 1; run.herbPatch = true;
    if (p.hp < 3) p.hp++;
    g.healMsg = 2.6; A.sfx.heart(); spark(g.herb.x, g.herb.y, 18, '#7fc47a'); save();
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
    for (const o of g.l.solids) if (!o.off && !o.thorn && hit(sb, o)) { land = true; s.y = o.y - 2; break; }
    for (const o of g.l.solids) if (o.thorn && !o.off && hit(sb, o)) {
      o.burn = Math.max(o.burn, 4.5); s.done = 1;
      spark(s.x, s.y, 8, '#ffd479'); A.sfx.torch();
    }
    if (g.boss && g.boss.expose) {
      const bx = g.boss.x + g.boss.w / 2, by = g.boss.y + g.boss.h / 2;
      if (Math.hypot(s.x - bx, s.y - by) < 80 && g.boss.expose()) {
        g.shake(5); A.sfx.grant(); spark(bx, by, 18, '#ffd479');
      }
    }
    if (land) { s.done = 1; g.lamps.push({ x: s.x, y: s.y, t: 6.5 }); A.sfx.land(); }
  }
  g.sparks = g.sparks.filter(s => !s.done);
  for (const l of g.lamps) l.t -= dt;
  g.lamps = g.lamps.filter(l => l.t > 0);
  for (const o of g.l.solids) if (o.thorn) {
    if (g.lamps.some(l => Math.hypot(l.x - (o.x + o.w / 2), l.y - (o.y + o.h / 2)) < 110)) o.burn = Math.max(o.burn, 4);
    if (o.burn > 0) { o.burn -= dt; o.off = 1; }
    else { o.off = 0; if (hit(p, o)) o.burn = .4; }
  }
  for (const t of g.l.torches) {
    if (t.lit) {
      if (Math.hypot(t.x - (p.x + p.w / 2), (t.y - 40) - (p.y + p.h / 2)) < 54) g.lamp = 3;
    } else for (const l of g.lamps) if (Math.hypot(t.x - l.x, (t.y - 46) - l.y) < 46) {
      t.lit = 1; (run.lit[g.id] = run.lit[g.id] || []).push(t.i);
      save(); A.sfx.torch(); spark(t.x, t.y - 56, 12, C.ember);
    }
  }
  g.dim = g.boss && g.boss.kind === 'motherblight' && g.boss.phase === 2 && g.boss.hp > 0
    ? .26 : Math.max(0, (g.dim || 0) - dt * 1.5);

  // secrets
  for (const sec of g.secrets) {
    const led = run.secrets[g.id] = run.secrets[g.id] || [];
    if (led.includes(sec.k)) continue;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (cx > sec.x && cx < sec.x + sec.w && cy > sec.y && cy < sec.y + sec.h) {
      led.push(sec.k); g.found = 3.4; g.foundName = sec.name;
      A.sfx.grant(); spark(cx, cy, 16, C.ember); save();
    }
  }

  // the ember tide rises; on the summit it climbs in steps
  if (g.tide != null) {
    g.tide -= g.tideSpeed * dt;
    if (g.tideMsg > 0) g.tideMsg -= dt;
    if (g.l.tideStep && g.boss && g.boss.st !== 'dormant' && g.boss.hp > 0) {
      g.tideStepT -= dt;
      if (g.tideStepT <= 0) {
        g.tideStepT = g.boss.phase === 2 ? g.l.tideStep.every * .75 : g.l.tideStep.every;
        g.tide -= g.l.tideStep.by;
        g.tideMsg = 2.4; g.shake(7); A.sfx.heavy();
      }
    }
  }

  // fall
  if (p.y > g.l.h) {
    p.hp--;
    if (p.hp <= 0) { p.hp = 3; A.sfx.die(); } else A.sfx.hurt();
    respawn(); save();
  } else if (g.water && p.y + p.h > g.water) {
    p.hp--;
    if (p.hp <= 0) { p.hp = 3; A.sfx.die(); } else A.sfx.hurt();
    respawn(); save();
  } else if (g.tide != null && p.y + p.h > g.tide) {
    p.hp--;
    if (p.hp <= 0) { p.hp = 3; A.sfx.die(); } else A.sfx.hurt();
    respawn(); save();
  }

  if (run.shield && !p.shield) { run.shield = 0; save(); }        // the shield was spent

  g.shk *= .88; if (g.shk < .3) g.shk = 0;
  const camT = Math.max(0, Math.min(g.l.w - VW, p.x - 380));
  const camTY = g.l.vertical ? Math.max(0, Math.min(g.l.h - VH, p.y - 300)) : 0;
  g.cam.x += (camT - g.cam.x) * .12;
  g.cam.y += (camTY - g.cam.y) * .12;
  for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; q.l -= dt; }
  g.parts = g.parts.filter(q => q.l > 0);
}

/* ---------------- world drawing ---------------- */
function drawBell(b, t) {
  const cx = b.x, top = b.y;
  ctx.strokeStyle = 'rgba(232,205,176,.30)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, top - 74); ctx.lineTo(cx, top - 2); ctx.stroke();
  const swing = Math.sin(t * 1.6 + cx * .01) * .05;
  ctx.save(); ctx.translate(cx, top); ctx.rotate(swing);
  ctx.fillStyle = '#5a4030'; ctx.fillRect(-11, -5, 22, 5);
  ctx.fillStyle = b.ring > 0 ? '#ffe6a0' : '#c9a14a';
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(11, 17); ctx.lineTo(15, 27);
  ctx.lineTo(-15, 27); ctx.lineTo(-11, 17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a6a2a'; ctx.fillRect(-16, 25, 32, 4);
  ctx.fillStyle = b.ring > 0 ? '#fff2b0' : '#e8cdb0';
  ctx.beginPath(); ctx.arc(0, 32, 4, 0, 7); ctx.fill();
  ctx.restore();
  if (b.ring > 0) goldGlow(cx, top + 18, 110 * (1.5 - b.ring), .22);
}

function drawThorns(s) {
  if (s.off) {
    ctx.fillStyle = '#2a3a22';
    for (let x = s.x + 4; x < s.x + s.w - 4; x += 14) ctx.fillRect(x, s.y + s.h - 5, 7, 5);
    if (s.burn > 0) glow(s.x + s.w / 2, s.y + s.h - 6, 50, .12);
    return;
  }
  ctx.fillStyle = '#243a22'; ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = '#37643c';
  for (let y = s.y + 3; y < s.y + s.h - 3; y += 11) ctx.fillRect(s.x + 2, y, s.w - 4, 5);
  ctx.fillStyle = '#a8c78a';
  for (let y = s.y + 8; y < s.y + s.h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(s.x, y); ctx.lineTo(s.x + 8, y - 4); ctx.lineTo(s.x + 4, y + 4); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s.x + s.w, y + 4); ctx.lineTo(s.x + s.w - 8, y); ctx.lineTo(s.x + s.w - 4, y + 8); ctx.closePath(); ctx.fill();
  }
  if (s.burn > 0) glow(s.x + s.w / 2, s.y + s.h / 2, 70, .18);
}

function drawTowerBell(x, top, w, h, col, rim) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - w * .35, top); ctx.lineTo(x + w * .35, top);
  ctx.lineTo(x + w * .5, top + h * .72); ctx.lineTo(x + w * .62, top + h);
  ctx.lineTo(x - w * .62, top + h); ctx.lineTo(x - w * .5, top + h * .72);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rim; ctx.fillRect(x - w * .66, top + h - 3, w * 1.32, 4);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, top + h + 3, w * .17, 0, 7); ctx.fill();
}

function drawGate(x, y, w, h, open = true) {
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 14, y - 16, w + 28, h + 16);
  if (open) {
    const grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, 'rgba(255,210,122,.16)');
    grd.addColorStop(.55, 'rgba(255,210,122,.55)');
    grd.addColorStop(1, 'rgba(255,210,122,.92)');
    ctx.fillStyle = grd;
  } else ctx.fillStyle = '#3b2b22';
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 28);
  ctx.arc(x + w / 2, y + 28, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = open ? 'rgba(255,242,176,.35)' : '#2a3348'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 5, y + h); ctx.lineTo(x + 5, y + 28);
  ctx.arc(x + w / 2, y + 28, w / 2 - 5, Math.PI, 0); ctx.lineTo(x + w - 5, y + h); ctx.stroke();
  if (open) goldGlow(x + w / 2, y + h - 10, 46, .18);
  else {
    ctx.strokeStyle = C.ember; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 16, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 10, y + h / 2); ctx.lineTo(x + w / 2 + 10, y + h / 2); ctx.stroke();
    glow(x + w / 2, y + h / 2, 44, .16);
  }
  ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 6, y - 24, w + 12, 8);
}
function drawHearth(x, y, t, stage) {
  const warm = stage === 2;
  ctx.fillStyle = '#1a2030'; ctx.beginPath(); ctx.ellipse(x, y - 4, 38, 9, 0, 0, 7); ctx.fill();
  for (let i = -3; i <= 3; i++) { ctx.fillStyle = i % 2 ? '#4a5578' : '#3a4257'; ctx.fillRect(x + i * 10 - 5, y - 12, 9, 7); }
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 16, y - 20, 32, 6);          // logs
  ctx.strokeStyle = '#5b3d22'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 14, y - 14); ctx.lineTo(x + 14, y - 22);
  ctx.moveTo(x - 14, y - 22); ctx.lineTo(x + 14, y - 14); ctx.stroke();
  const f = 1 + Math.sin(t * 12 + x) * .14;
  goldGlow(x, y - 30, (warm ? 86 : 62) * f, warm ? .46 : .34);
  ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(x, y - 52); ctx.quadraticCurveTo(x + 13, y - 28, x, y - 20);
  ctx.quadraticCurveTo(x - 13, y - 28, x, y - 52); ctx.fill();
  ctx.fillStyle = '#fff2b0'; ctx.fillRect(x - 3, y - 34, 6, 11);
  // tripod and pot
  ctx.strokeStyle = '#2a3348'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 20, y - 16); ctx.lineTo(x + 20, y - 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 14, y - 16); ctx.lineTo(x, y - 34); ctx.lineTo(x + 14, y - 16); ctx.stroke();
  ctx.fillStyle = '#3a4257'; ctx.fillRect(x + 18, y - 34, 18, 18);
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x + 16, y - 36, 22, 4);
  ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 30, y - 34, 3, 10);          // handle
  for (let k = 0; k < 3; k++) {                                             // steam
    const sy = y - 44 - ((t * 16 + k * 15) % 34);
    ctx.globalAlpha = .10 + .05 * (1 - ((t * 16 + k * 15) % 34) / 34);
    ctx.fillStyle = '#cfd8ee'; ctx.beginPath(); ctx.arc(x + 25 + Math.sin(t + k) * 4, sy, 5 + k, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (warm) {                                                               // bench
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 72, y - 18, 34, 5);
    ctx.fillRect(x - 68, y - 13, 4, 13); ctx.fillRect(x - 46, y - 13, 4, 13);
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(x - 72, y - 20, 34, 3);
  }
}
function drawDummy(x, y, t, hitT) {
  const lean = hitT > 0 ? Math.sin(hitT * 50) * 5 : 0;
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 3, y - 28, 6, 28);
  ctx.fillStyle = '#5b4a2e'; ctx.fillRect(x - 2, y - 40, 4, 14);
  ctx.save(); ctx.translate(x, y - 38); ctx.rotate(lean * .02);
  ctx.fillStyle = '#8a7333'; ctx.fillRect(-14, -10, 28, 22);
  ctx.fillStyle = '#a98a3f'; ctx.fillRect(-10, -6, 20, 5);
  ctx.fillStyle = '#8a7333'; ctx.beginPath(); ctx.arc(0, -18, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#5b4a2e'; ctx.fillRect(-6, -20, 3, 2); ctx.fillRect(3, -20, 3, 2);
  ctx.restore();
}
function drawClint(x, y, t, px, stage) {
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 24, y - 12, 48, 12);          // plinth
  ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 18, y - 18, 36, 8);
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 34, y - 74, 68, 56);          // gatehouse block
  ctx.fillStyle = '#3a4262'; ctx.fillRect(x - 30, y - 70, 60, 4);
  ctx.fillStyle = '#1a2030'; ctx.fillRect(x - 8, y - 40, 16, 22);           // niche
  ctx.fillStyle = '#3a4262'; ctx.fillRect(x - 15, y - 58, 30, 34);          // body
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 23, y - 62, 12, 26); ctx.fillRect(x + 11, y - 62, 12, 26);   // folded wings
  ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 20, y - 58, 3, 18); ctx.fillRect(x + 17, y - 58, 3, 18);
  ctx.fillStyle = '#565c78'; ctx.beginPath(); ctx.arc(x, y - 60, 12, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 14, y - 64, 5, 8); ctx.fillRect(x + 9, y - 64, 5, 8);       // horns
  ctx.fillStyle = '#3a4262'; ctx.fillRect(x - 8, y - 52, 16, 2);           // mouth
  const blink = (t * .7) % 5 > 4.82;
  const look = Math.max(-2, Math.min(2, (px - x) * .02));
  if (!blink) {
    ctx.fillStyle = stage === 2 ? '#ffd27a' : C.ember;
    ctx.fillRect(x - 6 + look, y - 64, 4, 3); ctx.fillRect(x + 2 + look, y - 64, 4, 3);
  } else {
    ctx.fillStyle = '#1a2030'; ctx.fillRect(x - 6 + look, y - 64, 4, 2); ctx.fillRect(x + 2 + look, y - 64, 4, 2);
  }
  ctx.fillStyle = '#3a4262'; ctx.beginPath(); ctx.moveTo(x + 12, y - 30); ctx.quadraticCurveTo(x + 28, y - 24, x + 20, y - 16); ctx.lineTo(x + 15, y - 20); ctx.fill();   // tail
  if (stage === 2) { ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 2, y - 70, 4, 2); }
}
function drawPatino(x, y, t, stage) {
  const warm = stage === 2;
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 10, y - 14, 20, 14);          // shoes/legs
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 10, y - 28, 20, 16);          // apron
  ctx.fillStyle = '#5a4030'; ctx.fillRect(x - 12, y - 34, 24, 10);          // torso
  ctx.fillStyle = '#e4ecff'; ctx.fillRect(x - 12, y - 34, 24, 2);           // apron string
  ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.arc(x, y - 42, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.arc(x, y - 44, 8, 0, 7); ctx.fill();   // face
  ctx.fillStyle = '#e4ecff'; ctx.fillRect(x - 10, y - 50, 20, 4);           // kerchief
  ctx.fillStyle = warm ? '#ffd27a' : '#c9b06b'; ctx.fillRect(x - 4, y - 45, 2, 2); ctx.fillRect(x + 2, y - 45, 2, 2);
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 3, y - 39, 6, 1);             // mouth
  const stir = Math.sin(t * 2.4) * .35;
  ctx.save(); ctx.translate(x + 13, y - 34); ctx.rotate(stir);
  ctx.strokeStyle = '#8f9bb8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, -15); ctx.stroke();
  ctx.fillStyle = '#8f9bb8'; ctx.beginPath(); ctx.arc(9, -17, 3.5, 0, 7); ctx.fill();
  ctx.restore();
  if (warm) goldGlow(x, y - 30, 30, .10);
}
function drawMerchantStall(x, y, t, warm) {
  ctx.fillStyle = '#2a2030'; ctx.fillRect(x - 80, y - 58, 160, 10);
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 76, y - 48, 152, 48);
  ctx.fillStyle = '#5b3d22'; ctx.fillRect(x - 76, y - 48, 152, 4);
  ctx.fillStyle = '#2a2030'; ctx.fillRect(x - 76, y - 128, 5, 70); ctx.fillRect(x + 71, y - 128, 5, 70);
  ctx.fillStyle = warm ? '#3f6d4a' : '#2a2030';
  ctx.beginPath(); ctx.moveTo(x - 88, y - 128); ctx.lineTo(x + 88, y - 128); ctx.lineTo(x + 76, y - 152); ctx.lineTo(x - 76, y - 152); ctx.closePath(); ctx.fill();
  ctx.fillStyle = warm ? '#ffd27a' : '#5a6f96';
  for (let i = -3; i <= 3; i++) ctx.fillRect(x + i * 22 - 6, y - 148, 12, 16);
  ctx.fillStyle = '#1a2030'; ctx.fillRect(x - 42, y - 180, 84, 24);
  ctx.strokeStyle = warm ? '#ffd27a' : '#5a6f96'; ctx.lineWidth = 1; ctx.strokeRect(x - 41.5, y - 179.5, 83, 23);
  T('TRADE', x, y - 164, 10, 'center', warm ? '#ffd27a' : '#8f9bb8');
  if (warm) {
    goldGlow(x - 62, y - 96, 44, .22);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 66, y - 104, 8, 10);
    ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 68, y - 106, 12, 3);
  }
}
function drawMerchant(x, y, t, warm) {
  const blink = (t * .8) % 6 > 5.85;
  ctx.fillStyle = '#241a2b'; ctx.fillRect(x - 15, y - 104, 30, 46);          // cloak
  ctx.fillStyle = '#1a1420'; ctx.fillRect(x - 18, y - 122, 36, 24);          // hood
  ctx.fillStyle = '#0a0710'; ctx.fillRect(x - 11, y - 117, 22, 15);          // shadowed face
  if (!blink) {
    ctx.fillStyle = warm ? '#ffd84a' : C.ember;
    ctx.fillRect(x - 7, y - 112, 4, 3); ctx.fillRect(x + 3, y - 112, 4, 3);
  }
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 22, y - 66, 44, 5);            // hands on the counter
  ctx.fillStyle = '#5b3d22'; ctx.fillRect(x + 16, y - 60, 14, 4);
  if (warm) { ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 28, y - 61, 2, 2); }
}

function drawWard(x, y, t, cool, hp, active) {
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 6, y - 34, 12, 34);
  ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 10, y - 40, 20, 6);
  const ready = active && hp > 0 && cool <= 0;
  if (ready) glow(x, y - 46, 34, .28);
  if (hp > 0) {
    ctx.strokeStyle = active ? 'rgba(255,138,61,.22)' : 'rgba(90,111,150,.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y - 34, 22 + Math.sin(t * 2.4) * 1.5, 0, 7); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < hp ? (active ? C.ember : '#5a6f96') : '#3a4257';
      ctx.fillRect(x - 9 + i * 8, y - 58, 5, 4);
    }
  } else {
    ctx.strokeStyle = '#4a5578'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y - 46, 11, .4, 5.8); ctx.stroke();
    ctx.fillStyle = '#3a4257'; ctx.fillRect(x - 2, y - 48, 4, 4);
  }
  ctx.fillStyle = ready ? C.ember : '#3a4257';
  ctx.beginPath(); ctx.arc(x, y - 46, 7 + Math.sin(t * 4) * .8, 0, 7); ctx.fill();
  ctx.fillStyle = ready ? '#ffd08a' : '#4a5578'; ctx.fillRect(x - 2, y - 48, 4, 4);
  if (ready) { ctx.strokeStyle = 'rgba(255,138,61,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 46, 13, 0, 7); ctx.stroke(); }
}
function drawTownBackdrop(camX, t, stage) {
  const th = THEMES[0], warm = stage === 2;
  const hz = ctx.createLinearGradient(0, 180, 0, 430);
  hz.addColorStop(0, warm ? 'rgba(255,210,122,.055)' : 'rgba(90,111,150,.04)');
  hz.addColorStop(1, 'rgba(5,7,15,0)');
  ctx.fillStyle = hz; ctx.fillRect(0, 0, VW, VH);

  const cx = 660 - camX * .04;                                       // the corrupted castle on the horizon
  ctx.globalAlpha = .30; ctx.fillStyle = th.stone;
  ctx.fillRect(cx, 120, 84, 300); ctx.fillRect(cx + 12, 92, 28, 44); ctx.fillRect(cx + 50, 106, 22, 30);
  ctx.fillRect(cx - 44, 190, 30, 230); ctx.fillRect(cx + 100, 170, 26, 250);
  ctx.globalAlpha = .22; ctx.fillStyle = C.ember;
  for (const [wx, wy] of [[cx + 28, 160], [cx + 52, 200], [cx - 34, 230], [cx + 110, 220]]) {
    ctx.fillRect(wx, wy, 7, 14);
    ctx.globalAlpha = .10; glow(wx + 3, wy + 7, 20, .18); ctx.globalAlpha = .22;
  }
  ctx.globalAlpha = 1;

  const far = [[60, 180, 210], [380, 160, 260], [760, 200, 180], [1120, 170, 240], [1460, 190, 210], [1800, 180, 220], [2150, 190, 240]];
  for (let i = 0; i < far.length; i++) {
    const [bx, w, h] = far[i], x = bx - camX * .12;
    if (x < -w - 40 || x > VW + 40) continue;
    townHouse(x, 420, w, h, .26, stage, i, t);
  }
  const near = [[-40, 220, 260], [300, 260, 300], [760, 240, 280], [1180, 250, 300], [1580, 220, 260], [1980, 250, 290], [2300, 220, 250]];
  for (let i = 0; i < near.length; i++) {
    const [bx, w, h] = near[i], x = bx - camX * .26;
    if (x < -w - 60 || x > VW + 60) continue;
    townHouse(x, 424, w, h, .42, stage, i + 3, t);
  }

  const strings = warm ? 2 : 1;
  for (let s = 0; s < strings; s++) {
    const x0 = -80 + s * 420 - camX * .10, x1 = x0 + 520, y0 = 220 + s * 26;
    ctx.strokeStyle = 'rgba(90,111,150,.45)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 20) {
      const y = y0 + Math.sin((x - x0) / 520 * Math.PI) * 18;
      if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let x = x0 + 40; x < x1; x += 70) {
      const y = y0 + Math.sin((x - x0) / 520 * Math.PI) * 18 + 8;
      if (warm) goldGlow(x, y, 16, .18);
      ctx.fillStyle = warm ? '#ffd27a' : '#5a6f96';
      ctx.fillRect(x - 1, y - 2, 3, 5);
    }
  }

  const n = warm ? 18 : 42;                                          // ash falls, embers rise once the town wakes
  for (let i = 0; i < n; i++) {
    const x = ((i * 137.7 + t * (6 + (i % 5) * 3) + Math.sin(t * .6 + i) * 12) % (VW + 40)) - 20;
    const y = ((i * 83.3 + t * (14 + (i % 4) * 5)) % (VH + 40)) - 20;
    ctx.globalAlpha = warm ? .10 + (i % 3) * .03 : .12 + (i % 4) * .04;
    ctx.fillStyle = '#cfd8ee'; ctx.fillRect(x, y, i % 7 ? 1 : 2, i % 7 ? 1 : 2);
  }
  if (warm) for (let i = 0; i < 12; i++) {
    const x = ((i * 173.1 + t * (5 + (i % 3) * 2)) % (VW + 30)) - 15;
    const y = VH + 20 - ((i * 91.7 + t * (10 + (i % 3) * 4)) % (VH + 50));
    ctx.globalAlpha = .18 + (i % 3) * .04; ctx.fillStyle = '#ffd08a'; ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function townHouse(x, base, w, h, alpha, stage, seed, t) {
  const th = THEMES[0], warm = stage === 2, top = base - h;
  ctx.globalAlpha = alpha; ctx.fillStyle = th.stone;
  ctx.fillRect(x, top, w, h);
  ctx.beginPath(); ctx.moveTo(x - 14, top); ctx.lineTo(x + w / 2, top - 42); ctx.lineTo(x + w + 14, top); ctx.closePath(); ctx.fill();
  const chx = x + (seed % 3) * 40 + 26;
  ctx.fillRect(chx, top - 34, 16, 26);
  ctx.fillStyle = '#2a3348'; ctx.fillRect(chx - 2, top - 38, 20, 5);
  ctx.globalAlpha = alpha * .8; ctx.fillStyle = '#1a2030';
  ctx.fillRect(x + 8, top + 8, 3, h - 16); ctx.fillRect(x + w - 11, top + 8, 3, h - 16);
  ctx.fillRect(x + 8, top + 8, w - 16, 3);
  const cols = Math.max(2, Math.floor(w / 70));
  for (let c = 0; c < cols; c++) for (let r = 0; r < 2; r++) {
    const wx = x + 28 + c * ((w - 42) / cols), wy = top + 34 + r * 58;
    const lit = warm || (seed + c + r) % 3 === 0;
    ctx.globalAlpha = alpha * (lit ? .9 : .5);
    ctx.fillStyle = lit ? '#ffd27a' : '#1a2030';
    ctx.fillRect(wx, wy, 18, 26);
    if (lit) { ctx.globalAlpha = alpha * .25; goldGlow(wx + 9, wy + 13, 28, .25); }
    ctx.globalAlpha = alpha * .7; ctx.fillStyle = '#1a2030';
    ctx.fillRect(wx + 8, wy, 2, 26); ctx.fillRect(wx, wy + 12, 18, 2);
  }
  ctx.globalAlpha = alpha; ctx.fillStyle = '#1a2030'; ctx.fillRect(x + w / 2 - 10, base - 34, 20, 34);
  ctx.fillStyle = '#ffd27a'; ctx.globalAlpha = alpha * .4; ctx.fillRect(x + w / 2 + 4, base - 20, 3, 3);
  ctx.globalAlpha = alpha * (warm ? .35 : .22); ctx.fillStyle = '#8f9bb8';
  for (let k = 0; k < 3; k++) {
    const sy = top - 44 - ((t * 10 + k * 13 + seed * 5) % 34);
    ctx.beginPath(); ctx.arc(chx + 8 + Math.sin(t * .8 + k + seed) * 5, sy, 4 + k, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWaystone(x, y, text, sub) {
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 3, y - 64, 6, 64);
  ctx.fillStyle = '#c9b06b'; ctx.fillRect(x - 54, y - 94, 108, 32);
  ctx.strokeStyle = '#6b5a2e'; ctx.lineWidth = 1; ctx.strokeRect(x - 53.5, y - 93.5, 107, 31);
  T(text, x, y - 80, 8, 'center', '#3a2a20');
  if (sub) T(sub, x, y - 68, 7, 'center', '#5a4030');
  ctx.fillStyle = '#8f9bb8'; ctx.fillRect(x - 2, y - 64, 4, 3);
}
function drawSign(x, y, text, col = '#ffd27a', sub = '') {
  ctx.fillStyle = '#1a2030'; ctx.fillRect(x - 50, y - 13, 100, 27);
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(x - 49.5, y - 12.5, 99, 26);
  T(text, x, y + 3, 9, 'center', col);
  if (sub) T(sub, x, y + 24, 8, 'center', '#8f9bb8');
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 2, y + 14, 4, 18);
}
function drawStall(x, y, t, warm, seed) {
  const lit = warm;
  ctx.fillStyle = '#2a2030'; ctx.fillRect(x - 62, y - 58, 124, 10);          // counter
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 58, y - 48, 116, 48);
  ctx.fillStyle = '#5b3d22'; ctx.fillRect(x - 58, y - 48, 116, 4);
  ctx.fillStyle = '#2a2030'; ctx.fillRect(x - 54, y - 96, 4, 48); ctx.fillRect(x + 50, y - 96, 4, 48);
  ctx.fillStyle = lit ? (seed % 2 ? '#7b3b3b' : '#3f6d4a') : '#2a2030';
  ctx.beginPath(); ctx.moveTo(x - 68, y - 96); ctx.lineTo(x + 68, y - 96); ctx.lineTo(x + 58, y - 118); ctx.lineTo(x - 58, y - 118); ctx.closePath(); ctx.fill();
  ctx.fillStyle = lit ? '#ffd27a' : '#5a6f96';
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 24 - 5, y - 112, 10, 14);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 48 + i * 34, y - 22, 22, 22);
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(x - 48 + i * 34, y - 22, 22, 3);
  }
  if (lit) {
    goldGlow(x, y - 78, 50, .16);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + 40, y - 86, 6, 9);
  }
}
function drawBarrier(x, y, w, h, t) {
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 6, y, w + 12, 6); ctx.fillRect(x - 6, y + h - 6, w + 12, 6);
  ctx.fillStyle = '#5b3d22'; ctx.fillRect(x, y + 14, w, 8); ctx.fillRect(x, y + h - 30, w, 8);
  ctx.strokeStyle = '#5b3d22'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x + 2, y + 8); ctx.lineTo(x + w - 2, y + h - 8); ctx.stroke();
  ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 4, y + 20 + k * 34); ctx.lineTo(x + w - 4, y + 20 + k * 34); ctx.stroke(); }
  ctx.fillStyle = '#8f9bb8';
  for (let k = 0; k < 5; k++) ctx.fillRect(x + 2, y + 24 + k * 28, 2, 2);
  glow(x + w / 2, y + h / 2, 46, .16);
  ctx.strokeStyle = C.ember; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 17, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 11, y + h / 2); ctx.lineTo(x + w / 2 + 11, y + h / 2); ctx.stroke();
  T('MARKET LANE', x + w / 2, y - 16, 9, 'center', '#ffd27a');
  T('SEALED', x + w / 2, y + h - 18, 8, 'center', C.ember);
}
function drawLamp(x, y, t, lit) {
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 2, y - 106, 4, 106);
  ctx.fillStyle = '#3a4257'; ctx.fillRect(x - 10, y - 112, 20, 4);
  ctx.fillStyle = lit ? '#ffd27a' : '#3a4257'; ctx.fillRect(x - 6, y - 124, 12, 13);
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 7, y - 126, 14, 3);
  if (lit) { goldGlow(x, y - 118, 54 + Math.sin(t * 3 + x) * 4, .30); ctx.fillStyle = '#fff2b0'; ctx.fillRect(x - 2, y - 120, 4, 5); }
}
function drawHubWorld(h, p, stage) {
  const warm = stage === 2;
  // the arrival gatehouse behind Clint
  ctx.fillStyle = '#1a2030'; ctx.fillRect(-20, 176, 300, 244);
  ctx.fillStyle = '#2a3348';
  for (let i = 0; i < 7; i++) ctx.fillRect(0 + i * 42, 164, 26, 16);
  ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.moveTo(50, 420); ctx.lineTo(50, 320); ctx.arc(140, 320, 90, Math.PI, 0); ctx.lineTo(230, 420); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a4262'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(140, 320, 90, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#2a3348'; ctx.fillRect(126, 250, 28, 24);
  T('CINDERHAVEN', 140, 150, 12, 'center', warm ? '#ffd27a' : '#8f9bb8');

  drawSign(300, 292, 'ASH SQUARE');
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(330, 402, 52, 5); ctx.fillRect(334, 407, 4, 13); ctx.fillRect(374, 407, 4, 13);
  ctx.fillStyle = '#5b3d22'; ctx.fillRect(330, 400, 52, 3);
  ctx.fillStyle = '#2a2030'; ctx.fillRect(620, 350, 56, 42); ctx.fillRect(624, 344, 4, 10); ctx.fillRect(668, 344, 4, 10);
  ctx.fillStyle = '#c9b06b'; ctx.fillRect(626, 356, 44, 30);
  ctx.fillStyle = '#5a4030'; ctx.fillRect(630, 362, 36, 2); ctx.fillRect(630, 368, 28, 2); ctx.fillRect(630, 374, 32, 2);
  T(warm ? 'ROAD' : 'NOTICE', 648, 386, 7, 'center', '#3a2a20');

  drawStall(980, 420, g.t, warm, 0);
  drawStall(1180, 420, g.t, warm, 1);
  drawStall(1380, 420, g.t, warm, 2);
  drawStall(2200, 420, g.t, warm, 2);
  drawMerchantStall(1980, 420, g.t, warm);

  // Bell Plaza: the belfry behind Gate III
  ctx.fillStyle = '#141a28'; ctx.fillRect(2880, 150, 300, 270);
  ctx.fillStyle = '#1f2740'; ctx.fillRect(2900, 120, 260, 40);
  ctx.fillStyle = '#26304a';
  for (let i = 0; i < 6; i++) ctx.fillRect(2904 + i * 44, 108, 26, 18);
  ctx.fillStyle = '#0a0e18'; ctx.beginPath();
  ctx.moveTo(2970, 420); ctx.lineTo(2970, 250);
  ctx.arc(3030, 250, 60, Math.PI, 0); ctx.lineTo(3090, 420); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a4262'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(3030, 250, 60, Math.PI, 0); ctx.stroke();
  if (run.cleared.II) {
    goldGlow(3030, 232, run.cleared.III ? 110 : 70, run.cleared.III ? .30 : .20);
    drawTowerBell(3030, 196, 46, 44, '#c9a14a', '#ffe6a0');
    if (run.cleared.III) {
      ctx.strokeStyle = 'rgba(255,242,176,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(3030, 236, 52 + Math.sin(g.t * 1.4) * 5, 0, 7); ctx.stroke();
    }
  } else {
    drawTowerBell(3030, 196, 46, 44, '#4a3b33', '#6b4a2a');
  }
  T('BELL TOWER', 3030, 92, 11, 'center', warm ? '#e8c96a' : '#5d6a8a');

  // Throne Approach: the ruined royal gate
  ctx.fillStyle = '#12141f'; ctx.fillRect(3660, 170, 380, 250);
  ctx.fillStyle = '#1c1f30';
  for (let i = 0; i < 6; i++) ctx.fillRect(3670 + i * 62, 150, 34, 22);
  ctx.fillStyle = '#0a0c14'; ctx.beginPath();
  ctx.moveTo(3830, 420); ctx.lineTo(3830, 286);
  ctx.arc(3890, 286, 60, Math.PI, Math.PI * 1.55);
  ctx.lineTo(3980, 250); ctx.lineTo(3980, 420); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a2f45'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(3890, 286, 60, Math.PI, Math.PI * 1.55); ctx.stroke();
  ctx.fillStyle = '#4a1c28'; ctx.fillRect(3868, 206, 44, 82);
  ctx.fillStyle = '#6b2a3a'; ctx.fillRect(3868, 206, 44, 6);
  ctx.fillStyle = '#3a1420'; ctx.beginPath(); ctx.moveTo(3868, 288); ctx.lineTo(3890, 272); ctx.lineTo(3912, 288); ctx.closePath(); ctx.fill();
  if (run.cleared.IV) {
    goldGlow(3890, 286, 90, .18);
    ctx.strokeStyle = 'rgba(183,156,255,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(3890, 286, 70 + Math.sin(g.t * 1.3) * 5, Math.PI, Math.PI * 1.55); ctx.stroke();
  }
  T('THE THRONE', 3890, 130, 11, 'center', run.cleared.IV ? '#b79cff' : '#5d6a8a');

  // Garden Steps: a vine-choked arch at the end of the street
  ctx.fillStyle = '#14211a'; ctx.fillRect(4620, 180, 340, 240);
  ctx.fillStyle = '#1d3324'; ctx.fillRect(4630, 200, 30, 220); ctx.fillRect(4870, 200, 26, 220);
  ctx.strokeStyle = '#2f4a2a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(4750, 260, 110, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = '#3f6d4a'; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const x = 4650 + i * 34;
    ctx.beginPath(); ctx.moveTo(x, 420); ctx.quadraticCurveTo(x + 12, 330, x + 4, 250); ctx.stroke();
  }
  if (run.cleared.V) {
    goldGlow(4750, 260, 80, .10);
    for (let i = 0; i < 9; i++) {
      const x = 4650 + (i * 53) % 220, y = 240 + (i * 37) % 150;
      ctx.fillStyle = i % 2 ? '#cfd8ee' : '#a8c78a';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(127,196,122,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(4750, 260, 118 + Math.sin(g.t * 1.2) * 4, Math.PI, 0); ctx.stroke();
  }
  T('THE ASHEN GARDENS', 4750, 150, 11, 'center', run.cleared.V ? '#7fc47a' : '#5d6a8a');

  // Forge Row: chimneys and a furnace that wake after the Drowned Forge
  ctx.fillStyle = '#1a1414'; ctx.fillRect(5140, 190, 400, 230);
  ctx.fillStyle = '#2a2020'; ctx.fillRect(5180, 110, 62, 310); ctx.fillRect(5420, 140, 52, 280);
  ctx.fillStyle = '#0a0708'; ctx.fillRect(5300, 292, 78, 88);
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(5294, 286, 90, 8);
  if (run.cleared.VI) {
    goldGlow(5339, 330, 100, .22);
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(5312, 308, 54, 60);
    ctx.fillStyle = '#ffd479'; ctx.fillRect(5322, 322, 34, 36);
    ctx.fillStyle = 'rgba(90,90,100,.18)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(5198 + i * 7, 92 - i * 20, 12, 14);
      ctx.fillRect(5434 + i * 6, 122 - i * 16, 10, 12);
    }
  }
  T('FORGE ROW', 5339, 94, 11, 'center', run.cleared.VI ? '#ff8a3d' : '#5d6a8a');

  drawLamp(300, 420, g.t, true);
  drawLamp(900, 420, g.t, warm);
  drawLamp(1300, 420, g.t, warm);
  drawLamp(1850, 420, g.t, warm);
  drawLamp(2150, 420, g.t, warm);
  drawLamp(2350, 420, g.t, warm);
  drawLamp(2700, 420, g.t, warm);
  drawLamp(2950, 420, g.t, warm);
  drawLamp(3240, 420, g.t, warm);
  drawLamp(3450, 420, g.t, run.cleared.III);
  drawLamp(3700, 420, g.t, run.cleared.III);
  drawLamp(3950, 420, g.t, run.cleared.III);
  drawLamp(4250, 420, g.t, run.cleared.IV);
  drawLamp(4550, 420, g.t, run.cleared.IV);
  drawLamp(4800, 420, g.t, run.cleared.V);
  drawLamp(5050, 420, g.t, run.cleared.V);
  drawLamp(5300, 420, g.t, run.cleared.VI);
  drawLamp(5550, 420, g.t, run.cleared.VI);

  drawSign(1545, 292, 'I  THE EMBER ROAD', '#ffd27a', `${(run.levels.I || []).filter(Boolean).length}/3`);
  drawSign(1795, 292, 'MARKET LANE', warm ? '#ffd27a' : '#8f9bb8', warm ? 'OPEN' : '');
  if (warm) drawSign(1880, 246, 'THE SKETCHY MERCHANT', '#ffd27a');
  if (warm) drawSign(2380, 246, 'II  THE SUNKEN CRYPT', '#7fe3ff', `${(run.levels.II || []).filter(Boolean).length}/4`);
  drawSign(2620, 292, 'III  BELL PLAZA', run.cleared.II ? '#e8c96a' : '#8f9bb8', run.cleared.II ? 'OPEN' : '');
  if (warm) drawSign(3180, 246, 'III  THE BELL TOWER', '#e8c96a', `${(run.levels.III || []).filter(Boolean).length}/4`);
  drawSign(3420, 292, 'IV  THRONE APPROACH', run.cleared.III ? '#b79cff' : '#8f9bb8', run.cleared.III ? 'OPEN' : '');
  if (warm) drawSign(3980, 246, 'IV  THE THRONE', '#b79cff', `${(run.levels.IV || []).filter(Boolean).length}/5`);
  drawSign(4220, 292, 'V  GARDEN STEPS', run.cleared.IV ? '#7fc47a' : '#8f9bb8', run.cleared.IV ? 'OPEN' : '');
  if (warm) drawSign(4820, 246, 'V  THE ASHEN GARDENS', '#7fc47a', `${(run.levels.V || []).filter(Boolean).length}/4`);
  drawSign(5020, 292, 'VI  FORGE ROW', run.cleared.V ? '#ff8a3d' : '#8f9bb8', run.cleared.V ? 'OPEN' : '');
  if (warm) drawSign(5580, 246, 'VI  THE DROWNED FORGE', '#ff8a3d', `${(run.levels.VI || []).filter(Boolean).length}/3`);
  if (!warm && h.barrier) drawBarrier(h.barrier.x, h.barrier.y, h.barrier.w, h.barrier.h, g.t);
  if (warm) {
    ctx.fillStyle = 'rgba(255,210,122,.10)'; ctx.fillRect(1680, 300, 120, 120);
    goldGlow(1740, 390, 80, .18);
  }

  for (const [x, y] of [[880, 420], [1250, 420], [1460, 420]]) {
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 14, y - 24, 28, 24);
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(x - 14, y - 24, 28, 3); ctx.fillRect(x - 14, y - 12, 28, 2);
  }
}

function drawWorld() {
  const p = g.p;
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  const th = THEMES[g.l.theme != null ? g.l.theme : 0] || THEMES[0];
  const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, th.sky); sky.addColorStop(1, th.sky2);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  drawBackdrop(ctx, g.l.style || 'road', g.t, g.cam.x, g.cam.y, VW, VH);
  if (g.l.kind === 'hub') drawTownBackdrop(g.cam.x, g.t, g.stage);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, BAR, VW, VH - BAR - BARB); ctx.clip();

  ctx.setTransform(1, 0, 0, 1, -g.cam.x + (Math.random() - .5) * g.shk * 2, BAR - g.cam.y + (Math.random() - .5) * g.shk * 2);
  for (const s of g.l.solids) if (!s.off && !s.pass && !s.barrier && !s.thorn) drawSolid(ctx, s, g.l.style || 'road', s.broken);
  for (const s of g.l.solids) if (s.thorn) drawThorns(s);
  for (const s of g.sparks) {
    glow(s.x, s.y, 34, .45);
    ctx.fillStyle = '#ffd479'; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, 7); ctx.fill();
  }
  for (const l of g.lamps) {
    const k = Math.min(1, l.t / 1.4);
    glow(l.x, l.y, 96, .30 * k);
    ctx.fillStyle = 'rgba(255,210,122,' + (.8 * k) + ')';
    ctx.beginPath(); ctx.moveTo(l.x, l.y - 16 - Math.sin(g.t * 9) * 3); ctx.lineTo(l.x - 6, l.y - 2); ctx.lineTo(l.x + 6, l.y - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff2b0'; ctx.fillRect(l.x - 2, l.y - 8, 4, 6);
  }
  if (g.lantern && !g.lantern.got) {
    const lx = g.lantern.x, ly = g.lantern.y;
    glow(lx, ly, 58, .28);
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(lx - 7, ly - 10, 14, 16);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(lx - 5, ly - 8, 10, 11);
    ctx.fillStyle = '#fff2b0'; ctx.fillRect(lx - 2, ly - 6, 4, 7);
    ctx.fillStyle = '#8a6a2a'; ctx.fillRect(lx - 9, ly - 12, 18, 3); ctx.fillRect(lx - 9, ly + 4, 18, 3);
  }
  if (g.herb && !g.herb.got) {
    const hx = g.herb.x, hy = g.herb.y;
    glow(hx, hy, 40, .22);
    ctx.strokeStyle = '#7fc47a'; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(hx + i * 6, hy); ctx.quadraticCurveTo(hx + i * 14, hy - 12, hx + i * 18, hy - 20); ctx.stroke();
    }
    ctx.fillStyle = '#a8c78a';
    ctx.beginPath(); ctx.arc(hx, hy - 22, 4, 0, 7); ctx.fill();
  }
  drawProps(ctx, g.props, g.l.style || 'road', g.t);
  for (const sg of g.l.signs || []) drawWaystone(sg.x, sg.y, sg.text, sg.sub);
  if (g.water) {
    const wy = g.water, grd = ctx.createLinearGradient(0, wy, 0, g.l.h);
    grd.addColorStop(0, 'rgba(58,128,124,.42)'); grd.addColorStop(1, 'rgba(6,24,30,.92)');
    ctx.fillStyle = grd; ctx.fillRect(-40, wy, g.l.w + 80, g.l.h - wy + 40);
    ctx.strokeStyle = 'rgba(159,214,200,.38)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -20; x <= g.l.w + 20; x += 24) {
      const y = wy + Math.sin(x * .02 + g.t * 1.6) * 3;
      if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let k = 0; k < 8; k++) {
      const x = (g.t * 18 + k * 211) % (g.l.w + 100) - 50;
      ctx.globalAlpha = .12; ctx.fillStyle = '#9fd6c8';
      ctx.beginPath(); ctx.arc(x, wy + 18 + (k % 3) * 14, 2 + (k % 2), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (const b of g.bells) drawBell(b, g.t);
  for (const s of g.l.solids) if (s.kind === 'lift' && s.on) goldGlow(s.x + s.w / 2, s.y, 52, .16);
  for (const f of g.ringFx) {
    const k = f.t / .9, r = 18 + k * 160;
    ctx.strokeStyle = 'rgba(232,201,106,' + (.55 * (1 - k)) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.stroke();
  }

  for (const [x, y] of g.l.lights || []) { ctx.fillStyle = C.ember; ctx.beginPath(); ctx.arc(x, y - 6, 3, 0, 7); ctx.fill(); }
  for (const t of g.l.torches) {
    const f = 1 + Math.sin(g.t * 12 + t.x) * .15;
    drawTorch(ctx, t.x, t.y, t.lit, g.t + t.x * .017);
    if (t.lit) glow(t.x, t.y - 56, 110 * f, .32);
    else if (t.cp) { ctx.strokeStyle = 'rgba(255,179,71,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(t.x, t.y - 52, 12, 0, 7); ctx.stroke(); }
  }

  if (g.l.hub) {
    const h = g.l.hub;
    drawHubWorld(h, p, g.stage);
    drawHearth(h.hearth.x, h.hearth.y, g.t, g.stage);
    drawDummy(h.dummy.x, h.dummy.y, g.t, g.dummyT);
    for (const npc of h.npcs) {
      if (npc.id === 'clint') drawClint(npc.x, npc.y, g.t, p.x + p.w / 2, g.stage);
      else drawPatino(npc.x, npc.y, g.t, g.stage);
      if (g.near && g.near.obj === npc) T(npc.name, npc.x, npc.y - 82, 12, 'center', C.ember);
    }
    for (const gate of h.gates) {
      drawGate(gate.x, gate.y, gate.w, gate.h, gateOpen(gate));
    }
    if (g.stage === 2 && h.market) drawMerchant(h.market.merchant.x, h.market.merchant.y, g.t, true);
  } else if (g.l.gate) {
    const open = (!g.l.ward || g.wardHp <= 0) && (!g.boss || g.boss.hp <= 0);
    drawGate(g.l.gate.x, g.l.gate.y, g.l.gate.w, g.l.gate.h, open);
  }
  if (g.l.ward) drawWard(g.l.ward.x, g.l.ward.y, g.t, g.wardT, g.wardHp, g.kills > 0);

  for (const c of g.coins) if (!c.got && !c.taken) drawCoin(ctx, c.x, c.y + Math.sin(g.t * 3 + c.x) * 2, g.t + c.x * .11);
  for (const h of g.hearts) if (!h.got) drawHeartPickup(ctx, h.x, h.y - 8 + Math.sin(g.t * 3) * 2, 22);

  for (const sec of g.secrets) {
    if ((run.secrets[g.id] || []).includes(sec.k)) continue;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const dx = Math.max(sec.x - cx, 0, cx - (sec.x + sec.w)), dy = Math.max(sec.y - cy, 0, cy - (sec.y + sec.h));
    drawSecretVeil(ctx, sec, g.l.style || 'road', Math.max(0, Math.min(1, (Math.hypot(dx, dy) - 30) / 170)), g.t);
  }

  if (g.tide != null) {
    const ty = g.tide;
    const grd = ctx.createLinearGradient(0, ty, 0, Math.min(g.l.h, ty + 280));
    grd.addColorStop(0, 'rgba(255,160,70,.92)');
    grd.addColorStop(.22, 'rgba(226,80,30,.88)');
    grd.addColorStop(1, 'rgba(48,12,8,.96)');
    ctx.fillStyle = grd;
    ctx.fillRect(-40, ty, g.l.w + 80, g.l.h - ty + 80);
    ctx.strokeStyle = 'rgba(255,224,150,.85)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = -30; x <= g.l.w + 30; x += 26) {
      const y = ty + Math.sin(x * .02 + g.t * 2) * 4;
      if (x === -30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let k = 0; k < 26; k++) {
      const x = (k * 173 + g.t * 24) % (g.l.w + 80) - 40;
      const y = ty + 10 + (k % 5) * 12 + Math.sin(g.t * 1.6 + k) * 4;
      ctx.globalAlpha = .5; ctx.fillStyle = k % 2 ? '#ffd479' : '#ff8a3d';
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
  for (const s of g.l.solids) if (s.kind === 'move') {
    ctx.strokeStyle = 'rgba(127,143,168,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.x + s.w / 2, s.y - 78); ctx.lineTo(s.x + s.w / 2, s.y); ctx.stroke();
    ctx.fillStyle = '#5a4030'; ctx.fillRect(s.x + s.w / 2 - 8, s.y - 4, 16, 4);
  }

  if (g.dim > 0) {
    ctx.fillStyle = 'rgba(3,9,5,' + g.dim + ')';
    ctx.fillRect(-40, 0, g.l.w + 80, g.l.h);
    for (const l of g.lamps) glow(l.x, l.y, 110, .22);
    for (const s of g.sparks) glow(s.x, s.y, 40, .3);
  }

  for (const e of g.enemies) drawEnemy(e);
  if (g.boss) {
    if (g.boss.kind === 'cryptwarden') drawCryptWarden(g.boss);
    else if (g.boss.kind === 'matron') drawMatron(g.boss);
    else if (g.boss.kind === 'clappergolem') drawClapperGolem(g.boss);
    else if (g.boss.kind === 'carillon') drawCarillon(g.boss);
    else if (g.boss.kind === 'captain') drawCaptain(g.boss);
    else if (g.boss.kind === 'warden') drawThroneWarden(g.boss);
    else if (g.boss.kind === 'gardenergolem') drawGardenerGolem(g.boss);
    else if (g.boss.kind === 'motherblight') drawMotherBlight(g.boss);
    else if (g.boss.kind === 'slagforeman') drawSlagForeman(g.boss);
    else drawBrute(g.boss);
  }
  for (const o of g.orbs) {
    glow(o.x, o.y, o.reflected ? 34 : 24, .3);
    ctx.strokeStyle = o.reflected ? '#fff2b0' : C.ember; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.stroke();
    ctx.fillStyle = o.reflected ? '#fff2b0' : C.ember; ctx.beginPath(); ctx.arc(o.x, o.y, o.r - 3, 0, 7); ctx.fill();
  }
  drawPlayer(p);
  for (const q of g.parts) { ctx.globalAlpha = Math.min(1, q.l * 2); ctx.fillStyle = q.col; ctx.fillRect(q.x, q.y, 3, 3); }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHud();
  if (g.boss) drawBossBar(g.boss);
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  if (g.l.kind === 'tutorial' && g.prompt && !g.paused && !g.dialog) {
    const w = 720, x = (VW - w) / 2;
    ctx.fillStyle = 'rgba(5,7,15,.80)'; ctx.fillRect(x, 444, w, 36);
    ctx.fillStyle = 'rgba(127,227,255,.25)'; ctx.fillRect(x, 444, w, 1);
    const tx = g.promptKey ? x + 62 : x + 18;
    if (g.promptKey) {
      ctx.fillStyle = '#20304a'; ctx.fillRect(x + 14, 450, 30, 24);
      ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 14.5, 450.5, 29, 23);
      T(g.promptKey, x + 29, 467, 15, 'center', '#c8f6ff');
    }
    T(g.prompt, tx, 467, 13, 'left', '#dfe8ff');
    T(`TUTORIAL ${g.promptNo}/${g.l.steps.length}`, x + w - 16, 466, 11, 'right', '#5d6a8a');
  }
  if (g.near && !g.paused && !g.dialog && !g.shop) T(g.near.label, VW / 2, 468, 14, 'center', C.ember);
  if (g.grant > 0) {
    ctx.globalAlpha = Math.min(1, g.grant / .5) * Math.min(1, (3.4 - g.grant) * 2.5);
    ctx.fillStyle = 'rgba(5,7,15,.72)'; ctx.fillRect(VW / 2 - 220, 166, 440, 70);
    T(g.grantKind === 'dash' ? 'EMBER DASH' : g.grantKind === 'lantern' ? 'EMBER LANTERN' : 'NEW ABILITY', VW / 2, 202, 30, 'center', C.ember);
    T(g.grantKind === 'dash' ? 'SHIFT  \u2014 one surge per jump'
      : g.grantKind === 'lantern' ? 'E  \u2014 throw a spark into the dark' : '', VW / 2, 226, 14, 'center', '#cfd8ee');
    ctx.globalAlpha = 1;
  }
  if (g.found > 0) {
    ctx.globalAlpha = Math.min(1, g.found / .5) * Math.min(1, (3.4 - g.found) * 2.5);
    ctx.fillStyle = 'rgba(5,7,15,.74)'; ctx.fillRect(VW / 2 - 230, 406, 460, 54);
    T('A HIDDEN ALCOVE', VW / 2, 432, 22, 'center', C.ember);
    T(g.foundName, VW / 2, 451, 12, 'center', '#cfd8ee');
    ctx.globalAlpha = 1;
  }
  if (g.parryMsg > 0) {
    ctx.globalAlpha = Math.min(1, g.parryMsg) * Math.min(1, (2.2 - g.parryMsg) * 8 + .7);
    T('PERFECT PARRY', VW / 2, 130, 30, 'center', '#fff2b0');
    ctx.globalAlpha = 1;
  }
  if (g.blockMsg > 0 && g.parryMsg <= 0 && g.wardMsg <= 0 && g.sealMsg <= 0) {
    ctx.globalAlpha = Math.min(1, g.blockMsg) * Math.min(1, (1 - g.blockMsg) * 5 + .5);
    T('BLOCKED', VW / 2, 130, 24, 'center', '#7fe3ff');
    ctx.globalAlpha = 1;
  }
  if (g.wardMsg > 0) {
    ctx.globalAlpha = Math.min(1, g.wardMsg) * Math.min(1, (3.2 - g.wardMsg) * 4 + .4);
    T('THE WARD BREAKS', VW / 2, g.parryMsg > 0 ? 162 : 130, 28, 'center', '#ffd27a');
    ctx.globalAlpha = 1;
  }
  if (g.sealMsg > 0 && g.wardMsg <= 0) {
    ctx.globalAlpha = Math.min(1, g.sealMsg) * Math.min(1, (2.4 - g.sealMsg) * 5 + .5);
    T(g.boss && g.boss.hp > 0 ? (g.boss.sealed || 'THE GATEKEEPER HOLDS THE GATE') : 'THE WARD SEALS THE GATE',
      VW / 2, g.parryMsg > 0 ? 162 : 130, 20, 'center', C.ember);
    ctx.globalAlpha = 1;
  }
  if (g.bossMsg > 0 && g.parryMsg <= 0 && g.sealMsg <= 0) {
    ctx.globalAlpha = Math.min(1, g.bossMsg) * Math.min(1, (2.6 - g.bossMsg) * 4 + .4);
    T(g.boss ? g.boss.name : 'THE GATEKEEPER BRUTE', VW / 2, 130, 26, 'center', C.ember);
    T(g.boss ? g.boss.sealed : 'THE GATE IS SEALED', VW / 2, 158, 13, 'center', '#8f9bb8');
    ctx.globalAlpha = 1;
  }
  if (g.bossLine > 0) {
    ctx.globalAlpha = Math.min(1, g.bossLine) * Math.min(1, (5.5 - g.bossLine) * 3 + .4);
    T('"' + g.bossLineText + '"', VW / 2, 196, 15, 'center', '#cfd8ee');
    ctx.globalAlpha = 1;
  }
  if (g.tideMsg > 0) {
    ctx.globalAlpha = Math.min(1, g.tideMsg) * Math.min(1, (2.4 - g.tideMsg) * 4 + .4);
    T('THE TIDE RISES', VW / 2, 226, 20, 'center', '#ff8a3d');
    ctx.globalAlpha = 1;
  }
  if (g.cpT > 0) {
    ctx.globalAlpha = Math.min(1, g.cpT) * Math.min(1, (2.2 - g.cpT) * 5 + .5);
    T('CHECKPOINT SET', VW / 2, 160, 18, 'center', '#ffd27a');
    ctx.globalAlpha = 1;
  }
  if (g.healMsg > 0) {
    ctx.globalAlpha = Math.min(1, g.healMsg);
    T('HEARTS RESTORED', VW / 2, 130, 22, 'center', '#ffd27a');
    ctx.globalAlpha = 1;
  }
  if (g.stageMsg > 0 && g.l.kind === 'hub') {
    ctx.globalAlpha = Math.min(1, g.stageMsg) * Math.min(1, (3.2 - g.stageMsg) * 4 + .4);
    T(g.stageMsgKind === 'forge' ? 'THE FORGE BURNS AGAIN' : g.stageMsgKind === 'garden' ? 'THE GARDEN STIRS' : g.stageMsgKind === 'throne' ? 'THE THRONE IS QUIET' : g.stageMsgKind === 'bells' ? 'THE BELLS RING CLEAN' : 'THE TOWN IS WAKING', VW / 2, 160, 22, 'center', '#ffd27a');
    ctx.globalAlpha = 1;
  }
  if (g.msg > 0 && g.l.kind !== 'hub') {
    ctx.globalAlpha = Math.min(1, g.msg);
    T(g.l.title, VW / 2, 96, 36, 'center');
    if (g.l.line) T(g.l.line, VW / 2, 124, 15, 'center', '#8f9bb8');
    ctx.globalAlpha = 1;
  } else if (g.msg > 0) {
    ctx.globalAlpha = Math.min(1, g.msg);
    T(g.l.title, VW / 2, 96, 40, 'center');
    T(g.l.name, VW / 2, 124, 15, 'center', '#8f9bb8');
    ctx.globalAlpha = 1;
  }

  if (g.dialog) drawDialog();
  if (g.shop) drawShop();
  if (g.paused) drawPause();
  if (g.fade > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - g.fade / .45));
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
  }
}

function drawEnemy(e) {
  const flash = { flash: e.flash > 0 };
  if (e.type === 'crow') {
    drawMob(ctx, 'crow', e.st === 'return' ? 'dive' : e.st, Math.floor(e.t * 10), e.x + e.w / 2, e.y + e.h, e.dir, flash);
  } else if (e.type === 'scavenger') {
    const fleeing = e.st === 'flee';
    drawMob(ctx, 'goblin', 'walk', Math.floor(e.t * (fleeing ? 14 : 9)), e.x + e.w / 2, e.y + e.h, e.dir, flash);
    if (e.carry.length) {
      const sx = e.x + e.w / 2 - e.dir * 9, sy = e.y + 13;
      ctx.fillStyle = '#5b3d22'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a5a3a'; ctx.fillRect(sx - 3, sy - 3, 6, 3);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx - 1, sy + 2, 2, 2);
    }
  } else if (e.type === 'bat') {
    const face = Math.cos(e.t * e.sp + e.ph) >= 0 ? 1 : -1;
    drawMob(ctx, 'bat', 'fly', Math.floor(e.t * 14 + e.ph * 3), e.x + e.w / 2, e.y + e.h / 2, face, flash);
  } else if (e.type === 'leech') {
    const cx = e.x + e.w / 2, top = e.y;
    if (e.st === 'hang' || e.st === 'drop') {
      ctx.strokeStyle = 'rgba(159,214,200,.32)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, e.y0); ctx.lineTo(cx, top); ctx.stroke();
    }
    const squirm = e.st === 'crawl' ? Math.sin(e.t * 14) * 2 : 0;
    ctx.fillStyle = e.flash > 0 ? '#e4ecff' : '#3d6b5e';
    for (let i = 0; i < 3; i++) {
      const r = 9 - i * 2.4;
      ctx.beginPath(); ctx.ellipse(cx + squirm * (i / 3), top + 8 + i * 6, r, 5.5, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = e.flash > 0 ? '#fff2b0' : '#9fd6c8';
    ctx.beginPath(); ctx.arc(cx, top + 7, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#05070f'; ctx.fillRect(cx - 4, top + 4, 3, 3); ctx.fillRect(cx + 1, top + 4, 3, 3);
    ctx.fillStyle = C.ember; ctx.fillRect(cx - 1, top + 8, 2, 2);
    if (e.st === 'hang') { ctx.globalAlpha = .35; glow(cx, top + 7, 16, .18); ctx.globalAlpha = 1; }
  } else if (e.type === 'skull') {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2, flare = e.st === 'shriek';
    if (flare) glow(cx, cy, 30, .28);
    const bone = e.flash > 0 ? '#e4ecff' : '#c9d4e0';
    ctx.fillStyle = bone;
    ctx.beginPath(); ctx.arc(cx, cy - 3, 9, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - 9, cy - 3, 18, 7);
    ctx.fillRect(cx - 6, cy + 4, 4, 4); ctx.fillRect(cx + 2, cy + 4, 4, 4);
    ctx.fillStyle = '#0a0f18'; ctx.fillRect(cx - 6, cy - 6, 5, 5); ctx.fillRect(cx + 1, cy - 6, 5, 5);
    if (flare) { ctx.fillStyle = C.ember; ctx.fillRect(cx - 5, cy - 5, 3, 3); ctx.fillRect(cx + 2, cy - 5, 3, 3); }
    // the wick
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(cx - 1, cy - 14, 2, 4);
    const f = 1 + Math.sin(e.t * 14) * .3;
    ctx.fillStyle = flare ? '#fff2b0' : '#ffd27a';
    ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx - 3, cy - 17 - f * 2); ctx.lineTo(cx + 3, cy - 17 - f * 2); ctx.closePath(); ctx.fill();
  } else if (e.type === 'pealwraith') {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.ring) {
      const k = 1 - e.ring.r / e.ring.max;
      ctx.strokeStyle = 'rgba(232,201,106,' + (.55 * k) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, e.ring.r, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,242,176,' + (.25 * k) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, e.ring.r + 5, 0, 7); ctx.stroke();
    }
    if (e.st === 'scream') glow(cx, cy, 34, .22);
    ctx.fillStyle = e.flash > 0 ? '#e4ecff' : '#cfd8ee';
    ctx.beginPath();
    ctx.moveTo(cx, e.y - 2); ctx.lineTo(cx + 11, e.y + 14); ctx.lineTo(cx + 8, e.y + 28);
    ctx.lineTo(cx + 3, e.y + 23); ctx.lineTo(cx, e.y + 28); ctx.lineTo(cx - 3, e.y + 23);
    ctx.lineTo(cx - 8, e.y + 28); ctx.lineTo(cx - 11, e.y + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9fb0c8'; ctx.fillRect(cx - 8, e.y + 11, 16, 3);
    ctx.fillStyle = '#0a0f18'; ctx.fillRect(cx - 5, e.y + 7, 3, 4); ctx.fillRect(cx + 2, e.y + 7, 3, 4);
    ctx.fillStyle = e.st === 'scream' ? '#fff2b0' : '#e8c96a';
    ctx.fillRect(cx - 4, e.y + 8, 2, 2); ctx.fillRect(cx + 3, e.y + 8, 2, 2);
    ctx.fillStyle = '#e8c96a';
    ctx.beginPath(); ctx.arc(cx, e.y + 22, 4, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - 4, e.y + 22, 8, 3);
  } else if (e.type === 'revenant') {
    const cx = e.x + e.w / 2, by = e.y + e.h;
    if (e.st === 'down') {
      ctx.fillStyle = '#3a4262'; ctx.fillRect(e.x + 1, by - 11, e.w - 2, 9);
      ctx.fillStyle = '#5a6585'; ctx.fillRect(e.x + 4, by - 14, e.w - 8, 4);
      ctx.fillStyle = '#8f9bb8'; ctx.fillRect(e.x + 3, by - 8, 4, 6); ctx.fillRect(e.x + e.w - 9, by - 6, 6, 3);
      return;
    }
    const rise = e.st === 'rise' ? Math.min(1, e.stT / .8) : 1;
    ctx.globalAlpha = rise;
    ctx.fillStyle = 'rgba(127,227,255,.10)';
    ctx.beginPath(); ctx.ellipse(cx, by - 5, 14, 15, 0, 0, 7); ctx.fill();
    const hot = e.st === 'wind' || e.st === 'thrust';
    ctx.fillStyle = e.flash > 0 ? '#e4ecff' : '#454f70';
    ctx.fillRect(cx - 9, e.y + 9, 18, 22);
    ctx.fillStyle = '#5a6585'; ctx.fillRect(cx - 9, e.y + 9, 18, 3);
    ctx.fillStyle = '#8f9bb8'; ctx.fillRect(cx - 6, e.y + 2, 12, 9);
    ctx.fillStyle = '#0a0f18'; ctx.fillRect(cx - 5, e.y + 5, 4, 3); ctx.fillRect(cx + 1, e.y + 5, 4, 3);
    ctx.fillStyle = hot ? '#fff2b0' : C.ember;
    ctx.fillRect(cx - 4, e.y + 6, 2, 2); ctx.fillRect(cx + 2, e.y + 6, 2, 2);
    // the spear
    let reach = 44, lift = -20;
    if (e.st === 'wind') { reach = 40; lift = -28; }
    else if (e.st === 'thrust') { reach = 104; lift = -18; }
    ctx.strokeStyle = '#cfd8ee'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - e.dir * 8, by - 16); ctx.lineTo(cx + e.dir * reach, by + lift); ctx.stroke();
    ctx.fillStyle = '#e4ecff';
    ctx.beginPath();
    ctx.moveTo(cx + e.dir * (reach + 10), by + lift - 3);
    ctx.lineTo(cx + e.dir * (reach - 2), by + lift - 7);
    ctx.lineTo(cx + e.dir * (reach - 2), by + lift + 3);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    if (e.st === 'wind') {
      const p = .55 + .45 * Math.abs(Math.sin(e.t * 9));
      ctx.strokeStyle = 'rgba(255,190,110,' + (.85 * p) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + e.dir * 16, by - 26); ctx.lineTo(cx + e.dir * 108, by - 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + e.dir * 30, by - 34); ctx.lineTo(cx + e.dir * 48, by - 26); ctx.lineTo(cx + e.dir * 30, by - 18); ctx.stroke();
    }
  } else if (e.type === 'ashbloom') {
    const cx = e.x + e.w / 2, by = e.y + e.h;
    ctx.strokeStyle = '#3f6d4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, by - 16); ctx.stroke();
    ctx.fillStyle = '#2f4a2a';
    ctx.beginPath(); ctx.ellipse(cx - 6, by - 4, 7, 3, .5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 6, by - 4, 7, 3, -.5, 0, 7); ctx.fill();
    if (e.st === 'closed' || e.lit) {
      if (e.lit) glow(cx, e.y + 10, 30, .18);
      ctx.fillStyle = e.flash > 0 ? '#e4ecff' : '#3f6d4a';
      ctx.beginPath(); ctx.ellipse(cx, e.y + 10, 9, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#a8c78a'; ctx.fillRect(cx - 1, e.y + 2, 2, 14);
    } else {
      const open = e.st === 'opening' ? Math.min(1, e.stT / .5) : 1;
      if (e.st === 'opening') glow(cx, e.y + 8, 24, .2);
      ctx.fillStyle = e.flash > 0 ? '#e4ecff' : '#cfd8ee';
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath(); ctx.ellipse(cx + k * 6, e.y + 8, 5.5, 12 * open, k * .18, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#0a0f18';
      ctx.beginPath(); ctx.ellipse(cx, e.y + 12, 6, 8 * open, 0, 0, 7); ctx.fill();
      ctx.fillStyle = C.ember; ctx.fillRect(cx - 2, e.y + 10, 4, 4);
    }
    for (const s of e.seeds) {
      glow(s.x, s.y, 14, .2);
      ctx.fillStyle = '#a8c78a'; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#3f6d4a'; ctx.fillRect(s.x - 1, s.y - 4, 2, 3);
    }
  } else if (e.type === 'creeper') {
    const cx = e.x + e.w / 2, by = e.y + e.h;
    if (e.st === 'buried') {
      ctx.fillStyle = '#243a22';
      ctx.beginPath(); ctx.ellipse(cx, by - 3, 12, 4, 0, 0, 7); ctx.fill();
      return;
    }
    const shake = e.st === 'rustle' ? Math.sin(e.t * 45) * 2 : 0;
    if (e.st === 'rustle') {
      ctx.fillStyle = '#2f4a2a';
      ctx.beginPath(); ctx.ellipse(cx, by - 3, 12 + Math.abs(shake), 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#a8c78a';
      for (let k = -1; k <= 1; k++) ctx.fillRect(cx + k * 8 + shake, by - 12, 2, 6);
      return;
    }
    ctx.fillStyle = e.flash > 0 ? '#e4ecff' : '#37643c';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.ellipse(cx - e.dir * (10 - k * 6), by - 7, 6, 5, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#a8c78a';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(cx - 12 + k * 8, by - 10); ctx.lineTo(cx - 8 + k * 8, by - 18); ctx.lineTo(cx - 5 + k * 8, by - 10); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = C.ember;
    ctx.fillRect(cx - e.dir * 10 - 2, by - 9, 3, 3);
  } else if (e.type === 'slagsmith') {
    const cx = e.x + e.w / 2, by = e.y + e.h;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx, by - 2, 18, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = e.flash > 0 ? '#e4ecff' : '#3a2f2a';
    ctx.fillRect(cx - 13, by - 26, 26, 26);
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(cx - 13, by - 12, 26, 5);
    ctx.fillStyle = '#2a2030'; ctx.fillRect(cx - 10, by - 36, 20, 14);
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(cx - 6, by - 32, 4, 3); ctx.fillRect(cx + 2, by - 32, 4, 3);
    ctx.fillStyle = '#5a4030'; ctx.fillRect(cx + 10, by - 20, 10, 8);       // the slag bucket
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(cx + 12, by - 18, 6, 3);
    for (const s of e.shots) {
      glow(s.x, s.y, 20, .3);
      ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd479'; ctx.fillRect(s.x - 1, s.y - 3, 2, 3);
    }
    for (const b of e.puddles) {
      const k = 1 - b.t / b.life;
      glow(b.x, b.y - 4, 34, .18 * k);
      ctx.fillStyle = 'rgba(255,110,40,' + (.55 * k) + ')';
      ctx.beginPath(); ctx.ellipse(b.x, b.y - 3, 24, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,122,' + (.5 * k) + ')';
      ctx.fillRect(b.x - 10, b.y - 4, 6, 2); ctx.fillRect(b.x + 4, b.y - 3, 5, 2);
    }
  } else if (e.type === 'rustwisp') {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    glow(cx, cy, 30, .22);
    ctx.fillStyle = e.flash > 0 ? '#e4ecff' : '#8a5a3a';
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
    for (let k = 0; k < 3; k++) {
      const a = e.t * 4 + k * 2.09;
      ctx.fillStyle = k % 2 ? '#ffd479' : '#c96a3a';
      ctx.fillRect(cx + Math.cos(a) * 11 - 1, cy + Math.sin(a) * 7, 2, 2);
    }
  } else if (e.type === 'shield') {
    drawMob(ctx, 'shield', e.st === 'down' ? 'open' : 'guard', Math.floor(e.t * 6), e.x + e.w / 2, e.y + e.h, e.dir, flash);
  } else {
    const dxp = (g.p.x + g.p.w / 2) - (e.x + e.w / 2);
    const near = Math.abs(dxp) < 52 && Math.sign(dxp) === e.dir;
    drawMob(ctx, 'goblin', near ? 'strike' : 'walk', near ? Math.floor(e.t * 6) : Math.floor(e.t * 9),
      e.x + e.w / 2, e.y + e.h, e.dir, flash);
  }
  if (e.stun > 0) {                                               // dazed from a bell ring
    for (let k = 0; k < 3; k++) {
      const a = g.t * 5 + k * 2.09;
      ctx.fillStyle = '#e8c96a';
      ctx.fillRect(e.x + e.w / 2 + Math.cos(a) * 14 - 1, e.y - 6 + Math.sin(a) * 4, 3, 3);
    }
  }
}

function drawBrute(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.2) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2, by = b.y + b.h;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx, by - 2, 26, 6, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, by); ctx.scale(b.dir, 1);
  const crouch = dead ? 12 : b.st === 'stunned' ? 7 : b.st === 'act' ? 4 : 0;
  const lean = b.st === 'charge' ? 7 : b.st === 'wind' ? -3 : 0;
  ctx.fillStyle = '#2a3348'; ctx.fillRect(-14, -18 + crouch, 10, 18 - crouch); ctx.fillRect(4, -18 + crouch, 10, 18 - crouch);
  ctx.fillStyle = '#7b5530'; ctx.fillRect(-15, -6, 12, 6); ctx.fillRect(3, -6, 12, 6);
  ctx.fillStyle = '#3a4262'; ctx.fillRect(-16 + lean, -38 + crouch, 32, 22);
  ctx.fillStyle = '#5a6585'; ctx.fillRect(-16 + lean, -38 + crouch, 32, 4);
  ctx.fillStyle = '#7b5530'; ctx.fillRect(-18 + lean, -36 + crouch, 8, 13);
  ctx.fillStyle = '#a97a44'; ctx.fillRect(-18 + lean, -36 + crouch, 8, 3);
  ctx.fillStyle = '#7b5530'; ctx.fillRect(10 + lean, -36 + crouch, 8, 11);
  ctx.fillStyle = '#2a3348'; ctx.fillRect(-11 + lean, -54 + crouch, 22, 17);
  ctx.fillStyle = '#565c78'; ctx.fillRect(-11 + lean, -54 + crouch, 22, 4);
  ctx.fillStyle = '#2a3348'; ctx.fillRect(-16 + lean, -60 + crouch, 5, 12); ctx.fillRect(11 + lean, -60 + crouch, 5, 12);
  const hot = b.st === 'wind' || b.st === 'charge' || b.st === 'wake';
  ctx.fillStyle = hot ? '#ffd08a' : C.ember;
  ctx.fillRect(-6 + lean, -47 + crouch, 4, 3); ctx.fillRect(2 + lean, -47 + crouch, 4, 3);
  ctx.fillStyle = '#05070f'; ctx.fillRect(-8 + lean, -40 + crouch, 16, 2);
  // hammer
  let hx = 18, hy = -27 + crouch, a = -.15;
  if (b.st === 'wake') { hx = 10; hy = -52 + crouch; a = -1.5; }
  else if (b.st === 'wind' && b.atk === 'slam') { hx = 12; hy = -48 + crouch; a = -1.4; }
  else if (b.st === 'wind') { hx = 20; hy = -30 + crouch; a = .25; }
  else if (b.st === 'act') { hx = 24; hy = -9 + crouch; a = 1.25; }
  else if (b.st === 'charge') { hx = 24; hy = -30 + crouch; a = .05; }
  else if (b.st === 'stunned') { hx = 16; hy = -8 + crouch; a = 1.0; }
  else if (dead) { hx = 24; hy = -4; a = 1.45; }
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  ctx.strokeStyle = '#5b3d22'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
  ctx.fillStyle = '#8f9bb8'; ctx.fillRect(-10, -40, 20, 13);
  ctx.fillStyle = '#cfd8ee'; ctx.fillRect(-10, -40, 20, 3);
  ctx.fillStyle = '#7b5530'; ctx.fillRect(-3, -16, 6, 4);
  ctx.restore();
  ctx.restore();
  if (b.st === 'wind') glow(cx, b.y + 18, 38, .25);
  if (b.st === 'act') glow(cx + b.dir * 22, by - 6, 46, .3);
  if (b.st === 'charge') {
    ctx.strokeStyle = 'rgba(207,216,238,.35)'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const x = cx - b.dir * (24 + k * 12); ctx.beginPath(); ctx.moveTo(x, b.y + 18 + k * 7); ctx.lineTo(x - b.dir * 16, b.y + 18 + k * 7); ctx.stroke(); }
  }
  if (b.st === 'stunned') {
    for (let k = 0; k < 3; k++) {
      const a = b.t * 4 + k * 2.09;
      ctx.fillStyle = '#ffd27a'; ctx.fillRect(cx + Math.cos(a) * 18 - 1, b.y - 8 + Math.sin(a) * 5, 3, 3);
    }
  }
  ctx.globalAlpha = 1;
}
function drawCryptWarden(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.2) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2, by = b.y + b.h;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(cx, by - 2, 24, 6, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, by); ctx.scale(b.dir, 1);
  const crouch = dead ? 14 : b.st === 'act' ? 4 : 0;
  const lean = b.st === 'wind' ? -3 : b.st === 'act' ? 4 : 0;
  // legs and tattered robe
  ctx.fillStyle = '#263241'; ctx.fillRect(-11, -16 + crouch, 8, 16 - crouch); ctx.fillRect(3, -16 + crouch, 8, 16 - crouch);
  ctx.fillStyle = '#2c3f4a'; ctx.fillRect(-15 + lean, -38 + crouch, 30, 23);
  ctx.fillStyle = '#213038'; for (let i = 0; i < 4; i++) ctx.fillRect(-14 + lean + i * 8, -16 + crouch, 5, 16 - crouch);
  // ribs
  ctx.fillStyle = '#4c6b74'; for (let i = 0; i < 3; i++) ctx.fillRect(-12 + lean, -34 + crouch + i * 6, 24, 3);
  // shoulders and skull
  ctx.fillStyle = '#1e2a36'; ctx.fillRect(-18 + lean, -44 + crouch, 36, 6);
  ctx.fillStyle = '#c9d4e0'; ctx.fillRect(-9 + lean, -56 + crouch, 18, 14);
  ctx.fillStyle = '#0a0f18'; ctx.fillRect(-6 + lean, -52 + crouch, 4, 4); ctx.fillRect(2 + lean, -52 + crouch, 4, 4);
  const hot = b.st === 'wind' || b.st === 'act';
  ctx.fillStyle = hot ? '#ffd08a' : C.ember;
  ctx.fillRect(-5 + lean, -51 + crouch, 2, 2); ctx.fillRect(3 + lean, -51 + crouch, 2, 2);
  ctx.fillStyle = '#05070f'; ctx.fillRect(-7 + lean, -45 + crouch, 14, 2);
  // the chain
  let ang = .45;
  if (b.st === 'wind' && b.atk === 'chain') ang = -1.15;
  else if (b.st === 'act' && b.atk === 'chain') ang = 1.2;
  else if (b.st === 'wind') ang = -1.55;
  else if (b.st === 'act') ang = .95;
  else if (dead) ang = 1.5;
  ctx.save(); ctx.translate(12 + lean, -28 + crouch); ctx.rotate(ang);
  ctx.strokeStyle = '#7f8fa8'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, -7 - i * 8, 3, 4, 0, 0, 7); ctx.stroke(); }
  ctx.fillStyle = '#9fb0c8'; ctx.beginPath(); ctx.arc(0, -39, 4, 0, 7); ctx.fill();
  ctx.restore();
  ctx.restore();
  if (b.shield && !dead) {
    ctx.strokeStyle = 'rgba(159,214,200,' + (.30 + Math.sin(b.t * 3) * .10) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, by - 30, 26, 22, 0, 0, 7); ctx.stroke();
  }
  if (b.st === 'wind') glow(cx, b.y + 18, 42, .22);
  ctx.globalAlpha = 1;
}

function drawMatron(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.4) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2, by = b.y + b.h;
  ctx.globalAlpha = alpha;
  // the flooded cistern swirl
  const swirl = (b.phase === 2 ? 1 : .45) * (1 + Math.sin(b.t * 1.5) * .15);
  ctx.strokeStyle = 'rgba(159,214,200,' + (.18 * swirl) + ')'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.ellipse(cx, by - 14, 34 + i * 14, 8 + i * 5, 0, 0, 7); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(cx, by + 2, 26, 6, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, by); ctx.scale(b.dir, 1);
  const sink = b.st === 'recover' ? 10 : 0;
  const sway = Math.sin(b.t * 1.8) * 2;
  // veil and robe
  ctx.fillStyle = '#1b2430';
  ctx.beginPath(); ctx.moveTo(-24, -6 + sink); ctx.lineTo(-14, -42 + sink); ctx.lineTo(14, -42 + sink); ctx.lineTo(24, -6 + sink); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#313d50';
  ctx.beginPath(); ctx.moveTo(-18, -8 + sink); ctx.lineTo(-10, -38 + sink); ctx.lineTo(10, -38 + sink); ctx.lineTo(18, -8 + sink); ctx.closePath(); ctx.fill();
  // arms / sleeves
  ctx.fillStyle = '#1b2430'; ctx.fillRect(-27, -38 + sink, 9, 24); ctx.fillRect(18, -38 + sink, 9, 24);
  // pale hands
  ctx.fillStyle = '#c9d4e0';
  ctx.fillRect(-28, -16 + sink, 7, 6); ctx.fillRect(21, -16 + sink, 7, 6);
  // mask
  ctx.fillStyle = '#d7e2ec'; ctx.fillRect(-10 + sway * .3, -56 + sink, 20, 18);
  ctx.fillStyle = '#9fb0c8'; ctx.fillRect(-10 + sway * .3, -56 + sink, 20, 3);
  ctx.fillStyle = '#0a0f18'; ctx.fillRect(-6 + sway * .3, -50 + sink, 4, 5); ctx.fillRect(2 + sway * .3, -50 + sink, 4, 5);
  ctx.fillStyle = b.phase === 2 ? '#ffd08a' : C.ember;
  ctx.fillRect(-5 + sway * .3, -49 + sink, 2, 3); ctx.fillRect(3 + sway * .3, -49 + sink, 2, 3);
  // crown of drowned iron
  ctx.fillStyle = '#3a4262'; ctx.fillRect(-12 + sway * .3, -64 + sink, 24, 8);
  ctx.fillRect(-12 + sway * .3, -70 + sink, 4, 8); ctx.fillRect(-2 + sway * .3, -72 + sink, 4, 10); ctx.fillRect(8 + sway * .3, -70 + sink, 4, 8);
  ctx.restore();
  if (b.st === 'wind') glow(cx, b.y + 20, 46, .22);
  // summoned hands
  for (const h of b.hands) {
    const rise = Math.min(1, h.t / .5), y = h.y - 74 * rise;
    ctx.fillStyle = 'rgba(201,212,224,' + (.35 + .45 * rise) + ')';
    ctx.fillRect(h.x - 10, y, 20, 6);
    ctx.fillRect(h.x - 7, y + 6, 4, 22); ctx.fillRect(h.x + 3, y + 6, 4, 22);
    ctx.fillRect(h.x - 10, y + 28, 7, 4); ctx.fillRect(h.x + 3, y + 28, 7, 4);
    if (h.fired) { ctx.strokeStyle = 'rgba(159,214,200,.4)'; ctx.beginPath(); ctx.arc(h.x, h.y - 4, 12, Math.PI, 0); ctx.stroke(); }
  }
  // falling leeches
  for (const l of b.leeches) {
    ctx.fillStyle = '#3d6b5e'; ctx.beginPath(); ctx.ellipse(l.x, l.y, 6, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9fd6c8'; ctx.fillRect(l.x - 2, l.y - 5, 2, 2);
  }
  // surge wave
  if (b.wave) {
    const wy = b.wave.y;
    ctx.fillStyle = 'rgba(159,214,200,.35)';
    ctx.beginPath(); ctx.moveTo(b.wave.x - 26, wy + 62); ctx.lineTo(b.wave.x - 14, wy - 10); ctx.lineTo(b.wave.x, wy + 4);
    ctx.lineTo(b.wave.x + 14, wy - 16); ctx.lineTo(b.wave.x + 26, wy + 62); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(220,245,240,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.wave.x - 18, wy + 20); ctx.lineTo(b.wave.x - 6, wy - 6); ctx.lineTo(b.wave.x + 6, wy + 6); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawClapperGolem(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.2) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2, by = b.y + b.h;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(cx, by - 2, 26, 7, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, by); ctx.scale(b.dir, 1);
  const crouch = dead ? 14 : b.st === 'act' ? 4 : 0;
  // legs
  ctx.fillStyle = '#3a2f2a'; ctx.fillRect(-14, -18 + crouch, 10, 18 - crouch); ctx.fillRect(4, -18 + crouch, 10, 18 - crouch);
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-15, -6, 12, 6); ctx.fillRect(3, -6, 12, 6);
  // bell-shaped torso
  ctx.fillStyle = '#6b4a2a';
  ctx.beginPath(); ctx.moveTo(-13, -46 + crouch); ctx.lineTo(13, -46 + crouch);
  ctx.lineTo(17, -26 + crouch); ctx.lineTo(20, -14 + crouch); ctx.lineTo(-20, -14 + crouch); ctx.lineTo(-17, -26 + crouch); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a97a44'; ctx.fillRect(-21, -16 + crouch, 42, 4);
  ctx.fillStyle = '#4a3823'; for (let i = 0; i < 3; i++) ctx.fillRect(-14, -40 + crouch + i * 8, 28, 2);
  // the bell-core
  const open = b.st === 'recover';
  if (open) glow(cx, by - 28, 46, .34);
  ctx.fillStyle = open ? '#ffd27a' : '#2a3348';
  ctx.beginPath(); ctx.arc(0, -28 + crouch, 7, 0, 7); ctx.fill();
  ctx.fillStyle = open ? '#fff2b0' : '#5a6585'; ctx.fillRect(-2, -31 + crouch, 4, 6);
  // head (a little bell)
  ctx.fillStyle = '#3a2f2a'; ctx.fillRect(-11, -60 + crouch, 22, 16);
  ctx.fillStyle = '#a97a44'; ctx.fillRect(-12, -46 + crouch, 24, 3);
  const hot = b.st === 'wind' || b.st === 'act';
  ctx.fillStyle = hot ? '#ffd08a' : C.ember;
  ctx.fillRect(-6, -55 + crouch, 4, 3); ctx.fillRect(2, -55 + crouch, 4, 3);
  // clapper arms
  let a = .3;
  if (b.st === 'wind') a = b.atk === 'pendulum' ? -1.2 : -.6;
  else if (b.st === 'act') a = b.atk === 'pendulum' ? 1.25 : .7;
  else if (open) a = .9;
  ctx.save(); ctx.translate(16, -42 + crouch); ctx.rotate(a);
  ctx.strokeStyle = '#7b5530'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 42); ctx.stroke();
  ctx.fillStyle = '#a97a44'; ctx.beginPath(); ctx.arc(0, 46, 7, 0, 7); ctx.fill();
  ctx.restore();
  ctx.restore();
  if (b.st === 'wind') glow(cx, b.y + 16, 46, .22);
  if (b.st === 'act' && b.atk === 'pendulum') glow(cx + b.dir * 46, by - 34, 54, .28);
  for (const w of b.waves) {
    ctx.strokeStyle = 'rgba(232,201,106,.55)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w.x - w.dir * 8, w.y + 22, 16, w.dir > 0 ? -Math.PI / 2 : Math.PI / 2, w.dir > 0 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawCarillon(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.4) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2;
  ctx.globalAlpha = alpha;
  // the frame above the arena
  ctx.fillStyle = '#2a2030'; ctx.fillRect(cx - 110, 56, 220, 12);
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(cx - 104, 68, 7, 34); ctx.fillRect(cx + 97, 68, 7, 34);
  ctx.fillStyle = '#4a3b33'; ctx.fillRect(cx - 74, 96, 148, 6);
  // chains and the cluster bells
  const bells = [[-64, 102, 34, 42], [-22, 88, 46, 58], [24, 96, 40, 50], [66, 104, 32, 40]];
  for (const [ox, top, w, h] of bells) {
    ctx.strokeStyle = 'rgba(232,205,176,.28)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + ox, 62); ctx.lineTo(cx + ox, top); ctx.stroke();
    drawTowerBell(cx + ox, top, w, h, '#7a5a2a', '#c9a14a');
  }
  // the cracked small bell hangs low only in the opening
  if (b.st === 'open' || dead) {
    if (!dead) glow(cx, b.y + 18, 66, .34);
    ctx.strokeStyle = 'rgba(232,201,106,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, b.y - 20); ctx.lineTo(cx, b.y); ctx.stroke();
    drawTowerBell(cx, b.y, 42, 34, b.flash > 0 ? '#fff2b0' : '#c9a14a', '#ffe6a0');
    ctx.strokeStyle = '#3a2f2a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + 2, b.y + 4); ctx.lineTo(cx - 2, b.y + 16); ctx.lineTo(cx + 3, b.y + 22); ctx.stroke();
  }
  // falling bells and their floor shadows
  for (const d of b.drops) {
    if (d.t < d.warn) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(d.x, 418, 22, 6, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(232,201,106,.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(d.x, 418, 22, 6, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(232,201,106,.18)'; ctx.fillRect(d.x - 1, 80, 2, 338);
    } else {
      drawTowerBell(d.x, d.y, 30, 26, '#c9a14a', '#ffe6a0');
    }
  }
  // tolling waves
  for (const w of b.waves) {
    ctx.strokeStyle = 'rgba(232,201,106,.55)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w.x - w.dir * 8, w.y + 22, 16, w.dir > 0 ? -Math.PI / 2 : Math.PI / 2, w.dir > 0 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.stroke();
  }
  if (b.st === 'wind') glow(cx, 120, 90, .18);
  ctx.globalAlpha = 1;
}

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

function drawThroneWarden(b) {
  const cx = b.x + b.w / 2, fy = b.y + b.h;
  const dead = b.st === 'dead' || b.st === 'gone';
  if (b.st === 'gone') return;
  if (b.st === 'wind') {
    const p = .55 + .45 * Math.abs(Math.sin(g.t * 9));
    if (b.atk === 'cleave') {
      ctx.fillStyle = 'rgba(255,77,28,' + (.3 * p) + ')';
      ctx.beginPath(); ctx.moveTo(cx, fy); ctx.lineTo(cx + b.dir * 250, fy); ctx.lineTo(cx + b.dir * 250, fy - 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,110,' + (.95 * p) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + b.dir * 22, fy - 1); ctx.lineTo(cx + b.dir * 250, fy - 1); ctx.stroke();
    } else if (b.atk === 'double') {
      for (const d of [-1, 1]) {
        ctx.fillStyle = 'rgba(255,77,28,' + (.26 * p) + ')';
        ctx.beginPath(); ctx.moveTo(cx, fy); ctx.lineTo(cx + d * 230, fy); ctx.lineTo(cx + d * 230, fy - 30); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,190,110,' + (.9 * p) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 230, fy - 1); ctx.lineTo(cx + 230, fy - 1); ctx.stroke();
    } else if (b.atk === 'charge') {
      ctx.strokeStyle = 'rgba(255,77,28,' + (.6 * p) + ')'; ctx.lineWidth = 3;
      ctx.setLineDash([16, 12]); ctx.lineDashOffset = -g.t * 90;
      ctx.beginPath(); ctx.moveTo(cx, fy - 3); ctx.lineTo(cx + b.dir * 500, fy - 3); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
  }
  if (b.st === 'enrage') {
    const k = b.t / 1.3;
    for (let i = 0; i < 3; i++) {
      const f = (k * 2.4 + i / 3) % 1, r = 40 + f * 210;
      ctx.strokeStyle = 'rgba(255,130,60,' + (.55 * (1 - f)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, fy - 38, r, 0, 7); ctx.stroke();
    }
    glow(cx, fy - 38, 170, .5);
  }
  if (!dead && b.st !== 'dormant') glow(cx, fy - 44, b.phase === 2 ? 88 : 66, b.phase === 2 ? .24 : .14);
  // the shield reads pale while it is actually up; the opening reads gold
  if (b.st === 'guard' || b.st === 'charge') {
    ctx.strokeStyle = 'rgba(207,216,238,.55)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx + b.dir * 16, fy - 44, 30, b.dir > 0 ? -1.1 : Math.PI - 1.1, b.dir > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke();
  }
  if (!dead && (b.st === 'open' || b.st === 'recover' || b.st === 'rest' || b.st === 'stun')) {
    goldGlow(cx, fy - 42, 58, .22);
  }
  ctx.globalAlpha = b.st === 'rise' ? .25 + .75 * Math.min(1, b.t / 1.1) : 1;
  const fr = wardenFrame(b);
  drawWardenSprite(ctx, fr[0], fr[1], cx, fy, b.dir, fr[2]);
  ctx.globalAlpha = 1;
  if (b.st === 'wind' && b.atk === 'volley') {
    for (let i = 0; i < 4; i++) {
      const aa = g.t * 7 + i * 1.57, ox = cx + b.dir * 34 + Math.cos(aa) * 16, oy = b.y + 12 + Math.sin(aa) * 10;
      glow(ox, oy, 22, .3); drawMote(ctx, i % 2, ox, oy);
    }
  }
  if (b.st === 'stun') {
    for (let i = 0; i < 3; i++) {
      const aa = g.t * 5 + i * 2.09, sx = cx + Math.cos(aa) * 26, sy = b.y - 10 + Math.sin(aa) * 7;
      glow(sx, sy, 16, .3); ctx.fillStyle = '#ffd479';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, 7); ctx.fill();
    }
  }
  // ember spikes
  for (const s of b.shots) {
    glow(s.x, s.y, s.reflected ? 30 : 20, .3);
    ctx.fillStyle = s.reflected ? '#fff2b0' : '#ff8a3d';
    ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 7); ctx.fill();
    ctx.fillStyle = s.reflected ? '#fff' : '#ffd479';
    ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 7); ctx.fill();
  }
  // ground shockwaves
  for (const w of b.waves) {
    ctx.fillStyle = 'rgba(255,138,61,.5)';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = 'rgba(255,210,122,.8)';
    ctx.fillRect(w.x + 4, w.y + 4, w.w - 8, 4);
    glow(w.x + w.w / 2, w.y + w.h / 2, 34, .22);
  }
}

function drawCaptain(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.2) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2, by = b.y + b.h;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(cx, by - 2, 24, 6, 0, 0, 7); ctx.fill();
  const open = b.st === 'recover' || b.st === 'stun';
  if (open) goldGlow(cx, by - 28, 46, .24);
  ctx.save(); ctx.translate(cx, by); ctx.scale(b.dir, 1);
  const crouch = dead ? 14 : b.st === 'act' ? 4 : b.st === 'leap' ? -6 : 0;
  ctx.fillStyle = '#2a3348'; ctx.fillRect(-12, -18 + crouch, 9, 18 - crouch); ctx.fillRect(4, -18 + crouch, 9, 18 - crouch);
  ctx.fillStyle = '#3a4262'; ctx.fillRect(-13, -6, 11, 6); ctx.fillRect(3, -6, 11, 6);
  // cape
  ctx.fillStyle = '#5a2436'; ctx.beginPath();
  ctx.moveTo(-15, -40 + crouch); ctx.lineTo(10, -40 + crouch); ctx.lineTo(16, -12 + crouch); ctx.lineTo(-20, -12 + crouch); ctx.closePath(); ctx.fill();
  // plate
  ctx.fillStyle = '#454f70'; ctx.fillRect(-14, -42 + crouch, 28, 24);
  ctx.fillStyle = '#8f9bb8'; ctx.fillRect(-14, -42 + crouch, 28, 4);
  ctx.fillStyle = '#5a6585'; ctx.fillRect(-14, -26 + crouch, 28, 3);
  // helm
  ctx.fillStyle = '#8f9bb8'; ctx.fillRect(-10, -58 + crouch, 20, 16);
  ctx.fillStyle = '#cfd8ee'; ctx.fillRect(-10, -58 + crouch, 20, 3);
  ctx.fillStyle = '#0a0f18'; ctx.fillRect(-6, -52 + crouch, 12, 3);
  ctx.fillStyle = C.ember; ctx.fillRect(-4, -51 + crouch, 2, 2); ctx.fillRect(2, -51 + crouch, 2, 2);
  ctx.fillStyle = '#e8c96a'; ctx.fillRect(-2, -64 + crouch, 4, 7);             // plume
  // spear
  let reach = 52, ang = -.1;
  if (b.st === 'wind') { reach = 34; ang = b.atk === 'sweep' ? -.3 : -.55; }
  else if (b.st === 'act') { reach = b.atk === 'sweep' ? 96 : 84; ang = b.atk === 'sweep' ? .12 : .02; }
  ctx.strokeStyle = '#7b5530'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(10, -30 + crouch); ctx.lineTo(reach, -30 + crouch + ang * 40); ctx.stroke();
  ctx.fillStyle = '#e4ecff';
  ctx.beginPath();
  ctx.moveTo(reach + 14, -30 + crouch + ang * 44);
  ctx.lineTo(reach, -30 + crouch + ang * 40 - 4);
  ctx.lineTo(reach, -30 + crouch + ang * 40 + 4);
  ctx.closePath(); ctx.fill();
  // kite shield
  const shieldUp = !(b.st === 'recover' || b.st === 'stun' || dead);
  ctx.fillStyle = shieldUp ? '#8f9bb8' : '#3a4262';
  ctx.beginPath();
  ctx.moveTo(-20, -42 + crouch); ctx.lineTo(-6, -42 + crouch); ctx.lineTo(-8, -22 + crouch);
  ctx.lineTo(-14, -16 + crouch); ctx.lineTo(-20, -22 + crouch); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#cfd8ee'; ctx.fillRect(-18, -40 + crouch, 10, 3);
  if (open) { ctx.fillStyle = '#ffd27a'; ctx.fillRect(-15, -32 + crouch, 4, 6); }
  ctx.restore();
  // tells
  if (b.st === 'wind') {
    const p = .55 + .45 * Math.abs(Math.sin(b.t * 9));
    const w = b.atk === 'sweep' ? 150 : b.atk === 'leap' ? 80 : 78;
    ctx.fillStyle = 'rgba(255,77,28,' + (.22 * p) + ')';
    ctx.fillRect(b.dir > 0 ? cx : cx - w, by - 40, w, 40);
    ctx.strokeStyle = 'rgba(255,190,110,' + (.9 * p) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + b.dir * 10, by - 2); ctx.lineTo(cx + b.dir * w, by - 2); ctx.stroke();
  }
  if (b.st === 'act') glow(cx + b.dir * 46, by - 28, 56, .28);
  if (b.st === 'stun') {
    for (let i = 0; i < 3; i++) {
      const a = b.t * 4 + i * 2.09;
      ctx.fillStyle = '#ffd27a'; ctx.fillRect(cx + Math.cos(a) * 18 - 1, b.y - 8 + Math.sin(a) * 5, 3, 3);
    }
  }
  for (const w of b.waves) {
    ctx.strokeStyle = 'rgba(232,201,106,.55)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w.x - w.dir * 8, w.y + 18, 14, w.dir > 0 ? -Math.PI / 2 : Math.PI / 2, w.dir > 0 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawGardenerGolem(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.2) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2, by = b.y + b.h;
  const open = b.coreT > 0;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(cx, by - 2, 26, 7, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, by); ctx.scale(b.dir, 1);
  const crouch = dead ? 18 : b.st === 'act' ? 5 : 0;
  // root legs
  ctx.fillStyle = '#3a4a34'; ctx.fillRect(-17, -20 + crouch, 12, 20 - crouch); ctx.fillRect(5, -20 + crouch, 12, 20 - crouch);
  ctx.fillStyle = '#2f4a2a'; ctx.fillRect(-19, -6 + crouch, 16, 6); ctx.fillRect(3, -6 + crouch, 16, 6);
  // stone torso
  ctx.fillStyle = '#55634a'; ctx.fillRect(-21, -58 + crouch, 42, 40);
  ctx.fillStyle = '#778a66'; ctx.fillRect(-21, -58 + crouch, 42, 5);
  ctx.fillStyle = '#3f4a36'; for (let i = 0; i < 3; i++) ctx.fillRect(-17, -50 + crouch + i * 11, 34, 3);
  // the root cage around the core
  const coreY = -34 + crouch;
  if (!open) {
    ctx.strokeStyle = '#2f4a2a'; ctx.lineWidth = 4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.arc(0, coreY, 14, -1.1 + i * .5, .1 + i * .5); ctx.stroke();
    }
  } else {
    glow(cx, by + coreY, 55, .32);
  }
  ctx.fillStyle = open ? '#ffd27a' : '#1e2a1c';
  ctx.beginPath(); ctx.arc(0, coreY, 8, 0, 7); ctx.fill();
  if (open) { ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(0, coreY, 4, 0, 7); ctx.fill(); }
  // head and eyes
  ctx.fillStyle = '#3f4a36'; ctx.fillRect(-11, -72 + crouch, 22, 14);
  ctx.fillStyle = '#778a66'; ctx.fillRect(-11, -72 + crouch, 22, 3);
  const hot = b.st === 'wind' || b.st === 'act';
  ctx.fillStyle = hot ? '#ffd08a' : '#7fc47a';
  ctx.fillRect(-6, -67 + crouch, 4, 4); ctx.fillRect(2, -67 + crouch, 4, 4);
  // root arm
  let a = .2;
  if (b.st === 'wind') a = b.atk === 'slam' ? -1.2 : -.8;
  else if (b.st === 'act') a = b.atk === 'slam' ? 1.3 : 1.0;
  ctx.save(); ctx.translate(17, -46 + crouch); ctx.rotate(a);
  ctx.strokeStyle = '#2f4a2a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 40); ctx.stroke();
  ctx.fillStyle = '#7fc47a'; ctx.beginPath(); ctx.arc(0, 44, 7, 0, 7); ctx.fill();
  ctx.restore();
  ctx.restore();
  if (b.st === 'wind') glow(cx, b.y + 18, 44, .22);
  if (b.st === 'act') glow(cx + b.dir * 50, by - 30, 60, .28);
  for (const w of b.waves) {
    ctx.strokeStyle = 'rgba(127,196,122,.55)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w.x - w.dir * 8, w.y + 18, 14, w.dir > 0 ? -Math.PI / 2 : Math.PI / 2, w.dir > 0 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.stroke();
  }
  for (const s of b.seeds) {
    glow(s.x, s.y, 14, .2);
    ctx.fillStyle = '#7fc47a'; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMotherBlight(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.6) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2, by = b.y + b.h;
  const open = b.coreT > 0;
  const p2 = b.phase === 2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(cx, by - 2, 42, 9, 0, 0, 7); ctx.fill();
  // root mass at the base
  ctx.fillStyle = '#243a22';
  ctx.beginPath(); ctx.ellipse(cx, by - 8, 44, 14, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2f4a2a'; ctx.lineWidth = 4;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(cx, by - 10); ctx.quadraticCurveTo(cx + i * 18, by - 26, cx + i * 24, by - 2); ctx.stroke();
  }
  // stem
  ctx.fillStyle = '#3f6d4a'; ctx.fillRect(cx - 8, by - 70, 16, 60);
  // the flower bulb
  const bulbY = by - 78 + Math.sin(b.t * 1.4) * 3;
  ctx.fillStyle = p2 ? '#4a2430' : '#3d5a3a';
  ctx.beginPath(); ctx.ellipse(cx, bulbY, 30, 26, 0, 0, 7); ctx.fill();
  // petals
  ctx.fillStyle = p2 ? '#8a3a4a' : '#7fa06a';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 3;
    ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 24, bulbY + Math.sin(a) * 20, 12, 8, a, 0, 7); ctx.fill();
  }
  // thorn armour or exposed core
  if (!open) {
    ctx.strokeStyle = '#2f4a2a'; ctx.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(cx, bulbY, 18, -.9 + i * .45, .1 + i * .45); ctx.stroke();
    }
    ctx.fillStyle = '#a8c78a';
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 20, bulbY + Math.sin(a) * 16);
      ctx.lineTo(cx + Math.cos(a) * 32, bulbY + Math.sin(a) * 28); ctx.lineTo(cx + Math.cos(a) * 22, bulbY + Math.sin(a) * 30); ctx.closePath(); ctx.fill();
    }
  } else {
    glow(cx, bulbY, 72, .36);
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(cx, bulbY, 13, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(cx, bulbY, 6, 0, 7); ctx.fill();
  }
  // eyes
  ctx.fillStyle = open ? '#fff2b0' : C.ember;
  ctx.fillRect(cx - 9, bulbY - 4, 5, 4); ctx.fillRect(cx + 4, bulbY - 4, 5, 4);
  // seed bombs: warn, then burst
  for (const bo of b.bombs) {
    const k = Math.min(1, bo.t / bo.delay);
    if (bo.t < bo.delay) {
      ctx.strokeStyle = 'rgba(255,190,110,' + (.35 + .45 * Math.abs(Math.sin(g.t * 10))) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(bo.x, 418, 26 * (1 - k) + 8, 6 * (1 - k) + 2, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(127,196,122,.18)'; ctx.fillRect(bo.x - 2, 380, 4, 38);
    } else {
      glow(bo.x, 400, 40, .35);
    }
  }
  // thorn volley
  for (const s of b.thorns) {
    glow(s.x, s.y, 14, .2);
    ctx.fillStyle = '#a8c78a';
    ctx.beginPath(); ctx.moveTo(s.x - 4, s.y + 4); ctx.lineTo(s.x + 6, s.y - 2); ctx.lineTo(s.x + 4, s.y + 6); ctx.closePath(); ctx.fill();
  }
  // root waves
  for (const w of b.waves) {
    ctx.fillStyle = 'rgba(61,90,58,.6)';
    ctx.fillRect(w.x - 8, w.y, 16, 40);
    ctx.strokeStyle = 'rgba(127,196,122,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w.x, w.y + 40); ctx.quadraticCurveTo(w.x + w.dir * 10, w.y + 16, w.x + w.dir * 4, w.y - 4); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSlagForeman(b) {
  const dead = b.st === 'dead';
  const alpha = dead ? Math.max(0, 1 - b.deadT / 2.4) : 1;
  if (alpha <= 0) return;
  const cx = b.x + b.w / 2, by = b.y + b.h;
  const p2 = b.phase === 2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.ellipse(cx, by - 2, 30, 8, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, by); ctx.scale(b.dir, 1);
  const crouch = dead ? 16 : b.st === 'act' ? 5 : 0;
  ctx.fillStyle = '#2a2a30'; ctx.fillRect(-19, -22 + crouch, 14, 22 - crouch); ctx.fillRect(5, -22 + crouch, 14, 22 - crouch);
  ctx.fillStyle = '#4a4a52'; ctx.fillRect(-21, -7 + crouch, 18, 7); ctx.fillRect(3, -7 + crouch, 18, 7);
  // iron torso
  ctx.fillStyle = '#3a3a42'; ctx.fillRect(-24, -62 + crouch, 48, 40);
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-24, -62 + crouch, 48, 5);
  ctx.fillStyle = '#2a2a30'; for (let i = 0; i < 3; i++) ctx.fillRect(-20, -54 + crouch + i * 11, 40, 3);
  // furnace core
  const coreY = -38 + crouch;
  if (!dead) glow(cx, by + coreY, p2 ? 56 : 42, p2 ? .32 : .22);
  ctx.fillStyle = dead ? '#2a2030' : '#ff8a3d';
  ctx.fillRect(-11, coreY - 8, 22, 16);
  ctx.fillStyle = dead ? '#3a2f2a' : '#ffd479';
  for (let i = -1; i <= 1; i++) ctx.fillRect(i * 6 - 1, coreY - 5, 3, 10);
  // head and visor
  ctx.fillStyle = '#3a3a42'; ctx.fillRect(-12, -78 + crouch, 24, 16);
  ctx.fillStyle = '#5a5a64'; ctx.fillRect(-12, -78 + crouch, 24, 3);
  ctx.fillStyle = '#0a0f18'; ctx.fillRect(-9, -72 + crouch, 18, 4);
  ctx.fillStyle = p2 ? '#fff2b0' : C.ember;
  ctx.fillRect(-7, -71 + crouch, 5, 2); ctx.fillRect(2, -71 + crouch, 5, 2);
  // hammer
  let a = .25;
  if (b.st === 'wind') a = b.atk === 'slam' ? -1.25 : b.atk === 'chain' ? -.9 : -1.5;
  else if (b.st === 'act') a = b.atk === 'slam' ? 1.3 : b.atk === 'chain' ? .6 : 1.1;
  ctx.save(); ctx.translate(20, -44 + crouch); ctx.rotate(a);
  ctx.strokeStyle = '#5b3d22'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -40); ctx.stroke();
  ctx.fillStyle = '#8f9bb8'; ctx.fillRect(-12, -52, 24, 14);
  ctx.fillStyle = '#cfd8ee'; ctx.fillRect(-12, -52, 24, 3);
  ctx.restore();
  // chain sweep
  if (b.st === 'act' && b.atk === 'chain') {
    ctx.strokeStyle = '#8f9bb8'; ctx.lineWidth = 3;
    for (let k = 0; k < 7; k++) {
      ctx.beginPath(); ctx.ellipse(24 + k * 26, -18, 4, 7, 0, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#cfd8ee'; ctx.beginPath(); ctx.arc(206, -18, 6, 0, 7); ctx.fill();
  }
  ctx.restore();
  if (b.st === 'wind') {
    const p = .55 + .45 * Math.abs(Math.sin(b.t * 9));
    if (b.atk === 'slam') {
      ctx.strokeStyle = 'rgba(255,190,110,' + (.9 * p) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 220, by - 1); ctx.lineTo(cx + 220, by - 1); ctx.stroke();
    } else if (b.atk === 'chain') {
      ctx.strokeStyle = 'rgba(255,190,110,' + (.8 * p) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + b.dir * 20, by - 18); ctx.lineTo(cx + b.dir * 220, by - 18); ctx.stroke();
    }
    glow(cx, b.y + 18, 44, .2);
  }
  for (const w of b.waves) {
    ctx.fillStyle = 'rgba(255,138,61,.55)';
    ctx.fillRect(w.x - 8, w.y, 16, 34);
    ctx.fillStyle = 'rgba(255,210,122,.85)';
    ctx.fillRect(w.x - 5, w.y + 4, 10, 5);
  }
  for (const s of b.shots) {
    glow(s.x, s.y, 20, .3);
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd479'; ctx.fillRect(s.x - 1, s.y - 3, 2, 3);
  }
  for (const bo of b.puddles) {
    const k = 1 - bo.t / bo.life;
    glow(bo.x, bo.y - 4, 36, .18 * k);
    ctx.fillStyle = 'rgba(255,110,40,' + (.55 * k) + ')';
    ctx.beginPath(); ctx.ellipse(bo.x, bo.y - 3, 26, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,122,' + (.5 * k) + ')';
    ctx.fillRect(bo.x - 10, bo.y - 4, 6, 2); ctx.fillRect(bo.x + 4, bo.y - 3, 5, 2);
  }
  ctx.globalAlpha = 1;
}

function drawBossBar(b) {
  if (!b || b.st === 'dormant' || b.st === 'dead') return;
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  const w = 300, x = (VW - w) / 2, y = 58;
  T(b.name || 'THE GATEKEEPER BRUTE', VW / 2, 50, 11, 'center', '#8f9bb8');
  ctx.fillStyle = 'rgba(5,7,15,.82)'; ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = C.ember; ctx.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, b.hp / b.maxHp), 7);
  ctx.strokeStyle = '#3a4265'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, 8);
}

function drawPlayer(p) {
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;
  if (g.l.style === 'ash' || g.l.style === 'forge') glow(p.x + p.w / 2, p.y + p.h / 2, 46, .10);
  const st = p.dashT > 0 ? 'dash' : p.swing > 0 ? 'attack' : !p.ground ? 'air' : Math.abs(p.vx) > 20 ? 'run' : 'idle';
  const u = st === 'dash' ? 1 - p.dashT / .22 : st === 'attack' ? 1 - p.swing / .26 : 0;
  drawKnight(ctx, st, g.t, u, p.x + p.w / 2, p.y + p.h, p.face);
  if (p.block) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const perfect = p.parry > 0;
    ctx.strokeStyle = perfect ? '#fff2b0' : '#7fe3ff';
    ctx.lineWidth = perfect ? 4 : 3;
    const a0 = p.face > 0 ? -.95 : Math.PI - .95, a1 = p.face > 0 ? .95 : Math.PI + .95;
    ctx.beginPath(); ctx.arc(cx + p.face * 9, cy, 23, a0, a1); ctx.stroke();
    if (perfect) { goldGlow(cx + p.face * 18, cy, 28, .3); }
  }
  if (p.dashT > 0) {
    const sp = Math.hypot(p.vx, p.vy) || 1, tx = p.vx / sp, ty = p.vy / sp;
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = .55 * (4 - i) / 3;
      ctx.fillStyle = i === 1 ? '#c8f6ff' : '#7fe3ff';
      ctx.fillRect(p.x + p.w / 2 - tx * i * 13 - 3, p.y + p.h / 2 - ty * i * 13 - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
  }
}

function drawHud() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#04060c'; ctx.fillRect(0, 0, VW, BAR); ctx.fillRect(0, BOT, VW, BARB);
  ctx.fillStyle = 'rgba(255,138,61,.30)'; ctx.fillRect(0, BAR - 1, VW, 1);
  ctx.fillStyle = 'rgba(255,138,61,.16)'; ctx.fillRect(0, BOT, VW, 1);
  const p = g.p;
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < p.hp ? POP.heart : '#3a4257';
    heart(18 + i * 25, 8, 8); ctx.fill();
  }
  if (p.shield) {
    ctx.fillStyle = '#7fe3ff';
    ctx.beginPath(); ctx.moveTo(96, 6); ctx.lineTo(106, 6); ctx.lineTo(105, 14); ctx.lineTo(101, 18); ctx.lineTo(97, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#20304a'; ctx.fillRect(100, 9, 2, 6);
  }
  ctx.fillStyle = POP.coin; ctx.fillRect(118, 7, 9, 9);
  ctx.fillStyle = '#a98a3f'; ctx.fillRect(120, 9, 5, 5);
  T(`x ${run.coins}/${TOTAL_COINS}`, 134, 16, 13, 'left', '#cfd8ee');
  T(`G ${run.gold}`, 196, 16, 12, 'left', '#ffd84a');
  if (run.abil.lantern) {
    const lx = 242;
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(lx, 7, 11, 11);
    ctx.fillStyle = g.lamp > 0 ? '#ffd27a' : '#3a4257'; ctx.fillRect(lx + 2, 9, 7, 7);
    ctx.fillStyle = '#8a6a2a'; ctx.fillRect(lx - 1, 5, 13, 2);
    T('x ' + g.lamp, lx + 15, 16, 12, 'left', g.lamp > 0 ? '#ffd27a' : '#5d6a8a');
  }
  T(g.l.title, VW / 2, 16, 12, 'center', '#8f9bb8');
  T(`${g.time.toFixed(1)}s`, VW - 20, 16, 13, 'right', '#cfd8ee');
  ctx.setTransform(1, 0, 0, 1, 0, BOT);
  T(g.l.kind === 'hub' ? 'CINDERHAVEN \u2014 ASH SQUARE' : g.l.name, 20, 14, 11, 'left', '#5d6a8a');
  T('A/D MOVE   SPACE JUMP   J ATTACK   SHIFT DASH   L BLOCK   E LANTERN   F USE   ESC PAUSE', VW - 20, 14, 11, 'right', '#5d6a8a');
}

function drawPortrait(who, x, y) {
  ctx.fillStyle = '#0b1021'; ctx.fillRect(x, y, 54, 54);
  ctx.strokeStyle = '#3a4262'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, 53, 53);
  const cx = x + 27, cy = y + 28;
  if (who === 'CLINT') {
    ctx.fillStyle = '#3a4262'; ctx.fillRect(x + 20, y + 12, 14, 30);
    ctx.fillStyle = '#565c78'; ctx.beginPath(); ctx.arc(cx, cy - 3, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a3348'; ctx.fillRect(cx - 17, cy - 16, 6, 11); ctx.fillRect(cx + 11, cy - 16, 6, 11);
    ctx.fillStyle = C.ember; ctx.fillRect(cx - 7, cy - 5, 5, 3); ctx.fillRect(cx + 2, cy - 5, 5, 3);
    ctx.fillStyle = '#2a3348'; ctx.fillRect(cx - 8, cy + 6, 16, 3);
  } else if (who === 'PATINO') {
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(x + 12, y + 30, 30, 20);
    ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.arc(cx, cy - 2, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#e4ecff'; ctx.fillRect(cx - 15, cy - 15, 30, 6);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(cx - 6, cy - 2, 3, 3); ctx.fillRect(cx + 3, cy - 2, 3, 3);
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(cx - 4, cy + 8, 8, 2);
  } else if (who === 'KNIGHT') {
    ctx.fillStyle = '#7fe3ff'; ctx.fillRect(cx - 1, y + 8, 3, 12);
    ctx.fillStyle = '#c9d4f0'; ctx.fillRect(cx - 16, cy - 12, 32, 26);
    ctx.fillStyle = '#2a3348'; ctx.fillRect(cx - 13, cy - 4, 26, 7);
    ctx.fillStyle = '#7fe3ff'; ctx.fillRect(cx - 9, cy - 2, 4, 3); ctx.fillRect(cx + 5, cy - 2, 4, 3);
    ctx.fillStyle = '#8f9bb8'; ctx.fillRect(cx - 2, cy + 14, 4, 8);
  } else {
    ctx.fillStyle = C.ember; ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx, cy + 14); ctx.lineTo(cx - 12, cy); ctx.closePath(); ctx.fill();
  }
}
function drawDialog() {
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  const d = g.dialog, page = d.pages[d.i] || d.pages[0], w = 720, x = (VW - w) / 2, y = 356, h = 130;
  ctx.fillStyle = 'rgba(5,7,15,.96)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2f3750'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
  drawPortrait(page.who, x + 18, y + 30);
  T(page.who, x + 88, y + 34, 16, 'left', page.who === 'KNIGHT' ? '#7fe3ff' : C.ember);
  const wrap = (s, n) => {
    const out = [], words = String(s).split(' '); let ln = '';
    for (const word of words) {
      if ((ln + ' ' + word).trim().length > n) { if (ln) out.push(ln); ln = word; }
      else ln = ln ? ln + ' ' + word : word;
    }
    if (ln) out.push(ln);
    return out;
  };
  wrap(page.text, 64).forEach((ln, k) => T(ln, x + 88, y + 62 + k * 22, 15, 'left', '#dfe8ff'));
  T(`${d.i + 1}/${d.pages.length}    F / ENTER`, x + w - 20, y + h - 18, 12, 'right', '#5d6a8a');
}
function drawPause() {
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  ctx.fillStyle = 'rgba(5,7,15,.78)'; ctx.fillRect(0, 0, VW, VH);
  const opts = g.l.kind === 'tutorial' ? ['RESUME', 'SKIP TUTORIAL'] : g.l.kind === 'level' ? ['RESUME', 'RETURN TO HUB'] : ['RESUME', 'REPLAY TUTORIAL'];
  T('PAUSED', VW / 2, 210, 34, 'center', C.ember);
  opts.forEach((o, i) => {
    const on = i === g.pauseSel;
    T(o, VW / 2, 270 + i * 34, 18, 'center', on ? '#e4ecff' : '#8f9bb8');
    if (on) { ctx.strokeStyle = C.ember; ctx.lineWidth = 1.5; ctx.strokeRect(VW / 2 - 120, 252 + i * 34, 240, 26); }
  });
  T('UP / DOWN  select     ENTER  choose     ESC  resume', VW / 2, 430, 13, 'center', '#5d6a8a');
  T('L  block (perfect parry reflects)', VW / 2, 462, 13, 'center', '#8f9bb8');
}

/* ---------------- loop ---------------- */
let last = 0;
function frame(ts) {
  const dt = Math.min(.033, (ts - last) / 1000 || 0); last = ts;
  if (pressed.menu && !g.dialog) {
    if (g.shop) g.shop = null;
    else { g.paused = !g.paused; g.pauseSel = 0; }
  }
  if (pressed.mute) A.toggle();
  if (g.stopT > 0) g.stopT -= dt;
  else { update(dt); clearPressed(); }
  drawWorld();
  requestAnimationFrame(frame);
}

function newGame() {
  run = freshRun();
  setKnight(run.skin, run.emberSword);
  persist(run);
  loadScene('tutorial');
}
function replayTutorial() {
  run.tutorialDone = false; run.abil.dash = false; run.scene = 'tutorial';
  save();
  loadScene('tutorial');
}
function importFromV1() {
  run = importV1Run(readV1());
  setKnight(run.skin, run.emberSword);
  persist(run);
  loadScene('hub');
  return run;
}
function returnHub() { run.hp = g.p.hp; run.scene = 'hub'; save(); loadScene('hub'); }

addEventListener('keydown', () => A.init());
addEventListener('beforeunload', save);
loadScene(sceneId);
requestAnimationFrame(frame);

export const dbg = {
  get g() { return g; }, get run() { return run; }, get sceneId() { return sceneId; },
  SCENES, TOTAL_COINS, loadScene, newGame, importV1: importFromV1, returnHub, save,
  start: () => { g.paused = false; g.dialog = null; },
  setKnight, SKIN_NAMES,
};
