// Wild animals: deer, boar, rabbits and the desert's javelinas to hunt for meat, foxes, goats, frogs and penguins that
// just live here, and the snakes of the jungle maze and scorpions of the dunes that lie in wait. Hedgehogs, badgers,
// wolves, owls and bats only come out at night.

// `hp`, `meat` and `hide` only for game animals; the bigger the beast, the more hides. Speeds in px/s; `shy` is how close the player can get before it bolts,
// `range` how far from home it wanders, `box` the half-width an arrow or blade has to land within.
const WILD = {
  deer: { name: 'deer', hp: 2, meat: 2, hide: 2, walk: 20, run: 100, shy: 72, alert: 120, range: 64, box: 10, tiles: [T.GRASS, T.DIRT], call: 'snort', every: [14, 30] },
  boar: { name: 'boar', hp: 4, meat: 3, hide: 2, walk: 14, run: 70, charge: 95, shy: 0, range: 48, box: 9, tiles: [T.GRASS, T.DIRT, T.JUNGLE], call: 'grunt', every: [6, 14] },
  rabbit: { name: 'rabbit', hp: 1, meat: 1, hide: 1, walk: 28, run: 105, shy: 48, range: 40, box: 5, tiles: [T.GRASS], hops: true },
  fox: { name: 'fox', walk: 22, run: 90, shy: 40, watch: 90, range: 64, box: 7, tiles: [T.SNOW, T.GRASS, T.ROCK], call: 'yip', every: [16, 34] },
  goat: { name: 'goat', walk: 12, run: 70, shy: 34, range: 44, box: 7, tiles: [T.ROCK, T.GRASS, T.SNOW], call: 'bleat', every: [10, 24] },
  frog: { name: 'frog', walk: 34, shy: 26, range: 14, box: 4, tiles: [T.GRASS, T.JUNGLE, T.SAND, T.DIRT], hops: true, call: 'croak', every: [5, 12] },
  sealion: { name: 'sea lion', hp: 2, meat: 3, hide: 3, box: 11 },
  snake: { name: 'snake', hp: 1, meat: 0, walk: 10, lunge: 40, strike: 170, shy: 0, range: 28, box: 7, tiles: [T.JUNGLE] },
  javelina: { name: 'javelina', hp: 3, meat: 2, hide: 1, walk: 13, run: 66, charge: 88, shy: 0, range: 56, box: 6, tiles: [T.SAND, T.GRASS], call: 'grunt', every: [8, 16] },
  scorpion: { name: 'scorpion', hp: 1, meat: 0, walk: 8, lunge: 30, strike: 150, shy: 0, range: 36, box: 6, tiles: [T.SAND], venom: 3, warn: 'rattle' },
  penguin: { name: 'penguin', walk: 9, slide: 80, shy: 38, range: 60, box: 6, tiles: [T.SNOW, T.ICE], call: 'honk', every: [7, 16] },
  hedgehog: { name: 'hedgehog', walk: 9, shy: 30, range: 36, box: 5, tiles: [T.GRASS, T.DIRT], night: true, call: 'snuffle', every: [7, 14] },
  badger: { name: 'badger', hp: 3, meat: 2, hide: 1, walk: 15, run: 72, shy: 56, range: 52, box: 8, tiles: [T.GRASS, T.DIRT], night: true, call: 'snuffle', every: [10, 20] },
  wolf: { name: 'wolf', hp: 4, meat: 3, hide: 3, walk: 24, run: 115, shy: 70, watch: 150, range: 80, box: 11, tiles: [T.GRASS, T.SNOW, T.ROCK], night: true, call: 'howl', every: [22, 30] },
  owl: { name: 'owl', shy: 44, range: 0, box: 5, night: true, call: 'hoot', every: [8, 16] },
  bat: { name: 'bat', fly: 55, range: 90, box: 5, tiles: [T.GRASS, T.DIRT, T.PATH, T.SAND, T.ROCK], night: true, call: 'squeak', every: [5, 12] },
};
const huntable = (a) => !!WILD[a.kind].hp;

// Where each lot lives: a box in village-local tiles, or a whole island.
const local = (x0, y0, x1, y1) => ({ x0: x0 + OX, y0: y0 + OY, x1: x1 + OX, y1: y1 + OY });
function mazeBox() {
  const j = isle('jungle');
  const { cols, rows, pitch } = JUNGLE_MAZE;
  return { x0: j.x - (cols * pitch) / 2, y0: j.y - (rows * pitch) / 2, x1: j.x + (cols * pitch) / 2, y1: j.y + (rows * pitch) / 2 };
}
function frozenLake() {
  const f = isle('frozen');
  return { x0: f.x - 6, y0: f.y - 7, x1: f.x + 12, y1: f.y + 5 };
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
  { kind: 'goat', n: 3, area: local(84, 8, 120, 28) },
  { kind: 'fox', n: 2, area: local(38, 4, 60, 26) },
  { kind: 'fox', n: 2, isle: 'frozen', look: 'arcticFox' },
  { kind: 'frog', n: 4, area: local(12, 44, 32, 64) },
  { kind: 'frog', n: 2, isle: 'jungle' },
  { kind: 'snake', n: 11, area: mazeBox() },
  { kind: 'penguin', n: 6, area: frozenLake() },
  { kind: 'javelina', n: 4, isle: 'speck' },
  { kind: 'scorpion', n: 5, isle: 'speck' },
  { kind: 'hedgehog', n: 3, area: local(54, 68, 100, 96) },
  { kind: 'hedgehog', n: 2, area: local(116, 64, 134, 96) },
  { kind: 'badger', n: 2, area: local(6, 62, 36, 96) },
  { kind: 'badger', n: 1, area: local(4, 20, 34, 46) },
  { kind: 'wolf', n: 3, area: local(38, 4, 60, 26) },
  { kind: 'wolf', n: 3, isle: 'frozen' },
  { kind: 'owl', n: 2, area: local(4, 20, 34, 46) },
  { kind: 'owl', n: 2, area: local(6, 62, 36, 96) },
  { kind: 'owl', n: 1, isle: 'hermit' },
  { kind: 'bat', n: 4, area: local(54, 66, 100, 96) },
  { kind: 'bat', n: 3, isle: 'ruin' },
];
// Night animals come out once it's this dark, and slip away again as it gets light.
const NIGHT_OUT = 0.55;
const nightOut = () => nightness() > NIGHT_OUT;
const LEAVE_TIME = 3;
const PERCHES = new Set(['oak', 'pine', 'pine2', 'snowPine']);
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

function herdBox(h) {
  const i = h.isle && isle(h.isle);
  return i ? { x0: i.x - i.rx, y0: i.y - i.ry, x1: i.x + i.rx, y1: i.y + i.ry } : h.area;
}

// Runs before main.js defines canStand, so it asks `blocked` directly. Owls sit up in a tree.
function spawnSpot(h, rng, probe) {
  const i = h.isle && isle(h.isle);
  const box = herdBox(h);
  if (h.kind === 'owl') {
    const trees = objects.filter((o) => PERCHES.has(o.key) && kindOf(o) === 'tree' && o.x > box.x0 * TILE && o.x < box.x1 * TILE && o.y > box.y0 * TILE && o.y < box.y1 * TILE);
    const tree = trees[Math.floor(rng() * trees.length)];
    return tree ? { x: tree.x + 3, y: tree.y + 1, tree } : null;
  }
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
        kind: h.kind, look, x: at.x, y: at.y, home: { x: at.x, y: at.y }, pond: at.pond, tree: at.tree, herd: h, dir: rng() < 0.5 ? 'left' : 'right',
        state: w.night ? 'gone' : 'idle', timer: rng() * 3, anim: 0, lift: perchLift(at.tree), hp: w.hp || 0, hurtT: 0, fleeT: 0, target: null, stuck: 0,
        callT: w.every ? w.every[0] + rng() * w.every[1] : 0, croakT: 0, respawnT: w.night ? rng() * 30 : 0, t: 0, phase: rng() * 6,
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

// Turns aside when the way is blocked, and bends back toward home the further it has run past its range. The pull
// grows smoothly so a fleeing animal doesn't dither at the edge; where it would cancel the heading outright, the
// animal veers round to one side instead.
function steer(a, ux, uy, sp, dt, rate) {
  const w = WILD[a.kind];
  const hx = a.home.x - a.x;
  const hy = a.home.y - a.y;
  const hd = Math.hypot(hx, hy) || 1;
  const pull = Math.min(0.75, Math.max(0, (hd - w.range * 1.5) / (w.range * 1.5)));
  if (pull > 0) {
    let vx = ux * (1 - pull) + (hx / hd) * pull;
    let vy = uy * (1 - pull) + (hy / hd) * pull;
    const side = ux * hy - uy * hx > 0 ? 1 : -1;
    const v = Math.hypot(vx, vy);
    if (v < 0.5) {
      vx += -uy * side * (0.5 - v) * 2;
      vy += ux * side * (0.5 - v) * 2;
    }
    const n = Math.hypot(vx, vy) || 1;
    ux = vx / n;
    uy = vy / n;
  }
  if (Math.abs(ux) < 1e-6) ux = 0;
  if (Math.abs(uy) < 1e-6) uy = 0;
  const x0 = a.x;
  const y0 = a.y;
  const s = sp * dt;
  const gone = () => Math.hypot(a.x - x0, a.y - y0);
  move(a, ux * s, uy * s);
  if (gone() < s * 0.5) {
    // scraping along a wall or into a corner: veer round, the same side it last did, as little as will get it going
    Object.assign(a, { x: x0, y: y0 });
    const side = a.dodge || (a.dodge = Math.random() < 0.5 ? 1 : -1);
    let found = false;
    for (const sd of [side, -side]) {
      for (const ang of DETOURS) {
        const c = Math.cos(ang * sd);
        const n = Math.sin(ang * sd);
        move(a, (ux * c - uy * n) * s, (ux * n + uy * c) * s);
        if (gone() >= s * 0.5) {
          a.dodge = sd;
          found = true;
          break;
        }
        Object.assign(a, { x: x0, y: y0 });
      }
      if (found) break;
    }
  }
  // how fast it's really getting anywhere, smoothed, so a shuffle back and forth on the spot counts as none
  if (dt > 0) {
    const k = 1 - Math.exp(-dt * 8);
    a.svx = (a.svx || 0) + ((a.x - x0) / dt - (a.svx || 0)) * k;
    a.svy = (a.svy || 0) + ((a.y - y0) / dt - (a.svy || 0)) * k;
  }
  a.pace = Math.min(1, Math.hypot(a.svx || 0, a.svy || 0) / sp);
  a.held = a.held ? a.pace < 0.35 : a.pace < 0.2;
  a.stuck = a.pace < 0.3 ? a.stuck + dt : 0;
  a.anim += dt * rate * a.pace;
  faceMoving(a, a.x - x0, dt, sp);
}
const DETOURS = [0.5, 1, 1.5, 2.1, 2.7];
const STEERED = new Set(['walk', 'flee', 'charge', 'sulk']);
// Standing still on the spot, though it means to be moving: hemmed in, so it shows standing rather than running in place.
const pinned = (a) => !!a.held;

// Faces the way it has really been going, smoothed, so a blocked step or a heading near straight up or down
// doesn't flip it back and forth.
function faceMoving(e, mx, dt, sp) {
  if (dt <= 0) return;
  e.fvx = (e.fvx || 0) + (mx / dt - (e.fvx || 0)) * (1 - Math.exp(-dt * 5));
  if (Math.abs(e.fvx) > sp * 0.3) e.dir = e.fvx > 0 ? 'right' : 'left';
}

function startle(a) {
  if (WILD[a.kind].charge || a.kind === 'bat') return;
  for (const b of animals) {
    if (b.kind !== a.kind || b.state === 'down' || b.state === 'gone' || b.state === 'dive') continue;
    if (b !== a && Math.hypot(b.x - a.x, b.y - a.y) > 90) continue;
    if (b.kind === 'frog') {
      Object.assign(b, { state: 'leap', t: 0, from: { x: b.x, y: b.y } });
      continue;
    }
    if (b.kind === 'hedgehog') {
      if (b.state !== 'curl') Object.assign(b, { state: 'curl', timer: 4 + Math.random() * 3, lift: 0 });
      continue;
    }
    if (b.kind === 'owl') {
      flyOff(b);
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
    if (w.night && !nightOut()) return;
    if ((a.respawnT -= dt) <= 0 && Math.hypot(player.x - a.home.x, player.y - a.home.y) > 320) comeOut(a);
    return;
  }
  if (w.night && !nightOut() && !(a.leaveT >= 0) && a.state !== 'down') a.leaveT = 0;
  if (a.leaveT >= 0 && ((a.leaveT += dt) >= LEAVE_TIME || !onScreen(a.x, a.y - a.lift, cam.x, cam.y, 40))) {
    Object.assign(a, { state: 'gone', respawnT: 0, leaveT: -1 });
    return;
  }
  if (a.state === 'dive') {
    if ((a.t -= dt) <= 0 && Math.hypot(player.x - a.home.x, player.y - a.home.y) > 60) {
      Object.assign(a, { x: a.home.x, y: a.home.y, state: 'idle', timer: 2 });
      seaSplash(a.pond.x, a.pond.y, 0.3);
    }
    return;
  }
  if (a.frozenT > 0) {
    if ((a.frozenT -= dt) <= 0) thaw(a);
    return;
  }
  ambientCall(a, dt);
  const dist = Math.hypot(player.x - a.x, player.y - a.y);
  const near = playerAbout() && !player.swimming;
  const shy = w.shy * (player.running ? 1.4 : 1);
  if (w.charge) return updateBoar(a, dt, dist, near);
  if (w.lunge) return updateSnake(a, dt, dist, near);
  if (a.kind === 'penguin') return updatePenguin(a, dt, dist, near && dist < shy);
  if (a.kind === 'bat') return updateBat(a, dt);
  if (a.kind === 'owl') return updateOwl(a, dt, dist, near && dist < shy);
  if (a.state === 'curl') {
    if ((a.timer -= dt) <= 0 && !(near && dist < shy)) Object.assign(a, { state: 'idle', timer: 1 });
    return;
  }
  if (a.state === 'leap') return updateLeap(a, dt);
  if (a.state === 'pounce') return updatePounce(a, dt);
  if (near && dist < shy && a.state !== 'flee') startle(a);

  if (a.state === 'flee') {
    const [ux, uy] = awayFrom(a, player.x, player.y);
    steer(a, ux, uy, w.run, dt, w.hops ? 7 : 12);
    if (a.stuck > 0.8) Object.assign(a, { dodge: -(a.dodge || 1), stuck: 0 });
    a.lift = w.hops && !pinned(a) ? Math.abs(Math.sin(a.anim * Math.PI)) * 4 : 0;
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
    steer(a, dx / d, dy / d, w.walk, dt, w.hops ? 4 : 5);
    a.lift = w.hops && !pinned(a) ? Math.abs(Math.sin(a.anim * Math.PI)) * (a.kind === 'frog' ? 3 : 2) : 0;
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

// ---------- night animals ----------

const perchLift = (tree) => (tree ? Math.round(SPR[tree.key].img.height * 0.55) : 0);

// Back out after dark: owls to a tree still standing in their patch, the rest to their home spot.
function comeOut(a) {
  const w = WILD[a.kind];
  if (a.kind === 'owl' && (!a.tree || kindOf(a.tree) !== 'tree')) {
    const at = spawnSpot(a.herd, Math.random, {});
    if (!at) return (a.respawnT = 30);
    Object.assign(a, { tree: at.tree, home: { x: at.x, y: at.y } });
  }
  Object.assign(a, { x: a.home.x, y: a.home.y, state: 'idle', timer: 2, hp: w.hp || 0, lift: perchLift(a.tree), target: null, leaveT: -1, vx: 0, vy: 0 });
}

// An owl sits tight in its tree, turning to watch you, until you come too close or the tree comes down.
function updateOwl(a, dt, dist, close) {
  if (a.state === 'flyoff') {
    a.t += dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.lift += dt * 26;
    a.anim += dt * 9;
    if (a.t > 3) Object.assign(a, { state: 'gone', respawnT: 40 + Math.random() * 40 });
    return;
  }
  if (close || kindOf(a.tree) !== 'tree' || a.tree.burnT !== undefined) return flyOff(a);
  if (dist < 120) a.dir = player.x > a.x ? 'right' : 'left';
}

function flyOff(a) {
  if (a.state === 'flyoff') return;
  const [ux] = awayFrom(a, player.x, player.y);
  const side = ux < 0 ? -1 : 1;
  Object.assign(a, { state: 'flyoff', t: 0, vx: side * 60, vy: -12, dir: side > 0 ? 'right' : 'left' });
  Sfx.flap(0.4 * earshot(a.x, a.y));
}

// Bats flit about over their patch in jinking zigzags, never settling.
function updateBat(a, dt) {
  const w = WILD.bat;
  if (!a.target || Math.hypot(a.target.x - a.x, a.target.y - a.y) < 8) {
    a.target = { x: a.home.x + (Math.random() - 0.5) * 2 * w.range, y: a.home.y + (Math.random() - 0.5) * w.range };
  }
  const dx = a.target.x - a.x;
  const dy = a.target.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, dt * 3);
  a.vx = (a.vx || 0) + ((dx / d) * w.fly - (a.vx || 0)) * k + (Math.random() - 0.5) * 500 * dt;
  a.vy = (a.vy || 0) + ((dy / d) * w.fly - (a.vy || 0)) * k + (Math.random() - 0.5) * 500 * dt;
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  a.lift = 24 + Math.sin(time * 2.3 + a.phase) * 7 + (a.leaveT >= 0 ? a.leaveT * 30 : 0);
  a.anim += dt * 16;
  if (Math.abs(a.vx) > 8) a.dir = a.vx > 0 ? 'right' : 'left';
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

// Penguins waddle about the snow, and out on the ice flop onto their bellies for a long glide. One that's startled
// belly-flops and slides off, though it soon grinds to a halt on snow.
const iceUnder = (a) => tileAt(Math.floor(a.x / TILE), Math.floor((a.y - 1) / TILE)) === T.ICE;
function updatePenguin(a, dt, dist, close) {
  const w = WILD.penguin;
  if (close && a.state !== 'slide') a.state = 'flee';
  if (a.state === 'flee') {
    // off whichever way is clear, as near straight away as it can; hemmed in, it just stands its ground
    const [ux, uy] = awayFrom(a, player.x, player.y);
    const clear = (vx, vy) => habitat('penguin', a.x + vx * 20, a.y + vy * 20) && canStand(a, a.x + vx * 8, a.y + vy * 8);
    for (const ang of [0, ...DETOURS.flatMap((d) => [d, -d])]) {
      const vx = ux * Math.cos(ang) - uy * Math.sin(ang);
      const vy = ux * Math.sin(ang) + uy * Math.cos(ang);
      if (clear(vx, vy)) return bellySlide(a, vx, vy, w.slide * 1.2);
    }
    return Object.assign(a, { state: 'idle', timer: 1, dir: player.x > a.x ? 'right' : 'left' });
  }
  if (a.state === 'slide') {
    const k = Math.exp(-dt * (iceUnder(a) ? 0.45 : 4));
    a.vx *= k;
    a.vy *= k;
    const ahead = habitat('penguin', a.x + a.vx * 0.15, a.y + a.vy * 0.15);
    if (!ahead || !move(a, a.vx * dt, a.vy * dt)) {
      a.vx *= -0.25;
      a.vy *= -0.25;
    }
    if (Math.random() < dt * 8) {
      particles.push({ type: 'steam', x: a.x - Math.sign(a.vx) * 7, y: a.y - 1, vx: -a.vx * 0.2, vy: -6 - Math.random() * 8, life: 0, max: 0.4 });
    }
    if (Math.hypot(a.vx, a.vy) < 7) Object.assign(a, { state: 'idle', timer: 1 + Math.random() * 2, vx: 0, vy: 0 });
    return;
  }
  if (a.state === 'walk') {
    const dx = a.target.x - a.x;
    const dy = a.target.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 2 || a.stuck > 0.6) return Object.assign(a, { state: 'idle', timer: 1.5 + Math.random() * 3, stuck: 0 });
    if (iceUnder(a) && Math.random() < dt * 0.8) return bellySlide(a, dx / d, dy / d, w.slide);
    steer(a, dx / d, dy / d, w.walk, dt, 6);
    return;
  }
  if ((a.timer -= dt) > 0) return;
  if (iceUnder(a) && Math.random() < 0.6) {
    const ang = Math.random() * Math.PI * 2;
    return bellySlide(a, Math.cos(ang), Math.sin(ang) * 0.7, w.slide);
  }
  a.target = pickWander(a);
  if (a.target) Object.assign(a, { state: 'walk', stuck: 0 });
  else a.timer = 1;
}

function bellySlide(a, ux, uy, speed) {
  Object.assign(a, { state: 'slide', vx: ux * speed, vy: uy * speed, dir: ux > 0 ? 'right' : 'left' });
  if (time - (a.honkAt ?? -9) < 3) return;
  a.honkAt = time;
  Sfx.honk(0.4 * earshot(a.x, a.y));
}

// Boars and javelinas mind their own business until hurt; then they charge whoever did it.
function updateBoar(a, dt, dist, near) {
  const w = WILD[a.kind];
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
    steer(a, -ux, -uy, w.charge, dt, 12);
    if ((a.callT -= dt) <= 0) {
      a.callT = 0.6;
      Sfx.grunt(earshot(a.x, a.y));
    }
    if (dist < 12) gore(a, ux, uy);
    return;
  }
  if (a.state === 'sulk') {
    const [ux, uy] = awayFrom(a, player.x, player.y);
    steer(a, ux, uy, w.walk * 2.5, dt, 7);
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
    steer(a, dx / d, dy / d, w.walk, dt, 5);
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
  muse(['Oof!', `Ow! That ${WILD[a.kind].name} means business.`, has('shield') ? 'Ouch! I should raise my shield as it charges...' : 'Ouch! A shield would come in handy...'][Math.min(2, stats.gored++)]);
  Object.assign(a, { state: 'sulk', timer: 2.5 });
}

// A snake lies still until you come close; then it coils, hissing, and lunges where you stood. Step back smartly
// while it coils and it falls short; a raised shield turns the fangs. A scorpion rears its tail and stings the same way.
const BITE_TIME = 5;
const SNAKE_CLEAR = 2;
function updateSnake(a, dt, dist, near) {
  const w = WILD[a.kind];
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
    Sfx[w.warn || 'hiss'](0.7 * earshot(a.x, a.y));
    return;
  }
  if (a.state === 'walk') {
    const dx = a.target.x - a.x;
    const dy = a.target.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 2 || a.stuck > 0.6) return Object.assign(a, { state: 'idle', timer: 3 + Math.random() * 5, stuck: 0 });
    steer(a, dx / d, dy / d, w.walk, dt, 4);
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
    muse(`Ha! Not through my shield, ${WILD[a.kind].name}.`);
    return;
  }
  const venom = WILD[a.kind].venom || BITE_TIME;
  Object.assign(a, { state: 'rest', timer: 2.4 });
  Object.assign(player, { downT: venom, clearT: venom + SNAKE_CLEAR, bitBy: a.kind, chop: null, nock: null, fishing: null, knock: null, running: false, jumpT: -1, anim: 0, frame: 0 });
  Sfx.hiss(1);
  Sfx.thunk(0.8);
  burst(player.x, player.y - 8, ['#e0303a', '#ffffff'], 6, 24);
  const lines = a.kind === 'scorpion'
    ? ['Yow! A scorpion! My legs have gone stiff...', 'Stung again! I can\'t feel my feet...', has('shield') ? 'Stung again... raise the shield when one rears its tail!' : 'Stung again... a shield would stop that sting.']
    : ['Ow! A snake! My legs... I can\'t move...', 'Bitten again! Everything\'s gone numb...', has('shield') ? 'Numb again... raise the shield when one coils!' : 'Numb again... a shield would stop those fangs.'];
  muse(lines[Math.min(2, stats.bitten++)]);
}

// Lying where the snake or scorpion left you until the venom wears off.
function updateDown(dt) {
  player.downT -= dt;
  player.anim = 0;
  player.frame = 0;
  if (Math.random() < dt * 3) particles.push({ type: 'sparkle', layer: 'sky', x: player.x + (Math.random() - 0.5) * 16, y: player.y - 10 - Math.random() * 6, vx: 0, vy: -8, life: 0, max: 0.6 });
  if (player.downT > 0) return;
  player.downT = 0;
  dust(player.x, player.y);
  if (stats.bitten === 1) muse(`Phew, I can move again. Better watch for those ${WILD[player.bitBy || 'snake'].name}s.`);
}

function ambientCall(a, dt) {
  const w = WILD[a.kind];
  if (!w.call || (a.callT -= dt * (a.kind === 'frog' && nightness() > 0.5 ? 2.5 : 1)) > 0) return;
  a.callT = w.every[0] + Math.random() * w.every[1];
  const k = earshot(a.x, a.y);
  if (k < 0.15 || indoors) return;
  Sfx[w.call](0.5 * k);
  if (a.kind === 'frog') a.croakT = 0.5;
  // one wolf's howl sets the rest of its pack off
  if (a.kind !== 'wolf' || a.state === 'flee') return;
  Object.assign(a, { croakT: 2, state: 'sit', timer: 2.5 });
  if (a.chorus) return (a.chorus = false);
  for (const b of animals) {
    if (b !== a && b.kind === 'wolf' && alive(b) && Math.hypot(b.x - a.x, b.y - a.y) < 160) Object.assign(b, { callT: 0.5 + Math.random() * 1.2, chorus: true });
  }
}

function updateWildlife(dt) {
  if (player.clearT > 0) player.clearT -= dt;
  const k = player.knock;
  if (k) {
    if ((grounded() || player.swimming) && !sail && !flight) move(player, k.vx * dt, k.vy * dt);
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
  hurtAnimal(a, MELEE[tool] + tierOf(tool));
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
  if (WILD[a.kind].charge) {
    Object.assign(a, { state: 'charge', t: 3 });
    Sfx.grunt(1);
    return;
  }
  startle(a);
}

function bringDown(a) {
  Object.assign(a, { state: 'down', t: 0, lift: 0 });
  stats.hunted++;
  stats[a.kind] = (stats[a.kind] || 0) + 1;
  if (WILD[a.kind].charge) Sfx.grunt(0.8);
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
  const loot = [...Array(w.meat).fill(a.roasted ? 'roast' : 'meat'), ...Array(w.hide || 0).fill('hide')];
  a.roasted = false;
  const n = loot.length;
  loot.forEach((item, i) => spawnDrop(item, a.x + (i - (n - 1) / 2) * 6, a.y + 2, (i - (n - 1) / 2) * 20, 6, 50));
}

// ---------- drawing ----------

// Frames as built in sprites.js: [still, step, head-down, running] for most; rabbits and frogs [sit, hop, nibble/croak];
// penguins [stand, waddle, belly-slide].
function animalFrame(a) {
  const step = Math.floor(a.anim) % 2;
  if (STEERED.has(a.state) && pinned(a)) return 0;
  if (a.kind === 'rabbit') return a.lift > 0.5 ? 1 : a.state === 'graze' && (time + a.home.x) % 2 < 1.2 ? 2 : 0;
  if (a.kind === 'frog') return a.lift > 0.5 ? 1 : a.croakT > 0 ? 2 : 0;
  if (a.kind === 'penguin') return a.state === 'slide' ? 2 : a.state === 'walk' ? step : 0;
  if (WILD[a.kind].lunge) return a.state === 'strike' ? 3 : a.state === 'coil' || a.state === 'rest' ? 2 : step;
  if (a.kind === 'bat') return step;
  if (a.kind === 'owl') return a.state === 'flyoff' ? 2 + step : (time + a.phase) % 4 < 0.2 ? 1 : 0;
  if (a.kind === 'hedgehog') return a.state === 'curl' ? 2 : a.state === 'walk' ? step : 0;
  if (a.kind === 'wolf' && a.croakT > 0) return 4;
  if (a.state === 'flee' || a.state === 'charge' || a.state === 'pounce') return a.kind === 'goat' ? step : step ? 3 : 1;
  if (a.state === 'walk' || a.state === 'sulk') return step;
  if (a.kind === 'fox' || a.kind === 'wolf') return a.state === 'sit' || a.state === 'watch' ? 2 : 0;
  if (a.state === 'graze') return 2;
  return 0;
}

function drawAnimal(a, cx, cy) {
  const img = SPR.wild[a.look][a.dir][animalFrame(a)];
  const x = Math.round(a.x) - cx;
  const y = Math.round(a.y) - cy;
  const w = WILD[a.kind];
  if (a.state === 'down') ctx.globalAlpha = 1 - a.t / DOWN_TIME;
  if (a.leaveT >= 0) ctx.globalAlpha = Math.max(0, 1 - a.leaveT / LEAVE_TIME);
  if (!a.tree || a.state === 'flyoff') drawShadow(x, y, Math.max(3, w.box * 0.7 - a.lift * 0.2), 1.5);
  if (!(a.hurtT > 0 && Math.floor(a.hurtT * 20) % 2)) {
    const shake = a.state === 'stun' ? Math.round(Math.sin(time * 40)) : 0;
    ctx.drawImage(img, x - Math.floor(img.width / 2) + shake, y - img.height + 1 - Math.round(a.lift));
  }
  if (a.frozenT > 0) drawIceBlock(x, y, img.width, img.height, a.frozenT);
  ctx.globalAlpha = 1;
}

function wildItems(cx, cy) {
  if (indoors) return [];
  return animals.filter((a) => a.state !== 'gone' && a.state !== 'dive' && onScreen(a.x, a.y, cx, cy, 30)).map((a) => ({ y: a.y + (a.kind === 'bat' ? 60 : 0), draw: () => drawAnimal(a, cx, cy) }));
}
