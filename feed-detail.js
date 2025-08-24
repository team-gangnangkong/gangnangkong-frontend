const API_BASE = ''; // 필요하면 'http://localhost:8080'

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
    renderFeedDetail(feed);
  } catch (e) {
    console.error(e);
    document.querySelector('#feed-detail').textContent =
      '상세를 불러오지 못했습니다.';
  }
}

function renderFeedDetail(feed) {
  const created = feed.createdAt || '';
  const statusInfo = getStatus(feed.status);
  const html = `
    <div class="meta">
      <span>${escapeHtml(feed.authorNickname || '작성자')}</span>
      <span>${escapeHtml(created)}</span>
    </div>

    <h2 class="detail-title">${escapeHtml(feed.title || '')}</h2>

    <img class="detail-img" src="${
      feed.imageUrl || './image/trash.jpg'
    }" alt="${escapeHtml(feed.title || '')}"/>

    <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0 6px;">
    <span class="chip">
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 21s-6.5-4.97-6.5-10.5A6.5 6.5 0 1 1 18.5 10.5C18.5 16.03 12 21 12 21Z" stroke="#9CA3AF" stroke-width="1.5"/>
    <circle cx="12" cy="10.5" r="2.5" fill="#9CA3AF"/>
  </svg>
  ${escapeHtml(feed.location || '위치 정보 없음')}
</span>
      <span class="status ${statusInfo.className}">${statusInfo.label}</span>
    </div>

    <p style="margin:10px 0 16px;line-height:1.6;">${nl2br(
      escapeHtml(feed.content || '')
    )}</p>

    <div class="counts">
      <span>❤ ${feed.likeCount ?? 0}</span>
      <span>💬 ${feed.commentCount ?? 0}</span>
    </div>

    <div class="comments">
      <h3 style="font-size:16px;margin:18px 0 8px;">댓글 ${
        feed.comments?.length ?? 0
      }</h3>
      ${
        Array.isArray(feed.comments) && feed.comments.length
          ? feed.comments
              .map(
                (c) => `
            <div class="comment">
              <div>🐷</div>
              <div>
                <div><span class="who">${escapeHtml(
                  c.username || '익명'
                )}</span> <span style="color:#9CA3AF;font-size:12px;">${escapeHtml(
                  c.createdAt || ''
                )}</span></div>
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
