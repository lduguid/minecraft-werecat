(function () {
  const $ = (id) => document.getElementById(id);

  function fail(msg) {
    const e = $('error');
    e.textContent = msg;
    e.classList.remove('hidden');
    $('title').classList.add('hidden');
  }

  if (!window.THREE) {
    fail('Could not load Three.js from the internet. Check your connection and reload the page.');
    return;
  }

  const params = new URLSearchParams(location.search);
  const HW = WC.Halloween;

  function start() {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true });
    } catch (err) {
      fail('WebGL is not available in this browser, so the animation cannot run.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);

    const world = HW.buildWorld(scene);
    const sky = WC.Sky.create(scene);
    const atmo = HW.Atmosphere.create(sky, scene);
    const fx = WC.FX.create(scene);
    const hw = world.hw;

    // ---- Cast ----
    const M = WC.Mobs;
    const black = { fur: '#1e1d22', stripe: '#141317', eyes: '#e8f040', muzzle: '#2e2c33', glowEyes: true };
    const gray = { fur: '#4a4648', stripe: '#2a2628', eyes: '#9cff3a', muzzle: '#5a5658', glowEyes: true };
    const cats = [];
    for (let i = 0; i < 12; i++) cats.push(M.cat(i % 4 === 3 ? gray : black));
    const bats = [];
    for (let i = 0; i < 8; i++) bats.push(HW.bat());
    const actors = {
      villager: M.villager({ flower: true }),
      witch: HW.witch(),
      skeleton: M.skeleton(),
      spider: M.spider(),
      cats, bats,
    };
    const all = [actors.villager, actors.witch, actors.skeleton, actors.spider].concat(cats, bats);
    all.forEach((a) => scene.add(a.root));

    // ---- Props ----
    const lanterns = [];
    function addLantern(pos, yaw, light) {
      const j = HW.jackOLantern(true, light);
      j.group.position.copy(pos);
      j.group.rotation.y = yaw;
      j.group.scale.setScalar(0.85);
      scene.add(j.group);
      lanterns.push(j);
    }
    hw.lanterns.forEach((L) => addLantern(L.pos, L.yaw, L.light));
    [[-6.5, -45.5, 0], [-1.5, -45.5, 0], [-9.5, -66.5, Math.PI / 2]].forEach(([x, z, yaw]) => {
      addLantern(new THREE.Vector3(x, world.groundAt(x, z) + 0.43, z), yaw, false);
    });
    const door = HW.clawedDoor();
    door.group.position.set(hw.COT.doorX, hw.CH + 1, hw.COT.z0 + 1.5 / 16);
    scene.add(door.group);
    scene.add(HW.fence(hw.posts, hw.rails));
    const eyes = HW.forestEyes();
    scene.add(eyes.group);

    const story = HW.Story.create({ scene, camera, world, sky, atmo, fx, actors, props: { door, lanterns, eyes } });

    let mode = 'title';
    let t = 0;
    const clock = new THREE.Clock();

    function setupTitle() {
      story.reset();
      fx.cinema(false);
      actors.villager.visible = false;
      atmo.set(0.08);
    }
    function titleCamera() {
      camera.position.set(-8 + Math.sin(t * 0.07) * 6, hw.CH + 5, 40);
      camera.lookAt(-8, hw.CH + 3, 57);
      if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
    }

    // ---- Controls ----
    const hud = $('hud');
    function play() {
      WC.Audio.init();
      WC.Audio.resume();
      $('title').classList.add('hidden');
      $('end').classList.add('hidden');
      hud.classList.remove('hidden');
      story.reset();
      setPaused(false);
      mode = 'playing';
    }
    function setPaused(p) {
      if (p && mode === 'playing') {
        mode = 'paused';
        WC.Audio.suspend();
      } else if (!p && mode === 'paused') {
        mode = 'playing';
        WC.Audio.resume();
      }
      $('btn-pause').textContent = mode === 'paused' ? 'Resume' : 'Pause';
    }
    function toggleMute() {
      WC.Audio.setMuted(!WC.Audio.isMuted());
      $('btn-mute').textContent = WC.Audio.isMuted() ? 'Sound: Off' : 'Sound: On';
    }
    story.onEnd = () => {
      mode = 'ended';
      hud.classList.add('hidden');
      $('end').classList.remove('hidden');
    };

    $('btn-play').addEventListener('click', play);
    $('btn-replay').addEventListener('click', play);
    $('btn-restart').addEventListener('click', play);
    $('btn-pause').addEventListener('click', () => setPaused(mode !== 'paused'));
    $('btn-mute').addEventListener('click', toggleMute);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && (mode === 'playing' || mode === 'paused')) { e.preventDefault(); setPaused(mode !== 'paused'); }
      if (e.code === 'KeyM') toggleMute();
      if (e.code === 'KeyR' && mode !== 'title') play();
    });
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ---- Main loop ----
    function frame() {
      requestAnimationFrame(frame);
      advance(Math.min(0.05, clock.getDelta()));
    }
    function advance(dt) {
      if (mode !== 'paused') {
        t += dt;
        if (mode === 'playing' || mode === 'ended') story.update(dt, t);
        else if (mode === 'title') titleCamera();
        all.forEach((a) => { if (a.visible) a.update(dt, t, world); });
        lanterns.forEach((j) => j.update(t, 1, camera.position));
        eyes.update(dt);
        fx.update(dt);
        atmo.update(dt);
        world.update(t);
        WC.Audio.update();
        HW.Sound.update();
        if (mode === 'playing') fx.applyShake(camera, t);
      }
      sky.update(camera, t);
      renderer.render(scene, camera);
    }

    setupTitle();
    titleCamera();
    const playBtn = $('btn-play');
    playBtn.disabled = false;
    playBtn.textContent = 'Play';

    // Debug hooks: ?t=45 jumps to 45 seconds, add &pause=1 to freeze there.
    WC.debug = {
      renderer, scene, camera, story, actors, world, sky, atmo,
      seek(sec) {
        $('title').classList.add('hidden');
        hud.classList.remove('hidden');
        mode = 'playing';
        story.seek(sec);
      },
      pause() { setPaused(true); },
      resume() { setPaused(false); },
      shot(sec, ms) {
        setPaused(false);
        WC.debug.seek(sec);
        return new Promise((r) => setTimeout(() => { setPaused(true); r('at ' + story.time.toFixed(2)); }, ms || 700));
      },
      // Simulate `run` seconds from `sec` at 60 fps and draw, even when the tab is hidden.
      step(sec, run) {
        setPaused(false);
        WC.debug.seek(sec);
        for (let i = 0; i < Math.round((run || 1) * 60); i++) advance(1 / 60);
        setPaused(true);
        advance(0);
        return 'at ' + story.time.toFixed(2);
      },
    };
    if (params.has('t')) {
      WC.debug.seek(parseFloat(params.get('t')) || 0);
      if (params.get('pause') === '1') {
        story.update(0.001, t);
        all.forEach((a) => { if (a.visible) a.update(0.016, t, world); });
        setPaused(true);
      }
    }
    frame();
  }

  setTimeout(() => {
    try {
      start();
    } catch (err) {
      console.error(err);
      fail('Something went wrong while building the world: ' + err.message);
    }
  }, 30);
})();
