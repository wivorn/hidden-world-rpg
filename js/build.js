// Putting things down in the world and getting over what's in the way: ladders, bridges and campfires the player
// builds (and takes up again with G), the grappling hook, and the obstacles of Hawk Rock: its bluff, the rapids,
// the brambles round Old Bjorn's cache, the fallen log in the spur and the boulder stopping the cache's mouth.

// Things the player has put down: { kind: 'ladder', o, x, base, k } leans on a cliff `k` rows high;
// { kind: 'bridge' or 'ladderBridge', tiles, ns, ends } lies over water; { kind: 'campfire' or 'tent', o }.
const placed = [];
const hawk = { opened: false };
const PLACE = { ladder: true, bridge: true, campfire: true };
const LADDER_REACH = 2;
const HOOK_REACH = 4;
const SPAN = { ladder: 3, bridge: 6 };
const CURRENT = 120;
const BURN_TIME = 1.8;
const BUSH_BURN_TIME = 2.6;
const TREE_BURN_TIME = 4.5;
const THROW_TIME = 0.4;
const burning = [];
// Stumps and ashes still glowing after a fire: { x, y, t, max, seed }.
const smoulder = [];
let looseRock = null;
let cacheObj = null;
let pushT = 0;

const tileX = (x) => Math.floor(x / TILE);
const tileY = (y) => Math.floor((y - 1) / TILE);
const firm = (t) => isLand(t) || t === T.WOOD;
const outsideOrCave = () => !indoors || inCave();

function initBuild() {
  looseRock = objects.find((o) => o.key === 'looseRock');
  cacheObj = objects.find((o) => o.key === 'stoneCache');
}

// ---------- reading the ground ahead ----------

// The cliff just in front of the player, facing up or down it, with the spots to stand at its foot and its top.
function cliffAhead() {
  if ((player.dir !== 'up' && player.dir !== 'down') || !outsideOrCave()) return null;
  const s = player.dir === 'up' ? -1 : 1;
  const tx = tileX(player.x);
  const ty = tileY(player.y);
  const edge = s < 0 ? player.y - ty * TILE : (ty + 1) * TILE - player.y;
  if (edge > 8 || tileAt(tx, ty + s) !== T.CLIFF) return null;
  let k = 1;
  while (k < 8 && tileAt(tx, ty + s * (k + 1)) === T.CLIFF) k++;
  const far = ty + s * (k + 1);
  if (!firm(tileAt(tx, far))) return null;
  const base = s < 0 ? ty * TILE : far * TILE;
  const top = base - k * TILE;
  const x = Math.round(player.x);
  const bottom = { x, y: base + 5 };
  const up = [0, 4, 8].map((d) => ({ x, y: top - 2 - d })).find((p) => canStand(player, p.x, p.y));
  if (!up || !canStand(player, bottom.x, bottom.y)) return null;
  return { k, s, x, base, bottom, top: up };
}

// Open water just in front of the player, how many tiles of it there are, and solid ground on the far side.
// `wide` means it runs on past `span`.
function waterAhead(span) {
  if (!outsideOrCave() || player.swimming) return null;
  const [vx, vy] = DIR_VEC[player.dir];
  const tx = tileX(player.x);
  const ty = tileY(player.y);
  const edge = vx > 0 ? (tx + 1) * TILE - (player.x + 5) : vx < 0 ? player.x - 5 - tx * TILE : vy < 0 ? player.y - 4 - ty * TILE : (ty + 1) * TILE - player.y;
  const wet = (x, y) => tileAt(x, y) === T.WATER && !isReef(x, y);
  if (edge > 6 || !wet(tx + vx, ty + vy)) return null;
  let k = 1;
  while (k <= span && wet(tx + vx * (k + 1), ty + vy * (k + 1))) k++;
  if (k > span) return { k, wide: true };
  const fx = tx + vx * (k + 1);
  const fy = ty + vy * (k + 1);
  if (!firm(tileAt(fx, fy))) return null;
  const rough = isRapids(tx + vx, ty + vy);
  return { k, tx, ty, vx, vy, rough, far: { x: Math.round((fx + 0.5) * TILE), y: Math.round((fy + 0.5) * TILE + 4) } };
}

function campfireSpot() {
  if (!outsideOrCave() || player.swimming) return null;
  const [vx, vy] = DIR_VEC[player.dir];
  const x = Math.round(player.x + vx * 22);
  const y = Math.round(player.y + (vy > 0 ? 13 : vy < 0 ? -7 : 2));
  if (blocked(x - 14, y - 9, x + 14, y, player)) return null;
  for (let ty = tileY(y - 8); ty <= tileY(y); ty++) for (let tx = tileX(x - 14); tx <= tileX(x + 13); tx++) if (!isLand(tileAt(tx, ty))) return null;
  return { x, y };
}

// Open level ground ahead for the tent, with room in front of its flap to crawl in. Not on stairs, nor indoors.
function tentSpot() {
  if (indoors || player.swimming) return null;
  const [vx, vy] = DIR_VEC[player.dir];
  const x = Math.round(player.x + vx * 28);
  const y = Math.round(player.y + (vy > 0 ? 20 : vy < 0 ? -10 : 2));
  if (blocked(x - 17, y - 12, x + 17, y + 12, player)) return null;
  for (let ty = tileY(y - 12); ty <= tileY(y + 12); ty++) {
    for (let tx = tileX(x - 17); tx <= tileX(x + 16); tx++) if (!isLand(tileAt(tx, ty)) || tileAt(tx, ty) === T.STAIRS) return null;
  }
  return { x, y };
}

// Repaints the ground round tiles that changed.
function retile(tiles) {
  for (const [x, y] of tiles) {
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const k = Math.floor((y + dy) / CHUNK) * CW + Math.floor((x + dx) / CHUNK);
      chunks.delete(k);
      chunkSea[k] = -1;
    }
  }
}

function addPlacedObject(key, x, y, solid) {
  const o = { key, x, y, phase: Math.random() * 6, hidden: false };
  if (solid) {
    o.col = { off: false };
    placeCollider(o);
    colliders.push(o.col);
  }
  objects.push(o);
  return o;
}

function removePlacedObject(o) {
  objects.splice(objects.indexOf(o), 1);
  if (!o.col) return;
  o.col.off = true;
  for (const k of o.col.cells) { const a = colGrid.get(k); a.splice(a.indexOf(o.col), 1); }
  colliders.splice(colliders.indexOf(o.col), 1);
}

// ---------- putting things down ----------

function useUp(id) {
  bag[id]--;
  renderInventory();
}

function placeThing(id) {
  if (player.chop) return;
  if (id === 'campfire') {
    const spot = campfireSpot();
    if (!spot) return muse(outsideOrCave() ? 'No room for a fire here. Somewhere flat and clear.' : 'Not indoors!');
    useUp('campfire');
    buildCampfire(spot.x, spot.y);
    Sfx.stoke(1);
    muse('A fire of my own. Somewhere to cook and keep warm.');
    return;
  }
  // the tent stays on the hotbar while it's pitched: F by it packs it up, and F anywhere else pitches it there
  if (id === 'tent') {
    if (tentNear()) return packTent(tentNear());
    const spot = tentSpot();
    if (!spot) return muse(indoors ? 'Not indoors!' : 'No room to pitch it here. Somewhere flat and open.');
    const old = placed.find((q) => q.kind === 'tent');
    if (old) packTent(old, true);
    pitchTent(spot.x, spot.y);
    Sfx.thunk();
    if (!stats.pitched++) muse('Camp! Somewhere to nap, wherever I am.');
    return;
  }
  if (id === 'ladder') {
    const c = cliffAhead();
    if (c && c.k <= LADDER_REACH) {
      useUp('ladder');
      leanLadder(c.x, c.base, c.k);
      Sfx.thunk();
      return;
    }
    if (c) return muse('Too high. The ladder won\'t reach the top.');
  }
  const w = waterAhead(SPAN[id]);
  if (w && !w.wide) {
    useUp(id);
    layBridge(id === 'ladder' ? 'ladderBridge' : 'bridge', w);
    Sfx.thunk();
    splash(w.far.x, w.far.y);
    return;
  }
  if (w) return muse(`Too wide. The ${itemName(id)} won't reach the other side.`);
  muse(id === 'ladder' ? 'Nothing here to lean it on, or lay it over.' : 'Nothing here to bridge. I need to face a stream or a narrow channel.');
}

function buildCampfire(x, y) {
  const o = addPlacedObject('campfire', x, y, true);
  o.blaze = 0.3;
  placed.push({ kind: 'campfire', o });
}

function pitchTent(x, y) {
  placed.push({ kind: 'tent', o: addPlacedObject('tent', x, y, true) });
}

// The pitched tent whose open flap the player is standing at.
function nearTent() {
  if (!canUseTool()) return null;
  const p = placed.find((q) => q.kind === 'tent' && Math.abs(player.x - q.o.x) < 12 && player.y > q.o.y && player.y - q.o.y < 18);
  return p ? p.o : null;
}

// The pitched tent close enough for F to pack it up.
function tentNear() {
  if (!canUseTool()) return null;
  return placed.find((q) => q.kind === 'tent' && boxDist(q.o.col) < 14) || null;
}

function packTent(p, quiet = false) {
  placed.splice(placed.indexOf(p), 1);
  removePlacedObject(p.o);
  if (!quiet) Sfx.pickup();
}

function leanLadder(x, base, k) {
  const o = addPlacedObject(`ladder${k}`, x, base + 2, false);
  placed.push({ kind: 'ladder', o, x, base, k });
}

function layBridge(kind, w) {
  const { k, tx, ty, vx, vy } = w;
  const ns = vy !== 0;
  // a bridge is two tiles wide, on the side of the player's middle; a ladder is just the one
  const side = ns ? (player.x - tx * TILE < TILE / 2 ? -1 : 1) : (player.y - ty * TILE < TILE / 2 ? -1 : 1);
  const lines = kind === 'bridge' ? [0, side] : [0];
  const tiles = [];
  for (const l of lines) {
    for (let i = 1; i <= k; i++) {
      const x = tx + vx * i + (ns ? l : 0);
      const y = ty + vy * i + (ns ? 0 : l);
      if (tileAt(x, y) !== T.WATER || isReef(x, y)) continue;
      tiles.push([x, y]);
    }
  }
  const ends = [[Math.round(player.x), Math.round(player.y)], [w.far.x, w.far.y]];
  setBridge({ kind, tiles, ns, ends });
}

function setBridge(b) {
  for (const [x, y] of b.tiles) {
    setTile(x, y, T.WOOD);
    woodNS[y * MAP_W + x] = b.ns ? 1 : 0;
  }
  retile(b.tiles);
  placed.push(b);
}

// ---------- taking them up again ----------

// The placed thing within reach that G would take up, and what doing so is called. The tent packs up with F.
function takeable() {
  if (!canUseTool()) return null;
  const onWood = tileAt(tileX(player.x), tileY(player.y)) === T.WOOD;
  for (const p of placed) {
    if (p.kind === 'tent') continue;
    if (p.kind === 'ladder') {
      const end = ladderEnd(p);
      if (end) return { p, label: 'Take down the ladder' };
    } else if (p.kind === 'campfire') {
      if (boxDist(p.o.col) < 14) return { p, label: 'Put out the campfire' };
    } else if (!onWood && p.ends.some(([x, y]) => Math.hypot(player.x - x, player.y - y) < 20)) {
      return { p, label: p.kind === 'bridge' ? 'Take up the bridge' : 'Take up the ladder' };
    }
  }
  return null;
}

const takeHint = () => (takeable() ? `G  ${takeable().label}` : '');

function takeBack() {
  if (hop || fade || naming) return;
  const t = takeable();
  if (!t) return;
  const { p } = t;
  const item = p.kind === 'campfire' ? null : p.kind === 'bridge' ? 'bridge' : 'ladder';
  if (item && bagFull(item)) return muse('My pack\'s too full to carry it.');
  placed.splice(placed.indexOf(p), 1);
  if (p.kind === 'campfire') {
    removePlacedObject(p.o);
    Sfx.hiss(1);
    for (let i = 0; i < 6; i++) particles.push({ type: 'smoke', x: p.o.x + (Math.random() - 0.5) * 14, y: p.o.y - 6, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 8, life: 0, max: 1.2 });
    for (let i = 0; i < 2; i++) spawnDrop('stone', p.o.x + (i - 0.5) * 14, p.o.y + 2, (i - 0.5) * 20, 4, 50);
    return;
  }
  if (p.kind === 'ladder') removePlacedObject(p.o);
  else {
    for (const [x, y] of p.tiles) setTile(x, y, T.WATER);
    retile(p.tiles);
  }
  give(item);
  popIcon(item, player.x, player.y - 30);
  Sfx.pickup();
}

// ---------- climbing ----------

// The end of a placed ladder the player is standing at, and the other end to climb to.
function ladderEnd(p) {
  const bottom = { x: p.x, y: p.base + 5 };
  const top = { x: p.x, y: p.base - p.k * TILE - 2 };
  if (Math.hypot(player.x - bottom.x, player.y - bottom.y) < 12) return { from: 'bottom', to: top };
  if (Math.hypot(player.x - top.x, player.y - top.y) < 12) return { from: 'top', to: bottom };
  return null;
}

function nearLadder() {
  if (!canUseTool()) return null;
  for (const p of placed) {
    if (p.kind !== 'ladder') continue;
    const end = ladderEnd(p);
    if (end) return { p, ...end };
  }
  return null;
}

const ladderPrompt = (l) => `SPACE  Climb ${l.from === 'bottom' ? 'up' : 'down'} the ladder   ·   G  Take it down`;

// Hand over hand to `to`, facing the cliff the whole way, two holds to a row.
function climbTo(to, rows, done) {
  const up = to.y < player.y;
  startHop(to.x, to.y, 0, 0, () => {
    player.flying = false;
    player.dir = up ? 'up' : 'down';
    Sfx.land(0.6);
    if (done) done();
  });
  const moves = 1 + rows * 2;
  Object.assign(hop, { climb: true, dur: moves * 0.24, moves });
  player.dir = 'up';
}

// Where a climb `t` (0..1) of the way through has got to. Each move one hand reaches for the next hold while the
// body hangs still (`reach` 0..1), then the body pulls up after it (`pull` 0..1); `rise` is how far up it is.
const CLIMB_REACH_PART = 0.45;
function climbPhase(t, moves) {
  const m = Math.min(moves - 1, Math.floor(t * moves));
  const f = t * moves - m;
  const reach = f < CLIMB_REACH_PART ? smooth(f / CLIMB_REACH_PART) : 1;
  const pull = f < CLIMB_REACH_PART ? 0 : smooth((f - CLIMB_REACH_PART) / (1 - CLIMB_REACH_PART));
  return { m, reach, pull, rise: (m + pull) / moves };
}

function climbLadder(l) {
  climbTo(l.to, l.p.k);
  Sfx.thunk(0.5);
}

// The hook flies up (or is set at the lip) for THROW_TIME, then the player climbs the rope.
function throwGrapple() {
  if (player.chop || player.grapple) return;
  const c = cliffAhead();
  if (!c) return muse(waterAhead(SPAN.bridge) ? 'Nothing over there to hook onto.' : 'Nothing up there to hook onto.');
  if (c.k > HOOK_REACH) return muse('Too high, even for the hook.');
  const up = c.s < 0;
  const lip = c.base - c.k * TILE;
  player.grapple = { t: 0, from: { x: player.x, y: player.y - 12 }, hook: { x: c.x, y: up ? lip - 2 : player.y - 4 }, to: up ? c.top : c.bottom, rows: c.k };
  Sfx.swish();
}

function updateGrapple(dt) {
  const g = player.grapple;
  if (!g) return;
  g.t += dt;
  if (g.climbing || g.t < THROW_TIME) return;
  g.climbing = true;
  Sfx.thunk(0.7);
  climbTo(g.to, g.rows, () => {
    player.grapple = null;
    stats.hooked++;
  });
}

function drawGrapple(cx, cy) {
  const g = player.grapple;
  if (!g) return;
  const u = Math.min(1, g.t / THROW_TIME);
  const hand = g.climbing ? { x: player.x, y: player.y - 12 } : g.from;
  const hx = g.from.x + (g.hook.x - g.from.x) * u;
  const hy = g.from.y + (g.hook.y - g.from.y) * u - Math.sin(u * Math.PI) * 14;
  line(ctx, Math.round(hand.x - cx), Math.round(hand.y - cy), Math.round(hx - cx), Math.round(hy - cy), '#c8a468');
  const x = Math.round(hx - cx);
  const y = Math.round(hy - cy);
  line(ctx, x, y, x - 3, y - 3, '#c9ccd4');
  line(ctx, x, y, x + 3, y - 3, '#c9ccd4');
  rect(ctx, x, y - 4, 1, 4, '#c9ccd4');
}

// ---------- the rapids ----------

// In the rapids the current takes the swimmer, whatever they do, and carries them over the falls. True while it has them.
function sweptAlong(dt) {
  const tx = tileX(player.x);
  const ty = tileY(player.y);
  if (!isRapids(tx, ty) || !isWet(tileAt(tx, ty))) return false;
  if (!player.swept) {
    player.swept = true;
    muse('Whoa! The current\'s far too strong!');
    Sfx.splash();
  }
  const [, iy] = readInput();
  const x0 = player.x;
  move(player, CURRENT * dt, 0);
  move(player, 0, iy * 8 * dt);
  player.dir = 'right';
  player.anim += dt * 8;
  player.frame = Math.floor(player.anim) % 4;
  if (Math.random() < dt * 20) particles.push({ type: 'wake', layer: 'water', x: player.x - 6, y: player.y - 2, vx: -20, vy: (Math.random() - 0.5) * 10, life: 0, max: 0.6 });
  if (onLand(player.x, player.y)) player.swimming = false;
  else if (player.x - x0 < CURRENT * dt * 0.3) overTheFalls();
  return true;
}

function overTheFalls() {
  const tx = tileX(player.x);
  const ty = tileY(player.y);
  let x = tx + 1;
  while (x < tx + 8 && !(tileAt(x, ty) === T.WATER && !inland[ty * MAP_W + x])) x++;
  const to = { x: (x + 1) * TILE, y: (ty + 1) * TILE - 2 };
  stats.swept++;
  Sfx.whoosh();
  startHop(to.x, to.y, 8, 0, () => {
    player.flying = false;
    player.swimming = true;
    splash(player.x, player.y);
    seaSplash(player.x, player.y - 2, 1.2);
    Sfx.splash();
    muse('Swept right over the falls! There must be a better way across.');
  });
  Object.assign(hop, { dur: 0.6 });
}

// White water racing east over the rapids.
function drawRapids(cx, cy) {
  const x0 = Math.max(0, tileX(cx));
  const y0 = Math.max(0, tileY(cy + 1));
  const x1 = Math.min(MAP_W - 1, tileX(cx + viewW));
  const y1 = Math.min(MAP_H - 1, tileY(cy + viewH));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!rapids[y * MAP_W + x] || map[y * MAP_W + x] !== T.WATER) continue;
      for (let i = 0; i < 3; i++) {
        const h = hash(x, y * 3 + i, 77);
        const ph = (time * (1.6 + h) + h * 7) % 1;
        ctx.globalAlpha = 0.85 * Math.sin(ph * Math.PI);
        rect(ctx, x * TILE - cx + Math.floor(ph * 16) - 3, y * TILE - cy + 2 + i * 5, 5 + Math.floor(h * 4), 1, i === 1 ? '#e6f6ff' : '#a8d6fa');
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- brambles and fire ----------

const burns = (o) => o.axe === 'bramble' || o.axe === 'log';

// `any` lets dragon fire catch trees and bushes too, though they don't spread it.
function ignite(o, delay = 0, any = false) {
  if (o.burnT !== undefined || !(burns(o) || (any && (kindOf(o) === 'tree' || o.axe === 'bush'))) || !kindOf(o)) return;
  o.burnT = -delay;
  burning.push(o);
}

// Brambles within a torch's reach, if the player holds a lit one.
function burnTarget() {
  if (!torchLit() || !canUseTool()) return null;
  return hittables.find((o) => o.axe === 'bramble' && kindOf(o) && o.burnT === undefined && boxDist(o.col) < 12) || null;
}

function lightBrambles(o) {
  faceToward(player, o.x - player.x, o.y - 4 - player.y);
  ignite(o);
  Sfx.stoke(1);
  muse('Burn, you thorny thing!');
}

// A tree takes longer to burn down than a bramble, and a bush somewhere between.
const burnTime = (o) => (o.tree ? TREE_BURN_TIME : o.axe === 'bush' ? BUSH_BURN_TIME : BURN_TIME);
const spriteImg = (o) => SPR[o.key].img || SPR[o.key].frames[0];

// How far up the fire has climbed (0 at the foot, 1 at the top), how hard it burns as it dies down, and how charred
// the wood has got.
function burnState(o) {
  const t = Math.max(0, o.burnT) / burnTime(o);
  return { front: Math.min(1.2, t / 0.4), fade: 1 - smooth(Math.min(1, Math.max(0, (t - 0.7) / 0.3))), char: smooth(Math.min(1, t / 0.8)) };
}

// Spots on a sprite's solid pixels for flames to lick at, each with how high up it is: cached per image.
const firePoints = new WeakMap();
function flamePoints(img) {
  let pts = firePoints.get(img);
  if (pts) return pts;
  const { width: w, height: h } = img;
  const data = img.getContext('2d').getImageData(0, 0, w, h).data;
  const solid = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (data[(y * w + x) * 4 + 3] > 128) solid.push([x, y]);
  const n = Math.min(30, Math.max(5, Math.round(solid.length / 16)));
  pts = [];
  for (let i = 0; i < n && solid.length; i++) {
    const [x, y] = solid[Math.floor(hash(i, w * 31 + h, 610) * solid.length)];
    pts.push({ x, y, up: 1 - y / h, seed: hash(i, w + h, 611) * 9, size: 0.6 + hash(i, w, 612) * 0.6 });
  }
  firePoints.set(img, pts);
  return pts;
}

// The flame points the fire has reached, with how hard each is burning.
function litPoints(o) {
  const { front, fade } = burnState(o);
  return flamePoints(spriteImg(o)).map((p) => ({ p, k: Math.min(1, Math.max(0, (front - p.up) * 3)) * fade })).filter((f) => f.k > 0.05);
}

// Each bramble burns for BURN_TIME and sets its neighbours going on the way; a dragon's fireball can start it too.
// The fire climbs from the foot up through the crown, throwing off embers and smoke; when it's done the tree falls
// in on itself in a shower of sparks, and the stump smoulders a while.
function updateBurning(dt) {
  for (let i = burning.length - 1; i >= 0; i--) {
    const o = burning[i];
    const was = o.burnT;
    o.burnT += dt;
    if (o.burnT < 0) continue;
    if (was < 0) Sfx.stoke(0.5 * earshot(o.x, o.y));
    const img = spriteImg(o);
    const [x0, y0] = [o.x - SPR[o.key].ox, o.y - SPR[o.key].oy];
    const lit = litPoints(o);
    const big = img.height > 30;
    if (lit.length && Math.random() < dt * (big ? 50 : 24)) {
      const { p } = lit[Math.floor(Math.random() * lit.length)];
      particles.push({ type: 'ember', x: x0 + p.x, y: y0 + p.y - 2, vx: (Math.random() - 0.5) * 24, vy: -30 - Math.random() * 40, life: 0, max: 0.6 + Math.random() * 0.7 });
    }
    if (lit.length && Math.random() < dt * (big ? 7 : 5)) {
      const top = lit.reduce((a, f) => (f.p.y < a.p.y ? f : a));
      particles.push({ type: big ? 'plume' : 'smoke', x: x0 + top.p.x, y: y0 + top.p.y - 4, vx: 2 + Math.random() * 4, vy: -16 - Math.random() * 8, life: 0, max: big ? 2.2 : 1.6 });
    }
    if (was < 0.5 && o.burnT >= 0.5) {
      for (const n of hittables) if (n !== o && burns(n) && Math.hypot(n.x - o.x, n.y - o.y) < 20) ignite(n, Math.random() * 0.3);
    }
    if (o.burnT < burnTime(o)) continue;
    burning.splice(i, 1);
    delete o.burnT;
    burnOut(o, big);
    if (o.tree) {
      Object.assign(o, { key: TREES[o.tree].stump, hp: undefined, regrowT: REGROW_TIME, charred: true });
      placeCollider(o);
      continue;
    }
    if (o.axe === 'log') Object.assign(o, { hidden: true, regrowT: REGROW_TIME });
    else if (o.axe === 'bush') Object.assign(o, { key: 'bushCut', broken: true, regrowT: REGROW_TIME });
    else Object.assign(o, { key: 'brambleBurnt', broken: true, regrowT: REGROW_TIME });
    o.col.off = true;
  }
  for (let i = smoulder.length - 1; i >= 0; i--) {
    const s = smoulder[i];
    s.t += dt;
    if (s.t >= s.max) { smoulder.splice(i, 1); continue; }
    if (Math.random() < dt * 3 * (1 - s.t / s.max)) particles.push({ type: 'smoke', x: s.x + (Math.random() - 0.5) * 6, y: s.y - 5, vx: 2 + Math.random() * 3, vy: -10 - Math.random() * 4, life: 0, max: 1.8 });
  }
}

function burnOut(o, big) {
  const n = big ? 18 : 8;
  for (let i = 0; i < n; i++) {
    particles.push({ type: 'ember', x: o.x + (Math.random() - 0.5) * (big ? 22 : 12), y: o.y - 4 - Math.random() * (big ? 24 : 8), vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 50, life: 0, max: 0.5 + Math.random() * 0.8 });
  }
  for (let i = 0; i < (big ? 4 : 2); i++) particles.push({ type: big ? 'plume' : 'smoke', x: o.x + (i - 1.5) * 6, y: o.y - 8, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 6, life: 0, max: 2 + Math.random() });
  if (big) Sfx.stoke(0.4 * earshot(o.x, o.y));
  smoulder.push({ x: o.x, y: o.y, t: 0, max: big ? 9 : 3, seed: Math.random() * 9 });
}

const FLAME_LAYERS = [['#b8361a', 1], ['#ff7a24', 0.68], ['#ffd85a', 0.36]];

// A flickering tongue of flame standing on (x, y), `k` how hard it burns.
function tongue(x, y, k, seed, color, s) {
  const flick = 0.8 + 0.2 * Math.sin(time * 13 + seed * 2.3) + 0.12 * Math.sin(time * 31 + seed * 5);
  const w = (1.5 + 2.5 * k) * s;
  const h = (4 + 10 * k) * s * flick;
  const sway = Math.sin(time * 7 + seed) * 1.5 * k;
  const r = Math.round;
  poly(ctx, [[r(x - w), r(y)], [r(x - w * 0.5), r(y + w * 0.6)], [r(x + w * 0.5), r(y + w * 0.6)], [r(x + w), r(y)], [r(x + sway), r(y - h)]], color);
}

function drawBurning(cx, cy) {
  for (const s of smoulder) {
    const k = 1 - s.t / s.max;
    for (let i = 0; i < 3; i++) {
      const on = Math.sin(time * (3 + i) + s.seed + i * 2) > 0.2 - k * 0.6;
      if (!on) continue;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      px(ctx, Math.round(s.x - cx) - 3 + i * 3, Math.round(s.y - cy) - 3 - (i % 2), i === 1 ? '#ffb040' : '#e0501c');
    }
  }
  ctx.globalAlpha = 1;
  for (const o of burning) {
    if (o.burnT < 0) continue;
    const img = spriteImg(o);
    const x0 = o.x - SPR[o.key].ox - cx;
    const y0 = o.y - SPR[o.key].oy - cy;
    const lit = litPoints(o);
    if (!lit.length) continue;
    const heat = lit.reduce((a, f) => a + f.k, 0) / flamePoints(img).length;
    // the fire's own warm light on everything round it
    const gx = x0 + img.width / 2;
    const gy = y0 + img.height * 0.6;
    const gr = Math.max(img.width, img.height) * (0.7 + 0.08 * Math.sin(time * 11 + (o.phase || 0)));
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    glow.addColorStop(0, `rgba(255,130,40,${(0.45 * heat).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255,130,40,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    ctx.globalCompositeOperation = 'source-over';
    const big = img.height > 30 ? 1.3 : 1;
    for (const [c, s] of FLAME_LAYERS) for (const f of lit) tongue(x0 + f.p.x, y0 + f.p.y, f.k * f.p.size, f.p.seed, c, s * big);
  }
}

// Charred black from the foot up, as far as the fire has climbed; a burnt-out stump stays scorched till it regrows.
const charImgs = new WeakMap();
function charImg(img) {
  let c = charImgs.get(img);
  if (c) return c;
  c = makeCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#21170f';
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < c.width * c.height / 24; i++) px(g, Math.floor(hash(i, c.width, 620) * c.width), Math.floor(hash(i, c.height, 621) * c.height), hash(i, 1, 622) < 0.3 ? '#6a2a14' : '#3a2a20');
  charImgs.set(img, c);
  return c;
}

function drawCharred(o, img, sx, sy) {
  const { front, char } = o.burnT >= 0 ? burnState(o) : { front: 1, char: 0.8 };
  const c = charImg(img);
  const cut = Math.round(c.height * (1 - Math.min(1, front)));
  if (cut >= c.height) return;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * char * 0.9;
  ctx.drawImage(c, 0, cut, c.width, c.height - cut, sx, sy + cut, c.width, c.height - cut);
  ctx.globalAlpha = a;
}

// The light a fire throws into the night: none until it's caught.
function burnLight(o) {
  if (o.burnT < 0) return null;
  const { front, fade } = burnState(o);
  const heat = Math.min(1, front) * fade;
  if (heat < 0.05) return null;
  const img = spriteImg(o);
  const r = Math.round((img.height > 30 ? 80 : 40) * (0.5 + 0.5 * heat) * (0.92 + 0.08 * Math.sin(time * 11 + (o.phase || 0))));
  return { x: o.x, y: o.y - img.height * 0.4, r, k: 0.95, glow: Math.round(r * 0.4) };
}

// ---------- the loose boulder ----------

// Leaning into the boulder for a moment rolls it a tile along, if there's room.
function updatePush(dt) {
  const r = looseRock;
  if (r && r.slide) {
    r.slide.t = Math.min(1, r.slide.t + dt / 0.35);
    r.x = Math.round(r.slide.fx + (r.slide.tx - r.slide.fx) * r.slide.t);
    r.y = Math.round(r.slide.fy + (r.slide.ty - r.slide.fy) * r.slide.t);
    placeCollider(r);
    if (r.slide.t >= 1) {
      r.slide = null;
      dust(r.x, r.y);
    }
    return;
  }
  if (!r || r.hidden || hop || !canUseTool() || player.jumpT >= 0) { pushT = 0; return; }
  const [ix, iy] = readInput();
  const [vx, vy] = DIR_VEC[player.dir];
  const toward = vx ? Math.sign(ix) === vx && Math.abs(ix) > 0.7 : Math.sign(iy) === vy && Math.abs(iy) > 0.7;
  const c = r.col;
  const touching = player.x + 5 + vx * 2 > c.x0 && player.x - 5 + vx * 2 < c.x1 && player.y + vy * 2 > c.y0 && player.y - 4 + vy * 2 < c.y1;
  if (!toward || !touching) { pushT = Math.min(pushT, 0); return; }
  pushT += dt;
  if (pushT < 0.45) return;
  pushT = -0.5;
  const tx = r.x + vx * TILE;
  const ty = r.y + vy * TILE;
  const f = SPR.looseRock.foot;
  c.off = true;
  const free = !blocked(tx - f.w / 2, ty - f.h, tx + f.w / 2, ty, null);
  c.off = false;
  if (!free) {
    muse('It won\'t budge that way.');
    Sfx.thunk(0.4);
    return;
  }
  r.slide = { fx: r.x, fy: r.y, tx, ty, t: 0 };
  Sfx.crash(0.5);
}

// ---------- Old Bjorn's cache ----------

const cacheStopped = () => !looseRock.hidden && Math.abs(looseRock.x - cacheObj.x) < 14 && Math.abs(looseRock.y - cacheObj.y - 8) < 10;

function nearCache() {
  if (!cacheObj || hawk.opened || !canUseTool() || cacheStopped()) return null;
  return Math.hypot(player.x - cacheObj.x, player.y - cacheObj.y - 6) < 13 ? cacheObj : null;
}

const HAWK_LOOT = ['gold', 'gold', 'iron', 'iron', 'emerald', 'ruby'];

function openCache(c) {
  hawk.opened = true;
  c.key = 'stoneCacheEmpty';
  pay(300);
  HAWK_LOOT.forEach((id, i) => spawnDrop(id, c.x + (i - 2.5) * 8, c.y + 14, (i - 2.5) * 16, 8, 70));
  popIcon('goldCoin', player.x, player.y - 30);
  stats.treasure++;
  Sfx.reward();
  toast('OLD BJORN\'S CACHE', '3 gold coins, gold, iron and gems');
  muse('Old Bjorn\'s hoard! Three gold coins, and more besides.');
}

// ---------- prompts and hints ----------

// What a ladder or bridge kit would do, facing what's in front, if it would do anything.
function placeLabel(id) {
  if (id === 'ladder') {
    const c = cliffAhead();
    if (c) return c.k <= LADDER_REACH ? 'Lean the ladder against the cliff' : '';
  }
  const w = waterAhead(SPAN[id]);
  return w && !w.wide ? (id === 'ladder' ? 'Lay the ladder across the water' : 'Lay the bridge across') : '';
}

// What F would do with the hook, facing what's in front.
function buildHint(id) {
  if (!canUseTool()) return '';
  if (id === 'grapple') {
    const c = cliffAhead();
    if (c) return c.k <= HOOK_REACH ? `F  Throw the hook and climb ${c.s < 0 ? 'up' : 'down'}` : 'Too high, even for the hook';
  }
  if (id === 'tent') return tentNear() ? 'F  Pack up the tent' : tentSpot() ? 'F  Pitch the tent here' : indoors ? '' : 'Find open level ground to pitch the tent';
  return '';
}

// A word about what's in the way when nothing in the pack is ready for it.
function obstacleHint() {
  if (!canUseTool()) return '';
  if (hittables.some((o) => kindOf(o) === 'bramble' && boxDist(o.col) < 10)) return 'Thorny brambles. Something sharp could cut a way through... or something burning';
  if (hittables.some((o) => kindOf(o) === 'log' && boxDist(o.col) < 10)) return 'A fallen trunk. An axe would chop it up, or take a run at it and leap';
  if (looseRock && !looseRock.hidden && !looseRock.slide && boxDist(looseRock.col) < 8) return 'A loose boulder. Lean into it to roll it aside, or break it with a pickaxe';
  const c = cliffAhead();
  if (c && c.s < 0 && tierAt(tileX(c.x), tileY(player.y) - 1)) return 'Too high to climb by hand. Look for a lower bit of the ledge, or lean a ladder on it';
  if (c) return c.k <= LADDER_REACH ? 'Too sheer to climb by hand. A ladder would reach the top' : 'Far too high to climb. A hook and rope might do it';
  const w = waterAhead(SPAN.bridge);
  if (w && w.rough) return 'Rapids! Much too fast to swim. A bridge, or something long laid across?';
  return '';
}

// ---------- each frame ----------

const onHawk = (tx, ty) => { const k = isle('hawk'); return Math.abs(tx - k.x) <= k.rx + 2 && Math.abs(ty - k.y) <= k.ry + 2; };

function updateBuild(dt) {
  updateGrapple(dt);
  updateBurning(dt);
  updatePush(dt);
  if (!player.swimming) player.swept = false;
  const tx = tileX(player.x);
  const ty = tileY(player.y);
  if (indoors || hop || flight || sail || player.swimming || !onHawk(tx, ty)) return;
  const k = isle('hawk');
  const dy = ty - k.y;
  const low = tx >= k.x + HAWK.low[0] && tx <= k.x + HAWK.low[1];
  if (dy <= HAWK.strip + (low ? 2 : 0)) stats.hawkTop = 1;
  if (dy < HAWK.stream[0]) stats.hawkAcross = 1;
}

// ---------- saving ----------

function saveBuild() {
  return {
    opened: hawk.opened,
    placed: placed.map((p) => (p.kind === 'campfire' || p.kind === 'tent' ? { kind: p.kind, x: p.o.x, y: p.o.y }
      : p.kind === 'ladder' ? { kind: p.kind, x: p.x, base: p.base, k: p.k }
        : { kind: p.kind, tiles: p.tiles, ns: p.ns, ends: p.ends })),
  };
}

function restoreBuild(s) {
  if (!s) return;
  hawk.opened = !!s.opened;
  if (hawk.opened && cacheObj) cacheObj.key = 'stoneCacheEmpty';
  for (const p of s.placed || []) {
    if (p.kind === 'campfire') buildCampfire(p.x, p.y);
    // older saves took the tent off the hotbar while it was pitched
    else if (p.kind === 'tent') { pitchTent(p.x, p.y); bag.tent ||= 1; stats.pitched ||= 1; }
    else if (p.kind === 'ladder') leanLadder(p.x, p.base, p.k);
    else setBridge({ kind: p.kind, tiles: p.tiles.filter(([x, y]) => tileAt(x, y) === T.WATER), ns: p.ns, ends: p.ends });
  }
}
