import { clamp, W } from './config.ts';
import { Armory, actorAt, type AttackInput, type Drop } from './combat.ts';
import { blockAt, DISTRICT_WIDTH, ladders, SPAWN, STREET } from './district.ts';
import { bodyAt, closeDoor, traverse, type MotionInput } from './traversal.ts';

export type SandboxInput = MotionInput & AttackInput;

export class Sandbox {
  body = bodyAt(SPAWN);
  time = 0;
  camera = 0;
  sound: (name: string) => void;
  hp = 100;
  hit = 0;
  outfit = 0;
  hair = 0;
  armory = new Armory();
  actors = Array.from({ length: 17 }, (_, i) => actorAt('passerby-' + i, 246 + 185 * i + (i % 3) * 23, i + 1));
  drops: Drop[] = [
    { x: 444, y: STREET, weapon: 1, covered: false },
    { x: 643, y: 188, weapon: 2, covered: false },
    { x: 1165, y: STREET, weapon: 2, covered: false },
    { x: 1794, y: 257, weapon: 3, covered: false },
    { x: 2160, y: STREET, weapon: 4, covered: false },
    { x: 3280, y: 190, weapon: 5, covered: false },
  ];

  constructor(sound: (name: string) => void = () => {}) { this.sound = sound; }

  get block() { return blockAt(this.body.x); }
  get pickup() {
    return this.drops.find(d => d.covered === this.body.covered && Math.abs(d.y - this.body.y) < 25 && Math.abs(d.x - this.body.x) < 29);
  }

  hurt(damage: number) {
    if (this.hit || !this.hp) return;
    this.hp = Math.max(0, this.hp - damage);
    this.hit = .4;
    this.sound('hit');
  }

  get prompt() {
    const pickup = this.pickup;
    if (pickup) return 'E  ·  Pick up gear';
    const door = closeDoor(this.body);
    if (door) return `E  ·  ${this.body.covered ? 'Return to street' : 'Enter ' + door.passage.name}`;
    if (!this.body.covered && ladders.some(l => Math.abs(l.x - this.body.x) < 24 && this.body.y >= l.high - 5 && this.body.y <= l.low + 2))
      return 'W / S  ·  Fire escape';
    return this.body.covered ? 'Find a lit door to return to the street' : 'Explore Crownwater';
  }

  step(dt: number, input: SandboxInput) {
    this.time += dt;
    this.hit = Math.max(0, this.hit - dt);
    if (!this.hp) return;
    const pickup = input.use && this.pickup;
    if (pickup) {
      if (pickup.weapon !== undefined) this.armory.supply(pickup.weapon);
      this.drops.splice(this.drops.indexOf(pickup), 1);
      this.sound('reward');
    }
    const cue = traverse(this.body, { ...input, vertical: input.aim ? 0 : input.vertical, use: input.use && !pickup }, dt);
    if (cue) this.sound(cue);
    const attack = this.armory.step(dt, input, this.body, this.actors, this.sound);
    if (attack?.target && !attack.killed) {
      attack.target.panic = 5;
      attack.target.dir = this.body.dir;
    }
    if (attack?.loud) for (const actor of this.actors) {
      if (actor.covered !== this.body.covered || Math.abs(actor.x - this.body.x) > 315 || actor.hp <= 0) continue;
      actor.panic = 4;
      actor.dir = actor.x < this.body.x ? -1 : 1;
    }
    for (const actor of this.actors) {
      actor.hit = Math.max(0, actor.hit - dt);
      if (!actor.hp) { actor.down += dt; continue; }
      actor.panic = Math.max(0, actor.panic - dt);
      const pace = actor.hit ? 20 : actor.panic ? 132 : 23 + actor.outfit * 4;
      actor.x += actor.dir * pace * dt;
      actor.stride += pace * dt / 14;
      if (actor.x <= 25 || actor.x >= DISTRICT_WIDTH - 25) actor.dir *= -1;
    }
    const target = clamp(this.body.x - W * .43, 0, DISTRICT_WIDTH - W);
    this.camera += (target - this.camera) * (1 - Math.exp(-7 * dt));
  }
}
