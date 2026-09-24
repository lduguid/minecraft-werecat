window.WC = window.WC || {};

(function () {
  const U = WC.U;
  const HW = (WC.Halloween = WC.Halloween || {});

  // mood 0 = gloomy fog at Grandpa's, 0.5 = overcast afternoon, 1 = the golden sunset
  // that opens "The Werecat" (these end values match its sky at nightfall's start).
  const C = {
    top: [[0, '#2a2438'], [0.5, '#6a7088'], [1, '#4a78c8']],
    horizon: [[0, '#7a4e3a'], [0.5, '#c8a080'], [1, '#f4a15e']],
    sunGlow: [[0, '#4a2014'], [0.5, '#a06030'], [1, '#ff9a4a']],
    moonGlow: [[0, '#5a6898'], [0.5, '#303850'], [1, '#202838']],
    ambient: [[0, '#a898c0'], [0.5, '#e0d0c8'], [1, '#ffe0c0']],
    cloud: [[0, '#3a3444'], [0.5, '#8a8494'], [1, '#f0c8b0']],
    fog: [[0, '#433843'], [0.5, '#9a8a88'], [1, '#9a8a88']],
    sunLight: [[0, '#ff9a60'], [1, '#ffb070']],
  };
  const NUM = {
    ambientI: [[0, 1.1], [0.5, 1.9], [1, 2.4]],
    dirI: [[0, 0.35], [0.5, 0.9], [1, 1.8]],
    fogNear: [[0, 6], [0.5, 25], [1, 35]],
    fogFar: [[0, 52], [0.5, 110], [1, 150]],
    sunEl: [[0, 0.22], [0.5, 0.28], [1, 0.1]],
    moonEl: [[0, 0.3], [0.5, 0.2], [1, 0.03]],
    moonOp: [[0, 0.9], [0.5, 0.3], [1, 0.45]],
    cloudOp: [[0, 0.85], [0.5, 0.8], [1, 0.8]],
  };

  function create(sky, scene) {
    const top = new THREE.Color(), hor = new THREE.Color(), fogA = new THREE.Color(), fogB = new THREE.Color();
    const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();
    const halo = sky.moon.children[0].material, disc = sky.moon.children[1].material;
    let flashK = 0;
    const api = {
      mood: 0.5,
      moonEl: null,
      set(m) {
        m = U.clamp(m, 0, 1);
        api.mood = m;
        const u = sky.uniforms;
        U.colorLerp(C.top, m, top);
        U.colorLerp(C.horizon, m, hor);
        u.uTop.value.copy(top);
        u.uHorizon.value.copy(hor);
        U.colorLerp(C.sunGlow, m, u.uSunGlow.value);
        U.colorLerp(C.moonGlow, m, u.uMoonGlow.value);

        sunDir.set(WC.SUN_DIR.x, U.numLerp(NUM.sunEl, m), WC.SUN_DIR.z).normalize();
        const moonEl = api.moonEl === null ? U.numLerp(NUM.moonEl, m) : api.moonEl;
        moonDir.set(WC.MOON_DIR.x, moonEl, WC.MOON_DIR.z).normalize();
        u.uSunDir.value.copy(sunDir);
        u.uMoonDir.value.copy(moonDir);
        sky.sunDir.copy(sunDir);
        sky.moonDir.copy(moonDir);
        sky.sun.position.copy(sunDir).multiplyScalar(420);
        sky.moon.position.copy(moonDir).multiplyScalar(420);
        sky.sun.lookAt(0, 0, 0);
        sky.moon.lookAt(0, 0, 0);
        sky.sun.visible = m > 0.35;
        const mo = U.numLerp(NUM.moonOp, m);
        disc.opacity = mo;
        halo.opacity = 0.55 * mo;
        sky.starMat.opacity = 0;

        U.colorLerp(C.fog, m, fogA);
        fogB.copy(hor).lerp(top, 0.3);
        scene.fog.color.copy(fogA).lerp(fogB, U.smoothstep(0.5, 1, m));
        scene.fog.near = U.numLerp(NUM.fogNear, m);
        scene.fog.far = U.numLerp(NUM.fogFar, m);

        U.colorLerp(C.ambient, m, sky.ambient.color);
        sky.ambient.intensity = U.numLerp(NUM.ambientI, m) + flashK * 3;
        U.colorLerp(C.sunLight, m, sky.dirLight.color);
        sky.dirLight.intensity = U.numLerp(NUM.dirI, m);
        sky.dirLight.position.copy(sunDir).multiplyScalar(100);

        U.colorLerp(C.cloud, m, sky.cloudMat.color);
        sky.cloudMat.opacity = U.numLerp(NUM.cloudOp, m);
      },
      lightning() { flashK = 1; },
      update(dt) {
        if (flashK > 0) {
          flashK = Math.max(0, flashK - dt * 2.5);
          sky.ambient.intensity = U.numLerp(NUM.ambientI, api.mood) + flashK * flashK * 3;
        }
      },
    };
    api.set(0.5);
    return api;
  }

  HW.Atmosphere = { create };
})();
