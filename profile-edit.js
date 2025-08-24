(() => {
  const API_BASE = 'https://sorimap.it.com';
  const EP = {
    me: '/api/user/me',
    nickname: '/api/users/me/nickname',
    profileImage: '/api/users/me/profile-image',
  };
  const FALLBACK = './image/profile_default.png';

  const toHttps = (u) => {
    if (typeof u !== 'string') return u;
    if (u.startsWith('//')) return 'https:' + u;
    return u.replace(/^http:\/\//, 'https://');
  };

  // ── 업로드 압축 설정 ──────────────────────────────────────────
  const IMG_MAX_DIM = 512;
  const IMG_MAX_SIZE = 800 * 1024;

  async function getBitmap(file) {
    if (window.createImageBitmap) return await createImageBitmap(file);
    // fallback (Safari 등)
    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    await new Promise((ok, bad) => {
      img.onload = ok;
      img.onerror = bad;
      img.src = URL.createObjectURL(file);
    });
    return img;
  }

  async function compressImage(
    file,
    { maxDim = IMG_MAX_DIM, maxSize = IMG_MAX_SIZE } = {}
  ) {
    // PNG → JPEG로 변환하면 용량이 크게 줄어듦
    const bmp = await getBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, w, h);

    let q = 0.9,
      blob;
    do {
      blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', q));
      q -= 0.1;
    } while (blob && blob.size > maxSize && q >= 0.5);

    const out = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
    return out;
  }

  async function uploadProfileImageWithFallback(theFile) {
    // 1차: profileImage
    let fd = new FormData();
    fd.append('profileImage', theFile);

    let res = await fetch(API_BASE + EP.profileImage, {
      method: 'PATCH',
      credentials: 'include',
      body: fd,
    });

    // 필드명 문제로 400/415 나올 수 있어 재시도
    if (!res.ok && (res.status === 400 || res.status === 415)) {
      fd = new FormData();
      fd.append('file', theFile);
      res = await fetch(API_BASE + EP.profileImage, {
        method: 'PATCH',
        credentials: 'include',
        body: fd,
      });
    }
    return res;
  }

  const state = { els: {} };
  const q = (s) => document.querySelector(s);

  const isKakaoDefaultUrl = (u = '') =>
    /kakaocdn\.net\/.*default_profile|kakaocdn\.net\/account_images\/default_/i.test(
      u
    );

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

  function setProfileImage(url, isFallback = false) {
    const img = state.els.profileImg;
    if (!img) return;
    const safe = toHttps(url);
    img.classList.toggle('is-fallback', isFallback || !safe);
    img.onerror = () => {
      img.onerror = null;
      img.src = FALLBACK;
      img.classList.add('is-fallback');
    };
    img.src = safe || FALLBACK; // ✅ 여기서도 https로 강제
  }

  async function loadMyProfile() {
    try {
      const res = await fetch(API_BASE + EP.me, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('unauthorized');
      const me = await res.json();

      const raw =
        me?.profileImageUrl ||
        me?.profile_image_url ||
        me?.profile_image ||
        me?.profile?.profile_image_url ||
        me?.picture ||
        '';

      const imgUrl = toHttps(raw); // ✅ 받아오자마자 https로
      const isDefault =
        me?.isDefaultImage ??
        me?.is_default_image ??
        me?.profile?.is_default_image ??
        null;

      if (!imgUrl || isDefault === true || isKakaoDefaultUrl(imgUrl)) {
        setProfileImage(FALLBACK, true);
      } else {
        const bust = (imgUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        setProfileImage(imgUrl + bust, false); // ✅ 캐시 버스트도 보존
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

  async function changeNickname(newNickname) {
    const res = await fetch(`${API_BASE}${EP.nickname}`, {
      method: 'PATCH',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain;q=0.9,*/*;q=0.8',
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

  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 5 * 1024 * 1024) {
        console.log('원본이 큰 파일이야. 압축해서 올릴게!');
      }
      const resized = await compressImage(file);
      const previewUrl = URL.createObjectURL(resized);
      if (state.els.profileImg) state.els.profileImg.src = previewUrl;

      const res = await uploadProfileImageWithFallback(resized);

      if (res.status === 413) {
        throw new Error(
          '파일이 커서 업로드가 거절됐어. 더 작은 이미지로 시도해줘!'
        );
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '프로필 이미지 변경 실패');
      }

      // 3) 성공 처리
      const data = await res.json(); // { message, imageUrl }
      const safe = toHttps(data.imageUrl);
      const bust = (safe.includes('?') ? '&' : '?') + 't=' + Date.now();
      setProfileImage(safe + bust, false);

      closeSheet();
      state.els.albumInput.value = '';
      alert(data.message || '프로필 이미지가 정상적으로 변경되었습니다.');
    } catch (err) {
      console.error(err);
      alert(err.message || '프로필 이미지 변경 중 오류가 발생했습니다.');
    }
  }

  const openSheet = () => (state.els.sheet.style.display = 'flex');
  const closeSheet = () => {
    state.els.sheet.style.display = 'none';
    state.els.albumBtn.classList.remove('selected');
  };

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

    nicknameInput?.addEventListener('input', updateNicknameState);
    clearBtn?.addEventListener('click', () => {
      nicknameInput.value = '';
      nicknameInput.focus();
      updateNicknameState();
    });

    submitBtn?.addEventListener('click', async () => {
      if (submitBtn.disabled) return;
      const v = nicknameInput.value.trim();
      if (!validateNickname(v)) return;

      const prev = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '저장 중...';

      try {
        await changeNickname(v);

        sessionStorage.setItem('nicknameJustUpdated', v);

        alert('닉네임이 정상적으로 변경되었습니다!');

        location.assign('mypage.html');
      } catch (e) {
        state.els.errorMsg.textContent =
          e.message || '닉네임 변경 중 오류가 발생했습니다.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = prev;
      }
    });

    profileImgWrap?.addEventListener('click', openSheet);
    closeBtn?.addEventListener('click', closeSheet);

    const press = () => albumBtn.classList.add('selected');
    const release = () =>
      setTimeout(() => albumBtn.classList.remove('selected'), 180);
    albumBtn?.addEventListener('mousedown', press);
    albumBtn?.addEventListener('mouseup', release);
    albumBtn?.addEventListener('touchstart', press);
    albumBtn?.addEventListener('touchend', release);
    albumBtn?.addEventListener('click', () => albumInput.click());
    albumInput?.addEventListener('change', onFileChosen);
  }

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
