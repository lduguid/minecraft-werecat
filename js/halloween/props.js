window.WC = window.WC || {};

(function () {
  const U = WC.U;
  const HW = (WC.Halloween = WC.Halloween || {});
  const { skinBox, pivot, put, approach, Actor, P } = WC.Rig;
  const { pattern } = WC.Mobs;

  let glowTex = null;
  function glowSprite(color, scale, opacity) {
    glowTex = glowTex || WC.Tex.glowTexture();
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity,
    }));
    s.scale.setScalar(scale);
    return s;
  }

  const ribs = (ctx, w, h, rand) => {
    for (let x = 0; x < w; x++) if (x % 4 === 0) { ctx.fillStyle = '#b8600c'; ctx.fillRect(x, 0, 1, h); }
    ctx.fillStyle = '#c8700f';
    ctx.fillRect(0, 0, w, 1);
  };
  const FACE = [
    '', '', '', '',
    '..X..........X..',
    '..XXX......XXX..',
    '..XXXX....XXXX..',
    '...XXX....XXX...',
    '.......XX.......',
    '',
    '.X............X.',
    '.XX.XXXXXXXX.XX.',
    '..XXXXXXXXXXXX..',
    '...XX.XXXX.XX...',
  ];

  // A carved pumpkin. lit=true makes the face glow with a flickering candle.
  function jackOLantern(lit, withLight) {
    const faceCol = lit ? '#ffd24a' : '#3a1a05';
    const face = pattern(FACE, { X: faceCol });
    const spec = {
      color: '#e38a1f', noise: 0.08,
      left: ribs, right: ribs, back: ribs,
      front: (ctx, w, h, rand) => { ribs(ctx, w, h, rand); face(ctx); },
      top: (ctx) => { ctx.fillStyle = '#5a6a2a'; ctx.fillRect(7, 7, 2, 2); },
    };
    if (lit) spec.glow = { front: face };
    const group = new THREE.Group();
    const box = skinBox(16, 16, 16, spec, 4242);
    group.add(box);
    const rec = { group, light: null, sprite: null, phase: Math.random() * 10 };
    if (lit) {
      rec.sprite = glowSprite(0xff9a3a, 2.6, 0.6);
      rec.sprite.position.set(0, 0, 0.75);
      group.add(rec.sprite);
      if (withLight) {
        rec.light = new THREE.PointLight(0xff8a2a, 7, 10, 1.4);
        rec.light.position.set(0, 0, 1.2);
        group.add(rec.light);
      }
    }
    const wp = new THREE.Vector3();
    rec.update = (t, level, camPos) => {
      const f = 0.78 + 0.22 * Math.sin(t * 11 + rec.phase) * Math.sin(t * 7.3 + rec.phase * 2);
      if (rec.light) rec.light.intensity = 7 * f * level;
      if (rec.sprite) {
        const near = camPos ? U.smoothstep(1.5, 5, rec.sprite.getWorldPosition(wp).distanceTo(camPos)) : 1;
        rec.sprite.material.opacity = 0.6 * f * level * near;
      }
    };
    return rec;
  }

  // Grandpa's front door: splintered, clawed, and hanging ajar.
  function clawedDoor() {
    const wood = '#5e4a36';
    const planks = (ctx, w, h) => {
      ctx.fillStyle = WC.Tex.shade(wood, 0.82);
      for (let x = 3; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(0, 0, w, 2); ctx.fillRect(0, h - 2, w, 2); ctx.fillRect(0, 15, w, 2);
    };
    const outside = (ctx, w, h, rand) => {
      planks(ctx, w, h);
      // four deep claw gouges raking diagonally down across the door
      for (let c = 0; c < 4; c++) {
        let x = -1 + c * 3.6, y = 3 + c * 0.8;
        for (let i = 0; i < 17; i++) {
          const px = Math.round(x), py = Math.round(y);
          WC.Tex.px(ctx, px, py, '#0e0703');
          if (i > 3 && i < 13) WC.Tex.px(ctx, px + 1, py, '#1e1208');
          WC.Tex.px(ctx, px + (i > 3 && i < 13 ? 2 : 1), py, '#e0c090');
          x += 0.5; y += 1;
        }
      }
      // splintered hole near the bottom and a snagged scrap of green cloth
      [[11, 26, 4], [12, 27, 4], [13, 28, 3], [12, 29, 3], [14, 25, 2]].forEach(([x, y, n]) => ctx.clearRect(x, y, n, 1));
      ['#e0c090', '#c8a070'].forEach((c, i) => { WC.Tex.px(ctx, 10, 26 + i, c); WC.Tex.px(ctx, 11, 25 + i, c); WC.Tex.px(ctx, 15, 27 + i, c); });
      ctx.fillStyle = '#3f6b3a'; ctx.fillRect(8, 22, 3, 4);
      ctx.fillStyle = '#2f5a2c'; ctx.fillRect(8, 26, 2, 2); WC.Tex.px(ctx, 10, 26, '#2f5a2c');
      WC.Tex.px(ctx, 9, 21, '#e0c090');
      WC.Tex.px(ctx, 13, 12, '#3a3a3a');
    };
    const inside = (ctx, w, h) => {
      planks(ctx, w, h);
      [[1, 26, 4], [1, 27, 4], [2, 28, 3], [1, 29, 3], [0, 25, 2]].forEach(([x, y, n]) => ctx.clearRect(x, y, n, 1));
    };
    const pivotG = new THREE.Group();
    const mesh = skinBox(16, 32, 3, { color: wood, noise: 0.06, alpha: true, back: outside, front: inside }, 777);
    mesh.position.set(0.5, 1, 0);
    pivotG.add(mesh);
    return { group: pivotG, mesh };
  }

  // A weathered picket fence from post positions and rail pairs.
  function fence(posts, rails) {
    const c = WC.Tex.makeCanvas(4, 16);
    WC.Tex.fillNoise(c.getContext('2d'), 0, 0, 4, 16, '#4a3a28', 0.15, U.rng(9));
    const mat = new THREE.MeshLambertMaterial({ map: WC.Tex.toTexture(c) });
    const group = new THREE.Group();
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), mat, posts.length);
    posts.forEach((p, i) => {
      const tilt = (U.hash2(Math.floor(p.x * 7), Math.floor(p.z * 7), 5) - 0.5) * 0.25;
      q.setFromEuler(new THREE.Euler(tilt, 0, tilt * 0.6));
      postMesh.setMatrixAt(i, m4.compose(v.set(p.x, p.y + 0.5, p.z), q, s));
    });
    group.add(postMesh);
    const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.1, 0.08), mat, rails.length * 2);
    rails.forEach(([a, b], i) => {
      const yaw = Math.abs(a.x - b.x) > 0.5 ? 0 : Math.PI / 2;
      q.setFromEuler(new THREE.Euler(0, yaw, 0));
      [0.4, 0.8].forEach((hgt, k) => {
        railMesh.setMatrixAt(i * 2 + k, m4.compose(v.set((a.x + b.x) / 2, Math.min(a.y, b.y) + hgt, (a.z + b.z) / 2), q, s));
      });
    });
    group.add(railMesh);
    return group;
  }

  // ---------------------------------------------------------------- The witch, riding her broom
  function witch() {
    const a = new Actor('witch');
    const r = a.rig;
    const robe = '#4a2466', skin = '#8fae7a';
    const legL = pivot(r, 2, 12, 0), legR = pivot(r, -2, 12, 0);
    put(legL, skinBox(4, 12, 4, { color: '#2a1a34' }), 0, -6, 0);
    put(legR, skinBox(4, 12, 4, { color: '#2a1a34' }), 0, -6, 0);
    legL.rotation.set(-1.35, 0, 0.25);
    legR.rotation.set(-1.35, 0, -0.25);
    const belt = (ctx, w) => { ctx.fillStyle = '#1e1028'; ctx.fillRect(0, 7, w, 1); };
    put(r, skinBox(8, 14, 6, { color: robe, front: belt, back: belt, left: belt, right: belt }), 0, 17, 0);

    const cape = pivot(r, 0, 23.5, -3.2);
    put(cape, skinBox(10, 15, 1, { color: '#1a1020' }), 0, -7.5, 0);

    const head = pivot(r, 0, 24, 0);
    put(head, skinBox(8, 10, 8, {
      color: skin,
      front: pattern(['', '', '', '.dd..dd.', '.pg..gp.', '', '', '', '.kkkkkk.'], { d: '#2a2a1a', p: '#f0f0f0', g: '#7a2a9a', k: '#4a5a3a' }),
    }), 0, 5, 0);
    put(head, skinBox(2, 5, 2, { color: '#7f9d6a', front: pattern(['', '', '..', '.w'], { w: '#4a5a32' }) }), 0, 3.5, 5);
    const hat = pivot(head, 0, 10, 0);
    put(hat, skinBox(14, 1, 14, { color: '#161018' }), 0, 0, 0);
    put(hat, skinBox(8, 3, 8, { color: '#161018', front: (ctx, w) => { ctx.fillStyle = '#3a8a3a'; ctx.fillRect(0, 2, w, 1); WC.Tex.px(ctx, 3, 2, '#e0c040'); WC.Tex.px(ctx, 4, 2, '#e0c040'); } }), 0, 2, 0);
    const hat2 = pivot(hat, 0, 3.5, -0.5);
    put(hat2, skinBox(6, 3, 6, { color: '#161018' }), 0, 1.5, 0);
    const hat3 = pivot(hat2, 0, 3, -0.5);
    put(hat3, skinBox(4, 3, 4, { color: '#161018' }), 0, 1.5, 0);
    const tip = pivot(hat3, 0, 3, -0.5);
    put(tip, skinBox(2, 3, 2, { color: '#161018' }), 0, 1.5, 0);
    hat2.rotation.x = -0.12; hat3.rotation.x = -0.25; tip.rotation.x = -0.6;

    const armL = pivot(r, 5.5, 22, 0), armR = pivot(r, -5.5, 22, 0);
    put(armL, skinBox(3, 11, 3, { color: robe }), 0, -4.5, 0);
    put(armR, skinBox(3, 11, 3, { color: robe }), 0, -4.5, 0);
    armL.rotation.set(-1.1, 0, -0.3);
    armR.rotation.set(-1.1, 0, 0.3);

    const broom = pivot(r, 0, 10.5, 0);
    put(broom, skinBox(1, 1, 30, { color: '#6b4a2a' }), 0, 0, 3);
    put(broom, skinBox(5, 5, 7, { color: '#c8a24a', noise: 0.15 }), 0, 0, -14);
    put(broom, skinBox(3, 3, 3, { color: '#b8923a', noise: 0.15 }), 0, 0, -19);

    Object.assign(a.parts, { head, hat, hat2, hat3, tip, cape, broom });
    a.grounded = false;
    a.idleLook = false;
    a.root.scale.setScalar(1.4);
    a.cackling = false;
    a.anim = (dt, t) => {
      a.rig.position.y += Math.sin(t * 2.2) * 0.08;
      a.rig.rotation.x = Math.sin(t * 1.3) * 0.06;
      cape.rotation.x = 0.5 + Math.sin(t * 9) * 0.25;
      tip.rotation.z = Math.sin(t * 3.1) * 0.25;
      hat3.rotation.z = Math.sin(t * 2.6) * 0.1;
      head.rotation.x = a.cackling ? -0.35 + Math.sin(t * 18) * 0.12 : -0.05;
      head.rotation.y = a.headYaw;
    };
    return a.finish();
  }

  // ---------------------------------------------------------------- Bats
  function bat() {
    const a = new Actor('bat');
    const r = a.rig;
    const brown = '#3a2e24';
    put(r, skinBox(6, 7, 5, { color: brown }), 0, 0, 0);
    const head = pivot(r, 0, 4, 0.5);
    put(head, skinBox(5, 5, 5, { color: brown, front: pattern(['', '.k.k.'], { k: '#101010' }) }), 0, 2.5, 0);
    put(head, skinBox(1, 2, 1, { color: brown }), 1.5, 6, 0);
    put(head, skinBox(1, 2, 1, { color: brown }), -1.5, 6, 0);
    const wingL = pivot(r, 3, 2, 0), wingR = pivot(r, -3, 2, 0);
    put(wingL, skinBox(12, 1, 7, { color: '#2a211a' }), 6, 0, 0);
    put(wingR, skinBox(12, 1, 7, { color: '#2a211a' }), -6, 0, 0);
    Object.assign(a.parts, { wingL, wingR, head });
    a.grounded = false;
    a.idleLook = false;
    a.root.scale.setScalar(0.55);
    a.flap = 14 + Math.random() * 4;
    a.anim = (dt, t) => {
      const f = Math.sin(t * a.flap + a.seed);
      wingL.rotation.z = f * 0.9;
      wingR.rotation.z = -f * 0.9;
      a.rig.position.y += f * 0.03;
    };
    return a.finish();
  }

  // ---------------------------------------------------------------- Eyes in the forest
  function forestEyes() {
    const group = new THREE.Group();
    const eyes = [glowSprite(0xd8ff3a, 0.6, 0.95), glowSprite(0xd8ff3a, 0.6, 0.95)];
    eyes[0].position.x = -0.34;
    eyes[1].position.x = 0.34;
    group.add(eyes[0], eyes[1]);
    group.visible = false;
    let blinkT = 0, level = 0, target = 0;
    return {
      group,
      show(on) { target = on ? 1 : 0; if (on) group.visible = true; },
      blink() { blinkT = 0.18; },
      update(dt) {
        level += (target - level) * U.damp(4, dt);
        if (level < 0.01 && target === 0) group.visible = false;
        let sy = 1;
        if (blinkT > 0) { blinkT -= dt; sy = 0.08; }
        eyes.forEach((e) => {
          e.material.opacity = 0.95 * level;
          e.scale.set(0.6, 0.6 * sy, 1);
        });
      },
    };
  }

  Object.assign(HW, { jackOLantern, clawedDoor, fence, witch, bat, forestEyes, glowSprite });
})();
