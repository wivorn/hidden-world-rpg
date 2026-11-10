// Dolphins, whales and fish living in the sea around the islands.

const SEA_ART = {
  dolphin: null,
  dolphinL: null,
  hump: null,
  humpL: null,
  fluke: null,
};

function buildSeaArt() {
  const body = '#5f7fa6';
  const back = '#46658c';
  const dolphin = sprite(18, 10, (g) => {
    poly(g, [[7, 4], [9, 0], [11, 4]], back);
    poly(g, [[3, 5], [0, 2], [2, 5], [0, 9]], back);
    ellipse(g, 9, 5, 6, 2.5, body);
    ellipse(g, 9, 4, 4, 1, back);
    ellipse(g, 10, 6, 4, 1, '#cfdceb');
    poly(g, [[14, 4], [17, 5], [14, 6]], body);
    px(g, 13, 4, '#10141c');
  });
  const whale = '#34475f';
  const hump = sprite(42, 14, (g) => {
    ellipse(g, 21, 10, 19, 5, whale);
    ellipse(g, 20, 8, 15, 3, '#465d7d');
    ellipse(g, 17, 7, 8, 1, '#6680a3');
    poly(g, [[12, 6], [15, 2], [17, 6]], whale);
    for (const [x, y] of [[27, 8], [29, 9], [24, 10], [9, 10]]) px(g, x, y, '#c9d3dc');
    rect(g, 33, 6, 2, 1, '#1d2838');
  });
  const fluke = sprite(28, 14, (g) => {
    rect(g, 12, 6, 4, 8, whale);
    poly(g, [[14, 8], [1, 0], [3, 5], [12, 10]], whale);
    poly(g, [[14, 8], [27, 0], [25, 5], [16, 10]], whale);
    line(g, 2, 1, 12, 7, '#506a8c');
    line(g, 26, 1, 16, 7, '#506a8c');
  });
  Object.assign(SEA_ART, { dolphin, dolphinL: mirror(dolphin), hump, humpL: mirror(hump), fluke });

  // flippers sweep forward then back
  const turtle = [0, 1].map((f) => sprite(18, 13, (g) => {
    const skin = '#c2cc86';
    const fx = f ? -4 : 1;
    poly(g, [[7, 4], [10 + fx, 0], [13 + fx, 0], [11, 4]], skin);
    poly(g, [[7, 9], [10 + fx, 13], [13 + fx, 13], [11, 9]], skin);
    rect(g, 2, 3 + f, 3, 1, skin);
    rect(g, 2, 9 - f, 3, 1, skin);
    px(g, 1, 6, skin);
    ellipse(g, 14, 6, 2, 1.5, skin);
    px(g, 15, 5, '#10141c');
    ellipse(g, 7, 6, 5, 3.4, '#3e5530');
    ellipse(g, 7, 6, 4, 2.4, '#6b8a45');
    for (const [x, y] of [[5, 5], [9, 5], [7, 4], [5, 7], [9, 7], [7, 6]]) px(g, x, y, '#94ad5e');
    rect(g, 4, 9, 7, 1, '#2f4226');
  }));
  const seal = sprite(9, 7, (g) => {
    ellipse(g, 4, 4, 3.5, 3, '#77706a');
    ellipse(g, 4, 3, 2.5, 1.5, '#8d8680');
    ellipse(g, 7, 4, 1.5, 1, '#9b948d');
    px(g, 4, 3, '#10141c');
    px(g, 8, 4, '#10141c');
    px(g, 7, 5, '#d8d2ca');
  });
  const ink = { w: '#f4f4ef', k: '#2a2e33', g: '#c9cfd6' };
  const gull = [
    ['k.........k', '.w.......w.', '..ww...ww..', '....wgw....'],
    ['.ww.....ww.', 'k..ww.ww..k', '.....g.....'],
  ].map((rows) => sprite(11, 4, (g) => rows.forEach((r, y) => [...r].forEach((c, x) => c !== '.' && px(g, x, y, ink[c]))), false));
  Object.assign(SEA_ART, { turtle, turtleL: turtle.map(mirror), seal, sealL: mirror(seal), gull });

  // orcas: the back and tall fin as they roll at the surface, and the whole animal for a breach
  const ink2 = '#15181d';
  const orcaBack = sprite(32, 15, (g) => {
    ellipse(g, 16, 12, 14, 4, ink2);
    ellipse(g, 15, 10, 10, 1.5, '#2c323a');
    ellipse(g, 11, 10.5, 3, 1, '#8a929c');
    poly(g, [[12, 10], [15, 0], [17, 1], [18, 10]], ink2);
    line(g, 15, 1, 16, 8, '#2c323a');
    ellipse(g, 25, 10.5, 2, 1, '#f4f4ef');
  });
  const orca = sprite(36, 16, (g) => {
    poly(g, [[6, 9], [0, 4], [2, 9], [0, 14]], ink2);
    ellipse(g, 18, 9, 13, 4.5, ink2);
    ellipse(g, 20, 11.5, 9, 1.5, '#f4f4ef');
    poly(g, [[12, 7], [14, 0], [16, 1], [18, 6]], ink2);
    ellipse(g, 11, 6.5, 2.5, 1, '#8a929c');
    ellipse(g, 26, 6.5, 2.5, 1, '#f4f4ef');
    poly(g, [[19, 12], [21, 16], [24, 13]], ink2);
    poly(g, [[30, 8], [33, 9], [30, 11]], ink2);
    px(g, 28, 8, '#f4f4ef');
  });
  // spy-hopping orca, upright with its head out of the water and facing right
  const orcaSpy = sprite(16, 26, (g) => {
    poly(g, [[4, 26], [4, 10], [6, 3], [8, 0], [10, 1], [12, 5], [13, 12], [13, 26]], ink2);
    line(g, 5, 9, 5, 22, '#2c323a');
    poly(g, [[10, 3], [12, 6], [13, 11], [12, 22], [10, 22], [10, 10]], '#f4f4ef');
    poly(g, [[6, 8], [8, 7], [8, 12], [6, 13]], '#f4f4ef');
    poly(g, [[4, 18], [1, 23], [4, 22]], ink2);
    poly(g, [[13, 18], [15, 23], [13, 22]], ink2);
  });
  // sea lions: lying on the shore with the head down or raised, and a head at the surface while swimming
  const fur = '#5e4230';
  const lion = [0, 1].map((up) => sprite(22, 16, (g) => {
    const flip = '#3a281c';
    poly(g, [[0, 15], [1, 12], [4, 13], [3, 15]], flip);
    if (up) {
      poly(g, [[2, 14], [5, 11], [10, 9], [13, 6], [16, 5], [18, 9], [18, 14]], fur);
      poly(g, [[6, 13], [11, 11], [15, 9], [17, 13]], '#7a5a40');
      poly(g, [[13, 7], [15, 2], [18, 1], [18, 7]], fur);
      ellipse(g, 17, 2.5, 3, 2.2, fur);
      rect(g, 19, 2, 3, 2, '#8c6c4c');
      px(g, 21, 2, '#10141c');
      px(g, 17, 1, '#10141c');
    } else {
      poly(g, [[2, 14], [6, 11], [12, 10], [16, 10], [18, 14]], fur);
      poly(g, [[6, 13], [12, 12], [17, 13]], '#7a5a40');
      ellipse(g, 18, 11.5, 3, 2.2, fur);
      rect(g, 20, 11, 2, 2, '#8c6c4c');
      px(g, 21, 11, '#10141c');
      px(g, 18, 10, '#10141c');
    }
    poly(g, [[12, 12], [14, 15], [17, 15], [15, 11]], flip);
  }));
  const lionHead = sprite(10, 8, (g) => {
    ellipse(g, 4, 5, 3.5, 3, fur);
    ellipse(g, 4, 4, 2.5, 1.5, '#7a5a40');
    rect(g, 7, 4, 3, 2, '#8c6c4c');
    px(g, 4, 3, '#10141c');
    px(g, 9, 4, '#10141c');
  });
  Object.assign(SEA_ART, {
    orcaBack, orcaBackL: mirror(orcaBack), orca, orcaL: mirror(orca), orcaSpy, orcaSpyL: mirror(orcaSpy),
    lion, lionL: lion.map(mirror), lionHead, lionHeadL: mirror(lionHead),
  });
}

const seaLife = { pods: [], whales: [], schools: [], turtles: [], jellies: [], seals: [], gulls: [], mantas: [], orcas: [], lions: [] };

function depthAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (!inBounds(tx, ty) || tileAt(tx, ty) !== T.WATER) return 0;
  return seaDist[ty * MAP_W + tx];
}

function initSea() {
  buildSeaArt();
  const rng = mulberry32(7);
  const spot = (minD, maxD, apart, list) => {
    for (let i = 0; i < 400; i++) {
      const x = (2 + rng() * (MAP_W - 4)) * TILE;
      const y = (6 + rng() * (MAP_H - 8)) * TILE;
      const d = depthAt(x, y);
      if (d < minD || d > maxD) continue;
      if (list.some((o) => Math.hypot(o.x - x, o.y - y) < apart)) continue;
      return { x, y };
    }
    return null;
  };
  for (let i = 0; i < 14; i++) {
    const p = spot(6, 255, 300, seaLife.pods);
    if (!p) continue;
    const members = Array.from({ length: 2 + Math.floor(rng() * 2) }, (_, j) => ({
      ox: (j - 1) * 14 + rng() * 6, oy: (rng() - 0.5) * 18, phase: rng() * 3, up: false,
    }));
    seaLife.pods.push({ ...p, heading: rng() * Math.PI * 2, vx: 0, vy: 0, face: 1, side: rng() < 0.5 ? -1 : 1, members });
  }
  for (let i = 0; i < 8; i++) {
    const p = spot(9, 255, 500, seaLife.whales);
    if (p) seaLife.whales.push({ ...p, heading: rng() * Math.PI * 2, face: 1, t: rng() * 16, sang: false, spouts: 0 });
  }
  for (let i = 0; i < 170; i++) {
    const p = spot(1, 3, 70, seaLife.schools);
    if (!p) continue;
    const fish = Array.from({ length: 4 + Math.floor(rng() * 3) }, () => ({ a: rng() * 6.28, r: 3 + rng() * 7, s: 0.8 + rng() * 1.2 }));
    seaLife.schools.push({ ...p, hx: p.x, hy: p.y, vx: 0, vy: 0, fleeT: 0, jumpT: 3 + rng() * 10, jump: null, fish });
  }
  for (let i = 0; i < 28; i++) {
    const p = spot(3, 30, 220, seaLife.turtles);
    if (p) seaLife.turtles.push({ ...p, heading: rng() * Math.PI * 2, face: 1, phase: rng() * 14, diveT: 0, wakeT: 0 });
  }
  for (let i = 0; i < 40; i++) {
    const p = spot(4, 255, 260, seaLife.jellies);
    if (!p) continue;
    const members = Array.from({ length: 3 + Math.floor(rng() * 4) }, () => ({ ox: (rng() - 0.5) * 56, oy: (rng() - 0.5) * 34, phase: rng() * 6.28, r: 2 + Math.floor(rng() * 2) }));
    seaLife.jellies.push({ ...p, heading: rng() * Math.PI * 2, tint: ['#f4a6c8', '#a8c6f4', '#c9b0f0'][Math.floor(rng() * 3)], members });
  }
  for (let i = 0; i < 60; i++) {
    const p = spot(1, 2, 140, seaLife.seals);
    if (!p || inland[Math.floor(p.y / TILE) * MAP_W + Math.floor(p.x / TILE)]) continue;
    seaLife.seals.push({ ...p, hx: p.x, hy: p.y, tx: p.x, ty: p.y, t: rng() * 4, up: true, phase: rng() * 6 });
  }
  for (let i = 0; i < 20; i++) {
    const p = spot(2, 10, 420, seaLife.gulls);
    if (!p) continue;
    const birds = Array.from({ length: 3 + Math.floor(rng() * 3) }, () => ({ r: 16 + rng() * 26, a: rng() * 6.28, s: 0.45 + rng() * 0.35, alt: 34 + rng() * 22, flap: rng() * 6 }));
    seaLife.gulls.push({ ...p, birds });
  }
  for (let i = 0; i < 12; i++) {
    const p = spot(6, 255, 500, seaLife.mantas);
    if (p) seaLife.mantas.push({ ...p, heading: rng() * Math.PI * 2, phase: rng() * 6 });
  }
  for (let i = 0; i < 7; i++) {
    const p = spot(10, 255, 600, seaLife.orcas);
    if (!p) continue;
    const members = Array.from({ length: 2 + Math.floor(rng() * 3) }, (_, j) => ({ ox: (j - 1) * 22 + rng() * 8, oy: (rng() - 0.5) * 22, phase: rng() * 6 }));
    seaLife.orcas.push({ ...p, heading: rng() * Math.PI * 2, face: 1, members, breachT: 6 + rng() * 14, breach: null });
  }
  placeSeaLions(rng);
}

// Colonies lounge on beaches and rocky shores away from the harbour, each with a patch of water to slip into.
function placeSeaLions(rng) {
  const shore = (tx, ty) => {
    const t = tileAt(tx, ty);
    if (t !== T.SAND && t !== T.ROCK) return null;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const wx = tx + dx * 2;
      const wy = ty + dy * 2;
      if (inBounds(wx, wy) && tileAt(tx + dx, ty + dy) === T.WATER && depthAt((wx + 0.5) * TILE, (wy + 0.5) * TILE) >= 1 && !inland[(ty + dy) * MAP_W + tx + dx]) return [dx, dy];
    }
    return null;
  };
  const harbour = { x: shipObj.x, y: shipObj.y };
  for (let i = 0; i < 40000 && seaLife.lions.length < 16; i++) {
    const tx = Math.floor(rng() * MAP_W);
    const ty = Math.floor(rng() * MAP_H);
    if (!shore(tx, ty) || Math.hypot((tx + 0.5) * TILE - harbour.x, (ty + 0.5) * TILE - harbour.y) < 30 * TILE) continue;
    if (seaLife.lions.some((c) => Math.hypot(c.x - (tx + 0.5) * TILE, c.y - (ty + 0.5) * TILE) < 260)) continue;
    const members = [];
    for (let j = 0; j < 30 && members.length < 2 + Math.floor(rng() * 3); j++) {
      const mx = tx + Math.floor(rng() * 7) - 3;
      const my = ty + Math.floor(rng() * 5) - 2;
      const dir = shore(mx, my);
      if (!dir || members.some((m) => m.tx === mx && m.ty === my)) continue;
      const lx = (mx + 0.5) * TILE;
      const ly = (my + 0.7) * TILE;
      if (solidAt(lx - 8, ly - 4, lx + 8, ly)) continue;
      members.push({
        tx: mx, ty: my, lx, ly, x: lx, y: ly, wx: lx + dir[0] * 26, wy: ly + dir[1] * 26,
        kind: 'sealion', hp: WILD.sealion.hp, hurtT: 0,
        state: 'lounge', t: rng() * 6, face: dir[0] ? dir[0] : rng() < 0.5 ? 1 : -1, phase: rng() * 9, barkT: 3 + rng() * 10,
      });
    }
    if (members.length >= 2) seaLife.lions.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, members });
  }
}

function seaSplash(x, y, size = 1) {
  const n = Math.round(6 * size);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    particles.push({ type: 'wake', layer: 'water', x, y, vx: Math.cos(a) * 14 * size, vy: Math.sin(a) * 5 * size, life: 0, max: 0.6 });
  }
  for (let i = 0; i < n; i++) {
    particles.push({ type: 'drop', x: x + (Math.random() - 0.5) * 6, y, vx: (Math.random() - 0.5) * 30 * size, vy: -30 - Math.random() * 40 * size, life: 0, max: 0.45 });
  }
}

// Steers toward a heading while keeping to water at least `minDepth` deep.
function swimAlong(c, speed, minDepth, dt) {
  const lookX = c.x + Math.cos(c.heading) * 40;
  const lookY = c.y + Math.sin(c.heading) * 40;
  if (depthAt(lookX, lookY) < minDepth) c.heading += Math.PI * (0.6 + Math.random() * 0.3);
  const nx = c.x + Math.cos(c.heading) * speed * dt;
  const ny = c.y + Math.sin(c.heading) * speed * dt;
  if (depthAt(nx, ny) >= minDepth) {
    c.x = nx;
    c.y = ny;
  }
}

function updatePod(p, dt) {
  const ship = sail && Math.hypot(sail.vx, sail.vy) > 30 && Math.hypot(shipObj.x - p.x, shipObj.y - p.y) < 280;
  let vx;
  let vy;
  if (ship) {
    const sp = Math.hypot(sail.vx, sail.vy);
    const tx = shipObj.x - (sail.vy / sp) * 46 * p.side + (sail.vx / sp) * 20;
    const ty = shipObj.y - 14 + (sail.vx / sp) * 46 * p.side + (sail.vy / sp) * 20;
    const k = Math.min(1, dt * 1.5);
    const max = sp + 50;
    let dvx = (tx - p.x) * 1.4;
    let dvy = (ty - p.y) * 1.4;
    const m = Math.hypot(dvx, dvy);
    if (m > max) { dvx *= max / m; dvy *= max / m; }
    p.vx += (dvx - p.vx) * k;
    p.vy += (dvy - p.vy) * k;
    const nx = p.x + p.vx * dt;
    const ny = p.y + p.vy * dt;
    if (depthAt(nx, p.y) >= 2) p.x = nx;
    if (depthAt(p.x, ny) >= 2) p.y = ny;
    p.heading = Math.atan2(p.vy, p.vx);
    vx = p.vx;
  } else {
    p.heading += (Math.random() - 0.5) * dt * 1.2;
    const ox = p.x;
    swimAlong(p, 36, 4, dt);
    vx = (p.x - ox) / dt;
    p.vx = Math.cos(p.heading) * 36;
    p.vy = Math.sin(p.heading) * 36;
  }
  if (Math.abs(vx) > 4) p.face = vx > 0 ? 1 : -1;

  const near = earshot(p.x, p.y);
  for (const m of p.members) {
    const u = ((time + m.phase) % 2.6) / 0.75;
    const up = u < 1;
    if (up !== m.up && near > 0) {
      seaSplash(p.x + m.ox, p.y + m.oy, 0.8);
      if (up && Math.random() < 0.35) Sfx.dolphin(near);
    }
    m.up = up;
  }
}

function updateWhale(w, dt) {
  w.t = (w.t + dt) % 16;
  w.heading += (Math.random() - 0.5) * dt * 0.4;
  const ox = w.x;
  swimAlong(w, 11, 7, dt);
  if (Math.abs(w.x - ox) > 0.01) w.face = w.x > ox ? 1 : -1;
  const near = earshot(w.x, w.y);
  if (w.t < 1) { w.sang = false; w.spouts = 0; }
  if (w.t > 4 && !w.sang) {
    w.sang = true;
    if (near > 0.05 && Math.random() < 0.6) Sfx.whale(near);
  }
  const spoutAt = [8.6, 11];
  if (w.spouts < 2 && w.t > spoutAt[w.spouts]) {
    w.spouts++;
    if (near > 0) {
      const hx = w.x + w.face * 12;
      for (let i = 0; i < 44; i++) {
        particles.push({ type: 'drop', big: i % 2 === 0, x: hx + (Math.random() - 0.5) * 4, y: w.y - 9, vx: (Math.random() - 0.5) * 30, vy: -95 - Math.random() * 45, life: 0, max: 0.85 + Math.random() * 0.3 });
      }
      Sfx.spout(near);
    }
  }
  if (w.t > 14.4 && w.t - dt <= 14.4 && near > 0) seaSplash(w.x - w.face * 10, w.y - 2, 1.6);
}

// ---------- stunned fish ----------

// Lightning in the water stuns any school it reaches: a few of its fish float up belly-up for a while, to be
// scooped up by a dragon swooping low, and the school is back again later.
const FLOAT_LIFE = 40;
const FLOAT_SINK = 3;
const SCHOOL_BACK = 90;
const floaters = [];

function stunSchool(s) {
  if (!s.fish.length) return;
  const n = Math.min(3, Math.ceil(s.fish.length / 2));
  for (let i = 0; i < n; i++) {
    const x = s.x + (Math.random() - 0.5) * 28;
    const y = s.y + (Math.random() - 0.5) * 14;
    floaters.push({ x, y, id: pickFish({ x, y }), t: -i * 0.15, phase: Math.random() * 6, face: Math.random() < 0.5 ? 1 : -1 });
  }
  Object.assign(s, { spare: s.fish, fish: [], backT: SCHOOL_BACK, jump: null });
  seaSplash(s.x, s.y, 0.5);
}

function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += dt;
    if (f.t >= FLOAT_LIFE) floaters.splice(i, 1);
  }
}

// Belly-up on the surface, rocking with the swell, and sinking away once their time's up.
function drawFloaters(cx, cy) {
  for (const f of floaters) {
    if (f.t < 0 || !onScreen(f.x, f.y, cx, cy)) continue;
    const img = SPR.icon[f.id];
    const rise = Math.min(1, f.t / 0.4);
    const sink = Math.max(0, (f.t - (FLOAT_LIFE - FLOAT_SINK)) / FLOAT_SINK);
    const x = Math.round(f.x - cx);
    const y = Math.round(f.y - cy + Math.sin(time * 2 + f.phase) * 0.6);
    ctx.globalAlpha = 0.5 * rise * (1 - sink);
    strokeRing(x, y + 1, 7 + Math.sin(time * 3 + f.phase), 2.5, '#dbe7f2');
    ctx.globalAlpha = rise * (1 - sink);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 1.6 + f.phase) * 0.12);
    ctx.scale(f.face, -1);
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function updateSchool(s, dt) {
  if (!s.fish.length && s.backT > 0 && (s.backT -= dt) <= 0) s.fish = s.spare;
  const threat = (player.swimming && !flight) ? [player.x, player.y] : shipMoving() ? [shipObj.x, shipObj.y - 6] : null;
  if (threat && s.fleeT <= 0 && Math.hypot(threat[0] - s.x, threat[1] - s.y) < (sail ? 60 : 36)) {
    const a = Math.atan2(s.y - threat[1], s.x - threat[0]);
    s.vx = Math.cos(a) * 90;
    s.vy = Math.sin(a) * 90;
    s.fleeT = 0.8;
  }
  if (s.fleeT > 0) {
    s.fleeT -= dt;
  } else {
    s.vx += ((s.hx - s.x) * 0.4 + Math.sin(time * 0.5 + s.hx) * 8 - s.vx) * Math.min(1, dt);
    s.vy += ((s.hy - s.y) * 0.4 + Math.cos(time * 0.4 + s.hy) * 6 - s.vy) * Math.min(1, dt);
  }
  const nx = s.x + s.vx * dt;
  const ny = s.y + s.vy * dt;
  if (depthAt(nx, s.y) >= 1) s.x = nx; else s.vx *= -0.5;
  if (depthAt(s.x, ny) >= 1) s.y = ny; else s.vy *= -0.5;

  if (s.jump) {
    s.jump.t += dt;
    if (s.jump.t > 0.5) {
      seaSplash(s.jump.x + s.jump.dir * 10, s.jump.y, 0.4);
      s.jump = null;
    }
  } else if (s.fish.length && (s.jumpT -= dt) <= 0) {
    s.jumpT = 5 + Math.random() * 10;
    const near = earshot(s.x, s.y);
    if (near > 0) {
      s.jump = { x: s.x, y: s.y, t: 0, dir: Math.random() < 0.5 ? -1 : 1 };
      seaSplash(s.x, s.y, 0.4);
    }
  }
}

const shipMoving = () => !!sail && Math.hypot(sail.vx, sail.vy) > 20;
const shipNear = (x, y, r) => shipMoving() && Math.hypot(shipObj.x - x, shipObj.y - 10 - y) < r;
const turtleUp = (t) => t.diveT <= 0 && (time + t.phase) % 14 < 10;

function updateTurtle(t, dt) {
  t.heading += (Math.random() - 0.5) * dt * 0.6;
  const ox = t.x;
  swimAlong(t, t.diveT > 0 ? 20 : 7, 2, dt);
  if (Math.abs(t.x - ox) > 0.001) t.face = t.x > ox ? 1 : -1;
  if (t.diveT > 0) {
    t.diveT -= dt;
  } else if (shipNear(t.x, t.y, 70)) {
    t.diveT = 5;
    if (earshot(t.x, t.y) > 0) seaSplash(t.x, t.y, 0.4);
  }
  if (turtleUp(t) && (t.wakeT -= dt) <= 0 && onScreen(t.x, t.y, cam.x, cam.y, 0)) {
    t.wakeT = 0.5;
    particles.push({ type: 'wake', layer: 'water', x: t.x - t.face * 7, y: t.y + 1, vx: 0, vy: 0, life: 0, max: 0.9 });
  }
}

function updateJellies(j, dt) {
  j.heading += (Math.random() - 0.5) * dt * 0.3;
  swimAlong(j, 3, 3, dt);
}

// A seal bobs with its head up for a while, ducks under, and comes up again somewhere close by.
function updateSeal(s, dt) {
  s.t += dt;
  const scared = shipNear(s.x, s.y, 60) || (player.swimming && Math.hypot(player.x - s.x, player.y - s.y) < 34);
  if (s.up) {
    if (s.t < 3 + (s.phase % 3) && !scared) return;
    Object.assign(s, { up: false, t: 0 });
    const a = Math.random() * Math.PI * 2;
    const r = 20 + Math.random() * 40;
    const tx = s.hx + Math.cos(a) * r;
    const ty = s.hy + Math.sin(a) * r * 0.6;
    if (depthAt(tx, ty) >= 1) Object.assign(s, { tx, ty });
    if (earshot(s.x, s.y) > 0) seaSplash(s.x, s.y, 0.35);
    return;
  }
  const dx = s.tx - s.x;
  const dy = s.ty - s.y;
  const d = Math.hypot(dx, dy);
  if (d > 1) {
    s.x += (dx / d) * Math.min(d, 34 * dt);
    s.y += (dy / d) * Math.min(d, 34 * dt);
  } else if (s.t > 2.5 && !scared) {
    Object.assign(s, { up: true, t: 0 });
    if (earshot(s.x, s.y) > 0) seaSplash(s.x, s.y, 0.25);
  }
}

function updateGulls(f, dt) {
  for (const b of f.birds) b.a += b.s * dt;
}

function updateManta(m, dt) {
  m.heading += (Math.random() - 0.5) * dt * 0.5;
  swimAlong(m, 13, 5, dt);
}

// Each orca rolls up to show its back and fin every few seconds; now and then one leaps clear out of the water,
// or spy-hops: rises head-first, has a look round and slips back down while the pod waits.
const ORCA_CYCLE = 5.5;
const ORCA_UP = 2.2;
const BREACH_TIME = 1.2;
const SPY_TIME = 3.4;
const SPY_RISE = 0.2;
const orcaUp = (m) => (time + m.phase) % ORCA_CYCLE < ORCA_UP;
const busy = (p, m) => (p.breach && p.breach.m === m) || (p.spy && p.spy.m === m);

function updateOrcas(p, dt) {
  const near = earshot(p.x, p.y);
  const spying = updateSpyHop(p, near, dt);
  if (!spying) {
    p.heading += (Math.random() - 0.5) * dt * 0.7;
    const ox = p.x;
    swimAlong(p, 30, 6, dt);
    if (Math.abs(p.x - ox) > 0.01) p.face = p.x > ox ? 1 : -1;
  }
  for (const m of p.members) {
    const up = orcaUp(m);
    if (up && !m.up && near > 0 && !busy(p, m)) {
      seaSplash(p.x + m.ox, p.y + m.oy, 0.5);
      if (Math.random() < 0.25) Sfx.orca(near);
    }
    m.up = up;
  }
  const b = p.breach;
  if (b) {
    b.t += dt;
    if (b.t >= BREACH_TIME) {
      p.breach = null;
      if (near > 0) {
        seaSplash(p.x + b.m.ox + p.face * 26, p.y + b.m.oy, 1.8);
        Sfx.splash(0.6 * near);
      }
    }
  } else if (!spying && (p.breachT -= dt) <= 0) {
    p.breachT = 10 + Math.random() * 18;
    if (near > 0) {
      const m = p.members[Math.floor(Math.random() * p.members.length)];
      p.breach = { m, t: 0 };
      seaSplash(p.x + m.ox, p.y + m.oy, 1.2);
      Sfx.orca(near);
    }
  }
}

// Returns true while a spy-hop holds the pod still.
function updateSpyHop(p, near, dt) {
  const s = p.spy;
  if (s) {
    s.t += dt;
    if (s.t >= SPY_TIME) {
      p.spy = null;
      if (near > 0) seaSplash(p.x + s.m.ox, p.y + s.m.oy, 0.7);
      return false;
    }
    return true;
  }
  if (p.breach || (p.spyT = (p.spyT ?? 8 + Math.random() * 20) - dt) > 0) return false;
  p.spyT = 14 + Math.random() * 24;
  if (near <= 0) return false;
  const m = p.members[Math.floor(Math.random() * p.members.length)];
  p.spy = { m, t: 0, face: p.face };
  seaSplash(p.x + m.ox, p.y + m.oy, 0.6);
  if (Math.random() < 0.5) Sfx.orca(near);
  return true;
}

// A sea lion lounges and barks on the shore, flops into the sea when someone comes close,
// swims about a while and hauls itself back out once they've gone. One brought down on land is gone till it respawns.
const lionAlive = (s) => s.state !== 'down' && s.state !== 'gone';
const lionStartled = (s) => (!flight && !player.swimming && !sail && Math.hypot(player.x - s.lx, player.y - s.ly) < 52) || shipNear(s.lx, s.ly, 70);

function updateLion(s, scared, dt) {
  s.t += dt;
  if (s.hurtT > 0) s.hurtT -= dt;
  if (s.state === 'down') {
    if (s.t >= DOWN_TIME) {
      Object.assign(s, { x: s.lx - (s.wx - s.lx) * 0.3, y: s.ly - (s.wy - s.ly) * 0.3 });
      dropMeat(s);
    }
    return;
  }
  if (s.state === 'gone') {
    if ((s.respawnT -= dt) <= 0 && Math.hypot(player.x - s.lx, player.y - s.ly) > 320) {
      Object.assign(s, { state: 'swim', t: 0, x: s.wx, y: s.wy, hp: WILD.sealion.hp });
    }
    return;
  }
  const go = (tx, ty, speed) => {
    const dx = tx - s.x;
    const dy = ty - s.y;
    const d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 1) s.face = dx > 0 ? 1 : -1;
    if (d <= 1) return true;
    s.x += (dx / d) * Math.min(d, speed * dt);
    s.y += (dy / d) * Math.min(d, speed * dt);
    return false;
  };
  if (s.state === 'lounge') {
    if (scared) {
      Object.assign(s, { state: 'flop', t: 0 });
      return;
    }
    if ((s.barkT -= dt) <= 0) {
      s.barkT = 6 + Math.random() * 12;
      s.barkUp = 1.2;
      const k = earshot(s.x, s.y);
      if (k > 0) Sfx.sealion(0.8 * k);
    }
    if (s.barkUp > 0) s.barkUp -= dt;
  } else if (s.state === 'flop') {
    if (go(s.wx, s.wy, 30)) {
      Object.assign(s, { state: 'swim', t: 0, sx: s.wx, sy: s.wy });
      if (earshot(s.x, s.y) > 0) seaSplash(s.x, s.y, 0.6);
    }
  } else if (s.state === 'swim') {
    const a = s.t * 0.7 + s.phase;
    const tx = s.wx + Math.cos(a) * 16;
    const ty = s.wy + Math.sin(a) * 8;
    if (depthAt(tx, ty) >= 1) go(tx, ty, 26);
    if (s.t > 9 && !scared) Object.assign(s, { state: 'haul', t: 0 });
  } else if (s.state === 'haul') {
    if (scared) Object.assign(s, { state: 'swim', t: 0 });
    else if (go(s.lx, s.ly, 16)) Object.assign(s, { state: 'lounge', t: 0, face: s.face });
  }
}

// Wave crests that rise, roll along and fade at random spots of open water in view.
const waves = [];
let waveT = 0;

function overHull(x, y) {
  const [x0, y0, x1, y1] = shipBox(shipObj.facing, shipObj.x, shipObj.y);
  return x > x0 - 16 && x < x1 + 8 && y > y0 - 20 && y < y1 + 8;
}

function updateWaves(dt) {
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    w.t += dt;
    w.x += 4 * dt;
    w.y += 1.2 * dt;
    if (w.t >= w.max) waves.splice(i, 1);
  }
  if (indoors) return;
  // wind whips up more and bigger whitecaps
  const wind = weatherNow('wind');
  waveT -= dt * (1 + wind * 2.5);
  while (waveT <= 0) {
    waveT += 0.15 + Math.random() * 0.2;
    if (waves.length >= (viewW * viewH / 12000) * (1 + wind * 2)) break;
    const x = cam.x + Math.random() * viewW;
    const y = cam.y + Math.random() * viewH;
    if (depthAt(x, y) < 2 || depthAt(x + 14, y) < 2 || overHull(x, y)) continue;
    waves.push({ x, y, t: 0, max: 2.4 + Math.random() * 1.8, len: 7 + Math.floor(Math.random() * (8 + wind * 8)), cap: Math.random() < 0.35 + wind * 0.4 });
  }
}

function updateSea(dt) {
  for (const p of seaLife.pods) updatePod(p, dt);
  for (const w of seaLife.whales) updateWhale(w, dt);
  for (const s of seaLife.schools) updateSchool(s, dt);
  updateFloaters(dt);
  for (const t of seaLife.turtles) updateTurtle(t, dt);
  for (const j of seaLife.jellies) updateJellies(j, dt);
  for (const s of seaLife.seals) updateSeal(s, dt);
  for (const f of seaLife.gulls) updateGulls(f, dt);
  for (const m of seaLife.mantas) updateManta(m, dt);
  for (const p of seaLife.orcas) updateOrcas(p, dt);
  for (const c of seaLife.lions) {
    const scared = c.members.some((s) => lionAlive(s) && lionStartled(s));
    for (const s of c.members) updateLion(s, scared, dt);
  }
  updateWaves(dt);
}

const onScreen = (x, y, cx, cy, m = 60) => x > cx - m && x < cx + viewW + m && y > cy - m && y < cy + viewH + m;

// Shapes seen through the water, drawn right after the ground.
function drawSeaUnder(cx, cy) {
  for (const s of seaLife.schools) {
    if (!onScreen(s.x, s.y, cx, cy)) continue;
    const spread = s.fleeT > 0 ? 1.8 : 1;
    ctx.globalAlpha = 0.35;
    for (const f of s.fish) {
      const a = time * f.s + f.a;
      const x = Math.round(s.x + Math.cos(a) * f.r * spread - cx);
      const y = Math.round(s.y + Math.sin(a) * f.r * 0.5 * spread - cy);
      rect(ctx, x - 1, y, 3, 1, '#16304f');
    }
  }
  for (const p of seaLife.pods) {
    if (!onScreen(p.x, p.y, cx, cy)) continue;
    ctx.globalAlpha = 0.3;
    for (const m of p.members) {
      if (m.up) continue;
      ellipse(ctx, Math.round(p.x + m.ox - cx), Math.round(p.y + m.oy - cy), 6, 2, '#16304f');
    }
  }
  for (const w of seaLife.whales) {
    if (!onScreen(w.x, w.y, cx, cy, 80)) continue;
    ctx.globalAlpha = w.t > 8 && w.t < 12.5 ? 0.18 : 0.28;
    ellipse(ctx, Math.round(w.x - cx), Math.round(w.y - cy), 22, 7, '#16304f');
    ellipse(ctx, Math.round(w.x - w.face * 24 - cx), Math.round(w.y - cy), 6, 3, '#16304f');
  }
  for (const p of seaLife.orcas) {
    if (!onScreen(p.x, p.y, cx, cy, 80)) continue;
    ctx.globalAlpha = 0.3;
    for (const m of p.members) {
      if (m.up || busy(p, m)) continue;
      ellipse(ctx, Math.round(p.x + m.ox - cx), Math.round(p.y + m.oy - cy), 12, 3, '#16304f');
    }
  }
  ctx.globalAlpha = 0.26;
  for (const m of seaLife.mantas) if (onScreen(m.x, m.y, cx, cy)) drawManta(m, cx, cy);
  ctx.globalAlpha = 0.3;
  for (const t of seaLife.turtles) {
    if (turtleUp(t) || !onScreen(t.x, t.y, cx, cy)) continue;
    const x = Math.round(t.x - cx);
    const y = Math.round(t.y - cy);
    ellipse(ctx, x, y, 4, 2, '#16304f');
    rect(ctx, x + t.face * 3 - 1, y - 2, 3, 5, '#16304f');
  }
  for (const s of seaLife.seals) {
    if (s.up || !onScreen(s.x, s.y, cx, cy)) continue;
    ellipse(ctx, Math.round(s.x - cx), Math.round(s.y - cy), 5, 1.5, '#16304f');
  }
  for (const j of seaLife.jellies) if (onScreen(j.x, j.y, cx, cy)) drawJellies(j, cx, cy);
  ctx.globalAlpha = 1;
  drawWaves(cx, cy);
  drawFloaters(cx, cy);
}

function drawManta(m, cx, cy) {
  const c = Math.cos(m.heading);
  const s = Math.sin(m.heading);
  const flap = Math.sin(time * 1.8 + m.phase) * 2.5;
  const at = ([fx, fy]) => [Math.round(m.x - cx + fx * c - fy * s), Math.round(m.y - cy + (fx * s + fy * c) * 0.7)];
  poly(ctx, [[9, 0], [flap - 1, -13], [-5, -2], [-7, 0], [-5, 2], [flap - 1, 13]].map(at), '#16304f');
  const [ax, ay] = at([-6, 0]);
  const [bx, by] = at([-18, Math.sin(time * 2 + m.phase) * 2]);
  line(ctx, ax, ay, bx, by, '#16304f');
}

function drawJellies(j, cx, cy) {
  const rim = shade(j.tint, 0.5);
  for (const m of j.members) {
    const p = Math.sin(time * 2.2 + m.phase);
    const x = Math.round(j.x + m.ox + Math.sin(time * 0.3 + m.phase) * 4 - cx);
    const y = Math.round(j.y + m.oy - (p > 0 ? p : 0) * 1.5 - cy);
    const squash = p < -0.3 ? 1 : 0;
    const r = m.r + squash;
    const h = m.r - squash;
    ctx.globalAlpha = 0.35;
    for (let k = -1; k <= 1; k++) {
      for (let i = 0; i < 4 + (k === 0 ? 1 : 0); i++) {
        px(ctx, x + k * (r - 1) + Math.round(Math.sin(time * 3 + m.phase + k + i * 0.9) * 0.7), y + 2 + i, j.tint);
      }
    }
    ctx.globalAlpha = 0.6;
    for (let dy = -h; dy <= 0; dy++) {
      const dx = Math.round(r * Math.sqrt(1 - (dy / (h + 0.5)) ** 2));
      rect(ctx, x - dx, y + dy, dx * 2 + 1, 1, j.tint);
    }
    ctx.globalAlpha = 0.45;
    for (let i = -r; i <= r; i += 2) px(ctx, x + i, y + 1, rim);
    ctx.globalAlpha = 0.8;
    px(ctx, x - 1, y - h + 1, rim);
  }
}

// A crest is a pale swell line over a dark trough; its bright top rolls along it, breaking into foam on whitecaps.
function drawWaves(cx, cy) {
  drawShoreFoam(cx, cy);
  for (const w of waves) {
    const u = w.t / w.max;
    const a = Math.sin(u * Math.PI);
    const len = Math.round(w.len * (0.5 + 0.5 * Math.min(1, u * 2)));
    const x = Math.round(w.x - cx - len / 2);
    const y = Math.round(w.y - cy);
    const top = Math.max(2, Math.round(len * 0.45));
    const tx = x + Math.round((len - top) * u);
    ctx.globalAlpha = 0.35 * a;
    rect(ctx, x + 2, y + 1, len - 1, 1, '#16438a');
    ctx.globalAlpha = 0.6 * a;
    rect(ctx, x, y, len, 1, '#9fd2fa');
    ctx.globalAlpha = a;
    rect(ctx, tx, y - 1, top, 1, PAL.foam);
    if (w.cap && u > 0.3 && u < 0.8) {
      px(ctx, tx + top, y - 2, '#ffffff');
      px(ctx, tx + top - 2, y - 2, '#ffffff');
      if (u > 0.5) px(ctx, tx + top + 1, y - 3, '#ffffff');
    }
  }
  ctx.globalAlpha = 1;
}

// Foam lapping up to the shore and drawing back, in a ripple that runs along the coast.
function drawShoreFoam(cx, cy) {
  const open = (t) => t === T.WATER || t === T.WOOD;
  const x0 = Math.max(0, Math.floor(cx / TILE));
  const y0 = Math.max(0, Math.floor(cy / TILE));
  const x1 = Math.min(MAP_W - 1, Math.floor((cx + viewW) / TILE));
  const y1 = Math.min(MAP_H - 1, Math.floor((cy + viewH) / TILE));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * MAP_W + x;
      if (map[i] !== T.WATER || seaDist[i] !== 1) continue;
      const s = Math.sin(time * 1.3 - (x + y) * 0.45 + hash(x, y, 9));
      if (s < 0.1) continue;
      const d = 1 + Math.round((1 - s) * 3);
      const X = x * TILE - cx;
      const Y = y * TILE - cy;
      const l = !open(tileAt(x - 1, y));
      const r = !open(tileAt(x + 1, y));
      const t = !open(tileAt(x, y - 1));
      const b = !open(tileAt(x, y + 1));
      ctx.globalAlpha = 0.5 * s;
      if (t) rect(ctx, X + (l ? 4 : 0), Y + 1 + d, 16 - (l ? 4 : 0) - (r ? 4 : 0), 1, PAL.foam);
      if (b) rect(ctx, X + (l ? 4 : 0), Y + 14 - d, 16 - (l ? 4 : 0) - (r ? 4 : 0), 1, PAL.foam);
      if (l) rect(ctx, X + d, Y + (t ? 4 : 0), 1, 16 - (t ? 4 : 0) - (b ? 4 : 0), PAL.foam);
      if (r) rect(ctx, X + 15 - d, Y + (t ? 4 : 0), 1, 16 - (t ? 4 : 0) - (b ? 4 : 0), PAL.foam);
    }
  }
  ctx.globalAlpha = 1;
}

// Gulls wheeling over the water near the shore, drawn above everything else.
function drawSeaSky(cx, cy) {
  for (const f of seaLife.gulls) {
    if (!onScreen(f.x, f.y, cx, cy, 120)) continue;
    for (const b of f.birds) {
      const x = Math.round(f.x + Math.cos(b.a) * b.r - cx);
      const y = Math.round(f.y + Math.sin(b.a) * b.r * 0.6 - cy);
      ctx.globalAlpha = 0.15;
      rect(ctx, x - 2, y, 5, 1, '#000000');
      ctx.globalAlpha = 1;
      const flapping = Math.sin(time * 0.7 + b.flap) > 0.2;
      const frame = flapping ? Math.floor(time * 7 + b.flap) % 2 : 1;
      ctx.drawImage(SEA_ART.gull[frame], x - 5, Math.round(y - b.alt + Math.sin(time * 1.3 + b.flap) * 2));
    }
  }
}

// Creatures breaking the surface, y-sorted with everything else.
function seaSprites(cx, cy) {
  const out = [];
  for (const p of seaLife.pods) {
    if (!onScreen(p.x, p.y, cx, cy)) continue;
    for (const m of p.members) {
      if (!m.up) continue;
      const u = ((time + m.phase) % 2.6) / 0.75;
      const x = p.x + m.ox + (u - 0.5) * 22 * p.face;
      const y = p.y + m.oy;
      out.push({ y, draw: () => drawDolphin(x - cx, y - cy, u, p.face) });
    }
  }
  for (const w of seaLife.whales) {
    if (!onScreen(w.x, w.y, cx, cy, 80)) continue;
    if (w.t > 8 && w.t < 12.5) out.push({ y: w.y, draw: () => drawHump(w, cx, cy) });
    else if (w.t >= 12.5 && w.t < 14.5) out.push({ y: w.y, draw: () => drawFluke(w, cx, cy) });
  }
  for (const s of seaLife.schools) {
    if (!s.jump || !onScreen(s.x, s.y, cx, cy)) continue;
    const j = s.jump;
    const u = j.t / 0.5;
    const x = Math.round(j.x + j.dir * u * 10 - cx);
    const y = Math.round(j.y - Math.sin(u * Math.PI) * 8 - cy);
    out.push({ y: j.y, draw: () => { rect(ctx, x - 1, y, 3, 1, '#dbe7f2'); px(ctx, x - j.dir * 2, y, '#9fb3c8'); } });
  }
  for (const t of seaLife.turtles) {
    if (turtleUp(t) && onScreen(t.x, t.y, cx, cy)) out.push({ y: t.y, draw: () => drawTurtle(t, cx, cy) });
  }
  for (const s of seaLife.seals) {
    if (s.up && onScreen(s.x, s.y, cx, cy)) out.push({ y: s.y, draw: () => drawSeal(s, cx, cy) });
  }
  for (const p of seaLife.orcas) {
    if (!onScreen(p.x, p.y, cx, cy, 80)) continue;
    for (const m of p.members) {
      const y = p.y + m.oy;
      if (p.breach && p.breach.m === m) out.push({ y, draw: () => drawBreach(p, m, cx, cy) });
      else if (p.spy && p.spy.m === m) out.push({ y, draw: () => drawSpyHop(p, m, cx, cy) });
      else if (m.up) out.push({ y, draw: () => drawOrcaBack(p, m, cx, cy) });
    }
  }
  for (const c of seaLife.lions) {
    if (!onScreen(c.x, c.y, cx, cy, 90)) continue;
    for (const s of c.members) out.push({ y: s.y, draw: () => drawLion(s, cx, cy) });
  }
  return out;
}

function drawOrcaBack(p, m, cx, cy) {
  const u = ((time + m.phase) % ORCA_CYCLE) / ORCA_UP;
  const h = Math.round(Math.sin(u * Math.PI) * 10);
  const x = Math.round(p.x + m.ox + (u - 0.5) * 16 * p.face - cx) - 16;
  const y = Math.round(p.y + m.oy - cy);
  const img = p.face > 0 ? SEA_ART.orcaBack : SEA_ART.orcaBackL;
  if (h > 0) ctx.drawImage(img, 0, 0, 32, h + 2, x, y - h - 2, 32, h + 2);
  ctx.globalAlpha = 0.7;
  ellipse(ctx, x + 16, y - 1, 12 + Math.sin(time * 3 + m.phase), 1.5, PAL.foam);
  ctx.globalAlpha = 1;
}

function drawBreach(p, m, cx, cy) {
  const u = p.breach.t / BREACH_TIME;
  const h = Math.sin(u * Math.PI) * 30;
  const img = p.face > 0 ? SEA_ART.orca : SEA_ART.orcaL;
  const x = p.x + m.ox + (u - 0.2) * 34 * p.face - cx;
  const y = p.y + m.oy - cy;
  ctx.globalAlpha = 0.25;
  ellipse(ctx, Math.round(x), Math.round(y), 12, 3, '#16304f');
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y - h - 4));
  ctx.rotate((u - 0.5) * 1.4 * p.face);
  ctx.drawImage(img, -18, -8);
  ctx.restore();
}

function drawSpyHop(p, m, cx, cy) {
  const u = p.spy.t / SPY_TIME;
  const out = Math.min(u / SPY_RISE, (1 - u) / SPY_RISE, 1);
  const h = Math.round((1 - (1 - out) ** 2) * 21 + (out === 1 ? Math.sin(p.spy.t * 3) : 0));
  if (h <= 0) return;
  // it turns to look the other way halfway through
  const face = u > 0.35 && u < 0.7 ? -p.spy.face : p.spy.face;
  const x = Math.round(p.x + m.ox - cx);
  const y = Math.round(p.y + m.oy - cy);
  ctx.drawImage(face > 0 ? SEA_ART.orcaSpy : SEA_ART.orcaSpyL, 0, 0, 16, h, x - 8, y - h, 16, h);
  ctx.globalAlpha = 0.75;
  ellipse(ctx, x, y, 7 + Math.sin(time * 4) * 0.7, 1.6, PAL.foam);
  ctx.globalAlpha = 1;
}

function drawLion(s, cx, cy) {
  if (s.state === 'gone' || (s.hurtT > 0 && Math.floor(s.hurtT * 20) % 2)) return;
  const x = Math.round(s.x - cx);
  const y = Math.round(s.y - cy);
  if (s.state === 'down') {
    ctx.globalAlpha = Math.max(0, 1 - s.t / DOWN_TIME);
    drawShadow(x, y, 9, 2);
    ctx.drawImage((s.face > 0 ? SEA_ART.lion : SEA_ART.lionL)[0], x - 11, y - 15);
    ctx.globalAlpha = 1;
    return;
  }
  if (depthAt(s.x, s.y) > 0) {
    const img = s.face > 0 ? SEA_ART.lionHead : SEA_ART.lionHeadL;
    const by = y + Math.round(Math.sin(time * 2.6 + s.phase) * 0.8);
    ctx.drawImage(img, x - 5, by - 7);
    ctx.globalAlpha = 0.6;
    ellipse(ctx, x, by, 6, 1, PAL.foam);
    ctx.globalAlpha = 1;
    return;
  }
  const moving = s.state === 'flop' || s.state === 'haul';
  const up = moving || s.barkUp > 0 || (time + s.phase) % 11 > 4 ? 1 : 0;
  const bob = moving ? Math.round(Math.abs(Math.sin(time * 8 + s.phase)) * -2) : 0;
  drawShadow(x, y, 9, 2);
  ctx.drawImage((s.face > 0 ? SEA_ART.lion : SEA_ART.lionL)[up], x - 11, y - 15 + bob);
}

function drawTurtle(t, cx, cy) {
  const f = Math.floor((time + t.phase) * 2.4) % 2;
  const x = Math.round(t.x - cx);
  const y = Math.round(t.y - cy + Math.sin(time * 2 + t.phase) * 0.6);
  ctx.drawImage((t.face > 0 ? SEA_ART.turtle : SEA_ART.turtleL)[f], x - 9, y - 7);
  ctx.globalAlpha = 0.5;
  const w = Math.round(Math.sin(time * 3 + t.phase));
  rect(ctx, x - 11 - w, y + 4, 3 + w, 1, PAL.foam);
  rect(ctx, x + 8, y + 4, 3 + w, 1, PAL.foam);
  ctx.globalAlpha = 1;
}

function drawSeal(s, cx, cy) {
  const rise = Math.min(1, s.t / 0.35);
  const h = Math.max(1, Math.round(rise * 7));
  const img = Math.sin(time * 0.8 + s.phase) > 0 ? SEA_ART.seal : SEA_ART.sealL;
  const x = Math.round(s.x - cx) - 4;
  const y = Math.round(s.y - cy + Math.sin(time * 2.4 + s.phase) * 0.8);
  ctx.drawImage(img, 0, 0, 9, h, x, y - h, 9, h);
  ctx.globalAlpha = 0.6;
  ellipse(ctx, x + 4, y, 5 + Math.round(Math.sin(time * 3 + s.phase) * 0.6), 1, PAL.foam);
  ctx.globalAlpha = 1;
}

function drawDolphin(x, y, u, face) {
  const h = Math.sin(u * Math.PI) * 14;
  const img = face > 0 ? SEA_ART.dolphin : SEA_ART.dolphinL;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y - h - 3));
  ctx.rotate((u - 0.5) * 1.6 * face);
  ctx.drawImage(img, -9, -5);
  ctx.restore();
}

function drawHump(w, cx, cy) {
  const u = (w.t - 8) / 4.5;
  const rise = Math.min(1, u * 5, (1 - u) * 5);
  const h = Math.round(rise * 9);
  const x = Math.round(w.x - cx) - 21;
  const y = Math.round(w.y - cy);
  const img = w.face > 0 ? SEA_ART.hump : SEA_ART.humpL;
  if (h > 0) ctx.drawImage(img, 0, 0, 42, h + 3, x, y - h - 3, 42, h + 3);
  ctx.globalAlpha = 0.7;
  ellipse(ctx, x + 21, y - 1, 19 + Math.sin(time * 3), 2, PAL.foam);
  ctx.globalAlpha = 1;
}

function drawFluke(w, cx, cy) {
  const u = (w.t - 12.5) / 2;
  const h = Math.round(Math.sin(u * Math.PI) * 14);
  const x = Math.round(w.x - w.face * 10 - cx) - 14;
  const y = Math.round(w.y - cy);
  if (h > 0) ctx.drawImage(SEA_ART.fluke, 0, 0, 28, h, x, y - h - 1, 28, h);
  ctx.globalAlpha = 0.7;
  ellipse(ctx, x + 14, y - 1, 6, 1.5, PAL.foam);
  ctx.globalAlpha = 1;
}
