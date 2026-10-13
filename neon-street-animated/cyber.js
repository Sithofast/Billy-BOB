/* Ultima Warriors: rainy cyberpunk street, animated desktop wallpaper (5120 × 1440).

   The street is a still photo-real image. Everything alive is drawn on top of it:
   - the ULTIMA WARRIORS neon sign mounted on the steel frame: glass tubes that
     glow, hum, light the wall around them, ignite one by one at start-up, and
     have one tired letter that stutters now and then
   - a neon clock (and date) in a metal housing below the sign
   - the neon in the photo breathes and buzzes, steam rolls out of the vents,
     rain falls (catching the sign's colour as it passes), puddles splash,
     haze drifts, distant air traffic crosses the gaps between buildings
   Layout numbers are in stage pixels (5120 × 1440). */
(() => {
  "use strict";

  const W = 5120, H = 1440, TAU = Math.PI * 2;
  const qs = new URLSearchParams(location.search);
  let fpsCap = +qs.get("fps") || 0;
  let lowQ = qs.get("quality") === "low";
  let h24 = qs.get("h24") === "1";
  let showClock = qs.get("clock") !== "0";
  // effect switches (address options or Wallpaper Engine settings)
  const FX = {
    flicker: qs.get("flicker") !== "0", // sign stutter + brownout, street neon buzz, pulsing colon
    haze: qs.get("haze") !== "0",
    grain: qs.get("grain") !== "0",
    rain: qs.get("rain") !== "0",
    steam: qs.get("steam") !== "0",
  };
  const FONT = "UWTiltNeon";

  const SIGN = [
    { text: "ULTIMA", y: 642, size: 196, color: [255, 46, 150], core: [255, 222, 242] },
    { text: "WARRIORS", y: 832, size: 196, color: [40, 226, 255], core: [222, 252, 255] },
  ];
  const SIGN_CX = 2561;
  const CLOCK = { cx: 2561, y: 1120, size: 170, color: [255, 166, 58], core: [255, 238, 205] };
  const DATE = { y: 1214, size: 52, color: [40, 226, 255], core: [222, 252, 255] };
  const HOUSING = { x: 2236, y: 948, w: 650, h: 300 };
  const WALL = { x: 1880, y: 0, w: 1362, h: H };              // the concrete building face
  const SKY_GAPS = [[1430, 0, 450, 330], [3242, 0, 640, 270]]; // where open sky shows
  const VENTS = [[845, 1228, 1], [4224, 1202, -1]];            // steam sources [x, y, drift]

  const canvas = document.getElementById("street");
  const ctx = canvas.getContext("2d", { alpha: false });
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  let scale = 1, offX = 0, offY = 0, t = 0;
  let bgImg = null, bgCanvas = null, hlSharp = null, hlBloom = null;
  let signGlyphs = [], clockGlyphs = {}, ampmGlyphs = {}, dateGlyphs = {}, housing = null;
  let glowSpr = null, smokeSpr = null, fogPattern = null, grainPattern = null;
  const tiles = [], drops = [], splashes = [], steam = [], traffic = [];

  // ---------- small sprites ----------
  function radial(stops, size = 128) {
    const c = makeCanvas(size, size), g = c.getContext("2d"), r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }
  glowSpr = radial([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]);
  smokeSpr = radial([[0, "rgba(205,190,225,0.55)"], [0.55, "rgba(170,150,200,0.22)"], [1, "rgba(150,130,190,0)"]], 96);
  const tinted = {};
  function tintGlow(col) { // a white glow sprite recoloured, cached per colour
    const k = col.join(",");
    if (!tinted[k]) {
      tinted[k] = radial([[0, rgba(col, 1)], [0.3, rgba(col, 0.4)], [1, rgba(col, 0)]]);
    }
    return tinted[k];
  }

  function noiseTexture(w, h, octaves, seed) { // tileable value noise for haze
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const c = makeCanvas(w, h), g = c.getContext("2d"), img = g.createImageData(w, h);
    const acc = new Float32Array(w * h);
    let amp = 1, total = 0;
    for (let o = 0; o < octaves; o++) {
      const gw = 4 << o, gh = Math.max(2, (4 << o) * h / w | 0);
      const grid = Array.from({ length: gw * gh }, rnd);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const fx = x / w * gw, fy = y / h * gh, x0 = fx | 0, y0 = fy | 0;
          const sx = fx - x0, sy = fy - y0, ux = sx * sx * (3 - 2 * sx), uy = sy * sy * (3 - 2 * sy);
          const a = grid[y0 % gh * gw + x0 % gw], b = grid[y0 % gh * gw + (x0 + 1) % gw];
          const c2 = grid[(y0 + 1) % gh * gw + x0 % gw], d = grid[(y0 + 1) % gh * gw + (x0 + 1) % gw];
          acc[y * w + x] += amp * (a + (b - a) * ux + (c2 - a) * uy + (a - b - c2 + d) * ux * uy);
        }
      }
      total += amp; amp *= 0.5;
    }
    for (let i = 0; i < w * h; i++) {
      const v = clamp((acc[i] / total - 0.35) * 1.8, 0, 1);
      img.data[i * 4] = 190; img.data[i * 4 + 1] = 175; img.data[i * 4 + 2] = 225;
      img.data[i * 4 + 3] = v * 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function grainTexture() {
    const c = makeCanvas(256, 256), g = c.getContext("2d"), img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ---------- backdrop ----------
  function buildBackground() {
    bgCanvas = makeCanvas(W * scale, H * scale);
    const g = bgCanvas.getContext("2d");
    g.drawImage(bgImg, 0, 0, bgCanvas.width, bgCanvas.height);
    g.setTransform(scale, 0, 0, scale, 0, 0);
    // soft vignette like a camera lens
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.45)");
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }

  // The bright neon in the photo, separated out so it can breathe and buzz.
  function buildHighlights() {
    const s = 0.25, w = W * s | 0, h = H * s | 0;
    const c = makeCanvas(w, h), g = c.getContext("2d");
    g.drawImage(bgImg, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]);
      const k = mx > 150 && mx - mn > 55 ? clamp((mx - 150) / 105, 0, 1) : 0;
      p[i + 3] = k * 255;
    }
    g.putImageData(d, 0, 0);
    hlSharp = c;
    // bloom: shrink then stretch back up, which blurs it cheaply
    const tiny = makeCanvas(w / 8, h / 8);
    tiny.getContext("2d").drawImage(c, 0, 0, tiny.width, tiny.height);
    hlBloom = makeCanvas(w, h);
    const hg = hlBloom.getContext("2d");
    hg.imageSmoothingQuality = "high";
    hg.drawImage(tiny, 0, 0, w, h); hg.drawImage(tiny, 0, 0, w, h);
    const cols = 12, rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        tiles.push({ x: q * W / cols, y: r * H / rows, w: W / cols, h: H / rows, ph: rand(0, TAU), sp: rand(0.3, 1.4), buzz: 0, next: rand(3, 30) });
      }
    }
  }

  // ---------- neon glyphs ----------
  // Each character is painted three ways: unlit glass, its glow, and the white-hot core.
  function glyph(ch, size, color, core) {
    const k = scale, pad = size * 0.75;
    const m = document.createElement("canvas").getContext("2d");
    m.font = `${size}px ${FONT}`;
    const w = m.measureText(ch).width;
    const cw = (w + pad * 2) * k, chh = (size * 1.2 + pad * 2) * k;
    const base = pad + size * 0.95; // baseline position inside the sprite
    const mk = (q = 1) => { const c = makeCanvas(cw * q, chh * q), g = c.getContext("2d"); g.scale(k * q, k * q); g.font = `${size}px ${FONT}`; return [c, g]; };
    const FAR = 10000; // draw off-canvas and keep only the shadow

    const [off, og] = mk(); // unlit tube plus the shadow it casts on the wall
    og.shadowColor = "rgba(0,0,0,0.6)"; og.shadowBlur = Math.min(24, size * 0.035 * k);
    og.shadowOffsetX = FAR * k; og.shadowOffsetY = size * 0.08 * k;
    og.fillStyle = "#000"; og.fillText(ch, pad + size * 0.05 - FAR, base);
    og.shadowColor = "transparent"; og.shadowBlur = 0; og.shadowOffsetX = 0; og.shadowOffsetY = 0;
    og.fillStyle = "rgba(78,70,88,0.95)"; og.fillText(ch, pad, base);
    og.strokeStyle = "rgba(255,255,255,0.16)"; og.lineWidth = size * 0.012;
    og.strokeText(ch, pad - size * 0.006, base - size * 0.008);

    const Q = 0.25, [glow, gg] = mk(Q); // light thrown off the tube (quarter res: soft anyway)
    gg.fillStyle = rgba(color, 1);
    for (const [blur, a] of [[0.05, 1], [0.16, 0.9], [0.42, 0.7], [0.9, 0.45]]) {
      gg.shadowColor = rgba(color, a); gg.shadowBlur = Math.min(60, size * blur * k * Q);
      gg.fillText(ch, pad, base);
    }

    const [hot, hg] = mk(); // gas-lit tube: saturated edge, near-white centre
    hg.fillStyle = rgba(color, 1); hg.fillText(ch, pad, base);
    hg.shadowColor = rgba(core, 1); hg.shadowBlur = size * 0.02 * k;
    hg.strokeStyle = rgba(core, 0.95); hg.lineWidth = size * 0.022;
    hg.globalCompositeOperation = "source-atop";
    hg.strokeText(ch, pad, base);
    hg.globalCompositeOperation = "source-over";
    hg.shadowColor = rgba(core, 0.6); hg.shadowBlur = Math.min(8, size * 0.008 * k);
    hg.fillStyle = rgba(core, 0.3); hg.fillText(ch, pad, base);

    return { ch, w, size, pad, base, off, glow, hot, color };
  }

  function layoutLine(line) {
    const gl = [...line.text].map((ch) => glyph(ch, line.size, line.color, line.core));
    const gap = line.size * 0.06, total = gl.reduce((s, g) => s + g.w, 0) + gap * (gl.length - 1);
    let x = SIGN_CX - total / 2;
    return gl.map((g) => {
      const o = { g, x, y: line.y, i: 0, on: 0, flick: 0, color: line.color };
      x += g.w + gap;
      return o;
    });
  }

  function buildGlyphs() {
    signGlyphs = SIGN.map(layoutLine);
    clockGlyphs = {}; ampmGlyphs = {}; dateGlyphs = {};
    for (const ch of "0123456789:") clockGlyphs[ch] = glyph(ch, CLOCK.size, CLOCK.color, CLOCK.core);
    for (const ch of "APM") ampmGlyphs[ch] = glyph(ch, CLOCK.size * 0.36, CLOCK.color, CLOCK.core);
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ·") dateGlyphs[ch] = glyph(ch, DATE.size, DATE.color, DATE.core);
    housing = buildHousing();
  }

  function buildHousing() { // the clock's weathered steel box, bolted to the wall
    const { w, h } = HOUSING, k = scale, c = makeCanvas((w + 80) * k, (h + 80) * k), g = c.getContext("2d");
    g.scale(k, k); g.translate(40, 40);
    const rrect = (x, y, w2, h2, r2) => {
      g.beginPath(); g.moveTo(x + r2, y);
      g.arcTo(x + w2, y, x + w2, y + h2, r2); g.arcTo(x + w2, y + h2, x, y + h2, r2);
      g.arcTo(x, y + h2, x, y, r2); g.arcTo(x, y, x + w2, y, r2); g.closePath();
    };
    g.shadowColor = "rgba(0,0,0,0.7)"; g.shadowBlur = Math.min(20, 10 * k); g.shadowOffsetY = 8 * k;
    g.fillStyle = "#000"; g.fillRect(4, 4, w - 8, h - 8);
    g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0;
    const r = 18;
    const box = () => rrect(0, 0, w, h, r);
    let gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#2c2a33"); gr.addColorStop(1, "#141319");
    box(); g.fillStyle = gr; g.fill();
    g.save(); box(); g.clip();
    for (let i = 0; i < 260; i++) { // scuffs and rust
      g.fillStyle = Math.random() < 0.7 ? `rgba(255,255,255,${rand(0.01, 0.04)})` : `rgba(120,60,30,${rand(0.05, 0.14)})`;
      g.fillRect(rand(0, w), rand(0, h), rand(2, 40), rand(1, 3));
    }
    gr = g.createLinearGradient(0, 0, 0, 60); gr.addColorStop(0, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = "#07070a"; rrect(26, 26, w - 52, h - 52, 10); g.fill();
    g.fillStyle = gr; g.fillRect(26, 26, w - 52, 60);
    g.restore();
    box(); g.strokeStyle = "rgba(200,190,230,0.18)"; g.lineWidth = 2; g.stroke();
    for (const [x, y] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) {
      g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fillStyle = "#3a3742"; g.fill();
      g.strokeStyle = "rgba(0,0,0,0.6)"; g.lineWidth = 1.5; g.stroke();
      g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.stroke();
    }
    return c;
  }

  // ---------- neon behaviour ----------
  const sign = { brown: 0, nextBrown: rand(60, 150), faulty: null, episode: 0, nextEp: rand(8, 16), out: 0 };
  function initSign() {
    const all = signGlyphs.flat();
    all.forEach((L, n) => { L.ignite = 0.6 + n * 0.11 + rand(0, 0.35); L.stutter = rand(0.25, 0.7); });
    const war = signGlyphs[1];
    sign.faulty = war[war.length - 2]; // the tired "R"
  }
  function updateSign(dt) {
    if (FX.flicker) sign.nextBrown -= dt;
    if (sign.nextBrown <= 0) { sign.brown = 0.35; sign.nextBrown = rand(70, 160); }
    sign.brown = Math.max(0, sign.brown - dt);
    const brownK = sign.brown > 0 ? (Math.sin(sign.brown * 60) > 0 ? 0.45 : 0.8) : 1;
    if (FX.flicker) sign.nextEp -= dt;
    if (sign.nextEp <= 0 && sign.episode <= 0) {
      sign.episode = rand(0.4, 1.6); sign.nextEp = rand(7, 20);
      if (Math.random() < 0.2) sign.out = rand(1.5, 4);
    }
    for (const line of signGlyphs) {
      for (const L of line) {
        let target = 1;
        if (t < L.ignite) target = 0;
        else if (FX.flicker && t < L.ignite + L.stutter) target = Math.random() < 0.45 ? 1 : 0.05;
        if (L === sign.faulty) {
          if (sign.episode > 0) {
            L.flick -= dt;
            if (L.flick <= 0) { L.flick = rand(0.03, 0.12); L.on = Math.random() < 0.5 ? 1 : 0.08; }
            target *= L.on;
          } else if (sign.out > 0) target = 0.03;
        }
        target *= brownK * (0.965 + 0.035 * Math.sin(t * 7.3 + L.x * 0.01) * Math.sin(t * 13.1));
        // gas lights fast but not instantly, and fades a touch slower
        L.i += (target - L.i) * Math.min(1, dt * (target > L.i ? 45 : 22));
      }
    }
    if (sign.episode > 0) sign.episode -= dt; else if (sign.out > 0) sign.out -= dt;
  }
  const lineLevel = (line) => line.reduce((s, L) => s + L.i, 0) / line.length;

  function drawGlyph(L, x, y, i) {
    const g = L.g ? L.g : L, k = 1 / scale;
    const dx = x - g.pad, dy = y - g.base, w = g.off.width * k, h = g.off.height * k;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1; ctx.drawImage(g.off, dx, dy, w, h);
    if (i <= 0.01) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = clamp(i, 0, 1); ctx.drawImage(g.glow, dx, dy, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = clamp(i * 1.2, 0, 1); ctx.drawImage(g.hot, dx, dy, w, h);
  }

  function drawSign() {
    const lv = signGlyphs.map(lineLevel);
    // the tubes light up the concrete around them
    ctx.save();
    ctx.beginPath(); ctx.rect(WALL.x, WALL.y, WALL.w, WALL.h); ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    SIGN.forEach((line, n) => {
      ctx.globalAlpha = 0.34 * lv[n];
      ctx.drawImage(tintGlow(line.color), SIGN_CX - 1050, line.y - 80 - 420, 2100, 840);
      ctx.globalAlpha = 0.18 * lv[n];
      ctx.drawImage(tintGlow(line.color), SIGN_CX - 650, line.y - 80 - 200, 1300, 400);
    });
    ctx.restore();
    for (const line of signGlyphs) for (const L of line) drawGlyph(L, L.x, L.y, L.i);
  }

  // ---------- clock ----------
  const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const clockState = { i: 0, ignite: 2.4 };
  function drawText(set, text, cx, y, i, gapK, colonI) {
    const gl = [...text].map((ch) => set[ch] || set[" "]).filter(Boolean);
    const gap = gl.length ? gl[0].size * gapK : 0;
    const total = gl.reduce((s, g) => s + g.w, 0) + gap * Math.max(0, gl.length - 1);
    let x = cx - total / 2;
    for (const g of gl) {
      drawGlyph(g, x, y, g.ch === ":" && colonI !== undefined ? colonI : i);
      x += g.w + gap;
    }
    return total;
  }
  function drawClock() {
    if (!showClock) return;
    const k = 1 / scale;
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.drawImage(housing, HOUSING.x - 40, HOUSING.y - 40, housing.width * k, housing.height * k);
    const now = new Date();
    let hh = now.getHours();
    const mm = String(now.getMinutes()).padStart(2, "0"), pm = hh >= 12;
    if (!h24) hh = hh % 12 || 12;
    const timeTxt = (h24 ? String(hh).padStart(2, "0") : String(hh)) + ":" + mm;
    const ci = clockState.i, colon = FX.flicker ? ci * (0.55 + 0.45 * Math.cos((now.getMilliseconds() / 1000) * TAU)) : ci;
    // the clock throws a little amber light on the wall
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.16 * ci;
    ctx.drawImage(tintGlow(CLOCK.color), CLOCK.cx - 560, CLOCK.y - 60 - 260, 1120, 520); ctx.restore();
    const wTime = drawText(clockGlyphs, timeTxt, CLOCK.cx - (h24 ? 0 : 40), CLOCK.y, ci, 0.04, colon);
    if (!h24) drawText(ampmGlyphs, pm ? "PM" : "AM", CLOCK.cx - 40 + wTime / 2 + 70, CLOCK.y - CLOCK.size * 0.42, ci, 0.06);
    const dateTxt = `${DAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`;
    drawText(dateGlyphs, dateTxt, CLOCK.cx, DATE.y, ci * 0.9, 0.12);
  }

  // ---------- photo neon breathing ----------
  function drawHighlights(dt) {
    if (!hlSharp) return;
    const sx = hlSharp.width / W;
    ctx.globalCompositeOperation = "lighter";
    for (const tl of tiles) {
      if (FX.flicker) tl.next -= dt; else tl.buzz = 0;
      if (tl.next <= 0) { tl.buzz = rand(0.2, 0.9); tl.next = rand(6, 40); }
      let a = 0.28 + 0.16 * Math.sin(t * tl.sp + tl.ph);
      if (tl.buzz > 0) { tl.buzz -= dt; a = Math.random() < 0.5 ? 0.02 : 0.6; }
      const x = tl.x * sx, y = tl.y * sx, w = tl.w * sx, h = tl.h * sx;
      ctx.globalAlpha = a;
      ctx.drawImage(hlSharp, x, y, w, h, tl.x, tl.y, tl.w, tl.h);
      ctx.globalAlpha = a * 0.7;
      ctx.drawImage(hlBloom, x, y, w, h, tl.x, tl.y, tl.w, tl.h);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  // ---------- weather ----------
  function initRain() {
    const L = [
      { n: 520, len: [16, 28], spd: [1300, 1700], w: 1, a: 0.16 },
      { n: 260, len: [38, 62], spd: [2000, 2500], w: 1.4, a: 0.2 },
      { n: 55, len: [100, 150], spd: [2900, 3500], w: 2.6, a: 0.12 },
    ];
    drops.length = 0;
    L.forEach((l, layer) => {
      const n = lowQ ? l.n / 2 | 0 : l.n;
      for (let i = 0; i < n; i++) drops.push({ layer, x: rand(-200, W), y: rand(-200, H), len: rand(...l.len), spd: rand(...l.spd), w: l.w, a: l.a });
    });
  }
  const WIND = 0.07;
  function updateRain(dt) {
    for (const d of drops) {
      d.y += d.spd * dt; d.x += d.spd * WIND * dt;
      if (d.y > H + 50) {
        if (d.layer > 0 && Math.random() < 0.5 && (d.x < WALL.x || d.x > WALL.x + WALL.w)) splashes.push({ x: d.x, y: rand(1330, 1436), t: 0, r: rand(5, 13) });
        d.y = rand(-260, -20); d.x = rand(-300, W);
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) { splashes[i].t += dt; if (splashes[i].t > 0.3) splashes.splice(i, 1); }
  }
  function drawRain() {
    ctx.lineCap = "round";
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      let w = 1, a = 0.2;
      for (const d of drops) {
        if (d.layer !== layer) continue;
        w = d.w; a = d.a;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * WIND, d.y - d.len);
      }
      ctx.strokeStyle = `rgba(205,212,238,${a})`; ctx.lineWidth = w; ctx.stroke();
    }
    // drops passing in front of the sign catch its colour
    const lv = signGlyphs.map(lineLevel);
    ctx.globalCompositeOperation = "lighter";
    SIGN.forEach((line, n) => {
      if (lv[n] < 0.05) return;
      ctx.beginPath();
      for (const d of drops) {
        if (d.layer === 0) continue;
        const dx = Math.abs(d.x - SIGN_CX), dy = d.y - line.y + 60;
        if (dx < 900 && Math.abs(dy) < 260) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * WIND, d.y - d.len); }
      }
      ctx.strokeStyle = rgba(line.color, 0.45 * lv[n]); ctx.lineWidth = 1.6; ctx.stroke();
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(210,215,240,1)"; ctx.lineWidth = 1.2;
    for (const s of splashes) {
      const k = s.t / 0.3;
      ctx.globalAlpha = 0.3 * (1 - k);
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * (0.3 + k), s.r * 0.28 * (0.3 + k), 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function updateSteam(dt) {
    for (const [x, y, dir] of VENTS) {
      if (Math.random() < dt * (lowQ ? 6 : 12)) {
        steam.push({ x: x + rand(-15, 15), y, vx: dir * rand(10, 40) + rand(-10, 10), vy: rand(-90, -50), r: rand(50, 90), life: 0, max: rand(4, 7), rot: rand(0, TAU) });
      }
    }
    for (let i = steam.length - 1; i >= 0; i--) {
      const s = steam[i];
      s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy *= 1 - dt * 0.15; s.r += dt * 38;
      if (s.life > s.max) steam.splice(i, 1);
    }
  }
  function drawSteam() {
    ctx.globalCompositeOperation = "screen";
    for (const s of steam) {
      const k = s.life / s.max, a = Math.min(1, s.life * 0.8) * (1 - k) * 0.2;
      ctx.globalAlpha = a;
      ctx.drawImage(smokeSpr, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function drawFog() {
    if (!fogPattern) return;
    ctx.globalCompositeOperation = "screen";
    const layers = [[0.06, 9, 14, 0], [0.045, 6, -22, 400]];
    for (const [a, s, v, oy] of layers) {
      fogPattern.setTransform(new DOMMatrix().translateSelf((t * v) % (512 * s), oy).scaleSelf(s, s));
      ctx.globalAlpha = a; ctx.fillStyle = fogPattern; ctx.fillRect(0, 0, W, H);
    }
    // heavier haze down at street level
    const gr = ctx.createLinearGradient(0, H * 0.6, 0, H);
    gr.addColorStop(0, "rgba(120,100,160,0)"); gr.addColorStop(1, "rgba(120,100,160,0.11)");
    ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(0, H * 0.6, W, H * 0.4);
    ctx.globalCompositeOperation = "source-over";
  }

  function updateTraffic(dt) {
    if (traffic.length < 4 && Math.random() < dt * 0.25) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      traffic.push({ x: dir > 0 ? 1300 : 3950, y: rand(60, 250), v: dir * rand(70, 160), s: rand(0.6, 1.2), ph: rand(0, TAU) });
    }
    for (let i = traffic.length - 1; i >= 0; i--) {
      const c = traffic[i]; c.x += c.v * dt;
      if (c.x < 1250 || c.x > 4000) traffic.splice(i, 1);
    }
  }
  function drawTraffic() {
    ctx.save();
    ctx.beginPath(); for (const [x, y, w, h] of SKY_GAPS) ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    for (const c of traffic) {
      const dir = Math.sign(c.v);
      ctx.globalAlpha = 0.9; ctx.drawImage(tintGlow([255, 245, 225]), c.x + dir * 6 * c.s - 9 * c.s, c.y - 9 * c.s, 18 * c.s, 18 * c.s);
      const blink = Math.sin(t * 6 + c.ph) > 0.6 ? 1 : 0.15;
      ctx.globalAlpha = blink; ctx.drawImage(tintGlow([255, 40, 40]), c.x - dir * 8 * c.s - 6 * c.s, c.y - 6 * c.s, 12 * c.s, 12 * c.s);
    }
    ctx.restore();
  }

  // ---------- frame ----------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 2);
    let px = innerWidth * innerHeight * dpr * dpr;
    const cap = lowQ ? 4e6 : 9e6;
    const d2 = px > cap ? dpr * Math.sqrt(cap / px) : dpr;
    canvas.width = Math.round(innerWidth * d2); canvas.height = Math.round(innerHeight * d2);
    scale = Math.max(canvas.width / W, canvas.height / H);
    offX = (canvas.width - W * scale) / 2; offY = (canvas.height - H * scale) / 2;
    buildBackground();
    buildGlyphs();
    initSign();
  }

  function update(dt) {
    t += dt;
    updateSign(dt);
    clockState.i += ((t > clockState.ignite ? 1 : 0) * (0.97 + 0.03 * Math.sin(t * 9)) - clockState.i) * Math.min(1, dt * 20);
    updateRain(dt); updateSteam(dt); updateTraffic(dt);
  }

  function render(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.drawImage(bgCanvas, offX, offY);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    drawHighlights(dt);
    drawTraffic();
    if (FX.steam) drawSteam();
    drawSign();
    drawClock();
    if (FX.haze) drawFog();
    if (FX.rain) drawRain();
    if (FX.grain && grainPattern) { // film grain
      grainPattern.setTransform(new DOMMatrix().translateSelf(rand(0, 256), rand(0, 256)));
      ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = 0.05;
      ctx.fillStyle = grainPattern; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }
  }

  let last = 0, lastFrame = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (fpsCap > 0 && now - lastFrame < 1000 / fpsCap - 2) return;
    lastFrame = now;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt); render(dt);
  }

  // Wallpaper Engine settings
  window.wallpaperPropertyListener = {
    applyUserProperties(p) {
      if (p.showclock) showClock = !!p.showclock.value;
      for (const k of ["flicker", "haze", "grain", "rain", "steam"]) if (p[k]) FX[k] = !!p[k].value;
      if (p.clock24) h24 = !!p.clock24.value;
      if (p.lowquality && lowQ !== !!p.lowquality.value) { lowQ = !!p.lowquality.value; initRain(); resize(); }
    },
    applyGeneralProperties(p) { if (p.fps) fpsCap = p.fps; },
  };

  async function start() {
    const A = window.UW_ASSETS || {};
    try {
      const face = new FontFace(FONT, `url(${A.font || "assets/tiltneon.ttf"})`);
      document.fonts.add(await face.load());
    } catch (e) { /* falls back to a system font */ }
    bgImg = await new Promise((done) => {
      const img = new Image(); img.onload = () => done(img); img.onerror = () => done(null);
      img.src = A.street || "assets/street.webp";
    });
    if (!bgImg) return;
    const ctxNoise = noiseTexture(512, 256, 5, 1234);
    fogPattern = ctx.createPattern(ctxNoise, "repeat");
    grainPattern = ctx.createPattern(grainTexture(), "repeat");
    buildHighlights();
    initRain();
    resize();
    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    for (let i = 0; i < 90; i++) { updateRain(1 / 60); updateSteam(1 / 60); } // rain and steam already going
    for (let i = 0; i < 400; i++) updateSteam(1 / 60);
    requestAnimationFrame(loop);
    window.__street = { step(sec) { for (let i = 0; i < sec * 60; i++) update(1 / 60); render(1 / 60); }, ready: true };
  }
  let shown = false;
  function showError(e) {
    if (shown) return; shown = true;
    const d = document.createElement("pre");
    d.style.cssText = "position:fixed;left:20px;bottom:60px;color:#ff8;font:16px monospace;background:rgba(0,0,0,.7);padding:10px;z-index:9;white-space:pre-wrap;max-width:90vw";
    d.textContent = "Ultima Warriors wallpaper error:\n" + (e && (e.stack || e.message) || e);
    document.body.appendChild(d);
  }
  window.addEventListener("error", (ev) => showError(ev.error || ev.message));
  start().catch(showError);
})();
