// community-detail.js 전체 코드 정리본

document.addEventListener("DOMContentLoaded", () => {
  // --- 뒤로가기 버튼 ---
  document.querySelector(".header").addEventListener("click", () => {
    window.history.back();
  });

  // --- 토큰 쿠키 ---
  function getAccessTokenFromCookie() {
    const cookies = document.cookie.split("; ");
    for (const c of cookies) {
      if (c.startsWith("ACCESS-TOKEN=")) return c.split("=")[1];
    }
    return null;
  }

  // DOM 요소
  const commentInput = document.querySelector(".comment-input");
  const sendBtn = document.querySelector(".comment-send-btn");
  const sendSvgPath = sendBtn.querySelector("svg path");
  const commentList = document.getElementById("comment-list");
  const noComment = document.getElementById("no-comment");
  const likeBtn = document.querySelector(".like-btn");
  const likeCountSpan = document.querySelector(".card-like span");
  const feedListContainer = document.querySelector(".card-list");

  // URL 파라미터
  const urlParams = new URLSearchParams(window.location.search);
  const feedId = urlParams.get("id") || "1";
  let kakaoPlaceId = null;

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

  let comments = []; // 빈 배열로 초기화해두면 더미 댓글 없어도 참조 가능

  // 댓글 로컬스토리지 키
  const LOCAL_STORAGE_COMMENT_KEY = "community_comments";
  // 좋아요 로컬스토리지 키
  const LOCAL_STORAGE_LIKES_KEY = "community_likes";

  // 댓글 로컬 읽기
  function loadCommentsFromLocalStorage(feedId) {
    const saved = localStorage.getItem(LOCAL_STORAGE_COMMENT_KEY);
    if (!saved) return [];
    try {
      const allComments = JSON.parse(saved);
      return allComments[feedId] || [];
    } catch {
      return [];
    }
  }
  // 댓글 로컬 저장
  function saveCommentsToLocalStorage(feedId, comments) {
    const saved = localStorage.getItem(LOCAL_STORAGE_COMMENT_KEY);
    let allComments = {};
    if (saved) {
      try {
        allComments = JSON.parse(saved);
      } catch {}
    }
    allComments[feedId] = comments;
    localStorage.setItem(
      LOCAL_STORAGE_COMMENT_KEY,
      JSON.stringify(allComments)
    );
  }

  // 좋아요 로컬 읽기
  function loadLikesFromLocalStorage() {
    const saved = localStorage.getItem(LOCAL_STORAGE_LIKES_KEY);
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  }
  // 좋아요 로컬 저장
  function saveLikesToLocalStorage(likesObj) {
    localStorage.setItem(LOCAL_STORAGE_LIKES_KEY, JSON.stringify(likesObj));
  }

  // 상세 피드 렌더링
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

  // 댓글 렌더링
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
        </div>
      `;
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
  }

  // 댓글 입력 상태 따른 전송 버튼 상태 변경
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
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("댓글 조회 실패");
      const data = await response.json();

      comments = data.map((c) => ({
        author: c.userNickname || "익명",
        body: c.body,
        createdAt: c.createdAt,
      }));

      // 로컬 댓글 병합
      const localComments = loadCommentsFromLocalStorage(feedId);
      comments = comments.concat(localComments);

      renderComments(comments);
    } catch (e) {
      console.error(e);
      comments = loadCommentsFromLocalStorage(feedId);
      renderComments(comments);
    }
  }

  // 근처 이슈 로드
  async function loadNearbyFeeds(kakaoPlaceId, currentFeedId) {
    if (!kakaoPlaceId) return;
    try {
      const url = `https://sorimap.it.com/api/feeds?kakaoPlaceId=${kakaoPlaceId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("근처 피드 조회 실패");

      let feeds = await response.json();
      feeds = feeds.filter((f) => f.id.toString() !== currentFeedId.toString());

      renderNearbyFeeds(feeds);
    } catch {
      // 오류 시 더미 데이터 렌더링
      renderNearbyFeeds(dummyFeeds);
    }
  }

  // 근처 이슈 렌더링
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

  // 좋아요 로컬 storage 함수
  function loadLikesFromLocalStorage() {
    const saved = localStorage.getItem(LOCAL_STORAGE_LIKES_KEY);
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  }

  function saveLikesToLocalStorage(likesObj) {
    localStorage.setItem(LOCAL_STORAGE_LIKES_KEY, JSON.stringify(likesObj));
  }

  // 좋아요 버튼 클릭 이벤트
  likeBtn.addEventListener("click", async () => {
    likeBtn.disabled = true;

    const likesData = loadLikesFromLocalStorage();
    const currentLikes = parseInt(likeCountSpan.textContent, 10) || 0;
    const isLiked = likesData[feedId]?.liked || false;

    if (isLiked) {
      alert("이미 공감한 게시물입니다.");
      likeBtn.disabled = false;
      return;
    }

    try {
      const response = await fetch(
        `https://sorimap.it.com/api/reactions/like?feedId=${feedId}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        if (text.includes("이미 공감하였습니다")) {
          alert("이미 공감한 게시물입니다.");
        } else {
          throw new Error("공감 처리 실패");
        }
        likeBtn.disabled = false;
        return;
      }

      const text = await response.text();
      alert(text);

      if (text.includes("공감 완료")) {
        const updatedLikesCount = currentLikes + 1;
        likeCountSpan.textContent = updatedLikesCount;
        likesData[feedId] = { liked: true, count: updatedLikesCount };
        saveLikesToLocalStorage(likesData);
      }
    } catch (e) {
      alert("서버 연결 실패, 로컬 기준 좋아요 1 증가 처리");

      const updatedLikesCount = currentLikes + 1;
      likeCountSpan.textContent = updatedLikesCount;
      likesData[feedId] = { liked: true, count: updatedLikesCount };
      saveLikesToLocalStorage(likesData);
    } finally {
      likeBtn.disabled = false;
    }
  });

  // 댓글 등록
  async function addComment() {
    const val = commentInput.value.trim();
    if (val.length === 0) return;

    sendBtn.disabled = true;
    commentInput.value = "";
    updateSendBtnState();

    const newComment = {
      author: "익명",
      body: val,
      createdAt: new Date().toISOString(),
    };

    comments.push(newComment);
    renderComments(comments);
    saveCommentsToLocalStorage(feedId, comments);

    const result = await postComment(feedId, val);
    if (result) {
      Object.assign(comments[comments.length - 1], {
        id: result.id,
        author: result.userNickname || "익명",
        createdAt: result.createdAt,
      });
      renderComments(comments);
      saveCommentsToLocalStorage(feedId, comments);
    } else {
      alert("서버에 댓글 등록 실패, 로컬에만 저장되었습니다.");
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

  // 댓글 입력 버튼 상태 업데이트
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

  // 상세 피드 데이터 로드 함수
  async function loadFeedDetail(feedId) {
    try {
      const response = await fetch(
        `https://sorimap.it.com/api/feeds/${feedId}`
      );
      if (!response.ok) throw new Error("피드 상세 조회 실패");
      const feed = await response.json();

      const likesData = loadLikesFromLocalStorage();
      const localLikeInfo = likesData[feedId];
      if (localLikeInfo) {
        feed.likes = Math.max(feed.likes || 0, localLikeInfo.count);
      }
      renderFeedDetail(feed);
      fetchComments(feedId);
      loadNearbyFeeds(feed.kakaoPlaceId, feedId);
    } catch {
      const feed =
        dummyFeeds.find((f) => f.id.toString() === feedId) || dummyFeeds[0];
      const likesData = loadLikesFromLocalStorage();
      const localLikeInfo = likesData[feedId];
      if (localLikeInfo) {
        feed.likes = Math.max(feed.likes || 0, localLikeInfo.count);
      }
      renderFeedDetail(feed);
      fetchComments(feedId);
      loadNearbyFeeds(feed.kakaoPlaceId, feedId);
    }
  }

  // 초기 로드
  if (feedId) {
    loadFeedDetail(feedId);
  } else {
    renderFeedDetail(dummyFeeds[0]);
    fetchComments(dummyFeeds[0].id);
    loadNearbyFeeds(dummyFeeds[0].kakaoPlaceId, dummyFeeds[0].id);
  }

  // 더미 카드 리스트 생성 (필요시)
  function createCard(feed) {
    const card = document.createElement("div");
    card.className = "card";
    const imageUrl =
      feed.imageUrls && feed.imageUrls.length > 0
        ? feed.imageUrls[0]
        : "./image/default.jpg";
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
          <svg width="16" height="16" fill="none">
            <use xlink:href="#icon-location" />
          </svg>
          <span class="card-desc">${feed.address}</span>
        </div>
      </div>
    `;
    return card;
  }

  function loadDummyFeeds() {
    const cardList = document.querySelector(".card-list");
    if (!cardList) return;
    dummyFeeds.forEach((feed) => {
      const card = createCard(feed);
      cardList.appendChild(card);
    });
  }

  loadDummyFeeds();
});
