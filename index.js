document.addEventListener('DOMContentLoaded', () => {
  const kakaoLoginBtn = document.getElementById('kakao-login-btn');
  const adminLoginBtn = document.querySelector('.admin-login');

  const API_BASE = 'http://localhost:8080'; // 배포 시 변경

  // 카카오 로그인 버튼 클릭 시
  kakaoLoginBtn.addEventListener('click', () => {
    window.location.href = `${API_BASE}/auth/kakao/login`;
  });

  // 관리자 로그인 버튼 클릭 시
  adminLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'manage.html';
  });
});
