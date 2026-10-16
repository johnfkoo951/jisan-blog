(() => {
  const article = document.querySelector('article.post');
  if (!article) return;
  const prose = article.querySelector('.prose');
  const status = document.querySelector('#actionStatus');
  let announcementTimer;
  const announce = (message) => { clearTimeout(announcementTimer); status.textContent = message; announcementTimer = setTimeout(() => { status.textContent = ''; }, 5000); };
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  };
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
    if (event.isComposing || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (((event.metaKey || event.ctrlKey) && event.key === 'k') || (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey)) {
      event.preventDefault(); location.href = '/?search=1';
    }
  });
  // No local counter: only values acknowledged by the shared server are displayed.
  const panel = document.querySelector('.engagement');
  const like = document.querySelector('#likeButton');
  const metrics = document.querySelector('#viewCount');
  const slug = article.dataset.slug;
  const endpoint = `/api/engagement?slug=${encodeURIComponent(slug)}`;
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
      body: JSON.stringify({ action }), credentials: 'same-origin',
    } : { credentials: 'same-origin' });
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
