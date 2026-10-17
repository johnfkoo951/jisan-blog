(() => {
  const article = document.querySelector('article.post');
  if (!article) return;
  const prose = article.querySelector('.prose');
  const status = document.querySelector('#actionStatus');
  let announcementTimer;
  let announcementTarget = status;
  const announce = (message) => {
    clearTimeout(announcementTimer); announcementTarget.textContent = '';
    announcementTarget = document.querySelector('.reader-rail[aria-modal="true"] [data-panel-status]') || status;
    announcementTarget.textContent = message;
    announcementTimer = setTimeout(() => { announcementTarget.textContent = ''; }, 5000);
  };
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  };
  // Wide layouts keep the article centered. Narrow layouts use one explicit modal drawer.
  const controls = document.querySelector('.reader-panel-controls');
  const rails = { toc: document.querySelector('#reader-toc-panel'), info: document.querySelector('#reader-info-panel') };
  const toggles = Object.fromEntries([...document.querySelectorAll('[data-panel-toggle]')].map(el => [el.dataset.panelToggle, el]));
  const backdrop = document.querySelector('.reader-backdrop');
  const hasPanels = !!(controls && rails.toc && rails.info && backdrop && toggles.toc && toggles.info);
  const wide = matchMedia('(min-width: 1360px)');
  const savedOpen = name => { const value = storage.get(`jisan-reader-${name}`); return value === null ? name === 'toc' : value === 'open'; };
  let openPanels = { toc: wide.matches && savedOpen('toc'), info: wide.matches && savedOpen('info') };
  let lastPanel = 'toc', modalPanel = null;
  const inertBefore = new Map();
  const headings = [...prose.querySelectorAll('h2[id],h3[id],h4[id]')];
  const tocLinks = [...document.querySelectorAll('[data-toc-section]')];
  const childLists = [...document.querySelectorAll('[data-toc-children]')];
  let currentSection = null;

  function toggleBackground(lock) {
    if (lock && !inertBefore.size) {
      for (const el of document.body.children) {
        if (Object.values(rails).includes(el) || el === backdrop || el.tagName === 'SCRIPT') continue;
        inertBefore.set(el, el.inert); el.inert = true;
      }
    } else if (!lock) {
      for (const [el, wasInert] of inertBefore) el.inert = wasInert;
      inertBefore.clear();
    }
    document.documentElement.classList.toggle('reader-modal-open', lock);
  }
  function renderPanels() {
    modalPanel = !wide.matches ? Object.keys(rails).find(name => openPanels[name]) || null : null;
    toggleBackground(!!modalPanel);
    backdrop.hidden = !modalPanel;
    for (const [name, rail] of Object.entries(rails)) {
      rail.hidden = !openPanels[name];
      rail.setAttribute('role', modalPanel === name ? 'dialog' : 'complementary');
      if (modalPanel === name) rail.setAttribute('aria-modal', 'true'); else rail.removeAttribute('aria-modal');
      toggles[name].setAttribute('aria-expanded', String(openPanels[name]));
      toggles[name].setAttribute('aria-label', `${name === 'toc' ? '목차' : '글 정보'} ${openPanels[name] ? '닫기' : '열기'}`);
    }
  }
  function setPanel(name, open, focus = true) {
    if (!wide.matches && open) openPanels = { toc:false, info:false };
    openPanels[name] = open; lastPanel = name;
    if (wide.matches) storage.set(`jisan-reader-${name}`, open ? 'open' : 'closed');
    renderPanels();
    if (focus) (open ? rails[name] : toggles[name]).focus({preventScroll:true});
  }
  function updateRails() {
    if (!hasPanels) return;
    const top = Math.max(16, Math.min(180, document.querySelector('.reader-main').getBoundingClientRect().top + 32));
    document.documentElement.style.setProperty('--reader-rail-top', `${top}px`);
    let active = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= (wide.matches ? 96 : 144)) active = heading.id; else break;
    }
    if (headings.length && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) active = headings.at(-1).id;
    if (active === currentSection) return;
    currentSection = active;
    const current = tocLinks.find(link => link.dataset.tocSection === active);
    const group = current?.dataset.tocGroup;
    for (const link of tocLinks) {
      if (link === current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    }
    const focusedGroup = rails.toc.contains(document.activeElement) ? document.activeElement.closest('[data-toc-group]')?.dataset.tocGroup : null;
    for (const list of childLists) list.hidden = list.dataset.tocChildren !== group && list.dataset.tocChildren !== focusedGroup;
    document.querySelectorAll('[data-toc-branch]').forEach(el => el.classList.toggle('is-current', el.dataset.tocBranch === group));
    // Do not pull the document or a keyboard-focused TOC while following scroll position.
    if (current && openPanels.toc && !rails.toc.contains(document.activeElement)) {
      const scroller = rails.toc.querySelector('.rail-scroll');
      const target = current.getBoundingClientRect(), box = scroller.getBoundingClientRect();
      if (target.top < box.top || target.bottom > box.bottom) scroller.scrollTop += target.top - box.top - box.height / 3;
    }
  }
  if (hasPanels) {
    for (const [name, button] of Object.entries(toggles)) button.addEventListener('click', () => setPanel(name, !openPanels[name]));
    document.querySelectorAll('[data-panel-close]').forEach(button => button.addEventListener('click', () => setPanel(button.dataset.panelClose, false)));
    backdrop.addEventListener('click', () => { if (modalPanel) setPanel(modalPanel, false); });
    rails.toc.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (modalPanel === 'toc') {
        setPanel('toc', false, false);
        const target = document.getElementById(link.hash.slice(1));
        if (target) { target.tabIndex = -1; target.focus({preventScroll:true}); }
      }
    });
    wide.addEventListener('change', () => {
      const focused = Object.entries(rails).find(([, rail]) => rail.contains(document.activeElement))?.[0];
      openPanels = { toc:wide.matches && savedOpen('toc'), info:wide.matches && savedOpen('info') };
      renderPanels(); updateRails();
      if (focused && !openPanels[focused]) toggles[focused].focus({preventScroll:true});
    });
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      if (modalPanel && event.key === 'Tab') {
        const focusable = [...rails[modalPanel].querySelectorAll('a[href],button,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (!first) { event.preventDefault(); rails[modalPanel].focus(); return; }
        const at = document.activeElement;
        if (event.shiftKey && (at === first || !focusable.includes(at))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (at === last || !focusable.includes(at))) { event.preventDefault(); first.focus(); }
        return;
      }
      if (event.key === 'Escape' && (openPanels.toc || openPanels.info)) {
        const focused = Object.entries(rails).find(([, rail]) => rail.contains(document.activeElement))?.[0];
        const name = modalPanel || focused || (openPanels[lastPanel] ? lastPanel : openPanels.toc ? 'toc' : 'info');
        event.preventDefault(); setPanel(name, false); return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
      if (event.key === '[' || event.key === ']') { event.preventDefault(); const name = event.key === '[' ? 'toc' : 'info'; setPanel(name, !openPanels[name]); }
    });
    document.querySelector('[data-copy-section]').addEventListener('click', async () => {
      const url = document.querySelector('link[rel="canonical"]').href + '#' + (currentSection || 'article-title');
      try { await navigator.clipboard.writeText(url); announce('현재 절 링크를 복사했습니다.'); }
      catch { announce('자동 복사를 지원하지 않습니다. 목차 링크의 주소를 복사해 주세요.'); }
    });
    document.querySelectorAll('[data-copy-url]').forEach(button => button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(document.querySelector('link[rel="canonical"]').href); announce('글 주소를 복사했습니다.'); }
      catch { announce('자동 복사를 지원하지 않습니다. 아래 인용문의 주소를 복사해 주세요.'); }
    }));
    controls.hidden = false;
    document.documentElement.dataset.readerPanels = 'ready';
    renderPanels(); updateRails();
  }

  const defaultSize = 18;
  let size = Number(storage.get('jisan-reading-size')) || defaultSize;
  const applySize = () => { size = Math.max(16, Math.min(23, size)); prose.style.setProperty('--reading-size', `${size}px`); };
  applySize();
  document.querySelectorAll('[data-font-step]').forEach(button => button.addEventListener('click', () => {
    size += Number(button.dataset.fontStep); applySize(); storage.set('jisan-reading-size', size);
    announce(`본문 글자 크기 ${size}px`);
  }));
  document.querySelector('[data-font-reset]').addEventListener('click', () => {
    size = defaultSize; applySize(); storage.set('jisan-reading-size', size);
    announce(`본문 글자 크기를 기본 ${size}px로 되돌렸습니다.`);
  });
  const progress = document.querySelector('.reading-progress span');
  let scheduled = false;
  function updateProgress() {
    const rect = prose.getBoundingClientRect();
    const distance = rect.height - window.innerHeight;
    const fraction = distance > 0 ? Math.max(0, Math.min(1, -rect.top / distance)) : (rect.top <= 0 ? 1 : 0);
    progress.style.transform = `scaleX(${fraction})`;
    updateRails();
    scheduled = false;
  }
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } };
  addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(prose);
  schedule();
  const canonical = document.querySelector('link[rel="canonical"]').href;
  document.querySelectorAll('[data-share]').forEach(button => button.addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: canonical });
      else { await navigator.clipboard.writeText(canonical); announce('글 주소를 복사했습니다.'); }
    } catch (error) { if (error.name !== 'AbortError') announce('공유하지 못했습니다. 아래 영속 주소를 복사해 주세요.'); }
  }));
  document.querySelectorAll('.cite-copy').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.cite); announce('인용문을 복사했습니다.'); }
    catch { announce('자동 복사가 지원되지 않습니다. 아래 인용문을 선택해 복사해 주세요.'); }
  }));
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || modalPanel || event.isComposing || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (((event.metaKey || event.ctrlKey) && event.key === 'k') || (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey)) {
      event.preventDefault(); location.href = '/?search=1';
    }
  });
  // No local counter: only values acknowledged by the shared server are displayed.
  const panel = document.querySelector('.engagement');
  const like = document.querySelector('#likeButton');
  const metrics = document.querySelector('#viewCount');
  const slug = article.dataset.slug;
  const endpoint = `/api/engagement/?slug=${encodeURIComponent(slug)}`;
  let mutationQueue = Promise.resolve();
  function request(action) {
    if (!action) return sendRequest();
    const next = mutationQueue.then(() => sendRequest(action));
    mutationQueue = next.catch(() => {});
    return next;
  }
  async function sendRequest(action) {
    const response = await fetch(endpoint, action ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }), credentials: 'same-origin', signal: AbortSignal.timeout(8000),
    } : { credentials: 'same-origin', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Engagement unavailable');
    const result = await response.json();
    if (!result.enabled) throw new Error('Engagement not configured');
    return result;
  }
  function render(data) {
    metrics.textContent = `조회 ${Number(data.views).toLocaleString('ko-KR')}`;
    metrics.hidden = false; panel.hidden = false;
    like.setAttribute('aria-pressed', String(data.liked));
    like.textContent = `${data.liked ? '♥ 좋아요 취소' : '♡ 좋아요'} ${Number(data.likes).toLocaleString('ko-KR')}`;
  }
  like.addEventListener('click', async () => {
    like.disabled = true;
    try { const liked = like.getAttribute('aria-pressed') === 'true'; render(await request(liked ? 'unlike' : 'like')); announce(liked ? '좋아요를 취소했습니다.' : '좋아요를 남겼습니다. 감사합니다.'); }
    catch { announce('반응을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); }
    finally { like.disabled = false; }
  });
  // Disabled on static previews. One view per anonymous browser/post/day, after visible dwell.
  request().then(data => {
    render(data);
    let timer;
    let counted = false;
    const dwell = () => {
      clearTimeout(timer);
      if (!counted && document.visibilityState === 'visible') timer = setTimeout(async () => {
        counted = true;
        try { render(await request('view')); } catch {}
        document.removeEventListener('visibilitychange', dwell);
      }, 8000);
    };
    document.addEventListener('visibilitychange', dwell); dwell();
  }).catch(() => {});
})();
