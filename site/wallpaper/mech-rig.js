/* Mech rig: gives the flat mech artwork a skeleton so it moves like a machine
   with weight instead of a stiff cut-out.

   Each picture gets a set of bones (hips, chest, head, arms, legs) laid over it.
   The picture is cut into a fine mesh, and every mesh point follows the bones
   near it (smooth skinning), so joints bend without visible seams. WebGL draws
   the bent mesh; without WebGL the mech falls back to the flat picture.

   Motion is physical rather than scripted: the body flies on springs and makes
   sudden dodges, and the limbs are springs too, so legs and the free arm swing
   and lag behind when it accelerates. The gun arm really aims: the arm turns
   toward the target, shots leave along the barrel, and each shot kicks it. */
(() => {
  "use strict";

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const angDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  function segDist2(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const u = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
    const x = ax + dx * u - px, y = ay + dy * u - py;
    return x * x + y * y;
  }

  // Bones in original image pixels. joint = pivot point, segs = the parts of
  // the picture that bone carries, r = roughly how thick that part is.
  const RIGS = {
    // Flying mech with the long cannon (intro-mech.webp)
    mechA: {
      src: "assets/intro-mech.webp", iw: 1448, ih: 1270,
      bones: [
        { name: "pelvis", parent: -1, joint: [690, 700], segs: [[560, 700, 820, 720]], r: 110 },
        { name: "chest", parent: 0, joint: [700, 650], segs: [[700, 620, 700, 330], [515, 60, 515, 230], [805, 60, 805, 230]], r: 190 },
        { name: "head", parent: 1, joint: [708, 315], segs: [[708, 300, 708, 150]], r: 85 },
        { name: "armL", parent: 1, joint: [340, 300], segs: [[330, 260, 150, 520]], r: 120 },
        { name: "foreL", parent: 3, joint: [150, 525], segs: [[145, 531, 80, 740]], r: 85 },
        { name: "armR", parent: 1, joint: [985, 310], segs: [[990, 290, 1110, 530]], r: 120 },
        { name: "foreR", parent: 5, joint: [1110, 530], segs: [[1110, 531, 1180, 760], [1180, 760, 1405, 950]], r: 80 },
        { name: "thighL", parent: 0, joint: [540, 715], segs: [[531, 708, 370, 933]], r: 95 },
        { name: "shinL", parent: 7, joint: [370, 935], segs: [[370, 933, 290, 1170]], r: 90 },
        { name: "thighR", parent: 0, joint: [770, 728], segs: [[772, 724, 724, 965]], r: 95 },
        { name: "shinR", parent: 9, joint: [724, 965], segs: [[724, 965, 692, 1140]], r: 90 },
      ],
      muzzle: [1405, 950],
      barrel: Math.atan2(950 - 675, 1405 - 1260), // cannon direction at rest
      thrusters: [[370, 531], [837, 531], [209, 965], [563, 933]],
      core: [668, 523], eyes: [708, 225],
    },
    // Heavy mech standing upright (mech.webp): shoulder missile pod
    mechB: {
      src: "assets/mech.webp", iw: 805, ih: 1239,
      bones: [
        { name: "pelvis", parent: -1, joint: [330, 560], segs: [[270, 560, 400, 560]], r: 100 },
        { name: "chest", parent: 0, joint: [330, 520], segs: [[300, 500, 300, 160], [470, 40, 490, 160]], r: 150 },
        { name: "head", parent: 1, joint: [296, 140], segs: [[296, 130, 296, 20]], r: 70 },
        { name: "armL", parent: 1, joint: [130, 200], segs: [[120, 190, 69, 440]], r: 85 },
        { name: "foreL", parent: 3, joint: [69, 440], segs: [[69, 440, 48, 600]], r: 70 },
        { name: "armR", parent: 1, joint: [500, 190], segs: [[500, 180, 578, 399]], r: 95 },
        { name: "foreR", parent: 5, joint: [578, 400], segs: [[578, 400, 592, 564], [688, 250, 660, 870]], r: 75 },
        { name: "thighL", parent: 0, joint: [261, 580], segs: [[261, 578, 206, 826]], r: 80 },
        { name: "shinL", parent: 7, joint: [206, 826], segs: [[206, 826, 151, 1150]], r: 80 },
        { name: "thighR", parent: 0, joint: [413, 580], segs: [[413, 578, 454, 826]], r: 80 },
        { name: "shinR", parent: 9, joint: [454, 826], segs: [[454, 826, 509, 1150]], r: 80 },
      ],
      launcher: [488, 34],
      thrusters: [[516, 433], [296, 977], [585, 970]],
      core: [255, 255], eyes: [296, 62],
    },
  };

  // Spring stiffness and damping ratio per bone: the gun arm is tight and
  // controlled, the legs and free arm are loose so they swing.
  const SPRINGS = {
    pelvis: [30, 0.8], chest: [40, 0.75], head: [28, 0.6],
    armL: [22, 0.3], foreL: [26, 0.28], armR: [80, 0.7], foreR: [90, 0.65],
    thighL: [16, 0.22], shinL: [20, 0.2], thighR: [16, 0.22], shinR: [20, 0.2],
  };
  const LOOSE_GUN = { armR: [30, 0.35], foreR: [34, 0.32] };

  function weightsAt(rig, x, y) {
    const best = [[-1, 0], [-1, 0], [-1, 0]];
    rig.bones.forEach((b, i) => {
      let d2 = Infinity;
      for (const s of b.segs) d2 = Math.min(d2, segDist2(x, y, s[0], s[1], s[2], s[3]));
      const w = 1 / Math.pow(0.02 + d2 / (b.r * b.r), 2);
      if (w > best[2][1]) { best[2] = [i, w]; best.sort((p, q) => q[1] - p[1]); }
    });
    const sum = best[0][1] + best[1][1] + best[2][1];
    return best.map(([i, w]) => [Math.max(i, 0), w / sum]);
  }

  function buildMesh(rig) {
    if (rig.mesh) return rig.mesh;
    const cols = 36, rows = Math.round(cols * rig.ih / rig.iw);
    const n = (cols + 1) * (rows + 1);
    const rest = new Float32Array(n * 2), uv = new Float32Array(n * 2);
    const bi = new Uint8Array(n * 3), bw = new Float32Array(n * 3);
    let k = 0;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++, k++) {
        const x = (i / cols) * rig.iw, y = (j / rows) * rig.ih;
        rest[k * 2] = x; rest[k * 2 + 1] = y;
        uv[k * 2] = i / cols; uv[k * 2 + 1] = j / rows;
        weightsAt(rig, x, y).forEach(([b, w], q) => { bi[k * 3 + q] = b; bw[k * 3 + q] = w; });
      }
    }
    const idx = new Uint16Array(cols * rows * 6);
    let q = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
        idx.set([a, b, c, b, d, c], q); q += 6;
      }
    }
    return (rig.mesh = { n, rest, uv, bi, bw, idx });
  }

  // Bone transforms (2×3 affine [a b c d e f]) from the joint angles, parent first.
  function pose(m) {
    const bones = m.rig.bones, mats = m.mats;
    for (let i = 0; i < bones.length; i++) {
      const b = bones[i], th = m.B[b.name].a, co = Math.cos(th), si = Math.sin(th);
      const jx = b.joint[0], jy = b.joint[1];
      const la = co, lb = si, lc = -si, ld = co, le = jx - co * jx + si * jy, lf = jy - si * jx - co * jy;
      const o = i * 6;
      if (b.parent < 0) { mats.set([la, lb, lc, ld, le, lf], o); continue; }
      const p = b.parent * 6;
      const A = mats[p], Bm = mats[p + 1], C = mats[p + 2], D = mats[p + 3], E = mats[p + 4], F = mats[p + 5];
      mats[o] = A * la + C * lb; mats[o + 1] = Bm * la + D * lb;
      mats[o + 2] = A * lc + C * ld; mats[o + 3] = Bm * lc + D * ld;
      mats[o + 4] = A * le + C * lf + E; mats[o + 5] = Bm * le + D * lf + F;
    }
  }

  // Where a point of the original picture is right now, in picture pixels.
  function imagePoint(m, x, y) {
    const key = x + "," + y;
    let w = m.rig.pw[key];
    if (!w) w = m.rig.pw[key] = weightsAt(m.rig, x, y);
    let ox = 0, oy = 0;
    for (const [b, wt] of w) {
      const o = b * 6, M = m.mats;
      ox += wt * (M[o] * x + M[o + 2] * y + M[o + 4]);
      oy += wt * (M[o + 1] * x + M[o + 3] * y + M[o + 5]);
    }
    return [ox, oy];
  }

  // The same point in wallpaper coordinates.
  function worldPoint(m, x, y) {
    const [ix, iy] = imagePoint(m, x, y);
    const s = m.h / m.rig.ih, lx = (ix - m.rig.iw / 2) * s, ly = (iy - m.rig.ih / 2) * s;
    const co = Math.cos(m.rotNow), si = Math.sin(m.rotNow);
    return [m.cx + lx * co - ly * si, m.cy + lx * si + ly * co];
  }

  function create(opts) {
    const rig = RIGS[opts.rig];
    rig.pw = rig.pw || {};
    const B = {};
    for (const b of rig.bones) B[b.name] = { a: 0, v: 0, goal: 0 };
    const springs = Object.assign({}, SPRINGS, opts.gun ? {} : LOOSE_GUN);
    const m = Object.assign({
      rig, B, springs, mats: new Float32Array(rig.bones.length * 6),
      cx: opts.x, cy: opts.y, vx: 0, vy: 0, ax: 0, ay: 0, rotNow: opts.rot || 0,
      offX: 0, offY: 0, manT: rand(2, 5), manMin: 5, manMax: 11,
      thrust: 0, flash: 0, ph: rand(0, 6),
      aimOff: 0, target: null, retarget: 0, barrelNow: rig.barrel || 0,
      cd: rand(1, 2), burst: 0, bt: 0, burstN: 3, burstGap: 0.11, cdMin: 1.3, cdMax: 2.4,
      lookGoal: 0, lookT: 1, tint: 0, rot: 0,
    }, opts, { rig });
    pose(m);
    return m;
  }

  function update(m, dt, t) {
    const B = m.B, h = m.h;

    // Flight: chase a drifting goal on a spring, with a sudden dodge now and then.
    m.manT -= dt;
    if (m.manT <= 0) {
      m.manT = rand(m.manMin, m.manMax);
      m.offX = rand(-1, 1) * h * 0.16;
      m.offY = rand(-1, 1) * h * 0.07;
    }
    const gx = m.x + m.offX + Math.sin(t * 0.31 + m.ph) * h * 0.03 + Math.sin(t * 0.17 + m.ph * 1.7) * h * 0.04;
    const gy = m.y + m.offY + Math.sin(t * 0.53 + m.ph) * h * 0.025 + Math.sin(t * 0.23 + m.ph * 0.6) * h * 0.02;
    const ax = 2.4 * (gx - m.cx) - 2.1 * m.vx, ay = 2.4 * (gy - m.cy) - 2.1 * m.vy;
    m.vx += ax * dt; m.vy += ay * dt;
    m.cx += m.vx * dt; m.cy += m.vy * dt;
    m.ax = ax; m.ay = ay;
    const axN = ax / h, ayN = ay / h;
    m.thrust += (clamp(Math.hypot(ax, ay) / (h * 0.25), 0, 1) - m.thrust) * Math.min(1, dt * 4);
    m.rotNow = m.rot + clamp((m.vx / h) * 0.5, -0.1, 0.1) + Math.sin(t * 0.4 + m.ph) * 0.012;
    m.flash = Math.max(0, m.flash - dt * 9);

    // Aiming: pick something in front of the cannon and turn the arm onto it.
    let tgtAng = null;
    if (m.gun) {
      m.retarget -= dt;
      const muz = worldPoint(m, m.rig.muzzle[0], m.rig.muzzle[1]);
      const restAng = m.rig.barrel + m.rotNow + B.pelvis.a + B.chest.a;
      if (m.retarget <= 0) {
        m.retarget = 0.35;
        m.target = m.world.findTarget(m, muz[0], muz[1], restAng, 0.42);
      }
      let want = Math.sin(t * 0.3 + m.ph) * 0.06;
      if (m.target) {
        const p = m.world.targetPos(m.target, muz[0], muz[1]);
        if (p) {
          tgtAng = Math.atan2(p[1] - muz[1], p[0] - muz[0]);
          want = clamp(angDiff(restAng, tgtAng), -0.42, 0.42);
        } else m.target = null;
      }
      m.aimOff = want;
      m.barrelNow = restAng + B.armR.a + B.foreR.a;
      m.cd -= dt;
      if (m.burst > 0) {
        m.bt -= dt;
        if (m.bt <= 0) {
          const p = worldPoint(m, m.rig.muzzle[0], m.rig.muzzle[1]);
          m.world.fire(m, p[0], p[1], m.barrelNow);
          // recoil: the cannon kicks up, the chest rocks, the body is pushed back
          B.foreR.v -= 2.6; B.armR.v -= 1.1; B.chest.v -= 0.35; B.head.v += 0.25;
          m.vx -= Math.cos(m.barrelNow) * h * 0.05; m.vy -= Math.sin(m.barrelNow) * h * 0.05;
          m.flash = 1;
          m.burst--; m.bt = m.burstGap;
        }
      } else if (m.cd <= 0 && tgtAng !== null && Math.abs(angDiff(m.barrelNow, tgtAng)) < 0.07) {
        m.burst = m.burstN; m.bt = 0; m.cd = rand(m.cdMin, m.cdMax);
      }
    }

    // Shoulder missile pod
    if (m.launcher) {
      m.cd -= dt;
      if (m.burst > 0) {
        m.bt -= dt;
        if (m.bt <= 0) {
          const p = worldPoint(m, m.rig.launcher[0], m.rig.launcher[1]);
          m.world.launch(m, p[0], p[1]);
          B.chest.v -= 0.18; B.armL.v += 0.3; m.thrust = Math.min(1, m.thrust + 0.15);
          m.burst--; m.bt = 0.07;
        }
      } else if (m.cd <= 0) { m.burst = 8; m.bt = 0; m.cd = rand(5, 8); }
    }

    // Head glances around, and follows the aim while fighting.
    m.lookT -= dt;
    if (m.lookT <= 0) { m.lookT = rand(1.5, 4); m.lookGoal = rand(-0.1, 0.1); }
    const s1 = Math.sin(t * 1.1 + m.ph), s2 = Math.sin(t * 0.9 + m.ph);
    const goals = {
      pelvis: clamp(axN * 0.03, -0.04, 0.04),
      chest: Math.sin(t * 1.3 + m.ph) * 0.012 + m.aimOff * 0.08 - m.thrust * 0.02,
      head: clamp(m.aimOff * 0.5 + m.lookGoal * (m.target ? 0.3 : 1), -0.18, 0.18),
      armL: 0.04 * s2 + axN * 0.15 - ayN * 0.05,
      foreL: 0.05 * Math.sin(t * 0.9 + m.ph - 0.6) + axN * 0.2,
      armR: m.gun ? m.aimOff * 0.45 : 0.03 * Math.sin(t * 0.8 + m.ph + 1) + axN * 0.1,
      foreR: m.gun ? m.aimOff * 0.55 : 0.03 * Math.sin(t * 0.8 + m.ph + 0.4) + axN * 0.12,
      thighL: 0.06 * s1 + axN * 0.25 - m.thrust * 0.05,
      shinL: 0.07 * Math.sin(t * 1.1 + m.ph - 0.8) + 0.03 + axN * 0.2 + m.thrust * 0.08,
      thighR: 0.06 * Math.sin(t * 1.1 + m.ph + 2.2) + axN * 0.25 - m.thrust * 0.04,
      shinR: 0.07 * Math.sin(t * 1.1 + m.ph + 1.4) + 0.02 + axN * 0.2 + m.thrust * 0.06,
    };

    // Joint springs (small steps keep the stiff ones stable)
    const steps = Math.max(1, Math.ceil(dt / 0.012)), h2 = dt / steps;
    for (const name in B) {
      const b = B[name], [k, z] = m.springs[name], c = 2 * Math.sqrt(k) * z, g = goals[name];
      for (let i = 0; i < steps; i++) {
        b.v += (k * (g - b.a) - c * b.v) * h2;
        b.a += b.v * h2;
      }
      b.a = clamp(b.a, -0.4, 0.4);
    }
    pose(m);
  }

  // ----- drawing -----
  const PAD = 0.12; // room around the picture for bent limbs

  function prepare(m, img, pxPerUnit) {
    const rig = m.rig, k = (m.h / rig.ih) * pxPerUnit;
    // the picture, tinted darker for mechs further away and lit by the sun
    const tex = document.createElement("canvas");
    tex.width = Math.ceil(rig.iw * k); tex.height = Math.ceil(rig.ih * k);
    const g = tex.getContext("2d");
    g.drawImage(img, 0, 0, tex.width, tex.height);
    g.globalCompositeOperation = "source-atop";
    if (m.tint) { g.fillStyle = `rgba(8,12,30,${m.tint})`; g.fillRect(0, 0, tex.width, tex.height); }
    const rim = g.createLinearGradient(0, 0, tex.width, tex.height * 0.4);
    rim.addColorStop(0, "rgba(155,107,255,0)"); rim.addColorStop(1, "rgba(175,150,255,0.13)");
    g.fillStyle = rim; g.fillRect(0, 0, tex.width, tex.height);
    m.tex = tex;

    if (!m.gl) m.gl = makeGL(rig);
    if (m.gl) {
      const G = m.gl;
      G.canvas.width = Math.ceil(rig.iw * (1 + 2 * PAD) * k);
      G.canvas.height = Math.ceil(rig.ih * (1 + 2 * PAD) * k);
      const gl = G.gl;
      gl.viewport(0, 0, G.canvas.width, G.canvas.height);
      gl.bindTexture(gl.TEXTURE_2D, G.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    }
  }

  function makeGL(rig) {
    const canvas = document.createElement("canvas");
    let gl = null;
    try {
      gl = canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });
    } catch (e) { gl = null; }
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER,
      "attribute vec2 p;attribute vec2 uv;uniform vec4 box;varying vec2 v;" +
      "void main(){v=uv;vec2 q=(p-box.xy)/box.zw*2.0-1.0;gl_Position=vec4(q.x,-q.y,0.0,1.0);}"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,
      "precision mediump float;uniform sampler2D tex;varying vec2 v;void main(){gl_FragColor=texture2D(tex,v);}"));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const mesh = buildMesh(rig);
    const pos = new Float32Array(mesh.n * 2);
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    const pLoc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(pLoc);
    gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uv, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(prog, "uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(prog, "tex"), 0);
    gl.uniform4f(gl.getUniformLocation(prog, "box"),
      -PAD * rig.iw, -PAD * rig.ih, rig.iw * (1 + 2 * PAD), rig.ih * (1 + 2 * PAD));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return { canvas, gl, posBuf, pos, mesh, tex };
  }

  // Draw the posed mech in picture-pixel coordinates (0,0 = picture's top-left).
  function drawBody(ctx, m) {
    const rig = m.rig, G = m.gl;
    if (!G || G.gl.isContextLost()) { if (m.tex) ctx.drawImage(m.tex, 0, 0, rig.iw, rig.ih); return; }
    const { gl, pos, mesh } = G, M = m.mats;
    for (let k = 0; k < mesh.n; k++) {
      const x = mesh.rest[k * 2], y = mesh.rest[k * 2 + 1];
      let ox = 0, oy = 0;
      for (let q = 0; q < 3; q++) {
        const w = mesh.bw[k * 3 + q];
        if (w < 1e-4) continue;
        const o = mesh.bi[k * 3 + q] * 6;
        ox += w * (M[o] * x + M[o + 2] * y + M[o + 4]);
        oy += w * (M[o + 1] * x + M[o + 3] * y + M[o + 5]);
      }
      pos[k * 2] = ox; pos[k * 2 + 1] = oy;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, G.posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
    ctx.drawImage(G.canvas, -PAD * rig.iw, -PAD * rig.ih, rig.iw * (1 + 2 * PAD), rig.ih * (1 + 2 * PAD));
  }

  window.MechRig = { RIGS, create, update, prepare, drawBody, imagePoint, worldPoint };
})();
