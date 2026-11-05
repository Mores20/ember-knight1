// v2 save: its own key so the shipped v1 save stays untouched. A v1 save is
// imported once into the purse/cosmetics/abilities, with the tutorial marked done.
export const SAVE_KEY = 'emberknight.v2';
export const V1_KEY = 'emberknight.v1';

export const freshRun = () => ({
  saveVersion: 2,
  tutorialDone: false,
  scene: 'tutorial',
  hp: 2, coins: 0, gold: 0, time: 0,
  abil: { dash: false, lantern: false },
  got: {}, lit: {}, secrets: {}, talked: {}, cleared: { I: false },
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
