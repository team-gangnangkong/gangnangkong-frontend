// (() => {
//   const API_BASE = 'https://sorimap.it.com';
//   let _allFeeds = [];

//   // 공통 GET
//   async function apiGet(path) {
//     const res = await fetch(API_BASE + path, {
//       method: 'GET',
//       credentials: 'include',
//     });
//     if (!res.ok) {
//       const t = await res.text().catch(() => '');
//       throw new Error(`GET ${path} 실패: ${res.status} ${t}`);
//     }
//     return res.json();
//   }

//   // 내 피드 목록 불러오기
//   async function fetchMyFeeds() {
//     const list = await apiGet('/api/feeds/my');
//     _allFeeds = Array.isArray(list) ? list : [];
//     renderFeedList(_allFeeds);
//   }

//   // 리스트 렌더
//   function renderFeedList(list) {
//     const wrap = document.querySelector('#my-feed-list');
//     if (!wrap) return;

//     if (!list.length) {
//       wrap.innerHTML = `
//         <div style="padding:24px;color:#9CA3AF;font-size:14px;">작성한 피드가 없어요.</div>
//       `;
//       return;
//     }

//     wrap.innerHTML = list.map(buildCardHTML).join('');

//     // 카드 클릭 → 상세로 이동
//     wrap.querySelectorAll('.card[data-feedid]').forEach((card) => {
//       card.addEventListener('click', () => {
//         const id = card.dataset.feedid;
//         location.href = `feed-detail.html?feedId=${encodeURIComponent(id)}`;
//       });
//     });
//   }

//   // 카드 한 개 HTML
//   function buildCardHTML(feed) {
//     const {
//       feedId,
//       title = '',
//       location = '',
//       likeCount = 0,
//       commentCount = 0,
//       imageUrl = '',
//     } = feed;

//     const badge = extractDistrict(location) || '지역';
//     const img = imageUrl || './image/trash.jpg'; // 이미지 없으면 기본 이미지

//     return `
//       <div class="card" data-feedid="${feedId}">
//         <div class="card-img-wrap">
//           <img src="${img}" class="card-img" alt="${escapeHtml(title)}" />
//           <span class="badge">${badge}</span>
//         <a class="card-arrow"
//    href="feed-detail.html?feedId=${feedId}"
//    aria-label="상세보기">
//   <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
//     <path d="M11 21C16.523 21 21 16.523 21 11C21 5.477 16.523 1 11 1C5.477 1 1 5.477 1 11C1 16.523 5.477 21 11 21Z" stroke="white" stroke-linejoin="round"/>
//     <path d="M9.5 15.5L14 11L9.5 6.5" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
//   </svg>
// </a>
//         </div>
//         <div class="card-content">
//           <div class="card-title-row">
//             <div class="card-title">${escapeHtml(title)}</div>

//             <span class="card-like">
//               <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
//   <!-- 손바닥 부분(안쪽 사각형) -->
//   <path
//     d="M9 11v10H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z"
//     fill="none"
//     stroke="currentColor"
//     stroke-width="1.8"
//     stroke-linejoin="round"
//     stroke-linecap="round"
//   />
//   <!-- 엄지/바깥 라인 -->
//   <path
//     d="M9 11l4.2-7.2a2 2 0 0 1 3.7.9v5.3h3a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1.5H9V11Z"
//     fill="none"
//     stroke="currentColor"
//     stroke-width="1.8"
//     stroke-linejoin="round"
//     stroke-linecap="round"
//   />
// </svg>
//               <span>${likeCount}</span>
//             </span>

//             <span class="card-comment">
//               <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
//                 <path d="M9.49968 1.58301C13.8721 1.58301 17.4163 5.1273 17.4163 9.49967C17.4163 13.872 13.8721 17.4163 9.49968 17.4163C8.23617 17.4181 6.99075 17.1162 5.86831 16.536L2.83939 17.3807..." fill="#F87171"/>
//               </svg>
//               <span>${commentCount}</span>
//             </span>
//           </div>

//           <div class="card-desc">
//             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none">
//               <path d="M12.2427 3.09087C13.3443 4.19229 13.9743 5.67894 13.9995 7.23648..." fill="#9CA3AF"/>
//             </svg>
//             <span>${escapeHtml(location || '위치 정보 없음')}</span>
//           </div>
//         </div>
//       </div>
//     `;
//   }

//   // 위치 문자열에서 "○○구" 뱃지 뽑기
//   function extractDistrict(location) {
//     if (!location) return '';
//     const m = location.match(/(분당구|수정구|중원구|[가-힣A-Za-z]+구)/);
//     return m ? m[1] : '';
//   }

//   function escapeHtml(str) {
//     return String(str ?? '').replace(
//       /[&<>"']/g,
//       (s) =>
//         ({
//           '&': '&amp;',
//           '<': '&lt;',
//           '>': '&gt;',
//           '"': '&quot;',
//           "'": '&#39;',
//         }[s])
//     );
//   }

//   // 검색창 필터 (제목/위치에서 검색)
//   function bindSearch() {
//     const input = document.querySelector('.search-bar input');
//     if (!input) return;
//     input.addEventListener('input', () => {
//       const q = input.value.trim().toLowerCase();
//       const filtered = _allFeeds.filter(
//         (f) =>
//           (f.title || '').toLowerCase().includes(q) ||
//           (f.location || '').toLowerCase().includes(q)
//       );
//       renderFeedList(filtered);
//     });
//   }

//   // 카테고리 칩 토글(필요하면 서버 category 필드로 필터링 추가)
//   function bindChips() {
//     document.querySelectorAll('.category-btn').forEach((btn) => {
//       btn.addEventListener('click', () => {
//         document
//           .querySelectorAll('.category-btn')
//           .forEach((b) => b.classList.remove('active'));
//         btn.classList.add('active');

//         const type = btn.dataset.type || 'all';
//         // 백엔드에서 category/type 제공 시 아래 사용:
//         // const filtered = type === 'all' ? _allFeeds : _allFeeds.filter(f => (f.category || f.type) === type);
//         // renderFeedList(filtered);
//         // 현재는 서버 필드가 없으니 전체 유지
//         renderFeedList(_allFeeds);
//       });
//     });
//   }

//   // 시작
//   document.addEventListener('DOMContentLoaded', () => {
//     bindChips();
//     bindSearch();
//     fetchMyFeeds().catch((err) => {
//       console.error(err);
//       const wrap = document.querySelector('#my-feed-list');
//       if (wrap)
//         wrap.innerHTML = `<div style="padding:24px;color:#ef4444;">목록을 불러오지 못했어요.</div>`;
//     });
//   });
// })();

(() => {
  const API_BASE = 'https://sorimap.it.com'; // 같은 도메인이면 ''로 둬도 OK
  const USE_MOCK = new URLSearchParams(location.search).has('mock');
  const MOCK_FEEDS = [
    {
      feedId: 1,
      title: '모란역 3번 출구 쓰레기',
      location: '성남시 수정구 산성대로 지하 100',
      likeCount: 20,
      commentCount: 20,
      imageUrl: './image/trash.jpg',
      authorNickname: '최가을',
    },
    {
      feedId: 2,
      title: '단대오거리역 신호등 문제',
      location: '성남시 중원구 산성대로 200',
      likeCount: 3,
      commentCount: 1,
      imageUrl: './image/trash.jpg',
      authorNickname: '을랑이',
    },
    {
      feedId: 3,
      title: '야탑역 분리수거장 악취',
      location: '성남시 분당구 야탑로 12',
      likeCount: 7,
      commentCount: 4,
      imageUrl: './image/trash.jpg',
      authorNickname: '을랑이',
    },
  ];

  let _allFeeds = [];

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

  // 목록 가져오기 (mock=1이거나 비어있으면 목업 사용)
  async function fetchMyFeeds() {
    try {
      let list = USE_MOCK ? [] : await apiGet('/api/feeds/my');
      if (USE_MOCK || !Array.isArray(list) || list.length === 0)
        list = MOCK_FEEDS;
      _allFeeds = list;
      renderFeedList(list);
    } catch (e) {
      console.error(e);
      _allFeeds = MOCK_FEEDS;
      renderFeedList(_allFeeds);
    }
  }

  function renderFeedList(list) {
    const wrap = document.querySelector('#my-feed-list');
    if (!wrap) return;

    if (!list.length) {
      wrap.innerHTML = `<div style="padding:24px;color:#9CA3AF;font-size:14px;">작성한 피드가 없어요.</div>`;
      return;
    }

    const mockQS = USE_MOCK ? '&mock=1' : '';
    wrap.innerHTML = list
      .map((feed) => {
        const {
          feedId,
          title = '',
          location = '',
          likeCount = 0,
          commentCount = 0,
          imageUrl = '',
        } = feed;
        const badge = extractDistrict(location) || '지역';
        const img = imageUrl || './image/trash.jpg';
        return `
        <div class="card" data-feedid="${feedId}">
          <div class="card-img-wrap">
            <img src="${img}" class="card-img" alt="${escapeHtml(title)}" />
            <span class="badge">${badge}</span>
            <a class="card-arrow" href="feed-detail.html?feedId=${encodeURIComponent(
              feedId
            )}${mockQS}" aria-label="상세보기">
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
  <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
    <path d="M9 11v10H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z" fill="currentColor"/>
    <path d="M9 11l4.2-7.2a2 2 0 0 1 3.7.9v5.3h3a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1.5H9V11Z" fill="currentColor"/>
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
       <path fill="currentColor"
      d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5z"/>
  </svg>
  <span>${escapeHtml(location || '위치 정보 없음')}</span>
   </div>
          </div>
        </div>`;
      })
      .join('');

    // 카드 전체 클릭 → 상세 이동(우상단 화살표 클릭은 제외)
    wrap.querySelectorAll('.card[data-feedid]').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target instanceof Element && e.target.closest('.card-arrow'))
          return;
        const id = card.dataset.feedid;
        location.href = `feed-detail.html?feedId=${encodeURIComponent(
          id
        )}${mockQS}`;
      });
    });
  }

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

  // 검색/칩(간단 버전)
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
  function bindChips() {
    document.querySelectorAll('.category-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.category-btn')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderFeedList(_allFeeds); // 실제 카테고리 필터 있으면 여기서 필터링
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindChips();
    bindSearch();
    fetchMyFeeds().catch(() => {
      const wrap = document.querySelector('#my-feed-list');
      if (wrap)
        wrap.innerHTML = `<div style="padding:24px;color:#ef4444;">목록을 불러오지 못했어요.</div>`;
    });
  });
})();
