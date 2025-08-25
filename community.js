// community.js 전체 코드 정리본

// --- 뒤로가기 버튼 기능 ---
document.querySelector(".header").addEventListener("click", () => {
  window.history.back();
});

// --- 글쓰기 버튼 클릭 시 write.html로 이동 ---
document.getElementById("writeBtn").addEventListener("click", () => {
  window.location.href = "write.html";
});

// --- 토큰 쿠키 가져오기 ---
function getAccessTokenFromCookie() {
  const cookies = document.cookie.split("; ");
  for (const c of cookies) {
    if (c.startsWith("ACCESS-TOKEN=")) {
      return c.split("=")[1];
    }
  }
  return null;
}

// --- 더미 데이터 ---
const dummyFeeds = [
  {
    id: "1",
    title: "모란역 쓰레기 문제",
    content: "쓰레기가 쌓여서 냄새가 심해요",
    type: "MINWON",
    address: "성남시 중원구 성남대로",
    lat: 37.4321,
    lng: 127.1299,
    kakaoPlaceId: "1234567890",
    likes: 5,
    imageUrls: ["./image/crosswalk.jpg"],
  },
  {
    id: "2",
    title: "청년 문화 공연 안내",
    content: "이번 주말에 청년밴드 공연이 있어요!",
    type: "MUNHWA",
    address: "성남시 수정구 신흥동 문화의 거리",
    lat: 37.4456,
    lng: 127.1567,
    kakaoPlaceId: "2345678901",
    likes: 10,
    imageUrls: ["./image/dark.jpg"],
  },
  {
    id: "3",
    title: "도로 파손 신고",
    content: "보행로가 꺼져서 위험합니다.",
    type: "MINWON",
    address: "성남시 분당구 판교로",
    lat: 37.3957,
    lng: 127.1103,
    kakaoPlaceId: "3456789012",
    likes: 3,
    imageUrls: ["./image/drain.jpg"],
  },
];

// --- 카드 리스트 컨테이너 ---
const feedListContainer = document.querySelector(".card-list");

// --- 로컬스토리지 키 ---
const LOCAL_STORAGE_COMMENT_KEY = "community_comments";
const LOCAL_STORAGE_LIKES_KEY = "community_likes";

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
    .querySelectorAll(".card-comment span")
    .forEach((el) => (el.textContent = count));
  const commentTitleSpan = document.querySelector(".comment-title span");
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
      const commentCountSpan = card.querySelector(".card-comment span");
      if (commentCountSpan) commentCountSpan.textContent = localCount;
    }
  });
}

// --- 카드 리스트 렌더링 (좋아요 로컬 반영 포함) ---
function renderFeeds(feeds) {
  feedListContainer.innerHTML = "";
  if (!feeds.length) {
    feedListContainer.innerHTML = "<p>피드가 없습니다.</p>";
    return;
  }

  const likesData = loadFromLocalStorage(LOCAL_STORAGE_LIKES_KEY);

  feeds.forEach((feed) => {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-feed-id", feed.id);
    card.style.cursor = "pointer";

    const imageUrl =
      feed.imageUrls && feed.imageUrls.length > 0
        ? feed.imageUrls[0]
        : "./image/default.jpg";
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
              <svg width="19" height="18" fill="none"><use xlink:href="#icon-comment"></use></svg>
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

    card.addEventListener("click", () => {
      window.location.href = `community-detail.html?id=${feed.id}`;
    });

    feedListContainer.appendChild(card);
  });

  updateCardsCommentCountWithLocalStorage(feeds);
}

// --- API + 클라이언트 필터 통합 함수 ---
async function filterFeedsByCategory(type) {
  try {
    const url = "https://sorimap.it.com/api/feeds";
    const response = await fetch(url);
    if (!response.ok) throw new Error("피드 조회 실패: " + response.status);
    let feeds = await response.json();

    if (type !== "ALL") feeds = feeds.filter((feed) => feed.type === type);

    if (feeds.length > 0) {
      renderFeeds(feeds);
    } else {
      renderDummyFilteredFeeds(type);
    }
  } catch (error) {
    console.error("피드 필터링 오류:", error);
    renderDummyFilteredFeeds(type);
  }
}

// --- 더미 데이터 필터링 렌더링 ---
function renderDummyFilteredFeeds(type) {
  let filteredFeeds = [];
  if (type === "ALL") filteredFeeds = dummyFeeds;
  else filteredFeeds = dummyFeeds.filter((feed) => feed.type === type);
  renderFeeds(filteredFeeds);
}

// --- 카테고리 버튼 이벤트 처리 ---
const categoryButtons = document.querySelectorAll(
  ".community-btns .category-btn"
);
let currentCategory = "ALL";

categoryButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    categoryButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const selected = btn.textContent.trim().toUpperCase();
    if (selected === "전체".toUpperCase()) currentCategory = "ALL";
    else if (selected === "민원".toUpperCase()) currentCategory = "MINWON";
    else if (selected === "문화".toUpperCase()) currentCategory = "MUNHWA";
    else currentCategory = "ALL";
    filterFeedsByCategory(currentCategory);
  });
});

// --- 초기 렌더링 ---
renderFeeds(dummyFeeds);
