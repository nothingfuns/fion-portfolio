// Add / edit / reorder projects here — the homepage renders
// this list automatically, nothing else needs to change.
const PROJECTS = [
  {
    title: '66 Days',
    description: 'A low-friction budgeting app designed to reduce manual logging and user drop-off.',
    image: 'assets/images/thumb-66days.png',
    link: 'projects/66-days.html'
  },
  {
    title: 'Robot vs. Digital Feedback in the Classroom',
    description: 'Using an embodied robot mediator to help educators gain real-time situational awareness and connect with shy or reserved learners.',
    image: null,
    link: null
  },
  {
    title: 'Portfolio Revamp',
    description: 'From a laggy and rigid web builder to a customised personal portfolio, see my journey of building my portfolio from scratch in Figma.',
    image: null,
    link: null
  },
  {
    title: 'Car Exterior Lights',
    description: 'Reinventing automotive exterior lighting to enhance vehicle-to-vehicle communication between drivers.',
    image: null,
    link: null
  },
  {
    title: 'Redesigning EV Charging',
    description: 'A mobile, autonomous charging pod designed to decouple EV charging from fixed parking bays.',
    image: 'assets/images/thumb-ev.png',
    link: 'projects/pip.html'
  }
];

function renderProjects() {
  const list = document.getElementById('project-list');
  if (!list) return;
  list.innerHTML = PROJECTS.map(p => `
    <article class="project-card">
      <div class="project-media ${p.image ? '' : 'placeholder'}">
        ${p.image ? `<img src="${ROOT}${p.image}" alt="${p.title} preview" loading="lazy">` : 'Image coming soon'}
      </div>
      <div>
        <h3 class="project-title">${p.title}</h3>
        <p class="project-desc">${p.description}</p>
        ${p.link
          ? `<a class="btn btn-outline" href="${ROOT}${p.link}">Read More...</a>`
          : `<span class="btn btn-outline disabled">Read More...</span>`}
      </div>
    </article>
  `).join('');
}

document.addEventListener('DOMContentLoaded', renderProjects);
