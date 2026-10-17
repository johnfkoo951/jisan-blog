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
  input.addEventListener('input', event => { clearTimeout(timer); if (!event.isComposing) timer = setTimeout(search, 150); });
  input.addEventListener('compositionend', search);
  input.addEventListener('focus', () => { load().catch(() => {}); });
  document.addEventListener('keydown', event => {
    if (event.isComposing || event.altKey) return;
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
    if (((event.metaKey || event.ctrlKey) && event.key === 'k') || (!editing && !event.metaKey && !event.ctrlKey && event.key === '/')) { event.preventDefault(); input.focus(); }
    if (event.key === 'Escape' && event.target === input) { input.value = ''; search(); input.blur(); }
  });
  const parameters = new URLSearchParams(location.search);
  if (parameters.has('q')) { input.value = parameters.get('q').slice(0, 200); search(); }
  if (parameters.has('search')) input.focus();
})();
