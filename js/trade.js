// The travelling merchant: every third day his ship ties up in the bay and he buys what you've gathered for coin.

// All money is counted in copper: ten copper to the silver, ten silver to the gold.
let coins = 0;
const upgrades = { sail: false, bow: 0, tools: {} };
const purseEl = document.getElementById('purse');
const COIN_KINDS = [['goldCoin', 'gold', 100], ['silver', 'silver', 10], ['copper', 'copper', 1]];
const coinParts = (c) => COIN_KINDS.map(([icon, name, v]) => ({ icon, name, n: v === 100 ? Math.floor(c / v) : Math.floor(c / v) % 10 }));
function coinWords(c) {
  const words = coinParts(c).filter((p) => p.n).map((p) => `${p.n} ${p.name}`);
  return words.length ? words.join(', ').replace(/, ([^,]*)$/, ' and $1') : 'no money';
}

// What Ottar pays for one of each, in copper.
const PRICES = { fish: 8, mackerel: 20, pufferfish: 100, trout: 15, salmon: 40, cod: 30, cavefish: 40, eel: 50, anglerfish: 120, emberKoi: 120, crystalFish: 150, arcticChar: 30, frostPike: 90, glacierSturgeon: 300, goldenFish: 250, wool: 15, iron: 40, gold: 100, mushroom: 25, meat: 30, hide: 35, ruby: 150, emerald: 150, goblet: 250, crown: 600 };
const WARES = [
  { id: 'torch', price: 35, text: 'Burns six hours once lit. For caves and dark nights.' },
  { id: 'arrow', n: 10, price: 60, text: 'A bundle of ten arrows.' },
  { id: 'satchel', price: 250, text: 'Straps to your pack. Room for two more things.', owned: () => has('satchel') },
  { id: 'goldenLure', n: 3, price: 150, text: 'Three golden lures. Golden fish bite five times as often, and rare fish far oftener.' },
  { id: 'sail', price: 300, text: 'A silk sail. The longship runs a third faster.', owned: () => upgrades.sail },
];
const WARE_NAMES = { sail: 'Silk sail' };

// Each craftsperson's board: what they make and from what, and once the player has had any coin, for how much. The
// sign by their stall opens it (Space, or a click), and so does B beside them once there's coin.
const coinShown = () => coins > 0 || stats.sold > 0;
const shopWare = (id, price, text, more) => ({ id, price, text, owned: () => has(id), ...more });
const TIER_PRICE = { bow: [120, 250, 450], tool: [0, 200, 500] };
// One step up a tool: buyable once the tool (and the step before) is in hand.
function tierWare(id, tier) {
  const bow = id === 'bow';
  const was = tierName(id, tier - 1).toLowerCase();
  return {
    id, tier, name: tierName(id, tier),
    price: TIER_PRICE[bow ? 'bow' : 'tool'][tier],
    needs: RECIPES.find((r) => r.item === id && r.tier === tier).needs,
    text: bow ? `Shoots ${BOWS[tier].reach / BOWS[0].reach}x as far as a plain bow.` : `${TIER_NOTE[id]}. Works on the ${was} you have.`,
    owned: () => tierOf(id) >= tier,
    locked: () => (!has(id) ? `Needs a ${tierName(id, 0).toLowerCase()} first` : tierOf(id) < tier - 1 ? `Needs the ${was} first` : ''),
    buy: () => setTier(id, tier),
  };
}
const tierWares = (id) => [1, 2].map((t) => tierWare(id, t));
const LURE_WARE = (id, price) => ({ id, n: 3, price, text: `Three of them. ${LURES[id].note}` });

const SHOPS = {
  smith: {
    title: 'THE SMITHY', who: 'the smith', emblem: 'sword',
    wares: () => [
      shopWare('axe', 60, 'Fells trees and hacks through brambles.', { name: 'Axe' }),
      shopWare('pickaxe', 150, 'Breaks ore and boulders.', { name: 'Pickaxe' }),
      shopWare('bow', 120, 'Wood and string. Arrows from the archer.', { name: 'Bow' }),
      shopWare('spear', 150, 'Long and sharp, for the hunt.', { name: 'Spear' }),
      shopWare('shield', 180, 'Iron-rimmed. Raise it to block.'),
      shopWare('sword', 250, 'The finest blade this side of the sea.', { name: 'Sword' }),
      { id: 'torch', price: 40, text: 'Burns six hours once lit.' },
      { id: 'lightningRod', price: 100, text: 'An iron spike that draws the lightning down.' },
      ...tierWares('axe'), ...tierWares('pickaxe'), ...tierWares('sword'), ...tierWares('spear'),
    ],
    browse: 'Bring me the makings and I\'ll forge any of it. Already got a tool? Ask me to upgrade it.',
    hello: 'Coin, is it? Everything off my anvil is for sale.',
    sold: 'Fresh off the anvil. Use it well, {lad}.',
    bye: 'Mind the sparks on your way out.',
  },
  tanner: {
    title: 'THE TANNERY', who: 'the tanner', emblem: 'hide',
    wares: () => [
      shopWare('toolBelt', 200, 'Worn at the waist. Room for two more things.'),
      shopWare('pouch', 200, 'Worn on the belt. Room for two more things.'),
      { id: 'saddle', price: 300, text: 'Double stitched. Strap it on a grown dragon and ride.' },
      { id: 'tent', price: 400, text: 'Pitch it anywhere. Nap by day to wake at nightfall, by night to wake at dawn.' },
    ],
    browse: 'Hides make everything here. Bigger the beast, the more hide it gives.',
    hello: 'Buying, are we? Best leather on the island.',
    sold: 'Good leather, that. It\'ll outlast us both.',
    bye: 'Come back when you\'ve more coin. Or hides!',
  },
  seamstress: {
    title: 'THE SEAMSTRESS', who: 'the seamstress', emblem: 'furCoat',
    wares: () => [
      shopWare('furCoat', 300, 'Fur with a wool lining. Keeps the frozen isle\'s cold out.'),
      shopWare('fireJacket', 400, 'Fire eel skin. Walk the fire mountain without a scald.'),
    ],
    browse: 'Bring me the makings and I\'ll sew you something. Mind, fire eel skin isn\'t easy to come by!',
    hello: 'Something warm, or something fireproof? Have a look.',
    sold: 'There you are! Open your equipments and try it on.',
    bye: 'Wear it well!',
  },
  weaver: {
    title: 'THE WEAVER', who: 'the weaver', emblem: 'string',
    wares: () => [{ id: 'string', price: 12, text: 'Spun fine and strong. For bowstrings and rope.', needs: { wool: 1 } }],
    browse: 'Every bit of wool you bring, I\'ll spin into string. One for one.',
    hello: 'Need string, dear? I always keep a few lengths spare.',
    sold: 'There you are. Strong as a troll\'s beard.',
    bye: 'Bring me wool any time!',
  },
  baker: {
    title: 'THE BAKERY', who: 'the baker', emblem: 'bread', sells: true,
    wares: () => [
      { id: 'bread', price: 15, text: 'Dark and chewy. Eat it for a good long while of stamina.' },
      { id: 'honeyCake', price: 35, text: 'Sticky and sweet. Twice the bread\'s worth of stamina.' },
    ],
    browse: 'Fresh from the oven, for coin. Sell something to Ottar and come back hungry.',
    hello: 'Fresh this morning! What\'ll it be?',
    sold: 'Mind, it\'s still warm!',
    bye: 'Come back tomorrow, there\'s always more.',
  },
  carpenter: {
    title: 'THE CARPENTER', who: 'the carpenter', emblem: 'bow',
    wares: () => tierWares('bow'),
    browse: 'I make bows that shoot farther. Bring me your bow and the makings and I\'ll better it.',
    hello: 'Coin for a better bow? Fair enough.',
    sold: 'Feel that draw! Mind where you point it.',
    bye: 'Good hunting.',
  },
  fisher: {
    title: 'THE FISHING SHACK', who: 'the fisherman', emblem: 'fish', sells: true,
    wares: () => [
      shopWare('rod', 80, 'A good ash rod with a horsehair line.'),
      LURE_WARE('featherLure', 45), LURE_WARE('spinner', 90), LURE_WARE('glowLure', 180),
    ],
    browse: 'Lures for coin. One goes on the hook each cast, and it\'s spent once you land a fish.',
    hello: 'Lures! Feathers, spinners, glow lures. Pick your poison.',
    sold: 'Tight lines, {lad}! Choose your lure when you cast.',
    bye: 'May the fish be biting.',
  },
};
// The board that's open, or null while it's Ottar's; and its keeper when they're close enough to speak.
let shopKey = null;
let shopNpc = null;
const shopOf = () => SHOPS[shopKey];

function openBoard(key) {
  const n = npcs.find((q) => q.look.id === key);
  shopKey = key;
  shopNpc = n && sameSpace(n) && Math.hypot(n.x - player.x, n.y - player.y) < 140 ? n : null;
  toggleTrade(true);
  if (!tradeOpen) {
    shopKey = shopNpc = null;
    return;
  }
  if (!shopNpc) return;
  faceToward(shopNpc, player.x - shopNpc.x, player.y - shopNpc.y);
  npcSay(shopNpc, coinShown() ? shopOf().hello : shopOf().browse);
}
const wareName = (w) => w.name || (w.n > 1 ? `${w.n} ${ITEMS[w.id].plural}` : WARE_NAMES[w.id] || ITEMS[w.id].name);

// ---------- the shop signs ----------

const SIGN_REACH = 26;
let shopSigns = null;
const allSigns = () => (shopSigns ||= objects.filter((o) => o.key === 'shopSign'));

function nearSign() {
  if (indoors || flight || sail || hop) return null;
  let best = null;
  let bd = SIGN_REACH;
  for (const o of allSigns()) {
    const d = Math.hypot(o.x - player.x, o.y - player.y);
    if (d < bd) [best, bd] = [o, d];
  }
  return best;
}

// Space reads the sign unless its keeper is the nearer one to talk to.
function signFirst() {
  const o = nearSign();
  const n = o && nearNpc();
  return !!o && (!n || Math.hypot(o.x - player.x, o.y - player.y) < Math.hypot(n.x - player.x, n.y - player.y));
}

// The sign under a click on the world, if any.
function signAt(x, y) {
  if (indoors) return null;
  const s = SPR.shopSign;
  return allSigns().find((o) => x >= o.x - s.ox && x < o.x - s.ox + s.img.width && y >= o.y - s.oy - 1 && y <= o.y + 2) || null;
}

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
const tradeTitle = document.getElementById('trade-title');
const tradeCols = tradeEl.querySelector('.trade-cols');
const tradeSell = document.getElementById('trade-sell');
const tradeBuy = document.getElementById('trade-buy');
const tradeBuyTitle = document.getElementById('trade-buy-title');
const tradeHint = document.getElementById('trade-hint');
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
  const shop = shopOf();
  tradeTitle.textContent = shop ? shop.title : 'OTTAR\'S SHIP';
  tradeSell.closest('section').hidden = !!shop;
  tradeCols.classList.toggle('solo', !!shop);
  tradePurse.hidden = !!shop && !coinShown();
  tradePurse.replaceChildren(document.createTextNode('YOUR PURSE '), coinsEl(coins));
  tradeBuyTitle.textContent = !shop ? 'BUY' : shop.sells ? 'FOR SALE' : coinShown() ? 'MADE HERE   ·   OR BUY FOR COIN' : 'MADE HERE';
  tradeHint.hidden = !shop;
  const earn = 'Sell your catch to the merchant Ottar for coin to buy things here.';
  if (shop) tradeHint.textContent = shop.sells ? (coinShown() ? '' : earn)
    : `Bring the makings and ask ${shop.who} to make it${coinShown() ? ', or buy it outright.' : `. ${earn}`}`;
  tradeHint.hidden ||= !tradeHint.textContent;
  const priceEl = (c, each) => {
    const el = Object.assign(document.createElement('span'), { className: 'price' });
    el.append(coinsEl(c, true));
    if (each) el.append(' EACH');
    return el;
  };
  const sell = shop ? [] : Object.keys(PRICES).filter(has).map((id) => {
    const li = document.createElement('li');
    const k = bag[id];
    const name = ITEMS[id].name;
    li.append(icon(id), Object.assign(document.createElement('span'), { className: 'what', textContent: `${name} ×${k}` }), priceEl(PRICES[id], true));
    li.append(tradeButton('SELL 1', `Sell one ${name.toLowerCase()} for ${coinWords(PRICES[id])}`, `sell1-${id}`, true, () => sellItem(id, 1)));
    if (k > 1) li.append(tradeButton('ALL', `Sell all ${k} for ${coinWords(PRICES[id] * k)}`, `sellAll-${id}`, true, () => sellItem(id, k)));
    return li;
  });
  if (!sell.length && !shop) sell.push(Object.assign(document.createElement('li'), { className: 'none', textContent: 'Nothing he wants. He buys fish, meat, hides, wool, iron, gold, glowcaps and treasure.' }));
  tradeSell.replaceChildren(...sell);
  tradeBuy.replaceChildren(...(shop ? shop.wares() : WARES).map((w) => {
    const li = document.createElement('li');
    const owned = w.owned?.();
    const locked = !owned && w.locked?.();
    const name = wareName(w);
    const what = Object.assign(document.createElement('span'), { className: 'what' });
    what.append(Object.assign(document.createElement('b'), { textContent: name }), Object.assign(document.createElement('small'), { textContent: w.text }));
    if (shop && !owned && !shop.sells) what.append(makingsEl(w, shop));
    if (locked) what.append(Object.assign(document.createElement('small'), { className: 'lock', textContent: locked }));
    li.classList.toggle('owned', !!owned);
    li.append(Object.assign(document.createElement('span'), { className: 'ware-icon' }), what);
    li.firstChild.append(iconImg(w.id));
    if (owned) li.append(Object.assign(document.createElement('span'), { className: 'price', textContent: 'OWNED' }));
    else if (!shop || coinShown()) {
      li.append(priceEl(w.price));
      const room = !bagFull(w.id);
      li.append(tradeButton('BUY', `Buy ${name.toLowerCase()} for ${coinWords(w.price)}`, `buy-${w.id}-${w.tier || 0}`, coins >= w.price && room && !locked, () => buyWare(w)));
    }
    return li;
  }));
  const again = focused && tradeEl.querySelector(`[data-key="${focused}"]:not(:disabled)`);
  (again || tradeEl.querySelector('ul button:not(:disabled)') || tradeClose).focus();
}

// What a board's ware is made from, with how much of each the player has; coin-only wares say so.
function wareNeeds(w) {
  return w.needs || (w.tier ? null : RECIPES.find((r) => r.item === w.id && !r.tier)?.needs);
}

function makingsEl(w, shop) {
  const needs = wareNeeds(w);
  const el = Object.assign(document.createElement('small'), { className: 'makings' });
  if (!needs) {
    const free = !w.tier && RECIPES.some((r) => r.item === w.id && !r.tier);
    el.textContent = free ? `Free! Just ask ${shop.who}.` : 'Sold for coin only';
    return el;
  }
  const ready = Object.entries(needs).every(([id, n]) => (bag[id] || 0) >= n);
  el.append('MAKINGS ');
  for (const [id, n] of Object.entries(needs)) {
    const have = Math.min(bag[id] || 0, n);
    const chip = Object.assign(document.createElement('span'), { className: have >= n ? 'need got' : 'need' });
    chip.append(iconImg(id, 1), `${ITEMS[id].name} ${have}/${n}`);
    chip.setAttribute('aria-label', `${ITEMS[id].name}, ${have} of ${n}`);
    el.append(chip);
  }
  if (ready && !w.locked?.()) el.append(Object.assign(document.createElement('em'), { textContent: `Ready! Ask ${shop.who}.` }));
  return el;
}

function sellItem(id, k) {
  if ((bag[id] || 0) < k) return;
  bag[id] -= k;
  stats.sold += k;
  pay(PRICES[id] * k);
  renderInventory();
  Sfx.coin();
  if (id === 'goldenFish') npcSay(merchant.npc, 'A golden fish! By the gods, I\'ll hang it over my bunk!');
  if (id === 'glacierSturgeon') npcSay(merchant.npc, 'The glacier sturgeon?! I\'ll need a bigger bunk. Sailors will come from every isle to see it!');
  renderTrade();
}

function buyWare(w) {
  if (coins < w.price || w.owned?.() || w.locked?.()) return;
  coins -= w.price;
  stats.bought++;
  if (w.buy) w.buy();
  else if (w.id === 'sail') {
    upgrades.sail = true;
    applySail();
    toast('UPGRADE', WARE_NAMES[w.id]);
  } else {
    give(w.id, w.n || 1);
    if (ITEMS[w.id].slots) toast('UPGRADE', `Backpack: ${packSize()} slots`);
  }
  renderPurse();
  Sfx.coin();
  Sfx.reward();
  if (shopOf()) {
    if (shopNpc) npcSay(shopNpc, shopOf().sold);
  } else npcSay(merchant.npc, {
    torch: 'One torch. Keep it out of the rain, friend.',
    arrow: 'Ten arrows, fresh from the fletchers of the south.',
    satchel: 'A good satchel, that. Southern leather, double stitched.',
    goldenLure: 'Golden lures! The fish can\'t resist a bit of shine.',
    sail: 'Silk from the far east! I\'ll have it rigged by the time you reach your ship.',
  }[w.id]);
  renderTrade();
}

function toggleTrade(open = !tradeOpen) {
  if (open && (naming || mapOpen || journalOpen || fishLogOpen || dragonLogOpen)) return;
  tradeOpen = open;
  tradeEl.hidden = !open;
  keys.clear();
  if (open) {
    Sfx.door();
    renderTrade();
  } else {
    if (!shopOf()) npcSay(merchant.npc, 'Fair winds! Come back when your nets are full.');
    else if (shopNpc) npcSay(shopNpc, shopOf().bye);
    shopKey = shopNpc = null;
  }
}

tradeClose.addEventListener('click', () => toggleTrade(false));
tradeEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' && !(e.code === 'KeyB' && shopKey)) return;
  e.preventDefault();
  e.stopPropagation();
  toggleTrade(false);
});
tradeEl.addEventListener('pointerdown', (e) => { if (e.target === tradeEl) toggleTrade(false); });
