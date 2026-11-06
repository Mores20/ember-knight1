# Ember Knight - V2 Vertical Slice (V0 + V1 + ... + V13)

The v2 slice now lives on `main` alongside the shipped game and covers the full shape of the world-design document: **tutorial road → Cinderhaven → Areas I through VIII → the ending → title and chapter replay**. The shipped v1 game is still available at `index.html` and is untouched.

## V13 - the hub, the shop, the ending and the title

### Hub stages and district NPCs

Cinderhaven now has five progress stages driven by the clear flags:

| Stage | Condition | Hub feel |
|---|---|---|
| S1 | nothing cleared | cold, dark, heavy ash |
| S2 | Area I | lamps and the merchant return |
| S3 | Area III | villagers, bards, warmer |
| S4 | Area V | green touches, forge/archive reopen |
| S5 | Area VIII | fully relit, rising gold embers, recognition gathering |

- **Aldrin and Daryl** play the Bell Plaza stage from Area II; their lines follow the Carillon note and the ending.
- **The Guard** keeps the Guardhouse between Gate IV and the Garden Steps. Defeating the Fallen Captain records **`run.captainSeal`**, which unlocks his account of the Captain's last order and the First Hearth hint.
- **Theodore's Forge** opens after Area VI. The first conversation grants the one-time **Spectacles of Theodore** (`run.spectacles`): the player's darkness aura is larger and secret veils are readable from much farther away.
- **Zafra** keeps the archive after Area VII, with post-Margin-Note and post-ending lines.
- After Area VIII, three **villagers** gather by the archive brazier under the new bunting. Clint, Patino and the new cast all gain stage 3–5 dialogue.

### Merchant stock expansion

The Sketchy Merchant now has eight items; the panel is taller and shows the current clear-state quote. The four base items remain; the new ones unlock by milestone:

| Item | Price | Stock | Unlock | Effect |
|---|---|---|---|---|
| Ashroot Potion | 15g | 2 | always | +1 heart |
| Cleansing Flask | 20g | 1 | always | clears debuffs |
| Ember Shield | 35g | 1 | Area I | eats one hit |
| Greater Heart | 40g | 1 | Area I | +2 hearts |
| **Ember Flask** | 30g | 1 | Area II | +1 heart and clears debuffs |
| **Vanguard's Seal** | 45g | 1 | Area IV | Ember Shield + 1 heart |
| **Lantern Oil** | 20g | 2 | Area V | +1 max spark (cap 5), refills |
| **Archive Lens** | 35g | 1 | Area VII | secret veils shine from farther away |

`run.lampMax` drives the HUD, torch refills and E throws (default 3, cap 5). Both the Market Lane and Reading Room merchants share the unlocks and stock rules.

### The ending sequence

The h3 exit now plays a skippable cinematic instead of a single card:

1. a lone ember in the dark;
2. the King's silhouette breaks apart and the **First Hearth** catches;
3. Cinderhaven relights and gold embers rise;
4. the **THE EMBER KNIGHT / THE KINGDOM REMEMBERS** title;
5. scrolling credits over the lit hub (world, court, the fallen, the light, thanks).

Enter advances/skips; Esc leaves immediately. The clear state and `endingSeen` are saved. Credits use in-game roles and area names only; personal names are deliberately on hold.

### Title menu and post-game replay

The game now opens on a title screen with a procedural ember sigil:

- **CONTINUE** — enter the current hub/tutorial.
- **NEW GAME** — confirmation prompt, then a fresh save and tutorial.
- **CHAPTERS** — after any clear, replay any cleared area (I–VIII) or the hub. Progress, gold and unlocks are kept; hearts refill for the replay.
- **CREDITS** — after the ending, rewatch the full sequence.

The pause menu gains a **TITLE** option, so the title/chapters/credits are always reachable without refreshing. The ending can be replayed from either the title or the new run.

### Save additions

`captainSeal`, `spectacles`, `lampMax`, `lens`, `ending` and `endingSeen` are added with safe defaults; old v2 saves load unchanged. The coin total remains **275** because shop purchases spend gold, not the lifetime coin tally.

## V12 - Area VIII: The Ember Heart (the finale)

Gate VIII opens at the end of Archive Steps after Area VII. The last three levels are the approach and
the Ash King's arena.

| Level | Name | Shape |
|---|---|---|
| 8-1 | The Ember Stair | Ward Echoes and perfect-guard parry practice |
| 8-2 | The Hall of Wards | More echoes, a Hexer preview, the last walk |
| 8-3 | The Ember Heart | The Ash King, three phases, the First Hearth |

- **Ward Echo** — a floating ward shard that fires slow bolts. A perfect guard (L) reflects the bolt;
  reflected bolts can kill the echo and other enemies.
- **The Ash King** — reuses the shipped v1 sprite and three-phase moveset (18 HP):
  - **Phase 1:** he floats out of sword reach. The ward turns every normal hit; reflect an Ember
    Bolt with a perfect guard (or a timed sword swing), then cut him while he is stunned on the floor.
  - **Phase 2:** faster casts, twin/quadruple bolts, and two **summoned Hexers** with piercing hex
    orbs. Killing a caster clears its hex.
  - **Phase 3 (Final Ember):** the hall goes dark and the braziers light. Only a lit King can be hit;
    keep near a brazier or throw a spark, break the ward, and finish him. Hex management matters.
- **The First Hearth** secret hides above the arena's one-way ledges: **STILL WARM.**
- Beating him shows the ending card: **THE EMBER KNIGHT / THE KINGDOM REMEMBERS**, with *“A flame
  kept is a flame lost. Share it.”* Press Enter to return to Cinderhaven, which settles into
  **THE KINGDOM REMEMBERS**.
- The v2 coin total is now **275** across the tutorial and all eight areas.

## V11 - Area VII: The Silent Archive

Gate VII opens at the end of **Archive Steps**, past Forge Row, once Area VI is cleared. The area is
the first one built around darkness and light management.

| Level | Name | Shape |
|---|---|---|
| 7-1 | The Reading Room | The merchant, the first cold bowl and light bridge, a Page Moth |
| 7-2 | The Stacks | Two light bridges, the bowl-switch seal, Shades, a Hexer |
| 7-3 | The Reading Ledge | Stack Sentinel, the Lampless Curator, the Trapped Spirit and the Margin Note |

- **Darkness.** The archive is drawn under a dark veil with warm pools around the knight, lit bowls,
  torches, lamps and sparks. The HUD stays readable.
- **Light rules.** **E** still throws the lantern spark; a sword swing lights a **cold bowl**, and a
  spark or lamp also lights one. Two **light bridges** are only solid while their bowl burns; a
  third way is a **sealed gate** that opens with its bowl switch.
- **Shades** cannot be cut in shadow; light makes them solid and vulnerable (they recoil from it).
  **Hexers** cast three-orb hex volleys (smother shrinks your light, snuff stops the lantern, heavy
  slows you); hex orbs and debuff badges are now fully wired into v2.
- **Page Moth** drifts toward the nearest spark or lamp. **Stack Sentinel** freezes in light and
  lunges in the dark.
- **The Lampless Curator** (8 HP) is a mini-boss that is untouchable in shadow and only takes hits
  while lit. It recoils from light and lunges when the light fades.
- **The merchant** waits in the Reading Room with the same gold shop as Cinderhaven.
- **The Trapped Spirit** speaks of the king's last night, and **the Margin Note** secret above the
  reading ledge shows his handwriting: *“I did not mean to smother it.”*
- The Archive Steps sign tracks **0/3 → 3/3**. 7-3 returns to Cinderhaven, completes Area VII, lights
  the **Zafra Archive** and opens the preview of Gate VIII.
- The v2 coin total is now **253** across the tutorial and all seven areas (275 with Area VIII).

## V10 - Area VI: The Drowned Forge

Gate VI opens at the end of **Forge Row**, past the Garden Steps, once Area V is cleared.

| Level | Name | Shape |
|---|---|---|
| 6-1 | The Slag Stairs | The first vertical climb, torch checkpoints, Slag Smith, Rust Wisp |
| 6-2 | The Chain Lifts | Moving chain platforms over the rising tide |
| 6-3 | The Summit Foundry | The final climb and the Slag Foreman |

- **The ember tide.** 6-1 introduces a burning surface that rises continuously. Falling in costs a
  heart and returns the knight to the last checkpoint, with the tide reset just below it. The three
  forge levels are the first **vertical** levels: the camera follows the climb up.
- **Torch checkpoints** are the only safe places on the ascent. The mid and upper torches matter.
- **Chain lifts** (`kind:'move'`) carry the knight between shelves in 6-2; their chains are visible.
- **Slag Smith** lobs arcing slag that lands as a burning puddle on the shelf below.
- **Rust Wisp** drifts on its own line, a timing hazard rather than a chaser.
- **The Slag Foreman** (12 HP). Hammer slams send ground waves, arcing slag leaves puddles, and a
  low chain sweep must be jumped. His swing has hyper-armour; the idle and recovery are open. At
  half health he enters phase two and the tide starts rising in bigger steps. The arena has a
  chain-driven platform that moves under the fight.
- The Forge Row sign tracks **0/3 → 3/3**. 6-3 returns to Cinderhaven, completes Area VI and lights
  the Forge Row chimneys (**THE FORGE BURNS AGAIN**).
- The v2 coin total is now **232** across the tutorial and all six areas (253 with Area VII).

## V9 - Area V: The Ashen Gardens

Gate V opens at the end of the **Garden Steps**, the last district of Cinderhaven, once Area IV is
cleared. The area uses the grey-green ash palette, bare trees, vines and pale blossoms.

| Level | Name | Shape |
|---|---|---|
| 5-1 | The Withered Gate | The Ember Lantern, two thorn walls, a goblin guard |
| 5-2 | The Overgrown Terraces | Terrace climbing, the Gardener's Journal secret, an Ash Bloom, a creeper, Patino's Herb Patch |
| 5-3 | The Greenhouse | Blooms and creepers, then the Gardener Golem |
| 5-4 | The Heartroot | Mother Blight |

- **The Ember Lantern.** 5-1 grants it permanently. **E** throws a spark (3 charges) that arcs,
  burns thorns on contact, lands as a burning lamp (6.5 s), and exposes the garden bosses. Standing
  in torchlight refills the three charges. The HUD shows the lantern and its charges.
- **Thorn walls.** Green vine barriers become real solids. Light makes them recoil for several
  seconds; they regrow when the light fades (and wait if the knight is still inside).
- **Ash Bloom.** Opens and spits seed arcs in the dark; lamplight or torchlight clamps it shut.
- **Thorn Creeper.** Buried until the knight nears, then it rustles and crawls; jump it or cut it.
- **Gardener Golem** (6 HP). Root slam, ground vine whip (jump) and arcing seeds. Its root cage turns
  the blade. A lantern spark burns the cage open for a few seconds; the gold core is the opening.
- **Mother Blight** (12 HP). Root sweeps, delayed seed bombs and thorn volleys. Her thorn armour must
  be burned back with a spark before she can be struck. At half health she enters **phase two**: the
  arena dims, she attacks faster and the armour regrows sooner. Her last line: *“They only wanted to
  grow.”*
- **Patino's Herb Patch** in 5-2 is a one-time free heart, saved under `run.herbPatch`.
- The Garden Steps sign tracks **0/4 → 4/4**. 5-4 returns to Cinderhaven, completes Area V and gives
  the Garden Steps their green glow.
- The v2 coin total is now **193** across the tutorial and all five areas (232 with Area VI).

## V8 - Area IV: The Throne

Gate IV opens at the end of the **Throne Approach**, the ruined royal approach after Bell Plaza, once
Area III is cleared. The area uses the violet-and-gold throne theme with torn banners and long shadows.

| Level | Name | Shape |
|---|---|---|
| 4-1 | The Gate Hall | Revenant pairs, one rising from a pile |
| 4-2 | The Armory | Rack-to-rack platforming, the Chess Room secret |
| 4-3 | The Portrait Gallery | Upper route, the Half-Written Letter secret, a rising revenant |
| 4-4 | The Captain's Post | The Fallen Royal Guard |
| 4-5 | The Throne Room | The Ash Warden |

- **Royal Revenant.** A ghostly spear guard. Slow patrol, a long telegraphed thrust; a perfect guard
  (L) or a normal guard holds it, and a perfect guard **staggers** it. Some start collapsed and rise
  when the knight comes near.
- **The Fallen Royal Guard (the Captain)** — 8 HP. Shield bash, wide sweep and a leaping thrust, each
  with a long tell. His shield turns the blade outside recovery; a **perfect guard stuns him**. His
  last line plays as he falls.
- **The Ash Warden** — 10 HP, reusing the shipped v1 moveset: cleave shockwaves, ember volleys,
  charges, the shielded guard and recovery openings. Below half health he enters **phase two** with
  the two-direction Ash Quake and faster chains. The shield is steel-pale, the opening glows gold,
  and his dying line plays after the fight.
- The Throne Approach sign tracks **0/5 → 5/5**. 4-5 returns to Cinderhaven, completes Area IV and
  leaves the hub **THE THRONE IS QUIET**.
- The v2 coin total is now **164** across the tutorial and all four areas (193 with Area V).

## V7 - Area III: The Bell Tower

Gate III opens at the end of Cinderhaven's new **Bell Plaza** once Area II is cleared. The tower uses the
purple-and-gold theme, with hanging bells, a belfry silhouette and the moonlit Carillon frame.

| Level | Name | Shape |
|---|---|---|
| 3-1 | The Belfry Stairs | The first bell switch and lift, a log-loft secret, a Peal Wraith |
| 3-2 | The Chime Hall | Two bell-and-lift puzzles, the Chime Codex secret, a wraith |
| 3-3 | The Rafters | Beam bridges over the drop, then the Clapper Golem |
| 3-4 | The Carillon | The Cracked Carillon's rhythm arena |

- **Bell switches.** Hitting a hanging bell with the sword rings it. The ring stuns enemies within the
  belfry (a gold shockwave), and permanently raises the matching **lift** platform for the rest of the
  level. Bells can be rung again to re-stun.
- **Peal Wraith.** Floats and shrieks, sending out a visible expanding ring. Stand still and it catches
  you; jump above its height or dash through the ring. A nearby bell dazes it.
- **Clapper Golem (3-3).** 6 HP. A pendulum clapper and a stomp that sends two ground shockwaves (jump
  them). Its bronze shell turns the blade everywhere except the gold bell-core, which opens after each
  swing.
- **The Cracked Carillon (3-4).** 8 HP. A cluster of bells above the arena runs a four-beat pattern:
  tolling ground waves and falling bells, each with a floor shadow first. After the pattern the small
  **cracked bell** swings low and is the only opening. At half health the beat speeds up and the
  opening shortens.
- The Bell Plaza sign tracks **0/4 → 4/4**. 3-4 returns to Cinderhaven and completes Area III.
- The v2 coin total is now **125** across the tutorial and all three areas (164 with Area IV).

## V6 - Area II: The Sunken Crypt

Gate II now runs all the way through Market Lane and into a second four-level area. The crypt has
its own teal palette, flooded cisterns, bone shelves and hanging chains.

| Level | Name | Shape |
|---|---|---|
| 2-1 | The Flooded Stair | A dry top step, four sinking stones over deep water, a Mire Leech and a bat |
| 2-2 | The Ossuary | Broken bone ledges, the Ossuary Alcove secret, a Wick Skull and a leech |
| 2-3 | The Drowned Nave | Three sinking stones, then the Crypt Warden's arena and gate |
| 2-4 | The Matron's Cistern | A short platform run into the Crypt Matron's flooded cistern |

- **Water** is a level-level hazard: fall in and you lose a heart and return to the checkpoint.
- **Sinking stones** (`kind:'sink'`) dip under the knight and rise again when she steps off.
- **The Mire Leech** hangs from the ceiling, drips, drops when the knight passes under, then crawls
  and retracts. Two hits.
- **The Wick Skull** floats and shrieks, calling one goblin to its position. Two hits. Its summons
  are capped at three.
- **The Crypt Warden (2-3).** 6 HP and a ward: hits bounce off while it is idle. It alternates a
  chain sweep and a slam, both telegraphed; only the long recovery leaves it open.
- **The Crypt Matron (2-4).** 12 HP. Casts rising hands, dripping leeches and a ground surge wave.
  At half health she shifts to **phase two**: the cistern water rises and her recovery shortens.
  She can only be hurt during recovery, so the fight is about reading the cast.
- The crypt gate sign in Market Lane shows progress (0/4 to 4/4). 2-4 returns to Cinderhaven,
  completes Area II and refreshes the merchant stock.
- The v2 coin total is now **79** across the tutorial, Area I and Area II (125 with Area III).

## V5 - Market Lane and the Sketchy Merchant

The street now continues past Gate II. Area I clears the barrier and opens **D2 Market Lane**: a
lamp-lit run of stalls with the merchant's green awning, a hanging trade sign, a second stall and the
town's warm windows. In stage 1 the lane is dark and empty behind the barricade; in stage 2 the
merchant is there.

Walk up and press **F** to trade. The shop uses the **gold purse** (`G` in the HUD), while the coin
count stays the lifetime tally.

| item | price | effect | stock | unlock |
|---|---|---|---|---|
| Ashroot Potion | 15g | +1 heart (refused at full) | 2 | always |
| Cleansing Flask | 20g | clears all hexes | 1 | always |
| Ember Shield | 35g | eats one hit | 1 | Area I cleared |
| Greater Heart | 40g | +2 hearts | 1 | Area I cleared |

- Stock is per visit; leaving and re-entering town refreshes it.
- Purchases spend gold, apply immediately, reduce stock and save.
- The **Ember Shield** is carried across scene loads (the HUD shows a shield icon) and is spent the
  first time it absorbs a hit.
- The slice compresses the full-game unlocks: both late items open after Area I. In the full v2 they
  will follow the Warden and Phase V.
- With 46 coins and no other spending, the player can afford a potion plus one big item, or save.

## V4 - the three encounters

**Road Scavenger (1-1).** A goblin with a sack that grabs loose coins. Get close and it bolts.
Killing it drops the sack where it falls; if it escapes the patrol it returns the coins to where
they were. The run tally can never be permanently lost.

**Cinder Crow (1-2).** Perched on the causeway. It flares its wings as a clear tell, then dives in a
straight line at the knight. Dodge the dive, then punish the recovery before it flies back.

**The Gatekeeper Brute (1-3).** The keep-roof boss: 8 HP, an overhead slam and a shoulder charge,
both telegraphed. The gate is sealed while he lives. A normal guard holds the hit; a **perfect
guard** against the charge stuns him for 1.5 s. He has a health bar and a wake banner; killing him
opens the gate and completes the area.

The 1-3 goblin has moved down to the steps so the roof is a clean boss arena.

## V3 - Area I in three levels

The old single Ember Road is now the three-level area from the design document:

| Level | Name | Shape |
|---|---|---|
| 1-1 | The Torchlit Ledge | The road in, the first gap, the wagon secret, a goblin and two bats |
| 1-2 | The Broken Causeway | The chasm, broken stones, two bats, the Keeper's Niche |
| 1-3 | The Keep Steps and Gate | Ascending steps, a goblin on the stairs, the Gatekeeper Brute, and the Warden's gate |

- **The Cook's Satchel** sits on a one-way wagon ledge above the first gap in 1-1: three coins and a
  heart. **The Keeper's Niche** is the optional upper route above the causeway in 1-2, marked by an
  abandoned banner: three coins and a heart.
- Levels auto-advance through per-level exits. 1-1 and 1-2 mark themselves cleared; 1-3 marks the
  area cleared and returns to Cinderhaven.
- `run.levels.I` tracks the three levels. Gate I resumes at the first uncleared level, and its town
  sign shows progress (0/3 to 3/3). After 1-3, the town wakes.
- Each level has its own checkpoint, collectibles, torches and exit. 1-3 ends with the Gatekeeper
  Brute; the gate is sealed until he falls.
- The v2 coin total is now **46** across the tutorial and the three Area I levels (79 with Area II).

## V2 - Cinderhaven

The hub is now a real place, not a placeholder street:

- **Two visual stages.** Stage 1 is cold and half-lit: a few windows, one lamp, heavy ash, the
  Market Lane barrier up. Clearing Area I moves the town to stage 2: every window lit, string
  lights, lamplight, warm awnings, fewer ash and rising gold embers, and the barrier gone.
- **The street grows.** The Market Lane barricade is a real solid in stage 1; after Area I it is
  removed, the Gate II sign reads OPEN, and the road continues.
- **District details.** The arrival gatehouse and Clint's perch, Ash Square's hearth/bench/sign,
  Patino's pot and steam, a notice board, three market stalls, lamps, crates, a broken castle on the
  horizon, chimney smoke, and the banner over the square.
- **Dialogue with portraits.** Clint and Patino have stage-specific lines. The first talk in each
  stage also shows the knight's reply (arrogant in stage 1, softened in stage 2). Conversations
  cycle, and the count is saved under `run.talked`.
- **Cinderhaven wakes.** Returning after Area I shows **THE TOWN IS WAKING** and relights the street.

## V1 — the tutorial lesson

The tutorial is now a ten-step lesson with one prompt at a time and a `TUTORIAL n/10` counter:

1. Move.
2. Jump the fence.
3. Coins and hearts.
4. Strike the straw dummy.
5. Light the cold torch (a real checkpoint).
6. Dash the gap (the dash is granted here).
7. Clear the road.
8. Guard the orb with **L**.
9. Perfect-parry the orb (press L just before impact).
10. The gate.

The **ward lesson is the gate**: the ward wakes once the road is clear (the goblin is dead) and fires
slow orbs while the player is near. It has three pips. A normal block chips one pip; three blocks
break it. A perfect parry reflects the orb into the ward and breaks it in one. Until it breaks, the
gate is visibly sealed and stepping into it shows **THE WARD SEALS THE GATE**. Breaking it shows
**THE WARD BREAKS** and the gate opens.

Other V1 feedback: `CHECKPOINT SET`, `BLOCKED`, `PERFECT PARRY`, the ward pips, a guard arc on the
knight, and an L keycap in the prompt bar when the lesson needs it.

## Run it

```powershell
python -m http.server 8000
```

Open **http://127.0.0.1:8000/v2.html**. (`npm start:v2` also opens it in Electron.)

```powershell
npm run test:v2   # headless slice checks
npm test          # the shipped 104-check suite; must stay green
```

## What V0 includes

- **Tutorial road:** the ten-step lesson above, with the checkpoint torch, dash grant, one goblin,
  the ward-gated exit, coins/hearts, and the gate into the hub.
- **Cinderhaven stage 1:** D0 Arrival + D1 Ash Square. Safe street, Clint the gargoyle, Patino's
  Hearth (heal + save), practice dummy, Gate I open, Gate II sealed.
- **Area I in three levels:** 1-1 The Torchlit Ledge, 1-2 The Broken Causeway, 1-3 The Keep Steps
  and Gate. The area gate resumes at the first uncleared level; 1-3 returns to the hub and marks the
  area cleared.
- **Save v2:** `emberknight.v2`, separate from `emberknight.v1`.
- **Import:** a v1 save with progress is imported once (gold, skin, ember sword, title, abilities,
  tutorial marked done). The v1 save is never modified.
- **Block / perfect parry:** hold **L** to guard. Press it just before an orb lands for a perfect
  parry: the orb reflects, sparks gold, and can break the training ward.

## Controls added

| Action | Key |
|---|---|
| Block | `L` |
| Everything else | same as v1 (`A/D`, `Space`, `J`, `Shift`, `E`, `F`, `Esc`) |

Blocking slows movement, drops the dash, and cannot be used while Heavy Hexed. Projectiles that hit
the guard are destroyed; a perfect parry reflects them. The Gatekeeper Brute's slam and charge can be
guarded too; a perfect guard on the charge stuns him.

## Flow

1. New browser → **title**. CONTINUE enters the current hub/tutorial; NEW GAME (with confirmation)
   starts the tutorial; CHAPTERS and CREDITS appear as the save unlocks them.
2. Tutorial gate → Cinderhaven, `tutorialDone = true`.
3. Gate I → 1-1 → 1-2 → 1-3 (the Gatekeeper Brute) → Cinderhaven, `cleared.I = true`. Gate I
   resumes at the first uncleared level if you return to town early.
4. Gate II opens into Market Lane; the Sketchy Merchant sells potions, the Ember Shield and the
   Greater Heart for gold. Continue through the lane to Gate II and the Sunken Crypt: 2-1 → 2-2 →
   2-3 (the Crypt Warden) → 2-4 (the Crypt Matron) → Cinderhaven, `cleared.II = true`.
5. Bell Plaza opens Gate III after Area II. Ring the tower bells: 3-1 → 3-2 → 3-3 (the Clapper
   Golem) → 3-4 (the Cracked Carillon) → Cinderhaven, `cleared.III = true`.
6. The Throne Approach opens Gate IV after Area III: 4-1 → 4-2 → 4-3 → 4-4 (the Fallen Royal
   Guard) → 4-5 (the Ash Warden) → Cinderhaven, `cleared.IV = true`.
7. The Garden Steps open Gate V after Area IV: 5-1 (find the Ember Lantern) → 5-2 → 5-3 (the
   Gardener Golem) → 5-4 (Mother Blight) → Cinderhaven, `cleared.V = true`.
8. Forge Row opens Gate VI after Area V: 6-1 → 6-2 → 6-3 (the Slag Foreman) on the rising tide →
   Cinderhaven, `cleared.VI = true`.
9. Archive Steps open Gate VII after Area VI: 7-1 → 7-2 → 7-3 (the Lampless Curator and the Margin
   Note) → Cinderhaven, `cleared.VII = true`. Gate VIII opens.
10. 8-1 → 8-2 → 8-3 (the Ash King, three phases) → the **ending sequence and credits** → Cinderhaven
    S5, `cleared.VIII = true`, `ending = true`. Enter advances/skips; Esc leaves.
11. The **title** is reachable from the pause menu. CHAPTERS replays any cleared area (or the hub)
    with progress kept; CREDITS rewinds the ending.
12. `Esc` → pause. The tutorial can be skipped; the hub can replay the tutorial; an area can return
    to the hub.

## Deliberately deferred

- V1 done: the ten-step tutorial, the checkpoint torch, and the ward-gated exit.
- V2 done: stage lighting, the Market Lane barrier, the rebuilt street and the full Clint/Patino
  conversations.
- V3 done: the three Ember Road levels, per-level exits, the Cook's Satchel and the Keeper's Niche.
- V4 done: the Road Scavenger, Cinder Crow and Gatekeeper Brute, plus the sealed keep gate.
- V5 done: Market Lane, the merchant shop, gold/stock tuning and shield persistence.
- V6 done: the four Sunken Crypt levels, water, sinking stones, Mire Leech, Wick Skull, Crypt Warden
  and Crypt Matron, plus the Area II gate and progression.
- V7 done: Bell Plaza, the four Bell Tower levels, bell switches and lifts, the Peal Wraith, Clapper
  Golem and Cracked Carillon.
- V8 done: the Throne Approach, the five Throne levels, the Royal Revenant, the Fallen Royal Guard
  and the Ash Warden, plus the Captain/Warden death lines.
- V9 done: the Garden Steps, the four Ashen Gardens levels, the Ember Lantern, thorn walls, the Ash
  Bloom, Thorn Creeper, Gardener Golem, Mother Blight and Patino's Herb Patch.
- V10 done: the Forge Row, the three Drowned Forge climbs, the vertical camera and ember tide, Slag
  Smith, Rust Wisp, chain lifts and the Slag Foreman.
- V11 done: Archive Steps, the three Silent Archive levels, darkness/light bridges, cold bowls, the
  Page Moth, Stack Sentinel, Hexer orb integration, the Lampless Curator, the merchant, the Trapped
  Spirit and the Margin Note.
- V12 done: Gate VIII, the three Ember Heart levels, Ward Echoes, the Ash King's three phases, the
  First Hearth secret and the first ending card.
- V13 done: hub stages S1–S5, the district NPCs (Aldrin/Daryl, the Guard and Captain's Seal,
  Theodore and the Spectacles, Zafra, the S5 villagers), the eight-item merchant, the full
  cinematic/credits, the title menu and chapter/credits replay. **The v2 campaign is complete.**
- Beyond the slice: personal credits names (on hold), a boss rush, rooftop secrets above Market Lane
  and Garden Steps, leaderboards, and further merchant stock.

## Known placeholders

- The hub uses the road backdrop plus town silhouettes; it is not the final art.
- The title screen uses a procedural ember sigil; there is no external key art.
- Credits use in-game roles, areas and cast names. Personal names are on hold.
- The v2 slice uses a compressed milestone unlock map for the shop rather than the full game's later
  schedule.
