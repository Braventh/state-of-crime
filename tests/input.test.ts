import assert from 'node:assert/strict';
import test from 'node:test';
import { held, startInput, tap } from '../src/input.ts';

const keyboard = new EventTarget();
const pause = new EventTarget();
Object.assign(globalThis, { window: keyboard, HTMLInputElement: class {} });
startInput(() => true, pause);

function press(code: string, target: EventTarget) {
  const event = Object.assign(new Event('keydown', { cancelable: true }), { code });
  Object.defineProperty(event, 'target', { value: target });
  keyboard.dispatchEvent(event);
  return event;
}

test('Space on the Pause control stays native without suppressing gameplay shortcuts', () => {
  assert.equal(press('Space', pause).defaultPrevented, false);
  assert.equal(tap('Space'), false);
  assert.equal(held('Space'), false);

  press('Escape', pause);
  assert.equal(tap('Escape'), true);

  assert.equal(press('Space', keyboard).defaultPrevented, true);
  assert.equal(tap('Space'), true);
  assert.equal(held('Space'), true);
});
