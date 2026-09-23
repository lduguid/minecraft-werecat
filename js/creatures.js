(function () {
  const U = WC.U;
  const { skinBox, pivot, put, approach, Actor, P } = WC.Rig;
  const { pattern } = WC.Mobs;

  let glowTex = null;
  function eyeSprite(color, scale) {
    glowTex = glowTex || WC.Tex.glowTexture();
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.9,
    }));
    s.scale.setScalar(scale);
    return s;
  }

  // ---------------------------------------------------------------- Spider
  function spider() {
    const a = new Actor('spider');
    const r = a.rig;
    const hairy = (ctx, w, h, rand) => {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (rand() < 0.3) WC.Tex.px(ctx, x, y, WC.Tex.pick(rand, ['#2a2320', '#4a3f3a', '#1e1a18']));
    };
    const spec = (extra) => Object.assign({ color: '#3a3230', front: hairy, back: hairy, left: hairy, right: hairy, top: hairy }, extra);
    put(r, skinBox(10, 8, 12, spec()), 0, 9, -9);
    put(r, skinBox(6, 6, 6, spec()), 0, 9, 0);
    const head = pivot(r, 0, 9, 3);
    const eyes = pattern(['', '', '..r..r..', '.RR..RR.', '..r..r..'], { r: '#ff3a2a', R: '#ff1a10' });
    put(head, skinBox(8, 8, 8, spec({
      front: (ctx, w, h, rand) => { hairy(ctx, w, h, rand); eyes(ctx); },
      glow: { front: eyes },
    })), 0, 0, 4);
    const legs = [];
    const zs = [2, 0.7, -0.7, -2], spreads = [0.65, 0.22, -0.22, -0.65];
    [1, -1].forEach((side) => {
      zs.forEach((z, i) => {
        const lp = pivot(r, 3 * side, 9, z);
        lp.rotation.order = 'YZX';
        put(lp, skinBox(16, 2, 2, { color: '#2e2725' }), 8 * side, 0, 0);
        lp.userData = { side, spread: -spreads[i] * side, off: (i % 2 ? Math.PI : 0) + (side > 0 ? 0 : Math.PI), i };
        legs.push(lp);
      });
    });
    Object.assign(a.parts, { head, legs });
    a.stride = 5;
    a.anim = (dt, t) => {
      const k = Math.min(1, a.vel * 0.5);
      legs.forEach((lp) => {
        const u = lp.userData;
        const ph = a.phase + u.off;
        const twitch = Math.sin(t * 3 + u.i * 1.3 + a.seed) * 0.03;
        lp.rotation.y = u.spread + Math.sin(ph) * 0.35 * k + twitch;
        lp.rotation.z = u.side * (-0.6 + Math.max(0, Math.cos(ph)) * 0.3 * k);
      });
      head.rotation.y = a.headYaw * 0.5;
      head.rotation.x = a.headPitch * 0.5;
      a.rig.position.y += Math.abs(Math.sin(a.phase * 2)) * 0.03 * k;
    };
    return a.finish();
  }

  // ---------------------------------------------------------------- Feral cat (flashback)
  function cat() {
    const a = new Actor('cat');
    const r = a.rig;
    const fur = '#8a8176';
    const vStripes = (ctx, w, h) => { ctx.fillStyle = '#4e4840'; for (let x = 1; x < w; x += 3) ctx.fillRect(x, 0, 1, h - 1); };
    const hStripes = (ctx, w, h) => { ctx.fillStyle = '#4e4840'; for (let y = 1; y < h; y += 3) ctx.fillRect(0, y, w, 1); };
    const body = pivot(r, 0, 8.5, 0);
    put(body, skinBox(4, 5, 14, { color: fur, left: vStripes, right: vStripes, top: hStripes }), 0, 0, 0);
    const head = pivot(r, 0, 10, 7);
    const eyes = pattern(['', '.g.g.'], { g: '#9cff3a' });
    put(head, skinBox(5, 4, 5, { color: fur, front: (ctx) => { eyes(ctx); }, top: hStripes, glow: { front: eyes } }), 0, 1.5, 2);
    put(head, skinBox(3, 2, 1, { color: '#b0a89c', front: pattern(['.p.'], { p: '#e07a8a' }) }), 0, 0.5, 5);
    put(head, skinBox(1, 2, 1, { color: fur }), 1.5, 4, 1.5);
    put(head, skinBox(1, 2, 1, { color: fur }), -1.5, 4, 1.5);
    const legs = [];
    [[1, 5], [-1, 5], [1, -5], [-1, -5]].forEach(([x, z]) => {
      const lp = pivot(r, x, 6, z);
      put(lp, skinBox(2, 6, 2, { color: fur }), 0, -3, 0);
      legs.push(lp);
    });
    const tail = pivot(r, 0, 10, -7);
    put(tail, skinBox(1, 1, 9, { color: fur, left: vStripes, right: vStripes }), 0, 0, -4.5);
    Object.assign(a.parts, { head, legs, tail, body });
    a.stride = 6;
    a.anim = (dt, t) => {
      const k = Math.min(1, a.vel * 0.5) * 0.8;
      const s = Math.sin(a.phase) * k;
      const pounce = a.mode === 'pounce';
      legs[0].rotation.x = pounce ? -1.2 : s;
      legs[1].rotation.x = pounce ? -1.2 : -s;
      legs[2].rotation.x = pounce ? 1.0 : -s;
      legs[3].rotation.x = pounce ? 1.0 : s;
      const hiss = a.mode === 'hiss';
      approach(tail.rotation, 'x', hiss ? 1.4 : 0.8, 6, dt);
      tail.rotation.y = Math.sin(t * (hiss ? 9 : 2)) * 0.3;
      approach(body.rotation, 'x', hiss ? -0.15 : 0, 6, dt);
      head.rotation.y = a.headYaw;
      head.rotation.x = a.headPitch + (hiss ? -0.3 : 0);
    };
    return a.finish();
  }

  // ---------------------------------------------------------------- The Werecat
  const POSES = {
    crouch: { torso: 0.75, head: -0.6, armX: -0.65, armZ: 0.12, jaw: 0, tail: 0.25 },
    stand: { torso: 0.3, head: -0.25, armX: -0.3, armZ: 0.2, jaw: 0.05, tail: 0.5 },
    howl: { torso: -0.25, head: -1.05, armX: -0.55, armZ: 0.8, jaw: 0.65, tail: 0.95 },
    run: { torso: 1.35, head: -1.2, armX: -1.3, armZ: 0.05, jaw: 0.3, tail: 0.2 },
    stalk: { torso: 1.0, head: -0.9, armX: -0.95, armZ: 0.1, jaw: 0.1, tail: 0.35 },
  };

  function werecat() {
    const a = new Actor('werecat');
    const r = a.rig;
    const FUR = '#36343c', STRIPE = '#1d1c21', ROBE = '#3f6b3a';
    const stripes = (ctx, w, h, rand) => {
      ctx.fillStyle = STRIPE;
      for (let y = 1; y < h; y += 4) for (let x = 0; x < w; x++) if (rand() < 0.75) ctx.fillRect(x, y + (rand() < 0.3 ? 1 : 0), 1, 1);
    };
    const furSpec = (extra) => Object.assign({ color: FUR, noise: 0.12, front: stripes, back: stripes, left: stripes, right: stripes }, extra);
    const rag = (ctx, w, h, rand) => {
      ctx.fillStyle = WC.Tex.shade(ROBE, 0.7);
      ctx.fillRect(0, 0, w, 1);
      for (let x = 0; x < w; x++) {
        const cut = 1 + ((rand() * 4) | 0);
        ctx.clearRect(x, h - cut, 1, cut);
      }
    };

    const hips = pivot(r, 0, 12, 0);
    const legL = pivot(hips, 2.2, 0, 0), legR = pivot(hips, -2.2, 0, 0);
    put(legL, skinBox(4, 12, 4, furSpec()), 0, -6, 0);
    put(legR, skinBox(4, 12, 4, furSpec()), 0, -6, 0);
    put(hips, skinBox(9, 7, 7, {
      color: ROBE, alpha: true, front: rag, back: rag, left: rag, right: rag,
      bottom: (ctx, w, h) => ctx.clearRect(0, 0, w, h),
    }), 0, -2.5, 0);

    const torso = pivot(hips, 0, 0, 0);
    const tornRobe = (ctx, w, h, rand) => {
      stripes(ctx, w, h, rand);
      for (let x = 0; x < w; x++) WC.Tex.fillNoise(ctx, x, 0, 1, 5 + ((rand() * 4) | 0), ROBE, 0.08, rand);
      ctx.fillStyle = '#20301e';
      ctx.fillRect(2, 1, 1, 4);
      ctx.fillRect(5, 2, 1, 3);
    };
    put(torso, skinBox(8, 12, 6, furSpec({ front: tornRobe, back: tornRobe, left: tornRobe, right: tornRobe, top: ROBE })), 0, 6, 0);

    const head = pivot(torso, 0, 12, 0.5);
    const eyeGlow = pattern(['', '', '', '', 'eke..eke', 'eke..eke'], { e: '#e4ff4a', k: '#000000' });
    const face = (ctx, w, h, rand) => {
      stripes(ctx, w, h, rand);
      pattern(['', '', 'b......b', '.bbbbbb.'], { b: '#111013' })(ctx);
      eyeGlow(ctx);
    };
    put(head, skinBox(8, 10, 8, furSpec({ front: face, glow: { front: eyeGlow } })), 0, 5, 0);
    put(head, skinBox(4, 3, 3, {
      color: '#4a4850', front: pattern(['.pp.'], { p: '#e07a8a' }), bottom: '#5a1010',
    }), 0, 2.5, 6);
    const jaw = pivot(head, 0, 1, 4.5);
    put(jaw, skinBox(4, 1, 3, { color: '#3e3c44', top: '#7a1515' }), 0, -0.5, 1.5);
    const fangMat = new THREE.MeshLambertMaterial({ color: 0xf2eee0 });
    [-1.2, 1.2].forEach((x) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.8 * P, 1.6 * P, 0.8 * P), fangMat);
      f.position.set(x * P, 0.4 * P, 7 * P);
      head.add(f);
    });
    [1, -1].forEach((side) => {
      const ear = pivot(head, 2.5 * side, 10, 0.5);
      put(ear, skinBox(3, 2, 1, furSpec({ front: (ctx) => { ctx.fillStyle = '#b86a78'; ctx.fillRect(1, 0, 1, 2); } })), 0, 1, 0);
      put(ear, skinBox(2, 1, 1, furSpec()), 0.5 * side, 2.5, 0);
      put(ear, skinBox(1, 1, 1, furSpec()), 1 * side, 3.5, 0);
      ear.rotation.z = -0.12 * side;
    });
    const whiskerMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
    [[1, 3.2], [1, 2.2], [-1, 3.2], [-1, 2.2]].forEach(([side, y]) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(5 * P, 0.35 * P, 0.35 * P), whiskerMat);
      w.position.set(4.2 * side * P, y * P, 6.5 * P);
      w.rotation.z = (y > 3 ? 0.15 : -0.1) * side;
      head.add(w);
    });
    const eyes = [eyeSprite(0xd8ff3a, 0.32), eyeSprite(0xd8ff3a, 0.32)];
    eyes[0].position.set(-2.5 * P, 5 * P, 4.8 * P);
    eyes[1].position.set(2.5 * P, 5 * P, 4.8 * P);
    head.add(eyes[0], eyes[1]);

    const sleeve = (ctx, w, h, rand) => {
      stripes(ctx, w, h, rand);
      for (let x = 0; x < w; x++) WC.Tex.fillNoise(ctx, x, 0, 1, 2 + ((rand() * 3) | 0), ROBE, 0.08, rand);
    };
    const clawMat = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
    const arms = [1, -1].map((side) => {
      const arm = pivot(torso, 5.5 * side, 11, 0);
      put(arm, skinBox(3, 14, 3, furSpec({ front: sleeve, back: sleeve, left: sleeve, right: sleeve })), 0, -6, 0);
      [-1, 0, 1].forEach((cx) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.8 * P, 2.6 * P, 0.8 * P), clawMat);
        c.position.set(cx * P, -13.6 * P, 1.3 * P);
        c.rotation.x = 0.4;
        arm.add(c);
      });
      return arm;
    });

    const tail = [];
    let parent = hips;
    for (let i = 0; i < 5; i++) {
      const seg = i === 0 ? pivot(parent, 0, 1, -3.5) : pivot(parent, 0, 0, -3.2);
      put(seg, skinBox(2, 2, 3.5, furSpec()), 0, 0, -1.6);
      tail.push(seg);
      parent = seg;
    }

    Object.assign(a.parts, { hips, torso, head, jaw, legL, legR, armL: arms[0], armR: arms[1], tail, eyes });
    a.root.scale.setScalar(1.3);
    a.stride = 3;
    a.mode = 'stand';
    a.idleLook = false;
    a.pose = Object.assign({}, POSES.stand);
    a.poseRate = 5;
    a.setEyes = (v) => eyes.forEach((e) => { e.material.opacity = v; });
    a.snapPose = () => Object.assign(a.pose, POSES[a.mode] || POSES.stand);

    a.anim = (dt, t) => {
      const target = POSES[a.mode] || POSES.stand;
      Object.keys(target).forEach((k) => approach(a.pose, k, target[k], a.poseRate, dt));
      const p = a.pose;
      const k = Math.min(1, a.vel * 0.35);
      const quad = U.smoothstep(0.6, 1.2, p.torso);
      const s = Math.sin(a.phase);
      legL.rotation.x = s * 0.8 * k;
      legR.rotation.x = U.lerp(-s, s, quad) * 0.8 * k;
      const armSwing = -s * U.lerp(0.5, 0.9, quad) * k;
      arms[0].rotation.x = p.armX + armSwing;
      arms[1].rotation.x = p.armX + U.lerp(-armSwing, armSwing, quad);
      arms[0].rotation.z = p.armZ;
      arms[1].rotation.z = -p.armZ;
      torso.rotation.x = p.torso + quad * Math.sin(a.phase * 2) * 0.08 * k;
      const howling = a.mode === 'howl';
      head.rotation.x = p.head + a.headPitch * 0.5;
      head.rotation.y = a.headYaw * (1 - quad * 0.7);
      head.rotation.z = howling ? Math.sin(t * 22) * 0.035 : 0;
      jaw.rotation.x = p.jaw + (howling ? Math.sin(t * 5) * 0.06 : 0);
      tail[0].rotation.x = p.tail;
      for (let i = 0; i < tail.length; i++) {
        if (i > 0) tail[i].rotation.x = -0.12 + Math.sin(t * 1.5 + i) * 0.05;
        tail[i].rotation.y = Math.sin(t * 2.4 - i * 0.8) * 0.2 * (1 + i * 0.25) * (1 + k);
      }
      a.rig.position.y += quad * Math.abs(Math.sin(a.phase)) * 0.12 * k;
    };
    return a.finish();
  }

  Object.assign(WC.Mobs, { spider, cat, werecat });
})();
