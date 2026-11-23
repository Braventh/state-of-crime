import assert from 'node:assert/strict';
import test from 'node:test';
import { CARS, EXCHANGE_ROOF, POINTS, ROAD, TUNE, UPGRADES } from '../src/config.ts';
import { Game } from '../src/game.ts';
import { resetInput, startInput } from '../src/input.ts';
import { fresh, loadSave } from '../src/save.ts';

const keyboard = new EventTarget();
Object.defineProperties(globalThis, {
  window: { value: keyboard },
  HTMLInputElement: { value: class {} },
});
let stored: string | null = null;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { setItem: (_key: string, value: string) => { stored = value; }, getItem: () => stored },
});
startInput(() => true);

function press(game: Game, code: string, seconds = 1 / 60) {
  keyboard.dispatchEvent(Object.assign(new Event('keydown'), { code }));
  for (let i = 0; i < seconds * 60; i++) game.step(1 / 60);
  resetInput();
}

function at(x: number, completed: number, cash = 840) {
  const game = new Game({ ...fresh(), x, completed, cash }, () => {});
  game.traffic = [];
  return game;
}

test('starting a timed job checkpoints its contact, not the loaner or pursuit', () => {
  const game = at(POINTS.delivery.x - 50, 1);
  press(game, 'KeyE');
  assert.equal(game.heat, 2);
  assert.equal(game.car?.kind, 'coupe');
  assert.ok(game.job);
  const saved = loadSave();
  assert.equal(saved?.x, POINTS.delivery.x);
  assert.equal(saved?.cash, 840);
  assert.equal(saved?.completed, 1);
  const retry = game.retry();
  assert.equal(retry.heat, 0);
  assert.equal(retry.car, null);
  assert.equal(retry.job, null);
  assert.equal(retry.prompt(), 'Talk to Mara');
});

test('Dead Air gates the cartridge to the roof and lets the player wait out the search', () => {
  const game = at(POINTS.refuge.x, 2);
  press(game, 'KeyE');
  game.body.x = POINTS.exchange.x;
  assert.equal(game.body.y, ROAD);
  assert.notEqual(game.prompt(), 'Take the cartridge');
  press(game, 'KeyE');
  assert.equal(game.job?.beacon, false);
  game.body.y = EXCHANGE_ROOF;
  assert.equal(game.prompt(), 'Take the cartridge');
  press(game, 'KeyE');
  assert.equal(game.job?.beacon, true);
  assert.match(game.goal().text, /Stay on the roof/);
  for (let i = 0; i < (TUNE.police.search[2] + 1) * 60; i++) game.step(1 / 60);
  assert.equal(game.heat, 0);
  game.body.x = POINTS.refuge.x;
  game.body.y = ROAD;
  press(game, 'KeyE');
  assert.equal(loadSave()?.completed, 3);
  assert.equal(loadSave()?.cash, 1410);
});

test('an outpost tune saves and its staged ride is used at the race', () => {
  const game = at(POINTS.outpost.x, 3);
  press(game, 'KeyE');
  assert.equal(game.garage, POINTS.outpost);
  game.purchase('engine');
  assert.equal(loadSave()?.cash, 840 - UPGRADES.engine);
  assert.equal(loadSave()?.engine, true);
  const resumed = game.retry();
  resumed.traffic = [];
  const ride = resumed.cars.find(car => car.personal);
  assert.equal(ride?.x, POINTS.outpost.x + 115);
  assert.ok(ride);
  resumed.body.x = ride.x;
  press(resumed, 'KeyE');
  assert.equal(resumed.car, ride);
  ride.x = POINTS.race.x;
  assert.match(resumed.prompt(), /race your Kite Compact/);
  press(resumed, 'KeyE');
  assert.equal(resumed.car, ride);
  press(resumed, 'KeyD', 2);
  assert.ok(ride.v > CARS.compact.speed);
});

test('Roux has a free loaner for players without a race-ready ride', () => {
  const game = new Game({ ...fresh(), x: POINTS.outpost.x, completed: 3, owned: ['compact', 'van'], selected: 'van' }, () => {});
  const van = game.cars.find(car => car.personal);
  assert.ok(van);
  game.body.x = van.x;
  press(game, 'KeyE');
  assert.equal(game.car, van);
  van.x = POINTS.race.x;
  assert.match(game.prompt(), /take the Sable loaner/);
  press(game, 'KeyE');
  assert.equal(game.car?.kind, 'coupe');
  assert.equal(game.car?.personal, undefined);
  assert.equal(game.progress.cash, fresh().cash);
});
