# Ember Knight — V2 Vertical Slice (V0 + V1)

A separate branch (`v2-vertical-slice`) proving the shape of the world-design document:
**tutorial road → Cinderhaven → Area I → back to Cinderhaven**. The shipped v1 game on `main`
is untouched.

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
- **Area I placeholder:** the shipped Ember Road, re-homed as Area I until V3 splits it into
  1-1/1-2/1-3. Its gate returns to the hub and marks Area I cleared.
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
the guard are destroyed; a perfect parry reflects them. Melee contact damage is not yet blocked —
that lands with the Brute in V4.

## Flow

1. New browser with no save → tutorial.
2. Tutorial gate → Cinderhaven, `tutorialDone = true`.
3. Gate I → Area I; the Area I gate → Cinderhaven, `cleared.I = true`.
4. Gate II then says the market lane is open (the merchant arrives in V5).
5. `Esc` → pause. The tutorial can be skipped; the hub can replay the tutorial; an area can return
   to the hub.

## Deliberately deferred

- V1 done: the ten-step tutorial, the checkpoint torch, and the ward-gated exit.
- V2: hub visual pass, full Clint/Patino dialogue, district lighting.
- V3: split Area I into 1-1/1-2/1-3, including the wagon secret and per-level exits.
- V4: Road Scavenger (steals, drops, never permanently loses coins), Cinder Crow, Gatekeeper Brute.
- V5: D2 Market Lane, merchant payoff, tuning, screenshots, docs.

## Known placeholders

- Area I is still the shipped Ember Road (merchant removed, but the level is otherwise v1).
- The hub uses the road backdrop plus simple town silhouettes; it is not the final art.
- There is no title menu yet: the build boots into the tutorial or the imported hub.
- Enemy placements in Area I are the v1 placements, not the final 1-1/1-2/1-3 split.
