// community-detail.html 적용 더미데이터

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const feedId = urlParams.get("id");

  // feedId === "123" 용도 더미데이터
  const dummyFeed123 = {
    id: 123,
    title: "더미 피드 제목 #123",
    content:
      "이것은 id가 123인 더미 피드의 상세 내용입니다. 여기서 실제 API 데이터가 들어갈 위치입니다.",
    address: "더미 주소 123번지",
    likes: 15,
    status: "OPEN",
    imageUrls: ["./image/hole.jpg"],
    userNickname: "더미 작성자",
    createdAt: "2025-08-25T04:00:00Z",
  };

  if (feedId === "123") {
    renderFeedDetail(dummyFeed123);
    return;
  } else {
    // 백엔드 연동 전, id 무관하게 더미 데이터 출력
    const dummyFeed = {
      title: "더미 피드 기본값 제목",
      content:
        "더미 기본값 상세 내용입니다. 여기에 실제 API 데이터가 들어갑니다.",
      address: "더미 주소",
      likes: 10,
      status: "OPEN",
      imageUrls: ["./image/default.jpg"],
    };

    renderFeedDetail(dummyFeed);
  }

  // 더미 댓글 데이터 3개
  const dummyComments = [
    {
      author: "익명1",
      body: "저도 같은 문제 겪었어요!",
      createdAt: "2025-08-24T10:30:00Z",
    },
    {
      author: "익명2",
      body: "빠른 해결 부탁드립니다.",
      createdAt: "2025-08-24T11:45:00Z",
    },
    {
      author: "익명3",
      body: "감사합니다, 좋은 정보였어요.",
      createdAt: "2025-08-25T09:15:00Z",
    },
  ];

  // 댓글 개수 업데이트 함수
  function updateCommentCountUI(count) {
    // .card-comment span 업데이트
    document.querySelectorAll(".card-comment span").forEach((elem) => {
      elem.textContent = count;
    });

    // .comment-title span 업데이트
    const commentTitleSpan = document.querySelector(".comment-title span");
    if (commentTitleSpan) {
      commentTitleSpan.textContent = count;
    }
  }

  // 댓글 목록 렌더링 함수
  function renderComments(comments) {
    const commentList = document.getElementById("comment-list");
    const noComment = document.getElementById("no-comment");

    if (!comments || comments.length === 0) {
      commentList.style.display = "none";
      noComment.style.display = "flex";
      updateCommentCountUI(0);
      return;
    }

    commentList.innerHTML = "";
    comments.forEach((item) => {
      const el = document.createElement("div");
      el.className = "comment-item";
      el.innerHTML = `
          <span class="comment-profile-dot"></span>
          <div class="comment-content">
            <div class="comment-top">
              <span class="comment-author">${item.author}</span>
              <span class="comment-time">${formatTime(
                new Date(item.createdAt)
              )}</span>
            </div>
            <div class="comment-text">${item.body}</div>
          </div>
        `;
      commentList.appendChild(el);
    });
    commentList.style.display = "block";
    noComment.style.display = "none";

    updateCommentCountUI(comments.length);
  }

  // 시간 차이 분 단위 반환 함수
  function formatTime(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    return diff <= 0 ? "방금 전" : `${diff}분 전`;
  }

  // 더미 데이터로 댓글 목록 렌더링 및 개수 표시
  renderComments(dummyComments);

  // 여기까지 더미 댓글 작업
});

// 더미 피드
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
