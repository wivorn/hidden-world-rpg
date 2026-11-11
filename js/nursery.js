// The dragon nursery on the hermit's isle. Once a dragon has hatched from a roost egg the hermit asks for one: fell
// the trees between his stakes west of the hut, bring NURSERY_WOOD wood and raise it there. A baby dragon told to stay
// by it wanders about inside its fence and grows a size every NURSERY_DAYS days, all the way to grown, when the hermit
// straps a saddle on it so it's ready to ride.

const NURSERY_WOOD = 10;
const NURSERY_DAYS = 2;
const NURSERY_NEAR = 110;
// `raised` counts the babies that have grown up there; `lastDay` the game time last seen; `first` the name of the
// first grown, and `saddlesTold` whether the hermit has since mentioned the saddles in his chest.
const nursery = { asked: false, built: false, raised: 0, lastDay: null, first: null, saddlesTold: false };
let nurseryObj = null;
let nurseryTrees = [];
let nurseryStakes = [];
let nurseryFences = [];

function initNursery() {
  nurseryObj = objects.find((o) => o.key === 'nursery');
  nurseryTrees = objects.filter((o) => o.site === 'nursery');
  nurseryStakes = objects.filter((o) => o.key === 'stake' && o.nursery);
  nurseryFences = objects.filter((o) => o.nurseryFence || o.dragonPen === 'nursery');
  showNursery();
}

// The stakes go in when the hermit asks for the nursery; the shelter and its fence once it's built.
function showNursery() {
  for (const o of nurseryStakes) {
    o.hidden = !nursery.asked;
    if (o.col) o.col.off = !nursery.asked;
  }
  nurseryObj.hidden = !nursery.built;
  nurseryObj.col.off = !nursery.built;
  for (const o of nurseryFences) {
    o.hidden = !nursery.built;
    if (o.col) o.col.off = !nursery.built;
  }
  if (!nursery.built) return;
  for (const o of nurseryTrees) {
    Object.assign(o, { key: TREES[o.tree].stump, hidden: true, fall: null, regrowT: 0 });
    if (o.col) o.col.off = true;
  }
}

const nurseryTreesLeft = () => nurseryTrees.filter((o) => o.key === o.tree).length;
const hatchedBred = () => roost.built && dragons.some((d) => roost.bred.some((b) => b.id === d.species));
const nurseryCentre = () => ({ x: nurseryObj.x, y: nurseryObj.y + ((NURSERY_PEN.top + NURSERY_PEN.bottom) / 2) * TILE });
const nearNursery = (x, y, r = NURSERY_NEAR) => nursery.built && Math.hypot(x - nurseryCentre().x, y - nurseryCentre().y) < r;

// A free spot somewhere inside the fence for baby `b` to stand on.
function nurserySpot(b) {
  for (let i = 0; i < 24; i++) {
    const x = Math.round(nurseryObj.x + (Math.random() - 0.5) * 2 * (NURSERY_PEN.x * TILE - 14));
    const y = Math.round(nurseryObj.y + 10 + Math.random() * (NURSERY_PEN.bottom * TILE - 20));
    if (canStand(b, x, y)) return { x, y };
  }
  return null;
}

// ---------- building it ----------

// On foot between the stakes, with the nursery still to build.
function nurserySite() {
  if (!nursery.asked || nursery.built || indoors || flight || sail || hop) return false;
  return inNurserySite(player.x / TILE, player.y / TILE);
}

function nurseryPrompt() {
  const left = nurseryTreesLeft();
  const wood = bag.wood || 0;
  const text = left ? `Fell the trees between the stakes: ${left} still standing`
    : wood < NURSERY_WOOD ? `Cleared! Bring ${NURSERY_WOOD} wood to build the nursery (you have ${wood})`
      : 'SPACE  Build the dragon nursery';
  const tool = toolHint();
  return tool ? `${text}   ·   ${tool}` : text;
}

const nurseryBuildable = () => nurserySite() && !nurseryTreesLeft() && (bag.wood || 0) >= NURSERY_WOOD && canUseTool();

function raiseNursery() {
  bag.wood -= NURSERY_WOOD;
  renderInventory();
  Sfx.chop();
  fadeTo(() => {
    nursery.built = true;
    showNursery();
    const c = nurseryCentre();
    Object.assign(player, { x: c.x, y: nurseryObj.y + (NURSERY_PEN.bottom + 1) * TILE, dir: 'up' });
    for (let i = 0; i < 6; i++) dust(nurseryObj.x + (i - 2.5) * 12, nurseryObj.y + 4);
    Sfx.timber();
    setTimeout(() => Sfx.reward(), 400);
    toast('DRAGON NURSERY', 'Leave a baby dragon here and it grows up by itself');
    muse(`A nursery! Any hatchling left here will grow a size every ${NURSERY_DAYS} days.`);
  });
}

// ---------- leaving a baby ----------

// The baby dragon following the player, if it could be left at the nursery from here.
function nurseryLeave() {
  const d = follower;
  if (!d || d.stage >= GROWN || flight || sail || hop || indoors || !nearNursery(player.x, player.y)) return null;
  return d;
}

function leaveAtNursery(d) {
  setFollower(null);
  Object.assign(d, { emote: 'heart', emoteT: 1.8 });
  muse(`Stay here and grow big, ${d.name}. I'll be back for you.`);
}

// A baby that stops following by the nursery stays inside its fence.
function nurseryKeeps(d) {
  if (!nearNursery(d.x, d.y, NURSERY_NEAR + 40)) return false;
  const spot = nurserySpot(d) || { x: nurseryCentre().x, y: nurseryCentre().y };
  Object.assign(d, { nursery: true, grow: d.grow || 0, home: spot, target: { ...spot } });
  return true;
}

// Game time counts, nights slept through included, for every baby kept in the nursery.
function updateNursery() {
  if (!nursery.built) return;
  const now = gameDays();
  const passed = Math.max(0, now - (nursery.lastDay ?? now));
  nursery.lastDay = now;
  for (const d of dragons) {
    if (!d.nursery || d === follower) continue;
    d.grow = (d.grow || 0) + passed;
    while (d.nursery && d.stage < GROWN && d.grow >= NURSERY_DAYS) {
      d.grow -= NURSERY_DAYS;
      growInNursery(d);
    }
  }
  tellSaddles();
}

// Once a dragon has grown up in the nursery, the hermit lets on about his chest of saddles the first time he's by.
function tellSaddles(n = npcs.find((k) => k.look.id === 'hermit')) {
  if (!nursery.raised || nursery.saddlesTold || !n || flight || sail || naming) return false;
  if (!sameSpace(n) || Math.hypot(n.x - player.x, n.y - player.y) > 140 || npcs.some((k) => k.talkT > 0)) return false;
  nursery.saddlesTold = true;
  const left = hermitStore.saddle || 0;
  const more = left ? `I've got more saddles in the chest in my hut, ${left === 1 ? 'one left' : `${left} of them`}. Help yourself, for any other dragon of yours.`
    : 'You\'ve found the saddles in my chest already, I see.';
  npcSay(n, `${nursery.first ? `${nursery.first}'s` : 'Your hatchling\'s'} full grown, and I've saddled it! ${more}`);
  return true;
}

function growInNursery(d) {
  feedBaby(d);
  if (d.stage < GROWN) {
    toast('THE NURSERY', `${d.name} has grown a size bigger`);
    return;
  }
  Object.assign(d, { nursery: false, grow: 0, saddled: true });
  d.obj.saddled = true;
  if (!nursery.raised++) nursery.first = d.name;
  toast('FULL GROWN', `${d.name} has grown up in the nursery, and the hermit has saddled it for you`);
}

// ---------- the hermit ----------

// The hermit asks for the nursery once a dragon has hatched from a roost egg, then has a word on it every other time.
function nurseryTalk(n) {
  if (n.look.id !== 'hermit') return false;
  if (tellSaddles(n)) return true;
  if (!nursery.asked) {
    if (!hatchedBred()) return false;
    nursery.asked = true;
    showNursery();
    n.nurseryTold = 0;
    npcSay(n, `A kind nobody's ever seen, born of your own roost! Hatchlings want minding while you're off adventuring. I've put stakes in west of my hut. Clear the trees between them, bring ${NURSERY_WOOD} wood and build a nursery. Leave the little ones there and they'll grow by themselves.`);
    return true;
  }
  if ((n.nurseryTold = (n.nurseryTold || 0) + 1) % 2 === 0) return false;
  const line = nurseryLine();
  if (line) npcSay(n, line);
  return !!line;
}

function nurseryLine() {
  if (!nursery.built) {
    const left = nurseryTreesLeft();
    if (left) return `The trees between my stakes, west of the hut. ${left === 1 ? 'Just one' : left} still standing.`;
    return (bag.wood || 0) < NURSERY_WOOD ? `The ground's clear. Now ${NURSERY_WOOD} wood, and you can build the nursery.` : 'You\'ve the wood. Stand between the stakes and build it!';
  }
  const kid = dragons.find((d) => d.nursery);
  if (kid) {
    const days = Math.max(1, Math.ceil(NURSERY_DAYS - (kid.grow || 0)));
    return `${kid.name} is coming along nicely. ${days === 1 ? 'Another day' : `${days} more days`} and it'll be a size bigger.`;
  }
  if (dragons.some((d) => d.stage < GROWN)) return `Leave a hatchling in the nursery and it grows a size every ${NURSERY_DAYS} days, no fishing needed. I'll have a saddle on it when it's grown.`;
  return null;
}

// ---------- saving ----------

function saveNursery() {
  return {
    asked: nursery.asked, built: nursery.built, raised: nursery.raised, first: nursery.first, saddlesTold: nursery.saddlesTold,
    felled: nurseryTrees.map((o, i) => (o.key !== o.tree ? i : -1)).filter((i) => i >= 0),
  };
}

function restoreNursery(s) {
  if (!s) return;
  Object.assign(nursery, { asked: s.asked, built: s.built, raised: s.raised || 0, lastDay: null, first: s.first || null, saddlesTold: !!s.saddlesTold });
  for (const i of s.felled || []) {
    const o = nurseryTrees[i];
    if (!o) continue;
    Object.assign(o, { key: TREES[o.tree].stump, regrowT: 0 });
    placeCollider(o);
  }
  showNursery();
}
