// Add / edit entries here — About page renders them automatically.

const EXPERIENCE = [
  {
    role: 'UX Designer',
    org: 'GovTech Girls-In-Tech Program',
    place: 'Singapore',
    dates: 'May 2026 – Aug 2026',
    bullets: [
      'Migrated and modernized a web portfolio from Google Sites to a custom Figma-based solution to overcome structural rigidity and improve the loading performance of media-heavy pages.',
      'Built a design system with reusable components, utilizing Auto Layout with dynamic constraints to ensure scalable and consistent interface construction.',
      'Optimized design workflow by integrating AI tools to accelerate ideation and asset generation.'
    ]
  },
  {
    role: 'UI/UX Design Intern',
    org: 'Home Team Science and Technology Agency (HTX)',
    place: 'Singapore',
    dates: 'Aug 2025 – Present',
    bullets: [
      'Designed informative one-pagers and 3D visualisations using Blender and Adobe Illustrator to communicate complex startup technologies to non-technical audiences.',
      'Conducted country-level research on innovation and science & technology ecosystems across the UK and Europe to inform startup collaboration strategies.',
      'Researched and synthesised emerging technologies such as radio-frequency sensing and immersive displays, tailoring content and visuals to target audiences.'
    ]
  },
  {
    role: 'Graphics Design and Scientific Data Analysis Intern',
    org: 'Singapore University of Technology and Design',
    place: 'Singapore',
    dates: 'Jun – Aug 2024',
    bullets: [
      'Worked closely with Professor and PhD students to present computational chemistry data in a visually appealing manner for a research paper.',
      'Visualised complex computational chemistry data using Matlab and Adobe tools to enhance clarity and visual communication in research publications.'
    ]
  }
];

const EDUCATION = [
  {
    org: 'Singapore University of Technology and Design',
    place: 'Singapore',
    dates: 'Sept 2023 – May 2027',
    title: 'Bachelor of Science (Design and Artificial Intelligence)',
    tags: ['GPA 4.43/5.0', 'Global Merit Scholar'],
    bullets: []
  },
  {
    org: 'Chalmers University of Technology',
    place: 'Gothenburg, Sweden',
    dates: 'Jan 2026 – Jun 2026',
    title: 'Exchange',
    tags: [],
    bullets: [
      'Broadened design perspectives through specialized interaction and industrial design coursework, fully immersing in Swedish culture and academic methodologies.',
      '<strong>Design for Experience (Grade 5):</strong> Reinvented automotive exterior lighting to enhance vehicle-to-vehicle (V2V) communication among drivers. Conducted rigorous user studies utilizing UX Curves and AttrakDiff, applied ideation techniques like Dreamscape, and pitched final concepts directly to Lynk & Co.',
      '<strong>Human-Robot Interaction (Grade 5):</strong> Designed educational robotics concepts to assist teachers in monitoring student comprehension. The research addressed cultural barriers and social anxieties (fear of peer judgment) that prevent students from raising their hands in class.',
      '<strong>Activities & Societies:</strong> Active participant in the campus volleyball community.'
    ]
  },
  {
    org: 'Singapore Management University × Universiti Brunei Darussalam',
    place: 'Singapore & Brunei',
    dates: 'Jun – Jul 2024',
    title: 'TF LEaRN Summer Program',
    tags: [],
    bullets: [
      '1-month cultural immersion program (2 weeks in Brunei, 2 weeks in SMU) focused on digital transformation in E-business and artificial intelligence.',
      'Awarded to only 3 students in SUTD.'
    ]
  },
  {
    org: 'School of the Arts Singapore',
    place: 'Singapore',
    dates: 'Jan 2017 – Nov 2022',
    title: 'International Baccalaureate (IB) — Visual Arts Specialisation',
    tags: ['IB Score: 40/45'],
    bullets: [
      '6 HL Visual Arts, 6 HL Chemistry, 6 HL Mathematics AA.',
      'Distinction in Visual Arts (2020).',
      'Distinction in CAS — Community Service (2022).'
    ]
  }
];

function renderTimeline(containerId, items, isExperience) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map(item => `
    <div class="timeline-card">
      <div class="timeline-head">
        <div>
          <div class="timeline-role">${isExperience ? item.org : item.org}</div>
          <div class="timeline-place">${item.place}</div>
        </div>
        <div class="timeline-dates">${item.dates}</div>
      </div>
      <div class="timeline-title">${isExperience ? item.role : item.title}</div>
      ${item.tags && item.tags.length ? `<div class="timeline-tags">${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
      ${item.bullets && item.bullets.length ? `<ul>${item.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderTimeline('experience-list', EXPERIENCE, true);
  renderTimeline('education-list', EDUCATION, false);
});
