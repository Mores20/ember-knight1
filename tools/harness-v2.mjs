// Headless regression suite for the v2 vertical slice.
// Drives the real tutorial -> hub -> Area I loop against a stubbed DOM/canvas.
import { fileURLToPath } from 'node:url';

const fail = [];
const ok = (c, label) => { console.log((c ? 'PASS  ' : 'FAIL  ') + label); if (!c) fail.push(label); };

/* ---------- stubs ---------- */
const calls = {}, texts = [];
const ctx2d = new Proxy({}, {
  get(t, k) {
    if (k in t) return t[k];
    if (typeof k === 'symbol') return undefined;
    return (...a) => {
      calls[k] = (calls[k] || 0) + 1;
      if (k === 'fillText') texts.push(a[0]);
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return { addColorStop() {} };
      if (k === 'measureText') return { width: 0 };
      return undefined;
    };
  },
  set(t, k, v) { t[k] = v; return true; },
});
const canvas = { width: 960, height: 540, getContext: () => ctx2d, style: {} };
globalThis.document = {
  getElementById: () => canvas, hidden: false,
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }),
};
globalThis.ImageData = class { constructor(data, w, h) { if (!(w > 0) || !(h > 0)) throw new Error('bad ImageData ' + w + 'x' + h); this.data = data; this.width = w; this.height = h; } };
globalThis.window = globalThis;
const listeners = {};
globalThis.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
let rafCb = null;
globalThis.requestAnimationFrame = fn => { rafCb = fn; return 1; };
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
};
class FakeNode { connect() {} start() {} stop() {} }
globalThis.AudioContext = class {
  constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 44100; this.destination = new FakeNode(); }
  createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  createBuffer(c, len) { return { getChannelData() { return new Float32Array(len); } }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {} }; }
  resume() { return Promise.resolve(); }
};
const fire = (type, code) => (listeners[type] || []).forEach(fn => fn({ code, preventDefault() {}, repeat: false }));
let ts = 0;
const frames = n => { for (let i = 0; i < n; i++) { ts += 16.7; const cb = rafCb; rafCb = null; if (!cb) throw new Error('loop died at frame ' + i); cb(ts); } };

/* ---------- a v1 save so boot imports it ---------- */
store.set('emberknight.v1', JSON.stringify({
  lvl: 1, hp: 2, coins: 50, gold: 40, time: 12,
  abil: { dash: true, lantern: true }, got: {}, lit: {},
  cleared: [true, false, false, false, false, false, false, false],
  skin: 'frost', emberSword: true, titled: true,
}));

const here = p => new URL(p, import.meta.url);
const { dbg } = await import(here('../knightfall/v2/main.js'));
const MOBART = await import(here('../knightfall/mobs.js'));
const SCENES = dbg.SCENES;
frames(5);

/* ================= 1. v1 import and boot ================= */
ok(dbg.sceneId === 'hub' && dbg.run.tutorialDone === true, 'a v1 save imports into Cinderhaven with the tutorial done');
ok(dbg.run.gold === 40 && dbg.run.skin === 'frost' && dbg.run.abil.dash && dbg.run.emberSword, 'the import carries gold, skin, dash and the ember sword');
ok(JSON.parse(store.get('emberknight.v1')).coins === 50, 'the v1 save is left untouched');
ok(dbg.run.saveVersion === 2, 'the v2 save has its own version');
ok(texts.some(t => t === 'x 0/' + dbg.TOTAL_COINS), 'the HUD shows the v2 coin total (' + dbg.TOTAL_COINS + ')');

const hub = dbg.g;
ok(hub.l.kind === 'hub' && hub.enemies.length === 0, 'Cinderhaven is a safe hub with no enemies');
ok(hub.l.hub.gates.length === 2, 'the hub has two gates');
ok(hub.stage === 1 && hub.l.solids.some(s => s.barrier), 'Market Lane is sealed in the first town stage');

const crowBad = [];
for (const [st, n] of Object.entries(MOBART.ROWS.crow)) {
  const fs = Array.from({ length: n }, (_, i) => MOBART.frame('crow', st, i));
  if (!fs.every(c => c.some(v => v !== 0))) crowBad.push(st + ':empty');
  if (n > 1 && new Set(fs.map(f => f.join(','))).size === 1) crowBad.push(st + ':static');
}
ok(crowBad.length === 0, 'the Cinder Crow has perch, flare, dive and recover frames' + (crowBad.length ? ' -> ' + crowBad.join(',') : ''));

/* ================= 2. hub interactions ================= */
hub.p.hp = 1; hub.p.x = hub.l.hub.hearth.x - 12; hub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(hub.p.hp === 3, 'Patino\u2019s Hearth heals to full');

hub.p.x = hub.l.hub.dummy.x - 20; hub.p.y = 386; hub.p.face = 1; hub.p.swing = .15; frames(8);
ok(hub.dummyT > 0 || hub.parts.length > 0, 'the practice dummy takes a sword hit');

hub.p.x = 140; hub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(hub.dialog && hub.dialog.pages[0].who === 'CLINT' && hub.dialog.pages.length === 2, 'Clint talks, with a knight reply the first time');
hub.dialog = null;
fire('keydown', 'KeyF'); frames(8); fire('keyup', 'KeyF'); frames(2);
ok(hub.dialog && hub.dialog.pages.length === 1, 'talking again skips the repeated reply');
hub.dialog = null;
ok(JSON.parse(store.get('emberknight.v2')).talked.clint.n === 2, 'the conversation count is saved');

hub.p.x = 1480; hub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'a1' && dbg.g.l.kind === 'level', 'Gate I opens 1-1');

/* ================= 3. Area I: three levels and the return trip ================= */
const a1 = dbg.g;
ok(a1.enemies.length > 0 && a1.l.exit && a1.l.cps.length > 0, '1-1 has enemies, checkpoints and an exit');

const sec1 = a1.l.secrets[0];
const ledge1 = a1.l.solids.find(s => s.oneway && s.y >= sec1.y + sec1.h - 70 && s.y <= sec1.y + sec1.h);
a1.p.reset(sec1.x + sec1.w / 2 - a1.p.w / 2, ledge1.y - a1.p.h); frames(3);
ok((dbg.run.secrets.a1 || []).includes(0), 'the Cook\u2019s Satchel is a discoverable secret');

const scav = a1.enemies.find(e => e.type === 'scavenger');
ok(!!scav, '1-1 has a Road Scavenger');
const loot = a1.coins.find(c => !c.got && !c.taken && c.x > 1250);
scav.x = loot.x - 8; a1.p.x = 100; frames(3);
ok(loot.taken === 1 && scav.carry.length > 0, 'the Scavenger pockets a loose coin');
a1.p.x = scav.x - 30; a1.p.y = 386; a1.p.face = 1; scav.hp = 1; a1.p.swing = .15; frames(6);
ok(scav.dead && loot.taken === 0, 'killing the Scavenger drops the sack');

const loot2 = a1.coins.find(c => !c.got && !c.taken);
scav.dead = 0; scav.hp = 1; scav.st = 'patrol'; scav.carry = []; scav.x = loot2.x - 8;
a1.enemies.push(scav); a1.p.hits.clear(); a1.p.x = 100; frames(3);
scav.st = 'flee'; scav.x = scav.x1 + 149; a1.p.x = scav.x - 60; a1.p.y = 386; frames(2);
ok(scav.dead && loot2.taken === 0 && loot2.x === loot2.ox, 'an escaped Scavenger returns its coins');

a1.p.x = a1.l.exit.x + a1.l.exit.w / 2 - a1.p.w / 2; a1.p.y = a1.l.exit.y + a1.l.exit.h - a1.p.h; frames(40);
ok(dbg.sceneId === 'a2' && dbg.run.levels.I[0] === true, '1-1 leads to 1-2 and is marked cleared');
dbg.returnHub(); frames(3);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.I === false, 'returning to town keeps Area I unfinished');
const hres = dbg.g;
hres.p.x = 1480; hres.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'a2', 'Gate I resumes at the first uncleared level');
const a2 = dbg.g;
const crow = a2.enemies.find(e => e.type === 'crow');
a2.p.x = 700; a2.p.y = 326; a2.p.inv = 999; frames(80);
ok(crow && crow.st !== 'perch', 'the Cinder Crow flares and dives from its perch');
a2.p.x = a2.l.exit.x + a2.l.exit.w / 2 - a2.p.w / 2; a2.p.y = a2.l.exit.y + a2.l.exit.h - a2.p.h; frames(40);
ok(dbg.sceneId === 'a3' && dbg.run.levels.I[1] === true, '1-2 leads to 1-3 and is marked cleared');
const a3 = dbg.g;
const boss = a3.boss;
ok(boss && boss.st === 'dormant', 'the Gatekeeper Brute waits in 1-3');
a3.p.x = 910; a3.p.y = 226; a3.p.inv = 999; frames(20);
ok(boss.st !== 'dormant', 'the Brute wakes on the keep roof');
boss.hp = 8; boss.st = 'charge'; boss.stT = 0; boss.vx = 400; boss.dir = 1; boss.x = 1000; boss.hitDone = 0;
a3.p.x = 1030; a3.p.y = 226; a3.p.face = -1; a3.p.inv = 0;
fire('keydown', 'KeyL'); frames(1);
ok(boss.st === 'stunned', 'a perfect guard stuns the Brute\u2019s charge');
fire('keyup', 'KeyL');
boss.st = 'stunned'; boss.stunT = 9; boss.stT = 0; boss.hp = 1;
a3.p.x = 990; a3.p.y = 226; a3.p.face = 1; a3.p.swing = .15; frames(8);
ok(boss.hp === 0 && boss.st === 'dead', 'the Brute falls and the gate opens');
a3.p.x = a3.l.exit.x + a3.l.exit.w / 2 - a3.p.w / 2; a3.p.y = a3.l.exit.y + a3.l.exit.h - a3.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.I === true && dbg.run.levels.I[2] === true, '1-3 returns to the hub and completes Area I');
ok(JSON.parse(store.get('emberknight.v2')).cleared.I === true, 'area progress is saved');
ok(JSON.parse(store.get('emberknight.v2')).levels.I.every(Boolean), 'level progress is saved');

/* ================= 4. Gate II after the clear ================= */
const hub2 = dbg.g;
ok(hub2.stage === 2 && !hub2.l.solids.some(s => s.barrier), 'Area I clears the Market Lane barrier and wakes the town');

hub2.p.x = 140; hub2.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(hub2.dialog && hub2.dialog.pages[0].who === 'CLINT' && hub2.dialog.pages[0].text.includes('Still alive'), 'Clint has a stage-2 line and a new reply');
hub2.dialog = null;

hub2.p.x = 520; hub2.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(hub2.dialog && hub2.dialog.pages[0].who === 'PATINO', 'Patino talks by the hearth');
hub2.dialog = null;

/* ================= 4b. Market Lane and the merchant ================= */
ok(hub2.l.w >= 2400 && hub2.l.hub.market, 'Market Lane extends the street past Gate II');
hub2.p.x = 1980; hub2.p.y = 386; frames(2);
ok(hub2.near && hub2.near.type === 'merchant', 'the Sketchy Merchant waits in Market Lane');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(!!hub2.shop, 'F opens the merchant shop');

dbg.run.gold = 100; hub2.p.hp = 2; hub2.shop.sel = 0;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(hub2.p.hp === 3 && dbg.run.gold === 85 && hub2.shopStock[0] === 1, 'an Ashroot Potion heals one and costs 15');

hub2.shop.sel = 2;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(hub2.p.shield === 1 && dbg.run.shield === 1 && dbg.run.gold === 50, 'the Ember Shield unlocks after Area I');

hub2.p.hp = 1; hub2.shop.sel = 3;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(hub2.p.hp === 3 && dbg.run.gold === 10 && hub2.shopStock[3] === 0, 'the Greater Heart heals two');
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(dbg.run.gold === 10 && hub2.shop.msg.includes('Sold out'), 'bought-out stock refuses further sales');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(1);
ok(!hub2.shop, 'F leaves the shop');

dbg.loadScene('hub'); frames(2);
ok(dbg.g.p.shield === 1, 'the shield is carried across a scene load');
const hs = dbg.g, hp0 = hs.p.hp; hs.p.inv = 0; hs.p.hurt(hs.p.x + 30, hs); frames(6);
ok(hs.p.hp === hp0 && hs.p.shield === 0 && dbg.run.shield === 0, 'the shield eats one hit and is spent');

hs.p.x = 1980; hs.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
dbg.run.gold = 5; hs.p.hp = 2; hs.shop.sel = 0;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(hs.p.hp === 2 && dbg.run.gold === 5 && hs.shop.msg.includes('short'), 'a poor knight cannot buy');

/* ================= 5. new game -> tutorial ================= */
dbg.newGame(); frames(3);
ok(dbg.sceneId === 'tutorial' && dbg.run.tutorialDone === false, 'New Game starts on the tutorial road');
ok(dbg.TOTAL_COINS === SCENES.tutorial.coins.length + SCENES.a1.coins.length + SCENES.a2.coins.length + SCENES.a3.coins.length, 'the coin total is derived from the slice scenes');

const tut = dbg.g;
ok(tut.tutStep === 0 && tut.prompt.includes('move'), 'the tutorial starts on the move step');
tut.p.x = 160; frames(2);
ok(tut.tutStep >= 1 && tut.prompt.includes('jump'), 'moving advances the prompt to jump');
tut.p.x = 1070; frames(3);
ok(dbg.run.abil.dash === true && tut.grant > 0, 'the dash lesson grants the ember dash');
ok(tut.tutStep >= 5, 'the prompt reaches the dash step');

tut.p.reset(1060, 386); tut.p.hp = 3; tut.p.inv = 999; frames(2);
fire('keydown', 'ArrowRight'); frames(10); fire('keydown', 'Space'); frames(10);
fire('keydown', 'ShiftLeft'); frames(1); fire('keyup', 'ShiftLeft'); frames(14);
fire('keyup', 'Space'); frames(24); fire('keyup', 'ArrowRight'); frames(40);
ok(tut.p.x > 1300 && tut.p.ground, 'the dash gap is crossable on foot (x=' + Math.round(tut.p.x) + ', y=' + Math.round(tut.p.y) + ', ground=' + tut.p.ground + ')');

const cpT = tut.l.torches.find(t => t.cp);
tut.p.x = cpT.x - 20; tut.p.y = 386; tut.p.face = 1; tut.p.swing = .15; frames(2);
ok(cpT.lit === 1 && tut.cpT > 0, 'the cold torch lights and sets the checkpoint');
ok(tut.tutStep >= 5, 'lighting the checkpoint advances the prompt');

const gob = tut.enemies.find(e => e.type === 'goblin');
if (gob) { gob.x = 1380; gob.y = 390; gob.dir = 1; gob.sp = 0; gob.hp = 1; }
tut.p.x = 1350; tut.p.y = 386; tut.p.face = 1; tut.p.swing = .15; frames(8);
ok(tut.kills > 0 && tut.tutStep >= 6, 'the tutorial goblin can be cleared');

tut.p.x = 1550; tut.p.y = 386; tut.p.inv = 0; tut.wardT = 0; tut.orbs.length = 0; frames(2);
ok(tut.orbs.length > 0, 'the training ward lobs an orb');

/* ================= 6. block and perfect parry ================= */
fire('keydown', 'KeyL'); frames(1);
ok(tut.p.block === 1 && tut.p.parry > 0 && !!tut.p.guard(), 'block raises a guard with a parry window');
tut.p.x = 200; tut.p.y = 386; tut.p.face = 1; tut.p.block = 1; tut.p.parry = .16; tut.orbs.length = 0;
tut.orbs.push({ x: tut.p.x + tut.p.w / 2 + 14, y: tut.p.y + 15, vx: 0, vy: 0, r: 7, t: 5, reflected: 0 });
frames(1);
ok((tut.orbs[0] && tut.orbs[0].reflected === 1) || tut.parryMsg > 0, 'a perfect parry reflects a projectile');
fire('keyup', 'KeyL');

/* ================= 7. the ward gates the tutorial exit ================= */
const tex = tut.l.exit;
tut.wardHp = 3; tut.wardBroken = false; tut.orbs.length = 0;
tut.p.x = tex.x + tex.w / 2 - tut.p.w / 2; tut.p.y = tex.y + tex.h - tut.p.h; frames(4);
ok(dbg.sceneId === 'tutorial' && tut.sealMsg > 0, 'the unbroken ward seals the gate');

tut.p.x = 1550; tut.p.y = 386; tut.p.face = 1; tut.wardHp = 3; tut.wardBroken = false; tut.wardBlocks = 0;
tut.wardT = 99; tut.orbs.length = 0;
fire('keydown', 'KeyL'); frames(1);
for (let i = 0; i < 3; i++) {
  tut.p.parry = 0; tut.p.block = 1; tut.orbs.length = 0;
  tut.orbs.push({ x: tut.p.x + tut.p.w / 2 + 14, y: tut.p.y + 15, vx: 0, vy: 0, r: 7, t: 5, reflected: 0 });
  frames(1);
}
frames(2);
fire('keyup', 'KeyL');
ok(tut.wardHp === 0 && tut.wardBroken, 'three blocks break the ward');
ok(tut.tutStep >= tut.l.steps.length - 1, 'the tutorial prompt reaches the open gate');

/* ================= 8. tutorial exit ================= */
tut.p.x = tex.x + tex.w / 2 - tut.p.w / 2; tut.p.y = tex.y + tex.h - tut.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.tutorialDone === true, 'the tutorial gate leads to Cinderhaven and marks the tutorial done');
ok(JSON.parse(store.get('emberknight.v2')).tutorialDone === true, 'the tutorial flag is saved');

/* ================= 9. every scene is sane ================= */
const bad = [];
for (const id of Object.keys(SCENES)) {
  dbg.loadScene(id); frames(2);
  const g = dbg.g, p = g.p, L = g.l;
  const on = L.solids.some(s => typeof s.x === 'number' && !s.pass && !s.off
    && p.y + p.h >= s.y - 3 && p.y + p.h <= s.y + 3 && p.x + p.w > s.x && p.x < s.x + s.w);
  if (!on) bad.push(id + ' spawn');
  if (!L.cps || !L.cps.length) bad.push(id + ' cps');
  if (id !== 'hub' && !L.exit && !L.gate) bad.push(id + ' exit');
  if (id === 'hub' && (!L.hub || !L.hub.gates.length)) bad.push(id + ' gates');
  for (const sec of L.secrets || []) {
    const ledge = L.solids.some(s => s.oneway && s.y >= sec.y + sec.h - 70 && s.y <= sec.y + sec.h);
    const reward = L.coins.concat(L.hearts).some(([x, y]) => x > sec.x && x < sec.x + sec.w && y > sec.y && y < sec.y + sec.h);
    if (!ledge || !reward) bad.push(id + ' secret');
  }
}
ok(bad.length === 0, 'every v2 scene loads with a solid spawn, checkpoints and an exit' + (bad.length ? ' -> ' + bad.join(', ') : ''));
ok((calls.fillRect || 0) > 1000, 'the v2 renderer actually draws (' + (calls.fillRect || 0) + ' rects)');

console.log('\n' + (fail.length ? fail.length + ' FAILURE(S)' : 'ALL CHECKS PASSED'));
if (fail.length) { fail.forEach(f => console.log('  - ' + f)); process.exit(1); }
process.exit(0);
