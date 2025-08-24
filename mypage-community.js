(() => {
  const API_BASE = 'https://sorimap.it.com';
  let _allFeeds = [];

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
    _allFeeds = Array.isArray(list) ? list : [];
    renderFeedList(_allFeeds);
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

  // 카드 한 개 HTML
  function buildCardHTML(feed) {
    const {
      feedId,
      title = '',
      location = '',
      likeCount = 0,
      commentCount = 0,
      imageUrl = '',
    } = feed;

    const badge = extractDistrict(location) || '지역';
    const img = imageUrl || './image/trash.jpg'; // 이미지 없으면 기본 이미지

    return `
      <div class="card" data-feedid="${feedId}">
        <div class="card-img-wrap">
          <img src="${img}" class="card-img" alt="${escapeHtml(title)}" />
          <span class="badge">${badge}</span>
        <a class="card-arrow" 
   href="feed-detail.html?feedId=${feedId}" 
   aria-label="상세보기">
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
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="18" viewBox="0 0 19 18" fill="none">
                <path d="M15.665 7.1625C15.3425 6.78 14.8775 6.5625 14.375 6.5625H11.3525V4.5C11.3525 3.36 10.43 2.4375 9.23 2.4375C8.705 2.4375 8.2325 2.7525 8.0225 3.24L6.1175 7.6875H4.715C3.7325 7.6875 2.9375 8.4825 2.9375 9.465V13.7925C2.9375 14.7675 3.74 15.5625 4.715 15.5625H13.385C14.2025 15.5625 14.9 14.9775 15.0425 14.1675L16.0325 8.5425C16.115 8.0475 15.98 7.545 15.6575 7.1625H15.665Z" fill="#F87171"/>
              </svg>
              <span>${likeCount}</span>
            </span>

            <span class="card-comment">
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
                <path d="M9.49968 1.58301C13.8721 1.58301 17.4163 5.1273 17.4163 9.49967C17.4163 13.872 13.8721 17.4163 9.49968 17.4163C8.23617 17.4181 6.99075 17.1162 5.86831 16.536L2.83939 17.3807..." fill="#F87171"/>
              </svg>
              <span>${commentCount}</span>
            </span>
          </div>

          <div class="card-desc">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none">
              <path d="M12.2427 3.09087C13.3443 4.19229 13.9743 5.67894 13.9995 7.23648..." fill="#9CA3AF"/>
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
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      const filtered = _allFeeds.filter(
        (f) =>
          (f.title || '').toLowerCase().includes(q) ||
          (f.location || '').toLowerCase().includes(q)
      );
      renderFeedList(filtered);
    });
  }

  // 카테고리 칩 토글(필요하면 서버 category 필드로 필터링 추가)
  function bindChips() {
    document.querySelectorAll('.category-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.category-btn')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.dataset.type || 'all';
        // 백엔드에서 category/type 제공 시 아래 사용:
        // const filtered = type === 'all' ? _allFeeds : _allFeeds.filter(f => (f.category || f.type) === type);
        // renderFeedList(filtered);
        // 현재는 서버 필드가 없으니 전체 유지
        renderFeedList(_allFeeds);
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
