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

let selectedType = 'MINWON'; // 기본값

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
  const isAddressFilled = locationInput.value.trim() !== '';
  const hasLatLng = !!latInput.value && !!lngInput.value;
  const hasKid = !!kidInput.value;

  const isPhoto = photoInput.files && photoInput.files.length > 0;
  return (
    isTitle && isCategory && isAddressFilled && hasLatLng && hasKid && isPhoto
  );
}
function updateButtonColor() {
  if (isFormValid()) {
    submitBtn.style.background = '#F87171';
    submitBtn.style.color = '#fff';
    submitBtn.disabled = false;
  } else {
    submitBtn.style.background = '#FEF2F2';
    submitBtn.style.color = '#f43f5e';
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

// 피드 작성(글쓰기) api
async function createFeedWithImages(feedData, imageFiles) {
  try {
    const formData = new FormData();
    formData.append('feed', JSON.stringify(feedData));
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        formData.append('images', file);
      }
    }

    const response = await fetch('https://sorimap.it.com/api/feeds', {
      method: 'POST',
      headers: {
        'ACCESS-TOKEN': getAccessTokenFromCookie(),
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`피드 작성 실패: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('피드 작성 중 오류:', error);
    throw error;
  }
}

// 사진 미리보기 이미지 컨테이너 생성

let previewContainer = document.querySelector('.photo-preview');

photoInput.addEventListener('change', function () {
  // 최대 8개 제한
  const files = Array.from(photoInput.files);
  if (files.length > 8) {
    alert('사진은 최대 8장까지 업로드할 수 있습니다.');
    photoInput.value = ''; // 파일 선택 초기화
    previewContainer.innerHTML = '';

    updateButtonColor();
    return;
  }

  // 기존 미리보기 삭제

  previewContainer.innerHTML = '';

  files.forEach((file) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement('img');

      img.src = e.target.result;
      previewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

//제출버튼
writeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFormValid()) return;

  const feedData = {
    title: writeForm.title.value.trim(),
    content: writeForm.content.value.trim(),
    type: selectedType,
    address: writeForm.address.value.trim(),
    lat: parseFloat(writeForm.lat?.value) || 0,
    lng: parseFloat(writeForm.lng?.value) || 0,
  };

  const kidRaw = writeForm.kakaoPlaceId?.value;
  const kid = kidRaw ? parseInt(kidRaw, 10) : null;
  if (Number.isFinite(kid)) feedData.kakaoPlaceId = kid;
  const images = writeForm.images.files;

  try {
    const createdFeed = await createFeedWithImages(feedData, images);
    alert('피드가 성공적으로 작성되었습니다!');
    console.log('작성 완료된 피드:', createdFeed);
    // 리다이렉트/폼 초기화 등 필요에 따라 추가
  } catch (error) {
    alert('피드 작성 중 오류가 발생했습니다: ' + error.message);
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

  // Kakao Services만 사용 (지도 생성 X)
  let places, geocoder;

  function ensureKakaoReady() {
    return new Promise((resolve) => {
      function go() {
        kakao.maps.load(() => resolve());
      }
      if (window.kakao && kakao.maps && kakao.maps.load) return go();
      // 이미 HTML에 SDK(autoload=false) 넣었으니 보통 여기 안 탐.
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
    setTimeout(() => qInput.focus(), 30);
  }

  function closeOverlay() {
    overlay.hidden = true;
    qInput.value = '';
    listEl.innerHTML = '';
    hintEl.style.display = 'block';
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

  // ====== 검색 ======
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
      <li data-kid="${it.kakaoPlaceId || ''}"
          data-lat="${it.lat}" data-lng="${it.lng}"
          data-name="${it.name}" data-addr="${it.addr || ''}">
        <div class="name">${it.name}</div>
        ${it.addr ? `<div class="addr">${it.addr}</div>` : ''}
      </li>
    `
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
    // 1) 장소 검색
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
          // 2) 주소 검색 fallback
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

  // ====== 선택 → 폼 채우고 닫기 ======
  async function postSelectPlace({ kakaoPlaceId, name, addr, lat, lng }) {
    try {
      if (!kakaoPlaceId) return; // placeId 없으면 스킵(주소검색 fallback일 수 있음)
      await fetch('https://sorimap.it.com/search/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          kakaoPlaceId,
          name,
          address: addr || '',
          latitude: lat,
          longitude: lng,
        }),
      });
    } catch (e) {
      console.warn('[search/select] 실패', e);
    }
  }

  listEl.addEventListener('click', async (e) => {
    const li = e.target.closest('li');
    if (!li) return;

    const kid = li.dataset.kid || '';
    const lat = parseFloat(li.dataset.lat);
    const lng = parseFloat(li.dataset.lng);
    const name = li.dataset.name || '';
    const addr = li.dataset.addr || name;

    // 서버 저장(선택) — placeId 있을 때만
    if (kid) {
      await postSelectPlace({ kakaoPlaceId: kid, name, addr, lat, lng });
    }

    // 폼 채우기
    addrInput.value = addr;
    latInput.value = String(lat || 0);
    lngInput.value = String(lng || 0);
    kidInput.value = kid;

    try {
      updateButtonColor?.();
    } catch {}

    closeOverlay();
  });

  // 엔터로 첫 번째 항목 선택
  qInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = listEl.querySelector('li');
      if (first) first.click();
      e.preventDefault();
    }
  });
})();
