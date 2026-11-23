import { clamp } from './config.ts';
import { roofs, STREET } from './district.ts';

export const weapons = [
  { name: 'Fists', range: 39, damage: 23, delay: .31, mag: 0, refill: 0, reload: 0, spread: 14 },
  { name: 'Pipe', range: 55, damage: 36, delay: .47, mag: 0, refill: 0, reload: 0, spread: 15 },
  { name: 'Pistol', range: 266, damage: 34, delay: .30, mag: 8, refill: 24, reload: .88, spread: 11 },
  { name: 'Shotgun', range: 159, damage: 66, delay: .72, mag: 4, refill: 12, reload: 1.18, spread: 26 },
  { name: 'SMG', range: 233, damage: 17, delay: .106, mag: 18, refill: 54, reload: 1.05, spread: 17 },
  { name: 'Rifle', range: 370, damage: 30, delay: .19, mag: 12, refill: 36, reload: 1.27, spread: 9 },
] as const;
export type WeaponId = 0 | 1 | 2 | 3 | 4 | 5;
export interface Magazine { rounds: number; reserve: number }
export interface AttackInput { fire?: boolean; reload?: boolean; slot?: WeaponId; aim?: boolean; incline?: number }
export interface Actor {
  id: string; x: number; y: number; covered: boolean; hp: number; dir: number; stride: number;
  hit: number; down: number; outfit: number; hair: number; skin: number;
  role: 'pedestrian' | 'merchant' | 'gang' | 'officer'; faction?: number;
  panic: number; hostile: boolean; weapon: WeaponId; ready: number; pose: number; robbed: boolean;
}
export interface Drop { x: number; y: number; covered: boolean; weapon?: WeaponId; cash?: number }
export interface Trace { x: number; y: number; toX: number; toY: number; life: number }
export interface CombatResult { target?: Actor; killed: boolean; loud: boolean }
export const actorAt = (id: string, x: number, style: number, role: Actor['role'] = 'pedestrian', weapon: WeaponId = 0): Actor => ({
  id, x, y: STREET, covered: false, hp: 100, dir: style % 2 ? -1 : 1, stride: 0, hit: 0, down: 0,
  outfit: style % 6, hair: style % 4, skin: style % 5, role, panic: 0, hostile: false, weapon, ready: 0, pose: 0, robbed: false,
});
export const clearShot = (x: number, y: number, tx: number, ty: number) => !roofs.some(roof => {
  if ((y >= roof.y) === (ty >= roof.y)) return false;
  const cross = x + (tx - x) * (roof.y - y) / (ty - y);
  return cross >= roof.left - 2 && cross <= roof.right + 2;
});

export class Armory {
  stock: Partial<Record<WeaponId, Magazine>> = { 0: { rounds: 0, reserve: 0 } };
  slot: WeaponId = 0;
  cooldown = 0;
  loading = 0;
  pose = 0;
  aiming = false;
  slope = 0;
  trace: Trace | null = null;

  get gun() { return weapons[this.slot]; }
  get ammo() { return this.stock[this.slot]!; }

  supply(id: WeaponId) {
    const gun = weapons[id];
    const existing = this.stock[id];
    if (existing) existing.reserve = Math.min(gun.refill * 4, existing.reserve + gun.refill);
    else {
      this.stock[id] = { rounds: gun.mag, reserve: gun.refill };
      this.slot = id;
      this.loading = 0;
    }
  }

  step(dt: number, input: AttackInput, body: { x: number; y: number; dir: number; covered: boolean },
    targets: Actor[], sound: (cue: string) => void): CombatResult | undefined {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.pose = Math.max(0, this.pose - dt);
    if (this.trace && (this.trace.life -= dt) <= 0) this.trace = null;
    if (input.slot !== undefined && input.slot !== this.slot && this.stock[input.slot]) {
      this.slot = input.slot;
      this.loading = 0;
      this.pose = 0;
    }
    this.aiming = Boolean(input.aim && this.gun.mag);
    this.slope = this.aiming ? (input.incline ?? 0) * .37 : 0;
    const gun = this.gun;
    const ammo = this.ammo;
    if (this.loading) {
      this.loading = Math.max(0, this.loading - dt);
      if (this.loading) return;
      const moved = Math.min(gun.mag - ammo.rounds, ammo.reserve);
      ammo.rounds += moved;
      ammo.reserve -= moved;
      sound('ready');
      return;
    }
    if (input.reload && ammo.rounds < gun.mag && ammo.reserve) {
      this.loading = gun.reload;
      sound('reload');
      return;
    }
    if (!input.fire || this.cooldown) return;
    this.cooldown = gun.delay;
    if (gun.mag && !ammo.rounds) {
      sound('empty');
      return;
    }
    this.pose = gun.mag ? .14 : .24;
    if (gun.mag) ammo.rounds--;
    const x = body.x;
    const y = body.y - 31;
    const slope = this.slope;
    let target: Actor | undefined;
    let nearest = gun.range + 1;
    for (const actor of targets) {
      if (actor.hp <= 0 || actor.covered !== body.covered) continue;
      const dist = (actor.x - x) * body.dir;
      if (dist < -8 || dist > gun.range || dist >= nearest ||
        Math.abs(actor.y - 31 - y - Math.max(0, dist) * slope) > gun.spread ||
        !clearShot(x, y, actor.x, actor.y - 31)) continue;
      target = actor;
      nearest = dist;
    }
    if (gun.mag) {
      const max = target ? nearest : gun.range;
      let dist = max;
      if (!target) for (let step = 12; step < max; step += 12)
        if (!clearShot(x, y, x + body.dir * step, y + slope * step)) { dist = step; break; }
      this.trace = { x: x + body.dir * 24, y: y + slope * 24, toX: x + body.dir * dist, toY: y + slope * dist, life: .095 };
    }
    sound(gun.mag ? (this.slot === 3 ? 'blast' : 'shot') : target ? 'hit' : 'swing');
    if (target) {
      const damage = this.slot === 3 ? gun.damage * clamp(1.34 - nearest / gun.range, .45, 1) : gun.damage;
      target.hp = Math.max(0, target.hp - damage);
      target.hit = .23;
      if (!target.hp) target.down = .01;
    }
    return { target, killed: target?.hp === 0, loud: gun.mag > 0 };
  }
}
