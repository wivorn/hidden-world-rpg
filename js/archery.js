// The archer's challenges, and the farmyard hens whose feathers fletch the arrows.

// ---------- hens ----------

// The yard between the sheep pen and the fields.
const HEN_YARD = { x0: (102 + OX) * TILE, x1: (124 + OX) * TILE, y0: (58.4 + OY) * TILE, y1: (63.6 + OY) * TILE };
const FEATHER_WAIT = 25;
const hens = [];

const henFree = (x, y) => x > HEN_YARD.x0 && x < HEN_YARD.x1 && y > HEN_YARD.y0 && y < HEN_YARD.y1 && !blocked(x - 4, y - 3, x + 4, y, null);

function initHens() {
  const rng = mulberry32(77);
  for (let i = 0; i < 5; i++) {
    for (let k = 0; k < 60; k++) {
      const x = HEN_YARD.x0 + rng() * (HEN_YARD.x1 - HEN_YARD.x0);
      const y = HEN_YARD.y0 + rng() * (HEN_YARD.y1 - HEN_YARD.y0);
      if (!henFree(x, y)) continue;
      hens.push({ x, y, dir: rng() < 0.5 ? 'left' : 'right', state: 'peck', timer: rng() * 2, anim: 0, featherT: 0, cluckT: 3 + rng() * 12, target: null });
      break;
    }
  }
}

function stepHen(h, dx, dy) {
  if (henFree(h.x + dx, h.y)) h.x += dx;
  if (henFree(h.x, h.y + dy)) h.y += dy;
  if (dx) h.dir = dx > 0 ? 'right' : 'left';
}

// Pecking about, strolling a few steps, and flapping off in a flurry when someone comes too close.
function updateHens(dt) {
  for (const h of hens) {
    if (h.featherT > 0) h.featherT -= dt;
    const dx = h.x - player.x;
    const dy = h.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 22 && h.state !== 'flee' && !player.flying && !sail && sameSpace(h)) {
      Object.assign(h, { state: 'flee', timer: 0.9 });
      Sfx.cluck(earshot(h.x, h.y));
      if (h.featherT <= 0) {
        h.featherT = FEATHER_WAIT;
        spawnDrop('feather', h.x, h.y + 2, (Math.random() - 0.5) * 16, 14, 30);
        drops[drops.length - 1].float = true;
      }
    }
    if ((h.cluckT -= dt) <= 0) {
      h.cluckT = 6 + Math.random() * 14;
      const k = earshot(h.x, h.y);
      if (k > 0.2 && sameSpace(h)) Sfx.cluck(0.35 * k);
    }
    h.anim += dt * (h.state === 'flee' ? 14 : 6);
    if (h.state === 'flee') {
      stepHen(h, (dx / d) * 80 * dt, (dy / d) * 80 * dt);
      if ((h.timer -= dt) <= 0) Object.assign(h, { state: 'peck', timer: 1 + Math.random() * 2 });
    } else if (h.state === 'walk') {
      const tx = h.target.x - h.x;
      const ty = h.target.y - h.y;
      const td = Math.hypot(tx, ty);
      const bx = h.x;
      const by = h.y;
      stepHen(h, (tx / td) * 18 * dt, (ty / td) * 18 * dt);
      if (td < 2 || (h.x === bx && h.y === by)) Object.assign(h, { state: 'peck', timer: 1.5 + Math.random() * 3 });
    } else if ((h.timer -= dt) <= 0) {
      const a = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 30;
      Object.assign(h, { state: 'walk', target: { x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r * 0.6 } });
    }
  }
}

function drawHen(h, cx, cy) {
  const frames = SPR.hen[h.dir];
  const f = h.state === 'flee' ? (Math.floor(h.anim) % 2 ? 3 : 1) : h.state === 'walk' ? Math.floor(h.anim) % 2 : Math.floor(h.anim * 0.5) % 3 === 0 ? 2 : 0;
  const hop = h.state === 'flee' ? Math.round(Math.abs(Math.sin(h.anim * 0.5)) * 3) : 0;
  const img = frames[f];
  drawShadow(Math.round(h.x) - cx, Math.round(h.y) - cy, 5, 1.5);
  ctx.drawImage(img, Math.round(h.x - img.width / 2) - cx, Math.round(h.y - img.height + 1) - cy - hop);
}

// ---------- the archer's challenges ----------

// `stage` is the next challenge to finish (4 when all are done); `active` once he has set it.
const archery = { stage: 0, active: false, intro: false, hits: 0, first: null, firstT: 0, streak: 0 };
const FAR_SHOT = 6.5 * TILE;
const BOTH_TIME = 6;
const STREAK = 5;
let cheerT = 0;

const archerNpc = () => npcBy('archer');

// `reward` is arrows and coins (in copper); `progress` is for the journal.
const CHALLENGES = [
  {
    title: 'Hit a target three times',
    set: 'First challenge: three hits on either target. Stand where you like.',
    progress: () => ` (${archery.hits}/3)`,
    reward: { arrows: 5 },
    hit() {
      archery.hits++;
      if (archery.hits >= 3) return true;
      archerCall(['One!', 'Two! One more.'][archery.hits - 1]);
      return false;
    },
  },
  {
    title: 'Hit both targets within six seconds',
    set: 'Second challenge: hit both targets, one after the other, within six seconds. Be quick!',
    reward: { coins: 50 },
    hit(o) {
      if (archery.first && archery.first !== o && time - archery.firstT <= BOTH_TIME) return true;
      if (archery.first && archery.first !== o) archerCall('Too slow! That one counts as your first. Again!');
      else if (archery.first === o && time - archery.firstT <= BOTH_TIME) archerCall('Same target! The OTHER one!');
      else archerCall('That\'s one. Now the other, quick!');
      archery.first = o;
      archery.firstT = time;
      return false;
    },
  },
  {
    title: 'Hit a target from seven paces back',
    set: 'Third challenge: a long shot. I\'ve chalked a line seven paces back. Stand on a cross behind it, draw the bow right back, and hit a target.',
    reward: { arrows: 8 },
    hit(o, a) {
      if (Math.hypot(a.from.x - o.x, a.from.y - o.y) >= FAR_SHOT) return true;
      archerCall('A hit, but too close! Back behind the chalk line.');
      return false;
    },
  },
  {
    title: 'Five hits in a row without a miss',
    set: 'Last challenge: five hits in a row. Miss once and you start again.',
    progress: () => ` (${archery.streak}/${STREAK})`,
    reward: { coins: 150, arrows: 10 },
    hit() {
      archery.streak++;
      if (archery.streak >= STREAK) return true;
      archerCall(`${archery.streak}!`);
      return false;
    },
  },
];

// While the long shot is set, a chalk line on the grass marks seven paces back, with a cross under each target.
const LONG_SHOT = 2;
function drawShootingLine(cx, cy) {
  if (!archery.active || archery.stage !== LONG_SHOT || indoors) return;
  const ts = hittables.filter((o) => o.axe === 'target');
  if (!ts.length) return;
  const y = Math.round(ts[0].y + FAR_SHOT + 3) - cy;
  const x0 = Math.min(...ts.map((t) => t.x)) - 18 - cx;
  const x1 = Math.max(...ts.map((t) => t.x)) + 18 - cx;
  if (y < -8 || y > viewH + 8 || x1 < 0 || x0 > viewW) return;
  ctx.globalAlpha = 0.65 + 0.2 * Math.sin(time * 3);
  ctx.fillStyle = '#f4efe2';
  for (let x = Math.round(x0); x < x1; x += 6) ctx.fillRect(x, y, 4, 1);
  for (const t of ts) {
    const tx = Math.round(t.x) - cx;
    for (let i = -3; i <= 3; i++) {
      ctx.fillRect(tx + i, y + 6 + i, 1, 1);
      ctx.fillRect(tx - i, y + 6 + i, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

function archerCall(text) {
  const a = archerNpc();
  if (a) npcSay(a, text);
}

function arrowHit(o, a) {
  const archer = archerNpc();
  if (!archer || Math.hypot(archer.x - o.x, archer.y - o.y) > 260) return;
  if (!archery.active) {
    if (time > cheerT && Math.random() < 0.4) {
      cheerT = time + 5;
      archerCall(['Nice shot.', 'Not bad at all.', 'Good arm.'][Math.floor(Math.random() * 3)]);
    }
    return;
  }
  if (!CHALLENGES[archery.stage].hit(o, a)) return;
  finishChallenge();
}

// Only a miss out on the range spoils a streak.
function arrowMiss(a) {
  if (!archery.active || archery.stage !== 3 || !archery.streak) return;
  const archer = archerNpc();
  if (!archer || Math.hypot(archer.x - a.x, archer.y - a.y) > 220) return;
  archery.streak = 0;
  archerCall('Missed! Back to nothing. Again!');
}

function finishChallenge() {
  const c = CHALLENGES[archery.stage];
  const { arrows: n = 0, coins: s = 0 } = c.reward;
  archery.stage++;
  archery.active = false;
  for (const a of arrows) a.pinned = null;
  const archer = archerNpc();
  const paid = [n && `${n} arrows`, s && coinWords(s)].filter(Boolean).join(' and ');
  if (n) give('arrow', n);
  if (s) {
    pay(s);
    Sfx.coin();
  }
  popIcon(n ? 'arrow' : 'silver', player.x, player.y - 30);
  Sfx.reward();
  burst(player.x, player.y - 16, ['#fff27a', '#ffffff', PAL.red], 12, 40);
  const last = archery.stage >= CHALLENGES.length;
  npcSay(archer, last
    ? `FIVE! ...I take back everything I said, {name}. You're a true Sharpshooter. Here's ${paid}.`
    : `Done! Well shot. Here's ${paid}. Talk to me when you want the next challenge.`);
  toast('CHALLENGE COMPLETE', c.title);
  updateArcherLines();
}

function setChallenge(n) {
  Object.assign(archery, { active: true, hits: 0, first: null, firstT: 0, streak: 0 });
  npcSay(n, CHALLENGES[archery.stage].set);
}

// With a bow in hand the archer hands out his challenges; the first time, a few arrows to go with it.
function archerTalk(n) {
  if (n.look.id !== 'archer' || !has('bow') || n.craft) return false;
  faceToward(n, player.x - n.x, player.y - n.y);
  if (!archery.intro) {
    archery.intro = true;
    const gift = !has('arrow');
    if (gift) {
      give('arrow', 5);
      popIcon('arrow', player.x, player.y - 30);
      Sfx.reward();
    }
    npcSay(n, `A bow of your own!${gift ? ' Here, five arrows to start.' : ''} When you run out, bring me 1 wood, 1 stone and 1 feather and I'll fletch five more. Talk to me again for a challenge!`);
    return true;
  }
  if (archery.stage >= CHALLENGES.length) return false;
  if (!has('arrow') && (archery.nag = (archery.nag || 0) + 1) % 2 === 1) {
    npcSay(n, 'No arrows? Bring me 1 wood, 1 stone and 1 feather, and ask me for arrows. The hens by the farm drop feathers.');
    return true;
  }
  if (!archery.active) {
    setChallenge(n);
    return true;
  }
  const c = CHALLENGES[archery.stage];
  npcSay(n, `${c.set}${c.progress ? ` So far:${c.progress()}.` : ''}`);
  return true;
}

function updateArcherLines() {
  const n = archerNpc();
  if (!n || archery.stage < CHALLENGES.length) return;
  n.lines = ['Well shot, Sharpshooter!', 'Fancy a contest some time? ...Maybe not.', 'Feathers from the hens make the straightest arrows.', 'Practice every day, Sharpshooter.'];
  n.nightLines = ['Evening, Sharpshooter!', 'Even a Sharpshooter can\'t hit what they can\'t see. Get some sleep.', 'Hear that thunk? That\'s a hit. You learn the sound.'];
}
