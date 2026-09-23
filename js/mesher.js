(function () {
  const B = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, LOG: 4, LEAVES: 5, PLANKS: 6, COBBLE: 7,
    WINDOW: 8, PATH: 9, HAY: 10, FARMLAND: 11, SPRUCE: 12, DOOR_B: 13, DOOR_T: 14, LANTERN: 15,
  };

  const DEFS = [];
  function def(id, top, side, bottom, group, opaque) {
    DEFS[id] = { top, side: side || top, bottom: bottom || top, group: group || 'solid', opaque: opaque !== false };
  }
  def(B.GRASS, 'grass_top', 'grass_side', 'dirt');
  def(B.DIRT, 'dirt');
  def(B.STONE, 'stone');
  def(B.LOG, 'log_top', 'log_side', 'log_top');
  def(B.LEAVES, 'leaves', 'leaves', 'leaves', 'cutout', false);
  def(B.PLANKS, 'planks');
  def(B.COBBLE, 'cobble');
  def(B.WINDOW, 'window', 'window', 'window', 'glow');
  def(B.PATH, 'path_top', 'path_side', 'dirt');
  def(B.HAY, 'hay_top', 'hay_side', 'hay_top');
  def(B.FARMLAND, 'farmland', 'dirt', 'dirt');
  def(B.SPRUCE, 'spruce_planks');
  def(B.DOOR_B, 'door_bottom');
  def(B.DOOR_T, 'door_top');
  def(B.LANTERN, 'lantern', 'lantern', 'lantern', 'glow');

  const OUT = 255;

  class VoxelGrid {
    constructor(xMin, zMin, sx, sy, sz) {
      this.xMin = xMin; this.zMin = zMin;
      this.sx = sx; this.sy = sy; this.sz = sz;
      this.data = new Uint8Array(sx * sy * sz);
    }
    inside(x, y, z) {
      return x >= this.xMin && x < this.xMin + this.sx && z >= this.zMin && z < this.zMin + this.sz && y >= 0 && y < this.sy;
    }
    get(x, y, z) {
      if (y < 0) return B.STONE;
      if (y >= this.sy) return B.AIR;
      const ix = x - this.xMin, iz = z - this.zMin;
      if (ix < 0 || iz < 0 || ix >= this.sx || iz >= this.sz) return OUT;
      return this.data[(ix * this.sy + y) * this.sz + iz];
    }
    set(x, y, z, id) {
      if (!this.inside(x, y, z)) return;
      this.data[((x - this.xMin) * this.sy + y) * this.sz + (z - this.zMin)] = id;
    }
  }

  const isOpaque = (id) => id === OUT || (id !== B.AIR && DEFS[id].opaque);
  const occludes = (id) => id !== OUT && id !== B.AIR;

  // Corner order per face: bottom-left, bottom-right, top-right, top-left seen from outside.
  const FACES = [
    { n: [1, 0, 0], shade: 0.62, tile: 'side', c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
    { n: [-1, 0, 0], shade: 0.62, tile: 'side', c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { n: [0, 1, 0], shade: 1.0, tile: 'top', c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { n: [0, -1, 0], shade: 0.5, tile: 'bottom', c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1], shade: 0.8, tile: 'side', c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: [0, 0, -1], shade: 0.8, tile: 'side', c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  ];
  const AO_CURVE = [0.4, 0.58, 0.78, 1.0];

  FACES.forEach((f) => {
    const t = [0, 1, 2].filter((a) => f.n[a] === 0);
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    f.ao = f.c.map((c) => {
      const d1 = [0, 0, 0], d2 = [0, 0, 0];
      d1[t[0]] = c[t[0]] ? 1 : -1;
      d2[t[1]] = c[t[1]] ? 1 : -1;
      return [add(f.n, d1), add(f.n, d2), add(add(f.n, d1), d2)];
    });
  });

  function newBuf() { return { pos: [], nor: [], uv: [], col: [], idx: [], count: 0 }; }

  function pushQuad(buf, verts, n, r, cols, flip) {
    const uvs = [r.u0, r.v0, r.u1, r.v0, r.u1, r.v1, r.u0, r.v1];
    for (let i = 0; i < 4; i++) {
      buf.pos.push(verts[i][0], verts[i][1], verts[i][2]);
      buf.nor.push(n[0], n[1], n[2]);
      buf.uv.push(uvs[i * 2], uvs[i * 2 + 1]);
      buf.col.push(cols[i], cols[i], cols[i]);
    }
    const o = buf.count;
    if (flip) buf.idx.push(o + 1, o + 2, o + 3, o + 1, o + 3, o);
    else buf.idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    buf.count += 4;
  }

  function aoLevel(grid, x, y, z, offs) {
    const s1 = occludes(grid.get(x + offs[0][0], y + offs[0][1], z + offs[0][2])) ? 1 : 0;
    const s2 = occludes(grid.get(x + offs[1][0], y + offs[1][1], z + offs[1][2])) ? 1 : 0;
    const cc = occludes(grid.get(x + offs[2][0], y + offs[2][1], z + offs[2][2])) ? 1 : 0;
    return s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
  }

  function pushPlant(buf, x, y, z, r, jx, jz, h, c) {
    const a = 0.1, b = 0.9;
    const x0 = x + a + jx, x1 = x + b + jx, z0 = z + a + jz, z1 = z + b + jz;
    const up = [0, 1, 0], cols = [c, c, c, c];
    pushQuad(buf, [[x0, y, z0], [x1, y, z1], [x1, y + h, z1], [x0, y + h, z0]], up, r, cols, false);
    pushQuad(buf, [[x1, y, z0], [x0, y, z1], [x0, y + h, z1], [x1, y + h, z0]], up, r, cols, false);
  }

  function toGeometry(buf) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
    g.setIndex(buf.idx);
    g.computeBoundingSphere();
    return g;
  }

  // plants: [{x, y, z, tile, h}] where y is the air cell above the ground block.
  function build(grid, atlas, plants) {
    const uvCache = {};
    DEFS.forEach((d, id) => {
      if (!d) return;
      uvCache[id] = { top: atlas.uv(d.top), side: atlas.uv(d.side), bottom: atlas.uv(d.bottom) };
    });

    const bufs = { solid: newBuf(), cutout: newBuf(), glow: newBuf() };
    const verts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const cols = [0, 0, 0, 0];
    const ao = [0, 0, 0, 0];

    for (let x = grid.xMin; x < grid.xMin + grid.sx; x++) {
      for (let y = 0; y < grid.sy; y++) {
        for (let z = grid.zMin; z < grid.zMin + grid.sz; z++) {
          const id = grid.get(x, y, z);
          if (id === B.AIR) continue;
          const d = DEFS[id];
          const buf = bufs[d.group];
          for (let fi = 0; fi < 6; fi++) {
            const f = FACES[fi];
            const nid = grid.get(x + f.n[0], y + f.n[1], z + f.n[2]);
            if (isOpaque(nid)) continue;
            if (nid === id && d.opaque) continue;
            for (let k = 0; k < 4; k++) {
              verts[k][0] = x + f.c[k][0];
              verts[k][1] = y + f.c[k][1];
              verts[k][2] = z + f.c[k][2];
              if (d.group === 'glow') {
                ao[k] = 3;
                cols[k] = 0.75 + 0.25 * f.shade;
              } else {
                ao[k] = aoLevel(grid, x, y, z, f.ao[k]);
                cols[k] = f.shade * AO_CURVE[ao[k]];
              }
            }
            const flip = ao[0] + ao[2] < ao[1] + ao[3];
            pushQuad(buf, verts, f.n, uvCache[id][f.tile], cols, flip);
          }
        }
      }
    }

    const prng = WC.U.rng(777);
    plants.forEach((p) => {
      const jx = (prng() - 0.5) * 0.3, jz = (prng() - 0.5) * 0.3;
      pushPlant(bufs.cutout, p.x, p.y, p.z, atlas.uv(p.tile), jx, jz, p.h || 1, 0.8 + prng() * 0.2);
    });

    const materials = {
      solid: new THREE.MeshLambertMaterial({ map: atlas.texture, vertexColors: true }),
      cutout: new THREE.MeshLambertMaterial({ map: atlas.texture, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide }),
      glow: new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true }),
    };

    const meshes = {};
    Object.keys(bufs).forEach((k) => {
      meshes[k] = new THREE.Mesh(toGeometry(bufs[k]), materials[k]);
      meshes[k].matrixAutoUpdate = false;
    });
    return { meshes, materials };
  }

  WC.Mesher = { B, DEFS, VoxelGrid, build, isOpaque };
})();
