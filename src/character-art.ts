type Ctx = CanvasRenderingContext2D;
const edge = '#191b28';
const pants = '#35384d';
const skins = ['#e6a280', '#bf8064', '#9d614f', '#f3be9c', '#805047'];
const jackets = [
  ['#a14b48', '#ec9b77', '#6d373b'], ['#367a79', '#85c6af', '#315457'],
  ['#625086', '#b196c5', '#413454'], ['#775941', '#eac18e', '#533f36'],
  ['#465b81', '#93b7cb', '#2f415d'], ['#66505c', '#dc90a3', '#473546'],
];
export interface Portrait {
  x: number; y: number; dir: number; stride: number; outfit: number; hair: number;
  skin: number; pose?: number; hit?: number; down?: number; aim?: boolean; slope?: number;
  climb?: boolean; weapon?: number; reload?: boolean;
}
function poly(c: Ctx, fill: string, ...xy: number[]) {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(xy[0], xy[1]);
  for (let i = 2; i < xy.length; i += 2) c.lineTo(xy[i], xy[i + 1]);
  c.closePath();
  c.fill();
}
function limb(c: Ctx, x: number, y: number, tx: number, ty: number, w: number, color: string) {
  c.save();
  c.translate(x, y);
  c.rotate(Math.atan2(ty - y, tx - x));
  const len = Math.hypot(tx - x, ty - y);
  poly(c, edge, -3, -w / 2, len - 1, -w / 2, len + 3, -w / 3, len + 3, w / 3, len, w / 2, -2, w / 2);
  poly(c, color, -1, 1 - w / 2, len, 1 - w / 2, len + 2, 0, len - 1, w / 2 - 1, -1, w / 2 - 1);
  c.restore();
}
export function portrait(c: Ctx, p: Portrait) {
  const [coat, sheen, shade] = jackets[p.outfit % jackets.length];
  const skin = skins[p.skin % skins.length];
  const recoil = p.pose ? (p.weapon ?? 0) >= 2 ? 2 : 6 : 0;
  const brace = p.aim || recoil > 0;
  const gait = Math.sin(p.stride) * (p.climb ? 5 : brace ? 3 : 8);
  const bob = Math.round(Math.abs(gait) * -.22) - (p.climb ? 3 : 0);
  c.save();
  c.translate(Math.round(p.x), Math.round(p.y));
  c.scale(p.dir, 1);
  c.fillStyle = '#1314206e';
  c.beginPath();
  c.ellipse(0, 0, 14, 3, 0, 0, Math.PI * 2);
  c.fill();
  if (p.down) {
    c.translate(0, -5);
    c.rotate(-Math.min(1, p.down * 5) * Math.PI * .48);
  } else if (p.hit) c.rotate(-p.hit * 1.15);
  for (const side of [-1, 1]) {
    const shoe = gait * side + side * 4;
    const foot = -2 - Math.max(0, gait * side) * .32;
    limb(c, side * 4, -23, shoe * .63 - 1, -12 + bob, 9, side < 0 ? '#26283c' : pants);
    limb(c, shoe * .63 - 1, -12 + bob, shoe, foot - 2, 7, side < 0 ? '#2d3045' : '#45465c');
    poly(c, edge, shoe - 4, foot + 1, shoe - 4, foot - 4, shoe + 4, foot - 4, shoe + 8, foot - 1, shoe + 8, foot + 1);
    poly(c, side > 0 ? sheen : '#686072', shoe - 3, foot - 1, shoe + 7, foot - 1, shoe + 7, foot, shoe - 3, foot);
  }
  c.translate(p.hit ? -1 : 0, bob);
  const long = p.outfit % 3 === 1 ? 5 : 0;
  const wide = p.outfit % 3 === 2 ? 3 : 0;
  limb(c, -7, -38, -11 - gait * .5, -24, 10 + wide, shade);
  poly(c, edge, -8 - wide, -40, -2, -44, 7, -43, 13 + wide, -36, 10, -19 + long, 6, -16 + long, -10, -18 + long);
  poly(c, coat, -8 - wide, -38, -2, -42, 7, -41, 11 + wide, -35, 8, -21 + long, 5, -18 + long, -8, -20 + long);
  poly(c, shade, -8 - wide, -36, -4, -35, -3, -26, 5, -21 + long, -8, -20 + long);
  poly(c, sheen, -5 - wide, -38, -1, -42, 3, -39, 10, -38, 8, -35, 0, -36, -5, -34);
  poly(c, '#302b3a', 5, -40, 7, -37, 6, -21, 4, -19);
  poly(c, '#d5aa8d', -6, -29, -1, -30, 1, -27, -5, -26);
  poly(c, skin, -3, -41, -1, -46, 6, -45, 6, -40, 2, -38);
  poly(c, edge, -7, -55, -3, -60, 7, -60, 11, -56, 11, -51, 13, -48, 10, -46, 7, -42, 0, -43, -5, -46);
  poly(c, skin, -4, -55, 1, -58, 7, -57, 9, -53, 9, -50, 11, -48, 8, -47, 6, -44, 0, -45, -4, -49);
  poly(c, '#783f43', 6, -47, 9, -48, 7, -45, 3, -45);
  poly(c, edge, 6, -54, 9, -54, 9, -52, 6, -52);
  const hair = p.hair;
  if (hair === 0) poly(c, '#332638', -7, -51, -7, -57, -4, -61, 4, -62, 11, -58, 11, -55, 4, -57, 1, -54, -3, -55, -4, -48);
  if (hair === 1) poly(c, '#6d423f', -9, -49, -9, -57, -5, -62, 5, -62, 10, -57, 1, -56, -3, -50, -4, -40, -10, -37, -11, -44);
  if (hair === 2) poly(c, '#282638', -8, -52, -10, -58, -8, -62, -2, -64, 5, -64, 11, -61, 13, -57, 8, -54, 2, -57, -4, -54, -6, -48);
  if (hair === 3) poly(c, '#664337', -7, -53, -5, -58, 0, -61, 10, -59, 10, -56, 2, -57, -4, -53);
  if (hair === 4) {
    poly(c, edge, -10, -55, -8, -63, 2, -65, 10, -62, 11, -57, 16, -55, 15, -52, 0, -54);
    poly(c, '#537098', -8, -57, -6, -62, 2, -63, 9, -61, 9, -57, 13, -55, 1, -56);
    poly(c, '#e1c388', 3, -60, 6, -60, 5, -57, 3, -57);
  }
  const reach = p.climb ? 9 : p.reload ? 14 : brace ? 19 + recoil : 8 + gait * .7;
  const handY = p.climb ? -56 : p.reload ? -23 : brace ? -32 + (p.slope ?? 0) * reach : -22;
  limb(c, 7, -37, (reach + 7) / 2, (handY - 33) / 2 + 4, 10, coat);
  limb(c, (reach + 7) / 2, (handY - 33) / 2 + 4, reach - 2, handY, 8, sheen);
  poly(c, skin, reach - 3, handY - 3, reach + 3, handY - 3, reach + 4, handY, reach + 1, handY + 3, reach - 3, handY + 2);
  if (p.weapon) {
    c.save();
    c.translate(reach + 1, handY - 2);
    c.rotate(p.reload ? .68 : Math.atan(p.slope ?? 0));
    if (p.weapon === 1) poly(c, '#b4aab1', -2, 1, -1, -3, 10, -14, 13, -13, 13, -10, 2, 2);
    else {
      const length = [0, 0, 11, 23, 16, 25][p.weapon];
      poly(c, edge, -3, -4, length, -4, length + 2, -2, length, 1, 4, 1, 1, 5, -3, 4);
      poly(c, '#a6afa8', 0, -3, length, -3, length, -2, 0, -2);
    }
    c.restore();
  }
  c.restore();
}
