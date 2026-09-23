(function () {
  const U = WC.U;
  const P = 1 / 16; // one texture pixel in world units

  // Build a box whose faces are small pixel-art canvases.
  // spec: { color, noise, front, back, left, right, top, bottom, glow: { front, ... }, alpha }
  // Face painters are (ctx, w, h, rand) => void, drawn over the noisy base colour.
  function skinBox(w, h, d, spec, seed) {
    const rand = U.rng(seed || ((w * 73856093) ^ (h * 19349663) ^ (d * 83492791)));
    const faces = [
      ['left', d, h], ['right', d, h], ['top', w, d], ['bottom', w, d], ['front', w, h], ['back', w, h],
    ];
    const mats = faces.map(([name, fw, fh]) => {
      const c = WC.Tex.makeCanvas(fw, fh);
      const ctx = c.getContext('2d');
      const faceSpec = spec[name];
      const base = typeof faceSpec === 'string' ? faceSpec : (spec[name + 'Color'] || spec.color);
      WC.Tex.fillNoise(ctx, 0, 0, fw, fh, base, spec.noise === undefined ? 0.07 : spec.noise, rand);
      if (typeof faceSpec === 'function') faceSpec(ctx, fw, fh, rand);
      const opts = { map: WC.Tex.toTexture(c) };
      if (spec.alpha) opts.alphaTest = 0.5;
      const glow = spec.glow && spec.glow[name];
      if (glow) {
        const gc = WC.Tex.makeCanvas(fw, fh);
        const gctx = gc.getContext('2d');
        gctx.fillStyle = '#000';
        gctx.fillRect(0, 0, fw, fh);
        glow(gctx, fw, fh);
        opts.emissive = new THREE.Color(0xffffff);
        opts.emissiveMap = WC.Tex.toTexture(gc);
      }
      return new THREE.MeshLambertMaterial(opts);
    });
    return new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), mats);
  }

  // Plain unlit box, used for glowing eyes and similar details.
  function glowBox(w, h, d, color) {
    return new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), new THREE.MeshBasicMaterial({ color }));
  }

  // A pivot group placed in pixel units relative to its parent.
  function pivot(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x * P, y * P, z * P);
    parent.add(g);
    return g;
  }

  function put(parent, mesh, x, y, z) {
    mesh.position.set(x * P, y * P, z * P);
    parent.add(mesh);
    return mesh;
  }

  function approach(obj, prop, target, rate, dt) {
    obj[prop] += (target - obj[prop]) * U.damp(rate, dt);
  }

  class Actor {
    constructor(type) {
      this.type = type;
      this.root = new THREE.Group();
      this.rig = new THREE.Group();
      this.root.add(this.rig);
      this.parts = {};
      this.mats = [];
      this.vel = 0;
      this.phase = 0;
      this.stride = 4.5;
      this.mode = 'idle';
      this.yaw = 0;
      this.targetYaw = null;
      this.turnRate = 8;
      this.headYaw = 0;
      this.headPitch = 0;
      this.lookTarget = null;
      this.idleLook = true;
      this.path = null;
      this.move = null;
      this.hurtT = 0;
      this.shakeT = 0;
      this.shakeAmp = 0;
      this.grounded = true;
      this.yOffset = 0;
      this.snapNext = true;
      this.seed = Math.random() * 100;
      this.forceVel = null;
      this.anim = null;
    }

    get pos() { return this.root.position; }

    set visible(v) { this.root.visible = v; }
    get visible() { return this.root.visible; }

    finish() {
      const seen = new Set();
      this.root.traverse((o) => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (!seen.has(m)) { seen.add(m); this.mats.push(m); }
        });
      });
      return this;
    }

    place(v, yaw) {
      this.stop();
      this.root.position.set(v.x, v.y || 0, v.z);
      if (yaw !== undefined) { this.yaw = yaw; this.targetYaw = yaw; }
      this.vel = 0;
      this.snapNext = true;
      return this;
    }

    walkTo(x, z, speed, face) {
      this.path = null;
      this.move = { x, z, speed, face: face !== false };
    }

    followPath(points, speed) {
      const flat = points.map((p) => new THREE.Vector3(p.x, 0, p.z));
      const curve = new THREE.CatmullRomCurve3(flat, false, 'centripetal');
      this.move = null;
      this.path = { curve, len: curve.getLength(), dist: 0, speed };
    }

    stop() { this.path = null; this.move = null; }

    faceTowards(x, z) { this.targetYaw = Math.atan2(x - this.pos.x, z - this.pos.z); }

    hurt() { this.hurtT = 0.5; }

    shake(dur, amp) { this.shakeT = dur; this.shakeAmp = amp; }

    update(dt, t, world) {
      let speed = 0;
      const pos = this.root.position;
      if (this.path) {
        const p = this.path;
        p.dist += p.speed * dt;
        const u = Math.min(1, p.dist / p.len);
        const pt = p.curve.getPointAt(u);
        const tan = p.curve.getTangentAt(u);
        pos.x = pt.x;
        pos.z = pt.z;
        this.targetYaw = Math.atan2(tan.x, tan.z);
        speed = p.speed;
        if (u >= 1) this.path = null;
      } else if (this.move) {
        const m = this.move;
        const dx = m.x - pos.x, dz = m.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.05) {
          this.move = null;
        } else {
          const step = Math.min(d, m.speed * dt);
          pos.x += (dx / d) * step;
          pos.z += (dz / d) * step;
          speed = m.speed;
          if (m.face) this.targetYaw = Math.atan2(dx, dz);
        }
      }
      if (this.forceVel !== null) speed = this.forceVel;
      this.vel += (speed - this.vel) * U.damp(10, dt);
      if (this.targetYaw !== null) this.yaw = U.angleLerp(this.yaw, this.targetYaw, U.damp(this.turnRate, dt));
      this.root.rotation.y = this.yaw;

      if (world && this.grounded) {
        const gy = world.groundAt(pos.x, pos.z) + this.yOffset;
        if (this.snapNext) pos.y = gy;
        else pos.y += (gy - pos.y) * U.damp(gy > pos.y ? 18 : 10, dt);
      }
      this.snapNext = false;
      this.phase += this.vel * dt * this.stride;

      // Head tracking
      let hy, hp;
      if (this.lookTarget) {
        const dx = this.lookTarget.x - pos.x, dz = this.lookTarget.z - pos.z;
        const dy = this.lookTarget.y - (pos.y + 1.6);
        let rel = Math.atan2(dx, dz) - this.yaw;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        hy = U.clamp(rel, -1.3, 1.3);
        hp = U.clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.8, 0.6);
      } else if (this.idleLook) {
        const s = this.seed;
        hy = Math.sin(t * 0.35 + s) * 0.6 * Math.sin(t * 0.13 + s * 2);
        hp = Math.sin(t * 0.27 + s * 3) * 0.12;
      } else {
        hy = 0;
        hp = 0;
      }
      approach(this, 'headYaw', hy, 5, dt);
      approach(this, 'headPitch', hp, 5, dt);

      // Damage flash
      if (this.hurtT > 0) {
        this.hurtT -= dt;
        const k = Math.max(0, this.hurtT / 0.5);
        this.mats.forEach((m) => { if (m.emissive && !m.emissiveMap) m.emissive.setRGB(0.9 * k, 0, 0); });
      }

      this.rig.position.set(0, 0, 0);
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const a = this.shakeAmp;
        this.rig.position.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a * 0.5, (Math.random() - 0.5) * a);
      }

      if (this.anim) this.anim(dt, t);
    }
  }

  WC.Rig = { P, skinBox, glowBox, pivot, put, approach, Actor };
})();
