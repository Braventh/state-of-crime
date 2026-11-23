import assert from 'node:assert/strict';
import test from 'node:test';
import { Game } from '../src/game.ts';
import { TUNE } from '../src/config.ts';
import { fresh } from '../src/save.ts';

function ticks(game: Game, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) game.step(1 / 60);
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
