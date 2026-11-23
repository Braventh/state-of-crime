import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { businesses } from '../src/crime.ts';
import { Sandbox } from '../src/sandbox.ts';
import { bodyAt } from '../src/traversal.ts';

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
  game.step(1 / 60, { ...neutral, use: true });
  assert.equal(game.ride, parked);
  assert.equal(game.crime?.kind, 'theft');
  game.step(1 / 60, { ...neutral, side: 1, laneChange: -1 });
  for (let i = 0; i < 45; i++) game.step(1 / 60, { ...neutral, side: 1 });
  assert.ok(parked.v > 100);
  assert.equal(parked.depth, 0);
  game.step(1 / 60, { ...neutral, use: true });
  assert.equal(game.ride, parked);
  for (let i = 0; i < 60; i++) game.step(1 / 60, { ...neutral, brake: true });
  game.step(1 / 60, { ...neutral, use: true });
  assert.equal(game.ride, null);
  const other = new Sandbox();
  const commuter = other.rides.find(ride => ride.traffic)!;
  other.body = bodyAt(commuter.x);
  other.step(1 / 60, { ...neutral, use: true });
  assert.equal(other.ride, commuter);
  assert.equal(other.crime?.kind, 'carjacking');
});
