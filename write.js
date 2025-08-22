const writeForm = document.getElementById("feedForm");
let selectedType = "COMPLAINT"; // 초기 카테고리

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

// 카테고리 버튼 토글 및 선택 상태 저장
const categoryBtns = Array.from(writeForm.querySelectorAll(".category-btn"));
categoryBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    categoryBtns.forEach((b) => {
      b.classList.remove("selected", "selected-culture");
    });
    btn.classList.add("selected");
    if (btn.dataset.type === "CULTURE") {
      btn.classList.add("selected-culture");
    }
    selectedType = btn.dataset.type;
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
    type: selectedType,
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
