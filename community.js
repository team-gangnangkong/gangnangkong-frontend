// POST /api/feeds
async function createFeed(formData) {
  try {
    const response = await fetch("http://localhost:8080/api/feeds", {
      method: "POST",
      headers: {
        // 'Content-Type' is NOT set explicitly when using FormData,
        // browser sets the correct multipart/form-data boundary automatically
        "ACCESS-TOKEN": getAccessTokenFromCookie(), // assuming you have a function to get token from cookie
      },
      body: formData,
      credentials: "include", // to send cookies (login session)
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
        <img src="${imageUrl}" class="card-img" alt="피드 이미지" />
        <span class="badge">${feed.type}</span>
        <span class="card-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 21C16.523 21 21 16.523 21 11C21 5.477 16.523 1 11 1C5.477 1 1 5.477 1 11C1 16.523 5.477 21 11 21Z" stroke="white" stroke-linejoin="round"/>
            <path d="M9.5 15.5L14 11L9.5 6.5" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
      <div class="card-content">
        <div class="card-title-row">
          <div class="card-title">${feed.title}</div>
          <span class="card-like">
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="18" viewBox="0 0 19 18" fill="none">
              <path d="M15.665 7.1625C15.3425 6.78 14.8775 6.5625 14.375 6.5625H11.3525V4.5C11.3525 3.36 10.43 2.4375 9.23 2.4375C8.705 2.4375 8.2325 2.7525 8.0225 3.24L6.1175 7.6875H4.715C3.7325 7.6875 2.9375 8.4825 2.9375 9.465V13.7925C2.9375 14.7675 3.74 15.5625 4.715 15.5625H13.385C14.2025 15.5625 14.9 14.9775 15.0425 14.1675L16.0325 8.5425C16.115 8.0475 15.98 7.545 15.6575 7.1625H15.665Z" fill="#F87171"/>
            </svg><span>${feed.likes}</span>
          </span>
          <span class="card-comment">
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
              <path d="M9.49968 1.58301C13.8721 1.58301 17.4163 5.1273 17.4163 9.49967C17.4163 13.872 13.8721 17.4163 9.49968 17.4163C8.23617 17.4181 6.99075 17.1162 5.86831 16.536L2.83939 17.3807C2.6704 17.4279 2.49191 17.4293 2.32221 17.3847C2.15251 17.3402 1.9977 17.2514 1.87364 17.1273C1.74958 17.0032 1.66074 16.8484 1.61621 16.6787C1.57168 16.509 1.57306 16.3305 1.62022 16.1615L2.46572 13.135C1.88413 12.0116 1.58137 10.7647 1.58301 9.49967C1.58301 5.1273 5.12731 1.58301 9.49968 1.58301ZM9.49968 2.77051C7.715 2.77051 6.00341 3.47947 4.74144 4.74144C3.47948 6.0034 2.77051 7.71499 2.77051 9.49967C2.77051 10.6634 3.06581 11.782 3.61997 12.7748L3.73872 12.9885L2.85839 16.1425L6.01477 15.2622L6.22852 15.381C7.12657 15.8803 8.12704 16.1673 9.15321 16.22C10.1794 16.2727 11.204 16.0897 12.1485 15.685C13.093 15.2804 13.9322 14.6648 14.6019 13.8855C15.2716 13.1062 15.754 12.1839 16.012 11.1893C16.27 10.1947 16.2968 9.15422 16.0903 8.14766C15.8839 7.14109 15.4497 6.19517 14.821 5.38243C14.1923 4.56968 13.3858 3.91171 12.4634 3.45896C11.541 3.00621 10.5272 2.7707 9.49968 2.77051Z" fill="#F87171"/>
            </svg><span>0</span>
          </span>
        </div>
        <div class="card-desc">${feed.address}</div>
      </div>
    `;

    feedListContainer.appendChild(card);
  });
}

/**
 * 전체 피드 조회 API 호출 후 렌더링
 * @param {number|null} locationId - locationId 필터링 값 (없으면 null)
 */
async function loadFeeds(locationId = null) {
  try {
    let url = "http://localhost:8080/api/feeds";
    if (locationId) {
      url += `?locationId=${locationId}`;
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

// 상태별 조회
async function loadFeedsByStatus(status, locationId = null) {
  try {
    let url = `http://localhost:8080/api/feeds/status/${status}`;
    if (locationId) {
      url += `?locationId=${locationId}`;
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

// 초기 실행, 전체 피드 불러오기
loadFeeds();
