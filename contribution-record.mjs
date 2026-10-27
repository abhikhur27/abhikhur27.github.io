const SVG_NS = 'http://www.w3.org/2000/svg';
const dayFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const shortFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function normalizeDays(input) {
  if (!Array.isArray(input) || !input.length || input.length > 371) throw new Error('Invalid contribution history');
  const dates = new Set();
  return input.map(day => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day?.date) ||
        !Number.isSafeInteger(day.count) || day.count < 0) throw new Error('Invalid contribution day');
    const parsed = new Date(`${day.date}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day.date || dates.has(day.date)) {
      throw new Error('Invalid or repeated date');
    }
    dates.add(day.date);
    return { date: day.date, count: day.count };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function recordGeometry(input) {
  const days = normalizeDays(input);
  const peak = Math.max(1, ...days.map(day => day.count));
  return days.map((day, index) => {
    const progress = days.length > 1 ? index / (days.length - 1) : 1;
    const angle = -Math.PI / 2 + progress * Math.PI * 21;
    const radius = 55 + progress * 119;
    const length = day.count ? 2 + 7 * Math.log1p(day.count) / Math.log1p(peak) : 1;
    const x = 200 + Math.cos(angle) * radius;
    const y = 200 + Math.sin(angle) * radius;
    return { ...day, x, y,
      x1: 200 + Math.cos(angle) * (radius - length / 2),
      y1: 200 + Math.sin(angle) * (radius - length / 2),
      x2: 200 + Math.cos(angle) * (radius + length / 2),
      y2: 200 + Math.sin(angle) * (radius + length / 2) };
  });
}

export function closestDay(points, x, y) {
  if (!points.length || !Number.isFinite(x) || !Number.isFinite(y)) return -1;
  let best = 0;
  let distance = Infinity;
  points.forEach((point, index) => {
    const next = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (next < distance) { best = index; distance = next; }
  });
  return best;
}

function svgElement(name, attributes) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

export function mountRecord(root, snapshot) {
  const days = normalizeDays(snapshot?.contributions?.days);
  const points = recordGeometry(days);
  const svg = root.querySelector('#activity-record-svg');
  const grooves = root.querySelector('#record-grooves');
  const slider = root.querySelector('#activity-day');
  if (!svg || !grooves || !slider) throw new Error('Missing record controls');
  const total = days.reduce((sum, day) => sum + day.count, 0);
  root.querySelector('#activity-total').textContent = `${total.toLocaleString('en-US')} contributions`;
  root.querySelector('#activity-period').textContent = `${shortFormat.format(new Date(`${days[0].date}T00:00:00Z`))} to ${shortFormat.format(new Date(`${days.at(-1).date}T00:00:00Z`))}`;
  const updated = new Date(snapshot.updatedAt);
  root.querySelector('#activity-updated').textContent = Number.isFinite(updated.getTime()) ? `Updated ${shortFormat.format(updated)}` : '';
  const fragment = document.createDocumentFragment();
  const path = svgElement('path', { class: 'record-groove', d: points.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ') });
  fragment.append(path);
  const notches = points.map(point => {
    const line = svgElement('line', { class: `record-day${point.count ? '' : ' record-day--quiet'}`,
      x1: point.x1, y1: point.y1, x2: point.x2, y2: point.y2 });
    const title = svgElement('title', {});
    title.textContent = `${point.date}: ${point.count} contribution${point.count === 1 ? '' : 's'}`;
    line.append(title);
    fragment.append(line);
    return line;
  });
  const marker = svgElement('circle', { class: 'record-marker', r: 3.5 });
  fragment.append(marker);
  grooves.replaceChildren(fragment);
  slider.max = String(days.length - 1);
  slider.disabled = false;
  let selected = -1;
  const select = raw => {
    const index = Math.max(0, Math.min(days.length - 1, Math.round(Number(raw) || 0)));
    if (selected === index) return;
    if (selected >= 0) notches[selected].classList.remove('is-selected');
    selected = index;
    notches[index].classList.add('is-selected');
    const day = days[index];
    const date = dayFormat.format(new Date(`${day.date}T00:00:00Z`));
    const count = `${day.count} contribution${day.count === 1 ? '' : 's'}`;
    root.querySelector('#activity-date').textContent = date;
    root.querySelector('#activity-count').textContent = count;
    slider.value = String(index);
    slider.setAttribute('aria-valuetext', `${date}, ${count}`);
    marker.setAttribute('cx', points[index].x);
    marker.setAttribute('cy', points[index].y);
  };
  slider.addEventListener('input', () => select(slider.value));
  // Pointer inspection is optional; the native range provides keyboard and touch access.
  const inspect = event => {
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 400;
    const y = (event.clientY - rect.top) / rect.height * 400;
    if (Math.hypot(x - 200, y - 200) < 46) return;
    select(closestDay(points, x, y));
  };
  svg.addEventListener('pointermove', event => { if (event.pointerType === 'mouse' || event.buttons) inspect(event); });
  svg.addEventListener('pointerdown', inspect);
  select(days.length - 1);
  root.setAttribute('aria-busy', 'false');
  return { days, select };
}

export async function initRecord(doc = document, fetcher = fetch) {
  const root = doc.querySelector('#contribution-record');
  if (!root) return;
  try {
    const response = await fetcher('data/github-activity.json', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Snapshot unavailable');
    return mountRecord(root, await response.json());
  } catch {
    root.hidden = true;
    root.setAttribute('aria-busy', 'false');
    const fallback = doc.querySelector('#activity-fallback');
    if (fallback) fallback.hidden = false;
  }
}

if (typeof document !== 'undefined') initRecord();
