export const STREET = 414;
export const DISTRICT_WIDTH = 3480;
export const SPAWN = 380;
export const CELLAR = 509;

export interface Surface { left: number; right: number; y: number }
export const street: Surface = { left: 22, right: DISTRICT_WIDTH - 22, y: STREET };
export const roofs: Surface[] = [
  { left: 88, right: 304, y: 354 }, { left: 128, right: 493, y: 277 },
  { left: 295, right: 697, y: 188 }, { left: 743, right: 943, y: 188 },
  { left: 752, right: 1020, y: 288 }, { left: 915, right: 1089, y: 352 },
  { left: 1280, right: 1502, y: 344 }, { left: 1430, right: 1808, y: 257 },
  { left: 1640, right: 1951, y: 193 }, { left: 1994, right: 2207, y: 193 },
  { left: 2011, right: 2270, y: 278 }, { left: 2199, right: 2414, y: 343 },
  { left: 2685, right: 2989, y: 346 }, { left: 2824, right: 3180, y: 253 },
  { left: 3070, right: 3359, y: 190 },
];
export const ladders = [
  { x: 170, low: STREET, high: 277 }, { x: 327, low: 277, high: 188 },
  { x: 782, low: 288, high: 188 }, { x: 968, low: STREET, high: 288 },
  { x: 1352, low: STREET, high: 344 }, { x: 1462, low: 344, high: 257 },
  { x: 1741, low: 257, high: 193 }, { x: 2148, low: 278, high: 193 },
  { x: 2234, low: 343, high: 278 }, { x: 2335, low: STREET, high: 343 },
  { x: 2750, low: STREET, high: 346 }, { x: 2900, low: 346, high: 253 },
  { x: 3120, low: 253, high: 190 },
];
export const passages = [
  { name: 'Bluehour Arcade', left: 484, right: 925, doors: [522, 895] },
  { name: 'Rainline Service Tunnel', left: 1490, right: 2046, doors: [1519, 2015] },
  { name: 'Glasshouse Lockup', left: 2773, right: 3109, doors: [2806, 3077] },
];

export const blocks = [
  { x: 352, end: 1040, name: 'Lantern Row', ink: '#eeaa77' },
  { x: 1217, end: 1880, name: 'Rainline Market', ink: '#a6d6c2' },
  { x: 2114, end: 2550, name: 'Needle Alley', ink: '#e08ca1' },
  { x: 2937, end: DISTRICT_WIDTH, name: 'Glasshouse Works', ink: '#e9c285' },
];
export const blockAt = (x: number) => blocks.find(block => x < block.end) ?? blocks[3];
export const inside = (x: number) => passages.find(p => x >= p.left && x <= p.right);
