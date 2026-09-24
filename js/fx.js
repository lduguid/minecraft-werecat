(function () {
  const U = WC.U;

  const TYPES = {
    poof: { colors: ['#f0f0f0', '#d0d0d0', '#b0b0b0'], life: [0.6, 1.2], size: [0.18, 0.32], speed: 1.2, up: 0.8, gravity: 0.3, drag: 2.5 },
    portal: { colors: ['#b040ff', '#e070ff', '#7a20c0'], life: [0.8, 1.6], size: [0.08, 0.14], speed: 1.6, up: 0.4, gravity: -0.2, drag: 1.2 },
    dust: { colors: ['#7a6a4a', '#5f7a3c', '#8a7a5a'], life: [0.3, 0.6], size: [0.08, 0.14], speed: 0.8, up: 0.9, gravity: -3, drag: 2 },
    spark: { colors: ['#e4ff4a', '#fff8a0', '#b8ff30'], life: [0.8, 1.6], size: [0.08, 0.16], speed: 2.2, up: 1.5, gravity: 0.5, drag: 1.5 },
    fur: { colors: ['#2c2b30', '#1d1c21', '#4a4850'], life: [0.8, 1.4], size: [0.1, 0.2], speed: 2.6, up: 1.2, gravity: -2.5, drag: 1 },
    leaf: { colors: ['#c8641e', '#a8421a', '#d8a030', '#7a3a14'], life: [3, 5], size: [0.09, 0.14], speed: 1.4, up: 0.1, gravity: 0.35, drag: 0.6 },
    witch: { colors: ['#b040ff', '#60ff60', '#e070ff'], life: [0.8, 1.5], size: [0.2, 0.35], speed: 0.4, up: 0.1, gravity: 0.3, drag: 1 },
  };

  function create(scene) {
    const tex = WC.Tex.particleTexture();
    const pool = [];
    for (let i = 0; i < 260; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      s.visible = false;
      scene.add(s);
      pool.push({ s, life: 0, max: 1, vel: new THREE.Vector3(), size: 0.2, t: null });
    }
    let cursor = 0;

    const el = (id) => document.getElementById(id);
    const dom = {
      caption: el('caption'), captionText: el('caption-text'), big: el('bigtext'),
      flash: el('flash'), fade: el('fade'), stage: el('stage'), fbFrame: el('flashback-frame'), vignette: el('vignette'),
    };

    const state = {
      trauma: 0, shakeT: 0,
      cap: null,
      bigT: 0,
      flashT: 0, flashDur: 1,
      fadeFrom: 0, fadeTo: 0, fadeT: 0, fadeDur: 1, fadeVal: 0,
    };

    const api = {
      burst(type, pos, count, spread) {
        const T = TYPES[type];
        const rand = Math.random;
        spread = spread || 0.4;
        for (let i = 0; i < count; i++) {
          const p = pool[cursor];
          cursor = (cursor + 1) % pool.length;
          p.t = T;
          p.max = p.life = U.lerp(T.life[0], T.life[1], rand());
          p.size = U.lerp(T.size[0], T.size[1], rand());
          p.s.position.set(pos.x + (rand() - 0.5) * spread, pos.y + (rand() - 0.5) * spread, pos.z + (rand() - 0.5) * spread);
          const ang = rand() * Math.PI * 2;
          const sp = T.speed * (0.4 + rand() * 0.6);
          p.vel.set(Math.cos(ang) * sp, T.up * (0.3 + rand() * 0.7), Math.sin(ang) * sp);
          p.s.material.color.set(T.colors[(rand() * T.colors.length) | 0]);
          p.s.material.opacity = 1;
          p.s.visible = true;
        }
      },

      shake(amount, dur) {
        state.trauma = Math.max(state.trauma, amount);
        state.shakeT = Math.max(state.shakeT, dur || 1);
      },

      applyShake(camera, t) {
        if (state.trauma <= 0.001) return;
        const k = state.trauma * state.trauma;
        camera.position.x += U.noise2(t * 25, 1, 1) * 0.35 * k;
        camera.position.y += U.noise2(t * 25, 2, 2) * 0.25 * k;
        camera.rotateZ(U.noise2(t * 20, 3, 3) * 0.05 * k);
      },

      caption(text, opts) {
        opts = opts || {};
        state.cap = { full: text, shown: 0, rate: opts.rate || 38 };
        dom.captionText.textContent = '';
        dom.caption.classList.add('show');
        dom.caption.classList.toggle('scary', !!opts.scary);
      },

      hideCaption() {
        dom.caption.classList.remove('show');
        state.cap = null;
      },

      bigText(text, dur) {
        dom.big.textContent = text;
        dom.big.classList.add('show');
        state.bigT = dur || 2.5;
      },

      flash(dur) {
        state.flashT = state.flashDur = dur || 0.8;
        dom.flash.style.opacity = 1;
      },

      fade(to, dur) {
        state.fadeFrom = state.fadeVal;
        state.fadeTo = to;
        state.fadeT = 0;
        state.fadeDur = dur || 1;
      },

      setFade(v) {
        state.fadeVal = state.fadeFrom = state.fadeTo = v;
        state.fadeT = state.fadeDur;
        dom.fade.style.opacity = v;
      },

      sepia(on) {
        dom.stage.classList.toggle('flashback', on);
        dom.fbFrame.classList.toggle('on', on);
      },

      cinema(on) { document.body.classList.toggle('cinema', on); },

      pulse(on) { dom.vignette.classList.toggle('pulse', on); },

      reset() {
        pool.forEach((p) => { p.life = 0; p.s.visible = false; });
        state.trauma = 0;
        api.hideCaption();
        dom.big.classList.remove('show');
        state.bigT = 0;
        state.flashT = 0;
        dom.flash.style.opacity = 0;
        api.sepia(false);
        api.pulse(false);
      },

      update(dt) {
        pool.forEach((p) => {
          if (p.life <= 0) return;
          p.life -= dt;
          if (p.life <= 0) { p.s.visible = false; return; }
          const T = p.t;
          p.vel.y -= T.gravity * dt;
          p.vel.multiplyScalar(Math.max(0, 1 - T.drag * dt));
          p.s.position.addScaledVector(p.vel, dt);
          const k = p.life / p.max;
          p.s.scale.setScalar(p.size * (0.4 + 0.6 * k));
          p.s.material.opacity = Math.min(1, k * 2);
        });

        if (state.trauma > 0) {
          state.shakeT -= dt;
          if (state.shakeT <= 0) state.trauma = Math.max(0, state.trauma - dt * 1.5);
        }

        if (state.cap) {
          const c = state.cap;
          if (c.shown < c.full.length) {
            c.shown = Math.min(c.full.length, c.shown + c.rate * dt);
            dom.captionText.textContent = c.full.slice(0, Math.floor(c.shown));
          }
        }

        if (state.bigT > 0) {
          state.bigT -= dt;
          if (state.bigT <= 0) dom.big.classList.remove('show');
        }

        if (state.flashT > 0) {
          state.flashT -= dt;
          dom.flash.style.opacity = Math.max(0, state.flashT / state.flashDur);
        }

        if (state.fadeT < state.fadeDur) {
          state.fadeT += dt;
          const k = U.clamp(state.fadeT / state.fadeDur, 0, 1);
          state.fadeVal = U.lerp(state.fadeFrom, state.fadeTo, k);
          dom.fade.style.opacity = state.fadeVal;
        }
      },
    };
    return api;
  }

  WC.FX = { create };
})();
