import { clamp, W } from './config.ts';
import { blockAt, DISTRICT_WIDTH, ladders, SPAWN } from './district.ts';
import { bodyAt, closeDoor, traverse, type MotionInput } from './traversal.ts';

export class Sandbox {
  body = bodyAt(SPAWN);
  time = 0;
  camera = 0;
  sound: (name: string) => void;

  constructor(sound: (name: string) => void = () => {}) { this.sound = sound; }

  get block() { return blockAt(this.body.x); }

  get prompt() {
    const door = closeDoor(this.body);
    if (door) return `E  ·  ${this.body.covered ? 'Return to street' : 'Enter ' + door.passage.name}`;
    if (!this.body.covered && ladders.some(l => Math.abs(l.x - this.body.x) < 24 && this.body.y >= l.high - 5 && this.body.y <= l.low + 2))
      return 'W / S  ·  Fire escape';
    return this.body.covered ? 'Find a lit door to return to the street' : 'Explore Crownwater';
  }

  step(dt: number, input: MotionInput) {
    this.time += dt;
    const cue = traverse(this.body, input, dt);
    if (cue) this.sound(cue);
    const target = clamp(this.body.x - W * .43, 0, DISTRICT_WIDTH - W);
    this.camera += (target - this.camera) * (1 - Math.exp(-7 * dt));
  }
}
