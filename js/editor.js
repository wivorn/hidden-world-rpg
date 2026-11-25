// The level editor, opened as index.html?editor: the game itself with a level swapped in for the story world (see
// level.js), and panels to paint the ground and set out trees, props, animals, sea creatures and dragons. In edit
// mode the game stands still under a free camera; in play mode it runs as ever, with every control. Going back to
// edit leaves the game as it stands, edits and all, to carry on with; Restart starts it afresh. Palettes are read off the game's own tables, so a new dragon,
// animal, tree or kind of ground shows up here without the editor being touched.

const ED_SAVE_KEY = 'hw-editor-level';
const ED_ZOOMS = [1, 1.5, 2, 3, 4, 5, 6];
const ED_UNDO = 40;
const ED_SNAP = 8;
const ED_SAVE_DELAY = 0.8;
const ED_HATCH_RANGE = 260;

const ed = {
  L: null,
  mode: 'edit',
  tool: 'paint',
  tab: 'terrain',
  item: { type: 'terrain', t: T.GRASS },
  brush: 3,
  // dragons are set out as an egg (-1) or at any stage up to GROWN
  stage: GROWN,
  sel: null,
  // a game is under way: edit mode shows its world as it stands, and play carries on with it
  game: false,
  undo: [],
  redo: [],
  grid: false,
  snap: true,
  zoom: 2,
  cx: 0,
  cy: 0,
  keys: new Set(),
  ptr: null,
  drag: null,
  wheel: 0,
  saveT: 0,
  miniT: 0,
  miniDirty: true,
  msg: '',
  msgBad: false,
  msgT: 0,
  status: '',
  // the two kinds picked to combine, and the last kind bred from them
  parents: [],
  bred: null,
};

document.title = 'Numina: level editor';

// ---------- small helpers ----------

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
  return e;
}

// Buttons give focus back to the game screen, so the keys go on working the map and not the button.
function button(label, title, onclick, props = {}) {
  return el('button', {
    type: 'button', title, ...props,
    onclick: (e) => {
      onclick(e);
      e.currentTarget.blur();
    },
  }, label);
}

const LABELS = {
  fenceH: 'Fence across', fenceV: 'Fence down', pine2: 'Tall pine', bannerRed: 'Red banner', bannerBlue: 'Blue banner',
  pillarL: 'Pillar left', pillarR: 'Pillar right', houseB: 'House 2', houseC: 'House 3', houseD: 'House 4', logPile: 'Log pile',
};
const pretty = (key) => LABELS[key] || key.replace(/-(\d+)$/, ' $1').replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase().replace(/^./, (c) => c.toUpperCase());
const capital = (s) => s.replace(/^./, (c) => c.toUpperCase());
const snapTo = (v) => (ed.snap ? Math.round(v / ED_SNAP) * ED_SNAP : Math.round(v));
const inMap = (tx, ty) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;

function notice(text, bad = false) {
  ed.msg = text;
  ed.msgBad = bad;
  ed.msgT = 3.5;
}

// ---------- art for the palette, the cursor and picking things out on the map ----------

// The sprite of an object, and where its anchor (the thing's x, y) sits in it.
function objectArt(key, dir) {
  const s = SPR[key];
  if (!s || typeof s !== 'object') return null;
  const view = s.dirs ? s.dirs[dir] || s.dirs.right || Object.values(s.dirs)[0] : s;
  const img = view.img || (s.frames && s.frames[0]);
  return img && img.width > 1 ? { img, ax: view.ox || 0, ay: view.oy || 0 } : null;
}

// A palette item as the thing it puts down: dragons go down as eggs or at the chosen stage, unless it has its own.
function specOf(item) {
  if (item.type !== 'dragon') return item;
  const stage = item.stage ?? ed.stage;
  return stage < 0 ? { type: 'egg', species: item.species } : { type: 'dragon', species: item.species, stage };
}

function artFor(s) {
  switch (s.type) {
    case 'object': return objectArt(s.key);
    case 'egg': return objectArt(`egg_${s.species}`);
    case 'dragon': {
      if (s.stage >= GROWN) return objectArt(`dragon_${s.species}`);
      const set = SPR.babyDragon[s.species] && SPR.babyDragon[s.species][s.stage];
      return set ? { img: set.down[0], ax: set.ox, ay: set.oy } : null;
    }
    case 'animal': {
      const img = SPR.wild[s.look || s.kind] && SPR.wild[s.look || s.kind].right[0];
      return img ? { img, ax: Math.floor(img.width / 2), ay: img.height - 1 } : null;
    }
    case 'sea': {
      const img = seaArt(s.kind).clear;
      return { img, ax: img.width / 2, ay: img.height / 2 };
    }
    case 'ship': return objectArt('ship', s.dir || 'right');
    case 'spawn': {
      const img = charSprite(player.look, 'down', 0);
      return { img, ax: img.width / 2, ay: img.height - 1 };
    }
    default: return null;
  }
}

// The part of an image that isn't see-through.
const opaqueBoxes = new WeakMap();
function opaque(img) {
  let b = opaqueBoxes.get(img);
  if (b) return b;
  b = { x0: 0, y0: 0, x1: img.width, y1: img.height };
  if (img.getContext) {
    const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
    let [x0, y0, x1, y1] = [img.width, img.height, 0, 0];
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        if (d[(y * img.width + x) * 4 + 3] < 24) continue;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x + 1);
        y1 = Math.max(y1, y + 1);
      }
    }
    if (x1 > x0) b = { x0, y0, x1, y1 };
  }
  opaqueBoxes.set(img, b);
  return b;
}

function trimmed(img) {
  const b = opaque(img);
  const c = makeCanvas(b.x1 - b.x0, b.y1 - b.y0);
  c.getContext('2d').drawImage(img, -b.x0, -b.y0);
  return c;
}

// A patch of ground painted by the game's own tile painter, on a corner of the map borrowed for a moment.
function terrainSwatch(t) {
  const c = makeCanvas(2 * TILE, 2 * TILE);
  const g = c.getContext('2d');
  const saved = [];
  for (let y = 1; y <= 4; y++) {
    for (let x = 1; x <= 4; x++) {
      const i = y * MAP_W + x;
      saved.push([i, map[i]]);
      map[i] = t;
    }
  }
  g.setTransform(1, 0, 0, 1, -2 * TILE, -2 * TILE);
  for (let y = 2; y <= 3; y++) for (let x = 2; x <= 3; x++) groundTile(g, x, y);
  for (let y = 2; y <= 3; y++) for (let x = 2; x <= 3; x++) decorTile(g, x, y, x * TILE, y * TILE);
  for (const [i, v] of saved) map[i] = v;
  return c;
}

// Sea creatures are drawn straight from their state, so each is set up alone and drawn by the game at a few
// moments, keeping the one where most of it shows. A pose brings the shy ones up to the surface.
const SEA_POSE = {
  pods: (p) => { for (const m of p.members) m.up = true; },
  orcas: (p) => { for (const m of p.members) m.up = true; },
  whales: (w) => { w.t = 9; },
  seals: (s) => { s.up = true; },
  gulls: (f) => { f.birds = f.birds.slice(0, 2).map((b, i) => ({ ...b, r: 5 + i * 6, alt: 12 })); },
  jellies: (j) => { j.members = j.members.slice(0, 3).map((m, i) => ({ ...m, ox: (i - 1) * 10, oy: (i % 2) * 6 - 3 })); },
};
const seaArts = new Map();
function seaArt(kind) {
  if (seaArts.has(kind)) return seaArts.get(kind);
  const W = 56;
  const H = 40;
  const at = { x: W / 2, y: Math.round(H * 0.62) };
  const k = SEA_KINDS[kind];
  const item = k.shore
    ? { ...at, members: [{ ...at, state: 'down', t: 0, face: 1, phase: 0, hurtT: 0 }] }
    : k.make({ ...at }, mulberry32(3));
  if (SEA_POSE[kind]) SEA_POSE[kind](item);
  const lists = {};
  for (const id of Object.keys(seaLife)) lists[id] = seaLife[id];
  const saved = { time, viewW, viewH, drawWaves: window.drawWaves, drawFloaters: window.drawFloaters };
  const ocean = hexToRgb(PAL.ocean);
  let best = null;
  try {
    for (const id of Object.keys(seaLife)) seaLife[id] = [];
    seaLife[kind] = [item];
    viewW = W;
    viewH = H;
    window.drawWaves = window.drawFloaters = () => {};
    for (let i = 0; i < 10; i++) {
      time = i * 0.61;
      ctx.fillStyle = PAL.ocean;
      ctx.fillRect(0, 0, W, H);
      drawSeaUnder(0, 0);
      for (const s of seaSprites(0, 0).sort((a, b) => a.y - b.y)) s.draw();
      drawSeaSky(0, 0);
      const img = ctx.getImageData(0, 0, W, H);
      let n = 0;
      for (let j = 0; j < img.data.length; j += 4) {
        const off = Math.abs(img.data[j] - ocean[0]) + Math.abs(img.data[j + 1] - ocean[1]) + Math.abs(img.data[j + 2] - ocean[2]);
        if (off > 18) n++;
        else img.data[j + 3] = 0;
      }
      if (!best || n > best.n) best = { n, img };
    }
  } finally {
    Object.assign(seaLife, lists);
    ({ time, viewW, viewH } = saved);
    window.drawWaves = saved.drawWaves;
    window.drawFloaters = saved.drawFloaters;
  }
  const clear = makeCanvas(W, H);
  clear.getContext('2d').putImageData(best.img, 0, 0);
  const bg = makeCanvas(W, H);
  const g = bg.getContext('2d');
  g.fillStyle = PAL.ocean;
  g.fillRect(0, 0, W, H);
  g.drawImage(clear, 0, 0);
  const art = { clear: trimmed(clear), bg };
  seaArts.set(kind, art);
  return art;
}

const icons = new Map();
function iconFor(item) {
  const spec = specOf(item);
  const k = JSON.stringify(spec);
  if (icons.has(k)) return icons.get(k);
  let img;
  if (spec.type === 'terrain') img = terrainSwatch(spec.t);
  else if (spec.type === 'sea') img = seaArt(spec.kind).bg;
  else {
    const a = artFor(spec);
    img = a ? trimmed(a.img) : makeCanvas(16, 16);
  }
  icons.set(k, img);
  return img;
}

function iconCanvas(item, scale = 1) {
  const src = iconFor(item);
  const c = el('canvas', { width: src.width, height: src.height, 'aria-hidden': 'true' });
  c.getContext('2d').drawImage(src, 0, 0);
  if (scale !== 1) Object.assign(c.style, { width: `${src.width * scale}px`, height: `${src.height * scale}px` });
  return c;
}

// ---------- what's on the map ----------

function boxOf(spec, x, y) {
  const a = artFor(spec);
  if (!a) return { x0: x - 8, y0: y - 16, x1: x + 8, y1: y };
  const b = opaque(a.img);
  return { x0: x - a.ax + b.x0, y0: y - a.ay + b.y0, x1: x - a.ax + b.x1, y1: y - a.ay + b.y1 };
}

function thingBox(t) {
  const h = live.get(t);
  if (t.type === 'animal' && h) return boxOf(t, h.x, h.y - (h.lift || 0));
  if ((t.type === 'dragon' || t.type === 'egg') && h && !h.hidden) return boxOf(t, h.x, h.y);
  if (t.type === 'sea' && SEA_KINDS[t.kind].shore) return { x0: t.x - 40, y0: t.y - 32, x1: t.x + 40, y1: t.y + 32 };
  return boxOf(t, t.x, t.y);
}

function selBox(s) {
  if (s === 'spawn') return ed.L.spawn && boxOf({ type: 'spawn' }, ed.L.spawn.x, ed.L.spawn.y);
  if (s === 'ship') return ed.L.ship && boxOf({ type: 'ship', dir: ed.L.ship.dir }, ed.L.ship.x, ed.L.ship.y);
  return s && thingBox(s);
}

const inBox = (b, x, y) => b && x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1;

// The front-most thing under (x, y): the one standing lowest on the screen is drawn last.
function hitTest(x, y) {
  let best = null;
  let by = -Infinity;
  for (const s of ['spawn', 'ship', ...ed.L.things]) {
    const b = selBox(s);
    if (!inBox(b, x, y)) continue;
    const front = s === 'spawn' ? b.y1 + 1 : b.y1;
    if (front > by) {
      by = front;
      best = s;
    }
  }
  return best;
}

function labelOf(s) {
  if (s === 'spawn' || s.type === 'spawn') return 'Player start';
  if (s === 'ship' || s.type === 'ship') return 'Longship';
  switch (s.type) {
    case 'object': return pretty(s.key);
    case 'animal': return s.look ? pretty(s.look) : capital(WILD[s.kind].name);
    case 'sea': return SEA_KINDS[s.kind].name;
    case 'egg': return `${DRAGON_SPECIES[s.species].name} egg`;
    case 'dragon': return `${s.name || DRAGON_SPECIES[s.species].defaultName}: ${stageName(s.stage)} ${DRAGON_SPECIES[s.species].name}`;
    case 'terrain': return terrainName(Object.keys(T).find((id) => T[id] === s.t));
    default: return '';
  }
}

// ---------- saving, undo ----------

function loadLevel() {
  try {
    const s = JSON.parse(localStorage.getItem(ED_SAVE_KEY));
    if (s) return decodeLevel(s);
  } catch (e) {
    console.warn('Could not read the saved level; starting from the default one', e);
  }
  return defaultLevel();
}

// Bred kinds go with the level that has them.
function keepSpecies(L) {
  for (const t of L.things) if (t.species && !GAME_SPECIES.includes(t.species) && DRAGON_SPECIES[t.species]) L.species[t.species] = DRAGON_SPECIES[t.species];
}

function saveLevel() {
  ed.saveT = 0;
  keepSpecies(ed.L);
  try {
    localStorage.setItem(ED_SAVE_KEY, JSON.stringify(encodeLevel(ed.L)));
  } catch (e) {
    notice('Could not save the level in this browser: use Export to keep it', true);
  }
}

function changed() {
  ed.saveT = ED_SAVE_DELAY;
  ed.miniDirty = true;
}

function checkpoint() {
  ed.undo.push(cloneLevel(ed.L));
  if (ed.undo.length > ED_UNDO) ed.undo.shift();
  ed.redo.length = 0;
  syncTop();
}

function swapLevel(L) {
  ed.L = L;
  ed.sel = null;
  ed.game = false;
  applyLevel(L, false);
  standAtSpawn();
  ui.name.value = L.name;
  renderInspector();
  renderPalette();
  changed();
  syncTop();
}

function undo() {
  if (!ed.undo.length) return notice('Nothing to undo');
  ed.redo.push(ed.L);
  swapLevel(ed.undo.pop());
}

function redo() {
  if (!ed.redo.length) return notice('Nothing to redo');
  ed.undo.push(ed.L);
  swapLevel(ed.redo.pop());
}

// With a game going the player stays where they are; only the start moves.
function standAtSpawn() {
  const s = ed.L.spawn;
  if (s) Object.assign(villageFire, { x: s.x, y: s.y });
  if (!ed.game) Object.assign(player, s ? { x: s.x, y: s.y } : { x: -5000, y: -5000 }, { dir: 'down', anim: 0, frame: 0 });
}

// ---------- painting the ground ----------

function brushTiles(x, y) {
  const n = ed.brush;
  const out = [];
  if (n <= 2) {
    const tx = Math.floor(x / TILE - (n - 1) / 2);
    const ty = Math.floor(y / TILE - (n - 1) / 2);
    for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) out.push([tx + dx, ty + dy]);
  } else {
    const fx = x / TILE;
    const fy = y / TILE;
    const r = n / 2;
    for (let ty = Math.floor(fy - r); ty <= fy + r; ty++) {
      for (let tx = Math.floor(fx - r); tx <= fx + r; tx++) if (Math.hypot(tx + 0.5 - fx, ty + 0.5 - fy) <= r) out.push([tx, ty]);
    }
  }
  return out.filter(([tx, ty]) => inMap(tx, ty));
}

function paintTile(tx, ty, t, out) {
  const i = ty * MAP_W + tx;
  if (map[i] === t) return;
  map[i] = t;
  ed.L.tiles[i] = t;
  out.push([tx, ty]);
}

function paintLine(a, b, stroke) {
  const out = [];
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (TILE / 2)));
  for (let s = 0; s <= steps; s++) {
    const x = a.x + ((b.x - a.x) * s) / steps;
    const y = a.y + ((b.y - a.y) * s) / steps;
    for (const [tx, ty] of brushTiles(x, y)) paintTile(tx, ty, ed.item.t, out);
  }
  if (!out.length) return;
  retile(out);
  stroke.push(...out);
}

// Depth, lakes and the like reach past the tiles painted, so the ground a little way round them is drawn again.
function settleTiles(tiles) {
  if (!tiles.length) return;
  deriveTiles();
  const pad = 12;
  let [x0, y0, x1, y1] = [MAP_W, MAP_H, 0, 0];
  for (const [x, y] of tiles) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const ci0 = Math.max(0, Math.floor((x0 - pad) / CHUNK));
  const cj0 = Math.max(0, Math.floor((y0 - pad) / CHUNK));
  const ci1 = Math.min(CW - 1, Math.floor((x1 + pad) / CHUNK));
  const cj1 = Math.min(CH - 1, Math.floor((y1 + pad) / CHUNK));
  for (let cj = cj0; cj <= cj1; cj++) {
    for (let ci = ci0; ci <= ci1; ci++) {
      chunks.delete(cj * CW + ci);
      chunkSea[cj * CW + ci] = -1;
    }
  }
  mapBase = null;
  fogDirty = true;
  changed();
}

function fillAt(p) {
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor(p.y / TILE);
  if (!inMap(tx, ty)) return;
  const from = map[ty * MAP_W + tx];
  const to = ed.item.t;
  if (from === to) return notice('That ground is already this kind');
  checkpoint();
  const out = [];
  const q = [[tx, ty]];
  const seenTiles = new Uint8Array(LEVEL_TILES);
  seenTiles[ty * MAP_W + tx] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    paintTile(x, y, to, out);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const i = ny * MAP_W + nx;
      if (!inMap(nx, ny) || seenTiles[i] || map[i] !== from) continue;
      seenTiles[i] = 1;
      q.push([nx, ny]);
    }
  }
  retile(out);
  settleTiles(out);
  notice(`Filled ${out.length} tiles with ${labelOf(ed.item).toLowerCase()}`);
}

// ---------- setting things out ----------

function placeAt(p) {
  const d = ed.drag;
  const spec = specOf(ed.item);
  const x = snapTo(p.x);
  const y = snapTo(p.y);
  const problem = placeProblem(spec.type, spec.kind, x, y);
  if (problem) return notice(problem, true);
  if (!d.pushed) {
    checkpoint();
    d.pushed = true;
  }
  const { type, ...props } = spec;
  if (type === 'dragon') Object.assign(props, { name: DRAGON_SPECIES[spec.species].defaultName, saddled: spec.stage >= GROWN });
  const t = newThing(type, props, x, y);
  ed.L.things.push(t);
  spawnThing(t, false);
  const b = boxOf(spec, x, y);
  d.last = p;
  d.gap = Math.max(10, (b.x1 - b.x0) * 0.85);
  keepSpecies(ed.L);
  changed();
}

function placeSpecial(type, p) {
  const x = snapTo(p.x);
  const y = snapTo(p.y);
  if (type === 'spawn') {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor((y - 1) / TILE);
    if (!inMap(tx, ty) || !isLand(tileAt(tx, ty))) return notice('The player has to start on land', true);
    ed.L.spawn = { x, y };
    standAtSpawn();
  } else {
    const problem = placeProblem('ship', null, x, y);
    if (problem) return notice(problem, true);
    ed.L.ship = { x, y, dir: (ed.L.ship && ed.L.ship.dir) || 'right' };
    placeShip(ed.L.ship);
  }
  changed();
}

function removeThing(t) {
  despawnThing(t);
  spliceOut(ed.L.things, t);
  if (ed.sel === t) select(null);
}

function eraseAt(p) {
  const d = ed.drag;
  const r = Math.max(4, (ed.brush * TILE) / 2);
  const gone = ed.L.things.filter((t) => inBox(thingBox(t), p.x, p.y) || Math.hypot(t.x - p.x, t.y - p.y) < r);
  if (!gone.length) return;
  if (!d.pushed) {
    checkpoint();
    d.pushed = true;
  }
  for (const t of gone) removeThing(t);
  changed();
}

// Respawned at the new spot, so it's whatever the game would make of it there.
function moveSel(d, p) {
  const x = snapTo(p.x + d.dx);
  const y = snapTo(p.y + d.dy);
  if (!d.moved) {
    if (Math.hypot(p.x - d.from.x, p.y - d.from.y) < 3) return;
    checkpoint();
    d.moved = true;
  }
  const s = d.hit;
  if (s === 'spawn' || s === 'ship') return placeSpecial(s, { x, y });
  if (s.x === x && s.y === y) return;
  despawnThing(s);
  Object.assign(s, { x, y });
  spawnThing(s, false);
  changed();
  if (s.type === 'animal' || s.type === 'sea') {
    const problem = placeProblem(s.type, s.kind, x, y);
    if (problem) notice(`${problem}: it won't be happy there`, true);
  }
}

function changeThing(t, fn) {
  checkpoint();
  despawnThing(t);
  fn(t);
  spawnThing(t, false);
  keepSpecies(ed.L);
  changed();
  renderInspector();
}

function setDragonStage(t, stage) {
  if (stage < 0) {
    t.type = 'egg';
    delete t.stage;
    delete t.saddled;
    delete t.name;
    return;
  }
  t.type = 'dragon';
  t.stage = stage;
  t.name = t.name || DRAGON_SPECIES[t.species].defaultName;
  if (stage >= GROWN && t.saddled === undefined) t.saddled = true;
}

// The quick way: the eggs crack open on the spot, and hatchlings stand where they were.
function hatchThings(list) {
  if (!list.length) return notice('There are no eggs to hatch');
  checkpoint();
  for (const t of list) {
    despawnThing(t);
    setDragonStage(t, 0);
    spawnThing(t, false);
    const ep = DRAGON_SPECIES[t.species].egg;
    particles.push({ type: 'flash', layer: 'sky', x: t.x, y: t.y - 10, vx: 0, vy: 0, c: ep.glow, life: 0, max: 0.5 });
    burst(t.x, t.y - 10, [ep.base, ep.speck, '#ffe9a8'], 18, 60);
  }
  Sfx.hatch();
  changed();
  renderInspector();
  notice(`${list.length} egg${list.length > 1 ? 's' : ''} hatched`);
}

// Two dragons (or just their kinds and names) bred into a new kind, as a pair in a roost would be, and kept with the level.
function breedKind(d1, d2) {
  let n = 1;
  while (DRAGON_SPECIES[`lvl${n}`]) n++;
  const id = `lvl${n}`;
  const pal = breedSpecies(d1, d2, Math.floor(Math.random() * 1e9));
  registerSpecies(id, pal);
  ed.L.species[id] = pal;
  changed();
  return id;
}

function select(s) {
  ed.sel = s;
  renderInspector();
}

function pick(p) {
  const hit = hitTest(p.x, p.y);
  if (hit && hit !== 'spawn' && hit !== 'ship') {
    const t = hit;
    if (t.type === 'egg' || t.type === 'dragon') {
      ed.stage = t.type === 'egg' ? -1 : t.stage;
      return choose({ type: 'dragon', species: t.species }, 'dragons');
    }
    const tab = t.type === 'object' ? (TABS.find(([id]) => objectTabs[id] && objectTabs[id].includes(t.key)) || ['props'])[0] : t.type === 'animal' ? 'animals' : 'sea';
    const { id, x, y, name, stage, saddled, flip, ...item } = t;
    return choose(item, tab);
  }
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor(p.y / TILE);
  if (inMap(tx, ty)) choose({ type: 'terrain', t: map[ty * MAP_W + tx] }, 'terrain');
}

// ---------- modes ----------

// Back into the game as it was left, or a fresh one from the start if there's none to go back to.
function toPlay(here) {
  if (ed.mode === 'play') return;
  endDrag();
  const at = here ? { x: ed.cx, y: ed.cy } : null;
  ed.mode = 'play';
  ed.keys.clear();
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  document.body.classList.remove('editing', 'ed-panning', 'ed-select');
  if (ed.game) resumePlay(at);
  else if (startPlay(ed.L, at)) ed.game = true;
  else {
    applyLevel(ed.L, false);
    toEdit();
    return notice('There is nowhere to stand: paint some land first', true);
  }
  syncTop();
  setTimeout(() => toast('PLAY MODE', 'Press ` to go back to editing'), 500);
}

// The editor's changes are already in the world. Off a dragon or ship that was taken away, and out of ground painted
// over, onto somewhere to stand; with `at`, on foot there instead.
function resumePlay(at) {
  if ((flight && !dragons.includes(flight.dragon)) || (sail && shipObj.hidden)) calmPlayer();
  const free = !flight && !sail && !hop && !player.swimming;
  if (free && (at || !canStand(player, player.x, player.y))) {
    const spot = standableNear((at || player).x, (at || player).y);
    if (spot) Object.assign(player, spot);
  }
  zoom = zoomTarget();
  applyView();
  updateCamera(0, true);
}

function restartPlay() {
  ed.game = false;
  toEdit();
  toPlay(false);
}

// The game stands still where it is, to be edited and carried on with.
function toEdit() {
  if (ed.mode === 'edit' && document.body.classList.contains('editing')) return;
  const at = flight || (sail && shipObj) || player;
  const here = at.y < MAP_H * TILE ? { x: at.x, y: at.y } : null;
  ed.mode = 'edit';
  keys.clear();
  if (breed.open) toggleBreed(false);
  closeMenus();
  document.body.classList.add('editing');
  syncTool();
  if (!ed.game) standAtSpawn();
  if (here) Object.assign(ed, { cx: here.x, cy: here.y });
  syncTop();
}

const toggleMode = (here) => (ed.mode === 'edit' ? toPlay(here) : toEdit());

// ---------- the loop ----------

const gameUpdate = window.update;
const gameRender = window.render;
window.update = (dt) => (ed.mode === 'play' ? gameUpdate(dt) : editUpdate(dt));
window.render = () => {
  gameRender();
  if (ed.mode === 'edit') drawOverlay();
};

const PAN_KEYS = { KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0], KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1] };

function editUpdate(dt) {
  time += dt;
  for (const o of objects) if (o.shakeT > 0) o.shakeT -= dt;
  emitParticles(dt);
  updateParticles(dt);
  let mx = 0;
  let my = 0;
  for (const code of ed.keys) {
    const v = PAN_KEYS[code];
    if (v) {
      mx += v[0];
      my += v[1];
    }
  }
  if (mx || my) {
    const fast = ed.keys.has('ShiftLeft') || ed.keys.has('ShiftRight') ? 2.5 : 1;
    const speed = (520 * fast) / Math.sqrt(ed.zoom);
    ed.cx += (mx * speed * dt) / Math.hypot(mx, my);
    ed.cy += (my * speed * dt) / Math.hypot(mx, my);
  }
  ed.cx = Math.max(0, Math.min(MAP_W * TILE, ed.cx));
  ed.cy = Math.max(0, Math.min(MAP_H * TILE, ed.cy));
  zoom = ed.zoom;
  applyView();
  cam.x = ed.cx - viewW / 2;
  cam.y = ed.cy - viewH / 2;
  if (ed.saveT > 0 && (ed.saveT -= dt) <= 0) saveLevel();
  if (ed.msgT > 0) ed.msgT -= dt;
  if ((ed.miniT -= dt) <= 0) {
    ed.miniT = 0.15;
    if (ed.miniDirty && !ed.drag) {
      mapBase = null;
      ed.miniDirty = false;
    }
    drawMini();
  }
  updateStatus();
}

// The editor zooms out further than the game ever does, so the frame the world is drawn into is made big enough.
function fitBuffer() {
  const w = Math.ceil(window.innerWidth / ED_ZOOMS[0]) + 1;
  const h = Math.ceil(window.innerHeight / ED_ZOOMS[0]) + 1;
  if (buffer.width >= w && buffer.height >= h) return;
  buffer.width = Math.max(buffer.width, w);
  buffer.height = Math.max(buffer.height, h);
  ctx.imageSmoothingEnabled = false;
  applyView();
}

function zoomBy(step, sx = window.innerWidth / 2, sy = window.innerHeight / 2) {
  const i = ED_ZOOMS.indexOf(ed.zoom);
  const next = ED_ZOOMS[Math.max(0, Math.min(ED_ZOOMS.length - 1, (i < 0 ? 2 : i) + step))];
  if (next === ed.zoom) return;
  // the spot under the pointer stays put
  const wx = ed.cx + (sx - window.innerWidth / 2) / ed.zoom;
  const wy = ed.cy + (sy - window.innerHeight / 2) / ed.zoom;
  ed.zoom = next;
  ed.cx = wx - (sx - window.innerWidth / 2) / next;
  ed.cy = wy - (sy - window.innerHeight / 2) / next;
}

// ---------- drawing over the map ----------

function drawOverlay() {
  const g = screenCtx;
  const s = zoom * dpr;
  const ox = Math.round(cam.x);
  const oy = Math.round(cam.y);
  const X = (x) => (x - ox) * s;
  const Y = (y) => (y - oy) * s;
  const near = (x, y, m = 64) => x > ox - m && x < ox + viewW + m && y > oy - m && y < oy + viewH + m;
  g.save();
  g.imageSmoothingEnabled = false;

  if (ed.grid && ed.zoom >= 1.5) {
    g.strokeStyle = 'rgba(255, 255, 255, 0.13)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = Math.floor(ox / TILE) * TILE; x <= ox + viewW; x += TILE) {
      g.moveTo(Math.round(X(x)) + 0.5, 0);
      g.lineTo(Math.round(X(x)) + 0.5, screenCanvas.height);
    }
    for (let y = Math.floor(oy / TILE) * TILE; y <= oy + viewH; y += TILE) {
      g.moveTo(0, Math.round(Y(y)) + 0.5);
      g.lineTo(screenCanvas.width, Math.round(Y(y)) + 0.5);
    }
    g.stroke();
  }

  // sea creatures spend much of their time under water, so each is shown where it was put
  for (const t of ed.L.things) {
    if (t.type !== 'sea' || !near(t.x, t.y)) continue;
    const a = artFor(t);
    g.globalAlpha = 0.8;
    g.drawImage(a.img, X(t.x - a.ax), Y(t.y - a.ay), a.img.width * s, a.img.height * s);
    g.globalAlpha = 0.5;
    g.strokeStyle = '#bfe3ff';
    g.lineWidth = dpr;
    g.beginPath();
    g.ellipse(X(t.x), Y(t.y + 4), 12 * s * 0.6, 4 * s * 0.6, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;

  const outline = (b, color, dash) => {
    if (!b) return;
    g.strokeStyle = color;
    g.lineWidth = 2 * dpr;
    g.setLineDash(dash ? [4 * dpr, 3 * dpr] : []);
    g.strokeRect(Math.round(X(b.x0 - 1)), Math.round(Y(b.y0 - 1)), Math.round((b.x1 - b.x0 + 2) * s), Math.round((b.y1 - b.y0 + 2) * s));
    g.setLineDash([]);
  };

  if (ed.L.spawn) {
    const { x, y } = ed.L.spawn;
    g.strokeStyle = '#ffd36b';
    g.lineWidth = 2 * dpr;
    g.beginPath();
    g.ellipse(X(x), Y(y), 10 * s * 0.7, 4 * s * 0.7, 0, 0, Math.PI * 2);
    g.stroke();
    g.font = `${7 * dpr}px 'Press Start 2P', monospace`;
    g.textAlign = 'center';
    g.fillStyle = '#3a2414';
    g.fillText('START', X(x) + dpr, Y(y - 26) + dpr);
    g.fillStyle = '#ffd36b';
    g.fillText('START', X(x), Y(y - 26));
  }

  const hover = ed.ptr && !ed.drag && (ed.tool === 'select' || ed.tool === 'erase') ? hitTest(ed.ptr.x, ed.ptr.y) : null;
  if (hover && hover !== ed.sel) outline(selBox(hover), ed.tool === 'erase' ? 'rgba(255, 120, 90, 0.9)' : 'rgba(255, 255, 255, 0.6)', true);
  if (ed.sel) outline(selBox(ed.sel), '#ffd36b', true);

  const p = ed.ptr;
  if (p && !(ed.drag && ed.drag.kind === 'pan')) {
    if (ed.tool === 'paint' && ed.item.type === 'terrain') {
      g.fillStyle = 'rgba(255, 211, 107, 0.22)';
      g.strokeStyle = 'rgba(255, 211, 107, 0.8)';
      g.lineWidth = dpr;
      for (const [tx, ty] of brushTiles(p.x, p.y)) {
        g.fillRect(X(tx * TILE), Y(ty * TILE), TILE * s, TILE * s);
      }
    } else if (ed.tool === 'fill' && ed.item.type === 'terrain') {
      const tx = Math.floor(p.x / TILE);
      const ty = Math.floor(p.y / TILE);
      g.strokeStyle = 'rgba(255, 211, 107, 0.9)';
      g.lineWidth = 2 * dpr;
      g.strokeRect(X(tx * TILE), Y(ty * TILE), TILE * s, TILE * s);
    } else if (ed.tool === 'erase') {
      g.strokeStyle = 'rgba(255, 120, 90, 0.9)';
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.arc(X(p.x), Y(p.y), Math.max(4, (ed.brush * TILE) / 2) * s, 0, Math.PI * 2);
      g.stroke();
    } else if (ed.tool === 'paint') {
      const spec = specOf(ed.item);
      const x = snapTo(p.x);
      const y = snapTo(p.y);
      const a = artFor(spec);
      const bad = spec.type === 'spawn' ? !isLand(tileAt(Math.floor(x / TILE), Math.floor((y - 1) / TILE))) : placeProblem(spec.type, spec.kind, x, y);
      if (a) {
        g.globalAlpha = 0.6;
        g.drawImage(a.img, X(x - a.ax), Y(y - a.ay), a.img.width * s, a.img.height * s);
        g.globalAlpha = 1;
      }
      if (bad) outline(boxOf(spec, x, y), 'rgba(255, 90, 70, 0.95)', false);
    }
  }
  g.restore();
}

// ---------- the user interface ----------

const ui = {};
const TABS = [
  ['terrain', 'Ground'], ['nature', 'Nature'], ['props', 'Props'], ['buildings', 'Houses'],
  ['animals', 'Animals'], ['sea', 'Sea'], ['dragons', 'Dragons'], ['special', 'Start'],
];
const TOOLS_ED = [
  ['select', 'Select', 'V', 'Pick things to change or drag them about'],
  ['paint', 'Paint', 'B', 'Paint ground or put things down'],
  ['fill', 'Fill', 'G', 'Fill a patch of one ground with another'],
  ['erase', 'Erase', 'E', 'Take things away'],
];

const SPENT = /(Spent|Cut|Burnt|Broken|Open|Picked|Melting|Empty)$/;
const NATURE_AXE = new Set(['bush', 'ore', 'gold', 'boulder', 'bramble', 'log', 'crystal']);
const isNature = (key) => TREES[key] || SOIL[key] || LEVEL_SOIL[key] || NATURE_AXE.has(AXE_KINDS[key]) || /^(stump|stalagmite|rock$|glowcaps$|caveCrystal$)/.test(key);
const objectTabs = { nature: [], props: [], buildings: [] };
for (const key of Object.keys(SPR)) {
  const art = objectArt(key);
  if (!art || !placeable(key) || SPENT.test(key)) continue;
  objectTabs[isNature(key) ? 'nature' : art.img.width >= 50 && art.img.height >= 40 ? 'buildings' : 'props'].push(key);
}

const LOOK_KIND = { stag: 'deer' };
function animalItems() {
  const out = [];
  for (const look of Object.keys(SPR.wild)) {
    const kind = WILD[look] ? look : LOOK_KIND[look] || Object.keys(WILD).find((k) => look.toLowerCase().endsWith(k));
    if (kind) out.push(look === kind ? { type: 'animal', kind } : { type: 'animal', kind, look });
  }
  return out;
}

function paletteItems(tab) {
  switch (tab) {
    case 'terrain': return TERRAINS.map(({ t }) => ({ type: 'terrain', t }));
    case 'nature':
    case 'props':
    case 'buildings': return objectTabs[tab].map((key) => ({ type: 'object', key }));
    case 'animals': return animalItems();
    case 'sea': return Object.keys(SEA_KINDS).map((kind) => ({ type: 'sea', kind }));
    case 'dragons': return Object.keys(DRAGON_SPECIES).map((species) => ({ type: 'dragon', species }));
    case 'special': return [{ type: 'spawn' }, { type: 'ship' }];
    default: return [];
  }
}

const sameItem = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function paletteLabel(item) {
  if (item.type === 'dragon') return DRAGON_SPECIES[item.species].name;
  return labelOf(item);
}

function choose(item, tab) {
  ed.item = item;
  if (tab) ed.tab = tab;
  if (ed.tool === 'select' || ed.tool === 'erase' || (ed.tool === 'fill' && item.type !== 'terrain')) ed.tool = 'paint';
  syncTool();
  renderPalette();
  notice(`${paletteLabel(item)}: ${item.type === 'terrain' ? 'drag to paint it' : 'click the map to put one down'}`);
}

function renderPalette() {
  for (const b of ui.tabs.children) b.setAttribute('aria-pressed', String(b.dataset.tab === ed.tab));
  ui.palette.replaceChildren(...paletteItems(ed.tab).map((item) => el('li', {},
    button([iconCanvas(item), el('span', {}, paletteLabel(item))], paletteLabel(item), () => choose(item), { 'aria-pressed': String(sameItem(item, ed.item)) }))));
  renderOptions();
}

function renderOptions() {
  const o = ui.options;
  o.replaceChildren();
  if (ed.tab === 'terrain' || ed.tool === 'erase') {
    const size = el('input', { type: 'range', min: '1', max: '12', value: String(ed.brush), 'aria-label': 'Brush size' });
    const n = el('span', {}, String(ed.brush));
    size.addEventListener('input', () => {
      ed.brush = Number(size.value);
      n.textContent = String(ed.brush);
    });
    ui.brushOut = { size, n };
    o.append(el('label', {}, 'Brush '), size, n);
  }
  if (ed.tab === 'dragons') {
    for (let s = -1; s <= GROWN; s++) {
      o.append(button(s < 0 ? 'Egg' : stageName(s), `Put dragons down as ${s < 0 ? 'eggs' : stageName(s).toLowerCase()}s`, () => {
        ed.stage = s;
        renderPalette();
      }, { 'aria-pressed': String(ed.stage === s) }));
    }
    o.append(button('Hatch all eggs', 'Crack every egg on the level open now', () => hatchThings(ed.L.things.filter((t) => t.type === 'egg'))));
  }
  if (ed.tab === 'special') o.append(el('span', { class: 'note' }, 'Click land to move the start, or water to moor the longship'));
}

function syncBrush() {
  if (ui.brushOut) {
    ui.brushOut.size.value = String(ed.brush);
    ui.brushOut.n.textContent = String(ed.brush);
  }
}

function syncTool() {
  for (const b of ui.tools.children) b.setAttribute('aria-pressed', String(b.dataset.tool === ed.tool));
  document.body.classList.toggle('ed-select', ed.mode === 'edit' && ed.tool === 'select');
  const hints = {
    select: 'Click a thing to change it, drag to move it. Del removes it. Drag empty ground to pan.',
    paint: ed.item.type === 'terrain' ? 'Drag to paint. [ and ] change the brush. Alt-click picks up what is under the cursor.' : 'Click or drag to put things down. Alt-click picks up what is under the cursor.',
    fill: 'Click to fill the patch of ground under the cursor.',
    erase: 'Drag over things to take them away. [ and ] change the size.',
  };
  ui.hint.textContent = hints[ed.tool];
  if (ui.options) renderOptions();
}

function setTool(tool) {
  ed.tool = tool;
  syncTool();
}

function syncTop() {
  if (!ui.top) return;
  ui.editBtn.setAttribute('aria-pressed', String(ed.mode === 'edit'));
  ui.playBtn.setAttribute('aria-pressed', String(ed.mode === 'play'));
  ui.playBtn.title = ed.game ? 'Carry on playing where you left off (`)' : 'Play from the start (`)';
  ui.undoBtn.disabled = !ed.undo.length;
  ui.redoBtn.disabled = !ed.redo.length;
  ui.gridBtn.setAttribute('aria-pressed', String(ed.grid));
  ui.snapBtn.setAttribute('aria-pressed', String(ed.snap));
}

function speciesSelect(value, onchange, label) {
  const s = el('select', { 'aria-label': label, onchange: () => onchange(s.value) },
    Object.entries(DRAGON_SPECIES).map(([id, sp]) => el('option', { value: id }, sp.name)));
  s.value = value;
  return s;
}

function renderInspector() {
  const box = ui.inspect;
  const s = ed.sel;
  box.hidden = !s;
  box.replaceChildren();
  if (!s) return;
  box.append(el('h3', {}, labelOf(s).toUpperCase()));
  if (s === 'spawn') {
    box.append(el('p', {}, 'Where play begins. Drag it about, or choose Player start under Start and click the map.'));
    return;
  }
  if (s === 'ship') {
    const dir = el('select', { 'aria-label': 'Facing', onchange: () => {
      checkpoint();
      ed.L.ship.dir = dir.value;
      placeShip(ed.L.ship);
      changed();
    } }, ['right', 'left', 'up', 'down'].map((d) => el('option', { value: d }, capital(d))));
    dir.value = ed.L.ship.dir || 'right';
    box.append(el('div', { class: 'row' }, el('label', {}, 'Facing'), dir));
    box.append(el('div', { class: 'row' }, button('Remove', 'Take the longship off the level', () => {
      checkpoint();
      ed.L.ship = null;
      placeShip(null);
      select(null);
      changed();
    })));
    return;
  }
  const t = s;
  const a = artFor(t);
  if (a) {
    const img = trimmed(a.img);
    const k = Math.max(1, Math.min(3, Math.floor(72 / Math.max(img.width, img.height))));
    const c = el('canvas', { width: img.width, height: img.height, 'aria-hidden': 'true' });
    c.getContext('2d').drawImage(img, 0, 0);
    Object.assign(c.style, { width: `${img.width * k}px`, height: `${img.height * k}px` });
    box.append(c);
  }
  if (t.type === 'dragon' || t.type === 'egg') {
    if (t.type === 'dragon') {
      const name = el('input', { type: 'text', maxlength: '12', value: t.name || '', 'aria-label': 'Name', spellcheck: 'false' });
      name.addEventListener('change', () => changeThing(t, (d) => { d.name = name.value.trim() || DRAGON_SPECIES[d.species].defaultName; }));
      box.append(el('div', { class: 'row' }, el('label', {}, 'Name'), name));
    }
    box.append(el('div', { class: 'row' }, el('label', {}, 'Kind'), speciesSelect(t.species, (v) => changeThing(t, (d) => { d.species = v; }), 'Kind')));
    const stage = el('select', { 'aria-label': 'Stage', onchange: () => changeThing(t, (d) => setDragonStage(d, Number(stage.value))) },
      Array.from({ length: GROWN + 2 }, (_, i) => el('option', { value: String(i - 1) }, i ? stageName(i - 1) : 'Egg')));
    stage.value = String(t.type === 'egg' ? -1 : t.stage);
    box.append(el('div', { class: 'row' }, el('label', {}, 'Stage'), stage));
    if (t.type === 'dragon' && t.stage >= GROWN) {
      const saddle = el('input', { type: 'checkbox', checked: t.saddled !== false, onchange: () => changeThing(t, (d) => { d.saddled = saddle.checked; }) });
      const flip = el('input', { type: 'checkbox', checked: !!t.flip, onchange: () => changeThing(t, (d) => { d.flip = flip.checked; }) });
      box.append(el('div', { class: 'row' }, el('label', {}, saddle, ' Saddled'), el('label', {}, flip, ' Face right')));
    }
    if (t.type === 'egg') box.append(el('div', { class: 'row' }, button('Hatch', 'Crack this egg open now', () => hatchThings([t]))));
    if (t.type === 'dragon' && t.stage < GROWN) box.append(el('div', { class: 'row' }, button('Grow', 'Grow it on a stage', () => changeThing(t, (d) => setDragonStage(d, d.stage + 1)))));
  }
  if (t.type === 'animal') {
    const looks = animalItems().filter((i) => i.kind === t.kind);
    if (looks.length > 1) {
      const look = el('select', { 'aria-label': 'Look', onchange: () => changeThing(t, (d) => { if (look.value === d.kind) delete d.look; else d.look = look.value; }) },
        looks.map((i) => el('option', { value: i.look || i.kind }, labelOf(i))));
      look.value = t.look || t.kind;
      box.append(el('div', { class: 'row' }, el('label', {}, 'Look'), look));
    }
  }
  if (t.type === 'object' && (SPR[t.key].dirs || /^dragon_/.test(t.key))) box.append(el('div', { class: 'row' }, el('label', {}, 'Facing'), button('Flip', 'Turn it round', () => changeThing(t, (d) => { d.flip = !d.flip; }))));
  box.append(el('p', {}, `At ${Math.floor(t.x / TILE)}, ${Math.floor(t.y / TILE)}`));
  box.append(el('div', { class: 'row' }, button('Delete', 'Take it away (Del)', () => {
    checkpoint();
    removeThing(t);
    changed();
  })));
}

// Every kind of dragon to pick two parents from, in the editor's side column. Clicking a picked one lets it go
// again; a third pick takes the second one's place.
function pickParent(id) {
  const p = ed.parents;
  const i = p.indexOf(id);
  if (i >= 0) p.splice(i, 1);
  else if (p.length < 2) p.push(id);
  else p[1] = id;
  renderCombine();
}

function combinePicked() {
  const id = breedKind(...ed.parents.map((sp) => ({ species: sp, name: DRAGON_SPECIES[sp].defaultName })));
  const sp = DRAGON_SPECIES[id];
  ed.bred = id;
  choose({ type: 'dragon', species: id }, 'dragons');
  notice(`A new kind: the ${sp.name}. Click the map to put one down.`);
  renderCombine();
}

function renderCombine() {
  const p = ed.parents.filter((id) => DRAGON_SPECIES[id]);
  ed.parents = p;
  const name = (id) => DRAGON_SPECIES[id].name;
  const pair = p.length === 2 ? `${name(p[0])} + ${name(p[1])}` : p.length ? `${name(p[0])} + pick one more` : 'Pick two kinds of dragon';
  const bred = ed.bred && DRAGON_SPECIES[ed.bred];
  ui.combineEdit.replaceChildren(
    el('p', { class: 'pair' }, pair),
    el('ul', { class: 'ed-kinds', 'aria-label': 'Kinds of dragon' }, Object.keys(DRAGON_SPECIES).map((id) => {
      const k = p.indexOf(id);
      return el('li', {}, button([
        iconCanvas({ type: 'dragon', species: id, stage: GROWN }),
        el('span', {}, name(id)),
        k >= 0 ? el('b', { class: 'badge' }, 'AB'[k]) : null,
      ], k >= 0 ? `${name(id)}: picked as ${'AB'[k]}, click to let it go` : `Pick the ${name(id)}`, () => pickParent(id), { 'aria-pressed': String(k >= 0) }));
    })),
    el('div', { class: 'row' },
      button('Combine', 'Breed the two into a new kind of dragon', combinePicked, { disabled: p.length < 2 }),
      button('Clear', 'Let both go', () => {
        ed.parents = [];
        renderCombine();
      }, { disabled: !p.length })),
    ...(bred ? [el('p', { class: 'out' }, iconCanvas({ type: 'dragon', species: ed.bred, stage: GROWN }, 2), el('br'),
      `${bred.name}, from ${bred.parents.join(' and ')}. Combine again for another.`)] : []),
  );
}

// ---------- combining in play mode: the dragons out on the map, picked two at a time as in the craft menu ----------

const BREED_SLOTS = 2;
const breed = { open: false, picked: [] };
const distTo = (d) => Math.hypot(d.x - player.x, d.y - player.y);
const grown = (d) => d.stage >= GROWN;
const canBreedHere = () => !flight && !sail && !hop && !fade && !naming;

function dragonIcon(d, box = 40) {
  const c = iconCanvas({ type: 'dragon', species: d.species, stage: d.stage });
  const k = Math.min(3, box / Math.max(c.width, c.height));
  Object.assign(c.style, { width: `${Math.round(c.width * k)}px`, height: `${Math.round(c.height * k)}px` });
  return c;
}

function breedRow(d) {
  const sp = DRAGON_SPECIES[d.species];
  const k = breed.picked.indexOf(d);
  const where = d === follower ? 'following you' : `${Math.round(distTo(d) / TILE)} steps away`;
  const li = el('li', { class: k >= 0 ? 'picked' : '' },
    el('span', { class: 'ware-icon' }, dragonIcon(d)),
    el('span', { class: 'what' }, d.name, el('small', {}, `${sp.name}  ·  Breath: ${BREATH_NAMES[breathOf(d.species)]}  ·  ${where}`)));
  li.append(tradeButton(k >= 0 ? 'PICKED' : 'PICK', k >= 0 ? `Take ${d.name} back out` : `Pick ${d.name}`, `breed-${dragons.indexOf(d)}`, true, () => {
    if (k >= 0) breed.picked.splice(k, 1);
    else if (breed.picked.length < BREED_SLOTS) breed.picked.push(d);
    else breed.picked[BREED_SLOTS - 1] = d;
    Sfx.drop();
    renderBreed();
  }));
  return li;
}

function renderBreed() {
  const focused = document.activeElement?.dataset?.key;
  breed.picked = breed.picked.filter((d) => dragons.includes(d) && grown(d));
  ui.breedSlots.replaceChildren(...Array.from({ length: BREED_SLOTS }, (_, i) => {
    const d = breed.picked[i];
    if (!d) return el('li', { class: 'empty', 'aria-label': `Parent ${i + 1}, empty` });
    const b = tradeButton('', `Take ${d.name} back out`, `slot-${i}`, true, () => {
      breed.picked.splice(i, 1);
      Sfx.drop();
      renderBreed();
    });
    b.append(dragonIcon(d, 46));
    return el('li', {}, b);
  }));
  const list = dragons.filter(grown).sort((a, b) => (b === follower) - (a === follower) || distTo(a) - distTo(b));
  ui.breedTitle.textContent = `GROWN DRAGONS ON THE MAP ${list.length}`;
  ui.breedList.replaceChildren(...(list.length ? list.map(breedRow) : [el('li', { class: 'none' }, 'No grown dragons here yet. Grow a young one, or set some out in the editor.')]));
  ui.breedSay.textContent = breedForecast();
  ui.breedTry.disabled = breed.picked.length < BREED_SLOTS;
  ui.breedClear.disabled = !breed.picked.length;
  const again = focused && ui.breed.querySelector(`[data-key="${focused}"]:not(:disabled)`);
  (again || ui.breed.querySelector('#ed-breed-list button') || ui.breedClose).focus();
}

// The breaths the pair's egg could have, from the four ways their copies could pair up, mutations aside.
function breathOdds(d1, d2) {
  const odds = new Map();
  for (const a of genesOf(d1.species).breath) {
    for (const b of genesOf(d2.species).breath) {
      const el = shownTrait('breath', [a, b]);
      odds.set(el, (odds.get(el) || 0) + 25);
    }
  }
  return [...odds].sort((x, y) => y[1] - x[1]);
}

function breedForecast() {
  if (breed.picked.length < BREED_SLOTS) return 'Which two should have an egg together?';
  const odds = breathOdds(...breed.picked);
  const say = ([el, p]) => `${BREATH_NAMES[el]}${FUSED_FROM[el] ? ' (a fused breath!)' : ''}${odds.length > 1 ? ` ${p}%` : ''}`;
  return odds.length > 1 ? `Their egg could breathe ${odds.map(say).join(', ')}.` : `Their egg will breathe ${say(odds[0])}.`;
}

function toggleBreed(open = !breed.open) {
  if (open && !canBreedHere()) return toast('NOT HERE', 'Land first: the egg needs ground to sit on');
  breed.open = open;
  ui.breed.hidden = !open;
  keys.clear();
  Sfx.drop();
  if (!open) return document.activeElement?.blur();
  if (!breed.picked.length && follower && grown(follower)) breed.picked = [follower];
  renderBreed();
}

// The two dragons have an egg of a new kind, set down at the player's feet to hatch.
function breedPicked() {
  const [d1, d2] = breed.picked;
  const id = breedKind(d1, d2);
  const pal = DRAGON_SPECIES[id];
  const [vx, vy] = DIR_VEC[player.dir];
  const spot = standableNear(player.x + vx * 18, player.y + vy * 14) || { x: player.x, y: player.y };
  const t = newThing('egg', { species: id }, spot.x, spot.y);
  spawnThing(t, true);
  burst(t.x, t.y - 8, [pal.egg.base, pal.egg.speck, '#ffe9a8'], 14, 40);
  Sfx.chirp(earshot(t.x, t.y));
  for (const d of breed.picked) Object.assign(d, { emote: 'heart', emoteT: 1.8 });
  breed.picked = [];
  toggleBreed(false);
  toast('A NEW EGG', `${d1.name} and ${d2.name} have a ${pal.name} egg. Press Hatch egg to crack it open.`);
  renderPalette();
  renderCombine();
}

// Names come from level files, which may come from anyone.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function updateStatus() {
  const parts = [];
  const p = ed.ptr;
  if (p) {
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (inMap(tx, ty)) parts.push(`<b>${tx}, ${ty}</b> ${labelOf({ type: 'terrain', t: map[ty * MAP_W + tx] })}`);
    const hit = hitTest(p.x, p.y);
    if (hit) parts.push(esc(labelOf(hit)));
  }
  parts.push(`zoom ${ed.zoom}x`);
  parts.push(`${ed.L.things.length} things`);
  if (ed.msgT > 0) parts.push(ed.msgBad ? `<span class="bad">${esc(ed.msg)}</span>` : `<b>${esc(ed.msg)}</b>`);
  const html = parts.join('   ·   ');
  if (html !== ed.status) {
    ed.status = html;
    ui.status.innerHTML = html;
  }
}

function drawMini() {
  if (!mapBase) buildMapBase();
  const g = ui.mini.getContext('2d');
  g.drawImage(mapBase, 0, 0);
  g.strokeStyle = '#ffd36b';
  g.lineWidth = 3;
  g.strokeRect(cam.x / TILE, cam.y / TILE, viewW / TILE, viewH / TILE);
  if (ed.L.spawn) {
    g.fillStyle = '#ff5a4a';
    g.fillRect(ed.L.spawn.x / TILE - 3, ed.L.spawn.y / TILE - 3, 6, 6);
  }
}

function exportLevel() {
  keepSpecies(ed.L);
  const blob = new Blob([JSON.stringify(encodeLevel(ed.L))], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `${(ed.L.name || 'level').replace(/[^\w-]+/g, '-').toLowerCase()}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importLevel(file) {
  file.text().then((text) => {
    const L = decodeLevel(JSON.parse(text));
    checkpoint();
    swapLevel(L);
    if (L.spawn) Object.assign(ed, { cx: L.spawn.x, cy: L.spawn.y });
    notice(`Opened ${L.name}`);
  }).catch((e) => notice(`That file isn't a level: ${e.message}`, true));
}

function newLevel(kind) {
  checkpoint();
  const L = kind === 'empty' ? blankLevel() : defaultLevel();
  swapLevel(L);
  Object.assign(ed, { cx: L.spawn.x, cy: L.spawn.y });
  notice(`New level: ${L.name}. Undo brings the old one back.`);
}

// In play mode: crack open the egg nearest the player (the one in hand, if any, set down first) and let the game
// hatch it.
function hatchNearest() {
  if (carried) {
    const e = carried;
    setDownEgg();
    if (carried === e) {
      carried = null;
      Object.assign(e, { x: Math.round(player.x + 14), y: Math.round(player.y), hidden: false, state: 'down' });
      placeCollider(e);
      e.col.off = false;
    }
  }
  const e = eggs.filter((e) => !e.hidden && (e.state === 'down' || e.state === 'wild')).sort((a, b) => distTo(a) - distTo(b))[0];
  if (!e || distTo(e) > ED_HATCH_RANGE) return toast('NO EGG NEARBY', e ? `The nearest is ${Math.round(distTo(e) / TILE)} steps away` : 'Combine two dragons, or set an egg out in the editor');
  Object.assign(e, { state: 'warming', hatchT: HATCH_TIME - 1.2, crack: 0 });
  toast('HATCHING', `The ${DRAGON_SPECIES[e.species].name} egg is cracking open`);
}

function growNearby() {
  const young = (d) => d.stage < GROWN;
  const d = follower && young(follower) ? follower : dragons.filter(young).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
  if (!d || Math.hypot(d.x - player.x, d.y - player.y) > ED_HATCH_RANGE) return toast('NO YOUNG DRAGON', 'Bring a young dragon close to grow it');
  feedBaby(d);
}

function buildUi() {
  ui.editBtn = button('Edit', 'Edit the level (`)', () => toEdit());
  ui.playBtn = button('Play', 'Play from the start (`)', () => toPlay(false));
  ui.undoBtn = button('Undo', 'Undo (Ctrl+Z)', undo);
  ui.redoBtn = button('Redo', 'Redo (Ctrl+Shift+Z)', redo);
  ui.gridBtn = button('Grid', 'Show the tile grid', () => {
    ed.grid = !ed.grid;
    syncTop();
  });
  ui.snapBtn = button('Snap', 'Line things up on a half-tile grid', () => {
    ed.snap = !ed.snap;
    syncTop();
  });
  ui.name = el('input', { id: 'ed-name', type: 'text', maxlength: '32', value: ed.L.name, 'aria-label': 'Level name', spellcheck: 'false' });
  ui.name.addEventListener('input', () => {
    ed.L.name = ui.name.value;
    changed();
  });
  const fresh = el('select', { 'aria-label': 'New level', onchange: () => {
    if (fresh.value) newLevel(fresh.value);
    fresh.value = '';
    fresh.blur();
  } }, el('option', { value: '' }, 'New...'), el('option', { value: 'default' }, 'Dragon Isle'), el('option', { value: 'empty' }, 'Empty sea'));
  const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: () => {
    if (file.files[0]) importLevel(file.files[0]);
    file.value = '';
  } });
  const clockIn = el('input', { id: 'ed-clock', type: 'range', min: '0', max: '0.999', step: '0.005', value: String(clock), 'aria-label': 'Time of day' });
  const clockOut = el('span', {}, clockLabel());
  clockIn.addEventListener('input', () => {
    clock = Number(clockIn.value);
    renderClock();
    clockOut.textContent = clockLabel();
  });
  ui.top = el('div', { id: 'ed-top', class: 'ed edit-only', role: 'toolbar', 'aria-label': 'Level editor' },
    ui.editBtn, ui.playBtn, button('Play here', 'Play from the middle of the screen (Shift+`)', () => toPlay(true)),
    el('span', { class: 'sep' }), ui.undoBtn, ui.redoBtn,
    el('span', { class: 'sep' }), fresh, button('Open', 'Open a level file', () => file.click()), button('Save file', 'Save the level to a file', exportLevel), file,
    el('span', { class: 'sep' }), ui.name,
    el('span', { class: 'sep' }), el('label', {}, 'Time ', clockIn, ' ', clockOut),
    el('span', { class: 'sep' }), ui.gridBtn, ui.snapBtn, button('?', 'Keys and help (H)', () => toggleHelp()));

  ui.tools = el('div', { id: 'ed-tools' }, TOOLS_ED.map(([id, label, key, title]) => button(`${label} ${key}`, `${title} (${key})`, () => setTool(id), { 'data-tool': id })));
  ui.tabs = el('div', { id: 'ed-tabs', role: 'tablist' }, TABS.map(([id, label], i) => button(label, `${label} (${i + 1})`, () => {
    ed.tab = id;
    renderPalette();
  }, { 'data-tab': id })));
  ui.options = el('div', { id: 'ed-options' });
  ui.palette = el('ul', { id: 'ed-palette' });
  ui.hint = el('p', { id: 'ed-hint' });
  ui.side = el('div', { id: 'ed-side', class: 'ed edit-only' }, ui.tools, ui.tabs, ui.options, ui.palette, ui.hint);

  ui.inspect = el('section', { id: 'ed-inspect', hidden: true });
  ui.combineEdit = el('div');
  ui.breedSlots = el('ul', { id: 'ed-breed-slots', 'aria-label': 'The two parents' });
  ui.breedSay = el('p', { id: 'ed-breed-say', role: 'status', 'aria-live': 'polite' });
  ui.breedTitle = el('h3', { id: 'ed-breed-list-title' });
  ui.breedList = el('ul', { id: 'ed-breed-list' });
  ui.breedTry = el('button', { type: 'button', onclick: breedPicked }, 'COMBINE');
  ui.breedClear = el('button', { type: 'button', onclick: () => {
    breed.picked = [];
    renderBreed();
  } }, 'CLEAR');
  ui.breedClose = el('button', { type: 'button', onclick: () => toggleBreed(false) }, 'CLOSE');
  ui.breed = el('div', { id: 'ed-breed', class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ed-breed-title', hidden: true },
    el('div', { class: 'panel trade-panel' },
      el('h2', { id: 'ed-breed-title' }, 'COMBINE DRAGONS'),
      el('p', { id: 'ed-breed-help' }, 'Pick two grown dragons on the map. They\'ll have an egg of a kind never seen before.'),
      ui.breedSlots,
      el('div', { class: 'tinker-actions' }, ui.breedTry, ui.breedClear),
      ui.breedSay,
      el('div', { class: 'trade-cols solo' }, el('section', { 'aria-labelledby': 'ed-breed-list-title' }, ui.breedTitle, ui.breedList)),
      ui.breedClose));
  ui.breed.addEventListener('pointerdown', (e) => { if (e.target === ui.breed) toggleBreed(false); });
  ui.mini = el('canvas', { id: 'ed-mini', width: MAP_W, height: MAP_H, 'aria-label': 'Minimap: click to go there' });
  const jump = (e) => {
    if (!(e.buttons & 1)) return;
    const r = ui.mini.getBoundingClientRect();
    ed.cx = ((e.clientX - r.left) / r.width) * MAP_W * TILE;
    ed.cy = ((e.clientY - r.top) / r.height) * MAP_H * TILE;
  };
  ui.mini.addEventListener('pointerdown', (e) => {
    ui.mini.setPointerCapture(e.pointerId);
    jump(e);
  });
  ui.mini.addEventListener('pointermove', jump);
  ui.right = el('div', { id: 'ed-right', class: 'ed edit-only' },
    ui.inspect,
    el('section', { id: 'ed-combine' }, el('h3', {}, 'COMBINE DRAGONS'), ui.combineEdit),
    el('section', {}, el('h3', {}, 'MAP'), ui.mini));

  ui.status = el('div', { id: 'ed-status', class: 'ed edit-only', role: 'status' });

  ui.play = el('div', { id: 'ed-playbar', class: 'ed play-only', role: 'toolbar', 'aria-label': 'Level editor' },
    el('h3', {}, 'EDITOR'),
    button('Edit `', 'Back to editing the level (`)', () => toEdit()),
    button('Hatch egg', 'Hatch the egg nearest you now', hatchNearest),
    button('Grow dragon', 'Grow your young dragon on a stage', growNearby),
    button('Combine', 'Pick two grown dragons on the map to have an egg of a new kind', () => toggleBreed()),
    button('Restart', 'Start the level again, from scratch', restartPlay));

  const keysHelp = [
    ['`', 'Switch between editing and playing; play carries on where it was left (Shift+` from the middle of the screen)'],
    ['WASD / arrows', 'Move about (Shift for faster)'], ['Wheel, + and -', 'Zoom'], ['Right drag, Space drag', 'Pan'],
    ['V B G E', 'Select, Paint, Fill, Erase'], ['[ and ]', 'Brush size'], ['1 to 8', 'Palette tabs'], ['Alt-click', 'Pick up what is under the cursor'],
    ['Del', 'Delete what is selected'], ['Ctrl+Z, Ctrl+Shift+Z', 'Undo, redo'], ['F', 'Go to the player start'], ['H', 'This help'],
  ];
  ui.help = el('div', { id: 'ed-help', class: 'ed', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ed-help-title', hidden: true },
    el('h3', { id: 'ed-help-title' }, 'LEVEL EDITOR'),
    el('p', {}, 'Paint ground and set out trees, props, animals, sea creatures and dragons, then press ` to play the level with every game control. Everything is saved in this browser as you go; Save file keeps a copy.'),
    el('dl', {}, keysHelp.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)])),
    el('p', {}, 'Dragons: choose a stage (or Egg) above the dragon palette. Combine: pick two kinds from the list and breed them into a new one, kept with the level. In play mode the editor bar hatches the egg nearest you, grows your dragon, and Combine lists the grown dragons on the map: pick two and they lay an egg of a new kind at your feet.'),
    button('Close', 'Close (Esc)', () => toggleHelp(false)));

  document.body.append(ui.top, ui.side, ui.right, ui.status, ui.play, ui.breed, ui.help);
  renderCombine();
  renderPalette();
  syncTool();
  syncTop();
}

function toggleHelp(open = ui.help.hidden) {
  ui.help.hidden = !open;
}

// ---------- input ----------

const typing = (e) => e.target.closest && e.target.closest('input:not([type="checkbox"]):not([type="range"]), select, textarea');

function editKey(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.code === 'KeyZ') {
    e.preventDefault();
    return e.shiftKey ? redo() : undo();
  }
  if (mod && e.code === 'KeyY') {
    e.preventDefault();
    return redo();
  }
  if (mod) return;
  if (PAN_KEYS[e.code] || e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  const tool = TOOLS_ED.find(([, , key]) => e.code === `Key${key}`);
  if (tool) return setTool(tool[0]);
  const tab = e.code.match(/^Digit([1-8])$/);
  if (tab) {
    ed.tab = TABS[Number(tab[1]) - 1][0];
    return renderPalette();
  }
  switch (e.code) {
    case 'BracketLeft':
      ed.brush = Math.max(1, ed.brush - 1);
      return syncBrush();
    case 'BracketRight':
      ed.brush = Math.min(12, ed.brush + 1);
      return syncBrush();
    case 'Equal':
    case 'NumpadAdd':
      return zoomBy(1);
    case 'Minus':
    case 'NumpadSubtract':
      return zoomBy(-1);
    case 'Delete':
    case 'Backspace':
      if (ed.sel && ed.sel !== 'spawn') {
        checkpoint();
        if (ed.sel === 'ship') {
          ed.L.ship = null;
          placeShip(null);
          select(null);
        } else removeThing(ed.sel);
        changed();
      }
      return;
    case 'Escape':
      if (!ui.help.hidden) return toggleHelp(false);
      return select(null);
    case 'KeyH':
      return toggleHelp();
    case 'KeyF':
      if (ed.L.spawn) Object.assign(ed, { cx: ed.L.spawn.x, cy: ed.L.spawn.y });
      return;
    default:
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Backquote' && !typing(e) && !(ed.mode === 'play' && (naming || document.activeElement === chatInput))) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) toggleMode(e.shiftKey);
    return;
  }
  // the game stands still for the combine menu, as for its own menus; buttons still take Enter and Space
  if (ed.mode === 'play' && breed.open) {
    e.stopImmediatePropagation();
    if (e.code === 'Escape') toggleBreed(false);
    return;
  }
  if (ed.mode !== 'edit') return;
  e.stopImmediatePropagation();
  if (typing(e)) return;
  ed.keys.add(e.code);
  editKey(e);
}, true);

window.addEventListener('keyup', (e) => {
  if (ed.mode !== 'edit') return;
  e.stopImmediatePropagation();
  ed.keys.delete(e.code);
}, true);

window.addEventListener('blur', () => ed.keys.clear());

const toWorld = (e) => ({ x: Math.round(cam.x) + e.clientX / zoom, y: Math.round(cam.y) + e.clientY / zoom });

function startPan(e) {
  ed.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: ed.cx, cy: ed.cy };
  document.body.classList.add('ed-panning');
}

function endDrag() {
  const d = ed.drag;
  ed.drag = null;
  document.body.classList.remove('ed-panning');
  if (!d) return;
  if (d.kind === 'paint') settleTiles(d.stroke);
  if (d.kind === 'move' && d.moved) renderInspector();
}

window.addEventListener('pointerdown', (e) => {
  if (ed.mode !== 'edit' || e.target !== screenCanvas) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  if (ed.drag) return;
  screenCanvas.setPointerCapture(e.pointerId);
  const p = toWorld(e);
  ed.ptr = p;
  if (e.button === 1 || e.button === 2 || ed.keys.has('Space')) return startPan(e);
  if (e.button !== 0) return;
  if (e.altKey) return pick(p);
  const item = ed.item;
  if (ed.tool === 'select') {
    const hit = hitTest(p.x, p.y);
    select(hit);
    if (!hit) return startPan(e);
    const at = hit === 'spawn' ? ed.L.spawn : hit === 'ship' ? ed.L.ship : hit;
    ed.drag = { kind: 'move', hit, from: p, dx: at.x - p.x, dy: at.y - p.y, moved: false };
  } else if (ed.tool === 'paint') {
    if (item.type === 'terrain') {
      checkpoint();
      ed.drag = { kind: 'paint', last: p, stroke: [] };
      paintLine(p, p, ed.drag.stroke);
    } else if (item.type === 'spawn' || item.type === 'ship') {
      checkpoint();
      ed.drag = { kind: 'special', type: item.type };
      placeSpecial(item.type, p);
    } else {
      ed.drag = { kind: 'place', last: p, gap: Infinity, pushed: false };
      placeAt(p);
    }
  } else if (ed.tool === 'fill') {
    if (item.type === 'terrain') fillAt(p);
    else notice('Fill paints ground: choose one under Ground', true);
  } else if (ed.tool === 'erase') {
    ed.drag = { kind: 'erase', pushed: false };
    eraseAt(p);
  }
}, true);

window.addEventListener('pointermove', (e) => {
  if (ed.mode !== 'edit') return;
  if (e.target !== screenCanvas && !ed.drag) {
    ed.ptr = null;
    return;
  }
  e.stopImmediatePropagation();
  const p = toWorld(e);
  ed.ptr = p;
  const d = ed.drag;
  if (!d) return;
  if (d.kind === 'pan') {
    ed.cx = d.cx - (e.clientX - d.sx) / ed.zoom;
    ed.cy = d.cy - (e.clientY - d.sy) / ed.zoom;
  } else if (d.kind === 'paint') {
    paintLine(d.last, p, d.stroke);
    d.last = p;
  } else if (d.kind === 'place') {
    if (Math.hypot(p.x - d.last.x, p.y - d.last.y) >= d.gap) placeAt(p);
  } else if (d.kind === 'erase') {
    eraseAt(p);
  } else if (d.kind === 'move') {
    moveSel(d, p);
  } else if (d.kind === 'special') {
    placeSpecial(d.type, p);
  }
}, true);

for (const type of ['pointerup', 'pointercancel']) {
  window.addEventListener(type, (e) => {
    if (ed.mode !== 'edit' || (e.target !== screenCanvas && !ed.drag)) return;
    e.stopImmediatePropagation();
    endDrag();
  }, true);
}

window.addEventListener('wheel', (e) => {
  if (ed.mode !== 'edit' || e.target !== screenCanvas) return;
  e.preventDefault();
  // pinching a trackpad, or a mouse wheel's big steps, zooms; two fingers sliding on a trackpad pan
  if (!e.ctrlKey && (e.deltaX || (e.deltaMode === 0 && Math.abs(e.deltaY) < 40))) {
    ed.cx += e.deltaX / ed.zoom;
    ed.cy += e.deltaY / ed.zoom;
    return;
  }
  ed.wheel += e.deltaMode ? e.deltaY * 40 : e.deltaY;
  if (Math.abs(ed.wheel) < 40) return;
  zoomBy(ed.wheel < 0 ? 1 : -1, e.clientX, e.clientY);
  ed.wheel = 0;
}, { passive: false, capture: true });

screenCanvas.addEventListener('contextmenu', (e) => {
  if (ed.mode === 'edit') e.preventDefault();
});

window.addEventListener('resize', fitBuffer);
window.addEventListener('pagehide', () => {
  if (ed.saveT > 0) saveLevel();
});

// ---------- off we go ----------

ed.L = loadLevel();
applyLevel(ed.L, false);
fitBuffer();
standAtSpawn();
if (ed.L.spawn) Object.assign(ed, { cx: ed.L.spawn.x, cy: ed.L.spawn.y });
clock = 0.4;
renderClock();
document.body.classList.add('editing');
buildUi();
notice('Welcome to the level editor: press H for help, ` to play');
