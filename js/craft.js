// Crafting: villagers make tools when asked, and tools let you gather materials.

const ITEMS = {
  backpack: { name: 'Backpack', worn: true },
  map: { name: 'Map', worn: true },
  axe: { name: 'Axe' },
  wood: { name: 'Wood', stack: true },
  apple: { name: 'Apple', stack: true },
  pear: { name: 'Pear', stack: true },
  banana: { name: 'Banana', stack: true },
  pineapple: { name: 'Pineapple', stack: true },
  berries: { name: 'Berries', stack: true },
  coconut: { name: 'Coconut', stack: true },
  stone: { name: 'Stone', stack: true, plural: 'stones' },
  wool: { name: 'Wool', stack: true },
  hammer: { name: 'Hammer' },
  bow: { name: 'Bow' },
  sword: { name: 'Sword' },
  shield: { name: 'Shield' },
  spear: { name: 'Spear' },
  rod: { name: 'Fishing rod' },
  fish: { name: 'Fish', stack: true },
  pickaxe: { name: 'Pickaxe' },
  iron: { name: 'Iron', stack: true },
};
const FOODS = ['apple', 'pear', 'banana', 'pineapple'];

// `words` is what the player has to mention in chat; the maker forges it at the anvil from `needs`.
const RECIPES = [
  {
    item: 'axe', maker: 'smith', words: /\b(axes?|hatchet)\b/, time: 1.8,
    start: 'An axe? Give me a moment...',
    done: 'There you go! Mind the edge, {lad}.',
  },
  {
    item: 'hammer', maker: 'smith', words: /\b(hammers?|mallet)\b/, time: 1.8, needs: { wood: 1, stone: 1 },
    done: 'One hammer. Try not to hit your thumb.',
  },
  {
    item: 'bow', maker: 'smith', words: /\bbows?\b/, time: 2, needs: { wood: 3 },
    done: 'A fine bow! The archer will be jealous.',
  },
  {
    item: 'pickaxe', maker: 'smith', words: /\b(pick ?axes?|mattocks?)\b/, time: 2.2, needs: { wood: 2, iron: 1 },
    done: 'A good pickaxe. Ore and boulders won\'t stand a chance.',
  },
  {
    item: 'spear', maker: 'smith', words: /\bspears?\b/, time: 2, needs: { wood: 2, iron: 1 },
    done: 'Long and sharp. Point it away from me, {lad}.',
  },
  {
    item: 'shield', maker: 'smith', words: /\bshields?\b/, time: 2.2, needs: { wood: 3, iron: 1 },
    done: 'A proper Viking shield, iron-rimmed. Red as a sunset.',
  },
  {
    item: 'sword', maker: 'smith', words: /\b(swords?|blades?)\b/, time: 2.6, needs: { wood: 1, iron: 2 },
    done: 'Finest blade this side of the sea. Use it well, {lad}.',
  },
];

const IRON_HINT = 'Iron comes from the ore on the volcano isle, north of here. Crack it with a hammer.';

const bag = {};
const has = (item) => (bag[item] || 0) > 0;
const recipeFor = (text) => RECIPES.find((r) => r.words.test(text.toLowerCase()));
const held = () => (syncSlots(), slots.filter(Boolean));
const primary = () => (syncSlots(), slots[activeSlot]);
const bagFull = (item) => !has(item) && held().length >= SLOTS;

// With no room in the pack the item lands at the player's feet instead.
function give(item, n = 1) {
  if (bagFull(item)) {
    for (let i = 0; i < n; i++) spawnDrop(item, player.x + (i - (n - 1) / 2) * 7, player.y + 3, 0, 8, 40);
    return;
  }
  bag[item] = (bag[item] || 0) + n;
  renderInventory(item);
}

const listNeeds = (needs) => Object.entries(needs).map(([id, n]) => `${n} ${(n > 1 && ITEMS[id].plural) || ITEMS[id].name.toLowerCase()}`).join(' and ');

// ---------- inventory panel ----------

const invEl = document.getElementById('inventory');
const iconUrls = {};

const SLOTS = 6;
const slots = Array(SLOTS).fill(null);
// The highlighted slot, picked with 1-6: F uses it and X drops it. -1 while the bag is empty.
let activeSlot = -1;

// Used-up items leave their slot; new ones take the first free one.
function syncSlots() {
  for (let i = 0; i < slots.length; i++) if (slots[i] && !has(slots[i])) slots[i] = null;
  for (const id of Object.keys(ITEMS)) {
    if (!has(id) || ITEMS[id].worn || slots.includes(id)) continue;
    const i = slots.indexOf(null);
    if (i >= 0) slots[i] = id;
    else slots.push(id);
  }
  // the highlight only rests on a slot with something in it
  if (!slots[activeSlot]) activeSlot = slots.findIndex((id, i) => id && i < SLOTS);
}

function swapSlots(a, b) {
  if (a === b || !has('backpack') || !slots[a] && !slots[b]) return;
  [slots[a], slots[b]] = [slots[b], slots[a]];
  if (activeSlot === a) activeSlot = b;
  else if (activeSlot === b) activeSlot = a;
  renderInventory(slots[b]);
  Sfx.drop();
}

function selectSlot(i) {
  if (i === activeSlot || !has('backpack') || !slots[i]) return;
  activeSlot = i;
  player.fishing = null;
  renderInventory();
  Sfx.drop();
}

function dropActive() {
  if (slots[activeSlot]) dropItem(slots[activeSlot]);
}

// The bar only appears once there's a backpack to keep things in.
function renderInventory(changed) {
  invEl.hidden = !has('backpack');
  syncSlots();
  invEl.replaceChildren(...Array.from({ length: SLOTS }, (_, i) => {
    const li = document.createElement('li');
    const id = slots[i];
    const on = i === activeSlot;
    const key = document.createElement('b');
    key.textContent = i + 1;
    key.setAttribute('aria-hidden', 'true');
    li.append(key);
    if (on) li.classList.add('primary');
    if (!id) {
      li.classList.add('empty');
      li.setAttribute('aria-label', `Slot ${i + 1}, empty${on ? ', selected' : ''}`);
      return li;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.draggable = true;
    btn.dataset.item = id;
    btn.setAttribute('aria-label', `Slot ${i + 1}${on ? ', selected, used with F' : ''}. Drop ${ITEMS[id].name}${ITEMS[id].stack ? ` (${bag[id]})` : ''}`);
    const img = document.createElement('img');
    img.src = iconUrls[id] ||= SPR.icon[id].toDataURL();
    img.alt = '';
    img.style.width = `${SPR.icon[id].width * 3}px`;
    btn.append(img);
    if (ITEMS[id].stack) {
      const count = document.createElement('span');
      count.textContent = bag[id];
      btn.append(count);
    }
    li.append(btn);
    if (id === changed) li.classList.add('bump');
    return li;
  }));
}
renderInventory();

invEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) dropItem(btn.dataset.item);
});

// Drag an item onto another slot to swap them.
let dragFrom = -1;
const slotIndex = (el) => [...invEl.children].indexOf(el && el.closest('li'));
invEl.addEventListener('dragstart', (e) => {
  dragFrom = slotIndex(e.target);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', slots[dragFrom] || '');
});
invEl.addEventListener('dragover', (e) => {
  if (dragFrom < 0 || slotIndex(e.target) < 0) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});
invEl.addEventListener('drop', (e) => {
  e.preventDefault();
  const to = slotIndex(e.target);
  if (dragFrom >= 0 && to >= 0) swapSlots(dragFrom, to);
  dragFrom = -1;
});
invEl.addEventListener('dragend', () => { dragFrom = -1; });

// ---------- items on the ground ----------

const drops = [];
const REACH = 48;

// Starts `z` above the ground and tossed up at `vz`; lands at `y`.
function spawnDrop(item, x, y, vx = 0, z = 0, vz = 70, vy = 0) {
  drops.push({ item, x, y, z, vz, vx, vy, phase: Math.random() * 6 });
}

function dropItem(id) {
  if (!has(id) || !started || naming || flight || sail || hop || player.swimming) return;
  bag[id]--;
  renderInventory();
  const [vx, vy] = DIR_VEC[player.dir];
  const x = player.x + vx * 12;
  const y = player.y + vy * 10 + 2;
  const ok = !blocked(x - 3, y - 3, x + 3, y, player);
  spawnDrop(id, ok ? x : player.x, ok ? y : player.y + 3);
  Sfx.drop();
}

const canReach = (d) => !flight && !sail && !hop && Math.hypot(d.x - player.x, d.y - player.y) < REACH && sameSpace(d);

function nearDrop() {
  if (flight || sail || hop || player.swimming) return null;
  let best = null;
  let bd = 18;
  for (const d of drops) {
    const dist = Math.hypot(d.x - player.x, d.y - 2 - player.y);
    if (d.z <= 0 && dist < bd) { bd = dist; best = d; }
  }
  return best;
}

// The item whose sprite is under a world point, if the player can reach it.
function dropAt(wx, wy) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    const img = SPR.icon[d.item];
    const top = d.y - 2 - img.height - 3;
    if (Math.abs(wx - d.x) <= img.width / 2 + 3 && wy >= top && wy <= d.y + 3 && canReach(d)) return d;
  }
  return null;
}

function pickUp(d) {
  if (bagFull(d.item)) return;
  drops.splice(drops.indexOf(d), 1);
  give(d.item);
  faceToward(player, d.x - player.x, d.y - player.y);
  Sfx.pickup();
}

function updateDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.z <= 0 && d.vz <= 0) continue;
    d.vz -= 320 * dt;
    d.z += d.vz * dt;
    d.x += d.vx * dt;
    d.y += (d.vy || 0) * dt;
    if (d.z > 0) continue;
    d.z = 0;
    d.vz = 0;
    if (d.thrown && d.y < MAP_H * TILE && tileAt(Math.floor(d.x / TILE), Math.floor(d.y / TILE)) === T.WATER) {
      drops.splice(i, 1);
      seaSplash(d.x, d.y, 0.4);
      Sfx.splash(0.3 * earshot(d.x, d.y));
    }
  }
}

function drawDrop(d, cx, cy) {
  const img = SPR.icon[d.item];
  const bob = d.z > 0 || d.still ? 0 : Math.round(Math.sin(time * 3 + d.phase));
  drawShadow(Math.round(d.x) - cx, Math.round(d.y) - cy, img.width / 2 - 1, 1.5);
  ctx.drawImage(img, Math.round(d.x - img.width / 2) - cx, Math.round(d.y - 2 - img.height - d.z) - bob - cy);
}

// Floats an item icon up from a spot in the world.
function popIcon(item, x, y, delay = 0) {
  particles.push({ type: 'icon', layer: 'sky', img: SPR.icon[item], x, y, vx: 0, vy: -14, life: -delay, max: 1.2 });
}

// ---------- the smith at work ----------

let anvil = null;

// Returns true when `n` makes what was asked for and has answered.
function askCraft(n, text) {
  const r = recipeFor(text);
  if (!r || r.maker !== n.look.id) return false;
  const name = ITEMS[r.item].name.toLowerCase();
  const needs = Object.entries(r.needs || {});
  const short = Object.fromEntries(needs.filter(([id, k]) => (bag[id] || 0) < k).map(([id, k]) => [id, k - (bag[id] || 0)]));
  const shortN = Object.keys(short).length;
  // handing over every last piece of a material frees up its slot
  const freed = needs.filter(([id, k]) => bag[id] === k).length;
  if (n.craft) npcSay(n, 'Patience! I\'m working on it.');
  else if (has(r.item)) npcSay(n, `You've already got one of my ${name}s!`);
  else if (!has('backpack')) npcSay(n, 'And carry it how, {lad}? Fetch your backpack first.');
  else if (needs.length && !has('axe')) npcSay(n, `A ${name}? All in good time, {lad}. Start with an axe.`);
  else if (shortN) {
    const hint = short.iron && !has('iron') ? ` ${IRON_HINT}` : '';
    if (shortN === needs.length) npcSay(n, `A ${name}? Get me ${listNeeds(r.needs)} and I'll make you one.${hint}`);
    else npcSay(n, `A ${name} takes ${listNeeds(r.needs)}. You're still short ${listNeeds(short)}.${hint}`);
  }
  else if (held().length - freed >= SLOTS) npcSay(n, 'Your pack\'s full, {lad}. Drop something first.');
  else {
    for (const [id, k] of needs) bag[id] -= k;
    if (needs.length) renderInventory();
    npcSay(n, r.start || `${listNeeds(r.needs)}, that'll do. One ${name}, coming up!`);
    startCraft(n, r);
  }
  return true;
}

function startCraft(n, r) {
  n.craft = { r, t: 0, next: 0.6 };
  n.stuck = 0;
}

// The first time the player talks to the smith, he forges them an axe unasked.
function welcomeAxe(n) {
  if (n.look.id !== 'smith' || n.gaveAxe || n.craft || has('axe')) return false;
  if (!has('backpack')) {
    npcSay(n, 'A new face! I\'ve an axe for you, {lad}, but fetch your backpack first.');
    return true;
  }
  n.gaveAxe = true;
  npcSay(n, 'A new face! Every Viking needs an axe. Hold on, I\'ll make you one...');
  startCraft(n, RECIPES.find((r) => r.item === 'axe'));
  return true;
}

// Behind the anvil, facing the player, so the hammer and the bubble above don't cover each other.
const ANVIL_SPOT = 10;

// The first time the player talks to the fisherman, he hands over his spare rod.
function welcomeRod(n) {
  if (n.look.id !== 'fisher' || n.gaveRod || has('rod')) return false;
  if (!has('backpack')) {
    npcSay(n, 'Ahoy, a new face! I\'ve a spare rod for you, {lad}, but fetch your backpack first.');
    return true;
  }
  n.gaveRod = true;
  give('rod');
  popIcon('rod', player.x, player.y - 30);
  Sfx.reward();
  npcSay(n, 'Ahoy, a new face! Here, take my old fishing rod. Face the water and press F to cast.');
  return true;
}

const welcomeGift = (n) => welcomeAxe(n) || welcomeRod(n);

function updateCraft(n, dt) {
  const c = n.craft;
  const dx = anvil.x - n.x;
  const dy = anvil.y - ANVIL_SPOT - n.y;
  const d = Math.hypot(dx, dy);
  if (!c.atAnvil && d > 1.5 && n.stuck < 0.6) {
    const sp = 34 * dt;
    if (!move(n, (dx / d) * sp, (dy / d) * sp)) n.stuck += dt;
    faceToward(n, dx, dy);
    n.anim += dt * 6;
    n.frame = Math.floor(n.anim) % 4;
    return;
  }
  c.atAnvil = true;
  c.t += dt;
  n.dir = 'down';
  n.frame = 0;
  if (c.t >= c.next && c.t < c.r.time) {
    c.next += 0.45;
    Sfx.clang(earshot(anvil.x, anvil.y));
    for (let i = 0; i < 9; i++) {
      particles.push({
        type: 'spark', x: anvil.x + (Math.random() - 0.5) * 6, y: anvil.y - 9, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 50,
        c: '#fff0a0', c2: '#ff8a2a', life: 0, max: 0.3 + Math.random() * 0.3,
      });
    }
  }
  if (c.t < c.r.time) return;
  n.craft = null;
  give(c.r.item);
  npcSay(n, c.r.done);
  faceToward(n, player.x - n.x, player.y - n.y);
  popIcon(c.r.item, player.x, player.y - 30);
  Sfx.reward();
}

// ---------- the axe ----------

const TREES = {
  pine: { stump: 'stump', hits: 3, wood: 2 },
  pine2: { stump: 'stump', hits: 3, wood: 2 },
  oak: { stump: 'stumpOak', hits: 4, wood: 3 },
  palm: { stump: 'stumpPalm', hits: 3, wood: 1 },
  snowPine: { stump: 'stump', hits: 3, wood: 2 },
  jungleTree: { stump: 'stumpOak', hits: 4, wood: 3 },
};
// Everything else the axe can hit. `done` runs on the last hit; `hit` replaces the hit count.
const AXE = {
  tree: { prompt: 'Chop the tree' },
  stump: { prompt: 'Dig out the stump', hits: 2, chips: ['#d9b07a', PAL.woodDark], done: digStump },
  barrel: { prompt: 'Smash the barrel', hits: 2, chips: [PAL.wood, PAL.woodLight], done: smash },
  bush: { prompt: 'Cut the bush', hits: 2, leaves: 3, done: cutBush },
  fence: { prompt: 'Break the fence', hits: 2, chips: [PAL.wood, PAL.woodDark], done: breakFence },
  target: { prompt: 'Hit the target', chips: [PAL.cream, PAL.red], hit: hitTarget },
  ore: { prompt: 'Mine the iron ore', hits: 4, chips: ['#b0603a', '#56565e'], done: mineOre },
  boulder: { prompt: 'Break the boulder', hits: 3, chips: [PAL.rock, PAL.rockDark], done: breakBoulder },
};
const AXE_KINDS = {
  barrel: 'barrel', bushPink: 'bush', bushYellow: 'bush', fern: 'bush', fenceH: 'fence', fenceV: 'fence', target: 'target',
  ore: 'ore', boulder: 'boulder', boulderSnow: 'boulder', boulderDark: 'boulder',
};
const CHOP_TIME = 0.36;
const CHOP_HIT = 0.55;
const FALL_TIME = 0.7;
const REGROW_TIME = 240;
let hittables = [];

function initCrafting() {
  anvil = objects.find((o) => o.key === 'anvil');
  placeOre();
  hittables = objects.filter((o) => {
    if (TREES[o.key]) o.tree = o.key;
    else if (AXE_KINDS[o.key]) Object.assign(o, { axe: AXE_KINDS[o.key], base: o.key });
    return o.tree || o.axe;
  });
  scatterStones();
}

// Iron ore deposits on the volcano isle's black rock, clear of lava and of each other.
function placeOre() {
  const isl = ISLANDS.find((i) => i.id === 'volcano');
  if (!isl) return;
  const rng = mulberry32(57);
  const placed = [];
  const ash = (x, y) => tileAt(Math.floor(x), Math.floor(y)) === T.ASH;
  for (let i = 0; i < 3000 && placed.length < 8; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    const tx = isl.x + Math.cos(a) * r * isl.rx;
    const ty = isl.y + Math.sin(a) * r * isl.ry;
    if (![[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].every(([dx, dy]) => ash(tx + dx, ty + dy))) continue;
    const x = tx * TILE;
    const y = ty * TILE;
    if (placed.some((o) => Math.hypot(o.x - x, o.y - y) < 56)) continue;
    if (solidAt(x - 18, y - 14, x + 18, y + 10)) continue;
    const o = addAbs('ore', tx, ty);
    o.col = { off: false };
    placeCollider(o);
    colliders.push(o.col);
    placed.push(o);
  }
}

// Pebbles lying about on grass and sand, out of the way of anything solid.
function scatterStones() {
  const rng = mulberry32(31);
  let n = 0;
  for (let i = 0; i < 24000 && n < 140; i++) {
    const tx = Math.floor(rng() * MAP_W);
    const ty = Math.floor(rng() * MAP_H);
    const t = tileAt(tx, ty);
    if (t !== T.GRASS && t !== T.SAND) continue;
    const x = (tx + 0.25 + rng() * 0.5) * TILE;
    const y = (ty + 0.4 + rng() * 0.5) * TILE;
    if (solidAt(x - 8, y - 8, x + 8, y + 6)) continue;
    if (drops.some((d) => Math.hypot(d.x - x, d.y - y) < 64)) continue;
    drops.push({ item: 'stone', x, y, z: 0, vz: 0, vx: 0, phase: 0, still: true });
    n++;
  }
}

// What the axe would do to `o` right now, or null if there's nothing left to hit.
function kindOf(o) {
  if (o.hidden || o.fall || o.broken) return null;
  if (o.tree) return o.key === o.tree ? 'tree' : 'stump';
  return o.axe || null;
}

// What each swung tool can hit; the hammer mends broken fences instead.
const TOOL_HITS = {
  axe: ['tree', 'stump', 'barrel', 'bush', 'fence', 'target'],
  sword: ['bush', 'barrel', 'target'],
  spear: ['bush', 'target'],
  hammer: ['ore'],
  pickaxe: ['ore', 'boulder'],
};
const EDIBLE = { apple: '#c8322a', pear: '#b5c94a', banana: '#f2d24a', pineapple: '#e8b13a', berries: '#7a3fa0', coconut: '#f4efe2' };

const canUseTool = () => !flight && !sail && !hop && !carried && !player.swimming && grounded();
const mendable = (o) => o.broken && o.axe === 'fence' && !o.mendNow;

function nearTarget(tool = primary()) {
  const kinds = TOOL_HITS[tool];
  if (!kinds || !has(tool) || !canUseTool()) return null;
  let best = null;
  let bd = 9;
  for (const o of hittables) {
    if (!(kinds.includes(kindOf(o)) || (tool === 'hammer' && mendable(o)))) continue;
    const d = boxDist(o.col);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

// F: uses whatever is in the first slot. At sea it sends the young dragon fishing instead.
function useTool() {
  if (hop || fade || naming) return;
  if (sail) return sendFishing();
  const id = primary();
  if (!id || !canUseTool()) return;
  if (id === 'rod') return useRod();
  player.fishing = null;
  if (TOOL_HITS[id]) swing(id, nearTarget(id));
  else if (id === 'bow') shoot();
  else if (id === 'shield') raiseShield();
  else if (EDIBLE[id]) eat(id);
  else if (id === 'stone') throwStone();
}

function swing(tool, o) {
  if (player.chop) return;
  if (o) faceToward(player, o.x - player.x, o.y - 2 - player.y);
  player.chop = { o, t: 0, hit: false, tool };
  Sfx.swish();
}

function toolHit(c) {
  const o = c.o;
  if (!o || boxDist(o.col) >= 14) return;
  if (TOOL_HITS[c.tool].includes(kindOf(o))) return axeHit(o, c.tool);
  if (c.tool !== 'hammer' || !mendable(o)) return;
  Object.assign(o, { mendNow: true, regrowT: 0.01, shakeT: 0.25 });
  Sfx.thunk(earshot(o.x, o.y));
  chips(o, [PAL.wood, PAL.woodLight], 3, 6);
}

// The prompt for the primary tool, or a nudge to ready the right one.
function toolHint() {
  const f = player.fishing;
  if (f) return f.biting ? 'F  Reel it in!' : `${f.missT > 0 ? 'It got away!' : 'Waiting for a bite...'}   ·   F  Reel in`;
  if (!canUseTool()) return '';
  const id = primary();
  if (id === 'rod' && castSpot()) return 'F  Cast your line';
  const o = nearTarget(id);
  if (o) return `F  ${mendable(o) ? 'Mend the fence' : AXE[kindOf(o)].prompt}`;
  for (const t of ['axe', 'pickaxe', 'hammer', 'rod']) {
    if (t !== id && has(t) && (t === 'rod' ? castSpot() : nearTarget(t))) return `${slots.indexOf(t) + 1}  Ready the ${ITEMS[t].name.toLowerCase()}`;
  }
  return '';
}

// ---------- fishing ----------

// Where the bobber lands: the first water in front of the player.
function castSpot() {
  if (indoors || !canUseTool()) return null;
  const [vx, vy] = DIR_VEC[player.dir];
  const water = (x, y) => tileAt(Math.floor(x / TILE), Math.floor(y / TILE)) === T.WATER;
  for (let d = 12; d <= 44; d += 4) {
    const x = player.x + vx * d;
    const y = player.y - 3 + vy * d;
    if (!water(x, y)) continue;
    return water(x + vx * 8, y + vy * 8) ? [x + vx * 8, y + vy * 8] : [x, y];
  }
  return null;
}

function useRod() {
  const f = player.fishing;
  if (f) {
    player.fishing = null;
    if (!f.biting) return Sfx.swish(0.6);
    give('fish');
    popIcon('fish', player.x, player.y - 30);
    Sfx.splash(0.4);
    Sfx.reward();
    return;
  }
  const spot = castSpot();
  if (!spot) return;
  const [x, y] = spot;
  const school = seaLife.schools.some((s) => s.fish.length && Math.hypot(s.x - x, s.y - y) < 90);
  player.fishing = { x, y, px: player.x, py: player.y, t: 0, bite: (school ? 0.8 : 2) + Math.random() * (school ? 1.5 : 3), missT: 0 };
  Sfx.swish();
}

function updateFishing(dt) {
  const f = player.fishing;
  if (!f) return;
  if (Math.hypot(player.x - f.px, player.y - f.py) > 0.5 || primary() !== 'rod' || !canUseTool()) {
    player.fishing = null;
    return;
  }
  f.t += dt;
  f.missT -= dt;
  if (f.biting) {
    if ((f.biteT += dt) < 0.9) return;
    Object.assign(f, { biting: false, missT: 1.5, bite: f.t + 2 + Math.random() * 3 });
  } else if (f.t >= f.bite) {
    Object.assign(f, { biting: true, biteT: 0 });
    Sfx.splash(0.2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      particles.push({ type: 'wake', x: f.x, y: f.y, vx: Math.cos(a) * 14, vy: Math.sin(a) * 6, life: 0, max: 0.5 });
    }
  }
}

// ---------- bow, shield, food, stones ----------

const arrows = [];

function shoot() {
  if (player.bowT > 0) return;
  player.bowT = 0.45;
  const [vx, vy] = DIR_VEC[player.dir];
  arrows.push({ x: player.x + vx * 6, y: player.y + 1 + vy * 4, h: 9, vx: vx * 260, vy: vy * 260, t: 0, stuck: 0 });
  Sfx.twang();
}

function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    if (a.stuck) {
      if ((a.stuck += dt) > 1.6) arrows.splice(i, 1);
      continue;
    }
    a.t += dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.h -= 8 * dt;
    const target = hittables.find((o) => o.axe === 'target' && !o.hidden && a.x > o.col.x0 - 3 && a.x < o.col.x1 + 3 && a.y > o.col.y0 - 4 && a.y < o.col.y1 + 2);
    if (target) {
      target.shakeT = 0.25;
      hitTarget(target);
      a.stuck = 0.01;
    } else if (a.t > 0.6 || blocked(a.x - 1, a.y - 1, a.x + 1, a.y, player)) {
      if (!indoors && tileAt(Math.floor(a.x / TILE), Math.floor(a.y / TILE)) === T.WATER) {
        seaSplash(a.x, a.y, 0.3);
        arrows.splice(i, 1);
      } else {
        a.stuck = 0.01;
        Sfx.thunk(0.4 * earshot(a.x, a.y));
      }
    }
  }
}

function drawArrows(cx, cy) {
  for (const a of arrows) {
    if (!sameSpace(a)) continue;
    ctx.globalAlpha = a.stuck > 1.2 ? (1.6 - a.stuck) / 0.4 : 1;
    const dx = Math.sign(a.vx);
    const dy = Math.sign(a.vy);
    const x = Math.round(a.x) - cx;
    const y = Math.round(a.y - a.h) - cy;
    line(ctx, x - dx * 6, y - dy * 6, x, y, PAL.woodLight);
    px(ctx, x + dx, y + dy, '#c9ccd4');
    px(ctx, x - dx * 6 - dy, y - dy * 6 - dx, PAL.red);
    px(ctx, x - dx * 6 + dy, y - dy * 6 + dx, PAL.red);
  }
  ctx.globalAlpha = 1;
}

function raiseShield() {
  if (player.blockT > 0) return;
  player.blockT = 0.7;
  Sfx.thunk(0.4);
}

function eat(id) {
  bag[id]--;
  renderInventory();
  Sfx.munch();
  for (let i = 0; i < 6; i++) {
    particles.push({
      type: 'chip', x: player.x + (Math.random() - 0.5) * 4, y: player.y - 12, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30,
      c: EDIBLE[id], life: 0, max: 0.4 + Math.random() * 0.2,
    });
  }
}

function throwStone() {
  if (player.chop || player.bowT > 0) return;
  player.bowT = 0.3;
  bag.stone--;
  renderInventory();
  const [vx, vy] = DIR_VEC[player.dir];
  spawnDrop('stone', player.x + vx * 6, player.y + 2 + vy * 4, vx * 120, 12, 80, vy * 120);
  drops[drops.length - 1].thrown = true;
  Sfx.swish();
}

function updateTools(dt) {
  if (player.bowT > 0) player.bowT -= dt;
  if (player.blockT > 0) player.blockT -= dt;
  updateFishing(dt);
  updateArrows(dt);
}

function chips(o, colors, n, y = 5) {
  const side = Math.sign(player.x - o.x) || 1;
  for (let i = 0; i < n; i++) {
    particles.push({
      type: 'chip', x: o.x + side * 3, y: o.y - y, vx: side * (20 + Math.random() * 40), vy: -40 - Math.random() * 40,
      c: colors[i % colors.length], life: 0, max: 0.45 + Math.random() * 0.2,
    });
  }
}

function axeHit(o, tool = 'axe') {
  const kind = kindOf(o);
  if (kind === 'tree') return hitTree(o);
  const k = AXE[kind];
  o.shakeT = 0.25;
  if (kind === 'ore' || kind === 'boulder') Sfx.clang(0.5 * earshot(o.x, o.y));
  else Sfx.chop(0.8);
  if (k.chips) chips(o, k.chips, 4, 6);
  if (k.leaves) shedLeaves(o, k.leaves);
  if (k.hit) return k.hit(o);
  o.hp = (o.hp ?? k.hits) - (tool === 'pickaxe' ? 2 : 1);
  if (o.hp > 0) return;
  o.hp = undefined;
  k.done(o);
}

function hitTree(o) {
  const t = TREES[o.tree];
  o.hp = (o.hp ?? t.hits) - 1;
  o.shakeT = 0.25;
  Sfx.chop();
  chips(o, [PAL.woodLight, '#d9b07a'], 6);
  shedLeaves(o, 4);
  // the first knock on a palm shakes a coconut loose
  if (o.tree === 'palm' && !o.shaken) {
    o.shaken = true;
    const side = Math.sign(o.x - player.x) || 1;
    spawnDrop('coconut', o.x + side * 8, o.y + 3, side * 12, 30, 0);
  }
  if (o.hp <= 0) fell(o);
}

function shedLeaves(o, n) {
  const img = SPR[o.tree || o.key].img;
  for (let i = 0; i < n; i++) {
    particles.push({
      type: 'leaf', x: o.x + (Math.random() - 0.5) * img.width * 0.7, y: o.y - img.height * (0.45 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * 10, vy: 12 + Math.random() * 10, c: i % 2 ? PAL.leaf : PAL.leafLight, life: 0, max: 1 + Math.random() * 0.8,
    });
  }
}

// The trunk tips away from the player, leaving a stump that slowly grows back.
function fell(o) {
  o.fall = { t: 0, dir: player.x <= o.x ? 1 : -1, landed: false };
  o.key = TREES[o.tree].stump;
  o.hp = undefined;
  placeCollider(o);
  o.regrowT = REGROW_TIME;
  Sfx.timber();
}

function landTree(o) {
  const { dir } = o.fall;
  const len = SPR[o.tree].img.height;
  o.fall.landed = true;
  Sfx.crash(earshot(o.x, o.y));
  for (let i = 1; i <= 5; i++) dust(o.x + dir * len * (i / 5), o.y + 2);
  const n = TREES[o.tree].wood;
  give('wood', n);
  for (let i = 0; i < n; i++) popIcon('wood', o.x + dir * (12 + i * 10), o.y - 6, i * 0.12);
  setTimeout(() => Sfx.pickup(), 250);
}

// Grows back (or gets mended) only out of sight, and never on top of someone. `mendNow` skips the out of sight part.
function regrow(o) {
  const key = o.tree || o.base;
  const f = SPR[key].foot;
  const over = (e) => Math.abs(e.x - o.x) < f.w / 2 + 6 && e.y > o.y - f.h - 1 && e.y < o.y + 5;
  const seen = !o.mendNow && Math.hypot(player.x - o.x, player.y - o.y) < 260;
  if (seen || entities.some(over) || sheep.some(over) || (o.pen && sheepLoose())) {
    o.regrowT = o.mendNow ? 0.3 : 5;
    return;
  }
  Object.assign(o, { key, hidden: false, broken: false, shaken: false, mendNow: false });
  placeCollider(o);
  o.col.off = false;
}

// The deposit cracks open into rubble and a lump or two of iron; the vein fills back in over time.
function mineOre(o) {
  Object.assign(o, { key: 'oreSpent', broken: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.smash(earshot(o.x, o.y));
  chips(o, ['#b0603a', '#d88a4a', PAL.rockDark], 10, 6);
  const n = Math.random() < 0.4 ? 2 : 1;
  for (let i = 0; i < n; i++) spawnDrop('iron', o.x + (i - (n - 1) / 2) * 9, o.y + 4, (i - (n - 1) / 2) * 24, 6, 60);
}

function breakBoulder(o) {
  Object.assign(o, { hidden: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.smash(earshot(o.x, o.y));
  chips(o, [PAL.rock, PAL.rockLight, PAL.rockDark], 12, 8);
  for (let i = 0; i < 2; i++) spawnDrop('stone', o.x + (i - 0.5) * 10, o.y + 4, (i - 0.5) * 30, 6, 60);
}

// The barrel bursts into staves and hoops, and out rolls something to eat.
function smash(o) {
  o.hidden = true;
  o.col.off = true;
  o.regrowT = REGROW_TIME;
  Sfx.smash(earshot(o.x, o.y));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    particles.push({
      type: 'chip', x: o.x + Math.cos(a) * 4, y: o.y - 6, vx: Math.cos(a) * (30 + Math.random() * 40), vy: -50 - Math.random() * 60,
      c: i % 4 === 0 ? METAL_D : i % 2 ? PAL.wood : PAL.woodDark, life: 0, max: 0.55 + Math.random() * 0.3,
    });
  }
  dust(o.x, o.y);
  spawnDrop(FOODS[Math.floor(Math.random() * FOODS.length)], o.x, o.y + 3, (Math.random() - 0.5) * 30);
}

function digStump(o) {
  o.hidden = true;
  o.col.off = true;
  Sfx.thunk(earshot(o.x, o.y));
  dust(o.x, o.y);
  spawnDrop('wood', o.x, o.y + 3, (Math.random() - 0.5) * 20);
}

function cutBush(o) {
  Object.assign(o, { key: 'bushCut', broken: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.swish();
  shedLeaves(o, 6);
  const n = 1 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) spawnDrop('berries', o.x + (i ? 6 : -4), o.y + 3, (i ? 1 : -1) * 15);
}

function breakFence(o) {
  Object.assign(o, { key: o.base === 'fenceV' ? 'fenceVBroken' : 'fenceHBroken', broken: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.smash(0.6 * earshot(o.x, o.y));
  spawnDrop('wood', o.x, o.y + 4, (Math.random() - 0.5) * 20);
  const who = npcs.find((n) => n.look.id === (o.pen ? 'villager' : 'guard'));
  if (who && Math.hypot(who.x - o.x, who.y - o.y) < 320) {
    npcSay(who, o.pen ? 'Hey! My fence! The sheep will get out!' : 'Oi! That fence keeps the wolves out!');
    Object.assign(who, { emote: 'angry', emoteT: 1.8 });
  }
}

const ARCHER_QUIPS = ['Oi! Arrows, not axes!', 'That\'s my target!', 'You\'ll scare the bullseye off!', 'Ten points... for enthusiasm.'];
let quipT = 0;

function hitTarget(o) {
  Sfx.thunk(earshot(o.x, o.y));
  const archer = npcs.find((n) => n.look.id === 'archer');
  if (time < quipT || !archer || Math.hypot(archer.x - o.x, archer.y - o.y) > 200) return;
  quipT = time + 4;
  npcSay(archer, ARCHER_QUIPS[Math.floor(Math.random() * ARCHER_QUIPS.length)]);
}

function updateChopping(dt) {
  const c = player.chop;
  if (c) {
    c.t += dt;
    if (!c.hit && c.t >= CHOP_TIME * CHOP_HIT) {
      c.hit = true;
      toolHit(c);
    }
    if (c.t >= CHOP_TIME) player.chop = null;
  }
  updateTools(dt);
  for (const o of hittables) {
    if (o.fall) {
      o.fall.t += dt;
      if (!o.fall.landed && o.fall.t >= FALL_TIME) landTree(o);
      if (o.fall.t >= FALL_TIME + 0.5) o.fall = null;
    } else if (o.regrowT > 0 && (o.regrowT -= dt) <= 0) {
      regrow(o);
    }
  }
}

function drawFallingTree(o, cx, cy) {
  const f = o.fall;
  const s = SPR[o.tree];
  const u = Math.min(1, f.t / FALL_TIME);
  ctx.save();
  ctx.globalAlpha = f.landed ? Math.max(0, 1 - (f.t - FALL_TIME) / 0.5) : 1;
  ctx.translate(Math.round(o.x - cx), Math.round(o.y - cy) - 4);
  ctx.rotate(f.dir * (Math.PI / 2) * u * u);
  ctx.drawImage(s.pick ? s.pick(time, o) : s.img, -s.ox, -s.oy + 4);
  ctx.restore();
}

// Swing position: -1 is raised over the shoulder, 1 is buried in the trunk.
function swingPose(t) {
  const u = t / CHOP_TIME;
  if (u < 0.3) return 0.2 - (u / 0.3) * 1.2;
  if (u < CHOP_HIT) return -1 + ((u - 0.3) / (CHOP_HIT - 0.3)) * 2;
  return 1 - ((u - CHOP_HIT) / (1 - CHOP_HIT)) * 0.4;
}

// Whatever the player is doing with a tool, drawn behind them when they face away.
function drawHeldTool(e, x, top, behind) {
  if (behind !== (e.dir === 'up')) return;
  if (e.chop) drawSwing(e, x, top);
  if (e.fishing) drawFishingLine(e, x, top);
  if (e.bowT > 0 && !e.chop && !(e.blockT > 0) && has('bow') && primary() === 'bow') drawHeld(e, SPR.icon.bow, x, top);
  if (e.blockT > 0) drawHeld(e, SPR.icon.shield, x, top);
}

function drawHeld(e, img, x, top) {
  if (e.dir === 'right' || e.dir === 'left') {
    ctx.save();
    ctx.translate(x, top);
    ctx.scale(e.dir === 'left' ? -1 : 1, 1);
    ctx.drawImage(img, 1, 5);
    ctx.restore();
  } else {
    ctx.drawImage(img, x - Math.round(img.width / 2) + (e.dir === 'down' ? 2 : -2), top + 6);
  }
}

// Hand and rod tip, relative to the sprite's top centre.
const ROD = { right: [5, 13, 16, 1], left: [-5, 13, -16, 1], down: [4, 14, 8, 25], up: [4, 12, 7, -3] };

function drawFishingLine(e, x, top) {
  const f = e.fishing;
  const [hx, hy, tx, ty] = ROD[e.dir];
  line(ctx, x + hx, top + hy, x + tx, top + ty, PAL.woodDark, 2);
  line(ctx, x + hx, top + hy, x + tx, top + ty, PAL.woodLight);
  const u = Math.min(1, f.t / 0.3);
  const feet = top + 20;
  const bx = Math.round(x + tx + (f.x - e.x - tx) * u);
  const dip = f.biting ? 1 + Math.round(Math.sin(time * 30)) : Math.round(Math.sin(time * 4));
  const by = Math.round(top + ty + (feet + f.y - e.y - top - ty) * u - Math.sin(u * Math.PI) * 10) + (u === 1 ? dip : 0);
  const mx = (x + tx + bx) / 2;
  const my = (top + ty + by) / 2 + (u === 1 ? 4 : 0);
  ctx.globalAlpha = 0.8;
  line(ctx, x + tx, top + ty, Math.round(mx), Math.round(my), '#e8e0c8');
  line(ctx, Math.round(mx), Math.round(my), bx, by - 1, '#e8e0c8');
  ctx.globalAlpha = 1;
  rect(ctx, bx - 1, by - 2, 2, 1, '#c8322a');
  rect(ctx, bx - 1, by - 1, 2, 1, '#f6e7c1');
}

function drawSwing(e, x, top) {
  const s = swingPose(e.chop.t);
  const tool = e.chop.tool || 'axe';
  const img = ((e.dir === 'up' || e.dir === 'down') && SPR.heldFront[tool]) || SPR.held[tool];
  const side = e.dir === 'left' ? -1 : 1;
  ctx.save();
  if (e.dir === 'up' || e.dir === 'down') {
    ctx.translate(x + 4, top + 13);
    ctx.scale(1, e.dir === 'down' ? -s * 0.9 : 1 - (s + 1) * 0.3);
  } else {
    ctx.translate(x + side * 2, top + 13);
    ctx.scale(side, 1);
    ctx.rotate(0.375 + s * 1.375);
  }
  ctx.drawImage(img, -(img.hx ?? 4), 2 - img.height);
  ctx.restore();
}

// The smith faces the player across the anvil: the hammer rises over his shoulder and drops on each clang.
function drawSmithHammer(e, x, top) {
  const c = e.craft;
  if (!c || !c.atAnvil) return;
  const r = c.next - c.t;
  const a = Math.max(0, Math.min(1, r > 0.25 ? (0.45 - r) / 0.2 : r > 0.1 ? 1 : r / 0.1));
  const hx = x + 4;
  const hy = Math.round(top + 15 - a * 9);
  const kx = Math.round(x + 3 + a * 2);
  const ky = Math.round(hy + 4 - a * 10);
  rect(ctx, x + 4, top + 11, 1, 5, '#22160f');
  line(ctx, x + 4, top + 11, hx, hy, '#22160f', 3);
  line(ctx, x + 4, top + 11, hx, hy, shade(e.look.tunic, -0.25));
  line(ctx, hx, hy, kx, ky, PAL.woodDark, 2);
  rect(ctx, kx - 3, ky - 2, 7, 4, '#22160f');
  rect(ctx, kx - 2, ky - 1, 5, 2, '#8b8b94');
  rect(ctx, kx - 2, ky - 1, 5, 1, '#c9ccd4');
  rect(ctx, hx - 1, hy - 1, 2, 2, e.look.skin || PAL.skin);
}
