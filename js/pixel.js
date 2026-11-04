const TILE = 16;

function hash(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}

function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function px(g, x, y, color) {
  g.fillStyle = color;
  g.fillRect(Math.floor(x), Math.floor(y), 1, 1);
}

function ellipse(g, cx, cy, rx, ry, color) {
  g.fillStyle = color;
  for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) {
    const t = dy / (ry + 0.5);
    const dx = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    g.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1);
  }
}

function poly(g, pts, color) {
  g.fillStyle = color;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
    const sy = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]);
      const b = Math.round(xs[i + 1]);
      if (b > a) g.fillRect(a, y, b - a, 1);
    }
  }
}

function line(g, x0, y0, x1, y1, color, t = 1) {
  g.fillStyle = color;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  const o = Math.floor(t / 2);
  let err = dx + dy;
  for (;;) {
    g.fillRect(x0 - o, y0 - o, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// Drawing helpers that take coordinates in a design grid `s` times smaller than the canvas,
// so a sprite can be redrawn at a larger size with crisp 1px detail instead of being stretched.
function scaledPen(s) {
  const S = (v) => Math.round(v * s);
  return {
    rect: (g, x, y, w, h, c) => rect(g, S(x), S(y), S(x + w) - S(x), S(y + h) - S(y), c),
    px: (g, x, y, c) => rect(g, S(x), S(y), Math.max(1, S(1)), Math.max(1, S(1)), c),
    ellipse: (g, cx, cy, rx, ry, c) => ellipse(g, cx * s, cy * s, rx * s, ry * s, c),
    poly: (g, pts, c) => poly(g, pts.map(([x, y]) => [x * s, y * s]), c),
    line: (g, x0, y0, x1, y1, c, t = 1) => line(g, x0 * s, y0 * s, x1 * s, y1 * s, c, Math.max(1, S(t))),
  };
}

function outline(canvas, color = '#22160f') {
  const g = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  const [r, gg, b] = hexToRgb(color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
        d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

function glyph(g, rows, x, y, color, s = 1) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') rect(g, x + i * s, y + j * s, s, s, color);
  });
}
