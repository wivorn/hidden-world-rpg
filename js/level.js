// Levels for the level editor (index.html?editor): every outdoor tile, and everything set out on them, swapped in
// for the story world once the game has set itself up. There's no art or behaviour of its own here: things are
// made with the game's own constructors and drawn by its renderer, so any kind of dragon, animal, tree or terrain
// added to the game turns up in the editor as well.

const LEVEL_VERSION = 1;
const LEVEL_TILES = MAP_W * MAP_H;
const outdoors = (o) => o.y < MAP_H * TILE;

// Ground that only belongs in rooms and caves, or that the game cuts itself (ice-fishing holes).
const INDOOR_TILES = new Set([T.FLOOR, T.WALL, T.VOID, T.DOOR, T.CAVE, T.HOLE]);
const TERRAINS = Object.entries(T).filter(([, t]) => !INDOOR_TILES.has(t)).map(([id, t]) => ({ id, t }));
const TERRAIN_NAMES = { WATER: 'Water', GRASS: 'Grass', PATH: 'Cobbles', WOOD: 'Boardwalk', DIRT: 'Dirt', CLIFF: 'Cliff', STAIRS: 'Stairs', FALL: 'Waterfall', HAY: 'Hay', SAND: 'Sand', ROCK: 'Rock', SNOW: 'Snow', MOUNT: 'Mountain', SPRING: 'Hot spring', ASH: 'Ash', LAVA: 'Lava', ICE: 'Ice', FIELD: 'Field', JUNGLE: 'Jungle' };
const terrainName = (id) => TERRAIN_NAMES[id] || id[0] + id.slice(1).toLowerCase();

// The kinds the game itself has; ones bred in the editor are kept with the level that has them.
const GAME_SPECIES = Object.keys(DRAGON_SPECIES);

const stageName = (s) => (s >= GROWN ? 'Grown' : ['Hatchling', 'Youngling', 'Juvenile'][s] || `Young ${s + 1}`);

// Where each thing grows best when the default level is laid out, for the ones the game itself never plants.
const LEVEL_SOIL = {
  vineTree: [T.JUNGLE, T.GRASS], fallenLog: [T.GRASS, T.DIRT], glowcaps: [T.GRASS, T.JUNGLE], ore: [T.ASH, T.ROCK], goldOre: [T.ASH, T.ROCK],
  sandPillar: [T.SAND], column: [T.SAND, T.GRASS], cairn: [T.ROCK, T.SNOW, T.GRASS], bushPink: [T.GRASS], bushYellow: [T.GRASS],
};
const soilFor = (key) => LEVEL_SOIL[key] || SOIL[key] || [T.GRASS];

// Belonging to the story, or pieces of something bigger: set out on their own they'd do nothing, or draw from
// story state that isn't there (the ruin's carvings, the volcano's egg). Dragons, eggs and the ship have their own kinds.
const STORY_ONLY = new Set([
  'sphinx', 'menhir', 'altar', 'volcano', 'fireCaveMouth', 'lavaPool', 'roost', 'nursery', 'dragonPool', 'fishPlate', 'torMound',
  'rodSocket', 'lightningRodSet', 'glassStreak', 'caveMouth', 'sandCave', 'ladder1', 'ladder2', 'ship', 'merchantShip', 'backpack',
  'toolBelt', 'wallMap', 'stake', 'dais', 'hoardChest', 'goldStatue', 'coinPile', 'goldHeap', 'stoneCache', 'urn-0', 'urn-1',
  'reef-0', 'reef-1', 'reef-2', 'iceWall', 'ruinWall',
]);
const placeable = (key) => !STORY_ONLY.has(key) && !/^(dragon|egg)_/.test(key);

// ---------- level data ----------

let thingIds = 0;
const newThing = (type, props, x, y) => ({ id: ++thingIds, type, x: Math.round(x), y: Math.round(y), ...props });

// A small grassy isle in an empty sea, to start from scratch.
function blankLevel() {
  const L = { v: LEVEL_VERSION, name: 'Empty sea', tiles: new Uint8Array(LEVEL_TILES), spawn: null, ship: null, things: [], species: {} };
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;
  for (let y = cy - 8; y <= cy + 8; y++) {
    for (let x = cx - 12; x <= cx + 12; x++) {
      const d = Math.hypot((x + 0.5 - cx) / 12, (y + 0.5 - cy) / 8);
      if (d < 1) L.tiles[y * MAP_W + x] = d > 0.8 ? T.SAND : T.GRASS;
    }
  }
  L.spawn = { x: cx * TILE, y: cy * TILE };
  return L;
}

// Tiles as run lengths: the sea makes most of any map, so a level saves down small.
function encodeLevel(L) {
  const runs = [];
  let t = L.tiles[0];
  let n = 0;
  for (const v of L.tiles) {
    if (v === t) n++;
    else {
      runs.push(t, n);
      t = v;
      n = 1;
    }
  }
  runs.push(t, n);
  return {
    v: LEVEL_VERSION, name: L.name, world: [MAP_W, MAP_H], tiles: runs.join(','), spawn: L.spawn, ship: L.ship, species: L.species,
    things: L.things.map(({ id, ...t }) => t),
  };
}

// A level saved on a map of another size is copied over row by row, the rest left as sea.
function decodeLevel(s) {
  if (!s || s.v !== LEVEL_VERSION || typeof s.tiles !== 'string') throw new Error('Not a level file');
  const [w, h] = s.world || [MAP_W, MAP_H];
  const runs = s.tiles.split(',').map(Number);
  const known = new Set(Object.values(T));
  const flat = new Uint8Array(w * h);
  let i = 0;
  for (let k = 0; k < runs.length; k += 2) {
    flat.fill(known.has(runs[k]) ? runs[k] : T.WATER, i, i + runs[k + 1]);
    i += runs[k + 1];
  }
  const tiles = new Uint8Array(LEVEL_TILES);
  for (let y = 0; y < Math.min(h, MAP_H); y++) tiles.set(flat.subarray(y * w, y * w + Math.min(w, MAP_W)), y * MAP_W);
  for (let j = 0; j < LEVEL_TILES; j++) if (INDOOR_TILES.has(tiles[j])) tiles[j] = T.WATER;
  return {
    v: LEVEL_VERSION, name: s.name || 'Untitled', tiles, spawn: s.spawn || null, ship: s.ship || null, species: s.species || {},
    things: (s.things || []).map((t) => ({ ...t, id: ++thingIds })),
  };
}

const cloneLevel = (L) => ({ ...L, tiles: L.tiles.slice(), things: L.things.map((t) => ({ ...t })), spawn: L.spawn && { ...L.spawn }, ship: L.ship && { ...L.ship }, species: { ...L.species } });

// ---------- the live world ----------

// What each level thing became in the running game: an object, an animal, a sea creature, a dragon or an egg.
const live = new Map();
let levelMode = false;

// The story's people, places and puzzles step out of the way: villagers and the dog wait off the map, the
// merchant, the maelstrom, the storm and the festival never come, and nothing is saved over the real adventure.
function enterLevelMode() {
  if (levelMode) return;
  levelMode = true;
  for (const name of ['saveGame', 'updateMerchant', 'updateWhirlpool', 'drawWhirlpool', 'drawCurrents', 'updateTor', 'drawTorBolts', 'updateRuin',
    'updateDunes', 'drawSphinxBubble', 'updatePeak', 'updateFestival', 'drawFestival', 'updateNpc', 'updateDog', 'updateHens', 'updateFlock', 'updateJournal']) {
    window[name] = () => {};
  }
  window.overCrater = () => false;
  window.exposedTo = levelExposure;
  window.musicArea = levelMusic;
  window.emitWorld = levelSteam;
  for (const p of POIS) Object.assign(p, { x: -9999, y: -9999, learned: false, seen: false, marked: false });
  for (const n of npcs) Object.assign(n, { x: -4000, y: -4000, talkT: 0, emoteT: 0 });
  Object.assign(dog, { x: -4000, y: -4000, state: 'home', emoteT: 0 });
  sheep.length = 0;
  hens.length = 0;
  buildings.length = 0;
  if (!started) beginGame();
  fade = null;
  indoors = null;
}

// Out on snow or ice it's cold, and on ash or by lava it's hot, wherever on the map they're painted.
function levelExposure() {
  if (sail || flight || hop || fade || player.swimming || player.flying || indoors) return null;
  const tx = tileX(player.x);
  const ty = tileY(player.y);
  let cold = 0;
  let heat = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const t = tileAt(tx + dx, ty + dy);
      if (t === T.SNOW || t === T.ICE) cold++;
      else if (t === T.ASH || t === T.LAVA) heat++;
    }
  }
  return cold >= 5 ? 'cold' : heat >= 5 ? 'heat' : null;
}

function levelMusic() {
  if (indoors) return musicHere;
  const at = flight || (sail && shipObj) || player;
  const tx = tileX(at.x);
  const ty = tileY(at.y);
  const t = tileAt(tx, ty);
  if (t === T.ASH || t === T.LAVA) musicHere = 'volcano';
  else if (t === T.SNOW || t === T.ICE) musicHere = 'snow';
  else if (isWet(t) && seaDist[ty * MAP_W + tx] > OPEN_SEA) musicHere = 'sea';
  else if (isLand(t)) musicHere = 'village';
  return musicHere;
}

// Steam off the hot springs and where lava runs into the sea; the story's waterfall and volcano have no place here.
function levelSteam(dt) {
  const near = (i) => {
    const x = (i % MAP_W) * TILE;
    const y = Math.floor(i / MAP_W) * TILE;
    return x > cam.x - 32 && x < cam.x + viewW + 32 && y > cam.y - 32 && y < cam.y + viewH + 32;
  };
  for (const i of springTiles) {
    if (Math.random() > dt * 0.8 || !near(i)) continue;
    particles.push({ type: 'steam', x: ((i % MAP_W) + Math.random()) * TILE, y: (Math.floor(i / MAP_W) + Math.random()) * TILE, vx: 2 + Math.random() * 4, vy: -9 - Math.random() * 6, life: 0, max: 1.8 + Math.random() * 1.2 });
  }
  for (const i of lavaShore) {
    if (Math.random() > dt * 2 || !near(i)) continue;
    particles.push({ type: 'steam', x: ((i % MAP_W) + Math.random()) * TILE, y: (Math.floor(i / MAP_W) + 1) * TILE, vx: 3, vy: -14 - Math.random() * 8, life: 0, max: 2 + Math.random() });
  }
}

// Collider boxes bucketed as they stand, for ones not sized from a sprite's foot.
function gridCollider(c) {
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

function dropCollider(c) {
  if (!c) return;
  for (const k of c.cells || []) {
    const a = colGrid.get(k);
    const i = a ? a.indexOf(c) : -1;
    if (i >= 0) a.splice(i, 1);
  }
  c.cells = null;
  const i = colliders.indexOf(c);
  if (i >= 0) colliders.splice(i, 1);
}

const spliceOut = (list, item) => {
  const i = list.indexOf(item);
  if (i >= 0) list.splice(i, 1);
};

function removeObject(o) {
  spliceOut(objects, o);
  spliceOut(hittables, o);
  dropCollider(o.col);
}

// Back on firm ground with nothing on the go: out of the saddle, off the ship, no egg or fish on the line.
function calmPlayer() {
  flight = sail = hop = fade = null;
  carried = null;
  whirl.sink = whirl.jet = null;
  shipObj.rider = null;
  Object.assign(player, { flying: false, swimming: false, fishing: null, chop: null, nock: null, windup: null, knock: null, downT: 0, jumpT: -1, cook: null });
  Object.assign(exposure, { kind: null, v: 0, warned: false });
  nameQueue.length = 0;
  naming = null;
  namingEl.hidden = true;
  closeMenus();
}

function closeMenus() {
  for (const [open, close] of [[mapOpen, toggleMap], [journalOpen, toggleJournal], [fishLogOpen, toggleFishLog], [dragonLogOpen, toggleDragonLog], [tinkerOpen, toggleTinker], [bagOpen, toggleBag]]) {
    if (open) close(false);
  }
  if (pileOpen) closePile();
  if (lurePickOpen) closeLurePick();
  keys.clear();
}

// Clears every outdoor thing away, story or level, leaving the rooms below the map as they are.
function clearOutdoors() {
  calmPlayer();
  live.clear();
  const kept = objects.filter((o) => o === shipObj || !outdoors(o));
  objects.length = 0;
  objects.push(...kept);
  colGrid.clear();
  colliders.length = 0;
  for (const o of objects) {
    if (!o.col) continue;
    gridCollider(o.col);
    colliders.push(o.col);
  }
  hittables = hittables.filter((o) => kept.includes(o));
  // the story's eggs stay listed for the journal, out of sight
  for (let i = eggs.length - 1; i >= 0; i--) if (eggs[i].level) eggs.splice(i, 1);
  for (const e of eggs) {
    e.hidden = true;
    if (e.col) e.col.off = true;
  }
  dragons.length = 0;
  follower = null;
  animals.length = 0;
  for (const list of Object.values(seaLife)) list.length = 0;
  for (const list of [floaters, particles, drops, arrows, fireballs, beams, bolts, shocks, marks, burning, smoulder, placed]) list.length = 0;
  ores = [];
  snowyTrees.clear();
  merchant.ship = null;
}

// Everything the game works out from the tiles: plank directions, which water is lake, depth, the mountains'
// height, and where springs and lava steam. The story's ledges, reefs and rapids don't carry over.
function deriveTiles() {
  for (let i = 0; i < LEVEL_TILES; i++) {
    if (map[i] !== T.WOOD) {
      woodNS[i] = 0;
      continue;
    }
    const v = (map[i - MAP_W] === T.WOOD) + (map[i + MAP_W] === T.WOOD);
    const h = (map[i - 1] === T.WOOD) + (map[i + 1] === T.WOOD);
    woodNS[i] = v > h ? 1 : 0;
  }
  markLakes(map, inland);
  reef.fill(0);
  rapids.fill(0);
  tier.fill(0);
  flights.length = 0;
  elev.fill(0);
  iced.clear();
  holes.clear();
  computeSeaDist();
  computeElev();
  springTiles.length = 0;
  lavaShore.length = 0;
  for (let i = 0; i < LEVEL_TILES; i++) {
    if (map[i] === T.SPRING) springTiles.push(i);
    if (map[i] === T.LAVA && (map[i - 1] === T.WATER || map[i + 1] === T.WATER || map[i + MAP_W] === T.WATER || map[i + MAP_W] === T.CLIFF)) lavaShore.push(i);
  }
}

// Water the sea round the map's edge can't reach is a lake.
function markLakes(tiles, out) {
  const open = (t) => t === T.WATER || t === T.CLIFF || t === T.FALL;
  const seen = new Uint8Array(LEVEL_TILES);
  const q = [];
  const push = (i) => {
    if (!seen[i] && open(tiles[i])) {
      seen[i] = 1;
      q.push(i);
    }
  };
  for (let x = 0; x < MAP_W; x++) {
    push(x);
    push((MAP_H - 1) * MAP_W + x);
  }
  for (let y = 0; y < MAP_H; y++) {
    push(y * MAP_W);
    push(y * MAP_W + MAP_W - 1);
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % MAP_W;
    if (x > 0) push(i - 1);
    if (x < MAP_W - 1) push(i + 1);
    if (i >= MAP_W) push(i - MAP_W);
    if (i < LEVEL_TILES - MAP_W) push(i + MAP_W);
  }
  for (let i = 0; i < LEVEL_TILES; i++) out[i] = tiles[i] === T.WATER && !seen[i] ? 1 : 0;
}

// Everything on the map back to what's been drawn: the ground repainted and the world map unrolled in full.
function refreshGround() {
  markSeaChunks();
  mapBase = null;
  seen.fill(1);
  fogDirty = true;
  lastReveal = '';
}

// Swaps the level in. `play` readies it for play: night animals keep out of sight until dark, and frogs without
// a pond or owls without a tree stay away. In the editor every one of them shows.
function applyLevel(L, play) {
  enterLevelMode();
  for (const [id, pal] of Object.entries(L.species)) if (!DRAGON_SPECIES[id]) registerSpecies(id, pal);
  clearOutdoors();
  map.set(L.tiles);
  deriveTiles();
  // trees go in first, for owls to perch in and dragons and sea lions to keep clear of
  for (const type of ['object', 'egg', 'dragon', 'animal', 'sea']) for (const t of L.things) if (t.type === type) spawnThing(t, play);
  placeShip(L.ship);
  if (L.spawn) Object.assign(villageFire, { x: L.spawn.x, y: L.spawn.y });
  refreshGround();
}

function placeShip(s) {
  if (s) Object.assign(shipObj, { x: s.x, y: s.y, dir: s.dir || 'right', facing: s.dir || 'right', hidden: false });
  else Object.assign(shipObj, { x: -6000, y: -6000, hidden: true });
}

const thingRng = (t) => mulberry32(Math.imul(t.x | 0, 73856093) ^ Math.imul(t.y | 0, 19349663) ^ t.id);

function spawnThing(t, play) {
  const make = SPAWN[t.type];
  const h = make && make(t, play);
  if (h) live.set(t, h);
  return h;
}

function despawnThing(t) {
  const h = live.get(t);
  if (!h) return;
  live.delete(t);
  if (t.type === 'object') {
    removeObject(h);
    spliceOut(placed, placed.find((p) => p.o === h));
  } else if (t.type === 'egg') {
    removeObject(h);
    spliceOut(eggs, h);
    if (carried === h) carried = null;
  } else if (t.type === 'animal') spliceOut(animals, h);
  else if (t.type === 'sea') spliceOut(seaLife[t.kind], h);
  else if (t.type === 'dragon') {
    spliceOut(dragons, h);
    if (h.obj) removeObject(h.obj);
    if (follower === h) follower = null;
  }
}

const PERCHES_NEAR = 40;
function perchNear(x, y) {
  let best = null;
  let bd = PERCHES_NEAR;
  for (const o of objects) {
    if (!PERCHES.has(o.key) || kindOf(o) !== 'tree') continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

// Why a thing can't go at a spot, if it can't: the game's own rules for where each lives.
function placeProblem(type, kind, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor((y - 1) / TILE);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 'Off the edge of the map';
  if (type === 'animal') {
    if (kind === 'frog' && !nearWet(tx, ty, 3)) return 'Frogs need water close by';
    if (kind === 'owl' && !perchNear(x, y)) return 'Owls perch in an oak or a pine: put one next to a tree';
    if (kind !== 'owl' && kind !== 'bat' && !WILD[kind].tiles.includes(tileAt(tx, ty))) {
      return `A ${WILD[kind].name} lives on ${WILD[kind].tiles.map((t) => terrainName(Object.keys(T).find((id) => T[id] === t)).toLowerCase()).join(', ')}`;
    }
  }
  if (type === 'sea') {
    if (SEA_KINDS[kind].shore) return seaLionColony(tx, ty, mulberry32(1)) ? null : 'Sea lions haul out on sand or rock right beside the open sea';
    if (depthAt(x, y) < 1) return `${SEA_KINDS[kind].name} need water`;
  }
  if (type === 'ship' && tileAt(tx, ty) !== T.WATER) return 'The longship needs water';
  return null;
}

const SPAWN = {
  object(t) {
    const s = SPR[t.key];
    if (!s || !(s.img || s.frames) || !placeable(t.key)) return null;
    const o = { key: t.key, x: t.x, y: t.y, phase: hash(t.x, t.y, 99) * 10 };
    if (t.key === 'vineTree') o.variant = Math.floor(hash(t.x, t.y, 5) * 3);
    objects.push(o);
    if (s.foot) {
      o.col = { off: false };
      placeCollider(o);
      colliders.push(o.col);
    }
    if (TREES[o.key]) o.tree = o.key;
    else if (AXE_KINDS[o.key]) Object.assign(o, { axe: AXE_KINDS[o.key], base: o.key });
    if (o.tree || o.axe) hittables.push(o);
    if (t.key === 'tent') placed.push({ kind: 'tent', o, fixed: true });
    return o;
  },

  animal(t, play) {
    if (!WILD[t.kind]) return null;
    const tx = Math.floor(t.x / TILE);
    const ty = Math.floor((t.y - 1) / TILE);
    const at = { x: t.x, y: t.y };
    if (t.kind === 'frog') {
      at.pond = nearWet(tx, ty, 3);
      if (!at.pond && play) return null;
    }
    if (t.kind === 'owl') {
      const tree = perchNear(t.x, t.y);
      if (tree) Object.assign(at, { x: tree.x + 3, y: tree.y + 1, tree });
      else if (play) return null;
    }
    const herd = { kind: t.kind, n: 1, area: { x0: tx - 8, y0: ty - 6, x1: tx + 8, y1: ty + 6 } };
    const a = makeAnimal(herd, at, t.look || t.kind, thingRng(t));
    if (!play) a.state = 'idle';
    animals.push(a);
    return a;
  },

  sea(t) {
    const k = SEA_KINDS[t.kind];
    if (!k) return null;
    const rng = thingRng(t);
    const item = k.shore ? seaLionColony(Math.floor(t.x / TILE), Math.floor(t.y / TILE), rng) : k.make({ x: t.x, y: t.y }, rng);
    if (item) seaLife[t.kind].push(item);
    return item;
  },

  // Built as save.js restores one, minus the roost and the nursery.
  dragon(t) {
    const sp = DRAGON_SPECIES[t.species];
    if (!sp) return null;
    const stage = Math.max(0, Math.min(GROWN, t.stage | 0));
    const { x, y } = t;
    const d = {
      species: t.species, x, y, alt: 0, dir: 'down', anim: 0, frame: 0, flying: false, stuck: 0, jumpT: 0, jumpDelay: 0,
      emote: null, emoteT: 0, chirpT: 4, stage, swoop: null, catchT: 0, home: { x, y }, wanderT: 3, name: t.name || sp.defaultName,
      saddled: stage === GROWN && t.saddled !== false, roost: null, nursery: false, grow: 0,
      mood: MOOD_START, fedAt: null, favKnown: false, disKnown: false,
    };
    dragons.push(d);
    if (stage === GROWN) {
      const o = { key: `dragon_${t.species}`, x, y, phase: 0, hidden: false, saddled: d.saddled, col: { off: false }, faceRight: t.flip ?? hash(x, y, 5) < 0.5 };
      placeCollider(o);
      objects.push(o);
      colliders.push(o.col);
      Object.assign(d, { obj: o, perched: true, flap: 0, spot: null, settleOnLand: false });
    } else {
      d.target = { x, y };
    }
    return d;
  },

  egg(t) {
    if (!DRAGON_SPECIES[t.species]) return null;
    const e = { key: `egg_${t.species}`, x: t.x, y: t.y, phase: hash(t.x, t.y, 99) * 10, species: t.species, state: 'down', crack: 0, hatchT: 0, hidden: false, col: { off: false }, level: true };
    placeCollider(e);
    objects.push(e);
    colliders.push(e.col);
    eggs.push(e);
    return e;
  },
};

// ---------- playing a level ----------

// Everything there is to do something with, so every control has something to work on.
const PLAY_KIT = { backpack: 1, toolBelt: 1, map: 1, fishLog: 1, saddle: 3, arrow: 40, fish: 9, meat: 3, featherLure: 5, spinner: 5, furCoat: 1, fireJacket: 1, campfire: 2, rope: 2, plank: 4, bridge: 1, ladder: 1 };

function giveKit() {
  for (const id of Object.keys(bag)) delete bag[id];
  for (const id of TOOLS) if (ITEMS[id]) bag[id] = 1;
  for (const [id, n] of Object.entries(PLAY_KIT)) if (ITEMS[id]) bag[id] = n;
  packSlots.length = 0;
  hand = null;
  wearBackpack();
  mapBtn.hidden = false;
  fishLogBtn.hidden = false;
  outfit = null;
  dress();
  Object.assign(flame, { out: false, left: TORCH_BURN });
  player.stamina = 1;
  syncPack();
  renderInventory();
}

// The nearest spot to (x, y) the player can stand on, searching outward a ring of tiles at a time.
function standableNear(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  for (let r = 0; r < 80; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const sx = (tx + dx + 0.5) * TILE;
        const sy = (ty + dy + 0.8) * TILE;
        if (isLand(tileAt(tx + dx, ty + dy)) && canStand(player, sx, sy)) return { x: sx, y: sy };
      }
    }
  }
  return null;
}

// Into the level on foot at `at`, or the spawn point, kitted out and fading in.
function startPlay(L, at) {
  applyLevel(L, true);
  scatterStones();
  const spot = standableNear((at || L.spawn || { x: MAP_W * TILE / 2 }).x, (at || L.spawn || { y: MAP_H * TILE / 2 }).y);
  if (spot) Object.assign(player, spot, { dir: 'down' });
  giveKit();
  fade = { t: FADE, act: null };
  zoom = zoomTarget();
  applyView();
  updateCamera(0, true);
  return !!spot;
}

// ---------- the default level ----------

// One large island ringed by ocean: snowy mountains and a frozen lake to the north, forest round a lake to the west,
// jungle to the east, desert with an oasis to the south-west, a smoking volcano to the south-east, and meadows,
// a farm and a camp in the middle, with every kind of dragon waiting at the camp. Small isles lie off its coasts,
// and the sea round it holds every kind of sea creature.
function defaultLevel() {
  const L = { v: LEVEL_VERSION, name: 'Dragon Isle', tiles: new Uint8Array(LEVEL_TILES), spawn: null, ship: null, things: [], species: {} };
  const g = L.tiles;
  const rng = mulberry32(90210);
  const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  const at = (x, y) => (inMap(x, y) ? g[y * MAP_W + x] : T.WATER);
  const put = (x, y, t) => { if (inMap(x, y)) g[y * MAP_W + x] = t; };
  const blob = (cx, cy, rx, ry, t, ok = () => true, seed = 61) => {
    for (let y = Math.floor(cy - ry - 3); y <= cy + ry + 3; y++) {
      for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
        const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry) + (vnoise(x, y, 4, seed) - 0.5) * 0.35;
        if (d < 1 && ok(at(x, y), x, y)) put(x, y, t);
      }
    }
  };
  // a wobbly line from point to point, `w` tiles wide
  const stroke = (pts, w, t, ok = () => true, seed = 62) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[k + 1];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
      for (let s = 0; s <= n; s++) {
        const u = s / n;
        const px = x0 + (x1 - x0) * u + (vnoise(s + k * 97, 0, 14, seed) - 0.5) * 6;
        const py = y0 + (y1 - y0) * u + (vnoise(0, s + k * 97, 14, seed + 1) - 0.5) * 6;
        for (let dy = -w; dy <= w; dy++) {
          for (let dx = -w; dx <= w; dx++) {
            if (dx * dx + dy * dy > w * w * 0.6 + 0.5) continue;
            const x = Math.floor(px + dx * 0.5);
            const y = Math.floor(py + dy * 0.5);
            if (ok(at(x, y), x, y)) put(x, y, t);
          }
        }
      }
    }
  };

  const C = { x: 320, y: 238, rx: 150, ry: 106 };
  const rel = (x, y) => [(x + 0.5 - C.x) / C.rx, (y + 0.5 - C.y) / C.ry];
  const B = { sea: 0, meadow: 1, forest: 2, snow: 3, jungle: 4, desert: 5, ash: 6, isle: 7 };
  const biomeAt = (x, y) => {
    const [u, v] = rel(x + (vnoise(x, y, 34, 41) - 0.5) * 44, y + (vnoise(x, y, 34, 42) - 0.5) * 44);
    if (v < -0.4) return B.snow;
    if (v > 0.32 && u > 0.28) return B.ash;
    if (v > 0.36 && u < 0.12) return B.desert;
    if (u > 0.46) return B.jungle;
    if (u < -0.42) return B.forest;
    return B.meadow;
  };
  const GROUND = [T.WATER, T.GRASS, T.GRASS, T.SNOW, T.JUNGLE, T.SAND, T.ASH, T.GRASS];
  const biome = new Uint8Array(LEVEL_TILES);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const [u, v] = rel(x, y);
      if (Math.abs(u) > 1.6 || Math.abs(v) > 1.6) continue;
      const n = vnoise(x, y, 26, 43) - 0.5 + (vnoise(x, y, 9, 44) - 0.5) * 0.45;
      if (Math.abs(u) ** 2.3 + Math.abs(v) ** 2.3 >= 1 + n * 0.5) continue;
      const b = biomeAt(x, y);
      biome[y * MAP_W + x] = b;
      put(x, y, GROUND[b]);
    }
  }
  const ISLES = [
    { x: 112, y: 78, rx: 15, ry: 10, t: T.SNOW, b: B.snow },
    { x: 540, y: 112, rx: 12, ry: 8, t: T.GRASS, b: B.isle },
    { x: 100, y: 396, rx: 12, ry: 8, t: T.ROCK, b: B.isle },
    { x: 566, y: 318, rx: 11, ry: 9, t: T.JUNGLE, b: B.jungle },
  ];
  for (const s of ISLES) {
    blob(s.x, s.y, s.rx, s.ry, s.t, () => true, 63);
    for (let y = s.y - s.ry - 3; y <= s.y + s.ry + 3; y++) for (let x = s.x - s.rx - 3; x <= s.x + s.rx + 3; x++) if (at(x, y) === s.t) biome[y * MAP_W + x] = s.b;
  }

  // beaches round every coast but the snowy and volcanic ones
  const sandy = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = at(x, y);
      if (t === T.WATER || t === T.SNOW || t === T.ASH) continue;
      let wet = false;
      for (let dy = -2; dy <= 2 && !wet; dy++) for (let dx = -2; dx <= 2; dx++) if (at(x + dx, y + dy) === T.WATER) { wet = true; break; }
      if (wet) sandy.push([x, y]);
    }
  }
  for (const [x, y] of sandy) put(x, y, T.SAND);
  // cliff faces below the south-facing shores that are left
  const shoreT = new Set([T.GRASS, T.SNOW, T.ASH, T.ROCK, T.MOUNT, T.JUNGLE]);
  for (let y = 1; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (at(x, y) !== T.WATER) continue;
      if (shoreT.has(at(x, y - 1)) || (shoreT.has(at(x, y - 2)) && at(x, y - 1) === T.CLIFF)) put(x, y, T.CLIFF);
    }
  }

  const P = (u, v) => [C.x + u * C.rx, C.y + v * C.ry];
  const isB = (b) => (t, x, y) => biome[y * MAP_W + x] === b;
  const land = (t) => t !== T.WATER && t !== T.CLIFF;
  // the mountains across the north, rock round their feet
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (biome[y * MAP_W + x] !== B.snow || at(x, y) !== T.SNOW) continue;
      const [, v] = rel(x, y);
      if (v > -0.5) continue;
      const r = vnoise(x, y, 16, 45) + (vnoise(x, y, 5, 46) - 0.5) * 0.2;
      if (r > 0.56) put(x, y, T.MOUNT);
      else if (r > 0.46) put(x, y, T.ROCK);
    }
  }
  const [fx, fy] = P(-0.12, -0.62);
  blob(fx, fy, 13, 6, T.ICE, (t) => t === T.SNOW || t === T.ROCK);
  const [hx, hy] = P(0.36, -0.56);
  blob(hx, hy, 8, 5, T.ROCK, land);
  for (const [dx, dy, rx, ry] of [[-3, -1, 2.2, 1.6], [2, 0.5, 2.8, 1.8], [-0.5, 2.2, 1.8, 1.3]]) blob(hx + dx, hy + dy, rx, ry, T.SPRING, (t) => t === T.ROCK);

  // the forest lake, the river from the mountains through it to the west coast, and a pond in the meadows
  const [lx, ly] = P(-0.7, -0.02);
  blob(lx, ly, 10, 6, T.WATER, land);
  stroke([P(-0.42, -0.5), P(-0.55, -0.25), [lx + 2, ly - 4]], 2, T.WATER, (t) => t !== T.MOUNT);
  stroke([[lx - 8, ly + 2], P(-0.92, 0.08), P(-1.12, 0.1)], 2, T.WATER, (t) => t !== T.MOUNT);
  const [mx, my] = P(-0.2, 0.25);
  blob(mx, my, 4.5, 3, T.WATER, land);
  // the oasis, green round its pool
  const [ox, oy] = P(-0.4, 0.66);
  blob(ox, oy, 8, 5.5, T.GRASS, (t) => t === T.SAND);
  blob(ox, oy, 4, 2.6, T.WATER, (t) => t === T.GRASS);
  // the volcano, and lava running down to the sea
  const [vx, vy] = P(0.62, 0.62);
  blob(vx, vy, 8, 6, T.MOUNT, land);
  blob(vx, vy - 1, 2.4, 1.6, T.LAVA, (t) => t === T.MOUNT);
  stroke([[vx + 3, vy + 4], P(0.76, 0.84), P(0.86, 1.1)], 1, T.LAVA, (t) => t === T.ASH || t === T.SAND);
  stroke([[vx - 5, vy + 3], P(0.5, 0.86), P(0.46, 1.12)], 1, T.LAVA, (t) => t === T.ASH || t === T.SAND);

  // the camp in the middle, with roads out to every corner
  const camp = { x: C.x, y: C.y + 4 };
  blob(camp.x, camp.y, 9, 6, T.PATH, land);
  const road = (to) => stroke([[camp.x, camp.y], to], 1, T.DIRT, (t) => t === T.GRASS || t === T.SAND || t === T.JUNGLE || t === T.SNOW || t === T.ASH);
  road([lx + 12, ly]);
  road([fx, fy + 8]);
  road(P(0.62, -0.08));
  road([ox + 6, oy - 4]);
  road([vx - 8, vy - 4]);
  road([hx - 6, hy + 4]);
  // the farm: a field and haystacks, east of the camp
  const farm = { x0: camp.x + 14, y0: camp.y - 12, x1: camp.x + 30, y1: camp.y - 2 };
  for (let y = farm.y0; y <= farm.y1; y++) for (let x = farm.x0; x <= farm.x1; x++) if (at(x, y) === T.GRASS || at(x, y) === T.DIRT) put(x, y, y >= farm.y1 - 1 ? T.HAY : T.FIELD);
  // the jetty, straight out from the south coast below the camp
  const jx = camp.x + 34;
  let coast = camp.y;
  while (coast < MAP_H - 1 && land(at(jx, coast))) coast++;
  road([jx, coast - 3]);
  for (let y = coast - 2; y < coast + 9; y++) for (const x of [jx, jx + 1]) put(x, y, T.WOOD);
  for (let x = jx - 2; x <= jx + 3; x++) put(x, coast + 9, T.WOOD);
  L.ship = { x: (jx + 3.5) * TILE, y: (coast + 7) * TILE, dir: 'down' };

  // ---- what's set out on it ----
  const taken = new Uint8Array(LEVEL_TILES);
  const free = (tx, ty, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!inMap(tx + dx, ty + dy) || taken[(ty + dy) * MAP_W + tx + dx]) return false;
    return true;
  };
  const claim = (tx, ty, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inMap(tx + dx, ty + dy)) taken[(ty + dy) * MAP_W + tx + dx] = 1; };
  for (let i = 0; i < LEVEL_TILES; i++) if (g[i] === T.DIRT || g[i] === T.PATH || g[i] === T.WOOD || g[i] === T.FIELD || g[i] === T.HAY) taken[i] = 1;
  const add = (type, props, tx, ty) => {
    const t = newThing(type, props, tx * TILE, ty * TILE);
    L.things.push(t);
    return t;
  };
  const prop = (key, tx, ty, r = 1) => {
    claim(Math.floor(tx), Math.floor(ty - 0.01), r);
    return SPR[key] ? add('object', { key }, tx, ty) : null;
  };
  const soilOk = (key, tx, ty) => {
    const soil = soilFor(key);
    for (let dy = -2; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) if (!soil.includes(at(tx + dx, ty + dy))) return false;
    return true;
  };
  const plantAt = (key, x, y) => {
    const tx = Math.floor(x);
    const ty = Math.floor(y - 0.01);
    if (!SPR[key] || !soilOk(key, tx, ty) || !free(tx, ty, 1)) return null;
    claim(tx, ty, 1);
    return add('object', { key }, x, y);
  };

  // the camp: a bonfire ringed with benches, a tent, stores, torches and banners, and the start beside it
  L.spawn = { x: (camp.x + 0.5) * TILE, y: (camp.y + 4.4) * TILE };
  claim(camp.x, camp.y + 4, 1);
  prop('bonfire', camp.x + 0.5, camp.y, 2);
  prop('tent', camp.x - 8, camp.y - 1, 2);
  prop('logPile', camp.x + 9, camp.y - 1, 2);
  prop('chest', camp.x + 7.5, camp.y + 3.5);
  prop('barrel', camp.x + 9.5, camp.y + 3.2);
  prop('sacks', camp.x + 10.8, camp.y + 1.8);
  prop('workbench', camp.x - 7.5, camp.y + 3.5);
  prop('anvil', camp.x - 5, camp.y + 4.2);
  for (const [dx, dy] of [[-8.5, -5], [9.5, -5], [-9, 5.2], [10, 5.2]]) prop('torch', camp.x + dx, camp.y + dy);
  prop('bannerRed', camp.x - 3, camp.y - 5);
  prop('bannerBlue', camp.x + 4, camp.y - 5);
  // round the farm: a fence, a scarecrow and an orchard
  for (let x = farm.x0; x <= farm.x1; x += 1) {
    prop('fenceH', x + 0.5, farm.y0 - 0.1, 0);
    prop('fenceH', x + 0.5, farm.y1 + 1.2, 0);
  }
  for (let y = farm.y0 + 1; y <= farm.y1 + 1; y++) {
    prop('fenceV', farm.x0 - 0.3, y + 0.2, 0);
    if (y < farm.y1 - 1 || y > farm.y1 + 1) prop('fenceV', farm.x1 + 1.3, y + 0.2, 0);
  }
  prop('scarecrow', (farm.x0 + farm.x1) / 2, (farm.y0 + farm.y1) / 2);
  const fruit = Object.keys(TREES).filter((k) => k.endsWith('Tree') && soilFor(k).includes(T.GRASS) && k !== 'jungleTree');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) plantAt(fruit[(i + j * 2) % fruit.length], farm.x0 + 2 + i * 4.2, farm.y1 + 6 + j * 3.6);

  // every kind of dragon at the camp: grown ones saddled in a ring round the meadow north of it, young ones by the
  // fire, and an egg of each on its nest to hatch
  const kinds = GAME_SPECIES;
  kinds.forEach((id, i) => {
    const a = Math.PI * (1.08 + (0.84 * i) / Math.max(1, kinds.length - 1));
    const tx = camp.x - 4 + Math.cos(a) * 16;
    const ty = camp.y - 12 + Math.sin(a) * 8;
    claim(Math.floor(tx), Math.floor(ty) - 1, 3);
    add('dragon', { species: id, stage: GROWN, saddled: true, name: DRAGON_SPECIES[id].defaultName, flip: tx > camp.x - 4 }, tx, ty);
    const b = (i / kinds.length) * Math.PI * 2;
    add('dragon', { species: id, stage: i % GROWN, name: `${DRAGON_SPECIES[id].defaultName} Jr` }, camp.x + 0.5 + Math.cos(b) * 4.2, camp.y + 0.6 + Math.sin(b) * 2.8);
    const ex = camp.x - 14 - (i % 3) * 3;
    const ey = camp.y + 6 + Math.floor(i / 3) * 3;
    claim(Math.floor(ex), Math.floor(ey) - 1, 1);
    add('object', { key: 'nest' }, ex, ey - 0.05);
    add('egg', { species: id }, ex, ey);
  });

  // trees and the like, thick or thin by biome, in clumps
  const FLORA = {
    [B.forest]: { step: 2.6, density: 0.62, clear: 0.32, pick: (r) => (r < 0.32 ? 'pine' : r < 0.55 ? 'pine2' : r < 0.8 ? 'oak' : r < 0.85 ? 'fern' : r < 0.89 ? 'bushPink' : r < 0.92 ? 'fallenLog' : r < 0.95 ? 'glowcaps' : r < 0.98 ? 'boulder' : 'appleTree') },
    [B.meadow]: { step: 3, density: 0.1, clear: 0, pick: (r) => (r < 0.35 ? 'oak' : r < 0.55 ? 'bushYellow' : r < 0.72 ? 'bushPink' : r < 0.88 ? fruit[Math.floor(r * 97) % fruit.length] : 'boulder') },
    [B.snow]: { step: 3, density: 0.3, clear: 0.3, pick: (r) => (r < 0.68 ? 'snowPine' : r < 0.84 ? 'boulderSnow' : r < 0.96 ? 'iceCrystal' : 'cairn') },
    [B.jungle]: { step: 2.4, density: 0.6, clear: 0.25, pick: (r) => (r < 0.42 ? 'jungleTree' : r < 0.56 ? 'vineTree' : r < 0.68 ? 'bananaTree' : r < 0.8 ? 'fern' : r < 0.88 ? 'palm' : r < 0.94 ? 'orangeTree' : 'lemonTree') },
    [B.desert]: { step: 3.4, density: 0.12, clear: 0, pick: (r) => (r < 0.34 ? 'cactus' : r < 0.58 ? 'cactusTall' : r < 0.86 ? 'barrelCactus' : r < 0.94 ? 'sandPillar' : 'column') },
    [B.ash]: { step: 3, density: 0.16, clear: 0, pick: (r) => (r < 0.4 ? 'deadTree' : r < 0.74 ? 'boulderDark' : r < 0.9 ? 'ore' : 'goldOre') },
    [B.isle]: { step: 2.8, density: 0.3, clear: 0, pick: (r) => (r < 0.5 ? 'palm' : r < 0.7 ? 'bananaTree' : r < 0.85 ? 'fern' : 'boulder') },
  };
  for (let y = 4; y < MAP_H - 4; y += 2.6) {
    for (let x = 4; x < MAP_W - 4; x += 2.6) {
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      const b = biome[ty * MAP_W + tx];
      if (!b) continue;
      const f = FLORA[b];
      const t = at(tx, ty);
      const n = vnoise(tx, ty, 11, 47);
      let key = null;
      if (t === T.SAND && b !== B.desert) key = rng() < 0.1 ? 'palm' : null;
      else if (t === T.ROCK) key = rng() < 0.14 ? (rng() < 0.6 ? 'boulder' : 'splitTree') : null;
      else if (n >= f.clear && rng() < f.density * (0.6 + n)) key = f.pick(rng());
      if (key) plantAt(key, x + rng() * f.step * 0.6, y + rng() * f.step * 0.6);
    }
  }

  // the animals, each in the parts of the island it likes
  const owlTrees = L.things.filter((t) => t.type === 'object' && (t.key === 'oak' || t.key === 'pine') && biome[Math.floor(t.y / TILE) * MAP_W + Math.floor(t.x / TILE)] === B.forest);
  const roam = (kind, n, inB, look) => {
    const tiles = WILD[kind].tiles;
    for (let k = 0, placed = 0; k < 4000 && placed < n; k++) {
      const tx = Math.floor(C.x - C.rx * 1.6 + rng() * C.rx * 3.2);
      const ty = Math.floor(C.y - C.ry * 1.6 + rng() * C.ry * 3.2);
      if (!inMap(tx, ty) || biome[ty * MAP_W + tx] !== inB || !tiles.includes(at(tx, ty)) || !free(tx, ty, 0)) continue;
      if (kind === 'frog') {
        let wet = false;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (at(tx + dx, ty + dy) === T.WATER) wet = true;
        if (!wet) continue;
      }
      claim(tx, ty, 0);
      add('animal', { kind, ...(look && { look: look(placed) }) }, tx + 0.5, ty + 0.8);
      placed++;
    }
  };
  const stags = (i) => (i % 3 === 0 ? 'stag' : 'deer');
  for (const [kind, n, b, look] of [
    ['deer', 7, B.forest, stags], ['boar', 4, B.forest], ['badger', 3, B.forest], ['hedgehog', 3, B.forest], ['wolf', 3, B.forest], ['fox', 2, B.forest],
    ['rabbit', 3, B.forest], ['frog', 5, B.forest], ['bat', 3, B.forest],
    ['rabbit', 8, B.meadow], ['deer', 4, B.meadow, stags], ['hedgehog', 3, B.meadow], ['frog', 4, B.meadow], ['bat', 3, B.meadow], ['fox', 2, B.meadow],
    ['penguin', 9, B.snow], ['fox', 3, B.snow, () => 'arcticFox'], ['wolf', 3, B.snow], ['goat', 6, B.snow],
    ['snake', 8, B.jungle], ['boar', 3, B.jungle], ['frog', 3, B.jungle],
    ['javelina', 5, B.desert], ['scorpion', 6, B.desert], ['frog', 2, B.desert], ['rabbit', 3, B.isle],
  ]) roam(kind, n, b, look);
  for (let i = 0; i < 5 && owlTrees.length; i++) {
    const t = owlTrees.splice(Math.floor(rng() * owlTrees.length), 1)[0];
    add('animal', { kind: 'owl' }, (t.x + 3) / TILE, (t.y + 1) / TILE);
  }

  // every kind of sea creature in the ocean round the island, no further out than a long swim
  const depth = new Uint8Array(LEVEL_TILES).fill(255);
  const q = [];
  for (let i = 0; i < LEVEL_TILES; i++) if (g[i] !== T.WATER && g[i] !== T.WOOD) { depth[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % MAP_W;
    for (const j of [i - MAP_W, i + MAP_W, x > 0 ? i - 1 : -1, x < MAP_W - 1 ? i + 1 : -1, i - MAP_W - 1, i - MAP_W + 1, i + MAP_W - 1, i + MAP_W + 1]) {
      if (j < 0 || j >= LEVEL_TILES || depth[j] <= depth[i] + 1) continue;
      depth[j] = depth[i] + 1;
      q.push(j);
    }
  }
  const lakes = new Uint8Array(LEVEL_TILES);
  markLakes(g, lakes);
  const SEA_COUNTS = { pods: 10, whales: 6, schools: 80, turtles: 16, jellies: 20, seals: 24, gulls: 12, mantas: 8, orcas: 5, sharks: 7 };
  for (const [kind, n] of Object.entries(SEA_COUNTS)) {
    const k = SEA_KINDS[kind];
    const [lo, hi] = [k.depth[0], Math.min(k.depth[1], 48)];
    const mine = [];
    for (let i = 0; i < 6000 && mine.length < n; i++) {
      const x = C.x - C.rx - 70 + rng() * (C.rx * 2 + 140);
      const y = C.y - C.ry - 60 + rng() * (C.ry * 2 + 120);
      if (!inMap(x, y)) continue;
      const j = Math.floor(y) * MAP_W + Math.floor(x);
      if (g[j] !== T.WATER || lakes[j] || depth[j] < lo || depth[j] > hi) continue;
      if (mine.some((m) => Math.hypot(m[0] - x, m[1] - y) * TILE < k.apart * 0.5)) continue;
      mine.push([x, y]);
      add('sea', { kind }, x, y);
    }
  }
  // sea lions on beaches and rocks beside the open sea, away from the jetty
  const lionSpots = [];
  for (let i = 0; i < 40000 && lionSpots.length < 9; i++) {
    const tx = Math.floor(rng() * MAP_W);
    const ty = Math.floor(rng() * MAP_H);
    const t = at(tx, ty);
    if ((t !== T.SAND && t !== T.ROCK) || Math.hypot(tx - jx, ty - coast) < 30) continue;
    if (![[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => at(tx + dx, ty + dy) === T.WATER && !lakes[(ty + dy) * MAP_W + tx + dx] && depth[(ty + dy * 2) * MAP_W + tx + dx * 2] >= 1)) continue;
    if (lionSpots.some(([x, y]) => Math.hypot(x - tx, y - ty) < 18)) continue;
    lionSpots.push([tx, ty]);
    add('sea', { kind: 'lions' }, tx + 0.5, ty + 0.5);
  }
  return L;
}
