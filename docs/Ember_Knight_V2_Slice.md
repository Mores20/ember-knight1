# Ember Knight - V2 Vertical Slice (V0 + V1 + V2 + V3 + V4 + V5)

A separate branch (`v2-vertical-slice`) proving the shape of the world-design document:
**tutorial road → Cinderhaven → Area I → back to Cinderhaven**. The shipped v1 game on `main`
is untouched.

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
- The v2 coin total is now **46** across the tutorial and the three area levels.

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

1. New browser with no save → tutorial.
2. Tutorial gate → Cinderhaven, `tutorialDone = true`.
3. Gate I → 1-1 → 1-2 → 1-3 (the Gatekeeper Brute) → Cinderhaven, `cleared.I = true`. Gate I
   resumes at the first uncleared level if you return to town early.
4. Gate II opens into Market Lane; the Sketchy Merchant sells potions, the Ember Shield and the
   Greater Heart for gold.
5. `Esc` → pause. The tutorial can be skipped; the hub can replay the tutorial; an area can return
   to the hub.

## Deliberately deferred

- V1 done: the ten-step tutorial, the checkpoint torch, and the ward-gated exit.
- V2 done: stage lighting, the Market Lane barrier, the rebuilt street and the full Clint/Patino
  conversations.
- V3 done: the three Ember Road levels, per-level exits, the Cook's Satchel and the Keeper's Niche.
- V4 done: the Road Scavenger, Cinder Crow and Gatekeeper Brute, plus the sealed keep gate.
- V5 done: Market Lane, the merchant shop, gold/stock tuning and shield persistence.
- Beyond the slice: the other seven areas, hub rooftops, district stages S3-S5 and the full unlock
  map for the shop.

## Known placeholders

- The hub uses the road backdrop plus town silhouettes; it is not the final art.
- There is no title menu yet: the build boots into the tutorial or the imported hub.
- The full game's later shop unlocks (Warden / Phase V) are compressed to Area I in the slice.
