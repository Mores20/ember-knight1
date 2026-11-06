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
ok(hub.l.hub.gates.length === 14, 'the hub has fourteen gates');
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

hs.p.x = 3160; hs.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(hs.dialog && hs.dialog.pages[0].who === 'SEALED GATE', 'Gate III is sealed before Area II is cleared');
hs.dialog = null;

hs.p.x = 1980; hs.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
dbg.run.gold = 5; hs.p.hp = 2; hs.shop.sel = 0;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(hs.p.hp === 2 && dbg.run.gold === 5 && hs.shop.msg.includes('short'), 'a poor knight cannot buy');

/* ================= 4c. Area II: the Sunken Crypt ================= */
dbg.run.cleared.I = true; dbg.run.levels.I = [true, true, true];
dbg.loadScene('hub'); frames(2);
const cryptHub = dbg.g;
cryptHub.p.x = 2360; cryptHub.p.y = 386; frames(2);
ok(cryptHub.near && cryptHub.near.type === 'gate' && cryptHub.near.obj.area === 'II', 'Gate II reaches the Sunken Crypt');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'b1' && dbg.g.l.area === 'II', 'Gate II opens 2-1 The Flooded Stair');
const b1 = dbg.g;
const sinks = b1.l.solids.filter(s => s.kind === 'sink');
ok(b1.l.water > 0 && sinks.length >= 4, '2-1 has deep water and sinking stones');
b1.p.reset(sinks[0].x + 10, sinks[0].y - b1.p.h); b1.p.inv = 999; frames(40);
ok(sinks[0].y > sinks[0].baseY + 4, 'a sinking stone dips under the knight');
b1.p.hp = 3; b1.p.inv = 0; b1.p.y = b1.l.water - b1.p.h + 6; frames(2);
ok(b1.p.hp === 2, 'falling into the crypt water costs a heart');

const leech = b1.enemies.find(e => e.type === 'leech');
b1.p.reset(leech.x + leech.w / 2 - b1.p.w / 2, 346); b1.p.inv = 999;
frames(110);
ok(leech.st !== 'hang', 'the Mire Leech drops when the knight passes beneath it');
b1.p.x = b1.l.exit.x + b1.l.exit.w / 2 - b1.p.w / 2; b1.p.y = b1.l.exit.y + b1.l.exit.h - b1.p.h; frames(40);
ok(dbg.sceneId === 'b2' && dbg.run.levels.II[0] === true, '2-1 leads to 2-2 and is marked cleared');

const b2 = dbg.g;
const skull = b2.enemies.find(e => e.type === 'skull');
ok(!!skull, '2-2 has a Wick Skull');
skull.x = 350; skull.y0 = 250; skull.y = 250; skull.cool = 0;
b2.p.x = 350; b2.p.y = 386; b2.p.inv = 999;
const beforeCall = b2.enemies.length;
frames(90);
ok(skull.st === 'shriek' || b2.enemies.length > beforeCall, 'the Wick Skull shrieks and calls a goblin');
b2.p.x = b2.l.exit.x + b2.l.exit.w / 2 - b2.p.w / 2; b2.p.y = b2.l.exit.y + b2.l.exit.h - b2.p.h; frames(40);
ok(dbg.sceneId === 'b3' && dbg.run.levels.II[1] === true, '2-2 leads to 2-3 and is marked cleared');

const b3 = dbg.g, warden = b3.boss;
ok(warden && warden.kind === 'cryptwarden' && warden.st === 'dormant', 'the Crypt Warden waits in the Drowned Nave');
b3.p.x = 1350; b3.p.y = 386; b3.p.inv = 999; frames(40);
ok(warden.st !== 'dormant', 'the Warden wakes when the knight reaches the nave');
warden.hp = 6; warden.st = 'idle'; warden.stT = 0; warden.shield = 1;
b3.p.x = warden.x - 30; b3.p.y = 386; b3.p.face = 1; b3.p.swing = .15; b3.p.hits.clear(); frames(8);
ok(warden.hp === 6, 'the Warden shrugs off a hit while its ward is up');
warden.st = 'recover'; warden.stT = 0; warden.shield = 0; warden.hp = 1;
b3.p.x = warden.x - 30; b3.p.y = 386; b3.p.face = 1; b3.p.swing = .15; b3.p.hits.clear(); frames(8);
ok(warden.hp === 0 && warden.st === 'dead', 'striking the Warden in recovery kills it');
b3.p.x = b3.l.exit.x + b3.l.exit.w / 2 - b3.p.w / 2; b3.p.y = b3.l.exit.y + b3.l.exit.h - b3.p.h; frames(40);
ok(dbg.sceneId === 'b4' && dbg.run.levels.II[2] === true, '2-3 leads to the Cistern and is marked cleared');

const b4 = dbg.g, matron = b4.boss;
ok(matron && matron.kind === 'matron' && matron.st === 'dormant', 'the Crypt Matron waits in the Cistern');
b4.p.x = 700; b4.p.y = 386; b4.p.inv = 999; frames(40);
ok(matron.st !== 'dormant', 'the Matron wakes when the knight enters');
matron.hp = 6; matron.st = 'recover'; matron.stT = 0;
b4.p.x = matron.x - 30; b4.p.y = 386; b4.p.face = 1; b4.p.swing = .15; b4.p.hits.clear(); frames(8);
ok(matron.hp === 5 && matron.phase === 2, 'the Matron shifts to phase two at half health');
ok(b4.water <= 434, 'phase two raises the cistern water');
matron.st = 'recover'; matron.stT = 0; matron.hp = 1;
b4.p.x = matron.x - 30; b4.p.y = 386; b4.p.face = 1; b4.p.swing = .15; b4.p.hits.clear(); frames(8);
ok(matron.hp === 0 && matron.st === 'dead', 'the Crypt Matron falls');
b4.p.x = b4.l.exit.x + b4.l.exit.w / 2 - b4.p.w / 2; b4.p.y = b4.l.exit.y + b4.l.exit.h - b4.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.II === true && dbg.run.levels.II.every(Boolean), '2-4 returns to town and completes Area II');

/* ================= 4d. Area III: the Bell Tower ================= */
const bHub = dbg.g;
ok(bHub.l.w >= 4100, 'Bell Plaza and the Throne Approach extend Cinderhaven');
bHub.p.x = 3960; bHub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(bHub.dialog && bHub.dialog.pages[0].who === 'SEALED GATE', 'Gate IV is sealed before Area III is cleared');
bHub.dialog = null;
bHub.p.x = 3160; bHub.p.y = 386; frames(2);
ok(bHub.near && bHub.near.type === 'gate' && bHub.near.obj.area === 'III', 'the Bell Plaza gate reaches the tower');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'c1' && dbg.g.l.area === 'III', 'Gate III opens 3-1 The Belfry Stairs');

const c1 = dbg.g;
const bell1 = c1.bells.find(b => b.id === 'B1');
const lift1 = c1.l.solids.find(s => s.kind === 'lift');
const gob1 = c1.enemies.find(e => e.type === 'goblin');
gob1.x = 600; gob1.y = 390; gob1.x0 = 500; gob1.x1 = 900;
c1.p.x = bell1.x - 30; c1.p.y = 386; c1.p.face = 1; c1.p.swing = .15; c1.p.hits.clear(); frames(6);
ok(bell1.ring > 0 && lift1.on === 1, 'striking a bell rings it and wakes its lift');
ok(gob1.stun > 0, 'the bell ring stuns nearby enemies');
c1.p.reset(lift1.x + 12, lift1.y - c1.p.h); c1.p.inv = 999; frames(60);
ok(lift1.y < lift1.baseY - 40, 'the rung lift climbs toward the landing');

const wraith = c1.enemies.find(e => e.type === 'pealwraith');
wraith.x = 1600; wraith.y0 = 360; wraith.y = 360; wraith.cool = 0; wraith.st = 'float'; wraith.stT = 0;
c1.p.reset(1720, 386); c1.p.hp = 3; c1.p.inv = 0; c1.p.dashT = 0;
frames(140);
ok(c1.p.hp < 3, 'the Peal Wraith\u2019s scream ring catches a standing knight');
wraith.x = 600; wraith.y0 = 360; wraith.y = 360; wraith.cool = 2; wraith.st = 'float'; wraith.stT = 0; wraith.stun = 0;
c1.p.reset(bell1.x - 30, 386); c1.p.face = 1; c1.p.swing = .15; c1.p.hits.clear(); frames(6);
ok(wraith.stun > 0, 'ringing a bell dazes the Peal Wraith');
c1.p.x = c1.l.exit.x + c1.l.exit.w / 2 - c1.p.w / 2; c1.p.y = c1.l.exit.y + c1.l.exit.h - c1.p.h; frames(40);
ok(dbg.sceneId === 'c2' && dbg.run.levels.III[0] === true, '3-1 leads to 3-2 and is marked cleared');

const c2 = dbg.g;
const bell2 = c2.bells.find(b => b.id === 'B2');
const lift2 = c2.l.solids.find(s => s.bell === 'B2');
c2.p.reset(850, 330 - c2.p.h); c2.p.face = 1; c2.p.swing = .15; c2.p.hits.clear(); frames(6);
ok(bell2.ring > 0 && lift2.on === 1, 'the Chime Hall\u2019s second bell raises its lift');
c2.p.x = c2.l.exit.x + c2.l.exit.w / 2 - c2.p.w / 2; c2.p.y = c2.l.exit.y + c2.l.exit.h - c2.p.h; frames(40);
ok(dbg.sceneId === 'c3' && dbg.run.levels.III[1] === true, '3-2 leads to 3-3 and is marked cleared');

const c3 = dbg.g, golem = c3.boss;
ok(golem && golem.kind === 'clappergolem' && golem.st === 'dormant', 'the Clapper Golem waits in the rafters');
c3.p.x = 1300; c3.p.y = 386; c3.p.inv = 999; frames(40);
ok(golem.st !== 'dormant', 'the Golem wakes when the knight reaches the arena');
golem.hp = 6; golem.st = 'idle'; golem.stT = 0;
c3.p.x = golem.x - 30; c3.p.y = 386; c3.p.face = 1; c3.p.swing = .15; c3.p.hits.clear(); frames(8);
ok(golem.hp === 6, 'the Golem\u2019s shell turns the blade outside its opening');
golem.st = 'recover'; golem.stT = 0; golem.hp = 1;
c3.p.x = golem.x - 30; c3.p.y = 386; c3.p.face = 1; c3.p.swing = .15; c3.p.hits.clear(); frames(8);
ok(golem.hp === 0 && golem.st === 'dead', 'striking the glowing core kills the Golem');
c3.p.x = c3.l.exit.x + c3.l.exit.w / 2 - c3.p.w / 2; c3.p.y = c3.l.exit.y + c3.l.exit.h - c3.p.h; frames(40);
ok(dbg.sceneId === 'c4' && dbg.run.levels.III[2] === true, '3-3 leads to the Carillon and is marked cleared');

const c4 = dbg.g, carillon = c4.boss;
ok(carillon && carillon.kind === 'carillon' && carillon.st === 'dormant', 'the Cracked Carillon waits above the arena');
c4.p.x = 950; c4.p.y = 386; c4.p.inv = 999; frames(40);
ok(carillon.st !== 'dormant', 'the Carillon wakes when the arena is entered');
carillon.st = 'idle'; carillon.y = carillon.baseY;
ok(carillon.takeHit() === 2 && carillon.hp === 8, 'the Carillon is closed outside its opening');
carillon.st = 'open'; carillon.stT = 0; carillon.y = carillon.openY;
c4.p.x = carillon.x - 30; c4.p.y = 386; c4.p.face = 1; c4.p.swing = .15; c4.p.hits.clear(); frames(8);
ok(carillon.hp === 7, 'the cracked bell opens and takes a hit');
carillon.st = 'open'; carillon.stT = 0; carillon.hp = 5;
c4.p.x = carillon.x - 30; c4.p.y = 386; c4.p.face = 1; c4.p.swing = .15; c4.p.hits.clear(); frames(8);
ok(carillon.hp === 4 && carillon.phase === 2, 'the Carillon shifts to phase two at half health');
ok(Math.abs(carillon.interval() - .48) < .001, 'phase two shortens the beat');
carillon.st = 'open'; carillon.stT = 0; carillon.hp = 1;
c4.p.x = carillon.x - 30; c4.p.y = 386; c4.p.face = 1; c4.p.swing = .15; c4.p.hits.clear(); frames(8);
ok(carillon.hp === 0 && carillon.st === 'dead', 'the Carillon cracks and falls');
c4.p.x = c4.l.exit.x + c4.l.exit.w / 2 - c4.p.w / 2; c4.p.y = c4.l.exit.y + c4.l.exit.h - c4.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.III === true && dbg.run.levels.III.every(Boolean), '3-4 returns to town and completes Area III');
ok(dbg.g.stageMsg > 0 && dbg.g.stageMsgKind === 'bells', 'the town rings a clean note after Area III');

/* ================= 4e. Area IV: The Throne ================= */
const tHub = dbg.g;
ok(tHub.l.w >= 4900, 'the Throne Approach and Garden Steps reach the royal gate');
tHub.p.x = 4760; tHub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(tHub.dialog && tHub.dialog.pages[0].who === 'SEALED GATE', 'Gate V is sealed before Area IV is cleared');
tHub.dialog = null;
tHub.p.x = 3960; tHub.p.y = 386; frames(2);
ok(tHub.near && tHub.near.type === 'gate' && tHub.near.obj.area === 'IV', 'Gate IV reaches the Throne');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'd1' && dbg.g.l.area === 'IV', 'Gate IV opens 4-1 The Gate Hall');

const d1 = dbg.g;
const rev = d1.enemies.find(e => e.type === 'revenant');
ok(rev && rev.st === 'down', 'a Royal Revenant waits collapsed in a pile');
d1.p.x = 1120; d1.p.y = 386; d1.p.inv = 999; frames(30);
ok(rev.st !== 'down', 'the Royal Revenant rises when the knight nears');
rev.st = 'thrust'; rev.stT = 0; rev.hitDone = 0; rev.dir = 1;
d1.p.x = rev.x + 50; d1.p.y = 386; d1.p.face = -1; d1.p.inv = 0;
fire('keydown', 'KeyL'); frames(1);
ok(rev.st === 'stagger', 'a perfect guard staggers the Revenant\u2019s thrust');
fire('keyup', 'KeyL');
d1.p.x = d1.l.exit.x + d1.l.exit.w / 2 - d1.p.w / 2; d1.p.y = d1.l.exit.y + d1.l.exit.h - d1.p.h; frames(40);
ok(dbg.sceneId === 'd2' && dbg.run.levels.IV[0] === true, '4-1 leads to 4-2 and is marked cleared');

const d2 = dbg.g;
ok(d2.l.secrets.length && d2.l.secrets[0].name === 'THE CHESS ROOM', 'the Armory hides the chess room');
d2.p.x = d2.l.exit.x + d2.l.exit.w / 2 - d2.p.w / 2; d2.p.y = d2.l.exit.y + d2.l.exit.h - d2.p.h; frames(40);
ok(dbg.sceneId === 'd3' && dbg.run.levels.IV[1] === true, '4-2 leads to 4-3 and is marked cleared');

const d3 = dbg.g;
ok(d3.l.secrets.length && d3.l.secrets[0].name === 'THE HALF-WRITTEN LETTER', 'the Gallery hides the unfinished letter');
d3.p.x = d3.l.exit.x + d3.l.exit.w / 2 - d3.p.w / 2; d3.p.y = d3.l.exit.y + d3.l.exit.h - d3.p.h; frames(40);
ok(dbg.sceneId === 'd4' && dbg.run.levels.IV[2] === true, '4-3 leads to 4-4 and is marked cleared');

const d4 = dbg.g, cap = d4.boss;
ok(cap && cap.kind === 'captain' && cap.st === 'dormant', 'the Fallen Royal Guard waits at his post');
d4.p.x = 1100; d4.p.y = 386; d4.p.inv = 999; frames(40);
ok(cap.st !== 'dormant', 'the Captain wakes when the knight enters');
cap.hp = 8; cap.st = 'idle'; cap.stT = 0;
d4.p.x = cap.x - 30; d4.p.y = 386; d4.p.face = 1; d4.p.swing = .15; d4.p.hits.clear(); frames(8);
ok(cap.hp === 8, 'the Captain\u2019s shield turns the blade');
cap.st = 'act'; cap.atk = 'bash'; cap.stT = 0; cap.hitDone = 0; cap.dir = 1;
d4.p.x = cap.x + 50; d4.p.y = 386; d4.p.face = -1; d4.p.inv = 0;
fire('keydown', 'KeyL'); frames(1);
ok(cap.st === 'stun', 'a perfect guard stuns the Captain');
fire('keyup', 'KeyL');
cap.hp = 1; cap.st = 'stun'; cap.stunT = 9; cap.stT = 0;
d4.p.x = cap.x - 30; d4.p.y = 386; d4.p.face = 1; d4.p.swing = .15; d4.p.hits.clear(); frames(20);
ok(cap.hp === 0 && cap.st === 'dead', 'striking the stunned Captain finishes him');
ok(dbg.g.bossLine > 0 && /Hold the door/.test(dbg.g.bossLineText), 'the Captain\u2019s last line plays');
d4.p.x = d4.l.exit.x + d4.l.exit.w / 2 - d4.p.w / 2; d4.p.y = d4.l.exit.y + d4.l.exit.h - d4.p.h; frames(40);
ok(dbg.sceneId === 'd5' && dbg.run.levels.IV[3] === true, '4-4 leads to the Throne Room and is marked cleared');

const d5 = dbg.g, ward = d5.boss;
ok(ward && ward.kind === 'warden' && ward.st === 'dormant', 'the Ash Warden waits before the throne');
d5.p.x = 1250; d5.p.y = 386; d5.p.inv = 999; frames(40);
ok(ward.st !== 'dormant', 'the Ash Warden rises');
ward.hp = 10; ward.phase = 1; ward.st = 'guard'; ward.guardT = 99; ward.iframe = 0;
d5.p.x = 1460; d5.p.y = 386; d5.p.face = 1; d5.p.swing = .15; d5.p.hits.clear(); frames(8);
ok(ward.hp === 10, 'the Warden\u2019s raised shield blocks the blade');
ward.st = 'open'; ward.cool = 99; ward.iframe = 0; ward.hp = 10;
d5.p.x = 1460; d5.p.y = 386; d5.p.face = 1; d5.p.swing = .15; d5.p.hits.clear(); frames(8);
ok(ward.hp === 9, 'the open Warden takes a hit');
ward.st = 'open'; ward.cool = 99; ward.iframe = 0; ward.hp = 6;
d5.p.x = 1460; d5.p.y = 386; d5.p.face = 1; d5.p.swing = .15; d5.p.hits.clear(); frames(8);
ok(ward.hp === 5 && ward.phase === 2, 'the Ash Warden burns brighter at half health');
ward.st = 'open'; ward.cool = 99; ward.iframe = 0; ward.hp = 1;
d5.p.x = 1460; d5.p.y = 386; d5.p.face = 1; d5.p.swing = .15; d5.p.hits.clear(); frames(20);
ok(ward.hp === 0 && (ward.st === 'dead' || ward.st === 'gone'), 'the Ash Warden falls');
ok(/hold the door/i.test(dbg.g.bossLineText), 'the Warden\u2019s dying line plays');
d5.p.x = d5.l.exit.x + d5.l.exit.w / 2 - d5.p.w / 2; d5.p.y = d5.l.exit.y + d5.l.exit.h - d5.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.IV === true && dbg.run.levels.IV.every(Boolean), '4-5 returns to town and completes Area IV');
ok(dbg.g.stageMsgKind === 'throne', 'the hub settles into the quiet after the throne');

/* ================= 4f. Area V: The Ashen Gardens ================= */
const gHub = dbg.g;
ok(gHub.l.w >= 5700, 'Garden Steps and Forge Row extend Cinderhaven');
gHub.p.x = 5560; gHub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(gHub.dialog && gHub.dialog.pages[0].who === 'SEALED GATE', 'Gate VI is sealed before Area V is cleared');
gHub.dialog = null;
gHub.p.x = 4760; gHub.p.y = 386; frames(2);
ok(gHub.near && gHub.near.type === 'gate' && gHub.near.obj.area === 'V', 'Gate V reaches the Ashen Gardens');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'e1' && dbg.g.l.area === 'V', 'Gate V opens 5-1 The Withered Gate');

dbg.run.abil.lantern = false;
dbg.loadScene('e1'); frames(2);
const e1 = dbg.g;
ok(e1.lantern && e1.lantern.got === 0, '5-1 holds the Ember Lantern');
e1.p.x = 260; e1.p.y = 386; frames(3);
ok(dbg.run.abil.lantern === true && e1.lamp === 3 && e1.lantern.got === 1, 'the lantern grants three sparks');
e1.p.x = 300; e1.p.y = 386; e1.p.face = 1; frames(1);
fire('keydown', 'KeyE'); frames(1);
ok(e1.sparks.length === 1 && e1.lamp === 2, 'E throws a lantern spark and spends a charge');
fire('keyup', 'KeyE'); frames(50);
ok(e1.lamps.length > 0, 'the spark lands and becomes a burning lamp');

const thorn = e1.l.solids.find(s => s.thorn);
e1.lamps.push({ x: thorn.x - 30, y: thorn.y + 60, t: 5 });
frames(2);
ok(thorn.off === 1 && thorn.burn > 0, 'lamplight makes a thorn wall recoil');
e1.lamps = []; thorn.burn = 0; frames(2);
ok(thorn.off === 0, 'the thorns regrow when the light fades');
e1.p.x = e1.l.exit.x + e1.l.exit.w / 2 - e1.p.w / 2; e1.p.y = e1.l.exit.y + e1.l.exit.h - e1.p.h; frames(40);
ok(dbg.sceneId === 'e2' && dbg.run.levels.V[0] === true, '5-1 leads to 5-2 and is marked cleared');

const e2 = dbg.g;
const bloom = e2.enemies.find(e => e.type === 'ashbloom');
e2.lamps = []; e2.p.x = bloom.x + 220; e2.p.y = 386; e2.p.inv = 999;
frames(90);
ok(bloom.shots > 0, 'an Ash Bloom spits seeds in the dark');
e2.lamps.push({ x: bloom.x + 4, y: bloom.y + 15, t: 4 });
frames(2);
ok(bloom.st === 'closed' && bloom.lit, 'lamplight clamps the Ash Bloom shut');
const creeper = e2.enemies.find(e => e.type === 'creeper');
e2.p.x = creeper.x + 80; e2.p.y = 386; e2.p.hp = 3; e2.p.inv = 0; frames(40);
ok(creeper.st !== 'buried', 'the Thorn Creeper surfaces when the knight nears');
e2.p.x = e2.l.herb.x; e2.p.y = 386; e2.p.hp = 2; frames(3);
ok(dbg.run.herbPatch === true && e2.herb.got === 1, 'Patino\u2019s Herb Patch is a one-time pickup');
e2.p.x = e2.l.exit.x + e2.l.exit.w / 2 - e2.p.w / 2; e2.p.y = e2.l.exit.y + e2.l.exit.h - e2.p.h; frames(40);
ok(dbg.sceneId === 'e3' && dbg.run.levels.V[1] === true, '5-2 leads to 5-3 and is marked cleared');

const e3 = dbg.g, gGolem = e3.boss;
e3.p.x = 1300; e3.p.y = 386; e3.p.inv = 999; frames(40);
ok(gGolem && gGolem.kind === 'gardenergolem' && gGolem.st !== 'dormant', 'the Gardener Golem wakes in the greenhouse');
gGolem.hp = 6; gGolem.st = 'idle'; gGolem.stT = 0; gGolem.coreT = 0; gGolem.armor = 1;
e3.p.x = gGolem.x - 30; e3.p.y = 386; e3.p.face = 1; e3.p.swing = .15; e3.p.hits.clear(); frames(8);
ok(gGolem.hp === 6, 'the Golem\u2019s root cage turns the blade');
e3.sparks.push({ x: gGolem.x + gGolem.w / 2, y: gGolem.y + 30, vx: 0, vy: 0, t: .5 });
frames(1);
ok(gGolem.coreT > 0, 'a lantern spark burns the root cage open');
gGolem.coreT = 3; gGolem.st = 'open'; gGolem.stT = 0;
e3.p.x = gGolem.x - 30; e3.p.y = 386; e3.p.face = 1; e3.p.swing = .15; e3.p.hits.clear(); frames(8);
ok(gGolem.hp === 5, 'the exposed core takes a hit');
gGolem.coreT = 3; gGolem.st = 'open'; gGolem.hp = 1;
e3.p.x = gGolem.x - 30; e3.p.y = 386; e3.p.face = 1; e3.p.swing = .15; e3.p.hits.clear(); frames(20);
ok(gGolem.hp === 0 && gGolem.st === 'dead', 'the Gardener Golem falls');
e3.p.x = e3.l.exit.x + e3.l.exit.w / 2 - e3.p.w / 2; e3.p.y = e3.l.exit.y + e3.l.exit.h - e3.p.h; frames(40);
ok(dbg.sceneId === 'e4' && dbg.run.levels.V[2] === true, '5-3 leads to the Heartroot and is marked cleared');

const e4 = dbg.g, mom = e4.boss;
e4.p.x = 950; e4.p.y = 386; e4.p.inv = 999; frames(40);
ok(mom && mom.kind === 'motherblight' && mom.st !== 'dormant', 'Mother Blight wakes in the Heartroot');
mom.hp = 12; mom.coreT = 0; mom.armor = 1; mom.st = 'idle'; mom.stT = 0;
e4.p.x = mom.x - 40; e4.p.y = 386; e4.p.face = 1; e4.p.swing = .15; e4.p.hits.clear(); frames(8);
ok(mom.hp === 12, 'the thorn armour turns the blade');
e4.sparks.push({ x: mom.x + mom.w / 2, y: mom.y + 50, vx: 0, vy: 0, t: .5 });
frames(1);
ok(mom.coreT > 0, 'a lantern spark burns the thorn armour back');
mom.coreT = 3.8; mom.hp = 7; mom.st = 'idle'; mom.stT = 0;
e4.p.x = mom.x - 40; e4.p.y = 386; e4.p.face = 1; e4.p.swing = .15; e4.p.hits.clear(); frames(8);
ok(mom.hp === 6 && mom.phase === 2, 'Mother Blight shifts to phase two at half health');
ok(e4.dim > 0, 'phase two dims the Heartroot');
mom.coreT = 3; mom.st = 'idle'; mom.hp = 1;
e4.p.x = mom.x - 40; e4.p.y = 386; e4.p.face = 1; e4.p.swing = .15; e4.p.hits.clear(); frames(20);
ok(mom.hp === 0 && mom.st === 'dead', 'Mother Blight falls');
ok(/only wanted to grow/i.test(dbg.g.bossLineText), 'Mother Blight\u2019s restoration line plays');
e4.p.x = e4.l.exit.x + e4.l.exit.w / 2 - e4.p.w / 2; e4.p.y = e4.l.exit.y + e4.l.exit.h - e4.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.V === true && dbg.run.levels.V.every(Boolean), '5-4 returns to town and completes Area V');
ok(dbg.g.stageMsgKind === 'garden', 'the Garden Steps stir after Area V');

/* ================= 4g. Area VI: The Drowned Forge ================= */
const forgeHub = dbg.g;
ok(forgeHub.l.w >= 7000, 'Forge Row and Archive Steps extend Cinderhaven');
forgeHub.p.x = 6360; forgeHub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(forgeHub.dialog && forgeHub.dialog.pages[0].who === 'SEALED GATE', 'Gate VII is sealed before Area VI is cleared');
forgeHub.dialog = null;
forgeHub.p.x = 5560; forgeHub.p.y = 386; frames(2);
ok(forgeHub.near && forgeHub.near.type === 'gate' && forgeHub.near.obj.area === 'VI', 'Gate VI reaches the Drowned Forge');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'f1' && dbg.g.l.area === 'VI', 'Gate VI opens 6-1 The Slag Stairs');

const f1 = dbg.g;
ok(f1.l.vertical && f1.tide != null && f1.l.tide.speed === 9, 'the Slag Stairs is a vertical climb with a rising tide');
f1.p.hp = 3; f1.p.inv = 0; f1.p.y = f1.tide - f1.p.h + 6; frames(2);
ok(f1.p.hp === 2, 'the ember tide costs a heart');
ok(f1.tide >= f1.cp[1] + 100, 'the tide resets below the checkpoint');
const smith = f1.enemies.find(e => e.type === 'slagsmith');
f1.p.x = smith.x; f1.p.y = smith.y - 2; f1.p.inv = 999; frames(90);
ok(smith.shots.length > 0 || smith.puddles.length > 0, 'the Slag Smith hurls burning slag');
const wisp = f1.enemies.find(e => e.type === 'rustwisp');
const wx = wisp.x; frames(30);
ok(Math.abs(wisp.x - wx) > 2, 'the Rust Wisp drifts on its line');
f1.p.x = f1.l.exit.x + f1.l.exit.w / 2 - f1.p.w / 2; f1.p.y = f1.l.exit.y + f1.l.exit.h - f1.p.h; frames(40);
ok(dbg.sceneId === 'f2' && dbg.run.levels.VI[0] === true, '6-1 leads to 6-2 and is marked cleared');

const f2 = dbg.g;
const mover = f2.l.solids.find(s => s.kind === 'move');
const my = mover && mover.y;
frames(40);
ok(mover && Math.abs(mover.y - my) > 4, 'the chain lifts move under the knight');
f2.p.x = f2.l.exit.x + f2.l.exit.w / 2 - f2.p.w / 2; f2.p.y = f2.l.exit.y + f2.l.exit.h - f2.p.h; frames(40);
ok(dbg.sceneId === 'f3' && dbg.run.levels.VI[1] === true, '6-2 leads to 6-3 and is marked cleared');

const f3 = dbg.g, foreman = f3.boss;
ok(foreman && foreman.kind === 'slagforeman' && foreman.st === 'dormant', 'the Slag Foreman waits at the summit');
f3.p.x = 1050; f3.p.y = 586; f3.p.inv = 999; frames(40);
ok(foreman.st !== 'dormant', 'the Foreman wakes when the summit is reached');
const tide0 = f3.tide; f3.tideStepT = .1; frames(20);
ok(f3.tide < tide0 - 40 && f3.tideMsg > 0, 'the tide climbs in steps during the fight');
foreman.hp = 12; foreman.phase = 1; foreman.st = 'act'; foreman.atk = 'chain'; foreman.stT = 0; foreman.hitDone = 1;
f3.p.x = foreman.x - 30; f3.p.y = 586; f3.p.face = 1; f3.p.swing = .15; f3.p.hits.clear(); frames(8);
ok(foreman.hp === 12, 'the Foreman\u2019s swing turns the blade');
foreman.st = 'idle'; foreman.stT = 0; foreman.cool = 99;
f3.p.x = foreman.x - 30; f3.p.y = 586; f3.p.face = 1; f3.p.swing = .15; f3.p.hits.clear(); frames(8);
ok(foreman.hp === 11, 'the idle Foreman takes a hit');
foreman.st = 'idle'; foreman.stT = 0; foreman.cool = 99; foreman.hp = 7;
f3.p.x = foreman.x - 30; f3.p.y = 586; f3.p.face = 1; f3.p.swing = .15; f3.p.hits.clear(); frames(8);
ok(foreman.hp === 6 && foreman.phase === 2, 'the Foreman stokes phase two at half health');
foreman.st = 'idle'; foreman.stT = 0; foreman.cool = 99; foreman.hp = 1;
f3.p.x = foreman.x - 30; f3.p.y = 586; f3.p.face = 1; f3.p.swing = .15; f3.p.hits.clear(); frames(20);
ok(foreman.hp === 0 && foreman.st === 'dead', 'the Slag Foreman falls');
f3.p.x = f3.l.exit.x + f3.l.exit.w / 2 - f3.p.w / 2; f3.p.y = f3.l.exit.y + f3.l.exit.h - f3.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.VI === true && dbg.run.levels.VI.every(Boolean), '6-3 returns to town and completes Area VI');
ok(dbg.g.stageMsgKind === 'forge', 'the Forge Row burns again after Area VI');

/* ================= 4h. Area VII: The Silent Archive ================= */
const archHub = dbg.g;
ok(archHub.l.w >= 7000, 'Archive Steps reach Gate VII');
archHub.p.x = 6360; archHub.p.y = 386; frames(2);
ok(archHub.near && archHub.near.type === 'gate' && archHub.near.obj.area === 'VII', 'Gate VII reaches the Silent Archive');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'g1' && dbg.g.l.area === 'VII', 'Gate VII opens 7-1 The Reading Room');

const g1 = dbg.g;
ok(g1.l.dark && g1.bowls.length > 0, 'the Reading Room is dark and holds a bowl');
const bridge = g1.l.solids.find(s => s.lightBridge);
ok(bridge && bridge.off === 1, 'the first light bridge is out');
const bowl1 = g1.bowls[0];
g1.p.x = bowl1.x - 30; g1.p.y = 386; g1.p.face = 1; g1.p.swing = .15; g1.p.hits.clear(); frames(6);
ok(bowl1.lit === 1 && bridge.off === 0, 'a sword swing lights the bowl and the bridge');
g1.p.x = 180; g1.p.y = 386; frames(2);
ok(g1.near && g1.near.type === 'merchant', 'the Sketchy Merchant waits in the Reading Room');
fire('keydown', 'KeyF'); frames(3); fire('keyup', 'KeyF'); frames(2);
ok(!!g1.shop, 'the Reading Room merchant opens the shop');
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(!g1.shop, 'the shop closes again');
g1.p.x = g1.l.exit.x + g1.l.exit.w / 2 - g1.p.w / 2; g1.p.y = g1.l.exit.y + g1.l.exit.h - g1.p.h; frames(40);
ok(dbg.sceneId === 'g2' && dbg.run.levels.VII[0] === true, '7-1 leads to 7-2 and is marked cleared');

const g2 = dbg.g;
ok(g2.l.solids.filter(s => s.lightBridge).length === 2 && g2.l.solids.some(s => s.seal), 'the Stacks has two light bridges and a sealed way');
const seal = g2.l.solids.find(s => s.seal);
ok(seal.off === 0, 'the bowl seal starts shut');
const shade = g2.enemies.find(e => e.type === 'shade');
g2.lamps = []; g2.p.x = shade.x - 28; g2.p.y = 386; g2.p.inv = 999; g2.p.face = 1; g2.p.swing = .15; g2.p.hits.clear(); frames(6);
ok(shade.hp === 2, 'a Shade shrugs off the blade in shadow');
g2.lamps.push({ x: shade.x + 12, y: shade.y + 15, t: 4 });
g2.p.x = shade.x - 28; g2.p.y = 386; g2.p.face = 1; g2.p.swing = .15; g2.p.hits.clear(); frames(3);
ok(shade.hp < 2, 'a lit Shade can be cut');
g2.bowls.find(b => b.id === 'B3').lit = 1; frames(10);
ok(seal.off === 1, 'the bowl switch opens the sealed way');
g2.p.x = g2.l.exit.x + g2.l.exit.w / 2 - g2.p.w / 2; g2.p.y = g2.l.exit.y + g2.l.exit.h - g2.p.h; frames(40);
ok(dbg.sceneId === 'g3' && dbg.run.levels.VII[1] === true, '7-2 leads to 7-3 and is marked cleared');

const g3 = dbg.g, cur = g3.boss;
ok(cur && cur.kind === 'curator' && cur.st === 'dormant', 'the Lampless Curator waits at the reading ledge');
g3.p.x = 1150; g3.p.y = 386; g3.p.inv = 999; frames(40);
ok(cur.st !== 'dormant', 'the Curator wakes');
g3.lamps = []; cur.hp = 8; cur.st = 'float'; cur.stT = 0; cur.lit = 0; cur.cool = 99; cur.x = 1400;
g3.p.x = cur.x - 30; g3.p.y = 386; g3.p.face = 1; g3.p.inv = 999; g3.p.swing = .15; g3.p.hits.clear(); frames(6);
ok(cur.hp === 8, 'the Curator cannot be cut in shadow');
g3.bowls[0].lit = 1; frames(6);
ok(!!cur.lit, 'lit by the bowl, the Curator becomes solid');
cur.lit = 1; cur.st = 'float'; cur.stT = 0; cur.cool = 99;
g3.p.x = cur.x - 30; g3.p.y = 386; g3.p.face = 1; g3.p.swing = .15; g3.p.hits.clear(); frames(6);
ok(cur.hp === 7, 'the lit Curator takes a hit');
cur.lit = 1; cur.st = 'float'; cur.hp = 1; cur.cool = 99;
g3.p.x = cur.x - 30; g3.p.y = 386; g3.p.face = 1; g3.p.swing = .15; g3.p.hits.clear(); frames(20);
ok(cur.hp === 0 && cur.st === 'dead', 'the Lampless Curator falls');

g3.p.x = 980; g3.p.y = 246; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(g3.dialog && g3.dialog.pages[0].who === 'THE TRAPPED SPIRIT', 'the Trapped Spirit speaks of the king');
g3.dialog = null;
g3.p.x = 1250; g3.p.y = 186; frames(2);
ok(dbg.run.secrets.g3 && dbg.run.secrets.g3.includes(0), 'the Margin Note secret reveals the king\u2019s line');
g3.p.x = g3.l.exit.x + g3.l.exit.w / 2 - g3.p.w / 2; g3.p.y = g3.l.exit.y + g3.l.exit.h - g3.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.VII === true && dbg.run.levels.VII.every(Boolean), '7-3 returns to town and completes Area VII');
ok(dbg.g.stageMsgKind === 'archive', 'the Archive Steps remember Area VII');

/* ================= 5. new game -> tutorial ================= */
dbg.newGame(); frames(3);
ok(dbg.sceneId === 'tutorial' && dbg.run.tutorialDone === false, 'New Game starts on the tutorial road');
ok(dbg.TOTAL_COINS === Object.values(SCENES).reduce((n, s) => n + s.coins.length, 0), 'the coin total is derived from the slice scenes');

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
