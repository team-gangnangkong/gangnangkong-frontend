// 민원 MINWON, 문화 MUNHWA

const writeForm = document.getElementById("feedForm");
let selectedType = "MINWON"; // 초기 카테고리

// ACCESS-TOKEN 쿠키에서 가져오는 함수
function getAccessTokenFromCookie() {
  const cookies = document.cookie.split("; ");
  for (const c of cookies) {
    if (c.startsWith("ACCESS-TOKEN=")) {
      return c.split("=")[1];
    }
  }
  return null;
}

// feed 작성 API 호출
async function createFeedWithImages(feedData, imageFiles) {
  try {
    const formData = new FormData();
    formData.append("feed", JSON.stringify(feedData));
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        formData.append("images", file);
      }
    }

    const response = await fetch("https://sorimap.it.com/api/feeds", {
      method: "POST",
      headers: {
        "ACCESS-TOKEN": getAccessTokenFromCookie(),
      },
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`피드 작성 실패: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("피드 작성 중 오류:", error);
    throw error;
  }
}
/*
1. 사용자가 글쓰기 페이지에서 "지도에서 찾기" 버튼 클릭 → map.html 새창(또는 모달) 열림

2. map.html에서 사용자가 지도에서 위치 선택 → selectLocation(address, lat, lng) 호출

3. selectLocation 함수가 window.opener.setLocation()을 통해 부모창(글쓰기 페이지)에 정보 전달, map.html은 닫힘

4.글쓰기 페이지의 setLocation이 input 값 채워줌
*/

// 지도창 열기
function openMap() {
  window.open("map.html", "mapWindow");
}

// 위치 (addressInput) 클릭 시 지도 열기
document.getElementById("addressInput").addEventListener("click", function (e) {
  openMap();
});

// 주소address 위도lat 경도lng 값 채우기
function setLocation(address, lat, lng) {
  document.querySelector("#addressInput").value = address;
  document.querySelector("#latInput").value = lat;
  document.querySelector("#lngInput").value = lng;
}

// 사용자가 위치를 선택했을 때 (map.js에서 선택한거 write.html로 불러옴)
function onPlaceSelected(address, lat, lng) {
  // 부모창(write.html)의 setLocation 함수 호출
  if (window.opener && typeof window.opener.setLocation === "function") {
    window.opener.setLocation(address, lat, lng);
    window.close(); // 선택 후 창 닫기
  } else {
    alert("위치 정보를 전달할 수 없습니다.");
  }
}

// 카테고리 버튼 토글 및 선택 상태 저장
const categoryBtns = Array.from(writeForm.querySelectorAll(".category-btn"));
categoryBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    categoryBtns.forEach((b) => {
      b.classList.remove("selected", "selected-culture");
    });
    btn.classList.add("selected");
    if (btn.dataset.type === "MUNHWA") {
      btn.classList.add("selected-culture");
    }
    selectedType = btn.dataset.type; // MINWON 또는 MUNHWA
    updateButtonColor();
  });
});

// 유효성 검사 대상 요소들
const titleInput = writeForm.querySelector('input[name="title"]');
const locationInput = writeForm.querySelector('input[name="address"]');
const photoInput = writeForm.querySelector('input[type="file"]');
const submitBtn = writeForm.querySelector(".submit-btn");

// 폼 유효성 검사 함수
function isFormValid() {
  const isTitle = titleInput.value.trim() !== "";
  const isCategory = categoryBtns.some((btn) =>
    btn.classList.contains("selected")
  );
  const isLocation = locationInput.value.trim() !== "";
  const isPhoto = photoInput.files && photoInput.files.length > 0;
  return isTitle && isCategory && isLocation && isPhoto;
}

// 버튼 상태 업데이트
function updateButtonColor() {
  if (isFormValid()) {
    submitBtn.style.background = "#F87171";
    submitBtn.style.color = "#fff";
    submitBtn.disabled = false;
  } else {
    submitBtn.style.background = "#FEF2F2";
    submitBtn.style.color = "#f43f5e";
    submitBtn.disabled = true;
  }
}

// 유효성 검사 이벤트 바인딩
[titleInput, locationInput].forEach((input) => {
  input.addEventListener("input", updateButtonColor);
});
categoryBtns.forEach((btn) => {
  btn.addEventListener("click", updateButtonColor);
});
photoInput.addEventListener("change", updateButtonColor);

// 폼 제출 이벤트
writeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isFormValid()) return;

  const feedData = {
    title: writeForm.title.value.trim(),
    content: writeForm.content.value.trim(),
    type: selectedType, // MINWON 또는 MUNHWA
    address: writeForm.address.value.trim(),
    lat: parseFloat(writeForm.lat?.value) || 0,
    lng: parseFloat(writeForm.lng?.value) || 0,
    locationId: parseInt(writeForm.locationId?.value, 10),
  };

  const images = writeForm.images.files;

  try {
    const createdFeed = await createFeedWithImages(feedData, images);
    alert("피드가 성공적으로 작성되었습니다!");
    console.log("작성 완료된 피드:", createdFeed);
    // 필요 시 리다이렉트 또는 초기화
  } catch (error) {
    alert("피드 작성 중 오류가 발생했습니다: " + error.message);
  }
});

// 초기 버튼 상태 설정
updateButtonColor();
