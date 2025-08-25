/* 근처 다른 이슈 <div class="related-section"> 누르면
  비슷한 지역 필터링된 피드를 보여주는 링크로 이동해야 함
  - **Query Params (선택)**
  - `kakaoPlaceId` → 특정 위치에 해당하는 피드만 필터링
  해당 기능 이용해서 하는건지. 
  지역구 badge도 이 기능 이용해서 하면 되는지?
*/

// (완료) 뒤로가기 버튼 기능
document.querySelector(".header").addEventListener("click", () => {
  window.history.back();
});

// (완료) 토큰 쿠키. community.js와 동일
function getAccessTokenFromCookie() {
  const cookies = document.cookie.split("; ");
  for (const c of cookies) {
    if (c.startsWith("ACCESS-TOKEN=")) {
      return c.split("=")[1];
    }
  }
  return null;
}

// (완료) community 피드에서 보낸 피드 id 가져옴
// 상세 페이지(community-detail.html)에서 URL 쿼리에서 id 파라미터 추출
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const feedId = getQueryParam("id");

// (완료) 단건 조회 API
async function loadFeedDetail(feedId) {
  try {
    const response = await fetch(`https://sorimap.it.com/api/feeds/${feedId}`);
    if (!response.ok) throw new Error("피드 상세 조회 실패");
    const feed = await response.json();
    renderFeedDetail(feed); // 화면에 데이터 렌더링 함수 호출
  } catch (error) {
    console.error(error);
    renderFeeds(dummyFeeds); // 더미데이터 출력
  }
}

if (feedId) {
  loadFeedDetail(feedId);
}

// (완료) 피드 상세 데이터 화면 렌더링
function renderFeedDetail(feed) {
  document.querySelector(".post-title").textContent = feed.title;
  document.querySelector(".post-desc").textContent = feed.content;
  document.querySelector(".location-bar span").textContent = feed.address;
  // 이미지, 좋아요 수, 상태, 작성자 등도 추가 렌더링
  if (feed.imageUrls && feed.imageUrls.length > 0) {
    const imgElem = document.querySelector(".post-img");
    imgElem.src = feed.imageUrls[0];
    imgElem.alt = feed.title;
  }
  // 좋아요 수
  document.querySelector(".like-count").textContent = feed.likes;
  // 기타 필요 정보 렌더링
}

// 댓글 조회 API 호출 및 화면 렌더링 연동
// async function fetchComments(feedId) {
//   try {
//     const response = await fetch(
//       `https://sorimap.it.com/api/comments/${feedId}`,
//       {
//         method: "GET",
//         credentials: "omit", // 쿠키 없음
//       }
//     );
//     if (!response.ok) throw new Error("댓글 조회 실패");
//     const data = await response.json();
//     comments = data.map((item) => ({
//       author: "익명", // userId 기반 author 이름 필요 시 추가 구현
//       body: item.body,
//       createdAt: item.createdAt,
//     }));
//     renderComments();
//   } catch (error) {
//     alert(error.message);
//   }
// }

// 댓글 조회 API 호출 및 댓글 개수 구해서 UI에 반영
async function fetchCommentsAndCount(feedId) {
  try {
    const response = await fetch(
      `https://sorimap.it.com/api/comments/${feedId}`,
      {
        method: "GET",
        credentials: "omit", // 쿠키 필요 없음
        headers: { "Content-Type": "application/json" },
      }
    );
    if (!response.ok) throw new Error("댓글 조회 실패");
    const comments = await response.json();

    // 댓글 개수
    const commentCount = comments.length;

    // 댓글 개수 UI 반영
    updateCommentCountUI(commentCount);

    // 댓글 내용 렌더링 함수 호출
    renderComments(comments);

    return comments;
  } catch (error) {
    console.error("댓글 조회 오류:", error);
    updateCommentCountUI(0);
    return [];
  }
}

// 댓글 개수 UI 반영 함수
function updateCommentCountUI(count) {
  // .card-comment span에 댓글 개수 표시 (목록 화면)
  document.querySelectorAll(".card-comment span").forEach((elem) => {
    elem.textContent = count;
  });

  // .comment-title span에 댓글 개수 표시 (상세 페이지)
  const commentTitleSpan = document.querySelector(".comment-title span");
  if (commentTitleSpan) {
    commentTitleSpan.textContent = count;
  }
}

// (완료) 공감 누르기 API 호출 함수
async function postLike(feedId) {
  try {
    const response = await fetch(
      `https://sorimap.it.com/api/reactions/like?feedId=${feedId}`,
      {
        method: "POST",
        credentials: "include", // 쿠키(ACCESS-TOKEN) 포함
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) throw new Error("서버 오류");
    const result = await response.text();
    return result;
  } catch (error) {
    alert(error.message);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const commentInput = document.querySelector(".comment-input");
  const sendBtn = document.querySelector(".comment-send-btn");
  const sendSvgPath = sendBtn.querySelector("svg path");
  const commentList = document.getElementById("comment-list");
  const noComment = document.getElementById("no-comment");
  const commentTitle = document.querySelector(".comment-title span");
  const likeBtn = document.querySelector(".like-btn");
  const likeCountSpan = document.querySelector(".card-like span");

  const urlParams = new URLSearchParams(window.location.search);
  const feedId = urlParams.get("id");

  // 게시글 댓글들 저장. 요청 후 갱신
  let comments = [];

  // 시간 표시 함수 (몇 분 전 등)
  function formatTime(date) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    return diff <= 0 ? "방금 전" : `${diff}분 전`;
  }

  // (완료) 댓글 목록 렌더링
  function renderComments(commentsArray) {
    if (!commentsArray || commentsArray.length === 0) {
      commentList.style.display = "none";
      noComment.style.display = "flex";
      commentTitle.textContent = "0";
      updateCommentCountUI(0);
      return;
    }

    commentList.innerHTML = "";
    commentsArray.forEach((item) => {
      const el = document.createElement("div");
      el.className = "comment-item";
      el.innerHTML = `
        <span class="comment-profile-dot"></span>
        <div class="comment-content">
          <div class="comment-top">
            <span class="comment-author">${item.author}</span>
            <span class="comment-time">${formatTime(item.createdAt)}</span>
          </div>
          <div class="comment-text">${item.body}</div>
        </div>
      `;
      commentList.appendChild(el);
    });
    commentList.style.display = "block";
    noComment.style.display = "none";

    commentTitle.textContent = commentsArray.length;
    updateCommentCountUI(commentsArray.length);
  }

  // (완료) 댓글 개수 UI 업데이트 함수 (.card-comment span 등)
  function updateCommentCountUI(count) {
    document.querySelectorAll(".card-comment span").forEach((elem) => {
      elem.textContent = count;
    });
  }

  // (완료) 댓글 API 조회
  async function fetchCommentsAndCount(feedId) {
    try {
      const response = await fetch(
        `https://sorimap.it.com/api/comments/${feedId}`,
        {
          method: "GET",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) throw new Error("댓글 조회 실패");
      const data = await response.json();

      comments = data.map((item) => ({
        author: "익명",
        body: item.body,
        createdAt: item.createdAt,
      }));

      renderComments(comments);
    } catch (error) {
      console.error(error);
      renderComments([]);
    }
  }

  // (완료) 댓글 등록 API
  async function postComment(feedId, body) {
    try {
      const response = await fetch("https://sorimap.it.com/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId, body }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`댓글 등록 실패: ${response.status}`);
      }

      const data = await response.json();
      return data; // 생성된 댓글 데이터 기대
    } catch (error) {
      alert(error.message);
      return null;
    }
  }

  // (완료) 댓글 내용 입력 시 버튼 색 및 커서 상태 업데이트
  function updateSendBtnState() {
    if (commentInput.value.trim().length > 0) {
      sendSvgPath.style.fill = "#F87171";
      sendBtn.style.cursor = "pointer";
    } else {
      sendSvgPath.style.fill = "#9CA3AF";
      sendBtn.style.cursor = "default";
    }
  }

  // (완료) 댓글 추가 처리
  async function addComment() {
    const val = commentInput.value.trim();
    if (val.length === 0) return;

    sendBtn.disabled = true;
    const result = await postComment(feedId, val);
    sendBtn.disabled = false;

    if (result) {
      comments.push({
        author: result.author || "을랑이",
        body: result.body || val,
        createdAt: result.createdAt || new Date().toISOString(),
      });
      commentInput.value = "";
      updateSendBtnState();
      renderComments(comments);
    }
  }

  // (완료) 공감 버튼 처리
  likeBtn.addEventListener("click", async () => {
    likeBtn.disabled = true;
    const resultMsg = await postLike(feedId);
    likeBtn.disabled = false;

    if (resultMsg) {
      alert(resultMsg);
      if (resultMsg.includes("공감 완료")) {
        let count = parseInt(likeCountSpan.textContent, 10) || 0;
        likeCountSpan.textContent = count + 1;
      }
    }
  });

  // (완료) 이벤트 바인딩
  sendBtn.addEventListener("click", addComment);
  commentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addComment();
    }
  });
  commentInput.addEventListener("input", updateSendBtnState);

  // 초기 데이터 로드
  if (feedId) {
    fetchCommentsAndCount(feedId);
  }

  updateSendBtnState();
});

// (완료)
function renderFeedDetail(feed) {
  document.querySelector(".post-title").textContent = feed.title;
  document.querySelector(".post-desc").textContent = feed.content;
  document.querySelector(".location-bar").textContent = feed.address;
  document.querySelector(".card-like span").textContent = feed.likes;
  document.querySelector(".status-badge").textContent = feed.status;
  if (feed.imageUrls && feed.imageUrls.length > 0) {
    const imgElem = document.querySelector(".post-img");
    imgElem.src = feed.imageUrls[0];
    imgElem.alt = feed.title;
  }
}

// 근처 다른 이슈 피드 조회 용도
// community.js 내용 그대로 옮김
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

    // 지역구 불러오는 걸 어떻게 작업하는지 모르겠어서 일단 건너뜀
    // <span class="badge">${feed.badge}</span>
    card.innerHTML = `
  <div class="card-img-wrap">
    <img src="${feed.imageUrl}" class="card-img" alt="피드 이미지" />
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
      ${feed.content}
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
