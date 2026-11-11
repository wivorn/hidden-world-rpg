const PAL = {
  grass: '#5da83b', grassLight: '#78c246', grassDark: '#47892d', grassTuft: '#94d653',
  path: '#8d7c64', stone: '#c4b393', stoneLight: '#dccfb0', stoneDark: '#a89676',
  wood: '#9b6334', woodLight: '#bd8148', woodDark: '#6a3d1d', woodDeep: '#4a2914',
  water: '#3889de', waterDeep: '#2a70cb', ocean: '#225db3', foam: '#e2f4ff',
  sand: '#e4cd8a', sandLight: '#f1dfa6', sandDark: '#cdb06c',
  rock: '#7d7c80', rockLight: '#a3a2a6', rockDark: '#5b5a60', rockDeep: '#3e3d45',
  dirt: '#b8874f', dirtLight: '#cd9e63', dirtDark: '#9a6c3b',
  hay: '#d8b04a', hayLight: '#efcf6a', hayDark: '#b38c33',
  roof: '#3d64b0', roofLight: '#5d88d2', roofDark: '#2a4785', roofDeep: '#1d3263',
  trim: '#e1a03c', trimDark: '#a8661e', trimLight: '#f7cd73',
  window: '#ffd36b', windowGlow: '#fff3b8',
  red: '#b3292d', blue: '#2f56a3', cream: '#efe4cc', gold: '#e8b54a',
  leaf: '#3d8a37', leafLight: '#5cae45', leafDark: '#2b6529', leafDeep: '#1e4a20',
  skin: '#f0c08a',
  snow: '#e6edf6', snowLight: '#ffffff', snowDark: '#c3d0e3', snowDeep: '#93a6c4',
  ash: '#4c4547', ashLight: '#625a5c', ashDark: '#363032', basalt: '#2a2527',
  lava: '#ff7a1a', lavaLight: '#ffd24a', lavaDark: '#c2340f',
  spring: '#4dbab2', springLight: '#8fe2d6', springDeep: '#2d8d8c',
  ice: '#bfe2f2', iceLight: '#e9f8ff', iceDark: '#8cc0da',
  jungle: '#2f7d3a', jungleLight: '#4fa648', jungleDark: '#1f5a2b',
};

const EMBLEM = [
  '#.....#',
  '##...##',
  '.##.##.',
  '..###..',
  '...#...',
  '..#.#..',
];

const SPR = {};

function sprite(w, h, draw, outlined = true) {
  const c = makeCanvas(w, h);
  draw(c.getContext('2d'), w, h);
  return outlined ? outline(c) : c;
}

function mirror(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

function drawShield(g, cx, cy, r, a, b) {
  ellipse(g, cx, cy, r, r, PAL.woodDeep);
  const ri = r - 1;
  for (let dy = -ri; dy <= ri; dy++) {
    const dx = Math.round(Math.sqrt(ri * ri - dy * dy));
    rect(g, cx - dx, cy + dy, dx, 1, dy < 0 ? a : b);
    rect(g, cx, cy + dy, dx + 1, 1, dy < 0 ? b : a);
  }
  rect(g, cx - 1, cy - 1, 2, 2, PAL.rockLight);
}

function stoneBlocks(g, x, y, w, h, seed) {
  rect(g, x, y, w, h, PAL.rockDark);
  for (let yy = y, row = 0; yy < y + h; yy += 5, row++) {
    for (let xx = x - (row % 2 ? 4 : 0); xx < x + w; xx += 8) {
      const a = Math.max(xx, x);
      const b = Math.min(xx + 7, x + w);
      if (b <= a) continue;
      const r = hash(xx, yy, seed);
      const c = r < 0.35 ? PAL.rockLight : r < 0.7 ? PAL.rock : '#8d8c90';
      rect(g, a, yy, b - a, Math.min(4, y + h - yy), c);
      rect(g, a, yy, b - a, 1, shade(c, 0.18));
    }
  }
}

// ---------- buildings ----------

function drawLonghouse(g, w, h, o = {}) {
  const cx = Math.floor(w / 2);
  const roofTop = o.roofTop ?? Math.round(h * 0.22);
  const wallTop = o.wallTop ?? Math.round(h * 0.58);
  const wallBot = h - 2;
  const eave = wallTop + 4;
  const wl = 6;
  const wr = w - 6;

  // walls
  rect(g, wl, wallTop, wr - wl, wallBot - wallTop, PAL.wood);
  for (let x = wl + 4; x < wr - 1; x += 5) rect(g, x, wallTop, 1, wallBot - wallTop, PAL.woodDark);
  for (let x = wl + 1; x < wr - 1; x += 5) rect(g, x, wallTop, 1, wallBot - wallTop, PAL.woodLight);
  rect(g, wl, wallTop, 3, wallBot - wallTop, PAL.woodDeep);
  rect(g, wr - 3, wallTop, 3, wallBot - wallTop, PAL.woodDeep);
  rect(g, wl - 1, wallBot - 3, wr - wl + 2, 3, PAL.rockDark);
  for (let x = wl; x < wr - 2; x += 6) {
    rect(g, x, wallBot - 3, 5, 2, PAL.rock);
    rect(g, x, wallBot - 3, 5, 1, PAL.rockLight);
  }

  // roof
  poly(g, [[1, eave], [11, roofTop], [w - 11, roofTop], [w - 1, eave]], PAL.roofDeep);
  for (let y = roofTop + 1, row = 0; y < eave - 2; y += 4, row++) {
    const t = (y - roofTop) / (eave - roofTop);
    const xl = Math.ceil(11 - 10 * t) + 1;
    const xr = Math.floor(w - 11 + 10 * t) - 1;
    for (let x = xl - (row % 2 ? 3 : 0); x < xr; x += 6) {
      const a = Math.max(x, xl);
      const b = Math.min(x + 5, xr);
      if (b - a < 2) continue;
      rect(g, a, y, b - a, 3, PAL.roof);
      rect(g, a, y, b - a, 1, PAL.roofLight);
      px(g, a, y + 2, PAL.roofDark);
      px(g, b - 1, y + 2, PAL.roofDark);
    }
  }
  rect(g, 11, roofTop, w - 22, 1, PAL.roofLight);
  rect(g, wl, eave, wr - wl, 2, PAL.woodDeep);

  // front gable
  const gw = o.gableW ?? Math.round(w * 0.5);
  const gl = cx - gw / 2;
  const gr = cx + gw / 2;
  const gTop = o.gableTop ?? 12;
  const gBase = eave + 1;
  poly(g, [[cx, gTop], [gr, gBase], [gl, gBase]], PAL.woodLight);
  for (let x = Math.ceil(gl) + 2; x < gr - 1; x += 4) {
    const yTop = Math.ceil(gTop + (Math.abs(x - cx) * (gBase - gTop)) / (gw / 2));
    if (gBase - yTop > 2) rect(g, x, yTop + 1, 1, gBase - yTop - 1, PAL.wood);
  }
  rect(g, gl, gBase - 2, gw, 2, PAL.woodDeep);

  const gableMid = gTop + (gBase - gTop) * 0.62;
  if (o.banner) {
    const bw = 16;
    const by0 = gTop + 16;
    const by1 = gBase - 10;
    rect(g, cx - bw / 2 - 1, by0 - 2, bw + 2, 2, PAL.woodDeep);
    for (let y = by0; y < by1 + 5; y++) {
      if (y < by1) rect(g, cx - bw / 2, y, bw, 1, PAL.red);
      else {
        const k = y - by1;
        rect(g, cx - bw / 2, y, bw / 2 - k, 1, PAL.red);
        rect(g, cx + k, y, bw / 2 - k, 1, PAL.red);
      }
    }
    rect(g, cx + bw / 2 - 2, by0, 2, by1 - by0, '#8a1d21');
    glyph(g, EMBLEM, cx - 7, by0 + 6, PAL.gold, 2);
  } else if (o.axes) {
    line(g, cx - 7, gableMid + 6, cx + 5, gableMid - 6, PAL.woodDeep, 2);
    line(g, cx + 7, gableMid + 6, cx - 5, gableMid - 6, PAL.woodDeep, 2);
    rect(g, cx + 3, gableMid - 9, 4, 5, PAL.rockLight);
    rect(g, cx - 7, gableMid - 9, 4, 5, PAL.rockLight);
  } else {
    ellipse(g, cx, gableMid, 3, 3, PAL.woodDeep);
    ellipse(g, cx, gableMid, 1, 1, PAL.window);
  }

  // crossed horn boards
  const dx = gw / 2;
  const dy = gBase - gTop;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const ext = o.hornExt ?? 7;
  const L0 = [gl - 1, gBase];
  const L1 = [cx + ux * ext, gTop - uy * ext];
  const R0 = [gr + 1, gBase];
  const R1 = [cx - ux * ext, gTop - uy * ext];
  for (const [A, B] of [[L0, L1], [R0, R1]]) {
    line(g, A[0], A[1], B[0], B[1], PAL.trimDark, 4);
    line(g, A[0], A[1] - 1, B[0], B[1] - 1, PAL.trim, 2);
    line(g, A[0], A[1] - 2, B[0], B[1] - 2, PAL.trimLight, 1);
  }
  ellipse(g, L1[0] + 2, L1[1], 2, 2, PAL.trim);
  px(g, L1[0] + 2, L1[1], PAL.trimDark);
  ellipse(g, R1[0] - 2, R1[1], 2, 2, PAL.trim);
  px(g, R1[0] - 2, R1[1], PAL.trimDark);

  // door
  const dw = o.doorW ?? 12;
  const dh = o.doorH ?? 17;
  const dx0 = cx - dw / 2;
  const dy0 = wallBot - 3 - dh;
  rect(g, dx0 - 2, dy0 - 2, dw + 4, dh + 2, PAL.woodDeep);
  if (o.openDoor) {
    rect(g, dx0, dy0, dw, dh, '#ffb648');
    rect(g, dx0, dy0, dw, 4, '#e2802a');
    rect(g, dx0 + 2, dy0 + dh - 5, dw - 4, 5, '#ffdc85');
  } else {
    rect(g, dx0, dy0, dw, dh, '#7a4524');
    for (let x = dx0 + 3; x < dx0 + dw; x += 3) rect(g, x, dy0, 1, dh, '#5a3018');
    rect(g, dx0, dy0 + 4, dw, 1, PAL.rockDark);
    rect(g, dx0, dy0 + dh - 5, dw, 1, PAL.rockDark);
    px(g, dx0 + dw - 3, dy0 + dh / 2, PAL.gold);
  }

  // windows
  const wy = o.windowY ?? wallTop + 9;
  for (const wx of o.windows ?? [16, w - 26]) {
    rect(g, wx - 1, wy - 1, 12, 10, PAL.woodDeep);
    rect(g, wx, wy, 10, 8, PAL.window);
    rect(g, wx, wy, 10, 2, PAL.windowGlow);
    rect(g, wx + 4, wy, 2, 8, PAL.woodDark);
    rect(g, wx, wy + 3, 10, 1, PAL.woodDark);
    rect(g, wx - 2, wy + 8, 14, 2, PAL.woodDark);
  }

  if (o.shield) drawShield(g, wr - 4, wallBot - 7, 5, PAL.red, PAL.cream);
  if (o.shieldL) drawShield(g, wl + 4, wallBot - 7, 5, PAL.blue, PAL.cream);
}

function buildForge() {
  return sprite(100, 80, (g) => {
    const house = makeCanvas(62, 62);
    drawLonghouse(house.getContext('2d'), 62, 62, {
      gableTop: 11, gableW: 30, doorW: 10, doorH: 14, windows: [10], openDoor: true, shield: true,
    });
    g.drawImage(house, 37, 16);
    stoneBlocks(g, 14, 4, 16, 30, 31);
    rect(g, 12, 3, 20, 3, PAL.rockDeep);
    stoneBlocks(g, 2, 30, 42, 46, 32);
    ellipse(g, 23, 30, 21, 5, PAL.rock);
    ellipse(g, 23, 29, 18, 3, PAL.rockLight);
    ellipse(g, 23, 56, 10, 7, '#2a140a');
    rect(g, 13, 56, 21, 18, '#2a140a');
    rect(g, 15, 64, 17, 10, '#c4501a');
    rect(g, 17, 66, 13, 8, '#f08a28');
    rect(g, 19, 69, 9, 5, '#ffd25a');
    rect(g, 1, 74, 44, 4, PAL.rockDeep);
  });
}

// A market stall: `goods` draws what hangs under the awning and sits on the counter.
function buildStall(stripe, goods, outlined = true) {
  return sprite(68, 60, (g) => {
    rect(g, 6, 16, 3, 42, PAL.woodDark);
    rect(g, 59, 16, 3, 42, PAL.woodDark);
    goods(g);
    for (let y = 4; y < 20; y++) {
      const t = (y - 4) / 16;
      const xl = 8 - 6 * t;
      const xr = 60 + 6 * t;
      const sw = (xr - xl) / 8;
      for (let i = 0; i < 8; i++) {
        const a = Math.round(xl + i * sw);
        const b = Math.round(xl + (i + 1) * sw);
        rect(g, a, y, b - a, 1, i % 2 ? PAL.cream : stripe);
      }
    }
    for (let i = 0; i < 8; i++) ellipse(g, 6 + i * 8, 20, 3, 2, i % 2 ? PAL.cream : stripe);
    rect(g, 3, 40, 62, 18, PAL.wood);
    for (let y = 44; y < 58; y += 4) rect(g, 3, y, 62, 1, PAL.woodDark);
    rect(g, 2, 38, 64, 3, PAL.woodLight);
    rect(g, 2, 41, 64, 1, PAL.woodDeep);
  }, outlined);
}

// A trader's house with their stall built onto one side, like the forge: SHOP_W wide, the house's door
// SHOP_DOOR px off the middle on its own side and the stall's middle SHOP_STALL px off the other way.
// `left` puts the house on the left.
const SHOP_W = 124;
const SHOP_DOOR = 29;
const SHOP_STALL = 28;
function buildShopHouse(stripe, goods, left) {
  return sprite(SHOP_W, 80, (g) => {
    const house = makeCanvas(66, 64);
    drawLonghouse(house.getContext('2d'), 66, 64, { gableTop: 11, gableW: 32, doorW: 10, doorH: 15, windows: [left ? 10 : 46] });
    g.drawImage(house, left ? 0 : SHOP_W - 66, 14);
    g.drawImage(buildStall(stripe, goods, false), left ? SHOP_W - 68 : 0, 18);
  });
}

// The carpenter's: planks on the counter, a bow and a bowl or two hanging under the awning.
function woodGoods(g) {
  for (let i = 0; i < 3; i++) {
    rect(g, 8 + i * 2, 34 - i * 2, 26, 2, i % 2 ? '#d9b07a' : '#c49a62');
    rect(g, 8 + i * 2, 35 - i * 2, 26, 1, PAL.woodDark);
  }
  for (const x of [42, 51]) {
    ellipse(g, x, 35, 4, 2, '#b8874f');
    rect(g, x - 3, 34, 6, 1, '#d9b07a');
  }
  line(g, 18, 20, 18, 22, PAL.woodDeep);
  line(g, 14, 22, 14, 31, PAL.woodDark);
  for (let y = 22; y <= 31; y++) px(g, Math.round(14 + 3.5 * Math.sin(((y - 22) / 9) * Math.PI)), y, '#8a5a30');
  line(g, 50, 20, 50, 22, PAL.woodDeep);
  rect(g, 47, 22, 6, 3, PAL.woodDark);
  poly(g, [[48, 25], [52, 25], [51, 31], [49, 31]], '#a8b0b8');
  for (let y = 26; y < 31; y += 2) px(g, 48 + (y - 25) / 6, y, '#66676e');
}

// The carpenter's workbench: a plank on trestles with a saw resting on it.
function buildWorkbench() {
  return sprite(30, 18, (g) => {
    for (const x of [4, 22]) {
      line(g, x, 7, x - 2, 16, PAL.woodDark, 2);
      line(g, x + 2, 7, x + 4, 16, PAL.woodDark, 2);
    }
    rect(g, 1, 5, 28, 3, '#d9b07a');
    rect(g, 1, 8, 28, 1, PAL.woodDeep);
    poly(g, [[9, 4], [20, 3], [20, 5], [9, 5]], '#a8b0b8');
    for (let x = 10; x < 20; x += 2) px(g, x, 5, '#66676e');
    rect(g, 6, 3, 4, 3, PAL.woodDark);
  });
}

function breadGoods(g) {
  for (let i = 0; i < 5; i++) {
    const bx = 12 + i * 11;
    ellipse(g, bx, 35, 4, 2, '#c98a3c');
    rect(g, bx - 2, 34, 3, 1, '#ecbd70');
  }
  for (const x of [14, 52]) {
    line(g, x, 21, x, 25, PAL.woodDeep);
    ellipse(g, x, 27, 3, 2, '#b87a34');
    rect(g, x - 1, 26, 2, 1, '#ecbd70');
  }
}

const CLOTH_COLORS = ['#b04a6e', '#3d6ca3', '#d8a83a', '#4f8a3c', '#7a4a8c', '#c8553a'];

function garmentGoods(g) {
  for (let i = 0; i < 5; i++) {
    const x = 8 + i * 11;
    const c = CLOTH_COLORS[i];
    rect(g, x, 32, 8, 6, c);
    rect(g, x, 32, 8, 1, shade(c, 0.3));
    rect(g, x + 3, 32, 2, 2, shade(c, -0.25));
  }
  for (const [x, c] of [[15, CLOTH_COLORS[1]], [52, CLOTH_COLORS[0]]]) {
    line(g, x, 20, x, 22, PAL.woodDeep);
    poly(g, [[x - 2, 22], [x + 3, 22], [x + 5, 31], [x - 4, 31]], c);
    rect(g, x - 2, 22, 5, 1, shade(c, 0.3));
    rect(g, x - 3, 26, 7, 1, shade(c, -0.25));
  }
}

function clothGoods(g) {
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5 - row; i++) {
      const x = 9 + i * 11 + row * 5;
      const y = 34 - row * 4;
      const c = CLOTH_COLORS[(i + row * 2) % CLOTH_COLORS.length];
      rect(g, x, y, 9, 4, c);
      rect(g, x, y, 9, 1, shade(c, 0.3));
      ellipse(g, x + 9, y + 1.5, 1, 1.5, shade(c, 0.45));
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = 13 + i * 8;
    line(g, x, 21, x, 22 + (i % 2) * 2, PAL.cream);
    ellipse(g, x, 24 + (i % 2) * 2, 2, 2, CLOTH_COLORS[(i + 3) % CLOTH_COLORS.length]);
  }
}

function leatherGoods(g) {
  const L = '#8a5530';
  const LD = '#5e3618';
  for (const x of [9, 30, 47]) {
    rect(g, x, 30, 3, 7, LD);
    rect(g, x, 35, 6, 2, LD);
    rect(g, x + 4, 30, 3, 7, L);
    rect(g, x + 4, 35, 6, 2, L);
  }
  for (const x of [22, 41]) {
    ellipse(g, x, 34, 3, 2, L);
    ellipse(g, x, 34, 1, 1, LD);
  }
  rect(g, 56, 31, 6, 5, L);
  rect(g, 56, 31, 6, 1, LD);
  line(g, 33, 20, 33, 22, PAL.woodDeep);
  poly(g, [[26, 22], [40, 22], [42, 26], [38, 30], [28, 30], [24, 26]], '#c9a070');
  px(g, 30, 25, '#a8804f');
  px(g, 36, 27, '#a8804f');
}

function buildOven() {
  return sprite(32, 30, (g) => {
    rect(g, 2, 22, 28, 6, PAL.rockDark);
    rect(g, 2, 22, 28, 1, PAL.rockLight);
    rect(g, 13, 2, 5, 6, PAL.rockDark);
    rect(g, 13, 2, 5, 1, PAL.rockLight);
    ellipse(g, 16, 15, 13, 10, '#8a4424');
    ellipse(g, 15, 14, 12, 9, '#b8643a');
    ellipse(g, 11, 10, 5, 3, '#d48450');
    ellipse(g, 16, 19, 5, 3, '#2a140a');
    rect(g, 11, 19, 11, 4, '#2a140a');
    rect(g, 12, 20, 9, 2, '#c4501a');
    rect(g, 14, 21, 5, 1, '#ffd25a');
  });
}

function buildSacks() {
  return sprite(22, 14, (g) => {
    for (const [x, y] of [[6, 7], [15, 7], [10, 4]]) {
      ellipse(g, x, y + 2, 5, 4, '#d8c8a0');
      rect(g, x - 2, y - 2, 4, 1, '#b8a47a');
      px(g, x - 1, y + 2, '#b8a47a');
    }
  });
}

function buildLoomFrames() {
  return [5, 9, 13, 17].map((sx) => sprite(28, 34, (g) => {
    for (const x of [2, 23]) {
      rect(g, x, 2, 3, 31, PAL.woodDark);
      rect(g, x, 2, 1, 31, PAL.wood);
    }
    rect(g, 2, 2, 24, 3, PAL.woodDark);
    rect(g, 2, 2, 24, 1, PAL.woodLight);
    for (let x = 6; x < 23; x += 2) rect(g, x, 5, 1, 14, PAL.cream);
    for (let y = 19; y < 27; y++) rect(g, 5, y, 18, 1, CLOTH_COLORS[Math.floor((y - 19) / 2) % 4]);
    rect(g, 2, 27, 24, 3, PAL.woodDark);
    rect(g, 2, 27, 24, 1, PAL.woodLight);
    rect(g, sx, 17, 6, 2, PAL.woodLight);
    px(g, sx + 2, 17, PAL.cream);
  }));
}

function buildYarnBasket() {
  return sprite(18, 13, (g) => {
    ellipse(g, 6, 5, 3, 3, CLOTH_COLORS[0]);
    ellipse(g, 11, 4, 3, 3, CLOTH_COLORS[2]);
    ellipse(g, 9, 6, 3, 2, CLOTH_COLORS[1]);
    rect(g, 2, 6, 14, 6, '#b8874f');
    for (let x = 3; x < 16; x += 3) rect(g, x, 6, 1, 6, '#9a6c3b');
    rect(g, 2, 6, 14, 1, '#cd9e63');
  });
}

function buildDressForm() {
  return sprite(16, 30, (g) => {
    rect(g, 7, 20, 2, 7, PAL.woodDark);
    ellipse(g, 8, 27, 5, 1.5, PAL.woodDark);
    ellipse(g, 8, 3, 2, 1.5, PAL.cream);
    poly(g, [[4, 5], [12, 5], [11, 12], [14, 21], [2, 21], [5, 12]], CLOTH_COLORS[0]);
    rect(g, 4, 5, 8, 1, shade(CLOTH_COLORS[0], 0.3));
    rect(g, 5, 12, 6, 1, PAL.gold);
    for (const [x, y] of [[4, 15], [11, 17], [8, 19]]) px(g, x, y, '#f0d6a0');
    px(g, 10, 8, '#dfe3ea');
  });
}

function buildHideFrame() {
  return sprite(28, 32, (g) => {
    for (const x of [2, 23]) rect(g, x, 3, 3, 28, PAL.woodDark);
    rect(g, 2, 3, 24, 3, PAL.woodDark);
    rect(g, 2, 3, 24, 1, PAL.wood);
    rect(g, 2, 23, 24, 2, PAL.woodDark);
    const hide = [[7, 8], [14, 7], [21, 9], [20, 15], [21, 21], [14, 20], [7, 21], [8, 15]];
    for (const [x, y] of hide) line(g, x, y, x < 14 ? 5 : x > 14 ? 23 : x, y < 14 ? 6 : 23, '#d8c8a0');
    poly(g, hide, '#c9a070');
    ellipse(g, 14, 14, 4, 3, '#d8b484');
    for (const [x, y] of [[10, 11], [17, 17], [12, 18]]) px(g, x, y, '#a8804f');
  });
}

// The dragon roost on the hermit's isle: a long thatched lean-to on carved posts, with a plank windbreak
// behind and straw strewn in front for the dragons to settle on. 120x76, ground point at the foot of the wall.
function buildRoost() {
  return sprite(120, 76, (g) => {
    ellipse(g, 60, 66, 58, 9, PAL.hayDark);
    ellipse(g, 60, 65, 55, 7, PAL.hay);
    for (let i = 0; i < 40; i++) {
      const x = 8 + hash(i, 1, 71) * 104;
      const y = 60 + hash(i, 2, 71) * 10;
      line(g, x, y, x + 3 - hash(i, 3, 71) * 6, y - 1, i % 3 ? PAL.hayLight : PAL.hayDark);
    }
    // the windbreak of upright planks
    for (let x = 12; x < 108; x += 4) {
      rect(g, x, 26, 4, 36, (x / 4) % 2 ? PAL.wood : PAL.woodDark);
      px(g, x + 1, 30 + ((x * 7) % 20), PAL.woodDeep);
    }
    rect(g, 12, 58, 96, 4, PAL.woodDeep);
    // posts and beams
    for (const x of [8, 38, 78, 108]) {
      rect(g, x, 20, 5, 45, PAL.woodDark);
      rect(g, x + 1, 20, 2, 45, PAL.wood);
      rect(g, x - 1, 63, 7, 2, PAL.woodDeep);
    }
    rect(g, 4, 20, 112, 6, PAL.woodDark);
    rect(g, 4, 21, 112, 2, PAL.woodLight);
    rect(g, 10, 42, 100, 4, PAL.woodDark);
    rect(g, 10, 42, 100, 1, PAL.woodLight);
    // thatch
    poly(g, [[0, 22], [120, 22], [106, 3], [14, 3]], PAL.hayDark);
    poly(g, [[3, 20], [117, 20], [104, 5], [16, 5]], PAL.hay);
    for (let x = 8; x < 114; x += 5) line(g, x, 20, x + (60 - x) * 0.12, 6, PAL.hayDark);
    line(g, 14, 4, 106, 4, PAL.hayLight);
    // carved dragon heads on the beam ends
    for (const s of [-1, 1]) {
      const x = s < 0 ? 4 : 116;
      poly(g, [[x, 22], [x + s * 4, 14], [x + s * 9, 12], [x + s * 7, 17], [x + s * 3, 24]], PAL.woodDark);
      px(g, x + s * 6, 14, PAL.red);
    }
  });
}

// The dragon nursery on the hermit's isle: a low thatched shelter over two straw nests, with a painted egg on the
// sign. 76x50, ground point at the foot of the wall.
function buildNursery() {
  return sprite(76, 50, (g) => {
    ellipse(g, 38, 44, 36, 5, PAL.hayDark);
    ellipse(g, 38, 43, 33, 4, PAL.hay);
    for (let i = 0; i < 24; i++) {
      const x = 6 + hash(i, 1, 72) * 64;
      const y = 40 + hash(i, 2, 72) * 7;
      line(g, x, y, x + 3 - hash(i, 3, 72) * 6, y - 1, i % 3 ? PAL.hayLight : PAL.hayDark);
    }
    for (let x = 8; x < 68; x += 4) {
      rect(g, x, 16, 4, 25, (x / 4) % 2 ? PAL.wood : PAL.woodDark);
      px(g, x + 1, 20 + ((x * 7) % 16), PAL.woodDeep);
    }
    rect(g, 8, 38, 60, 3, PAL.woodDeep);
    for (const x of [4, 67]) {
      rect(g, x, 14, 5, 29, PAL.woodDark);
      rect(g, x + 1, 14, 2, 29, PAL.wood);
    }
    rect(g, 2, 13, 72, 4, PAL.woodDark);
    rect(g, 2, 14, 72, 1, PAL.woodLight);
    poly(g, [[0, 15], [76, 15], [66, 1], [10, 1]], PAL.hayDark);
    poly(g, [[2, 13], [74, 13], [64, 3], [12, 3]], PAL.hay);
    for (let x = 6; x < 72; x += 5) line(g, x, 13, x + (38 - x) * 0.12, 4, PAL.hayDark);
    line(g, 12, 2, 64, 2, PAL.hayLight);
    // the sign with an egg painted on it
    rect(g, 31, 19, 14, 10, PAL.woodDeep);
    rect(g, 32, 20, 12, 8, PAL.woodLight);
    ellipse(g, 38, 24, 3, 3, '#6fb0a0');
    px(g, 37, 23, '#d8f0e8');
    px(g, 39, 25, '#3d7d70');
    for (const x of [22, 54]) {
      ellipse(g, x, 42, 9, 3, PAL.woodDark);
      ellipse(g, x, 41, 7, 2, PAL.hayLight);
      line(g, x - 8, 42, x - 4, 40, PAL.woodDeep);
      line(g, x + 4, 40, x + 8, 42, PAL.woodDeep);
    }
  });
}

// A wooden platter for the fish set out at the roost and the nursery; `drawPlateFish` piles them on.
function buildFishPlate() {
  return sprite(30, 12, (g) => {
    ellipse(g, 15, 7, 14, 4.5, PAL.woodDeep);
    ellipse(g, 15, 6, 13, 3.5, PAL.woodDark);
    ellipse(g, 15, 6, 11, 2.5, PAL.wood);
    line(g, 7, 4, 21, 4, PAL.woodLight);
  });
}

// A drinking pool ringed with stones, its water glinting in a different place each frame. 40x20.
function buildDragonPool(f) {
  return sprite(40, 20, (g) => {
    ellipse(g, 20, 11, 19, 8.5, PAL.rockDeep);
    ellipse(g, 20, 10, 18, 7.5, PAL.rockDark);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ellipse(g, 20 + Math.cos(a) * 16.5, 10 + Math.sin(a) * 6.5, 2.5, 1.6, i % 3 ? PAL.rock : PAL.rockLight);
    }
    ellipse(g, 20, 11, 14, 4.8, '#2f6aa8');
    ellipse(g, 19, 10.5, 12, 3.6, '#4a92d8');
    for (const [x, y, w] of [[10, 9, 4], [22, 12, 5], [16, 11, 3], [26, 9, 3]].slice(f, f + 2)) line(g, x, y, x + w, y, '#cfeaff');
  });
}

// A marker stake with a red rag tied round the top.
function buildStake() {
  return sprite(8, 18, (g) => {
    rect(g, 3, 2, 2, 16, PAL.woodDark);
    rect(g, 3, 2, 1, 16, PAL.wood);
    poly(g, [[3, 15], [5, 15], [4, 18]], PAL.woodDark);
    rect(g, 2, 3, 4, 3, PAL.red);
    poly(g, [[5, 4], [8, 6], [7, 8], [5, 6]], PAL.red);
  });
}

function buildVat() {
  return sprite(22, 15, (g) => {
    rect(g, 2, 5, 18, 8, PAL.woodDark);
    for (let x = 4; x < 20; x += 4) rect(g, x, 5, 1, 8, PAL.wood);
    rect(g, 2, 8, 18, 1, PAL.rockDark);
    ellipse(g, 11, 5, 9, 3, PAL.woodDeep);
    ellipse(g, 11, 5, 7, 2, '#6a5a2a');
    px(g, 8, 5, '#8a7a3a');
  });
}

// ---------- food ----------

function buildApple() {
  return sprite(11, 11, (g) => {
    ellipse(g, 5, 6, 4, 3.5, '#c8322a');
    ellipse(g, 4, 5, 2, 1.5, '#e2564a');
    px(g, 3, 4, '#f6a090');
    rect(g, 5, 1, 1, 2, PAL.woodDark);
    rect(g, 6, 1, 2, 1, PAL.leaf);
  });
}

function buildPear() {
  return sprite(11, 13, (g) => {
    ellipse(g, 5, 8, 4, 3.5, '#b6c23e');
    ellipse(g, 5, 4.5, 2.5, 2.5, '#b6c23e');
    ellipse(g, 4, 7, 1.5, 2, '#d4dc6a');
    px(g, 7, 10, '#8f9a2a');
    rect(g, 5, 1, 1, 2, PAL.woodDark);
  });
}

function buildBanana() {
  return sprite(13, 10, (g) => {
    poly(g, [[1, 3], [4, 6], [8, 6], [11, 2], [12, 3], [10, 7], [7, 9], [3, 8]], '#f2cf3a');
    poly(g, [[3, 7], [7, 8], [10, 5], [10, 7], [7, 9], [3, 8]], '#d4a828');
    rect(g, 1, 2, 1, 2, '#6a4a1a');
    px(g, 12, 3, '#6a4a1a');
  });
}

function buildBerries() {
  return sprite(12, 11, (g) => {
    for (const [x, y] of [[4, 6], [7, 6], [5, 8], [8, 8], [6, 4]]) {
      ellipse(g, x, y, 1.5, 1.5, '#a8264a');
      px(g, x - 1, y - 1, '#e2607e');
    }
    rect(g, 6, 1, 3, 1, PAL.leaf);
    px(g, 6, 2, PAL.leafDark);
  });
}

function buildCoconut() {
  return sprite(11, 11, (g) => {
    ellipse(g, 5, 5, 4, 4, '#6b4a2a');
    ellipse(g, 4, 4, 2, 2, '#8a6438');
    for (const [x, y] of [[4, 6], [6, 6], [5, 8]]) px(g, x, y, '#3a2414');
  });
}

function buildCherries() {
  return sprite(11, 12, (g) => {
    line(g, 6, 1, 3, 7, PAL.woodDark);
    line(g, 6, 1, 8, 8, PAL.woodDark);
    rect(g, 6, 1, 2, 1, PAL.leaf);
    for (const [x, y] of [[3, 8], [8, 9]]) {
      ellipse(g, x, y, 2, 2, '#a01830');
      px(g, x - 1, y - 1, '#e05068');
    }
  });
}

function buildPlum() {
  return sprite(11, 12, (g) => {
    ellipse(g, 5, 7, 3.5, 4, '#5a2466');
    ellipse(g, 4, 6, 1.5, 2, '#7a4288');
    rect(g, 6, 4, 1, 6, '#46184e');
    px(g, 3, 5, '#b48ac0');
    rect(g, 5, 1, 1, 2, PAL.woodDark);
  });
}

function buildPeach() {
  return sprite(11, 11, (g) => {
    ellipse(g, 5, 6, 4, 3.5, '#f09a5a');
    ellipse(g, 6, 7, 2.5, 2, '#e0704a');
    rect(g, 5, 3, 1, 6, '#d8583e');
    px(g, 3, 4, '#fcd0a0');
    rect(g, 5, 1, 1, 2, PAL.woodDark);
    rect(g, 6, 1, 2, 1, PAL.leaf);
  });
}

function buildOrange() {
  return sprite(11, 11, (g) => {
    ellipse(g, 5, 6, 4, 4, '#ee8a1a');
    ellipse(g, 4, 5, 2, 2, '#f8a83a');
    px(g, 3, 4, '#fcd090');
    for (const [x, y] of [[7, 7], [5, 9], [8, 5]]) px(g, x, y, '#d0700e');
    rect(g, 5, 1, 2, 1, PAL.leafDark);
  });
}

function buildLemon() {
  return sprite(12, 9, (g) => {
    ellipse(g, 6, 5, 4.5, 3, '#e8d02a');
    px(g, 1, 5, '#d8bc1a');
    px(g, 11, 4, '#d8bc1a');
    ellipse(g, 5, 4, 2, 1, '#fbf090');
  });
}

function buildPineapple() {
  return sprite(11, 16, (g) => {
    poly(g, [[5, 0], [7, 5], [3, 5]], PAL.leaf);
    poly(g, [[1, 2], [5, 6], [3, 6]], PAL.leafLight);
    poly(g, [[9, 2], [7, 6], [5, 6]], PAL.leafLight);
    ellipse(g, 5, 10, 4, 4.5, '#d8962a');
    for (let y = 7; y < 15; y += 2) for (let x = 2 + (y % 4 ? 1 : 0); x < 9; x += 2) px(g, x, y, '#9a5c16');
    px(g, 3, 8, '#f2c45a');
  });
}

// ---------- furniture ----------

function buildBed(blanket) {
  return sprite(26, 36, (g) => {
    rect(g, 2, 1, 22, 8, PAL.woodDark);
    rect(g, 2, 1, 22, 1, PAL.wood);
    for (const x of [2, 22]) rect(g, x, 1, 2, 34, PAL.woodDark);
    rect(g, 4, 8, 18, 25, PAL.cream);
    rect(g, 6, 9, 14, 5, '#fbf6ea');
    rect(g, 6, 13, 14, 1, '#d8ccb0');
    rect(g, 4, 16, 18, 17, blanket);
    rect(g, 4, 16, 18, 2, shade(blanket, 0.25));
    for (let y = 21; y < 33; y += 5) rect(g, 4, y, 18, 1, shade(blanket, -0.25));
    rect(g, 2, 32, 22, 3, PAL.woodDark);
    rect(g, 2, 32, 22, 1, PAL.wood);
  });
}

function buildHearthFrames() {
  return [0, 1, 2].map((f) => sprite(34, 34, (g) => {
    stoneBlocks(g, 2, 6, 30, 27, 61);
    rect(g, 1, 3, 32, 4, PAL.woodDark);
    rect(g, 1, 3, 32, 1, PAL.woodLight);
    ellipse(g, 17, 22, 9, 9, '#1c0f08');
    rect(g, 8, 22, 19, 10, '#1c0f08');
    rect(g, 9, 29, 17, 2, PAL.woodDeep);
    const flick = [0, 1, -1][f];
    poly(g, [[10, 30], [13, 21 + flick], [16, 25], [18, 18 - flick], [21, 24], [23, 21 + flick], [25, 30]], '#e2591f');
    poly(g, [[13, 30], [15, 25 - flick], [18, 22 + flick], [20, 26], [22, 30]], '#ffb23a');
    rect(g, 16, 27, 3, 3, '#fff0a0');
    rect(g, 16, 9, 2, 6, '#2a2a2e');
    ellipse(g, 17, 17, 5, 3, '#2f2f34');
    rect(g, 13, 14, 9, 1, '#4a4a52');
  }));
}

function buildTable(w, food) {
  return sprite(w, 22, (g) => {
    for (const x of [3, w - 6]) rect(g, x, 13, 3, 8, PAL.woodDark);
    rect(g, 1, 3, w - 2, 11, PAL.wood);
    for (let y = 6; y < 14; y += 3) rect(g, 1, y, w - 2, 1, PAL.woodDark);
    rect(g, 1, 3, w - 2, 1, PAL.woodLight);
    rect(g, 1, 13, w - 2, 1, PAL.woodDeep);
    food(g, w);
  });
}

const homeFood = (g) => {
  ellipse(g, 9, 7, 4, 2, '#d8ccb0');
  ellipse(g, 9, 7, 2, 1, '#c8553a');
  ellipse(g, 20, 6, 5, 2, '#c8853a');
  rect(g, 17, 5, 6, 1, '#e8b06a');
  rect(g, 26, 5, 3, 4, '#8a6a4a');
};

const feastFood = (g, w) => {
  for (let x = 8; x < w - 6; x += 12) {
    ellipse(g, x, 8, 4, 2, '#d8ccb0');
    rect(g, x + 5, 5, 3, 4, '#8a6a4a');
  }
  ellipse(g, w / 2, 7, 7, 3, '#8a4a24');
  ellipse(g, w / 2 - 1, 6, 5, 2, '#b8643a');
  rect(g, w / 2 + 5, 4, 2, 3, BONE);
};

function buildStool() {
  return sprite(12, 12, (g) => {
    for (const x of [3, 7]) rect(g, x, 5, 2, 6, PAL.woodDark);
    ellipse(g, 6, 4, 4, 2, PAL.wood);
    rect(g, 3, 3, 6, 1, PAL.woodLight);
  });
}

function buildBench() {
  return sprite(36, 10, (g) => {
    for (const x of [3, 30]) rect(g, x, 5, 3, 4, PAL.woodDark);
    rect(g, 1, 2, 34, 4, PAL.wood);
    rect(g, 1, 2, 34, 1, PAL.woodLight);
  });
}

// Icons for the buttons in the top right corner. Each letter in a row is one pixel of that colour.
function pixmap(rows, colors) {
  return sprite(rows[0].length, rows.length, (g) => rows.forEach((row, y) => [...row].forEach((ch, x) => colors[ch] && px(g, x, y, colors[ch]))));
}

function buildHide() {
  return pixmap([
    '..H......H..',
    '.HHH....HHH.',
    '..HHHHHHHH..',
    '..HhHHHHHH..',
    '.HHHHHHhHHH.',
    '.HHhHHHHHHH.',
    '..HHHHHhHH..',
    '..HHHHHHHH..',
    '.HHH....HHH.',
    '..H......H..',
  ], { H: '#b07a48', h: '#7a4e2a' });
}

function buildSatchel() {
  return pixmap([
    '...SSSSSS...',
    '..S......S..',
    '.S........S.',
    '.BBBBBBBBBB.',
    '.BFFFFFFFFB.',
    '.BFFFFFFFFB.',
    '.BBBBGGBBBB.',
    '.BBBBGGBBBB.',
    '.BBBBBBBBBB.',
    '.BBBBBBBBBB.',
    '.DDDDDDDDDD.',
  ], { S: '#5a3418', B: '#9a6a3a', F: '#b88450', G: '#ffd36b', D: '#6a4422' });
}

function buildPouch() {
  return pixmap([
    '....SSS...',
    '...S...S..',
    '...TTTTT..',
    '....PPP...',
    '..PPPPPPP.',
    '.PPPpPPPPP',
    '.PPPPPPpPP',
    '.PPpPPPPPP',
    '..PPPPPPP.',
    '...PPPPP..',
  ], { S: '#d8c8a0', T: '#5a3418', P: '#b07a48', p: '#7a4e2a' });
}

// A leather strap with a brass buckle and two tool loops.
// What the seamstress's coats look like on the hero (see drawCharacter): the fur coat for the frozen isle, and the
// fire eel skin jacket for the volcano.
const COATS = {
  furCoat: { id: 'fur', body: '#8a6440', dark: '#5e4228', trim: '#e8dcc0', fur: true },
  fireJacket: { id: 'fire', body: '#b8401e', dark: '#7a2412', trim: '#ffc040', scales: '#e0702a' },
};

// A torn scrap of map with a red X on it.
function buildMapPieceIcon() {
  return pixmap([
    '..PPPPPP.',
    '.PPpPPPPP',
    'PPPPPXPXP',
    'PpPPPPXPP',
    'PPPPPXPXP',
    'PPPpPPPP.',
    '.PPPPpPP.',
    '..PPPP...',
  ], { P: '#e2cf9a', p: '#b89a64', X: '#c8322a' });
}

// A folded scrap of paper, written on in ink.
function buildNoteIcon() {
  return pixmap([
    'PPPPPPPP',
    'PiiPiiPP',
    'PPPPPPPd',
    'PiPiiiPd',
    'PPPPPPPd',
    'PiiiPiPd',
    'PPPPPPPd',
    '.ddddddd',
  ], { P: '#f2e6c4', i: '#3a2414', d: '#b89a64' });
}

// A coat laid flat: sleeves out, collar and hem in its trim.
function buildCoatIcon(c) {
  return pixmap([
    '...TTTTTT...',
    '.BBTBBBBTBB.',
    'BBBBBdBBBBBB',
    'BBdBBdBBBdBB',
    'BB.BBdBBB.BB',
    'TT.BSdBSB.TT',
    '...BBdBBB...',
    '...LLLLLL...',
    '...BSdBBB...',
    '...BBdBSB...',
    '...TTTTTT...',
  ], { T: c.trim, B: c.body, d: c.dark, S: c.scales || c.body, L: '#5a3a1e' });
}

// The hero's own tunic, in `colour`.
function buildTunicIcon(colour) {
  return pixmap([
    '...CCCCCC...',
    '.TTTTddTTTT.',
    'TTTTTddTTTTT',
    'TT.TTddTT.TT',
    'TT.TTddTT.TT',
    '...TTTTTT...',
    '...LLLLLL...',
    '...TTTTTT...',
  ], { C: '#c9ae84', T: colour, d: shade(colour, -0.25), L: '#5a3a1e' });
}

// A horse saddle seen from the side: the horn up front, the cantle behind, the skirt over a red blanket, and the
// fender hanging down to its stirrup.
function buildSaddleIcon() {
  return pixmap([
    '..........KKK.',
    '..........KhK.',
    '..KKK......K..',
    '.KhhSK....KSK.',
    '.KhSSSKKKKSSK.',
    '..KSShhhhhSSK.',
    'KKDDDDDDDDDDDK',
    'KDDDDDDKFFKDK.',
    'RKDDDDDKFFKDK.',
    'RRKKKKKKFFKK..',
    'rrrrrrrKFFK...',
    '......KK..KK..',
    '......KhhhhK..',
  ], { K: '#3a2210', h: '#d09a5e', S: '#9a5e2c', D: '#7a4620', F: '#5a3418', R: '#b83a2a', r: '#7e2218' });
}

function buildToolBelt() {
  return pixmap([
    '..LL.....GGGG.LL',
    'DDLLDDDDDGDDGDLL',
    'BBLLBBBBBGBBGBLL',
    'BBLLBBBBBGBBGBLL',
    'DDLLDDDDDGDDGDLL',
    '..LL.....GGGG.LL',
  ], { B: '#9a6a3a', D: '#6a4422', L: '#5a3418', G: '#ffd36b' });
}

function buildUiIcons() {
  const ink = { '#': '#e8f4ff' };
  const speaker = [
    '.....#',
    '....##',
    '...###',
    '######',
    '######',
    '######',
    '...###',
    '....##',
    '.....#',
  ];
  const withSide = (side) => ['............', ...speaker.map((r, i) => r + side[i]), '............', '............'];
  return {
    hints: pixmap([
      '...######...',
      '..########..',
      '.###....###.',
      '.###....###.',
      '.......###..',
      '......###...',
      '.....###....',
      '.....###....',
      '............',
      '.....###....',
      '.....###....',
      '............',
    ], { '#': '#ffd36b' }),
    // a hand grabbing a gem between finger and thumb
    autoPick: pixmap([
      'CC..........',
      'CCCS........',
      '.CSSSS......',
      '..SSSSSS....',
      '..SSSSSSSs..',
      '...SSSSSSSs.',
      '...SSs..SSs.',
      '...SS....Ss.',
      '...S.AAA.S..',
      '....AAAAA...',
      '.....aAa....',
      '......a.....',
    ], { C: '#e8f4ff', S: '#f2c79a', s: '#c98f62', A: '#ffd36b', a: '#c8902a' }),
    soundOn: pixmap(withSide(['....#.', '..#..#', '...#.#', '.#.#.#', '.#.#.#', '.#.#.#', '...#.#', '..#..#', '....#.']), ink),
    soundOff: pixmap(withSide(['......', '......', '.#...#', '..#.#.', '...#..', '..#.#.', '.#...#', '......', '......']), ink),
    journal: pixmap([
      '............',
      '.SCCCCCCCC..',
      '.SCCCCCCCCP.',
      '.SCCGGGGCCP.',
      '.SCCCCCCCCP.',
      '.SCCGGGGCCP.',
      '.SCCCCCCCCP.',
      '.SCCCCCCCCP.',
      '.SCCCCCCCCP.',
      '.SCCCCCCCCP.',
      '.SPPPPPPPPP.',
      '............',
    ], { S: '#5a3418', C: '#9a5a2a', G: '#ffd36b', P: '#f6e7c1' }),
    map: pixmap([
      '............',
      '.PPP....PPP.',
      '.PPPLLLLXPX.',
      '.PPPLLLLPXP.',
      '.PPPLLLLXPX.',
      '.PPPLLdLPPP.',
      '.PPPLdLLPPP.',
      '.PPdLLLLPPP.',
      '.PdPLLLLPPP.',
      '.PPPLLLLPPP.',
      '....LLLL....',
      '............',
    ], { P: '#f2dca8', L: '#cfae6e', X: '#d0342c', d: '#7a4a22' }),
    // a tunic with its belt, for what's worn and carried
    equip: pixmap([
      '............',
      '..TTT..TTT..',
      '.TTTTddTTTT.',
      'TTTTTddTTTTT',
      'TTTTTddTTTTT',
      'TT.TTddTT.TT',
      '...TTddTT...',
      '...LLGGLL...',
      '...TTddTT...',
      '...TTddTT...',
      '...TTTTTT...',
      '............',
    ], { T: '#4a78b8', d: '#2f5288', L: '#5a3418', G: '#ffd36b' }),
    fishLog: pixmap([
      '............',
      '............',
      '.....BBB....',
      '#..BBBBBBB..',
      '##BBBBBBBWB.',
      '.#BBBBBBBBBB',
      '.#bbbbbbbbb.',
      '##bbbbbbbb..',
      '#..bbbbbb...',
      '.....bb.....',
      '............',
      '............',
    ], { B: '#6aa8d8', b: '#d8e8f0', '#': '#4a7aa8', W: '#1d3263' }),
    dragonLog: pixmap([
      '............',
      '.H..H.......',
      '.HH.HH......',
      '..DDDDD.....',
      '.DDDDDDD....',
      '.DDEDDDDDDD.',
      '.DDDDDDDDDDD',
      '..DDDddddd..',
      '..DDDd......',
      '..DDDd.F....',
      '...DDDd.F...',
      '....DD......',
    ], { D: '#4fa86a', d: '#2f6a44', H: '#f0e4b0', E: '#ffd23a', F: '#ff8a2a' }),
    menu: pixmap([
      '............',
      '............',
      '.##########.',
      '.##########.',
      '............',
      '.##########.',
      '.##########.',
      '............',
      '.##########.',
      '.##########.',
      '............',
      '............',
    ], ink),
    chat: pixmap([
      '............',
      '............',
      '..########..',
      '.##########.',
      '.#oo#oo#oo#.',
      '.##########.',
      '..########..',
      '..###.......',
      '..##........',
      '..#.........',
      '............',
      '............',
    ], { '#': '#e8f4ff', o: '#1d3263' }),
    stick: pixmap([
      '....RRRR....',
      '...RRRRRR...',
      '...RRRRRR...',
      '....RRRR....',
      '.....##.....',
      '.....##.....',
      '.....##.....',
      '..########..',
      '.##########.',
      '.##########.',
      '..########..',
      '............',
    ], { '#': '#e8f4ff', R: '#e05a4a' }),
    // points down; turned over while what it folds is open
    fold: pixmap([
      '#........#',
      '##......##',
      '.##....##.',
      '..##..##..',
      '...####...',
      '....##....',
    ], ink),
  };
}

function buildChest(open = false) {
  return sprite(20, 16, (g) => {
    if (open) {
      // The lid tipped back against the wall, its underside showing, over the dark inside.
      rect(g, 2, 1, 16, 5, PAL.woodDark);
      rect(g, 2, 1, 16, 1, PAL.woodLight);
      rect(g, 2, 7, 16, 8, PAL.wood);
      rect(g, 3, 6, 14, 3, PAL.woodDeep);
      for (const x of [4, 14]) rect(g, x, 9, 2, 6, METAL_D);
      rect(g, 9, 9, 3, 2, PAL.gold);
      return;
    }
    rect(g, 2, 6, 16, 9, PAL.wood);
    rect(g, 2, 2, 16, 5, PAL.woodLight);
    rect(g, 2, 6, 16, 1, PAL.woodDeep);
    for (const x of [4, 14]) rect(g, x, 2, 2, 13, METAL_D);
    rect(g, 9, 6, 3, 3, PAL.gold);
  });
}

function buildThrone() {
  return sprite(28, 36, (g) => {
    rect(g, 4, 3, 20, 26, PAL.woodDark);
    rect(g, 6, 5, 16, 20, PAL.red);
    rect(g, 6, 5, 16, 2, '#d44a44');
    glyph(g, EMBLEM, 10, 9, PAL.gold);
    for (const x of [3, 23]) {
      rect(g, x, 1, 2, 4, PAL.woodDark);
      px(g, x, 0, PAL.gold);
    }
    rect(g, 2, 22, 24, 6, PAL.woodDark);
    rect(g, 5, 23, 18, 4, '#d44a44');
    rect(g, 2, 22, 4, 13, PAL.wood);
    rect(g, 22, 22, 4, 13, PAL.wood);
    rect(g, 6, 28, 16, 6, PAL.woodDeep);
  });
}

function buildBackpack(s = 1) {
  const { rect, px } = scaledPen(s);
  return sprite(14 * s, 15 * s, (g) => {
    rect(g, 2, 3, 10, 11, '#8a5530');
    rect(g, 3, 6, 8, 7, '#a8693d');
    rect(g, 2, 2, 10, 5, '#6e4024');
    rect(g, 2, 2, 10, 1, '#a8693d');
    rect(g, 6, 6, 2, 2, PAL.gold);
    rect(g, 5, 0, 4, 2, '#6e4024');
    rect(g, 4, 9, 6, 1, '#6e4024');
    px(g, 3, 13, '#5a3418');
    px(g, 10, 13, '#5a3418');
  });
}

// ---------- nature ----------

// `snowy` lays snow along the top of each tier's skirt, just below where the tier above ends.
function buildPine(dark, snowy = false) {
  const L = dark ? '#357d34' : PAL.leaf;
  const LL = dark ? '#4c9c3e' : PAL.leafLight;
  const LD = dark ? PAL.leafDeep : PAL.leafDark;
  return sprite(32, 50, (g) => {
    const cx = 16;
    rect(g, cx - 2, 38, 4, 10, PAL.woodDark);
    rect(g, cx - 2, 38, 1, 10, PAL.wood);
    const tiers = [
      { top: 24, bot: 42, hw: 14, snow: 34 },
      { top: 16, bot: 34, hw: 12, snow: 25 },
      { top: 8, bot: 25, hw: 9, snow: 15 },
      { top: 2, bot: 15, hw: 6, snow: 1 },
    ];
    for (const { top, bot, hw } of tiers) {
      for (let y = top; y <= bot; y++) {
        const t = (y - top) / (bot - top);
        const half = Math.round(1 + (hw - 1) * t);
        if (y >= bot - 1) {
          for (let x = cx - half; x < cx + half; x++) if ((x + y) % 3 !== 0 || y === bot - 1) px(g, x, y, LD);
          continue;
        }
        rect(g, cx - half, y, half * 2, 1, L);
        rect(g, cx - half, y, Math.ceil(half * 0.55), 1, LL);
        rect(g, cx + half - 2, y, 2, 1, LD);
      }
    }
    for (let i = 0; i < 10; i++) px(g, 8 + hash(i, 1, dark ? 9 : 8) * 16, 6 + hash(i, 2, 8) * 34, LL);
    if (!snowy) return;
    for (const { top, bot, hw, snow } of tiers) {
      for (let y = snow; y < snow + 4; y++) {
        const half = Math.round(1 + (hw - 1) * ((y - top) / (bot - top)));
        for (let x = cx - half; x < cx + half; x++) {
          if (y - snow > 1 + hash(x, top, 41) * 3) continue;
          px(g, x, y, x < cx + half * 0.3 ? PAL.snowLight : PAL.snowDark);
        }
      }
    }
  });
}

function buildOak() {
  return sprite(38, 42, (g) => {
    g.translate(1, 0);
    rect(g, 15, 28, 6, 12, PAL.woodDark);
    rect(g, 15, 28, 2, 12, PAL.wood);
    const blobs = [[18, 15, 13], [9, 21, 8], [27, 21, 8], [18, 23, 10]];
    for (const [x, y, r] of blobs) ellipse(g, x, y + 1, r, r, PAL.leafDeep);
    for (const [x, y, r] of blobs) ellipse(g, x, y, r, r - 1, PAL.leaf);
    ellipse(g, 14, 11, 7, 5, PAL.leafLight);
    ellipse(g, 7, 19, 3, 3, PAL.leafLight);
    for (let i = 0; i < 14; i++) px(g, 6 + hash(i, 3, 5) * 24, 6 + hash(i, 4, 5) * 22, i % 2 ? PAL.leafDark : '#7cc456');
  });
}

// How each orchard tree looks: its fruit's colour and highlight, the crown's half-width and half-height, and the
// fruit's shape (round, a pear drop, or cherries hanging in pairs). Citrus keeps darker, glossier leaves.
const FRUIT_LOOK = {
  apple: { c: ['#c8322a', '#f08070'], crown: [12, 10], shape: 'round' },
  pear: { c: ['#b6c23e', '#e4ea8a'], crown: [10, 12], shape: 'drop' },
  cherry: { c: ['#a01830', '#e05068'], crown: [12, 9], shape: 'pair' },
  plum: { c: ['#5a2466', '#9a62a8'], crown: [11, 10], shape: 'round' },
  peach: { c: ['#f09a5a', '#fcd0a0'], crown: [12, 10], shape: 'round', blush: '#d8583e' },
  orange: { c: ['#ee8a1a', '#fcc060'], crown: [11, 11], shape: 'round', glossy: true },
  lemon: { c: ['#e8d02a', '#fbf090'], crown: [10, 11], shape: 'drop', glossy: true },
};

// A small orchard tree, 32x38, hung with fruit while `bearing`.
function buildFruitTree(kind, bearing = true) {
  const L = FRUIT_LOOK[kind];
  const [rx, ry] = L.crown;
  const [leaf, light, deep] = L.glossy ? [PAL.leafDark, PAL.leaf, PAL.leafDeep] : [PAL.leaf, PAL.leafLight, PAL.leafDeep];
  const seed = Object.keys(FRUIT_LOOK).indexOf(kind) + 40;
  return sprite(32, 38, (g) => {
    const cx = 16;
    const cy = ry + 2;
    rect(g, 14, cy + 4, 4, 36 - cy - 4, PAL.woodDark);
    rect(g, 14, cy + 4, 1, 36 - cy - 4, PAL.wood);
    const blobs = [[cx, cy, rx, ry], [cx - rx * 0.6, cy + ry * 0.45, rx * 0.5, ry * 0.5], [cx + rx * 0.6, cy + ry * 0.45, rx * 0.5, ry * 0.5]];
    for (const [x, y, a, b] of blobs) ellipse(g, x, y + 1, a, b, deep);
    for (const [x, y, a, b] of blobs) ellipse(g, x, y, a, b - 1, leaf);
    ellipse(g, cx - rx * 0.3, cy - ry * 0.4, rx * 0.5, ry * 0.35, light);
    for (let i = 0; i < 10; i++) px(g, cx - rx + 3 + hash(i, 3, seed) * (rx * 2 - 6), cy - ry + 3 + hash(i, 4, seed) * (ry * 2 - 4), i % 2 ? deep : light);
    if (!bearing) return;
    const spots = [];
    for (let i = 0; spots.length < 8 && i < 60; i++) {
      const a = hash(i, 1, seed) * Math.PI * 2;
      const r = 0.25 + Math.sqrt(hash(i, 2, seed)) * 0.6;
      const x = Math.round(cx + Math.cos(a) * r * rx);
      const y = Math.round(cy + 1 + Math.sin(a) * r * ry);
      if (!spots.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 5)) spots.push([x, y]);
    }
    for (const [x, y] of spots) {
      const [c, hi] = L.c;
      if (L.shape === 'pair') {
        px(g, x, y - 2, PAL.woodDark);
        rect(g, x - 2, y, 2, 2, c);
        rect(g, x + 1, y, 2, 2, c);
        px(g, x - 2, y, hi);
        px(g, x + 1, y, hi);
      } else if (L.shape === 'drop') {
        px(g, x, y - 1, c);
        rect(g, x - 1, y, 3, 2, c);
        px(g, x - 1, y, hi);
      } else {
        rect(g, x - 1, y - 1, 3, 3, c);
        px(g, x - 1, y - 1, hi);
        if (L.blush) px(g, x + 1, y + 1, L.blush);
      }
    }
  });
}

// A banana plant, 34x40: a soft green stem under a fan of broad drooping leaves, with a bunch hanging below them.
function buildBananaPlant(bearing = true) {
  return sprite(34, 40, (g) => {
    rect(g, 15, 14, 4, 24, '#6f8a36');
    rect(g, 15, 14, 1, 24, '#9ab84e');
    rect(g, 18, 14, 1, 24, '#4f6a26');
    const [tx, ty] = [17, 14];
    // each blade arcs out `hx` across and `rise` up from the top of the stem, its tip drooping by `droop`
    const blade = (hx, rise, droop, w) => {
      const mid = (t) => [tx + hx * t, ty - rise * Math.sin(t * Math.PI * 0.7) + droop * t * t];
      const side = [];
      const other = [];
      for (let t = 0; t <= 1.001; t += 0.1) {
        const [x, y] = mid(t);
        const [x1, y1] = mid(Math.min(1, t + 0.05));
        const [x0, y0] = mid(Math.max(0, t - 0.05));
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const k = w * Math.sin(Math.PI * Math.min(0.95, t * 0.9 + 0.08));
        side.push([x - ((y1 - y0) / len) * k, y + ((x1 - x0) / len) * k]);
        other.unshift([x + ((y1 - y0) / len) * k, y - ((x1 - x0) / len) * k]);
      }
      const outline = [...side, ...other];
      poly(g, outline.map(([x, y]) => [x, y + 1]), PAL.leafDark);
      poly(g, outline, PAL.leaf);
      for (let t = 0.1; t < 0.95; t += 0.1) line(g, ...mid(t), ...mid(t + 0.1), PAL.leafLight);
    };
    for (const [hx, rise, droop, w] of [[-15, 3, 6, 2.6], [14, 3, 7, 2.6], [-14, 11, 4, 3], [15, 10, 4, 3], [-4, 13, -1, 2.6], [6, 12, 2, 2.6]]) blade(hx, rise, droop, w);
    if (!bearing) return;
    rect(g, 19, 15, 1, 3, '#4f6a26');
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 3 - (r > 1 ? 1 : 0); k++) {
        rect(g, 17 + k * 2 + r, 17 + r * 2, 2, 2, (k + r) % 2 ? '#d4a828' : '#f2cf3a');
      }
    }
    ellipse(g, 20, 24, 1.5, 2, '#7a2a4a');
  });
}

function buildStump(w) {
  return sprite(w + 6, 9, (g) => {
    const x = 3;
    rect(g, x - 1, 6, w + 2, 2, PAL.woodDeep);
    rect(g, x, 3, w, 4, PAL.woodDark);
    rect(g, x, 3, 2, 4, PAL.wood);
    ellipse(g, x + w / 2, 3, w / 2, 1.5, '#d9b07a');
    rect(g, x + w / 2 - 1, 3, 2, 1, PAL.woodLight);
  });
}

function buildBush(flower) {
  return sprite(18, 14, (g) => {
    ellipse(g, 9, 8, 7, 4, PAL.leafDark);
    ellipse(g, 9, 7, 7, 4, PAL.leaf);
    ellipse(g, 7, 6, 4, 2, PAL.leafLight);
    for (let i = 0; i < 6; i++) {
      const x = 4 + hash(i, 1, flower.length) * 10;
      const y = 4 + hash(i, 2, flower.length) * 6;
      px(g, x, y, flower);
      px(g, x + 1, y, shade(flower, 0.4));
    }
  });
}

function buildBushCut() {
  return sprite(18, 14, (g) => {
    ellipse(g, 9, 11, 6, 2, PAL.leafDark);
    for (const [x, h] of [[6, 4], [9, 6], [12, 3]]) rect(g, x, 11 - h, 1, h, PAL.woodDark);
    px(g, 8, 9, PAL.leaf);
    px(g, 11, 10, PAL.leafLight);
  });
}

function buildBrokenFence(vertical) {
  return sprite(16, 16, (g) => {
    if (vertical) {
      rect(g, 6, 10, 4, 5, PAL.woodDark);
      px(g, 7, 9, PAL.woodDark);
      rect(g, 7, 0, 2, 3, PAL.wood);
    } else {
      rect(g, 2, 8, 3, 7, PAL.woodDark);
      px(g, 3, 7, PAL.woodDark);
      rect(g, 5, 10, 3, 2, PAL.wood);
      rect(g, 12, 13, 4, 1, PAL.wood);
      px(g, 9, 14, PAL.woodLight);
    }
  });
}

function buildPalm(nuts = true) {
  return sprite(36, 46, (g) => {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      rect(g, 16 + Math.sin(t * 1.6) * 5 - 2, 44 - t * 30 - 3, 4, 4, i % 2 ? '#a7794a' : '#8d6236');
    }
    const [tx, ty] = [21, 13];
    for (const a of [Math.PI + 0.25, Math.PI - 0.5, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.5, 0.2, Math.PI / 2 + 0.9]) {
      const pts = [];
      for (let t = 0; t <= 1.001; t += 0.125) pts.push([tx + Math.cos(a) * 13 * t, ty + Math.sin(a) * 7 * t + 9 * t * t]);
      for (let i = 0; i < pts.length - 1; i++) line(g, ...pts[i], ...pts[i + 1], PAL.leaf, i < 6 ? 3 : 2);
      for (let i = 0; i < pts.length - 2; i++) line(g, pts[i][0], pts[i][1] - 1, pts[i + 1][0], pts[i + 1][1] - 1, PAL.leafLight);
    }
    if (!nuts) return;
    ellipse(g, 20, 15, 2, 2, '#6b4a2a');
    ellipse(g, 23, 16, 2, 2, '#5a3d22');
  });
}

// Desert cacti: a saguaro with two arms, a taller one with a single arm and a flower on top, and a squat barrel cactus.
const CACTUS = { green: '#4f8a3c', dark: '#2f5e2a', light: '#7ab45a', spine: '#f0ead0' };

function cactusLimb(g, x, y, w, h) {
  rect(g, x, y + 1, w, h - 1, CACTUS.green);
  rect(g, x + 1, y, w - 2, 1, CACTUS.green);
  rect(g, x, y + 1, 1, h - 1, CACTUS.light);
  rect(g, x + w - 1, y + 1, 1, h - 1, CACTUS.dark);
  for (let i = x + 2; i < x + w - 1; i += 2) rect(g, i, y + 2, 1, h - 3, CACTUS.dark);
  for (let yy = y + 2; yy < y + h - 1; yy += 3) {
    px(g, x - 1, yy, CACTUS.spine);
    px(g, x + w, yy + 1, CACTUS.spine);
  }
}

function buildSaguaro(tall) {
  const H = tall ? 36 : 30;
  return sprite(22, H, (g) => {
    const top = tall ? 2 : 4;
    if (tall) {
      cactusLimb(g, 14, 9, 4, 8);
      rect(g, 12, 15, 4, 3, CACTUS.green);
      rect(g, 12, 17, 4, 1, CACTUS.dark);
    } else {
      cactusLimb(g, 2, 8, 4, 10);
      rect(g, 4, 16, 5, 3, CACTUS.green);
      rect(g, 4, 18, 5, 1, CACTUS.dark);
      cactusLimb(g, 16, 5, 4, 9);
      rect(g, 13, 12, 5, 3, CACTUS.green);
      rect(g, 13, 14, 5, 1, CACTUS.dark);
    }
    cactusLimb(g, 8, top, 6, H - top - 1);
    rect(g, 8, H - 2, 6, 1, CACTUS.dark);
    if (tall) {
      px(g, 10, top - 1, '#f27aa8');
      px(g, 11, top - 2, '#ffb0cc');
      px(g, 12, top - 1, '#f27aa8');
      px(g, 11, top - 1, '#ffe27a');
    }
  });
}

function buildBarrelCactus() {
  return sprite(12, 11, (g) => {
    ellipse(g, 6, 6, 5, 4.5, CACTUS.green);
    ellipse(g, 4.5, 5.5, 2, 3.5, CACTUS.light);
    for (const x of [4, 6, 8]) rect(g, x, 3, 1, 6, CACTUS.dark);
    rect(g, 2, 10, 8, 1, CACTUS.dark);
    for (const [x, y] of [[1, 4], [11, 5], [3, 1], [9, 2], [0, 7], [11, 8]]) px(g, x, y, CACTUS.spine);
    px(g, 5, 1, '#f2c94a');
    px(g, 6, 0, '#f27a4a');
    px(g, 7, 1, '#f2c94a');
  });
}

// ---------- regions ----------

// A smoking cone of black rock with a glowing crater and lava running down the south face.

function buildVolcano() {
  const w = 168;
  const h = 118;
  return sprite(w, h, (g) => {
    const base = h - 1;
    const cx = 84;
    const rimY = 22;
    const tops = [];
    for (let x = 0; x < w; x++) {
      const t = 1 - Math.min(1, Math.max(0, Math.abs(x - cx) - 16) / (cx - 16));
      tops.push(Math.round(base - (base - rimY) * t ** 1.6 + (hash(x >> 2, 3, 60) - 0.5) * 4 * t));
    }
    for (let x = 1; x < w - 1; x++) {
      for (let y = Math.max(rimY, tops[x]); y < base; y++) {
        const lit = x < cx - 6 + (y - rimY) * 0.3;
        const n = hash(x >> 1, y >> 1, 61);
        px(g, x, y, lit ? (n < 0.2 ? PAL.ash : '#6a6163') : n < 0.25 ? PAL.basalt : PAL.ashDark);
      }
    }
    ellipse(g, cx, rimY + 1, 18, 5, PAL.ashDark);
    ellipse(g, cx, rimY + 1, 15, 3.5, PAL.lavaDark);
    ellipse(g, cx, rimY + 1, 12, 2.5, PAL.lava);
    ellipse(g, cx - 2, rimY, 6, 1, PAL.lavaLight);
    rect(g, cx - 18, rimY - 1, 36, 1, '#7a7072');
    for (const [x0, drift, len] of [[cx + 3, 0.1, 80], [cx + 8, 0.3, 84], [cx + 14, 0.55, 50]]) {
      let x = x0;
      for (let y = rimY + 3; y < rimY + len; y++) {
        x += drift + Math.sin(y * 0.21 + x0) * 0.6;
        rect(g, Math.round(x) - 1, y, 3, 1, PAL.lavaDark);
        px(g, Math.round(x), y, y < rimY + len * 0.6 ? PAL.lavaLight : PAL.lava);
      }
    }
    // the fire cave's mouth at the foot of the west face, red light breathing out of the arch
    const ax = cx - 44;
    const arch = (hw, top) => [[ax - hw, base + 1], [ax - hw, base - top + 7], [ax - hw + 3, base - top + 2], [ax, base - top], [ax + hw - 3, base - top + 2], [ax + hw, base - top + 7], [ax + hw, base + 1]];
    poly(g, arch(11, 20), PAL.basalt);
    for (const [x, y] of [[ax - 8, base - 17], [ax - 4, base - 19], [ax, base - 20], [ax + 4, base - 19], [ax - 11, base - 12]]) rect(g, x, y, 3, 1, '#8a7f80');
    poly(g, arch(8, 16), '#140402');
    poly(g, arch(6, 13), '#3a0e04');
    rect(g, ax - 5, base - 5, 10, 6, '#6a1a06');
    rect(g, ax - 3, base - 3, 6, 4, PAL.lavaDark);
    rect(g, ax - 1, base - 1, 2, 2, PAL.lava);
    for (const [x0, y0, x1, y1] of [[ax - 15, base - 3, ax - 12, base - 9], [ax + 12, base - 14, ax + 16, base - 7], [ax - 9, base - 21, ax - 12, base - 26]]) line(g, x0, y0, x1, y1, PAL.lavaDark);
  });
}

function buildJungleTree() {
  return sprite(44, 58, (g) => {
    for (let y = 26; y < 56; y++) {
      const x = 20 + Math.sin(y * 0.12) * 2;
      rect(g, x, y, 5, 1, '#7a5a34');
      px(g, x, y, '#9a7448');
    }
    const leaves = [[22, 14, 13, 8], [10, 22, 9, 6], [34, 21, 9, 6], [22, 26, 12, 6], [14, 11, 7, 5], [31, 11, 7, 5]];
    for (const [x, y, rx, ry] of leaves) ellipse(g, x, y + 1, rx, ry, PAL.jungleDark);
    for (const [x, y, rx, ry] of leaves) ellipse(g, x, y, rx, ry - 1, PAL.jungle);
    for (const [x, y, rx] of leaves) ellipse(g, x - rx * 0.3, y - 2, rx * 0.5, 2, PAL.jungleLight);
    for (const x of [9, 17, 30, 36]) for (let y = 26; y < 26 + 4 + (x % 5) * 2; y++) px(g, x + (y % 3 === 0 ? 1 : 0), y, '#3f8f3a');
    for (const [x, y] of [[12, 19], [29, 9], [36, 24], [19, 27]]) { px(g, x, y, '#ff5a6a'); px(g, x + 1, y, '#ffd0d6'); }
  });
}

function buildFern() {
  return sprite(26, 16, (g) => {
    for (const [a, len] of [[-2.8, 11], [-2.2, 12], [-1.6, 9], [-1, 12], [-0.35, 11], [-1.9, 7], [-1.3, 7]]) {
      const x1 = 13 + Math.cos(a) * len;
      const y1 = 14 + Math.sin(a) * len * 0.75;
      line(g, 13, 14, x1, y1, PAL.jungleDark, 3);
      line(g, 13, 13, x1, y1 - 1, a < -1.55 ? PAL.jungleLight : PAL.jungle);
    }
  });
}

// `kind`: grey, snow (capped) or dark (volcanic).
function buildBoulder(kind) {
  const [base, light, dark] = kind === 'dark' ? [PAL.ash, '#6a6163', PAL.basalt] : [PAL.rock, PAL.rockLight, PAL.rockDark];
  return sprite(30, 22, (g) => {
    ellipse(g, 15, 13, 13, 8, dark);
    ellipse(g, 14, 12, 12, 7, base);
    ellipse(g, 11, 9, 6, 3, light);
    ellipse(g, 22, 14, 4, 3, dark);
    px(g, 8, 8, kind === 'dark' ? '#8a7f80' : '#c6c5c9');
    if (kind === 'snow') {
      ellipse(g, 13, 7, 9, 3, PAL.snow);
      ellipse(g, 11, 6, 6, 2, PAL.snowLight);
    } else if (kind === 'grey') {
      ellipse(g, 18, 6, 4, 1, PAL.grass);
    } else {
      px(g, 19, 15, PAL.lava);
      px(g, 6, 14, PAL.lavaDark);
    }
  });
}

function buildDeadTree() {
  return sprite(30, 44, (g) => {
    rect(g, 13, 14, 4, 29, PAL.basalt);
    rect(g, 13, 14, 1, 29, '#5a5052');
    for (const [x0, y0, x1, y1] of [[15, 22, 5, 12], [15, 18, 25, 9], [8, 15, 6, 8], [21, 12, 24, 5], [15, 14, 14, 3]]) line(g, x0, y0, x1, y1, PAL.basalt, 2);
    px(g, 14, 30, PAL.lavaDark);
  });
}

// ---------- Stormcrown Tor ----------

const GLASS = ['#d8f4ff', '#8fd0e8', '#5a8aa0'];

// Branching lines of fused glass from (x, y) out along `a` radians, `len` long, forking `forks` times.
function glassVein(g, x, y, a, len, forks, r) {
  let px0 = x;
  let py0 = y;
  for (let s = 0; s < len; s += 3) {
    a += (r() - 0.5) * 0.9;
    const x1 = px0 + Math.cos(a) * 3;
    const y1 = py0 + Math.sin(a) * 1.6;
    line(g, px0, py0, x1, y1, s < len / 2 ? GLASS[0] : GLASS[1]);
    if (forks > 0 && r() < 0.18) glassVein(g, x1, y1, a + (r() < 0.5 ? -0.9 : 0.9), (len - s) * 0.6, forks - 1, r);
    px0 = x1;
    py0 = y1;
  }
}

// The barrow: a low dome of turf ringed with old kerb stones, its crown burnt bare and veined with glass.
function buildTorMound() {
  return sprite(80, 34, (g) => {
    ellipse(g, 40, 19, 38, 14, PAL.grassDark);
    ellipse(g, 40, 17, 36, 13, PAL.grass);
    ellipse(g, 38, 13, 26, 8, PAL.grassLight);
    ellipse(g, 40, 16, 13, 5, '#3a3428');
    ellipse(g, 40, 16, 9, 3, '#24201a');
    const r = mulberry32(71);
    for (let i = 0; i < 6; i++) glassVein(g, 40, 16, (i / 6) * Math.PI * 2 + r() * 0.5, 9 + r() * 5, 1, r);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      const x = 40 + Math.cos(a) * 35;
      const y = 19 + Math.sin(a) * 12.5;
      ellipse(g, x, y, 2.2, 1.6, PAL.rockDark);
      ellipse(g, x - 0.5, y - 0.6, 1.4, 0.9, PAL.rockLight);
    }
    for (const [x, y] of [[18, 12], [60, 14], [28, 24], [54, 25], [12, 19], [68, 20]]) px(g, x, y, PAL.grassTuft);
  }, false);
}

// A six-sided stone socket set in the turf round the barrow, a rusty hole in the middle for a lightning rod.
function buildRodSocket() {
  const hex = (cx, cy, rx, ry) => [0, 1, 2, 3, 4, 5].map((i) => [cx + Math.cos((i * Math.PI) / 3) * rx, cy + Math.sin((i * Math.PI) / 3) * ry]);
  return sprite(22, 13, (g) => {
    poly(g, hex(11, 7, 10, 5.5), '#3a3d44');
    poly(g, hex(11, 6, 10, 5.5), '#6a6f78');
    poly(g, hex(11, 6, 7, 3.8), '#7a808a');
    const face = hex(11, 6, 7, 3.8);
    poly(g, [...face.slice(3), face[0]], '#949aa4');
    poly(g, hex(11, 6, 3, 1.8), '#8a4a2e');
    poly(g, hex(11, 6.3, 2, 1.1), '#14161c');
    for (const [x, y] of [[3, 5], [18, 7], [9, 2]]) px(g, x, y, '#a8aeb8');
  }, false);
}

// A lightning rod standing in its socket: a pointed iron spike with a copper collar.
function buildRodSet() {
  return sprite(9, 33, (g) => {
    poly(g, [[4.5, 0], [6, 5], [3, 5]], '#c9ccd4');
    rect(g, 3, 5, 3, 26, '#6e7480');
    rect(g, 3, 5, 1, 26, '#b8c0cc');
    rect(g, 5, 5, 1, 26, '#4a4e58');
    ellipse(g, 4.5, 9, 2, 1, '#9aa2ae');
    rect(g, 2, 24, 5, 2, '#b06a3a');
    rect(g, 2, 24, 5, 1, '#e09a5a');
    rect(g, 2, 30, 5, 2, '#3a3d44');
  });
}

function buildRodIcon() {
  return sprite(8, 16, (g) => {
    poly(g, [[3.5, 0], [5, 4], [2, 4]], '#e8eaf0');
    rect(g, 3, 4, 2, 11, '#7a7f8c');
    rect(g, 3, 4, 1, 11, '#c9ccd4');
    rect(g, 2, 11, 4, 2, '#c87a42');
    rect(g, 2, 15, 4, 1, '#4a4d58');
  });
}

// Sand and soil fused to glass along a strike's path, forking as it ran.
function buildGlassStreak() {
  return sprite(36, 14, (g) => {
    const r = mulberry32(79);
    ellipse(g, 6, 7, 4, 2, '#3c3a2c');
    glassVein(g, 6, 7, 0.1, 30, 2, r);
    glassVein(g, 6, 7, -0.5, 14, 1, r);
    px(g, 6, 7, '#ffffff');
  }, false);
}

// A pine that lightning split down the middle, both halves charred and leaning apart.
function buildSplitTree() {
  return sprite(26, 40, (g) => {
    const bark = '#3a2e28';
    const char = '#1e1814';
    poly(g, [[10, 39], [13, 39], [12, 18], [6, 6], [5, 8], [10, 20]], bark);
    poly(g, [[13, 39], [16, 39], [16, 20], [21, 9], [20, 7], [13, 18]], bark);
    line(g, 10, 38, 7, 9, char);
    line(g, 15, 38, 19, 10, char);
    line(g, 12, 30, 14, 20, '#d8c8a0');
    for (const [x0, y0, x1, y1] of [[8, 14, 3, 10], [7, 10, 2, 4], [18, 14, 24, 11], [19, 11, 23, 4]]) line(g, x0, y0, x1, y1, bark);
    px(g, 13, 19, '#ff8a2a');
  });
}

// What's left of the weather-watcher's lookout: two posts, one snapped, a fallen platform and a rusted vane.
function buildLookout() {
  return sprite(34, 42, (g) => {
    rect(g, 6, 6, 3, 35, PAL.woodDark);
    rect(g, 6, 6, 1, 35, PAL.wood);
    rect(g, 25, 22, 3, 19, PAL.woodDark);
    rect(g, 25, 22, 1, 19, PAL.wood);
    poly(g, [[25, 22], [28, 22], [27, 19], [26, 21]], '#1e1814');
    line(g, 8, 14, 26, 30, PAL.woodDark, 2);
    poly(g, [[2, 36], [20, 30], [32, 34], [14, 41]], PAL.wood);
    for (let i = 0; i < 4; i++) line(g, 5 + i * 6, 35 - i * 1.5, 11 + i * 6, 39 - i * 1.5, PAL.woodDark);
    rect(g, 7, 1, 1, 6, '#6a3a24');
    poly(g, [[8, 2], [14, 3], [8, 5]], '#8a4a2e');
    px(g, 11, 3, '#b0603a');
    for (const [x, y] of [[8, 20], [7, 27], [8, 32]]) px(g, x, y, '#2a1a10');
  });
}

function buildColumn() {
  return sprite(16, 34, (g) => {
    rect(g, 2, 28, 12, 5, PAL.rockDark);
    rect(g, 2, 28, 12, 1, PAL.rockLight);
    rect(g, 4, 8, 8, 20, PAL.rock);
    for (const x of [5, 8, 11]) rect(g, x, 8, 1, 20, PAL.rockDark);
    rect(g, 4, 8, 2, 20, PAL.rockLight);
    poly(g, [[4, 8], [6, 4], [8, 7], [10, 3], [12, 8]], PAL.rock);
    px(g, 6, 5, PAL.rockLight);
    rect(g, 3, 20, 3, 2, PAL.grassDark);
    px(g, 11, 14, PAL.grassDark);
  });
}

function buildRuinWall() {
  return sprite(34, 20, (g) => {
    stoneBlocks(g, 1, 6, 32, 13, 70);
    poly(g, [[1, 6], [7, 3], [14, 6], [20, 1], [26, 4], [33, 6]], PAL.rock);
    rect(g, 1, 17, 32, 2, PAL.rockDeep);
    for (const [x, y] of [[4, 6], [5, 7], [21, 2], [22, 3], [28, 9]]) px(g, x, y, PAL.grass);
  });
}

function buildNest() {
  return sprite(26, 12, (g) => {
    ellipse(g, 13, 7, 11, 4, '#6a4a2a');
    ellipse(g, 13, 6, 8, 2, '#3a2414');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const x = 13 + Math.cos(a) * 10;
      const y = 7 + Math.sin(a) * 3.5;
      line(g, x - 2, y, x + 2, y + (i % 2 ? 1 : -1), i % 3 ? '#9a7448' : '#c9a36a');
    }
  });
}

function buildCairn() {
  return sprite(16, 22, (g) => {
    for (const [y, rx, ry] of [[18, 6, 2.5], [13, 5, 2.5], [9, 4, 2], [5, 3, 2], [2, 2, 1.5]]) {
      ellipse(g, 8, y, rx, ry, PAL.rockDark);
      ellipse(g, 7, y - 1, rx - 1, ry - 1, PAL.rockLight);
    }
  });
}

function buildLogPile() {
  return sprite(32, 18, (g) => {
    for (const [x, y] of [[6, 13], [16, 13], [26, 13], [11, 7], [21, 7], [16, 2]]) {
      rect(g, x - 5, y - 1, 9, 8, PAL.woodDark);
      ellipse(g, x + 3, y + 3, 3, 4, '#d9b07a');
      px(g, x + 3, y + 3, PAL.woodDark);
    }
  });
}

function buildIceCrystal() {
  return sprite(20, 26, (g) => {
    for (const [x, top, w] of [[5, 10, 4], [10, 2, 5], [15, 9, 4], [8, 14, 3]]) {
      poly(g, [[x - w / 2, 24], [x, top], [x + w / 2, 24]], PAL.iceDark);
      poly(g, [[x - w / 2, 24], [x, top], [x, 24]], PAL.ice);
      line(g, x - 1, top + 4, x - 1, 22, PAL.iceLight);
    }
    rect(g, 2, 23, 16, 2, PAL.snowDark);
  });
}

// A jagged block of glacier ice; `melting`, it has slumped into a puddle.
function buildIceWall(melting) {
  return sprite(20, 24, (g) => {
    ellipse(g, 10, 21, 9, 2.5, PAL.iceLight);
    const t = melting ? 12 : 1;
    poly(g, [[1, 21], [1, t + 7], [5, t + 2], [9, t + 4], [12, t], [17, t + 3], [19, t + 9], [19, 21]], PAL.iceDark);
    poly(g, [[3, 20], [3, t + 8], [6, t + 4], [10, t + 6], [12, t + 3], [16, t + 6], [17, 20]], PAL.ice);
    line(g, 5, t + 7, 5, 18, PAL.iceLight);
    line(g, 12, t + 4, 11, t + 9, PAL.iceLight);
    if (!melting) line(g, 14, t + 9, 15, 17, '#ffffff');
    rect(g, 2, 21, 16, 1, PAL.iceDark);
  });
}

function buildScarecrow() {
  return sprite(20, 30, (g) => {
    rect(g, 9, 8, 2, 21, PAL.woodDark);
    rect(g, 2, 11, 16, 2, PAL.woodDark);
    rect(g, 6, 10, 8, 9, '#7a4a8c');
    rect(g, 6, 10, 8, 1, '#9a6aac');
    for (const x of [2, 17]) rect(g, x - 1, 12, 2, 3, PAL.hay);
    ellipse(g, 10, 6, 4, 4, '#e8cfa0');
    poly(g, [[3, 4], [10, -1], [17, 4]], PAL.hayDark);
    px(g, 8, 6, PAL.woodDeep);
    px(g, 11, 6, PAL.woodDeep);
  });
}

const EGG_CRACKS = [
  [[6, 3], [5, 5], [7, 7], [6, 9]],
  [[6, 9], [4, 10], [5, 12]],
  [[7, 7], [9, 8], [10, 7]],
  [[5, 12], [7, 13], [9, 12], [10, 10]],
  [[1, 8], [3, 9], [4, 10]],
];

// Dragon kinds: scale colours (body, dark, light, wing, eye, fin, glint), egg shell
// (base, light, speck, speckDark, shine, gloss, glow) and breath (core, bright, edge).
const DRAGON_SPECIES = {
  nightFury: {
    name: 'Night Fury', defaultName: 'Toothless',
    body: '#1b1f2b', dark: '#0d0f16', light: '#3a4460', wing: '#242a3b', eye: '#9be35a', fin: '#2a3044', glint: '#e6ffb0',
    ridge: '#323a52', tailFins: ['#2a3044', '#c0392b'], shape: { neck: 0.4, snout: 0.72 },
    look: { horns: 'fury', spines: 'nubs', tail: 'fins' },
    egg: { base: '#4b2a73', light: '#5f3a8f', speck: '#8a5cc7', speckDark: '#3a1f5c', shine: '#d9b8ff', gloss: '#a77be0', glow: '#b98cff' },
    breath: ['#b05cff', '#e7c8ff', '#7a2fd6'],
  },
  lightFury: {
    name: 'Light Fury', defaultName: 'Luna',
    body: '#eae8f2', dark: '#b4b6cc', light: '#ffffff', wing: '#d6d6e6', eye: '#4aa8ff', fin: '#c4c8de', glint: '#ffffff',
    spot: '#a4a9c6', shape: { neck: 0.45, snout: 0.75 }, look: { horns: 'frill', tail: 'fan', marks: 'bubbles' },
    egg: { base: '#aebcd6', light: '#d6e0f2', speck: '#ffffff', speckDark: '#8796b4', shine: '#ffffff', gloss: '#f2f6ff', glow: '#bfe0ff' },
    breath: ['#5fc8ff', '#e6f8ff', '#2f7fd6'],
  },
  thunderdrum: {
    name: 'Thunderdrum', defaultName: 'Thornado',
    body: '#8c6a3a', dark: '#5a4224', light: '#c8a66a', wing: '#3f7f88', eye: '#ffd23a', fin: '#2f9aa6', glint: '#fff6c0',
    belly: '#c8a66a', look: { horns: 'crest', spines: 'plates', tail: 'club', marks: 'stripes' },
    egg: { base: '#2f6f78', light: '#3f8c93', speck: '#c9a86a', speckDark: '#1f4c52', shine: '#bff0f0', gloss: '#6fc0c4', glow: '#6fe0e0' },
    breath: ['#4fe0d0', '#e0fff8', '#1f9a9a'],
  },
  terribleTerror: {
    name: 'Terrible Terror', defaultName: 'Sharpshot',
    body: '#5c9a34', dark: '#3a6a1e', light: '#a6d65a', wing: '#e0862a', eye: '#ffe44a', fin: '#e0542a', glint: '#ffffe0',
    belly: '#c8e07a', horn: '#f0e4b0', look: { horns: 'horns', spines: 'spikes', tail: 'spade', tips: true },
    egg: { base: '#4f8a2e', light: '#6aa83a', speck: '#f0a23a', speckDark: '#2f5a1a', shine: '#fff0a0', gloss: '#a8d45a', glow: '#ffc25a' },
    breath: ['#ff8a2a', '#fff0a0', '#d6421a'],
  },
  skrill: {
    name: 'Skrill', defaultName: 'Volt',
    body: '#4b4a78', dark: '#2b2a4c', light: '#7f84c0', wing: '#3a3966', eye: '#eaf6ff', fin: '#7fd8ff', glint: '#ffffff',
    belly: '#6a70a8', horn: '#cfe8ff', look: { horns: 'horns', spines: 'spikes', tail: 'spade', marks: 'stripes', tips: true },
    egg: { base: '#3a3f66', light: '#555c8c', speck: '#bfe8ff', speckDark: '#22264a', shine: '#ffffff', gloss: '#8fa6e0', glow: '#9fdcff' },
    breath: ['#8fdcff', '#ffffff', '#3f7fff'],
  },
};

// The tanner's dragon saddle: leather on a red blanket, buckled on with a girth strap.
const SADDLE = { blanket: '#b83a2a', blanketDark: '#7e2218', seat: '#7a4a24', seatLight: '#a8703a', strap: '#4a2c14', metal: '#e8d890' };

// Speckled dragon egg in a twig nest; `cracks` (0-3) adds glowing hatching cracks.
function buildDragonEgg(ep, cracks = 0) {
  const egg = sprite(13, 16, (g) => {
    ellipse(g, 6, 9, 5.5, 7, ep.base);
    ellipse(g, 5, 8, 3.5, 5.5, ep.light);
    for (const [x, y] of [[3, 6], [7, 5], [2, 10], [6, 9], [9, 11], [4, 13], [8, 14]]) {
      px(g, x, y, ep.speck);
      px(g, x + 1, y, ep.speck);
      px(g, x + 1, y + 1, ep.speckDark);
    }
    for (const [x, y] of [[5, 4], [9, 8], [3, 12], [7, 12]]) px(g, x, y, ep.shine);
    rect(g, 3, 4, 1, 3, ep.gloss);
    px(g, 4, 3, ep.gloss);
    const lines = EGG_CRACKS.slice(0, [0, 1, 3, 5][cracks]);
    for (const pts of lines) {
      for (let i = 0; i < pts.length - 1; i++) line(g, ...pts[i], ...pts[i + 1], '#ffe9a8');
    }
  }, false);
  return sprite(24, 24, (g) => {
    ellipse(g, 12, 18, 10, 3, PAL.woodDeep);
    ellipse(g, 12, 17, 8, 2, PAL.woodDark);
    g.drawImage(egg, 6, 3);
    ellipse(g, 12, 19.5, 10, 2, PAL.hayDark);
    ellipse(g, 12, 19, 9, 1.5, PAL.hay);
    line(g, 3, 19, 8, 18, PAL.woodDark);
    line(g, 15, 18, 21, 20, PAL.woodDark);
    line(g, 9, 21, 14, 20, PAL.woodDark);
    for (const [x, y] of [[5, 20], [11, 19], [18, 19], [14, 21]]) px(g, x, y, PAL.hayLight);
  });
}

// Smaller egg held overhead.
function buildHeldEgg(ep) {
  return sprite(12, 14, (g) => {
    ellipse(g, 6, 7, 4, 5, ep.base);
    ellipse(g, 5, 6, 2.5, 3.5, ep.light);
    for (const [x, y] of [[4, 4], [7, 6], [3, 8], [6, 10]]) {
      px(g, x, y, ep.speck);
      px(g, x + 1, y + 1, ep.speckDark);
    }
    px(g, 4, 3, ep.shine);
    px(g, 8, 9, ep.shine);
    rect(g, 3, 4, 1, 2, ep.gloss);
  });
}

// Proportions of the young dragon after eating 0, 1 and 2 fish, then of the grown dragon (the third
// fish): overall size, then head, wing, tail, neck and snout length and body depth relative to it.
// `eye` and `ew` are the eye's height and width in pixels.
const DRAGON_AGES = [
  { size: 0.35, head: 2.4, wing: 0.7, tail: 0.6, neck: 0.2, snout: 0.35, chub: 1.4, eye: 4, ew: 3 },
  { size: 0.55, head: 1.6, wing: 0.8, tail: 0.8, neck: 0.5, snout: 0.6, chub: 1.2, eye: 3, ew: 2 },
  { size: 0.78, head: 1.22, wing: 0.9, tail: 0.92, neck: 0.8, snout: 0.85, chub: 1.08, eye: 2, ew: 2 },
  { size: 1, head: 1, wing: 1, tail: 1, neck: 1, snout: 1, chub: 1, eye: 2, ew: 2 },
];
// Size of the young dragon after eating 0-2 fish, as a fraction of the grown dragon's.
const DRAGON_SCALES = DRAGON_AGES.slice(0, -1).map((a) => a.size);
// Wing beat of the flying dragon: wingtip height, span and tail sway per frame.
const DRAGON_FLAP = { tip: [-13, -4, 8, -4], span: [0.85, 1, 0.8, 1], sway: [0, 1, 0, -1] };

// Draws a dragon in proportions `a` (see DRAGON_AGES), laid out like the grown flying dragon scaled
// by a.size, with its ground point at (gx, gy). `view` is 'down', 'up', 'right', 'se' or 'ne'; `f` is
// the wing beat frame (0-3) or -1 for folded wings; `stand` puts the feet on the ground point.
// `pal.look` gives the kind its own horns, spines, tail tip, markings and wingtips (see DRAGON_LOOKS).
// `opts.saddle` straps a saddle on its back; with `opts.over` (a second canvas) the neck and head of the
// front-facing views go there instead, to be drawn over a rider. `opts.blink` half-shuts the eyes.
// Returns where its mouth is, or null when it faces away.
function drawDragon(g, pal, a, view, f, stand, gx, gy, opts = {}) {
  const { body: B, wing: M, light: L, dark: D, eye: E, fin: FIN, glint: GLINT } = pal;
  const look = pal.look || {};
  // a kind's own build: the furies' short necks and blunt snouts
  if (pal.shape) a = { ...a, neck: a.neck * (pal.shape.neck ?? 1), snout: a.snout * (pal.shape.snout ?? 1) };
  const HORN = pal.horn || '#ece0c4';
  const PUPIL = '#05070a';
  if (opts.blink) a = { ...a, eye: 1 };
  const S = a.size;
  const HS = S * a.head;
  const sn = a.snout;
  const fold = f < 0;
  const tip = fold ? 0 : DRAGON_FLAP.tip[f] * a.wing;
  const span = fold ? 0 : DRAGON_FLAP.span[f] * a.wing;
  const sw = fold ? 0 : DRAGON_FLAP.sway[f];
  const ly = 5 * a.chub + 1;
  const cx = gx;
  const cy = gy - (ly + (stand ? 2 : 5)) * S;
  const P = (x, y) => [cx + x * S, cy + y * S];
  const T = (t) => Math.max(1, Math.round(t * S * a.chub));
  const ell = (x, y, rx, ry, c) => ellipse(g, cx + x * S, cy + y * S, rx * S, ry * S, c);
  // `opts.step` (1 or -1) puts one foot forward and lifts it, the other back, for a walking stride.
  const step = opts.step || 0;
  const legs = (...xs) => xs.forEach((x, i) => {
    const s = i % 2 ? -step : step;
    ell(x * a.chub + s * 3, ly - (s > 0 ? 0.5 : 0), 2 * a.chub, 2, B);
  });

  // Head parts are laid out around the head's centre and scaled by a.head on top of a.size.
  let hx = 0;
  let hy = 0;
  const head = ([x, y], dx, dy) => { hx = x + dx * HS; hy = y + dy * HS; };
  const H = (x, y) => [hx + x * HS, hy + y * HS];
  const round = 1 + (a.head - 1) * 0.25;
  const young = a.head - 1;
  const lift = young * 1.5;
  const hell = (x, y, rx, ry, c) => ellipse(g, hx + x * HS, hy + y * HS, rx * HS, ry * HS * round, c);
  const hpoly = (pts, c) => poly(g, pts.map(([x, y]) => H(x, y)), c);
  // Pixel-exact so the eyes stay crisp at every size; young eyes get a pupil and a glint.
  const eye = (x, y, narrow) => {
    const [ex, ey] = H(x, y).map(Math.round);
    const w = narrow ? Math.max(1, a.ew - 1) : a.ew;
    rect(g, ex, ey, w, a.eye, E);
    if (a.eye > 2) {
      rect(g, ex + (w >> 1), ey + 1, 1, Math.max(1, a.eye - 2), PUPIL);
      px(g, ex, ey, GLINT);
    } else if (view === 'right') {
      px(g, ex, ey, PUPIL);
    }
  };
  const nostril = (x, y) => px(g, ...H(x, y), PUPIL);
  // An ear or horn rooted between head points b1 and b2, reaching for `tip`, in the kind's style. The furies'
  // ear-flaps and frills lie over the head, so they wait for `ears()` once it's drawn.
  const later = [];
  const ear = (pts) => (look.horns === 'fury' || look.horns === 'frill' ? later.push(pts) : drawEar(pts));
  const ears = () => later.splice(0).forEach(drawEar);
  // A leaf from base point p to a point at t, `hw` wide either side at the base and a bit more at its middle.
  const leaf = (p, t, hw, c) => {
    const n = Math.hypot(t[0] - p[0], t[1] - p[1]) || 1;
    const [wx, wy] = [(-(t[1] - p[1]) / n) * hw, ((t[0] - p[0]) / n) * hw];
    const q = [p[0] + (t[0] - p[0]) * 0.4, p[1] + (t[1] - p[1]) * 0.4];
    hpoly([[p[0] - wx, p[1] - wy], [q[0] - wx * 1.3, q[1] - wy * 1.3], t, [q[0] + wx * 1.3, q[1] + wy * 1.3], [p[0] + wx, p[1] + wy]], c);
  };
  const drawEar = ([b1, tip, b2]) => {
    const bx = (b1[0] + b2[0]) / 2;
    const by = (b1[1] + b2[1]) / 2;
    const at = (k, bend = 0) => [bx + (tip[0] - bx) * k - (tip[1] - by) * bend, by + (tip[1] - by) * k + (tip[0] - bx) * bend];
    if (look.horns === 'horns') {
      line(g, ...H(bx, by), ...H(...at(0.6, 0.14)), HORN, Math.max(1, Math.round(2 * HS)));
      line(g, ...H(...at(0.55, 0.14)), ...H(...at(1.2, 0.04)), HORN, 1);
      px(g, ...H(...at(1.2, 0.04)), shade(HORN, -0.35));
    } else if (look.horns === 'crest') {
      for (const k of [0.1, 0.5, 0.9]) {
        const p = [b1[0] + (b2[0] - b1[0]) * k, b1[1] + (b2[1] - b1[1]) * k];
        const w = [(b2[0] - b1[0]) * 0.16, (b2[1] - b1[1]) * 0.16];
        hpoly([[p[0] - w[0], p[1] - w[1]], [p[0] + (tip[0] - bx) * 0.7, p[1] + (tip[1] - by) * 0.7], [p[0] + w[0], p[1] + w[1]]], FIN);
      }
    } else if (look.horns === 'none') {
      hpoly([b1, at(0.4), b2], B);
    } else if (look.horns === 'fury') {
      // a broad ear-flap edged in light, with a smaller one tucked in behind it
      const e1 = [b1[0] + (b1[0] - bx) * 0.8, b1[1] + (b1[1] - by) * 0.8];
      const e2 = [b2[0] + (b2[0] - bx) * 0.8, b2[1] + (b2[1] - by) * 0.8];
      const m = [(e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2];
      const back = at(0.62, -0.45);
      leaf([(m[0] + e2[0]) / 2, (m[1] + e2[1]) / 2], back, 1.5, D);
      line(g, ...H(...m), ...H(...back), shade(B, 0.1));
      const t = at(0.88, 0.05);
      leaf([(e1[0] + m[0]) / 2, (e1[1] + m[1]) / 2], t, 2.1, B);
      line(g, ...H(...e1), ...H(...t), L);
    } else if (look.horns === 'frill') {
      // swept-back leaf frills, longest at the front, each with a vein down it
      [[0.1, 1.15], [0.5, 0.95], [0.9, 0.72]].forEach(([k, len], i) => {
        const p = [b1[0] + (b2[0] - b1[0]) * k, b1[1] + (b2[1] - b1[1]) * k];
        const t = [p[0] + (tip[0] - bx) * len, p[1] + (tip[1] - by) * len];
        leaf(p, t, 1.4, i % 2 ? FIN : B);
        line(g, ...H(...p), ...H(...t), D);
      });
    } else {
      hpoly([b1, tip, b2], B);
    }
  };
  // Spikes or plates along the back at body points `pts`, standing out towards `[ux, uy]`.
  const spines = (pts, [ux, uy]) => {
    if (!look.spines) return;
    if (look.spines === 'nubs') {
      for (const [x, y] of pts) poly(g, [P(x - uy * 1.2, y + ux * 1.2), P(x + ux * 2 + uy * 0.6, y + uy * 2 - ux * 0.6), P(x + uy * 1.2, y - ux * 1.2)], pal.ridge || D);
      return;
    }
    const big = look.spines === 'plates';
    const h = big ? 4.5 : 3.2;
    const w = big ? 2.2 : 1.3;
    for (const [x, y] of pts) {
      poly(g, [P(x - uy * w, y + ux * w), P(x + ux * h, y + uy * h), P(x + uy * w, y - ux * w)], FIN);
      if (big) line(g, ...P(x, y), ...P(x + ux * h * 0.7, y + uy * h * 0.7), shade(FIN, 0.3));
    }
  };
  // Stripes as [x0, y0, x1, y1] across the back, or spots at [x, y], in body points.
  const marks = (stripes, spots) => {
    if (look.marks === 'stripes') for (const [x0, y0, x1, y1] of stripes) line(g, ...P(x0, y0), ...P(x1, y1), D, T(1.4));
    if (look.marks === 'spots') {
      const s = Math.max(1, Math.round(1.8 * S));
      for (const [x, y] of spots) rect(g, ...P(x, y).map(Math.round), s, s, pal.spot || L);
    }
    // the light fury's clusters of little rings, a smaller one beside each
    if (look.marks === 'bubbles') {
      const C = pal.spot || D;
      for (const [x, y] of spots) {
        const [sx, sy] = P(x, y).map(Math.round);
        if (S < 0.7) {
          px(g, sx, sy, C);
          continue;
        }
        for (const [dx, dy] of [[1, 0], [0, 1], [2, 1], [1, 2]]) px(g, sx + dx, sy + dy, C);
        px(g, sx + 3, sy + 3, C);
      }
    }
  };
  const belly = (x, y, rx, ry) => { if (pal.belly) ell(x, y, rx, ry, pal.belly); };
  // A saddle on a red blanket, its girth strap from (x0, y0) to (x1, y1) and its pommel at `pom` from the seat.
  const saddle = (x, y, rx, ry, pom, strap) => {
    if (!opts.saddle) return;
    if (strap) line(g, ...P(strap[0], strap[1]), ...P(strap[2], strap[3]), SADDLE.strap, T(1.3));
    ell(x, y + 0.8, rx + 1.8, ry + 1.4, SADDLE.blanketDark);
    ell(x, y + 0.4, rx + 1.3, ry + 1, SADDLE.blanket);
    ell(x, y, rx, ry, SADDLE.seat);
    ell(x - rx * 0.2, y - ry * 0.25, rx * 0.55, ry * 0.45, SADDLE.seatLight);
    ell(x + pom[0], y + pom[1], 1.4, 1.4, SADDLE.strap);
    px(g, ...P(x + pom[0], y + pom[1] - 0.6), SADDLE.metal);
  };
  // Everything after this goes on the over layer, in front of a rider.
  const front = () => { if (opts.over) g = opts.over; };

  const tail = (x, y, segs) => {
    const pts = [P(x, y)];
    for (const [dx, dy] of segs) {
      const [x0, y0] = pts[pts.length - 1];
      pts.push([x0 + dx * S * a.tail, y0 + dy * S * a.tail]);
    }
    for (let i = 0; i < pts.length - 1; i++) line(g, ...pts[i], ...pts[i + 1], B, T(4 - i));
    if (look.spines === 'spikes') {
      for (let i = 1; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        const n = Math.hypot(x1 - x0, y1 - y0) || 1;
        const s = x1 - x0 > 0 ? -1 : 1;
        const [nx, ny] = [(-(y1 - y0) / n) * s, ((x1 - x0) / n) * s];
        poly(g, [[x0, y0], [(x0 + x1) / 2 + nx * 2.5 * S, (y0 + y1) / 2 + ny * 2.5 * S], [(x0 + x1) / 2, (y0 + y1) / 2]], FIN);
      }
    }
    return pts[pts.length - 1];
  };
  // The tail's tip: a pair of fins, or the kind's club, spade or fan.
  const fins = ([x, y], A, Bf) => {
    const k = (look.tail === 'spade' ? 1.3 : look.tail === 'club' ? 0.55 : 1) * S * a.chub;
    const pts = (shape) => shape.map(([dx, dy]) => [x + dx * k, y + dy * k]);
    const pa = pts(A);
    const pb = pts(Bf);
    const [fa, fb] = pal.tailFins || [FIN, FIN];
    poly(g, pa, fa);
    poly(g, pb, fb);
    if (look.tail === 'spade') poly(g, [pa[1], pa[0], pb[1]], FIN);
    if (look.tail === 'fan') poly(g, pts([A[0], [(A[1][0] + Bf[1][0]) * 0.75, (A[1][1] + Bf[1][1]) * 0.75], [(A[2][0] + Bf[2][0]) / 2, (A[2][1] + Bf[2][1]) / 2]]), shade(FIN, 0.25));
    if (look.tail === 'club') {
      ellipse(g, x, y, 3.2 * S * a.chub, 2.6 * S * a.chub, D);
      ellipse(g, x - 0.8 * S, y - 0.8 * S, 1.6 * S * a.chub, 1.2 * S * a.chub, B);
    }
  };
  // A wing rooted at body point (x, y) spreading along the screen direction `[ax, ay]`, with its
  // membrane running along `[vx, vy]`; folded, it lies along the flank with its tip towards `[bx, by]`.
  const wing = (x, y, [ax, ay], [vx, vy], [bx, by], lift = 1) => {
    const [rx, ry] = P(x, y);
    if (fold) {
      const F = (u, back) => [rx + (ax * u + bx * back * a.wing) * S, ry + (ay * u + by * back * a.wing) * S];
      poly(g, [F(3, -4), F(8, -1), F(9, 10), F(5, 7), F(3, 4)], M);
      line(g, ...F(8, -1), ...F(9, 10), L);
      return;
    }
    // u along the span, v across the membrane, z (wingtip lift) straight up the screen.
    const Q = (u, v, z) => [rx + (ax * u + vx * v) * S, ry + (ay * u + vy * v + z * lift) * S];
    const sp = span;
    const wrist = Q(15 * sp, -6.6, tip * 0.42);
    poly(g, [Q(4, -5, 0), Q(33 * sp, -9, tip), Q(26 * sp, 2, tip * 0.6), Q(17 * sp, 0, tip * 0.35), Q(10 * sp, 5, tip * 0.15), Q(4, 4, 0)], M);
    // the membrane in the shadow of the body, and the kind's coloured tips
    poly(g, [Q(4, -4, 0), wrist, Q(17 * sp, 0, tip * 0.35), Q(10 * sp, 5, tip * 0.15), Q(4, 4, 0)], shade(M, -0.16));
    if (look.tips) poly(g, [Q(33 * sp, -9, tip), Q(29.5 * sp, -3.5, tip * 0.8), Q(26 * sp, 2, tip * 0.6), Q(27 * sp, -7.4, tip * 0.85)], FIN);
    line(g, ...Q(4, -5, 0), ...Q(33 * sp, -9, tip), L, T(2));
    // finger bones fanning from the wrist to the scallops of the trailing edge
    line(g, ...wrist, ...Q(26 * sp, 2, tip * 0.6), D);
    line(g, ...wrist, ...Q(17 * sp, 0, tip * 0.35), D);
    line(g, ...Q(9 * sp, -5.4, tip * 0.25), ...Q(10 * sp, 5, tip * 0.15), D);
    if (S > 0.7) px(g, ...wrist.map((v, i) => v - (i ? 1 : 0)), GLINT);
  };
  // Side view: the far wing rises above the back, the near one hangs over the flank.
  const sideWing = (near) => {
    const y0 = near ? 3 : -3;
    const W = (x, y) => P(2 + (x - 2) * a.wing, y0 + (y - y0) * a.wing);
    let pts;
    if (fold) {
      pts = near ? [W(-4, 1), W(8, 0), W(-14, -3), W(-11, 2)] : [W(-4, -3), W(8, -3), W(-14, -9), W(-10, -4)];
    } else {
      const k = near ? [0.35, 0.75, 1, 0.75][f] : -[1, 0.75, 0.45, 0.75][f];
      pts = [W(-4, y0), W(8, y0), W(-6, y0 + (near ? 20 : 22) * k), W(-14, y0 + (near ? 11 : 13) * k)];
    }
    const mid = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
    poly(g, pts, near ? M : D);
    if (!fold) {
      poly(g, [pts[0], pts[1], mid(pts[1], pts[2], 0.45), mid(pts[0], pts[3], 0.6)], shade(near ? M : D, -0.14));
      if (look.tips) poly(g, [pts[2], mid(pts[1], pts[2], 0.78), mid(pts[3], pts[2], 0.7)], FIN);
      line(g, ...mid(pts[1], pts[2], 0.45), ...pts[3], D);
      line(g, ...mid(pts[1], pts[2], 0.45), ...mid(pts[3], pts[2], 0.5), D);
    }
    line(g, ...pts[1], ...pts[2], L, T(2));
  };

  if (view === 'right') {
    sideWing(false);
    fins(tail(-10, 1, [[-10, sw], [-8, -3 - 2 * sw], [-4, -5 + sw]]), [[0, 1], [-3, -5], [3, -1]], [[0, 1], [-3, 5], [3, 3]]);
    legs(-5, 5);
    const c = a.chub;
    ell(0, 0, 11, 6 * c, B);
    belly(1, 3 * c, 8, 2.2 * c);
    ell(0, -3 * c, 8, 2, M);
    marks([[-6, -5 * c, -5, -1], [-1, -5.8 * c, 0, -1.5], [4, -5.2 * c, 5, -1]], [[-7, -3], [-3, -4.5], [2, -3.5], [6, -2.5], [-1, -1.5]]);
    spines([[-8, -4.4 * c], [-4, -5.6 * c], [0, -6 * c], [4, -5.6 * c]], [0, -1]);
    saddle(0, -5 * c, 4.5, 2, [3.6, -1.6], [0, -3, 0, 5.4 * c]);
    // standing with its wings folded it holds its head up; in the air it stretches out
    const up = stand && fold;
    const neck = up ? P(9 + 5 * a.neck, -6 - 7 * a.neck) : P(9 + 7 * a.neck, -2 - 5 * a.neck);
    line(g, ...P(8, -2), ...neck, B, T(5));
    if (look.spines) spines([up ? [9 + 2.5 * a.neck, -5 - 4 * a.neck] : [9 + 3.5 * a.neck, -3 - 3 * a.neck]], [-0.5, -1]);
    head(neck, 4, (up ? -2 : -1) - lift);
    ear([[-4, -3], [-11 + 2 * young, -8 - 1.5 * young], [-1, -1]]);
    hell(0, 0, 6, 4, B);
    hpoly([[2, -2], [2 + 8 * sn, 0], [1 + 8 * sn, 3], [2, 4]], B);
    hell(-1, -2, 3, 1, M);
    ears();
    eye(2 - (1 - sn) * 2, -1 - (a.eye - 2));
    nostril(2 + 6 * sn, 1);
    sideWing(true);
    return H(2 + 8 * sn, 2);
  }
  if (view === 'down') {
    fins(tail(0, -6, [[sw, -8], [-2 * sw, -6], [sw, -4]]), [[0, 2], [-5, -2], [-1, 5]], [[0, 2], [5, -2], [1, 5]]);
    if (!fold) for (const s of [-1, 1]) wing(0, -2, [s, 0], [0, 1], [0, -1]);
    legs(-5, 5);
    const c = a.chub;
    ell(0, 0, 7 * c, 10, B);
    if (fold) belly(0, 4, 4.5 * c, 5);
    ell(0, -3, 4, 6, M);
    marks([[-3 * c, -6, 3 * c, -6], [-4.5 * c, -2, 4.5 * c, -2], [-4 * c, 2, 4 * c, 2]], [[-3, -6], [2, -4], [-2, -1], [3, 1]]);
    spines([[0, -8], [0, -4.5], [0, -1]], [0, -1]);
    saddle(0, -2, 4, 4.5, [0, 4], [-7 * c, -2, 7 * c, -2]);
    // Folded, the wings hang at its sides like little arms.
    for (const s of fold ? [-1, 1] : []) {
      const x0 = 6 * a.chub * s;
      const k = a.wing;
      const pts = [P(x0 - s, -6), P(x0 + 6 * k * s, 2 * k), P(x0 + 3 * k * s, 6 * k), P(x0 - s, 3)];
      poly(g, pts, M);
      line(g, ...pts[0], ...pts[1], L);
    }
    front();
    const nk = 6 + 4 * a.neck;
    if (stand) {
      head(P(0, -2), 0, -5 * round);
    } else {
      ell(0, nk, 4 * a.chub, 4, B);
      head(P(0, nk), 0, 5);
    }
    for (const s of [-1, 1]) ear([[4 * s, -2], [(9 + young) * s, -7 + young], [2 * s, -4]]);
    hell(0, 0, 6, 5, B);
    hell(0, -2, 4, 2, M);
    ears();
    const ey = -(a.eye - 2) / HS;
    eye(-4 - (a.ew - 2) / HS, ey);
    eye(2, ey);
    nostril(-2, 3 + sn);
    nostril(1, 3 + sn);
    return H(0, 4);
  }
  if (view === 'up') {
    const nk = 6 + 4 * a.neck;
    if (stand) legs(-5, 5);
    ell(0, -nk, 4 * a.chub, 4, B);
    head(P(0, -nk), 0, -6);
    for (const s of [-1, 1]) ear([[4 * s, 0], [9 * s, 6], [2 * s, 3]]);
    hell(0, 0, 6, 5, B);
    hell(0, -1, 4, 2, M);
    ears();
    if (!fold) for (const s of [-1, 1]) wing(0, -2, [s, 0], [0, 1], [0, 1]);
    const c = a.chub;
    ell(0, 0, 7 * c, 10, B);
    ell(0, 2, 4, 6, M);
    marks([[-4 * c, -3, 4 * c, -3], [-4.5 * c, 1, 4.5 * c, 1], [-3 * c, 5, 3 * c, 5]], [[-3, -4], [2, -2], [-2, 2], [3, 5]]);
    spines([[0, 0], [0, 3.5], [0, 7]], [0, 1]);
    saddle(0, -2, 4, 4.5, [0, -4], [-7 * c, -2, 7 * c, -2]);
    if (fold) for (const s of [-1, 1]) wing(0, -4, [s, 0], [0, 1], [0.4 * s, 1]);
    fins(tail(0, 8, [[sw, 8], [-2 * sw, 6], [sw, 4]]), [[0, -1], [-5, 3], [-1, -4]], [[0, -1], [5, 3], [1, -4]]);
    return null;
  }
  if (view === 'se') {
    fins(tail(-6, -4, [[-6, -5 + sw], [-5, -5 - sw], [-4, -4]]), [[0, 0], [-5, -2], [-1, 3]], [[0, 0], [-1, -5], [3, -1]]);
    wing(2, -4, [0.75, -0.45], [-0.6, -0.5], [-0.8, -0.6]);
    legs(-4, 5);
    const c = a.chub;
    ell(0, 0, 9, 7 * c, B);
    belly(2, 3 * c, 6, 3 * c);
    ell(-2, -2, 5, 3, M);
    marks([[-6, -4 * c, -4, -0.5], [-2, -5.6 * c, 0, -1.5], [2.5, -5.4 * c, 4.5, -1]], [[-6, -3], [-2, -5], [2, -3], [-1, -1], [4, -1]]);
    spines([[-6.5, -4.4 * c], [-3, -6 * c], [1, -6.4 * c], [4.5, -5.4 * c]], [0, -1]);
    saddle(-1, -4.5 * c, 5, 2.8, [3.6, 0.6], [-1, -2, -1, 6 * c]);
    wing(-2, 2, [-0.75, 0.45], [0.2, 0.9], [-0.8, -0.6], 0.5);
    front();
    const neck = P(6 + 5 * a.neck, 1 + 4 * a.neck);
    line(g, ...P(6, 1), ...neck, B, T(5));
    head(neck, 3, 2 - lift);
    ear([[-3, -2], [-10, -7], [-2, -4]]);
    ear([[1, -4], [-2, -10], [3, -3]]);
    hell(0, 0, 6, 5, B);
    hpoly([[1, -1], [1 + 7 * sn, 2], [6 * sn, 5], [-1, 4]], B);
    hell(-1, -2, 3, 2, M);
    ears();
    eye(-3, -(a.eye - 2));
    eye(2, -2 - (a.eye - 2), 1);
    nostril(1 + 6 * sn, 2);
    return H(1 + 5 * sn, 4);
  }
  wing(-2, -3, [-0.75, -0.45], [-0.6, 0.5], [-0.8, 0.6]);
  const neck = P(6 + 5 * a.neck, -3 - 6 * a.neck);
  line(g, ...P(6, -3), ...neck, B, T(5));
  head(neck, 3, -3 - lift);
  hpoly([[1, -2], [2 + 6 * sn, -2 - 5 * sn], [4 + 6 * sn, -5 * sn], [4, 1]], B);
  hell(0, 0, 6, 5, B);
  ear([[-3, 1], [-9, 6], [-1, 3]]);
  ear([[1, 1], [-1, 7], [3, 2]]);
  hell(-2, -2, 3, 1.5, M);
  ears();
  eye(4, -1, 1);
  legs(-4, 4);
  const c = a.chub;
  ell(0, 0, 9, 7 * c, B);
  ell(-1, -1, 5, 4, M);
  marks([[-6, -3 * c, -4, 1], [-2, -5 * c, 0, 0], [2.5, -5 * c, 4.5, 0]], [[-5, -2], [-1, -4], [3, -3], [0, 1], [-4, 2]]);
  spines([[-5.5, -5 * c], [-2, -6.2 * c], [2, -6.2 * c], [5.5, -4.6 * c]], [0, -1]);
  saddle(-1, -4.5 * c, 5, 2.8, [3.6, -1.8], [-1, -2, -1, 6 * c]);
  wing(2, 1, [0.75, 0.45], [-0.2, 0.9], [-0.8, 0.6], 0.5);
  fins(tail(-5, 3, [[-7, 4 + sw], [-6, 4 - sw], [-4, 4]]), [[0, 0], [-5, 1], [-2, -3]], [[0, 0], [1, 5], [-3, 2]]);
  return null;
}

const DRAGON_VIEWS = ['down', 'up', 'right', 'se', 'ne'];
const DRAGON_MIRRORS = [['right', 'left'], ['se', 'sw'], ['ne', 'nw']];

// Mouth positions relative to the ground point for each of the eight facings (null: facing away).
function dragonMouths(pal, a, stand) {
  const g = makeCanvas(1, 1).getContext('2d');
  const m = {};
  for (const view of DRAGON_VIEWS) {
    const p = drawDragon(g, pal, a, view, 0, stand, 0, 0);
    m[view] = p && p.map(Math.round);
  }
  for (const [from, to] of DRAGON_MIRRORS) m[to] = m[from] && [-m[from][0], m[from][1]];
  return m;
}

// Bounding box [x, y, w, h] of the opaque pixels of same-sized canvases.
function opaqueBox(...cs) {
  const { width: w, height: h } = cs[0];
  let [x0, y0, x1, y1] = [w, h, 0, 0];
  for (const c of cs) {
    const d = c.getContext('2d').getImageData(0, 0, w, h).data;
    for (let i = 3; i < d.length; i += 4) {
      if (!d[i]) continue;
      const x = ((i - 3) / 4) % w;
      const y = Math.floor((i - 3) / 4 / w);
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x + 1), Math.max(y1, y + 1)];
    }
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

// The young dragon after eating `stage` fish, drawn in DRAGON_AGES[stage] in all eight facings, with
// frames: standing, standing with raised wings, and two wing beats in the air. `ox`/`oy` give the
// ground point, `top` how far its front views reach above it, `mouth` where it holds a catch and
// `box` the bounds of the standing front view.
function buildBabyDragon(pal, stage) {
  const a = DRAGON_AGES[stage];
  const ox = Math.ceil(38 * a.size) + 2;
  const oy = Math.ceil(42 * a.size) + 2;
  const frame = (view, f, stand) => sprite(ox * 2, oy + Math.ceil(16 * a.size) + 2, (g) => drawDragon(g, pal, a, view, f, stand, ox, oy));
  const set = { ox, oy, mouth: dragonMouths(pal, a, false) };
  for (const view of DRAGON_VIEWS) set[view] = [frame(view, -1, true), frame(view, 0, true), frame(view, 0, false), frame(view, 2, false)];
  for (const [from, to] of DRAGON_MIRRORS) set[to] = set[from].map(mirror);
  set.box = opaqueBox(set.down[0], set.down[1]);
  set.top = oy - opaqueBox(...set.down)[1];
  return set;
}

// Sheep, 24x17 with the ground point at (12, 16). Frames: standing, mid-step, grazing.
function buildSheep() {
  const WOOL = '#f4f1ea';
  const SHADE = '#d6cfc2';
  const FACE = '#3a3030';
  const frame = (step, graze) => sprite(26, 17, (g) => {
    g.translate(1, 0);
    const legs = step ? [[5, 12], [8, 13], [12, 13], [15, 12]] : [[5, 13], [7, 13], [13, 13], [15, 13]];
    for (const [x, y] of legs) rect(g, x, y, 2, 3, FACE);
    ellipse(g, 10, 10, 7, 4, SHADE);
    for (const [x, y, r] of [[5, 8, 3], [9, 6, 3], [13, 7, 3], [14, 10, 3], [10, 9, 5]]) ellipse(g, x, y, r, r * 0.9, WOOL);
    ellipse(g, 2, 8, 1.5, 1.5, WOOL);
    const hx = graze ? 20 : 19;
    const hy = graze ? 12 : 7;
    if (!graze) rect(g, 16, 8, 2, 3, FACE);
    ellipse(g, hx, hy, 2, 2.5, FACE);
    rect(g, hx - 4, hy - 2, 2, 1, FACE);
    ellipse(g, hx - 1, hy - 3, 1.5, 1, WOOL);
    px(g, hx + 1, hy - 1, '#ffffff');
  });
  const right = [frame(false, false), frame(true, false), frame(false, true)];
  return { right, left: right.map(mirror) };
}

function buildMenhir() {
  return sprite(14, 28, (g) => {
    poly(g, [[3, 26], [2, 8], [5, 2], [9, 2], [12, 8], [11, 26]], PAL.rock);
    rect(g, 3, 6, 2, 19, PAL.rockLight);
    rect(g, 9, 7, 2, 18, PAL.rockDark);
    ellipse(g, 7, 25, 5, 1, PAL.grassDark);
  });
}

// The flat stone in the middle of the ring; open, it shows the hollow the egg rises from.
function buildAltar(open) {
  return sprite(26, 12, (g) => {
    ellipse(g, 13, 7, 12, 4, PAL.rockDeep);
    ellipse(g, 13, 6, 12, 4, PAL.rock);
    ellipse(g, 12, 5, 9, 2, PAL.rockLight);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      px(g, Math.round(13 + Math.cos(a) * 9), Math.round(6 + Math.sin(a) * 3), PAL.rockDark);
    }
    if (open) {
      ellipse(g, 13, 6, 5, 2, '#141822');
      ellipse(g, 13, 7, 4, 1, '#22304a');
    } else line(g, 8, 6, 18, 6, PAL.rockDark);
  });
}

// A wet rock breaking the surface, foam slapping round its foot; two frames for the swell.
function buildReefRock(v, swell) {
  const w = [12, 16, 10][v];
  const h = [8, 10, 7][v];
  return sprite(w + 6, h + 3, (g) => {
    const cx = (w + 6) / 2;
    ellipse(g, cx, h, w / 2 + 2, 2, swell ? '#cfe8f4' : '#a9d7f7');
    ellipse(g, cx, h - h / 2 + 1, w / 2, h / 2, PAL.rockDeep);
    ellipse(g, cx - 1, h - h / 2, w / 2 - 1, h / 2 - 1, PAL.rockDark);
    ellipse(g, cx - 2, h - h / 2 - 1, w / 4, h / 5, PAL.rock);
    for (let i = 0; i < 5; i++) px(g, Math.round(cx - w / 2 - 1 + i * (w / 4) + (swell ? 1 : 0)), h + (i % 2), PAL.foam);
  });
}

function buildRock(big) {
  const w = big ? 26 : 14;
  const h = big ? 18 : 10;
  return sprite(w + 2, h + 1, (g) => {
    g.translate(1, 0);
    const cx = w / 2;
    ellipse(g, cx, h / 2 + 1, w / 2 - 2, h / 2 - 2, PAL.rockDark);
    ellipse(g, cx - 1, h / 2, w / 2 - 3, h / 2 - 3, PAL.rock);
    ellipse(g, cx - 3, h / 2 - 2, w / 4, h / 5, PAL.rockLight);
    if (big) ellipse(g, cx - 1, 4, 6, 1, PAL.grass);
  });
}

// ---------- props ----------

// A shop's board on two posts; the shop's emblem is painted on afterwards (`drawSignEmblem`).
function buildShopSign() {
  return sprite(24, 32, (g) => {
    for (const x of [4, 18]) {
      rect(g, x, 18, 2, 14, PAL.woodDark);
      px(g, x, 18, PAL.wood);
    }
    rect(g, 0, 0, 24, 21, '#4a3018');
    rect(g, 1, 1, 22, 19, '#c49a62');
    rect(g, 1, 1, 22, 1, '#e0b880');
    rect(g, 1, 19, 22, 1, '#9a7240');
    for (const y of [7, 13]) rect(g, 2, y, 20, 1, '#b48a54');
    for (const [x, y] of [[2, 2], [21, 2], [2, 18], [21, 18]]) px(g, x, y, '#4a3018');
  });
}

function drawSignEmblem(g, x, y, o) {
  const img = SPR.icon[SHOPS[o.shop]?.emblem];
  if (img) g.drawImage(img, Math.round(x - img.width / 2), Math.round(y - 21 - img.height / 2));
}

// The fisher's shack on the harbour beach: driftwood planks under a turf roof, the day's catch hung by the hatch
// and a net drying on the wall.
function buildFishShack() {
  return sprite(52, 46, (g) => {
    rect(g, 6, 20, 40, 24, '#7a5530');
    for (let x = 6; x < 46; x += 5) rect(g, x, 20, 1, 24, '#5e3f22');
    rect(g, 5, 43, 42, 3, '#4a3018');
    poly(g, [[0, 23], [26, 2], [52, 23]], '#4a3018');
    poly(g, [[3, 22], [26, 4], [49, 22]], '#5f7f36');
    poly(g, [[3, 22], [26, 4], [26, 9], [9, 22]], '#7a9a44');
    for (const [x, y] of [[14, 16], [22, 10], [34, 14], [40, 19], [28, 18]]) px(g, x, y, '#94b45a');
    rect(g, 0, 22, 52, 2, '#4a3018');
    line(g, 21, 0, 26, 5, '#a07040');
    line(g, 31, 0, 26, 5, '#a07040');
    rect(g, 31, 29, 10, 15, '#2a1a10');
    rect(g, 30, 28, 12, 1, '#5e3f22');
    rect(g, 39, 36, 1, 2, '#c8a060');
    rect(g, 9, 28, 16, 8, '#2a1a10');
    rect(g, 8, 36, 18, 2, '#a07040');
    rect(g, 8, 26, 18, 1, '#5e3f22');
    for (const [x, c] of [[12, '#8fa8b8'], [17, '#c8a060'], [22, '#8fa8b8']]) {
      px(g, x, 27, '#e8e0c8');
      rect(g, x - 1, 28, 3, 5, c);
      px(g, x, 33, c);
      px(g, x - 1, 34, c);
      px(g, x + 1, 34, c);
      px(g, x, 29, '#22160f');
    }
    for (let y = 30; y < 43; y += 3) line(g, 43, y, 47, y + 2, '#d8c89a');
    for (let x = 43; x < 47; x += 2) line(g, x, 29, x, 43, '#d8c89a');
  });
}

function buildBarrel() {
  return sprite(14, 18, (g) => {
    for (let y = 3; y < 16; y++) {
      const t = Math.abs(y - 9) / 7;
      const hw = Math.round(5.5 - t * 1.5);
      rect(g, 7 - hw, y, hw * 2, 1, PAL.wood);
      px(g, 7 - hw + 1, y, PAL.woodLight);
      px(g, 7 + hw - 1, y, PAL.woodDark);
    }
    rect(g, 2, 5, 10, 1, PAL.rockDark);
    rect(g, 2, 13, 10, 1, PAL.rockDark);
    ellipse(g, 7, 3, 4, 1, PAL.woodLight);
    rect(g, 5, 3, 4, 1, PAL.woodDark);
  });
}

function buildFence(vertical) {
  return sprite(16, 16, (g) => {
    if (vertical) {
      rect(g, 7, 0, 2, 16, PAL.wood);
      rect(g, 6, 4, 4, 11, PAL.woodDark);
      rect(g, 6, 4, 4, 1, PAL.woodLight);
    } else {
      rect(g, 0, 5, 16, 2, PAL.wood);
      rect(g, 0, 10, 16, 2, PAL.wood);
      rect(g, 0, 6, 16, 1, PAL.woodDark);
      rect(g, 0, 11, 16, 1, PAL.woodDark);
      rect(g, 2, 2, 3, 13, PAL.woodDark);
      rect(g, 2, 2, 3, 1, PAL.woodLight);
    }
  });
}

function buildPost() {
  return sprite(8, 16, (g) => {
    rect(g, 2, 2, 3, 13, PAL.woodDark);
    rect(g, 2, 2, 3, 1, PAL.woodLight);
  });
}

function buildAnvil() {
  return sprite(18, 12, (g) => {
    poly(g, [[2, 2], [15, 2], [15, 5], [6, 5]], '#56565e');
    rect(g, 3, 2, 12, 1, '#8b8b94');
    rect(g, 7, 5, 6, 4, '#45454c');
    rect(g, 5, 9, 10, 2, '#56565e');
  });
}

// Held upright: the grip is at (4, 13) and the blade faces right.
function buildAxe() {
  return sprite(10, 15, (g) => {
    rect(g, 3, 2, 2, 12, PAL.woodLight);
    rect(g, 4, 2, 1, 12, PAL.wood);
    rect(g, 5, 1, 2, 5, '#8b8b94');
    rect(g, 7, 1, 2, 6, '#c9ccd4');
    px(g, 8, 0, '#c9ccd4');
    px(g, 8, 7, '#c9ccd4');
    rect(g, 2, 2, 1, 3, '#56565e');
  });
}

function buildLog() {
  return sprite(13, 9, (g) => {
    rect(g, 1, 2, 9, 5, PAL.wood);
    rect(g, 1, 2, 9, 1, PAL.woodLight);
    rect(g, 1, 6, 9, 1, PAL.woodDark);
    px(g, 4, 4, PAL.woodDark);
    px(g, 7, 3, PAL.woodDark);
    ellipse(g, 10, 4.5, 2, 2.5, '#d9b07a');
    px(g, 10, 4, PAL.woodDark);
  });
}

// A cube of clear ice: the lit top, two shaded sides and a glint.
function buildIceCube() {
  return sprite(8, 8, (g) => {
    poly(g, [[0, 2], [4, 0], [8, 2], [4, 4]], PAL.iceLight);
    poly(g, [[0, 2], [4, 4], [4, 8], [0, 6]], PAL.ice);
    poly(g, [[4, 4], [8, 2], [8, 6], [4, 8]], PAL.iceDark);
    px(g, 1, 3, '#ffffff');
    px(g, 4, 1, '#ffffff');
  });
}

function buildPebble() {
  return sprite(9, 7, (g) => {
    ellipse(g, 4, 3.5, 3.5, 2.5, PAL.rock);
    ellipse(g, 3, 2.5, 2, 1.2, PAL.rockLight);
    rect(g, 2, 5, 5, 1, PAL.rockDark);
    px(g, 2, 2, '#c8c7cb');
  });
}

// A parchment chart hung from a rod; drawn on the hall's back wall.
function buildWallMap() {
  return sprite(28, 22, (g) => {
    rect(g, 3, 3, 22, 16, '#e6d3a3');
    rect(g, 3, 3, 22, 1, '#f4e6c0');
    rect(g, 3, 18, 22, 1, '#c4ab78');
    ellipse(g, 10, 10, 5, 3.5, '#9cbf6a');
    ellipse(g, 19, 13, 3, 2, '#9cbf6a');
    px(g, 21, 7, '#9cbf6a');
    for (const [x, y] of [[6, 14], [13, 15], [16, 8], [22, 10]]) px(g, x, y, '#7fa6c8');
    line(g, 12, 9, 17, 12, '#8a5a3a');
    rect(g, 17, 12, 1, 1, '#c8322a');
    px(g, 16, 11, '#c8322a');
    px(g, 18, 13, '#c8322a');
    rect(g, 1, 1, 26, 2, PAL.woodDark);
    rect(g, 1, 19, 26, 2, PAL.woodDark);
    rect(g, 13, 0, 2, 1, PAL.woodDark);
  });
}

function buildWool() {
  return sprite(13, 11, (g) => {
    for (const [x, y, r] of [[4, 6, 3], [8, 6, 3], [6, 4, 3], [6, 7, 3]]) ellipse(g, x, y, r, r - 0.5, '#e8e2d4');
    for (const [x, y] of [[4, 4], [7, 3], [9, 5], [5, 7]]) px(g, x, y, '#ffffff');
    for (const [x, y] of [[3, 8], [8, 8], [10, 7]]) px(g, x, y, '#bfb6a2');
  });
}

function buildBow() {
  return sprite(10, 17, (g) => {
    line(g, 3, 1, 6, 4, PAL.wood, 2);
    line(g, 6, 4, 6, 12, PAL.wood, 2);
    line(g, 6, 12, 3, 15, PAL.wood, 2);
    rect(g, 6, 7, 2, 3, PAL.woodDark);
    line(g, 3, 1, 3, 15, '#e8e0c8');
  });
}

function buildSword() {
  return sprite(14, 14, (g) => {
    line(g, 4, 9, 11, 2, '#c9ccd4', 2);
    line(g, 5, 9, 11, 3, '#8b8b94');
    px(g, 12, 1, '#e8eaf0');
    line(g, 2, 7, 6, 11, '#c89a3a', 2);
    line(g, 2, 12, 4, 10, PAL.woodDark, 2);
    px(g, 1, 13, '#c89a3a');
  });
}

function buildShield() {
  return sprite(14, 14, (g) => {
    ellipse(g, 7, 7, 6, 6, PAL.wood);
    poly(g, [[7, 1], [13, 7], [7, 7]], '#b8342a');
    poly(g, [[1, 7], [7, 13], [7, 7]], '#b8342a');
    ellipse(g, 7, 7, 2, 2, '#8b8b94');
    px(g, 6, 6, '#c9ccd4');
  });
}

function buildSpear() {
  return sprite(16, 16, (g) => {
    line(g, 1, 14, 11, 4, PAL.woodLight, 2);
    line(g, 2, 14, 11, 5, PAL.wood);
    poly(g, [[10, 3], [14, 1], [12, 5]], '#c9ccd4');
    px(g, 13, 1, '#e8eaf0');
    rect(g, 10, 4, 2, 2, '#56565e');
  });
}

function buildRod() {
  return sprite(14, 16, (g) => {
    line(g, 2, 14, 11, 2, PAL.woodLight, 2);
    line(g, 3, 14, 11, 3, PAL.wood);
    rect(g, 3, 10, 3, 3, '#56565e');
    px(g, 4, 11, '#c9ccd4');
    line(g, 12, 2, 12, 9, '#e8e0c8');
    px(g, 12, 10, '#c9ccd4');
    rect(g, 11, 7, 3, 2, '#c8322a');
    px(g, 11, 7, '#f6e7c1');
  });
}

// A browned copy of a raw food icon, with char lines from the grill if `grill`.
function buildCooked(src, tint, grill) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = tint;
  g.fillRect(0, 0, c.width, c.height);
  if (grill) {
    g.fillStyle = 'rgba(60,28,10,0.7)';
    for (let x = 5; x < c.width - 4; x += 4) g.fillRect(x, 3, 1, c.height - 6);
  } else {
    g.fillStyle = 'rgba(255,214,140,0.8)';
    g.fillRect(Math.floor(c.width / 2) - 2, Math.floor(c.height / 2) - 1, 2, 1);
  }
  return c;
}

function buildFish() {
  return sprite(14, 9, (g) => {
    poly(g, [[10, 4], [13, 1], [13, 7]], '#5f7fa6');
    ellipse(g, 6, 4, 5, 3, '#7fa6c8');
    ellipse(g, 6, 5.5, 3.5, 1.2, '#cfdceb');
    rect(g, 3, 2, 6, 1, '#5f7fa6');
    px(g, 6, 1, '#5f7fa6');
    px(g, 3, 3, '#10141c');
  });
}

// The other catches, all facing left like the herring: `len` stretches the body, `spots` speckle the back.
function buildFishKind({ body, belly, fin, len = 5, tall = 3, spots, spotColor = fin, stripe, eye = true, shine }) {
  const w = len * 2 + 6;
  const h = tall * 2 + 3;
  const cy = tall + 1;
  return sprite(w, h, (g) => {
    poly(g, [[len * 2 - 1, cy], [w - 1, cy - tall + 0.5], [w - 1, cy + tall - 0.5]], fin);
    ellipse(g, len + 1, cy, len, tall, body);
    ellipse(g, len + 1, cy + tall * 0.5, len * 0.7, Math.max(1, tall * 0.4), belly);
    rect(g, 3, cy - tall + 1, len + 1, 1, fin);
    if (stripe) rect(g, 3, cy, len * 2 - 3, 1, stripe);
    for (const [x, y] of spots || []) px(g, x, y, spotColor);
    if (shine) for (const [x, y] of [[4, cy - 1], [len, cy - tall + 2], [len + 3, cy - 1]]) px(g, x, y, shine);
    if (eye) px(g, 3, cy - 1, '#10141c');
  });
}

// Puffed up round, facing left with the rest: spines all over, a little tail, and big worried eyes.
function buildPufferfish() {
  return sprite(15, 13, (g) => {
    poly(g, [[10, 6], [14, 3], [14, 9]], '#a8782a');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      px(g, Math.round(6 + Math.cos(a) * 5.6), Math.round(6 + Math.sin(a) * 5.6), '#7a5420');
    }
    ellipse(g, 6, 6, 5, 5, '#e2bc52');
    ellipse(g, 6, 8, 3.6, 2.6, '#f8ecc4');
    for (const [x, y] of [[5, 2], [8, 3], [9, 5], [7, 4]]) px(g, x, y, '#8a5c22');
    px(g, 3, 4, '#ffffff');
    rect(g, 3, 5, 2, 1, '#10141c');
    px(g, 1, 7, '#a8482a');
  });
}

// A heap of icy rock with a dark mouth at the bottom, 64x46, snow on top and icicles over the opening.
function buildCaveMouth() {
  return sprite(64, 46, (g) => {
    ellipse(g, 32, 30, 30, 15, PAL.rockDeep);
    ellipse(g, 30, 27, 27, 14, PAL.rockDark);
    ellipse(g, 26, 22, 18, 10, PAL.rock);
    ellipse(g, 44, 28, 10, 7, PAL.rock);
    ellipse(g, 22, 17, 9, 5, PAL.rockLight);
    ellipse(g, 30, 16, 22, 8, PAL.snow);
    ellipse(g, 26, 13, 14, 5, PAL.snowLight);
    ellipse(g, 50, 22, 7, 3, PAL.snow);
    poly(g, [[22, 45], [22, 32], [26, 26], [32, 24], [38, 26], [42, 32], [42, 45]], '#05070c');
    poly(g, [[25, 45], [25, 33], [28, 28], [32, 27], [36, 28], [39, 33], [39, 45]], '#000000');
    for (const [x, len] of [[24, 4], [27, 6], [30, 3], [33, 7], [36, 4], [39, 5]]) {
      poly(g, [[x - 1, 27], [x + 1, 27], [x, 27 + len]], PAL.iceLight);
      px(g, x - 1, 27, PAL.ice);
    }
    rect(g, 14, 43, 36, 2, PAL.snowDark);
  });
}

const SANDSTONE = ['#f2d49a', '#e0b56e', '#c99752', '#a8763c', '#82552a', '#5a3818'];

// A layered sandstone bluff with a doorway carved into it: pillars either side, old signs over the lintel.
function buildSandCave() {
  const S = SANDSTONE;
  return sprite(128, 84, (g) => {
    for (let y = 6; y < 84; y++) {
      const t = Math.min(1, (y - 6) / 26);
      const hw = Math.round(30 + 32 * Math.sqrt(t) + Math.sin(y * 0.7) * (t < 1 ? 1 : 0.6));
      const band = y < 20 ? 0 : [1, 2, 1, 3, 2, 1, 2][Math.floor((y - 20) / 9) % 7];
      rect(g, 64 - hw, y, hw * 2, 1, S[band]);
      rect(g, 64 - hw, y, 3, 1, S[Math.max(0, band - 1)]);
      rect(g, 64 + hw - Math.round(hw * 0.28), y, Math.round(hw * 0.28), 1, S[band + 1]);
    }
    for (const [x, y0, len] of [[22, 30, 14], [100, 26, 18], [40, 56, 10], [92, 60, 12], [14, 64, 9]]) line(g, x, y0, x + 2, y0 + len, S[4]);
    ellipse(g, 52, 9, 16, 3, S[0]);
    ellipse(g, 80, 8, 12, 2, '#f8e4b4');
    // doorway: pillars, lintel, carved signs, and the dark beyond
    rect(g, 44, 34, 40, 8, S[1]);
    rect(g, 44, 34, 40, 1, S[0]);
    rect(g, 44, 41, 40, 1, S[4]);
    for (const x of [44, 77]) {
      rect(g, x, 42, 7, 42, S[1]);
      rect(g, x, 42, 2, 42, S[0]);
      rect(g, x + 5, 42, 2, 42, S[3]);
      for (const y of [48, 60, 72]) rect(g, x + 2, y, 3, 1, S[4]);
    }
    poly(g, [[52, 84], [54, 43], [74, 43], [76, 84]], '#1a0e04');
    poly(g, [[55, 84], [57, 47], [71, 47], [73, 84]], '#000000');
    for (let i = 0; i < 6; i++) {
      const gx = 48 + i * 6;
      const c = S[5];
      if (i % 3 === 0) { rect(g, gx, 36, 3, 1, c); px(g, gx + 1, 37, c); rect(g, gx + 1, 38, 1, 2, c); }
      else if (i % 3 === 1) { rect(g, gx, 37, 4, 2, c); px(g, gx + 2, 37, '#f2c94a'); }
      else { line(g, gx, 39, gx + 2, 36, c); line(g, gx + 2, 36, gx + 4, 39, c); }
    }
    ellipse(g, 14, 82, 16, 4, PAL.sand);
    ellipse(g, 112, 82, 18, 4, PAL.sand);
    ellipse(g, 16, 80, 9, 2, PAL.sandLight);
  });
}

// A sandstone sphinx lying with its paws out, in a striped headdress faded by the sun.
function buildSphinx() {
  const S = SANDSTONE;
  return sprite(56, 46, (g) => {
    ellipse(g, 28, 14, 21, 9, S[3]);
    ellipse(g, 26, 12, 17, 7, S[2]);
    ellipse(g, 28, 27, 22, 11, S[3]);
    ellipse(g, 26, 25, 20, 9, S[2]);
    for (const x of [6, 38]) {
      rect(g, x, 30, 12, 12, S[2]);
      ellipse(g, x + 6, 41, 6, 3, S[2]);
      rect(g, x, 30, 2, 11, S[1]);
      rect(g, x + 10, 30, 2, 11, S[3]);
      for (const k of [2, 5, 8]) px(g, x + 1 + k, 43, S[4]);
    }
    rect(g, 19, 30, 18, 9, S[3]);
    rect(g, 18, 32, 1, 10, S[4]);
    rect(g, 37, 32, 1, 10, S[4]);
    // headdress, striped down to the chest
    const hw = (y) => (y < 12 ? 4 + ((y - 3) / 9) * 6 : 10 + ((y - 12) / 18) * 2);
    for (let y = 3; y < 31; y++) {
      const w = Math.round(hw(y));
      rect(g, 28 - w, y, w * 2, 1, (y - 4) % 4 < 2 ? '#d8a84a' : '#5a7aa0');
      px(g, 28 - w, y, S[4]);
      px(g, 27 + w, y, S[4]);
    }
    for (let i = 0; i < 18; i++) px(g, 18 + Math.floor(hash(i, 3, 71) * 20), 5 + Math.floor(hash(i, 4, 71) * 24), S[2]);
    ellipse(g, 28, 17, 6, 7, S[1]);
    ellipse(g, 27, 15, 4, 4, S[0]);
    rect(g, 22, 10, 12, 2, '#e8c060');
    rect(g, 27, 7, 2, 3, '#e8c060');
    px(g, 27, 7, '#3a5a8a');
    rect(g, 23, 13, 10, 1, S[4]);
    rect(g, 24, 15, 3, 1, '#2a1a0c');
    rect(g, 29, 15, 3, 1, '#2a1a0c');
    rect(g, 27, 16, 2, 4, S[2]);
    rect(g, 26, 21, 4, 1, S[4]);
    rect(g, 26, 24, 4, 6, S[3]);
    for (const y of [25, 27, 29]) rect(g, 26, y, 4, 1, S[4]);
    for (const [x, y, l] of [[13, 22, 4], [40, 18, 5], [33, 33, 3]]) line(g, x, y, x + 1, y + l, S[4]);
  });
}

// A bronze bowl of fire on a stand; frames flicker the flame.
function buildBrazier(f) {
  return sprite(14, 24, (g) => {
    rect(g, 6, 12, 2, 9, '#5a3a18');
    rect(g, 3, 21, 8, 2, '#8a6a32');
    rect(g, 4, 20, 6, 1, '#6a4a22');
    ellipse(g, 7, 11, 6, 2.5, '#a8803a');
    ellipse(g, 7, 10, 5, 1.5, '#3a2410');
    poly(g, [[2, 10], [4 + (f % 2), 5], [7, 1 + f], [10 - (f % 2), 5], [12, 10]], '#ff7a1a');
    poly(g, [[4, 10], [6, 6], [7, 4 + f], [8, 6], [10, 10]], '#ffc34a');
    rect(g, 6, 8, 2, 2, '#fff0a0');
  });
}

function buildSandPillar() {
  const S = SANDSTONE;
  return sprite(16, 42, (g) => {
    rect(g, 3, 6, 10, 32, S[2]);
    rect(g, 3, 6, 3, 32, S[1]);
    rect(g, 11, 6, 2, 32, S[3]);
    poly(g, [[0, 7], [2, 1], [14, 1], [16, 7]], S[1]);
    rect(g, 0, 1, 16, 1, S[0]);
    rect(g, 2, 6, 12, 1, S[4]);
    rect(g, 1, 38, 14, 4, S[3]);
    rect(g, 1, 38, 14, 1, S[1]);
    for (const y of [14, 30]) rect(g, 3, y, 10, 1, S[4]);
    for (const y of [17, 20, 23, 26]) rect(g, 7, y, 2 - (y % 2), 2, S[4]);
  });
}

function buildUrn(v) {
  const [body, light, dark] = v ? ['#2f6f8a', '#5aa0b8', '#1a3a4a'] : ['#b0582a', '#d07a40', '#6a2a10'];
  return sprite(12, 16, (g) => {
    ellipse(g, 6, 10, 5, 5, body);
    ellipse(g, 5, 9, 3, 3, light);
    rect(g, 4, 2, 4, 4, body);
    rect(g, 3, 1, 6, 1, light);
    rect(g, 1, 9, 10, 1, dark);
    for (const x of [2, 5, 8]) px(g, x, 11, '#e8c060');
    rect(g, 3, 15, 6, 1, dark);
  });
}

// A spill of silver coins on the floor; a heap of gold, with a goblet poking out.
function buildCoinPile() {
  return sprite(20, 10, (g) => {
    ellipse(g, 10, 7, 9, 2.5, '#7a7e8a');
    ellipse(g, 10, 6, 7, 2.5, '#b8bcc8');
    for (const [x, y] of [[4, 6], [8, 4], [12, 5], [15, 7], [9, 7], [6, 8], [13, 8]]) {
      ellipse(g, x, y, 2, 1, '#e4e8f0');
      px(g, x + 1, y, '#8a8e9a');
    }
    px(g, 8, 3, '#ffffff');
    px(g, 13, 4, '#ffffff');
  });
}

function buildGoldHeap() {
  return sprite(24, 16, (g) => {
    ellipse(g, 12, 12, 11, 3.5, '#a87a1a');
    ellipse(g, 12, 10, 9, 4, '#e8b54a');
    ellipse(g, 11, 8, 6, 3, '#f2c94a');
    rect(g, 15, 2, 4, 3, '#f2c94a');
    rect(g, 16, 5, 2, 3, '#c8922a');
    rect(g, 15, 2, 4, 1, '#fff0a0');
    for (const [x, y] of [[5, 11], [9, 9], [13, 11], [18, 12], [8, 13], [11, 6]]) px(g, x, y, '#fff4b0');
    px(g, 6, 12, '#d8322a');
    px(g, 17, 10, '#3ac86a');
  });
}

// A banded treasure chest with a jewelled lock; open, it shows only a few coins left at the bottom.
function buildHoardChest(open) {
  return sprite(22, 20, (g) => {
    const wood = '#6a3d1d';
    if (open) {
      rect(g, 2, 1, 18, 7, '#4a2914');
      rect(g, 2, 1, 18, 1, '#e8b54a');
      rect(g, 3, 8, 16, 3, '#1a0e04');
      for (const x of [6, 10, 14]) px(g, x, 10, '#e8b54a');
    } else {
      rect(g, 2, 5, 18, 6, wood);
      rect(g, 2, 5, 18, 1, '#8a5a2a');
    }
    rect(g, 2, 11, 18, 8, wood);
    rect(g, 2, 11, 18, 1, '#8a5a2a');
    for (const x of [4, 16]) rect(g, x, open ? 11 : 5, 2, open ? 8 : 14, '#e8b54a');
    rect(g, 2, 18, 18, 1, '#3a2010');
    rect(g, 10, open ? 12 : 9, 2, 3, '#f2c94a');
    px(g, 10, open ? 13 : 10, '#d8322a');
  });
}

// A golden dragon sitting up on a sandstone plinth.
function buildGoldStatue() {
  const G = ['#fff0a0', '#f2c94a', '#d8a030', '#a87a1a'];
  return sprite(22, 34, (g) => {
    rect(g, 3, 26, 16, 7, SANDSTONE[3]);
    rect(g, 3, 26, 16, 1, SANDSTONE[1]);
    rect(g, 2, 32, 18, 2, SANDSTONE[4]);
    ellipse(g, 11, 21, 6, 5, G[2]);
    poly(g, [[4, 22], [1, 10], [6, 14], [8, 20]], G[3]);
    poly(g, [[18, 22], [21, 10], [16, 14], [14, 20]], G[3]);
    rect(g, 9, 9, 4, 10, G[2]);
    ellipse(g, 11, 7, 4, 3, G[1]);
    poly(g, [[8, 5], [7, 1], [9, 4]], G[3]);
    poly(g, [[14, 5], [15, 1], [13, 4]], G[3]);
    px(g, 10, 7, '#d8322a');
    px(g, 12, 7, '#d8322a');
    rect(g, 9, 9, 1, 10, G[0]);
    ellipse(g, 10, 20, 3, 3, G[1]);
    rect(g, 7, 24, 3, 2, G[1]);
    rect(g, 12, 24, 3, 2, G[1]);
  });
}

function buildDais() {
  const S = SANDSTONE;
  return sprite(34, 12, (g) => {
    ellipse(g, 17, 7, 16, 4, S[4]);
    ellipse(g, 17, 6, 16, 4, S[2]);
    ellipse(g, 17, 5, 12, 3, S[1]);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      px(g, Math.round(17 + Math.cos(a) * 13), Math.round(6 + Math.sin(a) * 3.2), '#f2c94a');
    }
  });
}

function buildGem(c, light, dark) {
  return sprite(9, 8, (g) => {
    poly(g, [[0, 3], [2, 1], [6, 1], [8, 3], [4, 7]], c);
    rect(g, 2, 2, 5, 1, light);
    poly(g, [[5, 3], [8, 3], [4, 7]], dark);
    px(g, 3, 2, '#ffffff');
  });
}

function buildGoblet() {
  return sprite(9, 12, (g) => {
    poly(g, [[0, 1], [8, 1], [7, 5], [5, 6], [3, 6], [1, 5]], '#e8b54a');
    rect(g, 1, 1, 7, 1, '#fff0a0');
    rect(g, 6, 2, 1, 3, '#a87a1a');
    rect(g, 4, 6, 1, 3, '#c8922a');
    rect(g, 2, 9, 5, 2, '#e8b54a');
    rect(g, 2, 10, 5, 1, '#a87a1a');
    px(g, 4, 3, '#d8322a');
  });
}

function buildCrown() {
  return sprite(13, 10, (g) => {
    poly(g, [[1, 9], [0, 2], [3, 5], [6, 0], [9, 5], [12, 2], [11, 9]], '#e8b54a');
    rect(g, 1, 6, 11, 3, '#f2c94a');
    rect(g, 1, 8, 11, 1, '#a87a1a');
    px(g, 6, 7, '#d8322a');
    px(g, 3, 7, '#3a7ad8');
    px(g, 9, 7, '#3ac86a');
    for (const x of [0, 6, 12]) px(g, x, x === 6 ? 0 : 2, '#fff0a0');
  });
}

// ---------- tinkering: materials, kits and the obstacles of Hawk Rock ----------

function buildPlank() {
  return sprite(15, 7, (g) => {
    rect(g, 0, 2, 14, 4, PAL.woodLight);
    rect(g, 0, 2, 14, 1, '#d9a468');
    rect(g, 0, 5, 14, 1, PAL.wood);
    px(g, 4, 3, PAL.wood);
    px(g, 10, 4, PAL.wood);
  });
}

function buildRope() {
  return sprite(14, 12, (g) => {
    ellipse(g, 7, 6, 6, 4.5, '#8a6a3a');
    ellipse(g, 7, 6, 4, 2.5, '#c8a468');
    ellipse(g, 7, 6, 2, 1, '#8a6a3a');
    for (let i = 0; i < 6; i++) px(g, 3 + i * 1.6, 3 + (i % 2), '#e2c48a');
    line(g, 12, 8, 13, 11, '#c8a468');
  });
}

function buildLadderIcon() {
  return sprite(10, 16, (g) => {
    rect(g, 1, 0, 2, 16, PAL.woodLight);
    rect(g, 7, 0, 2, 16, PAL.woodLight);
    for (let y = 2; y < 16; y += 4) rect(g, 3, y, 4, 1, PAL.wood);
    rect(g, 1, 6, 8, 1, '#c8a468');
  });
}

function buildBridgeKit() {
  return sprite(16, 12, (g) => {
    for (const y of [1, 4, 7]) {
      rect(g, 0, y, 15, 3, PAL.woodLight);
      rect(g, 0, y + 2, 15, 1, PAL.wood);
    }
    rect(g, 4, 0, 2, 11, '#c8a468');
    rect(g, 10, 0, 2, 11, '#c8a468');
  });
}

function buildCampfireKit() {
  return sprite(15, 11, (g) => {
    line(g, 2, 8, 12, 3, PAL.woodDark, 3);
    line(g, 2, 3, 12, 8, PAL.wood, 3);
    for (const [x, y] of [[1, 9], [5, 10], [10, 10], [13, 8]]) {
      ellipse(g, x, y, 2, 1.2, PAL.rock);
      px(g, x - 1, y - 1, PAL.rockLight);
    }
  });
}

function buildTentIcon() {
  return sprite(15, 12, (g) => {
    poly(g, [[0, 11], [7, 1], [7, 11]], '#c8925a');
    poly(g, [[7, 1], [14, 11], [7, 11]], '#a06a3a');
    poly(g, [[7, 4], [4, 11], [10, 11]], '#3a2414');
    line(g, 6, 0, 8, 2, PAL.woodDark);
    line(g, 8, 0, 6, 2, PAL.woodDark);
    rect(g, 0, 11, 15, 1, '#7a4e2a');
  });
}

// A hide tent seen from the front: its roof running back from the gable, the flap pinned open on the dark inside,
// the poles crossed over the ridge and pegged out at the corners.
function buildTent() {
  return sprite(38, 31, (g) => {
    const [lit, mid, shd, seam] = ['#c8925a', '#a8723f', '#8a5a32', '#6e4424'];
    poly(g, [[3, 28], [19, 11], [19, 3], [3, 20]], lit);
    poly(g, [[19, 11], [35, 28], [35, 20], [19, 3]], shd);
    // where two hides are stitched together, halfway up each side of the roof
    for (let i = 0; i <= 16; i += 2) {
      px(g, 3 + i, 24 - i, seam);
      px(g, 35 - i, 24 - i, seam);
    }
    line(g, 3, 20, 19, 3, shade(lit, 0.15));
    line(g, 19, 3, 35, 20, shade(shd, 0.1));
    poly(g, [[3, 28], [19, 11], [35, 28]], mid);
    line(g, 3, 28, 19, 11, shade(lit, 0.15));
    poly(g, [[19, 15], [13, 28], [25, 28]], '#2a1a10');
    poly(g, [[19, 15], [13, 28], [9, 28]], '#d8a46a');
    poly(g, [[19, 15], [25, 28], [29, 28]], shd);
    line(g, 19, 15, 9, 28, seam);
    line(g, 19, 15, 29, 28, seam);
    for (let i = 0; i < 4; i++) px(g, 6 + i * 2, 25 - i * 2, seam);
    line(g, 17, 8, 19, 11, PAL.woodDark);
    line(g, 21, 8, 19, 11, PAL.woodDark);
    line(g, 17, 0, 19, 3, PAL.woodDark);
    line(g, 21, 0, 19, 3, PAL.woodDark);
    line(g, 3, 20, 0, 24, '#d8c8a0');
    line(g, 35, 20, 37, 24, '#d8c8a0');
    rect(g, 0, 24, 1, 2, PAL.woodDark);
    rect(g, 37, 24, 1, 2, PAL.woodDark);
    rect(g, 3, 29, 33, 1, '#5a3a1e');
  });
}

function buildGrapple() {
  return sprite(14, 15, (g) => {
    ellipse(g, 5, 11, 4.5, 3, '#8a6a3a');
    ellipse(g, 5, 11, 2.5, 1.5, '#c8a468');
    line(g, 9, 9, 10, 4, '#c8a468');
    rect(g, 10, 1, 1, 5, METAL_D);
    line(g, 10, 4, 7, 1, '#c9ccd4');
    line(g, 10, 4, 13, 1, '#c9ccd4');
    line(g, 10, 3, 10, 0, '#c9ccd4');
  });
}

// A leaning ladder up a cliff `rise` pixels high, its feet on the ground below.
function buildLadder(rise) {
  const h = rise + 10;
  return sprite(14, h, (g) => {
    rect(g, 1, 0, 2, h, PAL.wood);
    rect(g, 11, 0, 2, h, PAL.wood);
    rect(g, 1, 0, 1, h, PAL.woodLight);
    rect(g, 11, 0, 1, h, PAL.woodLight);
    for (let y = 3; y < h - 1; y += 5) {
      rect(g, 3, y, 8, 2, PAL.woodLight);
      rect(g, 3, y + 1, 8, 1, PAL.woodDark);
    }
  });
}

// A thorny tangle; `state` is 'cut' or 'burnt' once it's been dealt with.
function buildBramble(state) {
  return sprite(22, 18, (g) => {
    if (state) {
      const stub = state === 'burnt' ? '#2a2220' : PAL.woodDark;
      ellipse(g, 11, 15, 8, 2.5, state === 'burnt' ? '#3a3230' : PAL.leafDark);
      for (const [x, h] of [[5, 4], [8, 6], [12, 5], [16, 3]]) rect(g, x, 15 - h, 1, h, stub);
      if (state === 'burnt') for (const x of [7, 13]) px(g, x, 14, '#e5481c');
      return;
    }
    ellipse(g, 11, 11, 10, 6, PAL.leafDeep);
    ellipse(g, 11, 10, 9, 5.5, PAL.leafDark);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      line(g, 11, 10, 11 + Math.cos(a) * 9, 10 + Math.sin(a) * 5.5, '#5a3a22');
    }
    for (let i = 0; i < 14; i++) {
      const x = 3 + hash(i, 7, 41) * 16;
      const y = 5 + hash(i, 8, 41) * 10;
      px(g, x, y, i % 3 ? '#d8c8a0' : PAL.leaf);
    }
    for (const [x, y] of [[6, 8], [14, 6], [16, 12], [9, 13]]) px(g, x, y, '#a8203a');
  });
}

// A great trunk lying north to south across a gap.
function buildFallenLog() {
  return sprite(16, 44, (g) => {
    rect(g, 2, 6, 12, 34, PAL.woodDark);
    rect(g, 3, 6, 10, 34, PAL.wood);
    rect(g, 3, 6, 2, 34, PAL.woodLight);
    for (let y = 10; y < 38; y += 6) px(g, 6 + (y % 4), y, PAL.woodDark);
    ellipse(g, 8, 39, 6, 3, '#d9b07a');
    ellipse(g, 8, 39, 3, 1.5, '#b58a56');
    ellipse(g, 8, 6, 6, 3, PAL.woodDark);
    rect(g, 4, 20, 3, 2, PAL.leaf);
    px(g, 11, 28, PAL.leafLight);
  });
}

function buildLooseRock() {
  return sprite(26, 22, (g) => {
    ellipse(g, 13, 13, 12, 8, PAL.rockDeep);
    ellipse(g, 12, 12, 11, 7.5, PAL.rock);
    ellipse(g, 10, 9, 6, 3.5, PAL.rockLight);
    ellipse(g, 15, 6, 6, 2, PAL.leaf);
    ellipse(g, 13, 5, 3, 1, PAL.leafLight);
    line(g, 18, 12, 21, 16, PAL.rockDark);
  });
}

// Old Bjorn's cache: a mound of stacked stones with a low dark opening at the front.
function buildStoneCache(empty) {
  return sprite(48, 34, (g) => {
    ellipse(g, 24, 24, 23, 10, PAL.rockDeep);
    ellipse(g, 24, 22, 22, 10, PAL.rockDark);
    for (let i = 0; i < 26; i++) {
      const x = 5 + hash(i, 1, 51) * 38;
      const y = 10 + hash(i, 2, 51) * 18;
      ellipse(g, x, y, 3 + hash(i, 3, 51) * 2, 2, i % 3 ? PAL.rock : PAL.rockLight);
      px(g, x - 1, y - 1, '#c6c5c9');
    }
    ellipse(g, 24, 9, 10, 4, PAL.rock);
    rect(g, 14, 4, 20, 4, PAL.rockLight);
    rect(g, 14, 4, 20, 1, '#c6c5c9');
    rect(g, 17, 21, 14, 12, PAL.rockDeep);
    rect(g, 18, 22, 12, 11, '#120c0a');
    rect(g, 16, 19, 16, 3, PAL.rockLight);
    if (!empty) {
      rect(g, 20, 27, 8, 5, PAL.woodDark);
      rect(g, 20, 27, 8, 1, PAL.woodLight);
      px(g, 24, 29, '#f2c94a');
    }
  });
}

function buildTinkerIcon() {
  return pixmap([
    '..........W.',
    '.........W..',
    '..HG....W...',
    '..HHG..W....',
    '...HHGW.....',
    '....HHG...S.',
    '.....HG..S..',
    '..LLLLLLLLL.',
    'AAAAAAAAAAA.',
    '....DAAAA...',
    '....DAAAA...',
    '..DDAAAAAAA.',
  ], { H: '#e8eef6', G: '#a4aab6', W: '#bd8148', S: '#ffd36b', L: '#c9ccd4', A: '#8a909e', D: '#5c6270' });
}

// Pale cave mushrooms with glowing caps; `picked` leaves only the stubs.
function buildGlowcaps(picked) {
  return sprite(16, 13, (g) => {
    for (const [x, h, r] of [[4, 6, 3], [9, 8, 4], [13, 4, 2]]) {
      rect(g, x - 1, 12 - (picked ? 2 : h), 2, picked ? 2 : h, '#d8e4e8');
      if (picked) continue;
      ellipse(g, x, 12 - h, r, r * 0.6, '#2fbfb0');
      ellipse(g, x, 11 - h, r - 0.5, r * 0.45, '#5affd8');
      px(g, x - 1, 11 - h, '#d8fff4');
    }
    rect(g, 1, 11, 14, 2, '#3a4456');
  });
}

function buildGlowcapIcon() {
  return sprite(11, 11, (g) => {
    rect(g, 4, 5, 3, 5, '#d8e4e8');
    ellipse(g, 5, 4, 4.5, 3, '#2fbfb0');
    ellipse(g, 5, 3, 3.5, 2, '#5affd8');
    px(g, 3, 3, '#d8fff4');
    px(g, 7, 2, '#d8fff4');
  });
}

function buildGoldNugget() {
  return sprite(11, 9, (g) => {
    poly(g, [[2, 7], [1, 4], [4, 1], [8, 2], [10, 6], [7, 8]], '#c8922a');
    poly(g, [[2, 6], [2, 4], [4, 2], [7, 3], [8, 5], [5, 6]], '#f2c94a');
    px(g, 4, 3, '#fff4b0');
    px(g, 7, 4, '#fff4b0');
  });
}

// An icy spike of rock rising from the cave floor.
function buildStalagmite(seed) {
  const r = mulberry32(seed);
  const h = 16 + Math.floor(r() * 8);
  return sprite(14, 26, (g) => {
    poly(g, [[1, 25], [5, 25 - h * 0.5], [7, 25 - h], [9, 25 - h * 0.55], [13, 25]], '#3e4a5e');
    poly(g, [[1, 25], [5, 25 - h * 0.5], [7, 25 - h], [7, 25]], '#5a6a82');
    line(g, 5, 23, 6, 26 - h * 0.8, '#9fc4dc');
    px(g, 7, 25 - h, PAL.iceLight);
    rect(g, 0, 24, 14, 2, '#2a3242');
  });
}

function buildArrowIcon() {
  return sprite(14, 14, (g) => {
    line(g, 2, 11, 10, 3, PAL.woodLight);
    poly(g, [[9, 2], [12, 1], [11, 4]], '#c9ccd4');
    px(g, 11, 2, '#e8eaf0');
    for (const [x, y] of [[1, 10], [2, 12], [3, 11], [1, 12]]) px(g, x, y, PAL.red);
  });
}

function buildFeather() {
  return sprite(11, 14, (g) => {
    poly(g, [[2, 12], [3, 6], [6, 2], [9, 1], [8, 5], [5, 10]], '#f4f1ea');
    poly(g, [[3, 6], [6, 2], [9, 1], [6, 5]], '#d6cfc2');
    line(g, 1, 13, 8, 2, '#9a8f80');
  });
}

function buildTorchIcon() {
  return sprite(9, 16, (g) => {
    rect(g, 3, 6, 3, 9, PAL.woodDark);
    rect(g, 3, 6, 1, 9, PAL.wood);
    rect(g, 2, 5, 5, 2, '#d8d0bc');
    ellipse(g, 4.5, 3, 2.5, 3, '#e5481c');
    ellipse(g, 4.5, 3.5, 1.5, 2, '#ff9a26');
    px(g, 4, 3, '#ffe066');
  });
}

// The lit torch in hand, smaller than its icon: a short stick, its wrap, and a flame that flickers between two frames.
function buildHeldTorch(f) {
  return sprite(7, 12, (g) => {
    rect(g, 3, 6, 2, 5, PAL.woodDark);
    rect(g, 3, 6, 1, 5, PAL.wood);
    rect(g, 2, 5, 4, 2, '#d8d0bc');
    ellipse(g, f ? 4.2 : 3.8, f ? 2.8 : 3.2, 1.8, f ? 2.6 : 2.2, '#e5481c');
    ellipse(g, 4, 3.6, 1, 1.4, '#ff9a26');
    px(g, f ? 4 : 3, 3, '#ffe066');
  });
}

function buildLure() {
  return sprite(10, 14, (g) => {
    line(g, 5, 0, 5, 3, '#e8e0c8');
    ellipse(g, 5, 6, 3, 3.5, '#d8a83a');
    ellipse(g, 4.5, 5.5, 1.5, 2, '#fff0a0');
    line(g, 5, 10, 5, 12, '#c9ccd4');
    line(g, 5, 12, 7, 11, '#c9ccd4');
    px(g, 8, 10, '#c9ccd4');
    px(g, 3, 8, '#c8322a');
  });
}

// The fisher's lures, all on the same line and hook as the golden one: a tuft of feathers, a silver blade, a glow bulb.
function buildLureKind(kind) {
  return sprite(10, 14, (g) => {
    line(g, 5, 0, 5, 3, '#e8e0c8');
    if (kind === 'feather') {
      poly(g, [[5, 3], [2, 10], [5, 8]], '#c8322a');
      poly(g, [[5, 3], [8, 10], [5, 8]], '#f4efe2');
      rect(g, 4, 3, 2, 3, '#5a3a22');
    } else if (kind === 'spinner') {
      ellipse(g, 5, 6, 2.5, 3.5, '#9aa4b4');
      ellipse(g, 4.5, 5.5, 1.2, 2.2, '#e8eef8');
      px(g, 6, 8, '#5a6474');
    } else {
      ellipse(g, 5, 6, 3, 3, '#1a6a6a');
      ellipse(g, 5, 6, 2, 2, '#5affd8');
      px(g, 4, 5, '#d8fff4');
    }
    line(g, 5, 10, 5, 12, '#c9ccd4');
    line(g, 5, 12, 7, 11, '#c9ccd4');
    px(g, 8, 10, '#c9ccd4');
  });
}

// A fish from the very bottom of the deep: big jaw, a row of teeth and a little lantern on a stalk.
function buildAnglerfish() {
  return sprite(17, 12, (g) => {
    poly(g, [[12, 7], [16, 4], [16, 10]], '#2a2230');
    ellipse(g, 7, 7, 6, 4, '#4a3a4e');
    ellipse(g, 7, 9, 4, 1.5, '#6a5a6a');
    for (const x of [2, 4, 6]) px(g, x, 8, '#f4efe2');
    rect(g, 1, 7, 6, 1, '#1a141e');
    line(g, 6, 3, 4, 0, '#6a5a6a');
    px(g, 3, 0, '#a8ffe8');
    px(g, 2, 1, '#5affd8');
    px(g, 4, 5, '#ffe080');
  });
}

function buildBread() {
  return sprite(14, 9, (g) => {
    ellipse(g, 7, 5, 6, 3.5, '#8a5a2a');
    ellipse(g, 7, 4, 5.5, 2.8, '#c08a4a');
    for (const x of [4, 7, 10]) line(g, x - 1, 3, x + 1, 5, '#8a5a2a');
    px(g, 5, 2, '#e8c08a');
  });
}

function buildHoneyCake() {
  return sprite(12, 10, (g) => {
    rect(g, 1, 4, 10, 5, '#c88a3a');
    rect(g, 1, 6, 10, 1, '#f4e0b0');
    ellipse(g, 6, 4, 5, 1.5, '#f2b01a');
    for (const [x, h] of [[3, 2], [6, 3], [9, 2]]) rect(g, x, 4, 1, h, '#f2b01a');
    px(g, 5, 3, '#fff0a0');
  });
}

function buildSailIcon() {
  return sprite(15, 13, (g) => {
    rect(g, 1, 1, 13, 2, PAL.woodDark);
    for (let i = 0; i < 5; i++) rect(g, 2 + i * 2.2, 3, 2.2, 8, i % 2 ? '#f4efe2' : '#3d6ca3');
    rect(g, 2, 10, 11, 1, '#2a4a7a');
    px(g, 7, 6, '#ffffff');
  });
}

function buildCoin([rim, face, shine] = ['#8f9098', '#c9ccd4', '#ffffff']) {
  return sprite(10, 10, (g) => {
    ellipse(g, 5, 5, 4, 4, rim);
    ellipse(g, 5, 5, 3, 3, face);
    rect(g, 4, 3, 2, 4, rim);
    px(g, 3, 3, shine);
  });
}

// A brown-and-white hen facing right, 14x13 with her feet at the bottom: two walking frames, pecking, flapping.
function buildHen() {
  const BODY = '#f4f0e6';
  const SHADE = '#d8cfbe';
  const frame = (step, peck, flap) => sprite(16, 14, (g) => {
    g.translate(1, 0);
    const legs = step ? [[5, 10], [8, 11]] : [[6, 11], [7, 11]];
    for (const [x, y] of legs) rect(g, x, y, 1, 13 - y, '#e8a23a');
    ellipse(g, 6, 8, 5, 3.5, SHADE);
    ellipse(g, 6, 7, 4.5, 3, BODY);
    poly(g, [[1, 5], [0, 2], [3, 5]], SHADE);
    if (flap) {
      poly(g, [[4, 6], [2, 1], [9, 5]], BODY);
      poly(g, [[5, 7], [12, 2], [9, 7]], SHADE);
    } else {
      ellipse(g, 6, 8, 2.5, 1.5, SHADE);
    }
    const hx = peck ? 11 : 10;
    const hy = peck ? 9 : 4;
    ellipse(g, hx, hy, 2, 2, BODY);
    rect(g, hx - 1, hy - 3, 2, 1, '#d8322a');
    px(g, hx, hy - 3, '#d8322a');
    px(g, hx + 2, hy, '#f0b030');
    px(g, hx + 1, hy + 1, '#d8322a');
    px(g, hx + 1, hy - 1, '#22160f');
  });
  const right = [frame(false, false, false), frame(true, false, false), frame(false, true, false), frame(true, false, true)];
  return { right, left: right.map(mirror) };
}

// ---------- wild animals ----------
// All face right with the ground point at the bottom middle; `left` is the mirror image.

const sides = (right) => ({ right, left: right.map(mirror) });

// Frames: standing, mid-step, grazing, galloping. Stags carry antlers.
function buildDeer(stag) {
  const FUR = '#a8703c';
  const DARK = '#7a4e28';
  const BELLY = '#d8b080';
  const RUMP = '#f4ead8';
  const HOOF = '#3a2414';
  const frame = (pose) => sprite(28, 26, (g) => {
    g.translate(1, 4);
    const legs = {
      stand: [[6, 13, 6, 20], [8, 13, 8, 20], [16, 13, 16, 20], [18, 13, 18, 20]],
      step: [[6, 13, 4, 20], [8, 13, 9, 20], [16, 13, 15, 20], [18, 13, 20, 20]],
      graze: [[6, 13, 6, 20], [8, 13, 8, 20], [16, 13, 17, 20], [18, 13, 19, 20]],
      run: [[6, 12, 1, 17], [8, 13, 4, 19], [16, 12, 21, 16], [18, 13, 23, 18]],
    }[pose];
    for (const [x0, y0, x1, y1] of legs) {
      line(g, x0, y0, x1, y1, DARK);
      px(g, x1, y1, HOOF);
    }
    const lift = pose === 'run' ? -1 : 0;
    ellipse(g, 12, 10 + lift, 7.5, 3.5, FUR);
    ellipse(g, 12, 12 + lift, 5.5, 1.5, BELLY);
    ellipse(g, 5, 9 + lift, 1.5, 2, RUMP);
    px(g, 3, 8 + lift, FUR);
    const [hx, hy] = pose === 'graze' ? [21, 16] : [21, 3 + lift];
    poly(g, pose === 'graze' ? [[16, 8], [19, 8], [22, 15], [19, 16]] : [[16, 9 + lift], [19, 3 + lift], [22, 4 + lift], [20, 11 + lift]], FUR);
    ellipse(g, hx, hy, 2.5, 2, FUR);
    rect(g, hx + 1, hy, 3, 2, FUR);
    px(g, hx + 4, hy, HOOF);
    px(g, hx + 1, hy - 1, '#10141c');
    poly(g, [[hx - 3, hy - 4], [hx - 1, hy - 2], [hx - 2, hy - 1]], DARK);
    if (!stag) return;
    const ax = hx - 1;
    const ay = hy - 2;
    const up = pose === 'graze' ? 1 : -1;
    line(g, ax, ay, ax - 2, ay + up * 5, BELLY);
    line(g, ax - 1, ay + up * 3, ax + 1, ay + up * 5, BELLY);
    line(g, ax - 2, ay + up * 5, ax - 4, ay + up * 6, BELLY);
  });
  return sides(['stand', 'step', 'graze', 'run'].map(frame));
}

// Frames: standing, mid-step, rooting about with the snout, charging.
function buildBoar() {
  const HIDE = '#74482e';
  const BRISTLE = '#43291b';
  const BELLY = '#946244';
  const frame = (pose) => sprite(24, 16, (g) => {
    g.translate(1, 1);
    const legs = {
      stand: [[4, 4], [7, 7], [13, 13], [15, 15]],
      step: [[3, 5], [8, 7], [12, 14], [16, 15]],
      root: [[4, 4], [7, 7], [13, 13], [15, 15]],
      run: [[2, 0], [6, 4], [14, 17], [16, 19]],
    }[pose];
    for (const [top, foot] of legs) {
      line(g, top, 10, foot, 13, BRISTLE, 2);
      rect(g, foot, 13, 2, 1, '#22160f');
    }
    ellipse(g, 10, 7, 8, 4.5, HIDE);
    ellipse(g, 10, 9.5, 6, 1.5, BELLY);
    for (let x = 4; x <= 15; x += 2) rect(g, x, 2 + (x % 4 ? 0 : 1), 1, 2, BRISTLE);
    px(g, 1, 6, HIDE);
    px(g, 2, 5, HIDE);
    const dy = pose === 'root' ? 3 : pose === 'run' ? 1 : 0;
    poly(g, [[15, 3 + dy], [20, 6 + dy], [21, 10 + dy], [15, 11]], HIDE);
    rect(g, 20, 7 + dy, 2, 3, '#b08070');
    px(g, 21, 8 + dy, '#5a2a20');
    px(g, 19, 10 + dy, '#f4ead8');
    px(g, 19, 9 + dy, '#f4ead8');
    px(g, 17, 6 + dy, '#10141c');
    poly(g, [[14, 4 + dy], [16, 1 + dy], [17, 4 + dy]], BRISTLE);
  });
  return sides(['stand', 'step', 'root', 'run'].map(frame));
}

// Frames: sitting up, mid-hop, nibbling.
function buildRabbit() {
  const FUR = '#9a8470';
  const LIGHT = '#c8b8a4';
  const EAR = '#e8a8a8';
  const frame = (pose) => sprite(14, 13, (g) => {
    g.translate(1, 1);
    if (pose === 'hop') {
      line(g, 3, 8, 0, 10, FUR);
      ellipse(g, 6, 6, 4.5, 2.5, FUR);
      ellipse(g, 6, 7.5, 3, 1, LIGHT);
      ellipse(g, 1.5, 5, 1.3, 1.3, '#ffffff');
      ellipse(g, 10, 4.5, 2, 1.8, FUR);
      line(g, 9, 3, 6, 1, FUR);
      line(g, 9, 2, 7, 0, FUR);
      px(g, 7, 1, EAR);
      px(g, 11, 4, '#10141c');
      rect(g, 10, 7, 1, 3, FUR);
      return;
    }
    const nib = pose === 'nibble';
    rect(g, 2, 10, 4, 1, FUR);
    ellipse(g, 5, 7, 4, 3, FUR);
    ellipse(g, 5, 9, 2.5, 1, LIGHT);
    ellipse(g, 1, 6, 1.3, 1.3, '#ffffff');
    const [hx, hy] = nib ? [9, 7] : [8.5, 4];
    ellipse(g, hx, hy, 2.2, 2, FUR);
    rect(g, hx - 2, hy - 6, 1, 5, FUR);
    rect(g, hx - 1, hy - 6, 1, 5, FUR);
    rect(g, hx - 1, hy - 5, 1, 3, EAR);
    px(g, hx + 1, hy - 1, '#10141c');
    px(g, hx + 2, hy, EAR);
    px(g, 8, 10, FUR);
  });
  return sides(['sit', 'hop', 'nibble'].map(frame));
}

// Frames: standing, mid-step, sitting, mid-leap. `c` is the coat: fur, light chest and tail tip, legs.
function buildFox(c) {
  const frame = (pose) => sprite(22, 15, (g) => {
    g.translate(1, 2);
    const sit = pose === 'sit';
    const run = pose === 'run';
    const legs = {
      stand: [[6, 9, 6, 12], [8, 9, 8, 12], [13, 9, 13, 12], [15, 9, 15, 12]],
      step: [[6, 9, 5, 12], [8, 9, 9, 12], [13, 9, 12, 12], [15, 9, 16, 12]],
      sit: [[13, 7, 13, 12], [14, 7, 14, 12]],
      run: [[6, 8, 2, 10], [8, 9, 5, 11], [13, 8, 17, 10], [15, 9, 19, 11]],
    }[pose];
    for (const [x0, y0, x1, y1] of legs) line(g, x0, y0, x1, y1, c.legs);
    if (sit) {
      poly(g, [[6, 12], [2, 10], [1, 12], [8, 12]], c.fur);
      px(g, 1, 11, c.light);
      px(g, 2, 11, c.light);
      ellipse(g, 9, 9, 3.5, 3, c.fur);
      poly(g, [[10, 6], [13, 2], [15, 4], [14, 10]], c.fur);
      ellipse(g, 13.5, 7, 1.5, 2, c.light);
    } else {
      poly(g, [[5, 6], [1, run ? 5 : 3], [0, run ? 7 : 6], [2, 8]], c.fur);
      px(g, 0, run ? 6 : 4, c.light);
      px(g, 1, run ? 6 : 4, c.light);
      ellipse(g, 10, 7, 5.5, 2.5, c.fur);
      ellipse(g, 14, 8, 1.5, 1.5, c.light);
    }
    const [hx, hy] = sit ? [15, 2] : [16, run ? 5 : 4];
    ellipse(g, hx, hy, 2.5, 2, c.fur);
    poly(g, [[hx, hy], [hx + 4, hy + 1], [hx, hy + 2]], c.fur);
    px(g, hx + 1, hy + 1, c.light);
    px(g, hx + 4, hy + 1, '#10141c');
    poly(g, [[hx - 2, hy - 1], [hx - 1.5, hy - 4], [hx, hy - 1]], c.fur);
    poly(g, [[hx, hy - 1], [hx + 1, hy - 4], [hx + 1.5, hy - 1]], c.fur);
    px(g, hx + 1, hy - 1, '#10141c');
  });
  return sides(['stand', 'step', 'sit', 'run'].map(frame));
}

// Frames: standing, mid-step, grazing.
function buildGoat() {
  const COAT = '#e8e2d6';
  const SHADE = '#c8c0b0';
  const HORN = '#8a7a64';
  const frame = (pose) => sprite(20, 18, (g) => {
    g.translate(1, 2);
    const legs = pose === 'step' ? [[4, 3], [6, 7], [11, 10], [13, 14]] : [[4, 4], [6, 6], [11, 11], [13, 13]];
    for (const [top, foot] of legs) {
      line(g, top, 11, foot, 14, SHADE);
      px(g, foot, 14, '#3a3030');
    }
    ellipse(g, 8, 9, 6, 3.5, COAT);
    ellipse(g, 8, 11, 4.5, 1.2, SHADE);
    px(g, 2, 6, COAT);
    px(g, 2, 5, COAT);
    const graze = pose === 'graze';
    const [hx, hy] = graze ? [16, 11] : [15, 3];
    poly(g, graze ? [[12, 7], [14, 7], [17, 11], [15, 12]] : [[12, 8], [13, 3], [16, 3], [15, 9]], COAT);
    ellipse(g, hx, hy, 2, 2, COAT);
    rect(g, hx + 1, hy, 2, 2, COAT);
    poly(g, [[hx, hy + 2], [hx + 1, hy + 5], [hx + 2, hy + 2]], SHADE);
    line(g, hx - 1, hy - 2, hx - 3, hy - 4, HORN);
    line(g, hx - 3, hy - 4, hx - 4, hy - 2, HORN);
    px(g, hx - 2, hy, SHADE);
    px(g, hx, hy - 1, '#10141c');
  });
  return sides(['stand', 'step', 'graze'].map(frame));
}

// Frames: sitting, mid-hop, croaking with the throat puffed out.
function buildFrog() {
  const GREEN = '#5aa83a';
  const LIGHT = '#a8d860';
  const DARK = '#2e6a24';
  const frame = (pose) => sprite(12, 9, (g) => {
    g.translate(1, 1);
    if (pose === 'hop') {
      line(g, 3, 5, 0, 7, DARK);
      ellipse(g, 5, 4, 4, 1.6, GREEN);
      rect(g, 3, 3, 3, 1, LIGHT);
      px(g, 7, 2, '#ffe040');
      px(g, 8, 6, DARK);
      return;
    }
    ellipse(g, 3, 5.5, 2, 1.2, DARK);
    ellipse(g, 5, 4.5, 3.5, 2.2, GREEN);
    rect(g, 3, 3, 3, 1, LIGHT);
    px(g, 6, 2, GREEN);
    px(g, 8, 2, GREEN);
    px(g, 6, 2, '#ffe040');
    px(g, 8, 2, '#ffe040');
    px(g, 7, 6, DARK);
    if (pose === 'croak') ellipse(g, 7.5, 5.5, 1.5, 1.2, '#f4f0c0');
  });
  return sides(['sit', 'hop', 'croak'].map(frame));
}

// A jungle snake facing right: two slithering frames, coiled to strike, and the strike itself.
function buildSnake() {
  const BODY = '#4f8f2c';
  const DARK = '#2a4f18';
  const BAND = '#e2c040';
  const frame = (pose) => sprite(26, 12, (g) => {
    g.translate(1, 1);
    const seg = (x, y, i) => {
      rect(g, x, y, 2, 2, BODY);
      px(g, x, y + 1, DARK);
      if (i % 3 === 1) px(g, x + 1, y, BAND);
    };
    let head;
    if (pose === 'coil') {
      ellipse(g, 7, 7, 6, 2.5, DARK);
      ellipse(g, 7, 6.5, 5, 2, BODY);
      ellipse(g, 7, 6.5, 2.5, 1, DARK);
      for (const x of [3, 7, 11]) px(g, x, 5, BAND);
      for (let i = 0; i < 4; i++) seg(11 + i * 0.7, 5 - i * 1.2, i);
      head = [13, 0];
    } else if (pose === 'strike') {
      for (let i = 0; i < 10; i++) seg(i * 2, 5 + Math.round(Math.sin(i * 0.7) * 0.6), i);
      head = [20, 4];
    } else {
      const ph = pose === 'b' ? Math.PI : 0;
      for (let i = 0; i < 8; i++) seg(i * 2, 6 + Math.round(Math.sin(i * 0.9 + ph) * 1.5), i);
      head = [16, 5 + Math.round(Math.sin(8 * 0.9 + ph) * 1.5)];
    }
    const [hx, hy] = head;
    rect(g, hx, hy, 4, 3, BODY);
    rect(g, hx, hy + 2, 4, 1, DARK);
    px(g, hx + 2, hy, '#101010');
    if (pose !== 'a' && pose !== 'b') {
      px(g, hx + 4, hy + 1, '#e0303a');
      px(g, hx + 5, hy + (pose === 'strike' ? 0 : 2), '#e0303a');
    }
  });
  return sides(['a', 'b', 'coil', 'strike'].map(frame));
}

// A javelina: a small, bristly brown desert pig with a pale collar, in the boar's frames.
function buildJavelina() {
  const HIDE = '#6e4a32';
  const BRISTLE = '#3e2a1c';
  const BELLY = '#8a6448';
  const COLLAR = '#d8c8a8';
  const frame = (pose) => sprite(19, 12, (g) => {
    g.translate(1, 1);
    const legs = {
      stand: [[3, 3], [5, 5], [10, 10], [12, 12]],
      step: [[2, 4], [6, 5], [9, 11], [13, 12]],
      root: [[3, 3], [5, 5], [10, 10], [12, 12]],
      run: [[2, 0], [5, 3], [10, 13], [12, 15]],
    }[pose];
    for (const [top, foot] of legs) {
      line(g, top, 7, foot, 9, BRISTLE);
      px(g, foot, 10, '#22160f');
    }
    ellipse(g, 7.5, 5, 6, 3.5, HIDE);
    ellipse(g, 7.5, 7, 4.5, 1, BELLY);
    for (let x = 3; x <= 11; x += 2) rect(g, x, 1 + (x % 4 === 1 ? 0 : 1), 1, 2, BRISTLE);
    px(g, 1, 4, HIDE);
    const dy = pose === 'root' ? 2 : pose === 'run' ? 1 : 0;
    poly(g, [[10, 2], [12, 2 + dy], [12, 8], [10, 8]], COLLAR);
    poly(g, [[12, 2 + dy], [15, 4 + dy], [16, 7 + dy], [12, 8]], HIDE);
    rect(g, 15, 5 + dy, 2, 2, '#9a7262');
    px(g, 16, 5 + dy, '#4a2418');
    px(g, 14, 7 + dy, '#f4ead8');
    px(g, 13, 4 + dy, '#10141c');
    poly(g, [[11, 3 + dy], [12, 0 + dy], [13, 3 + dy]], BRISTLE);
  });
  return sides(['stand', 'step', 'root', 'run'].map(frame));
}

// A desert scorpion facing right, in the snake's frames: two scuttling, tail reared to sting, and the sting.
function buildScorpion() {
  const SHELL = '#b0702e';
  const DARK = '#6e3e18';
  const LIGHT = '#dca05a';
  const TAILS = {
    a: [[4, 7], [3, 5], [3, 3], [4, 1], [6, 1]],
    b: [[4, 7], [3, 5], [3, 3], [4, 1], [6, 1]],
    coil: [[4, 7], [3, 4], [4, 1], [6, -1], [8, -1]],
    strike: [[4, 7], [5, 4], [8, 2], [11, 2], [13, 3]],
  };
  const frame = (pose) => sprite(20, 15, (g) => {
    g.translate(1, 3);
    for (let i = 0; i < 4; i++) {
      const x = 6 + i * 2;
      const kick = pose === 'b' ? (i % 2 ? 1 : -1) : pose === 'a' ? (i % 2 ? -1 : 1) : 0;
      line(g, x, 9, x - 1 + kick, 11, DARK);
    }
    ellipse(g, 9, 8.5, 4.5, 2, SHELL);
    for (const x of [6, 8, 10, 12]) px(g, x, 7, LIGHT);
    const up = pose === 'coil' || pose === 'strike' ? -2 : 0;
    line(g, 13, 9, 15, 8 + up, SHELL);
    rect(g, 15, 7 + up, 3, 1, SHELL);
    rect(g, 15, 9 + up, 2, 1, SHELL);
    px(g, 17, 9 + up, DARK);
    const tail = TAILS[pose];
    tail.forEach(([x, y], i) => {
      rect(g, x, y, 2, 2, SHELL);
      px(g, x, y + 1, DARK);
      if (i % 2) px(g, x + 1, y, LIGHT);
    });
    const [sx, sy] = tail[tail.length - 1];
    px(g, sx + 2, sy + 1, DARK);
    px(g, sx + 2, sy + 2, '#2a1a10');
    px(g, 13, 7, '#101010');
  });
  return sides(['a', 'b', 'coil', 'strike'].map(frame));
}

// Frames: standing, mid-waddle, and flat on its belly for sliding over the ice.
function buildPenguin() {
  const BACK = '#1d2230';
  const BELLY = '#f4f6fa';
  const BEAK = '#f0a030';
  const stand = (step) => sprite(12, 15, (g) => {
    g.translate(1, 0);
    rect(g, step ? 3 : 4, 13, 2, 1, BEAK);
    rect(g, step ? 7 : 6, 13, 2, 1, BEAK);
    ellipse(g, 5, 8.5, 4, 4.8, BACK);
    ellipse(g, 6.5, 9.5, 2.4, 3.6, BELLY);
    ellipse(g, 6, 3.5, 2.5, 2.4, BACK);
    px(g, 7, 3, '#ffffff');
    rect(g, 8, 4, 2, 1, BEAK);
    poly(g, step ? [[3, 6], [0, 9], [2, 10]] : [[3, 6], [1, 10], [3, 11]], BACK);
  });
  const slide = sprite(19, 9, (g) => {
    g.translate(0, 1);
    rect(g, 0, 5, 2, 1, BEAK);
    rect(g, 1, 6, 2, 1, BEAK);
    ellipse(g, 9, 4.5, 6.5, 2.6, BACK);
    ellipse(g, 9.5, 6, 5.5, 1.2, BELLY);
    poly(g, [[8, 4], [5, 1], [7, 4]], BACK);
    ellipse(g, 15, 4, 2.3, 2.2, BACK);
    px(g, 16, 3, '#ffffff');
    rect(g, 17, 4, 2, 1, BEAK);
  });
  return sides([stand(false), stand(true), slide]);
}

// ---------- night animals ----------

// Frames: snuffling along, mid-step, curled up in a ball of spines.
function buildHedgehog() {
  const SPINE = '#6a5440';
  const TIP = '#cbb89a';
  const FACE = '#c9a47a';
  const DARK = '#2e2018';
  const frame = (pose) => sprite(16, 11, (g) => {
    g.translate(1, 1);
    if (pose === 'curl') {
      ellipse(g, 7, 5, 5, 4, SPINE);
      for (let i = 0; i < 14; i++) px(g, 3 + hash(i, 1, 31) * 9, 1 + hash(i, 2, 31) * 7, TIP);
      px(g, 11, 6, FACE);
      return;
    }
    const st = pose === 'step' ? 1 : 0;
    rect(g, 3 + st, 8, 1, 1, DARK);
    rect(g, 9 - st, 8, 1, 1, DARK);
    ellipse(g, 6, 5, 5.5, 3.5, SPINE);
    for (let x = 1; x <= 10; x++) px(g, x, 2 - (x % 2) + (x < 3 || x > 9 ? 1 : 0), SPINE);
    for (let i = 0; i < 10; i++) px(g, 2 + hash(i, 1, 37) * 8, 2 + hash(i, 2, 37) * 4, TIP);
    poly(g, [[10, 4], [14, 6.5], [10, 8]], FACE);
    px(g, 14, 6, DARK);
    px(g, 11, 5, DARK);
  });
  return sides(['stand', 'step', 'curl'].map(frame));
}

// Frames: standing, mid-step, digging nose-down, running.
function buildBadger() {
  const COAT = '#8b8b90';
  const BACK = '#a6a6ac';
  const DARK = '#34343a';
  const WHITE = '#f2f2f2';
  const frame = (pose) => sprite(23, 13, (g) => {
    g.translate(1, 1);
    const feet = { stand: [3, 6, 13, 15], step: [2, 7, 14, 14], dig: [3, 6, 13, 15], run: [0, 4, 16, 19] }[pose];
    [3, 6, 13, 15].forEach((x, i) => line(g, x, 7, feet[i], 10, DARK, 2));
    ellipse(g, 9, 6, 8, 3.5, COAT);
    rect(g, 3, 3, 11, 1, BACK);
    ellipse(g, 9, 8.5, 6, 1, DARK);
    px(g, 0, 5, COAT);
    const dy = pose === 'dig' ? 3 : 0;
    poly(g, [[15, 3 + dy], [21, 6 + dy], [20, 8 + dy], [15, 9]], WHITE);
    line(g, 16, 4 + dy, 20, 7 + dy, DARK);
    px(g, 21, 7 + dy, DARK);
    px(g, 15, 3 + dy, DARK);
    if (pose === 'dig') for (const [x, y] of [[20, 11], [22, 10]]) px(g, x, y, '#7a5a3a');
  });
  return sides(['stand', 'step', 'dig', 'run'].map(frame));
}

// Frames: standing, mid-step, sitting, running, and sitting with its muzzle raised in a howl.
function buildWolf() {
  const FUR = '#7c8088';
  const LIGHT = '#c8ccd2';
  const DARK = '#474b53';
  const frame = (pose) => sprite(29, 23, (g) => {
    g.translate(1, 5);
    const sit = pose === 'sit' || pose === 'howl';
    const run = pose === 'run';
    const legs = {
      stand: [[7, 11, 7, 16], [10, 11, 10, 16], [17, 11, 17, 16], [20, 11, 20, 16]],
      step: [[7, 11, 5, 16], [10, 11, 11, 16], [17, 11, 15, 16], [20, 11, 22, 16]],
      sit: [[17, 9, 17, 16], [19, 9, 19, 16]],
      run: [[7, 10, 2, 13], [10, 11, 6, 14], [17, 10, 22, 13], [20, 11, 25, 14]],
    }[sit ? 'sit' : pose];
    for (const [x0, y0, x1, y1] of legs) line(g, x0, y0, x1, y1, DARK, 2);
    if (sit) {
      poly(g, [[8, 16], [2, 14], [1, 16], [10, 16]], FUR);
      ellipse(g, 12, 12, 5, 4, FUR);
      poly(g, [[13, 8], [17, 2], [21, 4], [20, 13]], FUR);
      ellipse(g, 18.5, 9, 1.5, 2.5, LIGHT);
    } else {
      poly(g, [[7, 8], [1, run ? 7 : 4], [0, run ? 9 : 7], [4, 10]], FUR);
      px(g, 1, run ? 8 : 5, LIGHT);
      ellipse(g, 13, 9, 7.5, 3.5, FUR);
      ellipse(g, 13, 11.5, 5, 1, LIGHT);
      rect(g, 8, 6, 9, 1, DARK);
    }
    if (pose === 'howl') {
      const [hx, hy] = [19, 1];
      ellipse(g, hx, hy, 3, 2.5, FUR);
      poly(g, [[hx, hy - 1], [hx + 3, hy - 6], [hx + 5, hy - 5], [hx + 3, hy + 1]], FUR);
      px(g, hx + 4, hy - 6, '#10141c');
      poly(g, [[hx - 3, hy], [hx - 3, hy - 4], [hx - 1, hy - 1]], FUR);
      px(g, hx, hy - 1, '#10141c');
      return;
    }
    const [hx, hy] = sit ? [19, 2] : [21, run ? 7 : 6];
    ellipse(g, hx, hy, 3, 2.5, FUR);
    poly(g, [[hx + 1, hy - 1], [hx + 6, hy + 1], [hx + 5, hy + 2], [hx + 1, hy + 2.5]], FUR);
    px(g, hx + 6, hy + 1, '#10141c');
    px(g, hx + 1, hy, '#f0d040');
    px(g, hx - 1, hy + 1.5, LIGHT);
    poly(g, [[hx - 2, hy - 1], [hx - 1.5, hy - 5], [hx, hy - 1]], FUR);
    poly(g, [[hx, hy - 1], [hx + 1, hy - 5], [hx + 1.5, hy - 1]], FUR);
  });
  return sides(['stand', 'step', 'sit', 'run', 'howl'].map(frame));
}

// Frames: perched, blinking, and two wingbeats in flight.
function buildOwl() {
  const FEATHER = '#8a6a44';
  const LIGHT = '#dccaa6';
  const DARK = '#4a3624';
  const EYE = '#f4c430';
  const BEAK = '#c8a040';
  const perched = (blink) => sprite(12, 15, (g) => {
    g.translate(1, 1);
    ellipse(g, 5, 8, 4, 5, FEATHER);
    ellipse(g, 5, 9, 2.5, 3.5, LIGHT);
    for (const [x, y] of [[4, 8], [6, 10], [4, 11]]) px(g, x, y, DARK);
    ellipse(g, 5, 3, 3.5, 3, FEATHER);
    px(g, 2, 0, DARK);
    px(g, 8, 0, DARK);
    rect(g, 3, 2, 5, 2, LIGHT);
    if (blink) rect(g, 3, 3, 5, 1, DARK);
    else for (const x of [3.5, 6.5]) { px(g, x, 2, EYE); px(g, x, 3, DARK); }
    px(g, 5, 4, BEAK);
    px(g, 4, 13, BEAK);
    px(g, 6, 13, BEAK);
  });
  const flying = (up) => sprite(22, 13, (g) => {
    g.translate(1, 1);
    const wing = up ? [[9, 5], [0, 0], [2, 4], [1, 6], [9, 8]] : [[9, 5], [0, 9], [3, 9], [2, 11], [9, 8]];
    poly(g, wing, DARK);
    poly(g, wing.map(([x, y]) => [20 - x, y]), DARK);
    ellipse(g, 10, 6, 3, 4, FEATHER);
    ellipse(g, 10, 7, 2, 2.5, LIGHT);
    ellipse(g, 12, 3, 2.5, 2.2, FEATHER);
    px(g, 13, 3, EYE);
    px(g, 14, 4, BEAK);
  });
  return sides([perched(false), perched(true), flying(true), flying(false)]);
}

// Frames: wings up, wings down.
function buildBat() {
  const WING = '#3a2e40';
  const BODY = '#5c4858';
  const frame = (up) => sprite(16, 10, (g) => {
    g.translate(1, 1);
    const wing = up ? [[6, 4], [0, 0], [2, 3], [1, 5], [6, 6]] : [[6, 4], [0, 7], [3, 6], [2, 8], [6, 6]];
    poly(g, wing, WING);
    poly(g, wing.map(([x, y]) => [13 - x, y]), WING);
    ellipse(g, 7, 4, 2, 2.5, BODY);
    px(g, 6, 1, BODY);
    px(g, 8, 1, BODY);
    px(g, 8, 3, '#ff8a8a');
  });
  return sides([frame(true), frame(false)]);
}

// A squat, vine-hung jungle tree, too tangled to chop; packed in rows they make the walls of the jungle maze.
function buildVineTree(seed) {
  return sprite(30, 40, (g) => {
    rect(g, 12, 22, 6, 17, '#5a4026');
    rect(g, 13, 22, 2, 17, '#7a5a34');
    for (const [x, y, rx, ry] of [[15, 12, 13, 9], [7, 18, 7, 6], [23, 18, 7, 6], [15, 22, 10, 5]]) ellipse(g, x, y + 1, rx, ry, PAL.jungleDark);
    for (const [x, y, rx, ry] of [[15, 12, 13, 9], [7, 18, 7, 6], [23, 18, 7, 6], [15, 22, 10, 5]]) ellipse(g, x, y, rx, ry - 1, PAL.jungle);
    ellipse(g, 11, 8, 6, 3, PAL.jungleLight);
    for (let i = 0; i < 6; i++) {
      const x = 4 + Math.floor(hash(i, seed, 71) * 22);
      const len = 5 + Math.floor(hash(i, seed, 72) * 9);
      for (let y = 20; y < 20 + len; y++) px(g, x + (y % 4 === 0 ? 1 : 0), y, '#3f8f3a');
    }
    if (seed % 3 === 0) for (const [x, y] of [[9, 14], [21, 10]]) { px(g, x, y, '#ff5a6a'); px(g, x + 1, y, '#ffd0d6'); }
  });
}

function buildMeat(cooked) {
  const [flesh, light, dark] = cooked ? ['#9a4a1e', '#d8823a', '#6a2e12'] : ['#c84a3a', '#f4c8b8', '#8a2a22'];
  return sprite(14, 11, (g) => {
    ellipse(g, 5, 5, 4.5, 3.5, flesh);
    ellipse(g, 4, 4, 2.5, 1.5, light);
    rect(g, 2, 7, 5, 1, dark);
    rect(g, 9, 5, 3, 2, '#f4ead8');
    ellipse(g, 12, 4.5, 1.2, 1.2, '#f4ead8');
    ellipse(g, 12, 7, 1.2, 1.2, '#f4ead8');
    if (cooked) for (const [x, y] of [[3, 3], [6, 5], [4, 6]]) px(g, x, y, '#fff0c0');
  });
}

function buildPickaxe() {
  return sprite(15, 15, (g) => {
    line(g, 2, 13, 10, 5, PAL.woodLight, 2);
    line(g, 3, 13, 10, 6, PAL.wood);
    line(g, 4, 2, 9, 4, '#8b8b94', 2);
    line(g, 10, 4, 13, 10, '#8b8b94', 2);
    px(g, 4, 2, '#c9ccd4');
    px(g, 13, 11, '#c9ccd4');
    rect(g, 9, 4, 2, 2, '#56565e');
  });
}

function buildString() {
  return sprite(14, 14, (g) => {
    rect(g, 2, 1, 9, 2, PAL.wood);
    rect(g, 2, 11, 9, 2, PAL.wood);
    rect(g, 2, 1, 9, 1, PAL.woodLight);
    rect(g, 3, 3, 7, 8, '#e8dcc0');
    for (let y = 4; y <= 10; y += 2) line(g, 3, y, 9, y - 1, '#b8a888');
    rect(g, 4, 3, 1, 8, '#fff8e8');
    line(g, 10, 6, 12, 9, '#e8dcc0');
    line(g, 12, 9, 11, 12, '#e8dcc0');
  });
}

function buildIron() {
  return sprite(13, 9, (g) => {
    poly(g, [[3, 1], [10, 1], [12, 7], [1, 7]], '#7a7f8c');
    rect(g, 3, 1, 7, 1, '#c9ccd4');
    rect(g, 2, 3, 9, 1, '#9aa0ac');
    rect(g, 1, 7, 12, 1, '#4a4d58');
    px(g, 5, 2, '#e8eaf0');
  });
}

// Rock colours (base, light, shade, edge, rubble) and vein colours (vein, glint, nugget) for each kind of ore.
const ORE_KINDS = {
  iron: { rock: ['#4e444a', '#6a5e64', '#5a4e54', '#84767c', '#2e282c', '#3e3a40', '#5e5860'], vein: ['#b0603a', '#e8964e', '#f4c890', '#8a4a2e'] },
  gold: { rock: ['#3a4252', '#525c70', '#454e60', '#6e7a90', '#232a36', '#323a48', '#4a5468'], vein: ['#c8922a', '#f2c94a', '#fff0a0', '#a87a1a'] },
};

// A lump of rock shot through with veins of ore.
function buildOre(spent, kind = 'iron') {
  const [base, light, mid, top, edge, rubble, rubbleLight] = ORE_KINDS[kind].rock;
  const [vein, glint, nugget, dull] = ORE_KINDS[kind].vein;
  return sprite(24, 16, (g) => {
    if (spent) {
      for (const [x, y, r] of [[6, 12, 3], [12, 13, 4], [18, 12, 3], [9, 10, 2], [15, 10, 2]]) ellipse(g, x, y, r, r * 0.6, rubble);
      for (const [x, y] of [[6, 11], [12, 12], [17, 11]]) px(g, x, y, rubbleLight);
      px(g, 10, 13, dull);
      return;
    }
    ellipse(g, 12, 9.5, 10.5, 6, base);
    ellipse(g, 10, 7.5, 7.5, 4.5, light);
    ellipse(g, 15, 10, 6, 3.5, mid);
    rect(g, 6, 3, 6, 1, top);
    rect(g, 3, 14, 18, 1, edge);
    line(g, 4, 10, 9, 5, vein, 2);
    line(g, 9, 5, 13, 8, vein, 2);
    line(g, 12, 12, 19, 8, vein, 2);
    for (const [x, y] of [[5, 9], [10, 5], [13, 7], [16, 9], [18, 8], [13, 11]]) px(g, x, y, glint);
    for (const [x, y] of [[7, 7], [12, 6], [15, 10]]) rect(g, x, y, 2, 2, nugget);
    for (const [x, y] of [[7, 7], [12, 6], [17, 9]]) px(g, x, y, '#ffffff');
  });
}

const DOG = { fur: '#c8955a', dark: '#9a6a3a', light: '#ecd2a4', ear: '#7a4a28', nose: '#22160f' };

// Facing right: two trotting frames, then two sitting frames with the tail swishing.
function buildDog() {
  const head = (g, x, y) => {
    rect(g, x, y, 5, 5, DOG.fur);
    rect(g, x + 4, y + 2, 3, 3, DOG.light);
    px(g, x + 6, y + 2, DOG.nose);
    px(g, x + 2, y + 1, DOG.nose);
    rect(g, x, y, 2, 4, DOG.ear);
    rect(g, x, y + 5, 3, 1, PAL.red);
  };
  const walk = (f) => sprite(18, 13, (g) => {
    line(g, f ? 1 : 2, f ? 4 : 2, 4, 5, DOG.fur);
    rect(g, f ? 7 : 6, 9, 1, 2, DOG.dark);
    rect(g, f ? 10 : 12, 9, 1, 2, DOG.dark);
    rect(g, 4, 5, 9, 4, DOG.fur);
    rect(g, 5, 8, 7, 1, DOG.light);
    rect(g, f ? 4 : 5, 9, 2, 3, DOG.fur);
    rect(g, f ? 12 : 11, 9, 2, 3, DOG.fur);
    head(g, 11, 1);
  });
  const sit = (f) => sprite(18, 13, (g) => {
    line(g, 1, f ? 12 : 9, 4, 11, DOG.fur);
    ellipse(g, 7, 9.5, 3.5, 2.5, DOG.fur);
    rect(g, 9, 5, 4, 6, DOG.fur);
    rect(g, 10, 6, 2, 4, DOG.light);
    rect(g, 4, 11, 4, 1, DOG.dark);
    rect(g, 11, 9, 2, 3, DOG.fur);
    head(g, 10, 0);
  });
  const right = [walk(0), walk(1), sit(0), sit(1)];
  return { right, left: right.map(mirror) };
}

// Front view, paws dangling, for carrying overhead.
function buildDogHeld() {
  return sprite(12, 13, (g) => {
    rect(g, 1, 1, 2, 5, DOG.ear);
    rect(g, 9, 1, 2, 5, DOG.ear);
    rect(g, 3, 0, 6, 6, DOG.fur);
    rect(g, 4, 3, 4, 3, DOG.light);
    rect(g, 5, 3, 2, 1, DOG.nose);
    px(g, 4, 2, DOG.nose);
    px(g, 7, 2, DOG.nose);
    rect(g, 3, 6, 6, 1, PAL.red);
    rect(g, 3, 7, 6, 4, DOG.fur);
    rect(g, 5, 7, 2, 3, DOG.light);
    rect(g, 3, 11, 2, 2, DOG.fur);
    rect(g, 7, 11, 2, 2, DOG.fur);
  });
}

// Upright versions of the tools for swinging; the grip sits 2px above the bottom.
function buildHeldPickaxe() {
  const c = sprite(14, 15, (g) => {
    rect(g, 6, 3, 2, 11, PAL.woodLight);
    rect(g, 7, 3, 1, 11, PAL.wood);
    line(g, 1, 4, 4, 1, '#8b8b94', 2);
    rect(g, 4, 1, 6, 2, '#8b8b94');
    line(g, 10, 1, 13, 4, '#8b8b94', 2);
    px(g, 1, 5, '#c9ccd4');
    px(g, 13, 5, '#c9ccd4');
    rect(g, 6, 1, 2, 3, '#56565e');
  });
  c.hx = 7;
  return c;
}

// Swung toward or away from the camera the axe head is seen edge-on, its edge in line with the handle.
function buildAxeFront() {
  return sprite(8, 15, (g) => {
    rect(g, 3, 4, 2, 10, PAL.woodLight);
    rect(g, 4, 4, 1, 10, PAL.wood);
    rect(g, 2, 2, 4, 3, '#8b8b94');
    rect(g, 5, 2, 1, 3, '#56565e');
    rect(g, 2, 4, 4, 1, '#56565e');
    rect(g, 3, 0, 2, 2, '#c9ccd4');
    px(g, 3, 0, '#e8eaf0');
  });
}

function buildHeldSword() {
  return sprite(8, 16, (g) => {
    rect(g, 3, 1, 2, 10, '#c9ccd4');
    rect(g, 4, 1, 1, 10, '#8b8b94');
    px(g, 3, 0, '#e8eaf0');
    rect(g, 1, 11, 6, 1, '#c89a3a');
    rect(g, 3, 12, 2, 2, PAL.woodDark);
    rect(g, 3, 14, 2, 1, '#c89a3a');
  });
}

function buildHeldSpear() {
  return sprite(8, 22, (g) => {
    rect(g, 3, 5, 2, 16, PAL.woodLight);
    rect(g, 4, 5, 1, 16, PAL.wood);
    rect(g, 3, 0, 2, 1, '#e8eaf0');
    rect(g, 2, 1, 4, 3, '#c9ccd4');
    rect(g, 4, 1, 2, 3, '#8b8b94');
    rect(g, 3, 4, 2, 1, '#56565e');
  });
}

function buildTarget() {
  return sprite(22, 30, (g) => {
    line(g, 6, 28, 9, 14, PAL.woodDark, 2);
    line(g, 16, 28, 13, 14, PAL.woodDark, 2);
    ellipse(g, 11, 12, 9, 9, PAL.cream);
    ellipse(g, 11, 12, 7, 7, PAL.red);
    ellipse(g, 11, 12, 5, 5, PAL.cream);
    ellipse(g, 11, 12, 3, 3, PAL.red);
    ellipse(g, 11, 12, 1, 1, PAL.gold);
  });
}

function buildPillar() {
  return sprite(30, 71, (g) => {
    g.translate(0, 1);
    rect(g, 9, 22, 12, 46, PAL.wood);
    rect(g, 9, 22, 2, 46, PAL.woodLight);
    rect(g, 18, 22, 3, 46, PAL.woodDark);
    for (const y of [32, 46, 58]) {
      rect(g, 8, y, 14, 3, PAL.trim);
      rect(g, 8, y, 14, 1, PAL.trimLight);
    }
    rect(g, 6, 65, 18, 4, PAL.rockDark);
    rect(g, 6, 65, 18, 1, PAL.rock);
    poly(g, [[9, 26], [21, 26], [22, 12], [13, 8]], PAL.trim);
    poly(g, [[12, 6], [22, 3], [28, 8], [28, 12], [22, 11], [20, 15], [13, 13]], PAL.trim);
    line(g, 19, 13, 21, 25, PAL.trimDark, 2);
    line(g, 13, 6, 7, 2, PAL.trimDark, 2);
    line(g, 16, 5, 12, 1, PAL.trimDark, 2);
    rect(g, 22, 10, 6, 1, PAL.trimDark);
    px(g, 23, 11, '#ffffff');
    px(g, 26, 11, '#ffffff');
    rect(g, 20, 5, 2, 2, '#c62b2b');
    rect(g, 14, 8, 6, 1, PAL.trimLight);
  });
}

function buildBannerFrames(color) {
  const dark = shade(color, -0.3);
  return [0, 1, 0, -1].map((sway) => sprite(14, 46, (g) => {
    rect(g, 6, 3, 2, 42, PAL.woodDark);
    rect(g, 6, 1, 2, 2, PAL.gold);
    for (let y = 7; y <= 38; y++) {
      const off = Math.round((sway * (y - 7)) / 31);
      if (y <= 33) {
        rect(g, 2 + off, y, 10, 1, color);
        px(g, 11 + off, y, dark);
      } else {
        const k = y - 34;
        rect(g, 2 + off, y, 5 - k, 1, color);
        rect(g, 7 + k + off, y, 5 - k, 1, color);
      }
      const gy = y - 15;
      if (gy >= 0 && gy < EMBLEM.length) {
        const row = EMBLEM[gy];
        for (let i = 0; i < row.length; i++) if (row[i] === '#') px(g, 3 + i + off, y, PAL.gold);
      }
    }
    rect(g, 1, 5, 12, 2, PAL.wood);
    rect(g, 1, 5, 12, 1, PAL.woodLight);
  }));
}

function buildTorchFrames() {
  const base = sprite(10, 28, (g) => {
    rect(g, 4, 11, 2, 16, PAL.woodDark);
    rect(g, 2, 8, 6, 3, PAL.rockDark);
    rect(g, 3, 11, 4, 1, PAL.rockDeep);
  });
  return [0, 1, 2, 3].map((f) => {
    const c = makeCanvas(10, 28);
    const g = c.getContext('2d');
    g.drawImage(base, 0, 0);
    const fl = [0, 1, -1, 1][f];
    ellipse(g, 5, 5, 3, 3 + (f % 2), '#e5481c');
    ellipse(g, 5 + fl * 0.5, 6, 2, 2, '#ff9a26');
    rect(g, 4, 6, 2, 2, '#ffe066');
    px(g, 5 + fl, 1 + (f % 2), '#ff9a26');
    return c;
  });
}

function buildBonfireFrames() {
  const ring = (front) => sprite(36, 29, (g) => {
    g.translate(1, 0);
    if (!front) {
      line(g, 9, 22, 25, 16, PAL.woodDark, 3);
      line(g, 9, 16, 25, 22, PAL.wood, 3);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const s = Math.sin(a);
      if ((s > 0.05) !== front) continue;
      const x = 17 + Math.cos(a) * 13;
      const y = 19 + s * 6;
      ellipse(g, x, y, 3, 2, i % 3 ? PAL.rock : PAL.rockDark);
      px(g, x - 1, y - 1, PAL.rockLight);
    }
  });
  const back = ring(false);
  const front = ring(true);
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const c = makeCanvas(36, 29);
    const g = c.getContext('2d');
    g.drawImage(back, 0, 0);
    const layers = [['#e5481c', 1, 0], ['#ff9a26', 0.7, 1], ['#ffe066', 0.4, 2]];
    for (const [color, scale, ls] of layers) {
      for (let i = 0; i < 5; i++) {
        const x = 11 + i * 3.5;
        const hgt = (8 + Math.round(hash(i, f, 41 + ls) * 9) + (i === 2 ? 5 : 0)) * scale;
        const lean = (hash(i, f, 51) - 0.5) * 4;
        const bw = 3.5 * (0.6 + scale * 0.4);
        poly(g, [[x - bw, 21], [x + bw, 21], [x + lean, 21 - hgt]], color);
      }
    }
    g.drawImage(front, 0, 0);
    frames.push(c);
  }
  return frames;
}

// The grown dragon standing on the ground side on, wings folded and head up, facing right: breathing in
// and out, then the same blinking, then two strides of a walk. 84x52, with the ground point at (42, PERCH_Y).
// With `saddle` it wears its saddle.
const PERCH_Y = 46;
function buildDragonFrames(pal, saddle) {
  const a = DRAGON_AGES[DRAGON_AGES.length - 1];
  const draw = (breath, blink, step = 0) => sprite(84, 52, (g) => drawDragon(g, pal, { ...a, chub: a.chub * (1 + breath * 0.06) }, 'right', -1, true, 42, PERCH_Y - (step < 0 ? 1 : 0), { saddle, blink, step }));
  return [draw(0, false), draw(1, false), draw(0, true), draw(1, true), draw(0, false, 1), draw(0, false, -1)];
}

// Where the rider sits on the flying dragon's back in each view, from the middle of its body.
const DRAGON_SEATS = { down: [0, -2], up: [0, -2], right: [1, -4], se: [-1, -3], ne: [-1, -4] };
// Views whose head comes round in front of the rider, and so goes on a separate `over` layer.
const DRAGON_FRONTS = new Set(['down', 'se']);

// The grown dragon in the air, 72x60 with the ground point at (36, 40), in all eight facings and four wing
// beats. Each frame has an `under` layer, an `over` layer (or null) drawn on top of the rider, and a seat.
// `mouth` gives where its mouth is in each facing. With `saddle` it wears its saddle.
function buildFlyingDragon(pal, saddle) {
  const a = DRAGON_AGES[DRAGON_AGES.length - 1];
  const set = {};
  for (const view of DRAGON_VIEWS) {
    set[view] = DRAGON_FLAP.tip.map((_, f) => {
      const over = DRAGON_FRONTS.has(view) ? makeCanvas(72, 60) : null;
      const under = sprite(72, 60, (g) => drawDragon(g, pal, a, view, f, false, 36, 40, { saddle, over: over && over.getContext('2d') }));
      const [sx, sy] = DRAGON_SEATS[view];
      return { under, over: over && outline(over), seat: [36 + sx, 29 + sy] };
    });
  }
  for (const [from, to] of DRAGON_MIRRORS) {
    set[to] = set[from].map((fr) => ({ under: mirror(fr.under), over: fr.over && mirror(fr.over), seat: [72 - fr.seat[0], fr.seat[1]] }));
  }
  set.mouth = dragonMouths(pal, a, false);
  return set;
}

// Every sprite for one kind of dragon: its egg, the young one at each age, and the grown one sitting and flying,
// with and without a saddle. Kinds bred at the roost are added this way while the game runs.
function buildSpecies(id, pal) {
  const right = buildDragonFrames(pal, false);
  const saddled = buildDragonFrames(pal, true);
  const sets = { right, saddled, left: right.map(mirror), saddledLeft: saddled.map(mirror) };
  const blink = (t, o) => (o.walking ? 4 + (Math.floor(t * 5) % 2) : ((t + o.phase) % 3.7 < 0.18 ? 2 : 0) + (Math.floor(t * 1.4) % 2));
  def(`dragon_${id}`, {
    frames: sets.left,
    oy: PERCH_Y,
    foot: { w: 46, h: 12 },
    shadow: { rx: 26, ry: 4 },
    pick: (t, o) => sets[o.saddled ? (o.faceRight ? 'saddled' : 'saddledLeft') : o.faceRight ? 'right' : 'left'][blink(t, o)],
  });
  const egg = buildDragonEgg(pal.egg);
  const cracked = [1, 2, 3].map((n) => buildDragonEgg(pal.egg, n));
  def(`egg_${id}`, {
    img: egg,
    pick: (t, o) => (o.crack ? cracked[o.crack - 1] : egg),
    foot: { w: 14, h: 4 },
    shadow: { rx: 10, ry: 3 },
    light: { dx: 0, dy: -10, r: 22, color: pal.egg.glow },
  });
  SPR.flyDragon[id] = buildFlyingDragon(pal, false);
  SPR.flyDragonSaddled[id] = buildFlyingDragon(pal, true);
  SPR.heldEgg[id] = buildHeldEgg(pal.egg);
  SPR.babyDragon[id] = DRAGON_SCALES.map((_, stage) => buildBabyDragon(pal, stage));
}

function buildCloud(seed) {
  return sprite(96, 40, (g) => {
    const r = mulberry32(seed);
    const puffs = Array.from({ length: 5 }, (_, i) => [14 + i * 14 + r() * 6, 22 - r() * 8, 9 + r() * 7]);
    for (const [x, y, s] of puffs) ellipse(g, x, y + 3, s, s * 0.7, '#c9dcf0');
    for (const [x, y, s] of puffs) ellipse(g, x, y, s, s * 0.7, '#ffffff');
  }, false);
}

// Bow-on (down) and stern-on (up) views of the longship, 64x94, waterline at y=86.
function buildShipVertical(down) {
  return sprite(64, 94, (g) => {
    const hull = down
      ? [[32, 32], [43, 37], [49, 50], [48, 68], [41, 81], [32, 89], [23, 81], [16, 68], [15, 50], [21, 37]]
      : [[32, 30], [41, 38], [48, 52], [49, 70], [43, 83], [32, 88], [21, 83], [15, 70], [16, 52], [23, 38]];
    poly(g, hull, PAL.woodDark);
    const deck = hull.map(([x, y]) => [32 + (x - 32) * 0.8, 60 + (y - 60) * 0.88]);
    poly(g, deck, PAL.wood);
    g.save();
    g.beginPath();
    deck.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.clip();
    for (let x = 21; x < 44; x += 4) rect(g, x, 30, 1, 60, PAL.woodDark);
    g.restore();
    const cols = [[PAL.red, PAL.cream], [PAL.cream, PAL.blue]];
    for (let i = 0; i < 4; i++) {
      drawShield(g, 16, 48 + i * 8, 3, ...cols[i % 2]);
      drawShield(g, 48, 48 + i * 8, 3, ...cols[(i + 1) % 2]);
    }

    if (down) {
      line(g, 32, 34, 32, 22, PAL.woodDark, 4);
      ellipse(g, 32, 20, 3, 3, PAL.woodDark);
      px(g, 32, 20, PAL.trim);
    } else {
      line(g, 32, 34, 32, 9, PAL.woodDark, 4);
      ellipse(g, 32, 6, 4, 3, PAL.trim);
      px(g, 30, 5, '#c62b2b');
      px(g, 34, 5, '#c62b2b');
    }

    rect(g, 30, 8, 4, 54, PAL.woodDark);
    for (let y = 14; y < 48; y++) {
      const t = (y - 14) / 34;
      const bulge = Math.sin(t * Math.PI) * 2 * (down ? 1 : -1);
      const xl = 6 - bulge;
      const xr = 58 + bulge;
      const sw = (xr - xl) / 7;
      for (let i = 0; i < 7; i++) {
        const a = Math.round(xl + i * sw);
        const b = Math.round(xl + (i + 1) * sw);
        let c = i % 2 ? PAL.red : PAL.cream;
        if (!down) c = shade(c, -0.18);
        rect(g, a, y, b - a, 1, c);
      }
    }
    rect(g, 4, 11, 56, 3, PAL.woodDark);
    rect(g, 4, 11, 56, 1, PAL.wood);
    if (down) {
      ellipse(g, 32, 31, 9, 9, PAL.cream);
      glyph(g, EMBLEM, 25, 26, PAL.red, 2);
    }
    line(g, 5, 14, 16, 50, '#3a2a1c');
    line(g, 59, 14, 48, 50, '#3a2a1c');

    if (down) {
      line(g, 32, 88, 32, 77, PAL.woodDark, 4);
      ellipse(g, 32, 74, 4, 3, PAL.trim);
      rect(g, 30, 77, 5, 2, PAL.trim);
      px(g, 30, 73, '#c62b2b');
      px(g, 34, 73, '#c62b2b');
    } else {
      line(g, 32, 87, 32, 79, PAL.woodDark, 4);
      ellipse(g, 32, 77, 3, 3, PAL.woodDark);
      px(g, 32, 77, PAL.trim);
    }
  });
}

// Three-quarter views of the longship heading up-right (NE) or down-right (SE), 104x100.
// Ship-local u runs stern->bow, v across toward the viewer, z up; (cx, cy) is mid-deck.
function buildShipDiagonal(down) {
  return sprite(104, 100, (g) => {
    const cx = 52;
    const cy = 64;
    const K = 0.6;
    const f = down ? [0.71, 0.71] : [0.71, -0.71];
    const n = down ? [-0.71, 0.71] : [0.71, 0.71];
    const P = (u, v, z = 0) => [cx + u * f[0] + v * n[0], cy + (u * f[1] + v * n[1]) * K - z];
    const L = 44;
    const N = 22;
    const us = Array.from({ length: N + 1 }, (_, i) => -L + (2 * L * i) / N);
    const w = (u) => 14 * Math.pow(Math.max(0, 1 - (u / L) ** 2), 0.6);
    const depth = (u) => 19 * Math.pow(Math.max(0, 1 - (u / L) ** 2), 0.7);
    const near = us.map((u) => P(u, w(u)));
    const keel = us.map((u) => P(u * 0.9, w(u) * 0.75, -depth(u)));
    const polyline = (pts, c, t = 1) => pts.slice(1).forEach((p, i) => line(g, ...pts[i], ...p, c, t));

    const stays = () => {
      line(g, ...P(0, 0, 58), ...P(L - 2, 0, 2), '#3a2a1c');
      line(g, ...P(0, 0, 58), ...P(-L + 2, 0, 2), '#3a2a1c');
    };
    const bow = () => {
      const [x0, y0] = P(L, 0, 0);
      const [x1, y1] = P(L + 4, 0, 14);
      const [x2, y2] = P(L + 2, 0, 24);
      line(g, x0, y0, x1, y1, PAL.woodDark, 4);
      line(g, x1, y1, x2, y2, PAL.woodDark, 4);
      ellipse(g, x2 + 1, y2 - 3, 4, 3, PAL.trim);
      rect(g, x2 + 3, y2 - (down ? 1 : 4), 5, 2, PAL.trim);
      px(g, x2 + 1, y2 - 4, '#c62b2b');
    };
    const stern = () => {
      const [x0, y0] = P(-L, 0, 0);
      const [x1, y1] = P(-L - 4, 0, 14);
      line(g, x0, y0, x1, y1, PAL.woodDark, 4);
      ellipse(g, x1 - 1, y1 - 3, 3, 3, PAL.woodDark);
      px(g, x1 - 1, y1 - 3, PAL.trim);
    };
    // whichever end is farther from the viewer goes behind the sail
    stays();
    if (down) stern();
    else bow();

    poly(g, [...us.map((u) => P(u, w(u))), ...us.slice().reverse().map((u) => P(u, -w(u)))], PAL.woodDark);
    const deck = [...us.map((u) => P(u * 0.9, w(u) * 0.8, -3)), ...us.slice().reverse().map((u) => P(u * 0.9, -w(u) * 0.8, -3))];
    poly(g, deck, PAL.wood);
    g.save();
    g.beginPath();
    deck.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.clip();
    for (let v = -10; v <= 10; v += 4) line(g, ...P(-L, v, -3), ...P(L, v, -3), PAL.woodDark);
    g.restore();

    poly(g, [...near, ...keel.slice().reverse()], PAL.wood);
    for (const t of [0.3, 0.55, 0.8]) polyline(near.map(([x, y], i) => [x + (keel[i][0] - x) * t, y + (keel[i][1] - y) * t]).slice(2, -2), PAL.woodDark);
    polyline(near, PAL.woodLight, 2);
    const cols = [[PAL.red, PAL.cream], [PAL.cream, PAL.blue], [PAL.blue, PAL.cream]];
    for (let i = 0; i < 6; i++) {
      const u = -26 + i * 10.4;
      const [x, y] = P(u, w(u) + 1, -6);
      drawShield(g, Math.round(x), Math.round(y), 4, ...cols[i % 3]);
    }

    const [mx, my] = P(0, 0, -3);
    rect(g, mx - 2, my - 61, 4, 61, PAL.woodDark);
    const hw = 24;
    const sl = down ? -0.3 : 0.3;
    const top = my - 52;
    for (let x = -hw; x <= hw; x++) {
      const t = (x + hw) / (2 * hw);
      const y0 = Math.round(top + x * sl);
      const y1 = y0 + 38 + Math.round(Math.sin(t * Math.PI) * 3);
      let c = Math.min(6, Math.floor(t * 7)) % 2 ? PAL.red : PAL.cream;
      if (!down) c = shade(c, -0.18);
      rect(g, mx + x, y0, 1, y1 - y0 - 4, c);
      rect(g, mx + x, y1 - 4, 1, 4, shade(c, -0.15));
    }
    line(g, mx - hw - 3, top - 2 - (hw + 3) * sl, mx + hw + 3, top - 2 + (hw + 3) * sl, PAL.woodDark, 3);
    line(g, mx - hw - 3, top - 3 - (hw + 3) * sl, mx + hw + 3, top - 3 + (hw + 3) * sl, PAL.wood);
    if (down) {
      ellipse(g, mx, top + 18, 10, 10, PAL.cream);
      glyph(g, EMBLEM, mx - 7, top + 13, PAL.red, 2);
    }

    if (down) bow();
    else stern();
  });
}

function buildShip() {
  return sprite(104, 94, (g) => {
    rect(g, 50, 4, 4, 60, PAL.woodDark);
    line(g, 52, 5, 95, 61, '#3a2a1c');
    line(g, 52, 5, 9, 61, '#3a2a1c');
    // Sail across the keel, seen nearly edge-on: s runs along the yard from its near (low, sternward) end.
    const yard = (s) => [45 + s * 14, 12 - s * 5];
    const H = 43;
    const belly = (s, t) => Math.sin(t * Math.PI) * (3 + Math.sin(s * Math.PI)) + t * 1.5;
    for (let s = 1; s >= 0; s -= 1 / 64) {
      let c = Math.min(4, Math.floor(s * 5)) % 2 ? PAL.red : PAL.cream;
      if (s > 0.72) c = shade(c, -0.25);
      const [x, y] = yard(s);
      for (let t = 0; t <= 1; t += 1 / 128) {
        px(g, Math.round(x + belly(s, t)), Math.round(y + 1 + t * H), t > 0.88 ? shade(c, -0.15) : c);
      }
    }
    line(g, 47, 56, 41, 61, '#3a2a1c');
    line(g, 60, 51, 70, 61, '#3a2a1c');
    line(g, 43, 13, 61, 6, PAL.woodDark, 3);
    line(g, 43, 12, 61, 5, PAL.wood);
    poly(g, [[6, 62], [98, 62], [92, 76], [80, 84], [24, 84], [12, 76]], PAL.wood);
    for (const [y, a, b] of [[67, 8, 96], [72, 10, 94], [77, 15, 89], [81, 21, 83]]) rect(g, a, y, b - a, 1, PAL.woodDark);
    rect(g, 6, 61, 92, 2, PAL.woodLight);
    const cols = [[PAL.red, PAL.cream], [PAL.cream, PAL.blue], [PAL.blue, PAL.cream]];
    for (let i = 0; i < 8; i++) drawShield(g, 17 + i * 10, 66, 4, ...cols[i % 3]);
    line(g, 95, 64, 98, 50, PAL.woodDark, 4);
    line(g, 98, 50, 96, 40, PAL.woodDark, 4);
    ellipse(g, 97, 37, 4, 3, PAL.trim);
    rect(g, 98, 39, 4, 2, PAL.trim);
    px(g, 97, 36, '#c62b2b');
    line(g, 8, 64, 4, 50, PAL.woodDark, 4);
    ellipse(g, 6, 47, 3, 3, PAL.woodDark);
    px(g, 6, 47, PAL.trim);
  });
}

// ---------- characters ----------

const PLAYER_LOOKS = {
  male: { id: 'male', hair: '#6b3e1e', hairStyle: 'short', tunic: '#3e6c99', pants: '#55402c', collar: '#c9ae84' },
  female: { id: 'female', hair: '#b5541f', hairStyle: 'braids', tunic: '#7a4a8c', pants: '#55402c', collar: '#c9ae84' },
};

const LOOKS = {
  chief: { id: 'chief', hair: '#e9e5dc', hairStyle: 'short', beard: '#e9e5dc', tunic: '#7a4f2e', collar: '#d0b48a' },
  smith: { id: 'smith', hair: '#d8a13c', hairStyle: 'bald', beard: '#d8a13c', tunic: '#5c4636', pants: '#3a2c22' },
  baker: { id: 'baker', hair: '#b8452a', hairStyle: 'long', tunic: '#3f7a4a', apron: '#f4efe4', kerchief: '#f4efe4' },
  weaver: { id: 'weaver', hair: '#a59c92', hairStyle: 'braids', tunic: '#3d7d78', kerchief: '#d8a83a' },
  seamstress: { id: 'seamstress', hair: '#2b1a12', hairStyle: 'long', tunic: '#b04a6e', collar: '#f0d6a0' },
  tanner: { id: 'tanner', hair: '#4a2c18', hairStyle: 'short', beard: '#4a2c18', tunic: '#6e6a3a', pants: '#3a2c22', apron: '#8a5530' },
  carpenter: { id: 'carpenter', hair: '#c46a2a', hairStyle: 'short', beard: '#c46a2a', tunic: '#4f6a8a', pants: '#3a2c22', apron: '#c49a62' },
  kid: { id: 'kid', hair: '#5a3418', hairStyle: 'short', tunic: '#8a7550' },
  girl: { id: 'girl', hair: '#f2d064', hairStyle: 'long', tunic: '#3c6ca3', pants: '#3d4f6e' },
  archer: { id: 'archer', hair: '#3d2414', hairStyle: 'short', tunic: '#55703c' },
  guard: { id: 'guard', hair: '#8a5a2e', hairStyle: 'helmet', beard: '#8a5a2e', tunic: '#6b4a2e', collar: '#c9ae84' },
  villager: { id: 'villager', hair: '#2e1e12', hairStyle: 'short', tunic: '#8f3b2e' },
  fisher: { id: 'fisher', hair: '#8a7b6a', hairStyle: 'short', beard: '#8a7b6a', tunic: '#3b5c6c' },
  hermit: { id: 'hermit', hair: '#b9b4ab', hairStyle: 'long', beard: '#b9b4ab', tunic: '#5b5a3a', collar: '#8a7a5a' },
  mom: { id: 'mom', hair: '#7a4320', hairStyle: 'long', tunic: '#7b5a8f', apron: '#e9dcc0', collar: '#c9ae84' },
  merchant: { id: 'merchant', hair: '#1e1410', hairStyle: 'short', beard: '#1e1410', tunic: '#2f7d5a', pants: '#3a2c22', collar: '#e8c860' },
};

const EYE = '#2a1a10';
const METAL = '#8f9098';
const METAL_D = '#66676e';
const BONE = '#efe3c4';
const PACK = '#8a5530';
const PACK_D = '#5a3418';
const PACK_ROLL = '#c9ae84';

function drawBraid(g, x, y, len, hair, w = 1) {
  rect(g, x, y, w, len, hair);
  for (let i = 1; i < len; i += 2) px(g, x, y + i, shade(hair, -0.3));
  rect(g, x, y + len, w, 1, PAL.gold);
}

// `carry` raises both arms overhead with the hands at row 1, to hold something above the head.
// `run` swaps in running frames: 1 and 3 are long strides, 0 and 2 are airborne between them.
// A `coat` (see OUTFITS) goes on over the tunic: its colours, a trim at the collar and hem, and maybe scales.
// `climb` leaves the arms off the back view: drawClimbArms puts them in, reaching overhead.
function drawCharacter(g, look, dir, frame, carry = false, run = false, climb = false) {
  const sk = look.skin || PAL.skin;
  const hair = look.hair;
  const coat = look.coat;
  const tun = coat ? coat.body : look.tunic;
  const tunD = coat ? coat.dark : shade(tun, -0.25);
  const collar = coat ? coat.trim : look.collar;
  const pants = look.pants || '#4b3a2a';
  const boots = '#33241a';
  const belt = '#5a3a1e';
  const stride = frame === 1 || frame === 3;
  const walking = !run && stride;
  const b = run ? (stride || carry ? 0 : -1) : walking ? 1 : 0;
  const style = look.hairStyle;

  if (dir === 'down' || dir === 'up') {
    if (run && stride) {
      // one knee lifted high (foreshortened), the other foot planted wide
      const [up, down, out] = frame === 1 ? [5, 9, 1] : [9, 5, -1];
      rect(g, up, 16, 2, 1, pants);
      rect(g, up - out, 17, 3, 1, boots);
      rect(g, down, 16, 2, 2, pants);
      rect(g, down + out, 18, 2, 2, boots);
    } else if (run) {
      rect(g, 5, 15, 2, 1, pants);
      rect(g, 5, 16, 2, 2, boots);
      rect(g, 9, 15, 2, 1, pants);
      rect(g, 9, 16, 2, 2, boots);
    } else {
      const lUp = frame === 1;
      const rUp = frame === 3;
      rect(g, 5, 16, 2, 2, pants);
      rect(g, 5, lUp ? 17 : 18, 2, 2, boots);
      rect(g, 9, 16, 2, 2, pants);
      rect(g, 9, rUp ? 17 : 18, 2, 2, boots);
    }
    rect(g, 4, 10 + b, 8, 6, tun);
    rect(g, 11, 10 + b, 1, 6, tunD);
    if (coat) {
      // down over the knees and trimmed at the hem; the fur coat does up down the front with toggles
      rect(g, 4, 16 + b, 8, 1, tun);
      rect(g, 4, 17 + b, 8, 1, coat.trim);
      if (coat.scales) for (const [x, y] of [[5, 12], [8, 11], [10, 13], [6, 16], [9, 16]]) px(g, x, y + b, coat.scales);
      if (coat.fur && dir === 'down') {
        rect(g, 7, 11 + b, 1, 6, coat.trim);
        for (const y of [12, 16]) px(g, 8, y + b, coat.dark);
      }
      if (coat.fur) for (const x of [4, 11]) px(g, x, 11 + b, coat.trim);
    }
    if (collar) rect(g, 4, 10 + b, 8, 1, collar);
    rect(g, 4, 14 + b, 8, 1, belt);
    if (dir === 'down') px(g, 7, 14 + b, PAL.gold);
    if (look.pack && dir === 'down') for (const x of [5, 10]) rect(g, x, 10 + b, 1, 4, PACK_D);
    if (look.apron && dir === 'down') {
      rect(g, 5, 11 + b, 6, 6, look.apron);
      rect(g, 5, 16 + b, 6, 1, shade(look.apron, -0.2));
    }
    if (carry) {
      rect(g, 3, 2 + b, 1, 10, tunD);
      rect(g, 12, 2 + b, 1, 10, tunD);
      rect(g, 3, 1 + b, 2, 1, sk);
      rect(g, 11, 1 + b, 2, 1, sk);
    } else if (run) {
      // Each arm pumps opposite its leg: forward puts the fist up in front of the chest.
      for (const [x, inward, swing] of [[3, 1, frame === 3 ? 1 : frame === 1 ? -1 : 0], [12, -1, frame === 1 ? 1 : frame === 3 ? -1 : 0]]) {
        if (swing > 0) {
          rect(g, x, 10 + b, 1, 2, tunD);
          rect(g, x + inward, 11 + b, 1, 1, tunD);
          px(g, x + inward * 2, 11 + b, sk);
        } else if (swing < 0) {
          rect(g, x, 11 + b, 1, 4, tunD);
          px(g, x - inward, 15 + b, tunD);
          px(g, x - inward, 16 + b, sk);
        } else {
          rect(g, x, 11 + b, 1, 2, tunD);
          px(g, x, 13 + b, sk);
        }
      }
    } else if (!climb) {
      const la = frame === 1 ? 1 : 0;
      const ra = frame === 3 ? 1 : 0;
      rect(g, 3, 11 + b, 1, 3 + la, tunD);
      px(g, 3, 14 + b + la, sk);
      rect(g, 12, 11 + b, 1, 3 + ra, tunD);
      px(g, 12, 14 + b + ra, sk);
    }

    rect(g, 5, 3 + b, 6, 7, sk);
    rect(g, 4, 4 + b, 8, 5, sk);

    if (dir === 'down') {
      px(g, 6, 6 + b, EYE);
      px(g, 9, 6 + b, EYE);
      if (style === 'short' || style === 'long' || style === 'braids') {
        rect(g, 5, 2 + b, 6, 1, hair);
        rect(g, 4, 3 + b, 8, 2, hair);
        rect(g, 4, 5 + b, 1, 2, hair);
        rect(g, 11, 5 + b, 1, 2, hair);
        px(g, 5, 5 + b, hair);
        px(g, 9, 5 + b, hair);
      }
      if (style === 'braids') {
        for (const x of [3, 12]) drawBraid(g, x, 5 + b, 6, hair);
      }
      if (style === 'long') {
        rect(g, 3, 4 + b, 1, 8, hair);
        rect(g, 12, 4 + b, 1, 8, hair);
        rect(g, 4, 5 + b, 1, 6, hair);
        rect(g, 11, 5 + b, 1, 6, hair);
      }
      if (style === 'bald') {
        rect(g, 4, 5 + b, 1, 2, hair);
        rect(g, 11, 5 + b, 1, 2, hair);
      }
      if (look.beard) {
        rect(g, 5, 7 + b, 6, 3, look.beard);
        rect(g, 6, 10 + b, 4, 2, look.beard);
        px(g, 6, 6 + b, EYE);
        px(g, 9, 6 + b, EYE);
      }
    } else {
      if (style === 'bald') {
        rect(g, 4, 6 + b, 8, 2, hair);
      } else {
        rect(g, 5, 2 + b, 6, 1, hair);
        rect(g, 4, 3 + b, 8, 6, hair);
        if (style === 'long') rect(g, 4, 9 + b, 8, 3, hair);
        if (style === 'braids') for (const x of [4, 11]) drawBraid(g, x, 9 + b, 3, hair);
      }
    }
    if (look.kerchief) {
      rect(g, 5, 1 + b, 6, 1, look.kerchief);
      rect(g, 4, 2 + b, 8, 2, look.kerchief);
      if (dir === 'up') rect(g, 7, 4 + b, 2, 2, shade(look.kerchief, -0.2));
    }
    if (style === 'helmet') {
      rect(g, 5, 1 + b, 6, 1, METAL);
      rect(g, 4, 2 + b, 8, 3, METAL);
      rect(g, 3, 5 + b, 10, 1, METAL_D);
      if (dir === 'down') rect(g, 7, 6 + b, 2, 2, METAL);
      px(g, 2, 3 + b, BONE); px(g, 2, 2 + b, BONE); px(g, 1, 1 + b, BONE);
      px(g, 13, 3 + b, BONE); px(g, 13, 2 + b, BONE); px(g, 14, 1 + b, BONE);
    }
    if (look.pack && dir === 'up') {
      rect(g, 4, 10 + b, 8, 2, PACK_ROLL);
      for (const x of [4, 11]) px(g, x, 10 + b, shade(PACK_ROLL, -0.25));
      rect(g, 5, 12 + b, 6, 4, PACK);
      rect(g, 5, 12 + b, 6, 1, PACK_D);
      px(g, 7, 13 + b, PAL.gold);
      px(g, 8, 13 + b, PAL.gold);
    }
    return;
  }

  // facing right (left is mirrored)
  const farPants = shade(pants, -0.2);
  if (run && stride) {
    // front leg reaching forward, back leg kicked up behind; frame 3 swaps which one is near
    const [front, back] = frame === 1 ? [pants, farPants] : [farPants, pants];
    rect(g, 3, 16, 4, 1, back);
    rect(g, 2, 15, 2, 1, back);
    rect(g, 1, 13, 2, 2, boots);
    rect(g, 8, 16, 3, 1, front);
    rect(g, 10, 17, 2, 1, front);
    rect(g, 11, 18, 3, 2, boots);
  } else if (run) {
    rect(g, 5, 15, 2, 1, farPants);
    rect(g, 4, 16, 2, 1, farPants);
    rect(g, 3, 16, 2, 2, boots);
    rect(g, 7, 15, 3, 1, pants);
    rect(g, 9, 16, 2, 1, pants);
    rect(g, 8, 17, 3, 2, boots);
  } else if (walking) {
    rect(g, 5, 16, 2, 2, farPants);
    rect(g, 4, 18, 2, 2, boots);
    rect(g, 9, 16, 2, 2, pants);
    rect(g, 9, 18, 3, 2, boots);
  } else {
    rect(g, 6, 16, 4, 2, pants);
    rect(g, 6, 18, 5, 2, boots);
  }
  // lean the upper body forward when running
  const lx = run ? 1 : 0;
  rect(g, 5 + lx, 10 + b, 6, 6, tun);
  rect(g, 5 + lx, 10 + b, 1, 6, tunD);
  if (coat) {
    rect(g, 5 + lx, 16 + b, 6, 1, tun);
    rect(g, 5 + lx, 17 + b, 6, 1, coat.trim);
    if (coat.scales) for (const [x, y] of [[7, 12], [9, 11], [8, 16]]) px(g, x + lx, y + b, coat.scales);
    if (coat.fur) rect(g, 10 + lx, 11 + b, 1, 6, coat.trim);
  }
  if (collar) rect(g, 5 + lx, 10 + b, 6, 1, collar);
  rect(g, 5 + lx, 14 + b, 6, 1, belt);
  if (look.apron) {
    rect(g, 8 + lx, 11 + b, 3, 6, look.apron);
    rect(g, 8 + lx, 16 + b, 3, 1, shade(look.apron, -0.2));
  }
  if (run && !carry) {
    if (frame === 1) {
      rect(g, 8 + lx, 11 + b, 2, 2, tunD);
      rect(g, 10 + lx, 11 + b, 2, 1, sk);
    } else if (frame === 3) {
      rect(g, 5 + lx, 11 + b, 2, 2, tunD);
      rect(g, 3 + lx, 13 + b, 2, 1, sk);
      px(g, 4 + lx, 12 + b, tunD);
    } else {
      rect(g, 7 + lx, 11 + b, 2, 2, tunD);
      rect(g, 8 + lx, 13 + b, 2, 1, sk);
    }
  } else if (!carry) {
    const s = walking ? (frame === 1 ? 1 : -1) : 0;
    rect(g, 7 + s, 11 + b, 2, 3, tunD);
    rect(g, 7 + s, 14 + b, 2, 1, sk);
  }

  rect(g, 5 + lx, 3 + b, 6, 7, sk);
  rect(g, 4 + lx, 4 + b, 8, 5, sk);
  px(g, 12 + lx, 6 + b, sk);
  px(g, 9 + lx, 6 + b, EYE);
  if (style === 'short' || style === 'long' || style === 'braids') {
    rect(g, 5 + lx, 2 + b, 6, 1, hair);
    rect(g, 4 + lx, 3 + b, 8, 2, hair);
    rect(g, 4 + lx, 5 + b, 3, 3, hair);
  }
  if (style === 'long') rect(g, 3 + lx, 4 + b, 3, 8, hair);
  if (style === 'braids') drawBraid(g, 4 + lx, 8 + b, 4, hair, 2);
  if (style === 'bald' || style === 'helmet') rect(g, 4 + lx, 6 + b, 2, 2, hair);
  if (look.beard) {
    rect(g, 8 + lx, 7 + b, 4, 3, look.beard);
    rect(g, 8 + lx, 10 + b, 3, 2, look.beard);
  }
  if (look.kerchief) {
    rect(g, 5 + lx, 1 + b, 6, 1, look.kerchief);
    rect(g, 4 + lx, 2 + b, 8, 2, look.kerchief);
    rect(g, 3 + lx, 4 + b, 2, 2, shade(look.kerchief, -0.2));
  }
  if (style === 'helmet') {
    rect(g, 5 + lx, 1 + b, 6, 1, METAL);
    rect(g, 4 + lx, 2 + b, 8, 3, METAL);
    rect(g, 3 + lx, 5 + b, 10, 1, METAL_D);
    px(g, 3 + lx, 3 + b, BONE); px(g, 2 + lx, 2 + b, BONE); px(g, 2 + lx, 1 + b, BONE);
    px(g, 12 + lx, 3 + b, BONE); px(g, 13 + lx, 2 + b, BONE); px(g, 13 + lx, 1 + b, BONE);
  }
  if (look.pack) {
    rect(g, 2 + lx, 10 + b, 3, 6, PACK);
    rect(g, 2 + lx, 10 + b, 3, 2, PACK_D);
    rect(g, 2 + lx, 9 + b, 3, 1, PACK_ROLL);
    px(g, 2 + lx, 13 + b, PAL.gold);
    rect(g, 6 + lx, 10 + b, 2, 1, PACK_D);
  }
  if (carry) {
    rect(g, 7 + lx, 10 + b, 4, 1, tunD);
    rect(g, 10 + lx, 2 + b, 2, 9, tunD);
    rect(g, 10 + lx, 1 + b, 2, 1, sk);
  }
}

const charCache = new Map();

function charSprite(look, dir, frame, carry = false, run = false, climb = false) {
  const key = `${look.id}|${look.coat?.id || ''}|${!!look.pack}|${dir}|${frame}|${carry}|${run}|${climb}`;
  let c = charCache.get(key);
  if (!c) {
    const d = dir === 'left' ? 'right' : dir;
    c = sprite(16, 24, (g) => drawCharacter(g, look, d, frame, carry, run, climb), true);
    if (dir === 'left') c = mirror(c);
    charCache.set(key, c);
  }
  return c;
}

// ---------- registry ----------

function def(key, o) {
  const img = o.img || o.frames[0];
  SPR[key] = { ox: Math.floor(img.width / 2), oy: img.height - 1, ...o };
}

function buildSprites() {

  const house = sprite(80, 78, (g) => drawLonghouse(g, 80, 78, { axes: true, shield: true }));
  const houseB = sprite(80, 78, (g) => drawLonghouse(g, 80, 78, { shieldL: true }));
  const withRoof = ([roof, roofLight, roofDark, roofDeep], fn) => {
    const keep = { roof: PAL.roof, roofLight: PAL.roofLight, roofDark: PAL.roofDark, roofDeep: PAL.roofDeep };
    Object.assign(PAL, { roof, roofLight, roofDark, roofDeep });
    const c = fn();
    Object.assign(PAL, keep);
    return c;
  };
  const houseC = withRoof(['#c79a4a', '#e3bd6a', '#9a7232', '#6e4f22'], () => sprite(80, 78, (g) => drawLonghouse(g, 80, 78, {})));
  const houseD = withRoof(['#a8452f', '#cc6448', '#7f3020', '#5a2016'], () => sprite(80, 78, (g) => drawLonghouse(g, 80, 78, { shield: true })));
  const hall = sprite(144, 110, (g) => drawLonghouse(g, 144, 110, {
    gableW: 76, doorW: 22, doorH: 28, openDoor: true, banner: true, windows: [16, 38, 96, 118], windowY: 74,
  }));
  def('house', { img: house, foot: { w: 66, h: 14 }, door: { dx: 0, w: 12 } });
  def('houseB', { img: houseB, foot: { w: 66, h: 14 }, door: { dx: 0, w: 12 } });
  def('houseC', { img: houseC, foot: { w: 66, h: 14 }, door: { dx: 0, w: 12 } });
  def('houseD', { img: houseD, foot: { w: 66, h: 14 }, door: { dx: 0, w: 12 } });
  def('hall', { img: hall, foot: { w: 130, h: 20 }, door: { dx: 0, w: 22 } });
  def('forge', {
    img: buildForge(),
    foot: { w: 96, h: 14 },
    door: { dx: 18, w: 10 },
    light: { dx: -27, dy: -12, r: 34, color: '#ff8a2a' },
    after: (g, x, y, t) => {
      g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 13) * Math.sin(t * 7.3);
      rect(g, x - 50 + 16, y - 79 + 63, 15, 11, '#ffb23a');
      rect(g, x - 50 + 19, y - 79 + 67, 9, 6, '#fff0a0');
      g.globalAlpha = 1;
    },
  });
  def('stall', { img: buildStall(PAL.red, breadGoods), foot: { w: 64, h: 14 } });
  def('stallWeaver', { img: buildStall('#3d7d78', clothGoods), foot: { w: 64, h: 14 } });
  def('stallSeamstress', { img: buildStall('#d86a9a', garmentGoods), foot: { w: 64, h: 14 } });
  def('stallTanner', { img: buildStall('#7a4a26', leatherGoods), foot: { w: 64, h: 14 } });
  // `stall` is how far the counter's middle sits from the sprite's
  const shop = (stripe, goods, left, roof) => {
    const img = roof ? withRoof(roof, () => buildShopHouse(stripe, goods, left)) : buildShopHouse(stripe, goods, left);
    return { img, foot: { w: SHOP_W - 6, h: 14 }, door: { dx: left ? -SHOP_DOOR : SHOP_DOOR, w: 10 }, stall: left ? SHOP_STALL : -SHOP_STALL };
  };
  def('shopBaker', shop(PAL.red, breadGoods, false, ['#c79a4a', '#e3bd6a', '#9a7232', '#6e4f22']));
  def('shopWeaver', shop('#3d7d78', clothGoods, true));
  def('shopSeamstress', shop('#d86a9a', garmentGoods, false, ['#a8452f', '#cc6448', '#7f3020', '#5a2016']));
  def('shopTanner', shop('#7a4a26', leatherGoods, true, ['#c79a4a', '#e3bd6a', '#9a7232', '#6e4f22']));
  def('shopCarpenter', shop('#5a7a3a', woodGoods, false));
  def('workbench', { img: buildWorkbench(), foot: { w: 26, h: 4 }, shadow: { rx: 14, ry: 2 } });
  def('oven', { img: buildOven(), foot: { w: 26, h: 7 }, shadow: { rx: 14, ry: 3 }, light: { dx: 0, dy: -8, r: 22, color: '#ff8a2a' } });
  def('sacks', { img: buildSacks(), foot: { w: 18, h: 5 } });
  const loom = buildLoomFrames();
  def('loom', { frames: loom, foot: { w: 24, h: 4 }, pick: (t, o) => (o.active ? loom[Math.floor(t * 5) % 4] : loom[0]) });
  def('yarnBasket', { img: buildYarnBasket(), foot: { w: 14, h: 4 } });
  def('dressForm', { img: buildDressForm(), foot: { w: 10, h: 3 }, shadow: { rx: 6, ry: 2 } });
  def('hideFrame', { img: buildHideFrame(), foot: { w: 24, h: 4 } });
  def('vat', { img: buildVat(), foot: { w: 18, h: 5 }, shadow: { rx: 9, ry: 2 } });
  def('pine', { img: buildPine(false), foot: { w: 8, h: 5 }, shadow: { rx: 10, ry: 3 } });
  def('pine2', { img: buildPine(true), foot: { w: 8, h: 5 }, shadow: { rx: 10, ry: 3 } });
  def('oak', { img: buildOak(), foot: { w: 10, h: 5 }, shadow: { rx: 13, ry: 4 } });
  def('stump', { img: buildStump(6), foot: { w: 8, h: 4 }, shadow: { rx: 6, ry: 2 } });
  def('stumpOak', { img: buildStump(8), foot: { w: 10, h: 4 }, shadow: { rx: 7, ry: 2 } });
  def('stumpPalm', { img: buildStump(4), foot: { w: 6, h: 4 }, shadow: { rx: 5, ry: 2 } });
  SPR.axe = buildAxe();
  SPR.icon = {
    backpack: buildBackpack(), axe: SPR.axe, wood: buildLog(),
    apple: buildApple(), pear: buildPear(), banana: buildBanana(), pineapple: buildPineapple(),
    cherries: buildCherries(), plum: buildPlum(), peach: buildPeach(), orange: buildOrange(), lemon: buildLemon(),
    berries: buildBerries(), coconut: buildCoconut(), stone: buildPebble(), iceCube: buildIceCube(), wool: buildWool(),
    bow: buildBow(), sword: buildSword(), shield: buildShield(), spear: buildSpear(),
    rod: buildRod(), fish: buildFish(), pickaxe: buildPickaxe(), iron: buildIron(), string: buildString(),
    cod: buildFishKind({ body: '#9a8a56', belly: '#e4dcc0', fin: '#6e6238', len: 6, tall: 3, spots: [[6, 2], [9, 3], [11, 2], [8, 5]] }),
    trout: buildFishKind({ body: '#7a8a4a', belly: '#e8d8c0', fin: '#4e5a2e', len: 5, tall: 2.5, stripe: '#e07a8a', spots: [[5, 2], [8, 2], [10, 3]] }),
    eel: buildFishKind({ body: '#d8502a', belly: '#ffc040', fin: '#8a2a14', len: 8, tall: 1.6, spots: [[6, 1], [10, 1], [14, 1]] }),
    cavefish: buildFishKind({ body: '#e8d4d4', belly: '#fff4f4', fin: '#c8a8b0', len: 4, tall: 2.5, eye: false }),
    goldenFish: buildFishKind({ body: '#f2c03a', belly: '#fff0a0', fin: '#c88a1a', len: 5, tall: 3, shine: '#ffffff' }),
    mackerel: buildFishKind({ body: '#3e7a8a', belly: '#d8e8e8', fin: '#24505e', len: 6, tall: 2.5, spots: [[5, 1], [7, 2], [9, 1], [11, 2]] }),
    pufferfish: buildPufferfish(),
    salmon: buildFishKind({ body: '#a8a0a4', belly: '#f4a890', fin: '#6a6268', len: 7, tall: 3, spots: [[6, 2], [9, 2], [12, 3]] }),
    anglerfish: buildAnglerfish(),
    emberKoi: buildFishKind({ body: '#ff7a2a', belly: '#ffe0a0', fin: '#c83a14', len: 5, tall: 3, spots: [[5, 2], [8, 3], [10, 2]], shine: '#fff0c0' }),
    crystalFish: buildFishKind({ body: '#bfe8f4', belly: '#f4ffff', fin: '#7ac8e0', len: 5, tall: 2.5, shine: '#ffffff' }),
    arcticChar: buildFishKind({ body: '#4e6470', belly: '#f0844e', fin: '#e85a3a', len: 6, tall: 2.5, spots: [[5, 2], [7, 3], [9, 2], [11, 3]], spotColor: '#f4d8c8' }),
    frostPike: buildFishKind({ body: '#7aa6bc', belly: '#eef8fc', fin: '#3e6a84', len: 9, tall: 2, spots: [[6, 2], [9, 2], [12, 2], [15, 2]], spotColor: '#e0f4ff', shine: '#ffffff' }),
    glacierSturgeon: buildFishKind({ body: '#4a6a82', belly: '#cfe2ee', fin: '#233a4c', len: 9, tall: 3, spots: [[4, 2], [7, 1], [10, 1], [13, 1], [16, 2], [6, 4], [11, 4]], spotColor: '#e9f8ff', shine: '#bfe2f2' }),
    featherLure: buildLureKind('feather'), spinner: buildLureKind('spinner'), glowLure: buildLureKind('glow'), goldenLure: buildLure(),
    bread: buildBread(), honeyCake: buildHoneyCake(),
    arrow: buildArrowIcon(), feather: buildFeather(), torch: buildTorchIcon(), gold: buildGoldNugget(), mushroom: buildGlowcapIcon(),
    lure: buildLure(), sail: buildSailIcon(), silver: buildCoin(), goldCoin: buildCoin(['#b07a1e', '#f2c94a', '#fff6c8']), copper: buildCoin(['#7a3e1c', '#c97a42', '#f4c8a0']), meat: buildMeat(false), roast: buildMeat(true),
    hide: buildHide(), satchel: buildSatchel(), pouch: buildPouch(), toolBelt: buildToolBelt(), saddle: buildSaddleIcon(),
    ruby: buildGem('#d8322a', '#ff7a6a', '#8a1a14'), emerald: buildGem('#2fae5a', '#7ae89a', '#1a6a34'),
    goblet: buildGoblet(), crown: buildCrown(),
    plank: buildPlank(), rope: buildRope(), ladder: buildLadderIcon(), bridge: buildBridgeKit(), lightningRod: buildRodIcon(),
    campfire: buildCampfireKit(), tent: buildTentIcon(), grapple: buildGrapple(),
    mapPiece: buildMapPieceIcon(), runeNote: buildNoteIcon(),
    furCoat: buildCoatIcon(COATS.furCoat), fireJacket: buildCoatIcon(COATS.fireJacket),
    tunic_male: buildTunicIcon(PLAYER_LOOKS.male.tunic), tunic_female: buildTunicIcon(PLAYER_LOOKS.female.tunic),
  };
  SPR.ui = { ...buildUiIcons(), tinker: buildTinkerIcon() };
  SPR.icon.grilledFish = buildCooked(SPR.icon.fish, 'rgba(214,140,50,0.45)', true);
  SPR.icon.bakedApple = buildCooked(SPR.icon.apple, 'rgba(110,40,10,0.45)', false);
  SPR.held = { axe: SPR.axe, sword: buildHeldSword(), spear: buildHeldSpear(), pickaxe: buildHeldPickaxe(), torch: [buildHeldTorch(0), buildHeldTorch(1)] };
  def('ore', { img: buildOre(false), foot: { w: 18, h: 6 }, shadow: { rx: 11, ry: 3 } });
  def('oreSpent', { img: buildOre(true) });
  def('goldOre', { img: buildOre(false, 'gold'), foot: { w: 18, h: 6 }, shadow: { rx: 11, ry: 3 }, light: { dx: 0, dy: -8, r: 10, color: '#f2c94a' } });
  def('goldOreSpent', { img: buildOre(true, 'gold') });
  def('caveMouth', { img: buildCaveMouth(), foot: { w: 52, h: 10 }, door: { dx: 0, w: 14 } });
  def('sandCave', { img: buildSandCave(), foot: { w: 120, h: 16 }, door: { dx: 0, w: 14 } });
  def('sphinx', { img: buildSphinx(), foot: { w: 48, h: 16 }, shadow: { rx: 26, ry: 4 }, after: (g, x, y, t, o) => drawSphinxEyes(g, x, y, t, o) });
  def('brazier', { frames: [0, 1, 2].map(buildBrazier), fps: 8, foot: { w: 8, h: 4 }, shadow: { rx: 5, ry: 2 }, light: { dx: 0, dy: -14, r: 40, color: '#ffb040' } });
  def('sandPillar', { img: buildSandPillar(), foot: { w: 12, h: 6 }, shadow: { rx: 9, ry: 3 } });
  for (let v = 0; v < 2; v++) def(`urn-${v}`, { img: buildUrn(v), foot: { w: 8, h: 4 }, shadow: { rx: 5, ry: 2 } });
  def('coinPile', { img: buildCoinPile(), light: { dx: 0, dy: -4, r: 10, color: '#dfe6f0' } });
  def('goldHeap', { img: buildGoldHeap(), light: { dx: 0, dy: -6, r: 16, color: '#f2c94a' } });
  def('hoardChest', { img: buildHoardChest(false), foot: { w: 18, h: 6 }, shadow: { rx: 10, ry: 2 } });
  def('hoardChestOpen', { img: buildHoardChest(true), foot: { w: 18, h: 6 }, shadow: { rx: 10, ry: 2 } });
  def('goldStatue', { img: buildGoldStatue(), foot: { w: 16, h: 6 }, shadow: { rx: 9, ry: 2 }, light: { dx: 0, dy: -16, r: 18, color: '#ffd76a' } });
  const dais = buildDais();
  def('dais', { img: dais, oy: dais.height - 4 });
  def('bramble', { img: buildBramble(), foot: { w: 20, h: 9 }, shadow: { rx: 10, ry: 3 } });
  def('brambleCut', { img: buildBramble('cut') });
  def('brambleBurnt', { img: buildBramble('burnt') });
  def('fallenLog', { img: buildFallenLog(), foot: { w: 14, h: 36 }, oy: 41 });
  def('looseRock', { img: buildLooseRock(), foot: { w: 20, h: 8 }, shadow: { rx: 12, ry: 3 } });
  def('stoneCache', { img: buildStoneCache(false), foot: { w: 44, h: 12 } });
  def('stoneCacheEmpty', { img: buildStoneCache(true), foot: { w: 44, h: 12 } });
  for (const n of [1, 2]) def(`ladder${n}`, { img: buildLadder(n * TILE) });
  def('glowcaps', { img: buildGlowcaps(false), light: { dx: 0, dy: -6, r: 20, color: '#5affd8' } });
  def('glowcapsPicked', { img: buildGlowcaps(true) });
  for (let v = 0; v < 3; v++) def(`stalagmite-${v}`, { img: buildStalagmite(v + 1), foot: { w: 8, h: 4 }, shadow: { rx: 6, ry: 2 } });
  SPR.hen = buildHen();
  SPR.wild = {
    deer: buildDeer(false), stag: buildDeer(true), boar: buildBoar(), rabbit: buildRabbit(), goat: buildGoat(), frog: buildFrog(), snake: buildSnake(),
    fox: buildFox({ fur: '#d8642a', light: '#f4e6d0', legs: '#3a2414' }),
    arcticFox: buildFox({ fur: '#f4f4f8', light: '#ffffff', legs: '#9aa4b8' }),
    hedgehog: buildHedgehog(), badger: buildBadger(), wolf: buildWolf(), owl: buildOwl(), bat: buildBat(),
    penguin: buildPenguin(), scorpion: buildScorpion(), javelina: buildJavelina(),
  };
  SPR.heldFront = { axe: buildAxeFront() };
  def('bushCut', { img: buildBushCut() });
  def('fenceHBroken', { img: buildBrokenFence(false) });
  def('fenceVBroken', { img: buildBrokenFence(true) });
  def('bed', { img: buildBed('#3d6ca3'), foot: { w: 22, h: 27 } });
  const hearth = buildHearthFrames();
  def('hearth', { frames: hearth, fps: 7, foot: { w: 32, h: 6 }, light: { dx: 0, dy: -8, r: 52, color: '#ff9a3a' } });
  def('table', { img: buildTable(32, homeFood), foot: { w: 28, h: 9 }, shadow: { rx: 15, ry: 3 } });
  def('longTable', { img: buildTable(66, feastFood), foot: { w: 62, h: 9 }, shadow: { rx: 31, ry: 3 } });
  def('stool', { img: buildStool(), foot: { w: 8, h: 3 } });
  def('bench', { img: buildBench(), foot: { w: 32, h: 3 } });
  def('chest', { img: buildChest(), foot: { w: 16, h: 6 } });
  def('chestOpen', { img: buildChest(true), foot: { w: 16, h: 6 } });
  def('throne', { img: buildThrone(), foot: { w: 22, h: 8 } });
  def('backpack', { img: SPR.icon.backpack, shadow: { rx: 5, ry: 2 } });
  def('toolBelt', { img: SPR.icon.toolBelt, shadow: { rx: 7, ry: 2 } });
  const wallMap = buildWallMap();
  def('wallMap', { img: wallMap, oy: wallMap.height + 3 });
  def('bushPink', { img: buildBush('#f25c9a'), foot: { w: 12, h: 4 } });
  def('bushYellow', { img: buildBush('#f7d046'), foot: { w: 12, h: 4 } });
  def('rock', { img: buildRock(true) });
  def('stone', { img: buildRock(false), foot: { w: 10, h: 4 } });
  def('barrel', { img: buildBarrel(), foot: { w: 12, h: 6 }, shadow: { rx: 6, ry: 2 } });
  def('shopSign', { img: buildShopSign(), foot: { w: 20, h: 3 }, shadow: { rx: 10, ry: 2 }, after: (g, x, y, t, o) => drawSignEmblem(g, x, y, o) });
  def('fishShack', { img: buildFishShack(), foot: { w: 46, h: 12 }, shadow: { rx: 26, ry: 4 }, door: { dx: 10, w: 10 } });
  def('fenceH', { img: buildFence(false), foot: { w: 16, h: 4 } });
  def('fenceV', { img: buildFence(true), foot: { w: 4, h: 16 } });
  def('post', { img: buildPost(), foot: { w: 4, h: 4 } });
  def('anvil', { img: buildAnvil(), foot: { w: 14, h: 5 } });
  def('target', { img: buildTarget(), foot: { w: 14, h: 4 }, shadow: { rx: 8, ry: 2 } });
  const pillar = buildPillar();
  def('pillarL', { img: pillar, foot: { w: 16, h: 6 } });
  def('pillarR', { img: mirror(pillar), foot: { w: 16, h: 6 } });
  def('bannerRed', { frames: buildBannerFrames(PAL.red), fps: 3, foot: { w: 4, h: 3 } });
  def('bannerBlue', { frames: buildBannerFrames(PAL.blue), fps: 3, foot: { w: 4, h: 3 } });
  def('torch', { frames: buildTorchFrames(), fps: 9, foot: { w: 4, h: 3 }, light: { dx: 0, dy: -22, r: 28, color: '#ffa040' } });
  const bonfire = buildBonfireFrames();
  def('bonfire', {
    frames: bonfire, fps: 10, foot: { w: 28, h: 9 },
    light: { dx: 0, dy: -10, r: 72, color: '#ff9a3a' }, after: (g, x, y, t, o) => drawBlaze(g, x, y, t, o),
  });
  def('campfire', {
    frames: bonfire, fps: 10, foot: { w: 28, h: 9 },
    light: { dx: 0, dy: -10, r: 60, color: '#ff9a3a' }, after: (g, x, y, t, o) => drawBlaze(g, x, y, t, o),
  });
  def('tent', { img: buildTent(), foot: { w: 30, h: 10 }, shadow: { rx: 19, ry: 4 } });
  SPR.flyDragon = {};
  SPR.flyDragonSaddled = {};
  SPR.heldEgg = {};
  SPR.babyDragon = {};
  for (const [id, pal] of Object.entries(DRAGON_SPECIES)) buildSpecies(id, pal);
  SPR.clouds = [1, 2, 3, 4].map(buildCloud);

  const palm = buildPalm();
  const bare = buildPalm(false);
  def('palm', { img: palm, pick: (t, o) => (o.shaken ? bare : palm), foot: { w: 6, h: 4 }, shadow: { rx: 9, ry: 3 } });
  for (const kind of Object.keys(FRUIT_LOOK)) {
    const [full, picked] = [buildFruitTree(kind), buildFruitTree(kind, false)];
    def(`${kind}Tree`, { img: full, pick: (t, o) => (o.shaken ? picked : full), foot: { w: 8, h: 5 }, shadow: { rx: 11, ry: 3 } });
  }
  const [bananas, bananaBare] = [buildBananaPlant(), buildBananaPlant(false)];
  def('bananaTree', { img: bananas, pick: (t, o) => (o.shaken ? bananaBare : bananas), foot: { w: 6, h: 4 }, shadow: { rx: 9, ry: 3 } });
  def('menhir', { img: buildMenhir(), foot: { w: 10, h: 5 }, shadow: { rx: 6, ry: 2 }, light: { dx: 0, dy: -14, r: 14, color: '#6fb6ff' }, after: (g, x, y, t, o) => drawStoneRune(g, x, y, t, o) });
  const altar = buildAltar(false);
  const altarOpen = buildAltar(true);
  def('altar', { img: altar, oy: altar.height - 4, pick: (t, o) => (o.open ? altarOpen : altar) });
  for (let v = 0; v < 3; v++) def(`reef-${v}`, { frames: [buildReefRock(v, false), buildReefRock(v, true)], fps: 0.8 });
  def('volcano', { img: buildVolcano(), light: { dx: 0, dy: -96, r: 40, color: '#ff6a1a' }, after: (g, x, y) => drawCraterEgg(g, x, y) });
  // drawn as part of the volcano; this is just its doorway
  def('fireCaveMouth', { img: sprite(1, 1, () => {}), foot: { w: 30, h: 6 }, door: { dx: 0, w: 14 }, light: { dx: 0, dy: -4, r: 18, color: '#ff6a1a' } });
  def('lavaPool', { img: sprite(1, 1, () => {}), light: { dx: 0, dy: 0, r: 56, color: '#ff6a1a' }, after: (g, x, y) => drawPoolEgg(g, x, y) });
  def('snowPine', { img: buildPine(true, true), foot: { w: 8, h: 5 }, shadow: { rx: 10, ry: 3 } });
  def('jungleTree', { img: buildJungleTree(), foot: { w: 10, h: 5 }, shadow: { rx: 14, ry: 4 } });
  const vines = [0, 1, 2].map(buildVineTree);
  def('vineTree', { img: vines[0], pick: (t, o) => vines[o.variant || 0], foot: { w: 16, h: 16 }, fade: true });
  def('fern', { img: buildFern(), foot: { w: 10, h: 3 } });
  def('boulder', { img: buildBoulder('grey'), foot: { w: 24, h: 8 }, shadow: { rx: 13, ry: 3 } });
  def('boulderSnow', { img: buildBoulder('snow'), foot: { w: 24, h: 8 }, shadow: { rx: 13, ry: 3 } });
  def('boulderDark', { img: buildBoulder('dark'), foot: { w: 24, h: 8 }, shadow: { rx: 13, ry: 3 } });
  def('deadTree', { img: buildDeadTree(), foot: { w: 6, h: 4 }, shadow: { rx: 8, ry: 2 } });
  def('column', { img: buildColumn(), foot: { w: 12, h: 5 }, shadow: { rx: 7, ry: 2 } });
  def('cactus', { img: buildSaguaro(false), foot: { w: 6, h: 4 }, shadow: { rx: 7, ry: 2 } });
  def('cactusTall', { img: buildSaguaro(true), foot: { w: 6, h: 4 }, shadow: { rx: 7, ry: 2 } });
  def('barrelCactus', { img: buildBarrelCactus(), foot: { w: 8, h: 4 }, shadow: { rx: 6, ry: 2 } });
  // flat things lie on the ground under everything else, whichever side of them it stands
  const mound = buildTorMound();
  def('torMound', { img: mound, oy: 17, flat: true });
  def('rodSocket', { img: buildRodSocket(), oy: 6, flat: true });
  def('lightningRodSet', { img: buildRodSet(), foot: { w: 5, h: 3 }, shadow: { rx: 3, ry: 1 } });
  const streak = buildGlassStreak();
  def('glassStreak', { img: streak, ox: 6, oy: 7, flat: true });
  def('splitTree', { img: buildSplitTree(), foot: { w: 8, h: 4 }, shadow: { rx: 9, ry: 3 } });
  def('lookout', { img: buildLookout(), foot: { w: 28, h: 7 }, shadow: { rx: 16, ry: 3 } });
  def('ruinWall', { img: buildRuinWall(), foot: { w: 32, h: 6 }, after: (g, x, y, t, o) => drawWallCarving(g, x, y, t, o) });
  const nest = buildNest();
  def('nest', { img: nest, oy: nest.height - 4 });
  def('cairn', { img: buildCairn(), foot: { w: 10, h: 4 }, shadow: { rx: 7, ry: 2 } });  const roost = buildRoost();
  def('roost', { img: roost, oy: 63, foot: { w: 112, h: 10 } });
  def('stake', { img: buildStake(), foot: { w: 4, h: 3 } });
  def('nursery', { img: buildNursery(), oy: 42, foot: { w: 68, h: 8 } });
  def('fishPlate', { img: buildFishPlate(), oy: 9, foot: { w: 26, h: 5 }, after: (g, x, y, t, o) => drawPlateFish(g, x, y, o) });
  def('dragonPool', { frames: [0, 1, 2].map(buildDragonPool), fps: 1.5, oy: 18, foot: { w: 34, h: 12 }, after: (g, x, y, t, o) => drawPoolRipples(g, x, y, o) });
  def('logPile', { img: buildLogPile(), foot: { w: 30, h: 6 }, shadow: { rx: 16, ry: 3 } });
  // out in the snow a crystal is just ice; down in the ice cave the same crystals give the only light
  const crystal = buildIceCrystal();
  def('iceCrystal', { img: crystal, foot: { w: 14, h: 4 } });
  def('caveCrystal', { img: crystal, foot: { w: 14, h: 4 }, light: { dx: 0, dy: -12, r: 16, color: '#9fdcff' } });
  def('iceWall', { img: buildIceWall(), foot: { w: 16, h: 9 } });
  def('iceWallMelting', { img: buildIceWall(true) });
  def('scarecrow', { img: buildScarecrow(), foot: { w: 4, h: 3 } });
  SPR.sheep = buildSheep();
  SPR.dog = buildDog();
  SPR.dogHeld = buildDogHeld();

  // The sail stripes are PAL.red and PAL.cream, so swapping those repaints the whole ship.
  const shipDirs = ([red, cream]) => {
    const keep = { red: PAL.red, cream: PAL.cream };
    Object.assign(PAL, { red, cream });
    const side = buildShip();
    const ne = buildShipDiagonal(false);
    const se = buildShipDiagonal(true);
    // seat = where the rider's waist meets the gunwale
    const dirs = {
      right: { img: side, ox: 52, oy: 80, seat: [30, 62] },
      left: { img: mirror(side), ox: 52, oy: 80, seat: [74, 62] },
      down: { img: buildShipVertical(true), ox: 32, oy: 86, seat: [32, 69] },
      up: { img: buildShipVertical(false), ox: 32, oy: 86, seat: [32, 73] },
      ne: { img: ne, ox: 52, oy: 88, seat: [44, 69] },
      nw: { img: mirror(ne), ox: 52, oy: 88, seat: [60, 69] },
      se: { img: se, ox: 52, oy: 88, seat: [60, 69] },
      sw: { img: mirror(se), ox: 52, oy: 88, seat: [44, 69] },
    };
    Object.assign(PAL, keep);
    return dirs;
  };
  const dirs = shipDirs([PAL.red, PAL.cream]);
  SPR.plainSail = dirs;
  SPR.silkSail = shipDirs(['#3d6ca3', '#f4efe2']);
  def('ship', {
    img: dirs.right.img,
    bob: 1.5,
    dirs,
    after: (g, x, y, t, o) => {
      const w = 3 + Math.round(Math.sin(t * 2) * 2);
      g.globalAlpha = 0.6;
      const f = o.facing || o.dir;
      if (f === 'ne' || f === 'nw' || f === 'se' || f === 'sw') {
        // the near waterline climbs toward the far end of the hull
        const s = f === 'ne' || f === 'sw' ? -1 : 1;
        for (let i = -2; i <= 2; i++) rect(g, x + i * 13 - 5, y - 11 + s * i * 7, 10, 1, '#9fd2fa');
        rect(g, x - 40 - w, y - 13 + s * 16, 8 + w, 1, PAL.foam);
        rect(g, x + 34, y - 13 - s * 16, 8 + w, 1, PAL.foam);
      } else if (f === 'up' || f === 'down') {
        rect(g, x - 20 - w, y + 2, 8 + w, 1, PAL.foam);
        rect(g, x + 12, y + 2, 8 + w, 1, PAL.foam);
        rect(g, x - 12, y + 4, 24, 1, '#9fd2fa');
      } else {
        rect(g, x - 46 - w, y + 3, 10 + w, 1, PAL.foam);
        rect(g, x + 36, y + 3, 10 + w, 1, PAL.foam);
        rect(g, x - 30, y + 5, 60, 1, '#9fd2fa');
      }
      g.globalAlpha = 1;
    },
  });
  def('merchantShip', { ...SPR.ship, dirs: shipDirs(['#2f7d5a', '#e8c860']) });
  SPR.merchantShip.img = SPR.merchantShip.dirs.right.img;
}
