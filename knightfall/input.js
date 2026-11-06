export const keys = {}, pressed = {}, hits = [];   // hits: raw key codes, for the menu

const UPKEY = { ArrowUp: 1, KeyW: 1 };                  // up as a direction, distinct from jump in v2
const DEFAULT_MAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', ArrowDown: 'down', KeyS: 'down', KeyW: 'jump',
  Space: 'jump', KeyZ: 'jump', KeyJ: 'atk', KeyX: 'atk', KeyK: 'atk',
  ShiftLeft: 'dash', ShiftRight: 'dash', KeyE: 'lamp', KeyF: 'talk',
  KeyL: 'block', Escape: 'menu', Enter: 'ok', KeyM: 'mute', KeyR: 'restart',
};

// v2 editable actions. `aliases` stay fixed; the primary key is editable.
export const V2_ACTIONS = {
  left: { label: 'MOVE LEFT', aliases: ['ArrowLeft'] },
  right: { label: 'MOVE RIGHT', aliases: ['ArrowRight'] },
  up: { label: 'AIM UP', aliases: ['ArrowUp'] },
  down: { label: 'AIM DOWN', aliases: ['ArrowDown'] },
  jump: { label: 'JUMP', aliases: ['KeyZ'] },
  atk: { label: 'ATTACK', aliases: ['KeyX', 'KeyK'] },
  dash: { label: 'DASH', aliases: ['ShiftRight'] },
  block: { label: 'BLOCK', aliases: [] },
  lamp: { label: 'LANTERN', aliases: [] },
  talk: { label: 'INTERACT', aliases: [] },
  menu: { label: 'PAUSE / BACK', aliases: [] },
};
export const V2_DEFAULT_KEYS = {
  left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', jump: 'Space',
  atk: 'KeyJ', dash: 'ShiftLeft', block: 'KeyL', lamp: 'KeyE', talk: 'KeyF', menu: 'Escape',
};

const RESERVED = { Enter: 1, KeyM: 1, KeyR: 1 };
let map = DEFAULT_MAP;
let primary = null;
let capture = null;

export function setBindings(bindings) {
  primary = { ...V2_DEFAULT_KEYS, ...(bindings || {}) };
  map = {};
  for (const [action, def] of Object.entries(V2_ACTIONS)) {
    for (const code of [primary[action], ...(def.aliases || [])]) if (code) map[code] = action;
  }
  map.Enter = 'ok'; map.KeyM = 'mute'; map.KeyR = 'restart';
  for (const k in keys) keys[k] = false;
  for (const k in pressed) pressed[k] = false;
}
export function captureNext(cb) { capture = cb; }
export function cancelCapture() { capture = null; }
export const isCapturing = () => !!capture;
export const isReserved = code => !!RESERVED[code];
export const primaryKey = action => primary ? primary[action] : Object.keys(DEFAULT_MAP).find(k => DEFAULT_MAP[k] === action);

const SPECIAL = {
  Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ArrowUp: 'UP', ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Escape: 'ESC', Enter: 'ENTER',
  ControlLeft: 'CTRL', ControlRight: 'CTRL', AltLeft: 'ALT', AltRight: 'ALT',
  Tab: 'TAB', Backspace: 'BKSP', CapsLock: 'CAPS', ContextMenu: 'MENU',
};
export const codeLabel = code => {
  if (!code) return '';
  if (SPECIAL[code]) return SPECIAL[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM' + code.slice(6);
  return code.replace(/(Left|Right)$/, '').toUpperCase();
};
export const keyName = action => codeLabel(primaryKey(action));

addEventListener('keydown', e => {
  if (capture) {
    const cb = capture; capture = null;
    e.preventDefault();
    cb(e.code);
    return;
  }
  const a = map[e.code];
  if (!a) return;
  e.preventDefault();
  if (!e.repeat) {
    pressed[a] = true;
    hits.push(e.code);
    if (UPKEY[e.code]) pressed.up = true;               // fixes menu Up in both games
  }
  keys[a] = true;
  if (UPKEY[e.code]) keys.up = true;
});
addEventListener('keyup', e => {
  const a = map[e.code];
  if (a) { keys[a] = false; e.preventDefault(); }
  if (UPKEY[e.code]) keys.up = false;
});
export const clearPressed = () => { for (const k in pressed) pressed[k] = false; };
