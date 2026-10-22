// Blog index: tag and date filtering driven by the URL (?tag=slug&date=YYYY or YYYY-MM).
// Without JavaScript the page simply lists every post.
(function () {
  const list = document.querySelector('.posts');
  const items = list ? [...list.querySelectorAll(':scope > li[data-date]')] : [];
  if (!items.length) return;

  const params = new URLSearchParams(location.search);
  const tag = params.get('tag') || '', date = params.get('date') || '';
  const year = date.slice(0, 4);                        // a month filter implies its year
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const href = (t, d) => {
    const p = new URLSearchParams();
    if (t) p.set('tag', t);
    if (d) p.set('date', d);
    const s = p.toString();
    return location.pathname + (s ? '?' + s : '');
  };
  const el = (name, props = {}, children = []) => {
    const node = Object.assign(document.createElement(name), props);
    children.forEach(c => node.append(c));
    return node;
  };
  const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  const chip = (text, count, to, active) => {
    const a = el('a', { className: 'chip', href: to }, [text]);
    if (count != null) a.append(' ', el('b', { textContent: '(' + count + ')' }));
    if (active) a.setAttribute('aria-current', 'true');
    return a;
  };

  // Collect tag names and counts, and posts per month and year, from the rendered list.
  const names = new Map(), tagCount = new Map(), monthCount = new Map(), yearCount = new Map();
  items.forEach(li => {
    li.querySelectorAll('.tags a[data-slug]').forEach(a => names.set(a.dataset.slug, a.textContent));
    (li.dataset.tags || '').split(' ').filter(Boolean).forEach(t => bump(tagCount, t));
    bump(monthCount, li.dataset.date);
    bump(yearCount, li.dataset.date.slice(0, 4));
  });

  // tags: toggling the active tag clears it.
  const tagBox = document.getElementById('tag-filter');
  [...tagCount.keys()].sort().forEach(t =>
    tagBox.append(chip('#' + (names.get(t) || t), tagCount.get(t), href(t === tag ? '' : t, date), t === tag)));
  if (!tagCount.size) tagBox.append(el('span', { className: 'c', textContent: '(none yet)' }));

  // years (newest first): toggling the active year clears the date filter.
  const yearBox = document.getElementById('year-filter');
  [...yearCount.keys()].sort().reverse().forEach(y =>
    yearBox.append(chip(y, yearCount.get(y), href(tag, y === year ? '' : y), y === year)));

  // months of the selected year: toggling the active month falls back to the whole year.
  if (year && yearCount.has(year)) {
    const monthBox = document.getElementById('month-filter');
    [...monthCount.keys()].filter(m => m.startsWith(year)).sort().forEach(m =>
      monthBox.append(chip(MONTHS[+m.slice(5) - 1], monthCount.get(m), href(tag, m === date ? year : m), m === date)));
    document.getElementById('month-row').hidden = false;
  }

  // Apply filters.
  let shown = 0;
  items.forEach(li => {
    const ok = (!tag || (li.dataset.tags || '').split(' ').includes(tag)) && (!date || li.dataset.date.startsWith(date));
    li.hidden = !ok;
    if (ok) shown++;
  });

  const status = document.getElementById('status');
  if (tag || date) {
    status.replaceChildren('showing ' + shown + ' of ' + items.length + ' posts · filtered by');
    if (tag) status.append(' ', chip('#' + (names.get(tag) || tag) + ' ×', null, href('', date), true));
    if (date) status.append(' ', chip(date + ' ×', null, href(tag, ''), true));
    status.hidden = false;
  }
  document.getElementById('empty').hidden = shown > 0;
  document.getElementById('filters').hidden = false;
})();
