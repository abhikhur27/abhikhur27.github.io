const projectFilterButtons = Array.from(document.querySelectorAll('#projects .filter-btn[data-filter]'));
const cards = Array.from(document.querySelectorAll('.project-card'));
const projectSearchInput = document.getElementById('project-search-input');
const projectResultsMeta = document.getElementById('project-results-meta');
const projectEmptyState = document.getElementById('project-empty-state');
const surpriseProjectBtn = document.getElementById('surprise-project-btn');
const copyProjectViewBtn = document.getElementById('copy-project-view-btn');
const spotlightTitle = document.getElementById('spotlight-title');
const spotlightDescription = document.getElementById('spotlight-description');
const spotlightActions = document.getElementById('spotlight-actions');
const revealItems = Array.from(document.querySelectorAll('.reveal'));
const navToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const expandWritingBtn = document.getElementById('expand-writing');
const collapseWritingBtn = document.getElementById('collapse-writing');
const surpriseWritingBtn = document.getElementById('surprise-writing-btn');
const copyWritingViewBtn = document.getElementById('copy-writing-view-btn');
const writingEntries = Array.from(document.querySelectorAll('#writing .entry-row'));
const writingFilterButtons = Array.from(document.querySelectorAll('.writing-filter-btn'));
const writingStageButtons = Array.from(document.querySelectorAll('.writing-stage-btn'));
const writingSearchInput = document.getElementById('writing-search-input');
const writingResultsMeta = document.getElementById('writing-results-meta');
const draftStageSummary = document.getElementById('draft-stage-summary');
const draftTopicSummary = document.getElementById('draft-topic-summary');
const writingQueueList = document.getElementById('writing-queue-list');
const trailList = document.getElementById('trail-list');
const writingSpotlightTitle = document.getElementById('writing-spotlight-title');
const writingSpotlightDescription = document.getElementById('writing-spotlight-description');
const writingSpotlightMeta = document.getElementById('writing-spotlight-meta');
const writingSpotlightOpen = document.getElementById('writing-spotlight-open');
const writingSpotlightRelated = document.getElementById('writing-spotlight-related');
const commitCountEl = document.getElementById('commit-count');
const commitCaptionEl = document.getElementById('commit-caption');
const commitMetaEl = document.getElementById('commit-meta');
const commitSparklineEl = document.getElementById('commit-sparkline');

let activeFilter = 'all';
let activeWritingTopic = 'all';
let activeWritingStage = 'all';
let currentWritingSpotlightEntry = null;
let suppressUrlSync = false;

function updateUrlState() {
  if (suppressUrlSync) return;

  const params = new URLSearchParams(window.location.search);
  const projectQuery = (projectSearchInput?.value || '').trim();
  const writingQuery = (writingSearchInput?.value || '').trim();

  if (activeFilter !== 'all') params.set('projectFilter', activeFilter);
  else params.delete('projectFilter');

  if (projectQuery) params.set('projectSearch', projectQuery);
  else params.delete('projectSearch');

  if (activeWritingTopic !== 'all') params.set('writingTopic', activeWritingTopic);
  else params.delete('writingTopic');

  if (activeWritingStage !== 'all') params.set('writingStage', activeWritingStage);
  else params.delete('writingStage');

  if (writingQuery) params.set('writingSearch', writingQuery);
  else params.delete('writingSearch');

  if (currentWritingSpotlightEntry?.id) params.set('draft', currentWritingSpotlightEntry.id);
  else params.delete('draft');

  const nextUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, '', nextUrl);
}

async function copyCurrentView(label) {
  updateUrlState();

  try {
    await navigator.clipboard.writeText(window.location.href);
    const target = label === 'projects' ? projectResultsMeta : writingResultsMeta;
    if (target) {
      target.textContent = `Copied ${label} view link.`;
    }
  } catch (error) {
    const target = label === 'projects' ? projectResultsMeta : writingResultsMeta;
    if (target) {
      target.textContent = `Clipboard copy failed for the ${label} view link.`;
    }
  }
}

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
  updateUrlState();
}

function setProjectFilter(filter) {
  activeFilter = filter || 'all';
  projectFilterButtons.forEach((button) => {
    button.classList.toggle('active', (button.dataset.filter || 'all') === activeFilter);
  });
  if (projectSearchInput) {
    projectSearchInput.value = '';
  }
  applyProjectFilters();
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
    writingSpotlightRelated?.classList.add('hidden');
    return;
  }

  writingSpotlightTitle.textContent = entry.querySelector('.entry-title')?.textContent || 'Draft spotlight';
  writingSpotlightDescription.textContent =
    entry.querySelector('p')?.textContent || 'Open the draft to view the current writing scaffold.';
  const meta = entry.querySelector('.entry-meta')?.textContent || 'Working draft';
  const stage = entry.dataset.stage ? `${entry.dataset.stage[0].toUpperCase()}${entry.dataset.stage.slice(1)}` : 'Draft';
  const nextMilestone = entry.dataset.next ? ` Next milestone: ${entry.dataset.next}` : '';
  const relatedLabel = entry.dataset.relatedLabel ? ` Related build: ${entry.dataset.relatedLabel}.` : '';
  writingSpotlightMeta.textContent = `${meta} | ${stage}.${nextMilestone}${relatedLabel}`;
  writingSpotlightOpen.disabled = false;
  if (writingSpotlightRelated) {
    if (entry.dataset.relatedLink) {
      writingSpotlightRelated.href = entry.dataset.relatedLink;
      writingSpotlightRelated.textContent = `Open ${entry.dataset.relatedLabel || 'Related Build'}`;
      writingSpotlightRelated.classList.remove('hidden');
    } else {
      writingSpotlightRelated.classList.add('hidden');
    }
  }
  updateUrlState();
}

function stagePriority(stage) {
  if (stage === 'drafting') return 0;
  if (stage === 'modeling') return 1;
  return 2;
}

function formatStageLabel(stage) {
  return stage ? `${stage[0].toUpperCase()}${stage.slice(1)}` : 'Draft';
}

function renderBuildTrails() {
  if (!trailList) {
    return;
  }

  const grouped = new Map();
  writingEntries.forEach((entry) => {
    const link = entry.dataset.relatedLink;
    if (!link) return;

    if (!grouped.has(link)) {
      grouped.set(link, {
        link,
        label: entry.dataset.relatedLabel || entry.querySelector('.entry-title')?.textContent || 'Related build',
        entries: [],
      });
    }

    grouped.get(link).entries.push(entry);
  });

  const trails = [...grouped.values()].sort((a, b) => {
    const aBest = Math.min(...a.entries.map((entry) => stagePriority(entry.dataset.stage)));
    const bBest = Math.min(...b.entries.map((entry) => stagePriority(entry.dataset.stage)));
    return aBest - bBest || a.label.localeCompare(b.label);
  });

  trailList.innerHTML = trails
    .map((trail) => {
      const orderedEntries = [...trail.entries].sort((a, b) => {
        const stageDelta = stagePriority(a.dataset.stage) - stagePriority(b.dataset.stage);
        if (stageDelta !== 0) return stageDelta;
        return (a.querySelector('.entry-title')?.textContent || '').localeCompare(
          b.querySelector('.entry-title')?.textContent || ''
        );
      });
      const nextEntry = orderedEntries[0];
      const stageCounts = ['drafting', 'modeling', 'research']
        .map((stage) => {
          const count = trail.entries.filter((entry) => entry.dataset.stage === stage).length;
          return `${formatStageLabel(stage)} ${count}`;
        })
        .join(' | ');

      return `
        <article class="trail-card">
          <p class="tag">Linked Notes</p>
          <h3>${trail.label}</h3>
          <p class="section-copy">${trail.entries.length} linked draft${trail.entries.length === 1 ? '' : 's'} for this build.</p>
          <p class="results-meta">Next write: ${nextEntry?.dataset.next || 'Open the related draft and continue the note.'}</p>
          <p class="results-meta">${stageCounts}</p>
          <div class="card-actions">
            <a class="spotlight-btn" href="${trail.link}" target="_blank" rel="noreferrer">Open Build</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderWritingQueue(entries) {
  if (!writingQueueList) {
    return;
  }

  if (!entries.length) {
    writingQueueList.innerHTML = `
      <article class="trail-card">
        <p class="tag">Queue Empty</p>
        <h3>No drafts match the current filters.</h3>
        <p class="section-copy">Broaden the topic or stage filters to repopulate the writing queue.</p>
      </article>
    `;
    return;
  }

  const ordered = [...entries]
    .sort((a, b) => {
      const stageDelta = stagePriority(a.dataset.stage) - stagePriority(b.dataset.stage);
      if (stageDelta !== 0) return stageDelta;
      return (a.querySelector('.entry-title')?.textContent || '').localeCompare(
        b.querySelector('.entry-title')?.textContent || ''
      );
    })
    .slice(0, 3);

  writingQueueList.innerHTML = ordered
    .map((entry) => {
      const title = entry.querySelector('.entry-title')?.textContent || 'Draft note';
      const meta = entry.querySelector('.entry-meta')?.textContent || 'Working draft';
      const stage = formatStageLabel(entry.dataset.stage);
      const next = entry.dataset.next || 'Open the draft and define the next milestone.';
      const relatedLabel = entry.dataset.relatedLabel || 'Related Build';
      const relatedLink = entry.dataset.relatedLink;

      return `
        <article class="trail-card">
          <p class="tag">${stage}</p>
          <h3>${title}</h3>
          <p class="section-copy">${meta}</p>
          <p class="results-meta">Next milestone: ${next}</p>
          <div class="card-actions">
            <button class="spotlight-btn queue-open-btn" type="button" data-entry-id="${entry.id}">Open Draft</button>
            ${relatedLink ? `<a class="spotlight-btn" href="${relatedLink}" target="_blank" rel="noreferrer">Open ${relatedLabel}</a>` : ''}
          </div>
        </article>
      `;
    })
    .join('');

  writingQueueList.querySelectorAll('.queue-open-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const target = writingEntries.find((entry) => entry.id === button.dataset.entryId);
      if (!target) return;
      target.open = true;
      updateWritingSpotlight(target);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function applyWritingFilters() {
  const query = (writingSearchInput?.value || '').trim().toLowerCase();
  let visibleCount = 0;
  let firstVisible = null;
  const stageCounts = { research: 0, modeling: 0, drafting: 0 };
  const topicCounts = { systems: 0, science: 0, language: 0, sports: 0, markets: 0 };
  const visibleEntries = [];

  writingEntries.forEach((entry) => {
    const topic = entry.dataset.topic || 'all';
    const topicMatch = activeWritingTopic === 'all' || topic === activeWritingTopic;
    const stage = entry.dataset.stage || 'all';
    const stageMatch = activeWritingStage === 'all' || stage === activeWritingStage;
    const visible = topicMatch && stageMatch && (!query || (entry.textContent || '').toLowerCase().includes(query));
    entry.classList.toggle('hidden', !visible);
    if (visible) {
      visibleCount += 1;
      if (!firstVisible) firstVisible = entry;
      visibleEntries.push(entry);
      if (stageCounts[stage] !== undefined) stageCounts[stage] += 1;
      if (topicCounts[topic] !== undefined) topicCounts[topic] += 1;
    }
  });

  if (writingResultsMeta) {
    writingResultsMeta.textContent =
      visibleCount === writingEntries.length
        ? 'Showing all draft notes.'
        : `Showing ${visibleCount} matching draft${visibleCount === 1 ? '' : 's'}.`;
  }

  if (draftStageSummary) {
    draftStageSummary.textContent = `Research ${stageCounts.research} | Modeling ${stageCounts.modeling} | Drafting ${stageCounts.drafting}`;
  }

  if (draftTopicSummary) {
    draftTopicSummary.textContent = `Systems ${topicCounts.systems} | Science ${topicCounts.science} | Language ${topicCounts.language} | Sports ${topicCounts.sports} | Markets ${topicCounts.markets}`;
  }

  renderWritingQueue(visibleEntries);
  updateWritingSpotlight(firstVisible);
  updateUrlState();
}

function setWritingFilters(topic, stage) {
  activeWritingTopic = topic || 'all';
  activeWritingStage = stage || 'all';
  writingFilterButtons.forEach((button) => {
    button.classList.toggle('active', (button.dataset.topic || 'all') === activeWritingTopic);
  });
  writingStageButtons.forEach((button) => {
    button.classList.toggle('active', (button.dataset.stage || 'all') === activeWritingStage);
  });
  if (writingSearchInput) {
    writingSearchInput.value = '';
  }
  applyWritingFilters();
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

writingStageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeWritingStage = button.dataset.stage || 'all';
    writingStageButtons.forEach((item) => item.classList.remove('active'));
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
  updateUrlState();
});

copyProjectViewBtn?.addEventListener('click', () => copyCurrentView('projects'));
copyWritingViewBtn?.addEventListener('click', () => copyCurrentView('drafts'));

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

function hydrateFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  suppressUrlSync = true;

  const projectFilter = params.get('projectFilter');
  if (projectFilter) {
    activeFilter = projectFilter;
    projectFilterButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.filter === projectFilter);
    });
  }

  const projectSearch = params.get('projectSearch');
  if (projectSearch && projectSearchInput) {
    projectSearchInput.value = projectSearch;
  }

  const writingTopic = params.get('writingTopic');
  if (writingTopic) {
    activeWritingTopic = writingTopic;
    writingFilterButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.topic === writingTopic);
    });
  }

  const writingStage = params.get('writingStage');
  if (writingStage) {
    activeWritingStage = writingStage;
    writingStageButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.stage === writingStage);
    });
  }

  const writingSearch = params.get('writingSearch');
  if (writingSearch && writingSearchInput) {
    writingSearchInput.value = writingSearch;
  }

  suppressUrlSync = false;
}

hydrateFiltersFromUrl();
applyProjectFilters();
applyWritingFilters();
renderBuildTrails();
loadGithubPulse();

const draftParam = new URLSearchParams(window.location.search).get('draft');
if (draftParam) {
  const targetDraft = writingEntries.find((entry) => entry.id === draftParam);
  if (targetDraft) {
    targetDraft.open = true;
    updateWritingSpotlight(targetDraft);
  }
}




