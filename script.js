const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const highlightedClass = 'highlighted';

if (navToggle && nav) {
  const closeNav = () => {
    navToggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  };

  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNav();
    }
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('open')) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!nav.contains(target) && !navToggle.contains(target)) {
      closeNav();
    }
  });
}

const sectionLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
const observedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter((section) => section instanceof HTMLElement);
const projectSearchInput = document.getElementById('project-search-input');
const projectSearchClearBtn = document.getElementById('project-search-clear');
const projectSearchStatus = document.getElementById('project-search-status');
const projectCards = Array.from(document.querySelectorAll('.project-card'));
const browserProjectsDisclosure = document.querySelector('.project-disclosure');

if (sectionLinks.length && observedSections.length && 'IntersectionObserver' in window) {
  const setCurrentSection = (id) => {
    sectionLinks.forEach((link) => {
      link.classList.toggle('is-current', link.getAttribute('href') === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible?.target?.id) {
        setCurrentSection(visible.target.id);
      }
    },
    { rootMargin: '-25% 0px -55% 0px', threshold: [0.2, 0.45, 0.7] }
  );

  observedSections.forEach((section) => observer.observe(section));
  setCurrentSection(window.location.hash.replace('#', '') || observedSections[0].id);
}

function highlightTargetCard() {
  document.querySelectorAll(`.${highlightedClass}`).forEach((card) => {
    card.classList.remove(highlightedClass);
  });

  const targetId = window.location.hash.replace('#', '');
  if (!targetId) return;
  const target = document.getElementById(targetId);
  if (!target || !target.classList.contains('project-card')) return;
  const disclosure = target.closest('details');
  if (disclosure) {
    disclosure.open = true;
  }
  target.classList.add(highlightedClass);
}

window.addEventListener('hashchange', highlightTargetCard);
highlightTargetCard();

function applyProjectSearch(query) {
  const normalized = query.trim().toLowerCase();
  let visibleCount = 0;
  let hiddenBrowserMatches = 0;

  projectCards.forEach((card) => {
    const haystack = (card.textContent || '').toLowerCase();
    const matches = !normalized || haystack.includes(normalized);
    card.hidden = !matches;
    if (matches) {
      visibleCount += 1;
      if (browserProjectsDisclosure?.contains(card)) {
        hiddenBrowserMatches += 1;
      }
    }
  });

  if (browserProjectsDisclosure instanceof HTMLDetailsElement) {
    browserProjectsDisclosure.open = Boolean(normalized && hiddenBrowserMatches);
  }

  if (projectSearchStatus) {
    if (!normalized) {
      projectSearchStatus.textContent = 'Showing all projects.';
    } else if (visibleCount === 0) {
      projectSearchStatus.textContent = `No projects matched "${query.trim()}".`;
    } else {
      projectSearchStatus.textContent = `Showing ${visibleCount} project${visibleCount === 1 ? '' : 's'} for "${query.trim()}".`;
    }
  }
}

projectSearchInput?.addEventListener('input', () => {
  applyProjectSearch(projectSearchInput.value);
});

projectSearchClearBtn?.addEventListener('click', () => {
  if (!projectSearchInput) return;
  projectSearchInput.value = '';
  applyProjectSearch('');
  projectSearchInput.focus();
});

applyProjectSearch('');
