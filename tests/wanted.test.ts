import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { W } from '../src/config.ts';
import { STREET } from '../src/district.ts';
import { Police, recognition, type Suspect } from '../src/police.ts';

const defaultLook = { outfit: 0, hair: 0, ride: '', paint: '' };
const suspect = (x: number, extra: Partial<Suspect> = {}): Suspect =>
  ({ x, y: STREET, covered: false, camera: x - 370, ride: null, identity: defaultLook, ...extra });
const noOp = () => {};

test('Severity and observation both change the amount of heat; response escalates through all five stars', () => {
  const police = new Police();
  const person = suspect(1300);
  police.report({ kind: 'assault', x: person.x, y: STREET, covered: false, witnesses: 0 }, person);
  assert.equal(police.level, 0);
  const checkpoints = [];
  for (let i = 0; i < 11; i++) {
    police.report({ kind: 'assault', x: person.x, y: STREET, covered: false, witnesses: 1 }, person);
    checkpoints.push(police.level);
  }
  assert.deepEqual([...new Set(checkpoints)], [1, 2, 3, 4, 5]);
  const severe = new Police();
  severe.report({ kind: 'officerDown', x: 980, y: STREET, covered: false, witnesses: 0 }, suspect(980));
  assert.ok(severe.level >= 3);
});

test('Police do not cool off in sight, do not track movement in cover, and can lose a five-star target', () => {
  const police = new Police();
  const open = suspect(985);
  police.points = 177;
  for (let i = 0; i < 210; i++) police.step(.1, open, noOp, noOp);
  assert.equal(police.level, 5);
  assert.equal(police.spotted, true);
  assert.equal(police.last?.x, open.x);
  assert.ok(police.cruisers.length >= 2);
  assert.ok(police.cruisers.some(unit => unit.block));
  const hidden = suspect(1610, { covered: true });
  for (let i = 0; i < 35; i++) police.step(.1, hidden, noOp, noOp);
  assert.equal(police.last?.x, open.x);
  assert.equal(police.mode, 'Searching');
  for (let i = 0; i < 180; i++) police.step(.1, hidden, noOp, noOp);
  assert.equal(police.level, 0);
});

test('Response cruiser enters outside the camera and refuses to conjure a unit in a narrow edge gap', () => {
  const police = new Police();
  const person = suspect(1690);
  police.report({ kind: 'officerDown', x: person.x, y: STREET, covered: false, witnesses: 1 }, person);
  police.step(.016, person, noOp, noOp);
  const car = police.cruisers[0].ride;
  assert.ok(car.x < person.camera || car.x > person.camera + W);
  assert.ok(Math.abs(car.x - person.x) > 500);
});

test('Clothing and hairstyle stack; a new paint color lowers but does not eliminate recognition', () => {
  assert.ok(recognition(defaultLook, { ...defaultLook, outfit: 1 }) > recognition(defaultLook, { ...defaultLook, outfit: 1, hair: 1 }));
  const car = { ...defaultLook, ride: 'kite', paint: '#fff' };
  assert.ok(recognition(car, { ...car, paint: '#000' }) < 1);
  assert.ok(recognition(car, { ...car, paint: '#000' }) > recognition(car, { ...car, ride: 'van' }));
});
