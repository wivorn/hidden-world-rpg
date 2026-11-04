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

function buildStall() {
  return sprite(68, 60, (g) => {
    rect(g, 6, 16, 3, 42, PAL.woodDark);
    rect(g, 59, 16, 3, 42, PAL.woodDark);
    for (let y = 4; y < 20; y++) {
      const t = (y - 4) / 16;
      const xl = 8 - 6 * t;
      const xr = 60 + 6 * t;
      const sw = (xr - xl) / 8;
      for (let i = 0; i < 8; i++) {
        const a = Math.round(xl + i * sw);
        const b = Math.round(xl + (i + 1) * sw);
        rect(g, a, y, b - a, 1, i % 2 ? PAL.cream : PAL.red);
      }
    }
    for (let i = 0; i < 8; i++) ellipse(g, 6 + i * 8, 20, 3, 2, i % 2 ? PAL.cream : PAL.red);
    rect(g, 3, 40, 62, 18, PAL.wood);
    for (let y = 44; y < 58; y += 4) rect(g, 3, y, 62, 1, PAL.woodDark);
    rect(g, 2, 38, 64, 3, PAL.woodLight);
    rect(g, 2, 41, 64, 1, PAL.woodDeep);
    for (let i = 0; i < 5; i++) {
      const bx = 12 + i * 11;
      ellipse(g, bx, 35, 4, 2, '#c98a3c');
      rect(g, bx - 2, 34, 3, 1, '#ecbd70');
    }
  });
}

// ---------- nature ----------

function buildPine(dark) {
  const L = dark ? '#357d34' : PAL.leaf;
  const LL = dark ? '#4c9c3e' : PAL.leafLight;
  const LD = dark ? PAL.leafDeep : PAL.leafDark;
  return sprite(32, 50, (g) => {
    const cx = 16;
    rect(g, cx - 2, 38, 4, 10, PAL.woodDark);
    rect(g, cx - 2, 38, 1, 10, PAL.wood);
    const tiers = [
      { top: 24, bot: 42, hw: 14 },
      { top: 16, bot: 34, hw: 12 },
      { top: 8, bot: 25, hw: 9 },
      { top: 2, bot: 15, hw: 6 },
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

function buildPalm() {
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
    ellipse(g, 20, 15, 2, 2, '#6b4a2a');
    ellipse(g, 23, 16, 2, 2, '#5a3d22');
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

// Size of the young dragon after eating 0-4 fish; the fifth fish grows it into the rideable dragon.
const DRAGON_SCALES = [1, 1.25, 1.5, 1.75, 2];

// Baby fury-style dragon in the species' colours: big slit eyes, ear flaps and one coloured tail fin.
// Drawn at `s` times its hatchling size (26x23, ground point (13, 22)); `ox`/`oy` give the ground point.
// Frame 0 folds the wings, frame 1 raises them.
function buildBabyDragon(pal, s = 1) {
  const { rect, px, ellipse, poly, line } = scaledPen(s);
  const B = pal.body;
  const D = pal.dark;
  const L = pal.light;
  const W = pal.wing;
  const EYE = pal.eye;
  const GLINT = pal.glint;
  const PUPIL = '#0b0d12';
  const RED = pal.fin;
  const set = { down: [], up: [], right: [], left: [], ox: 1 + Math.round(12 * s), oy: Math.round(21 * s) + 1 };
  const baby = (draw) => sprite(Math.ceil(24 * s) + 2, set.oy + 1, (g) => {
    g.translate(1, 0);
    draw(g);
  });
  const wings = (g, up) => {
    for (const s of [-1, 1]) {
      const P = (dx, dy) => [12 + s * dx, dy];
      const tip = up ? P(10, 4) : P(11, 14);
      poly(g, [P(3, 11), tip, up ? P(9, 10) : P(7, 16), P(4, 15)], W);
      line(g, ...P(3, 11), ...tip, L);
    }
  };
  // Two big ear flaps swept out to the sides, two small nubs between them.
  const ears = (g) => {
    poly(g, [[8, 5], [2, 2], [5, 6], [8, 8]], B);
    poly(g, [[16, 5], [22, 2], [19, 6], [16, 8]], B);
    poly(g, [[10, 4], [9, 1], [11, 3]], B);
    poly(g, [[14, 4], [15, 1], [13, 3]], B);
  };

  for (let f = 0; f < 2; f++) {
    const up = f === 1;
    set.down.push(baby((g) => {
      wings(g, up);
      line(g, 16, 19, 20, 18, B, 2);
      line(g, 20, 18, 21, 15, B);
      poly(g, [[21, 15], [23, 11], [22, 16]], B);
      poly(g, [[21, 15], [18, 12], [20, 16]], RED);
      ellipse(g, 9, 20, 2, 1, D);
      ellipse(g, 15, 20, 2, 1, D);
      ellipse(g, 12, 16, 5, 4, B);
      ellipse(g, 12, 15, 3, 2, L);
      ears(g);
      ellipse(g, 12, 8, 6, 5, B);
      ellipse(g, 11, 5, 3, 1, L);
      rect(g, 7, 7, 3, 4, EYE);
      rect(g, 14, 7, 3, 4, EYE);
      rect(g, 8, 8, 1, 2, PUPIL);
      rect(g, 15, 8, 1, 2, PUPIL);
      px(g, 7, 7, GLINT);
      px(g, 14, 7, GLINT);
      px(g, 11, 11, D);
      px(g, 13, 11, D);
      px(g, 10, 12, L);
      rect(g, 11, 13, 3, 1, L);
      px(g, 14, 12, L);
    }));
    set.up.push(baby((g) => {
      ellipse(g, 9, 20, 2, 1, D);
      ellipse(g, 15, 20, 2, 1, D);
      ellipse(g, 12, 16, 5, 4, B);
      ears(g);
      ellipse(g, 12, 8, 6, 5, B);
      ellipse(g, 12, 6, 4, 2, L);
      for (const y of [12, 14, 16]) px(g, 12, y, L);
      wings(g, up);
      line(g, 13, 19, 17, 21, B, 2);
      poly(g, [[17, 21], [21, 21], [19, 18]], B);
      poly(g, [[17, 20], [19, 17], [16, 18]], RED);
    }));
    const side = baby((g) => {
      line(g, 8, 17, 4, 16, B, 2);
      line(g, 4, 16, 2, 12, B);
      poly(g, [[3, 12], [1, 7], [5, 10]], RED);
      poly(g, [[2, 13], [0, 10], [4, 12]], B);
      ellipse(g, 9, 20, 2, 1, D);
      ellipse(g, 15, 20, 2, 1, D);
      ellipse(g, 11, 16, 6, 4, B);
      ellipse(g, 11, 14, 4, 1, L);
      px(g, 9, 12, L);
      px(g, 7, 13, L);
      poly(g, [[13, 6], [8, 3], [11, 7], [13, 9]], B);
      poly(g, [[15, 5], [14, 1], [17, 4]], B);
      ellipse(g, 15, 9, 5, 4.5, B);
      ellipse(g, 15, 6, 3, 1, L);
      ellipse(g, 19, 11, 3, 2, B);
      px(g, 21, 10, D);
      rect(g, 16, 7, 3, 4, EYE);
      rect(g, 17, 8, 1, 2, PUPIL);
      px(g, 16, 7, GLINT);
      line(g, 18, 13, 21, 12, L);
      poly(g, up ? [[9, 13], [13, 12], [8, 3], [5, 7]] : [[8, 13], [13, 12], [6, 17], [3, 14]], W);
      line(g, 13, 12, ...(up ? [8, 3] : [6, 17]), L);
    });
    set.right.push(side);
    set.left.push(mirror(side));
  }
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
  const TIP = [-13, -4, 8, -4];
  const SPAN = [0.85, 1, 0.8, 1];
  const SWAY = [0, 1, 0, -1];
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

function buildShip() {
  return sprite(104, 94, (g) => {
    rect(g, 50, 4, 4, 60, PAL.woodDark);
    line(g, 52, 5, 95, 61, '#3a2a1c');
    line(g, 52, 5, 9, 61, '#3a2a1c');
    for (let y = 11; y < 56; y++) {
      const t = (y - 11) / 45;
      const bulge = Math.sin(t * Math.PI) * 3;
      const xl = 22 - bulge - t * 2;
      const xr = 82 + bulge + t * 2;
      const sw = (xr - xl) / 7;
      for (let i = 0; i < 7; i++) {
        const a = Math.round(xl + i * sw);
        const b = Math.round(xl + (i + 1) * sw);
        let c = i % 2 ? PAL.red : PAL.cream;
        if (y > 50) c = shade(c, -0.15);
        rect(g, a, y, b - a, 1, c);
      }
    }
    rect(g, 18, 8, 68, 3, PAL.woodDark);
    rect(g, 18, 8, 68, 1, PAL.wood);
    ellipse(g, 52, 32, 11, 11, PAL.cream);
    glyph(g, EMBLEM, 45, 26, PAL.red, 2);
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
  merchant: { id: 'merchant', hair: '#b8452a', hairStyle: 'long', tunic: '#3f7a4a' },
  kid: { id: 'kid', hair: '#5a3418', hairStyle: 'short', tunic: '#8a7550' },
  girl: { id: 'girl', hair: '#f2d064', hairStyle: 'long', tunic: '#3c6ca3', pants: '#3d4f6e' },
  archer: { id: 'archer', hair: '#3d2414', hairStyle: 'short', tunic: '#55703c' },
  guard: { id: 'guard', hair: '#8a5a2e', hairStyle: 'helmet', beard: '#8a5a2e', tunic: '#6b4a2e', collar: '#c9ae84' },
  villager: { id: 'villager', hair: '#2e1e12', hairStyle: 'short', tunic: '#8f3b2e' },
  fisher: { id: 'fisher', hair: '#8a7b6a', hairStyle: 'short', beard: '#8a7b6a', tunic: '#3b5c6c' },
  hermit: { id: 'hermit', hair: '#b9b4ab', hairStyle: 'long', beard: '#b9b4ab', tunic: '#5b5a3a', collar: '#8a7a5a' },
};

const EYE = '#2a1a10';
const METAL = '#8f9098';
const METAL_D = '#66676e';
const BONE = '#efe3c4';

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
    if (style === 'helmet') {
      rect(g, 5, 1 + b, 6, 1, METAL);
      rect(g, 4, 2 + b, 8, 3, METAL);
      rect(g, 3, 5 + b, 10, 1, METAL_D);
      if (dir === 'down') rect(g, 7, 6 + b, 2, 2, METAL);
      px(g, 2, 3 + b, BONE); px(g, 2, 2 + b, BONE); px(g, 1, 1 + b, BONE);
      px(g, 13, 3 + b, BONE); px(g, 13, 2 + b, BONE); px(g, 14, 1 + b, BONE);
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
  if (style === 'helmet') {
    rect(g, 5 + lx, 1 + b, 6, 1, METAL);
    rect(g, 4 + lx, 2 + b, 8, 3, METAL);
    rect(g, 3 + lx, 5 + b, 10, 1, METAL_D);
    px(g, 3 + lx, 3 + b, BONE); px(g, 2 + lx, 2 + b, BONE); px(g, 2 + lx, 1 + b, BONE);
    px(g, 12 + lx, 3 + b, BONE); px(g, 13 + lx, 2 + b, BONE); px(g, 13 + lx, 1 + b, BONE);
  }
  if (carry) {
    rect(g, 7 + lx, 10 + b, 4, 1, tunD);
    rect(g, 10 + lx, 2 + b, 2, 9, tunD);
    rect(g, 10 + lx, 1 + b, 2, 1, sk);
  }
}

const charCache = new Map();

function charSprite(look, dir, frame, carry = false, run = false) {
  const key = `${look.id}|${dir}|${frame}|${carry}|${run}`;
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
  const hall = sprite(144, 110, (g) => drawLonghouse(g, 144, 110, {
    gableW: 76, doorW: 22, doorH: 28, openDoor: true, banner: true, windows: [16, 38, 96, 118], windowY: 74,
  }));
  def('house', { img: house, foot: { w: 66, h: 14 } });
  def('houseB', { img: houseB, foot: { w: 66, h: 14 } });
  def('hall', { img: hall, foot: { w: 130, h: 20 } });
  def('forge', {
    img: buildForge(),
    foot: { w: 96, h: 14 },
    light: { dx: -27, dy: -12, r: 34, color: '#ff8a2a' },
    after: (g, x, y, t) => {
      g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 13) * Math.sin(t * 7.3);
      rect(g, x - 50 + 16, y - 79 + 63, 15, 11, '#ffb23a');
      rect(g, x - 50 + 19, y - 79 + 67, 9, 6, '#fff0a0');
      g.globalAlpha = 1;
    },
  });
  def('stall', { img: buildStall(), foot: { w: 64, h: 14 } });
  def('pine', { img: buildPine(false), foot: { w: 8, h: 5 }, shadow: { rx: 10, ry: 3 } });
  def('pine2', { img: buildPine(true), foot: { w: 8, h: 5 }, shadow: { rx: 10, ry: 3 } });
  def('oak', { img: buildOak(), foot: { w: 10, h: 5 }, shadow: { rx: 13, ry: 4 } });
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
    SPR.flyDragon[id] = buildFlyingDragon(pal);
    SPR.heldEgg[id] = buildHeldEgg(pal.egg);
    SPR.babyDragon[id] = DRAGON_SCALES.map((s) => buildBabyDragon(pal, s));
  }
  SPR.clouds = [1, 2, 3, 4].map(buildCloud);

  def('palm', { img: buildPalm(), foot: { w: 6, h: 4 }, shadow: { rx: 9, ry: 3 } });
  def('menhir', { img: buildMenhir(), foot: { w: 10, h: 5 }, shadow: { rx: 6, ry: 2 }, light: { dx: 0, dy: -14, r: 14, color: '#6fb6ff' } });
  SPR.sheep = buildSheep();

  const side = buildShip();
  // seat = where the rider's waist meets the gunwale
  def('ship', {
    img: side,
    bob: 1.5,
    dirs: {
      right: { img: side, ox: 52, oy: 80, seat: [30, 62] },
      left: { img: mirror(side), ox: 52, oy: 80, seat: [74, 62] },
      down: { img: buildShipVertical(true), ox: 32, oy: 86, seat: [32, 69] },
      up: { img: buildShipVertical(false), ox: 32, oy: 86, seat: [32, 73] },
    },
    after: (g, x, y, t, o) => {
      const w = 3 + Math.round(Math.sin(t * 2) * 2);
      g.globalAlpha = 0.6;
      if (o.dir === 'up' || o.dir === 'down') {
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
