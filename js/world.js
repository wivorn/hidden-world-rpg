const MAP_W = 480;
const MAP_H = 360;
// The village island is authored in its own 136x112 coordinate space, placed here in the world.
const OX = 172;
const OY = 124;
const T = {
  WATER: 0, GRASS: 1, PATH: 2, WOOD: 3, DIRT: 4, CLIFF: 5, STAIRS: 6, FALL: 7, HAY: 8, SAND: 9, FLOOR: 10, WALL: 11, VOID: 12, DOOR: 13,
  ROCK: 14, SNOW: 15, MOUNT: 16, SPRING: 17, ASH: 18, LAVA: 19, ICE: 20, FIELD: 21, JUNGLE: 22,
};
// Building interiors live in a strip of rows below the outdoor map.
const ROOM_Y = MAP_H + 2;
const ROWS = MAP_H + 16;

const map = new Uint8Array(MAP_W * ROWS);
const woodNS = new Uint8Array(MAP_W * ROWS);
const seaDist = new Uint8Array(MAP_W * ROWS);
// Lakes, rivers and pools: water that gets no sea cliffs.
const inland = new Uint8Array(MAP_W * MAP_H);
// Steps into the mountain mass, for its snow; 255 marks the volcano's black rock.
const elev = new Uint8Array(MAP_W * MAP_H);

const inBounds = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < ROWS;
const tileAt = (x, y) => (inBounds(x, y) ? map[y * MAP_W + x] : T.WATER);
const setTile = (x, y, t) => { if (inBounds(x, y)) map[y * MAP_W + x] = t; };
const WALKABLE = new Set([T.GRASS, T.PATH, T.DIRT, T.HAY, T.STAIRS, T.SAND, T.ROCK, T.SNOW, T.ASH, T.ICE, T.FIELD, T.JUNGLE]);
const isLand = (t) => WALKABLE.has(t);
const isSolidTile = (t) => t === T.WATER || t === T.CLIFF || t === T.FALL || t === T.WALL || t === T.VOID || t === T.MOUNT || t === T.LAVA || t === T.SPRING;
const isWet = (t) => t === T.WATER || t === T.SPRING;

// village-local tile access
const lt = (x, y) => tileAt(x + OX, y + OY);
const ls = (x, y, t) => setTile(x + OX, y + OY, t);

// Smooth value noise in 0..1 with features about `s` tiles across.
function vnoise(x, y, s, seed) {
  const fx = x / s;
  const fy = y / s;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const u = fx - ix;
  const v = fy - iy;
  const su = u * u * (3 - 2 * u);
  const sv = v * v * (3 - 2 * v);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}

function fillA(x0, y0, x1, y1, t, only) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!only || only.includes(tileAt(x, y))) setTile(x, y, t);
    }
  }
}
const fill = (x0, y0, x1, y1, t, only) => fillA(x0 + OX, y0 + OY, x1 + OX, y1 + OY, t, only);

function boardwalkA(x0, y0, x1, y1, northSouth) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = tileAt(x, y);
      if (t === T.WATER || t === T.CLIFF) {
        setTile(x, y, T.WOOD);
        woodNS[y * MAP_W + x] = northSouth ? 1 : 0;
      }
    }
  }
}
const boardwalk = (x0, y0, x1, y1, ns) => boardwalkA(x0 + OX, y0 + OY, x1 + OX, y1 + OY, ns);

// An east-west bridge over whatever water lies in the box, squared off to span it in one piece.
function bridge(x0, y0, x1, y1) {
  let a = x1;
  let b = x0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (lt(x, y) === T.WATER) { a = Math.min(a, x); b = Math.max(b, x); }
  for (let y = y0; y <= y1; y++) {
    for (let x = a - 1; x <= b + 1; x++) {
      ls(x, y, T.WOOD);
      woodNS[(y + OY) * MAP_W + x + OX] = 0;
    }
  }
}

// Calls fn for every tile within `r` of the polyline.
function alongLine(pts, r, fn) {
  const seen = new Set();
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[k + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.ceil(Math.max(ay, by) + r); y++) {
      for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.ceil(Math.max(ax, bx) + r); x++) {
        const u = Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / len2));
        if (Math.hypot(x + 0.5 - ax - u * dx, y + 0.5 - ay - u * dy) >= r || seen.has(x * 4096 + y)) continue;
        seen.add(x * 4096 + y);
        fn(x, y);
      }
    }
  }
}

// Calls fn for every tile inside an ellipse whose edge is roughened by noise.
function inBlob(cx, cy, rx, ry, seed, rough, fn) {
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) {
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d < 1 + (vnoise(x, y, 3, seed) - 0.5) * rough) fn(x, y);
    }
  }
}

const wetL = (x, y) => {
  ls(x, y, T.WATER);
  if (inBounds(x + OX, y + OY)) inland[(y + OY) * MAP_W + x + OX] = 1;
};
const wetA = (x, y) => {
  setTile(x, y, T.WATER);
  if (inBounds(x, y)) inland[y * MAP_W + x] = 1;
};

const ISLANDS = [
  { id: 'hermit', x: 396, y: 70, rx: 17, ry: 12, ground: T.GRASS, beach: 1, seed: 11 },
  { id: 'jungle', x: 410, y: 280, rx: 22, ry: 15, ground: T.JUNGLE, beach: 2, seed: 12 },
  { id: 'ruin', x: 52, y: 292, rx: 20, ry: 15, ground: T.GRASS, beach: 1, seed: 13 },
  { id: 'frozen', x: 70, y: 60, rx: 20, ry: 14, ground: T.SNOW, beach: 0, seed: 14 },
  { id: 'speck', x: 262, y: 326, rx: 5, ry: 4, ground: T.SAND, beach: 0, seed: 15 },
  { id: 'volcano', x: 250, y: 50, rx: 24, ry: 17, ground: T.ASH, beach: 0, seed: 16 },
];
const isle = (id) => ISLANDS.find((i) => i.id === id);
// The volcano's cone stands on the black-rock tiles of its foot; x, y is the middle of its base.
const VOLCANO = { x: 250, y: 53 };

// village landmarks, in village tiles
const mtnEdge = (x) => 30.5 + 2.2 * Math.sin(x * 0.13 + 1) + (vnoise(x, 0, 6, 21) - 0.5) * 5 - Math.max(0, 38 - x) * 1.7;
const passX = (y) => 63.5 + 2.5 * Math.sin(y * 0.33);
const SPRINGS = [[105.5, 36.6, 2.8, 2], [112.2, 35.2, 3.6, 2.5], [118.2, 38.4, 2.5, 1.7]];
const CLEARING = { x: 20, y: 57, rx: 6.5, ry: 4.5 };
const BAY = { x: 85, y: 104, rx: 10.5, ry: 6.5 };

function computeSeaDist() {
  const q = [];
  for (let i = 0; i < map.length; i++) {
    if (map[i] === T.WATER || map[i] === T.WOOD || i >= MAP_W * MAP_H) seaDist[i] = 255;
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

function computeElev() {
  const q = [];
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    if (elev[i] === 255) continue;
    if (map[i] === T.MOUNT) elev[i] = 254;
    else { elev[i] = 0; q.push(i); }
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % MAP_W;
    for (const j of [i - MAP_W, i + MAP_W, x > 0 ? i - 1 : -1, x < MAP_W - 1 ? i + 1 : -1]) {
      if (j < 0 || j >= MAP_W * MAP_H || elev[j] !== 254) continue;
      elev[j] = Math.min(250, elev[i] + 1);
      q.push(j);
    }
  }
}

function generateMap() {
  // the village island
  for (let y = -3; y < 115; y++) {
    for (let x = -3; x < 139; x++) {
      const nx = (x + 0.5 - 68) / 64;
      const ny = (y + 0.5 - 56) / 52;
      const n = vnoise(x, y, 10, 7) - 0.5 + (vnoise(x, y, 4, 8) - 0.5) * 0.35;
      if (Math.abs(nx) ** 2.6 + Math.abs(ny) ** 2.6 < 1 + n * 0.3) ls(x, y, T.GRASS);
    }
  }
  for (const isl of ISLANDS) {
    const s = Math.max(3, Math.min(isl.rx, isl.ry) / 2.2);
    for (let y = isl.y - isl.ry - 3; y <= isl.y + isl.ry + 3; y++) {
      for (let x = isl.x - isl.rx - 3; x <= isl.x + isl.rx + 3; x++) {
        const d = Math.abs((x + 0.5 - isl.x) / isl.rx) ** 2.6 + Math.abs((y + 0.5 - isl.y) / isl.ry) ** 2.6;
        if (d < 1 + (vnoise(x, y, s, isl.seed) - 0.5) * 0.5) setTile(x, y, isl.ground);
      }
    }
  }

  // smooth out single-tile noise
  const copy = map.slice();
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      const i = y * MAP_W + x;
      let n = 0;
      let land = T.GRASS;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = copy[i + dy * MAP_W + dx];
          if ((dx || dy) && t !== T.WATER) { n++; land = t; }
        }
      }
      if (copy[i] !== T.WATER && n < 3) map[i] = T.WATER;
      else if (copy[i] === T.WATER && n > 5) map[i] = land;
    }
  }

  // beaches: whole shoreline on sandy isles, north shores elsewhere
  for (const isl of ISLANDS) {
    if (!isl.beach) continue;
    const r = isl.beach;
    const marks = [];
    for (let y = isl.y - isl.ry - 3; y <= isl.y + isl.ry + 3; y++) {
      for (let x = isl.x - isl.rx - 3; x <= isl.x + isl.rx + 3; x++) {
        if (tileAt(x, y) !== isl.ground) continue;
        let wet = r === 1 && tileAt(x, y - 1) === T.WATER;
        if (r === 2) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (tileAt(x + dx, y + dy) === T.WATER) wet = true;
        if (wet) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) setTile(x, y, T.SAND);
  }

  villageTerrain();
  islandTerrain();

  // cliff faces below every south-facing shore
  const shore = Uint8Array.from(map, (t) => t === T.GRASS || t === T.SNOW || t === T.ASH || t === T.ROCK || t === T.MOUNT || t === T.JUNGLE);
  for (let y = 1; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      if (map[i] !== T.WATER || inland[i]) continue;
      if (shore[i - MAP_W] || (y > 1 && shore[i - 2 * MAP_W] && map[i - MAP_W] === T.CLIFF)) map[i] = T.CLIFF;
    }
  }

  villageGround();
  buildRooms();
  computeSeaDist();
  computeElev();
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    if (map[i] === T.SPRING) springTiles.push(i);
    if (map[i] === T.LAVA && (map[i - 1] === T.WATER || map[i + 1] === T.WATER || map[i + MAP_W] === T.WATER || map[i + MAP_W] === T.CLIFF)) lavaShore.push(i);
  }
}

// Mountains across the north with a pass up to a snowy valley, the stream and waterfall,
// the river through the forest, the hot springs, and the harbour bay.
function villageTerrain() {
  for (let y = -3; y < 42; y++) {
    for (let x = 22; x < 139; x++) if (lt(x, y) === T.GRASS && y < mtnEdge(x)) ls(x, y, T.MOUNT);
  }
  inBlob(66, 10, 11, 6.5, 22, 0.5, (x, y) => { if (lt(x, y) !== T.WATER) ls(x, y, T.SNOW); });
  for (let y = 12; y < 42; y++) {
    for (let x = 56; x < 72; x++) {
      if (Math.abs(x + 0.5 - passX(y)) < 1.7 + Math.max(0, y - 26) * 0.35 && lt(x, y) === T.MOUNT) ls(x, y, y < 21 ? T.SNOW : T.ROCK);
    }
  }
  inBlob(70, 9.5, 4.5, 2.2, 23, 0.4, (x, y) => { if (lt(x, y) === T.SNOW) ls(x, y, T.ICE); });
  // scree at the mountains' feet
  for (let y = 4; y < 44; y++) {
    for (let x = 22; x < 139; x++) {
      if (lt(x, y) !== T.GRASS) continue;
      let near = 9;
      for (let d = 1; d <= 3 && near > 3; d++) {
        if (lt(x, y - d) === T.MOUNT || lt(x - d, y) === T.MOUNT || lt(x + d, y) === T.MOUNT) near = d;
      }
      if (near === 1 || (near <= 3 && vnoise(x, y, 3, 24) > 0.3 + near * 0.12)) ls(x, y, T.ROCK);
    }
  }
  for (let y = 18; y < 43; y++) for (let x = 53; x <= 55; x++) if (lt(x, y) !== T.MOUNT) wetL(x, y);
  inBlob(53.5, 48.3, 4.2, 2.9, 25, 0.4, wetL);
  alongLine([[52, 48.5], [45, 51], [39, 55.5], [34, 61], [29, 68], [23, 76], [17, 83], [11, 90], [4, 98]], 1.8, wetL);
  inBlob(111, 36.5, 12, 6, 27, 0.5, (x, y) => { if (lt(x, y) === T.GRASS) ls(x, y, T.ROCK); });
  for (const [cx, cy, rx, ry] of SPRINGS) inBlob(cx, cy, rx, ry, 28, 0.8, (x, y) => { if (lt(x, y) === T.ROCK) ls(x, y, T.SPRING); });
  inBlob(BAY.x, BAY.y, BAY.rx, BAY.ry, 26, 0.3, (x, y) => ls(x, y, T.WATER));
  for (let y = Math.floor(BAY.y - BAY.ry - 3); y <= BAY.y + BAY.ry + 3; y++) {
    for (let x = Math.floor(BAY.x - BAY.rx - 3); x <= BAY.x + BAY.rx + 3; x++) {
      if (lt(x, y) === T.GRASS && ((x + 0.5 - BAY.x) / (BAY.rx + 2.5)) ** 2 + ((y + 0.5 - BAY.y) / (BAY.ry + 2.5)) ** 2 < 1) ls(x, y, T.SAND);
    }
  }
}

function villageGround() {
  const G = [T.GRASS];
  const GR = [T.GRASS, T.ROCK];
  const trail = (pts, t = T.DIRT) => alongLine(pts, 1.1, (x, y) => { if (GR.includes(lt(x, y))) ls(x, y, t); });

  // the shelf under the mountains, with the great hall at its head
  fill(46, 43, 136, 44, T.CLIFF, GR);
  fill(77, 43, 79, 44, T.STAIRS);
  fill(106, 43, 107, 44, T.STAIRS);
  fill(53, 43, 55, 44, T.FALL);
  fill(71, 41, 85, 42, T.PATH, GR);
  trail([[70.5, 41.5], [66.5, 38.5], [64, 35], [63.8, 31]]);
  trail([[63.5, 37], [57, 37], [47, 38], [40.5, 41], [34, 46.5], [28, 51.5], [22.5, 55.5]]);
  trail([[86, 41.5], [96, 40.5], [103, 40.5], [106.5, 42.5]]);
  trail([[106.5, 45], [107, 52], [106.5, 58.5]]);
  boardwalk(53, 36, 55, 38, false);

  // the main road from the hall down to the square, and on south to the gate and the harbour
  fill(77, 45, 79, 52, T.PATH, G);
  for (let y = 50; y < 71; y++) {
    for (let x = 64; x < 93; x++) {
      if (((x + 0.5 - 78.5) / 10.5) ** 2 + ((y + 0.5 - 60.5) / 7.5) ** 2 < 1 && lt(x, y) === T.GRASS) ls(x, y, T.PATH);
    }
  }
  fill(77, 67, 79, 97, T.PATH, G);
  fill(52, 59, 67, 61, T.PATH, G);
  fill(38, 59, 51, 61, T.DIRT, G);
  bridge(30, 59, 40, 61);
  trail([[30.5, 60], [26, 58.5], [22, 57]]);
  inBlob(CLEARING.x, CLEARING.y + 0.5, 3.2, 2, 29, 0.6, (x, y) => { if (lt(x, y) === T.GRASS) ls(x, y, T.DIRT); });
  fill(54, 58, 63, 58, T.DIRT, G);
  fill(90, 59, 106, 61, T.PATH, G);
  fill(107, 59, 116, 60, T.DIRT, G);
  fill(56, 78, 90, 79, T.PATH, G);
  fill(56, 86, 90, 87, T.PATH, G);
  fill(94, 74, 100, 79, T.DIRT, G);
  fill(112, 52, 119, 55, T.HAY, G);
  for (const [x, y] of [[108, 65], [117, 65], [108, 73], [117, 73]]) fill(x, y, x + 6, y + 5, T.FIELD, G);
  fill(115, 61, 116, 78, T.DIRT, G);
  boardwalk(79, 97, 80, 105, true);
}

function islandTerrain() {
  const h = isle('hermit');
  fillA(h.x + 3, h.y + 1, h.x + 6, h.y + 3, T.FIELD, [T.GRASS]);
  inBlob(h.x - 2, h.y + 1.5, 3.5, 1.6, 30, 0.5, (x, y) => { if (tileAt(x, y) === T.GRASS) setTile(x, y, T.DIRT); });

  const j = isle('jungle');
  inBlob(j.x - 7, j.y + 2, 5.5, 3.4, 31, 0.6, wetA);
  inBlob(j.x + 10, j.y - 3, 4.6, 3, 32, 0.6, wetA);
  inBlob(j.x - 7, j.y + 2, 7.5, 5, 39, 0.5, (x, y) => { if (tileAt(x, y) === T.JUNGLE) setTile(x, y, T.SAND); });

  // old paving round the ring of standing stones, and its avenue to the north beach
  const r = isle('ruin');
  const pave = (x, y) => {
    if (tileAt(x, y) !== T.GRASS || hash(x, y, 33) < 0.12) return;
    setTile(x, y, hash(x, y, 34) < 0.8 ? T.PATH : T.DIRT);
  };
  inBlob(r.x, r.y + 0.5, 7, 5, 35, 0.3, pave);
  for (let y = r.y - 16; y < r.y - 4; y++) for (let x = r.x - 1; x <= r.x + 1; x++) pave(x, y);

  const f = isle('frozen');
  inBlob(f.x + 3, f.y - 1, 6, 3.5, 36, 0.5, (x, y) => { if (tileAt(x, y) === T.SNOW) setTile(x, y, T.ICE); });
  inBlob(f.x - 8, f.y + 6, 2.5, 1.5, 37, 0.5, (x, y) => { if (tileAt(x, y) === T.SNOW) setTile(x, y, T.ICE); });

  // the cone stands on solid black rock matching its sprite's outline
  const H = 95 / TILE;
  for (let y = Math.floor(VOLCANO.y - H); y < VOLCANO.y; y++) {
    const t = ((VOLCANO.y - y - 0.5) / H) ** (1 / 1.6);
    const half = 1 + (1 - t) * 4.25 - 0.3;
    for (let x = Math.floor(VOLCANO.x - half); x < VOLCANO.x + half; x++) {
      if (Math.abs(x + 0.5 - VOLCANO.x) >= half || tileAt(x, y) !== T.ASH) continue;
      setTile(x, y, T.MOUNT);
      elev[y * MAP_W + x] = 255;
    }
  }
  const lava = (x, y) => { if (tileAt(x, y) === T.ASH) setTile(x, y, T.LAVA); };
  alongLine([[VOLCANO.x - 0.5, VOLCANO.y], [VOLCANO.x - 1.5, VOLCANO.y + 4], [VOLCANO.x, VOLCANO.y + 8], [VOLCANO.x - 1, VOLCANO.y + 12], [VOLCANO.x, VOLCANO.y + 18]], 0.9, lava);
  alongLine([[VOLCANO.x + 1.5, VOLCANO.y], [VOLCANO.x + 4, VOLCANO.y + 3], [VOLCANO.x + 6.5, VOLCANO.y + 5.5]], 0.8, lava);
  inBlob(VOLCANO.x + 7, VOLCANO.y + 6, 1.8, 1.2, 38, 0.4, lava);
}

// ---------- interiors ----------

// Furniture and NPC spots are in floor tiles from the room's top-left; `wall` items hang on the
// back wall at a floor column. The doorway is the bottom-middle tile.
const ROOMS = {
  home: {
    name: 'your house', w: 10, h: 6,
    wall: [['window', 1.5], ['shelf', 7.5], ['shield', 9.4]],
    rugs: [[2.5, 3, 4, 2.4, '#a8432f']],
    furniture: [['bed', 1, 2.1], ['hearth', 4.5, 0.2], ['backpack', 2.4, 1.6], ['table', 7, 3.9], ['stool', 5.6, 3.7], ['stool', 8.4, 3.7], ['chest', 9.2, 1], ['barrel', 0.6, 5.7]],
  },
  cottage: {
    name: 'the cottage', w: 8, h: 5,
    wall: [['window', 2], ['shelf', 6]],
    rugs: [[3, 2.6, 3, 2, '#4f7a8c']],
    furniture: [['bed', 1, 2.1], ['hearth', 4, 0.2], ['table', 6, 3.1], ['stool', 4.7, 2.9], ['yarnBasket', 7.3, 1], ['sacks', 0.9, 4.7]],
  },
  hall: {
    name: 'the great hall', w: 16, h: 9,
    wall: [['shield', 1.5], ['tapestry', 4], ['shield', 6], ['tapestry', 13], ['shield', 15.5]],
    rugs: [[6.5, 2, 4, 6.5, '#8a1d21']],
    furniture: [
      ['wallMap', 11, 0],
      ['throne', 8.5, 1.3], ['bonfire', 8.5, 5.6], ['torch', 0.6, 0.9], ['torch', 16.4, 0.9],
      ['bench', 3, 3.2], ['longTable', 3, 4.9], ['bench', 3, 6.2], ['bench', 13.5, 3.2], ['longTable', 13.5, 4.9], ['bench', 13.5, 6.2],
    ],
  },
  smithy: {
    name: 'the forge', w: 8, h: 5,
    wall: [['rack', 1.5], ['window', 4], ['rack', 6.5]],
    rugs: [],
    furniture: [['hearth', 4, 0.2], ['anvil', 4, 2.8], ['vat', 6.9, 1.4], ['table', 1.5, 1.6], ['barrel', 0.6, 4.6], ['sacks', 7.2, 4.7]],
  },
  hut: {
    name: 'the hermit\'s hut', w: 6, h: 4,
    wall: [['shelf', 1.2], ['window', 5]],
    rugs: [[2.2, 2.4, 2.5, 1.5, '#6a6a3a']],
    furniture: [['bed', 0.9, 2.1], ['hearth', 3.5, 0.2], ['stool', 4.7, 2.7], ['chest', 5.4, 1]],
  },
};

// Lay the rooms out left to right: walls take one column each side, two rows on top, one below.
{
  let x = 2;
  for (const r of Object.values(ROOMS)) {
    r.rx = x;
    r.ry = ROOM_Y;
    r.door = r.rx + 1 + Math.floor(r.w / 2);
    r.px = { x0: r.rx * TILE, y0: r.ry * TILE, x1: (r.rx + r.w + 2) * TILE, y1: (r.ry + r.h + 3) * TILE };
    x += r.w + 5;
  }
}

// Absolute tile coordinates of a spot given in a room's floor tiles.
const roomSpot = (r, x, y) => [r.rx + 1 + x, r.ry + 2 + y];

function buildRooms() {
  for (let y = MAP_H; y < ROWS; y++) for (let x = 0; x < MAP_W; x++) setTile(x, y, T.VOID);
  for (const r of Object.values(ROOMS)) {
    for (let y = r.ry; y <= r.ry + r.h + 2; y++) {
      for (let x = r.rx; x <= r.rx + r.w + 1; x++) {
        const inside = x > r.rx && x <= r.rx + r.w && y >= r.ry + 2 && y <= r.ry + r.h + 1;
        setTile(x, y, inside ? T.FLOOR : T.WALL);
      }
    }
    setTile(r.door, r.ry + r.h + 2, T.DOOR);
  }
}

const BEAM = '#3a2414';

function drawWallItem(g, kind, cx, top) {
  if (kind === 'window') {
    rect(g, cx - 7, top + 6, 14, 13, PAL.woodDeep);
    rect(g, cx - 6, top + 7, 12, 11, '#9fd2fa');
    rect(g, cx - 6, top + 7, 12, 3, '#d6efff');
    rect(g, cx - 1, top + 7, 2, 11, PAL.woodDark);
    rect(g, cx - 6, top + 12, 12, 1, PAL.woodDark);
    rect(g, cx - 8, top + 18, 16, 2, PAL.woodLight);
  } else if (kind === 'shelf') {
    rect(g, cx - 13, top + 17, 26, 2, PAL.woodLight);
    rect(g, cx - 13, top + 19, 26, 1, PAL.woodDeep);
    for (const x of [cx - 10, cx + 9]) rect(g, x, top + 20, 2, 4, PAL.woodDeep);
    const jars = [['#c8553a', 3, 4], ['#d8c8a0', 3, 3], ['#4f7a8c', 2, 5], ['#b8874f', 3, 4], ['#8a8f5a', 2, 3]];
    jars.forEach(([c, rx, h], i) => {
      const x = cx - 10 + i * 5;
      rect(g, x - rx + 1, top + 17 - h, rx * 2 - 1, h, c);
      px(g, x - rx + 1, top + 17 - h, shade(c, 0.35));
    });
  } else if (kind === 'shield') {
    drawShield(g, cx, top + 13, 6, PAL.red, PAL.cream);
  } else if (kind === 'tapestry') {
    rect(g, cx - 9, top + 3, 18, 2, PAL.woodDeep);
    rect(g, cx - 8, top + 5, 16, 20, PAL.red);
    rect(g, cx - 8, top + 5, 16, 1, '#d44a44');
    rect(g, cx + 6, top + 5, 2, 20, '#8a1d21');
    glyph(g, EMBLEM, cx - 4, top + 10, PAL.gold);
    for (let i = 0; i < 4; i++) rect(g, cx - 7 + i * 4, top + 25, 2, 2, PAL.gold);
  } else if (kind === 'rack') {
    rect(g, cx - 12, top + 8, 24, 2, PAL.woodDark);
    for (const [x, metal] of [[-8, true], [-2, false], [5, true]]) {
      rect(g, cx + x, top + 10, 2, 14, PAL.woodLight);
      if (metal) rect(g, cx + x - 2, top + 10, 5, 4, '#8b8b94');
      else rect(g, cx + x - 2, top + 10, 6, 3, '#56565e');
    }
  }
}

function drawRoom(g, r) {
  const X = r.rx * TILE;
  const Y = r.ry * TILE;
  const W = (r.w + 2) * TILE;
  const fy = Y + 2 * TILE;
  const fh = r.h * TILE;
  // floorboards
  for (let row = 0; row * 4 < fh; row++) {
    const y = fy + row * 4;
    const c = row % 3 === 0 ? '#a87444' : row % 3 === 1 ? '#9b6a3c' : '#8f6035';
    rect(g, X + TILE, y, r.w * TILE, 4, c);
    rect(g, X + TILE, y + 3, r.w * TILE, 1, '#6f4524');
    for (let x = X + TILE + ((row * 11) % 24); x < X + W - TILE; x += 24 + (row % 2) * 8) rect(g, x, y, 1, 3, '#6f4524');
  }
  for (const [x, y, w, h, c] of r.rugs) {
    const rx = X + TILE + x * TILE;
    const ry = fy + y * TILE;
    rect(g, rx, ry, w * TILE, h * TILE, shade(c, -0.3));
    rect(g, rx + 2, ry + 2, w * TILE - 4, h * TILE - 4, c);
    rect(g, rx + 5, ry + 5, w * TILE - 10, h * TILE - 10, shade(c, 0.15));
    rect(g, rx + 7, ry + 7, w * TILE - 14, h * TILE - 14, c);
  }
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(X + TILE, fy, r.w * TILE, 5);
  // back wall of stacked logs
  for (let i = 0; i < 4; i++) {
    const y = Y + i * 8;
    rect(g, X, y, W, 8, i % 2 ? '#7d4a24' : '#6a3d1d');
    rect(g, X, y + 1, W, 1, '#9b6334');
    rect(g, X, y + 7, W, 1, '#4a2914');
  }
  rect(g, X, Y, W, 3, BEAM);
  rect(g, X, fy - 2, W, 2, BEAM);
  for (const [kind, x] of r.wall) drawWallItem(g, kind, X + TILE + Math.round(x * TILE), Y);
  // side and front walls, seen from above
  for (const x of [X, X + W - TILE]) {
    rect(g, x, Y, TILE, (r.h + 3) * TILE, BEAM);
    rect(g, x === X ? x + TILE - 3 : x, fy, 3, fh + TILE, '#5a3418');
  }
  const by = fy + fh;
  rect(g, X, by, W, TILE, BEAM);
  rect(g, X + TILE, by, r.w * TILE, 3, '#5a3418');
  const dx = r.door * TILE;
  rect(g, dx, by, TILE, TILE, '#8f6035');
  rect(g, dx + 2, by + 1, TILE - 4, TILE - 3, '#c9a36a');
  for (let y = by + 4; y < by + TILE - 2; y += 3) rect(g, dx + 3, y, TILE - 6, 1, '#a8804f');
}

// ---------- ground tiles ----------

const SCREE = ['#8f897f', '#aaa499', '#716b63'];

function blendInto(g, x, y, X, Y, t, c) {
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    if (tileAt(x + dx, y + dy) !== t) continue;
    for (let i = 0; i < 16; i++) {
      const d = hash(x * 16 + i, y * 16 + dx * 3 + dy * 5, 14) < 0.5 ? 1 : 2;
      if (dy) rect(g, X + i, dy < 0 ? Y : Y + 16 - d, 1, d, c);
      else rect(g, dx < 0 ? X : X + 16 - d, Y + i, d, 1, c);
    }
  }
}
const blendGrass = (g, x, y, X, Y) => blendInto(g, x, y, X, Y, T.GRASS, PAL.grass);

function speckle(g, x, y, X, Y, base, light, dark, n = 14) {
  rect(g, X, Y, 16, 16, base);
  for (let i = 0; i < n; i++) {
    px(g, X + Math.floor(hash(x, y, 400 + i) * 16), Y + Math.floor(hash(x, y, 500 + i) * 16), hash(x, y, 600 + i) < 0.5 ? light : dark);
  }
}

// Rocky edges where open ground meets water, and shade under cliffs and mountains.
function rim(g, x, y, X, Y) {
  const edge = (t) => t === T.WATER || t === T.FALL || t === T.CLIFF;
  const n = tileAt(x, y - 1);
  if (n === T.WATER || n === T.FALL) rect(g, X, Y, 16, 1, PAL.rockDark);
  if (edge(tileAt(x - 1, y))) { rect(g, X, Y, 2, 16, PAL.rock); rect(g, X, Y, 1, 16, PAL.rockDark); }
  if (edge(tileAt(x + 1, y))) { rect(g, X + 14, Y, 2, 16, PAL.rock); rect(g, X + 15, Y, 1, 16, PAL.rockDark); }
  if (n === T.CLIFF || n === T.MOUNT) {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(X, Y, 16, 4);
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
  if (n === T.CLIFF || n === T.MOUNT) {
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

const SHORE_FILL = {
  [T.GRASS]: () => PAL.grass, [T.SAND]: () => PAL.sand, [T.JUNGLE]: () => PAL.jungle,
  [T.SNOW]: () => PAL.snow, [T.ASH]: () => PAL.ash, [T.ROCK]: () => SCREE[0],
};

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
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const a = SHORE_FILL[tileAt(x + sx, y)];
    if (!a || a !== SHORE_FILL[tileAt(x, y + sy)]) continue;
    const c = a();
    [5, 3, 2, 1, 1].forEach((w, k) => {
      const yy = sy < 0 ? Y + k : Y + 15 - k;
      rect(g, sx < 0 ? X : X + 16 - w, yy, w, 1, c);
      px(g, sx < 0 ? X + w : X + 15 - w, yy, sy < 0 && k === 0 ? PAL.foam : '#a9d7f7');
    });
  }
  if (n === T.WOOD) {
    g.fillStyle = 'rgba(10,30,70,0.35)';
    g.fillRect(X, Y, 16, 4);
    rect(g, X + 2, Y, 3, 6, PAL.woodDeep);
    rect(g, X + 11, Y, 3, 6, PAL.woodDeep);
  }
}

const LIPS = {
  [T.SNOW]: () => [PAL.snow, PAL.snowLight, PAL.snowDark],
  [T.ICE]: () => [PAL.snow, PAL.snowLight, PAL.snowDark],
  [T.ASH]: () => [PAL.ash, PAL.ashLight, PAL.ashDark],
  [T.ROCK]: () => SCREE,
};

function cliffTile(g, x, y, X, Y) {
  const up = tileAt(x, y - 1);
  const dark = up === T.ASH || tileAt(x, y - 2) === T.ASH;
  const [light, mid, low, deep] = dark ? ['#6a6163', PAL.ash, PAL.ashDark, PAL.basalt] : [PAL.rockLight, PAL.rock, PAL.rockDark, PAL.rockDeep];
  rect(g, X, Y, 16, 16, deep);
  for (let r = 0; r < 4; r++) {
    const yy = Y + r * 4;
    let xx = X - Math.floor(hash(x, y * 4 + r, 21) * 6);
    while (xx < X + 16) {
      const w = 5 + Math.floor(hash(xx, yy, 22) * 4);
      const a = Math.max(xx, X);
      const b = Math.min(xx + w - 1, X + 16);
      if (b > a) {
        const c = hash(xx, yy, 23);
        const col = c < 0.25 ? light : c < 0.7 ? mid : low;
        rect(g, a, yy, b - a, 3, col);
        rect(g, a, yy, b - a, 1, shade(col, 0.15));
      }
      xx += w;
    }
  }
  if (isLand(up)) {
    const [base, hi, lo] = LIPS[up] ? LIPS[up]() : [PAL.grass, PAL.grassLight, PAL.grassDark];
    rect(g, X, Y, 16, 3, base);
    rect(g, X, Y, 16, 1, hi);
    for (let i = 0; i < 16; i++) {
      if (hash(X + i, Y, 24) < 0.5) px(g, X + i, Y + 3, base);
      px(g, X + i, Y + (hash(X + i, Y, 24) < 0.5 ? 4 : 3), lo);
    }
  }
  if (tileAt(x, y + 1) !== T.CLIFF) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(X, Y + 13, 16, 3);
  }
  if (tileAt(x - 1, y) !== T.CLIFF) rect(g, X, Y, 1, 16, deep);
  if (tileAt(x + 1, y) !== T.CLIFF) rect(g, X + 15, Y, 1, 16, deep);
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

function screeTile(g, x, y, X, Y) {
  speckle(g, x, y, X, Y, SCREE[0], SCREE[1], SCREE[2], 18);
  for (let i = 0; i < 2; i++) {
    if (hash(x, y, 830 + i) >= 0.45) continue;
    const sx = X + 2 + Math.floor(hash(x, y, 832 + i) * 10);
    const sy = Y + 2 + Math.floor(hash(x, y, 834 + i) * 11);
    rect(g, sx, sy, 3, 2, PAL.rockLight);
    rect(g, sx, sy + 2, 3, 1, PAL.rockDeep);
  }
  blendGrass(g, x, y, X, Y);
  blendInto(g, x, y, X, Y, T.SNOW, PAL.snow);
  rim(g, x, y, X, Y);
}

function snowTile(g, x, y, X, Y) {
  speckle(g, x, y, X, Y, PAL.snow, PAL.snowLight, PAL.snowDark, 9);
  if (hash(x, y, 840) < 0.35) {
    const sx = X + 2 + Math.floor(hash(x, y, 841) * 9);
    const sy = Y + 3 + Math.floor(hash(x, y, 842) * 11);
    rect(g, sx, sy, 5, 1, PAL.snowDark);
    rect(g, sx + 1, sy - 1, 3, 1, PAL.snowLight);
  }
  rim(g, x, y, X, Y);
}

function iceTile(g, x, y, X, Y) {
  rect(g, X, Y, 16, 16, PAL.ice);
  for (let i = 0; i < 2; i++) {
    if (hash(x, y, 850 + i) >= 0.6) continue;
    const sx = X + 1 + Math.floor(hash(x, y, 852 + i) * 10);
    const sy = Y + 1 + Math.floor(hash(x, y, 854 + i) * 10);
    line(g, sx, sy + 4, sx + 4, sy, PAL.iceLight);
  }
  if (hash(x, y, 856) < 0.3) {
    const sy = Y + 4 + Math.floor(hash(x, y, 857) * 8);
    line(g, X + 2, sy, X + 7, sy + 2, PAL.iceDark);
    line(g, X + 7, sy + 2, X + 13, sy + 1, PAL.iceDark);
  }
  blendInto(g, x, y, X, Y, T.SNOW, PAL.snow);
}

function mountTile(g, x, y, X, Y) {
  const e = elev[y * MAP_W + x];
  const dark = e === 255;
  const [lit, mid, shd, deep] = dark ? ['#6a6163', PAL.ash, PAL.ashDark, PAL.basalt] : [PAL.rockLight, PAL.rock, PAL.rockDark, PAL.rockDeep];
  rect(g, X, Y, 16, 16, mid);
  for (let k = 0; k < 7; k++) {
    const fx = X + Math.floor(hash(x, y, 900 + k) * 13);
    const fy = Y + Math.floor(hash(x, y, 910 + k) * 12);
    const h = 3 + Math.floor(hash(x, y, 920 + k) * 4);
    rect(g, fx, fy, 2, h, lit);
    rect(g, fx + 2, fy + 1, 1, h - 1, deep);
    px(g, fx, fy + h, shd);
  }
  if (!dark && e >= 3) {
    const n = Math.min(10, (e - 2) * 3);
    for (let k = 0; k < n; k++) {
      const sx = X + Math.floor(hash(x, y, 930 + k) * 12);
      const sy = Y + 1 + Math.floor(hash(x, y, 940 + k) * 13);
      const w = 3 + Math.floor(hash(x, y, 950 + k) * 4);
      rect(g, sx, sy, w, 2, PAL.snow);
      rect(g, sx, sy, w - 1, 1, PAL.snowLight);
    }
  }
  if (tileAt(x, y + 1) !== T.MOUNT) {
    for (let k = 0; k < 4; k++) {
      const fx = X + k * 4 + Math.floor(hash(x, y, 960 + k) * 2);
      rect(g, fx, Y + 9 + Math.floor(hash(x, y, 965 + k) * 3), 3, 5, shd);
    }
    rect(g, X, Y + 14, 16, 2, deep);
  }
  if (tileAt(x, y - 1) !== T.MOUNT) rect(g, X, Y, 16, 1, lit);
  if (tileAt(x - 1, y) !== T.MOUNT) rect(g, X, Y, 1, 16, deep);
  if (tileAt(x + 1, y) !== T.MOUNT) rect(g, X + 15, Y, 1, 16, deep);
}

// Warm pools get deeper away from their rims, shading off smoothly across tiles.
const springDeep = (x, y) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tileAt(x + dx, y + dy) !== T.SPRING) return false;
  return true;
};

function springTile(g, x, y, X, Y) {
  const deep = springDeep(x, y);
  rect(g, X, Y, 16, 16, deep ? shade(PAL.spring, -0.14) : PAL.spring);
  if (deep) {
    g.fillStyle = PAL.spring;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (springDeep(x + dx, y + dy)) continue;
      for (let i = 0; i < 16; i++) {
        const d = 2 + Math.floor(hash(x * 16 + i, y * 16 + dx * 3 + dy * 5, 26) * 4);
        if (dy) g.fillRect(X + i, dy < 0 ? Y : Y + 16 - d, 1, d);
        else g.fillRect(dx < 0 ? X : X + 16 - d, Y + i, d, 1);
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    if (hash(x, y, 860 + i) < 0.55) rect(g, X + 1 + Math.floor(hash(x, y, 863 + i) * 11), Y + 2 + Math.floor(hash(x, y, 866 + i) * 12), 3, 1, PAL.springLight);
  }
  const lip = '#cfc6b6';
  if (tileAt(x, y - 1) !== T.SPRING) { g.fillStyle = 'rgba(20,60,60,0.35)'; g.fillRect(X, Y, 16, 3); rect(g, X, Y, 16, 1, '#e2dacb'); }
  if (tileAt(x - 1, y) !== T.SPRING) { rect(g, X, Y, 2, 16, lip); rect(g, X + 2, Y, 1, 16, PAL.springDeep); }
  if (tileAt(x + 1, y) !== T.SPRING) { rect(g, X + 14, Y, 2, 16, lip); rect(g, X + 13, Y, 1, 16, PAL.springDeep); }
  if (tileAt(x, y + 1) !== T.SPRING) { rect(g, X, Y + 14, 16, 2, '#b8ae9c'); rect(g, X, Y + 13, 16, 1, PAL.springLight); }
}

function ashTile(g, x, y, X, Y) {
  speckle(g, x, y, X, Y, PAL.ash, PAL.ashLight, PAL.ashDark, 16);
  if (hash(x, y, 870) < 0.07) px(g, X + 3 + Math.floor(hash(x, y, 871) * 10), Y + 3 + Math.floor(hash(x, y, 872) * 10), PAL.lava);
  if (hash(x, y, 873) < 0.25) {
    const sx = X + 2 + Math.floor(hash(x, y, 874) * 8);
    const sy = Y + 3 + Math.floor(hash(x, y, 875) * 9);
    line(g, sx, sy, sx + 3, sy + 2, PAL.basalt);
    line(g, sx + 3, sy + 2, sx + 6, sy + 1, PAL.basalt);
  }
  rim(g, x, y, X, Y);
}

function lavaTile(g, x, y, X, Y) {
  rect(g, X, Y, 16, 16, PAL.lavaDark);
  for (let i = 0; i < 4; i++) {
    ellipse(g, X + 3 + Math.floor(hash(x, y, 880 + i) * 10), Y + 3 + Math.floor(hash(x, y, 884 + i) * 10), 3, 2, PAL.lava);
  }
  for (let i = 0; i < 2; i++) rect(g, X + 2 + Math.floor(hash(x, y, 888 + i) * 10), Y + 2 + Math.floor(hash(x, y, 890 + i) * 12), 3, 1, PAL.lavaLight);
  const crust = (dx, dy) => tileAt(x + dx, y + dy) !== T.LAVA;
  if (crust(0, -1)) { rect(g, X, Y, 16, 2, PAL.basalt); rect(g, X, Y + 2, 16, 1, PAL.lavaDark); }
  if (crust(0, 1)) rect(g, X, Y + 14, 16, 2, PAL.basalt);
  if (crust(-1, 0)) rect(g, X, Y, 2, 16, PAL.basalt);
  if (crust(1, 0)) rect(g, X + 14, Y, 2, 16, PAL.basalt);
}

function jungleTile(g, x, y, X, Y) {
  speckle(g, x, y, X, Y, PAL.jungle, PAL.jungleLight, PAL.jungleDark, 16);
  for (let i = 0; i < 2; i++) {
    if (hash(x, y, 890 + i) >= 0.5) continue;
    const sx = X + 2 + Math.floor(hash(x, y, 892 + i) * 11);
    const sy = Y + 3 + Math.floor(hash(x, y, 894 + i) * 10);
    line(g, sx, sy + 2, sx + 2, sy, PAL.jungleLight);
    line(g, sx + 2, sy, sx + 3, sy + 2, PAL.jungleDark);
  }
  if (hash(x, y, 896) < 0.06) {
    const fx = X + 4 + Math.floor(hash(x, y, 897) * 8);
    const fy = Y + 4 + Math.floor(hash(x, y, 898) * 8);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(g, fx + dx, fy + dy, '#ff6a8a');
    px(g, fx, fy, '#ffe680');
  }
  rim(g, x, y, X, Y);
}

function fieldTile(g, x, y, X, Y) {
  speckle(g, x, y, X, Y, PAL.dirtDark, PAL.dirt, '#84592f', 8);
  for (let r = 0; r < 4; r++) {
    const yy = Y + 1 + r * 4;
    rect(g, X, yy + 2, 16, 1, '#7a5230');
    for (let k = 0; k < 4; k++) {
      const sx = X + 1 + k * 4 + (r % 2) * 2;
      if (hash(x * 4 + k, y * 4 + r, 876) < 0.15) continue;
      px(g, sx, yy, PAL.grassLight);
      px(g, sx, yy + 1, PAL.grass);
      px(g, sx + 1, yy, PAL.grassDark);
    }
  }
  blendGrass(g, x, y, X, Y);
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

function groundTile(g, x, y) {
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
      blendInto(g, x, y, X, Y, T.JUNGLE, PAL.jungle);
      break;
    case T.WOOD: woodTile(g, x, y, X, Y); break;
    case T.CLIFF: cliffTile(g, x, y, X, Y); break;
    case T.STAIRS: stairsTile(g, x, y, X, Y); break;
    case T.FALL: rect(g, X, Y, 16, 16, '#5aa6ec'); break;
    case T.ROCK: screeTile(g, x, y, X, Y); break;
    case T.SNOW: snowTile(g, x, y, X, Y); break;
    case T.MOUNT: mountTile(g, x, y, X, Y); break;
    case T.SPRING: springTile(g, x, y, X, Y); break;
    case T.ASH: ashTile(g, x, y, X, Y); break;
    case T.LAVA: lavaTile(g, x, y, X, Y); break;
    case T.ICE: iceTile(g, x, y, X, Y); break;
    case T.FIELD: fieldTile(g, x, y, X, Y); break;
    case T.JUNGLE: jungleTile(g, x, y, X, Y); break;
    default: waterTile(g, x, y, X, Y);
  }
}

// ---------- ground chunks ----------

// The ground is drawn in chunks as they come into view, since one canvas the size of the world
// is too big for some browsers. Open sea far from land looks alike everywhere, so those chunks
// share a few canvases.
const CHUNK = 16;
const CHUNK_PX = CHUNK * TILE;
const CW = Math.ceil(MAP_W / CHUNK);
const CH = Math.ceil(ROWS / CHUNK);
const MAX_CHUNKS = 140;
const chunks = new Map();
const chunkSea = new Int8Array(CW * CH);
const seaChunks = [];

function paintChunk(c, ci, cj) {
  const g = c.getContext('2d');
  const x0 = ci * CHUNK;
  const y0 = cj * CHUNK;
  g.setTransform(1, 0, 0, 1, -x0 * TILE, -y0 * TILE);
  g.clearRect(x0 * TILE, y0 * TILE, CHUNK_PX, CHUNK_PX);
  const x1 = Math.min(MAP_W, x0 + CHUNK);
  const y1 = Math.min(MAP_H, y0 + CHUNK);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) groundTile(g, x, y);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) decorTile(g, x, y, x * TILE, y * TILE);
  if (y0 + CHUNK > MAP_H) {
    const top = Math.max(y0, MAP_H);
    g.fillStyle = '#000';
    g.fillRect(x0 * TILE, top * TILE, CHUNK_PX, (y0 + CHUNK - top) * TILE);
    for (const r of Object.values(ROOMS)) {
      if (r.px.x1 > x0 * TILE && r.px.x0 < (x0 + CHUNK) * TILE && r.px.y1 > top * TILE && r.px.y0 < (y0 + CHUNK) * TILE) drawRoom(g, r);
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

function chunkCanvas(ci, cj) {
  const k = cj * CW + ci;
  if (chunkSea[k] >= 0) return seaChunks[chunkSea[k]];
  let c = chunks.get(k);
  if (c) {
    chunks.delete(k);
    chunks.set(k, c);
    return c;
  }
  if (chunks.size >= MAX_CHUNKS) {
    const [old] = chunks.keys();
    c = chunks.get(old);
    chunks.delete(old);
  } else {
    c = makeCanvas(CHUNK_PX, CHUNK_PX);
  }
  chunks.set(k, paintChunk(c, ci, cj));
  return c;
}

function initGround() {
  for (let cj = 0; cj < CH; cj++) {
    for (let ci = 0; ci < CW; ci++) {
      let open = (cj + 1) * CHUNK <= MAP_H;
      for (let y = cj * CHUNK; open && y < (cj + 1) * CHUNK; y++) {
        for (let x = ci * CHUNK; x < (ci + 1) * CHUNK; x++) {
          const i = y * MAP_W + x;
          if (map[i] !== T.WATER || seaDist[i] < 8) { open = false; break; }
        }
      }
      const v = (ci * 7 + cj * 13) % 4;
      chunkSea[cj * CW + ci] = open ? v : -1;
      if (open && !seaChunks[v]) seaChunks[v] = paintChunk(makeCanvas(CHUNK_PX, CHUNK_PX), ci, cj);
    }
  }
  const home = objects.find((o) => o.room === 'home');
  const hi = Math.floor(home.x / CHUNK_PX);
  const hj = Math.floor(home.y / CHUNK_PX);
  for (let j = hj - 2; j <= hj + 2; j++) for (let i = hi - 3; i <= hi + 3; i++) if (i >= 0 && j >= 0 && i < CW && j < CH) chunkCanvas(i, j);
}

// Draws the ground under the view, then readies a couple of the chunks just outside it.
function drawGround(g, cx, cy, w, h) {
  const i0 = Math.max(0, Math.floor(cx / CHUNK_PX));
  const j0 = Math.max(0, Math.floor(cy / CHUNK_PX));
  const i1 = Math.min(CW - 1, Math.floor((cx + w - 1) / CHUNK_PX));
  const j1 = Math.min(CH - 1, Math.floor((cy + h - 1) / CHUNK_PX));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) g.drawImage(chunkCanvas(i, j), i * CHUNK_PX - cx, j * CHUNK_PX - cy);
  let budget = 2;
  for (let j = j0 - 1; j <= j1 + 1 && budget; j++) {
    for (let i = i0 - 1; i <= i1 + 1 && budget; i++) {
      const k = j * CW + i;
      if (i < 0 || j < 0 || i >= CW || j >= CH || chunkSea[k] >= 0 || chunks.has(k)) continue;
      chunkCanvas(i, j);
      budget--;
    }
  }
}

// Bubbling springs and glowing lava, drawn over the ground every frame.
function animTile(t, x, y, X, Y) {
  const h = hash(x, y, 24);
  if (t === T.SPRING) {
    if (h > 0.4) return;
    const ph = (time * 0.7 + h * 7) % 1;
    ctx.globalAlpha = 0.7 * (1 - ph);
    ellipse(ctx, X + 4 + (Math.floor(h * 90) % 8), Y + 5 + (Math.floor(h * 310) % 6), 1 + ph * 3, 0.5 + ph * 1.5, PAL.springLight);
    ctx.globalAlpha = 1;
  } else {
    const s = Math.sin(time * 2 + h * 30);
    if (s <= 0.2) return;
    ctx.globalAlpha = (s - 0.2) * 0.9;
    rect(ctx, X + 3 + Math.floor(h * 9), Y + 4 + Math.floor(hash(x, y, 25) * 8), 4, 2, PAL.lavaLight);
    ctx.globalAlpha = 1;
  }
}

// ---------- world effects ----------

// The waterfall drops off the shelf in these columns, into the pool below.
const FALLS = { x: 53 + OX, y: 45 + OY, w: 3 };
const springTiles = [];
const lavaShore = [];
let mistT = 0;
let plumeT = 0;

function emitWorld(dt) {
  mistT -= dt;
  if (mistT <= 0) {
    mistT = 0.12;
    particles.push({ type: 'mist', x: (FALLS.x + Math.random() * FALLS.w) * TILE, y: FALLS.y * TILE + 2, vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 6, life: 0, max: 1 + Math.random() });
  }
  const near = (i, m) => {
    const x = (i % MAP_W) * TILE;
    const y = Math.floor(i / MAP_W) * TILE;
    return x > cam.x - m && x < cam.x + viewW + m && y > cam.y - m && y < cam.y + viewH + m;
  };
  for (const i of springTiles) {
    if (Math.random() > dt * 0.8 || !near(i, 32)) continue;
    particles.push({
      type: 'steam', x: ((i % MAP_W) + Math.random()) * TILE, y: (Math.floor(i / MAP_W) + Math.random()) * TILE,
      vx: 2 + Math.random() * 4, vy: -9 - Math.random() * 6, life: 0, max: 1.8 + Math.random() * 1.2,
    });
  }
  for (const i of lavaShore) {
    if (Math.random() > dt * 2 || !near(i, 32)) continue;
    particles.push({ type: 'steam', x: ((i % MAP_W) + Math.random()) * TILE, y: (Math.floor(i / MAP_W) + 1) * TILE, vx: 3, vy: -14 - Math.random() * 8, life: 0, max: 2 + Math.random() });
  }
  const vx = VOLCANO.x * TILE;
  const vy = VOLCANO.y * TILE - 96;
  plumeT -= dt;
  if (plumeT <= 0 && Math.abs(vx - cam.x - viewW / 2) < viewW + 200 && Math.abs(vy - cam.y - viewH / 2) < viewH + 300) {
    plumeT = 0.16;
    particles.push({ type: 'plume', x: vx + (Math.random() - 0.5) * 14, y: vy, vx: 4 + Math.random() * 5, vy: -16 - Math.random() * 8, life: 0, max: 4 + Math.random() * 2 });
    if (Math.random() < 0.4) particles.push({ type: 'ember', x: vx + (Math.random() - 0.5) * 16, y: vy + 2, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30, life: 0, max: 0.8 + Math.random() * 0.6 });
  }
}

// Walking into a warm pool lowers the player into it, swimming.
function wadeIn(ix, iy) {
  if (!ix && !iy) return false;
  const x = player.x + ix * 7;
  const y = player.y + iy * 7;
  if (tileAt(Math.floor(x / TILE), Math.floor((y - 1) / TILE)) !== T.SPRING || blocked(x - 5, y - 4, x + 5, y, player, true)) return false;
  Object.assign(player, { x, y, swimming: true });
  splash(x, y);
  Sfx.splash();
  return true;
}

// ---------- objects & npcs ----------

const objects = [];
// Tiles taken by something placed, so trees don't grow through it.
const occ = new Uint8Array(MAP_W * MAP_H);
const occAt = (x, y) => (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H ? occ[y * MAP_W + x] : 1);

function addAbs(key, tx, ty) {
  const o = { key, x: Math.round(tx * TILE), y: Math.round(ty * TILE), phase: hash(Math.round(tx * 10), Math.round(ty * 10), 99) * 10 };
  objects.push(o);
  const s = SPR[key];
  const img = s.img || s.frames[0];
  const big = img.width >= 40;
  const w = big ? img.width : s.foot?.w ?? 8;
  const h = big ? img.height : 8;
  const m = big ? 1 : 0;
  for (let y = Math.floor((o.y - h) / TILE); y <= Math.floor((o.y - 1) / TILE) + m; y++) {
    for (let x = Math.floor((o.x - w / 2) / TILE) - m; x <= Math.floor((o.x + w / 2 - 1) / TILE) + m; x++) {
      if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) occ[y * MAP_W + x] = 1;
    }
  }
  return o;
}

const addObj = (key, tx, ty) => addAbs(key, tx + OX, ty + OY);

const SOIL = {
  snowPine: [T.SNOW, T.ROCK], palm: [T.SAND, T.GRASS, T.JUNGLE], fern: [T.GRASS, T.SAND, T.JUNGLE], jungleTree: [T.JUNGLE], deadTree: [T.ASH],
  boulderDark: [T.ASH], boulderSnow: [T.SNOW, T.ROCK], iceCrystal: [T.SNOW, T.ICE], boulder: [T.ROCK, T.GRASS], stone: [T.GRASS, T.SAND, T.ROCK, T.SNOW],
};
let homes = [];

// Puts a tree (or the like) at absolute tile coords if the ground suits it and nothing's in the way.
function plant(key, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y - 0.01);
  const soil = SOIL[key] || [T.GRASS];
  for (let dy = -2; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) if (!soil.includes(tileAt(tx + dx, ty + dy))) return null;
  if (occAt(tx, ty) || occAt(tx, ty - 1)) return null;
  if (homes.some(([hx, hy]) => Math.hypot(hx - x, hy - y) < 2.75)) return null;
  return addAbs(key, x, y);
}
const plantL = (key, x, y) => plant(key, x + OX, y + OY);

// Trees on a jittered grid over a box of absolute tiles, clumped by noise; `inside` gets local village coords.
function woods(x0, y0, x1, y1, step, seed, density, pick, inside = () => true) {
  const rng = mulberry32(seed);
  for (let gy = y0; gy < y1; gy += step) {
    for (let gx = x0; gx < x1; gx += step) {
      const x = gx + rng() * step;
      const y = gy + rng() * step;
      const r = rng();
      if (vnoise(x, y, 5, seed) > density || !inside(x - OX, y - OY)) continue;
      plant(pick(r, x, y), x, y);
    }
  }
}
const woodsL = (x0, y0, x1, y1, ...rest) => woods(x0 + OX, y0 + OY, x1 + OX, y1 + OY, ...rest);
const mixed = (r) => (r < 0.4 ? 'pine' : r < 0.75 ? 'pine2' : 'oak');
const evergreen = (r) => (r < 0.5 ? 'pine' : r < 0.92 ? 'pine2' : 'oak');

const VILLAGE_NPCS = [
  {
    look: 'chief', x: 78, y: 42.6, roam: 1.5,
    lines: ['Welcome to the Hidden World, {name}.', 'Every island hides a story. Go and find them.', 'Our smith can make you all kinds of tools. Pay him a visit.', 'The great hall is always open to you.', 'Behind the hall the mountains rise. Only the pass leads through them, up to the snow.'],
  },
  {
    look: 'smith', x: 61.6, y: 59, roam: 1,
    lines: ['I can make all kinds of tools for you. Just ask!', 'Mind the sparks, {lad}!', 'Those woods won\'t chop themselves. Bring me wood and stone and I\'ll make you more tools.', 'Hot iron waits for no one.', 'The best timber grows in the forest, out past the west gate.'],
  },
  {
    look: 'baker', x: 69.5, y: 65.5, job: { station: [67, 65.5], face: 'left', prop: 'oven' },
    lines: ['Fresh bread! Still warm.', 'I bake rye loaves, honey cakes and berry pies.', 'Mind the oven, dear. It bites!', 'The best berries grow on the bushes in the forest.'],
  },
  {
    look: 'weaver', x: 72, y: 53.5, job: { station: [69.4, 53.5], face: 'left', prop: 'loom' },
    lines: ['Wool in, cloth out. Clack, clack!', 'I can weave you linen or wool, in any colour you like.', 'The shepherd\'s sheep give me the softest wool.'],
  },
  {
    look: 'seamstress', x: 84.5, y: 53.5, job: { station: [81.7, 53.5], face: 'left', prop: 'dressForm' },
    lines: ['Every stitch by hand, dear.', 'I can sew you a tunic, a dress or a warm cloak.', 'Hold still, I\'m measuring you with my eyes.', 'Going up the mountain pass? Take a warm cloak, it snows up there all year.'],
  },
  {
    look: 'tanner', x: 60.5, y: 63.6, job: { station: [58, 63.6], face: 'left', prop: 'hideFrame' },
    lines: ['Don\'t mind the smell. That\'s good leather, that is.', 'I make boots, belts and pouches. Leather that lasts a lifetime.', 'A hide sits weeks in the vat before it\'s ready.', 'After work I soak in the hot spring, up the east stairs. Best cure for aching bones.'],
  },
  {
    look: 'kid', x: 82.5, y: 61.3, roam: 1.5,
    lines: ['I wish I had a dragon!', 'Wanna race? I\'m the fastest in the village!', 'The old hermit says there are dragon eggs out at sea!', 'I swam in the hot spring! It\'s like a big warm bath!'],
  },
  {
    look: 'girl', x: 86.5, y: 64.3, roam: 3,
    lines: ['Lovely day for flying.', 'I counted forty clouds this morning.', 'Do you think dragons dream?', 'Have you seen the waterfall? It comes all the way down from the mountains.'],
  },
  {
    look: 'archer', x: 97, y: 78.5, fixed: 'up',
    lines: ['Shh... I\'m aiming.', 'I can hit a herring\'s eye at fifty paces.', 'Mind the targets. And don\'t you dare take an axe to them.'],
  },
  {
    look: 'guard', x: 75.6, y: 94.6, fixed: 'down',
    lines: ['Stay close to the village.', 'The cliffs are steep. Mind your step.', 'All quiet at the southern gate.', 'Keep to the trail in the forest. It\'s easy to get lost in there.'],
  },
  {
    look: 'villager', x: 118.8, y: 58.6, roam: 1.2,
    lines: ['Give my sheep a pat, they love it.', 'I count them every night. Puts me right to sleep.', 'Their wool goes to the weaver for her cloth.'],
  },
  {
    look: 'fisher', x: 80, y: 99.5, roam: 2,
    lines: ['She\'s yours to sail. Fair winds!', 'Hold Shift for full sail!', 'The deep water is where the big fish hide.', 'Sail north-east and you\'ll find an old hermit.', 'Due north a volcano smokes day and night. Far to the north-west lies a frozen isle.', 'South-east, a long way out, there\'s a jungle isle with palms as tall as masts.'],
  },
];

const HERMIT = isle('hermit');
const NPCS = [
  ...VILLAGE_NPCS.map((n) => ({
    ...n, x: n.x + OX, y: n.y + OY, job: n.job && { ...n.job, station: [n.job.station[0] + OX, n.job.station[1] + OY] },
  })),
  {
    look: 'hermit', x: HERMIT.x - 1, y: HERMIT.y + 1.4, roam: 2.5,
    lines: ['Sail south-west to the ancient ruin. A dragon egg sleeps among its stones.', 'Few sail this far out...', 'The stone towers remember the dragons.', 'I have seen them all: the fire mountain, the frozen isle, the jungle isle. Each keeps its secrets.'],
  },
  {
    look: 'mom', ...xy(roomSpot(ROOMS.home, 5.8, 2.4)), roam: 1.2, stays: true,
    lines: ['Don\'t forget your backpack when you go out!', 'Your backpack is by your bed, sweetheart.', 'Breakfast is on the table if you\'re hungry.'],
  },
];

function xy([x, y]) { return { x, y }; }

// Sheep wander inside the pen's fences, but they start out scattered round it.
// Everything inside the fence lines; a sheep is in once its feet are past the south rail's collider.
const PEN = { x0: (111.25 + OX) * TILE, y0: (52 + OY) * TILE, x1: (120.25 + OX) * TILE, y1: (56.75 + OY) * TILE };
const SHEEP = [[122, 54], [117.5, 59.8], [108.5, 58.2], [122.5, 57.8]].map(([x, y]) => ({ x: x + OX, y: y + OY }));
// The broken stretch of the pen's south fence the sheep got out through.
const PEN_GAP = [115];

const PLAZA = { x: 78.5 + OX, y: 64 + OY };
const PLAYER_START = xy(roomSpot(ROOMS.home, 3.5, 4.2));

function placeObjects() {
  // the great hall on the shelf under the mountains
  addObj('hall', 78, 41).room = 'hall';
  addObj('torch', 76, 41.9);
  addObj('torch', 80, 41.9);
  addObj('bannerRed', 71, 42.6);
  addObj('bannerRed', 85, 42.6);
  addObj('bushPink', 69.7, 41.4);
  addObj('bushYellow', 86.3, 41.4);

  // the crafts quarter on the west road: forge and tannery
  addObj('forge', 58.5, 58).room = 'smithy';
  addObj('anvil', 61.6, 59.6);
  addObj('barrel', 64.2, 58.6);
  addObj('stallTanner', 60.5, 64.6);
  addObj('hideFrame', 56.6, 63.9);
  addObj('vat', 55, 65.2);

  // the market round the square
  addObj('stallWeaver', 72, 54.5);
  addObj('loom', 68, 53.8);
  addObj('yarnBasket', 74.6, 54.1);
  addObj('stallSeamstress', 84.5, 54.5);
  addObj('dressForm', 80.9, 53.7);
  addObj('stall', 69.5, 66.5);
  addObj('barrel', 72.6, 66.6);
  addObj('barrel', 73.5, 66.8);
  addObj('oven', 65.6, 65.8);
  addObj('sacks', 65.4, 67.6);
  addObj('bonfire', 78.5, 60);
  addObj('bannerBlue', 75.5, 56.7);
  addObj('bannerBlue', 81.5, 56.7);
  addObj('bannerRed', 66.4, 61.6);
  addObj('bannerRed', 90.6, 61.6);

  // homes along the lanes south of the square
  addObj('house', 60, 78).room = 'home';
  addObj('barrel', 56.4, 78.1);
  addObj('bushYellow', 64.2, 78);
  addObj('houseC', 69, 78);
  addObj('houseB', 87, 78);
  addObj('houseD', 60, 86);
  addObj('houseC', 69, 86);
  addObj('houseD', 87, 86);
  addObj('houseB', 95, 58).room = 'cottage';
  addObj('barrel', 98.3, 58.2);
  addObj('barrel', 99.2, 58);
  addObj('bannerRed', 91.6, 58.4);
  for (const [k, x, y] of [
    ['bushPink', 73.6, 78.2], ['bushPink', 64.6, 86.2], ['barrel', 73.2, 86.3], ['bushYellow', 82.6, 86.2], ['sacks', 82.2, 77.6],
    ['bench', 74.2, 62.6], ['bench', 82.8, 62.6], ['sacks', 87.6, 58.4], ['yarnBasket', 76.2, 54.6], ['barrel', 86.8, 55.2],
    ['oak', 74.5, 75.6], ['oak', 83.2, 83.4], ['bushYellow', 91.8, 79.2],
  ]) addObj(k, x, y);

  // archery range
  addObj('target', 95.5, 75.4);
  addObj('target', 98.2, 75.4);
  addObj('barrel', 100.3, 78.6);

  // the farm: sheep pen, fields and a scarecrow
  for (let x = 111; x <= 119; x++) {
    addObj('fenceH', x + 0.5, 52).pen = true;
    Object.assign(addObj('fenceH', x + 0.5, 57), { pen: true, gap: PEN_GAP.includes(x) });
  }
  for (const x of [111.25, 120.25]) {
    addObj('post', x, 52);
    addObj('post', x, 57);
  }
  for (let y = 52; y <= 56; y++) {
    addObj('fenceV', 111.25, y + 1).pen = true;
    addObj('fenceV', 120.25, y + 1).pen = true;
  }
  addObj('scarecrow', 111.5, 68.8);
  addObj('scarecrow', 120.4, 76.6);
  addObj('sacks', 114.2, 71.6);
  addObj('barrel', 123.4, 61.2);

  // the palisade, with the southern gate and the west gate to the forest
  for (let x = 52; x <= 130; x++) {
    if (x >= 76 && x <= 80) continue;
    if (lt(x, 91) === T.GRASS && lt(x, 92) !== T.WATER) addObj('fenceH', x + 0.5, 92);
  }
  for (let y = 53; y < 92; y++) {
    if (y >= 58 && y <= 62) continue;
    if (lt(52, y) === T.GRASS) addObj('fenceV', 52.25, y + 1);
  }
  addObj('post', 52.25, 58);
  addObj('post', 52.25, 63);
  addObj('torch', 51.2, 58.6);
  addObj('torch', 51.2, 63.6);
  addObj('pillarL', 76.5, 92.2);
  addObj('pillarR', 80.5, 92.2);
  addObj('torch', 75.4, 93.3);
  addObj('torch', 81.6, 93.3);
  addObj('bannerRed', 74.3, 92.8);
  addObj('bannerRed', 82.7, 92.8);

  // the harbour
  addObj('barrel', 75.8, 97.6);
  addObj('barrel', 83.2, 97.4);
  addObj('sacks', 84.4, 97.8);
  addObj('ship', 85.6, 102.5).dir = 'right';

  // hot spring among the rocks
  for (const [k, x, y] of [
    ['boulder', 101.6, 35.4], ['boulder', 102.8, 40], ['boulderSnow', 108.6, 31.9], ['boulder', 109.4, 39.8], ['boulder', 116, 32.4],
    ['boulder', 115.8, 41], ['boulderSnow', 122.2, 35.8], ['stone', 104.2, 33.8], ['stone', 121, 41], ['stone', 99.6, 38.2],
    ['snowPine', 100, 33.2], ['snowPine', 113, 31.2], ['snowPine', 120.6, 33], ['snowPine', 124, 39],
  ]) addObj(k, x, y);

  // the snowy valley over the pass
  addObj('cairn', 63, 8.6);
  addObj('cairn', 64.8, 21.4);
  for (const [x, y] of [[66.6, 8.4], [73.8, 11], [72.6, 7.6]]) addObj('iceCrystal', x, y);
  addObj('boulderSnow', 59, 12);
  addObj('boulderSnow', 74.4, 13.6);

  // the forest clearing with the woodcutter's hut
  addObj('houseC', 15, 55.2);
  addObj('logPile', 19.8, 55.8);
  addObj('stump', 22.6, 58.6);
  addObj('stumpOak', 24.4, 56.2);
  addObj('stump', 18.2, 60.2);

  placeIslands();
  placePeaks();

  // trees
  homes = NPCS.map((n) => [n.x, n.y]).concat([[PLAZA.x, PLAZA.y]], SHEEP.map((s) => [s.x, s.y]));
  const clearing = (x, y) => ((x - CLEARING.x) / (CLEARING.rx + 1)) ** 2 + ((y - CLEARING.y) / (CLEARING.ry + 1)) ** 2 < 1;
  const forest = (x, y) => x < 47 + (vnoise(0, y, 8, 31) - 0.5) * 8 && !clearing(x, y);
  const core = (x, y) => x > 50 && x < 126 && y > 44 && y < 92;
  woodsL(0, 0, 60, 112, 1.35, 1337, 0.72, evergreen, forest);
  woodsL(46, 30, 126, 43, 2.2, 1338, 0.42, mixed, (x, y) => !(x > 70 && x < 87) && !(x > 98 && x < 125));
  woodsL(46, 44, 136, 112, 2.4, 1339, 0.4, mixed, (x, y) => !core(x, y) && !forest(x, y) && Math.hypot(x - BAY.x, y - BAY.y) > 14);
  woodsL(50, 0, 82, 18, 2.2, 1340, 0.5, () => 'snowPine');
  woodsL(0, 0, 60, 112, 4, 1341, 0.4, (r) => (r < 0.5 ? 'bushPink' : 'bushYellow'), forest);
  for (const [k, x, y] of [['oak', 56.6, 70.2], ['oak', 93.6, 66.6], ['pine', 103.2, 70.4], ['oak', 72.6, 47.6], ['pine2', 87.2, 47.4], ['bushPink', 89.4, 51.4], ['bushYellow', 66.2, 49.6]]) plantL(k, x, y);

  // interiors
  for (const r of Object.values(ROOMS)) for (const [k, x, y] of r.furniture) addAbs(k, ...roomSpot(r, x, y));
}

function placeIslands() {
  // the hermit's isle: his hut, his garden and his fire
  const h = isle('hermit');
  addAbs('houseB', h.x, h.y - 1).room = 'hut';
  addAbs('barrel', h.x + 3.3, h.y - 0.8);
  addAbs('bonfire', h.x - 3.5, h.y + 1.8);
  addAbs('scarecrow', h.x + 4.5, h.y + 1.2);
  addAbs('cairn', h.x - 9, h.y - 4);
  woods(h.x - h.rx, h.y - h.ry, h.x + h.rx, h.y + h.ry, 2, 1400, 0.55, mixed);
  woods(h.x - h.rx, h.y - h.ry, h.x + h.rx, h.y + h.ry, 4, 1401, 0.45, (r) => (r < 0.5 ? 'bushPink' : 'bushYellow'));

  // the jungle isle: palms on the beach, broad trees and ferns inland, and a thunderdrum's nest
  const j = isle('jungle');
  const nest = (species, x, y) => {
    addAbs('nest', x, y - 0.05);
    addAbs(`egg_${species}`, x, y).species = species;
  };
  nest('thunderdrum', j.x + 4, j.y - 3);
  for (const [x, y] of [[j.x + 2.5, j.y - 4.6], [j.x + 6, j.y - 1.4], [j.x - 15, j.y + 3]]) addAbs('fern', x, y);
  woods(j.x - j.rx - 2, j.y - j.ry - 2, j.x + j.rx + 2, j.y + j.ry + 2, 1.7, 1402, 0.8, (r, x, y) => (tileAt(Math.floor(x), Math.floor(y - 0.01)) === T.SAND ? 'palm' : r < 0.55 ? 'jungleTree' : 'palm'));
  woods(j.x - j.rx, j.y - j.ry, j.x + j.rx, j.y + j.ry, 1.6, 1403, 0.6, () => 'fern');

  // the ancient ruin: a ring of standing stones round the night fury's egg
  const r = isle('ruin');
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
    addAbs('menhir', r.x + Math.cos(a) * 4.6, r.y + 0.8 + Math.sin(a) * 3.4);
  }
  addAbs('egg_nightFury', r.x, r.y + 1).species = 'nightFury';
  for (const y of [r.y - 13, r.y - 9.5, r.y - 6]) {
    addAbs('column', r.x - 2.4, y);
    addAbs('column', r.x + 2.6, y);
  }
  for (const [x, y] of [[r.x - 9.5, r.y - 1], [r.x + 9, r.y + 2.5], [r.x - 6.5, r.y + 7], [r.x + 6, r.y - 5]]) addAbs('ruinWall', x, y);
  addAbs('stone', r.x + 4, r.y + 9);
  woods(r.x - r.rx, r.y - r.ry, r.x + r.rx, r.y + r.ry, 2.2, 1404, 0.5, mixed, (x, y) => Math.hypot((x + OX - r.x) / 9, (y + OY - r.y) / 7) > 1 && Math.abs(x + OX - r.x) > 4);

  // the frozen isle: snow, a frozen lake, ice crystals, and a light fury's nest
  const f = isle('frozen');
  nest('lightFury', f.x - 6, f.y - 2.5);
  for (const [x, y] of [[f.x - 2.4, f.y - 3.2], [f.x + 9.6, f.y - 2], [f.x + 4, f.y + 3.4], [f.x - 4, f.y + 1.6], [f.x + 1, f.y - 5.4], [f.x - 10, f.y + 8.4]]) addAbs('iceCrystal', x, y);
  for (const [x, y] of [[f.x - 12, f.y - 2], [f.x + 13, f.y + 4], [f.x + 6, f.y + 8], [f.x - 5, f.y + 9.5], [f.x + 15, f.y - 6]]) addAbs('boulderSnow', x, y);
  addAbs('cairn', f.x - 8.6, f.y - 6.2);
  woods(f.x - f.rx, f.y - f.ry, f.x + f.rx, f.y + f.ry, 1.8, 1405, 0.62, () => 'snowPine');

  // the speck of sand, with a terrible terror's egg under its one palm
  const s = isle('speck');
  addAbs('palm', s.x + 0.5, s.y + 0.8);
  nest('terribleTerror', s.x - 1.4, s.y - 0.3);
  addAbs('stone', s.x + 2.4, s.y - 0.6);

  // the fire mountain
  addAbs('volcano', VOLCANO.x, VOLCANO.y + 0.4);
  const v = isle('volcano');
  woods(v.x - v.rx, v.y - v.ry, v.x + v.rx, v.y + v.ry, 3, 1406, 0.5, (q) => (q < 0.55 ? 'deadTree' : 'boulderDark'));
}

// Fills the mountain mass with peaks, biggest first, wherever a whole silhouette fits on mountain tiles.
function placePeaks() {
  const W = 140;
  const H = 44;
  const cover = new Uint8Array(W * H);
  const rng = mulberry32(91);
  const sil = (bx, by, w, h, fn) => {
    for (let y = Math.floor(by - h); y < by; y++) {
      const t = (by - y - 0.5) / h;
      const half = (1 - t ** 0.69) * w / 2;
      for (let x = Math.floor(bx - half); x < bx + half; x++) if (fn(x, y) === false) return false;
    }
    return true;
  };
  for (const [key, w, h] of [['peak', 7, 6.25], ['peak2', 6.5, 5.75], ['peakB', 5.25, 4.6], ['peakC', 3.5, 3]]) {
    const cands = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (lt(x, y) !== T.MOUNT) continue;
        cands.push([x + 0.5 + (rng() - 0.5) * 0.6, y + 1, lt(x, y + 1) !== T.MOUNT ? 0 : rng() + 1]);
      }
    }
    cands.sort((a, b) => a[2] - b[2]);
    for (const [bx, by] of cands) {
      let tot = 0;
      let free = 0;
      const fits = sil(bx, by, w, h, (x, y) => {
        if (x < 0 || y < 0 || x >= W || y >= H || lt(x, y) !== T.MOUNT) return false;
        tot++;
        if (!cover[y * W + x]) free++;
      });
      if (!fits || free < tot * 0.55) continue;
      sil(bx, by, w, h, (x, y) => { cover[y * W + x] = 1; });
      addObj(`${key}-${Math.floor(rng() * 3)}`, bx, by);
    }
  }
}

const colliders = [];
// Colliders bucketed by 64px cells, so lookups only check what's nearby.
const COL_CELL = 64;
const COL_W = Math.ceil((MAP_W * TILE) / COL_CELL);
const colGrid = new Map();

function placeCollider(o) {
  const f = SPR[o.key].foot;
  const c = o.col;
  Object.assign(c, { x0: o.x - f.w / 2, y0: o.y - f.h, x1: o.x + f.w / 2, y1: o.y });
  if (c.cells) for (const k of c.cells) { const a = colGrid.get(k); a.splice(a.indexOf(c), 1); }
  c.cells = [];
  for (let j = Math.floor(c.y0 / COL_CELL); j <= Math.floor(c.y1 / COL_CELL); j++) {
    for (let i = Math.floor(c.x0 / COL_CELL); i <= Math.floor(c.x1 / COL_CELL); i++) {
      const k = j * COL_W + i;
      let a = colGrid.get(k);
      if (!a) colGrid.set(k, (a = []));
      a.push(c);
      c.cells.push(k);
    }
  }
}

// Whether any switched-on collider overlaps the box.
function solidAt(x0, y0, x1, y1) {
  for (let j = Math.floor(y0 / COL_CELL); j <= Math.floor(y1 / COL_CELL); j++) {
    for (let i = Math.floor(x0 / COL_CELL); i <= Math.floor(x1 / COL_CELL); i++) {
      const a = colGrid.get(j * COL_W + i);
      if (a) for (const c of a) if (!c.off && x1 > c.x0 && x0 < c.x1 && y1 > c.y0 && y0 < c.y1) return true;
    }
  }
  return false;
}

function buildColliders() {
  for (const o of objects) {
    if (!SPR[o.key].foot) continue;
    o.col = { off: false };
    placeCollider(o);
    colliders.push(o.col);
  }
}
