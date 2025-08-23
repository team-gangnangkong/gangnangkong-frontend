(() => {
  const API_BASE = 'https://sorimap.it.com'; // 배포 백엔드
  const CLIENT_ID = '21a378dd1e0ed38b3f458c67dd55f414'; // 카카오 앶 키
  const CALLBACK_PATH = '/kakao/callback';
  const REDIRECT_URI = `${API_BASE}${CALLBACK_PATH}`; //https://sorimap.it.com/kakao/callback
  const SCOPE = 'profile_nickname,profile_image';

  // 카카오 권한요청 URL
  const AUTH_URL =
    `https://kauth.kakao.com/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPE)}`;

  // 로그인 여부 확인 API
  const ME_PATH = '/api/user/me';
  const isJson = (res) =>
    res.headers.get('content-type')?.includes('application/json');

  async function checkLogin() {
    try {
      const res = await fetch(`${API_BASE}${ME_PATH}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store', // 캐시 방지
      });
      if (res.status !== 200) return; // 200 아닐 땐 로그인 아님
      if (!isJson(res)) return; // JSON 아니면 로그인 아님

      const me = await res.json();
      const hasUser =
        me && (me.id || me.userId || me.uid || me.username || me.name);
      if (hasUser) {
        location.replace('map.html');
      }
    } catch (e) {
      console.warn('[checkLogin] ignored:', e);
    }
  }

  function bindUI() {
    const loginBtn = document.querySelector('#kakao-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        location.href = AUTH_URL; // 카카오 로그인 시작
      });
    }
    const admin = document.querySelector('.admin-login');
    if (admin) {
      admin.addEventListener('click', (e) => {
        e.preventDefault();
        location.href = 'manage.html';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindUI();
    const q = new URLSearchParams(location.search);
    const skipAuto = q.has('loggedout'); // mypage에서 붙여준 쿼리
    if (!skipAuto) checkLogin();
    console.log('[AUTH_URL]', AUTH_URL);
    console.log('[REDIRECT_URI]', REDIRECT_URI);
  });
})();
