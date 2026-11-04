const MAP_W = 160;
const MAP_H = 120;
// The village is authored in its own 64x48 coordinate space, placed here in the world.
const OX = 48;
const OY = 36;
const T = { WATER: 0, GRASS: 1, PATH: 2, WOOD: 3, DIRT: 4, CLIFF: 5, STAIRS: 6, FALL: 7, HAY: 8, SAND: 9 };

const map = new Uint8Array(MAP_W * MAP_H);
const woodNS = new Uint8Array(MAP_W * MAP_H);
const seaDist = new Uint8Array(MAP_W * MAP_H);

const inBounds = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
const tileAt = (x, y) => (inBounds(x, y) ? map[y * MAP_W + x] : T.WATER);
const setTile = (x, y, t) => { if (inBounds(x, y)) map[y * MAP_W + x] = t; };
const isLand = (t) => t === T.GRASS || t === T.PATH || t === T.DIRT || t === T.HAY || t === T.STAIRS || t === T.SAND;
const isSolidTile = (t) => t === T.WATER || t === T.CLIFF || t === T.FALL;

// village-local tile access
const lt = (x, y) => tileAt(x + OX, y + OY);
const ls = (x, y, t) => setTile(x + OX, y + OY, t);

function fill(x0, y0, x1, y1, t, only) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!only || only.includes(lt(x, y))) ls(x, y, t);
    }
  }
}

function boardwalk(x0, y0, x1, y1, northSouth) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = lt(x, y);
      if (t === T.WATER || t === T.CLIFF) {
        ls(x, y, T.WOOD);
        woodNS[(y + OY) * MAP_W + x + OX] = northSouth ? 1 : 0;
      }
    }
  }
}

const ISLANDS = [
  { x: 132, y: 24, rx: 10, ry: 8, sandy: false, seed: 11 },
  { x: 136, y: 94, rx: 8, ry: 6, sandy: true, seed: 12 },
  { x: 16, y: 98, rx: 9, ry: 8, sandy: false, seed: 13 },
  { x: 24, y: 16, rx: 6, ry: 5, sandy: true, seed: 14 },
  { x: 88, y: 108, rx: 5, ry: 4, sandy: true, seed: 15 },
];

function computeSeaDist() {
  const q = [];
  for (let i = 0; i < map.length; i++) {
    if (map[i] === T.WATER || map[i] === T.WOOD) seaDist[i] = 255;
    else { seaDist[i] = 0; q.push(i); }
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % MAP_W;
    const y = (i - x) / MAP_W;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!inBounds(x + dx, y + dy)) continue;
        const j = i + dy * MAP_W + dx;
        if (seaDist[j] > seaDist[i] + 1) { seaDist[j] = seaDist[i] + 1; q.push(j); }
      }
    }
  }
}

function generateMap() {
  // village island and the river's west bank
  for (let y = -12; y < 60; y++) {
    for (let x = -16; x < 64; x++) {
      const wobble = (hash(x >> 1, y >> 1, 7) - 0.5) * 0.18;
      const nx = (x + 0.5 - 32) / 22;
      const ny = (y + 0.5 - 23) / 21;
      let land = Math.abs(nx) ** 3 + Math.abs(ny) ** 3 < 1 + wobble;
      const bx = (x + 0.5 + 4) / 9.5;
      const by = (y + 0.5 - 23.5) / 32;
      const bank = 4 + (hash(0, y >> 1, 8) > 0.6 ? 1 : 0);
      if (x <= bank && bx ** 4 + by ** 4 < 1 + wobble * 0.5) land = true;
      if (land) ls(x, y, T.GRASS);
    }
  }

  for (const isl of ISLANDS) {
    for (let y = isl.y - isl.ry - 2; y <= isl.y + isl.ry + 2; y++) {
      for (let x = isl.x - isl.rx - 2; x <= isl.x + isl.rx + 2; x++) {
        const d = Math.abs((x + 0.5 - isl.x) / isl.rx) ** 2.6 + Math.abs((y + 0.5 - isl.y) / isl.ry) ** 2.6;
        if (d < 1 + (hash(x >> 1, y >> 1, isl.seed) - 0.5) * 0.3) setTile(x, y, T.GRASS);
      }
    }
  }

  // smooth out single-tile noise
  const copy = map.slice();
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && copy[(y + dy) * MAP_W + x + dx] === T.GRASS) n++;
      const i = y * MAP_W + x;
      if (copy[i] === T.GRASS && n < 3) map[i] = T.WATER;
      else if (copy[i] === T.WATER && n > 5) map[i] = T.GRASS;
    }
  }

  // beaches: whole shoreline on sandy islands, north shores elsewhere
  for (const isl of ISLANDS) {
    const r = isl.sandy ? 2 : 1;
    const marks = [];
    for (let y = isl.y - isl.ry - 3; y <= isl.y + isl.ry + 3; y++) {
      for (let x = isl.x - isl.rx - 3; x <= isl.x + isl.rx + 3; x++) {
        if (tileAt(x, y) !== T.GRASS) continue;
        let wet = false;
        if (isl.sandy) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (tileAt(x + dx, y + dy) === T.WATER) wet = true;
        } else {
          wet = tileAt(x, y - 1) === T.WATER;
        }
        if (wet) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) setTile(x, y, T.SAND);
  }

  // waterfall basin on the west bank, fed by a stream from a pond
  fill(0, 7, 5, 12, T.WATER);
  fill(1, -2, 3, 6, T.WATER);
  fill(0, -5, 4, -3, T.WATER);

  // cliff faces below every south-facing grassy shore
  const grass = Array.from(map, (t) => t === T.GRASS);
  for (let y = 1; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      if (map[i] !== T.WATER) continue;
      if (grass[i - MAP_W] || (y > 1 && grass[i - 2 * MAP_W] && map[i - MAP_W] === T.CLIFF)) map[i] = T.CLIFF;
    }
  }
  fill(1, 7, 3, 8, T.FALL);

  // upper plateau with the great hall
  fill(6, 12, 63, 13, T.CLIFF, [T.GRASS]);
  fill(31, 12, 33, 13, T.STAIRS);

  // roads and plaza
  const G = [T.GRASS];
  for (let y = 14; y < 33; y++) {
    for (let x = 22; x < 43; x++) {
      const dx = (x + 0.5 - 32.5) / 9.3;
      const dy = (y + 0.5 - 23.5) / 8.3;
      if (dx * dx + dy * dy < 1 && lt(x, y) === T.GRASS) ls(x, y, T.PATH);
    }
  }
  fill(26, 10, 38, 11, T.PATH, G);
  fill(31, 14, 33, 16, T.PATH, G);
  fill(0, 19, 25, 21, T.PATH, G);
  fill(12, 18, 21, 18, T.DIRT, G);
  fill(13, 26, 24, 27, T.PATH, G);
  fill(16, 36, 30, 37, T.PATH, G);
  fill(31, 30, 33, 44, T.PATH, G);
  fill(40, 26, 56, 28, T.PATH, G);
  fill(37, 31, 43, 36, T.DIRT, G);
  fill(34, 33, 36, 34, T.DIRT, G);
  fill(42, 15, 49, 18, T.HAY, G);

  // bridges, docks, and the southern stairs
  boardwalk(2, 19, 13, 21, false);
  boardwalk(48, 26, 57, 28, false);
  boardwalk(56, 21, 57, 34, true);
  fill(31, 44, 33, 46, T.STAIRS, [T.CLIFF, T.WATER]);
  boardwalk(31, 47, 33, 51, true);

  // a ring of standing stones on the south-west isle
  for (let y = 94; y <= 101; y++) {
    for (let x = 12; x <= 21; x++) {
      const inRing = ((x + 0.5 - 16.5) / 3.8) ** 2 + ((y + 0.5 - 97.5) / 3) ** 2 < 1;
      if (inRing && tileAt(x, y) === T.GRASS) setTile(x, y, T.DIRT);
    }
  }

  computeSeaDist();
}

// ---------- ground rendering ----------

function blendGrass(g, x, y, X, Y) {
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    if (tileAt(x + dx, y + dy) !== T.GRASS) continue;
    for (let i = 0; i < 16; i++) {
      const d = hash(x * 16 + i, y * 16 + dx * 3 + dy * 5, 14) < 0.5 ? 1 : 2;
      if (dy) rect(g, X + i, dy < 0 ? Y : Y + 16 - d, 1, d, PAL.grass);
      else rect(g, dx < 0 ? X : X + 16 - d, Y + i, d, 1, PAL.grass);
    }
  }
}

function speckle(g, x, y, X, Y, base, light, dark, n = 14) {
  rect(g, X, Y, 16, 16, base);
  for (let i = 0; i < n; i++) {
    px(g, X + Math.floor(hash(x, y, 400 + i) * 16), Y + Math.floor(hash(x, y, 500 + i) * 16), hash(x, y, 600 + i) < 0.5 ? light : dark);
  }
}

function grassTile(g, x, y, X, Y) {
  speckle(g, x, y, X, Y, PAL.grass, PAL.grassLight, PAL.grassDark, 12);
  if (hash(x, y, 4) < 0.4) {
    const tx = X + 3 + Math.floor(hash(x, y, 5) * 10);
    const ty = Y + 4 + Math.floor(hash(x, y, 6) * 9);
    px(g, tx, ty, PAL.grassDark);
    px(g, tx - 1, ty - 1, PAL.grassTuft);
    px(g, tx + 1, ty - 1, PAL.grassTuft);
    px(g, tx, ty - 1, PAL.grassLight);
  }
  const edge = (t) => t === T.WATER || t === T.FALL || t === T.CLIFF;
  const n = tileAt(x, y - 1);
  if (n === T.WATER || n === T.FALL) {
    rect(g, X, Y, 16, 1, PAL.rockDark);
    rect(g, X, Y + 1, 16, 1, PAL.grassDark);
  }
  if (edge(tileAt(x - 1, y))) { rect(g, X, Y, 2, 16, PAL.rock); rect(g, X, Y, 1, 16, PAL.rockDark); }
  if (edge(tileAt(x + 1, y))) { rect(g, X + 14, Y, 2, 16, PAL.rock); rect(g, X + 15, Y, 1, 16, PAL.rockDark); }
  if (n === T.CLIFF) {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(X, Y, 16, 4);
  }
}

function cobbleTile(g, x, y, X, Y) {
  rect(g, X, Y, 16, 16, PAL.path);
  for (let r = 0; r < 4; r++) {
    const yy = Y + r * 4;
    let xx = X - Math.floor(hash(x, y * 4 + r, 11) * 5);
    while (xx < X + 16) {
      const w = 4 + Math.floor(hash(xx, yy, 12) * 4);
      const a = Math.max(xx, X);
      const b = Math.min(xx + w - 1, X + 16);
      if (b > a) {
        const c = hash(xx, yy, 13);
        const col = c < 0.3 ? PAL.stoneLight : c < 0.75 ? PAL.stone : PAL.stoneDark;
        rect(g, a, yy, b - a, 3, col);
        rect(g, a, yy + 2, b - a, 1, shade(col, -0.12));
        px(g, a, yy, shade(col, 0.2));
      }
      xx += w;
    }
  }
  blendGrass(g, x, y, X, Y);
}

function waterTile(g, x, y, X, Y) {
  const open = (t) => t === T.WATER || t === T.WOOD;
  const d = seaDist[y * MAP_W + x];
  const near = d <= 1;
  const deep = d > 6;
  rect(g, X, Y, 16, 16, near ? PAL.water : deep ? PAL.ocean : PAL.waterDeep);
  if (d === 6 || d === 7) {
    g.fillStyle = d === 6 ? PAL.ocean : PAL.waterDeep;
    for (let yy = 0; yy < 16; yy++) for (let xx = (yy + d) % 2; xx < 16; xx += 2) if (hash(X + xx, Y + yy, 16) < 0.5) g.fillRect(X + xx, Y + yy, 1, 1);
  }
  for (let i = 0; i < 3; i++) {
    if (hash(x, y, 50 + i) < 0.5) {
      rect(g, X + Math.floor(hash(x, y, 60 + i) * 12), Y + Math.floor(hash(x, y, 70 + i) * 15), 3 + (i === 0 ? 1 : 0), 1, near ? '#55a2ea' : deep ? '#2a66bb' : '#3a84d8');
    }
  }
  const n = tileAt(x, y - 1);
  if (!open(n)) {
    rect(g, X, Y, 16, 1, PAL.foam);
    for (let i = 0; i < 16; i++) if (hash(X + i, Y, 15) < 0.5) px(g, X + i, Y + 1, '#a9d7f7');
  }
  if (!open(tileAt(x - 1, y))) rect(g, X, Y, 1, 16, '#a9d7f7');
  if (!open(tileAt(x + 1, y))) rect(g, X + 15, Y, 1, 16, '#a9d7f7');
  if (!open(tileAt(x, y + 1))) rect(g, X, Y + 15, 16, 1, '#a9d7f7');
  if (n === T.WOOD) {
    g.fillStyle = 'rgba(10,30,70,0.35)';
    g.fillRect(X, Y, 16, 4);
    rect(g, X + 2, Y, 3, 6, PAL.woodDeep);
    rect(g, X + 11, Y, 3, 6, PAL.woodDeep);
  }
}

function cliffTile(g, x, y, X, Y) {
  rect(g, X, Y, 16, 16, PAL.rockDeep);
  for (let r = 0; r < 4; r++) {
    const yy = Y + r * 4;
    let xx = X - Math.floor(hash(x, y * 4 + r, 21) * 6);
    while (xx < X + 16) {
      const w = 5 + Math.floor(hash(xx, yy, 22) * 4);
      const a = Math.max(xx, X);
      const b = Math.min(xx + w - 1, X + 16);
      if (b > a) {
        const c = hash(xx, yy, 23);
        const col = c < 0.25 ? PAL.rockLight : c < 0.7 ? PAL.rock : PAL.rockDark;
        rect(g, a, yy, b - a, 3, col);
        rect(g, a, yy, b - a, 1, shade(col, 0.15));
      }
      xx += w;
    }
  }
  if (isLand(tileAt(x, y - 1))) {
    rect(g, X, Y, 16, 3, PAL.grass);
    rect(g, X, Y, 16, 1, PAL.grassLight);
    for (let i = 0; i < 16; i++) {
      if (hash(X + i, Y, 24) < 0.5) px(g, X + i, Y + 3, PAL.grass);
      px(g, X + i, Y + (hash(X + i, Y, 24) < 0.5 ? 4 : 3), PAL.grassDark);
    }
  }
  if (tileAt(x, y + 1) !== T.CLIFF) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(X, Y + 13, 16, 3);
  }
  if (tileAt(x - 1, y) !== T.CLIFF) rect(g, X, Y, 1, 16, PAL.rockDeep);
  if (tileAt(x + 1, y) !== T.CLIFF) rect(g, X + 15, Y, 1, 16, PAL.rockDeep);
}

function stairsTile(g, x, y, X, Y) {
  rect(g, X, Y, 16, 16, PAL.rockDark);
  for (let k = 0; k < 4; k++) {
    rect(g, X, Y + k * 4, 16, 3, PAL.rockLight);
    rect(g, X, Y + k * 4, 16, 1, '#c6c5c9');
  }
  if (tileAt(x - 1, y) !== T.STAIRS) rect(g, X, Y, 2, 16, PAL.rockDeep);
  if (tileAt(x + 1, y) !== T.STAIRS) rect(g, X + 14, Y, 2, 16, PAL.rockDeep);
}

function woodTile(g, x, y, X, Y) {
  const ns = woodNS[y * MAP_W + x];
  rect(g, X, Y, 16, 16, PAL.woodDark);
  for (let k = 0; k < 4; k++) {
    const c = hash(x, y * 4 + k, 31) < 0.3 ? PAL.woodLight : PAL.wood;
    if (ns) {
      rect(g, X, Y + k * 4, 16, 3, c);
      px(g, X + 2, Y + k * 4 + 1, PAL.woodDeep);
      px(g, X + 13, Y + k * 4 + 1, PAL.woodDeep);
    } else {
      rect(g, X + k * 4, Y, 3, 16, c);
      px(g, X + k * 4 + 1, Y + 2, PAL.woodDeep);
      px(g, X + k * 4 + 1, Y + 13, PAL.woodDeep);
    }
  }
  const open = (t) => t === T.WATER || t === T.CLIFF;
  if (open(tileAt(x - 1, y))) rect(g, X, Y, 2, 16, PAL.woodDeep);
  if (open(tileAt(x + 1, y))) rect(g, X + 14, Y, 2, 16, PAL.woodDeep);
  if (open(tileAt(x, y - 1))) rect(g, X, Y, 16, 2, PAL.woodDeep);
  if (open(tileAt(x, y + 1))) rect(g, X, Y + 13, 16, 3, PAL.woodDeep);
}

function decorTile(g, x, y, X, Y) {
  if (tileAt(x, y) !== T.GRASS) return;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (tileAt(x + dx, y + dy) !== T.GRASS) return;
  if (hash(x, y, 700) < 0.09) {
    const colors = ['#f25c78', '#ffffff', '#f7d046', '#b77cf2', '#ff8a3d'];
    const col = colors[Math.floor(hash(x, y, 701) * colors.length)];
    const n = 3 + Math.floor(hash(x, y, 702) * 3);
    for (let i = 0; i < n; i++) {
      const fx = X + 3 + Math.floor(hash(x, y, 710 + i) * 10);
      const fy = Y + 3 + Math.floor(hash(x, y, 720 + i) * 10);
      px(g, fx, fy + 2, PAL.grassDark);
      px(g, fx - 1, fy, col);
      px(g, fx + 1, fy, col);
      px(g, fx, fy - 1, col);
      px(g, fx, fy + 1, col);
      px(g, fx, fy, col === '#f7d046' ? '#c0582a' : '#ffe680');
    }
  } else if (hash(x, y, 703) < 0.03) {
    const sx = X + 4 + Math.floor(hash(x, y, 704) * 8);
    const sy = Y + 4 + Math.floor(hash(x, y, 705) * 8);
    rect(g, sx, sy, 3, 2, PAL.rock);
    px(g, sx, sy, PAL.rockLight);
  }
}

function renderGround() {
  const c = makeCanvas(MAP_W * TILE, MAP_H * TILE);
  const g = c.getContext('2d');
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const X = x * TILE;
      const Y = y * TILE;
      switch (tileAt(x, y)) {
        case T.GRASS: grassTile(g, x, y, X, Y); break;
        case T.PATH: cobbleTile(g, x, y, X, Y); break;
        case T.DIRT: speckle(g, x, y, X, Y, PAL.dirt, PAL.dirtLight, PAL.dirtDark); blendGrass(g, x, y, X, Y); break;
        case T.HAY:
          speckle(g, x, y, X, Y, PAL.hay, PAL.hayLight, PAL.hayDark, 10);
          for (let i = 0; i < 6; i++) {
            const sx = X + Math.floor(hash(x, y, 800 + i) * 13);
            const sy = Y + Math.floor(hash(x, y, 810 + i) * 14);
            line(g, sx, sy, sx + 2, sy + 1, i % 2 ? PAL.hayLight : PAL.hayDark);
          }
          break;
        case T.SAND:
          speckle(g, x, y, X, Y, PAL.sand, PAL.sandLight, PAL.sandDark, 12);
          if (hash(x, y, 820) < 0.12) px(g, X + 3 + Math.floor(hash(x, y, 821) * 10), Y + 3 + Math.floor(hash(x, y, 822) * 10), '#f7e3e0');
          blendGrass(g, x, y, X, Y);
          break;
        case T.WOOD: woodTile(g, x, y, X, Y); break;
        case T.CLIFF: cliffTile(g, x, y, X, Y); break;
        case T.STAIRS: stairsTile(g, x, y, X, Y); break;
        case T.FALL: rect(g, X, Y, 16, 16, '#5aa6ec'); break;
        default: waterTile(g, x, y, X, Y);
      }
    }
  }
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) decorTile(g, x, y, x * TILE, y * TILE);
  return c;
}

// ---------- objects & npcs ----------

const objects = [];

function addAbs(key, tx, ty) {
  const o = { key, x: Math.round(tx * TILE), y: Math.round(ty * TILE), phase: hash(Math.round(tx * 10), Math.round(ty * 10), 99) * 10 };
  objects.push(o);
  return o;
}

const addObj = (key, tx, ty) => addAbs(key, tx + OX, ty + OY);

function addTree(key, tx, ty) {
  if (lt(Math.floor(tx), Math.floor(ty - 0.01)) === T.GRASS) addObj(key, tx, ty);
}

const VILLAGE_NPCS = [
  { look: 'chief', x: 32.5, y: 11.6, roam: 1.5, line: 'Welcome to the Hidden World, Eli.' },
  { look: 'smith', x: 21, y: 19.8, roam: 1.5, line: 'Mind the sparks, lad!' },
  { look: 'merchant', x: 15.5, y: 24.5, fixed: 'down', line: 'Fresh bread! Still warm.' },
  { look: 'kid', x: 39.5, y: 17.5, roam: 1.5, line: 'The dragon winked at me!' },
  { look: 'girl', x: 40.5, y: 28, roam: 3, line: 'Lovely day for flying.' },
  { look: 'archer', x: 40, y: 35.5, fixed: 'up', line: "Shh... I'm aiming." },
  { look: 'guard', x: 29.6, y: 43.6, fixed: 'down', line: 'Stay close to the village.' },
  { look: 'villager', x: 26, y: 27, roam: 4, line: 'Have you seen my sheep?' },
  { look: 'fisher', x: 56.9, y: 24, roam: 2, line: "She's yours to sail. Mind the rocks!" },
];

const NPCS = [
  ...VILLAGE_NPCS.map((n) => ({ ...n, x: n.x + OX, y: n.y + OY })),
  { look: 'hermit', x: 131, y: 26, roam: 2.5, line: 'Few sail this far out...' },
];

const PLAYER_START = { x: 32.5 + OX, y: 27.5 + OY };

function placeObjects() {
  // great hall plateau
  addObj('hall', 32.5, 10);
  addObj('torch', 30.5, 10.9);
  addObj('torch', 34.5, 10.9);
  addObj('bannerRed', 25.5, 11.6);
  addObj('bannerRed', 39.5, 11.6);
  addObj('bushPink', 24.2, 10.4);
  addObj('bushYellow', 40.8, 10.4);

  // forge & market
  addObj('forge', 16.5, 18);
  addObj('anvil', 19.6, 18.9);
  addObj('barrel', 22.2, 18.6);
  addObj('stall', 15.5, 25.5);
  addObj('barrel', 18.6, 25.6);
  addObj('barrel', 19.5, 25.8);
  addObj('bushPink', 12.4, 25.9);

  // houses
  addObj('house', 17, 36);
  addObj('barrel', 13.4, 36.1);
  addObj('bushYellow', 21.2, 36);
  addObj('houseB', 44, 25.5);
  addObj('barrel', 47.3, 25.7);
  addObj('barrel', 48.2, 25.5);
  addObj('bannerRed', 40.6, 25.9);

  // plaza
  addObj('bonfire', 32.5, 23.7);
  addObj('bannerBlue', 29.5, 20.4);
  addObj('bannerBlue', 35.5, 20.4);

  // dragon pen
  for (let x = 41; x <= 49; x++) {
    addObj('fenceH', x + 0.5, 15);
    addObj('fenceH', x + 0.5, 20);
  }
  addObj('post', 50.25, 15);
  addObj('post', 50.25, 20);
  for (let y = 15; y <= 18; y++) {
    addObj('fenceV', 41.25, y + 1);
    addObj('fenceV', 50.25, y + 1);
  }
  addObj('dragon', 45.8, 18.9);

  // archery range
  addObj('target', 38.5, 32.4);
  addObj('target', 41.2, 32.4);
  addObj('barrel', 43.3, 35.6);

  // southern gate
  for (let x = 18; x <= 46; x++) {
    if (x >= 30 && x <= 34) continue;
    if (lt(x, 40) === T.GRASS) addObj('fenceH', x + 0.5, 41);
  }
  addObj('post', 46.75 + 0.5, 41);
  addObj('pillarL', 30.5, 41.2);
  addObj('pillarR', 34.5, 41.2);
  addObj('torch', 29.4, 42.3);
  addObj('torch', 35.6, 42.3);
  addObj('bannerRed', 28.3, 41.8);
  addObj('bannerRed', 36.7, 41.8);

  // docks
  addObj('barrel', 54.6, 26.5);
  addObj('barrel', 57.6, 33.6);
  addObj('barrel', 33.6, 51.6);
  addObj('ship', 60.9, 31.5).dir = 'right';
  addObj('rock', 60, 9);
  addObj('rock', 61.5, 41);
  addObj('rock', 8.5, 4);
  addObj('rock', 47, 46.5);

  // outer islands
  addAbs('houseB', 132, 24);
  addAbs('barrel', 135.3, 24.2);
  addAbs('bonfire', 128.5, 26.8);
  for (const [x, y] of [[133, 92.5], [137.5, 95], [140, 93.2], [24.5, 16.4], [22, 18], [88.5, 108.6]]) addAbs('palm', x, y);
  addAbs('stone', 135.2, 97);
  addAbs('stone', 26, 18.2);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    addAbs('menhir', 16.5 + Math.cos(a) * 3.2, 97.9 + Math.sin(a) * 2.4);
  }

  // sea rocks, kept clear of shores and the ship's mooring
  const seaRng = mulberry32(77);
  let rocks = 0;
  for (let i = 0; i < 3000 && rocks < 30; i++) {
    const tx = Math.floor(seaRng() * MAP_W);
    const ty = Math.floor(seaRng() * MAP_H);
    if (seaDist[ty * MAP_W + tx] < 5 || Math.hypot(tx - (OX + 61), ty - (OY + 31)) < 10) continue;
    if (objects.some((o) => o.key === 'rock' && Math.hypot(o.x / TILE - tx, o.y / TILE - ty) < 8)) continue;
    addAbs('rock', tx + 0.5, ty + 1);
    rocks++;
  }

  // hand-placed trees
  for (const [k, x, y] of [
    ['pine', 19.5, 7], ['pine2', 22.5, 5.2], ['pine', 44.5, 6], ['pine2', 43.5, 9.6], ['pine', 15.5, 10.4],
    ['pine2', 48.5, 10.8], ['pine', 11.5, 17], ['oak', 25.5, 31], ['oak', 27.5, 34.5], ['pine', 12.5, 30],
    ['pine2', 11.5, 33], ['pine', 22.5, 38.6], ['pine2', 47.5, 38], ['pine', 50.5, 31], ['oak', 52.5, 22.4],
    ['pine2', 51.5, 35], ['pine', 21, 29], ['oak', 36.5, 39.3],
  ]) addTree(k, x, y);

  // scattered forest
  const rng = mulberry32(1337);
  const homes = NPCS.map((n) => [n.x * TILE, n.y * TILE]).concat([[PLAYER_START.x * TILE, PLAYER_START.y * TILE]]);
  let placed = 0;
  for (let i = 0; i < 3000 && placed < 75; i++) {
    const tx = Math.floor(rng() * MAP_W);
    const ty = Math.floor(rng() * MAP_H);
    let ok = true;
    for (let dy = -2; dy <= 0 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) if (tileAt(tx + dx, ty + dy) !== T.GRASS) ok = false;
    if (!ok) continue;
    const ax = (tx + 0.5) * TILE;
    const ay = (ty + 1) * TILE;
    if (objects.some((o) => Math.abs(o.x - ax) < 40 + (SPR[o.key].img?.width ?? 0) / 2 && Math.abs(o.y - ay) < 36)) continue;
    if (homes.some(([hx, hy]) => Math.hypot(hx - ax, hy - ay) < 44)) continue;
    const r = rng();
    addAbs(r < 0.45 ? 'pine' : r < 0.8 ? 'pine2' : 'oak', tx + 0.5, ty + 1);
    placed++;
  }
}

const colliders = [];

function placeCollider(o) {
  const f = SPR[o.key].foot;
  Object.assign(o.col, { x0: o.x - f.w / 2, y0: o.y - f.h, x1: o.x + f.w / 2, y1: o.y });
}

function buildColliders() {
  for (const o of objects) {
    if (!SPR[o.key].foot) continue;
    o.col = { off: false };
    placeCollider(o);
    colliders.push(o.col);
  }
}
