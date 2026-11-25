// Dragon genes. Every dragon carries two copies of each gene, one from each parent, and shows whichever comes first
// in that gene's list: the ones further down only show when both copies are the same. So a trait can lie hidden for
// a generation and turn up again in a grandchild. Horns, spines, tail tip, markings and wingtips set the kind's look;
// the shape genes stretch or shrink its build; and breath sets what it breathes.

// Each gene's alleles, most dominant first.
const GENES = {
  horns: ['horns', 'crest', 'fins', 'frill', 'fury', 'none'],
  spines: ['spikes', 'plates', 'nubs', 'none'],
  tail: ['club', 'spade', 'fins', 'fan'],
  marks: ['stripes', 'spots', 'none', 'bubbles'],
  tips: ['tips', 'plain'],
  neck: ['mid', 'stubby', 'long'],
  snout: ['mid', 'blunt', 'long'],
  head: ['mid', 'small', 'big'],
  wings: ['mid', 'short', 'big'],
  tailLen: ['mid', 'short', 'long'],
  build: ['mid', 'stocky', 'lean'],
  breath: ['fire', 'sonic', 'frost', 'plasma', 'lightning', 'water', 'rainbow'],
};
// What each shape gene's alleles multiply in drawDragon's proportions (see DRAGON_AGES).
const SHAPE_GENES = {
  neck: { part: 'neck', mid: 1, stubby: 0.45, long: 1.45 },
  snout: { part: 'snout', mid: 1, blunt: 0.74, long: 1.25 },
  head: { part: 'head', mid: 1, small: 0.86, big: 1.16 },
  wings: { part: 'wing', mid: 1, short: 0.82, big: 1.2 },
  tailLen: { part: 'tail', mid: 1, short: 0.72, long: 1.3 },
  build: { part: 'chub', mid: 1, stocky: 1.16, lean: 0.86 },
};
// The chance each copy passed on comes out as some other allele of its gene.
const MUTATION = 0.04;
// Alleles the wild kinds carry without showing.
const WILD_CARRIES = {
  nightFury: { horns: 'none', wings: 'big' },
  lightFury: { tailLen: 'long', head: 'small' },
  thunderdrum: { neck: 'long', horns: 'frill', marks: 'bubbles' },
  terribleTerror: { head: 'big', build: 'lean', tail: 'fan' },
  skrill: { wings: 'big', snout: 'long' },
  tideGlider: { horns: 'frill', wings: 'big' },
  cloudDragon: { wings: 'big', horns: 'fins', tailLen: 'long' },
};
// Pairs of breath alleles that, carried together, show neither: they fuse into a breath of their own. Neither
// copy is hidden, so a fused breath doesn't breed true: two Steam dragons have fire, steam and water young.
const BREATH_FUSIONS = { 'fire+water': 'steam', 'lightning+sonic': 'thunder', 'frost+plasma': 'moonbeam' };
const FUSED_FROM = Object.fromEntries(Object.entries(BREATH_FUSIONS).map(([k, v]) => [v, k.split('+')]));
const fusedBreath = ([a, b]) => BREATH_FUSIONS[[a, b].sort().join('+')] || null;
// Breath colours bred dragons get for each element: a hue range round the wheel, and how strong the colour is.
const BREATH_HUES = {
  fire: [345, 45], sonic: [70, 165], frost: [180, 240], plasma: [255, 320], lightning: [190, 215], water: [195, 220],
  rainbow: [0, 359], steam: [190, 215], thunder: [42, 58], moonbeam: [215, 255],
};
// The saturation and lightness of a breath's main colour, for the breaths paler than a vivid 0.9 and 0.58.
const BREATH_TONE = { steam: [0.2, 0.8], moonbeam: [0.45, 0.74], rainbow: [0.8, 0.76] };

const shownAllele = (gene, [a, b]) => (GENES[gene].indexOf(a) <= GENES[gene].indexOf(b) ? a : b);
const hiddenAllele = (gene, pair) => (pair[0] === shownAllele(gene, pair) ? pair[1] : pair[0]);
const shownTrait = (gene, pair) => (gene === 'breath' && fusedBreath(pair)) || shownAllele(gene, pair);

// The element a breath colour reads as, for bred kinds laid before breath was a gene.
function hueElement(hex) {
  const { h } = hslOf(hex);
  return h < 60 || h >= 330 ? 'fire' : h < 170 ? 'sonic' : h < 245 ? 'frost' : 'plasma';
}

const nearestAllele = (gene, v) => Object.keys(SHAPE_GENES[gene]).filter((k) => k !== 'part')
  .reduce((best, k) => (Math.abs(SHAPE_GENES[gene][k] - v) < Math.abs(SHAPE_GENES[gene][best] - v) ? k : best), 'mid');

// The alleles a kind shows, read from how it looks: for the wild kinds, and bred ones from older saves.
function shownFromLooks(id, pal) {
  const look = pal.look || {};
  const out = {
    horns: look.horns || 'fins', spines: look.spines || 'none', tail: look.tail || 'fins', marks: look.marks || 'none', tips: look.tips ? 'tips' : 'plain',
    breath: ELEMENT_OF[id] || hueElement(pal.breath[0]),
  };
  for (const [gene, g] of Object.entries(SHAPE_GENES)) out[gene] = nearestAllele(gene, pal.shape?.[g.part] ?? 1);
  return out;
}

// A kind's two copies of every gene. Bred kinds keep theirs; the rest have them worked out from their looks, with
// whatever the wild kinds carry hidden.
function genesOf(id) {
  const pal = DRAGON_SPECIES[id];
  if (pal.genes) return pal.genes;
  const shown = shownFromLooks(id, pal);
  const carries = WILD_CARRIES[id] || {};
  return Object.fromEntries(Object.keys(GENES).map((gene) => [gene, [shown[gene], carries[gene] || shown[gene]]]));
}

const traitsOf = (genes) => Object.fromEntries(Object.entries(genes).map(([gene, pair]) => [gene, shownTrait(gene, pair)]));
// How many genes hold a copy the dragon doesn't show.
const hiddenCount = (genes) => Object.entries(genes)
  .filter(([gene, pair]) => shownTrait(gene, pair) === shownAllele(gene, pair) && hiddenAllele(gene, pair) !== shownAllele(gene, pair)).length;

// One copy of each gene from each parent, picked at random, now and then changed into another.
function inheritGenes(g1, g2, r) {
  const pass = (gene, pair) => (r() < MUTATION ? GENES[gene][Math.floor(r() * GENES[gene].length)] : pair[r() < 0.5 ? 0 : 1]);
  return Object.fromEntries(Object.keys(GENES).map((gene) => [gene, [pass(gene, g1[gene]), pass(gene, g2[gene])]]));
}

// The look and build drawDragon wants for the alleles shown.
function bodyOf(traits) {
  const look = {
    horns: traits.horns, spines: traits.spines === 'none' ? undefined : traits.spines, tail: traits.tail,
    marks: traits.marks === 'none' ? undefined : traits.marks, tips: traits.tips === 'tips',
  };
  const shape = {};
  for (const [gene, g] of Object.entries(SHAPE_GENES)) if (traits[gene] !== 'mid') shape[g.part] = g[traits[gene]];
  return { look, shape };
}

// A breath hue for `element`: the hue of a parent breathing the same, nudged a little, or one from its range.
function breathHue(element, parents, r) {
  const [lo, hi] = BREATH_HUES[element];
  const span = (hi - lo + 360) % 360;
  const inRange = (h) => (((h - lo + 360) % 360) <= span);
  const same = parents.filter((p) => inRange(hslOf(p.breath[0]).h));
  if (same.length && r() < 0.7) {
    const h = hslOf(same[Math.floor(r() * same.length)].breath[0]).h + (r() - 0.5) * 30;
    if (inRange(h)) return h;
  }
  return lo + r() * span;
}

// ---------- the family tree ----------

// A dragon by kind: the name the player gave it if it's hatched, else the kind's own.
const kinName = (id) => dragons.find((d) => d.species === id)?.name || DRAGON_SPECIES[id].defaultName;
const parentIdsOf = (id) => DRAGON_SPECIES[id]?.parentIds || [];

// Where a bred kind's shown `gene` came from: a parent showing it, a grandparent it skipped a generation from,
// hidden in a parent's line, or nowhere at all (a mutation).
function traitOrigin(id, gene) {
  const allele = traitsOf(genesOf(id))[gene];
  const parents = parentIdsOf(id).filter((p) => DRAGON_SPECIES[p]);
  const showing = parents.filter((p) => traitsOf(genesOf(p))[gene] === allele);
  if (showing.length === 2 && showing[0] !== showing[1]) return { kind: 'both' };
  if (showing.length) return { kind: 'parent', from: showing[0] };
  // each copy came from the parent in its place
  if (gene === 'breath' && FUSED_FROM[allele] && parents.length === 2) return { kind: 'fusion', parts: genesOf(id).breath, from: parents };
  const grand = parents.flatMap(parentIdsOf).filter((g) => DRAGON_SPECIES[g] && traitsOf(genesOf(g))[gene] === allele);
  if (grand.length) return { kind: 'throwback', from: grand[0] };
  const carrier = parents.find((p) => genesOf(p)[gene].includes(allele));
  if (carrier) return { kind: 'hidden', from: carrier };
  return { kind: 'mutation' };
}
