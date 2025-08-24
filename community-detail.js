// 뒤로가기 버튼 기능
document.querySelector(".header svg").addEventListener("click", () => {
  window.history.back();
});

// 댓글 조회 API 호출 및 화면 렌더링 연동
async function fetchComments(feedId) {
  try {
    const response = await fetch(
      `https://sorimap.it.com/api/comments/${feedId}`,
      {
        method: "GET",
        credentials: "omit", // 쿠키 없음
      }
    );
    if (!response.ok) throw new Error("댓글 조회 실패");
    const data = await response.json();
    comments = data.map((item) => ({
      author: "익명", // userId 기반 author 이름 필요 시 추가 구현
      body: item.body,
      createdAt: item.createdAt,
    }));
    renderComments();
  } catch (error) {
    alert(error.message);
  }
}

// 공감 API 호출 함수
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
  const commentTitle = document.getElementById("comment-title");
  const likeBtn = document.querySelector(".like-btn");
  const likeCountSpan = document.querySelector(".card-like span"); // 공감 숫자 부분
  const feedId = 1; // 실제 피드 ID로 교체
  fetchComments(feedId);

  let comments = []; // 댓글 배열

  // 시간 문자열 (몇 분 전)
  function formatTime(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    return diff <= 0 ? "방금 전" : `${diff}분 전`;
  }

  // 댓글 렌더링
  function renderComments() {
    if (comments.length === 0) {
      commentList.style.display = "none";
      noComment.style.display = "flex";
      commentTitle.textContent = "댓글 0";
    } else {
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
      commentTitle.textContent = `댓글 ${comments.length}`;
    }
  }

  // 댓글 등록 API
  async function postComment(feedId, body) {
    try {
      const response = await fetch("https://sorimap.it.com/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 쿠키는 자동으로 전송되므로 따로 토큰 헤더는 필요없음 (또는 필요 시 Authorization 헤더 추가)
        },
        body: JSON.stringify({ feedId, body }),
        credentials: "include", // 쿠키 포함 요청
      });

      if (!response.ok) {
        throw new Error(`댓글 등록 실패: ${response.status}`);
      }

      const data = await response.json();
      return data; // 보통 새로 생성된 댓글 데이터 반환 예상
    } catch (error) {
      alert(error.message);
      return null;
    }
  }

  // 댓글 추가 처리 함수
  async function addComment() {
    const val = commentInput.value.trim();
    if (val.length === 0) return;

    // feedId는 임의로 1로 설정, 실제 구현 시 현재 게시글 ID로 교체
    const feedId = 1;

    sendBtn.disabled = true; // 중복 클릭 방지
    const result = await postComment(feedId, val);
    sendBtn.disabled = false;

    if (result) {
      // API서 반환된 새 댓글을 comments 배열에 추가하고 화면 갱신
      comments.push({
        author: result.author || "을랑이", // 기본 작성자 이름
        body: result.body || val,
        createdAt: result.createdAt || new Date().toISOString(),
      });
      commentInput.value = "";
      updateSendBtnState();
      renderComments();
    }
  }

  // 공감 버튼
  likeBtn.addEventListener("click", async () => {
    likeBtn.disabled = true;
    const resultMsg = await postLike(feedId);
    likeBtn.disabled = false;
    if (resultMsg) {
      alert(resultMsg); // "공감 완료" 또는 "이미 공감하셨습니다."

      // "공감 완료"일 때만 카운트 증가
      if (resultMsg.includes("공감 완료")) {
        let count = parseInt(likeCountSpan.textContent, 10) || 0;
        likeCountSpan.textContent = count + 1;
      }
      // 중복 공감 시(이미 공감하셨습니다.) 카운트 변화 없음
    }
  });

  // 버튼 SVG 색 및 커서 상태 갱신
  function updateSendBtnState() {
    if (commentInput.value.trim().length > 0) {
      sendSvgPath.setAttribute("fill", "#F87171");
      sendBtn.style.cursor = "pointer";
    } else {
      sendSvgPath.setAttribute("fill", "#9CA3AF");
      sendBtn.style.cursor = "default";
    }
  }

  // 이벤트 바인딩
  sendBtn.addEventListener("click", addComment);
  commentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addComment();
    }
  });
  commentInput.addEventListener("input", updateSendBtnState);

  // 초기 렌더 및 상태 적용
  renderComments();
  updateSendBtnState();
});
