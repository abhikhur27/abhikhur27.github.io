const projectFilterButtons = Array.from(document.querySelectorAll('#projects .filter-btn[data-filter]'));
const cards = Array.from(document.querySelectorAll('.project-card'));
const projectClearFiltersButton = document.getElementById('project-clear-filters');
const projectResultsMeta = document.getElementById('project-results-meta');
const projectEmptyState = document.getElementById('project-empty-state');
const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const projectGrid = document.querySelector('.project-grid');

let activeFilter = 'all';

function reorderPinnedCards() {
  if (!projectGrid) return;
  cards.sort((a, b) => Number(b.classList.contains('pinned')) - Number(a.classList.contains('pinned')));
  cards.forEach((card) => {
    projectGrid.appendChild(card);
  });
}

function updateFilterButtonCounts() {
  projectFilterButtons.forEach((button) => {
    const filter = button.dataset.filter || 'all';
    const baseLabel = button.dataset.label || button.textContent;
    let count = 0;

    cards.forEach((card) => {
      const categories = (card.dataset.category || '').split(' ');
      const categoryMatch = filter === 'all' || categories.includes(filter);
      if (categoryMatch) {
        count += 1;
      }
    });

    button.textContent = `${baseLabel} (${count})`;
  });
}

function updateUrlState() {
  const params = new URLSearchParams(window.location.search);

  if (activeFilter !== 'all') {
    params.set('projectFilter', activeFilter);
  } else {
    params.delete('projectFilter');
  }

  const nextUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, '', nextUrl);
}

function applyProjectFilters() {
  const totalCount = cards.length;
  let visibleCount = 0;

  cards.forEach((card) => {
    const categories = (card.dataset.category || '').split(' ');
    const categoryMatch = activeFilter === 'all' || categories.includes(activeFilter);
    const visible = categoryMatch;

    card.classList.toggle('hidden', !visible);
    if (visible) visibleCount += 1;
  });

  if (projectResultsMeta) {
    projectResultsMeta.textContent = `Showing ${visibleCount} of ${totalCount} curated project${totalCount === 1 ? '' : 's'}.`;
  }

  updateFilterButtonCounts();

  if (projectEmptyState) {
    projectEmptyState.classList.toggle('hidden', visibleCount > 0);
  }

  if (projectClearFiltersButton) {
    const hasCategory = activeFilter !== 'all';
    projectClearFiltersButton.classList.toggle('hidden', !hasCategory);
  }

  updateUrlState();
}

function resetProjectFilters() {
  activeFilter = 'all';
  projectFilterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === 'all');
  });
  applyProjectFilters();
}

projectFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'all';
    projectFilterButtons.forEach((item) => {
      item.classList.toggle('active', item === button);
    });
    applyProjectFilters();
  });
});

projectClearFiltersButton?.addEventListener('click', resetProjectFilters);

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });
}

function hydrateFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const projectFilter = params.get('projectFilter');
  const validFilters = new Set(projectFilterButtons.map((button) => button.dataset.filter || 'all'));

  if (projectFilter && validFilters.has(projectFilter)) {
    activeFilter = projectFilter;
    projectFilterButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.filter === projectFilter);
    });
  }

}

reorderPinnedCards();
hydrateFiltersFromUrl();
applyProjectFilters();
