import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { actorAt } from '../src/combat.ts';
import { businesses } from '../src/crime.ts';
import { DISTRICT_WIDTH } from '../src/district.ts';
import { Sandbox } from '../src/sandbox.ts';
import { bodyAt } from '../src/traversal.ts';

const neutral = { side: 0, vertical: 0 };

test('Shop robbery pays once, reports witnesses, and panics the clerk without any mission', () => {
  const game = new Sandbox();
  const shop = businesses[0];
  game.body = bodyAt(shop.x);
  game.police.officers = [];
  assert.match(game.prompt, /G  ·  Rob Velvet Loom/);
  const start = game.cash;
  game.step(1 / 60, { ...neutral, rob: true });
  assert.equal(game.cash, start + shop.till);
  assert.equal(game.crime?.kind, 'shopRobbery');
  assert.match(game.notice, /Velvet Loom robbed · \+\$86 · .*calling police/);
  assert.ok(game.crime!.witnesses > 0);
  assert.ok(game.actors.find(actor => actor.id === shop.id)!.panic > 0);
  for (const other of game.actors) if (other.id !== shop.id) other.robbed = true;
  game.step(1 / 60, { ...neutral, rob: true });
  assert.equal(game.cash, start + shop.till);
  assert.equal(game.notice, 'No robbery target nearby');
});

test('Pedestrian robbery selects the closest target alongside a vehicle prompt and names direct police sight', () => {
  const game = new Sandbox();
  const car = game.rides[0];
  const [first, closest] = game.actors;
  game.body = bodyAt(car.x);
  first.x = car.x - 24;
  closest.x = car.x + 8;
  game.actors = [first, closest];
  game.police.officers[0].x = car.x + 50;
  assert.match(game.prompt, /E  ·  Steal .* \/ G  ·  Rob Pedestrian/);
  game.step(1 / 60, { ...neutral, rob: true });
  assert.equal(first.robbed, false);
  assert.equal(closest.robbed, true);
  assert.equal(game.cash, 140 + 16 + closest.outfit * 5);
  assert.match(game.notice, /Pedestrian robbed · \+\$\d+ · Spotted by police/);
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

test('Stealing an inbound commuter does not crash it at either driving boundary', () => {
  for (const direction of [1, -1]) {
    const game = new Sandbox();
    const commuter = game.rides.find(ride => ride.traffic)!;
    const left = direction === 1;
    game.rides = [commuter];
    game.body = bodyAt(left ? 22 : DISTRICT_WIDTH - 22);
    Object.assign(commuter, { x: left ? -25 : DISTRICT_WIDTH + 25, v: direction * 112, dir: direction });
    const integrity = commuter.hp;
    game.step(1 / 60, { ...neutral, use: true });
    assert.equal(game.ride, commuter);
    const heat = game.police.points;
    game.step(1 / 60, { ...neutral, side: direction });
    assert.equal(commuter.hp, integrity);
    assert.ok(commuter.v * direction > 105);
    assert.equal(game.crime?.kind, 'carjacking');
    assert.ok(game.police.points <= heat);

    commuter.v = -direction * 180;
    game.step(1 / 60, { ...neutral, side: -direction });
    assert.ok(commuter.hp < integrity);
    assert.equal(commuter.v, 0);
    assert.equal(game.crime?.kind, 'damage');
  }
});

test('A bullet reports gunfire even when it hits a pedestrian outside witness range', () => {
  const hit = new Sandbox();
  const missed = new Sandbox();
  const victim = actorAt('distant-pedestrian', 642, 2);
  hit.actors = [victim];
  missed.actors = [];
  for (const game of [hit, missed]) {
    game.body = bodyAt(400);
    game.police.officers = [];
    game.armory.supply(2);
    game.step(1 / 60, { ...neutral, fire: true });
  }
  assert.ok(victim.hp < 100);
  assert.equal(hit.crime?.kind, 'assault');
  assert.equal(hit.crime?.witnesses, 0);
  assert.equal(missed.crime?.kind, 'gunfire');
  assert.ok(missed.police.level > 0);
  assert.ok(hit.police.points > missed.police.points);
});
