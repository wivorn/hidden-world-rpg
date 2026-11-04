// Synthesized sound effects and ambience; no audio files needed.
const Sfx = (() => {
  let ac = null;
  let master = null;
  let noiseBuf = null;
  let muted = false;
  let waves = null;
  let wind = null;
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
    fire() {
      noise({ dur: 0.45, vol: 0.18, f0: 1600, f1: 350, type: 'bandpass', q: 0.8, attack: 0.02 });
      tone({ type: 'sawtooth', f0: 110, f1: 60, dur: 0.4, vol: 0.05 });
    },
    boom(k = 1) {
      noise({ dur: 0.8, vol: 0.32 * k, f0: 1000, f1: 80 });
      for (let i = 0; i < 9; i++) noise({ dur: 0.03, vol: 0.08 * k, f0: rand(3000, 6000), type: 'highpass', delay: 0.15 + Math.random() * 0.6 });
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
    babble(pitch, text, k = 1) {
      const n = Math.min(12, Math.max(2, Math.round(text.length / 3)));
      for (let i = 0; i < n; i++) {
        const f = pitch * rand(0.85, 1.3);
        tone({ type: 'square', f0: f, f1: f * rand(0.9, 1.1), dur: 0.055, vol: 0.035 * k, delay: i * 0.075 });
      }
    },
  };
})();
