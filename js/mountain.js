// The mountains behind the great hall rise in ledges: each tier is a stretch of level ground standing on a rock
// face FACE rows high. Where a ledge ends beside lower ground to its east or west it just stops, a drop nobody walks
// across but anyone can hop down; beside lower ground to its north it drops away in a wall. Any face up to
// CLIMB_REACH rows high can be climbed by hand, and hopped down from the brink. The pass zigzags up from the trail's
// end, a cairn at the head of each climb. The rock and the ground change with height: warm granite and alpine grass
// low down, blue-grey stone, snow and ice up top.

// 0 off the mountain; a face has the tier it climbs to.
const tier = new Uint8Array(MAP_W * MAP_H);
const tierAt = (x, y) => (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H ? tier[y * MAP_W + x] : 0);
const FACE = 2;
const TIERS = 5;
const CLIMB_REACH = FACE + 1;
// Where the pass climbs onto each tier, in village columns: it zigzags up from the trail's end.
const PASS_FLIGHTS = [63, 69, 62, 70, 64];
// Ledges run deeper here, `extra` rows over `r` columns either side of village column `x`: room to stop and look.
const FLATS = [
  { k: 1, x: 92, r: 10, extra: 3 }, { k: 1, x: 40, r: 6, extra: 2 },
  { k: 2, x: 52, r: 8, extra: 3 }, { k: 2, x: 104, r: 9, extra: 3 },
  { k: 3, x: 84, r: 10, extra: 3 },
];
// The pass's way up onto each tier: its left column, the face's top row and the tier it climbs to.
const flights = [];

const ledgeDepth = (k, x) => 3 + Math.floor(vnoise(x, k * 17, 9, 300 + k) * (k < 3 ? 3 : 2))
  + FLATS.reduce((n, f) => n + (f.k === k && Math.abs(x - OX - f.x) <= f.r ? f.extra : 0), 0);

function ledgeGround(k, x, y) {
  const n = vnoise(x, y, 3.5, 320 + k);
  if (k === 1) return n > 0.5 ? T.GRASS : T.ROCK;
  if (k === 2) return n > 0.5 ? T.SNOW : T.ROCK;
  if (k === 3) return n > 0.25 ? T.SNOW : T.ROCK;
  return T.SNOW;
}

// Carves the solid mountain mass into tiers. `B[x]` lists, for each tier, the row its level ground ends at: level
// for runs of columns, so each face runs straight for a way before it steps.
function terraceMountain() {
  const feet = new Map();
  for (let x = OX - 3; x < OX + 142; x++) {
    for (let y = OY + 46; y >= 0; y--) if (tileAt(x, y) === T.MOUNT) { feet.set(x, y); break; }
  }
  const cols = [...feet.keys()];
  const runs = (k, fn) => {
    const out = new Map();
    for (let s = 0; s < cols.length;) {
      const run = cols.slice(s, s + 5 + Math.floor(hash(cols[s], k, 401) * 8));
      const v = Math.min(...run.map(fn));
      for (const x of run) out.set(x, v);
      s += run.length;
    }
    return out;
  };
  const levels = [runs(0, (x) => feet.get(x) - FACE)];
  for (let k = 1; k < TIERS; k++) levels.push(runs(k, (x) => levels[k - 1].get(x) - ledgeDepth(k, x)));
  const B = new Map(cols.map((x) => [x, levels.map((l) => l.get(x))]));
  for (const x of cols) {
    const b = B.get(x);
    for (let y = 0; y <= feet.get(x); y++) {
      const i = y * MAP_W + x;
      if (map[i] !== T.MOUNT) continue;
      const k = b.filter((v) => y <= v).length;
      const face = k < TIERS && y <= b[k] + FACE;
      map[i] = face ? T.CLIFF : k ? ledgeGround(k, x, y) : T.ROCK;
      tier[i] = face ? k + 1 : k;
    }
  }
  const ground = (x, y) => isLand(tileAt(x, y));
  // the stream wells up from under the bottom face
  for (let x = 53; x <= 55; x++) {
    for (let y = feet.get(x + OX) - OY; tileAt(x + OX, y + OY) === T.ROCK && !tierAt(x + OX, y + OY); y--) wetL(x, y);
  }

  // a ledge that ends beside lower ground to its north or south drops away in a wall
  const walls = [];
  for (let y = 0; y < OY + 48; y++) {
    for (let x = OX - 4; x < OX + 143; x++) {
      const k = tierAt(x, y);
      if (!k || !ground(x, y)) continue;
      if ([[0, 1], [0, -1]].some(([dx, dy]) => ground(x + dx, y + dy) && tierAt(x + dx, y + dy) < k)) walls.push(y * MAP_W + x);
    }
  }
  for (const i of walls) map[i] = T.CLIFF;

  // a frozen tarn on the roomiest stretch of the high snow
  const high = (x, y) => tierAt(x, y) === 4 && (tileAt(x, y) === T.SNOW || tileAt(x, y) === T.ICE);
  let tarn = null;
  for (const x of cols) {
    for (let y = 0; y < OY + 30; y++) {
      if (!high(x, y)) continue;
      let room = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -4; dx <= 4; dx++) if (high(x + dx, y + dy)) room++;
      if (!tarn || room > tarn.room) tarn = { x, y, room };
    }
  }
  if (tarn) {
    inBlob(tarn.x - OX + 0.5, tarn.y - OY + 0.5, 3.6, 1.6, 23, 0.4, (x, y) => {
      const [ax, ay] = [x + OX, y + OY];
      if (high(ax, ay) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => high(ax + dx, ay + dy))) setTile(ax, ay, T.ICE);
    });
  }

  // The pass's way up fits two columns of a face that's exactly FACE rows high, with level ground at its head and
  // its foot and face either side of it.
  const isFace = (x, y, k) => tileAt(x, y) === T.CLIFF && tierAt(x, y) === k;
  const fits = (x, k) => {
    const b = B.get(x)?.[k - 1];
    if (b === undefined || B.get(x + 1)?.[k - 1] !== b) return false;
    for (const c of [x, x + 1]) {
      for (let r = 1; r <= FACE; r++) if (!isFace(c, b + r, k)) return false;
      if (!ground(c, b) || tierAt(c, b) !== k || !ground(c, b - 1) || !ground(c, b + FACE + 1)) return false;
    }
    return isFace(x - 1, b + 1, k) && isFace(x + 2, b + 1, k);
  };
  for (let k = 1; k <= TIERS; k++) {
    const ok = cols.filter((x) => fits(x, k));
    if (!ok.length) continue;
    const want = PASS_FLIGHTS[k - 1] + OX;
    const x = ok.reduce((a, c) => (Math.abs(c - want) < Math.abs(a - want) ? c : a));
    flights.push({ x, y: B.get(x)[k - 1] + 1, k });
  }

  // pockets that can't be climbed or hopped to are solid rock
  const seen = reachable([PASS_FLIGHTS[0] + OX, B.get(PASS_FLIGHTS[0] + OX)[0] + FACE + 1]);
  for (let i = 0; i < MAP_W * MAP_H; i++) if (tier[i] && !seen[i] && isLand(map[i])) map[i] = T.CLIFF;

  // nothing grows on the pass's way up, or right at the head or foot of it
  for (const f of flights) {
    for (let y = f.y - 2; y <= f.y + FACE + 1; y++) for (let x = f.x - 1; x <= f.x + 2; x++) if (inBounds(x, y) && y < MAP_H) occ[y * MAP_W + x] = 1;
  }
}

// The land tile `s` rows up (-1) or down (1) from tile `i` over a mountain face low enough to climb or hop, if any.
function overFace(i, s) {
  const first = i + s * MAP_W;
  if (first < 0 || first >= MAP_W * MAP_H || map[first] !== T.CLIFF || !tier[first]) return -1;
  for (let k = 1, j = first; k <= CLIMB_REACH; k++, j += s * MAP_W) {
    const next = j + s * MAP_W;
    if (next < 0 || next >= MAP_W * MAP_H) return -1;
    if (map[next] !== T.CLIFF) return isLand(map[next]) ? next : -1;
  }
  return -1;
}

// Every tile that can be got to from `start`: stepping about a tier, climbing up the mountain's faces and hopping
// down them, and climbing up or hopping down the end of a ledge one tier from the ground beside it.
function reachable([sx, sy]) {
  const seen = new Uint8Array(MAP_W * MAP_H);
  const q = [sy * MAP_W + sx];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % MAP_W;
    const steps = [i - MAP_W, i + MAP_W].filter((j) => tier[j] === tier[i])
      .concat([x > 0 ? i - 1 : -1, x < MAP_W - 1 ? i + 1 : -1].filter((j) => j >= 0 && Math.abs(tier[j] - tier[i]) <= 1));
    for (const j of [...steps, overFace(i, -1), overFace(i, 1)]) {
      if (j < 0 || j >= MAP_W * MAP_H || seen[j] || !isLand(map[j])) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return seen;
}

// Whether a box lies across ground of two tiers, half off the end of a ledge: nobody walks across there.
function acrossTiers(x0, y0, x1, y1) {
  const [tx0, ty0, tx1, ty1] = [Math.floor(x0 / TILE), Math.floor(y0 / TILE), Math.floor((x1 - 0.001) / TILE), Math.floor((y1 - 0.001) / TILE)];
  const k = tierAt(tx0, ty0);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (tierAt(tx, ty) !== k) return true;
  return false;
}

// ---------- on the mountain ----------

// Cairns at the head of the pass's climbs, snow pines and boulders along the ledges, and ice on the heights.
function placeMountain() {
  const pass = PASS_FLIGHTS.map((px, k) => flights.find((f) => f.k === k + 1 && Math.abs(f.x - OX - px) < 12)).filter(Boolean);
  for (const f of pass) {
    const side = tileAt(f.x - 2, f.y - 1) === T.CLIFF ? 3.4 : -1.4;
    plant('cairn', f.x + side, f.y - 0.6);
  }
  const top = pass[pass.length - 1];
  if (top) for (const [dx, dy] of [[-4, -3], [5, -4], [7, -2]]) plant('iceCrystal', top.x + dx, top.y + dy);
  woods(OX, OY - 4, OX + 140, OY + 30, 2.6, 1345, 0.5, (r, x, y) => {
    const k = tierAt(Math.floor(x), Math.floor(y - 0.01));
    if (r < 0.12) return k >= 3 ? 'boulderSnow' : 'boulder';
    if (r < 0.18) return 'stone';
    if (r < 0.24 && k >= 4) return 'iceCrystal';
    return k === 1 && r > 0.8 ? 'pine2' : 'snowPine';
  }, (x, y) => tierAt(Math.floor(x + OX), Math.floor(y + OY - 0.01)) > 0);
}

// SPACE at the brink of any low ledge outdoors, facing down it: a hop to the ground at its foot. Or at the end of a
// mountain ledge, facing off it: a hop down onto the lower ground beside it.
function ledgeDrop() {
  if (indoors || !canUseTool() || player.jumpT >= 0 || hop) return null;
  if (player.dir === 'left' || player.dir === 'right') return sideDrop(player.dir === 'left' ? -1 : 1);
  if (player.dir !== 'down') return null;
  const c = cliffAhead();
  if (!c || c.s < 0 || c.k > CLIMB_REACH) return null;
  return c.bottom;
}

function sideDrop(s) {
  const tx = tileX(player.x);
  const ty = tileY(player.y);
  if (!isLand(tileAt(tx + s, ty)) || tierAt(tx + s, ty) >= tierAt(tx, ty)) return null;
  const edge = s < 0 ? player.x - 5 - tx * TILE : (tx + 1) * TILE - player.x - 5;
  if (edge > 4) return null;
  const x = s < 0 ? tx * TILE - 8 : (tx + 1) * TILE + 8;
  return [player.y, ty * TILE + 12].map((y) => ({ x, y })).find((p) => canStand(player, p.x, p.y)) || null;
}

// SPACE at the foot of a face, facing up it: a climb to the brink of the ledge above. Or beside the end of a ledge
// one tier up, facing it: a climb up its side.
function faceClimb() {
  if (indoors || !canUseTool() || player.jumpT >= 0 || hop) return null;
  if (player.dir === 'left' || player.dir === 'right') return sideClimb(player.dir === 'left' ? -1 : 1);
  if (player.dir !== 'up') return null;
  const c = cliffAhead();
  if (!c || c.s > 0 || c.k > CLIMB_REACH || !tierAt(tileX(c.x), tileY(player.y) - 1)) return null;
  return c;
}

function sideClimb(s) {
  const tx = tileX(player.x);
  const ty = tileY(player.y);
  if (!isLand(tileAt(tx + s, ty)) || tierAt(tx + s, ty) !== tierAt(tx, ty) + 1) return null;
  const edge = s < 0 ? player.x - 5 - tx * TILE : (tx + 1) * TILE - player.x - 5;
  if (edge > 4) return null;
  const x = s < 0 ? tx * TILE - 8 : (tx + 1) * TILE + 8;
  const top = [player.y, ty * TILE + 12].map((y) => ({ x, y })).find((p) => canStand(player, p.x, p.y));
  return top ? { top, k: FACE, side: player.dir } : null;
}

function climbFace(c) {
  climbTo(c.top, c.k, c.side && (() => { player.dir = c.side; }));
  Sfx.thunk(0.4);
}

function hopDown(to) {
  Sfx.jump();
  startHop(to.x, to.y, 0, 0, () => {
    player.flying = false;
    dust(player.x, player.y);
    Sfx.land();
  });
  Object.assign(hop, { dur: 0.4, arc: 10 });
}

// ---------- painting ----------

// Rock by height, lit from the upper left: `snow` is how much of it lies on the ledges in the face.
const TIER_ROCK = [
  { lit: '#b5ad9f', mid: '#958d80', low: '#736c61', deep: '#4c4740', snow: 0 },
  { lit: '#b5ad9f', mid: '#958d80', low: '#736c61', deep: '#4c4740', snow: 0.05 },
  { lit: '#a8a7ab', mid: '#828187', low: '#605f66', deep: '#41404a', snow: 0.3 },
  { lit: '#a3adbd', mid: '#7c879b', low: '#5c6679', deep: '#3d4558', snow: 0.55 },
  { lit: '#b4c2d4', mid: '#8a99b0', low: '#66748d', deep: '#444f66', snow: 0.75 },
  { lit: '#c4d2e2', mid: '#98a8c0', low: '#72829c', deep: '#4c5872', snow: 0.9 },
];
const TIER_SCREE = [
  SCREE,
  ['#99938a', '#b0aa9f', '#7a756c'],
  ['#8c8d92', '#a6a7ac', '#6e6f75'],
  ['#878fa0', '#a0a8b6', '#6a7284'],
  ['#8a95a8', '#a8b2c2', '#6c778c'],
  ['#8a95a8', '#a8b2c2', '#6c778c'],
];
const rockOf = (k) => TIER_ROCK[Math.min(TIERS, k)];
const screeOf = (k) => TIER_SCREE[Math.min(TIERS, k)];
const SNOW_LIP = () => [PAL.snow, PAL.snowLight, PAL.snowDark];

function lipColors(t, k) {
  if (t === T.GRASS) return [PAL.grass, PAL.grassLight, PAL.grassDark];
  if (t === T.ROCK) return screeOf(k);
  return SNOW_LIP();
}

// A rock face split into columns by joints, its bedding cracks catching the snow, lit near the brink and darker
// toward its foot. The top row carries the brink of the ledge above, icicles hanging off it up high; the bottom row
// runs out onto the ledge below in a bank of scree.
function faceTile(g, x, y, X, Y) {
  const k = tierAt(x, y);
  const p = rockOf(k);
  const same = (tx, ty) => tileAt(tx, ty) === T.CLIFF && tierAt(tx, ty) === k;
  let r = 0;
  while (r < 8 && same(x, y - r - 1)) r++;
  let n = r + 1;
  while (n < 9 && same(x, y + n - r)) n++;
  // columns of rock between joints that jog a pixel every few rows, each rounded: lit on the left, dark on the right
  const joint = (b) => b * 8 + Math.floor(hash(b, k, 342) * 6);
  for (let rr = 0; rr < 16; rr++) {
    const wy = Y + rr;
    const jog = Math.floor(hash(Math.floor(wy / 3), k, 344) * 3) - 1;
    for (let i = 0; i < 16;) {
      const wx = X + i + jog;
      let b = Math.floor(wx / 8);
      if (wx < joint(b)) b--;
      const j = joint(b);
      const w = joint(b + 1) - j;
      const at = wx - j;
      const h = hash(b, k, 343);
      const tone = h < 0.3 ? p.lit : h < 0.8 ? p.mid : p.low;
      const [c, len] = at === 0 ? [p.deep, 1] : at === 1 ? [shade(tone, 0.14), 1] : at < w - 2 ? [tone, w - 2 - at] : [p.low, w - at];
      rect(g, X + i, wy, Math.min(len, 16 - i), 1, c);
      i += Math.min(len, 16 - i);
    }
  }
  // level bedding cracks, the ledge under each lit or holding snow, more of it up top
  const snow = p.snow * (n > 1 && r === 0 ? 1.2 : 0.7);
  for (let rr = 0; rr < 16; rr++) {
    for (let i = 0; i < 16; i++) {
      const wx = X + i;
      const wy = Y + rr;
      const m = wy % 6;
      if (m > 1) continue;
      const band = Math.floor(wy / 6);
      if (hash(band, Math.floor((wx + hash(band, k, 346) * 12) / 12), 345 + k) > 0.45) continue;
      px(g, wx, wy, m === 0 ? p.deep : hash(wx, wy, 347) < snow ? PAL.snowLight : shade(p.lit, 0.08));
    }
  }
  // sky catches the face near its brink; its foot is in shade
  for (let rr = 0; rr < 16; rr++) {
    const f = (r * 16 + rr) / (n * 16);
    g.fillStyle = f < 0.35 ? `rgba(255,255,255,${((0.35 - f) * 0.3).toFixed(3)})` : `rgba(0,0,0,${((f - 0.35) * 0.3).toFixed(3)})`;
    g.fillRect(X, Y + rr, 16, 1);
  }
  const up = tileAt(x, y - 1);
  if (!same(x, y - 1) && isLand(up)) {
    const [base, hi, lo] = lipColors(up, tierAt(x, y - 1));
    rect(g, X, Y, 16, 3, base);
    rect(g, X, Y, 16, 1, hi);
    for (let i = 0; i < 16; i++) {
      const h = hash(X + i, Y, 348);
      if (h < 0.5) px(g, X + i, Y + 3, base);
      px(g, X + i, Y + (h < 0.5 ? 4 : 3), lo);
      if (k >= 3 && up !== T.GRASS && up !== T.ROCK && hash(X + i, Y, 349) < 0.18) {
        const len = 2 + Math.floor(hash(X + i, Y, 350) * 4);
        rect(g, X + i, Y + 4, 1, len, '#dff1ff');
        px(g, X + i, Y + 4 + len, PAL.iceDark);
      }
    }
  } else if (!same(x, y - 1)) {
    rect(g, X, Y, 16, 1, p.deep);
    for (let i = 0; i < 16; i++) if (hash(X + i, Y, 351) < 0.3 + p.snow * 0.6) px(g, X + i, Y + 1, PAL.snowLight);
  }
  const below = tileAt(x, y + 1);
  if (!same(x, y + 1) && isLand(below)) {
    const [base, hi, lo] = lipColors(below, tierAt(x, y + 1));
    for (let i = 0; i < 16; i++) {
      const wx = X + i;
      const h = Math.max(1, 3 + Math.round(Math.sin(wx * 0.55 + hash(Math.floor(wx / 9), k, 352) * 6) * 1.5 + hash(wx, Y, 353) * 1.5));
      px(g, wx, Y + 15 - h, shade(p.low, -0.2));
      rect(g, wx, Y + 16 - h, 1, h, base);
      px(g, wx, Y + 16 - h, hi);
      if (h > 2 && hash(wx, Y, 354) < 0.25) px(g, wx, Y + 17 - h + Math.floor(hash(wx, Y, 355) * (h - 2)), lo);
    }
    for (let i = 0; i < 3; i++) {
      const sx = X + Math.floor(hash(x, y, 356 + i) * 14);
      rect(g, sx, Y + 12 + Math.floor(hash(x, y, 359 + i) * 3), 2, 1, i % 2 ? p.low : p.lit);
    }
  } else if (!same(x, y + 1)) {
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(X, Y + 11, 16, 5);
    for (let i = 0; i < 5; i++) {
      const sx = X + Math.floor(hash(x, y, 352 + i) * 14);
      rect(g, sx, Y + 14, 2, 2, i % 2 ? p.low : p.lit);
    }
  }
  if (tileAt(x - 1, y) !== T.CLIFF) {
    rect(g, X, Y, 2, 16, p.lit);
    rect(g, X, Y, 1, 16, p.deep);
  }
  if (tileAt(x + 1, y) !== T.CLIFF) {
    rect(g, X + 14, Y, 2, 16, p.low);
    rect(g, X + 15, Y, 1, 16, p.deep);
  }
}

// Where a mountain ledge ends beside lower ground, its edge is a lit lip over a dark line, and the ground below it
// lies in its shadow, longer off a ledge's right-hand end since the light comes from the upper left.
function sideStep(g, x, y, X, Y) {
  const k = tierAt(x, y);
  for (const side of [-1, 1]) {
    const nt = tileAt(x + side, y);
    const nk = tierAt(x + side, y);
    if (!isLand(nt) || nk === k) continue;
    if (nk < k) {
      const p = rockOf(k);
      rect(g, side < 0 ? X : X + 15, Y, 1, 16, p.deep);
      rect(g, side < 0 ? X + 1 : X + 14, Y, 1, 16, shade(p.lit, 0.1));
    } else {
      const w = side < 0 ? 5 : 3;
      for (let i = 0; i < w; i++) {
        g.fillStyle = `rgba(0,0,0,${(0.3 * (1 - i / w)).toFixed(3)})`;
        g.fillRect(side < 0 ? X + i : X + 15 - i, Y, 1, 16);
      }
    }
  }
}

// Level ground on a ledge: scree that gets colder and frostier, and snow that gets deeper and wind-rippled.
function ledgeTile(g, x, y, X, Y) {
  const t = tileAt(x, y);
  const k = tierAt(x, y);
  if (t === T.ROCK) {
    const [base, light, dark] = screeOf(k);
    speckle(g, x, y, X, Y, base, light, dark, 18);
    for (let i = 0; i < 2; i++) {
      if (hash(x, y, 830 + i) >= 0.4) continue;
      const sx = X + 2 + Math.floor(hash(x, y, 832 + i) * 10);
      const sy = Y + 2 + Math.floor(hash(x, y, 834 + i) * 11);
      rect(g, sx, sy, 3, 2, light);
      rect(g, sx, sy + 2, 3, 1, rockOf(k).deep);
    }
    if (k === 1 && hash(x, y, 360) < 0.45) {
      const tx = X + 2 + Math.floor(hash(x, y, 361) * 12);
      const ty = Y + 4 + Math.floor(hash(x, y, 362) * 10);
      px(g, tx - 1, ty - 1, '#b8b060');
      px(g, tx + 1, ty - 1, '#b8b060');
      px(g, tx, ty, '#8a8a40');
    }
    if (k >= 2) for (let i = 0; i < 4; i++) if (hash(x, y, 363 + i) < 0.6) px(g, X + Math.floor(hash(x, y, 370 + i) * 16), Y + Math.floor(hash(x, y, 375 + i) * 16), PAL.snowLight);
    blendGrass(g, x, y, X, Y);
    blendInto(g, x, y, X, Y, T.SNOW, PAL.snow);
  } else {
    speckle(g, x, y, X, Y, PAL.snow, PAL.snowLight, PAL.snowDark, k >= 4 ? 5 : 9);
    if (k >= 4) {
      for (let i = 0; i < 2; i++) {
        const sy = Y + 3 + i * 7 + Math.floor(hash(x, y, 380 + i) * 3);
        for (let j = 0; j < 16; j++) {
          const wy = sy + Math.round(Math.sin((X + j) * 0.35 + y * 1.7 + i) * 1.2);
          px(g, X + j, wy, PAL.snowDark);
          px(g, X + j, wy - 1, PAL.snowLight);
        }
      }
      if (hash(x, y, 384) < 0.5) px(g, X + Math.floor(hash(x, y, 385) * 16), Y + Math.floor(hash(x, y, 386) * 16), '#ffffff');
    } else if (hash(x, y, 840) < 0.35) {
      const sx = X + 2 + Math.floor(hash(x, y, 841) * 9);
      const sy = Y + 3 + Math.floor(hash(x, y, 842) * 11);
      rect(g, sx, sy, 5, 1, PAL.snowDark);
      rect(g, sx + 1, sy - 1, 3, 1, PAL.snowLight);
    }
    if (k === 3 && hash(x, y, 387) < 0.25) {
      const sx = X + 3 + Math.floor(hash(x, y, 388) * 9);
      const sy = Y + 4 + Math.floor(hash(x, y, 389) * 9);
      rect(g, sx, sy, 3, 2, rockOf(k).mid);
      rect(g, sx, sy, 3, 1, PAL.snowLight);
    }
    blendInto(g, x, y, X, Y, T.ROCK, screeOf(k)[0]);
  }
  rim(g, x, y, X, Y);
  // stones spilt down off the face above, thinning out away from its foot
  if (tileAt(x, y - 1) === T.CLIFF && tierAt(x, y - 1) > k) {
    const q = rockOf(k + 1);
    for (let i = 0; i < 6; i++) {
      if (hash(x, y, 390 + i) < 0.3) continue;
      const sx = X + Math.floor(hash(x, y, 396 + i) * 14);
      const sy = Y + Math.floor(hash(x, y, 402 + i) * (2 + i * 1.5));
      rect(g, sx, sy, 2, 1, q.lit);
      px(g, sx + 1, sy + 1, q.deep);
    }
  }
}
