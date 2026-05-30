const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const projectGrid = document.querySelector('.project-grid');
const cards = Array.from(document.querySelectorAll('.project-card'));

function reorderPinnedCards() {
  if (!projectGrid) return;
  cards
    .sort((a, b) => Number(b.classList.contains('pinned')) - Number(a.classList.contains('pinned')))
    .forEach((card) => projectGrid.appendChild(card));
}

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });
}

reorderPinnedCards();
