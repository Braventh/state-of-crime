import assert from 'node:assert/strict';
import test from 'node:test';
import { Game } from '../src/game.ts';
import { fresh, loadSave } from '../src/save.ts';

test('retry restores the session checkpoint when browser storage rejected the write', t => {
  const stale = { ...fresh(), cash: 420, completed: 1, x: 2430 };
  t.mock.property(globalThis, 'localStorage', {
    getItem: () => JSON.stringify(stale),
    setItem: () => { throw new Error('Storage quota exceeded'); },
  });
  const game = new Game({ ...stale, cash: 840, completed: 2 }, () => {});
  game.checkpoint(4950);
  assert.equal(game.storageOK, false);
  assert.deepEqual(loadSave(), stale);
  game.body.x = 5200;
  game.lost = true;

  const restored = game.retry();
  assert.equal(restored.x, 4950);
  assert.equal(restored.progress.cash, 840);
  assert.equal(restored.progress.completed, 2);
  assert.equal(restored.lost, false);
});
