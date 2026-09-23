(function () {
  const TILE = 16;
  const COLS = 8, ROWS = 4;

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function toTexture(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbStr(r, g, b, a) {
    r = Math.max(0, Math.min(255, r | 0));
    g = Math.max(0, Math.min(255, g | 0));
    b = Math.max(0, Math.min(255, b | 0));
    return a === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
  }

  function shade(hex, f) {
    const [r, g, b] = hexToRgb(hex);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }

  function px(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }

  // Fill a rectangle with per-pixel brightness jitter, the classic blocky-texture look.
  function fillNoise(ctx, x0, y0, w, h, hex, amount, rand) {
    const [r, g, b] = hexToRgb(hex);
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const f = 1 + (rand() * 2 - 1) * amount;
        px(ctx, x, y, rgbStr(r * f, g * f, b * f));
      }
    }
  }

  function pick(rand, list) { return list[(rand() * list.length) | 0]; }

  // ---------- Block tile painters (each paints a 16x16 tile at ox, oy) ----------
  const painters = {
    grass_top(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
          px(ctx, ox + x, oy + y, pick(rand, ['#6aa84f', '#5d9a44', '#4f8a3a', '#79b85a', '#62a049']));
    },
    dirt(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const r = rand();
          px(ctx, ox + x, oy + y, r < 0.08 ? '#5e412a' : r < 0.12 ? '#a8835c' : pick(rand, ['#866043', '#79553a', '#93704f', '#6f4f34']));
        }
    },
    grass_side(ctx, ox, oy, rand) {
      painters.dirt(ctx, ox, oy, rand);
      for (let x = 0; x < 16; x++) {
        const depth = 3 + ((rand() * 3) | 0);
        for (let y = 0; y < depth; y++)
          px(ctx, ox + x, oy + y, pick(rand, ['#6aa84f', '#5d9a44', '#4f8a3a', '#62a049']));
      }
    },
    stone(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
          px(ctx, ox + x, oy + y, pick(rand, ['#7d7d7d', '#737373', '#8a8a8a', '#7a7a7a', '#686868']));
    },
    log_side(ctx, ox, oy, rand) {
      for (let x = 0; x < 16; x++) {
        const col = pick(rand, ['#6d5433', '#5a4428', '#7a5f3b', '#654d2f']);
        for (let y = 0; y < 16; y++)
          px(ctx, ox + x, oy + y, rand() < 0.12 ? '#47351f' : col);
      }
    },
    log_top(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
          let c;
          if (d > 6.5) c = pick(rand, ['#5a4428', '#6d5433']);
          else c = (Math.floor(d) % 2 === 0) ? '#b8945f' : '#9c7b48';
          px(ctx, ox + x, oy + y, c);
        }
    },
    leaves(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          if (rand() < 0.16) continue;
          px(ctx, ox + x, oy + y, pick(rand, ['#3e7a2a', '#4a8c32', '#2f6420', '#3a7326', '#559a3a']));
        }
    },
    planks(ctx, ox, oy, rand, base) {
      base = base || '#a88754';
      fillNoise(ctx, ox, oy, 16, 16, base, 0.06, rand);
      for (let row = 0; row < 4; row++) {
        for (let x = 0; x < 16; x++) px(ctx, ox + x, oy + row * 4 + 3, shade(base, 0.72));
        const seam = (row * 5 + 3 + ((rand() * 4) | 0)) % 16;
        for (let y = 0; y < 3; y++) px(ctx, ox + seam, oy + row * 4 + y, shade(base, 0.78));
      }
    },
    spruce_planks(ctx, ox, oy, rand) { painters.planks(ctx, ox, oy, rand, '#6e4f2d'); },
    cobble(ctx, ox, oy, rand) {
      const pts = [];
      for (let i = 0; i < 8; i++) pts.push([rand() * 16, rand() * 16, pick(rand, ['#8e8e8e', '#7a7a7a', '#a0a0a0', '#858585'])]);
      const owner = [];
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          let best = 0, bd = 1e9;
          for (let i = 0; i < pts.length; i++) {
            let dx = Math.abs(x - pts[i][0]); dx = Math.min(dx, 16 - dx);
            let dy = Math.abs(y - pts[i][1]); dy = Math.min(dy, 16 - dy);
            const d = dx * dx + dy * dy;
            if (d < bd) { bd = d; best = i; }
          }
          owner[y * 16 + x] = best;
        }
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const o = owner[y * 16 + x];
          const edge = owner[y * 16 + ((x + 1) % 16)] !== o || owner[((y + 1) % 16) * 16 + x] !== o;
          px(ctx, ox + x, oy + y, edge ? '#4f4f4f' : shade(pts[o][2], 0.9 + rand() * 0.2));
        }
    },
    window(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 7.5, y - 7.5) / 10;
          const r = 255, g = 214 - d * 70, b = 120 - d * 80;
          px(ctx, ox + x, oy + y, rgbStr(r, g + rand() * 12, b));
        }
      ctx.fillStyle = '#6b5132';
      ctx.fillRect(ox, oy, 16, 1); ctx.fillRect(ox, oy + 15, 16, 1);
      ctx.fillRect(ox, oy, 1, 16); ctx.fillRect(ox + 15, oy, 1, 16);
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(ox + 7, oy + 1, 2, 14); ctx.fillRect(ox + 1, oy + 7, 14, 2);
    },
    path_top(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
          px(ctx, ox + x, oy + y, pick(rand, ['#9a7b48', '#8c6e3e', '#a8885a', '#7d6135', '#94764a']));
    },
    path_side(ctx, ox, oy, rand) {
      painters.dirt(ctx, ox, oy, rand);
      for (let x = 0; x < 16; x++) px(ctx, ox + x, oy, pick(rand, ['#9a7b48', '#8c6e3e']));
    },
    hay_side(ctx, ox, oy, rand) {
      for (let x = 0; x < 16; x++) {
        const col = pick(rand, ['#c8a52a', '#d8b83a', '#b8952a', '#e0c040']);
        for (let y = 0; y < 16; y++) px(ctx, ox + x, oy + y, rand() < 0.1 ? '#a8861f' : col);
      }
      ctx.fillStyle = '#8a4a1a';
      ctx.fillRect(ox, oy + 3, 16, 2);
      ctx.fillRect(ox, oy + 11, 16, 2);
    },
    hay_top(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
          px(ctx, ox + x, oy + y, d < 2 ? '#a8861f' : pick(rand, ['#c8a52a', '#d8b83a', '#e0c040']));
        }
    },
    farmland(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
          px(ctx, ox + x, oy + y, y % 4 === 0 ? '#2e1c0e' : pick(rand, ['#4a2f1a', '#553620', '#3f2815']));
    },
    door_bottom(ctx, ox, oy, rand) {
      painters.planks(ctx, ox, oy, rand, '#8a6a3c');
      ctx.fillStyle = '#5a4222';
      ctx.fillRect(ox, oy, 2, 16); ctx.fillRect(ox + 14, oy, 2, 16); ctx.fillRect(ox, oy + 14, 16, 2);
      px(ctx, ox + 11, oy + 2, '#3a3a3a'); px(ctx, ox + 11, oy + 3, '#3a3a3a');
    },
    door_top(ctx, ox, oy, rand) {
      painters.planks(ctx, ox, oy, rand, '#8a6a3c');
      ctx.fillStyle = '#5a4222';
      ctx.fillRect(ox, oy, 2, 16); ctx.fillRect(ox + 14, oy, 2, 16); ctx.fillRect(ox, oy, 16, 2);
      ctx.fillStyle = '#f2b75a';
      ctx.fillRect(ox + 3, oy + 4, 4, 6); ctx.fillRect(ox + 9, oy + 4, 4, 6);
    },
    lantern(ctx, ox, oy, rand) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
          px(ctx, ox + x, oy + y, rand() < 0.15 ? '#c08a3a' : pick(rand, ['#f7d57a', '#fff0b0', '#f0c060', '#ffe28f']));
    },
    // ---------- Plants (transparent background) ----------
    tall_grass(ctx, ox, oy, rand) {
      for (let i = 0; i < 9; i++) {
        let x = 1 + rand() * 14;
        const h = 6 + ((rand() * 9) | 0);
        const lean = (rand() - 0.5) * 0.35;
        const col = pick(rand, ['#4f8a35', '#5ea03f', '#3f7a2a', '#6ab04a']);
        for (let y = 0; y < h; y++) {
          px(ctx, ox + Math.max(0, Math.min(15, Math.round(x))), oy + 15 - y, col);
          x += lean;
        }
      }
    },
    poppy(ctx, ox, oy, rand) { flower(ctx, ox, oy, ['#d12a2a', '#a01818', '#e84040'], '#2a0f0f'); },
    dandelion(ctx, ox, oy, rand) { flower(ctx, ox, oy, ['#f5d13a', '#e0b020', '#fff066'], '#c89a10'); },
    cornflower(ctx, ox, oy, rand) { flower(ctx, ox, oy, ['#4a6ee0', '#3050c0', '#6a8cff'], '#1c2c7a'); },
    wheat(ctx, ox, oy, rand) {
      for (let i = 0; i < 5; i++) {
        const x = 2 + i * 3;
        for (let y = 0; y < 13; y++) px(ctx, ox + x, oy + 15 - y, y > 8 ? '#a88520' : '#c9a536');
        px(ctx, ox + x - 1, oy + 4, '#b8922a');
        px(ctx, ox + x + 1, oy + 6, '#b8922a');
      }
    },
  };

  function flower(ctx, ox, oy, petals, center) {
    for (let y = 8; y < 16; y++) px(ctx, ox + 7, oy + y, '#3f7a2a');
    px(ctx, ox + 6, oy + 11, '#4f8a35'); px(ctx, ox + 5, oy + 10, '#4f8a35');
    px(ctx, ox + 8, oy + 12, '#4f8a35'); px(ctx, ox + 9, oy + 11, '#4f8a35');
    const shape = ['.XXX.', 'XXXXX', 'XXCXX', 'XXXXX', '.XXX.'];
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) {
        const ch = shape[y][x];
        if (ch === '.') continue;
        px(ctx, ox + 5 + x, oy + 3 + y, ch === 'C' ? center : petals[(x + y) % petals.length]);
      }
  }

  const TILE_NAMES = [
    'grass_top', 'grass_side', 'dirt', 'stone', 'log_side', 'log_top', 'leaves', 'planks',
    'cobble', 'window', 'path_top', 'path_side', 'hay_side', 'hay_top', 'farmland', 'spruce_planks',
    'tall_grass', 'poppy', 'dandelion', 'cornflower', 'wheat', 'door_bottom', 'door_top', 'lantern',
  ];

  function buildAtlas() {
    const canvas = makeCanvas(COLS * TILE, ROWS * TILE);
    const ctx = canvas.getContext('2d');
    const index = {};
    TILE_NAMES.forEach((name, i) => {
      const ox = (i % COLS) * TILE, oy = Math.floor(i / COLS) * TILE;
      painters[name](ctx, ox, oy, WC.U.rng(1000 + i * 77));
      index[name] = i;
    });
    const texture = toTexture(canvas);
    const eps = 0.02 / TILE;
    function uv(name) {
      const i = index[name];
      const col = i % COLS, row = Math.floor(i / COLS);
      const u0 = col / COLS + eps, u1 = (col + 1) / COLS - eps;
      const v1 = 1 - row / ROWS - eps, v0 = 1 - (row + 1) / ROWS + eps;
      return { u0, v0, u1, v1 };
    }
    return { texture, uv, canvas };
  }

  // ---------- Sky and effect textures ----------
  function moonTexture() {
    const c = makeCanvas(16, 16);
    const ctx = c.getContext('2d');
    const rand = WC.U.rng(4242);
    fillNoise(ctx, 0, 0, 16, 16, '#dfe3ee', 0.04, rand);
    const craters = [[3, 3, 3], [9, 2, 2], [11, 8, 3], [4, 10, 2], [7, 6, 2], [2, 7, 1], [12, 13, 2], [7, 12, 1]];
    craters.forEach(([x, y, s]) => {
      ctx.fillStyle = '#a9adbd';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#9195a6';
      ctx.fillRect(x, y + s - 1, s, 1);
    });
    return toTexture(c);
  }

  function sunTexture() {
    const c = makeCanvas(16, 16);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffd35a'; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#ffe89a'; ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#fff7d6'; ctx.fillRect(4, 4, 8, 8);
    return toTexture(c);
  }

  function glowTexture() {
    const c = makeCanvas(64, 64);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function particleTexture() {
    const c = makeCanvas(8, 8);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = '#d0d0d0'; ctx.fillRect(0, 6, 8, 2); ctx.fillRect(6, 0, 2, 8);
    return toTexture(c);
  }

  function tileTexture(name) {
    const c = makeCanvas(TILE, TILE);
    painters[name](c.getContext('2d'), 0, 0, WC.U.rng(31));
    return toTexture(c);
  }

  WC.Tex = {
    makeCanvas, toTexture, fillNoise, shade, px, hexToRgb, rgbStr, pick,
    buildAtlas, tileTexture, moonTexture, sunTexture, glowTexture, particleTexture,
  };
})();
