import "./community.js";

// 내가 작성한 피드 상세 조회 API 호출 및 화면 표시

async function fetchFeedDetail(feedId) {
  try {
    const response = await fetch(`/api/feeds/my/${feedId}`, {
      method: "GET",
      credentials: "include", // 쿠키 포함
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("피드 상세 조회 실패");
    }

    const feed = await response.json();
    renderFeedDetail(feed);
  } catch (error) {
    console.error(error);
    document.querySelector(
      "#feed-detail"
    ).innerHTML = `<p>피드 상세정보를 불러오는 중 오류가 발생했습니다.</p>`;
  }
}

function renderFeedDetail(feed) {
  const container = document.querySelector("#feed-detail");
  container.innerHTML = `
    <h2>${feed.title}</h2>
    <p><strong>위치:</strong> ${feed.location}</p>
    <img src="${feed.imageUrl}" alt="${
    feed.title
  }" style="max-width: 100%; height: auto;"/>
    <p>${feed.content}</p>
    <p><strong>상태:</strong> ${formatStatus(feed.status)}</p>
    <p><strong>작성일:</strong> ${feed.createdAt}</p>
    <p><strong>좋아요 수:</strong> ${
      feed.likeCount
    } | <strong>댓글 수:</strong> ${feed.commentCount}</p>
    <p><strong>작성자:</strong> ${feed.authorNickname}</p>
    <h3>댓글</h3>
    <ul>
      ${feed.comments
        .map(
          (comment) => `
        <li>
          <strong>${comment.username}</strong> (${formatDate(
            comment.createdAt
          )}): 
          ${comment.content}
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

function formatStatus(status) {
  switch (status) {
    case "OPEN":
      return "미해결";
    case "WORKING":
      return "해결중";
    case "DONE":
      return "해결완료";
    default:
      return status;
  }
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

// feedId는 호출 시점에 실제 피드 ID로 변경해 주세요
// 예: fetchFeedDetail(1);

// 상세 피드 1번 호출
document.addEventListener("DOMContentLoaded", () => {
  fetchFeedDetail(1);
});
