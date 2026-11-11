// Time of day and the weather: night falls with fires, torches and doorways glowing through it,
// and rain, storms, fog and snow drift in and out.

// ---------- the clock ----------

const DAY_LENGTH = 600;
// 0 is midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset.
let clock = 0.3;
let dayCount = 1;

const smooth = (u) => u * u * (3 - 2 * u);
const ramp = (c, a, b) => Math.max(0, Math.min(1, (c - a) / (b - a)));

// 0 in daylight and 1 at night, easing through dusk (0.74-0.84) and dawn (0.16-0.26).
const nightness = (c = clock) => smooth(Math.max(ramp(c, 0.74, 0.84), 1 - ramp(c, 0.16, 0.26)));
// The warm glow of a low sun around sunrise and sunset.
const golden = (c = clock) => Math.max(0, 1 - Math.abs(c - 0.23) / 0.07, 1 - Math.abs(c - 0.77) / 0.07);
const isNight = () => nightness() > 0.5;

function timeOfDay(c = clock) {
  if (c < 0.16 || c >= 0.84) return 'Night';
  if (c < 0.3) return 'Dawn';
  if (c < 0.45) return 'Morning';
  if (c < 0.6) return 'Midday';
  if (c < 0.74) return 'Afternoon';
  return 'Evening';
}

function updateClock(dt) {
  advanceClock(dt / DAY_LENGTH, dt);
}

function advanceClock(days, dt = 0) {
  const next = clock + days;
  dayCount += Math.floor(next);
  clock = next % 1;
  updateCalendar(dt);
  renderClock();
}

// ---------- the day and time, top middle ----------

const clockEl = document.getElementById('clock');
const clockIcon = clockEl.querySelector('img');
const clockText = clockEl.querySelector('span');
const clockDate = clockEl.querySelector('small');
const CLOCK_ICONS = {
  sun: sprite(11, 11, (g) => {
    for (const [x, y] of [[5, 0], [5, 10], [0, 5], [10, 5], [1, 1], [9, 1], [1, 9], [9, 9]]) px(g, x, y, '#ffd36b');
    ellipse(g, 5, 5, 3, 3, '#ffd36b');
    rect(g, 4, 3, 2, 1, '#fff2b0');
  }).toDataURL(),
  moon: sprite(11, 11, (g) => {
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        if (Math.hypot(x - 5, y - 5) <= 4.4 && Math.hypot(x - 7.5, y - 3.5) > 3.6) px(g, x, y, '#e8eaf0');
      }
    }
  }).toDataURL(),
};
let clockShown = '';

// Game minutes in steps of ten, so the readout ticks over a few times a real second at most.
function clockLabel(c = clock) {
  const mins = Math.floor((c * 24 * 60) / 10) * 10;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function renderClock() {
  const icon = isNight() ? 'moon' : 'sun';
  const text = `DAY ${dayCount}  ${clockLabel()}`;
  const date = dateLabel();
  if (text + date + icon === clockShown) return;
  clockShown = text + date + icon;
  clockText.textContent = text;
  clockDate.textContent = date;
  clockIcon.src = CLOCK_ICONS[icon];
  const d = dateOf();
  clockEl.setAttribute('aria-label', `Day ${dayCount}, ${d.month} ${d.day}, ${d.season.name.toLowerCase()}${festivalDay() ? `, ${d.season.feast}` : ''}, ${clockLabel()}, ${timeOfDay().toLowerCase()}`);
}

// ---------- weather ----------

const WEATHER = {
  clear: { name: 'Clear', rain: 0, grey: 0, fog: 0, clouds: 0, wind: 0 },
  cloudy: { name: 'Cloudy', rain: 0, grey: 0.08, fog: 0, clouds: 1, wind: 0.2 },
  rain: { name: 'Rain', rain: 0.55, grey: 0.18, fog: 0, clouds: 1, wind: 0.3 },
  storm: { name: 'Storm', rain: 1, grey: 0.32, fog: 0, clouds: 1, wind: 1 },
  fog: { name: 'Fog', rain: 0, grey: 0.04, fog: 1, clouds: 0, wind: 0 },
};
// `level` fades the current weather in and out; when `want` differs it fades out, then the new one fades in.
const weather = { kind: 'clear', want: 'clear', level: 1, left: 160, flash: 0, boltT: 4 };
const WEATHER_FADE = 7;
// Near Stormcrown Tor its own rain takes over from whatever's falling elsewhere.
const weatherNow = (k) => {
  const here = WEATHER[weather.kind][k] * smooth(weather.level);
  return here + (Math.max(here, TOR_SKY[k]) - here) * torSky();
};

function pickWeather() {
  const dawn = clock > 0.14 && clock < 0.32;
  const table = [['clear', 40], ['cloudy', 22], ['rain', 18], ['storm', 7], ['fog', dawn ? 30 : 7]];
  let r = Math.random() * table.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of table) if ((r -= w) < 0) return k;
  return 'clear';
}

function setWeather(kind, now = false) {
  weather.want = kind;
  weather.left = 100 + Math.random() * 140;
  if (now) Object.assign(weather, { kind, level: 1 });
}

// Snow falls instead of rain over the frozen isle and snowy peaks, and a little falls there even on clear days.
// In winter it snows over the grass too, though only when the weather brings it.
let snowy = false;
let snowField = false;
let snowyT = 0;
function updateSnowy(dt) {
  if ((snowyT -= dt) > 0) return;
  snowyT = 0.5;
  let n = 0;
  let grass = 0;
  for (const [dx, dy] of [[0, 0], [-6, -4], [6, -4], [-6, 4], [6, 4]]) {
    const t = tileAt(Math.floor(cam.x / TILE + viewW / TILE / 2) + dx, Math.floor(cam.y / TILE + viewH / TILE / 2) + dy);
    if (t === T.SNOW || t === T.ICE) n++;
    else if (t === T.GRASS) grass++;
  }
  snowField = !indoors && n >= 2;
  snowy = snowField || (!indoors && wintry() && n + grass >= 2);
}

// How hard it's coming down where the player is: rain, or snow over snowy ground.
const precipitation = () => (snowField ? Math.max(0.35, weatherNow('rain')) : weatherNow('rain'));

function updateWeather(dt) {
  if ((weather.left -= dt) <= 0) setWeather(pickWeather());
  if (weather.want !== weather.kind) {
    weather.level -= dt / WEATHER_FADE;
    if (weather.level <= 0) Object.assign(weather, { kind: weather.want, level: 0 });
  } else {
    weather.level = Math.min(1, weather.level + dt / WEATHER_FADE);
  }
  updateSnowy(dt);
  // lightning in a storm, with the thunder a moment behind
  weather.flash = Math.max(0, weather.flash - dt * 3.5);
  if (weather.kind === 'storm' && weather.level > 0.7 && !snowy && (weather.boltT -= dt) <= 0) {
    weather.boltT = 5 + Math.random() * 12;
    weather.flash = 1;
    Sfx.thunder(indoors ? 0.5 : 1, 0.3 + Math.random() * 1.2);
  }
  const wet = snowy ? 0 : weatherNow('rain');
  Sfx.weather(started ? wet * (indoors ? 0.4 : 1) : 0, started && !indoors ? weatherNow('wind') * (weather.kind === 'storm' ? 1 : 0.3) : 0);
  updatePrecip(dt);
  updateFireflies(dt);
}

// ---------- rain and snow ----------

// Falling streaks live in screen space and are shifted against camera moves so they don't slide with the view.
const precip = [];
const splashes = [];
let precipCam = null;

function updatePrecip(dt) {
  const p = started && !indoors ? precipitation() : 0;
  const want = Math.round(p * (snowy ? 150 : 240) * (viewW * viewH) / (320 * 240));
  const wind = (snowy ? 6 : 30) + weatherNow('wind') * (snowy ? 20 : 70);
  const dcx = precipCam ? cam.x - precipCam.x : 0;
  const dcy = precipCam ? cam.y - precipCam.y : 0;
  precipCam = { x: cam.x, y: cam.y };
  while (precip.length < want) precip.push(newDrop(true));
  if (precip.length > want) precip.length = want;
  for (const d of precip) {
    d.x -= dcx;
    d.y -= dcy;
    if (snowy) {
      d.x += (wind + Math.sin(time * 1.3 + d.phase) * 10) * dt;
      d.y += d.v * 0.18 * dt;
    } else {
      d.x += wind * dt;
      d.y += d.v * dt;
    }
    if (d.y > viewH + 20 || d.y < -80) Object.assign(d, newDrop(true));
    else if ((d.life -= dt) <= 0) {
      if (!snowy && splashes.length < 80) {
        const wx = d.x + cam.x;
        const wy = d.y + cam.y;
        splashes.push({ x: wx, y: wy, t: 0, water: tileAt(Math.floor(wx / TILE), Math.floor(wy / TILE)) === T.WATER });
      }
      Object.assign(d, newDrop(false));
    }
    d.x = ((d.x % (viewW + 40)) + viewW + 40) % (viewW + 40) - 20;
  }
  for (let i = splashes.length - 1; i >= 0; i--) if ((splashes[i].t += dt) > 0.35) splashes.splice(i, 1);
}

function newDrop(anywhere) {
  return {
    x: Math.random() * (viewW + 40) - 20, y: anywhere ? Math.random() * viewH : -10 - Math.random() * 30,
    v: 220 + Math.random() * 110, life: 0.3 + Math.random() * (viewH / 260), phase: Math.random() * 9, len: 5 + Math.random() * 4,
  };
}

// ---------- fog banks and cloud shadows ----------

const blobCache = new Map();
function blob(r, rgb) {
  const key = r + rgb;
  let c = blobCache.get(key);
  if (!c) {
    c = makeCanvas(r * 2, r * 2);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, `rgba(${rgb},1)`);
    grd.addColorStop(0.6, `rgba(${rgb},0.5)`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, r * 2, r * 2);
    blobCache.set(key, c);
  }
  return c;
}

// Big soft shapes scattered on a grid in world space that wraps round the view, drifting with the wind.
function drawDrifting(cx, cy, img, n, drift, alpha, seed) {
  const r = img.width / 2;
  const span = { x: viewW + r * 2, y: viewH + r * 2 };
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const wx = hash(i, seed, 3) * 4000 + time * drift;
    const wy = hash(i, seed, 4) * 4000 + time * drift * 0.25;
    const x = ((((wx - cx) % span.x) + span.x) % span.x) - r;
    const y = ((((wy - cy) % span.y) + span.y) % span.y) - r;
    ctx.drawImage(img, Math.round(x - r), Math.round(y - r));
  }
  ctx.globalAlpha = 1;
}

// Rain, snow, fog and the grey of a cloudy sky, over the world but under the night.
function drawWeather(cx, cy) {
  if (indoors) return;
  const clouds = weatherNow('clouds');
  if (clouds > 0) drawDrifting(cx, cy, blob(110, '20,28,40'), 5, 9, 0.13 * clouds, 1);
  const grey = weatherNow('grey');
  if (grey > 0) {
    ctx.fillStyle = `rgba(44,52,68,${grey})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  for (const s of splashes) {
    const u = s.t / 0.35;
    ctx.globalAlpha = 0.6 * (1 - u);
    if (s.water) ellipse(ctx, s.x - cx, s.y - cy, 1 + u * 3, 0.5 + u * 1.2, PAL.foam);
    else {
      px(ctx, Math.round(s.x - cx - 1 - u * 2), Math.round(s.y - cy - u * 2), '#d6e4f4');
      px(ctx, Math.round(s.x - cx + 1 + u * 2), Math.round(s.y - cy - u * 2), '#d6e4f4');
    }
  }
  ctx.globalAlpha = 1;
  if (precip.length) {
    if (snowy) {
      for (const d of precip) rect(ctx, Math.round(d.x), Math.round(d.y), d.len > 7 ? 2 : 1, d.len > 7 ? 2 : 1, '#ffffff');
    } else {
      const slant = (30 + weatherNow('wind') * 70) / 300;
      ctx.globalAlpha = 0.5;
      for (const d of precip) line(ctx, Math.round(d.x), Math.round(d.y), Math.round(d.x - slant * d.len), Math.round(d.y - d.len), '#c4d6ee');
      ctx.globalAlpha = 1;
    }
  }
  const fog = weatherNow('fog');
  if (fog > 0) {
    ctx.fillStyle = `rgba(222,230,238,${0.2 * fog})`;
    ctx.fillRect(0, 0, viewW, viewH);
    drawDrifting(cx, cy, blob(90, '236,240,244'), 9, 7, 0.4 * fog, 2);
  }
  drawRuinMist(cx, cy);
  drawTorCloud(cx, cy);
}

// ---------- night ----------

const nightLayer = makeCanvas(1, 1);
const cutCache = new Map();
function lightCut(r) {
  let c = cutCache.get(r);
  if (!c) {
    c = makeCanvas(r * 2, r * 2);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.7)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, r * 2, r * 2);
    cutCache.set(r, c);
  }
  return c;
}

// Everything that pushes back the dark: `r` is how far, `k` how strongly, and `glow` adds warm light on top.
function nightLights(cx, cy, visible) {
  const out = [];
  for (const o of visible) {
    const l = SPR[o.key].light;
    if (l) out.push({ x: o.x + l.dx, y: o.y + l.dy, r: Math.round(l.r * (1.6 + (o.blaze || 0) * 0.8 + (o.lit ? 1.4 : 0))), k: 1 });
    if (o === merchant.ship) out.push({ x: o.x, y: o.y - 40, r: 56, k: 0.9, glow: 16 });
  }
  for (const b of buildings) {
    if (ROOMS[b.room].cave || !onScreen(b.x, b.y, cx, cy, 120)) continue;
    out.push({ x: doorX(b), y: b.y - 8, r: 30, k: 0.85, glow: 22 });
  }
  const [px0, py0] = flight ? [flight.x, flight.y - flight.alt - 10] : [player.x, player.y - 10];
  out.push(...playerLights(px0, py0));
  if (sail) {
    const d = SPR.ship.dirs[shipObj.facing];
    out.push({ x: shipObj.x + d.seat[0] - d.ox, y: shipObj.y - 34, r: 64, k: 0.95, glow: 22 });
  }
  const x0 = Math.floor(cx / TILE);
  const y0 = Math.floor(cy / TILE);
  for (let y = y0; y <= y0 + Math.ceil(viewH / TILE); y++) {
    for (let x = x0; x <= x0 + Math.ceil(viewW / TILE); x++) {
      if (tileAt(x, y) === T.LAVA && (x + y) % 2 === 0) out.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, r: 26, k: 0.8 });
    }
  }
  for (const o of burning) {
    const l = burnLight(o);
    if (l) out.push(l);
  }
  for (const s of smoulder) out.push({ x: s.x, y: s.y - 3, r: 12, k: 0.7 * (1 - s.t / s.max) });
  for (const f of fireflies) out.push({ x: f.x, y: f.y, r: 7, k: 0.8 * fireflyGlow(f) });
  out.push(...festivalLights());
  return out;
}

// Darkens the world, cuts holes round every light, then lays warm glows, fireflies and lightning on top.
function drawNight(cx, cy, visible) {
  const cave = inCave();
  const n = cave ? 1 : indoors ? 0 : nightness();
  const warm = indoors ? 0 : golden() * (1 - weatherNow('grey') * 2);
  if (warm > 0) {
    ctx.fillStyle = `rgba(255,128,60,${0.18 * warm})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  if (n > 0.01) {
    if (nightLayer.width !== viewW || nightLayer.height !== viewH) {
      nightLayer.width = viewW;
      nightLayer.height = viewH;
    }
    const g = nightLayer.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, viewW, viewH);
    g.fillStyle = cave ? (indoors.sand ? 'rgba(14,7,2,0.9)' : indoors.fire ? 'rgba(18,4,0,0.7)' : indoors.sea ? 'rgba(1,10,20,0.7)' : 'rgba(2,4,10,0.96)') : `rgba(6,10,36,${0.7 * n})`;
    g.fillRect(0, 0, viewW, viewH);
    g.globalCompositeOperation = 'destination-out';
    const lights = nightLights(cx, cy, visible);
    for (const L of lights) {
      g.globalAlpha = L.k;
      g.drawImage(lightCut(L.r), Math.round(L.x - L.r - cx), Math.round(L.y - L.r - cy));
    }
    g.globalAlpha = 1;
    ctx.drawImage(nightLayer, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.glow) continue;
      ctx.globalAlpha = 0.7 * n;
      ctx.drawImage(glowSprite(L.glow, L.color || '#ffb050'), Math.round(L.x - L.glow - cx), Math.round(L.y - L.glow - cy));
    }
    for (const f of fireflies) {
      const k = fireflyGlow(f);
      if (k <= 0.05) continue;
      ctx.globalAlpha = k * n;
      ctx.drawImage(glowSprite(5, '#d8ff6a'), Math.round(f.x - 5 - cx), Math.round(f.y - 5 - cy));
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const f of fireflies) {
      const k = fireflyGlow(f);
      if (k <= 0.2) continue;
      ctx.globalAlpha = k * n;
      px(ctx, Math.round(f.x - cx), Math.round(f.y - cy), '#f2ffb0');
    }
    ctx.globalAlpha = 1;
  }
}

// How bright the warm lights burn: brighter as night falls.
const lampBoost = () => 1 + (inCave() ? 0.6 : indoors ? 0 : nightness() * 0.6);

function drawLightning() {
  if (weather.flash <= 0) return;
  ctx.fillStyle = `rgba(235,242,255,${weather.flash * (indoors ? 0.12 : 0.55)})`;
  ctx.fillRect(0, 0, viewW, viewH);
}

// ---------- fireflies ----------

// A few drift over grass round the player on dry nights.
const fireflies = [];
const fireflyGlow = (f) => Math.max(0, Math.sin(time * 2.2 + f.phase)) * Math.min(1, f.life, (f.max - f.life) * 0.8);

function updateFireflies(dt) {
  const want = started && !indoors && !sail && nightness() > 0.6 && weatherNow('rain') < 0.2 && !snowy ? 14 : 0;
  for (let i = fireflies.length - 1; i >= 0; i--) {
    const f = fireflies[i];
    f.life += dt;
    f.vx += (Math.random() - 0.5) * 40 * dt;
    f.vy += (Math.random() - 0.5) * 40 * dt;
    f.vx *= Math.exp(-dt);
    f.vy *= Math.exp(-dt);
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.life >= f.max || (!want && f.life < f.max - 1.2)) {
      if (!want) f.max = Math.min(f.max, f.life + 1.2);
      if (f.life >= f.max) fireflies.splice(i, 1);
    }
  }
  if (fireflies.length >= want || Math.random() > dt * 4) return;
  const x = cam.x + Math.random() * viewW;
  const y = cam.y + Math.random() * viewH;
  const t = tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
  if (t !== T.GRASS && t !== T.FIELD && t !== T.JUNGLE) return;
  fireflies.push({ x, y, vx: 0, vy: 0, phase: Math.random() * 9, life: 0, max: 8 + Math.random() * 8 });
}

// ---------- sleeping ----------

// Beds the player may sleep in: their own at home, or the spare one at the hermit's hut.
const SLEEP_ROOMS = ['home', 'hut'];
const bedHere = () => SLEEP_ROOMS.some((k) => ROOMS[k] === indoors) && objects.find((o) => o.key === 'bed' && inRoom(indoors, o));
const sleepy = () => clock > 0.7 || clock < 0.2;

function nearBed() {
  const b = bedHere();
  return !!b && !carrying() && Math.hypot(player.x - b.x, player.y - b.y + 10) < 26;
}

// A long fade to black, and it's morning; or by day, a nap till nightfall as in the tent. The game saves.
function sleep() {
  if (fade) return;
  if (!sleepy()) return napInBed();
  Sfx.yawn();
  const hut = indoors === ROOMS.hut;
  fade = {
    t: 0, len: 1.4, act: () => {
      if (clock > 0.5) dayCount++;
      clock = 0.27;
      setWeather('clear', true);
      const hermit = npcs.find((n) => n.look.id === 'hermit');
      setTimeout(() => {
        if (!hut) npcSay(mom, 'Morning, sleepyhead! Did you sleep well?');
        else if (sameSpace(hermit)) npcSay(hermit, 'Morning. The sea kept watch, and so did I.');
        else muse('A good night\'s sleep at the hermit\'s. Time to get going.');
      }, 1500);
      saveGame(true);
    },
  };
}

// A nap in a pitched tent: by day the player wakes at nightfall, by night at dawn, crawling out of the flap.
const NAP_DUSK = 0.86;
const NAP_DAWN = 0.27;
function napInTent() {
  if (fade) return;
  Sfx.yawn();
  const night = isNight();
  fade = {
    t: 0, len: 1.4, act: () => {
      advanceClock((((night ? NAP_DAWN : NAP_DUSK) - clock) % 1 + 1) % 1);
      setWeather(night ? 'clear' : pickWeather(), true);
      restStamina(1);
      player.dir = 'down';
      setTimeout(() => muse(night ? 'Morning already! Best sleep I\'ve had in ages.' : 'Dark already? That was some nap.'), 1500);
      saveGame(true);
    },
  };
}

function napInBed() {
  Sfx.yawn();
  const hut = indoors === ROOMS.hut;
  fade = {
    t: 0, len: 1.4, act: () => {
      advanceClock(((NAP_DUSK - clock) % 1 + 1) % 1);
      setWeather(pickWeather(), true);
      restStamina(1);
      const hermit = npcs.find((n) => n.look.id === 'hermit');
      setTimeout(() => {
        if (!hut) npcSay(mom, 'Had a nice nap, dear? It\'s getting dark out.');
        else if (sameSpace(hermit)) npcSay(hermit, 'Slept the day away. The gulls have gone to roost.');
        else muse('Dark already? That was some nap.');
      }, 1500);
      saveGame(true);
    },
  };
}

const inHotSpring = () => !indoors && player.swimming && tileAt(Math.floor(player.x / TILE), Math.floor((player.y - 1) / TILE)) === T.SPRING;

function chillInHotSpring() {
  if (fade || !inHotSpring()) return;
  Sfx.yawn();
  fade = {
    t: 0, len: 1.4, act: () => {
      advanceClock(2 / 24);
      restStamina(2, 2);
      muse('Two peaceful hours pass in the hot spring. I could run all day!');
      saveGame(true);
    },
  };
}

// ---------- what villagers say about it ----------

const SKY_LINES = {
  night: ['Out late, {name}? Mind your step in the dark.', 'Lovely night. Listen to the sea.', 'The stars are bright tonight.', 'Shouldn\'t you be in bed, {name}?'],
  dawn: ['Up with the sun, {name}? Good for you.'],
  rain: ['Wet enough for you, {name}?', 'Rain, rain. Good for the crops, at least.', 'I\'d stay near a fire in this.'],
  storm: ['What a storm! Thor must be angry.', 'Stay off the sea in this, {name}!', 'Hear that thunder? Thor\'s hammer at work.'],
  fog: ['Thick fog today. Easy to get lost at sea.', 'Can hardly see the end of my nose in this.'],
};

// Every third word or so, a villager remarks on the night or the weather.
function skyLine(n) {
  if ((n.skyTold = (n.skyTold || 0) + 1) % 3 !== 0) return null;
  const k = weather.level > 0.5 && SKY_LINES[weather.kind] ? weather.kind : isNight() ? 'night' : clock > 0.2 && clock < 0.3 ? 'dawn' : null;
  const lines = SKY_LINES[k];
  return lines ? lines[Math.floor(Math.random() * lines.length)] : null;
}
