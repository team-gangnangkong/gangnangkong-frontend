// community.js 전체 코드 정리본

// --- 뒤로가기 버튼 기능 ---
document.querySelector('.header').addEventListener('click', () => {
  window.history.back();
});

// --- 글쓰기 버튼 클릭 시 write.html로 이동 ---
document.getElementById('writeBtn').addEventListener('click', () => {
  window.location.href = 'write.html';
});

// --- 토큰 쿠키 가져오기 ---
function getAccessTokenFromCookie() {
  const cookies = document.cookie.split('; ');
  for (const c of cookies) {
    if (c.startsWith('ACCESS-TOKEN=')) {
      return c.split('=')[1];
    }
  }
  return null;
}

// --- 더미 데이터 ---
const dummyFeeds = [
  {
    id: '1',
    title: '모란역 쓰레기 문제',
    content: '쓰레기가 쌓여서 냄새가 심해요',
    type: 'MINWON',
    address: '성남시 중원구 성남대로',
    lat: 37.4321,
    lng: 127.1299,
    kakaoPlaceId: '1234567890',
    likes: 5,
    imageUrls: ['./image/crosswalk.jpg'],
  },
  {
    id: '2',
    title: '청년 문화 공연 안내',
    content: '이번 주말에 청년밴드 공연이 있어요!',
    type: 'MUNHWA',
    address: '성남시 수정구 신흥동 문화의 거리',
    lat: 37.4456,
    lng: 127.1567,
    kakaoPlaceId: '2345678901',
    likes: 10,
    imageUrls: ['./image/dark.jpg'],
  },
  {
    id: '3',
    title: '도로 파손 신고',
    content: '보행로가 꺼져서 위험합니다.',
    type: 'MINWON',
    address: '성남시 분당구 판교로',
    lat: 37.3957,
    lng: 127.1103,
    kakaoPlaceId: '3456789012',
    likes: 3,
    imageUrls: ['./image/drain.jpg'],
  },
];

// --- 카드 리스트 컨테이너 ---
const feedListContainer = document.querySelector('.card-list');

// --- 로컬스토리지 키 ---
const LOCAL_STORAGE_COMMENT_KEY = 'community_comments';
const LOCAL_STORAGE_LIKES_KEY = 'community_likes';

// --- 로컬스토리지 유틸 함수 ---
function loadFromLocalStorage(key, feedId) {
  const saved = localStorage.getItem(key);
  if (!saved) return [];
  try {
    const allData = JSON.parse(saved);
    return feedId ? allData[feedId] || [] : allData;
  } catch {
    return [];
  }
}

function saveToLocalStorage(key, feedId, data) {
  const saved = localStorage.getItem(key);
  let allData = {};
  if (saved) {
    try {
      allData = JSON.parse(saved);
    } catch {}
  }
  allData[feedId] = data;
  localStorage.setItem(key, JSON.stringify(allData));
}

// --- 댓글 개수 UI 업데이트 ---
function updateCommentCountUI(count) {
  document
    .querySelectorAll('.card-comment span')
    .forEach((el) => (el.textContent = count));
  const commentTitleSpan = document.querySelector('.comment-title span');
  if (commentTitleSpan) commentTitleSpan.textContent = count;
}

// --- 카드 별 댓글 개수 업데이트 ---
function updateCardsCommentCountWithLocalStorage(feeds) {
  feeds.forEach((feed) => {
    const localComments = loadFromLocalStorage(
      LOCAL_STORAGE_COMMENT_KEY,
      feed.id
    );
    const localCount = localComments.length;
    const card = feedListContainer.querySelector(
      `.card[data-feed-id="${feed.id}"]`
    );
    if (card) {
      const commentCountSpan = card.querySelector('.card-comment span');
      if (commentCountSpan) commentCountSpan.textContent = localCount;
    }
  });
}

// --- 카드 리스트 렌더링 (좋아요 로컬 반영 포함) ---
function renderFeeds(feeds) {
  feedListContainer.innerHTML = '';
  if (!feeds.length) {
    feedListContainer.innerHTML = '<p>피드가 없습니다.</p>';
    return;
  }

  const likesData = loadFromLocalStorage(LOCAL_STORAGE_LIKES_KEY);

  feeds.forEach((feed) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-feed-id', feed.id);
    card.style.cursor = 'pointer';

    const imageUrl =
      feed.imageUrls && feed.imageUrls.length > 0
        ? feed.imageUrls[0]
        : './image/default.jpg';
    const localLikeInfo = likesData[feed.id];
    const likeCountToDisplay = localLikeInfo ? localLikeInfo.count : feed.likes;

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${imageUrl}" alt="피드 이미지" class="card-img" />
        <span class="card-arrow">
          <svg width="22" height="22" fill="none"><use xlink:href="#icon-arrow"></use></svg>
        </span>
      </div>
      <div class="card-content">
        <div class="card-title-row">
          <div class="card-title">${feed.title}</div>
          <div class="card-meta">
            <div class="card-like">
              <svg width="19" height="18" fill="none"><use xlink:href="#icon-like"></use></svg>
              <span>${likeCountToDisplay}</span>
            </div>
            <div class="card-comment">
             <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
  <path d="M9.49968 1.58301C13.8721 1.58301 17.4163 5.1273 17.4163 9.49967C17.4163 13.872 13.8721 17.4163 9.49968 17.4163C8.23617 17.4181 6.99075 17.1162 5.86831 16.536L2.83939 17.3807C2.6704 17.4279 2.49191 17.4293 2.32221 17.3847C2.15251 17.3402 1.9977 17.2514 1.87364 17.1273C1.74958 17.0032 1.66074 16.8484 1.61621 16.6787C1.57168 16.509 1.57306 16.3305 1.62022 16.1615L2.46572 13.135C1.88413 12.0116 1.58137 10.7647 1.58301 9.49967C1.58301 5.1273 5.12731 1.58301 9.49968 1.58301ZM9.49968 2.77051C7.715 2.77051 6.00341 3.47947 4.74144 4.74144C3.47948 6.0034 2.77051 7.71499 2.77051 9.49967C2.77051 10.6634 3.06581 11.782 3.61997 12.7748L3.73872 12.9885L2.85839 16.1425L6.01477 15.2622L6.22852 15.381C7.12657 15.8803 8.12704 16.1673 9.15321 16.22C10.1794 16.2727 11.204 16.0897 12.1485 15.685C13.093 15.2804 13.9322 14.6648 14.6019 13.8855C15.2716 13.1062 15.754 12.1839 16.012 11.1893C16.27 10.1947 16.2968 9.15422 16.0903 8.14766C15.8839 7.14109 15.4497 6.19517 14.821 5.38243C14.1923 4.56968 13.3858 3.91171 12.4634 3.45896C11.541 3.00621 10.5272 2.7707 9.49968 2.77051ZM6.92676 10.2913H10.4877C10.6381 10.2914 10.7829 10.3485 10.8928 10.4512C11.0028 10.5539 11.0696 10.6945 11.0799 10.8446C11.0901 10.9947 11.043 11.1431 10.9481 11.2598C10.8532 11.3765 10.7175 11.4528 10.5684 11.4733L10.4877 11.4788H6.92676C6.77633 11.4788 6.63152 11.4216 6.5216 11.3189C6.41167 11.2162 6.34483 11.0756 6.33458 10.9256C6.32432 10.7755 6.37142 10.6271 6.46636 10.5104C6.56129 10.3937 6.69698 10.3174 6.84601 10.2969L6.92676 10.2913ZM6.92676 7.52051H12.0766C12.2269 7.52075 12.3716 7.57804 12.4814 7.68081C12.5911 7.78357 12.6578 7.92416 12.668 8.07418C12.6781 8.22421 12.631 8.37249 12.5361 8.48911C12.4411 8.60572 12.3055 8.68197 12.1565 8.70247L12.0766 8.70801H6.92676C6.77633 8.70796 6.63152 8.65081 6.5216 8.54811C6.41167 8.44541 6.34483 8.30481 6.33458 8.15473C6.32432 8.00464 6.37142 7.85626 6.46636 7.73956C6.56129 7.62287 6.69698 7.54655 6.84601 7.52605L6.92676 7.52051Z" fill="#F87171"/>
</svg>
              <span>0</span>
            </div>
          </div>
        </div>
        <div class="card-desc">
          <svg width="16" height="16" fill="none"><use xlink:href="#icon-location"></use></svg>
          <span>${feed.address}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      window.location.href = `community-detail.html?id=${feed.id}`;
    });

    feedListContainer.appendChild(card);
  });

  updateCardsCommentCountWithLocalStorage(feeds);
}

// --- API + 클라이언트 필터 통합 함수 ---
async function filterFeedsByCategory(type) {
  try {
    const url = 'https://sorimap.it.com/api/feeds';
    const response = await fetch(url);
    if (!response.ok) throw new Error('피드 조회 실패: ' + response.status);
    let feeds = await response.json();

    if (type !== 'ALL') feeds = feeds.filter((feed) => feed.type === type);

    if (feeds.length > 0) {
      renderFeeds(feeds);
    } else {
      renderDummyFilteredFeeds(type);
    }
  } catch (error) {
    console.error('피드 필터링 오류:', error);
    renderDummyFilteredFeeds(type);
  }
}

// --- 더미 데이터 필터링 렌더링 ---
function renderDummyFilteredFeeds(type) {
  let filteredFeeds = [];
  if (type === 'ALL') filteredFeeds = dummyFeeds;
  else filteredFeeds = dummyFeeds.filter((feed) => feed.type === type);
  renderFeeds(filteredFeeds);
}

// --- 카테고리 버튼 이벤트 처리 ---
const categoryButtons = document.querySelectorAll(
  '.community-btns .category-btn'
);
let currentCategory = 'ALL';

categoryButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    categoryButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const selected = btn.textContent.trim().toUpperCase();
    if (selected === '전체'.toUpperCase()) currentCategory = 'ALL';
    else if (selected === '민원'.toUpperCase()) currentCategory = 'MINWON';
    else if (selected === '문화'.toUpperCase()) currentCategory = 'MUNHWA';
    else currentCategory = 'ALL';
    filterFeedsByCategory(currentCategory);
  });
});

// --- 초기 렌더링 ---
renderFeeds(dummyFeeds);
