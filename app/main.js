// Ember Knight desktop shell. The game itself is untouched: this serves the repo folder from a
// stable custom origin (app://local) so ES modules load and localStorage saves survive restarts,
// then puts it in a window with F11 fullscreen and a memory for size/position.
const { app, BrowserWindow, protocol, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const ROOT = path.join(__dirname, '..');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const SMOKE = process.argv.includes('--smoke');
const STATE_FILE = path.join(app.getPath('userData'), 'window.json');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
};

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
}]);

/* ---- the game files, with range support so HTMLAudio can stream ---- */
async function serve(req) {
  const url = new URL(req.url);
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return new Response('forbidden', { status: 403 });
  let data;
  try { data = await fs.promises.readFile(file); } catch { return new Response('not found', { status: 404 }); }
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.get('range');
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : data.length - 1;
      const body = data.subarray(start, end + 1);
      return new Response(body, {
        status: 206,
        headers: {
          'content-type': type, 'accept-ranges': 'bytes',
          'content-range': `bytes ${start}-${end}/${data.length}`, 'content-length': String(body.length),
        },
      });
    }
  }
  return new Response(data, { status: 200, headers: { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': String(data.length) } });
}
app.whenReady().then(() => protocol.handle('app', serve));

/* ---- window state, remembered between runs ---- */
function savedBounds() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const area = screen.getDisplayMatching(s).workArea;
    const visible = s.x < area.x + area.width - 120 && s.x + s.width > area.x + 120
      && s.y < area.y + area.height - 80 && s.y + s.height > area.y + 80;
    return visible ? s : null;
  } catch { return null; }
}
function remember(win) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(win.getNormalBounds()));
  } catch { /* a lost window position is not worth a crash */ }
}

function createWindow() {
  const saved = SMOKE ? null : savedBounds();
  const win = new BrowserWindow({
    width: saved ? saved.width : 1440, height: saved ? saved.height : 900,
    x: saved ? saved.x : undefined, y: saved ? saved.y : undefined,
    minWidth: 1024, minHeight: 640,
    backgroundColor: '#05070f',
    autoHideMenuBar: true,
    title: `Ember Knight \u2014 v${VERSION}`,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.setMenuBarVisibility(false);
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://local/')) e.preventDefault(); });
  win.on('close', () => { if (!SMOKE) remember(win); });
  win.loadURL('app://local/index.html');
  return win;
}

/* ---- smoke test: the same checks that caught the audio 404, run against the real shell ---- */
async function smoke(win) {
  const errors = [];
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 3) errors.push(message); });
  win.webContents.on('render-process-gone', (_e, d) => errors.push('renderer gone: ' + d.reason));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  setTimeout(() => { console.log('SMOKE TIMEOUT'); app.exit(2); }, 45000);   // never hang a build
  await wait(2600);
  const checks = [];
  const add = (ok, label) => { checks.push({ ok, label }); console.log((ok ? 'PASS  ' : 'FAIL  ') + label); };

  let boot = {};
  try {
    boot = await win.webContents.executeJavaScript(`(async () => {
      const m = await import('/knightfall/main.js');
      const c = document.querySelector('canvas');
      const out = { state: m.dbg.g.state, canvas: c.width + 'x' + c.height, storage: false, audio: [] };
      try { localStorage.setItem('smoke', '1'); out.storage = localStorage.getItem('smoke') === '1'; localStorage.removeItem('smoke'); } catch (e) {}
      m.dbg.SND.preload();
      await new Promise(r => setTimeout(r, 1500));
      out.audio = ['kingMusic', 'kingIntro', 'wardenMusic'].map(k => {
        const a = m.dbg.SND.clip(k);
        return k + '=' + (a && a.duration > 0 ? a.duration.toFixed(1) + 's' : 'MISSING');
      });
      return out;
    })()`, true);
  } catch (e) { errors.push('boot: ' + e.message); }
  add(boot.state === 'menu', 'boots to the title screen (' + boot.state + ')');
  add(boot.canvas === '960x540', 'canvas is 960x540 (' + boot.canvas + ')');
  add(boot.storage === true, 'localStorage works on the app:// origin');
  add(Array.isArray(boot.audio) && boot.audio.every(a => /=\d/.test(a)), 'recorded audio loads (' + (boot.audio || []).join(', ') + ')');

  try {
    await win.webContents.executeJavaScript(`(async () => {
      const m = await import('/knightfall/main.js');
      m.dbg.start(); m.dbg.loadLevel(7);
      const p = m.dbg.g.p; p.x = 700; p.inv = 9999;
      return 'ok';
    })()`, true);
  } catch (e) { errors.push('fight: ' + e.message); }
  await wait(5000);
  let fight = {};
  try {
    fight = await win.webContents.executeJavaScript(`(async () => {
      const m = await import('/knightfall/main.js');
      const b = m.dbg.g.boss;
      return { st: b && b.st, hp: b && b.hp };
    })()`, true);
  } catch (e) { errors.push('fight read: ' + e.message); }
  add(fight.st && fight.st !== 'dormant', 'the King fight runs (' + fight.st + ', hp ' + fight.hp + ')');
  add(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));

  try {
    const img = await win.webContents.capturePage();
    const file = path.join(os.tmpdir(), 'ember-knight-smoke.png');
    fs.writeFileSync(file, img.toPNG());
    console.log('shot ' + file);
  } catch (e) { console.log('screenshot failed: ' + e.message); }

  const failed = checks.filter(c => !c.ok).length;
  console.log(failed ? `SMOKE FAILED (${failed}/${checks.length})` : `SMOKE OK (${checks.length}/${checks.length})`);
  app.exit(failed ? 1 : 0);
}

app.whenReady().then(() => {
  const win = createWindow();
  if (SMOKE) win.webContents.once('did-finish-load', () => smoke(win));
  app.on('window-all-closed', () => app.quit());
});
