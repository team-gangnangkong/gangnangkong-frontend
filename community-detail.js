/* 근처 다른 이슈 <div class="related-section"> 누르면
  비슷한 지역 필터링된 피드를 보여주는 링크로 이동해야 함
  - **Query Params (선택)**
  - `kakaoPlaceId` → 특정 위치에 해당하는 피드만 필터링
  해당 기능 이용해서 하는건지. 
  지역구 badge도 이 기능 이용해서 하면 되는지?
*/

// 뒤로가기 버튼 기능
document.querySelector('.header svg').addEventListener('click', () => {
  window.history.back();
});

// community 피드에서 보낸 피드 id 가져옴
// 상세 페이지(community-detail.html)에서 URL 쿼리에서 id 파라미터 추출
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const feedId = getQueryParam('id');

// 단건 조회 API
async function loadFeedDetail(feedId) {
  try {
    const response = await fetch(`https://sorimap.it.com/api/feeds/${feedId}`);
    if (!response.ok) throw new Error('피드 상세 조회 실패');
    const feed = await response.json();
    renderFeedDetail(feed); // 화면에 데이터 렌더링 함수 호출
  } catch (error) {
    console.error(error);
    // 적절한 에러 처리 UI
  }
}

if (feedId) {
  loadFeedDetail(feedId);
}

// 피드 상세 데이터 화면 렌더링
function renderFeedDetail(feed) {
  document.querySelector('.post-title').textContent = feed.title;
  document.querySelector('.post-desc').textContent = feed.content;
  document.querySelector('.location-bar span').textContent = feed.address;
  // 이미지, 좋아요 수, 상태, 작성자 등도 추가 렌더링
  if (feed.imageUrls && feed.imageUrls.length > 0) {
    const imgElem = document.querySelector('.post-img');
    imgElem.src = feed.imageUrls[0];
    imgElem.alt = feed.title;
  }
  // 좋아요 수
  document.querySelector('.like-count').textContent = feed.likes;
  // 기타 필요 정보 렌더링
}

// 댓글 조회 API 호출 및 화면 렌더링 연동
async function fetchComments(feedId) {
  try {
    const response = await fetch(
      `https://sorimap.it.com/api/comments/${feedId}`,
      {
        method: 'GET',
        credentials: 'omit', // 쿠키 없음
      }
    );
    if (!response.ok) throw new Error('댓글 조회 실패');
    const data = await response.json();
    comments = data.map((item) => ({
      author: '익명', // userId 기반 author 이름 필요 시 추가 구현
      body: item.body,
      createdAt: item.createdAt,
    }));
    renderComments();
  } catch (error) {
    alert(error.message);
  }
}

// 공감 누르기 API 호출 함수
async function postLike(feedId) {
  try {
    const response = await fetch(
      `https://sorimap.it.com/api/reactions/like?feedId=${feedId}`,
      {
        method: 'POST',
        credentials: 'include', // 쿠키(ACCESS-TOKEN) 포함
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) throw new Error('서버 오류');
    const result = await response.text();
    return result;
  } catch (error) {
    alert(error.message);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const commentInput = document.querySelector('.comment-input');
  const sendBtn = document.querySelector('.comment-send-btn');
  const sendSvgPath = sendBtn.querySelector('svg path');
  const commentList = document.getElementById('comment-list');
  const noComment = document.getElementById('no-comment');
  const commentTitle = document.getElementById('comment-title');
  const likeBtn = document.querySelector('.like-btn');
  const likeCountSpan = document.querySelector('.card-like span'); // 공감 숫자 부분
  const feedId = 1; // 실제 피드 ID로 교체
  fetchComments(feedId);

  let comments = []; // 댓글 배열

  // 시간 문자열 (몇 분 전)
  function formatTime(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    return diff <= 0 ? '방금 전' : `${diff}분 전`;
  }

  // 댓글 렌더링
  function renderComments() {
    if (comments.length === 0) {
      commentList.style.display = 'none';
      noComment.style.display = 'flex';
      commentTitle.textContent = '댓글 0';
    } else {
      commentList.innerHTML = '';
      comments.forEach((item) => {
        const el = document.createElement('div');
        el.className = 'comment-item';
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
      commentList.style.display = 'block';
      noComment.style.display = 'none';
      commentTitle.textContent = `댓글 ${comments.length}`;
    }
  }

  // 댓글 등록 API
  async function postComment(feedId, body) {
    try {
      const response = await fetch('https://sorimap.it.com/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 쿠키는 자동으로 전송되므로 따로 토큰 헤더는 필요없음 (또는 필요 시 Authorization 헤더 추가)
        },
        body: JSON.stringify({ feedId, body }),
        credentials: 'include', // 쿠키 포함 요청
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
        author: result.author || '을랑이', // 기본 작성자 이름
        body: result.body || val,
        createdAt: result.createdAt || new Date().toISOString(),
      });
      commentInput.value = '';
      updateSendBtnState();
      renderComments();
    }
  }

  // 공감 버튼
  likeBtn.addEventListener('click', async () => {
    likeBtn.disabled = true;
    const resultMsg = await postLike(feedId);
    likeBtn.disabled = false;
    if (resultMsg) {
      alert(resultMsg); // "공감 완료" 또는 "이미 공감하셨습니다."

      // "공감 완료"일 때만 카운트 증가
      if (resultMsg.includes('공감 완료')) {
        let count = parseInt(likeCountSpan.textContent, 10) || 0;
        likeCountSpan.textContent = count + 1;
      }
      // 중복 공감 시(이미 공감하셨습니다.) 카운트 변화 없음
    }
  });

  // 버튼 SVG 색 및 커서 상태 갱신
  // 이거 지금 안 됨
  function updateSendBtnState() {
    if (commentInput.value.trim().length > 0) {
      sendSvgPath.setAttribute('fill', '#F87171');
      sendBtn.style.cursor = 'pointer';
    } else {
      sendSvgPath.setAttribute('fill', '#9CA3AF');
      sendBtn.style.cursor = 'default';
    }
  }

  // 이벤트 바인딩
  sendBtn.addEventListener('click', addComment);
  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addComment();
    }
  });
  commentInput.addEventListener('input', updateSendBtnState);

  // 초기 렌더 및 상태 적용
  renderComments();
  updateSendBtnState();
});

// 근처 다른 이슈 피드 조회 용도
// community.js 내용 그대로 옮김
const feedListContainer = document.querySelector('.card-list');

/**
 * 피드 데이터를 받아서 카드 리스트에 렌더링
 * @param {Array} feeds - 피드 배열
 */
function renderFeeds(feeds) {
  feedListContainer.innerHTML = ''; // 초기화

  feeds.forEach((feed) => {
    const card = document.createElement('div');
    card.className = 'card';

    const imageUrl =
      feed.imageUrls && feed.imageUrls.length > 0
        ? feed.imageUrls[0]
        : './image/default.jpg';

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
    let url = 'https://sorimap.it.com/api/feeds';

    if (kakaoPlaceId) {
      url += `?kakaoPlaceId=${kakaoPlaceId}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('전체 피드 조회 실패: ' + response.status);
    }
    const feeds = await response.json();
    renderFeeds(feeds);
  } catch (error) {
    console.error('피드 불러오기 에러:', error);
    feedListContainer.innerHTML =
      '<p>전체 피드를 불러오는 중 오류가 발생했습니다.</p>';
  }
}
