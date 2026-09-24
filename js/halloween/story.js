window.WC = window.WC || {};

(function () {
  const U = WC.U;
  const HW = (WC.Halloween = WC.Halloween || {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  function create(ctx) {
    const { camera, world, atmo, fx, scene } = ctx;
    const A = ctx.actors, PR = ctx.props;
    const audio = WC.Audio, snd = HW.Sound;
    const hw = world.hw, CH = hw.CH;
    const ground = (x, z) => world.groundAt(x, z);
    const at = (v, x, y, z) => v.clone().add(V(x, y, z));
    const flat = (x, z) => V(x, 0, z);
    const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
    const fwd = (yaw) => V(Math.sin(yaw), 0, Math.cos(yaw));
    const S = world.S.clone(), HILL = world.HILL.clone();
    const DOOR = V(-7.5, CH + 1, 57);
    const DOOR_SPOT = V(-7.5, CH + 1, 55.4);
    const GATE = V(-7.5, CH + 1, 48.6);
    const EYES = V(hw.EYES.x, ground(hw.EYES.x, hw.EYES.z) + 2.5, hw.EYES.z);
    const EYE_CAM = V(hw.EYE_CAM.x, CH + 3.4, hw.EYE_CAM.z);
    const MOON_UP = V(WC.MOON_DIR.x, 0.3, WC.MOON_DIR.z).normalize();
    const WITCH_CAM = V(-3, CH + 2.2, 50.5);
    const YARD_C = V(-7.5, CH + 1, 52.5);
    const vHead = new THREE.Vector3();

    // Walking routes that stay on the dirt path (its centre line runs through the PATH cell centres).
    const LINE = hw.PATH.map(([x, z]) => flat(x + 0.5, z + 0.5));
    function lineAt(z) {
      for (let i = 0; i < LINE.length - 1; i++) {
        const a = LINE[i], b = LINE[i + 1];
        if (z >= a.z && z <= b.z) return a.clone().lerp(b, (z - a.z) / (b.z - a.z));
      }
      return (z < LINE[0].z ? LINE[0] : LINE[LINE.length - 1]).clone();
    }
    function route(za, zb) {
      const lo = Math.min(za, zb), hi = Math.max(za, zb);
      const pts = [lineAt(lo)].concat(LINE.filter((p) => p.z > lo && p.z < hi), [lineAt(hi)]);
      return za <= zb ? pts : pts.reverse();
    }
    const cats = A.cats, bats = A.bats, v = A.villager;
    const flower = v.parts.flower;

    function cam(pos, look, fov) {
      const floor = ground(pos.x, pos.z) + 0.5;
      camera.position.set(pos.x, Math.max(pos.y, floor), pos.z);
      camera.lookAt(look);
      fov = fov || 55;
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    }

    function place(a, pos, yaw, mode) {
      a.visible = true;
      a.place(pos, yaw);
      a.mode = mode || 'idle';
      a.lookTarget = null;
      return a;
    }
    function perch(a, pos, yaw) {
      place(a, pos, yaw, 'sit');
      a.grounded = false;
      a.pos.y = pos.y;
      return a;
    }
    const nearestPost = (x, z) => hw.posts.reduce((b, p) => (Math.hypot(p.x - x, p.z - z) < Math.hypot(b.x - x, b.z - z) ? p : b));

    // ---- Where every cat starts ----
    const CAT_HOME = [
      () => perch(cats[0], V(-8.5, CH + 8, 59.5), Math.PI),
      () => perch(cats[1], V(-10.2, CH + 7, 58.3), Math.PI * 0.8),
      () => { const p = nearestPost(-15.5, 52.5); perch(cats[2], V(p.x, p.y + 1.0, p.z), Math.PI / 2); },
      () => { const p = nearestPost(-0.5, 54.5); perch(cats[3], V(p.x, p.y + 1.0, p.z), -Math.PI / 2); },
      () => place(cats[4], V(-7.5, CH + 1, 50.2), Math.PI, 'sit'),
      () => place(cats[5], V(-14.5, CH + 1, 50.8), Math.PI / 2),
      () => place(cats[6], V(-1.8, CH + 1, 51.6), -Math.PI / 2),
      () => place(cats[7], V(-3, CH + 1, 52.8), Math.PI * 1.2, 'sit'),
      () => place(cats[8], V(-12, CH + 1, 53.5), 0.4),
      () => place(cats[9], V(-5, CH + 1, 55.2), -2),
      () => { place(cats[10], V(-7.5, CH + 1, 59.4), Math.PI, 'sit'); },
      () => place(cats[11], V(1.5, ground(1.5, 62.5), 62.5), Math.PI * 0.9, 'sit'),
    ];

    // ---- Bats circling the forest edge ----
    bats.forEach((b, i) => {
      b.orbit = { c: V(-8 + (i % 3) * 5, CH + 8 + (i % 4), 64 + (i % 2) * 4), r: 5 + (i % 4) * 2.5, speed: 0.6 + (i % 3) * 0.25, ph: i * 1.3 };
      b.flee = null;
    });
    function updateBats(t, dt) {
      bats.forEach((b) => {
        if (!b.visible) return;
        if (b.flee) {
          b.pos.addScaledVector(b.flee, dt);
          b.flee.y += dt * 0.6;
          b.targetYaw = Math.atan2(b.flee.x, b.flee.z);
          return;
        }
        const o = b.orbit, a = t * o.speed + o.ph;
        b.pos.set(o.c.x + Math.cos(a) * o.r, o.c.y + Math.sin(t * 1.7 + o.ph) * 1.2, o.c.z + Math.sin(a) * o.r * 0.7);
        b.targetYaw = Math.atan2(-Math.sin(a), Math.cos(a) * 0.7);
      });
    }

    // ---- The witch's flight across the moon ----
    let witchFlight = null;
    function startWitch() {
      const c0 = WITCH_CAM.clone().addScaledVector(MOON_UP, 50);
      const side = V(MOON_UP.z, 0, -MOON_UP.x).normalize();
      witchFlight = { from: c0.clone().addScaledVector(side, -26).add(V(0, -2, 0)), to: c0.clone().addScaledVector(side, 26).add(V(0, 3, 0)), t: 0, dur: 5.2 };
      const w = A.witch;
      w.visible = true;
      w.pos.copy(witchFlight.from);
      w.yaw = w.targetYaw = Math.atan2(side.x, side.z);
    }
    function updateWitch(dt) {
      if (!witchFlight) return;
      const f = witchFlight;
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      A.witch.pos.lerpVectors(f.from, f.to, u);
      if (Math.random() < dt * 20) fx.burst('witch', at(A.witch.pos, 0, -0.2, 0), 1, 0.6);
      if (u >= 1) { witchFlight = null; A.witch.visible = false; }
    }

    let jump = null, ended = false, doorAngle = -0.3, doorTarget = -0.3, doorRate = 1.5;
    const setDoor = (a, rate) => { doorTarget = a; doorRate = rate || 1.5; };

    const beats = [
      // 1. Halloween afternoon in the village
      {
        at: 0, mood: [0.5, 0.5],
        enter() {
          fx.setFade(1);
          fx.fade(0, 2.5);
          fx.cinema(true);
          snd.music(true);
          snd.wind(0.25, 3);
          audio.wind(0.2, 3);
          place(v, V(-3.5, 0, -54), 0);
          v.idleLook = true;
          v.walkTo(-3.5, -38, 1.9);
        },
        cues: [
          [0.6, () => fx.caption('It was Halloween, and Alex set off to visit his grandpa.')],
          [3.2, () => audio.villager('hmm', 0.8)],
        ],
        tick(lt) {
          const k = U.ease.inOut(U.clamp(lt / 8, 0, 1));
          cam(v.pos.clone().add(V(-4, 4.5, -5.5).lerp(V(-2, 1.5, -2.8), k)), at(v.pos, 0.3, 0.75, 3), 55);
        },
      },
      // 2. The long walk south
      {
        at: 8, mood: [0.5, 0.32],
        enter() {
          const r = route(-7, 21);
          place(v, r[0], 0);
          v.followPath(r, 2.1);
        },
        cues: [[0.4, () => fx.caption('Grandpa lived all alone, in a little cottage at the edge of the dark forest.')]],
        tick() { cam(at(v.pos, -7.5, 4.5, -1.5), at(v.pos, 0, 0.6, 3), 55); },
      },
      // 3. The cottage in the fog
      {
        at: 16, mood: [0.3, 0.1], leaves: true,
        enter() {
          const r = route(38, 48.4);
          place(v, r[0], 0);
          v.followPath(r, 1.5);
          snd.wind(0.8, 4);
          snd.owls(true);
          snd.bats(true);
          audio.drone(0.25, 4);
        },
        cues: [
          [0.5, () => fx.caption('Grandpa always put out pumpkins for Halloween...')],
          [4.2, () => fx.caption('...but something wasn\'t right.', { scary: true })],
          [5.0, () => snd.meow(0.9, 0.7)],
        ],
        tick(lt) {
          const k = U.ease.inOut(U.clamp(lt / 8, 0, 1));
          cam(V(8, 21, 36).lerp(V(4, 17.5, 40.5), k), V(-8, 14, 56), 55);
        },
      },
      // 4. Cats. Lots of cats.
      {
        at: 24, mood: [0.1, 0.08], leaves: true,
        enter() {
          place(v, lineAt(48.4), 0);
          v.walkTo(-7.5, 51.6, 1.0);
          cats.forEach((c) => { c.lookTarget = vHead; });
        },
        cues: [
          [0.4, () => fx.caption('Instead of Grandpa, there were cats. Lots and lots of cats.')],
          [0.8, () => { cats[5].lookTarget = null; cats[5].mode = 'idle'; cats[5].walkTo(-1.5, 51.2, 6.5); snd.meow(1.1); }],
          [1.9, () => { cats[6].lookTarget = null; cats[6].mode = 'idle'; cats[6].walkTo(-14.5, 49.6, 6.5); }],
          [2.6, () => { cats[4].mode = 'idle'; cats[4].walkTo(-11.5, 55.5, 5); audio.catHiss(); }],
          [1.2, () => { cats[8].mode = 'idle'; cats[8].walkTo(-9.2, 51.3, 1.3); }],
          [1.5, () => { cats[9].mode = 'idle'; cats[9].walkTo(-5.9, 51.6, 1.3); }],
          [3.4, () => { v.stop(); audio.villager('question'); }],
          [4.3, () => [cats[8], cats[9]].forEach((c) => { c.stop(); c.faceTowards(v.pos.x, v.pos.z); c.mode = 'sit'; })],
          [4.5, () => { snd.meow(0.8, 0.8, -0.5); snd.meow(1.25, 0.6, 0.6); }],
          [6.2, () => { cats[9].mode = 'hiss'; audio.catHiss(); }],
        ],
        tick(lt) {
          const k = U.ease.inOut(U.clamp(lt / 8, 0, 1));
          cam(V(-9.2, CH + 3.2, 56.2).lerp(V(-8.9, CH + 2.8, 55.2), k), at(vHead, 0.3, -0.4, 0), 55);
        },
      },
      // 5. The door
      {
        at: 32, mood: [0.08, 0.06],
        enter() {
          place(v, DOOR_SPOT, 0);
          v.visible = false;
          cats.forEach((c) => { c.lookTarget = null; });
          setDoor(-0.3);
        },
        cues: [
          [0.4, () => fx.caption('The door was splintered... raked with deep claw marks.')],
          [0.9, () => { setDoor(-0.6, 0.5); snd.creak({ dur: 2.2 }); }],
          [2.6, () => snd.thunder(0.5)],
          [4.3, () => fx.caption('And caught on a splinter was a scrap of Grandpa\'s old green robe.', { scary: true })],
          [5.2, () => { setDoor(-0.35, 0.5); snd.creak({ dur: 1.6, vol: 0.7 }); }],
        ],
        tick(lt) {
          const k = U.ease.inOut(U.clamp(lt / 8, 0, 1));
          cam(V(-6.9, CH + 2.2, 53.3).lerp(V(-7.2, CH + 2.1, 54.3), k), V(-7.5, CH + 2.0, 57), 45);
        },
      },
      // 6. "Grandpa...?"
      {
        at: 40, mood: [0.06, 0.06],
        enter() {
          place(v, DOOR_SPOT, 0);
          v.idleLook = false;
          place(cats[10], V(-7.5, CH + 1, 59.4), Math.PI, 'sit');
        },
        cues: [
          [0.3, () => fx.caption('"Grandpa...?"')],
          [0.6, () => audio.villager('question')],
          [2.0, () => audio.villager('question', 1.1)],
          [3.2, () => {
            setDoor(0.95, 9);
            snd.creak({ dur: 0.5, vol: 1 });
            audio.stinger();
            audio.catHiss();
            fx.shake(0.5, 0.6);
            const c = cats[10];
            c.mode = 'idle';
            c.walkTo(-7.2, 46, 7.5);
          }],
          [3.6, () => { v.shake(0.6, 0.08); v.mode = 'panic'; audio.villager('panic'); }],
          [4.2, () => { v.mode = 'idle'; v.walkTo(-7.5, 54.2, 1.5, false); }],
          [4.6, () => fx.caption('Grandpa was nowhere to be found.')],
        ],
        tick(lt) {
          if (lt < 4.0) cam(at(DOOR_SPOT, 1.7, 1.7, -2.3), at(DOOR, -0.3, 0.9, 1.0), 50);
          else cam(at(DOOR_SPOT, 3, 1.8, -3.8), at(DOOR_SPOT, -0.5, 0.9, -0.5), 55);
        },
      },
      // 7. Something in the trees
      {
        at: 47, mood: [0.05, 0.05], leaves: true,
        enter() {
          setDoor(-0.2, 1);
          place(v, V(-7.5, 0, 53.2), yawTo(V(-7.5, 0, 53.2), DOOR));
          v.idleLook = false;
          PR.eyes.group.position.copy(EYES);
          PR.eyes.group.lookAt(EYE_CAM);
        },
        cues: [
          [0.5, () => fx.caption('Deep in the trees, something was watching him.', { scary: true })],
          [1.0, () => PR.eyes.show(true)],
          [1.6, () => { snd.growl(0.9); audio.drone(0.7, 2); }],
          [2.7, () => PR.eyes.blink()],
          [3.9, () => { PR.eyes.show(false); }],
          [4.2, () => { v.lookTarget = EYES; audio.villager('question', 0.8); }],
          [6.2, () => fx.caption('...but when he looked, there was nothing there.')],
        ],
        tick(lt) {
          if (lt < 4) {
            const d = EYES.clone().sub(EYE_CAM).normalize();
            cam(EYE_CAM.clone().addScaledVector(d, U.lerp(0, 2.5, lt / 4)), EYES, 40);
          } else if (lt < 6) {
            cam(v.pos.clone().addScaledVector(fwd(yawTo(v.pos, EYES)), 1.3).add(V(0, 1.0, 0)), at(v.pos, 0, 0.95, 0), 45);
          } else {
            cam(EYE_CAM.clone().addScaledVector(EYES.clone().sub(EYE_CAM).normalize(), 1.5), EYES, 40);
          }
        },
      },
      // 8. The witch crosses the moon
      {
        at: 55, mood: [0.05, 0.05],
        enter() {
          place(v, V(-7.5, 0, 52.5), yawTo(V(-7.5, 0, 52.5), at(YARD_C, 20, 0, 30)));
          v.lookTarget = null;
          atmo.lightning();
          snd.thunder(1);
          startWitch();
        },
        cues: [
          [0.7, () => { A.witch.cackling = true; snd.cackle({ dist: 0.55 }); }],
          [1.0, () => fx.caption('High above the forest, a witch flew past the moon, cackling.', { scary: true })],
          [3.6, () => { A.witch.cackling = false; }],
          [5.4, () => {
            bats.forEach((b, i) => { b.flee = V(Math.cos(i) * 5, 2 + (i % 3), -4 - (i % 4)); });
            for (let i = 0; i < 6; i++) setTimeout(() => snd.squeak(1.4), i * 90);
            v.mode = 'panic';
            audio.villager('panic', 1);
          }],
          [6.2, () => audio.villager('panic', 1)],
          [7.6, () => { v.mode = 'idle'; }],
        ],
        tick(lt) {
          if (lt < 5.4) {
            cam(WITCH_CAM, WITCH_CAM.clone().addScaledVector(MOON_UP, 50), 24);
          } else {
            cam(at(v.pos, 1.9, 1.2, -1.8), at(v.pos, 0, 0.75, 0), 55);
          }
        },
      },
      // 9. He hurries home; the cats watch him go
      {
        at: 64, mood: [0.08, 0.18], leaves: true,
        enter() {
          bats.forEach((b) => { b.visible = false; });
          A.witch.visible = false;
          witchFlight = null;
          CAT_HOME.forEach((f) => f());
          cats.forEach((c) => { c.lookTarget = vHead; });
          cats[4].mode = 'sit';
          place(v, V(-7.5, 0, 52.5), Math.PI);
          v.mode = 'run';
          v.stride = 6.2;
          v.followPath([flat(-7.5, 52.5)].concat(route(49, 36)), 3.2);
          audio.heartbeat(90, 0.7);
          snd.bats(false);
        },
        cues: [
          [0.5, () => fx.caption('Scared and worried, Alex hurried home to tell the others.')],
          [2.2, () => { snd.meow(0.85, 0.7, -0.4); snd.meow(1.1, 0.6, 0.4); snd.meow(0.7, 0.5, 0); }],
          [5.5, () => audio.heartbeat(0)],
        ],
        tick(lt) {
          if (lt < 4.5) cam(V(-5.2, CH + 2.7, 45), at(v.pos, 0, 0.7, 0), 55);
          else cam(V(-7.5, CH + 2.2, 46.5), V(-8, CH + 1.8, 53), 55);
        },
      },
      // 10. On the way home: the flower meadow at golden hour
      {
        at: 72, mood: [0.3, 0.92],
        enter() {
          cats.forEach((c) => { c.lookTarget = null; });
          snd.music(false);
          snd.owls(false);
          snd.wind(0.1, 4);
          audio.drone(0, 4);
          audio.piano(true);
          audio.wind(0.35, 3);
          v.stride = 4.5;
          const r = route(15, 8);
          place(v, r[0], Math.PI);
          v.idleLook = true;
          v.followPath(r, 1.6);
          flower.visible = false;
        },
        cues: [
          [0.4, () => fx.caption('But on the way home, he passed the flower meadow...')],
          [4.6, () => { v.walkTo(S.x - 0.3, S.z + 0.4, 1.1); audio.villager('hmm', 0.8); }],
          [5.2, () => fx.caption('...and the flowers were so pretty that he forgot all about the time.')],
          [6.6, () => { v.stop(); v.targetYaw = -2.3; v.mode = 'pick'; }],
          [7.8, () => { flower.visible = true; audio.villager('hmm', 0.7); }],
          [8.6, () => { v.mode = 'idle'; }],
        ],
        tick() { cam(at(v.pos, 2.8, 1.25, 2.4), at(v.pos, -0.35, 0.75, -0.55), 50); },
      },
      // 11. Where "The Werecat" begins
      {
        at: 82, mood: [1, 1], moonEl: 0.4,
        enter() {
          place(v, at(S, 1.5, 0, 1), -2.3);
          v.idleLook = true;
          flower.visible = true;
          v.walkTo(S.x - 1.2, S.z - 0.8, 1.1);
        },
        cues: [
          [0.5, () => fx.caption('Far from home, the sun began to set...')],
          [2.6, () => { v.mode = 'pick'; }],
          [4.6, () => { v.mode = 'idle'; fx.caption('...and tonight, there would be a full moon.', { scary: true }); }],
          [5.4, () => snd.meow(0.75, 0.35, 0.3)],
          [8.4, () => { fx.fade(1, 2); audio.piano(false); audio.wind(0, 3); }],
          [10.6, () => { fx.hideCaption(); ended = true; if (api.onEnd) api.onEnd(); }],
        ],
        tick(lt) {
          if (lt < 4.4) {
            const k = U.ease.inOut(U.clamp(lt / 4.4, 0, 1));
            cam(S.clone().add(V(8, 4.4, 9.4).lerp(V(4, 2.2, 4.7), k)), at(S, -0.6, 0.55, -1), U.lerp(48, 40, k));
          } else {
            const k = U.ease.inOut(U.clamp((lt - 4.4) / 5, 0, 1));
            cam(at(S, -5, 2.6, -7), at(HILL, 0, U.lerp(2, 6, k), 0), 50);
          }
        },
      },
    ];

    let time = 0, idx = -1, fired = [];

    function enterBeat(i) {
      idx = i;
      const b = beats[i];
      fired = (b.cues || []).map(() => false);
      fx.hideCaption();
      atmo.moonEl = b.moonEl === undefined ? null : b.moonEl;
      if (b.enter) b.enter();
    }

    function reset() {
      time = 0;
      idx = -1;
      ended = false;
      jump = null;
      witchFlight = null;
      fx.reset();
      audio.reset();
      snd.reset();
      [v, A.witch, A.skeleton, A.spider].concat(cats, bats).forEach((a) => {
        a.stop();
        a.lookTarget = null;
        a.mode = 'idle';
        a.forceVel = null;
        a.shakeT = 0;
      });
      cats.forEach((c) => { c.grounded = true; });
      CAT_HOME.forEach((f) => f());
      bats.forEach((b) => { b.visible = true; b.flee = null; });
      A.witch.visible = false;
      A.witch.cackling = false;
      place(A.skeleton, V(-21.5, 0, 70.5), 0.6).idleLook = true;
      place(A.spider, V(-26.5, 0, 64.5), 0.3);
      v.stride = 4.5;
      flower.visible = false;
      doorAngle = doorTarget = -0.3;
      PR.eyes.show(false);
      atmo.moonEl = null;
      atmo.set(0.5);
      world.setLightsOn(0);
    }

    function update(dt, t) {
      if (!ended) time += dt;
      while (idx + 1 < beats.length && time >= beats[idx + 1].at) enterBeat(idx + 1);
      const b = beats[idx];
      const lt = time - b.at;
      vHead.copy(v.pos).add(V(0, v.eyeHeight, 0));
      (b.cues || []).forEach((c, k) => {
        if (!fired[k] && lt >= c[0]) { fired[k] = true; c[1](); }
      });
      if (b.tick) b.tick(lt, dt);

      const next = beats[idx + 1];
      const dur = next ? next.at - b.at : 10;
      atmo.set(U.lerp(b.mood[0], b.mood[1], U.smoothstep(0, dur, lt)));

      doorAngle += (doorTarget - doorAngle) * U.damp(doorRate, dt);
      PR.door.group.rotation.y = doorAngle;
      updateBats(t, dt);
      updateWitch(dt);
      PR.eyes.update(dt);

      [cats[8], cats[9]].forEach((c) => {
        if (!c.move && c.mode === 'idle' && Math.random() < dt * 0.3) {
          c.walkTo(U.lerp(-13.5, -2.5, Math.random()), U.lerp(49.5, 55.5, Math.random()), 1.3);
        }
      });

      if (b.leaves && Math.random() < dt * 8) {
        const p = camera.position;
        fx.burst('leaf', V(p.x + (Math.random() - 0.5) * 16, p.y + 3 + Math.random() * 4, p.z + (Math.random() - 0.5) * 16), 1, 0.5);
      }
    }

    function seek(sec) {
      reset();
      for (let i = 0; i < beats.length && beats[i].at <= sec; i++) {
        enterBeat(i);
        const lt = sec - beats[i].at;
        (beats[i].cues || []).forEach((c, k) => { if (c[0] <= lt) { fired[k] = true; c[1](); } });
      }
      if (sec > 3 && sec < 90.4) fx.setFade(0);
      time = sec;
    }

    const api = {
      reset, update, seek, onEnd: null,
      get time() { return time; },
      get done() { return ended; },
    };
    return api;
  }

  HW.Story = { create };
})();
