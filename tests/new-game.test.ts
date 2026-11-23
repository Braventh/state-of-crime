import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { bindNewGameConfirmation } from '../src/new-game.ts';

test('New Game lets players dismiss the confirmation without replacing their checkpoint', () => {
  const newGame = new EventTarget();
  const cancel = new EventTarget();
  const replace = new EventTarget();
  const dialog = Object.assign(new EventTarget(), {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; },
  });
  let starts = 0;
  bindNewGameConfirmation(newGame, dialog as unknown as HTMLDialogElement, cancel, replace, () => {
    assert.equal(dialog.open, false);
    starts++;
  });
  newGame.dispatchEvent(new Event('click'));
  assert.equal(dialog.open, true);
  const escape = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
  let escapedToGameplay = true;
  escape.stopPropagation = () => { escapedToGameplay = false; };
  dialog.dispatchEvent(escape);
  assert.equal(escapedToGameplay, false);
  assert.equal(escape.defaultPrevented, false);
  cancel.dispatchEvent(new Event('click'));
  assert.equal(dialog.open, false);
  assert.equal(starts, 0);

  newGame.dispatchEvent(new Event('click'));
  replace.dispatchEvent(new Event('click'));
  assert.equal(starts, 1);
});
