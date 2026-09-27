// Home hero: motion control + the stick-figure mascot.
// A plain script (not a module) so the pause button and mascot keep
// working even if the Three.js CDN behind js/orbit.js fails to load.
//
// Motion state lives on the hero as the `.motion-paused` class:
// orbit.js and the "Make Sense" ink both read it.

(function () {
  const hero = document.getElementById('orbit-hero');
  if (!hero) return;

  // Mascot state (declared first: setPaused() resets the pose).
  // Poses: assets/images/mascot/{standing,hanging,lying,falling}.png
  const mascot = hero.querySelector('.mascot');
  const heading = hero.querySelector('.orbit-heading');
  const copy = hero.querySelector('.orbit-copy');
  const IDLE_MS = 10000;
  let pose = 'standing';
  let idleTimer = null;
  let fallen = false;

  // ---------- Pause / play (WCAG 2.2.2) ----------
  const button = hero.querySelector('.orbit-pause');
  const buttonText = hero.querySelector('.orbit-pause-text');
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const STORE_KEY = 'fion-motion';

  function storedChoice() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function store(value) {
    try { localStorage.setItem(STORE_KEY, value); } catch (e) { /* private mode: fine */ }
  }

  function setPaused(paused) {
    hero.classList.toggle('motion-paused', paused);
    if (buttonText) buttonText.textContent = paused ? 'Play motion' : 'Pause motion';
    if (paused) {
      // Paused = the calm, resting scene: mascot back on the line, standing.
      clearTimeout(idleTimer);
      fallen = false;
      if (mascot) mascot.classList.remove('is-gone');
      document.body.classList.remove('mascot-landed');
      setPose('standing');
    } else {
      wake();
    }
  }

  // An explicit choice on this site wins; otherwise follow the OS setting.
  const initial = storedChoice();
  setPaused(initial ? initial === 'paused' : reduceQuery.matches);

  reduceQuery.addEventListener('change', e => {
    if (!storedChoice()) setPaused(e.matches);
  });

  if (button) {
    button.addEventListener('click', () => {
      const paused = !hero.classList.contains('motion-paused');
      setPaused(paused);
      store(paused ? 'paused' : 'playing');
    });
  }

  // ---------- Mascot ----------
  function setPose(next) {
    if (!mascot || pose === next) return;
    mascot.classList.remove(`is-${pose}`);
    mascot.classList.add(`is-${next}`);
    pose = next;
  }

  function paused() { return hero.classList.contains('motion-paused'); }

  function wake() {
    clearTimeout(idleTimer);
    if (paused() || fallen) return;
    if (pose === 'lying') setPose('standing');
    idleTimer = setTimeout(() => { if (!paused() && !fallen && pose === 'standing') setPose('lying'); }, IDLE_MS);
  }

  if (mascot) {
    // Hovering near the headline (or focusing its link): hang off the underline.
    hero.addEventListener('pointermove', e => {
      wake();
      if (paused() || fallen) return;
      const r = heading.getBoundingClientRect();
      const near = e.clientX > r.left - 40 && e.clientX < r.right + 80 && e.clientY > r.top - 30 && e.clientY < r.bottom + 40;
      setPose(near ? 'hanging' : 'standing');
    });
    hero.addEventListener('pointerleave', () => { if (!paused() && !fallen) setPose('standing'); });
    copy.addEventListener('focusin', () => { if (!paused() && !fallen) setPose('hanging'); });
    copy.addEventListener('focusout', () => { if (!paused() && !fallen) setPose('standing'); });
    window.addEventListener('keydown', wake);

    // Scrolling away: it dives down and lands by the "Projects" title.
    window.addEventListener('scroll', () => {
      wake();
      if (paused()) return;
      const past = window.scrollY > hero.offsetHeight * 0.4;
      if (past && !fallen) {
        fallen = true;
        setPose('falling');
        mascot.classList.add('is-gone');
        document.body.classList.add('mascot-landed');
      } else if (!past && fallen) {
        fallen = false;
        mascot.classList.remove('is-gone');
        document.body.classList.remove('mascot-landed');
        setPose('standing');
      }
    }, { passive: true });

    wake();
  }
})();
