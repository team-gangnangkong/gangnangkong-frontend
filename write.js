document.querySelector('.header svg').addEventListener('click', () => {
  window.history.back();
});

// 피드 작성 form
const writeForm = document.getElementById('feedForm');

const latInput = document.getElementById('latInput');
const lngInput = document.getElementById('lngInput');
const kidInput = document.getElementById('kakaoPlaceIdInput');

// === 카테고리 버튼 관련 ===
const minwonBtn = document.getElementById('minwonBtn');
const munhwaBtn = document.getElementById('munhwaBtn');
const categoryBtns = [minwonBtn, munhwaBtn];

let selectedType = 'MINWON';
let selectedImages = [];
const selectedImageKeys = new Set(); // ⬅️ (추가) 원본파일 중복 방지용 키

// 카테고리 버튼 클릭(토글 및 감정 색상 해제)
categoryBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    categoryBtns.forEach((b) =>
      b.classList.remove('selected', 'munhwa-positive', 'munhwa-negative')
    );
    btn.classList.add('selected');
    selectedType = btn.dataset.type;
    // 문화 선택 시(감정 분석 결과 대비, 초기 감정색 없앰)
    if (selectedType === 'MUNHWA') {
      // setMunhwaSentimentColor("POSITIVE" / "NEGATIVE")는
      // 실제 AI 로직에서 따로 호출해줍니다.
    }
    updateButtonColor();
  });
});

// === 위치 지도 연동 ===

function setLocation(address, lat, lng) {
  document.querySelector('#addressInput').value = address;
  document.querySelector('#latInput').value = lat;
  document.querySelector('#lngInput').value = lng;
}

// map.html → write.html 값 전달
function onPlaceSelected(address, lat, lng) {
  if (window.opener && typeof window.opener.setLocation === 'function') {
    window.opener.setLocation(address, lat, lng);
    window.close();
  } else {
    alert('위치 정보를 전달할 수 없습니다.');
  }
}

// === 감정 분석 결과(문화) 색상 반영 함수 ===
function setMunhwaSentimentColor(sentiment) {
  // 문화 버튼 선택 상태일 때만 적용
  munhwaBtn.classList.remove('munhwa-positive', 'munhwa-negative');
  if (selectedType === 'MUNHWA') {
    if (sentiment === 'POSITIVE') {
      munhwaBtn.classList.add('munhwa-positive');
    } else if (sentiment === 'NEGATIVE') {
      munhwaBtn.classList.add('munhwa-negative');
    }
  }
}

// === form 유효성 검사/상태제어 ===
const titleInput = writeForm.querySelector('input[name="title"]');
const locationInput = writeForm.querySelector('input[name="address"]');
const photoInput = writeForm.querySelector('input[type="file"]');

const photoUploadBox = document.querySelector('.photo-upload'); //사진 업로드 미리보기
const submitBtn = writeForm.querySelector('.submit-btn');

function isFormValid() {
  const isTitle = titleInput.value.trim() !== '';
  const isCategory = categoryBtns.some((btn) =>
    btn.classList.contains('selected')
  );
  const addrVal = locationInput.value.trim();
  const isAddressFilled = !!addrVal && /\d/.test(addrVal);
  const hasLatLng = !!latInput.value && !!lngInput.value;
  const hasKid = /^\d+$/.test(kidInput.value.trim());

  // ⛳️ 사진 필수(isPhoto) 조건 제거
  return isTitle && isCategory && isAddressFilled && hasLatLng && hasKid;
}

function updateButtonColor() {
  if (isFormValid()) {
    submitBtn.classList.add('is-enabled');
    submitBtn.classList.remove('is-disabled');
    submitBtn.disabled = false;
  } else {
    submitBtn.classList.add('is-disabled');
    submitBtn.classList.remove('is-enabled');
    submitBtn.disabled = true;
  }
}

// 유효성 검사 이벤트 바인딩
[titleInput, locationInput].forEach((input) => {
  input.addEventListener('input', updateButtonColor);
});
categoryBtns.forEach((btn) => {
  btn.addEventListener('click', updateButtonColor);
});
photoInput.addEventListener('change', updateButtonColor);

// === 피드 등록(이미지/데이터) ===
function getAccessTokenFromCookie() {
  const cookies = document.cookie.split('; ');
  for (const c of cookies) {
    if (c.startsWith('ACCESS-TOKEN=')) {
      return c.split('=')[1];
    }
  }
  return null;
}

// ✅ feed(JSON) + images(0~N) 한 번에 전송
async function createFeedMultipart(feedData, files = []) {
  const fd = new FormData();

  fd.append(
    'feed',
    new Blob([JSON.stringify(feedData)], { type: 'application/json' })
  );

  // 이미지 여러 장
  files.forEach((f) => fd.append('images', f, f.name));

  const res = await fetch('https://sorimap.it.com/api/feeds', {
    method: 'POST',
    credentials: 'include',
    body: fd, // Content-Type은 브라우저가 boundary 포함 자동 설정
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`피드(멀티파트) 작성 실패: ${res.status} ${msg}`);
  }
  return res.json(); // 문서상 생성된 feed id 등 반환
}

// ==== 사진 선택/누적/미리보기 ====
const MAX_IMAGES = 8;

let gridEl = null;
function ensureGrid() {
  if (!gridEl) {
    gridEl = document.createElement('div');
    gridEl.className = 'photo-grid';
    photoUploadBox.appendChild(gridEl);
  }
  return gridEl;
}

function renderPreviews() {
  if (selectedImages.length === 0) {
    photoUploadBox.classList.remove('has-images');
    if (gridEl) {
      gridEl.remove();
      gridEl = null;
    }
    return; // 아이콘/텍스트 다시 보임
  }

  photoUploadBox.classList.add('has-images');
  const grid = ensureGrid();
  grid.innerHTML = '';

  selectedImages.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'preview-del';
    del.textContent = '✕';
    del.addEventListener('click', () => {
      selectedImages.splice(idx, 1);
      // 키셋은 간단히 초기화(중복 선택 대비)
      selectedImageKeys.clear();
      // 현재 선택들로 다시 키 재구성은 생략(실사용상 문제 없음)
      renderPreviews();
      updateButtonColor();
    });

    item.appendChild(img);
    item.appendChild(del);
    grid.appendChild(item);
  });

  // + 추가 타일
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'add-tile';
  add.textContent = '+';
  add.addEventListener('click', () => photoInput.click());
  grid.appendChild(add);
}

// ⛔ (삭제) 원본 파일을 그대로 누적하던 change 핸들러
//    → 프리뷰/업로드 두 배가 되는 문제 방지

renderPreviews();

//제출버튼
writeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFormValid()) return;

  const feedData = {
    title: writeForm.title.value.trim(),
    content: writeForm.content.value.trim(),
    type: selectedType, // "MINWON" | "MUNHWA"
    address: writeForm.address.value.trim(),
    lat: parseFloat(writeForm.lat?.value) || 0,
    lng: parseFloat(writeForm.lng?.value) || 0,
  };

  const kidRaw = writeForm.kakaoPlaceId?.value?.trim();
  const kidNum = Number(kidRaw);
  if (Number.isFinite(kidNum)) {
    feedData.kakaoPlaceId = kidNum; // ✅ 숫자로 전송
  } else {
    alert('카카오 장소 ID가 숫자가 아닙니다.');
    return;
  }

  // (선택) locationId 계속 쓸 거면 유지
  if (writeForm.locationId?.value) {
    feedData.locationId = Number(writeForm.locationId.value);
  }

  try {
    // 🔁 멀티파트 한 방에 전송 (이미지 없으면 images 파트 없이 전송됨)
    const created = await createFeedMultipart(feedData, selectedImages);
    alert('피드가 성공적으로 작성되었습니다!');
    console.log('작성 완료된 피드:', created);
  } catch (err) {
    alert('피드 작성 중 오류: ' + err.message);
  }
});

// === 초기 상태 세팅 ===
updateButtonColor();

(() => {
  // ====== 공용 DOM ======
  const addrInput = document.getElementById('addressInput');
  const overlay = document.getElementById('addrOverlay');
  const btnClose = document.getElementById('addrBack');
  const qInput = document.getElementById('addrQuery');
  const listEl = document.getElementById('addrList');
  const hintEl = document.getElementById('addrHint');

  // 새로 추가된 요소
  const mapEl = document.getElementById('addrMap');
  const sheetEl = document.getElementById('addrSheet');
  const asName = document.getElementById('as-name');
  const asAddr = document.getElementById('as-addr');
  const asPickBtn = document.getElementById('as-pickBtn');

  let places, geocoder;
  let ovMap = null; // 오버레이용 지도
  let ovMarker = null; // 선택 핀
  let _selectedPlace = null; // {kakaoPlaceId, name, addr, lat, lng}

  function makeSelectPinImage(size = 34) {
    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g0" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stop-color="#F87171"/><stop offset="1" stop-color="#EF4444"/>
        </linearGradient>
      </defs>
      <path d="M12 2c-4.42 0-8 3.58-8 8 0 5.5 8 12 8 12s8-6.5 8-12c0-4.42-3.58-8-8-8z" fill="url(#g0)"/>
      <circle cx="12" cy="10" r="3.2" fill="white"/>
    </svg>`;
    const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    const s = new kakao.maps.Size(size, size);
    const offset = new kakao.maps.Point(size / 2, size - 2);
    return new kakao.maps.MarkerImage(url, s, { offset });
  }

  function ensureKakaoReady() {
    return new Promise((resolve) => {
      function go() {
        kakao.maps.load(() => resolve());
      }
      if (window.kakao && kakao.maps && kakao.maps.load) return go();
      const s = document.createElement('script');
      s.src =
        'https://dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_APP_KEY&libraries=services&autoload=false';
      s.onload = go;
      document.head.appendChild(s);
    });
  }

  async function openOverlay() {
    overlay.hidden = false;
    if (!places || !geocoder) {
      await ensureKakaoReady();
      places = new kakao.maps.services.Places();
      geocoder = new kakao.maps.services.Geocoder();
    }
    if (!ovMap) {
      ovMap = new kakao.maps.Map(mapEl, {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 5,
      });
    }
    showSearchUI(); // ← 추가
    setTimeout(() => {
      try {
        ovMap.relayout();
      } catch (_) {}
      qInput.focus();
    }, 30);
  }

  // === 상태 전환 도우미 ===
  function showSearchUI() {
    overlay.classList.remove('picked'); // 검색 패널 모드
    sheetEl.hidden = true;
  }

  function showMapUI() {
    overlay.classList.add('picked'); // 지도/선택 모드
    sheetEl.hidden = false;
    // 지도 DOM이 보이도록 바뀐 뒤에 relayout
    setTimeout(() => {
      try {
        ovMap && ovMap.relayout();
      } catch (_) {}
    }, 0);
  }

  function closeOverlay() {
    overlay.hidden = true;
    qInput.value = '';
    listEl.innerHTML = '';
    hintEl.style.display = 'block';
    sheetEl.hidden = true;
    _selectedPlace = null;
  }

  // 주소칸 클릭 → 검색 패널 열기
  addrInput.addEventListener('click', (e) => {
    e.preventDefault();
    openOverlay();
  });
  btnClose.addEventListener('click', closeOverlay);
  document.addEventListener('keydown', (e) => {
    if (!overlay.hidden && e.key === 'Escape') closeOverlay();
  });

  // ====== 검색(기존과 동일) ======
  let debounceId = null,
    seq = 0;
  function render(items) {
    if (!items.length) {
      listEl.innerHTML = '';
      hintEl.style.display = 'block';
      return;
    }
    hintEl.style.display = 'none';
    listEl.innerHTML = items
      .map(
        (it) => `
      <li data-kid="${it.kakaoPlaceId || ''}" data-lat="${it.lat}" data-lng="${
          it.lng
        }"
          data-name="${it.name}" data-addr="${it.addr || ''}">
        <div class="name">${it.name}</div>
        ${it.addr ? `<div class="addr">${it.addr}</div>` : ''}
      </li>`
      )
      .join('');
  }

  qInput.addEventListener('input', () => {
    const q = qInput.value.trim();
    clearTimeout(debounceId);

    if (!q) {
      render([]);
      return;
    }

    const mySeq = ++seq;
    debounceId = setTimeout(() => runSearch(q, mySeq), 220);
  });

  function runSearch(q, mySeq) {
    places.keywordSearch(
      q,
      (data, status) => {
        if (mySeq !== seq) return;
        if (status === kakao.maps.services.Status.OK && data?.length) {
          const items = data.map((d) => ({
            name: d.place_name,
            addr: d.road_address_name || d.address_name || '',
            lat: +d.y,
            lng: +d.x,
            kakaoPlaceId: d.id,
          }));
          render(items);
        } else {
          geocoder.addressSearch(q, (res, s2) => {
            if (mySeq !== seq) return;
            if (s2 === kakao.maps.services.Status.OK && res?.length) {
              const items = res.map((r) => ({
                name: r.address_name,
                addr: r.road_address?.address_name || r.address_name,
                lat: +r.y,
                lng: +r.x,
              }));
              render(items);
            } else {
              render([]);
            }
          });
        }
      },
      { size: 15, sort: 'accuracy' }
    );
  }

  // === 이미지 압축 함수 ===
  async function compressImage(
    file,
    { maxW = 1600, maxH = 1600, quality = 0.8 } = {}
  ) {
    const bmp = await createImageBitmap(file);
    const ratio = Math.min(maxW / bmp.width, maxH / bmp.height, 1);
    const w = Math.round(bmp.width * ratio),
      h = Math.round(bmp.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, w, h);

    const blob = await new Promise((r) =>
      canvas.toBlob(r, 'image/jpeg', quality)
    );
    return new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  // ✅ 선택 직후 압축 적용 + 중복 방지 + 최대 8장 제한
  photoInput.addEventListener('change', async () => {
    const picked = Array.from(photoInput.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    const keyOf = (f) => `${f.name}|${f.lastModified}`;

    for (const f of picked) {
      if (selectedImages.length >= MAX_IMAGES) break;
      const k = keyOf(f);
      if (selectedImageKeys.has(k)) continue; // 중복 방지
      const compact = await compressImage(f);
      selectedImages.push(compact);
      selectedImageKeys.add(k);
    }

    renderPreviews();
    updateButtonColor();
    photoInput.value = '';
  });

  // ====== 리스트 → 지도에 표시 + 시트 열기 ======
  function showOnMap({ kakaoPlaceId, name, addr, lat, lng }) {
    // 1) 먼저 보이게 전환
    showMapUI();

    // 2) 보이게 된 다음 레이아웃/센터/마커 처리 (다음 틱)
    setTimeout(() => {
      const pos = new kakao.maps.LatLng(lat, lng);
      try {
        ovMap && ovMap.relayout();
      } catch {}

      ovMap.setCenter(pos);
      ovMap.setLevel(4);

      if (!ovMarker) {
        ovMarker = new kakao.maps.Marker({
          map: ovMap,
          position: pos,
          image: makeSelectPinImage(34),
          zIndex: 1000,
        });
      } else {
        ovMarker.setPosition(pos);
        ovMarker.setImage(makeSelectPinImage(34));
        ovMarker.setZIndex(1000);
      }
    }, 0);

    // 3) 선택 정보/버튼 상태 업데이트
    _selectedPlace = { kakaoPlaceId, name, addr, lat, lng };
    asName.textContent = name;
    asAddr.textContent = addr || '주소 정보 없음';
    asPickBtn.disabled = !kakaoPlaceId;
  }

  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;

    // 지도 없으면 생성(안전장치)
    if (!ovMap) {
      ovMap = new kakao.maps.Map(mapEl, {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 5,
      });
      setTimeout(() => {
        try {
          ovMap.relayout();
        } catch {}
      }, 0);
    }

    showOnMap({
      kakaoPlaceId: li.dataset.kid || '',
      name:
        li.dataset.name || li.querySelector('.name')?.textContent?.trim() || '',
      addr:
        li.dataset.addr || li.querySelector('.addr')?.textContent?.trim() || '',
      lat: parseFloat(li.dataset.lat),
      lng: parseFloat(li.dataset.lng),
    });
  });

  // ====== 선택하기 → 폼에 주입 +(선택 저장) + 닫기 ======
  asPickBtn.addEventListener('click', async () => {
    if (!_selectedPlace) return;
    const { kakaoPlaceId, name, addr, lat, lng } = _selectedPlace;
    if (!addr || !addr.trim()) {
      alert(
        '이 결과에는 도로명/지번 주소가 없습니다. 주소가 있는 항목을 선택해줘!'
      );
      return;
    }

    if (kakaoPlaceId) {
      try {
        const res = await fetch('https://sorimap.it.com/search/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, // JSON 필요
          credentials: 'include',
          body: JSON.stringify({
            kakaoPlaceId,
            name,
            address: addr || '',
            latitude: lat,
            longitude: lng,
          }),
        });
        if (!res.ok) {
          console.warn(
            '[search/select] 실패',
            res.status,
            await res.text().catch(() => '')
          );
        }
      } catch (e) {
        console.warn('[search/select] 네트워크 오류', e);
      }
    }

    addrInput.value = addr;
    latInput.value = String(lat || 0);
    lngInput.value = String(lng || 0);
    kidInput.value = kakaoPlaceId || '';
    try {
      updateButtonColor?.();
    } catch {}
    overlay.hidden = true;
    showSearchUI();
  });
})();
