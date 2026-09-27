// Shared header + footer, injected into every page.
// Edit ONCE here and it updates across the whole site.

// One hand-drawn coral stroke for the whole nav: it sits under the current
// page and glides to whichever link you hover or focus.
const NAV_INK = '<svg class="nav-ink" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
  + '<path d="M2 7 C 25 3, 50 10, 75 5 S 95 6, 98 5"/></svg>';

// Hover / focus: a coral hand-drawn loop scribbles around the word.
const NAV_DOODLE = '<svg class="nav-doodle" viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
  + '<path pathLength="1" d="M 18 30 C 4 16, 30 4, 62 5 C 98 6, 118 16, 110 29 C 102 41, 58 44, 28 38 C 14 35, 10 28, 22 20"/></svg>';

function siteHeader(active) {
  let i = 0;
  // Current page gets aria-current="page"; inside a case study, "Projects" is
  // the current section (aria-current="true").
  const inProjects = location.pathname.includes('/projects/');
  const current = key => active === key ? 'aria-current="page"'
    : key === 'projects' && inProjects ? 'aria-current="true"' : '';
  const link = (href, label, key) =>
    `<a href="${href}" style="--i:${i++}" ${current(key)}><span class="nav-label">${label}</span>${NAV_DOODLE}</a>`;

  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="container">
      <a class="logo" href="${ROOT}index.html">FION</a>
      <nav class="nav-links" id="nav-links">
        ${NAV_INK}
        ${link(ROOT + 'index.html', 'Home', 'home')}
        ${link(ROOT + 'projects.html', 'Projects', 'projects')}
        ${link(ROOT + 'about.html', 'About Me', 'about')}
        ${link(ROOT + 'contact.html', 'Contact', 'contact')}

      </nav>
      <div class="nav-backdrop" id="nav-backdrop" aria-hidden="true"></div>
      <button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-controls="nav-links" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;
}

function siteFooter() {
  return `
    <div class="container">
      <a class="footer-talk" href="${ROOT}contact.html">Let's Talk!</a>
      <div class="footer-contact">
        <a href="https://www.linkedin.com/in/goykaixuan/" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-6.9c0-1.65-.03-3.77-2.3-3.77-2.3 0-2.65 1.8-2.65 3.65V23h-4V8z"/></svg>
        </a>

        <a href="mailto:goyfion@gmail.com">goyfion@gmail.com</a>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');
  if (headerEl) headerEl.innerHTML = siteHeader(headerEl.dataset.active);
  if (footerEl) footerEl.innerHTML = siteFooter();

  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    // Phone menu = a drawer from the right. While it's open, everything else
    // is made inert (can't be tapped, clicked or tabbed to) and the page
    // behind it can't scroll; tapping the dimmed backdrop closes it.
    const backdrop = document.getElementById('nav-backdrop');
    const behind = () => [document.querySelector('main'), document.getElementById('site-footer'),
      headerEl && headerEl.querySelector('.logo'), headerEl && headerEl.querySelector('.skip-link')].filter(Boolean);
    const setOpen = open => {
      const wasOpen = links.classList.contains('open');
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      document.documentElement.classList.toggle('nav-open', open);
      behind().forEach(el => { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
      if (open && !wasOpen) links.querySelector('a').focus({ preventScroll: true });
    };
    if (backdrop) backdrop.addEventListener('click', () => setOpen(false));
    // back on a wide screen, the drawer doesn't apply: make sure nothing stays locked
    window.matchMedia('(min-width: 769px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => setOpen(false))
    );
    // Escape closes the menu and returns focus to the button.
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    // Tapping outside the header closes it too.
    document.addEventListener('click', e => {
      if (links.classList.contains('open') && !e.target.closest('#site-header')) setOpen(false);
    });
  }

  // Ink stroke: underlines the current page only (hovering is shown
  // differently, in css/style.css). Positions use offsets (not bounding boxes)
  // so they stay correct while the mobile menu is mid-unfold.
  const ink = links && links.querySelector('.nav-ink');
  if (ink) {
    const current = links.querySelector('a[aria-current]');
    const moveInk = (target, instant) => {
      if (!target) { ink.classList.remove('is-on'); return; }
      const label = target.querySelector('.nav-label') || target;
      const x = target.offsetLeft + label.offsetLeft;
      const y = target.offsetTop + label.offsetTop + label.offsetHeight + 2;
      if (instant) ink.classList.add('no-glide');
      ink.style.width = `${label.offsetWidth}px`;
      ink.style.transform = `translate(${x}px, ${y}px)`;
      ink.classList.add('is-on');
      if (instant) requestAnimationFrame(() => requestAnimationFrame(() => ink.classList.remove('no-glide')));
    };
    const settle = () => moveInk(current, true);
    settle();
    window.addEventListener('resize', settle);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  }

  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });
  }
});
