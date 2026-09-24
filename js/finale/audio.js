window.WC = window.WC || {};

(function () {
  const FW = (WC.Finale = WC.Finale || {});
  const A = WC.Audio._;
  const st = { bubbles: 0, nextBubble: 0, birds: false, nextBird: 0 };
  let simmer = null;

  function ready() {
    if (!A.ctx) return false;
    if (!simmer) {
      const n = A.noise(A.ctx.currentTime), lp = A.filter('lowpass', 220, 0.8);
      simmer = A.gain(0);
      n.connect(lp); lp.connect(simmer); simmer.connect(A.out(1, 0.2));
    }
    return true;
  }

  function bubble() {
    const t = A.ctx.currentTime;
    const f = 180 + Math.random() * 380;
    const s = A.osc('sine', f, t, 0.12);
    s.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.08);
    const g = A.gain(0.0001);
    A.env(g, t, 0.005, 0.5, 0.02, 0.06);
    s.connect(g); g.connect(A.out(0.12 * st.bubbles, 0.3, Math.random() * 0.6 - 0.3));
  }

  function smash(vol) {
    const v = vol || 1;
    const t = A.ctx.currentTime + 0.01;
    const n = A.noise(t, 0.4), hp = A.filter('highpass', 2500), g = A.gain(0.0001);
    A.env(g, t, 0.003, 0.9 * v, 0.03, 0.28);
    n.connect(hp); hp.connect(g); g.connect(A.out(1, 0.35));
    for (let i = 0; i < 7; i++) {
      const tt = t + 0.02 + Math.random() * 0.35;
      const s = A.osc('sine', 3000 + Math.random() * 3500, tt, 0.2), sg = A.gain(0.0001);
      A.env(sg, tt, 0.002, 0.18 * v, 0.01, 0.15);
      s.connect(sg); sg.connect(A.out(1, 0.4, Math.random() * 1.2 - 0.6));
    }
  }

  function slam(vol) {
    const v = vol || 1;
    const t = A.ctx.currentTime + 0.01;
    const s = A.osc('sine', 90, t, 0.35), g = A.gain(0.0001);
    s.frequency.exponentialRampToValueAtTime(38, t + 0.2);
    A.env(g, t, 0.004, v, 0.03, 0.25);
    s.connect(g); g.connect(A.out(1, 0.3));
    const n = A.noise(t, 0.2), lp = A.filter('lowpass', 900), ng = A.gain(0.0001);
    A.env(ng, t, 0.003, 0.7 * v, 0.02, 0.12);
    n.connect(lp); lp.connect(ng); ng.connect(A.out(1, 0.3));
    for (let i = 0; i < 4; i++) {
      const tt = t + 0.08 + i * 0.05;
      const c = A.noise(tt, 0.02), bp = A.filter('bandpass', 2400, 6), cg = A.gain(0.0001);
      A.env(cg, tt, 0.002, 0.3 * v, 0.003, 0.02);
      c.connect(bp); bp.connect(cg); cg.connect(A.out(1, 0.2));
    }
  }

  // Four claws dragged down wood.
  function scrape(vol) {
    const t0 = A.ctx.currentTime + 0.01;
    for (let i = 0; i < 4; i++) {
      const t = t0 + i * 0.07;
      const n = A.noise(t, 0.25), bp = A.filter('bandpass', 1800, 4), g = A.gain(0.0001);
      bp.frequency.exponentialRampToValueAtTime(5200, t + 0.18);
      A.env(g, t, 0.01, 0.6 * (vol || 1), 0.1, 0.08);
      n.connect(bp); bp.connect(g); g.connect(A.out(1, 0.25));
    }
  }

  // A potion taking effect: fizzing sparkle and a falling magic tone.
  function fizz(vol) {
    const v = vol || 1;
    const t = A.ctx.currentTime + 0.01;
    const n = A.noise(t, 1.4), bp = A.filter('bandpass', 6000, 1.2), am = A.gain(0.6), g = A.gain(0.0001);
    const l = A.osc('square', 23, t, 1.4), ld = A.gain(0.4);
    l.connect(ld); ld.connect(am.gain);
    A.env(g, t, 0.02, 0.5 * v, 0.8, 0.5);
    n.connect(bp); bp.connect(am); am.connect(g); g.connect(A.out(1, 0.5));
    const s = A.osc('sine', 1400, t, 1.3), sg = A.gain(0.0001);
    s.frequency.exponentialRampToValueAtTime(260, t + 1.2);
    A.env(sg, t, 0.02, 0.2 * v, 0.8, 0.4);
    s.connect(sg); sg.connect(A.out(1, 0.6));
  }

  function whoosh() {
    const t = A.ctx.currentTime + 0.01;
    const n = A.noise(t, 0.3), bp = A.filter('bandpass', 2500, 1.2), g = A.gain(0.0001);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    A.env(g, t, 0.03, 0.5, 0.05, 0.15);
    n.connect(bp); bp.connect(g); g.connect(A.out(1, 0.2));
  }

  // The witch, struck: a rising then falling screech.
  function shriek() {
    const t = A.ctx.currentTime + 0.01;
    const o = A.osc('sawtooth', 700, t, 0.8);
    o.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.7);
    const vib = A.osc('sine', 28, t, 0.8), vg = A.gain(40);
    vib.connect(vg); vg.connect(o.frequency);
    const bp = A.filter('bandpass', 1800, 2.5), g = A.gain(0.0001);
    A.env(g, t, 0.02, 0.35, 0.3, 0.35);
    o.connect(bp); bp.connect(g); g.connect(A.out(1, 0.4));
  }

  function crunch() {
    const t0 = A.ctx.currentTime + 0.01;
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.09;
      const n = A.noise(t, 0.06), bp = A.filter('bandpass', 1500 + Math.random() * 1500, 1.5), g = A.gain(0.0001);
      A.env(g, t, 0.003, 0.6, 0.02, 0.04);
      n.connect(bp); bp.connect(g); g.connect(A.out(1, 0.1));
    }
  }

  // The curse lifting: a rising shimmer of chimes.
  function cure() {
    const t0 = A.ctx.currentTime + 0.02;
    [523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => {
      const t = t0 + i * 0.22;
      [['triangle', 1, 1], ['sine', 2, 0.3]].forEach(([type, m, a]) => {
        const s = A.osc(type, f * m, t, 2), g = A.gain(0.0001);
        A.env(g, t, 0.01, 0.14 * a, 0.05, 1.6);
        s.connect(g); g.connect(A.out(1, 0.8));
      });
    });
    const n = A.noise(t0, 2.2), bp = A.filter('bandpass', 400, 2), g = A.gain(0.0001);
    bp.frequency.exponentialRampToValueAtTime(5000, t0 + 2.0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 1.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    n.connect(bp); bp.connect(g); g.connect(A.out(1, 0.6));
  }

  function bird() {
    const t = A.ctx.currentTime + 0.01;
    const f = 2600 + Math.random() * 1800;
    const o = A.out(0.08, 0.35, Math.random() * 1.6 - 0.8);
    const notes = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < notes; i++) {
      const tt = t + i * 0.12;
      const s = A.osc('sine', f * (1 + (i % 2) * 0.12), tt, 0.1), g = A.gain(0.0001);
      s.frequency.exponentialRampToValueAtTime(f * (i % 2 ? 0.9 : 1.25), tt + 0.08);
      A.env(g, tt, 0.005, 1, 0.03, 0.05);
      s.connect(g); g.connect(o);
    }
  }

  const safe = (fn) => (...args) => { if (ready()) fn(...args); };

  FW.Sound = {
    bubbling(level) {
      st.bubbles = level;
      if (ready()) A.ramp(simmer.gain, 0.12 * level, 0.5);
    },
    birds(on) { st.birds = on; },
    smash: safe(smash), slam: safe(slam), scrape: safe(scrape), fizz: safe(fizz), crunch: safe(crunch), cure: safe(cure),
    whoosh: safe(whoosh), shriek: safe(shriek),
    update() {
      if (!ready()) return;
      const now = A.ctx.currentTime;
      if (st.bubbles > 0 && now >= st.nextBubble) {
        bubble();
        st.nextBubble = now + (0.08 + Math.random() * 0.3) / Math.max(0.3, st.bubbles);
      }
      if (st.birds && now >= st.nextBird) { bird(); st.nextBird = now + 0.6 + Math.random() * 1.8; }
    },
    reset() {
      st.bubbles = 0;
      st.birds = false;
      if (simmer) A.ramp(simmer.gain, 0, 0.3);
    },
  };
})();
