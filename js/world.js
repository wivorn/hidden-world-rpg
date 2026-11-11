const MAP_W = 640;
const MAP_H = 480;
// The village island is authored in its own 136x112 coordinate space, placed here in the world.
const OX = 172;
const OY = 124;
const T = {
  WATER: 0, GRASS: 1, PATH: 2, WOOD: 3, DIRT: 4, CLIFF: 5, STAIRS: 6, FALL: 7, HAY: 8, SAND: 9, FLOOR: 10, WALL: 11, VOID: 12, DOOR: 13,
  ROCK: 14, SNOW: 15, MOUNT: 16, SPRING: 17, ASH: 18, LAVA: 19, ICE: 20, FIELD: 21, JUNGLE: 22, CAVE: 23, HOLE: 24,
};
// Building interiors live in a strip of rows below the outdoor map; the ice cave is the tallest.
const ROOM_Y = MAP_H + 2;
const ROWS = MAP_H + 68;

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
const WALKABLE = new Set([T.GRASS, T.PATH, T.DIRT, T.HAY, T.STAIRS, T.SAND, T.ROCK, T.SNOW, T.ASH, T.ICE, T.FIELD, T.JUNGLE, T.CAVE]);
const isLand = (t) => WALKABLE.has(t);
const isSolidTile = (t) => t === T.WATER || t === T.CLIFF || t === T.FALL || t === T.WALL || t === T.VOID || t === T.MOUNT || t === T.LAVA || t === T.SPRING || t === T.HOLE;
const isWet = (t) => t === T.WATER || t === T.SPRING;
// An ice-fishing hole takes a line but is too small to swim or dive into, so it isn't wet.
const isFishable = (t) => isWet(t) || t === T.HOLE;

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
  { id: 'hermit', x: 396, y: 70, rx: 28, ry: 18, ground: T.GRASS, beach: 1, seed: 11 },
  { id: 'jungle', x: 410, y: 280, rx: 22, ry: 15, ground: T.JUNGLE, beach: 2, seed: 12 },
  { id: 'ruin', x: 52, y: 292, rx: 20, ry: 15, ground: T.GRASS, beach: 1, seed: 13 },
  { id: 'frozen', x: 70, y: 60, rx: 20, ry: 14, ground: T.SNOW, beach: 0, seed: 14 },
  { id: 'speck', x: 262, y: 324, rx: 22, ry: 14, ground: T.SAND, beach: 0, seed: 15 },
  { id: 'volcano', x: 250, y: 50, rx: 24, ry: 17, ground: T.ASH, beach: 0, seed: 16 },
  { id: 'hawk', x: 60, y: 180, rx: 24, ry: 16, ground: T.GRASS, beach: 0, seed: 17 },
  // little islets scattered across the open sea, each with a chest of something to find: four hold a piece of a
  // map that marks where a dragon egg lies (`mark`, a place on the world map), and one the sailor's rune note
  { id: 'isletNorth', x: 160, y: 38, rx: 7, ry: 5, ground: T.SNOW, beach: 2, seed: 18, islet: { trees: 'snowPine', loot: ['iron', 'iron', 'emerald'], mark: 'cave' } },
  { id: 'isletEast', x: 346, y: 150, rx: 7, ry: 5, ground: T.GRASS, beach: 2, seed: 19, islet: { trees: 'pine2', loot: ['ruby', 'gold', 'goblet'], mark: 'ruin' } },
  { id: 'isletWest', x: 140, y: 246, rx: 6, ry: 5, ground: T.GRASS, beach: 2, seed: 20, islet: { trees: 'oak', loot: ['gold', 'gold', 'emerald'], note: true } },
  { id: 'isletSouth', x: 340, y: 322, rx: 7, ry: 5, ground: T.SAND, beach: 0, seed: 21, islet: { trees: 'palm', loot: ['ruby', 'emerald', 'goblet'], mark: 'speck' } },
  { id: 'isletFar', x: 446, y: 172, rx: 6, ry: 5, ground: T.JUNGLE, beach: 2, seed: 22, islet: { trees: 'palm', loot: ['crown', 'gold'], mark: 'jungle' } },
  { id: 'tor', x: 560, y: 128, rx: 22, ry: 15, ground: T.GRASS, beach: 0, seed: 23 },
];
const isle = (id) => ISLANDS.find((i) => i.id === id);

// The barrow on top of Stormcrown Tor, in tiles; the skrill's egg lies on its crown. `sockets` are the six stone
// sockets for lightning rods at the corners of a hexagon round it, east first and going clockwise.
const TOR_AT = {
  x: isle('tor').x + 1, y: isle('tor').y - 1,
  sockets: [0, 1, 2, 3, 4, 5].map((i) => [Math.cos((i * Math.PI) / 3) * 3.6, Math.sin((i * Math.PI) / 3) * 2.4 + 0.2]),
};

// The dragon roost's ground point on the hermit's isle, and the box of tiles cleared around it.
const ROOST_AT = { x: isle('hermit').x + 14, y: isle('hermit').y - 1 };
const inRoostSite = (x, y) => Math.abs(x - ROOST_AT.x) < 7 && y > ROOST_AT.y - 3.5 && y < ROOST_AT.y + 6.5;
// The dragon nursery's, west of the hut, with its fence's lines in tiles from that point.
const NURSERY_AT = { x: isle('hermit').x - 14, y: isle('hermit').y + 0.5 };
const NURSERY_PEN = { x: 4.6, top: -2.4, bottom: 4.2 };
const inNurserySite = (x, y) => Math.abs(x - NURSERY_AT.x) < 5.4 && y > NURSERY_AT.y - 3.2 && y < NURSERY_AT.y + 5;

// The rune stones that wake the ruin's egg, in order; each broken wall carves one of them.
// All nine stones wake in this order. The ruin's broken walls only remember the first four; a sailor's note in a
// skerry chest has the whole of it.
const RUIN_ORDER = [6, 1, 8, 3, 0, 5, 2, 7, 4];
// Two rings of reef round the ruin isle, each with a single gap: in from the east, round by the north, in from the west.
const REEF_RINGS = [
  { grow: [8, 7], gap: Math.PI },
  { grow: [17, 15], gap: 0 },
];
const REEF_GAP = 3.5;
const reef = new Uint8Array(MAP_W * MAP_H);
const isReef = (tx, ty) => inBounds(tx, ty) && ty < MAP_H && reef[ty * MAP_W + tx] === 1;
// Hawk Rock, in rows and columns from the isle's middle: the plateau above row `strip` (two rows lower over the `low`
// columns) is ringed by cliff; the bluff runs down to row `bluff`; the rapids cross the plateau along the `stream` rows,
// pouring off its east rim; a rock spur splits the lowland at the `spur` columns, but for a gap at the `gap` rows.
const HAWK = { strip: 3, bluff: 7, low: [-14, -10], stream: [-1, 1], spur: [-5, -4], gap: [11, 12], cache: [2, -8] };
const rapids = new Uint8Array(MAP_W * MAP_H);
const isRapids = (tx, ty) => inBounds(tx, ty) && ty < MAP_H && rapids[ty * MAP_W + tx] === 1;
// The volcano's cone stands on the black-rock tiles of its foot; x, y is the middle of its base.
const VOLCANO = { x: 250, y: 53 };

// village landmarks, in village tiles
const mtnEdge = (x) => 30.5 + 2.2 * Math.sin(x * 0.13 + 1) + (vnoise(x, 0, 6, 21) - 0.5) * 5 - Math.max(0, 38 - x) * 1.7;
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

// Rock bands two tiles thick in open water; the rings wobble together so the channel between them keeps its width.
function markReefs() {
  const r = isle('ruin');
  for (let y = r.y - 40; y <= r.y + 40; y++) {
    for (let x = r.x - 48; x <= r.x + 48; x++) {
      if (!inBounds(x, y) || y >= MAP_H) continue;
      const i = y * MAP_W + x;
      if (map[i] !== T.WATER || inland[i] || seaDist[i] < 2) continue;
      const dx = x + 0.5 - r.x;
      const dy = y + 0.5 - r.y;
      for (const ring of REEF_RINGS) {
        const rx = r.rx + ring.grow[0];
        const ry = r.ry + ring.grow[1];
        const a = Math.atan2(dy / ry, dx / rx);
        const reach = Math.hypot(rx * Math.cos(a), ry * Math.sin(a));
        const wobble = 0.8 * Math.sin(a * 3 + 1) + 0.6 * Math.sin(a * 5 + 2);
        const off = Math.hypot(dx, dy) - reach - wobble;
        const gapAt = Math.abs(Math.atan2(Math.sin(a - ring.gap), Math.cos(a - ring.gap))) * reach;
        if (Math.abs(off) < 1 && gapAt > REEF_GAP) reef[i] = 1;
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
  terraceMountain();
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
  markReefs();
  computeElev();
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    if (map[i] === T.SPRING) springTiles.push(i);
    if (map[i] === T.LAVA && (map[i - 1] === T.WATER || map[i + 1] === T.WATER || map[i + MAP_W] === T.WATER || map[i + MAP_W] === T.CLIFF)) lavaShore.push(i);
  }
}

// Mountains across the north (terraced by terraceMountain), the stream and waterfall,
// the river through the forest, the hot springs, and the harbour bay.
function villageTerrain() {
  for (let y = -3; y < 42; y++) {
    for (let x = 22; x < 139; x++) if (lt(x, y) === T.GRASS && y < mtnEdge(x)) ls(x, y, T.MOUNT);
  }
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

  // old paving round the ring of standing stones, and its avenue to the north beach
  const r = isle('ruin');
  const pave = (x, y) => {
    if (tileAt(x, y) !== T.GRASS || hash(x, y, 33) < 0.12) return;
    setTile(x, y, hash(x, y, 34) < 0.8 ? T.PATH : T.DIRT);
  };
  inBlob(r.x, r.y + 0.5, 7, 5, 35, 0.3, pave);
  for (let y = r.y - 16; y < r.y - 4; y++) for (let x = r.x - 1; x <= r.x + 1; x++) pave(x, y);

  // an oasis among the dunes: a spring-fed pool in a ring of grass
  const d = isle('speck');
  inBlob(d.x + 11, d.y + 5, 5, 3.4, 40, 0.5, (x, y) => { if (tileAt(x, y) === T.SAND) setTile(x, y, T.GRASS); });
  inBlob(d.x + 11, d.y + 5, 2.8, 1.7, 41, 0.4, wetA);

  hawkTerrain();

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
  alongLine([[VOLCANO.x + 0.7, VOLCANO.y], [VOLCANO.x - 0.3, VOLCANO.y + 4], [VOLCANO.x + 1.2, VOLCANO.y + 8], [VOLCANO.x + 0.2, VOLCANO.y + 12], [VOLCANO.x + 1.2, VOLCANO.y + 18]], 0.9, lava);
  alongLine([[VOLCANO.x + 1.5, VOLCANO.y], [VOLCANO.x + 4, VOLCANO.y + 3], [VOLCANO.x + 6.5, VOLCANO.y + 5.5]], 0.8, lava);
  inBlob(VOLCANO.x + 7, VOLCANO.y + 6, 1.8, 1.2, 38, 0.4, lava);

  // Stormcrown Tor: bare rock breaking through the heath, but for the ground round the barrow at the top
  const t = isle('tor');
  for (let y = t.y - t.ry - 3; y <= t.y + t.ry + 3; y++) {
    for (let x = t.x - t.rx - 3; x <= t.x + t.rx + 3; x++) {
      const near = Math.hypot((x + 0.5 - TOR_AT.x) / 7, (y + 0.5 - TOR_AT.y) / 5) < 1;
      if (!near && tileAt(x, y) === T.GRASS && vnoise(x, y, 3, 42) > 0.7) setTile(x, y, T.ROCK);
    }
  }
}

function hawkTerrain() {
  const k = isle('hawk');
  const x0 = k.x - k.rx - 3;
  const x1 = k.x + k.rx + 3;
  const y0 = k.y - k.ry - 3;
  const y1 = k.y + k.ry + 3;
  const land = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && tileAt(x, y) !== T.WATER;
  const coast = (x, y) => [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].some(([a, b]) => !land(x + a, y + b));
  const inside = (v, [a, b], o) => v >= o + a && v <= o + b;
  const plan = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!land(x, y)) continue;
      const dy = y - k.y;
      const low = inside(x, HAWK.low, k.x);
      let t = T.GRASS;
      if (dy <= HAWK.strip + (low ? 2 : 0)) {
        const stream = inside(y, HAWK.stream, k.y);
        if (coast(x, y)) t = stream && x > k.x ? T.FALL : T.CLIFF;
        else if (stream) t = T.WATER;
      } else if (dy <= HAWK.bluff) {
        t = T.CLIFF;
      } else if (inside(x, HAWK.spur, k.x) && !inside(y, HAWK.gap, k.y)) {
        t = T.CLIFF;
      } else if (coast(x, y)) {
        t = T.SAND;
      } else if (low && dy <= HAWK.bluff + 2 && hash(x, y, 171) < 0.8) {
        t = T.ROCK;
      }
      plan.push([x, y, t]);
    }
  }
  for (const [x, y, t] of plan) {
    if (t === T.WATER) {
      wetA(x, y);
      rapids[y * MAP_W + x] = 1;
    } else {
      setTile(x, y, t);
    }
  }
}

// ---------- interiors ----------

// Furniture and NPC spots are in floor tiles from the room's top-left; `wall` items hang on the
// back wall at a floor column. The doorway is the bottom-middle tile.
const ROOMS = {
  home: {
    name: 'your house', w: 10, h: 6,
    wall: [['window', 1.5], ['shelf', 7.5], ['shield', 9.4]],
    rugs: [[2.5, 3, 4, 2.4, '#a8432f']],
    furniture: [['bed', 1, 2.1], ['hearth', 4.5, 0.2], ['backpack', 2.4, 1.6], ['toolBelt', 3.4, 1.7], ['table', 7, 3.9], ['stool', 5.6, 3.7], ['stool', 8.4, 3.7], ['chest', 9.2, 1], ['barrel', 0.6, 5.7]],
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
    furniture: [['bed', 7, 2.1], ['hearth', 4, 0.2], ['anvil', 4, 2.8], ['vat', 2.4, 4.5], ['table', 1.5, 1.6], ['barrel', 0.6, 4.6], ['sacks', 7.2, 4.7]],
  },
  hut: {
    name: 'the hermit\'s hut', w: 6, h: 4,
    wall: [['shelf', 1.2], ['window', 5]],
    rugs: [[2.2, 2.4, 2.5, 1.5, '#6a6a3a']],
    furniture: [['bed', 0.9, 2.1], ['hearth', 3.5, 0.2], ['stool', 4.7, 2.7], ['chest', 5.4, 1]],
  },
  // Carved out of rock by carveCave rather than walled; its spots are in tiles from the top-left.
  cave: { name: 'the ice cave', cave: true, w: 70, h: 64, wall: [], rugs: [], furniture: [] },
  sandCave: { name: 'the sand cave', cave: true, sand: true, w: 44, h: 34, wall: [], rugs: [], furniture: [] },
  // laid out after the caves so rooms already in old saves keep their place
  weaverHouse: {
    name: 'the weaver\'s house', w: 8, h: 5,
    wall: [['window', 2], ['shelf', 6]],
    rugs: [[2.2, 2.4, 3, 2, '#3d7d78']],
    furniture: [['bed', 1, 2.1], ['hearth', 4, 0.2], ['loom', 6.5, 1.9], ['yarnBasket', 7.3, 4.5], ['yarnBasket', 6.2, 4.7], ['stool', 3.6, 3.4]],
  },
  seamstressHouse: {
    name: 'the seamstress\'s house', w: 8, h: 5,
    wall: [['shelf', 2], ['window', 5.5]],
    rugs: [[2.6, 2.4, 3, 2, '#b04a6e']],
    furniture: [['bed', 7, 2.1], ['hearth', 3.5, 0.2], ['dressForm', 0.8, 1.7], ['dressForm', 2, 1.7], ['table', 5, 3.9], ['stool', 3.6, 3.7], ['sacks', 0.9, 4.7]],
  },
  tannery: {
    name: 'the tannery', w: 8, h: 5,
    wall: [['rack', 1.5], ['window', 5]],
    rugs: [],
    furniture: [['bed', 1, 2.1], ['hearth', 4, 0.2], ['hideFrame', 6.6, 2], ['vat', 7.2, 4.5], ['barrel', 0.6, 4.6], ['stool', 3.6, 3.2]],
  },
  bakery: {
    name: 'the bakery', w: 9, h: 5,
    wall: [['shelf', 3], ['window', 6.5]],
    rugs: [[3.2, 2.6, 3, 1.8, '#c98a3c']],
    furniture: [['oven', 1.4, 1.5], ['table', 4.7, 3.4], ['stool', 3.3, 3.2], ['stool', 6.1, 3.2], ['bed', 8, 2.1], ['sacks', 8.1, 4.6], ['sacks', 7.1, 4.8], ['barrel', 0.6, 4.6]],
  },
  workshop: {
    name: 'the carpenter\'s workshop', w: 9, h: 5,
    wall: [['rack', 1.5], ['window', 4.5], ['shelf', 7.4]],
    rugs: [],
    furniture: [['workbench', 4.5, 2.2], ['logPile', 1.4, 1.4], ['stool', 4.5, 3.6], ['bed', 8, 2.1], ['barrel', 0.6, 4.6], ['sacks', 8.1, 4.7]],
  },
  shepherdHouse: {
    name: 'the shepherd\'s house', w: 8, h: 5,
    wall: [['window', 2], ['shelf', 6]],
    rugs: [[2.5, 2.6, 3, 2, '#8f3b2e']],
    furniture: [['bed', 1, 2.1], ['hearth', 4, 0.2], ['table', 6, 3.1], ['stool', 4.7, 2.9], ['yarnBasket', 7.3, 4.6], ['sacks', 0.9, 4.7]],
  },
  archerHouse: {
    name: 'the archer\'s house', w: 8, h: 5,
    wall: [['rack', 1.5], ['window', 4], ['shield', 6.8]],
    rugs: [[2.4, 2.6, 3, 2, '#55703c']],
    furniture: [['bed', 7, 2.1], ['hearth', 3.5, 0.2], ['table', 2, 3.6], ['stool', 3.4, 3.4], ['barrel', 0.6, 4.6], ['barrel', 7.4, 4.6]],
  },
  guardHouse: {
    name: 'the guard\'s house', w: 9, h: 5,
    wall: [['shield', 1.2], ['window', 3], ['shield', 7.5]],
    rugs: [[3, 2.6, 3, 2, '#6b4a2e']],
    furniture: [['bed', 1, 2.1], ['bed', 2.6, 2.1], ['hearth', 5, 0.2], ['table', 7, 3.4], ['stool', 5.6, 3.2], ['barrel', 8.4, 4.6], ['sacks', 0.9, 4.7]],
  },
  fisherHouse: {
    name: 'the fisherman\'s house', w: 8, h: 5,
    wall: [['window', 2], ['shelf', 6]],
    rugs: [[2.5, 2.6, 3, 2, '#3b5c6c']],
    furniture: [['bed', 7, 2.1], ['hearth', 3.5, 0.2], ['table', 1.8, 3.3], ['stool', 3.2, 3.1], ['barrel', 0.6, 4.6], ['barrel', 1.6, 4.8], ['sacks', 7.2, 4.6]],
  },
  chiefHouse: {
    name: 'the chief\'s house', w: 10, h: 6,
    wall: [['shield', 1.5], ['tapestry', 5], ['shield', 8.5]],
    rugs: [[3.5, 2.6, 4, 2.4, '#7a4f2e']],
    furniture: [['bed', 1, 2.1], ['hearth', 5, 0.2], ['table', 7.5, 3.6], ['stool', 6.1, 3.4], ['stool', 8.9, 3.4], ['barrel', 0.6, 5.7], ['barrel', 9.4, 5.7]],
  },
  woodcutterHut: {
    name: 'the woodcutter\'s hut', w: 7, h: 4,
    wall: [['window', 1.5], ['rack', 5.2]],
    rugs: [[2, 2.2, 2.5, 1.5, '#6a6a3a']],
    furniture: [['bed', 0.9, 2.1], ['hearth', 3.5, 0.2], ['logPile', 5.6, 1.6], ['stool', 4.8, 3]],
  },
  fireCave: { name: 'the fire cave', cave: true, fire: true, w: 34, h: 46, wall: [], rugs: [], furniture: [] },
  fishShack: {
    name: 'the fisherman\'s shack', w: 6, h: 4,
    wall: [['window', 1.5], ['rack', 4.5]],
    rugs: [[2.2, 2.2, 2.4, 1.5, '#3b5c6c']],
    furniture: [['bed', 0.9, 2.1], ['barrel', 5.4, 3.7], ['barrel', 4.5, 3.9], ['sacks', 5.3, 1.4], ['stool', 3.4, 2.6]],
  },
};

// The ice cave is a maze of cells `pitch` tiles apart; the mouth opens under the `entry` cell of the bottom row,
// and the strip above the top row hides the egg's chamber.
const MAZE = { cols: 11, rows: 8, pitch: 6, x0: 5.5, y0: 15.5, entry: 5, seed: 4417 };
const mazeX = (c) => MAZE.x0 + c * MAZE.pitch;
const mazeY = (r) => MAZE.y0 + r * MAZE.pitch;

// Lay the rooms out left to right: walls take one column each side, two rows on top, one below.
{
  let x = 2;
  for (const r of Object.values(ROOMS)) {
    r.rx = x;
    r.ry = ROOM_Y;
    if (r.cave) {
      r.door = r.rx + Math.floor(r.sand || r.fire ? r.w / 2 : mazeX(MAZE.entry));
      r.doorY = r.ry + r.h - 1;
      r.px = { x0: r.rx * TILE, y0: r.ry * TILE, x1: (r.rx + r.w) * TILE, y1: (r.ry + r.h) * TILE };
    } else {
      r.door = r.rx + 1 + Math.floor(r.w / 2);
      r.doorY = r.ry + r.h + 2;
      r.px = { x0: r.rx * TILE, y0: r.ry * TILE, x1: (r.rx + r.w + 2) * TILE, y1: (r.ry + r.h + 3) * TILE };
    }
    x += r.w + 5;
  }
}
const inCave = () => !!indoors?.cave;
const caveSpot = (x, y) => [ROOMS.cave.rx + x, ROOMS.cave.ry + y];
const sandSpot = (x, y) => [ROOMS.sandCave.rx + x, ROOMS.sandCave.ry + y];
const fireSpot = (x, y) => [ROOMS.fireCave.rx + x, ROOMS.fireCave.ry + y];

// The fire cave inside the volcano: from the mouth a tunnel climbs in switchbacks, stairs on every rise, past lava
// seeping out of the walls, to the chamber at the top and its pool of lava. `r.steps` holds the stair tiles.
const FIRE_POOL = { x: 17.5, y: 8.5, rx: 4, ry: 2.2 };
function carveFireCave(r) {
  const inside = (x, y) => x > 0 && y > 0 && x < r.w - 1 && y < r.h - 1;
  const floor = (x, y) => { if (inside(x, y)) setTile(r.rx + x, r.ry + y, T.CAVE); };
  const mid = r.door - r.rx + 0.5;
  const turns = [[mid, r.h - 1], [mid, 40], [6, 40], [6, 32], [28, 32], [28, 24], [8, 24], [8, 16], [mid, 12]];
  alongLine(turns, 1.6, floor);
  inBlob(mid, 10, 11, 6.5, 4601, 0.25, floor);
  r.steps = new Set();
  for (const [x, y0, y1] of [[6, 33, 39], [28, 25, 31], [8, 17, 23]]) {
    for (let y = y0; y <= y1; y++) for (let dx = -1; dx <= 1; dx++) r.steps.add((r.ry + y) * MAP_W + r.rx + Math.floor(x + dx));
  }
  const seep = (x, y) => { if (inside(x, y) && tileAt(r.rx + x, r.ry + y) === T.WALL) setTile(r.rx + x, r.ry + y, T.LAVA); };
  for (const [x, y, rx, ry] of [[12, 42.6, 1.6, 0.9], [3.4, 36, 0.9, 1.6], [17, 34.6, 1.8, 0.9], [30.6, 28, 0.9, 1.6], [18, 21.4, 1.8, 0.9], [5.4, 20, 0.9, 1.4]]) {
    inBlob(x, y, rx, ry, 4602 + x, 0.2, seep);
  }
  inBlob(FIRE_POOL.x, FIRE_POOL.y, FIRE_POOL.rx, FIRE_POOL.ry, 4610, 0.15, (x, y) => { if (inside(x, y)) setTile(r.rx + x, r.ry + y, T.LAVA); });
  setTile(r.door, r.doorY, T.DOOR);
}

// The sand cave behind the sphinx: a pillared hall, a vault off each back corner and the sanctum at the far end.
function carveSandCave(r) {
  const floor = (x, y) => { if (x > 0 && y > 0 && x < r.w - 1 && y < r.h - 1) setTile(r.rx + x, r.ry + y, T.CAVE); };
  const mid = r.door - r.rx + 0.5;
  alongLine([[mid, r.h - 1], [mid, r.h - 9]], 1.6, floor);
  inBlob(mid, 18, 15, 7.5, 4501, 0.25, floor);
  inBlob(6, 9, 4, 3, 4502, 0.3, floor);
  alongLine([[10, 15], [6.5, 10]], 1.3, floor);
  inBlob(39, 9, 4, 3, 4503, 0.3, floor);
  alongLine([[35, 15], [38.5, 10]], 1.3, floor);
  inBlob(mid, 5, 6, 3, 4504, 0.25, floor);
  alongLine([[mid, 11], [mid, 6]], 1.4, floor);
  setTile(r.door, r.doorY, T.DOOR);
}

// A winding maze, the same every game: one way between any two cells, and plenty of dead ends. A grotto pool,
// gold seams and crystal grottoes sit at the ends of some; from the dead end farthest along the top row a
// one-tile crack climbs to the egg's chamber, which no other tunnel comes near. Where things go is kept in
// `r.spots`, in tiles from the cave's top-left, for placeIslands.
function carveCave(r) {
  const at = (x, y, t) => { if (x > 0 && y > 0 && x < r.w - 1 && y < r.h - 1) setTile(r.rx + x, r.ry + y, t); };
  const floor = (x, y) => at(x, y, T.CAVE);
  const { cols, rows, entry, seed } = MAZE;
  const rng = mulberry32(seed);
  const id = (c, w) => w * cols + c;
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ c: i % cols, w: Math.floor(i / cols), links: [] }));
  const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // depth-first from the mouth, picking a random unvisited neighbour each step
  const start = cells[id(entry, rows - 1)];
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const cell = stack[stack.length - 1];
    const next = STEPS.filter(([dc]) => cell.c + dc >= 0 && cell.c + dc < cols)
      .map(([dc, dw]) => cells[id(cell.c + dc, cell.w + dw)])
      .filter((n) => n && !seen.has(n));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const n = next[Math.floor(rng() * next.length)];
    cell.links.push(n);
    n.links.push(cell);
    seen.add(n);
    stack.push(n);
  }

  const cx = (cell) => mazeX(cell.c);
  const cy = (cell) => mazeY(cell.w);
  for (const cell of cells) {
    inBlob(cx(cell), cy(cell), 1.7 + rng() * 0.6, 1.5 + rng() * 0.5, seed + id(cell.c, cell.w), 0.4, floor);
    for (const n of cell.links) {
      if (id(n.c, n.w) < id(cell.c, cell.w)) continue;
      const bend = (rng() - 0.5) * 1.6;
      const mx = (cx(cell) + cx(n)) / 2 + (n.w !== cell.w ? bend : 0);
      const my = (cy(cell) + cy(n)) / 2 + (n.c !== cell.c ? bend : 0);
      alongLine([[cx(cell), cy(cell)], [mx, my], [cx(n), cy(n)]], 1.2 + rng() * 0.3, floor);
    }
  }
  const mouthX = mazeX(entry);
  alongLine([[mouthX, r.h - 1], [mouthX, cy(start)]], 1.5, floor);
  inBlob(mouthX, r.h - 3.5, 2.6, 1.8, seed - 1, 0.3, floor);
  setTile(r.door, r.doorY, T.DOOR);

  // how far each cell is from the mouth, walking
  const dist = new Map([[start, 0]]);
  for (const q = [start]; q.length;) {
    const cell = q.shift();
    for (const n of cell.links) if (!dist.has(n)) { dist.set(n, dist.get(cell) + 1); q.push(n); }
  }
  const farthest = (list) => list.reduce((a, b) => (dist.get(b) > dist.get(a) ? b : a));
  const ends = cells.filter((cell) => cell.links.length === 1 && cell !== start);
  // a spot in the cell pushed back against a wall with no tunnel through it
  const nook = (cell, k = 1.1) => {
    const open = STEPS.filter(([dc, dw]) => !cell.links.some((n) => n.c - cell.c === dc && n.w - cell.w === dw));
    const [dc, dw] = open[Math.floor(rng() * open.length)] || [0, 0];
    return [cx(cell) + dc * k, cy(cell) + dw * k];
  };

  const top = ends.filter((cell) => cell.w === 0);
  const eggEnd = farthest(top.length ? top : cells.filter((cell) => cell.w === 0));
  const ex = Math.max(7, Math.min(r.w - 8, cx(eggEnd) + (eggEnd.c < cols / 2 ? 3 : -3)));
  const side = Math.sign(ex - cx(eggEnd));
  alongLine([[cx(eggEnd), cy(eggEnd) - 1], [cx(eggEnd), 11.5], [cx(eggEnd) + side, 10], [ex, 7.5]], 1, floor);
  inBlob(ex, 5.5, 4.5, 2.6, seed + 999, 0.4, floor);

  const taken = new Set([eggEnd, start, ...eggEnd.links]);
  const pick = (list) => {
    const free = list.filter((cell) => !taken.has(cell));
    if (!free.length) return null;
    const cell = farthest(free);
    taken.add(cell);
    return cell;
  };
  const pool = pick(ends.filter((cell) => cell.c < cols / 2));
  const poolAt = nook(pool, 1.2);
  inBlob(cx(pool), cy(pool), 2.5, 2.1, seed + 7, 0.3, floor);
  inBlob(...poolAt, 1.3, 1, seed + 8, 0.3, (x, y) => at(x, y, T.WATER));
  const goldEnds = [1, 2, 3, 4].map(() => pick(ends.filter((cell) => cell.c >= cols / 2))).filter(Boolean);
  const crystalEnds = [1, 2].map(() => pick(ends)).filter(Boolean);
  const rest = cells.filter((cell) => !taken.has(cell));
  const shuffled = rest.map((cell) => [rng(), cell]).sort((a, b) => a[0] - b[0]).map(([, cell]) => cell);
  r.spots = {
    egg: [ex, 6.2],
    eggCrystals: [[ex - 3, 5], [ex + 3.2, 6.6]],
    glowcaps: [...shuffled.slice(0, 14).map((cell) => nook(cell)), [cx(pool) - (poolAt[0] - cx(pool)), cy(pool) + 0.8]],
    gold: goldEnds.map((cell) => nook(cell, 1.3)),
    crystals: crystalEnds.map((cell) => nook(cell, 1.2)),
    stalagmites: shuffled.slice(14, 26).map((cell) => nook(cell, 1.3)),
  };
}

// Absolute tile coordinates of a spot given in a room's floor tiles.
const roomSpot = (r, x, y) => [r.rx + 1 + x, r.ry + 2 + y];

function buildRooms() {
  for (let y = MAP_H; y < ROWS; y++) for (let x = 0; x < MAP_W; x++) setTile(x, y, T.VOID);
  for (const r of Object.values(ROOMS)) {
    if (r.cave) {
      for (let y = r.ry; y < r.ry + r.h; y++) for (let x = r.rx; x < r.rx + r.w; x++) setTile(x, y, T.WALL);
      if (r.sand) carveSandCave(r);
      else if (r.fire) carveFireCave(r);
      else carveCave(r);
      continue;
    }
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

const caveOpen = (t) => t === T.CAVE || t === T.WATER || t === T.DOOR;

function caveTile(g, x, y) {
  const X = x * TILE;
  const Y = y * TILE;
  const t = tileAt(x, y);
  if (t === T.CAVE) {
    speckle(g, x, y, X, Y, '#2c3444', '#3c4658', '#20262f', 10);
    if (hash(x, y, 61) < 0.14) {
      const ix = X + 2 + Math.floor(hash(x, y, 62) * 8);
      const iy = Y + 3 + Math.floor(hash(x, y, 63) * 9);
      rect(g, ix, iy, 5, 2, '#4e6a82');
      rect(g, ix + 1, iy, 2, 1, '#8fb4cc');
    }
    if (!caveOpen(tileAt(x, y - 1))) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(X, Y, 16, 4);
    }
  } else if (t === T.WATER) {
    rect(g, X, Y, 16, 16, '#0f2a36');
    if (hash(x, y, 64) < 0.6) rect(g, X + 2 + Math.floor(hash(x, y, 65) * 9), Y + 3 + Math.floor(hash(x, y, 66) * 10), 5, 1, '#2a5a6a');
    if (!caveOpen(tileAt(x, y - 1))) rect(g, X, Y, 16, 2, '#3a4456');
  } else if (t === T.DOOR) {
    rect(g, X, Y, 16, 16, '#9fb8c8');
    rect(g, X + 2, Y, 12, 16, '#dceaf2');
    rect(g, X + 4, Y + 6, 8, 10, '#f4f8fb');
  } else if (caveOpen(tileAt(x, y + 1))) {
    // a rock face above open floor, frosted along the top
    rect(g, X, Y, 16, 16, '#3a4456');
    rect(g, X, Y, 16, 4, '#141822');
    rect(g, X, Y + 13, 16, 3, '#262d3a');
    for (let i = 0; i < 3; i++) {
      const ix = X + 2 + Math.floor(hash(x, y, 70 + i) * 12);
      rect(g, ix, Y + 4, 1, 3 + Math.floor(hash(x, y, 73 + i) * 5), '#7fa0b8');
    }
    if (hash(x, y, 76) < 0.4) rect(g, X + 3 + Math.floor(hash(x, y, 77) * 9), Y + 8, 3, 2, '#4e5a70');
  } else {
    let edge = false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]]) if (caveOpen(tileAt(x + dx, y + dy))) edge = true;
    rect(g, X, Y, 16, 16, edge ? '#141822' : '#06080c');
  }
}

// Swept sandstone underfoot; carved faces above, now and then cut with old signs.
function sandCaveTile(g, x, y) {
  const X = x * TILE;
  const Y = y * TILE;
  const t = tileAt(x, y);
  if (t === T.CAVE) {
    speckle(g, x, y, X, Y, '#b08850', '#c49a5e', '#94703e', 12);
    if (hash(x, y, 81) < 0.25) rect(g, X + Math.floor(hash(x, y, 82) * 10), Y + 2 + Math.floor(hash(x, y, 83) * 12), 4 + Math.floor(hash(x, y, 84) * 4), 1, '#8a6436');
    if (!caveOpen(tileAt(x, y - 1))) {
      g.fillStyle = 'rgba(30,14,0,0.4)';
      g.fillRect(X, Y, 16, 4);
    }
  } else if (t === T.DOOR) {
    rect(g, X, Y, 16, 16, '#e4cd8a');
    rect(g, X + 2, Y, 12, 16, '#f1dfa6');
  } else if (caveOpen(tileAt(x, y + 1))) {
    rect(g, X, Y, 16, 16, '#9a6a36');
    rect(g, X, Y, 16, 4, '#2a1808');
    rect(g, X, Y + 4, 16, 1, '#b8844a');
    rect(g, X, Y + 13, 16, 3, '#7a4e26');
    if (hash(x, y, 85) < 0.35) {
      const sign = Math.floor(hash(x, y, 86) * 4);
      const gx = X + 5;
      const gy = Y + 6;
      const c = '#5e3a1a';
      if (sign === 0) { rect(g, gx + 2, gy, 2, 2, c); rect(g, gx + 2, gy + 3, 2, 4, c); rect(g, gx, gy + 3, 6, 1, c); }
      else if (sign === 1) { rect(g, gx, gy + 2, 6, 2, c); px(g, gx + 3, gy + 3, '#e8c070'); rect(g, gx + 1, gy + 5, 1, 2, c); }
      else if (sign === 2) { line(g, gx, gy + 6, gx + 3, gy, c); line(g, gx + 3, gy, gx + 6, gy + 6, c); }
      else { rect(g, gx, gy + 1, 1, 6, c); rect(g, gx + 2, gy + 3, 1, 4, c); rect(g, gx + 4, gy, 1, 7, c); }
    }
  } else {
    let edge = false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]]) if (caveOpen(tileAt(x + dx, y + dy))) edge = true;
    rect(g, X, Y, 16, 16, edge ? '#2a1808' : '#0c0602');
  }
}

// Black rock underfoot, warmer and redder near the lava; stairs cut across the rises; scorched faces above.
const fireOpen = (t) => t === T.CAVE || t === T.DOOR || t === T.LAVA;
function fireCaveTile(g, x, y) {
  const X = x * TILE;
  const Y = y * TILE;
  const t = tileAt(x, y);
  if (t === T.LAVA) return lavaTile(g, x, y, X, Y);
  if (t === T.CAVE) {
    speckle(g, x, y, X, Y, '#5e4a42', '#735a4e', '#4a3a34', 10);
    if (ROOMS.fireCave.steps.has(y * MAP_W + x)) {
      for (const sy of [0, 8]) {
        rect(g, X, Y + sy, 16, 2, '#2e221e');
        rect(g, X, Y + sy + 2, 16, 1, '#8a6e60');
      }
    } else if (hash(x, y, 91) < 0.18) {
      rect(g, X + 2 + Math.floor(hash(x, y, 92) * 9), Y + 3 + Math.floor(hash(x, y, 93) * 10), 4, 1, '#7a2a10');
    }
    if (!fireOpen(tileAt(x, y - 1))) {
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(X, Y, 16, 4);
    }
  } else if (t === T.DOOR) {
    rect(g, X, Y, 16, 16, '#c8a070');
    rect(g, X + 2, Y, 12, 16, '#e8c890');
  } else if (fireOpen(tileAt(x, y + 1))) {
    rect(g, X, Y, 16, 16, '#4e3a34');
    rect(g, X, Y, 16, 4, '#160c0a');
    rect(g, X, Y + 13, 16, 3, '#33231f');
    if (hash(x, y, 94) < 0.45) line(g, X + 3 + Math.floor(hash(x, y, 95) * 8), Y + 5, X + 5 + Math.floor(hash(x, y, 96) * 8), Y + 11, '#8a2a0e');
  } else {
    let edge = false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]]) if (fireOpen(tileAt(x + dx, y + dy))) edge = true;
    rect(g, X, Y, 16, 16, edge ? '#1e1210' : '#080404');
  }
}

// ---------- ground tiles ----------

// Long wind ridges across the dune isle: a lit windward face, a shaded lee and a pale crest between them.
function onDunes(x, y) {
  const s = isle('speck');
  return ((x + 0.5 - s.x) / (s.rx + 4)) ** 2 + ((y + 0.5 - s.y) / (s.ry + 4)) ** 2 < 1;
}

function duneTile(g, x, y, X, Y) {
  for (let j = 0; j < 16; j++) {
    const wy = Y + j;
    let run = 0;
    let runC = null;
    for (let i = 0; i <= 16; i++) {
      let c = null;
      if (i < 16) {
        const wx = X + i;
        const p = wy * 0.09 + Math.sin(wx * 0.021) * 2.6 + Math.sin(wx * 0.006 + 1.3) * 5;
        const s = Math.sin(p);
        const lee = Math.cos(p) < 0;
        c = s > 0.93 ? '#f8ecc0' : lee && s > 0.1 ? PAL.sandDark : s < -0.6 ? '#d8bd78' : PAL.sand;
      }
      if (c !== runC) {
        if (runC) rect(g, X + i - run, wy, run, 1, runC);
        runC = c;
        run = 0;
      }
      run++;
    }
  }
  for (let i = 0; i < 6; i++) px(g, X + Math.floor(hash(x, y, 400 + i) * 16), Y + Math.floor(hash(x, y, 500 + i) * 16), hash(x, y, 600 + i) < 0.5 ? PAL.sandLight : PAL.sandDark);
}

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
  // mountain faces draw their own ends
  const edge = (dx) => {
    const t = tileAt(x + dx, y);
    return t === T.WATER || t === T.FALL || (t === T.CLIFF && !tierAt(x + dx, y));
  };
  const n = tileAt(x, y - 1);
  if (n === T.WATER || n === T.FALL) rect(g, X, Y, 16, 1, PAL.rockDark);
  if (edge(-1)) { rect(g, X, Y, 2, 16, PAL.rock); rect(g, X, Y, 1, 16, PAL.rockDark); }
  if (edge(1)) { rect(g, X + 14, Y, 2, 16, PAL.rock); rect(g, X + 15, Y, 1, 16, PAL.rockDark); }
  if ((n === T.CLIFF && !tierAt(x, y - 1)) || n === T.MOUNT) {
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
  // mountain faces draw their own ends
  const edge = (dx) => {
    const t = tileAt(x + dx, y);
    return t === T.WATER || t === T.FALL || (t === T.CLIFF && !tierAt(x + dx, y));
  };
  const n = tileAt(x, y - 1);
  if (n === T.WATER || n === T.FALL) {
    rect(g, X, Y, 16, 1, PAL.rockDark);
    rect(g, X, Y + 1, 16, 1, PAL.grassDark);
  }
  if (edge(-1)) { rect(g, X, Y, 2, 16, PAL.rock); rect(g, X, Y, 1, 16, PAL.rockDark); }
  if (edge(1)) { rect(g, X + 14, Y, 2, 16, PAL.rock); rect(g, X + 15, Y, 1, 16, PAL.rockDark); }
  if ((n === T.CLIFF && !tierAt(x, y - 1)) || n === T.MOUNT) {
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
  if (isReef(x, y)) {
    rect(g, X, Y, 16, 16, '#3f8fb0');
    g.fillStyle = '#5aa8b8';
    for (let yy = 0; yy < 16; yy++) for (let xx = yy % 2; xx < 16; xx += 2) if (hash(X + xx, Y + yy, 17) < 0.35) g.fillRect(X + xx, Y + yy, 1, 1);
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

// A round hole chopped through lake ice: a ragged white lip, dark water, and chips of ice heaped round it.
function holeTile(g, x, y, X, Y) {
  iceTile(g, x, y, X, Y);
  ellipse(g, X + 8, Y + 8.5, 6.5, 5.5, PAL.iceLight);
  ellipse(g, X + 8, Y + 8.5, 5, 4, '#2a5a7a');
  ellipse(g, X + 8, Y + 9.5, 4, 2.8, '#173a56');
  rect(g, X + 4, Y + 6, 8, 1, '#4a86a8');
  line(g, X + 6, Y + 11, X + 9, Y + 11, '#3a7296');
  for (let i = 0; i < 5; i++) {
    const a = hash(x, y, 1500 + i) * Math.PI * 2;
    px(g, X + 8 + Math.round(Math.cos(a) * 7), Y + 9 + Math.round(Math.sin(a) * 6), i % 2 ? '#ffffff' : PAL.iceDark);
  }
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
  if (hash(x, y, 700) < flowerOdds()) {
    const colors = flowerColors();
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
      if (onDunes(x, y)) duneTile(g, x, y, X, Y);
      else speckle(g, x, y, X, Y, PAL.sand, PAL.sandLight, PAL.sandDark, 12);
      if (hash(x, y, 820) < 0.12) px(g, X + 3 + Math.floor(hash(x, y, 821) * 10), Y + 3 + Math.floor(hash(x, y, 822) * 10), '#f7e3e0');
      blendGrass(g, x, y, X, Y);
      blendInto(g, x, y, X, Y, T.JUNGLE, PAL.jungle);
      break;
    case T.WOOD: woodTile(g, x, y, X, Y); break;
    case T.CLIFF: (tierAt(x, y) ? faceTile : cliffTile)(g, x, y, X, Y); break;
    case T.STAIRS: stairsTile(g, x, y, X, Y); break;
    case T.FALL: rect(g, X, Y, 16, 16, '#5aa6ec'); break;
    case T.ROCK: (tierAt(x, y) ? ledgeTile : screeTile)(g, x, y, X, Y); break;
    case T.SNOW: (tierAt(x, y) ? ledgeTile : snowTile)(g, x, y, X, Y); break;
    case T.MOUNT: mountTile(g, x, y, X, Y); break;
    case T.SPRING: springTile(g, x, y, X, Y); break;
    case T.ASH: ashTile(g, x, y, X, Y); break;
    case T.LAVA: lavaTile(g, x, y, X, Y); break;
    case T.ICE: iceTile(g, x, y, X, Y); break;
    case T.HOLE: holeTile(g, x, y, X, Y); break;
    case T.FIELD: fieldTile(g, x, y, X, Y); break;
    case T.JUNGLE: jungleTile(g, x, y, X, Y); break;
    default: waterTile(g, x, y, X, Y);
  }
  if (isLand(tileAt(x, y))) sideStep(g, x, y, X, Y);
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
      if (!(r.px.x1 > x0 * TILE && r.px.x0 < (x0 + CHUNK) * TILE && r.px.y1 > top * TILE && r.px.y0 < (y0 + CHUNK) * TILE)) continue;
      if (r.cave) {
        for (let y = Math.max(top, r.ry); y < Math.min(y0 + CHUNK, r.ry + r.h); y++) {
          for (let x = Math.max(x0, r.rx); x < Math.min(x0 + CHUNK, r.rx + r.w); x++) (r.sand ? sandCaveTile : r.fire ? fireCaveTile : caveTile)(g, x, y);
        }
      } else {
        drawRoom(g, r);
      }
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
// A trader's house and stall, placed so the counter's middle lands on (sx, sy).
const shopAt = (key, sx, sy, room) => { addObj(key, sx - SPR[key].stall / TILE, sy).room = room; };
// The board by a shop that lists what's made there; `shop` keys into SHOPS.
const signBy = (shop, x, y) => { addObj('shopSign', x, y).shop = shop; };

const SOIL = {
  snowPine: [T.SNOW, T.ROCK], palm: [T.SAND, T.GRASS, T.JUNGLE], fern: [T.GRASS, T.SAND, T.JUNGLE], jungleTree: [T.JUNGLE], deadTree: [T.ASH],
  boulderDark: [T.ASH], boulderSnow: [T.SNOW, T.ROCK], iceCrystal: [T.SNOW, T.ICE], boulder: [T.ROCK, T.GRASS], stone: [T.GRASS, T.SAND, T.ROCK, T.SNOW],
  bananaTree: [T.JUNGLE, T.GRASS, T.SAND], orangeTree: [T.GRASS, T.JUNGLE], lemonTree: [T.GRASS, T.JUNGLE],
  splitTree: [T.GRASS, T.ROCK], cactus: [T.SAND], cactusTall: [T.SAND], barrelCactus: [T.SAND],
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
const ORCHARD = ['appleTree', 'pearTree', 'cherryTree', 'plumTree', 'peachTree'];
// Up to `n` of `keys`, taking turns, planted a little apart on open ground within a few tiles of (cx, cy).
function grove(keys, cx, cy, n, seed) {
  const rng = mulberry32(seed);
  const put = [];
  for (let i = 0; i < 120 && put.length < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * 5.5;
    const [x, y] = [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7];
    if (put.some(([px, py]) => Math.hypot(px - x, py - y) < 2.6)) continue;
    if (plant(keys[put.length % keys.length], x, y)) put.push([x, y]);
  }
}

// `pick`, but with `odds` of one of `fruits` instead.
const fruity = (pick, fruits, odds) => (r, x, y) => (r >= 1 - odds ? fruits[Math.floor(((r - 1 + odds) / odds) * fruits.length) % fruits.length] : pick(r / (1 - odds), x, y));

const VILLAGE_NPCS = [
  {
    look: 'chief', x: 78, y: 42.6, roam: 1.5,
    lines: ['Welcome to Numina, {name}.', 'Every island hides a story. Go and find them.', 'Our smith can make you all kinds of tools. Pay him a visit.', 'The great hall is always open to you.', 'Behind the hall the mountains rise ledge on ledge. Climb the rock from one to the next, all the way up to the snow.'],
    nightLines: ['Still about, {name}? The fire in the great hall burns all night.', 'Look at those stars. Our ancestors steered their ships by them.', 'Night is for the old stories. Sit a while.', 'Rest well tonight. The islands will still be waiting in the morning.'],
  },
  {
    look: 'smith', x: 61.6, y: 59, roam: 1,
    lines: ['I can make all kinds of tools for you. Just ask!', 'Mind the sparks, {lad}!', 'Those woods won\'t chop themselves. Bring me wood and stone and I\'ll make you more tools.', 'Hot iron waits for no one.', 'The best timber grows in the forest, out past the west gate.'],
    nightLines: ['The forge is banked for the night, but I can still make you something. Just ask.', 'Late one, {lad}. Even hot iron has to cool some time.', 'Best light in the village, these coals.', 'Heading out in the dark? Bring me 1 wood and 1 wool and I\'ll make you a torch.'],
  },
  {
    look: 'baker', x: 69.5, y: 68.6, job: { station: [67, 68.6], face: 'left', prop: 'oven' },
    lines: ['Fresh bread! Still warm.', 'I bake rye loaves, honey cakes and berry pies.', 'Mind the oven, dear. It bites!', 'The best berries grow on the bushes in the forest.'],
    nightLines: ['The oven\'s still warm. I\'m setting the dough for the morning.', 'Up late, dear? The first loaves come out at dawn.', 'Night baking is the best baking. Nobody pinching the buns.', 'Mind the oven in the dark, dear. It still bites!'],
  },
  {
    look: 'weaver', x: 72, y: 51.9, job: { station: [74.3, 51.9], face: 'right', prop: 'loom' },
    lines: ['Wool in, cloth out. Clack, clack!', 'I can weave you linen or wool, in any colour you like.', 'The shepherd\'s sheep give me the softest wool.'],
    nightLines: ['Weaving by firelight. My eyes aren\'t what they were.', 'One more row, then bed. ...I said that an hour ago.', 'The sheep are all asleep. Lucky things.'],
  },
  {
    look: 'seamstress', x: 84.5, y: 51.9, job: { station: [81.7, 51.9], face: 'left', prop: 'dressForm' },
    lines: ['Every stitch by hand, dear.', 'I can sew you a tunic, a dress or a warm cloak.', 'Hold still, I\'m measuring you with my eyes.', 'Going up the mountain pass? Take a warm cloak, it snows up there all year.'],
    nightLines: ['Can\'t see my stitches in this light! I\'ll finish in the morning.', 'A warm cloak is just the thing on a chilly night, dear.', 'Out late? Mind you don\'t snag your sleeve in the dark.'],
  },
  {
    look: 'tanner', x: 60.5, y: 63.6, job: { station: [62.1, 63.7], face: 'right', prop: 'hideFrame' },
    lines: ['Don\'t mind the smell. That\'s good leather, that is.', 'Pack filling up? Bring me two hides and I\'ll make you a tool belt with pouches.', 'A hide sits weeks in the vat before it\'s ready.', 'After work I soak in the hot spring, up the east stairs. Best cure for aching bones.', 'Off up the mountain? Six hides, four strings and two lengths of wood, and I\'ll make you a tent to camp in.'],
    nightLines: ['Hides dry slower at night. Patience.', 'A soak in the hot spring under the stars. That\'s the life.', 'Still after a tool belt? Two hides, day or night.', 'Far from your bed at this hour? Pitch one of my tents and sleep till dawn.'],
  },
  {
    look: 'kid', x: 82.5, y: 61.3, roam: 1.5,
    lines: ['I wish I had a dragon!', 'Wanna race? I\'m the fastest in the village!', 'The old hermit says there are dragon eggs out at sea!', 'I swam in the hot spring! It\'s like a big warm bath!'],
    nightLines: ['I\'m not tired! ...*yawn*', 'I\'m meant to be in bed. Don\'t tell anyone you saw me!', 'Do dragons sleep at night? I bet they fly about!', 'I saw a shooting star! I wished for a dragon!'],
  },
  {
    look: 'girl', x: 86.5, y: 64.3, roam: 3,
    lines: ['Lovely day for flying.', 'I counted forty clouds this morning.', 'Do you think dragons dream?', 'Have you seen the waterfall? It comes all the way down from the mountains.'],
    nightLines: ['Look at all the stars! I got to a hundred and lost my place.', 'Do you think dragons dream?', 'The moon looks close enough to fly to.', 'I love the night. The sky goes on forever.'],
  },
  {
    look: 'archer', x: 97, y: 78.5, fixed: 'up',
    lines: ['Shh... I\'m aiming.', 'I can hit a herring\'s eye at fifty paces.', 'Mind the targets. And don\'t you dare take an axe to them.', 'Get yourself a bow and I\'ll set you a few challenges.', 'Deer graze in the western forest. Shoot from a distance, they spook easily.'],
    nightLines: ['Too dark to aim properly. I\'m practising by ear.', 'Hear that thunk? That\'s a hit. You learn the sound.', 'Careful on the range at night. I can\'t see where you\'re standing.'],
  },
  {
    look: 'guard', x: 75.6, y: 94.6, fixed: 'down',
    lines: ['Stay close to the village.', 'The cliffs are steep. Mind your step.', 'All quiet at the southern gate.', 'Keep to the trail in the forest. It\'s easy to get lost in there.', 'Wild boar in the south woods. Leave them be, or bring a shield.'],
    nightLines: ['Quiet night at the southern gate. Just how I like it.', 'Don\'t wander far in the dark. The cliffs are steep.', 'Going into the forest at night? Take a torch.', 'Wolves howl up in the mountains at night. That\'s what the wall is for.'],
  },
  {
    look: 'villager', x: 118.8, y: 58.6, roam: 1.2,
    lines: ['Give my sheep a pat, they love it.', 'I count them every night. Puts me right to sleep.', 'Their wool goes to the weaver for her cloth.'],
    nightLines: ['Shh! The sheep are sleeping.', 'Counting sheep... forty-one, forty-two... *yawn*', 'Night\'s when the wolves get ideas. I keep one eye open.'],
  },
  {
    look: 'fisher', x: 80, y: 99.5, roam: 2,
    lines: ['She\'s yours to sail. Fair winds!', () => merchantNews(), 'Hold Shift for full sail!', 'The deep water is where the big fish hide.', 'Sail north-east and you\'ll find an old hermit.', () => merchantNews(), 'Due north a volcano smokes day and night. Far to the north-west lies a frozen isle.', 'South-east, a long way out, there\'s a jungle isle with palms as tall as masts.', 'Little skerries dot the open sea. Old sailors stashed their loot on them, so the story goes.'],
    nightLines: ['A calm night on the water. Just you and the stars.', () => merchantNews(), 'Sailing in the dark? Keep the village fires behind you and you\'ll find your way home.', 'Fish don\'t mind the dark. Cast away, if you\'ve the patience.'],
  },
];

const HERMIT = isle('hermit');
const NPCS = [
  ...VILLAGE_NPCS.map((n) => ({
    ...n, x: n.x + OX, y: n.y + OY, job: n.job && { ...n.job, station: [n.job.station[0] + OX, n.job.station[1] + OY] },
  })),
  {
    look: 'hermit', x: HERMIT.x - 1, y: HERMIT.y + 1.4, roam: 2.5,
    lines: ['Sail south-west to the ancient ruin. A dragon egg sleeps beneath its stones.', 'The egg rises only at night, when the rune stones wake.', 'The broken walls of the ruin remember the order of the stones.', 'Reefs ring the ruin. In from the east, round by the north.', 'A dragon egg hatches only in the lava at the heart of the fire mountain. A cave climbs up to it.'],
    nightLines: ['Few sail this far out... and fewer still by night.', 'The rune stones of the ruin are waking now. Can you feel it?', 'Touch all nine stones in order. The walls remember the start; a sailor\'s note on the skerries has the rest.', 'Reefs ring the ruin. In from the east, round by the north.', 'A dragon egg hatches only in the lava at the heart of the fire mountain. A cave climbs up to it.'],
  },
  {
    look: 'mom', ...xy(roomSpot(ROOMS.home, 5.8, 2.4)), roam: 1.2, stays: true,
    lines: ['Your backpack and your father\'s old tool belt are by your bed. Take them both!', 'Don\'t forget your backpack when you go out!', 'Breakfast is on the table if you\'re hungry.'],
    nightLines: ['Your backpack and tool belt are by your bed, sweetheart.', 'It\'s dark out! Adventures can wait for the morning.', 'There\'s stew keeping warm by the fire.'],
  },
  // the travelling merchant waits out of the world until his ship docks
  {
    look: 'merchant', x: MAP_W - 4, y: ROWS - 2, fixed: 'left',
    lines: ['Silver for fish, silver for wool! Ottar buys it all!', 'I sail all of Numina. Three days round, then back here.', 'Mind the gangplank, friend.'],
    nightLines: ['Late trade? Ottar never sleeps!', 'Silver for fish, silver for wool, night or day!', 'Mind the gangplank, friend. It\'s slippery in the dark.'],
  },
  // after the merchant, so the villagers in old saves keep their places
  {
    look: 'carpenter', x: 94 + OX, y: 67.5 + OY, job: { station: [92.1 + OX, 67.9 + OY], face: 'left', prop: 'workbench' },
    lines: ['Measure twice, cut once.', 'Got a bow, {lad}? Bring it here and I\'ll make it shoot farther.', 'Good yew makes a good longbow. Good horn makes a better one.', 'Every plank in this village went over my bench.'],
    nightLines: ['Can\'t saw straight in the dark. I\'ll whittle a little instead.', 'Still need that bow seen to? I\'m not too tired for that.', 'Sawdust in my beard again. Ah well.'],
  },
];
// Where the merchant's ship ties up in the bay, east of the longship, and where he stands on the beach beside it.
const MERCHANT_DOCK = { x: 93 + OX, y: 106.2 + OY };
const MERCHANT_STAND = { x: 96.4 + OX, y: 104.4 + OY };

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
  signBy('smith', 65.6, 58.6);
  shopAt('shopTanner', 60.5, 64.6, 'tannery');
  addObj('hideFrame', 63.5, 63.9);
  addObj('vat', 62.9, 66.3);
  signBy('tanner', 64.6, 65.4);

  // the market round the square: each trader lives in the house behind their stall
  shopAt('shopWeaver', 72, 52.9, 'weaverHouse');
  addObj('loom', 75.6, 52.2);
  signBy('weaver', 73.9, 53.9);
  shopAt('shopSeamstress', 84.5, 52.9, 'seamstressHouse');
  addObj('dressForm', 80.9, 52.1);
  signBy('seamstress', 83.1, 53.9);
  shopAt('shopBaker', 69.5, 69.6, 'bakery');
  addObj('oven', 65.6, 68.9);
  addObj('sacks', 65.4, 70.7);
  signBy('baker', 67.2, 70.7);
  // the carpenter's, out in the open south-east of the square
  shopAt('shopCarpenter', 94, 68.5, 'workshop');
  addObj('workbench', 90.4, 68.4);
  addObj('logPile', 89.4, 70.6);
  signBy('carpenter', 92.3, 70.2);
  addObj('bonfire', 78.5, 60);
  addObj('bannerBlue', 75.5, 56.7);
  addObj('bannerBlue', 81.5, 56.7);
  addObj('bannerRed', 66.4, 61.6);
  addObj('bannerRed', 90.6, 61.6);

  // homes along the lanes south of the square
  addObj('house', 60, 78).room = 'home';
  addObj('barrel', 56.4, 78.1);
  addObj('bushYellow', 64.2, 78);
  addObj('houseC', 69, 78).room = 'shepherdHouse';
  addObj('houseB', 87, 78).room = 'archerHouse';
  addObj('houseD', 60, 86).room = 'guardHouse';
  addObj('houseC', 69, 86).room = 'fisherHouse';
  addObj('houseD', 87, 86).room = 'chiefHouse';
  addObj('houseB', 95, 58).room = 'cottage';
  addObj('barrel', 98.3, 58.2);
  addObj('barrel', 99.2, 58);
  addObj('bannerRed', 91.6, 58.4);
  for (const [k, x, y] of [
    ['bushPink', 73.6, 78.2], ['bushPink', 64.6, 86.2], ['barrel', 73.2, 86.3], ['bushYellow', 82.6, 86.2], ['sacks', 82.2, 77.6],
    ['bench', 74.2, 62.6], ['bench', 82.8, 62.6], ['sacks', 87.6, 58.4],
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

  // the harbour, with the fisher's shack on the beach by the jetty
  addObj('fishShack', 76, 97.9).room = 'fishShack';
  signBy('fisher', 77.9, 98.8);
  addObj('barrel', 78.3, 96.7);
  addObj('barrel', 83.2, 97.4);
  addObj('sacks', 86.2, 97.8);
  addObj('ship', 84.2, 102.5).dir = 'right';

  // hot spring among the rocks
  for (const [k, x, y] of [
    ['boulder', 101.6, 35.4], ['boulder', 102.8, 40], ['boulderSnow', 108.6, 31.9], ['boulder', 109.4, 39.8], ['boulder', 116, 32.4],
    ['boulder', 115.8, 41], ['boulderSnow', 122.2, 35.8], ['stone', 104.2, 33.8], ['stone', 121, 41], ['stone', 99.6, 38.2],
    ['snowPine', 100, 33.2], ['snowPine', 113, 31.2], ['snowPine', 120.6, 33], ['snowPine', 124, 39],
  ]) addObj(k, x, y);

  // the forest clearing with the woodcutter's hut
  addObj('houseC', 15, 55.2).room = 'woodcutterHut';
  addObj('logPile', 19.8, 55.8);
  addObj('stump', 22.6, 58.6);
  addObj('stumpOak', 24.4, 56.2);
  addObj('stump', 18.2, 60.2);

  placeIslands();

  // trees
  homes = NPCS.map((n) => [n.x, n.y]).concat([[PLAZA.x, PLAZA.y]], SHEEP.map((s) => [s.x, s.y]));
  const clearing = (x, y) => ((x - CLEARING.x) / (CLEARING.rx + 1)) ** 2 + ((y - CLEARING.y) / (CLEARING.ry + 1)) ** 2 < 1;
  const forest = (x, y) => x < 47 + (vnoise(0, y, 8, 31) - 0.5) * 8 && !clearing(x, y);
  const core = (x, y) => x > 50 && x < 126 && y > 44 && y < 92;
  woodsL(0, 0, 60, 112, 1.35, 1337, 0.72, evergreen, forest);
  woodsL(46, 30, 126, 43, 2.2, 1338, 0.42, mixed, (x, y) => !(x > 70 && x < 87) && !(x > 98 && x < 125));
  woodsL(46, 44, 136, 112, 2.4, 1339, 0.4, fruity(mixed, ORCHARD.slice(0, 4), 0.12), (x, y) => !core(x, y) && !forest(x, y) && Math.hypot(x - BAY.x, y - BAY.y) > 14);
  placeMountain();
  woodsL(0, 0, 60, 112, 4, 1341, 0.4, (r) => (r < 0.5 ? 'bushPink' : 'bushYellow'), forest);
  for (const [k, x, y] of [['oak', 56.6, 70.2], ['oak', 102.4, 66], ['pine', 103.2, 70.4], ['oak', 72.6, 47.6], ['pine2', 87.2, 47.4], ['bushPink', 89.4, 51.4], ['bushYellow', 66.2, 49.6]]) plantL(k, x, y);
  // the orchard south of the fields
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) plantL(ORCHARD[(i + row * 2) % ORCHARD.length], 108.6 + i * 3.4 + (row % 2) * 1.2, 81.6 + row * 3);
  }

  // interiors
  for (const r of Object.values(ROOMS)) for (const [k, x, y] of r.furniture) addAbs(k, ...roomSpot(r, x, y));
}

// The heart of the jungle isle is a maze walled with vine trees: cells `pitch` tiles apart inside an oval, carved
// by a seeded walk out from the clearing in the middle, where the thunderdrum nests. One way in from the west, one
// from the east.
const JUNGLE_MAZE = { cols: 11, rows: 7, pitch: 3, seed: 77 };

function jungleMaze(j) {
  const { cols, rows, pitch } = JUNGLE_MAZE;
  const x0 = Math.round(j.x - (cols * pitch) / 2);
  const y0 = Math.round(j.y - (rows * pitch) / 2);
  const inside = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && Math.hypot((c + 0.5 - cols / 2) / (cols / 2), (r + 0.5 - rows / 2) / (rows / 2)) < 1.08;
  const mc = Math.floor(cols / 2);
  const mr = Math.floor(rows / 2);
  const room = (c, r) => Math.abs(c - mc) <= 1 && Math.abs(r - mr) <= 1;
  // top[r][c] closes the north side of cell (c, r); left[r][c] its west side
  const top = Array.from({ length: rows + 1 }, () => Array(cols).fill(true));
  const left = Array.from({ length: rows }, () => Array(cols + 1).fill(true));
  const open = (c, r, dc, dr) => {
    if (dc) left[r][c + Math.max(dc, 0)] = false;
    else top[r + Math.max(dr, 0)][c] = false;
  };
  const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const seen = new Set();
  const stack = [];
  for (let r = mr - 1; r <= mr + 1; r++) {
    for (let c = mc - 1; c <= mc + 1; c++) {
      seen.add(r * cols + c);
      stack.push([c, r]);
      for (const [dc, dr] of STEPS) if (room(c + dc, r + dr)) open(c, r, dc, dr);
    }
  }
  const rng = mulberry32(JUNGLE_MAZE.seed);
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const next = STEPS.filter(([dc, dr]) => inside(c + dc, r + dr) && !seen.has((r + dr) * cols + c + dc));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [dc, dr] = next[Math.floor(rng() * next.length)];
    open(c, r, dc, dr);
    seen.add((r + dr) * cols + c + dc);
    stack.push([c + dc, r + dr]);
  }
  left[mr][0] = false;
  left[mr][cols] = false;

  const walls = new Set();
  const wall = (tx, ty) => walls.add(`${tx},${ty}`);
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!top[r][c] || !(inside(c, r) || inside(c, r - 1))) continue;
      for (let k = 0; k <= pitch; k++) wall(x0 + c * pitch + k, y0 + r * pitch);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (!left[r][c] || !(inside(c, r) || inside(c - 1, r))) continue;
      for (let k = 0; k <= pitch; k++) wall(x0 + c * pitch, y0 + r * pitch + k);
    }
  }
  for (const k of walls) {
    const [tx, ty] = k.split(',').map(Number);
    if (tileAt(tx, ty) === T.SAND) setTile(tx, ty, T.JUNGLE);
    addAbs('vineTree', tx + 0.5, ty + 1).variant = Math.floor(hash(tx, ty, 78) * 3);
  }
  return { x: x0 + (cols * pitch) / 2, y: y0 + (rows * pitch) / 2, rx: (cols * pitch) / 2 + 1.5, ry: (rows * pitch) / 2 + 1.5 };
}

// Points round an oval of tiles, `gap` pixels apart, starting due east.
function ovalRing(cx, cy, rx, ry, gap) {
  const ring = [];
  for (let i = 0; i < 400; i++) {
    const a = (i / 400) * Math.PI * 2;
    const p = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    if (!ring.length || Math.hypot((p[0] - ring[ring.length - 1][0]) * TILE, (p[1] - ring[ring.length - 1][1]) * TILE) >= gap) ring.push(p);
  }
  return ring;
}

function placeIslands() {
  // the hermit's isle: his hut, his garden and his fire
  const h = isle('hermit');
  addAbs('houseB', h.x, h.y - 1).room = 'hut';
  addAbs('barrel', h.x + 3.3, h.y - 0.8);
  addAbs('bonfire', h.x - 3.5, h.y + 1.8);
  addAbs('scarecrow', h.x + 4.5, h.y + 1.2);
  addAbs('cairn', h.x - 9, h.y - 4);

  // east of the hut, the hermit's stakes mark where the dragon roost goes: first its stand of pines must be felled
  const site = ROOST_AT;
  const clear = (x, y) => !inRoostSite(x + OX, y + OY) && !inNurserySite(x + OX, y + OY);
  addAbs('roost', site.x, site.y).hidden = true;
  addAbs('nest', site.x, site.y + 30 / TILE - 0.05).roostNest = true;
  for (const [x, y] of [[-6.2, -2.6], [6.2, -2.6], [-6.2, 5.6], [6.2, 5.6]]) addAbs('stake', site.x + x, site.y + y);
  // once it's built, fences run stake to stake round the roost, with a gap at the front to walk in through
  const fence = (key, x, y) => { addAbs(key, site.x + x, site.y + y).roostFence = true; };
  for (let i = 0; i < 12; i++) {
    const x = -6.2 + ((i + 0.5) * 12.4) / 12;
    fence('fenceH', x, -2.6);
    if (Math.abs(x) > 1.6) fence('fenceH', x, 5.6);
  }
  for (let i = 0; i < 8; i++) for (const x of [-6.2, 6.2]) fence('fenceV', x, -2.6 + ((i + 1) * 8.2) / 8);
  const prop = (key, x, y, pen) => Object.assign(addAbs(key, x, y), { dragonPen: pen, sortY: key === 'dragonPool' ? Math.round(y * TILE) - 18 : undefined });
  prop('fishPlate', site.x - 5.25, site.y + 3.5, 'roost');
  prop('fishPlate', site.x + 5.25, site.y + 3.5, 'roost');
  prop('dragonPool', site.x - 5, site.y + 1, 'roost');
  [[-4.5, -1.2], [-1.6, -1.6], [1.4, -1], [4.3, -1.5], [-3.2, 1.6], [0, 2], [3.1, 1.4], [-4.6, 4.4], [-1.5, 4.8], [1.8, 4.2], [4.6, 4.8]]
    .forEach(([x, y], i) => { addAbs(i % 3 ? 'pine' : 'pine2', site.x + x, site.y + y).site = 'roost'; });

  // west of the hut, more stakes and a stand of trees for the nursery where hatchlings are left to grow
  const ns = NURSERY_AT;
  const np = NURSERY_PEN;
  addAbs('nursery', ns.x, ns.y).hidden = true;
  for (const [x, y] of [[-np.x, np.top], [np.x, np.top], [-np.x, np.bottom], [np.x, np.bottom]]) addAbs('stake', ns.x + x, ns.y + y).nursery = true;
  const pen = (key, x, y) => { addAbs(key, ns.x + x, ns.y + y).nurseryFence = true; };
  for (let i = 0; i < 9; i++) {
    const x = -np.x + ((i + 0.5) * 2 * np.x) / 9;
    pen('fenceH', x, np.top);
    if (Math.abs(x) > 1.2) pen('fenceH', x, np.bottom);
  }
  for (let i = 0; i < 6; i++) for (const x of [-np.x, np.x]) pen('fenceV', x, np.top + ((i + 1) * (np.bottom - np.top)) / 6);
  prop('fishPlate', ns.x - 3.6, ns.y + 1.4, 'nursery');
  prop('fishPlate', ns.x + 3.5, ns.y + 2.5, 'nursery');
  prop('dragonPool', ns.x - 2.9, ns.y + 3.4, 'nursery');
  [[-3.2, -0.6], [-0.8, -1.2], [2.4, -0.7], [3.4, 1.9], [-2.8, 2.5], [0.4, 1.6], [2, 3.5], [-1.2, 3.6]]
    .forEach(([x, y], i) => { addAbs(i % 2 ? 'oak' : 'pine', ns.x + x, ns.y + y).site = 'nursery'; });
  woods(h.x - h.rx, h.y - h.ry, h.x + h.rx, h.y + h.ry, 2, 1400, 0.55, fruity(mixed, ['appleTree', 'orangeTree', 'cherryTree', 'pearTree', 'lemonTree', 'peachTree'], 0.18), clear);
  woods(h.x - h.rx, h.y - h.ry, h.x + h.rx, h.y + h.ry, 4, 1401, 0.45, (r) => (r < 0.5 ? 'bushPink' : 'bushYellow'), clear);

  // the jungle isle: palms and bananas on the beach, broad trees, citrus and ferns round a maze of vine trees, and a thunderdrum's
  // nest in the clearing at its heart
  const j = isle('jungle');
  const nest = (species, x, y) => {
    addAbs('nest', x, y - 0.05);
    addAbs(`egg_${species}`, x, y).species = species;
  };
  const maze = jungleMaze(j);
  nest('thunderdrum', maze.x, maze.y + 0.5);
  for (const [x, y] of [[maze.x - 3, maze.y - 2], [maze.x + 3.2, maze.y + 3], [maze.x + 2.8, maze.y - 2.2], [maze.x - 2.6, maze.y + 3.2]]) addAbs('fern', x, y);
  const wild = (x, y) => Math.hypot((x + OX - maze.x) / maze.rx, (y + OY - maze.y) / maze.ry) > 1;
  const jungly = (r) => (r < 0.45 ? 'jungleTree' : r < 0.62 ? 'bananaTree' : r < 0.68 ? 'orangeTree' : r < 0.73 ? 'lemonTree' : 'palm');
  const beachy = (r) => (r < 0.3 ? 'bananaTree' : 'palm');
  woods(j.x - j.rx - 2, j.y - j.ry - 2, j.x + j.rx + 2, j.y + j.ry + 2, 1.7, 1402, 0.8, (r, x, y) => (tileAt(Math.floor(x), Math.floor(y - 0.01)) === T.SAND ? beachy(r) : jungly(r)), wild);
  woods(j.x - j.rx, j.y - j.ry, j.x + j.rx, j.y + j.ry, 1.6, 1403, 0.6, () => 'fern', wild);

  // the ancient ruin: a ring of rune stones round the slab that seals the night fury's egg
  const r = isle('ruin');
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
    addAbs('menhir', r.x + Math.cos(a) * 4.6, r.y + 0.8 + Math.sin(a) * 3.4).rune = i;
  }
  addAbs('altar', r.x, r.y + 0.95);
  addAbs('egg_nightFury', r.x, r.y + 1).species = 'nightFury';
  for (const y of [r.y - 13, r.y - 9.5, r.y - 6]) {
    addAbs('column', r.x - 2.4, y);
    addAbs('column', r.x + 2.6, y);
  }
  [[r.x - 9.5, r.y - 1], [r.x + 9, r.y + 2.5], [r.x - 6.5, r.y + 7], [r.x + 6, r.y - 5]].forEach(([x, y], i) => {
    Object.assign(addAbs('ruinWall', x, y), { rune: RUIN_ORDER[i], notches: i + 1 });
  });
  for (let y = r.y - 40; y <= r.y + 40; y++) {
    for (let x = r.x - 48; x <= r.x + 48; x++) {
      if (isReef(x, y) && hash(x, y, 1405) < 0.7) addAbs(`reef-${Math.floor(hash(x, y, 1406) * 3)}`, x + 0.2 + hash(x, y, 1407) * 0.6, y + 0.4 + hash(x, y, 1408) * 0.5);
    }
  }
  addAbs('stone', r.x + 4, r.y + 9);
  // an old grove of oranges and lemons on the sunny south-east slope
  grove(['orangeTree', 'lemonTree'], r.x + 11, r.y + 6, 7, 1410);
  woods(r.x - r.rx, r.y - r.ry, r.x + r.rx, r.y + r.ry, 2.2, 1404, 0.5, fruity(mixed, ['plumTree', 'peachTree', 'orangeTree'], 0.14), (x, y) => Math.hypot((x + OX - r.x) / 9, (y + OY - r.y) / 7) > 1 && Math.abs(x + OX - r.x) > 4);

  // the frozen isle: snow, a frozen lake, ice crystals, and an ice cave with a light fury's nest at the end
  const f = isle('frozen');
  const cave = ROOMS.cave.spots;
  nest('lightFury', ...caveSpot(...cave.egg));
  const mouth = [f.x - 6, f.y - 1.6];
  addAbs('caveMouth', ...mouth).room = 'cave';
  // a ring of glacier ice round the mouth that only a torch, or a dragon's fire, will melt
  const rim = [mouth[0], mouth[1] - 0.3, 4.6, 3.4];
  for (const [x, y] of ovalRing(...rim, 10)) addAbs('iceWall', x, y);
  for (const [x, y] of cave.glowcaps) addAbs('glowcaps', ...caveSpot(x, y));
  for (const [x, y] of cave.gold) addAbs('goldOre', ...caveSpot(x, y));
  cave.stalagmites.forEach(([x, y], i) => addAbs(`stalagmite-${i % 3}`, ...caveSpot(x, y)));
  for (const [x, y] of [...cave.eggCrystals, ...cave.crystals]) addAbs('caveCrystal', ...caveSpot(x, y));
  for (const [x, y] of [[f.x - 2.4, f.y - 3.2], [f.x + 9.6, f.y - 2], [f.x + 4, f.y + 3.4], [f.x - 1, f.y + 3.6], [f.x + 1, f.y - 5.4], [f.x - 10, f.y + 8.4]]) addAbs('iceCrystal', x, y);
  for (const [x, y] of [[f.x - 12, f.y - 2], [f.x + 13, f.y + 4], [f.x + 6, f.y + 8], [f.x - 5, f.y + 9.5], [f.x + 15, f.y - 6]]) addAbs('boulderSnow', x, y);
  addAbs('cairn', f.x - 8.6, f.y - 6.2);
  woods(f.x - f.rx, f.y - f.ry, f.x + f.rx, f.y + f.ry, 1.8, 1405, 0.62, () => 'snowPine', (x, y) => Math.hypot((x + OX - rim[0]) / (rim[2] + 1.5), (y + OY - rim[1]) / (rim[3] + 1.2)) > 1);

  // the dune isle: a sphinx lies across the door of a sandstone bluff, and behind it the sand cave's hoard,
  // with a terrible terror's egg on the dais at the very back
  const s = isle('speck');
  addAbs('sandCave', s.x, s.y - 3).room = 'sandCave';
  addAbs('sphinx', s.x, s.y - 3 + 17 / TILE);
  addAbs('dais', ...sandSpot(22.5, 5.3));
  nest('terribleTerror', ...sandSpot(22.5, 5.4));
  for (const x of [12.5, 17.5, 27.5, 32.5]) for (const y of [14.5, 22.5]) addAbs('sandPillar', ...sandSpot(x, y));
  for (const [x, y] of [[9.5, 18], [35.5, 18], [19.5, 24.5], [25.5, 24.5], [8.5, 7.5], [36.5, 7.5], [27.5, 6.8]]) addAbs('brazier', ...sandSpot(x, y));
  [[9.5, 15.5], [35.5, 15.5], [10, 21], [35, 21], [4, 10], [41, 10]].forEach(([x, y], i) => addAbs(`urn-${i % 2}`, ...sandSpot(x, y)));
  for (const [x, y] of [[18.5, 4.8], [26.5, 4.8]]) addAbs('goldStatue', ...sandSpot(x, y));
  for (const [x, y] of [[15, 18.5], [30, 18.5], [22.5, 13.5], [20, 21.5], [25, 21.5], [5, 11.2], [40, 11.2]]) addAbs('coinPile', ...sandSpot(x, y));
  for (const [x, y] of [[6.5, 11], [38.5, 11]]) addAbs('goldHeap', ...sandSpot(x, y));
  for (const [x, y, loot] of [[4.5, 8, ['ruby', 'ruby', 'goblet']], [40.5, 8, ['emerald', 'emerald', 'goblet']], [17.5, 6.8, ['crown', 'ruby', 'emerald']]]) {
    addAbs('hoardChest', ...sandSpot(x, y)).loot = loot;
  }
  for (const [x, y] of [[s.x + 8, s.y + 2.5], [s.x + 14.5, s.y + 3.5], [s.x + 9, s.y + 8], [s.x + 14, s.y + 7.6], [s.x + 6.5, s.y + 6]]) addAbs('palm', x, y);
  for (const [x, y] of [[s.x - 12, s.y + 2], [s.x - 9.5, s.y + 6.5], [s.x - 15, s.y - 2]]) addAbs('column', x, y);
  for (const [x, y] of [[s.x - 6, s.y + 9], [s.x + 17, s.y - 5], [s.x - 17, s.y + 7]]) addAbs('boulder', x, y);
  addAbs('stone', s.x + 3.4, s.y + 6.6);
  // cacti dotted over the dunes, leaving the ground before the sphinx and the cave door clear
  const cactusKind = (r) => (r < 0.4 ? 'cactus' : r < 0.65 ? 'cactusTall' : 'barrelCactus');
  woods(s.x - s.rx, s.y - s.ry, s.x + s.rx, s.y + s.ry, 2.4, 1406, 0.5, cactusKind, (x, y) => Math.hypot((x + OX - s.x) / 8, (y + OY - s.y - 1) / 6) > 1);

  // Hawk Rock: Old Bjorn's cache in a thicket of brambles on the plateau, its mouth stopped with a boulder;
  // a fallen trunk across the gap in the spur below
  const k = isle('hawk');
  const cx = k.x + HAWK.cache[0];
  const cy = k.y + HAWK.cache[1];
  addAbs('stoneCache', cx, cy - 0.4);
  addAbs('looseRock', cx, cy - 0.4 + 8 / TILE);
  for (const [x, y] of ovalRing(cx, cy + 0.2, 4.4, 3.1, 9)) addAbs('bramble', x, y);
  addAbs('fallenLog', k.x + HAWK.spur[0] + 1, k.y + HAWK.gap[1] + 1 + 2 / TILE);
  for (const [x, y, key] of [
    [k.x + 6, k.y + 10, 'pine'], [k.x + 10, k.y + 12.5, 'oak'], [k.x + 15, k.y + 9.5, 'pine2'], [k.x + 3, k.y + 13.5, 'pine'],
    [k.x - 9, k.y + 13, 'pine2'], [k.x - 17, k.y + 11, 'oak'],
    [k.x - 12, k.y - 6, 'pine'], [k.x - 8, k.y - 11, 'pine2'], [k.x + 12, k.y - 7, 'oak'], [k.x + 15, k.y - 3.5, 'pine'], [k.x - 16, k.y + 2.6, 'pine2'],
  ]) addAbs(key, x, y);
  for (const [x, y] of [[k.x + 14, k.y + 10.5], [k.x - 13, k.y - 3], [k.x + 9, k.y - 12]]) addAbs('boulder', x, y);
  addAbs('cairn', k.x - 12, k.y + 9.3);

  // the fire mountain, with the fire cave's mouth at the foot of its west face, and inside at the top the lava pool
  addAbs('volcano', VOLCANO.x, VOLCANO.y + 0.4);
  addAbs('fireCaveMouth', VOLCANO.x - 2.75, VOLCANO.y + 0.4).room = 'fireCave';
  addAbs('lavaPool', ...fireSpot(FIRE_POOL.x, FIRE_POOL.y));
  for (const [x, y] of [[9, 9.5], [26.5, 7.5], [24, 14.2]]) addAbs('boulderDark', ...fireSpot(x, y));
  const v = isle('volcano');
  woods(v.x - v.rx, v.y - v.ry, v.x + v.rx, v.y + v.ry, 3, 1406, 0.5, (q) => (q < 0.55 ? 'deadTree' : 'boulderDark'));

  // the islets: a chest half-hidden among a few trees, open to the south
  for (const i of ISLANDS.filter((n) => n.islet)) {
    Object.assign(addAbs('hoardChest', i.x + 0.5, i.y + 0.6), { loot: i.islet.loot, mark: i.islet.mark, note: i.islet.note });
    addAbs('stone', i.x - 2.5, i.y + 1.8);
    for (const [dx, dy] of [[-3.2, -1], [3.4, -0.6], [-0.8, -2.2], [2.2, -2.6], [-3.8, 1.8], [3.6, 2.2]]) {
      if (isLand(tileAt(Math.floor(i.x + dx), Math.floor(i.y + dy - 0.01)))) addAbs(i.islet.trees, i.x + dx, i.y + dy);
    }
  }

  // Stormcrown Tor: the barrow with the skrill's egg on its crown and six rod sockets round it (each with its rod,
  // hidden until one is set), the weather-watcher's fallen lookout, glassy streaks where lightning struck the
  // ground, and trees it split
  const t = isle('tor');
  const m = TOR_AT;
  addAbs('torMound', m.x, m.y);
  Object.assign(addAbs('egg_skrill', m.x, m.y + 0.3), { species: 'skrill', storm: true });
  m.sockets.forEach(([dx, dy], i) => {
    Object.assign(addAbs('rodSocket', m.x + dx, m.y + dy), { socket: i });
    Object.assign(addAbs('lightningRodSet', m.x + dx, m.y + dy + 0.06), { socket: i, hidden: true });
  });
  addAbs('lookout', t.x - 9, t.y + 4.5);
  for (const [x, y] of [[t.x + 8, t.y + 6], [t.x - 13, t.y - 3], [t.x + 12, t.y - 6], [t.x - 5, t.y + 9], [t.x + 16, t.y + 3]]) addAbs('glassStreak', x, y);
  for (const [x, y] of [[t.x - 15, t.y + 4], [t.x + 14, t.y + 8], [t.x + 6, t.y - 9], [t.x - 8, t.y - 8]]) plant('boulder', x, y);
  const clearOf = (x, y) => Math.hypot((x + OX - m.x) / 8, (y + OY - m.y) / 6) > 1 && Math.hypot(x + OX - (t.x - 9), y + OY - (t.y + 4.5)) > 3;
  woods(t.x - t.rx, t.y - t.ry, t.x + t.rx, t.y + t.ry, 2.8, 1409, 0.5, (r) => (r < 0.55 ? 'splitTree' : 'pine2'), clearOf);
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
