const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
const cards = Array.from(document.querySelectorAll('.project-card'));
const revealItems = Array.from(document.querySelectorAll('.reveal'));
const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const commitCountEl = document.getElementById('commit-count');
const commitCaptionEl = document.getElementById('commit-caption');
const commitMetaEl = document.getElementById('commit-meta');
const commitSparklineEl = document.getElementById('commit-sparkline');

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

function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function loadGithubPulse() {
  if (!commitCountEl || !commitCaptionEl || !commitMetaEl || !commitSparklineEl) {
    return;
  }

  const username = 'abhikhur27';
  const cacheKey = 'portfolio_github_pulse_v1';
  const cacheAgeMs = 1000 * 60 * 25;
  const now = Date.now();

  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
    if (cached && now - cached.fetchedAt < cacheAgeMs) {
      renderGithubPulse(cached.payload);
      return;
    }
  } catch (error) {
    // Cache decode failure is non-fatal.
  }

  try {
    const response = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API status ${response.status}`);
    }

    const events = await response.json();
    const payload = buildPulsePayload(events);
    sessionStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: now, payload }));
    renderGithubPulse(payload);
  } catch (error) {
    commitCountEl.textContent = 'Live';
    commitCaptionEl.textContent = 'GitHub activity online';
    commitMetaEl.textContent = 'GitHub API is rate-limited right now. Open my profile for full commit history.';
    commitSparklineEl.innerHTML = '';
  }
}

function buildPulsePayload(events) {
  const now = new Date();
  const msInDay = 1000 * 60 * 60 * 24;
  const startWindow = new Date(now.getTime() - msInDay * 7);
  const pushEvents = events.filter((event) => event.type === 'PushEvent');

  const recent = pushEvents.filter((event) => new Date(event.created_at) >= startWindow);
  const commitCount = recent.reduce((sum, event) => sum + (Number(event.payload?.size) || 0), 0);
  const repoCount = new Set(recent.map((event) => event.repo?.name).filter(Boolean)).size;

  const dailyCommits = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayStart = new Date(now.getTime() - offset * msInDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + msInDay);

    const count = recent.reduce((sum, event) => {
      const created = new Date(event.created_at);
      if (created >= dayStart && created < dayEnd) {
        return sum + (Number(event.payload?.size) || 0);
      }
      return sum;
    }, 0);

    dailyCommits.push({
      label: formatShortDate(dayStart),
      count,
    });
  }

  const mostRecent = recent[0]?.created_at ? new Date(recent[0].created_at) : null;

  return {
    commitCount,
    repoCount,
    dailyCommits,
    mostRecent: mostRecent ? mostRecent.toISOString() : null,
  };
}

function renderGithubPulse(payload) {
  commitCountEl.textContent = String(payload.commitCount);
  commitCaptionEl.textContent = 'Commits in last 7 days';

  const latestText = payload.mostRecent
    ? `Last push ${formatShortDate(new Date(payload.mostRecent))}`
    : 'No push events in the last 7 days';
  commitMetaEl.textContent = `${payload.repoCount} repos touched. ${latestText}.`;

  const maxCount = Math.max(1, ...payload.dailyCommits.map((item) => item.count));
  commitSparklineEl.innerHTML = payload.dailyCommits
    .map((item) => {
      const height = Math.max(6, Math.round((item.count / maxCount) * 34));
      return `<span title="${item.label}: ${item.count} commits" style="height:${height}px"></span>`;
    })
    .join('');
}

loadGithubPulse();
