// The travelling merchant: every third day his ship ties up in the bay and he buys what you've gathered for coin.

// All money is counted in copper: ten copper to the silver, ten silver to the gold.
let coins = 0;
const upgrades = { lure: false, sail: false, bow: 0 };
const purseEl = document.getElementById('purse');
const COIN_KINDS = [['goldCoin', 'gold', 100], ['silver', 'silver', 10], ['copper', 'copper', 1]];
const coinParts = (c) => COIN_KINDS.map(([icon, name, v]) => ({ icon, name, n: v === 100 ? Math.floor(c / v) : Math.floor(c / v) % 10 }));
function coinWords(c) {
  const words = coinParts(c).filter((p) => p.n).map((p) => `${p.n} ${p.name}`);
  return words.length ? words.join(', ').replace(/, ([^,]*)$/, ' and $1') : 'no money';
}

// What Ottar pays for one of each, in copper.
const PRICES = { fish: 8, trout: 15, cod: 30, cavefish: 40, eel: 50, goldenFish: 250, wool: 15, iron: 40, gold: 100, mushroom: 25, meat: 30, hide: 35, ruby: 150, emerald: 150, goblet: 250, crown: 600 };
const WARES = [
  { id: 'torch', price: 35, text: 'Burns six hours once lit. For caves and dark nights.' },
  { id: 'arrow', n: 10, price: 60, text: 'A bundle of ten arrows.' },
  { id: 'satchel', price: 250, text: 'Straps to your pack. Room for two more things.', owned: () => has('satchel') },
  { id: 'lure', price: 200, text: 'Fish bite sooner, and golden fish come more often.', owned: () => upgrades.lure },
  { id: 'sail', price: 300, text: 'A silk sail. The longship runs a third faster.', owned: () => upgrades.sail },
];
const WARE_NAMES = { lure: 'Golden lure', sail: 'Silk sail' };
const wareName = (w) => (w.n ? `${w.n} ${ITEMS[w.id].plural}` : WARE_NAMES[w.id] || ITEMS[w.id].name);

// ---------- the ship's comings and goings ----------

// He's in port from the morning of every third day (days 2, 5, 8...) until the next morning.
const merchantDue = (d = dayCount, c = clock) => (d % 3 === 2 && c >= 0.3) || (d % 3 === 0 && c < 0.3);
const MERCHANT_OFFING = 26 * TILE;
const merchant = { state: 'away', ship: null, npc: null, synced: false };

function initTrade() {
  merchant.npc = npcs.find((n) => n.look.id === 'merchant');
  merchant.ship = Object.assign(addAbs('merchantShip', MERCHANT_DOCK.x, MERCHANT_DOCK.y), { facing: 'up', dir: 'up', hidden: true });
  merchant.park = { x: merchant.npc.x, y: merchant.npc.y };
  renderPurse();
}

const merchantHere = () => merchant.state === 'docked';

function merchantAshore(on) {
  const n = merchant.npc;
  Object.assign(n, on ? MERCHANT_STAND_PX() : merchant.park);
  n.home = { x: n.x, y: n.y };
  n.origin = { ...n.home };
  if (!on && n.bubble) n.bubble.classList.remove('show');
}
const MERCHANT_STAND_PX = () => ({ x: MERCHANT_STAND.x * TILE, y: MERCHANT_STAND.y * TILE });

function setMerchant(state) {
  const o = merchant.ship;
  merchant.state = state;
  o.hidden = state === 'away';
  o.facing = o.dir = state === 'leaving' ? 'down' : 'up';
  if (state === 'away') o.y = MERCHANT_DOCK.y * TILE + MERCHANT_OFFING;
  if (state === 'docked') o.y = MERCHANT_DOCK.y * TILE;
  o.x = MERCHANT_DOCK.x * TILE;
  merchantAshore(state === 'docked');
}

// The first update after loading puts him wherever the calendar says, without the sailing in.
function updateMerchant(dt) {
  if (!started) return;
  const due = merchantDue();
  const o = merchant.ship;
  if (!merchant.synced) {
    merchant.synced = true;
    setMerchant(due ? 'docked' : 'away');
    return;
  }
  const dock = MERCHANT_DOCK.y * TILE;
  if (merchant.state === 'away' && due) {
    setMerchant('arriving');
    o.y = dock + MERCHANT_OFFING;
    toast('A SHIP!', 'The merchant Ottar is sailing into the bay');
    Sfx.horn(0.8);
  } else if (merchant.state === 'arriving') {
    const d = o.y - dock;
    o.y -= Math.max(10, Math.min(45, d * 0.8)) * dt;
    if (o.y <= dock + 0.5) setMerchant('docked');
  } else if (merchant.state === 'docked' && !due) {
    const n = merchant.npc;
    if (!tradeOpen && Math.hypot(player.x - n.x, player.y - n.y) > 140) {
      setMerchant('leaving');
      Sfx.horn(0.5 * earshot(o.x, o.y));
    }
  } else if (merchant.state === 'leaving') {
    o.y += Math.min(45, 10 + (o.y - dock) * 0.8) * dt;
    if (o.y >= dock + MERCHANT_OFFING) setMerchant('away');
  }
}

// Box of water the merchant's hull takes up, for the longship to bump into.
function merchantHull() {
  const o = merchant.ship;
  return o && !o.hidden ? shipBox(o.facing, o.x, o.y) : null;
}

const hullsMeet = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// When he'll next be in, for the villagers to mention.
function merchantNews() {
  if (merchantHere()) return 'Ottar\'s ship is in! He\'s on the beach past the longship, buying fish, wool and ore for good coin.';
  const left = (2 - (dayCount % 3) + 3) % 3;
  if (left === 0 && clock < 0.3) return 'Ottar the merchant docks this morning. Bring him fish and wool, he pays in coin!';
  if (left <= 1) return 'Ottar the merchant docks tomorrow morning. Bring him fish and wool, he pays in coin!';
  return `Ottar the merchant sails in every third day. Next time in ${left} days. Save up some fish for him!`;
}

// ---------- coins ----------

// A gold, silver and copper coin, each with its count; `small` for prices in the trade panel.
function coinsEl(c, small = false) {
  const el = Object.assign(document.createElement('span'), { className: small ? 'coins small' : 'coins' });
  const parts = coinParts(c);
  for (const p of small ? parts.filter((q, i) => q.n || (!c && i === 2)) : parts) {
    const img = icon(p.icon);
    img.style.width = `${SPR.icon[p.icon].width * 2}px`;
    el.append(img, Object.assign(document.createElement('b'), { textContent: p.n }));
  }
  return el;
}

function renderPurse() {
  purseEl.hidden = !coins && !stats.sold;
  purseEl.replaceChildren(coinsEl(coins));
  purseEl.setAttribute('aria-label', coinWords(coins));
}

function pay(c) {
  coins += c;
  renderPurse();
}

function applySail() {
  SPR.ship.dirs = upgrades.sail ? SPR.silkSail : SPR.plainSail;
}

const sailBoost = () => (upgrades.sail ? 1.3 : 1);

// ---------- the trade screen ----------

const tradeEl = document.getElementById('trade');
const tradeSell = document.getElementById('trade-sell');
const tradeBuy = document.getElementById('trade-buy');
const tradePurse = document.getElementById('trade-purse');
const tradeClose = document.getElementById('trade-close');
let tradeOpen = false;

function tradeTalk(n) {
  if (n.look.id !== 'merchant') return false;
  const goods = Object.keys(PRICES).some(has);
  npcSay(n, goods ? 'Ahh, a customer with goods! Let\'s see what you\'ve got.' : 'Welcome aboard! Fish, wool, iron, gold, I buy it all. Ten copper to the silver, ten silver to the gold. Have a look at my wares.');
  faceToward(n, player.x - n.x, player.y - n.y);
  toggleTrade(true);
  return true;
}

function icon(id) {
  const img = document.createElement('img');
  img.src = iconUrls[id] ||= SPR.icon[id].toDataURL();
  img.alt = '';
  img.style.width = `${SPR.icon[id].width * 3}px`;
  return img;
}

function tradeButton(label, aria, key, on, fn) {
  const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label, disabled: !on });
  b.setAttribute('aria-label', aria);
  b.dataset.key = key;
  b.addEventListener('click', fn);
  return b;
}

function renderTrade() {
  const focused = document.activeElement?.dataset?.key;
  tradePurse.replaceChildren(document.createTextNode('YOUR PURSE '), coinsEl(coins));
  const priceEl = (c, each) => {
    const el = Object.assign(document.createElement('span'), { className: 'price' });
    el.append(coinsEl(c, true));
    if (each) el.append(' EACH');
    return el;
  };
  const sell = Object.keys(PRICES).filter(has).map((id) => {
    const li = document.createElement('li');
    const k = bag[id];
    const name = ITEMS[id].name;
    li.append(icon(id), Object.assign(document.createElement('span'), { className: 'what', textContent: `${name} ×${k}` }), priceEl(PRICES[id], true));
    li.append(tradeButton('SELL 1', `Sell one ${name.toLowerCase()} for ${coinWords(PRICES[id])}`, `sell1-${id}`, true, () => sellItem(id, 1)));
    if (k > 1) li.append(tradeButton('ALL', `Sell all ${k} for ${coinWords(PRICES[id] * k)}`, `sellAll-${id}`, true, () => sellItem(id, k)));
    return li;
  });
  if (!sell.length) sell.push(Object.assign(document.createElement('li'), { className: 'none', textContent: 'Nothing he wants. He buys fish, meat, hides, wool, iron, gold, glowcaps and treasure.' }));
  tradeSell.replaceChildren(...sell);
  tradeBuy.replaceChildren(...WARES.map((w) => {
    const li = document.createElement('li');
    const owned = w.owned?.();
    const name = wareName(w);
    const what = Object.assign(document.createElement('span'), { className: 'what' });
    what.append(Object.assign(document.createElement('b'), { textContent: name }), Object.assign(document.createElement('small'), { textContent: w.text }));
    li.append(icon(w.id), what, owned ? Object.assign(document.createElement('span'), { className: 'price', textContent: 'OWNED' }) : priceEl(w.price));
    const room = w.n ? has(w.id) || !bagFull(w.id) : true;
    if (!owned) li.append(tradeButton('BUY', `Buy ${name.toLowerCase()} for ${coinWords(w.price)}`, `buy-${w.id}`, coins >= w.price && room, () => buyWare(w)));
    return li;
  }));
  const again = focused && tradeEl.querySelector(`[data-key="${focused}"]:not(:disabled)`);
  (again || tradeEl.querySelector('ul button:not(:disabled)') || tradeClose).focus();
}

function sellItem(id, k) {
  if ((bag[id] || 0) < k) return;
  bag[id] -= k;
  stats.sold += k;
  pay(PRICES[id] * k);
  renderInventory();
  Sfx.coin();
  if (id === 'goldenFish') npcSay(merchant.npc, 'A golden fish! By the gods, I\'ll hang it over my bunk!');
  renderTrade();
}

function buyWare(w) {
  if (coins < w.price || w.owned?.()) return;
  coins -= w.price;
  stats.bought++;
  if (w.id === 'lure' || w.id === 'sail') {
    upgrades[w.id] = true;
    if (w.id === 'sail') applySail();
    toast('UPGRADE', WARE_NAMES[w.id]);
  } else {
    give(w.id, w.n || 1);
    if (ITEMS[w.id].slots) toast('UPGRADE', `Backpack: ${packSize()} slots`);
  }
  renderPurse();
  Sfx.coin();
  Sfx.reward();
  npcSay(merchant.npc, {
    torch: 'One torch. Keep it out of the rain, friend.',
    arrow: 'Ten arrows, fresh from the fletchers of the south.',
    satchel: 'A good satchel, that. Southern leather, double stitched.',
    lure: 'The golden lure! The fish can\'t resist a bit of shine.',
    sail: 'Silk from the far east! I\'ll have it rigged by the time you reach your ship.',
  }[w.id]);
  renderTrade();
}

function toggleTrade(open = !tradeOpen) {
  if (open && (naming || mapOpen || journalOpen || fishLogOpen)) return;
  tradeOpen = open;
  tradeEl.hidden = !open;
  keys.clear();
  if (open) {
    Sfx.door();
    renderTrade();
  } else {
    npcSay(merchant.npc, 'Fair winds! Come back when your nets are full.');
  }
}

tradeClose.addEventListener('click', () => toggleTrade(false));
tradeEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  toggleTrade(false);
});
tradeEl.addEventListener('pointerdown', (e) => { if (e.target === tradeEl) toggleTrade(false); });
