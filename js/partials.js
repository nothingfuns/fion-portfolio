// Shared header + footer, injected into every page.
// Edit ONCE here and it updates across the whole site.

function siteHeader(active) {
  const link = (href, label, key) =>
    `<a href="${href}" ${active === key ? 'aria-current="page"' : ''}>${label}</a>`;

  return `
    <div class="container">
      <a class="logo" href="${ROOT}index.html">FION</a>
      <nav class="nav-links" id="nav-links">
        ${link(ROOT + 'index.html', 'Home', 'home')}
        ${link(ROOT + 'projects.html', 'Projects', 'projects')}
        ${link(ROOT + 'about.html', 'About Me', 'about')}
        ${link(ROOT + 'contact.html', 'Contact', 'contact')}

      </nav>
      <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false">
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
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });
  }
});
