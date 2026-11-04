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
}

const seaLife = { pods: [], whales: [], schools: [] };

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
  for (let i = 0; i < 5; i++) {
    const p = spot(6, 255, 300, seaLife.pods);
    if (!p) continue;
    const members = Array.from({ length: 2 + Math.floor(rng() * 2) }, (_, j) => ({
      ox: (j - 1) * 14 + rng() * 6, oy: (rng() - 0.5) * 18, phase: rng() * 3, up: false,
    }));
    seaLife.pods.push({ ...p, heading: rng() * Math.PI * 2, vx: 0, vy: 0, face: 1, side: rng() < 0.5 ? -1 : 1, members });
  }
  for (let i = 0; i < 3; i++) {
    const p = spot(9, 255, 500, seaLife.whales);
    if (p) seaLife.whales.push({ ...p, heading: rng() * Math.PI * 2, face: 1, t: rng() * 16, sang: false, spouts: 0 });
  }
  for (let i = 0; i < 45; i++) {
    const p = spot(1, 3, 70, seaLife.schools);
    if (!p) continue;
    const fish = Array.from({ length: 4 + Math.floor(rng() * 3) }, () => ({ a: rng() * 6.28, r: 3 + rng() * 7, s: 0.8 + rng() * 1.2 }));
    seaLife.schools.push({ ...p, hx: p.x, hy: p.y, vx: 0, vy: 0, fleeT: 0, jumpT: 3 + rng() * 10, jump: null, fish });
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

function updateSchool(s, dt) {
  const threat = (player.swimming && !flight) ? [player.x, player.y] : sail ? [shipObj.x, shipObj.y - 6] : null;
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

function updateSea(dt) {
  for (const p of seaLife.pods) updatePod(p, dt);
  for (const w of seaLife.whales) updateWhale(w, dt);
  for (const s of seaLife.schools) updateSchool(s, dt);
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
  ctx.globalAlpha = 1;
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
  return out;
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
