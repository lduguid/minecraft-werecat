(function () {
  const { B, VoxelGrid } = WC.Mesher;
  const U = WC.U;

  const X_MIN = -56, SX = 112, Z_MIN = -100, SZ0 = 148, SY = 44;
  const VH = 12; // top block height inside the village
  const S = { x: 2, z: 6 }; // where the villager gets caught by nightfall
  const VC = { x: -4, z: -62 }; // village centre, far to the north
  const FB = { x: 8, z: -52 }; // flashback spot at the village edge
  const hd = new THREE.Vector2(WC.MOON_DIR.x, WC.MOON_DIR.z).normalize();
  const HC = { x: Math.round(S.x + hd.x * 26), z: Math.round(S.z + hd.y * 26) }; // the werecat's hill

  const SPOTS = {
    zombieA: [-7, 12], zombieB: [10, -6], skeletonA: [-11, -1], skeletonB: [12, 14],
    spiderA: [5, 17], spiderB: [-14, 15], creeper: [-7, -38], enderman: [-22, 24],
  };

  const RUN_PATH = [[2, 6], [0, -4], [-3, -14], [-2, -24], [-4, -34], [-4, -44], [-4, -52], [-4, -58]];

  function distToSeg(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az;
    const t = U.clamp(((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz), 0, 1);
    return { d: Math.hypot(px - (ax + vx * t), pz - (az + vz * t)), t };
  }

  function terrainHeight(x, z) {
    let h = 10 + 3.2 * U.fbm(x * 0.03, z * 0.03, 3, 11) + 1.1 * U.noise2(x * 0.11, z * 0.11, 5);
    const corr = distToSeg(x, z, S.x, S.z, VC.x, VC.z);
    const wc = (1 - U.smoothstep(3, 11, corr.d)) * 0.75;
    h = U.lerp(h, U.lerp(10.6, VH, corr.t) + 0.6 * U.noise2(x * 0.08, z * 0.08, 9), wc);
    const dh = Math.hypot(x - HC.x, z - HC.z) / 11;
    if (dh < 1) h += 9 * Math.pow(1 - dh * dh, 2);
    const dv = Math.hypot(x - VC.x, z - VC.z);
    h = U.lerp(h, VH, 1 - U.smoothstep(14, 22, dv));
    const ds = Math.hypot(x - S.x, z - S.z);
    h = U.lerp(h, 10.5, (1 - U.smoothstep(3, 9, ds)) * 0.6);
    return Math.round(h);
  }

  // opts (all optional, used by other stories set in the same world):
  //   zMax      extend the world further south
  //   height    (x, z, h) => h, reshape the terrain
  //   treeOk    (x, z) => bool, veto a scattered plains tree
  //   decorate  (tools) => extra, build additional structures
  //   plant     (x, z, h, r, rand) => plant | null | undefined (undefined = default plants)
  //   keepPlant (plant) => bool, drop generated plants without changing where the others grow
  //   mesher    options passed to WC.Mesher.build
  function build(scene, opts) {
    opts = opts || {};
    const SZ = opts.zMax !== undefined ? opts.zMax - Z_MIN : SZ0;
    const grid = new VoxelGrid(X_MIN, Z_MIN, SX, SY, SZ);
    const hmap = new Int16Array(SX * SZ);
    const cx = (x) => U.clamp(x, X_MIN, X_MIN + SX - 1);
    const cz = (z) => U.clamp(z, Z_MIN, Z_MIN + SZ - 1);
    const H = (x, z) => hmap[(cx(x) - X_MIN) * SZ + (cz(z) - Z_MIN)];
    const setH = (x, z, h) => { hmap[(x - X_MIN) * SZ + (z - Z_MIN)] = h; };

    // ---- Terrain ----
    for (let x = X_MIN; x < X_MIN + SX; x++) {
      for (let z = Z_MIN; z < Z_MIN + SZ; z++) {
        const h = opts.height ? opts.height(x, z, terrainHeight(x, z)) : terrainHeight(x, z);
        setH(x, z, h);
        for (let y = 0; y <= h; y++) grid.set(x, y, z, y === h ? B.GRASS : y >= h - 3 ? B.DIRT : B.STONE);
      }
    }

    const plants = [];
    const noPlant = new Set();
    const key = (x, z) => x + ',' + z;
    const torches = []; // { pos, normal, light }
    const windows = []; // { pos, normal }
    const lampSpots = [];

    const top = (x, z, id) => { grid.set(x, H(x, z), z, id); noPlant.add(key(x, z)); };

    // ---- Village paths ----
    for (let z = VC.z - 12; z <= VC.z + 24; z++) top(VC.x, z, B.PATH);
    for (let x = VC.x - 12; x <= VC.x + 11; x++) top(x, VC.z, B.PATH);

    // ---- Houses ----
    function house(x0, z0, w, d, door) {
      for (let x = x0; x < x0 + w; x++) {
        for (let z = z0; z < z0 + d; z++) {
          noPlant.add(key(x, z));
          grid.set(x, VH, z, B.COBBLE);
          const ex = x === x0 || x === x0 + w - 1, ez = z === z0 || z === z0 + d - 1;
          for (let y = VH + 1; y <= VH + 3; y++) {
            if (ex && ez) grid.set(x, y, z, B.LOG);
            else if (ex || ez) grid.set(x, y, z, y === VH + 1 ? B.COBBLE : B.PLANKS);
            else grid.set(x, y, z, B.AIR);
          }
        }
      }
      for (let k = 0; ; k++) {
        const ax = x0 - 1 + k, bx = x0 + w - k, az = z0 - 1 + k, bz = z0 + d - k;
        if (ax > bx || az > bz) break;
        for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) grid.set(x, VH + 4 + k, z, B.SPRUCE);
      }
      const walls = {
        E: { x: x0 + w - 1, z: z0, n: [1, 0, 0], len: d, along: [0, 0, 1] },
        W: { x: x0, z: z0, n: [-1, 0, 0], len: d, along: [0, 0, 1] },
        S: { x: x0, z: z0 + d - 1, n: [0, 0, 1], len: w, along: [1, 0, 0] },
        N: { x: x0, z: z0, n: [0, 0, -1], len: w, along: [1, 0, 0] },
      };
      Object.keys(walls).forEach((side) => {
        const wl = walls[side];
        const at = (i) => [wl.x + wl.along[0] * i, wl.z + wl.along[2] * i];
        const normal = new THREE.Vector3(wl.n[0], 0, wl.n[2]);
        const mid = Math.floor(wl.len / 2);
        const winAt = (i) => {
          const [x, z] = at(i);
          grid.set(x, VH + 2, z, B.WINDOW);
          windows.push({ pos: new THREE.Vector3(x + 0.5, VH + 2.5, z + 0.5).addScaledVector(normal, 0.6), normal });
        };
        if (side === door) {
          const [x, z] = at(mid);
          grid.set(x, VH + 1, z, B.DOOR_B);
          grid.set(x, VH + 2, z, B.DOOR_T);
          torches.push({ pos: new THREE.Vector3(x + 0.5, VH + 3.4, z + 0.5).addScaledVector(normal, 0.58), normal, light: true });
          if (wl.len >= 6) winAt(1);
          const [ox, oz] = [x + wl.n[0], z + wl.n[2]];
          top(ox, oz, B.PATH);
        } else {
          winAt(mid);
        }
      });
    }

    house(VC.x - 11, VC.z - 7, 5, 5, 'E');
    house(VC.x + 3, VC.z - 9, 6, 5, 'W');
    house(VC.x - 10, VC.z + 3, 5, 6, 'E');
    house(VC.x - 12, VC.z - 16, 5, 5, 'S');

    // ---- Lamp post at the crossroads ----
    const lx = VC.x + 1, lz = VC.z + 1;
    grid.set(lx, VH + 1, lz, B.COBBLE);
    grid.set(lx, VH + 2, lz, B.LOG);
    grid.set(lx, VH + 3, lz, B.LOG);
    grid.set(lx, VH + 4, lz, B.LANTERN);
    noPlant.add(key(lx, lz));
    lampSpots.push(new THREE.Vector3(lx + 0.5, VH + 4.5, lz + 0.5));

    // ---- Gate posts where the path leaves the village ----
    [VC.x - 1, VC.x + 1].forEach((gx) => {
      const gz = VC.z + 17;
      const gy = H(gx, gz);
      grid.set(gx, gy + 1, gz, B.COBBLE);
      noPlant.add(key(gx, gz));
      torches.push({ pos: new THREE.Vector3(gx + 0.5, gy + 2.3, gz + 0.5), normal: new THREE.Vector3(0, 1, 0), light: true });
    });

    // ---- Farm ----
    const fx0 = VC.x + 3, fz0 = VC.z + 2, fw = 7, fd = 5;
    for (let x = fx0 - 1; x <= fx0 + fw; x++) {
      for (let z = fz0 - 1; z <= fz0 + fd; z++) {
        const border = x === fx0 - 1 || x === fx0 + fw || z === fz0 - 1 || z === fz0 + fd;
        grid.set(x, VH, z, border ? B.LOG : B.FARMLAND);
        noPlant.add(key(x, z));
        if (!border) plants.push({ x, y: VH + 1, z, tile: 'wheat', h: 0.9 });
      }
    }

    // ---- Hay bales (village + flashback set) ----
    const hay = (x, z, y) => { grid.set(x, y === undefined ? H(x, z) + 1 : y, z, B.HAY); noPlant.add(key(x, z)); };
    hay(VC.x - 4, VC.z + 8); hay(VC.x - 4, VC.z + 9); hay(VC.x - 4, VC.z + 8, H(VC.x - 4, VC.z + 8) + 2);
    hay(FB.x - 3, FB.z - 2); hay(FB.x - 2, FB.z - 2); hay(FB.x - 3, FB.z - 1);
    hay(FB.x - 3, FB.z - 2, H(FB.x - 3, FB.z - 2) + 2);

    // ---- Trees ----
    const rand = U.rng(20260923);
    const trees = [];
    function tree(x, z) {
      const g = H(x, z);
      const th = 4 + (rand() < 0.5 ? 1 : 0);
      const put = (px, py, pz) => { if (grid.get(px, py, pz) === B.AIR) grid.set(px, py, pz, B.LEAVES); };
      for (let dy = th - 1; dy <= th + 2; dy++) {
        const r = dy <= th ? 2 : 1;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const corner = Math.abs(dx) === r && Math.abs(dz) === r;
            if (corner && (dy === th + 2 || rand() < 0.5)) continue;
            if (dy === th + 2 && (Math.abs(dx) + Math.abs(dz) > 1)) continue;
            put(x + dx, g + dy, z + dz);
          }
        }
      }
      for (let y = g + 1; y <= g + th; y++) grid.set(x, y, z, B.LOG);
      noPlant.add(key(x, z));
      trees.push([x, z]);
    }
    const spotList = Object.values(SPOTS);
    for (let i = 0; i < 500 && trees.length < 44; i++) {
      const x = Math.floor(X_MIN + 4 + rand() * (SX - 8));
      const z = Math.floor(Z_MIN + 4 + rand() * (SZ - 8));
      if (distToSeg(x, z, S.x, S.z, VC.x, VC.z).d < 8) continue;
      if (distToSeg(x, z, S.x, S.z, HC.x, HC.z).d < 6) continue;
      if (Math.hypot(x - HC.x, z - HC.z) < 14) continue;
      if (Math.hypot(x - VC.x, z - VC.z) < 21) continue;
      if (Math.hypot(x - FB.x, z - FB.z) < 8) continue;
      if (Math.hypot(x - S.x, z - S.z) < 10) continue;
      if (spotList.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 4.5)) continue;
      if (trees.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 6)) continue;
      if (opts.treeOk && !opts.treeOk(x, z)) continue;
      tree(x, z);
    }
    tree(VC.x - 17, VC.z + 2);
    tree(VC.x + 12, VC.z - 12);

    const extra = opts.decorate ? opts.decorate({ grid, B, H, top, noPlant, key, plants, rand, trees, tree, SY }) : null;

    // ---- Grass and flowers ----
    for (let x = X_MIN; x < X_MIN + SX; x++) {
      for (let z = Z_MIN; z < Z_MIN + SZ; z++) {
        if (noPlant.has(key(x, z))) continue;
        const h = H(x, z);
        if (grid.get(x, h, z) !== B.GRASS || grid.get(x, h + 1, z) !== B.AIR) continue;
        const r = rand();
        if (opts.plant) {
          const p = opts.plant(x, z, h, r, rand);
          if (p !== undefined) {
            if (p) plants.push(p);
            continue;
          }
        }
        const nearStart = Math.hypot(x - S.x, z - S.z) < 7;
        if (nearStart && r < 0.16) plants.push({ x, y: h + 1, z, tile: U.hash2(x, z, 3) < 0.55 ? 'poppy' : U.hash2(x, z, 4) < 0.5 ? 'cornflower' : 'dandelion', h: 1 });
        else if (r < 0.22) plants.push({ x, y: h + 1, z, tile: 'tall_grass', h: 0.75 + rand() * 0.25 });
        else if (r < 0.24) plants.push({ x, y: h + 1, z, tile: ['poppy', 'dandelion', 'cornflower'][(rand() * 3) | 0], h: 1 });
      }
    }

    // ---- Mesh it ----
    const atlas = WC.Tex.buildAtlas();
    const kept = opts.keepPlant ? plants.filter(opts.keepPlant) : plants;
    const { meshes, materials } = WC.Mesher.build(grid, atlas, kept, opts.mesher);
    Object.values(meshes).forEach((m) => scene.add(m));

    // ---- Lights: torches, lamp, window glows ----
    const glowTex = WC.Tex.glowTexture();
    const glowSprite = (color, scale, opacity) => {
      const m = new THREE.SpriteMaterial({
        map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true,
        depthWrite: false, fog: false, opacity,
      });
      const s = new THREE.Sprite(m);
      s.scale.setScalar(scale);
      return s;
    };

    const lightRecs = [];
    const stickMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
    const stickGeo = new THREE.BoxGeometry(0.125, 0.55, 0.125);
    const flameGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    torches.forEach((t, i) => {
      const g = new THREE.Group();
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 0.33;
      g.add(stick, flame);
      g.position.copy(t.pos);
      if (Math.abs(t.normal.y) < 0.5) g.quaternion.setFromAxisAngle(new THREE.Vector3(t.normal.z, 0, -t.normal.x), 0.38);
      scene.add(g);
      const sprite = glowSprite(0xffa040, 3.2, 0.85);
      sprite.position.copy(t.pos).add(new THREE.Vector3(0, 0.35, 0)).addScaledVector(t.normal, 0.1);
      scene.add(sprite);
      const light = new THREE.PointLight(0xffa14f, 0, 13, 1.4);
      light.position.copy(sprite.position).addScaledVector(t.normal, 0.4);
      scene.add(light);
      lightRecs.push({ light, sprite, flameMat, base: 9, scale: 3.2, opacity: 0.85, th: 0.1 + (i % 5) * 0.14, ph: i * 1.7 });
    });

    lampSpots.forEach((p, i) => {
      const sprite = glowSprite(0xffc060, 6, 0.9);
      sprite.position.copy(p);
      scene.add(sprite);
      const light = new THREE.PointLight(0xffb45a, 0, 16, 1.3);
      light.position.copy(p).add(new THREE.Vector3(0, 0.8, 0));
      scene.add(light);
      lightRecs.push({ light, sprite, base: 12, scale: 6, opacity: 0.9, th: 0.05, ph: 9 + i });
    });

    windows.forEach((w, i) => {
      const sprite = glowSprite(0xffb85a, 1.9, 0.55);
      sprite.position.copy(w.pos);
      scene.add(sprite);
      lightRecs.push({ light: null, sprite, base: 0, scale: 1.9, opacity: 0.55, th: 0.2 + ((i * 37) % 60) / 100, ph: i * 2.3 });
    });

    let lightsLevel = 1;

    const api = {
      grid, B, atlas, materials, meshes, VH, extra,
      heightAt(x, z) { return H(Math.floor(x), Math.floor(z)); },
      S: new THREE.Vector3(S.x + 0.5, H(S.x, S.z) + 1, S.z + 0.5),
      VC: new THREE.Vector3(VC.x + 0.5, VH + 1, VC.z + 0.5),
      FB: new THREE.Vector3(FB.x + 0.5, H(FB.x, FB.z) + 1, FB.z + 0.5),
      HILL: null,
      spots: {},
      runPath: RUN_PATH.map(([x, z]) => new THREE.Vector3(x + 0.5, H(x, z) + 1, z + 0.5)),
      groundAt(x, z) { return H(Math.floor(x), Math.floor(z)) + 1; },
      camFloor(x, z) {
        let best = 0;
        const fx = Math.floor(x), fz = Math.floor(z);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (let y = SY - 1; y > best; y--) {
              if (grid.get(fx + dx, y, fz + dz) !== B.AIR) { best = Math.max(best, y + 1); break; }
            }
          }
        }
        return best;
      },
      setLightsOn(level) { lightsLevel = level; },
      update(t) {
        const glowK = 0.12 + 0.88 * lightsLevel;
        materials.glow.color.setRGB(glowK, glowK, glowK);
        lightRecs.forEach((r) => {
          const on = U.smoothstep(r.th, r.th + 0.12, lightsLevel);
          const flick = 0.86 + 0.14 * Math.sin(t * 9 + r.ph) * Math.sin(t * 13.7 + r.ph * 2);
          if (r.light) r.light.intensity = r.base * on * flick;
          r.sprite.material.opacity = r.opacity * on * (0.9 + 0.1 * flick);
          r.sprite.visible = on > 0.01;
          r.sprite.scale.setScalar(r.scale * (0.94 + 0.06 * flick));
          if (r.flameMat) r.flameMat.color.setRGB(0.25 + 0.75 * on, 0.2 + 0.65 * on, 0.1 + 0.44 * on);
        });
      },
    };

    let best = -1, hx = HC.x, hz = HC.z;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const h = H(HC.x + dx, HC.z + dz);
        if (h > best) { best = h; hx = HC.x + dx; hz = HC.z + dz; }
      }
    }
    api.HILL = new THREE.Vector3(hx + 0.5, best + 1, hz + 0.5);
    Object.keys(SPOTS).forEach((k) => {
      const [x, z] = SPOTS[k];
      api.spots[k] = new THREE.Vector3(x + 0.5, H(x, z) + 1, z + 0.5);
    });
    return api;
  }

  WC.World = { build };
})();
