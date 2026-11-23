import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { held, resetInput, startInput, tap } from '../src/input.ts';

test('Space is captured in gameplay but left to native controls and menus', () => {
  const keyboard = new EventTarget();
  class Control { closest(selector: string) { return selector.includes('button') ? this : null; } }
  Object.assign(globalThis, { window: keyboard, Element: Control });
  let engaged = true;
  startInput(() => engaged);
  function press(code: string, target: object = keyboard) {
    resetInput();
    const event = Object.assign(new Event('keydown', { cancelable: true }), { code });
    Object.defineProperty(event, 'target', { value: target });
    keyboard.dispatchEvent(event);
    return event;
  }
  assert.equal(press('Space').defaultPrevented, true);
  assert.equal(held('Space'), true);
  assert.equal(tap('Space'), true);
  assert.equal(press('Space', new Control()).defaultPrevented, false);
  assert.equal(held('Space'), false);
  assert.equal(tap('Space'), false);
  assert.equal(press('Escape', new Control()).defaultPrevented, false);
  assert.equal(tap('Escape'), true);
  engaged = false;
  assert.equal(press('Space').defaultPrevented, false);
  assert.equal(press('Escape', new Control()).defaultPrevented, false);
  assert.equal(tap('Escape'), true);
});
