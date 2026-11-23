import assert from 'node:assert/strict';
import test from 'node:test';
import { CARS, GARAGE_TUNE, LIMIT, POINTS, type CarKind } from '../src/config.ts';
import { Game } from '../src/game.ts';
import { clearEdges, resetInput, startInput } from '../src/input.ts';
import { fresh } from '../src/save.ts';

const input = new EventTarget();
Object.assign(globalThis, { window: input, HTMLInputElement: class {} });
startInput(() => false);
test.beforeEach(resetInput);

function key(code: string, down = true) {
  input.dispatchEvent(Object.assign(new Event(down ? 'keydown' : 'keyup'), { code }));
}

function ticks(game: Game, frames = 1) {
  for (let i = 0; i < frames; i++) {
    game.step(1 / 60);
    clearEdges();
  }
}

function setup(kind: CarKind = 'compact', owned = false) {
  const game = new Game(fresh(), () => {});
  const car = Object.assign(game.cars[0], { x: 1800, kind, owned, hp: CARS[kind].health });
  game.car = car;
  game.cars = [car];
  game.traffic = [];
  return { game, car };
}

test('the coupe accelerates and changes lanes quickest, with the van last', () => {
  const rides = (['coupe', 'compact', 'van'] as const).map(kind => setup(kind));
  key('KeyD');
  for (const { game } of rides) ticks(game, 15);
  assert.ok(rides[0].car.v > rides[1].car.v && rides[1].car.v > rides[2].car.v);
  for (const { game } of rides) {
    key('KeyS');
    ticks(game, 6);
    key('KeyS', false);
  }
  assert.ok(rides[0].car.yLane > rides[1].car.yLane && rides[1].car.yLane > rides[2].car.yLane);
});

test('off-throttle coasting settles, and Space brakes even with throttle held', () => {
  for (const kind of ['compact', 'coupe', 'van'] as const) {
    const { game, car } = setup(kind);
    car.v = CARS[kind].speed;
    ticks(game, 180);
    assert.equal(car.v, 0, kind);

    car.v = CARS[kind].speed;
    key('Space');
    key('KeyD');
    ticks(game, 42);
    assert.equal(car.v, 0, kind);
    resetInput();
  }
});

test('rear-ending traffic separates the hitboxes, then traffic clears the lane', () => {
  const { game, car } = setup();
  car.v = CARS.compact.speed;
  const traffic = { ...car, kind: 'van' as const, x: car.x + 70, v: 112 };
  game.traffic = [traffic];
  key('KeyD');
  ticks(game);
  assert.equal(car.hp, CARS.compact.health - 10);
  assert.ok(traffic.x - car.x >= (CARS.compact.width + CARS.van.width) / 2 - 1e-9);
  assert.ok(car.v < traffic.v);
  ticks(game, 65);
  assert.equal(car.hp, CARS.compact.health - 10);
  assert.ok(car.x > traffic.x);
});

test('a gentle catch-up matches traffic speed without damage', () => {
  const { game, car } = setup();
  car.v = 133;
  const traffic = { ...car, x: car.x + CARS.compact.width + .2, v: 107 };
  game.traffic = [traffic];
  key('KeyD');
  ticks(game);
  assert.equal(car.hp, CARS.compact.health);
  assert.equal(car.v, traffic.v);
});

test('a parked car is solid, but another lane is clear to pass', () => {
  const { game, car } = setup();
  car.v = CARS.compact.speed;
  const parked = { ...car, x: car.x + CARS.compact.width + 1, v: 0 };
  game.cars.push(parked);
  key('KeyD');
  ticks(game);
  assert.equal(car.hp, CARS.compact.health - 10);
  assert.equal(parked.x - car.x, CARS.compact.width);
  key('KeyW');
  ticks(game, 60);
  assert.ok(car.x > parked.x);
  assert.equal(parked.yLane, 0);
});

test('retrying Cut Across replaces its previous loaner before launch', () => {
  const game = new Game({ ...fresh(), completed: 3, x: POINTS.race.x }, () => {});
  game.traffic = [];
  key('KeyE');
  ticks(game);
  key('KeyE', false);
  const firstLoan = game.car!;
  firstLoan.x += 12;
  game.job!.time = 0;
  ticks(game);
  key('KeyE');
  key('KeyD');
  ticks(game, 6);
  assert.ok(!game.cars.includes(firstLoan));
  assert.ok(game.car!.x > POINTS.race.x + 26);
});

test('road ends stop the whole vehicle without repeatedly damaging it', () => {
  for (const sign of [-1, 1]) {
    const { game, car } = setup('van');
    const edge = Math.ceil(CARS.van.width / 2) + 4;
    car.x = sign < 0 ? edge + 1 : LIMIT - edge - 1;
    car.v = CARS.van.speed * sign;
    key(sign < 0 ? 'KeyA' : 'KeyD');
    ticks(game, 75);
    assert.equal(car.x, sign < 0 ? edge : LIMIT - edge);
    assert.equal(car.v, 0);
    assert.equal(car.hp, CARS.van.health - 13);
    resetInput();
  }
});

test('E does not cancel driving momentum but exits and re-enters after braking', () => {
  const { game, car } = setup('compact', true);
  car.v = 200;
  assert.deepEqual(game.prompt(), { key: 'Space', label: 'Brake to exit' });
  key('KeyE');
  ticks(game);
  key('KeyE', false);
  assert.equal(game.car, car);
  assert.ok(car.v > 175);
  key('Space');
  ticks(game, 30);
  key('Space', false);
  assert.deepEqual(game.prompt(), { key: 'E', label: 'Exit Kite Compact' });
  key('KeyE');
  ticks(game);
  key('KeyE', false);
  assert.equal(game.car, null);
  assert.deepEqual(game.prompt(), { key: 'E', label: 'Enter Kite Compact' });
  key('KeyE');
  ticks(game);
  assert.equal(game.car, car);
  assert.equal(game.heat, 0);
});

test('garage upgrades increase owned speed and reduce impact damage without tuning street cars', () => {
  for (const owned of [true, false]) {
    const { game, car } = setup('compact', owned);
    game.progress.cash = 840;
    game.purchase('engine');
    game.purchase('armor');
    assert.equal(game.progress.cash, 80);
    key('KeyD');
    ticks(game, 65);
    assert.equal(car.v, CARS.compact.speed * (owned ? 1 + GARAGE_TUNE.speed : 1));
    car.x = LIMIT - Math.ceil(CARS.compact.width / 2) - 5;
    ticks(game);
    assert.equal(car.hp, CARS.compact.health - 13 * (owned ? 1 - GARAGE_TUNE.damage : 1));
    resetInput();
  }
});
