const API_BASE = 'https://sorimap.it.com';

const absolutize = (u) => {
  if (!u) return u;
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('http://')) return u.replace(/^http:\/\//, 'https://');
  if (u.startsWith('/')) return API_BASE + u;
  return u;
};

// 어떤 키로 오든 첫 이미지 뽑기
const firstImageUrl = (feed) => {
  const cand =
    feed?.imageUrl ??
    feed?.imageUrls?.[0] ?? // ["..."]
    feed?.images?.[0]?.url ?? // [{url:"..."}]
    feed?.images?.[0] ?? // ["..."]
    feed?.files?.[0]?.url ?? // [{url:"..."}]
    feed?.files?.[0]; // ["..."]
  return cand ? absolutize(cand) : null;
};

document.addEventListener('DOMContentLoaded', () => {
  const feedId = new URLSearchParams(location.search).get('feedId');
  if (!feedId)
    return (document.querySelector('#feed-detail').textContent =
      '잘못된 접근입니다.');
  fetchFeedDetail(feedId);
});

async function fetchFeedDetail(feedId) {
  try {
    const res = await fetch(`${API_BASE}/api/feeds/my/${feedId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('상세 조회 실패');
    const feed = await res.json();
    // console.log('[detail feed]', feed); // 필요시 확인
    renderFeedDetail(feed);
  } catch (e) {
    console.error(e);
    document.querySelector('#feed-detail').textContent =
      '상세를 불러오지 못했습니다.';
  }
}

function renderFeedDetail(feed) {
  const created = feed.createdAt || '';

  const imgSrc = firstImageUrl(feed) || './image/trash.jpg';
  const html = `
    <div class="meta">
      <span>${escapeHtml(feed.authorNickname || '작성자')}</span>
      <span>${escapeHtml(created)}</span>
    </div>

    <h2 class="detail-title">${escapeHtml(feed.title || '')}</h2>

    <img class="detail-img"
         src="${feed.imageUrl || './image/trash.jpg'}"
         alt="${escapeHtml(feed.title || '')}"/>

    <!-- 사진 아래: 위치 칩만 (상태 배지는 제거) -->
    <div class="place-row">
      <span class="chip">
        <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
          <path fill="#9CA3AF"
            d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5z"/>
        </svg>
        ${escapeHtml(feed.location || '위치 정보 없음')}
      </span>
    </div>

    <!-- 본문 -->
    <p class="detail-body">${nl2br(escapeHtml(feed.content || ''))}</p>

    <!-- 좋아요/댓글: 오른쪽 정렬, 간격 타이트 -->
    <div class="count-row">
      <button type="button" class="icon-count like" aria-label="좋아요">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <!-- 손바닥 부분(안쪽 사각형) -->
    <path
      d="M9 11v10H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    <!-- 엄지/바깥 라인 -->
    <path
      d="M9 11l4.2-7.2a2 2 0 0 1 3.7.9v5.3h3a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1.5H9V11Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
        <span>${feed.likeCount ?? 0}</span>
      </button>

      <button type="button" class="icon-count comment" aria-label="댓글">
        <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
          <path d="M12 3c5 0 9 3.7 9 8.2S17 19.5 12 19.5c-1.4 0-2.8-.3-4.1-.8L4 20l.8-3.1C4 15.4 3 13.9 3 11.2 3 6.7 7 3 12 3Z"
                fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="7.5" y1="10" x2="16.5" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="7.5" y1="13" x2="14.5" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>${feed.commentCount ?? 0}</span>
      </button>
    </div>

    <!-- 구분선 + 댓글 -->
    <hr class="section-sep" />
    <div class="comments">
      <h3 class="comment-title">댓글 ${feed.comments?.length ?? 0}</h3>
      ${
        Array.isArray(feed.comments) && feed.comments.length
          ? feed.comments
              .map(
                (c) => `
              <div class="comment">
                <div class="avatar">🐷</div>
                <div>
                  <div class="comment-head">
                    <span class="who">${escapeHtml(c.username || '익명')}</span>
                    <span class="when">${escapeHtml(c.createdAt || '')}</span>
                  </div>
                  <div>${escapeHtml(c.content || '')}</div>
                </div>
              </div>
            `
              )
              .join('')
          : `<div style="color:#9CA3AF;">댓글이 없어요.</div>`
      }
    </div>
  `;
  document.querySelector('#feed-detail').innerHTML = html;
}

function getStatus(s) {
  switch (s) {
    case 'OPEN':
      return { label: '미해결', className: 'open' };
    case 'WORKING':
      return { label: '해결중', className: 'working' };
    case 'DONE':
      return { label: '해결완료', className: 'done' };
    default:
      return { label: s || '상태없음', className: 'open' };
  }
}

function escapeHtml(str) {
  return String(str ?? '').replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])
  );
}
function nl2br(str) {
  return str.replace(/\n/g, '<br>');
}
