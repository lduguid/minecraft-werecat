(function () {
  const U = WC.U;
  const { skinBox, pivot, put, approach, Actor, P } = WC.Rig;

  // Paint a pixel pattern: rows of characters, palette maps char -> colour ('.' = leave as is).
  function pattern(rows, palette, ox, oy) {
    return (ctx) => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const c = palette[row[x]];
          if (c) WC.Tex.px(ctx, (ox || 0) + x, (oy || 0) + y, c);
        }
      });
    };
  }

  function walkLegs(a, amp) {
    const k = Math.min(1, a.vel * 0.6) * amp;
    const s = Math.sin(a.phase) * k;
    if (a.parts.legL) a.parts.legL.rotation.x = s;
    if (a.parts.legR) a.parts.legR.rotation.x = -s;
    return s;
  }

  // ---------------------------------------------------------------- Villager
  // opts: { robe, hat, flower, child }. A child is a Minecraft-style baby villager:
  // half-size body, three-quarter-size head, and quicker little steps.
  function villager(opts) {
    opts = opts || {};
    const robe = opts.robe || '#7a5638';
    const a = new Actor('villager');
    a.hops = true;
    const r = a.rig;
    const skin = '#bd8b72';

    const legL = pivot(r, 2, 12, 0), legR = pivot(r, -2, 12, 0);
    put(legL, skinBox(4, 12, 4, { color: '#4a3a2c' }), 0, -6, 0);
    put(legR, skinBox(4, 12, 4, { color: '#4a3a2c' }), 0, -6, 0);

    const belt = (ctx, w) => { ctx.fillStyle = WC.Tex.shade(robe, 0.6); ctx.fillRect(0, 7, w, 1); };
    put(r, skinBox(8, 18, 6, {
      color: robe,
      front: (ctx, w, h) => { belt(ctx, w); ctx.fillStyle = WC.Tex.shade(robe, 0.8); ctx.fillRect(3, 8, 2, h - 8); },
      left: belt, right: belt, back: belt,
    }), 0, 15, 0);

    const head = pivot(r, 0, 24, 0);
    put(head, skinBox(8, 10, 8, {
      color: skin,
      front: pattern(['', '', '', '.dddddd.', '.wg..gw.'], { d: '#3b2a1d', w: '#e8e8e8', g: '#2f8a3f' }),
    }), 0, 5, 0);
    put(head, skinBox(2, 4, 2, { color: '#a8765e' }), 0, 4, 5);

    if (opts.hat !== false) {
      put(head, skinBox(16, 1, 16, { color: '#d9b95b', noise: 0.1 }), 0, 9, 0);
      put(head, skinBox(8, 3, 8, {
        color: '#d9b95b', noise: 0.1,
        front: (ctx, w) => { ctx.fillStyle = '#9a7a30'; ctx.fillRect(0, 2, w, 1); },
      }), 0, 11, 0);
    }

    const arms = pivot(r, 0, 22, 0);
    arms.rotation.x = -0.75;
    const sleeve = WC.Tex.shade(robe, 0.9);
    put(arms, skinBox(4, 8, 4, { color: sleeve }), 6, -4, 0);
    put(arms, skinBox(4, 8, 4, { color: sleeve }), -6, -4, 0);
    put(arms, skinBox(8, 4, 4, { color: skin }), 0, -6, 0);

    let flower = null;
    if (opts.flower) {
      const m = new THREE.MeshLambertMaterial({ map: WC.Tex.tileTexture('poppy'), alphaTest: 0.5, side: THREE.DoubleSide });
      flower = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), m);
      flower.position.set(0, -4 * P, 4 * P);
      flower.rotation.x = 0.75;
      arms.add(flower);
    }

    if (opts.child) {
      r.scale.setScalar(0.5);
      head.scale.setScalar(1.5);
      a.eyeHeight = 1.0;
      a.stepScale = 1.8;
    }
    const size = r.scale.y;

    Object.assign(a.parts, { legL, legR, head, arms, flower });
    a.anim = (dt, t) => {
      const running = a.vel > 2.5;
      walkLegs(a, running ? 1.1 : 0.7);
      let lean = 0, bob = 0;
      if (running) { lean = 0.15; bob = Math.abs(Math.sin(a.phase)) * 0.06 * size; }
      if (a.mode === 'pick') lean = 0.5;
      approach(a.rig.rotation, 'x', lean, 6, dt);
      a.rig.position.y += bob;
      let hy = a.headYaw, hp = a.headPitch;
      if (a.mode === 'panic') { hy = Math.sin(t * 9) * 0.9; hp = -0.1; }
      if (a.mode === 'pick') hp = 0.6;
      if (a.mode === 'sit' || a.mode === 'sitUp') {
        legL.rotation.x = legR.rotation.x = -1.45;
        a.rig.position.y -= 0.34 * size;
        if (a.mode === 'sit') hp = 0.32 + Math.sin(t * 0.9) * 0.07;
      }
      head.rotation.y = hy;
      head.rotation.x = hp;
      head.rotation.z = a.mode === 'confused' ? Math.sin(t * 2) * 0.25 : 0;
    };
    return a.finish();
  }

  // ---------------------------------------------------------------- Zombie
  function zombie() {
    const a = new Actor('zombie');
    const r = a.rig;
    const skin = '#4f7f38';
    const legL = pivot(r, 2, 12, 0), legR = pivot(r, -2, 12, 0);
    const pants = { color: '#3c3f9e', bottom: '#555555', front: (ctx, w, h) => { ctx.fillStyle = '#5a5a5a'; ctx.fillRect(0, h - 2, w, 2); } };
    put(legL, skinBox(4, 12, 4, pants), 0, -6, 0);
    put(legR, skinBox(4, 12, 4, pants), 0, -6, 0);
    put(r, skinBox(8, 12, 4, { color: '#2a9a9c' }), 0, 18, 0);
    const head = pivot(r, 0, 24, 0);
    put(head, skinBox(8, 8, 8, {
      color: skin,
      front: pattern(['', '', '', '.kk..kk.', '.nk..kn.', '...nn...', '..nnnn..'], { k: '#16220f', n: '#3b6329' }),
    }), 0, 4, 0);
    const armSpec = { color: skin, front: (ctx, w) => { ctx.fillStyle = '#2a9a9c'; ctx.fillRect(0, 0, w, 4); } };
    armSpec.left = armSpec.front; armSpec.right = armSpec.front; armSpec.back = armSpec.front;
    const armL = pivot(r, 6, 22, 0), armR = pivot(r, -6, 22, 0);
    put(armL, skinBox(4, 12, 4, armSpec), 0, -4, 0);
    put(armR, skinBox(4, 12, 4, armSpec), 0, -4, 0);
    Object.assign(a.parts, { legL, legR, head, armL, armR });
    a.stride = 3.5;
    a.anim = (dt, t) => {
      walkLegs(a, 0.7);
      const scared = a.mode === 'scared';
      const base = scared ? -0.7 : -1.45;
      armL.rotation.x = base + Math.sin(t * 1.3 + a.seed) * 0.06;
      armR.rotation.x = base + Math.sin(t * 1.3 + a.seed + 1) * 0.06;
      armL.rotation.z = scared ? 0.35 : 0.05;
      armR.rotation.z = scared ? -0.35 : -0.05;
      head.rotation.y = a.headYaw;
      head.rotation.x = a.headPitch;
      a.rig.rotation.z = Math.sin(t * 0.9 + a.seed) * 0.03;
    };
    return a.finish();
  }

  // ---------------------------------------------------------------- Skeleton
  function skeleton() {
    const a = new Actor('skeleton');
    const r = a.rig;
    const bone = '#c9c9c9';
    const legL = pivot(r, 2, 12, 0), legR = pivot(r, -2, 12, 0);
    put(legL, skinBox(2, 12, 2, { color: bone }), 0, -6, 0);
    put(legR, skinBox(2, 12, 2, { color: bone }), 0, -6, 0);
    const ribs = (ctx, w, h) => {
      for (let y = 0; y < h; y++) {
        if (y % 2 === 1 && y < 9) continue;
        if (y >= 9 && y < 11) { ctx.clearRect(0, y, w, 1); ctx.fillStyle = bone; ctx.fillRect((w >> 1) - 1, y, 2, 1); continue; }
        if (y % 2 === 1) ctx.clearRect(0, y, w, 1);
      }
      for (let y = 1; y < 9; y += 2) { ctx.clearRect(0, y, w, 1); ctx.fillStyle = '#b0b0b0'; ctx.fillRect((w >> 1) - 1, y, 2, 1); }
    };
    put(r, skinBox(8, 12, 4, { color: bone, alpha: true, front: ribs, back: ribs, left: ribs, right: ribs }), 0, 18, 0);
    const head = pivot(r, 0, 24, 0);
    put(head, skinBox(8, 8, 8, {
      color: '#c6c6c6',
      front: pattern(['', '', '', '.kk..kk.', '.kk..kk.', '...kk...', '.k.k.k.k', '.kkkkkk.'], { k: '#2a2a2a' }),
    }), 0, 4, 0);
    const armL = pivot(r, 5, 22, 0), armR = pivot(r, -5, 22, 0);
    put(armL, skinBox(2, 12, 2, { color: bone }), 0, -5, 0);
    put(armR, skinBox(2, 12, 2, { color: bone }), 0, -5, 0);
    const bow = new THREE.Group();
    const wood = { color: '#6b4a2a' };
    put(bow, skinBox(1, 8, 1, wood), 0, 0, 1);
    const tipA = put(bow, skinBox(1, 4, 1, wood), 0, 5, 0);
    const tipB = put(bow, skinBox(1, 4, 1, wood), 0, -5, 0);
    tipA.rotation.x = -0.5;
    tipB.rotation.x = 0.5;
    put(bow, skinBox(1, 14, 1, { color: '#dddddd' }), 0, 0, -1).scale.set(0.3, 1, 0.3);
    bow.position.set(0, -11 * P, 0);
    bow.rotation.x = Math.PI / 2;
    armR.add(bow);
    Object.assign(a.parts, { legL, legR, head, armL, armR });
    a.stride = 3.5;
    a.anim = (dt, t) => {
      walkLegs(a, 0.7);
      armR.rotation.x = -1.2 + Math.sin(t * 1.1 + a.seed) * 0.05;
      armL.rotation.x = a.mode === 'scared' ? -1.6 : -0.2;
      armL.rotation.z = 0.1;
      head.rotation.y = a.headYaw;
      head.rotation.x = a.headPitch;
    };
    return a.finish();
  }

  // ---------------------------------------------------------------- Creeper
  function creeper() {
    const a = new Actor('creeper');
    const r = a.rig;
    const mottled = (ctx, w, h, rand) => {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (rand() < 0.45) WC.Tex.px(ctx, x, y, WC.Tex.pick(rand, ['#4f8a36', '#79c35c', '#3f6f2a', '#8fd06f', '#9aa89a']));
    };
    const spec = () => ({ color: '#5da443', front: mottled, back: mottled, left: mottled, right: mottled, top: mottled });
    const legs = [];
    [[2, 4], [-2, 4], [2, -4], [-2, -4]].forEach(([x, z]) => {
      const lp = pivot(r, x, 6, z);
      put(lp, skinBox(4, 6, 4, spec()), 0, -3, 0);
      legs.push(lp);
    });
    put(r, skinBox(8, 12, 4, spec()), 0, 12, 0);
    const head = pivot(r, 0, 18, 0);
    const face = spec();
    const inner = face.front;
    face.front = (ctx, w, h, rand) => {
      inner(ctx, w, h, rand);
      pattern(['', '', '.kk..kk.', '.kk..kk.', '...kk...', '..kkkk..', '..kkkk..', '..k..k..'], { k: '#101010' })(ctx);
    };
    put(head, skinBox(8, 8, 8, face), 0, 4, 0);
    Object.assign(a.parts, { head, legs });
    a.anim = (dt, t) => {
      const k = Math.min(1, a.vel * 0.6) * 0.6;
      const s = Math.sin(a.phase) * k;
      legs[0].rotation.x = s; legs[3].rotation.x = s;
      legs[1].rotation.x = -s; legs[2].rotation.x = -s;
      head.rotation.y = a.headYaw;
      head.rotation.x = a.headPitch;
      const scared = a.mode === 'scared';
      approach(a.rig.scale, 'y', scared ? 0.9 : 1, 6, dt);
      if (scared) a.rig.position.x += Math.sin(t * 60) * 0.02;
    };
    return a.finish();
  }

  // ---------------------------------------------------------------- Enderman
  function enderman() {
    const a = new Actor('enderman');
    const r = a.rig;
    const black = { color: '#161616', noise: 0.25 };
    const legL = pivot(r, 2, 30, 0), legR = pivot(r, -2, 30, 0);
    put(legL, skinBox(2, 30, 2, black), 0, -15, 0);
    put(legR, skinBox(2, 30, 2, black), 0, -15, 0);
    put(r, skinBox(8, 12, 4, black), 0, 36, 0);
    const armL = pivot(r, 5, 42, 0), armR = pivot(r, -5, 42, 0);
    put(armL, skinBox(2, 30, 2, black), 0, -15, 0);
    put(armR, skinBox(2, 30, 2, black), 0, -15, 0);
    const head = pivot(r, 0, 42, 0);
    const eyes = pattern(['', '', '', '', 'mpp..ppm'], { m: '#cc33ff', p: '#f0a0ff' });
    put(head, skinBox(8, 8, 8, { color: '#141414', noise: 0.25, front: eyes, glow: { front: eyes } }), 0, 4, 0);
    Object.assign(a.parts, { legL, legR, head, armL, armR });
    a.stride = 2.5;
    a.anim = (dt, t) => {
      walkLegs(a, 0.5);
      armL.rotation.x = Math.sin(t * 0.8 + a.seed) * 0.08;
      armR.rotation.x = -Math.sin(t * 0.8 + a.seed) * 0.08;
      head.rotation.y = a.headYaw;
      head.rotation.x = a.headPitch;
      head.rotation.z = Math.sin(t * 7 + a.seed) * 0.04;
    };
    return a.finish();
  }

  WC.Mobs = { villager, zombie, skeleton, creeper, enderman, pattern, walkLegs };
})();
