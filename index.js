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
      });
      if (res.ok && isJson(res)) {
        // 로그인 상태면 지도 화면으로
        location.replace('map.html');
      }
      // 401/403/HTML이면 현재 페이지 유지
    } catch (e) {
      console.warn('[checkLogin] network ignored:', e);
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
    if (sessionStorage.getItem('justLoggedOut') === '1') {
      sessionStorage.removeItem('justLoggedOut');
      return;
    }
    bindUI();
    checkLogin(); // 첫 진입 시 로그인 여부 체크
    console.log('[AUTH_URL]', AUTH_URL);
    console.log('[REDIRECT_URI]', REDIRECT_URI);
  });
})();
