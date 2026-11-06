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
const SPHINX_ASIDE = 64;
const SPHINX_VOICE = 90;
const sphinx = { met: false, step: 0, misses: 0, solved: false, asking: false };
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

const sphinxPrompt = () => (sphinx.asking ? 'ENTER  Answer the riddle   ·   SPACE  Hear it again' : 'SPACE  Speak to the sphinx');

function speakToSphinx() {
  faceToward(player, sphinxObj.x - player.x, sphinxObj.y - player.y);
  if (sphinx.solved) {
    sphinxSay('The treasure of the sands is yours, wise one. Enter.');
    if (!sphinxQueue.length && sphinxObj.x === sphinxHome) later(2.5, slideAside);
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
  sphinxSay(RIDDLES[sphinx.step].ask);
}

// Anything said within earshot while a riddle hangs in the air is taken as an answer; returns true when it was.
function sphinxHears(text) {
  if (!sphinxObj || sphinx.solved || !sphinx.asking || indoors) return false;
  if (Math.hypot(player.x - sphinxObj.x, player.y - sphinxObj.y) > 110) return false;
  const r = RIDDLES[sphinx.step];
  sphinxQueue = [];
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
  if ((indoors && indoors !== ROOMS.sandCave) || player.chop || !grounded() || player.trek) return null;
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
