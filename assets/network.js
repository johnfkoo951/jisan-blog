// 연결망 페이지 (/network/). 좌표는 빌드가 계산해 #netData 에 실었다 — 여기서는 그리기와 탐색만 한다.
(() => {
  const dataEl = document.getElementById('netData');
  const svg = document.getElementById('netSvg');
  if (!dataEl || !svg) return;
  const { nodes, links, types } = JSON.parse(dataEl.textContent);
  const NS = 'http://www.w3.org/2000/svg';
  const canvas = document.getElementById('netCanvas');
  const viewport = svg.querySelector('.net-viewport');
  const panel = document.getElementById('netPanel');
  const input = document.getElementById('netq');
  const suggest = document.getElementById('netSuggest');
  const help = document.getElementById('netHelp');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ─── 인접 목록 ───
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map(nodes.map((n) => [n.id, []]));
  for (const l of links) {
    if (!byId.has(l.s) || !byId.has(l.t)) continue;
    adj.get(l.s).push({ id: l.t, link: l });
    adj.get(l.t).push({ id: l.s, link: l });
  }
  // 이름표 후보: 멀리서는 시리즈·주제·많이 이어진 대상만, 가까이 갈수록 더 많이. 겹치면 중요한 쪽만 남긴다(placeLabels).
  const hubCut = nodes.filter((n) => n.type !== 'post' && !n.leaf).map((n) => n.d).sort((a, b) => b - a)[Math.min(28, nodes.length - 1)] || 99;
  const isHub = (n) => n.type === 'series' || n.type === 'topic' || (n.type !== 'post' && n.d >= Math.max(hubCut, 3));

  // ─── 그리기 ───
  const linkEls = [], nodeEls = new Map();
  const gLinks = viewport.querySelector('.net-links'), gNodes = viewport.querySelector('.net-nodes');
  for (const l of links) {
    const a = byId.get(l.s), b = byId.get(l.t);
    if (!a || !b) continue;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y); line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    line.setAttribute('stroke-width', l.series ? 1.2 : Math.min(0.6 + l.w / 10, 2.6).toFixed(2));
    if (l.tag) line.classList.add('is-tag');
    if (l.series) line.classList.add('is-series');
    if (a.leaf || b.leaf) line.classList.add('to-leaf');
    line._l = l;
    gLinks.appendChild(line); linkEls.push(line);
  }
  const order = [...nodes].sort((a, b) => (a.type === 'post') - (b.type === 'post') || a.d - b.d); // 글을 위에
  for (const n of order) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'net-node' + (n.leaf ? ' is-leaf' : ''));
    g.setAttribute('data-type', n.type);
    g.setAttribute('transform', `translate(${n.x} ${n.y})`);
    g.style.setProperty('--r', n.r);
    let shape;
    if (n.type === 'post' || n.type === 'tool') {
      shape = document.createElementNS(NS, 'rect');
      const s = n.r * (n.type === 'tool' ? 1.5 : 1.7);
      shape.setAttribute('x', -s / 2); shape.setAttribute('y', -s / 2); shape.setAttribute('width', s); shape.setAttribute('height', s);
      shape.setAttribute('rx', n.type === 'post' ? 2.5 : 1);
    } else {
      shape = document.createElementNS(NS, 'circle');
      shape.setAttribute('r', n.r);
    }
    shape.setAttribute('class', 'shape');
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = n.type === 'post' ? (n.short.length > 24 ? n.short.slice(0, 23) + '…' : n.short) : n.label;
    const title = document.createElementNS(NS, 'title');
    title.textContent = `${types[n.type]} · ${n.label}`;
    g.append(shape, text, title);
    g._n = n;
    n._w = [...text.textContent].reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 6.4 : 11.2), 0); // 11px 기준 대략 폭
    gNodes.appendChild(g); nodeEls.set(n.id, g);
  }

  // ─── 이름표 배치 (화면 좌표에서 겹치지 않게, 중요한 것부터) ───
  const hidden = new Set();
  let selected = null;
  let near = null, matches = null;
  const leavesShown = () => svg.classList.contains('show-leaves');
  function shown(n) {
    if (hidden.has(n.type)) return false;
    if (n.leaf && !leavesShown() && !(near && near.has(n.id)) && !(matches && matches.has(n.id))) return false;
    return true;
  }
  function placeLabels() {
    const placed = [];
    const ns = 1 / Math.sqrt(view.k);
    const cands = [];
    for (const n of nodes) {
      if (!shown(n)) continue;
      let pri;
      if (near) { if (!near.has(n.id)) continue; pri = n.id === selected ? 1e9 : 1e6 + n.d; }
      else if (matches) { if (!matches.has(n.id)) continue; pri = 1e5 + n.d; }
      else if (isHub(n)) pri = 1e4 + n.d;
      else if (n.type !== 'post' && view.k >= 1.35) pri = n.d;
      else if (view.k >= 2.1) pri = n.d / 2;
      else continue;
      cands.push([pri, n]);
    }
    cands.sort((a, b) => b[0] - a[0]);
    const on = new Set();
    for (const [, n] of cands) {
      const sx = n.x * view.k + view.x, sy = n.y * view.k + view.y;
      if (sx < -80 || sy < -20 || sx > size.w + 80 || sy > size.h + 30) continue;
      const w = n._w * (n.type === 'topic' || n.type === 'series' ? 1.14 : 1), h = 14;
      const box = { x: sx - w / 2 - 2, y: sy - n.r * view.k * ns - 5 - h, w: w + 4, h };
      if (placed.some((b) => box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h)) continue;
      placed.push(box); on.add(n.id);
    }
    for (const [id, el] of nodeEls) el.classList.toggle('label-on', on.has(id));
  }
  let labelTimer;
  const scheduleLabels = () => { clearTimeout(labelTimer); labelTimer = setTimeout(placeLabels, 60); };

  // ─── 확대·이동 ───
  const view = { k: 1, x: 0, y: 0 };
  let size = { w: 1, h: 1 };
  // 이름표 글자와 선 굵기는 화면에서 같은 크기로 (확대하면 이름표 사이가 벌어진다). 노드는 √k 만큼만 커진다.
  function apply() {
    viewport.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
    svg.style.setProperty('--k', view.k);
    svg.style.setProperty('--ns', (1 / Math.sqrt(view.k)).toFixed(4));
    scheduleLabels();
  }
  function bounds(list) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of list) { x0 = Math.min(x0, n.x - n.r); y0 = Math.min(y0, n.y - n.r); x1 = Math.max(x1, n.x + n.r); y1 = Math.max(y1, n.y + n.r); }
    return { x0, y0, x1, y1 };
  }
  function fitTo(list, { pad = 36, maxK = 2.4, animate = true } = {}) {
    const b = bounds(list.length ? list : nodes);
    const k = Math.min(maxK, (size.w - pad * 2) / Math.max(b.x1 - b.x0, 1), (size.h - pad * 2) / Math.max(b.y1 - b.y0, 1));
    const target = { k, x: size.w / 2 - k * (b.x0 + b.x1) / 2, y: size.h / 2 - k * (b.y0 + b.y1) / 2 };
    animateTo(target, animate);
  }
  let anim = 0;
  function animateTo(target, animate = true) {
    cancelAnimationFrame(anim);
    if (!animate || reduceMotion) { Object.assign(view, target); apply(); return; }
    const from = { ...view }, t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 320, 1), e = 1 - Math.pow(1 - p, 3);
      view.k = from.k + (target.k - from.k) * e; view.x = from.x + (target.x - from.x) * e; view.y = from.y + (target.y - from.y) * e;
      apply(); if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function zoomAt(factor, cx = size.w / 2, cy = size.h / 2) {
    const k = Math.min(6, Math.max(0.25, view.k * factor));
    view.x = cx - (cx - view.x) * (k / view.k); view.y = cy - (cy - view.y) * (k / view.k); view.k = k;
    apply();
  }
  function resize() {
    const r = svg.getBoundingClientRect();
    const first = size.w === 1;
    size = { w: r.width, h: r.height };
    svg.setAttribute('viewBox', `0 0 ${size.w} ${size.h}`);
    if (first) fitTo(nodes, { animate: false });
  }
  new ResizeObserver(resize).observe(svg);
  resize();

  // 포인터: 한 손가락/마우스 끌기 = 이동, 두 손가락 = 확대·이동, 움직임 없이 뗀 노드 = 선택
  const pointers = new Map();
  let drag = null, pinch = null;
  const local = (e) => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 1) {
      const nodeEl = e.target.closest('.net-node');
      drag = { start: local(e), view: { ...view }, node: nodeEl && nodeEl._n, moved: false };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: { ...view } };
      drag = null;
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = Math.min(6, Math.max(0.25, pinch.k * d / pinch.d));
      view.k = k;
      view.x = mid.x - (pinch.mid.x - pinch.view.x) * (k / pinch.view.k);
      view.y = mid.y - (pinch.mid.y - pinch.view.y) * (k / pinch.view.k);
      apply();
    } else if (drag) {
      const p = local(e), dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true; svg.classList.add('is-panning');
      view.x = drag.view.x + dx; view.y = drag.view.y + dy; apply();
    }
  });
  const endPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (drag && !drag.moved && e.type === 'pointerup') {
      if (drag.node) select(drag.node.id, { center: false }); else clearSelection();
    }
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) { drag = null; svg.classList.remove('is-panning'); }
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  // 그냥 스크롤은 페이지를 내린다. ⌘/Ctrl+스크롤과 트랙패드 핀치(ctrlKey 로 들어온다)만 확대한다.
  svg.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const p = local(e);
    zoomAt(Math.exp(-e.deltaY * 0.0045), p.x, p.y);
  }, { passive: false });
  svg.addEventListener('dblclick', (e) => { const p = local(e); zoomAt(1.6, p.x, p.y); });
  document.querySelector('.net-zoom').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.zoom === 'in') zoomAt(1.35); else if (b.dataset.zoom === 'out') zoomAt(1 / 1.35); else fitTo(visibleNodes());
  });

  // ─── 유형 보이기·숨기기 ───
  const chips = [...document.querySelectorAll('.net-chip')];
  const visibleNodes = () => nodes.filter(shown);
  function setType(type, show) {
    const chip = chips.find((c) => c.dataset.type === type);
    if (chip) chip.setAttribute('aria-pressed', String(show));
    if (type === 'leaf') { svg.classList.toggle('show-leaves', show); placeLabels(); return; }
    if (show) hidden.delete(type); else hidden.add(type);
    for (const [id, el] of nodeEls) el.classList.toggle('is-hidden', hidden.has(byId.get(id).type));
    for (const line of linkEls) line.classList.toggle('is-hidden', hidden.has(byId.get(line._l.s).type) || hidden.has(byId.get(line._l.t).type));
    placeLabels();
  }
  const isOn = (type) => type === 'leaf' ? leavesShown() : !hidden.has(type);
  chips.forEach((chip) => chip.addEventListener('click', () => setType(chip.dataset.type, !isOn(chip.dataset.type))));

  // ─── 선택 ───
  function neighbors(id) { return adj.get(id) || []; }
  function select(id, { center = true, updateHash = true } = {}) {
    const n = byId.get(id); if (!n) return;
    if (hidden.has(n.type)) setType(n.type, true);
    selected = id;
    near = new Set([id, ...neighbors(id).map((x) => x.id)]);
    svg.classList.add('has-focus');
    for (const [nid, el] of nodeEls) { el.classList.toggle('is-near', near.has(nid)); el.classList.toggle('is-selected', nid === id); }
    for (const line of linkEls) line.classList.toggle('is-near', line._l.s === id || line._l.t === id);
    renderPanel(n);
    if (center) fitTo([...near].map((x) => byId.get(x)).filter(shown), { maxK: 2.2 }); else placeLabels();
    if (updateHash) history.replaceState(null, '', `#n=${encodeURIComponent(id)}`);
  }
  function clearSelection() {
    selected = null; near = null;
    svg.classList.remove('has-focus');
    for (const el of nodeEls.values()) el.classList.remove('is-near', 'is-selected');
    for (const line of linkEls) line.classList.remove('is-near');
    renderPanel(null);
    placeLabels();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }

  // ─── 패널 ───
  const dot = (type) => `<span class="net-dot" data-type="${type}" aria-hidden="true"></span>`;
  const nodeButton = (n, extra = '') => `<button type="button" data-node="${esc(n.id)}">${dot(n.type)}${esc(n.type === 'post' ? n.short : n.label)}${extra}</button>`;
  const postHref = (n) => `/posts/${encodeURIComponent(n.slug)}/`;
  function renderPanel(n) {
    if (!n) {
      const hubs = nodes.filter((x) => x.type !== 'post' && x.type !== 'series').sort((a, b) => b.d - a.d).slice(0, 10);
      panel.innerHTML = `<p class="np-type">연결망 읽는 법</p><h2>글과 그 글이 다룬 것</h2>
<p>네모는 글, 동그라미는 글이 다룬 주제·개념·인물, 마름모는 도구, 빈 고리는 시리즈입니다. 선이 굵을수록 그 글이 그 대상을 많이 다뤘습니다.</p>
<div class="np-legend">${Object.entries(types).map(([t, label]) => `${dot(t)}<span>${label}</span>`).join('')}</div>
<h3>가장 많이 이어진 대상</h3><div class="np-chips">${hubs.map((h) => nodeButton(h)).join('')}</div>
<p class="np-muted" style="margin-top:1rem">아래 찾아보기에 같은 연결을 목록으로 모아 두었습니다.</p>`;
      return;
    }
    const nb = neighbors(n.id).map(({ id, link }) => ({ n: byId.get(id), link })).filter((x) => x.n);
    if (n.type === 'post') {
      const groups = ['topic', 'concept', 'person', 'tool'].map((t) => {
        const list = nb.filter((x) => x.n.type === t).sort((a, b) => b.link.w - a.link.w);
        return list.length ? `<h3>${types[t]} ${list.length}</h3><div class="np-chips">${list.map((x) => nodeButton(x.n)).join('')}</div>` : '';
      }).join('');
      const seriesNode = nb.find((x) => x.n.type === 'series');
      panel.innerHTML = `<p class="np-type">${dot('post')}글 · ${esc(n.kind)} · ${esc(n.date)}</p><h2>${esc(n.label)}</h2>
${seriesNode ? `<p class="np-chips">${nodeButton(seriesNode.n)}</p>` : ''}${n.summary ? `<p class="np-muted">${esc(n.summary)}</p>` : ''}${groups}
<div class="np-actions"><a class="primary" href="${postHref(n)}">글 읽기</a></div>`;
      return;
    }
    if (n.type === 'series') {
      const list = n.posts.map((slug) => byId.get(`post:${slug}`)).filter(Boolean);
      panel.innerHTML = `<p class="np-type">${dot('series')}시리즈 · ${list.length}편</p><h2>${esc(n.label)}</h2>
<h3>읽는 순서</h3><ol class="np-posts">${list.map((p) => `<li><button type="button" class="np-link" data-node="${esc(p.id)}">${esc(p.label)}</button><a class="np-n" href="${postHref(p)}">열기</a></li>`).join('')}</ol>
<div class="np-actions"><a href="/?series=${encodeURIComponent(n.label)}">목록에서 보기</a></div>`;
      return;
    }
    const postsList = nb.filter((x) => x.n.type === 'post').sort((a, b) => b.link.w - a.link.w);
    // 같은 글에 함께 나온 대상 (공유하는 글 수)
    const co = new Map();
    for (const { n: p } of postsList) for (const { id } of neighbors(p.id)) {
      const m = byId.get(id); if (!m || m.id === n.id || m.type === 'post' || m.type === 'series') continue;
      co.set(id, (co.get(id) || 0) + 1);
    }
    const together = [...co].sort((a, b) => b[1] - a[1] || byId.get(b[0]).d - byId.get(a[0]).d).slice(0, 12).map(([id]) => byId.get(id));
    panel.innerHTML = `<p class="np-type">${dot(n.type)}${types[n.type]}</p><h2>${esc(n.label)}</h2>
${n.note ? `<p>${esc(n.note)}</p>` : ''}${n.aliases && n.aliases.length ? `<p class="np-muted">본문 표기: ${n.aliases.map(esc).join(', ')}</p>` : ''}
<h3>다룬 글 ${postsList.length}편</h3><ol class="np-posts">${postsList.map(({ n: p, link }) => `<li><button type="button" class="np-link" data-node="${esc(p.id)}">${esc(p.label)}</button><a class="np-n" href="${postHref(p)}" aria-label="${esc(p.short)} 열기">열기</a><span class="np-sub">${link.tag ? '태그 · ' : ''}${link.n ? `본문 언급 ${link.n}회` : '제목·요약에서'}</span></li>`).join('')}</ol>
${together.length ? `<h3>함께 다뤄진 것</h3><div class="np-chips">${together.map((m) => nodeButton(m)).join('')}</div>` : ''}
<div class="np-actions"><a href="/?tag=${encodeURIComponent(n.label)}">목록에서 이 대상의 글 보기</a></div>`;
  }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-node]');
    if (b) { e.preventDefault(); select(b.dataset.node); }
  });

  // ─── 찾기 ───
  const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
  const haystack = new Map(nodes.map((n) => [n.id, norm([n.label, ...(n.aliases || []), n.short || ''].join(' '))]));
  let results = [], active = -1;
  function runSearch() {
    const q = norm(input.value);
    for (const el of nodeEls.values()) el.classList.remove('is-match');
    if (!q) { svg.classList.remove('has-match'); matches = null; placeLabels(); closeSuggest(); return; }
    results = nodes.filter((n) => haystack.get(n.id).includes(q))
      .sort((a, b) => Number(norm(b.label).startsWith(q)) - Number(norm(a.label).startsWith(q)) || b.d - a.d);
    svg.classList.toggle('has-match', results.length > 0);
    for (const n of results) nodeEls.get(n.id).classList.add('is-match');
    matches = results.length ? new Set(results.map((n) => n.id)) : null;
    placeLabels();
    active = results.length ? 0 : -1;
    suggest.innerHTML = results.length
      ? results.slice(0, 8).map((n, i) => `<li role="option" id="ns-${i}" data-node="${esc(n.id)}" aria-selected="${i === active}">${dot(n.type)}<span>${esc(n.label)}</span><span class="ns-type">${types[n.type]}${n.type === 'post' ? '' : ` · ${n.d}`}</span></li>`).join('')
      : '<li class="ns-empty" role="option" aria-disabled="true">찾은 노드가 없습니다</li>';
    suggest.hidden = false; input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', active >= 0 ? 'ns-0' : '');
  }
  function closeSuggest() { suggest.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function moveActive(delta) {
    const items = [...suggest.querySelectorAll('[data-node]')]; if (!items.length) return;
    active = (active + delta + items.length) % items.length;
    items.forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    input.setAttribute('aria-activedescendant', `ns-${active}`);
  }
  function choose(id) {
    closeSuggest(); svg.classList.remove('has-match'); matches = null;
    for (const el of nodeEls.values()) el.classList.remove('is-match');
    select(id);
  }
  // 한글 IME: 조합 중에도 입력값으로 바로 찾는다(보여 주기). 고르기(Enter)만 조합이 끝난 뒤에.
  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runSearch, 90); });
  input.addEventListener('compositionend', () => { clearTimeout(timer); runSearch(); });
  input.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') {
      const item = suggest.querySelectorAll('[data-node]')[active];
      if (item) { e.preventDefault(); choose(item.dataset.node); input.blur(); canvas.focus({ preventScroll: true }); }
    } else if (e.key === 'Escape') { e.preventDefault(); if (input.value) { input.value = ''; runSearch(); } else input.blur(); }
  });
  suggest.addEventListener('mousedown', (e) => { const li = e.target.closest('[data-node]'); if (li) { e.preventDefault(); choose(li.dataset.node); } });
  input.addEventListener('blur', () => setTimeout(closeSuggest, 120));
  input.addEventListener('focus', () => { if (input.value) runSearch(); });

  // ─── 찾아보기 (정적 색인과 그림 잇기) ───
  for (const entry of document.querySelectorAll('.net-entry[data-node]')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ne-focus'; b.textContent = '연결망에서 보기';
    b.addEventListener('click', () => { select(entry.dataset.node); canvas.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); });
    entry.appendChild(b);
  }

  // ─── 단축키 ───
  const typeKeys = chips.map((c) => c.dataset.type);
  function toggleHelp(force) { help.hidden = force === undefined ? !help.hidden : !force; if (!help.hidden) help.querySelector('button').focus(); }
  document.querySelectorAll('[data-help]').forEach((b) => b.addEventListener('click', () => toggleHelp(true)));
  help.querySelector('[data-help-close]').addEventListener('click', () => { toggleHelp(false); canvas.focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229 || e.altKey) return;
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); return; }
    if (editing || e.metaKey || e.ctrlKey) return;
    if (e.key === '/') { e.preventDefault(); input.focus(); input.select(); }
    else if (e.key === '?') { e.preventDefault(); toggleHelp(); }
    else if (e.key === 'Escape') { if (!help.hidden) toggleHelp(false); else if (selected) clearSelection(); }
    else if (e.key === '+' || e.key === '=') zoomAt(1.35);
    else if (e.key === '-' || e.key === '_') zoomAt(1 / 1.35);
    else if (e.key === '0') fitTo(visibleNodes());
    else if (/^[1-9]$/.test(e.key) && typeKeys[Number(e.key) - 1]) { const t = typeKeys[Number(e.key) - 1]; setType(t, !isOn(t)); }
    else if (e.key === 'Enter' && document.activeElement === canvas && selected && byId.get(selected).type === 'post') location.href = postHref(byId.get(selected));
  });

  // ─── 주소 #n=노드 ───
  function fromHash() {
    const m = location.hash.match(/^#n=(.+)$/);
    if (m) { const id = decodeURIComponent(m[1]); if (byId.has(id)) { select(id, { updateHash: false }); return; } }
    renderPanel(null);
  }
  addEventListener('hashchange', fromHash);
  fromHash();
})();
