import assert from 'node:assert/strict';
import test from 'node:test';
import { POINTS } from '../src/config.ts';
import { Game } from '../src/game.ts';
import { fresh } from '../src/save.ts';

test('First Light points to Mara, then the Kite, then Tidelane as soon as you board', () => {
  const game = new Game(fresh(), () => {});
  assert.equal(game.goal().x, POINTS.contact.x);
  assert.match(game.goal().hint ?? '', /gold marker.*press E/);

  game.body.x = POINTS.contact.x;
  assert.equal(game.prompt(), 'Talk to Mara');
  game.job = { time: 0, drove: false, beacon: false, rival: 0 };
  const kite = game.cars[0];
  assert.equal(game.goal().x, kite.x);
  assert.equal(game.goal().name, 'Orange Kite');
  game.body.x = kite.x;
  assert.equal(game.prompt(), 'Borrow Kite Compact');

  game.car = kite;
  assert.equal(game.job.drove, false);
  assert.equal(game.goal().x, POINTS.delivery.x);
  assert.match(game.goal().hint ?? '', /change lanes.*brake/);

  game.car = null;
  assert.equal(game.goal().x, kite.x);
  game.car = kite;
  kite.x = POINTS.delivery.x;
  game.step(1 / 60);
  assert.equal(game.progress.completed, 1);
  assert.equal(game.goal().hint, undefined);
});
