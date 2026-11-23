import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { businesses } from '../src/crime.ts';
import { Sandbox } from '../src/sandbox.ts';
import { shopStock } from '../src/shops.ts';
import { bodyAt } from '../src/traversal.ts';
import { makeRide } from '../src/vehicles.ts';

const neutral = { side: 0, vertical: 0 };

test('Shop robbery pays once, reports witnesses, and panics the clerk without any mission', () => {
  const game = new Sandbox();
  const shop = businesses[0];
  game.body = bodyAt(shop.x);
  const start = game.cash;
  game.step(1 / 60, { ...neutral, rob: true });
  assert.equal(game.cash, start + shop.till);
  assert.equal(game.crime?.kind, 'shopRobbery');
  assert.ok(game.crime!.witnesses > 0);
  assert.ok(game.actors.find(actor => actor.id === shop.id)!.panic > 0);
  for (const other of game.actors) if (other.id !== shop.id) other.robbed = true;
  game.step(1 / 60, { ...neutral, rob: true });
  assert.equal(game.cash, start + shop.till);
});

test('An attacked gang alerts only its faction and defeated members leave cash and gear', () => {
  const game = new Sandbox();
  const gang = game.actors.find(actor => actor.faction === 0)!;
  game.actors = [gang, ...game.actors.filter(actor => actor.faction !== undefined && actor !== gang)];
  game.body = bodyAt(gang.x - 10);
  gang.hp = 22;
  game.step(1 / 60, { ...neutral, fire: true });
  assert.equal(gang.hp, 0);
  assert.ok(game.actors.filter(actor => actor.faction === 0).every(actor => actor.hostile));
  assert.ok(game.actors.filter(actor => actor.faction === 1).every(actor => !actor.hostile));
  assert.ok(game.drops.find(drop => drop.cash && drop.weapon === 1));
});

test('A stolen car can accelerate, change lanes, brake and safely exit; a moving commuter can be taken', () => {
  const game = new Sandbox();
  const parked = game.rides[0];
  game.rides = [parked];
  game.body = bodyAt(parked.x);
  assert.match(game.prompt, /Steal Kite Compact/);
  game.step(1 / 60, { ...neutral, use: true });
  assert.equal(game.ride, parked);
  assert.equal(game.crime?.kind, 'theft');
  game.step(1 / 60, { ...neutral, side: 1, laneChange: -1 });
  for (let i = 0; i < 45; i++) game.step(1 / 60, { ...neutral, side: 1 });
  assert.ok(parked.v > 100);
  assert.equal(parked.depth, 0);
  assert.match(game.prompt, /Change lanes.*Brake to exit/);
  game.step(1 / 60, { ...neutral, use: true });
  assert.equal(game.ride, parked);
  for (let i = 0; i < 60; i++) game.step(1 / 60, { ...neutral, brake: true });
  game.step(1 / 60, { ...neutral, use: true });
  assert.equal(game.ride, null);
  const other = new Sandbox();
  const commuter = other.rides.find(ride => ride.traffic)!;
  other.body = bodyAt(commuter.x);
  assert.match(other.prompt, /Carjack Bayline Van/);
  other.step(1 / 60, { ...neutral, use: true });
  assert.equal(other.ride, commuter);
  assert.equal(other.crime?.kind, 'carjacking');
});

test('An oncoming cruiser damages the vehicle without dragging it backward or defeating its brakes', () => {
  const game = new Sandbox();
  const car = makeRide('player', 700, 'van', 0);
  const cruiser = makeRide('pursuer', 772, 'compact', 0, -1);
  game.actors = [];
  game.police.officers = [];
  game.rides = [car];
  game.ride = car;
  game.body = bodyAt(car.x);
  game.police.cruisers = [{ ride: cruiser, block: false, windup: 0, delay: 1 }];
  car.v = 245;
  cruiser.v = -220;
  const integrity = car.hp;
  for (let i = 0; i < 3; i++) game.step(1 / 60, { ...neutral, side: 1 });
  assert.equal(game.crime?.kind, 'damage');
  assert.ok(car.hp < integrity);
  assert.ok(car.v >= 0);
  const impactX = car.x;
  for (let i = 0; i < 35; i++) game.step(1 / 60, { ...neutral, brake: true });
  assert.equal(car.v, 0);
  assert.ok(car.x > impactX - 10);
  for (let i = 0; i < 60; i++) {
    game.step(1 / 60, { ...neutral, side: 1 });
    assert.ok(car.v >= 0);
  }
});

test('Motorworks keeps E for the shop and lets X re-enter a parked ride before repainting', () => {
  const game = new Sandbox();
  const garage = businesses.find(shop => shop.id === 'paint')!;
  const car = makeRide('player', garage.x, 'compact');
  car.taken = true;
  game.rides = [car, makeRide('commuter', garage.x - 34, 'coupe', 0, 1, true)];
  game.ride = car;
  game.body = bodyAt(car.x);
  game.step(1 / 60, { ...neutral, exit: true });
  assert.equal(game.ride, null);
  assert.match(game.prompt, /E.*Prism Motorworks.*X.*Enter Kite Compact/);
  game.step(1 / 60, { ...neutral, use: true });
  assert.equal(game.shop, garage);
  assert.equal(game.ride, null);
  game.shop = null;
  game.step(1 / 60, { ...neutral, exit: true });
  assert.equal(game.ride, car);
  assert.equal(game.crime, null);
  game.step(1 / 60, { ...neutral, use: true });
  const paint = shopStock.paint[0];
  assert.equal(game.buy(paint), '');
  assert.equal(game.cash, 140 - paint.price);
  assert.equal(car.color, paint.value);
});
