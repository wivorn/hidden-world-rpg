// Synthesized sound effects and ambience; no audio files needed.
const Sfx = (() => {
  let ac = null;
  let master = null;
  let noiseBuf = null;
  let muted = false;
  let waves = null;
  let wind = null;
  let rain = null;
  let gust = null;
  const VOLUME = 0.55;

  function init() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    waves = loopNoise('lowpass', 420);
    wind = loopNoise('bandpass', 900);
    rain = loopNoise('highpass', 2400);
    gust = loopNoise('bandpass', 320);
  }

  function loopNoise(type, freq) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ac.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(master);
    src.start();
    return gain;
  }

  const ready = () => ac && ac.state === 'running' && !muted;

  function tone({ type = 'sine', f0, f1 = f0, dur, vol = 0.2, delay = 0, attack = 0.005 }) {
    if (!ready() || vol <= 0.001) return;
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise({ dur, vol = 0.2, f0 = 1000, f1 = f0, q = 1, type = 'lowpass', delay = 0, attack = 0.005 }) {
    if (!ready() || vol <= 0.001) return;
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- music ----------
  // Each part of the world has a soft tune of its own, made up as it plays from the notes of its scale: a slow
  // drone and a pad that walks a chord loop, under a melody that wanders a step or two at a time. `beat` is in
  // seconds, `scale` in semitones above `root` Hz, `chords` the scale degrees each bar's pad starts on, and
  // `busy` how likely a beat is to carry a note. Moving to another part fades one tune out as the next comes in.
  const TUNES = {
    village: { root: 293.66, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19], beat: 0.42, chords: [0, 3, 4, 2], busy: 0.55, lead: 'triangle', pluck: 0.9, vol: 0.045 },
    sea: { root: 220, scale: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15], beat: 0.7, chords: [0, 3, 5, 4], busy: 0.4, lead: 'sine', pluck: 1.8, swell: true, vol: 0.05 },
    volcano: { root: 146.83, scale: [0, 1, 3, 5, 7, 8, 10, 12, 13], beat: 0.55, chords: [0, 1, 0, 5], busy: 0.3, lead: 'triangle', pluck: 1.2, drum: true, vol: 0.05 },
    festival: { root: 293.66, scale: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], beat: 0.27, chords: [0, 3, 4, 0], busy: 0.85, lead: 'square', pluck: 0.35, drum: true, vol: 0.03 },
    snow: { root: 523.25, scale: [0, 2, 4, 6, 7, 9, 11, 12, 14], beat: 0.8, chords: [0, 4, 3, 5], busy: 0.3, lead: 'sine', pluck: 2.6, bell: true, vol: 0.03 },
  };
  const MUSIC = 0.8;
  const BAR = 8;
  const playing = {};
  const hz = (t, deg, oct = 0) => {
    const n = t.scale.length;
    const d = ((deg % n) + n) % n;
    return t.root * 2 ** ((t.scale[d] + 12 * (oct + Math.floor(deg / n))) / 12);
  };

  function voice(bus, { type = 'sine', f, at, dur, vol, attack = 0.01, cut = 0 }) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let out = osc.connect(g);
    if (cut) {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cut;
      out = out.connect(lp);
    }
    out.connect(bus);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  function beat(t, s, at) {
    const b = s.i++;
    const v = t.vol;
    if (b % BAR === 0) {
      const root = t.chords[(b / BAR) % t.chords.length];
      s.chord = root;
      const long = t.beat * BAR + 1.5;
      voice(s.bus, { f: hz(t, 0, -2), at, dur: long, vol: v * 0.7, attack: 1.2 });
      for (const k of [0, 2, 4]) voice(s.bus, { type: 'triangle', f: hz(t, root + k, -1), at, dur: long, vol: v * 0.28, attack: t.swell ? 2.2 : 1, cut: 900 });
    }
    if (t.drum && b % 4 === 0) {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(95, at);
      o.frequency.exponentialRampToValueAtTime(42, at + 0.3);
      const g = ac.createGain();
      g.gain.setValueAtTime(v * 1.6, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
      o.connect(g).connect(s.bus);
      o.start(at);
      o.stop(at + 0.45);
    }
    // phrases end back on a note of the bar's chord, after a rest
    const end = b % (BAR * 2);
    if (end === BAR * 2 - 1 || Math.random() > t.busy) return;
    if (end === BAR * 2 - 2) s.deg = s.chord + [0, 2, 4][Math.floor(Math.random() * 3)];
    else s.deg = Math.max(0, Math.min(t.scale.length + 2, s.deg + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
    const f = hz(t, s.deg);
    const dur = t.pluck * (Math.random() < 0.25 ? 1.6 : 1);
    voice(s.bus, { type: t.lead, f, at, dur, vol: v, attack: t.swell ? 0.18 : 0.012, cut: { triangle: 2400, square: 1600 }[t.lead] || 0 });
    if (t.bell) voice(s.bus, { f: f * 2.76, at, dur: dur * 0.6, vol: v * 0.3 });
  }

  return {
    init,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ac.currentTime, 0.05);
      return muted;
    },

    // sea: 0..1 closeness to open water, air: 0..1 flight speed
    ambience(sea, air) {
      if (!ac) return;
      waves.gain.setTargetAtTime(sea * (0.05 + 0.03 * Math.sin(ac.currentTime * 0.7)), ac.currentTime, 0.3);
      wind.gain.setTargetAtTime(air * 0.07, ac.currentTime, 0.3);
    },
    // `area` names the tune to play, or null for none; `k` turns it down, as indoors.
    music(area, k = 1) {
      if (!ac || ac.state !== 'running') return;
      const now = ac.currentTime;
      for (const id of Object.keys(TUNES)) {
        const t = TUNES[id];
        const s = playing[id] ||= { bus: ac.createGain(), i: 0, deg: 4, chord: 0, next: 0 };
        if (!s.i && !s.next) {
          s.bus.gain.value = 0;
          s.bus.connect(master);
        }
        const on = id === area;
        s.bus.gain.setTargetAtTime(on ? MUSIC * k : 0, now, on ? 1.6 : 1.1);
        // faded out, it starts again from the top of a bar when it next comes in
        if (!on && s.bus.gain.value < 0.003) {
          Object.assign(s, { next: -1, i: 0 });
          continue;
        }
        if (s.next < now) s.next = now + 0.05;
        while (s.next < now + 0.25) {
          beat(t, s, s.next);
          s.next += t.beat;
        }
      }
    },
    // wet: 0..1 rain on the roof or the ground, storm: 0..1 howling wind
    weather(wet, storm) {
      if (!ac) return;
      rain.gain.setTargetAtTime(wet * 0.05, ac.currentTime, 0.6);
      gust.gain.setTargetAtTime(storm * (0.04 + 0.03 * Math.sin(ac.currentTime * 0.4)), ac.currentTime, 0.6);
    },
    thunder(k = 1, delay = 0) {
      noise({ dur: 0.25, vol: 0.12 * k, f0: 2400, f1: 300, delay });
      noise({ dur: 2.8, vol: 0.2 * k, f0: 220, f1: 50, delay: delay + 0.08, attack: 0.1 });
    },
    // a crackle of static, and a bolt striking close by
    zap(k = 1) {
      noise({ dur: 0.16, vol: 0.07 * k, f0: 6500, f1: 2600, type: 'highpass', attack: 0.004 });
      tone({ type: 'square', f0: rand(900, 1400), f1: 260, dur: 0.1, vol: 0.025 * k });
      tone({ type: 'sawtooth', f0: 90, f1: 120, dur: 0.22, vol: 0.025 * k, delay: 0.02 });
    },
    strike(k = 1) {
      noise({ dur: 0.12, vol: 0.32 * k, f0: 9000, f1: 1500, type: 'highpass' });
      noise({ dur: 0.5, vol: 0.28 * k, f0: 3200, f1: 200, delay: 0.02 });
      noise({ dur: 3.6, vol: 0.34 * k, f0: 260, f1: 40, delay: 0.06, attack: 0.04 });
      tone({ type: 'sine', f0: 72, f1: 28, dur: 1.4, vol: 0.26 * k, delay: 0.03 });
    },
    sizzle(k = 1) { noise({ dur: 0.5, vol: 0.035 * k, f0: 5200, f1: 3000, type: 'bandpass', q: 0.8, attack: 0.08 }); },
    yawn() { tone({ type: 'triangle', f0: 320, f1: 180, dur: 0.9, vol: 0.06, attack: 0.25 }); },

    step(surface, k = 1) {
      const v = 0.07 * k;
      if (surface === 'wood') {
        tone({ type: 'triangle', f0: rand(170, 200), f1: 110, dur: 0.07, vol: v * 1.2 });
      } else if (surface === 'stone') {
        noise({ dur: 0.04, vol: v * 1.1, f0: 2200, type: 'bandpass', q: 2 });
      } else if (surface === 'sand') {
        noise({ dur: 0.08, vol: v * 0.8, f0: 700, f1: 300 });
      } else {
        noise({ dur: 0.05, vol: v * 0.7, f0: rand(900, 1200), f1: 400 });
      }
    },
    jump(k = 1) { tone({ type: 'square', f0: 260, f1: 620, dur: 0.14, vol: 0.05 * k }); },
    land(k = 1) { noise({ dur: 0.09, vol: 0.12 * k, f0: 500, f1: 120 }); },
    splash(k = 1) {
      noise({ dur: 0.55, vol: 0.3 * k, f0: 3000, f1: 250 });
      for (let i = 0; i < 5; i++) tone({ f0: rand(900, 1700), f1: rand(500, 900), dur: 0.08, vol: 0.05 * k, delay: 0.08 + i * rand(0.04, 0.09) });
    },
    swim(k = 1) { noise({ dur: 0.22, vol: 0.06 * k, f0: 1000, f1: 300, attack: 0.05 }); },
    thunk(k = 1) { tone({ type: 'triangle', f0: 150, f1: 80, dur: 0.14, vol: 0.18 * k }); },
    flap(k = 1) { noise({ dur: 0.18, vol: 0.12 * k, f0: 500, f1: 140, attack: 0.04 }); },
    roar() {
      tone({ type: 'sawtooth', f0: 230, f1: 70, dur: 1.0, vol: 0.1, attack: 0.06 });
      tone({ type: 'sawtooth', f0: 345, f1: 95, dur: 0.9, vol: 0.05, attack: 0.06 });
      noise({ dur: 1.0, vol: 0.12, f0: 900, f1: 300, type: 'bandpass', attack: 0.06 });
    },
    charge(step) {
      const f = 380 * 1.26 ** step;
      tone({ type: 'triangle', f0: f, f1: f * 1.5, dur: 0.14, vol: 0.05 + step * 0.01 });
      if (step === 3) tone({ type: 'square', f0: f * 2, dur: 0.18, vol: 0.03, delay: 0.08 });
    },
    breath(el) {
      if (el === 'fire') {
        noise({ dur: 0.45, vol: 0.18, f0: 900, f1: 250, type: 'bandpass', q: 0.8, attack: 0.03 });
        tone({ type: 'sawtooth', f0: 160, f1: 90, dur: 0.3, vol: 0.04 });
      } else if (el === 'frost') {
        tone({ type: 'triangle', f0: 1800, f1: 2600, dur: 0.22, vol: 0.05 });
        noise({ dur: 0.35, vol: 0.08, f0: 6000, f1: 3500, type: 'highpass', attack: 0.01 });
      } else if (el === 'sonic') {
        tone({ type: 'square', f0: 120, f1: 55, dur: 0.35, vol: 0.1 });
        tone({ f0: 240, f1: 90, dur: 0.3, vol: 0.08 });
      } else if (el === 'water') {
        noise({ dur: 0.4, vol: 0.16, f0: 1800, f1: 700, type: 'bandpass', q: 1, attack: 0.02 });
        tone({ f0: 300, f1: 700, dur: 0.12, vol: 0.06 });
      } else {
        tone({ type: 'square', f0: 1100, f1: 180, dur: 0.28, vol: 0.06 });
        noise({ dur: 0.35, vol: 0.14, f0: 2400, f1: 500, type: 'bandpass', q: 1.2, attack: 0.01 });
      }
    },
    beam(el) {
      if (el === 'fire') {
        noise({ dur: 1.0, vol: 0.2, f0: 700, f1: 300, type: 'bandpass', q: 0.7, attack: 0.05 });
        tone({ type: 'sawtooth', f0: 110, f1: 80, dur: 1.0, vol: 0.05, attack: 0.05 });
      } else if (el === 'frost') {
        tone({ type: 'triangle', f0: 1400, f1: 2400, dur: 1.3, vol: 0.05, attack: 0.03 });
        tone({ type: 'sine', f0: 2100, f1: 3100, dur: 1.2, vol: 0.03, delay: 0.05 });
        noise({ dur: 1.3, vol: 0.08, f0: 7000, f1: 4000, type: 'highpass', attack: 0.03 });
      } else if (el === 'sonic') {
        tone({ type: 'square', f0: 70, f1: 55, dur: 0.9, vol: 0.12, attack: 0.02 });
        tone({ type: 'sawtooth', f0: 140, f1: 100, dur: 0.9, vol: 0.05 });
        noise({ dur: 0.9, vol: 0.14, f0: 400, f1: 200, type: 'bandpass', q: 0.9, attack: 0.02 });
      } else if (el === 'water') {
        noise({ dur: 1.2, vol: 0.18, f0: 1400, f1: 900, type: 'bandpass', q: 0.8, attack: 0.04 });
        noise({ dur: 1.2, vol: 0.08, f0: 4000, f1: 3000, type: 'highpass', attack: 0.04 });
      } else {
        tone({ type: 'sawtooth', f0: 150, f1: 230, dur: 1.1, vol: 0.08, attack: 0.02 });
        tone({ type: 'square', f0: 620, f1: 980, dur: 1.0, vol: 0.03 });
        noise({ dur: 1.1, vol: 0.16, f0: 900, f1: 2600, type: 'bandpass', q: 1.1, attack: 0.02 });
      }
    },
    impact(el, k = 1) {
      if (el === 'fire') {
        noise({ dur: 0.6, vol: 0.2 * k, f0: 1200, f1: 200, attack: 0.02 });
        for (let i = 0; i < 4; i++) noise({ dur: 0.03, vol: 0.06 * k, f0: 3000, type: 'bandpass', q: 3, delay: 0.1 + i * rand(0.05, 0.12) });
      } else if (el === 'frost') {
        for (let i = 0; i < 4; i++) tone({ type: 'triangle', f0: rand(1800, 3200), dur: 0.08, vol: 0.05 * k, delay: i * 0.04 });
        noise({ dur: 0.4, vol: 0.1 * k, f0: 5000, f1: 2500, type: 'highpass' });
      } else if (el === 'sonic') {
        tone({ f0: 90, f1: 35, dur: 0.6, vol: 0.25 * k });
        noise({ dur: 0.7, vol: 0.22 * k, f0: 600, f1: 80 });
      } else if (el === 'water') {
        noise({ dur: 0.5, vol: 0.2 * k, f0: 1600, f1: 300, attack: 0.01 });
        for (let i = 0; i < 4; i++) tone({ f0: rand(700, 1300), f1: rand(1400, 2200), dur: 0.05, vol: 0.04 * k, delay: 0.06 + i * rand(0.03, 0.07) });
      } else if (el === 'lightning') {
        noise({ dur: 0.08, vol: 0.26 * k, f0: 8000, f1: 2000, type: 'highpass' });
        noise({ dur: 0.5, vol: 0.18 * k, f0: 1800, f1: 120, delay: 0.02 });
        for (let i = 0; i < 3; i++) noise({ dur: 0.03, vol: 0.06 * k, f0: 5000, type: 'bandpass', q: 3, delay: 0.08 + i * rand(0.04, 0.09) });
      } else {
        tone({ f0: 140, f1: 40, dur: 0.45, vol: 0.22 * k });
        noise({ dur: 0.55, vol: 0.28 * k, f0: 900, f1: 90 });
      }
    },
    freeze(k = 1) {
      tone({ type: 'triangle', f0: 2400, f1: 1600, dur: 0.3, vol: 0.05 * k });
      noise({ dur: 0.3, vol: 0.06 * k, f0: 6000, type: 'highpass' });
    },
    hiss(k = 1) { noise({ dur: 0.9, vol: 0.1 * k, f0: 5000, f1: 2500, type: 'highpass', attack: 0.05 }); },
    churn(k = 1) {
      noise({ dur: 1.6, vol: 0.14 * k, f0: 260, f1: 180, type: 'bandpass', q: 0.7, attack: 0.5 });
      noise({ dur: 1.4, vol: 0.05 * k, f0: 1400, f1: 900, type: 'bandpass', q: 1.2, attack: 0.4, delay: 0.2 });
    },
    gush() {
      noise({ dur: 1.3, vol: 0.28, f0: 300, f1: 2600, type: 'bandpass', q: 0.8, attack: 0.08 });
      tone({ f0: 70, f1: 140, dur: 1, vol: 0.18, attack: 0.05 });
    },
    whoosh() {
      noise({ dur: 0.45, vol: 0.16, f0: 300, f1: 1800, type: 'bandpass', q: 1.5, attack: 0.15 });
      noise({ dur: 0.5, vol: 0.16, f0: 1800, f1: 250, type: 'bandpass', q: 1.5, delay: 0.42, attack: 0.05 });
    },
    dolphin(k = 1) {
      for (let i = 0; i < 3; i++) tone({ f0: rand(1700, 2100), f1: rand(2500, 3200), dur: 0.07, vol: 0.05 * k, delay: i * 0.09 });
    },
    spout(k = 1) { noise({ dur: 1.1, vol: 0.14 * k, f0: 2400, f1: 700, type: 'bandpass', attack: 0.08 }); },
    whale(k = 1) {
      tone({ f0: 150, f1: 95, dur: 2.6, vol: 0.12 * k, attack: 0.6 });
      tone({ f0: 300, f1: 210, dur: 2.2, vol: 0.04 * k, attack: 0.6, delay: 0.3 });
    },
    pickup() {
      [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.08, delay: i * 0.07 }));
    },
    reward() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: i === 3 ? 0.4 : 0.14, vol: 0.09, delay: i * 0.09 }));
      tone({ type: 'square', f0: 1047, dur: 0.3, vol: 0.025, delay: 0.27 });
    },
    clang(k = 1) {
      tone({ type: 'square', f0: rand(1150, 1300), f1: 1100, dur: 0.18, vol: 0.04 * k });
      tone({ f0: rand(2400, 2700), dur: 0.45, vol: 0.05 * k });
      noise({ dur: 0.04, vol: 0.15 * k, f0: 4000, type: 'highpass' });
    },
    chop(k = 1) {
      tone({ type: 'triangle', f0: rand(200, 240), f1: 110, dur: 0.09, vol: 0.18 * k });
      noise({ dur: 0.07, vol: 0.22 * k, f0: 1400, type: 'bandpass', q: 2 });
    },
    swish(k = 1) { noise({ dur: 0.12, vol: 0.06 * k, f0: 900, f1: 2600, type: 'bandpass', q: 1.5, attack: 0.04 }); },
    twang() {
      tone({ type: 'triangle', f0: 520, f1: 300, dur: 0.18, vol: 0.08 });
      noise({ dur: 0.1, vol: 0.05, f0: 1600, f1: 3200, type: 'bandpass', q: 2 });
    },
    munch() {
      for (let i = 0; i < 3; i++) noise({ dur: 0.06, vol: 0.12, f0: rand(900, 1400), f1: 400, type: 'bandpass', q: 2, delay: i * 0.13 });
    },
    timber(k = 1) {
      tone({ type: 'sawtooth', f0: 95, f1: 60, dur: 0.55, vol: 0.05 * k, attack: 0.1 });
      noise({ dur: 0.5, vol: 0.06 * k, f0: 600, f1: 300, type: 'bandpass', q: 3, attack: 0.1 });
    },
    crash(k = 1) {
      noise({ dur: 0.6, vol: 0.3 * k, f0: 900, f1: 90 });
      tone({ f0: 90, f1: 40, dur: 0.4, vol: 0.2 * k });
      noise({ dur: 0.35, vol: 0.1 * k, f0: 3500, f1: 1500, type: 'highpass', delay: 0.05 });
    },
    smash(k = 1) {
      noise({ dur: 0.3, vol: 0.28 * k, f0: 1400, f1: 200 });
      tone({ type: 'triangle', f0: 180, f1: 70, dur: 0.18, vol: 0.18 * k });
      noise({ dur: 0.2, vol: 0.08 * k, f0: 3000, f1: 1200, type: 'bandpass', q: 2, delay: 0.08 });
    },
    drop() { tone({ type: 'triangle', f0: 420, f1: 220, dur: 0.1, vol: 0.08 }); },
    door() {
      tone({ type: 'sawtooth', f0: 210, f1: 150, dur: 0.22, vol: 0.025, attack: 0.05 });
      noise({ dur: 0.1, vol: 0.14, f0: 500, f1: 140, delay: 0.2 });
    },
    crack(k = 1) {
      noise({ dur: 0.06, vol: 0.2 * k, f0: 3500, type: 'highpass' });
      tone({ type: 'triangle', f0: 700, f1: 400, dur: 0.05, vol: 0.05 * k, delay: 0.03 });
    },
    hatch() {
      noise({ dur: 0.25, vol: 0.25, f0: 4000, f1: 1200, type: 'highpass' });
      [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.25, vol: 0.07, delay: 0.15 + i * 0.09 }));
      tone({ f0: 900, f1: 1500, dur: 0.12, vol: 0.08, delay: 0.6 });
      tone({ f0: 1100, f1: 1800, dur: 0.14, vol: 0.08, delay: 0.75 });
    },
    chirp(k = 1) {
      tone({ f0: rand(850, 1000), f1: rand(1400, 1700), dur: 0.09, vol: 0.07 * k });
      tone({ f0: rand(1000, 1200), f1: rand(1600, 1900), dur: 0.1, vol: 0.06 * k, delay: 0.12 });
    },
    // a low rumbling wobble, rising and falling like breathing
    purr(k = 1) {
      for (let i = 0; i < 7; i++) {
        tone({ type: 'triangle', f0: i % 2 ? 92 : 118, f1: i % 2 ? 108 : 96, dur: 0.11, vol: (0.07 + 0.03 * Math.sin((i / 6) * Math.PI)) * k, delay: i * 0.1, attack: 0.03 });
      }
      noise({ dur: 0.7, vol: 0.03 * k, f0: 260, f1: 180, attack: 0.1 });
    },
    whimper(k = 1) {
      tone({ f0: 900, f1: 620, dur: 0.22, vol: 0.06 * k, attack: 0.03 });
      tone({ f0: 760, f1: 520, dur: 0.26, vol: 0.05 * k, delay: 0.26, attack: 0.03 });
    },
    spit(k = 1) {
      noise({ dur: 0.14, vol: 0.18 * k, f0: 2400, f1: 900, type: 'bandpass', q: 1.5 });
      tone({ f0: 260, f1: 520, dur: 0.08, vol: 0.06 * k, delay: 0.02 });
    },
    gulp(k = 1) {
      tone({ f0: 420, f1: 160, dur: 0.12, vol: 0.12 * k });
      tone({ f0: 300, f1: 110, dur: 0.14, vol: 0.1 * k, delay: 0.14 });
    },
    grow(stage) {
      const base = 392 * 2 ** (stage / 6);
      [1, 1.25, 1.5, 2].forEach((m, i) => tone({ type: 'triangle', f0: base * m, dur: 0.2, vol: 0.07, delay: 0.1 + i * 0.08 }));
      noise({ dur: 0.4, vol: 0.08, f0: 3000, f1: 6000, type: 'highpass', attack: 0.1 });
    },
    rune(step) {
      // up a major scale, one note per stone woken
      const f = 392 * 2 ** ([0, 2, 4, 5, 7, 9, 11, 12, 14][(step - 1) % 9] / 12);
      tone({ type: 'triangle', f0: f, dur: 0.9, vol: 0.08, attack: 0.02 });
      tone({ f0: f * 2, dur: 1.2, vol: 0.03, attack: 0.05, delay: 0.05 });
    },
    rumble() {
      noise({ dur: 2.2, vol: 0.25, f0: 160, f1: 50, attack: 0.3 });
      tone({ type: 'sawtooth', f0: 55, f1: 40, dur: 1.8, vol: 0.06, attack: 0.3 });
    },
    baa(k = 1) {
      const f = rand(380, 460);
      for (let i = 0; i < 6; i++) {
        const [a, b] = i % 2 ? [1.05, 1] : [1, 1.05];
        tone({ type: 'sawtooth', f0: f * a, f1: f * b * (1 - i * 0.02), dur: 0.08, vol: 0.035 * k, delay: i * 0.065, attack: 0.02 });
      }
    },
    coin(k = 1) {
      tone({ type: 'square', f0: 1568, dur: 0.06, vol: 0.04 * k });
      tone({ type: 'square', f0: 2093, dur: 0.22, vol: 0.04 * k, delay: 0.06 });
    },
    cluck(k = 1) {
      const f = rand(520, 640);
      for (let i = 0; i < 3; i++) tone({ type: 'square', f0: f * (i === 2 ? 1.4 : 1), f1: f * 0.7, dur: 0.05, vol: 0.03 * k, delay: i * 0.09 });
      noise({ dur: 0.2, vol: 0.05 * k, f0: 1200, f1: 600, type: 'bandpass', q: 2, delay: 0.05 });
    },
    grunt(k = 1) {
      for (let i = 0; i < 2; i++) tone({ type: 'sawtooth', f0: rand(110, 130), f1: 70, dur: 0.12, vol: 0.06 * k, delay: i * 0.16, attack: 0.02 });
      noise({ dur: 0.25, vol: 0.06 * k, f0: 400, f1: 200, type: 'bandpass', q: 2 });
    },
    snort(k = 1) { noise({ dur: 0.28, vol: 0.09 * k, f0: 900, f1: 250, type: 'bandpass', q: 1.5, attack: 0.03 }); },
    bleat(k = 1) {
      const f = rand(560, 680);
      for (let i = 0; i < 4; i++) tone({ type: 'sawtooth', f0: f * (i % 2 ? 1.06 : 1), f1: f * 0.96, dur: 0.07, vol: 0.03 * k, delay: i * 0.06, attack: 0.02 });
    },
    yip(k = 1) {
      tone({ type: 'triangle', f0: rand(850, 950), f1: 1500, dur: 0.06, vol: 0.06 * k });
      tone({ type: 'triangle', f0: 1400, f1: 700, dur: 0.12, vol: 0.05 * k, delay: 0.07 });
    },
    croak(k = 1) {
      for (let i = 0; i < 2; i++) tone({ type: 'square', f0: rand(130, 150), f1: 100, dur: 0.09, vol: 0.04 * k, delay: i * 0.13 });
      noise({ dur: 0.2, vol: 0.03 * k, f0: 500, type: 'bandpass', q: 3 });
    },
    // the creatures of the night: a wolf's rising howl, an owl's hoo-hoo, a bat's squeak, a hedgehog's snuffle
    howl(k = 1) {
      const f = rand(300, 340);
      tone({ type: 'triangle', f0: f, f1: f * 1.7, dur: 0.6, vol: 0.05 * k, attack: 0.25 });
      tone({ type: 'triangle', f0: f * 1.7, f1: f * 1.15, dur: 1.5, vol: 0.05 * k, delay: 0.55, attack: 0.05 });
      tone({ f0: f * 3.4, f1: f * 2.3, dur: 1.4, vol: 0.012 * k, delay: 0.6, attack: 0.1 });
    },
    hoot(k = 1) {
      const f = rand(380, 420);
      for (const [d, len] of [[0, 0.28], [0.5, 0.12], [0.68, 0.36]]) tone({ f0: f, f1: f * 0.9, dur: len, vol: 0.06 * k, delay: d, attack: 0.04 });
    },
    squeak(k = 1) {
      for (let i = 0; i < 2; i++) tone({ f0: rand(3800, 4300), f1: 4800, dur: 0.035, vol: 0.025 * k, delay: i * 0.07 });
    },
    snuffle(k = 1) {
      for (let i = 0; i < 3; i++) noise({ dur: 0.07, vol: 0.05 * k, f0: rand(1200, 1700), type: 'bandpass', q: 4, delay: i * 0.11 });
    },
    // a penguin's braying honk, and the dry clicking of a scorpion rearing to sting
    honk(k = 1) {
      const f = rand(520, 600);
      for (let i = 0; i < 2; i++) tone({ type: 'sawtooth', f0: f, f1: f * 0.75, dur: 0.11, vol: 0.035 * k, delay: i * 0.15, attack: 0.02 });
    },
    rattle(k = 1) {
      for (let i = 0; i < 5; i++) noise({ dur: 0.03, vol: 0.07 * k, f0: rand(2600, 3400), type: 'bandpass', q: 5, delay: i * 0.06 });
    },
    // a ship's horn, low and long
    horn(k = 1) {
      tone({ type: 'sawtooth', f0: 110, f1: 104, dur: 1.4, vol: 0.06 * k, attack: 0.2 });
      tone({ type: 'triangle', f0: 165, f1: 156, dur: 1.4, vol: 0.05 * k, attack: 0.2 });
    },
    plip(k = 1, n = 1) {
      const f = 1500 + n * 220;
      tone({ f0: f, f1: f * 1.5, dur: 0.05, vol: 0.07 * k });
      noise({ dur: 0.06, vol: 0.08 * k, f0: 3500, type: 'highpass' });
    },
    sealion(k = 1) {
      for (let i = 0; i < 3; i++) {
        tone({ type: 'sawtooth', f0: rand(260, 300), f1: rand(170, 200), dur: 0.12, vol: 0.05 * k, delay: i * 0.22, attack: 0.02 });
        noise({ dur: 0.1, vol: 0.05 * k, f0: 700, type: 'bandpass', delay: i * 0.22 });
      }
    },
    orca(k = 1) {
      tone({ f0: rand(900, 1100), f1: rand(1700, 2000), dur: 0.25, vol: 0.04 * k, attack: 0.04 });
      tone({ f0: 1800, f1: 800, dur: 0.3, vol: 0.035 * k, delay: 0.26, attack: 0.03 });
    },
    bark(k = 1) {
      for (let i = 0; i < 2; i++) {
        tone({ type: 'square', f0: rand(620, 700), f1: rand(330, 380), dur: 0.07, vol: 0.05 * k, delay: i * 0.17 });
        noise({ dur: 0.05, vol: 0.06 * k, f0: 1400, type: 'bandpass', delay: i * 0.17 });
      }
    },
    stoke(k = 1) {
      noise({ dur: 0.5, vol: 0.16 * k, f0: 500, f1: 1800, type: 'lowpass', attack: 0.06 });
      for (let i = 0; i < 4; i++) noise({ dur: 0.03, vol: 0.12 * k, f0: 3000, type: 'highpass', delay: 0.1 + Math.random() * 0.4 });
    },
    babble(pitch, text, k = 1) {
      const n = Math.min(12, Math.max(2, Math.round(text.length / 3)));
      for (let i = 0; i < n; i++) {
        const f = pitch * rand(0.85, 1.3);
        tone({ type: 'square', f0: f, f1: f * rand(0.9, 1.1), dur: 0.055, vol: 0.035 * k, delay: i * 0.075 });
      }
    },
  };
})();
