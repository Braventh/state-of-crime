import { sky, horizon, ground } from './art.ts';
import { W } from './config.ts';
import { blocks, DISTRICT_WIDTH, ladders, passages, roofs, STREET, CELLAR, type Surface } from './district.ts';
import type { Motion } from './traversal.ts';

type Ctx = CanvasRenderingContext2D;
const ink = '#181927';
const wall = ['#443649', '#39414d', '#503847', '#343849'];
const trim = ['#bd7673', '#80aeba', '#ac7486', '#8091b0'];
const light = ['#ffc18a', '#9ecfc0', '#e79b98'];
function rect(c: Ctx, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
export function form(c: Ctx, color: string, ...points: number[]) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.closePath();
  c.fill();
}
export function lettering(c: Ctx, copy: string, x: number, y: number, color: string, size: number) {
  c.fillStyle = color;
  c.font = `bold ${size}px monospace`;
  c.textAlign = 'center';
  c.fillText(copy, x, y);
}
function facade(c: Ctx, floor: Surface, i: number) {
  const { left: x, right, y } = floor;
  const base = STREET - 17;
  const hue = i % wall.length;
  form(c, '#232434', x, y, x + 18, y - 12, right + 15, y - 12, right + 15, base - 12, right, base, x, base);
  form(c, wall[hue], x + 3, y + 4, right - 1, y + 4, right - 1, base, x + 3, base);
  rect(c, '#241e2a', right - 10, y + 5, 9, base - y - 5);
  rect(c, trim[hue], x + 3, y + 8, 2, base - y - 8);
  for (let wy = y + 23, row = 0; wy < base - 31; wy += 43, row++) {
    rect(c, '#211e30', x + 2, wy + 26, right - x - 11, 3);
    for (let wx = x + 22, j = 0; wx < right - 32; wx += 43, j++) {
      rect(c, '#232533', wx - 3, wy - 2, 28, 25);
      rect(c, (j * 3 + row * 7 + i) % 5 < 2 ? light[(j + i) % 3] : '#527080', wx, wy, 21, 19);
      form(c, '#221d3944', wx, wy + 13, wx + 21, wy + 2, wx + 21, wy + 19, wx, wy + 19);
      rect(c, '#323247', wx + 9, wy, 2, 19);
      rect(c, '#262337', wx - 4, wy + 19, 29, 3);
    }
  }
  if (base - y > 70) {
    for (let a = x + 34; a < right - 58; a += 85) {
      rect(c, '#241e30', a, base - 30, 51, 30);
      rect(c, i % 2 ? '#696179' : '#77605e', a + 3, base - 26, 45, 21);
      form(c, '#d59582', a - 6, base - 32, a + 53, base - 32, a + 61, base - 23, a - 11, base - 23);
      for (let k = 0; k < 7; k++) rect(c, '#f1bd955d', a - 10 + k * 10, base - 25, 5, 2);
    }
  }
}
function lip(c: Ctx, { left, right, y }: Surface, i: number) {
  form(c, ink, left - 5, y - 1, left + 4, y - 6, right + 5, y - 6, right + 1, y + 8, left - 5, y + 8);
  rect(c, trim[i % trim.length], left, y, right - left, 2);
  for (let x = left + 8; x < right - 4; x += 13) rect(c, '#28273a', x, y - 12, 2, 10);
  rect(c, '#8b7585', left + 8, y - 13, right - left - 14, 1);
}
function passageArt(c: Ctx, passage: (typeof passages)[number], active: boolean) {
  const { left, right, doors, name } = passage, y = CELLAR;
  form(c, '#171824', left, y + 12, left, y - 49, left + 16, y - 64, right - 16, y - 64, right, y - 49, right, y + 12);
  form(c, active ? '#424453' : '#2e303e', left + 5, y, left + 5, y - 47, left + 19, y - 59,
    right - 19, y - 59, right - 5, y - 47, right - 5, y);
  rect(c, '#777480', left + 17, y - 58, right - left - 34, 1);
  for (let x = left + 108; x < right - 75; x += 95) {
    rect(c, '#262837', x - 12, y - 55, 25, 5);
    rect(c, active ? '#b9ead3' : '#817791', x - 9, y - 52, 19, 3);
    form(c, '#aadbb517', x - 9, y - 49, x + 10, y - 49, x + 36, y, x - 27, y);
    rect(c, '#252635', x + 10, y - 21, 26, 20);
    rect(c, '#747078', x + 11, y - 23, 23, 2);
    for (let top = y - 18; top < y - 3; top += 5) rect(c, '#464555', x + 12, top, 21, 1);
  }
  rect(c, '#879398', left + 8, y, right - left - 16, 2);
  for (const x of doors) {
    form(c, ink, x - 15, STREET - 4, x - 15, STREET - 34, x - 8, STREET - 40, x + 11, STREET - 40, x + 16, STREET - 34, x + 16, STREET - 4);
    rect(c, '#536872', x - 10, STREET - 34, 20, 28);
    rect(c, '#b9ead3', x - 11, STREET - 41, 22, 2);
    rect(c, '#607880', x - 10, y - 35, 20, 35);
    rect(c, '#d6c290', x + 5, y - 19, 3, 2);
  }
  lettering(c, name.toUpperCase(), (left + right) / 2, y - 36, '#b7d5cd', 10);
}
let backlot: HTMLCanvasElement | undefined;
function buildings(c: Ctx, camera: number) {
  if (!backlot) {
    const surface = document.createElement('canvas');
    surface.width = DISTRICT_WIDTH;
    surface.height = STREET;
    const paint = surface.getContext('2d');
    if (paint) {
      for (const [i, roof] of roofs.entries()) facade(paint, roof, i);
      backlot = surface;
    }
  }
  if (backlot) {
    const section = Math.round(camera);
    c.drawImage(backlot, section, 0, W, STREET, 0, 0, W, STREET);
  } else {
    c.save();
    c.translate(-Math.round(camera), 0);
    for (const [i, roof] of roofs.entries())
      if (roof.right >= camera - 30 && roof.left <= camera + W + 30) facade(c, roof, i);
    c.restore();
  }
}
export function renderDistrict(c: Ctx, body: Motion, camera: number, time: number, reduced: boolean,
  foreground?: (c: Ctx) => void) {
  sky(c, camera, reduced ? 0 : time);
  horizon(c, camera);
  const visible = (left: number, right: number) => right >= camera - 30 && left <= camera + W + 30;
  buildings(c, camera);
  ground(c, camera);
  c.save();
  c.translate(-Math.round(camera), 0);
  for (const [i, roof] of roofs.entries()) if (visible(roof.left, roof.right)) lip(c, roof, i);
  for (const { x, low, high } of ladders) {
    if (!visible(x, x)) continue;
    rect(c, '#2b2a38', x - 10, high - 7, 3, low - high + 7);
    rect(c, '#bd8d78', x + 7, high - 7, 2, low - high + 7);
    for (let y = high + 2; y < low; y += 9) rect(c, '#d59d82', x - 9, y, 17, 2);
  }
  for (const passage of passages) if (visible(passage.left, passage.right)) passageArt(c, passage, body.covered && body.x >= passage.left && body.x <= passage.right);
  for (const { name, x, ink: color } of blocks) {
    if (!visible(x - 100, x + 100)) continue;
    rect(c, ink, x - 84, 366, 168, 21);
    rect(c, color, x - 84, 366, 168, 1);
    lettering(c, name.toUpperCase(), x, 380, color, 12);
  }
  foreground?.(c);
  c.restore();
}
