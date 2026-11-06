// The ice cave under the frozen isle: pitch dark without a torch, with glowcaps to pick, gold to mine and an egg at the end.

const GLOW_TIME = 120;
const GLOWCAP_REGROW = 300;
let glowcaps = [];
let wasInCave = false;
let dripT = 0;

// Torches are used up. F with one selected pulls it out and lights it, or puts it away again (snuffed, keeping what's
// left of it). A lit torch burns six game hours in all; dunk it in the water and it's gone.
const TORCH_BURN = (6 / 24) * DAY_LENGTH;
const flame = { out: false, left: 0 };
const torchLit = () => flame.out && has('torch');
const torchHours = () => Math.max(1, Math.ceil(((flame.left || TORCH_BURN) / DAY_LENGTH) * 24));

function toggleTorch() {
  if (flame.out) {
    flame.out = false;
    Sfx.hiss(0.5);
    for (let i = 0; i < 4; i++) particles.push({ type: 'smoke', x: player.x + 4, y: player.y - 20, vx: (Math.random() - 0.5) * 6, vy: -12, life: 0, max: 1 });
    return;
  }
  if (flame.left <= 0) {
    flame.left = TORCH_BURN;
    renderInventory();
  }
  flame.out = true;
  Sfx.stoke(0.6);
  for (let i = 0; i < 8; i++) {
    particles.push({ type: 'ember', x: player.x + (Math.random() - 0.5) * 6, y: player.y - 22, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0, max: 0.5 + Math.random() * 0.4 });
  }
}

// One torch fewer, and the next one starts fresh.
function loseTorch() {
  bag.torch--;
  flame.out = false;
  flame.left = 0;
  renderInventory();
}

function showBurn() {
  const bar = hotbarEl.querySelector('.burn');
  if (!bar) return;
  bar.style.setProperty('--burn', (flame.left / TORCH_BURN).toFixed(3));
  bar.classList.toggle('lit', flame.out);
}

function updateTorch(dt) {
  showBurn();
  if (!flame.out) return;
  if (!has('torch')) {
    flame.out = false;
    return;
  }
  if (player.swimming) {
    loseTorch();
    Sfx.sizzle();
    for (let i = 0; i < 8; i++) particles.push({ type: 'steam', x: player.x + (Math.random() - 0.5) * 8, y: player.y - 8, vx: (Math.random() - 0.5) * 10, vy: -16 - Math.random() * 10, life: 0, max: 1.2 });
    muse(has('torch') ? 'Pssst! My torch fizzled out in the water. Just as well I brought another.' : 'Pssst! My torch fizzled out in the water. That\'s that one gone.');
    return;
  }
  if (Math.random() < dt * 3 && !flight && !sail) {
    particles.push({ type: 'ember', x: player.x + (player.dir === 'left' ? -5 : 5), y: player.y - 24, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 12, life: 0, max: 0.6 });
  }
  if ((flame.left -= dt) > 0) return;
  loseTorch();
  Sfx.hiss(0.6);
  muse(has('torch') ? 'My torch has burnt down to a stub. I\'ve another in my pack.' : 'My torch has burnt down to a stub.');
}

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
    if (indoors.sand) {
      stats.sandCave++;
      muse('Gold glinting in the firelight... it\'s a treasure cave!');
    } else if (indoors.fire) {
      muse('Phew, the heat! Steps cut in the rock, climbing up inside the mountain.');
    } else {
      stats.caves++;
      muse(torchLit() ? 'Brr... My torch lights the way.' : has('torch') ? 'It\'s pitch dark in here... I should light my torch.' : 'It\'s pitch dark in here... I need a torch.');
    }
  }
  wasInCave = cave && !fade;
  if (!cave || indoors.sand || indoors.fire) return;
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
