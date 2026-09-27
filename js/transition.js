// Page transition: a sheet of paper flies across the screen, left → right,
// adapted from the "Paper Loop" prototype. The paper bends, ripples and flips
// in 3D (drawn on a 2D canvas) while a dark overlay swipes across behind it.
//
//  - Leaving: clicking a same-site link plays the paper's entrance while the
//    overlay swipes in from the left, then navigates.
//  - Arriving: an inline script in each page's <head> marks the page as
//    covered before first paint (html.wipe-pending). The paper picks up at the
//    exact point it left off, hovers and flips, then leaves to the right as
//    the overlay swipes away.
//
// Decorative only (canvas is aria-hidden, no pointer events). Skipped entirely
// with prefers-reduced-motion: plain page loads.

(function () {
  const html = document.documentElement;
  const KEY = 'fion-wipe';
  const TEXT_KEY = 'fion-wipe-text';
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Edit these: one is drawn on the paper, picked at random each trip ----
  const EMOJIS = ['✨', '🎨', '✏️', '💡', '🌸', '🚀', '😮', '🌀', '🍃', '✈️', '🫧', '🎈', '🌈', '👀', '🪄', '🍑'];

  // ---- Speed of each phase (× the prototype's pace; higher = quicker) ----
  const SPEED = { in: 3.5, loop: 5, out: 3.5 };
  const OVERLAY_OUT_MS = 400;     // matches overlay-out in css/style.css

  // ---- Colours (the site's palette) ----
  const COL = {
    paper: '#f5f3f0',                 // front: the site's off-white
    back: '#f7c3c1',                  // back: soft coral, shows as it flips
    edge: 'rgba(249, 144, 148, 0.75)',  // coral edge
    margin: '#f99094', shadow: 'rgba(0, 0, 0, 0.5)',
    trail: '249, 144, 148',           // coral wake (rgb)
  };

  // ======================================================================
  // Motion (from the Paper Loop prototype)
  // Each row: [time s, x (0–1 of width), y (0–1 of a 16:9 frame), size,
  //            in-plane angle (deg), roll (turns)]: a fast entry, a climb as
  // it brakes and flips, a hang, then a climb and a flip as it exits right.
  // ======================================================================
  const KF = [
    [0.00, -0.08, 0.60, 0.70, -25, 0.00],
    [0.30,  0.05, 0.68, 0.74, -10, 0.02],
    [0.55,  0.23, 0.72, 0.82,   5, 0.10],
    [0.80,  0.33, 0.64, 0.88, -35, 0.40],
    [1.05,  0.38, 0.53, 0.94, -60, 0.70],
    [1.35,  0.405, 0.43, 1.02, -40, 0.88],
    [1.70,  0.43, 0.38, 1.12, -15, 0.95],
    [2.20,  0.465, 0.41, 1.24,   8, 0.90],
    [2.70,  0.51, 0.45, 1.30,  18, 0.98],
    [3.20,  0.565, 0.44, 1.28,   5, 1.02],
    [3.60,  0.635, 0.33, 1.22, -25, 1.25],
    [3.95,  0.70, 0.27, 1.15, -30, 1.60],
    [4.30,  0.82, 0.26, 1.08,  -5, 1.85],
    [4.55,  0.94, 0.31, 1.02,  20, 1.93],
    [4.80,  1.09, 0.42, 0.98,  30, 1.95],
  ];
  const T_END = KF[KF.length - 1][0];
  const PHASES = [1.3, 3.4];      // entrance | hover | exit (reference seconds)

  // Cubic Hermite through the keys: continuous velocity, eased changes of pace.
  function sampleKF(tau, col) {
    tau = Math.max(0, Math.min(T_END, tau));
    let i = 0;
    while (i < KF.length - 2 && KF[i + 1][0] < tau) i++;
    const k0 = KF[i], k1 = KF[i + 1];
    const slope = (a, b) => (b[col] - a[col]) / (b[0] - a[0]);
    const m = j => {
      if (j <= 0) return slope(KF[0], KF[1]);
      if (j >= KF.length - 1) return slope(KF[j - 1], KF[j]);
      return 0.5 * (slope(KF[j - 1], KF[j]) + slope(KF[j], KF[j + 1]));
    };
    const dt = k1[0] - k0[0], u = (tau - k0[0]) / dt;
    const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u;
    const h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
    return h00 * k0[col] + h10 * dt * m(i) + h01 * k1[col] + h11 * dt * m(i + 1);
  }

  // Time warp: each phase runs at its own speed, blended smoothly.
  const sig = x => 0.5 + 0.5 * Math.tanh(x);
  const rateAt = tau => SPEED.in
    + (SPEED.loop - SPEED.in) * sig((tau - PHASES[0]) / 0.18)
    + (SPEED.out - SPEED.loop) * sig((tau - PHASES[1]) / 0.18);
  const WN = 1200;
  const warp = [0];
  for (let i = 1; i <= WN; i++) warp.push(warp[i - 1] + (T_END / WN) / rateAt(((i - 0.5) / WN) * T_END));
  const DURATION = warp[WN] * 1000;                                   // ms, whole flight
  const msAtTau = tau => warp[Math.round((tau / T_END) * WN)] * 1000;
  const HANDOFF = msAtTau(PHASES[0]);                                 // leaving page stops here
  const EXIT = msAtTau(PHASES[1]);                                    // exit begins
  function tauAt(ms) {
    const t = ms / 1000;
    if (t <= 0) return 0;
    if (t >= warp[WN]) return T_END;
    let lo = 0, hi = WN;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; warp[mid] <= t ? lo = mid : hi = mid; }
    return ((lo + (t - warp[lo]) / (warp[hi] - warp[lo])) / WN) * T_END;
  }

  // Roll follows the keyed flips through a damped spring (lags, swings past,
  // settles). Precomputed per ms; deterministic, so both pages agree.
  const ROLL_N = Math.ceil(DURATION) + 2;
  const rollAng = new Float32Array(ROLL_N), rollVel = new Float32Array(ROLL_N);
  (function () {
    const base = 0.45, w0 = 13 * Math.sqrt(SPEED.loop), zeta = 0.5, dt = 0.001;
    let r = base, v = 0;
    for (let i = 0; i < ROLL_N; i++) {
      const target = base + Math.PI * 2 * sampleKF(tauAt(i), 5);
      const acc = w0 * w0 * (target - r) - 2 * zeta * w0 * v;
      v += acc * dt; r += v * dt;
      rollAng[i] = r; rollVel[i] = v;
    }
  })();

  // ======================================================================
  // Drawing
  // ======================================================================
  let canvas = null, ctx = null, W = 0, H = 0;
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const NX = coarse ? 14 : 22, NY = coarse ? 6 : 8;
  let mark = EMOJIS[0];

  function ensureCanvas() {
    if (canvas) return true;
    try {
      canvas = document.createElement('canvas');
      canvas.className = 'page-paper';
      canvas.setAttribute('aria-hidden', 'true');
      ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d');
      (document.body || html).appendChild(canvas);
      sizeCanvas();
      return true;
    } catch (e) { canvas = null; ctx = null; return false; }
  }
  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function removeCanvas() {
    if (canvas) canvas.remove();
    canvas = null; ctx = null;
  }

  function frameBox() { const vh = Math.min(H, W * 9 / 16); return { oy: (H - vh) / 2, vh }; }
  function pointAt(tau) {
    const b = frameBox();
    return { x: sampleKF(tau, 1) * W, y: b.oy + sampleKF(tau, 2) * b.vh };
  }
  // sheet size: scales with the screen, a touch larger on phones so the writing reads
  const baseSize = () => Math.max(48, Math.min(W, H) * 0.16, Math.min(W, frameBox().vh * 1.78) * 0.095);

  // A bendable A5 sheet: cups along its length, sags across its width, and
  // carries a slow ripple, so it reads as paper riding the air.
  function drawPaper(p, angle, roll, t, lift, twist, size) {
    const w = size, h = w * (210 / 148);
    const f = w * 4.5;
    const c = Math.cos(angle), sn = Math.sin(angle);
    const bend = w * (0.12 + 0.30 * lift);
    const ripple = w * (0.05 + 0.03 * lift);
    const sag = w * 0.07;
    const flop = w * (0.06 + 0.05 * lift);

    const local = (x, y) => {
      const xn = x / (h / 2), yn = y / (w / 2);
      const z = bend * xn * xn
              + ripple * Math.sin(xn * 2.4 - t * 0.0045) * (0.5 + 0.5 * xn)
              + ripple * 0.5 * Math.sin(xn * 4.1 - t * 0.0071 + 1.3) * (0.3 + 0.7 * xn * xn)
              + sag * yn * yn
              + flop * xn * yn * Math.sin(t * 0.0032 + xn * 1.6)
              + flop * 0.6 * yn * yn * yn * Math.sin(t * 0.0026 + 0.8);
      const r = roll + twist * xn, cr = Math.cos(r), sr = Math.sin(r);
      return [x, y * cr - z * sr, y * sr + z * cr];
    };
    const proj = (x, y) => {
      const [X, Y, Z] = local(x, y);
      const k = f / (f - Z);
      return [p.x + X * k * c - Y * k * sn, p.y + X * k * sn + Y * k * c];
    };
    const facingAt = (x, y) => {
      const e = 0.5, o = local(x, y), ax = local(x + e, y), ay = local(x, y + e);
      const u = [ax[0] - o[0], ax[1] - o[1], ax[2] - o[2]];
      const v = [ay[0] - o[0], ay[1] - o[1], ay[2] - o[2]];
      const nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
      return nz / Math.hypot(nx, ny, nz);
    };
    const poly = pts => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); };
    const curve = (x1, y1, x2, y2, n = 12) => {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(proj(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n));
      poly(pts); ctx.stroke();
    };

    const x0 = -h / 2, y0 = -w / 2;
    const gx = i => x0 + h * i / NX, gy = j => y0 + w * j / NY;

    // Rounded-corner outline, sampled in the sheet's own coordinates so the
    // corners bend with the paper; everything is clipped to it.
    const rad = Math.min(w, h) * 0.09;
    const outline = [];
    const corner = (cx, cy, a0) => {
      for (let k = 0; k <= 5; k++) {
        const a = a0 + (Math.PI / 2) * (k / 5);
        outline.push(proj(cx + rad * Math.cos(a), cy + rad * Math.sin(a)));
      }
    };
    const edgeRun = (xa, ya, xb, yb, n) => {
      for (let k = 1; k < n; k++) outline.push(proj(xa + (xb - xa) * k / n, ya + (yb - ya) * k / n));
    };
    corner(x0 + rad, y0 + rad, Math.PI);                 // top-left
    edgeRun(x0 + rad, y0, -x0 - rad, y0, NX);
    corner(-x0 - rad, y0 + rad, -Math.PI / 2);           // top-right
    edgeRun(-x0, y0 + rad, -x0, -y0 - rad, NY);
    corner(-x0 - rad, -y0 - rad, 0);                     // bottom-right
    edgeRun(-x0 - rad, -y0, x0 + rad, -y0, NX);
    corner(x0 + rad, -y0 - rad, Math.PI / 2);            // bottom-left
    edgeRun(x0, -y0 - rad, x0, y0 + rad, NY);

    ctx.save();
    poly(outline); ctx.closePath();
    ctx.shadowColor = COL.shadow; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
    ctx.fillStyle = COL.paper; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save();
    poly(outline); ctx.closePath(); ctx.clip();

    // shade each patch by which side faces us and how far it turns away
    let frontShare = 0;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
      const fc = facingAt((gx(i) + gx(i + 1)) / 2, (gy(j) + gy(j + 1)) / 2);
      frontShare += fc >= 0 ? 1 : -1;
      poly([proj(gx(i), gy(j)), proj(gx(i + 1), gy(j)), proj(gx(i + 1), gy(j + 1)), proj(gx(i), gy(j + 1))]);
      ctx.closePath();
      ctx.fillStyle = fc >= 0 ? COL.paper : COL.back;
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke();   // hide seams
      ctx.fillStyle = 'rgba(10, 10, 12,' + ((1 - Math.abs(fc)) * 0.28).toFixed(3) + ')';
      ctx.fill();
    }

    // front: a coral margin line (a ghost of it shows through from the back)
    const front = frontShare >= 0;
    ctx.globalAlpha = front ? 1 : 0.25;
    ctx.strokeStyle = COL.margin; ctx.lineWidth = 1.6;
    curve(x0 + h * 0.14, y0 + 2, x0 + h * 0.14, -y0 - 2, 6);
    ctx.globalAlpha = 1;
    ctx.restore();                                         // end clip

    poly(outline); ctx.closePath();
    ctx.lineWidth = 1.2; ctx.strokeStyle = COL.edge; ctx.stroke();

    // the emoji, printed on the paper's plane (hidden when the back faces us)
    const fcC = facingAt(0, 0);
    if (front && fcC > 0.25 && mark) {
      const o = proj(0, 0), ax = proj(1, 0), ay = proj(0, 1);
      const dpr = canvas.width / W;
      ctx.setTransform(
        (ax[0] - o[0]) * dpr, (ax[1] - o[1]) * dpr,
        (ay[0] - o[0]) * dpr, (ay[1] - o[1]) * dpr,
        (o[0] + (ax[0] - o[0]) * h * 0.06) * dpr, (o[1] + (ax[1] - o[1]) * h * 0.06) * dpr
      );
      ctx.globalAlpha = Math.min(1, (fcC - 0.25) / 0.35);
      ctx.font = `${(w * 0.46).toFixed(1)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(mark, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function render(ms) {
    if (!ctx) return;
    ms = Math.max(0, Math.min(DURATION, ms));
    const tau = tauAt(ms);
    ctx.clearRect(0, 0, W, H);

    // coral wake: where the paper was over the last ~0.15 s, fading out
    const pts = [];
    for (let k = 14; k >= 0; k--) {
      const m = ms - k * 11;
      if (m >= 0) pts.push(pointAt(tauAt(m)));
    }
    ctx.lineCap = 'round';
    for (let k = 1; k < pts.length; k++) {
      const a = k / pts.length;
      ctx.strokeStyle = `rgba(${COL.trail}, ${(a * 0.55).toFixed(3)})`;
      ctx.lineWidth = 1 + a * baseSize() * 0.06;
      ctx.beginPath(); ctx.moveTo(pts[k - 1].x, pts[k - 1].y); ctx.lineTo(pts[k].x, pts[k].y); ctx.stroke();
    }

    const i = Math.max(0, Math.min(ROLL_N - 1, Math.round(ms)));
    const vel = rollVel[i] / Math.sqrt(SPEED.loop);                   // prototype-scale velocity
    const twist = Math.max(-1.1, Math.min(1.1, vel * 0.12));
    const lift = Math.min(1, 0.25 + Math.abs(vel) / 9);
    const angle = sampleKF(tau, 4) * Math.PI / 180;
    drawPaper(pointAt(tau), angle, rollAng[i], ms, lift, twist, baseSize() * sampleKF(tau, 3));
  }

  // Play the flight from `from` to `to` (ms of flight time) in real time.
  let raf = 0;
  function play(from, to, done) {
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const step = now => {
      const ms = from + (now - t0);
      render(Math.min(ms, to));
      if (ms < to) raf = requestAnimationFrame(step);
      else if (done) done();
    };
    raf = requestAnimationFrame(step);
  }

  // ======================================================================
  // Page plumbing
  // ======================================================================
  function clearFlag() {
    try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(TEXT_KEY); } catch (e) { /* storage blocked */ }
  }

  // ---------- Arriving ----------
  let revealed = false;
  function finish() {
    cancelAnimationFrame(raf);
    removeCanvas();
    html.classList.remove('wipe-reveal', 'wipe-pending', 'wipe-cover');
  }
  function reveal() {
    if (revealed) return;
    revealed = true;
    clearFlag();
    if (!html.classList.contains('wipe-pending') && !html.classList.contains('wipe-cover')) return;
    // the overlay starts sweeping away as the paper begins its exit
    html.style.setProperty('--overlay-delay', `${Math.max(0, EXIT - HANDOFF - 60).toFixed(0)}ms`);
    html.classList.remove('wipe-cover');
    html.classList.add('wipe-reveal');
    html.classList.remove('wipe-pending');
    const total = Math.max(DURATION - HANDOFF, EXIT - HANDOFF + OVERLAY_OUT_MS);
    if (canvas) play(HANDOFF, DURATION, () => {});
    setTimeout(finish, total + 60);
  }

  if (html.classList.contains('wipe-pending')) {
    try { mark = sessionStorage.getItem(TEXT_KEY) || mark; } catch (e) { /* default */ }
    // Show the paper where it paused, then continue once the page is ready
    // (fonts in, max ~120 ms). A failsafe never leaves the page covered.
    const ready = () => {
      if (ensureCanvas()) render(HANDOFF);
      const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([fonts, new Promise(r => setTimeout(r, 120))])
        .then(() => requestAnimationFrame(() => requestAnimationFrame(reveal)));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
    setTimeout(reveal, 1500);
  } else {
    clearFlag();
  }

  // Coming back via the back/forward cache: the page was frozen mid-cover.
  window.addEventListener('pageshow', e => {
    if (e.persisted && (html.classList.contains('wipe-cover') || html.classList.contains('wipe-pending'))) {
      revealed = false;
      reveal();
    }
  });
  window.addEventListener('resize', () => { if (canvas) sizeCanvas(); });

  // ---------- Leaving ----------
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    // same page (only the #hash differs): let the browser scroll as usual
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (reduced()) return;

    e.preventDefault();
    let next = mark;
    while (next === mark && EMOJIS.length > 1) next = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    mark = next;                                   // never the same emoji twice in a row
    try { sessionStorage.setItem(KEY, '1'); sessionStorage.setItem(TEXT_KEY, mark); } catch (err) { /* still navigate */ }
    html.classList.remove('wipe-reveal', 'wipe-pending');
    html.classList.add('wipe-cover');
    if (ensureCanvas()) play(0, HANDOFF);
    setTimeout(() => { location.href = url.href; }, HANDOFF);
  });

})();
