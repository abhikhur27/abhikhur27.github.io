const projectFilterButtons = Array.from(document.querySelectorAll('#projects .filter-btn[data-filter]'));
const cards = Array.from(document.querySelectorAll('.project-card'));
const projectSearchInput = document.getElementById('project-search-input');
const projectClearFiltersButton = document.getElementById('project-clear-filters');
const projectResultsMeta = document.getElementById('project-results-meta');
const projectEmptyState = document.getElementById('project-empty-state');
const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');

let activeFilter = 'all';

function updateUrlState() {
  const params = new URLSearchParams(window.location.search);
  const projectQuery = (projectSearchInput?.value || '').trim();

  if (activeFilter !== 'all') {
    params.set('projectFilter', activeFilter);
  } else {
    params.delete('projectFilter');
  }

  if (projectQuery) {
    params.set('projectSearch', projectQuery);
  } else {
    params.delete('projectSearch');
  }

  const nextUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, '', nextUrl);
}

function applyProjectFilters() {
  const query = (projectSearchInput?.value || '').trim().toLowerCase();
  const totalCount = cards.length;
  let visibleCount = 0;

  cards.forEach((card) => {
    const categories = (card.dataset.category || '').split(' ');
    const categoryMatch = activeFilter === 'all' || categories.includes(activeFilter);
    const textMatch = !query || (card.textContent || '').toLowerCase().includes(query);
    const visible = categoryMatch && textMatch;

    card.classList.toggle('hidden', !visible);
    if (visible) visibleCount += 1;
  });

  if (projectResultsMeta) {
    projectResultsMeta.textContent = `Showing ${visibleCount} of ${totalCount} curated project${totalCount === 1 ? '' : 's'}.`;
  }

  if (projectEmptyState) {
    projectEmptyState.classList.toggle('hidden', visibleCount > 0);
  }

  if (projectClearFiltersButton) {
    const hasSearch = Boolean(query);
    const hasCategory = activeFilter !== 'all';
    projectClearFiltersButton.classList.toggle('hidden', !hasSearch && !hasCategory);
  }

  updateUrlState();
}

function resetProjectFilters() {
  activeFilter = 'all';
  projectFilterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === 'all');
  });
  if (projectSearchInput) {
    projectSearchInput.value = '';
  }
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

projectSearchInput?.addEventListener('input', applyProjectFilters);
projectClearFiltersButton?.addEventListener('click', resetProjectFilters);

document.addEventListener('keydown', (event) => {
  if (!projectSearchInput) return;
  const targetTag = event.target?.tagName?.toLowerCase();
  const isTypingField = targetTag === 'input' || targetTag === 'textarea';

  if (event.key === '/' && !isTypingField) {
    event.preventDefault();
    projectSearchInput.focus();
  }

  if (event.key === 'Escape' && document.activeElement === projectSearchInput) {
    projectSearchInput.value = '';
    applyProjectFilters();
    projectSearchInput.blur();
  }
});

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
  const projectSearch = params.get('projectSearch');
  const validFilters = new Set(projectFilterButtons.map((button) => button.dataset.filter || 'all'));

  if (projectFilter && validFilters.has(projectFilter)) {
    activeFilter = projectFilter;
    projectFilterButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.filter === projectFilter);
    });
  }

  if (projectSearch && projectSearchInput) {
    projectSearchInput.value = projectSearch;
  }
}

hydrateFiltersFromUrl();
applyProjectFilters();
