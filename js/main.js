const screenCanvas = document.getElementById('game');
const screenCtx = screenCanvas.getContext('2d');
const buffer = makeCanvas(1, 1);
const ctx = buffer.getContext('2d');
const bubbleLayer = document.getElementById('bubbles');
const hint = document.getElementById('hint');
const promptEl = document.getElementById('prompt');

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
const dragonObj = objects.find((o) => o.key === 'dragon');
const shipObj = objects.find((o) => o.key === 'ship');
const seaRocks = objects.filter((o) => o.key === 'rock');

const FLY_ALT = 46;
let flight = null;
let sail = null;
let hop = null;
const JUMP_TIME = 0.42;
const JUMP_HEIGHT = 12;
let jumpT = -1;

function makeEntity(look, x, y) {
  return { isEntity: true, look, x, y, dir: 'down', frame: 0, anim: 0, flying: false };
}

const player = makeEntity(LOOKS.eli, PLAYER_START.x * TILE, PLAYER_START.y * TILE);
player.dir = 'up';

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

const cloudRng = mulberry32(42);
const clouds = Array.from({ length: 9 }, (_, i) => ({
  x: cloudRng() * 1600,
  y: cloudRng() * 900,
  v: 5 + cloudRng() * 6,
  img: SPR.clouds[i % SPR.clouds.length],
}));

// ---------- collision ----------

function blocked(x0, y0, x1, y1, self) {
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y1 - 0.001) / TILE); ty++) {
    for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x1 - 0.001) / TILE); tx++) {
      if (!inBounds(tx, ty) || isSolidTile(tileAt(tx, ty))) return true;
    }
  }
  for (const c of colliders) if (!c.off && x1 > c.x0 && x0 < c.x1 && y1 > c.y0 && y0 < c.y1) return true;
  for (const e of entities) {
    if (e !== self && !e.flying && x1 > e.x - 5 && x0 < e.x + 5 && y1 > e.y - 4 && y0 < e.y) return true;
  }
  return false;
}

const canStand = (e, x, y) => !blocked(x - 5, y - 4, x + 5, y, e);

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
  if (jumpT < 0) jumpT = 0;
}

function jumpLift() {
  return jumpT < 0 ? 0 : Math.sin((jumpT / JUMP_TIME) * Math.PI) * JUMP_HEIGHT;
}

function updateJump(dt) {
  if (jumpT < 0) return;
  jumpT += dt;
  if (jumpT < JUMP_TIME) return;
  jumpT = -1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    particles.push({ type: 'dust', x: player.x, y: player.y - 1, vx: Math.cos(a) * 18, vy: Math.sin(a) * 6, life: 0, max: 0.35 });
  }
}

function updatePlayer(dt) {
  updateJump(dt);
  const [ix, iy] = readInput();
  if (!ix && !iy) {
    player.anim = 0;
    player.frame = jumpT < 0 ? 0 : 1;
    return;
  }
  const running = boosting();
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
  player.anim += dt * (running ? 11 : 7);
  player.frame = jumpT < 0 ? Math.floor(player.anim) % 4 : 1;
}

function updateNpc(n, dt) {
  if (n.talkT > 0) {
    n.talkT -= dt;
    if (n.talkT <= 0) n.bubble.classList.remove('show');
  }
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

function talk() {
  let best = null;
  let bestD = 36;
  for (const n of npcs) {
    const d = Math.hypot(n.x - player.x, n.y - player.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  if (!best) return false;
  if (!best.bubble) {
    best.bubble = document.createElement('div');
    best.bubble.className = 'bubble';
    bubbleLayer.appendChild(best.bubble);
  }
  best.bubble.textContent = best.line;
  best.bubble.classList.add('show');
  best.talkT = 3.5;
  faceToward(player, best.x - player.x, best.y - player.y);
  return true;
}

// ---------- dragon riding ----------

function nearDragon() {
  if (flight || sail || hop || dragonObj.hidden) return false;
  const c = dragonObj.col;
  const dx = Math.max(c.x0 - player.x, 0, player.x - c.x1);
  const dy = Math.max(c.y0 - player.y, 0, player.y - c.y1);
  return Math.hypot(dx, dy) < 34;
}

// A short jump between the ground and the dragon's back; `lift` is visual height.
function startHop(tx, ty, lift0, lift1, done) {
  hop = { fx: player.x, fy: player.y, tx, ty, lift0, lift1, t: 0, done };
  jumpT = -1;
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
    flight = { x: d.x, y: d.y, alt: 0, vx: 0, vy: 0, dir: 'down', flap: 0, mode: 'takeoff', land: null };
    player.flying = true;
    dust(d.x, d.y);
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
    const steer = f.mode === 'fly' || f.alt > 16;
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
  f.flap += dt * (f.mode === 'takeoff' ? 13 : boost ? 12 : speed > 20 ? 8 : 6);
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
  startHop(deck.x, shipObj.y, 0, deck.lift, () => {
    sail = { vx: 0, vy: 0, wakeT: 0, shoreT: 0, shore: null };
    shipObj.rider = player.look;
    player.flying = true;
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
  startHop(spot.x, spot.y, deck.lift, 0, () => { player.flying = false; });
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
    if (flight.mode === 'fly') land();
    return;
  }
  if (sail) disembark();
  else if (nearShip()) board();
  else if (nearDragon()) mount();
  else if (!talk()) jump();
}

// ---------- camera & zoom ----------

function applyView() {
  viewW = Math.min(buffer.width, Math.ceil(window.innerWidth / zoom));
  viewH = Math.min(buffer.height, Math.ceil(window.innerHeight / zoom));
}

function updateZoom(dt) {
  const target = sail || (flight && flight.mode !== 'landing' && flight.alt > 8) ? flyZoom : baseZoom;
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
  }
}

function update(dt) {
  time += dt;
  if (hop) updateHop(dt);
  else if (sail) updateSail(dt);
  else if (flight) updateFlight(dt);
  else updatePlayer(dt);
  for (const n of npcs) updateNpc(n, dt);
  for (const c of clouds) c.x += c.v * dt;
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
    const rider = charSprite(o.rider, o.dir, 0);
    ctx.drawImage(rider, 0, 0, 16, 15, sx + view.seat[0] - 8, sy + view.seat[1] - 15, 16, 15);
  }
  if (s.after) s.after(ctx, o.x - cx, o.y - cy + dy, time, o);
}

function drawEntity(e, cx, cy, lift = 0) {
  ctx.drawImage(charSprite(e.look, e.dir, e.frame), Math.round(e.x) - 8 - cx, Math.round(e.y - lift) - 20 - cy);
}

function drawFlight(cx, cy) {
  const f = flight;
  const fr = SPR.flyDragon[f.dir][Math.floor(f.flap) % 4];
  const bob = f.mode === 'fly' ? Math.sin(time * 3) * 2 : 0;
  const sx = Math.round(f.x) - 36 - cx;
  const sy = Math.round(f.y - f.alt - bob) - 40 - cy;
  ctx.drawImage(fr.under, sx, sy);
  const rider = charSprite(player.look, f.dir, 0);
  ctx.drawImage(rider, 0, 0, 16, 15, sx + fr.seat[0] - 8, sy + fr.seat[1] - 12, 16, 15);
  if (fr.over) ctx.drawImage(fr.over, sx, sy);
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

function setPrompt(text) {
  if (text === promptText) return;
  promptText = text;
  promptEl.textContent = text;
  promptEl.classList.toggle('show', !!text);
}

function render() {
  const cx = Math.round(cam.x);
  const cy = Math.round(cam.y);
  ctx.fillStyle = PAL.ocean;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.drawImage(ground, -cx, -cy);
  drawAnimatedTiles(cx, cy);
  drawParticles(cx, cy, 'water');

  const visible = objects.filter((o) => !o.hidden && o.x > cx - 90 && o.x < cx + viewW + 90 && o.y > cy - 10 && o.y < cy + viewH + 120);
  const walkers = entities.filter((e) => !e.flying);
  for (const o of visible) {
    const sh = SPR[o.key].shadow;
    if (sh) drawShadow(o.x - cx, o.y - cy, sh.rx, sh.ry);
  }
  for (const e of walkers) {
    const k = e === player ? jumpLift() / JUMP_HEIGHT : 0;
    drawShadow(Math.round(e.x) - cx, Math.round(e.y) - cy, 5 - k * 2, 2 - k * 0.5);
  }
  if (hop) drawShadow(Math.round(player.x) - cx, Math.round(player.y) - cy, 5, 2);
  if (flight) {
    const k = flight.alt / FLY_ALT;
    drawShadow(Math.round(flight.x) - cx, Math.round(flight.y) - cy, 18 - k * 6, 5 - k * 1.5, 0.28 - k * 0.08);
  }

  const list = visible.concat(walkers).sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.isEntity) drawEntity(it, cx, cy, it === player ? Math.round(jumpLift()) : 0);
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
  if (flight) drawFlight(cx, cy);
  drawSky(cx, cy);
  drawParticles(cx, cy, 'sky');

  for (const n of npcs) {
    if (n.talkT > 0) {
      n.bubble.style.left = `${(Math.round(n.x) - cx) * zoom}px`;
      n.bubble.style.top = `${(Math.round(n.y) - cy - 24) * zoom}px`;
    } else if (!player.flying && Math.hypot(player.x - n.x, player.y - n.y) < 36) {
      drawTalkHint(n, cx, cy);
    }
  }

  if (flight && flight.mode === 'fly') {
    setPrompt(landingSpot() ? 'SPACE  Land   ·   SHIFT  Boost' : 'Fly over open ground to land   ·   SHIFT  Boost');
  } else if (sail) {
    setPrompt(sail.shore ? 'SPACE  Go ashore   ·   SHIFT  Full sail' : 'Sail close to land to go ashore   ·   SHIFT  Full sail');
  } else if (nearShip()) {
    setPrompt('SPACE  Board the ship');
  } else if (nearDragon()) {
    setPrompt('SPACE  Ride the dragon');
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

window.addEventListener('keydown', (e) => {
  if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
  if (!e.repeat && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter')) action();
  keys.add(e.code);
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

setTimeout(() => hint.classList.add('hide'), 8000);

resize();
let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
