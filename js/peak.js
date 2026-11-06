// The fire mountain: a zigzag trail climbs the volcano's west face from a cairn at its foot to the crater rim.
// SPACE at the foot starts up it; UP climbs and DOWN heads back. A dragon egg dropped into the crater hatches
// in the heat of the lava.

const TREK_SPEED = 46;
let volcanoObj = null;
let trailPts = [];
let trailLen = 0;

function initPeak() {
  volcanoObj = objects.find((o) => o.key === 'volcano');
  const s = SPR.volcano;
  trailPts = VOLCANO_TRAIL.map(([x, y]) => ({ x: volcanoObj.x - s.ox + x, y: volcanoObj.y - s.oy + y, s: 0 }));
  for (let i = 1; i < trailPts.length; i++) {
    const a = trailPts[i - 1];
    const b = trailPts[i];
    b.s = a.s + Math.hypot(b.x - a.x, b.y - a.y);
  }
  trailLen = trailPts[trailPts.length - 1].s;
}

// Where `s` pixels along the trail is, and which way is uphill there.
function trailAt(s) {
  let i = 1;
  while (i < trailPts.length - 1 && trailPts[i].s < s) i++;
  const a = trailPts[i - 1];
  const b = trailPts[i];
  const len = b.s - a.s;
  const k = Math.max(0, Math.min(1, (s - a.s) / len));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ux: (b.x - a.x) / len, uy: (b.y - a.y) / len };
}

const trailFoot = () => ({ x: trailPts[0].x, y: trailPts[0].y + 10 });
const craterSpot = () => ({ x: volcanoObj.x, y: volcanoObj.y - SPR.volcano.oy + 24 });
const onSummit = () => !!player.trek && player.trek.s >= trailLen;

function nearTrailhead() {
  if (player.trek || indoors || flight || sail || hop || !grounded() || player.jumpT >= 0) return false;
  const f = trailFoot();
  return Math.hypot(player.x - f.x, player.y - f.y) < 20;
}

function startTrek() {
  player.trek = { s: 0 };
  player.fishing = null;
  player.sortY = volcanoObj.y + 1;
  const p = trailAt(0);
  Object.assign(player, { x: p.x, y: p.y, dir: 'up', anim: 0, frame: 0 });
  if (!stats.summits) muse('A path, cut into the rock. Up we go!');
}

function endTrek() {
  const f = trailFoot();
  player.trek = null;
  player.sortY = undefined;
  Object.assign(player, { x: f.x, y: f.y, dir: 'down', anim: 0, frame: 0 });
}

// Any push along the trail counts: UP always climbs, DOWN always descends, and left or right follow the zigzag.
function updateTrek(dt) {
  const t = player.trek;
  const [ix, iy] = readInput();
  const at = trailAt(t.s);
  const v = ix * at.ux + iy * at.uy;
  if (Math.abs(v) < 0.2) {
    player.anim = 0;
    player.frame = 0;
    return;
  }
  if (v < 0 && t.s <= 0) return endTrek();
  const was = t.s;
  t.s = Math.max(0, Math.min(trailLen, t.s + Math.sign(v) * TREK_SPEED * dt));
  if (t.s === was) {
    player.frame = 0;
    return;
  }
  const p = trailAt(t.s);
  Object.assign(player, { x: p.x, y: p.y });
  faceToward(player, p.ux * Math.sign(v), p.uy * Math.sign(v));
  if (t.s >= trailLen && was < trailLen) reachSummit();
  if (player.anim === 0) player.anim = 1;
  const prev = Math.floor(player.anim);
  player.anim += dt * 6;
  player.frame = Math.floor(player.anim) % 4;
  if (Math.floor(player.anim) !== prev && player.frame % 2 === 1) Sfx.step('stone');
}

function reachSummit() {
  player.dir = 'right';
  if (!stats.summits) muse(carried ? 'The crater! I can feel the heat from here.' : 'What a view! And the heat coming off that crater...');
  stats.summits++;
}

function dropInCrater() {
  const e = carried;
  const c = craterSpot();
  carried = null;
  Object.assign(e, { x: c.x, y: c.y, hidden: true, crater: true, crack: 0, hatchT: 0, state: 'warming' });
  e.col.off = true;
  player.dir = 'right';
  burst(c.x, c.y - 2, [PAL.lava, PAL.lavaLight, '#ffe9a8'], 18, 50);
  for (let i = 0; i < 16; i++) particles.push({ type: 'ember', x: c.x + (Math.random() - 0.5) * 20, y: c.y - 2, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, life: 0, max: 0.6 + Math.random() * 0.6 });
  Sfx.splash(0.5);
  Sfx.stoke(1);
  setStage('warming');
  muse('In it goes! The lava hugs it like a blanket...');
}

function peakPrompt() {
  if (onSummit() && carried) return 'SPACE  Drop the egg into the crater   ·   DOWN  Climb down';
  if (onSummit() && eggs.some((e) => e.crater && e.state === 'warming')) return 'The egg is warming in the lava...   ·   DOWN  Climb down';
  if (onSummit()) return 'DOWN  Climb back down';
  return 'UP  Climb   ·   DOWN  Head back down';
}

// The egg sits in the lava with only its top showing, glowing brighter as it cracks.
function drawCraterEgg(g, x, y) {
  const e = eggs.find((n) => n.crater && n.state === 'warming');
  if (!e) return;
  const s = SPR[`egg_${e.species}`];
  const img = s.pick(time, e);
  const lava = y - SPR.volcano.oy + 24;
  const top = Math.round(img.height * 0.6);
  g.drawImage(img, 0, 0, img.width, top, x - s.ox, lava + 1 - top + Math.round(Math.sin(time * 2) * 0.6), img.width, top);
  g.globalAlpha = 0.35 + 0.25 * Math.sin(time * 5) + e.crack * 0.1;
  ellipse(g, x, lava, 9, 2.5, PAL.lavaLight);
  g.globalAlpha = 1;
}
