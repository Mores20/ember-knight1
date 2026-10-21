// Tiny WebAudio chiptune: square/triangle blips, noise hits, and a looping arpeggio.
let ac, out, muted = false, step = 0;
export const isMuted = () => muted;
export function init() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    out = ac.createGain(); out.gain.value = muted ? 0 : .22; out.connect(ac.destination);
    setInterval(music, 150);
  }
  if (ac.state !== 'running') ac.resume();
}
export function toggle() { muted = !muted; if (out) out.gain.value = muted ? 0 : .22; }
function tone(f, d, type = 'square', v = .4, slide = 0, at = 0) {
  if (!ac) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(gn); gn.connect(out); o.start(t); o.stop(t + d + .02);
}
function noise(d, v = .3) {
  if (!ac) return;
  const n = ac.sampleRate * d | 0, b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), gn = ac.createGain(); gn.gain.value = v;
  s.buffer = b; s.connect(gn); gn.connect(out); s.start();
}
const ARP = [220, 262, 330, 392, 330, 262, 247, 294], BASS = [110, 110, 98, 98];
function music() {
  if (!ac || muted || document.hidden) return;
  const i = step++;
  tone(ARP[i % 8], .12, 'triangle', .16);
  if (i % 4 === 0) tone(BASS[(i >> 2) % 4], .5, 'square', .08);
}
export const sfx = {
  jump: () => tone(260, .16, 'square', .3, 420),
  land: () => noise(.05, .12),
  swing: () => { noise(.09, .22); tone(500, .08, 'sawtooth', .1, -250); },
  hit: () => { tone(180, .1, 'square', .4, -100); noise(.08, .3); },
  kill: () => tone(400, .18, 'square', .3, -300),
  coin: () => { tone(988, .07, 'square', .22); tone(1319, .14, 'square', .22, 0, .07); },
  heart: () => [523, 659, 784].forEach((f, i) => tone(f, .12, 'square', .25, 0, i * .08)),
  hurt: () => tone(200, .3, 'sawtooth', .4, -150),
  die: () => tone(300, .5, 'square', .4, -250),
  win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'square', .25, 0, i * .12)),
  // --- Sunken Crypt ---
  torch: () => { noise(.14, .26); tone(520, .24, 'triangle', .24, 200); },     // flame catches
  block: () => { tone(240, .06, 'square', .34, -70); noise(.05, .28); },       // shield clang
  crumble: () => noise(.32, .2),                                               // stone giving way
  // --- Bell Tower ---
  dash: () => { noise(.22, .24); tone(420, .2, 'sawtooth', .2, 620); },        // ember surge
  grant: () => [392, 523, 659, 880].forEach((f, i) => tone(f, .18, 'triangle', .26, 0, i * .09)),
  // --- The Throne ---
  ember: () => tone(660, .1, 'triangle', .12, -180),                          // a lobbed cinder
  lamp: () => { tone(520, .16, 'triangle', .16, 220); noise(.1, .12); },       // a thrown spark
  parry: () => { tone(1250, .1, 'square', .24, -520); noise(.06, .22); tone(1900, .2, 'triangle', .12, 260); },
  wake: () => { tone(90, .9, 'sawtooth', .26, 55); noise(.8, .12); },         // the Warden rises
  wind: () => tone(300, .18, 'square', .1, 90),                              // the orange tell
  heavy: () => { noise(.28, .3); tone(120, .3, 'square', .28, -50); },        // axe into the floor
  charge: () => { noise(.5, .2); tone(140, .45, 'sawtooth', .18, 60); },      // boots on stone
  boom: () => { noise(.4, .32); tone(64, .45, 'square', .32, -20); },         // helmet into a wall
  bossDie: () => { tone(180, 1.4, 'sawtooth', .28, -130); noise(1.2, .16); },
  sealed: () => { tone(160, .12, 'square', .3, -60); noise(.06, .24); },      // the door will not open
};
