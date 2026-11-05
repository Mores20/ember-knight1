// v2 vertical slice: the tutorial road, Cinderhaven's first stage, and a
// placeholder Area I. Area I reuses the shipped Ember Road level for now; V3
// splits it into 1-1 / 1-2 / 1-3 and V4 adds the Gatekeeper Brute.
import { LEVELS as V1_LEVELS } from '../level.js';

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
  torches: [[150, 420], [560, 420], [900, 420], [1400, 420], [1760, 420]],
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
  ward: { x: 1650, y: 330, range: 280, cool: 2.2 },
  prompts: [
    { x: 0, text: 'A / D  or  \u2190 / \u2192  \u2014 move' },
    { x: 360, text: 'SPACE  \u2014 jump. Hold it for height.' },
    { x: 780, text: 'J  \u2014 swing at the straw dummy.' },
    { x: 1000, text: 'SHIFT  \u2014 dash. One surge per jump.' },
    { x: 1530, text: 'L  \u2014 guard. Press it late to parry the orb.' },
    { x: 1720, text: 'Cinderhaven lies beyond the gate.' },
  ],
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
  w: 1900, h: 540,
  darkZones: [], lights: [], hazards: [],
  solids: [
    wallL,
    { x: 0, y: 420, w: 1900, h: 120 },                         // the street
    wallR(1900),
  ],
  torches: [[180, 420], [980, 420], [1360, 420]],
  coins: [], hearts: [], enemies: [],
  props: [
    { type: 'banner', x: 560, y: 150, h: 190 },
    { type: 'cart', x: 1040, y: 420 },
    { type: 'statue', x: 1200, y: 420 },
    { type: 'rubble', x: 1650, y: 420 },
  ],
  hub: {
    hearth: { x: 420, y: 420 },
    dummy: { x: 700, y: 420 },
    npcs: [
      { id: 'clint', name: 'CLINT', x: 140, y: 420 },
      { id: 'patino', name: 'PATINO', x: 520, y: 420 },
    ],
    gates: [
      { x: 1500, y: 330, w: 90, h: 90, to: 'area1', label: 'GATE I \u2014 THE EMBER ROAD', open: true },
      { x: 1750, y: 330, w: 90, h: 90, to: null, label: 'GATE II \u2014 THE SUNKEN CRYPT', openWhen: 'ICleared',
        closed: 'Sealed in ash. The Crypt\u2019s guardian still stands.' },
    ],
  },
  gate: { x: 1500, y: 330, w: 90, h: 90 },
  cps: [[80, 420], [1200, 420]],
};

// V0 placeholder: the shipped Ember Road becomes Area I until V3 splits it.
const base = V1_LEVELS[0];
export const AREA1 = {
  ...base,
  kind: 'level',
  title: 'AREA I \u2014 THE EMBER ROAD',
  name: 'THE EMBER ROAD',
  area: 'I',
  merchant: null,
  exit: { x: 3118, y: 168, w: 84, h: 92, to: 'hub', area: 'I' },
};

export const SCENES = { tutorial: TUTORIAL, hub: HUB, area1: AREA1 };
export const SCENE_IDS = Object.keys(SCENES);
export const TOTAL_COINS = SCENE_IDS.reduce((n, id) => n + SCENES[id].coins.length, 0);
