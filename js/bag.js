// The hotbar at the bottom left holds every tool carried, in TOOLS order, and F uses the selected one; the bag (B)
// shows everything carried: what's worn, the tools and the backpack, and uses what's in it.

const hotbar = [];
// The tool F works with.
let hand = null;

const hotbarEl = document.getElementById('hotbar');
const hotbarSlots = document.getElementById('hotbar-slots');
const bagBtn = document.getElementById('bag-btn');
const iconUrls = {};
const iconOf = (id) => SPR.icon[id] || SPR.ui[id];
const iconUrl = (id) => (iconUrls[id] ||= iconOf(id).toDataURL());
const keyOf = (i) => String(i + 1);
const primary = () => (hand && has(hand) ? hand : null);

// With the tool in hand gone, the first one left is picked up instead.
function syncHotbar() {
  hotbar.splice(0, hotbar.length, ...TOOLS.filter(has));
  if (!hotbar.includes(hand)) hand = hotbar[0] || null;
}

// The key that readies `id`.
const slotKey = (id) => keyOf(hotbar.indexOf(id));

function selectHand(i) {
  if (!hotbar[i] || hotbar[i] === hand || !has('backpack')) return;
  hand = hotbar[i];
  renderInventory();
  Sfx.drop();
}

const pickTool = (n) => n >= 1 && selectHand(n - 1);

// E and Tab step to the next tool (`step` 1), Q back (-1), wrapping round.
function cycleSelection(step) {
  const n = hotbar.length;
  if (n) selectHand((hotbar.indexOf(hand) + step + n) % n);
}

// Arrows show as a count on the bow, wherever it is.
const shownCount = (id) => (ITEMS[id].stack ? bag[id] : id === 'bow' ? bag.arrow || 0 : null);
function itemLabel(id) {
  const n = shownCount(id);
  if (n === null) return ITEMS[id].name;
  return id === 'bow' ? `${ITEMS[id].name}, ${n} ${n === 1 ? 'arrow' : 'arrows'}` : `${ITEMS[id].name} (${n})`;
}

function iconImg(id, scale = 3) {
  const img = document.createElement('img');
  img.src = iconUrl(id);
  img.alt = '';
  img.style.width = `${iconOf(id).width * scale}px`;
  return img;
}

function countTag(id) {
  const n = shownCount(id);
  if (n === null) return null;
  const span = document.createElement('span');
  span.textContent = n;
  return span;
}

// The bar and the bag button only appear once there's a backpack to keep things in.
function renderInventory(changed) {
  bagBtn.hidden = !has('backpack');
  syncHotbar();
  syncPack();
  hotbarEl.hidden = bagBtn.hidden || !hotbar.length;
  if (bagBtn.hidden) return;
  if (!bagBtn.querySelector('img').src) bagBtn.querySelector('img').replaceWith(iconImg('backpack', 2));
  hotbarSlots.replaceChildren(...hotbar.map((id, i) => {
    const li = document.createElement('li');
    const live = id === hand;
    li.classList.toggle('primary', live);
    const key = document.createElement('b');
    key.textContent = keyOf(i);
    key.setAttribute('aria-hidden', 'true');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.slot = i;
    btn.dataset.item = id;
    btn.append(iconImg(id));
    const n = countTag(id);
    if (n) btn.append(n);
    if (id === 'torch') btn.append(Object.assign(document.createElement('em'), { className: 'burn' }));
    btn.setAttribute('aria-label', `${keyOf(i)}, ${itemLabel(id)}${live ? ', used with F' : ''}`);
    btn.setAttribute('aria-pressed', String(live));
    li.append(key, btn);
    if (id === changed || (id === 'bow' && changed === 'arrow')) li.classList.add('bump');
    return li;
  }));
  const room = `${held().length}/${packSize()}`;
  bagBtn.querySelector('span').textContent = room;
  bagBtn.setAttribute('aria-label', `Bag, backpack ${room} full`);
  bagBtn.classList.toggle('full', held().length >= packSize());
  if (changed && !hotbar.includes(changed) && ITEMS[changed] && inPack(changed)) {
    bagBtn.classList.remove('bump');
    void bagBtn.offsetWidth;
    bagBtn.classList.add('bump');
  }
  if (bagOpen) renderBag();
}

hotbarSlots.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  selectHand(+btn.dataset.slot);
  btn.blur();
});

bagBtn.addEventListener('click', () => {
  toggleBag();
  bagBtn.blur();
});

// ---------- the bag ----------

const bagEl = document.getElementById('bag');
const bagClose = document.getElementById('bag-close');
const bagHero = document.getElementById('bag-hero');
const bagOutfits = document.getElementById('bag-outfits');
const bagGear = document.getElementById('bag-gear');
const bagTools = document.getElementById('bag-tools');
const bagItems = document.getElementById('bag-items');
const bagRoom = document.getElementById('bag-room');
const bagWhat = document.getElementById('bag-what');
const bagActions = document.getElementById('bag-actions');
let bagOpen = false;
// The thing picked in the bag, for the buttons under the columns.
let bagPick = null;

const OUTFIT_IDS = Object.keys(ITEMS).filter((id) => ITEMS[id].outfit);
const GEAR = ['backpack', 'toolBelt', 'satchel', 'pouch', 'map', 'mapPiece', 'runeNote', 'fishLog', 'arrow'];
const tunicId = () => `tunic_${player.look.id}`;

function toggleBag(open = !bagOpen) {
  if (open && (!has('backpack') || naming || mapOpen || journalOpen || fishLogOpen || tradeOpen || chestOpen || tinkerOpen)) return;
  bagOpen = open;
  bagEl.hidden = !open;
  document.body.classList.toggle('bag-open', open);
  bagBtn.setAttribute('aria-expanded', String(open));
  keys.clear();
  Sfx.door();
  if (!open) return;
  if (bagPick && !bagHas(bagPick)) bagPick = null;
  bagPick ||= primary();
  renderBag();
  (bagEl.querySelector('[aria-pressed="true"]') || bagClose).focus();
}

// The backpack's slots: each thing keeps its slot, new things take the first free one, null is an empty slot.
const packSlots = [];

function syncPack() {
  const items = held();
  packSlots.forEach((id, i) => { if (id && !items.includes(id)) packSlots[i] = null; });
  for (const id of items) {
    if (packSlots.includes(id)) continue;
    const free = packSlots.indexOf(null);
    if (free < 0) packSlots.push(id);
    else packSlots[free] = id;
  }
  while (packSlots.length < packSize()) packSlots.push(null);
  while (packSlots.length > packSize() && packSlots.at(-1) === null) packSlots.pop();
}

const bagHas = (id) => id === tunicId() || has(id);

// One tile: a button with the icon and count, pressed while it's the bag's pick.
function bagTile(id, { locked = false, note = '' } = {}) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.pick = id;
  btn.append(iconImg(id));
  const n = ITEMS[id] && !locked && countTag(id);
  if (n) btn.append(n);
  if (ITEMS[id] && hotbar.includes(id)) {
    const k = document.createElement('b');
    k.textContent = keyOf(hotbar.indexOf(id));
    k.setAttribute('aria-hidden', 'true');
    btn.append(k);
  }
  const name = id === tunicId() ? 'Tunic' : ITEMS[id].name;
  btn.setAttribute('aria-label', `${locked ? `${name}, not made yet` : ITEMS[id] ? itemLabel(id) : name}${note}`);
  btn.title = locked ? `${name} (not made yet)` : name;
  btn.setAttribute('aria-pressed', String(id === bagPick));
  if (locked) li.classList.add('locked');
  li.append(btn);
  return li;
}

function emptySlot() {
  const li = document.createElement('li');
  li.className = 'empty';
  li.setAttribute('aria-hidden', 'true');
  return li;
}

function renderBag() {
  const g = bagHero.getContext('2d');
  g.clearRect(0, 0, bagHero.width, bagHero.height);
  g.drawImage(charSprite(player.look, 'down', Math.floor(time * 4) % 4 === 1 ? 1 : 0), 0, 0);
  const worn = outfit || tunicId();
  bagOutfits.replaceChildren(...[tunicId(), ...OUTFIT_IDS].map((id) => {
    const li = bagTile(id, { locked: !bagHas(id), note: id === worn ? ', wearing' : '' });
    li.classList.toggle('worn', id === worn);
    return li;
  }));
  bagGear.replaceChildren(...GEAR.filter(has).map((id) => bagTile(id)));
  bagTools.replaceChildren(...hotbar.map((id) => bagTile(id)));
  if (!hotbar.length) bagTools.append(Object.assign(document.createElement('li'), { className: 'none', textContent: 'None yet' }));
  syncPack();
  bagRoom.textContent = `${held().length}/${packSize()}`;
  bagItems.replaceChildren(...packSlots.map((id) => id ? bagTile(id) : emptySlot()));
  renderPick();
}

// What the picked thing is, and what can be done with it here.
function renderPick() {
  const id = bagPick;
  bagActions.replaceChildren();
  if (!id) {
    bagWhat.textContent = 'Pick something to see what you can do with it.';
    return;
  }
  const btn = (label, act) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => {
      act();
      renderBag();
      (bagActions.querySelector('button') || bagEl.querySelector(`[data-pick="${CSS.escape(id)}"]`) || bagClose).focus();
    });
    bagActions.append(b);
  };
  if (id === tunicId() || ITEMS[id].outfit) {
    const owned = bagHas(id);
    const name = id === tunicId() ? 'Your tunic' : ITEMS[id].name;
    const recipe = RECIPES.find((r) => r.item === id);
    bagWhat.textContent = !owned ? `${name}. The ${recipe.maker} sews one from ${listNeeds(recipe.needs)}.`
      : `${name}. ${OUTFIT_NOTE[id] || ''}${(outfit || tunicId()) === id ? ' You have it on.' : ''}`;
    if (owned && (outfit || tunicId()) !== id) btn('WEAR', () => wear(id === tunicId() ? null : id));
    else if (outfit === id) btn('TAKE OFF', () => wear(null));
  } else {
    const where = ITEMS[id].worn ? 'Worn, so it takes no backpack slot.'
      : ITEMS[id].tool ? `On the hotbar: press ${slotKey(id)} to ready it, F to use it. Tools take no backpack slot.` : '';
    bagWhat.textContent = `${itemLabel(id)}. ${where}`.trim();
    // what's done out in the world closes the bag first
    const out = (label, act) => btn(label, () => { toggleBag(false); act(); });
    const here = canUseTool() && !player.cook && !player.chop;
    const fire = here && fireNear(player.x, player.y);
    if (EDIBLE[id]) btn('EAT', () => eat(id));
    if (COOKS[id] && fire) out(COOK_VERB[id].toUpperCase(), () => startCook(id));
    const fence = here && id === 'wood' && nearTarget('wood');
    if (fence) out('MEND FENCE', () => mendWithWood(fence));
    if (id === 'wood' && fire) out('ADD TO FIRE', () => dropItem('wood'));
    if (here && PLACE[id]) out('PLACE', () => placeThing(id));
    if (here && id === 'stone') out('THROW', throwStone);
    if (id === 'saddle') {
      if (nearDragon()) out('SADDLE UP', saddleUp);
      else bagWhat.textContent += ' Stand by a grown dragon and open the bag to strap it on.';
    }
    if (id === 'runeNote') btn('READ', () => toggleBag(false) || toggleNote(true));
    if (id === 'mapPiece') bagWhat.textContent += ` Each piece marks a dragon egg on your map (${bag.mapPiece}/${EGG_MARKS.length}).`;
    if (inPack(id) && has(id)) btn('DROP', () => dropItem(id));
  }
}

bagEl.addEventListener('click', (e) => {
  if (e.target === bagEl) return toggleBag(false);
  const t = e.target.closest('[data-pick]');
  if (!t) return;
  bagPick = t.dataset.pick;
  Sfx.drop();
  renderBag();
  bagEl.querySelector(`[data-pick="${CSS.escape(bagPick)}"]`)?.focus();
});
bagClose.addEventListener('click', () => toggleBag(false));

// Registered before the game's own keys, so while the bag is open they never reach it.
window.addEventListener('keydown', (e) => {
  if (!bagOpen) return;
  e.stopImmediatePropagation();
  if (e.code === 'Escape' || e.code === 'KeyB') {
    e.preventDefault();
    toggleBag(false);
  }
});

renderInventory();
