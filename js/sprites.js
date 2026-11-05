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
function buildStall(stripe, goods) {
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

function buildChest() {
  return sprite(20, 16, (g) => {
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

// ---------- regions ----------

// A mountain seen from the south: lit west face, shaded east face, and `snow` (0..1) reaching
// down from the summit, furthest along the gullies.
function buildPeak(w, h, seed, snow) {
  return sprite(w, h, (g) => {
    const base = h - 1;
    const ax = Math.round(w * (0.38 + hash(seed, 1, 50) * 0.24));
    const H = base - 3;
    const tops = [];
    for (let x = 0; x < w; x++) {
      const t = x <= ax ? x / ax : (w - 1 - x) / (w - 1 - ax);
      const jag = (hash(x >> 2, seed, 51) - 0.5) * 5 + (hash(x >> 1, seed, 52) - 0.5) * 2;
      tops.push(Math.round(base - H * t ** 1.45 + jag * Math.min(1, t * 3) * (1 - t * 0.6)));
    }
    const apex = tops[ax];
    const gullies = Array.from({ length: 5 }, (_, k) => ax + (k - 2) * w * 0.13 + (hash(k, seed, 53) - 0.5) * 8);
    for (let x = 1; x < w - 1; x++) {
      const t = x <= ax ? x / ax : (w - 1 - x) / (w - 1 - ax);
      const reach = snow * H * (0.35 + t * 0.65) * (0.7 + hash(x >> 1, seed, 54) * 0.5);
      for (let y = Math.max(1, tops[x]); y < base; y++) {
        const spine = ax + (y - apex) * 0.32 + (hash(y >> 2, seed, 55) - 0.5) * 3;
        const lit = x < spine;
        const gully = gullies.some((gx) => Math.abs(x - (gx + (y - apex) * (gx < spine ? -0.25 : 0.25))) < 1);
        const sn = y - tops[x] < reach + (gully ? H * snow * 0.35 : 0);
        const d = (y - apex) / H;
        let c;
        if (sn) c = lit ? (hash(x, y, 56) < 0.08 ? PAL.snow : PAL.snowLight) : (y - tops[x] < 2 ? PAL.snow : PAL.snowDark);
        else if (gully) c = lit ? PAL.rock : PAL.rockDeep;
        else if (lit) c = d > 0.8 ? PAL.rock : hash(x >> 1, y >> 1, 57) < 0.18 ? PAL.rock : PAL.rockLight;
        else c = d > 0.75 ? PAL.rockDeep : hash(x >> 1, y >> 1, 58) < 0.2 ? PAL.rockDeep : PAL.rockDark;
        px(g, x, y, c);
      }
      if (tops[x] < base) px(g, x, Math.max(1, tops[x]), x < ax ? PAL.snowLight : snow ? PAL.snow : PAL.rockLight);
    }
    for (let x = 2; x < w - 2; x++) if (hash(x, seed, 59) < 0.5 && tops[x] < base - 2) px(g, x, base - 1, PAL.rockDeep);
  });
}

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
    for (const [x0, drift, len] of [[cx - 6, -0.35, 70], [cx + 4, 0.25, 84], [cx + 11, 0.5, 46]]) {
      let x = x0;
      for (let y = rimY + 3; y < rimY + len; y++) {
        x += drift + Math.sin(y * 0.21 + x0) * 0.6;
        rect(g, Math.round(x) - 1, y, 3, 1, PAL.lavaDark);
        px(g, Math.round(x), y, y < rimY + len * 0.6 ? PAL.lavaLight : PAL.lava);
      }
    }
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
    body: '#1e2230', dark: '#12141d', light: '#3c4560', wing: '#2b3146', eye: '#9be35a', fin: '#c0392b', glint: '#e6ffb0',
    egg: { base: '#4b2a73', light: '#5f3a8f', speck: '#8a5cc7', speckDark: '#3a1f5c', shine: '#d9b8ff', gloss: '#a77be0', glow: '#b98cff' },
    breath: ['#b05cff', '#e7c8ff', '#7a2fd6'],
  },
  lightFury: {
    name: 'Light Fury', defaultName: 'Luna',
    body: '#e3e8f1', dark: '#b2bccf', light: '#ffffff', wing: '#ccd4e3', eye: '#4aa8ff', fin: '#9fc4f0', glint: '#ffffff',
    egg: { base: '#aebcd6', light: '#d6e0f2', speck: '#ffffff', speckDark: '#8796b4', shine: '#ffffff', gloss: '#f2f6ff', glow: '#bfe0ff' },
    breath: ['#5fc8ff', '#e6f8ff', '#2f7fd6'],
  },
  thunderdrum: {
    name: 'Thunderdrum', defaultName: 'Thornado',
    body: '#8c6a3a', dark: '#5a4224', light: '#c8a66a', wing: '#3f7f88', eye: '#ffd23a', fin: '#2f9aa6', glint: '#fff6c0',
    egg: { base: '#2f6f78', light: '#3f8c93', speck: '#c9a86a', speckDark: '#1f4c52', shine: '#bff0f0', gloss: '#6fc0c4', glow: '#6fe0e0' },
    breath: ['#4fe0d0', '#e0fff8', '#1f9a9a'],
  },
  terribleTerror: {
    name: 'Terrible Terror', defaultName: 'Sharpshot',
    body: '#5c9a34', dark: '#3a6a1e', light: '#a6d65a', wing: '#e0862a', eye: '#ffe44a', fin: '#e0542a', glint: '#ffffe0',
    egg: { base: '#4f8a2e', light: '#6aa83a', speck: '#f0a23a', speckDark: '#2f5a1a', shine: '#fff0a0', gloss: '#a8d45a', glow: '#ffc25a' },
    breath: ['#ff8a2a', '#fff0a0', '#d6421a'],
  },
};

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
// Returns where its mouth is, or null when it faces away.
function drawDragon(g, pal, a, view, f, stand, gx, gy) {
  const { body: B, wing: M, light: L, dark: D, eye: E, fin: FIN, glint: GLINT } = pal;
  const PUPIL = '#05070a';
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
  const legs = (...xs) => { for (const x of xs) ell(x * a.chub, ly, 2 * a.chub, 2, B); };

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

  const tail = (x, y, segs) => {
    const pts = [P(x, y)];
    for (const [dx, dy] of segs) {
      const [x0, y0] = pts[pts.length - 1];
      pts.push([x0 + dx * S * a.tail, y0 + dy * S * a.tail]);
    }
    for (let i = 0; i < pts.length - 1; i++) line(g, ...pts[i], ...pts[i + 1], B, T(4 - i));
    return pts[pts.length - 1];
  };
  const fins = ([x, y], ...shapes) => {
    for (const pts of shapes) poly(g, pts.map(([dx, dy]) => [x + dx * S * a.chub, y + dy * S * a.chub]), FIN);
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
    poly(g, [Q(4, -5, 0), Q(33 * sp, -9, tip), Q(26 * sp, 2, tip * 0.6), Q(17 * sp, 0, tip * 0.35), Q(10 * sp, 5, tip * 0.15), Q(4, 4, 0)], M);
    line(g, ...Q(4, -5, 0), ...Q(33 * sp, -9, tip), L, T(2));
    line(g, ...Q(14 * sp, -6, tip * 0.4), ...Q(26 * sp, 2, tip * 0.6), D);
    line(g, ...Q(11 * sp, -5, tip * 0.3), ...Q(17 * sp, 0, tip * 0.35), D);
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
    poly(g, pts, near ? M : D);
    line(g, ...pts[1], ...pts[2], L, T(2));
  };

  if (view === 'right') {
    sideWing(false);
    fins(tail(-10, 1, [[-10, sw], [-8, -3 - 2 * sw], [-4, -5 + sw]]), [[0, 1], [-3, -5], [3, -1]], [[0, 1], [-3, 5], [3, 3]]);
    legs(-5, 5);
    ell(0, 0, 11, 6 * a.chub, B);
    ell(0, -3 * a.chub, 8, 2, M);
    const neck = P(9 + 7 * a.neck, -2 - 5 * a.neck);
    line(g, ...P(9, -2), ...neck, B, T(5));
    head(neck, 4, -1 - lift);
    hpoly([[-4, -3], [-11 + 2 * young, -8 - 1.5 * young], [-1, -1]], B);
    hell(0, 0, 6, 4, B);
    hpoly([[2, -2], [2 + 8 * sn, 0], [1 + 8 * sn, 3], [2, 4]], B);
    hell(-1, -2, 3, 1, M);
    eye(2 - (1 - sn) * 2, -1 - (a.eye - 2));
    nostril(2 + 6 * sn, 1);
    sideWing(true);
    return H(2 + 8 * sn, 2);
  }
  if (view === 'down') {
    fins(tail(0, -6, [[sw, -8], [-2 * sw, -6], [sw, -4]]), [[0, 2], [-5, -2], [-1, 5]], [[0, 2], [5, -2], [1, 5]]);
    if (!fold) for (const s of [-1, 1]) wing(0, -2, [s, 0], [0, 1], [0, -1]);
    legs(-5, 5);
    ell(0, 0, 7 * a.chub, 10, B);
    ell(0, -3, 4, 6, M);
    // Folded, the wings hang at its sides like little arms.
    for (const s of fold ? [-1, 1] : []) {
      const x0 = 6 * a.chub * s;
      const k = a.wing;
      const pts = [P(x0 - s, -6), P(x0 + 6 * k * s, 2 * k), P(x0 + 3 * k * s, 6 * k), P(x0 - s, 3)];
      poly(g, pts, M);
      line(g, ...pts[0], ...pts[1], L);
    }
    const nk = 6 + 4 * a.neck;
    if (stand) {
      head(P(0, -2), 0, -5 * round);
    } else {
      ell(0, nk, 4 * a.chub, 4, B);
      head(P(0, nk), 0, 5);
    }
    for (const s of [-1, 1]) hpoly([[4 * s, -2], [(9 + young) * s, -7 + young], [2 * s, -4]], B);
    hell(0, 0, 6, 5, B);
    hell(0, -2, 4, 2, M);
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
    for (const s of [-1, 1]) hpoly([[4 * s, 0], [9 * s, 6], [2 * s, 3]], B);
    hell(0, 0, 6, 5, B);
    hell(0, -1, 4, 2, M);
    if (!fold) for (const s of [-1, 1]) wing(0, -2, [s, 0], [0, 1], [0, 1]);
    ell(0, 0, 7 * a.chub, 10, B);
    ell(0, 2, 4, 6, M);
    if (fold) for (const s of [-1, 1]) wing(0, -4, [s, 0], [0, 1], [0.4 * s, 1]);
    fins(tail(0, 8, [[sw, 8], [-2 * sw, 6], [sw, 4]]), [[0, -1], [-5, 3], [-1, -4]], [[0, -1], [5, 3], [1, -4]]);
    return null;
  }
  if (view === 'se') {
    fins(tail(-6, -4, [[-6, -5 + sw], [-5, -5 - sw], [-4, -4]]), [[0, 0], [-5, -2], [-1, 3]], [[0, 0], [-1, -5], [3, -1]]);
    wing(2, -4, [0.75, -0.45], [-0.6, -0.5], [-0.8, -0.6]);
    legs(-4, 5);
    ell(0, 0, 9, 7 * a.chub, B);
    ell(-2, -2, 5, 3, M);
    wing(-2, 2, [-0.75, 0.45], [0.2, 0.9], [-0.8, -0.6], 0.5);
    const neck = P(6 + 5 * a.neck, 1 + 4 * a.neck);
    line(g, ...P(6, 1), ...neck, B, T(5));
    head(neck, 3, 2 - lift);
    hpoly([[-3, -2], [-10, -7], [-2, -4]], B);
    hpoly([[1, -4], [-2, -10], [3, -3]], B);
    hell(0, 0, 6, 5, B);
    hpoly([[1, -1], [1 + 7 * sn, 2], [6 * sn, 5], [-1, 4]], B);
    hell(-1, -2, 3, 2, M);
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
  hpoly([[-3, 1], [-9, 6], [-1, 3]], B);
  hpoly([[1, 1], [-1, 7], [3, 2]], B);
  hell(-2, -2, 3, 1.5, M);
  eye(4, -1, 1);
  legs(-4, 4);
  ell(0, 0, 9, 7 * a.chub, B);
  ell(-1, -1, 5, 4, M);
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

// Diagonal facings for the flying dragon (72x60, ground point (36, 40), like buildFlyingDragon)
// when it flies without a rider, plus mouth positions for all facings.
function addFlyingDiagonals(set, pal) {
  const a = DRAGON_AGES[DRAGON_AGES.length - 1];
  for (const [from, to] of DRAGON_MIRRORS.slice(1)) {
    set[from] = DRAGON_FLAP.tip.map((_, f) => ({ under: sprite(72, 60, (g) => drawDragon(g, pal, a, from, f, false, 36, 40)), over: null }));
    set[to] = set[from].map((fr) => ({ under: mirror(fr.under), over: null }));
  }
  set.mouth = dragonMouths(pal, a, false);
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
    for (const [x, y] of [[7, 9], [7, 10], [6, 11], [8, 11], [7, 14], [6, 15], [8, 15], [7, 16], [7, 19], [7, 20]]) px(g, x, y, '#8fd0ff');
    ellipse(g, 7, 25, 5, 1, PAL.grassDark);
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

function buildHammer() {
  return sprite(12, 14, (g) => {
    rect(g, 5, 4, 2, 9, PAL.woodLight);
    rect(g, 6, 4, 1, 9, PAL.wood);
    rect(g, 1, 1, 10, 4, '#8b8b94');
    rect(g, 1, 1, 10, 1, '#c9ccd4');
    rect(g, 1, 4, 10, 1, '#56565e');
    rect(g, 4, 1, 1, 4, '#56565e');
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

function buildIron() {
  return sprite(13, 9, (g) => {
    poly(g, [[3, 1], [10, 1], [12, 7], [1, 7]], '#7a7f8c');
    rect(g, 3, 1, 7, 1, '#c9ccd4');
    rect(g, 2, 3, 9, 1, '#9aa0ac');
    rect(g, 1, 7, 12, 1, '#4a4d58');
    px(g, 5, 2, '#e8eaf0');
  });
}

// A lump of black rock shot through with rusty iron veins.
function buildOre(spent) {
  return sprite(24, 16, (g) => {
    if (spent) {
      for (const [x, y, r] of [[6, 12, 3], [12, 13, 4], [18, 12, 3], [9, 10, 2], [15, 10, 2]]) ellipse(g, x, y, r, r * 0.6, '#3e3a40');
      for (const [x, y] of [[6, 11], [12, 12], [17, 11]]) px(g, x, y, '#5e5860');
      px(g, 10, 13, '#8a4a2e');
      return;
    }
    ellipse(g, 12, 9.5, 10.5, 6, '#4e444a');
    ellipse(g, 10, 7.5, 7.5, 4.5, '#6a5e64');
    ellipse(g, 15, 10, 6, 3.5, '#5a4e54');
    rect(g, 6, 3, 6, 1, '#84767c');
    rect(g, 3, 14, 18, 1, '#2e282c');
    line(g, 4, 10, 9, 5, '#b0603a', 2);
    line(g, 9, 5, 13, 8, '#b0603a', 2);
    line(g, 12, 12, 19, 8, '#b0603a', 2);
    for (const [x, y] of [[5, 9], [10, 5], [13, 7], [16, 9], [18, 8], [13, 11]]) px(g, x, y, '#e8964e');
    for (const [x, y] of [[7, 7], [12, 6], [15, 10]]) rect(g, x, y, 2, 2, '#f4c890');
    for (const [x, y] of [[7, 7], [12, 6], [17, 9]]) px(g, x, y, '#ffffff');
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

function buildHeldHammer() {
  return sprite(10, 15, (g) => {
    rect(g, 3, 4, 2, 10, PAL.woodLight);
    rect(g, 4, 4, 1, 10, PAL.wood);
    rect(g, 0, 1, 8, 4, '#8b8b94');
    rect(g, 0, 1, 8, 1, '#c9ccd4');
    rect(g, 0, 4, 8, 1, '#56565e');
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

function buildDragonFrames(pal) {
  const B = pal.body;
  const M = pal.wing;
  const L = pal.light;
  const E = pal.eye;
  const draw = (breath, blink) => sprite(64, 42, (g) => {
    const by = breath;
    const tail = [[44, 32], [52, 31], [57, 27], [59, 32], [55, 37], [46, 39]];
    for (let i = 0; i < tail.length - 1; i++) line(g, ...tail[i], ...tail[i + 1], B, i < 2 ? 4 : 3);
    poly(g, [[47, 37], [40, 34], [41, 40]], pal.fin);
    poly(g, [[34, 23 - by], [55, 11 - by], [50, 26], [41, 31]], M);
    line(g, 34, 23 - by, 55, 11 - by, L);
    ellipse(g, 34, 30 - by, 15, 8 + by, B);
    ellipse(g, 33, 26 - by, 10, 3, M);
    poly(g, [[28, 23 - by], [11, 10 - by], [21, 25], [30, 31]], M);
    line(g, 28, 23 - by, 11, 10 - by, L);
    ellipse(g, 24, 36, 3, 2, B);
    ellipse(g, 39, 37, 3, 2, B);
    px(g, 22, 37, L);
    px(g, 37, 38, L);
    poly(g, [[18, 21], [26, 14], [22, 23]], B);
    poly(g, [[12, 21], [7, 14], [16, 22]], B);
    ellipse(g, 16, 27, 8, 6, B);
    ellipse(g, 13, 31, 6, 3, B);
    ellipse(g, 15, 24, 5, 2, M);
    if (blink) {
      rect(g, 10, 27, 3, 1, E);
      rect(g, 17, 27, 3, 1, E);
    } else {
      rect(g, 10, 26, 3, 2, E);
      rect(g, 17, 26, 3, 2, E);
      rect(g, 11, 26, 1, 2, '#05070a');
      rect(g, 18, 26, 1, 2, '#05070a');
    }
    px(g, 11, 31, '#05070a');
    px(g, 15, 31, '#05070a');
  }, true);
  return [draw(0, false), draw(1, false), draw(0, true), draw(1, true)];
}

// Flying dragon, 72x60, with the ground point at (36, 40). Each frame has an
// `under` layer, an optional `over` layer drawn on top of the rider, and a seat.
function buildFlyingDragon(pal) {
  const W = 72;
  const H = 60;
  const cx = 36;
  const B = pal.body;
  const M = pal.wing;
  const L = pal.light;
  const D = pal.dark;
  const E = pal.eye;
  const FIN = pal.fin;
  const { tip: TIP, span: SPAN, sway: SWAY } = DRAGON_FLAP;
  const set = { down: [], up: [], right: [], left: [] };

  const wingPair = (g, f, y) => {
    const sp = SPAN[f];
    const tip = TIP[f];
    for (const s of [-1, 1]) {
      const P = (dx, dy) => [cx + s * dx, y + dy];
      poly(g, [P(4, -5), P(33 * sp, -9 + tip), P(26 * sp, 2 + tip * 0.6), P(17 * sp, tip * 0.35), P(10 * sp, 5 + tip * 0.15), P(4, 4)], M);
      line(g, ...P(4, -5), ...P(33 * sp, -9 + tip), L, 2);
      line(g, ...P(14 * sp, -6 + tip * 0.4), ...P(26 * sp, 2 + tip * 0.6), D);
      line(g, ...P(11 * sp, -5 + tip * 0.3), ...P(17 * sp, tip * 0.35), D);
    }
  };
  const tail = (g, pts) => {
    for (let i = 0; i < pts.length - 1; i++) line(g, ...pts[i], ...pts[i + 1], B, 4 - i);
  };

  for (let f = 0; f < 4; f++) {
    const sw = SWAY[f];

    const downUnder = sprite(W, H, (g) => {
      tail(g, [[cx, 22], [cx + sw, 14], [cx - sw, 8], [cx, 4]]);
      poly(g, [[cx, 6], [cx - 5, 2], [cx - 1, 9]], FIN);
      poly(g, [[cx, 6], [cx + 5, 2], [cx + 1, 9]], FIN);
      wingPair(g, f, 26);
      ellipse(g, cx - 5, 35, 2, 2, B);
      ellipse(g, cx + 5, 35, 2, 2, B);
      ellipse(g, cx, 28, 7, 10, B);
      ellipse(g, cx, 25, 4, 6, M);
    });
    const downOver = sprite(W, H, (g) => {
      ellipse(g, cx, 38, 4, 4, B);
      poly(g, [[cx - 4, 41], [cx - 9, 36], [cx - 2, 39]], B);
      poly(g, [[cx + 4, 41], [cx + 9, 36], [cx + 2, 39]], B);
      ellipse(g, cx, 43, 6, 5, B);
      ellipse(g, cx, 41, 4, 2, M);
      rect(g, cx - 4, 43, 2, 2, E);
      rect(g, cx + 2, 43, 2, 2, E);
      px(g, cx - 2, 47, '#05070a');
      px(g, cx + 1, 47, '#05070a');
    });
    set.down.push({ under: downUnder, over: downOver, seat: [cx, 27] });

    const upUnder = sprite(W, H, (g) => {
      ellipse(g, cx, 18, 4, 4, B);
      poly(g, [[cx - 4, 12], [cx - 9, 18], [cx - 2, 15]], B);
      poly(g, [[cx + 4, 12], [cx + 9, 18], [cx + 2, 15]], B);
      ellipse(g, cx, 12, 6, 5, B);
      ellipse(g, cx, 11, 4, 2, M);
      wingPair(g, f, 26);
      ellipse(g, cx, 28, 7, 10, B);
      ellipse(g, cx, 30, 4, 6, M);
      tail(g, [[cx, 36], [cx + sw, 44], [cx - sw, 50], [cx, 54]]);
      poly(g, [[cx, 53], [cx - 5, 57], [cx - 1, 50]], FIN);
      poly(g, [[cx, 53], [cx + 5, 57], [cx + 1, 50]], FIN);
    });
    set.up.push({ under: upUnder, over: null, seat: [cx, 27] });

    const sf = [1, 0.75, 0.45, 0.75][f];
    const sn = [0.35, 0.75, 1, 0.75][f];
    const side = sprite(W, H, (g) => {
      poly(g, [[32, 26], [44, 26], [30, 26 - 22 * sf], [22, 26 - 13 * sf]], D);
      line(g, 44, 26, 30, 26 - 22 * sf, L, 2);
      tail(g, [[26, 30], [16, 30 + sw], [8, 27 - sw], [4, 22]]);
      poly(g, [[4, 23], [1, 17], [7, 21]], FIN);
      poly(g, [[4, 23], [1, 27], [7, 25]], FIN);
      ellipse(g, 31, 35, 2, 2, B);
      ellipse(g, 41, 35, 2, 2, B);
      ellipse(g, 36, 29, 11, 6, B);
      ellipse(g, 36, 26, 8, 2, M);
      line(g, 45, 27, 52, 22, B, 5);
      poly(g, [[52, 18], [45, 13], [55, 20]], B);
      ellipse(g, 56, 21, 6, 4, B);
      poly(g, [[58, 19], [66, 21], [65, 24], [58, 25]], B);
      ellipse(g, 55, 19, 3, 1, M);
      rect(g, 58, 20, 2, 2, E);
      px(g, 58, 20, '#05070a');
      px(g, 64, 22, '#05070a');
      poly(g, [[32, 32], [44, 32], [30, 32 + 20 * sn], [22, 32 + 11 * sn]], M);
      line(g, 44, 32, 30, 32 + 20 * sn, L, 2);
    });
    set.right.push({ under: side, over: null, seat: [37, 25] });
    set.left.push({ under: mirror(side), over: null, seat: [W - 37, 25] });
  }
  return set;
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
  kid: { id: 'kid', hair: '#5a3418', hairStyle: 'short', tunic: '#8a7550' },
  girl: { id: 'girl', hair: '#f2d064', hairStyle: 'long', tunic: '#3c6ca3', pants: '#3d4f6e' },
  archer: { id: 'archer', hair: '#3d2414', hairStyle: 'short', tunic: '#55703c' },
  guard: { id: 'guard', hair: '#8a5a2e', hairStyle: 'helmet', beard: '#8a5a2e', tunic: '#6b4a2e', collar: '#c9ae84' },
  villager: { id: 'villager', hair: '#2e1e12', hairStyle: 'short', tunic: '#8f3b2e' },
  fisher: { id: 'fisher', hair: '#8a7b6a', hairStyle: 'short', beard: '#8a7b6a', tunic: '#3b5c6c' },
  hermit: { id: 'hermit', hair: '#b9b4ab', hairStyle: 'long', beard: '#b9b4ab', tunic: '#5b5a3a', collar: '#8a7a5a' },
  mom: { id: 'mom', hair: '#7a4320', hairStyle: 'long', tunic: '#7b5a8f', apron: '#e9dcc0', collar: '#c9ae84' },
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
function drawCharacter(g, look, dir, frame, carry = false, run = false) {
  const sk = look.skin || PAL.skin;
  const hair = look.hair;
  const tun = look.tunic;
  const tunD = shade(tun, -0.25);
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
    if (look.collar) rect(g, 4, 10 + b, 8, 1, look.collar);
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
    } else {
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
  if (look.collar) rect(g, 5 + lx, 10 + b, 6, 1, look.collar);
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

function charSprite(look, dir, frame, carry = false, run = false) {
  const key = `${look.id}|${!!look.pack}|${dir}|${frame}|${carry}|${run}`;
  let c = charCache.get(key);
  if (!c) {
    const d = dir === 'left' ? 'right' : dir;
    c = sprite(16, 24, (g) => drawCharacter(g, look, d, frame, carry, run), true);
    if (dir === 'left') c = mirror(c);
    charCache.set(key, c);
  }
  return c;
}

// ---------- registry ----------

function buildSprites() {
  const def = (key, o) => {
    const img = o.img || o.frames[0];
    SPR[key] = { ox: Math.floor(img.width / 2), oy: img.height - 1, ...o };
  };

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
    berries: buildBerries(), coconut: buildCoconut(), stone: buildPebble(), wool: buildWool(),
    hammer: buildHammer(), bow: buildBow(), sword: buildSword(), shield: buildShield(), spear: buildSpear(),
    rod: buildRod(), fish: buildFish(), pickaxe: buildPickaxe(), iron: buildIron(),
  };
  SPR.held = { axe: SPR.axe, sword: buildHeldSword(), hammer: buildHeldHammer(), spear: buildHeldSpear(), pickaxe: buildHeldPickaxe() };
  def('ore', { img: buildOre(false), foot: { w: 18, h: 6 }, shadow: { rx: 11, ry: 3 } });
  def('oreSpent', { img: buildOre(true) });
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
  def('throne', { img: buildThrone(), foot: { w: 22, h: 8 } });
  def('backpack', { img: SPR.icon.backpack, shadow: { rx: 5, ry: 2 } });
  const wallMap = buildWallMap();
  def('wallMap', { img: wallMap, oy: wallMap.height + 3 });
  def('bushPink', { img: buildBush('#f25c9a'), foot: { w: 12, h: 4 } });
  def('bushYellow', { img: buildBush('#f7d046'), foot: { w: 12, h: 4 } });
  def('rock', { img: buildRock(true) });
  def('stone', { img: buildRock(false), foot: { w: 10, h: 4 } });
  def('barrel', { img: buildBarrel(), foot: { w: 12, h: 6 }, shadow: { rx: 6, ry: 2 } });
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
  def('bonfire', {
    frames: buildBonfireFrames(), fps: 10, foot: { w: 28, h: 9 },
    light: { dx: 0, dy: -10, r: 72, color: '#ff9a3a' },
  });
  SPR.flyDragon = {};
  SPR.heldEgg = {};
  SPR.babyDragon = {};
  for (const [id, pal] of Object.entries(DRAGON_SPECIES)) {
    const frames = buildDragonFrames(pal);
    def(`dragon_${id}`, {
      frames,
      foot: { w: 46, h: 12 },
      shadow: { rx: 24, ry: 4 },
      pick: (t, o) => frames[((t + o.phase) % 3.7 < 0.18 ? 2 : 0) + (Math.floor(t * 1.4) % 2)],
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
    SPR.flyDragon[id] = addFlyingDiagonals(buildFlyingDragon(pal), pal);
    SPR.heldEgg[id] = buildHeldEgg(pal.egg);
    SPR.babyDragon[id] = DRAGON_SCALES.map((_, stage) => buildBabyDragon(pal, stage));
  }
  SPR.clouds = [1, 2, 3, 4].map(buildCloud);

  const palm = buildPalm();
  const bare = buildPalm(false);
  def('palm', { img: palm, pick: (t, o) => (o.shaken ? bare : palm), foot: { w: 6, h: 4 }, shadow: { rx: 9, ry: 3 } });
  def('menhir', { img: buildMenhir(), foot: { w: 10, h: 5 }, shadow: { rx: 6, ry: 2 }, light: { dx: 0, dy: -14, r: 14, color: '#6fb6ff' } });
  [['peak', 112, 100, 0.42], ['peak2', 104, 92, 0.48], ['peakB', 84, 74, 0.32], ['peakC', 56, 48, 0.22]].forEach(([k, w, h, snow], i) => {
    for (let v = 0; v < 3; v++) def(`${k}-${v}`, { img: buildPeak(w, h, 1 + i * 3 + v, snow * (0.85 + v * 0.15)) });
  });
  def('volcano', { img: buildVolcano(), light: { dx: 0, dy: -96, r: 40, color: '#ff6a1a' } });
  def('snowPine', { img: buildPine(true, true), foot: { w: 8, h: 5 }, shadow: { rx: 10, ry: 3 } });
  def('jungleTree', { img: buildJungleTree(), foot: { w: 10, h: 5 }, shadow: { rx: 14, ry: 4 } });
  def('fern', { img: buildFern(), foot: { w: 10, h: 3 } });
  def('boulder', { img: buildBoulder('grey'), foot: { w: 24, h: 8 }, shadow: { rx: 13, ry: 3 } });
  def('boulderSnow', { img: buildBoulder('snow'), foot: { w: 24, h: 8 }, shadow: { rx: 13, ry: 3 } });
  def('boulderDark', { img: buildBoulder('dark'), foot: { w: 24, h: 8 }, shadow: { rx: 13, ry: 3 } });
  def('deadTree', { img: buildDeadTree(), foot: { w: 6, h: 4 }, shadow: { rx: 8, ry: 2 } });
  def('column', { img: buildColumn(), foot: { w: 12, h: 5 }, shadow: { rx: 7, ry: 2 } });
  def('ruinWall', { img: buildRuinWall(), foot: { w: 32, h: 6 } });
  const nest = buildNest();
  def('nest', { img: nest, oy: nest.height - 4 });
  def('cairn', { img: buildCairn(), foot: { w: 10, h: 4 }, shadow: { rx: 7, ry: 2 } });
  def('logPile', { img: buildLogPile(), foot: { w: 30, h: 6 }, shadow: { rx: 16, ry: 3 } });
  def('iceCrystal', { img: buildIceCrystal(), foot: { w: 14, h: 4 }, light: { dx: 0, dy: -12, r: 16, color: '#9fdcff' } });
  def('scarecrow', { img: buildScarecrow(), foot: { w: 4, h: 3 } });
  SPR.sheep = buildSheep();

  const side = buildShip();
  const ne = buildShipDiagonal(false);
  const se = buildShipDiagonal(true);
  // seat = where the rider's waist meets the gunwale
  def('ship', {
    img: side,
    bob: 1.5,
    dirs: {
      right: { img: side, ox: 52, oy: 80, seat: [30, 62] },
      left: { img: mirror(side), ox: 52, oy: 80, seat: [74, 62] },
      down: { img: buildShipVertical(true), ox: 32, oy: 86, seat: [32, 69] },
      up: { img: buildShipVertical(false), ox: 32, oy: 86, seat: [32, 73] },
      ne: { img: ne, ox: 52, oy: 88, seat: [44, 69] },
      nw: { img: mirror(ne), ox: 52, oy: 88, seat: [60, 69] },
      se: { img: se, ox: 52, oy: 88, seat: [60, 69] },
      sw: { img: mirror(se), ox: 52, oy: 88, seat: [44, 69] },
    },
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
}
