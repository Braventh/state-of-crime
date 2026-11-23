import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { actorAt, Armory, clearShot } from '../src/combat.ts';
import { CELLAR, STREET } from '../src/district.ts';
import { Sandbox } from '../src/sandbox.ts';
import { bodyAt } from '../src/traversal.ts';

test('Fists and pipe hit nearby actors, stagger them, and differ in damage and reach', () => {
  const armory = new Armory();
  const body = bodyAt(460);
  const actor = actorAt('nearby', 493, 1);
  const sound = () => {};
  assert.equal(armory.step(.016, { fire: true }, body, [actor], sound)?.target, actor);
  assert.equal(actor.hp, 77);
  assert.ok(actor.hit > 0);
  actor.x = 511;
  assert.equal(armory.step(.4, { fire: true }, body, [actor], sound)?.target, undefined);
  armory.supply(1);
  assert.equal(armory.step(.4, { fire: true }, body, [actor], sound)?.target, actor);
  assert.equal(actor.hp, 41);
});

test('Gunfire spends rounds, ammo pickups replenish reserve, and reload waits to transfer rounds', () => {
  const armory = new Armory();
  const body = bodyAt(460);
  const actor = actorAt('target', 624, 1);
  const sound = () => {};
  armory.supply(2);
  assert.equal(armory.step(.016, { fire: true }, body, [actor], sound)?.loud, true);
  assert.equal(actor.hp, 66);
  assert.deepEqual(armory.ammo, { rounds: 7, reserve: 24 });
  armory.supply(2);
  assert.deepEqual(armory.ammo, { rounds: 7, reserve: 48 });
  armory.step(.016, { reload: true }, body, [], sound);
  armory.step(.3, { fire: true }, body, [], sound);
  assert.equal(armory.ammo.rounds, 7);
  armory.step(.6, {}, body, [], sound);
  assert.deepEqual(armory.ammo, { rounds: 8, reserve: 47 });
  armory.step(.01, { slot: 0 }, body, [], sound);
  assert.equal(armory.slot, 0);
});

test('Roof geometry and covered passages block shots; equipment pickup equips the selected weapon', () => {
  assert.equal(clearShot(338, 345, 370, 250), false);
  const game = new Sandbox();
  game.body = bodyAt(444);
  game.step(.016, { side: 0, vertical: 0, use: true });
  assert.equal(game.armory.slot, 1);
  game.armory.supply(2);
  const actor = actorAt('below', 470, 2);
  actor.covered = true;
  actor.y = CELLAR;
  assert.equal(game.body.y, STREET);
  assert.equal(game.armory.step(.016, { fire: true, aim: true, incline: 1 }, game.body, [actor], () => {})?.target, undefined);
});

test('Weapon readout shows the hotkey, a usable reload hint and ammo during an interrupted reload', () => {
  const armory = new Armory();
  const body = bodyAt(460);
  const sound = () => {};
  assert.equal(armory.readout, '[1] Fists · F to attack');
  armory.supply(2);
  for (let i = 0; i < 8; i++) armory.step(.31, { fire: true }, body, [], sound);
  assert.equal(armory.readout, '[3] Pistol · 0 / 24 · R to reload');
  armory.step(.016, { reload: true }, body, [], sound);
  assert.equal(armory.readout, '[3] Pistol · 0 / 24 · Reloading');
  armory.step(.016, { slot: 1 }, body, [], sound);
  assert.equal(armory.readout, '[3] Pistol · 0 / 24 · Reloading');
  armory.step(.016, { slot: 0 }, body, [], sound);
  armory.step(.9, { slot: 2 }, body, [], sound);
  assert.equal(armory.readout, '[3] Pistol · 0 / 24 · R to reload');
  armory.ammo.reserve = 0;
  assert.equal(armory.readout, '[3] Pistol · 0 / 0 · Out of ammo');
});

test('Loadout feedback distinguishes locked slots, new weapons and duplicate ammo pickups', () => {
  const game = new Sandbox();
  game.body = bodyAt(1165);
  game.step(.016, { side: 0, vertical: 0, slot: 2 });
  assert.equal(game.armory.slot, 0);
  assert.equal(game.notice, 'Slot 3 · Pistol not owned');
  assert.equal(game.prompt, 'E  ·  Pick up Pistol');
  game.step(.016, { side: 0, vertical: 0, use: true });
  assert.equal(game.notice, 'Pistol equipped · Slot 3');
  game.armory.ammo.reserve = 90;
  game.step(.016, { side: 0, vertical: 0, slot: 0 });
  game.drops.push({ x: 1165, y: STREET, weapon: 2, covered: false, cash: 31 });
  assert.equal(game.prompt, 'E  ·  Pick up Pistol ammo');
  game.step(.016, { side: 0, vertical: 0, use: true });
  assert.equal(game.notice, 'Pistol · +6 reserve · +$31');
  assert.equal(game.armory.slot, 0);
  assert.equal(game.armory.stock[2]?.reserve, 96);
  game.drops.push({ x: 1165, y: STREET, weapon: 2, covered: false });
  game.step(.016, { side: 0, vertical: 0, use: true });
  assert.equal(game.notice, 'Pistol reserve full');
});

test('Only landed attacks show a temporary hit or knockout confirmation', () => {
  const armory = new Armory();
  const body = bodyAt(460);
  const enemy = actorAt('enemy', 492, 1, 'gang');
  const sound = () => {};
  armory.step(.32, { fire: true }, body, [], sound);
  assert.equal(armory.impact, null);
  armory.step(.32, { fire: true }, body, [enemy], sound);
  assert.equal(armory.impact?.target, enemy);
  assert.equal(armory.impact?.killed, false);
  armory.step(.32, { fire: true }, body, [], sound);
  assert.equal(armory.impact?.target, enemy);
  enemy.hp = 23;
  armory.step(.32, { fire: true }, body, [enemy], sound);
  assert.equal(armory.impact?.killed, true);
  armory.step(.65, {}, body, [enemy], sound);
  assert.equal(armory.impact, null);
});
