window.WC = window.WC || {};

(function () {
  const U = WC.U;
  const HW = (WC.Halloween = WC.Halloween || {});

  // Grandpa's cottage sits at the edge of the dark forest, far south of the village.
  const CH = 11; // top block height of the cottage clearing
  const COT = { x0: -11, z0: 57, w: 6, d: 5, doorX: -8 };
  const FENCE = { x0: -16, x1: -1, z0: 48, z1: 62, gate: [-8, -7] };
  const PATH = [[-4, -44], [-3, -30], [-1, -16], [0, -4], [-1, 8], [-4, 20], [-6, 32], [-7, 44], [-7.5, 49], [-8, 56]];
  const EYES = { x: 3.5, z: 71.5 }; // something watching from the trees
  const EYE_CAM = { x: -2.5, z: 54.5 };
  const Z_MAX = 96;

  const edgeZ = (x) => 63 + 2.5 * U.noise2(x * 0.12, 0.5, 77);

  function distSeg(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az;
    const t = U.clamp(((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz), 0, 1);
    return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
  }
  function pathDist(x, z) {
    let d = 1e9;
    for (let i = 0; i < PATH.length - 1; i++) d = Math.min(d, distSeg(x, z, PATH[i][0], PATH[i][1], PATH[i + 1][0], PATH[i + 1][1]));
    return d;
  }

  function height(x, z, h) {
    const dc = Math.hypot(x - -8.5, z - 55);
    h = U.lerp(h, CH, 1 - U.smoothstep(9, 15, dc));
    if (z > 58) h += 1.2 * U.noise2(x * 0.16, z * 0.16, 41) * U.smoothstep(58, 70, z);
    return Math.round(h);
  }

  function plant(x, z, h, r, rand) {
    if (z < 40) return undefined;
    if (r < 0.14) return { x, y: h + 1, z, tile: 'dry_grass', h: 0.7 + rand() * 0.3 };
    if (r < 0.17) return { x, y: h + 1, z, tile: 'tall_grass', h: 0.8 };
    if (r < 0.185) return { x, y: h + 1, z, tile: 'dead_bush', h: 0.9 };
    if (r < 0.19) return { x, y: h + 1, z, tile: 'poppy', h: 1 };
    return null;
  }

  function decorate(t) {
    const { grid, B, H, top, noPlant, key, plants, rand } = t;
    const out = { lanterns: [], posts: [], rails: [] };
    const air = (x, y, z) => grid.get(x, y, z) === B.AIR;

    // ---- The path from the village gate to Grandpa's door ----
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
      for (let k = 0; k <= n; k++) {
        const x = Math.floor(U.lerp(ax, bx, k / n) + 0.5), z = Math.floor(U.lerp(az, bz, k / n) + 0.5);
        if (grid.get(x, H(x, z), z) === B.GRASS && rand() > 0.1) top(x, z, B.PATH);
        noPlant.add(key(x, z));
      }
    }

    // ---- Forest floor ----
    for (let x = -56; x <= 55; x++) {
      for (let z = 40; z < Z_MAX; z++) {
        if (z < edgeZ(x) - 1) continue;
        const h = H(x, z);
        if (grid.get(x, h, z) === B.GRASS && rand() < 0.75) grid.set(x, h, z, B.PODZOL);
      }
    }

    // ---- Forest trees ----
    const leaf = (x, y, z, id) => { if (air(x, y, z)) grid.set(x, y, z, id); };
    function darkOak(x, z) {
      const feet = [[0, 0], [1, 0], [0, 1], [1, 1]];
      const g = Math.max(...feet.map(([dx, dz]) => H(x + dx, z + dz)));
      const th = 6 + ((rand() * 3) | 0);
      feet.forEach(([dx, dz]) => {
        for (let y = H(x + dx, z + dz) + 1; y <= g + th; y++) grid.set(x + dx, y, z + dz, B.DARK_LOG);
        noPlant.add(key(x + dx, z + dz));
      });
      for (let dy = th - 1; dy <= th + 1; dy++) {
        const r = dy === th + 1 ? 2 : 3;
        for (let dx = -r; dx <= r + 1; dx++) {
          for (let dz = -r; dz <= r + 1; dz++) {
            if (Math.abs(dx - 0.5) + Math.abs(dz - 0.5) > r + 1.2 && rand() < 0.8) continue;
            leaf(x + dx, g + dy, z + dz, B.DARK_LEAVES);
          }
        }
      }
    }
    const TIERS = [0, 1, 1, 2, 1, 2, 3, 2, 3, 3];
    function spruce(x, z) {
      const g = H(x, z);
      const th = 8 + ((rand() * 4) | 0);
      for (let y = g + 1; y <= g + th; y++) grid.set(x, y, z, B.SPRUCE_LOG);
      for (let dy = 3; dy <= th + 1; dy++) {
        const r = TIERS[Math.min(th + 1 - dy, TIERS.length - 1)];
        for (let dx = -r; dx <= r; dx++)
          for (let dz = -r; dz <= r; dz++)
            if (Math.abs(dx) + Math.abs(dz) <= r + (r > 1 ? 1 : 0)) leaf(x + dx, g + dy, z + dz, B.SPRUCE_LEAVES);
      }
      noPlant.add(key(x, z));
    }
    function deadTree(x, z) {
      const g = H(x, z);
      const th = 4 + ((rand() * 4) | 0);
      for (let y = g + 1; y <= g + th; y++) grid.set(x, y, z, B.DARK_LOG);
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const nb = 1 + ((rand() * 3) | 0);
      for (let i = 0; i < nb; i++) {
        const [dx, dz] = dirs[(rand() * 4) | 0];
        const by = g + 2 + ((rand() * (th - 2)) | 0);
        const len = 1 + ((rand() * 2) | 0);
        for (let k = 1; k <= len; k++) if (air(x + dx * k, by + (k > 1 ? 1 : 0), z + dz * k)) grid.set(x + dx * k, by + (k > 1 ? 1 : 0), z + dz * k, B.DARK_LOG);
        if (rand() < 0.5 && air(x + dx, by - 1, z + dz)) plants.push({ x: x + dx, y: by - 1, z: z + dz, tile: 'cobweb', h: 1, fixed: true });
      }
      noPlant.add(key(x, z));
    }

    const placed = [];
    const inYard = (x, z) => x > FENCE.x0 - 3 && x < FENCE.x1 + 3 && z < 63;
    for (let gx = -52; gx < 50; gx += 3.4) {
      for (let gz = 55; gz < Z_MAX - 4; gz += 3.4) {
        const x = Math.floor(gx + rand() * 2.4), z = Math.floor(gz + rand() * 2.4);
        const inside = z >= edgeZ(x);
        if (!inside && (z < edgeZ(x) - 6 || rand() < 0.7)) continue;
        if (inYard(x, z)) continue;
        if (distSeg(x, z, EYE_CAM.x, EYE_CAM.z, EYES.x, EYES.z) < 2 || Math.hypot(x - EYES.x, z - EYES.z) < 2.5) continue;
        if (placed.some(([px, pz]) => Math.abs(px - x) < 3 && Math.abs(pz - z) < 3)) continue;
        if (rand() < 0.1) continue;
        const r = rand();
        if (!inside || r < 0.22) deadTree(x, z);
        else if (r < 0.62) darkOak(x, z);
        else spruce(x, z);
        placed.push([x, z]);
      }
    }

    // ---- Forest floor plants ----
    for (let x = -56; x <= 55; x++) {
      for (let z = 50; z < Z_MAX; z++) {
        if (z < edgeZ(x) - 1 || noPlant.has(key(x, z))) continue;
        const h = H(x, z);
        if (!air(x, h + 1, z)) continue;
        const r = rand();
        let tile = null;
        if (r < 0.1) tile = 'dry_grass';
        else if (r < 0.14) tile = 'brown_mushroom';
        else if (r < 0.16) tile = 'red_mushroom';
        else if (r < 0.2) tile = 'dead_bush';
        if (tile) plants.push({ x, y: h + 1, z, tile, h: tile === 'dry_grass' ? 0.8 : 0.9 });
        noPlant.add(key(x, z));
      }
    }

    // ---- Grandpa's cottage ----
    const { x0, z0, w, d, doorX } = COT;
    for (let x = x0; x < x0 + w; x++) {
      for (let z = z0; z < z0 + d; z++) {
        noPlant.add(key(x, z));
        grid.set(x, CH, z, B.MOSSY);
        const ex = x === x0 || x === x0 + w - 1, ez = z === z0 || z === z0 + d - 1;
        for (let y = CH + 1; y <= CH + 3; y++) {
          if (ex && ez) grid.set(x, y, z, B.DARK_LOG);
          else if (ex || ez) grid.set(x, y, z, y === CH + 1 ? B.MOSSY : B.SPRUCE);
          else grid.set(x, y, z, B.AIR);
        }
      }
    }
    for (let k = 0; ; k++) {
      const ax = x0 - 1 + k, bx = x0 + w - k, az = z0 - 1 + k, bz = z0 + d - k;
      if (ax > bx || az > bz) break;
      for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) grid.set(x, CH + 4 + k, z, B.SPRUCE);
    }
    for (let y = CH + 4; y <= CH + 8; y++) grid.set(x0 + 4, y, z0 + 3, B.MOSSY);
    grid.set(doorX, CH + 1, z0, B.AIR);
    grid.set(doorX, CH + 2, z0, B.AIR);
    [[x0 + 1, z0], [x0, z0 + 2], [x0 + w - 1, z0 + 2], [x0 + 2, z0 + d - 1]].forEach(([x, z]) => grid.set(x, CH + 2, z, B.WINDOW_DARK));
    [[x0 - 1, z0 - 1], [x0 + w, z0 - 1], [x0 - 1, z0 + d]].forEach(([x, z]) => plants.push({ x, y: CH + 3, z, tile: 'cobweb', h: 1, fixed: true }));

    // ---- Pumpkin patch ----
    for (let x = -4; x <= -2; x++) {
      for (let z = 50; z <= 55; z++) {
        noPlant.add(key(x, z));
        if (rand() < 0.45) grid.set(x, H(x, z) + 1, z, B.PUMPKIN);
      }
    }

    // ---- Fence (built as props later; recorded here) ----
    const postMap = new Map();
    const postAt = (x, z) => {
      const k = key(x, z);
      if (postMap.has(k)) return postMap.get(k);
      let p = null;
      if (rand() >= 0.08) {
        noPlant.add(k);
        p = new THREE.Vector3(x + 0.5, H(x, z) + 1, z + 0.5);
        out.posts.push(p);
      }
      postMap.set(k, p);
      return p;
    };
    const run = (cells) => {
      let prev = null;
      cells.forEach(([x, z]) => {
        const p = FENCE.gate.includes(x) && z === FENCE.z0 ? null : postAt(x, z);
        if (p && prev && prev.distanceTo(p) < 1.1) out.rails.push([prev, p]);
        prev = p;
      });
    };
    const west = [], east = [], north = [];
    for (let z = FENCE.z0; z <= FENCE.z1; z++) { west.push([FENCE.x0, z]); east.push([FENCE.x1, z]); }
    for (let x = FENCE.x0; x <= FENCE.x1; x++) north.push([x, FENCE.z0]);
    run(west); run(east); run(north);

    // ---- Jack-o'-lantern spots ----
    const J = (x, z, yOff, faceX, faceZ, light) => {
      const p = new THREE.Vector3(x, H(Math.floor(x), Math.floor(z)) + 1 + yOff, z);
      out.lanterns.push({ pos: p, yaw: Math.atan2(faceX - x, faceZ - z), light });
    };
    J(-8.5, FENCE.z0 + 0.5, 1.4, -7.5, 40, true);
    J(-5.5, FENCE.z0 + 0.5, 1.4, -7.5, 40, true);
    J(-10.2, 55.3, 0.4, -10.2, 40, true);
    J(-4.8, 55.3, 0.4, -4.8, 40, true);
    J(-13.5, 51.5, 0.4, -7.5, 49, false);
    J(-2.5, 49.4, 0.4, -7.5, 40, false);
    J(-12.5, 55.8, 0.4, -7.5, 49, false);

    return Object.assign(out, { COT, CH, FENCE, PATH, EYES, EYE_CAM, edgeZ });
  }

  HW.buildWorld = function (scene) {
    const world = WC.World.build(scene, {
      zMax: Z_MAX,
      height,
      treeOk: (x, z) => z < 44 && pathDist(x, z) > 4,
      decorate,
      plant,
      mesher: { canopyShade: 0.42, roofShade: 0.28 },
    });
    world.hw = world.extra;
    return world;
  };
})();
