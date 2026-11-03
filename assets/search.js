(() => {
  const input = document.querySelector('#q');
  if (!input) return;
  const results = document.querySelector('#sr');
  const list = document.querySelector('#postList');
  const status = document.querySelector('#searchStatus');
  let index, pending, timer;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function highlight(text, terms) {
    const lower = text.toLowerCase();
    let output = '', position = 0;
    while (position < text.length) {
      let start = text.length, length = 0;
      for (const term of terms) {
        const at = lower.indexOf(term, position);
        if (at >= 0 && at < start) { start = at; length = term.length; }
      }
      output += esc(text.slice(position, start));
      if (!length) break;
      output += '<mark>' + esc(text.slice(start, start + length)) + '</mark>';
      position = start + length;
    }
    return output;
  }
  async function load() {
    if (index) return index;
    if (!pending) pending = fetch('/search-index.json').then(response => {
      if (!response.ok) throw new Error('Search unavailable');
      return response.json();
    }).then(data => { index = data; return data; }).finally(() => { pending = null; });
    return pending;
  }
  async function search() {
    const query = input.value.trim();
    if (!query) { results.hidden = true; list.hidden = false; status.textContent = ''; return; }
    status.textContent = '전체 글에서 찾는 중…';
    try {
      const data = await load();
      if (query !== input.value.trim()) return;
      const terms = query.toLowerCase().split(/\s+/);
      const matches = data.map(post => {
        const fields = [post.title, (post.keywords || []).join(' '), post.headings.join(' '), post.summary || '', post.text].map(s => s.toLowerCase());
        const score = terms.every(term => fields.some(field => field.includes(term)))
          ? terms.reduce((total, term) => total + fields.reduce((sum, field, i) => sum + (field.includes(term) ? [10, 6, 5, 4, 1][i] : 0), 0), 0) : 0;
        return { post, score };
      }).filter(row => row.score).sort((a, b) => b.score - a.score);
      results.innerHTML = matches.slice(0, 20).map(({ post }) => {
        const position = Math.max(0, post.text.toLowerCase().indexOf(terms[0]) - 35);
        const snippet = post.text.slice(position, position + 150);
        return `<li><div class="s-meta">${esc(post.kind)} / ${esc(post.date.slice(0, 10))}</div><h3><a href="/posts/${encodeURIComponent(post.slug)}/">${esc(post.title)}</a></h3><p class="s-snippet">${position ? '…' : ''}${highlight(snippet, terms)}…</p></li>`;
      }).join('');
      results.hidden = false; list.hidden = true;
      status.textContent = matches.length ? `전체 글에서 ${matches.length}편${matches.length > 20 ? ', 상위 20편 표시' : ''}` : '일치하는 글이 없습니다. 다른 단어로 검색해 보세요.';
    } catch {
      if (query !== input.value.trim()) return;
      results.hidden = true; list.hidden = false;
      status.textContent = '검색을 불러오지 못했습니다. 다시 입력하거나 아래 목록을 이용해 주세요.';
    }
  }
  // 한글 IME: 조합 중(isComposing)에도 input.value 에는 조합 중인 글자가 들어 있다. 걸러내지 않고 그대로 검색한다.
  // compositionend 는 마지막 확정 상태를 한 번 더 반영한다 (브라우저마다 확정 뒤 input 이벤트 유무가 다르다).
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 150); });
  input.addEventListener('compositionend', () => { clearTimeout(timer); search(); });
  input.addEventListener('focus', () => { load().catch(() => {}); });
  document.addEventListener('keydown', event => {
    if (event.isComposing || event.altKey) return;
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
    if (((event.metaKey || event.ctrlKey) && event.key === 'k') || (!editing && !event.metaKey && !event.ctrlKey && event.key === '/')) { event.preventDefault(); input.focus(); }
    if (event.key === 'Escape' && event.target === input) { input.value = ''; search(); input.blur(); }
  });
  // 태그·시리즈 필터: /?tag=정식표기 는 그 대상을 다룬 글(태그로 단 글 먼저), /?series=이름 은 시리즈를 읽는 순서로.
  const filterBox = document.querySelector('#listFilter');
  async function applyFilter(tag, series) {
    if (!filterBox) return;
    try {
      const data = await load();
      const rows = series
        ? data.filter(post => post.series === series).sort((a, b) => a.seriesOrder - b.seriesOrder)
        : data.filter(post => (post.tags || []).includes(tag) || (post.entities || []).includes(tag))
            .sort((a, b) => Number((b.tags || []).includes(tag)) - Number((a.tags || []).includes(tag)));
      const items = new Map([...list.querySelectorAll(':scope > li[data-slug]')].map(li => [li.dataset.slug, li]));
      for (const li of items.values()) li.hidden = true;
      let shown = 0;
      for (const post of rows) { const li = items.get(post.slug); if (li) { li.hidden = false; list.appendChild(li); shown++; } }
      const label = series ? `<strong>${esc(series)}</strong>` : `<strong>#${esc(tag.replace(/\s+/g, ''))}</strong>`;
      const node = series ? `series:${series}` : tag;
      filterBox.innerHTML = shown
        ? `<span>${label} · ${series ? '시리즈' : '다룬 글'} <b>${shown}</b>편</span><span class="lf-note">${series ? '읽는 순서대로' : '태그로 단 글 먼저'}</span><span class="lf-actions"><a href="/network/#n=${encodeURIComponent(node)}">연결망에서 보기</a><a href="${location.pathname}">필터 해제</a></span>`
        : `<span>${label} · 이 목록에는 해당하는 글이 없습니다.</span><span class="lf-actions"><a href="/">전체 글</a></span>`;
      filterBox.hidden = false;
      document.title = `${series || '#' + tag} — ${document.title}`;
    } catch {
      filterBox.textContent = '필터를 불러오지 못했습니다. 아래 전체 목록을 이용해 주세요.';
      filterBox.hidden = false;
    }
  }
  const parameters = new URLSearchParams(location.search);
  if (parameters.has('tag') || parameters.has('series')) applyFilter((parameters.get('tag') || '').slice(0, 80), (parameters.get('series') || '').slice(0, 80));
  if (parameters.has('q')) { input.value = parameters.get('q').slice(0, 200); search(); }
  if (parameters.has('search')) input.focus();
})();
