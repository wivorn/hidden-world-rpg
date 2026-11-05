// Saving the adventure in the browser: every so often, when the tab is hidden or closed, and after a night's sleep.
// Felled trees, mined ore and the like grow back anyway, so the save keeps the story and the player's things.

const SAVE_KEY = 'hw-save';
const SAVE_VERSION = 1;
const AUTOSAVE_MS = 20000;
// The last place the player stood on firm ground; a game saved mid-flight or while swimming resumes there.
let safeSpot = null;

function readSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    return s && s.v === SAVE_VERSION ? s : null;
  } catch (e) {
    return null;
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) { /* storage unavailable */ }
}

const roomId = () => (indoors ? Object.keys(ROOMS).find((k) => ROOMS[k] === indoors) : null);
const onFirmGround = () => !flight && !sail && !hop && !fade && !player.swimming && !player.flying && player.jumpT < 0;

// The explored parts of the map, as run lengths of alternating unseen and seen tiles.
function packSeen() {
  const runs = [];
  let v = 0;
  let n = 0;
  for (const b of seen) {
    if (b === v) n++;
    else {
      runs.push(n);
      v = b;
      n = 1;
    }
  }
  runs.push(n);
  return runs.join(',');
}

function unpackSeen(s) {
  let i = 0;
  let v = 0;
  for (const n of s.split(',').map(Number)) {
    seen.fill(v, i, i + n);
    i += n;
    v ^= 1;
  }
  fogDirty = true;
  lastReveal = '';
}

function snapshot() {
  const spot = sail || onFirmGround() || !safeSpot ? { x: player.x, y: player.y, room: roomId() } : safeSpot;
  const things = { ...bag };
  if (player.cook) things[player.cook.id] = (things[player.cook.id] || 0) + 1;
  return {
    v: SAVE_VERSION,
    hero: { name: player.name, look: player.look.id },
    clock, dayCount, weather: weather.want,
    player: { ...spot, dir: player.dir, sail: !!sail, fedT: Math.max(0, player.fedT || 0) },
    ship: { x: shipObj.x, y: shipObj.y, facing: shipObj.facing, dir: shipObj.dir },
    bag: things, slots: [...slots], activeSlot, activeTool, focus, stats: { ...stats }, journal,
    npcs: npcs.map((n) => ({ gaveAxe: n.gaveAxe, gaveRod: n.gaveRod, scrapGiven: n.scrapGiven, tipTold: n.tipTold })),
    flock: { asked: flockAsked, done: flockDone },
    dog: { state: dog.state, asked: dog.asked },
    eggStage,
    eggs: eggs.map((e) => ({ state: e.state, x: e.x, y: e.y, hatchT: e.hatchT })),
    dragons: dragons.map((d) => {
      const at = flight && flight.dragon === d ? spot : d;
      return { species: d.species, name: d.name, stage: d.stage, x: Math.round(at.x), y: Math.round(at.y), follower: d === follower };
    }),
    map: { seen: packSeen(), learned: POIS.filter((p) => p.learned).map((p) => p.id), seenPois: POIS.filter((p) => p.seen).map((p) => p.id) },
    drops: drops.filter((d) => d.z <= 0 && !d.fuel && !d.thrown).map((d) => [d.item, Math.round(d.x), Math.round(d.y)]),
    silver, upgrades: { ...upgrades }, fishLog, chest: { ...chestStore },
    archery: { stage: archery.stage, active: archery.active, intro: archery.intro },
  };
}

function saveGame(announce = false) {
  if (!started) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
    if (announce) toast('GAME SAVED', `Day ${dayCount}`);
  } catch (e) { /* storage full or unavailable */ }
}

// ---------- loading ----------

function restore(s) {
  player.name = s.hero.name;
  if (PLAYER_LOOKS[s.hero.look]) player.look = PLAYER_LOOKS[s.hero.look];
  clock = s.clock;
  dayCount = s.dayCount;
  setWeather(s.weather, true);

  // items since retired (the hammer) are dropped
  for (const [id, n] of Object.entries(s.bag)) if (ITEMS[id]) bag[id] = n;
  // saves from before the tanner made belts, whose tools already hung off one, keep it if they'd overflow the pack
  if (!has('toolBelt') && Object.keys(ITEMS).filter((id) => has(id) && inPack(id)).length > packSize()) bag.toolBelt = 1;
  Object.assign(stats, s.stats);
  Object.assign(journal.started, s.journal.started);
  Object.assign(journal.done, s.journal.done);
  slots.length = 0;
  slots.push(...s.slots.map((id) => (inPack(id) ? id : null)));
  activeSlot = s.activeSlot;
  const oldPick = s.slots[s.activeSlot];
  activeTool = s.activeTool ?? (ITEMS[oldPick]?.tool ? oldPick : null);
  focus = s.focus || (activeTool ? 'tools' : 'items');
  s.npcs.forEach((d, i) => { if (npcs[i]) Object.assign(npcs[i], d); });
  if (has('backpack')) wearBackpack();
  if (hasMap()) {
    wallMap().hidden = true;
    mapBtn.hidden = false;
  }
  unpackSeen(s.map.seen);
  for (const p of POIS) {
    p.learned ||= s.map.learned.includes(p.id);
    p.seen ||= s.map.seenPois.includes(p.id);
  }

  restoreFlock(s.flock);
  restoreDog(s.dog);
  restorePlayer(s);
  restoreEggs(s);
  restoreDragons(s.dragons);

  drops.length = 0;
  for (const [item, x, y] of s.drops) if (ITEMS[item]) spawnDrop(item, x, y, 0, 0, 0);
  restoreTrade(s);
  renderInventory();
}

// Saves from before the merchant, the fish log and the archer's challenges simply start those fresh.
function restoreTrade(s) {
  silver = s.silver || 0;
  Object.assign(upgrades, s.upgrades);
  Object.assign(chestStore, s.chest);
  if (s.fishLog) {
    Object.assign(fishLog.caught, s.fishLog.caught);
    Object.assign(fishLog.told, s.fishLog.told);
  }
  Object.assign(archery, s.archery);
  fishLogBtn.hidden = !has('fishLog');
  applySail();
  renderPurse();
  updateArcherLines();
}

function restoreFlock(f) {
  flockAsked = f.asked;
  flockDone = f.done;
  if (!flockDone) return;
  for (const o of hittables) {
    if (!o.pen || !o.broken) continue;
    Object.assign(o, { key: o.base, broken: false, mendNow: false, regrowT: 0 });
    placeCollider(o);
    o.col.off = false;
  }
  sheep.forEach((s, i) => Object.assign(s, { x: PEN.x0 + 24 + (i % 3) * 36, y: PEN.y0 + 22 + Math.floor(i / 3) * 26, state: 'idle', timer: 1 }));
  looseCount = 0;
  shepherd.line = null;
}

function restoreDog(d) {
  dog.asked = d.asked;
  if (d.state === 'carried') dog.state = 'carried';
  if (d.state !== 'home') return;
  Object.assign(dog, standSpotNear(dog, dogOwner.x - 14, dogOwner.y + 3), { state: 'home' });
  dogOwner.lines = [...DOG_THANKS, ...dogOwner.lines];
  dogOwner.nightLines = [...DOG_THANKS, ...dogOwner.nightLines];
}

function restorePlayer(s) {
  Object.assign(shipObj, s.ship);
  const p = s.player;
  indoors = p.room ? ROOMS[p.room] || null : null;
  Object.assign(player, { x: p.x, y: p.y, dir: p.dir, fedT: p.fedT, swimming: false, flying: false });
  if (!p.sail) return;
  const deck = deckPos();
  sail = { vx: 0, vy: 0, wakeT: 0, shoreT: 0, shore: null };
  shipObj.rider = player.look;
  Object.assign(player, { x: deck.x, y: shipObj.y, flying: true });
}

function restoreEggs(s) {
  for (const stage of STAGES) if (STAGES.indexOf(stage) <= STAGES.indexOf(s.eggStage)) setStage(stage);
  s.eggs.forEach((d, i) => {
    const e = eggs[i];
    if (!e || d.state === 'wild') return;
    if (d.state === 'warming') {
      Object.assign(e, { x: d.x, y: d.y, hidden: false, crack: 0, hatchT: d.hatchT, state: 'warming' });
      placeCollider(e);
      e.col.off = false;
      return;
    }
    Object.assign(e, { hidden: true, state: d.state });
    e.col.off = true;
    if (d.state === 'carried') carried = e;
  });
}

function restoreDragons(list) {
  for (const s of list) {
    if (!DRAGON_SPECIES[s.species]) continue;
    const d = {
      species: s.species, x: s.x, y: s.y, alt: 0, dir: 'down', anim: 0, frame: 0, flying: false, stuck: 0, jumpT: 0, jumpDelay: 0,
      emote: null, emoteT: 0, chirpT: 4, stage: s.stage, swoop: null, catchT: 0, home: { x: s.x, y: s.y }, wanderT: 3, name: s.name,
    };
    dragons.push(d);
    if (d.stage === GROWN) {
      const spot = perchSpot(s.x, s.y, AROUND) || perchSpot(villageFire.x, villageFire.y + 40, AROUND);
      const o = { key: `dragon_${d.species}`, x: spot.x, y: spot.y, phase: 0, hidden: false, col: { off: false } };
      placeCollider(o);
      objects.push(o);
      colliders.push(o.col);
      Object.assign(d, { obj: o, x: spot.x, y: spot.y, perched: true, flap: 0, spot: null, settleOnLand: false });
    } else {
      const near = s.follower && !sail ? standSpotNear(d, player.x + 14, player.y - 2) : canStand(d, s.x, s.y) ? { x: s.x, y: s.y } : standSpotNear(d, villageFire.x, villageFire.y + 34);
      Object.assign(d, near, { home: { ...near }, target: { ...near } });
      if (s.follower && sail) Object.assign(d, { flying: true, alt: 30 });
    }
    if (s.follower) follower = d;
  }
}

// ---------- start screen and autosave ----------

const continueBtn = document.getElementById('continue');
const savedGame = readSave();
if (savedGame) {
  continueBtn.hidden = false;
  continueBtn.textContent = `CONTINUE: ${savedGame.hero.name.toUpperCase()}, DAY ${savedGame.dayCount}`;
  startForm.querySelector('button[type="submit"]').textContent = 'NEW GAME';
  continueBtn.focus();
}

continueBtn.addEventListener('click', () => {
  try {
    restore(savedGame);
  } catch (e) {
    console.error('Could not load the saved game', e);
  }
  beginGame();
  setTimeout(() => toast('WELCOME BACK', `${player.name}, day ${dayCount}`), 600);
});

setInterval(() => {
  if (started && onFirmGround()) safeSpot = { x: player.x, y: player.y, room: roomId() };
}, 500);
setInterval(() => saveGame(), AUTOSAVE_MS);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', () => saveGame());
