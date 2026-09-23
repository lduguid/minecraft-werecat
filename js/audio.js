(function () {
  const U = WC.U;
  let ctx = null, master = null, reverbSend = null, noiseBuf = null;
  let muted = false;
  const loops = {};
  const st = { crickets: false, nextChirp: 0, piano: false, nextNote: 0, bpm: 0, hbVol: 1, nextBeat: 0 };

  function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function filter(type, f, q) {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    if (q !== undefined) b.Q.value = q;
    return b;
  }
  function osc(type, f, t, dur) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.start(t);
    if (dur !== undefined) o.stop(t + dur + 0.1);
    return o;
  }
  function noise(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    s.start(t, Math.random() * 1.5);
    if (dur !== undefined) s.stop(t + dur + 0.1);
    return s;
  }
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  // A destination with dry level, reverb send and optional stereo pan.
  function out(level, wet, pan) {
    const g = gain(level);
    let node = g;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      node = p;
    }
    node.connect(master);
    if (wet) { const w = gain(wet); node.connect(w); w.connect(reverbSend); }
    return g;
  }
  function ramp(param, v, time) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(v, t + (time || 1));
  }
  function shaperCurve(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    return c;
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    master = gain(muted ? 0 : 0.9);
    master.connect(comp);
    comp.connect(ctx.destination);

    const len = ctx.sampleRate * 3.8;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = ir;
    reverbSend = gain(0.8);
    reverbSend.connect(reverb);
    reverb.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    buildLoops();
  }

  function buildLoops() {
    const t = ctx.currentTime;
    // Wind
    const wn = noise(t);
    const wlp = filter('lowpass', 380, 0.8);
    const wg = gain(0);
    const lfo = osc('sine', 0.07, t);
    const lfoDepth = gain(180);
    lfo.connect(lfoDepth);
    lfoDepth.connect(wlp.frequency);
    wn.connect(wlp); wlp.connect(wg); wg.connect(out(1, 0.2));
    loops.wind = wg;

    // Low dread drone
    const dg = gain(0);
    const dlp = filter('lowpass', 170, 0.9);
    [55, 55.4, 41.2].forEach((f, i) => osc(i === 2 ? 'sine' : 'sawtooth', f, t).connect(dlp));
    const eerie = osc('sine', 880, t);
    const ev = osc('sine', 0.3, t), evd = gain(12);
    ev.connect(evd); evd.connect(eerie.frequency);
    const eg = gain(0.012);
    eerie.connect(eg); eg.connect(dg);
    dlp.connect(dg); dg.connect(out(1, 0.4));
    loops.drone = dg;

    // Chase tremolo strings
    const cg = gain(0);
    const clp = filter('lowpass', 900, 0.8);
    const trem = gain(0.5);
    const tl = osc('sine', 7.5, t), tld = gain(0.5);
    tl.connect(tld); tld.connect(trem.gain);
    [82.4, 87.3, 164.8].forEach((f) => osc('sawtooth', f, t).connect(clp));
    clp.connect(trem); trem.connect(cg); cg.connect(out(1, 0.3));
    loops.chase = cg;
  }

  // ------------------------------------------------------------ scheduled textures
  function chirp() {
    const t = ctx.currentTime;
    const f = 4200 + Math.random() * 600;
    const o = out(0.05, 0.2, Math.random() * 1.6 - 0.8);
    for (let i = 0; i < 3; i++) {
      const s = osc('sine', f, t + i * 0.05, 0.03);
      const g = gain(0.0001);
      env(g, t + i * 0.05, 0.005, 1, 0.01, 0.02);
      s.connect(g); g.connect(o);
    }
  }

  const PENT = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0];
  function pianoNote(f, v) {
    const t = ctx.currentTime;
    const o = out(0.1 * v, 0.6);
    const lp = filter('lowpass', 2600, 0.5);
    lp.connect(o);
    [['triangle', 1, 1], ['sine', 2, 0.25], ['sine', 3, 0.08]].forEach(([type, m, a]) => {
      const s = osc(type, f * m, t, 3);
      const g = gain(0.0001);
      env(g, t, 0.01, a, 0.02, 2.6);
      s.connect(g); g.connect(lp);
    });
  }

  function thump(t, v) {
    const s = osc('sine', 64, t, 0.35);
    s.frequency.exponentialRampToValueAtTime(36, t + 0.16);
    const g = gain(0.0001);
    env(g, t, 0.008, 0.9 * v * st.hbVol, 0.02, 0.22);
    s.connect(g); g.connect(out(1, 0.05));
  }

  // ------------------------------------------------------------ one-shots
  function zombie(vol, pan) {
    const t = ctx.currentTime + 0.02;
    const o = out(0.5 * (vol || 1), 0.35, pan);
    const bp = filter('bandpass', 420, 2.2), lp = filter('lowpass', 1100);
    bp.connect(lp);
    const g = gain(0.0001);
    env(g, t, 0.2, 1, 0.7, 0.5);
    lp.connect(g); g.connect(o);
    const s = osc('sawtooth', 95, t, 1.5);
    s.frequency.linearRampToValueAtTime(78, t + 0.5);
    s.frequency.linearRampToValueAtTime(108, t + 0.9);
    s.frequency.linearRampToValueAtTime(66, t + 1.4);
    const v = osc('sine', 5, t, 1.5), vd = gain(5);
    v.connect(vd); vd.connect(s.frequency);
    s.connect(bp);
    const n = noise(t, 1.5), nb = filter('bandpass', 700, 1.5), ng = gain(0.25);
    n.connect(nb); nb.connect(ng); ng.connect(bp);
  }

  function skeleton(vol, pan) {
    let t = ctx.currentTime + 0.02;
    const o = out(0.4 * (vol || 1), 0.25, pan);
    for (let i = 0; i < 10; i++) {
      const n = noise(t, 0.03), bp = filter('bandpass', 2200 + Math.random() * 1600, 6), g = gain(0.0001);
      env(g, t, 0.002, 1, 0.005, 0.03);
      n.connect(bp); bp.connect(g); g.connect(o);
      t += 0.04 + Math.random() * 0.06;
    }
  }

  function spider(vol, pan) {
    const t = ctx.currentTime + 0.02;
    const o = out(0.35 * (vol || 1), 0.25, pan);
    const n = noise(t, 0.9), bp = filter('bandpass', 3400, 1.4), am = gain(0.5), g = gain(0.0001);
    const l = osc('square', 17, t, 0.9), ld = gain(0.5);
    l.connect(ld); ld.connect(am.gain);
    env(g, t, 0.05, 1, 0.5, 0.3);
    n.connect(bp); bp.connect(am); am.connect(g); g.connect(o);
  }

  function enderman(vol, pan) {
    const t = ctx.currentTime + 0.02;
    const o = out(0.35 * (vol || 1), 0.7, pan);
    const s = osc('triangle', 260, t, 0.7);
    s.frequency.exponentialRampToValueAtTime(1300, t + 0.22);
    s.frequency.exponentialRampToValueAtTime(180, t + 0.6);
    const bp = filter('bandpass', 900, 1.2), g = gain(0.0001);
    env(g, t, 0.03, 1, 0.25, 0.3);
    s.connect(bp); bp.connect(g); g.connect(o);
  }

  function villager(kind, vol, pan) {
    const t = ctx.currentTime + 0.02;
    const C = {
      hmm: { base: 190, a: 1.05, b: 0.9, dur: 0.42 },
      question: { base: 180, a: 0.95, b: 1.4, dur: 0.5 },
      panic: { base: 260, a: 1.2, b: 0.95, dur: 0.24 },
      hurt: { base: 300, a: 1.3, b: 0.75, dur: 0.3 },
    }[kind || 'hmm'];
    const o = out(0.5 * (vol || 1), 0.15, pan);
    const s = osc('sawtooth', C.base * C.a, t, C.dur + 0.2);
    s.frequency.linearRampToValueAtTime(C.base * C.b, t + C.dur);
    const vb = osc('sine', 7, t, C.dur + 0.2), vbd = gain(4);
    vb.connect(vbd); vbd.connect(s.frequency);
    const f1 = filter('bandpass', 520, 3), f2 = filter('bandpass', 1050, 7), lp = filter('lowpass', 2000);
    const g2 = gain(0.8);
    s.connect(f1); s.connect(f2); f2.connect(g2);
    f1.connect(lp); g2.connect(lp);
    const g = gain(0.0001);
    env(g, t, 0.03, 1, C.dur - 0.1, 0.12);
    lp.connect(g); g.connect(o);
  }

  function step(vol, heavy) {
    const t = ctx.currentTime;
    const o = out(0.22 * (vol || 1), 0.05);
    const n = noise(t, 0.12), bp = filter('bandpass', heavy ? 500 : 1500, 0.8), g = gain(0.0001);
    env(g, t, 0.005, 1, 0.02, heavy ? 0.12 : 0.07);
    n.connect(bp); bp.connect(g); g.connect(o);
    if (heavy) thump(t, 0.35);
  }

  function poof(vol) {
    const t = ctx.currentTime;
    const n = noise(t, 0.3), lp = filter('lowpass', 900), g = gain(0.0001);
    env(g, t, 0.01, 0.5 * (vol || 1), 0.03, 0.2);
    n.connect(lp); lp.connect(g); g.connect(out(1, 0.3));
  }

  function catHiss() {
    const t = ctx.currentTime + 0.02;
    const n = noise(t, 0.8), hp = filter('highpass', 2500), bp = filter('bandpass', 5200, 0.7), g = gain(0.0001);
    env(g, t, 0.015, 0.6, 0.45, 0.2);
    n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out(1, 0.2));
  }

  function catMeow() {
    const t = ctx.currentTime + 0.02;
    const s = osc('sawtooth', 620, t, 0.7);
    s.frequency.linearRampToValueAtTime(900, t + 0.2);
    s.frequency.linearRampToValueAtTime(520, t + 0.6);
    const f1 = filter('bandpass', 800, 4), g = gain(0.0001);
    f1.frequency.linearRampToValueAtTime(1100, t + 0.2);
    f1.frequency.linearRampToValueAtTime(600, t + 0.6);
    env(g, t, 0.04, 0.8, 0.35, 0.2);
    s.connect(f1); f1.connect(g); g.connect(out(0.35, 0.3));
  }

  function boom(vol) {
    const t = ctx.currentTime + 0.02;
    const s = osc('sine', 62, t, 1.6);
    s.frequency.exponentialRampToValueAtTime(26, t + 1.3);
    const g = gain(0.0001);
    env(g, t, 0.01, 1 * (vol || 1), 0.1, 1.3);
    s.connect(g); g.connect(out(1, 0.5));
    const n = noise(t, 0.8), lp = filter('lowpass', 220), ng = gain(0.0001);
    env(ng, t, 0.01, 0.8 * (vol || 1), 0.05, 0.6);
    n.connect(lp); lp.connect(ng); ng.connect(out(1, 0.4));
  }

  function stinger() {
    const t = ctx.currentTime + 0.02;
    const lp = filter('lowpass', 4000, 1);
    lp.frequency.exponentialRampToValueAtTime(700, t + 2.5);
    const g = gain(0.0001);
    env(g, t, 0.02, 0.3, 0.3, 2.4);
    [233.1, 246.9, 349.2, 370.0, 116.5].forEach((f) => osc('sawtooth', f, t, 3).connect(lp));
    lp.connect(g); g.connect(out(1, 0.6));
    boom(0.9);
  }

  function transform() {
    const t = ctx.currentTime + 0.02;
    const n = noise(t, 2.4), bp = filter('bandpass', 200, 3), g = gain(0.0001);
    bp.frequency.exponentialRampToValueAtTime(3200, t + 2.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 2.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    n.connect(bp); bp.connect(g); g.connect(out(1, 0.5));
    const gr = noise(t, 2.4), glp = filter('lowpass', 200), gam = gain(0.5), gl = osc('sine', 29, t, 2.4), gld = gain(0.5), ge = gain(0.0001);
    gl.connect(gld); gld.connect(gam.gain);
    env(ge, t, 1.2, 0.9, 0.8, 0.4);
    gr.connect(glp); glp.connect(gam); gam.connect(ge); ge.connect(out(1, 0.3));
  }

  // The werecat: a monstrous "mrrrAAAOOOWWWW" that is half wolf howl, half cat yowl.
  function howl(opts) {
    opts = opts || {};
    const far = opts.dist === undefined ? 0.5 : opts.dist;
    const D = opts.dur || 4.4;
    const pm = opts.pitch || 1;
    const t0 = ctx.currentTime + 0.03;
    const P = (x) => t0 + x * (D / 4.4);

    const outG = out(U.lerp(1.0, 0.5, far) * (opts.vol || 1), U.lerp(0.5, 1.3, far), opts.pan || 0);
    const distLP = filter('lowpass', U.lerp(9000, 1800, far), 0.5);
    distLP.connect(outG);
    const shaper = ctx.createWaveShaper();
    shaper.curve = shaperCurve(6);
    shaper.oversample = '2x';
    const amp = gain(0.0001);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(0.75, P(0.1));
    amp.gain.linearRampToValueAtTime(0.8, P(1.2));
    amp.gain.linearRampToValueAtTime(1.0, P(2.0));
    amp.gain.linearRampToValueAtTime(0.85, P(2.9));
    amp.gain.exponentialRampToValueAtTime(0.0001, P(4.4));
    shaper.connect(amp); amp.connect(distLP);
    const pre = gain(0.5);
    pre.connect(shaper);

    const f1 = filter('bandpass', 300, 6), f2 = filter('bandpass', 900, 8), lp = filter('lowpass', 1100, 0.7);
    const g1 = gain(1), g2 = gain(0.7), g3 = gain(0.35);
    f1.connect(g1); f2.connect(g2); lp.connect(g3);
    g1.connect(pre); g2.connect(pre); g3.connect(pre);
    const F1 = [[0, 300], [0.45, 380], [1.1, 850], [1.6, 820], [2.4, 520], [2.9, 480], [4.3, 300]];
    const F2 = [[0, 900], [0.45, 1000], [1.1, 1450], [1.6, 1300], [2.4, 950], [2.9, 900], [4.3, 620]];
    const automate = (param, pts, m) => {
      param.setValueAtTime(pts[0][1] * m, t0);
      pts.slice(1).forEach(([x, v]) => param.linearRampToValueAtTime(v * m, P(x)));
    };
    automate(f1.frequency, F1, 1);
    automate(f2.frequency, F2, 1);

    const voice = gain(1);
    voice.connect(f1); voice.connect(f2); voice.connect(lp);
    const trill = gain(0.65);
    trill.connect(voice);
    const tl = osc('square', 26, t0, D), tld = gain(0);
    tld.gain.setValueAtTime(0.35, t0);
    tld.gain.linearRampToValueAtTime(0, P(0.55));
    tl.connect(tld); tld.connect(trill.gain);

    const vib = osc('sine', 5.2, t0, D), vibDepth = gain(0);
    vibDepth.gain.setValueAtTime(0, t0);
    vibDepth.gain.linearRampToValueAtTime(0, P(1.1));
    vibDepth.gain.linearRampToValueAtTime(22, P(1.8));
    vibDepth.gain.linearRampToValueAtTime(32, P(3.2));
    vib.connect(vibDepth);

    const pitch = [[0, 290], [0.45, 350], [1.15, 700], [1.9, 670], [2.9, 620], [4.35, 200]];
    [['sawtooth', 1, 0.5], ['sawtooth', 0.5, 0.5], ['square', 1.007, 0.12], ['sawtooth', 0.501, 0.25], ['sine', 0.25, 0.6]].forEach(([type, m, a]) => {
      const o = osc(type, pitch[0][1] * m * pm, t0, D);
      pitch.slice(1).forEach(([x, f]) => o.frequency.exponentialRampToValueAtTime(f * m * pm, P(x)));
      const vd = gain(m);
      vibDepth.connect(vd); vd.connect(o.frequency);
      const og = gain(a);
      o.connect(og); og.connect(trill);
    });

    const n = noise(t0, D), nbp = filter('bandpass', 900, 1.2), ng = gain(0.0001);
    automate(nbp.frequency, F1, 1.3);
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.linearRampToValueAtTime(0.2, P(1.0));
    ng.gain.linearRampToValueAtTime(0.28, P(2.0));
    ng.gain.exponentialRampToValueAtTime(0.0001, P(4.4));
    n.connect(nbp); nbp.connect(ng); ng.connect(pre);

    const gn = noise(t0, D), glp = filter('lowpass', 220, 1), gam = gain(0.5);
    const gl = osc('sine', 31, t0, D), gd = gain(0.5);
    gl.connect(gd); gd.connect(gam.gain);
    const ge = gain(0.0001);
    ge.gain.setValueAtTime(0.0001, t0);
    ge.gain.linearRampToValueAtTime(0.9, P(0.3));
    ge.gain.linearRampToValueAtTime(0.5, P(1.2));
    ge.gain.linearRampToValueAtTime(0.7, P(3.2));
    ge.gain.exponentialRampToValueAtTime(0.0001, P(4.4));
    gn.connect(glp); glp.connect(gam); gam.connect(ge); ge.connect(distLP);
  }

  const safe = (fn) => (...args) => { if (ctx) fn(...args); };

  WC.Audio = {
    init,
    get ready() { return !!ctx; },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    setMuted(m) { muted = m; if (ctx) ramp(master.gain, m ? 0 : 0.9, 0.2); },
    isMuted() { return muted; },
    wind: safe((level, time) => ramp(loops.wind.gain, 0.35 * level, time || 2)),
    drone: safe((level, time) => ramp(loops.drone.gain, 0.5 * level, time || 3)),
    chase: safe((level, time) => ramp(loops.chase.gain, 0.12 * level, time || 1.5)),
    crickets(on) { st.crickets = on; },
    piano(on) { st.piano = on; },
    heartbeat(bpm, vol) { st.bpm = bpm; st.hbVol = vol === undefined ? 1 : vol; },
    update() {
      if (!ctx) return;
      const now = ctx.currentTime;
      if (st.crickets && now >= st.nextChirp) { chirp(); st.nextChirp = now + 0.18 + Math.random() * 0.7; }
      if (st.piano && now >= st.nextNote) {
        pianoNote(PENT[(Math.random() * PENT.length) | 0], 1);
        if (Math.random() < 0.35) pianoNote(PENT[(Math.random() * 4) | 0] / 2, 0.7);
        st.nextNote = now + 0.7 + Math.random() * 0.9;
      }
      if (st.bpm > 0 && now >= st.nextBeat) {
        thump(now, 1);
        thump(now + 0.16, 0.6);
        st.nextBeat = now + 60 / st.bpm;
      }
    },
    reset() {
      st.crickets = false; st.piano = false; st.bpm = 0;
      if (!ctx) return;
      ramp(loops.wind.gain, 0, 0.3);
      ramp(loops.drone.gain, 0, 0.3);
      ramp(loops.chase.gain, 0, 0.3);
    },
    zombie: safe(zombie), skeleton: safe(skeleton), spider: safe(spider), enderman: safe(enderman),
    villager: safe(villager), step: safe(step), poof: safe(poof), catHiss: safe(catHiss), catMeow: safe(catMeow),
    boom: safe(boom), stinger: safe(stinger), transform: safe(transform), howl: safe(howl),
  };
})();
