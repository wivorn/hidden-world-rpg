// The dragon roost on the hermit's isle. Once the player has a grown dragon the hermit asks for one: fell the stand
// of pines between his stakes, bring ROOST_WOOD wood and raise it there. Grown dragons told to stay by it land inside
// its fence and wander about in there. Once two or more have spent ROOST_DAYS days in there an egg turns up in the
// nest, and every one hatches a kind of dragon nobody has seen before, mixed at random from the kinds there are.

const ROOST_WOOD = 12;
const ROOST_DAYS = 3;
const ROOST_NEAR = 130;
// Perches in front of the roost and the nest between the front two, from its ground point.
const ROOST_SLOTS = [[-50, 34], [50, 34], [-26, 70], [26, 70]];
const ROOST_NEST = [0, 30];
// The fence's lines from the roost's ground point, in tiles, and how fast dragons amble about inside it.
const ROOST_PEN = { x: 6.2, top: -2.6, bottom: 5.6 };
const PEN_PACE = 14;
// `days` is how long two or more dragons have spent in the pen since the last egg; `lastDay` the game time last seen.
const roost = { asked: false, built: false, bred: [], days: 0, lastDay: null };
let roostObj = null;
let roostNest = null;
let siteTrees = [];
let stakes = [];
let roostFences = [];

function initRoost() {
  roostObj = objects.find((o) => o.key === 'roost');
  roostNest = objects.find((o) => o.roostNest);
  siteTrees = objects.filter((o) => o.site);
  stakes = objects.filter((o) => o.key === 'stake');
  roostFences = objects.filter((o) => o.roostFence);
  showRoost();
}

// The stakes go in when the hermit asks for the roost; the roost, its nest and the fences once it's built.
function showRoost() {
  for (const o of stakes) {
    o.hidden = !roost.asked;
    if (o.col) o.col.off = !roost.asked;
  }
  roostObj.hidden = !roost.built;
  roostObj.col.off = !roost.built;
  roostNest.hidden = !roost.built;
  for (const o of roostFences) {
    o.hidden = !roost.built;
    if (o.col) o.col.off = !roost.built;
  }
  if (!roost.built) return;
  for (const o of siteTrees) {
    Object.assign(o, { key: TREES[o.tree].stump, hidden: true, fall: null, regrowT: 0 });
    if (o.col) o.col.off = true;
  }
}

const hasGrown = () => dragons.some((d) => d.stage === GROWN);
const treesLeft = () => siteTrees.filter((o) => o.key === o.tree).length;
const roostCentre = () => ({ x: roostObj.x, y: roostObj.y + 44 });
const nearRoost = (x, y, r = ROOST_NEAR) => roost.built && Math.hypot(x - roostCentre().x, y - roostCentre().y) < r;

// On foot between the stakes, with the roost still to build.
function roostSite() {
  if (!roost.asked || roost.built || indoors || flight || sail || hop) return false;
  return inRoostSite(player.x / TILE, player.y / TILE);
}

function roostPrompt() {
  const left = treesLeft();
  const wood = bag.wood || 0;
  const text = left ? `Fell the trees between the stakes: ${left} still standing`
    : wood < ROOST_WOOD ? `Cleared! Bring ${ROOST_WOOD} wood to build the roost (you have ${wood})`
      : 'SPACE  Build the dragon roost';
  const tool = toolHint();
  return tool ? `${text}   ·   ${tool}` : text;
}

const roostBuildable = () => roostSite() && !treesLeft() && (bag.wood || 0) >= ROOST_WOOD && canUseTool();

function raiseRoost() {
  bag.wood -= ROOST_WOOD;
  renderInventory();
  Sfx.chop();
  fadeTo(() => {
    roost.built = true;
    showRoost();
    const c = roostCentre();
    Object.assign(player, { x: c.x, y: c.y + 46, dir: 'up' });
    for (let i = 0; i < 8; i++) dust(roostObj.x + (i - 3.5) * 14, roostObj.y + 4);
    Sfx.timber();
    setTimeout(() => Sfx.reward(), 400);
    toast('DRAGON ROOST', 'Bring your grown dragons here and tell them to stay');
    muse('Done! A roost fit for dragons. Now to bring some here and tell them to stay.');
  });
}

// ---------- roosting ----------

const roostSpot = (i) => ({ x: roostObj.x + ROOST_SLOTS[i][0], y: roostObj.y + ROOST_SLOTS[i][1] });

// The free perch a grown dragon told to stay here takes, or null when it's not by the roost or all are taken.
function roostSlotFor(d) {
  if (d.stage !== GROWN || !nearRoost(d.x, d.y, ROOST_NEAR + 60)) return null;
  const taken = new Set(dragons.filter((o) => o !== d && o.roost != null).map((o) => o.roost));
  const i = ROOST_SLOTS.findIndex((_, k) => !taken.has(k));
  return i < 0 ? null : i;
}

// The grown dragon following the player, if it could be left at the roost from here.
function roostLeave() {
  const d = follower;
  if (!d || d.stage !== GROWN || flight || sail || hop || indoors || !nearRoost(player.x, player.y)) return null;
  return roostSlotFor(d) === null ? null : d;
}

function leaveAtRoost(d) {
  setFollower(null);
  Object.assign(d, { emote: 'heart', emoteT: 1.8 });
  muse(`Stay here, ${d.name}. This is your roost now.`);
}

// ---------- the pen inside the fence ----------

function inRoostPen(x, y) {
  if (!roost.built) return false;
  const dx = x - roostObj.x;
  const dy = y - roostObj.y;
  return Math.abs(dx) < ROOST_PEN.x * TILE && dy > ROOST_PEN.top * TILE && dy < ROOST_PEN.bottom * TILE;
}

// Room for dragon `b` to stand at (x, y) inside the pen, not counting its own body.
function penFits(b, x, y) {
  const c = b.obj.col;
  const off = c.off;
  c.off = true;
  const ok = inRoostPen(x - 23, y) && inRoostPen(x + 23, y) && dragonFits(x, y);
  c.off = off;
  return ok;
}

// A free spot somewhere in the pen, near (x, y) if `near` is given.
function penSpot(b, near = null) {
  for (let i = 0; i < 24; i++) {
    const x = Math.round(near ? near.x + (Math.random() - 0.5) * 140 : roostObj.x + (Math.random() - 0.5) * 2 * (ROOST_PEN.x * TILE - 26));
    const y = Math.round(near ? near.y + (Math.random() - 0.5) * 80 : roostObj.y + 16 + Math.random() * (ROOST_PEN.bottom * TILE - 22));
    if (penFits(b, x, y)) return { x, y };
  }
  return null;
}

// Where a dragon told to stay flies in to land: its own perch if that's clear, else any free spot in the pen.
function roostLanding(b) {
  const own = roostSpot(b.roost);
  return dragonFits(own.x, own.y) ? own : penSpot(b) || own;
}

// A dragon standing in the pen strolls to a free spot nearby, stands about a while, and goes again.
function roam(b, dt) {
  const d = b.obj;
  const w = (b.roam ||= { wait: 1 + Math.random() * 3, fx: d.x, fy: d.y, to: null });
  if (Math.abs(w.fx - d.x) > 1 || Math.abs(w.fy - d.y) > 1) Object.assign(w, { fx: d.x, fy: d.y, to: null });
  if (!w.to) {
    d.walking = false;
    if ((w.wait -= dt) > 0) return;
    w.to = penSpot(b, d);
    w.wait = 1;
    return;
  }
  const dx = w.to.x - w.fx;
  const dy = w.to.y - w.fy;
  const dist = Math.hypot(dx, dy);
  const s = Math.min(dist, PEN_PACE * dt);
  const nx = w.fx + (dx / dist) * s;
  const ny = w.fy + (dy / dist) * s;
  if (dist < 0.5 || !penFits(b, Math.round(nx), Math.round(ny))) {
    Object.assign(w, { to: null, wait: dist < 0.5 ? 2 + Math.random() * 5 : 0.5 + Math.random() });
    d.walking = false;
    return;
  }
  Object.assign(w, { fx: nx, fy: ny });
  if (Math.abs(dx) > 2) d.faceRight = dx > 0;
  if (d.x !== Math.round(nx) || d.y !== Math.round(ny)) {
    Object.assign(d, { x: Math.round(nx), y: Math.round(ny) });
    placeCollider(d);
  }
  d.walking = true;
}

// Grown dragons standing inside the fence, the follower too if it's waiting in there.
const roosting = () => dragons.filter((d) => d.stage === GROWN && d.perched && inRoostPen(d.obj.x, d.obj.y));
const gameDays = () => dayCount + clock;
const nestFull = () => eggs.some((e) => e.roostEgg && e.state === 'wild');

// Game time counts, nights slept through included, while two or more are in the pen and the nest is empty; it only
// pauses otherwise.
function updateRoost(dt) {
  if (!roost.built) return;
  const now = gameDays();
  const passed = Math.max(0, now - (roost.lastDay ?? now));
  roost.lastDay = now;
  const here = roosting();
  if (here.length < 2 || nestFull()) return;
  roost.days += passed;
  for (const d of here) {
    if (d.emoteT > 0 || Math.random() > dt * 0.05) continue;
    Object.assign(d, { emote: 'heart', emoteT: 1.6 });
  }
  if (roost.days >= ROOST_DAYS) layEgg();
}

function layEgg() {
  roost.days = 0;
  const kinds = Object.values(DRAGON_SPECIES);
  const any = () => kinds[Math.floor(Math.random() * kinds.length)];
  const n = roost.bred.length;
  const id = `bred${n + 1}`;
  const pal = breedSpecies(any(), any(), Math.floor(Math.random() * 1e9));
  roost.bred.push({ id, pal });
  registerSpecies(id, pal);
  const e = placeRoostEgg(id);
  stats.laid++;
  burst(e.x, e.y - 8, [pal.egg.base, pal.egg.speck, '#ffe9a8'], 14, 40);
  Sfx.chirp(earshot(e.x, e.y));
  toast('A NEW EGG', `A ${pal.name} egg has turned up in the roost's nest`);
}

function placeRoostEgg(id) {
  const o = {
    key: `egg_${id}`, x: roostObj.x + ROOST_NEST[0], y: roostObj.y + ROOST_NEST[1], phase: 0, species: id, roostEgg: true,
    state: 'wild', crack: 0, hatchT: 0, hidden: false, col: { off: false },
  };
  placeCollider(o);
  objects.push(o);
  colliders.push(o.col);
  eggs.push(o);
  return o;
}

// ---------- new kinds of dragon ----------

const DRAGON_LOOKS = {
  horns: ['fins', 'horns', 'crest', 'none'],
  spines: [undefined, 'spikes', 'plates'],
  tail: ['fins', 'club', 'spade', 'fan'],
  marks: [undefined, 'stripes', 'spots'],
  tips: [false, true],
};
const BRED_FIRST = ['Storm', 'Ember', 'Frost', 'Moss', 'Dusk', 'Sun', 'Tide', 'Ash', 'Thorn', 'Gale', 'Shadow', 'Cinder', 'Mist', 'Rune', 'Copper', 'Amber', 'Fern', 'Hail', 'Glimmer', 'Bramble'];
const BRED_LAST = ['wing', 'fang', 'tail', 'claw', 'scale', 'horn', 'spark', 'back', 'snout', 'whip', 'flare', 'crest'];
const BRED_PETS = ['Pip', 'Skye', 'Nyx', 'Sprout', 'Flint', 'Juniper', 'Wisp', 'Pebble', 'Saga', 'Bolt', 'Tansy', 'Rook', 'Ziggy', 'Freya', 'Moth', 'Brisk'];

const lookOf = (p) => Object.fromEntries(Object.keys(DRAGON_LOOKS).map((k) => [k, p.look?.[k] ?? DRAGON_LOOKS[k][0]]));
const lookSign = (look, hue) => `${Object.values(look).join('|')}|${Math.floor(hue / 40)}`;

function hslOf(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  const l = (hi + lo) / 2;
  const d = hi - lo;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = hi === r ? ((g - b) / d) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

// Halfway round the colour wheel the short way.
function mixHue(a, b) {
  const d = ((b - a + 540) % 360) - 180;
  return a + d / 2;
}

// A kind of dragon mixed from two parents: their colours blended and shifted, their horns, spines, tail and markings
// shuffled with a chance of something new, until it looks unlike any kind already about.
function breedSpecies(p1, p2, seed) {
  const r = mulberry32(seed);
  const pickOf = (opts) => opts[Math.floor(r() * opts.length)];
  const signs = new Set(Object.values(DRAGON_SPECIES).map((p) => lookSign(lookOf(p), hslOf(p.body).h)));
  const [c1, c2] = [hslOf(p1.body), hslOf(p2.body)];
  let look;
  let hue;
  for (let tries = 0; tries < 40; tries++) {
    const [l1, l2] = [lookOf(p1), lookOf(p2)];
    look = Object.fromEntries(Object.entries(DRAGON_LOOKS).map(([k, opts]) => [k, r() < 0.3 ? pickOf(opts) : (r() < 0.5 ? l1 : l2)[k]]));
    hue = r() < 0.3 ? r() * 360 : mixHue(c1.h, c2.h) + (r() - 0.5) * 140;
    hue = ((hue % 360) + 360) % 360;
    if (!signs.has(lookSign(look, hue))) break;
  }
  const s = 0.3 + r() * 0.45;
  const l = r() < 0.2 ? 0.62 + r() * 0.14 : 0.22 + r() * 0.26;
  const pale = l > 0.55;
  const wingHue = r() < 0.5 ? hue + (r() - 0.5) * 60 : hslOf(pickOf([p1.wing, p2.wing])).h;
  const finHue = r() < 0.5 ? hslOf(pickOf([p1.fin, p2.fin])).h + (r() - 0.5) * 40 : hue + 140 + r() * 80;
  const eyeHue = r() * 360;
  const breathHue = r() < 0.5 ? hslOf(pickOf([p1.breath[0], p2.breath[0]])).h + (r() - 0.5) * 60 : r() * 360;
  const eggHue = hue + (r() - 0.5) * 40;
  const names = new Set(Object.values(DRAGON_SPECIES).map((p) => p.name));
  let name = '';
  for (let i = 0; !name || (names.has(name) && i < 40); i++) name = pickOf(BRED_FIRST) + pickOf(BRED_LAST);
  const pets = new Set([...dragons.map((d) => d.name), ...Object.values(DRAGON_SPECIES).map((p) => p.defaultName)]);
  const defaultName = BRED_PETS.find((n, i) => !pets.has(n) && r() < 0.5 + i / BRED_PETS.length) || pickOf(BRED_PETS);
  return {
    name, defaultName, parents: [p1.name, p2.name],
    body: hsl(hue, s, l), dark: hsl(hue, s, pale ? l * 0.78 : l * 0.62), light: hsl(hue, s * 0.85, Math.min(0.92, l + 0.24)),
    wing: hsl(wingHue, s * 1.1, pale ? l * 0.92 : l * 0.95 + 0.04), eye: hsl(eyeHue, 0.9, 0.6), fin: hsl(finHue, 0.65, 0.5),
    glint: hsl(eyeHue, 0.7, 0.92), spot: hsl(finHue, 0.55, pale ? 0.6 : 0.72), horn: hsl(40, 0.3, 0.84),
    ...(r() < 0.55 ? { belly: hsl(hue + 25, s * 0.7, Math.min(0.84, l + 0.3)) } : {}),
    look,
    egg: {
      base: hsl(eggHue, 0.45, 0.42), light: hsl(eggHue, 0.45, 0.54), speck: hsl(finHue, 0.6, 0.7), speckDark: hsl(eggHue, 0.45, 0.28),
      shine: hsl(eggHue, 0.7, 0.88), gloss: hsl(eggHue, 0.55, 0.68), glow: hsl(breathHue, 0.8, 0.7),
    },
    breath: [hsl(breathHue, 0.9, 0.58), hsl(breathHue, 0.9, 0.9), hsl(breathHue, 0.8, 0.4)],
  };
}

function registerSpecies(id, pal) {
  DRAGON_SPECIES[id] = pal;
  buildSpecies(id, pal);
  SPECIES_NAMES[id] = new RegExp(`\\b${pal.name.toLowerCase()}s?\\b`);
}

// ---------- the hermit ----------

// The hermit asks for the roost once there's a grown dragon about, then has a word on it every other time.
function roostTalk(n) {
  if (n.look.id !== 'hermit' || !hasGrown()) return false;
  if (!roost.asked) {
    roost.asked = true;
    showRoost();
    n.roostTold = 0;
    npcSay(n, `A grown dragon, {name}! It needs a roost of its own, and it's not sleeping in my hut. I've put stakes in east of here. Fell the pines between them, bring ${ROOST_WOOD} wood and build one there.`);
    return true;
  }
  if ((n.roostTold = (n.roostTold || 0) + 1) % 2 === 0) return false;
  npcSay(n, roostLine());
  return true;
}

// Asked about roosts or breeding in chat; anyone else sends the player to the hermit.
function roostChat(n) {
  if (n.look.id !== 'hermit' || !hasGrown()) return false;
  if (!roost.asked) return roostTalk(n);
  npcSay(n, roostLine());
  return true;
}

function roostLine() {
  if (!roost.built) {
    const left = treesLeft();
    if (left) return `The pines between my stakes, east of here. ${left === 1 ? 'Just one' : left} still standing.`;
    return (bag.wood || 0) < ROOST_WOOD ? `The ground's clear. Now ${ROOST_WOOD} wood, and you can build the roost.` : 'You\'ve the wood. Stand between the stakes and build it!';
  }
  const here = roosting().length;
  if (eggs.some((e) => e.roostEgg && e.state === 'wild')) return 'An egg in the roost! Nothing like it ever hatched before. Take it up the fire mountain to warm.';
  if (here < 2) return 'A dragon on its own just sleeps. Leave two or more at the roost and tell them to stay.';
  return `Dragons roosting together. Give them ${ROOST_DAYS} days, and there'll be an egg in the nest.`;
}

// ---------- saving ----------

function saveRoost() {
  return {
    asked: roost.asked, built: roost.built, bred: roost.bred, days: +roost.days.toFixed(3),
    felled: siteTrees.map((o, i) => (o.key !== o.tree ? i : -1)).filter((i) => i >= 0),
  };
}

// Before the eggs: the eggs laid at the roost are made again, in order, so they line up with the saved ones.
function restoreRoost(s) {
  if (!s) return;
  Object.assign(roost, { asked: s.asked, built: s.built, bred: s.bred || [], days: s.days || 0, lastDay: null });
  for (const b of roost.bred) {
    registerSpecies(b.id, b.pal);
    placeRoostEgg(b.id);
  }
  for (const i of s.felled || []) {
    const o = siteTrees[i];
    if (!o) continue;
    Object.assign(o, { key: TREES[o.tree].stump, regrowT: 0 });
    placeCollider(o);
  }
  showRoost();
}
