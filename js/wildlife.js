// Wild animals: deer, boar and rabbits to hunt for meat, foxes, goats and frogs that just live here, and the snakes
// that lie in wait in the jungle maze.

// `hp`, `meat` and `hide` only for game animals. Speeds in px/s; `shy` is how close the player can get before it bolts,
// `range` how far from home it wanders, `box` the half-width an arrow or blade has to land within.
const WILD = {
  deer: { name: 'deer', hp: 2, meat: 2, hide: 1, walk: 20, run: 100, shy: 72, alert: 120, range: 64, box: 10, tiles: [T.GRASS, T.DIRT], call: 'snort', every: [14, 30] },
  boar: { name: 'boar', hp: 4, meat: 3, hide: 1, walk: 14, run: 70, charge: 95, shy: 0, range: 48, box: 9, tiles: [T.GRASS, T.DIRT, T.JUNGLE], call: 'grunt', every: [6, 14] },
  rabbit: { name: 'rabbit', hp: 1, meat: 1, walk: 28, run: 105, shy: 48, range: 40, box: 5, tiles: [T.GRASS], hops: true },
  fox: { name: 'fox', walk: 22, run: 90, shy: 40, watch: 90, range: 64, box: 7, tiles: [T.SNOW, T.GRASS, T.ROCK], call: 'yip', every: [16, 34] },
  goat: { name: 'goat', walk: 12, run: 70, shy: 34, range: 44, box: 7, tiles: [T.ROCK, T.GRASS, T.SNOW], call: 'bleat', every: [10, 24] },
  frog: { name: 'frog', walk: 34, shy: 26, range: 14, box: 4, tiles: [T.GRASS, T.JUNGLE, T.SAND, T.DIRT], hops: true, call: 'croak', every: [5, 12] },
  sealion: { name: 'sea lion', hp: 2, meat: 3, hide: 1, box: 11 },
  snake: { name: 'snake', hp: 1, meat: 0, walk: 10, lunge: 40, strike: 170, shy: 0, range: 28, box: 7, tiles: [T.JUNGLE] },
};
const huntable = (a) => !!WILD[a.kind].hp;

// Where each lot lives: a box in village-local tiles, or a whole island.
const local = (x0, y0, x1, y1) => ({ x0: x0 + OX, y0: y0 + OY, x1: x1 + OX, y1: y1 + OY });
function mazeBox() {
  const j = isle('jungle');
  const { cols, rows, pitch } = JUNGLE_MAZE;
  return { x0: j.x - (cols * pitch) / 2, y0: j.y - (rows * pitch) / 2, x1: j.x + (cols * pitch) / 2, y1: j.y + (rows * pitch) / 2 };
}
const HERDS = [
  { kind: 'deer', n: 3, area: local(4, 20, 34, 46) },
  { kind: 'deer', n: 3, area: local(6, 62, 36, 96) },
  { kind: 'deer', n: 2, isle: 'hermit' },
  { kind: 'boar', n: 2, area: local(8, 66, 38, 100) },
  { kind: 'boar', n: 3, isle: 'jungle' },
  { kind: 'rabbit', n: 4, area: local(116, 64, 134, 96) },
  { kind: 'rabbit', n: 2, area: local(10, 10, 26, 24) },
  { kind: 'rabbit', n: 3, isle: 'ruin' },
  { kind: 'goat', n: 3, area: local(96, 28, 126, 40) },
  { kind: 'goat', n: 2, area: local(12, 8, 24, 30) },
  { kind: 'fox', n: 2, area: local(38, 4, 60, 26) },
  { kind: 'fox', n: 2, isle: 'frozen', look: 'arcticFox' },
  { kind: 'frog', n: 4, area: local(12, 44, 32, 64) },
  { kind: 'frog', n: 2, isle: 'jungle' },
  { kind: 'snake', n: 11, area: mazeBox() },
];
const RESPAWN = 240;
const DOWN_TIME = 0.6;
const ACTIVE_RANGE = 700;
const animals = [];

function nearWet(tx, ty, r) {
  let best = null;
  let bd = Infinity;
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      if (!isWet(tileAt(tx + i, ty + j)) || ty + j >= MAP_H) continue;
      const d = i * i + j * j;
      if (d < bd) { bd = d; best = { x: (tx + i + 0.5) * TILE, y: (ty + j + 0.8) * TILE }; }
    }
  }
  return best;
}

const habitat = (kind, x, y) => WILD[kind].tiles.includes(tileAt(Math.floor(x / TILE), Math.floor((y - 1) / TILE)));

// Runs before main.js defines canStand, so it asks `blocked` directly.
function spawnSpot(h, rng, probe) {
  const i = h.isle && isle(h.isle);
  const box = i ? { x0: i.x - i.rx, y0: i.y - i.ry, x1: i.x + i.rx, y1: i.y + i.ry } : h.area;
  for (let k = 0; k < 200; k++) {
    const tx = box.x0 + rng() * (box.x1 - box.x0);
    const ty = box.y0 + rng() * (box.y1 - box.y0);
    if (i && Math.hypot((tx - i.x) / i.rx, (ty - i.y) / i.ry) > 1) continue;
    const x = tx * TILE;
    const y = ty * TILE;
    if (!habitat(h.kind, x, y) || blocked(x - 5, y - 4, x + 5, y, probe)) continue;
    const pond = h.kind === 'frog' ? nearWet(Math.floor(tx), Math.floor(ty), 2) : null;
    if (h.kind === 'frog' && !pond) continue;
    return { x, y, pond };
  }
  return null;
}

function initWildlife() {
  const rng = mulberry32(2024);
  const probe = {};
  for (const h of HERDS) {
    for (let n = 0; n < h.n; n++) {
      const at = spawnSpot(h, rng, probe);
      if (!at) continue;
      const look = h.look || (h.kind === 'deer' && n % 3 === 0 ? 'stag' : h.kind);
      const w = WILD[h.kind];
      animals.push({
        kind: h.kind, look, x: at.x, y: at.y, home: { x: at.x, y: at.y }, pond: at.pond, dir: rng() < 0.5 ? 'left' : 'right',
        state: 'idle', timer: rng() * 3, anim: 0, lift: 0, hp: w.hp || 0, hurtT: 0, fleeT: 0, target: null, stuck: 0,
        callT: w.every ? w.every[0] + rng() * w.every[1] : 0, croakT: 0, respawnT: 0, t: 0,
      });
    }
  }
}

// ---------- behaviour ----------

const playerAbout = () => !indoors && !sail && !player.flying && !flight && !hop;
const awayFrom = (a, x, y) => {
  const d = Math.hypot(a.x - x, a.y - y) || 1;
  return [(a.x - x) / d, (a.y - y) / d];
};

// Turns aside when the way is blocked, and back toward home once it has run too far.
function steer(a, ux, uy, sp, dt) {
  const w = WILD[a.kind];
  const hd = Math.hypot(a.home.x - a.x, a.home.y - a.y);
  if (hd > w.range * 2.2) {
    ux = ux * 0.3 + ((a.home.x - a.x) / hd) * 0.7;
    uy = uy * 0.3 + ((a.home.y - a.y) / hd) * 0.7;
  }
  const s = sp * dt;
  if (move(a, ux * s, uy * s)) {
    a.stuck = 0;
  } else {
    a.stuck += dt;
    const side = a.dodge || (a.dodge = Math.random() < 0.5 ? 1 : -1);
    if (!move(a, -uy * side * s, ux * side * s)) a.dodge = -side;
  }
  if (Math.abs(ux) > 0.15) a.dir = ux > 0 ? 'right' : 'left';
}

function startle(a) {
  if (a.kind === 'boar') return;
  for (const b of animals) {
    if (b.kind !== a.kind || b.state === 'down' || b.state === 'gone' || b.state === 'dive') continue;
    if (b !== a && Math.hypot(b.x - a.x, b.y - a.y) > 90) continue;
    if (b.kind === 'frog') {
      Object.assign(b, { state: 'leap', t: 0, from: { x: b.x, y: b.y } });
      continue;
    }
    if (b.state !== 'flee') Object.assign(b, { state: 'flee', fleeT: 1.6 + Math.random() });
  }
}

function pickWander(a) {
  const w = WILD[a.kind];
  for (let i = 0; i < 8; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.random() * w.range;
    const x = a.home.x + Math.cos(ang) * r;
    const y = a.home.y + Math.sin(ang) * r * 0.7;
    if (habitat(a.kind, x, y) && canStand(a, x, y)) return { x, y };
  }
  return null;
}

function updateAnimal(a, dt) {
  const w = WILD[a.kind];
  if (a.hurtT > 0) a.hurtT -= dt;
  if (a.croakT > 0) a.croakT -= dt;
  if (a.state === 'down') {
    if ((a.t += dt) >= DOWN_TIME) dropMeat(a);
    return;
  }
  if (a.state === 'gone') {
    if ((a.respawnT -= dt) <= 0 && Math.hypot(player.x - a.home.x, player.y - a.home.y) > 320) {
      Object.assign(a, { x: a.home.x, y: a.home.y, state: 'idle', timer: 2, hp: w.hp || 0, lift: 0 });
    }
    return;
  }
  if (a.state === 'dive') {
    if ((a.t -= dt) <= 0 && Math.hypot(player.x - a.home.x, player.y - a.home.y) > 60) {
      Object.assign(a, { x: a.home.x, y: a.home.y, state: 'idle', timer: 2 });
      seaSplash(a.pond.x, a.pond.y, 0.3);
    }
    return;
  }
  ambientCall(a, dt);
  const dist = Math.hypot(player.x - a.x, player.y - a.y);
  const near = playerAbout() && !player.swimming;
  const shy = w.shy * (player.running ? 1.4 : 1);
  if (a.kind === 'boar') return updateBoar(a, dt, dist, near);
  if (a.kind === 'snake') return updateSnake(a, dt, dist, near);
  if (a.state === 'leap') return updateLeap(a, dt);
  if (a.state === 'pounce') return updatePounce(a, dt);
  if (near && dist < shy && a.state !== 'flee') startle(a);

  if (a.state === 'flee') {
    const [ux, uy] = awayFrom(a, player.x, player.y);
    steer(a, ux, uy, w.run, dt);
    a.anim += dt * (w.hops ? 7 : 12);
    a.lift = w.hops ? Math.abs(Math.sin(a.anim * Math.PI)) * 4 : 0;
    if ((a.fleeT -= dt) <= 0 && !(near && dist < shy * 1.5)) Object.assign(a, { state: 'idle', timer: 1 + Math.random() * 2, lift: 0 });
    return;
  }
  // a deer that hears you coming lifts its head and stares; a fox sits and watches
  const wary = near && dist < (w.alert || w.watch || 0);
  if (wary && a.state !== 'walk') {
    a.dir = player.x > a.x ? 'right' : 'left';
    a.state = 'watch';
    a.timer = 1.5;
    return;
  }
  if (a.state === 'walk') {
    const dx = a.target.x - a.x;
    const dy = a.target.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 2 || a.stuck > 0.6) {
      Object.assign(a, { state: Math.random() < 0.6 ? 'graze' : 'idle', timer: 2 + Math.random() * 4, lift: 0, stuck: 0 });
      return;
    }
    steer(a, dx / d, dy / d, w.walk, dt);
    a.anim += dt * (w.hops ? 4 : 5);
    a.lift = w.hops ? Math.abs(Math.sin(a.anim * Math.PI)) * (a.kind === 'frog' ? 3 : 2) : 0;
    return;
  }
  if ((a.timer -= dt) > 0) return;
  if (a.kind === 'fox' && Math.random() < 0.3 && habitat('fox', a.x, a.y)) {
    Object.assign(a, { state: 'pounce', t: 0, from: { x: a.x, y: a.y } });
    return;
  }
  a.target = pickWander(a);
  if (a.target) Object.assign(a, { state: 'walk', stuck: 0 });
  else a.timer = 1;
}

// A frog makes for its pond in two big hops and vanishes with a plop.
function updateLeap(a, dt) {
  a.t += dt;
  const k = Math.min(1, a.t / 0.45);
  a.x = a.from.x + (a.pond.x - a.from.x) * k;
  a.y = a.from.y + (a.pond.y - a.from.y) * k;
  a.lift = Math.sin(k * Math.PI) * 7;
  if (Math.abs(a.pond.x - a.from.x) > 1) a.dir = a.pond.x > a.from.x ? 'right' : 'left';
  if (k < 1) return;
  Object.assign(a, { state: 'dive', t: 6 + Math.random() * 6, lift: 0 });
  seaSplash(a.pond.x, a.pond.y, 0.35);
  Sfx.plip(0.6 * earshot(a.x, a.y), 1);
}

// Foxes hunt mice under the snow: a hop up and a dive nose-first.
function updatePounce(a, dt) {
  a.t += dt;
  const k = Math.min(1, a.t / 0.7);
  const step = a.dir === 'right' ? 16 : -16;
  const x = a.from.x + step * k;
  if (canStand(a, x, a.y)) a.x = x;
  a.lift = Math.sin(k * Math.PI) * 11;
  if (k < 1) return;
  const snow = tileAt(Math.floor(a.x / TILE), Math.floor((a.y - 1) / TILE)) === T.SNOW;
  for (let i = 0; i < 6; i++) {
    particles.push({ type: snow ? 'steam' : 'dust', x: a.x + (step > 0 ? 6 : -6), y: a.y - 2, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 16, life: 0, max: 0.5 + Math.random() * 0.3 });
  }
  Sfx.land(0.4 * earshot(a.x, a.y));
  Object.assign(a, { state: 'sit', timer: 1.5 + Math.random() * 2, lift: 0 });
}

// Boars mind their own business until hurt; then they charge whoever did it.
function updateBoar(a, dt, dist, near) {
  const w = WILD.boar;
  if (a.state === 'stun') {
    if ((a.timer -= dt) <= 0) Object.assign(a, { state: 'sulk', timer: 3 });
    return;
  }
  if (a.state === 'charge') {
    if (!near || dist > 180 || (a.t -= dt) <= 0) {
      Object.assign(a, { state: 'idle', timer: 2 });
      return;
    }
    const [ux, uy] = awayFrom(a, player.x, player.y);
    steer(a, -ux, -uy, w.charge, dt);
    a.anim += dt * 12;
    if ((a.callT -= dt) <= 0) {
      a.callT = 0.6;
      Sfx.grunt(earshot(a.x, a.y));
    }
    if (dist < 12) gore(a, ux, uy);
    return;
  }
  if (a.state === 'sulk') {
    const [ux, uy] = awayFrom(a, player.x, player.y);
    steer(a, ux, uy, w.walk * 2.5, dt);
    a.anim += dt * 7;
    if ((a.timer -= dt) <= 0) Object.assign(a, { state: 'idle', timer: 1 });
    return;
  }
  if (a.state === 'walk') {
    const dx = a.target.x - a.x;
    const dy = a.target.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 2 || a.stuck > 0.6) {
      Object.assign(a, { state: Math.random() < 0.7 ? 'graze' : 'idle', timer: 2 + Math.random() * 4, stuck: 0 });
      return;
    }
    steer(a, dx / d, dy / d, w.walk, dt);
    a.anim += dt * 5;
    return;
  }
  if ((a.timer -= dt) > 0) return;
  a.target = pickWander(a);
  if (a.target) Object.assign(a, { state: 'walk', stuck: 0 });
  else a.timer = 1;
}

// A charging boar that reaches you knocks you flying, unless your shield is up.
function gore(a, ux, uy) {
  if (player.blockT > 0) {
    Object.assign(a, { state: 'stun', timer: 1.4 });
    a.x += ux * 6;
    a.y += uy * 3;
    a.hurtT = 0.3;
    Sfx.thunk(1);
    burst(a.x, a.y - 10, ['#ffffff', '#fff27a'], 8, 30);
    muse('Ha! Not today, piggy.');
    return;
  }
  player.knock = { vx: -ux * 160, vy: -uy * 160, t: 0.25 };
  player.chop = null;
  Sfx.thunk(1);
  Sfx.grunt(1);
  muse(['Oof!', 'Ow! That boar means business.', has('shield') ? 'Ouch! I should raise my shield as it charges...' : 'Ouch! A shield would come in handy...'][Math.min(2, stats.gored++)]);
  Object.assign(a, { state: 'sulk', timer: 2.5 });
}

// A snake lies still until you come close; then it coils, hissing, and lunges where you stood. Step back smartly
// while it coils and it falls short; a raised shield turns the fangs.
const BITE_TIME = 5;
const SNAKE_CLEAR = 2;
function updateSnake(a, dt, dist, near) {
  const w = WILD.snake;
  const prey = near && !(player.downT > 0) && !(player.clearT > 0);
  if (a.state === 'coil') {
    a.dir = player.x > a.x ? 'right' : 'left';
    if ((a.t -= dt) > 0) return;
    if (!prey || dist > w.lunge * 1.5) return Object.assign(a, { state: 'idle', timer: 1 });
    const d = dist || 1;
    Object.assign(a, { state: 'strike', t: 0.28, vx: ((player.x - a.x) / d) * w.strike, vy: ((player.y - a.y) / d) * w.strike });
    return;
  }
  if (a.state === 'strike') {
    move(a, a.vx * dt, a.vy * dt);
    if (prey && Math.hypot(player.x - a.x, player.y - a.y) < 10) return bite(a);
    if ((a.t -= dt) <= 0) Object.assign(a, { state: 'rest', timer: 1.6 });
    return;
  }
  if (a.state === 'rest' || a.state === 'stun') {
    if ((a.timer -= dt) <= 0) Object.assign(a, { state: 'idle', timer: 1 });
    return;
  }
  if (prey && dist < w.lunge) {
    Object.assign(a, { state: 'coil', t: 0.55, dir: player.x > a.x ? 'right' : 'left' });
    Sfx.hiss(0.7 * earshot(a.x, a.y));
    return;
  }
  if (a.state === 'walk') {
    const dx = a.target.x - a.x;
    const dy = a.target.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 2 || a.stuck > 0.6) return Object.assign(a, { state: 'idle', timer: 3 + Math.random() * 5, stuck: 0 });
    steer(a, dx / d, dy / d, w.walk, dt);
    a.anim += dt * 4;
    return;
  }
  if ((a.timer -= dt) > 0) return;
  a.target = pickWander(a);
  if (a.target) Object.assign(a, { state: 'walk', stuck: 0 });
  else a.timer = 2;
}

function bite(a) {
  if (player.blockT > 0) {
    Object.assign(a, { state: 'stun', timer: 1.4 });
    a.hurtT = 0.3;
    Sfx.thunk(1);
    burst(a.x, a.y - 6, ['#ffffff', '#fff27a'], 8, 30);
    muse('Ha! Not through my shield, snake.');
    return;
  }
  Object.assign(a, { state: 'rest', timer: 2.4 });
  Object.assign(player, { downT: BITE_TIME, clearT: BITE_TIME + SNAKE_CLEAR, chop: null, nock: null, fishing: null, knock: null, running: false, jumpT: -1, anim: 0, frame: 0 });
  Sfx.hiss(1);
  Sfx.thunk(0.8);
  burst(player.x, player.y - 8, ['#e0303a', '#ffffff'], 6, 24);
  const lines = ['Ow! A snake! My legs... I can\'t move...', 'Bitten again! Everything\'s gone numb...', has('shield') ? 'Numb again... raise the shield when one coils!' : 'Numb again... a shield would stop those fangs.'];
  muse(lines[Math.min(2, stats.bitten++)]);
}

// Lying where the snake left you until the venom wears off.
function updateDown(dt) {
  player.downT -= dt;
  player.anim = 0;
  player.frame = 0;
  if (Math.random() < dt * 3) particles.push({ type: 'sparkle', layer: 'sky', x: player.x + (Math.random() - 0.5) * 16, y: player.y - 10 - Math.random() * 6, vx: 0, vy: -8, life: 0, max: 0.6 });
  if (player.downT > 0) return;
  player.downT = 0;
  dust(player.x, player.y);
  if (stats.bitten === 1) muse('Phew, I can move again. Better watch for those snakes.');
}

function ambientCall(a, dt) {
  const w = WILD[a.kind];
  if (!w.call || (a.callT -= dt * (a.kind === 'frog' && nightness() > 0.5 ? 2.5 : 1)) > 0) return;
  a.callT = w.every[0] + Math.random() * w.every[1];
  const k = earshot(a.x, a.y);
  if (k < 0.15 || indoors) return;
  Sfx[w.call](0.5 * k);
  if (a.kind === 'frog') a.croakT = 0.5;
}

function updateWildlife(dt) {
  if (player.clearT > 0) player.clearT -= dt;
  const k = player.knock;
  if (k) {
    if (grounded() && !sail && !flight) move(player, k.vx * dt, k.vy * dt);
    if ((k.t -= dt) <= 0) player.knock = null;
  }
  for (const a of animals) {
    if (a.state === 'gone' || a.state === 'down' || Math.hypot(player.x - a.x, player.y - a.y) < ACTIVE_RANGE) updateAnimal(a, dt);
  }
}

// ---------- hunting ----------

const MELEE = { sword: 2, spear: 3, axe: 1 };
const ARROW_DAMAGE = 2;
const alive = (a) => a.state !== 'down' && a.state !== 'gone' && a.state !== 'dive';

// Sea lions are game too, but only while they're out of the water: one killed in the sea would take its meat down.
function* prey() {
  yield* animals;
  for (const c of seaLife.lions) for (const s of c.members) if (lionAlive(s) && depthAt(s.x, s.y) <= 0) yield s;
}

// The game animal within reach of a swung blade, for whichever way the player is facing.
function nearPrey(tool) {
  if (!MELEE[tool] || !has(tool) || !canUseTool() || indoors) return null;
  const reach = tool === 'spear' ? 30 : 22;
  let best = null;
  let bd = reach;
  for (const a of prey()) {
    if (!huntable(a) || !alive(a)) continue;
    const d = Math.hypot(a.x - player.x, (a.y - player.y) * 1.4);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

function animalAt(x, y) {
  if (indoors) return null;
  for (const a of prey()) if (huntable(a) && alive(a) && Math.abs(a.x - x) < WILD[a.kind].box && y > a.y - 9 && y < a.y + 3) return a;
  return null;
}

function strikePrey(a, tool) {
  if (!alive(a) || Math.hypot(a.x - player.x, a.y - player.y) > (tool === 'spear' ? 36 : 28)) return;
  hurtAnimal(a, MELEE[tool]);
}

function hurtAnimal(a, dmg) {
  a.hp -= dmg;
  a.hurtT = 0.35;
  Sfx.thunk(earshot(a.x, a.y));
  for (let i = 0; i < 5; i++) {
    particles.push({ type: 'chip', x: a.x, y: a.y - 6, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, c: ['#ffffff', '#e8e0c8'][i % 2], life: 0, max: 0.4 });
  }
  if (a.hp <= 0) return bringDown(a);
  if (a.kind === 'sealion') return startleLions(a);
  if (a.kind === 'boar') {
    Object.assign(a, { state: 'charge', t: 3 });
    Sfx.grunt(1);
    return;
  }
  startle(a);
}

function bringDown(a) {
  Object.assign(a, { state: 'down', t: 0, lift: 0 });
  stats.hunted++;
  stats[a.kind]++;
  if (a.kind === 'boar') Sfx.grunt(0.8);
  if (a.kind === 'sealion') startleLions(a);
}

// A hurt sea lion barks and its whole colony makes for the water.
function startleLions(s) {
  Sfx.sealion(earshot(s.x, s.y));
  const c = seaLife.lions.find((g) => g.members.includes(s));
  for (const m of c.members) {
    if (m.state === 'lounge') Object.assign(m, { state: 'flop', t: 0 });
    else if (m.state === 'haul') Object.assign(m, { state: 'swim', t: 0 });
  }
}

function dropMeat(a) {
  Object.assign(a, { state: 'gone', respawnT: RESPAWN });
  for (let i = 0; i < 8; i++) {
    particles.push({ type: 'dust', x: a.x + (Math.random() - 0.5) * 12, y: a.y - 4, vx: (Math.random() - 0.5) * 30, vy: -8 - Math.random() * 10, life: 0, max: 0.5 + Math.random() * 0.3 });
  }
  const w = WILD[a.kind];
  const loot = [...Array(w.meat).fill('meat'), ...Array(w.hide || 0).fill('hide')];
  const n = loot.length;
  loot.forEach((item, i) => spawnDrop(item, a.x + (i - (n - 1) / 2) * 6, a.y + 2, (i - (n - 1) / 2) * 20, 6, 50));
}

// ---------- drawing ----------

// Frames as built in sprites.js: [still, step, head-down, running] for most; rabbits and frogs [sit, hop, nibble/croak].
function animalFrame(a) {
  const step = Math.floor(a.anim) % 2;
  if (a.kind === 'rabbit') return a.lift > 0.5 ? 1 : a.state === 'graze' && (time + a.home.x) % 2 < 1.2 ? 2 : 0;
  if (a.kind === 'frog') return a.lift > 0.5 ? 1 : a.croakT > 0 ? 2 : 0;
  if (a.kind === 'snake') return a.state === 'strike' ? 3 : a.state === 'coil' || a.state === 'rest' ? 2 : step;
  if (a.state === 'flee' || a.state === 'charge' || a.state === 'pounce') return a.kind === 'goat' ? step : step ? 3 : 1;
  if (a.state === 'walk' || a.state === 'sulk') return step;
  if (a.kind === 'fox') return a.state === 'sit' || a.state === 'watch' ? 2 : 0;
  if (a.state === 'graze') return 2;
  return 0;
}

function drawAnimal(a, cx, cy) {
  const img = SPR.wild[a.look][a.dir][animalFrame(a)];
  const x = Math.round(a.x) - cx;
  const y = Math.round(a.y) - cy;
  const w = WILD[a.kind];
  if (a.state === 'down') ctx.globalAlpha = 1 - a.t / DOWN_TIME;
  drawShadow(x, y, Math.max(3, w.box * 0.7 - a.lift * 0.2), 1.5);
  if (!(a.hurtT > 0 && Math.floor(a.hurtT * 20) % 2)) {
    const shake = a.state === 'stun' ? Math.round(Math.sin(time * 40)) : 0;
    ctx.drawImage(img, x - Math.floor(img.width / 2) + shake, y - img.height + 1 - Math.round(a.lift));
  }
  ctx.globalAlpha = 1;
}

function wildItems(cx, cy) {
  if (indoors) return [];
  return animals.filter((a) => a.state !== 'gone' && a.state !== 'dive' && onScreen(a.x, a.y, cx, cy, 30)).map((a) => ({ y: a.y, draw: () => drawAnimal(a, cx, cy) }));
}
