const projectFilterButtons = Array.from(document.querySelectorAll('#projects .filter-btn[data-filter]'));
const cards = Array.from(document.querySelectorAll('.project-card'));
const projectSearchInput = document.getElementById('project-search-input');
const projectResultsMeta = document.getElementById('project-results-meta');
const projectEmptyState = document.getElementById('project-empty-state');
const surpriseProjectBtn = document.getElementById('surprise-project-btn');
const spotlightTitle = document.getElementById('spotlight-title');
const spotlightDescription = document.getElementById('spotlight-description');
const spotlightActions = document.getElementById('spotlight-actions');
const revealItems = Array.from(document.querySelectorAll('.reveal'));
const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const expandWritingBtn = document.getElementById('expand-writing');
const collapseWritingBtn = document.getElementById('collapse-writing');
const surpriseWritingBtn = document.getElementById('surprise-writing-btn');
const writingEntries = Array.from(document.querySelectorAll('.entry-row'));
const writingFilterButtons = Array.from(document.querySelectorAll('.writing-filter-btn'));
const writingSearchInput = document.getElementById('writing-search-input');
const writingResultsMeta = document.getElementById('writing-results-meta');
const writingSpotlightTitle = document.getElementById('writing-spotlight-title');
const writingSpotlightDescription = document.getElementById('writing-spotlight-description');
const writingSpotlightMeta = document.getElementById('writing-spotlight-meta');
const writingSpotlightOpen = document.getElementById('writing-spotlight-open');
const commitCountEl = document.getElementById('commit-count');
const commitCaptionEl = document.getElementById('commit-caption');
const commitMetaEl = document.getElementById('commit-meta');
const commitSparklineEl = document.getElementById('commit-sparkline');

let activeFilter = 'all';
let activeWritingTopic = 'all';
let currentWritingSpotlightEntry = null;

function applyProjectFilters() {
  const query = (projectSearchInput?.value || '').trim().toLowerCase();
  let visibleCount = 0;
  let firstVisible = null;

  cards.forEach((card) => {
    const categories = (card.dataset.category || '').split(' ');
    const categoryMatch = activeFilter === 'all' || categories.includes(activeFilter);
    const textMatch = !query || (card.textContent || '').toLowerCase().includes(query);
    const visible = categoryMatch && textMatch;
    if (visible) {
      visibleCount += 1;
      if (!firstVisible) firstVisible = card;
    }
    card.classList.toggle('hidden', !visible);
  });

  if (projectResultsMeta) {
    projectResultsMeta.textContent = visibleCount === cards.length ? 'Showing all projects.' : `Showing ${visibleCount} matching project${visibleCount === 1 ? '' : 's'}.`;
  }

  if (projectEmptyState) {
    projectEmptyState.classList.toggle('hidden', visibleCount > 0);
  }

  updateSpotlight(firstVisible);
}

projectFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'all';

    projectFilterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    applyProjectFilters();
  });
});

if (projectSearchInput) {
  projectSearchInput.addEventListener('input', applyProjectFilters);
}

function updateSpotlight(card) {
  cards.forEach((item) => item.classList.toggle('spotlighted', item === card));

  if (!spotlightTitle || !spotlightDescription || !spotlightActions) {
    return;
  }

  if (!card) {
    spotlightTitle.textContent = 'No projects match the current filter.';
    spotlightDescription.textContent = 'Broaden the search or switch categories to bring a project back into focus.';
    spotlightActions.innerHTML = '';
    return;
  }

  spotlightTitle.textContent = card.querySelector('h3')?.textContent || 'Project spotlight';
  spotlightDescription.textContent = card.querySelector('p:not(.stack)')?.textContent || '';
  spotlightActions.innerHTML = Array.from(card.querySelectorAll('.card-actions a'))
    .map((link) => `<a href="${link.getAttribute('href')}" target="_blank" rel="noreferrer">${link.textContent}</a>`)
    .join('');
}

surpriseProjectBtn?.addEventListener('click', () => {
  const visibleCards = cards.filter((card) => !card.classList.contains('hidden'));
  if (!visibleCards.length) {
    updateSpotlight(null);
    return;
  }

  const randomCard = visibleCards[Math.floor(Math.random() * visibleCards.length)];
  updateSpotlight(randomCard);
  randomCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

function setWritingExpansion(expanded) {
  writingEntries.forEach((entry) => {
    entry.open = expanded;
  });
  expandWritingBtn?.classList.toggle('active', expanded);
  collapseWritingBtn?.classList.toggle('active', !expanded);
}

expandWritingBtn?.addEventListener('click', () => setWritingExpansion(true));
collapseWritingBtn?.addEventListener('click', () => setWritingExpansion(false));

writingEntries.forEach((entry, index) => {
  if (!entry.id) {
    entry.id = `draft-note-${index + 1}`;
  }
});

function updateWritingSpotlight(entry) {
  currentWritingSpotlightEntry = entry || null;

  if (!writingSpotlightTitle || !writingSpotlightDescription || !writingSpotlightMeta || !writingSpotlightOpen) {
    return;
  }

  if (!entry) {
    writingSpotlightTitle.textContent = 'No drafts match the current filter.';
    writingSpotlightDescription.textContent = 'Broaden the search or switch topics to bring a draft back into focus.';
    writingSpotlightMeta.textContent = 'The draft shelf is empty under the current filters.';
    writingSpotlightOpen.disabled = true;
    return;
  }

  writingSpotlightTitle.textContent = entry.querySelector('.entry-title')?.textContent || 'Draft spotlight';
  writingSpotlightDescription.textContent =
    entry.querySelector('p')?.textContent || 'Open the draft to view the current writing scaffold.';
  writingSpotlightMeta.textContent = entry.querySelector('.entry-meta')?.textContent || 'Working draft';
  writingSpotlightOpen.disabled = false;
}

function applyWritingFilters() {
  const query = (writingSearchInput?.value || '').trim().toLowerCase();
  let visibleCount = 0;
  let firstVisible = null;

  writingEntries.forEach((entry) => {
    const topic = entry.dataset.topic || 'all';
    const topicMatch = activeWritingTopic === 'all' || topic === activeWritingTopic;
    const visible = topicMatch && (!query || (entry.textContent || '').toLowerCase().includes(query));
    entry.classList.toggle('hidden', !visible);
    if (visible) {
      visibleCount += 1;
      if (!firstVisible) firstVisible = entry;
    }
  });

  if (writingResultsMeta) {
    writingResultsMeta.textContent =
      visibleCount === writingEntries.length
        ? 'Showing all draft notes.'
        : `Showing ${visibleCount} matching draft${visibleCount === 1 ? '' : 's'}.`;
  }

  updateWritingSpotlight(firstVisible);
}

writingSearchInput?.addEventListener('input', applyWritingFilters);
writingFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeWritingTopic = button.dataset.topic || 'all';
    writingFilterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    applyWritingFilters();
  });
});

surpriseWritingBtn?.addEventListener('click', () => {
  const visibleEntries = writingEntries.filter((entry) => !entry.classList.contains('hidden'));
  if (!visibleEntries.length) {
    updateWritingSpotlight(null);
    return;
  }

  const randomEntry = visibleEntries[Math.floor(Math.random() * visibleEntries.length)];
  updateWritingSpotlight(randomEntry);
  randomEntry.open = true;
  randomEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

writingSpotlightOpen?.addEventListener('click', () => {
  if (!currentWritingSpotlightEntry) return;
  currentWritingSpotlightEntry.open = true;
  currentWritingSpotlightEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

applyProjectFilters();
applyWritingFilters();
loadGithubPulse();




