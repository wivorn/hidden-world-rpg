// The hotbar along the top holds every tool carried, in TOOLS order, and F uses the selected one. The backpack button
// at the bottom left (B) folds out the backpack's slots, where picking a thing takes it out to carry and X drops it;
// the equipments (E) show everything carried: what's worn, the tools and the backpack, and use what's in it.

const hotbar = [];
// The tool F works with.
let hand = null;
// What the player has out of the backpack, held up over their head.
let carriedItem = null;

const hotbarEl = document.getElementById('hotbar');
const hotbarSlots = document.getElementById('hotbar-slots');
const bagBtn = document.getElementById('bag-btn');
const packEl = document.getElementById('pack');
const packTray = document.getElementById('pack-tray');
const packSlotsEl = document.getElementById('pack-slots');
const packRoom = document.getElementById('pack-room');
const equipBtn = document.getElementById('equip-btn');
let trayOpen = localStorage.getItem('hw-tray') === '1';
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

// Tab steps to the next tool, Shift+Tab back, wrapping round.
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

// The bar and the backpack button only appear once there's a backpack to keep things in.
function renderInventory(changed) {
  const worn = has('backpack');
  packEl.hidden = !worn;
  equipBtn.hidden = !worn;
  if (carriedItem && !has(carriedItem)) carriedItem = null;
  syncHotbar();
  syncPack();
  hotbarEl.hidden = !worn || !hotbar.length;
  if (!worn) return;
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
  bagBtn.setAttribute('aria-label', `Backpack, ${room} full`);
  bagBtn.classList.toggle('full', held().length >= packSize());
  if (changed && !hotbar.includes(changed) && ITEMS[changed] && inPack(changed)) {
    bagBtn.classList.remove('bump');
    void bagBtn.offsetWidth;
    bagBtn.classList.add('bump');
  }
  renderTray(changed);
  if (bagOpen) renderBag();
}

// Every slot of the backpack, the empty ones too; picking a thing takes it out to carry, picking it again puts it back.
function renderTray(changed) {
  packTray.hidden = !trayOpen;
  bagBtn.setAttribute('aria-expanded', String(trayOpen));
  if (!trayOpen) return;
  packRoom.textContent = `${held().length}/${packSize()}`;
  packSlotsEl.replaceChildren(...packSlots.map((id) => {
    if (!id) return emptySlot();
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.item = id;
    btn.append(iconImg(id, 2));
    const n = countTag(id);
    if (n) btn.append(n);
    btn.title = ITEMS[id].name;
    btn.setAttribute('aria-label', `${itemLabel(id)}, carry it`);
    btn.setAttribute('aria-pressed', String(id === carriedItem));
    li.classList.toggle('carried', id === carriedItem);
    if (id === changed) li.classList.add('bump');
    li.append(btn);
    return li;
  }));
}

function toggleTray(open = !trayOpen) {
  trayOpen = open;
  localStorage.setItem('hw-tray', open ? '1' : '0');
  renderTray();
  Sfx.drop();
}

// ---------- carrying a thing from the backpack ----------

// Only shown, and only dropped, while the hands are free on solid ground.
const handsFree = () => !carrying() && !sail && !flight && !player.swimming && !player.chop && !player.fishing && !player.cook;
const carriedOut = () => (carriedItem && has(carriedItem) && handsFree() ? carriedItem : null);

function carryItem(id) {
  carriedItem = carriedItem === id ? null : id;
  renderInventory();
  Sfx.drop();
}

function putAwayItem() {
  if (!carriedItem) return;
  carriedItem = null;
  renderInventory();
}

// X drops one of what's carried, Shift+X the lot; still carrying any left.
function dropCarried(all) {
  const id = carriedOut();
  if (!id) return;
  if (all) dropAll(id);
  else dropItem(id);
  if (!has(id)) putAwayItem();
}

hotbarSlots.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  selectHand(+btn.dataset.slot);
  btn.blur();
});

bagBtn.addEventListener('click', () => {
  toggleTray();
  bagBtn.blur();
});
equipBtn.addEventListener('click', () => {
  equipBtn.blur();
  toggleBag(true);
});
packSlotsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  carryItem(btn.dataset.item);
  btn.blur();
});

// ---------- the equipments ----------

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
const GEAR = ['backpack', 'toolBelt', 'satchel', 'pouch', 'map', 'mapPiece', 'runeNote', 'fishLog', 'arrow', 'featherLure', 'spinner', 'glowLure', 'goldenLure'];
const tunicId = () => `tunic_${player.look.id}`;

// Opens on `pick` if given, else on the first tool or item.
function toggleBag(open = !bagOpen, pick = null) {
  if (open && (!has('backpack') || naming || mapOpen || journalOpen || fishLogOpen || tradeOpen || chestOpen || tinkerOpen || pileOpen)) return;
  bagOpen = open;
  bagEl.hidden = !open;
  equipBtn.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('bag-open', open);
  keys.clear();
  Sfx.door();
  if (!open) return;
  bagPick = pick;
  renderBag();
  (pick && cycleTile(pick) || bagCycle()[0] || bagClose).focus();
}

// The tools then the backpack's things, which the arrow keys and Tab step through, wrapping round.
const bagCycle = () => [...bagTools.querySelectorAll('[data-pick]'), ...bagItems.querySelectorAll('[data-pick]')];
const cycleTile = (id) => bagCycle().find((b) => b.dataset.pick === id);

function stepFocus(step) {
  const list = bagCycle();
  if (!list.length) return;
  const i = list.indexOf(document.activeElement);
  list[i < 0 ? (step > 0 ? 0 : list.length - 1) : (i + step + list.length) % list.length].focus();
}

// Whatever has focus is the pick, without redrawing the tiles under it.
function setPick(id) {
  bagPick = id;
  for (const b of bagEl.querySelectorAll('[data-pick]')) b.setAttribute('aria-pressed', String(b.dataset.pick === id));
  renderPick();
}

// X drops one of the pick, Shift+X all of it; focus stays on its tile, or moves to the next one once it's gone.
function dropPicked(all) {
  const id = bagPick;
  if (!ITEMS[id] || !inPack(id) || !has(id)) return;
  const i = bagCycle().findIndex((b) => b.dataset.pick === id);
  if (all) dropAll(id);
  else dropItem(id);
  renderBag();
  const after = bagCycle();
  (cycleTile(id) || after[Math.min(i, after.length - 1)] || bagClose).focus();
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
function bagTile(id, note = '') {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.pick = id;
  btn.append(iconImg(id));
  const n = ITEMS[id] && countTag(id);
  if (n) btn.append(n);
  if (ITEMS[id] && hotbar.includes(id)) {
    const k = document.createElement('b');
    k.textContent = keyOf(hotbar.indexOf(id));
    k.setAttribute('aria-hidden', 'true');
    btn.append(k);
  }
  const name = id === tunicId() ? 'Tunic' : ITEMS[id].name;
  btn.setAttribute('aria-label', `${ITEMS[id] ? itemLabel(id) : name}${note}`);
  btn.title = name;
  btn.setAttribute('aria-pressed', String(id === bagPick));
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
  if (bagPick && !bagHas(bagPick)) bagPick = null;
  const g = bagHero.getContext('2d');
  g.clearRect(0, 0, bagHero.width, bagHero.height);
  g.drawImage(charSprite(player.look, 'down', Math.floor(time * 4) % 4 === 1 ? 1 : 0), 0, 0);
  const worn = outfit || tunicId();
  bagOutfits.replaceChildren(...[tunicId(), ...OUTFIT_IDS.filter(has)].map((id) => {
    const li = bagTile(id, id === worn ? ', wearing' : '');
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
  // `use` marks what Enter does from the tile: anything but dropping
  const btn = (label, act, use = true) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (use) b.dataset.use = '';
    b.addEventListener('click', () => {
      act();
      renderBag();
      (bagEl.querySelector(`[data-pick="${CSS.escape(id)}"]`) || bagCycle()[0] || bagClose).focus();
    });
    bagActions.append(b);
  };
  if (id === tunicId() || ITEMS[id].outfit) {
    const name = id === tunicId() ? 'Your tunic' : ITEMS[id].name;
    bagWhat.textContent = `${name}. ${OUTFIT_NOTE[id] || ''}${(outfit || tunicId()) === id ? ' You have it on.' : ''}`;
    if ((outfit || tunicId()) !== id) btn('WEAR', () => wear(id === tunicId() ? null : id));
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
      else bagWhat.textContent += ' Stand by a grown dragon and press SPACE to strap it on.';
    }
    if (id === 'runeNote') btn('READ', () => toggleBag(false) || toggleNote(true));
    if (LURES[id]) bagWhat.textContent += ` ${LURES[id].note} Cast with the rod to pick a lure; it's used up when you land a fish.`;
    if (id === 'mapPiece') bagWhat.textContent += ` Each piece marks a dragon egg on your map (${bag.mapPiece}/${EGG_MARKS.length}).`;
    if (inPack(id) && has(id)) btn('DROP', () => dropItem(id), false);
    if (inPack(id) && bag[id] > 1) btn('DROP ALL', () => dropAll(id), false);
  }
}

bagEl.addEventListener('click', (e) => {
  if (e.target === bagEl) return toggleBag(false);
  const t = e.target.closest('[data-pick]');
  if (!t) return;
  Sfx.drop();
  setPick(t.dataset.pick);
  t.focus();
});
bagEl.addEventListener('focusin', (e) => {
  const t = e.target.closest('[data-pick]');
  if (t && t.dataset.pick !== bagPick) setPick(t.dataset.pick);
});
bagClose.addEventListener('click', () => toggleBag(false));

// Registered before the game's own keys, so while the bag is open they never reach it.
window.addEventListener('keydown', (e) => {
  if (!bagOpen) return;
  e.stopImmediatePropagation();
  const step = e.code === 'Tab' ? (e.shiftKey ? -1 : 1) : { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.code];
  if (e.code === 'Escape' || e.code === 'KeyE') {
    e.preventDefault();
    toggleBag(false);
  } else if (step) {
    e.preventDefault();
    stepFocus(step);
  } else if (e.code === 'KeyX' && !e.repeat) {
    e.preventDefault();
    dropPicked(e.shiftKey);
  } else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && document.activeElement?.dataset.pick) {
    e.preventDefault();
    bagActions.querySelector('[data-use]')?.click();
  }
});

renderInventory();
