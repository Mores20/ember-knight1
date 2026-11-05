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
  const p = new Player(); p.reset(L.spawn[0], L.spawn[1]);
  p.hp = Math.max(1, Math.min(3, run.hp));
  const camX = Math.max(0, Math.min(l.w - VW, p.x - 380));
  g = {
    l, id, p, abil: run.abil,
    enemies: (l.enemies || []).map(makeEnemy),
    coins: l.coins.map(([x, y], k) => ({ x, y, k, got: got.c.includes(k) ? 1 : 0 })),
    hearts: l.hearts.map(([x, y], k) => ({ x, y, k, got: got.h.includes(k) ? 1 : 0 })),
    secrets: l.secrets, props: l.props, got,
    parts: [], orbs: [], wardT: 2.2,
    cam: { x: camX, y: 0 }, shk: 0, stopT: 0, t: 0, time: 0, msg: 3.2,
    cp: l.cps[0], fade: 0, fadeTo: null, fadeAfter: null,
    paused: false, pauseSel: 0, dialog: null, prompt: '', near: null,
    found: 0, foundName: '', grant: 0, grantKind: 'dash', healMsg: 0,
    dummyT: 0, parryMsg: 0, state: 'play', blockEnabled: true,
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
  const after = run.cleared.I;
  const lines = {
    clint: after
      ? ['Still alive? Huh. Fine. Tip: parry the big ones. Dodging is for cowards. And me.']
      : ['Oh good, another hero. Ash is that way. Dying is that way too.'],
    patino: after
      ? ['People are coming back. They keep asking for seconds. I... don\u2019t mind.']
      : ['...Hot stew. It\u2019s not much. But it\u2019s warm.'],
  };
  g.dialog = { name: npc.name, lines: lines[npc.id] || ['...'], i: 0, t: 0 };
  A.sfx.grant();
}

function useNear() {
  const n = g.near;
  if (!n) return;
  if (n.type === 'gate') {
    const gate = n.obj;
    if (gateOpen(gate)) {
      if (gate.to) transition(gate.to, () => { run.hp = g.p.hp; persist(run); });
      else g.dialog = { name: 'MARKET LANE', lines: ['The lane is open. The merchant is still setting up his stall.'], i: 0, t: 0 };
    } else {
      g.dialog = { name: 'SEALED GATE', lines: [gate.closed || 'Sealed in ash.'], i: 0, t: 0 };
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
  if (!w) return;
  const sx = w.x, sy = w.y - 42;
  const tx = p.x + p.w / 2, ty = p.y + p.h * .45;
  const d = Math.hypot(tx - sx, ty - sy) || 1;
  g.orbs.push({ x: sx, y: sy, vx: (tx - sx) / d * 132, vy: (ty - sy) / d * 132, r: 7, t: 7, reflected: 0 });
  g.wardT = 2.2;
  A.sfx.ember();
}

function updateOrbs(dt) {
  const p = g.p;
  for (const o of g.orbs) {
    o.t -= dt; o.x += o.vx * dt; o.y += o.vy * dt;
    const box = { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
    const gd = p.guard();
    if (gd && hit(gd, box)) {
      if (p.parry > 0) {
        o.reflected = 1; o.vx *= -1.28; o.vy *= -1.28;
        g.parryMsg = 2.2; A.sfx.parry(); spark(o.x, o.y, 12, '#fff2b0'); g.stop(.05); g.shake(3);
      } else {
        o.done = 1; A.sfx.block(); spark(o.x, o.y, 7, '#7fe3ff'); g.shake(2);
      }
    } else if (p.inv <= 0 && hit(p, box)) {
      o.done = 1; p.hurt(o.x, g);
    }
    if (o.reflected && g.l.ward && Math.abs(o.x - g.l.ward.x) < 30 && Math.abs(o.y - (g.l.ward.y - 30)) < 54) {
      o.done = 1; g.wardT = 3.4; g.shake(5); A.sfx.kill(); spark(g.l.ward.x, g.l.ward.y - 34, 18, '#ffd479');
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
      if (g.dialog.i >= g.dialog.lines.length) g.dialog = null; else A.sfx.land();
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
  if (g.parryMsg > 0) g.parryMsg -= dt;
  if (g.dummyT > 0) g.dummyT -= dt;

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
  g.prompt = '';
  for (const pr of g.l.prompts || []) if (p.x >= pr.x) g.prompt = pr.text;

  // exits
  const ex = g.l.exit;
  if (ex && hit(p, ex)) {
    transition(ex.to, () => {
      if (ex.tutorial) { run.tutorialDone = true; run.abil.dash = true; }
      if (ex.area) run.cleared[ex.area] = true;
      run.hp = p.hp; run.scene = 'hub'; save();
      A.sfx.grant();
    });
    return;
  }

  // hub interaction
  g.near = g.l.hub ? nearest() : null;
  if (g.near && pressed.talk) useNear();

  // practice dummy
  const d = g.l.dummy || g.l.hub?.dummy;
  if (d && g.dummyT <= 0) {
    const s = p.sword();
    if (s && hit(s, { x: d.x - 16, y: d.y - 48, w: 32, h: 48 })) {
      g.dummyT = .35; spark(d.x, d.y - 30, 6, '#ffd08a'); A.sfx.block(); g.shake(2);
    }
  }

  // training ward
  if (g.l.ward) {
    const w = g.l.ward;
    const dist = Math.abs((p.x + p.w / 2) - w.x);
    g.wardT -= dt;
    if (dist < w.range && g.wardT <= 0 && p.inv <= 0 && !g.dialog) fireWard();
  }
  updateOrbs(dt);

  // sword: torches, enemies
  const s = p.sword();
  if (s) {
    for (const t of g.l.torches) if (!t.lit && hit(s, { x: t.x - 10, y: t.y - 58, w: 20, h: 58 })) {
      t.lit = 1;
      if (!run.lit[g.id].includes(t.i)) run.lit[g.id].push(t.i);
      A.sfx.torch(); spark(t.x, t.y - 56, 12, C.ember); g.shake(2); save();
    }
    for (const e of g.enemies) if (!p.hits.has(e) && hit(s, { x: e.x - 4, y: e.y - 4, w: e.w + 8, h: e.h + 8 })) {
      p.hits.add(e);
      const dead = e.hit(p.face);
      g.stop(.07); g.shake(5); A.sfx.hit(); spark(e.x + e.w / 2, e.y + e.h / 2, dead ? 18 : 8, C.ember);
      if (dead) { e.dead = 1; A.sfx.kill(); }
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
  ctx.fillStyle = open ? '#ffd27a' : '#3b2b22';
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 28);
  ctx.arc(x + w / 2, y + 28, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  if (open) goldGlow(x + w / 2, y + h - 10, 46, .18);
  else {
    ctx.strokeStyle = C.ember; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 16, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 10, y + h / 2); ctx.lineTo(x + w / 2 + 10, y + h / 2); ctx.stroke();
    glow(x + w / 2, y + h / 2, 44, .16);
  }
  ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 6, y - 24, w + 12, 8);
}
function drawHearth(x, y, t) {
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 26, y - 12, 52, 12);
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 18, y - 20, 36, 10);
  const f = 1 + Math.sin(t * 12 + x) * .14;
  goldGlow(x, y - 26, 58 * f, .34);
  ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.quadraticCurveTo(x + 12, y - 26, x, y - 20); ctx.quadraticCurveTo(x - 12, y - 26, x, y - 46); ctx.fill();
  ctx.fillStyle = '#fff2b0'; ctx.fillRect(x - 3, y - 30, 6, 9);
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x + 20, y - 30, 14, 16);      // the pot
  ctx.fillStyle = '#3a4257'; ctx.fillRect(x + 18, y - 32, 18, 4);
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
function drawClint(x, y, t, px) {
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 22, y - 12, 44, 12);      // plinth
  ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 16, y - 18, 32, 8);
  ctx.fillStyle = '#3a4262'; ctx.fillRect(x - 13, y - 46, 26, 30);      // body
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 18, y - 52, 10, 22); ctx.fillRect(x + 8, y - 52, 10, 22);
  ctx.fillStyle = '#565c78'; ctx.beginPath(); ctx.arc(x, y - 50, 11, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 12, y - 52, 4, 6); ctx.fillRect(x + 8, y - 52, 4, 6);   // horns
  const look = Math.max(-2, Math.min(2, (px - x) * .02));
  ctx.fillStyle = C.ember; ctx.fillRect(x - 5 + look, y - 52, 3, 2); ctx.fillRect(x + 3 + look, y - 52, 3, 2);
  ctx.fillStyle = '#3a4262'; ctx.fillRect(x - 7, y - 43, 14, 2);         // mouth
}
function drawPatino(x, y, t) {
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(x - 9, y - 26, 18, 26);        // apron
  ctx.fillStyle = '#4a3219'; ctx.fillRect(x - 12, y - 34, 24, 12);
  ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.arc(x, y - 40, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 4, y - 42, 2, 2); ctx.fillRect(x + 2, y - 42, 2, 2);
  ctx.strokeStyle = '#8f9bb8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 12, y - 30); ctx.lineTo(x + 20, y - 44); ctx.stroke();   // ladle
  ctx.fillStyle = '#8f9bb8'; ctx.beginPath(); ctx.arc(x + 21, y - 46, 3, 0, 7); ctx.fill();
}
function drawWard(x, y, t, cool) {
  ctx.fillStyle = '#2a3348'; ctx.fillRect(x - 6, y - 34, 12, 34);
  ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 10, y - 40, 20, 6);
  const ready = cool <= 0;
  if (ready) glow(x, y - 46, 34, .28);
  ctx.fillStyle = ready ? C.ember : '#3a4257';
  ctx.beginPath(); ctx.arc(x, y - 46, 7 + Math.sin(t * 4) * .8, 0, 7); ctx.fill();
  ctx.fillStyle = ready ? '#ffd08a' : '#4a5578'; ctx.fillRect(x - 2, y - 48, 4, 4);
  if (ready) { ctx.strokeStyle = 'rgba(255,138,61,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 46, 13, 0, 7); ctx.stroke(); }
}
function drawTownBackdrop(camX, t) {
  const th = THEMES[0];
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 380 - camX * .18, w = 220 + (i % 2) * 60, h = 150 + (i % 3) * 40;
    ctx.globalAlpha = .34; ctx.fillStyle = th.stone;
    ctx.fillRect(x, 420 - h, w, h);
    ctx.beginPath(); ctx.moveTo(x - 12, 420 - h); ctx.lineTo(x + w / 2, 420 - h - 46); ctx.lineTo(x + w + 12, 420 - h); ctx.fill();
    ctx.globalAlpha = .5; ctx.fillStyle = '#ffd27a';
    for (let k = 0; k < 3; k++) if ((i + k) % 3 !== 1) ctx.fillRect(x + 26 + k * 54, 420 - h + 42, 14, 22);
    ctx.globalAlpha = 1;
  }
  const cx = 1560 - camX * .1;                                      // the corrupted castle on the horizon
  ctx.globalAlpha = .28; ctx.fillStyle = th.stone;
  ctx.fillRect(cx, 120, 90, 300); ctx.fillRect(cx + 14, 92, 26, 40); ctx.fillRect(cx + 54, 106, 22, 26);
  ctx.globalAlpha = .22; ctx.fillStyle = C.ember; ctx.fillRect(cx + 30, 170, 8, 18); ctx.fillRect(cx + 56, 210, 8, 18);
  ctx.globalAlpha = 1;
}

function drawWorld() {
  const p = g.p;
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  const th = THEMES[g.l.theme != null ? g.l.theme : 0] || THEMES[0];
  const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, th.sky); sky.addColorStop(1, th.sky2);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  drawBackdrop(ctx, g.l.style || 'road', g.t, g.cam.x, g.cam.y, VW, VH);
  if (g.l.kind === 'hub') drawTownBackdrop(g.cam.x, g.t);

  ctx.setTransform(1, 0, 0, 1, -g.cam.x + (Math.random() - .5) * g.shk * 2, BAR - g.cam.y + (Math.random() - .5) * g.shk * 2);
  for (const s of g.l.solids) if (!s.off && !s.pass) drawSolid(ctx, s, g.l.style || 'road', s.broken);
  drawProps(ctx, g.props, g.l.style || 'road', g.t);

  for (const [x, y] of g.l.lights || []) { ctx.fillStyle = C.ember; ctx.beginPath(); ctx.arc(x, y - 6, 3, 0, 7); ctx.fill(); }
  for (const t of g.l.torches) {
    const f = 1 + Math.sin(g.t * 12 + t.x) * .15;
    drawTorch(ctx, t.x, t.y, t.lit, g.t + t.x * .017);
    if (t.lit) glow(t.x, t.y - 56, 110 * f, .32);
    else if (t.cp) { ctx.strokeStyle = 'rgba(255,179,71,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(t.x, t.y - 52, 12, 0, 7); ctx.stroke(); }
  }

  if (g.l.hub) {
    const h = g.l.hub;
    drawHearth(h.hearth.x, h.hearth.y, g.t);
    drawDummy(h.dummy.x, h.dummy.y, g.t, g.dummyT);
    for (const npc of h.npcs) {
      if (npc.id === 'clint') drawClint(npc.x, npc.y, g.t, p.x + p.w / 2);
      else drawPatino(npc.x, npc.y, g.t);
      if (g.near && g.near.obj === npc) T(npc.name, npc.x, npc.y - 80, 12, 'center', C.ember);
    }
    for (const gate of h.gates) {
      drawGate(gate.x, gate.y, gate.w, gate.h, gateOpen(gate));
      if (g.near && g.near.obj === gate) T(gate.label, gate.x + gate.w / 2, gate.y - 34, 12, 'center', gateOpen(gate) ? '#ffd27a' : '#8f9bb8');
    }
  } else if (g.l.gate) {
    drawGate(g.l.gate.x, g.l.gate.y, g.l.gate.w, g.l.gate.h, true);
  }
  if (g.l.ward) drawWard(g.l.ward.x, g.l.ward.y, g.t, g.wardT);

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
    ctx.fillStyle = 'rgba(5,7,15,.72)'; ctx.fillRect(VW / 2 - 300, 448, 600, 30);
    T(g.prompt, VW / 2, 468, 14, 'center', '#dfe8ff');
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
  if (g.healMsg > 0) {
    ctx.globalAlpha = Math.min(1, g.healMsg);
    T('HEARTS RESTORED', VW / 2, 130, 22, 'center', '#ffd27a');
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

function drawDialog() {
  ctx.setTransform(1, 0, 0, 1, 0, BAR);
  const d = g.dialog, w = 700, x = (VW - w) / 2, y = 372, h = 118;
  ctx.fillStyle = 'rgba(5,7,15,.95)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2f3750'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
  T(d.name, x + 20, y + 28, 16, 'left', C.ember);
  const wrap = (s, n) => {
    const out = [], words = String(s).split(' '); let ln = '';
    for (const word of words) {
      if ((ln + ' ' + word).trim().length > n) { if (ln) out.push(ln); ln = word; }
      else ln = ln ? ln + ' ' + word : word;
    }
    if (ln) out.push(ln);
    return out;
  };
  wrap(d.lines[d.i] || '', 72).forEach((ln, k) => T(ln, x + 20, y + 58 + k * 22, 15, 'left', '#dfe8ff'));
  T('F / ENTER', x + w - 20, y + h - 18, 12, 'right', '#5d6a8a');
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
