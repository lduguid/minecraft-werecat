window.WC = window.WC || {};

(function () {
  const U = WC.U;
  const FW = (WC.Finale = WC.Finale || {});

  // k = 0 is the full-moon night of "The Werecat" (same values as its sky), 0.5 is dawn, 1 is morning.
  const C = {
    top: [[0, '#060a1a'], [0.5, '#2a3a6a'], [1, '#5a8ad8']],
    horizon: [[0, '#18234a'], [0.5, '#e8906a'], [1, '#cfe2f0']],
    sunGlow: [[0, '#000000'], [0.5, '#ff8a5a'], [1, '#ffd8a0']],
    moonGlow: [[0, '#8fa6ff'], [0.5, '#4a5a8a'], [1, '#101420']],
    ambient: [[0, '#8096d8'], [0.5, '#c8a8c0'], [1, '#fff0dc']],
    cloud: [[0, '#2a3354'], [0.5, '#c08aa0'], [1, '#ffffff']],
    light: [[0, '#b4c6ff'], [0.35, '#b4c6ff'], [0.5, '#ffb080'], [1, '#fff0d0']],
  };
  const NUM = {
    ambientI: [[0, 1.05], [0.5, 1.5], [1, 2.4]],
    dirI: [[0, 1.5], [0.3, 0.5], [0.45, 0.3], [0.6, 0.9], [1, 1.8]],
    fogNear: [[0, 20], [0.5, 25], [1, 35]],
    fogFar: [[0, 88], [0.5, 110], [1, 150]],
    stars: [[0, 1], [0.45, 0.15], [0.6, 0]],
    sunEl: [[0, -0.3], [0.4, -0.05], [0.55, 0.06], [1, 0.38]],
    moonOp: [[0, 1], [0.6, 0.6], [1, 0.25]],
    cloudOp: [[0, 0.45], [0.5, 0.6], [1, 0.8]],
  };
  const SUN_EAST = new THREE.Vector3(0.93, 0, 0.35).normalize();
  const MOON_WEST = new THREE.Vector3(-0.85, 0.08, 0.5).normalize();

  function create(sky, scene) {
    const top = new THREE.Color(), hor = new THREE.Color();
    const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();
    const halo = sky.moon.children[0].material, disc = sky.moon.children[1].material;
    const api = {
      k: 0,
      // interior (0..1) dims the sky light for scenes inside the witch's house.
      set(k, interior) {
        k = U.clamp(k, 0, 1);
        api.k = k;
        const u = sky.uniforms;
        U.colorLerp(C.top, k, top);
        U.colorLerp(C.horizon, k, hor);
        u.uTop.value.copy(top);
        u.uHorizon.value.copy(hor);
        U.colorLerp(C.sunGlow, k, u.uSunGlow.value);
        U.colorLerp(C.moonGlow, k, u.uMoonGlow.value);

        const el = U.numLerp(NUM.sunEl, k);
        sunDir.set(SUN_EAST.x, el, SUN_EAST.z).normalize();
        moonDir.copy(WC.MOON_DIR).lerp(MOON_WEST, U.smoothstep(0, 1, k)).normalize();
        u.uSunDir.value.copy(sunDir);
        u.uMoonDir.value.copy(moonDir);
        sky.sunDir.copy(sunDir);
        sky.moonDir.copy(moonDir);
        sky.sun.position.copy(sunDir).multiplyScalar(420);
        sky.moon.position.copy(moonDir).multiplyScalar(420);
        sky.sun.lookAt(0, 0, 0);
        sky.moon.lookAt(0, 0, 0);
        sky.sun.visible = el > -0.12;
        const mo = U.numLerp(NUM.moonOp, k);
        disc.opacity = mo;
        halo.opacity = 0.55 * mo;
        sky.starMat.opacity = U.numLerp(NUM.stars, k);

        scene.fog.color.copy(hor).lerp(top, 0.3);
        scene.fog.near = U.numLerp(NUM.fogNear, k);
        scene.fog.far = U.numLerp(NUM.fogFar, k);

        const dim = U.lerp(1, 0.4, interior || 0);
        U.colorLerp(C.ambient, k, sky.ambient.color);
        sky.ambient.intensity = U.numLerp(NUM.ambientI, k) * dim;
        U.colorLerp(C.light, k, sky.dirLight.color);
        sky.dirLight.intensity = U.numLerp(NUM.dirI, k) * dim;
        sky.dirLight.position.copy(k < 0.45 ? moonDir : sunDir).multiplyScalar(100);

        U.colorLerp(C.cloud, k, sky.cloudMat.color);
        sky.cloudMat.opacity = U.numLerp(NUM.cloudOp, k);
      },
    };
    api.set(0);
    return api;
  }

  FW.Daybreak = { create };
})();
