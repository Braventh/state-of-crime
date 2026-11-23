import { clamp, toward, TUNE } from './config.ts';
import { CELLAR, inside, ladders, passages, roofs, STREET, street, type Surface } from './district.ts';

export interface Motion {
  x: number; y: number; vx: number; vy: number; dir: number;
  grounded: boolean; covered: boolean; climb: boolean; stride: number; grace: number; buffer: number;
}
export interface MotionInput { side: number; vertical: number; fast?: boolean; jump?: boolean; use?: boolean }
const outdoorSurfaces: Surface[] = [...roofs, street].sort((a, b) => a.y - b.y);
export const bodyAt = (x: number): Motion => ({
  x, y: STREET, vx: 0, vy: 0, dir: 1, grounded: true, covered: false, climb: false, stride: 0, grace: 0, buffer: 0,
});
export const closeDoor = (body: Motion) => {
  if (!body.grounded || (body.y !== STREET && !body.covered)) return;
  for (const passage of passages) for (const door of passage.doors)
    if (Math.abs(body.x - door) < 27) return { door, passage };
};
export const nearbyLadder = (body: Motion) => body.covered ? undefined
  : ladders.find(l => Math.abs(l.x - body.x) <= 24 && body.y >= l.high - 1 && body.y <= l.low + 1);

export function traverse(body: Motion, input: MotionInput, dt: number) {
  const doorway = input.use && closeDoor(body);
  if (doorway) {
    body.x = doorway.door;
    body.covered = !body.covered;
    body.y = body.covered ? CELLAR : STREET;
    body.vx = body.vy = body.buffer = 0;
    return 'door';
  }
  const ladder = nearbyLadder(body);
  if (ladder && input.vertical && (body.climb || (input.vertical < 0 ? body.y > ladder.high : body.y < ladder.low))) {
    body.climb = true;
    body.x = toward(body.x, ladder.x, 170 * dt);
    body.y = clamp(body.y + input.vertical * 125 * dt, ladder.high, ladder.low);
    body.vx = body.vy = 0;
    body.stride += 8 * dt;
    body.grounded = body.y === ladder.high || body.y === ladder.low;
    return;
  }
  if (body.climb && !input.side && !input.jump && ladder && !body.grounded) return;
  body.climb = false;
  const room = body.covered ? inside(body.x) : undefined;
  const surfaces: Surface[] = room ? [{ left: room.left, right: room.right, y: CELLAR }] : outdoorSurfaces;
  const bounds = room ?? street;
  if (input.side) body.dir = Math.sign(input.side);
  const speed = input.fast ? TUNE.run : TUNE.walk;
  body.vx = toward(body.vx, input.side * speed, dt * (input.side ? 1240 : 1900));
  body.x = clamp(body.x + body.vx * dt, bounds.left + (room ? 9 : 0), bounds.right - (room ? 9 : 0));
  body.stride += Math.abs(body.vx) * dt / 13;
  body.grace = body.grounded ? TUNE.coyote : Math.max(0, body.grace - dt);
  body.buffer = input.jump ? TUNE.jumpBuffer : Math.max(0, body.buffer - dt);
  let jumped = false;
  if (body.buffer && body.grace) {
    body.buffer = body.grace = 0;
    body.vy = -(body.covered ? 230 : TUNE.jump);
    jumped = true;
  }
  const wasY = body.y;
  body.vy += TUNE.gravity * dt;
  body.y += body.vy * dt;
  body.grounded = false;
  if (body.vy >= 0) {
    for (const surface of surfaces) {
      if (body.x < surface.left || body.x > surface.right || wasY > surface.y || body.y < surface.y) continue;
      body.y = surface.y;
      body.vy = 0;
      body.grounded = true;
      break;
    }
  }
  if (jumped) return 'jump';
}
