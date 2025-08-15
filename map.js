window.addEventListener('DOMContentLoaded', () => {
  if (!window.kakao || !kakao.maps || !kakao.maps.load) return;
  kakao.maps.load(init);
});

async function init() {
  const container = document.getElementById('map');
  if (!container) return;

  if (container.clientHeight === 0) {
    await new Promise((resolve) => {
      const ro = new ResizeObserver((entries) => {
        const h = entries[0].contentRect.height;
        if (h > 0) {
          ro.disconnect();
          resolve();
        }
      });
      ro.observe(container);
    });
  }

  // 초기 위치
  const DEFAULT_CENTER = new kakao.maps.LatLng(37.42, 127.1266);
  const DEFAULT_LEVEL = 7;
  const MY_POS_LEVEL = 3;
  const LEAVE_THRESHOLD_M = 300;

  const map = new kakao.maps.Map(container, {
    center: DEFAULT_CENTER,
    level: DEFAULT_LEVEL,
  });

  // --------- 마커----------
  const HEADING_SVG = (color = '#F87171') => `
    <svg width="17" height="27" viewBox="0 0 17 27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="8.5" cy="18.5" r="8.5" fill="white"/>
      <circle cx="8.5" cy="18.5" r="5.5" fill="${color}"/>
      <path d="M7.63397 1.5C8.01887 0.833334 8.98113 0.833333 9.36603 1.5L12.3971 6.75C12.782 7.41667 12.3009 8.25 11.5311 8.25H5.46891C4.69911 8.25 4.21799 7.41667 4.60289 6.75L7.63397 1.5Z" fill="${color}"/>
    </svg>
  `;

  let headingOverlay = null;
  let headingSvgEl = null;
  let myPosLatLng = null;
  let pendingMyPos = false;
  let headingListenerOn = false;

  function ensureHeadingOverlay(pos, color = '#F87171') {
    if (!headingOverlay) {
      const el = document.createElement('div');
      el.className = 'heading-marker';
      el.style.width = '17px';
      el.style.height = '27px';
      el.style.pointerEvents = 'none';
      el.innerHTML = HEADING_SVG(color);

      headingSvgEl = el.firstElementChild;
      headingSvgEl.style.transformOrigin = '8.5px 18.5px';

      headingOverlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        xAnchor: 8.5 / 17,
        yAnchor: 18.5 / 27,
      });
      headingOverlay.setMap(map);
    } else {
      headingOverlay.getContent().innerHTML = HEADING_SVG(color);
      headingSvgEl = headingOverlay.getContent().firstElementChild;
      headingSvgEl.style.transformOrigin = '8.5px 18.5px';
      headingOverlay.setPosition(pos);
      headingOverlay.setMap(map);
    }
  }

  function rotateHeading(deg) {
    if (headingSvgEl) headingSvgEl.style.transform = `rotate(${deg}deg)`;
  }

  async function startDeviceOrientation() {
    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') return;
      }
      if (!headingListenerOn) {
        window.addEventListener('deviceorientation', onDeviceOrientation, true);
        headingListenerOn = true;
      }
    } catch (_) {
      /* 무시 */
    }
  }

  function onDeviceOrientation(e) {
    let heading = null;
    if (typeof e.webkitCompassHeading === 'number')
      heading = e.webkitCompassHeading;
    else if (typeof e.alpha === 'number') heading = 360 - e.alpha;
    if (heading != null) rotateHeading(heading);
  }

  // --------- 내 위치 버튼 ----------
  const myposBtn = document.getElementById('mypos-btn');

  const svgGray = `
<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="36" height="36" rx="7" fill="white"/>
<path d="M16.9998 27.9501V26.9501C14.9165 26.7167 13.1288 25.8544 11.6368 24.3631C10.1448 22.8717 9.28247 21.0841 9.04981 19.0001H8.04981C7.76647 19.0001 7.52914 18.9041 7.33781 18.7121C7.14647 18.5201 7.05047 18.2827 7.04981 18.0001C7.04914 17.7174 7.14514 17.4801 7.33781 17.2881C7.53047 17.0961 7.76781 17.0001 8.04981 17.0001H9.04981C9.28314 14.9167 10.1458 13.1291 11.6378 11.6371C13.1298 10.1451 14.9171 9.28272 16.9998 9.05005V8.05005C16.9998 7.76672 17.0958 7.52939 17.2878 7.33805C17.4798 7.14672 17.7171 7.05072 17.9998 7.05005C18.2825 7.04939 18.5201 7.14539 18.7128 7.33805C18.9055 7.53072 19.0011 7.76805 18.9998 8.05005V9.05005C21.0831 9.28339 22.8708 10.1461 24.3628 11.6381C25.8548 13.1301 26.7171 14.9174 26.9498 17.0001H27.9498C28.2331 17.0001 28.4708 17.0961 28.6628 17.2881C28.8548 17.4801 28.9505 17.7174 28.9498 18.0001C28.9491 18.2827 28.8535 18.5204 28.6628 18.7131C28.4721 18.9057 28.2345 19.0014 27.9498 19.0001H26.9498C26.7165 21.0834 25.8541 22.8711 24.3628 24.3631C22.8715 25.8551 21.0838 26.7174 18.9998 26.9501V27.9501C18.9998 28.2334 18.9038 28.4711 18.7118 28.6631C18.5198 28.8551 18.2825 28.9507 17.9998 28.9501C17.7171 28.9494 17.4798 28.8537 17.2878 28.6631C17.0958 28.4724 16.9998 28.2347 16.9998 27.9501ZM17.9998 25.0001C19.9331 25.0001 21.5831 24.3167 22.9498 22.9501C24.3165 21.5834 24.9998 19.9334 24.9998 18.0001C24.9998 16.0667 24.3165 14.4167 22.9498 13.0501C21.5831 11.6834 19.9331 11.0001 17.9998 11.0001C16.0665 11.0001 14.4165 11.6834 13.0498 13.0501C11.6831 14.4167 10.9998 16.0667 10.9998 18.0001C10.9998 19.9334 11.6831 21.5834 13.0498 22.9501C14.4165 24.3167 16.0665 25.0001 17.9998 25.0001ZM17.9998 22.0001C16.8998 22.0001 15.9581 21.6084 15.1748 20.8251C14.3915 20.0417 13.9998 19.1001 13.9998 18.0001C13.9998 16.9001 14.3915 15.9584 15.1748 15.1751C15.9581 14.3917 16.8998 14.0001 17.9998 14.0001C19.0998 14.0001 20.0415 14.3917 20.8248 15.1751C21.6081 15.9584 21.9998 16.9001 21.9998 18.0001C21.9998 19.1001 21.6081 20.0417 20.8248 20.8251C20.0415 21.6084 19.0998 22.0001 17.9998 22.0001Z" fill="#4B5563"/>
</svg>
`;

  // 새 목록 버튼 만들기
  const listBtn = document.createElement('button');
  listBtn.id = 'openSearchBtn';
  listBtn.type = 'button';
  listBtn.className = 'map-fab';
  listBtn.setAttribute('aria-label', '장소 목록 열기');
  listBtn.innerHTML = `
<svg width="36" height="36" viewBox="0 0 36 36" fill="none"
     xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="36" height="36" rx="7" fill="white"/>
  <path fill-rule="evenodd" clip-rule="evenodd"
        d="M27.1406 18H15.1406H27.1406ZM27.1406 24.8571H15.1406H27.1406ZM27.1406 11.1428H15.1406H27.1406Z"
        fill="currentColor"/>
  <path d="M27.1406 18H15.1406M27.1406 24.8571H15.1406M27.1406 11.1428H15.1406"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9.42676 24.1423C9.53011 24.1425 9.71664 24.2048 9.89746 24.3855C10.0785 24.5666 10.1406 24.7538 10.1406 24.8572C10.1406 24.9605 10.0785 25.1479 9.89746 25.3289C9.71669 25.5094 9.53009 25.5709 9.42676 25.571C9.32363 25.571 9.13661 25.5097 8.95605 25.3289C8.77573 25.1482 8.71392 24.9612 8.71387 24.8572C8.71387 24.7532 8.77576 24.5662 8.95605 24.3855C9.13661 24.2047 9.32363 24.1423 9.42676 24.1423ZM9.42676 17.2859C9.53009 17.286 9.71669 17.3475 9.89746 17.5281C10.0785 17.7091 10.1406 17.8964 10.1406 17.9998C10.1406 18.1031 10.0785 18.2904 9.89746 18.4714C9.71665 18.6521 9.53011 18.7145 9.42676 18.7146C9.32363 18.7146 9.13661 18.6522 8.95605 18.4714C8.77576 18.2908 8.71387 18.1037 8.71387 17.9998C8.71392 17.8958 8.77573 17.7087 8.95605 17.5281C9.13661 17.3473 9.32363 17.2859 9.42676 17.2859ZM9.42676 10.4285C9.53015 10.4286 9.71658 10.4908 9.89746 10.6716C10.0783 10.8525 10.1405 11.0389 10.1406 11.1423C10.1406 11.2457 10.0785 11.4329 9.89746 11.614C9.7166 11.7948 9.53014 11.8571 9.42676 11.8572C9.32363 11.8572 9.1366 11.7958 8.95605 11.615C8.77551 11.4342 8.71387 11.2463 8.71387 11.1423C8.71403 11.0383 8.77579 10.8512 8.95605 10.6707C9.13661 10.4899 9.32363 10.4285 9.42676 10.4285Z"
        fill="currentColor" stroke="currentColor" stroke-width="2"/>
</svg>`;

  const ui = document.querySelector('.map-ui');
  let wrap = ui.querySelector('.map-fab-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'map-fab-wrap';
    ui.appendChild(wrap);
  }
  wrap.replaceChildren(listBtn, myposBtn);

  function activateMyPos(loc) {
    ensureHeadingOverlay(loc, '#F87171');
    myPosLatLng = loc;
    map.setCenter(loc);
    map.setLevel(MY_POS_LEVEL);
    myposBtn?.classList.add('active');
  }

  function deactivateMyPos() {
    myposBtn?.classList.remove('active');
  }

  function distanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const QUICK_OPTS = {
    enableHighAccuracy: false,
    maximumAge: 600000,
    timeout: 1200,
  };
  const FRESH_OPTS = { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 };

  function onMyPosTap(e) {
    e.preventDefault();
    e.stopPropagation();
    if (pendingMyPos) return;
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치를 지원하지 않아요.');
      return;
    }
    pendingMyPos = true;

    // ① 캐시 먼저: 즉시 이동
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[QUICK] pos', pos.coords);
        const loc = new kakao.maps.LatLng(
          pos.coords.latitude,
          pos.coords.longitude
        );
        map.setCenter(loc);
        map.setLevel(MY_POS_LEVEL);
        ensureHeadingOverlay(loc, '#F87171');
        myPosLatLng = loc;
        myposBtn?.classList.add('active');
        startDeviceOrientation();

        // ② 고정밀 보정
        navigator.geolocation.getCurrentPosition(
          (p2) => {
            console.log('[FRESH] pos', p2.coords);
            const loc2 = new kakao.maps.LatLng(
              p2.coords.latitude,
              p2.coords.longitude
            );
            const movedFar =
              distanceMeters(
                loc.getLat(),
                loc.getLng(),
                loc2.getLat(),
                loc2.getLng()
              ) > 40;
            if (movedFar) activateMyPos(loc2);
            pendingMyPos = false;
          },
          (err) => {
            console.warn('[FRESH] fail', err);
            pendingMyPos = false;
          },
          FRESH_OPTS
        );
      },
      // 캐시 실패 → 고정밀 1회
      (err) => {
        console.warn('[QUICK] fail', err);
        navigator.geolocation.getCurrentPosition(
          (p2) => {
            console.log('[FRESH-only] pos', p2.coords);
            activateMyPos(
              new kakao.maps.LatLng(p2.coords.latitude, p2.coords.longitude)
            );
            pendingMyPos = false;
          },
          (err2) => {
            console.warn('[FRESH-only] fail', err2);
            alert('현재 위치를 가져오지 못했어요.');
            pendingMyPos = false;
          },
          FRESH_OPTS
        );
      },
      QUICK_OPTS
    );
  }

  if (myposBtn && navigator.geolocation) {
    myposBtn.addEventListener('pointerdown', onMyPosTap, { passive: false });
    myposBtn.addEventListener('click', onMyPosTap, { passive: false });
  }

  // 지도 이동 시 비활성화(사용자 이동/검색 등)
  kakao.maps.event.addListener(map, 'dragstart', () => {
    if (pendingMyPos) return;
    if (myposBtn?.classList.contains('active')) deactivateMyPos();
  });

  kakao.maps.event.addListener(map, 'idle', () => {
    if (pendingMyPos) return;
    if (!myposBtn?.classList.contains('active') || !myPosLatLng) return;

    const c = map.getCenter();
    const dist = distanceMeters(
      myPosLatLng.getLat(),
      myPosLatLng.getLng(),
      c.getLat(),
      c.getLng()
    );
    if (dist > LEAVE_THRESHOLD_M) deactivateMyPos();
  });

  window.addEventListener('resize', () => map.relayout());

  // ====== 같은 페이지 검색 전환 + 결과 선택 ======
  (function setupInlineSearch(map) {
    if (!map) return;

    const SELECT_PIN_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C10.0109 2 8.10322 2.79018 6.6967 4.1967C5.29018 5.60322 4.5 7.51088 4.5 9.5C4.5 11.432 5.564 13.3 6.768 14.816C7.988 16.353 9.446 17.645 10.423 18.438C11.349 19.188 12.651 19.188 13.577 18.438C14.554 17.645 16.012 16.353 17.232 14.816C18.436 13.301 19.5 11.432 19.5 9.5C19.5 7.51088 18.7098 5.60322 17.3033 4.1967C15.8968 2.79018 13.9891 2 12 2Z" fill="url(#g0)"/>
<path d="M14.5 9.5C14.5 10.163 14.2366 10.7989 13.7678 11.2678C13.2989 11.7366 12.663 12 12 12C11.337 12 10.7011 11.7366 10.2322 11.2678C9.76339 10.7989 9.5 10.163 9.5 9.5C9.5 8.83696 9.76339 8.20107 10.2322 7.73223C10.7011 7.26339 11.337 7 12 7C12.663 7 13.2989 7.26339 13.7678 7.73223C14.2366 8.20107 14.5 8.83696 14.5 9.5Z" fill="url(#g1)"/>
<defs>
  <linearGradient id="g0" x1="12" y1="2" x2="12" y2="19.0005" gradientUnits="userSpaceOnUse">
    <stop stop-color="#F87171"/><stop offset="1" stop-color="#EF4444"/>
  </linearGradient>
  <linearGradient id="g1" x1="9.79" y1="9.721" x2="12.394" y2="12.428" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FDFDFD"/><stop offset="1" stop-color="#FECBE6"/>
  </linearGradient>
</defs>
</svg>`;

    function makeSelectPinImage(size = 32) {
      const url =
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(SELECT_PIN_SVG);
      const s = new kakao.maps.Size(size, size);
      const offset = new kakao.maps.Point(size / 2, size - 1);
      return new kakao.maps.MarkerImage(url, s, { offset });
    }

    const app = document.querySelector('.app');
    const smallBar = document.querySelector('.search-bar');
    const view = document.getElementById('searchView');
    const backBtn = document.getElementById('searchBack');
    const inputFull = document.getElementById('searchFull');
    const clearBtn = document.getElementById('searchClear');
    const list = document.getElementById('searchList');
    const hint = document.getElementById('searchHint');

    view.addEventListener(
      'touchstart',
      (e) => {
        if (
          document.activeElement === inputFull &&
          !e.target.closest('.search-input-wrap')
        ) {
          inputFull.blur();
        }
      },
      { capture: true, passive: true }
    );

    // 상단 검색바
    const smallInput = document.getElementById('search-input');
    const sheet = document.getElementById('placeSheet');
    const psName = document.getElementById('ps-name');
    const psAddr = document.getElementById('ps-addr');
    const pickBtn = document.getElementById('placePickBtn');
    let _selectedPlace = null;

    const places = new kakao.maps.services.Places();
    const geocoder = new kakao.maps.services.Geocoder();

    inputFull.setAttribute('autocomplete', 'off');
    inputFull.setAttribute('autocorrect', 'off');
    inputFull.setAttribute('autocapitalize', 'off');
    inputFull.setAttribute('spellcheck', 'false');

    function openSearch() {
      try {
        sheet.hidden = true;
        app.classList.remove('pick-mode');
      } catch (_) {}

      view.hidden = false;
      app.classList.add('searching');

      let q = (inputFull.value || '').trim();
      if (!q && smallInput?.value) {
        q = smallInput.value.trim();
        if (q) inputFull.value = q;
      }

      if (q) {
        hint.style.display = 'none';
        list.style.display = 'block';
        clearBtn.style.display = 'block';

        clearTimeout(debounceId);
        const mySeq = ++querySeq;
        runSearch(q, mySeq);
      } else {
        clearResults();
      }

      setTimeout(() => inputFull.focus(), 60);
    }

    // 새로 만든 목록 버튼이랑 연결
    document.getElementById('openSearchBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });

    function closeSearch() {
      app.classList.remove('searching');
      view.hidden = true;
      inputFull.blur();
      setTimeout(() => {
        try {
          map.relayout();
        } catch (_) {}
      }, 0);
    }

    smallBar?.addEventListener('click', openSearch);
    backBtn?.addEventListener('click', closeSearch);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !view.hidden) closeSearch();
    });

    // ----- 검색/클리어 -----
    let debounceId = null;
    let querySeq = 0;

    function clearResults() {
      list.innerHTML = '';
      list.style.display = 'none';
      hint.style.display = 'block';
    }

    inputFull?.addEventListener('input', () => {
      const q = inputFull.value.trim();
      clearBtn.style.display = q ? 'block' : 'none';

      if (!q) {
        clearTimeout(debounceId);
        querySeq++;
        clearResults();
        return;
      }

      hint.style.display = 'none';
      list.style.display = 'block';

      clearTimeout(debounceId);
      const mySeq = ++querySeq;
      debounceId = setTimeout(() => runSearch(q, mySeq), 250);
    });

    clearBtn?.addEventListener('click', () => {
      inputFull.value = '';
      clearTimeout(debounceId);
      querySeq++;
      clearResults();
      inputFull.focus();
    });

    // --- 초성 판별 ---
    const CHO_LIST = [
      'ㄱ',
      'ㄲ',
      'ㄴ',
      'ㄷ',
      'ㄸ',
      'ㄹ',
      'ㅁ',
      'ㅂ',
      'ㅃ',
      'ㅅ',
      'ㅆ',
      'ㅇ',
      'ㅈ',
      'ㅉ',
      'ㅊ',
      'ㅋ',
      'ㅌ',
      'ㅍ',
      'ㅎ',
    ];
    const CHO_INDEX = {
      ㄱ: 0,
      ㄲ: 1,
      ㄴ: 2,
      ㄷ: 3,
      ㄸ: 4,
      ㄹ: 5,
      ㅁ: 6,
      ㅂ: 7,
      ㅃ: 8,
      ㅅ: 9,
      ㅆ: 10,
      ㅇ: 11,
      ㅈ: 12,
      ㅉ: 13,
      ㅊ: 14,
      ㅋ: 15,
      ㅌ: 16,
      ㅍ: 17,
      ㅎ: 18,
    };
    const HANGUL_BASE = 0xac00,
      JUNG_COUNT = 21,
      JONG_COUNT = 28;

    const isChoseongOnly = (s) => /^[ㄱ-ㅎ]$/.test(s);

    function firstSyllablesFromChoseong(ch) {
      const ci = CHO_INDEX[ch];
      if (ci == null) return [];
      const arr = [];
      for (let ji = 0; ji < JUNG_COUNT; ji++) {
        const code = HANGUL_BASE + (ci * JUNG_COUNT + ji) * JONG_COUNT;
        arr.push(String.fromCharCode(code));
      }
      return arr;
    }

    function getFirstChoseong(str) {
      if (!str) return null;
      const ch = str.trim()[0];
      const code = ch?.charCodeAt(0);
      if (!code || code < 0xac00 || code > 0xd7a3) return null;
      const choIdx = Math.floor(
        (code - HANGUL_BASE) / (JUNG_COUNT * JONG_COUNT)
      );
      return CHO_LIST[choIdx];
    }

    function runSearch(q, mySeq) {
      const center = DEFAULT_CENTER;
      const x = center.getLng(),
        y = center.getLat();
      const RADIUS = 20000;

      if (isChoseongOnly(q)) {
        const seeds = firstSyllablesFromChoseong(q);
        const SIZE_PER_SEED = 4;

        Promise.allSettled(
          seeds.map(
            (seed) =>
              new Promise((resolve) => {
                places.keywordSearch(
                  seed,
                  (data, status) => {
                    if (mySeq !== querySeq) return resolve([]);
                    if (
                      status !== kakao.maps.services.Status.OK ||
                      !data?.length
                    )
                      return resolve([]);
                    const items = data
                      .map((d) => ({
                        name: d.place_name,
                        addr: d.road_address_name || d.address_name || '',
                        lat: +d.y,
                        lng: +d.x,
                      }))
                      .filter(
                        (it) =>
                          distanceMeters(y, x, it.lat, it.lng) <= RADIUS &&
                          getFirstChoseong(it.name) === q
                      );
                    resolve(items.slice(0, SIZE_PER_SEED));
                  },
                  {
                    x,
                    y,
                    radius: RADIUS,
                    sort: 'distance',
                    size: SIZE_PER_SEED,
                  }
                );
              })
          )
        ).then((results) => {
          if (mySeq !== querySeq) return;
          const merged = [];
          const seen = new Set();
          results.forEach((r) => {
            if (r.status !== 'fulfilled') return;
            r.value.forEach((it) => {
              const key = `${it.name}|${it.lat.toFixed(6)}|${it.lng.toFixed(
                6
              )}`;
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(it);
              }
            });
          });
          merged.sort(
            (a, b) =>
              distanceMeters(y, x, a.lat, a.lng) -
              distanceMeters(y, x, b.lat, b.lng)
          );
          render(merged.slice(0, 30));
        });
        return;
      }

      places.keywordSearch(
        q,
        (data, status) => {
          if (mySeq !== querySeq) return;
          if (status === kakao.maps.services.Status.OK && data.length) {
            const items = data
              .map((d) => ({
                name: d.place_name,
                addr: d.road_address_name || d.address_name || '',
                lat: +d.y,
                lng: +d.x,
              }))
              .filter((it) => distanceMeters(y, x, it.lat, it.lng) <= RADIUS);
            render(items);
          } else {
            geocoder.addressSearch(q, (res, s2) => {
              if (mySeq !== querySeq) return;
              if (s2 === kakao.maps.services.Status.OK && res.length) {
                const items = res
                  .map((r) => ({
                    name: r.address_name,
                    addr: r.road_address?.address_name || r.address_name,
                    lat: +r.y,
                    lng: +r.x,
                  }))
                  .filter(
                    (it) => distanceMeters(y, x, it.lat, it.lng) <= RADIUS
                  )
                  .sort(
                    (a, b) =>
                      distanceMeters(y, x, a.lat, a.lng) -
                      distanceMeters(y, x, b.lat, b.lng)
                  );
                render(items);
              } else {
                list.innerHTML = `<li class="empty">검색 결과가 없어요</li>`;
              }
            });
          }
        },
        { x, y, radius: RADIUS, sort: 'distance', size: 15 }
      );
    }

    function render(items) {
      if (!items.length) {
        clearResults();
        return;
      }
      list.innerHTML = items
        .map(
          (it) => `
      <li data-lat="${it.lat}" data-lng="${it.lng}">
        <div class="name">${it.name}</div>
        ${it.addr ? `<div class="addr">${it.addr}</div>` : ''}
      </li>`
        )
        .join('');
      list.style.display = 'block';
      hint.style.display = 'none';
    }

    function pickFromList(li) {
      const lat = +li.dataset.lat,
        lng = +li.dataset.lng;
      const name = li.querySelector('.name')?.textContent?.trim() || '';
      const addr = li.querySelector('.addr')?.textContent?.trim() || '';
      const pos = new kakao.maps.LatLng(lat, lng);

      try {
        typeof deactivateMyPos === 'function' && deactivateMyPos();
      } catch (_) {}

      // 지도 이동/확대 + 핀
      map.setCenter(pos);
      map.setLevel(4);
      if (!window._selMarker) {
        window._selMarker = new kakao.maps.Marker({
          map,
          position: pos,
          image: makeSelectPinImage(34),
          zIndex: 1000,
        });
      } else {
        window._selMarker.setPosition(pos);
        window._selMarker.setImage(makeSelectPinImage(34));
        window._selMarker.setZIndex(1000);
      }

      // 상단 작은 검색바에 이름 채우기
      if (smallInput) smallInput.value = name;

      // 시트 열기
      _selectedPlace = { name, addr, lat, lng };
      psName.textContent = name;
      psAddr.textContent = addr || '주소 정보 없음';
      sheet.hidden = false;

      querySeq++;
      clearResults();
      closeSearch();
      app.classList.add('pick-mode');
    }

    // --- 리스트 탭 처리 ---
    const MOVE_TOLERANCE = 18;
    let tStart = null;
    let handledByTouch = false;

    list.addEventListener(
      'touchstart',
      (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const t = e.touches[0];
        tStart = { x: t.clientX, y: t.clientY, target: li };
      },
      { passive: true }
    );

    list.addEventListener(
      'touchmove',
      (e) => {
        if (!tStart) return;
        const t = e.touches[0];
        const moved = Math.hypot(t.clientX - tStart.x, t.clientY - tStart.y);
        if (moved > MOVE_TOLERANCE) tStart = null;
      },
      { passive: true }
    );

    list.addEventListener(
      'touchend',
      (e) => {
        if (!tStart) return;
        const t = e.changedTouches[0];

        const endEl = document.elementFromPoint(t.clientX, t.clientY);
        const li = endEl && endEl.closest('li');

        const moved = Math.hypot(t.clientX - tStart.x, t.clientY - tStart.y);
        const ok = li && li === tStart.target && moved <= MOVE_TOLERANCE;
        tStart = null;
        if (!ok) return;

        e.preventDefault();
        handledByTouch = true;
        setTimeout(() => {
          handledByTouch = false;
        }, 400);

        inputFull.blur();
        setTimeout(() => pickFromList(li), 0);
      },
      { passive: false }
    );

    list.addEventListener('click', (e) => {
      if (handledByTouch) {
        e.preventDefault();
        return;
      }
      const li = e.target.closest('li');
      if (!li) return;
      if (document.activeElement === inputFull) inputFull.blur();
      pickFromList(li);
    });

    pickBtn?.addEventListener('click', () => {
      if (!_selectedPlace) return;
      console.log('선택한 장소:', _selectedPlace);

      sheet.hidden = true;
      app.classList.remove('pick-mode');

      if (window._selMarker) {
        try {
          window._selMarker.setMap(null);
        } catch (_) {}
        window._selMarker = null; // 다음에 새로 선택하면 다시 생성됨
      }

      try {
        clearTimeout(debounceId);
      } catch (_) {}

      if (inputFull) {
        inputFull.value = '';
        inputFull.blur();
      }
      if (smallInput) {
        smallInput.value = '';
        smallInput.blur();
      }

      if (clearBtn) clearBtn.style.display = 'none';
      if (list) {
        list.innerHTML = '';
        list.style.display = 'none';
      }
      if (hint) hint.style.display = 'block';
    });
  })(map);
}
