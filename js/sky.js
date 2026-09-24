(function () {
  const U = WC.U;

  const STOPS = {
    top: [[0, '#4a78c8'], [0.45, '#2a3a78'], [0.75, '#0f1638'], [1, '#060a1a']],
    horizon: [[0, '#f4a15e'], [0.35, '#d0674a'], [0.6, '#5a3a6a'], [0.85, '#1c2450'], [1, '#18234a']],
    sunGlow: [[0, '#ff9a4a'], [0.45, '#b04a2a'], [0.7, '#000000']],
    moonGlow: [[0.4, '#000000'], [1, '#8fa6ff']],
    ambient: [[0, '#ffe0c0'], [0.5, '#b09ac8'], [1, '#8096d8']],
    cloud: [[0, '#f0c8b0'], [0.5, '#6a5a78'], [1, '#2a3354']],
  };

  function create(scene) {
    const group = new THREE.Group();
    group.renderOrder = -10;
    scene.add(group);

    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3() },
        uSunGlow: { value: new THREE.Color() },
        uMoonDir: { value: new THREE.Vector3() },
        uMoonGlow: { value: new THREE.Color() },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uTop, uHorizon, uSunDir, uSunGlow, uMoonDir, uMoonGlow;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55))
                             : mix(uHorizon, uHorizon * 0.35, clamp(-h * 4.0, 0.0, 1.0));
          float s = max(dot(d, uSunDir), 0.0);
          col += uSunGlow * (pow(s, 5.0) * 0.55 + pow(s, 50.0) * 0.7) * smoothstep(-0.35, 0.05, h);
          float m = max(dot(d, uMoonDir), 0.0);
          col += uMoonGlow * (pow(m, 60.0) * 0.4 + pow(m, 7.0) * 0.07);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
    dome.renderOrder = -10;
    group.add(dome);

    // Stars
    const starCount = 1600;
    const starPos = new Float32Array(starCount * 3);
    const srand = U.rng(99);
    for (let i = 0; i < starCount; i++) {
      const v = new THREE.Vector3(srand() * 2 - 1, srand() * 1.05 - 0.05, srand() * 2 - 1).normalize().multiplyScalar(460);
      starPos.set([v.x, v.y, v.z], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    stars.renderOrder = -9;
    group.add(stars);

    // Sun and moon (square, like the real thing) with soft halos
    const glowTex = WC.Tex.glowTexture();
    function body(tex, size, haloColor, haloSize, haloOpacity) {
      const g = new THREE.Group();
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(haloSize, haloSize),
        new THREE.MeshBasicMaterial({ map: glowTex, color: haloColor, transparent: true, opacity: haloOpacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
      );
      halo.position.z = -8;
      const disc = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })
      );
      halo.renderOrder = -8;
      disc.renderOrder = -7;
      g.add(halo, disc);
      group.add(g);
      return g;
    }
    const moon = body(WC.Tex.moonTexture(), 68, 0x9fb6ff, 260, 0.55);
    const sun = body(WC.Tex.sunTexture(), 60, 0xffa050, 300, 0.8);

    // Blocky clouds
    const cloudRand = U.rng(5150);
    const cells = [];
    for (let i = -16; i < 16; i++)
      for (let j = -16; j < 16; j++)
        if (U.fbm(i * 0.35, j * 0.35, 2, 71) > 0.18 + cloudRand() * 0.05) cells.push([i, j]);
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0x2a3354, transparent: true, opacity: 0.5, fog: false, depthWrite: false });
    const clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(12, 3, 12), cloudMat, cells.length);
    const m4 = new THREE.Matrix4();
    cells.forEach(([i, j], k) => clouds.setMatrixAt(k, m4.makeTranslation(i * 12, 0, j * 12)));
    clouds.position.y = 62;
    clouds.renderOrder = -6;
    scene.add(clouds);

    // Lights and fog
    const ambient = new THREE.AmbientLight(0xffffff, 1);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(ambient, dirLight, dirLight.target);
    scene.fog = new THREE.Fog(0x000000, 20, 90);

    const tmpTop = new THREE.Color(), tmpHor = new THREE.Color(), tmp = new THREE.Color();
    const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();
    const api = {
      tod: 0,
      moonScale: 1,
      moonDir, sunDir, ambient, dirLight, stars,
      uniforms: skyMat.uniforms, sun, moon, starMat, cloudMat, clouds,
      setTime(tod) {
        tod = U.clamp(tod, 0, 1);
        api.tod = tod;
        U.colorLerp(STOPS.top, tod, tmpTop);
        U.colorLerp(STOPS.horizon, tod, tmpHor);
        skyMat.uniforms.uTop.value.copy(tmpTop);
        skyMat.uniforms.uHorizon.value.copy(tmpHor);
        U.colorLerp(STOPS.sunGlow, tod, skyMat.uniforms.uSunGlow.value);
        U.colorLerp(STOPS.moonGlow, tod, skyMat.uniforms.uMoonGlow.value);

        const sunEl = U.lerp(0.1, -0.2, U.smoothstep(0, 0.6, tod));
        sunDir.set(WC.SUN_DIR.x, sunEl, WC.SUN_DIR.z).normalize();
        const moonEl = U.lerp(-0.12, WC.MOON_DIR.y, U.smoothstep(0.2, 0.95, tod));
        moonDir.set(WC.MOON_DIR.x, moonEl, WC.MOON_DIR.z).normalize();
        skyMat.uniforms.uSunDir.value.copy(sunDir);
        skyMat.uniforms.uMoonDir.value.copy(moonDir);

        sun.position.copy(sunDir).multiplyScalar(420);
        moon.position.copy(moonDir).multiplyScalar(420);
        sun.lookAt(0, 0, 0);
        moon.lookAt(0, 0, 0);
        sun.visible = sunEl > -0.19;

        starMat.opacity = U.smoothstep(0.5, 0.95, tod);

        scene.fog.color.copy(tmpHor).lerp(tmpTop, 0.3);
        scene.fog.near = U.lerp(35, 20, tod);
        scene.fog.far = U.lerp(150, 88, tod);

        U.colorLerp(STOPS.ambient, tod, ambient.color);
        ambient.intensity = U.numLerp([[0, 2.4], [0.5, 1.5], [1, 1.05]], tod);
        if (tod < 0.5) {
          dirLight.color.set(0xffb070);
          dirLight.intensity = U.lerp(1.8, 0, U.smoothstep(0, 0.5, tod));
          dirLight.position.copy(sunDir).multiplyScalar(100);
        } else {
          dirLight.color.set(0xb4c6ff);
          dirLight.intensity = U.lerp(0, 1.5, U.smoothstep(0.5, 0.95, tod));
          dirLight.position.copy(moonDir).multiplyScalar(100);
        }

        U.colorLerp(STOPS.cloud, tod, tmp);
        cloudMat.color.copy(tmp);
        cloudMat.opacity = U.lerp(0.8, 0.45, tod);
      },
      update(camera, t) {
        group.position.copy(camera.position);
        moon.scale.setScalar(api.moonScale);
        clouds.position.x = -40 + t * 0.35;
        starMat.size = 2 + Math.sin(t * 0.7) * 0.15;
      },
    };
    api.setTime(0);
    return api;
  }

  WC.Sky = { create };
})();
