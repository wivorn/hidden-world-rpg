// Beneath the waves. The seabed under the whole ocean has the shape of the sea above it, and how deep the water is
// over a spot (in tiles out from land, as depthAt) sets what's down there: sunlit sand in the shallows, coral, kelp and
// giant clams on the reef, rocks and an old wreck in the deep, and past that the black abyss. The ways down are a dive
// from a swim or off the stopped ship, the ship's diving bell, and the fin of a friendly orca. How long a dive lasts
// and how deep it goes is down to the gear bought from Ottar.

// How far out from land each zone reaches, in tiles, and what it takes to dive there.
const DEEP_ZONES = [
  { id: 'shallows', to: 3 },
  { id: 'reef', to: 9, needs: 'a diving mask' },
  { id: 'deep', to: 24, needs: 'a diving helmet' },
  { id: 'abyss', to: 255, needs: 'the diving bell' },
];
// The places worth finding down there, in tiles as on the map.
const DEEP_SITES = {
  kelp: { x: 256, y: 236, r: 6, found: 'A whole forest of kelp, swaying like trees in a wind!' },
  wreck: { x: 253, y: 249, r: 4, found: 'A longship, lying on the bottom! She must have gone down years ago.' },
  trench: { x: 174, y: 316, r: 9, found: 'The seabed just drops away into black... the abyss trench. Something glows down there.' },
};
POIS.push(
  { id: 'kelp', name: 'Kelp Forest', icon: 'kelp', x: DEEP_SITES.kelp.x, y: DEEP_SITES.kelp.y, r: 6, words: /\bkelp forest\b/i },
  { id: 'wreck', name: 'Sunken Longship', icon: 'wreck', x: DEEP_SITES.wreck.x, y: DEEP_SITES.wreck.y, words: /\b(sunken longship|wreck|longship went down)\b/i },
  { id: 'trench', name: 'Abyss Trench', icon: 'trench', x: DEEP_SITES.trench.x, y: DEEP_SITES.trench.y, r: 9, words: /\babyss trench\b/i },
);
// Clams, shells and chests near home, so the first dives off the harbour find something.
const HARBOUR_BOX = [226, 226, 290, 262];
// The orca never comes in shallower than this, so it waits just beyond the shallows for a swimmer.
const PAL_DEPTH = 3;
// How far from the bell a diver can swim, however deep the water.
const BELL_REACH = 15 * TILE;
const DIVE_FADE = 0.4;
// On the orca's fin, and SHIFT has it put on a burst of speed.
const RIDE_SPEED = 150;
const RIDE_DASH = 2.3;

const deep = {
  on: false, air: 10, ship: false, bell: null, ride: false, dark: 0, vx: 0, vy: 0,
  bubbles: [], bubbleT: 0, warnT: 0, warned: '', lowWarned: false, found: {},
};
// The befriended orca: hidden until wanted, then swimming in from out of view.
const pal = {
  friend: false, fed: 0, shown: false, x: 0, y: 0, vx: 0, vy: 0, face: 1, side: 1,
  m: { ox: 0, oy: 0, phase: 0, up: false }, breach: null, breachT: 8, leaveT: 0,
};

// The open sea's depth at a spot, in tiles from land; 0 on land, on a reef or in a lake.
function seaDepth(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (!inBounds(tx, ty) || ty >= MAP_H) return 0;
  const i = ty * MAP_W + tx;
  return map[i] === T.WATER && !inland[i] && !isReef(tx, ty) ? seaDist[i] : 0;
}
const zoneAt = (d) => DEEP_ZONES.findIndex((z) => d <= z.to);
const gearZone = () => (has('divingHelmet') ? 2 : has('divingMask') ? 1 : 0);
const airMax = () => (has('divingHelmet') ? 60 : has('divingMask') ? 20 : 10);
// On the orca's back a diver goes wherever it does.
const diveLimit = () => (deep.ride ? 255 : DEEP_ZONES[gearZone()].to);
const nearBell = (x, y, r = BELL_REACH) => !!deep.bell && Math.hypot(x - deep.bell.x, y - deep.bell.y) < r;
const inBell = () => nearBell(player.x, player.y, 14);

function deepFree(x, y) {
  for (const [px0, py0] of [[x - 5, y - 4], [x + 5, y - 4], [x - 5, y], [x + 5, y]]) if (!seaDepth(px0, py0)) return false;
  const d = seaDepth(x, y);
  if (deep.ride && d < PAL_DEPTH) return false;
  return d <= diveLimit() || nearBell(x, y);
}

function freeNear(x, y, ok) {
  for (let r = 0; r <= 64; r += 4) {
    for (let a = 0; a < (r ? 16 : 1); a++) {
      const nx = x + Math.cos((a / 16) * Math.PI * 2) * r;
      const ny = y + Math.sin((a / 16) * Math.PI * 2) * r;
      if (ok(nx, ny)) return { x: nx, y: ny };
    }
  }
  return null;
}

function shipMid() {
  const [x0, y0, x1, y1] = shipBox(shipObj.facing, shipObj.x, shipObj.y);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}
const shipStopped = () => !!sail && shipStill();

// ---------- going down and coming up ----------

// `how`: ship (diving off it, so coming back up aboard), bell (in the diving bell) and ride (on the orca's back).
function startDive(how = {}) {
  if (fade || deep.on) return;
  fade = {
    t: 0, len: DIVE_FADE,
    act: () => {
      const from = how.ship ? shipMid() : { x: player.x, y: player.y };
      if (how.ship) {
        shipObj.rider = null;
        sail = null;
        player.flying = false;
      }
      Object.assign(deep, {
        on: true, ship: !!how.ship, bell: how.bell ? { ...from } : null, ride: !!how.ride, air: airMax(), vx: 0, vy: 0,
        bubbles: [], bubbleT: 0.3, warnT: 0, lowWarned: false,
      });
      const at = how.ride ? { x: pal.x, y: pal.y } : from;
      Object.assign(player, at, freeNear(at.x, at.y, deepFree) || {}, { swimming: true, sprinting: false, dir: 'down', frame: 0 });
      deep.dark = darkFor(seaDepth(player.x, player.y));
      if (how.ride) Object.assign(pal, { shown: true, x: player.x, y: player.y + 2 });
      stats.dives++;
      if (how.ride) stats.orcaRides++;
      if (how.bell) stats.bellDives++;
      if (stats.dives === 1) muse('I can see the bottom! Not long before I need air, though.');
      else if (how.bell && stats.bellDives === 1) muse('Fresh air in the bell! I can swim out and come back to breathe.');
    },
  };
  Sfx.splash(1);
}

// `why`: 'gasp' out of air, 'orca' carried up by it.
function swimUp(why = '') {
  if (!deep.on || fade) return;
  fade = {
    t: 0, len: DIVE_FADE,
    act: () => {
      const m = shipMid();
      const aboard = deep.ship && (deep.bell || deep.ride || Math.hypot(player.x - m.x, player.y - m.y) < 140);
      const rode = deep.ride;
      Object.assign(deep, { on: false, ride: false, bell: null, ship: false });
      deep.bubbles.length = 0;
      if (aboard) {
        const deck = deckPos();
        sail = { vx: 0, vy: 0, wakeT: 0, shoreT: 0, shore: null };
        shipObj.rider = player.look;
        Object.assign(player, { x: deck.x, y: shipObj.y, flying: true, swimming: false });
      } else {
        player.swimming = true;
        const spot = freeNear(player.x, player.y, (x, y) => canStand(player, x, y));
        if (spot) Object.assign(player, spot);
        if (rode) Object.assign(pal, { x: player.x + 26, y: player.y + 8, vx: 0, vy: 0 });
      }
      splash(player.x, player.y);
      seaSplash(player.x, player.y - 2, 1);
      if (why === 'gasp') {
        player.stamina = 0;
        player.winded = true;
        renderStamina();
        muse('*Gasp!* Air! I stayed down far too long.');
      } else if (why === 'orca') {
        muse(aboard ? 'The orca brought me back up to the ship.' : 'The orca carried me up for air.');
      }
    },
  };
  Sfx.splash(0.7);
}

function darkFor(d) {
  if (d <= 3) return 0.03;
  if (d <= 9) return 0.08 + (d - 4) * 0.03;
  if (d <= 24) return 0.3 + (d - 10) * 0.023;
  return Math.min(0.94, 0.72 + (d - 25) * 0.004);
}
// How dark it is down here, with the night on top of the depth.
const deepShade = () => Math.min(0.97, deep.dark + nightness() * 0.65 * (1 - deep.dark));

// ---------- underwater ----------

function updateDeep(dt) {
  const max = airMax();
  if (inBell()) deep.air = Math.min(max, deep.air + dt * 6);
  else deep.air -= dt * (deep.ride ? 0.6 : player.sprinting ? 1.5 : 1);
  if (deep.air <= 0) return swimUp('gasp');
  if (deep.ride && deep.air < 2.5) return swimUp('orca');
  if (!deep.lowWarned && deep.air < max * 0.3 && !inBell()) {
    deep.lowWarned = true;
    muse(deep.bell ? 'Running low on air! Back to the bell...' : deep.ride ? 'Nearly out of air! The orca will take me up.' : 'Running out of air! Time to swim up (U).');
  }
  if (deep.air > max * 0.5) deep.lowWarned = false;

  const [ix, iy] = readInput();
  const moving = !!(ix || iy);
  const dashing = deep.ride && moving && boosting();
  if (dashing && !player.sprinting) Sfx.orca(0.5);
  player.sprinting = moving && boosting();
  updateStamina(dt, false, moving);
  const top = deep.ride ? RIDE_SPEED * (dashing ? RIDE_DASH : 1) : 40 * (has('swimFins') ? 1.5 : 1) * (player.sprinting ? 1.45 : 1);
  const len = Math.hypot(ix, iy) || 1;
  const k = 1 - Math.exp(-dt * (deep.ride && moving ? 4 : moving ? 3 : 2));
  deep.vx += ((ix / len) * top - deep.vx) * k;
  deep.vy += ((iy / len) * top - deep.vy) * k;
  const nx = player.x + deep.vx * dt;
  if (deepFree(nx, player.y)) player.x = nx;
  else {
    tooDeep(nx, player.y);
    deep.vx = 0;
  }
  const ny = player.y + deep.vy * dt;
  if (deepFree(player.x, ny)) player.y = ny;
  else {
    tooDeep(player.x, ny);
    deep.vy = 0;
  }
  if (moving) {
    faceToward(player, ix, iy);
    player.anim += dt * (deep.ride ? 2 : 4) * (player.sprinting ? 1.5 : 1);
    player.frame = Math.floor(player.anim) % 4;
  } else player.frame = 0;
  if (deep.ride) {
    Object.assign(pal, { x: player.x, y: player.y + 2, vx: deep.vx, vy: deep.vy });
    if (Math.abs(deep.vx) > 5) pal.face = deep.vx > 0 ? 1 : -1;
  }

  // a stream of bubbles off the orca's tail at full speed
  const v = Math.hypot(deep.vx, deep.vy);
  if (deep.ride && v > RIDE_SPEED * 1.3 && (deep.trailT = (deep.trailT || 0) - dt) <= 0) {
    deep.trailT = 0.035;
    const ux = deep.vx / v;
    const uy = deep.vy / v;
    const back = Math.abs(ux) > Math.abs(uy) ? 40 : 30;
    deep.bubbles.push({ x: player.x - ux * back + (Math.random() - 0.5) * 6, y: player.y - 12 - uy * back + (Math.random() - 0.5) * 6, t: 0, r: Math.random() < 0.3 ? 2 : 1, ph: Math.random() * 6 });
  }
  if ((deep.bubbleT -= dt) <= 0) {
    deep.bubbleT = 0.7 + Math.random() * 1.1;
    const n = 1 + Math.floor(Math.random() * 3);
    const [hx, hy] = diverHead();
    for (let i = 0; i < n; i++) {
      deep.bubbles.push({ x: hx + (Math.random() - 0.5) * 4, y: hy - 3 + i * 3, t: -i * 0.12, r: Math.random() < 0.4 ? 2 : 1, ph: Math.random() * 6 });
    }
    if (Math.random() < 0.3) Sfx.plip(0.12);
  }
  for (const b of deep.bubbles) {
    b.t += dt;
    if (b.t < 0) continue;
    b.y -= (16 + b.r * 6) * dt;
    b.x += Math.sin(time * 4 + b.ph) * dt * 6;
  }
  deep.bubbles = deep.bubbles.filter((b) => b.t < 2.2);
  deep.dark += (darkFor(seaDepth(player.x, player.y)) - deep.dark) * (1 - Math.exp(-dt * 1.5));
  deep.warnT -= dt;
  findSites();
}

// Pushing on past where the gear allows: why not, said once a dive and shown a moment in the prompt.
function tooDeep(x, y) {
  const d = seaDepth(x, y);
  if (!d) return;
  const text = deep.ride && d < PAL_DEPTH ? 'The orca won\'t swim into the shallows'
    : d > diveLimit() ? `Too deep to go on without ${DEEP_ZONES[zoneAt(d)].needs}` : '';
  if (!text) return;
  if (deep.warned !== text) muse(`${text}.`);
  deep.warned = text;
  deep.warnT = 2;
}

function findSites() {
  for (const [id, s] of Object.entries(DEEP_SITES)) {
    if (deep.found[id] || Math.hypot(player.x / TILE - s.x, player.y / TILE - s.y) > s.r) continue;
    deep.found[id] = true;
    const poi = POIS.find((p) => p.id === id);
    if (poi) learnPlace(poi);
    muse(s.found);
  }
}

// ---------- things on the seabed ----------

const DEEP_LOOT = ['gold', 'ruby', 'emerald', 'pearl', 'goblet'];
const ABYSS_LOOT = ['goblet', 'crown', 'ruby', 'emerald', 'gold'];
const PEARL_REGROW = 2;
let bedThings = null;

// Shells in the shallows, giant clams on the reef and sunken chests in the deep, the same every game. A taken shell
// washes back up the next day; a clam grows a new pearl in PEARL_REGROW days.
function seabed() {
  if (bedThings) return bedThings;
  const rng = mulberry32(41);
  const spots = (n, lo, hi, box = [0, 0, MAP_W, MAP_H]) => {
    const out = [];
    const [x0, y0, x1, y1] = box;
    for (let tries = 0; out.length < n && tries < n * 2000; tries++) {
      const tx = x0 + Math.floor(rng() * (x1 - x0));
      const ty = y0 + Math.floor(rng() * (y1 - y0));
      const d = seaDepth((tx + 0.5) * TILE, (ty + 0.5) * TILE);
      if (d >= lo && d <= hi) out.push({ x: (tx + 0.25 + rng() * 0.5) * TILE, y: (ty + 0.45 + rng() * 0.4) * TILE });
    }
    return out;
  };
  const loot = (abyss) => ({ coins: abyss ? 150 + Math.floor(rng() * 150) : 40 + Math.floor(rng() * 80), items: [(abyss ? ABYSS_LOOT : DEEP_LOOT)[Math.floor(rng() * 5)]] });
  const shells = [...spots(150, 1, 3), ...spots(20, 1, 3, HARBOUR_BOX)].map((p) => ({ ...p, day: -1 }));
  const clams = [...spots(90, 4, 9), ...spots(10, 4, 9, HARBOUR_BOX)].map((p) => ({ ...p, day: -99 }));
  const chests = [...spots(9, 11, 24), ...spots(2, 11, 24, HARBOUR_BOX)].map((p) => ({ ...p, loot: loot(false) }));
  chests.push(...spots(5, 26, 70).map((p) => ({ ...p, loot: loot(true) })));
  const w = wreckAt();
  chests.push({ x: w.x + 6, y: w.y + 5, wreck: true, loot: { coins: 300, items: ['crown', 'goblet'] } });
  const trench = { x: (DEEP_SITES.trench.x + 0.5) * TILE, y: (DEEP_SITES.trench.y + 0.5) * TILE, taken: false };
  bedThings = { shells, clams, chests, trench };
  return bedThings;
}
const wreckAt = () => ({ x: (DEEP_SITES.wreck.x + 0.5) * TILE, y: (DEEP_SITES.wreck.y + 0.5) * TILE });
const clamReady = (c) => gameDays() - c.day >= PEARL_REGROW;

const DEEP_ACTS = { chest: 'Open the sunken chest', trench: 'Reach into the giant clam', clam: 'Prise open the giant clam', shell: 'Pick up the seashell' };

function deepNear() {
  const b = seabed();
  const reach = (o, r) => Math.abs(o.x - player.x) < r && Math.abs(o.y - player.y) < r && Math.hypot(o.x - player.x, o.y - player.y) < r;
  const chest = b.chests.find((c) => !c.opened && reach(c, 18));
  if (chest) return { kind: 'chest', o: chest };
  if (!b.trench.taken && reach(b.trench, 22)) return { kind: 'trench', o: b.trench };
  const clam = b.clams.find((c) => clamReady(c) && reach(c, 16));
  if (clam) return { kind: 'clam', o: clam };
  const shell = b.shells.find((s) => s.day !== dayCount && reach(s, 12));
  return shell ? { kind: 'shell', o: shell } : null;
}

function openClam(c) {
  c.day = gameDays();
  give('pearl');
  stats.pearls++;
  popIcon('pearl', c.x, c.y - 14);
  Sfx.crack(0.5);
  Sfx.pickup();
  if (stats.pearls === 1) muse('A pearl! Ottar will pay well for this.');
}

function takeShell(s) {
  s.day = dayCount;
  give('seashell');
  stats.shells++;
  popIcon('seashell', s.x, s.y - 10);
  Sfx.pickup();
}

function openSunkChest(c) {
  c.opened = true;
  pay(c.loot.coins);
  for (const id of c.loot.items) give(id);
  stats.sunkChests++;
  stats.treasure++;
  popIcon('goldCoin', c.x, c.y - 18);
  c.loot.items.forEach((id, i) => popIcon(id, c.x + (i + 1) * 9, c.y - 18, 0.15 * (i + 1)));
  Sfx.coin();
  Sfx.reward();
  const things = c.loot.items.map((id) => ITEMS[id].name.toLowerCase()).join(' and a ');
  toast(c.wreck ? 'THE SUNKEN LONGSHIP' : 'SUNKEN CHEST', `${coinWords(c.loot.coins)} and a ${things}`);
  muse(c.wreck ? 'The longship\'s treasure! A golden crown, still shining after all these years.' : 'Treasure, from the bottom of the sea!');
}

function takeDeepPearl(t) {
  t.taken = true;
  give('deepPearl');
  stats.trench++;
  popIcon('deepPearl', t.x, t.y - 18);
  Sfx.reward();
  toast('THE PEARL OF THE DEEP', 'A pearl as big as a fist, glowing blue');
  muse('It\'s a pearl as big as my fist, and it glows! Nobody will believe this.');
}

// ---------- SPACE and U underwater ----------

function deepAct() {
  if (fade) return;
  const n = deepNear();
  if (n) ({ chest: openSunkChest, trench: takeDeepPearl, clam: openClam, shell: takeShell })[n.kind](n.o);
  else if (deep.ride) letGo();
  else if (palNear()) {
    deep.ride = true;
    Sfx.orca(0.7);
  }
}

function letGo() {
  if (seaDepth(player.x, player.y) > DEEP_ZONES[gearZone()].to && !nearBell(player.x, player.y)) {
    muse('Too deep to let go here! I\'d never make it on my own.');
    return;
  }
  deep.ride = false;
}

function deepPrompt() {
  if (fade) return '';
  const n = deepNear();
  const space = n ? `SPACE  ${DEEP_ACTS[n.kind]}` : deep.ride ? 'SPACE  Let go of the fin' : palNear() ? 'SPACE  Grab the orca\'s fin' : '';
  const up = deep.ride ? 'U  Surface with the orca' : inBell() ? 'U  Back up in the bell' : 'U  Swim up for air';
  const note = deep.warnT > 0 ? deep.warned : inBell() ? 'Fresh air in the bell' : '';
  return [note, space, up].filter(Boolean).join('   ·   ');
}

// ---------- from the surface ----------

const fishInBag = () => FISH_IDS.find((id) => has(id));

// A spy-hopping orca close enough to toss a fish to, not yet fed this time up.
function spyNear() {
  if (pal.friend || deep.on) return null;
  const at = sail ? shipMid() : player;
  const reach = sail ? 90 : 60;
  return seaLife.orcas.find((p) => p.spy && !p.spy.fed && Math.hypot(p.x + p.spy.m.ox - at.x, p.y + p.spy.m.oy - at.y) < reach) || null;
}
const orcaFeedable = () => (!!sail || player.swimming) && !deep.on && !!fishInBag() && !!spyNear();

// Orcas come up for a look far more often at someone out on the water with a fish to spare.
function orcaCurious(p) {
  if (pal.friend || deep.on || !(sail || player.swimming) || !fishInBag()) return false;
  const at = sail ? shipMid() : player;
  return Math.hypot(p.x - at.x, p.y - at.y) < 240;
}

function feedOrca() {
  const p = spyNear();
  const id = fishInBag();
  if (!p || !id) return;
  const m = p.spy.m;
  const x = p.x + m.ox;
  const y = p.y + m.oy;
  useUp(id);
  p.spy.fed = true;
  p.spy.t = Math.max(p.spy.t, SPY_TIME * 0.8);
  popIcon(id, x, y - 24);
  seaSplash(x, y, 0.8);
  Sfx.gulp(1);
  Sfx.orca(1);
  stats.orcaFed++;
  pal.fed++;
  if (pal.fed >= 3) befriendOrca(p, m);
  else muse(pal.fed === 1 ? 'It snapped the fish right out of the air! It\'s watching me...' : 'It came back for more! I think it likes me.');
}

function befriendOrca(p, m) {
  pal.friend = true;
  Object.assign(pal, { x: p.x + m.ox, y: p.y + m.oy, vx: 0, vy: 0, shown: true, face: p.face, side: 1, breach: null, breachT: 5, leaveT: 0 });
  p.members.splice(p.members.indexOf(m), 1);
  p.spy = null;
  toast('A NEW FRIEND', 'An orca swims with you now');
  Sfx.reward();
  muse('The orca\'s staying by me! It\'ll swim along with me now. U near it and we can dive together.');
}

// Close enough to the orca to grab its fin: from the ship, swimming or underwater.
function palNear() {
  if (!pal.shown || deep.ride || pal.breach || fade) return false;
  const at = sail ? shipMid() : player;
  return Math.hypot(pal.x - at.x, pal.y - at.y) < (sail ? 80 : deep.on ? 56 : 40);
}

function shipDiveOk() {
  if (!shipStopped() || player.fishing) return false;
  const m = shipMid();
  const d = seaDepth(m.x, m.y);
  return d > 0 && d <= DEEP_ZONES[gearZone()].to;
}
const canLowerBell = () => upgrades.bell && shipStopped() && !player.fishing && !fade && seaDepth(shipMid().x, shipMid().y) >= 4;

function lowerBell() {
  Sfx.clang(0.5);
  startDive({ ship: true, bell: true });
}

// SPACE on the ship: the orca first, then going ashore, then over the side into the sea.
function shipAct() {
  if (orcaFeedable()) feedOrca();
  else if (player.fishing) return;
  else if (shoreSpot()) disembark();
  else if (overboardSpot()) jumpOverboard();
}

function shipSpaceHint() {
  if (orcaFeedable()) return 'SPACE  Toss a fish to the orca';
  if (player.fishing) return '';
  if (sail.shore) return 'SPACE  Go ashore';
  if (overboardSpot()) return 'SPACE  Jump overboard';
  return '';
}

// Open water just off the hull, on the side the player's facing if there's room there.
function overboardSpot() {
  const [x0, y0, x1, y1] = shipBox(shipObj.facing, shipObj.x, shipObj.y);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const [vx, vy] = DIR_VEC[player.dir] || [0, 1];
  const a0 = Math.atan2(vy, vx);
  for (let i = 0; i < 12; i++) {
    const a = a0 + Math.ceil(i / 2) * (i % 2 ? 1 : -1) * (Math.PI / 6);
    for (const r of [10, 18]) {
      const x = cx + Math.cos(a) * ((x1 - x0) / 2 + r);
      const y = cy + Math.sin(a) * ((y1 - y0) / 2 + r);
      if (seaDepth(x, y) >= 1 && !onLand(x, y)) return { x, y };
    }
  }
  return null;
}

function jumpOverboard() {
  const spot = overboardSpot();
  if (!spot) return;
  const deck = deckPos();
  shipObj.rider = null;
  sail = null;
  Object.assign(player, { x: deck.x, y: shipObj.y });
  startHop(spot.x, spot.y, deck.lift, 0, () => {
    player.flying = false;
    player.swimming = true;
    splash(player.x, player.y);
    seaSplash(player.x, player.y, 0.8);
    Sfx.splash();
  });
}

// What U does on the water, as [label, do it]: down with the orca, or a dive of your own (off the ship once it's stopped).
function diveAct() {
  if (deep.on || indoors || fade || hop || flight) return null;
  if (sail) {
    if (player.fishing) return null;
    if (palNear()) return ['Dive with the orca', () => startDive({ ship: true, ride: true })];
    return shipDiveOk() ? ['Dive', () => startDive({ ship: true })] : null;
  }
  if (!player.swimming) return null;
  if (palNear()) return ['Dive with the orca', () => startDive({ ride: true })];
  const d = seaDepth(player.x, player.y);
  return d >= 1 && d <= DEEP_ZONES[gearZone()].to ? ['Dive', () => startDive()] : null;
}
const diveHint = () => (diveAct() ? `   ·   U  ${diveAct()[0]}` : '');
const bellHint = () => (canLowerBell() ? '   ·   B  Lower the diving bell' : '');

// What SPACE does for a swimmer out at sea, as [label, do it].
function swimAct() {
  if (!player.swimming || deep.on || indoors || fade) return null;
  return orcaFeedable() ? ['Toss a fish to the orca', feedOrca] : null;
}

function swimHint() {
  const d = seaDepth(player.x, player.y);
  const z = d ? zoneAt(d) : 0;
  const note = z > gearZone() ? `Too deep to dive here without ${DEEP_ZONES[z].needs}` : '';
  const dive = diveAct() ? `U  ${diveAct()[0]}` : '';
  return [note, dive, 'Swim to a beach or low shore to climb out'].filter(Boolean).join('   ·   ');
}

// ---------- the orca ----------

function updateUnderwater(dt) {
  if (started) updatePal(dt);
}

// Wanted out sailing, diving, or swimming once out past the shallows; it stays while the swimmer heads back in.
function palWanted() {
  if (!pal.friend || indoors || flight) return false;
  if (sail || deep.on) return true;
  return player.swimming && (pal.shown || seaDepth(player.x, player.y) >= PAL_DEPTH);
}
const palAnchor = () => (sail ? shipMid() : player);

function updatePal(dt) {
  if (!pal.friend) return;
  const want = palWanted();
  if (!pal.shown) {
    if (want && !fade) spawnPal();
    return;
  }
  if (deep.ride) return;
  const at = palAnchor();
  if (!want) {
    // swims off out to sea, gone once out of sight
    pal.leaveT += dt;
    const dx = pal.x - player.x;
    const dy = pal.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    steerPal(pal.x + (dx / d) * 200, pal.y + (dy / d) * 200, 80, dt);
    if (pal.leaveT > 8 || !onScreen(pal.x, pal.y, cam.x, cam.y, 60)) pal.shown = false;
    return;
  }
  pal.leaveT = 0;
  if (Math.hypot(pal.x - at.x, pal.y - at.y) > 700) {
    pal.shown = false;
    return;
  }
  const [tx, ty] = palTarget(at);
  const speed = sail ? Math.hypot(sail.vx, sail.vy) : 0;
  steerPal(tx, ty, sail ? speed * 1.1 + 70 : 85, dt);
  if (deep.on) return;
  const up = orcaUp(pal.m);
  if (up && !pal.m.up && !pal.breach) {
    seaSplash(pal.x, pal.y, 0.5);
    if (Math.random() < 0.3) Sfx.orca(0.6 * earshot(pal.x, pal.y));
  }
  pal.m.up = up;
  if (pal.breach) {
    if ((pal.breach.t += dt) >= BREACH_TIME) {
      pal.breach = null;
      seaSplash(pal.x + pal.face * 26, pal.y, 1.8);
      Sfx.splash(0.6 * earshot(pal.x, pal.y));
    }
  } else if ((pal.breachT -= dt) <= 0) {
    pal.breachT = 12 + Math.random() * 16;
    if (speed > 50 || Math.random() < 0.4) {
      pal.breach = { m: pal.m, t: 0 };
      seaSplash(pal.x, pal.y, 1.2);
      Sfx.orca(earshot(pal.x, pal.y));
    }
  }
}

function steerPal(tx, ty, top, dt) {
  const dx = tx - pal.x;
  const dy = ty - pal.y;
  const d = Math.hypot(dx, dy);
  const want = Math.min(top, d * 1.8);
  const k = 1 - Math.exp(-dt * 2.5);
  pal.vx += ((d > 1 ? (dx / d) * want : 0) - pal.vx) * k;
  pal.vy += ((d > 1 ? (dy / d) * want : 0) - pal.vy) * k;
  const nx = pal.x + pal.vx * dt;
  if (seaDepth(nx, pal.y) >= 2) pal.x = nx;
  else pal.vx *= -0.3;
  const ny = pal.y + pal.vy * dt;
  if (seaDepth(pal.x, ny) >= 2) pal.y = ny;
  else pal.vy *= -0.3;
  if (Math.abs(pal.vx) > 6) pal.face = pal.vx > 0 ? 1 : -1;
}

// Beside the ship, off to one side of a swimmer, or circling a diver; never in the shallows, where it waits instead
// at the nearest deep enough water on the way.
function palTarget(at) {
  let tx;
  let ty;
  if (sail) {
    const v = Math.hypot(sail.vx, sail.vy);
    if (v > 20) {
      const ux = sail.vx / v;
      const uy = sail.vy / v;
      tx = at.x - uy * 44 * pal.side + ux * 10;
      ty = at.y + ux * 30 * pal.side + uy * 10;
    } else {
      tx = at.x + pal.side * 50;
      ty = at.y + 20;
    }
  } else if (deep.on) {
    const a = time * 0.5;
    tx = at.x + Math.cos(a) * 84;
    ty = at.y + Math.sin(a) * 50;
  } else {
    tx = at.x + pal.side * 28;
    ty = at.y + 10;
  }
  if (seaDepth(tx, ty) >= PAL_DEPTH) return [tx, ty];
  for (let k = 1; k <= 10; k++) {
    const x = tx + ((pal.x - tx) * k) / 10;
    const y = ty + ((pal.y - ty) * k) / 10;
    if (seaDepth(x, y) >= PAL_DEPTH) return [x, y];
  }
  return [pal.x, pal.y];
}

// In from just out of sight, in water deep enough for it.
function spawnPal() {
  const at = palAnchor();
  const R = Math.max(viewW, viewH) * 0.5 + 30;
  const a0 = Math.random() * Math.PI * 2;
  for (const r of [R, R * 0.7, R * 1.3, R * 0.45]) {
    for (let i = 0; i < 16; i++) {
      const a = a0 + (i / 16) * Math.PI * 2;
      const x = at.x + Math.cos(a) * r;
      const y = at.y + Math.sin(a) * r * 0.8;
      if (seaDepth(x, y) < PAL_DEPTH + 1) continue;
      Object.assign(pal, { x, y, vx: 0, vy: 0, shown: true, leaveT: 0, side: x > at.x ? 1 : -1, breach: null });
      return true;
    }
  }
  return false;
}

// At the surface: its back and fin rolling up now and then, a breach, and its shape under the water between.
function palSprites(cx, cy) {
  if (!pal.shown || deep.on || !onScreen(pal.x, pal.y, cx, cy, 80)) return [];
  const p = { x: pal.x, y: pal.y, face: pal.face, breach: pal.breach };
  if (pal.breach) return [{ y: pal.y, draw: () => drawBreach(p, pal.m, cx, cy) }];
  if (orcaUp(pal.m)) return [{ y: pal.y, draw: () => drawOrcaBack(p, pal.m, cx, cy) }];
  return [];
}

function drawPalUnder(cx, cy) {
  if (!pal.shown || deep.on || pal.breach || orcaUp(pal.m) || !onScreen(pal.x, pal.y, cx, cy, 80)) return;
  ctx.globalAlpha = 0.3;
  ellipse(ctx, Math.round(pal.x - cx), Math.round(pal.y - cy), 12, 3, '#16304f');
  ctx.globalAlpha = 1;
}

// ---------- art ----------

let deepArtCache = null;
const CORALS = [['#e86a8a', '#ffb0c4'], ['#f09a4a', '#ffd0a0'], ['#9a6ad8', '#d0b0ff'], ['#e8d04a', '#fff0a0'], ['#4ac8b0', '#a8f4e4'], ['#d8484a', '#ff9a8a']];
const REEF_FISH = [['#ffb02a', '#ffffff'], ['#3ab0ff', '#ffe04a'], ['#ff6a8a', '#ffd0e0'], ['#e8e84a', '#3a3a3a']];

function twice(img) {
  const c = makeCanvas(img.width * 2, img.height * 2);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function deepArt() {
  if (deepArtCache) return deepArtCache;
  const whale = sprite(56, 18, (g) => {
    const c = '#34475f';
    poly(g, [[7, 9], [0, 3], [3, 9], [0, 15]], c);
    ellipse(g, 28, 9, 22, 6, c);
    ellipse(g, 38, 9, 14, 6, c);
    ellipse(g, 32, 13, 17, 2.5, '#c9d3dc');
    for (let x = 22; x < 48; x += 3) line(g, x, 12, x + 1, 15, '#9aa8b8');
    poly(g, [[30, 13], [25, 18], [34, 15]], c);
    poly(g, [[14, 4], [17, 1], [19, 5]], c);
    ellipse(g, 26, 5, 8, 1, '#4a5f7d');
    px(g, 45, 9, '#10141c');
    line(g, 41, 11, 51, 10, '#1d2838');
  });
  const shark = sprite(26, 11, (g) => {
    const c = '#5a6676';
    poly(g, [[5, 6], [0, 1], [2, 6], [0, 10]], c);
    ellipse(g, 14, 6, 10, 3, c);
    poly(g, [[11, 4], [13, 0], [16, 4]], c);
    ellipse(g, 15, 7.5, 8, 1.2, '#d8dee6');
    poly(g, [[15, 7], [12, 10], [18, 8]], c);
    px(g, 21, 5, '#10141c');
    for (const x of [18, 19]) px(g, x, 6, '#3e4856');
  });
  const chest = (open) => sprite(14, 12, (g) => {
    const wood = '#6a4a2a';
    if (open) {
      rect(g, 1, 0, 12, 4, '#4a3018');
      rect(g, 2, 1, 10, 2, '#2a1c10');
    }
    rect(g, 1, open ? 4 : 1, 12, open ? 7 : 10, wood);
    rect(g, 1, open ? 4 : 4, 12, 1, '#8a6a3a');
    if (open) rect(g, 2, 4, 10, 2, '#1a120a');
    else rect(g, 1, 1, 12, 3, '#7a5832');
    for (const x of [3, 10]) rect(g, x, open ? 4 : 1, 1, open ? 7 : 10, '#4e5660');
    if (!open) rect(g, 6, 4, 2, 2, '#c8a040');
    for (const [x, y] of [[2, 10], [9, 9], [12, 6], [4, 7]]) px(g, x, y, '#4a7a3a');
  });
  const clam = (open, pearl, big = 1) => sprite(14 * big, 9 * big, (g) => {
    const S = (v) => Math.round(v * big);
    const lip = '#6a7ab8';
    const dark = '#3a4a8a';
    if (open) {
      ellipse(g, S(7), S(3), S(6), S(2.5), lip);
      ellipse(g, S(7), S(3.5), S(5), S(1.5), '#f4d8e0');
    }
    ellipse(g, S(7), S(6), S(6.5), S(2.5), lip);
    if (open) ellipse(g, S(7), S(5.5), S(5), S(1.5), '#f8e4ea');
    for (let x = 1; x < 14; x += 2) px(g, S(x), S(open ? 7 : 5), dark);
    if (!open) for (let x = 2; x < 13; x += 2) px(g, S(x), S(4), '#9aa8e0');
    if (pearl) {
      ellipse(g, S(7), S(5), S(1.5), S(1.5), big > 1 ? '#9fc0ff' : '#f4eee4');
      px(g, S(6.5), S(4.5), '#ffffff');
    }
  });
  const bell = sprite(20, 22, (g) => {
    const B = '#b87a2a';
    rect(g, 9, 0, 2, 3, '#c4a46a');
    ellipse(g, 10, 7, 5, 4, B);
    rect(g, 5, 7, 10, 9, B);
    poly(g, [[5, 15], [2, 19], [18, 19], [15, 15]], B);
    rect(g, 1, 19, 18, 2, '#6a4418');
    rect(g, 6, 5, 1, 12, '#f0c060');
    ellipse(g, 11, 11, 2.5, 2.5, '#ffe68a');
    px(g, 10, 10, '#ffffff');
    for (const x of [4, 8, 12, 16]) px(g, x, 20, '#f0c060');
  });
  const wreck = sprite(80, 34, (g) => {
    const wood = '#5a4632';
    poly(g, [[2, 18], [10, 10], [70, 10], [78, 18], [70, 28], [10, 28]], '#3a2c20');
    poly(g, [[5, 18], [12, 12], [68, 12], [75, 18], [68, 26], [12, 26]], wood);
    poly(g, [[10, 18], [16, 14], [64, 14], [70, 18], [64, 23], [16, 23]], '#2a2018');
    for (let x = 18; x < 64; x += 5) rect(g, x, 14, 2, 9, '#7a6448');
    poly(g, [[46, 26], [50, 21], [56, 22], [58, 27]], '#1a140e');
    line(g, 75, 18, 78, 9, wood, 2);
    ellipse(g, 78, 8, 2, 2, wood);
    px(g, 79, 7, '#e8d06a');
    line(g, 4, 18, 2, 11, wood, 2);
    for (let x = 16; x < 46; x += 9) {
      ellipse(g, x, 27, 2.5, 2, '#7a3a2a');
      px(g, x, 27, '#b89040');
    }
    line(g, 28, 3, 54, 33, '#6a5038', 2);
    poly(g, [[31, 5], [42, 1], [45, 9], [36, 12]], '#8a8068');
    for (const [x, y] of [[12, 13], [20, 26], [33, 11], [60, 26], [62, 12], [67, 25], [25, 12], [40, 27], [52, 12]]) rect(g, x, y, 3, 1, '#4a6a3a');
  });
  const dolphin = twice(SEA_ART.dolphin);
  const big = twice(whale);
  const shark2 = twice(shark);
  deepArtCache = {
    dolphin, dolphinL: mirror(dolphin), whale: big, whaleL: mirror(big), shark: shark2, sharkL: mirror(shark2),
    chest: chest(false), chestOpen: chest(true), clam: clam(false, false), clamOpen: clam(true, false),
    bigClam: clam(true, true, 2), bigClamEmpty: clam(true, false, 2), bell, wreck,
  };
  return deepArtCache;
}

// ---------- the seabed ----------

// Chunks of the seabed are painted once and kept, the least recently drawn thrown away first.
const BED = 16;
const BED_PX = BED * TILE;
const BED_STEP = 4;
const bedChunks = new Map();
// The colour of the seabed by depth: rock where the land rises out of the sea, pale sand in the shallows, greener
// over the reef, then blue going to black.
const BED_TONES = [
  [0, [92, 88, 78]], [0.7, [168, 152, 108]], [1.2, [212, 194, 138]], [3, [196, 182, 128]], [5, [150, 160, 112]], [9, [100, 128, 108]],
  [14, [60, 98, 110]], [24, [34, 66, 94]], [40, [20, 40, 66]], [80, [10, 22, 40]], [255, [5, 11, 24]],
];

function bedTone(f) {
  let i = 1;
  while (i < BED_TONES.length - 1 && f > BED_TONES[i][0]) i++;
  const [f0, c0] = BED_TONES[i - 1];
  const [f1, c1] = BED_TONES[i];
  const k = Math.max(0, Math.min(1, (f - f0) / (f1 - f0)));
  return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
}

function bedDepth(tx, ty) {
  if (!inBounds(tx, ty) || ty >= MAP_H) return 40;
  const i = ty * MAP_W + tx;
  return (map[i] === T.WATER || map[i] === T.WOOD) && !inland[i] ? Math.min(seaDist[i], 255) : 0;
}

// The trench: a jagged black crack across the abyss floor round its site, in tiles.
function inTrench(x, y) {
  const s = DEEP_SITES.trench;
  const ax = s.x - 7;
  const ay = s.y - 2;
  const bx = s.x + 7;
  const by = s.y + 3;
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  const d = Math.hypot(x - ax - vx * t, y - ay - vy * t);
  const w = (1.3 + Math.sin(t * 19) * 0.4 + Math.sin(t * 7 + 1) * 0.3) * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05));
  return d < w ? 2 : d < w + 0.5 ? 1 : 0;
}

function bedChunk(ci, cj) {
  const key = cj * 4096 + ci;
  let c = bedChunks.get(key);
  if (c) {
    bedChunks.delete(key);
  } else {
    c = makeCanvas(BED_PX, BED_PX);
    paintBed(c.getContext('2d'), ci * BED, cj * BED);
    if (bedChunks.size >= 48) bedChunks.delete(bedChunks.keys().next().value);
  }
  bedChunks.set(key, c);
  return c;
}

function paintBed(g, tx0, ty0) {
  const W = BED + 2;
  const D = new Float32Array(W * W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) D[j * W + i] = bedDepth(tx0 + i - 1, ty0 + j - 1);
  const kelp = DEEP_SITES.kelp;
  const trench = DEEP_SITES.trench;
  const nearTrench = Math.abs(tx0 + BED / 2 - trench.x) < BED && Math.abs(ty0 + BED / 2 - trench.y) < BED;
  const n = BED_PX / BED_STEP;
  for (let by = 0; by < n; by++) {
    for (let bx = 0; bx < n; bx++) {
      const fx = ((bx + 0.5) * BED_STEP) / TILE + 0.5;
      const fy = ((by + 0.5) * BED_STEP) / TILE + 0.5;
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const u = fx - i;
      const v = fy - j;
      const a = D[j * W + i];
      const b = D[j * W + i + 1];
      const c = D[(j + 1) * W + i];
      const d = D[(j + 1) * W + i + 1];
      let [r, gg, bb] = bedTone((a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v);
      const wx = tx0 * 4 + bx;
      const wy = ty0 * 4 + by;
      const nz = 1 + (hash(wx, wy, 9) - 0.5) * 0.07 + (hash(wx >> 2, wy >> 2, 10) - 0.5) * 0.06;
      r *= nz;
      gg *= nz;
      bb *= nz;
      const tx = tx0 + fx - 1;
      const ty = ty0 + fy - 1;
      const kd = Math.hypot(tx - kelp.x, ty - kelp.y) / (kelp.r + 3);
      if (kd < 1) {
        const m = 0.3 * (1 - kd);
        r += (70 - r) * m;
        gg += (92 - gg) * m;
        bb += (52 - bb) * m;
      }
      const crack = nearTrench ? inTrench(tx, ty) : 0;
      if (crack) [r, gg, bb] = crack === 2 ? [2, 4, 9] : [r * 0.55, gg * 0.55, bb * 0.6];
      g.fillStyle = `rgb(${r | 0},${gg | 0},${bb | 0})`;
      g.fillRect(bx * BED_STEP, by * BED_STEP, BED_STEP, BED_STEP);
    }
  }
  for (let j = 0; j < BED; j++) {
    for (let i = 0; i < BED; i++) {
      const tx = tx0 + i;
      const ty = ty0 + j;
      const d = D[(j + 1) * W + i + 1];
      const X = i * TILE;
      const Y = j * TILE;
      const h = hash(tx, ty, 77);
      const h2 = hash(tx, ty, 78);
      if (!d) {
        if (h < 0.35) ellipse(g, X + 4 + h2 * 8, Y + 4 + h * 20, 2 + h2 * 2, 1.5, 'rgba(58,56,50,0.5)');
      } else if (isReef(tx, ty)) {
        for (let k = 0; k < 3; k++) drawCoral(g, X + 4 + k * 4, Y + 6 + ((k * 5) % 7), hash(tx, ty, 80 + k), true);
      } else if (d <= 3) {
        g.fillStyle = 'rgba(255,246,214,0.35)';
        g.fillRect(X + 2 + Math.floor(h * 6), Y + 3 + Math.floor(h2 * 8), 5, 1);
        g.fillRect(X + 6 + Math.floor(h2 * 4), Y + 9 + Math.floor(h * 4), 4, 1);
        if (h < 0.04) drawStarfish(g, X + 8, Y + 8, h2 < 0.5 ? '#e8783a' : '#d8485a');
        else if (h > 0.86) for (let k = 0; k < 3; k++) px(g, X + 3 + k * 4, Y + 5 + ((k * 7 + Math.floor(h2 * 9)) % 8), '#8a8478');
        else if (d >= 2 && h > 0.6 && h < 0.7) drawSeagrass(g, X + 8, Y + 12, h2);
      } else if (d <= 9) {
        if (h < 0.3) drawCoral(g, X + 4 + Math.floor(h2 * 8), Y + 8 + Math.floor(h * 16), h2, false);
        else if (h < 0.42) drawSeagrass(g, X + 8, Y + 13, h2);
        else if (h > 0.96) drawStarfish(g, X + 8, Y + 8, '#f0a040');
      } else if (d <= 24) {
        if (h < 0.07) {
          ellipse(g, X + 8, Y + 9, 4 + h2 * 3, 3, '#2e4254');
          ellipse(g, X + 7, Y + 8, 3 + h2 * 2, 1.5, '#48627a');
        } else if (h > 0.9) for (let k = 0; k < 4; k++) px(g, X + 2 + k * 3, Y + 4 + ((k * 5 + Math.floor(h2 * 7)) % 9), 'rgba(16,30,44,0.6)');
        else if (h > 0.8 && h < 0.815) {
          ellipse(g, X + 8, Y + 8, 2, 1.5, '#3a2448');
          for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [-2, -2], [2, -2]]) px(g, X + 8 + dx, Y + 8 + dy, '#3a2448');
        }
      } else if (h < 0.02) {
        ellipse(g, X + 8, Y + 9, 4, 2.5, '#141e2c');
        ellipse(g, X + 7, Y + 8, 3, 1, '#1e2c3e');
      } else if (h > 0.994) {
        for (let k = 0; k < 3; k++) {
          rect(g, X + 5 + k * 3, Y + 6 + k, 1, 5 - k, '#c8c4b8');
          px(g, X + 5 + k * 3, Y + 5 + k, '#c83a3a');
        }
      }
    }
  }
}

function drawCoral(g, x, y, h, big) {
  const [c, tip] = CORALS[Math.floor(h * CORALS.length) % CORALS.length];
  const dark = shade(c, -0.3);
  if ((h * 7) % 1 < 0.5) {
    ellipse(g, x, y, big ? 4 : 3.5, big ? 3 : 2.5, dark);
    ellipse(g, x, y - 1, big ? 3 : 2.5, big ? 2 : 1.6, c);
    px(g, x - 1, y - 2, tip);
    px(g, x + 1, y - 1, tip);
    return;
  }
  const n = big ? 4 : 3;
  for (let k = 0; k < n; k++) {
    const bx = x - n + k * 2 + 1;
    const hgt = 3 + ((k * 3 + Math.floor(h * 10)) % 4);
    rect(g, bx, y - hgt, 1, hgt, c);
    px(g, bx, y - hgt - 1, tip);
  }
  rect(g, x - n, y, n * 2, 1, dark);
}

function drawStarfish(g, x, y, c) {
  for (const [dx, dy] of [[0, 0], [0, -1], [0, -2], [-1, 0], [-2, 0], [1, 0], [2, 0], [-1, 1], [-2, 2], [1, 1], [2, 2]]) px(g, x + dx, y + dy, c);
}

function drawSeagrass(g, x, y, h) {
  for (let k = 0; k < 4; k++) {
    const hgt = 4 + ((k * 3 + Math.floor(h * 10)) % 4);
    rect(g, x - 3 + k * 2, y - hgt, 1, hgt, k % 2 ? '#4a8a3a' : '#5ea24a');
  }
}

function drawSeabed(cx, cy) {
  ctx.fillStyle = '#0b1a2c';
  ctx.fillRect(0, 0, viewW, viewH);
  const i0 = Math.max(0, Math.floor(cx / BED_PX));
  const j0 = Math.max(0, Math.floor(cy / BED_PX));
  const i1 = Math.min(Math.ceil(MAP_W / BED) - 1, Math.floor((cx + viewW - 1) / BED_PX));
  const j1 = Math.min(Math.ceil(MAP_H / BED) - 1, Math.floor((cy + viewH - 1) / BED_PX));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) ctx.drawImage(bedChunk(i, j), i * BED_PX - cx, j * BED_PX - cy);
}

// A wavy net of light, tiling seamlessly, that drifts over the sunlit seabed.
let causticImg = null;
function caustics() {
  if (causticImg) return causticImg;
  const S = 96;
  causticImg = makeCanvas(S, S);
  const g = causticImg.getContext('2d');
  const w = (Math.PI * 2) / S;
  g.fillStyle = '#ffffff';
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = Math.sin(w * 2 * x + 1.4 * Math.sin(w * 3 * y)) + Math.sin(w * 2 * y + 1.4 * Math.sin(w * 3 * x + 1));
      if (Math.abs(v) < 0.14) g.fillRect(x, y, 1, 1);
    }
  }
  return causticImg;
}

// Sunlight down here: how much reaches this depth, through the cloud, by day.
const deepSun = (k) => Math.max(0, 1 - deep.dark * k) * (1 - nightness()) * (1 - weatherNow('grey') * 0.7);

function drawCaustics(cx, cy) {
  const k = deepSun(2.2);
  if (k <= 0.02) return;
  const img = caustics();
  const S = img.width;
  ctx.globalAlpha = 0.13 * k;
  for (const [sx, sy] of [[time * 5, time * 3], [-time * 4, time * 4.5]]) {
    const ox = (((-cx - sx) % S) + S) % S - S;
    const oy = (((-cy - sy) % S) + S) % S - S;
    for (let y = oy; y < viewH; y += S) for (let x = ox; x < viewW; x += S) ctx.drawImage(img, Math.round(x), Math.round(y));
  }
  ctx.globalAlpha = 1;
}

function drawLightRays(cx) {
  const k = deepSun(1.4);
  if (k <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const span = viewW + 260;
  const slant = viewH * 0.45;
  for (let i = 0; i < 6; i++) {
    const w = 14 + (i % 3) * 12;
    const x = ((((i * 173 - cx * 0.35 + Math.sin(time * 0.25 + i * 1.7) * 24) % span) + span) % span) - 130 + slant / 2;
    const a = 0.07 * k * (0.6 + 0.4 * Math.sin(time * 0.6 + i * 2.3));
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, `rgba(200,235,255,${a})`);
    grad.addColorStop(1, 'rgba(200,235,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w - slant, viewH);
    ctx.lineTo(x - slant - w * 0.6, viewH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Specks drifting in the water, nearer ones sliding past faster.
function drawMotes(cx, cy) {
  const W = viewW + 40;
  const H = viewH + 40;
  ctx.fillStyle = '#d8ecf4';
  for (let i = 0; i < 46; i++) {
    const p = 0.8 + hash(i, 2, 3) * 0.4;
    const x = ((((hash(i, 1, 3) * W * 3 - cx * p + Math.sin(time * 0.4 + i) * 6) % W) + W) % W) - 20;
    const y = ((((hash(i, 4, 3) * H * 3 - cy * p - time * (2 + hash(i, 5, 3) * 3)) % H) + H) % H) - 20;
    ctx.globalAlpha = 0.2 + hash(i, 6, 3) * 0.3;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawHullShadow(cx, cy) {
  const [x0, y0, x1, y1] = shipBox(shipObj.facing, shipObj.x, shipObj.y);
  if (!onScreen((x0 + x1) / 2, (y0 + y1) / 2, cx, cy, 80)) return;
  ctx.globalAlpha = 0.24;
  ellipse(ctx, Math.round((x0 + x1) / 2 - cx), Math.round((y0 + y1) / 2 - cy), (x1 - x0) / 2, (y1 - y0) / 2, '#04101e');
  ctx.globalAlpha = 1;
}

// ---------- drawing the world below ----------

function kelpAt(tx, ty) {
  const d = seaDepth((tx + 0.5) * TILE, (ty + 0.5) * TILE);
  if (d < 4 || d > 14) return false;
  const k = DEEP_SITES.kelp;
  const forest = Math.hypot(tx - k.x, ty - k.y) < k.r + 3;
  return hash(tx, ty, 91) < (forest ? 0.75 : d <= 9 ? 0.035 : 0.012);
}

function drawKelp(x, y, h) {
  const n = 5 + Math.floor(h * 6);
  const ph = h * 40;
  let sx = x;
  for (let k = 0; k < n; k++) {
    sx = x + Math.sin(time * 1.2 + ph + k * 0.45) * k * 0.7;
    const sy = y - k * 6;
    ctx.fillStyle = k % 2 ? '#4e7e24' : '#5a8a2a';
    ctx.fillRect(Math.round(sx), Math.round(sy - 6), 2, 6);
    if (k % 2) {
      ctx.fillStyle = '#7aa83a';
      ctx.fillRect(Math.round(sx + ((k >> 1) % 2 ? 2 : -3)), Math.round(sy - 4), 3, 2);
    }
  }
  ctx.fillStyle = '#8a9a3a';
  ctx.fillRect(Math.round(sx), Math.round(y - n * 6 - 2), 2, 2);
}

function drawReefFish(x, y, h) {
  const [body, fin] = REEF_FISH[Math.floor(h * REEF_FISH.length) % REEF_FISH.length];
  for (let k = 0; k < 3; k++) {
    const a = time * (0.8 + k * 0.25) + h * 10 + k * 2.1;
    const fx = Math.round(x + Math.cos(a) * (6 + k * 3));
    const fy = Math.round(y + Math.sin(a) * (3 + k));
    const dir = Math.sin(a) > 0 ? -1 : 1;
    rect(ctx, fx - 1, fy, 3, 2, body);
    px(ctx, fx - dir * 2, fy, fin);
    px(ctx, fx + dir, fy, '#10141c');
  }
}

// Scenery that sways or swims, from the tiles in view; kelp grows up from below the view's bottom edge too.
function sceneryItems(cx, cy, out) {
  const x0 = Math.floor(cx / TILE) - 1;
  const x1 = Math.floor((cx + viewW) / TILE) + 1;
  const y0 = Math.floor(cy / TILE) - 1;
  const y1 = Math.floor((cy + viewH) / TILE) + 5;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (kelpAt(tx, ty)) {
        const h = hash(tx, ty, 92);
        const x = (tx + 0.2 + h * 0.6) * TILE;
        const y = (ty + 0.5 + hash(tx, ty, 93) * 0.4) * TILE;
        out.push({ y, draw: () => drawKelp(x - cx, y - cy, h) });
      } else if (hash(tx, ty, 95) < 0.05) {
        const d = seaDepth((tx + 0.5) * TILE, (ty + 0.5) * TILE);
        if (d < 4 || d > 9) continue;
        const h = hash(tx, ty, 96);
        out.push({ y: (ty + 0.5) * TILE, draw: () => drawReefFish((tx + 0.5) * TILE - cx, (ty + 0.3) * TILE - cy, h) });
      }
    }
  }
}

function drawBig(img, x, y, cx, cy) {
  ctx.drawImage(img, Math.round(x - img.width / 2 - cx), Math.round(y - img.height / 2 - cy));
}

function drawSchoolDeep(s, cx, cy) {
  const spread = s.fleeT > 0 ? 1.8 : 1;
  for (const f of s.fish) {
    const a = time * f.s + f.a;
    const x = Math.round(s.x + Math.cos(a) * f.r * spread - cx);
    const y = Math.round(s.y + Math.sin(a) * f.r * 0.5 * spread - cy);
    const dir = Math.sin(a) > 0 ? -1 : 1;
    rect(ctx, x - 1, y, 3, 1, '#d8e8f4');
    px(ctx, x - dir * 2, y, '#8fa8c0');
  }
}

function drawMantaDeep(m, cx, cy) {
  const c = Math.cos(m.heading);
  const s = Math.sin(m.heading);
  const flap = Math.sin(time * 1.8 + m.phase) * 4;
  const at = ([fx, fy]) => [Math.round(m.x - cx + (fx * c - fy * s) * 1.6), Math.round(m.y - cy + (fx * s + fy * c) * 1.1)];
  poly(ctx, [[9, 0], [flap - 1, -13], [-5, -2], [-7, 0], [-5, 2], [flap - 1, 13]].map(at), '#2a3850');
  poly(ctx, [[6, 0], [flap - 1, -9], [-3, -1], [-3, 1], [flap - 1, 9]].map(at), '#3a4c68');
  const [ax, ay] = at([-6, 0]);
  const [bx, by] = at([-18, Math.sin(time * 2 + m.phase) * 2]);
  line(ctx, ax, ay, bx, by, '#2a3850');
}

function lifeItems(cx, cy, out) {
  const A = deepArt();
  for (const s of seaLife.schools) if (onScreen(s.x, s.y, cx, cy)) out.push({ y: s.y, draw: () => drawSchoolDeep(s, cx, cy) });
  for (const p of seaLife.pods) {
    if (!onScreen(p.x, p.y, cx, cy, 80)) continue;
    for (const m of p.members) {
      const y = p.y + m.oy + Math.sin(time * 2 + m.phase) * 2;
      out.push({ y, draw: () => drawBig(p.face > 0 ? A.dolphin : A.dolphinL, p.x + m.ox, y, cx, cy) });
    }
  }
  for (const w of seaLife.whales) if (onScreen(w.x, w.y, cx, cy, 140)) out.push({ y: w.y, draw: () => drawBig(w.face > 0 ? A.whale : A.whaleL, w.x, w.y, cx, cy) });
  for (const t of seaLife.turtles) {
    if (!onScreen(t.x, t.y, cx, cy)) continue;
    const f = Math.floor((time + t.phase) * 2.4) % 2;
    out.push({ y: t.y, draw: () => ctx.drawImage((t.face > 0 ? SEA_ART.turtle : SEA_ART.turtleL)[f], Math.round(t.x - 9 - cx), Math.round(t.y - 7 - cy)) });
  }
  for (const j of seaLife.jellies) {
    if (onScreen(j.x, j.y, cx, cy)) out.push({ y: j.y, draw: () => { drawJellies(j, cx, cy); ctx.globalAlpha = 1; } });
  }
  for (const s of seaLife.seals) {
    if (onScreen(s.x, s.y, cx, cy)) out.push({ y: s.y, draw: () => ctx.drawImage(Math.sin(time * 0.8 + s.phase) > 0 ? SEA_ART.seal : SEA_ART.sealL, Math.round(s.x - 4 - cx), Math.round(s.y - 4 - cy)) });
  }
  for (const m of seaLife.mantas) if (onScreen(m.x, m.y, cx, cy, 60)) out.push({ y: m.y, draw: () => drawMantaDeep(m, cx, cy) });
  for (const p of seaLife.orcas) {
    if (!onScreen(p.x, p.y, cx, cy, 90)) continue;
    for (const m of p.members) {
      if (busy(p, m)) continue;
      const y = p.y + m.oy + Math.sin(time * 1.4 + m.phase) * 2;
      const f = Math.floor(time * 3 + m.phase * 2) % 4;
      out.push({ y, draw: () => drawBig((p.face > 0 ? orcaArt().side : orcaArt().sideL)[f], p.x + m.ox, y, cx, cy) });
    }
  }
  for (const s of seaLife.sharks) if (onScreen(s.x, s.y, cx, cy, 60)) out.push({ y: s.y, draw: () => drawBig(s.face > 0 ? A.shark : A.sharkL, s.x, s.y, cx, cy) });
}

function drawShellDeep(s, cx, cy) {
  const x = Math.round(s.x - cx);
  const y = Math.round(s.y - cy);
  rect(ctx, x - 2, y - 1, 5, 2, '#f4b8a0');
  rect(ctx, x - 1, y - 2, 3, 1, '#f4b8a0');
  px(ctx, x, y - 1, '#d8846a');
  px(ctx, x - 1, y + 1, '#c06a50');
  px(ctx, x + 1, y + 1, '#c06a50');
  if (Math.sin(time * 2 + s.x * 0.37) > 0.94) px(ctx, x + 1, y - 2, '#ffffff');
}

function bedItems(cx, cy, out) {
  const b = seabed();
  const A = deepArt();
  for (const s of b.shells) if (s.day !== dayCount && onScreen(s.x, s.y, cx, cy, 10)) out.push({ y: s.y - 4, draw: () => drawShellDeep(s, cx, cy) });
  for (const c of b.clams) {
    if (!onScreen(c.x, c.y, cx, cy, 16)) continue;
    out.push({
      y: c.y,
      draw: () => {
        const x = Math.round(c.x - 7 - cx);
        const y = Math.round(c.y - 8 - cy);
        const ready = clamReady(c);
        ctx.drawImage(ready ? A.clam : A.clamOpen, x, y);
        if (ready && Math.sin(time * 1.6 + c.x * 0.21) > 0.9) px(ctx, x + 9, y + 4, '#ffffff');
      },
    });
  }
  const w = wreckAt();
  if (onScreen(w.x, w.y, cx, cy, 90)) out.push({ y: w.y - 6, draw: () => ctx.drawImage(A.wreck, Math.round(w.x - 40 - cx), Math.round(w.y - 20 - cy)) });
  for (const c of b.chests) {
    if (onScreen(c.x, c.y, cx, cy, 20)) out.push({ y: c.y, draw: () => ctx.drawImage(c.opened ? A.chestOpen : A.chest, Math.round(c.x - 7 - cx), Math.round(c.y - 11 - cy)) });
  }
  const t = b.trench;
  if (onScreen(t.x, t.y, cx, cy, 30)) out.push({ y: t.y, draw: () => ctx.drawImage(t.taken ? A.bigClamEmpty : A.bigClam, Math.round(t.x - 14 - cx), Math.round(t.y - 16 - cy)) });
  if (deep.bell) {
    const bl = deep.bell;
    out.push({
      y: bl.y + 4,
      draw: () => {
        const x = Math.round(bl.x - cx);
        const y = Math.round(bl.y - cy);
        rect(ctx, x, 0, 1, Math.max(0, y - 20), '#c4a46a');
        ctx.drawImage(A.bell, x - 10, y - 18 + Math.round(Math.sin(time * 0.9) * 1.5));
      },
    });
  }
}

// ---------- the diver and the orca, drawn ----------

const GEAR_INK = {
  fin: '#2f8a6a', finL: '#56b890', strap: '#3a3f48', glass: '#7ad0f0', glassL: '#e8faff', snorkel: '#e8a43a',
  brass: '#c98a2e', brassL: '#f2c46a', brassD: '#8a5a1e', port: '#3a6a8a', portL: '#bfe8ff', lantern: '#4a5560', glow: '#5ff0d8',
};
const ORCA_INK = { k: '#161b24', k2: '#28313f', rim: '#43536a', w: '#eef3f6', saddle: '#8d98a6', eye: '#7a8a9e', fin: '#2c3644' };
const KICK = [0, 1, 0, -1];

// The player's colours and the diving gear they have on, which every swimming and riding pose is drawn from.
function diverLook() {
  const look = player.look;
  const coat = look.coat;
  const tun = coat ? coat.body : look.tunic;
  const pants = look.pants || '#4b3a2a';
  return {
    look, sk: look.skin || PAL.skin, hair: look.hair, style: look.hairStyle, tun, tunD: coat ? coat.dark : shade(tun, -0.25),
    collar: coat ? coat.trim : look.collar, pants, farPants: shade(pants, -0.2), boots: '#33241a', belt: '#5a3a1e',
    fins: has('swimFins'), helmet: has('divingHelmet'), mask: has('divingMask') && !has('divingHelmet'), lantern: has('glowLantern'),
  };
}
const diverKey = (c) => `${c.look.id}|${c.look.coat?.id || ''}|${!!c.look.pack}|${+c.fins}${+c.helmet}${+c.mask}${+c.lantern}`;

function limb(g, pts, color) {
  for (let i = 1; i < pts.length; i++) line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], color, 2);
}
function handAt(g, c, pts) {
  const [x, y] = pts[pts.length - 1];
  rect(g, x - 1, y - 1, 2, 2, c.sk);
}
// A boot at the end of a leg, or a swim fin carrying on the way the leg points.
function footAt(g, c, pts, far = false) {
  const [x, y] = pts[pts.length - 1];
  const [x0, y0] = pts[pts.length - 2];
  const len = Math.hypot(x - x0, y - y0) || 1;
  const dx = (x - x0) / len;
  const dy = (y - y0) / len;
  if (!c.fins) return rect(g, x - 1, y - 1, 2, 2, far ? shade(c.boots, -0.2) : c.boots);
  line(g, x, y, x + dx * 4, y + dy * 4, far ? shade(GEAR_INK.fin, -0.25) : GEAR_INK.fin, 2);
  px(g, Math.round(x + dx * 2) - (dx < 0 ? 1 : 0), Math.round(y + dy * 2) - (dy < 0 ? 1 : 0), GEAR_INK.finL);
}
function lanternAt(g, x, y) {
  rect(g, x, y, 2, 3, GEAR_INK.lantern);
  rect(g, x, y + 1, 2, 1, GEAR_INK.glow);
}

// Heads: in profile facing right, seen from behind (heading up the screen), and from the front (heading down it).
// Each sits in a box 7 (profile) or 6 wide and 6 high from (x, y).
function headSide(g, c, x, y) {
  rect(g, x + 1, y + 1, 5, 5, c.sk);
  rect(g, x, y + 2, 7, 3, c.sk);
  px(g, x + 7, y + 3, c.sk);
  if (c.helmet) {
    rect(g, x - 2, y + 1, 1, 5, GEAR_INK.brassD);
    ellipse(g, x + 3, y + 3, 4.5, 4, GEAR_INK.brass);
    ellipse(g, x + 1, y + 1, 1.5, 1, GEAR_INK.brassL);
    ellipse(g, x + 5, y + 3.5, 1.6, 1.8, GEAR_INK.port);
    px(g, x + 4, y + 3, GEAR_INK.portL);
    return;
  }
  if (c.style === 'bald' || c.style === 'helmet') rect(g, x, y + 2, 2, 2, c.hair);
  else {
    rect(g, x, y, 5, 2, c.hair);
    rect(g, x, y, 2, 4, c.hair);
  }
  if (c.style === 'long') rect(g, x - 5, y + 1, 6, 2, c.hair);
  if (c.style === 'braids') {
    rect(g, x - 6, y + 1, 7, 1, c.hair);
    px(g, x - 7, y + 1, PAL.gold);
  }
  px(g, x + 5, y + 3, EYE);
  if (c.mask) {
    rect(g, x, y + 2, 4, 1, GEAR_INK.strap);
    rect(g, x + 4, y + 2, 3, 2, GEAR_INK.glass);
    px(g, x + 5, y + 2, GEAR_INK.glassL);
    rect(g, x + 2, y - 2, 1, 4, GEAR_INK.snorkel);
  }
}

function headBack(g, c, x, y) {
  rect(g, x, y + 1, 6, 5, c.sk);
  rect(g, x + 1, y, 4, 6, c.sk);
  if (c.helmet) {
    ellipse(g, x + 2.5, y + 3, 4, 4, GEAR_INK.brass);
    rect(g, x + 1, y, 2, 1, GEAR_INK.brassL);
    rect(g, x - 1, y + 6, 8, 1, GEAR_INK.brassD);
    return;
  }
  if (c.style === 'bald' || c.style === 'helmet') rect(g, x, y + 3, 6, 2, c.hair);
  else {
    rect(g, x, y + 1, 6, 5, c.hair);
    rect(g, x + 1, y, 4, 6, c.hair);
    px(g, x - 1, y + 3, c.sk);
    px(g, x + 6, y + 3, c.sk);
  }
  if (c.style === 'long') rect(g, x, y + 5, 6, 4, c.hair);
  if (c.style === 'braids') {
    for (const bx of [x + 1, x + 4]) {
      rect(g, bx, y + 6, 1, 4, c.hair);
      px(g, bx, y + 10, PAL.gold);
    }
  }
  if (c.mask) {
    rect(g, x, y + 3, 6, 1, GEAR_INK.strap);
    rect(g, x + 5, y - 2, 1, 4, GEAR_INK.snorkel);
  }
}

function headFront(g, c, x, y) {
  if (c.style === 'long' && !c.helmet) rect(g, x, y - 3, 6, 4, c.hair);
  if (c.style === 'braids' && !c.helmet) {
    for (const bx of [x + 1, x + 4]) {
      rect(g, bx, y - 4, 1, 4, c.hair);
      px(g, bx, y - 5, PAL.gold);
    }
  }
  rect(g, x, y + 1, 6, 5, c.sk);
  rect(g, x + 1, y, 4, 6, c.sk);
  if (c.helmet) {
    rect(g, x - 1, y - 1, 8, 1, GEAR_INK.brassD);
    ellipse(g, x + 2.5, y + 2.5, 4, 4, GEAR_INK.brass);
    rect(g, x + 1, y, 2, 1, GEAR_INK.brassL);
    ellipse(g, x + 2.5, y + 4, 2, 1.3, GEAR_INK.port);
    px(g, x + 1, y + 3, GEAR_INK.portL);
    return;
  }
  if (c.style === 'bald' || c.style === 'helmet') {
    rect(g, x, y + 1, 1, 2, c.hair);
    rect(g, x + 5, y + 1, 1, 2, c.hair);
  } else {
    rect(g, x, y + 1, 6, 2, c.hair);
    rect(g, x + 1, y, 4, 1, c.hair);
    px(g, x, y + 3, c.hair);
    px(g, x + 5, y + 3, c.hair);
  }
  px(g, x + 1, y + 3, EYE);
  px(g, x + 4, y + 3, EYE);
  if (c.mask) {
    rect(g, x, y + 3, 6, 2, GEAR_INK.glass);
    px(g, x + 1, y + 3, GEAR_INK.glassL);
    rect(g, x + 6, y - 1, 1, 4, GEAR_INK.snorkel);
  }
}

// Breaststroke, four frames: a glide with the arms out front, the pull, arms tucked in and knees drawn up, then the kick.
// In profile (facing right) the diver lies flat, head to the right.
const SIDE_ARMS = [
  [[22, 9], [33, 10]],
  [[22, 9], [25, 14]],
  [[22, 9], [24, 12], [27, 11]],
  [[22, 9], [30, 11]],
];
const SIDE_LEGS = [
  [[14, 9], [5, 10]],
  [[14, 9], [5, 10]],
  [[14, 9], [10, 12], [6, 9]],
  [[14, 9], [5, 13]],
];
const SIDE_FAR_LEGS = [
  [[14, 7], [5, 7]],
  [[14, 7], [5, 7]],
  [[14, 7], [10, 10], [6, 6]],
  [[14, 7], [5, 4]],
];
function swimSide(c, f) {
  return sprite(36, 16, (g) => {
    const farArm = SIDE_ARMS[f].map(([x, y]) => [x, y - 2]);
    limb(g, farArm, shade(c.tunD, -0.25));
    handAt(g, c, farArm);
    limb(g, SIDE_FAR_LEGS[f], c.farPants);
    footAt(g, c, SIDE_FAR_LEGS[f], true);
    limb(g, SIDE_LEGS[f], c.pants);
    footAt(g, c, SIDE_LEGS[f]);
    rect(g, 14, 6, 9, 5, c.tun);
    rect(g, 14, 10, 9, 1, c.tunD);
    rect(g, 15, 6, 1, 5, c.belt);
    if (c.collar) rect(g, 22, 6, 1, 5, c.collar);
    if (c.look.pack) {
      rect(g, 16, 4, 5, 2, PACK);
      rect(g, 16, 4, 5, 1, PACK_D);
    }
    if (c.lantern) lanternAt(g, 16, 11);
    headSide(g, c, 23, 4);
    limb(g, SIDE_ARMS[f], c.tunD);
    handAt(g, c, SIDE_ARMS[f]);
  });
}

// Seen from above with the head up the screen; heading down, the body is flipped and the face drawn on the right way up.
const VERT_ARMS = [
  [[[6, 10], [8, 1]], [[14, 10], [12, 1]]],
  [[[6, 10], [1, 6]], [[14, 10], [19, 6]]],
  [[[6, 10], [2, 11], [6, 7]], [[14, 10], [18, 11], [14, 7]]],
  [[[6, 10], [4, 3]], [[14, 10], [16, 3]]],
];
const VERT_LEGS = [
  [[[8, 17], [8, 25]], [[12, 17], [12, 25]]],
  [[[8, 17], [8, 25]], [[12, 17], [12, 25]]],
  [[[8, 17], [4, 21], [7, 25]], [[12, 17], [16, 21], [13, 25]]],
  [[[8, 17], [4, 25]], [[12, 17], [16, 25]]],
];
function swimVert(c, f, down) {
  const H = 30;
  return sprite(20, H, (g) => {
    if (down) g.setTransform(1, 0, 0, -1, 0, H);
    for (const l of VERT_LEGS[f]) {
      limb(g, l, c.pants);
      footAt(g, c, l);
    }
    rect(g, 6, 9, 8, 8, c.tun);
    rect(g, 13, 9, 1, 8, c.tunD);
    if (c.collar) rect(g, 6, 9, 8, 1, c.collar);
    rect(g, 6, 15, 8, 1, c.belt);
    if (c.look.pack) {
      rect(g, 7, 10, 6, 4, PACK);
      rect(g, 7, 10, 6, 1, PACK_D);
    }
    if (c.lantern) lanternAt(g, 14, 13);
    if (!down) headBack(g, c, 7, 2);
    for (const a of VERT_ARMS[f]) {
      limb(g, a, c.tunD);
      handAt(g, c, a);
    }
    if (down) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      headFront(g, c, 7, 21);
    }
  });
}

// The orca, at its own size and to scale with the diver (a female orca is about three and a half times as long as a
// person), traced from a reference drawing: in profile, and from above heading down or up the screen. Four frames of
// the tail beating.
// Drawn facing left, mirrored to face right: k black, w white, g the grey saddle, e the eye.
const ORCA_MAP = [
  '.........................................kkk........................................',
  '........................................kkk.........................................',
  '.......................................kkkk.........................................',
  '.......................................kkkk.........................................',
  '......................................kkkkk.........................................',
  '.....................................kkkkkk.........................................',
  '.....................................kkkkkk.........................................',
  '....................................kkkkkkkk........................................',
  '...................................kkkkkkkkk........................................',
  '.................................kkkkkkkkkggg.......................................',
  '...........................kkkkkkkkkkkkggggggggg....................................',
  '......................kkkkkkkkkkkkkkkkkggggggkkkkkk.................................',
  '..................kkkkkkkkkkkkkkkkkkkkkkggggkkkkkkkkk...............................',
  '...............kkkkkkkkkkkkkkkkkkkkkkkkkgggkkkkkkkkkkkkk............................',
  '............kkkkkkkkkkkkkkkkkkkkkkkkkkkkggkkkkkkkkkkkkkkkk..........................',
  '..........kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.......................',
  '........kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....................',
  '......kkkkkkkkwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...................',
  '....kkkkkkkwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.................',
  '...kkkkkkkwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...............',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..............',
  '..kkkkekkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk............',
  '.kkkkkkkkkwwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwwwwwwkkkkkkkkkkkkkk...........',
  '.kkkkkkwwwwwwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwwwwwwwwwwkkkkkkkkkkkkk.........',
  'kkkkkwwwwwwwwwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwwwwwwwwwwwkkkkkkkkkkkkkk........',
  'kkkwwwwwwwwwwwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwwwwwwwwwwwkkkkkkkkkkkkkkkkk......',
  '.kwwwwwwwwwwwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '...wwwwwwwwwwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '......wwwwwwwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkwwwwwwwkkkkkkkkkkkkkkkkkkkkkkkkkkkk....',
  '..............wwwwwwkkkkkkkkwwwwwwwwwwwwwwwwwwwwwwwwwk...................kkkkkkkk...',
  '....................kkkkkkkk.................................................kwwkk..',
  '.....................kkkkkkk.....................................................kk.',
  '......................kkkkkk......................................................kk',
  '.........................kk.......................................................kk',
  '..................................................................................kk',
];
const ORCA_TAIL = 62;

function orcaSide(f) {
  const I = ORCA_INK;
  const W = ORCA_MAP[0].length;
  const colors = { k: I.k, w: I.w, g: I.saddle, e: I.eye };
  const c = sprite(W, ORCA_MAP.length + 4, (g) => {
    for (let x = 0; x < W; x++) {
      const dy = x > ORCA_TAIL ? Math.round(KICK[f] * ((x - ORCA_TAIL) / (W - ORCA_TAIL)) ** 2 * 2.5) : 0;
      let edge = 0;
      ORCA_MAP.forEach((row, y) => {
        const ch = row[x];
        if (ch === '.') return;
        const color = ch === 'k' && edge === 0 ? I.rim : ch === 'k' && edge === 1 && x < 70 ? I.k2 : colors[ch];
        px(g, W - 1 - x, y + 1 + dy, color);
        edge++;
      });
    }
  }, false);
  return outline(c, '#0a0d14');
}

// Seen from above: `u` runs from the tip of the flukes (0) to the snout (1), widest just behind the flippers.
const ORCA_LEN = 68;
function orcaHalfWidth(u) {
  if (u < 0.3) return 2 + (u - 0.17) / 0.13;
  if (u < 0.62) return 3 + ((u - 0.3) / 0.32) * 5;
  if (u < 0.82) return 8 - ((u - 0.62) / 0.2) * 0.6;
  return 7.4 * Math.sqrt(Math.max(0, 1 - ((u - 0.82) / 0.185) ** 2));
}
const ORCA_FIN = 0.58;

function orcaTop(f, down) {
  const I = ORCA_INK;
  const L = ORCA_LEN;
  const Y = (u) => (down ? 4 + u * L : 71 - u * L);
  const bb = (KICK[f] * 1.5) / L;
  const sp = [1, 0.85, 1, 0.85][f];
  const fl = KICK[f] * 0.012;
  const c = sprite(40, 76, (g) => {
    const P = (pts) => pts.map(([x, u]) => [x, Y(u)]);
    poly(g, P([[18, 0.2], [22, 0.2], [22, 0.14], [20 + 15 * sp, 0.05 + bb], [20 + 14 * sp, 0.015 + bb], [20 + 5 * sp, 0.04], [20, 0.02],
      [20 - 5 * sp, 0.04], [20 - 14 * sp, 0.015 + bb], [20 - 15 * sp, 0.05 + bb], [18, 0.14]]), I.k);
    for (const s of [1, -1]) {
      const X = (x) => 20 + s * x;
      poly(g, P([[X(7), 0.75], [X(16), 0.67 + fl], [X(15.5), 0.62 + fl], [X(6.5), 0.68]]), I.k);
    }
    for (let a = Math.round(0.17 * L); a <= L; a++) {
      const u = a / L;
      const w = Math.round(orcaHalfWidth(u));
      const y = Math.round(Y(u));
      if (w < 1) continue;
      rect(g, 20 - w, y, 2 * w, 1, I.k);
      if (u > 0.22 && u < 0.96) rect(g, 19, y, 2, 1, I.k2);
      if (u > 0.3) px(g, 20 - w, y, I.rim);
      if (u >= 0.85 && u <= 0.92) {
        rect(g, 21 - w, y, 2, 1, I.w);
        rect(g, 17 + w, y, 2, 1, I.w);
      }
      if (u >= 0.49 && u <= 0.54 && w > 2) rect(g, 21 - w, y, 2 * w - 2, 1, u > 0.5 && u < 0.53 ? I.saddle : shade(I.saddle, -0.3));
    }
    if (down) {
      rect(g, 18, Math.round(Y(0.97)), 4, 1, I.w);
      rect(g, 19, Math.round(Y(0.99)), 2, 1, I.w);
    }
    const yb = Math.round(Y(ORCA_FIN));
    const tip = down ? 14 : 10;
    rect(g, 21, yb - tip + 2, 1, tip - 1, '#0c0f15');
    poly(g, [[19, yb + 1], [21, yb + 1], [20.6, yb - tip], [19.4, yb - tip]], I.fin);
    rect(g, 19, yb - tip + 1, 1, tip, I.rim);
  }, false);
  return outline(c, '#0a0d14');
}

let orcaArtCache = null;
function orcaArt() {
  if (orcaArtCache) return orcaArtCache;
  const side = [0, 1, 2, 3].map(orcaSide);
  orcaArtCache = {
    side, sideL: side.map(mirror),
    down: [0, 1, 2, 3].map((f) => orcaTop(f, true)),
    up: [0, 1, 2, 3].map((f) => orcaTop(f, false)),
  };
  return orcaArtCache;
}

// The diver lying along the orca's back behind the dorsal fin, the body tilted down the slope of it toward the tail,
// both hands on the fin. Drawn in the orca sprite's own coordinates, facing right.
function riderSide(c, f) {
  const k = KICK[f];
  return sprite(ORCA_MAP[0].length, ORCA_MAP.length + 4, (g) => {
    g.translate(0, 1);
    const farLeg = [[23, 12], [14, 16 - k]];
    const nearLeg = [[23, 14], [14, 18 + k]];
    const farArm = [[30, 9], [40, 6]];
    const nearArm = [[30, 11], [36, 10], [40, 8]];
    limb(g, farLeg, c.farPants);
    footAt(g, c, farLeg, true);
    limb(g, nearLeg, c.pants);
    footAt(g, c, nearLeg);
    limb(g, farArm, shade(c.tunD, -0.25));
    handAt(g, c, farArm);
    line(g, 23, 13, 30, 10, c.tun, 4);
    line(g, 22, 14, 29, 11, c.tunD);
    rect(g, 24, 11, 1, 4, c.belt);
    if (c.collar) rect(g, 30, 8, 1, 4, c.collar);
    if (c.look.pack) line(g, 25, 10, 28, 8, PACK, 2);
    if (c.lantern) lanternAt(g, 25, 15);
    headSide(g, c, 31, 5);
    limb(g, nearArm, c.tunD);
    handAt(g, c, nearArm);
  });
}

function riderTop(c, f, down) {
  const k = KICK[f];
  return sprite(40, 76, (g) => {
    if (down) {
      for (const [x, s] of [[18, 1], [22, -1]]) {
        const leg = [[x, 16], [x, 11 + k * s]];
        limb(g, leg, c.pants);
        footAt(g, c, leg);
      }
      rect(g, 16, 16, 8, 7, c.tun);
      rect(g, 23, 16, 1, 7, c.tunD);
      rect(g, 16, 17, 8, 1, c.belt);
      if (c.collar) rect(g, 16, 22, 8, 1, c.collar);
      if (c.look.pack) rect(g, 17, 18, 6, 3, PACK);
      if (c.lantern) lanternAt(g, 24, 17);
      for (const arm of [[[17, 22], [17, 26], [19, 29]], [[23, 22], [23, 26], [21, 29]]]) {
        limb(g, arm, c.tunD);
        handAt(g, c, arm);
      }
      headFront(g, c, 17, 23);
      return;
    }
    for (const [x, s] of [[18, 1], [22, -1]]) {
      const leg = [[x, 45], [x, 51 + k * s]];
      limb(g, leg, c.pants);
      footAt(g, c, leg);
    }
    rect(g, 16, 39, 8, 7, c.tun);
    rect(g, 23, 39, 1, 7, c.tunD);
    if (c.collar) rect(g, 16, 39, 8, 1, c.collar);
    rect(g, 16, 44, 8, 1, c.belt);
    if (c.look.pack) {
      rect(g, 17, 40, 6, 4, PACK);
      rect(g, 17, 40, 6, 1, PACK_D);
    }
    if (c.lantern) lanternAt(g, 24, 42);
    for (const arm of [[[17, 40], [17, 36], [19, 32]], [[23, 40], [23, 36], [21, 32]]]) {
      limb(g, arm, c.tunD);
      handAt(g, c, arm);
    }
    headBack(g, c, 17, 33);
  });
}

const swimCache = new Map();
function swimSprite(dir, f) {
  const c = diverLook();
  const key = `${diverKey(c)}|${dir}|${f}`;
  let s = swimCache.get(key);
  if (!s) {
    s = dir === 'left' || dir === 'right' ? swimSide(c, f) : swimVert(c, f, dir === 'down');
    if (dir === 'left') s = mirror(s);
    swimCache.set(key, s);
  }
  return s;
}

const rideCache = new Map();
function rideSprite(dir, f) {
  const c = diverLook();
  const key = `${diverKey(c)}|${dir}|${f}`;
  let s = rideCache.get(key);
  if (!s) {
    const side = dir === 'left' || dir === 'right';
    const base = side ? orcaArt().side[f] : orcaArt()[dir][f];
    s = makeCanvas(base.width, base.height);
    const g = s.getContext('2d');
    g.drawImage(base, 0, 0);
    g.drawImage(side ? riderSide(c, f) : riderTop(c, f, dir === 'down'), 0, 0);
    if (dir === 'left') s = mirror(s);
    rideCache.set(key, s);
  }
  return s;
}

// The diver's sprite this frame, where it sits against their feet, and where their head and the top of it are.
function diverPose() {
  const dir = player.dir;
  const side = dir === 'left' || dir === 'right';
  const r = dir === 'right';
  const bob = Math.round(Math.sin(time * 2.2) * 1.2);
  const moving = Math.hypot(deep.vx, deep.vy) > 6;
  if (deep.ride) {
    const v = Math.hypot(deep.vx, deep.vy);
    const f = Math.floor(time * (v > RIDE_SPEED * 1.3 ? 14 : moving ? 8 : 3)) % 4;
    if (side) return { img: rideSprite(dir, f), dx: -42, dy: -26 + bob, head: [r ? -8 : 7, -17 + bob], top: -26 + bob };
    return { img: rideSprite(dir, f), dx: -20, dy: -52 + bob, head: [0, (dir === 'down' ? -26 : -16) + bob], top: -52 + bob };
  }
  const f = moving ? player.frame : Math.floor(time * 1.5) % 4;
  if (side) return { img: swimSprite(dir, f), dx: -18, dy: -16 + bob, head: [r ? 8 : -9, -9 + bob], top: -16 + bob };
  return { img: swimSprite(dir, f), dx: -10, dy: -25 + bob, head: [0, (dir === 'down' ? -1 : -20) + bob], top: -25 + bob };
}

const diverTop = () => [player.x, player.y + diverPose().top];
const diverHead = () => {
  const { head: [hx, hy] } = diverPose();
  return [player.x + hx, player.y + hy];
};

function drawDiver(cx, cy) {
  const p = diverPose();
  ctx.drawImage(p.img, Math.round(player.x + p.dx - cx), Math.round(player.y + p.dy - cy));
}

// The orca swimming free down here: side on, or from above when it's going mostly up or down the screen.
function drawPalDeep(cx, cy) {
  const O = orcaArt();
  const f = Math.floor(time * 4) % 4;
  const bob = Math.round(Math.sin(time * 1.5) * 2);
  if (Math.hypot(pal.vx, pal.vy) > 8 && Math.abs(pal.vy) > Math.abs(pal.vx) * 1.2) {
    ctx.drawImage((pal.vy > 0 ? O.down : O.up)[f], Math.round(pal.x - 20 - cx), Math.round(pal.y - 52 + bob - cy));
  } else {
    ctx.drawImage((pal.face > 0 ? O.side : O.sideL)[f], Math.round(pal.x - 42 - cx), Math.round(pal.y - 26 + bob - cy));
  }
}

function drawBubbles(cx, cy) {
  for (const b of deep.bubbles) {
    if (b.t < 0) continue;
    const x = Math.round(b.x - cx);
    const y = Math.round(b.y - cy);
    ctx.globalAlpha = 0.75 * (1 - b.t / 2.2);
    if (b.r > 1) {
      ellipse(ctx, x, y, 1.5, 1.5, '#bfe8ff');
      px(ctx, x - 1, y - 1, '#ffffff');
    } else rect(ctx, x, y, 1, 1, '#e8faff');
  }
  ctx.globalAlpha = 1;
}

// The whole world pass while underwater; drawNight darkens it after, cutting holes for the lights below.
function drawDeep(cx, cy) {
  drawSeabed(cx, cy);
  drawCaustics(cx, cy);
  drawHullShadow(cx, cy);
  const items = [];
  lifeItems(cx, cy, items);
  bedItems(cx, cy, items);
  sceneryItems(cx, cy, items);
  if (pal.shown && !deep.ride) items.push({ y: pal.y, draw: () => drawPalDeep(cx, cy) });
  items.push({ y: player.y, draw: () => drawDiver(cx, cy) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  drawBubbles(cx, cy);
  ctx.fillStyle = 'rgba(18,84,150,0.16)';
  ctx.fillRect(0, 0, viewW, viewH);
  drawLightRays(cx);
  drawMotes(cx, cy);
  // without a mask everything's a blur
  if (!gearZone()) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(buffer, 0, 0, viewW, viewH, 1, 0, viewW, viewH);
    ctx.drawImage(buffer, 0, 0, viewW, viewH, -1, 1, viewW, viewH);
    ctx.restore();
  }
  return { visible: [], flock: [], skyBaby: null };
}

// The lights that cut through the dark down here: the glow lantern (or what little the diver can make out without
// one), the bell's lamp, glowing jellies and the pearl in the trench.
function deepLights() {
  const [hx, hy] = diverHead();
  const out = [has('glowLantern') ? { x: hx, y: hy + 2, r: 84, k: 1, glow: 22, color: '#6ff0e0' } : { x: hx, y: hy, r: 30, k: 0.55 }];
  if (deep.bell) out.push({ x: deep.bell.x, y: deep.bell.y - 10, r: 64, k: 0.95, glow: 20, color: '#ffd27a' });
  for (const j of seaLife.jellies) {
    if (!onScreen(j.x, j.y, cam.x, cam.y)) continue;
    for (const m of j.members) out.push({ x: j.x + m.ox, y: j.y + m.oy, r: 12, k: 0.7, glow: 6, color: j.tint });
  }
  const t = seabed().trench;
  if (!t.taken && onScreen(t.x, t.y, cam.x, cam.y, 60)) out.push({ x: t.x, y: t.y - 6, r: 46, k: 0.9, glow: 16, color: '#9fc0ff' });
  return out;
}

// Air left, as bubbles over the diver's head: one for every five seconds, drawn over the dark.
function drawDeepHud(cx, cy) {
  if (!deep.on || fade) return;
  const max = airMax();
  const n = Math.ceil(max / 5);
  const left = Math.ceil(deep.air / 5);
  const x0 = Math.round(player.x - cx - (n * 6 - 2) / 2);
  const y = Math.round(diverTop()[1] - cy - 5);
  const low = deep.air < max * 0.3 && !inBell();
  const blink = low && Math.floor(time * 4) % 2;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 6 + 2;
    if (i >= left) {
      ctx.globalAlpha = 0.3;
      ellipse(ctx, x, y, 2, 2, '#5a7a90');
      ctx.globalAlpha = 1;
      continue;
    }
    ellipse(ctx, x, y, 2, 2, blink ? '#ffb0a0' : '#e8faff');
    ellipse(ctx, x, y, 1, 1, blink ? '#ff5a4a' : '#7ac8f0');
    px(ctx, x - 1, y - 1, '#ffffff');
  }
}

// ---------- saving ----------

function saveDeep() {
  const b = seabed();
  return {
    pal: { friend: pal.friend, fed: pal.fed },
    found: { ...deep.found },
    clams: b.clams.flatMap((c, i) => (c.day > -99 ? [[i, +c.day.toFixed(2)]] : [])),
    shells: b.shells.flatMap((s, i) => (s.day === dayCount ? [i] : [])),
    chests: b.chests.flatMap((c, i) => (c.opened ? [i] : [])),
    trench: b.trench.taken,
  };
}

function restoreDeep(s) {
  if (!s) return;
  Object.assign(pal, s.pal);
  Object.assign(deep.found, s.found);
  const b = seabed();
  for (const [i, day] of s.clams || []) if (b.clams[i]) b.clams[i].day = day;
  for (const i of s.shells || []) if (b.shells[i]) b.shells[i].day = dayCount;
  for (const i of s.chests || []) if (b.chests[i]) b.chests[i].opened = true;
  b.trench.taken = !!s.trench;
}
