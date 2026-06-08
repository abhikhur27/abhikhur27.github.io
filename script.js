const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const filterButtons = [...document.querySelectorAll('.filter-chip')];
const filterLinks = [...document.querySelectorAll('[data-filter-link]')];
const projectCards = [...document.querySelectorAll('.project-card[data-group]')];

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });
}

function applyFilter(filter) {
  filterButtons.forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  projectCards.forEach((card) => {
    const matches = filter === 'all' || card.dataset.group === filter;
    card.hidden = !matches;
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => applyFilter(button.dataset.filter || 'all'));
});

filterLinks.forEach((link) => {
  link.addEventListener('click', () => applyFilter(link.dataset.filterLink || 'all'));
});

if (filterButtons.length) {
  applyFilter('all');
}
