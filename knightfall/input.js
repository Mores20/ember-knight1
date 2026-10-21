export const keys = {}, pressed = {};
const map = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'jump', KeyW:'jump', Space:'jump', KeyZ:'jump', KeyJ:'atk', KeyX:'atk', KeyK:'atk', ShiftLeft:'dash', ShiftRight:'dash', KeyE:'lamp', Escape:'menu', Enter:'ok', KeyM:'mute', KeyR:'restart' };
addEventListener('keydown', e => { const a = map[e.code]; if (!a) return; e.preventDefault(); if (!e.repeat) pressed[a] = true; keys[a] = true; });
addEventListener('keyup', e => { const a = map[e.code]; if (a) { keys[a] = false; e.preventDefault(); } });
export const clearPressed = () => { for (const k in pressed) pressed[k] = false; };
