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
    plasma() {
      tone({ type: 'square', f0: 1100, f1: 180, dur: 0.28, vol: 0.06 });
      noise({ dur: 0.35, vol: 0.14, f0: 2400, f1: 500, type: 'bandpass', q: 1.2, attack: 0.01 });
    },
    blast(k = 1) {
      tone({ f0: 140, f1: 40, dur: 0.45, vol: 0.22 * k });
      noise({ dur: 0.55, vol: 0.28 * k, f0: 900, f1: 90 });
    },
    hiss(k = 1) { noise({ dur: 0.9, vol: 0.1 * k, f0: 5000, f1: 2500, type: 'highpass', attack: 0.05 }); },
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
