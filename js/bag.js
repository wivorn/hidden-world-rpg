// The hotbar at the bottom left holds the things F uses; the bag (B) shows everything carried: what's worn, the tools
// and the backpack, and puts things on or off the hotbar.

const HOTBAR = 6;
const hotbar = Array(HOTBAR).fill(null);
// The hotbar slot F works from.
let hand = 0;
// Things the player took off the hotbar, so a new one turning up doesn't put them back.
const unpinned = new Set();

const hotbarEl = document.getElementById('hotbar');
const hotbarSlots = document.getElementById('hotbar-slots');
const bagBtn = document.getElementById('bag-btn');
const iconUrls = {};
const iconOf = (id) => SPR.icon[id] || SPR.ui[id];
const iconUrl = (id) => (iconUrls[id] ||= iconOf(id).toDataURL());
const keyOf = (i) => String(i + 1);

// What F does something with; these take a free hotbar slot by themselves. Outfits go on only when put there.
const usable = (id) => !!(ITEMS[id].tool || id === 'torch' || id === 'saddle' || id === 'wood' || id === 'stone' || id === 'meat' || EDIBLE[id] || COOKS[id] || PLACE[id]);
const pinnable = (id) => usable(id) || !!ITEMS[id].outfit;
const primary = () => (hotbar[hand] && has(hotbar[hand]) ? hotbar[hand] : null);

// Used-up things leave the hotbar; new usable ones fill the first free slot.
function syncHotbar() {
  for (let i = 0; i < HOTBAR; i++) if (hotbar[i] && !has(hotbar[i])) hotbar[i] = null;
  for (const id of new Set([...BELT, ...Object.keys(ITEMS)])) {
    if (!has(id) || !usable(id) || unpinned.has(id) || hotbar.includes(id)) continue;
    const i = hotbar.indexOf(null);
    if (i < 0) return;
    hotbar[i] = id;
  }
}

// The key that readies `id`: its hotbar number, or B to open the bag and put it there.
const slotKey = (id) => (hotbar.includes(id) ? keyOf(hotbar.indexOf(id)) : 'B');

function selectHand(i) {
  if (i === hand || !has('backpack')) return;
  hand = i;
  renderInventory();
  Sfx.drop();
}

const pickTool = (n) => n >= 1 && n <= HOTBAR && selectHand(n - 1);

// E and Tab step to the next filled slot (`step` 1), Q back (-1), wrapping round.
function cycleSelection(step) {
  for (let k = 1; k <= HOTBAR; k++) {
    const i = (hand + step * k + HOTBAR * 2) % HOTBAR;
    if (hotbar[i]) return selectHand(i);
  }
}

function dropActive() {
  const id = primary();
  if (id && inPack(id)) dropItem(id);
}

// Puts `id` in slot `i`; whatever was there moves to where `id` came from, or off the bar.
function pinAt(id, i) {
  const from = hotbar.indexOf(id);
  if (from === i) return;
  if (from >= 0) hotbar[from] = hotbar[i];
  else if (hotbar[i]) unpinned.add(hotbar[i]);
  hotbar[i] = id;
  unpinned.delete(id);
  renderInventory(id);
  Sfx.drop();
}

function pin(id) {
  const i = hotbar.indexOf(null);
  pinAt(id, i >= 0 ? i : hand);
}

function unpin(id) {
  const i = hotbar.indexOf(id);
  if (i < 0) return;
  hotbar[i] = null;
  unpinned.add(id);
  renderInventory();
  Sfx.drop();
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
  hotbarEl.hidden = bagBtn.hidden = !has('backpack');
  if (hotbarEl.hidden) return;
  if (!bagBtn.querySelector('img').src) bagBtn.querySelector('img').replaceWith(iconImg('backpack', 2));
  syncHotbar();
  hotbarSlots.replaceChildren(...hotbar.map((id, i) => {
    const li = document.createElement('li');
    const live = i === hand;
    li.classList.toggle('primary', live);
    const key = document.createElement('b');
    key.textContent = keyOf(i);
    key.setAttribute('aria-hidden', 'true');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.slot = i;
    if (id) {
      btn.draggable = true;
      btn.dataset.item = id;
      btn.append(iconImg(id));
      const n = countTag(id);
      if (n) btn.append(n);
      if (id === 'torch') btn.append(Object.assign(document.createElement('em'), { className: 'burn' }));
    } else li.classList.add('empty');
    btn.setAttribute('aria-label', `Slot ${keyOf(i)}, ${id ? itemLabel(id) : 'empty'}${live ? ', used with F' : ''}`);
    btn.setAttribute('aria-pressed', String(live));
    li.append(key, btn);
    if (id && (id === changed || (id === 'bow' && changed === 'arrow'))) li.classList.add('bump');
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

// Drag a hotbar thing onto another slot to swap them, or into the bag to take it off the bar; drag from the bag
// onto a slot to put it there.
let dragId = null;
function slotOf(el) {
  const li = el?.closest?.('#hotbar-slots li');
  return li ? +li.querySelector('button').dataset.slot : -1;
}
document.addEventListener('dragstart', (e) => {
  const btn = e.target.closest?.('[data-item]');
  if (!btn || !(hotbarSlots.contains(btn) || bagEl.contains(btn)) || !pinnable(btn.dataset.item)) return;
  dragId = btn.dataset.item;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
});
document.addEventListener('dragover', (e) => {
  if (!dragId || (slotOf(e.target) < 0 && !(bagOpen && bagEl.querySelector('.panel').contains(e.target)))) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});
document.addEventListener('drop', (e) => {
  if (!dragId) return;
  e.preventDefault();
  const i = slotOf(e.target);
  if (i >= 0) pinAt(dragId, i);
  else if (hotbar.includes(dragId)) unpin(dragId);
  dragId = null;
});
document.addEventListener('dragend', () => { dragId = null; });

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
const TREASURE = new Set(['gold', 'ruby', 'emerald', 'goblet', 'crown']);
const MATERIALS = new Set(['wood', 'stone', 'iceCube', 'wool', 'string', 'feather', 'hide', 'iron', 'plank', 'rope']);
const GROUPS = ['Food', 'Materials', 'Treasure', 'Kits & other'];
const groupOf = (id) => (EDIBLE[id] || COOKS[id] ? 'Food' : MATERIALS.has(id) ? 'Materials' : TREASURE.has(id) ? 'Treasure' : 'Kits & other');
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

const bagHas = (id) => id === tunicId() || has(id);

// One tile: a button with the icon and count, pressed while it's the bag's pick.
function bagTile(id, { locked = false, note = '' } = {}) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.pick = id;
  if (!locked && ITEMS[id] && pinnable(id)) {
    btn.draggable = true;
    btn.dataset.item = id;
  }
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
  const tools = BELT.filter((id) => ITEMS[id].tool && has(id));
  bagTools.replaceChildren(...tools.map((id) => bagTile(id, { note: onBelt(id) ? '' : ', in the backpack' })));
  if (!tools.length) bagTools.append(Object.assign(document.createElement('li'), { className: 'none', textContent: 'None yet' }));
  const items = held().filter((id) => !ITEMS[id].tool);
  bagRoom.textContent = `${held().length}/${packSize()}`;
  bagItems.replaceChildren(...GROUPS.flatMap((group) => {
    const ids = items.filter((id) => groupOf(id) === group);
    if (!ids.length) return [];
    const h = document.createElement('h4');
    h.textContent = group.toUpperCase();
    const ul = document.createElement('ul');
    ul.className = 'bag-grid';
    ul.setAttribute('aria-label', group);
    ul.append(...ids.map((id) => bagTile(id)));
    return [h, ul];
  }));
  if (!items.length) bagItems.append(Object.assign(document.createElement('p'), { className: 'none', textContent: 'Nothing in the backpack' }));
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
      : onBelt(id) ? 'Hangs on your tool belt.'
        : ITEMS[id].tool ? 'Takes a backpack slot until the tanner makes you a tool belt.' : '';
    bagWhat.textContent = `${itemLabel(id)}. ${where}`.trim();
    if (EDIBLE[id]) btn('EAT', () => eat(id));
    if (id === 'runeNote') btn('READ', () => toggleBag(false) || toggleNote(true));
    if (id === 'mapPiece') bagWhat.textContent += ` Each piece marks a dragon egg on your map (${bag.mapPiece}/${EGG_MARKS.length}).`;
    if (inPack(id) && has(id)) btn('DROP', () => dropItem(id));
  }
  if (ITEMS[id] && pinnable(id) && bagHas(id)) {
    if (hotbar.includes(id)) btn('OFF HOTBAR', () => unpin(id));
    else btn('ON HOTBAR', () => pin(id));
    bagWhat.textContent += hotbar.includes(id) ? ` On hotbar slot ${keyOf(hotbar.indexOf(id))}.` : '';
    bagWhat.textContent += ` Press 1-${HOTBAR} to put it in that slot.`;
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
  } else if (/^Digit[1-9]$/.test(e.code) && +e.code[5] <= HOTBAR && !e.repeat && ITEMS[bagPick] && pinnable(bagPick) && has(bagPick)) {
    pinAt(bagPick, +e.code[5] - 1);
  }
});

renderInventory();
