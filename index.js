// Kakao SDK 초기화 (JavaScript 키 입력)
Kakao.init('c490734030558c58c8b2078c0ba892ee');
console.log('Kakao SDK Initialized:', Kakao.isInitialized());

// 로그인 버튼 이벤트
document.getElementById('kakao-login-btn').addEventListener('click', () => {
  Kakao.Auth.login({
    success: function (authObj) {
      console.log('토큰:', authObj.access_token);

      // 사용자 정보 요청
      Kakao.API.request({
        url: '/v2/user/me',
        success: function (res) {
          alert(res.kakao_account.profile.nickname + '님 환영합니다!');
          console.log(res);
        },
        fail: function (error) {
          console.error(error);
        },
      });
    },
    fail: function (err) {
      console.error(err);
    },
  });
});
