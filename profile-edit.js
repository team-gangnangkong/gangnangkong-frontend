(() => {
  const API_BASE = 'https://sorimap.it.com';
  const EP = {
    me: '/api/user/me',
    nickname: '/api/users/me/nickname',
    profileImage: '/api/users/me/profile-image',
  };
  const FALLBACK = './image/profile_default.png';

  const state = { els: {} };
  const q = (s) => document.querySelector(s);

  // kakao 기본 이미지 판별
  const isKakaoDefaultUrl = (u = '') =>
    /kakaocdn\.net\/.*default_profile|kakaocdn\.net\/account_images\/default_/i.test(
      u
    );

  // DOM 요소 캐싱
  function cacheEls() {
    state.els = {
      profileImg: q('.profile-img'),
      profileImgWrap: q('.profile-img-wrap'),
      sheet: q('#sheet'),
      albumBtn: q('#album-btn'),
      closeBtn: q('#close-btn'),
      albumInput: q('#album-input'),
      nicknameInput: q('#nickname-input'),
      clearBtn: q('#clear-btn'),
      errorMsg: q('#nickname-error'),
      submitBtn: q('#submit-btn'),
    };
  }

  // 프로필 이미지 세팅
  function setProfileImage(url, isFallback = false) {
    const img = state.els.profileImg;
    if (!img) return;
    img.classList.toggle('is-fallback', isFallback || !url);
    img.onerror = () => {
      img.onerror = null;
      img.src = FALLBACK;
      img.classList.add('is-fallback');
    };
    img.src = url || FALLBACK;
  }

  // 내 정보 불러오기 -> 이미지/닉네임 초기화
  async function loadMyProfile() {
    try {
      const res = await fetch(API_BASE + EP.me, {
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

      const isDefault =
        me?.isDefaultImage ??
        me?.is_default_image ??
        me?.profile?.is_default_image ??
        null;

      if (!imgUrl || isDefault === true || isKakaoDefaultUrl(imgUrl)) {
        setProfileImage(FALLBACK, true);
      } else {
        // 캐시 버스트로 즉시 반영
        setProfileImage(`${imgUrl}?t=${Date.now()}`, false);
      }

      const initialName = me?.nickname || me?.name || me?.username || '';
      if (state.els.nicknameInput && initialName) {
        state.els.nicknameInput.value = initialName;
        updateNicknameState();
      }
    } catch {
      setProfileImage(FALLBACK, true);
    }
  }

  // 닉네임 검증/상태
  const validateNickname = (v) =>
    typeof v === 'string' && (v = v.trim()).length >= 2 && v.length <= 10;

  function updateNicknameState() {
    const { nicknameInput, errorMsg, submitBtn } = state.els;
    const v = nicknameInput?.value?.trim() || '';
    if (!validateNickname(v)) {
      errorMsg.textContent = '닉네임은 2-10자로 입력해 주세요.';
      submitBtn.classList.remove('active');
      submitBtn.disabled = true;
    } else {
      errorMsg.textContent = '';
      submitBtn.classList.add('active');
      submitBtn.disabled = false;
    }
  }

  // 닉네임 변경 요청
  async function changeNickname(newNickname) {
    const res = await fetch(`${API_BASE}${EP.nickname}`, {
      method: 'PATCH',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ nickname: newNickname }),
      cache: 'no-store',
    });
    if (!res.ok) {
      let msg = '닉네임 변경 실패';
      try {
        const ct = res.headers.get('content-type') || '';
        msg = ct.includes('application/json')
          ? (await res.json()).message || msg
          : (await res.text()) || msg;
      } catch {}
      throw new Error(msg);
    }
    return '닉네임이 정상적으로 변경되었습니다.';
  }

  // 파일 선택 -> 프로필 이미지 업로드
  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('profileImage', file); // 문서 스펙 키 이름

    try {
      const res = await fetch(API_BASE + EP.profileImage, {
        method: 'PATCH',
        credentials: 'include',
        body: fd, // Content-Type 직접 설정 금지
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '프로필 이미지 변경 실패');
      }
      const data = await res.json(); // { message, imageUrl }
      setProfileImage(`${data.imageUrl}?t=${Date.now()}`, false);
      closeSheet();
      state.els.albumInput.value = '';
      alert(data.message || '프로필 이미지가 정상적으로 변경되었습니다.');
    } catch (err) {
      console.error(err);
      alert(err.message || '프로필 이미지 변경 중 오류가 발생했습니다.');
    }
  }

  // 바텀시트
  const openSheet = () => (state.els.sheet.style.display = 'flex');
  const closeSheet = () => {
    state.els.sheet.style.display = 'none';
    state.els.albumBtn.classList.remove('selected');
  };

  // 이벤트 바인딩(단 한 번)
  function bindEvents() {
    const {
      nicknameInput,
      clearBtn,
      submitBtn,
      profileImgWrap,
      closeBtn,
      albumBtn,
      albumInput,
    } = state.els;

    nicknameInput.addEventListener('input', updateNicknameState);
    clearBtn.addEventListener('click', () => {
      nicknameInput.value = '';
      nicknameInput.focus();
      updateNicknameState();
    });

    submitBtn.addEventListener('click', async () => {
      if (submitBtn.disabled) return;
      const v = nicknameInput.value.trim();
      if (!validateNickname(v)) return;
      const prev = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '저장 중...';
      try {
        await changeNickname(v);
        alert('닉네임이 정상적으로 변경되었습니다!');
      } catch (e) {
        state.els.errorMsg.textContent =
          e.message || '닉네임 변경 중 오류가 발생했습니다.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = prev;
      }
    });

    profileImgWrap.addEventListener('click', openSheet);
    closeBtn.addEventListener('click', closeSheet);

    const press = () => albumBtn.classList.add('selected');
    const release = () =>
      setTimeout(() => albumBtn.classList.remove('selected'), 180);
    albumBtn.addEventListener('mousedown', press);
    albumBtn.addEventListener('mouseup', release);
    albumBtn.addEventListener('touchstart', press);
    albumBtn.addEventListener('touchend', release);
    albumBtn.addEventListener('click', () => albumInput.click());
    albumInput.addEventListener('change', onFileChosen);
  }

  // 초기화
  function init() {
    cacheEls();
    bindEvents();
    loadMyProfile();
    updateNicknameState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
