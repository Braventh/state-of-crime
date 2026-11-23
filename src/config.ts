export const W = 960;
export const H = 540;
export const ROAD = 419;
export const LIMIT = 11800;
export const START = 530;

export const REGIONS = [
  { name: 'Crownwater', id: '01', caption: 'METROPOLITAN DISTRICT', start: 0, end: 4000, ink: '#d8799a' },
  { name: 'Sunsplice Keys', id: '02', caption: 'BAY CAUSEWAY', start: 4000, end: 7600, ink: '#f2ae83' },
  { name: 'Breakwater Yard', id: '03', caption: 'FREIGHT DISTRICT', start: 7600, end: LIMIT, ink: '#f4b76d' },
];
export const regionAt = (x: number) => REGIONS.find(r => x < r.end) ?? REGIONS[2];

export const POINTS = {
  contact: { x: 650, name: 'Mara / Dispatch' },
  garage: { x: 920, name: 'Sidecar Garage' },
  delivery: { x: 2430, name: 'Tidelane' },
  exchange: { x: 3125, name: 'Signal Exchange roof' },
  refuge: { x: 4950, name: 'Bluehour Refuge' },
  outpost: { x: 5250, name: 'Sidecar Outpost' },
  race: { x: 5640, name: 'Causeway Start' },
  finish: { x: 7440, name: 'Causeway Finish' },
  port: { x: 8140, name: 'Inez / Freight Office' },
  freight: { x: 10110, name: 'Beacon 06' },
};
export const HIDEOUTS = [POINTS.garage, POINTS.refuge];
export const GARAGES = [POINTS.garage, POINTS.outpost];
export const EXCHANGE_ROOF = ROAD - 108;
export const PLATFORMS = [
  { x: 2780, width: 102, y: ROAD - 42 },
  { x: 2880, width: 145, y: ROAD - 83 },
  { x: 3040, width: 134, y: EXCHANGE_ROOF },
  { x: 9500, width: 95, y: ROAD - 38 },
  { x: 9630, width: 108, y: ROAD - 70 },
  { x: 9750, width: 138, y: ROAD - 105 },
  { x: 9950, width: 204, y: ROAD - 52 },
];
export const CARS = {
  compact: { label: 'Kite Compact', speed: 286, accel: 340, grip: 590, health: 96, width: 61, height: 24, color: '#ef8a62', coast: 47 },
  coupe: { label: 'Sable Coupe', speed: 383, accel: 430, grip: 640, health: 74, width: 72, height: 22, color: '#e35883', coast: 53 },
  van: { label: 'Bayline Van', speed: 248, accel: 245, grip: 397, health: 137, width: 75, height: 33, color: '#8fccc0', coast: 38 },
};
export type CarKind = keyof typeof CARS;
export const UPGRADES = { engine: 420, armor: 340, coupe: 680, van: 520 };
export const GARAGE_TUNING = { speed: .22, acceleration: .16, protection: .32 };
export const TUNE = {
  maxHealth: 100, run: 211, walk: 145, jump: 343, gravity: 930, coyote: .10, jumpBuffer: .12,
  crime: { theft: 1, exchange: 2 },
  police: {
    search: [0, 3.5, 4.5, 5.5, 6.5],
    range: [0, 195, 240, 305, 367],
    speed: [0, 169, 235, 265, 291],
    spawn: 530, placeDistance: 460, hideDistance: 120, hideSpeed: 105,
    ramRange: 120, ramWindup: .45, ramRecovery: .95,
  },
  laneOffset: 24, raceTime: 13, raceRival: { speed: 258, swing: 16 }, getawayTime: 58,
};
export const TOOLS = [
  { name: 'Palm strike', range: 48, vertical: 27, damage: 30, cooldown: .35, color: '#ffdb9d' },
  { name: 'Arc caster', range: 175, vertical: 75, damage: 37, cooldown: .47, color: '#9df4df' },
  { name: 'Signal burst', range: 111, vertical: 56, damage: 50, cooldown: .69, color: '#ff97b7' },
];
export const JOBS = [
  { title: 'First Light', contact: 'Mara', location: POINTS.contact, reward: 300, line: 'Take this film canister to Tidelane. Borrow the marked Kite, but expect police attention.' },
  { title: 'Tail Lights', contact: 'Mara', location: POINTS.delivery, reward: 420, line: 'They traced the reel. Drive east and lose the tail. Bluehour has a shutter.' },
  { title: 'Dead Air', contact: 'Mara', location: POINTS.refuge, reward: 570, line: 'Climb the low roofs west of the Exchange. Lift the cartridge and bring it back clean.' },
  { title: 'Cut Across', contact: 'Roux', location: POINTS.race, reward: 630, line: 'First to the far toll wins. Keep your speed up, move around traffic and stay off the wall.' },
  { title: 'Last Transmission', contact: 'Inez', location: POINTS.port, reward: 850, line: 'Climb the freight stacks. Shut down the sentries, grab Beacon 06, then get back here.' },
];
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const toward = (value: number, target: number, delta: number) =>
  value < target ? Math.min(target, value + delta) : Math.max(target, value - delta);
