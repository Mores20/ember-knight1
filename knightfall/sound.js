// Recorded audio: the two boss themes, their intro voices, attack and death stings, and the King's
// phase changes. HTMLAudio, one element per clip, cached. Everything no-ops outside the browser.
const FILES = {
  wardenMusic: 'sound/Warden_boss_music.mp3',
  wardenIntro: 'sound/warden_intro-voice.mp3',
  wardenAttack: 'sound/warden-attack.mp3',
  wardenDeath: 'sound/warden-death.mp3',
  kingMusic: 'sound/Ash-king_boss_music.mp3',
  kingIntro: 'sound/Ash-king_intro.mp3',
  kingAttack: 'sound/Ash-king_attack.mp3',
  kingPhase2: 'sound/Ash-king_second_phase.mp3',
  kingPhase3: 'sound/Ash-king_third_phase.mp3',
  kingDeath: 'sound/Ash-king_death.mp3',
};
const MUSIC_VOL = .3;
const cache = {};
let muted = false, cur = null;
const ok = () => typeof Audio !== 'undefined';
// Resolve next to this module, not the page: index.html lives at the server root while the game is in
// knightfall/, and a bare 'sound/x.mp3' would ask the root for /sound/x.mp3 and 404.
export const srcFor = k => (FILES[k] ? new URL(FILES[k], import.meta.url).href : '');
function get(k) {
  if (!ok() || !FILES[k]) return null;
  if (!cache[k]) { const a = new Audio(srcFor(k)); a.preload = 'auto'; cache[k] = a; }
  return cache[k];
}
export function preload() { if (ok()) for (const k in FILES) get(k); }
export function music(k, vol = MUSIC_VOL) {
  if (!ok() || !FILES[k]) return;
  if (cur === k) return;                                   // already playing this theme
  stopMusic();
  const a = get(k);
  a.loop = true; a.volume = muted ? 0 : vol; a.currentTime = 0;
  const p = a.play(); if (p && p.catch) p.catch(() => {});
  cur = k;
}
export function stopMusic() {
  if (!ok() || !cur) return;
  const a = cache[cur];
  if (a) { a.pause(); try { a.currentTime = 0; } catch (e) {} }
  cur = null;
}
export function sting(k, vol = .55) {
  if (!ok() || muted || !FILES[k]) return;
  const a = get(k);
  try { a.currentTime = 0; } catch (e) {}
  a.volume = vol;
  const p = a.play(); if (p && p.catch) p.catch(() => {});
}
export function setMuted(m) {
  muted = !!m;
  if (ok() && cur && cache[cur]) cache[cur].volume = muted ? 0 : MUSIC_VOL;
}
export const isMuted = () => muted;
export const playing = () => cur;
export const clip = k => cache[k] || null;                 // the cached element, for tests
