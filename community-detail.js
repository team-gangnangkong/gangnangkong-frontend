//  postComment(feedId, body) 마이데이터에서 users/me/nickname 불러와야 함.
// 현재 닉네임 author 익명으로 고정
/* 상태별 조회 시
```
GET https://sorimap.it.com/api/feeds/status/{status}
```

- **Path Variable → 대문자여야함.**
    - `status`: `OPEN` (미해결) 기본값| `IN_PROGRESS` (해결중)| `RESOLVED` (해결완료)
*/

document.addEventListener("DOMContentLoaded", () => {
  // 뒤로가기 버튼 기능
  document.querySelector(".header").addEventListener("click", () => {
    window.history.back();
  });

  const commentInput = document.querySelector(".comment-input");
  const sendBtn = document.querySelector(".comment-send-btn");
  const sendSvgPath = sendBtn.querySelector("svg path");
  const commentList = document.getElementById("comment-list");
  const noComment = document.getElementById("no-comment");

  let feedId = new URLSearchParams(window.location.search).get("id") || "1"; // 임시
  console.log("클릭된 피드 ID:", feedId);
  let comments = []; //댓글 배열

  // 더미데이터 배열: community.html의 dummyFeeds와 동일한 형태 및 id 포함
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

  // feedId에 일치하는 게시물 찾기
  const feed = dummyFeeds.find((item) => item.id.toString() === feedId);
  console.log("찾은 feed:", feed);

  if (feed) {
    renderFeedDetail(feed);
  } else {
    // 없다면 기본값 렌더링
    const defaultFeed = {
      title: "기본 더미 제목 123",
      content: "기본 더미 내용입니다. 123",
      address: "기본 주소 123",
      likes: 5,
      imageUrls: ["./image/default.jpg"],
    };
    renderFeedDetail(defaultFeed);
  }

  // 페이지 로드 시 더미 댓글 배열로 초기화 및 렌더링
  comments = [...dummyComments];
  renderComments(comments);
  updateSendBtnState();

  // 댓글 목록 렌더링 함수
  function renderComments(comments) {
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
              <span class="comment-time">${new Date(
                item.createdAt
              ).toLocaleString()}</span>
            </div>
            <div class="comment-text">${item.body}</div>
          </div>
        `;
      commentList.appendChild(el);
      console.log("렌더링된 댓글 개수:", comments.length);
    });
    commentList.style.display = "block";
    noComment.style.display = "none";
    updateCommentCountUI(comments.length);
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

  // 댓글 내용 입력 시 버튼 색 바뀜 작동 완료
  function updateSendBtnState() {
    if (commentInput.value.trim().length > 0) {
      sendSvgPath.style.fill = "#F87171";
      sendBtn.style.cursor = "pointer";
      sendBtn.disabled = false;
    } else {
      sendSvgPath.style.fill = "#9CA3AF";
      sendBtn.style.cursor = "default";
      sendBtn.disabled = true;
    }
  }

  async function postComment(feedId, body) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          author: "익명", // 마이데이터 닉네임 가져와야함
          body,
          createdAt: new Date().toISOString(),
        });
      }, 300);
    });
  }

  async function addComment() {
    const val = commentInput.value.trim();
    if (val.length === 0) return;

    sendBtn.disabled = true;
    const result = await postComment(feedId, val);
    sendBtn.disabled = false;

    if (result) {
      comments.push({
        author: result.author,
        body: result.body,
        createdAt: result.createdAt,
      });
      commentInput.value = "";
      updateSendBtnState();
      renderComments(comments);
    }
    // 객체 통째로 추가하는 코드
    // if (result) {
    //   comments.push(result); // 기존 댓글 유지하며 추가
    //   commentInput.value = "";
    //   updateSendBtnState();
    //   renderComments(comments);
    // }
  }

  // 댓글 작성. 마우스 및 키보드 엔터
  sendBtn.addEventListener("click", addComment);
  commentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addComment();
    }
  });
  commentInput.addEventListener("input", updateSendBtnState);

  // community 피드에서 보낸 피드 id 가져옴
  // 상세 페이지(community-detail.html)에서 URL 쿼리에서 id 파라미터 추출
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    console.log("클릭된 피드 ID:", feedId);
    return urlParams.get(param);
  }

  // 피드 상세 데이터 화면 렌더링 함수
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
    document.querySelector(".card-like span").textContent = feed.likes;
    // 기타 필요 정보 렌더링
  }

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
  }

  renderFeedDetail(dummyFeed);

  // 더미 데이터로 댓글 목록 렌더링 및 개수 표시
  renderComments(dummyComments);

  // // 시간 차이 분 단위 반환 함수
  // function formatTime(date) {
  //   const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  //   return diff <= 0 ? "방금 전" : `${diff}분 전`;
  // }
});
