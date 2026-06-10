const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const highlightedClass = 'highlighted';

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
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
  target.classList.add(highlightedClass);
}

window.addEventListener('hashchange', highlightTargetCard);
highlightTargetCard();
