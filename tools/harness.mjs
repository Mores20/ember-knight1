// Headless regression suite for Ember Knight. Runs the real modules against a stubbed DOM/canvas,
// so gameplay, bosses, menus and saves are exercised without a browser.
//
//   node tools/harness.mjs      (or: npm test)
//
// Keep checks behavioural: they should fail when the game breaks, not when a colour changes.
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

/* ---------- load ---------- */
const here = p => new URL(p, import.meta.url);
const { dbg } = await import(here('../knightfall/main.js'));
const { LEVELS, TOTAL_COINS } = await import(here('../knightfall/level.js'));
const INP = await import(here('../knightfall/input.js'));
const MS = await import(here('../knightfall/mobsprites.js'));
const { BACKDROP_STYLES } = await import(here('../knightfall/backdrop.js'));
const { SCENERY_TYPES } = await import(here('../knightfall/scenery.js'));
globalThis.__k = INP;
dbg.start();

/* ================= 1. the loop and the first phase ================= */
frames(120);
ok(dbg.g.state === 'play', 'boots into play');
ok(Object.keys(calls).length > 10 && (calls.fillRect || 0) > 200, 'the renderer actually draws (' + Object.keys(calls).length + ' calls, ' + (calls.fillRect || 0) + ' rects)');
ok(texts.some(t => t === 'x 0/' + TOTAL_COINS), 'the HUD strip shows the campaign coin total');
ok(LEVELS.length === 8, 'eight phases');
ok(TOTAL_COINS === 142, '142 coins in the campaign');

/* ================= 2. every phase loads and is sane ================= */
let badSpawn = [], badEnemy = [], badLevel = [];
for (let i = 0; i < LEVELS.length; i++) {
  dbg.loadLevel(i); frames(2);
  const g = dbg.g, L = LEVELS[i];
  if (!L.name || !L.title || !L.lore || !L.gate || !L.cps || !L.cps.length) badLevel.push(L.name || i);
  const p = g.p;
  const onSolid = g.l.solids.some(s => typeof s.x === 'number' && !s.pass && !s.off
    && p.y + p.h >= s.y - 3 && p.y + p.h <= s.y + 3 && p.x + p.w > s.x && p.x < s.x + s.w);
  if (!onSolid) badSpawn.push(L.name);
  for (const e of g.enemies) {
    if (!['goblin', 'shield', 'crawler', 'husk', 'archer', 'shade'].includes(e.type)) continue;
    const feet = e.y + e.h;
    const ok2 = g.l.solids.some(s => typeof s.x === 'number' && !s.pass && !s.off
      && feet >= s.y - 3 && feet <= s.y + 3 && e.x + e.w > s.x && e.x < s.x + s.w);
    if (!ok2) badEnemy.push(L.name + ' ' + e.type + '@' + Math.round(e.x));
  }
}
ok(badLevel.length === 0, 'every phase has a name, title, lore, gate and checkpoint' + (badLevel.length ? ' -> ' + badLevel.join(', ') : ''));
ok(badSpawn.length === 0, 'every spawn point stands on a solid' + (badSpawn.length ? ' -> ' + badSpawn.join(', ') : ''));
ok(badEnemy.length === 0, 'no walking enemy starts on air' + (badEnemy.length ? ' -> ' + badEnemy.join(', ') : ''));
let offEdge = [];
for (let lv = 0; lv < 7; lv++) {
  dbg.loadLevel(lv); frames(1);
  const g = dbg.g; g.p.x = 120; g.p.inv = 999;
  frames(900);                                   // 15s of patrols
  for (const e of g.enemies) {
    if (!['goblin', 'shield', 'crawler', 'husk', 'archer', 'shade'].includes(e.type)) continue;
    const feet = e.type === 'shade' ? e.y0 + e.h : e.y + e.h;
    const on = g.l.solids.some(s2 => typeof s2.x === 'number' && !s2.pass && !s2.off
      && feet >= s2.y - 3 && feet <= s2.y + 3 && e.x + e.w > s2.x && e.x < s2.x + s2.w);
    if (!on) offEdge.push(LEVELS[lv].name + ' ' + e.type + '@' + Math.round(e.x));
  }
}
ok(offEdge.length === 0, 'patrolling enemies stay on solid ground' + (offEdge.length ? ' -> ' + offEdge.join(', ') : ''));

/* ================= 2b. world expansion: backdrops, scenery, secrets ================= */
ok(BACKDROP_STYLES.length === 8 && LEVELS.every(L => BACKDROP_STYLES.includes(L.style)),
  'every phase has its own backdrop style');
const badProps = [];
for (const L of LEVELS) for (const p of L.props || []) {
  if (!SCENERY_TYPES.includes(p.type)) badProps.push(L.name + ':' + p.type);
  if (p.x < 0 || p.x > L.w || p.y < 0 || p.y > L.h) badProps.push(L.name + ':out of bounds');
}
ok(badProps.length === 0, 'every scenery prop is a known type inside its level' + (badProps.length ? ' -> ' + badProps.join(', ') : ''));
ok(LEVELS.every(L => (L.props || []).length >= 4), 'all eight phases carry scenery props');
ok(LEVELS.filter(L => (L.secrets || []).length).length >= 5, 'secret alcoves are spread through the kingdom');

const badSecret = [];
for (const L of LEVELS) for (const s of L.secrets || []) {
  if (s.x < 0 || s.y < 0 || s.x + s.w > L.w || s.y + s.h > L.h) badSecret.push(L.name + ' bounds');
  const ledge = L.solids.find(o => o.oneway && o.y >= s.y + s.h - 70 && o.y <= s.y + s.h);
  const launch = ledge && L.solids.some(o => o !== ledge && o.y > ledge.y + 40 && o.y <= ledge.y + 125 && o.x < s.x + s.w + 40 && o.x + o.w > s.x - 40);
  const reward = L.coins.concat(L.hearts).some(([x, y]) => x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h);
  if (!ledge || !launch || !reward) badSecret.push(L.name + ' ' + s.name);
}
ok(badSecret.length === 0, 'every secret has a one-way ledge, a launch pad and a reward' + (badSecret.length ? ' -> ' + badSecret.join(', ') : ''));

const S5 = LEVELS[0].secrets[0];
const L5 = LEVELS[0].solids.find(o => o.oneway && o.y >= S5.y + S5.h - 70 && o.y <= S5.y + S5.h);
dbg.loadLevel(0); frames(2);
let G5 = dbg.g, P5 = G5.p;
P5.reset(S5.x + S5.w / 2 - P5.w / 2, L5.y - P5.h); frames(3);
ok((dbg.run.secrets[0] || []).includes(0) && G5.found > 0, 'walking into a secret marks it found and banners it');
ok(JSON.parse(store.get('emberknight.v1')).secrets[0].includes(0), 'the secret ledger is saved');
dbg.loadLevel(0); frames(2); G5 = dbg.g;
ok(G5.found === 0, 'a found secret stays found and does not banner again');

// the roadway niche is reachable on foot: stand on the lower platform and jump
dbg.loadLevel(0); frames(2); G5 = dbg.g; P5 = G5.p;
G5.enemies.length = 0;
P5.reset(1800, 345 - P5.h); frames(2);
fire('keydown', 'Space');
for (let i = 0; i < 24; i++) frames(1);
fire('keyup', 'Space');
for (let i = 0; i < 42; i++) frames(1);
ok(Math.abs(P5.y + P5.h - 250) < 3 && P5.ground, 'the roadway niche ledge is reachable by jumping');

ok(LEVELS[0].cps.length === 4 && LEVELS[0].cps.some(c => c[0] === 2780), 'the Ember Road gained a keep checkpoint');
ok(LEVELS[4].cps.length === 3 && LEVELS[6].cps.length === 3, 'the long middle phases gained checkpoints');
const rects5 = calls.fillRect || 0;
dbg.loadLevel(1); frames(2);
ok((calls.fillRect || 0) > rects5, 'the backdrop renderer actually draws');

/* ================= 3. player: jump, dash, gaps ================= */
dbg.loadLevel(0); frames(2);
let G = dbg.g, P = G.p;
P.reset(300, 386); P.x = 300; frames(2);
const y0 = P.y;
let minY = P.y;
fire('keydown', 'Space');
for (let i = 0; i < 42; i++) { if (i === 12) fire('keyup', 'Space'); frames(1); minY = Math.min(minY, P.y); }
ok(y0 - minY > 90, 'a jump clears about 110px (rose ' + Math.round(y0 - minY) + ')');
// dash speeds: ground vs air
dbg.run.abil.dash = true; dbg.loadLevel(2); frames(2); G = dbg.g; P = G.p;
P.reset(300, 2266); frames(3); P.dashCd = 0; P.dashUsed = false; P.face = 1;
fire('keydown', 'ShiftLeft'); frames(1);
ok(Math.abs(P.vx) > 380 && Math.abs(P.vx) < 430, 'ground surge ~403px/s (' + Math.abs(P.vx).toFixed(0) + ')');
fire('keyup', 'ShiftLeft');
P.reset(300, 2266); frames(3); P.y -= 60; P.ground = false; P.vy = 0; P.dashCd = 0; P.dashUsed = false;
fire('keydown', 'ShiftLeft'); frames(1);
ok(Math.abs(P.vx) > 460 && Math.abs(P.vx) < 500, 'air surge ~480px/s (' + Math.abs(P.vx).toFixed(0) + ')');
fire('keyup', 'ShiftLeft');
// a ground surge is short; an air one still clears the tower gap
P.reset(300, 2266); frames(3); P.dashCd = 0; P.dashUsed = false; P.face = 1;
const dx0 = P.x; fire('keydown', 'ShiftLeft'); frames(1); fire('keyup', 'ShiftLeft'); frames(25);
const dashDist = P.x - dx0;
ok(dashDist > 90 && dashDist < 140, 'a ground surge covers ~' + dashDist.toFixed(0) + 'px');
// a dash follows the held direction even when the facing is frozen mid-swing
dbg.loadLevel(2); frames(2); G = dbg.g; P = G.p;
P.reset(300, 2266); frames(2); P.face = 1; P.swing = .2; P.dashCd = 0; P.dashUsed = false;
fire('keydown', 'ArrowLeft'); fire('keydown', 'ShiftLeft'); frames(1);
ok(P.vx < -300, 'a dash follows the held direction mid-swing (vx=' + P.vx.toFixed(0) + ')');
fire('keyup', 'ArrowLeft'); fire('keyup', 'ShiftLeft');
// being embedded in geometry depenetrates cleanly instead of teleporting
dbg.loadLevel(0); frames(2); G = dbg.g; P = G.p;
P.reset(600, 386); frames(2);
P.y = 410; G.stopT = 0;                       // 24px inside the floor (and no hit-stop)
frames(2);
ok(Math.abs((P.y + P.h) - 420) < 1.5, 'an embedded player is pushed back onto the floor (feet ' + (P.y + P.h).toFixed(1) + ')');
ok(dbg.g.p.crushed === 0, 'and is not flagged as crushed by a clean depenetration');
// eight-way dash: up, diagonal, and Space alone must not count as "up"
dbg.loadLevel(2); frames(2); G = dbg.g; P = G.p;
dbg.run.abil.dash = true;
P.reset(300, 2200); P.ground = false; P.vy = 0; P.y -= 40; P.dashCd = 0; P.dashUsed = false;
fire('keydown', 'ArrowUp'); fire('keydown', 'ShiftLeft'); frames(1);
ok(P.vy < -300 && P.dashT > 0, 'an up dash surges upward (vy=' + P.vy.toFixed(0) + ')');
fire('keyup', 'ArrowUp'); fire('keyup', 'ShiftLeft');
P.reset(300, 2200); P.ground = false; P.vy = 0; P.y -= 40; P.dashCd = 0; P.dashUsed = false;
fire('keydown', 'ArrowRight'); fire('keydown', 'ArrowDown'); fire('keydown', 'ShiftLeft'); frames(1);
ok(P.vx > 200 && P.vy > 200, 'a diagonal dash moves on both axes (' + P.vx.toFixed(0) + ',' + P.vy.toFixed(0) + ')');
fire('keyup', 'ArrowRight'); fire('keyup', 'ArrowDown'); fire('keyup', 'ShiftLeft');
P.reset(300, 2266); frames(2); P.dashCd = 0; P.dashUsed = false;
fire('keydown', 'Space'); fire('keydown', 'ShiftLeft'); frames(1);
ok(Math.abs(P.vy) < 500 && P.vx !== 0, 'Space is jump, not an up dash (' + P.vy.toFixed(0) + ')');
fire('keyup', 'Space'); fire('keyup', 'ShiftLeft');
// up slash and plunge
const mk = (await import(here('../knightfall/enemies.js'))).makeEnemy;
function frozenMob(x, y) { const m = mk({ type: 'goblin', x: 0, y: 0, x0: 0, x1: 1, hp: 1 }); m.x = x; m.y = y; m.update = () => {}; return m; }
dbg.loadLevel(0); frames(2); G = dbg.g; P = G.p;
G.enemies = [];
const above = frozenMob(0, 0); G.enemies.push(above);
P.reset(300, 300); P.vy = 0; P.inv = 9; P.swing = 0;
above.x = P.x; above.y = P.y - 44;
fire('keydown', 'ArrowUp'); fire('keydown', 'KeyJ'); frames(10);
ok(above.dead || above.hp <= 0, 'an up slash reaches the enemy overhead');
fire('keyup', 'ArrowUp'); fire('keyup', 'KeyJ');
const below = frozenMob(0, 0); G.enemies = [below];
P.reset(300, 300); P.vy = 0; P.inv = 9; P.swing = 0; P.ground = false;
below.x = P.x; below.y = P.y + P.h + 2;
fire('keydown', 'ArrowDown'); fire('keydown', 'KeyJ'); frames(4);
ok(below.dead || below.hp <= 0, 'a plunge reaches the enemy below');
ok(P.vy < 0, 'a plunge that connects bounces the knight back up (vy=' + P.vy.toFixed(0) + ')');
fire('keyup', 'ArrowDown'); fire('keyup', 'KeyJ');

function leap(level, startX, y, edge, dashDelay) {
  dbg.loadLevel(level); frames(1);
  const q = dbg.g.p; dbg.g.enemies = [];
  q.reset(startX, y); q.hp = 3; q.inv = 0; q.vx = 230;
  fire('keydown', 'ArrowRight');
  let launched = false, landed = false, back = false, air = 0;
  for (let f = 0; f < 240; f++) {
    if (!launched && q.x + q.w >= edge - 4) { fire('keydown', 'Space'); launched = true; }
    frames(1);
    if (launched) air++;
    if (dashDelay && air === dashDelay) fire('keydown', 'ShiftLeft');
    if (launched && air > 5 && q.x < 800) { back = true; break; }
    if (launched && air > 5 && q.ground) { landed = true; break; }
  }
  fire('keyup', 'ArrowRight'); fire('keyup', 'Space'); fire('keyup', 'ShiftLeft');
  return { x: q.x, landed, back };
}
const g1 = leap(2, 1400, 1566, 1550, 0);
const g2 = leap(2, 1400, 1566, 1550, 18);
ok(g1.back, 'the tower gap cannot be crossed without the dash');
ok(g2.landed && g2.x >= 1815, 'and it clears with a jump + dash (x=' + g2.x.toFixed(0) + ')');
const f1 = leap(5, 1300, 1566, 1500, 0);
const f2 = leap(5, 1300, 1566, 1500, 18);
ok(f1.back, 'the Forge gap cannot be crossed without the dash');
ok(f2.landed && f2.x >= 1720, 'and it clears with a jump + dash (x=' + f2.x.toFixed(0) + ')');

/* ================= 4. combat ================= */
dbg.loadLevel(0); frames(2); G = dbg.g; P = G.p;
G.enemies = [];
const goblin = (await import(here('../knightfall/enemies.js'))).makeEnemy({ type: 'goblin', x: 0, y: 0, x0: 0, x1: 1, hp: 1 });
goblin.x = P.x + 40; goblin.y = P.y + 2;
G.enemies.push(goblin);
P.face = 1; P.swing = 0;
fire('keydown', 'KeyJ'); frames(10); fire('keyup', 'KeyJ');
ok(goblin.dead || goblin.hp <= 0, 'a sword swing kills a goblin');
// coins persist to the save
dbg.loadLevel(0); frames(2); G = dbg.g; P = G.p;
G.coins[0].x = P.x + 4; G.coins[0].y = P.y + 4; frames(1);
ok(dbg.run.coins >= 1 && JSON.parse(store.get('emberknight.v1')).coins === dbg.run.coins, 'coins are banked and written to localStorage');
ok(dbg.run.got && Array.isArray(dbg.run.got[0].c), 'the save keeps a per-phase pickup ledger');

/* ================= 5. the Ash King ================= *//* ================= 4b. the Ash Warden ================= */
dbg.loadLevel(3); frames(2); G = dbg.g; P = G.p;
const W = G.boss;
ok(W && W.max === 16, 'the Warden loads with 16 hp');
W.phase = 2; W.st = 'act'; W.atk = 'cleave'; W.act = .3; W.t = 0; W.chained = 0; W.iframe = 0;
const rnd = Math.random; Math.random = () => 0;      // force the follow-up
frames(19);
Math.random = rnd;
ok(W.atk === 'volley' && (W.st === 'wind' || W.st === 'volley'), 'phase 2 chains a cleave into a volley (' + W.atk + '/' + W.st + ')');


dbg.loadLevel(7); frames(2); G = dbg.g; P = G.p;
const K = G.boss;
ok(K && K.title === 'THE ASH KING' && K.max === 24, 'the King loads with 24 hp');
P.reset(700, 386); P.inv = 99; frames(3);
ok(K.st === 'rise', 'crossing the arena wakes him');
frames(80);
const kbox = () => ({ x: K.x - 20, y: K.y + 30, w: 50, h: 30 });
K.st = 'idle'; K.t = 0; K.cool = 99; K.iframe = 0;
ok(K.takeHit(kbox()) === 2 && K.hp === 24, 'steel only clangs while he floats');
K.st = 'idle'; K.t = 0; K.cool = 0; K.sinceBolt = 2;
frames(2);
ok(K.st === 'wind' && K.atk === 'bolt', 'he winds up an Ember Bolt');
frames(40);
ok(K.bolts.length === 1, 'and fires it');
const bolt = K.bolts[0];
bolt.x = P.x + P.w + 12; bolt.y = P.y + 14; bolt.vx = -250; bolt.vy = 0;
P.face = 1; P.swing = .18; G.stopT = 0;
frames(1);
ok(bolt.reflected === 1, 'a swing sends the bolt home');
frames(24);
ok(K.st === 'stun', 'a returned bolt stuns him');
frames(45);
ok(Math.abs(K.y + K.h - 420) < 1, 'and he drops to the arena floor');
K.iframe = 0;
ok(K.takeHit(kbox()) === 1 && K.hp === 23, 'now the sword bites');
K.iframe = 0;
ok(K.takeHit({ x: K.x - 10, y: K.y + 40, w: 8, h: 10 }) === 1, 'the boss hurtbox is slightly forgiving (edge hit lands)');
// phase 2 summons two flanking hexers
K.hp = 17; K.phase = 1; K.st = 'stun'; K.t = 0; K.iframe = 0; K.y = 328;
K.takeHit(kbox());
frames(80);
const summons = G.enemies.filter(e => e.type === 'hexer' && e.summoned);
ok(summons.length === 2, 'phase 2 summons two mages');
ok(summons.some(e => e.x < 700) && summons.some(e => e.x > 900), 'one on each side');
ok(summons.every(e => e.pierce === 1), 'their orbs pierce platforms');
// phase 3 volleys
K.hp = 9; K.phase = 2; K.st = 'stun'; K.t = 0; K.iframe = 0; K.y = 328;
K.takeHit(kbox());
frames(80);
ok(K.phase === 3, 'one third down flips him to phase 3');
G.enemies = G.enemies.filter(e => !e.summoned);
K.st = 'idle'; K.phase = 3;
K.drops = []; K.bolts = []; K.erupts = []; K.snares = []; K.meteors = []; K.burns = [];
K.atk = 'rain'; K.cast(P, G); ok(K.drops.length === 7, 'phase 3 rain: seven drops');
K.atk = 'twin'; K.cast(P, G); ok(K.bolts.length === 4, 'phase 3 twin: four bolts');
K.atk = 'erupt'; K.cast(P, G); ok(K.erupts.length === 6, 'phase 3 eruption: six columns');
K.atk = 'snare'; K.cast(P, G); ok(K.snares.length === 5, 'phase 3 snare: five pools');
K.atk = 'meteor'; K.cast(P, G); ok(K.meteors.length === 3, 'phase 3 meteor: three');
K.drops = []; K.bolts = []; K.erupts = []; K.snares = []; K.meteors = []; K.burns = [];
// the knockdown impact fires once
K.st = 'stun'; K.t = 0; K.stunT = 9; K.y = 250; K.vy = 0; K.iframe = 0;
frames(45);
const partsBefore = G.parts.length;
frames(20);
ok(G.parts.length - partsBefore < 40, 'the knockdown effect does not repeat every frame');

/* ================= 6. the Ash Hexer ================= */
dbg.loadLevel(4); frames(2); G = dbg.g; P = G.p;
const hx = G.enemies.find(e => e.type === 'hexer');
ok(!!hx, 'phase V fields a hexer');
ok(MS.MOB_STATES.hexer.cast_smother === 3 && typeof MS.drawBadge === 'function', 'the hexer sheet and icons are present');
hx.cool = 0; hx.st = 'idle'; hx.stT = 0; G.stopT = 0;
P.x = hx.x + 220; P.y = 386; P.inv = 9; P.hp = 3;
frames(2);
ok(hx.st === 'cast', 'the hexer winds up');
frames(60);
ok(G.hexOrbs.length === 3, 'and fires three orbs');
P.inv = 0; P.hp = 3;
const orb = G.hexOrbs[0];
orb.x = P.x + P.w / 2; orb.y = P.y + 16; orb.vx = 0; orb.vy = 0;
frames(1);
ok(P.hp === 3 && P.debuffs[orb.hex] > 0, 'a level hexer debuffs without damage');
P.debuffs[orb.hex] = 5; hx.applied = orb.hex;
hx.st = 'idle'; hx.blinkCd = 99; hx.hp = 1; hx.dying = 0;
hx.hit(); frames(45);
ok(P.debuffs[orb.hex] <= 0, 'killing the caster clears its hex');
P.debuffs.smother = P.debuffs.heavy = P.debuffs.snuff = 0;
G.hexOrbs = [];
P.debuffs.heavy = 5; P.dashCd = 0; P.dashUsed = false; P.ground = true;
fire('keydown', 'ShiftLeft'); frames(1); fire('keyup', 'ShiftLeft');
ok(P.dashT <= 0, 'heavy hex locks the dash');
P.debuffs.heavy = 0;
const mob = G.enemies.find(e => e.type === 'wisp');
mob.hp = 1; mob.update = () => {};
P.x = mob.x - 40; mob.y = P.y + 6; P.face = 1; P.inv = 9; P.debuffs.snuff = 5; P.swing = 0;
frames(2); fire('keydown', 'KeyJ'); frames(10); fire('keyup', 'KeyJ');
ok(mob.hp === 1 && !mob.dead, 'a snuffed blade cannot bite');
P.debuffs.snuff = 0; P.swing = 0; frames(12);
fire('keydown', 'KeyJ'); frames(10); fire('keyup', 'KeyJ');
ok(mob.hp < 1 || mob.dead, 'and bites again once it burns off');
ok(P.debuffs.snuff <= 0, 'debuffs run out on their own');

/* ================= 6b. the lantern ================= */
dbg.loadLevel(0); frames(2); G = dbg.g; P = G.p;
dbg.run.abil.lantern = true; G.abil.lantern = true; G.lamp = 3;
P.reset(300, 386); frames(2);
fire('keydown', 'KeyE'); frames(1); fire('keyup', 'KeyE');
frames(100);
const lamp = G.lamps[0];
ok(!!lamp && lamp.t > 4.5, 'a thrown lantern burns for ~6.5s (t=' + (lamp ? lamp.t.toFixed(1) : 'none') + ')');

/* ================= 7. the menu ================= */
dbg.loadLevel(0); frames(2); dbg.start();
fire('keydown', 'Escape'); frames(2);
ok(dbg.g.state === 'menu', 'Esc opens the title screen');
ok(dbg.menu.sceneInfo && dbg.menu.sceneInfo().x >= 650, 'the title-screen diorama runs');
dbg.menu.key('Escape'); dbg.syncMenu();
dbg.menu.key('Enter'); frames(2);
ok(dbg.g.state === 'play', 'CONTINUE drops back into play');
dbg.menuAction({ type: 'color', index: 2 });
ok(dbg.run.skin === 'frost' && JSON.parse(store.get('emberknight.v1')).skin === 'frost', 'choosing a colour wears and saves it');
for (let i = 0; i < 900; i++) dbg.menu.update(1 / 60);
ok(dbg.menu.sceneInfo().kills > 0, 'the diorama actually has fights');

/* ================= 7b. the Sketchy Merchant ================= */
dbg.loadLevel(0); frames(2); G = dbg.g; P = G.p;
const M = G.l.merchant;
ok(!!M && M.stock.length === 4, 'phase I has a merchant with four lines of stock');
ok(LEVELS.filter(L2 => L2.merchant).length >= 3, 'merchants wait in several safe rooms');
P.reset(M.x, 386); frames(2);
fire('keydown', 'KeyF'); frames(2); fire('keyup', 'KeyF');
ok(G.state === 'shop', 'F opens the shop');
dbg.run.gold = 100; P.hp = 2; M.sel = 0;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(P.hp === 3 && dbg.run.gold === 85 && M.stock[0] === 1, 'an Ashroot Potion heals one and costs 15');
dbg.run.gold = 5; P.hp = 2; M.sel = 0;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(P.hp === 2 && dbg.run.gold === 5, 'a poor knight cannot buy');
P.debuffs.heavy = 5; dbg.run.gold = 100; M.sel = 1;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(P.debuffs.heavy === 0, 'the Cleansing Flask washes off a hex');
dbg.run.cleared[3] = true; M.sel = 2;
fire('keydown', 'Enter'); frames(1); fire('keyup', 'Enter'); frames(1);
ok(P.shield === 1, 'the Ember Shield unlocks after the Warden and can be bought');
P.inv = 0; const hpBefore = P.hp; P.hurt(P.x + 40, G);
ok(P.hp === hpBefore && P.shield === 0, 'and it eats one hit');
G.stopT = 0;
fire('keydown', 'KeyF'); frames(4); fire('keyup', 'KeyF');
ok(G.state === 'play', 'F leaves the shop');
dbg.loadLevel(0); frames(2); G = dbg.g; P = G.p;
const goldBefore = dbg.run.gold;
const freeCoin = G.coins.find(c => !c.got);
freeCoin.x = P.x + 4; freeCoin.y = P.y + 4; frames(1);
ok(dbg.run.gold === goldBefore + 1, 'picked coins fill the purse as well as the tally');
ok(JSON.parse(store.get('emberknight.v1')).gold === dbg.run.gold, 'and the purse is saved');

/* ================= 8. story, cards, the ending ================= */
dbg.newJourney(); frames(1);
ok(dbg.g.state === 'story' && dbg.g.story.i === 0, 'a new journey opens on the prologue');
fire('keydown', 'KeyJ'); frames(1);
ok(dbg.g.story.i === 0, 'a tapped key cannot skip a page before it settles');
frames(70); fire('keydown', 'KeyJ'); frames(2);
frames(70); fire('keydown', 'KeyJ'); frames(2);
frames(70); fire('keydown', 'KeyJ'); frames(3);
ok(dbg.g.state === 'play' && dbg.g.lvl === 0, 'the prologue hands over to the first level');
dbg.enterCard(1, 'PHASE II', 'THE SUNKEN CRYPT');
frames(360);
ok(dbg.g.state === 'card', 'a card holds long enough to read');
frames(100);
ok(dbg.g.state === 'play', 'and then boots the next phase');
dbg.loadLevel(7); frames(2);
G = dbg.g; G.state = 'win'; G.win = 27.5; G.litCount = 4;
frames(4);
ok(G.state === 'credits', 'the ending hands over to the credits');
ok(texts.some(t => t === 'MORE TO COME') && texts.some(t => t === 'created by LumpiaN#1') && texts.some(t => t === 'thank you for playing'), 'the credits carry the message');
ok(texts.some(t => typeof t === 'string' && t.indexOf('v1.0.0') >= 0), 'and the version');
frames(70); fire('keydown', 'Enter'); frames(2);
ok(dbg.g.state === 'menu', 'ENTER returns to the title from the credits');

/* ---------- summary ---------- */
console.log('');
if (fail.length) {
  console.log(`${fail.length} FAILURE(S)`);
  fail.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
process.exit(0);   // the game's audio init leaves a timer; the suite is done
