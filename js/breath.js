// ---------- dragon breath ----------

// Every kind of dragon breathes its own element. Plasma blasts things apart and its beam cuts clean through
// everything in its line, toppling trees whole and leaving nothing burning. Fire sets things alight, roasts what it
// catches and boils fish up out of the sea, and its beam fans out wide, starting grass fires that creep on from
// where it lands. Frost turns the ground to ice for a while, snows over trees, freezes animals and puts fires
// out, the Thunderdrum's roar is a wall of sound that knocks things flat and shakes the fruit off trees, and the
// Skrill's lightning strikes the moment it's breathed, setting trees alight and blasting the rest. The Tide Glider's
// water puts fires out, cools lava to a crust, washes the snow off trees and bowls animals over, and its beam is a
// long jet like a fire-hose's. Bred dragons inherit theirs as a gene (see genes.js).
const ELEMENT_OF = { nightFury: 'plasma', lightFury: 'frost', thunderdrum: 'sonic', terribleTerror: 'fire', skrill: 'lightning', tideGlider: 'water' };

// `reach`, `speed` and `size` scale the fireball, and `radius` is how far its blast reaches. A beam runs out to
// `len`, strikes the ground every `step` along its sweep from `tilt[0]` to `tilt[1]` radians below level over
// `time`, and is drawn `width` times as thick as a plasma beam. A beam with a `fan` spreads that far either side
// by the time it's `len` out.
const BREATHS = {
  plasma: { reach: 1, speed: 1, size: 1, radius: 28, beam: { len: 300, step: 20, time: 1.1, tilt: [0.7, -0.2], width: 1 } },
  fire: { reach: 0.75, speed: 0.85, size: 1.2, radius: 24, beam: { len: 210, step: 14, time: 1, tilt: [0.85, -0.1], width: 1.6, fan: 30 } },
  frost: { reach: 1.25, speed: 1.3, size: 0.85, radius: 22, beam: { len: 380, step: 14, time: 1.3, tilt: [0.6, -0.15], width: 0.7 } },
  sonic: { reach: 1, speed: 1.15, size: 1.1, radius: 34, beam: { len: 260, step: 24, time: 0.9, tilt: [0.75, -0.2], width: 2.2 } },
  water: { reach: 1.1, speed: 1.05, size: 1.1, radius: 28, beam: { len: 320, step: 16, time: 1.2, tilt: [0.7, -0.15], width: 1.2 } },
  // no beam: a tap strikes `bolt.tap` ahead, nearer to farther with the charge; let go at the full, the storm's
  // ring spans from halfway to the farthest tap, `bolt.lift` up the screen, striking up to `bolt.targets` things
  // in it and `bolt.strikes` more round it.
  lightning: { reach: 1, speed: 1, size: 1, radius: 26, bolt: { tap: [90, 290], lift: 20, targets: 10, strikes: 8 } },
};

const breathOf = (species) => ELEMENT_OF[species] || traitsOf(genesOf(species)).breath;

// Holding F gathers the breath: the longer the hold, the bigger, faster and farther the fireball. Held to the
// full, it comes out as a straight beam instead, aimed down at the ground ahead and tilting up as it goes, so it
// rakes forward across the ground until it lifts clear into the sky.
const CHARGE_TIME = 1.2;
const BEAM_REACH = 0.1;
const BEAM_FADE = 0.15;
const FROZEN_TIME = 4;
const ICE_TIME = 25;
const SNOWY_TIME = 30;
const beams = [];

const canBreathe = (f) => f && f.mode === 'fly' && f.loop < 0;

function chargeBreath() {
  const f = flight;
  if (!canBreathe(f) || f.fireCd > 0) return;
  f.charge = 0;
  f.chargeStep = 0;
}

function releaseBreath() {
  const f = flight;
  if (!f || f.charge == null) return;
  const c = f.charge;
  f.charge = null;
  if (BREATH === 'lightning') boltBreath(f, c);
  else if (c >= 1) beamBreath(f);
  else breatheFire(f, c);
}

// The mouth as a ground point and a height above it.
function mouthAt(f, face) {
  const [mx, my, mh] = MOUTH[face];
  return [f.x + mx, f.y + my, f.alt + flightBob(f) + mh];
}

function breatheFire(f, c) {
  const e = BREATHS[BREATH];
  f.fireCd = 0.35;
  const face = f.face || f.dir;
  const [dx, dy] = FACE_VEC[face];
  const [x0, y0, h0] = mouthAt(f, face);
  const reach = (120 + 170 * c) * e.reach;
  const dur = ((0.5 - 0.12 * c) * e.reach) / e.speed;
  fireballs.push({
    x0, y0, h0, x1: x0 + dx * reach + f.vx * dur, y1: y0 + dy * reach + f.vy * dur,
    x: x0, y: y0, h: 0, t: 0, dur, size: (1 + 0.7 * c) * e.size, el: BREATH, pal: PLASMA,
  });
  Sfx.breath(BREATH);
}

function beamBreath(f) {
  f.fireCd = BREATHS[BREATH].beam.time + 0.4;
  const face = f.face || f.dir;
  beams.push({ face, dir: FACE_VEC[face], t: 0, hit: null, last: null, pal: PLASMA, el: BREATH });
  Sfx.beam(BREATH);
}

// ---------- lightning ----------

// Lightning has no ball to fly: a bolt cracks from the mouth to where a fireball would have landed, and strikes
// there at once. Let go at the full charge, it calls down a storm instead (see stormBolt).
const BOLT_TIME = 0.35;
const STORM_TIME = 0.7;
const bolts = [];

function boltBreath(f, c) {
  if (c >= 1) return stormBolt(f);
  f.fireCd = 0.35;
  const face = f.face || f.dir;
  const [dx, dy] = FACE_VEC[face];
  const [x0, y0, h0] = mouthAt(f, face);
  const [near, far] = BREATHS.lightning.bolt.tap;
  const reach = near + (far - near) * c;
  strikeBolt({ x0, y0, h0, face }, x0 + dx * reach, y0 + dy * reach, PLASMA, true);
  Sfx.zap(1.4);
}

// The storm: a great bolt three quarters of the way to the full reach, and a ring of lightning round it from
// halfway out to the farthest point. Everything inside is struck: bolts fork out from the middle to whatever stands in the ring, and to
// `bolt.strikes` points spread evenly round it.
function stormBolt(f) {
  const B = BREATHS.lightning.bolt;
  f.fireCd = 0.9;
  const face = f.face || f.dir;
  const [dx, dy] = FACE_VEC[face];
  const [x0, y0, h0] = mouthAt(f, face);
  const far = B.tap[1];
  const r = far / 4;
  const x = x0 + dx * (far - r);
  const y = y0 + dy * (far - r) - B.lift;
  shockWater(x, y, SHOCK_REACH, r);
  const main = strikeBolt({ x0, y0, h0, face }, x, y, PLASMA, true, 1.6);
  main.ring = r;
  main.life = STORM_TIME;
  const turn = Math.random() * Math.PI * 2;
  const spread = Array.from({ length: B.strikes }, (_, i) => {
    const a = turn + (i / B.strikes) * Math.PI * 2;
    return { x: x + Math.cos(a) * r * 0.7, y: y + Math.sin(a) * r * 0.7 };
  });
  const inside = [...prey().filter((a) => alive(a)), ...hittables.filter((o) => kindOf(o))]
    .filter((o) => Math.hypot(o.x - x, o.y - y) < r)
    .slice(0, B.targets);
  for (const to of [...inside, ...spread]) {
    main.forks.push([to.x, to.y]);
    breathHit(to.x, to.y, 'lightning', PLASMA, false);
  }
  for (const a of prey()) if (alive(a) && huntable(a) && Math.hypot(a.x - x, a.y - y) < r) hurtAnimal(a, 99);
  for (let i = 0; i < 2; i++) particles.push({ type: 'ring', layer: 'water', x, y, vx: 0, vy: 0, r: r * 0.4, grow: r * 1.4, flat: 1, pal: [PLASMA[0]], life: -i * 0.12, max: 0.5 });
  weather.flash = Math.max(weather.flash, 0.7);
  Sfx.strike(0.7);
}

// `from` is the mouth: on the ridden dragon it follows the dragon for as long as the bolt shows.
function strikeBolt(from, x, y, pal, big, width = 1, hunt = false) {
  const b = { from, x, y, pal, t: 0, width, pts: null, forks: [] };
  bolts.push(b);
  if (hunt) huntBlast(x, y);
  breathHit(x, y, 'lightning', pal, big);
  return b;
}

function boltStart(b) {
  if (b.from.face && flight) return mouthAt(flight, b.from.face);
  return [b.from.x0, b.from.y0, b.from.h0];
}

function sparksAt(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 40 + Math.random() * 70;
    particles.push({ type: 'spark', layer: 'sky', x, y: y - 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 30, c: '#ffffff', c2: PLASMA[0], life: 0, max: 0.3 + Math.random() * 0.25 });
  }
}

function updateBolts(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.t += dt;
    if (b.t >= (b.life || BOLT_TIME)) bolts.splice(i, 1);
  }
  updateShocks(dt);
}

// Lightning in the water doesn't stop where it lands: it jumps tile to tile out across the water round it, up to
// `reach` tiles away, reaching each SHOCK_STEP after the one before and crackling there for SHOCK_SHOW. Any school
// of fish it reaches is stunned and floats up. A storm lights all the water within `area` px of where it lands the
// moment it hits, and the shock runs on `reach` tiles past that. A strike landing in water a shock has only just
// lit is part of that shock.
const SHOCK_REACH = 4;
const SHOCK_STEP = 0.06;
const SHOCK_SHOW = 0.3;
const shocks = [];

function shockWater(x, y, reach, area = 0) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor((y - 1) / TILE);
  const key = (a, b) => b * MAP_W + a;
  if (shocks.some((s) => s.t === 0 && s.seen.has(key(tx, ty)))) return;
  const seen = new Map();
  const a = Math.ceil(area / TILE);
  for (let j = -a; j <= a; j++) {
    for (let i = -a; i <= a; i++) {
      if (Math.hypot(i, j) * TILE > area || !inBounds(tx + i, ty + j) || !isWet(tileAt(tx + i, ty + j))) continue;
      seen.set(key(tx + i, ty + j), { tx: tx + i, ty: ty + j, d: 0, from: null });
    }
  }
  if (!seen.size) return;
  const queue = [...seen.values()];
  const max = area / TILE + reach;
  while (queue.length) {
    const t = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = t.tx + dx;
      const ny = t.ty + dy;
      if (seen.has(key(nx, ny)) || Math.hypot(nx - tx, ny - ty) > max || !inBounds(nx, ny) || !isWet(tileAt(nx, ny))) continue;
      const n = { tx: nx, ty: ny, d: t.d + 1, from: t };
      seen.set(key(nx, ny), n);
      queue.push(n);
    }
  }
  const tiles = [...seen.values()];
  const schools = seaLife.schools
    .map((s) => ({ s, at: seen.get(key(Math.floor(s.x / TILE), Math.floor(s.y / TILE))) }))
    .filter((o) => o.at && o.s.fish.length);
  shocks.push({ tiles, seen, schools, t: 0, end: Math.max(...tiles.map((t) => t.d)) * SHOCK_STEP + SHOCK_SHOW });
  Sfx.sizzle((area ? 2.5 : 1.5) * earshot(x, y));
}

function updateShocks(dt) {
  for (let i = shocks.length - 1; i >= 0; i--) {
    const s = shocks[i];
    s.t += dt;
    for (const o of s.schools) {
      if (o.done || s.t < o.at.d * SHOCK_STEP) continue;
      o.done = true;
      stunSchool(o.s);
    }
    const live = s.tiles.filter((t) => s.t >= t.d * SHOCK_STEP && s.t < t.d * SHOCK_STEP + SHOCK_SHOW);
    if (live.length && Math.random() < dt * 30) {
      const t = live[Math.floor(Math.random() * live.length)];
      particles.push({ type: 'spark', layer: 'sky', x: (t.tx + Math.random()) * TILE, y: (t.ty + Math.random()) * TILE, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, c: '#ffffff', c2: '#7fd8ff', life: 0, max: 0.25 });
    }
    if (s.t >= s.end) shocks.splice(i, 1);
  }
}

// Each tile glows as the shock reaches it, with an arc jumping across from the tile it came from.
function drawShocks(cx, cy) {
  const mid = (t) => [(t.tx + 0.5) * TILE, (t.ty + 0.5) * TILE];
  for (const s of shocks) {
    for (const t of s.tiles) {
      const u = (s.t - t.d * SHOCK_STEP) / SHOCK_SHOW;
      if (u < 0 || u >= 1) continue;
      const bright = 1 - u;
      const [x, y] = mid(t);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * bright;
      ellipse(ctx, Math.round(x - cx), Math.round(y - cy), 8, 5, '#3f7fff');
      ctx.globalCompositeOperation = 'source-over';
      if (t.from && Math.random() < 0.8) {
        const [fx, fy] = mid(t.from);
        strokeJag(jag(fx, fy, x, y, 3, 4), cx, cy, bright * 0.8);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// The beam stays fixed to the mouth and keeps its heading while it lasts, shooting out to full length in BEAM_REACH.
// Where it's long enough to reach the ground it stops there, `reach` along the ground from the mouth.
function beamPath(b) {
  const B = BREATHS[b.el].beam;
  const [x0, y0, h0] = mouthAt(flight, b.face);
  const [dx, dy] = b.dir;
  const tilt = B.tilt[0] + (B.tilt[1] - B.tilt[0]) * Math.min(1, b.t / B.time);
  const drop = Math.sin(tilt);
  let len = B.len * Math.min(1, b.t / BEAM_REACH);
  const ground = drop > 0 && len * drop >= h0;
  if (ground) len = h0 / drop;
  const reach = len * Math.cos(tilt);
  return { x0, y0, h0, x1: x0 + dx * reach, y1: y0 + dy * reach, h1: ground ? 0 : h0 - len * drop, ground, reach };
}

// A full blast where the beam first strikes and where it lifts off, and a lesser one every step between, with more
// either side as a fanning beam widens.
function beamStep(b, B, p, at) {
  const [dx, dy] = b.dir;
  const x = p.x0 + dx * at;
  const y = p.y0 + dy * at;
  breathHit(x, y, b.el, b.pal, false, true);
  const w = (B.fan || 0) * Math.min(1, at / B.len);
  if (w < 8) return;
  const u = Math.hypot(dx, dy);
  for (const s of [-1, 1]) breathHit(x - (dy / u) * w * s, y + (dx / u) * w * s, b.el, b.pal, false, true);
}

function updateBeams(dt) {
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    const B = BREATHS[b.el].beam;
    b.t += dt;
    const done = !flight || b.t >= B.time;
    const p = !done && beamPath(b);
    if (p && p.ground) {
      if (b.hit == null) {
        breathHit(p.x1, p.y1, b.el, b.pal, true, true);
        b.hit = p.reach + B.step;
      }
      for (; b.hit <= p.reach; b.hit += B.step) beamStep(b, B, p, b.hit);
      b.last = [p.x1, p.y1];
    } else if (b.last) {
      breathHit(b.last[0], b.last[1], b.el, b.pal, true, true);
      b.last = null;
    }
    if (done) {
      beams.splice(i, 1);
      continue;
    }
    for (let k = 0; k < 4; k++) {
      const u = Math.random();
      trail(b.el, b.pal, p.x0 + (p.x1 - p.x0) * u, p.y0 + (p.y1 - p.y0) * u - (p.h0 + (p.h1 - p.h0) * u), 6 * B.width + (B.fan || 0) * u);
    }
  }
}

function trail(el, pal, x, y, spread) {
  x += (Math.random() - 0.5) * spread;
  y += (Math.random() - 0.5) * spread;
  if (el === 'fire') {
    if (Math.random() < 0.7) particles.push({ type: 'ember', layer: 'sky', x, y, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, life: 0, max: 0.4 + Math.random() * 0.3 });
    else particles.push({ type: 'smoke', layer: 'sky', x, y, vx: (Math.random() - 0.5) * 6, vy: -16, life: 0, max: 0.9 });
  } else if (el === 'frost') {
    particles.push({ type: 'flake', layer: 'sky', x, y, vx: (Math.random() - 0.5) * 10, vy: 6 + Math.random() * 10, pal, life: 0, max: 0.6 + Math.random() * 0.4 });
  } else if (el === 'sonic') {
    if (Math.random() < 0.35) particles.push({ type: 'ring', layer: 'sky', x, y, vx: 0, vy: 0, r: 2, grow: 12, flat: 1, pal, life: 0, max: 0.35 });
  } else if (el === 'water') {
    if (Math.random() < 0.6) particles.push({ type: 'drop', layer: 'sky', big: true, x, y, vx: (Math.random() - 0.5) * 24, vy: -10 - Math.random() * 20, life: 0, max: 0.35 + Math.random() * 0.2 });
    else particles.push({ type: 'plasma', layer: 'sky', x, y, vx: (Math.random() - 0.5) * 16, vy: 4 + Math.random() * 10, pal, life: 0, max: 0.3 });
  } else {
    particles.push({ type: 'plasma', layer: 'sky', x, y, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, pal, life: 0, max: 0.3 + Math.random() * 0.2 });
  }
}

// Breath gathers at the mouth in three steps, each with a rising note.
function updateCharge(f, dt) {
  if (!canBreathe(f) || !keys.has('KeyF')) {
    f.charge = null;
    return;
  }
  f.charge = Math.min(1, f.charge + dt / CHARGE_TIME);
  const step = Math.floor(f.charge * 3);
  const [x, y, h] = mouthAt(f, f.face || f.dir);
  if (step > f.chargeStep) {
    f.chargeStep = step;
    Sfx.charge(step);
    if (step === 3) burst(x, y - h, PLASMA, 14, 50);
  }
  if (Math.random() < dt * (20 + 40 * f.charge)) {
    const a = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 10;
    const life = 0.25;
    const p = { x: x + Math.cos(a) * r, y: y - h + Math.sin(a) * r, vx: f.vx - (Math.cos(a) * r) / life, vy: f.vy - (Math.sin(a) * r) / life, life: 0, max: life };
    if (BREATH === 'lightning') particles.push({ ...p, type: 'spark', layer: 'sky', c: '#ffffff', c2: PLASMA[0] });
    else particles.push({ ...p, type: 'plasma', layer: 'sky', pal: PLASMA });
  }
}

function updateFireballs(dt) {
  updateBeams(dt);
  updateBolts(dt);
  updateMarks(dt);
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const b = fireballs[i];
    b.t += dt;
    const u = Math.min(1, b.t / b.dur);
    b.x = b.x0 + (b.x1 - b.x0) * u;
    b.y = b.y0 + (b.y1 - b.y0) * u;
    b.h = b.h0 * (1 - u * u);
    for (let k = 0; k < 3; k++) trail(b.el || 'plasma', b.pal || PLASMA, b.x, b.y - b.h, 7);
    if (u < 1) continue;
    fireballs.splice(i, 1);
    if (b.hunt) huntBlast(b.x, b.y);
    breathHit(b.x, b.y, b.el || 'plasma', b.pal || PLASMA, true);
  }
}

// ---------- what the breath does where it lands ----------

const tileUnder = (x, y) => tileAt(Math.floor(x / TILE), Math.floor((y - 1) / TILE));

// `big` for a fireball, or where a beam strikes and lifts off; the beam's steps in between are lesser hits.
function breathHit(x, y, el, pal, big, beam = false) {
  const tile = tileUnder(x, y);
  const near = earshot(x, y);
  particles.push({ type: 'flash', layer: 'sky', x, y: y - 4, vx: 0, vy: 0, c: pal[0], life: 0, max: big ? 0.3 : 0.2 });
  if (isWet(tile)) {
    hitWater(x, y, el, big, near, beam);
  } else {
    hitGround(x, y, el, pal, big, tile, beam);
    affect(x, y, el, BREATHS[el].radius * (big ? 1 : 0.7), beam);
  }
  if (!big) return;
  for (const n of npcs) {
    if (Math.hypot(n.x - x, n.y - y) > 60) continue;
    n.emote = 'exclaim';
    n.emoteT = 1.8;
    faceToward(n, x - n.x, y - n.y);
  }
  Sfx.impact(el, near);
}

// A frost beam lays a broad road of ice across the sea, wide enough to land a dragon on, and keeps widening it
// as it sweeps on over the ice it has made.
function frostRadius(x, y, big, beam) {
  const sea = isWet(tileUnder(x, y)) || iced.get(Math.floor((y - 1) / TILE) * MAP_W + Math.floor(x / TILE))?.was === T.WATER;
  if (beam && sea) return big ? 44 : 34;
  return big ? 24 : 15;
}

function hitWater(x, y, el, big, near, beam) {
  if (el === 'frost') {
    freezeGround(x, y, frostRadius(x, y, big, beam));
    for (let i = 0; i < (big ? 8 : 2); i++) particles.push({ type: 'chip', x, y: y - 2, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, c: [PAL.iceLight, '#ffffff'][i % 2], life: 0, max: 0.4 });
    return;
  }
  if (el === 'lightning') {
    seaSplash(x, y - 2, big ? 1 : 0.5);
    sparksAt(x, y, big ? 16 : 6);
    for (let i = 0; i < (big ? 2 : 1); i++) particles.push({ type: 'ring', layer: 'water', x, y, vx: 0, vy: 0, r: 3, grow: big ? 40 : 22, flat: 0.45, pal: [PLASMA[0]], life: -i * 0.08, max: 0.4 });
    shockWater(x, y, big ? SHOCK_REACH : SHOCK_REACH / 2);
    return;
  }
  if (el === 'water') {
    seaSplash(x, y - 2, big ? 1.8 : 0.8);
    if (big) splash(x, y);
    particles.push({ type: 'ring', layer: 'water', x, y, vx: 0, vy: 0, r: 3, grow: big ? 26 : 14, flat: 0.45, pal: [PAL.foam], life: 0, max: 0.5 });
    if (big) Sfx.splash(near);
    return;
  }
  if (el === 'sonic') {
    seaSplash(x, y - 2, big ? 2.2 : 1);
    if (big) splash(x, y);
    for (let i = 0; i < (big ? 3 : 1); i++) particles.push({ type: 'ring', layer: 'water', x, y, vx: 0, vy: 0, r: 4, grow: 30, flat: 0.45, pal: [PAL.foam], life: -i * 0.12, max: 0.6 });
    if (big) Sfx.splash(near);
    return;
  }
  // plasma and fire boil it off in a gout of steam, and fire cooks any fish swimming there
  if (el === 'fire') for (const s of seaLife.schools) if (Math.hypot(s.x - x, s.y - y) < (big ? 36 : 26)) stunSchool(s, true);
  seaSplash(x, y - 2, big ? 1.4 : 0.6);
  if (big) splash(x, y);
  const n = el === 'fire' ? (big ? 10 : 3) : big ? 6 : 1;
  for (let i = 0; i < n; i++) particles.push({ type: 'steam', x: x + (Math.random() - 0.5) * 12, y: y - 4, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 12, life: 0, max: 1 + Math.random() * 0.6 });
  if (big) {
    Sfx.splash(0.8 * near);
    Sfx.hiss(near);
  }
}

function hitGround(x, y, el, pal, big, tile, beam) {
  const steam = (n) => {
    for (let i = 0; i < n; i++) particles.push({ type: 'steam', x: x + (Math.random() - 0.5) * 12, y: y - 4, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, life: 0, max: 1.2 });
  };
  if (tile === T.LAVA) {
    if (el === 'frost' || el === 'water') {
      addMark('crust', x, y, big ? 14 : 9);
      steam(big ? 8 : 2);
      if (big) Sfx.hiss(earshot(x, y));
    } else {
      for (let i = 0; i < (big ? 14 : 4); i++) particles.push({ type: 'ember', layer: 'sky', x, y: y - 2, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, life: 0, max: 0.6 + Math.random() * 0.4 });
    }
    return;
  }
  const cold = tile === T.SNOW || tile === T.ICE;
  if (el === 'water') {
    for (let i = 0; i < (big ? 14 : 4); i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({ type: 'drop', big: true, x, y: y - 2, vx: Math.cos(a) * (30 + Math.random() * 40), vy: -40 - Math.random() * 50, life: 0, max: 0.5 + Math.random() * 0.2 });
    }
    particles.push({ type: 'ring', layer: 'water', x, y: y - 1, vx: 0, vy: 0, r: 3, grow: big ? 22 : 12, flat: 0.45, pal: [PAL.foam], life: 0, max: 0.45 });
    const r = BREATHS.water.radius * (big ? 1 : 0.7);
    for (let i = marks.length - 1; i >= 0; i--) if (marks[i].kind === 'flames' && Math.hypot(marks[i].x - x, marks[i].y - y) < r + marks[i].r) marks.splice(i, 1);
    if (!cold) addMark('melt', x, y, big ? 13 : 8);
    return;
  }
  if (el !== 'frost' && el !== 'sonic') thawGround(x, y, BREATHS[el].radius * (big ? 1 : 0.7));
  if (el === 'lightning') {
    sparksAt(x, y, big ? 22 : 8);
    if (big) {
      particles.push({ type: 'shock', layer: 'water', x, y: y - 1, vx: 0, vy: 0, pal, life: 0, max: 0.35 });
      for (let i = 0; i < 3; i++) particles.push({ type: 'smoke', x: x + (Math.random() - 0.5) * 8, y: y - 4, vx: (Math.random() - 0.5) * 10, vy: -14 - Math.random() * 8, life: 0, max: 1.2 });
    }
  } else if (el === 'plasma') {
    burst(x, y - 3, pal, big ? 36 : 8, big ? 90 : 50);
    if (big) {
      particles.push({ type: 'shock', layer: 'water', x, y: y - 1, vx: 0, vy: 0, pal, life: 0, max: 0.45 });
      for (let i = 0; i < 5; i++) particles.push({ type: 'smoke', x: x + (Math.random() - 0.5) * 8, y: y - 4, vx: (Math.random() - 0.5) * 10, vy: -14 - Math.random() * 8, life: 0, max: 1.4 });
    }
  } else if (el === 'fire') {
    for (let i = 0; i < (big ? 22 : 5); i++) particles.push({ type: 'ember', layer: 'sky', x: x + (Math.random() - 0.5) * 10, y: y - 3, vx: (Math.random() - 0.5) * (big ? 80 : 40), vy: -30 - Math.random() * 40, life: 0, max: 0.5 + Math.random() * 0.4 });
    for (let i = 0; i < (big ? 6 : 1); i++) particles.push({ type: 'smoke', x: x + (Math.random() - 0.5) * 10, y: y - 6, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 8, life: 0, max: 1.6 });
    if (!cold) addMark('flames', x, y, big ? 12 : 7);
  } else if (el === 'frost') {
    for (let i = 0; i < (big ? 12 : 3); i++) particles.push({ type: 'chip', x, y: y - 3, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 40, c: [PAL.ice, PAL.iceLight, '#ffffff'][i % 3], life: 0, max: 0.45 });
    for (let i = 0; i < (big ? 10 : 2); i++) particles.push({ type: 'flake', layer: 'sky', x: x + (Math.random() - 0.5) * 20, y: y - 6 - Math.random() * 10, vx: (Math.random() - 0.5) * 12, vy: 8, pal, life: 0, max: 1 });
    freezeGround(x, y, frostRadius(x, y, big, beam));
    return;
  } else {
    for (let i = 0; i < (big ? 12 : 4); i++) {
      const a = (i / (big ? 12 : 4)) * Math.PI * 2;
      particles.push({ type: 'dust', x, y: y - 2, vx: Math.cos(a) * (big ? 60 : 35), vy: Math.sin(a) * (big ? 30 : 18), life: 0, max: 0.6 });
    }
    for (let i = 0; i < (big ? 3 : 1); i++) particles.push({ type: 'ring', layer: 'water', x, y: y - 1, vx: 0, vy: 0, r: 4, grow: big ? 34 : 18, flat: 0.45, pal, life: -i * 0.1, max: 0.5 });
    return;
  }
  if (cold) {
    addMark('melt', x, y, big ? 15 : 9);
    steam(big ? 6 : 1);
  } else {
    addMark('scorch', x, y, big ? 14 : 8);
  }
}

// The things, and the animals, caught in a blast of `r`. Plasma and fire melt the snow off a tree before they can
// catch it.
function affect(x, y, el, r, beam) {
  for (const o of hittables) {
    const k = kindOf(o);
    const d = Math.hypot(o.x - x, o.y - 4 - y);
    if (!k || d > (el === 'frost' && k === 'tree' ? r * 1.6 : r)) continue;
    if (el === 'frost') {
      if (o.burnT !== undefined) douse(o);
      else if (k === 'tree') snowOver(o);
    } else if (el === 'water') {
      if (o.burnT !== undefined) douse(o);
      else if (o.snowy > 0) unsnow(o);
    } else if (el === 'sonic') {
      if (o.snowy > 0) unsnow(o);
      knockOver(o, k);
    } else if (beam && el === 'plasma') {
      if (o.snowy > 0) unsnow(o);
      cutThrough(o, k, x);
    } else if (o.snowy > 0) {
      unsnow(o);
    } else if (k === 'bramble' || k === 'log') {
      ignite(o, Math.random() * 0.2);
    } else if (el === 'fire' || el === 'lightning') {
      if (k === 'tree' || k === 'bush') ignite(o, Math.random() * 0.3, true);
      else if (el === 'lightning') blastApart(o, k);
    } else {
      blastApart(o, k);
    }
  }
  if (el === 'frost' || el === 'water') {
    for (const o of [...burning]) if (Math.hypot(o.x - x, o.y - y) < r) douse(o);
  } else {
    meltAt(x, y + 4, r);
  }
  for (const a of [...prey()]) {
    if (!alive(a)) continue;
    const d = Math.hypot(a.x - x, a.y - y);
    const wild = animals.includes(a);
    if (el === 'frost') {
      if (wild && d < r) freeze(a);
    } else if (el === 'sonic' || el === 'water') {
      if (wild && d < r + (el === 'sonic' ? 10 : 0)) blowBack(a, x, y);
    } else if (d < 18 && huntable(a)) {
      if (el === 'fire') a.roasted = true;
      hurtAnimal(a, 99);
    }
    if (wild && d < r + 50 && !(a.frozenT > 0)) startle(a);
  }
}

// A plasma beam slices through what it crosses: a tree topples whole, away from where the beam came in, and the rest
// breaks as if the Thunderdrum had roared at it. Something already alight is left to burn.
function cutThrough(o, k, x) {
  if (o.burnT !== undefined) return;
  if (k === 'tree') {
    shedLeaves(o, 4);
    fell(o);
    o.fall.dir = x <= o.x ? 1 : -1;
    return;
  }
  o.shakeT = 0.3;
  if (KNOCK[k]) KNOCK[k](o);
}

function blastApart(o, k) {
  o.shakeT = 0.3;
  if (k === 'boulder') breakBoulder(o);
  else if (k === 'crystal') breakCrystal(o);
  else if (k === 'barrel') smash(o);
  else if (k === 'bush') cutBush(o);
  else if (k === 'tree') shedLeaves(o, 4);
}

// What a sonic blast does to each kind of thing. Trees stand: it only rattles them and shakes their fruit down.
const KNOCK = { tree: shakeFruit, boulder: breakBoulder, crystal: breakCrystal, barrel: smash, fence: breakFence, bush: cutBush, bramble: cutBramble, log: chopLog, target: hitTarget };

function knockOver(o, k) {
  o.shakeT = k === 'tree' ? 0.7 : 0.35;
  if (k === 'tree') shedLeaves(o, 6);
  if (KNOCK[k]) KNOCK[k](o);
}

function douse(o) {
  const i = burning.indexOf(o);
  if (i >= 0) burning.splice(i, 1);
  delete o.burnT;
  for (let k = 0; k < 6; k++) particles.push({ type: 'steam', x: o.x + (Math.random() - 0.5) * 14, y: o.y - 8, vx: (Math.random() - 0.5) * 6, vy: -16 - Math.random() * 8, life: 0, max: 1.2 });
  Sfx.hiss(0.6 * earshot(o.x, o.y));
}

function freeze(a) {
  if (!(a.frozenT > 0)) Sfx.freeze(earshot(a.x, a.y));
  a.frozenT = FROZEN_TIME;
  a.lift = 0;
}

// The ice cracks and falls away, and the animal bolts.
function thaw(a) {
  a.frozenT = 0;
  for (let i = 0; i < 10; i++) particles.push({ type: 'chip', x: a.x + (Math.random() - 0.5) * 10, y: a.y - 6, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, c: [PAL.ice, PAL.iceLight, '#ffffff'][i % 3], life: 0, max: 0.45 });
  Sfx.smash(0.4 * earshot(a.x, a.y));
  startle(a);
}

function blowBack(a, x, y) {
  const [ux, uy] = awayFrom(a, x, y);
  for (let i = 0; i < 4; i++) move(a, ux * 5, uy * 5);
  a.hurtT = 0.3;
  if (WILD[a.kind].charge || WILD[a.kind].lunge) Object.assign(a, { state: 'stun', timer: 1.2 });
}

// ---------- marks left on the ground ----------

const MARK_LIFE = { scorch: 30, melt: 20, crust: 10, flames: 1.6 };
const marks = [];

// Flames landing on grass creep on across it: partway through burning each patch may light one more beside it, up
// to GRASS_FIRE_GENS patches out, setting light to anything that burns close by as it goes.
const GRASS_FIRE_GENS = 3;
const GRASS_FIRE_ODDS = 0.55;
const GRASSY = new Set([T.GRASS, T.FIELD, T.HAY, T.JUNGLE]);

function addMark(kind, x, y, r, gen = 0) {
  if (marks.length > 160) marks.shift();
  marks.push({ kind, x, y, r: r * (0.85 + Math.random() * 0.3), t: 0, max: MARK_LIFE[kind], seed: Math.random() * 100, gen });
}

function creepFire(m, lit) {
  m.crept = true;
  for (const o of hittables) {
    const k = kindOf(o);
    if (!k || o.snowy > 0 || !['tree', 'bush', 'bramble', 'log'].includes(k) || Math.hypot(o.x - m.x, o.y - m.y) > m.r + 10) continue;
    ignite(o, Math.random() * 0.3, true);
  }
  if (m.gen >= GRASS_FIRE_GENS || Math.random() > GRASS_FIRE_ODDS) return;
  const a = Math.random() * Math.PI * 2;
  const d = 10 + Math.random() * 6;
  const x = m.x + Math.cos(a) * d;
  const y = m.y + Math.sin(a) * d * 0.7;
  if (GRASSY.has(tileUnder(x, y))) lit.push({ x, y, r: Math.max(6, m.r * 0.85), gen: m.gen + 1 });
}

function updateMarks(dt) {
  const lit = [];
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i];
    if ((m.t += dt) >= m.max) marks.splice(i, 1);
    else if (m.kind === 'flames' && !m.crept && m.t > m.max * 0.4) creepFire(m, lit);
  }
  for (const { x, y, r, gen } of lit) {
    addMark('scorch', x, y, r * 1.1);
    addMark('flames', x, y, r, gen);
    for (let i = 0; i < 2; i++) particles.push({ type: 'ember', layer: 'sky', x, y: y - 2, vx: (Math.random() - 0.5) * 30, vy: -25 - Math.random() * 25, life: 0, max: 0.5 + Math.random() * 0.3 });
  }
  updateIce(dt);
}

// ---------- frozen ground and snowy trees ----------

// Frost turns the tiles it lands on to ice: water and open ground alike. Each thaws back after a while, though
// frozen water waits until nobody is standing on it. Plasma and fire thaw it on the spot.
const FREEZES = new Set([T.WATER, T.GRASS, T.DIRT, T.SAND, T.PATH, T.FIELD, T.JUNGLE, T.SNOW, T.ASH, T.ROCK, T.HAY]);
const iced = new Map();
const snowyTrees = new Set();
const retiles = [];

function tilesNear(x, y, r, fn) {
  for (let ty = Math.floor((y - r) / TILE); ty <= Math.floor((y + r) / TILE); ty++) {
    for (let tx = Math.floor((x - r) / TILE); tx <= Math.floor((x + r) / TILE); tx++) {
      if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H && Math.hypot((tx + 0.5) * TILE - x, (ty + 0.5) * TILE - y) <= r) fn(tx, ty, ty * MAP_W + tx);
    }
  }
}

function freezeGround(x, y, r) {
  tilesNear(x, y, r, (tx, ty, i) => {
    const f = iced.get(i);
    if (f) {
      f.t = 0;
      return;
    }
    if (!FREEZES.has(map[i])) return;
    if (map[i] === T.WATER && shipObj && Math.hypot(shipObj.x - (tx + 0.5) * TILE, shipObj.y - (ty + 0.5) * TILE) < 40) return;
    iced.set(i, { tx, ty, was: map[i], t: 0, max: ICE_TIME + Math.random() * 8 });
    map[i] = T.ICE;
    retiles.push([tx, ty]);
  });
}

function thawGround(x, y, r) {
  tilesNear(x, y, r, (tx, ty, i) => {
    const f = iced.get(i);
    if (f) f.t = f.max;
  });
}

// Someone on foot is on or right next to the tile.
function standingOn(tx, ty) {
  const cx = (tx + 0.5) * TILE;
  const cy = (ty + 0.5) * TILE;
  const on = (e) => !e.flying && !e.hidden && e.state !== 'gone' && Math.abs(e.x - cx) < TILE && Math.abs(e.y - cy) < TILE;
  return entities.some((e) => e !== player && on(e)) || animals.some(on) || sheep.some(on) || on(dog);
}

// Sea ice melting away under the player drops them in, for the dragon they last rode to swoop down and
// scoop up; a dragon perched out on it takes to the air, and stays by the player if it brought them out here.
function sinkThrough() {
  for (const b of dragons) {
    if (b.stage !== GROWN || !b.perched || !isWet(tileUnder(b.obj.x, b.obj.y))) continue;
    takeOff(b);
    if (b === lastRidden && Math.hypot(b.x - player.x, b.y - player.y) < 400) b.stayBy = true;
  }
  if (!grounded() || hop || sail || flight || !isWet(tileUnder(player.x, player.y))) return;
  Object.assign(player, { swimming: true, jumpT: -1, chop: null, nock: null, fishing: null, running: false });
  splash(player.x, player.y);
  seaSplash(player.x, player.y - 2, 1);
  Sfx.splash();
  const b = rescuer();
  if (!b) return muse('Brr! The ice melted right out from under me!');
  b.rescue = true;
  muse(`Whoa! The ice gave way! ${b.name}!`);
}

function updateIce(dt) {
  let sank = false;
  for (const [i, f] of iced) {
    if ((f.t += dt) < f.max) continue;
    if (f.was === T.WATER && standingOn(f.tx, f.ty)) {
      f.t = f.max - 1;
      continue;
    }
    iced.delete(i);
    if (map[i] !== T.ICE) continue;
    map[i] = f.was;
    sank ||= f.was === T.WATER;
    retiles.push([f.tx, f.ty]);
    const x = (f.tx + 0.5) * TILE;
    const y = (f.ty + 0.5) * TILE;
    if (onScreen(x, y, cam.x, cam.y, 20)) {
      for (let k = 0; k < 2; k++) particles.push({ type: 'drop', x: x + (Math.random() - 0.5) * 12, y: y - 2, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 0, max: 0.4 });
    }
  }
  for (const o of snowyTrees) {
    if ((o.snowy -= dt) <= 0 || kindOf(o) !== 'tree') unsnow(o);
  }
  if (retiles.length) {
    retile(retiles);
    retiles.length = 0;
  }
  if (sank) sinkThrough();
}

function snowOver(o) {
  if (!(o.snowy > 0)) shedSnow(o, 6);
  o.snowy = SNOWY_TIME + Math.random() * 8;
  snowyTrees.add(o);
}

function unsnow(o) {
  o.snowy = 0;
  snowyTrees.delete(o);
  if (kindOf(o) === 'tree') shedSnow(o, 10);
}

function shedSnow(o, n) {
  const img = SPR[o.key].img;
  for (let i = 0; i < n; i++) {
    particles.push({
      type: 'flake', x: o.x + (Math.random() - 0.5) * img.width * 0.7, y: o.y - img.height * (0.4 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 8, vy: 14 + Math.random() * 10, pal: ['#dceefa'], life: 0, max: 1 + Math.random() * 0.6,
    });
  }
}

// The sprite with snow lying on every upward-facing edge, and a few flecks caught in the leaves.
const snowyImgs = new WeakMap();

function snowyImg(img) {
  let c = snowyImgs.get(img);
  if (c) return c;
  c = makeCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height);
  const a = (x, y) => (y < 0 ? 0 : d.data[(y * img.width + x) * 4 + 3]);
  const set = (x, y, [r, gr, b]) => {
    const k = (y * img.width + x) * 4;
    d.data[k] = r;
    d.data[k + 1] = gr;
    d.data[k + 2] = b;
  };
  const top = [];
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (a(x, y) && !a(x, y - 1)) top.push([x, y]);
  for (const [x, y] of top) {
    set(x, y, [250, 252, 255]);
    if (y + 1 < img.height && a(x, y + 1) && hash(x, y, 913) < 0.6) set(x, y + 1, [214, 230, 242]);
  }
  for (let y = 0; y < img.height * 0.8; y++) {
    for (let x = 0; x < img.width; x++) if (a(x, y) && hash(x, y, 917) < 0.07) set(x, y, [236, 244, 250]);
  }
  g.putImageData(d, 0, 0);
  snowyImgs.set(img, c);
  return c;
}

// A blotch of three overlapping ellipses, flattened to lie on the ground.
function blotch(m, x, y, r, color) {
  ellipse(ctx, x, y, r, r * 0.5, color);
  for (let i = 0; i < 3; i++) {
    const a = m.seed + i * 2.1;
    ellipse(ctx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.25, r * 0.55, r * 0.3, color);
  }
}

function drawMarks(cx, cy) {
  for (const m of marks) {
    const x = Math.round(m.x - cx);
    const y = Math.round(m.y - cy);
    if (x < -40 || y < -40 || x > viewW + 40 || y > viewH + 40) continue;
    const fade = Math.min(1, (m.max - m.t) / Math.min(3, m.max * 0.3));
    const r = m.r * Math.min(1, m.t / 0.15 + 0.3);
    if (m.kind === 'scorch') {
      ctx.globalAlpha = 0.45 * fade;
      blotch(m, x, y, r, '#2a1a10');
      ctx.globalAlpha = 0.4 * fade;
      ellipse(ctx, x, y, r * 0.5, r * 0.25, '#120a06');
      if (m.t < 2.5) {
        ctx.globalAlpha = 1 - m.t / 2.5;
        for (let i = 0; i < 3; i++) px(ctx, x + Math.round(Math.cos(m.seed + i * 2.3) * r * 0.4), y + Math.round(Math.sin(m.seed + i * 2.3) * r * 0.2), '#ff8a2a');
      }
    } else if (m.kind === 'melt') {
      ctx.globalAlpha = 0.4 * fade;
      blotch(m, x, y, r, '#6f8496');
      ctx.globalAlpha = 0.35 * fade;
      ellipse(ctx, x - 1, y - 1, r * 0.4, r * 0.18, '#d8ecf8');
    } else if (m.kind === 'crust') {
      ctx.globalAlpha = 0.85 * fade;
      blotch(m, x, y, r, '#3a2a2a');
      ctx.globalAlpha = 0.6 * fade;
      ellipse(ctx, x + 1, y, r * 0.4, r * 0.15, '#5a4040');
    } else {
      const k = Math.sin(Math.PI * Math.min(1, m.t / m.max));
      ctx.globalAlpha = 0.5;
      ellipse(ctx, x, y, r * 0.8, r * 0.35, '#2a1a10');
      ctx.globalAlpha = 1;
      for (const [c, s] of [['#c8401e', 1], ['#ff8a2a', 0.7], ['#ffd85a', 0.4]]) {
        for (let i = 0; i < 2; i++) {
          const u = i - 0.5;
          const h = (3 + r * 0.6 * k) * s * (0.75 + 0.25 * Math.sin(time * 14 + i * 2.1 + m.seed));
          const w = (1 + r * 0.15) * s + 1;
          poly(ctx, [[x + u * r * 0.7 - w, y], [x + u * r * 0.7 + w, y], [x + u * r * 0.7, y - h]], c);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

// A block of ice round a frozen animal, `w` by `h` with its feet at `x`, `y` in screen pixels.
function drawIceBlock(x, y, w, h, t) {
  ctx.globalAlpha = 0.5 * Math.min(1, t * 2);
  rect(ctx, x - Math.floor(w / 2) - 2, y - h - 1, w + 4, h + 3, '#bfe8ff');
  ctx.globalAlpha = 0.9 * Math.min(1, t * 2);
  rect(ctx, x - Math.floor(w / 2) - 2, y - h - 1, w + 4, 1, '#ffffff');
  rect(ctx, x - Math.floor(w / 2) - 2, y - h - 1, 1, h + 3, '#ffffff');
  rect(ctx, x + Math.ceil(w / 2) + 1, y - h - 1, 1, h + 3, '#7cc4ec');
  rect(ctx, x - Math.floor(w / 2) - 2, y + 1, w + 4, 1, '#7cc4ec');
  ctx.globalAlpha = 1;
}

// ---------- drawing the breath ----------

function strokePath(pts, width, color) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
}

function strokeRing(x, y, rx, ry, color, width = 1, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawFireballs(cx, cy) {
  for (const b of fireballs) {
    ctx.globalAlpha = 0.25;
    ellipse(ctx, Math.round(b.x - cx), Math.round(b.y - cy) - 1, 4 * (b.size || 1), 1.5, '#000000');
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const b of fireballs) {
    const r = Math.round(22 * (b.size || 1));
    ctx.drawImage(glowSprite(r, (b.pal || PLASMA)[0]), Math.round(b.x - r - cx), Math.round(b.y - b.h - r - cy));
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const b of fireballs) drawBall(b, Math.round(b.x - cx), Math.round(b.y - b.h - cy));
  drawBeams(cx, cy);
  drawShocks(cx, cy);
  drawBolts(cx, cy);
  drawCharge(cx, cy);
}

function drawBall(b, x, y) {
  const pal = b.pal || PLASMA;
  const s = b.size || 1;
  const pulse = Math.sin(time * 40) > 0 ? 1 : 0;
  const d = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) || 1;
  const ux = (b.x1 - b.x0) / d;
  const uy = (b.y1 - b.y0) / d;
  if (b.el === 'fire') {
    for (let i = 3; i >= 1; i--) ellipse(ctx, x - ux * i * 3 * s, y - uy * i * 3 * s - i, (5 - i) * s, (5 - i) * s, pal[2]);
    const wob = Math.sin(time * 30) * 0.6;
    ellipse(ctx, x, y, 5 * s + wob + pulse, 5 * s - wob + pulse, pal[2]);
    ellipse(ctx, x, y, 4 * s + wob, 4 * s - wob, pal[0]);
    ellipse(ctx, x + ux, y + uy, 2.5 * s, 2.5 * s, pal[1]);
    rect(ctx, x, y - 1, 1, 2, '#ffffff');
  } else if (b.el === 'frost') {
    const shard = (k, c) => poly(ctx, [
      [x + ux * 9 * s * k, y + uy * 9 * s * k], [x - uy * 4 * s * k, y + ux * 4 * s * k],
      [x - ux * 6 * s * k, y - uy * 6 * s * k], [x + uy * 4 * s * k, y - ux * 4 * s * k],
    ], c);
    shard(1.3, pal[2]);
    shard(1, pal[0]);
    shard(0.55, pal[1]);
    px(ctx, x, y, '#ffffff');
  } else if (b.el === 'sonic') {
    for (let k = 0; k < 3; k++) {
      const u = (time * 4 + k / 3) % 1;
      ctx.globalAlpha = 1 - u;
      strokeRing(x, y, (2 + 7 * u) * s, (2 + 7 * u) * s, pal[k ? 0 : 1], 1.5);
    }
    ctx.globalAlpha = 1;
    ellipse(ctx, x, y, 2.5 * s, 2.5 * s, pal[1]);
  } else if (b.el === 'water') {
    // a wobbling ball of water, a tail of spray behind it
    for (let i = 3; i >= 1; i--) ellipse(ctx, x - ux * i * 3.5 * s, y - uy * i * 3.5 * s, (4.5 - i) * s * 0.8, (4.5 - i) * s * 0.8, pal[2]);
    const wob = Math.sin(time * 26) * 0.8;
    ellipse(ctx, x, y, 5 * s + wob, 5 * s - wob, pal[2]);
    ellipse(ctx, x, y, 4 * s + wob, 4 * s - wob, pal[0]);
    ellipse(ctx, x - 1.5 * s, y - 1.5 * s, 1.6 * s, 1.2 * s, pal[1]);
    px(ctx, x - 2 * s, y - 2 * s, '#ffffff');
  } else {
    ellipse(ctx, x, y, 5 * s + pulse, 5 * s + pulse, pal[2]);
    ellipse(ctx, x, y, 4 * s, 4 * s, pal[0]);
    ellipse(ctx, x, y, 2.5 * s, 2.5 * s, pal[1]);
    rect(ctx, x - 1, y - 1, 2, 2, '#ffffff');
  }
}

function drawBeams(cx, cy) {
  for (const b of beams) {
    const B = BREATHS[b.el].beam;
    const p = beamPath(b);
    const fade = Math.min(1, (B.time - b.t) / BEAM_FADE);
    const pts = [[Math.round(p.x0 - cx), Math.round(p.y0 - p.h0 - cy)], [Math.round(p.x1 - cx), Math.round(p.y1 - p.h1 - cy)]];
    const w = Math.sin(time * 50) > 0 ? 1 : 0;
    const er = p.ground ? 26 : 14;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 * fade;
    strokePath(pts, (13 + 2 * w) * B.width, b.pal[0]);
    ctx.globalAlpha = fade;
    ctx.drawImage(glowSprite(26, b.pal[0]), pts[0][0] - 26, pts[0][1] - 26);
    ctx.drawImage(glowSprite(er, b.pal[0]), pts[1][0] - er, pts[1][1] - er);
    ctx.globalCompositeOperation = 'source-over';
    if (b.el === 'fire') drawFlameBeam(b, pts, fade);
    else if (b.el === 'sonic') drawSoundBeam(b, pts, fade);
    else drawRayBeam(b, pts, fade, w, p.ground, B.width);
  }
  ctx.globalAlpha = 1;
}

// Plasma, frost and water: a solid ray with a white-hot core; frost's is thinner, glinting with ice, and water's
// ripples, beaded with spray rushing along it.
function drawRayBeam(b, pts, fade, w, ground, k) {
  if (b.el === 'water') return drawWaterBeam(b, pts, fade, ground, k);
  const [ex, ey] = pts[1];
  strokePath(pts, (6 + w) * fade * k, b.pal[2]);
  strokePath(pts, (4 + w) * fade * k, b.pal[0]);
  strokePath(pts, 2 * fade, b.pal[1]);
  line(ctx, pts[0][0], pts[0][1], ex, ey, '#ffffff');
  if (b.el === 'frost') {
    const n = Math.floor(Math.hypot(ex - pts[0][0], ey - pts[0][1]) / 14);
    for (let i = 1; i <= n; i++) {
      const u = (i + (time * 6) % 1) / (n + 1);
      const x = Math.round(pts[0][0] + (ex - pts[0][0]) * u);
      const y = Math.round(pts[0][1] + (ey - pts[0][1]) * u) + (i % 2 ? -3 : 3);
      px(ctx, x, y, '#ffffff');
      px(ctx, x - 1, y, b.pal[1]);
      px(ctx, x + 1, y, b.pal[1]);
    }
  }
  if (ground) ellipse(ctx, ex, ey, 5 + w, 3 + w, b.pal[1]);
}

function drawWaterBeam(b, pts, fade, ground, k) {
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[1];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const n = Math.max(2, Math.floor(len / 4));
  ctx.globalAlpha = fade;
  for (const [c, s] of [[b.pal[2], 1], [b.pal[0], 0.7], [b.pal[1], 0.3]]) {
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const r = (2.5 + 2 * u + Math.sin(time * 30 - u * 22) * 1.1) * s * k;
      ellipse(ctx, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r, r, c);
    }
  }
  const beads = Math.floor(len / 10);
  for (let i = 0; i < beads; i++) {
    const u = (i / beads + time * 3) % 1;
    const side = (hash(i, 7, 131) - 0.5) * 8 * k;
    const x = Math.round(x0 + (x1 - x0) * u - ((y1 - y0) / len) * side);
    const y = Math.round(y0 + (y1 - y0) * u + ((x1 - x0) / len) * side);
    px(ctx, x, y, '#ffffff');
  }
  ctx.globalAlpha = 1;
  if (ground) {
    ellipse(ctx, x1, y1, 7, 4, b.pal[0]);
    ellipse(ctx, x1, y1, 4, 2, '#ffffff');
  }
}

// Fire: a roaring stream of flame that billows wider and wobbles the further it goes.
function drawFlameBeam(b, pts, fade) {
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[1];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const n = Math.max(2, Math.floor(len / 6));
  ctx.globalAlpha = fade;
  for (const [c, s] of [[b.pal[2], 1], [b.pal[0], 0.7], [b.pal[1], 0.38]]) {
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const wob = Math.sin(time * 25 + u * 14) * 2.5 * u;
      const r = (2 + 14 * u) * s * (0.85 + 0.15 * Math.sin(time * 40 + i));
      ellipse(ctx, x0 + (x1 - x0) * u + nx * wob, y0 + (y1 - y0) * u + ny * wob - u * 3, r, r * 0.85, c);
    }
  }
}

// Sound: a shimmering band with rings of noise rippling out along it.
function drawSoundBeam(b, pts, fade) {
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[1];
  const rot = Math.atan2(y1 - y0, x1 - x0);
  ctx.globalAlpha = 0.5 * fade;
  strokePath(pts, 2, b.pal[1]);
  const n = 7;
  for (let k = 0; k < n; k++) {
    const u = (time * 2.5 + k / n) % 1;
    const x = x0 + (x1 - x0) * u;
    const y = y0 + (y1 - y0) * u;
    ctx.globalAlpha = fade * (1 - u * 0.6);
    strokeRing(x, y, 2 + 2 * u, 5 + 10 * u, b.pal[1], 2, rot);
    strokeRing(x, y, 1 + 2 * u, 3 + 8 * u, b.pal[0], 1, rot);
  }
}

// A jagged bolt from the mouth to the strike, re-forked every few frames; it flashes, dims, then flashes back
// down the same channel before it fades.
function drawBolts(cx, cy) {
  for (const b of bolts) {
    const [x0, y0, h0] = boltStart(b);
    const sx = x0;
    const sy = y0 - h0;
    const len = Math.hypot(b.x - sx, b.y - sy);
    if (!b.pts || Math.random() < 0.3) {
      b.pts = jag(sx, sy, b.x, b.y, Math.max(4, Math.round(len / 14)), 6 * b.width);
      b.forkPts = b.forks.map(([fx, fy]) => {
        const from = b.ring ? [b.x, b.y] : b.pts[Math.max(1, b.pts.length - 2 - Math.floor(Math.random() * 3))];
        return jag(from[0], from[1], fx, fy, 5, 6);
      });
      if (b.ring) b.ringPts = ringJag(b.x, b.y, b.ring);
    }
    const u = b.t / (b.life || BOLT_TIME);
    const on = u < 0.3 || (u > 0.45 && u < 0.6);
    const bright = on ? 1 : 0.35 * (1 - u);
    const r = Math.round(16 * b.width);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = bright;
    ctx.drawImage(glowSprite(r, b.pal[0]), Math.round(b.x - cx) - r, Math.round(b.y - cy) - r);
    ctx.drawImage(glowSprite(10, b.pal[0]), Math.round(sx - cx) - 10, Math.round(sy - cy) - 10);
    if (b.width > 1) {
      ctx.globalAlpha = 0.35 * bright;
      strokePath(b.pts.map(([x, y]) => [Math.round(x - cx), Math.round(y - cy)]), 7, b.pal[0]);
    }
    if (b.ring) {
      ctx.globalAlpha = 0.25 * bright;
      ellipse(ctx, Math.round(b.x - cx), Math.round(b.y - cy), b.ring, b.ring, b.pal[2]);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (b.ring) strokeJag(b.ringPts, cx, cy, bright * 0.9);
    strokeJag(b.pts, cx, cy, bright);
    if (b.width > 1) strokeJag(b.pts.map(([x, y]) => [x + 1, y]), cx, cy, bright * 0.7);
    for (const f of b.forkPts) strokeJag(f, cx, cy, bright * 0.75);
  }
  ctx.globalAlpha = 1;
}

// A closed, jagged ring of lightning of radius `r` round (x, y).
function ringJag(x, y, r) {
  const n = Math.max(12, Math.round(r / 4));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = i === n ? 1 : 1 + (Math.random() - 0.5) * 0.12;
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]);
  }
  pts[n] = pts[0];
  return pts;
}

// A ball of breath swelling at the mouth, and a meter over the rider that flashes once the beam is ready.
function drawCharge(cx, cy) {
  const f = flight;
  if (!f || f.charge == null) return;
  const c = f.charge;
  const full = c >= 1;
  const pulse = full && Math.sin(time * 30) > 0 ? 1 : 0;
  const [x, y, h] = mouthAt(f, f.face || f.dir);
  const sx = Math.round(x - cx);
  const sy = Math.round(y - h - cy);
  const r = Math.round(8 + 14 * c) + pulse * 3;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 + 0.5 * c;
  ctx.drawImage(glowSprite(r, PLASMA[0]), sx - r, sy - r);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const o = 1.5 + 3 * c + pulse;
  ellipse(ctx, sx, sy, o + 1, o + 1, PLASMA[2]);
  ellipse(ctx, sx, sy, o, o, PLASMA[0]);
  ellipse(ctx, sx, sy, o * 0.5, o * 0.5, PLASMA[1]);
  const [hx, hy] = headPos();
  const mx = Math.round(hx) - cx - 8;
  const my = Math.round(hy) - cy - 12;
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(mx - 1, my - 1, 18, 4);
  ctx.fillStyle = full ? (Math.sin(time * 20) > 0 ? '#ffffff' : PLASMA[1]) : PLASMA[0];
  ctx.fillRect(mx, my, Math.round(16 * c), 2);
}
