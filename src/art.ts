import { CARS, H, LIMIT, PLATFORMS, POINTS, ROAD, TOOLS, TUNE, W, clamp, regionAt } from './config.ts';
import type { Game, Vehicle } from './game.ts';

type Ctx = CanvasRenderingContext2D;
const fract = (x: number) => x - Math.floor(x);
const n = (i: number) => fract(Math.sin(i * 138.713 + .1) * 7381.511);
const box = (c: Ctx, color: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = color; c.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
};
function shape(c: Ctx, color: string | CanvasGradient, ...xy: number[]) {
  c.fillStyle = color; c.beginPath(); c.moveTo(xy[0], xy[1]);
  for (let i = 2; i < xy.length; i += 2) c.lineTo(xy[i], xy[i + 1]);
  c.closePath(); c.fill();
}
function line(c: Ctx, color: string, width: number, ...xy: number[]) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(xy[0], xy[1]);
  for (let i = 2; i < xy.length; i += 2) c.lineTo(xy[i], xy[i + 1]);
  c.stroke();
}
function type(c: Ctx, copy: string, x: number, y: number, color: string, size: number, center = false) {
  c.font = 'bold ' + size + 'px monospace'; c.fillStyle = color; c.textAlign = center ? 'center' : 'left';
  c.fillText(copy, Math.round(x), Math.round(y));
}
function orb(c: Ctx, x: number, y: number, r: number, color: string) {
  c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
function sky(c: Ctx, cam: number, clock: number) {
  const g = c.createLinearGradient(0, 0, 0, 372);
  g.addColorStop(0, '#17152f'); g.addColorStop(.36, '#38294d'); g.addColorStop(.73, '#a85e70'); g.addColorStop(1, '#f69d79');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 48; i++) {
    const x = ((n(i + 50) * 1600 - cam * .03 + 1600) % 1600);
    if (x > W) continue;
    box(c, n(i + 12) > .68 ? '#d8afa1' : '#796181', x, 10 + n(i + 19) * 140, i % 5 === 0 ? 2 : 1, 1);
  }
  const sun = 740 - cam * .033;
  const glow = c.createRadialGradient(sun, 236, 0, sun, 236, 132);
  glow.addColorStop(0, '#ffb57565'); glow.addColorStop(1, '#ffb57500');
  c.fillStyle = glow; c.fillRect(sun - 132, 104, 264, 264);
  orb(c, sun, 236, 54, '#f8b080');
  c.save(); c.beginPath(); c.arc(sun, 236, 54, 0, Math.PI * 2); c.clip();
  for (let i = 0; i < 11; i++) box(c, i % 2 ? '#bf7180' : '#d88682', sun - 57, 234 + i * 5, 115, 1 + i * .25);
  c.restore();
  for (let i = 0; i < 15; i++) {
    const x = ((n(i + 92) * 1350 - cam * .052 - clock * 2 + 2700) % 1350) - 140;
    const y = 110 + n(i + 24) * 173, w = 22 + n(i + 141) * 130;
    box(c, '#e29a9419', x + 10, y, w, 4);
    box(c, '#eb9b8e37', x, y + 4, w + 24, 2);
    box(c, '#40294743', x + 18, y + 8, w - 5, 3);
  }
  box(c, '#8c526d', 0, 326, W, 3);
  box(c, '#513b5b', 0, 329, W, 90);
  for (let i = 0; i < 115; i++) {
    const x = ((n(i + 60) * 1100 - cam * .09 + 2200) % 1100);
    const y = 329 + n(i + 104) * 77;
    const color = y < 342 && i % 4 === 0 ? '#dc897d' : i % 3 === 0 ? '#b16c81' : '#694760';
    box(c, color, x + Math.sin(clock * .49 + i) * 9, y, 4 + n(i + 16) * 33, 1);
  }
}
function horizon(c: Ctx, cam: number) {
  for (const [factor, tone] of [[.33, '#76516e'], [.59, '#45324f']] as const) {
    for (let i = Math.floor(cam / 60) - 21; i < (cam + W) / 60 + 22; i++) {
      const wx = i * 60;
      const x = (wx - cam - W / 2) * factor + W / 2;
      if (x < -90 || x > W) continue;
      const id = regionAt(wx).id;
      if (id === '02') {
        if (i % 4 !== 0) continue;
        const y = 324 - n(i + 24) * 21;
        shape(c, tone, x - 32, 341, x - 13, y + 3, x + 9, y, x + 43, y + 10, x + 73, 341);
        continue;
      }
      const w = 22 + n(i + 23) * 53;
      const h = (id === '01' ? 28 + n(i + 47) * 153 : 12 + n(i + 47) * 48) * (factor + .5);
      const y = 356 - h;
      box(c, tone, x, y, w, h);
      box(c, tone, x + 7, y - 6 - n(i + 9) * 9, w * .56, 15);
      if (i % 3 === 0) box(c, tone, x + w * .47, y - 21, 2, 24);
      for (let row = y + 12; row < 340; row += 13) {
        for (let col = x + 5; col < x + w - 4; col += 8)
          if (n(i + row * .8 + col) > .51) box(c, factor > .4 ? '#865472' : '#9c6477', col, row, 2, 4);
      }
    }
  }
}
function palm(c: Ctx, x: number, y: number, height: number, lean: number, dim = false) {
  const tx = x + lean, ty = y - height, leaf = dim ? '#27273b' : '#2b3441';
  const lit = dim ? '#343246' : '#40515a';
  line(c, '#251d2f', 6, x, y, x + lean * .46, y - height * .64, tx, ty);
  line(c, dim ? '#544154' : '#a76b65', 2, x - 1, y - 2, x + lean * .46 - 1, y - height * .64, tx - 1, ty);
  for (let i = 10; i < height - 9; i += 8)
    box(c, '#654751', x + lean * (i / height) ** 1.6 - 2, y - i, 5, 2);
  for (const [dx, dy, bend] of [[-53, 20, -8], [-46, 0, -18], [-27, -15, -25], [0, -26, -30], [30, -16, -24], [54, 4, -16], [47, 19, -5], [24, 29, 4]]) {
    const k = height / 124;
    shape(c, leaf, tx, ty + 4, tx + dx * .44 * k, ty + bend * k, tx + dx * .73 * k, ty + (bend + 1) * k,
      tx + dx * k, ty + dy * k, tx + dx * .68 * k, ty + (dy - 3) * k, tx + dx * .37 * k, ty + (bend + 10) * k);
    line(c, lit, 1, tx, ty, tx + dx * .5 * k, ty + bend * k, tx + dx * .81 * k, ty + (dy - 4) * k);
  }
  box(c, lit, tx - 4, ty - 2, 7, 4);
}
function city(c: Ctx, x: number, i: number) {
  const w = 145 + Math.floor(n(i + 4) * 51), tall = i % 4 !== 2;
  const y = 389 - (tall ? 115 + n(i + 28) * 140 : 78 + n(i + 28) * 40);
  const base = ['#593d5b', '#744861', '#734c62', '#493650'][((i % 4) + 4) % 4];
  const edge = i % 2 ? '#b87981' : '#a06977';
  box(c, '#32263d', x + 13, y + 11, w + 13, 393 - y);
  box(c, base, x, y, w, 400 - y);
  box(c, edge, x, y + 4, 3, 391 - y);
  box(c, '#34273d', x + w - 8, y + 5, 8, 396 - y);
  if (tall) {
    box(c, base, x + 20, y - 14, w * .72, 16);
    box(c, edge, x + 18, y - 16, w * .74, 2);
    if (i % 3 === 0) { box(c, '#704866', x + 31, y - 32, 2, 19); box(c, '#ed9a89', x + 30, y - 33, 4, 2); }
  }
  box(c, '#cf8e89', x - 4, y, w + 6, 2);
  box(c, '#37283d', x - 4, y + 2, w + 8, 5);
  for (let row = y + 15; row < 332; row += 23) {
    box(c, '#382940', x + 3, row + 13, w - 14, 2);
    for (let col = 13; col < w - 24; col += 29) {
      const lit = n(i * 61 + Math.floor(row) * 3 + col) > .59;
      box(c, '#30243a', x + col, row - 1, 19, 13);
      box(c, lit ? '#cf8c85' : '#584364', x + col + 1, row, 17, 9);
      box(c, lit ? '#a96976' : '#473750', x + col + 1, row + 5, 17, 4);
      box(c, '#443047', x + col + 8, row, 2, 10);
      box(c, '#9b6278', x + col, row + 10, 19, 1);
    }
  }
  box(c, '#2d2237', x + 5, 348, w - 15, 47);
  const banner = ['LATE TIDE', 'CROWN RADIO', 'SUN ROOM', 'SALT HOTEL', 'HI-FI MARKET', 'AFTERIMAGE', 'TIDELANE', 'CASSETTE', 'SIGNAL EXCHANGE'][Math.abs(i) % 9];
  type(c, banner, x + w / 2, 365, i % 2 ? '#ffab92' : '#e887a7', 10, true);
  for (let col = 16; col < w - 24; col += 24) {
    box(c, '#3f314a', x + col, 374, 16, 18);
    box(c, '#927184', x + col + 1, 375, 14, 1);
    shape(c, '#54425a', x + col, 385, x + col + 12, 375, x + col + 15, 375, x + col + 15, 384, x + col + 3, 392, x + col, 392);
  }
  if (i % 2) {
    shape(c, '#4b3045', x + 1, 367, x + w - 8, 367, x + w + 2, 374, x - 6, 374);
    for (let ix = 0; ix < w; ix += 15) box(c, edge, x + ix, 369, 8, 4);
  }
}
function resort(c: Ctx, x: number, i: number) {
  const w = 164, y = 344 - n(i + 44) * 30;
  if (i % 3 !== 0) {
    for (let j = 0; j < 5; j++) box(c, '#66516a', x + j * 32, 363, 4, 31);
    line(c, '#b8878d', 2, x - 18, 367, x + 160, 367);
    line(c, '#71536a', 2, x - 18, 375, x + 160, 375);
    palm(c, x + 60, 382, 82 + n(i) * 31, -14);
    return;
  }
  box(c, '#67506b', x + 5, y, w, 391 - y);
  box(c, '#c98a81', x, y + 2, w - 7, 380 - y);
  shape(c, '#37304b', x - 9, y + 5, x + 21, y - 19, x + 132, y - 19, x + 171, y + 5);
  line(c, '#ae7280', 2, x - 8, y + 5, x + 168, y + 5);
  for (let a = 13; a < 145; a += 30) {
    box(c, '#553d59', x + a, y + 14, 18, 18);
    box(c, '#e9b190', x + a + 2, y + 15, 14, 14);
    box(c, '#927080', x + a + 8, y + 15, 2, 16);
    box(c, '#513b58', x + a - 2, y + 31, 22, 3);
  }
  box(c, '#352a46', x + 6, 369, 142, 18);
  type(c, 'SUNSPLICE  /  BAY MOTEL', x + 77, 382, '#eac4a3', 9, true);
}
function crane(c: Ctx, x: number, i: number) {
  const y = 247 + n(i) * 28;
  line(c, '#392b43', 9, x + 48, 366, x + 48, y + 22, x + 161, y);
  line(c, '#a26d60', 2, x + 46, 360, x + 46, y + 13, x + 161, y);
  line(c, '#513b4c', 3, x + 14, 364, x + 48, y + 12, x + 14, y + 25);
  line(c, '#442e48', 2, x + 136, y + 5, x + 136, 327);
  box(c, '#b97e64', x + 130, 327, 12, 4);
  box(c, '#df9b74', x + 157, y - 3, 6, 4);
}
function container(c: Ctx, x: number, y: number, w: number, h: number, color: string, serial: string) {
  box(c, '#2b2437', x - 2, y - 1, w + 4, h + 1);
  box(c, color, x, y, w, h - 3);
  for (let a = 5; a < w - 5; a += 8) {
    box(c, '#261a3426', x + a, y + 3, 3, h - 7);
    box(c, '#efb79a39', x + a + 4, y + 3, 1, h - 7);
  }
  box(c, '#f2ad805e', x, y, w, 2);
  type(c, serial, x + 8, y + Math.min(h - 6, 20), '#ebbd9c', 8);
}
function dock(c: Ctx, x: number, i: number) {
  if (i % 2 === 0) crane(c, x, i);
  const w = 158, y = 329 - n(i + 44) * 19;
  if (i % 3 === 0) {
    shape(c, '#51394e', x - 8, y + 8, x + 31, y - 18, x + 130, y - 18, x + 168, y + 8);
    box(c, '#654759', x, y + 8, w, 391 - y);
    for (let a = 0; a < 7; a++) box(c, '#7a5360', x + a * 23, y + 10, 2, 388 - y);
    box(c, '#312639', x + 16, 357, 94, 33);
    for (let k = 0; k < 6; k++) box(c, '#4d384b', x + 18, 359 + k * 5, 90, 1);
    box(c, '#bc876c', x + 119, 357, 31, 2);
    type(c, 'FREIGHT', x + 19, y + 29, '#e9ac7d', 12);
  } else {
    container(c, x, 351, 100, 38, '#87585d', 'PW / ' + (i + 31));
    container(c, x + 97, 363, 64, 26, '#74576a', '06');
  }
}
function lamp(c: Ctx, x: number, h: number) {
  const y = 398 - h;
  line(c, '#30273a', 4, x, 399, x, y + 9, x + 8, y, x + 29, y);
  line(c, '#99707b', 1, x - 1, 392, x - 1, y + 10, x + 8, y - 1, x + 28, y - 1);
  box(c, '#ffb485', x + 17, y, 13, 3);
  const cone = c.createLinearGradient(0, y, 0, 401);
  cone.addColorStop(0, '#ffd2962e'); cone.addColorStop(1, '#ffd29600');
  shape(c, cone, x + 18, y + 2, x + 29, y + 2, x + 68, 403, x - 17, 403);
}
function ground(c: Ctx, cam: number) {
  box(c, '#674a5d', 0, 393, W, 15);
  box(c, '#c0877e', 0, 397, W, 3);
  box(c, '#3a3043', 0, 403, W, 83);
  box(c, '#4a394a', 0, 409, W, 7);
  box(c, '#342c40', 0, 449, W, 35);
  box(c, '#b27a76', 0, 466, W, 2);
  box(c, '#573e50', 0, 468, W, 15);
  box(c, '#2c2438', 0, 480, W, 60);
  box(c, '#3b2b40', 0, 484, W, 12);
  box(c, '#1d192b', 0, 524, W, 16);
  for (let i = Math.floor(cam / 40); i < (cam + W) / 40 + 1; i++) {
    const x = i * 40 - cam;
    box(c, '#79566a', x, 395, 11 + n(i) * 20, 1);
    box(c, '#3f3042', x, 400, 1, 3);
    box(c, '#a57778', x, 421, 21, 1);
    box(c, '#655262', x + 11, 449, 19, 1);
    box(c, '#4d3d51', x + n(i) * 31, 431 + n(i + 91) * 30, 3 + n(i + 5) * 7, 1);
    box(c, '#5e4356', x, 473, 39, 2);
    box(c, '#392d40', x, 478, 1, 16);
    box(c, '#362940', x + 4, 511 - n(i + 5) * 16, 5, 4);
  }
}
function landmark(c: Ctx, x: number, title: string, shade: string) {
  const w = title.length * 7 + 16;
  box(c, '#241e31', x - w / 2 - 2, 375, w + 4, 25);
  box(c, '#463145', x - w / 2, 377, w, 18);
  box(c, shade, x - w / 2, 377, w, 1);
  type(c, title, x, 390, shade, 10, true);
}
function human(c: Ctx, x: number, y: number, dir: number, gait: number, coat: string, player: boolean, hit = false, airborne = false) {
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(dir, 1);
  const stride = airborne ? 3 : Math.round(Math.sin(gait) * 5);
  const lift = airborne ? 4 : Math.round(Math.abs(Math.sin(gait)) * 2);
  const jacket = hit ? '#fff0d7' : coat;
  box(c, '#17162564', -12, -2, 24, 3);
  line(c, '#222336', 6, -5, -16, -5 - stride, -8, -6 - stride, -2 - lift);
  line(c, '#373550', 6, 3, -17, 2 + stride, -8, 3 + stride, -2);
  box(c, '#252133', -8 - stride, -4 - lift, 10, 3);
  box(c, player ? '#f6b18a' : '#312a3d', 0 + stride, -3, 10, 3);
  shape(c, '#222033', -9, -32, -5, -37, 4, -37, 10, -30, 9, -14, -8, -14);
  shape(c, jacket, -7, -31, -4, -35, 5, -35, 8, -30, 6, -17, -7, -17);
  box(c, player ? '#493247' : '#403349', 1, -33, 4, 16);
  box(c, player ? '#f5c397' : '#cda89c', -5, -35, 8, 4);
  box(c, '#a86b64', -4, -37, 8, 6);
  box(c, '#e8a981', -5, -45, 11, 10);
  box(c, '#f6ba91', 5, -42, 2, 4);
  box(c, '#211d2f', -7, -46, 12, 4);
  box(c, '#32243a', -7, -44, 4, 7);
  box(c, '#412b3c', 4, -42, 2, 1);
  if (player) {
    box(c, '#f7c293', -7, -47, 13, 2);
    box(c, '#e27a71', -8, -45, 17, 2);
    box(c, '#bf685f', -9, -29, 3, 13);
  }
  line(c, jacket, 4, 6, -31, 9 - stride * .45, -22, 9 - stride, -19);
  box(c, '#ca8e78', 8 - stride, -20, 4, 4);
  c.restore();
}
function vehicle(c: Ctx, x: number, y: number, kind: Vehicle['kind'], dir: number, v: number, color: string,
  clock: number, police = false, heavy = false, player = false) {
  const spec = CARS[kind], w = spec.width, h = spec.height;
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(dir, 1);
  const l = -Math.round(w / 2), r = -l;
  box(c, '#20182c80', l - 4, 0, w + 8, 5);
  const back = kind === 'van' ? l + 5 : l + 12, nose = kind === 'coupe' ? 3 : 8;
  shape(c, '#232033', l - 2, -7, l, -18, back, -h - 2, nose, -h - 2, r - 10, -16, r, -14, r + 2, -5, l - 2, -5);
  shape(c, color, l + 1, -8, l + 2, -16, back + 1, -h, nose, -h, r - 10, -14, r - 1, -12, r, -8);
  box(c, color, l, -13, w, 5);
  box(c, '#1c1b2d50', l, -9, w, 4);
  shape(c, '#332e4b', back + 4, -h + 2, nose - 2, -h + 2, r - 14, -15, back + 2, -15);
  shape(c, '#a1a2b7', back + 6, -h + 3, nose - 3, -h + 3, r - 16, -16, back + 4, -16);
  shape(c, '#62617e', -3, -h + 3, nose - 3, -h + 3, r - 16, -16, 1, -16);
  box(c, '#36304a', -4, -h + 2, 3, h - 16);
  box(c, '#ffd5b662', l + 6, -13, w - 14, 1);
  box(c, '#292338', 2, -12, 6, 1);
  box(c, '#ffc189', r - 4, -13, 5, 3);
  box(c, '#f28886', l, -14, 4, 3);
  box(c, '#8a7a8c', r - 5, -6, 7, 2);
  box(c, '#8a7a8c', l - 2, -6, 6, 2);
  for (const a of [l + 12, r - 14]) {
    orb(c, a, -5, heavy ? 8 : 7, '#201d2d');
    orb(c, a, -5, 4, '#777385');
    const spoke = clock * v * .075;
    line(c, '#bdadac', 1, a - Math.cos(spoke) * 3, -5 - Math.sin(spoke) * 3,
      a + Math.cos(spoke) * 3, -5 + Math.sin(spoke) * 3);
    box(c, '#353042', a - 1, -6, 2, 2);
  }
  if (player || police) shape(c, '#ffd4a622', r, -12, r + 70, -15, r + 90, 3, r, -8);
  if (police) {
    const active = Math.floor(clock * 9) % 2;
    box(c, active ? '#ff7c94' : '#5f3357', -10, -h - 5, 8, 3);
    box(c, active ? '#334269' : '#8daaff', -2, -h - 5, 9, 3);
    orb(c, active ? -6 : 3, -h - 4, 11, active ? '#ff659b36' : '#6e94ff42');
    box(c, '#ddd3b9', -8, -12, 16, 3);
  }
  c.restore();
}
function marker(c: Ctx, x: number, y: number, clock: number, name: string, color: string) {
  if (x < 18 || x > W - 18) return;
  const yy = Math.floor(y + Math.sin(clock * 3.7) * 4);
  const len = name.length * 5.3 + 14;
  box(c, '#1d1a2ae8', x - len / 2, yy - 19, len, 15);
  box(c, color, x - len / 2, yy - 19, len, 1);
  type(c, name.toUpperCase(), x, yy - 8, color, 8, true);
  shape(c, color, x - 5, yy - 1, x + 5, yy - 1, x, yy + 5);
}
export function render(c: Ctx, now: number, game: Game | null, reduced: boolean) {
  const clock = game?.clock ?? (reduced ? 0 : now);
  let cam = game ? game.camera : 342 + Math.sin(clock * .14) * 75;
  cam = Math.round(cam + (game && !reduced ? Math.sin(clock * 113) * game.shake : 0));
  sky(c, cam, clock);
  horizon(c, cam);
  for (let i = Math.floor(cam / 220) - 1; i <= (cam + W) / 220 + 1; i++) {
    const x = i * 220 + 8 - cam, id = regionAt(x + cam).id;
    if (id === '01') city(c, x, i);
    else if (id === '02') resort(c, x, i);
    else dock(c, x, i);
    if (id !== '03' && (i % 2 === 1 || id === '02')) palm(c, x + 193, 399, 105 + n(i * 7) * 39, i % 3 ? -20 : 17);
  }
  ground(c, cam);
  for (let i = Math.floor(cam / 350); i <= (cam + W) / 350 + 1; i++) lamp(c, i * 350 + 77 - cam, 88 + n(i + 7) * 14);
  for (const [id, point] of Object.entries(POINTS)) {
    if (Math.abs(point.x - cam - W / 2) > W / 2 + 90) continue;
    if (['contact', 'delivery', 'finish', 'freight'].includes(id)) continue;
    landmark(c, point.x - cam, point.name.toUpperCase().replace('INEZ / ', ''), id === 'refuge' ? '#92d6c9' : '#f2b29b');
  }
  for (const [i, p] of PLATFORMS.entries()) {
    const x = p.x - cam, h = i < 3 ? 7 : (i === 5 ? 28 : 23);
    if (x + p.width < 0 || x > W) continue;
    if (i < 3) {
      box(c, '#272437', x, p.y, p.width, h);
      box(c, '#b7838b', x, p.y, p.width, 2);
      for (let a = 12; a < p.width; a += 13) {
        box(c, '#84647b', x + a, p.y - 12, 1, 13);
        box(c, '#a67f90', x + a - 12, p.y - 12, 13, 1);
      }
    } else container(c, x, p.y, p.width, h, i === 6 ? '#a46055' : '#6a6476', i === 6 ? 'BEACON / 06' : 'YARD / ' + (i + 12));
  }
  const visible = (x: number) => x > cam - 105 && x < cam + W + 105;
  if (game) {
    for (const [x, coat] of [[POINTS.contact.x, '#e39387'], [POINTS.refuge.x, '#e39387'], [POINTS.race.x, '#8fcab9'], [POINTS.port.x, '#b6a3d1']] as const)
      if (visible(x)) human(c, x - cam, ROAD, -1, 0, coat, false);
    for (const p of game.people) if (visible(p.x) && p.hp > 0) {
      human(c, p.x - cam, p.y, p.dir, clock * (game.heat > 1 ? 10 : 5) + p.home, p.coat, false, p.hit > 0);
      if (p.hostile) {
        box(c, '#322437', p.x - cam - 11, p.y - 57, 22, 3);
        box(c, '#f18e80', p.x - cam - 11, p.y - 57, 22 * p.hp / 70, 2);
      }
    }
    for (const lane of [-1, 0, 1]) {
      for (const v of [...game.traffic, ...game.cars]) if (visible(v.x) && Math.round(v.yLane) === lane)
        vehicle(c, v.x - cam, ROAD + v.yLane * TUNE.laneOffset, v.kind, v.dir, v.v, CARS[v.kind].color, clock, false, false, v === game.car);
      for (const u of game.units) if (visible(u.x) && Math.round(u.lane) === lane)
        vehicle(c, u.x - cam, ROAD + 5 + u.lane * TUNE.laneOffset, u.heavy ? 'van' : 'compact', u.dir, u.v, '#4c587a', clock, true, u.heavy);
    }
    if (game.index === 3 && game.job) {
      vehicle(c, game.job.rival - cam, ROAD + 24, 'coupe', 1, 258, '#87d1bd', clock);
      marker(c, game.job.rival - cam, ROAD - 18, clock, 'ROUX', '#9ce3d0');
    }
    if (!game.car && !game.hide) {
      const p = game.body;
      human(c, p.x - cam, p.y, p.dir, game.gait, '#e67c6d', true, game.damage > .43, !p.ground);
      if (game.flash > 0) {
        const x = p.x - cam + p.dir * 13, y = p.y - 25;
        if (game.weapon) {
          const len = (TOOLS[game.weapon].range - 13) * p.dir;
          line(c, game.weapon === 1 ? '#b4fff0' : '#ffb5c5', 2, x, y, x + len * .26, y - 5, x + len * .48, y + 2, x + len, y - 7);
          orb(c, x, y, 5, '#ffdeb6');
        } else line(c, '#ffd4a6', 2, x, y - 8, x + p.dir * 18, y - 3, x + p.dir * 24, y + 7);
      }
    }
    for (const p of game.dust) {
      c.globalAlpha = p.life / p.max;
      box(c, p.color, p.x - cam, p.y, p.size, p.size);
    }
    c.globalAlpha = 1;
    const g = game.goal();
    if (game.current) marker(c, g.x - cam, g.x === POINTS.exchange.x ? 268 : g.x === POINTS.freight.x ? 324 : 316, clock, g.name, '#ffd6a6');
    if (game.heat) {
      for (const key of [POINTS.garage, POINTS.refuge]) if (key.x !== g.x)
        marker(c, key.x - cam, 330, clock, 'REFUGE', '#98e5d2');
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const x = (i * 209 + clock * (i % 2 ? 91 : 115)) % (W + 100) - 50;
      vehicle(c, i % 2 ? x : W - x, ROAD + (i % 2 ? 21 : -14), i % 3 ? 'compact' : 'van',
        i % 2 ? 1 : -1, 92, ['#c85e7d', '#e39572', '#7699a5'][i % 3], clock);
    }
    human(c, 765, ROAD, -1, 0, '#e67c6d', true);
  }
  const start = regionAt(clamp(cam + 350, 0, LIMIT));
  if (start.id === '02') box(c, '#c7867c16', 0, 360, W, 79);
}
