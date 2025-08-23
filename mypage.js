(() => {
  const API_BASE = 'https://sorimap.it.com'; // 백엔드 도메인
  const PATHS = {
    me: '/api/user/me',
    mypage: '/api/mypage',
    myFeeds: '/api/feeds/my',
    logout: '/api/user/logout',
  };
  const LOGOUT_CANDIDATES = [
    '/api/user/logout',
    '/api/auth/logout',
    '/api/logout',
    '/logout',
  ];
  let _isLoggingOut = false;
  const api = (p) => `${API_BASE}${p}`;
  const isJson = (res) =>
    res.headers.get('content-type')?.includes('application/json');

  // ── 마이페이지 정보 불러오기 ─────────────────────────────
  async function fetchMyPage() {
    try {
      const res = await fetch(api(PATHS.mypage), {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok || !isJson(res)) throw new Error('마이페이지 정보 조회 실패');
      const data = await res.json();
      hydrateProfile(data);
      hydrateLikeHistory(data.likeHistory);
      // myFeeds는 아래 fetchMyFeeds에서 채움(중복 렌더 방지)
    } catch (err) {
      console.error(err);
      // 로그인 안 된 상태면 인덱스로 돌려보내기(선택)
      try {
        const me = await fetch(api(PATHS.me), { credentials: 'include' });
        if (!me.ok) location.replace('index.html');
      } catch {}
    }
  }

 // ── 닉네임/프로필 ─────────────────────────────────────────────
function hydrateProfile(data) {
  const name =
    data?.nickname ||
    data?.name ||
    data?.username ||
    data?.profile?.nickname ||
    '사용자';

  document.querySelector('.profile-name')?.textContent = name;

  const avatarUrl =
    data?.profileImageUrl ||
    data?.profile_image_url ||
    data?.profile_image ||
    data?.profile?.profile_image_url ||
    data?.picture ||
    '';

  const isDefaultFlag =
    data?.isDefaultImage ??
    data?.is_default_image ??
    data?.profile?.is_default_image ??
    null;

  const kakaoDefaultPatterns = [
    /kakaocdn\.net\/.*default_profile/i,
    /kakaocdn\.net\/account_images\/default_/i,
  ];
  const isKakaoDefaultUrl =
    typeof avatarUrl === 'string' &&
    kakaoDefaultPatterns.some((re) => re.test(avatarUrl));

  // ✅ 네가 말한 기본 이미지 파일명 사용
  const FALLBACK = 'profile_default.png'; // 경로가 다르면 'img/profile_default.png'처럼 수정

  const shouldUseFallback =
    !avatarUrl || isDefaultFlag === true || isKakaoDefaultUrl;

  const avatarEl = document.querySelector('.profile-avatar');
  if (!avatarEl) return;

  const setBG = (url) => {
    avatarEl.style.backgroundImage = `url('${url}')`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
    avatarEl.style.borderRadius = '50%';
  };

  if (shouldUseFallback) {
    setBG(FALLBACK);
      avatarEl.classList.add('is-fallback');
  avatarEl.style.backgroundImage = `url('${FALLBACK}')`;
  } else {
    avatarEl.classList.remove('is-fallback');
  avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
    const img = new Image();
    img.onload = () => setBG(avatarUrl);
    img.onerror = () => setBG(FALLBACK);
    img.src = avatarUrl;
  }
}


  // 공감 히스토리 채우기 (기존 리스트 갈아끼움)
  function hydrateLikeHistory(list) {
    if (!Array.isArray(list)) return;
    const box = document.querySelector('.like-history-list');
    if (!box) return;

    box.innerHTML = list
      .map(
        (it) => `
        <div class="like-history-row">
          <div class="like-history-label">${it.weekLabel ?? '-'}</div>
          <span class="like-bar-icon">👍🏻</span>
          <div class="like-bar-bg">
            <div class="like-bar-fill" style="width: ${Number(
              it.ratio ?? 0
            )}%"></div>
          </div>
          <span class="like-count">${it.likeCount ?? 0}</span>
        </div>`
      )
      .join('');
  }

  // ── 내가 작성한 민원 목록 ──────────────────────────────────────────────
  async function fetchMyFeeds() {
    try {
      const res = await fetch(api(PATHS.myFeeds), {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok || !isJson(res)) throw new Error('내 피드 목록 조회 실패');
      const feeds = await res.json();
      renderFeeds(feeds);
    } catch (err) {
      console.error(err);
      const container = document.querySelector('.request-list');
      if (container)
        container.innerHTML = `<p>피드를 불러오는 중 오류가 발생했습니다.</p>`;
    }
  }

  function renderFeeds(feeds) {
    const container = document.querySelector('.request-list');
    if (!container) return;

    if (!feeds?.length) {
      container.innerHTML = `<p>작성한 민원이 없습니다.</p>`;
      return;
    }

    container.innerHTML = feeds
      .map((feed) => {
        const statusClass = 'status-not';
        const statusText = '미해결';
        const img = feed.imageUrl
          ? `<img src="${feed.imageUrl}" alt="${feed.title}" style="max-width:100%;height:auto;margin-top:8px;"/>`
          : '';
        return `
          <div class="request-card" data-feed-id="${feed.feedId}">
            <div class="request-title-row">
              <div class="request-title">${feed.title}</div>
              <span class="tag-status ${statusClass}">${statusText}</span>
            </div>
            <div class="request-desc">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" aria-hidden="true">
                <path d="M12.24 3.09c1.1 1.1 1.73 2.59 1.76 4.14.02 1.56-.56 3.06-1.62 4.2l-.14.14-2.82 2.83c-.36.35-.85.56-1.36.57-.51.02-1-.17-1.37-.5l-.1-.1-2.83-2.83C2.63 10.45 2 8.92 2 7.33c0-1.59.63-3.12 1.76-4.24A6.05 6.05 0 0 1 8 1.33a6.05 6.05 0 0 1 4.24 1.76zM8 5.33c-.26 0-.52.05-.77.16-.24.1-.46.27-.63.44-.18.18-.33.38-.43.62-.11.23-.17.48-.17.73s.06.5.17.73c.1.24.25.44.43.62.17.17.39.34.63.44.25.11.5.16.77.16.53 0 1.04-.21 1.41-.58.36-.37.58-.88.58-1.41 0-.53-.22-1.03-.58-1.41A1.95 1.95 0 0 0 8 5.33z" fill="#9CA3AF"/>
              </svg>
              ${feed.location ?? ''}
            </div>
            ${img}
            <div>좋아요: ${feed.likeCount ?? 0} | 댓글: ${
          feed.commentCount ?? 0
        }</div>
          </div>`;
      })
      .join('');
  }

  // ── 로그아웃 ───────────────────────────────────────────────────────────
  async function doLogout() {
    if (_isLoggingOut) return;
    _isLoggingOut = true;

    try {
      let ok = false,
        lastStatus = 0,
        used = null;

      // 1) 정상 fetch POST 시도(쿠키 포함)
      for (const p of LOGOUT_CANDIDATES) {
        const url = api(p);
        console.log('[try logout]', url);
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
        });
        lastStatus = res.status;
        if (res.ok || res.status === 204) {
          ok = true;
          used = p;
          break;
        }
        // 404면 다음 후보 계속
      }

      // 2) fetch로 쿠키가 안 지워졌을 수 있으니(크로스도메인 Set-Cookie 미반영 등)
      //    폼 POST를 hidden iframe으로 한 번 더 날려 확실하게 처리 (CORS 미적용)
      const iframe = document.createElement('iframe');
      iframe.name = 'logout_iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.action = api(used || LOGOUT_CANDIDATES[0]); // 가장 유력한 경로로
      form.method = 'POST';
      form.target = 'logout_iframe';
      document.body.appendChild(form);
      form.submit();

      // 3) 쿠키 반영 시간 잠깐 주고 /me로 성공 여부 확인
      await new Promise((r) => setTimeout(r, 200));
      const me = await fetch(api(PATHS.me), {
        credentials: 'include',
        cache: 'no-store',
      });

      // 4) 성공 처리
      try {
        sessionStorage.setItem('justLoggedOut', '1');
      } catch {}
      try {
        sessionStorage.clear();
        localStorage.removeItem('userInfo');
      } catch {}

      // 5) 인덱스로 (GET으로 API로 이동 절대 금지! 405 원인)
      location.replace('index.html');
    } catch (e) {
      console.error(e);
      alert('로그아웃 중 오류가 발생했습니다.');
      _isLoggingOut = false;
    }
  }
  // ──  초기 로드 ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.profile-row')?.addEventListener('click', () => {
      location.href = 'profile-edit.html';
    });
    document
      .getElementById('logout-button')
      ?.addEventListener('click', doLogout);

    fetchMyPage(); // 닉네임
    fetchMyFeeds(); // 내 민원
  });
})();
