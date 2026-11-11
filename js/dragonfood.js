// What dragons eat, and how they feel. Every dragon eats fish, meat and fruit, but only fish and meat make a young one
// grow. Each kind loves one food and won't touch another: fed the one it loves it shows a heart, and offered the one it
// hates it spits it straight back out. Its mood (0-100) rises with pats, meals, games of fetch and flying, and sinks
// while it's left on its own, goes hungry or sits out in the rain.

const DRAGON_FRUIT = ['apple', 'pear', 'banana', 'pineapple', 'cherries', 'plum', 'peach', 'orange', 'lemon', 'berries', 'coconut'];
const DRAGON_FOODS = { fish: [...FISH_IDS, 'grilledFish'], meat: ['meat', 'roast'], fruit: DRAGON_FRUIT };
const FOOD_KIND = Object.fromEntries(Object.entries(DRAGON_FOODS).flatMap(([k, ids]) => ids.map((id) => [id, k])));
const dragonEats = (id) => !!FOOD_KIND[id];
const growsOn = (id) => FOOD_KIND[id] === 'fish' || FOOD_KIND[id] === 'meat';

// What each wild kind loves and won't touch. Bred kinds get theirs in the egg (see bredTastes).
const KIND_TASTES = {
  nightFury: { favorite: 'salmon', dislike: 'eel' },
  lightFury: { favorite: 'arcticChar', dislike: 'lemon' },
  thunderdrum: { favorite: 'pineapple', dislike: 'pufferfish' },
  terribleTerror: { favorite: 'cherries', dislike: 'cod' },
  skrill: { favorite: 'roast', dislike: 'banana' },
};
// Foods a bred kind can take to or against: nothing too rare to find.
const TASTE_POOL = [...FISH_IDS.filter((id) => FISH[id].rarity === 'common' || FISH[id].rarity === 'uncommon'), 'grilledFish', 'meat', 'roast', ...DRAGON_FRUIT];

// Half the time a parent's favourite, now and then a parent's dislike too; otherwise anything at all.
function bredTastes(id1, id2, r) {
  const [t1, t2] = [tastesOf(id1), tastesOf(id2)];
  const pick = (list) => list[Math.floor(r() * list.length)];
  const favorite = r() < 0.5 ? (r() < 0.5 ? t1 : t2).favorite : pick(TASTE_POOL);
  let dislike = r() < 0.3 ? (r() < 0.5 ? t1 : t2).dislike : pick(TASTE_POOL);
  if (dislike === favorite) dislike = pick(TASTE_POOL.filter((id) => id !== favorite));
  return { favorite, dislike };
}

function tastesOf(species) {
  if (KIND_TASTES[species]) return KIND_TASTES[species];
  const pal = DRAGON_SPECIES[species];
  if (pal?.favorite) return { favorite: pal.favorite, dislike: pal.dislike };
  // kinds bred before tastes were a thing settle on some from their name
  let h = 7;
  for (const c of String(species)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const t = bredTastes('nightFury', 'lightFury', mulberry32(h));
  if (pal) Object.assign(pal, t);
  return t;
}

// 'love', 'like' or 'dislike'; null for what a dragon doesn't eat at all.
function tasteOf(d, id) {
  if (!dragonEats(id)) return null;
  const t = tastesOf(d.species);
  return id === t.favorite ? 'love' : id === t.dislike ? 'dislike' : 'like';
}

// ---------- mood ----------

const MOOD_START = 70;
const MOOD_HAPPY = 70;
const MOOD_SAD = 40;
const moodOf = (d) => d.mood ?? MOOD_START;
const moodBand = (d) => (moodOf(d) >= MOOD_HAPPY ? 'happy' : moodOf(d) >= MOOD_SAD ? 'okay' : 'sad');
const MOOD_WORDS = { happy: 'Happy', okay: 'Content', sad: 'Glum' };
const dragonHungry = (d) => gameDays() - (d.fedAt ?? gameDays()) > 1;
const cheer = (d, n) => { d.mood = Math.max(0, Math.min(100, moodOf(d) + n)); };

// How far mood moves in a game day: up with the player or a roost-mate, or in the hermit's care; down left alone,
// and further down hungry or out in the rain.
const MOOD_DRIFT = { company: 20, alone: -12, roost: 15, nursery: 15, hungry: -30, wet: -20 };
// Riding lifts it this much a minute.
const RIDE_CHEER = 3;

const wetOut = (d) => (weather.kind === 'rain' || weather.kind === 'storm') && weather.level > 0.5 && d.roost == null && !d.nursery;

function updateMood(d, dt) {
  const now = gameDays();
  const days = Math.min(1, Math.max(0, now - (d.moodDay ?? now)));
  d.moodDay = now;
  d.fedAt ??= now;
  if (flight && flight.dragon === d) cheer(d, (RIDE_CHEER * dt) / 60);
  if (!days) return;
  let rate = d === follower ? MOOD_DRIFT.company : d.roost != null && roosting().length > 1 ? MOOD_DRIFT.roost
    : d.nursery ? MOOD_DRIFT.nursery : MOOD_DRIFT.alone;
  if (dragonHungry(d) && !d.nursery) rate += MOOD_DRIFT.hungry;
  if (wetOut(d)) rate += MOOD_DRIFT.wet;
  cheer(d, rate * days);
}

// What a dragon's mood puts over its head now and then, or null for a happy one's usual heart or note.
function moodEmote(d) {
  if (dragonHungry(d)) return 'question';
  const band = moodBand(d);
  if (band === 'sad') return Math.random() < 0.6 ? 'sad' : 'dots';
  if (band === 'okay') return Math.random() < 0.5 ? 'smile' : 'note';
  return null;
}

// Once a day a hungry dragon by the player gets noticed.
function hungerHint(d) {
  if (!dragonHungry(d) || (d.hungerTold ?? -1) >= dayCount || Math.hypot(d.x - player.x, d.y - player.y) > 80) return;
  d.hungerTold = dayCount;
  muse(`${d.name} keeps sniffing at my bag. Hungry, I think.`);
}

// ---------- feeding ----------

const FEED_CHEER = { love: 25, like: 8, dislike: -6 };

// `d` is offered `id`: true if it eats it. The first time it gets what it loves or hates, the player notices.
function feedDragon(d, id) {
  const taste = tasteOf(d, id);
  const food = itemName(id);
  cheer(d, FEED_CHEER[taste]);
  if (taste === 'dislike') {
    Object.assign(d, { emote: 'angry', emoteT: 1.8 });
    Sfx.spit(earshot(d.x, d.y));
    if (!d.disKnown) {
      d.disKnown = true;
      muse(`${d.name} won't touch ${food}. Not a fan!`);
    }
    return false;
  }
  d.fedAt = gameDays();
  Object.assign(d, { emote: taste === 'love' ? 'heart' : 'smile', emoteT: 1.8 });
  if (taste === 'love') {
    for (let i = 0; i < 6; i++) {
      particles.push({ type: 'sparkle', layer: 'sky', x: d.x + (Math.random() - 0.5) * 24, y: d.y - 14 - Math.random() * 20, vx: 0, vy: -14, life: 0, max: 0.6 + Math.random() * 0.4 });
    }
    if (!d.favKnown) {
      d.favKnown = true;
      muse(`${d.name} loves ${food}! That has to be its favourite.`);
    }
  } else if (d.stage < GROWN && !growsOn(id) && !d.fruitTold) {
    d.fruitTold = true;
    muse(`${d.name} likes that, but fruit won't make it grow. Fish or meat will.`);
  }
  return true;
}

// ---------- patting ----------

// Only one pat in PAT_GAP seconds lifts its mood, so mashing T doesn't.
const PAT_GAP = 8;
const PAT_CHEER = 6;
const PAT_REACH = 30;
// The hand reaches out over PAT_EXTEND seconds, pats PAT_BOBS times and comes back, PAT_ANIM seconds in all.
const PAT_ANIM = 0.9;
const PAT_EXTEND = 0.12;
const PAT_BOBS = 3;
const patting = (e) => e.patAt != null && time - e.patAt < PAT_ANIM;

// The dragon close enough to pat: a young one on the ground, or a grown one that's landed.
function nearPet() {
  if (flight || sail || hop || indoors || player.swimming) return null;
  let best = null;
  let bd = PAT_REACH;
  for (const d of dragons) {
    const grounded = d.stage === GROWN ? d.perched : !d.swoop && !(d.flying && d.alt > 6);
    if (!grounded) continue;
    const dist = d.stage === GROWN ? boxDist(d.obj.col) : Math.hypot(d.x - player.x, d.y - 3 - player.y);
    if (dist < bd) [best, bd] = [d, dist];
  }
  return best;
}

function patDragon(d) {
  faceToward(player, d.x - player.x, d.y - player.y);
  player.patAt = time;
  const counts = time - (d.patAt ?? -PAT_GAP) >= PAT_GAP;
  const sad = moodBand(d) === 'sad';
  if (counts) {
    d.patAt = time;
    cheer(d, PAT_CHEER);
  }
  Object.assign(d, { emote: moodBand(d) === 'happy' ? 'heart' : 'smile', emoteT: 1.8 });
  if (d.stage === GROWN) {
    d.obj.patT = 1.2;
    idleNow(d, 'look', 2.5);
  } else if (d.jumpT < 0 && !d.flying) {
    d.jumpT = 0;
  }
  Sfx.purr(earshot(d.x, d.y));
  if (sad && counts && !d.leanTold) {
    d.leanTold = true;
    muse(`${d.name} leans into my hand. I think it needed that.`);
  }
}

// Holding food out by a dragon: SPACE offers it.
function feedTarget() {
  const id = carriedOut();
  return id && dragonEats(id) ? nearPet() : null;
}

function feedByHand(d) {
  const id = carriedOut();
  bag[id]--;
  if (!has(id)) putAwayItem();
  renderInventory();
  faceToward(player, d.x - player.x, d.y - player.y);
  if (!feedDragon(d, id)) {
    spawnDrop(id, Math.round((d.x + player.x) / 2), Math.round((d.y + player.y) / 2) + 2, (player.x - d.x) * 0.8, 8, 60);
    drops[drops.length - 1].left = true;
    return;
  }
  if (d.stage < GROWN) return chew(d, id);
  Sfx.gulp(earshot(d.x, d.y));
  d.obj.patT = 1;
  burst(d.obj.x + (d.obj.faceRight ? 26 : -26), d.obj.y - 30, ['#ffffff', EDIBLE[id] || '#cfdceb'], 6, 24);
}
