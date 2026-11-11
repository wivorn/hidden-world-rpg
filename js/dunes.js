// The dune isle: a sphinx lies across the door of the sand cave and lets nobody by who can't answer its three riddles.
// Behind it lies a hoard of silver, gold and jewels, and a terrible terror's egg on the dais at the very back.

const RIDDLES = [
  {
    ask: 'First riddle: what walks on four legs in the morning, two legs at noon, and three legs in the evening?',
    answer: /\b(wo)?m[ae]n\b|\bhumans?\b|\bhuman ?beings?\b|\bpersons?\b|\bpeople\b|\bmankind\b|\bhumanity\b/i,
    hint: 'Think of a whole life. A baby crawls, a grown-up walks... and the old lean on a stick.',
  },
  {
    ask: 'Second riddle: I have cities, but no houses. Forests, but no trees. Seas, but no water. What am I?',
    answer: /\b(maps?|charts?|atlas(es)?|globes?)\b/i,
    hint: 'No sailor leaves harbour without me. Press M, little sailor.',
  },
  {
    ask: 'Last riddle: what must be broken before it can be used?',
    answer: /\beggs?\b/i,
    hint: 'Every dragon begins inside one.',
  },
];
const RIGHT = ['Correct.', 'Correct again. You are cleverer than you look.'];

// Once the way is open the sphinx will set more riddles, a gold coin for each one answered; each is only asked once.
const BONUS_RIDDLES = [
  { ask: 'The more of me you take, the more you leave behind. What am I?', answer: /\b(foot ?steps?|foot ?prints?|steps?|tracks?)\b/i, hint: 'Look behind you as you walk across the sand.' },
  { ask: 'I have a head and a tail, but no body. What am I?', answer: /\b(coins?|penn(y|ies))\b/i, hint: 'Answer rightly and I shall give you one.' },
  { ask: 'I am always hungry and must be fed. The finger I touch soon turns red. What am I?', answer: /\b(fire|flames?|blaze|embers?)\b/i, hint: 'Your dragon breathes me.' },
  { ask: 'I have an eye, but I cannot see. What am I?', answer: /\b(needles?|storms?|hurricanes?|potato(es)?)\b/i, hint: 'The seamstress pushes her thread through mine.' },
  { ask: 'The more of me there is, the less you see. What am I?', answer: /\b(dark(ness)?|night|fog|mist|shadows?)\b/i, hint: 'I fall each evening when the sun goes down.' },
  { ask: 'I run but never walk. I have a mouth but never talk, a bed but never sleep. What am I?', answer: /\b(rivers?|streams?|brooks?|creeks?)\b/i, hint: 'I flow down from the hills to the sea.' },
  { ask: 'I fly without wings and cry without eyes. Wherever I go, the light fades. What am I?', answer: /\b(clouds?|storm ?clouds?|rain ?clouds?)\b/i, hint: 'Look up when the rain comes.' },
  { ask: 'What gets wetter the more it dries?', answer: /\b(towels?|cloths?|rags?)\b/i, hint: 'You reach for me after a swim.' },
  { ask: 'I have many teeth, yet I cannot bite. What am I?', answer: /\b(combs?|saws?|rakes?|zips?|zippers?|gears?|cogs?)\b/i, hint: 'Run me through your hair.' },
  { ask: 'I am lighter than a feather, yet the strongest man cannot hold me for long. What am I?', answer: /\b(breath(e|s)?|air)\b/i, hint: 'Try holding me under the water.' },
  { ask: 'My roots are hidden and I am taller than the trees. Up and up I go, and yet I never grow. What am I?', answer: /\b(mountains?|mount|peaks?|hills?)\b/i, hint: 'The goats climb me, and snow sits on my top.' },
  { ask: 'What comes once in a minute, twice in a moment, and never in a thousand years?', answer: /^\W*(the\s+)?(letter\s+)?m\W*$|\bletter m\b|\bthe m\b/i, hint: 'Do not count the years. Spell the words.' },
  { ask: 'It belongs to you, yet others use it far more than you do. What is it?', answer: /\bnames?\b/i, hint: 'Your mother calls you by it.' },
  { ask: 'What can you catch, but never throw?', answer: /\b(a )?(cold|chill|cough|sneeze|flu|fever)\b/i, hint: 'Swim in the frozen sea too long and you will catch me.' },
  { ask: 'What goes up and up, and never comes down?', answer: /\b(age|years?|birthdays?)\b/i, hint: 'Every winter you live adds to it.' },
  { ask: 'I am tall when I am young and short when I am old. What am I?', answer: /\b(candles?|tapers?)\b/i, hint: 'I light the longhouse and melt away as I do.' },
  { ask: 'I speak without a mouth and hear without ears. I have no body, but I come alive in the hills. What am I?', answer: /\bechoe?s?\b/i, hint: 'Shout into a cave and I shall answer back.' },
  { ask: 'I have a ring, but no finger. Strike me and I sing. What am I?', answer: /\bbells?\b/i, hint: 'I hang in a tower and call the village together.' },
  { ask: 'I am so fragile that saying my name breaks me. What am I?', answer: /\b(silence|silent|quiet|hush)\b/i, hint: 'Hush... listen. Now speak, and I am gone.' },
  { ask: 'I have bark, but I never bite. I have rings, but no fingers. What am I?', answer: /\b(trees?|oaks?|pines?|birch(es)?)\b/i, hint: 'Swing your axe at me for wood.' },
];
const RIDDLE_GOLD = 100;

const SPHINX_ASIDE = 64;
const SPHINX_VOICE = 90;
const sphinx = { met: false, step: 0, misses: 0, solved: false, asking: false, bonus: [], extra: -1 };
const riddleNow = () => (sphinx.solved ? BONUS_RIDDLES[sphinx.extra] : RIDDLES[sphinx.step]);
let sphinxObj = null;
let sphinxHome = 0;
let sphinxBubble = null;
let sphinxTalkT = 0;
let sphinxMove = null;
let sphinxQueue = [];

// What each kind of treasure gives up; `o.loot` is what a chest holds.
const HOARD = {
  coinPile: {
    prompt: 'SPACE  Scoop up the silver coins',
    take(o) {
      o.hidden = true;
      pay(50);
      Sfx.coin();
      popIcon('silver', o.x, o.y - 10);
    },
  },
  goldHeap: {
    prompt: 'SPACE  Gather up the gold',
    take(o) {
      o.hidden = true;
      Sfx.coin();
      for (let i = 0; i < 3; i++) spawnDrop('gold', o.x + (i - 1) * 9, o.y + 4, (i - 1) * 24, 6, 60);
    },
  },
  hoardChest: {
    prompt: 'SPACE  Open the treasure chest',
    take(o) {
      o.key = 'hoardChestOpen';
      Sfx.reward();
      const n = o.loot.length;
      o.loot.forEach((id, i) => spawnDrop(id, o.x + (i - (n - 1) / 2) * 10, o.y + 6, (i - (n - 1) / 2) * 26, 8, 70));
      dropSkerryPaper(o, 90);
      for (let i = 0; i < 10; i++) particles.push({ type: 'sparkle', x: o.x + (Math.random() - 0.5) * 16, y: o.y - 8 - Math.random() * 10, vx: 0, vy: -12, life: 0, max: 0.8 });
    },
  },
};
let hoard = [];

function initDunes() {
  sphinxObj = objects.find((o) => o.key === 'sphinx');
  sphinxHome = sphinxObj.x;
  hoard = objects.filter((o) => HOARD[o.key]);
  for (const o of hoard) o.kind = o.key;
  sphinxBubble = document.createElement('div');
  sphinxBubble.className = 'bubble';
  bubbleLayer.appendChild(sphinxBubble);
}

function sphinxSay(text) {
  sphinxBubble.textContent = text;
  sphinxBubble.classList.add('show');
  sphinxTalkT = 3 + text.length * 0.06;
  Sfx.babble(SPHINX_VOICE, text, earshot(sphinxObj.x, sphinxObj.y));
}

const later = (t, fn) => sphinxQueue.push({ t, fn });

// Its eyes burn gold while it speaks.
function drawSphinxEyes(g, x, y) {
  if (sphinxTalkT <= 0) return;
  const k = Math.min(1, sphinxTalkT * 2);
  g.globalAlpha = k * (0.75 + 0.25 * Math.sin(time * 8));
  rect(g, Math.round(x) - 4, Math.round(y) - 30, 3, 1, '#ffd76a');
  rect(g, Math.round(x) + 1, Math.round(y) - 30, 3, 1, '#ffd76a');
  g.globalAlpha = 1;
}

function nearSphinx() {
  if (!sphinxObj || indoors || sail || flight || hop || !grounded() || sphinxMove) return false;
  return boxDist(sphinxObj.col) < 18;
}

const sphinxPrompt = () => {
  if (sphinx.asking) return 'ENTER  Answer the riddle   ·   SPACE  Hear it again';
  const more = sphinx.solved && sphinxObj.x !== sphinxHome && sphinx.bonus.length < BONUS_RIDDLES.length;
  return more ? 'SPACE  Ask the sphinx for a riddle' : 'SPACE  Speak to the sphinx';
};

function speakToSphinx() {
  faceToward(player, sphinxObj.x - player.x, sphinxObj.y - player.y);
  if (sphinx.solved && sphinxObj.x === sphinxHome) {
    sphinxSay('The treasure of the sands is yours, wise one. Enter.');
    if (!sphinxQueue.length) later(2.5, slideAside);
    return;
  }
  if (sphinx.solved) {
    if (sphinx.asking) return askRiddle();
    sphinxQueue = [];
    if (!nextBonus()) {
      sphinxSay('I have no riddles left, wise one. You have answered every one. Go, and spend my gold well.');
      return;
    }
    sphinxSay(sphinx.bonus.length ? 'Another riddle? Very well. A gold coin if you answer rightly.' : 'You hunger for more? Then answer my riddles, and I shall pay you a gold coin for each.');
    later(3.5, askRiddle);
    return;
  }
  sphinxQueue = [];
  if (!sphinx.met) {
    sphinx.met = true;
    sphinxSay('HALT, traveller. None may pass into my cave unless they answer my three riddles. Speak your answers aloud.');
    later(5, askRiddle);
    return;
  }
  askRiddle();
}

function askRiddle() {
  sphinx.asking = true;
  sphinxSay(riddleNow().ask);
}

// Picks a bonus riddle not yet answered, other than the one just set if there's a choice; false when none are left.
function nextBonus() {
  const left = BONUS_RIDDLES.map((_, i) => i).filter((i) => !sphinx.bonus.includes(i));
  if (!left.length) return false;
  const pool = left.length > 1 ? left.filter((i) => i !== sphinx.extra) : left;
  sphinx.extra = pool[Math.floor(Math.random() * pool.length)];
  sphinx.misses = 0;
  return true;
}

// Anything said within earshot while a riddle hangs in the air is taken as an answer; returns true when it was.
function sphinxHears(text) {
  if (!sphinxObj || !sphinx.asking || indoors) return false;
  if (Math.hypot(player.x - sphinxObj.x, player.y - sphinxObj.y) > 110) return false;
  const r = riddleNow();
  sphinxQueue = [];
  if (sphinx.solved && /\b(skip|pass|another|next|different)\b/i.test(text)) {
    nextBonus();
    later(0.6, () => sphinxSay('As you wish. Try this one instead.'));
    later(3, askRiddle);
    return true;
  }
  if (/\b(hint|help|clue|no idea|give up)\b|\bdon'?t know\b/i.test(text)) {
    later(0.6, () => sphinxSay(r.hint));
    return true;
  }
  if (!r.answer.test(text)) {
    sphinx.misses++;
    later(0.6, () => {
      Sfx.thunk(0.6);
      sphinxSay(sphinx.misses >= 2 ? `No. ${r.hint}` : 'No. Think again, and answer.');
    });
    return true;
  }
  if (sphinx.solved) return rewardRiddle();
  sphinx.step++;
  sphinx.misses = 0;
  sphinx.asking = false;
  if (sphinx.step < RIDDLES.length) {
    later(0.6, () => {
      Sfx.rune(sphinx.step);
      sphinxSay(RIGHT[sphinx.step - 1]);
    });
    later(3.2, askRiddle);
    return true;
  }
  sphinx.solved = true;
  later(0.6, () => {
    Sfx.rune(3);
    sphinxSay('Correct! Three riddles, three answers. You are wise, child of the north. My treasure is yours.');
  });
  later(5.5, slideAside);
  return true;
}

function rewardRiddle() {
  sphinx.bonus.push(sphinx.extra);
  sphinx.asking = false;
  sphinx.misses = 0;
  const left = BONUS_RIDDLES.length - sphinx.bonus.length;
  later(0.6, () => {
    Sfx.rune(3);
    Sfx.coin();
    pay(RIDDLE_GOLD);
    popIcon('goldCoin', player.x, player.y - 30);
    sphinxSay(left ? 'Correct! A gold coin for your wit. Ask, if you dare another.' : 'Correct! That was my very last riddle. Take your gold, wise one. None have answered them all before you.');
  });
  return true;
}

function slideAside() {
  sphinxMove = { t: 0 };
  Sfx.rumble();
}

// The sphinx slides aside on its belly, and anyone in the way is nudged clear.
function placeSphinx(k) {
  sphinxObj.x = Math.round(sphinxHome - SPHINX_ASIDE * k);
  placeCollider(sphinxObj);
  const c = sphinxObj.col;
  if (player.x > c.x0 - 4 && player.x < c.x1 + 4 && player.y > c.y0 && player.y < c.y1 + 3) player.y = c.y1 + 4;
}

function updateDunes(dt) {
  if (!sphinxObj) return;
  for (const q of sphinxQueue) q.t -= dt;
  const due = sphinxQueue.filter((q) => q.t <= 0);
  sphinxQueue = sphinxQueue.filter((q) => q.t > 0);
  for (const q of due) q.fn();
  if (sphinxTalkT > 0 && (sphinxTalkT -= dt) <= 0) sphinxBubble.classList.remove('show');
  if (sphinxMove) {
    sphinxMove.t = Math.min(1, sphinxMove.t + dt / 2.2);
    const u = sphinxMove.t;
    placeSphinx(u * u * (3 - 2 * u));
    if (Math.random() < 0.5) particles.push({ type: 'dust', x: sphinxObj.x + (Math.random() - 0.5) * 50, y: sphinxObj.y - 2, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 10, life: 0, max: 0.6 });
    if (u >= 1) {
      sphinxMove = null;
      muse('It moved! The way into the cave is open.');
    }
  }
}

function drawSphinxBubble(cx, cy) {
  sphinxBubble.hidden = !!indoors;
  if (indoors || sphinxTalkT <= 0) return;
  sphinxBubble.style.left = `${(sphinxObj.x - cx) * zoom}px`;
  sphinxBubble.style.top = `${(sphinxObj.y - cy - 46) * zoom}px`;
}

function nearTreasure() {
  if ((indoors && indoors !== ROOMS.sandCave) || player.chop || !grounded()) return null;
  let best = null;
  let bd = 14;
  for (const o of hoard) {
    if (o.taken || !sameSpace(o)) continue;
    const d = o.col ? boxDist(o.col) : Math.hypot(o.x - player.x, o.y - player.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

const treasurePrompt = () => HOARD[nearTreasure().kind].prompt;

function takeTreasure(o) {
  faceToward(player, o.x - player.x, o.y - player.y);
  o.taken = true;
  stats.treasure++;
  HOARD[o.kind].take(o);
}

function restoreDunes(s) {
  if (!s) return;
  Object.assign(sphinx, s.sphinx, { asking: false });
  if (sphinx.solved) placeSphinx(1);
  for (const i of s.taken) {
    const o = hoard[i];
    if (!o) continue;
    o.taken = true;
    if (o.kind === 'hoardChest') o.key = 'hoardChestOpen';
    else o.hidden = true;
  }
}

// A skerry chest's map piece or the sailor's note, tossed out with the rest; `vz` 0 just sets it down.
function dropSkerryPaper(o, vz) {
  if (o.mark) {
    spawnDrop('mapPiece', o.x, o.y + 10, 0, vz ? 8 : 0, vz);
    drops[drops.length - 1].mark = o.mark;
  }
  if (o.note) spawnDrop('runeNote', o.x, o.y + 10, 0, vz ? 8 : 0, vz);
}

// Skerry chests opened before they held map pieces and the note leave them lying in front, still to pick up.
function restoreSkerryPapers() {
  for (const o of hoard) {
    if (!o.taken || !(o.mark || o.note)) continue;
    const lying = drops.some((d) => (o.mark ? d.mark === o.mark : d.item === 'runeNote'));
    const got = o.mark ? POIS.find((p) => p.id === o.mark).marked : has('runeNote');
    if (!lying && !got) dropSkerryPaper(o, 0);
  }
}

const saveDunes = () => ({ sphinx: { ...sphinx }, taken: hoard.flatMap((o, i) => (o.taken ? [i] : [])) });
