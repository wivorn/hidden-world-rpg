// The maelstrom out in the far south-eastern sea, and the drowned grotto under it. Sail too close and the whirl
// takes the ship, spins it round and pulls it under. Below, the currents run one way only through channels between
// calm basins, and the ship goes where they take it, its sail only nudging it from side to side. A tide glider's
// egg lies on the islet in the far basin; once it's lifted, a spring bursts open in the basin below and its jet
// throws the ship back up out of the sea.

// In pixels: the whirl's pull reaches `pull` out from the eye, and at `eye` the ship goes under. `spin` and `suck`
// are how hard it pulls round and in; a ship at full sail can still get away until it's a little under halfway in.
const WHIRL = { x: MAELSTROM.x * TILE, y: MAELSTROM.y * TILE, pull: 260, eye: 30, spin: 120, suck: 70 };
const SINK_TIME = 1.1;
// A channel's current, and how much of the ship's own sailing still counts in one.
const CHANNEL_SPEED = 130;
const CHANNEL_GRIP = 0.3;
const CHANNEL_CENTRE = 25;
// The jet: how near its spring the ship has to come, how long it rises, and how far from the eye it comes down.
const JET_REACH = 28;
const JET_RISE = 0.9;
const JET_FALL = 1.3;
const JET_THROW = 340;
const JET_LIFT = 150;

const whirl = { warned: false, sink: null, jet: null, churnT: 0, ventTold: false, dripT: 0 };
const grottoEgg = () => eggs.find((e) => e.species === 'tideGlider');
const jetAwake = () => grottoEgg().state !== 'wild';
const inGrotto = () => indoors === ROOMS.grotto;
const grottoPx = (x, y) => [(ROOMS.grotto.rx + x) * TILE, (ROOMS.grotto.ry + y) * TILE];

// ---------- the currents ----------

// Per grotto tile: the current's push along its channel, and the pull back towards the channel's middle, in px/s.
// Calm in the basins and on dry ground.
let grottoFlow = null;
function flowField() {
  if (grottoFlow) return grottoFlow;
  const r = ROOMS.grotto;
  grottoFlow = new Float32Array(r.w * r.h * 2);
  const basins = Object.values(GROTTO.basins);
  for (let ly = 0; ly < r.h; ly++) {
    for (let lx = 0; lx < r.w; lx++) {
      if (tileAt(r.rx + lx, r.ry + ly) !== T.WATER) continue;
      const x = lx + 0.5;
      const y = ly + 0.5;
      if (basins.some(([bx, by, rx, ry]) => ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2 < 1)) continue;
      let best = null;
      for (const pts of GROTTO.channels) {
        for (let k = 0; k + 1 < pts.length; k++) {
          const [ax, ay] = pts[k];
          const [bx, by] = pts[k + 1];
          const dx = bx - ax;
          const dy = by - ay;
          const len = Math.hypot(dx, dy);
          const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (len * len)));
          const d = Math.hypot(ax + dx * u - x, ay + dy * u - y);
          if (!best || d < best.d) best = { d, tx: dx / len, ty: dy / len, fx: ax + dx * u - x, fy: ay + dy * u - y };
        }
      }
      if (!best || best.d > GROTTO.width + 1) continue;
      // only the part of the pull square across the channel, so past a channel's end it doesn't drag back
      const along = best.fx * best.tx + best.fy * best.ty;
      const i = (ly * r.w + lx) * 2;
      grottoFlow[i] = best.tx * CHANNEL_SPEED + (best.fx - along * best.tx) * CHANNEL_CENTRE;
      grottoFlow[i + 1] = best.ty * CHANNEL_SPEED + (best.fy - along * best.ty) * CHANNEL_CENTRE;
    }
  }
  return grottoFlow;
}

function flowAt(x, y) {
  const r = ROOMS.grotto;
  const lx = Math.floor(x / TILE) - r.rx;
  const ly = Math.floor(y / TILE) - r.ry;
  if (lx < 0 || ly < 0 || lx >= r.w || ly >= r.h) return null;
  const f = flowField();
  const i = (ly * r.w + lx) * 2;
  return f[i] || f[i + 1] ? [f[i], f[i + 1]] : null;
}

const hullMid = (o) => {
  const [x0, y0, x1, y1] = shipBox(o.facing, o.x, o.y);
  return [(x0 + x1) / 2, (y0 + y1) / 2];
};

// Eases the ship's drift `s.cx, s.cy` towards whatever the water's doing under it, and returns how much of its own
// sailing still counts.
function seaCurrent(s, o, dt) {
  let tx = 0;
  let ty = 0;
  let grip = 1;
  let rate = 2.5;
  const [mx, my] = hullMid(o);
  if (inGrotto()) {
    const f = flowAt(mx, my);
    if (f) [tx, ty, grip] = [f[0], f[1], CHANNEL_GRIP];
  } else if (!indoors) {
    const dx = WHIRL.x - mx;
    const dy = WHIRL.y - my;
    const d = Math.hypot(dx, dy) || 1;
    if (d < WHIRL.pull) {
      const k = 1 - d / WHIRL.pull;
      tx = (-dy / d) * WHIRL.spin * k ** 0.7 + (dx / d) * WHIRL.suck * (0.3 + 2 * k);
      ty = (dx / d) * WHIRL.spin * k ** 0.7 + (dy / d) * WHIRL.suck * (0.3 + 2 * k);
      grip = Math.max(0.1, Math.min(1, (d - WHIRL.eye) / (WHIRL.pull * 0.55)));
      rate = 4;
      if (!whirl.warned && d < WHIRL.pull * 0.8) {
        whirl.warned = true;
        muse('The sea\'s turning round and round... a whirlpool! It\'s pulling us in! Full sail, or we\'re going under!');
      }
      if (d < WHIRL.eye + 8 && !fade) goUnder(o);
    } else if (d > WHIRL.pull + 40) {
      whirl.warned = false;
    }
  }
  const k = 1 - Math.exp(-dt * rate);
  s.cx = (s.cx || 0) + (tx - (s.cx || 0)) * k;
  s.cy = (s.cy || 0) + (ty - (s.cy || 0)) * k;
  return grip;
}

// The facing nearest a heading, for a ship being thrown about rather than sailed.
const facingFor = (a) => SHIP_FACINGS[(Math.round(a / (Math.PI / 4)) + 8) % 8];

function aimShip(o, a) {
  const nf = facingFor(a);
  o.facing = nf;
  o.dir = FACING_DIR[nf] || nf;
}

// ---------- down the maelstrom ----------

function goUnder(o) {
  const [mx, my] = hullMid(o);
  whirl.sink = { t: 0, a: Math.atan2(my - WHIRL.y, mx - WHIRL.x), r: Math.hypot(mx - WHIRL.x, my - WHIRL.y) };
  fade = { t: 0, act: enterGrotto, len: SINK_TIME };
  Sfx.whoosh();
  Sfx.churn(1);
}

function enterGrotto() {
  const o = shipObj;
  indoors = ROOMS.grotto;
  const [x, y] = grottoPx(GROTTO.basins.arrive[0], GROTTO.basins.arrive[1]);
  Object.assign(o, { x, y: y + 24, lift: 0 });
  aimShip(o, -Math.PI / 2);
  Object.assign(sail, { vx: 0, vy: 0, cx: 0, cy: 0 });
  Object.assign(player, { x: o.x, y: o.y });
  whirl.sink = null;
  whirl.ventTold = false;
  shipAlong();
  stats.maelstrom++;
  for (let i = 0; i < 16; i++) particles.push({ type: 'drop', big: true, x: x + (Math.random() - 0.5) * 60, y: y - 20 - Math.random() * 40, vx: (Math.random() - 0.5) * 20, vy: 40 + Math.random() * 60, life: 0, max: 0.5 + Math.random() * 0.4 });
  setTimeout(() => muse(stats.maelstrom > 1 ? 'Down the maelstrom again! Mind the currents this time.'
    : 'We went right under... and came down in a grotto beneath the sea! The currents here only run one way. Where do they go?'), 900);
}

// A young follower flutters along over the deck.
function shipAlong() {
  const f = follower;
  if (f && f.stage < GROWN && !f.swoop) Object.assign(f, { x: shipObj.x, y: shipObj.y - 20, alt: 30, flying: true, stuck: 0 });
}

// While the player's down in the grotto, a grown follower circles over the maelstrom, waiting.
const maelstromWait = () => ({ x: WHIRL.x + Math.cos(time * 0.6) * 110, y: WHIRL.y + Math.sin(time * 0.6) * 60, alt: 60 });

// ---------- the jet ----------

// Lifting the egg off its nest frees the spring under the next basin down.
function wakeJet() {
  Sfx.churn(1);
  Sfx.thunk();
  setTimeout(() => {
    Sfx.gush();
    muse('A rumble through the water... something burst open down below! Water\'s gushing up somewhere.');
  }, 700);
}

function rideJet() {
  whirl.jet = { phase: 'up', t: 0 };
  Object.assign(sail, { vx: 0, vy: 0, cx: 0, cy: 0 });
  Sfx.gush();
}

function leaveGrotto() {
  const o = shipObj;
  indoors = null;
  const a = Math.atan2(villageFire.y - WHIRL.y, villageFire.x - WHIRL.x);
  const x1 = WHIRL.x + Math.cos(a) * JET_THROW;
  const y1 = WHIRL.y + Math.sin(a) * JET_THROW;
  whirl.jet = { phase: 'fall', t: 0, x1, y1, a };
  Object.assign(o, { x: WHIRL.x, y: WHIRL.y, lift: JET_LIFT });
  aimShip(o, a);
  Object.assign(player, { x: o.x, y: o.y });
  shipAlong();
}

// Takes the helm from the player while the ship goes down the maelstrom or rides the jet. True while it has it.
function whirlSail(dt) {
  const o = shipObj;
  if (whirl.sink) {
    const s = whirl.sink;
    s.t += dt;
    s.a += dt * (3 + s.t * 5);
    const r = Math.max(4, s.r * (1 - s.t / SINK_TIME));
    o.x = WHIRL.x + Math.cos(s.a) * r;
    o.y = WHIRL.y + Math.sin(s.a) * r * 0.7 + 12;
    aimShip(o, s.a + Math.PI / 2);
    Object.assign(player, { x: o.x, y: o.y });
    if (Math.random() < dt * 30) particles.push({ type: 'wake', layer: 'water', x: o.x + (Math.random() - 0.5) * 40, y: o.y - Math.random() * 20, vx: 0, vy: 0, life: 0, max: 0.8 });
    return true;
  }
  const j = whirl.jet;
  if (!j) return false;
  j.t += dt;
  if (j.phase === 'up') {
    const [x, y] = grottoPx(GROTTO.basins.jet[0], GROTTO.basins.jet[1]);
    const k = 1 - Math.exp(-dt * 6);
    const [mx, my] = hullMid(o);
    o.x += (x - mx) * k;
    o.y += (y - my) * k;
    o.lift = JET_LIFT * Math.min(1, j.t / JET_RISE) ** 2;
    if (j.t > JET_RISE * 0.55 && !fade) fade = { t: 0, act: leaveGrotto, len: 0.45 };
  } else {
    const u = Math.min(1, j.t / JET_FALL);
    o.x = WHIRL.x + (j.x1 - WHIRL.x) * u;
    o.y = WHIRL.y + (j.y1 - WHIRL.y) * u;
    o.lift = JET_LIFT * (1 - u) + Math.sin(u * Math.PI) * 50;
    if (u >= 1) {
      o.lift = 0;
      whirl.jet = null;
      Object.assign(sail, { vx: Math.cos(j.a) * 60, vy: Math.sin(j.a) * 60, cx: 0, cy: 0 });
      seaSplash(o.x, o.y - 8, 2.5);
      splash(o.x, o.y);
      Sfx.splash(1);
      stats.jetRides++;
      muse(stats.jetRides > 1 ? 'Wheee! Out on the jet again!' : 'Whoa! The jet shot us right up out of the sea! Back on the open water.');
    }
  }
  Object.assign(player, { x: o.x, y: o.y });
  for (let i = 0; i < 2; i++) particles.push({ type: 'drop', layer: 'sky', big: true, x: o.x + (Math.random() - 0.5) * 50, y: o.y - o.lift - Math.random() * 10, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, life: 0, max: 0.6 });
  return true;
}

// ---------- every frame ----------

function updateWhirlpool(dt) {
  if (!started) return;
  const near = !indoors && Math.hypot(player.x - WHIRL.x, player.y - WHIRL.y) < WHIRL.pull * 2;
  if ((near || inGrotto()) && (whirl.churnT -= dt) <= 0) {
    whirl.churnT = 1.3;
    Sfx.churn(inGrotto() ? 0.25 : earshot(WHIRL.x, WHIRL.y));
  }
  if (!inGrotto()) return;
  // swimmers are carried along by the currents too, if more gently
  if (player.swimming && !sail) {
    const f = flowAt(player.x, player.y - 2);
    if (f) move(player, f[0] * 0.6 * dt, f[1] * 0.6 * dt);
  }
  // water dripping and falling in from the eye of the maelstrom overhead
  if ((whirl.dripT -= dt) <= 0) {
    whirl.dripT = 0.15 + Math.random() * 0.3;
    const [x, y] = grottoPx(GROTTO.basins.arrive[0], GROTTO.basins.arrive[1]);
    particles.push({ type: 'drop', big: true, x: x + (Math.random() - 0.5) * 70, y: y - 60, vx: 0, vy: 60, life: 0, max: 0.6 });
  }
  const [jx, jy] = grottoPx(GROTTO.basins.jet[0], GROTTO.basins.jet[1]);
  if (Math.random() < dt * (jetAwake() ? 30 : 4)) {
    particles.push({ type: 'ring', layer: 'water', x: jx + (Math.random() - 0.5) * 16, y: jy + (Math.random() - 0.5) * 10, vx: 0, vy: 0, r: 2, grow: jetAwake() ? 18 : 8, flat: 0.5, pal: [PAL.foam], life: 0, max: 0.7 });
  }
  if (!sail || whirl.jet || fade) return;
  const [mx, my] = hullMid(shipObj);
  const d = Math.hypot(mx - jx, my - jy);
  if (jetAwake() && d < JET_REACH) rideJet();
  else if (!jetAwake() && d < JET_REACH * 1.6 && !whirl.ventTold) {
    whirl.ventTold = true;
    muse('Bubbles welling up from a crack in the rock down here... like a spring that\'s been stoppered.');
  }
}

// ---------- the light down there ----------

// The light falling through the maelstrom's eye, the glowing egg on its islet, and the jet's spring once it's open.
function grottoLights() {
  const out = [];
  const [ax, ay] = grottoPx(GROTTO.basins.arrive[0], GROTTO.basins.arrive[1]);
  out.push({ x: ax, y: ay, r: 110, k: 0.9, glow: 30, color: '#9fe8ff' });
  const e = grottoEgg();
  if (!e.hidden && inRoom(ROOMS.grotto, e)) out.push({ x: e.x, y: e.y - 6, r: 60, k: 0.8, glow: 18, color: '#7ff0ff' });
  const [jx, jy] = grottoPx(GROTTO.basins.jet[0], GROTTO.basins.jet[1]);
  out.push({ x: jx, y: jy, r: jetAwake() ? 80 : 36, k: 0.7, glow: jetAwake() ? 20 : 0, color: '#bff4ff' });
  for (const [bx, by] of Object.values(GROTTO.basins)) {
    const [x, y] = grottoPx(bx, by);
    out.push({ x, y, r: 48, k: 0.35 });
  }
  const near = (x, y) => x > cam.x - 60 && x < cam.x + viewW + 60 && y > cam.y - 60 && y < cam.y + viewH + 60;
  for (const [x, y] of channelGlows()) if (near(x, y)) out.push({ x, y, r: 40, k: 0.4 });
  return out;
}

// The channels glow faintly all along their length, so the way through can be made out in the dark.
let glowSpots = null;
function channelGlows() {
  if (glowSpots) return glowSpots;
  glowSpots = [];
  for (const pts of GROTTO.channels) {
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k];
      const [bx, by] = pts[k + 1];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 4));
      for (let i = 0; i < n; i++) glowSpots.push(grottoPx(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n));
    }
  }
  return glowSpots;
}

// ---------- drawing ----------

function drawWhirlpool(cx, cy) {
  if (inGrotto()) return drawGrotto(cx, cy);
  if (indoors) return;
  const x = Math.round(WHIRL.x - cx);
  const y = Math.round(WHIRL.y - cy);
  const R = WHIRL.pull * 0.7;
  if (x < -R - 20 || y < -R - 20 || x > viewW + R + 20 || y > viewH + R + 20) return;
  // darker rings deepening towards the eye
  for (let i = 5; i >= 1; i--) {
    ctx.globalAlpha = 0.12;
    ellipse(ctx, x, y, R * (i / 5), R * (i / 5) * 0.7, '#0a2a3a');
  }
  ctx.globalAlpha = 1;
  ellipse(ctx, x, y, WHIRL.eye + 4, (WHIRL.eye + 4) * 0.7, '#0d3a4c');
  ellipse(ctx, x, y, WHIRL.eye, WHIRL.eye * 0.7, '#061820');
  ellipse(ctx, x, y, WHIRL.eye * 0.5, WHIRL.eye * 0.35, '#020a0e');
  // foam arms spiralling in, turning faster nearer the eye
  for (let arm = 0; arm < 5; arm++) {
    for (let i = 0; i < 46; i++) {
      const r = WHIRL.eye * 0.8 + (R - WHIRL.eye) * (i / 46);
      const a = (arm / 5) * Math.PI * 2 + r * 0.03 + time * (0.8 + 60 / r);
      ctx.globalAlpha = 0.85 * (1 - i / 46);
      rect(ctx, Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.7), i < 20 ? 3 : 2, 1, i % 3 ? PAL.foam : '#ffffff');
    }
  }
  ctx.globalAlpha = 1;
  // the jet's spout at the eye, falling back as the ship comes down
  const j = whirl.jet;
  if (j && j.phase === 'fall') drawSpout(x, y, JET_LIFT * (1 - Math.min(1, j.t / JET_FALL)) * 1.2, 1 - j.t / JET_FALL);
  if (shipObj.lift > 0) drawShadow(Math.round(shipObj.x - cx), Math.round(shipObj.y - 6 - cy), 26, 7, 0.2);
}

// A column of white water `h` high rising from (x, y).
function drawSpout(x, y, h, k = 1) {
  if (h < 2) return;
  ctx.globalAlpha = Math.max(0, Math.min(1, k));
  rect(ctx, x - 9, y - h, 18, h, '#bfe8f4');
  rect(ctx, x - 6, y - h, 12, h, '#e8faff');
  rect(ctx, x - 2, y - h, 3, h, '#ffffff');
  for (let i = 0; i < 6; i++) {
    const ph = (time * 3 + i / 6) % 1;
    ellipse(ctx, x + Math.sin(i * 2.3 + time * 8) * 9, y - h * ph, 3, 2, '#ffffff');
  }
  ellipse(ctx, x, y - h, 14, 6, '#ffffff');
  ellipse(ctx, x, y, 18, 7, PAL.foam);
  ctx.globalAlpha = 1;
}

// Glowing streaks racing along every channel, drawn over the dark so the way each current runs shows at a glance:
// a bright head with its tail trailing behind it.
function drawCurrents(cx, cy) {
  if (!inGrotto()) return;
  const r = ROOMS.grotto;
  const f = flowField();
  const x0 = Math.max(r.rx, Math.floor(cx / TILE));
  const y0 = Math.max(r.ry, Math.floor(cy / TILE));
  const x1 = Math.min(r.rx + r.w - 1, Math.floor((cx + viewW) / TILE));
  const y1 = Math.min(r.ry + r.h - 1, Math.floor((cy + viewH) / TILE));
  ctx.globalCompositeOperation = 'lighter';
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const i = ((ty - r.ry) * r.w + tx - r.rx) * 2;
      const fx = f[i];
      const fy = f[i + 1];
      if ((!fx && !fy) || hash(tx, ty, 143) < 0.35) continue;
      const s = Math.hypot(fx, fy);
      const ux = fx / s;
      const uy = fy / s;
      const h = hash(tx, ty, 141);
      const ph = (time * 1.3 + h) % 1;
      const hx = tx * TILE + 3 + h * 10 + ux * (ph - 0.5) * 20 - cx;
      const hy = ty * TILE + 3 + hash(tx, ty, 142) * 10 + uy * (ph - 0.5) * 20 - cy;
      const a = Math.sin(ph * Math.PI);
      ctx.globalAlpha = 0.35 * a;
      line(ctx, Math.round(hx - ux * 7), Math.round(hy - uy * 7), Math.round(hx - ux * 3), Math.round(hy - uy * 3), '#3fb8c8');
      ctx.globalAlpha = 0.7 * a;
      line(ctx, Math.round(hx - ux * 3), Math.round(hy - uy * 3), Math.round(hx), Math.round(hy), '#9ff4ff');
      px(ctx, Math.round(hx), Math.round(hy), '#ffffff');
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// The spring boiling in the jet's basin, and the jet itself while the ship rides it.
function drawGrotto(cx, cy) {
  const [jx, jy] = grottoPx(GROTTO.basins.jet[0], GROTTO.basins.jet[1]);
  const awake = jetAwake();
  ellipse(ctx, Math.round(jx - cx), Math.round(jy - cy), awake ? 12 : 6, awake ? 5 : 3, awake ? PAL.foam : '#2a6a7a');
  if (awake) ellipse(ctx, Math.round(jx - cx), Math.round(jy - cy - 2 - Math.abs(Math.sin(time * 9)) * 3), 6, 3, '#ffffff');
  const j = whirl.jet;
  if (j && j.phase === 'up') drawSpout(Math.round(jx - cx), Math.round(jy - cy), shipObj.lift + 20);
  if (shipObj.lift > 0) drawShadow(Math.round(shipObj.x - cx), Math.round(shipObj.y - 6 - cy), 26, 7, 0.25);
}
