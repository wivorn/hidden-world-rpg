// The ice cave under the frozen isle: pitch dark without a torch, with glowcaps to pick, gold to mine and an egg at the end.

const GLOW_TIME = 120;
const GLOWCAP_REGROW = 300;
let glowcaps = [];
let wasInCave = false;
let dripT = 0;

// A torch burns whenever it's dark enough to need one.
const torchLit = () => has('torch') && (inCave() || nightness() > 0.35);

function initCave() {
  glowcaps = objects.filter((o) => o.key === 'glowcaps');
}

function nearGlowcap() {
  if (!inCave() || player.chop) return null;
  let best = null;
  let bd = 20;
  for (const o of glowcaps) {
    const d = Math.hypot(o.x - player.x, o.y - player.y);
    if (o.key === 'glowcaps' && d < bd) { bd = d; best = o; }
  }
  return best;
}

function pickGlowcap(o) {
  if (bagFull('mushroom')) {
    muse('My pack\'s full.');
    return;
  }
  Object.assign(o, { key: 'glowcapsPicked', regrowT: GLOWCAP_REGROW });
  give('mushroom');
  faceToward(player, o.x - player.x, o.y - player.y);
  popIcon('mushroom', o.x, o.y - 14);
  Sfx.pickup();
  for (let i = 0; i < 6; i++) particles.push({ type: 'sparkle', x: o.x + (Math.random() - 0.5) * 12, y: o.y - 4 - Math.random() * 8, vx: 0, vy: -8, life: 0, max: 0.6 });
}

function updateCave(dt) {
  if (player.glowT > 0) player.glowT -= dt;
  for (const o of glowcaps) {
    if (o.regrowT > 0 && (o.regrowT -= dt) <= 0) {
      if (inCave()) o.regrowT = 5;
      else o.key = 'glowcaps';
    }
  }
  const cave = inCave();
  if (cave && !wasInCave && !fade) {
    stats.caves++;
    muse(has('torch') ? 'Brr... My torch lights the way.' : 'It\'s pitch dark in here... I need a torch.');
  }
  wasInCave = cave && !fade;
  if (!cave) return;
  // meltwater dripping from the roof somewhere in view
  if ((dripT -= dt) <= 0) {
    dripT = 0.4 + Math.random() * 0.9;
    const x = player.x + (Math.random() - 0.5) * viewW * 0.8;
    const y = player.y + (Math.random() - 0.7) * viewH * 0.6;
    if (isLand(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)))) {
      particles.push({ type: 'drop', x, y: y - 30, vx: 0, vy: 20, life: 0, max: 0.4 });
      if (Math.random() < 0.35) Sfx.plip(0.25 * earshot(x, y), 1 + Math.floor(Math.random() * 3));
    }
  }
}

// The light round the player: a torch pushes the dark well back, a glowcap supper adds a cold blue halo.
// Out under the night sky there's no halo without a torch; in the cave a faint one keeps the player in sight.
function playerLights(x, y) {
  const cave = inCave();
  const out = [];
  if (torchLit()) {
    const flicker = Math.round(Math.sin(time * 11) * Math.sin(time * 7.3) * 2) * 4;
    out.push({ x, y: y - 4, r: (cave ? 112 : 88) + flicker, k: 1, glow: 48 + flicker });
  }
  else if (cave) out.push({ x, y, r: 30, k: 0.5 });
  if (player.glowT > 0) out.push({ x, y, r: 64, k: 0.9 * Math.min(1, player.glowT / 5), glow: 16, color: '#5affd8' });
  if (cave) out.push({ x: (indoors.door + 0.5) * TILE, y: indoors.doorY * TILE + 8, r: 72, k: 1 });
  return out;
}
