// v2 save: its own key so the shipped v1 save stays untouched. A v1 save is
// imported once into the purse/cosmetics/abilities, with the tutorial marked done.
import { V2_DEFAULT_KEYS } from '../input.js';

export const SAVE_KEY = 'emberknight.v2';
export const V1_KEY = 'emberknight.v1';

export const freshRun = () => ({
  saveVersion: 2,
  tutorialDone: false,
  scene: 'tutorial',
  hp: 2, coins: 0, gold: 0, time: 0, shield: 0,
  abil: { dash: false, lantern: false },
  got: {}, lit: {}, secrets: {}, talked: {}, cleared: { I: false, II: false, III: false, IV: false, V: false, VI: false, VII: false, VIII: false }, levels: { I: [false, false, false], II: [false, false, false, false], III: [false, false, false, false], IV: [false, false, false, false, false], V: [false, false, false, false], VI: [false, false, false], VII: [false, false, false], VIII: [false, false, false] },
  herbPatch: false, ending: false, endingSeen: false,
  captainSeal: false, spectacles: false, lampMax: 3, lens: false,
  keys: { ...V2_DEFAULT_KEYS },
  skin: 'iron', emberSword: false, titled: false,
});

const read = key => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
};

export function loadRun() {
  const r = read(SAVE_KEY);
  if (!r || typeof r !== 'object' || r.saveVersion !== 2) return null;
  const out = { ...freshRun(), ...r };
  out.abil = { ...freshRun().abil, ...(r.abil || {}) };
  out.cleared = { ...freshRun().cleared, ...(r.cleared || {}) };
  if (!out.got || typeof out.got !== 'object') out.got = {};
  if (!out.lit || typeof out.lit !== 'object') out.lit = {};
  if (!out.secrets || typeof out.secrets !== 'object') out.secrets = {};
  if (!out.talked || typeof out.talked !== 'object') out.talked = {};
  out.levels = { ...freshRun().levels, ...(r.levels || {}) };
  if (!Array.isArray(out.levels.I)) out.levels.I = [false, false, false];
  if (!Array.isArray(out.levels.II)) out.levels.II = [false, false, false, false];
  if (!Array.isArray(out.levels.III)) out.levels.III = [false, false, false, false];
  if (!Array.isArray(out.levels.IV)) out.levels.IV = [false, false, false, false, false];
  if (!Array.isArray(out.levels.V)) out.levels.V = [false, false, false, false];
  if (!Array.isArray(out.levels.VI)) out.levels.VI = [false, false, false];
  if (!Array.isArray(out.levels.VII)) out.levels.VII = [false, false, false];
  if (!Array.isArray(out.levels.VIII)) out.levels.VIII = [false, false, false];
  if (typeof out.ending !== 'boolean') out.ending = false;
  if (typeof out.endingSeen !== 'boolean') out.endingSeen = false;
  if (typeof out.captainSeal !== 'boolean') out.captainSeal = false;
  if (typeof out.spectacles !== 'boolean') out.spectacles = false;
  if (typeof out.lampMax !== 'number') out.lampMax = 3;
  if (typeof out.lens !== 'boolean') out.lens = false;
  out.keys = { ...V2_DEFAULT_KEYS, ...(out.keys && typeof out.keys === 'object' ? out.keys : {}) };
  for (const k in V2_DEFAULT_KEYS) if (typeof out.keys[k] !== 'string' || !out.keys[k]) out.keys[k] = V2_DEFAULT_KEYS[k];
  if (typeof out.herbPatch !== 'boolean') out.herbPatch = false;
  out.cleared = { ...freshRun().cleared, ...(out.cleared && typeof out.cleared === 'object' ? out.cleared : {}) };
  if (typeof out.shield !== 'number') out.shield = 0;
  return out;
}

export function saveRun(run) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SAVE_KEY, JSON.stringify(run));
  } catch (e) { /* private mode / harness */ }
}

const v1Progress = r => !!r && (r.coins > 0 || r.lvl > 0 || (Array.isArray(r.cleared) && r.cleared.some(Boolean))
  || (r.abil && (r.abil.dash || r.abil.lantern)));

export function readV1() { const r = read(V1_KEY); return v1Progress(r) ? r : null; }

export function importV1Run(r) {
  const out = freshRun();
  out.tutorialDone = true;                                      // they have already played the old road
  out.scene = 'hub';
  if (r) {
    out.gold = typeof r.gold === 'number' ? r.gold : (r.coins || 0);
    out.skin = typeof r.skin === 'string' ? r.skin : 'iron';
    out.emberSword = !!r.emberSword;
    out.titled = !!r.titled;
    out.abil = { ...out.abil, ...(r.abil || {}) };
  }
  return out;
}

export function bootRun() {
  return loadRun() || (readV1() ? importV1Run(readV1()) : freshRun());
}
