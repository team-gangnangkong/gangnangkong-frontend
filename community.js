// API 불러오기 실패 시 더미데이터 출력

// --- 뒤로가기 버튼 기능 ---
document.querySelector(".header").addEventListener("click", () => {
  window.history.back();
});

// --- 글쓰기 버튼 클릭 시 write.html로 이동 ---
document.getElementById("writeBtn").addEventListener("click", () => {
  window.location.href = "write.html";
});

// --- 토큰 쿠키 가져오기 (community-detail.js와 동일) ---
function getAccessTokenFromCookie() {
  const cookies = document.cookie.split("; ");
  for (const c of cookies) {
    if (c.startsWith("ACCESS-TOKEN=")) {
      return c.split("=")[1];
    }
  }
  return null;
}

// --- 더미 데이터 준비 ---
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

// --- 카드 리스트 컨테이너 선택 ---
const feedListContainer = document.querySelector(".card-list");

// --- 피드 데이터 받아서 카드 리스트 렌더링 ---
function renderFeeds(feeds) {
  feedListContainer.innerHTML = ""; // 초기화

  if (!feeds.length) {
    feedListContainer.innerHTML = "<p>피드가 없습니다.</p>";
    return;
  }

  feeds.forEach((feed) => {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-feed-id", feed.id);
    card.style.cursor = "pointer";

    // 카드 내 HTML 내용 세팅 (이미지, 제목, 좋아요, 주소 등)
    const imageUrl =
      feed.imageUrls && feed.imageUrls.length > 0
        ? feed.imageUrls[0]
        : "./image/default.jpg";

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${imageUrl}" alt="피드 이미지" class="card-img" />
        <span class="card-arrow">
          <svg width="22" height="22" fill="none">
            <use xlink:href="#icon-arrow"></use>
          </svg>
        </span>
      </div>
      <div class="card-content">
        <div class="card-title-row">
          <div class="card-title">${feed.title}</div>
          <div>
            <span class="card-like">
              <svg width="19" height="18" fill="none">
                <use xlink:href="#icon-like"></use>
              </svg>
              <span>${feed.likes}</span>
            </span>
            <span class=" card-comment">
              <svg width="19" height="18" fill="none">
                <use xlink:href="#icon-comment"></use>
              </svg>
              <span>${feed.comments}</span>
            </span>
          </div>
          
        </div>
        <div class="card-desc">
          <svg width="16" height="16" fill="none">
            <use xlink:href="#icon-location"></use>
          </svg>
          <span>${feed.address}</span>
        </div>
      </div>
    `;

    // 카드 클릭 이벤트: 상세 페이지로 feedId 넘김
    card.addEventListener("click", () => {
      const feedId = card.getAttribute("data-feed-id");
      if (feedId) {
        window.location.href = `community-detail.html?id=${feedId}`;
      }
      console.log("클릭된 피드 ID:", feedId);
    });

    feedListContainer.appendChild(card);
  });
}

// 전체 피드 조회 API
async function loadAllFeeds(kakaoPlaceId = null) {
  try {
    let url = "https://sorimap.it.com/api/feeds";
    if (kakaoPlaceId) url += `?kakaoPlaceId=${kakaoPlaceId}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("전체 피드 조회 실패 " + response.status);

    const feeds = await response.json();
    renderFeeds(feeds);
  } catch (error) {
    console.error(error);
    // feedListContainer.innerHTML =
    //   "<p>전체 피드를 불러오는 중 오류가 발생했습니다.</p>";
    renderFeeds(dummyFeeds); // 오류 시 더미데이터 렌더링
  }
}

// 상태별 조회 API
async function loadAllFeeds(status, kakaoPlaceId = null) {
  try {
    let url = `https://sorimap.it.com/api/feeds/status/${status.toUpperCase()}`;
    if (kakaoPlaceId) url += `?kakaoPlaceId=${kakaoPlaceId}`;

    const response = await fetch(url);
    if (!response.ok)
      throw new Error("상태별 피드 조회 실패 " + response.status);

    const feeds = await response.json();
    renderFeeds(feeds);
  } catch (error) {
    console.error(error);
    console.error(error);
    feedListContainer.innerHTML =
      "<p>상태별 피드를 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 게시물 상세 조회 API
async function loadFeedDetail(id) {
  try {
    const url = `https://sorimap.it.com/api/feeds/${id}`;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error("게시물 상세 조회 실패 " + response.status);

    const feed = await response.json();
    renderFeedDetail(feed);
  } catch (error) {
    console.error(error);
    // 기본 더미 데이터 렌더링 등의 대체 처리 가능
  }
}

// --- API 통신 + 더미 데이터 fallback 통합 필터 함수 ---
async function filterFeedsByCategory(category) {
  try {
    let url = "https://sorimap.it.com/api/feeds";
    if (category === "MINWON" || category === "MUNHWA") {
      url += `?type=${category}`;
    }

    const response = await fetch(url);

    if (!response.ok)
      throw new Error("필터링 피드 조회 실패: " + response.status);

    const feeds = await response.json();

    if (feeds && feeds.length > 0) {
      renderFeeds(feeds);
    } else {
      renderDummyFilteredFeeds(category);
    }
    if (feeds && feeds.length > 0) {
      renderFeeds(feeds);
    } else {
      renderDummyFilteredFeeds(category);
    }
  } catch (error) {
    console.error("피드 필터링 오류:", error);
    renderDummyFilteredFeeds(category);
  }
}

// --- 더미 데이터에서 카테고리 필터링 후 렌더링 ---
function renderDummyFilteredFeeds(category) {
  let filteredFeeds = [];
  if (category === "ALL") {
    filteredFeeds = dummyFeeds;
  } else {
    filteredFeeds = dummyFeeds.filter((feed) => feed.type === category);
  }
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

// --- 초기 렌더링은 더미 데이터 기반 전체 목록 ---
renderFeeds(dummyFeeds);

// 초기 렌더링
// loadAllFeeds();
