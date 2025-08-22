// mypage 전체 조회 API 호출 및 화면 표시

async function fetchMyPage() {
  try {
    const response = await fetch("/api/mypage", {
      method: "GET",
      credentials: "include", // 쿠키 포함
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("마이페이지 정보 조회 실패");
    }

    const data = await response.json();
    renderMyPage(data);
  } catch (error) {
    console.error(error);
    document.querySelector(
      "#mypage-container"
    ).innerHTML = `<p>마이페이지 정보를 불러오는 중 오류가 발생했습니다.</p>`;
  }
}

function renderMyPage(data) {
  const container = document.querySelector("#mypage-container");
  container.innerHTML = `
    <section class="profile-section">
      <img src="${data.profileImageUrl}" alt="${
    data.nickname
  } 프로필 사진" class="profile-image" style="width:100px; height:100px; border-radius:50%;" />
      <h2>${data.nickname} 님의 마이페이지</h2>
    </section>

    <section class="like-history-section">
      <h3>공감 히스토리</h3>
      <ul>
        ${data.likeHistory
          .map(
            (item) => `
          <li>${item.weekLabel}: ${item.likeCount}개</li>
        `
          )
          .join("")}
      </ul>
    </section>

    <section class="my-feeds-section">
      <h3>내가 작성한 피드</h3>
      <div class="request-list">
        ${data.myFeeds.length === 0 ? `<p>작성한 민원이 없습니다.</p>` : ""}
        ${data.myFeeds
          .map(
            (feed) => `
          <div class="request-card" data-feed-id="${feed.feedId}">
            <div class="request-title-row">
              <div class="request-title">${feed.title}</div>
              <span class="tag-status status-not">미해결</span> 
            </div>
            <div class="request-desc">${feed.location}</div>
            <img src="${feed.imageUrl}" alt="${feed.title}" style="max-width: 100%; height: auto; margin-top: 8px;"/>
            <div>좋아요: ${feed.likeCount} | 댓글: ${feed.commentCount}</div>
          </div>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

// 내가 작성한 피드 목록 조회 API 호출 및 화면 표시

async function fetchMyFeeds() {
  try {
    const response = await fetch("/api/feeds/my", {
      method: "GET",
      credentials: "include", // 쿠키 포함
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("내 피드 목록 조회 실패");
    }

    const feeds = await response.json();
    renderFeeds(feeds);
  } catch (error) {
    console.error(error);
    document.querySelector(
      ".request-list"
    ).innerHTML = `<p>피드를 불러오는 중 오류가 발생했습니다.</p>`;
  }
}

function renderFeeds(feeds) {
  const container = document.querySelector(".request-list");
  container.innerHTML = ""; // 초기화

  if (!feeds.length) {
    container.innerHTML = `<p>작성한 민원이 없습니다.</p>`;
    return;
  }

  feeds.forEach((feed) => {
    // 상태 예시는 임의로 미해결로 설정, 실제 상태 API 필요 시 맞춰 변경
    const statusClass = "status-not";
    const statusText = "미해결";

    container.innerHTML += `
      <div class="request-card">
        <div class="request-title-row">
          <div class="request-title">${feed.title}</div>
          <span class="tag-status ${statusClass}">${statusText}</span>
        </div>
        <div class="request-desc">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            fill="none"
          >
            <path
              d="M12.24 3.09c1.1 1.1 1.73 2.59 1.76 4.14.02 1.56-.56 3.06-1.62 4.2l-.14.14-2.82 2.83c-.36.35-.85.56-1.36.57-.51.02-1-.17-1.37-.5l-.1-.1-2.83-2.83C2.63 10.45 2 8.92 2 7.33c0-1.59.63-3.12 1.76-4.24A6.05 6.05 0 0 1 8 1.33a6.05 6.05 0 0 1 4.24 1.76zM8 5.33c-.26 0-.52.05-.77.16-.24.1-.46.27-.63.44-.18.18-.33.38-.43.62-.11.23-.17.48-.17.73s.06.5.17.73c.1.24.25.44.43.62.17.17.39.34.63.44.25.11.5.16.77.16.53 0 1.04-.21 1.41-.58.36-.37.58-.88.58-1.41 0-.53-.22-1.03-.58-1.41A1.95 1.95 0 0 0 8 5.33z"
              fill="#9CA3AF"
            />
          </svg>
          ${feed.location}
        </div>
      </div>
    `;
  });
}

// 로그아웃
// POST /api/auth/logout 가정

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-button");

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // 쿠키 포함해서 서버에 로그아웃 요청
      });

      if (!response.ok) {
        throw new Error("로그아웃 실패");
      }

      // 로그아웃 성공 시 처리 - 소통 페이지로 이동
      alert("로그아웃 되었습니다.");
      window.location.href = "/home.html"; // 소통 페이지로 이동
    } catch (error) {
      console.error(error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  });
});

// 페이지 로드 시 마이페이지 전체 정보 호출
document.addEventListener("DOMContentLoaded", fetchMyPage);

// 페이지 로드 시 내 피드 목록 호출
document.addEventListener("DOMContentLoaded", fetchMyFeeds);
