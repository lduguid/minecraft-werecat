(function () {
  const U = WC.U;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  function create(ctx) {
    const { camera, world, sky, fx, scene } = ctx;
    const A = ctx.actors;
    const audio = WC.Audio;
    const MD = WC.MOON_DIR.clone();
    const MDh = V(MD.x, 0, MD.z).normalize();
    const S = world.S.clone(), HILL = world.HILL.clone(), VC = world.VC.clone(), FB = world.FB.clone();
    const spots = world.spots;
    const MOBS = ['zombieA', 'zombieB', 'skeletonA', 'skeletonB', 'spiderA', 'spiderB', 'creeper', 'enderman'];

    const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
    const fwd = (yaw) => V(Math.sin(yaw), 0, Math.cos(yaw));
    const side = (yaw) => V(Math.cos(yaw), 0, -Math.sin(yaw));
    const at = (v, x, y, z) => v.clone().add(V(x, y, z));
    const off = (a, x, y, z) => at(a.pos, x, y, z);
    const YAW_SE = Math.atan2(MDh.x, MDh.z);
    const YAW_NW = Math.atan2(-MDh.x, -MDh.z);
    const YAW_NORTH = yawTo(S, VC);
    const MOON_POINT = S.clone().addScaledVector(MD, 300);
    const HILL_EYE = at(HILL, 0, 2, 0);
    const awayFromHill = (p) => V(p.x - HILL.x, 0, p.z - HILL.z).normalize();

    function cam(pos, look, fov) {
      const floor = world.groundAt(pos.x, pos.z) + 0.5;
      camera.position.set(pos.x, Math.max(pos.y, floor), pos.z);
      camera.lookAt(look);
      fov = fov || 58;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }

    function show(a, pos, yaw) {
      a.visible = true;
      a.place(pos, yaw);
      a.mode = a.type === 'werecat' ? a.mode : 'idle';
      a.lookTarget = null;
      return a;
    }

    function spawnMob(k) {
      show(A[k], spots[k], yawTo(spots[k], S));
      fx.burst('poof', at(spots[k], 0, 0.8, 0), 18, 0.9);
      audio.poof(0.6);
    }

    function nightMobs(hidden) {
      MOBS.forEach((k) => {
        if (hidden && hidden.includes(k)) { A[k].visible = false; return; }
        show(A[k], spots[k], yawTo(spots[k], S));
      });
    }

    function backAway(a, dist, speed) {
      const d = awayFromHill(a.pos);
      a.mode = 'scared';
      a.walkTo(a.pos.x + d.x * dist, a.pos.z + d.z * dist, speed, false);
      a.targetYaw = yawTo(a.pos, HILL);
    }

    // ---- The poppy he was carrying ----
    const flower = A.villager.parts.flower;
    const flowerHome = { parent: flower.parent, pos: flower.position.clone(), rot: flower.rotation.clone() };
    let flowerFall = null;
    function dropFlower() {
      scene.attach(flower);
      flowerFall = { vy: 1.5, ground: world.groundAt(flower.position.x, flower.position.z) + 0.05 };
    }
    function resetFlower() {
      flowerHome.parent.add(flower);
      flower.position.copy(flowerHome.pos);
      flower.rotation.copy(flowerHome.rot);
      flowerFall = null;
    }

    // ---- The chase: both runners are driven along the same curve ----
    const chaseCurve = new THREE.CatmullRomCurve3(world.runPath.map((p) => V(p.x, 0, p.z)), false, 'centripetal');
    const chaseLen = chaseCurve.getLength();
    const RUN_SPEED = 3.4;
    const hillward = V(HILL.x - S.x, 0, HILL.z - S.z).normalize();
    const steps = { v: 0, w: 0 };

    function chase(ct, dt) {
      const v = A.villager, w = A.werecat;
      const vd = Math.min(chaseLen - 0.01, ct * RUN_SPEED);
      const p = chaseCurve.getPointAt(vd / chaseLen);
      const tan = chaseCurve.getTangentAt(vd / chaseLen);
      v.pos.x = p.x;
      v.pos.z = p.z;
      v.targetYaw = Math.atan2(tan.x, tan.z);
      v.forceVel = vd < chaseLen - 0.05 ? RUN_SPEED : 0;

      const trail = U.lerp(24, 5.5, U.smoothstep(0, 22, ct));
      const wd = vd - trail;
      let wp, wt;
      if (wd >= 0) {
        wp = chaseCurve.getPointAt(wd / chaseLen);
        wt = chaseCurve.getTangentAt(wd / chaseLen);
      } else {
        wp = V(S.x, 0, S.z).addScaledVector(hillward, -wd);
        wt = hillward.clone().negate();
      }
      w.pos.x = wp.x + Math.sin(ct * 0.7) * 1.2;
      w.pos.z = wp.z;
      w.targetYaw = Math.atan2(wt.x, wt.z);
      w.forceVel = v.forceVel > 0 ? 4.6 : 0;

      const vs = Math.floor(v.phase / Math.PI);
      if (vs !== steps.v) { steps.v = vs; if (v.vel > 0.5) audio.step(0.8); }
      const ws = Math.floor(w.phase / Math.PI);
      if (ws !== steps.w) { steps.w = ws; if (w.vel > 0.5) audio.step(U.clamp(1.5 - trail / 18, 0.2, 1.3), true); }
      if (Math.random() < dt * 0.5) audio.villager('panic', 0.7);
    }

    let jump = null;
    let ended = false;

    const beats = [
      // 1. Sunset: the villager is out gathering flowers
      {
        at: 0,
        enter() {
          fx.setFade(1);
          fx.fade(0, 2.5);
          fx.cinema(true);
          audio.piano(true);
          audio.wind(0.35, 3);
          const v = show(A.villager, at(S, 1.5, 0, 1), -2.3);
          v.idleLook = true;
        },
        cues: [
          [0.3, () => A.villager.walkTo(S.x - 1.2, S.z - 0.8, 1.1)],
          [0.8, () => fx.caption('Far from home, a villager wandered the grassy plains, gathering flowers...')],
          [2.8, () => { A.villager.mode = 'pick'; }],
          [4.6, () => { A.villager.mode = 'idle'; A.villager.walkTo(S.x + 0.2, S.z - 2.2, 1.0); }],
          [6.4, () => { A.villager.mode = 'pick'; }],
        ],
        tick(lt) {
          const k = U.ease.inOut(U.clamp(lt / 8, 0, 1));
          cam(S.clone().add(V(13, 7.5, 15).lerp(V(8, 4.5, 9.5), k)), at(S, -1, 1, -1), 55);
        },
      },
      // 2. The sun slips away
      {
        at: 8,
        enter() { A.villager.mode = 'idle'; A.villager.stop(); },
        cues: [
          [0.4, () => fx.caption('He was so busy, he never noticed the sun slipping away...')],
          [2.0, () => { A.villager.lookTarget = at(A.villager.pos, WC.SUN_DIR.x * 40, 8, WC.SUN_DIR.z * 40); }],
          [2.6, () => audio.villager('question')],
          [4.6, () => { A.villager.mode = 'confused'; }],
        ],
        tick(lt) {
          const v = A.villager;
          const k = U.ease.inOut(U.clamp(lt / 7, 0, 1));
          cam(off(v, U.lerp(3.4, 2.4, k), U.lerp(1.5, 1.2, k), U.lerp(2.2, 3.3, k)), at(v.pos, -0.6, 1.5, -0.8), 50);
        },
      },
      // 3. Home is a few tiny lights on the horizon
      {
        at: 15,
        enter() {
          const v = A.villager;
          v.mode = 'idle';
          v.lookTarget = null;
          v.idleLook = false;
          v.targetYaw = yawTo(v.pos, VC);
          audio.piano(false);
        },
        cues: [
          [0.4, () => fx.caption('When he finally looked up, his village was just a few tiny lights... far, far away.')],
          [2.0, () => audio.crickets(true)],
          [4.2, () => audio.villager('hmm', 0.8)],
        ],
        tick(lt) {
          const v = A.villager;
          const k = U.ease.inOut(U.clamp(lt / 7, 0, 1));
          const pos = v.pos.clone().addScaledVector(fwd(v.yaw), -U.lerp(3.2, 2.4, k)).addScaledVector(side(v.yaw), 0.9).add(V(0, 2.1, 0));
          cam(pos, at(VC, 0, 3, 0), U.lerp(50, 36, k));
        },
      },
      // 4. The monsters appear
      {
        at: 22,
        enter() {
          nightMobs(['skeletonA', 'zombieA', 'spiderA']);
          show(A.villager, S, YAW_NORTH);
        },
        cues: [
          [0.3, () => fx.caption('Night had fallen. And with the night... came the monsters.')],
          [1.0, () => { spawnMob('skeletonA'); audio.skeleton(1, -0.5); }],
          [4.0, () => { spawnMob('zombieA'); audio.zombie(1, -0.3); }],
          [7.0, () => { spawnMob('spiderA'); audio.spider(1, 0.3); }],
        ],
        tick(lt) {
          const yaw = -2.25 + 0.3 * lt;
          const base = at(S, 0.8, 2.3, -0.8);
          cam(base, base.clone().add(V(Math.sin(yaw) * 12, -1.0, Math.cos(yaw) * 12)), 55);
        },
      },
      // 5. Under the full moon, they are strangely still
      {
        at: 31,
        enter() {
          nightMobs();
          const v = show(A.villager, S, YAW_SE);
          v.lookTarget = MOON_POINT;
          MOBS.forEach((k) => { A[k].lookTarget = MOON_POINT; });
          audio.drone(0.55, 4);
        },
        cues: [[0.4, () => fx.caption('But tonight there was a full moon... and the monsters were strangely quiet.')]],
        tick(lt) {
          const k = U.ease.inOut(U.clamp(lt / 8, 0, 1));
          cam(S.clone().add(V(-16, 5, -20).lerp(V(-13, 5.5, -16), k)), at(S, 4, 3, 8), 55);
        },
      },
      // 6. The crickets stop
      {
        at: 39,
        enter() {
          const v = show(A.villager, S, YAW_SE);
          v.idleLook = false;
          audio.crickets(false);
          audio.wind(0.1, 0.4);
          audio.drone(0.3, 1);
        },
        cues: [
          [0.3, () => fx.caption('Then... the crickets stopped.')],
          [0.9, () => { A.villager.lookTarget = at(S, 0, 1.6, 0).addScaledVector(side(YAW_SE), 5); }],
          [2.0, () => { A.villager.lookTarget = at(S, 0, 1.6, 0).addScaledVector(side(YAW_SE), -5); }],
          [2.6, () => audio.villager('hmm', 0.6)],
          [3.2, () => { A.villager.lookTarget = null; }],
        ],
        tick(lt) {
          const v = A.villager;
          cam(v.pos.clone().addScaledVector(fwd(YAW_SE), U.lerp(2.3, 1.8, lt / 4)).add(V(0, 1.7, 0)), at(v.pos, 0, 1.55, 0), 45);
        },
      },
      // 7. THE HOWL - a silhouette against the full moon
      {
        at: 43,
        enter() {
          A.villager.visible = false;
          const w = A.werecat;
          w.visible = true;
          w.place(HILL, YAW_NW);
          w.mode = 'crouch';
          w.snapPose();
          w.setEyes(0.9);
          audio.drone(0.15, 0.5);
        },
        cues: [
          [0.8, () => { A.werecat.mode = 'howl'; A.werecat.poseRate = 3.5; }],
          [0.9, () => { audio.howl({ dist: 0.3 }); audio.boom(0.7); fx.shake(0.55, 3.6); audio.drone(1, 2); }],
          [1.3, () => fx.bigText('MRRRAAAOOOOWWWW!!!', 3.4)],
          [5.3, () => { A.werecat.mode = 'stand'; A.werecat.poseRate = 5; }],
          [5.4, () => fx.caption('A howl...? Or was it a... meow?', { scary: true })],
        ],
        tick(lt) {
          const look = at(HILL, 0, 1.7, 0);
          cam(look.clone().addScaledVector(MD, -U.lerp(31, 28, lt / 7)), look, 22);
        },
      },
      // 8. Even the monsters are afraid
      {
        at: 50,
        enter() {
          show(A.villager, S, YAW_SE);
          MOBS.forEach((k) => { A[k].lookTarget = HILL_EYE; });
          A.creeper.mode = 'scared';
        },
        cues: [
          [0.1, () => { backAway(A.zombieA, 3, 0.9); audio.zombie(0.8, -0.2); }],
          [0.2, () => fx.caption('Even the monsters were afraid.')],
          [1.6, () => {
            const s = A.spiderA, d = awayFromHill(s.pos);
            s.lookTarget = null;
            s.walkTo(s.pos.x + d.x * 14 - d.z * 3, s.pos.z + d.z * 14 + d.x * 3, 6);
            audio.spider(1, 0.2);
          }],
          [3.5, () => {
            fx.burst('portal', at(A.enderman.pos, 0, 1.6, 0), 45, 1.4);
            audio.enderman(1);
            A.enderman.visible = false;
          }],
          [4.6, () => { A.skeletonA.shake(1.3, 0.06); audio.skeleton(1.2, -0.3); backAway(A.skeletonA, 3, 1.0); }],
        ],
        tick(lt) {
          if (lt < 1.5) cam(at(spots.zombieA, 3.2, 1.8, -1.2), off(A.zombieA, 0, 1.4, 0), 50);
          else if (lt < 3) cam(at(spots.spiderA, -5, 2.2, -2.5), off(A.spiderA, 0, 0.5, 0), 55);
          else if (lt < 4.5) cam(at(spots.enderman, 4.5, 2.2, -4.5), at(spots.enderman, 0, 2.0, 0), 55);
          else cam(at(spots.skeletonA, 3, 1.8, 2.5), off(A.skeletonA, 0, 1.3, 0), 50);
        },
      },
      // 9a. Flashback: a feral cat at the edge of the village
      {
        at: 56,
        flashback: true,
        enter() {
          fx.sepia(true);
          fx.flash(0.4);
          MOBS.forEach((k) => { A[k].visible = false; });
          A.villager.visible = false;
          A.werecat.visible = false;
          const start = at(FB, -1, 0, 3);
          const v2 = show(A.villager2, start, yawTo(start, at(FB, 1.5, 0, 0)));
          v2.idleLook = true;
          v2.walkTo(FB.x + 1.5, FB.z, 0.9);
          show(A.cat, at(FB, -4.5, 0, -2.5), 0.8).walkTo(FB.x - 1.4, FB.z + 0.2, 1.2);
        },
        cues: [
          [0.3, () => fx.caption('One full moon ago, a villager met a feral cat at the edge of the village...')],
          [2.5, () => {
            const c = A.cat;
            c.stop();
            c.mode = 'hiss';
            c.faceTowards(A.villager2.pos.x, A.villager2.pos.z);
            audio.catHiss();
          }],
          [2.9, () => {
            const v2 = A.villager2;
            v2.stop();
            v2.faceTowards(A.cat.pos.x, A.cat.pos.z);
            v2.lookTarget = off(A.cat, 0, 0.5, 0);
            audio.villager('question');
          }],
        ],
        tick() { cam(at(FB, 5.5, 3.0, 6.5), at(FB, -1, 0.8, 0), 50); },
      },
      // 9b. The scratch
      {
        at: 61,
        flashback: true,
        enter() { jump = null; },
        cues: [
          [0.1, () => fx.caption('It scratched him. Just a tiny little scratch...')],
          [0.25, () => {
            const c = A.cat, v2 = A.villager2;
            c.mode = 'pounce';
            c.grounded = false;
            const dir = V(c.pos.x - v2.pos.x, 0, c.pos.z - v2.pos.z).normalize();
            jump = { from: c.pos.clone(), to: v2.pos.clone().addScaledVector(dir, 0.5), t: 0 };
            audio.catHiss();
          }],
          [0.6, () => { A.villager2.hurt(); audio.villager('hurt'); fx.shake(0.3, 0.3); }],
          [0.95, () => {
            const c = A.cat;
            c.grounded = true;
            c.mode = 'idle';
            c.walkTo(FB.x - 14, FB.z + 9, 5.5);
            A.villager2.shake(0.5, 0.06);
          }],
          [1.7, () => { A.villager2.lookTarget = null; A.villager2.mode = 'confused'; audio.villager('hmm', 0.7); }],
        ],
        tick(lt, dt) {
          if (jump) {
            jump.t += dt / 0.4;
            const u = Math.min(1, jump.t);
            A.cat.pos.lerpVectors(jump.from, jump.to, u);
            A.cat.pos.y = U.lerp(jump.from.y, jump.to.y + 0.9, u) + Math.sin(Math.PI * u) * 0.8;
            if (u >= 1) jump = null;
          }
          const v2 = A.villager2;
          cam(off(v2, 2.4, 1.5, 2.6), at(v2.pos, -0.8, 0.9, -0.6), 45);
        },
      },
      // 9c. The next full moon: the transformation
      {
        at: 64,
        flashback: true,
        enter() {
          A.cat.visible = false;
          A.werecat.visible = false;
          const v2 = show(A.villager2, FB, YAW_NW);
          v2.idleLook = false;
        },
        cues: [
          [0.2, () => fx.caption('...but when the next full moon rose, he began to change.')],
          [0.6, () => { A.villager2.shake(2.1, 0.1); audio.transform(); }],
          [0.8, () => fx.burst('fur', at(FB, 0, 1.2, 0), 10, 0.8)],
          [1.4, () => fx.burst('fur', at(FB, 0, 1.2, 0), 12, 0.8)],
          [2.0, () => fx.burst('fur', at(FB, 0, 1.2, 0), 16, 0.9)],
          [2.6, () => {
            fx.flash(0.9);
            audio.boom(1);
            A.villager2.visible = false;
            const w = A.werecat;
            w.visible = true;
            w.place(FB, YAW_NW);
            w.mode = 'crouch';
            w.snapPose();
            fx.burst('spark', at(FB, 0, 1.5, 0), 36, 1.2);
            fx.burst('poof', at(FB, 0, 1, 0), 20, 1.2);
          }],
          [3.2, () => {
            A.werecat.mode = 'howl';
            A.werecat.poseRate = 3.5;
            audio.howl({ dist: 0.55, dur: 3.4, pitch: 1.05 });
            fx.shake(0.3, 2.6);
          }],
          [3.6, () => fx.caption('...into the WERECAT.', { scary: true })],
          [6.4, () => { A.werecat.mode = 'stand'; A.werecat.poseRate = 5; }],
        ],
        tick(lt) {
          const d = U.lerp(4.6, 6.4, U.ease.inOut(U.clamp(lt / 7, 0, 1)));
          const look = at(FB, 0, 1.6, 0);
          cam(look.clone().addScaledVector(MDh, -d).add(V(0, -0.2, 0)), at(look, 0, 0.6, 0), 55);
        },
      },
      // 10. Back to the present: he knows that sound
      {
        at: 71,
        enter() {
          fx.sepia(false);
          fx.flash(0.5);
          A.villager2.visible = false;
          A.cat.visible = false;
          A.werecat.visible = false;
          nightMobs(['enderman', 'spiderA']);
          MOBS.forEach((k) => { A[k].lookTarget = HILL_EYE; A[k].mode = 'scared'; });
          const v = show(A.villager, S, YAW_SE);
          v.idleLook = false;
          audio.drone(0.8, 1);
        },
        cues: [
          [0.2, () => fx.caption('The villager knew that sound. Every villager did.')],
          [0.5, () => A.villager.shake(4.5, 0.03)],
          [1.0, () => { dropFlower(); audio.heartbeat(95, 0.9); }],
          [1.3, () => { A.villager.mode = 'panic'; audio.villager('panic'); }],
          [1.7, () => audio.villager('panic')],
          [3.0, () => {
            A.villager.mode = 'idle';
            A.villager.targetYaw = YAW_NORTH;
            fx.bigText('RUN!', 1.6);
            audio.villager('panic', 1.1);
          }],
        ],
        tick(lt) {
          const v = A.villager;
          if (lt < 3) cam(v.pos.clone().addScaledVector(fwd(YAW_SE), U.lerp(2.0, 1.6, lt / 3)).add(V(0, 1.65, 0)), at(v.pos, 0, 1.55, 0), 45);
          else cam(off(v, 3.5, 1.9, 1.5), at(v.pos, 0, 1.2, -1), 55);
        },
      },
      // 11. The chase
      {
        at: 76,
        enter() {
          const v = A.villager;
          v.visible = true;
          v.stop();
          v.mode = 'run';
          v.lookTarget = null;
          v.shakeT = 0;
          v.stride = 6.2;
          const w = A.werecat;
          w.visible = true;
          w.stop();
          w.mode = 'run';
          w.snapPose();
          w.setEyes(1);
          audio.chase(1, 1.5);
          audio.heartbeat(125, 1);
          audio.drone(0.7, 1);
          fx.pulse(true);
          chase(0, 0);
          v.snapNext = true;
          w.snapNext = true;
        },
        cues: [
          [0.4, () => fx.caption('He ran for home as fast as his little legs could carry him!')],
          [5.0, () => audio.villager('panic', 1)],
          [9.3, () => { audio.howl({ dist: 0.2, dur: 3.8 }); fx.shake(0.35, 3); audio.heartbeat(150, 1.1); }],
          [9.8, () => fx.caption('And behind him... something was gaining.', { scary: true })],
          [12.4, () => { show(A.creeper, spots.creeper, yawTo(spots.creeper, S)).mode = 'scared'; }],
        ],
        tick(lt, dt) {
          chase(lt, dt);
          const v = A.villager;
          if (lt < 4.5) cam(off(v, 6, 1.8, 0.5), at(v.pos, 0, 1.1, -1.5), 60);
          else if (lt < 8.5) cam(off(v, 1.0, 2.2, 4.5), at(v.pos, -0.3, 1.8, -14), 60);
          else if (lt < 12.5) cam(off(v, -1.2, 1.5, -6.5), at(v.pos, 0.8, 1.7, 8), 62);
          else cam(at(spots.creeper, 1.5, 1.0, -3.5), at(v.pos, 0, 1.0, 0), 60);
        },
      },
      // 12. Cliffhanger
      {
        at: 93,
        enter() { fx.pulse(true); },
        cues: [
          [1.0, () => { audio.howl({ dist: 0.1, dur: 4 }); fx.shake(0.45, 3); }],
          [1.8, () => fx.caption('Would he make it home before the werecat caught him...?', { scary: true })],
          [3.8, () => { fx.fade(1, 2.2); audio.chase(0, 2.5); audio.drone(0, 3); }],
          [6.0, () => { audio.heartbeat(0); fx.pulse(false); }],
          [6.6, () => { fx.hideCaption(); ended = true; if (api.onEnd) api.onEnd(); }],
        ],
        tick(lt, dt) {
          chase(17 + lt, dt);
          const v = A.villager;
          const k = U.ease.inOut(U.clamp(lt / 6, 0, 1));
          cam(v.pos.clone().add(V(3, 3.5, 9).lerp(V(6, 20, 24), k)), at(v.pos, 0, 0, -6), 60);
        },
      },
    ];

    let time = 0, idx = -1, fired = [];

    function enterBeat(i) {
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
      jump = null;
      fx.reset();
      audio.reset();
      resetFlower();
      Object.values(A).forEach((a) => {
        a.visible = false;
        a.stop();
        a.lookTarget = null;
        a.mode = 'idle';
        a.forceVel = null;
        a.shakeT = 0;
        a.grounded = true;
      });
      const w = A.werecat;
      w.mode = 'stand';
      w.snapPose();
      w.poseRate = 5;
      A.villager.stride = 4.5;
      A.villager.idleLook = true;
      show(A.villager, at(S, 1.5, 0, 1), -2.3);
      sky.setTime(0);
      world.setLightsOn(0);
      steps.v = steps.w = 0;
    }

    function update(dt) {
      if (!ended) time += dt;
      while (idx + 1 < beats.length && time >= beats[idx + 1].at) enterBeat(idx + 1);
      const b = beats[idx];
      const lt = time - b.at;
      (b.cues || []).forEach((c, k) => {
        if (!fired[k] && lt >= c[0]) { fired[k] = true; c[1](); }
      });
      if (b.tick) b.tick(lt, dt);

      sky.setTime(b.flashback ? 1 : U.smoothstep(3, 24, time));
      world.setLightsOn(b.flashback ? 1 : U.smoothstep(12, 22, time));

      if (flowerFall) {
        flowerFall.vy -= 9.8 * dt;
        flower.position.y += flowerFall.vy * dt;
        flower.rotation.z += dt * 5;
        if (flower.position.y <= flowerFall.ground) {
          flower.position.y = flowerFall.ground;
          flower.rotation.set(-Math.PI / 2, 0, flower.rotation.z);
          flowerFall = null;
        }
      }
    }

    // Jump straight to a moment (used for debugging with ?t=seconds).
    function seek(t) {
      reset();
      for (let i = 0; i < beats.length && beats[i].at <= t; i++) {
        enterBeat(i);
        const lt = t - beats[i].at;
        (beats[i].cues || []).forEach((c, k) => { if (c[0] <= lt) { fired[k] = true; c[1](); } });
      }
      if (t > 3 && t < 96.8) fx.setFade(0);
      time = t;
    }

    const api = {
      reset, update, seek, onEnd: null,
      duration: 100.6,
      get time() { return time; },
      get done() { return ended; },
    };
    return api;
  }

  WC.Story = { create };
})();
