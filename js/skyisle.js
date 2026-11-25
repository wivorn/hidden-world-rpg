// The sky above the clouds, and the sky island in it. On dragonback, U climbs up through the cloud deck: the world
// below is lost under a sea of cloud that nothing can land on, and U again drops back down through it. High over
// the eastern sea a sky island sits on a cluster of cloud, ringed by a little maze of cloud banks the dragon can't
// fly through. A sunbeam shines in through a gap in the maze's north side. Breath turns the crystal prisms set in
// the maze a quarter turn at a time, and each one bends the beam round a corner. Brought to the great prism on the
// island from its west side, the beam fans into a rainbow that lights seven crystals, red to violet, and they melt
// the cloud over the nest of a cloud dragon's egg. From the east side the colours come out back to front, and the
// crystals only flicker and fizzle.

const SKY_RISE = 0.9;      // seconds climbing (or dropping) into the white of the cloud deck
const SKY_SETTLE = 0.8;    // seconds coming out the other side
const SKY_LIFT = 90;       // px the dragon climbs above its flying height going through the deck
const SKY_SINK = 54;       // px below its flying height it comes out of the deck, or dips into it on the way down
const SKY_SEEN = 380;      // px from the island's middle it's first made out
const BANK_PAD = 12;       // px the dragon keeps clear of a cloud bank
const PRISM_REACH = 48;    // px from a prism a breath can land and still turn it; prisms stand well over twice this apart
const PRISM_GRAZE = 18;    // px to the side of a fireball's flight a prism it passes over is caught
const PRISM_REST = 0.8;    // seconds before the same prism turns again, so one sweep of a beam turns it once
const PRISM_TURN = 0.25;   // seconds a quarter turn takes to show
const LIGHT_EACH = 0.3;    // seconds between one crystal lighting and the next
const SKY_MELT = 2.2;     // seconds the lit crystals take to melt the cloud off the nest
const SKY_SCOOP = 30;    // px from the egg the rider can lean down and scoop it up

// Ways the beam can travel: north, east, south, west. A prism of facing k is open on two sides and bends
// light that comes in one into going out the other; light that strikes its back stops there.
const SKY_STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const PRISM_SIDES = [[0, 1], [1, 2], [2, 3], [3, 0]];

const SKY_COLS = SKY_MAZE.rows[0].length;
const SKY_ROWS = SKY_MAZE.rows.length;
const SKY_MID = { x: SKY_ISLE.x * TILE, y: SKY_ISLE.y * TILE };
const SKY_X0 = SKY_MID.x - (SKY_COLS * SKY_MAZE.cell) / 2;
const SKY_Y0 = SKY_MID.y - (SKY_ROWS * SKY_MAZE.cell) / 2;
const skyCell = (c, r) => (r >= 0 && r < SKY_ROWS && c >= 0 && c < SKY_COLS ? SKY_MAZE.rows[r][c] : ' ');
const cellMid = (c, r) => [SKY_X0 + (c + 0.5) * SKY_MAZE.cell, SKY_Y0 + (r + 0.5) * SKY_MAZE.cell];
const findCell = (ch) => {
  const r = SKY_MAZE.rows.findIndex((row) => row.includes(ch));
  return [SKY_MAZE.rows[r].indexOf(ch), r];
};
const SUN_CELL = findCell('S');
const GEM_CELL = findCell('G');

const skyPrisms = [];
SKY_MAZE.rows.forEach((row, r) => [...row].forEach((ch, c) => {
  if (ch !== 'P') return;
  const [x, y] = cellMid(c, r);
  skyPrisms.push({ c, r, x, y, rest: 0, turnT: 0, lit: false });
}));

const sky = { on: false, shift: null, facings: [...SKY_MAZE.facings], beam: null, solved: false, lightT: 0, melt: 0, fizzleT: 0, told: {} };
const aloft = () => sky.on;
const skyEgg = () => eggs.find((e) => e.species === 'cloudDragon');
const ease = (u) => u * u * (3 - 2 * u);
// the island and everything on it rise and fall together on their cloud
const isleBob = () => Math.round(Math.sin(time * 0.7) * 2);

function initSkyIsle() {
  const e = skyEgg();
  if (e && e.state === 'wild') {
    e.hidden = true;
    if (e.col) e.col.off = true;
  }
}

// ---------- going up and coming down ----------

const canRise = () => !!flight && flight.mode === 'fly' && !flight.warp && !indoors && !sky.shift && flight.loop < 0;

function toggleAloft() {
  if (!canRise()) return;
  sky.shift = { up: !sky.on, t: 0, flipped: false };
  Sfx.cloudPass(!sky.on);
  Sfx.flap(1.2);
}

function updateShift(dt) {
  const s = sky.shift;
  const f = flight;
  s.t += dt;
  if (!s.flipped) {
    const u = Math.min(1, s.t / SKY_RISE);
    f.alt = FLY_ALT + (s.up ? SKY_LIFT : -SKY_SINK) * ease(u);
    if (u < 1) return;
    Object.assign(s, { flipped: true, t: 0 });
    sky.on = s.up;
    if (s.up) arriveAloft();
    else muse('Back down under the clouds.');
  } else {
    const u = Math.min(1, s.t / SKY_SETTLE);
    f.alt = FLY_ALT + (s.up ? -SKY_SINK : SKY_LIFT) * (1 - ease(u));
    if (u < 1) return;
    f.alt = FLY_ALT;
    sky.shift = null;
  }
}

function arriveAloft() {
  stats.skyRises++;
  if (stats.skyRises === 1) muse('Above the clouds! A whole sea of them, and the world gone under it. Nothing to land on up here.');
  // a bank can't be flown into, but one risen up inside is left freely
  if (bankAt(flight.x, flight.y)) muse('Right in the middle of a cloud bank! Best fly clear of it.');
}

// ---------- the maze ----------

function bankAt(x, y) {
  const c = Math.floor((x - SKY_X0) / SKY_MAZE.cell);
  const r = Math.floor((y - SKY_Y0) / SKY_MAZE.cell);
  return skyCell(c, r) === '#';
}

const bankNear = (x, y) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].some(([sx, sy]) => bankAt(x + sx * BANK_PAD, y + sy * BANK_PAD * 0.6));

function skyBlocked(x, y) {
  return aloft() && bankNear(x, y) && !bankNear(flight.x, flight.y);
}

// ---------- the sunbeam ----------

// Follows the sunbeam cell by cell from the gap in the north bank: `pts` is its path in pixels, `end` is 'west' or
// 'east' for which side it came into the great prism from, or null where a bank or a prism's back stopped it.
function traceSunbeam() {
  let [c, r] = SUN_CELL;
  let dir = 2;
  const [sx] = cellMid(c, r);
  const pts = [[sx, SKY_Y0 - 20]];
  for (const p of skyPrisms) p.lit = false;
  for (let n = 0; n < SKY_COLS * SKY_ROWS; n++) {
    const [pc, pr] = cellMid(c, r);
    c += SKY_STEP[dir][0];
    r += SKY_STEP[dir][1];
    const ch = skyCell(c, r);
    const [x, y] = cellMid(c, r);
    if (ch === '#' || ch === ' ') {
      pts.push([(pc + x) / 2, (pr + y) / 2]);
      return { pts, end: null };
    }
    if (ch === 'P') {
      const p = skyPrisms.find((q) => q.c === c && q.r === r);
      const sides = PRISM_SIDES[sky.facings[skyPrisms.indexOf(p)]];
      const from = (dir + 2) % 4;
      pts.push([x, y]);
      p.lit = true;
      if (!sides.includes(from)) return { pts, end: null };
      dir = sides[0] === from ? sides[1] : sides[0];
    } else if (ch === 'G') {
      pts.push(gemPoint());
      return { pts, end: dir === 1 ? 'west' : dir === 3 ? 'east' : null };
    }
  }
  return { pts, end: null };
}

const gemPoint = () => [cellMid(...GEM_CELL)[0], cellMid(...GEM_CELL)[1] - 6 + isleBob()];

// The seven colour crystals stand in an arc on the island below the great prism, red in the west to violet in the east.
function crystalSpots() {
  const [gx, gy] = cellMid(...GEM_CELL);
  return RAINBOW.map((c, i) => {
    const u = i / 6 - 0.5;
    return [gx + u * 116, gy + 22 + (0.25 - u * u) * 36 + isleBob()];
  });
}

const crystalsLit = () => Math.min(7, Math.floor(sky.lightT / LIGHT_EACH));

// ---------- breath up here ----------

// Breath aloft lands on cloud: a puff where it lands, and a prism near enough turns a quarter.
function skyHit(x, y, el, pal, big) {
  const n = big ? 6 : Math.random() < 0.4 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    particles.push({ type: 'steam', layer: 'sky', x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 8, life: 0, max: 0.8 + Math.random() * 0.5 });
  }
  particles.push({ type: 'flash', layer: 'sky', x, y: y - 4, vx: 0, vy: 0, c: pal[0], life: 0, max: big ? 0.3 : 0.2 });
  if (big) Sfx.impact(el, earshot(x, y) * 0.6);
  const ready = skyPrisms.filter((q) => q.rest <= 0);
  const byDist = (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y);
  const p = ready.filter((q) => Math.hypot(q.x - x, q.y - y) < PRISM_REACH).sort(byDist)[0]
    // a fireball that carries on past a prism still catches it on the way
    || (big && flight ? ready.filter((q) => pathDist(q, flight.x, flight.y, x, y) < PRISM_GRAZE).sort(byDist)[0] : null);
  if (p) turnPrism(p, pal);
}

function pathDist(q, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const u = Math.max(0, Math.min(1, ((q.x - x0) * dx + (q.y - y0) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x0 + dx * u - q.x, y0 + dy * u - q.y);
}

function turnPrism(p, pal) {
  const i = skyPrisms.indexOf(p);
  sky.facings[i] = (sky.facings[i] + 1) % 4;
  p.rest = PRISM_REST;
  p.turnT = PRISM_TURN;
  stats.prisms++;
  Sfx.prism(earshot(p.x, p.y));
  burst(p.x, p.y - 6, ['#ffffff', '#bfe8ff', pal[0]], 8, 30);
  if (!sky.told.turned) {
    sky.told.turned = true;
    muse('The breath turned the prism round! Each one bends the sunlight a different way.');
  }
}

// ---------- each frame ----------

function updateSkyIsle(dt) {
  if (!flight) {
    sky.on = false;
    sky.shift = null;
  } else if (sky.shift) {
    updateShift(dt);
  }
  for (const p of skyPrisms) {
    p.rest -= dt;
    p.turnT = Math.max(0, p.turnT - dt);
  }
  sky.beam = traceSunbeam();
  if (!aloft()) return;

  const near = Math.hypot(flight.x - SKY_MID.x, flight.y - SKY_MID.y);
  if (near < SKY_SEEN && !stats.skyIsle) {
    stats.skyIsle = 1;
    const poi = POIS.find((p) => p.id === 'skyIsle');
    poi.seen = true;
    learnPlace(poi);
    muse(sky.solved ? 'The sky island!' : 'An island, floating on the clouds! Cloud banks all round it like a maze, and a sunbeam shining in at the top.');
  }
  if (!sky.told.prism && skyPrisms.some((p) => Math.hypot(flight.x - p.x, flight.y - p.y) < 70)) {
    sky.told.prism = true;
    muse('A crystal prism set in the cloud, catching the sun. Maybe a breath of fire would turn it?');
  }

  if (!sky.solved && sky.beam.end === 'west') solveSky();
  if (!sky.solved && sky.beam.end === 'east') fizzle(dt, near);

  if (sky.solved) {
    const was = crystalsLit();
    sky.lightT += dt;
    const now = crystalsLit();
    for (let i = was; i < now; i++) {
      const [x, y] = crystalSpots()[i];
      Sfx.crystal(i);
      burst(x, y - 6, [RAINBOW[i], '#ffffff'], 6, 26);
    }
    if (now === 7 && sky.melt < 1) {
      sky.melt = Math.min(1, sky.melt + dt / SKY_MELT);
      if (sky.melt === 1) {
        const e = skyEgg();
        if (e && e.state === 'wild') {
          burst(e.x, e.y - 8, RAINBOW, 18, 50);
          Sfx.reward();
          muse('The cloud melted away! There, in the nest... a cloud dragon\'s egg! I\'ll lean down and scoop it up.');
        }
      }
    }
  }
}

function solveSky() {
  sky.solved = true;
  sky.lightT = 0;
  stats.rainbow++;
  Sfx.reward();
  muse('The sunlight split into a rainbow! The crystals are lighting up, one colour at a time!');
}

// Light into the great prism the wrong way round fans out back to front, and no crystal takes the wrong colour.
function fizzle(dt, near) {
  sky.fizzleT -= dt;
  if (sky.fizzleT > 0) return;
  sky.fizzleT = 0.45;
  const i = [0, 1, 2, 4, 5, 6][Math.floor(Math.random() * 6)];
  const [x, y] = crystalSpots()[i];
  Sfx.crystal(i, true);
  burst(x, y - 6, [RAINBOW[6 - i], '#5a5a6a'], 4, 18);
  if (!sky.told.wrong && near < 200) {
    sky.told.wrong = true;
    muse('A rainbow, but the colours are back to front, and the crystals just fizzle. The light must have to come in from the other side.');
  }
}

// ---------- the egg ----------

function nearSkyEgg() {
  const e = skyEgg();
  if (!aloft() || !e || e.state !== 'wild' || sky.melt < 1 || carrying() || !flight || flight.mode !== 'fly' || sky.shift) return null;
  return Math.hypot(flight.x - e.x, flight.y - e.y) < SKY_SCOOP ? e : null;
}

function scoopSkyEgg(e) {
  pickUpEgg(e);
  Sfx.flap(1);
  muse('Got it! Now down through the clouds and off to the fire mountain to warm it.');
}

// Prompt for SPACE up here, where there's nowhere to land.
function skySpacePrompt() {
  if (nearSkyEgg()) return 'SPACE  Scoop up the egg';
  if (skyPrisms.some((p) => Math.hypot(flight.x - p.x, flight.y - p.y) < 70)) return 'Breathe on a prism to turn it';
  return 'Nothing to land on up here';
}

// A grown dragon left to follow while its rider is above the clouds circles below until they come back down.
function skyWait() {
  return { x: player.x + Math.cos(time * 0.6) * 60, y: player.y + 30 + Math.sin(time * 0.6) * 24, alt: FLY_ALT };
}

// ---------- drawing above the clouds ----------

function cloudBlobs(g, blobs) {
  for (const [x, y, r] of blobs) ellipse(g, x, y + r * 0.35, r, r * 0.72, '#aab8dc');
  for (const [x, y, r] of blobs) ellipse(g, x, y, r, r * 0.74, '#e4eaf8');
  for (const [x, y, r] of blobs) ellipse(g, x - r * 0.25, y - r * 0.28, r * 0.62, r * 0.44, '#ffffff');
}

const bankCache = new Map();
function bankSprite(c, r) {
  const key = r * SKY_COLS + c;
  let s = bankCache.get(key);
  if (s) return s;
  const pad = 18;
  const n = SKY_MAZE.cell + pad * 2;
  s = makeCanvas(n, n);
  const blobs = [];
  for (let k = 0; k < 8; k++) {
    blobs.push([pad + 8 + hash(c, r * 8 + k, 61) * (SKY_MAZE.cell - 16), pad + 8 + hash(c, r * 8 + k, 62) * (SKY_MAZE.cell - 16), 15 + hash(c, r * 8 + k, 63) * 7]);
  }
  // reach into the banks either side so a run of them reads as one long cloud
  for (const [dc, dr] of SKY_STEP) {
    if (skyCell(c + dc, r + dr) === '#') blobs.push([pad + SKY_MAZE.cell / 2 + dc * 24, pad + SKY_MAZE.cell / 2 + dr * 24, 16]);
  }
  blobs.sort((a, b) => a[1] - b[1]);
  cloudBlobs(s.getContext('2d'), blobs);
  bankCache.set(key, s);
  return s;
}

let isleSprite = null;
function buildIsleSprite() {
  const W = 180;
  const H = 150;
  const s = makeCanvas(W, H);
  const g = s.getContext('2d');
  const rnd = mulberry32(731);
  const top = [];
  const under = [];
  for (let k = 0; k <= 14; k++) {
    const x = 14 + k * 11;
    const u = k / 14 - 0.5;
    under.push([x, 54 + (1 - 4 * u * u) * 70 + (rnd() - 0.5) * 12]);
  }
  for (const [x, y] of under) top.push([x, y]);
  poly(g, [[12, 52], ...top, [168, 52]], '#7a4c30');
  poly(g, [[12, 52], ...top.map(([x, y]) => [x, 52 + (y - 52) * 0.45]), [168, 52]], '#9a6640');
  for (let k = 0; k < 10; k++) {
    const x = 30 + rnd() * 120;
    const y = 64 + rnd() * 40;
    rect(g, Math.round(x), Math.round(y), 6 + Math.round(rnd() * 6), 1, '#5e3a24');
  }
  cloudBlobs(g, [[24, 92, 16], [52, 106, 20], [90, 114, 22], [128, 106, 20], [156, 92, 16], [70, 124, 16], [110, 126, 16]]);
  ellipse(g, 90, 56, 81, 41, '#6e4428');
  ellipse(g, 90, 53, 80, 39, '#3e8a3a');
  ellipse(g, 90, 50, 79, 37, '#5aa848');
  ellipse(g, 84, 45, 64, 27, '#6cc05a');
  for (let k = 0; k < 60; k++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd());
    const x = Math.round(90 + Math.cos(a) * d * 72);
    const y = Math.round(50 + Math.sin(a) * d * 32);
    const f = rnd();
    if (f < 0.55) { px(g, x, y, '#3e8a3a'); px(g, x, y - 1, '#4e9a42'); }
    else px(g, x, y, ['#ffe85a', '#ff8ab0', '#ffffff', '#b8a8ec'][Math.floor(rnd() * 4)]);
  }
  cloudBlobs(g, [[14, 58, 12], [166, 58, 12], [30, 76, 11], [150, 76, 11]]);
  return s;
}

let domeSprite = null;
function buildDomeSprite() {
  const s = makeCanvas(48, 36);
  cloudBlobs(s.getContext('2d'), [[24, 10, 10], [14, 18, 10], [34, 18, 10], [24, 22, 12], [10, 26, 7], [38, 26, 7]]);
  return s;
}

let plinthSprite = null;
function buildPlinthSprite() {
  const s = makeCanvas(36, 20);
  cloudBlobs(s.getContext('2d'), [[10, 10, 8], [26, 10, 8], [18, 12, 9]]);
  return s;
}

function drawCloudSea(cx, cy) {
  const imgs = SPR.clouds;
  const inMaze = (x, y) => x > SKY_X0 - 40 && x < SKY_X0 + SKY_COLS * SKY_MAZE.cell + 40 && y > SKY_Y0 - 30 && y < SKY_Y0 + SKY_ROWS * SKY_MAZE.cell + 30;
  // a far deck drifting slow beneath, then the deck at the dragon's own height
  for (const [P, GX, GY, keep, alpha, seed] of [[0.75, 90, 44, 0.6, 0.4, 71], [1, 110, 52, 0.42, 0.85, 72]]) {
    ctx.globalAlpha = alpha;
    const ox = cx * P;
    const oy = cy * P;
    for (let gy = Math.floor((oy - 60) / GY); gy <= Math.floor((oy + viewH + 20) / GY); gy++) {
      for (let gx = Math.floor((ox - 110) / GX); gx <= Math.floor((ox + viewW + 10) / GX); gx++) {
        const h = hash(gx, gy, seed);
        if (h > keep) continue;
        const wx = gx * GX + hash(gx, gy, seed + 10) * 40;
        const wy = gy * GY + hash(gx, gy, seed + 20) * 24;
        // the maze's corridors stay clear, so its banks read as walls
        if (inMaze(wx + 48 + cx * (1 - P), wy + 20 + cy * (1 - P))) continue;
        const bob = Math.sin(time * 0.9 + h * 40) * 3;
        ctx.drawImage(imgs[Math.floor(hash(gx, gy, seed + 30) * imgs.length)], Math.round(wx - ox), Math.round(wy - oy + bob));
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawSkyLayer(cx, cy) {
  if (!aloft()) return;
  ctx.fillStyle = 'rgba(164,200,240,0.86)';
  ctx.fillRect(0, 0, viewW, viewH);
  drawCloudSea(cx, cy);
  const w = SKY_COLS * SKY_MAZE.cell;
  const h = SKY_ROWS * SKY_MAZE.cell;
  if (SKY_X0 + w + 80 > cx && SKY_X0 - 80 < cx + viewW && SKY_Y0 + h + 160 > cy && SKY_Y0 - 120 < cy + viewH) drawSkyIsle(cx, cy);
  ctx.globalAlpha = 0.18;
  ellipse(ctx, Math.round(flight.x) - cx, Math.round(flight.y) - cy, 14, 4, '#3a4a7a');
  ctx.globalAlpha = 1;
}

function drawSkyIsle(cx, cy) {
  const [sx, sy] = cellMid(...SUN_CELL);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(glowSprite(48, '#fff0a0'), Math.round(sx - 48 - cx), Math.round(SKY_Y0 - 40 - cy));
  ctx.globalCompositeOperation = 'source-over';

  isleSprite ||= buildIsleSprite();
  const bob = isleBob();
  ctx.drawImage(isleSprite, Math.round(SKY_MID.x - 90 - cx), Math.round(SKY_MID.y + 28 - 50 - cy + bob));

  ctx.globalAlpha = 0.16;
  for (let r = 0; r < SKY_ROWS; r++) {
    for (let c = 0; c < SKY_COLS; c++) {
      const [x, y] = cellMid(c, r);
      if (skyCell(c, r) === '#') ellipse(ctx, Math.round(x - cx + 4), Math.round(y - cy + 16), 34, 26, '#2a3a7a');
    }
  }
  ctx.globalAlpha = 1;
  for (let r = 0; r < SKY_ROWS; r++) {
    for (let c = 0; c < SKY_COLS; c++) {
      if (skyCell(c, r) !== '#') continue;
      const dy = Math.round(Math.sin(time * 1.1 + c * 0.7 + r * 1.3) * 2);
      ctx.drawImage(bankSprite(c, r), Math.round(SKY_X0 + c * SKY_MAZE.cell - 18 - cx), Math.round(SKY_Y0 + r * SKY_MAZE.cell - 18 - cy + dy));
    }
  }

  drawNest(cx, cy, bob);
  drawCrystals(cx, cy);
  for (const p of skyPrisms) drawPrism(p, cx, cy);
  drawGreatPrism(cx, cy);
  drawSunbeam(cx, cy);
}

function drawNest(cx, cy, bob) {
  const e = skyEgg();
  if (!e) return;
  const x = Math.round(e.x - cx);
  const y = Math.round(e.y - cy + bob);
  const nest = SPR.nest;
  ctx.drawImage(nest.img, x - nest.ox, y - nest.oy);
  if (e.state === 'wild' && sky.melt > 0.3) ctx.drawImage(SPR[e.key].img, x - 6, y - 15);
  if (sky.melt >= 1) return;
  // streams of colour from each lit crystal into the cloud while it melts
  if (crystalsLit() === 7) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * Math.sin(sky.melt * Math.PI);
    crystalSpots().forEach(([cx0, cy0], i) => strokePath([[cx0 - cx, cy0 - 8 - cy], [x, y - 10]], 2, RAINBOW[i]));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  domeSprite ||= buildDomeSprite();
  const k = 1 - sky.melt;
  ctx.globalAlpha = Math.min(1, k * 1.4);
  const sw = Math.round(48 * (0.6 + 0.4 * k));
  const sh = Math.round(36 * (0.6 + 0.4 * k));
  ctx.drawImage(domeSprite, x - sw / 2, y - sh + 4, sw, sh);
  ctx.globalAlpha = 1;
}

function drawCrystals(cx, cy) {
  const lit = crystalsLit();
  const wrong = !sky.solved && sky.beam && sky.beam.end === 'east';
  crystalSpots().forEach(([x0, y0], i) => {
    const x = Math.round(x0 - cx);
    const y = Math.round(y0 - cy);
    const on = i < lit || (wrong && i === 3);
    const flick = wrong && i !== 3 && Math.sin(time * 23 + i * 5) > 0.6;
    const c = on ? RAINBOW[i] : flick ? RAINBOW[6 - i] : shade(RAINBOW[i], -0.55);
    ellipse(ctx, x, y, 4, 1.5, '#6a7a9a');
    poly(ctx, [[x, y - 12], [x + 3, y - 5], [x, y], [x - 3, y - 5]], c);
    poly(ctx, [[x, y - 12], [x, y], [x - 3, y - 5]], shade(c, on ? 0.35 : 0.15));
    px(ctx, x - 1, y - 8, on ? '#ffffff' : shade(c, 0.3));
    if (on || flick) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = on ? 0.8 + 0.2 * Math.sin(time * 4 + i) : 0.5;
      ctx.drawImage(glowSprite(12, RAINBOW[on ? i : 6 - i]), x - 12, y - 18);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  });
}

// A prism is a glass wedge on a puff of cloud: its long face looks towards the two sides it joins.
function drawPrism(p, cx, cy) {
  plinthSprite ||= buildPlinthSprite();
  const x = Math.round(p.x - cx);
  const y = Math.round(p.y - cy + Math.sin(time * 1.3 + p.c) * 1.5);
  ctx.drawImage(plinthSprite, x - 18, y - 6);
  const a = (sky.facings[skyPrisms.indexOf(p)] - p.turnT / PRISM_TURN) * (Math.PI / 2);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const R = 11;
  const pts = [[-1, 1], [1, 1], [-1, -1]].map(([u, v]) => [x + (u * cos - v * sin) * R, y - 6 + (u * sin + v * cos) * R * 0.75]);
  ctx.globalAlpha = 0.85;
  poly(ctx, pts, p.lit ? '#e8f8ff' : '#a8d8f4');
  ctx.globalAlpha = 1;
  line(ctx, pts[1][0], pts[1][1], pts[2][0], pts[2][1], '#ffffff');
  line(ctx, pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#6aa8d8');
  line(ctx, pts[0][0], pts[0][1], pts[2][0], pts[2][1], '#6aa8d8');
  if (p.lit || p.turnT > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = p.turnT > 0 ? 1 : 0.7;
    ctx.drawImage(glowSprite(16, '#fff6c0'), x - 16, y - 22);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  if (Math.sin(time * 2.1 + p.c * 3 + p.r) > 0.97) px(ctx, x + 2, y - 10, '#ffffff');
}

function drawGreatPrism(cx, cy) {
  const [gx, gy] = gemPoint();
  const x = Math.round(gx - cx);
  const y = Math.round(gy - cy);
  ellipse(ctx, x, y + 12, 10, 3, 'rgba(40,70,40,0.35)');
  poly(ctx, [[x, y - 16], [x + 9, y + 12], [x - 9, y + 12]], '#bfe6ff');
  poly(ctx, [[x, y - 16], [x + 9, y + 12], [x + 2, y + 12]], '#8ec4ec');
  line(ctx, x, y - 16, x - 9, y + 12, '#ffffff');
  line(ctx, x - 9, y + 12, x + 9, y + 12, '#6aa0d0');
  const lit = sky.beam && sky.beam.end;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = lit ? 0.9 : 0.35 + 0.15 * Math.sin(time * 2);
  ctx.drawImage(glowSprite(22, '#ffffff'), x - 22, y - 24);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawSunbeam(cx, cy) {
  const b = sky.beam;
  if (!b) return;
  const pts = b.pts.map(([x, y]) => [x - cx, y - cy]);
  const shimmer = 0.85 + 0.15 * Math.sin(time * 6);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.25 * shimmer;
  strokePath(pts, 7, '#ffd86a');
  ctx.globalAlpha = 0.6 * shimmer;
  strokePath(pts, 3, '#fff2b0');
  ctx.globalAlpha = 1;
  strokePath(pts, 1, '#ffffff');
  if (b.end) {
    // the rainbow fans out of the great prism; from the wrong side its colours run back to front
    const [gx, gy] = gemPoint();
    crystalSpots().forEach(([x, y], i) => {
      const c = RAINBOW[b.end === 'west' ? i : 6 - i];
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 5 + i);
      strokePath([[gx - cx, gy + 4 - cy], [x - cx, y - 8 - cy]], 2, c);
    });
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Going through the cloud deck: everything whites out, with cloud streaming past the wrong way.
function drawSkyWhiteout() {
  const s = sky.shift;
  if (!s) return;
  const u = s.flipped ? 1 - ease(Math.min(1, s.t / SKY_SETTLE)) : ease(Math.min(1, s.t / SKY_RISE));
  ctx.fillStyle = `rgba(238,244,255,${0.92 * u})`;
  ctx.fillRect(0, 0, viewW, viewH);
  const run = (s.flipped ? SKY_RISE + s.t : s.t) * 340 * (s.up ? 1 : -1);
  ctx.globalAlpha = 0.8 * u;
  for (let k = 0; k < 8; k++) {
    const img = SPR.clouds[k % SPR.clouds.length];
    const x = hash(k, 1, 81) * (viewW + 60) - 60;
    const y = ((((hash(k, 2, 81) * (viewH + 80) + run) % (viewH + 80)) + viewH + 80) % (viewH + 80)) - 40;
    ctx.drawImage(img, Math.round(x), Math.round(y));
  }
  ctx.globalAlpha = 1;
}

// Lights up here at night: the sun gap, the beam, and whatever the beam or the rainbow lights.
function skyLights() {
  const out = [];
  const [sx] = cellMid(...SUN_CELL);
  out.push({ x: sx, y: SKY_Y0 - 20, r: 60, k: 0.9 });
  for (const p of skyPrisms) if (p.lit) out.push({ x: p.x, y: p.y - 6, r: 30, k: 0.8 });
  if (sky.beam && sky.beam.end) out.push({ x: gemPoint()[0], y: gemPoint()[1], r: 48, k: 1 });
  const lit = crystalsLit();
  crystalSpots().forEach(([x, y], i) => { if (i < lit) out.push({ x, y: y - 6, r: 18, k: 0.8, glow: 8, color: RAINBOW[i] }); });
  return out;
}

// ---------- from below ----------

// From under the clouds, the knot of cloud the island sits on drifts high over the eastern sea, and once the
// rainbow is lit, a rainbow arches over it.
function drawSkyHint(cx, cy) {
  if (aloft() || indoors) return;
  const P = 1.35;
  const x = (SKY_MID.x - cx - viewW / 2) * P + viewW / 2;
  const y = (SKY_MID.y - cy - viewH / 2) * P + viewH / 2;
  if (x < -260 || x > viewW + 260 || y < -200 || y > viewH + 200) return;
  if (sky.solved) {
    ctx.globalAlpha = 0.35;
    RAINBOW.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(x, y + 10, 96 - i * 3, Math.PI, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = c;
      ctx.stroke();
    });
  }
  const a = flight ? 0.85 : 0.6;
  for (let k = 0; k < 9; k++) {
    const img = SPR.clouds[k % SPR.clouds.length];
    const ox = (hash(k, 3, 91) - 0.5) * 200;
    const oy = (hash(k, 4, 91) - 0.5) * 70;
    ctx.globalAlpha = a;
    ctx.drawImage(img, Math.round(x + ox - 48), Math.round(y + oy - 20 + Math.sin(time * 0.8 + k) * 2));
  }
  ctx.globalAlpha = 1;
}

// ---------- saving ----------

function saveSkyIsle() {
  return { facings: [...sky.facings], solved: sky.solved };
}

function restoreSkyIsle(s) {
  Object.assign(sky, { on: false, shift: null });
  if (!s) return;
  if (Array.isArray(s.facings) && s.facings.length === skyPrisms.length) sky.facings = s.facings.map((k) => ((k | 0) % 4 + 4) % 4);
  sky.solved = !!s.solved;
  sky.lightT = sky.solved ? 99 : 0;
  sky.melt = sky.solved ? 1 : 0;
}
