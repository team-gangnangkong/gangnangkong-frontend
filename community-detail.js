/**
 * 커뮤니티 상세 페이지 주요 기능 정리
 *
 * - 상세 피드 데이터 API 호출 및 렌더링
 * - 댓글 목록 조회, 댓글 작성 기능 (API 연동 포함)
 * - 피드 공감(좋아요) 버튼 기능 및 API 연동
 * - 근처 다른 이슈(피드) 목록 조회 및 렌더링
 * - UI 이벤트 처리: 뒤로가기, 댓글 입력, 공감 버튼 클릭 등
 * - 더미 데이터 활용: API 오류 시 임시 데이터로 화면 출력 보장
 * - 카카오 장소 ID(kakaoPlaceId)를 이용한 위치 기반 필터링 구현
 * - 토큰 쿠키에서 JWT 토큰 추출 함수 포함
 *
 * 사용 시:
 * 페이지 로드 시 query param에서 feedId 얻어와 상세 데이터 호출,
 * 댓글과 근처 이슈도 동시에 로딩
 * 사용자 인터랙션에 맞춰 댓글 및 공감 상태 제어
 *
 * 참고: fetch API 사용, 비동기 함수 정의 및 await 사용
 */

/**
 * 커뮤니티 상세 페이지 주요 기능 정리
 *
 * - 상세 피드 데이터 API 호출 및 렌더링
 * - 댓글 목록 조회, 댓글 작성 기능 (API 연동 포함)
 * - 피드 공감(좋아요) 버튼 기능 및 API 연동
 * - 근처 다른 이슈(피드) 목록 조회 및 렌더링
 * - UI 이벤트 처리: 뒤로가기, 댓글 입력, 공감 버튼 클릭 등
 * - 더미 데이터 활용: API 오류 시 임시 데이터로 화면 출력 보장
 * - 카카오 장소 ID(kakaoPlaceId)를 이용한 위치 기반 필터링 구현
 * - 토큰 쿠키에서 JWT 토큰 추출 함수 포함
 *
 * 사용 시:
 * 페이지 로드 시 query param에서 feedId 얻어와 상세 데이터 호출,
 * 댓글과 근처 이슈도 동시에 로딩
 * 사용자 인터랙션에 맞춰 댓글 및 공감 상태 제어
 *
 * 참고: fetch API 사용, 비동기 함수 정의 및 await 사용
 */

/* 근처 다른 이슈 <div class="related-section"> 누르면
  비슷한 지역 필터링된 피드를 보여주는 링크로 이동해야 함
  - **Query Params (선택)**
  - `kakaoPlaceId` → 특정 위치에 해당하는 피드만 필터링
  해당 기능 이용해서 하는건지. 
  지역구 badge도 이 기능 이용해서 하면 되는지?
*/

//  postComment(feedId, body) 마이데이터에서 users/me/nickname 불러와야 함.
// 현재 닉네임 author 익명으로 고정
/* 상태별 조회 시
```
GET https://sorimap.it.com/api/feeds/status/{status}
```
- **Path Variable → 대문자여야함.**
    - `status`: `OPEN` (미해결) 기본값| `IN_PROGRESS` (해결중)| `RESOLVED` (해결완료)
*/

/*
단건 조회 
GET https://sorimap.it.com/api/feeds/api/feeds/{id}
*/

/* 공감 기능 Reaction API
POST https://sorimap.it.com/api/reactions/like?feedId={피드ID}

- **요청 파라미터 (QueryParam)**
    - `feedId`: 공감할 피드의 ID (예: 1, 2, 3 …)
- **요청 쿠키 (Cookie)**
    - `ACCESS-TOKEN`: 로그인 후 발급받은 JWT 토큰
  reaction 버튼 누를 시, 공감 완료
  한 번 더 중복으로 누를 시, 이미 공감하였습니다
*/

document.addEventListener("DOMContentLoaded", () => {
  // --- 뒤로가기 버튼 ---
  document.querySelector(".header").addEventListener("click", () => {
    window.history.back();
  });

  // --- 토큰 쿠키 ---
  function getAccessTokenFromCookie() {
    const cookies = document.cookie.split("; ");
    for (const c of cookies) {
      if (c.startsWith("ACCESS-TOKEN=")) {
        return c.split("=")[1];
      }
    }
    return null;
  }

  // 상세페이지 내 DOM 요소
  const commentInput = document.querySelector(".comment-input");
  const sendBtn = document.querySelector(".comment-send-btn");
  const sendSvgPath = sendBtn.querySelector("svg path");
  const commentList = document.getElementById("comment-list");
  const noComment = document.getElementById("no-comment");
  const likeBtn = document.querySelector(".like-btn");
  const likeCountSpan = document.querySelector(".card-like span");
  const feedListContainer = document.querySelector(".card-list");

  // URL에서 feedId와 kakaoPlaceId 가져오기 (kakaoPlaceId용 변수 추가)
  const urlParams = new URLSearchParams(window.location.search);
  const feedId = urlParams.get("id") || "1";
  let kakaoPlaceId = null; // 상세 피드별 kakaoPlaceId 이후에 세팅 예정

  // 더미 피드
  const dummyFeeds = [
    {
      id: "1",
      title: "모란역 쓰레기 문제",
      content: "쓰레기가 쌓여서 냄새가 심해요",
      type: "MINWON",
      sentiment: "NEGATIVE",
      status: "OPEN",
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
      sentiment: "POSITIVE",
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
      sentiment: "NEGATIVE",
      status: "IN_PROGRESS",
      address: "성남시 분당구 판교로",
      lat: 37.3957,
      lng: 127.1103,
      kakaoPlaceId: "3456789012",
      likes: 3,
      imageUrls: ["./image/drain.jpg"],
    },
  ];

  // 더미 댓글
  const comments = [
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

  // 문서 로드 직후 더미 댓글 렌더링
  renderComments(comments);

  // --- 상세 피드 렌더링 ---
  function renderFeedDetail(feed) {
    document.querySelector(".post-title").textContent = feed.title;
    document.querySelector(".post-desc").textContent = feed.content;
    document.querySelector(".location-bar span").textContent = feed.address;
    if (feed.imageUrls && feed.imageUrls.length > 0) {
      const imgElem = document.querySelector(".post-img");
      imgElem.src = feed.imageUrls[0];
      imgElem.alt = feed.title;
    }
    likeCountSpan.textContent = feed.likes || 0;
    kakaoPlaceId = feed.kakaoPlaceId || null;
  }

  // --- 댓글 렌더링 ---
  function renderComments(comments) {
    if (!comments || comments.length === 0) {
      commentList.style.display = "none";
      noComment.style.display = "flex";
      updateCommentCountUI(0);
      return;
    }
    commentList.innerHTML = "";
    comments.forEach((c) => {
      const el = document.createElement("div");
      el.className = "comment-item";
      el.innerHTML = `
        <span class="comment-profile-dot"></span>
        <div class="comment-content">
          <div class="comment-top">
            <span class="comment-author">${c.author}</span>
            <span class="comment-time">${new Date(
              c.createdAt
            ).toLocaleString()}</span>
          </div>
          <div class="comment-text">${c.body}</div>
        </div>`;
      commentList.appendChild(el);
    });
    commentList.style.display = "block";
    noComment.style.display = "none";
    updateCommentCountUI(comments.length);
  }

  // 댓글 개수 UI 업데이트
  function updateCommentCountUI(count) {
    document
      .querySelectorAll(".card-comment span")
      .forEach((e) => (e.textContent = count));
    const commentTitleSpan = document.querySelector(".comment-title span");
    if (commentTitleSpan) commentTitleSpan.textContent = count;
  }

  // 댓글 입력 상태에 따른 전송 버튼 상태 변경
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

  // 댓글 등록 API 호출
  async function postComment(feedId, body) {
    try {
      const response = await fetch("https://sorimap.it.com/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedId, body }),
      });
      if (!response.ok) throw new Error("댓글 등록 실패");
      return await response.json();
    } catch (e) {
      alert(e.message);
      return null;
    }
  }

  // 댓글 조회 API 호출
  async function fetchComments(feedId) {
    try {
      const response = await fetch(
        `https://sorimap.it.com/api/comments/${feedId}`,
        { method: "GET" }
      );
      if (!response.ok) throw new Error("댓글 조회 실패");
      const data = await response.json();
      comments = data.map((c) => ({
        author: c.userNickname || '익명', // 서버 userNickname을 author에 사용, 없으면 익명 처리
        body: c.body,
        createdAt: c.createdAt,
      }));
      const commentCount = comments.length;
      console.log('댓글 수:', commentCount);
      renderComments(comments);
    } catch (e) {
      console.error(e);
      renderComments(comments);
    }
  }

  // --- 피드 상세 API 호출 ---
  async function loadFeedDetail(feedId) {
    try {
      const response = await fetch(
        `https://sorimap.it.com/api/feeds/${feedId}`
      );
      if (!response.ok) throw new Error("피드 상세 조회 실패");
      const feed = await response.json();
      renderFeedDetail(feed);
      fetchComments(feedId);
      loadNearbyFeeds(feed.kakaoPlaceId, feedId);
    } catch {
      // 오류 시 더미 데이터 렌더링
      const feed =
        dummyFeeds.find((f) => f.id.toString() === feedId) || dummyFeeds[0];
      renderFeedDetail(feed);
      fetchComments(feedId);
      loadNearbyFeeds(feed.kakaoPlaceId, feedId);
    }
  }

  // --- 근처 다른 이슈 로드 (kakaoPlaceId 기반) ---
  async function loadNearbyFeeds(kakaoPlaceId, currentFeedId) {
    if (!kakaoPlaceId) return;
    try {
      let url = `https://sorimap.it.com/api/feeds?kakaoPlaceId=${kakaoPlaceId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("근처 피드 조회 실패");
      let feeds = await response.json();

      // 현재 피드 제외
      feeds = feeds.filter((f) => f.id.toString() !== currentFeedId.toString());

      renderNearbyFeeds(feeds);
    } catch {
      // 오류 시 기본 더미배열 렌더링 (필요시 구현)
      renderNearbyFeeds(feeds);
    }
  }

  // --- 근처 이슈 렌더링 함수 ---
  function renderNearbyFeeds(feeds) {
    feedListContainer.innerHTML = "";
    if (!feeds.length) {
      feedListContainer.innerHTML = "<p>근처 이슈가 없습니다.</p>";
      return;
    }
    feeds.forEach((feed) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";
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
        </div>
      `;
      card.addEventListener("click", () => {
        window.location.href = `community-detail.html?id=${feed.id}`;
      });
      feedListContainer.appendChild(card);
    });
  }

  // --- 공감 버튼 이벤트 처리 ---
  likeBtn.addEventListener("click", async () => {
    likeBtn.disabled = true;
    try {
      const response = await fetch(
        `https://sorimap.it.com/api/reactions/like?feedId=${feedId}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) throw new Error("공감 처리 실패");

      const text = await response.text();
      alert(text);

      if (text.includes("공감 완료")) {
        let count = parseInt(likeCountSpan.textContent, 10) || 0;
        likeCountSpan.textContent = count + 1;
      }
    } catch (e) {
      // API 호출 실패 시 여기서 대체 처리
      alert(
        "서버와 연결할 수 없어 더미 데이터를 기준으로 좋아요가 증가합니다."
      );

      // 더미 데이터 업데이트 예시 (현재 화면 좋아요수 1 증가)
      let count = parseInt(likeCountSpan.textContent, 10) || 0;
      likeCountSpan.textContent = count + 1;

      // 필요시 여기에 더미 데이터 배열 등 실제 좋아요 수 동기화 코드 추가 가능
    } finally {
      likeBtn.disabled = false;
    }
  });

  // --- 댓글 전송 버튼 및 입력 상태 처리 ---
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

  async function addComment() {
    const val = commentInput.value.trim();
    if (val.length === 0) return;

    sendBtn.disabled = true;

    // 입력값 먼저 비우고 버튼 비활성화 & 상태 업데이트
    commentInput.value = '';
    updateSendBtnState();

    // 로컬에 댓글 즉시 추가 및 렌더링
    const newComment = {
      author: '익명',
      body: val,
      createdAt: new Date().toISOString(),
    };
    comments.push(newComment);
    renderComments(comments);

    // 서버에 댓글 전송
    const result = await postComment(feedId, val);

    if (result) {
      comments.push(result);
      renderComments(comments);
    } else {
      // 실패 시 사용자에게 알림 처리 가능
      alert('서버에 댓글 등록 실패, 로컬에만 저장되었습니다.');
    }

    sendBtn.disabled = false;
  }

  sendBtn.addEventListener("click", addComment);
  commentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addComment();
    }
  });
  commentInput.addEventListener("input", updateSendBtnState);

  // --- 초기 데이터 로드 ---
  if (feedId) {
    loadFeedDetail(feedId);
  } else {
    // feedId 없으면 예외처리: 더미 첫 피드 렌더링
    renderFeedDetail(dummyFeeds[0]);
    fetchComments(dummyFeeds[0].id);
    loadNearbyFeeds(dummyFeeds[0].kakaoPlaceId, dummyFeeds[0].id);
  }

  // 더미 카드 리스트
  function createCard(feed) {
    const card = document.createElement('div');
    card.className = 'card';
    const imageUrl =
      feed.imageUrls && feed.imageUrls.length > 0
        ? feed.imageUrls[0]
        : './image/default.jpg';
    card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${feed.imageUrls}" alt="${feed.title}" class="card-img" />
      <span class="card-arrow">
        <svg width="22" height="22" fill="none">
          <use xlink:href="#icon-arrow" />
        </svg>
      </span>
    </div>
    <div class="card-content">
      <div class="card-title-row">
        <div class="card-title">${feed.title}</div>
        <span class="card-like">
          <svg width="19" height="18" fill="none">
            <use xlink:href="#icon-like" />
          </svg> 
          <span>${feed.likes}</span>
        </span>
      </div>
      <div class="card-desc">
        <!-- 위치 SVG 아이콘(지도핀) -->
        <svg width="16" height="16" fill="none">
          <use xlink:href="#icon-location" />
        </svg>
        <span class="card-desc">${feed.address}</span>
      </div>
    `;
    return card;
  }

  function loadDummyFeeds() {
    const cardList = document.querySelector('.card-list');
    if (!cardList) return;
    dummyFeeds.forEach((feed) => {
      const card = createCard(feed);
      cardList.appendChild(card);
    });
  }

  loadDummyFeeds();
});
