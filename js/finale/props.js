window.WC = window.WC || {};

(function () {
  const U = WC.U;
  const FW = (WC.Finale = WC.Finale || {});
  const HW = WC.Halloween;
  const { skinBox, put, P } = WC.Rig;

  // A potion bottle with glowing liquid. big=true for the witch's giant splash potion.
  function bottle(color, big) {
    const g = new THREE.Group();
    const s = big ? 1.7 : 1;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(4 * P * s, 5 * P * s, 4 * P * s), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    glass.position.y = 2.5 * P * s;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(2 * P * s, 2 * P * s, 2 * P * s), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.6 }));
    neck.position.y = 6 * P * s;
    const cork = new THREE.Mesh(new THREE.BoxGeometry(2.2 * P * s, 1 * P * s, 2.2 * P * s), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
    cork.position.y = 7.4 * P * s;
    g.add(glass, neck, cork);
    if (big) {
      const gl = HW.glowSprite(color, 1.1, 0.6);
      gl.position.y = 3 * P * s;
      g.add(gl);
    }
    return g;
  }

  function cauldron() {
    const g = new THREE.Group();
    const iron = { color: '#2e2e34', noise: 0.12 };
    put(g, skinBox(14, 9, 14, iron), 0, 5.5, 0);
    put(g, skinBox(16, 2, 1, iron), 0, 10.5, 7.5);
    put(g, skinBox(16, 2, 1, iron), 0, 10.5, -7.5);
    put(g, skinBox(1, 2, 14, iron), 7.5, 10.5, 0);
    put(g, skinBox(1, 2, 14, iron), -7.5, 10.5, 0);
    [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([x, z]) => put(g, skinBox(2, 2, 2, iron), x, 1, z));
    const brew = new THREE.Mesh(new THREE.PlaneGeometry(13 * P, 13 * P), new THREE.MeshBasicMaterial({ color: 0x5aff4a }));
    brew.rotation.x = -Math.PI / 2;
    brew.position.y = 10.4 * P;
    g.add(brew);
    const glow = HW.glowSprite(0x6aff4a, 2.2, 0.55);
    glow.position.y = 12 * P;
    g.add(glow);
    const light = new THREE.PointLight(0x7aff6a, 3.2, 6, 1.4);
    light.position.y = 16 * P;
    g.add(light);
    return {
      group: g, light,
      update(t) {
        const f = 0.85 + 0.15 * Math.sin(t * 5) * Math.sin(t * 3.3);
        light.intensity = 3.2 * f;
        glow.material.opacity = 0.5 * f;
        brew.position.y = (10.4 + Math.sin(t * 3) * 0.2) * P;
      },
    };
  }

  // A plank shelf of potions running along local z, with one bottle conspicuously missing.
  function shelf(n, emptySlot) {
    const g = new THREE.Group();
    put(g, skinBox(4, 1, 40, { color: '#5a4228' }), 0, 0, 0);
    const bottles = [];
    for (let i = 0; i < n; i++) {
      const z = (-16 + (i * 32) / (n - 1)) * P;
      if (i === emptySlot) {
        const ring = new THREE.Mesh(new THREE.BoxGeometry(4 * P, 0.2 * P, 4 * P), new THREE.MeshBasicMaterial({ color: 0x2e8a2a }));
        ring.position.set(0, 0.6 * P, z);
        g.add(ring);
        continue;
      }
      const b = bottle(i % 2 ? 0xb040ff : 0x5aff4a);
      b.position.set(0, 0.5 * P, z);
      g.add(b);
      bottles.push(b);
    }
    return { group: g, bottles };
  }

  // The witch's map: the village, the path, the dark forest, and Grandpa's cottage circled in red.
  function forestMap() {
    const c = WC.Tex.makeCanvas(18, 14);
    const ctx = c.getContext('2d');
    WC.Tex.fillNoise(ctx, 0, 0, 18, 14, '#d8c8a0', 0.06, U.rng(12));
    ctx.fillStyle = '#2f5a2c';
    for (let x = 0; x < 18; x += 2) ctx.fillRect(x, 9 + ((x * 7) % 3), 2, 5);
    ctx.fillStyle = '#8a6a3c';
    ctx.fillRect(3, 1, 2, 2); ctx.fillRect(6, 2, 2, 2); ctx.fillRect(3, 4, 2, 1);
    ctx.fillStyle = '#6b4a2a';
    [[6, 4], [7, 5], [8, 5], [9, 6], [10, 7], [11, 7]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
    ctx.fillStyle = '#5a4428';
    ctx.fillRect(12, 7, 2, 2);
    ctx.fillStyle = '#c02020';
    [[11, 5], [12, 5], [13, 5], [14, 5], [10, 6], [15, 6], [10, 7], [15, 7], [10, 8], [15, 8], [11, 9], [12, 9], [13, 9], [14, 9]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(0, 0, 18, 1); ctx.fillRect(0, 13, 18, 1); ctx.fillRect(0, 0, 1, 14); ctx.fillRect(17, 0, 1, 14);
    return new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshLambertMaterial({ map: WC.Tex.toTexture(c) }));
  }

  function witchHat(scale) {
    const g = new THREE.Group();
    const black = { color: '#161018' };
    put(g, skinBox(14, 1, 14, black), 0, 0, 0);
    put(g, skinBox(8, 3, 8, { color: '#161018', front: (ctx, w) => { ctx.fillStyle = '#3a8a3a'; ctx.fillRect(0, 2, w, 1); WC.Tex.px(ctx, 3, 2, '#e0c040'); WC.Tex.px(ctx, 4, 2, '#e0c040'); } }), 0, 2, 0);
    put(g, skinBox(6, 3, 6, black), 0, 5, -0.5);
    put(g, skinBox(4, 3, 4, black), 0, 8, -1);
    put(g, skinBox(2, 3, 2, black), 0, 10.5, -2).rotation.x = -0.6;
    g.scale.setScalar(scale || 1);
    return g;
  }

  function table() {
    const g = new THREE.Group();
    const wood = { color: '#6b4f33' };
    put(g, skinBox(12, 1, 12, wood), 0, 10.5, 0);
    [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([x, z]) => put(g, skinBox(1, 10, 1, wood), x, 5, z));
    return g;
  }

  function goldenApple() {
    const g = new THREE.Group();
    put(g, skinBox(5, 5, 5, { color: '#f2c830', noise: 0.05, front: (ctx) => WC.Tex.px(ctx, 1, 1, '#fff6c0') }), 0, 2.5, 0);
    put(g, skinBox(1, 2, 1, { color: '#6b4a2a' }), 0, 6, 0);
    put(g, skinBox(2, 1, 1, { color: '#4a9a3a' }), 1.2, 6.2, 0);
    const glint = HW.glowSprite(0xffe066, 0.55, 0.5);
    glint.position.y = 3 * P;
    g.add(glint);
    return g;
  }

  function broom() {
    const g = new THREE.Group();
    put(g, skinBox(1, 30, 1, { color: '#6b4a2a' }), 0, 21, 0);
    put(g, skinBox(5, 7, 5, { color: '#c8a24a', noise: 0.15 }), 0, 3.5, 0);
    put(g, skinBox(3, 3, 3, { color: '#b8923a', noise: 0.15 }), 0, 8.5, 0);
    return g;
  }

  function bench() {
    const g = new THREE.Group();
    const wood = { color: '#6e4f2d' };
    put(g, skinBox(24, 2, 7, wood), 0, 5.5, 0);
    put(g, skinBox(2, 5, 6, wood), -10, 2.5, 0);
    put(g, skinBox(2, 5, 6, wood), 10, 2.5, 0);
    return g;
  }

  let poppyTex = null;
  function poppy() {
    poppyTex = poppyTex || WC.Tex.tileTexture('poppy');
    return new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshLambertMaterial({ map: poppyTex, alphaTest: 0.5, side: THREE.DoubleSide }));
  }

  // The lair's front door: plain oak that can be swapped for a claw-raked version.
  function lairDoor() {
    const plain = HW.clawedDoor({ claws: false, damage: false });
    const clawed = HW.clawedDoor({ claws: true, damage: false });
    plain.group.add(clawed.mesh);
    clawed.mesh.visible = false;
    return {
      group: plain.group,
      setClawed(on) { clawed.mesh.visible = on; plain.mesh.visible = !on; },
    };
  }

  // Grandpa's patched robe and bandaged arm, added onto a plain villager model.
  function patchUpGrandpa(v) {
    put(v.parts.arms, skinBox(9, 2.4, 4.6, { color: '#e8e0d0', noise: 0.04 }), 1.5, -6, 0);
    put(v.rig, skinBox(3, 3, 0.5, { color: '#7a9a52' }), 1.5, 10, 3.1);
  }

  Object.assign(FW, { bottle, cauldron, shelf, forestMap, witchHat, table, goldenApple, broom, bench, poppy, lairDoor, patchUpGrandpa });
})();
