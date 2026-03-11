const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
const cards = Array.from(document.querySelectorAll('.project-card'));
const revealItems = Array.from(document.querySelectorAll('.reveal'));
const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');

    cards.forEach((card) => {
      if (filter === 'all') {
        card.classList.remove('hidden');
        return;
      }

      const categories = (card.dataset.category || '').split(' ');
      card.classList.toggle('hidden', !categories.includes(filter));
    });
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  },
  { threshold: 0.12 }
);

revealItems.forEach((item) => observer.observe(item));

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isExpanded));
    nav.classList.toggle('open', !isExpanded);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    });
  });
}