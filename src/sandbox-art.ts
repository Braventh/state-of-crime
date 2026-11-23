import { vehicle } from './art.ts';
import { portrait } from './character-art.ts';
import { weapons } from './combat.ts';
import { W } from './config.ts';
import { businesses } from './crime.ts';
import { STREET } from './district.ts';
import { form, lettering, renderDistrict } from './district-art.ts';
import type { Sandbox } from './sandbox.ts';
import { factions } from './street-life.ts';
import { rideY } from './vehicles.ts';

type Ctx = CanvasRenderingContext2D;

export function renderSandbox(c: Ctx, game: Sandbox, time: number, reduced: boolean) {
  renderDistrict(c, game.body, game.camera, time, reduced, context => {
    const cam = game.camera;
    const visible = (x: number) => x > cam - 70 && x < cam + W + 70;
    for (const shop of businesses) if (visible(shop.x)) {
      const { x } = shop, y = STREET - 73, half = 14 + shop.name.length * 3.25;
      form(context, '#272333', x - half - 3, y + 6, x - half, y - 10, x + half, y - 10, x + half + 3, y + 6);
      lettering(context, shop.name.toUpperCase(), x, y + 1, shop.color, 10);
    }
    const signs: number[] = [];
    for (const actor of [...game.actors, ...game.police.officers]) if (visible(actor.x) && actor.down < 3) {
      portrait(context, actor.role === 'officer' ? { ...actor, hair: 4, weapon: actor.pose ? actor.weapon : 0 } : { ...actor, weapon: actor.hostile ? actor.weapon : 0 });
      if (actor.hp && !signs.some(x => Math.abs(x - actor.x) < 68)) {
        if (actor.role === 'officer') {
          lettering(context, 'PATROL', actor.x, actor.y - 91, '#9cc1ed', 8);
          signs.push(actor.x);
        } else if (actor.faction !== undefined && actor.hostile) {
          lettering(context, factions[actor.faction].name.toUpperCase(), actor.x, actor.y - 91, '#f2a48f', 8);
          signs.push(actor.x);
        }
      }
    }
    for (const lane of [-1, 0, 1]) for (const ride of game.rides) {
      if (!visible(ride.x) || Math.round(ride.depth) !== lane) continue;
      vehicle(context, ride.x, rideY(ride), ride.kind, ride.dir, ride.v, ride.hp > 0 ? ride.color : '#524b57',
        reduced ? 0 : time, false, false, ride === game.ride);
    }
    for (const ride of game.police.road) if (visible(ride.x))
      vehicle(context, ride.x, rideY(ride), ride.kind, ride.dir, ride.v, ride.color, reduced ? 0 : time, true, ride.kind === 'van');
    for (const warning of game.police.tells) {
      if (!visible(warning.ride.x)) continue;
      lettering(context, warning.block ? 'ROADBLOCK · CHANGE LANES' : 'RAM INCOMING', warning.ride.x,
        rideY(warning.ride) - 49, '#ffc7a3', 10);
    }
    for (const drop of game.drops) {
      if (!visible(drop.x)) continue;
      const bob = reduced ? 0 : Math.sin(time * 4 + drop.x) * 3;
      const { x, y } = drop;
      form(context, '#222231', x - 13, y - 7 + bob, x - 8, y - 13 + bob, x + 9, y - 13 + bob, x + 13, y - 8 + bob, x + 9, y - 3 + bob, x - 11, y - 3 + bob);
      form(context, '#f9d195', x - 8, y - 9 + bob, x + 9, y - 9 + bob, x + 7, y - 6 + bob, x - 9, y - 6 + bob);
      if (game.pickup === drop) lettering(context, drop.weapon === undefined ? 'CASH' : weapons[drop.weapon].name.toUpperCase(), x, y - 19, '#ffe4ae', 9);
    }
    const { trace, impact, pose, aiming, slope, slot, loading } = game.armory;
    if (trace) {
      context.strokeStyle = '#ffd180';
      context.lineWidth = 1.6;
      context.beginPath();
      context.moveTo(trace.x, trace.y);
      context.lineTo(trace.toX, trace.toY);
      context.stroke();
      form(context, '#fff1b0', trace.x - 5, trace.y - 3, trace.x, trace.y - 7, trace.x + 7, trace.y, trace.x + 3, trace.y + 4);
    }
    if (!game.ride) {
      const { x, y } = game.body;
      portrait(context, { ...game.body, outfit: game.outfit, hair: game.hair, skin: 1, hit: game.hit,
        down: game.hp ? 0 : .25, pose, aim: aiming, slope, weapon: slot, reload: loading > 0, player: true });
      if (game.hp) {
        form(context, '#211c29', x - 8, y - 79, x + 8, y - 79, x, y - 69);
        form(context, '#ffd6a2', x - 5, y - 77, x + 5, y - 77, x, y - 71);
      }
    }
    if (!game.ride && impact && impact.target.covered === game.body.covered && visible(impact.target.x)) {
      const { x, y } = impact.target;
      context.fillStyle = '#272333';
      context.fillRect(x - 18, y - 79, 36, 13);
      lettering(context, impact.killed ? 'DOWN' : 'HIT', x, y - 69, impact.killed ? '#f2a48f' : '#ffe4ae', 10);
    }
  });
}
