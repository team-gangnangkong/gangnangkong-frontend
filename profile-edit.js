// profile-edit.js
(() => {
  const API_BASE = 'https://sorimap.it.com';
  const ENDPOINTS = {
    me: '/api/user/me',
    changeNickname: '/api/users/me/nickname',
    changeProfileImage: '/api/users/me/profile-image',
  };
  const FALLBACK_IMG = './image/profile_default.png';

  // ---- DOM ----
  const els = {
    profileImg: document.querySelector('.profile-img'),
    profileImgWrap: document.querySelector('.profile-img-wrap'),
    sheet: document.getElementById('sheet'),
    albumBtn: document.getElementById('album-btn'),
    closeBtn: document.getElementById('close-btn'),
    albumInput: document.getElementById('album-input'),

    nicknameInput: document.getElementById('nickname-input'),
    clearBtn: document.getElementById('clear-btn'),
    errorMsg: document.getElementById('nickname-error'),
    submitBtn: document.getElementById('submit-btn'),
  };

  // ---- helpers ----
  const isKakaoDefaultUrl = (u) =>
    typeof u === 'string' &&
    /kakaocdn\.net\/.*default_profile|kakaocdn\.net\/account_images\/default_/i.test(
      u
    );

  function setProfileImage(url, isFallback = false) {
    if (!els.profileImg) return;
    els.profileImg.src = url || FALLBACK_IMG;
    els.profileImg.classList.toggle('is-fallback', isFallback || !url);
    // 네트워크/권한 등으로 이미지 못 불러오면 기본 이미지로
    els.profileImg.onerror = () => {
      els.profileImg.onerror = null;
      els.profileImg.src = FALLBACK_IMG;
      els.profileImg.classList.add('is-fallback');
    };
  }

  // ---- 현재 프로필 불러오기 ----
  async function loadMyProfile() {
    try {
      const res = await fetch(API_BASE + ENDPOINTS.me, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('unauthorized');

      const me = await res.json();

      const imgUrl =
        me?.profileImageUrl ||
        me?.profile_image_url ||
        me?.profile_image ||
        me?.profile?.profile_image_url ||
        me?.picture ||
        '';

      const isDefaultFlag =
        me?.isDefaultImage ??
        me?.is_default_image ??
        me?.profile?.is_default_image ??
        null;

      if (!imgUrl || isDefaultFlag === true || isKakaoDefaultUrl(imgUrl)) {
        setProfileImage(FALLBACK_IMG, true);
      } else {
        setProfileImage(imgUrl, false);
      }

      // 닉네임 초기값
      const initialName = me?.nickname || me?.name || me?.username || '';
      if (els.nicknameInput && initialName) {
        els.nicknameInput.value = initialName;
        updateNicknameState();
      }
    } catch {
      setProfileImage(FALLBACK_IMG, true);
    }
  }

  // ---- 닉네임 검증 & 상태 ----
  function validateNickname(v) {
    return (
      typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 10
    );
  }
  function updateNicknameState() {
    const v = els.nicknameInput?.value?.trim() || '';
    if (!validateNickname(v)) {
      els.errorMsg.textContent = '닉네임은 2-10자로 입력해 주세요.';
      els.submitBtn.classList.remove('active');
      els.submitBtn.disabled = true;
    } else {
      els.errorMsg.textContent = '';
      els.submitBtn.classList.add('active');
      els.submitBtn.disabled = false;
    }
  }

  // ---- 닉네임 변경 요청 (문서 스펙 반영) ----
  async function changeNickname(newNickname) {
    const res = await fetch(API_BASE + ENDPOINTS.changeNickname, {
      method: 'PATCH',
      credentials: 'include', // 쿠키 전송
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain;q=0.9,*/*;q=0.8',
      },
      body: JSON.stringify({ nickname: newNickname }),
    });

    if (!res.ok) {
      // 서버가 text로 에러를 줄 수도 있으니 안전하게 처리
      let msg = '닉네임 변경 실패';
      try {
        const ct = res.headers.get('content-type') || '';
        msg = ct.includes('application/json')
          ? (await res.json()).message || msg
          : (await res.text()) || msg;
      } catch {}
      throw new Error(msg);
    }

    // 성공 메시지도 JSON 또는 텍스트일 수 있음
    let message = '닉네임이 정상적으로 변경되었습니다.';
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if (typeof data?.message === 'string') message = data.message;
      } else {
        const txt = await res.text();
        if (txt) message = txt;
      }
    } catch {}

    return message;
  }

  // ---- 제출 버튼 클릭 ----
  els.submitBtn.addEventListener('click', async () => {
    if (els.submitBtn.disabled) return;
    const newNickname = (els.nicknameInput.value || '').trim();
    if (!validateNickname(newNickname)) return;

    // UX: 진행중 비활성화
    els.submitBtn.disabled = true;
    const prevLabel = els.submitBtn.textContent;
    els.submitBtn.textContent = '저장 중...';

    try {
      const msg = await changeNickname(newNickname);
      alert(msg);
    } catch (e) {
      els.errorMsg.textContent =
        e.message || '닉네임 변경 중 오류가 발생했습니다.';
    } finally {
      els.submitBtn.textContent = prevLabel;
      els.submitBtn.disabled = false;
    }
  });

  // 입력 변화시 상태 업데이트
  els.nicknameInput.addEventListener('input', updateNicknameState);
  els.clearBtn.addEventListener('click', () => {
    els.nicknameInput.value = '';
    els.nicknameInput.focus();
    updateNicknameState();
  });

  // ---- 프로필 이미지 업로드 ----
  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    // 문서상의 키 이름과 동일하게!
    fd.append('profileImage', file);

    try {
      const res = await fetch(API_BASE + ENDPOINTS.changeProfileImage, {
        method: 'PATCH',
        credentials: 'include',
        body: fd, // Content-Type 직접 설정하지 않기
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '프로필 이미지 변경 실패');
      }
      const data = await res.json(); // { message, imageUrl }
      // 캐시 무시를 위해 쿼리 붙여서 즉시 반영
      setProfileImage(`${data.imageUrl}?t=${Date.now()}`, false);
      closeSheet();
      els.albumInput.value = '';
      alert(data.message || '프로필 이미지가 정상적으로 변경되었습니다.');
    } catch (err) {
      console.error(err);
      alert(err.message || '프로필 이미지 변경 중 오류가 발생했습니다.');
    }
  }

  // ---- bottom sheet ----
  function openSheet() {
    els.sheet.style.display = 'flex';
  }
  function closeSheet() {
    els.sheet.style.display = 'none';
    els.albumBtn.classList.remove('selected');
  }

  // ---- init ----
  document.addEventListener('DOMContentLoaded', () => {
    // 프로필/닉네임 현재값 불러오기
    loadMyProfile();

    // 닉네임 입력/지우기/제출
    els.nicknameInput.addEventListener('input', updateNicknameState);
    els.clearBtn.addEventListener('click', () => {
      els.nicknameInput.value = '';
      els.nicknameInput.focus();
      updateNicknameState();
    });
    els.submitBtn.addEventListener('click', async () => {
      if (els.submitBtn.disabled) return;
      try {
        await changeNickname(els.nicknameInput.value.trim());
        alert('닉네임이 정상적으로 변경되었습니다!');
      } catch (e) {
        els.errorMsg.textContent =
          e.message || '닉네임 변경 중 오류가 발생했습니다.';
      }
    });

    // 이미지 바텀시트
    els.profileImgWrap.addEventListener('click', openSheet);
    els.closeBtn.addEventListener('click', closeSheet);

    // 앨범 버튼 효과 + 파일 선택
    const press = () => els.albumBtn.classList.add('selected');
    const release = () =>
      setTimeout(() => els.albumBtn.classList.remove('selected'), 180);
    els.albumBtn.addEventListener('mousedown', press);
    els.albumBtn.addEventListener('mouseup', release);
    els.albumBtn.addEventListener('touchstart', press);
    els.albumBtn.addEventListener('touchend', release);
    els.albumBtn.addEventListener('click', () => els.albumInput.click());
    els.albumInput.addEventListener('change', onFileChosen);
  });
})();
