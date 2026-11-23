import { CARS, JOBS, LIMIT, START, type CarKind } from './config.ts';

export const SAVE_KEY = 'state-of-crime.save.v1';
export const SETTINGS_KEY = 'state-of-crime.settings.v1';
export interface Progress {
  version: 1; cash: number; completed: number; x: number;
  owned: CarKind[]; selected: CarKind; engine: boolean; armor: boolean;
}
export interface Settings { volume: number; mute: boolean; reduced: boolean }
export const fresh = (): Progress => ({
  version: 1, cash: 120, completed: 0, x: START,
  owned: ['compact'], selected: 'compact', engine: false, armor: false,
});
export const defaults = (): Settings => ({ volume: .45, mute: false, reduced: false });
const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object';
const car = (x: unknown): x is CarKind => typeof x === 'string' && Object.hasOwn(CARS, x);
const numberIn = (x: unknown, low: number, high: number): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= low && x <= high;
export function decodeSave(raw: string | null): Progress | null {
  try {
    const p: unknown = JSON.parse(raw ?? 'null');
    if (!object(p) || p.version !== 1 || !numberIn(p.cash, 0, 10_000_000) || !Number.isInteger(p.cash)
      || !numberIn(p.completed, 0, JOBS.length) || !Number.isInteger(p.completed)
      || !numberIn(p.x, 0, LIMIT) || !Array.isArray(p.owned) || !p.owned.every(car)
      || !p.owned.includes('compact') || !car(p.selected) || !p.owned.includes(p.selected)
      || typeof p.engine !== 'boolean' || typeof p.armor !== 'boolean') return null;
    return { version: 1, cash: p.cash, completed: p.completed, x: p.x, owned: [...new Set(p.owned)],
      selected: p.selected, engine: p.engine, armor: p.armor };
  } catch { return null; }
}
export function decodeSettings(raw: string | null): Settings {
  try {
    const s: unknown = JSON.parse(raw ?? 'null');
    if (object(s) && numberIn(s.volume, 0, 1) && typeof s.mute === 'boolean' && typeof s.reduced === 'boolean')
      return { volume: s.volume, mute: s.mute, reduced: s.reduced };
  } catch { return defaults(); }
  return defaults();
}
function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export const loadSave = () => decodeSave(read(SAVE_KEY));
export const loadSettings = () => decodeSettings(read(SETTINGS_KEY));
export const storeSave = (p: Progress) => write(SAVE_KEY, p);
export const storeSettings = (s: Settings) => write(SETTINGS_KEY, s);
