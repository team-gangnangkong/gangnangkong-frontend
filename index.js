const API_BASE = 'http://localhost:8080'; // 배포 백엔드
const LOGIN_PATH = '/oauth2/authorization/kakao';
const ME_PATH = '/api/user/me';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('kakao-login-btn').addEventListener('click', () => {
    location.href = `${API_BASE}${LOGIN_PATH}`;
  });
  document.querySelector('.admin-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    location.href = 'manage.html';
  });
  checkLogin();
});

async function checkLogin() {
  try {
    const res = await fetch(`${API_BASE}${ME_PATH}`, {
      credentials: 'include',
    });
    if (res.ok) location.replace('map.html'); // 로그인 상태면 바로 이동
  } catch (_) {
    /* 네트워크 실패는 무시하고 현재 페이지 유지 */
  }
}
