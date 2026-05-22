const projectFilterButtons = Array.from(document.querySelectorAll('#projects .filter-btn[data-filter]'));
const cards = Array.from(document.querySelectorAll('.project-card'));
const projectSearchInput = document.getElementById('project-search-input');
const projectResultsMeta = document.getElementById('project-results-meta');
const projectEmptyState = document.getElementById('project-empty-state');
const surpriseProjectBtn = document.getElementById('surprise-project-btn');
const copyProjectViewBtn = document.getElementById('copy-project-view-btn');
const writingFilterButtons = Array.from(document.querySelectorAll('.writing-filter-btn'));
const writingCards = Array.from(document.querySelectorAll('.writing-card'));
const writingSearchInput = document.getElementById('writing-search-input');
const writingResultsMeta = document.getElementById('writing-results-meta');
const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');

let activeFilter = 'all';
let activeWritingFilter = 'all';

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

function applyWritingFilters() {
  const query = (writingSearchInput?.value || '').trim().toLowerCase();
  let visibleCount = 0;

  writingCards.forEach((card) => {
    const topics = (card.dataset.topic || '').split(' ');
    const matchesTopic = activeWritingFilter === 'all' || topics.includes(activeWritingFilter);
    const searchableText = `${card.textContent || ''} ${card.dataset.writingContent || ''}`.toLowerCase();
    const matchesQuery = !query || searchableText.includes(query);
    const visible = matchesTopic && matchesQuery;

    card.classList.toggle('hidden', !visible);
    if (visible) {
      visibleCount += 1;
    }
  });

  if (writingResultsMeta) {
    writingResultsMeta.textContent = visibleCount === writingCards.length
      ? 'Showing all portfolio notes.'
      : `Showing ${visibleCount} matching note${visibleCount === 1 ? '' : 's'}.`;
  }
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
writingSearchInput?.addEventListener('input', applyWritingFilters);

writingFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeWritingFilter = button.dataset.writingFilter || 'all';
    writingFilterButtons.forEach((item) => {
      item.classList.toggle('active', item === button);
    });
    applyWritingFilters();
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
applyWritingFilters();
