// Clothes: one outfit at a time over the tunic. The frozen isle is too cold to stay on without the fur coat, and the
// volcano too hot without the fireproof jacket: a few seconds ashore and the player has to turn back.

// The worn outfit's item id, or null for the plain tunic.
let outfit = null;
const OUTFIT_NOTE = {
  furCoat: 'Warm enough for the frozen isle and the ice cave.',
  fireJacket: 'Fire eel skin: the volcano\'s heat can\'t get through it.',
};

function dress() {
  player.look = { ...player.look, coat: outfit ? COATS[outfit] : undefined };
  if (sail) shipObj.rider = player.look;
}

function wear(id) {
  if (id && !has(id)) return;
  outfit = id;
  dress();
  renderInventory();
  Sfx.pickup();
  dust(player.x, player.y);
}

// ---------- the seamstress ----------

// She listens for where the player is going, not just what they want sewn: fire or the volcano gets her talking
// about the fireproof jacket, cold or the frozen isle the fur coat. Asked to make one, she does (see `askCraft`).
const HEAT_WORDS = /\b(fire\w*|flames?|volcan\w*|lava|magma|craters?|heat|hot|burn\w*|scald\w*|scorch\w*|blaz\w*)\b/i;
const COLD_WORDS = /\b(cold|freez\w*|frozen|ice|icy|snow\w*|frost\w*|chill\w*|winter|blizzards?)\b/i;
const MAKE_WORDS = /\b(make|sew|stitch|craft|need|want|get|give|buy|have|can i|could i|please)\b/i;

function seamstressHears(n, text) {
  if (n.look.id !== 'seamstress') return false;
  const id = HEAT_WORDS.test(text) ? 'fireJacket' : COLD_WORDS.test(text) ? 'furCoat' : null;
  if (!id) return false;
  if (!has(id) && MAKE_WORDS.test(text) && askCraft(n, id === 'fireJacket' ? 'fireproof jacket' : 'fur coat')) return true;
  if (id === 'fireJacket') stats.jacketAsked = 1;
  npcSay(n, id === 'fireJacket'
    ? outfit === id ? 'That fireproof jacket will see you right, dear. Fire eel skin: nothing burns it.'
      : has(id) ? 'Off to the fire mountain? Put on the fireproof jacket I made you first, dear. Open your bag (B) and wear it.'
        : `Fire? The volcano?! Not in that tunic, dear. You'll want a fireproof jacket: fire eel skin outside, wool underneath. Bring me 2 fire eels and 2 wool and ask me to make one.${(bag.eel || 0) < 2 ? ' The fisher knows where the eels bite.' : ''}`
    : outfit === id ? 'Snug in that fur coat? The cold won\'t touch you.'
      : has(id) ? 'Somewhere cold? Put on the fur coat I made you, dear. Open your bag (B) and wear it.'
        : `Cold? The frozen isle?! You'd freeze solid in that tunic, dear. Bring me 4 hides and 2 wool and ask me for a thick fur coat.${(bag.hide || 0) < 4 ? ' Deer and boar in the south woods give hides.' : ''}`);
  return true;
}

// ---------- too cold, too hot ----------

// Seconds ashore before the player has to turn back.
const EXPOSE_T = 6;
const EXPOSE = {
  cold: { outfit: 'furCoat', isle: 'frozen', label: 'FREEZING', back: 'Brrr! Too cold! Back I go to warm up.' },
  heat: { outfit: 'fireJacket', isle: 'volcano', label: 'SCORCHING', back: 'Too hot! I can\'t breathe in this heat. Back I go!' },
};
const exposure = { kind: null, v: 0, warned: false, puffT: 0 };
const exposureEl = document.getElementById('exposure');

// The islands' coasts wander a little past their ellipses.
function onIsle(id) {
  const i = isle(id);
  return Math.hypot((player.x / TILE - i.x) / (i.rx + 4), (player.y / TILE - i.y) / (i.ry + 4)) < 1;
}

// Which weather the player is out in on foot, if any.
function exposedTo() {
  if (sail || flight || hop || fade || player.swimming || player.flying) return null;
  if (indoors) return indoors === ROOMS.cave ? 'cold' : indoors === ROOMS.fireCave ? 'heat' : null;
  if (onIsle('frozen')) return 'cold';
  if (onIsle('volcano')) return 'heat';
  return null;
}

function updateExposure(dt) {
  const kind = exposedTo();
  const e = EXPOSE[kind];
  const bare = e && outfit !== e.outfit;
  if (bare) {
    if (exposure.kind !== kind) Object.assign(exposure, { kind, v: 0, warned: false });
    exposure.v = Math.min(1, exposure.v + dt / EXPOSE_T);
    if (!exposure.warned) {
      exposure.warned = true;
      warnExposure(e);
    }
    exposure.puffT -= dt;
    if (exposure.puffT <= 0) {
      exposure.puffT = 0.45 - exposure.v * 0.25;
      puff(kind);
    }
    if (exposure.v >= 1) turnBack(e);
  } else {
    exposure.v = Math.max(0, exposure.v - dt / 2);
    if (!e) exposure.warned = false;
  }
  showExposure();
}

function warnExposure(e) {
  const name = ITEMS[e.outfit].name.toLowerCase();
  const r = RECIPES.find((x) => x.item === e.outfit);
  const start = e.outfit === 'furCoat' ? 'Brrr! It\'s bitter cold here.' : 'Phew! The ground\'s hot enough to cook on.';
  muse(has(e.outfit) ? `${start} My ${name} is in my bag. I should put it on (B)!`
    : `${start} I need a ${name}. The ${r.maker} could sew one from ${listNeeds(r.needs)}.`);
}

// Frosty breath and shivers in the cold; sweat and smoke in the heat.
function puff(kind) {
  const x = player.x + (player.dir === 'left' ? -4 : player.dir === 'right' ? 4 : 0);
  if (kind === 'cold') {
    particles.push({ type: 'steam', x, y: player.y - 17, vx: (Math.random() - 0.5) * 8, vy: -8, life: 0, max: 0.9 });
  } else {
    particles.push({ type: 'smoke', x: player.x + (Math.random() - 0.5) * 10, y: player.y - 8 - Math.random() * 10, vx: (Math.random() - 0.5) * 6, vy: -14, life: 0, max: 0.9 });
    if (Math.random() < 0.5) particles.push({ type: 'spark', x, y: player.y - 18, vx: (Math.random() - 0.5) * 20, vy: 10, c: '#bfe6ff', c2: '#7ab8e0', life: 0, max: 0.4 });
  }
}

// Back aboard: onto a saddled dragon waiting close by if there is one, or else the longship.
function turnBack(e) {
  if (fade) return;
  muse(e.back);
  fadeTo(() => {
    const out = indoors ? outsideDoor(indoors) : player;
    indoors = null;
    Object.assign(player, { x: out.x, y: out.y, fishing: null, chop: null, nock: null, swimming: false });
    Object.assign(exposure, { v: 0, warned: false });
    const d = dragons.find((b) => b.stage === GROWN && b.perched && b.saddled && Math.hypot(b.x - player.x, b.y - player.y) < 360);
    if (d) {
      Object.assign(player, standSpotNear(player, d.x, d.y + 12));
      return mount(d);
    }
    const deck = deckPos();
    sail = { vx: 0, vy: 0, wakeT: 0, shoreT: 0, shore: null };
    shipObj.rider = player.look;
    Object.assign(player, { x: deck.x, y: shipObj.y, flying: true });
  });
}

function showExposure() {
  const v = exposure.v;
  exposureEl.hidden = v <= 0;
  document.body.classList.toggle('cold', v > 0 && exposure.kind === 'cold');
  document.body.classList.toggle('hot', v > 0 && exposure.kind === 'heat');
  document.body.style.setProperty('--exposure', v.toFixed(3));
  if (v <= 0) return;
  exposureEl.querySelector('span').textContent = EXPOSE[exposure.kind].label;
  exposureEl.setAttribute('aria-label', EXPOSE[exposure.kind].label.toLowerCase());
  exposureEl.setAttribute('aria-valuenow', Math.round(v * 100));
}
