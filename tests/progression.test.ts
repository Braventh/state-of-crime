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
  assert.equal(retry.prompt()?.label, 'Talk to Mara');
});

test('a stale tab cannot replace another tab’s purchases or payout at job acceptance or after retry', () => {
  const earlier = at(POINTS.delivery.x, 1, 420);
  const later = at(POINTS.outpost.x, 2, 840);
  press(later, 'KeyE');
  later.purchase('engine');
  assert.equal(loadSave()?.engine, true);
  const shared = loadSave();
  press(earlier, 'KeyE');
  assert.ok(earlier.job);
  assert.equal(earlier.storageOK, false);
  assert.match(earlier.storageWarning, /changed elsewhere/);
  assert.deepEqual(loadSave(), shared);
  const retry = earlier.retry();
  press(retry, 'KeyE');
  assert.equal(retry.storageOK, false);
  assert.deepEqual(loadSave(), shared);
});

test('Dead Air gates the cartridge to the roof and lets the player wait out the search', () => {
  const game = at(POINTS.refuge.x, 2);
  press(game, 'KeyE');
  game.body.x = POINTS.exchange.x;
  assert.equal(game.body.y, ROAD);
  assert.notEqual(game.prompt()?.label, 'Take the cartridge');
  press(game, 'KeyE');
  assert.equal(game.job?.beacon, false);
  game.reportCrime(2);
  game.units.push({ x: game.x - 25, v: 0, lane: 0, dir: 1, heavy: false, ramAt: 0, readyAt: 0 });
  game.step(1 / 60);
  assert.equal(game.search, 0);
  game.body.y = EXCHANGE_ROOF.y;
  game.body.vy = 0;
  assert.equal(game.prompt()?.label, 'Take the cartridge');
  press(game, 'KeyE');
  assert.equal(game.job?.beacon, true);
  assert.match(game.goal().text, /Stay on the roof/);
  assert.ok(game.search > 0);
  game.body.x = EXCHANGE_ROOF.x + 10;
  game.step(1 / 60);
  assert.equal(game.spotted, false);
  assert.ok(game.search > 1 / 60);
  for (let i = 0; i < (TUNE.police.search[game.heat] + 1) * 60; i++) game.step(1 / 60);
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
  assert.match(resumed.prompt()?.label ?? '', /race your Kite Compact/);
  const launch = POINTS.race.x + 26;
  resumed.cars.push({ ...ride, personal: undefined, x: launch, lane: 0, yLane: 0 });
  press(resumed, 'KeyE');
  assert.equal(resumed.car, ride);
  assert.ok(ride.x - launch >= CARS.compact.width);
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
  assert.match(game.prompt()?.label ?? '', /take the Sable loaner/);
  press(game, 'KeyE');
  assert.equal(game.car?.kind, 'coupe');
  assert.equal(game.car?.personal, undefined);
  assert.equal(game.progress.cash, fresh().cash);
});
