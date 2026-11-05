// The world map from the great hall: fog over everywhere not yet seen, and places that get
// their names once someone mentions them or the player visits.

// Tile coordinates; `words` are what an NPC has to say for the player to learn the name.
const POIS = [
  { id: 'home', name: 'Home', icon: 'house', x: 60 + OX, y: 76.5 + OY, known: true },
  { id: 'hall', name: 'Great Hall', icon: 'hall', x: 78 + OX, y: 38.5 + OY, words: /\b(great hall|chief)\b/i },
  { id: 'forge', name: 'Forge', icon: 'anvil', x: 58.5 + OX, y: 56.5 + OY, words: /\b(smith|forge)\b/i },
  { id: 'bakery', name: 'Bakery', icon: 'bread', x: 68 + OX, y: 66 + OY, words: /\b(baker|bread|oven)\b/i },
  { id: 'market', name: 'Market', icon: 'stall', x: 78.5 + OX, y: 56 + OY, words: /\b(market|plaza|square|stalls?)\b/i },
  { id: 'pen', name: 'Sheep Pen', icon: 'sheep', x: 115.5 + OX, y: 54.5 + OY, words: /\b(sheep|pen|shepherd|farm)\b/i },
  { id: 'range', name: 'Archery Range', icon: 'target', x: 97 + OX, y: 76 + OY, words: /\b(archer|archery|targets?|bullseye)\b/i },
  { id: 'gate', name: 'Southern Gate', icon: 'gate', x: 78.5 + OX, y: 92 + OY, words: /\b(southern gate|gate)\b/i },
  { id: 'falls', name: 'Waterfall', icon: 'falls', x: 54 + OX, y: 44 + OY, words: /\bwaterfall\b/i },
  { id: 'docks', name: 'Harbour', icon: 'ship', x: 82 + OX, y: 100 + OY, words: /\b(docks?|harbou?r|longship)\b/i },
  { id: 'forest', name: 'Forest', icon: 'tree', x: 24 + OX, y: 66 + OY, r: 14, words: /\b(forest|woods|woodcutter|clearing)\b/i },
  { id: 'spring', name: 'Hot Spring', icon: 'spring', x: 111 + OX, y: 36 + OY, r: 8, words: /\bhot ?springs?\b/i },
  { id: 'mountains', name: 'Mountains', icon: 'mountain', x: 96 + OX, y: 18 + OY, r: 16, words: /\b(mountains?|peaks?|mountain pass)\b/i },
  { id: 'valley', name: 'Snowy Valley', icon: 'frozen', x: 66 + OX, y: 10 + OY, r: 8, words: /\b(snowy valley|valley|the pass)\b/i },
  { id: 'hut', name: 'Hermit\'s Hut', icon: 'hut', x: 396, y: 68, words: /\bhermit\b/i },
  { id: 'ruin', name: 'Ancient Ruin', icon: 'ruin', x: 52, y: 292.5, words: /\b(ancient ruins?|ruins?|stone towers)\b/i },
  { id: 'volcano', name: 'Fire Mountain', icon: 'volcano', x: 250, y: 50, r: 14, words: /\b(volcano|fire mountain)\b/i },
  { id: 'frozen', name: 'Frozen Isle', icon: 'frozen', x: 70, y: 60, r: 14, words: /\bfrozen isle\b/i },
  { id: 'jungle', name: 'Jungle Isle', icon: 'jungle', x: 410, y: 280, r: 14, words: /\bjungle( isle)?\b/i },
  { id: 'speck', name: 'Speck of Sand', icon: 'isle', x: 262, y: 326, words: /\b(speck of sand|far isles)\b/i },
];
for (const p of POIS) Object.assign(p, { learned: !!p.known, seen: !!p.known });

const seen = new Uint8Array(MAP_W * MAP_H);
const VISIT = 5;
let lastReveal = '';
let fogDirty = true;

// Clears the fog in a circle round wherever the player is looking from.
function updateMap() {
  if (indoors || !started) return;
  const [x, y] = flight ? [flight.x, flight.y] : sail ? [shipObj.x, shipObj.y] : [player.x, player.y];
  const r = flight ? 26 : sail ? 18 : 12;
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  const key = `${tx},${ty},${r}`;
  if (key === lastReveal) return;
  lastReveal = key;
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const X = tx + i;
      const Y = ty + j;
      if (X < 0 || Y < 0 || X >= MAP_W || Y >= MAP_H || i * i + j * j > r * r || seen[Y * MAP_W + X]) continue;
      seen[Y * MAP_W + X] = 1;
      fogDirty = true;
    }
  }
  for (const p of POIS) {
    const d = Math.hypot(p.x - tx, p.y - ty);
    if (d <= r) p.seen = true;
    if (d <= (p.r || VISIT) && !flight) learnPlace(p);
  }
}

function learnPlace(p) {
  if (p.learned) return;
  p.learned = true;
  if (hasMap()) flashMapButton();
}

// Anything a villager says out loud to the player can put a name on the map.
function learnFrom(n, text) {
  if (!sameSpace(n) || Math.hypot(n.x - player.x, n.y - player.y) > 200) return;
  for (const p of POIS) if (p.words && p.words.test(text)) learnPlace(p);
}

// ---------- the map on the hall wall ----------

// Looked up on first use: objects are only placed once main.js starts.
let wallMapObj = null;
const wallMap = () => (wallMapObj ||= objects.find((o) => o.key === 'wallMap'));
const hasMap = () => has('map');

function nearWallMap() {
  const m = wallMap();
  return indoors === ROOMS.hall && !m.hidden && Math.abs(player.x - m.x) < 18 && player.y - m.y < 22;
}

function takeMap() {
  wallMap().hidden = true;
  bag.map = 1;
  Sfx.pickup();
  faceToward(player, 0, -1);
  mapBtn.hidden = false;
  flashMapButton();
}

// ---------- the map screen ----------

const mapBtn = document.getElementById('map');
const mapEl = document.getElementById('worldmap');
const mapCanvas = document.getElementById('worldmap-canvas');
const mapClose = document.getElementById('worldmap-close');
let mapOpen = false;
// Zoom over the fitted map, and the tile at the middle of the view.
const mapView = { z: 1, x: MAP_W / 2, y: MAP_H / 2 };

function flashMapButton() {
  mapBtn.classList.remove('bump');
  void mapBtn.offsetWidth;
  mapBtn.classList.add('bump');
}

const MAP_INK = '#3a2414';
const PARCHMENT = '#d9c493';

function tileColor(t, i) {
  switch (t) {
    case T.WATER: {
      const d = Math.min(seaDist[i], 12);
      return `rgb(${Math.round(118 - d * 5)}, ${Math.round(160 - d * 5)}, ${Math.round(178 - d * 3)})`;
    }
    case T.FALL: return '#a9d2e6';
    case T.SAND: return '#e8d49a';
    case T.CLIFF: return '#8f7a5c';
    case T.PATH: case T.STAIRS: return '#bba987';
    case T.WOOD: return '#9a6a3c';
    case T.DIRT: return '#b89464';
    case T.HAY: return '#d8b852';
    case T.ROCK: return '#a49c8c';
    case T.SNOW: case T.ICE: return '#eef0ee';
    case T.MOUNT: return elev[i] === 255 ? '#4c4446' : elev[i] >= 3 ? '#d8dbd8' : '#8a8278';
    case T.SPRING: return '#7cc6bc';
    case T.ASH: return '#7a7072';
    case T.LAVA: return '#e0622a';
    case T.FIELD: return '#a88a52';
    case T.JUNGLE: return '#6f9a4a';
    default: return '#93ad62';
  }
}

let mapBase = null;

const MAP_TREES = { pine: '#5d7f45', pine2: '#5d7f45', oak: '#6a8a44', palm: '#7a9a48', jungleTree: '#3f7a3a', snowPine: '#7d9488' };

// One pixel per tile, plus trees as dark dots and buildings as ink blocks; scaled up when shown.
function buildMapBase() {
  mapBase = makeCanvas(MAP_W, MAP_H);
  const g = mapBase.getContext('2d');
  const img = g.createImageData(MAP_W, MAP_H);
  const rgb = new Map();
  const put = (i, c) => {
    if (!rgb.has(c)) rgb.set(c, c[0] === '#' ? hexToRgb(c) : c.match(/\d+/g).map(Number));
    const v = rgb.get(c);
    for (let k = 0; k < 3; k++) img.data[i * 4 + k] = v[k];
    img.data[i * 4 + 3] = 255;
  };
  for (let i = 0; i < MAP_W * MAP_H; i++) put(i, tileColor(map[i], i));
  for (const o of objects) {
    const c = MAP_TREES[o.key];
    const x = Math.floor(o.x / TILE);
    const y = Math.floor(o.y / TILE) - 1;
    if (c && y >= 0 && y < MAP_H) put(y * MAP_W + x, c);
  }
  g.putImageData(img, 0, 0);
  g.fillStyle = '#6a4a2a';
  for (const o of objects) {
    const f = SPR[o.key] && SPR[o.key].foot;
    if (!f || o.y >= MAP_H * TILE || f.w < 40) continue;
    g.fillRect(Math.round((o.x - f.w / 2) / TILE), Math.round(o.y / TILE) - 2, Math.max(1, Math.round(f.w / TILE)), 2);
  }
}

const MAP_ICONS = {
  house: (g) => { poly(g, [[1, 5], [5, 1], [9, 5]], '#a8432f'); rect(g, 2, 5, 7, 4, '#8a5a3a'); rect(g, 4, 6, 2, 3, MAP_INK); },
  hall: (g) => { poly(g, [[0, 5], [5, 0], [10, 5]], '#a8432f'); rect(g, 1, 5, 9, 4, '#8a5a3a'); rect(g, 4, 6, 3, 3, '#ffd36b'); },
  anvil: (g) => { rect(g, 1, 3, 9, 2, '#56565e'); rect(g, 4, 5, 3, 2, '#56565e'); rect(g, 2, 7, 7, 2, '#45454c'); px(g, 8, 1, '#ff8a2a'); },
  bread: (g) => { ellipse(g, 5, 5, 4, 3, '#c88a3a'); rect(g, 3, 4, 1, 2, '#8a5a2a'); rect(g, 6, 4, 1, 2, '#8a5a2a'); },
  stall: (g) => { rect(g, 1, 2, 9, 2, '#c8322a'); rect(g, 1, 2, 3, 2, '#f4e6c0'); rect(g, 7, 2, 3, 2, '#f4e6c0'); rect(g, 2, 4, 1, 5, '#8a5a3a'); rect(g, 8, 4, 1, 5, '#8a5a3a'); rect(g, 2, 6, 7, 2, '#9a6a3c'); },
  sheep: (g) => { ellipse(g, 5, 5, 4, 3, '#f4f0e6'); rect(g, 8, 4, 2, 2, MAP_INK); rect(g, 3, 8, 1, 1, MAP_INK); rect(g, 7, 8, 1, 1, MAP_INK); },
  target: (g) => { ellipse(g, 5, 5, 4, 4, '#c8322a'); ellipse(g, 5, 5, 2.5, 2.5, '#f4e6c0'); rect(g, 5, 5, 1, 1, '#c8322a'); },
  gate: (g) => { rect(g, 1, 1, 2, 8, '#8a5a3a'); rect(g, 8, 1, 2, 8, '#8a5a3a'); rect(g, 1, 2, 9, 1, '#6a4a2a'); rect(g, 1, 6, 2, 1, '#6a4a2a'); rect(g, 8, 6, 2, 1, '#6a4a2a'); },
  falls: (g) => { rect(g, 3, 1, 5, 6, '#5aa6ec'); rect(g, 4, 1, 1, 6, '#d6efff'); ellipse(g, 5, 8, 4, 1.5, '#d6efff'); },
  ship: (g) => { poly(g, [[0, 6], [10, 6], [8, 9], [2, 9]], '#8a5a3a'); rect(g, 5, 0, 1, 6, MAP_INK); rect(g, 3, 1, 5, 4, '#f4e6c0'); rect(g, 3, 2, 5, 1, '#c8322a'); },
  hut: (g) => { poly(g, [[1, 5], [5, 1], [9, 5]], '#b89464'); rect(g, 2, 5, 7, 4, '#8a5a3a'); px(g, 7, 0, '#bfb6a2'); },
  ruin: (g) => { for (const x of [1, 4, 7]) rect(g, x, 2 + (x % 2), 2, 7 - (x % 2), '#a3a2a6'); rect(g, 4, 1, 2, 1, '#9fd2fa'); },
  isle: (g) => { ellipse(g, 5, 7, 4, 2, '#e8d49a'); rect(g, 5, 2, 1, 5, '#8a5a3a'); poly(g, [[2, 3], [5, 1], [8, 3], [5, 2]], '#4f8a3a'); },
  tree: (g) => { poly(g, [[3, 7], [6, 1], [9, 7]], '#3f6a34'); poly(g, [[0, 9], [3, 3], [6, 9]], '#4f8a3a'); rect(g, 3, 9, 1, 2, '#6a4a2a'); rect(g, 6, 7, 1, 3, '#6a4a2a'); },
  spring: (g) => { ellipse(g, 5, 7, 5, 2.5, '#4dbab2'); ellipse(g, 5, 7, 3, 1, '#8fe2d6'); for (const x of [2, 5, 8]) { px(g, x, 3, '#ffffff'); px(g, x + 1, 1, '#ffffff'); px(g, x, 4, '#e6f6ff'); } },
  mountain: (g) => { poly(g, [[0, 10], [4, 2], [8, 10]], '#7a7a80'); poly(g, [[4, 10], [8, 0], [12, 10]], '#8f8f96'); poly(g, [[7, 2], [8, 0], [9, 2]], '#ffffff'); poly(g, [[3, 4], [4, 2], [5, 4]], '#ffffff'); },
  volcano: (g) => { poly(g, [[0, 10], [4, 3], [8, 3], [12, 10]], '#4c4547'); rect(g, 4, 3, 4, 1, '#ff7a1a'); rect(g, 5, 4, 1, 4, '#ff7a1a'); ellipse(g, 6, 1, 2, 1, '#8a7f80'); },
  frozen: (g) => { poly(g, [[1, 9], [4, 3], [7, 9]], '#c3d0e3'); poly(g, [[5, 9], [8, 1], [11, 9]], '#e6edf6'); rect(g, 2, 9, 9, 2, '#bfe2f2'); px(g, 8, 1, '#ffffff'); },
  jungle: (g) => { ellipse(g, 6, 9, 5, 2, '#e8d49a'); rect(g, 6, 3, 1, 6, '#8a5a3a'); poly(g, [[1, 4], [6, 1], [11, 4], [6, 3]], '#2f7d3a'); poly(g, [[2, 6], [6, 2], [10, 6], [6, 4]], '#4fa648'); },
};
let mapIcons = null;
const fog = makeCanvas(MAP_W, MAP_H);

// Parchment wherever the player hasn't been: one pixel per tile, smoothed as it scales up.
function paintFog() {
  fogDirty = false;
  const fg = fog.getContext('2d');
  const img = fg.createImageData(MAP_W, MAP_H);
  const [pr, pg, pb] = hexToRgb(PARCHMENT);
  for (let i = 0; i < seen.length; i++) {
    const k = i * 4;
    const n = hash(i % MAP_W, Math.floor(i / MAP_W), 9);
    img.data[k] = pr - n * 18;
    img.data[k + 1] = pg - n * 18;
    img.data[k + 2] = pb - n * 14;
    img.data[k + 3] = seen[i] ? 0 : 255;
  }
  fg.putImageData(img, 0, 0);
}

// Where the player is; inside a building that's the building itself.
function mapHere() {
  if (flight) return [flight.x, flight.y];
  if (sail) return [shipObj.x, shipObj.y];
  if (!indoors) return [player.x, player.y];
  const id = Object.keys(ROOMS).find((k) => ROOMS[k] === indoors);
  const b = objects.find((o) => o.room === id);
  return [b.x, b.y];
}

function drawMap() {
  if (!mapBase) {
    buildMapBase();
    mapIcons = {};
    for (const [k, draw] of Object.entries(MAP_ICONS)) mapIcons[k] = sprite(12, 12, (g) => draw(g));
  }
  if (fogDirty) paintFog();
  const fit = Math.min((innerWidth - 120) / MAP_W, (innerHeight - 190) / MAP_H);
  const W = Math.floor(MAP_W * fit);
  const H = Math.floor(MAP_H * fit);
  const dpr = devicePixelRatio || 1;
  if (mapCanvas.width !== Math.round(W * dpr) || mapCanvas.height !== Math.round(H * dpr)) {
    mapCanvas.width = Math.round(W * dpr);
    mapCanvas.height = Math.round(H * dpr);
    Object.assign(mapCanvas.style, { width: `${W}px`, height: `${H}px` });
  }
  // the part of the world in view, in tiles
  const vw = MAP_W / mapView.z;
  const vh = MAP_H / mapView.z;
  mapView.x = Math.max(vw / 2, Math.min(MAP_W - vw / 2, mapView.x));
  mapView.y = Math.max(vh / 2, Math.min(MAP_H - vh / 2, mapView.y));
  const ox = mapView.x - vw / 2;
  const oy = mapView.y - vh / 2;
  const S = W / vw;
  const g = mapCanvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = S < 2;
  g.drawImage(mapBase, ox, oy, vw, vh, 0, 0, W, H);
  g.imageSmoothingEnabled = true;
  g.drawImage(fog, ox, oy, vw, vh, 0, 0, W, H);
  g.imageSmoothingEnabled = false;

  // icons, and as many labels as fit without overlapping
  const iconPx = Math.round(12 * Math.max(1.25, Math.min(2.5, S / 1.4)));
  const fontPx = Math.max(8, Math.min(13, Math.round(6 + S)));
  g.font = `${fontPx}px 'Press Start 2P', monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  const placed = [];
  const labels = [];
  for (const p of POIS) {
    if (!p.seen && !p.learned) continue;
    const x = Math.round((p.x - ox) * S);
    const y = Math.round((p.y - oy) * S);
    if (x < -iconPx || y < -iconPx || x > W + iconPx || y > H + iconPx) continue;
    g.globalAlpha = p.seen ? 1 : 0.55;
    g.drawImage(mapIcons[p.icon], x - iconPx / 2, y - iconPx / 2, iconPx, iconPx);
    g.globalAlpha = 1;
    if (!p.learned) continue;
    const text = p.seen ? p.name : `${p.name}?`;
    const w = g.measureText(text).width + 4;
    const box = [x - w / 2, y + iconPx / 2 + 2, x + w / 2, y + iconPx / 2 + fontPx + 6];
    if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    placed.push(box);
    labels.push([text, x, box[1] + 2]);
  }
  for (const [text, x, y] of labels) {
    g.lineWidth = 4;
    g.strokeStyle = '#f4e6c0';
    g.strokeText(text, x, y);
    g.fillStyle = MAP_INK;
    g.fillText(text, x, y);
  }

  // you are here
  const [hx, hy] = mapHere();
  const mx = Math.round((hx / TILE - ox) * S);
  const my = Math.round((hy / TILE - oy) * S);
  const r = Math.max(3, Math.min(6, S)) + Math.round((Math.sin(time * 6) + 1) * 1.5);
  g.fillStyle = MAP_INK;
  g.beginPath();
  g.arc(mx, my, r + 1, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e2423a';
  g.beginPath();
  g.arc(mx, my, r - 1, 0, Math.PI * 2);
  g.fill();
  if (mapView.z === 1) {
    g.font = `8px 'Press Start 2P', monospace`;
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.lineWidth = 3;
    g.strokeStyle = '#f4e6c0';
    g.fillStyle = MAP_INK;
    g.strokeText('SCROLL OR +/- TO ZOOM', W - 6, H - 6);
    g.fillText('SCROLL OR +/- TO ZOOM', W - 6, H - 6);
  }

  mapCanvas.setAttribute('aria-label', `World map. Known places: ${POIS.filter((p) => p.learned).map((p) => p.name).join(', ')}.`);
}

function toggleMap(open = !mapOpen) {
  if (open && (!hasMap() || naming)) return;
  mapOpen = open;
  mapEl.hidden = !open;
  mapBtn.setAttribute('aria-expanded', String(open));
  keys.clear();
  if (open) {
    Sfx.door();
    Object.assign(mapView, { z: 1, x: MAP_W / 2, y: MAP_H / 2 });
    drawMap();
    mapClose.focus();
  } else {
    mapBtn.blur();
  }
}

mapBtn.addEventListener('click', () => toggleMap());
mapClose.addEventListener('click', () => toggleMap(false));
mapEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.code === 'KeyM') {
    e.preventDefault();
    e.stopPropagation();
    toggleMap(false);
  } else if (e.key === '+' || e.key === '=' || e.key === '-') {
    e.preventDefault();
    const [hx, hy] = mapHere();
    zoomMap(e.key === '-' ? 0.5 : 2, hx / TILE, hy / TILE);
  }
});

// Zooms by `f` keeping the tile at tx, ty where it is on screen.
function zoomMap(f, tx, ty) {
  const z = Math.max(1, Math.min(8, mapView.z * f));
  const k = mapView.z / z;
  mapView.x = tx + (mapView.x - tx) * k;
  mapView.y = ty + (mapView.y - ty) * k;
  mapView.z = z;
}

const mapTileAt = (e) => {
  const b = mapCanvas.getBoundingClientRect();
  return [
    mapView.x + ((e.clientX - b.left) / b.width - 0.5) * (MAP_W / mapView.z),
    mapView.y + ((e.clientY - b.top) / b.height - 0.5) * (MAP_H / mapView.z),
  ];
};
mapCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomMap(e.deltaY < 0 ? 1.25 : 0.8, ...mapTileAt(e));
}, { passive: false });
let mapDrag = null;
mapCanvas.addEventListener('pointerdown', (e) => {
  mapDrag = { x: e.clientX, y: e.clientY };
  mapCanvas.setPointerCapture(e.pointerId);
});
mapCanvas.addEventListener('pointermove', (e) => {
  if (!mapDrag) return;
  const b = mapCanvas.getBoundingClientRect();
  mapView.x -= ((e.clientX - mapDrag.x) / b.width) * (MAP_W / mapView.z);
  mapView.y -= ((e.clientY - mapDrag.y) / b.height) * (MAP_H / mapView.z);
  mapDrag = { x: e.clientX, y: e.clientY };
});
mapCanvas.addEventListener('pointerup', () => { mapDrag = null; });
mapEl.addEventListener('pointerdown', (e) => { if (e.target === mapEl) toggleMap(false); });
