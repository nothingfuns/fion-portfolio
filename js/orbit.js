// Landing-page hero: project pages fly on a spiral around the headline.
// Pages emerge small and dim from the centre, sweep outward, and bend
// like paper as they pass the camera. Scroll spins it; click a page to
// open its case study.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

// Add / reorder pages here. Images live in assets/images/orbit/
// (small WebP copies, ~720px max, so the hero stays light).
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
].map(([file, key]) => ({ src: `assets/images/orbit/${file}.webp`, ...PROJECT[key] }));

const hero = document.getElementById('orbit-hero');
const canvas = hero && hero.querySelector('.orbit-canvas');
const label = hero && hero.querySelector('.orbit-label');
const copyEl = hero && hero.querySelector('.orbit-copy');
// Motion on/off is owned by js/hero.js (pause button + prefers-reduced-motion),
// which toggles `.motion-paused` on the hero. Read it every frame.
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
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 10);

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

      vec4 tex = texture2D(uMap, clamp(vUv, 0.0, 1.0));
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

  const pages = PAGES.map((page, i) => {
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: {
        uMap: { value: null }, uOpacity: { value: 0 }, uDim: { value: 1 },
        uBend: { value: 0 }, uCurl: { value: 0 }, uTime: { value: 0 },
        uPhase: { value: i * 1.7 }, uHover: { value: 0 },
        uSize: { value: new THREE.Vector2(1, 1) }, uRadius: { value: 0.08 },
        uGlow: { value: 0.28 }, uGlowColor: { value: glowColor },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    mesh.userData = { ...page, index: i, ready: 0, hover: 0, aspect: 1.33 };
    scene.add(mesh);

    loader.load(page.src, tex => {
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      material.uniforms.uMap.value = tex;
      mesh.userData.aspect = tex.image.width / tex.image.height;
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
  let spreadX = 1, spreadY = 1;   // fit the spiral to the viewport shape
  let pageScale = 1;
  let activeCount = PAGES.length; // fewer pages on phones
  let heroSize = null;            // hero width/height in px
  let textRects = [];             // tight boxes around each line of copy, in hero px
  const projected = new THREE.Vector3();
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const pointer = new THREE.Vector2(0, 0);
  const parallax = new THREE.Vector2(0, 0);
  let hovered = null;
  let lastScroll = window.scrollY;

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Keep the spiral centred on the headline at every shape:
    // wide laptop → full ellipse; portrait tablet/phone → tall and narrow.
    spreadX = THREE.MathUtils.clamp(camera.aspect * 0.72, 0.34, 1.15);
    spreadY = camera.aspect < 1 ? 1.12 : 1;
    pageScale = THREE.MathUtils.clamp(camera.aspect * 0.85, 0.62, 1);
    activeCount = w < 720 ? 8 : PAGES.length;
    pages.forEach((m, i) => { m.userData.active = i < activeCount; });
    measureText();
  }
  // Line boxes of the actual words (not the full-width blocks), padded a little.
  function measureText() {
    const hr = hero.getBoundingClientRect();
    heroSize = { w: hr.width, h: hr.height };
    const pad = 28;              // fade starts just before a page reaches a word
    textRects = [];
    const add = r => {
      if (r.width < 2) return;
      textRects.push({ left: r.left - hr.left - pad, right: r.right - hr.left + pad, top: r.top - hr.top - pad, bottom: r.bottom - hr.top + pad });
    };
    // Pills and the button: their own boxes.
    copyEl.querySelectorAll('.tag, .btn').forEach(el => add(el.getBoundingClientRect()));
    // Headline + paragraph: only the text itself (block wrappers are full-width).
    copyEl.querySelectorAll('.orbit-heading, .hero-copy').forEach(el => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) add(r);
      }
    });
  }

  resize();
  window.addEventListener('resize', resize);
  // Web fonts / wrapping can move the copy after first layout.
  new ResizeObserver(() => resize()).observe(copyEl);

  window.addEventListener('scroll', () => {
    const delta = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (isPaused()) return;
    offset = (offset + delta * 0.00045 + 1) % 1;   // scrolling spins the spiral
    flutter = Math.min(1, flutter + Math.abs(delta) * 0.004);
  }, { passive: true });

  // Where page i sits for a given spiral progress u (0 = deep centre, 1 = front).
  // Pages emerge small from behind the words, then swing out into the ring
  // of space around the copy and fade on the outer edge — never off-screen.
  function place(mesh, u, time) {
    const i = mesh.userData.index;
    const theta = 0.6 + u * Math.PI * 3.6;   // ~1.8 turns: big pages land all around the text
    const radius = 2.4 + u * 1.3;
    const x = Math.cos(theta) * radius * 1.35 * spreadX;
    const y = Math.sin(theta) * radius * 0.84 * spreadY;
    const z = -9 + u * 9.4;
    mesh.position.set(x, y, z);

    const size = 1.5 * pageScale;
    const a = mesh.userData.aspect;
    const s = 1 + mesh.userData.hover * 0.08;
    mesh.scale.set(size * Math.sqrt(a) * s, size / Math.sqrt(a) * s, 1);
    mesh.material.uniforms.uSize.value.set(mesh.scale.x, mesh.scale.y);
    mesh.material.uniforms.uRadius.value = Math.min(mesh.scale.x, mesh.scale.y) * 0.07;

    mesh.rotation.set(
      Math.cos(theta) * 0.35,
      -Math.sin(theta) * 0.55,
      Math.sin(theta * 0.5 + i) * 0.35
    );

    const fadeIn = THREE.MathUtils.smoothstep(u, 0.0, 0.1);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(u, 0.78, 0.95);
    mesh.userData.ready = Math.min(1, mesh.userData.ready + 0.03);

    // Pages sink back (fade to ~20%) while they pass behind the words, so the
    // copy always keeps AA contrast however bright a page is.
    let target = 1;
    if (heroSize && textRects.length) {
      projected.copy(mesh.position).project(camera);
      const sx = (projected.x + 1) / 2 * heroSize.w;
      const sy = (1 - projected.y) / 2 * heroSize.h;
      const depth = camera.position.z - mesh.position.z;
      const hh = (mesh.scale.y / 2) / (depth * tanHalfFov) * (heroSize.h / 2);
      const hw = (mesh.scale.x / 2) / (depth * tanHalfFov * camera.aspect) * (heroSize.w / 2);
      let covered = 0;   // largest share of the page sitting behind any line of text
      for (const r of textRects) {
        const ox = Math.max(0, Math.min(sx + hw, r.right) - Math.max(sx - hw, r.left)) / (2 * hw);
        const oy = Math.max(0, Math.min(sy + hh, r.bottom) - Math.max(sy - hh, r.top)) / (2 * hh);
        covered = Math.max(covered, ox * oy);
      }
      target = covered > 0 ? 0.2 : 1;
    }
    mesh.userData.textFade = THREE.MathUtils.lerp(mesh.userData.textFade ?? target, target, 0.12);
    const opacity = fadeIn * fadeOut * mesh.userData.ready * mesh.userData.textFade;

    const un = mesh.material.uniforms;
    const flat = 1 - mesh.userData.hover;
    const wave = Math.sin(time * 0.7 + i * 1.3);
    un.uOpacity.value = opacity;
    un.uDim.value = THREE.MathUtils.lerp(0.4, 1.05, THREE.MathUtils.smoothstep(u, 0.05, 0.5));
    un.uBend.value = (0.18 + 0.12 * wave + flutter * 0.35) * flat;
    un.uCurl.value = (0.12 + 0.1 * Math.sin(time * 0.5 + i)) * flat;
    un.uTime.value = time;
    un.uHover.value = mesh.userData.hover;
    mesh.renderOrder = Math.round(u * 1000);   // far pages draw first
    mesh.userData.opacity = opacity;
  }

  // ---- Hover + click ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let lastEvent = null;

  function pick(clientX, clientY) {
    if (TOUCH.matches) return null;
    const rect = hero.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
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

  // ---- Loop ----
  const clock = new THREE.Clock();
  let running = true;
  new IntersectionObserver(([entry]) => {
    running = entry.isIntersecting;
    if (running) { clock.getDelta(); requestAnimationFrame(frame); }
  }).observe(hero);

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const paused = isPaused();
    if (!paused) animTime += dt;     // paused = pages hold still, mid-flutter

    updateHover();
    speedScale = THREE.MathUtils.lerp(speedScale, hovered ? 0.15 : 1, 0.08);
    flutter *= 0.94;
    if (!paused) offset = (offset + BASE_SPEED * speedScale * dt) % 1;

    // Gentle depth parallax.
    if (!paused) parallax.lerp(pointer, 0.05);
    camera.position.x = parallax.x * 0.45;
    camera.position.y = parallax.y * 0.3;
    camera.lookAt(0, 0, 0);

    pages.forEach(mesh => {
      mesh.userData.hover = THREE.MathUtils.lerp(mesh.userData.hover, mesh === hovered ? 1 : 0, 0.12);
      if (!mesh.userData.active) { mesh.material.uniforms.uOpacity.value = 0; mesh.userData.opacity = 0; return; }
      const u = (mesh.userData.index / activeCount + offset) % 1;
      place(mesh, u, animTime);
    });

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}
