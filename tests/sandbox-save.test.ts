import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { businesses } from '../src/crime.ts';
import { DISTRICT_WIDTH } from '../src/district.ts';
import { Sandbox } from '../src/sandbox.ts';
import { decodeSandbox, SANDBOX_KEY, sandboxStorage } from '../src/sandbox-save.ts';
import { fresh, SAVE_KEY } from '../src/save.ts';
import { shopStock } from '../src/shops.ts';
import { bodyAt } from '../src/traversal.ts';

const neutral = { side: 0, vertical: 0 };
function inShop(game: Sandbox, id: (typeof businesses)[number]['id']) {
  game.shop = null;
  game.body = bodyAt(businesses.find(x => x.id === id)!.x);
  if (game.ride) game.ride.x = game.body.x;
  game.step(.016, { ...neutral, use: true });
  assert.equal(game.shop?.id, id);
}

test('Cosmetic transactions charge cash, reject direct police observation, and do not remove heat', () => {
  const game = new Sandbox();
  inShop(game, 'threads');
  const look = game.suspect.identity;
  game.police.points = 158;
  game.police.officers[0].x = game.body.x + 40;
  assert.match(game.buy(shopStock.threads[1]), /watching/);
  assert.equal(game.cash, 140);
  game.police.officers[0].x = 1650;
  assert.equal(game.buy(shopStock.threads[1]), '');
  assert.equal(game.outfit, 1);
  assert.equal(game.cash, 102);
  assert.equal(game.police.level, 5);
  assert.notEqual(game.suspect.identity.outfit, look.outfit);
  inShop(game, 'hair');
  assert.equal(game.buy(shopStock.hair[1]), '');
  assert.equal(game.hair, 1);
});

test('A painted car, purchased gear, ammunition and equipped look survive a versioned round trip', () => {
  const game = new Sandbox();
  inShop(game, 'arms');
  assert.equal(game.buy(shopStock.arms[0]), '');
  game.armory.ammo.rounds -= 2;
  game.ride = game.rides[0];
  game.ride.taken = true;
  inShop(game, 'paint');
  game.police.points = 164;
  assert.match(game.buy(shopStock.paint[0]), /watching/);
  game.police.officers = [];
  assert.equal(game.buy(shopStock.paint[0]), '');
  game.outfit = 2;
  game.hair = 1;
  const save = decodeSandbox(JSON.stringify(game.snapshot()));
  assert.ok(save);
  const restored = new Sandbox();
  restored.restore(save);
  assert.equal(restored.ride?.color, game.ride.color);
  assert.equal(restored.cash, game.cash);
  assert.equal(restored.outfit, 2);
  assert.equal(restored.hair, 1);
  assert.equal(restored.armory.ammo.rounds, 6);
  assert.equal(restored.police.level, 5);
});

test('A checkpoint taken immediately after an edge carjacking can be restored', () => {
  for (const direction of [1, -1]) {
    const game = new Sandbox();
    const commuter = game.rides.find(ride => ride.traffic)!;
    const edge = direction === 1 ? 22 : DISTRICT_WIDTH - 22;
    game.body = bodyAt(edge);
    Object.assign(commuter, { x: edge - direction * 47, v: direction * 112, dir: direction });
    game.step(1 / 60, { ...neutral, use: true });
    assert.equal(game.ride, commuter);

    const save = decodeSandbox(JSON.stringify(game.snapshot()));
    assert.ok(save);
    assert.equal(save.x, edge);
    const restored = new Sandbox();
    restored.restore(save);
    assert.equal(restored.ride?.id, commuter.id);
    assert.equal(restored.body.x, edge);
  }
});

test('Prism paints and saves a stopped vehicle parked beside the player, but not under direct observation', () => {
  const game = new Sandbox();
  const [parked, bystander] = game.rides;
  inShop(game, 'paint');
  parked.taken = true;
  parked.x = game.body.x + 34;
  parked.v = 30;
  bystander.x = game.body.x + 5;
  const paint = shopStock.paint[0];
  assert.match(game.purchaseIssue(paint), /Stop a vehicle/);
  parked.v = 0;
  assert.equal(game.garageRide, parked);
  assert.match(game.prompt, /X  ·  Enter/);

  game.police.officers[0].x = parked.x + 150;
  game.police.officers.length = 1;
  assert.equal(game.police.watched(game.suspect), false);
  assert.match(game.purchaseIssue(paint), /watching/);
  assert.match(game.buy(paint), /watching/);
  assert.equal(game.cash, 140);

  game.police.officers = [];
  assert.equal(game.buy(paint), '');
  assert.equal(game.cash, 140 - paint.price);
  assert.match(game.purchaseIssue(paint), /Already painted/);
  const saved = decodeSandbox(JSON.stringify(game.snapshot()));
  assert.ok(saved);
  const restored = new Sandbox();
  restored.restore(saved);
  assert.equal(restored.garageRide?.color, parked.color);
  assert.equal(restored.ride, null);
  restored.step(.016, { ...neutral, exit: true });
  assert.equal(restored.ride?.id, parked.id);
  assert.equal(restored.crime, null);
});

test('Shop availability and ammo details update when a weapon is purchased and reserves fill', () => {
  const game = new Sandbox();
  const [pistol, , , rifle, ammo] = shopStock.arms;
  inShop(game, 'arms');
  assert.equal(game.purchaseIssue(rifle), 'Not enough cash');
  assert.equal(game.purchaseIssue(ammo), 'Equip a firearm first');
  assert.equal(game.buy(pistol), '');
  assert.equal(game.purchaseIssue(pistol), 'Already in your inventory');
  assert.equal(game.ammoPackRounds, 24);

  game.armory.ammo.reserve = 90;
  assert.equal(game.ammoPackRounds, 6);
  assert.equal(game.buy(ammo), '');
  assert.equal(game.armory.ammo.reserve, 96);
  assert.equal(game.purchaseIssue(ammo), 'Ammunition reserve full');
  assert.equal(game.buy(ammo), 'Ammunition reserve full');
  assert.equal(game.cash, 140 - pistol.price - ammo.price);
});

test('Storage migrates only compatible V1 data, rejects bad V2 data and protects a newer tab', () => {
  const initial = new Sandbox().snapshot();
  const values = new Map([[SAVE_KEY, JSON.stringify({ ...fresh(), cash: 611, engine: true })]]);
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, val: string) => values.set(key, val) };
  const first = sandboxStorage(initial, store);
  const stale = sandboxStorage(initial, store);
  assert.equal(first.saved?.cash, 611);
  assert.equal(first.saved?.engine, true);
  assert.equal(first.write(first.saved!), 'saved');
  assert.equal(stale.write(initial), 'changed');
  assert.equal(sandboxStorage(initial, store).saved?.cash, 611);
  assert.match(values.get(SAVE_KEY)!, /"version":1/);
  assert.equal(decodeSandbox(JSON.stringify({ ...initial, stock: { 0: { rounds: 2, reserve: 0 } } })), null);
  values.set(SANDBOX_KEY, '[not-json');
  assert.match(sandboxStorage(initial, store).warning, /unreadable/);
  assert.equal(sandboxStorage(initial, undefined).write(initial), 'unavailable');
});
