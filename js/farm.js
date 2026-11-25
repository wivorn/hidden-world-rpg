// ---------- farming ----------
// A hoe digs a plot of soil in a garden patch; a seed held out and dropped (X) by it is planted; each day's first
// watering (the can, or a water dragon's breath) grows it a stage, and rainbow breath ripens it outright.

const CROPS = {
  carrot: { shape: 'root', leaf: '#5aa83a', color: '#ee8a2a', yield: 2 },
  potato: { shape: 'bush', leaf: '#4e8a34', color: '#c8a060', yield: 3 },
  turnip: { shape: 'root', leaf: '#6aa84a', color: '#e8dcec', top: '#a04a9a', yield: 2 },
  cabbage: { shape: 'head', leaf: '#4e9a3a', color: '#9ad468', yield: 1 },
  ...Object.fromEntries([
    ['apple', '#3a2414'], ['pear', '#3a2414'], ['cherries', '#c8a878'], ['plum', '#c8a060'], ['peach', '#8a5a3a'],
    ['orange', '#f4e8c8'], ['lemon', '#f4ecc8'], ['berries', '#2a1a0e'],
  ].map(([id, pip]) => [id, { fruit: true, shape: 'fruit', leaf: '#3e7a2e', color: EDIBLE[id], pip, yield: 3 }])),
};
const VEGGIES = Object.keys(CROPS).filter((id) => !CROPS[id].fruit);
const seedOf = (id) => `${id}Seed`;
const SEED_CROP = Object.fromEntries(Object.keys(CROPS).map((id) => [seedOf(id), id]));
const SEED_NAMES = { cherries: 'Cherry', berries: 'Berry' };

Object.assign(ITEMS, {
  carrot: { name: 'Carrot', stack: true, plural: 'carrots' },
  potato: { name: 'Potato', stack: true, plural: 'potatoes' },
  turnip: { name: 'Turnip', stack: true, plural: 'turnips' },
  cabbage: { name: 'Cabbage', stack: true, plural: 'cabbages' },
  ...Object.fromEntries(Object.keys(CROPS).map((id) => {
    const name = `${SEED_NAMES[id] || ITEMS[id]?.name || id[0].toUpperCase() + id.slice(1)} seed`;
    return [seedOf(id), { name, stack: true, plural: `${name.toLowerCase()}s` }];
  })),
});
const cropName = (id) => itemName(seedOf(id)).replace(/ seed$/, '');

const RIPE = 3;
// Only the garden patches (by the scarecrows on the farm and on the hermit's isle) take the hoe.
const TILLABLE = new Set([T.FIELD]);
// { tx, ty, crop, stage, wet: the day it was last watered, grew: the day it last grew }
const plots = [];
const pourDrops = [];

const plotAt = (tx, ty) => plots.find((p) => p.tx === tx && p.ty === ty);
const plotX = (p) => p.tx * TILE + TILE / 2;
const plotY = (p) => p.ty * TILE + TILE / 2;
const nearPlot = (p, r) => Math.hypot(plotX(p) - player.x, plotY(p) - player.y) < r;
const openAir = () => !indoors && !aloft();

// The tile the player stands on, or the one just ahead of them.
function tileAhead() {
  const [vx, vy] = DIR_VEC[player.dir];
  return [Math.floor((player.x + vx * 12) / TILE), Math.floor((player.y - 2 + vy * 12) / TILE)];
}

function tillSpot() {
  if (!openAir()) return null;
  const [tx, ty] = tileAhead();
  if (!TILLABLE.has(tileAt(tx, ty)) || plotAt(tx, ty)) return null;
  const x = tx * TILE;
  const y = ty * TILE;
  if (solidAt(x + 3, y + 3, x + TILE - 3, y + TILE - 3)) return null;
  return { tx, ty };
}

// What the player thinks when the hoe finds nowhere to dig.
function tillMiss() {
  if (!openAir()) return 'Not in here. The hoe wants open ground.';
  const [tx, ty] = tileAhead();
  if (!TILLABLE.has(tileAt(tx, ty))) return 'I shouldn\'t dig up just anywhere. The garden patches are by the scarecrows, on the farm east of the village or out on the hermit\'s isle.';
  if (plotAt(tx, ty)) return 'That bit\'s dug already.';
  return 'Something\'s in the way there.';
}

function useHoe() {
  if (player.chop) return;
  const spot = tillSpot();
  swing('hoe', null);
  if (player.chop) player.chop.till = spot || { miss: true };
}

function tillSoil(spot) {
  if (spot.miss || plotAt(spot.tx, spot.ty) || !TILLABLE.has(tileAt(spot.tx, spot.ty))) {
    if (spot.miss) muse(tillMiss());
    return;
  }
  const p = { tx: spot.tx, ty: spot.ty, crop: null, stage: 0, wet: -1, grew: -1 };
  plots.push(p);
  stats.tilled++;
  Sfx.thunk(0.6);
  for (let i = 0; i < 8; i++) {
    particles.push({ type: 'chip', x: plotX(p) + (Math.random() - 0.5) * 10, y: plotY(p), vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, c: ['#7a5232', '#5a3a22', '#4a8a2a'][i % 3], life: 0, max: 0.45 });
  }
  if (stats.tilled === 1) muse('A patch of good soil! Hold a seed out of the backpack (B) and press X beside it to plant it.');
}

// An empty plot in reach: the one ahead first, then the nearest.
function plantSpot() {
  if (!openAir()) return null;
  const [tx, ty] = tileAhead();
  const ahead = plotAt(tx, ty);
  if (ahead && !ahead.crop) return ahead;
  let best = null;
  let bestD = 26;
  for (const p of plots) {
    if (p.crop) continue;
    const d = Math.hypot(plotX(p) - player.x, plotY(p) - player.y);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}

function plantSeed(id, p) {
  bag[id]--;
  renderInventory();
  p.crop = SEED_CROP[id];
  p.stage = 0;
  p.grew = -1;
  stats.planted++;
  Sfx.drop();
  faceToward(player, plotX(p) - player.x, plotY(p) - player.y);
  burst(plotX(p), plotY(p), ['#a8d86a', '#f0e0a8'], 6, 20);
  if (stats.planted === 1) {
    muse(`The ${cropName(p.crop)} seed is in! Water it once a day and it'll grow a little each time.${has('wateringCan') ? '' : ' The gardener at the seed shop, east of the square, sells watering cans.'}`);
  }
}

const plantHint = (id) => (SEED_CROP[id] && plantSpot() ? `X  Plant the ${cropName(SEED_CROP[id])} seed` : '');

// A planted plot in reach of the can's spout, not yet ripe; the one ahead first.
function canTarget() {
  if (!openAir()) return null;
  const [tx, ty] = tileAhead();
  const ahead = plotAt(tx, ty);
  if (ahead?.crop && ahead.stage < RIPE) return ahead;
  let best = null;
  let bestD = 30;
  for (const p of plots) {
    if (!p.crop || p.stage >= RIPE) continue;
    const d = Math.hypot(plotX(p) - player.x, plotY(p) - player.y);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}

function pourCan() {
  if (player.pour) return;
  const p = canTarget();
  if (!p) {
    const bare = plots.find((q) => nearPlot(q, 30));
    return muse(bare && !bare.crop ? 'Nothing planted there yet to water.' : bare ? 'That one\'s ripe! Press SPACE to pick it.' : 'The can is for seeded soil. Nothing here needs watering.');
  }
  faceToward(player, plotX(p) - player.x, plotY(p) - player.y);
  player.pour = { t: 0, plot: p, done: false };
  Sfx.swish(0.4);
}

const spoutAt = (e) => {
  const side = e.dir === 'left' ? -1 : 1;
  const front = e.dir === 'up' || e.dir === 'down';
  return [e.x + (front ? 15 : side * 15), e.y - 4];
};

// The first watering each day grows it a stage; later ones just keep the soil dark.
function waterPlot(p, quiet = false) {
  if (!p.crop) {
    p.wet = dayCount;
    return false;
  }
  if (p.stage >= RIPE) return false;
  const fresh = p.grew !== dayCount;
  p.wet = dayCount;
  if (!fresh) {
    if (!quiet && !stats.ripened) muse('It\'s had its water for today. It\'ll grow again tomorrow.');
    return false;
  }
  p.grew = dayCount;
  p.stage++;
  burst(plotX(p), plotY(p) - 4, [CROPS[p.crop].leaf, '#c8f08a'], 6, 18);
  if (p.stage >= RIPE) ripened(p);
  return true;
}

function ripenPlot(p) {
  if (!p.crop || p.stage >= RIPE) return false;
  p.stage = RIPE;
  p.grew = dayCount;
  burst(plotX(p), plotY(p) - 8, RAINBOW, 12, 40);
  for (let i = 0; i < 6; i++) particles.push({ type: 'sparkle', layer: 'sky', x: plotX(p) + (Math.random() - 0.5) * 14, y: plotY(p) - 4 - Math.random() * 14, vx: 0, vy: -12, life: -i * 0.06, max: 0.7 });
  ripened(p);
  return true;
}

function ripened(p) {
  stats.ripened++;
  Sfx.chirp?.(0.5);
  if (stats.ripened === 1 && nearPlot(p, 160) && !flight) muse(`The ${cropName(p.crop)} is ripe! Press SPACE beside it to pick it.`);
}

// Where breath lands: water soaks the soil (and grows today's stage); rainbow ripens what's planted.
function farmBreath(x, y, el, r) {
  for (const p of plots) {
    if (Math.hypot(plotX(p) - x, plotY(p) - y) > r) continue;
    if (el === 'rainbow') ripenPlot(p);
    else waterPlot(p, true);
  }
}

function ripePlot() {
  if (!openAir() || flight || sail || hop) return null;
  let best = null;
  let bestD = 26;
  for (const p of plots) {
    if (p.stage < RIPE) continue;
    const d = Math.hypot(plotX(p) - player.x, plotY(p) - (player.y - 4));
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}

// The fruit trees give pips back each time; the vegetables, now and then.
function harvest(p) {
  const id = p.crop;
  const c = CROPS[id];
  give(id, c.yield);
  const seed = c.fruit || Math.random() < 0.5;
  if (seed) give(seedOf(id));
  popIcon(id, plotX(p), plotY(p) - 12);
  if (seed) popIcon(seedOf(id), plotX(p), plotY(p) - 12, 0.3);
  stats.harvested++;
  Sfx.pickup();
  p.crop = null;
  p.stage = 0;
  p.grew = -1;
  faceToward(player, plotX(p) - player.x, plotY(p) - player.y);
  for (let i = 0; i < 6; i++) {
    particles.push({ type: 'chip', x: plotX(p), y: plotY(p), vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 30, c: ['#7a5232', c.leaf][i % 2], life: 0, max: 0.4 });
  }
  if (stats.harvested === 1) muse(`${c.yield} ${c.yield > 1 ? ITEMS[id].plural : itemName(id)}${seed ? ', and a seed to plant again' : ''}! The soil's ready for another.`);
}

const ripeHint = (p) => `SPACE  Pick the ${cropName(p.crop)}`;

let pipsTold = false;
function leaveSeeds(id) {
  if (!CROPS[id]?.fruit || flight || sail || hop || player.swimming) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  spawnDrop(seedOf(id), player.x + side * 7, player.y + 3, side * 14, 10, 50);
  drops[drops.length - 1].left = true;
  if (!pipsTold && !stats.planted) {
    pipsTold = true;
    muse('I spat the pips out. Those could grow, given a patch of soil.');
  }
}

function farmHint(id) {
  if (id === 'hoe') return tillSpot() ? 'F  Dig a patch of soil' : '';
  if (id !== 'wateringCan') return '';
  const p = canTarget();
  if (!p) return '';
  return p.grew === dayCount ? `F  Water the ${cropName(p.crop)} (it's grown today)` : `F  Water the ${cropName(p.crop)}`;
}

function updateFarm(dt) {
  const pour = player.pour;
  if (pour) {
    pour.t += dt;
    if (pour.t > 0.2 && Math.random() < dt * 40) {
      const [sx, sy] = spoutAt(player);
      const p = pour.plot;
      pourDrops.push({ x: sx, y: sy, vx: (plotX(p) - sx) * 1.6 + (Math.random() - 0.5) * 10, vy: 10, gy: plotY(p), life: 0 });
    }
    if (!pour.done && pour.t > 0.45) {
      pour.done = true;
      waterPlot(pour.plot);
      Sfx.splash(0.25);
    }
    if (pour.t > 0.9) player.pour = null;
  }
  for (let i = pourDrops.length - 1; i >= 0; i--) {
    const d = pourDrops[i];
    d.life += dt;
    d.vy += 300 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y >= d.gy || d.life > 1) {
      if (Math.random() < 0.4) particles.push({ type: 'ring', layer: 'water', x: d.x, y: d.y, vx: 0, vy: 0, r: 1, grow: 6, flat: 0.45, pal: ['#bfe4f4'], life: 0, max: 0.3 });
      pourDrops.splice(i, 1);
    }
  }
  if (!openAir()) return;
  for (const p of plots) {
    if (p.stage >= RIPE && Math.random() < dt * 0.8) {
      particles.push({ type: 'sparkle', x: plotX(p) + (Math.random() - 0.5) * 12, y: plotY(p) - 6 - Math.random() * 10, vx: 0, vy: -8, life: 0, max: 0.6 });
    }
  }
}

// ---------- drawing ----------

const SEED_PIPS = [[4, 4], [10, 4], [7, 8], [12, 8], [4, 12], [10, 12]];

function outlineTile(x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x + 1, y, TILE - 2, 1);
  ctx.fillRect(x + 1, y + TILE - 1, TILE - 2, 1);
  ctx.fillRect(x, y + 1, 1, TILE - 2);
  ctx.fillRect(x + TILE - 1, y + 1, 1, TILE - 2);
}

// The soil and seeds, flat on the ground under everything else.
function drawPlots(cx, cy) {
  if (!openAir()) return;
  const dug = new Set(plots.map((p) => p.ty * MAP_W + p.tx));
  for (const p of plots) {
    const x = p.tx * TILE - cx;
    const y = p.ty * TILE - cy;
    if (x < -TILE || y < -TILE || x > viewW || y > viewH) continue;
    const k = p.ty * MAP_W + p.tx;
    const open = (dug.has(k - MAP_W) ? 0 : 1) | (dug.has(k + 1) ? 0 : 2) | (dug.has(k + MAP_W) ? 0 : 4) | (dug.has(k - 1) ? 0 : 8);
    ctx.drawImage(SPR.soil[p.wet === dayCount ? 1 : 0][open], x, y);
    if (p.crop && p.stage === 0) {
      const c = CROPS[p.crop];
      for (const [sx, sy] of SEED_PIPS) {
        ctx.fillStyle = c.fruit ? c.pip : '#f0e0a8';
        ctx.fillRect(x + sx, y + sy, 1, 1);
      }
    }
  }
  const tool = canUseTool() && !player.chop && primary();
  const aim = tool === 'hoe' ? tillSpot() : tool === 'wateringCan' && !player.pour ? canTarget() : null;
  if (aim) {
    ctx.globalAlpha = 0.45 + Math.sin(performance.now() / 180) * 0.2;
    outlineTile(aim.tx * TILE - cx, aim.ty * TILE - cy, '#fff4c8');
    ctx.globalAlpha = 1;
  }
}

// What's growing, depth-sorted with the rest of the scene.
function cropItems(cx, cy) {
  if (!openAir()) return [];
  const out = [];
  for (const p of plots) {
    if (!p.crop || !p.stage) continue;
    const img = SPR.crop[p.crop][p.stage];
    const x = plotX(p) - cx;
    const by = p.ty * TILE + TILE - 3;
    if (x < -TILE || x > viewW + TILE || by - cy < -TILE || by - cy > viewH + TILE * 2) continue;
    const sway = p.stage >= RIPE ? Math.round(Math.sin(performance.now() / 600 + p.tx) * 0.6) : 0;
    out.push({ y: by, draw: () => ctx.drawImage(img, Math.round(x - img.width / 2) + sway, by - cy - img.height + 2) });
  }
  if (pourDrops.length) {
    out.push({ y: player.y + 1, draw: () => {
      ctx.fillStyle = '#bfe4f4';
      for (const d of pourDrops) ctx.fillRect(Math.round(d.x - cx), Math.round(d.y - cy), 1, 2);
    } });
  }
  return out;
}

// The can in the player's hand, tipped forward while it pours.
function drawPour(e, x, top) {
  const img = SPR.icon.wateringCan;
  const side = e.dir === 'left' ? -1 : 1;
  const front = e.dir === 'up' || e.dir === 'down';
  const tilt = Math.min(1, e.pour.t / 0.2, (0.9 - e.pour.t) / 0.15) * 0.6;
  ctx.save();
  ctx.translate(x + (front ? 4 : side * 2), top + 13);
  ctx.scale(side, 1);
  ctx.rotate(tilt);
  ctx.drawImage(img, -4, -3);
  ctx.restore();
}

// ---------- saving ----------

const savePlots = () => plots.map((p) => [p.tx, p.ty, p.crop, p.stage, p.wet, p.grew]);

function restorePlots(list) {
  plots.length = 0;
  for (const [tx, ty, crop, stage, wet, grew] of list || []) {
    if (crop && !CROPS[crop]) continue;
    plots.push({ tx, ty, crop, stage, wet, grew });
  }
}
