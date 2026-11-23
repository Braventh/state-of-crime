import './style.css';
import { render } from './art.ts';
import { AudioBed } from './audio.ts';
import { CARS, H, JOBS, LIMIT, TOOLS, TUNE, UPGRADES, W, clamp, regionAt, type CarKind } from './config.ts';
import { Game, type Purchase } from './game.ts';
import { clearEdges, resetInput, startInput, tap } from './input.ts';
import { fresh, loadSave, loadSettings, storeSettings, type Progress } from './save.ts';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header class="mast">
    <div class="brand"><span class="icon">◩</span> SOUTHLINE <span class="muted">/</span> ARCADE</div>
    <div class="mast-right"><span class="live"></span> PALMETTO STATE <span class="muted">/</span> VOL. 01</div>
  </header>
  <div class="frame">
    <canvas aria-label="Side-scrolling streets of Palmetto State" width="${W}" height="${H}"></canvas>
    <div class="grain"></div>
    <section class="hud" hidden aria-label="Game status">
      <div class="top-left"><div class="caps" id="district"></div><div id="area"></div><div id="vitals"></div></div>
      <div class="top-right"><div class="caps">POLICE BAND</div><div id="stars"></div><div id="pursuit"></div></div>
      <div class="job"><div class="caps" id="jobname"></div><div id="objective"></div><div id="distance"></div></div>
      <div class="tracker" aria-label="District map"><div class="roadline"><i id="map-target"></i><i id="map-player"></i></div><div class="maplabels"><span>CROWN</span><span>KEYS</span><span>YARD</span></div></div>
      <div class="interaction" id="interaction"></div>
      <div class="notice" id="notice" role="status"></div>
      <div class="hidden-state" id="hide" hidden><div class="caps">RADIO SILENCE</div><strong>Below the signal.</strong><div id="hide-detail"></div></div>
      <button class="pause-button" type="button" id="pause" aria-label="Pause">Ⅱ</button>
    </section>
    <section class="overlay" aria-label="Game menu"></section>
  </div>
  <footer><span><b>01</b> &nbsp; THE PALMETTO TAPES <i></i> A COASTAL SANDBOX</span><span>KEYBOARD REQUIRED TO PLAY <i></i> <kbd>ESC</kbd> MENU</span></footer>
`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = app.querySelector('canvas')!;
const overlay = app.querySelector<HTMLElement>('.overlay')!;
const ctx = canvas.getContext('2d', { alpha: false })!;
const hud = app.querySelector<HTMLElement>('.hud')!;
const settings = loadSettings();
const audio = new AudioBed(settings);
let game: Game | null = null;
let scene: 'title' | 'play' | 'pause' | 'settings' | 'garage' | 'over' = 'title';
let settingsFrom: 'title' | 'pause' = 'title';
let needsRender = true;
const keys = '<kbd>A</kbd> <kbd>D</kbd> Move / drive · <kbd>Shift</kbd> Run · <kbd>Space</kbd> Jump / brake · <kbd>W</kbd> <kbd>S</kbd> Change lanes · <kbd>E</kbd> Interact · <kbd>F</kbd> Attack · <kbd>1</kbd>–<kbd>3</kbd> Tools';
const btn = (id: string, text: string, primary = false, disabled = false) =>
  '<button type="button" data-action="' + id + '" class="' + (primary ? 'primary' : 'secondary') + '"' + (disabled ? ' disabled' : '') + '>' + text + '</button>';
const carKeys = Object.keys(CARS) as CarKind[];
function start(progress: Progress, shouldSave = false) {
  game = new Game(progress, name => audio.cue(name));
  if (shouldSave) game.checkpoint();
  goto('play');
}
function goto(s: typeof scene) {
  scene = s;
  needsRender = true;
  resetInput();
  document.body.classList.toggle('reduced', settings.reduced);
  hud.hidden = !game || scene === 'title';
  overlay.hidden = scene === 'play';
  overlay.className = 'overlay ' + scene;
  if (s === 'play') { (document.activeElement as HTMLElement | null)?.blur(); return; }
  if (s === 'title') {
    overlay.innerHTML = `
      <div class="cover">
        <div class="eyebrow"><i></i> SOUTHLINE ARCADE PRESENTS <span>001</span></div>
        <h1><small>STATE OF</small><em>CRIME<span>.</span></em></h1>
        <div class="tagline">Five jobs. One crooked coast.</div>
        <p>Run the road from Crownwater neon to the far freight yards. Keep the signal alive and the law in your mirrors.</p>
        <div class="buttons">${btn('new', 'New game <span>↗</span>', true)}${btn('continue', 'Continue', false, !loadSave())}${btn('settings', 'Settings')}</div>
      </div>
      <div class="stamp"><div>24° N &nbsp; / &nbsp; 81° W</div><strong>THE<br>PALMETTO<br>TAPES</strong><span>EPISODE 01 — OPEN ROAD</span></div>
      <div class="title-controls"><b>FIELD CONTROLS</b> ${keys}</div>`;
  }
  if (s === 'pause') overlay.innerHTML = panel('INTERMISSION', 'Paused.', 'The coast can wait.',
    btn('resume', 'Resume ↗', true) + btn('settings', 'Settings') + btn('title', 'Main menu'), '<p class="controls">' + keys + '</p>');
  if (s === 'settings') overlay.innerHTML = panel('OPTIONS / AUDIO & DISPLAY', 'Settings.', 'Settings are saved on this browser.', btn('back', 'Back ↗', true),
    `<label>Master volume <span id="volume-label">${Math.round(settings.volume * 100)}%</span><input id="volume" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}"></label>
    <label class="toggle">Mute <input id="mute" type="checkbox" ${settings.mute ? 'checked' : ''}></label>
    <label class="toggle">Reduced motion <input id="reduced" type="checkbox" ${settings.reduced ? 'checked' : ''}></label>`);
  if (s === 'garage' && game) {
    const p = game.progress;
    const products = (['engine', 'armor'] as const).map(k => btn(k, (k === 'engine' ? 'Engine tune' : 'Reinforced shell') + ' <span>' + (p[k] ? 'INSTALLED' : '$' + UPGRADES[k]) + '</span>', false, p[k] || p.cash < UPGRADES[k]));
    const fleet = carKeys.map(k => btn(k, CARS[k].label + ' <span>' + (k === p.selected ? 'SELECTED' : p.owned.includes(k) ? 'DEPLOY' : k !== 'compact' ? '$' + UPGRADES[k] : 'OWNED') + '</span>', false, k === p.selected || (k !== 'compact' && !p.owned.includes(k) && p.cash < UPGRADES[k])));
    overlay.innerHTML = panel('GARAGE / CROWNWATER', 'Sidecar.', '$' + p.cash.toLocaleString('en-US') + ' cash · Tunings apply to garage vehicles.',
      btn('service', 'Restock & stage ride', true) + btn('close', 'Back to street'), '<div class="garage-list">' + [...products, ...fleet].join('') + '</div>');
  }
  if (s === 'over') overlay.innerHTML = panel('TRANSMISSION LOST', 'Busted.', 'The last safe checkpoint is still on tape.',
    btn('retry', 'Reload checkpoint ↗', true) + btn('title', 'Main menu'));
}
function panel(kicker: string, title: string, caption: string, buttons: string, inner = '') {
  return `<div class="panel"><div class="eyebrow"><i></i> ${kicker}</div><h2>${title}</h2><p>${caption}</p>${inner}<div class="buttons">${buttons}</div></div>`;
}
function updateSettings() {
  storeSettings(settings);
  audio.apply();
  document.body.classList.toggle('reduced', settings.reduced);
}
overlay.addEventListener('input', e => {
  const input = e.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (input.id === 'volume') {
    settings.volume = input.valueAsNumber / 100;
    $('volume-label').textContent = input.value + '%';
  }
  if (input.id === 'mute') settings.mute = input.checked;
  if (input.id === 'reduced') { settings.reduced = input.checked; needsRender = true; }
  updateSettings();
});
overlay.addEventListener('click', e => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || !button.dataset.action) return;
  audio.wake();
  const action = button.dataset.action;
  if (action === 'new') {
    if (loadSave() && !window.confirm('Replace the current checkpoint with a new game?')) return;
    start(fresh(), true);
  } else if (action === 'continue' || action === 'retry') start(loadSave() ?? fresh());
  else if (action === 'settings') {
    settingsFrom = scene === 'pause' ? 'pause' : 'title';
    goto('settings');
  } else if (action === 'back') goto(settingsFrom);
  else if (action === 'title') { game = null; goto('title'); }
  else if (action === 'resume') goto('play');
  else if (action === 'close' && game) { game.garage = false; goto('play'); }
  else if (action === 'service' && game) { game.service(); game.garage = false; goto('play'); }
  else if (scene === 'garage' && game) { game.purchase(action as Purchase); goto('garage'); }
});
$('pause').addEventListener('click', () => goto('pause'));
startInput(() => scene === 'play');
window.addEventListener('blur', () => { if (scene === 'play') goto('pause'); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.step(0, 0, false, false);
});

function updateHud(g: Game) {
  const area = regionAt(g.x);
  $('district').textContent = area.id + ' / ' + area.caption;
  $('area').textContent = area.name;
  $('vitals').innerHTML = '<span class="health"><i style="width:' + g.hp + '%"></i></span><span>HP ' + Math.ceil(g.hp) + '</span><b>$' + g.progress.cash.toLocaleString('en-US') + '</b>';
  $('stars').innerHTML = Array.from({ length: 4 }, (_, i) => '<span class="' + (i < g.heat ? 'hot' : '') + '">◆</span>').join('');
  $('pursuit').textContent = g.heat ? g.search > 0 ? 'SEARCH / ' + Math.max(0, TUNE.police.search[g.heat] - g.search).toFixed(1) + 's'
    : ['', 'SUSPICION', 'IN PURSUIT', 'HEAVY PURSUIT', 'MAXIMUM THREAT'][g.heat] : 'CLEAR SIGNAL';
  const goal = g.goal();
  $('jobname').textContent = g.current ? '0' + (g.index + 1) + ' / ' + (g.job ? g.current.title : 'New contact') : '05 / 05 · CAMPAIGN COMPLETE';
  $('objective').textContent = goal.text;
  const gap = goal.x - g.x;
  const status = g.car ? CARS[g.car.kind].label + ' · ' + Math.round(Math.abs(g.car.v) * .34) + ' KM/H · ' + Math.max(0, Math.ceil(g.car.hp)) + ' INTEGRITY'
    : TOOLS[g.weapon].name + (g.weapon ? ' · ' + g.charge + ' charge' : ' · F');
  $('distance').textContent = (g.current ? (Math.abs(gap) < 80 ? 'HERE' : (gap > 0 ? '→ ' : '← ') + Math.round(Math.abs(gap) / 9) + ' M') + '  /  ' : '') + status;
  $('map-player').style.left = clamp(g.x / LIMIT * 100, 0, 100) + '%';
  $('map-target').style.left = clamp(goal.x / LIMIT * 100, 0, 100) + '%';
  $('map-target').hidden = !g.current;
  const prompt = g.prompt();
  $('interaction').textContent = prompt;
  $('interaction').hidden = !prompt;
  if (g.notice) {
    $('notice').dataset.kind = g.notice.kind;
    if ($('notice').textContent !== g.notice.title + g.notice.detail) {
      const heading = document.createElement('strong'), detail = document.createElement('span');
      heading.textContent = g.notice.title; detail.textContent = g.notice.detail;
      $('notice').replaceChildren(heading, detail);
    }
  }
  $('notice').hidden = !g.notice;
  $('hide').hidden = !g.hide;
  $('hide-detail').textContent = g.heat ? 'Stay quiet until the search moves on.' : 'Band is clear. Press E to rejoin the road.';
}
let last = performance.now(), hudAt = 0;
function loop(now: number) {
  const dt = Math.min(.034, Math.max(0, (now - last) / 1000));
  last = now;
  if (tap('Escape', 'KeyP')) {
    if (scene === 'play') goto('pause');
    else if (scene === 'pause') goto('play');
    else if (scene === 'settings') goto(settingsFrom);
    else if (scene === 'garage' && game) { game.garage = false; goto('play'); }
  }
  if (scene === 'play' && game) {
    if (dt > 0) game.step(dt);
    if (game.garage) goto('garage');
    if (game.lost) goto('over');
  }
  if (game && (needsRender || (scene === 'play' && now >= hudAt))) { updateHud(game); hudAt = now + 70; }
  audio.step(Math.abs(game?.car?.v ?? 0), game?.heat ?? 0, Boolean(game?.car), !document.hidden && (scene === 'play' || scene === 'title'));
  if (needsRender || scene === 'play' || (scene === 'title' && !settings.reduced)) {
    render(ctx, now / 1000, game, settings.reduced);
    needsRender = false;
  }
  clearEdges();
  requestAnimationFrame(loop);
}
goto('title');
requestAnimationFrame(loop);
