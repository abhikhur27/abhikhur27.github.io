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
