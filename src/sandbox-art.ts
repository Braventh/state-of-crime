import { portrait } from './character-art.ts';
import { weapons } from './combat.ts';
import { W } from './config.ts';
import { form, lettering, renderDistrict } from './district-art.ts';
import type { Sandbox } from './sandbox.ts';

type Ctx = CanvasRenderingContext2D;

export function renderSandbox(c: Ctx, game: Sandbox, time: number, reduced: boolean) {
  renderDistrict(c, game.body, game.camera, time, reduced, context => {
    const cam = game.camera;
    const visible = (x: number) => x > cam - 70 && x < cam + W + 70;
    for (const actor of game.actors) if (visible(actor.x) && actor.down < 3) portrait(context, actor);
    for (const drop of game.drops) {
      if (!visible(drop.x)) continue;
      const bob = reduced ? 0 : Math.sin(time * 4 + drop.x) * 3;
      const { x, y } = drop;
      form(context, '#222231', x - 13, y - 7 + bob, x - 8, y - 13 + bob, x + 9, y - 13 + bob, x + 13, y - 8 + bob, x + 9, y - 3 + bob, x - 11, y - 3 + bob);
      form(context, '#f9d195', x - 8, y - 9 + bob, x + 9, y - 9 + bob, x + 7, y - 6 + bob, x - 9, y - 6 + bob);
      if (game.pickup === drop) lettering(context, drop.weapon === undefined ? 'CASH' : weapons[drop.weapon].name.toUpperCase(), x, y - 19, '#ffe4ae', 9);
    }
    const { trace, pose, aiming, slope, slot, loading } = game.armory;
    if (trace) {
      context.strokeStyle = '#ffd180';
      context.lineWidth = 1.6;
      context.beginPath();
      context.moveTo(trace.x, trace.y);
      context.lineTo(trace.toX, trace.toY);
      context.stroke();
      form(context, '#fff1b0', trace.x - 5, trace.y - 3, trace.x, trace.y - 7, trace.x + 7, trace.y, trace.x + 3, trace.y + 4);
    }
    portrait(context, { ...game.body, outfit: game.outfit, hair: game.hair, skin: 1, hit: game.hit,
      down: game.hp ? 0 : .25, pose, aim: aiming, slope, weapon: slot, reload: loading > 0 });
  });
}
