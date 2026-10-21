// All level data lives here. Coordinates: x right, y down; ground top is y=420.
// title    = name shown on the intro card
// w/h      = world size; h doubles as the fall-death line
// vscroll  = the camera may climb (Bell Tower); horizontal levels keep camY pinned to 0
// darkZones= [x0, x1] stretches lit only by torches (Sunken Crypt)
// hazards  = damage + respawn volumes (ember spikes)
// lights   = [x, y, r] ambient embers — footholds you can find in the dark
// torches  = [x, y] pairs (always lit) or { x, y, lit, cp } — cp torches are checkpoints once lit
// enemies  = { type: 'goblin' | 'bat' | 'shield', ... } — see enemies.js
// solids   = static, plus { kind: 'crumble' } and { kind: 'move', x0, y0, ax, ay, sp, ph }

const PHASE1 = {
  title: 'EMBER KNIGHT',
  style: 'road',
  name: 'THE EMBER ROAD',
  line: 'The last torch on the road still burns. Follow it.',
  spawn: [80, 386],
  w: 3400, h: 640,
  vscroll: false,
  darkZones: [],
  lights: [],
  hazards: [],
  solids: [
    { x: -240, y: -200, w: 40, h: 900 },                      // left wall
    { x: -200, y: 420, w: 1400, h: 200 },                     // 1+2: ledge and patrol ground
    { x: 1350, y: 420, w: 110, h: 26, broken: 1 },            // 3: the chasm
    { x: 1580, y: 385, w: 90, h: 26, broken: 1 },
    { x: 1790, y: 345, w: 90, h: 26, broken: 1 },
    { x: 1990, y: 385, w: 90, h: 26, broken: 1 },
    { x: 2210, y: 420, w: 1300, h: 200 },                     // 4: the keep
    { x: 2480, y: 380, w: 100, h: 160 }, { x: 2580, y: 340, w: 100, h: 200 },
    { x: 2680, y: 300, w: 100, h: 240 }, { x: 2780, y: 260, w: 470, h: 280 },
    { x: 3250, y: -200, w: 40, h: 800 },                      // keep wall
  ],
  torches: [[150, 420], [560, 420], [1000, 420], [1390, 420], [2300, 420], [2820, 260], [3090, 260], [3210, 260]],
  coins: [[300, 380], [345, 380], [390, 380], [1230, 330], [1270, 310], [1310, 330],
          [1705, 290], [1735, 275], [1765, 290], [1720, 318], [1752, 318],     // risky cluster
          [2530, 340], [2630, 300], [2730, 260], [2900, 215]],
  hearts: [[470, 385]],
  enemies: [
    { type: 'goblin', x: 900, y: 390, x0: 820, x1: 1140, hp: 1 },
    { type: 'goblin', x: 2900, y: 230, x0: 2830, x1: 3070, hp: 2 },
    { type: 'bat', x0: 350, x1: 700, y0: 230, ay: 25, sp: .5, ph: 0 },
    { type: 'bat', x0: 1520, x1: 1960, y0: 230, ay: 110, sp: 1.3, ph: 0 },
    { type: 'bat', x0: 1620, x1: 2060, y0: 240, ay: 100, sp: 1.3, ph: 3.14 },
  ],
  gate: { x: 3110, y: 170, w: 80, h: 90 },
  cps: [[80, 420], [1150, 420], [2260, 420]],                 // respawn points
};

const PHASE2 = {
  title: 'THE SUNKEN CRYPT',
  style: 'crypt',
  name: 'THE SUNKEN CRYPT',
  line: 'The fallen knights kept their embers. Light them.',
  spawn: [80, 386],
  w: 3600, h: 640,
  vscroll: false,
  hint: 'Cold torches wake to your blade \u2014 every flame is a place you return to.',
  darkZones: [[1150, 2150], [2330, 3140]],                    // the chasm, then the shielded hall
  lights: [[1320, 394, 120], [1500, 374, 120], [1660, 354, 120], [1820, 374, 120], [1980, 394, 120]],
  hazards: [
    { type: 'spike', x: 820, y: 404, w: 90, h: 16 },          // first jump-over, in torchlight
    { type: 'spike', x: 2720, y: 404, w: 60, h: 16 },         // between the two shield patrols
  ],
  solids: [
    { x: -240, y: -200, w: 40, h: 900 },
    { x: -200, y: 420, w: 1400, h: 200 },                     // entry hall
    { x: 1270, y: 400, w: 100, h: 16 },                       // the dark chasm
    { kind: 'crumble', x: 1450, y: 380, w: 100, h: 16 },
    { x: 1610, y: 360, w: 100, h: 16 },
    { kind: 'crumble', x: 1770, y: 380, w: 100, h: 16 },
    { x: 1930, y: 400, w: 100, h: 16 },
    { x: 2100, y: 420, w: 1320, h: 200 },                     // far landing + shielded hall
    { x: 3420, y: -200, w: 40, h: 800 },
  ],
  torches: [
    { x: 170, y: 420, lit: 1 },                               // safe light at the entrance
    { x: 620, y: 420, lit: 0, cp: 1 },                        // first sword-lit checkpoint
    { x: 1120, y: 420, lit: 1 },                              // brink of the chasm
    { x: 2140, y: 420, lit: 1 },                              // far side: breathing room
    { x: 2320, y: 420, lit: 0, cp: 1 },                       // entrance to the dark hall
    { x: 3120, y: 420, lit: 0, cp: 1 },                       // exit of the hall — the reward
    { x: 3260, y: 420, lit: 1 },                              // last light before the gate
  ],
  coins: [[300, 380], [360, 380], [420, 380],
          [980, 330], [1020, 310], [1060, 330],
          [1320, 350], [1480, 330], [1640, 310], [1800, 330], [1960, 350],   // over the chasm
          [2250, 380], [2950, 380],
          [3000, 300], [3100, 360]],
  hearts: [[520, 385], [2220, 385]],                          // before each new threat
  enemies: [
    { type: 'shield', x: 2500, y: 388, x0: 2440, x1: 2640, hp: 2 },
    { type: 'shield', x: 2920, y: 388, x0: 2880, x1: 3080, hp: 2 },
    { type: 'goblin', x: 3190, y: 390, x0: 3160, x1: 3220, hp: 1 },
    { type: 'bat', x0: 1240, x1: 1620, y0: 250, ay: 55, sp: 1.0, ph: 0 },    // phase 1 timing,
    { type: 'bat', x0: 1520, x1: 1980, y0: 235, ay: 95, sp: 1.25, ph: 2.2 }, // now in the dark
    { type: 'bat', x0: 1300, x1: 1780, y0: 225, ay: 40, sp: .65, ph: 4.1 },
  ],
  gate: { x: 3300, y: 330, w: 80, h: 90 },
  cps: [[80, 420], [2150, 420]],
};

// The Bell Tower: a vertical climb. vscroll lets the camera follow the knight up,
// so checkpoints are chosen by height rather than by x (see loadLevel/update).
const PHASE3 = {
  title: 'THE BELL TOWER',
  style: 'tower',
  name: 'THE BELL TOWER',
  line: 'The bell has been silent since the ash came. Climb.',
  spawn: [150, 2266],
  w: 2200, h: 2400,
  vscroll: true,
  hint: 'Climb to the bell \u2014 a gift waits on the wide ledge.',
  darkZones: [],
  lights: [],
  hazards: [],
  solids: [
    { x: 0, y: 0, w: 40, h: 2400 },                            // tower walls
    { x: 2160, y: 0, w: 40, h: 2400 },
    { x: 60, y: 2300, w: 420, h: 24 },                         // 1: the base
    { x: 560, y: 2220, w: 150, h: 18 },
    { x: 680, y: 2140, w: 150, h: 18 },
    { x: 800, y: 2060, w: 150, h: 18 },
    { x: 950, y: 1980, w: 400, h: 20 },                        // landing A
    { kind: 'move', x0: 560, y0: 1900, w: 130, h: 18, ax: 170, ay: 0, sp: 1.6, ph: 0 },   // 2: shuttle
    { x: 180, y: 1820, w: 280, h: 20 },                        // landing B
    { kind: 'move', x0: 520, y0: 1700, w: 120, h: 18, ax: 0, ay: 100, sp: 1.7, ph: 1.57 },// the lift
    { x: 700, y: 1600, w: 350, h: 20 },                        // 3: dash ledge C (safe, open sky above)
    { x: 1020, y: 1690, w: 250, h: 18 },                       // 4: practice safety floor
    { x: 1250, y: 1600, w: 300, h: 20 },                       // landing D
    { x: 1850, y: 1600, w: 300, h: 20 },                       // 5: landing E (300px gap)
    { x: 2000, y: 1520, w: 150, h: 18 },                       // 6: the switchback climb
    { x: 1940, y: 1440, w: 150, h: 18 },
    { x: 1880, y: 1360, w: 150, h: 18 },                       // S3: high checkpoint
    { x: 1330, y: 1360, w: 250, h: 20 },                       // 7: landing F (second 300px gap)
    { kind: 'move', x0: 1000, y0: 1280, w: 130, h: 18, ax: 150, ay: 0, sp: 1.6, ph: 2.4 },// 8: shuttle 2
    { x: 600, y: 1200, w: 300, h: 20 },                        // shield ledge G
    { x: 950, y: 1120, w: 160, h: 18 },                        // P5
    { x: 750, y: 1040, w: 160, h: 18 },                        // P6
    { x: 300, y: 960, w: 400, h: 20 },                         // 9: the bell landing
  ],
  torches: [
    { x: 120, y: 2300, lit: 1 },
    { x: 1100, y: 1980, lit: 1 },                             // landing A light
    { x: 990, y: 1980, lit: 0, cp: 1 },
    { x: 220, y: 1820, lit: 1 },                              // landing B light
    { x: 740, y: 1600, lit: 0, cp: 1 },                       // dash ledge checkpoint
    { x: 1900, y: 1360, lit: 0, cp: 1 },                      // high checkpoint on the switchback
    { x: 1930, y: 1600, lit: 1 },                             // landing E light
    { x: 680, y: 1200, lit: 1 },                              // shield ledge light
    { x: 440, y: 960, lit: 1 },                               // the bell
  ],
  coins: [[220, 2260], [380, 2260],
          [700, 2080], [860, 2000],
          [1100, 1940], [1300, 1940],
          [820, 1560], [1000, 1540],                          // dash line on the ledge
          [1120, 1520], [1210, 1500],                         // practice gap
          [1350, 1560],
          [1650, 1480], [1770, 1470],                         // the required gap
          [1930, 1560], [2070, 1560],
          [1620, 1320], [1680, 1310],                         // swarm 2
          [700, 1160], [820, 1160],
          [1000, 1080]],

  hearts: [[300, 2265], [1400, 1565], [1920, 1565]],          // before each new threat
  enemies: [
    { type: 'bat', x0: 620, x1: 900, y0: 2110, ay: 45, sp: 1.1, ph: 0 },     // swarm 1 over the climb
    { type: 'bat', x0: 760, x1: 1060, y0: 2160, ay: 55, sp: .85, ph: 2.1 },
    { type: 'bat', x0: 600, x1: 880, y0: 2060, ay: 40, sp: 1.2, ph: 4.0 },
    { type: 'bat', x0: 1440, x1: 1690, y0: 1300, ay: 35, sp: 1.1, ph: .6 },   // swarm 2 over the gap
    { type: 'bat', x0: 1460, x1: 1670, y0: 1320, ay: 50, sp: .9, ph: 2.4 },
    { type: 'bat', x0: 1420, x1: 1710, y0: 1270, ay: 30, sp: 1.3, ph: 4.1 },
    { type: 'shield', x: 700, y: 1168, x0: 620, x1: 800, hp: 2 },             // guard duty on the ledge
  ],
  sigil: { x: 900, y: 1470 },                                 // the ember dash, earned here
  bell: true,                                                 // the tower's name hangs over its door
  gate: { x: 460, y: 870, w: 90, h: 90 },
  cps: [[150, 2300]],
};

// The Throne: one long room, no pits. The Ash Warden guards the door, so the
// only way out is through him. Orange tells you what he is about to do.
const PHASE4 = {
  title: 'THE THRONE',
  style: 'throne',
  name: 'THE THRONE',
  line: 'The Warden guarded the Hearth to keep the flame out. Only the flame can pass.',
  spawn: [120, 386],
  w: 2400, h: 540,
  vscroll: false,
  hint: 'Orange means danger \u2014 swing into his spikes to send them back.',
  darkZones: [],
  lights: [],
  hazards: [],
  solids: [
    { x: 0, y: 0, w: 40, h: 540 },                              // hall walls
    { x: 2360, y: 0, w: 40, h: 540 },
    { x: 0, y: 420, w: 2400, h: 120 },                          // the floor
    { x: 620, y: 330, w: 140, h: 18 },                          // a dais on the way in
  ],
  torches: [
    { x: 150, y: 420, lit: 1 },
    { x: 520, y: 420, lit: 1 },
    { x: 1050, y: 420, lit: 1 },
    { x: 1520, y: 420, lit: 1 },                                // arena brazier
    { x: 2180, y: 420, lit: 1 },                                // beside the throne
  ],
  coins: [[300, 385], [380, 385], [700, 340], [820, 340],
          [980, 385], [1100, 385],
          [1260, 385], [1340, 385], [1440, 385],
          [1700, 385], [1800, 385], [2040, 385],
          [2260, 385], [2320, 385]],
  hearts: [[1150, 385]],                                        // one heart, right before the fight
  enemies: [
    { type: 'bat', x0: 560, x1: 820, y0: 300, ay: 40, sp: 1.1, ph: 0 },
    { type: 'bat', x0: 700, x1: 940, y0: 330, ay: 50, sp: .9, ph: 2.2 },
    { type: 'goblin', x: 940, y: 390, x0: 880, x1: 1040, hp: 1 },
  ],
  boss: { x: 1900, y: 344, wake: 1350, hp: 16 },               // the Ash Warden
  throne: { x: 2120, y: 300, w: 120, h: 120 },
  gate: { x: 2260, y: 330, w: 90, h: 90 },
  cps: [[120, 420], [1180, 420]],
};

// Phase V: the breather after the Warden. Wide ground, wind shoves you around, archers teach
// the arrow parry, wisps keep you moving, and the Ember Lantern is earned on the safe ledge.
const PHASE5 = {
  title: 'THE ASHEN GARDENS',
  style: 'ash',
  theme: 4,
  name: 'THE ASHEN GARDENS',
  line: 'Ash falls like snow. Something is still growing here.',
  spawn: [80, 386],
  w: 3000, h: 540,
  vscroll: false,
  hint: 'E throws a spark of light. The ash wind carries it \u2014 and you.',
  darkZones: [],
  lights: [],
  hazards: [],
  solids: [
    { x: -240, y: -200, w: 40, h: 900 },                        // garden walls
    { x: 3000, y: -200, w: 40, h: 900 },
    { x: 0, y: 420, w: 900, h: 120 },                           // ground
    { x: 1050, y: 420, w: 420, h: 120 },
    { x: 1620, y: 420, w: 420, h: 120 },
    { x: 2190, y: 420, w: 810, h: 120 },
    { x: 640, y: 330, w: 170, h: 18 },                          // archer perch
    { x: 1240, y: 320, w: 240, h: 18 },                         // the safe ledge (lantern)
    { x: 1800, y: 340, w: 170, h: 18 },                         // archer perch
    { x: 2350, y: 330, w: 190, h: 18 },
  ],
  torches: [
    { x: 300, y: 420, lit: 0, cp: 1 },
    { x: 760, y: 420, lit: 1 },
    { x: 1320, y: 320, lit: 0, cp: 1 },
    { x: 2450, y: 420, lit: 0, cp: 1 },
    { x: 2920, y: 420, lit: 1 },
  ],
  coins: [[220, 385], [360, 385], [560, 385], [700, 295], [840, 385],
          [1120, 385], [1270, 285], [1430, 285], [1460, 385],
          [1700, 385], [1830, 305], [1980, 385],
          [2260, 385], [2420, 295], [2560, 385], [2740, 385], [2830, 385], [2860, 330]],
  hearts: [[520, 385], [1290, 285], [2200, 385]],
  enemies: [
    { type: 'archer', x: 690, y: 298, hp: 2 },
    { type: 'archer', x: 1840, y: 308, hp: 2 },
    { type: 'wisp', x: 940, y: 290 },
    { type: 'wisp', x: 1520, y: 250 },
    { type: 'wisp', x: 2080, y: 310 },
  ],
  wind: [
    { x: 860, w: 620, dir: 1, on: 2.2, off: 3.2, force: 105, ph: 0 },
    { x: 1480, w: 620, dir: -1, on: 2.2, off: 3.2, force: 105, ph: 2.7 },
  ],
  lantern: { x: 1380, y: 250 },                                // the Ember Lantern, earned here
  gate: { x: 2880, y: 330, w: 90, h: 90 },
  cps: [[80, 420], [2200, 420]],
};

// Phase VI: a climb against a rising ember tide. Pressure only - it never chases faster than you
// can climb, but standing still is death. Checkpoints are the safety net; death resets the tide.
const PHASE6 = {
  title: 'THE DROWNED FORGE',
  style: 'forge',
  theme: 5,
  name: 'THE DROWNED FORGE',
  line: 'This is where the flame was drowned in iron.',
  spawn: [200, 2266],
  w: 2200, h: 2400,
  vscroll: true,
  hint: 'The tide does not stop. Climb.',
  darkZones: [],
  lights: [],
  hazards: [],
  tide: { y0: 2330, speed: 26 },
  solids: [
    { x: 0, y: 0, w: 40, h: 2400 },                             // forge walls
    { x: 2160, y: 0, w: 40, h: 2400 },
    { x: 140, y: 2300, w: 520, h: 24 },                         // the quench floor
    { x: 700, y: 2220, w: 160, h: 18 },
    { x: 520, y: 2140, w: 170, h: 18 },
    { x: 300, y: 2060, w: 200, h: 18 },                         // crawler shelf
    { x: 560, y: 1980, w: 200, h: 18 },
    { kind: 'move', x0: 780, y0: 1900, w: 140, h: 18, ax: 150, ay: 0, sp: 1.5, ph: 0 },   // shuttle
    { x: 1000, y: 1820, w: 260, h: 20 },                        // landing, first checkpoint
    { kind: 'move', x0: 1000, y0: 1700, w: 130, h: 18, ax: 0, ay: 110, sp: 1.6, ph: 1.57 }, // lift
    { x: 1200, y: 1600, w: 300, h: 20 },                        // the long shelf
    { x: 1800, y: 1600, w: 300, h: 20 },                        // 300px dash gap
    { x: 1950, y: 1520, w: 150, h: 18 },
    { kind: 'move', x0: 1650, y0: 1440, w: 140, h: 18, ax: 150, ay: 0, sp: 1.5, ph: 2.4 },
    { x: 1300, y: 1360, w: 220, h: 20 },
    { x: 1130, y: 1280, w: 170, h: 18 },
    { x: 800, y: 1200, w: 350, h: 20 },                         // the floodgate landing
  ],
  torches: [
    { x: 220, y: 2300, lit: 1 },
    { x: 1040, y: 1820, lit: 0, cp: 1 },
    { x: 1240, y: 1600, lit: 0, cp: 1 },
    { x: 1840, y: 1600, lit: 0, cp: 1 },
    { x: 2020, y: 1600, lit: 1 },
    { x: 860, y: 1200, lit: 1 },
  ],
  coins: [[300, 2260], [520, 2260], [760, 2180], [600, 2100],
          [380, 2020], [640, 1940], [900, 1860],
          [1100, 1780], [1180, 1560], [1320, 1560],
          [1900, 1560], [2040, 1480], [1500, 1320],
          [1400, 1320], [900, 1160], [1000, 1160]],
  hearts: [[900, 1785], [1360, 1555], [1180, 1235]],
  enemies: [
    { type: 'crawler', x: 330, y: 2040, x0: 310, x1: 470, hp: 2 },
    { type: 'crawler', x: 1870, y: 1580, x0: 1830, x1: 2050, hp: 2 },
    { type: 'bat', x0: 900, x1: 1250, y0: 1720, ay: 50, sp: 1.1, ph: 0 },
    { type: 'bat', x0: 1150, x1: 1500, y0: 1460, ay: 45, sp: 1.2, ph: 2.2 },
  ],
  gate: { x: 1000, y: 1110, w: 90, h: 90 },
  cps: [[200, 2300]],
};

// Phase VII: the reveal. Full darkness, bridges that only exist inside light, a bowl switch that
// locks a span solid for good, and Shades that are only solid inside light.
const PHASE7 = {
  title: 'THE SILENT ARCHIVE',
  style: 'archive',
  theme: 6,
  name: 'THE SILENT ARCHIVE',
  line: 'The King wrote it all down: he never meant to smother it.',
  reveal: 'His hand is on every page. He was trying to save it.',
  spawn: [80, 386],
  w: 2600, h: 640,
  vscroll: false,
  hint: 'Light makes the floor real. E throws a spark; a swing lights a bowl.',
  darkZones: [[0, 2600]],
  lights: [],
  hazards: [],
  solids: [
    { x: -240, y: -200, w: 40, h: 900 },
    { x: 2560, y: -200, w: 40, h: 900 },
    { x: 60, y: 420, w: 700, h: 120 },
    { x: 1040, y: 420, w: 380, h: 120 },
    { x: 1760, y: 420, w: 380, h: 120 },
    { x: 2360, y: 420, w: 200, h: 120 },
    { x: 1100, y: 320, w: 160, h: 18 },                         // a reading ledge
    { x: 800, y: 380, w: 180, h: 16, litOnly: 1 },              // bridge A: lantern only
    { x: 1480, y: 380, w: 220, h: 16, litOnly: 1 },             // bridge B: lantern only
    { x: 2160, y: 340, w: 180, h: 16, litOnly: 1, group: 'a' }, // bridge C: the switch locks it solid
  ],
  switches: [{ x: 1120, y: 420, group: 'a' }],
  torches: [
    { x: 200, y: 420, lit: 0, cp: 1 },
    { x: 620, y: 420, lit: 1 },
    { x: 1160, y: 420, lit: 0, cp: 1 },
    { x: 1900, y: 420, lit: 0, cp: 1 },
    { x: 2250, y: 420, lit: 1 },
    { x: 2430, y: 420, lit: 1 },
  ],
  coins: [[300, 385], [460, 385], [700, 385], [860, 340], [1120, 285],
          [1230, 285], [1250, 385], [1400, 385], [1560, 340], [1680, 340],
          [1830, 385], [2000, 385], [2200, 300], [2300, 300],
          [2400, 385], [2480, 385]],
  hearts: [[560, 385], [1300, 385], [2400, 385]],
  enemies: [
    { type: 'shade', x: 1200, y: 388, x0: 1120, x1: 1300, hp: 2 },
    { type: 'shade', x: 1900, y: 388, x0: 1800, x1: 2050, hp: 2 },
    { type: 'shade', x: 2440, y: 388, x0: 2380, x1: 2520, hp: 2 },
    { type: 'bat', x0: 900, x1: 1200, y0: 250, ay: 40, sp: 1.1, ph: 0 },
    { type: 'bat', x0: 1500, x1: 1800, y0: 230, ay: 45, sp: 1.2, ph: 2.4 },
  ],
  gate: { x: 2420, y: 330, w: 90, h: 90 },
  cps: [[80, 420], [1100, 420]],
};

// Phase VIII: the Ash King. Three phases, adds in the second, darkness in the third.
const PHASE8 = {
  title: 'THE EMBER HEART',
  style: 'heart',
  theme: 7,
  name: 'THE EMBER HEART',
  line: 'A flame kept is a flame lost. Share it.',
  spawn: [120, 386],
  w: 1600, h: 540,
  vscroll: false,
  hint: 'The Ash King. Orange means he is about to strike.',
  darkZones: [],
  lights: [],
  hazards: [],
  solids: [
    { x: -240, y: -200, w: 40, h: 900 },
    { x: 1560, y: -200, w: 40, h: 900 },
    { x: 0, y: 420, w: 1600, h: 120 },
    { x: 250, y: 330, w: 150, h: 18 },
    { x: 1180, y: 330, w: 150, h: 18 },
  ],
  torches: [
    { x: 100, y: 420, lit: 1 },
    { x: 1480, y: 420, lit: 1 },
  ],
  coins: [[190, 385], [240, 385], [420, 385], [520, 385], [700, 385],
          [900, 385], [1100, 385], [1300, 385], [1450, 385], [1520, 385]],
  hearts: [[230, 385]],                                        // one heart, right before the throne
  enemies: [],
  king: { x: 1080, y: 328, wake: 640, hp: 24 },
  gate: { x: 1420, y: 330, w: 90, h: 90 },
  cps: [[120, 420], [260, 420]],
};

export const LEVELS = [PHASE1, PHASE2, PHASE3, PHASE4, PHASE5, PHASE6, PHASE7, PHASE8];
export const TOTAL_COINS = LEVELS.reduce((n, l) => n + l.coins.length, 0);
