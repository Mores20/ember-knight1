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

/* ================= 2. hub interactions ================= */
hub.p.hp = 1; hub.p.x = hub.l.hub.hearth.x - 12; hub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(hub.p.hp === 3, 'Patino\u2019s Hearth heals to full');

hub.p.x = hub.l.hub.dummy.x - 20; hub.p.y = 386; hub.p.face = 1; hub.p.swing = .15; frames(2);
ok(hub.dummyT > 0 || hub.parts.length > 0, 'the practice dummy takes a sword hit');

hub.p.x = 140; hub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(hub.dialog && hub.dialog.name === 'CLINT', 'Clint talks in the hub');
hub.dialog = null;

hub.p.x = 1480; hub.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(40);
ok(dbg.sceneId === 'area1' && dbg.g.l.kind === 'level', 'Gate I opens Area I');

/* ================= 3. Area I and the return trip ================= */
const area = dbg.g;
ok(area.enemies.length > 0 && area.l.exit && area.l.cps.length > 0, 'Area I has enemies, checkpoints and an exit');
const ex = area.l.exit;
area.p.x = ex.x + ex.w / 2 - area.p.w / 2; area.p.y = ex.y + ex.h - area.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.cleared.I === true, 'the Area I gate returns to the hub and marks the area cleared');
ok(JSON.parse(store.get('emberknight.v2')).cleared.I === true, 'area progress is saved');

/* ================= 4. Gate II after the clear ================= */
const hub2 = dbg.g;
hub2.p.x = 1740; hub2.p.y = 386; frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF'); frames(2);
ok(hub2.dialog && hub2.dialog.name === 'MARKET LANE', 'Gate II acknowledges the cleared area');

/* ================= 5. new game -> tutorial ================= */
dbg.newGame(); frames(3);
ok(dbg.sceneId === 'tutorial' && dbg.run.tutorialDone === false, 'New Game starts on the tutorial road');
ok(dbg.TOTAL_COINS === SCENES.tutorial.coins.length + SCENES.area1.coins.length, 'the coin total is derived from the slice scenes');

const tut = dbg.g;
tut.p.x = 1020; frames(3);
ok(dbg.run.abil.dash === true && tut.grant > 0, 'the dash lesson grants the ember dash');

tut.p.x = 1550; tut.p.y = 386; tut.p.inv = 0; tut.wardT = 0; frames(2);
ok(tut.orbs.length > 0, 'the training ward lobs an orb');

/* ================= 6. block and perfect parry ================= */
fire('keydown', 'KeyL'); frames(1);
ok(tut.p.block === 1 && tut.p.parry > 0 && !!tut.p.guard(), 'block raises a guard with a parry window');
tut.p.x = 200; tut.p.y = 386; tut.p.face = 1; tut.p.block = 1; tut.p.parry = .16; tut.orbs.length = 0;
tut.orbs.push({ x: tut.p.x + tut.p.w / 2 + 14, y: tut.p.y + 15, vx: 0, vy: 0, r: 7, t: 5, reflected: 0 });
frames(1);
ok((tut.orbs[0] && tut.orbs[0].reflected === 1) || tut.parryMsg > 0, 'a perfect parry reflects a projectile');
fire('keyup', 'KeyL');

/* ================= 7. tutorial exit ================= */
const tex = tut.l.exit;
tut.p.x = tex.x + tex.w / 2 - tut.p.w / 2; tut.p.y = tex.y + tex.h - tut.p.h; frames(40);
ok(dbg.sceneId === 'hub' && dbg.run.tutorialDone === true, 'the tutorial gate leads to Cinderhaven and marks the tutorial done');
ok(JSON.parse(store.get('emberknight.v2')).tutorialDone === true, 'the tutorial flag is saved');

/* ================= 8. every scene is sane ================= */
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
}
ok(bad.length === 0, 'every v2 scene loads with a solid spawn, checkpoints and an exit' + (bad.length ? ' -> ' + bad.join(', ') : ''));
ok((calls.fillRect || 0) > 1000, 'the v2 renderer actually draws (' + (calls.fillRect || 0) + ' rects)');

console.log('\n' + (fail.length ? fail.length + ' FAILURE(S)' : 'ALL CHECKS PASSED'));
if (fail.length) { fail.forEach(f => console.log('  - ' + f)); process.exit(1); }
process.exit(0);
