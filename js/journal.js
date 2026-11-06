// The quest journal: each quest shows up once the player hears of it, and ticks off its steps as they happen.
// Starts and steps are worked out from the game itself, then remembered so they stay ticked.

const journal = { started: {}, done: {} };
const npcBy = (id) => npcs.find((n) => n.look.id === id);
const eggPast = (stage) => STAGES.indexOf(eggStage) >= STAGES.indexOf(stage);

// `text` may be a function, for steps that count something.
const QUESTS = [
  {
    id: 'backpack', title: 'Off You Go', start: () => true,
    steps: [{ id: 'backpack', text: 'Pick up your backpack at home', done: () => has('backpack') }],
  },
  {
    id: 'axe', title: 'Every Viking Needs an Axe', start: () => has('backpack'),
    steps: [{ id: 'axe', text: 'Visit the smith at the forge', done: () => has('axe') }],
  },
  {
    id: 'map', title: 'The Old Sea Map', start: () => npcBy('chief').tipTold > 0 || hasMap(),
    steps: [{ id: 'map', text: 'Take the map from the wall of the great hall', done: hasMap }],
  },
  {
    id: 'sheep', title: 'Runaway Sheep', start: () => flockAsked || flockDone,
    steps: [{ id: 'sheep', text: () => `Herd the sheep back into the pen (${sheep.filter(inPen).length}/${sheep.length})`, done: () => flockDone }],
  },
  {
    id: 'dog', title: 'Where\'s Fred?', start: () => dog.asked || dog.state !== 'lost',
    steps: [
      { id: 'dogFound', text: 'Find Fred in the forest past the west gate', done: () => dog.state !== 'lost' },
      { id: 'dogHome', text: 'Carry him home to the girl in the village', done: () => dog.state === 'home' },
    ],
  },
  {
    id: 'iron', title: 'Iron from the Fire Mountain', start: () => dog.state === 'home' || has('iron') || has('pickaxe'),
    steps: [
      { id: 'pickaxe', text: 'Ask the smith for a pickaxe (2 wood, 1 iron)', done: () => has('pickaxe') },
      { id: 'ironJacket', text: 'Ask the seamstress for a fireproof jacket (2 fire eels, 2 wool). The volcano is too hot without one', done: () => has('fireJacket') || stats.ore > 0 },
      { id: 'ore', text: 'Mine iron ore on the volcano isle', done: () => stats.ore > 0 },
    ],
  },
  {
    id: 'bow', title: 'A Bow of Your Own', start: () => npcBy('archer').tipTold > 0 || npcBy('weaver').tipTold > 0 || has('string') || has('bow'),
    steps: [
      { id: 'string', text: 'Bring wool to the weaver to spin into string', done: () => has('string') || has('bow') },
      { id: 'bow', text: 'Ask the smith for a bow (1 wood, 1 string)', done: () => has('bow') },
    ],
  },
  {
    id: 'egg', title: 'The Dragon Egg', start: () => eggPast('carried') || POIS.find((p) => p.id === 'ruin').learned,
    steps: [
      { id: 'reach', text: 'Find a way through the reefs to the ancient ruin', done: () => eggPast('carried') || stats.ruinLanded > 0 },
      { id: 'stones', text: () => `At night, touch all nine rune stones in order. The walls show the start; the sailor's note in a skerry chest has the rest${ruinEgg && ruin.step && !ruin.solved ? ` (${ruin.step}/${RUIN_ORDER.length})` : ''}`, done: () => eggPast('carried') || ruin.solved },
      { id: 'egg', text: 'Take the dragon egg', done: () => eggPast('carried') },
      { id: 'eggJacket', text: 'Get a fireproof jacket from the seamstress (2 fire eels, 2 wool) and put it on', done: () => outfit === 'fireJacket' || eggPast('warming') },
      { id: 'hatch', text: 'Climb up through the cave at the foot of the fire mountain and throw the egg into the lava pool at the top, or drop it into the crater from dragonback', done: () => eggPast('hatched') },
      { id: 'grow', text: 'Feed your dragon fish till it\'s grown: fish from the longship, or put a fish down and tell it to eat', done: () => eggPast('grown') },
    ],
  },
  {
    id: 'saddle', title: 'Saddle Up', start: () => eggPast('grown'),
    steps: [
      { id: 'made', text: 'Bring the tanner 3 hides and ask for a saddle', done: () => has('saddle') || dragons.some((d) => d.saddled) },
      { id: 'on', text: 'Stand by your grown dragon, open your bag (B) and strap the saddle on', done: () => dragons.some((d) => d.saddled) },
      { id: 'fly', text: 'Climb on with SPACE and take to the skies', done: () => stats.flown > 0 },
    ],
  },
  {
    id: 'roost', title: 'A Roost for Dragons', start: () => roost.asked,
    steps: [
      { id: 'clear', text: () => `Fell the pines between the hermit's stakes (${siteTrees.length - treesLeft()}/${siteTrees.length})`, done: () => roost.built || !treesLeft() },
      { id: 'build', text: `Bring ${ROOST_WOOD} wood and build the roost between the stakes`, done: () => roost.built },
      { id: 'leave', text: 'Bring two grown dragons and tell them to stay at the roost', done: () => roost.bred.length > 0 || roosting().length >= 2 },
      { id: 'laid', text: `Wait ${ROOST_DAYS} days for an egg to turn up in the nest`, done: () => roost.bred.length > 0 },
      { id: 'newKind', text: 'Hatch it in the volcano: a kind of dragon never seen before', done: () => dragons.some((d) => d.species.startsWith('bred')) },
    ],
  },
  {
    id: 'nursery', title: 'A Nursery for Hatchlings', start: () => nursery.asked,
    steps: [
      { id: 'nurseryClear', text: () => `Fell the trees between the stakes west of the hermit's hut (${nurseryTrees.length - nurseryTreesLeft()}/${nurseryTrees.length})`, done: () => nursery.built || !nurseryTreesLeft() },
      { id: 'nurseryBuild', text: `Bring ${NURSERY_WOOD} wood and build the nursery between the stakes`, done: () => nursery.built },
      { id: 'nurseryLeave', text: 'Bring a baby dragon and tell it to stay at the nursery', done: () => nursery.raised > 0 || dragons.some((d) => d.nursery) },
      { id: 'nurseryRaised', text: `Let it grow up there, a size every ${NURSERY_DAYS} days`, done: () => nursery.raised > 0 },
    ],
  },
  {
    id: 'cook', title: 'A Hot Meal', start: () => npcBy('baker').tipTold > 0 || stats.cooked > 0,
    steps: [
      { id: 'cooked', text: 'Grill a fish or bake an apple over a fire', done: () => stats.cooked > 0 },
      { id: 'ate', text: 'Eat it while it\'s hot', done: () => stats.ate > 0 },
    ],
  },
  {
    id: 'hunt', title: 'The Hunt', start: () => has('bow') || has('spear') || stats.hunted > 0,
    steps: [
      { id: 'hunted', text: 'Hunt a rabbit, deer or boar for meat. Deer graze in the western forest', done: () => stats.hunted > 0 },
      { id: 'roasted', text: 'Roast the meat over a fire', done: () => stats.roasted > 0 },
      { id: 'boar', text: 'Bring down a wild boar. Raise a shield as it charges and it bounces off!', done: () => stats.boar > 0 },
    ],
  },
  {
    id: 'fishlog', title: 'Fill the Fish Log', start: () => has('fishLog'),
    steps: [{ id: 'fishlog', text: () => `Catch every kind of fish (${kindsCaught()}/${FISH_IDS.length}). Press L to read the log`, done: () => kindsCaught() >= FISH_IDS.length }],
  },
  {
    id: 'trade', title: 'The Travelling Merchant', start: () => merchant.state !== 'away' || stats.sold > 0,
    steps: [
      { id: 'sold', text: () => `Sell something to Ottar${merchantHere() ? ', on the beach by his ship' : ' (his ship docks every third day)'}`, done: () => stats.sold > 0 },
      { id: 'bought', text: 'Buy something with your coins', done: () => stats.bought > 0 },
    ],
  },
  {
    id: 'fletch', title: 'Feathers and Fletching', start: () => archery.intro || has('feather'),
    steps: [
      { id: 'feather', text: 'Chase a hen in the farmyard until she drops a feather', done: () => has('feather') || stats.fletched > 0 },
      { id: 'fletch', text: 'Ask the archer for arrows (1 wood, 1 stone, 1 feather)', done: () => stats.fletched > 0 },
    ],
  },
  {
    id: 'archery', title: 'The Archer\'s Challenges', start: () => archery.active || archery.stage > 0,
    steps: CHALLENGES.map((c, i) => ({
      id: `archery${i}`, text: () => `${c.title}${archery.active && archery.stage === i && c.progress ? c.progress() : ''}`, done: () => archery.stage > i,
    })),
  },
  {
    id: 'cave', title: 'The Ice Cave', start: () => POIS.find((p) => p.id === 'cave').learned || stats.caves > 0,
    steps: [
      { id: 'coat', text: 'Get a thick fur coat from the seamstress (4 hides, 2 wool). The frozen isle is too cold without one', done: () => has('furCoat') || stats.caves > 0 },
      { id: 'torch', text: 'Get a torch: the smith makes one from 1 wood and 1 wool. Ready it and press F to light it', done: () => has('torch') || stats.caves > 0 },
      { id: 'iceMelted', text: 'Melt a way through the ring of ice round the cave mouth', done: () => iceRing.some((o) => o.hidden) || stats.caves > 0 },
      { id: 'caveFound', text: 'Go inside the ice cave on the frozen isle', done: () => stats.caves > 0 },
      { id: 'caveEnd', text: 'Find what waits at the far end of the cave', done: () => eggs.find((e) => e.species === 'lightFury').state !== 'wild' },
    ],
  },
  {
    id: 'sphinx', title: 'The Sphinx\'s Riddles', start: () => POIS.find((p) => p.id === 'speck').learned || sphinx.met,
    steps: [
      { id: 'sphinxMet', text: 'Find the sphinx on the dune isle, far to the south', done: () => sphinx.met },
      { id: 'riddles', text: () => `Answer its three riddles. Press ENTER to speak (${sphinx.step}/3)`, done: () => sphinx.solved },
      { id: 'sandEgg', text: 'Find the dragon egg in the sand cave', done: () => eggs.find((e) => e.species === 'terribleTerror').state !== 'wild' },
    ],
  },
  {
    id: 'tinker', title: 'Tinkering', start: () => tinker.told || tinker.known.size > 0,
    steps: [
      { id: 'tinkerFirst', text: 'Press C and put things together to discover something new', done: () => tinker.known.size > 0 },
      { id: 'tinkerAll', text: () => `Discover everything there is to make (${tinker.known.size}/${TINKER.length}). Ask villagers how`, done: () => tinker.known.size >= TINKER.length },
    ],
  },
  {
    id: 'hawk', title: 'Old Bjorn\'s Cache', start: () => POIS.find((p) => p.id === 'hawk').learned || stats.hawkTop > 0,
    steps: [
      { id: 'hawkTop', text: 'Get up the cliffs of Hawk Rock, out to the west', done: () => stats.hawkTop > 0 },
      { id: 'hawkAcross', text: 'Find a way across the rapids', done: () => stats.hawkAcross > 0 },
      { id: 'hawkCache', text: 'Get through to the cairn and open Old Bjorn\'s cache', done: () => hawk.opened },
    ],
  },
];

const questDone = (q) => q.steps.every((s) => journal.done[s.id]);
const stepText = (s) => (typeof s.text === 'function' ? s.text() : s.text);

let journalT = 0;

function updateJournal(dt) {
  if (!started || (journalT -= dt) > 0) return;
  journalT = 0.5;
  for (const q of QUESTS) {
    if (!journal.started[q.id]) {
      if (!q.start()) continue;
      journal.started[q.id] = true;
      toast('NEW QUEST', q.title);
    }
    const was = questDone(q);
    for (const s of q.steps) if (!journal.done[s.id] && s.done()) journal.done[s.id] = true;
    if (!was && questDone(q)) toast('QUEST COMPLETE', q.title);
  }
  if (journalOpen) renderJournal();
}

// ---------- toasts ----------

const toastEl = document.getElementById('toast');
const toasts = [];
let toastTimer = null;

function toast(kind, text) {
  toasts.push([kind, text]);
  if (!toastTimer) nextToast();
  if (has('backpack')) flashJournalButton();
}

function nextToast() {
  const t = toasts.shift();
  toastEl.classList.toggle('show', !!t);
  if (!t) {
    toastTimer = null;
    return;
  }
  toastEl.replaceChildren(Object.assign(document.createElement('small'), { textContent: t[0] }), document.createTextNode(t[1]));
  toastTimer = setTimeout(nextToast, 3200);
}

// ---------- the journal screen ----------

const journalBtn = document.getElementById('journal-btn');
const journalEl = document.getElementById('journal');
const journalWhen = document.getElementById('journal-when');
const journalList = document.getElementById('journal-list');
const journalClose = document.getElementById('journal-close');
let journalOpen = false;

function flashJournalButton() {
  journalBtn.classList.remove('bump');
  void journalBtn.offsetWidth;
  journalBtn.classList.add('bump');
}

function weatherName() {
  if (snowy && precipitation() > 0.05) return 'Snow';
  return WEATHER[weather.level > 0.4 ? weather.kind : weather.want === weather.kind ? weather.kind : 'clear'].name;
}

// Quests in progress come first, each with its finished steps ticked and only the next one still to do.
function renderJournal() {
  const d = dateOf();
  journalWhen.textContent = `DAY ${dayCount}  ·  ${d.month.toUpperCase()} ${d.day}, ${d.season.name.toUpperCase()}  ·  ${timeOfDay().toUpperCase()}  ·  ${weatherName().toUpperCase()}`;
  const open = QUESTS.filter((q) => journal.started[q.id] && !questDone(q));
  const done = QUESTS.filter((q) => journal.started[q.id] && questDone(q));
  const items = [];
  for (const q of open) {
    const li = document.createElement('li');
    li.className = 'quest';
    li.append(Object.assign(document.createElement('h3'), { textContent: q.title }));
    const steps = document.createElement('ul');
    for (const s of q.steps) {
      const fin = !!journal.done[s.id];
      const step = document.createElement('li');
      step.className = fin ? 'step done' : 'step';
      step.textContent = stepText(s);
      if (fin) step.prepend(Object.assign(document.createElement('span'), { className: 'sr', textContent: 'Done: ' }));
      steps.append(step);
      if (!fin) break;
    }
    li.append(steps);
    items.push(li);
  }
  if (!open.length) items.push(Object.assign(document.createElement('li'), { className: 'quest empty', textContent: 'Nothing to do right now. Go and explore, or talk to the villagers!' }));
  if (done.length) {
    const li = document.createElement('li');
    li.className = 'quest finished';
    li.append(Object.assign(document.createElement('h3'), { textContent: `COMPLETED (${done.length})` }));
    const list = document.createElement('ul');
    for (const q of done) list.append(Object.assign(document.createElement('li'), { className: 'step done', textContent: q.title }));
    li.append(list);
    items.push(li);
  }
  journalList.replaceChildren(...items);
}

function toggleJournal(open = !journalOpen) {
  if (open && (!has('backpack') || naming || mapOpen)) return;
  journalOpen = open;
  journalEl.hidden = !open;
  journalBtn.setAttribute('aria-expanded', String(open));
  keys.clear();
  if (open) {
    Sfx.door();
    renderJournal();
    journalClose.focus();
  } else {
    journalBtn.blur();
  }
}

journalBtn.addEventListener('click', () => toggleJournal());
journalClose.addEventListener('click', () => toggleJournal(false));
journalEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' && e.code !== 'KeyJ') return;
  e.preventDefault();
  e.stopPropagation();
  toggleJournal(false);
});
journalEl.addEventListener('pointerdown', (e) => { if (e.target === journalEl) toggleJournal(false); });
