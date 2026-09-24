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
  const HW = WC.Halloween, FW = WC.Finale;
  const P = WC.Rig.P;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

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
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 1200);

    const world = FW.buildWorld(scene);
    const sky = WC.Sky.create(scene);
    const day = FW.Daybreak.create(sky, scene);
    const fx = WC.FX.create(scene);
    const hw = world.hw, CH = hw.CH;

    // ---- Cast ----
    const M = WC.Mobs;
    const black = { fur: '#1e1d22', stripe: '#141317', eyes: '#e8f040', muzzle: '#2e2c33', glowEyes: true };
    const villager = M.villager({ flower: true });
    const werecat = M.werecat();
    const witch = HW.witch({ standing: true, hood: true, scale: 1.0 });
    const witchFly = HW.witch();
    const witchCat = M.cat(Object.assign({}, black, { eyes: '#c070ff' }));
    const familiar = M.cat(black);
    const tabby = M.cat({ glowEyes: true });
    const grandpa = M.villager({ robe: '#3f6b3a', hat: false });
    FW.patchUpGrandpa(grandpa);
    const catHat = FW.witchHat(0.34);
    catHat.position.set(0, 3.6 * P, 2 * P);
    witchCat.parts.head.add(catHat);

    const catHomes = [
      [V(-8.5, CH + 8, 59.5), Math.PI],
      [V(-13.2, CH + 1, 52.4), 0.6],
      [V(-2.8, CH + 1, 52.6), -2.2],
      [V(-9.8, CH + 1, 50.6), 2.4],
      [V(1.5, world.groundAt(1.5, 62.5), 62.5), 2.8],
    ];
    const cats = catHomes.map(([p, yaw], i) => {
      const c = M.cat(i % 2 ? { fur: '#4a4648', stripe: '#2a2628', muzzle: '#5a5658' } : { fur: '#1e1d22', stripe: '#141317', muzzle: '#2e2c33' });
      c.home = () => {
        c.visible = true;
        c.grounded = p.y <= CH + 2;
        c.place(p, yaw);
        c.mode = 'sit';
      };
      return c;
    });

    const actors = { villager, werecat, witch, witchFly, witchCat, familiar, tabby, grandpa, cats };
    const all = [villager, werecat, witch, witchFly, witchCat, familiar, tabby, grandpa].concat(cats);
    all.forEach((a) => scene.add(a.root));

    // ---- The witch's lair ----
    const cauldron = FW.cauldron();
    cauldron.group.position.set(-12.4, 13, -57.4);
    const shelf = FW.shelf(6, 2);
    shelf.group.position.set(-12.8, 14.45, -56.2);
    const table = FW.table();
    table.position.set(-11.8, 13, -54.8);
    const tableApple = FW.goldenApple();
    tableApple.position.set(-11.8, 13 + 11 * P, -54.8);
    const map = FW.forestMap();
    map.position.set(-10.55, 14.35, -54.03);
    map.rotation.y = Math.PI;
    const hookHat = FW.witchHat(1);
    hookHat.position.set(-10.6, 14.75, -57.85);
    const broom = FW.broom();
    broom.position.set(-11.5, 13, -57.8);
    broom.rotation.set(-0.12, 0, 0.05);
    const door = FW.lairDoor();
    door.group.position.set(-9 - 1.5 / 16, 13, -56);
    [cauldron.group, shelf.group, table, tableApple, map, hookHat, broom, door.group].forEach((o) => scene.add(o));

    // ---- Things that get carried around ----
    const arms = villager.parts.arms;
    const heldApple = FW.goldenApple();
    heldApple.position.set(0, -4.5 * P, 3.8 * P);
    heldApple.rotation.x = 0.75;
    heldApple.scale.setScalar(0.9);
    const heldBottle = FW.bottle(0x5aff4a);
    heldBottle.position.set(0, -4 * P, 4 * P);
    heldBottle.rotation.x = 0.75;
    arms.add(heldApple, heldBottle);
    const heldItems = [villager.parts.flower, heldApple, heldBottle].map((o) => ({ o, pos: o.position.clone(), rot: o.rotation.clone(), scale: o.scale.clone() }));
    function restoreHeld() {
      heldItems.forEach((h) => {
        if (h.o.parent !== arms) arms.add(h.o);
        h.o.position.copy(h.pos);
        h.o.rotation.copy(h.rot);
        h.o.scale.copy(h.scale);
      });
    }

    const clawPoppy = FW.poppy();
    clawPoppy.position.set(0, -15 * P, 1.5 * P);
    werecat.parts.armR.add(clawPoppy);
    const groundPoppy = FW.poppy();
    groundPoppy.position.set(-7.5, 13.1, -54.7);
    groundPoppy.rotation.set(-1.1, 0.5, 0);
    groundPoppy.scale.setScalar(1.3);
    scene.add(groundPoppy);
    const lapPoppy = FW.poppy();
    lapPoppy.position.set(0, 14.4 * P, 6 * P);
    lapPoppy.rotation.x = -Math.PI / 2;
    lapPoppy.scale.setScalar(0.8);
    grandpa.rig.add(lapPoppy);
    const bigPotion = FW.bottle(0x5aff4a, true);
    bigPotion.position.set(0, -11 * P, 1 * P);
    bigPotion.rotation.x = Math.PI;
    witch.parts.armR.add(bigPotion);
    const flashLight = new THREE.PointLight(0x5aff4a, 0, 12, 1.2);
    scene.add(flashLight);

    // ---- The village and Grandpa's cottage ----
    const lanterns = [];
    [[-6.5, -45.5, 0], [-1.5, -45.5, 0], [-9.5, -66.5, Math.PI / 2]].forEach(([x, z, yaw]) => {
      const j = HW.jackOLantern(true, false);
      j.group.position.set(x, world.groundAt(x, z) + 0.43, z);
      j.group.rotation.y = yaw;
      j.group.scale.setScalar(0.85);
      scene.add(j.group);
      lanterns.push(j);
    });
    hw.lanterns.forEach((L) => {
      const j = HW.jackOLantern(false);
      j.group.position.copy(L.pos);
      j.group.rotation.y = L.yaw;
      j.group.scale.setScalar(0.85);
      scene.add(j.group);
    });
    const cottageDoor = HW.clawedDoor({ damage: false, patched: true });
    cottageDoor.group.position.set(hw.COT.doorX, CH + 1, hw.COT.z0 + 1.5 / 16);
    scene.add(cottageDoor.group);
    scene.add(HW.fence(hw.posts, hw.rails));
    const bench = FW.bench();
    bench.position.set(-5.9, CH + 1, 56.35);
    scene.add(bench);

    const props = {
      cauldron, shelf, tableApple, hookHat, door, heldApple, heldBottle, restoreHeld,
      clawPoppy, groundPoppy, lapPoppy, bigPotion, flashLight,
    };
    const story = FW.Story.create({ scene, camera, world, sky, day, fx, actors, props });

    let mode = 'title';
    let t = 0;
    const clock = new THREE.Clock();

    function setupTitle() {
      story.reset();
      fx.cinema(false);
      day.set(0);
      werecat.visible = true;
      werecat.place(world.HILL, Math.atan2(-WC.MOON_DIR.x, -WC.MOON_DIR.z));
      werecat.mode = 'stand';
      werecat.snapPose();
      werecat.setEyes(1);
    }
    function titleCamera() {
      camera.position.set(-4 + Math.sin(t * 0.05) * 5, 19, -47);
      camera.lookAt(world.HILL.x, world.HILL.y + 6, world.HILL.z);
      if (camera.fov !== 45) { camera.fov = 45; camera.updateProjectionMatrix(); }
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
        cauldron.update(t);
        fx.update(dt);
        world.update(t);
        WC.Audio.update();
        HW.Sound.update();
        FW.Sound.update();
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
      renderer, scene, camera, story, actors, world, sky, day, props,
      seek(sec) {
        $('title').classList.add('hidden');
        $('end').classList.add('hidden');
        hud.classList.remove('hidden');
        mode = 'playing';
        story.seek(sec);
      },
      pause() { setPaused(true); },
      resume() { setPaused(false); },
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
