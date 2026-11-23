import assert from 'node:assert/strict';
import test from 'node:test';
import { Game } from '../src/game.ts';
import { TUNE } from '../src/config.ts';
import { fresh } from '../src/save.ts';

function ticks(game: Game, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) game.step(1 / 60);
}

function patrol(game: Game, x: number) {
  const unit = { x, v: 0, lane: 0, dir: 1, heavy: false, ramAt: 0, readyAt: 0 };
  game.units.push(unit);
  return unit;
}

test('new offenses escalate to four and reinforcements begin at a safe distance', () => {
  const game = new Game(fresh(), () => {});
  for (let i = 0; i < 6; i++) game.reportCrime(1);
  assert.equal(game.heat, 4);
  game.step(1 / 60);
  assert.equal(game.units.length, 1);
  assert.ok(game.units[0].heavy);
  assert.ok(Math.abs(game.units[0].x - game.x) >= TUNE.police.spawn - 1);
});

test('an exposed player stays wanted; hiding gives the search time to expire', () => {
  const game = new Game(fresh(), () => {});
  game.reportCrime(1);
  ticks(game, TUNE.police.search[1] + 1);
  assert.equal(game.heat, 1);
  game.hide = true;
  ticks(game, TUNE.police.search[1] + 1);
  assert.equal(game.heat, 0);
  assert.equal(game.units.length, 0);
});

test('unseen movement does not update patrols until they regain sight', () => {
  const game = new Game(fresh(), () => {});
  game.reportCrime(1);
  const origin = game.x;
  const unit = patrol(game, origin);
  game.body.x += TUNE.police.range[1] + 20;
  ticks(game, .5);
  assert.equal(unit.x, origin);
  assert.equal(game.lastSeen, origin);
  assert.equal(game.spotted, false);
  assert.equal(game.search, 0);

  game.body.x = origin + TUNE.police.placeDistance + 1;
  ticks(game, 1);
  assert.ok(game.search >= 1);
  game.body.x = origin + TUNE.police.range[1] - 1;
  ticks(game, 1 / 60);
  assert.equal(game.spotted, true);
  assert.equal(game.lastSeen, game.x);
  assert.equal(game.search, 0);
});

test('a patrol announces its ram before dealing damage and cannot immediately ram again', () => {
  const game = new Game(fresh(), () => {});
  game.reportCrime(2);
  const unit = patrol(game, game.x + 10);
  ticks(game, TUNE.police.ramWindup);
  assert.ok(unit.ramAt > game.clock);
  assert.equal(game.hp, TUNE.maxHealth);

  ticks(game, .1);
  assert.equal(unit.ramAt, 0);
  assert.equal(game.hp, TUNE.maxHealth - 11);
  assert.ok(game.body.vx < 0);
  ticks(game, .65);
  assert.equal(unit.ramAt, 0);
  assert.equal(game.hp, TUNE.maxHealth - 11);
});

test('switching lanes during the tell makes a ram miss', () => {
  const game = new Game(fresh(), () => {});
  const car = game.cars[0];
  game.car = car;
  game.reportCrime(2);
  const unit = patrol(game, game.x + 10);
  ticks(game, 1 / 60);
  assert.ok(unit.ramAt > game.clock);
  const integrity = car.hp;
  car.lane = -1;
  ticks(game, TUNE.police.ramWindup + .1);
  assert.equal(unit.ramAt, 0);
  assert.equal(car.hp, integrity);
});
