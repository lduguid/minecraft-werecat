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
    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1200);

    const world = WC.World.build(scene);
    const sky = WC.Sky.create(scene);
    const fx = WC.FX.create(scene);

    const M = WC.Mobs;
    const actors = {
      villager: M.villager({ flower: true, child: true }),
      villager2: M.villager({ robe: '#3f6b3a', hat: false }),
      werecat: M.werecat(),
      cat: M.cat(),
      zombieA: M.zombie(), zombieB: M.zombie(),
      skeletonA: M.skeleton(), skeletonB: M.skeleton(),
      spiderA: M.spider(), spiderB: M.spider(),
      creeper: M.creeper(),
      enderman: M.enderman(),
    };
    Object.values(actors).forEach((a) => scene.add(a.root));

    const story = WC.Story.create({ scene, camera, world, sky, fx, actors });

    let mode = 'title';
    let t = 0;
    const clock = new THREE.Clock();

    // ---- Title backdrop: the moonlit plains, the werecat waiting on its hill ----
    const MDh = new THREE.Vector3(WC.MOON_DIR.x, 0, WC.MOON_DIR.z).normalize();
    const perp = new THREE.Vector3(MDh.z, 0, -MDh.x);
    function setupTitle() {
      story.reset();
      fx.cinema(false);
      sky.setTime(1);
      world.setLightsOn(1);
      Object.keys(world.spots).forEach((k) => {
        const a = actors[k];
        a.visible = true;
        a.place(world.spots[k], Math.atan2(world.S.x - world.spots[k].x, world.S.z - world.spots[k].z));
      });
      actors.villager.place(world.S, Math.atan2(MDh.x, MDh.z));
      const w = actors.werecat;
      w.visible = true;
      w.place(world.HILL, Math.atan2(-MDh.x, -MDh.z));
      w.mode = 'stand';
      w.snapPose();
    }
    function titleCamera() {
      const pos = world.S.clone().addScaledVector(MDh, -16).addScaledVector(perp, Math.sin(t * 0.06) * 9).add(new THREE.Vector3(0, 6.5, 0));
      camera.position.copy(pos);
      camera.lookAt(world.HILL.x, world.HILL.y + 3, world.HILL.z);
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
        if (mode === 'playing' || mode === 'ended') story.update(dt);
        else if (mode === 'title') titleCamera();
        Object.values(actors).forEach((a) => { if (a.visible) a.update(dt, t, world); });
        const en = actors.enderman;
        if (en.visible && Math.random() < dt * 4) fx.burst('portal', en.pos.clone().add(new THREE.Vector3(0, 0.5 + Math.random() * 2.5, 0)), 1, 0.8);
        fx.update(dt);
        world.update(t);
        WC.Audio.update();
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
      renderer, scene, camera, story, actors, world, sky,
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
        story.update(0.001);
        Object.values(actors).forEach((a) => { if (a.visible) a.update(0.016, t, world); });
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
