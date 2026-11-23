import { weapons, type Drop, type Magazine, type WeaponId } from './combat.ts';
import { CARS } from './config.ts';
import { CELLAR, DISTRICT_WIDTH, inside, passages, SPAWN, STREET } from './district.ts';
import { type Identity } from './police.ts';
import { paints } from './shops.ts';
import { decodeSave, SAVE_KEY } from './save.ts';
import { fleet, type Ride } from './vehicles.ts';

export const SANDBOX_KEY = 'state-of-crime.sandbox.v2';
export interface SandboxSave {
  version: 2; x: number; covered: boolean; hp: number; cash: number; outfit: number; hair: number;
  engine: boolean; armor: boolean; stock: Partial<Record<WeaponId, Magazine>>; selected: WeaponId;
  regions: ['Crownwater']; robbed: string[]; defeated: string[]; drops: Drop[];
  rides: Pick<Ride, 'id' | 'x' | 'lane' | 'dir' | 'hp' | 'color' | 'taken'>[];
  driving: string | null; heat: number; evidence: Identity | null; lead: number | null; leadY?: number;
}
type Status = 'saved' | 'unavailable' | 'changed';
const obj = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const between = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number): value is number => between(value, min, max) && Number.isInteger(value);
const initialFleet = new Map(fleet().map(ride => [ride.id, ride]));
const colorValid = (color: unknown): color is string => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);
const validIds = (ids: unknown): ids is string[] =>
  Array.isArray(ids) && ids.length <= 40 && ids.every(id => typeof id === 'string' && id.length <= 32);
const streetX = (x: unknown): x is number => between(x, 22, DISTRICT_WIDTH - 22);
const isSlot = (slot: unknown): slot is WeaponId => integer(slot, 0, 5);
const validDrops = (drops: unknown): drops is Drop[] => Array.isArray(drops) && drops.length <= 32 && drops.every(d =>
  obj(d) && streetX(d.x) && between(d.y, 185, CELLAR) && typeof d.covered === 'boolean' && (!d.covered || inside(d.x)) &&
  (d.weapon !== undefined || d.cash !== undefined) && (d.weapon === undefined || isSlot(d.weapon)) &&
  (d.cash === undefined || integer(d.cash, 0, 1000)));
const validRide = (r: unknown): r is SandboxSave['rides'][number] => {
  if (!obj(r) || typeof r.id !== 'string' || !streetX(r.x) || !integer(r.lane, -1, 1) || (r.dir !== -1 && r.dir !== 1)
    || typeof r.taken !== 'boolean') return false;
  const initial = initialFleet.get(r.id);
  return initial !== undefined && between(r.hp, 0, CARS[initial.kind].health) &&
    (r.color === initial.color || typeof r.color === 'string' && paints.includes(r.color));
};
function migrate(legacy: string | null, initial: SandboxSave): SandboxSave | null {
  const v1 = decodeSave(legacy);
  if (!v1) return null;
  return { ...initial, x: SPAWN, cash: v1.cash, engine: v1.engine, armor: v1.armor };
}
export function decodeSandbox(raw: string | null): SandboxSave | null {
  try {
    const p: unknown = JSON.parse(raw ?? 'null');
    if (!obj(p) || p.version !== 2 || !streetX(p.x) || !between(p.hp, 1, 100) || !integer(p.cash, 0, 10_000_000)
      || typeof p.covered !== 'boolean' || (p.covered && !inside(p.x))
      || !integer(p.outfit, 0, 2) || !integer(p.hair, 0, 2) || typeof p.engine !== 'boolean' || typeof p.armor !== 'boolean'
      || !Array.isArray(p.regions) || p.regions.length !== 1 || p.regions[0] !== 'Crownwater'
      || !validIds(p.robbed) || !validIds(p.defeated) || !validDrops(p.drops)
      || !Array.isArray(p.rides) || p.rides.length > initialFleet.size || !p.rides.every(validRide)
      || new Set(p.rides.map(r => r.id)).size !== p.rides.length
      || (p.driving !== null && (p.covered || !p.rides.some(r => r.id === p.driving && r.taken && r.hp > 0)))
      || !between(p.heat, 0, 200) || (p.lead !== null && !streetX(p.lead))
      || (p.leadY !== undefined && (p.lead === null || !between(p.leadY, 0, CELLAR)))
      || !obj(p.stock) || !isSlot(p.selected)) return null;
    const stock: SandboxSave['stock'] = {};
    for (const [id, ammo] of Object.entries(p.stock)) {
      const slot = Number(id);
      if (!isSlot(slot) || String(slot) !== id || !obj(ammo) || !integer(ammo.rounds, 0, weapons[slot].mag)
        || !integer(ammo.reserve, 0, weapons[slot].refill * 4)) return null;
      stock[slot] = { rounds: ammo.rounds, reserve: ammo.reserve };
    }
    if (!stock[0] || !stock[p.selected]) return null;
    const e = p.evidence;
    if (e !== null && (!obj(e) || !integer(e.outfit, 0, 2) || !integer(e.hair, 0, 2)
      || typeof e.ride !== 'string' || e.ride && !initialFleet.has(e.ride) || !(e.paint === '' || colorValid(e.paint)))) return null;
    return { version: 2, x: p.x, hp: p.hp, cash: p.cash, outfit: p.outfit, hair: p.hair, covered: p.covered,
      engine: p.engine, armor: p.armor, stock, selected: p.selected, regions: ['Crownwater'], robbed: p.robbed,
      defeated: p.defeated, drops: p.drops, rides: p.rides, driving: typeof p.driving === 'string' ? p.driving : null,
      heat: p.heat, evidence: e as Identity | null, lead: p.lead,
      ...(typeof p.leadY === 'number' && { leadY: p.leadY }) };
  } catch { return null; }
}
export function sandboxStorage(initial: SandboxSave, storage: Pick<Storage, 'getItem' | 'setItem'> | undefined) {
  let expected: string | null = null;
  let saved: SandboxSave | null = null;
  let warning = '';
  try {
    if (!storage) throw Error();
    expected = storage.getItem(SANDBOX_KEY);
    saved = expected === null ? migrate(storage.getItem(SAVE_KEY), initial) : decodeSandbox(expected);
    if (expected !== null && !saved) warning = 'Save unreadable · start a new game';
  } catch { warning = 'Storage unavailable · this session only'; }
  return {
    saved, warning,
    write(next: SandboxSave, replace = false): Status {
      if (!storage) return 'unavailable';
      try {
        const current = storage.getItem(SANDBOX_KEY);
        if (!replace && current !== expected) return 'changed';
        const raw = JSON.stringify(next);
        if (raw !== current) storage.setItem(SANDBOX_KEY, raw);
        expected = raw;
        return 'saved';
      } catch { return 'unavailable'; }
    },
  };
}
export const savedHeight = (save: SandboxSave) => save.covered ? CELLAR : STREET;

export function recoverCheckpoint(save: SandboxSave, wanted: boolean): SandboxSave {
  const recovered = { ...save, hp: 70 };
  if (!wanted || save.covered) return recovered;
  const distance = (p: (typeof passages)[number]) => Math.min(...p.doors.map(x => Math.abs(x - save.x)));
  const shelter = passages.reduce((nearest, p) => distance(p) < distance(nearest) ? p : nearest);
  return { ...recovered, x: Math.round((shelter.left + shelter.right) / 2), covered: true, driving: null };
}
