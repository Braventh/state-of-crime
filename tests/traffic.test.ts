import assert from 'node:assert/strict';
import test from 'node:test';
import { Game } from '../src/game.ts';
import { fresh } from '../src/save.ts';

test('traffic moves out of an overlapping driver’s lane', () => {
  for (const lane of [-1, 0, 1]) {
    const game = new Game(fresh(), () => {});
    const player = game.car = game.cars[0];
    const traffic = game.traffic[1];
    game.traffic = [traffic];
    player.x = traffic.x = 1000;
    player.lane = player.yLane = traffic.lane = traffic.yLane = lane;
    traffic.v = 0;
    for (let i = 0; i < 12; i++) game.step(1 / 60);
    assert.ok(Math.abs(traffic.yLane - player.yLane) > .53, 'lane ' + lane);
  }
});
