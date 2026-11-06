// The ancient ruin: the night fury's egg sleeps under a stone slab ringed by nine rune stones. It only rises at night,
// once every stone is touched in the right order. The broken walls remember how it starts; the sailor's note from a
// skerry chest has all nine. Reefs and a sea mist guard the isle.

// Strokes of each stone's rune in a 5×8 box: fehu, uruz, thurisaz, ansuz, raidho, kenaz, gebo, hagalaz, tiwaz.
const RUNES = [
  [[0, 0, 0, 7], [0, 2, 3, 0], [0, 5, 3, 3]],
  [[0, 7, 0, 0], [0, 0, 3, 3], [3, 3, 3, 7]],
  [[0, 0, 0, 7], [0, 2, 3, 4], [3, 4, 0, 6]],
  [[0, 0, 0, 7], [0, 0, 3, 2], [0, 3, 3, 5]],
  [[0, 0, 0, 7], [0, 0, 3, 2], [3, 2, 0, 4], [0, 4, 3, 7]],
  [[3, 0, 0, 3], [0, 4, 3, 7]],
  [[0, 0, 4, 7], [4, 0, 0, 7]],
  [[0, 0, 0, 7], [4, 0, 4, 7], [0, 2, 4, 5]],
  [[2, 0, 2, 7], [2, 0, 0, 3], [2, 0, 4, 3]],
];
const NOTCHES = ['one notch', 'two notches', 'three notches', 'four notches'];
const ruin = { step: 0, solved: false };
let ruinStones = [];
let ruinWalls = [];
let ruinEgg = null;
let ruinAltar = null;
let ruinNight = false;

function initRuin() {
  ruinStones = objects.filter((o) => o.key === 'menhir');
  ruinWalls = objects.filter((o) => o.key === 'ruinWall');
  ruinEgg = eggs.find((e) => e.species === 'nightFury');
  ruinAltar = objects.find((o) => o.key === 'altar');
  ruinNight = isNight();
  syncRuin();
}

function drawRune(g, rune, x, y, color) {
  const w = Math.max(...RUNES[rune].map((s) => Math.max(s[0], s[2]))) + 1;
  const x0 = Math.round(x) - Math.floor(w / 2);
  const y0 = Math.round(y);
  for (const [a, b, c, d] of RUNES[rune]) line(g, x0 + a, y0 + b, x0 + c, y0 + d, color);
}

// Carved and dull by day; a cold blue glow at night, burning white-gold once touched in the right order.
function drawStoneRune(g, x, y, t, o) {
  if (o.lit) {
    g.globalAlpha = 0.5;
    drawRune(g, o.rune, x - 1, y - 18, '#ffd76a');
    drawRune(g, o.rune, x + 1, y - 18, '#ffd76a');
    g.globalAlpha = 1;
    drawRune(g, o.rune, x, y - 18, '#fff6c8');
  } else if (isNight()) {
    g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 2 + o.rune);
    drawRune(g, o.rune, x, y - 18, '#8fd0ff');
    g.globalAlpha = 1;
  } else drawRune(g, o.rune, x, y - 18, PAL.rockDeep);
}

function drawWallCarving(g, x, y, t, o) {
  drawRune(g, o.rune, x, y - 13, PAL.rockDeep);
  const x0 = Math.round(x) - o.notches + 1;
  for (let i = 0; i < o.notches; i++) rect(g, x0 + i * 2, Math.round(y) - 4, 1, 2, PAL.rockDeep);
}

const ruinEggUp = () => ruin.solved && isNight();

// The slab stands open while the egg is up or gone; a wild egg is only there to see and take while it's up.
function syncRuin() {
  if (!ruinEgg) return;
  const wild = ruinEgg.state === 'wild';
  ruinAltar.open = !wild || ruinEggUp();
  if (ruin.solved) for (const s of ruinStones) s.lit = isNight();
  if (!wild) return;
  ruinEgg.hidden = !ruinEggUp();
  ruinEgg.col.off = ruinEgg.hidden;
}

function updateRuin() {
  if (!ruinEgg) return;
  if (!stats.ruinLanded && !sail && !flight && grounded() && nearRuin()) stats.ruinLanded = 1;
  const night = isNight();
  if (night === ruinNight) return;
  ruinNight = night;
  if (!night && !ruin.solved) resetStones();
  const was = ruinEgg.hidden;
  syncRuin();
  if (ruinEgg.state !== 'wild' || was === ruinEgg.hidden || !nearRuin()) return;
  if (ruinEgg.hidden) {
    Sfx.thunk(0.6);
    muse('The egg sinks back into the stone as the sky pales. I\'ll come back tonight.');
  } else riseEgg();
}

const nearRuin = () => !indoors && Math.hypot(player.x - ruinAltar.x, player.y - ruinAltar.y) < 220;

function riseEgg() {
  Sfx.reward();
  burst(ruinEgg.x, ruinEgg.y - 8, ['#8fd0ff', '#e8f4ff', '#3a4a8a'], 22, 60);
}

function nearRuinThing(list) {
  if (indoors || sail || flight || hop || !grounded()) return null;
  let best = null;
  let bd = 12;
  for (const o of list) {
    const d = boxDist(o.col);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
const nearRuneStone = () => nearRuinThing(ruinStones);
const nearCarving = () => nearRuinThing(ruinWalls);

function readCarving(o) {
  faceToward(player, o.x - player.x, o.y - player.y);
  muse(`A rune is carved here, with ${NOTCHES[o.notches - 1]} cut beneath it.`);
}

function touchStone(o) {
  faceToward(player, o.x - player.x, o.y - player.y);
  if (!isNight()) {
    Sfx.thunk(0.4);
    muse('Cold, silent stone. The runes only stir under the stars.');
    return;
  }
  if (ruin.solved || o.lit) {
    muse('It hums under my hand.');
    return;
  }
  if (o.rune !== RUIN_ORDER[ruin.step]) {
    resetStones();
    Sfx.thunk();
    muse('The stones go dark. That wasn\'t the right order.');
    return;
  }
  o.lit = true;
  ruin.step++;
  Sfx.rune(ruin.step);
  for (let i = 0; i < 8; i++) particles.push({ type: 'sparkle', x: o.x + (Math.random() - 0.5) * 10, y: o.y - 14 - Math.random() * 10, vx: 0, vy: -10, life: 0, max: 0.7 });
  if (ruin.step === RUIN_ORDER.length) solveRuin();
  else muse(ruin.step === 1 ? 'The rune flares bright!' : 'Another one wakes...');
}

function resetStones() {
  ruin.step = 0;
  for (const s of ruinStones) s.lit = false;
}

function solveRuin() {
  ruin.solved = true;
  Sfx.rumble();
  muse('The ground rumbles... the slab slides open!');
  syncRuin();
  setTimeout(riseEgg, 500);
}

// The sea mist hangs thickest over the reefs, thinning on the isle itself and gone out in open water.
function ruinMist(x, y) {
  const r = isle('ruin');
  const [rx, ry] = REEF_RINGS[1].grow;
  const e = Math.hypot((x / TILE - r.x) / (r.rx + rx), (y / TILE - r.y) / (r.ry + ry));
  if (e < 0.55) return 0.3;
  if (e < 0.75) return 0.3 + ((e - 0.55) / 0.2) * 0.7;
  if (e < 1.15) return 1;
  return Math.max(0, 1 - (e - 1.15) / 0.45);
}

// Over the world but under the night: a clear patch round the player, mist beyond, banks drifting through.
function drawRuinMist(cx, cy) {
  if (indoors) return;
  const [hx, hy] = sail ? [shipObj.x, shipObj.y - 20] : flight ? [flight.x, flight.y] : [player.x, player.y - 8];
  const k = ruinMist(hx, hy);
  if (k <= 0) return;
  const sx = hx - cx;
  const sy = hy - cy;
  const grd = ctx.createRadialGradient(sx, sy, 40, sx, sy, 170);
  grd.addColorStop(0, 'rgba(214,222,232,0)');
  grd.addColorStop(1, `rgba(214,222,232,${0.85 * k})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, viewW, viewH);
  drawDrifting(cx, cy, blob(90, '226,232,240'), 12, 5, 0.45 * k, 5);
}

// ---------- the sailor's note ----------

const noteEl = document.getElementById('note');
const noteRunes = document.getElementById('note-runes');
const noteClose = document.getElementById('note-close');
let noteOpen = false;
const NOTE_CELL = 12;
const NOTE_SCALE = 4;
const RUNE_NAMES = ['fehu', 'uruz', 'thurisaz', 'ansuz', 'raidho', 'kenaz', 'gebo', 'hagalaz', 'tiwaz'];

// The nine runes in order, each numbered underneath, inked on the parchment.
function drawNote() {
  noteRunes.width = (RUIN_ORDER.length * NOTE_CELL + 4) * NOTE_SCALE;
  noteRunes.height = 24 * NOTE_SCALE;
  const g = noteRunes.getContext('2d');
  g.setTransform(NOTE_SCALE, 0, 0, NOTE_SCALE, 0, 0);
  RUIN_ORDER.forEach((rune, i) => drawRune(g, rune, 2 + i * NOTE_CELL + NOTE_CELL / 2, 2, MAP_INK));
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.font = `${2 * NOTE_SCALE}px 'Press Start 2P', monospace`;
  g.textAlign = 'center';
  g.fillStyle = '#8a5a3a';
  RUIN_ORDER.forEach((_, i) => g.fillText(String(i + 1), (2 + i * NOTE_CELL + NOTE_CELL / 2) * NOTE_SCALE, 20 * NOTE_SCALE));
  noteRunes.setAttribute('aria-label', `Nine runes in order: ${RUIN_ORDER.map((r) => RUNE_NAMES[r]).join(', ')}`);
}

function toggleNote(open = !noteOpen) {
  if (open && (!has('runeNote') || naming || mapOpen)) return;
  noteOpen = open;
  noteEl.hidden = !open;
  keys.clear();
  Sfx.door();
  if (!open) return;
  drawNote();
  noteClose.focus();
}

noteClose.addEventListener('click', () => toggleNote(false));
noteEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  toggleNote(false);
});
noteEl.addEventListener('pointerdown', (e) => { if (e.target === noteEl) toggleNote(false); });
