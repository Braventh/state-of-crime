import { CARS, clamp, GARAGE_TUNE, toward, type CarKind } from './config.ts';
import { DISTRICT_WIDTH, STREET } from './district.ts';

export interface Ride {
  id: string; x: number; v: number; lane: number; depth: number; dir: number; hp: number;
  kind: CarKind; color: string; traffic: boolean; taken: boolean; faction?: number; parked: number;
}
export interface DriveInput { side: number; brake?: boolean; laneChange?: number; exit?: boolean }
export const rideY = (ride: Ride) => STREET + 15 + ride.depth * 27;
export const makeRide = (id: string, x: number, kind: CarKind, lane = 1, direction = 1, traffic = false, faction?: number): Ride => ({
  id, x, kind, lane, depth: lane, dir: direction, v: traffic ? direction * 112 : 0,
  hp: CARS[kind].health, color: faction === undefined ? CARS[kind].color : ['#ac5277', '#609c82', '#b98849'][faction],
  traffic, taken: false, faction, parked: x,
});
export const fleet = () => [
  makeRide('kite', 748, 'compact'), makeRide('rill', 1378, 'van'),
  makeRide('sable', 1580, 'coupe', 1, 1, false, 0),
  makeRide('gannet', 2115, 'compact', 1, -1, false, 1),
  makeRide('prism', 2601, 'coupe'), makeRide('anvil', 3102, 'van', 1, -1, false, 2),
  makeRide('commuter-1', 323, 'van', -1, 1, true), makeRide('commuter-2', 927, 'coupe', 0, -1, true),
  makeRide('commuter-3', 1674, 'compact', -1, 1, true), makeRide('commuter-4', 2382, 'van', 0, -1, true),
  makeRide('commuter-5', 3148, 'coupe', -1, 1, true),
];
export function steer(ride: Ride, road: Ride[], input: DriveInput, dt: number, engine = false, armor = false) {
  const model = CARS[ride.kind];
  const x = ride.x;
  const lane = ride.depth;
  const side = input.side;
  ride.lane = clamp(ride.lane + (input.laneChange ?? 0), -1, 1);
  ride.depth = toward(ride.depth, ride.lane, model.laneSpeed * dt);
  const top = model.speed * (engine ? 1 + GARAGE_TUNE.speed : 1);
  ride.v = toward(ride.v, input.brake ? 0 : side * top, dt * (input.brake || side * ride.v < 0
    ? model.grip : side ? model.accel * (engine ? 1 + GARAGE_TUNE.accel : 1) : model.coast));
  if (side * ride.v > 9) ride.dir = side;
  ride.x += ride.v * dt;
  let impact = 0;
  for (const other of road) {
    if (other === ride || other.hp <= 0) continue;
    const gap = (model.width + CARS[other.kind].width) * .5 - 4;
    if (Math.abs(other.x - ride.x) >= gap || Math.abs(other.depth - ride.depth) > .54) continue;
    if (Math.abs(x - other.x) < gap && Math.abs(lane - other.depth) > .54) {
      ride.depth = lane;
      ride.lane = Math.round(lane);
      continue;
    }
    if (other.traffic) other.lane = ride.lane === 0 ? -other.dir : 0;
    const direction = Math.sign(x - other.x) || -ride.dir;
    const closing = (other.v - ride.v) * direction;
    if (closing <= 0) continue;
    ride.x = other.x + direction * gap;
    ride.v = other.v + (closing > 95 ? direction * closing * .13 : 0);
    if (closing > 95) {
      impact = Math.max(impact, closing);
      other.hp = Math.max(0, other.hp - closing * .055);
    }
  }
  if (ride.x < 37 || ride.x > DISTRICT_WIDTH - 37) {
    ride.x = clamp(ride.x, 37, DISTRICT_WIDTH - 37);
    if (Math.abs(ride.v) > 105) impact = Math.max(impact, Math.abs(ride.v));
    ride.v = 0;
  }
  if (impact) ride.hp = Math.max(0, ride.hp - impact * .085 * (armor ? 1 - GARAGE_TUNE.damage : 1));
  return impact;
}
export function commute(ride: Ride, dt: number) {
  if (!ride.traffic || ride.hp <= 0) return;
  ride.v = toward(ride.v, ride.dir * (ride.kind === 'van' ? 93 : 127), 100 * dt);
  ride.depth = toward(ride.depth, ride.lane, 4 * dt);
  ride.x += ride.v * dt;
  if (ride.x < -75) ride.x = DISTRICT_WIDTH + 75;
  if (ride.x > DISTRICT_WIDTH + 75) ride.x = -75;
}
