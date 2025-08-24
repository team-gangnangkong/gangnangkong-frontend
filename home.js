// 글쓰기 버튼 클릭 시 write.html로 이동
document.getElementById('writeBtn').addEventListener('click', function () {
  window.location.href = 'write.html';
});

// .
// 여기 아래부터는 해결중인 민원 카드 슬라이드 기능 작업인데 필요없음
// .

// // 카드 최대 표시 개수
// const maxCardsToShow = 5;

// // 보여줄 카드 목록
// const cardsToRender = allCards.slice(0, maxCardsToShow);

// // 카드 리스트 container 선택
// const cardList = document.querySelector(".on-going-card-list");

// // 카드 생성 및 dom에 추가
// function createCards(cards) {
//   cardList.innerHTML = ""; // 초기화

//   cards.forEach((card) => {
//     const cardDiv = document.createElement("div");
//     cardDiv.classList.add("on-going-card");

//     cardDiv.innerHTML = `
//       <div class="on-going-card-img-wrap">
//         <img src="${card.img}" alt="${card.title}" class="on-going-card-img" />
//         <span class="on-going-badge">${card.badge}</span>
//       </div>
//       <div class="on-going-card-content">
//         <div class="on-going-card-title">${card.title}</div>
//         <div class="on-going-card-meta">${card.meta}</div>
//       </div>
//     `;

//     cardList.appendChild(cardDiv);
//   });
// }

// document.addEventListener("DOMContentLoaded", () => {
//   const slider = document.querySelector(".on-going-card-slider");
//   const cardList = slider.querySelector(".on-going-card-list");
//   const pagination = slider.querySelector(".on-going-pagination");

//   let currentIndex = 0;

//   // 카드 생성 및 append 함수
//   function createCards(cards) {
//     cardList.innerHTML = "";
//     cards.forEach((card) => {
//       const cardDiv = document.createElement("div");
//       cardDiv.classList.add("on-going-card");
//       cardDiv.innerHTML = `
//         <div class="on-going-card-img-wrap">
//           <img src="${card.img}" alt="${card.title}" class="on-going-card-img" />
//           <span class="on-going-badge">${card.badge}</span>
//         </div>
//         <div class="on-going-card-content">
//           <div class="on-going-card-title">${card.title}</div>
//           <div class="on-going-card-meta">${card.meta}</div>
//         </div>
//       `;
//       cardList.appendChild(cardDiv);
//     });
//   }

//   // 초기 카드 렌더링 (외부 데이터 배열 cardsToRender 필요)
//   createCards(cardsToRender);

//   // createCards 호출 후 cards 재선언
//   const cards = Array.from(cardList.querySelectorAll(".on-going-card"));

//   // 도트 생성 함수
//   function createDots() {
//     pagination.innerHTML = "";
//     for (let i = 0; i < cards.length; i++) {
//       const dot = document.createElement("span");
//       dot.classList.add("on-going-dot");
//       if (i === 0) dot.classList.add("active");
//       dot.dataset.index = i;
//       pagination.appendChild(dot);
//     }
//   }

//   // 도트 active 토글
//   function updateActiveDot(index) {
//     const dots = pagination.querySelectorAll(".on-going-dot");
//     dots.forEach((dot, i) => {
//       dot.classList.toggle("active", i === index);
//     });
//   }

//   // 슬라이드 이동 함수
//   function slideTo(index) {
//     if (index < 0) index = cards.length - 1;
//     if (index >= cards.length) index = 0;

//     currentIndex = index;
//     const cardWidth = cards[0].offsetWidth;
//     // 슬라이드 이동 (transform)
//     cardList.style.transition = "transform 0.3s ease";
//     cardList.style.transform = `translateX(${-cardWidth * index}px)`;
//     updateActiveDot(index);
//   }

//   // 도트 클릭 이벤트
//   pagination.addEventListener("click", (e) => {
//     if (e.target.classList.contains("on-going-dot")) {
//       const index = Number(e.target.dataset.index);
//       slideTo(index);
//     }
//   });

//   // 초기 값 세팅
//   createDots();
//   slideTo(0);
// });

// 초기 실행, 전체 피드 불러오기
loadFeeds();
