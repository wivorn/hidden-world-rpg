// The calendar: days make months, three months make a season, and the first day of each new season is a
// festival in the village square. The grass, the leaves, the flowers and the weather follow the season.

// ---------- the calendar ----------

// A season is a week, its three months two, two and three days long.
const MONTH_DAYS = [2, 2, 3];
const SEASON_DAYS = MONTH_DAYS.reduce((a, b) => a + b);
const SUMMER_GRASS = { grass: PAL.grass, grassLight: PAL.grassLight, grassDark: PAL.grassDark, grassTuft: PAL.grassTuft };
const PETALS = ['#f25c78', '#ffffff', '#f7d046', '#b77cf2', '#ff8a3d'];
// `leaves` recolours oaks and bushes (`blossom` dots pink on the oaks), `flowers` is how often a patch of grass has them.
const SEASONS = [
  {
    name: 'Spring', months: ['Goi', 'Einmanudur', 'Harpa'], feast: 'the Spring Feast', title: 'SPRING FEAST',
    hello: 'The thaw is here, and the first flowers are out.',
    grass: { grass: '#62b244', grassLight: '#84ca50', grassDark: '#4b9231', grassTuft: '#b4e46a' },
    blossom: 0.12, flowers: 0.15, petals: ['#f25c78', '#ffffff', '#ffd0e0', '#f7d046', '#b77cf2'],
    bunting: ['#f7b6d2', '#fff2b0', '#b8e6f2', '#ffffff', '#c8f0a0'], treat: 'bakedApple', treatName: 'baked apples',
    lines: ['Happy Spring Feast, {name}! Winter\'s behind us at last.', 'Dance with us! Round and round the fire!', 'Flowers in every doorway. Spring is really here!'],
  },
  {
    name: 'Summer', months: ['Skerpla', 'Solmanudur', 'Heyannir'], feast: 'Midsummer', title: 'MIDSUMMER',
    hello: 'Long warm days, and the light hardly leaves the sky.',
    grass: SUMMER_GRASS, flowers: 0.09, petals: PETALS,
    bunting: ['#e0303a', '#f7d046', '#2f56a3', '#5cae45', '#ffffff'], treat: 'grilledFish', treatName: 'grilled fish',
    lines: ['Happy Midsummer, {name}! The longest day of the year!', 'Round the pole and round the fire! Come and dance!', 'Midsummer night is hardly a night at all.'],
  },
  {
    name: 'Autumn', months: ['Tvimanudur', 'Haustmanudur', 'Gormanudur'], feast: 'the Harvest Feast', title: 'HARVEST FEAST',
    hello: 'The leaves are turning gold and the nights are drawing in.',
    grass: { grass: '#8a9f3c', grassLight: '#a7b24a', grassDark: '#6c832e', grassTuft: '#d0b44c' },
    leaves: [
      { '#1e4a20': '#6a2a14', '#3d8a37': '#c8641e', '#5cae45': '#e89a34', '#2b6529': '#9a3f1c', '#7cc456': '#f2c45a' },
      { '#1e4a20': '#6e4212', '#3d8a37': '#d89a24', '#5cae45': '#f0c040', '#2b6529': '#a8661a', '#7cc456': '#f8de7a' },
    ],
    flowers: 0.035, petals: ['#ff8a3d', '#f7d046', '#c0582a'],
    bunting: ['#c8641e', '#f0c040', '#9a3f1c', '#e8d8b0', '#6c832e'], treat: 'roast', treatName: 'slices of roast',
    lines: ['Happy Harvest Feast, {name}! The barns are full to the rafters.', 'Pumpkins, apples, roast boar... I\'ll be full for a week!', 'Dance off that third helping, that\'s what I say!'],
  },
  {
    name: 'Winter', months: ['Ylir', 'Morsugur', 'Thorri'], feast: 'Yule', title: 'YULE',
    hello: 'Frost on the grass and snow on the wind.',
    grass: { grass: '#a9bcae', grassLight: '#c6d6cc', grassDark: '#8aa294', grassTuft: '#eef4f6' },
    leaves: [{ '#1e4a20': '#2f3529', '#3d8a37': '#56624a', '#5cae45': '#6b7860', '#2b6529': '#434c3a', '#7cc456': '#7d8a70' }],
    flowers: 0, petals: PETALS, snow: true,
    bunting: ['#b3292d', '#2b6529', '#ffffff', '#e8b54a', '#b3292d'], treat: 'roast', treatName: 'slices of roast',
    lines: ['Happy Yule, {name}! Come and warm your hands by the fire.', 'Yule\'s the longest night. We keep the fire going till the sun comes back.', 'Mind the snowman! The kid built it all by himself.'],
  },
];
const MONTHS = SEASONS.flatMap((s) => s.months);
const YEAR_DAYS = SEASON_DAYS * SEASONS.length;

function dateOf(d = dayCount) {
  const i = d - 1;
  const s = Math.floor(i / SEASON_DAYS) % SEASONS.length;
  let day = i % SEASON_DAYS;
  let k = 0;
  while (day >= MONTH_DAYS[k]) day -= MONTH_DAYS[k++];
  return { day: day + 1, m: s * 3 + k, month: MONTHS[s * 3 + k], s, season: SEASONS[s], year: Math.floor(i / YEAR_DAYS) + 1 };
}
const seasonNow = () => SEASONS[dateOf().s];
const wintry = () => !!seasonNow().snow;

function dateLabel() {
  const d = dateOf();
  return `${festivalDay() ? `${d.season.title}  ·  ` : ''}${d.month.toUpperCase()} ${d.day}${festivalDay() ? '' : `  ·  ${d.season.name.toUpperCase()}`}`;
}

// Calls `onNewDay` whenever the day changes, by the clock or by sleeping; the first call only takes note of the day.
let dayShown = 0;
function updateCalendar(dt) {
  if (dayShown !== dayCount) {
    if (dayShown) newDay(dateOf(dayShown), dateOf());
    dayShown = dayCount;
  }
  if (dateOf().s !== seasonShown) applySeason(dateOf().s);
  updateFestival(dt);
}

function newDay(was, now) {
  if (now.s !== was.s) toast(now.season.name.toUpperCase(), now.season.hello);
  else if (now.m !== was.m) toast('NEW MONTH', `${now.month}, month ${now.m % 3 + 1} of ${now.season.name.toLowerCase()}`);
  if (festivalDay()) toast(now.season.title, `${cap(now.season.feast)} today, in the village square!`);
}
const cap = (t) => t[0].toUpperCase() + t.slice(1);

// ---------- the look of the season ----------

let seasonShown = -1;
function applySeason(s) {
  seasonShown = s;
  Object.assign(PAL, SEASONS[s].grass);
  chunks.clear();
}

const flowerOdds = () => (seasonShown < 0 ? 0.09 : SEASONS[seasonShown].flowers);
const flowerColors = () => (seasonShown < 0 ? PETALS : SEASONS[seasonShown].petals);

// Leafy things that turn with the seasons, and the ones that get a coat of snow in winter.
const BLOSSOMS = new Set(['oak', 'appleTree', 'pearTree', 'cherryTree', 'plumTree', 'peachTree']);
const TURNS = new Set([...BLOSSOMS, 'bushPink', 'bushYellow', 'bushCut']);
const SNOWS = new Set([...TURNS, 'pine', 'pine2', 'orangeTree', 'lemonTree', 'house', 'houseB', 'houseC', 'houseD', 'hall', 'torMound']);
const turnedImgs = new Map();

function seasonalImg(img, o) {
  const S = SEASONS[seasonShown];
  if (!S) return img;
  if (TURNS.has(o.key) && (S.leaves || (S.blossom && BLOSSOMS.has(o.key)))) img = turnedImg(img, seasonShown, S.leaves ? Math.floor(o.phase * 7) % S.leaves.length : 0);
  return S.snow && SNOWS.has(o.key) ? snowyImg(img) : img;
}

function turnedImg(img, s, v) {
  const k = `${s}:${v}`;
  if (!turnedImgs.has(k)) turnedImgs.set(k, new WeakMap());
  const cache = turnedImgs.get(k);
  let c = cache.get(img);
  if (c) return c;
  const S = SEASONS[s];
  const swap = new Map(Object.entries(S.leaves ? S.leaves[v] : {}).map(([a, b]) => [hexRgb(a).join(), hexRgb(b)]));
  const leafy = new Set(['#1e4a20', '#3d8a37', '#5cae45', '#2b6529', '#7cc456'].map((h) => hexRgb(h).join()));
  c = makeCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const rgb = `${d.data[i]},${d.data[i + 1]},${d.data[i + 2]}`;
    let to = swap.get(rgb);
    const p = i / 4;
    if (S.blossom && leafy.has(rgb) && hash(p % img.width, Math.floor(p / img.width), 977) < S.blossom) to = hexRgb(hash(p, 3, 978) < 0.6 ? '#f8bcd4' : '#ffffff');
    if (to) [d.data[i], d.data[i + 1], d.data[i + 2]] = to;
  }
  g.putImageData(d, 0, 0);
  cache.set(img, c);
  return c;
}

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ---------- the festival ----------

// Folk gather round the bonfire from morning till late: the chief stands by to greet everyone, the rest dance
// round it in a ring, stopping every so often to twirl. Bunting and lanterns are strung between the banners.
const FEST_FROM = 0.33;
const FEST_TO = 0.96;
const DANCERS = ['smith', 'kid', 'girl', 'villager', 'fisher'];
const RING = { rx: 46, ry: 28 };
const TWIRL_EVERY = 10;
const festivalDay = (d = dayCount) => d > 1 && dateOf(d).day === 1 && dateOf(d).m % 3 === 0;
const festivalOn = () => festivalDay() && clock >= FEST_FROM && clock < FEST_TO;
const fest = { on: false, props: null, a: 0, twirlT: TWIRL_EVERY, shown: -1 };
const sq = (x, y) => ({ x: (x + OX) * TILE, y: (y + OY) * TILE });
// the bunting runs from banner top to banner top, across the north of the square
const BUNTING = [['bannerRed', 66.4, 61.6], ['bannerBlue', 75.5, 56.7], ['bannerBlue', 81.5, 56.7], ['bannerRed', 90.6, 61.6]];

function updateFestival(dt) {
  const day = festivalDay() ? dateOf().s : -1;
  if (day !== fest.shown) showProps(day);
  const on = festivalOn();
  if (on && !fest.on) openFestival();
  fest.on = on;
  if (!on) return;
  const dancers = npcs.filter((n) => DANCERS.includes(n.look.id) && n.festAt);
  if (!dancers.some((n) => n.danceT > 0)) fest.a += dt * 0.45;
  if ((fest.twirlT -= dt) <= 0) {
    fest.twirlT = TWIRL_EVERY;
    for (const n of dancers) if (!(n.talkT > 0)) n.danceT = 2.4;
  }
}

function openFestival() {
  const S = seasonNow();
  setWeather('clear');
  weather.left = (FEST_TO - clock) * DAY_LENGTH;
  const chief = npcs.find((n) => n.look.id === 'chief');
  if (sameSpace(chief) && Math.hypot(player.x - chief.x, player.y - chief.y) < 300) npcSay(chief, `Gather round, everyone! ${cap(S.feast)} has begun!`);
}

// The props for each season's feast: a centrepiece south of the fire, a pair flanking it, and a laden table.
const FEST_PROPS = [
  [['maypole', 78.5, 66.6], ['flowerTub', 72.6, 59.8], ['flowerTub', 84.4, 59.8], ['longTable', 86.8, 63.2]],
  [['midsummerPole', 78.5, 66.6], ['flowerTub', 72.6, 59.8], ['flowerTub', 84.4, 59.8], ['longTable', 86.8, 63.2]],
  [['harvestStack', 78.5, 66.6], ['pumpkins', 72.6, 59.8], ['pumpkins', 84.4, 59.8], ['longTable', 86.8, 63.2]],
  [['yuleTree', 78.5, 66.6], ['snowman', 72.6, 59.8], ['pumpkins', 84.4, 59.8], ['longTable', 86.8, 63.2]],
];

function showProps(s) {
  fest.shown = s;
  if (!fest.props) {
    buildFestSprites();
    fest.props = FEST_PROPS.map((set) => set.map(([key, x, y]) => {
      const o = { key, ...sq(x, y), phase: 0, hidden: true, col: { off: true } };
      placeCollider(o);
      objects.push(o);
      colliders.push(o.col);
      return o;
    }));
  }
  fest.props.forEach((set, i) => {
    const show = i === s;
    for (const o of set) {
      o.hidden = !show;
      o.col.off = !show;
    }
  });
}

// Walks over, slipping past anything in the way. Out of sight it hurries, and if where it's going is out of sight
// too it's just there.
function stroll(n, x, y, dt) {
  const dx = x - n.x;
  const dy = y - n.y;
  const d = Math.hypot(dx, dy);
  if (d < 3) return true;
  const seen = sameSpace(n) && onScreen(n.x, n.y, cam.x, cam.y, 30);
  if (!seen && !(sameSpace(n) && onScreen(x, y, cam.x, cam.y, 30))) {
    Object.assign(n, { x, y });
    return true;
  }
  const s = Math.min(d, (seen ? 46 : 240) * dt);
  if (!seen || !move(n, (dx / d) * s, (dy / d) * s) || Math.hypot(x - n.x, y - n.y) > d - s * 0.5) {
    n.x += (dx / d) * s;
    n.y += (dy / d) * s;
  }
  faceToward(n, dx, dy);
  n.anim += dt * 8;
  n.frame = Math.floor(n.anim) % 4;
  return false;
}

function festSpot(n) {
  const fire = villageFire;
  if (n.look.id === 'chief') return { x: fire.x, y: fire.y + 46 };
  const i = DANCERS.indexOf(n.look.id);
  const a = fest.a + (i / DANCERS.length) * Math.PI * 2;
  return { x: fire.x + Math.cos(a) * RING.rx, y: fire.y + 4 + Math.sin(a) * RING.ry };
}

// Takes over the villagers who come to the feast; returns true while it's moving them.
function festivalNpc(n, dt) {
  if (n.look.id !== 'chief' && !DANCERS.includes(n.look.id)) return false;
  if (!fest.on) {
    if (!n.festGoing) return false;
    n.festAt = false;
    if (stroll(n, n.home.x, n.home.y, dt)) Object.assign(n, { festGoing: false, state: 'idle', timer: 1, frame: 0 });
    return true;
  }
  n.festGoing = true;
  const spot = festSpot(n);
  if (!n.festAt || Math.hypot(spot.x - n.x, spot.y - n.y) > 12) {
    n.festAt = stroll(n, spot.x, spot.y, dt);
    return true;
  }
  const dx = spot.x - n.x;
  const dy = spot.y - n.y;
  Object.assign(n, spot);
  if (n.look.id === 'chief') {
    n.dir = 'up';
    n.frame = 0;
    return true;
  }
  if (dx || dy) faceToward(n, dx, dy);
  n.anim += dt * 6;
  n.frame = Math.floor(n.anim) % 4;
  return true;
}

// On a feast day everyone in the village talks of nothing else, and the chief has a treat for you from the table.
const FEST_FOLK = new Set([...VILLAGE_NPCS.map((d) => d.look), 'carpenter']);
function festivalLines(n) {
  if (!festivalOn() || !FEST_FOLK.has(n.look.id)) return null;
  const S = seasonNow();
  if (n.look.id !== 'chief') return S.lines;
  return [() => feastTreat(S), `Welcome, one and all, to ${S.feast}! Eat, drink and dance!`, 'Old friends and new, round the same fire. That\'s what a feast is for.'];
}

function feastTreat(S) {
  if (stats.feastDay === dayCount) return `Back for more, {name}? Help yourself at the table. There's plenty!`;
  stats.feastDay = dayCount;
  give(S.treat, 2);
  return `Happy ${S.feast.replace(/^the /, '')}, {name}! Here, two ${S.treatName} from the feast table.`;
}

// ---------- festival drawing ----------

function ropeAt(a, b, t) {
  const sag = Math.hypot(b.x - a.x, b.y - a.y) * 0.1;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag };
}

function buntingPoints() {
  return BUNTING.map(([key, x, y]) => {
    const p = sq(x, y);
    return { x: p.x, y: p.y - SPR[key].oy + 3 };
  });
}

// Pennants every few pixels along each rope, with a lantern after every fourth.
function eachPennant(fn) {
  const pts = buntingPoints();
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 9));
    for (let j = 1; j < n; j++) fn(ropeAt(a, b, j / n), k++);
  }
}

function drawFestival(cx, cy) {
  if (fest.shown < 0 || indoors || !onScreen(villageFire.x, villageFire.y, cx, cy, 260)) return;
  const S = SEASONS[fest.shown];
  const pts = buntingPoints();
  ctx.fillStyle = '#4a2914';
  for (let i = 0; i < pts.length - 1; i++) {
    for (let t = 0; t <= 1; t += 0.01) {
      const p = ropeAt(pts[i], pts[i + 1], t);
      ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), 1, 1);
    }
  }
  eachPennant((p, k) => {
    const x = Math.round(p.x - cx);
    const y = Math.round(p.y - cy) + 1;
    if (k % 4 === 3) {
      rect(ctx, x, y, 1, 2, '#4a2914');
      rect(ctx, x - 2, y + 2, 5, 5, '#6a3d1d');
      rect(ctx, x - 1, y + 3, 3, 3, nightness() > 0.3 ? '#ffe08a' : '#e8a040');
      return;
    }
    const sway = Math.round(Math.sin(time * 2 + k) * 0.6);
    poly(ctx, [[x - 3, y], [x + 3, y], [x + sway, y + 6]], S.bunting[k % S.bunting.length]);
  });
}

function festivalLights() {
  const out = [];
  if (fest.shown < 0 || indoors) return out;
  eachPennant((p, k) => {
    if (k % 4 === 3) out.push({ x: p.x, y: p.y + 6, r: 22, k: 0.85, glow: 9, color: '#ffc060' });
  });
  return out;
}

// ---------- festival sprites ----------

function buildFestSprites() {
  const POLE = PAL.woodDark;
  def('maypole', {
    img: sprite(44, 64, (g) => {
      const ribbons = ['#f25c9a', '#f7d046', '#5d88d2', '#ffffff', '#b77cf2', '#5cae45'];
      ribbons.forEach((c, i) => {
        const fx = 2 + i * 8;
        line(g, 22, 9, fx, 58 - Math.abs(i - 2.5) * 2, c);
      });
      rect(g, 21, 6, 3, 57, POLE);
      rect(g, 21, 6, 1, 57, PAL.wood);
      ellipse(g, 22.5, 8, 6, 2.5, PAL.leaf);
      for (const [x, c] of [[18, '#f25c9a'], [22, '#ffffff'], [26, '#f7d046']]) px(g, x, 7, c);
      rect(g, 21, 3, 3, 3, PAL.gold);
    }),
    foot: { w: 4, h: 3 }, shadow: { rx: 5, ry: 2 },
  });
  def('midsummerPole', {
    img: sprite(34, 64, (g) => {
      rect(g, 16, 4, 3, 59, POLE);
      rect(g, 4, 16, 27, 3, POLE);
      for (let y = 4; y < 62; y += 3) px(g, 15 + (y % 2) * 4, y, PAL.leafLight);
      for (let x = 4; x < 31; x += 3) px(g, x, 15, PAL.leafLight);
      for (const x of [6, 28]) {
        line(g, x, 19, x, 22, POLE);
        ellipse(g, x, 27, 4.5, 4.5, PAL.leaf);
        g.clearRect(x - 2, 25, 4, 4);
        for (const [dx, dy, c] of [[-4, 0, '#f25c9a'], [4, 0, '#f7d046'], [0, 4, '#ffffff'], [0, -4, '#5d88d2']]) px(g, x + dx, 27 + dy, c);
      }
      ellipse(g, 17.5, 4, 4, 2, PAL.leaf);
      px(g, 17, 2, '#f7d046');
    }),
    foot: { w: 4, h: 3 }, shadow: { rx: 8, ry: 2 },
  });
  def('harvestStack', {
    img: sprite(44, 32, (g) => {
      const bale = (x, y) => {
        rect(g, x, y, 14, 8, PAL.hay);
        rect(g, x, y, 14, 1, PAL.hayLight);
        rect(g, x, y + 7, 14, 1, PAL.hayDark);
        for (const lx of [x + 3, x + 10]) rect(g, lx, y, 1, 8, PAL.hayDark);
      };
      bale(3, 22);
      bale(16, 22);
      bale(29, 22);
      bale(9, 14);
      bale(22, 14);
      for (let i = 0; i < 9; i++) line(g, 21 + (i - 4) * 0.4, 13, 18 + i * 0.75, 3, i % 2 ? PAL.hayLight : PAL.hay);
      rect(g, 19, 9, 6, 1, PAL.woodDark);
      for (const [x, y, r] of [[5, 28, 4], [38, 28, 5], [33, 13, 3.5]]) {
        ellipse(g, x, y, r, r * 0.8, '#e07a1e');
        rect(g, x - 0.5, y - r * 0.8, 1, r * 1.6, '#b85a12');
        px(g, x, y - r * 0.8 - 1, PAL.leafDark);
      }
    }),
    foot: { w: 38, h: 8 }, shadow: { rx: 20, ry: 3 },
  });
  def('yuleTree', {
    img: (() => {
      const c = makeCanvas(32, 54);
      const g = c.getContext('2d');
      g.drawImage(SPR.pine.img, 0, 4);
      for (let i = 0; i < 9; i++) {
        const y = 14 + i * 3.6;
        const x = 16 + (hash(i, 1, 55) - 0.5) * (y - 4) * 0.7;
        rect(g, x, y, 1, 2, '#f4ead8');
        px(g, x, y - 1, '#ffd24a');
      }
      for (let i = 0; i < 6; i++) px(g, 10 + hash(i, 2, 56) * 12, 18 + hash(i, 3, 56) * 22, i % 2 ? '#e0303a' : '#e8b54a');
      poly(g, [[16, 0], [17.5, 3], [16, 6], [14.5, 3]], '#ffd24a');
      return c;
    })(),
    foot: { w: 8, h: 5 }, shadow: { rx: 10, ry: 3 }, light: { dx: 0, dy: -24, r: 30, color: '#ffc060' },
  });
  def('flowerTub', {
    img: sprite(16, 16, (g) => {
      ellipse(g, 8, 7, 6, 3, PAL.leaf);
      for (let i = 0; i < 7; i++) px(g, 3 + hash(i, 1, 61) * 10, 4 + hash(i, 2, 61) * 5, ['#f25c78', '#f7d046', '#ffffff', '#b77cf2'][i % 4]);
      rect(g, 3, 9, 10, 6, PAL.wood);
      rect(g, 3, 9, 10, 1, PAL.woodLight);
      for (const y of [11, 13]) rect(g, 3, y, 10, 1, PAL.woodDark);
    }),
    foot: { w: 10, h: 4 }, shadow: { rx: 6, ry: 2 },
  });
  def('pumpkins', {
    img: sprite(20, 12, (g) => {
      for (const [x, y, r] of [[5, 7, 4], [14, 7, 4.5], [9.5, 4, 3]]) {
        ellipse(g, x, y, r, r * 0.8, '#e07a1e');
        rect(g, x - 0.5, y - r * 0.8, 1, r * 1.6, '#b85a12');
        px(g, x, y - r * 0.8 - 1, PAL.leafDark);
      }
    }),
    foot: { w: 16, h: 4 }, shadow: { rx: 9, ry: 2 },
  });
  def('snowman', {
    img: sprite(16, 24, (g) => {
      ellipse(g, 8, 17, 6, 5.5, PAL.snowLight);
      ellipse(g, 8, 9, 4.5, 4, PAL.snowLight);
      ellipse(g, 8, 3.5, 3.5, 3, PAL.snowLight);
      ellipse(g, 9, 19, 4, 3, PAL.snow);
      rect(g, 3, 6, 10, 2, '#b3292d');
      rect(g, 10, 7, 2, 4, '#b3292d');
      px(g, 7, 3, '#22160f');
      px(g, 9, 3, '#22160f');
      rect(g, 8, 4, 3, 1, '#ff8a3d');
      for (const y of [10, 13, 16]) px(g, 8, y, '#22160f');
      line(g, 3, 10, 0, 7, PAL.woodDark);
      line(g, 13, 10, 15, 6, PAL.woodDark);
    }),
    foot: { w: 8, h: 4 }, shadow: { rx: 6, ry: 2 },
  });
}
