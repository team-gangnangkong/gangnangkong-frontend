document.addEventListener('DOMContentLoaded', () => {
  // ---------- 초기화면 ----------
  const VIEW = {};
  VIEW.app = document.querySelector('.app');
  VIEW.header = document.querySelector('.header');
  VIEW.list = document.querySelector('.list');
  if (!VIEW.app || !VIEW.header || !VIEW.list) return;

  // ---------- 민원 가짜 글(데미데이터) ----------
  (function initCardIds() {
    document.querySelectorAll('.list .card').forEach((c, i) => {
      if (!c.dataset.wid) c.dataset.wid = String(i);
    });
  })();

  // ---------- 정렬(최근순/오래된순) ----------
  const sortBtn = document.querySelector('.sort-btn');
  const cardsOriginal = Array.from(VIEW.list.querySelectorAll('.card'));
  let isLatestFirst = true;

  function sortCards() {
    const cards = Array.from(VIEW.list.querySelectorAll('.card')); // 현재 DOM 기준
    const sorted = cards.sort((a, b) => {
      const aDate = new Date(a.querySelector('.card-date').textContent.trim());
      const bDate = new Date(b.querySelector('.card-date').textContent.trim());
      return isLatestFirst ? bDate - aDate : aDate - bDate;
    });
    VIEW.list.innerHTML = '';
    sorted.forEach((c) => VIEW.list.appendChild(c));
  }

  if (sortBtn) {
    sortBtn.textContent = '최신순';
    sortBtn.addEventListener('click', () => {
      isLatestFirst = !isLatestFirst;
      sortBtn.textContent = isLatestFirst ? '최신순' : '오래된순';
      sortCards();
    });
  }

  // ---------- 컨테이너 개수 카운트 ----------
  function updateCounts() {
    const p = VIEW.list.querySelectorAll('.badge-pending').length;
    const g = VIEW.list.querySelectorAll('.badge-progress').length;
    const d = VIEW.list.querySelectorAll('.badge-done').length;
    document.querySelectorAll('.tab').forEach((tab) => {
      const count = tab.querySelector('.count');
      if (!count) return;
      if (tab.textContent.includes('미해결')) count.textContent = p;
      else if (tab.textContent.includes('해결중')) count.textContent = g;
      else if (tab.textContent.includes('해결완료')) count.textContent = d;
    });
  }

  function applyTabFilter() {
    const activeTab = document.querySelector('.tab.is-active');
    const want = activeTab?.textContent.includes('미해결')
      ? 'pending'
      : activeTab?.textContent.includes('해결중')
      ? 'progress'
      : activeTab?.textContent.includes('해결완료')
      ? 'done'
      : 'all';

    VIEW.list.querySelectorAll('.card').forEach((card) => {
      const badge = card.querySelector('.badge');
      const cls = badge?.classList;
      const status = cls?.contains('badge-pending')
        ? 'pending'
        : cls?.contains('badge-progress')
        ? 'progress'
        : cls?.contains('badge-done')
        ? 'done'
        : 'pending';
      card.style.display = want === 'all' || want === status ? '' : 'none';
    });
  }

  document.querySelector('.tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document
      .querySelectorAll('.tab')
      .forEach((t) => t.classList.remove('is-active'));
    btn.classList.add('is-active');
    applyTabFilter();
  });

  updateCounts();
  applyTabFilter();

  // ---------- 관리하기 페이지 css----------
  (function injectStyles() {
    const id = 'detail-view-style';
    if (document.getElementById(id)) return;
    const css = `
      .detail-view{padding:55px 16px 16px; display:none;}
      .meta{display:flex; align-items:center; gap:8px; color:var(--muted); font-size:14px; margin:4px 0 12px;}
      .meta-dot{width:18px; height:18px; border-radius:50%; background:#9aa3b2;}
      .title-row{display:flex; align-items:center; justify-content:space-between; gap:12px;}
      .detail-title{font-weight:700; font-size:19px; margin:8px 0 0; flex:1; min-width:0;}
      .status-dd{position:relative; flex-shrink:0;}
      .status-trigger{
        background:none; border:0; color:var(--muted); font-weight:700; font-size:14px; cursor:pointer;
        display:inline-flex; align-items:center; gap:6px; padding:6px 0;
      }
      .status-trigger .caret{display:inline-block; transform: translateY(-1px);}
.status-trigger.is-set{ color: #F87171; }
      .status-menu{
        position:absolute; right:0; top:calc(100% + 6px); list-style:none; margin:0; padding:6px 0;
        background:#fff; border:1px solid #eef0f5; border-radius:12px; box-shadow:0 8px 24px rgba(16,24,40,.06);
        display:none; min-width:120px; z-index:1000;
      }
      .status-menu.open{ display:block; }
      .status-item{ padding:10px 14px; font-weight:700; font-size:15px; color:#374151; cursor:pointer; }
      .status-item:hover{ background:#f7f8fc; }
      .detail-photo{margin-top:14px; width:100%;border-radius:12px;height:220px;aspect-ratio:auto;object-fit:cover; aspect-ratio:16/9; object-fit:cover;}
      .detail-loc{display:inline-flex; align-items:center; gap:5px; margin-top:8px; padding:8px 12px; border-radius:999px; background:#eef0f5; color:#6b7280; font-size:12.6px; font-weight:500;}
      .detail-loc .loc-icon{display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; color:#9aa3b2;}
      .detail-loc svg{width:16px; height:16px;}
      .detail-body{margin:10px 0 5px; font-size:15px; line-height:1.6; color:var(--text);}
      .detail-stats{margin-top:18px; display:flex; justify-content:flex-end; gap:18px; color: var(--accent);}
      .stat{display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:14px;}
      .stat svg{width:18px; height:18px; display:block;}
      .detail-divider{width:100%; height:7px; background:#eef0f5; margin:29px 0;}
      .memo-wrap{margin-top:5px;}
      .memo-title{font-weight:700; margin-bottom:7px;}
      .memo-textarea{
        width:100%; min-height:120px; border:0; border-radius:12px;
        padding:10px; font-size:15px; line-height:1.6;font-family:"맑은 고딕";
        background:#f3f4f6; color:var(--text);
        box-shadow: inset 0 0 0 1px #eef0f5;
      }
      .memo-textarea::placeholder{ color:gray; font-size:13px;font-family:"맑은 고딕";}
      .memo-save-wrap{display:flex; justify-content:center; margin-top:12px;}
      .memo-save-btn{
        border:0; padding:8px 38px; border-radius:11px;
        background:#ffe9eb; color:var(--accent);
        font-weight:600; font-size:15px; cursor:pointer;
      }
      .memo-save-btn:active{ transform: translateY(1px); }
    `;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ---------- 더미 데이터 ----------
  const AUTHORS = [
    '최가을',
    '유지민',
    '김민정',
    '조진세',
    '서민정',
    '엄지윤',
    '안우진',
    '이은우',
    '이재인',
  ];
  const pickAuthor = () => AUTHORS[Math.floor(Math.random() * AUTHORS.length)];

  const IMAGE_MAP = {
    '모란역 횡단보도 고쳐주세요': './image/crosswalk.jpg',
    '길거리에 쓰레기가 너무 많아요': './image/roadtrash.jpg',
    '휠체어 타고 다니기가 너무 제한적이에요': './image/wheelchair.png',
    '놀이터에 그네 망가졌어요 고쳐주세요': './image/playground.jpg',
    '위례 신도시 쓰레기 무단투기 심해요': './image/trash.jpg',
    '공중화장실이 너무 낡았어요': './image/toilet.jpg',
    '망가진 가로등 수리 좀 해주세요': './image/dark.jpg',
    '하수구 막힘': './image/drain.jpg',
    '길거리에 포트홀 무서워요': './image/hole.jpg',
  };

  const DETAIL_TEXT = {
    '모란역 횡단보도 고쳐주세요':
      '모란역 3번 출구 앞 횡단보도에 초록불이랑 빨간불이 동시에 들어와요. 제대로 불이 나오기도 하다가 사진처럼 동시에 켜저요. 횡단보도 건너는 데에 혼란을 줘서 고쳐주셨으면 좋겠어요.',
    '길거리에 쓰레기가 너무 많아요':
      '골목길 지나가고 있었는데 사람들이 그냥 버리고 간 커피 음료컵이 많이 쌓여있어서 보기 안 좋았어요. 쓰레기통을 두던가 저렇게 버리지 못하도록 했으면 좋겠어요',
    '휠체어 타고 다니기가 너무 제한적이에요':
      '식당 입구에 들어가려고 하는데 턱이 있어서 들어갈 수가 없고 문도 좁아서 오르막이었어도 휠체어가 들어가지 못하는 경우가 많습니다. 사진과 같은 경우 이외에도 휠체어를 타고서는 갈 수 없는 곳이 많아 답답합니다',
    '놀이터에 그네 망가졌어요 고쳐주세요':
      '아이들이 많이 놀고 좋아하는 그네의 줄이 하나가 끊어졌네요. 저기에 위험하게 메달리는 아이들도 있고 아이들이 안전하게 놀 수 있도록 얼른 고쳐주시면 좋겠어요',
    '위례 신도시 쓰레기 무단투기 심해요':
      '쓰레기 버리지 말라고 경고문이 붙어져있는데도 무단투기 된 쓰레기가 너무 많습니다. 악취도 심하고 위생이 걱정됩니다. 적절히 조치를 취해주세요',
    '공중화장실이 너무 낡았어요':
      '역 근처 공중화장실인데 너무 낡았고 냄새도 나요... 급하거나 근처에 갈 화장실이 없을 때 가고싶어도 위생 때문에 참고 안 가게 돼요 쾌적하게 이용할 수 있도록 해주세요',
    '망가진 가로등 수리 좀 해주세요':
      '골목 사이사이에 꺼진 가로등이 너무 많아서 늦은 시간에 지나가기 무서워요 골목으로 가는 게 지름길이라 저기로 안 가면 한참 돌아가야하는데 망가진 거라면 얼른 수리해주셨으면 좋갰어요',
    '하수구 막힘':
      '하수구에 낙엽이랑 쓰레기가 잔뜩 끼어서 비 올 때마다 막히고 주변에 물이 고여요 조치를 취하지 않으면 나중에는 홍수나 물난리가 생길 수도 있을 것 같아요',
    '길거리에 포트홀 무서워요':
      '포트홀 때문에 도로에서 운전하기가 무서워요 바퀴 빠지면 사고가 날 수도 있고 이거 피하려고 차선 바꾸다가 다른 차랑 사고가 날 뻔한 적도 있어요 보수공사 신속하게 진행해주시면 좋겠어요',
  };

  const normalizeTitle = (t = '') =>
    t.replace(/\s+/g, '').replace(/쓰래기/g, '쓰레기');
  const shouldForceSujung = (title = '') => {
    const n = normalizeTitle(title);
    return (
      n === '모란역횡단보도고쳐주세요' ||
      n.includes('위례신도시쓰레기무단투기심해요')
    );
  };
  function resolveDistrict(title) {
    if (shouldForceSujung(title)) return '수정구';
    const pool = ['수정구', '중원구', '분당구'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function resolveImage(title = '') {
    const exact = IMAGE_MAP[title.trim()];
    if (exact) return exact;
    const n = normalizeTitle(title);
    if (n.includes('위례신도시쓰레기무단투기심해요')) return 'trash.jpg';
    return 'placeholder.jpg';
  }

  // ---------- 좋아요/댓글 ----------
  const COUNTS_KEY = 'adminCounts';
  const loadCounts = () => {
    try {
      return JSON.parse(localStorage.getItem(COUNTS_KEY) || '{}');
    } catch {
      return {};
    }
  };
  const saveCounts = (map) =>
    localStorage.setItem(COUNTS_KEY, JSON.stringify(map));

  (function ensureCountsForTitles() {
    const map = loadCounts();
    Array.from(document.querySelectorAll('.card-title'))
      .map((el) => el.textContent.trim())
      .forEach((t) => {
        if (!(t in map))
          map[t] = { likes: Math.floor(Math.random() * 31) + 5, comments: 0 };
      });
    saveCounts(map);
  })();
  const getCounts = (title) => loadCounts()[title] || { likes: 5, comments: 0 };

  // ---------- 메모 ----------
  let MEMO_STORE = {};
  const loadMemos = () => MEMO_STORE;
  const saveMemos = (obj) => {
    MEMO_STORE = { ...obj };
  };

  // ---------- 상태 저장 ----------
  const STATUS_KEY = 'adminStatusById';
  (function migrateStatusIfNeeded() {
    try {
      const legacy = JSON.parse(
        localStorage.getItem('adminStatusByTitle') || '{}'
      );
      const existsNew = localStorage.getItem(STATUS_KEY);
      if (!existsNew && Object.keys(legacy).length) {
        const byId = {};
        document.querySelectorAll('.list .card').forEach((c) => {
          const id = c.dataset.wid;
          const title =
            c.querySelector('.card-title')?.textContent.trim() || '';
          if (legacy[title]) byId[id] = legacy[title];
        });
        localStorage.setItem(STATUS_KEY, JSON.stringify(byId));
        localStorage.removeItem('adminStatusByTitle');
      }
    } catch {}
  })();
  const loadStatusMap = () => {
    try {
      return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}');
    } catch {
      return {};
    }
  };
  const saveStatusMap = (obj) =>
    localStorage.setItem(STATUS_KEY, JSON.stringify(obj));

  function createProgressCard({ id, title, date }) {
    const memos = loadMemos();
    const memoContent = memos[title] || '';
    const imageUrl = resolveImage(title);
    const district = resolveDistrict(title);

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.wid = id;

    card.innerHTML = `
    <div class="card-image" style="background-image: url('${imageUrl}')">
      <span class="district-label">${district}</span>
    </div>
    <div class="card-body" style="padding:14px 14px 10px;">
      <div class="card-title-row">
        <h3 class="card-title">${title}</h3>
        <span class="badge badge-progress in-title">해결중</span>
      </div>
      <div class="card-meta">
        <span class="card-memo">${memoContent || ''}</span>
        <span class="dot">•</span>
        <time class="card-date">${date}</time>
      </div>
    </div>
  `;
    return card;
  }

  function createSimpleCard({ id, title, date, status = '미해결' }) {
    if (status === '미해결') {
      const memos = loadMemos();
      const memoContent = memos[title] || '';
      const imageUrl = resolveImage(title);
      const district = resolveDistrict(title);

      const card = document.createElement('article');
      card.className = 'card';
      card.dataset.wid = id;

      card.innerHTML = `
  <div class="card-image" style="background-image: url('${imageUrl}')">
    <span class="district-label">${district}</span>
  </div>
  <div class="card-body" style="padding:14px 14px 10px;">
    <div class="card-title-row">
      <h3 class="card-title">${title}</h3>
      <span class="badge badge-pending in-title"style="font-weight:600">미해결</span>
    </div>
    <div class="card-meta">
      <span class="card-memo">${memoContent || ''}</span>
      <span class="dot">•</span>
      <time class="card-date">${date}</time>
    </div>
  </div>
`;

      return card;
    }

    if (status === '해결완료') {
      const memoContent = (loadMemos()[title] || '').trim();
      const hasMemo = !!memoContent;

      const card = document.createElement('article');
      card.className = 'card is-done';
      card.dataset.wid = id;
      card.innerHTML = `
    <div class="card-body" style="padding:16px 14px 18px;">
      <div class="card-title-row">
        <h3 class="card-title">${title}</h3>
        <span class="badge badge-done in-title">해결완료</span>
      </div>
      <div class="card-meta">
        ${
          hasMemo
            ? `<span class="card-memo">${memoContent}</span><span class="dot">•</span>`
            : ''
        }
        <time class="card-date">${date}</time>
      </div>
    </div>`;
      return card;
    }
    const badgeClass =
      status === '해결완료'
        ? 'badge-done'
        : status === '해결중'
        ? 'badge-progress'
        : 'badge-pending';

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.wid = id;
    card.innerHTML = `
    <h3 class="card-title">${title}</h3>
    <time class="card-date">${date}</time>
    <span class="badge ${badgeClass}">${status}</span>
  `;
    return card;
  }

  function seedExtraCards() {
    const items = [
      {
        title: '공중화장실이 너무 낡았어요',
        date: '2025.07.21',
        status: '해결완료',
      },
      {
        title: '망가진 가로등 수리 좀 해주세요',
        date: '2025.06.18',
        status: '해결중',
      },
      { title: '하수구 막힘', date: '2025.08.10', status: '해결중' },
      {
        title: '길거리에 포트홀 무서워요',
        date: '2025.05.26',
        status: '해결중',
      },
    ];

    const statusMap = loadStatusMap();
    const counts = loadCounts();
    const memos = loadMemos();

    const LIKE_PRESET = {
      '공중화장실이 너무 낡았어요': 18,
      '망가진 가로등 수리 좀 해주세요': 27,
      '하수구 막힘': 13,
      '길거리에 포트홀 무서워요': 22,
    };

    items.forEach((item, idx) => {
      const id = String(VIEW.list.querySelectorAll('.card').length + idx);

      // 카드 생성
      const make =
        item.status === '해결중'
          ? createProgressCard
          : (args) => createSimpleCard({ ...args, status: '해결완료' });

      if (MEMO_PRESET[item.title] && !memos[item.title]) {
        memos[item.title] = MEMO_PRESET[item.title];
      }
      if (!counts[item.title]) {
        counts[item.title] = {
          likes: LIKE_PRESET[item.title] ?? 15,
          comments: 0,
        };
      }

      const card = make({ id, title: item.title, date: item.date });
      VIEW.list.appendChild(card);

      // 새로고침 유지
      statusMap[id] = item.status;
    });

    saveStatusMap(statusMap);
    saveCounts(counts);
    saveMemos(memos);
  }

  function upgradeInitialPendingCards() {
    Array.from(VIEW.list.querySelectorAll('.card')).forEach((c) => {
      const badge = c.querySelector('.badge');
      const isPending = badge?.classList.contains('badge-pending');
      if (!isPending) return;

      const id = c.dataset.wid;
      const title = c.querySelector('.card-title')?.textContent.trim() || '';
      const date = c.querySelector('.card-date')?.textContent.trim() || '';
      const newCard = createSimpleCard({ id, title, date, status: '미해결' });
      c.replaceWith(newCard);
    });
  }

  // ---------- 리스트 카운트 동기화 ----------
  function syncBadgeAndCounts(id, status) {
    const oldCard = document.querySelector(`.list .card[data-wid="${id}"]`);
    if (!oldCard) return;

    const title =
      oldCard.querySelector('.card-title')?.textContent.trim() || '';
    const date = oldCard.querySelector('.card-date')?.textContent.trim() || '';

    if (status === '해결중') {
      const newCard = createProgressCard({ id, title, date });
      oldCard.replaceWith(newCard);
    } else if (status === '해결완료') {
      const newCard = createSimpleCard({ id, title, date, status: '해결완료' });
      oldCard.replaceWith(newCard);
    } else {
      const newCard = createSimpleCard({ id, title, date, status: '미해결' });
      oldCard.replaceWith(newCard);
    }

    const map = loadStatusMap();
    map[id] = status;
    saveStatusMap(map);

    updateCounts();
    applyTabFilter();
  }

  // ---------- 초기 프리셋 ----------
  const PRESET_PROGRESS_TITLES = new Set([
    '망가진 가로등 수리 좀 해주세요',
    '하수구 막힘',
    '길거리에 포트홀 무서워요',
  ]);
  const MEMO_PRESET = {
    '공중화장실이 너무 낡았어요': '2025년 3월 공사 완료',
    '망가진 가로등 수리 좀 해주세요': '낙후 가로등 수리 예정',
    '하수구 막힘': '배관 고압세척 진행 예정',
    '길거리에 포트홀 무서워요': '보수 공사 진행 예정',
  };

  const PRESET_DONE_TITLES = new Set(['공중화장실이 너무 낡았어요']);

  function applyInitialStatusPresets() {
    const saved = loadStatusMap();

    document.querySelectorAll('.list .card').forEach((c) => {
      const id = c.dataset.wid;
      if (saved[id]) return;

      const title = c.querySelector('.card-title')?.textContent.trim() || '';
      const date = c.querySelector('.card-date')?.textContent.trim() || '';

      if (PRESET_DONE_TITLES.has(title)) {
        const newCard = createSimpleCard({
          id,
          title,
          date,
          status: '해결완료',
        });
        c.replaceWith(newCard);
        saved[id] = '해결완료';
      } else if (PRESET_PROGRESS_TITLES.has(title)) {
        const newCard = createProgressCard({ id, title, date });
        c.replaceWith(newCard);
        saved[id] = '해결중';
      }
    });

    saveStatusMap(saved);
  }

  // ---------- 상세 뷰 ----------
  function withCleanup(fn) {
    (VIEW._cleanups ||= []).push(fn);
  }
  VIEW.detail = document.createElement('section');
  VIEW.detail.className = 'detail-view';
  VIEW.detail.innerHTML = `
    <div class="detail-head">
      <button class="detail-back" type="button" aria-label="뒤로가기">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M15 6 L9 12 L15 18" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>
  </svg>
</button>
      <div style="font-weight:650; font-size:1.1rem;">관리하기</div>
    </div>
    <div class="meta">
      <span class="meta-dot"></span>
      <span class="detail-author">작성자</span>
      <span class="detail-date">0000.00.00</span>
    </div>
    <div class="title-row">
      <h2 class="detail-title"></h2>
      <div class="status-dd">
        <button class="status-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
          해결단계 <span class="caret">▾</span>
        </button>
        <ul class="status-menu" role="listbox" tabindex="-1">
          <li class="status-item" data-value="미해결">미해결</li>
          <li class="status-item" data-value="해결중">해결중</li>
          <li class="status-item" data-value="해결완료">해결완료</li>
        </ul>
      </div>
    </div>
    <img class="detail-photo" alt="선택한 민원 이미지"/>
    <div class="detail-loc">
      <span class="loc-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5z"/>
        </svg>
      </span>
      <span class="detail-loc-name"></span>
    </div>
    <p class="detail-body"></p>
<div class="detail-stats">
  <span class="stat stat-like" title="좋아요">
    <!-- 엄지 아이콘 (outline) -->
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11v10H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z"/>
      <path d="M9 11l4.2-7.2a2 2 0 0 1 3.7.9v5.3h3a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1.5H9V11Z"/>
    </svg>
    <span class="like-count">0</span>
  </span>

  <span class="stat stat-comment" title="댓글">
    <!-- 말풍선 아이콘 (outline, 가로줄 2개) -->
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3c5 0 9 3.7 9 8.2S17 19.5 12 19.5c-1.4 0-2.8-.3-4.1-.8L4 20l.8-3.1C4 15.4 3 13.9 3 11.2 3 6.7 7 3 12 3Z"/>
      <line x1="7.5" y1="10" x2="16.5" y2="10"/>
      <line x1="7.5" y1="13" x2="14.5" y2="13"/>
    </svg>
    <span class="comment-count">0</span>
  </span>
</div>

    <div class="detail-divider"></div>
    <div class="memo-wrap">
      <div class="memo-title">메모</div>
      <textarea class="memo-textarea" placeholder="메모를 입력해 주세요"></textarea>
      <div class="memo-save-wrap">
        <button class="memo-save-btn" type="button">저장하기</button>
      </div>
    </div>
  `;
  VIEW.app.appendChild(VIEW.detail);

  function showDetail({ id, title, date }) {
    let selectedStatus = null;
    // 상단 정보
    VIEW.detail.querySelector('.detail-author').textContent = pickAuthor();
    VIEW.detail.querySelector('.detail-date').textContent = date || '';
    VIEW.detail.querySelector('.detail-title').textContent = title || '';
    VIEW.detail.querySelector('.detail-body').textContent =
      DETAIL_TEXT[title] || '';

    // 이미지/동네
    const imgEl = VIEW.detail.querySelector('.detail-photo');
    imgEl.src = resolveImage(title);
    imgEl.alt = title || '민원 이미지';
    VIEW.detail.querySelector('.detail-loc-name').textContent =
      resolveDistrict(title);

    // 카운트
    const { likes, comments } = getCounts(title);
    VIEW.detail.querySelector('.like-count').textContent = likes;
    VIEW.detail.querySelector('.comment-count').textContent = comments;

    // 메모
    const memoEl = VIEW.detail.querySelector('.memo-textarea');
    const memos = loadMemos();
    memoEl.value = memos[title] || '';
    const saveBtn = VIEW.detail.querySelector('.memo-save-btn');

    saveBtn.onclick = () => {
      const obj = loadMemos();
      obj[title] = memoEl.value.trim();
      saveMemos(obj);

      if (selectedStatus) {
        syncBadgeAndCounts(id, selectedStatus);

        const tabs = document.querySelectorAll('.tab');
        tabs.forEach((t) => t.classList.remove('is-active'));
        const targetTab = Array.from(tabs).find((t) =>
          t.textContent.includes(selectedStatus)
        );
        targetTab?.classList.add('is-active');
        applyTabFilter();
        VIEW.list.scrollTop = 0;
      }

      backToList();
    };

    saveBtn.classList.remove('active');
    saveBtn.classList.add('disabled');

    // 해결단계 드롭다운
    const trigger = VIEW.detail.querySelector('.status-trigger');
    const menu = VIEW.detail.querySelector('.status-menu');
    const setTrigger = ({
      label = '해결단계',
      caret = '▾',
      isSet = false,
    } = {}) => {
      trigger.innerHTML = `${label} <span class="caret">${caret}</span>`;
      trigger.classList.toggle('is-set', isSet);
    };

    setTrigger();

    const onTrigger = (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      setTrigger({ caret: open ? '▴' : '▾' });
    };

    trigger.addEventListener('click', onTrigger);
    withCleanup(() => trigger.removeEventListener('click', onTrigger));

    const onMenuClick = (e) => {
      const li = e.target.closest('.status-item');
      if (!li) return;

      const value = li.dataset.value;
      selectedStatus = value;

      // 드롭다운 트리거에 라벨 반영 + 강조색
      setTrigger({ label: value, caret: '▾', isSet: true });

      // 메뉴 닫기
      menu.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');

      // 저장 버튼 활성화
      saveBtn.classList.remove('disabled');
      saveBtn.classList.add('active');
    };

    menu.addEventListener('click', onMenuClick);
    withCleanup(() => menu.removeEventListener('click', onMenuClick));

    const onDocClick = (e) => {
      if (!menu.classList.contains('open')) return;
      if (!e.target.closest('.status-dd')) {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        setTrigger({ caret: '▾' });
      }
    };
    document.addEventListener('click', onDocClick);
    withCleanup(() => document.removeEventListener('click', onDocClick));

    const onEsc = (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        setTrigger({ caret: '▾' });
      }
    };
    document.addEventListener('keydown', onEsc);
    withCleanup(() => document.removeEventListener('keydown', onEsc));

    // 화면 전환
    VIEW.header.style.display = 'none';
    VIEW.list.style.display = 'none';
    VIEW.detail.style.display = 'block';
  }

  function backToList() {
    (VIEW._cleanups || []).forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    VIEW._cleanups = [];
    VIEW.detail.style.display = 'none';
    VIEW.header.style.display = '';
    VIEW.list.style.display = '';
  }

  VIEW.detail.addEventListener('click', (e) => {
    const backBtn = e.target.closest('.detail-back');
    if (backBtn) {
      backToList();
    }
  });

  // 카드 클릭 → 상세 열기
  VIEW.list.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.wid;
    const title = card.querySelector('.card-title')?.textContent.trim() || '';
    const date = card.querySelector('.card-date')?.textContent.trim() || '';
    showDetail({ id, title, date });
  });
  seedExtraCards();
  applyInitialStatusPresets();
  upgradeInitialPendingCards();
  sortCards();
  updateCounts();
  applyTabFilter();
});
