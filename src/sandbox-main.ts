import './sandbox.css';
import { AudioBed } from './audio.ts';
import type { WeaponId } from './combat.ts';
import { CARS, H, W } from './config.ts';
import { DISTRICT_WIDTH } from './district.ts';
import { clearEdges, held, resetInput, startInput, tap } from './input.ts';
import { Sandbox } from './sandbox.ts';
import { renderSandbox } from './sandbox-art.ts';
import { recoverCheckpoint, sandboxStorage, type SandboxSave } from './sandbox-save.ts';
import { loadSettings, storeSettings } from './save.ts';
import { isCosmetic, shopStock } from './shops.ts';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header class="mast"><span>STATE OF CRIME</span><div class="radio"><span id="stars" aria-label="Wanted level"></span><small id="pursuit"></small></div><button id="pause">Pause <kbd>Esc</kbd></button></header>
  <section class="stage" aria-label="Crownwater">
    <canvas width="${W}" height="${H}" aria-label="Side-scrolling Crownwater sandbox"></canvas>
    <div id="menu" class="shade">
      <section class="card">
        <p class="eyebrow">THE CITY AFTER DARK</p>
        <h1 id="menu-title">State of Crime</h1>
        <p class="deck">Crownwater · Lantern Row to Glasshouse Works</p>
        <p id="first-steps"><strong>A / D</strong> Move · <strong>Space</strong> Jump · <strong>Esc</strong> Pause<br>
          Try the fire escape to your left, or head right and press <strong>E</strong> at a lit door to enter Bluehour Arcade.</p>
        <div class="menu-actions"><button id="play" class="primary">New Game</button><button id="new-game" hidden>New Game</button></div>
        <p id="retry-detail" class="deck"></p>
        <p id="save-warning"></p>
        <details id="help"><summary>Controls &amp; settings</summary>
          <dl><div><dt>Walk / sprint</dt><dd>A D or ← → / Shift</dd></div>
          <div><dt>Fire escapes</dt><dd>W S or ↑ ↓</dd></div>
          <div><dt>Jump / interact</dt><dd>Space / E</dd></div>
          <div><dt>Attack / aim / reload</dt><dd>F / hold Q (+ W S) / R</dd></div>
          <div><dt>Weapon slots</dt><dd>1–6</dd></div>
          <div><dt>Rob</dt><dd>G near a target</dd></div>
          <div><dt>Drive / lanes / brake / exit</dt><dd>A D / W S / Space / X</dd></div>
          <div><dt>Pause</dt><dd>Esc</dd></div></dl>
          <label>Volume <input id="volume" type="range" min="0" max="1" step=".05"></label>
          <label><input id="mute" type="checkbox"> Mute</label>
          <label><input id="motion" type="checkbox"> Reduced motion</label>
        </details>
      </section>
    </div>
    <div id="shop" class="shade" hidden>
      <section class="card shop-card" aria-label="Shop">
        <p class="eyebrow">CROWNWATER STOREFRONT</p>
        <h1 id="shop-title"></h1>
        <p id="shop-message" class="deck" aria-live="polite"></p>
        <p id="disguise-tip" class="deck"></p>
        <div id="stock-list"></div>
        <button id="leave-shop">Back <kbd>Esc</kbd></button>
      </section>
    </div>
  </section>
  <footer class="dock"><div class="district-readout"><strong id="block">Lantern Row</strong>
    <div class="strip-map" aria-hidden="true"><span id="location"></span></div></div>
    <span id="prompt"></span><span id="equipment"></span><span id="status"></span></footer>`;
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = app.querySelector('canvas')!;
const context = canvas.getContext('2d', { alpha: false })!;
const settings = loadSettings();
const audio = new AudioBed(settings);
const play = get<HTMLButtonElement>('play');
const pause = get<HTMLButtonElement>('pause');
const menu = get('menu');
const shop = get('shop');
const newGame = get<HTMLButtonElement>('new-game');
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
const gameWith = (saved?: SandboxSave | null) => {
  const result = new Sandbox(name => audio.cue(name));
  if (saved) result.restore(saved);
  return result;
};
let game = gameWith();
function browserStorage() { try { return window.localStorage; } catch { return undefined; } }
const persistence = sandboxStorage(game.snapshot(), browserStorage());
let checkpoint = persistence.saved;
let saveWarning = persistence.warning;
let saveAt = 0;
let started = false;
let running = false;
pause.disabled = true;
function save(replace = false) {
  if (!started || !game.hp) return;
  checkpoint = game.snapshot();
  persist(checkpoint, replace);
}
function persist(next: SandboxSave, replace = false) {
  const status = persistence.write(next, replace);
  saveWarning = status === 'changed' ? 'Save changed in another tab · this session only'
    : status === 'unavailable' ? 'Storage unavailable · this session only' : '';
}
function menuLabels(title?: string) {
  get('menu-title').textContent = title ?? (started ? 'Paused' : 'State of Crime');
  play.textContent = title ? 'Retry' : started ? 'Resume' : checkpoint ? 'Continue' : 'New Game';
  get('retry-detail').textContent = title && game.police.level ? 'Retry from cover. Wanted stars do not reset.' : '';
  newGame.hidden = !started && !checkpoint;
  get('first-steps').hidden = Boolean(started || checkpoint || title);
  get('save-warning').textContent = saveWarning;
}
function setRunning(value: boolean) {
  running = value;
  menu.hidden = value;
  menuLabels();
  if (!value) play.focus();
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  resetInput();
}
function begin(saved: SandboxSave | null, replace = false) {
  audio.wake();
  game = gameWith(saved);
  started = true;
  pause.disabled = false;
  saveAt = 0;
  save(replace);
  setRunning(true);
}
play.onclick = () => {
  if (started) setRunning(true);
  else begin(checkpoint);
};
newGame.onclick = () => {
  if (window.confirm('Start a new game and replace this Crownwater checkpoint?')) begin(null, true);
};
function pausePlay() {
  if (!running || game.shop) return;
  save();
  setRunning(false);
}
pause.onclick = pausePlay;
window.addEventListener('blur', pausePlay);
document.addEventListener('visibilitychange', () => { if (document.hidden) pausePlay(); });
window.addEventListener('pagehide', () => save());
menuLabels();
function closeShop() {
  shop.hidden = true;
  game.shop = null;
  get('leave-shop').blur();
  resetInput();
}
get('leave-shop').onclick = closeShop;
function showShop() {
  const market = game.shop!;
  const items = shopStock[market.id];
  const stock = get('stock-list');
  const message = get('shop-message');
  const back = get('leave-shop');
  const car = game.garageRide;
  const target = car ? ` · Vehicle: ${CARS[car.kind].label}` : '';
  get('shop-title').textContent = market.name;
  message.textContent = `Available cash $${game.cash}${target}`;
  get('disguise-tip').textContent = items.some(isCosmetic)
    ? 'A disguise makes you harder to recognize. It does not clear wanted stars.' : '';
  stock.replaceChildren();
  const refresh: (() => void)[] = [];
  for (const item of items) {
    const button = document.createElement('button');
    button.className = 'stock';
    const name = document.createElement('strong'), info = document.createElement('small'), price = document.createElement('span');
    const reason = document.createElement('small');
    reason.className = 'stock-reason';
    name.textContent = item.name;
    price.textContent = '$' + item.price;
    button.append(name, price, info, reason);
    refresh.push(() => {
      const issue = game.purchaseIssue(item);
      const rounds = item.kind === 'ammo' ? game.ammoPackRounds : 0;
      info.textContent = rounds > 0 ? `+${rounds} reserve rounds for ${game.armory.gun.name}` : item.info;
      reason.textContent = issue;
      reason.hidden = !issue;
      button.disabled = Boolean(issue);
    });
    button.onclick = () => {
      const result = game.buy(item);
      message.textContent = result || `${item.name} purchased · $${game.cash} left${target}`;
      refresh.forEach(update => update());
      if (button.disabled) back.focus();
      if (!result) save();
    };
    stock.append(button);
  }
  refresh.forEach(update => update());
  shop.hidden = false;
  back.focus();
  resetInput();
}
startInput(() => running && !game.shop, pause);
let previous = performance.now();
function label(id: string, value: string) {
  const el = get(id);
  if (el.textContent !== value) el.textContent = value;
}
function frame(now: number) {
  const dt = Math.min(.035, (now - previous) / 1000);
  previous = now;
  if (started && tap('Escape')) {
    if (game.shop) closeShop();
    else if (running) pausePlay();
    else setRunning(true);
  }
  if (running && !game.shop) {
    const vertical = Number(held('KeyS', 'ArrowDown')) - Number(held('KeyW', 'ArrowUp'));
    const slot = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].findIndex(key => tap(key));
    game.step(dt, {
      side: Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft')),
      vertical, jump: tap('Space'), fast: held('ShiftLeft', 'ShiftRight'), use: tap('KeyE'),
      aim: held('KeyQ'), incline: vertical, reload: tap('KeyR'), fire: held('KeyF') || tap('KeyF'),
      slot: slot < 0 ? undefined : slot as WeaponId, rob: tap('KeyG'), brake: held('Space'),
      laneChange: Number(tap('KeyS', 'ArrowDown')) - Number(tap('KeyW', 'ArrowUp')),
      exit: tap('KeyX'),
    });
    if (game.shop) showShop();
    if (!game.hp) {
      started = false;
      pause.disabled = true;
      if (checkpoint) {
        const wanted = game.police.level > 0;
        checkpoint = recoverCheckpoint(checkpoint, wanted);
        if (wanted) persist(checkpoint);
      }
      setRunning(false);
      menuLabels('Knocked out');
    } else if (game.time >= saveAt && game.body.grounded && !game.body.climb) {
      saveAt = game.time + 1.4;
      save();
    }
  }
  clearEdges();
  const police = game.police;
  audio.step(Math.abs(game.ride?.v ?? 0), police.spotted ? police.level : Math.max(0, police.level - 1), Boolean(game.ride), running && !game.shop);
  renderSandbox(context, game, started ? game.time : now / 1000, settings.reduced);
  label('block', game.block.name);
  get('location').style.left = `${(100 * game.body.x / DISTRICT_WIDTH).toFixed(2)}%`;
  label('prompt', started ? game.noticeTime && game.notice ? game.notice : game.prompt : 'No jobs. No fixed route.');
  label('equipment', game.ride ? `${Math.round(Math.abs(game.ride.v) / 3.9)} mph · ${Math.ceil(game.ride.hp)} integrity`
    : game.armory.readout);
  label('status', `HP ${game.hp} · $${game.cash}`);
  label('stars', '★'.repeat(police.level) + '☆'.repeat(5 - police.level));
  label('pursuit', police.readout(game.suspect));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
