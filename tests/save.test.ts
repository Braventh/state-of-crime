import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeSave, decodeSettings, defaults, fresh } from '../src/save.ts';

test('safe checkpoint round-trips earned progression, ownership and tuning', () => {
  const p = { ...fresh(), cash: 550, completed: 3, x: 4950, owned: ['compact', 'coupe'], selected: 'coupe', engine: true };
  assert.deepEqual(decodeSave(JSON.stringify(p)), p);
});
test('corrupt, tampered and incompatible checkpoints are rejected', () => {
  for (const raw of ['{', 'null', JSON.stringify({ ...fresh(), version: 2 }),
    JSON.stringify({ ...fresh(), cash: -400 }), JSON.stringify({ ...fresh(), completed: 2.4 }),
    JSON.stringify({ ...fresh(), owned: ['compact', 'toString'] }), JSON.stringify({ ...fresh(), selected: 'van' })])
    assert.equal(decodeSave(raw), null);
});
test('settings reject invalid volume and preserve valid accessibility options', () => {
  assert.deepEqual(decodeSettings('{"volume":99,"mute":false,"reduced":true}'), defaults());
  assert.deepEqual(decodeSettings('{"volume":0.3,"mute":true,"reduced":true}'), { volume: .3, mute: true, reduced: true });
});
