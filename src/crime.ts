export const severity = {
  assault: 15, robbery: 30, shopRobbery: 43, theft: 23, carjacking: 34, gangFight: 18,
  gunfire: 13, civilianDown: 47, officerAttacked: 41, officerDown: 70, damage: 15, wreck: 32,
};
export type CrimeKind = keyof typeof severity;
export interface Crime {
  kind: CrimeKind; x: number; y: number; covered: boolean; witnesses: number;
}

export const businesses = [
  { id: 'threads', name: 'Velvet Loom', x: 647, color: '#ecaa94', till: 86 },
  { id: 'hair', name: 'Copper Comb', x: 1018, color: '#b8dabc', till: 102 },
  { id: 'arms', name: 'Anchor Supply', x: 1231, color: '#e7c68c', till: 125 },
  { id: 'med', name: 'Sundown Pharmacy', x: 1941, color: '#a7decb', till: 108 },
  { id: 'paint', name: 'Prism Motorworks', x: 2531, color: '#e3899d', till: 153 },
] as const;
export type Business = (typeof businesses)[number];
