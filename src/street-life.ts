import { clamp } from './config.ts';
import { actorAt, clearShot, type Actor, type Drop, type WeaponId } from './combat.ts';
import { businesses } from './crime.ts';
import { DISTRICT_WIDTH } from './district.ts';

export const factions = [
  { name: 'Vesper Toll', reflex: 1.2, speed: 118, territory: 1457, reach: 380, palette: 5 },
  { name: 'Canal Thread', reflex: .87, speed: 146, territory: 2267, reach: 321, palette: 1 },
  { name: 'Glasshouse Union', reflex: 1.56, speed: 101, territory: 3043, reach: 341, palette: 3 },
];
export function streetLife() {
  const people = Array.from({ length: 17 }, (_, i) => actorAt('passerby-' + i, 246 + 185 * i + (i % 3) * 23, i + 1));
  for (const [i, shop] of businesses.entries()) people.push(actorAt(shop.id, shop.x, i * 2 + 1, 'merchant'));
  factions.forEach((faction, i) => {
    for (let j = 0; j < 3; j++) {
      const member = actorAt('crew-' + i + '-' + j, faction.territory + (j - 1) * 74,
        faction.palette + j * 6, 'gang', ([1, 2, i === 2 ? 3 : 1] as WeaponId[])[j]);
      member.faction = i;
      member.hp = 72;
      people.push(member);
    }
  });
  return people;
}
export function advanceCrowd(actor: Actor, player: { x: number; y: number; covered: boolean }, dt: number,
  sound: (cue: string) => void, hurt: (damage: number) => void) {
  actor.hit = Math.max(0, actor.hit - dt);
  actor.pose = Math.max(0, actor.pose - dt);
  if (!actor.hp) { actor.down += dt; return; }
  actor.panic = Math.max(0, actor.panic - dt);
  actor.ready = Math.max(0, actor.ready - dt);
  const crew = actor.faction === undefined ? undefined : factions[actor.faction];
  let pace = actor.panic ? 159 : 24 + actor.outfit * 4;
  const gap = Math.abs(actor.x - player.x);
  if (crew) {
    const sameFloor = Math.abs(player.y - actor.y) < 40 && !player.covered;
    if (actor.hostile && (!sameFloor && gap > 125 || Math.abs(player.x - crew.territory) > crew.reach)) actor.hostile = false;
    if (actor.hostile && sameFloor) {
      const gun = actor.weapon >= 2;
      actor.dir = player.x < actor.x ? -1 : 1;
      pace = crew.speed;
      if (gap < (gun ? 168 : 34) && clearShot(actor.x, actor.y - 30, player.x, player.y - 30)) {
        pace = 0;
        if (!actor.ready && !actor.hit) {
          actor.pose = .25;
          actor.ready = crew.reflex;
          sound(gun ? 'shot' : 'swing');
          hurt(gun ? 12 : 9);
        }
      }
    } else {
      pace = Math.abs(actor.x - crew.territory) > 103 ? 61 : 12;
      if (Math.abs(actor.x - crew.territory) > 103) actor.dir = actor.x < crew.territory ? 1 : -1;
    }
  } else if (actor.role === 'merchant' && !actor.panic) pace = 0;
  pace = actor.hit ? pace * .24 + 5 : pace;
  actor.x = clamp(actor.x + actor.dir * pace * dt, 25, DISTRICT_WIDTH - 25);
  actor.stride += pace * dt / 14;
  if ((actor.x <= 25 && actor.dir < 0) || (actor.x >= DISTRICT_WIDTH - 25 && actor.dir > 0)) actor.dir *= -1;
}
export const gangLoot = (actor: Actor): Drop => ({
  x: actor.x, y: actor.y, covered: actor.covered, cash: 31 + (actor.faction ?? 0) * 9,
  weapon: actor.weapon || undefined,
});
