// Landing-page hero: project pages fly on a spiral around the headline.
// Pages emerge small and dim from the centre, sweep outward, and bend
// like paper as they pass the camera. Scroll spins it; click a page to
// open its case study.
//
// Scrolling down, the words-only transition (#flow-stage) holds on screen
// while the scroll drives three phases:
//  1. Gather — pages leave the spiral and collect into three piles, one per
//     project, peeking out from behind the bottom of the headline.
//  2. Hold — the piles rest there for a moment with the words.
//  3. Drop — the piles fall into their project cards as the list arrives: each
//     thumbnail lands exactly in its card's image frame (then the real <img>
//     takes over) and the other pages fade into it.
//
// Text protection:
//  - Hero: a page that touches the hero copy fades as a whole (to 10%), on top
//    of the hero's own dark CSS halo.
//  - Transition + project list: after the pages are drawn, soft circular glows
//    in the page background colour are painted around each block of text,
//    limiting how much of ALL the pages behind it combined can show (10% behind
//    normal text, 22% behind the big transition headline). Vivid elsewhere.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

// Add / reorder pages here. Images live in assets/images/orbit/
// (small WebP copies, ~720px max, so the hero stays light).
// A `thumb-*` file is the one that lands as its project's card image.
const PROJECT = {
  days:  { title: '66 Days',                 link: 'projects/66-days.html' },
  robot: { title: 'Embodied Robotic Mediator', link: 'projects/robotic-mediator.html' },
  ev:    { title: 'Redesigning EV Charging',  link: 'projects/pip.html' },
};
const PAGES = [
  ['thumb-66days', 'days'],
  ['thumb-flowerRobot', 'robot'],
  ['thumb-ev', 'ev'],
  ['pf-home-page-sketch', 'days'],
  ['second_iteration', 'robot'],
  ['pip-mantaray-sketch', 'ev'],
  ['pf-lofi-prototype', 'days'],
  ['initial_prototype', 'robot'],
  ['pip-final-chassis-render', 'ev'],
  ['homepage-after', 'days'],
  ['pip-exploded-view', 'ev'],
  ['pip-multi-angle-renders', 'ev'],
].map(([file, key]) => ({
  src: `assets/images/orbit/${file}.webp`, key, primary: file.startsWith('thumb-'), ...PROJECT[key],
}));

const hero = document.getElementById('orbit-hero');
const canvas = hero && hero.querySelector('.orbit-canvas');
const label = hero && hero.querySelector('.orbit-label');
const copyEl = hero && hero.querySelector('.orbit-copy');
const stage = document.getElementById('flow-stage');
// Motion on/off is owned by js/hero.js (pause button + prefers-reduced-motion),
// which toggles `.motion-paused` on the hero. Read it every frame. When paused,
// pages don't fly down and the transition collapses — cards show their images.
const isPaused = () => hero.classList.contains('motion-paused');
// On touch-first devices (phones, tablets) the pages are decorative only:
// moving tap targets are hard to hit and easy to trigger while scrolling.
// Every project is a normal link in the Projects list just below.
const TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)');

if (hero && canvas) {
  try { init(); } catch (err) { hero.classList.add('no-webgl'); console.warn(err); }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const CAM_Z = 10;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, CAM_Z);
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  renderer.autoClear = false;

  // Text-protection veil: one full-screen pass over the finished pages. Each
  // text block gets an ellipse that fully covers it (its box's corners sit on
  // the ellipse edge) and then fades out smoothly over a wide margin, so the
  // shadow reads as a soft glow rather than a box. Inside, it paints the page
  // background colour at (1 - max), so pages behind can show at most `max`.
  const MAX_ZONES = 24;
  const bgHex = (getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#151517').replace('#', '');
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {
        uZones: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Vector4()) },
        uMax: { value: new Array(MAX_ZONES).fill(1) },
        uCount: { value: 0 },
        uBg: { value: new THREE.Vector3(parseInt(bgHex.slice(0, 2), 16) / 255, parseInt(bgHex.slice(2, 4), 16) / 255, parseInt(bgHex.slice(4, 6), 16) / 255) },
      },
      vertexShader: /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        #define MAX_ZONES ${MAX_ZONES}
        uniform vec4 uZones[MAX_ZONES];   // centre x, centre y, radius x, radius y (device px)
        uniform float uMax[MAX_ZONES];
        uniform int uCount;
        uniform vec3 uBg;
        void main() {
          vec2 p = gl_FragCoord.xy;
          float veil = 0.0;
          for (int i = 0; i < MAX_ZONES; i++) {
            if (i >= uCount) break;
            vec4 z = uZones[i];
            float r = length((p - z.xy) / z.zw);          // 1 = ellipse edge
            float inside = 1.0 - smoothstep(0.95, 1.45, r);  // full inside, soft round falloff
            veil = max(veil, inside * (1.0 - uMax[i]));
          }
          if (veil <= 0.0) discard;
          gl_FragColor = vec4(uBg, veil);
        }
      `,
      transparent: true, depthTest: false, depthWrite: false,
    })
  );
  veil.frustumCulled = false;
  const veilScene = new THREE.Scene();
  veilScene.add(veil);
  const veilCam = new THREE.Camera();
  function updateVeil() {
    const un = veil.material.uniforms;
    const dpr = renderer.getPixelRatio();
    const scrollY = window.scrollY, scrollX = window.scrollX;
    let n = 0;
    for (const z of veilZones) {
      const left = z.left - scrollX, right = z.right - scrollX, top = z.top - scrollY, bottom = z.bottom - scrollY;
      const w = right - left, h = bottom - top;
      // skip zones whose soft edge is entirely off-screen
      if (bottom + h * 0.8 < 0 || top - h * 0.8 > view.h || right + w * 0.8 < 0 || left - w * 0.8 > view.w) continue;
      if (n >= MAX_ZONES) break;
      // Ellipse through the box's corners: radii = half-size × √2.
      // CSS px (top-left origin) -> device px (bottom-left origin).
      un.uZones.value[n].set(
        (left + w / 2) * dpr, (view.h - (top + h / 2)) * dpr,
        (w / 2) * Math.SQRT2 * dpr, (h / 2) * Math.SQRT2 * dpr
      );
      un.uMax.value[n] = z.max;
      n++;
    }
    un.uCount.value = n;
  }

  // Paper shader: a gentle curl along the page plus a corner lift, rounded
  // corners, and a coral glow on hover. The quad is drawn a little larger
  // than the page (uGlow margin) so the glow has room outside the edge.
  const vertexShader = /* glsl */`
    uniform float uBend;
    uniform float uCurl;
    uniform float uTime;
    uniform float uPhase;
    uniform vec2 uSize;     // page width/height in world units
    uniform float uGlow;    // glow margin in world units
    varying vec2 vUv;
    varying vec2 vLocal;    // page-local position in world units (0 = centre)
    varying float vShade;
    void main() {
      vec3 p = position;
      p.xy *= (uSize + 2.0 * uGlow) / uSize;   // grow the quad for the glow
      vUv = p.xy + 0.5;
      vLocal = p.xy * uSize;
      float curl = uBend * (p.x * p.x - 0.25);
      float corner = uCurl * pow(max(0.0, p.x + p.y), 2.0);
      float flutter = 0.04 * uBend * sin(p.x * 5.0 + uTime * 2.2 + uPhase);
      p.z += curl + corner + flutter;
      vShade = clamp(-(curl + corner) * 1.4, -0.25, 0.35);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;
  const fragmentShader = /* glsl */`
    uniform sampler2D uMap;
    uniform float uOpacity;
    uniform float uDim;
    uniform float uHover;
    uniform vec2 uSize;
    uniform float uRadius;
    uniform float uGlow;
    uniform vec3 uGlowColor;
    uniform vec2 uUvScale;    // crop the texture like CSS object-fit: cover
    uniform vec2 uUvOffset;
    varying vec2 vUv;
    varying vec2 vLocal;
    varying float vShade;

    float sdRoundBox(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    }

    void main() {
      float d = sdRoundBox(vLocal, uSize * 0.5, uRadius);
      float aa = max(fwidth(d), 1e-4);
      float inside = 1.0 - smoothstep(-aa, aa, d);        // smooth rounded edge

      vec2 uv = uUvOffset + clamp(vUv, 0.0, 1.0) * uUvScale;
      vec4 tex = texture2D(uMap, uv);
      float light = uDim * (1.0 - vShade * 0.6) + uHover * 0.12;
      vec3 page = tex.rgb * light;
      // thin coral rim just inside the edge while hovered
      float rim = uHover * (1.0 - smoothstep(0.0, 0.035, -d));
      page = mix(page, uGlowColor, rim * 0.9);

      // soft coral glow outside the edge while hovered
      float outside = clamp(d, 0.0, uGlow);
      float glow = uHover * pow(1.0 - outside / uGlow, 2.2) * 0.8 * (1.0 - inside);

      float aPage = inside * tex.a;
      float a = aPage + glow;
      vec3 col = (page * aPage + uGlowColor * glow) / max(a, 1e-4);
      gl_FragColor = vec4(col, a * uOpacity);
    }
  `;

  // Glow colour follows the site's --accent token (raw sRGB, like the textures).
  const accentHex = (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f99094').replace('#', '');
  const glowColor = new THREE.Vector3(
    parseInt(accentHex.slice(0, 2), 16) / 255,
    parseInt(accentHex.slice(2, 4), 16) / 255,
    parseInt(accentHex.slice(4, 6), 16) / 255
  );

  const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
  const loader = new THREE.TextureLoader();
  const stackIndex = {};          // position of each secondary page in its project's stack

  const pages = PAGES.map((page, i) => {
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: {
        uMap: { value: null }, uOpacity: { value: 0 }, uDim: { value: 1 },
        uBend: { value: 0 }, uCurl: { value: 0 }, uTime: { value: 0 },
        uPhase: { value: i * 1.7 }, uHover: { value: 0 },
        uSize: { value: new THREE.Vector2(1, 1) }, uRadius: { value: 0.08 },
        uGlow: { value: 0.28 }, uGlowColor: { value: glowColor },
        uUvScale: { value: new THREE.Vector2(1, 1) }, uUvOffset: { value: new THREE.Vector2(0, 0) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    const stack = page.primary ? 0 : (stackIndex[page.key] = (stackIndex[page.key] || 0) + 1);
    mesh.userData = { ...page, index: i, stack, ready: 0, loaded: false, hover: 0, aspect: 1.33 };
    scene.add(mesh);

    loader.load(page.src, tex => {
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      material.uniforms.uMap.value = tex;
      mesh.userData.aspect = tex.image.width / tex.image.height;
      mesh.userData.loaded = true;
      mesh.visible = true;
    });
    return mesh;
  });

  // ---- Motion state ----
  let offset = 0;                 // position along the spiral (0–1 wraps)
  let flutter = 0;                // extra bend while scrolling, decays
  let speedScale = 1;             // eases down while a page is hovered
  const BASE_SPEED = 0.016;
  let animTime = 0;               // only advances while motion is playing
  let spreadX = 1, spreadY = 1;   // fit the spiral to the hero's shape
  let pageScale = 1;
  let activeCount = PAGES.length; // fewer pages on phones
  let view = { w: 1, h: 1, k: 1 }; // viewport px, and world units per px at z = 0
  let heroRects = [];             // hero copy line boxes (pages fade as a whole), DOCUMENT px
  let veilZones = [];             // text blocks the veil protects, DOCUMENT px
  const projected = new THREE.Vector3();
  const pointer = new THREE.Vector2(0, 0);
  const parallax = new THREE.Vector2(0, 0);
  let hovered = null;
  let lastScroll = window.scrollY;
  const ORDER = Object.values(PROJECT).map(p => p.link);   // pile / card order

  if (stage) stage.classList.add('flow-ready');   // pin the transition now WebGL runs

  // Project cards are rendered by js/projects-data.js — look them up lazily.
  const cards = {};               // link -> { media, img, radius }
  function findCards() {
    let found = 0;
    ORDER.forEach(link => {
      if (cards[link]) { found++; return; }
      const a = document.querySelector(`.project-card a[href$="${link}"]`);
      const card = a && a.closest('.project-card');
      const media = card && card.querySelector('.project-media');
      const img = media && media.querySelector('img');
      if (media && img) {
        cards[link] = { media, img, radius: parseFloat(getComputedStyle(media).borderTopLeftRadius) || 28 };
        found++;
        measureText();
      }
    });
    return found;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view = { w, h, k: (2 * CAM_Z * tanHalfFov) / h };
    // Keep the spiral centred on the headline at every shape:
    // wide laptop → full ellipse; portrait tablet/phone → tall and narrow.
    const heroAspect = hero.clientWidth / Math.max(1, hero.clientHeight);
    spreadX = THREE.MathUtils.clamp(heroAspect * 0.72, 0.34, 1.15);
    spreadY = heroAspect < 1 ? 1.12 : 1;
    pageScale = THREE.MathUtils.clamp(heroAspect * 0.85, 0.62, 1);
    activeCount = w < 720 ? 8 : PAGES.length;
    pages.forEach((m, i) => { m.userData.active = i < activeCount; });
    Object.values(cards).forEach(c => { c.radius = parseFloat(getComputedStyle(c.media).borderTopLeftRadius) || 28; });
    measureText();
  }

  // Text to keep readable, in document px.
  //  - heroRects: line boxes of the hero copy; a page touching one fades whole.
  //  - veilZones: blocks of text elsewhere, each with the most the pages behind
  //    it may show (`max`): 10% behind normal text (≥ 5.7:1 for grey body copy
  //    over a white page); 22% behind the big transition headline (≥ 3.9:1,
  //    large text).
  function measureText() {
    heroRects = [];
    veilZones = [];
    const sy = window.scrollY, sx = window.scrollX;
    const box = (r, pad) => ({ left: r.left + sx - pad, right: r.right + sx + pad, top: r.top + sy - pad, bottom: r.bottom + sy + pad });
    const addHero = (r, pad) => { if (r.width >= 2) heroRects.push(box(r, pad)); };
    const addZone = (el, pad, max = 0.1) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      // shrink block-level elements to their text so the glow hugs the words
      const range = document.createRange();
      range.selectNodeContents(el);
      const t = range.getBoundingClientRect();
      veilZones.push({ ...box(t.width > 2 ? t : r, pad), max });
    };
    copyEl.querySelectorAll('.tag, .btn').forEach(el => addHero(el.getBoundingClientRect(), 28));
    copyEl.querySelectorAll('.orbit-heading, .hero-copy').forEach(el => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) addHero(r, 28);
      }
    });
    if (stage) {
      stage.querySelectorAll('.flow-eyebrow').forEach(el => addZone(el, 6));
      stage.querySelectorAll('.flow-title').forEach(el => addZone(el, 6, 0.22));
    }
    // No shadow over the project list: pages drop through it briefly and land
    // cleanly, so they simply pass behind its text without a dark patch.
  }

  resize();
  window.addEventListener('resize', resize);
  // Web fonts / wrapping / lazy images can move things after first layout.
  new ResizeObserver(() => resize()).observe(copyEl);
  new ResizeObserver(() => measureText()).observe(document.body);
  // The transition is sticky, so its words move relative to the document while
  // pinned — re-measure on scroll so the text-protection veil stays on them.
  window.addEventListener('scroll', measureText, { passive: true });

  window.addEventListener('scroll', () => {
    const delta = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (isPaused()) return;
    offset = (offset + delta * 0.00045 + 1) % 1;   // scrolling spins the spiral
    flutter = Math.min(1, flutter + Math.abs(delta) * 0.004);
  }, { passive: true });

  // Screen px (viewport) -> world position on the z = 0 plane (camera centred).
  const toWorldX = px => (px - view.w / 2) * view.k;
  const toWorldY = py => -(py - view.h / 2) * view.k;

  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = t => Math.min(1, Math.max(0, t));

  // ---- Timeline (document scroll px) ----
  // The transition is pinned from stage.offsetTop for (stage height - viewport).
  const titleEl = stage && stage.querySelector('.flow-title');
  const pin = () => ({ start: stage.offsetTop, len: Math.max(1, stage.offsetHeight - view.h) });

  // 1. Gather: from the stage entering until ~40% of the pin (lightly staggered).
  function gatherProgress(i) {
    const { start: p0, len } = pin();
    const start = Math.max(hero.offsetHeight * 0.08, p0 - view.h * 0.7) + i * 10;
    const end = p0 + len * 0.4 + i * 6;
    return clamp01((window.scrollY - start) / Math.max(1, end - start));
  }
  // 2. Hold: ~40–72% of the pin, the piles rest with the words.
  // 3. Drop: from ~72% of the pin; the first card lands in view once the list
  //    arrives, the others fall straight into their cards below.
  function landProgress(link) {
    const first = cards[ORDER[0]];
    if (!cards[link] || !first) return 0;
    const { start: p0, len } = pin();
    const r0 = first.media.getBoundingClientRect();
    const land0 = window.scrollY + r0.top + r0.height / 2 - view.h * 0.55;
    const idx = ORDER.indexOf(link);
    const start = p0 + len * 0.72 + idx * view.h * 0.04;
    const land = Math.max(start + 200, land0 + idx * view.h * 0.06);
    return clamp01((window.scrollY - start) / (land - start));
  }

  // Three piles in a row, a quarter of each tucked behind the headline's last
  // line and the rest peeking out below (screen px).
  function pileSpot(link) {
    const n = ORDER.length, idx = ORDER.indexOf(link);
    const r = titleEl.getBoundingClientRect();
    const band = Math.min(view.w * 0.84, 900);
    const w = Math.min((band / n) * 0.72, 220);
    const h = w * 0.75;
    // phones: small piles sit further below the words so they aren't all in its shadow
    const tuck = view.w < 720 ? 0.8 : 0.25;
    return { x: view.w / 2 + (idx - (n - 1) / 2) * (band / n), y: r.bottom + h * tuck, w, h };
  }

  // Spiral pose for progress u (0 = deep centre, 1 = front), around the hero's
  // centre. Pages emerge small from behind the words, then swing out into the
  // ring of space around the copy and fade on the outer edge.
  const spiral = { pos: new THREE.Vector3(), rot: new THREE.Euler(), sx: 1, sy: 1, opacity: 0, dim: 1, bend: 0, curl: 0 };
  function spiralPose(mesh, u, time, centre) {
    const i = mesh.userData.index;
    const theta = 0.6 + u * Math.PI * 3.6;   // ~1.8 turns: big pages land all around the text
    const radius = 2.4 + u * 1.3;
    spiral.pos.set(
      centre.x + Math.cos(theta) * radius * 1.35 * spreadX,
      centre.y + Math.sin(theta) * radius * 0.84 * spreadY,
      -9 + u * 9.4
    );
    const size = 1.5 * pageScale;
    const a = mesh.userData.aspect;
    const s = 1 + mesh.userData.hover * 0.08;
    spiral.sx = size * Math.sqrt(a) * s;
    spiral.sy = size / Math.sqrt(a) * s;
    spiral.rot.set(Math.cos(theta) * 0.35, -Math.sin(theta) * 0.55, Math.sin(theta * 0.5 + i) * 0.35);
    const fadeIn = THREE.MathUtils.smoothstep(u, 0.0, 0.1);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(u, 0.78, 0.95);
    spiral.opacity = fadeIn * fadeOut;
    spiral.dim = THREE.MathUtils.lerp(0.4, 1.05, THREE.MathUtils.smoothstep(u, 0.05, 0.5));
    const flat = 1 - mesh.userData.hover;
    spiral.bend = (0.18 + 0.12 * Math.sin(time * 0.7 + i * 1.3) + flutter * 0.35) * flat;
    spiral.curl = (0.12 + 0.1 * Math.sin(time * 0.5 + i)) * flat;
    return spiral;
  }

  // Quadratic curve from a to c through control b, at t.
  const curve = (out, a, b, c, t) => {
    const a1 = (1 - t) * (1 - t), a2 = 2 * (1 - t) * t, a3 = t * t;
    return out.set(a.x * a1 + b.x * a2 + c.x * a3, a.y * a1 + b.y * a2 + c.y * a3, a.z * a1 + b.z * a2 + c.z * a3);
  };
  // Crop like CSS object-fit: cover for a box of aspect boxA.
  const coverCrop = (un, texA, boxA, t) => {
    const cropX = texA > boxA ? boxA / texA : 1, cropY = texA > boxA ? 1 : texA / boxA;
    un.uUvScale.value.set(THREE.MathUtils.lerp(1, cropX, t), THREE.MathUtils.lerp(1, cropY, t));
    un.uUvOffset.value.set((1 - un.uUvScale.value.x) / 2, (1 - un.uUvScale.value.y) / 2);
  };

  // Place one page: spiral → project pile (gather, hold) → card (drop).
  const tmpPos = new THREE.Vector3(), cardPos = new THREE.Vector3(), control = new THREE.Vector3(), from = new THREE.Vector3();
  function place(mesh, u, time, centre, flowOn) {
    const d = mesh.userData;
    const sp = spiralPose(mesh, u, time, centre);
    const un = mesh.material.uniforms;
    d.ready = Math.min(1, d.ready + 0.03);
    const k = view.k;

    const g = flowOn ? easeInOut(gatherProgress(d.index)) : 0;
    const card = flowOn ? cards[d.link] : null;
    const l = card ? easeInOut(landProgress(d.link)) : 0;
    d.gather = g; d.flow = l;

    let sx = sp.sx, sy = sp.sy, opacity = sp.opacity, dim = sp.dim;
    let bend = sp.bend, curl = sp.curl, radius = Math.min(sx, sy) * 0.07;
    mesh.position.copy(sp.pos);
    mesh.rotation.copy(sp.rot);
    un.uUvScale.value.set(1, 1);
    un.uUvOffset.value.set(0, 0);

    // In a pile, the thumbnail sits on top and the other pages fan underneath.
    const turn = d.primary ? 0 : (d.stack % 2 ? 1 : -1) * (0.06 + 0.04 * d.stack);
    const nudge = d.primary ? 0 : (d.stack % 2 ? 1 : -1) * 5 * d.stack;

    // 1–2. Gather into the project's pile, then rest there.
    if (g > 0) {
      const spot = pileSpot(d.link);
      const shrink = d.primary ? 1 : 0.96;
      tmpPos.set(toWorldX(spot.x + nudge), toWorldY(spot.y - (d.primary ? 0 : d.stack * 3)), d.primary ? 0 : -0.03 * d.stack);
      control.set((sp.pos.x + tmpPos.x) / 2, Math.max(sp.pos.y, tmpPos.y) + 0.6, (sp.pos.z + tmpPos.z) / 2 + 0.8);
      curve(mesh.position, sp.pos, control, tmpPos, g);
      // a slow "breath" once settled, so the resting piles feel alive
      const rest = g * g;
      mesh.rotation.set(
        THREE.MathUtils.lerp(sp.rot.x, 0, g),
        THREE.MathUtils.lerp(sp.rot.y, 0, g),
        THREE.MathUtils.lerp(sp.rot.z, turn + rest * 0.015 * Math.sin(time * 0.9 + d.index), g)
      );
      sx = THREE.MathUtils.lerp(sp.sx, spot.w * k * shrink, g);
      sy = THREE.MathUtils.lerp(sp.sy, spot.h * k * shrink, g);
      const drift = Math.sin(Math.PI * g);
      bend = THREE.MathUtils.lerp(sp.bend, 0, g) + drift * 0.18 + rest * 0.04 * Math.sin(time * 1.1 + d.index);
      curl = THREE.MathUtils.lerp(sp.curl, 0, g) + drift * 0.06;
      dim = THREE.MathUtils.lerp(sp.dim, 1, g);
      radius = THREE.MathUtils.lerp(radius, 12 * k, g);
      opacity = THREE.MathUtils.lerp(sp.opacity, d.primary ? 1 : 0.94, THREE.MathUtils.smoothstep(g, 0, 0.3));
      coverCrop(un, d.aspect, 4 / 3, g);
    }

    // 3. Drop into the card.
    if (l > 0) {
      const r = card.media.getBoundingClientRect();
      const shrink = d.primary ? 1 : 0.94;
      from.copy(mesh.position);
      cardPos.set(toWorldX(r.left + r.width / 2), toWorldY(r.top + r.height / 2), d.primary ? 0 : -0.03 * d.stack);
      // Curve over to the card's image column first, then settle into the frame.
      control.set(cardPos.x, (from.y + cardPos.y) / 2, (from.z + cardPos.z) / 2 + 0.6);
      curve(mesh.position, from, control, cardPos, l);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, turn * 0.6, l);
      sx = THREE.MathUtils.lerp(sx, r.width * k * shrink, l);
      sy = THREE.MathUtils.lerp(sy, r.height * k * shrink, l);
      const drift = Math.sin(Math.PI * l);
      bend = bend * (1 - l) + drift * 0.18;
      curl = curl * (1 - l) + drift * 0.06;
      radius = THREE.MathUtils.lerp(radius, card.radius * k * shrink, l);
      if (!d.primary) opacity *= 1 - THREE.MathUtils.smoothstep(l, 0.65, 1);
      coverCrop(un, d.aspect, r.width / r.height, 1);
    }

    mesh.scale.set(sx, sy, 1);
    un.uSize.value.set(sx, sy);
    un.uRadius.value = radius;

    // Hero copy: a page that touches it fades as a whole (instantly down,
    // gently back up), as in the original landing page.
    let fadeTarget = 1;
    if (heroRects.length && g < 0.5) {
      projected.copy(mesh.position).project(camera);
      const px = (projected.x + 1) / 2 * view.w;
      const py = (1 - projected.y) / 2 * view.h;
      const depth = camera.position.z - mesh.position.z;
      const hh = (sy / 2) / (depth * tanHalfFov) * (view.h / 2);
      const hw = (sx / 2) / (depth * tanHalfFov * camera.aspect) * (view.w / 2);
      const scrollY = window.scrollY, scrollX = window.scrollX;
      for (const r of heroRects) {
        const left = r.left - scrollX, right = r.right - scrollX, top = r.top - scrollY, bottom = r.bottom - scrollY;
        if (px + hw > left && px - hw < right && py + hh > top && py - hh < bottom) { fadeTarget = 0.1; break; }
      }
    }
    d.textFade = fadeTarget < (d.textFade ?? 1) ? fadeTarget : THREE.MathUtils.lerp(d.textFade ?? 1, fadeTarget, 0.12);
    opacity *= d.ready * d.textFade;
    un.uOpacity.value = opacity;
    un.uDim.value = dim;
    un.uBend.value = bend;
    un.uCurl.value = curl;
    un.uTime.value = time;
    un.uHover.value = d.hover;
    // Far spiral pages draw first; piles above them, each thumbnail on top.
    const phase = Math.max(g, l);
    mesh.renderOrder = phase > 0
      ? 1000 + Math.round(l * 400) + ORDER.indexOf(d.link) * 20 + (d.primary ? 10 : 10 - d.stack)
      : Math.round(u * 1000);
    d.opacity = opacity;
  }

  // ---- Hover + click (pointer devices, only while pages are in the hero) ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let lastEvent = null;
  let interactive = true;

  function pick(clientX, clientY) {
    if (TOUCH.matches || !interactive) return null;
    ndc.set((clientX / view.w) * 2 - 1, -(clientY / view.h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pages.filter(m => m.visible && m.userData.active && m.userData.opacity > 0.35), false);
    // Nearest page wins (highest renderOrder = closest to camera).
    hits.sort((a, b) => b.object.renderOrder - a.object.renderOrder);
    return hits.length ? hits[0].object : null;
  }

  function onInteractiveTarget(e) {
    // Let the headline's real links / buttons keep their own behaviour.
    return e.target.closest('a, button');
  }

  hero.addEventListener('pointermove', e => {
    const rect = hero.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    lastEvent = e;
  });
  hero.addEventListener('pointerleave', () => { lastEvent = null; pointer.set(0, 0); });
  TOUCH.addEventListener('change', () => { lastEvent = null; });

  hero.addEventListener('click', e => {
    if (TOUCH.matches || onInteractiveTarget(e)) return;
    const hit = pick(e.clientX, e.clientY);
    if (hit) window.location.href = hit.userData.link;
  });

  function updateHover() {
    const next = lastEvent && !onInteractiveTarget(lastEvent) ? pick(lastEvent.clientX, lastEvent.clientY) : null;
    if (next !== hovered) {
      hovered = next;
      hero.classList.toggle('is-hovering', !!hovered);
      if (hovered) label.textContent = hovered.userData.title;
    }
    if (hovered && lastEvent) {
      const rect = hero.getBoundingClientRect();
      label.style.transform = `translate(${lastEvent.clientX - rect.left + 16}px, ${lastEvent.clientY - rect.top + 18}px)`;
    }
  }

  // Card images: hidden while their thumbnail is on its way, shown once landed.
  function syncCardImages(flowOn) {
    pages.forEach(mesh => {
      const d = mesh.userData;
      if (!d.primary || !cards[d.link]) return;
      const inFlight = flowOn && d.loaded && d.active && d.flow < 0.999;
      cards[d.link].img.style.opacity = inFlight ? '0' : '';
      cards[d.link].media.classList.toggle('is-receiving', inFlight);
    });
  }
  function releaseCards() {
    Object.values(cards).forEach(({ img, media }) => { img.style.opacity = ''; media.classList.remove('is-receiving'); });
  }

  // ---- Loop: runs while the hero, the transition or the project list is on screen ----
  const clock = new THREE.Clock();
  const visible = new Set();
  let running = false;
  const watch = new IntersectionObserver(entries => {
    entries.forEach(en => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
    const next = visible.size > 0;
    if (next === running) return;
    running = next;
    canvas.style.visibility = running ? '' : 'hidden';
    if (running) { clock.getDelta(); requestAnimationFrame(frame); }
    else releaseCards();          // never leave a card image hidden off-screen
  });
  watch.observe(hero);
  if (stage) watch.observe(stage);
  const list = document.getElementById('project-list');
  if (list) watch.observe(list);

  const centre = new THREE.Vector2();
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const paused = isPaused();
    if (!paused) animTime += dt;     // paused = pages hold still, mid-flutter

    // Only fly when the transition is actually pinned (it collapses when
    // motion is paused or reduced) and the cards exist.
    const flowOn = !paused && !!stage && stage.offsetHeight > view.h * 1.2 && findCards() === ORDER.length;

    // "Keep scrolling" cue: shown while the words are held, until the drop starts.
    if (stage) {
      const { start: p0, len } = pin();
      // from when the piles have nearly gathered until just into the drop
      const held = flowOn && window.scrollY >= p0 - view.h * 0.2 && window.scrollY < p0 + len * 0.78;
      stage.classList.toggle('cue-on', held);
    }

    // The coral arrow draws itself as the transition comes up.
    if (stage) {
      const sr = stage.getBoundingClientRect();
      stage.style.setProperty('--scribble', flowOn ? clamp01((view.h - sr.top) / (view.h * 0.9)).toFixed(3) : '1');
    }

    // Pages are only clickable while they're orbiting in the hero.
    interactive = window.scrollY < hero.offsetHeight * 0.05;
    updateHover();
    speedScale = THREE.MathUtils.lerp(speedScale, hovered ? 0.15 : 1, 0.08);
    flutter *= 0.94;
    if (!paused) offset = (offset + BASE_SPEED * speedScale * dt) % 1;

    // Gentle depth parallax — eased out once pages leave the spiral, so piles
    // and landings line up pixel-true with the page.
    const leaving = flowOn ? Math.max(0, ...pages.map(m => m.userData.gather || 0)) : 0;
    if (!paused) parallax.lerp(pointer, 0.05);
    const par = 1 - Math.min(1, leaving * 4);
    camera.position.set(parallax.x * 0.45 * par, parallax.y * 0.3 * par, CAM_Z);
    camera.lookAt(0, 0, 0);

    // The spiral is centred on the hero, so it scrolls up with the headline.
    const hr = hero.getBoundingClientRect();
    centre.set(toWorldX(hr.left + hr.width / 2), toWorldY(hr.top + hr.height / 2));

    pages.forEach(mesh => {
      mesh.userData.hover = THREE.MathUtils.lerp(mesh.userData.hover, mesh === hovered ? 1 : 0, 0.12);
      if (!mesh.userData.active) { mesh.material.uniforms.uOpacity.value = 0; mesh.userData.opacity = 0; return; }
      const u = (mesh.userData.index / activeCount + offset) % 1;
      place(mesh, u, animTime, centre, flowOn);
      // Landed thumbnails hand over to the real card image.
      if (mesh.userData.primary && mesh.userData.flow >= 0.999) mesh.material.uniforms.uOpacity.value = 0;
    });
    syncCardImages(flowOn);

    renderer.clear();
    renderer.render(scene, camera);
    updateVeil();
    renderer.render(veilScene, veilCam);   // text protection over everything drawn
    requestAnimationFrame(frame);
  }
}
