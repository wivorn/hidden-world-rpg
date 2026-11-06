// Tinkering: put a few things together and see what comes of it. Nobody hands out the recipes. The ones found go in
// the list of discoveries, and a near miss says what's lacking. Villagers will say how, if asked how to make a thing.

// `needs` are used up; a `keep` tool has to be in the mix but stays in the pack; `fire` wants a fire or the forge close by.
// `miss` is what the player thinks when the mix is right but short; `teach` is what a villager says when asked.
const TINKER = [
  {
    item: 'plank', count: 2, needs: { wood: 1 }, keep: ['axe'], words: /\b(planks?|boards?)\b/, teacher: 'smith',
    miss: 'A whole log. If I split it with something sharp, I\'d have boards.',
    teach: 'Planks? Put a log with your axe and split it. Two boards from every log.',
  },
  {
    item: 'rope', needs: { string: 3 }, words: /\bropes?\b/, teacher: 'weaver',
    miss: 'One strand snaps like nothing. Twist a few more in?',
    teach: 'Rope is only string, twisted thick. Three lengths of it will do.',
  },
  {
    item: 'torch', needs: { wood: 1, wool: 1 }, words: /\btorch(es)?\b/, teacher: 'smith',
    miss: 'Something to burn, wrapped round a stick...',
    teach: 'A torch is a stick of wood with wool wound round the end. You could make one yourself, you know.',
  },
  {
    item: 'campfire', needs: { wood: 2, stone: 2 }, words: /\b(camp ?fires?|fire ?pits?)\b/, teacher: 'guard',
    miss: 'Logs inside a ring of stones... a pair of each ought to do it.',
    teach: 'A campfire? Two logs and two stones to ring them. Build it wherever you like and cook on it.',
  },
  {
    item: 'ladder', needs: { plank: 2, rope: 1 }, words: /\bladders?\b/, teacher: 'smith',
    miss: 'Two good rails. Now something strong to lash the rungs on with.',
    teach: 'Two planks for rails and a rope to lash the rungs. It\'ll reach up a low cliff, or lie over a stream.',
  },
  {
    item: 'bridge', needs: { plank: 3, rope: 1 }, words: /\bbridges?\b/, teacher: 'fisher',
    miss: 'Enough boards for a walkway, but nothing to tie them together.',
    teach: 'Three planks roped together make a bridge. Lay it over a stream or a narrow channel.',
  },
  {
    item: 'grapple', needs: { rope: 1, iron: 1 }, fire: true, words: /\b(grappl\w*|hooks?)\b/, teacher: 'smith',
    miss: 'A rope with nothing on the end. Something heavy I could bend into a hook?',
    cold: 'If I heated this iron I could bend it into a hook. I need to be by a fire.',
    teach: 'A grappling hook? Heat a lump of iron in a fire, bend it to a hook and knot a rope on. Throw it up a cliff and climb.',
  },
];
const TINKER_SLOTS = 4;
// What the player thinks when one thing is tried in place of what the mix really wants.
const STAND_INS = {
  string: ['rope', 'String is too thin to hold. It wants something thicker.'],
  wood: ['plank', 'A round log won\'t lie flat. Boards would do better.'],
  stone: ['iron', 'Stone won\'t bend. It wants something that will.'],
  sword: ['axe', 'A sword would only blunt on this. An axe is the thing for splitting wood.'],
};
const SHRUGS = ['Nothing useful comes of that.', 'Hmm. Those don\'t go together.', 'No... not like that.', 'That just makes a mess.'];

const tinker = { known: new Set(), told: false, tried: [] };
const tinkerEl = document.getElementById('tinker');
const tinkerSlotsEl = document.getElementById('tinker-slots');
const tinkerBag = document.getElementById('tinker-bag');
const tinkerKnown = document.getElementById('tinker-known');
const tinkerKnownTitle = document.getElementById('tinker-known-title');
const tinkerSay = document.getElementById('tinker-say');
const tinkerTry = document.getElementById('tinker-try');
const tinkerClear = document.getElementById('tinker-clear');
const tinkerClose = document.getElementById('tinker-close');
const tinkerBtn = document.getElementById('tinker-btn');
let tinkerOpen = false;

const heatNear = () => !!fireNear(player.x, player.y) || objects.some((o) => o.key === 'forge' && Math.hypot(o.x - player.x, o.y - player.y) < 70);
const countOf = (list) => list.reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
const wants = (r) => ({ ...r.needs, ...Object.fromEntries((r.keep || []).map((id) => [id, 1])) });
const recipeText = (r) => Object.entries(wants(r)).map(([id, n]) => `${n > 1 ? `${n} ` : ''}${n > 1 && ITEMS[id].plural ? ITEMS[id].plural : itemName(id)}`).join(' + ') + (r.fire ? ', by a fire' : '');

// How far `tried` is from `r`: what's missing and what's extra, counted one by one.
function gap(tried, r) {
  const want = wants(r);
  let missing = 0;
  let extra = 0;
  for (const id of new Set([...Object.keys(want), ...Object.keys(tried)])) {
    const d = (want[id] || 0) - (tried[id] || 0);
    if (d > 0) missing += d;
    else extra -= d;
  }
  return { missing, extra };
}

// The recipe `tried` makes, or else what the player makes of the attempt.
function judge(list) {
  const tried = countOf(list);
  const exact = TINKER.find((r) => { const g = gap(tried, r); return !g.missing && !g.extra; });
  if (exact) return exact.fire && !heatNear() ? { say: exact.cold } : { r: exact };
  const close = TINKER.map((r) => ({ r, ...gap(tried, r) })).filter((g) => !g.extra && g.missing).sort((a, b) => a.missing - b.missing)[0];
  if (close) return { say: close.r.miss };
  for (const [id, [real, say]] of Object.entries(STAND_INS)) {
    if (!tried[id]) continue;
    const swapped = { ...tried, [real]: (tried[real] || 0) + tried[id] };
    delete swapped[id];
    if (TINKER.some((r) => !gap(swapped, r).extra)) return { say };
  }
  if (TINKER.some((r) => !gap(tried, r).missing)) return { say: 'Close! But there\'s something in here it doesn\'t need.' };
  if (list.length === 1) return { say: 'On its own it\'s just what it is. Try it with something else.' };
  if (list.every((id) => EDIBLE[id] || COOKS[id])) return { say: 'That\'s not a recipe, that\'s a strange lunch.' };
  return { say: SHRUGS[Math.floor(Math.random() * SHRUGS.length)] };
}

// Room for the result once the needs are used up.
function roomFor(r) {
  if (!inPack(r.item) || has(r.item)) return true;
  const freed = Object.entries(r.needs).filter(([id, k]) => bag[id] === k).length;
  return held().length - freed < packSize();
}

function think(text) {
  tinkerSay.textContent = text;
  renderTinker();
}

function tinkerWith(list) {
  if (!list.length) return think('Pick some things to put together first.');
  const { r, say } = judge(list);
  if (!r) {
    Sfx.drop();
    return think(say);
  }
  if (has(r.item) && !ITEMS[r.item].stack) return think(`I've already got a ${itemName(r.item)}.`);
  if (!roomFor(r)) return think('No room in the pack for it. Drop something first.');
  for (const [id, k] of Object.entries(r.needs)) bag[id] -= k;
  give(r.item, r.count || 1);
  tinker.tried = [];
  stats.tinkered++;
  const fresh = !tinker.known.has(r.item);
  tinker.known.add(r.item);
  popIcon(r.item, player.x, player.y - 30);
  Sfx.clang(0.5);
  Sfx.reward();
  const what = r.count ? `${r.count} ${ITEMS[r.item].plural}` : `a ${itemName(r.item)}`;
  if (fresh) toast('DISCOVERY', `${ITEMS[r.item].name}: ${recipeText(r)}`);
  think(fresh ? `It worked! ${what[0].toUpperCase()}${what.slice(1)}. I'll remember how that goes.` : `Made ${what}.`);
}

// How many of `id` are still free to add, after what's already in the slots.
const spare = (id) => (bag[id] || 0) - tinker.tried.filter((t) => t === id).length;
const tinkerable = () => Object.keys(ITEMS).filter((id) => has(id) && !ITEMS[id].worn);

function renderTinker() {
  const focused = document.activeElement?.dataset?.key;
  tinkerSlotsEl.replaceChildren(...Array.from({ length: TINKER_SLOTS }, (_, i) => {
    const id = tinker.tried[i];
    const li = document.createElement('li');
    if (!id) {
      li.className = 'empty';
      li.setAttribute('aria-label', `Slot ${i + 1}, empty`);
      return li;
    }
    const b = tradeButton('', `Take the ${itemName(id)} back out`, `slot-${i}`, true, () => {
      tinker.tried.splice(i, 1);
      Sfx.drop();
      renderTinker();
    });
    b.append(icon(id));
    li.append(b);
    return li;
  }));
  const mine = tinkerable();
  const full = tinker.tried.length >= TINKER_SLOTS;
  tinkerBag.replaceChildren(...(mine.length ? mine.map((id) => {
    const li = document.createElement('li');
    const n = spare(id);
    li.append(icon(id), Object.assign(document.createElement('span'), { className: 'what', textContent: ITEMS[id].stack ? `${ITEMS[id].name} ×${n}` : ITEMS[id].name }));
    li.append(tradeButton('ADD', `Add the ${itemName(id)}`, `add-${id}`, n > 0 && !full, () => {
      tinker.tried.push(id);
      Sfx.drop();
      renderTinker();
    }));
    return li;
  }) : [noneRow('Nothing in your pack to tinker with.')]));
  const found = TINKER.filter((r) => tinker.known.has(r.item));
  tinkerKnownTitle.textContent = `DISCOVERIES ${found.length}/${TINKER.length}`;
  tinkerKnown.replaceChildren(...(found.length ? found.map((r) => {
    const li = document.createElement('li');
    const what = Object.assign(document.createElement('span'), { className: 'what', textContent: ITEMS[r.item].name });
    what.append(Object.assign(document.createElement('small'), { textContent: recipeText(r) }));
    const can = Object.entries(wants(r)).every(([id, k]) => (bag[id] || 0) >= k);
    li.append(icon(r.item), what, tradeButton('MAKE', `Make ${r.count ? r.count : 'a'} ${r.count ? ITEMS[r.item].plural : itemName(r.item)}`, `make-${r.item}`, can, () => {
      tinker.tried = Object.entries(wants(r)).flatMap(([id, k]) => Array(k).fill(id));
      tinkerWith(tinker.tried);
    }));
    return li;
  }) : [noneRow('Nothing yet. Put things together and see!')]));
  tinkerTry.disabled = !tinker.tried.length;
  tinkerClear.disabled = !tinker.tried.length;
  const again = focused && tinkerEl.querySelector(`[data-key="${focused}"]:not(:disabled)`);
  const stay = tinkerEl.contains(document.activeElement) && !document.activeElement.disabled && document.activeElement;
  (again || stay || tinkerEl.querySelector('#tinker-bag button:not(:disabled)') || tinkerClose).focus();
}

const canTinker = () => started && has('backpack') && !flight && !sail && !hop && !naming && !fade;

function toggleTinker(open = !tinkerOpen) {
  if (open && (!canTinker() || mapOpen || journalOpen || fishLogOpen || tradeOpen || chestOpen)) return;
  tinkerOpen = open;
  tinkerEl.hidden = !open;
  tinkerBtn.setAttribute('aria-expanded', String(open));
  keys.clear();
  Sfx.drop();
  if (open) {
    tinker.tried = tinker.tried.filter((id) => spare(id) >= 0);
    tinkerSay.textContent = heatNear() ? 'The fire\'s warm. Good for working metal.' : 'What goes with what?';
    renderTinker();
  } else {
    tinkerBtn.focus({ preventScroll: true });
    tinkerBtn.blur();
  }
}

tinkerTry.addEventListener('click', () => tinkerWith(tinker.tried));
tinkerClear.addEventListener('click', () => {
  tinker.tried = [];
  renderTinker();
});
tinkerClose.addEventListener('click', () => toggleTinker(false));
tinkerBtn.addEventListener('click', () => {
  toggleTinker();
  if (!tinkerOpen) tinkerBtn.blur();
});
tinkerEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' && e.code !== 'KeyC') return;
  e.preventDefault();
  e.stopPropagation();
  toggleTinker(false);
});
tinkerEl.addEventListener('pointerdown', (e) => { if (e.target === tinkerEl) toggleTinker(false); });

// Asked how to make something, the villager who'd know best answers; anyone else points the way to them.
function teachHears(text, near) {
  const t = text.toLowerCase();
  if (!/\b(how|recipe|teach|what do (i|you) need)\b/.test(t)) return false;
  const r = TINKER.find((x) => x.words.test(t));
  if (!r) return false;
  const n = near.find((x) => x.look.id === r.teacher) || near.find((x) => addresses(x.look.id, t)) || near[0];
  if (n.look.id === r.teacher || n.look.id === 'hermit') npcSay(n, `${r.teach} Press C to tinker.`);
  else npcSay(n, `A ${itemName(r.item)}? Ask the ${TEACHER_NAMES[r.teacher]}. They'd know how it goes together.`);
  faceToward(n, player.x - n.x, player.y - n.y);
  return true;
}
const TEACHER_NAMES = { smith: 'smith at the forge', weaver: 'weaver', guard: 'guard at the gate', fisher: 'fisherman at the docks' };

function initTinker() {
  toggleIcon(tinkerBtn, 'tinker');
}

// The first time there's a couple of things to put together, a word on how.
function updateTinker() {
  tinkerBtn.hidden = !has('backpack');
  if (tinker.told || !has('backpack') || tinkerable().length < 2) return;
  tinker.told = true;
  toast('TINKER', 'Press C to put things together and see what you can make');
}

const saveTinker = () => ({ known: [...tinker.known], told: tinker.told });
function restoreTinker(s) {
  if (!s) return;
  for (const id of s.known || []) if (ITEMS[id]) tinker.known.add(id);
  tinker.told = !!s.told;
}
