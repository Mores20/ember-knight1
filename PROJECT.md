# Ember Knight — project reference

Everything you need to keep building this. Player-facing info lives in `README.md`; this file is
the map of the machine.

- **Version:** 1.0.0
- **Platforms:** any modern browser (over HTTP), and a portable Windows x64 build
- **Stack:** plain JavaScript ES modules + Canvas 2D. No framework, no bundler, no build step for the game itself.
- **Entry point:** `index.html` → `knightfall/main.js`
- **Desktop shell:** Electron (`app/main.js`), packaged with electron-builder

---

## 1. Commands

| Command | What it does |
|---|---|
| `python -m http.server 8000` | Play from source at `http://127.0.0.1:8000/` (HTTP is required — ES modules and audio won't load from `file://`) |
| `npm install` | Install the desktop/build dependencies (not needed to play) |
| `npm start` | Run the game in an Electron window |
| `npm test` | Headless regression suite (`tools/harness.mjs`, 104 checks, ~2 s) |
| `npm run smoke` | Launch Electron, verify boot/canvas/audio/a fight, screenshot, exit code |
| `npm run dist` | Build `dist/Ember-Knight-<version>.exe` (portable) |

Git tags mark releases (`v1.0.0`). `dist/` and `node_modules/` are ignored.

---

## 2. Repository map

```
index.html               page shell: canvas, frame/case CSS, integer scaling, plaque
package.json             app metadata, scripts, electron-builder config
CHANGELOG.md             release notes
README.md                player-facing
PROJECT.md               this file
docs/                    README screenshots
app/main.js              Electron shell: app:// protocol, window, F11, --smoke
build/icon.ico           app icon (generated from the knight sprite)
tools/harness.mjs        headless regression suite (Node, stubbed DOM/canvas)
knightfall/
  main.js                game: state machine, update/render, bosses wiring, HUD, ending
  level.js               all 8 level definitions + PROLOGUE/EPILOGUE
  player.js              the knight: movement, dash, sword, lantern, debuffs
  enemies.js             enemy classes + makeEnemy
  boss.js                Ash Warden (melee boss)
  king.js                Ash King (mage boss, spells, summons)
  ashwarden.js           Warden sprite generator + drawWarden
  ashking.js             King sprite sheet (rows) + drawKing
  sprites.js             knight skins + drawKnight
  mobs.js                goblin/bat/shield sprites + drawMob
  mobsprites.js          archer/wisp/crawler/shade/husk/hexer sprites + drawBadge
  tiles.js               stones, torches, coins, hearts, spikes, drawSolid
  themes.js              per-phase palettes, POP/TRAIL/FLAME/THREAT, MOBS colours
  pixel.js               low-level pixel primitives used by the generators
  menu.js                title screen, phases, colours, controls, confirm, diorama
  audio.js               WebAudio chiptune arpeggio + all SFX
  sound.js               recorded boss audio (music/stings/voices)
  input.js               key map, pressed/keys, raw hits[] queue for the menu
```

Line counts drift; `main.js` is the big one (~1100), then `level.js` (~470), `king.js` (~400).

---

## 3. Runtime architecture

### Boot

1. `index.html` sets up a 960×540 canvas, the outer case/frame, scanlines, and an integer-scaling
   script that sizes the canvas to the window.
2. `knightfall/main.js` loads, imports every module, calls `loadLevel(run.lvl)`, `syncMenu()`, sets
   `g.state = 'menu'`, and starts `requestAnimationFrame(frame)`.

### The loop (`frame`)

```
dt = min(0.033, (ts - last)/1000)      // clamped: a stalled tab cannot teleport the player
if state === 'menu' -> drain hits[] into menu.key()
else -> global keys: Esc opens the menu, R reloads the level, M toggles mute
if g.stopT > 0 -> g.stopT -= dt        // hit-stop: freeze the world, keep buffered input
else -> update(dt); clearPressed()
render(); requestAnimationFrame(frame)
```

`g.shake(n)` only raises a value; `g.shk` decays by 0.88 per frame. `g.stop(t)` is hit-stop.

### States

| state | entered by | what updates/renders |
|---|---|---|
| `menu` | boot, Esc | `menu.update/draw`; world paused |
| `play` | CONTINUE, new game after prologue, phase select | the whole simulation |
| `story` | new journey, prologue | `updateStory`: 1 s settle per page, key advances |
| `card` | between phases | holds 7 s (key skips after 0.6 s), then loads the next level |
| `win` | final gate | scripted ending timeline (0 → 27 s) |
| `credits` | `win` past 27 s, or a key after 24 s | static screen; Enter/Esc → menu, R → last phase |

### Update order (inside `play`)

`g.time`/`run.time` → solids (moving/crumbling) → wind → light bridges → switches → `p.update` →
checkpoints → **sword** (torches, enemies, hex orbs, boss) → enemies → **hex orbs** → boss
(`parry` then `update`) → coins/hearts/ability pickups → grant banner → fall/death → hazards → tide
→ trails → particles → `g.dark` smoothing.

The sword block returns a boss result: `0` no hit, `1` damage, `2` clang (used by both bosses).

### Render pipeline

`render()` → `renderCard` / `renderStory` / `renderCredits` / `renderWorld` → `drawStrips()`.

- The whole canvas is **960×540 + 34 px top strip + 18 px bottom strip**, but the strips are cut out
  of the 540 frame (the world is translated down by `BAR = 34` and its bottom 52 px sit under the
  strips / off-canvas).
- World space uses `ctx.setTransform(..., -cam.x, BAR - cam.y)`; **anything drawn after the HUD
  `setTransform(1,0,0,1,0,BAR)` is screen-space** (level title, banners, boss text, the ending).
- `drawStrips()` owns hearts/coins/abilities/boss bar/timer on top, phase + controls + debuff badges
  on the bottom.
- `menu.draw(ctx, BAR)` paints its own 960×540 screen inside the frame.

---

## 4. Level data (`level.js`)

Every level is an object; `LEVELS` is the array of all eight, and `TOTAL_COINS` is derived.

```js
{
  title, name, line, lore, hint,        // copy
  style, theme,                         // tileset style + THEMES index
  spawn: [x, y], w, h, vscroll,         // vscroll: camera follows vertically (towers)
  darkZones: [[x0, x1], ...],           // stretches where the veil closes in
  lights: [[x, y, r], ...],             // static gameplay light points
  braziers: [[x, y], ...],              // King phase 3 lights these
  hazards: [{ type: 'spike', x, y, w, h }],
  solids: [ ... ],                      // see below
  torches: [{ x, y, lit: 0|1, cp: 0|1 }],   // cp = checkpoint when lit
  coins: [[x, y], ...], hearts: [[x, y], ...],
  enemies: [ ... ],                     // same fields as enemies.js constructors
  props: [{ type, x, y, h? }],          // scenery, no collision
  secrets: [{ x, y, w, h, name }],      // hidden alcove; a veil hides it until entered
  gate: { x, y, w, h }, cps: [[x, y], ...],
  sigil: { x, y },                      // ember dash pickup
  lantern: { x, y },                    // ember lantern pickup
  switches: [{ x, y, group }],          // lantern bowls that lock light bridges
  wind: [{ x, w, dir, on, off, force, ph }],
  tide: { y0, speed },                  // rising hazard
  boss: { x, y, wake, hp },             // Ash Warden
  king: { x, y, wake, hp, anchors },    // Ash King
  throne, bell                          // decorative flags
}
```

### Solid kinds

| fields | meaning |
|---|---|
| `{x,y,w,h}` | solid block |
| `{... oneway: 1}` | thin ledge: land from above, jump through from below, never blocks walking |
| `{kind:'crumble', ...}` | shakes when stood on, drops out, fades back |
| `{kind:'move', x0,y0, w,h, ax, ay, sp, ph}` | moving platform (players ride it via `groundSolid`) |
| `{litOnly: 1, group}` | exists only inside light; `switch` locks its group solid |
| `off` | runtime flag: crumbled / cracked / gone |
| `pass` | runtime flag: no collision (unlit bridge) |
| `broken` | visual flag for the chasm stones |

### World art (S5)

`backdrop.js` draws eight layered, parallaxed environments (`road, crypt, tower, throne, ash, forge,
archive, heart`) with their own silhouettes and drifting particles — ash, mist, dust, embers, pages,
sparks. Far layers lag the camera horizontally, and climb levels also drift vertically. `OUTDOOR`
keeps the stars and moon only for the Road, Tower, Gardens and Heart; the interiors get their own
ceiling. `scenery.js` draws the `props` list (`grave, statue, bones, cart, anvil, shelf, crystal,
tree, arch, chain, banner, rubble`) behind the knight, and the `drawSecretVeil` arch that hides each
alcove until the knight is within ~200 px. Entering a secret records it in `run.secrets[phase]`, shows
the `A HIDDEN ALCOVE` banner, and the veil is gone for good. All secret ledges are `oneway` so the
knight can jump up through them; the Road, Crypt, Tower, Gardens, Archive and Heart each hide one.

> Add a level by copying a neighbour and filling every field. `npm test` checks that the spawn sits
> on a solid, the gate/checkpoints exist, and no walking enemy floats.

---

## 5. The knight (`player.js`)

Constants: `MAXV 230`, `ACC 1900`, `GRAV 1700`, `JV -620`, `CUT -240`, `DASH_V 480`, `DASH_VG 403`,
`DASH_T .22`.

- **Jump** apex ≈ 113 px; variable height via jump-cut; coyote 0.1 s; buffer 0.12 s.
- **Dash** is one per airtime and eight-directional: the direction held at the press (arrows + W/S for
  up/down, diagonals normalised) with 480 px/s in the air and 403 on a flat ground dash. Vertical speed
  is set for up/down/diagonal surges and kept for flat ones. A cyan trail follows the surge vector.
  Ground surge ≈ 116 px start-to-stop.
- **Attack:** `swing = .26 s`; the box is live between 0.1 s and 0.2 s. Aim is chosen at the press:
  36×28 in front normally, 40×38 overhead with ↑/W held, and 40×38 below with ↓/S while airborne
  (a connecting plunge bounces the knight with `vy = -360` and refreshes the dash).
- **Parry:** a live swing against a projectile reflects it (boss bolts and archer arrows).
- **Lantern:** 3 sparks thrown with E; they light gameplay light and the veil.
- **Hearts:** 3; `hurt` gives 1.2 s invulnerability + knockback.
- **Boss hurtboxes** are padding (`hurtbox()`, +6 px x / +4 px y) so melee lands at the edges; contact
  damage still uses the tight `box()`.
- **Debuffs** (`p.debuffs`): `smother` (aura 122→62 px), `heavy` (×0.65 speed, ×0.82 jump, no dash),
  `snuff` (sword deals no damage). Times tick down in `update`.
- `p.root` (from snares) pins horizontal movement and blocks jumping.

---

## 6. Enemies (`enemies.js`, `mobsprites.js`, `mobs.js`)

| type | hp | behaviour | sprite module |
|---|---|---|---|
| `goblin` | 1 | ground patrol | `mobs.js` |
| `shield` | 2 | patrols, blocks frontal hits (clang) | `mobs.js` |
| `bat` | 1 | sine flight along a patrol range | `mobs.js` |
| `archer` | 2 | draws, then fires a parryable arrow (level 5) | `mobsprites.js` |
| `wisp` | 1 | chases; recoils and goes harmless in light | `mobsprites.js` |
| `crawler` | 2 | slow, ignores knockback, leaves burning slag | `mobsprites.js` |
| `shade` | 2 | only solid/hittable in light; cold rim when untouchable | `mobsprites.js` |
| `husk` | 2 | walks you down in the Throne | `mobsprites.js` |
| `hexer` | 3 | floats, blinks, casts three-orb hexes | `mobsprites.js` |

The old trio in `mobs.js` was redrawn for S6: goblins get a hooded silhouette and a two-frame
coil→lunge when they face you at close range; shield goblins get a nasal helm, a larger riveted kite
shield and a readable guard/open shuffle; bats use a six-frame flap. The new mobs animate per state
(`MOB_STATES`) — the wisp's four-frame drift and halo, the crawler's six legs and snapping mandibles,
the shade's animated dither and cold rim, the husk's walk, and the hexer's gathered cast runes with a
widening sigil under it. Hex orbs carry a short tail and an orbiting glyph. `npm test` checks that
every state draws and that every multi-frame state actually changes.

Adding a mob: sprite rows in `mobsprites.js` (state → frame count) + `DRAW`/`BODY`/`ANCHOR`, colours in
`themes.MOBS`, a class + `makeEnemy` branch in `enemies.js`, a draw branch in `main.js` `drawEnemy`,
and spawns in `level.js`. `ANCHOR` is the foot/centre pivot inside the 32 px cell.

---

## 7. Bosses

### Ash Warden (`boss.js`) — phase IV

States: `dormant → rise → guard → open → (wind → act | volley | charge) → rest/recover → …`.
Every attack is telegraphed in orange. `takeHit` returns `2` when the kite shield faces you, `1`
otherwise. Phase 2 at ⅔ hp adds hyper-armour pressure, and a cleave has a 60% chance to chain
straight into a volley (`chained`, reset on guard) so the shield window punishes camping.

### Ash King (`king.js`) — phase VIII, the real fight

He floats at a fixed height above the floor; **steel only bites while `st === 'stun'`**, otherwise
`takeHit` returns `2` (clang). The only stun is a reflected Ember Bolt.

- **Hover/spacing:** drifts to anchors ≥250 px from you; puffs into position.
- **Spells** (`cast`): `rain` (falling columns), `snare` (root pools), `bolt`/`twin` (parryable),
  `erupt` (jump the line), `grasp` (be airborne), `meteor` (cracks a ledge for 4 s), `burn` (ledge
  fire), `repulse` (shove when crowded).
- **Volleys scale by phase:** rain 3/5/7, eruption 3/4/6, snare 3/4/5, twin 2/3/4, meteor 1/2/3.
- **Combos:** one chained follow-up in phase 2 (45%), two in phase 3 (75%); cooldown 0.9/0.65/0.32 s.
- **Stun:** reflected bolt → falls to the floor → **one** impact (shake/boom/puff) → stunned
  2.4/2.2/2.0 s. Light rule in phase 3: a hit in the dark does nothing.
- **Summons:** each phase change calls **two hexers** at `x 430` and `w-430` with `pierce: 1` orbs;
  phase 3 tops the pair back up. They die with him or on your death. Each carries **three health pips**
  above its hood; killing the caster **clears the hex it applied** (`applied` tracks it).
- **Phase-3 contrast:** hazards light themselves in the dark — bolts double their glow radius and gain
  a white core, rain/eruption/meteor glows scale up, and hex orbs brighten with `g.dark`.
- **Death:** `dead → gone`; the gate unseals.

---

## 8. Art pipeline

- `pixel.js` — primitives (`R`, `disc`, `ring`, `line`, `shape`, `poly`, `rotp`, dithering) operating
  on packed RGBA `Uint32Array` cells.
- Sprites are generated at module load into offscreen canvases (`sprites.js` builds a cache per skin
  and re-bakes on `setKnight(skin, emberSword)`).
- Conventions: 32 px cells for mobs, feet on the bottom row (except floaters), flat shading with a
  "lift" tone, **orange (#ff8a3d family) is reserved for danger** and never used in world colours,
  no outlines, integer scales only (`imageSmoothingEnabled = false`).
- Animation lives in state→frame-count tables: `mobs.js ROWS` for the goblin/shield/bat and
  `mobsprites.js MOB_STATES` for the newer mobs. Drawing interfaces take `(kind, state, frame, x, y,
  face, {flash})`; anchors stay fixed so collisions never move. Add frames to a state's count, not to
  the cell — the harness rejects empty or still multi-frame states.
- `themes.js` holds the eight world palettes plus `POP`, `TRAIL`, `FLAME`, `THREAT` and per-mob colours.
- `ashking.js` exposes `ROWS`/`COUNTS` and `drawKing(ctx, row, frame, cx, feetY, face, {phase, flash, scale})`.

## 9. Audio

Two independent layers:

1. **`audio.js`** — WebAudio chiptune. An arpeggio every 150 ms (gated by `setJingle`) plus named SFX
   (`jump`, `swing`, `hit`, `coin`, `torch`, `dash`, `parry`, `wake`, `wind`, `heavy`, `boom`, `bossDie`, …).
   Muting is `A.toggle()` (master gain 0 / 0.22).
2. **`sound.js`** — the ten recorded clips: `Warden_boss_music`, `warden_intro-voice`,
   `warden-attack`, `warden-death`, `Ash-king_boss_music`, `Ash-king_intro`, `Ash-king_attack`,
   `Ash-king_second_phase`, `Ash-king_third_phase`, `Ash-king_death`.
   `music(key)` loops at 0.3; `sting(key, vol)` plays one-shots; `stopMusic()`.
   Paths resolve with `new URL(FILES[k], import.meta.url)` — **next to the module**, not the page.

Cues (in `main.js` update): wake → intro voice + theme (and the chiptune steps aside); every `wind`
state → the attack sting; King phase 2/3 → their stings; death → stop music + death sting; leaving
the level / respawning → stop + restore the chiptune. Audio needs a user gesture, so `A.init()` runs
on the first keydown.

## 10. Menus & UI (`menu.js`)

`createMenu({ save, audio, onAction })` returns:

| member | meaning |
|---|---|
| `setSave(save)` | `{ level, cleared, skin }` or `null`; CONTINUE greys out without it |
| `update(dt)` / `draw(ctx, dy)` | animation + rendering, drawn at the frame offset |
| `key(code)` | raw `KeyboardEvent.code`; returns true if consumed |
| `sceneName()` | current screen (`main`, `phases`, `colors`, `controls`, `confirm`) |
| `sceneInfo()` | the title-screen diorama state (used by tests) |

`onAction` receives `{ type: 'continue' | 'new' | 'phase', index }` and `{ type: 'color', index }`.
The main menu is CONTINUE / NEW GAME / PHASE SELECT / KNIGHT COLOURS / CONTROLS / SOUND; the diorama
behind it paces, fights goblins/bats every 12–16 s, and uses the selected skin.

## 10b. The Sketchy Merchant

A safe-room shop (`merchant: { x, y }` in a level; phases I, V and VII have one). Walk up and press
**F** (the hint reads `F TRADE`). The game enters the `shop` state: the world pauses, the strips keep
the HUD, and a panel lists four items with prices and per-visit stock.

| item | price | effect | unlock |
|---|---|---|---|
| Ashroot Potion | 15 | +1 heart (refused at full hp) | always |
| Cleansing Flask | 20 | clears all three hexes | always |
| Ember Shield | 35 | `p.shield = 1`; `hurt()` eats one hit | Warden cleared (`cleared[3]`) |
| Greater Heart | 40 | +2 hearts | Phase V cleared (`cleared[4]`) |

Spending uses **gold**, never the coin tally. Stock is `[2, 1, 1, 1]` and refreshes on every level
load. Up/Down selects, Enter buys (with refusal lines for locked/sold-out/poor/not-needed), F or Esc
leaves. The merchant is drawn procedurally (hood, eyes, crate, lantern) and his stock lives on
`g.l.merchant`.

## 11. Story, ending, credits

- `PROLOGUE` (3 pages) shows on a new journey; `EPILOGUE` (3 lines) plays in the ending.
- Each level carries `line` + `lore`; the card between phases shows both for 7 s.
- Ending timeline (`g.win`): flames 0–5, soul 5–8.2, blade 8.2–11.6, title 11.4–16.4, lines at 13.4,
  epilogue 16.8 (lines 16.8/19.0/21.2), stats 23.8. A key skips to 16.8.
- At 27 s (or a key after 24 s) the game switches to the **credits** state: MORE TO COME, the version,
  `created by LumpiaN#1`, thanks.
- `run.titled` and `run.emberSword` are set by the ending and never cleared.

## 12. Save data

Key: `emberknight.v1` in `localStorage` (on the app's stable origin).

```js
{
  lvl, hp, coins, gold, time,
  abil: { dash, lantern },
  got: { [phase]: { c: [coinIndex], h: [heartIndex] } },
  lit: { [phase]: [torchIndex] },
  secrets: { [phase]: [secretIndex] },
  cleared: [bool × 8],
  skin, emberSword, titled
}
```

`coins` is the lifetime tally (the 142-coin completion count); **`gold`** is the spendable purse,
filled by the same pickups. `secrets` records which alcoves have been opened (it only removes veils;
the coins and hearts are already in `got`). v1 saves migrate once: `gold` is seeded from `coins` and
`secrets` defaults to `{}`.

Written on pickups, purchases, level loads, phase completion, respawn, before unload, and after the
ending. Further shape changes still need a version bump (or defensive defaults).

---

## 13. Desktop shell (`app/main.js`)

- Serves the folder on **`app://local`** with an explicit content-type per extension and HTTP **Range**
  support (HTMLAudio needs it). `app://` is registered as `standard` + `secure`, which is what makes
  `localStorage` persist — do **not** switch to `file://` or a random localhost port.
- Window 1440×900 (min 1024×640), position remembered in `%APPDATA%\Ember Knight\window.json`, F11
  fullscreen, no menu bar, external navigation blocked.
- `--smoke` runs six checks (menu state, 960×540 canvas, localStorage, three audio clips with real
  durations, 5 s of the King fight, console cleanliness), writes `%TEMP%\ember-knight-smoke.png`, and
  exits 0/1.

Build config lives in `package.json → build` (asar, portable target, `build/icon.ico`). Bump
`"version"` there and in `knightfall/main.js → GAME_VERSION` for a release; tag it.

---

## 14. Testing

`npm test` → `tools/harness.mjs` (104 checks, ~2 s). It stubs `document`, `ImageData`, `localStorage`,
`AudioContext` and `requestAnimationFrame`, imports the real game, and drives it:

- boot + the renderer actually draws
- all eight phases load; spawns and every walking enemy sit on solids; titles/lore/gates/checkpoints exist
- jump height, eight-way dash directions (and Space not counting as up), dash distances, the two
  dash-gated gaps, up-slash and plunge + bounce, and boss hurtbox padding
- a sword kill, coins banked to localStorage
- the King: wake, ward clang, bolt → stun, stun damage, phase flips, two flanking summons, phase-3
  volley counts, one-shot knockdown; the Warden's phase-2 cleave→volley chain
- the hexer: cast → 3 orbs, debuff without damage, heavy locks the dash, snuff silences the blade,
  and killing the caster clears its hex
- the merchant: F opens the shop, a potion heals and charges 15, a poor knight is refused, the flask
  cleanses, the shield unlocks after the Warden and eats a hit, F leaves, coins fill the purse
- the world: eight backdrops, valid in-bounds props, secret alcoves with a one-way ledge + launch pad
  + reward, discovery saves, and the Ember Road niche is reachable by an actual jump
- checkpoints: the Ember Road keep, the Gardens midpoint and the Archive fallback
- enemy art: every state draws, multi-frame states animate, every spawned type has a sprite model,
  and the Ember Husk is placed in the Throne
- the menu: Esc, CONTINUE, colour persistence, diorama kills
- story settle, card hold, ending → credits

`npm run smoke` covers the *desktop* layer (protocol, audio, window).

When you add a feature, add a behavioural check here — it runs in a second, so there is no excuse.

**Note:** the game modules are ESM while `app/main.js` is CommonJS, so `package.json` has no
`"type": "module"`; running the harness prints a harmless `MODULE_TYPELESS_PACKAGE_JSON` warning.

---

## 15. Conventions & gotchas

- **Orange means danger.** Never use the `#ff8a3d` family in world art.
- After the HUD `setTransform`, coordinates are screen-space. World drawing must happen before it.
- The strips crop 52 px of the world's bottom: keep anything important above y ≈ 488.
- Whole-pixel scaling preferred; the CSS frame adds the letterbox and the plaque.
- `sound.js` paths are module-relative; keep clips in `knightfall/sound/`.
- Hit-stop (`g.stop`) freezes update but not buffered input — use it for impact, not for delays.
- The King's phase-3 light rule (`lit`) is computed from `lightAt`; braziers are pushed into
  `g.l.lights` and **restored on respawn** (along with `darkZones`) — don't remove that reset.
- `level.js` is edited by hand; keep the 4-space indentation (CRLF-safe edits).
- `mob-sheets/hexer.png` is an untracked art reference, not used at runtime.

---

## 16. How to extend

**A new phase:** copy a level object, set `w/h/spawn/cps/gate`, place solids with reachable jumps
(jump apex ≈ 113 px), then let `npm test` check spawns/enemies. `TOTAL_COINS` updates automatically.

**A new mob:** sprite rows + `MOB_STATES`/`BODY`/`ANCHOR`, a class with `update`/`hit`, `makeEnemy`,
`drawEnemy` in `main.js`, colours in `themes.MOBS`, spawns in `level.js`, plus a harness check.

**A new boss:** model it on `king.js` (`update`, `parry`, `takeHit`, `reset`), add its anim mapping in
`main.js`, its sprite generator, and wire `loadLevel` (`l.boss`/`l.king`). The HUD boss bar takes
`max/hp/phase/title` from the object.

**A new ability:** state on `Player`, a level `sigil`/`lantern`-style pickup, the grant banner
(`g.grant`), a HUD pip, and a save field in `freshRun()`.

**Balancing knobs:** `king.js` (`windFor`, `cool`, the count tables in `cast`, summon count),
`player.js` (`DASH_*`, `JV`, `GV`), enemy `hp`, and level `coins`/`enemies`.

---

## 17. Known issues / tech debt

- The exe is **unsigned** (SmartScreen warning) and Windows-only; a Mac build must be made on a Mac.
- The harness is a fast smoke-level suite, not a full content regression suite.
- No save migrations; a schema change needs a version bump.
- GitHub Pages/Releases are manual steps (no `gh` CLI installed).
- The four strip edge cases (boss bar + three debuff badges) are untested visually.
- `mob-sheets/hexer.png` is untracked.

---

## 18. Credits

Created by **LumpiaN#1**. Thanks for playing.

© LumpiaN#1 — all rights reserved.
