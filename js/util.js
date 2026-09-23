window.WC = window.WC || {};

(function () {
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(x, z, seed) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function smooth01(t) { return t * t * (3 - 2 * t); }

  function noise2(x, z, seed) {
    const x0 = Math.floor(x), z0 = Math.floor(z);
    const fx = smooth01(x - x0), fz = smooth01(z - z0);
    const a = hash2(x0, z0, seed), b = hash2(x0 + 1, z0, seed);
    const c = hash2(x0, z0 + 1, seed), d = hash2(x0 + 1, z0 + 1, seed);
    const top = a + (b - a) * fx;
    const bot = c + (d - c) * fx;
    return (top + (bot - top) * fz) * 2 - 1;
  }

  function fbm(x, z, octaves, seed) {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise2(x * freq, z * freq, seed + i * 31) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, v) => {
    const t = clamp((v - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const remap = (v, a0, a1, b0, b1) => b0 + (b1 - b0) * clamp((v - a0) / (a1 - a0), 0, 1);

  const ease = {
    linear: (t) => t,
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out: (t) => 1 - (1 - t) * (1 - t),
    in: (t) => t * t,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };

  function angleLerp(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  // Frame-rate independent smoothing factor.
  const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

  function colorLerp(stops, t, out) {
    out = out || new THREE.Color();
    if (t <= stops[0][0]) return out.set(stops[0][1]);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const k = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        const a = new THREE.Color(stops[i - 1][1]);
        const b = new THREE.Color(stops[i][1]);
        return out.copy(a).lerp(b, k);
      }
    }
    return out.set(stops[stops.length - 1][1]);
  }

  function numLerp(stops, t) {
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const k = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        return lerp(stops[i - 1][1], stops[i][1], k);
      }
    }
    return stops[stops.length - 1][1];
  }

  WC.U = {
    rng, hash2, noise2, fbm, clamp, lerp, smoothstep, remap, ease,
    angleLerp, damp, colorLerp, numLerp,
    v3: (x, y, z) => new THREE.Vector3(x, y, z),
  };

  // Where the full moon hangs once it has risen: low in the south-east sky.
  WC.MOON_DIR = new THREE.Vector3(0.52, 0.30, 0.80).normalize();
  // Where the sun sets: opposite side, behind the distant village.
  WC.SUN_DIR = new THREE.Vector3(-0.50, 0.10, -0.86).normalize();
})();
