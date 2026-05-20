const projectFilterButtons = Array.from(document.querySelectorAll('#projects .filter-btn[data-filter]'));
const cards = Array.from(document.querySelectorAll('.project-card'));
const projectSearchInput = document.getElementById('project-search-input');
const projectResultsMeta = document.getElementById('project-results-meta');
const projectEmptyState = document.getElementById('project-empty-state');
const surpriseProjectBtn = document.getElementById('surprise-project-btn');
const copyProjectViewBtn = document.getElementById('copy-project-view-btn');
const quickPickButtons = Array.from(document.querySelectorAll('.quick-pick-btn'));
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

async function copyCurrentView() {
  updateUrlState();

  try {
    await navigator.clipboard.writeText(window.location.href);
    if (projectResultsMeta) {
      projectResultsMeta.textContent = 'Copied the current project view link.';
    }
  } catch {
    if (projectResultsMeta) {
      projectResultsMeta.textContent = 'Clipboard copy failed for the current project view link.';
    }
  }
}

function applyProjectFilters() {
  const query = (projectSearchInput?.value || '').trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach((card) => {
    const categories = (card.dataset.category || '').split(' ');
    const categoryMatch = activeFilter === 'all' || categories.includes(activeFilter);
    const textMatch = !query || (card.textContent || '').toLowerCase().includes(query);
    const visible = categoryMatch && textMatch;

    card.classList.toggle('hidden', !visible);

    if (visible) {
      visibleCount += 1;
    }
  });

  if (projectResultsMeta) {
    projectResultsMeta.textContent = visibleCount === cards.length
      ? 'Showing all curated projects.'
      : `Showing ${visibleCount} matching project${visibleCount === 1 ? '' : 's'}.`;
  }

  if (projectEmptyState) {
    projectEmptyState.classList.toggle('hidden', visibleCount > 0);
  }

  updateUrlState();
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
copyProjectViewBtn?.addEventListener('click', copyCurrentView);

quickPickButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextFilter = button.dataset.filter || 'all';
    const nextSearch = button.dataset.search || '';
    activeFilter = nextFilter;
    if (projectSearchInput) {
      projectSearchInput.value = nextSearch;
    }
    projectFilterButtons.forEach((item) => {
      item.classList.toggle('active', item.dataset.filter === nextFilter);
    });
    applyProjectFilters();
    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

surpriseProjectBtn?.addEventListener('click', () => {
  const visibleCards = cards.filter((card) => !card.classList.contains('hidden'));
  if (!visibleCards.length) return;

  const randomCard = visibleCards[Math.floor(Math.random() * visibleCards.length)];
  randomCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  randomCard.classList.add('highlighted');
  window.setTimeout(() => randomCard.classList.remove('highlighted'), 1600);
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

  if (projectFilter) {
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
