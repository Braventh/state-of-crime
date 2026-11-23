import assert from 'node:assert/strict';
import test from 'node:test';
import { render } from '../src/art.ts';
import { AudioBed } from '../src/audio.ts';
import { Game } from '../src/game.ts';
import { defaults, fresh } from '../src/save.ts';

function skylineWindows(camera: number) {
  const windows: number[][] = [];
  const gradient = { addColorStop() {} };
  const noop = () => {};
  const ctx = new Proxy({
    fillStyle: '',
    fillRect(x: number, y: number) {
      const worldX = x + Math.round(.59 * camera);
      if (this.fillStyle === '#865472' && worldX > 190 && worldX < 700) windows.push([worldX, y]);
    },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? noop });
  const game = new Game(fresh(), noop);
  game.camera = camera;
  render(ctx as unknown as CanvasRenderingContext2D, 0, game, false);
  return windows;
}

test('skyline windows follow the buildings without changing their lit pattern', () => {
  const windows = skylineWindows(200);
  assert.ok(windows.length > 50);
  assert.deepEqual(skylineWindows(300), windows);
});

class Param {
  value = 1;
  targets: number[] = [];
  setTargetAtTime(value: number) { this.targets.push(value); }
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class Node {
  gain = new Param();
  frequency = new Param();
  connected?: Node;
  connect(node: Node) { this.connected = node; return node; }
  start() {}
  stop() {}
}

test('the soundtrack fades on pause without muting one-shot cues', () => {
  const stub = {
    currentTime: 0, state: 'running', sampleRate: 4, destination: new Node(),
    gains: [] as Node[], oscillators: [] as Node[],
    createGain() { const node = new Node(); this.gains.push(node); return node; },
    createOscillator() { const node = new Node(); this.oscillators.push(node); return node; },
    createBufferSource: () => new Node(),
    createBiquadFilter: () => new Node(),
    createBuffer: () => ({ getChannelData: () => new Float32Array(8) }),
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: function () { return stub; } });
  try {
    const audio = new AudioBed({ ...defaults(), mute: true });
    audio.wake();
    const [master, music] = stub.gains;
    assert.equal(master.gain.value, 0);

    audio.step(0, 0, false, true);
    assert.equal(stub.oscillators.at(-1)?.connected?.connected, music);
    audio.step(0, 0, false, false);
    audio.step(0, 0, false, false);
    assert.deepEqual(music.gain.targets, [1, 0]);

    audio.cue('door');
    assert.equal(stub.oscillators.at(-1)?.connected?.connected, master);
  } finally {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original);
    else Reflect.deleteProperty(globalThis, 'AudioContext');
  }
});
