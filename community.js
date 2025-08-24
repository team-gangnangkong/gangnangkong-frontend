// POST /api/feeds
async function createFeed(formData) {
  try {
    const response = await fetch("https://sorimap.it.com/api/feeds", {
      method: "POST",
      headers: {
        "ACCESS-TOKEN": getAccessTokenFromCookie(),
      },
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Feed 작성 실패: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Feed 작성 중 에러:", error);
    throw error;
  }
}

//토큰 쿠키
function getAccessTokenFromCookie() {
  const cookies = document.cookie.split("; ");
  for (const c of cookies) {
    if (c.startsWith("ACCESS-TOKEN=")) {
      return c.split("=")[1];
    }
  }
  return null;
}

// 글쓰기 버튼 클릭 시 write.html로 이동
document.getElementById("writeBtn").addEventListener("click", function () {
  window.location.href = "write.html";
});

const feedListContainer = document.querySelector(".card-list");

/**
 * 피드 데이터를 받아서 카드 리스트에 렌더링
 * @param {Array} feeds - 피드 배열
 */
function renderFeeds(feeds) {
  feedListContainer.innerHTML = ""; // 초기화

  feeds.forEach((feed) => {
    const card = document.createElement("div");
    card.className = "card";

    const imageUrl =
      feed.imageUrls && feed.imageUrls.length > 0
        ? feed.imageUrls[0]
        : "./image/default.jpg";

    card.innerHTML = `
  <div class="card-img-wrap">
    <img src="${feed.imageUrl}" class="card-img" alt="피드 이미지" />
    <span class="badge">${feed.badge}</span>
    <span class="card-arrow">
      <svg width="22" height="22" fill="none">
        <use xlink:href="#icon-arrow"></use>
      </svg>
    </span>
  </div>
  <div class="card-content">
    <div class="card-title-row">
      <div class="card-title">${feed.title}</div>
      <span class="card-like">
        <svg width="19" height="18" fill="none">
          <use xlink:href="#icon-like"></use>
        </svg>
        <span>${feed.likes}</span>
      </span>
    </div>
    <div class="card-desc">
      <svg width="16" height="16" fill="none">
        <use xlink:href="#icon-location"></use>
      </svg>
      <span>${feed.address}</span>
    </div>
    <div class="card-preview">
      ${feed.description}
    </div>
  </div>
`;

    feedListContainer.appendChild(card);
  });
}

/**
 * 전체 피드 조회 API 호출 후 렌더링
 * @param {number|null} kakaoPlaceId - kakaoPlaceId 필터링 값 (없으면 null)
 */
async function loadFeeds(kakaoPlaceId = null) {
  try {
    let url = "https://sorimap.it.com/api/feeds";
    if (kakaoPlaceId) {
      url += `?kakaoPlaceId=${kakaoPlaceId}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("피드 조회 실패: " + response.status);
    }
    const feeds = await response.json();
    renderFeeds(feeds);
  } catch (error) {
    console.error("피드 불러오기 에러:", error);
    feedListContainer.innerHTML =
      "<p>피드를 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 특정 위치에 해당하는 피드만 필터링
async function loadFeedsByLocation(kakaoPlaceId) {
  try {
    const response = await fetch(
      `https://sorimap.it.com/api/feeds?kakaoPlaceId=${kakaoPlaceId}`
    );
    if (!response.ok) {
      throw new Error("위치별 피드 조회 실패: " + response.status);
    }
    const feeds = await response.json();
    renderFeeds(feeds);
  } catch (error) {
    console.error("위치별 피드 불러오기 에러:", error);
    feedListContainer.innerHTML =
      "<p>피드를 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 상태별 조회
async function loadFeedsByStatus(status, kakaoPlaceId = null) {
  try {
    let url = `https://sorimap.it.com/api/feeds/status/${status}`;
    if (kakaoPlaceId) {
      url += `?kakaoPlaceId=${kakaoPlaceId}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("상태별 피드 조회 실패: " + response.status);
    }
    const feeds = await response.json();
    renderFeeds(feeds);
  } catch (error) {
    console.error("상태별 피드 불러오기 에러:", error);
    feedListContainer.innerHTML =
      "<p>피드를 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 전체 / 민원 / 문화 버튼 필터링 기능

const categoryButtons = document.querySelectorAll(
  ".community-btns .category-btn"
);

let currentCategory = "ALL"; // 초기값: 전체

// 카테고리 버튼 클릭 시 필터링 실행 함수
async function filterFeedsByCategory(category) {
  try {
    let url = "https://sorimap.it.com/api/feeds";

    if (category === "MINWON" || category === "MUNHWA") {
      // 지역구(badge)는 address로 불러오는건가?
      url += `?type=${category}`;
    }
    // 전체(ALL)는 필터 없이 모든 피드 조회

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("피드 조회 실패: " + response.status);
    }
    const feeds = await response.json();

    renderFeeds(feeds);
  } catch (error) {
    console.error("피드 필터링 오류:", error);
    feedListContainer.innerHTML =
      "<p>피드를 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 버튼 클릭 이벤트 핸들러
categoryButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // 기존 선택된 버튼 active 해제
    categoryButtons.forEach((b) => b.classList.remove("active"));

    // 클릭한 버튼 active 추가
    btn.classList.add("active");

    // 버튼 텍스트로 카테고리 결정
    let selected = btn.textContent.trim().toUpperCase();

    if (selected === "전체".toUpperCase()) {
      currentCategory = "ALL";
    } else if (selected === "민원".toUpperCase()) {
      currentCategory = "MINWON";
    } else if (selected === "문화".toUpperCase()) {
      currentCategory = "MUNHWA";
    } else {
      currentCategory = "ALL"; // 기본값 fallback
    }

    filterFeedsByCategory(currentCategory);
  });
});

// 초기 로드 시 전체 피드 보여주기
filterFeedsByCategory("ALL");

// 기존 renderFeeds(feeds) 함수는 feeds 데이터를 카드 리스트에 렌더링하는 역할을 한다고 가정

// 초기 실행, 전체 피드 불러오기
loadFeeds();
