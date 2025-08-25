(() => {
  const API_BASE = 'https://sorimap.it.com';
  let _allFeeds = [];

  // ---- 타입 정규화 ('civil' | 'culture') ----
  function normalizeFeedType(feed) {
    // 서버에서 올 수 있는 다양한 키를 최대한 수용
    const raw = (
      feed?.type ??
      feed?.feedType ??
      feed?.category ??
      feed?.kind ??
      feed?.sentiment ??
      ''
    )
      .toString()
      .trim()
      .toUpperCase();

    // 가장 확실: 작성시 저장한 type
    if (
      raw === 'MINWON' ||
      raw === 'CIVIL' ||
      raw === 'NEG' ||
      raw === 'NEGATIVE'
    )
      return 'civil';
    if (
      raw === 'MUNHWA' ||
      raw === 'CULTURE' ||
      raw === 'POS' ||
      raw === 'POSITIVE'
    )
      return 'culture';

    // 혹시 title 등에 '민원/문화' 단어가 포함된 경우의 보정(옵션)
    const t = (feed?.title ?? '').toString();
    if (/민원/.test(t)) return 'civil';
    if (/문화/.test(t)) return 'culture';

    // 모르겠으면 null (전체 탭에서는 보이고, 민원/문화 탭에서는 제외)
    return null;
  }

  const absolutize = (u) => {
    if (!u) return u;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('http://')) return u.replace(/^http:\/\//, 'https://');
    if (u.startsWith('/')) return API_BASE + u;
    return u;
  };

  // 어떤 키로 오든 첫 번째 이미지 뽑기
  const firstImageUrl = (feed) => {
    const cand =
      feed?.imageUrl ??
      feed?.imageUrls?.[0] ?? // ["..."]
      feed?.images?.[0]?.url ?? // [{url:"..."}]
      feed?.images?.[0] ?? // ["..."]
      feed?.files?.[0]?.url ?? // [{url:"..."}]
      feed?.files?.[0]; // ["..."]
    return cand ? absolutize(cand) : null;
  };

  // 공통 GET
  async function apiGet(path) {
    const res = await fetch(API_BASE + path, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`GET ${path} 실패: ${res.status} ${t}`);
    }
    return res.json();
  }

  // 내 피드 목록 불러오기
  async function fetchMyFeeds() {
    const list = await apiGet('/api/feeds/my');
    _allFeeds = (Array.isArray(list) ? list : []).map((f) => ({
      ...f,
      _type: normalizeFeedType(f), // 'civil' | 'culture' | null
    }));
    renderFiltered();
  }

  // 리스트 렌더
  function renderFeedList(list) {
    const wrap = document.querySelector('#my-feed-list');
    if (!wrap) return;

    if (!list.length) {
      wrap.innerHTML = `
        <div style="padding:24px;color:#9CA3AF;font-size:14px;">작성한 피드가 없어요.</div>
      `;
      return;
    }

    wrap.innerHTML = list.map(buildCardHTML).join('');

    // 카드 클릭 → 상세로 이동
    wrap.querySelectorAll('.card[data-feedid]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.feedid;
        location.href = `feed-detail.html?feedId=${encodeURIComponent(id)}`;
      });
    });
  }

  function getActiveChipType() {
    return (
      document.querySelector('.category-btn.active')?.dataset.type || 'all'
    ); // 'all' | 'civil' | 'culture'
  }

  function getSearchQuery() {
    return (
      document.querySelector('.search-bar input')?.value.trim().toLowerCase() ||
      ''
    );
  }

  function renderFiltered() {
    const chip = getActiveChipType(); // 탭 상태
    const q = getSearchQuery(); // 검색어

    const filtered = _allFeeds.filter((f) => {
      const okType = chip === 'all' || f._type === chip;
      if (!okType) return false;

      if (!q) return true;
      const title = (f.title || '').toLowerCase();
      const loc = (f.location || '').toLowerCase();
      return title.includes(q) || loc.includes(q);
    });

    renderFeedList(filtered);
  }

  // 카드 한 개 HTML
  function buildCardHTML(feed) {
    const {
      feedId,
      title = '',
      location = '',
      likeCount = 0,
      commentCount = 0,
    } = feed;

    const badge = extractDistrict(location) || '지역';

    // ✅ 여기만 바꾸면 됨
    const imgSrc = firstImageUrl(feed) || './image/trash.jpg';

    return `
    <div class="card" data-feedid="${feedId}">
      <div class="card-img-wrap">
        <img src="${imgSrc}" class="card-img" alt="${escapeHtml(
      title
    )}" loading="lazy"
             onerror="this.src='./image/trash.jpg'"/>
        <span class="badge">${badge}</span>
        <a class="card-arrow" href="feed-detail.html?feedId=${feedId}" aria-label="상세보기">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 21C16.523 21 21 16.523 21 11C21 5.477 16.523 1 11 1C5.477 1 1 5.477 1 11C1 16.523 5.477 21 11 21Z" stroke="white" stroke-linejoin="round"/>
            <path d="M9.5 15.5L14 11L9.5 6.5" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
      <div class="card-content">
        <div class="card-title-row">
          <div class="card-title">${escapeHtml(title)}</div>
          <span class="card-like">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <!-- 손바닥 부분(안쪽 사각형) -->
    <path
      d="M9 11v10H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    <!-- 엄지/바깥 라인 -->
    <path
      d="M9 11l4.2-7.2a2 2 0 0 1 3.7.9v5.3h3a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1.5H9V11Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
            <span>${likeCount}</span>
          </span>
          <span class="card-comment">
            <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
          <path d="M12 3c5 0 9 3.7 9 8.2S17 19.5 12 19.5c-1.4 0-2.8-.3-4.1-.8L4 20l.8-3.1C4 15.4 3 13.9 3 11.2 3 6.7 7 3 12 3Z"
                fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="7.5" y1="10" x2="16.5" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="7.5" y1="13" x2="14.5" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
            <span>${commentCount}</span>
          </span>
        </div>
        <div class="card-desc">
         <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
          <path fill="#9CA3AF"
            d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5z"/>
        </svg>
          <span>${escapeHtml(location || '위치 정보 없음')}</span>
        </div>
      </div>
    </div>
  `;
  }

  // 위치 문자열에서 "○○구" 뱃지 뽑기
  function extractDistrict(location) {
    if (!location) return '';
    const m = location.match(/(분당구|수정구|중원구|[가-힣A-Za-z]+구)/);
    return m ? m[1] : '';
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(
      /[&<>"']/g,
      (s) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }[s])
    );
  }

  // 검색창 필터 (제목/위치에서 검색)
  function bindSearch() {
    const input = document.querySelector('.search-bar input');
    if (!input) return;
    input.addEventListener('input', renderFiltered);
  }

  // 카테고리 칩 토글(필요하면 서버 category 필드로 필터링 추가)
  function bindChips() {
    document.querySelectorAll('.category-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.category-btn')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        renderFiltered();
      });
    });
  }

  // 시작
  document.addEventListener('DOMContentLoaded', () => {
    bindChips();
    bindSearch();
    fetchMyFeeds().catch((err) => {
      console.error(err);
      const wrap = document.querySelector('#my-feed-list');
      if (wrap)
        wrap.innerHTML = `<div style="padding:24px;color:#ef4444;">목록을 불러오지 못했어요.</div>`;
    });
  });
})();
