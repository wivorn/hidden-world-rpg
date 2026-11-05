// Title screen backdrop: a moonlit fjord at dusk, behind the hero picker.

const TITLE_SKY = ['#0a0d26', '#0f1333', '#161b42', '#1f2452', '#2c2d62', '#3e3570', '#5a3f7c', '#7e4a80', '#a8577e', '#d06f74', '#ec9268', '#f6b46a'];
const TITLE_SEA = ['#3a3570', '#272a5c', '#1c2050', '#161a44', '#11153a', '#0d1030'];
let title = null;

// Night tint so daytime sprites sit in the scene; `k` is how much of the sky colour washes over them.
function nightTint(img, k, color = '#0a0d26') {
  const c = makeCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = k;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// A mountain range of overlapping peaks; slopes facing the moon (to the right) catch its light.
function ridge(g, W, horizon, amp, seed, color) {
  const rng = mulberry32(seed);
  const peaks = [];
  for (let x = -30 + rng() * 30; x < W + 60; x += 26 + rng() * 44) peaks.push({ x, h: amp * (0.4 + rng() * 0.6), w: 34 + rng() * 50 });
  let jag = 0;
  for (let x = 0; x < W; x++) {
    if (x % 4 === 0) jag = Math.round((rng() - 0.5) * 3);
    let h = 0;
    let peak = peaks[0];
    for (const p of peaks) {
      const v = p.h * Math.max(0, 1 - Math.abs(x - p.x) / p.w);
      if (v > h) { h = v; peak = p; }
    }
    const top = Math.round(horizon - h + (h > 6 ? jag : 0));
    const lit = x > peak.x;
    rect(g, x, top, 1, horizon - top + 1, color.body);
    if (lit) rect(g, x, top, 1, Math.round((horizon - top) * 0.55), color.lit);
    const cap = h - peak.h * 0.7;
    if (color.snow && cap > 0) rect(g, x, top, 1, Math.round(cap * 0.8) + 1, lit ? color.snow : color.snowDark);
  }
}

function pine(g, x, y, h, color) {
  for (let i = 0; i < h; i++) {
    const w = Math.max(1, Math.round((i / h) * h * 0.45 * (1 - (i % 4) * 0.12)));
    rect(g, x - w, y - h + i, w * 2 + 1, 1, color);
  }
  rect(g, x, y, 1, 3, color);
}

function buildTitle(W, H) {
  const horizon = Math.round(H * 0.64);
  const sky = makeCanvas(W, H);
  let g = sky.getContext('2d');
  const band = horizon / TITLE_SKY.length;
  for (let i = 0; i < TITLE_SKY.length; i++) {
    const y0 = Math.round(i * band);
    const y1 = Math.round((i + 1) * band);
    rect(g, 0, y0, W, y1 - y0, TITLE_SKY[i]);
    if (i + 1 < TITLE_SKY.length) for (let y = y1 - 2; y < y1; y++) for (let x = y & 1; x < W; x += 2) px(g, x, y, TITLE_SKY[i + 1]);
  }
  const moon = { x: Math.round(W * 0.74), y: Math.round(H * 0.2), r: Math.max(9, Math.round(H * 0.065)) };
  for (let k = 4; k >= 1; k--) {
    g.globalAlpha = 0.06;
    ellipse(g, moon.x, moon.y, moon.r + k * 6, moon.r + k * 6, '#f6e7c1');
  }
  g.globalAlpha = 1;
  ellipse(g, moon.x, moon.y, moon.r, moon.r, '#f4ecd2');
  ellipse(g, moon.x + moon.r * 0.25, moon.y - moon.r * 0.1, moon.r * 0.75, moon.r * 0.8, '#fbf5e2');
  for (const [dx, dy, r] of [[-0.35, -0.2, 0.22], [0.2, 0.35, 0.16], [0.35, -0.35, 0.1], [-0.1, 0.45, 0.09]]) {
    ellipse(g, moon.x + dx * moon.r, moon.y + dy * moon.r, moon.r * r, moon.r * r, '#ddd1b0');
  }

  const land = makeCanvas(W, H);
  g = land.getContext('2d');
  ridge(g, W, horizon, H * 0.34, 7, { body: '#2a2b5e', lit: '#3b3f7c', snow: '#d4d8f0', snowDark: '#8f96c6' });
  ridge(g, W, horizon, H * 0.2, 19, { body: '#181a42', lit: '#232659', snow: '#9aa2d0', snowDark: '#5d6498' });
  const seaBand = (H - horizon) / TITLE_SEA.length;
  for (let i = 0; i < TITLE_SEA.length; i++) rect(g, 0, Math.round(horizon + i * seaBand), W, Math.ceil(seaBand) + 1, TITLE_SEA[i]);
  rect(g, 0, horizon, W, 1, '#b8697a');

  const front = makeCanvas(W, H);
  g = front.getContext('2d');
  const cliff = '#0b0c24';
  const lw = Math.round(W * 0.2);
  for (let x = 0; x < lw; x++) {
    const u = x / lw;
    const top = Math.round(horizon - H * 0.08 + Math.pow(u, 2.2) * (H - horizon + H * 0.12));
    rect(g, x, top, 1, H - top, cliff);
  }
  for (let x = W - Math.round(W * 0.16); x < W; x++) {
    const u = (W - x) / (W * 0.16);
    const top = Math.round(horizon + H * 0.02 + Math.pow(u, 1.8) * (H - horizon));
    rect(g, x, top, 1, H - top, cliff);
  }
  const rng = mulberry32(5);
  for (let i = 0; i < 9; i++) {
    const x = Math.round(rng() * lw * 0.8);
    const u = x / lw;
    pine(g, x, Math.round(horizon - H * 0.08 + Math.pow(u, 2.2) * (H - horizon + H * 0.12)) + 1, Math.round(H * (0.09 + rng() * 0.07)), cliff);
  }
  for (let i = 0; i < 5; i++) {
    const x = W - 2 - Math.round(rng() * W * 0.1);
    const u = (W - x) / (W * 0.16);
    pine(g, x, Math.round(horizon + H * 0.02 + Math.pow(u, 1.8) * (H - horizon)) + 1, Math.round(H * (0.07 + rng() * 0.06)), cliff);
  }

  const srng = mulberry32(11);
  const stars = Array.from({ length: Math.round(W * H / 900) }, () => ({ x: Math.floor(srng() * W), y: Math.floor(srng() * horizon * 0.75), p: srng() * 6.28, big: srng() < 0.08 }));
  const flakes = Array.from({ length: 70 }, () => ({ x: srng() * W, y: srng() * H, s: 6 + srng() * 10, p: srng() * 6.28 }));
  const glints = Array.from({ length: 40 }, () => ({ x: srng() * W, y: horizon + 3 + srng() * (H - horizon - 3), w: 2 + Math.floor(srng() * 4), p: srng() * 6.28 }));
  const ship = nightTint(SPR.ship.dirs.right.img, 0.5);
  title = { W, H, horizon, moon, sky, land, front, stars, flakes, glints, ship };
}

function drawTitle(t) {
  const W = viewW;
  const H = viewH;
  if (!title || title.W !== W || title.H !== H) buildTitle(W, H);
  const { horizon, moon } = title;
  ctx.drawImage(title.sky, 0, 0);

  for (const s of title.stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + s.p);
    ctx.globalAlpha = 0.35 + tw * 0.65;
    px(ctx, s.x, s.y, '#fff6d8');
    if (s.big && tw > 0.7) {
      ctx.globalAlpha = 0.5;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(ctx, s.x + dx, s.y + dy, '#fff6d8');
    }
  }

  // aurora: two ribbons of light swaying across the top of the sky
  for (const [y0, amp, colors, ph] of [[0.1, 0.05, ['#5cf2b0', '#2fc8a8'], 0], [0.17, 0.035, ['#7ad0ff', '#8a6cf0'], 2]]) {
    for (let x = 0; x < W; x += 2) {
      const y = H * y0 + Math.sin(x * 0.012 + t * 0.25 + ph) * H * amp + Math.sin(x * 0.033 - t * 0.4) * H * 0.015;
      const len = H * 0.1 * (0.55 + 0.45 * Math.sin(x * 0.021 + t * 0.6 + ph));
      const glow = 0.5 + 0.5 * Math.sin(x * 0.05 - t * 1.1 + ph);
      ctx.globalAlpha = 0.1 + glow * 0.12;
      ctx.fillStyle = colors[0];
      ctx.fillRect(x, Math.round(y), 2, Math.round(len * 0.4));
      ctx.globalAlpha = 0.05 + glow * 0.07;
      ctx.fillStyle = colors[1];
      ctx.fillRect(x, Math.round(y + len * 0.4), 2, Math.round(len * 0.6));
    }
  }
  ctx.globalAlpha = 1;

  ctx.drawImage(title.land, 0, 0);

  for (let y = horizon + 2; y < H; y += 2) {
    const k = (y - horizon) / (H - horizon);
    const w = Math.round((4 + k * moon.r * 1.6) * (0.6 + 0.4 * Math.sin(t * 2.2 + y * 0.7)));
    ctx.globalAlpha = 0.55 * (1 - k * 0.6);
    rect(ctx, moon.x - (w >> 1) + Math.round(Math.sin(t * 1.3 + y) * 2), y, w, 1, '#f4ecd2');
  }
  for (const s of title.glints) {
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 1.7 + s.p);
    rect(ctx, Math.round((s.x + t * 4) % W), Math.round(s.y), s.w, 1, '#4a56a0');
  }
  ctx.globalAlpha = 1;

  // the longship drifts across the fjord
  const sw = title.ship.width;
  const sx = Math.round(((t * 7 + W * 0.35 + sw) % (W + sw * 2)) - sw);
  const sy = Math.round(horizon + (H - horizon) * 0.55 + Math.sin(t * 1.6) * 1.5);
  ctx.drawImage(title.ship, sx - 52, sy - 80);
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 4; i++) rect(ctx, sx - 50 - i * 9 - Math.round((t * 12) % 9), sy + 1 + (i & 1), 5 - i, 1, '#c9d6f0');
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 9);
  ellipse(ctx, sx - 22, sy - 20, 6, 6, '#ffb45a');
  ctx.globalAlpha = 1;
  rect(ctx, sx - 23, sy - 21, 2, 2, '#ffd890');

  ctx.drawImage(title.front, 0, 0);

  ctx.globalAlpha = 0.75;
  for (const f of title.flakes) {
    const y = (f.y + t * f.s) % H;
    const x = (f.x + Math.sin(t * 0.8 + f.p) * 6 + W) % W;
    px(ctx, Math.round(x), Math.round(y), '#e8ecff');
  }
  ctx.globalAlpha = 1;
}
