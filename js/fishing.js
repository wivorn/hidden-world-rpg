// What bites depends on where the line goes in. The fish log keeps tally, and the fisher has a word for each first catch.

// `size` is the range in cm, `where` fills the log once caught and `hint` before.
const FISH = {
  fish: { zone: 'shallows', size: [18, 32], where: 'Shallow sea, close to shore', hint: 'Cast off any beach or jetty.' },
  cod: { zone: 'deep', size: [40, 95], where: 'Deep open sea', hint: 'Lives far out, where the water turns dark.' },
  trout: { zone: 'lake', size: [24, 52], where: 'Lakes and rivers', hint: 'Prefers fresh water to salt.' },
  eel: { zone: 'volcano', size: [50, 130], where: 'Hot sea round the fire mountain, and the hot spring', hint: 'Likes its water warm. Very warm.' },
  cavefish: { zone: 'cave', size: [10, 22], where: 'The pool deep in the ice cave', hint: 'Has never once seen the sun.' },
  goldenFish: { zone: 'any', size: [30, 48], where: 'Anywhere at all, once in a long while', hint: 'A legend. They say a golden lure helps.' },
};
const FISH_IDS = Object.keys(FISH);
const GOLDEN_CHANCE = 0.025;
const LURE_GOLDEN_CHANCE = 0.07;

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

// Lands a fish from the bobber's water and logs it (into the pack unless `keep` is false); returns which kind.
function catchFish(f, keep = true) {
  const golden = Math.random() < (upgrades.lure ? LURE_GOLDEN_CHANCE : GOLDEN_CHANCE);
  const zone = fishZone(f.x, f.y);
  const id = golden ? 'goldenFish' : FISH_IDS.find((k) => FISH[k].zone === zone);
  const [a, b] = FISH[id].size;
  const size = Math.round(a + (b - a) * Math.random() ** 1.6);
  if (keep) give(id);
  const log = fishLog.caught[id];
  if (!log) {
    fishLog.caught[id] = { n: 1, best: size };
    toast(golden ? 'LEGENDARY CATCH!' : 'NEW FISH', `${ITEMS[id].name}  ·  ${size} cm`);
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
