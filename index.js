/** 인증 공통 설정 */
const AUTH = {
  // 나중에 백엔드 주소로 변경
  baseUrl: '#', // 백엔드 베이스 URL
  loginPath: '/oauth2/authorization/kakao', // 백엔드 OAuth 시작 경로
  mePath: '/api/auth/me', // 로그인 여부 확인 API
  logoutPath: '/api/auth/logout', // 로그아웃 API (옵션)
  afterLogin: '/map.html', // 로그인 성공 후 이동
  afterSignup: '/signup.html', // 신규 회원 이동(옵션)
  callbackUrl: location.origin + '/auth-callback.html', // 콜백 페이지
  MOCK: true, // 백엔드 없으면 true
};

/** fetch JSON 래퍼 */
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include', // 쿠키 포함
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.status === 204 ? null : res.json();
}

/** 로그인 상태 확인 */
async function checkLogin() {
  if (AUTH.MOCK) {
    const user = JSON.parse(localStorage.getItem('mockUser') || 'null');
    return user ? { ok: true, user } : { ok: false };
  }
  try {
    const me = await fetchJSON(AUTH.baseUrl + AUTH.mePath);
    return { ok: !!me?.id, user: me };
  } catch {
    return { ok: false };
  }
}

/** 로그인 시작 */
function startLogin() {
  if (AUTH.MOCK) {
    // MOCK 모드 → 바로 로그인된 것처럼 저장
    const mock = { id: 1, name: '테스트유저', provider: 'kakao' };
    localStorage.setItem('mockUser', JSON.stringify(mock));
    location.replace(AUTH.afterLogin);
    return;
  }
  const params = new URLSearchParams({
    next: AUTH.callbackUrl, // 백엔드에서 사용할 리다이렉트 URL
  });
  location.href = `${AUTH.baseUrl}${AUTH.loginPath}?${params}`;
}

/** 콜백 처리 */
async function handleAuthCallback() {
  const qs = new URLSearchParams(location.search);

  if (AUTH.MOCK) {
    const mock = { id: 1, name: '테스트유저', provider: 'kakao' };
    localStorage.setItem('mockUser', JSON.stringify(mock));
    location.replace(AUTH.afterLogin);
    return;
  }

  if (qs.get('error')) {
    alert(decodeURIComponent(qs.get('message') || '로그인 실패'));
    location.replace('/');
    return;
  }

  if (qs.get('signup') === 'true') {
    location.replace(AUTH.afterSignup);
    return;
  }

  const me = await checkLogin();
  if (me.ok) {
    location.replace(AUTH.afterLogin);
  } else {
    alert('세션 확인 실패. 다시 로그인해주세요.');
    location.replace('/');
  }
}

/** 로그아웃 */
async function logout() {
  if (AUTH.MOCK) {
    localStorage.removeItem('mockUser');
    location.replace('/');
    return;
  }
  try {
    await fetchJSON(AUTH.baseUrl + AUTH.logoutPath, { method: 'POST' });
  } finally {
    location.replace('/');
  }
}

/** 초기 실행 */
document.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('kakao-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', startLogin);
  }

  const me = await checkLogin();
  if (me.ok) {
    // 이미 로그인 상태면 홈으로 이동
    location.replace(AUTH.afterLogin);
  }
});
