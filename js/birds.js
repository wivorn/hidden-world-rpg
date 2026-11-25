// Birds up above the sea of cloud, flying at the dragon's height with their shadows on the cloud deck below:
// geese and cranes in a V, darting swifts, and an eagle wheeling on the high winds.

// Each kind side on and facing right: `len` and `h` the body, `neck` and `rise` how far the head sits out and up,
// `span` how far the wings reach, `wing` the stretch of the body the wings grow from.
const BIRD_LOOKS = {
  goose: { len: 9, h: 3, neck: 4, rise: 2, headR: 1, span: 6, wing: [0.25, 0.7], tail: 'fan', tl: 2, beak: 1,
    body: '#7d6e5c', belly: '#d9d0bf', wingC: '#6a5c4b', tip: '#3e352c', neckC: '#1d1b1a', head: '#1d1b1a', cheek: '#f2efe6', beakC: '#1d1b1a', tailC: '#1d1b1a' },
  swift: { len: 5, h: 2, neck: 1, rise: 0, headR: 1, span: 6, wing: [0.3, 0.6], tail: 'fork', tl: 4, beak: 1,
    body: '#3a3634', wingC: '#2c2826', tip: '#1a1716', head: '#3a3634', cheek: '#d8d2c8', beakC: '#111111', tailC: '#2c2826' },
  eagle: { len: 10, h: 4, neck: 2, rise: 1, headR: 2, span: 9, wing: [0.15, 0.8], tail: 'fan', tl: 3, beak: 2, droop: 1,
    body: '#5a3a1e', wingC: '#4b2f17', tip: '#22150a', neckC: '#f3efe4', head: '#f3efe4', beakC: '#e8b23a', tailC: '#f3efe4' },
  crane: { len: 9, h: 3, neck: 5, rise: 0, headR: 1, span: 9, wing: [0.15, 0.8], tail: 'short', tl: 1, beak: 3, legs: 4,
    body: '#c9ced3', belly: '#e6e9ec', wingC: '#aab1b8', tip: '#26292d', neckC: '#2b2e33', head: '#2b2e33', cheek: '#c8323a', beakC: '#5a5e64', tailC: '#c9ced3', legC: '#2b2e33' },
};

// How each kind flies: in what shape, how many, how fast, how far over the cloud deck, how fast it beats its
// wings and how much of the time it glides.
const BIRD_KINDS = {
  goose: { form: 'v', n: [5, 9], speed: 30, alt: [30, 64], flap: 4.5, glide: 0.15 },
  crane: { form: 'v', n: [4, 7], speed: 34, alt: [24, 60], flap: 3.2, glide: 0.25 },
  swift: { form: 'dart', n: [3, 6], speed: 60, alt: [18, 50], flap: 11, glide: 0.45 },
  eagle: { form: 'soar', n: [1, 1], speed: 14, alt: [36, 70], flap: 2.5, glide: 0.9 },
};

// Three frames, wings up, spread and down, facing right and then left. Seen from above, the far wing reaches up
// the screen and the near one down it, so each frame is how far up (-1) or down (1) each wing tip sits.
const BIRD_ART = {};
const WING_BEAT = [[-1, -0.45], [-0.6, 0.6], [-0.2, 1]];

function buildBird(o, [far, near]) {
  const pl = o.legs || 0;
  const tl = o.tl + pl;
  const W = tl + o.len + o.neck + o.headR * 2 + o.beak + 2;
  const H = o.span * 2 + o.h + 4;
  const by = o.span + 2;
  return sprite(W, H, (g) => {
    const x1 = tl + o.len;
    const s0 = tl + o.len * o.wing[0];
    const s1 = tl + o.len * o.wing[1];
    const wingAt = (lift, dx, color, tipC) => {
      if (Math.abs(lift) < 0.3) {
        ellipse(g, (s0 + s1) / 2 + dx, by - 1, (s1 - s0) / 2, 1, color);
        return;
      }
      const ty = by + Math.round(lift * o.span);
      const tx = s0 + (s1 - s0) * 0.3 + dx - 1;
      poly(g, [[s0 + dx, by], [s1 + dx, by], [tx + 1, ty], [tx - 1, ty]], color);
      line(g, tx, ty, tx + (s1 - tx) * 0.3, ty + (by - ty) * 0.3, tipC);
    };
    wingAt(far, -1, shade(o.wingC, -0.25), shade(o.tip, -0.25));
    if (o.legs) line(g, tl + 1, by + 1, 0, by + 1, o.legC);
    if (o.tail === 'fork') {
      line(g, tl, by, tl - o.tl, by - 2, o.tailC);
      line(g, tl, by, tl - o.tl, by + 1, o.tailC);
    } else if (o.tail === 'fan') poly(g, [[tl + 1, by - 1], [tl - o.tl, by - 1], [tl - o.tl, by + 2], [tl + 1, by + 1]], o.tailC);
    else rect(g, tl - o.tl, by, o.tl + 1, 1, o.tailC);
    ellipse(g, tl + o.len / 2, by, o.len / 2, (o.h - 1) / 2, o.body);
    if (o.belly) rect(g, tl + 2, by + Math.floor((o.h - 1) / 2), o.len - 3, 1, o.belly);
    const hx = x1 + o.neck;
    const hy = by - o.rise;
    if (o.neck) line(g, x1 - 1, by, hx, hy, o.neckC || o.body);
    ellipse(g, hx, hy, o.headR, o.headR > 1 ? o.headR - 0.5 : 0.6, o.head);
    if (o.cheek) px(g, hx + (o.headR > 1 ? 1 : 0), hy + (o.headR > 1 ? 0 : 1), o.cheek);
    line(g, hx + o.headR + 1, hy, hx + o.headR + o.beak, hy + (o.droop || 0), o.beakC);
    wingAt(near, 0, o.wingC, o.tip);
  }, false);
}

function buildBirdArt() {
  for (const [kind, o] of Object.entries(BIRD_LOOKS)) {
    const right = WING_BEAT.map((beat) => buildBird(o, beat));
    BIRD_ART[kind] = [right, right.map(mirror)];
  }
}
buildBirdArt();

const skyBirds = { flocks: [], wait: 1 };

// Which kinds might be about now, and how likely each is: they fly by day, and most of the geese are gone south
// in winter.
function birdOdds() {
  if (nightness() >= 0.4) return [];
  return [['goose', seasonNow().name === 'Winter' ? 1 : 3], ['crane', 2], ['swift', seasonNow().name === 'Winter' ? 0 : 2], ['eagle', 2]].filter(([, w]) => w > 0);
}

function pickBird(odds) {
  let r = Math.random() * odds.reduce((s, [, w]) => s + w, 0);
  for (const [kind, w] of odds) if ((r -= w) <= 0) return kind;
  return odds[0][0];
}

const randIn = ([a, b]) => a + Math.random() * (b - a);

// A flock comes in from beyond one edge of the view and heads across it.
function spawnFlock(kind) {
  const k = BIRD_KINDS[kind];
  const cx = cam.x + viewW / 2;
  const cy = cam.y + viewH / 2;
  const ang = Math.random() * Math.PI * 2;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const reach = Math.hypot(viewW, viewH) / 2 + 60;
  const side = (Math.random() - 0.5) * viewH * 0.8;
  const back = k.form === 'soar' ? reach * 0.7 : reach + 40;
  const n = Math.round(randIn([k.n[0], k.n[1] + 0.99]) - 0.49);
  skyBirds.flocks.push({
    kind, t: 0, ph: Math.random() * 6.28, life: (reach * 2 + 400) / k.speed,
    x: cx - dx * back - dy * side, y: cy - dy * back + dx * side, vx: dx * k.speed, vy: dy * k.speed,
    alt: randIn(k.alt), spin: Math.random() < 0.5 ? 1 : -1,
    members: Array.from({ length: n }, (_, i) => ({
      i, ph: Math.random() * 6.28, ox: (Math.random() - 0.5) * 36, oy: (Math.random() - 0.5) * 20,
      a: 0.6 + Math.random() * 0.7, b: 0.6 + Math.random() * 0.7, q: Math.random() * 6.28, lift: (Math.random() - 0.5) * 8,
    })),
  });
}

function updateFlocks(dt) {
  const list = skyBirds.flocks;
  const cx = cam.x + viewW / 2;
  const cy = cam.y + viewH / 2;
  const reach = Math.hypot(viewW, viewH) / 2 + 320;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    const k = BIRD_KINDS[f.kind];
    f.t += dt;
    if (k.form === 'dart') {
      const turn = Math.sin(f.t * 0.8 + f.ph) * dt * 0.7;
      [f.vx, f.vy] = [f.vx * Math.cos(turn) - f.vy * Math.sin(turn), f.vx * Math.sin(turn) + f.vy * Math.cos(turn)];
    }
    // they veer off from a dragon flying close by them
    if (flight) {
      const ax = f.x - flight.x;
      const ay = f.y - flight.y;
      const d = Math.hypot(ax, ay);
      if (d < 70 && d > 0) {
        const push = (1 - d / 70) * 140 * dt;
        f.vx += (ax / d) * push;
        f.vy += (ay / d) * push;
        f.scared = 1.5;
      }
    }
    const v = Math.hypot(f.vx, f.vy);
    const top = k.speed * (f.scared > 0 ? 2.2 : 1);
    if (v > top) {
      const ease = Math.max(top / v, 1 - dt * 1.5);
      f.vx *= ease;
      f.vy *= ease;
    }
    if (f.scared > 0) f.scared -= dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const gone = Math.hypot(f.x - cx, f.y - cy) > reach && (f.x - cx) * f.vx + (f.y - cy) * f.vy > 0;
    if (gone || f.t > f.life) list.splice(i, 1);
  }
}

function updateBirds(dt) {
  if (!started || indoors || !skyFade()) {
    skyBirds.flocks.length = 0;
    return;
  }
  updateFlocks(dt);
  if (!aloft() || (skyBirds.wait -= dt) > 0) return;
  const stormy = weather.kind === 'storm' || (weather.kind === 'rain' && weather.level > 0.5);
  skyBirds.wait = stormy ? 20 + Math.random() * 20 : 5 + Math.random() * 9;
  if (skyBirds.flocks.length >= 2 || (stormy && Math.random() < 0.7)) return;
  const odds = birdOdds();
  if (odds.length) spawnFlock(pickBird(odds));
}

// Where one bird of a flock is now: its spot on the cloud deck, its height over it and which way it faces (1 for
// right).
function birdAt(f, m) {
  const k = BIRD_KINDS[f.kind];
  const v = Math.hypot(f.vx, f.vy) || 1;
  const dx = f.vx / v;
  const dy = f.vy / v;
  let ox = 0;
  let oy = 0;
  let vx = f.vx;
  if (k.form === 'v') {
    const rank = Math.ceil(m.i / 2);
    const side = m.i % 2 ? 1 : -1;
    ox = -dx * rank * 10 - dy * side * rank * 8 + Math.sin(time * 1.1 + m.ph) * 1.2;
    oy = -dy * rank * 10 + dx * side * rank * 8 + Math.cos(time * 0.9 + m.ph) * 1.2;
  } else if (k.form === 'dart') {
    const w = 1.9 * m.a;
    ox = m.ox * 0.6 + Math.sin(time * w + m.ph) * 16;
    oy = m.oy * 0.6 + Math.cos(time * 2.6 * m.b + m.q) * 9;
    vx += Math.cos(time * w + m.ph) * 16 * w;
  } else if (k.form === 'soar') {
    const a = f.t * 0.45 * f.spin + m.ph;
    const r = 46;
    ox = Math.cos(a) * r;
    oy = Math.sin(a) * r * 0.55;
    vx += -Math.sin(a) * r * 0.45 * f.spin;
  }
  const face = Math.abs(vx) > 3 ? (vx > 0 ? 1 : -1) : m.i % 2 ? 1 : -1;
  return [f.x + ox, f.y + oy, f.alt + m.lift + Math.sin(time * 1.3 + m.ph) * 1.5, face];
}

// Spells of wingbeats broken by glides, longer glides for the kinds that ride the air.
function birdFrame(k, m) {
  if (Math.sin(time * 0.5 + m.ph * 3) > 1 - 2 * k.glide) return 1;
  return [0, 1, 2, 1][Math.floor(time * k.flap + m.ph * 4) & 3];
}

// Where a bird's shadow falls, cast away from the sun as the dragon's is.
const birdShadow = (x, y, alt) => [Math.round(x + (SHADE_SUN[0] * alt) / FLY_ALT), Math.round(y + (SHADE_SUN[1] * alt) / FLY_ALT)];

// The birds up above the clouds, with their shadows on the cloud deck beneath them.
function drawBirds(cx, cy) {
  const fade = skyFade();
  if (indoors || !fade || !skyBirds.flocks.length) return;
  const shadow = 0.16 * (1 - nightness() * 0.7);
  for (const f of skyBirds.flocks) {
    if (!onScreen(f.x, f.y - f.alt, cx, cy, 120)) continue;
    const k = BIRD_KINDS[f.kind];
    const art = BIRD_ART[f.kind];
    const spots = f.members.map((m) => [m, ...birdAt(f, m)]);
    ctx.fillStyle = '#24305e';
    ctx.globalAlpha = fade * shadow;
    const w = Math.round(BIRD_LOOKS[f.kind].span * 0.8);
    for (const [, x, y, alt] of spots) {
      const [gx, gy] = birdShadow(x - cx, y - cy, alt);
      ctx.fillRect(gx - w, gy, w * 2, 1);
      ctx.fillRect(gx - 1, gy - 1, 3, 3);
    }
    ctx.globalAlpha = fade;
    spots.sort((a, b) => a[2] - b[2]);
    for (const [m, x, y, alt, face] of spots) {
      const img = art[face > 0 ? 0 : 1][birdFrame(k, m)];
      ctx.drawImage(img, Math.round(x - cx - img.width / 2), Math.round(y - alt - cy - img.height / 2));
    }
  }
  ctx.globalAlpha = 1;
}
