// The dragon log (K): every kind of dragon there is, with a rumour of where its egg lies until it's found, then
// what it breathes and how it hatches; and below, each dragon the player has raised, how grown it is and where it
// is now. Kinds bred at the roost join the list once their egg turns up.

const DRAGON_LORE = {
  nightFury: {
    rumour: 'Old tales speak of a ring of standing stones far to the south-west, and something asleep beneath its altar.',
    where: 'Sealed under the altar in the ring of rune stones on the ruin isle.',
    about: 'Rarest of them all. Fast as a falling star, and black as the night it hunts in.',
  },
  lightFury: {
    rumour: 'Under the frozen isle runs a cave of ice. The hermit says something precious waits at its very end.',
    where: 'In a nest at the far end of the ice cave under the frozen isle.',
    about: 'Pale as moonlight on snow. Its breath turns water to ice and snuffs out fires.',
  },
  thunderdrum: {
    rumour: 'A maze of vine trees fills the jungle isle\'s heart. Something big nests at the middle.',
    where: 'In a nest at the heart of the vine maze on the jungle isle.',
    about: 'Its roar is a wall of sound: it knocks things flat and shakes the fruit off trees.',
  },
  terribleTerror: {
    rumour: 'A sphinx guards a cave of treasure on the dune isle, far to the south. It lets by only those who answer its riddles.',
    where: 'On the dais at the back of the sand cave, behind the sphinx on the dune isle.',
    about: 'Small, quick and very sure of itself. Sets whatever it breathes on alight.',
  },
  skrill: {
    rumour: 'A storm sits on Stormcrown Tor, far out east, and never leaves. Sailors say something sparks on the hill in the rain.',
    where: 'On the barrow at the top of Stormcrown Tor. It only shows in the rain.',
    about: 'Rides the storm. Its lightning strikes the moment it\'s breathed.',
    hatch: 'Cracked by a bolt of lightning, called down with six rods round the barrow.',
  },
};
const BRED_LORE = {
  rumour: 'Two grown dragons left together at the roost might lay an egg of a kind never seen before.',
  where: 'Laid in the nest at the dragon roost on the hermit\'s isle.',
  about: 'A kind never seen before, bred at the roost from two grown dragons.',
};
const LAVA_HATCH = 'Hatched in fire: thrown into the lava pool atop the fire mountain\'s cave, or dropped into its crater.';
const BREATH_NAMES = { plasma: 'Plasma blast', fire: 'Fire', frost: 'Frost', sonic: 'Sonic roar', lightning: 'Lightning' };
const AGE_NAMES = ['HATCHLING', 'YOUNGLING', 'JUVENILE', 'GROWN'];

const dragonLogBtn = document.getElementById('dragonlog-btn');
const dragonLogEl = document.getElementById('dragonlog');
const dragonLogSum = document.getElementById('dragonlog-sum');
const dragonLogKinds = document.getElementById('dragonlog-kinds');
const dragonLogMine = document.getElementById('dragonlog-mine');
const dragonLogClose = document.getElementById('dragonlog-close');
let dragonLogOpen = false;
const dragonPics = {};

// The wild kinds first, then the bred ones in the order their eggs turned up.
const loggedKinds = () => [...Object.keys(DRAGON_LORE), ...roost.bred.map((b) => b.id)].filter((id) => DRAGON_SPECIES[id]);

// 'hatched', 'warming' (in the lava), 'found' (the egg's been taken, or for a bred kind laid), 'seen' (the Tor's egg,
// glimpsed in the rain) or 'unknown'.
function kindState(id) {
  if (dragons.some((d) => d.species === id)) return 'hatched';
  const e = eggs.find((o) => o.species === id);
  if (!e) return 'unknown';
  if (e.state === 'hatched') return 'hatched';
  if (e.state === 'warming') return 'warming';
  if (e.state !== 'wild' || e.roostEgg) return 'found';
  return id === 'skrill' && stats.torSeen ? 'seen' : 'unknown';
}

const KIND_STATUS = { hatched: 'HATCHED', warming: 'EGG WARMING IN THE LAVA', found: 'EGG FOUND', seen: 'EGG SEEN', unknown: 'EGG NOT FOUND' };

// A sprite as an image URL, or all in black as a silhouette.
function dragonPic(key, img, dark = false) {
  const k = `${key}${dark ? ':dark' : ''}`;
  if (dragonPics[k]) return dragonPics[k];
  if (!dark) return (dragonPics[k] = img.toDataURL());
  const c = makeCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#000000';
  g.fillRect(0, 0, c.width, c.height);
  return (dragonPics[k] = c.toDataURL());
}

const grownImg = (id) => SPR[`dragon_${id}`].frames[0];
const eggImg = (id) => SPR[`egg_${id}`].img;

function logImg(src, w, h) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  return img;
}

const logLine = (text, className = '') => Object.assign(document.createElement('p'), { textContent: touchWords(text), className });

function kindCard(id) {
  const state = kindState(id);
  const sp = DRAGON_SPECIES[id];
  const bred = !DRAGON_LORE[id];
  const lore = DRAGON_LORE[id] || BRED_LORE;
  const known = state !== 'unknown';
  const li = document.createElement('li');
  li.className = `fish dragon-kind${state === 'hatched' ? ' got' : ''}`;
  const pic = state === 'hatched' || state === 'unknown' ? grownImg(id) : eggImg(id);
  const k = state === 'hatched' || state === 'unknown' ? 2 : 2.5;
  li.append(logImg(dragonPic(`${id}:${pic === eggImg(id) ? 'egg' : 'grown'}`, pic, state === 'unknown'), pic.width * k, pic.height * k));
  li.append(Object.assign(document.createElement('h3'), { textContent: known ? sp.name : '???' }));
  li.append(logLine(known ? lore.where : lore.rumour));
  if (state === 'hatched') {
    li.append(logLine(`BREATH: ${BREATH_NAMES[breathOf(id)].toUpperCase()}`, 'rarity'));
    li.append(logLine(lore.about));
    li.append(logLine(lore.hatch || LAVA_HATCH));
  } else if (known && !bred) {
    li.append(logLine(lore.hatch || LAVA_HATCH));
  }
  li.append(logLine(KIND_STATUS[state], 'tally'));
  return li;
}

// Where a dragon is now, in words.
function dragonWhere(d) {
  if (flight && flight.dragon === d) return 'FLYING WITH YOU';
  if (follower === d) return sail ? 'ON THE LONGSHIP WITH YOU' : 'FOLLOWING YOU';
  if (d.roost !== null && d.roost !== undefined) return 'AT THE DRAGON ROOST';
  if (d.nursery) return 'AT THE NURSERY';
  let best = null;
  let bd = Infinity;
  for (const p of POIS) {
    if (!onMap(p)) continue;
    const dist = Math.hypot(p.x - d.x / TILE, p.y - d.y / TILE);
    if (dist < bd) [best, bd] = [p, dist];
  }
  if (!best) return 'RESTING';
  return `${bd < (best.r || 6) + 4 ? 'AT' : 'NEAR'} ${best.name.toUpperCase()}`;
}

function dragonCard(d) {
  const sp = DRAGON_SPECIES[d.species];
  const li = document.createElement('li');
  li.className = 'fish dragon-mine got';
  if (d.stage === GROWN) {
    const img = grownImg(d.species);
    li.append(logImg(dragonPic(`${d.species}:grown`, img), img.width * 2, img.height * 2));
  } else {
    const img = SPR.babyDragon[d.species][d.stage].right[0];
    li.append(logImg(dragonPic(`${d.species}:baby${d.stage}`, img), img.width * 2, img.height * 2));
  }
  li.append(Object.assign(document.createElement('h3'), { textContent: d.name }));
  li.append(logLine(`${sp.name}  ·  ${BREATH_NAMES[breathOf(d.species)]}`));
  li.append(logLine(AGE_NAMES[Math.min(d.stage, AGE_NAMES.length - 1)], 'rarity'));
  if (d.stage < GROWN) {
    const left = GROWN - d.stage;
    li.append(logLine(`Feed ${left} more fish to grow ${left > 1 ? 'up' : 'into a grown dragon'}.`));
  } else {
    li.append(logLine(d.saddled ? 'Saddled and ready to ride.' : 'Grown, but it needs a saddle before you can ride it.'));
  }
  li.append(logLine(dragonWhere(d), 'tally'));
  return li;
}

function renderDragonLog() {
  const kinds = loggedKinds();
  const hatched = kinds.filter((id) => kindState(id) === 'hatched').length;
  dragonLogSum.textContent = `${hatched} OF ${kinds.length} KINDS HATCHED  ·  ${dragons.length} DRAGON${dragons.length === 1 ? '' : 'S'} RAISED`;
  dragonLogKinds.replaceChildren(...kinds.map(kindCard));
  const mine = dragons.map(dragonCard);
  if (!mine.length) mine.push(Object.assign(document.createElement('li'), { className: 'quest empty', textContent: 'No dragons yet. Find an egg and hatch it!' }));
  dragonLogMine.replaceChildren(...mine);
}

function toggleDragonLog(open = !dragonLogOpen) {
  if (open && (!has('backpack') || naming || mapOpen || journalOpen || fishLogOpen || tradeOpen)) return;
  dragonLogOpen = open;
  dragonLogEl.hidden = !open;
  dragonLogBtn.setAttribute('aria-expanded', String(open));
  keys.clear();
  if (open) {
    Sfx.door();
    renderDragonLog();
    dragonLogClose.focus();
  } else {
    dragonLogBtn.blur();
  }
}

dragonLogBtn.addEventListener('click', () => toggleDragonLog());
dragonLogClose.addEventListener('click', () => toggleDragonLog(false));
dragonLogEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' && e.code !== 'KeyK') return;
  e.preventDefault();
  e.stopPropagation();
  toggleDragonLog(false);
});
dragonLogEl.addEventListener('pointerdown', (e) => { if (e.target === dragonLogEl) toggleDragonLog(false); });
