/* Ultima Warriors fleet battle: animated desktop wallpaper.

   Everything is laid out on a 5120 × 1440 stage that is scaled to fill the
   screen. Back to front: the planet and space artwork, a sun, distant battle
   flashes, stars, the capital ships (with shields, beam lances, turrets and
   missiles), the fighter dogfight, explosions, the Ultima Warriors mechs, and
   drifting space dust. The fight runs on its own: fighters pick targets, die
   and relaunch from their carriers, and the enemy cruiser is eventually
   destroyed and replaced by a new one jumping in. */
(() => {
  "use strict";

  const W = 5120, H = 1440, TAU = Math.PI * 2;
  const qs = new URLSearchParams(location.search);
  let fpsCap = +qs.get("fps") || 0; // 0 = as smooth as the screen allows
  let lowQ = qs.get("quality") === "low";
  let showHud = qs.get("hud") !== "0";

  const canvas = document.getElementById("battle");
  const ctx = canvas.getContext("2d", { alpha: false });

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const angDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };
  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function segDist2(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const u = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
    const x = ax + dx * u - px, y = ay + dy * u - py;
    return x * x + y * y;
  }

  // ---------- glow sprites (much cheaper than canvas blur) ----------
  const RGB = {
    cyan: "62,224,255", orange: "255,120,40", fire: "255,170,70",
    white: "255,236,215", violet: "155,107,255", red: "255,60,40",
  };
  function glowSprite(rgb) {
    const c = makeCanvas(128, 128), g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.15, `rgba(${rgb},0.95)`);
    gr.addColorStop(0.4, `rgba(${rgb},0.3)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return c;
  }
  const SPR = {};
  for (const k in RGB) SPR[k] = glowSprite(RGB[k]);
  SPR.smoke = (() => {
    const c = makeCanvas(64, 64), g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(96,88,110,0.9)"); gr.addColorStop(0.5, "rgba(60,54,72,0.45)"); gr.addColorStop(1, "rgba(40,36,50,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  })();
  function glow(s, x, y, r, a) { ctx.globalAlpha = a; ctx.drawImage(s, x - r, y - r, r * 2, r * 2); }

  // ---------- the two sides ----------
  const TEAMS = [
    { // Ultima Warriors
      laser: RGB.cyan, spr: SPR.cyan, hull: ["#7a88a6", "#323b52", "#0d111b"], stripe: "#3ee0ff",
      accent: "#ff8a3d", win: "rgba(150,235,255,0.9)", fFill: "#c3cee2", fShade: "#56627c", fEdge: "#3ee0ff",
    },
    { // Void Legion
      laser: RGB.orange, spr: SPR.orange, hull: ["#6e3a34", "#2c1618", "#0a0506"], stripe: "#ff5a1f",
      accent: "#ff2a2a", win: "rgba(255,130,70,0.9)", fFill: "#6a302a", fShade: "#2a1212", fEdge: "#ff6a2a",
    },
  ];

  // Capital ship outlines, facing right, in units of the ship's length.
  const SHAPES = {
    carrier: {
      poly: [[-0.5, -0.06], [-0.46, -0.1], [-0.22, -0.1], [-0.17, -0.17], [-0.05, -0.18], [-0.01, -0.1], [0.28, -0.09], [0.44, -0.05], [0.53, -0.015], [0.53, 0.01], [0.4, 0.05], [0.22, 0.09], [-0.12, 0.11], [-0.4, 0.1], [-0.5, 0.06]],
      engines: [[-0.5, -0.04, 0.022], [-0.5, 0, 0.026], [-0.5, 0.045, 0.022]],
      turrets: [[0.12, -0.09], [0.32, -0.08], [-0.32, -0.1], [-0.1, -0.18], [0.05, 0.1], [-0.3, 0.1]],
      lights: [[0.53, 0], [-0.11, -0.18], [-0.5, -0.06], [-0.5, 0.06]],
      hangar: [0.12, 0.015, 0.36, 0.05], hangarExit: [0.36, 0.035], launch: [-0.3, -0.1],
      stripeY: -0.035, shield: [0.62, 0.24], lance: [0.53, 0],
    },
    frigate: {
      poly: [[-0.5, -0.05], [-0.3, -0.11], [0, -0.11], [0.08, -0.15], [0.18, -0.15], [0.22, -0.08], [0.5, -0.02], [0.55, 0], [0.45, 0.04], [0.1, 0.08], [-0.3, 0.08], [-0.5, 0.05]],
      engines: [[-0.5, -0.025, 0.02], [-0.5, 0.025, 0.02]],
      turrets: [[0.15, -0.15], [-0.1, 0.08], [0.3, -0.05]],
      lights: [[0.55, 0], [0.13, -0.15]],
      stripeY: -0.02, shield: [0.62, 0.24], lance: [0.55, 0],
    },
    dread: {
      poly: [[-0.5, -0.07], [-0.38, -0.15], [-0.1, -0.14], [0.02, -0.21], [0.16, -0.21], [0.24, -0.13], [0.52, -0.11], [0.34, -0.055], [0.4, -0.02], [0.58, 0], [0.4, 0.025], [0.34, 0.06], [0.5, 0.12], [0.22, 0.15], [0.06, 0.12], [-0.36, 0.14], [-0.5, 0.07]],
      engines: [[-0.5, -0.045, 0.024], [-0.5, 0, 0.03], [-0.5, 0.045, 0.024]],
      turrets: [[0.08, -0.21], [0.3, -0.11], [-0.25, -0.15], [0.2, 0.14], [-0.2, 0.14], [0.45, 0.1]],
      vents: [[-0.3, -0.05, 0.18], [-0.3, 0.045, 0.18], [0.05, -0.015, 0.2]],
      lights: [[0.58, 0], [0.09, -0.21], [0.5, -0.11], [0.5, 0.12]],
      hangarExit: [0.3, 0.08], launch: [0.1, -0.15],
      stripeY: 0, shield: [0.64, 0.28], lance: [0.58, 0],
    },
    cruiser: {
      poly: [[-0.5, -0.06], [-0.3, -0.12], [0.1, -0.12], [0.2, -0.17], [0.3, -0.12], [0.52, -0.08], [0.36, -0.03], [0.56, 0], [0.36, 0.03], [0.5, 0.09], [0.2, 0.12], [-0.3, 0.11], [-0.5, 0.06]],
      engines: [[-0.5, -0.03, 0.022], [-0.5, 0.03, 0.022]],
      turrets: [[0.2, -0.17], [-0.1, -0.12], [0, 0.12], [0.35, 0.08]],
      vents: [[-0.25, -0.03, 0.2], [-0.25, 0.05, 0.16]],
      lights: [[0.56, 0], [0.2, -0.17]],
      stripeY: 0.005, shield: [0.64, 0.28], lance: [0.56, 0],
    },
  };

  // ---------- world state ----------
  let scale = 1, offX = 0, offY = 0, t = 0, shake = 0;
  const cam = { x: 0, y: 0 };
  const IMG = {};
  const fleets = [[], []];          // fighters per team
  const shots = [], missiles = [], parts = [], farFlashes = [], banners = [];
  const stats = { kills: 0, lost: 0, cruisers: 0 };
  let caps = [], capBy = {}, mechs = [], stars = [], dust = [], bgCanvas = null;

  function maxParts() { return lowQ ? 1400 : 3200; }
  function addP(p) { if (parts.length < maxParts()) parts.push(p); }

  // ---------- capital ships ----------
  function mkCap(o) {
    const c = Object.assign({
      S: SHAPES[o.shape], tilt: 0, hp: Infinity, maxHp: Infinity, state: "alive", timer: 0,
      flash: 0, hits: [], lance: null, salvo: 0, salvoT: 0, ph: rand(0, 6),
    }, o);
    c.bx = c.x; c.by = c.y; c.baseTilt = c.tilt;
    c.turretCd = c.S.turrets.map(() => rand(0.5, 2));
    c.lanceCd = rand(3, 7);
    c.salvoCd = rand(4, 9);
    const r = seeded(c.seed + 99);
    c.fires = Array.from({ length: 6 }, () => [r() * 0.8 - 0.4, r() * 0.16 - 0.08]);
    return c;
  }
  function capPoint(c, lx, ly) {
    const X = lx * c.len * c.dir, Y = ly * c.len, co = Math.cos(c.tilt), si = Math.sin(c.tilt);
    return [c.x + X * co - Y * si, c.y + X * si + Y * co];
  }
  function toLocal(c, x, y) {
    const dx = x - c.x, dy = y - c.y, co = Math.cos(c.tilt), si = Math.sin(c.tilt);
    return [dx * co + dy * si, -dx * si + dy * co];
  }
  function inShield(c, x, y) {
    if (c.state !== "alive") return false;
    const rx = c.S.shield[0] * c.len, ry = c.S.shield[1] * c.len;
    if (Math.abs(x - c.x) > rx + 10 || Math.abs(y - c.y) > rx) return false;
    const [lx, ly] = toLocal(c, x, y);
    return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
  }
  function shieldPoint(c, fx, fy) {
    const [lx, ly] = toLocal(c, fx, fy), a = Math.atan2(ly, lx);
    const rx = c.S.shield[0] * c.len, ry = c.S.shield[1] * c.len;
    const r = 1 / Math.sqrt((Math.cos(a) / rx) ** 2 + (Math.sin(a) / ry) ** 2);
    const X = Math.cos(a) * r, Y = Math.sin(a) * r, co = Math.cos(c.tilt), si = Math.sin(c.tilt);
    return [c.x + X * co - Y * si, c.y + X * si + Y * co];
  }
  function shieldHit(c, x, y, power) {
    const [lx, ly] = toLocal(c, x, y);
    c.hits.push({ lx, ly, t: 0, p: power });
    if (c.hits.length > 16) c.hits.shift();
    c.flash = Math.min(1, c.flash + 0.2 * power);
  }
  function damageCap(c, amt) {
    if (c.maxHp === Infinity || c.state !== "alive") return;
    c.hp -= amt;
    if (c.hp <= 0) { c.state = "dying"; c.timer = 0; c.boomT = 0; }
  }
  function capTarget(team) {
    const foes = caps.filter((c) => c.team !== team && c.state === "alive");
    if (!foes.length) return null;
    const cr = foes.find((c) => c.id === "cruiser");
    if (cr && Math.random() < 0.65) return cr;
    return foes[(Math.random() * foes.length) | 0];
  }

  // Paint a hull once (panels, windows, stripes, rim light) and reuse it.
  function renderHull(c) {
    const S = c.S, L = c.len, k = L * scale, bx = 0.62, by = 0.28, px = 1 / L;
    const cv = makeCanvas(2 * bx * k, 2 * by * k), g = cv.getContext("2d");
    g.setTransform(k, 0, 0, k, bx * k, by * k);
    const r = seeded(c.seed), T = TEAMS[c.team];
    const path = () => {
      g.beginPath();
      S.poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
    };
    g.fillStyle = "#0b0d14";
    for (const [ex, ey, er] of S.engines) g.fillRect(ex - 0.03, ey - er, 0.045, er * 2);
    g.save(); path(); g.clip();
    let gr = g.createLinearGradient(0, -0.2, 0, 0.18);
    gr.addColorStop(0, T.hull[0]); gr.addColorStop(0.45, T.hull[1]); gr.addColorStop(1, T.hull[2]);
    g.fillStyle = gr; g.fillRect(-bx, -by, 2 * bx, 2 * by);
    for (let i = 0; i < 46; i++) { // armour plates
      const x = -0.55 + r() * 1.1, w = 0.01 + r() * 0.08, y0 = -0.25 + r() * 0.2;
      g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.02 + r() * 0.05})` : `rgba(0,0,0,${0.08 + r() * 0.15})`;
      g.fillRect(x, y0, w, 0.1 + r() * 0.3);
    }
    g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 1.2 * px;
    for (let i = 0; i < 8; i++) { // decks
      const y = -0.17 + i * 0.042 + r() * 0.01;
      g.beginPath(); g.moveTo(-0.6, y); g.lineTo(0.6, y); g.stroke();
    }
    for (let i = 0; i < 70; i++) { // panel seams
      const x = -0.55 + r() * 1.1, y = -0.2 + r() * 0.35;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 0.02 + r() * 0.06); g.stroke();
    }
    for (let i = 0; i < 110; i++) { // machinery
      const x = -0.55 + r() * 1.1, y = -0.2 + r() * 0.4, w = (3 + r() * 16) * px, h = (2 + r() * 8) * px;
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(255,255,255,0.09)"; g.fillRect(x, y, w, h * 0.35);
    }
    g.fillStyle = T.stripe; g.globalAlpha = 0.85;
    g.fillRect(-0.45, S.stripeY, 0.9, 3 * px);
    g.globalAlpha = 1;
    if (c.team === 0) { // orange hazard chevrons, like the mechs' shoulders
      g.fillStyle = T.accent;
      for (let i = 0; i < 6; i++) {
        const x = 0.3 + i * 0.022;
        g.beginPath(); g.moveTo(x, -0.075); g.lineTo(x + 0.01, -0.075); g.lineTo(x + 0.02, -0.05); g.lineTo(x + 0.01, -0.05); g.fill();
      }
    }
    if (S.hangar) { // lit hangar mouth
      const [x0, y0, x1, y1] = S.hangar;
      g.fillStyle = "#05070c"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = "rgba(62,224,255,0.85)";
      for (let x = x0 + 0.01; x < x1; x += 0.02) g.fillRect(x, y1 - 2 * px, 6 * px, 1.5 * px);
      g.fillStyle = "rgba(62,224,255,0.25)"; g.fillRect(x0, y0, x1 - x0, (y1 - y0) * 0.5);
    }
    if (S.vents) { // glowing reactor vents
      g.shadowColor = "#ff4a1a"; g.shadowBlur = 12 * px * k;
      g.fillStyle = "rgba(255,90,30,0.95)";
      for (const [x, y, w] of S.vents) for (let i = 0; i < 6; i++) g.fillRect(x + i * w / 6, y, w / 9, 3 * px);
      g.shadowBlur = 0;
    }
    for (let row = 0; row < 10; row++) { // windows
      const y = -0.15 + row * 0.028 + r() * 0.008;
      let x = -0.5 + r() * 0.1;
      while (x < 0.5) {
        const run = 4 + ((r() * 14) | 0);
        for (let i = 0; i < run && x < 0.5; i++, x += 7 * px) {
          g.fillStyle = r() < 0.8 ? "rgba(255,236,200,0.85)" : T.win;
          if (r() < 0.8) g.fillRect(x, y, 2.5 * px, 1.6 * px);
        }
        x += (20 + r() * 80) * px;
      }
    }
    gr = g.createLinearGradient(0, 0, 0, 0.22);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.6)");
    g.fillStyle = gr; g.fillRect(-bx, 0, 2 * bx, by);
    g.restore();
    gr = g.createLinearGradient(0, -0.2, 0, 0.05);
    gr.addColorStop(0, "rgba(215,228,255,0.8)"); gr.addColorStop(1, "rgba(215,228,255,0)");
    path(); g.strokeStyle = gr; g.lineWidth = 2.4 * px; g.stroke();
    c.hull = cv;
  }

  function drawCapitalBody(c, alpha) {
    const S = c.S, L = c.len, T = TEAMS[c.team];
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.tilt); ctx.scale(c.dir, 1);
    if (c.state === "alive" || c.state === "dying" || c.state === "warp") {
      ctx.globalCompositeOperation = "lighter";
      for (const [ex, ey, er] of S.engines) {
        const f = 0.85 + 0.15 * Math.sin(t * 31 + ey * 90 + c.ph), X = (ex - 0.03) * L, Y = ey * L, pl = L * 0.2 * f;
        const gr = ctx.createLinearGradient(X, 0, X - pl, 0);
        gr.addColorStop(0, `rgba(${T.laser},0.75)`); gr.addColorStop(1, `rgba(${T.laser},0)`);
        ctx.globalAlpha = alpha; ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(X, Y - er * L); ctx.lineTo(X - pl, Y); ctx.lineTo(X, Y + er * L); ctx.fill();
        glow(T.spr, X, Y, er * L * 3.2 * f, 0.9 * alpha);
      }
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(c.hull, -0.62 * L, -0.28 * L, 1.24 * L, 0.56 * L);
    ctx.globalCompositeOperation = "lighter";
    S.lights.forEach(([lx, ly], i) => { // blinking navigation lights
      const on = (Math.sin(t * 2.2 + i * 1.7 + c.ph) + 1) / 2;
      glow(i % 2 ? SPR.red : SPR.white, lx * L, ly * L, 10 + on * 14, (0.3 + 0.7 * on) * alpha);
    });
    ctx.restore();
  }

  function drawShield(c) {
    if (c.state !== "alive") return;
    const rx = c.S.shield[0] * c.len, ry = c.S.shield[1] * c.len, T = TEAMS[c.team];
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.tilt);
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.globalAlpha = 0.04 + c.flash * 0.3;
    ctx.strokeStyle = `rgb(${T.laser})`; ctx.lineWidth = 3; ctx.stroke();
    if (c.hits.length) {
      ctx.clip(); // only the shield surface lights up
      for (const h of c.hits) {
        const k = 1 - h.t / 0.7;
        glow(T.spr, h.lx, h.ly, (140 + 240 * h.p) * (1.4 - 0.4 * k), 0.45 * k * Math.min(1, h.p + 0.3));
        glow(SPR.white, h.lx, h.ly, 22 + 40 * h.p, 0.7 * k);
      }
    }
    ctx.restore();
  }

  function drawCapital(c) {
    if (c.state === "gone") return;
    if (c.state === "warp") {
      const p = clamp(c.timer / 1.3, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const w = 40 * (1 - p) + 6;
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(255,150,90,${0.5 * (1 - p * 0.6)})`; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(W + 600, c.y - 60); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p)})`; ctx.lineWidth = w * 0.25; ctx.stroke();
      ctx.restore();
      for (let i = 3; i >= 1; i--) { // motion ghosts
        const gx = c.x; c.x += i * 120 * (1 - p);
        drawCapitalBody(c, 0.18 * (1 - p));
        c.x = gx;
      }
      drawCapitalBody(c, 0.4 + 0.6 * p);
      return;
    }
    if (c.state === "wreck") {
      const fade = clamp(1 - (c.timer - 6) / 4, 0, 1);
      for (const ch of c.chunks) {
        ctx.save();
        ctx.translate(c.x + ch.ox, c.y + ch.oy); ctx.rotate(c.tilt + ch.rot); ctx.scale(c.dir, 1);
        ctx.beginPath();
        ctx.rect(ch.side < 0 ? -0.62 * c.len : 0.05 * c.len, -0.28 * c.len, ch.side < 0 ? 0.67 * c.len : 0.57 * c.len, 0.56 * c.len);
        ctx.clip();
        ctx.globalAlpha = fade * 0.85;
        ctx.drawImage(c.hull, -0.62 * c.len, -0.28 * c.len, 1.24 * c.len, 0.56 * c.len);
        ctx.globalCompositeOperation = "lighter"; // white-hot broken edge
        for (let i = 0; i < 5; i++) glow(SPR.fire, 0.05 * c.len, (-0.1 + i * 0.05) * c.len, 34, 0.5 * fade * (0.6 + 0.4 * Math.sin(t * 9 + i)));
        ctx.restore();
      }
      return;
    }
    drawCapitalBody(c, 1);
  }

  function updateCapital(c, dt) {
    c.x = c.bx + Math.sin(t * 0.1 + c.ph) * 14;
    c.y = c.by + Math.sin(t * 0.13 + c.ph) * 9;
    c.flash = Math.max(0, c.flash - dt * 2.2);
    for (const h of c.hits) h.t += dt;
    while (c.hits.length && c.hits[0].t > 0.7) c.hits.shift();

    if (c.state === "dying") {
      c.timer += dt; c.boomT -= dt;
      c.tilt += dt * 0.025 * c.dir; c.by += dt * 14;
      if (c.boomT <= 0) {
        c.boomT = rand(0.1, 0.22);
        const [x, y] = capPoint(c, rand(-0.45, 0.45), rand(-0.1, 0.1));
        explode(x, y, rand(30, 85));
      }
      if (c.timer > 3.4) {
        explode(c.x, c.y, 300);
        for (let i = 0; i < 6; i++) { const [x, y] = capPoint(c, rand(-0.4, 0.4), rand(-0.1, 0.1)); explode(x, y, rand(80, 140)); }
        addP({ type: "ring", x: c.x, y: c.y, r0: 60, r1: 1500, life: 1.4, max: 1.4, rgb: "255,190,140", w: 14 });
        c.state = "wreck"; c.timer = 0;
        c.chunks = [
          { side: -1, ox: 0, oy: 0, vx: -45 * c.dir, vy: 8, rot: 0, vr: -0.06 * c.dir },
          { side: 1, ox: 0, oy: 0, vx: 60 * c.dir, vy: 22, rot: 0, vr: 0.08 * c.dir },
        ];
        stats.cruisers++; stats.kills += 1;
        banners.push({ text: "ENEMY CRUISER DESTROYED", x: c.x, y: c.y - c.len * 0.3, t: 0 });
      }
      return;
    }
    if (c.state === "wreck") {
      c.timer += dt;
      for (const ch of c.chunks) { ch.ox += ch.vx * dt; ch.oy += ch.vy * dt; ch.rot += ch.vr * dt; }
      if (Math.random() < dt * 8) {
        const ch = c.chunks[(Math.random() * 2) | 0];
        addP({ type: "ember", x: c.x + ch.ox + rand(-30, 30), y: c.y + ch.oy + rand(-50, 50), vx: rand(-40, 40), vy: rand(-40, 40), life: 1, max: 1, r: rand(4, 9) });
      }
      if (c.timer > 10) { c.state = "gone"; c.timer = 0; }
      return;
    }
    if (c.state === "gone") {
      c.timer += dt;
      if (c.timer > 6) { // a replacement jumps in from the right
        c.state = "warp"; c.timer = 0; c.by = c.y0; c.tilt = c.baseTilt; c.hp = c.maxHp;
      }
      return;
    }
    if (c.state === "warp") {
      c.timer += dt;
      const p = clamp(c.timer / 1.3, 0, 1), e = 1 - Math.pow(1 - p, 4);
      c.x = c.bx + (1 - e) * 2800;
      if (p >= 1) {
        c.state = "alive"; c.flash = 1;
        addP({ type: "flash", x: c.x, y: c.y, r0: 200, r1: 900, life: 0.6, max: 0.6, spr: SPR.white });
        addP({ type: "ring", x: c.x, y: c.y, r0: 80, r1: 900, life: 0.9, max: 0.9, rgb: "255,200,170", w: 8 });
      }
      return;
    }

    // alive: damage smoke on a hurt cruiser
    if (c.maxHp !== Infinity && c.hp < c.maxHp * 0.6) {
      const n = c.hp < c.maxHp * 0.3 ? 4 : 2;
      for (let i = 0; i < n; i++) {
        if (Math.random() > dt * 10) continue;
        const [x, y] = capPoint(c, c.fires[i][0], c.fires[i][1]);
        addP({ type: "smoke", x, y, vx: rand(-20, 20), vy: rand(-40, -10), r0: 14, r1: 60, life: 2, max: 2 });
        addP({ type: "ember", x, y, vx: rand(-60, 60), vy: rand(-60, 20), life: 0.6, max: 0.6, r: rand(4, 8) });
      }
    }

    // turrets: point-defence fire at nearby enemy fighters
    const foes = fleets[1 - c.team];
    c.S.turrets.forEach((tp, i) => {
      c.turretCd[i] -= dt;
      if (c.turretCd[i] > 0) return;
      c.turretCd[i] = rand(0.3, 0.9);
      const [x, y] = capPoint(c, tp[0], tp[1]);
      let best = null, bd = 1500 * 1500;
      for (const f of foes) {
        if (!f.alive) continue;
        const d = (f.x - x) ** 2 + (f.y - y) ** 2;
        if (d < bd) { bd = d; best = f; }
      }
      if (!best) return;
      const lead = Math.sqrt(bd) / 1700;
      const a = Math.atan2(best.y + Math.sin(best.a) * best.v * lead - y, best.x + Math.cos(best.a) * best.v * lead - x) + rand(-0.05, 0.05);
      shots.push({ x, y, px: x, py: y, vx: Math.cos(a) * 1700, vy: Math.sin(a) * 1700, life: 1, team: c.team, kind: "flak", dmg: 1, r: 4 });
      addP({ type: "flash", x, y, r0: 8, r1: 22, life: 0.08, max: 0.08, spr: TEAMS[c.team].spr });
    });

    // beam lance at an enemy capital ship
    if (!c.lance) {
      c.lanceCd -= dt;
      if (c.lanceCd <= 0) {
        const tg = capTarget(c.team);
        if (tg) c.lance = { tg, t: 0, hitT: 0 };
        c.lanceCd = rand(c.lanceMin, c.lanceMax);
      }
    } else {
      const Ln = c.lance, CH = 0.9, DUR = 1.5;
      Ln.t += dt;
      if (Ln.t > CH + DUR || (Ln.t > CH && Ln.tg.state !== "alive")) c.lance = null;
      else if (Ln.t > CH) {
        const [sx, sy] = capPoint(c, c.S.lance[0], c.S.lance[1]);
        const [ex, ey] = shieldPoint(Ln.tg, sx, sy);
        Ln.ex = ex; Ln.ey = ey;
        damageCap(Ln.tg, 30 * dt);
        Ln.hitT -= dt;
        if (Ln.hitT <= 0) {
          Ln.hitT = 0.06;
          shieldHit(Ln.tg, ex, ey, 1.2);
          for (let i = 0; i < 4; i++) {
            const a = rand(0, TAU), s = rand(200, 700);
            addP({ type: "spark", x: ex, y: ey, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), max: 0.7, rgb: "255,230,200", w: 2 });
          }
          shake = Math.min(6, shake + 0.25);
        }
      }
    }

    // missile salvos (carrier) and torpedoes (dreadnought)
    if (c.S.launch) {
      c.salvoCd -= dt;
      if (c.salvoCd <= 0 && !c.salvo) {
        c.salvo = c.team ? 4 : 6; c.salvoT = 0; c.salvoCd = rand(11, 16);
        c.salvoTarget = capTarget(c.team);
      }
      if (c.salvo && c.salvoTarget) {
        c.salvoT -= dt;
        if (c.salvoT <= 0) {
          c.salvo--; c.salvoT = c.team ? 0.35 : 0.15;
          const [x, y] = capPoint(c, c.S.launch[0], c.S.launch[1]);
          if (c.team === 0) {
            missiles.push({ kind: "heavy", team: 0, x, y, a: -Math.PI / 2 + rand(-0.35, 0.35), spd: 220, max: 950, acc: 650, turn: 1.7, boost: 0.55, tc: c.salvoTarget, ox: rand(-120, 120), oy: rand(-60, 60), dmg: 18, life: 9, age: 0, trail: [], trT: 0, smT: 0 });
          } else {
            missiles.push({ kind: "torp", team: 1, x, y, a: Math.PI + rand(-0.4, 0.4), spd: 450, max: 720, acc: 300, turn: 0.9, boost: 0.3, tc: c.salvoTarget, ox: rand(-120, 120), oy: rand(-60, 60), dmg: 15, life: 9, age: 0, trail: [], trT: 0, smT: 0 });
          }
          addP({ type: "flash", x, y, r0: 14, r1: 50, life: 0.15, max: 0.15, spr: SPR.fire });
        }
      } else c.salvo = 0;
    }
  }

  function drawLance(c) {
    const Ln = c.lance;
    if (!Ln || c.state !== "alive") return;
    const T = TEAMS[c.team], CH = 0.9, DUR = 1.5;
    const [sx, sy] = capPoint(c, c.S.lance[0], c.S.lance[1]);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (Ln.t < CH) { // charging up
      const k = Ln.t / CH;
      glow(T.spr, sx, sy, 20 + 90 * k * (0.85 + 0.15 * Math.sin(t * 50)), 0.4 + 0.6 * k);
      glow(SPR.white, sx, sy, 10 + 25 * k, k);
    } else if (Ln.ex !== undefined) {
      const fade = Math.min(1, (Ln.t - CH) / 0.08) * Math.min(1, (CH + DUR - Ln.t) / 0.25);
      const wob = 1 + 0.15 * Math.sin(t * 60);
      ctx.lineCap = "round";
      const beam = (style, w) => {
        ctx.strokeStyle = style; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(Ln.ex, Ln.ey); ctx.stroke();
      };
      ctx.globalAlpha = 1;
      beam(`rgba(${T.laser},${0.16 * fade})`, 48 * wob);
      beam(`rgba(${T.laser},${0.55 * fade})`, 18 * wob);
      beam(`rgba(255,255,255,${0.9 * fade})`, 5);
      glow(T.spr, sx, sy, 90 * wob, fade);
      glow(T.spr, Ln.ex, Ln.ey, 170 * wob, 0.8 * fade);
      glow(SPR.white, Ln.ex, Ln.ey, 55, fade);
    }
    ctx.restore();
  }

  // ---------- fighters ----------
  const FS = 17;
  const FIGHTER_POLY = [
    [[1.2, 0], [-0.6, -0.72], [-0.3, -0.15], [-0.85, -0.22], [-0.85, 0.22], [-0.3, 0.15], [-0.6, 0.72]],
    [[1.1, -0.2], [0.3, -0.25], [-0.2, -0.82], [-0.75, -0.6], [-0.5, 0], [-0.75, 0.6], [-0.2, 0.82], [0.3, 0.25], [1.1, 0.2], [0.55, 0]],
  ];

  function newFighter(team) {
    const f = {
      team, alive: true, hp: 0, x: 0, y: 0, a: 0, v: 600, vmax: (team ? 600 : 650) * rand(0.9, 1.1),
      turn: rand(1.9, 2.6), target: null, mode: "attack", modeT: rand(3, 7), cd: rand(0, 1), burst: 0,
      wx: 0, wy: 0, cap: null, trail: [], trT: 0, respawn: 0,
    };
    f.hp = team ? 3 : 4;
    f.x = team ? rand(2300, 4700) : rand(400, 2900);
    f.y = rand(150, 1250);
    f.a = (team ? Math.PI : 0) + rand(-0.8, 0.8);
    return f;
  }
  function launchFighter(f) {
    const c = f.team ? capBy.dread : capBy.carrier;
    const [x, y] = capPoint(c, c.S.hangarExit[0], c.S.hangarExit[1]);
    Object.assign(f, {
      x, y, a: (f.team ? Math.PI : 0) + rand(-0.35, 0.35), alive: true, hp: f.team ? 3 : 4,
      mode: "break", modeT: rand(0.8, 1.5), target: null, cap: null,
    });
    f.v = f.vmax * 1.3; f.trail.length = 0;
    f.wx = f.x + Math.cos(f.a) * 900; f.wy = clamp(f.y + Math.sin(f.a) * 900 + rand(-250, 250), 150, H - 200);
  }
  function pickTarget(x, y, foes) {
    let best = null, bd = Infinity;
    for (let i = 0; i < 5; i++) {
      const f = foes[(Math.random() * foes.length) | 0];
      if (!f || !f.alive) continue;
      const d = (f.x - x) ** 2 + (f.y - y) ** 2;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  function setBreak(f) {
    f.mode = "break"; f.modeT = rand(1.2, 2.6); f.target = null; f.cap = null;
    const a = f.a + rand(-1.2, 1.2), d = rand(600, 1200);
    f.wx = clamp(f.x + Math.cos(a) * d, 300, W - 300);
    f.wy = clamp(f.y + Math.sin(a) * d, 140, H - 220);
  }

  function updateFighter(f, dt) {
    if (!f.alive) { f.respawn -= dt; if (f.respawn <= 0) launchFighter(f); return; }
    const foes = fleets[1 - f.team];
    f.modeT -= dt;
    if (f.mode === "attack") {
      if (!f.target || !f.target.alive) f.target = pickTarget(f.x, f.y, foes);
      if (f.modeT <= 0 || !f.target) setBreak(f);
    } else if (f.mode === "strafe") {
      if (!f.cap || f.cap.state !== "alive" || f.modeT <= 0) setBreak(f);
    } else if (f.modeT <= 0) {
      const c = Math.random() < 0.2 ? capTarget(f.team) : null;
      if (c) { f.mode = "strafe"; f.cap = c; f.modeT = rand(3, 5); }
      else { f.mode = "attack"; f.modeT = rand(4, 8); f.target = pickTarget(f.x, f.y, foes); }
    }

    let tx, ty;
    if (f.mode === "attack" && f.target) {
      const g = f.target, lead = Math.hypot(g.x - f.x, g.y - f.y) / 2300;
      tx = g.x + Math.cos(g.a) * g.v * lead; ty = g.y + Math.sin(g.a) * g.v * lead;
    } else if (f.mode === "strafe") {
      [tx, ty] = shieldPoint(f.cap, f.x, f.y);
      if (Math.hypot(tx - f.x, ty - f.y) < 260) { setBreak(f); tx = f.wx; ty = f.wy; }
    } else {
      tx = f.wx; ty = f.wy;
      if (Math.hypot(tx - f.x, ty - f.y) < 150) setBreak(f);
    }
    const M = 140;
    if (f.x < M) tx = f.x + 700; else if (f.x > W - M) tx = f.x - 700;
    if (f.y < M) ty = f.y + 500; else if (f.y > H - M - 60) ty = f.y - 500;

    const want = Math.atan2(ty - f.y, tx - f.x), da = angDiff(f.a, want), mt = f.turn * dt;
    f.a += clamp(da, -mt, mt);
    f.v += (f.vmax - f.v) * Math.min(1, dt * 1.5);
    f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt;

    f.cd -= dt;
    if (f.cd <= 0) {
      let ok = false;
      if (f.mode === "attack" && f.target) ok = Math.hypot(f.target.x - f.x, f.target.y - f.y) < 1000 && Math.abs(da) < 0.12;
      else if (f.mode === "strafe") ok = Math.hypot(tx - f.x, ty - f.y) < 1300 && Math.abs(da) < 0.15;
      if (ok) {
        const nx = f.x + Math.cos(f.a) * FS, ny = f.y + Math.sin(f.a) * FS;
        shots.push({ x: nx, y: ny, px: nx, py: ny, vx: Math.cos(f.a) * 2300, vy: Math.sin(f.a) * 2300, life: 0.55, team: f.team, kind: "laser", dmg: 1, r: 3 });
        addP({ type: "flash", x: nx, y: ny, r0: 6, r1: 16, life: 0.06, max: 0.06, spr: TEAMS[f.team].spr });
        f.burst++;
        f.cd = f.burst % 3 ? 0.08 : rand(0.35, 0.8);
      }
    }
    f.trT -= dt;
    if (f.trT <= 0) { f.trT = 0.03; f.trail.push(f.x, f.y); if (f.trail.length > 24) f.trail.splice(0, 2); }
  }

  function hitFighter(f, dmg) {
    f.hp -= dmg;
    addP({ type: "flash", x: f.x, y: f.y, r0: 6, r1: 20, life: 0.1, max: 0.1, spr: SPR.white });
    if (f.hp > 0) return;
    f.alive = false; f.respawn = rand(2.5, 5.5);
    explode(f.x, f.y, rand(24, 34));
    if (f.team) stats.kills++; else stats.lost++;
  }

  function drawFighters() {
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1;
    for (let team = 0; team < 2; team++) { // engine trails
      const T = TEAMS[team], list = fleets[team];
      ctx.strokeStyle = `rgba(${T.laser},0.14)`; ctx.lineWidth = 4;
      ctx.beginPath();
      for (const f of list) {
        if (!f.alive || f.trail.length < 4) continue;
        const tr = f.trail;
        ctx.moveTo(tr[0], tr[1]);
        for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]);
        ctx.lineTo(f.x, f.y);
      }
      ctx.stroke();
      ctx.strokeStyle = `rgba(${T.laser},0.38)`; ctx.lineWidth = 2;
      ctx.beginPath();
      for (const f of list) {
        const tr = f.trail, n = tr.length;
        if (!f.alive || n < 6) continue;
        ctx.moveTo(tr[n - 6], tr[n - 5]); ctx.lineTo(tr[n - 4], tr[n - 3]); ctx.lineTo(tr[n - 2], tr[n - 1]); ctx.lineTo(f.x, f.y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    for (let team = 0; team < 2; team++) {
      const T = TEAMS[team], poly = FIGHTER_POLY[team];
      for (const f of fleets[team]) {
        if (!f.alive) continue;
        ctx.save();
        ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.scale(FS, FS);
        ctx.beginPath();
        poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = T.fFill; ctx.fill();
        ctx.fillStyle = T.fShade; // shaded underside
        ctx.beginPath(); ctx.moveTo(poly[0][0], 0);
        for (const [x, y] of poly) if (y >= 0) ctx.lineTo(x, y);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = T.fEdge; ctx.lineWidth = 0.1; ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = "lighter";
    for (let team = 0; team < 2; team++) {
      for (const f of fleets[team]) {
        if (!f.alive) continue;
        glow(TEAMS[team].spr, f.x - Math.cos(f.a) * FS * 0.9, f.y - Math.sin(f.a) * FS * 0.9, 15 + Math.random() * 3, 0.95);
      }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  // ---------- shots ----------
  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];
      p.px = p.x; p.py = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      let dead = p.life <= 0 || p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 200;
      if (!dead) {
        const rr = (p.r + 15) ** 2;
        for (const f of fleets[1 - p.team]) {
          if (f.alive && segDist2(f.x, f.y, p.px, p.py, p.x, p.y) < rr) {
            hitFighter(f, p.dmg);
            if (p.kind === "plasma") explode(p.x, p.y, 22);
            dead = true; break;
          }
        }
      }
      if (!dead) {
        for (const c of caps) {
          if (c.team !== p.team && inShield(c, p.x, p.y)) {
            shieldHit(c, p.x, p.y, p.kind === "plasma" ? 0.9 : 0.35);
            damageCap(c, p.dmg);
            addP({ type: "flash", x: p.x, y: p.y, r0: 10, r1: p.kind === "plasma" ? 70 : 26, life: 0.15, max: 0.15, spr: TEAMS[p.team].spr });
            dead = true; break;
          }
        }
      }
      if (dead) { shots[i] = shots[shots.length - 1]; shots.pop(); }
    }
  }
  function drawShots() {
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.globalAlpha = 1;
    for (let team = 0; team < 2; team++) {
      const T = TEAMS[team];
      ctx.beginPath();
      for (const p of shots) {
        if (p.team !== team || p.kind === "plasma") continue;
        const k = p.kind === "flak" ? 0.012 : 0.02;
        ctx.moveTo(p.x - p.vx * k, p.y - p.vy * k); ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(${T.laser},0.85)`; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.4; ctx.stroke();
    }
    for (const p of shots) {
      if (p.kind !== "plasma") continue;
      ctx.strokeStyle = `rgba(${RGB.cyan},0.5)`; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.lineTo(p.x, p.y); ctx.stroke();
      glow(SPR.cyan, p.x, p.y, 36, 0.9);
      glow(SPR.white, p.x, p.y, 13, 1);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // ---------- missiles ----------
  function updateMissiles(dt) {
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      m.age += dt; m.life -= dt;
      let tx, ty;
      if (m.kind === "micro") {
        if (!m.tf || !m.tf.alive) m.tf = pickTarget(m.x, m.y, fleets[1 - m.team]);
        if (m.tf) { tx = m.tf.x; ty = m.tf.y; }
      } else {
        if (!m.tc || m.tc.state !== "alive") m.tc = capTarget(m.team);
        if (m.tc) { tx = m.tc.x + m.ox; ty = m.tc.y + m.oy; }
      }
      if (m.age > m.boost && tx !== undefined) {
        const da = angDiff(m.a, Math.atan2(ty - m.y, tx - m.x)), mt = m.turn * dt;
        m.a += clamp(da, -mt, mt);
      }
      m.spd = Math.min(m.max, m.spd + m.acc * dt);
      m.x += Math.cos(m.a) * m.spd * dt; m.y += Math.sin(m.a) * m.spd * dt;
      m.trT -= dt;
      if (m.trT <= 0) { m.trT = 0.025; m.trail.push(m.x, m.y); if (m.trail.length > 48) m.trail.splice(0, 2); }
      if (m.kind === "heavy") {
        m.smT -= dt;
        if (m.smT <= 0) { m.smT = 0.06; addP({ type: "smoke", x: m.x, y: m.y, vx: rand(-10, 10), vy: rand(-10, 10), r0: 6, r1: 26, life: 1.4, max: 1.4 }); }
      }
      let done = m.life <= 0;
      if (!done && m.kind === "micro" && m.tf && Math.hypot(m.tf.x - m.x, m.tf.y - m.y) < 28) {
        hitFighter(m.tf, 4); explode(m.x, m.y, 26); done = true;
      } else if (!done && m.tc && inShield(m.tc, m.x, m.y)) {
        shieldHit(m.tc, m.x, m.y, 1.5); damageCap(m.tc, m.dmg); explode(m.x, m.y, 55, true); done = true;
      } else if (m.life <= 0) explode(m.x, m.y, 18);
      if (done) { missiles[i] = missiles[missiles.length - 1]; missiles.pop(); }
    }
  }
  function drawMissiles() {
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const m of missiles) {
      const rgb = m.team ? RGB.red : m.kind === "micro" ? RGB.cyan : RGB.fire;
      const tr = m.trail;
      if (tr.length >= 4) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(${rgb},${m.kind === "torp" ? 0.3 : 0.18})`; ctx.lineWidth = m.kind === "torp" ? 10 : 3;
        ctx.beginPath(); ctx.moveTo(tr[0], tr[1]);
        for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]);
        ctx.lineTo(m.x, m.y); ctx.stroke();
      }
      if (m.kind === "torp") {
        const pulse = 0.85 + 0.15 * Math.sin(t * 25 + m.ox);
        glow(SPR.red, m.x, m.y, 30 * pulse, 1); glow(SPR.white, m.x, m.y, 9, 1);
      } else {
        glow(m.kind === "micro" ? SPR.cyan : SPR.fire, m.x, m.y, m.kind === "micro" ? 11 : 18, 1);
        glow(SPR.white, m.x, m.y, 5, 1);
      }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  // ---------- explosions & particles ----------
  function explode(x, y, size, onShield) {
    const q = lowQ ? 0.5 : 1;
    addP({ type: "flash", x, y, r0: size * 0.4, r1: size * 2.4, life: 0.5, max: 0.5, spr: SPR.fire });
    addP({ type: "flash", x, y, r0: size * 0.5, r1: size, life: 0.18, max: 0.18, spr: SPR.white });
    if (size >= 40) addP({ type: "ring", x, y, r0: size * 0.3, r1: size * 3.2, life: 0.7, max: 0.7, rgb: "255,210,160", w: 6 });
    const ns = Math.min(70, size * 0.9 * q) | 0;
    for (let i = 0; i < ns; i++) {
      const a = rand(0, TAU), s = Math.min(1700, rand(0.3, 1) * size * 14);
      addP({ type: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.9), max: 0.9, rgb: Math.random() < 0.5 ? "255,200,120" : "255,140,60", w: rand(1.5, 3) });
    }
    if (!onShield) {
      for (let i = 0, n = Math.min(18, size * 0.2 * q); i < n; i++) {
        addP({ type: "smoke", x: x + rand(-1, 1) * size * 0.3, y: y + rand(-1, 1) * size * 0.3, vx: rand(-30, 30), vy: rand(-30, 30), r0: size * 0.3, r1: size * rand(0.9, 1.6), life: rand(1.2, 2.6), max: 2.6 });
      }
      for (let i = 0, n = Math.min(14, size * 0.15 * q); i < n; i++) {
        const a = rand(0, TAU), s = rand(60, 400) * Math.min(3, size / 40);
        addP({ type: "debris", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: rand(0, TAU), vr: rand(-8, 8), s: rand(2, 6) * Math.min(3, size / 40), life: rand(1, 2.5), max: 2.5 });
      }
    }
    for (let i = 0, n = Math.min(30, size * 0.4 * q); i < n; i++) {
      const a = rand(0, TAU), s = size * rand(2, 8);
      addP({ type: "ember", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.5, 1.4), max: 1.4, r: rand(3, 8) });
    }
    shake = Math.min(12, shake + size / 70);
  }

  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      if (p.vx !== undefined) {
        const drag = p.type === "smoke" ? 0.6 : 1.8;
        p.vx *= 1 - Math.min(1, dt * drag); p.vy *= 1 - Math.min(1, dt * drag);
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      if (p.type === "debris") p.rot += p.vr * dt;
    }
  }
  function drawParts() {
    ctx.globalCompositeOperation = "source-over";
    for (const p of parts) {
      const k = p.life / p.max;
      if (p.type === "smoke") {
        const r = p.r0 + (p.r1 - p.r0) * (1 - k);
        ctx.globalAlpha = 0.55 * k; ctx.drawImage(SPR.smoke, p.x - r, p.y - r, r * 2, r * 2);
      } else if (p.type === "debris") {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = "#2b2c34"; ctx.fillRect(-p.s, -p.s * 0.6, p.s * 2, p.s * 1.2);
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      const k = p.life / p.max;
      switch (p.type) {
        case "flash": glow(p.spr, p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - k), k); break;
        case "ember": glow(SPR.fire, p.x, p.y, p.r * (0.5 + k * 0.5), k); break;
        case "debris": if (k > 0.5) glow(SPR.fire, p.x, p.y, p.s * 2.5, (k - 0.5) * 1.6); break;
        case "ring": {
          ctx.globalAlpha = 0.65 * k; ctx.strokeStyle = `rgb(${p.rgb})`; ctx.lineWidth = p.w * k + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - k * k), 0, TAU); ctx.stroke();
          break;
        }
        case "spark": {
          ctx.globalAlpha = k; ctx.strokeStyle = `rgb(${p.rgb})`; ctx.lineWidth = p.w;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
          break;
        }
      }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  // ---------- mechs ----------
  const Rig = window.MechRig;
  const mechWorld = {
    // something to shoot that is roughly in front of the cannon
    findTarget(m, x, y, ang, cone) {
      let best = null, bd = 2400;
      for (const f of fleets[1]) {
        if (!f.alive) continue;
        const d = Math.hypot(f.x - x, f.y - y);
        if (d < bd && Math.abs(angDiff(ang, Math.atan2(f.y - y, f.x - x))) < cone) { bd = d; best = f; }
      }
      if (best) return best;
      for (const c of caps) {
        if (c.team === 1 && c.state === "alive" && Math.abs(angDiff(ang, Math.atan2(c.y - y, c.x - x))) < cone) return c;
      }
      return null;
    },
    targetPos(o, x, y) {
      if (o.len) return o.state === "alive" ? [o.x, o.y] : null;
      if (!o.alive) return null;
      const lead = Math.hypot(o.x - x, o.y - y) / 2600;
      return [o.x + Math.cos(o.a) * o.v * lead, o.y + Math.sin(o.a) * o.v * lead];
    },
    fire(m, x, y, a) {
      const s = m.small ? 0.6 : 1;
      shots.push({ x, y, px: x, py: y, vx: Math.cos(a) * 2600, vy: Math.sin(a) * 2600, life: 1.4, team: 0, kind: "plasma", dmg: 5, r: 10 });
      addP({ type: "flash", x, y, r0: 30 * s, r1: 110 * s, life: 0.12, max: 0.12, spr: SPR.cyan });
      addP({ type: "flash", x, y, r0: 20 * s, r1: 45 * s, life: 0.08, max: 0.08, spr: SPR.white });
      for (let i = 0; i < 6; i++) {
        const b = a + rand(-0.35, 0.35), v = rand(400, 1100);
        addP({ type: "spark", x, y, vx: Math.cos(b) * v, vy: Math.sin(b) * v, life: rand(0.15, 0.35), max: 0.35, rgb: "180,245,255", w: 2 });
      }
      shake = Math.min(12, shake + (m.small ? 0.3 : 1.2));
    },
    launch(m, x, y) {
      missiles.push({ kind: "micro", team: 0, x, y, a: -Math.PI / 2 + rand(-0.7, 0.7), spd: 380, max: 1400, acc: 2400, turn: 4.5, boost: 0.28, tf: null, dmg: 4, life: 5, age: 0, trail: [], trT: 0, smT: 0, ox: 0, oy: 0 });
      addP({ type: "flash", x, y, r0: 10, r1: 34, life: 0.1, max: 0.1, spr: SPR.cyan });
    },
  };

  function drawMech(m) {
    const rig = m.rig, s = m.h / rig.ih;
    ctx.save();
    ctx.translate(m.cx, m.cy); ctx.rotate(m.rotNow); ctx.scale(s, s); ctx.translate(-rig.iw / 2, -rig.ih / 2);
    // thrusters behind the body; they flare when it accelerates
    ctx.globalCompositeOperation = "lighter";
    for (const [px, py] of rig.thrusters) {
      const [x, y] = Rig.imagePoint(m, px, py);
      const f = (0.75 + 0.25 * Math.sin(t * 40 + px)) * (0.8 + m.thrust * 0.7);
      glow(SPR.cyan, x, y, rig.ih * 0.1 * f, 0.65);
      glow(SPR.white, x, y, rig.ih * 0.035 * f, 0.55);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    Rig.drawBody(ctx, m);
    ctx.globalCompositeOperation = "lighter";
    const beat = 0.75 + 0.25 * Math.sin(t * 2.4 + m.ph);
    const [cx, cy] = Rig.imagePoint(m, rig.core[0], rig.core[1]);
    glow(SPR.cyan, cx, cy, rig.ih * 0.06 * beat, 0.6 + m.flash * 0.4);
    const [ex, ey] = Rig.imagePoint(m, rig.eyes[0], rig.eyes[1]);
    glow(SPR.cyan, ex, ey, rig.ih * 0.035, 0.45 + 0.2 * Math.sin(t * 3.1 + m.ph));
    if (m.flash > 0 && rig.muzzle) { // muzzle flash lights up the gun
      const [mx, my] = Rig.imagePoint(m, rig.muzzle[0], rig.muzzle[1]);
      glow(SPR.cyan, mx, my, rig.ih * 0.22, 0.5 * m.flash);
    }
    ctx.restore();
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function updateMech(m, dt) {
    Rig.update(m, dt, t);
    m.exT -= dt; // exhaust particles drifting off the thrusters
    if (m.exT <= 0) {
      m.exT = lowQ ? 0.08 : 0.04;
      const [px, py] = m.rig.thrusters[(Math.random() * m.rig.thrusters.length) | 0];
      const [x, y] = Rig.worldPoint(m, px, py);
      addP({ type: "ember", x, y, vx: rand(-60, 20) - m.vx * 0.5, vy: rand(80, 220) - m.vy * 0.5, life: 0.5, max: 0.5, r: m.h * 0.012 + 3 });
    }
  }

  // ---------- backdrop ----------
  const PAD = 140, PADY = 50;
  function buildBackground() {
    const bw = W + PAD * 2, bh = H + PADY * 2;
    bgCanvas = makeCanvas(bw * scale, bh * scale);
    const g = bgCanvas.getContext("2d");
    g.setTransform(scale, 0, 0, scale, PAD * scale, PADY * scale);
    g.fillStyle = "#03040b"; g.fillRect(-PAD, -PADY, bw, bh);
    const ih = 1600, top = -PADY - 30;
    if (IMG.space) {
      const iw = IMG.space.width * ih / IMG.space.height, x = W + PAD - iw;
      g.drawImage(IMG.space, x, top, iw, ih);
      g.save(); g.translate(x, 0); g.scale(-1, 1); g.drawImage(IMG.space, 0, top, iw, ih); g.restore();
    }
    if (IMG.planet) { // planet on the left, fading into open space
      const iw = IMG.planet.width * ih / IMG.planet.height;
      const p = makeCanvas(iw * scale, ih * scale), pg = p.getContext("2d");
      pg.drawImage(IMG.planet, 0, 0, p.width, p.height);
      pg.globalCompositeOperation = "destination-in";
      const fade = pg.createLinearGradient(p.width * 0.78, 0, p.width, 0);
      fade.addColorStop(0, "#000"); fade.addColorStop(1, "rgba(0,0,0,0)");
      pg.fillStyle = fade; pg.fillRect(0, 0, p.width, p.height);
      g.drawImage(p, -PAD, top, iw, ih);
    }
    const vg = g.createLinearGradient(0, H - 420, 0, H + PADY);
    vg.addColorStop(0, "rgba(2,3,10,0)"); vg.addColorStop(1, "rgba(2,3,10,0.55)");
    g.fillStyle = vg; g.fillRect(-PAD, H - 420, bw, 420 + PADY);
  }

  function drawSun() {
    const x = 2700, y = -10;
    ctx.globalCompositeOperation = "lighter";
    const p = 0.92 + 0.08 * Math.sin(t * 0.7);
    glow(SPR.white, x, y, 560 * p, 0.45);
    glow(SPR.violet, x, y, 900, 0.25);
    glow(SPR.white, x, y, 150, 0.9);
    ctx.globalAlpha = 0.3; // wide lens flare
    ctx.drawImage(SPR.cyan, x - 1700, y - 9, 3400, 18);
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 5; i++) {
      ctx.rotate(TAU / 5 + Math.sin(t * 0.05) * 0.02);
      ctx.globalAlpha = 0.12; ctx.drawImage(SPR.white, -700, -5, 1400, 10);
    }
    ctx.restore();
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function updateFar(dt) {
    if (Math.random() < dt * 5) {
      farFlashes.push({ x: rand(300, W - 300), y: rand(120, H - 300), life: rand(0.2, 0.6), max: 0.6, r: rand(5, 22), red: Math.random() < 0.5 });
    }
    for (let i = farFlashes.length - 1; i >= 0; i--) {
      farFlashes[i].life -= dt;
      if (farFlashes[i].life <= 0) farFlashes.splice(i, 1);
    }
  }
  function drawFar() {
    ctx.globalCompositeOperation = "lighter";
    for (const f of farFlashes) glow(f.red ? SPR.fire : SPR.cyan, f.x, f.y, f.r, (f.life / f.max) * 0.7);
    ctx.globalAlpha = 0.9; ctx.fillStyle = "#fff";
    for (const s of stars) {
      ctx.globalAlpha = s.b * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function updateDust(dt) {
    for (const d of dust) { d.x -= d.v * dt; if (d.x < -200) { d.x = W + rand(0, 400); d.y = rand(0, H); } }
  }
  function drawDust() {
    ctx.strokeStyle = "rgba(190,205,255,1)"; ctx.lineCap = "round";
    for (const d of dust) {
      ctx.globalAlpha = d.a; ctx.lineWidth = d.w;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.v * 0.06, d.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- HUD ----------
  const pad = (n, l = 4) => String(n).padStart(l, "0");
  function drawHud() {
    for (const b of banners) {
      const k = clamp(1 - (b.t - 2.4) / 1.2, 0, 1) * clamp(b.t / 0.2, 0, 1);
      ctx.globalAlpha = k; ctx.textAlign = "center";
      ctx.font = '800 40px "Orbitron","Segoe UI",Arial,sans-serif';
      ctx.letterSpacing = "8px";
      ctx.fillStyle = "#ffb27a"; ctx.shadowColor = "rgba(255,120,40,0.8)"; ctx.shadowBlur = 20;
      ctx.fillText(b.text, b.x, b.y - b.t * 20);
      ctx.shadowBlur = 0;
    }
    if (!showHud) { ctx.globalAlpha = 1; return; }
    const x = W - 80, y = H - 200;
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.font = '800 64px "Orbitron","Segoe UI",Arial,sans-serif'; ctx.letterSpacing = "14px";
    const gr = ctx.createLinearGradient(x - 820, 0, x, 0);
    gr.addColorStop(0, "#3ee0ff"); gr.addColorStop(1, "#9b6bff");
    ctx.globalAlpha = 0.85; ctx.fillStyle = gr;
    ctx.shadowColor = "rgba(62,224,255,0.55)"; ctx.shadowBlur = 26;
    ctx.fillText("ULTIMA WARRIORS", x, y);
    ctx.shadowBlur = 0;
    ctx.font = '600 22px "Segoe UI",Arial,sans-serif'; ctx.letterSpacing = "6px";
    ctx.fillStyle = "rgba(200,215,255,0.7)";
    ctx.fillText("FLEET ENGAGEMENT  //  SECTOR 7  //  ALL SYSTEMS ONLINE", x, y + 42);
    ctx.fillStyle = "rgba(62,224,255,0.85)";
    ctx.fillText(`HOSTILES DOWN ${pad(stats.kills)}   ·   CRUISERS ${pad(stats.cruisers, 2)}   ·   WINGS LOST ${pad(stats.lost)}`, x, y + 80);
    const lg = ctx.createLinearGradient(x - 900, 0, x, 0);
    lg.addColorStop(0, "rgba(62,224,255,0)"); lg.addColorStop(1, "rgba(62,224,255,0.7)");
    ctx.fillStyle = lg; ctx.fillRect(x - 900, y + 98, 900, 2);
    ctx.globalAlpha = 1; ctx.letterSpacing = "0px";
  }

  // ---------- setup ----------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 2);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    scale = Math.max(canvas.width / W, canvas.height / H);
    offX = (canvas.width - W * scale) / 2; offY = (canvas.height - H * scale) / 2;
    buildBackground();
    for (const c of caps) renderHull(c);
    for (const m of mechs) {
      const img = m.rig === Rig.RIGS.mechA ? IMG.mechA : IMG.mechB;
      if (img) Rig.prepare(m, img, scale);
    }
  }

  function setup() {
    caps = [
      mkCap({ id: "carrier", team: 0, shape: "carrier", len: 1150, x: 1230, y: 1070, dir: 1, tilt: -0.03, seed: 11, lanceMin: 6, lanceMax: 9 }),
      mkCap({ id: "frigate", team: 0, shape: "frigate", len: 480, x: 1650, y: 420, dir: 1, tilt: -0.06, seed: 23, lanceMin: 8, lanceMax: 12 }),
      mkCap({ id: "dread", team: 1, shape: "dread", len: 1300, x: 4380, y: 470, dir: -1, tilt: 0.04, seed: 37, lanceMin: 7, lanceMax: 11 }),
      mkCap({ id: "cruiser", team: 1, shape: "cruiser", len: 720, x: 3980, y: 1110, dir: -1, tilt: -0.02, seed: 51, lanceMin: 9, lanceMax: 13, maxHp: 1400, hp: 1400 }),
    ];
    for (const c of caps) { capBy[c.id] = c; c.y0 = c.by; }
    const n = lowQ ? 22 : 36;
    for (let team = 0; team < 2; team++) for (let i = 0; i < n; i++) fleets[team].push(newFighter(team));

    mechs = [
      // heavy mech by the planet, firing shoulder missiles
      Rig.create({ rig: "mechB", x: 760, y: 650, h: 430, rot: -0.1, tint: 0.28, launcher: true, world: mechWorld, exT: 0 }),
      // wingman in the distance
      Rig.create({ rig: "mechA", x: 3150, y: 300, h: 270, rot: 0.16, tint: 0.4, gun: true, small: true, world: mechWorld, exT: 0, cdMin: 0.9, cdMax: 1.8 }),
      // the hero, front and centre
      Rig.create({ rig: "mechA", x: 2480, y: 700, h: 860, rot: -0.06, gun: true, world: mechWorld, exT: 0 }),
    ];

    const r = seeded(7);
    stars = Array.from({ length: lowQ ? 250 : 520 }, () => ({
      x: r() * (W + 200) - 100, y: r() * (H + 100) - 50, r: 0.8 + r() * 1.8, b: 0.3 + r() * 0.7, sp: 0.5 + r() * 2.5, ph: r() * 6,
    }));
    dust = Array.from({ length: lowQ ? 30 : 70 }, () => ({
      x: rand(0, W), y: rand(0, H), v: rand(250, 800), a: rand(0.05, 0.2), w: rand(1, 2.5),
    }));
  }

  function setLayer(depth, withShake) {
    let sx = 0, sy = 0;
    if (withShake && shake > 0.05) { sx = rand(-shake, shake); sy = rand(-shake, shake); }
    ctx.setTransform(scale, 0, 0, scale, offX + (-cam.x * depth + sx) * scale, offY + (-cam.y * depth + sy) * scale);
  }

  function update(dt) {
    t += dt;
    cam.x = Math.sin(t * 0.05) * 70 + Math.sin(t * 0.13) * 18;
    cam.y = Math.sin(t * 0.07) * 24;
    shake *= Math.exp(-dt * 6);
    for (const c of caps) updateCapital(c, dt);
    for (const team of fleets) for (const f of team) updateFighter(f, dt);
    for (const m of mechs) updateMech(m, dt);
    updateShots(dt);
    updateMissiles(dt);
    updateParts(dt);
    updateFar(dt);
    updateDust(dt);
    for (let i = banners.length - 1; i >= 0; i--) { banners[i].t += dt; if (banners[i].t > 3.6) banners.splice(i, 1); }
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    if (bgCanvas) ctx.drawImage(bgCanvas, offX + (-PAD - cam.x * 0.3) * scale, offY + (-PADY - cam.y * 0.3) * scale);
    setLayer(0.3); drawSun();
    setLayer(0.5); drawFar();
    setLayer(1, true);
    for (const c of caps) drawCapital(c);
    for (const c of caps) drawShield(c);
    for (const c of caps) drawLance(c);
    drawMech(mechs[0]); drawMech(mechs[1]);
    drawMissiles();
    drawFighters();
    drawShots();
    drawParts();
    drawMech(mechs[2]);
    setLayer(1.5); drawDust();
    setLayer(1); drawHud();
  }

  let last = 0, lastFrame = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (fpsCap > 0 && now - lastFrame < 1000 / fpsCap - 2) return;
    lastFrame = now;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt);
    render();
  }

  // Wallpaper Engine settings
  window.wallpaperPropertyListener = {
    applyUserProperties(p) {
      if (p.showhud) showHud = !!p.showhud.value;
      if (p.lowquality && lowQ !== !!p.lowquality.value) { lowQ = !!p.lowquality.value; resize(); }
    },
    applyGeneralProperties(p) { if (p.fps) fpsCap = p.fps; },
  };

  const load = (key, src) => new Promise((done) => {
    const img = new Image();
    img.onload = () => { IMG[key] = img; done(); };
    img.onerror = () => done();
    img.src = src;
  });
  Promise.all([
    load("space", "assets/space-bg.webp"), load("planet", "assets/intro-bg.webp"),
    load("mechA", "assets/intro-mech.webp"), load("mechB", "assets/mech.webp"),
  ]).then(() => {
    setup();
    resize();
    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    // a short warm-up so the battle is already raging when it appears
    for (let i = 0; i < 180; i++) update(1 / 60);
    requestAnimationFrame(loop);
  });

  // for screenshots / testing: window.__wallpaper.step(seconds)
  window.__wallpaper = { step(sec) { for (let i = 0; i < sec * 60; i++) update(1 / 60); render(); }, stats, get mechs() { return mechs; } };
})();
