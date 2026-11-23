import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { H } from '../src/config.ts';
import { CELLAR, DISTRICT_WIDTH, ladders, passages, roofs, STREET } from '../src/district.ts';
import { Sandbox } from '../src/sandbox.ts';
import { bodyAt, type MotionInput } from '../src/traversal.ts';

function step(game: Sandbox, count: number, input: Partial<MotionInput> = {}) {
  for (let i = 0; i < count; i++) game.step(1 / 60, { side: 0, vertical: 0, ...input });
}

test('New Game explores all four Crownwater blocks without accepting an objective', () => {
  const game = new Sandbox();
  assert.equal(game.block.name, 'Lantern Row');
  step(game, 360, { side: 1, fast: true });
  assert.equal(game.block.name, 'Rainline Market');
  step(game, 195, { side: 1, fast: true });
  assert.equal(game.block.name, 'Needle Alley');
  step(game, 750, { side: 1, fast: true });
  assert.equal(game.block.name, 'Glasshouse Works');
  assert.equal(game.body.x, DISTRICT_WIDTH - 22);
});

test('Fire escapes lead to playable rooftops and a running jump clears the roof gap', () => {
  const game = new Sandbox();
  game.body = bodyAt(ladders[0].x);
  step(game, 76, { vertical: -1 });
  assert.equal(game.body.y, ladders[0].high);
  step(game, 66, { side: 1 });
  assert.ok(Math.abs(game.body.x - ladders[1].x) < 16);
  step(game, 51, { vertical: -1 });
  assert.equal(game.body.y, roofs[2].y);
  assert.ok((STREET - game.body.y) / H >= .40);
  while (game.body.x < 665) step(game, 1, { side: 1, fast: true });
  step(game, 1, { side: 1, fast: true, jump: true });
  step(game, 44, { side: 1, fast: true });
  assert.equal(game.body.y, roofs[3].y);
  assert.ok(game.body.x > roofs[3].left);
});

test('A covered passage connects two street entrances without resetting the player', () => {
  const game = new Sandbox();
  const [entry, exit] = passages[0].doors;
  game.body = bodyAt(entry);
  assert.match(game.prompt, /Enter Bluehour Arcade/);
  step(game, 1, { use: true });
  assert.equal(game.body.y, CELLAR);
  assert.equal(game.body.covered, true);
  for (let i = 0; game.body.x < exit - 8 && i < 200; i++) step(game, 1, { side: 1, fast: true });
  assert.match(game.prompt, /Return to street/);
  step(game, 1, { use: true });
  assert.equal(game.body.covered, false);
  assert.equal(game.body.y, STREET);
  assert.equal(game.body.x, exit);
});
