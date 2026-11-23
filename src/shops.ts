import type { WeaponId } from './combat.ts';
import type { Business } from './crime.ts';

export type Stock = {
  name: string; price: number; info: string;
} & (
  { kind: 'outfit' | 'hair'; value: number } |
  { kind: 'paint'; value: string } |
  { kind: 'gear'; value: WeaponId } |
  { kind: 'med' | 'ammo' | 'engine' | 'armor' }
);
export const paints = ['#64c8b8', '#e7ba6d', '#ba88c9'];
export const isCosmetic = (item: Stock) => item.kind === 'paint' || item.kind === 'hair' || item.kind === 'outfit';
export const shopStock: Record<Business['id'], Stock[]> = {
  threads: [
    { kind: 'outfit', value: 0, name: 'Rust Runner', price: 30, info: 'Cropped rust jacket' },
    { kind: 'outfit', value: 1, name: 'Canal Overcoat', price: 38, info: 'Long sea-green coat' },
    { kind: 'outfit', value: 2, name: 'Indigo Workwear', price: 50, info: 'Wide-shouldered indigo jacket' },
  ],
  hair: [
    { kind: 'hair', value: 0, name: 'Side Part', price: 21, info: 'Swept dark hair' },
    { kind: 'hair', value: 1, name: 'Copper Tail', price: 26, info: 'Long tied copper hair' },
    { kind: 'hair', value: 2, name: 'High Curls', price: 34, info: 'Full cropped curls' },
  ],
  arms: [
    { kind: 'gear', value: 2, name: 'Pistol', price: 68, info: 'Versatile and inexpensive' },
    { kind: 'gear', value: 3, name: 'Shotgun', price: 110, info: 'Best at close range' },
    { kind: 'gear', value: 4, name: 'SMG', price: 135, info: 'Fast automatic fire' },
    { kind: 'gear', value: 5, name: 'Rifle', price: 168, info: 'Long-range precision' },
    { kind: 'ammo', name: 'Ammo pack', price: 22, info: 'For the equipped firearm' },
  ],
  med: [{ kind: 'med', name: 'First-aid service', price: 29, info: 'Restore 60 health' }],
  paint: [
    { kind: 'paint', value: paints[0], name: 'Sea Glass', price: 43, info: 'Turquoise lacquer' },
    { kind: 'paint', value: paints[1], name: 'Sun Alloy', price: 56, info: 'Warm brass enamel' },
    { kind: 'paint', value: paints[2], name: 'Orchid Smoke', price: 58, info: 'Iridescent violet' },
    { kind: 'engine', name: 'Engine tune', price: 125, info: 'Faster acceleration and top speed' },
    { kind: 'armor', name: 'Reinforced shell', price: 95, info: 'Reduce collision damage' },
  ],
};
