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

export function starMapGeometry(input, { width = 800, height = 240 } = {}) {
  const days = normalizeDays(input);
  if (!Number.isFinite(width) || width < 240 || !Number.isFinite(height) || height < 120) {
    throw new Error('Invalid star-map dimensions');
  }
  const peak = Math.max(1, ...days.map(day => day.count));
  const start = Date.parse(`${days[0].date}T00:00:00Z`);
  const span = Date.parse(`${days.at(-1).date}T00:00:00Z`) - start;
  const inset = Math.min(24, width * 0.04);
  return days.map(day => {
    const progress = span ? (Date.parse(`${day.date}T00:00:00Z`) - start) / span : 0.5;
    // Date alone sets vertical spacing. It never represents a second activity metric.
    let seed = 2166136261;
    for (const character of day.date) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909) >>> 0;
    seed = (seed ^ (seed >>> 16)) >>> 0;
    const y = 24 + (seed / 4294967295) * (height - 90);
    // Area is exactly proportional to positive counts: pi * r² = constant * count.
    // A zero is a separate hollow date marker, not a filled activity point.
    return { ...day, x: inset + progress * (width - inset * 2), y,
      radius: day.count ? 6 * Math.sqrt(day.count / peak) : 0.8 };
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

function svgElement(doc, name, attributes) {
  const element = doc.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

export function mountRecord(root, snapshot) {
  const days = normalizeDays(snapshot?.contributions?.days);
  const doc = root.ownerDocument ?? document;
  let layout = { width: 800, height: 240 };
  let points = starMapGeometry(days, layout);
  const svg = root.querySelector('#activity-record-svg');
  const field = root.querySelector('#activity-stars');
  const months = root.querySelector('#activity-months');
  const slider = root.querySelector('#activity-day');
  if (!svg || !field || !months || !slider) throw new Error('Missing star-map controls');
  const total = days.reduce((sum, day) => sum + day.count, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Invalid contribution total');
  root.querySelector('#activity-total').textContent = `${total.toLocaleString('en-US')} contribution${total === 1 ? '' : 's'}`;
  root.querySelector('#activity-period').textContent = `${shortFormat.format(new Date(`${days[0].date}T00:00:00Z`))} to ${shortFormat.format(new Date(`${days.at(-1).date}T00:00:00Z`))}`;
  const updated = new Date(snapshot.updatedAt);
  root.querySelector('#activity-updated').textContent = Number.isFinite(updated.getTime()) ? `Updated ${shortFormat.format(updated)}` : '';
  const fragment = doc.createDocumentFragment();
  const stars = points.map(point => {
    const star = svgElement(doc, 'circle', { class: `activity-star${point.count ? '' : ' activity-star--quiet'}`,
      cx: point.x, cy: point.y, r: point.radius });
    const title = svgElement(doc, 'title', {});
    title.textContent = `${point.date}: ${point.count} contribution${point.count === 1 ? '' : 's'}`;
    star.append(title);
    fragment.append(star);
    return star;
  });
  const marker = svgElement(doc, 'circle', { class: 'activity-star-marker', r: 6 });
  fragment.append(marker);
  field.replaceChildren(fragment);
  slider.max = String(days.length - 1);
  slider.disabled = false;
  let selected = -1;
  const select = raw => {
    const index = Math.max(0, Math.min(days.length - 1, Math.round(Number(raw) || 0)));
    if (selected === index) return;
    if (selected >= 0) stars[selected].classList.remove('is-selected');
    selected = index;
    stars[index].classList.add('is-selected');
    const day = days[index];
    const date = dayFormat.format(new Date(`${day.date}T00:00:00Z`));
    const count = `${day.count} contribution${day.count === 1 ? '' : 's'}`;
    root.querySelector('#activity-date').textContent = date;
    root.querySelector('#activity-count').textContent = count;
    slider.value = String(index);
    slider.setAttribute('aria-valuetext', `${date}, ${count}`);
    marker.setAttribute('cx', points[index].x);
    marker.setAttribute('cy', points[index].y);
    marker.setAttribute('r', points[index].radius + 3);
  };
  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
  const redraw = () => {
    const rect = svg.getBoundingClientRect();
    if (rect.width >= 240 && rect.height >= 120) layout = { width: rect.width, height: rect.height };
    points = starMapGeometry(days, layout);
    svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
    points.forEach((point, index) => {
      stars[index].setAttribute('cx', point.x);
      stars[index].setAttribute('cy', point.y);
      stars[index].setAttribute('r', point.radius);
    });
    const monthStarts = points.filter((point, index) => !index || point.date.slice(0, 7) !== points[index - 1].date.slice(0, 7));
    const labels = [];
    monthStarts.forEach((point, index) => {
      const last = index === monthStarts.length - 1;
      if (last && labels.length && point.x - labels.at(-1).x < 58) labels.pop();
      if (last || !labels.length || point.x - labels.at(-1).x >= 58) labels.push(point);
    });
    const monthFragment = doc.createDocumentFragment();
    labels.forEach((point, index) => {
      const label = svgElement(doc, 'text', { class: 'activity-month', x: point.x, y: layout.height - 12,
        'text-anchor': index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle' });
      const date = new Date(`${point.date}T00:00:00Z`);
      label.textContent = `${monthFormat.format(date).toLowerCase()}${!index || index === labels.length - 1 ? ` '${point.date.slice(2, 4)}` : ''}`;
      monthFragment.append(label);
    });
    months.replaceChildren(monthFragment);
    if (selected >= 0) {
      marker.setAttribute('cx', points[selected].x);
      marker.setAttribute('cy', points[selected].y);
      marker.setAttribute('r', points[selected].radius + 3);
    }
  };
  slider.addEventListener('input', () => select(slider.value));
  // Pointer inspection is optional; the native range provides keyboard and touch access.
  const inspect = event => {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width * layout.width;
    const y = (event.clientY - rect.top) / rect.height * layout.height;
    select(closestDay(points, x, y));
  };
  svg.addEventListener('pointermove', event => { if (event.pointerType === 'mouse' || event.buttons) inspect(event); });
  svg.addEventListener('pointerdown', inspect);
  redraw();
  select(days.length - 1);
  const Observer = doc.defaultView?.ResizeObserver;
  const observer = Observer ? new Observer(redraw) : null;
  observer?.observe(svg);
  root.setAttribute('aria-busy', 'false');
  return { days, select, disconnect: () => observer?.disconnect() };
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
