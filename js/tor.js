// Stormcrown Tor, far out east past the hermit's isle. A storm cloud of its own hangs over it, so it rains there far
// more often than anywhere else, and a skrill's egg lies on the barrow at the top that only shows while it does.
// No lava will crack it: lay metal on the ground on all four sides of the barrow while it rains, and the storm brings
// down a bolt that does. The watcher's fallen lookout says as much, and metal in the pack crackles in the rain.

// How the Tor's own rain looks and sounds where the player is, at its heaviest.
const TOR_SKY = { rain: 0.8, grey: 0.28, fog: 0, clouds: 1, wind: 0.7 };
// How long its wet and dry spells last, in seconds, and how long it takes to come on or clear.
const TOR_WET = [130, 220];
const TOR_DRY = [45, 80];
const TOR_FADE = 6;
const METALS = ['iron', 'gold', 'goblet', 'crown'];
// Metal counts for a side of the barrow from METAL_REACH[0] to [1] tiles out from its middle.
const METAL_REACH = [1.4, 5];
// The strike, in seconds from the fourth piece landing: sparks crawl over the metal, arcs join it in a ring and run
// in to the egg, the bolt falls, the shell cracks three times and the skrill climbs out.
const STRIKE = { arcs: 0.7, spokes: 2.1, bolt: 2.6, cracks: [2.6, 3.2, 3.8], hatch: 4.6 };
const tor = { wet: true, level: 1, left: 120, boltT: 6, strike: null, buzzT: 0 };
let torEgg = null;
let torLookout = null;
let torMid = null;

function initTor() {
  torEgg = eggs.find((e) => e.species === 'skrill');
  torLookout = objects.find((o) => o.key === 'lookout');
  torMid = { x: TOR_AT.x * TILE, y: TOR_AT.y * TILE };
  syncTorEgg(true);
}

// ---------- the Tor's own weather ----------

// How much of the Tor's weather reaches (x, y): all of it over the isle and its shallows, fading out to sea.
function torReach(x, y) {
  const t = isle('tor');
  const e = Math.hypot((x / TILE - t.x) / (t.rx + 8), (y / TILE - t.y) / (t.ry + 8));
  return Math.max(0, Math.min(1, (1.9 - e) / 0.9));
}

// How much of it is over the middle of the view.
const torSky = () => (!started || indoors ? 0 : torReach(cam.x + viewW / 2, cam.y + viewH / 2) * smooth(tor.level));

const torRaining = () => tor.level > 0.5 || ((weather.kind === 'rain' || weather.kind === 'storm') && weather.level > 0.5);

const onTor = () => {
  const t = isle('tor');
  return !indoors && Math.hypot((player.x / TILE - t.x) / (t.rx + 2), (player.y / TILE - t.y) / (t.ry + 2)) < 1;
};

const nearBarrow = (r = 16) => !indoors && Math.hypot(player.x - torMid.x, player.y - torMid.y) < r * TILE;

function updateTor(dt) {
  if (!torEgg) return;
  if ((tor.left -= dt) <= 0) {
    tor.wet = !tor.wet;
    const [a, b] = tor.wet ? TOR_WET : TOR_DRY;
    tor.left = a + Math.random() * (b - a);
  }
  tor.level = Math.max(0, Math.min(1, tor.level + (tor.wet ? dt : -dt) / TOR_FADE));
  if (!started) return;
  const near = torSky();
  // thunder rolling round the Tor while it rains
  if (near > 0.3 && tor.level > 0.7 && !tor.strike && (tor.boltT -= dt) <= 0) {
    tor.boltT = 6 + Math.random() * 10;
    weather.flash = Math.max(weather.flash, 0.45 * near);
    Sfx.thunder(0.6 * near, 0.4 + Math.random() * 1.2);
  }
  if (!stats.torLanded && onTor() && grounded() && !sail && !flight) stats.torLanded = 1;
  syncTorEgg();
  if (torEgg.state === 'wild' && !torEgg.hidden && !stats.torSeen && nearBarrow(8) && !sail && !flight) {
    stats.torSeen = 1;
    muse('Sparks on top of the barrow... there\'s an egg up there!');
  }
  updateStrike(dt);
  updateBuzz(dt);
}

// The egg is only there to see while it rains, or while the bolt is on its way.
function syncTorEgg(quiet = false) {
  if (!torEgg || torEgg.state !== 'wild') return;
  const up = torRaining() || !!tor.strike;
  if (up === !torEgg.hidden) return;
  torEgg.hidden = !up;
  torEgg.col.off = !up;
  if (quiet || !started || !nearBarrow()) return;
  if (up) {
    Sfx.zap(0.6);
    burst(torEgg.x, torEgg.y - 8, ['#e6f6ff', '#9fdcff', '#3a3f66'], 16, 50);
  } else if (stats.torSeen) muse('The rain\'s easing off... and the egg fades into the turf with it. It only shows in the storm.');
}

// ---------- the metal and the strike ----------

// The nearest piece of metal lying on each side of the barrow (east, south, west, north), or null unless all four have one.
function metalRing() {
  const sides = [null, null, null, null];
  const dist = [Infinity, Infinity, Infinity, Infinity];
  for (const d of drops) {
    if (!METALS.includes(d.item) || d.z > 0 || d.fuel || d.thrown) continue;
    const dx = (d.x - torMid.x) / TILE;
    const dy = ((d.y - torMid.y) / TILE) * 1.3;
    const r = Math.hypot(dx, dy);
    if (r < METAL_REACH[0] || r > METAL_REACH[1]) continue;
    const side = Math.round(Math.atan2(dy, dx) / (Math.PI / 2)) & 3;
    if (r < dist[side]) {
      dist[side] = r;
      sides[side] = d;
    }
  }
  return sides.every(Boolean) ? sides : null;
}

function updateStrike(dt) {
  if (!tor.strike) {
    if (torEgg.state !== 'wild' || torEgg.hidden || !nearBarrow(18) || sail || flight) return;
    const ring = metalRing();
    if (ring) startStrike(ring);
    return;
  }
  const s = tor.strike;
  const was = s.t;
  s.t += dt;
  const at = (k) => was < k && s.t >= k;
  if (s.t < STRIKE.bolt && Math.random() < dt * (12 + s.t * 14)) {
    const p = s.ring[Math.floor(Math.random() * 4)];
    particles.push({ type: 'spark', layer: 'sky', x: p.x + (Math.random() - 0.5) * 6, y: p.y - 3, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, c: '#ffffff', c2: '#7fd8ff', life: 0, max: 0.35 });
    if (Math.random() < 0.25) Sfx.zap(0.3 + s.t * 0.15);
  }
  if (at(STRIKE.arcs)) Sfx.zap(0.8);
  if (at(STRIKE.spokes)) Sfx.zap(1);
  if (at(STRIKE.bolt)) boltFalls();
  STRIKE.cracks.forEach((k, i) => {
    if (!at(k)) return;
    torEgg.crack = i + 1;
    burst(torEgg.x, torEgg.y - 10, ['#ffe9a8', '#ffffff', '#9fdcff'], 8, 30);
    Sfx.crack();
  });
  if (at(STRIKE.hatch)) {
    tor.strike = null;
    hatch(torEgg);
  }
}

function startStrike(ring) {
  tor.strike = { t: 0, ring: ring.map((d) => ({ x: d.x, y: d.y })), seed: 0, pts: null };
  Sfx.zap(0.6);
}

function boltFalls() {
  weather.flash = 1;
  Sfx.strike();
  const { x, y } = torEgg;
  burst(x, y - 6, ['#ffffff', '#e6f6ff', '#7fd8ff', '#3f7fff'], 34, 110);
  for (let i = 0; i < 4; i++) particles.push({ type: 'smoke', x: x + (i - 1.5) * 8, y: y - 6, vx: (i - 1.5) * 6, vy: -18, life: 0, max: 1.6 });
  addMark('scorch', x, y - 2, 16);
  // anyone standing right by the egg is thrown clear
  const dx = player.x - x;
  const dy = player.y - y;
  const d = Math.hypot(dx, dy);
  if (d < 26 && grounded() && !hop) {
    const k = (28 - d) / Math.max(1, d);
    const to = standSpotNear(player, player.x + dx * k, player.y + dy * k);
    Object.assign(player, to);
    muse('Whoa!');
  }
}

// ---------- the hints ----------

// Metal in the pack crackles in the Tor's rain, and the first time near the barrow the player notices why.
function updateBuzz(dt) {
  if (torEgg.state !== 'wild' || !torRaining() || !onTor() || sail || flight || tor.strike) return;
  const metal = METALS.find(has);
  if (!metal || (tor.buzzT -= dt) > 0) return;
  tor.buzzT = 0.15 + Math.random() * 0.4;
  const back = player.dir === 'left' ? 3 : player.dir === 'right' ? -3 : 0;
  particles.push({
    type: 'spark', layer: 'sky', x: player.x + back + (Math.random() - 0.5) * 8, y: player.y - 9 - Math.random() * 6,
    vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, c: '#e6f6ff', c2: '#7fd8ff', life: 0, max: 0.3,
  });
  if (Math.random() < 0.3) Sfx.zap(0.2);
  if (!stats.torBuzz && nearBarrow(10)) {
    stats.torBuzz = 1;
    muse(`My pack's crackling... it's the ${ITEMS[metal].name.toLowerCase()} in it! The storm wants metal.`);
  }
}

const TOUCH_LINES = [
  'Ow! It snapped a spark at me. Hard as stone, too. It\'ll take a far bigger jolt than that to crack it.',
  'It hums like a struck bell. Somewhere up in that cloud is a jolt big enough to crack it.',
];

const nearTorEgg = () => (torEgg && torEgg.state === 'wild' && !torEgg.hidden && !carrying() && grounded() && !sail && !flight && boxDist(torEgg.col) < 14 ? torEgg : null);

function touchTorEgg() {
  faceToward(player, torEgg.x - player.x, torEgg.y - player.y);
  Sfx.zap(0.7);
  burst(torEgg.x, torEgg.y - 8, ['#ffffff', '#9fdcff'], 10, 40);
  muse(tor.strike ? 'Better stand back!' : TOUCH_LINES[stats.torTouch++ % TOUCH_LINES.length]);
}

const nearLookout = () => (torLookout && !indoors && !sail && !flight && grounded() && boxDist(torLookout.col) < 12 ? torLookout : null);

function readLookout() {
  faceToward(player, torLookout.x - player.x, torLookout.y - player.y);
  muse('Scratched into the post: "The sky strikes iron. Lay it round the hill, all four ways, and the hammer falls."');
}

// ---------- drawing ----------

// The cloud's shadow lying over the Tor, darker while it rains, and the sky closing in as a strike gathers.
function drawTorCloud(cx, cy) {
  const t = isle('tor');
  const X = t.x * TILE;
  const Y = t.y * TILE;
  if (!indoors && onScreen(X, Y, cx, cy, t.rx * TILE + 200)) {
    const img = blob(110, '18,22,34');
    ctx.globalAlpha = 0.08 + 0.1 * tor.level;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + time * 0.01;
      const x = X + Math.cos(a) * t.rx * TILE * 0.6 + Math.sin(time * 0.05 + i) * 24;
      const y = Y + Math.sin(a) * t.ry * TILE * 0.6;
      ctx.drawImage(img, Math.round(x - cx - 110), Math.round(y - cy - 110));
    }
    ctx.globalAlpha = 1;
  }
  const s = tor.strike;
  if (!s) return;
  const k = s.t < STRIKE.bolt ? s.t / STRIKE.bolt : Math.max(0, 1 - (s.t - STRIKE.bolt) / 1.5);
  ctx.fillStyle = `rgba(10,14,30,${0.4 * k})`;
  ctx.fillRect(0, 0, viewW, viewH);
}

// A jagged path from (x0, y0) to (x1, y1) in `n` steps, each knocked up to `wob` pixels sideways.
function jag(x0, y0, x1, y1, n, wob) {
  const pts = [[x0, y0]];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const w = (Math.random() - 0.5) * 2 * wob;
    pts.push([x0 + (x1 - x0) * u + nx * w, y0 + (y1 - y0) * u + ny * w]);
  }
  pts.push([x1, y1]);
  return pts;
}

function strokeJag(pts, cx, cy, bright = 1) {
  for (const [w, c, a] of [[3, '#5fb8ff', 0.35], [2, '#cfeaff', 0.8], [1, '#ffffff', 1]]) {
    ctx.globalAlpha = a * bright;
    for (let i = 0; i + 1 < pts.length; i++) line(ctx, pts[i][0] - cx, pts[i][1] - cy, pts[i + 1][0] - cx, pts[i + 1][1] - cy, c, w);
  }
  ctx.globalAlpha = 1;
}

// Arcs running piece to piece round the ring, then in from each to the egg; then the bolt itself.
function drawTorBolts(cx, cy) {
  const s = tor.strike;
  if (!s || indoors) return;
  const { ring } = s;
  const ex = torEgg.x;
  const ey = torEgg.y - 6;
  if (s.t >= STRIKE.arcs && s.t < STRIKE.bolt) {
    const k = Math.min(1, (s.t - STRIKE.arcs) / (STRIKE.spokes - STRIKE.arcs));
    for (let i = 0; i < 4; i++) {
      if (Math.random() > 0.35 + k * 0.6) continue;
      const a = ring[i];
      const b = ring[(i + 1) % 4];
      strokeJag(jag(a.x, a.y - 2, b.x, b.y - 2, 9, 7), cx, cy, 0.5 + k * 0.5);
    }
    if (s.t >= STRIKE.spokes) for (const p of ring) if (Math.random() < 0.7) strokeJag(jag(p.x, p.y - 2, ex, ey, 5, 5), cx, cy);
  }
  const u = s.t - STRIKE.bolt;
  if (u < 0 || u > 0.8) return;
  // the bolt flickers: a first stroke, then two return strokes down the same channel
  if ((s.seed += 1) % 3 === 0 || !s.pts) {
    const top = cy - 30;
    s.pts = jag(ex + (Math.random() - 0.5) * 30, top, ex, ey, Math.max(6, Math.round((ey - top) / 14)), 10);
    s.forks = [0, 1].map(() => {
      const from = s.pts[2 + Math.floor(Math.random() * (s.pts.length - 4))];
      return jag(from[0], from[1], from[0] + (Math.random() - 0.5) * 70, from[1] + 30 + Math.random() * 40, 5, 6);
    });
  }
  const on = u < 0.14 || (u > 0.24 && u < 0.32) || (u > 0.42 && u < 0.5);
  const bright = on ? 1 : 0.25 * (1 - u / 0.8);
  strokeJag(s.pts, cx, cy, bright);
  for (const f of s.forks) strokeJag(f, cx, cy, bright * 0.6);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = bright;
  ctx.drawImage(glowSprite(48, '#9fdcff'), Math.round(ex - 48 - cx), Math.round(ey - 48 - cy));
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
