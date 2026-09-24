window.WC = window.WC || {};

(function () {
  const U = WC.U;
  const FW = (WC.Finale = WC.Finale || {});
  const HW = WC.Halloween;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  function create(ctx) {
    const { camera, world, day, fx, scene } = ctx;
    const A = ctx.actors, PR = ctx.props;
    const audio = WC.Audio, spooky = HW.Sound, snd = FW.Sound;
    const hw = world.hw, CH = hw.CH;
    const ground = (x, z) => world.groundAt(x, z);
    const at = (v, x, y, z) => v.clone().add(V(x, y, z));
    const flat = (x, z) => V(x, 0, z);
    const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
    const fwd = (yaw) => V(Math.sin(yaw), 0, Math.cos(yaw));
    const v = A.villager, wc = A.werecat, witch = A.witch;

    // ---- Places ----
    const DOORSTEP = V(-8.5, 13, -55.5);
    const INSIDE = V(-10.7, 13, -55.5);
    const HIDE = V(-12.55, 13, -54.5);
    const CAULDRON = V(-12.4, 13, -57.4);
    const WITCH_SPOT = V(-11.7, 13, -56.7);
    const BEAST_SPOT = V(-12.05, 13, -55.65);
    const WITCH_HIT = V(-11.2, 13, -57.35);
    const DOOR_IN = V(-10.1, 14.3, -55.5);
    const WIDE_CAM = V(-10.3, 15.6, -54.3);
    const FIGHT_LOOK = V(-11.95, 14.5, -55.85);
    const DOOR_CAM = V(-11.3, 14.45, -54.25), DOOR_LOOK = V(-10.67, 14.2, -56.15);
    const SHELF_NEAR = V(-12.8, 14.5, -55.2);
    const HAT_HOOK = V(-10.6, 14.75, -57.85);
    const DAWN_BEAST = V(-7.0, 13, -50.2), DAWN_V = V(-6.6, 13, -48.9);
    const BENCH = V(-5.9, CH + 1, 56.35);
    const EYES = V(hw.EYES.x, ground(hw.EYES.x, hw.EYES.z), hw.EYES.z);
    const TO_CAM = V(hw.EYE_CAM.x - hw.EYES.x, 0, hw.EYE_CAM.z - hw.EYES.z).normalize();
    const MOON_UP = V(WC.MOON_DIR.x, 0.3, WC.MOON_DIR.z).normalize();
    const WITCH_CAM = V(-3, CH + 2.2, 50.5);
    const vHead = new THREE.Vector3(), witchHead = new THREE.Vector3();

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

    let inside = 0;
    function cam(pos, look, fov, indoors) {
      inside = indoors ? 1 : 0;
      const floor = ground(pos.x, pos.z) + 0.5;
      camera.position.set(pos.x, Math.max(pos.y, floor), pos.z);
      camera.lookAt(look);
      fov = fov || 55;
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    }

    function place(a, pos, yaw, mode) {
      a.visible = true;
      a.place(pos, yaw);
      if (mode) a.mode = mode;
      a.lookTarget = null;
      return a;
    }

    // ---- Door, held items, flying bottles ----
    let doorAngle = -1.4, doorTarget = -1.4, doorRate = 2, doorKick = 0;
    const setDoor = (a, rate) => { doorTarget = a; doorRate = rate || 2; };

    const held = { flower: v.parts.flower, apple: PR.heldApple, bottle: PR.heldBottle };
    const hold = (name, on) => { held[name].visible = on; };

    const flying = [];
    function throwBottle(color, from, to, dur, onHit) {
      const b = FW.bottle(color);
      b.position.copy(from);
      scene.add(b);
      flying.push({ b, from: from.clone(), to: to.clone(), t: 0, dur, onHit });
    }
    let falling = null;
    function dropBottle(from, vy, groundY, onLand) {
      const b = FW.bottle(0x5aff4a, true);
      b.position.copy(from);
      scene.add(b);
      falling = { b, vel: V(0.3, vy, 0.2), groundY, onLand };
    }
    // Move an actor to a spot over dur seconds; with a height h it leaves the ground and faces where it's going.
    let pounce = null;
    function finishPounce() {
      const p = pounce;
      pounce = null;
      p.a.pos.copy(p.to);
      p.a.grounded = true;
      if (p.onLand) p.onLand();
    }
    function leap(a, to, dur, h, onLand) {
      if (pounce) finishPounce();
      a.stop();
      if (h > 0) {
        a.grounded = false;
        a.yaw = a.targetYaw = yawTo(a.pos, to);
      }
      pounce = { a, from: a.pos.clone(), to: to.clone(), t: 0, dur, h, onLand };
    }
    let carry = null;
    function carryTo(obj, to, dur, onDone) {
      carry = { obj, from: obj.getWorldPosition(new THREE.Vector3()), to: to.clone(), t: 0, dur, onDone };
      scene.attach(obj);
    }

    let smokeT = 0, cureT = 0, evilT = 0, ended = false;
    const lairLight = PR.cauldron.light;

    // The poppy slips out of the werecat's claw and settles into the resting pose set up in main.js.
    const poppyRest = { pos: PR.groundPoppy.position.clone(), quat: PR.groundPoppy.quaternion.clone() };
    let laying = null;
    function layPoppy(dur) {
      const g = PR.groundPoppy, c = PR.clawPoppy;
      laying = { from: c.getWorldPosition(new THREE.Vector3()), fromQ: c.getWorldQuaternion(new THREE.Quaternion()), t: 0, dur };
      c.visible = false;
      g.position.copy(laying.from);
      g.quaternion.copy(laying.fromQ);
      g.visible = true;
    }
    function finishLaying() {
      laying = null;
      PR.groundPoppy.position.copy(poppyRest.pos);
      PR.groundPoppy.quaternion.copy(poppyRest.quat);
    }

    function resetProps() {
      flying.splice(0).forEach((f) => scene.remove(f.b));
      if (falling) { scene.remove(falling.b); falling = null; }
      carry = null;
      pounce = null;
      finishLaying();
      PR.restoreHeld();
      held.flower.visible = false; held.apple.visible = false; held.bottle.visible = false;
      PR.clawPoppy.visible = false;
      PR.groundPoppy.visible = false;
      PR.lapPoppy.visible = false;
      PR.tableApple.visible = true;
      PR.hookHat.visible = true;
      PR.bigPotion.visible = false;
      PR.shelf.bottles.forEach((b) => { b.visible = true; });
      PR.door.setClawed(false);
      doorAngle = doorTarget = -1.4;
      doorKick = 0;
      smokeT = cureT = evilT = 0;
    }

    const beats = [
      // ---------------- Cold open: long ago, over the dark forest
      {
        at: 0, k: [0, 0], sepia: true,
        enter() {
          fx.setFade(1);
          fx.fade(0, 1.5);
          fx.cinema(true);
          fx.sepia(true);
          spooky.wind(0.5, 2);
          const c0 = WITCH_CAM.clone().addScaledVector(MOON_UP, 50);
          const side = V(MOON_UP.z, 0, -MOON_UP.x).normalize();
          const w = A.witchFly;
          w.visible = true;
          w.flight = { from: c0.clone().addScaledVector(side, -26).add(V(0, -2, 0)), to: c0.clone().addScaledVector(side, 26).add(V(0, 3, 0)), t: 0, dur: 5.2 };
          w.pos.copy(w.flight.from);
          w.yaw = w.targetYaw = Math.atan2(side.x, side.z);
        },
        cues: [
          [0.8, () => { A.witchFly.cackling = true; spooky.cackle({ dist: 0.6 }); }],
          [2.4, () => dropBottle(at(A.witchFly.pos, 0, -0.6, 0), -1, -100, null)],
          [3.8, () => { A.witchFly.cackling = false; }],
        ],
        tick() { cam(WITCH_CAM, WITCH_CAM.clone().addScaledVector(MOON_UP, 50), 24); },
      },
      {
        at: 5.2, k: [0, 0], sepia: true,
        enter() {
          if (falling) { scene.remove(falling.b); falling = null; }
          A.witchFly.visible = false;
          dropBottle(at(EYES, 0.2, 9, 0.2), -2, EYES.y + 0.05, () => {
            snd.smash(1);
            fx.burst('curse', at(EYES, 0, 0.5, 0), 40, 0.8);
            fx.burst('witch', at(EYES, 0, 0.8, 0), 20, 0.6);
            smokeT = 3.5;
            PR.flashLight.position.copy(at(EYES, 0, 1, 0));
            PR.flashLight.intensity = 14;
          });
        },
        cues: [[2.3, () => { spooky.meow(1.4, 1); audio.catHiss(); }]],
        tick() { cam(EYES.clone().addScaledVector(TO_CAM, 6).add(V(0, 1.3, 0)), at(EYES, 0, 0.8, 0), 50); },
      },
      {
        at: 8.4, k: [0, 0], sepia: true,
        enter() {
          const c = place(A.tabby, at(EYES, 0.2, 0, 0.2), yawTo(EYES, EYES.clone().addScaledVector(TO_CAM, 3)), 'idle');
          c.setEyes(1);
          const dest = EYES.clone().addScaledVector(TO_CAM, 2.4);
          c.walkTo(dest.x, dest.z, 1.1);
        },
        cues: [
          [1.4, () => { A.tabby.setEvil(true); smokeT = 0; evilT = 2.6; spooky.growl(0.6); }],
          [2.3, () => {
            const c = A.tabby;
            c.stop();
            c.mode = 'hiss';
            c.lookTarget = camera.position;
            audio.catHiss();
            spooky.meow(0.6, 0.8);
            audio.stinger();
          }],
          [3.6, () => fx.flash(0.9)],
        ],
        tick(lt) {
          const c = A.tabby;
          const push = U.ease.inOut(U.smoothstep(2.2, 3.6, lt));
          const pos = EYES.clone().addScaledVector(TO_CAM, 5.8 - 1.5 * push).add(V(0.4 * (1 - push), 0.8 - 0.1 * push, 0));
          cam(pos, at(c.pos, 0, 0.4 + 0.25 * push, 0), 45 - 5 * push);
        },
      },
      // ---------------- Act 1: the escape
      {
        at: 12.5, k: [0, 0],
        enter() {
          fx.sepia(false);
          A.tabby.visible = false;
          A.witchFly.visible = false;
          audio.chase(1, 0.5);
          audio.heartbeat(140, 1);
          audio.drone(0.6, 1);
          fx.pulse(true);
          setDoor(-1.4);
          place(v, V(-3.5, 13, -46), Math.PI, 'run');
          v.stride = 6.2;
          v.followPath([flat(-3.5, -46), flat(-3.5, -52), flat(-6.2, -55.2), flat(-8.4, -55.5), flat(-11.2, -55.6)], 3.4);
          place(wc, V(-3.5, 13, -40), Math.PI, 'run');
          wc.snapPose();
          wc.setEyes(1);
          wc.followPath([flat(-3.5, -40), flat(-3.5, -52), flat(-6.2, -55.2), flat(-8.0, -55.5)], 3.4);
        },
        cues: [
          [0.4, () => fx.caption('Alex reached the village... with the werecat right behind him.', { scary: true })],
          [1.5, () => audio.villager('panic', 1)],
          [4.6, () => { setDoor(0, 16); snd.slam(1); fx.shake(0.35, 0.3); audio.chase(0, 1); }],
        ],
        tick(lt) {
          if (lt < 3.3) cam(V(-2.2, 14.3, -56.4), at(v.pos, 0, 0.7, 0), 55);
          else cam(V(-12.7, 15.3, -57.6), V(-10.2, 13.85, -55.5), 60, true);
        },
      },
      {
        at: 18.5, k: [0, 0],
        enter() {
          setDoor(0);
          place(v, INSIDE, -Math.PI / 2, 'idle');
          v.idleLook = false;
          place(wc, V(-8.1, 13, -54.95), yawTo(V(-8.1, 0, -54.95), V(-9, 0, -55.5)), 'stand');
          wc.snapPose();
          wc.lookTarget = V(-9.2, 14.8, -55.5);
          audio.heartbeat(110, 0.9);
        },
        cues: [
          [0.6, () => { wc.swipeT = 0.35; }],
          [0.75, () => { snd.scrape(1); PR.door.setClawed(true); doorKick = 1; fx.burst('splinter', V(-9, 14.2, -55.5), 14, 0.6); }],
          [1.4, () => spooky.growl(0.8)],
          [2.6, () => fx.caption('Claws raked the door... and then everything went quiet.')],
          [3.0, () => { audio.heartbeat(0); fx.pulse(false); }],
        ],
        tick() { cam(V(-4.4, 15.0, -57.4), V(-8.8, 14.3, -55.4), 50); },
      },
      {
        at: 24.5, k: [0, 0],
        enter() {
          place(v, INSIDE, Math.PI / 2, 'idle');
          v.idleLook = false;
          place(wc, V(-6.6, 13, -54.3), yawTo(V(-6.6, 0, -54.3), DOORSTEP), 'stand');
          wc.snapPose();
          PR.clawPoppy.visible = true;
          audio.drone(0.35, 2);
        },
        cues: [
          [2.2, () => { setDoor(-0.32, 1.2); spooky.creak({ dur: 1, vol: 0.5 }); }],
          [3.2, () => { wc.lookTarget = vHead; }],
          [5.0, () => { wc.mode = 'crouch'; }],
          [5.6, () => {
            layPoppy(0.45);
            fx.caption('It left something on the doorstep: his poppy.');
          }],
          [6.6, () => { wc.lookTarget = null; wc.mode = 'stand'; wc.walkTo(-3.5, -44, 1.5); }],
          [8.0, () => audio.howl({ dist: 0.7, dur: 3.2, pitch: 0.85, vol: 0.6 })],
          [9.2, () => fx.caption('He was safe. Or so he thought...', { scary: true })],
        ],
        tick(lt) {
          if (lt < 3) cam(V(-12.4, 14.1, -56.3), at(v.pos, 0, 0.85, 0), 50, true);
          else {
            const d = U.ease.inOut(U.smoothstep(4.4, 6.0, lt));
            const zoom = U.ease.inOut(U.smoothstep(6.4, 10.5, lt));
            cam(V(-8.95, 14.0, -55.2), at(wc.pos, 0, 2.0, 0).lerp(at(poppyRest.pos, 0, 0.3, 0), d), 55 - 12 * zoom);
          }
        },
      },
      // ---------------- Act 2: the village's secret
      {
        at: 35, k: [0, 0],
        enter() {
          wc.visible = false;
          setDoor(0, 3);
          place(v, INSIDE, -Math.PI / 2, 'idle');
          v.idleLook = false;
          v.lookTarget = at(CAULDRON, 0, 0.8, 0);
          snd.bubbling(1);
        },
        cues: [
          [0.4, () => fx.caption('But whose house was this?')],
          [1.2, () => v.walkTo(-11.8, -56.3, 0.7)],
          [4.2, () => { v.lookTarget = V(-12.8, 14.6, -56.2); fx.caption('Potions... and a map of the dark forest, with Grandpa\'s cottage circled in red.'); }],
          [6.2, () => { v.lookTarget = V(-10.55, 14.35, -54.03); }],
          [8.2, () => { v.lookTarget = HAT_HOOK; fx.caption('...and a hat he had seen once before.', { scary: true }); }],
          [9.4, () => { v.lookTarget = null; v.walkTo(-11.9, -55.6, 0.8); }],
          [10.8, () => { PR.tableApple.visible = false; hold('apple', true); }],
        ],
        tick(lt) {
          if (lt < 4) cam(V(-10.0, 14.6, -57.6), V(-11.9, 13.7, -56.6), 55, true);
          else if (lt < 8) {
            const k = U.ease.inOut(U.clamp((lt - 4.3) / 3.2, 0, 1));
            cam(V(-10.5, 15.0, -56.8), V(-12.8, 14.6, -56.4).lerp(V(-10.55, 14.35, -54.03), k), 55, true);
          } else cam(V(-11.0, 14.7, -55.4), at(HAT_HOOK, 0, 0.05, 0), 45, true);
        },
      },
      {
        at: 47, k: [0, 0],
        enter() {
          place(v, V(-11.9, 13, -55.6), 0, 'idle');
          hold('apple', true);
          PR.tableApple.visible = false;
          witch.visible = false;
          witch.setHood(true);
          A.familiar.visible = false;
        },
        cues: [
          [0.2, () => { setDoor(-1.3, 0.9); spooky.creak({ dur: 1.8 }); }],
          [0.5, () => { v.walkTo(HIDE.x, HIDE.z, 2.4); audio.villager('panic', 0.5); }],
          [1.6, () => {
            place(witch, DOORSTEP, -Math.PI / 2, 'idle').followPath([flat(DOORSTEP.x, DOORSTEP.z), flat(-10.8, -55.5), flat(WITCH_SPOT.x, WITCH_SPOT.z)], 1.1);
            place(A.familiar, at(DOORSTEP, 0.6, 0, 0.4), -Math.PI / 2, 'idle').walkTo(-11.1, -57.0, 1.3);
          }],
          [2.6, () => { v.stop(); v.faceTowards(-10.5, -56.5); }],
          [4.2, () => { setDoor(0, 1.6); spooky.creak({ dur: 0.9, vol: 0.4 }); }],
          [5.1, () => snd.slam(0.35)],
          [5.2, () => { witch.faceTowards(HAT_HOOK.x, HAT_HOOK.z); A.familiar.mode = 'sit'; }],
          [6.2, () => { PR.hookHat.visible = false; witch.setHood(false); fx.burst('witch', at(witch.pos, 0, 2.2, 0), 10, 0.4); }],
          [6.6, () => { witch.faceTowards(-10.5, -54.8); witch.cackling = true; spooky.cackle({ dist: 0.25, vol: 0.8 }); }],
          [7.0, () => fx.caption('The kind old village cleric... was the witch!', { scary: true })],
          [9.2, () => { witch.cackling = false; }],
        ],
        tick(lt) {
          if (lt < 4.5) cam(V(-12.6, 15.5, -57.3), V(-11.2, 13.9, -55.0), 58, true);
          else cam(V(-10.45, 14.75, -55.35), at(witchHead, 0, -0.15, 0), 50, true);
        },
      },
      {
        at: 57, k: [0, 0],
        enter() {
          place(witch, WITCH_SPOT, yawTo(WITCH_SPOT, V(-10.5, 0, -54.8)), 'idle');
          witch.setHood(false);
          PR.hookHat.visible = false;
          place(A.familiar, V(-11.1, 13, -57.0), 0.4, 'sit');
          place(v, HIDE, yawTo(HIDE, V(-10.5, 0, -56.5)), 'idle');
          hold('apple', true);
        },
        cues: [
          [0.3, () => { witch.holdUp = true; PR.bigPotion.visible = true; witch.cackling = true; spooky.cackle({ dist: 0.2, vol: 0.7 }); }],
          [0.6, () => fx.caption('Tonight, she meant to pour a new potion over the whole village.', { scary: true })],
          [2.6, () => { witch.cackling = false; }],
          [3.8, () => { A.familiar.mode = 'hiss'; A.familiar.faceTowards(HIDE.x, HIDE.z); audio.catHiss(); }],
          [4.4, () => { witch.faceTowards(HIDE.x, HIDE.z); witch.lookTarget = vHead; }],
          [5.2, () => { audio.stinger(); v.mode = 'panic'; audio.villager('panic', 1); }],
          [6.2, () => { v.mode = 'idle'; }],
        ],
        tick(lt) {
          if (lt < 3.8) cam(V(-10.9, 13.9, -55.1), at(witchHead, 0, 0.3, 0), 55, true);
          else cam(V(-10.35, 14.3, -57.65), at(HIDE, 0, 0.75, 0), 58, true);
        },
      },
      // ---------------- Act 3: the rescue, both ways
      {
        at: 66, k: [0, 0],
        enter() {
          place(witch, WITCH_SPOT, yawTo(WITCH_SPOT, HIDE), 'idle');
          witch.setHood(false);
          witch.holdUp = true;
          PR.bigPotion.visible = true;
          witch.lookTarget = vHead;
          place(v, HIDE, yawTo(HIDE, WITCH_SPOT), 'idle');
          hold('apple', true);
          place(A.familiar, V(-11.1, 13, -57.0), 0.4, 'sit');
          doorAngle = doorTarget = 0;
          place(wc, V(-6.9, 13, -55.5), -Math.PI / 2, 'run');
          wc.snapPose();
          wc.setEyes(1);
          audio.drone(0.9, 1);
        },
        cues: [
          [0.2, () => { witch.cackling = true; spooky.cackle({ dist: 0.2, vol: 0.6 }); }],
          [0.9, () => {
            witch.cackling = false;
            witch.lookTarget = DOOR_IN;
            snd.slam(0.7);
            doorKick = 1;
            fx.burst('splinter', DOOR_IN, 6, 0.4);
            spooky.growl(0.7);
          }],
          [1.5, () => {
            snd.slam(1);
            doorKick = 1.4;
            fx.shake(0.25, 0.3);
            fx.burst('splinter', DOOR_IN, 10, 0.5);
            A.familiar.mode = 'hiss';
            A.familiar.faceTowards(DOOR_IN.x, DOOR_IN.z);
            audio.catHiss();
          }],
          [2.0, () => {
            setDoor(-1.65, 16);
            snd.slam(1.3);
            audio.boom(0.9);
            fx.shake(0.6, 0.6);
            fx.burst('splinter', V(-9.8, 14.2, -55.5), 24, 0.8);
            wc.walkTo(-10.7, -55.55, 6);
            v.mode = 'panic';
            audio.villager('panic', 0.8);
          }],
          [2.55, () => leap(wc, BEAST_SPOT, 0.5, 0.45, () => {
            wc.mode = 'crouch';
            wc.faceTowards(WITCH_SPOT.x, WITCH_SPOT.z);
            wc.lookTarget = witchHead;
            fx.shake(0.4, 1.4);
            fx.burst('dust', BEAST_SPOT, 12, 0.6);
            audio.howl({ dist: 0.05, dur: 1.6, pitch: 0.95, vol: 0.8 });
            v.mode = 'idle';
          })],
          [3.3, () => {
            witch.lookTarget = at(BEAST_SPOT, 0, 2, 0);
            const f = A.familiar;
            f.mode = 'idle';
            f.followPath([flat(f.pos.x, f.pos.z), flat(-10.6, -55.6), flat(-6.0, -55.2)], 5);
          }],
          [4.4, () => { wc.swipeT = 0.35; snd.whoosh(); }],
          [4.55, () => {
            leap(witch, WITCH_HIT, 0.35, 0);
            witch.hurt();
            witch.holdUp = false;
            snd.shriek();
            fx.shake(0.3, 0.35);
            fx.burst('witch', at(witch.pos, 0, 1.4, 0), 8, 0.5);
          }],
          [4.9, () => wc.faceTowards(WITCH_HIT.x, WITCH_HIT.z)],
          [5.2, () => audio.villager('question', 0.7)],
          [6.0, () => { witch.lookTarget = at(BEAST_SPOT, 0, 2.1, 0); witch.holdUp = true; }],
        ],
        tick(lt) {
          if (lt < 2.5) cam(DOOR_CAM, DOOR_LOOK, 66, true);
          else cam(WIDE_CAM, FIGHT_LOOK, 66, true);
        },
      },
      {
        at: 74, k: [0, 0],
        enter() {
          place(wc, BEAST_SPOT, yawTo(BEAST_SPOT, WITCH_HIT), 'crouch');
          place(witch, WITCH_HIT, yawTo(WITCH_HIT, BEAST_SPOT), 'idle');
          witch.setHood(false);
          witch.hurtT = 0;
          witch.holdUp = true;
          PR.bigPotion.visible = true;
          place(v, HIDE, yawTo(HIDE, WITCH_HIT), 'idle');
          hold('apple', true);
        },
        cues: [
          [0.3, () => {
            witch.holdUp = false;
            witch.throwT = 0.3;
            PR.bigPotion.visible = false;
            throwBottle(0xb040ff, at(witch.pos, 0, 1.9, 0), at(wc.pos, 0, 1.4, 0), 0.4, () => {
              snd.smash(1);
              snd.fizz(1);
              fx.burst('witch', at(wc.pos, 0, 1.4, 0), 16, 0.7);
              wc.mode = 'weak';
              wc.shake(1.2, 0.08);
              wc.setEyes(0.35);
              spooky.meow(0.6, 0.7);
            });
          }],
          [2.2, () => { witch.holdUp = true; PR.bigPotion.visible = true; witch.faceTowards(HIDE.x, HIDE.z); witch.lookTarget = vHead; witch.cackling = true; spooky.cackle({ dist: 0.2, vol: 0.8 }); }],
          [2.8, () => fx.caption('This time, he didn\'t run.')],
          [3.4, () => { witch.cackling = false; v.faceTowards(SHELF_NEAR.x, SHELF_NEAR.z); }],
          [3.9, () => { PR.shelf.bottles[4].visible = false; hold('bottle', true); }],
          [4.3, () => {
            hold('bottle', false);
            v.faceTowards(witch.pos.x, witch.pos.z);
            throwBottle(0x5aff4a, at(v.pos, 0, 0.75, 0), at(witch.pos, 0, 1.7, 0), 0.35, () => {
              snd.smash(1.2);
              snd.fizz(1.2);
              fx.flash(0.5);
              fx.burst('curse', at(witch.pos, 0, 1.2, 0), 50, 0.9);
              fx.shake(0.4, 0.5);
              PR.bigPotion.visible = false;
              witch.visible = false;
              const c = place(A.witchCat, witch.pos.clone(), yawTo(witch.pos, DOORSTEP), 'hiss');
              c.setEyes(1);
              spooky.meow(1.5, 0.9);
              audio.catHiss();
            });
          }],
          [6.2, () => {
            const c = A.witchCat;
            c.mode = 'idle';
            c.followPath([flat(c.pos.x, c.pos.z), flat(-10.6, -55.5), flat(-6.5, -53.5)], 7);
          }],
          [7.0, () => audio.villager('hmm', 0.8)],
        ],
        tick(lt) {
          cam(WIDE_CAM, FIGHT_LOOK, 66, true);
        },
      },
      // ---------------- Dawn: the cure
      {
        at: 82, k: [0.34, 0.52],
        enter() {
          audio.drone(0.25, 3);
          A.witchCat.visible = false;
          A.familiar.visible = false;
          witch.visible = false;
          place(wc, DAWN_BEAST, 0.4, 'weak');
          wc.snapPose();
          wc.setEyes(0.3);
          wc.rig.rotation.z = 1.35;
          place(v, DAWN_V, -Math.PI / 2, 'idle');
          v.idleLook = false;
          hold('apple', true);
          audio.wind(0.2, 3);
        },
        cues: [
          [0.4, () => fx.caption('As the sun came up, the werecat grew weaker and weaker...')],
          [1.0, () => { v.lookTarget = wc.parts.head.getWorldPosition(new THREE.Vector3()); }],
          [2.8, () => carryTo(held.apple, wc.parts.head.getWorldPosition(new THREE.Vector3()).add(V(0, 0.1, 0)), 0.8, () => { held.apple.visible = false; snd.crunch(); })],
          [4.2, () => { wc.shake(3.2, 0.1); snd.cure(); cureT = 3.2; audio.villager('question', 0.7); }],
          [7.4, () => { fx.flash(1.3); audio.boom(0.5); wc.visible = false; wc.rig.rotation.z = 0; }],
          [9.6, () => fx.caption('And just like that, the curse was broken.')],
          [10.6, () => audio.villager('hmm', 0.8)],
        ],
        tick(lt) {
          if (lt < 7.6) cam(V(-7.0, 14.4, -45.5), V(-7.6, 13.6, -49.6), 50);
          else cam(v.pos.clone().addScaledVector(fwd(v.yaw), 1.8).add(V(0, 0.95, -0.45)), at(v.pos, 0, 0.85, 0), 45);
        },
      },
      // ---------------- Epilogue: morning at Grandpa's
      {
        at: 95, k: [1, 1],
        enter() {
          audio.drone(0, 2);
          audio.piano(true);
          snd.bubbling(0);
          snd.birds(true);
          spooky.wind(0.05, 3);
          const r = route(40, 48.4);
          place(v, r[0], 0, 'idle');
          v.stride = 4.5;
          v.idleLook = true;
          hold('flower', true);
          v.followPath(r, 1.5);
          place(A.grandpa, at(BENCH, 0, 0, -0.05), Math.PI, 'sit');
          place(A.tabby, V(-5.5, CH + 1, 55.2), Math.PI * 0.9, 'sit').setEyes(0);
          A.tabby.setEvil(false, true);
          A.cats.forEach((c) => c.home());
          const d = (p) => Math.hypot(p.x + 10.5, p.z - 48.6);
          const post = hw.posts.reduce((b, p) => (d(p) < d(b) ? p : b));
          const sulk = place(A.witchCat, V(post.x, post.y + 1.0, post.z), Math.PI, 'sit');
          sulk.grounded = false;
          sulk.setEyes(1);
        },
        cues: [[0.5, () => fx.caption('Later that morning, he walked all the way back to Grandpa\'s cottage.')]],
        tick(lt) {
          const k = U.ease.inOut(U.clamp(lt / 9, 0, 1));
          cam(V(8, 21, 36).lerp(V(4, 17.5, 40.5), k), V(-8, 14, 56), 55);
        },
      },
      {
        at: 104, k: [1, 1],
        enter() {
          place(v, V(-7.5, CH + 1, 49.6), 0, 'idle');
          hold('flower', true);
          v.walkTo(-5.9, 54.9, 1.2);
        },
        cues: [
          [5.2, () => { v.stop(); v.faceTowards(BENCH.x, BENCH.z); carryTo(held.flower, PR.lapPoppy.getWorldPosition(new THREE.Vector3()), 0.6, () => { held.flower.visible = false; PR.lapPoppy.visible = true; }); }],
          [6.2, () => { A.grandpa.mode = 'sitUp'; A.grandpa.lookTarget = vHead; audio.villager('hmm', 0.9); }],
          [7.0, () => audio.villager('hmm', 0.7)],
          [7.4, () => fx.caption('Grandpa just smiled... and said he\'d had a very long night.')],
        ],
        tick(lt) {
          if (lt < 5) cam(V(-3.4, CH + 3.6, 52.4), V(-6.0, CH + 1.5, 56.0), 55);
          else cam(V(-3.5, CH + 3.0, 53.5), V(-6.0, CH + 1.9, 55.8), 50);
        },
      },
      {
        at: 116, k: [1, 1],
        enter() {},
        cues: [
          [0.5, () => fx.caption('And the next full moon... was just a moon.')],
          [5.5, () => { fx.fade(1, 2); audio.piano(false); snd.birds(false); }],
          [8.0, () => { fx.hideCaption(); ended = true; if (api.onEnd) api.onEnd(); }],
        ],
        tick(lt) {
          const k = U.ease.inOut(U.clamp(lt / 8, 0, 1));
          cam(V(-7.5, CH + 5, 44).lerp(V(-7.5, CH + 6.5, 41), k), V(-7, CH + 2.5, 56), 55);
        },
      },
    ];

    let time = 0, idx = -1, fired = [];

    // Finish anything still in the air so every beat starts from a settled state.
    function settle() {
      flying.splice(0).forEach((f) => { scene.remove(f.b); if (f.onHit) f.onHit(); });
      if (falling) { const f = falling; falling = null; scene.remove(f.b); if (f.onLand) f.onLand(); }
      if (carry) { const c = carry; carry = null; c.obj.visible = false; PR.restoreHeld(); if (c.onDone) c.onDone(); }
      if (pounce) finishPounce();
      if (laying) finishLaying();
    }

    function enterBeat(i) {
      settle();
      idx = i;
      const b = beats[i];
      fired = (b.cues || []).map(() => false);
      fx.hideCaption();
      if (b.enter) b.enter();
    }

    function reset() {
      time = 0;
      idx = -1;
      ended = false;
      fx.reset();
      audio.reset();
      spooky.reset();
      snd.reset();
      resetProps();
      Object.values(A).forEach((a) => {
        if (!a || !a.stop) return;
        a.stop();
        a.lookTarget = null;
        a.forceVel = null;
        a.shakeT = 0;
      });
      [v, wc, witch, A.witchFly, A.witchCat, A.familiar, A.tabby].forEach((a) => { a.visible = false; });
      A.tabby.setEvil(false, true);
      A.witchCat.grounded = true;
      wc.mode = 'stand';
      wc.snapPose();
      wc.rig.rotation.z = 0;
      wc.grounded = true;
      witch.holdUp = false;
      witch.cackling = false;
      witch.setHood(true);
      A.witchFly.cackling = false;
      v.stride = 4.5;
      v.mode = 'idle';
      A.grandpa.visible = false;
      A.cats.forEach((c) => { c.visible = false; });
      day.set(0);
      world.setLightsOn(1);
    }

    function update(dt, t) {
      if (!ended) time += dt;
      while (idx + 1 < beats.length && time >= beats[idx + 1].at) enterBeat(idx + 1);
      const b = beats[idx];
      const lt = time - b.at;
      vHead.copy(v.pos).add(V(0, v.eyeHeight, 0));
      witchHead.copy(witch.pos).add(V(0, 2.1, 0));
      (b.cues || []).forEach((c, k) => {
        if (!fired[k] && lt >= c[0]) { fired[k] = true; c[1](); }
      });
      if (b.tick) b.tick(lt, dt);

      const next = beats[idx + 1];
      const dur = next ? next.at - b.at : 10;
      const k = U.lerp(b.k[0], b.k[1], U.smoothstep(0, dur, lt));
      day.set(k, inside);
      world.setLightsOn(k < 0.8 ? 1 : 0);

      // Door swing with a little shudder when something hits it
      doorAngle += (doorTarget - doorAngle) * U.damp(doorRate, dt);
      doorKick = Math.max(0, doorKick - dt * 3);
      PR.door.group.rotation.y = -Math.PI / 2 + doorAngle + Math.sin(t * 60) * 0.04 * doorKick;

      // The flying witch in the cold open
      const wf = A.witchFly;
      if (wf.visible && wf.flight) {
        wf.flight.t += dt;
        wf.pos.lerpVectors(wf.flight.from, wf.flight.to, Math.min(1, wf.flight.t / wf.flight.dur));
        if (Math.random() < dt * 20) fx.burst('witch', at(wf.pos, 0, -0.2, 0), 1, 0.6);
      }

      flying.slice().forEach((f) => {
        f.t += dt;
        const u = Math.min(1, f.t / f.dur);
        f.b.position.lerpVectors(f.from, f.to, u).add(V(0, Math.sin(Math.PI * u) * 0.5, 0));
        f.b.rotation.x += dt * 14;
        if (u >= 1) { scene.remove(f.b); flying.splice(flying.indexOf(f), 1); if (f.onHit) f.onHit(); }
      });
      if (falling) {
        falling.vel.y -= 9.8 * dt;
        falling.b.position.addScaledVector(falling.vel, dt);
        falling.b.rotation.z += dt * 8;
        if (Math.random() < dt * 30) fx.burst('witch', falling.b.position, 1, 0.1);
        if (falling.b.position.y <= falling.groundY) {
          const f = falling;
          falling = null;
          scene.remove(f.b);
          if (f.onLand) f.onLand();
        }
      }
      if (pounce) {
        const p = pounce;
        p.t += dt;
        const u = Math.min(1, p.t / p.dur);
        p.a.pos.lerpVectors(p.from, p.to, u);
        p.a.pos.y += Math.sin(Math.PI * u) * p.h;
        if (u >= 1) finishPounce();
      }
      if (laying) {
        laying.t += dt;
        const u = Math.min(1, laying.t / laying.dur);
        PR.groundPoppy.position.lerpVectors(laying.from, poppyRest.pos, u * u);
        PR.groundPoppy.quaternion.slerpQuaternions(laying.fromQ, poppyRest.quat, U.ease.inOut(u));
        if (u >= 1) finishLaying();
      }
      if (carry) {
        carry.t += dt;
        const u = Math.min(1, carry.t / carry.dur);
        carry.obj.position.lerpVectors(carry.from, carry.to, U.ease.inOut(u));
        if (u >= 1) {
          const c = carry;
          carry = null;
          c.obj.visible = false;
          PR.restoreHeld();
          if (c.onDone) c.onDone();
        }
      }

      if (smokeT > 0) {
        smokeT -= dt;
        if (Math.random() < dt * 12) fx.burst('curse', at(EYES, 0, 0.4, 0), 1, 0.8);
      }
      if (evilT > 0) {
        evilT -= dt;
        if (Math.random() < dt * 14) fx.burst('wisp', at(A.tabby.pos, 0, 0.7, 0), 1, 0.15);
      }
      PR.flashLight.intensity = Math.max(0, PR.flashLight.intensity - dt * 10);
      if (cureT > 0) {
        cureT -= dt;
        const body = wc.parts.hips.getWorldPosition(new THREE.Vector3());
        if (Math.random() < dt * 14) fx.burst('gold', body, 3, 1.2);
        if (Math.random() < dt * 6) fx.burst('curse', body, 1, 1);
      }
      if (lairLight && inside && Math.random() < dt * 3) fx.burst('spark', at(CAULDRON, 0, 0.75, 0), 1, 0.3);
    }

    function seek(sec) {
      reset();
      for (let i = 0; i < beats.length && beats[i].at <= sec; i++) {
        enterBeat(i);
        const lt = sec - beats[i].at;
        (beats[i].cues || []).forEach((c, k) => { if (c[0] <= lt) { fired[k] = true; c[1](); } });
      }
      if (sec > 2 && sec < 121.5) fx.setFade(0);
      if (sec >= 12.5) fx.sepia(false);
      time = sec;
    }

    const api = {
      reset, update, seek, onEnd: null,
      get time() { return time; },
      get done() { return ended; },
    };
    return api;
  }

  FW.Story = { create };
})();
