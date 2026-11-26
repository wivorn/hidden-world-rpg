// The sky above the clouds, and the sky island in it. On dragonback, U climbs up through the cloud deck: the world
// below is lost under a sea of cloud that nothing can land on, and U again drops back down through it. High over
// the eastern sea a sky island sits on a cluster of cloud, ringed by a little maze of cloud banks the dragon can't
// fly through. A sunbeam shines in through a gap in the maze's north side. Breath turns the crystal prisms set in
// the maze a quarter turn at a time, and each one bends the beam round a corner. Brought to the great prism on the
// island from its west side, the beam fans into a rainbow that lights seven crystals, red to violet, and they melt
// the cloud over the nest of a cloud dragon's egg. From the east side the colours come out back to front, and the
// crystals only flicker and fizzle.

const SKY_INTO = 1.2;      // seconds surging up (or falling) into the cloud deck
const SKY_OUT = 1.1;       // seconds coasting out the other side and levelling off
const SKY_LIFT = 50;       // px up the screen the dragon surges ahead of the camera at the top of the climb
const SKY_SINK = 40;       // px down the screen it falls ahead of the camera in the drop
const SKY_SWELL = 0.08;    // how much bigger it looks at the top of the surge (and smaller at the bottom of the fall)
const SKY_PITCH = 0.5;
const SKY_DRIFT = 60;      // px the cloud sea slides past as the dragon goes through it
const WORLD_FAR = 0.4;     // how big the world below looks from above the clouds
const RUSH_RATE = 2.2;     // how fast the world shrinking (or swelling) away counts as a full rush
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

const clamp01 = (v) => Math.max(0, Math.min(1, v));
// How far through its half of the shift it is: into the deck, or (once flipped) out the other side.
const shiftU = (s) => clamp01(s.t / (s.flipped ? SKY_OUT : SKY_INTO));
// How far through the whole shift it is, and where in that it goes through the deck.
const FLIP_P = SKY_INTO / (SKY_INTO + SKY_OUT);
const shiftP = (s) => (s.flipped ? FLIP_P + shiftU(s) * (1 - FLIP_P) : shiftU(s) * FLIP_P);

// How far up (or down) the screen the dragon is from where the camera holds it, going through the deck. Climbing,
// it sinks a touch as it gathers itself, then surges up faster and faster ahead of the camera; above the clouds
// it coasts on up a little and the camera catches it up. Going down it bobs up as it drops, then falls
// faster and faster, and under the clouds keeps falling until it flares its wings and levels off.
function surge(s) {
  const u = shiftU(s);
  if (s.up && !s.flipped) return u < 0.15 ? -7 * Math.sin((Math.PI * u) / 0.15) : SKY_LIFT * ((u - 0.15) / 0.85) ** 2;
  if (s.up) return (SKY_LIFT + 60 * u) * (1 - ease(u));
  if (!s.flipped) return u < 0.18 ? 6 * Math.sin((Math.PI * u) / 0.18) : -SKY_SINK * ((u - 0.18) / 0.82) ** 2;
  return -(SKY_SINK + 50 * u) * (1 - ease(u));
}

// How far the dragon's nose is tipped up (radians, down if negative) going through the deck. Climbing, it pulls
// its nose up as it surges and levels off coasting over the top. Going down it tips its nose over into the
// fall, and under the clouds pulls up past level as it flares, then settles.
function skyPitch(s) {
  const u = shiftU(s);
  if (s.up && !s.flipped) return SKY_PITCH * ease(clamp01((u - 0.08) / 0.32));
  if (s.up) return SKY_PITCH * (1 - ease(clamp01(u / 0.6)));
  if (!s.flipped) return u < 0.15 ? 0.12 * Math.sin((Math.PI * u) / 0.15) : -SKY_PITCH * ease(clamp01((u - 0.15) / 0.35));
  if (u < 0.6) return -SKY_PITCH + (SKY_PITCH + 0.15) * ease(clamp01((u - 0.2) / 0.4));
  return 0.15 * (1 - ease((u - 0.6) / 0.4));
}

// How the dragon goes through the deck, keeping its heading both ways. Up, it beats hard and then coasts on
// still wings over the top; down, it falls on folded wings, then flares them wide. `alt` is its height,
// `scale` how near the eye it looks, `pitch` how far its nose is tipped up.
function skyPose() {
  const s = sky.shift;
  if (!s || !flight) return null;
  const u = shiftU(s);
  const face = flight.face || flight.dir;
  const off = surge(s);
  const glide = s.up ? s.flipped && u < 0.55 : !s.flipped;
  return { face, alt: FLY_ALT + off, scale: 1 + (SKY_SWELL * off) / (off > 0 ? SKY_LIFT : SKY_SINK), glide, pitch: skyPitch(s) };
}

const NOSE_SIDE = { right: 1, se: 1, ne: 1, left: -1, sw: -1, nw: -1 };

// Tips the dragon's nose up (pitch > 0) or down about its body. Side on that turns the sprite; head on or tail on
// it can't be turned without rolling, so its body foreshortens instead.
function tiltNose(g, face, pitch) {
  const side = NOSE_SIDE[face];
  if (side) g.rotate(-pitch * side);
  else g.scale(1, 1 - 0.35 * Math.abs(pitch));
}

// How fast its wings beat going through the deck: hard on the climb and in the flare at the bottom of the fall.
function skyFlap() {
  const s = sky.shift;
  if (s.up) return s.flipped ? 6 : 15;
  return s.flipped && shiftU(s) < 0.6 ? 13 : 6;
}

// How dark the dragon's shadow is: fading out as it climbs away from it.
function shadowShown() {
  return sky.shift && flight ? clamp01(1 - (flight.alt - FLY_ALT) / SKY_LIFT) : 1;
}

// How big the world below looks: it falls away smaller and smaller as the dragon climbs, faster the higher it
// gets, and stays small under the clouds; dropping back down it swells up to meet the dragon, then slows as it
// levels off.
function worldScale() {
  if (!flight || indoors) return 1;
  const s = sky.shift;
  if (!s) return sky.on ? WORLD_FAR : 1;
  const p = shiftP(s);
  return WORLD_FAR ** (s.up ? clamp01(p / FLIP_P) ** 2 : 1 - ease(clamp01((p - 0.12) / 0.7)));
}

// Draws the world below as small as it looks, shrunk about the ground under the dragon, with the view widened to
// match so all of it that shows is drawn. Returns the camera to draw it from; endWorldView puts things back.
let worldSaved = null;
function beginWorldView(cx, cy) {
  const s = worldScale();
  if (s === 1) return [cx, cy];
  worldSaved = [viewW, viewH];
  ctx.save();
  ctx.scale(s, s);
  ctx.imageSmoothingEnabled = true;
  viewW = Math.ceil(viewW / s);
  viewH = Math.ceil(viewH / s);
  return [Math.round(flight.x - (flight.x - cx) / s), Math.round(flight.y - (flight.y - cy) / s)];
}

// Where a light on the ground shows, and how far it reaches, with the world below shrunk away.
function shrinkLight(L) {
  const s = worldScale();
  if (s === 1) return L;
  return { ...L, x: flight.x + (L.x - flight.x) * s, y: flight.y + (L.y - flight.y) * s, r: Math.max(2, Math.round(L.r * s)), glow: L.glow && Math.max(2, Math.round(L.glow * s)) };
}

function endWorldView() {
  if (!worldSaved) return;
  [viewW, viewH] = worldSaved;
  worldSaved = null;
  ctx.restore();
}

// How hard the air is rushing past: + climbing, - falling, from how fast the world is shrinking or swelling.
function updateRush(dt) {
  const ws = worldScale();
  const rate = sky.ws && dt > 0 ? -Math.log(ws / sky.ws) / dt / RUSH_RATE : 0;
  sky.ws = ws;
  const want = Math.max(-1, Math.min(1, rate));
  sky.rush = (sky.rush || 0) + (want - (sky.rush || 0)) * (1 - Math.exp(-dt * 6));
  if (Math.abs(sky.rush) < 0.01) sky.rush = 0;
  const r = Math.abs(sky.rush);
  if (r > 0.12 && Math.random() < dt * 90 * r) {
    const down = sky.rush > 0;
    rushLines.push({ x: Math.random() * viewW, y: down ? -40 : viewH + 40, v: (down ? 1 : -1) * (520 + Math.random() * 360), len: 14 + Math.random() * 30, a: 0.2 + Math.random() * 0.25 });
  }
  for (let i = rushLines.length - 1; i >= 0; i--) {
    const l = rushLines[i];
    l.y += l.v * dt * Math.max(0.35, r);
    if (l.y < -80 || l.y > viewH + 80) rushLines.splice(i, 1);
  }
}

// Thin streaks of wind whipping past the screen, down it on the climb and up it in the fall.
const rushLines = [];
function drawRushLines() {
  if (!rushLines.length) return;
  const r = Math.min(1, Math.abs(sky.rush) * 1.5);
  ctx.fillStyle = '#ffffff';
  for (const l of rushLines) {
    ctx.globalAlpha = l.a * r;
    ctx.fillRect(Math.round(l.x), Math.round(l.y), 1, Math.round(l.len));
  }
  ctx.globalAlpha = 1;
}

// A tremor in the view at the height of the rush.
const rushShake = () => {
  const a = Math.max(0, Math.abs(sky.rush || 0) - 0.55) * 3;
  return a ? [Math.round((Math.random() - 0.5) * 2 * a), Math.round((Math.random() - 0.5) * 2 * a)] : [0, 0];
};

// How far the cloud sea is slid from its place: it slides down into place under a dragon climbing up through it,
// and up and away over one dropping down through it.
const skyDrift = () => (sky.shift ? SKY_DRIFT * (1 - skyFade()) : 0);

// Draws the dragon (and a baby tagging along) as big as it looks going through the deck.
function inSkyPose(cx, cy, draw) {
  const p = flight && skyPose();
  if (!p || p.scale === 1) return draw();
  const [bx, by] = dragonBody(flight);
  ctx.save();
  ctx.translate(Math.round(bx) - cx, Math.round(by) - cy);
  ctx.scale(p.scale, p.scale);
  ctx.translate(cx - Math.round(bx), cy - Math.round(by));
  draw();
  ctx.restore();
}

// How much of the sea of cloud shows: it gathers in under a dragon climbing up into it, all cloud by the time
// it's through, and melts away round one falling down through it. Until it's all cloud the world below is still
// the one in play.
function skyFade() {
  const s = sky.shift;
  if (!s) return sky.on ? 1 : 0;
  const p = shiftP(s);
  return s.up ? ease(clamp01((p - 0.12) / (FLIP_P - 0.12))) : 1 - ease(clamp01((p - 0.2) / 0.7));
}

function updateShift(dt) {
  const s = sky.shift;
  s.t += dt;
  flight.alt = skyPose().alt;
  if (shiftU(s) < 1) return;
  if (s.flipped) {
    sky.shift = null;
    flight.alt = FLY_ALT;
    return;
  }
  Object.assign(s, { flipped: true, t: 0 });
  sky.on = s.up;
  if (s.up) arriveAloft();
  else muse('Back down under the clouds.');
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
  updateRush(dt);
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
  if (nearSkyEgg()) return 'SPACE  Scoop up the egg  ·  U  Drop below the clouds';
  const down = 'U  Drop below the clouds';
  return skyPrisms.some((p) => Math.hypot(flight.x - p.x, flight.y - p.y) < 70) ? `Breathe on a prism to turn it  ·  ${down}` : down;
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

// Shadowed rim, shade, body and sunlit top of the clouds of the open sky.
const CLOUD_TONES = {
  white: ['#9fb0d6', '#c8d3ec', '#e8eef9', '#ffffff'],
  warm: ['#aca6cf', '#d4cee6', '#f2ecf4', '#fffaf0'],
  grey: ['#8794bb', '#adb8d6', '#d0d9ec', '#f0f4fb'],
  thin: ['#b4c0de', '#cfd8ef', '#e2e9f7', '#f6f8fd'],
  layer: ['#b0bcdc', '#cdd6ee', '#e4eaf7', '#ebf0fa'],
  storm: ['#22263a', '#363b55', '#4b516d', '#646a88'],
  thunder: ['#2e3349', '#4a5069', '#686e8a', '#9ca2ba'],
};
const CLOUD_SQUASH = 0.88;  // billows seen from above, tipped only a little towards the eye

// A cloud seen from above: one mass of round billows `[x, y, r]`, lit by the sun from the top left. Its outline is
// shaded round the lower right where it falls away, and each billow catches a soft highlight where it bulges up.
function paintCloud(g, blobs, [rim, shade, body, top]) {
  const q = CLOUD_SQUASH;
  for (const [x, y, r] of blobs) ellipse(g, x + r * 0.12, y + r * 0.16, r, r * q, rim);
  for (const [x, y, r] of blobs) ellipse(g, x, y, r * 0.96, r * 0.96 * q, shade);
  for (const [x, y, r] of blobs) ellipse(g, x - r * 0.1, y - r * 0.12, r * 0.84, r * 0.84 * q, body);
  blobs.sort((a, b) => a[2] - b[2]);
  for (const [x, y, r] of blobs) ellipse(g, x - r * 0.28, y - r * 0.3, r * 0.5, r * 0.5 * q, top);
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

// ---------- the sea of cloud ----------

// The cloud up here isn't even: it piles up thick in some places, thins to scattered puffs in others, and here
// and there breaks open altogether onto the world far below. `skyCover` is how thick it is at a point, 0 to 1;
// under SKY_GAP it's open sky.
const SKY_GAP = 0.4;
const CLOUD_DRIFT = 4;     // px a second the cloud at the dragon's height drifts east on the wind

function skyCover(x, y) {
  const octave = (size, seed) => {
    const gx = x / size;
    const gy = y / size;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const u = ease(gx - x0);
    const v = ease(gy - y0);
    const h = (i, j) => hash(x0 + i, y0 + j, seed);
    return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
  };
  const n = octave(640, 101) * 0.7 + octave(240, 102) * 0.3;
  return Math.max(0, Math.min(1, (n - 0.5) * 1.9 + 0.5));
}

// Clouds of each kind, several of each, every one anchored at its middle: heaped cumulus, great thunderheads
// spreading their anvils, small puffs, broad fields of stratocumulus, and the thin wisps of cirrus high above.
const skyClouds = {};

function cloudKind(kind) {
  return (skyClouds[kind] ||= [0, 1, 2, 3, 4, 5].map((i) => CLOUD_BUILDERS[kind](mulberry32(900 + i * 37 + kind.length * 7), i)));
}

const anchored = (s, w, h) => Object.assign(s, { ox: Math.round(w / 2), oy: Math.round(h / 2) });

// A cloud sprite, with the soft shadow its billows cast on the world below.
function cloudSprite(w, h, blobs, tones, paint = (g) => paintCloud(g, blobs, tones)) {
  const s = anchored(sprite(w, h, paint, false), w, h);
  s.shadow = makeCanvas(w, h);
  const g = s.shadow.getContext('2d');
  for (const [x, y, r] of blobs) {
    const R = Math.round(r * 1.2);
    g.drawImage(blob(R, '30,48,110'), Math.round(x - R), Math.round(y - R * CLOUD_SQUASH), R * 2, Math.round(R * 2 * CLOUD_SQUASH));
  }
  return s;
}

// Billows heaped round a few cores inside a w by h oval: big and tall at each core, smaller out towards the edge.
function clump(r, w, h, n, small, big, cores) {
  const pad = small * 1.3 + 3;
  const ax = w / 2 - pad;
  const ay = h / 2 - pad;
  const at = Array.from({ length: cores }, () => {
    const a = r() * Math.PI * 2;
    const d = cores > 1 ? 0.25 + r() * 0.2 : 0;
    return [Math.cos(a) * d, Math.sin(a) * d];
  });
  const blobs = [];
  for (let k = 0; k < n; k++) {
    const [cx, cy] = at[k % cores];
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (cores > 1 ? 0.75 : 1);
    const ux = Math.max(-1, Math.min(1, cx + Math.cos(a) * d));
    const uy = Math.max(-1, Math.min(1, cy + Math.sin(a) * d));
    const far = Math.min(1, Math.hypot(ux, uy));
    const rad = small + (big - small) * (1 - far) * (0.7 + r() * 0.3);
    blobs.push([w / 2 + ux * (ax - rad * 0.8 * far), h / 2 + uy * (ay - rad * 0.8 * far), rad]);
  }
  return blobs;
}

const CLOUD_BUILDERS = {
  heap(r, i) {
    const w = 96 + Math.floor(r() * 64);
    const h = Math.round(w * (0.62 + r() * 0.2));
    const blobs = clump(r, w, h, 18 + Math.floor(r() * 8), 10, 24, 1 + Math.floor(r() * 2));
    return cloudSprite(w, h, blobs, [CLOUD_TONES.white, CLOUD_TONES.warm, CLOUD_TONES.white, CLOUD_TONES.grey][i % 4]);
  },
  tower(r, i) {
    // a thunderhead from above: its anvil spread wide and flat on the wind, the boiling tower punching up through
    // the middle of it
    const w = 170 + Math.floor(r() * 30);
    const h = 140 + Math.floor(r() * 20);
    const anvil = clump(r, w, h, 22, 18, 30, 1);
    const core = clump(r, w * 0.55, h * 0.55, 14, 10, 20, 1).map(([x, y, rad]) => [x + w * 0.2 + (r() - 0.5) * 6, y + h * 0.2, rad]);
    return cloudSprite(w, h, [...anvil, ...core], null, (g) => {
      paintCloud(g, anvil, i % 2 ? CLOUD_TONES.grey : CLOUD_TONES.thin);
      paintCloud(g, core, CLOUD_TONES.white);
    });
  },
  thunder(r) {
    // a thunderhead heavy with rain: a great dark anvil sheared out on the wind, and the tower boiling up through
    // it, paler on top where it's punched up into the sun
    const w = 140 + Math.floor(r() * 40);
    const h = 112 + Math.floor(r() * 26);
    const anvil = clump(r, w, h, 24, 14, 26, 2);
    const tower = clump(r, w * 0.55, h * 0.55, 14, 10, 18, 1).map(([x, y, rad]) => [x + w * 0.2, y + h * 0.2, rad]);
    return cloudSprite(w, h, [...anvil, ...tower], null, (g) => {
      paintCloud(g, anvil, CLOUD_TONES.storm);
      paintCloud(g, tower, CLOUD_TONES.thunder);
    });
  },
  puff(r, i) {
    const w = 40 + Math.floor(r() * 30);
    const h = Math.round(w * (0.7 + r() * 0.2));
    const blobs = clump(r, w, h, 5 + Math.floor(r() * 4), 7, 14, 1);
    return cloudSprite(w, h, blobs, i % 3 === 1 ? CLOUD_TONES.warm : CLOUD_TONES.white);
  },
  sheet(r) {
    // stratocumulus from above: a broad patchy field of small cells with threads of sky between them
    const w = 190 + Math.floor(r() * 80);
    const h = 90 + Math.floor(r() * 40);
    const step = 16;
    const seed = 400 + Math.floor(r() * 1000);
    const blobs = [];
    for (let y = 14; y < h - 14; y += step * 0.8) {
      for (let x = 14; x < w - 14; x += step) {
        const cx = x + (r() - 0.5) * 12 + ((y / (step * 0.8)) % 2) * step * 0.5;
        const cy = y + (r() - 0.5) * 10;
        const ex = (cx - w / 2) / (w / 2 - 14);
        const ey = (cy - h / 2) / (h / 2 - 14);
        // the cells run together in patches, parted by threads of open sky
        const patch = hash(Math.floor(cx / 34), Math.floor(cy / 26), seed);
        if (ex * ex + ey * ey > 0.8 + r() * 0.25 || patch < 0.22) continue;
        blobs.push([cx, cy, 7 + r() * 7]);
      }
    }
    return cloudSprite(w, h, blobs, CLOUD_TONES.layer);
  },
  wisp(r) {
    const w = 170;
    const h = 40;
    return anchored(sprite(w, h, (g) => {
      // a few long brushstrokes curving the same way, thinning to nothing at their tails
      for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
        const y0 = 8 + r() * 24;
        const x0 = r() * 40;
        const len = 70 + r() * 70;
        const bend = (r() - 0.5) * 14;
        for (let s = 0; s < len; s += 3) {
          const u = s / len;
          ellipse(g, x0 + s, y0 + Math.sin(u * Math.PI) * bend, 4 * (1 - u) + 1.5, u < 0.7 ? 1 : 0.5, '#ffffff');
        }
      }
    }, false), w, h);
  },
};

// Which cloud, if any, sits in grid cell (gx, gy) of a deck; `cover` is how thick the cloud is round it.
function deckCloud(deck, gx, gy, cover) {
  if (cover < deck.gap) return null;
  const k = (cover - deck.gap) / (1 - deck.gap);
  // sparse at the edge of a gap, packed close where it's thick
  if (hash(gx, gy, deck.seed) > 0.3 + k * 0.75) return null;
  const pick = hash(gx, gy, deck.seed + 40);
  const kind = deck.kinds(k, pick);
  const set = cloudKind(kind);
  return set[Math.floor(hash(gx, gy, deck.seed + 30) * set.length)];
}

// Decks: `P` is the parallax (under 1 is further off), `G` the grid each cloud sits in, `drift` px a second on
// the wind, and `gap` the cover under which this deck leaves the sky open.
const SKY_DECKS = {
  far: {
    P: 0.72, G: [104, 56], seed: 71, drift: CLOUD_DRIFT * 0.6, alpha: 0.5, gap: 0.3,
    kinds: (k, p) => (p < 0.45 ? 'sheet' : p < 0.85 || k < 0.4 ? 'puff' : 'heap'),
  },
  near: {
    P: 1, G: [128, 76], seed: 72, drift: CLOUD_DRIFT, alpha: 1, gap: SKY_GAP,
    kinds: (k, p) => (k < 0.22 ? 'puff'
      : k < 0.5 ? (p < 0.55 ? 'puff' : p < 0.85 ? 'heap' : 'sheet')
        : p < 0.06 + k * 0.08 ? 'tower' : p < 0.78 ? 'heap' : 'sheet'),
  },
  high: {
    P: 1.3, G: [240, 150], seed: 73, drift: CLOUD_DRIFT * 2.5, alpha: 0.38, gap: 0.62,
    kinds: () => 'wisp',
  },
  // thunderheads towering up out of the deck when it rains
  storm: {
    P: 1.06, G: [200, 150], seed: 74, drift: CLOUD_DRIFT * 1.4, alpha: 1, gap: 0.12,
    kinds: () => 'thunder',
  },
};

// The clouds of a deck in view, back to front: [img, screen x, screen y] at each one's base, and its grid cell.
function deckInView(deck, cx, cy) {
  const [GX, GY] = deck.G;
  const ox = cx * deck.P - time * deck.drift;
  const oy = cy * deck.P;
  // the far deck and the wisps take their gaps from their own stretch of sky, not the one at the dragon's height
  const off = deck === SKY_DECKS.near ? 0 : deck.seed * 977;
  const out = [];
  for (let gy = Math.floor((oy - 120) / GY); gy <= Math.floor((oy + viewH + 120) / GY); gy++) {
    for (let gx = Math.floor((ox - 140) / GX); gx <= Math.floor((ox + viewW + 140) / GX); gx++) {
      const lx = (gx + 0.15 + hash(gx, gy, deck.seed + 10) * 0.7) * GX;
      const ly = (gy + 0.15 + hash(gx, gy, deck.seed + 20) * 0.7) * GY;
      const img = deckCloud(deck, gx, gy, skyCover(lx + off, ly + off));
      if (!img) continue;
      const x = lx - ox;
      const y = ly - oy + Math.sin(time * 0.9 + gx * 1.7 + gy * 2.3) * 1.5;
      // the maze's corridors stay clear, so its banks read as walls
      if (deck.P < 1.1 && inMazeArea(x + cx, y + cy, img)) continue;
      out.push([img, x, y, gx, gy]);
    }
  }
  return out;
}

const inMazeArea = (x, y, img) => x + img.ox > SKY_X0 - 40 && x - img.ox < SKY_X0 + SKY_COLS * SKY_MAZE.cell + 40
  && y + img.oy > SKY_Y0 - 30 && y - img.oy < SKY_Y0 + SKY_ROWS * SKY_MAZE.cell + 30;

// How dark the cloud up here has grown with the rain falling out of it below, 0 to 1; and how stormy, for the
// lightning flickering in the thunderheads.
const skyRain = () => clamp01(weatherNow('rain') / WEATHER.rain.rain);
const skyThunder = () => clamp01((weatherNow('rain') - WEATHER.rain.rain) / (1 - WEATHER.rain.rain));

// A cloud dimmed to the slate of rain cloud, its shading kept.
const STORM_TINT = '#666d84';
function rainTwin(img) {
  if (img.rain) return img.rain;
  const c = makeCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = STORM_TINT;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(img, 0, 0);
  img.rain = c;
  return c;
}

// A deck of cloud, `dark` of the way to rain cloud.
function drawDeck(list, alpha, dark = 0) {
  for (const [img, x, y] of list) {
    const [ix, iy] = [Math.round(x - (img.ox ?? 0)), Math.round(y - (img.oy ?? 0))];
    if (dark < 1) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, ix, iy);
    }
    if (dark > 0) {
      ctx.globalAlpha = alpha * dark;
      ctx.drawImage(rainTwin(img), ix, iy);
    }
  }
  ctx.globalAlpha = 1;
}

// The pale blue haze over the world far below: thick under the cloud, thinner where it breaks open, so the land
// and sea show through the gaps.
const skyWash = makeCanvas(1, 1);
const WASH_STEP = 40;
function drawSkyWash(cx, cy) {
  if (skyWash.width !== viewW || skyWash.height !== viewH) {
    skyWash.width = viewW;
    skyWash.height = viewH;
  }
  const g = skyWash.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, viewW, viewH);
  const wet = skyRain();
  g.fillStyle = `rgba(${Math.round(164 - 82 * wet)},${Math.round(200 - 100 * wet)},${Math.round(240 - 110 * wet)},0.9)`;
  g.fillRect(0, 0, viewW, viewH);
  g.globalCompositeOperation = 'destination-out';
  const hole = blob(52, '0,0,0');
  const ox = cx - time * CLOUD_DRIFT;
  for (let y = Math.floor((cy - 52) / WASH_STEP) * WASH_STEP; y < cy + viewH + 52; y += WASH_STEP) {
    for (let x = Math.floor((ox - 52) / WASH_STEP) * WASH_STEP; x < ox + viewW + 52; x += WASH_STEP) {
      const open = Math.min(1, (SKY_GAP + 0.04 - skyCover(x, y)) / 0.14);
      if (open <= 0) continue;
      g.globalAlpha = open * 0.13;
      g.drawImage(hole, Math.round(x - ox - 52), Math.round(y - cy - 52));
    }
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(skyWash, 0, 0);
}

// Clouds at the dragon's height cast soft shadows down and away from the sun, on the haze and the far deck below.
const CLOUD_SHADOW = [16, 24];
function drawCloudShadows(list, alpha = 0.2) {
  ctx.globalAlpha = alpha;
  for (const [img, x, y] of list) {
    if (img.shadow) ctx.drawImage(img.shadow, Math.round(x - img.ox + CLOUD_SHADOW[0]), Math.round(y - img.oy + CLOUD_SHADOW[1]));
  }
  ctx.globalAlpha = 1;
}

function drawCloudSea(cx, cy) {
  const dy = skyDrift();
  const wet = skyRain();
  drawDeck(deckInView(SKY_DECKS.far, cx, cy + dy * 0.6), SKY_DECKS.far.alpha, wet);
  const near = deckInView(SKY_DECKS.near, cx, cy + dy);
  drawCloudShadows(near);
  drawDeck(near, SKY_DECKS.near.alpha, wet);
  if (!wet) return near;
  const heads = deckInView(SKY_DECKS.storm, cx, cy + dy * 1.1);
  drawCloudShadows(heads, 0.4 * wet);
  drawDeck(heads, wet);
  drawThunderLight(heads, wet);
  return near.concat(heads);
}

// Lightning in the thunderheads: in a storm each one flickers now and then from somewhere deep inside, and when
// thunder cracks the one nearest lights up bright with a bolt crawling out across its anvil.
const glowIn = makeCanvas(200, 160);
function drawThunderLight(heads, wet) {
  const storm = skyThunder() * wet;
  if (!storm || !heads.length) return;
  const near = weather.flash > 0 ? heads.reduce((a, b) => (Math.hypot(b[1] - viewW / 2, b[2] - viewH / 2) < Math.hypot(a[1] - viewW / 2, a[2] - viewH / 2) ? b : a)) : null;
  for (const head of heads) {
    const [img, x, y, gx, gy] = head;
    const beat = time * 1.5 + hash(gx, gy, 75) * 50;
    const slot = Math.floor(beat);
    const u = beat - slot;
    let glow = hash(gx, gy, slot) < 0.12 * storm ? Math.max(0, 1 - u * 4) * (0.55 + 0.45 * Math.sin(u * 90)) : 0;
    if (head === near) glow = Math.max(glow, weather.flash);
    if (glow <= 0.02) continue;
    const g = glowIn.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, glowIn.width, glowIn.height);
    const R = 50;
    const [lx, ly] = [img.ox + (hash(gx, gy, slot + 7) - 0.5) * 40, img.oy + (hash(gx, gy, slot + 8) - 0.5) * 28];
    g.drawImage(blob(R, '200,210,255'), Math.round(lx - R), Math.round(ly - R));
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6 * glow;
    ctx.drawImage(glowIn, Math.round(x - img.ox), Math.round(y - img.oy));
    if (head === near && weather.flash > 0.3) drawCrawler(x - img.ox + lx, y - img.oy + ly, weather.flash);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// A bolt of lightning forking out across the top of a cloud, the same shape for the whole of one flash.
function drawCrawler(x, y, k) {
  const rnd = mulberry32(Math.floor(weather.boltT * 1000));
  const fork = (x0, y0, ang, n, t) => {
    for (let i = 0; i < n; i++) {
      ang += (rnd() - 0.5) * 1.2;
      const len = 7 + rnd() * 10;
      const [x1, y1] = [x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len * 0.7];
      line(ctx, x0, y0, x1, y1, '#f2f4ff', t);
      if (rnd() < 0.3 && n > 2) fork(x1, y1, ang + (rnd() < 0.5 ? -0.9 : 0.9), Math.floor(n / 2), 1);
      [x0, y0] = [x1, y1];
    }
  };
  ctx.globalAlpha = k;
  const ang = rnd() * Math.PI * 2;
  fork(x, y, ang, 6, 2);
  fork(x, y, ang + Math.PI, 4, 1);
}

// The dragon's shadow is its own outline, wings beating, cast down and away from the sun like the clouds' own
// shadows. `SHADE_SUN` is how far off it falls at flying height.
const SHADE_SUN = [9, 13];
const SHADE_MID = [80, 70];
const shadeOutline = makeCanvas(160, 140);
const shadeOnCloud = makeCanvas(160, 140);

// The dragon's outline in `color` into shadeOutline, `far` times its size (what it falls on being further from
// the eye than the dragon) and lying flat, so a dragon pitched up or down casts a shorter shadow, not a tilted one.
function castOutline(far, color) {
  const look = flightLook(flight);
  const [, , rot] = loopPose(flight);
  const g = shadeOutline.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, shadeOutline.width, shadeOutline.height);
  g.translate(...SHADE_MID);
  if (rot) g.rotate(rot);
  const flat = Math.cos(look.pose?.pitch || 0);
  const side = NOSE_SIDE[look.face];
  g.scale(far * (side ? flat : 1), far * 0.9 * (side ? 1 : flat));
  paintFlight(g, look);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, shadeOutline.width, shadeOutline.height);
}

// Where the shadow's outline goes on screen: cast down and away from the sun, the further the higher it is.
function shadeAt(h, cx, cy) {
  const [ox] = loopPose(flight);
  return [Math.round(flight.x + ox - cx + SHADE_SUN[0] * h) - SHADE_MID[0], Math.round(flight.y - cy + SHADE_SUN[1] * h) - SHADE_MID[1]];
}

// The dragon's shadow on the ground: its outline right under it as it lifts off or touches down, sliding away,
// softening and paling as it climbs.
function drawGroundShade(cx, cy) {
  const k = shadowShown();
  if (!k) return;
  const h = clamp01(flight.alt / FLY_ALT);
  castOutline(0.98 - 0.1 * h, '#000');
  const m = shadeOnCloud.getContext('2d');
  m.globalCompositeOperation = 'source-over';
  m.clearRect(0, 0, shadeOnCloud.width, shadeOnCloud.height);
  m.filter = `blur(${0.3 + 0.9 * h}px)`;
  m.drawImage(shadeOutline, 0, 0);
  m.filter = 'none';
  ctx.globalAlpha = (0.3 - 0.1 * h) * k;
  ctx.drawImage(shadeOnCloud, ...shadeAt(h, cx, cy));
  ctx.globalAlpha = 1;
}

// The dragon's shadow on the cloud, sliding further off and paling as it climbs. It's crisp only where it lands
// on something, cloud tops or the isle (`under`: [img, screen x, screen y] at each one's corner); through a gap it
// falls on the world far below, where little more than a faint smudge of it is left.
function drawDragonShade(under, cx, cy) {
  const k = flight ? shadowShown() : 0;
  if (!k) return;
  const h = Math.max(0.3, flight.alt / FLY_ALT);
  const [x, y] = shadeAt(h, cx, cy);
  const [w, ht] = [shadeOutline.width, shadeOutline.height];
  castOutline(0.88, '#24305e');

  // just the part of it that falls on cloud
  const m = shadeOnCloud.getContext('2d');
  m.globalCompositeOperation = 'source-over';
  m.clearRect(0, 0, w, ht);
  for (const [img, ux, uy] of under) {
    const [dx, dy] = [ux - x, uy - y];
    if (dx < w && dy < ht && dx + img.width > 0 && dy + img.height > 0) m.drawImage(img, dx, dy);
  }
  m.globalCompositeOperation = 'source-in';
  m.filter = `blur(${Math.max(0.4, 0.6 + 0.8 * (h - 1))}px)`;
  m.drawImage(shadeOutline, 0, 0);
  m.filter = 'none';

  ctx.globalAlpha = 0.07 * k;
  ctx.drawImage(shadeOutline, x - 4, y - 3, w + 8, ht + 6);
  ctx.globalAlpha = 0.34 * k;
  ctx.drawImage(shadeOnCloud, x, y);
  ctx.globalAlpha = 1;
}

// The world as it was drawn before the cloud went over it, laid back on top to fade the cloud in or out.
const skyUnder = makeCanvas(1, 1);

function drawSkyLayer(cx, cy) {
  const k = skyFade();
  if (!k) return;
  if (k < 1) {
    if (skyUnder.width !== buffer.width || skyUnder.height !== buffer.height) {
      skyUnder.width = buffer.width;
      skyUnder.height = buffer.height;
    }
    const g = skyUnder.getContext('2d');
    g.clearRect(0, 0, skyUnder.width, skyUnder.height);
    g.drawImage(buffer, 0, 0);
  }
  drawSkyWash(cx, cy);
  const under = drawCloudSea(cx, cy).map(([img, x, y]) => [img, Math.round(x - img.ox), Math.round(y - img.oy)]);
  const w = SKY_COLS * SKY_MAZE.cell;
  const h = SKY_ROWS * SKY_MAZE.cell;
  if (SKY_X0 + w + 80 > cx && SKY_X0 - 80 < cx + viewW && SKY_Y0 + h + 160 > cy && SKY_Y0 - 120 < cy + viewH) {
    drawSkyIsle(cx, cy);
    under.push([isleSprite, Math.round(SKY_MID.x - 90 - cx), Math.round(SKY_MID.y + 28 - 50 - cy + isleBob())]);
  }
  drawDragonShade(under, cx, cy);
  if (k < 1) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1 - k;
    ctx.drawImage(skyUnder, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Wisps of cirrus high over the dragon, nearer the eye, sliding by faster than the deck below.
// Under a rainy sky the light up here goes dull and grey too.
function drawSkyHigh(cx, cy) {
  const k = skyFade();
  if (!k) return;
  const wet = skyRain();
  drawDeck(deckInView(SKY_DECKS.high, cx, cy + skyDrift() * 1.6), SKY_DECKS.high.alpha * k, wet * 0.6);
  if (wet) {
    ctx.fillStyle = `rgba(28,32,52,${0.16 * wet * k})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
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
