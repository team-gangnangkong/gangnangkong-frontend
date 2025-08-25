// @ts-nocheck
/* global kakao */

function getLocationIdFromURL() {
  const p = new URLSearchParams(location.search);
  const v = p.get('locationId');
  return v ? Number(v) : undefined;
}
const LOCATION_ID = getLocationIdFromURL();

window.addEventListener('DOMContentLoaded', () => {
  if (!window.kakao || !kakao.maps || !kakao.maps.load) return;
  kakao.maps.load(init);
});

// ==== API 기본 설정 ====
const API_BASE = 'https://sorimap.it.com'; // 배포 시 교체
const eq6 = (a, b) => Math.abs(+a - +b) < 1e-6;

const ENDPOINTS = {
  // 지도 클러스터 (줌아웃 시)
  clusters: ({ minLat, maxLat, minLng, maxLng, locationId }) => {
    const q = new URLSearchParams({
      minLat,
      maxLat,
      minLng,
      maxLng,
      ...(locationId ? { locationId } : {}),
    });
    return `/api/map/clusters?${q}`;
  },

  // 지도: 패널 (줌인 시)
  panel: ({ minLat, maxLat, minLng, maxLng, sentiment, locationId }) => {
    const q = new URLSearchParams({
      minLat,
      maxLat,
      minLng,
      maxLng,
      sentiment,
      ...(locationId ? { locationId } : {}),
    });
    return `/api/map/panel?${q}`;
  },

  // 전체 피드 리스트
  feeds: ({ locationId } = {}) => {
    const q = new URLSearchParams({ ...(locationId ? { locationId } : {}) });
    return `/api/feeds${q.toString() ? `?${q}` : ''}`;
  },

  // 피드 상세
  feedDetail: (id) => `/api/feeds/${id}`,

  // 좋아요 토글 — 백엔드 경로 확정되면 교체
  toggleLike: (id) => `/api/feeds/${id}/like`,

  reactionsLike: (feedId) =>
    `/api/reactions/like?feedId=${encodeURIComponent(feedId)}`,

  searchKeyword: (keyword) => `/search?keyword=${encodeURIComponent(keyword)}`,
  searchSelect: () => `/search/select`,
};

async function api(path, { method = 'GET', body, signal, headers } = {}) {
  const finalHeaders = new Headers(headers || {});
  if (
    body &&
    !(body instanceof FormData) &&
    !finalHeaders.has('Content-Type')
  ) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  // 필요시 JWT
  const token = localStorage.getItem('accessToken');
  if (token) finalHeaders.set('Authorization', `Bearer ${token}`);

  const res = await fetch(API_BASE + path, {
    method,
    headers: finalHeaders,
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
    credentials: 'include', // 쿠키세션 쓰면 유지, 아니면 'omit'
    signal,
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${method} ${path}`);
    err.status = res.status;
    err.url = API_BASE + path;
    err.body = text;
    throw err;
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function recordSelectedPlace({ id, kakaoPlaceId, name, addr, lat, lng }) {
  try {
    if (!kakaoPlaceId) {
      alert(
        '카카오 장소 결과에서 선택해 주세요. (kakaoPlaceId가 없는 항목은 저장할 수 없어요)'
      );
      return false;
    }
    await api(ENDPOINTS.searchSelect(), {
      method: 'POST',
      body: {
        kakaoPlaceId,
        name,
        address: addr || '',
        latitude: lat,
        longitude: lng,
      },
    });
    return true;
  } catch (e) {
    const msg = String(e?.message || e);
    console.warn('[search/select] fail', e);
    if (msg.includes('404')) {
      alert(
        '선택 저장 API 경로가 서버에 없어요(404). 프록시/백엔드 라우팅을 확인해 주세요.'
      );
    } else {
      // 서버 에러 메시지가 있으면 같이 보여주면 원인 파악 빨라집니다.
      const more = e?.body ? `\n\n서버 응답: ${e.body.slice(0, 300)}` : '';
      alert('서버에 선택 결과를 저장하지 못했습니다.' + more);
    }
    return false;
  }
}

// ===== 공통 변환/유틸 =====
const CLUSTER_LEVEL_THRESHOLD = 7;
const SENTI = { POS: 'POSITIVE', NEG: 'NEGATIVE', NEU: 'NEUTRAL' };

const typeToSenti = (t) => (t === 'neg' ? SENTI.NEG : SENTI.POS);

const sentiToType = (s) => {
  if (s === 'NEGATIVE') return 'neg';
  if (s === 'POSITIVE') return 'pos';
  return null; // NEUTRAL or undefined → null로
};

// --- content/title 추출 유틸 ---
function stripTags(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html == null ? '' : String(html);
  return tmp.textContent || tmp.innerText || '';
}
function pickContent(row) {
  // 서버가 content 말고 contents/text/body/description/contentHtml 등으로 줄 때 커버
  const raw =
    row?.content ??
    row?.contents ??
    row?.text ??
    row?.body ??
    row?.description ??
    (typeof row?.contentHtml === 'string' ? stripTags(row.contentHtml) : '');

  return typeof raw === 'string' ? raw : '';
}
function pickAddr(row) {
  return row?.address ?? row?.addr ?? row?.location ?? '';
}

function normalizeItem(row) {
  // 1) 타입 정규화
  const typeFromSenti = sentiToType(row.sentiment);
  const typeFromRow =
    row.type === 'MINWON' ? 'neg' : row.type === 'MUNHWA' ? 'pos' : null;
  const type = typeFromSenti ?? typeFromRow ?? 'neg';

  // 2) id/주소/본문 등 필드 유연 추출
  const id =
    row.id ??
    row.feedId ??
    row.feedID ??
    row.feed_id ??
    row.postId ??
    row.post_id ??
    null;

  const addr = pickAddr(row);
  const content = pickContent(row);

  // 문화쪽에서 종종 review/comment에 본문이 들어오면 그쪽도 같이 받기
  const review =
    row.review ??
    row.comment ??
    row.note ??
    row.reviewText ??
    row.review_text ??
    '';

  return {
    id,
    type,
    lat: +row.lat,
    lng: +row.lng,
    title: row.title || (row.type === 'MINWON' ? '민원' : '문화'),
    addr,
    content, // ✅ 이제 다양한 키로 와도 채워짐
    review, // 문화 카드에서 우선 사용
    likes: row.likes ?? row.likeCount ?? 0,
    likedByMe: !!(row.likedByMe ?? row.isLiked ?? row.liked),
    status: row.status || 'OPEN',
    progress: Number.isFinite(row.progress)
      ? row.progress
      : row.status === 'RESOLVED'
      ? 100
      : row.status === 'IN_PROGRESS'
      ? 60
      : 10,
    imageUrls: row.imageUrls || row.images || [],
    sentiment: row.sentiment,
  };
}

async function init() {
  const container = document.getElementById('map');
  if (!container) return;

  if (container.clientWidth === 0 || container.clientHeight === 0) {
    await new Promise((resolve) => {
      const ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
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

  function getViewportBounds(map) {
    const b = map.getBounds();
    const sw = b.getSouthWest(),
      ne = b.getNorthEast();
    return {
      minLat: sw.getLat(),
      maxLat: ne.getLat(),
      minLng: sw.getLng(),
      maxLng: ne.getLng(),
    };
  }

  // 서버 데이터
  let POINTS = []; // 줌-인 시 개별 핀들
  let SV_CLUSTERS = []; // 줌-아웃 시 서버 클러스터들

  let _fetchingPins = false;
  let _fetchingClusters = false;
  async function fetchClustersInView() {
    if (_fetchingClusters) return;
    _fetchingClusters = true;
    try {
      const { minLat, maxLat, minLng, maxLng } = getViewportBounds(map);
      const arr = await api(
        ENDPOINTS.clusters({
          minLat,
          maxLat,
          minLng,
          maxLng,
          locationId: LOCATION_ID,
        })
      );
      SV_CLUSTERS = (arr || []).map((c) => ({
        lat: +c.lat,
        lng: +c.lng,
        count: c.count ?? 0,
        type:
          sentiToType(c.sentiment) ||
          (c.type === 'MUNHWA' ? 'pos' : c.type === 'MINWON' ? 'neg' : null) ||
          'neg',
      }));
    } catch (e) {
      console.warn('clusters fail', e);
      SV_CLUSTERS = [];
    } finally {
      _fetchingClusters = false;
    }
  }
  async function fetchPinsInView() {
    if (_fetchingPins) return;
    _fetchingPins = true;
    try {
      const bb = getViewportBounds(map);
      const [neg, pos, neu] = await Promise.all([
        api(
          ENDPOINTS.panel({
            ...bb,
            sentiment: SENTI.NEG,
            locationId: LOCATION_ID,
          })
        ),
        api(
          ENDPOINTS.panel({
            ...bb,
            sentiment: SENTI.POS,
            locationId: LOCATION_ID,
          })
        ),
        api(
          ENDPOINTS.panel({
            ...bb,
            sentiment: SENTI.NEU,
            locationId: LOCATION_ID,
          })
        ).catch(() => []), // 서버가 NEU 미구현이어도 안전
      ]);

      POINTS = [
        ...(neg || []).map((r) => ({ ...r, sentiment: SENTI.NEG })),
        ...(pos || []).map((r) => ({ ...r, sentiment: SENTI.POS })),
        ...(neu || []).map((r) => ({ ...r, sentiment: SENTI.NEU })),
      ].map(normalizeItem);

      attachCatFromCache(POINTS);
    } catch (e) {
      console.warn('panel fail', e);
      POINTS = [];
    } finally {
      _fetchingPins = false;
    }
  }
  // 클러스터 클릭 → 해당 감정 타입으로 패널 채우기
  async function openPanelForType(type /* 'pos'|'neg' */) {
    try {
      const bb = getViewportBounds(map);
      const items = await api(
        ENDPOINTS.panel({
          ...bb,
          sentiment: typeToSenti(type),
          locationId: LOCATION_ID,
        })
      );
      const normalized = (items || []).map(normalizeItem);
      openClusterPanel(normalized, type);
      await fetchPinsInView();
      renderMoodPins(POINTS);
    } catch (e) {
      console.warn('openPanelForType fail', e);
      openClusterPanel([], type);
    }
  }

  const getAllPoints = () => POINTS;

  // ==== 아이콘 파일 경로 ====
  const POS_URL = '/image/positive.png';
  const NEG_URL = '/image/negative.png';

  let _stickyMoodPin = null;
  let _stickyKey = null;

  let _hoverAllowed = true; // 패널 열려 있을 때만 hover 허용
  const setHoverAllowed = (v) => {
    _hoverAllowed = !!v;
  };

  // 1000m 이동시 원 배경 제거 + 컨테이너 강조 제거
  function clearStickyMoodPin() {
    // 카드 강조들 제거
    try {
      panelListEl.querySelectorAll('.cp-card').forEach((c) => {
        c.classList.remove('bump', 'highlight', 'is-selected');
      });
    } catch (_) {}
    //원 배경 제거
    if (_stickyMoodPin)
      _stickyMoodPin.classList.remove('is-sticky', 'is-hover');
    _stickyMoodPin = null;
    _stickyKey = null;
  }
  function setStickyMoodPin(el, key) {
    // 같은 핀을 다시 누르면 해제
    if (_stickyMoodPin && _stickyKey && _stickyKey === key) {
      clearStickyMoodPin();
      return false;
    }
    if (_stickyMoodPin && _stickyMoodPin !== el) {
      _stickyMoodPin.classList.remove('is-sticky', 'is-hover');
    }
    _stickyMoodPin = el;
    _stickyKey = key;
    el.classList.add('is-sticky', 'is-hover');
    return true;
  }
  function applyStickyClasses(el) {
    if (!el) return;
    _stickyMoodPin = el;
    el.classList.add('is-sticky', 'is-hover');
  }

  // 좌표로 핀 강조
  function highlightMoodPinByLatLng(
    lat,
    lng,
    type,
    { sticky = false, tries = 12, delay = 80 } = {}
  ) {
    const key = pinKey(type, lat, lng);
    const el = moodPinIndex.get(key);
    if (el) {
      if (sticky) {
        setStickyMoodPin(el, key);
      } else {
        el.classList.add('is-hover');
        setTimeout(() => {
          if (_stickyMoodPin !== el) el.classList.remove('is-hover');
        }, 1600);
      }
      return true;
    }
    if (tries > 0) {
      setTimeout(
        () =>
          highlightMoodPinByLatLng(lat, lng, type, {
            sticky,
            tries: tries - 1,
            delay,
          }),
        delay
      );
    }
    return false;
  }

  const moodPinIndex = new Map();
  const pinKey = (type, lat, lng) =>
    `${type}|${(+lat).toFixed(6)}|${(+lng).toFixed(6)}`;

  // 살짝 겹침 방지용
  function jitter(lat, lng, meters = 18) {
    const r = meters / 111320;
    const u = (Math.random() - 0.5) * 2,
      v = (Math.random() - 0.5) * 2;
    return [lat + r * u, lng + (r * v) / Math.cos((lat * Math.PI) / 180)];
  }

  function bubbleSizeByCount(count) {
    const MIN = 56; // 최소 지름
    const MAX = 128; // 최대 지름
    const CUTOFF = 50; // 50개 이상이면 MAX로
    const t = Math.min(Math.max(count, 1), CUTOFF) / CUTOFF;
    const eased = Math.sqrt(t);
    return Math.round(MIN + (MAX - MIN) * eased);
  }

  function makeMoodOverlay(p) {
    const el = document.createElement('div');
    // p.type 기준으로 안전 타입 결정
    const safeType = p.type === 'pos' || p.type === 'neg' ? p.type : 'neg';
    // 핀은 mood-pin 클래스로! (클러스터는 cluster-bubble 유지)
    el.className = `mood-pin ${safeType}`;
    el.innerHTML = `<img src="${p.type === 'pos' ? POS_URL : NEG_URL}" alt="${
      p.type
    }">`;

    const latKey = p.origLat != null ? p.origLat : p.lat;
    const lngKey = p.origLng != null ? p.origLng : p.lng;
    const key = pinKey(p.type, latKey, lngKey);

    el.addEventListener('mouseenter', () => {
      if (_hoverAllowed || _stickyMoodPin === el) el.classList.add('is-hover');
    });
    el.addEventListener(
      'touchstart',
      () => {
        if (_hoverAllowed || _stickyMoodPin === el)
          el.classList.add('is-hover');
      },
      { passive: true }
    );

    el.addEventListener('mouseleave', () => {
      if (_stickyMoodPin !== el) el.classList.remove('is-hover');
    });

    const clearTouchHover = () => {
      if (_stickyMoodPin !== el) el.classList.remove('is-hover');
    };
    el.addEventListener('touchend', clearTouchHover);
    el.addEventListener('touchcancel', clearTouchHover);

    // 클릭시 토글 + 패널 열기
    // 클릭시 토글 + 패널 열기
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const turnedOn = setStickyMoodPin(el, key);

      // 토글 OFF면 강조만 해제
      if (!turnedOn) {
        try {
          const card = findCardByLatLng(latKey, lngKey);
          card?.classList?.remove('bump', 'highlight', 'is-selected');
        } catch (_) {}
        return;
      }

      // ✅ 클릭한 좌표와 타입이 정확히 같은 '그 글' 1건만 패널로
      const theOne = POINTS.find(
        (it) => it.type === p.type && eq6(it.lat, latKey) && eq6(it.lng, lngKey)
      );

      if (theOne) {
        openClusterPanel([theOne], p.type); // 한 장만 렌더
      } else {
        // 혹시 못 찾으면 (안전장치) 기존 동작 유지
        const itemsOfType = POINTS.filter((it) => it.type === p.type);
        openClusterPanel(itemsOfType, p.type);
        requestAnimationFrame(() => bumpCardToTop(latKey, lngKey));
      }
    });

    const ov = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(p.lat, p.lng),
      content: el,
      yAnchor: 1,
      zIndex: p.type === 'neg' ? 60 : 50,
      clickable: true,
    });
    return { ov, el };
  }

  let _moodOverlays = [];
  function clearMoodPins() {
    _moodOverlays.forEach((o) => o.setMap(null));
    _moodOverlays = [];
    moodPinIndex.clear();
    _stickyMoodPin = null;
  }
  function renderMoodPins(points = []) {
    clearMoodPins();
    points.forEach((pt) => {
      const [lat, lng] = jitter(pt.lat, pt.lng, 12);
      const { ov, el } = makeMoodOverlay({
        ...pt,
        lat,
        lng,
        origLat: pt.lat,
        origLng: pt.lng,
      });
      ov.setMap(map);
      _moodOverlays.push(ov);

      const key = pinKey(pt.type, pt.lat, pt.lng); // 원본 좌표 기준
      moodPinIndex.set(key, el);

      if (_stickyKey && _stickyKey === key) applyStickyClasses(el);
    });
    window.dispatchEvent(new CustomEvent('moodpins-rendered'));
  }

  let _clusterOverlays = [];
  function clearClusters() {
    _clusterOverlays.forEach((o) => o.setMap(null));
    _clusterOverlays = [];
  }
  kakao.maps.event.addListener(map, 'zoom_changed', () => {
    const lv = map.getLevel();
    if (lv >= CLUSTER_LEVEL_THRESHOLD) {
      // 줌아웃: 클러스터 모드 → PNG 핀 즉시 제거
      clearMoodPins();
    } else {
      // 줌인: 핀 모드 → 클러스터 즉시 제거
      clearClusters();
    }
  });

  function clusterPoints(points, map, radiusPx = 80) {
    const proj = map.getProjection();
    const buckets = [];

    for (const p of points) {
      const pt = proj.containerPointFromCoords(
        new kakao.maps.LatLng(p.lat, p.lng)
      );
      let bucket = null;
      for (const b of buckets) {
        const dx = b.x - pt.x,
          dy = b.y - pt.y;
        if (dx * dx + dy * dy <= radiusPx * radiusPx) {
          bucket = b;
          break;
        }
      }
      if (!bucket) {
        bucket = { x: pt.x, y: pt.y, pts: [] };
        buckets.push(bucket);
      }
      bucket.pts.push(p);
    }

    const avg = (arr, key) =>
      arr.length ? arr.reduce((s, p) => s + p[key], 0) / arr.length : null;

    return buckets.map((b) => {
      const all = b.pts;
      const posArr = all.filter((p) => p.type === 'pos');
      const negArr = all.filter((p) => p.type === 'neg');

      const allCenter = {
        lat: avg(all, 'lat'),
        lng: avg(all, 'lng'),
      };

      const posCenter = posArr.length
        ? { lat: avg(posArr, 'lat'), lng: avg(posArr, 'lng') }
        : null;

      const negCenter = negArr.length
        ? { lat: avg(negArr, 'lat'), lng: avg(negArr, 'lng') }
        : null;

      return {
        lat: allCenter.lat,
        lng: allCenter.lng,
        items: all,
        pos: posArr.length,
        neg: negArr.length,
        posCenter,
        negCenter,
      };
    });
  }

  function makeClusterOverlay(c, type, posLatLng, sizeOpt, zIndexOpt, onClick) {
    const el = document.createElement('div');
    el.className = `cluster-bubble ${type}`;

    const count =
      c && typeof c.count === 'number'
        ? c.count
        : type === 'pos'
        ? c.pos
        : c.neg;

    const size = sizeOpt ?? bubbleSizeByCount(count);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    const fs = Math.round(14 + ((size - 56) * (28 - 16)) / (128 - 56));
    el.innerHTML = `<div class="cluster-count" style="font-size:${fs}px">${count}</div>`;

    const ov = new kakao.maps.CustomOverlay({
      position: posLatLng ?? new kakao.maps.LatLng(c.lat, c.lng),
      content: el,
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: zIndexOpt ?? 3000,
      clickable: true,
    });

    el.addEventListener('click', (e) => {
      e.preventDefault();

      if (typeof onClick === 'function') {
        onClick();
        return;
      }

      const allItems = c.items || [];
      const itemsOfType = allItems.filter((p) =>
        type === 'pos' ? p.type === 'pos' : p.type === 'neg'
      );

      const bounds = new kakao.maps.LatLngBounds();
      allItems.forEach((p) =>
        bounds.extend(new kakao.maps.LatLng(p.lat, p.lng))
      );

      if (
        typeof bounds.isEmpty === 'function'
          ? !bounds.isEmpty()
          : allItems.length
      ) {
        map.setBounds(bounds, 80, 80, 80, 80);
      } else {
        map.setCenter(posLatLng ?? new kakao.maps.LatLng(c.lat, c.lng));
        map.setLevel(4);
      }

      openClusterPanel(itemsOfType, type);
    });

    return ov;
  }

  // ===== 하단 패널 =====
  const appEl = document.querySelector('.app');
  const panelEl = document.getElementById('clusterPanel');
  const panelListEl = document.getElementById('cp-list');
  const panelBadgeEl = document.getElementById('cp-badge');
  const panelCountEl = document.getElementById('cp-count');
  const panelCloseBtn = document.getElementById('cp-close');
  const panelSortBtn = document.getElementById('cp-sort');

  let _lastPanelItems = [];
  let _lastPanelType = null;

  try {
    const bc = new BroadcastChannel('feed-like');
    window._likeBC = bc;

    bc.onmessage = async (e) => {
      if (e.data?.type !== 'like-change') return;
      const { id, delta } = e.data;

      const p = POINTS.find((it) => String(it.id) === String(id));
      if (p) {
        p.likes = Math.max(0, (p.likes || 0) + (delta || 0));
        p.likedByMe = true;
      }
      renderMoodPins(POINTS);
      if (document.querySelector('.app')?.classList.contains('panel-open')) {
        openLastPanel(_lastPanelType || 'neg');
      }
    };
  } catch {}

  // 스냅 높이 계산
  function snapHeights() {
    const vh = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight
    );
    return {
      mini: 120, // 미리보기 높이
      half: Math.round(vh * 0.46), // 중간
      full: Math.round(vh - 80), // 상단 여백
    };
  }
  function setPanelHeight(mode) {
    const H = snapHeights()[mode] || snapHeights().half;
    const maxH =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--cp-max')
      ) || H;
    document.documentElement.style.setProperty(
      '--cp-height',
      Math.min(H, maxH) + 'px'
    );
  }

  // 드래그
  (function makePanelDraggable() {
    const grip = panelEl.querySelector('.cp-grip');
    const PANEL_MIN = 120; // 미니 스냅 높이
    const HIDE_THRESHOLD = 118;
    let startY = 0,
      startH = 0,
      dragging = false;

    function onStart(ev) {
      dragging = true;
      startY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      startH = panelEl.getBoundingClientRect().height;
      panelEl.style.transition = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);
    }
    function onMove(ev) {
      if (!dragging) return;
      const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dy = startY - y;
      let newH = Math.max(110, startH + dy);
      const maxH =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--cp-max'
          )
        ) || newH;
      if (newH > maxH) newH = maxH;
      document.documentElement.style.setProperty('--cp-height', newH + 'px');
      ev.preventDefault();
    }
    function onEnd() {
      dragging = false;
      panelEl.style.transition = '';

      const h = panelEl.getBoundingClientRect().height;

      // 임계값보다 작아지면 패널 닫기 + 하단바
      if (h < HIDE_THRESHOLD) {
        closeClusterPanel();
      } else {
        const { mini, half, full } = snapHeights();
        const target =
          Math.abs(h - full) < 120
            ? 'full'
            : Math.abs(h - half) < 120
            ? 'half'
            : 'mini';
        setPanelHeight(target);
      }

      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    }

    grip.addEventListener('mousedown', onStart);
    grip.addEventListener('touchstart', onStart, { passive: true });
  })();

  function updatePanelMax() {
    const topGap = 160; // 화면 상단에서 150px 여백
    const maxH = window.innerHeight - topGap;

    document.documentElement.style.setProperty('--cp-max', maxH + 'px');
    const cur =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--cp-height'
        )
      ) || 0;
    if (cur > maxH) {
      document.documentElement.style.setProperty('--cp-height', maxH + 'px');
    }
  }

  updatePanelMax();
  window.addEventListener('resize', updatePanelMax);

  function escapeHTML(s) {
    return (s == null ? '' : String(s)).replace(
      /[&<>\"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }[c])
    );
  }

  // 카테고리 자동 추가

  const CAT_CACHE_KEY = 'catCache.v1';
  const CAT_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30일

  function loadCatCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(CAT_CACHE_KEY) || '[]');
      const now = Date.now();
      return new Map(
        raw
          .filter(([_, v]) => v && v.name && v.exp > now)
          .map(([k, v]) => [k, v.name])
      );
    } catch {
      return new Map();
    }
  }
  function saveCatCache(map) {
    const now = Date.now();
    const arr = Array.from(map.entries()).map(([k, name]) => [
      k,
      { name, exp: now + CAT_TTL_MS },
    ]);
    try {
      localStorage.setItem(CAT_CACHE_KEY, JSON.stringify(arr.slice(-800)));
    } catch {}
  }

  const _catCache = loadCatCache();
  function _cachePut(key, cat) {
    if (!cat) return;
    _catCache.set(key, cat);
    saveCatCache(_catCache);
  }

  function _pickCatName(place) {
    return (
      place.category_group_name ||
      (place.category_name || '').split('>').shift().trim()
    );
  }

  function _keyFor(it) {
    return `${(+it.lat).toFixed(6)}|${(+it.lng).toFixed(6)}|${it.title}`;
  }

  function guessCategoryFromTitle(title = '') {
    const t = title.toLowerCase();
    if (/(카페|coffee|cafe|루프탑|디저트)/i.test(title)) return '카페';
    if (
      /(식당|맛집|구이|분식|정식|라멘|라면|초밥|스시|돈까스|족발|보쌈|국밥)/i.test(
        title
      )
    )
      return '음식점';
    if (/(클라이밍|짐|헬스|요가|필라테스|볼링)/i.test(title)) return '운동';
    if (/(공원|전시|미술관|박물관|문화|공연)/i.test(title)) return '놀거리';
    return '';
  }

  function attachCatFromCache(items) {
    items.forEach((it) => {
      const k = _keyFor(it);
      if (!it.category && _catCache.has(k)) it.category = _catCache.get(k);
    });
  }

  function fetchCategoryNear(placesSvc, it) {
    const key = _keyFor(it);
    if (_catCache.has(key)) return Promise.resolve(_catCache.get(key));

    return new Promise((resolve) => {
      placesSvc.keywordSearch(
        it.title,
        (data, status) => {
          if (status !== kakao.maps.services.Status.OK || !data?.length) {
            return resolve(guessCategoryFromTitle(it.title));
          }
          const best = data
            .map((d) => ({
              d,
              dist: distanceMeters(it.lat, it.lng, +d.y, +d.x),
            }))
            .filter((x) => x.dist <= 120)
            .sort((a, b) => a.dist - b.dist)[0]?.d;

          const cat = best
            ? _pickCatName(best)
            : guessCategoryFromTitle(it.title);
          resolve(cat || '');
        },
        { x: it.lng, y: it.lat, radius: 500, size: 5, sort: 'distance' }
      );
    });
  }

  async function enrichCategories(items) {
    const svc = new kakao.maps.services.Places();
    await Promise.allSettled(
      items.map(async (it) => {
        if (it.category) return;
        const cat = await fetchCategoryNear(svc, it);
        if (!cat) return;

        it.category = cat;
        _cachePut(_keyFor(it), cat);

        const card = findCardByLatLng(it.lat, it.lng);
        if (!card || card.querySelector('.cp-cat')) return;
        const titleBox = card.querySelector('.cp-title-txt');
        if (!titleBox) return;
        const badge = document.createElement('span');
        badge.className = 'cp-cat';
        badge.textContent = cat;
        titleBox.appendChild(badge);
      })
    );
  }

  function openClusterPanel(items, type /* 'pos' | 'neg' */) {
    attachCatFromCache(items);
    _lastPanelItems = items;
    _lastPanelType = type;
    const isPos = type === 'pos';
    const count = items.length;

    if (panelSortBtn) {
      panelSortBtn.textContent = '공감순'; // 라벨 고정(선택)
      panelSortBtn.classList.toggle('pos', isPos); // ★ 긍정이면 초록 적용
    }

    const sorted = [...items].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));

    panelBadgeEl.hidden = true;
    const titleEl = document.querySelector('.cp-title');
    // if (titleEl) {
    //   titleEl.innerHTML = `<span class="cp-dyn">${count}개의 ${
    //     isPos ? '문화' : '소리'
    //   }</span>`;
    // }

    panelBadgeEl.textContent = isPos ? '문화' : '민원';
    panelBadgeEl.classList.remove('pos');
    panelBadgeEl.classList.toggle('pos', isPos);

    panelCountEl.textContent = String(items.length);

    panelListEl.innerHTML = sorted
      .map((it) => {
        const isPosType = isPos;
        const title = it.title || (isPosType ? '문화 장소' : '민원 글');
        const addr = it.addr || '주소 정보 없음';
        const likes = it.likes ?? 0;

        if (isPosType) {
          // === 문화 카드 ===
          const category = it.category || '';
          const rawReview = (it.review || it.content || '').trim();
          const review = escapeHTML(
            rawReview || '작성된 문화 후기/설명이 아직 없습니다.'
          );
          return `
<article class="cp-card pos"
         data-id="${it.id}"
         data-type="pos"
         data-lat="${it.lat}"
         data-lng="${it.lng}">
  <div class="cp-row">
  <div class="cp-title-wrap">
    <h3 class="cp-title-txt">${escapeHTML(title)}</h3>
    ${category ? `<span class="cp-cat">${escapeHTML(category)}</span>` : ''}
  </div>
  <button class="cp-likebtn ${
    it.likedByMe ? 'is-liked' : ''
  }" type="button">👍공감해요</button>
</div>

  <div class="cp-addr">
    <svg class="addr-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" fill-rule="evenodd" d="M12 2a8 8 0 0 0-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>
    </svg>
    ${addr}
  </div>

  <div class="cp-bubble">
    <svg class="cp-bubble-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c-5.5 0-10 3.98-10 8.9c0 2.1.91 4.04 2.42 5.5L4 22l5.1-2.4c1 .24 2.03.36 3.1.36c5.5 0 10-3.98 10-8.9S17.5 2 12 2Z"
            fill="none" stroke="currentColor" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round"/>
      <rect x="7" y="9" width="10" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="7" y="12.5" width="8" height="1.8" rx="0.9" fill="currentColor"/>
    </svg>
    <span class="cp-bubble-text">${review}</span>
  </div>

  <div class="cp-row">
    <div class="cp-likecount">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 11v10H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z"/>
        <path d="M9 11l4.2-7.2a2 2 0 0 1 3.7.9v5.3h3a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1.5H9V11Z"/>
      </svg><span class="count">${likes}</span>
    </div>
  </div>
</article>`;
        }

        // === 민원(neg) 카드 ===
        const raw = (it.content || it.snippet || '').trim();
        const content = escapeHTML(raw || '작성된 민원 내용이 아직 없습니다.');

        return `
<article class="cp-card"
         data-id="${it.id}"
         data-type="neg"
         data-lat="${it.lat}"
         data-lng="${it.lng}">
  <div class="cp-row">
    <div class="cp-title-txt">${title}</div>
    <button class="cp-likebtn ${
      it.likedByMe ? 'is-liked' : ''
    }" type="button">👍공감해요</button>
  </div>

  <div class="cp-addr">
    <svg class="addr-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" fill-rule="evenodd"
        d="M12 2a8 8 0 0 0-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>
    </svg>
    ${addr}
  </div>

  <div class="cp-complaint">
    <svg class="cp-complaint-ico chat" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c-5.5 0-10 3.98-10 8.9c0 2.1.91 4.04 2.42 5.5L4 22l5.1-2.4c1 .24 2.03.36 3.1.36c5.5 0 10-3.98 10-8.9S17.5 2 12 2Z"
            fill="none" stroke="currentColor" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round"/>
      <rect x="7" y="9"   width="10" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="7" y="12.5" width="8"  height="1.8" rx="0.9" fill="currentColor"/>
    </svg>
    <span class="cp-complaint-text">${content}</span>
  </div>

  <div class="cp-row">
    <div class="cp-likecount">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 11v10H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z"/>
        <path d="M9 11l4.2-7.2a2 2 0 0 1 3.7.9v5.3h3a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1.5H9V11Z"/>
      </svg><span class="count">${likes}</span>
    </div>
  </div>
</article>`;
      })
      .join('');

    enrichCategories(sorted);
    panelEl.hidden = false;
    appEl.classList.add('panel-open');
    updatePanelMax();
    setPanelHeight('half');
    setHoverAllowed(true);
  }

  function openLastPanel(fallbackType = 'neg') {
    const type = _lastPanelType ?? fallbackType;
    const items = POINTS.filter((it) => it.type === type); // ← 항상 최신
    if (items && items.length) {
      openClusterPanel(items, type);
      setPanelHeight('half');
      setHoverAllowed(true);
    }
  }

  function findCardByLatLng(lat, lng) {
    const list = document.getElementById('cp-list');
    if (!list) return null;
    const toKey = (a, b) => `${(+a).toFixed(6)}|${(+b).toFixed(6)}`;
    const key = toKey(lat, lng);
    return (
      Array.from(list.querySelectorAll('.cp-card')).find(
        (c) => toKey(c.dataset.lat, c.dataset.lng) === key
      ) || null
    );
  }

  function bumpCardToTop(lat, lng) {
    const list = document.getElementById('cp-list');
    if (!list) return;
    const card = findCardByLatLng(lat, lng);
    if (!card) return;
    list.insertBefore(card, list.firstChild);
    list.scrollTo({ top: 0, behavior: 'smooth' });
    card.classList.add('bump');
  }

  function focusPanelCardByLatLng(lat, lng, isPos) {
    const list = document.getElementById('cp-list');
    if (!list) return;

    const toKey = (a, b) => `${(+a).toFixed(6)}|${(+b).toFixed(6)}`;
    const targetKey = toKey(lat, lng);

    requestAnimationFrame(() => {
      const cards = Array.from(list.querySelectorAll('.cp-card'));
      const target = cards.find(
        (c) => toKey(c.dataset.lat, c.dataset.lng) === targetKey
      );
      if (!target) return;

      const top = target.offsetTop - 8;
      list.scrollTo({ top, behavior: 'smooth' });

      // 하이라이트 주고 얼마 뒤에 효과 없앨건지
      target.classList.add('highlight');
      setTimeout(() => target.classList.remove('highlight'), 3000);
    });
  }

  function closeClusterPanel() {
    setHoverAllowed(false);
    try {
      panelListEl.querySelectorAll('.cp-card').forEach((c) => {
        c.classList.remove('bump', 'highlight', 'is-selected');
      });
    } catch (_) {}
    try {
      clearStickyMoodPin?.();
      document
        .querySelectorAll('.mood-pin.is-hover, .mood-pin.is-sticky')
        .forEach((el) => el.classList.remove('is-hover', 'is-sticky'));
    } catch (_) {}

    appEl.classList.remove('panel-open');
    panelEl.hidden = true;
    panelListEl.innerHTML = '';
  }
  panelCloseBtn.addEventListener('click', closeClusterPanel);

  let _refreshingLikes = false;
  async function refreshLikesNow() {
    if (_refreshingLikes) return;
    _refreshingLikes = true;
    try {
      await fetchPinsInView();
      renderMoodPins(POINTS);
      if (document.querySelector('.app')?.classList.contains('panel-open')) {
        openLastPanel(_lastPanelType || 'neg'); // ← 최신 POINTS로 다시 그림
      }
    } finally {
      _refreshingLikes = false;
    }
  }
  window.addEventListener('focus', refreshLikesNow);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshLikesNow();
  });

  // === 아래에서 위로 올려서 하단패널 열기 ===
  const edgeZone = document.createElement('div');
  edgeZone.id = 'cp-edge-open';
  document.body.appendChild(edgeZone);

  function syncEdgeZone() {
    edgeZone.style.display = appEl.classList.contains('panel-open')
      ? 'none'
      : 'block';
  }
  syncEdgeZone();
  new MutationObserver(syncEdgeZone).observe(appEl, {
    attributes: true,
    attributeFilter: ['class'],
  });

  let ezStart = null;
  function onStart(e) {
    const t = e.touches ? e.touches[0] : e;
    ezStart = { x: t.clientX, y: t.clientY };
  }
  function onMove(e) {
    if (!ezStart) return;
    const t = e.touches ? e.touches[0] : e;
    const dy = ezStart.y - t.clientY;
    const dx = Math.abs(t.clientX - ezStart.x);
    if (dy > 22 && dy > dx * 1.5) {
      ezStart = null;
      openLastPanel();
    }
  }
  function onEnd() {
    ezStart = null;
  }

  edgeZone.addEventListener('touchstart', onStart, { passive: true });
  edgeZone.addEventListener('touchmove', onMove, { passive: true });
  edgeZone.addEventListener('touchend', onEnd);
  edgeZone.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  // 좋아요 클릭 처리 부분
  panelListEl.addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('.cp-likebtn');
    if (likeBtn) {
      e.preventDefault();
      e.stopPropagation();

      const card = likeBtn.closest('.cp-card');
      if (!card) return;

      const id = card.dataset.id;
      const cntEl = card.querySelector('.cp-likecount .count');
      let cur = parseInt(cntEl?.textContent || '0', 10) || 0;

      if (likeBtn.classList.contains('is-liked')) return; // 중복 방지
      likeBtn.classList.add('is-liked');
      cntEl && (cntEl.textContent = String(++cur));
      const p = POINTS.find((it) => String(it.id) === String(id));
      if (p) {
        p.likedByMe = true;
        p.likes = cur;
      }

      try {
        const resp = await api(ENDPOINTS.reactionsLike(id), { method: 'POST' });
        if (typeof resp === 'string' && /이미/.test(resp)) {
          likeBtn.classList.remove('is-liked');
          cur = Math.max(0, cur - 1);
          if (cntEl) cntEl.textContent = String(cur);
          if (p) {
            p.likes = cur;
            p.likedByMe = false;
          } // ← 추가
          return;
        }
        window._likeBC?.postMessage({ type: 'like-change', id, delta: +1 });
      } catch (err) {
        likeBtn.classList.remove('is-liked');
        cur = Math.max(0, cur - 1);
        cntEl && (cntEl.textContent = String(cur));
        if (p) {
          p.likedByMe = false;
          p.likes = cur;
        }
        alert('공감 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
      return;
    }

    // 카드 클릭 → 해당 핀을 원배경 고정 + 지도 포커스
    const card = e.target.closest('.cp-card');
    if (!card) return;

    const type = card.dataset.type === 'pos' ? 'pos' : 'neg';
    const lat = parseFloat(card.dataset.lat);
    const lng = parseFloat(card.dataset.lng);

    panelListEl
      .querySelectorAll('.cp-card.is-selected')
      ?.forEach((c) => c.classList.remove('is-selected'));
    card.classList.add('is-selected');

    focusByCard(type, lat, lng);
  });

  function shiftByPixels(lat, lng, dx, dy) {
    const proj = map.getProjection();
    const p = proj.containerPointFromCoords(new kakao.maps.LatLng(lat, lng));
    const p2 = new kakao.maps.Point(p.x + dx, p.y + dy);
    return proj.coordsFromContainerPoint(p2);
  }

  function focusByCard(type, lat, lng) {
    const target = new kakao.maps.LatLng(lat, lng);

    const needZoom = map.getLevel() >= CLUSTER_LEVEL_THRESHOLD;
    if (map.getLevel() !== 4) map.setLevel(4);
    map.setCenter(target);

    const okNow = highlightMoodPinByLatLng(lat, lng, type, {
      sticky: true,
      tries: 6,
      delay: 100,
    });
    if (okNow) return;

    const once = () => {
      highlightMoodPinByLatLng(lat, lng, type, {
        sticky: true,
        tries: 24,
        delay: 80,
      });
    };
    window.addEventListener('moodpins-rendered', once, { once: true });

    if (needZoom) {
      const onIdle = () => {
        kakao.maps.event.removeListener(map, 'idle', onIdle);
      };
      kakao.maps.event.addListener(map, 'idle', onIdle);
    }
  }

  async function renderClustersOrPins(forceCluster = false) {
    const lv = map.getLevel();

    if (forceCluster || lv >= CLUSTER_LEVEL_THRESHOLD) {
      // === 줌아웃 클러스터 사용 ===
      clearClusters();
      clearMoodPins();

      await fetchClustersInView();
      SV_CLUSTERS.forEach((c) => {
        const size = bubbleSizeByCount(c.count);
        const pos = new kakao.maps.LatLng(c.lat, c.lng);

        const ov = makeClusterOverlay(
          { count: c.count },
          c.type,
          pos,
          size,
          3000,
          () => {
            // ✅ 패널은 열지 않는다. 확대만!
            map.setCenter(pos);
            map.setLevel(Math.max(4, CLUSTER_LEVEL_THRESHOLD - 1));
            // idle 시 자동으로 pins가 렌더됨(renderClustersOrPins가 알아서 호출)
          }
        );

        ov.setMap(map);
        _clusterOverlays.push(ov);
      });
    } else {
      // === 줌인: 개별 핀 ===
      clearClusters();
      await fetchPinsInView();
      renderMoodPins(POINTS);
    }
  }

  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  );
  map.relayout();

  let _bootDone = false;
  const bootOnce = () => {
    if (_bootDone) return;
    _bootDone = true;
    map.relayout();
    renderClustersOrPins(true);
  };

  kakao.maps.event.addListener(map, 'tilesloaded', bootOnce);
  kakao.maps.event.addListener(map, 'idle', bootOnce);

  setTimeout(() => {
    if (!_bootDone) bootOnce();
  }, 0);

  kakao.maps.event.addListener(map, 'idle', () => {
    renderClustersOrPins();
    checkStickyAutoClear();
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
  wrap.replaceChildren(listBtn);
  if (myposBtn) wrap.appendChild(myposBtn);

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

  const STICKY_MOVE_CLEAR_M = 1000; // 1000m 이상 이동 시 해제
  const STICKY_ZOOMOUT_CLEAR_LEVEL = CLUSTER_LEVEL_THRESHOLD; // 너무 줌아웃하면 해제

  function getLatLngFromKey(key) {
    if (!key) return null;
    const [t, slat, slng] = key.split('|');
    const lat = parseFloat(slat),
      lng = parseFloat(slng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return new kakao.maps.LatLng(lat, lng);
    }
    return null;
  }

  function checkStickyAutoClear() {
    if (!_stickyKey) return;

    // 줌아웃 과다
    if (map.getLevel() >= STICKY_ZOOMOUT_CLEAR_LEVEL) {
      clearStickyMoodPin();
      return;
    }

    // 중심이 고정 핀에서 1000m 이상
    const target = getLatLngFromKey(_stickyKey);
    if (target) {
      const c = map.getCenter();
      const dist = distanceMeters(
        target.getLat(),
        target.getLng(),
        c.getLat(),
        c.getLng()
      );
      if (dist >= STICKY_MOVE_CLEAR_M) {
        clearStickyMoodPin();
      }
    }
  }

  kakao.maps.event.addListener(map, 'zoom_changed', checkStickyAutoClear);

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

    async function runSearch(q, mySeq) {
      const serverItems = await (async () => {
        try {
          const rows = await api(ENDPOINTS.searchKeyword(q));
          return Array.isArray(rows)
            ? rows.map((r) => ({
                id: r.id ?? null, // 서버 PK(있을 때만)
                kakaoPlaceId: r.placeId || r.kakaoPlaceId || null,
                name: r.name,
                addr: r.address || '',
                lat: +(r.latitude ?? r.lat),
                lng: +(r.longitude ?? r.lng),
              }))
            : [];
        } catch (e) {
          console.warn('[search?keyword] fail', e);
          return [];
        }
      })();

      if (mySeq !== querySeq) return;
      if (serverItems.length) {
        render(serverItems);
        return;
      }
      const center =
        map && typeof map.getCenter === 'function'
          ? map.getCenter()
          : DEFAULT_CENTER;
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
                        kakaoPlaceId: d.id,
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
                kakaoPlaceId: d.id,
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
    <li data-sid="${it.id ?? ''}" data-kid="${it.kakaoPlaceId ?? ''}"
    data-lat="${it.lat}" data-lng="${it.lng}">
      <div class="name">${it.name}</div>
      ${it.addr ? `<div class="addr">${it.addr}</div>` : ''}
    </li>`
        )
        .join('');
      list.style.display = 'block';
      hint.style.display = 'none';
    }

    function pickFromList(li) {
      const lat = +li.dataset.lat;
      const lng = +li.dataset.lng;
      const sid = li.dataset.sid ? Number(li.dataset.sid) : undefined; // 서버 PK(있을 때만)
      const kid = li.dataset.kid || undefined;
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
      _selectedPlace = { id: sid, kakaoPlaceId: kid, name, addr, lat, lng };
      psName.textContent = name;
      psAddr.textContent = addr || '주소 정보 없음';
      sheet.hidden = false;

      if (pickBtn) pickBtn.disabled = !_selectedPlace.kakaoPlaceId;

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

    pickBtn?.addEventListener('click', async () => {
      if (!_selectedPlace) return;
      try {
        pickBtn.disabled = true;
        pickBtn.textContent = '저장 중...';
        const ok = await recordSelectedPlace(_selectedPlace);
        if (!ok)
          alert(
            '서버에 선택 결과를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
          );
      } finally {
        pickBtn.disabled = false;
        pickBtn.textContent = '선택하기';
      }

      try {
        if (window.opener && !window.opener.closed) {
          // onPlaceSelected가 있으면 그거 우선, 없으면 setLocation만이라도
          const send =
            window.opener.onPlaceSelected || window.opener.setLocation;
          if (typeof send === 'function') {
            // address, lat, lng, kakaoPlaceId 모두 전달
            send(
              _selectedPlace.addr,
              _selectedPlace.lat,
              _selectedPlace.lng,
              _selectedPlace.kakaoPlaceId
            );
          }
          window.close(); // 팝업이라면 닫기
        }
      } catch (_) {}

      const sheet = document.getElementById('placeSheet');
      const inputFull = document.getElementById('searchFull');
      const smallInput = document.getElementById('search-input');
      const clearBtn = document.getElementById('searchClear');
      const list = document.getElementById('searchList');
      const hint = document.getElementById('searchHint');
      const app = document.querySelector('.app');

      sheet.hidden = true;
      app.classList.remove('pick-mode');

      if (window._selMarker) {
        try {
          window._selMarker.setMap(null);
        } catch (_) {}
        window._selMarker = null;
      }
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
