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

function buildDailyBuckets() {
  const now = new Date();
  const buckets = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - offset);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    buckets.push({
      label: formatShortDate(dayStart),
      count: 0,
      start: dayStart.getTime(),
      end: dayEnd.getTime(),
    });
  }

  return buckets;
}

function buildPulsePayloadFromCommitItems(items) {
  const dailyCommits = buildDailyBuckets();
  const repoSet = new Set();
  let commitCount = 0;
  let mostRecentTs = 0;

  items.forEach((item) => {
    const dateRaw = item?.commit?.committer?.date || item?.commit?.author?.date;
    if (!dateRaw) return;

    const timestamp = new Date(dateRaw).getTime();
    if (!Number.isFinite(timestamp)) return;

    const bucket = dailyCommits.find((entry) => timestamp >= entry.start && timestamp < entry.end);
    if (!bucket) return;

    bucket.count += 1;
    commitCount += 1;
    mostRecentTs = Math.max(mostRecentTs, timestamp);

    const repoName = item?.repository?.full_name;
    if (repoName) {
      repoSet.add(repoName);
    }
  });

  return {
    commitCount,
    repoCount: repoSet.size,
    dailyCommits: dailyCommits.map((entry) => ({ label: entry.label, count: entry.count })),
    mostRecent: mostRecentTs ? new Date(mostRecentTs).toISOString() : null,
    source: 'search',
  };
}

function buildPulsePayloadFromEvents(events) {
  const now = new Date();
  const msInDay = 1000 * 60 * 60 * 24;
  const startWindow = new Date(now.getTime() - msInDay * 7);
  const pushEvents = events.filter((event) => event.type === 'PushEvent');
  const recent = pushEvents.filter((event) => new Date(event.created_at) >= startWindow);
  const dailyCommits = buildDailyBuckets().map((entry) => ({ ...entry }));

  let commitCount = 0;
  recent.forEach((event) => {
    const timestamp = new Date(event.created_at).getTime();
    const bucket = dailyCommits.find((entry) => timestamp >= entry.start && timestamp < entry.end);
    const pushed = Number(event.payload?.size) || 0;
    if (bucket) {
      bucket.count += pushed;
    }
    commitCount += pushed;
  });

  const repoCount = new Set(recent.map((event) => event.repo?.name).filter(Boolean)).size;
  const mostRecent = recent[0]?.created_at ? new Date(recent[0].created_at).toISOString() : null;

  return {
    commitCount,
    repoCount,
    dailyCommits: dailyCommits.map((entry) => ({ label: entry.label, count: entry.count })),
    mostRecent,
    source: 'events',
  };
}

async function loadGithubPulse() {
  if (!commitCountEl || !commitCaptionEl || !commitMetaEl || !commitSparklineEl) {
    return;
  }

  const username = 'abhikhur27';
  const cacheKey = 'portfolio_github_pulse_v2';
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
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);
    const sinceIso = since.toISOString();
    const encodedQuery = encodeURIComponent(`author:${username} committer-date:>=${sinceIso}`);
    const baseUrl = `https://api.github.com/search/commits?q=${encodedQuery}&sort=committer-date&order=desc&per_page=100`;

    const firstResponse = await fetch(`${baseUrl}&page=1`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!firstResponse.ok) {
      throw new Error(`GitHub search status ${firstResponse.status}`);
    }

    const firstPage = await firstResponse.json();
    const totalCount = Number(firstPage.total_count) || 0;
    const maxPages = Math.min(5, Math.ceil(Math.min(totalCount, 500) / 100));
    let items = Array.isArray(firstPage.items) ? firstPage.items : [];

    if (maxPages > 1) {
      const pageRequests = [];
      for (let page = 2; page <= maxPages; page += 1) {
        pageRequests.push(
          fetch(`${baseUrl}&page=${page}`, { headers: { Accept: 'application/vnd.github+json' } }).then((response) => {
            if (!response.ok) throw new Error(`GitHub search status ${response.status}`);
            return response.json();
          })
        );
      }

      const pages = await Promise.all(pageRequests);
      pages.forEach((page) => {
        items = items.concat(Array.isArray(page.items) ? page.items : []);
      });
    }

    const payload = buildPulsePayloadFromCommitItems(items);
    sessionStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: now, payload }));
    renderGithubPulse(payload);
    return;
  } catch (searchError) {
    // Fall back to push events if commit search is rate-limited.
  }

  try {
    const eventsResponse = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!eventsResponse.ok) {
      throw new Error(`GitHub events status ${eventsResponse.status}`);
    }

    const events = await eventsResponse.json();
    const payload = buildPulsePayloadFromEvents(events);
    sessionStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: now, payload }));
    renderGithubPulse(payload);
  } catch (error) {
    commitCountEl.textContent = 'Live';
    commitCaptionEl.textContent = 'GitHub activity online';
    commitMetaEl.textContent = 'GitHub API is rate-limited right now. Open my profile for full commit history.';
    commitSparklineEl.innerHTML = '';
  }
}

function renderGithubPulse(payload) {
  commitCountEl.textContent = String(payload.commitCount);
  commitCaptionEl.textContent =
    payload.source === 'events' ? 'Push-estimated commits in last 7 days' : 'Commits in last 7 days';

  const latestText = payload.mostRecent
    ? `Last commit ${formatShortDate(new Date(payload.mostRecent))}`
    : 'No commits in the last 7 days';
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
