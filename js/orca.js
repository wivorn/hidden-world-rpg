// Orcas, all drawn from the one model: a body traced round its spine, with the dorsal fin, flippers and flukes, and
// the black and white of it laid over the top, then flat-shaded and outlined like the rest of the sprites. Any orca
// can be drawn at any size, heading any of sixteen ways, as its tail beats up and down; and no two in a pod look
// quite alike, from the bull with his tall straight fin to the calf, still peach where it'll turn white.

const ORCA_FRAMES = 8;
// Snout to the root of the flukes, in px, for an orca of size 1: at the surface, a good three times the height of
// someone swimming or standing on its back, and down below to scale with a diver.
const ORCA_SEA_LEN = 60;
const ORCA_DEEP_LEN = 70;
// The foam, shadows, leaps and spacing round orcas at the surface are given for one 32px long, and grow with it.
const ORCA_SEA_K = ORCA_SEA_LEN / 32;
// How many ways round it's drawn heading, numbered from right (0) on round clockwise, down the screen first; and how
// fast it swings round to a new heading, in radians a second, so a turn sweeps through the ways in between.
const ORCA_DIRS = 16;
const ORCA_STEP = (2 * Math.PI) / ORCA_DIRS;
const ORCA_RIGHT = 0;
const ORCA_LEFT = ORCA_DIRS / 2;
const ORCA_TURN = 6;
// How far the root of the flukes rises and falls with each beat, in lengths.
const ORCA_BEND = 0.12;
const ORCA_LIGHT = [0, 0.33, 0.94];
const ORCA_INK = { k: '#15181d', k2: '#2c323a', rim: '#46505e', eye: '#9aa6b4', scar: '#363d47' };
const ORCA_SADDLES = ['#8a929c', '#a3abb4', '#737b86'];
// The flukes' outline across one half, back from their root (a) and out from the middle (b), in lengths.
const ORCA_FLUKE = [[-0.03, 0], [-0.03, 0.03], [0.05, 0.08], [0.105, 0.155], [0.14, 0.172], [0.153, 0.15], [0.14, 0.08], [0.125, 0.03], [0.113, 0]];

const orcaAngle = (dir) => dir * ORCA_STEP;

// The way nearest heading `a`, holding on to the last one `prev` until it's well past halfway to the next.
function orcaDir(a, prev) {
  if (prev != null) {
    const d = a - orcaAngle(prev);
    if (Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < ORCA_STEP / 2 + 0.06) return prev;
  }
  return ((Math.round(a / ORCA_STEP) % ORCA_DIRS) + ORCA_DIRS) % ORCA_DIRS;
}

// Heading `a` swung toward `to` by no more than it can turn in `dt`.
function orcaTurn(a, to, dt) {
  const d = Math.atan2(Math.sin(to - a), Math.cos(to - a));
  return a + Math.max(-ORCA_TURN * dt, Math.min(ORCA_TURN * dt, d));
}

// The ways on the left of the screen are drawn as mirrors of ones on the right: which, or null for the right half.
const orcaMirror = (dir) => (Math.cos(orcaAngle(dir)) < -1e-6 ? (ORCA_LEFT - dir + ORCA_DIRS) % ORCA_DIRS : null);
// Coming toward the viewer, so its fin's nearer than anyone on its back.
const orcaAhead = (dir) => Math.sin(orcaAngle(dir)) > 0.3;
// Near enough straight up or down the screen to be seen from above rather than side on.
const orcaUpright = (dir) => Math.abs(Math.sin(orcaAngle(dir))) > 0.85;
// Which of the four ways a person on its back faces.
const orcaFacing = (dir) => (orcaUpright(dir) ? (Math.sin(orcaAngle(dir)) > 0 ? 'down' : 'up') : Math.cos(orcaAngle(dir)) > 0 ? 'right' : 'left');

// A lone orca is an old bull; a pod is a family of cows and their young, led by a bull once it's big enough.
const orcaRole = (j, n) => (n === 1 || (n >= 4 && j === 0) ? 'bull' : n >= 3 && j === n - 1 ? 'calf' : j % 2 ? 'young' : 'cow');

// One orca's looks, from a seed so that the same animal always looks the same.
function orcaLook(seed, role) {
  const rng = mulberry32(seed);
  const r = (a, b) => a + rng() * (b - a);
  const bull = role === 'bull';
  const calf = role === 'calf';
  const white = calf ? '#ecd6bf' : '#f4f4ef';
  const saddle = ORCA_SADDLES[Math.floor(rng() * ORCA_SADDLES.length)];
  const look = {
    seed, role,
    size: { bull: r(1.15, 1.25), cow: r(0.92, 1.02), young: r(0.74, 0.82), calf: r(0.55, 0.62) }[role],
    finH: { bull: r(0.28, 0.32), cow: r(0.15, 0.18), young: r(0.13, 0.15), calf: r(0.1, 0.11) }[role],
    lean: bull ? r(-0.01, 0.02) : r(0.05, 0.09),
    flipper: bull ? 1.35 : 1,
    // the eye patch: how big, how far back and how steeply it climbs
    patch: [r(0.85, 1.2), r(-0.02, 0.025), r(0.8, 1.7)],
    nick: rng() < 0.3 ? r(0.35, 0.7) : 0,
    scars: Array.from({ length: bull ? 1 + Math.floor(rng() * 2) : Math.floor(rng() * 1.6) }, () => [r(0.3, 0.78), r(-0.2, 0.55), r(-0.7, 0.7)]),
    views: new Map(),
  };
  const rgb = (hex) => {
    const [cr, cg, cb] = hexToRgb(hex);
    return (cr << 16) | (cg << 8) | cb;
  };
  look.ink = {
    k: rgb(ORCA_INK.k), k2: rgb(ORCA_INK.k2), rim: rgb(ORCA_INK.rim), eye: rgb(ORCA_INK.eye), scar: rgb(ORCA_INK.scar),
    w: rgb(white), wD: rgb(shade(white, -0.2)), s: rgb(saddle), sD: rgb(shade(saddle, -0.22)),
  };
  return look;
}

// Half the body's height and half its width at `x`, from the snout (0) to the root of the flukes (1), in lengths.
function orcaGirth(x) {
  if (x <= 0 || x > 1) return [0, 0];
  const h = x < 0.3 ? 0.135 * Math.sqrt(1 - ((x - 0.3) / 0.3) ** 2) : 0.038 + 0.097 * ((1 + Math.cos((Math.PI * (x - 0.3)) / 0.7)) / 2) ** 0.75;
  return [h, h * (x < 0.3 ? 0.85 : 0.85 - (0.5 * (x - 0.3)) / 0.7)];
}

// How far up its side (s, -1 under the belly to 1 along the back) the white comes at `x`: the chin and throat,
// the belly, and the patch sweeping up the flank behind the fin.
function orcaBelly(x) {
  if (x < 0.015 || x > 0.86) return -2;
  if (x < 0.17) return -0.12;
  if (x < 0.3) return -0.12 - (0.48 * (x - 0.17)) / 0.13;
  if (x < 0.55) return -0.6 - (0.2 * (x - 0.3)) / 0.25;
  const t = (x - 0.55) / 0.31;
  return -0.8 + 1.05 * (t < 0.3 ? Math.sin((Math.PI / 2) * (t / 0.3)) : Math.cos((Math.PI / 2) * ((t - 0.3) / 0.7)));
}

// What the skin is at `x` along the body, `s` up it and `c` out to the side (0 on the midline, 1 square to the side).
function orcaSkin(look, x, s, c) {
  const [ps, pdx, slant] = look.patch;
  const ex = (x - 0.2 - pdx) / (0.06 * ps);
  const es = (s - 0.3 - (x - 0.2 - pdx) * slant) / (0.2 * ps);
  if (c > 0.3 && ex * ex + es * es < 1) return 'w';
  if (c > 0.55 && ((x - 0.135) / 0.013) ** 2 + ((s - 0.06) / 0.13) ** 2 < 1) return 'eye';
  if (s < orcaBelly(x)) return 'w';
  if (s > 0.6 && ((x - 0.6) / 0.085) ** 2 + ((1 - s) / 0.32) ** 2 < 1) return 's';
  if (c > 0.3) {
    for (const [x0, s0, ang] of look.scars) {
      const dx = x - x0;
      const ds = (s - s0) * 0.1;
      const p = dx * Math.cos(ang) + ds * Math.sin(ang);
      const q = ds * Math.cos(ang) - dx * Math.sin(ang);
      if (Math.abs(p) < 0.035) for (let i = 0; i < 3; i++) if (Math.abs(q - i * 0.014) < 0.0045) return 'scar';
    }
  }
  return 'k';
}

function orcaTone(P, m, d) {
  if (m === 'w') return d < -0.3 ? P.wD : P.w;
  if (m === 's') return d > 0.55 ? P.s : P.sD;
  if (m === 'k2' || m === 'eye' || m === 'scar') return P[m];
  return d > 0.97 ? P.rim : d > 0.85 ? P.k2 : P.k;
}

// The dorsal fin's outline, as [x along the body, height above the back], leading edge first; a bull's stands
// tall and straight, a cow's is shorter and swept back.
function orcaFin(look) {
  const x0 = 0.37;
  const H = look.finH;
  const tip = [x0 + 0.07 + look.lean, H];
  const bez = (a, b, c, t) => [0, 1].map((i) => (1 - t) ** 2 * a[i] + 2 * t * (1 - t) * b[i] + t * t * c[i]);
  const lead = Array.from({ length: 13 }, (_, i) => bez([x0, 0], [x0 + 0.015, H * 0.65], tip, i / 12));
  const trail = Array.from({ length: 13 }, (_, i) => bez(tip, [x0 + 0.085 + look.lean * 0.35, H * 0.3], [0.53, 0], i / 12));
  return { lead, trail, H, poly: [[x0, -0.03], ...lead, ...trail.slice(1), [0.53, -0.03]] };
}

// Where a diver's hands go on the fin, as [x, height above the back].
function orcaGrip(look) {
  return [0.44 + look.lean * 0.3, look.finH * 0.3];
}

function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const orcaTilt = (a) => ((15 + 45 * Math.sin(a) ** 2) * Math.PI) / 180;

// One pose of the model turned to the screen. `pose`: L its length in px, a its heading, phi how steeply it's looked
// down on, beat where in the tail's beat it is (or still), arch how far it's bowed to roll at the surface and pitch
// how far the snout is raised.
function orcaXf(pose) {
  const L = pose.L;
  const kick = pose.still ? 0 : Math.sin(2 * Math.PI * pose.beat);
  const swing = pose.still ? 0 : Math.cos(2 * Math.PI * pose.beat);
  const arch = pose.arch || 0;
  const zc = (x) => (x > 0.4 ? ORCA_BEND * kick * ((x - 0.4) / 0.6) ** 2 : (-0.015 * kick * (0.4 - x)) / 0.4) - arch * ((x - 0.45) / 0.55) ** 2;
  const ca = Math.cos(pose.a);
  const sa = Math.sin(pose.a);
  const cp = Math.cos(pose.pitch || 0);
  const sp = Math.sin(pose.pitch || 0);
  const sf = Math.sin(pose.phi);
  const cf = Math.cos(pose.phi);
  // along the body toward the snout, across it and up, to the world: x right, y down the screen, z up
  const turn = (f, v, z) => {
    const f2 = f * cp - z * sp;
    return [f2 * ca - v * sa, f2 * sa + v * ca, f * sp + z * cp];
  };
  // a point at x along the body, v across and z up from its spine (or from straight, unbent), to the screen, how
  // near the viewer it is and how high it is in the world
  const put = (x, v, z, bent = true) => {
    const [X, Y, Z] = turn((0.45 - x) * L, v * L, (z + (bent ? zc(x) : 0)) * L);
    return [X, Y * sf - Z * cf, Y * cf + Z * sf, Z];
  };
  return { L, swing, zc, turn, put, toward: [0, cf, sf] };
}

// Every point over the orca's skin and fins in one pose, handed to `emit` with its colour, `density` to the px.
function orcaSplats(look, xf, emit, density) {
  const { L, zc } = xf;
  const P = look.ink;
  const step = 1 / (L * density);
  const splat = (x, v, z, n, mat, fin = false, bent = true) => {
    const [sx, sy, d, wz] = xf.put(x, v, z, bent);
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    let [nx, ny, nz] = xf.turn(n[0] / len, n[1] / len, n[2] / len);
    const back = nx * xf.toward[0] + ny * xf.toward[1] + nz * xf.toward[2] < 0;
    if (back && typeof mat === 'function') [nx, ny, nz] = [-nx, -ny, -nz];
    const m = typeof mat === 'function' ? mat(back) : mat;
    emit(sx, sy, d, orcaTone(P, m, nx * ORCA_LIGHT[0] + ny * ORCA_LIGHT[1] + nz * ORCA_LIGHT[2]), fin, wz);
  };

  for (let x = step / 2; x <= 1; x += step) {
    const [h, w] = orcaGirth(x);
    if (h < 0.002) continue;
    const e = 0.002;
    const [ha, wa] = orcaGirth(x - e);
    const [hb, wb] = orcaGirth(Math.min(1, x + e));
    const dh = (hb - ha) / (2 * e);
    const dw = (wb - wa) / (2 * e);
    const dz = (zc(x + e) - zc(x - e)) / (2 * e);
    const n = Math.max(12, Math.ceil(2 * Math.PI * h * L * density));
    for (let j = 0; j < n; j++) {
      const t = (j / n) * 2 * Math.PI;
      const c = Math.cos(t);
      const s = Math.sin(t);
      splat(x, w * c, h * s, [(c * c * dw) / w + (s * s * dh) / h + (s * dz) / h, c / w, s / h], orcaSkin(look, x, s, Math.abs(c)));
    }
  }

  const fin = orcaFin(look);
  const nickAt = look.nick && fin.trail[Math.round((1 - look.nick) * 12)];
  const leadX = (q) => {
    for (let i = 1; i < fin.lead.length; i++) {
      const [xa, qa] = fin.lead[i - 1];
      const [xb, qb] = fin.lead[i];
      if (q <= qb) return xa + ((xb - xa) * (q - qa)) / (qb - qa || 1);
    }
    return fin.lead[fin.lead.length - 1][0];
  };
  const fx1 = Math.max(0.53, fin.lead[12][0]) + 0.01;
  for (let x = 0.36; x <= fx1; x += step) {
    const top = orcaGirth(x)[0] - 0.006;
    for (let q = -0.03; q <= fin.H; q += step) {
      if (!inPoly(fin.poly, x, q)) continue;
      if (nickAt && Math.hypot(x - nickAt[0], q - nickAt[1]) < 0.014) continue;
      const th = 0.011 * (1 - Math.max(0, q) / fin.H) + 0.002;
      const mat = q > 0 && x - leadX(q) < 0.012 ? 'k2' : 'k';
      for (const side of [1, -1]) splat(x, side * th, top + q, [0, side, 0.25], mat, true);
    }
  }

  const fl = look.flipper;
  const flen = 0.17 * fl;
  const fwid = 0.07 * fl;
  const [h3, w3] = orcaGirth(0.3);
  for (const side of [1, -1]) {
    const root = [0.3, side * w3 * Math.cos(-0.6) * 0.9, h3 * Math.sin(-0.6) * 0.9];
    let D = [0.45, side * 0.6, -0.65];
    const dl = Math.hypot(...D);
    D = D.map((c) => c / dl);
    let E = [1 - D[0] * D[0], -D[0] * D[1], -D[0] * D[2]];
    const el = Math.hypot(...E);
    E = E.map((c) => c / el);
    const N = [D[1] * E[2] - D[2] * E[1], D[2] * E[0] - D[0] * E[2], D[0] * E[1] - D[1] * E[0]];
    for (let p = 0; p <= flen; p += step) {
      const half = (fwid / 2) * Math.sin(Math.PI * Math.min(1, 0.2 + (0.8 * p) / flen)) ** 0.7;
      for (let q = -half; q <= half; q += step) {
        const pt = [0, 1, 2].map((i) => root[i] + D[i] * p + E[i] * q);
        splat(pt[0], pt[1], pt[2], [-N[0], N[1], N[2]], () => 'k');
      }
    }
  }

  // the flukes trail the beat, flicking up as the tail comes down and down as it rises
  const e = 0.002;
  const psi = Math.atan((zc(1) - zc(1 - e)) / e) * 0.7 - 0.55 * xf.swing;
  const cs = Math.cos(psi);
  const sn = Math.sin(psi);
  const z1 = zc(1);
  for (let a = -0.03; a <= 0.155; a += step) {
    for (let b = -0.175; b <= 0.175; b += step) {
      if (!inPoly(ORCA_FLUKE, a, Math.abs(b))) continue;
      const under = Math.abs(b) < 0.12 && a > 0.015 && a < 0.105 - Math.abs(b) * 0.1;
      splat(1 + a * cs, b, z1 + a * sn, [sn, 0, cs], (back) => (back && under ? 'w' : 'k'), false, false);
    }
  }
}

// One pose rendered to a canvas W x H with the model's origin at (ox, oy); with `over`, the dorsal fin alone too,
// for drawing over a rider it's in front of. Given a waterline `wl` (in lengths above the spine) only what's out
// of the water goes in `img`, and what's under it in `under`, unoutlined.
function orcaPaint(look, xf, W, H, ox, oy, over, wl = null) {
  const n = W * H;
  const layer = () => ({ zb: new Float32Array(n).fill(-Infinity), cb: new Int32Array(n) });
  const top = layer();
  const sunk = wl == null ? null : layer();
  const fins = over ? new Uint8Array(n) : null;
  const wz = wl == null ? 0 : wl * xf.L;
  orcaSplats(look, xf, (sx, sy, d, rgb, fin, z) => {
    const x = Math.floor(sx + ox);
    const y = Math.floor(sy + oy);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    const to = sunk && z < wz ? sunk : top;
    if (d <= to.zb[i]) return;
    to.zb[i] = d;
    to.cb[i] = rgb;
    if (fins && to === top) fins[i] = fin ? 1 : 0;
  }, 2.2);
  const paint = ({ zb, cb }, keep, lined = true) => {
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    const px4 = img.data;
    for (let i = 0; i < n; i++) {
      if (zb[i] === -Infinity || !keep(i)) continue;
      px4[i * 4] = (cb[i] >> 16) & 255;
      px4[i * 4 + 1] = (cb[i] >> 8) & 255;
      px4[i * 4 + 2] = cb[i] & 255;
      px4[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return lined ? outline(c) : c;
  };
  return { img: paint(top, () => true), over: fins && paint(top, (i) => fins[i]), under: sunk && paint(sunk, () => true, false) };
}

// A run of poses on canvases all the same size, so the orca holds still on them as its tail moves; each is
// rendered the first time it's wanted. `at` finds a point on the model in a frame, and (ax, ay) is the spot under
// the middle of its belly that sits on its position in the world.
function orcaSheet(look, poses, over = false, wl = null) {
  const xfs = poses.map(orcaXf);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const xf of xfs) {
    orcaSplats(look, xf, (sx, sy) => {
      x0 = Math.min(x0, sx);
      y0 = Math.min(y0, sy);
      x1 = Math.max(x1, sx);
      y1 = Math.max(y1, sy);
    }, 0.6);
  }
  const ox = 3 - Math.floor(x0);
  const oy = 3 - Math.floor(y0);
  const W = Math.ceil(x1) + ox + 3;
  const H = Math.ceil(y1) + oy + 3;
  const frames = [];
  const at = (f, x, v, z) => {
    const [sx, sy] = xfs[f].put(x, v, z);
    return [sx + ox, sy + oy];
  };
  const [ax, ay] = at(0, 0.45, 0, -0.125);
  return { W, H, ax, ay, at, frame: (f) => frames[f] || (frames[f] = orcaPaint(look, xfs[f], W, H, ox, oy, over, wl)) };
}

// The orca heading way `dir` (of ORCA_DIRS) at `len` px for its size, as ORCA_FRAMES frames of the tail beating; cut at the waterline
// `wl` if it's swimming along the surface.
function orcaView(look, dir, len = ORCA_DEEP_LEN, over = false, wl = null) {
  const key = `${dir}|${len}|${+over}|${wl}`;
  let v = look.views.get(key);
  if (v) return v;
  const src = orcaMirror(dir);
  if (src != null) {
    const b = orcaView(look, src, len, over, wl);
    const frames = [];
    const flip = (fr) => ({ img: mirror(fr.img), over: fr.over && mirror(fr.over), under: fr.under && mirror(fr.under) });
    v = {
      W: b.W, H: b.H, ax: b.W - b.ax, ay: b.ay,
      at: (f, ...p) => {
        const [x, y] = b.at(f, ...p);
        return [b.W - x, y];
      },
      frame: (f) => frames[f] || (frames[f] = flip(b.frame(f))),
    };
  } else {
    const a = orcaAngle(dir);
    v = orcaSheet(look, Array.from({ length: ORCA_FRAMES }, (_, f) => ({ L: len * look.size, a, phi: orcaTilt(a), beat: f / ORCA_FRAMES })), over, wl);
  }
  look.views.set(key, v);
  return v;
}

// At the surface, facing right: rolling up with its back arched (`back`), or standing on its tail to look about
// (`spy`). `cx` is the middle of it across, and `rise` how many rows down from the top show at the most.
function orcaStill(look, kind) {
  let s = look.views.get(kind);
  if (s) return s;
  const spy = kind === 'spy';
  const sheet = orcaSheet(look, [{ L: ORCA_SEA_LEN * look.size, a: 0, phi: orcaTilt(0), still: true, arch: spy ? 0 : 0.16, pitch: spy ? 1.4 : 0 }]);
  const img = sheet.frame(0).img;
  const [cx] = sheet.at(0, spy ? 0.1 : 0.45, 0, 0);
  const rise = Math.round(sheet.at(0, spy ? 0.5 : 0.45, 0, 0)[1]);
  s = { img, imgL: mirror(img), cx, rise };
  look.views.set(kind, s);
  return s;
}
