const screenCanvas = document.getElementById('game');
const screenCtx = screenCanvas.getContext('2d');
const buffer = makeCanvas(1, 1);
const ctx = buffer.getContext('2d');
const bubbleLayer = document.getElementById('bubbles');
const hint = document.getElementById('hint');
const promptEl = document.getElementById('prompt');
const chatForm = document.getElementById('chat');
const chatInput = document.getElementById('chat-input');

let baseZoom = 3;
let flyZoom = 2;
let zoom = 0;
let dpr = 1;
let viewW = 320;
let viewH = 240;
let time = 0;
const cam = { x: 0, y: 0 };
const keys = new Set();
let pointer = null;
let pointerDownAt = 0;

buildSprites();
generateMap();
placeObjects();
buildColliders();
const ground = renderGround();
// The rideable dragon; there is none in the world until the baby dragon grows up.
let dragonObj = objects.find((o) => o.key === 'dragon') || null;
const shipObj = objects.find((o) => o.key === 'ship');
const seaRocks = objects.filter((o) => o.key === 'rock');
const eggObj = objects.find((o) => o.key === 'dragonEgg');
const villageFire = objects.find((o) => o.key === 'bonfire');
initSea();

// 0..1 loudness for a sound at a world position, fading out past the edge of the view.
function earshot(x, y) {
  const d = Math.hypot(x - (cam.x + viewW / 2), y - (cam.y + viewH / 2));
  return Math.max(0, Math.min(1, 1.3 - d / (viewW * 0.6)));
}

const VOICES = { male: 330, female: 460, chief: 150, smith: 120, merchant: 380, kid: 620, girl: 520, archer: 300, guard: 140, villager: 260, fisher: 190, hermit: 110 };

function surfaceUnder(x, y) {
  const t = tileAt(Math.floor(x / TILE), Math.floor((y - 1) / TILE));
  if (t === T.WOOD) return 'wood';
  if (t === T.PATH || t === T.STAIRS) return 'stone';
  if (t === T.SAND) return 'sand';
  return 'grass';
}

const FLY_ALT = 46;
let flight = null;
let sail = null;
let hop = null;
let eggStage = 'ruin'; // ruin, carried, warming, hatched
let hatchT = 0;
let baby = null;
const JUMP_TIME = 0.42;
const JUMP_HEIGHT = 12;

function makeEntity(look, x, y) {
  return { isEntity: true, look, x, y, dir: 'down', frame: 0, anim: 0, flying: false, jumpT: -1, jumpDelay: 0 };
}

const player = makeEntity(PLAYER_LOOKS.male, PLAYER_START.x * TILE, PLAYER_START.y * TILE);
player.name = 'Eli';
player.dir = 'up';
player.stroke = 0;
player.sprinting = false;
player.running = false;

const npcs = NPCS.map((d) => Object.assign(makeEntity(LOOKS[d.look], d.x * TILE, d.y * TILE), {
  home: { x: d.x * TILE, y: d.y * TILE },
  roam: (d.roam || 0) * TILE,
  fixed: d.fixed,
  line: d.line,
  dir: d.fixed || 'down',
  state: 'idle',
  timer: 1 + Math.random() * 3,
  target: null,
  stuck: 0,
  talkT: 0,
  bubble: null,
}));

const entities = [player, ...npcs];

const sheep = SHEEP.map((s) => ({
  x: s.x * TILE, y: s.y * TILE, dir: Math.random() < 0.5 ? 'left' : 'right', state: 'graze', timer: Math.random() * 3,
  target: null, anim: 0, stuck: 0, phase: Math.random() * 3, baaT: 3 + Math.random() * 12, emote: null, emoteT: 0,
}));

const cloudRng = mulberry32(42);
const clouds = Array.from({ length: 9 }, (_, i) => ({
  x: cloudRng() * 1600,
  y: cloudRng() * 900,
  v: 5 + cloudRng() * 6,
  img: SPR.clouds[i % SPR.clouds.length],
}));

// ---------- collision ----------

function blocked(x0, y0, x1, y1, self, swim = false) {
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y1 - 0.001) / TILE); ty++) {
    for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x1 - 0.001) / TILE); tx++) {
      if (!inBounds(tx, ty)) return true;
      const t = tileAt(tx, ty);
      if (t === T.WATER ? !swim : isSolidTile(t)) return true;
    }
  }
  for (const c of colliders) if (!c.off && x1 > c.x0 && x0 < c.x1 && y1 > c.y0 && y0 < c.y1) return true;
  for (const e of entities) {
    if (e !== self && !e.flying && x1 > e.x - 5 && x0 < e.x + 5 && y1 > e.y - 4 && y0 < e.y) return true;
  }
  if (swim && !sail) {
    const [sx0, sy0, sx1, sy1] = shipBox(shipObj.dir, shipObj.x, shipObj.y);
    if (x1 > sx0 && x0 < sx1 && y1 > sy0 && y0 < sy1) return true;
  }
  return false;
}

const canStand = (e, x, y) => !blocked(x - 5, y - 4, x + 5, y, e, e.swimming);
const onLand = (x, y) => !blocked(x - 5, y - 4, x + 5, y, player);
const inWater = (x, y) => tileAt(Math.floor(x / TILE), Math.floor((y - 1) / TILE)) === T.WATER;

// Slides the entity sideways when it pushes straight into a corner.
function nudge(e, dx, dy) {
  for (let k = 1; k <= 6; k++) {
    for (const s of [-1, 1]) {
      const ox = dy ? s * k : 0;
      const oy = dx ? s * k : 0;
      if (canStand(e, e.x + ox, e.y + oy) && canStand(e, e.x + ox + dx, e.y + oy + dy)) {
        const step = Math.min(k, Math.abs(dx || dy));
        e.x += Math.sign(ox) * step;
        e.y += Math.sign(oy) * step;
        return true;
      }
    }
  }
  return false;
}

function move(e, dx, dy) {
  let moved = false;
  if (dx) {
    if (canStand(e, e.x + dx, e.y)) { e.x += dx; moved = true; } else if (!dy) moved = nudge(e, dx, 0);
  }
  if (dy) {
    if (canStand(e, e.x, e.y + dy)) { e.y += dy; moved = true; } else if (!dx) moved = nudge(e, 0, dy) || moved;
  }
  return moved;
}

function faceToward(e, dx, dy) {
  e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

// ---------- input ----------

const boosting = () => keys.has('ShiftLeft') || keys.has('ShiftRight');

function readInput() {
  let ix = 0;
  let iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
  if (pointer && !ix && !iy) {
    const oy = flight ? flight.y - flight.alt - 12 : sail ? player.y - 30 : player.y - 8;
    const dx = pointer.x / zoom + Math.round(cam.x) - player.x;
    const dy = pointer.y / zoom + Math.round(cam.y) - oy;
    if (Math.hypot(dx, dy) > 6) { ix = dx; iy = dy; }
  }
  const len = Math.hypot(ix, iy);
  return len ? [ix / len, iy / len] : [0, 0];
}

// ---------- walking ----------

function jump() {
  if (player.swimming || player.jumpT >= 0) return;
  const spot = diveSpot();
  Sfx.jump();
  if (!spot) {
    player.jumpT = 0;
    for (const n of npcs) if (n.followT > 0 && n.jumpT < 0) n.jumpDelay = 0.12 + Math.random() * 0.1;
    if (baby && !baby.flying && baby.jumpT < 0) baby.jumpDelay = 0.15;
    return;
  }
  startHop(spot.x, spot.y, 0, 0, () => {
    player.flying = false;
    player.swimming = true;
    splash(player.x, player.y);
    Sfx.splash();
  });
}

// Where a jump from the shore edge would land in the sea, or null when not at an edge.
function diveSpot() {
  let [vx, vy] = readInput();
  if (!vx && !vy) [vx, vy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.dir];
  for (let d = 2; d <= 56; d += 2) {
    const x = player.x + vx * d;
    const y = player.y + vy * d;
    const t = tileAt(Math.floor(x / TILE), Math.floor((y - 1) / TILE));
    if (t === T.FALL) return null;
    if (t !== T.CLIFF && t !== T.WATER) {
      if (d > 12 || colliders.some((c) => !c.off && x + 5 > c.x0 && x - 5 < c.x1 && y > c.y0 && y - 4 < c.y1)) return null;
      continue;
    }
    const wet = [[-5, -4], [5, -4], [-5, 0], [5, 0]].every(([ox, oy]) => inWater(x + ox, y + oy));
    if (wet && !blocked(x - 5, y - 4, x + 5, y, player, true)) return { x, y };
  }
  return null;
}

function splash(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    particles.push({ type: 'wake', layer: 'water', x, y: y - 2, vx: Math.cos(a) * 26, vy: Math.sin(a) * 9, life: 0, max: 0.7 });
  }
  for (let i = 0; i < 12; i++) {
    particles.push({ type: 'drop', x: x + (Math.random() - 0.5) * 8, y: y - 3, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 50, life: 0, max: 0.55 });
  }
}

// Freestyle arm as [shoulder dx, dy, hand dx, dy] from the swimmer's waterline anchor;
// u runs 0..1 as the hand comes out of the water, arcs overhead and goes back in.
function strokeArm(dir, side, u) {
  const [fx, fy] = DIR_VEC[dir];
  const arc = Math.sin(Math.PI * u);
  const reach = -Math.cos(Math.PI * u);
  if (fx) {
    const sy = side > 0 ? -5 : -4;
    return [-fx, sy, -fx + fx * reach * 7, sy - arc * 9];
  }
  const sx = side < 0 ? -5 : 4;
  return [sx, -3, sx + side * arc * 2, -3 + fy * reach * 3 - arc * 9];
}

function strokeSplash(side) {
  const [, , hx, hy] = strokeArm(player.dir, side, 1);
  const x = player.x + hx;
  const y = player.y - 3 + hy;
  for (let i = 0; i < 5; i++) {
    particles.push({ type: 'drop', x, y, vx: (Math.random() - 0.5) * 30, vy: -25 - Math.random() * 25, life: 0, max: 0.4 });
  }
  particles.push({ type: 'wake', layer: 'water', x, y: y + 1, vx: 0, vy: 0, life: 0, max: 0.6 });
  Sfx.swim(1.2);
}

function updateSwim(dt) {
  const [ix, iy] = readInput();
  player.sprinting = !!(ix || iy) && boosting() && eggStage !== 'carried';
  if (!ix && !iy) {
    player.frame = 0;
    return;
  }
  const speed = (boosting() ? 62 : 42) * dt;
  move(player, ix * speed, iy * speed);
  faceToward(player, ix, iy);
  const prev = Math.floor(player.anim);
  player.anim += dt * 5;
  player.frame = Math.floor(player.anim) % 4;
  if (player.sprinting) {
    const half = Math.floor(player.stroke * 2);
    player.stroke += dt * 1.1;
    const next = Math.floor(player.stroke * 2);
    if (next !== half) strokeSplash(next % 2 ? -1 : 1);
  } else if (Math.floor(player.anim) !== prev && player.frame % 2 === 0) {
    Sfx.swim();
  }
  if (Math.random() < dt * 14) {
    particles.push({ type: 'wake', layer: 'water', x: player.x - ix * 5, y: player.y - 2 - iy * 3, vx: -ix * 8, vy: -iy * 8, life: 0, max: 0.8 });
  }
  if (onLand(player.x, player.y)) player.swimming = false;
}

function jumpLift(e) {
  return e.jumpT < 0 ? 0 : Math.sin((e.jumpT / JUMP_TIME) * Math.PI) * JUMP_HEIGHT;
}

function updateJump(e, dt) {
  if (e.jumpDelay > 0) {
    e.jumpDelay -= dt;
    if (e.jumpDelay <= 0) e.jumpT = 0;
  }
  if (e.jumpT < 0) return;
  e.jumpT += dt;
  if (e.jumpT < JUMP_TIME) return;
  e.jumpT = -1;
  Sfx.land(e === player ? 1 : 0.5 * earshot(e.x, e.y));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    particles.push({ type: 'dust', x: e.x, y: e.y - 1, vx: Math.cos(a) * 18, vy: Math.sin(a) * 6, life: 0, max: 0.35 });
  }
}

function updatePlayer(dt) {
  if (player.swimming) return updateSwim(dt);
  updateJump(player, dt);
  const [ix, iy] = readInput();
  player.running = !!(ix || iy) && boosting();
  if (!ix && !iy) {
    player.anim = 0;
    player.frame = 0;
    return;
  }
  const running = player.running;
  const speed = (running ? 115 : 68) * dt;
  move(player, ix * speed, iy * speed);

  if (Math.abs(ix) > Math.abs(iy) + 0.01) player.dir = ix > 0 ? 'right' : 'left';
  else if (Math.abs(iy) > Math.abs(ix) + 0.01) player.dir = iy > 0 ? 'down' : 'up';
  else {
    const h = ix > 0 ? 'right' : 'left';
    const v = iy > 0 ? 'down' : 'up';
    if (player.dir !== h && player.dir !== v) player.dir = v;
  }
  if (player.anim === 0) player.anim = 1;
  const prev = Math.floor(player.anim);
  player.anim += dt * (running ? 12 : 7);
  player.frame = Math.floor(player.anim) % 4;
  if (Math.floor(player.anim) !== prev && player.frame % 2 === 1 && player.jumpT < 0) {
    Sfx.step(surfaceUnder(player.x, player.y));
    if (running) {
      for (let i = 0; i < 3; i++) {
        particles.push({ type: 'dust', x: player.x - ix * 4, y: player.y - 1, vx: -ix * 20 + (Math.random() - 0.5) * 14, vy: -iy * 10 - Math.random() * 6, life: 0, max: 0.3 + Math.random() * 0.15 });
      }
    }
  }
}

function updateNpc(n, dt) {
  if (n.talkT > 0) {
    n.talkT -= dt;
    if (n.talkT <= 0) n.bubble.classList.remove('show');
  }
  if (n.emoteT > 0) n.emoteT -= dt;
  updateJump(n, dt);
  if (n.pending) {
    n.pending.t -= dt;
    if (n.pending.t <= 0) {
      react(n, n.pending);
      n.pending = null;
    }
  }
  if (updateReaction(n, dt)) return;
  const near = !player.flying && Math.hypot(player.x - n.x, player.y - n.y) < 30;
  if (near || n.talkT > 0) {
    faceToward(n, player.x - n.x, player.y - n.y);
    n.frame = 0;
    n.state = 'idle';
    n.timer = Math.max(n.timer, 1);
    return;
  }
  if (n.fixed) {
    n.dir = n.fixed;
    n.frame = 0;
    return;
  }
  if (n.state === 'idle') {
    n.frame = 0;
    n.timer -= dt;
    if (n.timer > 0) return;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * n.roam;
      const tx = n.home.x + Math.cos(a) * r;
      const ty = n.home.y + Math.sin(a) * r;
      if (canStand(n, tx, ty)) {
        n.target = { x: tx, y: ty };
        n.state = 'walk';
        n.stuck = 0;
        return;
      }
    }
    n.timer = 1;
    return;
  }
  const dx = n.target.x - n.x;
  const dy = n.target.y - n.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2 || n.stuck > 0.4) {
    n.state = 'idle';
    n.timer = 1.5 + Math.random() * 3.5;
    return;
  }
  const sp = 28 * dt;
  if (!move(n, (dx / dist) * sp, (dy / dist) * sp)) n.stuck += dt;
  faceToward(n, dx, dy);
  n.anim += dt * 6;
  n.frame = Math.floor(n.anim) % 4;
}

function nearNpc() {
  let best = null;
  let bestD = 36;
  for (const n of npcs) {
    if (n.followT > 0) continue;
    const d = Math.hypot(n.x - player.x, n.y - player.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function talk() {
  const best = nearNpc();
  if (!best) return false;
  npcSay(best, best.line);
  faceToward(player, best.x - player.x, best.y - player.y);
  return true;
}

function npcSay(n, text) {
  if (!n.bubble) {
    n.bubble = document.createElement('div');
    n.bubble.className = 'bubble';
    bubbleLayer.appendChild(n.bubble);
  }
  text = text.replace(/\{name\}/g, player.name).replace(/\{lad\}/g, player.look.id === 'female' ? 'lass' : 'lad');
  n.bubble.textContent = text;
  n.bubble.classList.add('show');
  n.talkT = 2.5 + text.length * 0.05;
  Sfx.babble(VOICES[n.look.id] || 250, text, earshot(n.x, n.y));
}

// NPCs in earshot react to what the player says: the addressed or nearest one replies, others emote.
function hear(text) {
  const [lx, ly] = flight ? [flight.x, flight.y] : sail ? [shipObj.x, shipObj.y] : [player.x, player.y];
  const near = npcs
    .map((n) => [n, Math.hypot(n.x - lx, n.y - ly)])
    .filter(([, d]) => d < 80)
    .sort((a, b) => a[1] - b[1])
    .map(([n]) => n);
  if (!near.length) return;
  const topic = chatTopic(text);
  const speaker = near.find((n) => addresses(n.look.id, text)) || near[0];
  for (const n of near) {
    n.pending = { t: 0.35 + Math.random() * 0.35 + (n === speaker ? 0.25 : 0), topic, reply: n === speaker };
  }
}

// Once the egg leaves the ruin, egg talk (and all of the hermit's hints) moves on with the story.
function storyTopic(n, topic) {
  if (eggStage === 'ruin') return topic;
  if (topic === 'dragon' && eggStage === 'hatched') return 'hatched';
  const hint = n.look.id === 'hermit' && ['help', 'question', 'dragon', 'other'].includes(topic);
  if (topic !== 'egg' && !hint) return topic;
  return eggStage === 'hatched' ? 'hatched' : 'eggFound';
}

function react(n, { topic: heard, reply }) {
  const topic = storyTopic(n, heard);
  faceToward(n, player.x - n.x, player.y - n.y);
  n.emote = TOPIC_EMOTES[topic];
  n.emoteT = 1.8;
  if (topic === 'dance' && !n.fixed) n.danceT = 2.4;
  if (!reply) return;
  npcSay(n, npcReply(n.look.id, topic));
  playerSayT = Math.min(playerSayT, 0.01);
  if (n.fixed) return;
  if (topic === 'follow') n.followT = 45;
  if (topic === 'stop' && n.followT > 0) {
    n.followT = 0;
    n.home = { x: n.x, y: n.y };
  }
  if (topic === 'insult') n.fleeT = 0.7;
}

// Dancing, fleeing and following override the usual roaming; returns true when handled.
function updateReaction(n, dt) {
  if (n.danceT > 0) {
    n.danceT -= dt;
    n.dir = ['down', 'left', 'up', 'right'][Math.floor(time * 7) % 4];
    n.frame = 1;
    return true;
  }
  if (n.fleeT > 0) {
    n.fleeT -= dt;
    const dx = n.x - player.x;
    const dy = n.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    move(n, (dx / d) * 70 * dt, (dy / d) * 70 * dt);
    n.anim += dt * 9;
    n.frame = Math.floor(n.anim) % 4;
    if (n.fleeT <= 0) n.home = { x: n.x, y: n.y };
    return true;
  }
  if (n.followT > 0) {
    n.followT -= dt;
    if (n.followT <= 0) {
      n.home = { x: n.x, y: n.y };
      npcSay(n, 'I\'d best stay here.');
      return true;
    }
    const dx = player.x - n.x;
    const dy = player.y - n.y;
    const d = Math.hypot(dx, dy);
    faceToward(n, dx, dy);
    if (player.flying || player.swimming || d < 24) {
      n.frame = 0;
      return true;
    }
    const sp = (d > 60 ? 95 : 62) * dt;
    move(n, (dx / d) * sp, (dy / d) * sp);
    n.anim += dt * 8;
    n.frame = Math.floor(n.anim) % 4;
    return true;
  }
  return false;
}

const playerBubble = document.createElement('div');
playerBubble.className = 'bubble player';
bubbleLayer.appendChild(playerBubble);
let playerSayT = 0;

function say(text) {
  playerBubble.textContent = text;
  playerBubble.classList.add('show');
  playerSayT = 3 + text.length * 0.06;
  Sfx.babble(VOICES[player.look.id], text);
  hear(text);
}

// Screen point (world pixels) just above the player's head, wherever they are.
function playerHead() {
  const [x, y] = headPos();
  return [x, eggStage === 'carried' ? y - 10 : y];
}

function headPos() {
  if (flight) return [flight.x, flight.y - flight.alt - 50];
  if (sail) {
    const d = deckPos();
    return [d.x, shipObj.y - d.lift - 20];
  }
  if (hop) return [player.x, player.y - 24 - hop.lift0 - (hop.lift1 - hop.lift0) * hop.t - Math.sin(hop.t * Math.PI) * 16];
  if (player.swimming && inWater(player.x, player.y)) return [player.x, player.y - 18];
  return [player.x, player.y - 24 - jumpLift(player)];
}

// ---------- dragon riding ----------

// Distance from the player to the nearest edge of a collider box.
function boxDist(c) {
  const dx = Math.max(c.x0 - player.x, 0, player.x - c.x1);
  const dy = Math.max(c.y0 - player.y, 0, player.y - c.y1);
  return Math.hypot(dx, dy);
}

function nearDragon() {
  if (!dragonObj || flight || sail || hop || dragonObj.hidden) return false;
  return boxDist(dragonObj.col) < 34;
}

// A short jump between the ground and the dragon's back; `lift` is visual height.
function startHop(tx, ty, lift0, lift1, done) {
  hop = { fx: player.x, fy: player.y, tx, ty, lift0, lift1, t: 0, done };
  player.jumpT = -1;
  player.flying = true;
  faceToward(player, tx - player.x, ty - player.y);
}

function updateHop(dt) {
  hop.t = Math.min(1, hop.t + dt / 0.45);
  player.x = hop.fx + (hop.tx - hop.fx) * hop.t;
  player.y = hop.fy + (hop.ty - hop.fy) * hop.t;
  if (hop.t >= 1) {
    const done = hop.done;
    hop = null;
    done();
  }
}

function mount() {
  const d = dragonObj;
  startHop(d.x + 2, d.y, 0, 14, () => {
    d.hidden = true;
    d.col.off = true;
    flight = {
      x: d.x, y: d.y, alt: 0, vx: 0, vy: 0, dir: 'down', flap: 0, mode: 'takeoff', land: null,
      loop: -1, fireCd: 0, diveT: 0, splashed: false,
    };
    player.flying = true;
    dust(d.x, d.y);
    Sfx.roar();
  });
}

function landingSpot() {
  const x = Math.round(flight.x);
  const y = Math.round(flight.y);
  if (blocked(x - 23, y - 12, x + 23, y, player)) return null;
  for (const [dx, dy] of [[0, 14], [-34, 2], [34, 2], [0, -16]]) {
    if (canStand(player, x + dx, y + dy)) return { x, y, px: x + dx, py: y + dy };
  }
  return null;
}

function land() {
  const spot = landingSpot();
  if (!spot) return;
  flight.mode = 'landing';
  flight.land = spot;
}

function finishLanding() {
  const s = flight.land;
  const d = dragonObj;
  d.x = s.x;
  d.y = s.y;
  d.hidden = false;
  d.col.off = false;
  placeCollider(d);
  flight = null;
  player.x = s.x;
  player.y = s.y;
  dust(s.x, s.y);
  Sfx.land(2);
  startHop(s.px, s.py, 14, 0, () => {
    player.flying = false;
    faceToward(player, d.x - player.x, d.y - player.y);
  });
}

function updateFlight(dt) {
  const f = flight;
  const [ix, iy] = readInput();
  const boost = boosting() && (ix || iy);

  if (f.mode === 'takeoff') {
    f.alt = Math.min(FLY_ALT, f.alt + dt * 45);
    if (f.alt >= FLY_ALT) f.mode = 'fly';
  }
  if (f.mode === 'dive') {
    f.diveT = Math.min(1, f.diveT + dt / 1.2);
    f.alt = FLY_ALT * (1 - Math.sin(f.diveT * Math.PI) * 0.92);
    if (!f.splashed && f.diveT >= 0.5) {
      f.splashed = true;
      splash(f.x, f.y);
      seaSplash(f.x, f.y - 2, 2.4);
      Sfx.splash(1.4);
    }
    if (f.diveT >= 1) f.mode = 'fly';
  }
  updateTricks(f, dt);

  if (f.mode === 'landing') {
    const k = 1 - Math.exp(-dt * 6);
    f.x += (f.land.x - f.x) * k;
    f.y += (f.land.y - f.y) * k;
    f.vx = 0;
    f.vy = 0;
    f.alt -= dt * 42;
    if (f.alt <= 0) {
      finishLanding();
      return;
    }
  } else {
    const steer = f.mode === 'fly' || f.mode === 'dive' || f.alt > 16;
    const max = boost ? 250 : 140;
    const k = 1 - Math.exp(-dt * (steer && (ix || iy) ? 2.5 : 1.8));
    f.vx += ((steer ? ix * max : 0) - f.vx) * k;
    f.vy += ((steer ? iy * max : 0) - f.vy) * k;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const minX = 20;
    const maxX = MAP_W * TILE - 20;
    const minY = 80;
    const maxY = MAP_H * TILE - 6;
    if (f.x < minX || f.x > maxX) { f.x = Math.max(minX, Math.min(maxX, f.x)); f.vx = 0; }
    if (f.y < minY || f.y > maxY) { f.y = Math.max(minY, Math.min(maxY, f.y)); f.vy = 0; }
  }

  const speed = Math.hypot(f.vx, f.vy);
  if (speed > 20) faceToward(f, f.vx, f.vy);
  const beat = Math.floor(f.flap / 4);
  f.flap += dt * (f.mode === 'takeoff' ? 13 : boost ? 12 : speed > 20 ? 8 : 6);
  if (Math.floor(f.flap / 4) !== beat) Sfx.flap(f.mode === 'takeoff' ? 1 : 0.6);
  player.x = f.x;
  player.y = f.y;
  player.dir = f.dir;

  if (speed > 170 && Math.random() < dt * 40) {
    particles.push({
      type: 'wind', layer: 'sky', x: cam.x + Math.random() * viewW, y: cam.y + Math.random() * viewH,
      dx: f.vx / speed, dy: f.vy / speed, vx: 0, vy: 0, life: 0, max: 0.35,
    });
  }
}

// ---------- dragon tricks ----------

const DIR_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
// Mouth as [ground x offset, ground y offset, height above the dragon's altitude].
const MOUTH = { right: [30, 0, 18], left: [-30, 0, 18], down: [0, 8, 0], up: [0, -10, 22] };
const PLASMA = ['#b05cff', '#e7c8ff', '#7a2fd6'];
const fireballs = [];

const flightBob = (f) => (f.mode === 'fly' ? Math.sin(time * 3) * 2 : 0);

// Offset and rotation of the dragon while looping; side views loop vertically, others spin.
function loopPose(f) {
  if (f.loop < 0) return [0, 0, 0];
  const a = f.loop * Math.PI * 2;
  if (isHorizontal(f.dir)) {
    const s = f.dir === 'right' ? 1 : -1;
    return [Math.sin(a) * 18 * s, -(1 - Math.cos(a)) * 18, -a * s];
  }
  return [0, -Math.sin(f.loop * Math.PI) * 16, a * (f.dir === 'down' ? 1 : -1)];
}

// World point at the dragon's body centre, including altitude, bob and loop offset.
function dragonBody(f) {
  const [ox, oy] = loopPose(f);
  return [f.x + ox, f.y - f.alt - flightBob(f) - 11 + oy];
}

function overWater(f) {
  return tileAt(Math.floor(f.x / TILE), Math.floor((f.y - 1) / TILE)) === T.WATER;
}

function breatheFire() {
  const f = flight;
  if (!f || f.mode !== 'fly' || f.loop >= 0 || f.fireCd > 0) return;
  f.fireCd = 0.35;
  const [mx, my, mh] = MOUTH[f.dir];
  const [dx, dy] = DIR_VEC[f.dir];
  const x0 = f.x + mx;
  const y0 = f.y + my;
  fireballs.push({
    x0, y0, h0: f.alt + flightBob(f) + mh,
    x1: x0 + dx * 120 + f.vx * 0.45, y1: y0 + dy * 120 + f.vy * 0.45,
    x: x0, y: y0, h: 0, t: 0, dur: 0.5,
  });
  Sfx.plasma();
}

function plasmaHit(x, y) {
  const near = earshot(x, y);
  particles.push({ type: 'flash', layer: 'sky', x, y: y - 4, vx: 0, vy: 0, c: PLASMA[0], life: 0, max: 0.3 });
  if (tileAt(Math.floor(x / TILE), Math.floor((y - 1) / TILE)) === T.WATER) {
    splash(x, y);
    seaSplash(x, y - 2, 1.4);
    for (let i = 0; i < 6; i++) particles.push({ type: 'smoke', x: x + (Math.random() - 0.5) * 10, y: y - 4, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 10, life: 0, max: 1.2 });
    Sfx.splash(0.8 * near);
    Sfx.hiss(near);
    return;
  }
  burst(x, y - 3, PLASMA, 36, 90);
  particles.push({ type: 'shock', layer: 'water', x, y: y - 1, vx: 0, vy: 0, life: 0, max: 0.45 });
  for (let i = 0; i < 5; i++) particles.push({ type: 'smoke', x: x + (Math.random() - 0.5) * 8, y: y - 4, vx: (Math.random() - 0.5) * 10, vy: -14 - Math.random() * 8, life: 0, max: 1.4 });
  for (const n of npcs) {
    if (Math.hypot(n.x - x, n.y - y) > 60) continue;
    n.emote = 'exclaim';
    n.emoteT = 1.8;
    faceToward(n, x - n.x, y - n.y);
  }
  Sfx.blast(near);
}

function loopTrick() {
  const f = flight;
  if (!f || f.mode !== 'fly' || f.loop >= 0) return;
  f.loop = 0;
  Sfx.whoosh();
}

function splashDive() {
  const f = flight;
  if (!f || f.mode !== 'fly' || f.loop >= 0 || !overWater(f)) return;
  f.mode = 'dive';
  f.diveT = 0;
  f.splashed = false;
  Sfx.whoosh();
}

function burst(x, y, colors, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
    const sp = speed * (0.6 + Math.random() * 0.4);
    particles.push({ type: 'spark', layer: 'sky', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, c: colors[i % colors.length], c2: colors[(i + 1) % colors.length], life: 0, max: 0.9 + Math.random() * 0.5 });
  }
}

function updateTricks(f, dt) {
  f.fireCd -= dt;
  if (f.loop >= 0) {
    f.loop += dt / 0.9;
    if (f.loop >= 1) f.loop = -1;
    else {
      const [bx, by] = dragonBody(f);
      particles.push({ type: 'sparkle', layer: 'sky', x: bx + (Math.random() - 0.5) * 20, y: by + (Math.random() - 0.5) * 10, vx: 0, vy: 0, life: 0, max: 0.5 });
    }
  }
}

function updateFireballs(dt) {
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const b = fireballs[i];
    b.t += dt;
    const u = Math.min(1, b.t / b.dur);
    b.x = b.x0 + (b.x1 - b.x0) * u;
    b.y = b.y0 + (b.y1 - b.y0) * u;
    b.h = b.h0 * (1 - u * u);
    for (let k = 0; k < 3; k++) {
      particles.push({ type: 'plasma', layer: 'sky', x: b.x + (Math.random() - 0.5) * 7, y: b.y - b.h + (Math.random() - 0.5) * 7, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 0, max: 0.45 + Math.random() * 0.25 });
    }
    if (u < 1) continue;
    fireballs.splice(i, 1);
    plasmaHit(b.x, b.y);
  }
}

function drawFireballs(cx, cy) {
  for (const b of fireballs) {
    ctx.globalAlpha = 0.25;
    ellipse(ctx, Math.round(b.x - cx), Math.round(b.y - cy) - 1, 4, 1.5, '#000000');
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const b of fireballs) ctx.drawImage(glowSprite(22, PLASMA[0]), Math.round(b.x - 22 - cx), Math.round(b.y - b.h - 22 - cy));
  ctx.globalCompositeOperation = 'source-over';
  for (const b of fireballs) {
    const x = Math.round(b.x - cx);
    const y = Math.round(b.y - b.h - cy);
    const pulse = Math.sin(time * 40) > 0 ? 1 : 0;
    ellipse(ctx, x, y, 5 + pulse, 5 + pulse, PLASMA[2]);
    ellipse(ctx, x, y, 4, 4, PLASMA[0]);
    ellipse(ctx, x, y, 2.5, 2.5, PLASMA[1]);
    rect(ctx, x - 1, y - 1, 2, 2, '#ffffff');
  }
}

// ---------- dragon egg & baby dragon ----------

const HATCH_TIME = 6;
const STORY_LINES = {
  carried: {
    hermit: 'You found it! Keep it warm by the fire in your village, and it will hatch.',
    chief: 'A dragon egg! Set it by the plaza fire, {name}.',
    kid: 'Is that a DRAGON EGG?! Put it by the fire!',
  },
  warming: { kid: 'It\'s hatching! It\'s hatching!' },
  hatched: {
    hermit: 'A dragon of your very own. Be kind to it.',
    chief: 'A new dragon in our village! This is a great day.',
    kid: 'Your baby dragon is SO cute!',
  },
};

function setStage(stage) {
  eggStage = stage;
  const lines = STORY_LINES[stage];
  for (const n of npcs) if (lines[n.look.id]) n.line = lines[n.look.id];
}

const grounded = () => !player.flying && !player.swimming;

function nearEgg() {
  return eggStage === 'ruin' && grounded() && boxDist(eggObj.col) < 14;
}

function pickUpEgg() {
  eggObj.hidden = true;
  eggObj.col.off = true;
  faceToward(player, eggObj.x - player.x, eggObj.y - player.y);
  burst(eggObj.x, eggObj.y - 10, ['#ffffff', '#fff27a', '#d9b8ff'], 14, 40);
  Sfx.pickup();
  setStage('carried');
}

function nearFire() {
  return eggStage === 'carried' && grounded() && Math.hypot(player.x - villageFire.x, player.y - villageFire.y) < 48;
}

// A free spot on a ring around the fire, as close to the player's side as possible.
function fireSpot() {
  const f = villageFire;
  const a0 = Math.atan2(player.y - f.y, player.x - f.x);
  for (let i = 0; i < 12; i++) {
    const a = a0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 6);
    const x = Math.round(f.x + Math.cos(a) * 32);
    const y = Math.round(f.y - 4 + Math.sin(a) * 20);
    if (!blocked(x - 7, y - 4, x + 7, y, null)) return { x, y };
  }
  return null;
}

function placeEgg() {
  const spot = fireSpot();
  if (!spot) return false;
  Object.assign(eggObj, { x: spot.x, y: spot.y, hidden: false, crack: 0 });
  eggObj.col.off = false;
  placeCollider(eggObj);
  faceToward(player, spot.x - player.x, spot.y - player.y);
  dust(spot.x, spot.y);
  Sfx.land();
  hatchT = 0;
  setStage('warming');
  return true;
}

function updateEgg(dt) {
  if (eggStage !== 'warming') return;
  hatchT += dt;
  const crack = Math.min(3, Math.floor((hatchT / HATCH_TIME) * 4));
  if (crack !== eggObj.crack) {
    eggObj.crack = crack;
    burst(eggObj.x, eggObj.y - 10, ['#ffe9a8', '#ffffff'], 6, 24);
    Sfx.crack(earshot(eggObj.x, eggObj.y));
  }
  if (hatchT >= HATCH_TIME) hatch();
}

function hatch() {
  const { x, y } = eggObj;
  eggObj.hidden = true;
  eggObj.col.off = true;
  particles.push({ type: 'flash', layer: 'sky', x, y: y - 10, vx: 0, vy: 0, c: '#d9b8ff', life: 0, max: 0.5 });
  burst(x, y - 10, ['#4b2a73', '#8a5cc7', '#ffe9a8'], 18, 60);
  for (let i = 0; i < 12; i++) {
    particles.push({ type: 'sparkle', layer: 'sky', x: x + (Math.random() - 0.5) * 30, y: y - 6 - Math.random() * 26, vx: 0, vy: -10, life: 0, max: 0.6 + Math.random() * 0.6 });
  }
  baby = { x, y, alt: 0, dir: 'down', anim: 0, frame: 0, flying: false, stuck: 0, jumpT: 0, jumpDelay: 0, emote: 'heart', emoteT: 1.8, chirpT: 4 };
  for (const n of npcs) {
    if (Math.hypot(n.x - x, n.y - y) > 90) continue;
    n.emote = Math.random() < 0.5 ? 'heart' : 'exclaim';
    n.emoteT = 1.8;
    faceToward(n, x - n.x, y - n.y);
  }
  Sfx.hatch();
  setStage('hatched');
}

// Where the baby heads: the player on foot, or a spot trailing them in the air.
function babyLeader() {
  if (flight) {
    const [vx, vy] = DIR_VEC[flight.dir];
    return { x: flight.x - vx * 40 - vy * 16, y: flight.y - vy * 30, alt: flight.alt + 6, air: true };
  }
  if (sail) {
    const [sx, sy] = sternPos();
    return { x: sx, y: sy, alt: 30, air: true };
  }
  if (player.flying || player.swimming) {
    const [vx, vy] = DIR_VEC[player.dir];
    return { x: player.x - vx * 16, y: player.y - vy * 12, alt: 16, air: true };
  }
  return { x: player.x, y: player.y, alt: 0, air: false };
}

// Walks after the player, and flutters along when they leave the ground or it gets stuck or left behind.
function updateBaby(dt) {
  const b = baby;
  if (b.emoteT > 0) b.emoteT -= dt;
  updateJump(b, dt);
  const L = babyLeader();
  const dx = L.x - b.x;
  const dy = L.y - b.y;
  const d = Math.hypot(dx, dy);
  if (!b.flying && (L.air || d > 140 || b.stuck > 0.6)) {
    b.flying = true;
    b.jumpT = -1;
    b.jumpDelay = 0;
    Sfx.flap(0.3 * earshot(b.x, b.y));
  }

  if (b.flying) {
    const k = 1 - Math.exp(-dt * (L.air ? 3 : 4));
    const reach = L.air ? d : Math.max(0, d - 16);
    if (d > 0.5) {
      b.x += (dx / d) * reach * k;
      b.y += (dy / d) * reach * k;
    }
    const landing = !L.air && d < 30 && canStand(b, b.x, b.y);
    const alt = L.air ? L.alt : landing ? 0 : 18;
    b.alt += (alt - b.alt) * (1 - Math.exp(-dt * 4));
    if (d > 2) faceToward(b, dx, dy);
    b.anim += dt * 12;
    b.frame = Math.floor(b.anim) % 2;
    if (landing && b.alt < 1) {
      Object.assign(b, { flying: false, alt: 0, stuck: 0, anim: 0, frame: 0 });
    }
    return;
  }

  faceToward(b, dx, dy);
  if (d < 20) {
    b.anim = 0;
    b.chirpT -= dt;
    if (b.chirpT <= 0) {
      b.chirpT = 7 + Math.random() * 7;
      b.emote = Math.random() < 0.5 ? 'heart' : 'note';
      b.emoteT = 1.8;
      Sfx.chirp(earshot(b.x, b.y));
    }
    return;
  }
  const sp = (d > 50 ? 125 : 72) * dt;
  const ox = b.x;
  const oy = b.y;
  move(b, (dx / d) * sp, (dy / d) * sp);
  b.stuck = Math.hypot(b.x - ox, b.y - oy) < sp * 0.3 ? b.stuck + dt : 0;
  b.anim += dt * 8;
}

function babyLift(b) {
  if (b.flying) return b.alt + 2 + Math.sin(time * 6) * 1.5;
  return jumpLift(b) + Math.abs(Math.sin(b.anim * Math.PI)) * 2;
}

function drawBaby(cx, cy) {
  const img = SPR.babyDragon[baby.dir][baby.jumpT >= 0 ? 1 : baby.frame];
  ctx.drawImage(img, Math.round(baby.x) - 13 - cx, Math.round(baby.y - babyLift(baby)) - 22 - cy);
}

// `top` is the top edge of the carrier's sprite, in screen pixels. Drawn before the carrier,
// so the raised hands overlap the egg.
function drawHeldEgg(x, top) {
  ctx.drawImage(SPR.heldEgg, Math.round(x) - 6, Math.round(top) - 11);
}

// ---------- sheep ----------

function updateSheep(s, dt) {
  if (s.emoteT > 0) s.emoteT -= dt;
  s.baaT -= dt;
  if (s.baaT <= 0) {
    s.baaT = 8 + Math.random() * 14;
    Sfx.baa(0.6 * earshot(s.x, s.y));
  }
  if (s.state !== 'walk') {
    s.timer -= dt;
    if (s.timer > 0) return;
    s.target = { x: PEN.x0 + Math.random() * (PEN.x1 - PEN.x0), y: PEN.y0 + Math.random() * (PEN.y1 - PEN.y0) };
    s.state = 'walk';
    s.stuck = 0;
    return;
  }
  const dx = s.target.x - s.x;
  const dy = s.target.y - s.y;
  const d = Math.hypot(dx, dy);
  if (d < 2 || s.stuck > 0.5) {
    s.state = Math.random() < 0.6 ? 'graze' : 'idle';
    s.timer = 2 + Math.random() * 4;
    return;
  }
  const sp = 14 * dt;
  if (!move(s, (dx / d) * sp, (dy / d) * sp)) s.stuck += dt;
  if (Math.abs(dx) > 1) s.dir = dx > 0 ? 'right' : 'left';
  s.anim += dt * 5;
}

function nearSheep() {
  if (!grounded()) return null;
  let best = null;
  let bestD = 40;
  for (const s of sheep) {
    const d = Math.hypot(s.x - player.x, s.y - player.y);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function petSheep() {
  const s = nearSheep();
  if (!s) return false;
  Object.assign(s, { dir: player.x > s.x ? 'right' : 'left', state: 'idle', timer: 1.5, emote: 'heart', emoteT: 1.8 });
  s.baaT = 8 + Math.random() * 12;
  Sfx.baa(1);
  return true;
}

function drawSheep(s, cx, cy) {
  const chewing = (time + s.phase) % 3 < 0.6;
  const f = s.state === 'walk' ? Math.floor(s.anim) % 2 : s.state === 'graze' && !chewing ? 2 : 0;
  ctx.drawImage(SPR.sheep[s.dir][f], Math.round(s.x) - 13 - cx, Math.round(s.y) - 16 - cy);
}

// ---------- sailing ----------

const isHorizontal = (dir) => dir === 'left' || dir === 'right';

function shipBox(dir, x, y) {
  return isHorizontal(dir) ? [x - 44, y - 12, x + 44, y + 2] : [x - 16, y - 50, x + 16, y + 2];
}

function shipBlocked(dir, x, y) {
  const [x0, y0, x1, y1] = shipBox(dir, x, y);
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor(y1 / TILE); ty++) {
    for (let tx = Math.floor(x0 / TILE); tx <= Math.floor(x1 / TILE); tx++) {
      if (!inBounds(tx, ty) || tileAt(tx, ty) !== T.WATER) return true;
    }
  }
  for (const r of seaRocks) if (x1 > r.x - 10 && x0 < r.x + 10 && y1 > r.y - 8 && y0 < r.y) return true;
  return false;
}

function deckPos() {
  const d = SPR.ship.dirs[shipObj.dir];
  return { x: shipObj.x + d.seat[0] - d.ox, lift: d.oy - d.seat[1] - 5 };
}

function nearShip() {
  if (sail || flight || hop) return false;
  const [x0, y0, x1, y1] = shipBox(shipObj.dir, shipObj.x, shipObj.y);
  const dx = Math.max(x0 - player.x, 0, player.x - x1);
  const dy = Math.max(y0 - player.y, 0, player.y - y1);
  return Math.hypot(dx, dy) < 56;
}

function board() {
  const deck = deckPos();
  player.swimming = false;
  startHop(deck.x, shipObj.y, 0, deck.lift, () => {
    sail = { vx: 0, vy: 0, wakeT: 0, shoreT: 0, shore: null };
    shipObj.rider = player.look;
    player.flying = true;
    Sfx.thunk();
  });
}

// Nearest walkable spot just off the hull, or null when out at sea.
function shoreSpot() {
  const [x0, y0, x1, y1] = shipBox(shipObj.dir, shipObj.x, shipObj.y);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let best = null;
  let bestD = Infinity;
  for (let r = 8; r <= 50; r += 6) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const x = cx + Math.cos(ang) * ((x1 - x0) / 2 + r);
      const y = cy + Math.sin(ang) * ((y1 - y0) / 2 + r);
      if (!canStand(player, x, y)) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
  }
  return best;
}

function disembark() {
  const spot = shoreSpot();
  if (!spot) return;
  const deck = deckPos();
  shipObj.rider = null;
  sail = null;
  player.x = deck.x;
  player.y = shipObj.y;
  startHop(spot.x, spot.y, deck.lift, 0, () => {
    player.flying = false;
    Sfx.land();
  });
}

function sternPos() {
  const { x, y, dir } = shipObj;
  if (dir === 'right') return [x - 44, y - 2];
  if (dir === 'left') return [x + 44, y - 2];
  if (dir === 'down') return [x, y - 50];
  return [x, y + 2];
}

function updateSail(dt) {
  const s = sail;
  const o = shipObj;
  const [ix, iy] = readInput();
  const full = boosting() && (ix || iy);
  const max = full ? 170 : 95;
  const k = 1 - Math.exp(-dt * (ix || iy ? 1.1 : 0.6));
  s.vx += (ix * max - s.vx) * k;
  s.vy += (iy * max - s.vy) * k;

  const nx = o.x + s.vx * dt;
  if (!shipBlocked(o.dir, nx, o.y)) o.x = nx;
  else s.vx *= -0.2;
  const ny = o.y + s.vy * dt;
  if (!shipBlocked(o.dir, o.x, ny)) o.y = ny;
  else s.vy *= -0.2;

  const ax = Math.abs(s.vx);
  const ay = Math.abs(s.vy);
  if (Math.hypot(s.vx, s.vy) > 15) {
    let nd = o.dir;
    if (isHorizontal(o.dir) ? ay > ax * 1.3 : ax > ay * 1.3) {
      nd = ax > ay ? (s.vx > 0 ? 'right' : 'left') : (s.vy > 0 ? 'down' : 'up');
    } else if (isHorizontal(o.dir)) nd = s.vx > 0 ? 'right' : 'left';
    else nd = s.vy > 0 ? 'down' : 'up';
    if (nd !== o.dir && !shipBlocked(nd, o.x, o.y)) o.dir = nd;
  }
  player.x = o.x;
  player.y = o.y;

  const speed = Math.hypot(s.vx, s.vy);
  s.wakeT -= dt;
  if (speed > 20 && s.wakeT <= 0) {
    s.wakeT = full ? 0.025 : 0.045;
    const [wx, wy] = sternPos();
    const spread = isHorizontal(o.dir) ? [0, (Math.random() - 0.5) * 6] : [(Math.random() - 0.5) * 6, 0];
    particles.push({ type: 'wake', layer: 'water', x: wx + spread[0], y: wy + spread[1], vx: -s.vx * 0.15, vy: -s.vy * 0.15, life: 0, max: 1.4 });
    const side = Math.random() < 0.5 ? -1 : 1;
    const [hx, hy] = isHorizontal(o.dir) ? [o.x + (Math.random() - 0.5) * 70, o.y + 2] : [o.x + side * 15, o.y - Math.random() * 48];
    particles.push({ type: 'wake', layer: 'water', x: hx, y: hy, vx: 0, vy: 0, life: 0, max: 0.8 });
  }

  s.shoreT -= dt;
  if (s.shoreT <= 0) {
    s.shoreT = 0.2;
    s.shore = shoreSpot();
  }
}

function action() {
  if (hop) return;
  if (flight) {
    if (flight.mode !== 'fly') return;
    if (landingSpot()) land();
    else splashDive();
    return;
  }
  if (sail) disembark();
  else if (nearShip()) board();
  else if (nearDragon()) mount();
  else if (nearEgg()) pickUpEgg();
  else if (!(nearFire() && placeEgg()) && !talk() && !petSheep()) jump();
}

// ---------- camera & zoom ----------

function applyView() {
  viewW = Math.min(buffer.width, Math.ceil(window.innerWidth / zoom));
  viewH = Math.min(buffer.height, Math.ceil(window.innerHeight / zoom));
}

function updateZoom(dt) {
  const target = sail || (flight && flight.mode !== 'landing' && (flight.alt > 8 || flight.mode === 'dive')) ? flyZoom : baseZoom;
  zoom += (target - zoom) * (1 - Math.exp(-dt * 2.5));
  if (Math.abs(target - zoom) < 0.003) zoom = target;
  applyView();
}

function updateCamera(dt, snap) {
  const mw = MAP_W * TILE;
  const mh = MAP_H * TILE;
  const focusY = flight ? flight.y - flight.alt - 12 : sail ? player.y - 30 : player.y - 10;
  let tx = player.x - viewW / 2;
  let ty = focusY - viewH / 2;
  tx = mw > viewW ? Math.max(0, Math.min(mw - viewW, tx)) : (mw - viewW) / 2;
  ty = mh > viewH ? Math.max(0, Math.min(mh - viewH, ty)) : (mh - viewH) / 2;
  if (snap) {
    cam.x = tx;
    cam.y = ty;
  } else {
    const k = 1 - Math.exp(-dt * 10);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
  }
}

// ---------- particles ----------

const particles = [];
let mistTimer = 0;

function dust(x, y) {
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    particles.push({ type: 'dust', x, y: y - 2, vx: Math.cos(a) * 34, vy: Math.sin(a) * 12, life: 0, max: 0.5 + Math.random() * 0.3 });
  }
}

function emitParticles(dt) {
  for (const o of objects) {
    if (o.key !== 'forge' && o.key !== 'bonfire') continue;
    o.emitT = (o.emitT ?? 0) - dt;
    if (o.emitT > 0) continue;
    if (o.key === 'forge') {
      o.emitT = 0.18;
      particles.push({ type: 'smoke', x: o.x - 28 + (Math.random() - 0.5) * 6, y: o.y - 76, vx: 5 + Math.random() * 6, vy: -14 - Math.random() * 6, life: 0, max: 2.4 + Math.random() });
    } else {
      o.emitT = 0.07;
      particles.push({ type: 'ember', x: o.x + (Math.random() - 0.5) * 12, y: o.y - 10, vx: (Math.random() - 0.5) * 10, vy: -22 - Math.random() * 18, life: 0, max: 0.8 + Math.random() * 0.7 });
      if (Math.random() < 0.12) particles.push({ type: 'smoke', x: o.x, y: o.y - 22, vx: 3 + Math.random() * 4, vy: -12, life: 0, max: 1.8 });
    }
  }
  eggObj.emitT = (eggObj.emitT ?? 0) - dt;
  if (!eggObj.hidden && eggObj.emitT <= 0) {
    const warm = eggStage === 'warming';
    eggObj.emitT = warm ? 0.08 + Math.random() * 0.1 : 0.35 + Math.random() * 0.4;
    particles.push({ type: 'sparkle', x: eggObj.x + (Math.random() - 0.5) * (warm ? 24 : 18), y: eggObj.y - 4 - Math.random() * 18, vx: 0, vy: -6, life: 0, max: 0.7 });
  }
  mistTimer -= dt;
  if (mistTimer <= 0) {
    mistTimer = 0.12;
    particles.push({ type: 'mist', x: (OX + 1 + Math.random() * 3) * TILE, y: (OY + 9) * TILE + 2, vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 6, life: 0, max: 1 + Math.random() });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life >= p.max) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'smoke') p.vx += 2 * dt;
    if (p.type === 'ember') p.vx += Math.sin(time * 5 + p.y) * 10 * dt;
    if (p.type === 'dust' || p.type === 'wake') { p.vx *= Math.exp(-dt * 4); p.vy *= Math.exp(-dt * 4); }
    if (p.type === 'drop') p.vy += 260 * dt;
    if (p.type === 'spark') { p.vy += 40 * dt; p.vx *= Math.exp(-dt * 1.8); p.vy *= Math.exp(-dt * 1.8); }
  }
}

let seaShare = 0;
let seaShareT = 0;

// Waves get louder the more sea is on screen; wind rises with flight speed.
function updateAmbience(dt) {
  seaShareT -= dt;
  if (seaShareT <= 0) {
    seaShareT = 0.5;
    let wet = 0;
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < 8; i++) {
        const x = cam.x + ((i + 0.5) / 8) * viewW;
        const y = cam.y + ((j + 0.5) / 6) * viewH;
        if (tileAt(Math.floor(x / TILE), Math.floor(y / TILE)) === T.WATER) wet++;
      }
    }
    seaShare = wet / 48;
  }
  const air = flight ? (flight.alt / FLY_ALT) * (0.35 + 0.65 * Math.min(1, Math.hypot(flight.vx, flight.vy) / 250)) : 0;
  Sfx.ambience(sail || player.swimming ? 1 : 0.15 + seaShare * 0.85, air);
}

function update(dt) {
  time += dt;
  if (hop) updateHop(dt);
  else if (sail) updateSail(dt);
  else if (flight) updateFlight(dt);
  else updatePlayer(dt);
  for (const n of npcs) updateNpc(n, dt);
  for (const s of sheep) updateSheep(s, dt);
  updateEgg(dt);
  if (baby) updateBaby(dt);
  if (playerSayT > 0) {
    playerSayT -= dt;
    if (playerSayT <= 0) playerBubble.classList.remove('show');
  }
  for (const c of clouds) c.x += c.v * dt;
  updateSea(dt);
  updateFireballs(dt);
  updateAmbience(dt);
  emitParticles(dt);
  updateParticles(dt);
  updateZoom(dt);
  updateCamera(dt, false);
}

// ---------- render ----------

const glowCache = new Map();

function glowSprite(r, color) {
  const key = r + color;
  let c = glowCache.get(key);
  if (!c) {
    c = makeCanvas(r * 2, r * 2);
    const g = c.getContext('2d');
    const rgb = hexToRgb(color).join(',');
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, `rgba(${rgb},0.45)`);
    grd.addColorStop(0.45, `rgba(${rgb},0.15)`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, r * 2, r * 2);
    glowCache.set(key, c);
  }
  return c;
}

function clippedStreak(X, Y, i, wy0, sy, len, color) {
  const s0 = Math.max(sy, wy0);
  const s1 = Math.min(sy + len, wy0 + TILE);
  if (s1 > s0) rect(ctx, X + i, Y + (s0 - wy0), 2, s1 - s0, color);
}

function drawAnimatedTiles(cx, cy) {
  const x0 = Math.max(0, Math.floor(cx / TILE));
  const y0 = Math.max(0, Math.floor(cy / TILE));
  const x1 = Math.min(MAP_W - 1, Math.floor((cx + viewW) / TILE));
  const y1 = Math.min(MAP_H - 1, Math.floor((cy + viewH) / TILE));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = map[y * MAP_W + x];
      const X = x * TILE - cx;
      const Y = y * TILE - cy;
      if (t === T.WATER) {
        const h = hash(x, y, 21);
        const s = Math.sin(time * 1.6 + h * 40);
        if (s > 0.55) {
          ctx.globalAlpha = Math.min(1, (s - 0.55) * 1.8);
          rect(ctx, X + 2 + Math.floor(h * 9), Y + 2 + Math.floor(hash(x, y, 22) * 11), s > 0.85 ? 4 : 3, 1, '#ffffff');
          ctx.globalAlpha = 1;
        }
        if (tileAt(x, y - 1) === T.FALL) {
          for (let k = 0; k < 4; k++) {
            const ph = (time * 1.5 + k * 0.25 + hash(x, k, 3)) % 1;
            ctx.globalAlpha = 0.9 * (1 - ph);
            ellipse(ctx, X + 3 + k * 3.5, Y + 2 + ph * 3, 1 + ph * 3, 1 + ph * 1.5, '#ffffff');
          }
          ctx.globalAlpha = 1;
        }
      } else if (t === T.FALL) {
        rect(ctx, X, Y, TILE, TILE, '#5aa6ec');
        const wy0 = y * TILE;
        for (let i = 0; i < TILE; i += 2) {
          const h = hash(x * 16 + i, 5, 23);
          const period = 10 + Math.floor(h * 6);
          const off = (time * (45 + h * 30) + h * 100) % period;
          const base = wy0 - (wy0 % period) + off;
          for (let k = -1; k <= Math.ceil(TILE / period) + 1; k++) {
            clippedStreak(X, Y, i, wy0, base + k * period, period * 0.6, h < 0.5 ? '#a8d6fa' : '#e6f6ff');
          }
        }
      }
    }
  }
}

function drawShadow(x, y, rx, ry, alpha = 0.22) {
  ellipse(ctx, x, y - 1, rx, ry, `rgba(0,0,0,${alpha})`);
}

function drawObject(o, cx, cy) {
  const s = SPR[o.key];
  const view = s.dirs ? s.dirs[o.dir] : s;
  let img = view.img;
  if (s.pick) img = s.pick(time, o);
  else if (s.frames) img = s.frames[Math.floor(time * s.fps + o.phase) % s.frames.length];
  const dy = s.bob ? Math.round(Math.sin(time * 1.4 + o.phase) * s.bob) : 0;
  const sx = Math.round(o.x - view.ox - cx);
  const sy = Math.round(o.y - view.oy - cy + dy);
  ctx.drawImage(img, sx, sy);
  if (o.rider) {
    const carry = o === shipObj && eggStage === 'carried';
    if (carry) drawHeldEgg(sx + view.seat[0], sy + view.seat[1] - 15);
    const rider = charSprite(o.rider, o.dir, 0, carry);
    ctx.drawImage(rider, 0, 0, 16, 15, sx + view.seat[0] - 8, sy + view.seat[1] - 15, 16, 15);
  }
  if (s.after) s.after(ctx, o.x - cx, o.y - cy + dy, time, o);
}

function drawSwimmer(e, cx, cy) {
  const x = Math.round(e.x) - cx;
  const y = Math.round(e.y + Math.sin(time * 3) * 0.8) - cy - 3;
  ctx.globalAlpha = 0.45;
  ellipse(ctx, x, y, 7 + Math.sin(time * 4), 2.5, PAL.foam);
  ctx.globalAlpha = 1;
  const carry = e === player && eggStage === 'carried';
  // The far arm in side views passes behind the head.
  const arms = e.sprinting ? [[-1, e.stroke % 1], [1, (e.stroke + 0.5) % 1]].filter(([, p]) => p < 0.5) : [];
  const behind = (side) => side > 0 && (e.dir === 'left' || e.dir === 'right');
  for (const [side, p] of arms) if (behind(side)) drawStrokeArm(e, x, y, side, p * 2);
  if (carry) drawHeldEgg(x, y - 14);
  ctx.drawImage(charSprite(e.look, e.dir, e.frame % 2, carry), 0, 0, 16, 14, x - 8, y - 14, 16, 14);
  ctx.globalAlpha = 0.8;
  rect(ctx, x - 5, y - 1, 10, 1, PAL.foam);
  ctx.globalAlpha = 1;
  for (const [side, p] of arms) if (!behind(side)) drawStrokeArm(e, x, y, side, p * 2);
}

function drawStrokeArm(e, x, y, side, u) {
  const [sx, sy, hx, hy] = strokeArm(e.dir, side, u).map((v) => Math.round(v));
  line(ctx, x + sx, y + sy, x + hx, y + hy, '#22160f', 3);
  line(ctx, x + sx, y + sy, x + hx, y + hy, shade(e.look.tunic, -0.25));
  rect(ctx, x + hx - 2, y + hy - 2, 4, 4, '#22160f');
  rect(ctx, x + hx - 1, y + hy - 1, 2, 2, e.look.skin || PAL.skin);
}

function drawEntity(e, cx, cy, lift = 0) {
  if (e.swimming && inWater(e.x, e.y)) return drawSwimmer(e, cx, cy);
  const x = Math.round(e.x) - cx;
  const top = Math.round(e.y - lift) - 20 - cy;
  const carry = e === player && eggStage === 'carried';
  const run = e.running && !hop;
  if (carry) drawHeldEgg(x, top);
  ctx.drawImage(charSprite(e.look, e.dir, e.jumpT >= 0 ? 1 : e.frame, carry, run), x - 8, top);
}

function drawFlight(cx, cy) {
  const f = flight;
  const fr = SPR.flyDragon[f.dir][Math.floor(f.flap) % 4];
  const [ox, oy, rot] = loopPose(f);
  ctx.save();
  ctx.translate(Math.round(f.x + ox) - cx, Math.round(f.y - f.alt - flightBob(f) + oy) - 11 - cy);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(fr.under, -36, -29);
  const carry = eggStage === 'carried';
  if (carry) ctx.drawImage(SPR.heldEgg, fr.seat[0] - 42, fr.seat[1] - 52);
  const rider = charSprite(player.look, f.dir, 0, carry);
  ctx.drawImage(rider, 0, 0, 16, 15, fr.seat[0] - 44, fr.seat[1] - 41, 16, 15);
  if (fr.over) ctx.drawImage(fr.over, -36, -29);
  ctx.restore();
}

function drawSky(cx, cy) {
  const a = flight ? Math.min(1, flight.alt / FLY_ALT) : 0;
  if (!a) return;
  const P = 1.35;
  const spanX = viewW + 200;
  const spanY = viewH + 120;
  ctx.globalAlpha = 0.5 * a;
  for (const c of clouds) {
    const sx = ((((c.x - cx * P) % spanX) + spanX) % spanX) - 100;
    const sy = ((((c.y - cy * P) % spanY) + spanY) % spanY) - 60;
    ctx.drawImage(c.img, Math.round(sx), Math.round(sy));
  }
  ctx.globalAlpha = 1;
}

function drawTalkHint(n, cx, cy) {
  const x = Math.round(n.x) - cx;
  const y = Math.round(n.y) - cy - 28 + Math.round(Math.sin(time * 4));
  rect(ctx, x - 6, y, 13, 7, '#3a2414');
  rect(ctx, x - 5, y + 1, 11, 5, '#fff8e7');
  px(ctx, x, y + 7, '#3a2414');
  for (let i = 0; i < 3; i++) px(ctx, x - 3 + i * 3, y + 3, '#3a2414');
}

const EMOTE_ICONS = {
  exclaim: ['..#..', '..#..', '..#..', '.....', '..#..'],
  question: ['.###.', '...#.', '..#..', '.....', '..#..'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  angry: ['.#.#.', '##.##', '.....', '##.##', '.#.#.'],
  note: ['..##.', '..#.#', '..#..', '###..', '##...'],
  smile: ['.#.#.', '.#.#.', '.....', '#...#', '.###.'],
  dots: ['.....', '.....', '#.#.#', '.....', '.....'],
};

function drawEmote(n, cx, cy, above = 30) {
  const icon = EMOTE_ICONS[n.emote];
  const pop = Math.min(1, (1.8 - n.emoteT) * 8);
  const x = Math.round(n.x) - cx - 4;
  const y = Math.round(n.y - above - pop * 2 + Math.sin(time * 5)) - cy;
  const color = n.emote === 'heart' || n.emote === 'angry' ? '#d83a3a' : '#3a2414';
  ctx.globalAlpha = Math.min(1, n.emoteT * 3);
  rect(ctx, x, y, 9, 9, '#3a2414');
  rect(ctx, x + 1, y + 1, 7, 7, '#fff8e7');
  px(ctx, x + 4, y + 9, '#3a2414');
  icon.forEach((row, j) => {
    for (let i = 0; i < 5; i++) if (row[i] === '#') px(ctx, x + 2 + i, y + 2 + j, color);
  });
  ctx.globalAlpha = 1;
}

function drawParticles(cx, cy, layer) {
  for (const p of particles) {
    if ((p.layer || 'world') !== layer) continue;
    const t = p.life / p.max;
    if (p.type === 'smoke') {
      const r = 1 + t * 3;
      ctx.globalAlpha = 0.5 * (1 - t);
      ellipse(ctx, p.x - cx, p.y - cy, r, r, t < 0.3 ? '#dcd8d2' : '#b8b4b0');
    } else if (p.type === 'ember') {
      ctx.globalAlpha = 1 - t;
      px(ctx, p.x - cx, p.y - cy, t < 0.5 ? '#ffe27a' : '#ff8a2a');
    } else if (p.type === 'dust') {
      const r = 1 + t * 3;
      ctx.globalAlpha = 0.6 * (1 - t);
      ellipse(ctx, p.x - cx, p.y - cy, r, r * 0.7, '#efe6cf');
    } else if (p.type === 'wake') {
      const r = 1 + t * 4;
      ctx.globalAlpha = 0.7 * (1 - t);
      ellipse(ctx, p.x - cx, p.y - cy, r, r * 0.5, PAL.foam);
    } else if (p.type === 'spark') {
      ctx.globalAlpha = 1 - t * t;
      const s = t < 0.3 ? 2 : 1;
      rect(ctx, Math.round(p.x - cx), Math.round(p.y - cy), s, s, t < 0.5 ? p.c : p.c2);
    } else if (p.type === 'plasma') {
      ctx.globalAlpha = 1 - t;
      const s = t < 0.4 ? 2 : 1;
      rect(ctx, Math.round(p.x - cx), Math.round(p.y - cy), s, s, t < 0.4 ? PLASMA[1] : PLASMA[0]);
    } else if (p.type === 'shock') {
      const r = 4 + t * 24;
      ctx.globalAlpha = 0.35 * (1 - t);
      ellipse(ctx, p.x - cx, p.y - cy, r, r * 0.45, PLASMA[0]);
    } else if (p.type === 'sparkle') {
      ctx.globalAlpha = 1 - t;
      const x = Math.round(p.x - cx);
      const y = Math.round(p.y - cy);
      px(ctx, x, y, '#ffffff');
      if (t < 0.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(ctx, x + dx, y + dy, '#fff27a');
    } else if (p.type === 'flash') {
      ctx.globalAlpha = 1 - t;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(glowSprite(26, p.c), Math.round(p.x - 26 - cx), Math.round(p.y - 26 - cy));
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.type === 'drop') {
      ctx.globalAlpha = 1 - t * 0.6;
      const s = p.big && t < 0.7 ? 2 : 1;
      rect(ctx, Math.round(p.x - cx), Math.round(p.y - cy), s, s, t < 0.4 ? '#ffffff' : PAL.foam);
    } else if (p.type === 'wind') {
      ctx.globalAlpha = 0.55 * Math.sin(t * Math.PI);
      line(ctx, p.x - cx, p.y - cy, p.x - cx - p.dx * 12, p.y - cy - p.dy * 12, '#ffffff');
    } else {
      ctx.globalAlpha = 0.6 * (1 - t);
      rect(ctx, p.x - cx, p.y - cy, 2, 2, '#ffffff');
    }
  }
  ctx.globalAlpha = 1;
}

let promptText = null;
let hintsOn = false;

function setPrompt(text) {
  if (text === promptText) return;
  promptText = text;
  promptEl.textContent = text;
  promptEl.classList.toggle('show', !!text && hintsOn);
}

function render() {
  const cx = Math.round(cam.x);
  const cy = Math.round(cam.y);
  ctx.fillStyle = PAL.ocean;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.drawImage(ground, -cx, -cy);
  drawAnimatedTiles(cx, cy);
  drawParticles(cx, cy, 'water');
  drawSeaUnder(cx, cy);

  const visible = objects.filter((o) => !o.hidden && o.x > cx - 90 && o.x < cx + viewW + 90 && o.y > cy - 10 && o.y < cy + viewH + 120);
  const walkers = entities.filter((e) => !e.flying);
  for (const o of visible) {
    const sh = SPR[o.key].shadow;
    if (sh) drawShadow(o.x - cx, o.y - cy, sh.rx, sh.ry);
  }
  for (const e of walkers) {
    if (e.swimming) continue;
    const k = jumpLift(e) / JUMP_HEIGHT;
    drawShadow(Math.round(e.x) - cx, Math.round(e.y) - cy, 5 - k * 2, 2 - k * 0.5);
  }
  if (hop) drawShadow(Math.round(player.x) - cx, Math.round(player.y) - cy, 5, 2);
  if (flight) {
    const k = flight.alt / FLY_ALT;
    drawShadow(Math.round(flight.x) - cx, Math.round(flight.y) - cy, 18 - k * 6, 5 - k * 1.5, 0.28 - k * 0.08);
  }
  const babyHigh = baby && babyLift(baby) > 20;
  if (baby) {
    const k = Math.min(1, babyLift(baby) / 50);
    drawShadow(Math.round(baby.x) - cx, Math.round(baby.y) - cy, 6 - k * 2, 2 - k * 0.5, 0.22 - k * 0.06);
  }

  const flock = sheep.filter((s) => s.x > cx - 20 && s.x < cx + viewW + 20 && s.y > cy - 10 && s.y < cy + viewH + 30);
  for (const s of flock) drawShadow(Math.round(s.x) - cx, Math.round(s.y) - cy, 8, 2);

  const babyItem = baby && !babyHigh ? [{ y: baby.y, draw: () => drawBaby(cx, cy) }] : [];
  const sheepItems = flock.map((s) => ({ y: s.y, draw: () => drawSheep(s, cx, cy) }));
  const list = visible.concat(walkers, seaSprites(cx, cy), babyItem, sheepItems).sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.draw) it.draw();
    else if (it.isEntity) drawEntity(it, cx, cy, it.jumpT >= 0 ? Math.round(jumpLift(it)) : it.danceT > 0 ? Math.round(Math.abs(Math.sin(time * 10)) * 4) : 0);
    else drawObject(it, cx, cy);
  }

  drawParticles(cx, cy, 'world');

  ctx.globalCompositeOperation = 'lighter';
  for (const o of visible) {
    const l = SPR[o.key].light;
    if (!l) continue;
    ctx.globalAlpha = 0.8 + 0.2 * Math.sin(time * 9 + o.phase) * Math.sin(time * 5.7 + o.phase);
    ctx.drawImage(glowSprite(l.r, l.color), Math.round(o.x + l.dx - l.r - cx), Math.round(o.y + l.dy - l.r - cy));
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  if (hop) {
    const lift = hop.lift0 + (hop.lift1 - hop.lift0) * hop.t + Math.sin(hop.t * Math.PI) * 16;
    player.frame = 1;
    drawEntity(player, cx, cy, lift);
  }
  if (babyHigh) drawBaby(cx, cy);
  if (flight) drawFlight(cx, cy);
  drawFireballs(cx, cy);
  drawSky(cx, cy);
  drawParticles(cx, cy, 'sky');

  for (const n of npcs) {
    if (n.talkT > 0) {
      n.bubble.style.left = `${(Math.round(n.x) - cx) * zoom}px`;
      n.bubble.style.top = `${(Math.round(n.y) - cy - 24) * zoom}px`;
    } else if (n.emoteT > 0) {
      drawEmote(n, cx, cy);
    } else if (!player.flying && Math.hypot(player.x - n.x, player.y - n.y) < 36) {
      drawTalkHint(n, cx, cy);
    }
  }
  if (baby && baby.emoteT > 0) drawEmote(baby, cx, cy, 26 + babyLift(baby));
  for (const s of flock) if (s.emoteT > 0) drawEmote(s, cx, cy, 24);
  if (playerSayT > 0) {
    const [hx, hy] = playerHead();
    playerBubble.style.left = `${(Math.round(hx) - cx) * zoom}px`;
    playerBubble.style.top = `${(Math.round(hy) - cy) * zoom}px`;
  }

  if (flight && flight.mode === 'fly') {
    const space = landingSpot() ? 'SPACE  Land' : overWater(flight) ? 'SPACE  Splash dive' : 'Find open ground to land';
    setPrompt(`${space}  ·  F  Fireball  ·  R  Loop  ·  SHIFT  Boost`);
  } else if (sail) {
    setPrompt(sail.shore ? 'SPACE  Go ashore   ·   SHIFT  Full sail' : 'Sail close to land to go ashore   ·   SHIFT  Full sail');
  } else if (nearShip()) {
    setPrompt('SPACE  Board the ship');
  } else if (nearDragon()) {
    setPrompt('SPACE  Ride the dragon');
  } else if (nearEgg()) {
    setPrompt('SPACE  Pick up the dragon egg');
  } else if (nearFire() && fireSpot()) {
    setPrompt('SPACE  Set the egg by the fire');
  } else if (!nearNpc() && nearSheep()) {
    setPrompt('SPACE  Pet the sheep');
  } else if (player.swimming) {
    setPrompt('Swim to a beach or low shore to climb out');
  } else if (eggStage === 'carried') {
    setPrompt('Carry the egg to the fire in the village to hatch it');
  } else if (eggStage === 'warming' && Math.hypot(player.x - eggObj.x, player.y - eggObj.y) < 70) {
    setPrompt('The egg is warming up...');
  } else {
    setPrompt('');
  }

  const s = zoom * dpr;
  screenCtx.drawImage(buffer, 0, 0, viewW, viewH, 0, 0, viewW * s, viewH * s);
}

// ---------- setup ----------

function resize() {
  dpr = window.devicePixelRatio || 1;
  baseZoom = Math.max(2, Math.round(window.innerHeight / 300));
  flyZoom = Math.max(1.5, baseZoom - 1);
  screenCanvas.width = Math.round(window.innerWidth * dpr);
  screenCanvas.height = Math.round(window.innerHeight * dpr);
  screenCanvas.style.width = `${window.innerWidth}px`;
  screenCanvas.style.height = `${window.innerHeight}px`;
  buffer.width = Math.ceil(window.innerWidth / flyZoom) + 1;
  buffer.height = Math.ceil(window.innerHeight / flyZoom) + 1;
  ctx.imageSmoothingEnabled = false;
  screenCtx.imageSmoothingEnabled = false;
  zoom = flight ? flyZoom : baseZoom;
  applyView();
  updateCamera(0, true);
}

const BLOCKED_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

const soundBtn = document.getElementById('sound');

function toggleSound() {
  Sfx.init();
  const muted = Sfx.toggleMute();
  soundBtn.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  soundBtn.setAttribute('aria-pressed', String(!muted));
}

soundBtn.addEventListener('click', () => {
  toggleSound();
  soundBtn.blur();
});

const hintsBtn = document.getElementById('hints');

function toggleHints() {
  hintsOn = !hintsOn;
  hintsBtn.textContent = hintsOn ? 'HINTS ON' : 'HINTS OFF';
  hintsBtn.setAttribute('aria-pressed', String(hintsOn));
  promptEl.classList.toggle('show', !!promptText && hintsOn);
}

hintsBtn.addEventListener('click', () => {
  toggleHints();
  hintsBtn.blur();
});
window.addEventListener('pointerdown', () => Sfx.init());

window.addEventListener('keydown', (e) => {
  Sfx.init();
  if (!started || document.activeElement === chatInput) return;
  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    chatInput.focus();
    return;
  }
  if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
  if (!e.repeat) {
    if (e.code === 'Space' || e.code === 'KeyE') action();
    if (e.code === 'KeyF') breatheFire();
    if (e.code === 'KeyR') loopTrick();
    if (e.code === 'KeyM') toggleSound();
    if (e.code === 'KeyH') toggleHints();
  }
  keys.add(e.code);
});

chatInput.addEventListener('focus', () => keys.clear());
chatInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  chatInput.value = '';
  chatInput.blur();
});
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (text) say(text);
  chatInput.value = '';
  chatInput.blur();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', resize);

const pointerPos = (e) => {
  const r = screenCanvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
screenCanvas.addEventListener('pointerdown', (e) => {
  pointer = pointerPos(e);
  pointerDownAt = time;
  screenCanvas.setPointerCapture(e.pointerId);
});
screenCanvas.addEventListener('pointermove', (e) => { if (pointer) pointer = pointerPos(e); });
const endPointer = () => {
  if (pointer && time - pointerDownAt < 0.2) action();
  pointer = null;
};
screenCanvas.addEventListener('pointerup', endPointer);
screenCanvas.addEventListener('pointercancel', endPointer);

// ---------- start screen ----------

const startEl = document.getElementById('start');
const startForm = document.getElementById('start-form');
const nameInput = document.getElementById('hero-name');
const heroInputs = [...startForm.elements.hero];
const DEFAULT_NAMES = { male: 'Eli', female: 'Astrid' };
let started = false;

const chosenLook = () => heroInputs.find((r) => r.checked).value;

function drawHeroPreviews() {
  for (const r of heroInputs) {
    const c = r.nextElementSibling;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(charSprite(PLAYER_LOOKS[r.value], 'down', r.checked ? Math.floor(time * 6) % 4 : 0), 0, 0);
  }
}

try {
  const saved = JSON.parse(localStorage.getItem('hw-hero'));
  if (saved && PLAYER_LOOKS[saved.look]) {
    heroInputs.find((r) => r.value === saved.look).checked = true;
    nameInput.value = saved.name || '';
  }
} catch (e) { /* storage unavailable */ }
function pickHero() {
  const look = chosenLook();
  player.look = PLAYER_LOOKS[look];
  nameInput.placeholder = DEFAULT_NAMES[look];
}
pickHero();
for (const r of heroInputs) r.addEventListener('change', pickHero);
nameInput.focus();

startForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const look = chosenLook();
  player.name = nameInput.value.trim() || DEFAULT_NAMES[look];
  try {
    localStorage.setItem('hw-hero', JSON.stringify({ look, name: player.name }));
  } catch (err) { /* storage unavailable */ }
  started = true;
  keys.clear();
  startEl.remove();
  document.body.classList.remove('title');
  setTimeout(() => hint.classList.add('hide'), 8000);
});

resize();
let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  update(dt);
  render();
  if (!started) drawHeroPreviews();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
