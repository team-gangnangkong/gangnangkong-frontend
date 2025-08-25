const API_BASE = "https://sorimap.it.com";
const toHttps = (u) =>
  typeof u === "string" ? u.replace(/^http:\/\//, "https://") : u;
const absolutize = (u) => {
  if (!u) return u;
  let s = toHttps(u);
  if (s.startsWith("/")) s = API_BASE + s; // 상대경로 → 절대경로
  return s;
};

// 글쓰기 버튼 클릭 시 write.html로 이동
document.getElementById("writeBtn").addEventListener("click", function () {
  window.location.href = "write.html";
});

// community.js 내용 그대로 옮김
const feedListContainer = document.querySelector(".card-list");

function renderFeeds(feeds) {
  feedListContainer.innerHTML = "";

  feeds.forEach((feed) => {
    const card = document.createElement("div");
    card.className = "card";

    // ✅ imageUrl 계산 + 절대/HTTPS 보정
    const imgSrc = absolutize(
      feed.imageUrl ||
        (feed.imageUrls && feed.imageUrls[0]) ||
        "./image/default.jpg"
    );

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${imgSrc}" class="card-img" alt="피드 이미지" />
        <span class="card-arrow">
          <svg width="22" height="22" fill="none">
            <use xlink:href="#icon-arrow"></use>
          </svg>
        </span>
      </div>
      <div class="card-content">
        <div class="card-title-row">
          <div class="card-title">${feed.title || ""}</div>
          <span class="card-like">
            <svg width="19" height="18" fill="none">
              <use xlink:href="#icon-like"></use>
            </svg>
            <span>${feed.likes ?? 0}</span>
          </span>
        </div>
        <div class="card-desc">
          <svg width="16" height="16" fill="none">
            <use xlink:href="#icon-location"></use>
          </svg>
          <span>${feed.address || ""}</span>
        </div>
        <div class="card-preview">
          ${feed.content || ""}
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
      throw new Error("전체 피드 조회 실패: " + response.status);
    }
    const feeds = await response.json();
    renderFeeds(feeds);
  } catch (error) {
    console.error("피드 불러오기 에러:", error);
    feedListContainer.innerHTML =
      "<p>전체 피드를 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 전체 / 민원 / 문화 버튼 필터링 기능

const categoryButtons = document.querySelectorAll(
  ".community-btns .category-btn"
);

let currentCategory = "ALL"; // 초기값: 전체

// 카테고리 버튼 클릭 이벤트 핸들러
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

// 카테고리 버튼 클릭 시 필터링 실행 함수 (community.js 코드 그대로 옮김)
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
      throw new Error("필터링 피드 조회 실패: " + response.status);
    }
    const feeds = await response.json();

    renderFeeds(feeds);
  } catch (error) {
    console.error("피드 필터링 오류:", error);
    feedListContainer.innerHTML =
      "<p>피드 필터링을 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 초기 실행, 전체 피드 불러오기
loadFeeds();
