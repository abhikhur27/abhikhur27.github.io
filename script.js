const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const projectGrid = document.querySelector('.project-grid');
const projectSearch = document.getElementById('project-search');
const projectSearchStatus = document.getElementById('project-search-status');
const cards = Array.from(document.querySelectorAll('.project-card'));

function reorderPinnedCards() {
  if (!projectGrid) return;
  cards
    .sort((a, b) => Number(b.classList.contains('pinned')) - Number(a.classList.contains('pinned')))
    .forEach((card) => projectGrid.appendChild(card));
}

function filterProjects(query) {
  if (!projectGrid) return;
  const normalized = query.trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    const visible = !normalized || text.includes(normalized);
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  if (projectSearchStatus) {
    projectSearchStatus.textContent = normalized
      ? `${visibleCount} project${visibleCount === 1 ? '' : 's'} shown`
      : '';
  }
}

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });
}

if (projectSearch) {
  projectSearch.addEventListener('input', (event) => {
    filterProjects(event.target.value);
  });
}

reorderPinnedCards();
