// The chests at home and in the hermit's hut: somewhere to keep what won't fit in the backpack. Their contents stay
// put between visits and saves. The hermit's starts with his spare saddles in it.

const chestStore = {};
const HERMIT_SADDLES = 10;
const hermitStore = { saddle: HERMIT_SADDLES };
const CHESTS = [
  { room: 'home', store: chestStore, title: 'STORAGE CHEST' },
  { room: 'hut', store: hermitStore, title: 'THE HERMIT\'S CHEST' },
];
const chestEl = document.getElementById('chest');
const chestTitle = document.getElementById('chest-title');
const chestBag = document.getElementById('chest-bag');
const chestList = document.getElementById('chest-store');
const chestSum = document.getElementById('chest-sum');
const chestClose = document.getElementById('chest-close');
let chestOpen = false;
// The chest being looked in.
let chestAt = CHESTS[0];

const chestObjOf = (c) => (c.obj ||= objects.find((o) => (o.key === 'chest' || o.key === 'chestOpen') && inRoom(ROOMS[c.room], o)));

// The chest in this room, if the player is standing at it.
function nearChest() {
  if (!has('backpack') || carrying()) return null;
  const c = CHESTS.find((k) => indoors === ROOMS[k.room]);
  const o = c && chestObjOf(c);
  return o && Math.hypot(player.x - o.x, player.y - o.y - 10) < 22 ? c : null;
}

const chestKept = () => Object.keys(chestAt.store).filter((id) => ITEMS[id] && chestAt.store[id] > 0);

function chestRow(id, n, verb, on, fn) {
  const li = document.createElement('li');
  const name = ITEMS[id].name;
  const lower = name.toLowerCase();
  li.append(icon(id), Object.assign(document.createElement('span'), { className: 'what', textContent: n > 1 ? `${name} ×${n}` : name }));
  const what = verb === 'STORE' ? 'Put' : 'Take';
  li.append(tradeButton(`${verb} 1`, `${what} one ${lower} ${verb === 'STORE' ? 'in' : 'out of'} the chest`, `${verb}1-${id}`, on, () => fn(1)));
  if (n > 1) li.append(tradeButton('ALL', `${what} all ${n} ${verb === 'STORE' ? 'in' : 'out of'} the chest`, `${verb}All-${id}`, on, () => fn(n)));
  return li;
}

const noneRow = (text) => Object.assign(document.createElement('li'), { className: 'none', textContent: text });

function renderChest() {
  const focused = document.activeElement?.dataset?.key;
  const mine = Object.keys(ITEMS).filter((id) => has(id) && inPack(id));
  const kept = chestKept();
  chestBag.replaceChildren(...(mine.length ? mine.map((id) => chestRow(id, bag[id], 'STORE', true, (k) => storeItem(id, k))) : [noneRow('Nothing to put away.')]));
  chestList.replaceChildren(...(kept.length ? kept.map((id) => chestRow(id, chestAt.store[id], 'TAKE', !bagFull(id), (k) => takeItem(id, k))) : [noneRow('The chest is empty.')]));
  chestSum.textContent = `BACKPACK ${held().length}/${packSize()} SLOTS`;
  const again = focused && chestEl.querySelector(`[data-key="${focused}"]:not(:disabled)`);
  (again || chestEl.querySelector('ul button:not(:disabled)') || chestClose).focus();
}

function storeItem(id, k) {
  if ((bag[id] || 0) < k) return;
  bag[id] -= k;
  chestAt.store[id] = (chestAt.store[id] || 0) + k;
  renderInventory();
  Sfx.drop();
  renderChest();
}

function takeItem(id, k) {
  const store = chestAt.store;
  if ((store[id] || 0) < k || bagFull(id)) return;
  store[id] -= k;
  if (!store[id]) delete store[id];
  give(id, k);
  Sfx.pickup();
  renderChest();
}

// Opens the chest `c` (the one the player is at), or shuts whichever is open.
function toggleChest(open = !chestOpen, c = chestAt) {
  if (open && (!c || naming || mapOpen || journalOpen || fishLogOpen || dragonLogOpen || tradeOpen)) return;
  if (open) chestAt = c;
  chestOpen = open;
  chestEl.hidden = !open;
  chestObjOf(chestAt).key = open ? 'chestOpen' : 'chest';
  chestTitle.textContent = chestAt.title;
  keys.clear();
  Sfx.door();
  if (open) renderChest();
}

chestClose.addEventListener('click', () => toggleChest(false));
chestEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  toggleChest(false);
});
chestEl.addEventListener('pointerdown', (e) => { if (e.target === chestEl) toggleChest(false); });
