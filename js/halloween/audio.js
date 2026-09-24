window.WC = window.WC || {};

(function () {
  const U = WC.U;
  const HW = (WC.Halloween = WC.Halloween || {});
  const A = WC.Audio._;
  const st = { music: false, nextNote: 0, step: 0, owls: false, nextOwl: 0, bats: false, nextSqueak: 0 };
  let loops = null;

  function ready() {
    if (!A.ctx) return false;
    if (!loops) buildLoops();
    return true;
  }

  function buildLoops() {
    const t = A.ctx.currentTime;
    const n = A.noise(t);
    const bp = A.filter('bandpass', 520, 9);
    [[0.13, 260], [0.37, 120]].forEach(([f, d]) => {
      const l = A.osc('sine', f, t), ld = A.gain(d);
      l.connect(ld); ld.connect(bp.frequency);
    });
    const howl = A.gain(0);
    n.connect(bp); bp.connect(howl); howl.connect(A.out(1, 0.5));
    const n2 = A.noise(t), lp = A.filter('lowpass', 90, 0.7), rumble = A.gain(0);
    n2.connect(lp); lp.connect(rumble); rumble.connect(A.out(1, 0.2));
    loops = { howl, rumble };
  }

  // ---- A creepy music-box lullaby in A minor ----
  const N = { A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, Gs4: 415.3, Gs5: 830.6, Ds5: 622.3, A5: 880, B5: 987.8 };
  const TUNE = [
    'A4', 'C5', 'E5', 'A5', 'Gs5', 'E5', 'C5', 'B4', 'A4', 'C5', 'E5', 'F5', 'E5', 'Ds5', 'E5', null,
    'A4', 'C5', 'E5', 'A5', 'B5', 'Gs5', 'E5', 'D5', 'C5', 'B4', 'A4', 'Gs4', 'A4', null, null, null,
  ];
  const STEP = 0.36;

  function tine(f, t, v) {
    const o = A.out(0.09 * v, 0.7);
    const detune = 1 + (Math.random() - 0.5) * 0.008;
    [[1, 1, 1.6], [3.01, 0.25, 0.4], [5.43, 0.1, 0.2]].forEach(([m, a, dec]) => {
      const s = A.osc('sine', f * m * detune, t, dec + 0.1);
      const g = A.gain(0.0001);
      A.env(g, t, 0.004, a, 0.01, dec);
      s.connect(g); g.connect(o);
    });
  }

  function owl() {
    const t0 = A.ctx.currentTime + 0.02;
    const o = A.out(0.12, 0.8, -0.6 + Math.random() * 1.2);
    [[0, 0.35], [0.55, 0.18], [0.8, 0.45]].forEach(([dt, dur]) => {
      const t = t0 + dt;
      const s = A.osc('sine', 390, t, dur + 0.1);
      s.frequency.linearRampToValueAtTime(350, t + dur);
      const lp = A.filter('lowpass', 900), g = A.gain(0.0001);
      A.env(g, t, 0.06, 1, dur - 0.08, 0.1);
      s.connect(lp); lp.connect(g); g.connect(o);
    });
  }

  function squeak(vol, pan) {
    const t = A.ctx.currentTime;
    const o = A.out(0.06 * (vol || 1), 0.3, pan === undefined ? Math.random() * 1.6 - 0.8 : pan);
    for (let i = 0; i < 2; i++) {
      const tt = t + i * 0.07;
      const s = A.osc('sine', 8200 + Math.random() * 1200, tt, 0.05);
      s.frequency.exponentialRampToValueAtTime(5200, tt + 0.04);
      const g = A.gain(0.0001);
      A.env(g, tt, 0.003, 1, 0.01, 0.03);
      s.connect(g); g.connect(o);
    }
  }

  // ---- The witch's cackle: a rising giggle, a cackle, then a long falling laugh ----
  function syllable(t, s, dest) {
    const src = A.osc('sawtooth', s.f, t, s.dur + 0.05);
    src.frequency.linearRampToValueAtTime(s.f * (s.fall || 0.86), t + s.dur);
    if (s.vib) {
      const v = A.osc('sine', 7, t, s.dur), vd = A.gain(s.f * 0.05);
      v.connect(vd); vd.connect(src.frequency);
    }
    const F = s.vowel === 'ee' ? [350, 2300] : [850, 1350];
    const f1 = A.filter('bandpass', F[0], 5), f2 = A.filter('bandpass', F[1], 7);
    const g2 = A.gain(0.8), env = A.gain(0.0001);
    A.env(env, t, 0.012, 0.9, Math.max(0.01, s.dur - 0.05), 0.06);
    src.connect(f1); src.connect(f2); f2.connect(g2);
    f1.connect(env); g2.connect(env); env.connect(dest);
    const n = A.noise(t, s.dur), nb = A.filter('bandpass', 1800, 1), ng = A.gain(0.0001);
    A.env(ng, t, 0.008, 0.3, 0.02, 0.05);
    n.connect(nb); nb.connect(ng); ng.connect(dest);
  }

  function cackle(opts) {
    opts = opts || {};
    const far = opts.dist === undefined ? 0.5 : opts.dist;
    const o = A.out(U.lerp(0.9, 0.4, far) * (opts.vol || 1), U.lerp(0.4, 1.1, far), opts.pan || 0);
    const lp = A.filter('lowpass', U.lerp(7000, 2600, far), 0.5);
    lp.connect(o);
    const syl = [];
    for (let i = 0; i < 5; i++) syl.push({ f: 620 + i * 60, dur: 0.1, gap: 0.05, vowel: 'ee' });
    for (let i = 0; i < 6; i++) syl.push({ f: 900 - i * 45, dur: 0.11, gap: 0.04, vowel: 'a' });
    syl.push({ f: 840, dur: 1.0, gap: 0, vowel: 'a', fall: 0.5, vib: true });
    let t = A.ctx.currentTime + 0.03;
    syl.forEach((s) => { syllable(t, s, lp); t += s.dur + s.gap; });
  }

  // ---- A groaning door creak (stick-slip friction through wood resonances) ----
  function creak(opts) {
    opts = opts || {};
    const D = opts.dur || 1.8;
    const t = A.ctx.currentTime + 0.02;
    const o = A.out(0.55 * (opts.vol || 1), 0.35, opts.pan || 0);
    const src = A.osc('sawtooth', 38, t, D);
    [[0.3, 55], [0.7, 30], [1.1, 72], [1.5, 44], [1.8, 26]].forEach(([x, f]) => src.frequency.linearRampToValueAtTime(f, t + (x * D) / 1.8));
    const g = A.gain(0.0001);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + 0.15);
    g.gain.setValueAtTime(1, t + D - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + D);
    [[700, 12], [1500, 14], [2600, 10]].forEach(([f, q], i) => {
      const b = A.filter('bandpass', f, q);
      if (i === 0) { b.frequency.linearRampToValueAtTime(900, t + D * 0.5); b.frequency.linearRampToValueAtTime(640, t + D); }
      src.connect(b); b.connect(g);
    });
    g.connect(o);
  }

  // ---- An eerie, drawn-out "mrrrOWWW" ----
  function meow(pitch, vol, pan) {
    const p = pitch || 1;
    const t = A.ctx.currentTime + 0.02 + Math.random() * 0.1;
    const s = A.osc('sawtooth', 420 * p, t, 1.1);
    s.frequency.linearRampToValueAtTime(640 * p, t + 0.35);
    s.frequency.linearRampToValueAtTime(380 * p, t + 0.95);
    const v = A.osc('sine', 6, t, 1.1), vd = A.gain(14 * p);
    v.connect(vd); vd.connect(s.frequency);
    const f1 = A.filter('bandpass', 500, 4), f2 = A.filter('bandpass', 1200, 6), g2 = A.gain(0.6);
    f1.frequency.linearRampToValueAtTime(900, t + 0.35); f1.frequency.linearRampToValueAtTime(450, t + 0.95);
    f2.frequency.linearRampToValueAtTime(1600, t + 0.35); f2.frequency.linearRampToValueAtTime(900, t + 0.95);
    const env = A.gain(0.0001);
    A.env(env, t, 0.08, 0.7, 0.65, 0.25);
    s.connect(f1); s.connect(f2); f2.connect(g2);
    f1.connect(env); g2.connect(env);
    env.connect(A.out(0.3 * (vol || 1), 0.5, pan === undefined ? Math.random() * 1.4 - 0.7 : pan));
  }

  function growl(vol) {
    const t = A.ctx.currentTime + 0.02;
    const o = A.out(0.9 * (vol || 1), 0.35);
    const n = A.noise(t, 2.6), lp = A.filter('lowpass', 190, 1), am = A.gain(0.5);
    const l = A.osc('sine', 27, t, 2.6), ld = A.gain(0.5);
    l.connect(ld); ld.connect(am.gain);
    const s = A.osc('sawtooth', 52, t, 2.6), slp = A.filter('lowpass', 260), sg = A.gain(0.35);
    s.frequency.linearRampToValueAtTime(44, t + 2.4);
    const env = A.gain(0.0001);
    A.env(env, t, 0.5, 1, 1.4, 0.6);
    n.connect(lp); lp.connect(am); am.connect(env);
    s.connect(slp); slp.connect(sg); sg.connect(env);
    env.connect(o);
  }

  function thunder(vol) {
    const t = A.ctx.currentTime + 0.02;
    const n = A.noise(t, 4), lp = A.filter('lowpass', 140, 0.8), g = A.gain(0.0001);
    lp.frequency.linearRampToValueAtTime(60, t + 3.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.9 * (vol || 1), t + 0.4);
    g.gain.linearRampToValueAtTime(0.5 * (vol || 1), t + 1.2);
    g.gain.linearRampToValueAtTime(0.7 * (vol || 1), t + 1.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    n.connect(lp); lp.connect(g); g.connect(A.out(1, 0.6));
  }

  const safe = (fn) => (...args) => { if (ready()) fn(...args); };

  HW.Sound = {
    wind: safe((level, time) => {
      A.ramp(loops.howl.gain, 0.22 * level, time || 2);
      A.ramp(loops.rumble.gain, 0.25 * level, time || 2);
    }),
    music(on) {
      if (on && !st.music && A.ctx) { st.nextNote = A.ctx.currentTime + 0.1; st.step = 0; }
      st.music = on;
    },
    owls(on) { st.owls = on; },
    bats(on) { st.bats = on; },
    cackle: safe(cackle), creak: safe(creak), meow: safe(meow), growl: safe(growl),
    thunder: safe(thunder), squeak: safe(squeak), owl: safe(owl),
    update() {
      if (!ready()) return;
      const now = A.ctx.currentTime;
      if (st.music) {
        while (st.nextNote < now + 0.12) {
          const n = TUNE[st.step % TUNE.length];
          if (n) tine(N[n], Math.max(now, st.nextNote), 1);
          if (st.step % 8 === 0) tine(N.A4 / 4, Math.max(now, st.nextNote), 0.7);
          st.step++;
          st.nextNote += STEP;
        }
      }
      if (st.owls && now >= st.nextOwl) { if (st.nextOwl > 0) owl(); st.nextOwl = now + 6 + Math.random() * 6; }
      if (st.bats && now >= st.nextSqueak) { squeak(); st.nextSqueak = now + 0.3 + Math.random() * 1.2; }
    },
    reset() {
      st.music = false; st.owls = false; st.bats = false; st.nextOwl = 0;
      if (loops) { A.ramp(loops.howl.gain, 0, 0.3); A.ramp(loops.rumble.gain, 0, 0.3); }
    },
  };
})();
