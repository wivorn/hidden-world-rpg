// The fire mountain: a cave at the foot of the volcano's west face climbs inside it to a chamber at the top, where a
// pool of lava glows. A dragon egg thrown into the pool hatches in its heat. From dragonback the egg can instead be
// dropped straight into the crater, where it sits in the lava cracking until it hatches.

const EGG_THROW = 0.5;
const POOL_REACH = 26;
let lavaPool = null;
// The egg in the air between the player's hands and the lava.
let eggThrow = null;
const EGG_DROP = 0.7;
let volcanoObj = null;
// The egg falling from dragonback into the crater.
let eggDrop = null;

function initPeak() {
  lavaPool = objects.find((o) => o.key === 'lavaPool');
  volcanoObj = objects.find((o) => o.key === 'volcano');
}

const craterSpot = () => ({ x: volcanoObj.x, y: volcanoObj.y + SPR.volcano.light.dy });

// Riding with the egg, with the dragon right over the crater or a little above it.
function overCrater() {
  if (!flight || flight.mode !== 'fly' || !carried || eggDrop) return false;
  const [x, y] = dragonBody(flight);
  const c = craterSpot();
  return Math.hypot((x - c.x) / 40, (y - c.y + 20) / 50) < 1;
}

function dropInCrater() {
  const [x, y] = dragonBody(flight);
  eggDrop = { e: carried, t: 0, x, y };
  carried = null;
  Sfx.swish();
}

function craterLand(e) {
  eggDrop = null;
  const c = craterSpot();
  Object.assign(e, { x: c.x, y: c.y, hidden: true, crater: true, crack: 0, hatchT: 0, state: 'warming' });
  e.col.off = true;
  burst(c.x, c.y - 2, [PAL.lava, PAL.lavaLight, '#ffe9a8'], 18, 50);
  for (let i = 0; i < 16; i++) particles.push({ type: 'ember', x: c.x + (Math.random() - 0.5) * 20, y: c.y - 2, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, life: 0, max: 0.6 + Math.random() * 0.6 });
  Sfx.splash(0.5);
  Sfx.stoke(1);
  setStage('warming');
  muse('Straight into the fire! Look, it\'s cracking already...');
}

// Falling from the dragon, faster and faster; then sitting in the crater's lava, rocking harder with every crack.
function drawCraterEgg(g, x, y) {
  const e = eggDrop ? eggDrop.e : eggs.find((n) => n.crater && n.state === 'warming');
  if (!e) return;
  const s = SPR[`egg_${e.species}`];
  const img = s.pick(time, e);
  const c = craterSpot();
  if (eggDrop) {
    const u = (eggDrop.t / EGG_DROP) ** 2;
    const ex = x + (eggDrop.x - volcanoObj.x) + (c.x - eggDrop.x) * u;
    const ey = y + (eggDrop.y - volcanoObj.y) + (c.y - eggDrop.y) * u;
    g.drawImage(img, Math.round(ex - s.ox), Math.round(ey - img.height / 2));
    return;
  }
  const cx = x + c.x - volcanoObj.x;
  const cy = y + c.y - volcanoObj.y;
  const rock = e.crack ? Math.round(Math.sin(time * (16 + e.crack * 6)) * Math.min(2, e.crack * 0.7)) : 0;
  g.globalAlpha = Math.min(1, 0.45 + 0.25 * Math.sin(time * 5) + e.crack * 0.12);
  ellipse(g, cx, cy, 10, 3, PAL.lavaLight);
  g.globalAlpha = 1;
  g.drawImage(img, cx - s.ox + rock, cy + 2 - img.height);
}

const poolDist = (x, y) => Math.hypot((x - lavaPool.x) / (FIRE_POOL.rx * TILE + POOL_REACH), (y - lavaPool.y) / (FIRE_POOL.ry * TILE + POOL_REACH));

function nearPool() {
  return indoors === ROOMS.fireCave && !hop && !eggThrow && grounded() && poolDist(player.x, player.y) < 1;
}

function throwEgg() {
  const e = carried;
  carried = null;
  faceToward(player, lavaPool.x - player.x, lavaPool.y - player.y);
  eggThrow = { e, t: 0, x: player.x, y: player.y - 14 };
  Sfx.swish();
}

function sinkEgg(e) {
  eggThrow = null;
  Object.assign(e, { x: lavaPool.x, y: lavaPool.y, hidden: true, pool: true, crack: 0, hatchT: 0, state: 'warming' });
  e.col.off = true;
  burst(e.x, e.y - 2, [PAL.lava, PAL.lavaLight, '#ffe9a8'], 18, 50);
  for (let i = 0; i < 16; i++) particles.push({ type: 'ember', x: e.x + (Math.random() - 0.5) * 20, y: e.y - 2, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, life: 0, max: 0.6 + Math.random() * 0.6 });
  Sfx.splash(0.5);
  Sfx.stoke(1);
  setStage('warming');
  muse('In it goes! The lava hugs it like a blanket...');
}

// First sight of the pool, the first time the player climbs up to it.
function updatePeak(dt) {
  if (indoors === ROOMS.fireCave && !stats.summits && !fade && poolDist(player.x, player.y) < 2.2) {
    stats.summits++;
    muse(carried ? 'The heart of the mountain! That lava will warm the egg, if anything can.' : 'A pool of lava, right at the top. The heat in here!');
  }
  if (eggThrow && (eggThrow.t += dt) >= EGG_THROW) sinkEgg(eggThrow.e);
  if (eggDrop && (eggDrop.t += dt) >= EGG_DROP) craterLand(eggDrop.e);
}

// Up out of the player's hands in an arc; then, in the pool, only its top shows, glowing brighter as it cracks.
function drawPoolEgg(g, x, y) {
  const e = eggThrow ? eggThrow.e : eggs.find((n) => n.pool && n.state === 'warming');
  if (!e) return;
  const s = SPR[`egg_${e.species}`];
  const img = s.pick(time, e);
  if (eggThrow) {
    const u = eggThrow.t / EGG_THROW;
    const ex = x + (eggThrow.x - lavaPool.x) * (1 - u);
    const ey = y + (eggThrow.y - lavaPool.y) * (1 - u) - Math.sin(u * Math.PI) * 26;
    g.drawImage(img, Math.round(ex - s.ox), Math.round(ey - img.height));
    return;
  }
  const top = Math.round(img.height * 0.6);
  g.drawImage(img, 0, 0, img.width, top, x - s.ox, y + 1 - top + Math.round(Math.sin(time * 2) * 0.6), img.width, top);
  g.globalAlpha = 0.35 + 0.25 * Math.sin(time * 5) + e.crack * 0.1;
  ellipse(g, x, y, 9, 2.5, PAL.lavaLight);
  g.globalAlpha = 1;
}

// A hatchling climbs out onto the rim beside the player, or if the player has gone, waits outside the cave's mouth.
function poolHatchSpot(d) {
  if (indoors !== ROOMS.fireCave) return outsideDoor(ROOMS.fireCave);
  const a = Math.atan2(player.y - lavaPool.y, player.x - lavaPool.x);
  return standSpotNear(d, lavaPool.x + Math.cos(a) * (FIRE_POOL.rx * TILE + 8), lavaPool.y + Math.sin(a) * (FIRE_POOL.ry * TILE + 8));
}
