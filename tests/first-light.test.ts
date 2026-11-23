import assert from 'node:assert/strict';
import test from 'node:test';
import { POINTS } from '../src/config.ts';
import { Game } from '../src/game.ts';
import { resetInput, startInput } from '../src/input.ts';
import { fresh } from '../src/save.ts';

const keyboard = new EventTarget();
Object.defineProperties(globalThis, {
  window: { value: keyboard },
  HTMLInputElement: { value: class {} },
});
startInput(() => true);

function key(type: 'keydown' | 'keyup', code: string) {
  keyboard.dispatchEvent(Object.assign(new Event(type), { code }));
}

function dispatch(game: Game) {
  key('keydown', 'KeyE');
  game.step(1 / 60);
  resetInput();
}

function ready() {
  resetInput();
  const game = new Game({ ...fresh(), x: POINTS.contact.x }, () => {});
  game.traffic = [];
  return game;
}

test('First Light does not count a stationary vehicle far from the Kite', () => {
  const game = ready();
  dispatch(game);
  const otherCar = game.cars[1];
  game.body.x = otherCar.x;
  dispatch(game);
  assert.equal(game.car, otherCar);
  assert.match(game.goal().text, /Borrow the orange Kite/);
});

test('the First Light waypoint follows the Kite and a disabled Kite is replaced on retry', () => {
  const game = ready();
  const kite = game.cars[0];
  const initialX = kite.x;
  kite.x += 140;
  dispatch(game);
  assert.equal(game.goal().x, kite.x);
  game.body.x = kite.x;
  dispatch(game);
  assert.equal(game.car, kite);
  assert.match(game.goal().text, /orange Kite/);
  key('keydown', 'KeyD');
  for (let i = 0; i < 80; i++) game.step(1 / 60);
  resetInput();
  assert.equal(game.goal().x, POINTS.delivery.x);

  kite.x = 25;
  kite.v = -280;
  kite.hp = 5;
  game.step(1 / 60);
  assert.equal(game.job, null);
  assert.equal(game.car, null);
  game.heat = 0;
  game.body.x = POINTS.contact.x;
  dispatch(game);
  assert.equal(game.goal().x, initialX);
  assert.ok(game.cars.some(c => c !== kite && c.kind === 'compact' && c.x === initialX && c.hp > 0));
});
