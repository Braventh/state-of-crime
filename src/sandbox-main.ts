import './sandbox.css';
import { AudioBed } from './audio.ts';
import type { WeaponId } from './combat.ts';
import { H, W } from './config.ts';
import { clearEdges, held, resetInput, startInput, tap } from './input.ts';
import { Sandbox } from './sandbox.ts';
import { renderSandbox } from './sandbox-art.ts';
import { loadSettings, storeSettings } from './save.ts';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header class="mast"><span>STATE OF CRIME</span><small>CROWNWATER / FREE ROAM</small><button id="pause">Pause <kbd>Esc</kbd></button></header>
  <section class="stage" aria-label="Crownwater">
    <canvas width="${W}" height="${H}" aria-label="Side-scrolling Crownwater sandbox"></canvas>
    <div id="menu" class="shade">
      <section class="card">
        <p class="eyebrow">THE CITY AFTER DARK</p>
        <h1 id="menu-title">State of Crime</h1>
        <p class="deck">Crownwater · Lantern Row to Glasshouse Works</p>
        <button id="play" class="primary">New Game</button>
        <details id="help"><summary>Controls &amp; settings</summary>
          <dl><div><dt>Walk / sprint</dt><dd>A D or ← → / Shift</dd></div>
          <div><dt>Fire escapes</dt><dd>W S or ↑ ↓</dd></div>
          <div><dt>Jump / interact</dt><dd>Space / E</dd></div>
          <div><dt>Attack / aim / reload</dt><dd>F / hold Q (+ W S) / R</dd></div>
          <div><dt>Weapon slots</dt><dd>1–6</dd></div>
          <div><dt>Pause</dt><dd>Esc</dd></div></dl>
          <label>Volume <input id="volume" type="range" min="0" max="1" step=".05"></label>
          <label><input id="mute" type="checkbox"> Mute</label>
          <label><input id="motion" type="checkbox"> Reduced motion</label>
        </details>
      </section>
    </div>
  </section>
  <footer class="dock"><strong id="block">Lantern Row</strong><span id="prompt"></span><span id="equipment"></span></footer>`;
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = app.querySelector('canvas')!;
const context = canvas.getContext('2d', { alpha: false })!;
const settings = loadSettings();
const audio = new AudioBed(settings);
const play = get<HTMLButtonElement>('play');
const pause = get<HTMLButtonElement>('pause');
const menu = get('menu');
const volume = get<HTMLInputElement>('volume');
const mute = get<HTMLInputElement>('mute');
const motion = get<HTMLInputElement>('motion');
volume.value = String(settings.volume);
mute.checked = settings.mute;
motion.checked = settings.reduced;
function changeSettings() {
  settings.volume = Number(volume.value);
  settings.mute = mute.checked;
  settings.reduced = motion.checked;
  audio.apply();
  storeSettings(settings);
}
volume.oninput = mute.onchange = motion.onchange = changeSettings;
let game = new Sandbox(name => audio.cue(name));
let started = false;
let running = false;
pause.disabled = true;
function setRunning(value: boolean) {
  running = value;
  menu.hidden = value;
  get('menu-title').textContent = started ? 'Paused' : 'State of Crime';
  play.textContent = started ? 'Resume' : 'New Game';
  if (!value) play.focus();
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  resetInput();
}
play.onclick = () => {
  audio.wake();
  started = true;
  pause.disabled = false;
  setRunning(true);
};
pause.onclick = () => { if (running) setRunning(false); };
startInput(() => started);
let previous = performance.now();
function label(id: string, value: string) {
  const el = get(id);
  if (el.textContent !== value) el.textContent = value;
}
function frame(now: number) {
  const dt = Math.min(.035, (now - previous) / 1000);
  previous = now;
  if (started && tap('Escape')) setRunning(!running);
  if (running) {
    const vertical = Number(held('KeyS', 'ArrowDown')) - Number(held('KeyW', 'ArrowUp'));
    const slot = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].findIndex(key => tap(key));
    game.step(dt, {
      side: Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft')),
      vertical, jump: tap('Space'), fast: held('ShiftLeft', 'ShiftRight'), use: tap('KeyE'),
      aim: held('KeyQ'), incline: vertical, reload: tap('KeyR'), fire: held('KeyF') || tap('KeyF'),
      slot: slot < 0 ? undefined : slot as WeaponId,
    });
    if (!game.hp) {
      setRunning(false);
      get('menu-title').textContent = 'Knocked out';
      play.textContent = 'Restart';
      started = false;
      game = new Sandbox(name => audio.cue(name));
    }
  }
  clearEdges();
  audio.step(0, 0, false, running);
  renderSandbox(context, game, started ? game.time : now / 1000, settings.reduced);
  label('block', game.block.name);
  label('prompt', started ? game.prompt : 'No jobs. No fixed route.');
  const { gun, ammo, loading } = game.armory;
  label('equipment', gun.mag ? `${gun.name} · ${loading ? 'Reloading' : ammo.rounds + ' / ' + ammo.reserve}` : gun.name);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
