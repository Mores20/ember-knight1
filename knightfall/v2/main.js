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
const save = () => { if (g) run.hp = Math.max(1, Math.min(3, g.p.hp)); persist(run); };

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
  if (id === 'hub' && stage === 1 && l.hub && l.hub.barrier) {
    l.solids.push({ ...l.hub.barrier, barrier: 1 });              // Market Lane is shut until Area I falls
  }
  const p = new Player(); p.reset(L.spawn[0], L.spawn[1]);
  p.hp = Math.max(1, Math.min(3, run.hp));
  const camX = Math.max(0, Math.min(l.w - VW, p.x - 380));
  g = {
    l, id, p, abil: run.abil, stage,
    enemies: (l.enemies || []).map(makeEnemy),
    coins: l.coins.map(([x, y], k) => ({ x, y, k, got: got.c.includes(k) ? 1 : 0 })),
    hearts: l.hearts.map(([x, y], k) => ({ x, y, k, got: got.h.includes(k) ? 1 : 0 })),
    secrets: l.secrets, props: l.props, got,
    parts: [], orbs: [], wardT: 1.2,
    cam: { x: camX, y: 0 }, shk: 0, stopT: 0, t: 0, time: 0, msg: 3.2,
    cp: l.cps[0], fade: 0, fadeTo: null, fadeAfter: null,
    paused: false, pauseSel: 0, dialog: null, prompt: '', near: null,
    found: 0, foundName: '', grant: 0, grantKind: 'dash', healMsg: 0,
    stageMsg: id === 'hub' && stage === 2 ? 3.2 : 0,
    dummyT: 0, parryMsg: 0, state: 'play', blockEnabled: true,
    tutStep: 0, wardHp: l.ward ? (l.ward.hp || 3) : 0, wardBroken: !l.ward,
    wardBlocks: 0, dummyHits: 0, kills: 0, cpT: 0, wardMsg: 0, blockMsg: 0, sealMsg: 0,
    shake: n => { g.shk = Math.max(g.shk, n); },
    stop: t => { g.stopT = Math.max(g.stopT, t); },
  };
  persist(run);
}

const respawn = () => {
  const p = g.p;
  p.reset(g.cp[0], g.cp[1] - p.h);
  p.inv = 1.5;
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

const gateOpen = gate => !!(gate.open || (gate.openWhen === 'ICleared' && run.cleared.I));

const AREA_LEVELS = { I: ['a1', 'a2', 'a3'] };
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

function nearest() {
  const p = g.p, cx = p.x + p.w / 2;
  if (g.l.hub) {
    const h = g.l.hub;
    const near = (x, y, r = 72) => Math.abs(cx - x) < r && Math.abs((p.y + p.h) - y) < 70;
    for (const gate of h.gates) if (near(gate.x + gate.w / 2, gate.y + gate.h)) return { type: 'gate', obj: gate, label: gateOpen(gate) ? 'F  ENTER' : 'F  GATE' };
    if (near(h.hearth.x, h.hearth.y, 64)) return { type: 'hearth', obj: h.hearth, label: 'F  REST' };
    for (const npc of h.npcs) if (near(npc.x, npc.y, 56)) return { type: 'npc', obj: npc, label: 'F  TALK' };
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
        const dest = gate.to === 'a1' ? areaStart('I') : gate.to;
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
  if (g.parryMsg > 0) g.parryMsg -= dt;
  if (g.dummyT > 0) g.dummyT -= dt;
  if (g.cpT > 0) g.cpT -= dt;
  if (g.wardMsg > 0) g.wardMsg -= dt;
  if (g.blockMsg > 0) g.blockMsg -= dt;
  if (g.sealMsg > 0) g.sealMsg -= dt;

  p.update(dt, g.l.solids, g);
  if (p.hp <= 0) { p.hp = 3; A.sfx.die(); respawn(); save(); }

  // checkpoints
  if (p.ground) {
    let best = g.l.cps[0];
    for (const c of g.l.cps) if (p.x > c[0]) best = c;
    for (const t of g.l.torches) if (t.cp && t.lit && p.x > t.x && t.x > best[0]) best = [t.x, t.y];
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
    if (g.l.ward && g.wardHp > 0) {
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
      g.stop(.07); g.shake(5); A.sfx.hit(); spark(e.x + e.w / 2, e.y + e.h / 2, dead ? 18 : 8, C.ember);
      if (dead) { e.dead = 1; g.kills++; A.sfx.kill(); }
    }
  }
  g.enemies = g.enemies.filter(e => !e.dead);
  for (const e of g.enemies) {
    e.update(dt, p, g);
    if (hit(p, e) && p.inv <= 0) p.hurt(e.x + e.w / 2, g);
  }

  // pickups
  for (const c of g.coins) if (!c.got && hit(p, { x: c.x - 9, y: c.y - 9, w: 18, h: 18 })) {
    c.got = 1; run.coins++; run.gold++; g.got.c.push(c.k); A.sfx.coin(); save();
  }
  for (const h of g.hearts) if (!h.got && p.hp < 3 && hit(p, { x: h.x - 11, y: h.y - 11, w: 22, h: 22 })) {
    h.got = 1; p.hp++; g.got.h.push(h.k); A.sfx.heart(); save();
  }

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

  // fall
  if (p.y > g.l.h) {
    p.hp--;
    if (p.hp <= 0) { p.hp = 3; A.sfx.die(); } else A.sfx.hurt();
    respawn(); save();
  }

  g.shk *= .88; if (g.shk < .3) g.shk = 0;
  const camT = Math.max(0, Math.min(g.l.w - VW, p.x - 380));
  g.cam.x += (camT - g.cam.x) * .12;
  for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; q.l -= dt; }
  g.parts = g.parts.filter(q => q.l > 0);
}

/* ---------------- world drawing ---------------- */
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

  const far = [[60, 180, 210], [380, 160, 260], [760, 200, 180], [1120, 170, 240], [1460, 190, 210]];
  for (let i = 0; i < far.length; i++) {
    const [bx, w, h] = far[i], x = bx - camX * .12;
    if (x < -w - 40 || x > VW + 40) continue;
    townHouse(x, 420, w, h, .26, stage, i, t);
  }
  const near = [[-40, 220, 260], [300, 260, 300], [760, 240, 280], [1180, 250, 300], [1580, 220, 260]];
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

  drawLamp(300, 420, g.t, true);
  drawLamp(900, 420, g.t, warm);
  drawLamp(1300, 420, g.t, warm);

  drawSign(1545, 292, 'I  THE EMBER ROAD', '#ffd27a', `${(run.levels.I || []).filter(Boolean).length}/3`);
  if (warm) drawSign(1795, 292, 'MARKET LANE', '#ffd27a', 'OPEN');
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

  ctx.setTransform(1, 0, 0, 1, -g.cam.x + (Math.random() - .5) * g.shk * 2, BAR - g.cam.y + (Math.random() - .5) * g.shk * 2);
  for (const s of g.l.solids) if (!s.off && !s.pass && !s.barrier) drawSolid(ctx, s, g.l.style || 'road', s.broken);
  drawProps(ctx, g.props, g.l.style || 'road', g.t);
  for (const sg of g.l.signs || []) drawWaystone(sg.x, sg.y, sg.text, sg.sub);

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
      if (g.near && g.near.obj === gate) T(gate.label, gate.x + gate.w / 2, gate.y - 34, 12, 'center', gateOpen(gate) ? '#ffd27a' : '#8f9bb8');
    }
  } else if (g.l.gate) {
    drawGate(g.l.gate.x, g.l.gate.y, g.l.gate.w, g.l.gate.h, !g.l.ward || g.wardHp <= 0);
  }
  if (g.l.ward) drawWard(g.l.ward.x, g.l.ward.y, g.t, g.wardT, g.wardHp, g.kills > 0);

  for (const c of g.coins) if (!c.got) drawCoin(ctx, c.x, c.y + Math.sin(g.t * 3 + c.x) * 2, g.t + c.x * .11);
  for (const h of g.hearts) if (!h.got) drawHeartPickup(ctx, h.x, h.y - 8 + Math.sin(g.t * 3) * 2, 22);

  for (const sec of g.secrets) {
    if ((run.secrets[g.id] || []).includes(sec.k)) continue;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const dx = Math.max(sec.x - cx, 0, cx - (sec.x + sec.w)), dy = Math.max(sec.y - cy, 0, cy - (sec.y + sec.h));
    drawSecretVeil(ctx, sec, g.l.style || 'road', Math.max(0, Math.min(1, (Math.hypot(dx, dy) - 30) / 170)), g.t);
  }

  for (const e of g.enemies) drawEnemy(e);
  for (const o of g.orbs) {
    glow(o.x, o.y, o.reflected ? 34 : 24, .3);
    ctx.strokeStyle = o.reflected ? '#fff2b0' : C.ember; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.stroke();
    ctx.fillStyle = o.reflected ? '#fff2b0' : C.ember; ctx.beginPath(); ctx.arc(o.x, o.y, o.r - 3, 0, 7); ctx.fill();
  }
  drawPlayer(p);
  for (const q of g.parts) { ctx.globalAlpha = Math.min(1, q.l * 2); ctx.fillStyle = q.col; ctx.fillRect(q.x, q.y, 3, 3); }
  ctx.globalAlpha = 1;

  drawHud();
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
  if (g.near && !g.paused && !g.dialog) T(g.near.label, VW / 2, 468, 14, 'center', C.ember);
  if (g.grant > 0) {
    ctx.globalAlpha = Math.min(1, g.grant / .5) * Math.min(1, (3.4 - g.grant) * 2.5);
    ctx.fillStyle = 'rgba(5,7,15,.72)'; ctx.fillRect(VW / 2 - 220, 166, 440, 70);
    T(g.grantKind === 'dash' ? 'EMBER DASH' : 'NEW ABILITY', VW / 2, 202, 30, 'center', C.ember);
    T(g.grantKind === 'dash' ? 'SHIFT  \u2014 one surge per jump' : '', VW / 2, 226, 14, 'center', '#cfd8ee');
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
    T('THE WARD SEALS THE GATE', VW / 2, g.parryMsg > 0 ? 162 : 130, 20, 'center', C.ember);
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
    T('THE TOWN IS WAKING', VW / 2, 160, 22, 'center', '#ffd27a');
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
  if (e.type === 'bat') {
    const face = Math.cos(e.t * e.sp + e.ph) >= 0 ? 1 : -1;
    drawMob(ctx, 'bat', 'fly', Math.floor(e.t * 14 + e.ph * 3), e.x + e.w / 2, e.y + e.h / 2, face, flash);
  } else if (e.type === 'shield') {
    drawMob(ctx, 'shield', e.st === 'down' ? 'open' : 'guard', Math.floor(e.t * 6), e.x + e.w / 2, e.y + e.h, e.dir, flash);
  } else {
    const dxp = (g.p.x + g.p.w / 2) - (e.x + e.w / 2);
    const near = Math.abs(dxp) < 52 && Math.sign(dxp) === e.dir;
    drawMob(ctx, 'goblin', near ? 'strike' : 'walk', near ? Math.floor(e.t * 6) : Math.floor(e.t * 9),
      e.x + e.w / 2, e.y + e.h, e.dir, flash);
  }
}

function drawPlayer(p) {
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;
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
  ctx.fillStyle = POP.coin; ctx.fillRect(118, 7, 9, 9);
  ctx.fillStyle = '#a98a3f'; ctx.fillRect(120, 9, 5, 5);
  T(`x ${run.coins}/${TOTAL_COINS}`, 134, 16, 13, 'left', '#cfd8ee');
  T(g.l.title, VW / 2, 16, 12, 'center', '#8f9bb8');
  T(`${g.time.toFixed(1)}s`, VW - 20, 16, 13, 'right', '#cfd8ee');
  ctx.setTransform(1, 0, 0, 1, 0, BOT);
  T(g.l.kind === 'hub' ? 'CINDERHAVEN \u2014 ASH SQUARE' : g.l.name, 20, 14, 11, 'left', '#5d6a8a');
  T('A/D MOVE   SPACE JUMP   J ATTACK   SHIFT DASH   L BLOCK   F USE   ESC PAUSE', VW - 20, 14, 11, 'right', '#5d6a8a');
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
  if (pressed.menu && !g.dialog) { g.paused = !g.paused; g.pauseSel = 0; }
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
