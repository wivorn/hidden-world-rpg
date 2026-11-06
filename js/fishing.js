// What bites depends on where the line goes in. The fish log keeps tally, and the fisher has a word for each first catch.

// `size` is the range in cm, `where` fills the log once caught and `hint` before. Each water has its common fish
// and a rarer one or two, which bite `RARITY` times as often.
const FISH = {
  fish: { zone: 'shallows', rarity: 'common', size: [18, 32], where: 'Shallow sea, close to shore', hint: 'Cast off any beach or jetty.' },
  mackerel: { zone: 'shallows', rarity: 'uncommon', size: [28, 46], where: 'Shallow sea, now and then', hint: 'Darts about the shallows. A shiny lure catches its eye.' },
  cod: { zone: 'deep', rarity: 'common', size: [40, 95], where: 'Deep open sea', hint: 'Lives far out, where the water turns dark.' },
  anglerfish: { zone: 'deep', rarity: 'rare', size: [30, 80], where: 'Deep open sea, very rarely', hint: 'Dangles its own little light, way down deep.' },
  trout: { zone: 'lake', rarity: 'common', size: [24, 52], where: 'Lakes and rivers', hint: 'Prefers fresh water to salt.' },
  salmon: { zone: 'lake', rarity: 'uncommon', size: [50, 95], where: 'Lakes and rivers, now and then', hint: 'A strong swimmer in fresh water. Tempt it with a lure.' },
  eel: { zone: 'volcano', rarity: 'common', size: [50, 130], where: 'Hot sea round the fire mountain, and the hot spring', hint: 'Likes its water warm. Very warm.' },
  emberKoi: { zone: 'volcano', rarity: 'rare', size: [35, 70], where: 'Hot water by the fire mountain, very rarely', hint: 'Glows like a coal among the fire eels.' },
  cavefish: { zone: 'cave', rarity: 'common', size: [10, 22], where: 'The pool deep in the ice cave', hint: 'Has never once seen the sun.' },
  crystalFish: { zone: 'cave', rarity: 'rare', size: [12, 26], where: 'The ice cave pool, very rarely', hint: 'Clear as ice. Hard to see, harder to catch.' },
  goldenFish: { zone: 'any', rarity: 'legendary', size: [30, 48], where: 'Anywhere at all, once in a long while', hint: 'A legend. They say a golden lure helps.' },
};
const FISH_IDS = Object.keys(FISH);
const RARITY = { common: 1, uncommon: 0.18, rare: 0.05 };
const GOLDEN_CHANCE = 0.025;

// One lure goes on the hook per cast, and is used up when a fish is landed with it. Fish bite `bite` times as soon,
// the rarer fish of each water come `boost` times as often, and a golden fish bites at the `golden` chance.
const LURES = {
  featherLure: { bite: 0.8, boost: { uncommon: 2, rare: 1.5 }, golden: 0.03, note: 'Bites come sooner; rarer fish a little oftener.' },
  spinner: { bite: 0.7, boost: { uncommon: 3, rare: 3 }, golden: 0.04, note: 'Flashes silver. Rarer fish come three times as often.' },
  glowLure: { bite: 0.6, boost: { uncommon: 3, rare: 6 }, golden: 0.05, note: 'Glows in deep or dark water. The rarest fish can\'t resist it.' },
  goldenLure: { bite: 0.6, boost: { uncommon: 4, rare: 8 }, golden: 0.12, note: 'Golden fish bite five times as often, and rare fish far oftener.' },
};
const LURE_IDS = Object.keys(LURES);

// `caught[id]` = { n, best }; `told[id]` once the fisher has had his say about it.
const fishLog = { caught: {}, told: {} };

function fishZone(x, y) {
  if (inCave()) return 'cave';
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tileAt(tx, ty) === T.SPRING) return 'volcano';
  if (inland[ty * MAP_W + tx]) return 'lake';
  const v = ISLANDS.find((i) => i.id === 'volcano');
  if (Math.hypot((tx - v.x) / (v.rx + 16), (ty - v.y) / (v.ry + 14)) < 1) return 'volcano';
  return seaDist[ty * MAP_W + tx] >= 7 ? 'deep' : 'shallows';
}

// What takes the bait at the bobber's water.
function pickFish(f) {
  const lure = LURES[f.lure];
  if (Math.random() < (lure ? lure.golden : GOLDEN_CHANCE)) return 'goldenFish';
  const zone = fishZone(f.x, f.y);
  const pool = FISH_IDS.filter((k) => FISH[k].zone === zone);
  const odds = pool.map((k) => RARITY[FISH[k].rarity] * (lure?.boost[FISH[k].rarity] || 1));
  let r = Math.random() * odds.reduce((a, b) => a + b, 0);
  return pool.find((k, i) => (r -= odds[i]) < 0) || pool[0];
}

// Lands the fish on the line and logs it (into the pack unless `keep` is false); returns which kind.
function catchFish(f, keep = true) {
  const id = f.fish || pickFish(f);
  const golden = id === 'goldenFish';
  const [a, b] = FISH[id].size;
  const size = Math.round(a + (b - a) * Math.random() ** 1.6);
  if (keep) give(id);
  const log = fishLog.caught[id];
  if (!log) {
    fishLog.caught[id] = { n: 1, best: size };
    toast(golden ? 'LEGENDARY CATCH!' : FISH[id].rarity === 'common' ? 'NEW FISH' : `${FISH[id].rarity.toUpperCase()} CATCH!`, `${ITEMS[id].name}  ·  ${size} cm`);
  } else {
    log.n++;
    if (size > log.best) {
      log.best = size;
      toast('NEW RECORD', `${ITEMS[id].name}  ·  ${size} cm`);
    }
  }
  if (golden) burst(player.x, player.y - 20, ['#f2c03a', '#fff0a0', '#ffffff'], 18, 50);
  if (fishLogOpen) renderFishLog();
  return id;
}

const kindsCaught = () => FISH_IDS.filter((id) => fishLog.caught[id]).length;

// ---------- the fisher's commentary ----------

const FISHER_SAYS = {
  fish: 'A herring! That\'s how every angler starts. Fry it, salt it, or feed it to a dragon.',
  cod: 'A cod from the deep! You took the longship out, didn\'t you? Proper fisherfolk now.',
  trout: 'Trout! Sweet as honey, from fresh water. The lake by the village is full of them.',
  eel: 'A fire eel?! From the hot water by the volcano? Hold it by the tail, they bite!',
  cavefish: 'A cave fish... no eyes at all! Where did you find that? Brr, it\'s cold as ice.',
  mackerel: 'A mackerel! Look at those stripes. Quick little things, they go for anything shiny.',
  salmon: 'A salmon, from fresh water! Strong as an ox, those. You did well to land it.',
  anglerfish: 'By the gods, what IS that? An anglerfish, from the very bottom of the deep. It\'s got its own lantern!',
  emberKoi: 'An ember koi! I\'ve heard of them but never seen one. It\'s still warm!',
  crystalFish: 'A crystal fish... you can see right through it! The hermit will never believe this.',
  goldenFish: 'By Odin\'s beard... a GOLDEN FISH! Forty winters I\'ve fished and never landed one. The merchant would pay a fortune for that.',
};

// The first time the fisher sees a new kind in your bag (or your log), he has something to say.
function fisherTalk(n) {
  if (n.look.id !== 'fisher' || !has('fishLog')) return false;
  const id = FISH_IDS.find((k) => fishLog.caught[k] && !fishLog.told[k]);
  if (!id) return false;
  fishLog.told[id] = true;
  const left = FISH_IDS.length - kindsCaught();
  npcSay(n, `${FISHER_SAYS[id]}${left ? '' : ' And that\'s every fish in these waters. You\'re a master angler, {name}!'}`);
  faceToward(n, player.x - n.x, player.y - n.y);
  return true;
}

// The fisher's standing tip: where to find a fish the log is still missing.
function fisherTip() {
  const id = FISH_IDS.find((k) => !fishLog.caught[k]);
  return {
    fish: 'Start simple, {name}: cast off the jetty. The herring practically jump on the hook.',
    cod: 'Want a big one? Sail the longship out into the deep sea and cast from the deck. That\'s where the cod are.',
    trout: 'Try the lake by the village sometime. Fresh water, fresh fish. Trout, mostly.',
    eel: 'The water round the fire mountain runs hot. Something lives in it, red as embers. Fire eels!',
    cavefish: 'The hermit swears there\'s a pool inside the ice cave on the frozen isle, with pale fish in it. Bring a torch.',
    mackerel: 'Mackerel dart about the shallows, but they\'re choosy. A feather lure or a spinner from my shack gets their attention.',
    salmon: 'There\'s salmon in the lake, now and then. Put a lure on and be patient.',
    anglerfish: 'Out in the deep there\'s a fish with its own lantern. They say a glow lure fools it.',
    emberKoi: 'Among the fire eels by the volcano swims an ember koi, once in a blue moon. Try a glow lure.',
    crystalFish: 'The ice cave pool hides a fish clear as glass. Rare as rubies. Take your best lure.',
    goldenFish: 'Every so often there\'s a golden fish, anywhere at all. The merchant sells a golden lure that tempts them.',
  }[id];
}

// ---------- the fish log screen ----------

const fishLogBtn = document.getElementById('fishlog-btn');
const fishLogEl = document.getElementById('fishlog');
const fishLogSum = document.getElementById('fishlog-sum');
const fishLogList = document.getElementById('fishlog-list');
const fishLogClose = document.getElementById('fishlog-close');
let fishLogOpen = false;
const silhouettes = {};

function silhouette(id) {
  if (silhouettes[id]) return silhouettes[id];
  const src = SPR.icon[id];
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#2a1a0e';
  g.fillRect(0, 0, c.width, c.height);
  return (silhouettes[id] = c.toDataURL());
}

function giveFishLog() {
  bag.fishLog = 1;
  fishLogBtn.hidden = false;
}

function renderFishLog() {
  fishLogSum.textContent = `${kindsCaught()} OF ${FISH_IDS.length} KINDS CAUGHT`;
  fishLogList.replaceChildren(...FISH_IDS.map((id) => {
    const got = fishLog.caught[id];
    const li = document.createElement('li');
    li.className = got ? 'fish got' : 'fish';
    const img = document.createElement('img');
    img.src = got ? (iconUrls[id] ||= SPR.icon[id].toDataURL()) : silhouette(id);
    img.alt = '';
    img.style.width = `${SPR.icon[id].width * 3}px`;
    const name = Object.assign(document.createElement('h3'), { textContent: got ? ITEMS[id].name : '???' });
    const where = Object.assign(document.createElement('p'), { textContent: got ? FISH[id].where : FISH[id].hint });
    li.append(img, name, where);
    if (FISH[id].rarity !== 'common') li.append(Object.assign(document.createElement('p'), { className: `rarity ${FISH[id].rarity}`, textContent: FISH[id].rarity.toUpperCase() }));
    if (got) li.append(Object.assign(document.createElement('p'), { className: 'tally', textContent: `CAUGHT ${got.n}  ·  BEST ${got.best} CM` }));
    return li;
  }));
}

function toggleFishLog(open = !fishLogOpen) {
  if (open && (!has('fishLog') || naming || mapOpen || journalOpen || tradeOpen)) return;
  fishLogOpen = open;
  fishLogEl.hidden = !open;
  fishLogBtn.setAttribute('aria-expanded', String(open));
  keys.clear();
  if (open) {
    Sfx.door();
    renderFishLog();
    fishLogClose.focus();
  } else {
    fishLogBtn.blur();
  }
}

fishLogBtn.addEventListener('click', () => toggleFishLog());
fishLogClose.addEventListener('click', () => toggleFishLog(false));
fishLogEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' && e.code !== 'KeyL') return;
  e.preventDefault();
  e.stopPropagation();
  toggleFishLog(false);
});
fishLogEl.addEventListener('pointerdown', (e) => { if (e.target === fishLogEl) toggleFishLog(false); });

// ---------- picking a lure ----------

// Casting with lures in the bag first asks which one goes on the hook. The choice holds while you fish the same spot,
// and is asked again once you move on or run out of it.
const lurePickEl = document.getElementById('lurepick');
const lurePickList = document.getElementById('lurepick-list');
const lurePick = { set: false, id: null, x: 0, y: 0 };
const LURE_STAY = 24;
let lurePickOpen = false;

const lureSpot = () => (sail ? [shipObj.x, shipObj.y] : [player.x, player.y]);
const lureOn = () => (lurePick.set && lurePick.id && has(lurePick.id) ? lurePick.id : null);

function lureToPick() {
  if (!LURE_IDS.some(has)) return false;
  const [x, y] = lureSpot();
  return !lurePick.set || Math.hypot(x - lurePick.x, y - lurePick.y) > LURE_STAY || (!!lurePick.id && !has(lurePick.id));
}

function openLurePick() {
  lurePickOpen = true;
  player.windup = null;
  keys.clear();
  const ids = [...LURE_IDS.filter(has), null];
  lurePickList.replaceChildren(...ids.map((id, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.lure = id || '';
    const key = Object.assign(document.createElement('b'), { textContent: i + 1 });
    key.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.append(
      Object.assign(document.createElement('strong'), { textContent: id ? `${ITEMS[id].name}  ×${bag[id]}` : 'No lure' }),
      Object.assign(document.createElement('small'), { textContent: id ? LURES[id].note : 'Just the bare hook. Saves your lures.' }),
    );
    b.append(key, id ? iconImg(id, 2) : Object.assign(document.createElement('i'), { className: 'hook' }), text);
    li.append(b);
    return li;
  }));
  lurePickEl.hidden = false;
  Sfx.drop();
  (lurePickList.querySelector(`[data-lure="${lurePick.set ? lurePick.id || '' : ids[0]}"]`) || lurePickList.querySelector('button')).focus();
}

function closeLurePick() {
  lurePickOpen = false;
  lurePickEl.hidden = true;
  keys.clear();
}

function chooseLure(id) {
  const [x, y] = lureSpot();
  Object.assign(lurePick, { set: true, id, x, y });
  closeLurePick();
  Sfx.drop();
  muse(id ? `${ITEMS[id].name} on the hook. Now to cast!` : 'Bare hook it is. Now to cast!');
}

// A lure is spent once a fish is landed on it.
function useLure(id) {
  if (!id || !has(id)) return;
  bag[id]--;
  renderInventory();
  if (!has(id)) muse(`That was my last ${ITEMS[id].name.toLowerCase()}.`);
}

lurePickList.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) chooseLure(b.dataset.lure || null);
});
lurePickEl.addEventListener('pointerdown', (e) => { if (e.target === lurePickEl) closeLurePick(); });
// Registered before the game's own keys, so while the picker is open they never reach it.
window.addEventListener('keydown', (e) => {
  if (!lurePickOpen) return;
  e.stopImmediatePropagation();
  const btns = [...lurePickList.querySelectorAll('button')];
  if (e.code === 'Escape') {
    e.preventDefault();
    closeLurePick();
  } else if (/^Digit[1-9]$/.test(e.code) && btns[+e.code[5] - 1]) {
    e.preventDefault();
    btns[+e.code[5] - 1].click();
  } else if (/^(ArrowUp|ArrowDown|KeyW|KeyS)$/.test(e.code)) {
    e.preventDefault();
    const i = btns.indexOf(document.activeElement);
    const step = /Up|W/.test(e.code) ? -1 : 1;
    btns[(i + step + btns.length) % btns.length].focus();
  } else if (e.code === 'KeyF' && !e.repeat) {
    e.preventDefault();
    document.activeElement?.closest('#lurepick-list button')?.click();
  }
});
