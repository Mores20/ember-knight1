// Per-phase world palettes + brighter knight/item colours.
// Threat orange (#ff8a3d family) is NOT used in any world colour: it stays reserved for danger.
export const THEMES = [
  { name: 'I  The Ember Road',     sky: '#0b1021', sky2: '#18203f', stone: '#2f3750', stoneLit: '#8f9bb8', accent: '#cfd8ee' },
  { name: 'II  The Sunken Crypt',  sky: '#07161a', sky2: '#0f2f33', stone: '#235056', stoneLit: '#6fd6c0', accent: '#5fe0c8' },
  { name: 'III  The Bell Tower',   sky: '#1a1026', sky2: '#35193f', stone: '#6a3b4a', stoneLit: '#d9a0a0', accent: '#e8c96a' },
  { name: 'IV  The Throne',        sky: '#120f1f', sky2: '#241a3a', stone: '#3d3458', stoneLit: '#a99bd6', accent: '#b79cff' },
  { name: 'V  The Ashen Gardens',  sky: '#16131e', sky2: '#2a2438', stone: '#4d4760', stoneLit: '#a89fc4', accent: '#7fc47a' },
  { name: 'VI  The Drowned Forge', sky: '#08131c', sky2: '#10283a', stone: '#2f4a60', stoneLit: '#6fd3ff', accent: '#6fd3ff' },
  { name: 'VII  The Silent Archive', sky: '#0c0e2a', sky2: '#191d5a', stone: '#3b3f86', stoneLit: '#b9bdf5', accent: '#f1e6c4' },
  { name: 'VIII  The Ember Heart', sky: '#09090f', sky2: '#1b1b2b', stone: '#34344a', stoneLit: '#e4ecff', accent: '#f4f8ff' },
];
// Knight and pickups: lifted values and non-orange hues so they pop against every theme.
export const POP = { knight: '#e8f0ff', knightTrim: '#7fe3ff', cape: '#3f6dff', coin: '#ffd84a', heart: '#ff5c7a', dash: '#5fe8ff', lantern: '#fff2b0' };
// Mobs and bosses: dark bodies, orange eyes and rims. Same in every phase.
export const THREAT = { body: '#05070f', eye: '#ff8a3d', rim: '#ff8a3d', hot: '#ffd08a', warn: '#ff4d1c' };
// Torch flames go gold (the lantern shares the core colour); the knight's sword trail goes cyan.
export const FLAME = { core: '#fff2b0', mid: '#ffd84a', edge: '#ffc23d', glow: '#ffe9a8' };
export const TRAIL = { core: '#c8f6ff', mid: '#7fe3ff', edge: '#3fb8e8' };
// New mobs. Every one keeps a dark body + orange eyes/rim (eye/rim/hot come from THREAT); each body is
// tinted toward its home phase so it feels native, with a "lift" tone to separate it from the backdrop.
export const MOBS = {
  archer:  { body: '#1a1624', lift: '#2e2840', wood: '#5b3d22', arrow: '#ff8a3d', hot: '#ffd08a' },           // V Ashen Gardens (smoky violet)
  wisp:    { body: '#0f0c14', lift: '#241a2e', ring: '#ff8a3d', hot: '#ffd08a', scaredEye: '#e4ecff' },       // V-VI; eyes go pale when light makes it flee
  crawler: { body: '#10151c', lift: '#1f2c3a', trail: '#ff4d1c', hot: '#ffd08a' },                            // VI Drowned Forge (steel blue-black), molten trail
  shade:   { body: '#0a0b1e', lift: '#1a1d4a', shadowRim: '#7a4420', litBody: '#2a2f6a', litEye: '#ffd08a' }, // VII Archive: dim rim = untouchable, lit = hittable
  husk:    { body: '#0e0e16', lift: '#262638', crack: '#ff8a3d', hot: '#ffd08a' },                            // VIII Ember Heart (cold near-black)
  hexer:   { body: '#150f1f', lift: '#2c2140', orb: '#5a6585', orbLift: '#8f9bb8', pale: '#cfd8ee' },         // V-VIII caster: plum robe, cold grey orb (orange when it casts; pale for Snuff Hex)
};