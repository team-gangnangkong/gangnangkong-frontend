// 글쓰기 버튼 클릭 시 write.html로 이동
document.getElementById("writeBtn").addEventListener("click", function () {
  window.location.href = "write.html";
});

const maxCardsToShow = 5;
const cardsToRender = allCards.slice(0, maxCardsToShow);

document.addEventListener("DOMContentLoaded", () => {
  const slider = document.querySelector(".on-going-card-slider");
  const cardList = slider.querySelector(".on-going-card-list");
  const cards = Array.from(cardList.querySelectorAll(".on-going-card"));
  const pagination = slider.querySelector(".on-going-pagination");

  let currentIndex = 0;

  // 1. 카드 개수에 따라 on-going-dot 생성
  function createDots() {
    pagination.innerHTML = ""; // 초기화
    for (let i = 0; i < cards.length; i++) {
      const dot = document.createElement("span");
      dot.classList.add("on-going-dot");
      if (i === 0) dot.classList.add("active");
      dot.dataset.index = i;
      pagination.appendChild(dot);
    }
  }

  // 2. 현재 보여지는 카드 on-going-dot active
  function updateActiveDot(index) {
    const dots = pagination.querySelectorAll(".on-going-dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  // 3. 좌우 슬라이드 기능
  function slideTo(index) {
    if (index < 0) index = cards.length - 1;
    else if (index >= cards.length) index = 0;

    currentIndex = index;
    const cardWidth = cards[0].offsetWidth;
    cardList.style.transform = `translateX(${-cardWidth * index}px)`;
    updateActiveDot(index);
  }

  // 도트 클릭 시 슬라이드 이동
  pagination.addEventListener("click", (e) => {
    if (e.target.classList.contains("on-going-dot")) {
      const index = Number(e.target.dataset.index);
      slideTo(index);
    }
  });

  // 마우스나 터치로 좌우 슬라이드 구현 (선택 사항)
  // 아래는 간단한 버튼 좌우 슬라이드 예제 추가 (버튼 직접 만들 경우)

  // 초기 설정
  createDots();
  slideTo(0);
});

// 초기 실행, 전체 피드 불러오기
loadFeeds();
