// Crafting: villagers make tools when asked, and tools let you gather materials.

// `worn` things are carried about the person and take no backpack slot. `tool`s are the ones F swings, shoots, casts
// or lights; they live on the hotbar and take no backpack slot either.
// `slots` are the extra backpack room a worn upgrade adds. An `outfit` is worn instead of the tunic, one at a time.
const ITEMS = {
  furCoat: { name: 'Thick fur coat', worn: true, outfit: true },
  fireJacket: { name: 'Fireproof jacket', worn: true, outfit: true },
  backpack: { name: 'Backpack', worn: true },
  toolBelt: { name: 'Tool belt', worn: true, slots: 2 },
  satchel: { name: 'Travel satchel', worn: true, slots: 2 },
  pouch: { name: 'Hunter\'s pouch', worn: true, slots: 2, plural: 'hunter\'s pouches' },
  map: { name: 'Map', worn: true },
  mapPiece: { name: 'Map piece', worn: true, stack: true, plural: 'map pieces' },
  runeNote: { name: 'Sailor\'s note', worn: true },
  axe: { get name() { return toolName('axe'); }, tool: true },
  wood: { name: 'Wood', stack: true },
  apple: { name: 'Apple', stack: true, plural: 'apples' },
  pear: { name: 'Pear', stack: true, plural: 'pears' },
  banana: { name: 'Banana', stack: true, plural: 'bananas' },
  pineapple: { name: 'Pineapple', stack: true, plural: 'pineapples' },
  berries: { name: 'Berries', stack: true },
  coconut: { name: 'Coconut', stack: true, plural: 'coconuts' },
  stone: { name: 'Stone', stack: true, plural: 'stones' },
  iceCube: { name: 'Ice Cube', stack: true, plural: 'ice cubes' },
  wool: { name: 'Wool', stack: true },
  bow: { get name() { return bowTier().name; }, tool: true },
  sword: { get name() { return toolName('sword'); }, tool: true },
  shield: { name: 'Shield', tool: true },
  spear: { get name() { return toolName('spear'); }, tool: true },
  rod: { name: 'Fishing rod', tool: true },
  fishLog: { name: 'Fish log', worn: true },
  fish: { name: 'Herring', stack: true },
  cod: { name: 'Cod', stack: true },
  trout: { name: 'Trout', stack: true },
  eel: { name: 'Fire eel', stack: true, plural: 'fire eels' },
  cavefish: { name: 'Cave fish', stack: true },
  goldenFish: { name: 'Golden fish', stack: true },
  mackerel: { name: 'Mackerel', stack: true },
  salmon: { name: 'Salmon', stack: true },
  anglerfish: { name: 'Anglerfish', stack: true },
  emberKoi: { name: 'Ember koi', stack: true },
  crystalFish: { name: 'Crystal fish', stack: true },
  featherLure: { name: 'Feather lure', stack: true, worn: true, plural: 'feather lures' },
  spinner: { name: 'Silver spinner', stack: true, worn: true, plural: 'silver spinners' },
  glowLure: { name: 'Glow lure', stack: true, worn: true, plural: 'glow lures' },
  goldenLure: { name: 'Golden lure', stack: true, worn: true, plural: 'golden lures' },
  pickaxe: { get name() { return toolName('pickaxe'); }, tool: true },
  iron: { name: 'Iron', stack: true },
  gold: { name: 'Gold nugget', stack: true, plural: 'gold nuggets' },
  ruby: { name: 'Ruby', stack: true, plural: 'rubies' },
  emerald: { name: 'Emerald', stack: true, plural: 'emeralds' },
  goblet: { name: 'Golden goblet', stack: true, plural: 'golden goblets' },
  crown: { name: 'Golden crown', stack: true, plural: 'golden crowns' },
  string: { name: 'String', stack: true, plural: 'lengths of string' },
  feather: { name: 'Feather', stack: true, plural: 'feathers' },
  arrow: { name: 'Arrow', stack: true, plural: 'arrows', worn: true },
  torch: { name: 'Torch', stack: true, plural: 'torches', tool: true },
  saddle: { name: 'Saddle', stack: true, plural: 'saddles' },
  mushroom: { name: 'Glowcap', stack: true, plural: 'glowcaps' },
  grilledFish: { name: 'Grilled fish', stack: true },
  bakedApple: { name: 'Baked apple', stack: true, plural: 'baked apples' },
  bread: { name: 'Rye bread', stack: true, plural: 'loaves of rye bread' },
  honeyCake: { name: 'Honey cake', stack: true, plural: 'honey cakes' },
  meat: { name: 'Raw meat', stack: true },
  roast: { name: 'Roast meat', stack: true },
  hide: { name: 'Hide', stack: true, plural: 'hides' },
  plank: { name: 'Plank', stack: true, plural: 'planks' },
  rope: { name: 'Rope', stack: true, plural: 'ropes' },
  ladder: { name: 'Ladder', stack: true, plural: 'ladders' },
  bridge: { name: 'Bridge kit', stack: true, plural: 'bridge kits' },
  campfire: { name: 'Campfire kit', stack: true, plural: 'campfire kits' },
  tent: { name: 'Camping tent', tool: true },
  grapple: { name: 'Grappling hook', tool: true },
};
// The hotbar's order. Arrows show as a count on the bow.
const TOOLS = ['axe', 'pickaxe', 'sword', 'spear', 'bow', 'rod', 'grapple', 'tent', 'shield', 'torch'];
const inPack = (id) => ITEMS[id] && !ITEMS[id].worn && !ITEMS[id].tool;
const FOODS = ['apple', 'pear', 'banana', 'pineapple'];
// Milestones the quest journal and the save keep track of; `rabbit`, `deer` and `boar` count the hunt.
const stats = { cooked: 0, ate: 0, ore: 0, gold: 0, sold: 0, bought: 0, fletched: 0, caves: 0, shots: 0, hunted: 0, rabbit: 0, deer: 0, boar: 0, sealion: 0, escaped: 0, roasted: 0, gored: 0, sandCave: 0, treasure: 0, tinkered: 0, hooked: 0, swept: 0, hawkTop: 0, hawkAcross: 0, summits: 0, bitten: 0, snake: 0, lava: 0, saddled: 0, laid: 0, flown: 0, chiefEgg: 0, hermitEgg: 0, jacketAsked: 0, pitched: 0 };

// `words` is what the player has to mention in chat; the maker forges it at the anvil from `needs`.
const RECIPES = [
  // the carpenter reworks the bow you have into the bow of `tier`
  {
    item: 'bow', tier: 1, maker: 'carpenter', words: /\b(long ?bows?|yew)\b/, time: 2.6, needs: { wood: 3, string: 1 },
    start: 'Three lengths of good wood and a fresh string. Hold still while I lengthen the limbs...',
    done: 'A longbow! Draw it right back and it\'ll carry half as far again.',
  },
  {
    item: 'bow', tier: 2, maker: 'carpenter', words: /\b(horn ?bows?|recurve\w*|composite)\b/, time: 3, needs: { hide: 2, iron: 1, string: 1 },
    start: 'Hide for the glue, iron to cap the grip, and a new string. Now to curve the tips back...',
    done: 'A horn bow. Nothing on the island shoots farther.',
  },
  {
    item: 'axe', maker: 'smith', words: /(?<!pick[ -]?)\b(axes?|hatchet)\b/, time: 1.8,
    start: 'An axe? Give me a moment...',
    done: 'There you go! Mind the edge, {lad}.',
  },
  {
    item: 'bow', maker: 'smith', words: /\bbows?\b/, time: 2, needs: { wood: 1, string: 1 },
    done: 'A fine bow! The archer will be jealous.',
  },
  {
    item: 'pickaxe', maker: 'smith', words: /\b(pick[ -]?axes?|mattocks?)\b/, time: 2.2, needs: { wood: 2, iron: 1 },
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
  {
    item: 'torch', maker: 'smith', words: /\btorch(es)?\b/, time: 1.6, needs: { wood: 1, wool: 1 },
    done: 'Wool soaked in pitch, wrapped round good wood. Press F to light it, and it\'ll burn six hours. Keep it out of the water!',
  },
  // the archer fletches at his post rather than at the anvil
  {
    item: 'arrow', count: 5, maker: 'archer', words: /\barrows?\b/, time: 2.2, needs: { wood: 1, stone: 1, feather: 1 },
    start: 'Wood for the shafts, stone for the heads, a feather to split for the fletching. Watch and learn...',
    done: 'Five arrows, straight and true. Don\'t waste them on the sheep.',
  },
  {
    item: 'toolBelt', maker: 'tanner', words: /\b(tool ?)?belts?\b/, time: 2.4, needs: { hide: 2 },
    start: 'Two hides for a tool belt? Let me cut you a good long strap...',
    done: 'There! Two good pouches on it, so you can carry two more things.',
  },
  {
    item: 'pouch', maker: 'tanner', words: /\b(pouch(es)?|bags?|satchels?)\b/, time: 2.4, needs: { hide: 2 },
    start: 'Two good hides! A bit of scraping, a bit of stitching...',
    done: 'A hunter\'s pouch. Strap it to your pack and you\'ve room for two more things.',
  },
  {
    item: 'furCoat', maker: 'seamstress', words: /\b(fur ?coats?|coats?|furs?|parkas?|cloaks?)\b/, time: 3, needs: { hide: 4, wool: 2 },
    start: 'A fur coat for the frozen isle? Four hides and a wool lining. Hold still while I measure you...',
    done: 'Warm as a bear! Put it on before you land on the ice. Open your bag (B) and wear it.',
  },
  {
    item: 'fireJacket', maker: 'seamstress', words: /\b(fire[ -]?proof|jackets?)\b/, time: 3, needs: { eel: 2, wool: 2 },
    start: 'Fire eel skin! Nothing burns it. Wool underneath so it doesn\'t scald you. Let me stitch...',
    done: 'There, fireproof from collar to hem. Wear it on the volcano and the heat won\'t touch you.',
  },
  {
    item: 'saddle', maker: 'tanner', words: /\bsaddles?\b/, time: 2.8, needs: { hide: 3 },
    start: 'A dragon saddle? Three hides, double stitched. Nobody falls off one of mine...',
    done: 'There! Stand by your dragon, open your bag and strap it on. Then up you get.',
  },
  {
    item: 'tent', maker: 'tanner', words: /\b(camping )?tents?\b/, time: 3, needs: { hide: 6, string: 4, wood: 2 },
    start: 'A camping tent? Six hides stitched with four strings, over two poles. This takes some sewing...',
    done: 'Your own tent! Choose it on the hotbar and press F to pitch it, and F again by it to pack it up. Nap in it by day and you wake at nightfall, by night and you wake at dawn.',
  },
];

// What the smith can make of a tool you have. Each tier adds a blow's worth to every swing and swings faster:
// fewer chops to fell a tree, fewer strikes to crack ore or bring down game.
const TOOL_TIERS = {
  axe: ['Axe', 'Steel axe', 'Runed axe'],
  pickaxe: ['Pickaxe', 'Steel pickaxe', 'Runed pickaxe'],
  sword: ['Sword', 'Steel sword', 'Runed sword'],
  spear: ['Spear', 'Steel spear', 'Runed spear'],
};
const TIER_NEEDS = [null, { iron: 2, wood: 1 }, { iron: 2, gold: 2 }];
const TIER_WORDS = { axe: '(?<!pick[ -]?)axes?', pickaxe: 'pick[ -]?axes?', sword: 'swords?', spear: 'spears?' };
const TIER_NOTE = { axe: 'Fells trees and game in fewer blows', pickaxe: 'Cracks ore and rock in fewer blows', sword: 'Strikes harder and faster', spear: 'Strikes harder and faster' };
const UPGRADE_ASK = /\b(upgrade\w*|improve\w*|better|stronger|sharper|steel|run(ed|ic))\b/;
const tierOf = (id) => (id === 'bow' ? upgrades.bow : upgrades.tools[id] || 0);
const maxTier = (id) => (id === 'bow' ? BOWS : TOOL_TIERS[id]).length - 1;
const tierName = (id, t) => (id === 'bow' ? BOWS[t] : { name: TOOL_TIERS[id][t] }).name;
const toolName = (id) => tierName(id, tierOf(id));
const nextTier = (id) => RECIPES.find((r) => r.item === id && r.tier === Math.min(maxTier(id), tierOf(id) + 1));
// How many blows' worth one swing does (the pickaxe hits rock twice as hard as the axe), and how long it takes.
const toolPower = (id) => (id === 'pickaxe' ? 2 : 1) + tierOf(id);
const swingTime = (id) => CHOP_TIME / (1 + 0.25 * tierOf(id));
RECIPES.unshift(...Object.entries(TOOL_TIERS).flatMap(([id, names]) => [1, 2].map((tier) => ({
  item: id, tier, maker: 'smith', words: new RegExp(`\\b${tier === 1 ? 'steel' : 'run(ed|ic)'} ${TIER_WORDS[id]}\\b`), time: 2.6, needs: TIER_NEEDS[tier],
  start: tier === 1 ? 'Heat it, fold it, hammer it, fold it again... that\'s how iron turns to steel.' : 'Gold for the runes, iron for the edge. The old smiths knew this trick...',
  done: tier === 1 ? `A ${names[1].toLowerCase()}! Twice the bite of the old one.` : `A ${names[2].toLowerCase()}. The runes keep that edge keen forever.`,
}))));

// Where the smith sends you for iron. A pickaxe needs iron to make, so the first lump comes from the dog's owner;
// if that's been spent on something else, the smith spares one scrap so the player can't get stuck.
function ironHint(n) {
  if (has('pickaxe')) return 'Iron ore lies on the volcano isle, north of here. Your pickaxe will crack it.';
  if (dog.state !== 'home') return 'Ore needs a pickaxe, and a pickaxe needs iron. That girl by the square lost her dog, and her papa mines iron. Help her out.';
  if (n.scrapGiven) return 'Iron ore lies on the volcano isle, north of here. Make yourself a pickaxe first, mind.';
  n.scrapGiven = true;
  give('iron');
  popIcon('iron', player.x, player.y - 30);
  Sfx.reward();
  return 'No pickaxe and no iron? Here, a scrap from my own pile. Make a pickaxe with it this time!';
}

const bag = {};
const has = (item) => (bag[item] || 0) > 0;
const recipeFor = (text) => RECIPES.find((r) => r.words.test(text.toLowerCase()));
// Asked about a bow, the carpenter offers the next one up from the bow you carry.
const BOW_ASK = /\b(bows?|upgrade\w*|improve\w*|better|farther|further)\b/;
const nextBow = () => nextTier('bow');
// What's in the backpack itself: one slot for each kind of thing, however many of it.
const held = () => Object.keys(ITEMS).filter((id) => has(id) && inPack(id));
const packSize = () => 8 + Object.keys(ITEMS).reduce((n, id) => n + (has(id) && ITEMS[id].slots || 0), 0);
const bagFull = (item) => inPack(item) && !has(item) && held().length >= packSize();

// With no room in the pack the item lands at the player's feet instead.
function give(item, n = 1) {
  if (bagFull(item)) {
    for (let i = 0; i < n; i++) {
      spawnDrop(item, player.x + (i - (n - 1) / 2) * 7, player.y + 3, 0, 8, 40);
      drops[drops.length - 1].left = true;
    }
    return;
  }
  bag[item] = (bag[item] || 0) + n;
  renderInventory(item);
}

const listNeeds = (needs) => Object.entries(needs).map(([id, n]) => `${n} ${(n > 1 && ITEMS[id].plural) || ITEMS[id].name.toLowerCase()}`).join(' and ');

// ---------- items on the ground ----------

const drops = [];
const REACH = 48;

// Starts `z` above the ground and tossed up at `vz`; lands at `y`.
function spawnDrop(item, x, y, vx = 0, z = 0, vz = 70, vy = 0) {
  drops.push({ item, x, y, z, vz, vx, vy, phase: Math.random() * 6 });
}

// The `i`th of several dropped at once lands a little to the side of the last, in a heap of three across.
function dropItem(id, i = 0) {
  if (!has(id) || !started || naming || flight || sail || hop || player.swimming) return;
  bag[id]--;
  renderInventory();
  const fire = id === 'wood' && fireNear(player.x, player.y);
  if (fire) return tossLog(fire);
  const [vx, vy] = DIR_VEC[player.dir];
  const jx = ((i % 3) - 1) * 4 * Math.sign(i);
  const jy = (Math.floor(i / 3) % 3 - 1) * 3 * Math.sign(i);
  const x = player.x + vx * 12 + jx;
  const y = player.y + vy * 10 + 2 + jy;
  const ok = !blocked(x - 3, y - 3, x + 3, y, player);
  spawnDrop(id, ok ? x : player.x + jx, ok ? y : player.y + 3 + jy);
  drops[drops.length - 1].left = true;
  if (!i) Sfx.drop();
}

function dropAll(id) {
  const n = bag[id] || 0;
  for (let i = 0; i < n; i++) dropItem(id, i);
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

// ---------- picking from a pile ----------

// What's on the ground within reach of Space, a kind at a time: [{ item, drops }].
const PILE_REACH = 26;
function pileNear() {
  if (flight || sail || hop || player.swimming) return [];
  const kinds = new Map();
  for (const d of drops) {
    if (d.z > 0 || !sameSpace(d) || Math.hypot(d.x - player.x, d.y - 2 - player.y) >= PILE_REACH) continue;
    if (!kinds.has(d.item)) kinds.set(d.item, []);
    kinds.get(d.item).push(d);
  }
  return [...kinds].map(([item, ds]) => ({ item, drops: ds }));
}

// Space by one kind of thing picks it all up; by a mix, a little menu asks which.
function takeFromPile() {
  const pile = pileNear();
  if (pile.length > 1) return openPile();
  if (pile.length) pickAll(pile[0]);
}

function pickAll({ item, drops: ds }) {
  ds.forEach((d, i) => { if (!bagFull(item)) pickUp(d, false, i > 0); });
}

const pileEl = document.getElementById('pile');
const pileList = document.getElementById('pile-list');
let pileOpen = false;

function openPile() {
  pileOpen = true;
  keys.clear();
  pileEl.hidden = false;
  renderPile();
  Sfx.drop();
}

function closePile() {
  pileOpen = false;
  pileEl.hidden = true;
  keys.clear();
}

function renderPile() {
  const pile = pileNear();
  if (!pile.length) return closePile();
  const was = document.activeElement?.dataset?.item;
  pileList.replaceChildren(...pile.map((p, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.item = p.item;
    const n = p.drops.length;
    const name = n > 1 ? `${n} ${ITEMS[p.item].plural || ITEMS[p.item].name.toLowerCase()}` : ITEMS[p.item].name;
    const full = bagFull(p.item);
    b.disabled = full;
    const key = Object.assign(document.createElement('b'), { textContent: i + 1 });
    key.setAttribute('aria-hidden', 'true');
    b.append(key, iconImg(p.item, 2), Object.assign(document.createElement('span'), { textContent: full ? `${name} (bag full)` : name }));
    b.setAttribute('aria-label', `Pick up ${name}${full ? ', backpack full' : ''}`);
    li.append(b);
    return li;
  }));
  const btns = [...pileList.querySelectorAll('button:not(:disabled)')];
  (btns.find((b) => b.dataset.item === was) || btns[0] || pileList.querySelector('button')).focus();
}

function takePileItem(item) {
  const p = pileNear().find((q) => q.item === item);
  if (p) pickAll(p);
  renderPile();
}

pileList.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) takePileItem(b.dataset.item);
});
// Registered before the game's own keys, so while the menu is open they never reach it.
window.addEventListener('keydown', (e) => {
  if (!pileOpen) return;
  e.stopImmediatePropagation();
  const btns = [...pileList.querySelectorAll('button')];
  const i = btns.indexOf(document.activeElement);
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Tab: e.shiftKey ? -1 : 1 }[e.code];
  if (e.code === 'Escape') {
    e.preventDefault();
    closePile();
  } else if (/^Digit[1-9]$/.test(e.code) && btns[+e.code[5] - 1]) {
    e.preventDefault();
    btns[+e.code[5] - 1].click();
  } else if (step) {
    e.preventDefault();
    btns[(i + step + btns.length) % btns.length]?.focus();
  }
});

function pickUp(d, auto = false, quiet = false) {
  if (bagFull(d.item)) return;
  drops.splice(drops.indexOf(d), 1);
  give(d.item);
  if (!auto) faceToward(player, d.x - player.x, d.y - player.y);
  if (!quiet) Sfx.pickup();
  if (d.item === 'mapPiece') markEgg(d.mark);
  if (d.item === 'runeNote') {
    toast('SAILOR\'S NOTE', 'Read it again any time from your bag (B)');
    toggleNote(true);
  }
}

// With auto pick up on, anything the player walks over goes in the bag if there's room. Things they put down
// themselves (`left`) stay put until they've walked away from them, and so does a fish a dragon is making for.
const AUTO_REACH = 16;
let autoPick = localStorage.getItem('hw-autopick') === '1';

function autoPickUp() {
  if (!autoPick || !started || fade || flight || sail || hop || player.swimming) return;
  for (const d of [...drops]) {
    const dist = Math.hypot(d.x - player.x, d.y - 2 - player.y);
    if (d.left) {
      if (dist > AUTO_REACH * 2 || !sameSpace(d)) d.left = false;
      continue;
    }
    if (d.z > 0 || dist >= AUTO_REACH || !sameSpace(d) || bagFull(d.item) || dragons.some((b) => b.meal === d)) continue;
    pickUp(d, true);
  }
}

function updateDrops(dt) {
  autoPickUp();
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.z <= 0 && d.vz <= 0) continue;
    // a feather drifts down, rocking side to side
    if (d.float) d.vz = Math.max(d.vz - 120 * dt, -14);
    else d.vz -= 320 * dt;
    d.z += d.vz * dt;
    d.x += (d.vx + (d.float ? Math.sin(time * 4 + d.phase) * 16 : 0)) * dt;
    d.y += (d.vy || 0) * dt;
    if (d.z > 0) continue;
    d.z = 0;
    d.vz = 0;
    if (d.fuel) {
      drops.splice(i, 1);
      stoke(d.fuel);
    } else if (d.thrown && d.y < MAP_H * TILE && tileAt(Math.floor(d.x / TILE), Math.floor(d.y / TILE)) === T.WATER) {
      // a fast stone skips off the surface a few times, each hop lower and shorter, then sinks
      const sp = Math.hypot(d.vx, d.vy || 0);
      if (sp > 40 && (d.skips = (d.skips || 0) + 1) <= 4) {
        const k = 0.72 ** d.skips;
        Object.assign(d, { vz: 75 * k, vx: d.vx * 0.75, vy: (d.vy || 0) * 0.75 });
        skipRipple(d.x, d.y);
        Sfx.plip(earshot(d.x, d.y), d.skips);
      } else {
        drops.splice(i, 1);
        seaSplash(d.x, d.y, 0.4);
        Sfx.splash(0.3 * earshot(d.x, d.y));
      }
    }
  }
}

function skipRipple(x, y) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    particles.push({ type: 'wake', layer: 'water', x, y, vx: Math.cos(a) * 10, vy: Math.sin(a) * 4, life: 0, max: 0.7 });
  }
  for (let i = 0; i < 3; i++) {
    particles.push({ type: 'drop', x: x + (Math.random() - 0.5) * 4, y, vx: (Math.random() - 0.5) * 20, vy: -25 - Math.random() * 20, life: 0, max: 0.35 });
  }
}

function drawDrop(d, cx, cy) {
  const img = SPR.icon[d.item];
  drawShadow(Math.round(d.x) - cx, Math.round(d.y) - cy, img.width / 2 - 1, 1.5);
  ctx.drawImage(img, Math.round(d.x - img.width / 2) - cx, Math.round(d.y - 2 - img.height - d.z) - cy);
}

// Floats an item icon up from a spot in the world.
function popIcon(item, x, y, delay = 0) {
  particles.push({ type: 'icon', layer: 'sky', img: SPR.icon[item], x, y, vx: 0, vy: -14, life: -delay, max: 1.2 });
}

// ---------- the smith at work ----------

let anvil = null;

// Who to see for what the smith doesn't make (the archer and carpenter are sent for above).
const MADE_AT = {
  seamstress: 'That\'s the seamstress\'s work. Her house is on the north side of the square.',
  tanner: 'That\'s the tanner\'s work. He\'s on the west road, by the forge.',
};

// Returns true when `n` makes what was asked for and has answered.
function askCraft(n, text) {
  let r = recipeFor(text);
  if (n.look.id === 'carpenter' && (!r || (r.item === 'bow' && !r.tier)) && BOW_ASK.test(text.toLowerCase())) r = nextBow();
  if (n.look.id === 'smith' && r && TOOL_TIERS[r.item] && !r.tier && UPGRADE_ASK.test(text.toLowerCase())) r = nextTier(r.item);
  if (r && r.maker === 'archer' && n.look.id !== 'archer') {
    npcSay(n, 'Arrows? Ask the archer at the range. He fletches his own.');
    return true;
  }
  if (r && r.maker === 'carpenter' && n.look.id !== 'carpenter') {
    npcSay(n, 'A better bow? That\'s the carpenter\'s work. His shop\'s south-east of the square.');
    return true;
  }
  if (r && MADE_AT[r.maker] && r.maker !== n.look.id) {
    npcSay(n, `A ${ITEMS[r.item].name.toLowerCase()}? ${MADE_AT[r.maker]}`);
    return true;
  }
  if (!r || r.maker !== n.look.id) return false;
  const name = (r.tier ? tierName(r.item, r.tier) : ITEMS[r.item].name).toLowerCase();
  const needs = Object.entries(r.needs || {});
  const short = Object.fromEntries(needs.filter(([id, k]) => (bag[id] || 0) < k).map(([id, k]) => [id, k - (bag[id] || 0)]));
  const shortN = Object.keys(short).length;
  const what = r.count ? `${r.count} ${ITEMS[r.item].plural}` : `a ${name}`;
  // handing over every last piece of a material frees up its slot
  const freed = needs.filter(([id, k]) => bag[id] === k).length;
  if (n.craft) npcSay(n, 'Patience! I\'m working on it.');
  else if (r.tier && !has(r.item)) npcSay(n, r.item === 'bow' ? 'Bring me a bow to work on, {lad}. The smith makes one from 1 wood and 1 string.' : `Bring me ${TOOL_TIERS[r.item][0].toLowerCase() === 'axe' ? 'an' : 'a'} ${TOOL_TIERS[r.item][0].toLowerCase()} to work on first, {lad}.`);
  else if (r.tier && tierOf(r.item) >= r.tier) npcSay(n, tierOf(r.item) === maxTier(r.item) ? `That ${toolName(r.item).toLowerCase()} is as good as they get. Nothing more I can do for it!` : `That's a ${toolName(r.item).toLowerCase()} already. Want it a ${tierName(r.item, tierOf(r.item) + 1).toLowerCase()}? Ask me for one.`);
  else if (r.tier && tierOf(r.item) < r.tier - 1) npcSay(n, `One thing at a time, {lad}! A ${tierName(r.item, r.tier - 1).toLowerCase()} first. Bring me ${listNeeds(nextTier(r.item).needs)}.`);
  else if (has(r.item) && !ITEMS[r.item].stack && !r.tier) npcSay(n, `You've already got one of my ${ITEMS[r.item].plural || `${name}s`}!${r.item === 'bow' && upgrades.bow < BOWS.length - 1 ? ' The carpenter can make it shoot farther.' : ''}`);
  else if (!has('backpack')) npcSay(n, 'And carry it how, {lad}? Fetch your backpack first.');
  else if (r.item === 'arrow' && !has('bow')) npcSay(n, 'Arrows are no use without a bow. Get the smith to make you one first.');
  else if (needs.length && r.maker === 'smith' && !has('axe')) npcSay(n, `A ${name}? All in good time, {lad}. Start with an axe.`);
  else if (shortN) {
    let hint = short.iron && !has('iron') ? ` ${ironHint(n)}` : '';
    if (short.string && !has('string')) hint += ' String comes from the weaver. She spins it from wool.';
    if (short.wool && !has('wool')) hint += ' Wool? Give the sheep a pat, they shed a tuft now and then.';
    if (short.feather && !has('feather')) hint += ' Feathers? Chase the hens round the farmyard. Now and then one drops when they flap off.';
    if (short.stone && !has('stone')) hint += ' Stones lie about on the grass and the beaches.';
    if (short.wood && !has('wood')) hint += ' Wood? Take an axe to a tree. Press F facing one to chop.';
    if (short.hide && !has('hide')) hint += ' Deer and boar give hides. The south woods are full of them.';
    if (short.eel && !has('eel')) hint += ' Fire eels live in the hot sea round the fire mountain, and in the hot spring up the east stairs from the square.';
    if (shortN === needs.length) npcSay(n, `${what[0].toUpperCase()}${what.slice(1)}? Get me ${listNeeds(r.needs)} and I'll make you ${r.count ? 'some' : 'one'}.${hint}`);
    else npcSay(n, `${what[0].toUpperCase()}${what.slice(1)} takes ${listNeeds(r.needs)}. You're still short ${listNeeds(short)}.${hint}`);
  }
  else if (inPack(r.item) && held().length - freed >= packSize() && !has(r.item)) npcSay(n, 'Your pack\'s full, {lad}. Drop something first.');
  else {
    for (const [id, k] of needs) bag[id] -= k;
    if (needs.length) renderInventory();
    npcSay(n, r.start || `${listNeeds(r.needs)}, that'll do. One ${name}, coming up!`);
    startCraft(n, r);
  }
  return true;
}

// The weaver spins whatever wool the player brings into string, one length per wool.
function spinWool(n) {
  if (n.look.id !== 'weaver' || !has('wool')) return false;
  const k = bag.wool;
  bag.wool = 0;
  give('string', k);
  npcSay(n, k === 1
    ? 'Ooh, lovely wool! A twist here, a twist there... One length of string for you. Just right for a bowstring!'
    : `Ooh, lovely wool! A twist here, a twist there... ${k} lengths of string for you. Just right for bowstrings!`);
  faceToward(n, player.x - n.x, player.y - n.y);
  popIcon('string', player.x, player.y - 30);
  Sfx.reward();
  return true;
}

function startCraft(n, r) {
  n.craft = { r, t: 0, next: 0.6 };
  n.stuck = 0;
}

// The first time the player talks to the smith, he hands over his old wooden axe.
// Saves from when he forged it instead can say `gaveAxe` with no axe in the bag, so he hands one over then too.
function welcomeAxe(n) {
  if (n.look.id !== 'smith' || n.craft || has('axe')) return false;
  if (!has('backpack')) {
    npcSay(n, 'A new face! I\'ve an axe for you, {lad}, but fetch your backpack first.');
    return true;
  }
  const first = !n.gaveAxe;
  n.gaveAxe = true;
  give('axe');
  faceToward(n, player.x - n.x, player.y - n.y);
  popIcon('axe', player.x, player.y - 30);
  Sfx.reward();
  npcSay(n, first
    ? 'A new face! Every Viking needs an axe. Here, take my old wooden one. Select it, face a tree and press F to chop.'
    : 'No axe, {lad}? Here, have my old wooden one. Try not to lose it this time.');
  return true;
}

// Behind the anvil, facing the player, so the hammer and the bubble above don't cover each other.
const ANVIL_SPOT = 10;

// The first time the player talks to the fisherman, he hands over his spare rod.
// The fish log comes with it; anglers from before the log existed get theirs on the next chat.
function welcomeRod(n) {
  if (n.look.id !== 'fisher') return false;
  if ((n.gaveRod || has('rod')) && !has('fishLog')) {
    giveFishLog();
    npcSay(n, 'Here, {lad}, take this fish log. Keep tally of every kind you land and I\'ll tell you what I know of each. Press L to read it.');
    return true;
  }
  if (n.gaveRod || has('rod')) return false;
  if (!has('backpack')) {
    npcSay(n, 'Ahoy, a new face! I\'ve a spare rod for you, {lad}, but fetch your backpack first.');
    return true;
  }
  n.gaveRod = true;
  give('rod');
  giveFishLog();
  popIcon('rod', player.x, player.y - 30);
  Sfx.reward();
  npcSay(n, 'Ahoy, a new face! Here, my old fishing rod, and a log to keep tally of your catch. Select it, face the water and press F to cast. L opens the log.');
  return true;
}

function setTier(id, tier) {
  if (id === 'bow') upgrades.bow = tier;
  else upgrades.tools[id] = tier;
  renderInventory(id);
  toast('UPGRADE', id === 'bow' ? `${bowTier().name}: shoots ${Math.round(bowTier().reach / BOWS[0].reach * 10) / 10}x as far` : `${toolName(id)}: ${TIER_NOTE[id].toLowerCase()}`);
}

const welcomeGift = (n) => welcomeAxe(n) || welcomeRod(n);

function updateCraft(n, dt) {
  const c = n.craft;
  const smith = c.r.maker === 'smith';
  const dx = anvil.x - n.x;
  const dy = anvil.y - ANVIL_SPOT - n.y;
  const d = Math.hypot(dx, dy);
  if (smith && !c.atAnvil && d > 1.5 && n.stuck < 0.6) {
    const sp = 34 * dt;
    if (!move(n, (dx / d) * sp, (dy / d) * sp)) n.stuck += dt;
    faceToward(n, dx, dy);
    n.anim += dt * 6;
    n.frame = Math.floor(n.anim) % 4;
    return;
  }
  c.atAnvil = smith;
  c.t += dt;
  n.dir = 'down';
  n.frame = 0;
  if (c.t >= c.next && c.t < c.r.time) {
    c.next += 0.45;
    if (smith) {
      Sfx.clang(earshot(anvil.x, anvil.y));
      for (let i = 0; i < 9; i++) {
        particles.push({
          type: 'spark', x: anvil.x + (Math.random() - 0.5) * 6, y: anvil.y - 9, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 50,
          c: '#fff0a0', c2: '#ff8a2a', life: 0, max: 0.3 + Math.random() * 0.3,
        });
      }
    } else {
      // whittling: shavings and a soft scrape
      Sfx.swish(0.4 * earshot(n.x, n.y));
      for (let i = 0; i < 3; i++) {
        particles.push({ type: 'chip', x: n.x + 4, y: n.y - 10, vx: 10 + Math.random() * 25, vy: -20 - Math.random() * 25, c: i % 2 ? '#d9b07a' : '#f4f1ea', life: 0, max: 0.4 });
      }
    }
  }
  if (c.t < c.r.time) return;
  n.craft = null;
  if (c.r.tier) setTier(c.r.item, c.r.tier);
  else give(c.r.item, c.r.count || 1);
  if (c.r.item === 'arrow') stats.fletched++;
  if (ITEMS[c.r.item].slots) toast('UPGRADE', `Backpack: ${packSize()} slots`);
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
  gold: { prompt: 'Mine the gold', hits: 4, chips: ['#f2c94a', '#3a4252'], done: mineGold },
  boulder: { prompt: 'Break the boulder', hits: 3, chips: [PAL.rock, PAL.rockDark], done: breakBoulder },
  crystal: { prompt: 'Break the ice crystal', hits: 4, chips: [PAL.ice, PAL.iceLight], done: breakCrystal },
  bramble: { prompt: 'Hack through the brambles', hits: 2, chips: [PAL.leafDark, '#5a3a22'], done: cutBramble },
  log: { prompt: 'Chop up the fallen log', hits: 4, chips: [PAL.woodLight, '#d9b07a'], done: chopLog },
};
const AXE_KINDS = {
  barrel: 'barrel', bushPink: 'bush', bushYellow: 'bush', fern: 'bush', fenceH: 'fence', fenceV: 'fence', target: 'target',
  ore: 'ore', goldOre: 'gold', boulder: 'boulder', boulderSnow: 'boulder', boulderDark: 'boulder',
  bramble: 'bramble', fallenLog: 'log', looseRock: 'boulder', iceCrystal: 'crystal',
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
    if (o.roostFence) return false;
    if (TREES[o.key]) o.tree = o.key;
    else if (AXE_KINDS[o.key]) Object.assign(o, { axe: AXE_KINDS[o.key], base: o.key });
    return o.tree || o.axe;
  });
  scatterStones();
}

// Iron ore deposits on the volcano isle's black rock, clear of lava and of each other.
let ores = [];
function placeOre() {
  const isl = ISLANDS.find((i) => i.id === 'volcano');
  if (!isl) return;
  const rng = mulberry32(57);
  const placed = ores;
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
    drops.push({ item: 'stone', x, y, z: 0, vz: 0, vx: 0, phase: 0 });
    n++;
  }
}

// What the axe would do to `o` right now, or null if there's nothing left to hit.
function kindOf(o) {
  if (o.hidden || o.fall || o.broken) return null;
  if (o.tree) return o.key === o.tree ? 'tree' : 'stump';
  return o.axe || null;
}

// Which tools can hit each kind of thing.
const TOOL_FOR = {
  tree: ['axe'], stump: ['axe'], fence: ['axe'], barrel: ['axe', 'sword'],
  bush: ['sword', 'spear', 'axe'], target: ['sword', 'spear', 'axe'],
  ore: ['pickaxe'], gold: ['pickaxe'], boulder: ['pickaxe'], crystal: ['pickaxe'],
  bramble: ['sword', 'axe', 'spear'], log: ['axe'],
};
// Chores win over game, so a rabbit underfoot doesn't get in the way of the woodcutting.
const CHORES = new Set(['tree', 'stump', 'fence', 'barrel', 'ore', 'gold', 'boulder', 'crystal', 'bramble', 'log']);
const SWUNG = new Set(Object.values(TOOL_FOR).flat());
const EDIBLE = { apple: '#c8322a', pear: '#b5c94a', banana: '#f2d24a', pineapple: '#e8b13a', berries: '#7a3fa0', coconut: '#f4efe2', grilledFish: '#c8823a', bakedApple: '#8a3a1a', bread: '#c08a4a', honeyCake: '#f2b01a', mushroom: '#5affd8', roast: '#9a4a1e' };

const canUseTool = () => !flight && !sail && !hop && !carrying() && !player.swimming && grounded() && !(player.downT > 0);
// The rod is the one tool that also works from the deck, once the ship has all but stopped.
const shipStill = () => Math.hypot(sail.vx, sail.vy) < 20;
const canCast = () => (sail ? !hop && !carrying() && shipStill() : canUseTool());
const mendable = (o) => o.broken && o.axe === 'fence' && !o.mendNow;

// The closest thing within arm's length that `tool` can deal with. A log patches a broken fence.
function nearTarget(tool) {
  if (!has(tool) || !canUseTool()) return null;
  let best = null;
  let bd = 9;
  for (const o of hittables) {
    if (!(tool === 'wood' ? mendable(o) : TOOL_FOR[kindOf(o)]?.includes(tool))) continue;
    const d = boxDist(o.col);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

// What a swing of `tool` would hit: the chore in reach, else game, else a bush or target.
function swingAt(tool) {
  const o = nearTarget(tool);
  if (o && CHORES.has(kindOf(o))) return { o };
  const prey = nearPrey(tool);
  return prey ? { prey } : { o };
}

function mendWithWood(o) {
  faceToward(player, o.x - player.x, o.y - 2 - player.y);
  bag.wood--;
  renderInventory();
  Object.assign(o, { mendNow: true, regrowT: 0.01, shakeT: 0.25 });
  Sfx.thunk(earshot(o.x, o.y));
  chips(o, [PAL.wood, PAL.woodLight], 3, 6);
}

const itemName = (id) => ITEMS[id].name.toLowerCase();

// F: uses the selected tool. At sea only the rod works.
function useTool() {
  if (hop || fade || naming || player.cook) return;
  const id = primary();
  if (sail) return id === 'rod' ? useRod() : undefined;
  if (!id || !canUseTool()) return;
  if (id === 'rod') return useRod();
  player.fishing = null;
  if (SWUNG.has(id)) {
    const { o, prey } = swingAt(id);
    swing(id, o, prey);
  } else if (id === 'bow') drawBow();
  else if (id === 'shield') raiseShield();
  else if (id === 'torch') {
    if (burnTarget()) lightBrambles(burnTarget());
    else if (meltTarget()) torchIce(meltTarget());
    else toggleTorch();
  } else if (id === 'grapple') throwGrapple();
  else if (id === 'tent') placeThing('tent');
}

// What could be done here with something from the pack. Only the bag's buttons do it; the prompt just says so.
function bagHint() {
  if (!canUseTool() || player.cook || player.chop) return '';
  const fire = fireNear(player.x, player.y);
  const raw = fire && Object.keys(COOKS).find(has);
  if (raw) return `${COOK_VERB[raw].toLowerCase()} the ${itemName(raw)}`;
  if (has('wood') && nearTarget('wood')) return 'mend the fence with a log';
  if (fire && has('wood')) return 'throw wood on the fire';
  const kit = ['ladder', 'bridge'].find((id) => has(id) && placeLabel(id));
  return kit ? placeLabel(kit).toLowerCase() : '';
}

function swing(tool, o, prey = null) {
  if (player.chop) return;
  const at = prey || o;
  if (at) faceToward(player, at.x - player.x, at.y - 2 - player.y);
  player.chop = { o, prey, t: 0, hit: false, tool, len: swingTime(tool) };
  Sfx.swish();
}

function toolHit(c) {
  if (c.prey) return strikePrey(c.prey, c.tool);
  const o = c.o;
  if (o && boxDist(o.col) < 14 && TOOL_FOR[kindOf(o)]?.includes(c.tool)) axeHit(o, c.tool);
}

// The prompt for what F does with the selection, or a nudge to pick the thing that would help here.
function toolHint() {
  if (player.cook) return `${COOK_VERB[player.cook.id].replace(/e?$/, 'ing')} the ${itemName(player.cook.id)}...`;
  const id = primary();
  const f = player.fishing;
  if (f && f.fight) return id === 'rod' ? 'A big one!   ·   Tap F fast to reel it in!' : `${slotKey('rod')}  Ready the rod, quick!`;
  if (f && id === 'rod') return f.biting ? 'F  Reel it in!' : `${f.missT > 0 ? 'It got away!' : 'Waiting for a bite...'}${f.lure ? `   ·   ${ITEMS[f.lure].name} on` : ''}   ·   F  Reel in`;
  if (f) return f.biting ? `${slotKey('rod')}  Ready the rod to reel it in!` : 'Waiting for a bite...';
  if (player.windup) return castPower() < 1 ? 'Winding up...   ·   Let go of F to cast' : 'Full cast!   ·   Let go of F to cast';
  const lure = lureToPick() ? '   ·   Pick a lure' : lureOn() ? `   ·   ${ITEMS[lureOn()].name} ×${bag[lureOn()]}` : '';
  const readyRod = id === 'rod' ? `F  Cast your line   ·   Hold F to cast farther${lure}` : `${slotKey('rod')}  Ready the rod to fish`;
  const need = EXPOSE[exposedTo()]?.outfit;
  if (need && outfit !== need && has(need)) return `B  Put on your ${itemName(need)}`;
  if (sail) return has('rod') && castSpot() ? readyRod : '';
  if (!canUseTool()) return '';
  const build = buildHint(id);
  if (build) return build;
  if (id === 'torch') return flame.out ? `F  Put the torch out   ·   ${torchHours()}h of burn left` : `F  Light the torch${flame.left > 0 ? ` (${torchHours()}h of burn left)` : ''}`;
  if (SWUNG.has(id)) {
    const { o, prey } = swingAt(id);
    if (prey) return `F  Strike the ${WILD[prey.kind].name}`;
    if (o) return `F  ${AXE[kindOf(o)].prompt}`;
  }
  if (id === 'rod' && castSpot()) return readyRod;
  if (id === 'bow' && player.nock) return drawPower() < 1 ? 'Drawing...   ·   Let go of F to shoot' : 'Full draw!   ·   Let go of F to shoot';
  if (id === 'bow' && has('arrow')) return 'Hold F to draw the bow, let go to shoot. The longer the draw, the farther it flies';
  const tool = ['axe', 'pickaxe'].find((t) => t !== id && nearTarget(t));
  if (tool) return `${slotKey(tool)}  Ready the ${itemName(tool)}`;
  if (has('rod') && castSpot()) return readyRod;
  const vein = !has('pickaxe') && hittables.find((o) => ['ore', 'gold', 'crystal'].includes(kindOf(o)) && boxDist(o.col) < 9);
  if (vein) return vein.axe === 'crystal' ? 'An ice crystal. A pickaxe would break it' : `${vein.axe === 'gold' ? 'Gold' : 'Iron ore'}. You need a pickaxe to mine it`;
  return obstacleHint();
}

// ---------- fishing ----------

// From the deck the bobber goes over the near gunwale, a little ahead of the rider; offsets are from the ship's waterline point.
const BOAT_CAST = { right: [-2, 14], left: [2, 14], down: [32, -8], up: [32, -30], ne: [16, 4], nw: [-16, 4], se: [44, 8], sw: [-44, 8] };

// Where the bobber lands: just into the first water in front of the player, and with a held cast (`power` 0-1)
// up to CAST_REACH farther, though never past where the water runs out.
const CAST_TIME = 1;
const CAST_REACH = 96;
function castSpot(power = 0) {
  if ((indoors && !inCave()) || !canCast()) return null;
  const water = (x, y) => isWet(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)));
  let x0;
  let y0;
  let vx;
  let vy;
  let near = 0;
  if (sail) {
    const [dx, dy] = BOAT_CAST[shipObj.facing];
    const n = Math.hypot(dx, dy);
    [x0, y0, vx, vy] = [shipObj.x, shipObj.y, dx / n, dy / n];
    near = n;
    if (!water(x0 + dx, y0 + dy)) return null;
  } else {
    [vx, vy] = DIR_VEC[player.dir];
    [x0, y0] = [player.x, player.y - 3];
    for (let d = 12; d <= 44 && !near; d += 4) if (water(x0 + vx * d, y0 + vy * d)) near = d;
    if (!near) return null;
    if (water(x0 + vx * (near + 8), y0 + vy * (near + 8))) near += 8;
  }
  let reach = near;
  for (let d = near + 4; d <= near + CAST_REACH * power; d += 4) {
    if (!water(x0 + vx * d, y0 + vy * d)) break;
    reach = d;
  }
  return [x0 + vx * reach, y0 + vy * reach];
}

// Off the shore the catch flips out of the water in an arc and lands on the ground beside the player: behind them,
// else to one side, wherever is dry and clear.
const FISH_FLIGHT = 0.7;
function landFish(id, f) {
  const [vx, vy] = DIR_VEC[player.dir];
  const spots = [[-vx * 12, -vy * 10 + 3], [vy * 14, vx * 10 + 3], [-vy * 14, -vx * 10 + 3], [0, 4]];
  const dry = (x, y) => !blocked(x - 3, y - 3, x + 3, y, player) && !isWet(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)));
  const [dx, dy] = spots.find(([dx, dy]) => dry(player.x + dx, player.y + dy)) || [0, 0];
  const x = player.x + dx;
  const y = player.y + dy;
  // launched at 110 px/s from 2 px up, it comes down after FISH_FLIGHT seconds
  spawnDrop(id, f.x, f.y, (x - f.x) / FISH_FLIGHT, 2, 110, (y - f.y) / FISH_FLIGHT);
}

// Pressing F with the rod winds up a cast and letting go throws it; with a line out it reels in. A big fish has
// to be tapped in before its time runs out.
function useRod() {
  const f = player.fishing;
  if (f && f.fight) return tugFight(f);
  if (f) {
    if (f.biting) return reelIn(f);
    player.fishing = null;
    return Sfx.swish(0.6);
  }
  if (!player.windup && castSpot()) {
    if (lureToPick()) return openLurePick();
    player.windup = { t: 0 };
  }
}

const castPower = () => (player.windup ? Math.min(1, player.windup.t / CAST_TIME) : 0);

// Letting go of F.
function releaseCast() {
  if (!player.windup) return;
  const power = castPower();
  player.windup = null;
  const spot = primary() === 'rod' && !player.fishing && castSpot(power);
  if (!spot) return;
  const [x, y] = spot;
  const lure = lureOn();
  player.fishing = { x, y, px: player.x, py: player.y, boat: !!sail, t: 0, bite: biteWait(x, y, lure), missT: 0, lure };
  Sfx.swish(0.6 + 0.4 * power);
}

function reelIn(f) {
  player.fishing = null;
  const [hx, hy] = headPos();
  const b = f.boat && hungryDragon();
  const id = catchFish(f, f.boat && !b);
  useLure(f.lure);
  if (b) {
    feedFromLine(b, id, f.x, f.y);
    popIcon(id, f.x, f.y - 8);
  } else if (f.boat) popIcon(id, hx, hy - 6);
  else landFish(id, f);
  Sfx.splash(0.4);
  Sfx.reward();
}

// The big ones fight: `taps` presses of F fill the bar, which slips back once you pause for FIGHT_REST seconds, and
// `time` is how long it stays on the hook.
const FIGHT = { cod: { taps: 8, time: 3.5 }, salmon: { taps: 9, time: 3.5 }, eel: { taps: 10, time: 3.5 }, anglerfish: { taps: 11, time: 4 }, emberKoi: { taps: 11, time: 4 }, goldenFish: { taps: 12, time: 4 } };
const FIGHT_SLIP = 0.25;
const FIGHT_REST = 0.35;

function tugFight(f) {
  f.fight.fill += 1 / FIGHT[f.fish].taps + 0.001;
  f.fight.tugT = 0.12;
  f.fight.restT = 0;
  seaSplash(f.x, f.y, 0.25);
  Sfx.plip(0.5, 1 + Math.floor(f.fight.fill * 4));
  if (f.fight.fill >= 1) reelIn(f);
}

function escapeFight(f) {
  Object.assign(f, { fight: null, fish: null, biting: false, missT: 1.5, bite: f.t + biteWait(f.x, f.y, f.lure) });
  seaSplash(f.x, f.y, 0.8);
  Sfx.splash(0.5);
  if (!stats.escaped++) muse('It got away! The big ones fight. I need to reel faster.');
}

// Seconds until the next nibble; a school nearby bites much sooner, and so does a lure.
function biteWait(x, y, lure) {
  const school = seaLife.schools.some((s) => s.fish.length && Math.hypot(s.x - x, s.y - y) < 90);
  return ((school ? 0.8 : 2) + Math.random() * (school ? 1.5 : 3)) * (LURES[lure]?.bite || 1);
}

function updateFishing(dt) {
  const f = player.fishing;
  if (!f) return;
  const moved = f.boat ? !sail || !shipStill() || Math.hypot(player.x - f.px, player.y - f.py) > 12 : Math.hypot(player.x - f.px, player.y - f.py) > 0.5;
  if (moved || !has('rod') || !canCast()) {
    player.fishing = null;
    return;
  }
  f.t += dt;
  f.missT -= dt;
  if (f.fight) {
    const g = f.fight;
    if ((g.restT += dt) > FIGHT_REST) g.fill = Math.max(0, g.fill - FIGHT_SLIP * dt);
    g.tugT -= dt;
    if ((g.left -= dt) <= 0) escapeFight(f);
    else if (Math.random() < dt * 6) seaSplash(f.x + (Math.random() - 0.5) * 8, f.y, 0.2);
    return;
  }
  if (f.biting) {
    if ((f.biteT += dt) < 0.9) return;
    Object.assign(f, { biting: false, fish: null, missT: 1.5, bite: f.t + biteWait(f.x, f.y, f.lure) });
  } else if (f.t >= f.bite) {
    const fish = pickFish(f);
    const big = FIGHT[fish];
    Object.assign(f, { biting: true, biteT: 0, fish, fight: big ? { fill: 0, left: big.time, tugT: 0, restT: 0 } : null });
    Sfx.splash(big ? 0.6 : 0.2);
    if (big) seaSplash(f.x, f.y, 0.7);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      particles.push({ type: 'wake', x: f.x, y: f.y, vx: Math.cos(a) * 14, vy: Math.sin(a) * 6, life: 0, max: 0.5 });
    }
  }
}

// ---------- bow, shield, food, stones ----------

const arrows = [];

// Holding F draws the bow; the longer the draw, up to DRAW_TIME, the farther the arrow flies before it comes down.
const DRAW_TIME = 1;
// What the carpenter can make of a bow: how far a full draw carries, and how fast the arrow flies.
const BOWS = [
  { name: 'Bow', reach: 200, speed: 260 },
  { name: 'Longbow', reach: 300, speed: 310 },
  { name: 'Horn bow', reach: 400, speed: 360 },
];
const bowTier = () => BOWS[upgrades.bow] || BOWS[0];
const ARROW_MIN = 40;
const drawPower = () => (player.nock ? Math.min(1, player.nock.t / DRAW_TIME) : 0);

function drawBow() {
  if (player.bowT > 0 || player.nock) return;
  if (!has('arrow')) {
    player.bowT = 0.8;
    muse('Out of arrows!');
    return;
  }
  player.nock = { t: 0 };
  Sfx.swish(0.3);
}

// Letting go of F.
function loose() {
  if (!player.nock) return;
  const power = drawPower();
  player.nock = null;
  if (primary() !== 'bow' || !has('arrow') || !canUseTool()) return;
  bag.arrow--;
  renderInventory();
  stats.shots++;
  player.bowT = 0.45;
  const [vx, vy] = DIR_VEC[player.dir];
  const { reach, speed } = bowTier();
  const life = (ARROW_MIN + (reach - ARROW_MIN) * power) / speed;
  arrows.push({ x: player.x + vx * 6, y: player.y + 1 + vy * 4, h: 9, vx: vx * speed, vy: vy * speed, t: 0, life, lob: 3 + 9 * power, stuck: 0, from: { x: player.x, y: player.y } });
  Sfx.twang();
}

function updateDraw(dt) {
  if (player.windup) {
    if (primary() !== 'rod' || !canCast() || player.fishing) player.windup = null;
    else player.windup.t += dt;
  }
  if (!player.nock) return;
  if (primary() !== 'bow' || !canUseTool()) player.nock = null;
  else player.nock.t += dt;
}

// A little bar over the player's head that fills as the bowstring comes back or the cast winds up. Fighting a big
// fish it's a wider green bar to tap full, with the time it stays on the hook running out in red beneath.
function drawDrawMeter(cx, cy) {
  const g = player.fishing && player.fishing.fight;
  if (!player.nock && !player.windup && !g) return;
  const [hx, hy] = headPos();
  if (g) {
    const x = Math.round(hx) - cx - 14;
    const y = Math.round(hy) - cy - 14;
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(x - 1, y - 1, 30, 7);
    ctx.fillStyle = g.tugT > 0 ? '#d8ffb0' : '#7cf05a';
    ctx.fillRect(x, y, Math.round(28 * g.fill), 3);
    ctx.fillStyle = '#e2423a';
    ctx.fillRect(x, y + 4, Math.round((28 * g.left) / FIGHT[player.fishing.fish].time), 1);
    return;
  }
  const p = player.nock ? drawPower() : castPower();
  const x = Math.round(hx) - cx - 8;
  const y = Math.round(hy) - cy - 12;
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(x - 1, y - 1, 18, 4);
  ctx.fillStyle = p >= 1 ? '#fff27a' : '#e1a03c';
  ctx.fillRect(x, y, Math.round(16 * p), 2);
}

// A spent arrow can be picked up again: always from a target, half the time from the ground, never from the sea.
// During one of the archer's challenges, hits stay `pinned` in the target and are never given back.
const PINNED_MAX = 10;
const TARGET_FACE = 17;
function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    if (a.pinned) continue;
    if (a.stuck) {
      if ((a.stuck += dt) > 1.6) {
        arrows.splice(i, 1);
        if (a.keep) spawnDrop('arrow', a.keep.x, a.keep.y);
      }
      continue;
    }
    a.t += dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    const u = Math.min(1, a.t / a.life);
    a.h = 9 * (1 - u) + a.lob * Math.sin(Math.PI * u);
    const prey = animalAt(a.x, a.y);
    if (prey) {
      arrows.splice(i, 1);
      if (Math.random() < 0.5) spawnDrop('arrow', prey.x, prey.y + 2);
      hurtAnimal(prey, ARROW_DAMAGE);
      continue;
    }
    const target = hittables.find((o) => o.axe === 'target' && !o.hidden && a.x > o.col.x0 - 3 && a.x < o.col.x1 + 3 && a.y > o.col.y0 - 4 && a.y < o.col.y1 + 2);
    if (target) {
      target.shakeT = 0.25;
      Sfx.thunk(earshot(target.x, target.y));
      a.stuck = 0.01;
      const r = 6 * Math.sqrt(Math.random());
      const ang = Math.random() * Math.PI * 2;
      a.x = target.x + Math.max(-6, Math.min(6, (a.x - target.x) * 0.5 + r * Math.cos(ang)));
      a.y = target.y + 1;
      a.h = TARGET_FACE + 1 + r * Math.sin(ang);
      if (archery.active) {
        a.pinned = target;
        const pinned = arrows.filter((p) => p.pinned === target);
        if (pinned.length > PINNED_MAX) arrows.splice(arrows.indexOf(pinned[0]), 1);
      } else a.keep = { x: target.x + (Math.random() - 0.5) * 8, y: target.y + 6 };
      arrowHit(target, a);
    } else if (a.t > a.life || blocked(a.x - 1, a.y - 1, a.x + 1, a.y, player)) {
      if ((!indoors || inCave()) && tileAt(Math.floor(a.x / TILE), Math.floor(a.y / TILE)) === T.WATER) {
        seaSplash(a.x, a.y, 0.3);
        arrows.splice(i, 1);
      } else {
        a.stuck = 0.01;
        if (Math.random() < 0.5) a.keep = { x: a.x, y: a.y + 2 };
        Sfx.thunk(0.4 * earshot(a.x, a.y));
      }
      arrowMiss(a);
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
  // a hot meal fills the stamina bar right up; a bite of anything else gives some of it back
  restStamina(MEALS[id] ? 1 : 0.4);
  for (let i = 0; i < 6; i++) {
    particles.push({
      type: 'chip', x: player.x + (Math.random() - 0.5) * 4, y: player.y - 12, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30,
      c: EDIBLE[id], life: 0, max: 0.4 + Math.random() * 0.2,
    });
  }
  if (id === 'mushroom') {
    player.glowT = GLOW_TIME;
    burst(player.x, player.y - 14, ['#5affd8', '#d8fff4', '#2fbfb0'], 12, 36);
    Sfx.reward();
    return;
  }
  if (!MEALS[id]) return;
  stats.ate++;
  player.fedT = Math.max(player.fedT || 0, MEALS[id]);
  burst(player.x, player.y - 14, ['#fff27a', '#ffffff', '#ffb050'], 12, 36);
  Sfx.reward();
}

// ---------- cooking ----------

// Raw food held over a fire turns into a hot meal; eating one puts a spring in your step for `MEALS` seconds.
const GRILLED = ['fish', 'mackerel', 'cod', 'trout', 'salmon', 'eel', 'cavefish', 'anglerfish', 'emberKoi', 'crystalFish'];
const COOKS = { ...Object.fromEntries(GRILLED.map((id) => [id, 'grilledFish'])), apple: 'bakedApple', meat: 'roast' };
const COOK_VERB = { ...Object.fromEntries(GRILLED.map((id) => [id, 'Grill'])), apple: 'Bake', meat: 'Roast' };
const MEALS = { grilledFish: 90, bakedApple: 45, roast: 150, bread: 60, honeyCake: 120 };
const COOK_TIME = 2.6;
const FED_SPEED = 1.3;
const fedBoost = () => (player.fedT > 0 ? FED_SPEED : 1);

function startCook(id) {
  if (player.cook || player.chop) return;
  const fire = fireNear(player.x, player.y);
  bag[id]--;
  renderInventory();
  player.cook = { id, fire, t: 0, px: player.x, py: player.y, sizzleT: 0 };
  faceToward(player, fire.x - player.x, fire.y - player.y);
  Sfx.swish(0.6);
}

function updateCooking(dt) {
  if (player.fedT > 0) {
    player.fedT -= dt;
    if (Math.random() < dt * 6 && !player.flying) {
      particles.push({ type: 'sparkle', x: player.x + (Math.random() - 0.5) * 12, y: player.y - 4 - Math.random() * 16, vx: 0, vy: -10, life: 0, max: 0.5 });
    }
  }
  const c = player.cook;
  if (!c) return;
  if (Math.hypot(player.x - c.px, player.y - c.py) > 2 || flight || sail || hop || player.swimming) {
    player.cook = null;
    give(c.id);
    return;
  }
  c.t += dt;
  if ((c.sizzleT -= dt) <= 0) {
    c.sizzleT = 0.45;
    Sfx.sizzle();
    const [x, y] = cookSpot(c);
    particles.push({ type: 'steam', x: x + (Math.random() - 0.5) * 4, y: y - 4, vx: (Math.random() - 0.5) * 4, vy: -14, life: 0, max: 1.1 });
  }
  if (c.t < COOK_TIME) return;
  player.cook = null;
  stats.cooked++;
  if (c.id === 'meat') stats.roasted++;
  const meal = COOKS[c.id];
  give(meal);
  popIcon(meal, player.x, player.y - 30);
  Sfx.reward();
}

// Where the food hangs: on the end of a stick, over the flames.
function cookSpot(c) {
  return [c.fire.x + (player.x - c.fire.x) * 0.25, c.fire.y - 14 - (c.fire.blaze || 0) * 4];
}

function drawCooking(cx, cy) {
  const c = player.cook;
  if (!c || !sameSpace(player)) return;
  const [fx, fy] = cookSpot(c);
  const x = Math.round(fx + Math.sin(time * 5) * 0.8) - cx;
  const y = Math.round(fy) - cy;
  line(ctx, Math.round(player.x) - cx, Math.round(player.y) - 12 - cy, x, y, PAL.woodDark);
  const img = SPR.icon[c.t > COOK_TIME * 0.6 ? COOKS[c.id] : c.id];
  ctx.drawImage(img, x - Math.round(img.width / 2), y - Math.round(img.height / 2));
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
  updateDraw(dt);
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
  if (kind === 'ore' || kind === 'gold' || kind === 'boulder' || kind === 'crystal') Sfx.clang(0.5 * earshot(o.x, o.y));
  else Sfx.chop(0.8);
  if (k.chips) chips(o, k.chips, 4, 6);
  if (k.leaves) shedLeaves(o, k.leaves);
  if (k.hit) return k.hit(o);
  o.hp = (o.hp ?? k.hits) - toolPower(tool);
  if (o.hp > 0) return;
  o.hp = undefined;
  k.done(o);
}

function hitTree(o) {
  const t = TREES[o.tree];
  o.hp = (o.hp ?? t.hits) - toolPower('axe');
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
  // the logs bounce off the fallen trunk and lie along it to be picked up; any that would land in water or a wall
  // drop just in front of the stump instead
  const n = TREES[o.tree].wood;
  for (let i = 0; i < n; i++) {
    let x = o.x + dir * (12 + i * 10);
    let y = o.y + 3 + (i % 2) * 3;
    if (blocked(x - 3, y - 3, x + 3, y, {}) || isWet(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)))) {
      x = o.x + (i - (n - 1) / 2) * 7;
      y = o.y + 9;
    }
    spawnDrop('wood', x, y, dir * 8, 4, 45 + i * 10);
  }
}

// Grows back (or gets mended) only out of sight, and never on top of someone. `mendNow` skips the out of sight part.
function regrow(o) {
  if ((o.site === 'roost' && roost.asked) || (o.site === 'nursery' && nursery.asked)) return;
  const key = o.tree || o.base;
  const f = SPR[key].foot;
  const over = (e) => Math.abs(e.x - o.x) < f.w / 2 + 6 && e.y > o.y - f.h - 1 && e.y < o.y + 5;
  const seen = !o.mendNow && Math.hypot(player.x - o.x, player.y - o.y) < 260;
  if (seen || entities.some(over) || sheep.some(over) || (o.pen && sheepLoose())) {
    o.regrowT = o.mendNow ? 0.3 : 5;
    return;
  }
  Object.assign(o, { key, hidden: false, broken: false, shaken: false, mendNow: false, charred: false });
  placeCollider(o);
  o.col.off = false;
}

// The deposit cracks open into rubble and a lump or two of iron; the vein fills back in over time.
function mineOre(o) {
  stats.ore++;
  Object.assign(o, { key: 'oreSpent', broken: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.smash(earshot(o.x, o.y));
  chips(o, ['#b0603a', '#d88a4a', PAL.rockDark], 10, 6);
  const n = Math.random() < 0.4 ? 2 : 1;
  for (let i = 0; i < n; i++) spawnDrop('iron', o.x + (i - (n - 1) / 2) * 9, o.y + 4, (i - (n - 1) / 2) * 24, 6, 60);
}

function mineGold(o) {
  stats.gold++;
  Object.assign(o, { key: 'goldOreSpent', broken: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.smash(earshot(o.x, o.y));
  chips(o, ['#f2c94a', '#fff0a0', '#3a4252'], 10, 6);
  const n = Math.random() < 0.3 ? 2 : 1;
  for (let i = 0; i < n; i++) spawnDrop('gold', o.x + (i - (n - 1) / 2) * 9, o.y + 4, (i - (n - 1) / 2) * 24, 6, 60);
}

function breakBoulder(o) {
  Object.assign(o, { hidden: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.smash(earshot(o.x, o.y));
  chips(o, [PAL.rock, PAL.rockLight, PAL.rockDark], 12, 8);
  for (let i = 0; i < 2; i++) spawnDrop('stone', o.x + (i - 0.5) * 10, o.y + 4, (i - 0.5) * 30, 6, 60);
}

// The crystal shatters into glittering shards, and a few ice cubes skitter out.
function breakCrystal(o) {
  Object.assign(o, { hidden: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.smash(earshot(o.x, o.y));
  chips(o, [PAL.ice, PAL.iceLight, PAL.iceDark, '#ffffff'], 14, 10);
  for (let i = 0; i < 3; i++) spawnDrop('iceCube', o.x + (i - 1) * 8, o.y + 4, (i - 1) * 26, 6, 60);
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

function cutBramble(o) {
  Object.assign(o, { key: 'brambleCut', broken: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.swish();
  chips(o, [PAL.leafDark, PAL.leaf, '#5a3a22'], 8, 6);
}

function chopLog(o) {
  Object.assign(o, { hidden: true, regrowT: REGROW_TIME });
  o.col.off = true;
  Sfx.crash(0.6 * earshot(o.x, o.y));
  for (let i = 0; i < 3; i++) dust(o.x, o.y - 6 - i * 12);
  for (let i = 0; i < 2; i++) spawnDrop('wood', o.x + (i - 0.5) * 12, o.y - 10 + i * 10, (i - 0.5) * 30, 6, 60);
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
    if (!c.hit && c.t >= c.len * CHOP_HIT) {
      c.hit = true;
      toolHit(c);
    }
    if (c.t >= c.len) player.chop = null;
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
function swingPose(t, len = CHOP_TIME) {
  const u = t / len;
  if (u < 0.3) return 0.2 - (u / 0.3) * 1.2;
  if (u < CHOP_HIT) return -1 + ((u - 0.3) / (CHOP_HIT - 0.3)) * 2;
  return 1 - ((u - CHOP_HIT) / (1 - CHOP_HIT)) * 0.4;
}

// Whatever the player is doing with a tool, drawn behind them when they face away.
function drawHeldTool(e, x, top, behind) {
  if (behind !== (e.dir === 'up')) return;
  if (e.chop) drawSwing(e, x, top);
  if (e.fishing) drawFishingLine(e, x, top);
  else if (e.windup) drawWindup(e, x, top);
  const bowUp = (e.bowT > 0 || e.nock) && has('bow');
  if (bowUp && !e.chop && !(e.blockT > 0)) drawHeld(e, SPR.icon.bow, x, top);
  if (e.blockT > 0) drawHeld(e, SPR.icon.shield, x, top);
  else if (e === player && torchLit() && !e.chop && !e.fishing && !bowUp) drawHeldTorch(e, x, top);
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

// The lit torch, gripped low on its stick and leaning forward, so its flame stays clear of the face.
const TORCH_TILT = 0.5;
function drawHeldTorch(e, x, top) {
  const img = SPR.held.torch[Math.floor(time * 7) % 2];
  const out = e.dir === 'left' || e.dir === 'up' ? -1 : 1;
  const side = e.dir === 'right' || e.dir === 'left';
  ctx.save();
  ctx.translate(x + out * (side ? 5 : 3), top + 15);
  ctx.rotate(out * TORCH_TILT);
  ctx.drawImage(img, -4, -10);
  ctx.restore();
}

// Hand and rod tip, relative to the sprite's top centre.
const ROD = { right: [5, 13, 16, 1], left: [-5, 13, -16, 1], down: [4, 14, 8, 25], up: [4, 12, 7, -3] };

// (rx, ry) is where the bobber floats on screen; by default measured from the angler's feet.
function drawFishingLine(e, x, top, rx = x + e.fishing.x - e.x, ry = top + 20 + e.fishing.y - e.y) {
  const f = e.fishing;
  const [hx, hy, tx, ty] = ROD[e.dir];
  line(ctx, x + hx, top + hy, x + tx, top + ty, PAL.woodDark, 2);
  line(ctx, x + hx, top + hy, x + tx, top + ty, PAL.woodLight);
  const u = Math.min(1, f.t / 0.3);
  const bx = Math.round(x + tx + (rx - x - tx) * u);
  const dip = f.fight ? 2 + Math.round(Math.sin(time * 45) * 2) : f.biting ? 1 + Math.round(Math.sin(time * 30)) : Math.round(Math.sin(time * 4));
  const by = Math.round(top + ty + (ry - top - ty) * u - Math.sin(u * Math.PI) * 10) + (u === 1 ? dip : 0);
  const mx = (x + tx + bx) / 2;
  const my = (top + ty + by) / 2 + (u === 1 ? 4 : 0);
  ctx.globalAlpha = 0.8;
  line(ctx, x + tx, top + ty, Math.round(mx), Math.round(my), '#e8e0c8');
  line(ctx, Math.round(mx), Math.round(my), bx, by - 1, '#e8e0c8');
  ctx.globalAlpha = 1;
  rect(ctx, bx - 1, by - 2, 2, 1, '#c8322a');
  rect(ctx, bx - 1, by - 1, 2, 1, '#f6e7c1');
}

// Winding up, the rod tips back over the shoulder, farther the longer F is held.
function drawWindup(e, x, top) {
  const [hx, hy, tx, ty] = ROD[e.dir];
  const p = castPower();
  const bx = Math.round(tx + (hx - (tx - hx) * 0.4 - tx) * p);
  const by = Math.round(ty + (hy - 16 - ty) * p);
  line(ctx, x + hx, top + hy, x + bx, top + by, PAL.woodDark, 2);
  line(ctx, x + hx, top + hy, x + bx, top + by, PAL.woodLight);
}

function drawSwing(e, x, top) {
  const s = swingPose(e.chop.t, e.chop.len);
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
