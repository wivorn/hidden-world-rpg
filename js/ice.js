// The ring of glacier ice round the mouth of the ice cave. Hold a torch to it (SPACE) and a few blocks melt away,
// enough to squeeze through; a dragon's fireball melts it too. Melted ice stays melted.

const MELT_TIME = 1.2;
const MELT_REACH = 18;
let iceRing = [];

function initIce() {
  iceRing = objects.filter((o) => o.key === 'iceWall');
}

const iceStanding = (o) => !o.hidden && o.meltT === undefined;

// Without a lit torch the ice just sits there.
const iceBlocking = () => !indoors && !torchLit() && iceRing.some((o) => iceStanding(o) && boxDist(o.col) < 10);

function meltTarget() {
  if (!torchLit() || !canUseTool() || indoors) return null;
  return iceRing.find((o) => iceStanding(o) && boxDist(o.col) < 12) || null;
}

// Every block within `reach` of (x, y) starts to melt, the nearest first.
function meltAt(x, y, reach) {
  for (const o of iceRing) {
    const d = Math.hypot(o.x - x, o.y - y);
    if (iceStanding(o) && d <= reach) o.meltT = -d / 40;
  }
}

function torchIce(o) {
  faceToward(player, o.x - player.x, o.y - 4 - player.y);
  if (!iceRing.some((n) => n.hidden)) muse('It hisses and drips... the ice is giving way!');
  meltAt(o.x, o.y, MELT_REACH);
  Sfx.stoke(0.8);
}

function updateIce(dt) {
  for (const o of iceRing) {
    if (o.meltT === undefined) continue;
    const was = o.meltT;
    o.meltT += dt;
    if (o.meltT < 0) continue;
    if (was < 0) Sfx.splash(0.25 * earshot(o.x, o.y));
    if (Math.random() < dt * 16) particles.push({ type: 'steam', x: o.x + (Math.random() - 0.5) * 14, y: o.y - 6 - Math.random() * 10, vx: (Math.random() - 0.5) * 6, vy: -18, life: 0, max: 0.9 + Math.random() * 0.5 });
    if (o.meltT >= MELT_TIME / 2) o.key = 'iceWallMelting';
    if (o.meltT < MELT_TIME) continue;
    delete o.meltT;
    o.hidden = true;
    o.col.off = true;
  }
}

const saveIce = () => iceRing.flatMap((o, i) => (o.hidden || o.meltT !== undefined ? [i] : []));

function restoreIce(melted) {
  // Saves from before the ring: whoever already found the cave gets the blocks in front of the door melted.
  if (!melted && stats.caves > 0) {
    const front = iceRing.reduce((a, o) => (o.y > a.y ? o : a));
    melted = iceRing.flatMap((o, i) => (Math.hypot(o.x - front.x, o.y - front.y) <= MELT_REACH ? [i] : []));
  }
  for (const i of melted || []) {
    const o = iceRing[i];
    if (!o) continue;
    delete o.meltT;
    o.hidden = true;
    o.col.off = true;
  }
}
