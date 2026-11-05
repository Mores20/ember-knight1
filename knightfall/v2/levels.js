// v2 vertical slice: the tutorial road, Cinderhaven's first stage, and Area I
// split into 1-1 / 1-2 / 1-3. The Keepgate Brute arrives in V4.
const wallL = { x: -240, y: -200, w: 40, h: 900 };
const wallR = (w, h = 900) => ({ x: w, y: -200, w: 40, h });

export const TUTORIAL = {
  kind: 'tutorial',
  title: 'THE ROAD TO THE ASH KINGDOM',
  name: 'THE ROAD',
  style: 'road', theme: 0,
  line: 'They say no one returns from the Ash Kingdom. They haven\u2019t met me yet.',
  spawn: [80, 386],
  w: 1940, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 1320, h: 220 },                    // road up to the dash gap
    { x: 1300, y: 420, w: 640, h: 220 },                      // far side
    { x: 430, y: 368, w: 36, h: 52 },                         // the low fence
    { x: 1900, y: -200, w: 40, h: 800 },                      // the city wall
  ],
  torches: [[150, 420], [560, 420], { x: 950, y: 420, lit: 0, cp: 1 }, [1400, 420], [1760, 420]],
  coins: [[300, 385], [340, 385], [380, 385],
          [700, 385], [740, 385],
          [1160, 330], [1200, 305], [1240, 330],              // over the dash gap
          [1380, 385], [1420, 385]],
  hearts: [[880, 385]],
  enemies: [{ type: 'goblin', x: 1380, y: 390, x0: 1320, x1: 1500, hp: 1 }],
  props: [
    { type: 'bones', x: 220, y: 420 },
    { type: 'cart', x: 980, y: 420 },
    { type: 'grave', x: 1600, y: 420 },
    { type: 'banner', x: 1880, y: 110, h: 190 },
  ],
  dummy: { x: 820, y: 420 },
  ward: { x: 1700, y: 330, range: 200, cool: 1.6, hp: 3 },
  steps: [
    { id: 'move', at: 0, text: 'A / D  or  \u2190 / \u2192  \u2014 move' },
    { id: 'jump', at: 140, text: 'SPACE  \u2014 jump. Hold it for height.' },
    { id: 'coins', at: 520, text: 'Coins fill the purse. Hearts heal. They will matter in town.' },
    { id: 'sword', at: 760, text: 'J  \u2014 swing. Strike the straw dummy.' },
    { id: 'checkpoint', at: 900, text: 'Swing the cold torch \u2014 that is where you return.',
      done: g => g.l.torches.some(t => t.cp && t.lit) },
    { id: 'dash', at: 1060, text: 'SHIFT  \u2014 dash across the gap. One surge per jump.' },
    { id: 'combat', at: 1310, text: 'Clear the road.', hold: true, done: g => g.kills > 0 },
    { id: 'block', at: 1500, text: 'L  \u2014 guard the orb.', key: 'L', hold: true,
      done: g => g.wardBlocks > 0 },
    { id: 'parry', at: 0, text: 'Press L just before impact \u2014 a perfect parry sends it back.', key: 'L', hold: true,
      done: g => g.wardHp <= 0 },
    { id: 'gate', at: 0, text: 'The gate is open. Cinderhaven awaits.' },
  ],
  grants: [{ x: 950, abil: 'dash', text: 'EMBER DASH' }],
  grants: [{ x: 1010, abil: 'dash', text: 'EMBER DASH' }],
  exit: { x: 1810, y: 330, w: 60, h: 90, to: 'hub', tutorial: true },
  gate: { x: 1810, y: 330, w: 80, h: 90 },
  cps: [[80, 420], [900, 420], [1320, 420]],
};

export const HUB = {
  kind: 'hub',
  title: 'CINDERHAVEN',
  name: 'ASH SQUARE',
  style: 'road', theme: 0,
  line: 'The one place nothing is trying to kill you.',
  spawn: [80, 386],
  w: 3300, h: 540,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: 0, y: 420, w: 3300, h: 120 },                         // the street, through Market Lane to Bell Plaza
    wallR(3300),
  ],
  torches: [[180, 420], [980, 420], [1360, 420], [2600, 420], [3050, 420]],
  coins: [], hearts: [], enemies: [],
  props: [
    { type: 'banner', x: 560, y: 150, h: 190 },
    { type: 'cart', x: 1040, y: 420 },
    { type: 'statue', x: 1200, y: 420 },
    { type: 'rubble', x: 1650, y: 420 },
    { type: 'banner', x: 2750, y: 110, h: 200 },
    { type: 'statue', x: 2950, y: 420 },
    { type: 'rubble', x: 3120, y: 420 },
  ],
  hub: {
    hearth: { x: 420, y: 420 },
    dummy: { x: 700, y: 420 },
    barrier: { x: 1620, y: 250, w: 120, h: 170 },
    market: { merchant: { x: 1980, y: 420 } },
    npcs: [
      { id: 'clint', name: 'CLINT', x: 140, y: 420,
        lines: {
          1: ['Oh good, another hero. Ash is that way. Dying is that way too.',
              'The gate opens when the road is clear. It has opinions about who clears it.'],
          2: ['Still alive? Huh. Fine. Tip: parry the big ones. Dodging is for cowards. And me.',
              'The town\u2019s waking up. Don\u2019t let it go to your head.'],
        } },
      { id: 'patino', name: 'PATINO', x: 520, y: 420,
        lines: {
          1: ['...Hot stew. It\u2019s not much. But it\u2019s warm.',
              'Found some ashroot. Added it. Hope you like it.'],
          2: ['People are coming back. They keep asking for seconds. I... don\u2019t mind.',
              'There\u2019s a story that the first hearth is hidden in the final hall. I\u2019d like to see it, someday.'],
        } },
    ],
    gates: [
      { x: 1500, y: 330, w: 90, h: 90, to: 'a1', area: 'I', label: 'GATE I \u2014 THE EMBER ROAD', short: 'THE EMBER ROAD', open: true },
      { x: 1750, y: 330, w: 90, h: 90, to: null, pass: true, label: 'GATE II \u2014 THE SUNKEN CRYPT', short: 'MARKET LANE', openWhen: 'ICleared',
        closed: 'Sealed in ash. The Crypt\u2019s guardian still stands.' },
      { x: 2380, y: 330, w: 90, h: 90, to: 'b1', area: 'II', label: 'GATE II \u2014 THE SUNKEN CRYPT', short: 'THE SUNKEN CRYPT', openWhen: 'ICleared',
        closed: 'Sealed in ash. The Crypt\u2019s guardian still stands.' },
      { x: 2580, y: 330, w: 90, h: 90, to: null, pass: true, label: 'GATE III \u2014 THE BELL TOWER', short: 'BELL PLAZA', openWhen: 'IICleared',
        closed: 'The plaza is dark. The bells have not rung since the Matron fell silent.' },
      { x: 3180, y: 330, w: 90, h: 90, to: 'c1', area: 'III', label: 'GATE III \u2014 THE BELL TOWER', short: 'THE BELL TOWER', openWhen: 'IICleared',
        closed: 'The tower is sealed. The crypt has not been quieted.' },
    ],
  },
  gate: { x: 1500, y: 330, w: 90, h: 90 },
  cps: [[80, 420], [1200, 420]],
};

/* ---------------- Area I: three levels ---------------- */
export const A1_1 = {
  kind: 'level', area: 'I',
  title: '1-1  THE TORCHLIT LEDGE',
  name: 'THE TORCHLIT LEDGE',
  style: 'road', theme: 0,
  line: 'The road in. Every torch was lit by someone who did not make it further.',
  spawn: [80, 386],
  w: 1700, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 960, h: 220 },                       // the first ledge
    { x: 900, y: 420, w: 800, h: 220 },                         // after the first gap
    { x: 780, y: 320, w: 110, h: 14, oneway: 1 },               // the wagon ledge
    wallR(1700),
  ],
  torches: [[150, 420], [520, 420], { x: 1050, y: 420, lit: 0, cp: 1 }, [1300, 420], [1580, 420]],
  coins: [[300, 385], [340, 385], [380, 385],
          [620, 385], [660, 385],
          [1000, 385], [1040, 385],
          [1300, 385], [1340, 385],
          [800, 285], [835, 285], [868, 285]],                  // the satchel
  hearts: [[470, 385], [878, 285]],
  enemies: [
    { type: 'bat', x0: 300, x1: 650, y0: 230, ay: 30, sp: .5, ph: 0 },
    { type: 'goblin', x: 1050, y: 390, x0: 950, x1: 1120, hp: 1 },
    { type: 'scavenger', x: 1250, y: 390, x0: 1180, x1: 1450 },
    { type: 'bat', x0: 1200, x1: 1550, y0: 230, ay: 60, sp: 1.1, ph: 2.1 },
  ],
  props: [
    { type: 'grave', x: 220, y: 420 },
    { type: 'cart', x: 560, y: 420 },
    { type: 'cart', x: 835, y: 320 },
    { type: 'bones', x: 1250, y: 420 },
    { type: 'banner', x: 1620, y: 90, h: 190 },
  ],
  secrets: [{ x: 770, y: 270, w: 130, h: 90, name: 'THE COOK\u2019S SATCHEL' }],
  signs: [{ x: 600, y: 420, text: 'THE EMBER ROAD', sub: 'CINDERHAVEN  \u2190' }],
  gate: { x: 1580, y: 330, w: 80, h: 90 },
  exit: { x: 1584, y: 328, w: 72, h: 92, to: 'a2', area: 'I', level: 0 },
  cps: [[80, 420], [700, 420], [1050, 420]],
};

export const A1_2 = {
  kind: 'level', area: 'I',
  title: '1-2  THE BROKEN CAUSEWAY',
  name: 'THE BROKEN CAUSEWAY',
  style: 'road', theme: 0,
  line: 'The causeway broke. The road did not.',
  spawn: [80, 386],
  w: 1700, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 520, h: 220 },                        // the near bank
    { x: 360, y: 400, w: 90, h: 16, broken: 1 },
    { x: 520, y: 380, w: 90, h: 16, broken: 1 },
    { x: 680, y: 360, w: 90, h: 16, broken: 1 },
    { x: 840, y: 380, w: 90, h: 16, broken: 1 },
    { x: 1000, y: 400, w: 90, h: 16, broken: 1 },
    { x: 680, y: 260, w: 140, h: 14, oneway: 1 },              // the keeper's niche
    { x: 1160, y: 420, w: 540, h: 220 },                        // the far bank
    wallR(1700),
  ],
  torches: [[120, 420], { x: 260, y: 420, lit: 0, cp: 1 }, [1200, 420]],
  coins: [[200, 385],
          [420, 350], [450, 335], [480, 350],
          [600, 330], [630, 315], [660, 330],
          [900, 330], [930, 315], [960, 330],
          [1200, 385], [1240, 385],
          [700, 225], [735, 225], [770, 225]],                  // the niche
  hearts: [[220, 385], [790, 225]],
  enemies: [
    { type: 'bat', x0: 320, x1: 700, y0: 250, ay: 55, sp: 1.0, ph: 0 },
    { type: 'bat', x0: 700, x1: 1100, y0: 240, ay: 80, sp: 1.2, ph: 2.2 },
    { type: 'crow', x: 880, y: 362 },
    { type: 'goblin', x: 1350, y: 390, x0: 1250, x1: 1500, hp: 1 },
  ],
  props: [
    { type: 'bones', x: 150, y: 420 },
    { type: 'banner', x: 720, y: 140, h: 120 },
    { type: 'statue', x: 1250, y: 420 },
    { type: 'rubble', x: 1500, y: 420 },
  ],
  secrets: [{ x: 670, y: 210, w: 160, h: 100, name: 'THE KEEPER\u2019S NICHE' }],
  signs: [{ x: 150, y: 420, text: 'THE BROKEN CAUSEWAY', sub: 'MIND THE GAP' }],
  gate: { x: 1600, y: 330, w: 80, h: 90 },
  exit: { x: 1604, y: 328, w: 72, h: 92, to: 'a3', area: 'I', level: 1 },
  cps: [[80, 420], [260, 420], [1200, 420]],
};

export const A1_3 = {
  kind: 'level', area: 'I',
  title: '1-3  THE KEEP STEPS AND GATE',
  name: 'THE KEEP STEPS',
  style: 'road', theme: 0,
  line: 'The Warden\u2019s door. The road ends here.',
  spawn: [80, 386],
  w: 1300, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 700, h: 220 },                        // the approach
    { x: 480, y: 380, w: 100, h: 40 },
    { x: 580, y: 340, w: 100, h: 40 },
    { x: 680, y: 300, w: 100, h: 40 },
    { x: 780, y: 260, w: 100, h: 40 },
    { x: 880, y: 260, w: 420, h: 280 },                         // the keep roof
    wallR(1300),
  ],
  torches: [[150, 420], [620, 340], [920, 260], [1110, 260]],
  coins: [[300, 385], [340, 385],
          [520, 345], [620, 305], [720, 265],
          [900, 225], [980, 225], [1060, 225], [1140, 225]],
  hearts: [[450, 385]],
  enemies: [
    { type: 'bat', x0: 600, x1: 900, y0: 250, ay: 40, sp: 1.0, ph: 1.4 },
    { type: 'goblin', x: 700, y: 270, x0: 680, x1: 760, hp: 2 },
  ],
  boss: { type: 'brute', x: 1000, y: 216, wake: 900, hp: 8 },
  props: [
    { type: 'grave', x: 350, y: 420 },
    { type: 'rubble', x: 1050, y: 260 },
    { type: 'banner', x: 1120, y: 70, h: 190 },
    { type: 'bones', x: 820, y: 260 },
  ],
  signs: [{ x: 250, y: 420, text: 'THE KEEP', sub: 'THE WARDEN\u2019S DOOR' }],
  gate: { x: 1160, y: 170, w: 90, h: 90 },
  exit: { x: 1160, y: 168, w: 90, h: 92, to: 'hub', area: 'I', level: 2, complete: true },
  cps: [[80, 420], [900, 260]],
};

/* ---------------- Area II: the Sunken Crypt ---------------- */
export const B1 = {
  kind: 'level', area: 'II',
  title: '2-1  THE FLOODED STAIR',
  name: 'THE FLOODED STAIR',
  style: 'crypt', theme: 1,
  line: 'The stair goes down into water that has not moved in years.',
  spawn: [80, 386],
  w: 1800, h: 700, water: 470,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 580, h: 280 },                        // the dry top step
    { kind: 'sink', x: 420, y: 400, w: 110, h: 16, baseY: 400, depth: 18 },
    { kind: 'sink', x: 600, y: 380, w: 110, h: 16, baseY: 380, depth: 18 },
    { kind: 'sink', x: 780, y: 400, w: 110, h: 16, baseY: 400, depth: 18 },
    { kind: 'sink', x: 960, y: 380, w: 110, h: 16, baseY: 380, depth: 18 },
    { x: 1120, y: 420, w: 680, h: 280 },                        // the far landing
    wallR(1800),
  ],
  torches: [[150, 420], [1250, 420], { x: 1200, y: 420, lit: 0, cp: 1 }],
  coins: [[250, 385], [300, 385],
          [470, 360], [650, 340], [830, 360], [1010, 340],
          [1200, 385], [1240, 385]],
  hearts: [[180, 385], [1300, 385]],
  enemies: [
    { type: 'leech', x: 690, y: 120 },
    { type: 'goblin', x: 1400, y: 390, x0: 1250, x1: 1550, hp: 1 },
    { type: 'bat', x0: 420, x1: 1000, y0: 250, ay: 50, sp: 1.0, ph: 0.5 },
  ],
  props: [
    { type: 'bones', x: 250, y: 420 },
    { type: 'chain', x: 690, y: 0, h: 120 },
    { type: 'grave', x: 1450, y: 420 },
    { type: 'rubble', x: 1600, y: 420 },
  ],
  signs: [{ x: 250, y: 420, text: 'THE FLOODED STAIR', sub: 'MIND THE WATER' }],
  gate: { x: 1700, y: 330, w: 80, h: 90 },
  exit: { x: 1704, y: 328, w: 72, h: 92, to: 'b2', area: 'II', level: 0 },
  cps: [[80, 420], [1200, 420]],
};

export const B2 = {
  kind: 'level', area: 'II',
  title: '2-2  THE OSSUARY',
  name: 'THE OSSUARY',
  style: 'crypt', theme: 1,
  line: 'The dead were laid out in rows. Someone has been rearranging them.',
  spawn: [80, 386],
  w: 1900, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 700, h: 220 },
    { x: 560, y: 380, w: 120, h: 16, broken: 1 },
    { x: 740, y: 340, w: 120, h: 16, broken: 1 },
    { x: 920, y: 380, w: 120, h: 16, broken: 1 },
    { x: 760, y: 260, w: 120, h: 14, oneway: 1 },              // the bone alcove
    { x: 1080, y: 420, w: 820, h: 220 },
    wallR(1900),
  ],
  torches: [[150, 420], { x: 500, y: 420, lit: 0, cp: 1 }, [1100, 420]],
  coins: [[300, 385], [340, 385],
          [590, 345], [770, 305], [950, 345],
          [1150, 385], [1200, 385],
          [780, 225], [815, 225], [850, 225]],
  hearts: [[200, 385], [875, 225]],
  enemies: [
    { type: 'skull', x: 700, y: 250 },
    { type: 'leech', x: 1200, y: 110 },
    { type: 'goblin', x: 1350, y: 390, x0: 1250, x1: 1550, hp: 1 },
    { type: 'bat', x0: 500, x1: 900, y0: 240, ay: 40, sp: 1.0, ph: 2.0 },
  ],
  props: [
    { type: 'bones', x: 300, y: 420 },
    { type: 'statue', x: 1500, y: 420 },
    { type: 'shelf', x: 1000, y: 420 },
    { type: 'grave', x: 1650, y: 420 },
  ],
  secrets: [{ x: 750, y: 210, w: 140, h: 90, name: 'THE OSSUARY ALCOVE' }],
  signs: [{ x: 400, y: 420, text: 'THE OSSUARY', sub: 'COLD STONE' }],
  gate: { x: 1800, y: 330, w: 80, h: 90 },
  exit: { x: 1804, y: 328, w: 72, h: 92, to: 'b3', area: 'II', level: 1 },
  cps: [[80, 420], [500, 420], [1100, 420]],
};

export const B3 = {
  kind: 'level', area: 'II',
  title: '2-3  THE DROWNED NAVE',
  name: 'THE DROWNED NAVE',
  style: 'crypt', theme: 1,
  line: 'The Warden still keeps the nave. It has been a long watch.',
  spawn: [80, 386],
  w: 2100, h: 700, water: 470,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 820, h: 280 },
    { kind: 'sink', x: 660, y: 400, w: 110, h: 16, baseY: 400, depth: 18 },
    { kind: 'sink', x: 840, y: 380, w: 110, h: 16, baseY: 380, depth: 18 },
    { kind: 'sink', x: 1020, y: 400, w: 110, h: 16, baseY: 400, depth: 18 },
    { x: 1200, y: 420, w: 900, h: 280 },                        // the nave and the Warden
    wallR(2100),
  ],
  torches: [[150, 420], { x: 1250, y: 420, lit: 0, cp: 1 }, [1900, 420]],
  coins: [[250, 385], [300, 385],
          [700, 360], [880, 340], [1060, 360],
          [1300, 385], [1360, 385], [1950, 385]],
  hearts: [[150, 385], [1350, 385]],
  enemies: [
    { type: 'leech', x: 400, y: 110 },
    { type: 'skull', x: 900, y: 250 },
    { type: 'bat', x0: 500, x1: 1100, y0: 250, ay: 50, sp: 1.1, ph: 1.5 },
  ],
  boss: { kind: 'cryptwarden', name: 'THE CRYPT WARDEN', x: 1600, y: 380, wake: 1300, hp: 6, sealed: 'THE WARDEN HOLDS THE NAVE' },
  props: [
    { type: 'bones', x: 200, y: 420 },
    { type: 'statue', x: 450, y: 420 },
    { type: 'chain', x: 900, y: 0, h: 150 },
    { type: 'rubble', x: 1850, y: 420 },
  ],
  signs: [{ x: 300, y: 420, text: 'THE DROWNED NAVE', sub: 'KEEP TO THE STONES' }],
  gate: { x: 2000, y: 330, w: 80, h: 90 },
  exit: { x: 2004, y: 328, w: 72, h: 92, to: 'b4', area: 'II', level: 2 },
  cps: [[80, 420], [1250, 420]],
};

export const B4 = {
  kind: 'level', area: 'II',
  title: '2-4  THE MATRON\u2019S CISTERN',
  name: 'THE MATRON\u2019S CISTERN',
  style: 'crypt', theme: 1,
  line: 'She only wanted them to rest.',
  spawn: [80, 386],
  w: 1600, h: 700, water: 470,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 700, h: 280 },
    { x: 600, y: 380, w: 140, h: 18 },
    { x: 800, y: 340, w: 140, h: 18 },
    { x: 1000, y: 380, w: 140, h: 18 },
    { x: 1150, y: 420, w: 450, h: 280 },
    wallR(1600),
  ],
  torches: [[150, 420], [1250, 420]],
  coins: [[250, 385], [300, 385],
          [650, 340], [850, 300], [1050, 340],
          [1300, 385], [1360, 385]],
  hearts: [[180, 385], [700, 300]],
  enemies: [
    { type: 'leech', x: 450, y: 110 },
  ],
  boss: { kind: 'matron', name: 'THE CRYPT MATRON', x: 1100, y: 330, wake: 650, hp: 12, sealed: 'THE MATRON HOLDS THE CISTERN' },
  props: [
    { type: 'statue', x: 350, y: 420 },
    { type: 'chain', x: 700, y: 0, h: 140 },
    { type: 'bones', x: 1250, y: 420 },
    { type: 'rubble', x: 1450, y: 420 },
  ],
  signs: [{ x: 250, y: 420, text: 'THE CISTERN', sub: 'SHE IS WAITING' }],
  gate: { x: 1500, y: 330, w: 80, h: 90 },
  exit: { x: 1504, y: 328, w: 72, h: 92, to: 'hub', area: 'II', level: 3, complete: true },
  cps: [[80, 420], [1150, 420]],
};

/* ---------------- Area III: the Bell Tower ---------------- */
export const C1 = {
  kind: 'level', area: 'III',
  title: '3-1  THE BELFRY STAIRS',
  name: 'THE BELFRY STAIRS',
  style: 'tower', theme: 2,
  line: 'Every bell up here was rung by someone who never came back down.',
  spawn: [80, 386],
  w: 2000, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 760, h: 220 },                        // the belfry floor
    { kind: 'lift', bell: 'B1', x: 600, y: 420, w: 110, h: 16, baseY: 420, rise: 100 },
    { x: 750, y: 320, w: 260, h: 18 },                          // the ringers' landing
    { x: 800, y: 250, w: 150, h: 14, oneway: 1 },               // the log loft
    { x: 1050, y: 360, w: 100, h: 16, oneway: 1 },
    { x: 1150, y: 420, w: 850, h: 220 },                        // the far gallery
    wallR(2000),
  ],
  bells: [{ x: 520, y: 350, id: 'B1' }],
  torches: [[150, 420], [400, 420], { x: 900, y: 320, lit: 0, cp: 1 }, [1150, 420]],
  coins: [[250, 385], [290, 385], [500, 385],
          [640, 300], [680, 300],
          [800, 285], [840, 285],
          [840, 215], [880, 215],
          [1200, 385], [1240, 385], [1500, 385], [1540, 385]],
  hearts: [[820, 285], [830, 215], [1450, 385]],
  enemies: [
    { type: 'goblin', x: 1250, y: 390, x0: 1180, x1: 1400, hp: 1 },
    { type: 'bat', x0: 1150, x1: 1600, y0: 230, ay: 40, sp: .9, ph: .4 },
    { type: 'pealwraith', x: 1550, y: 360 },
  ],
  props: [
    { type: 'chain', x: 520, y: 0, h: 148 },
    { type: 'banner', x: 980, y: 120, h: 170 },
    { type: 'rubble', x: 1700, y: 420 },
  ],
  secrets: [{ x: 790, y: 210, w: 180, h: 100, name: 'THE BELL-KEEPER\u2019S LOG' }],
  signs: [{ x: 300, y: 420, text: 'THE BELFRY STAIRS', sub: 'RING THE BELL' }],
  gate: { x: 1880, y: 330, w: 80, h: 90 },
  exit: { x: 1884, y: 328, w: 72, h: 92, to: 'c2', area: 'III', level: 0 },
  cps: [[80, 420], [800, 320], [1200, 420]],
};

export const C2 = {
  kind: 'level', area: 'III',
  title: '3-2  THE CHIME HALL',
  name: 'THE CHIME HALL',
  style: 'tower', theme: 2,
  line: 'A hundred bells, and someone has been ringing them out of order.',
  spawn: [80, 386],
  w: 2100, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 820, h: 220 },
    { kind: 'lift', bell: 'B1', x: 660, y: 420, w: 110, h: 16, baseY: 420, rise: 90 },
    { x: 810, y: 330, w: 260, h: 18 },                          // the mid gallery
    { kind: 'lift', bell: 'B2', x: 1110, y: 330, w: 110, h: 16, baseY: 330, rise: 90 },
    { x: 1260, y: 240, w: 220, h: 18 },                         // the high gallery
    { x: 1310, y: 150, w: 170, h: 14, oneway: 1 },              // the codex nook
    { x: 1530, y: 420, w: 570, h: 220 },
    wallR(2100),
  ],
  bells: [{ x: 520, y: 350, id: 'B1' }, { x: 860, y: 260, id: 'B2' }],
  torches: [[200, 420], [900, 330], { x: 1350, y: 240, lit: 0, cp: 1 }, [1600, 420]],
  coins: [[250, 385], [290, 385],
          [700, 295], [740, 295],
          [850, 295], [890, 295],
          [1300, 195], [1340, 195],
          [1350, 115], [1390, 115],
          [1600, 385], [1640, 385], [1800, 385]],
  hearts: [[980, 295], [1380, 115], [1750, 385]],
  enemies: [
    { type: 'goblin', x: 1800, y: 390, x0: 1650, x1: 1950, hp: 1 },
    { type: 'bat', x0: 900, x1: 1400, y0: 200, ay: 45, sp: 1.1, ph: 1.2 },
    { type: 'pealwraith', x: 1650, y: 355 },
  ],
  props: [
    { type: 'chain', x: 520, y: 0, h: 148 },
    { type: 'chain', x: 860, y: 0, h: 174 },
    { type: 'banner', x: 1250, y: 90, h: 170 },
    { type: 'statue', x: 1750, y: 420 },
  ],
  secrets: [{ x: 1300, y: 110, w: 180, h: 100, name: 'THE CHIME CODEX' }],
  signs: [{ x: 350, y: 420, text: 'THE CHIME HALL', sub: 'EVERY BELL ANSWERS' }],
  gate: { x: 1980, y: 330, w: 80, h: 90 },
  exit: { x: 1984, y: 328, w: 72, h: 92, to: 'c3', area: 'III', level: 1 },
  cps: [[80, 420], [850, 330], [1600, 420]],
};

export const C3 = {
  kind: 'level', area: 'III',
  title: '3-3  THE RAFTERS',
  name: 'THE RAFTERS',
  style: 'tower', theme: 2,
  line: 'The wind gets in through the broken bells. It almost sounds like music.',
  spawn: [80, 386],
  w: 2200, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 720, h: 220 },
    { x: 560, y: 390, w: 120, h: 16, oneway: 1 },
    { x: 720, y: 350, w: 120, h: 16, oneway: 1 },
    { x: 880, y: 380, w: 120, h: 16, oneway: 1 },
    { x: 1050, y: 420, w: 1150, h: 220 },                       // the rafter arena
    { x: 1180, y: 300, w: 160, h: 16, oneway: 1 },
    { x: 1480, y: 320, w: 140, h: 14, oneway: 1 },              // the rafter cache
    wallR(2200),
  ],
  bells: [{ x: 380, y: 350, id: 'B1' }],
  torches: [[150, 420], { x: 1100, y: 420, lit: 0, cp: 1 }, [1900, 420]],
  coins: [[250, 385], [290, 385],
          [600, 355], [760, 315], [920, 345],
          [1220, 265], [1260, 265],
          [1500, 285], [1540, 285],
          [1400, 385], [1450, 385]],
  hearts: [[1300, 265], [1520, 285], [1800, 385]],
  enemies: [
    { type: 'pealwraith', x: 760, y: 340 },
    { type: 'bat', x0: 600, x1: 1100, y0: 220, ay: 40, sp: 1.0, ph: 2.2 },
    { type: 'goblin', x: 1300, y: 390, x0: 1150, x1: 1500, hp: 1 },
  ],
  boss: { kind: 'clappergolem', name: 'THE CLAPPER GOLEM', x: 1600, y: 380, wake: 1250, hp: 6, sealed: 'THE GOLEM KEEPS THE RAFTERS' },
  props: [
    { type: 'chain', x: 380, y: 0, h: 148 },
    { type: 'banner', x: 1000, y: 100, h: 170 },
    { type: 'rubble', x: 2000, y: 420 },
  ],
  secrets: [{ x: 1470, y: 270, w: 150, h: 90, name: 'THE RAFTER CACHE' }],
  signs: [{ x: 300, y: 420, text: 'THE RAFTERS', sub: 'MIND THE DROP' }],
  gate: { x: 2080, y: 330, w: 80, h: 90 },
  exit: { x: 2084, y: 328, w: 72, h: 92, to: 'c4', area: 'III', level: 2 },
  cps: [[80, 420], [1100, 420]],
};

export const C4 = {
  kind: 'level', area: 'III',
  title: '3-4  THE CARILLON',
  name: 'THE CARILLON',
  style: 'tower', theme: 2,
  line: 'The cracked bell has been ringing the same note for years.',
  spawn: [80, 386],
  w: 1800, h: 640,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: -200, y: 420, w: 720, h: 220 },
    { x: 560, y: 380, w: 140, h: 18 },
    { x: 760, y: 340, w: 140, h: 18 },
    { x: 960, y: 380, w: 140, h: 18 },
    { x: 600, y: 280, w: 160, h: 14, oneway: 1 },               // the carillon note
    { x: 1140, y: 420, w: 660, h: 220 },                        // the carillon floor
    wallR(1800),
  ],
  torches: [[150, 420], { x: 1200, y: 420, lit: 0, cp: 1 }, [1600, 420]],
  coins: [[250, 385], [290, 385],
          [600, 340], [800, 300], [1000, 340],
          [640, 245], [680, 245],
          [1250, 385], [1300, 385]],
  hearts: [[180, 385], [660, 245], [1180, 385]],
  enemies: [
    { type: 'bat', x0: 550, x1: 1050, y0: 220, ay: 40, sp: 1.0, ph: .8 },
  ],
  boss: { kind: 'carillon', name: 'THE CRACKED CARILLON', x: 1470, y: 180, wake: 900, hp: 8, sealed: 'THE CARILLON RINGS THE LAST HOUR' },
  props: [
    { type: 'banner', x: 700, y: 80, h: 170 },
    { type: 'rubble', x: 1420, y: 420 },
    { type: 'chain', x: 1470, y: 0, h: 120 },
  ],
  secrets: [{ x: 600, y: 220, w: 160, h: 100, name: 'THE CARILLON NOTE' }],
  signs: [{ x: 300, y: 420, text: 'THE CARILLON', sub: 'SHE RINGS FOR NO ONE' }],
  gate: { x: 1660, y: 330, w: 80, h: 90 },
  exit: { x: 1664, y: 328, w: 72, h: 92, to: 'hub', area: 'III', level: 3, complete: true },
  cps: [[80, 420], [1200, 420]],
};

export const SCENES = { tutorial: TUTORIAL, hub: HUB, a1: A1_1, a2: A1_2, a3: A1_3, b1: B1, b2: B2, b3: B3, b4: B4, c1: C1, c2: C2, c3: C3, c4: C4 };
export const SCENE_IDS = Object.keys(SCENES);
export const TOTAL_COINS = SCENE_IDS.reduce((n, id) => n + SCENES[id].coins.length, 0);
