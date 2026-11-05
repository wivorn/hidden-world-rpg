// The chest at home: somewhere to keep what won't fit in the backpack. Its contents stay put between visits and saves.

const chestStore = {};
const chestEl = document.getElementById('chest');
const chestBag = document.getElementById('chest-bag');
const chestList = document.getElementById('chest-store');
const chestSum = document.getElementById('chest-sum');
const chestClose = document.getElementById('chest-close');
let chestOpen = false;
let chestObj = null;

const homeChest = () => (chestObj ||= objects.find((o) => o.key === 'chest' && inRoom(ROOMS.home, o)));

function nearChest() {
  const c = homeChest();
  return indoors === ROOMS.home && has('backpack') && !carrying() && Math.hypot(player.x - c.x, player.y - c.y - 10) < 22;
}

const chestKept = () => Object.keys(chestStore).filter((id) => ITEMS[id] && chestStore[id] > 0);

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
  chestList.replaceChildren(...(kept.length ? kept.map((id) => chestRow(id, chestStore[id], 'TAKE', !bagFull(id), (k) => takeItem(id, k))) : [noneRow('The chest is empty.')]));
  chestSum.textContent = `BACKPACK ${held().length}/${packSize()} SLOTS`;
  const again = focused && chestEl.querySelector(`[data-key="${focused}"]:not(:disabled)`);
  (again || chestEl.querySelector('ul button:not(:disabled)') || chestClose).focus();
}

function storeItem(id, k) {
  if ((bag[id] || 0) < k) return;
  bag[id] -= k;
  chestStore[id] = (chestStore[id] || 0) + k;
  renderInventory();
  Sfx.drop();
  renderChest();
}

function takeItem(id, k) {
  if ((chestStore[id] || 0) < k || bagFull(id)) return;
  chestStore[id] -= k;
  if (!chestStore[id]) delete chestStore[id];
  give(id, k);
  Sfx.pickup();
  renderChest();
}

function toggleChest(open = !chestOpen) {
  if (open && (naming || mapOpen || journalOpen || fishLogOpen || tradeOpen)) return;
  chestOpen = open;
  chestEl.hidden = !open;
  homeChest().key = open ? 'chestOpen' : 'chest';
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
