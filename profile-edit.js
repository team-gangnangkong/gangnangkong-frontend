// === 닉네임 변경 기능 ===
const nicknameInput = document.getElementById("nickname-input");
const clearBtn = document.getElementById("clear-btn");
const errorMsg = document.getElementById("nickname-error");
const submitBtn = document.getElementById("submit-btn");

function validateNickname(value) {
  return value.length >= 2 && value.length <= 10;
}
function updateNicknameState() {
  const val = nicknameInput.value.trim();
  if (!validateNickname(val)) {
    errorMsg.textContent = "닉네임은 2-10자로 입력해 주세요.";
    submitBtn.classList.remove("active");
    submitBtn.disabled = true;
  } else {
    errorMsg.textContent = "";
    submitBtn.classList.add("active");
    submitBtn.disabled = false;
  }
}

// 입력/지우기 이벤트
nicknameInput.addEventListener("input", updateNicknameState);
clearBtn.addEventListener("click", () => {
  nicknameInput.value = "";
  nicknameInput.focus();
  updateNicknameState();
});

// ✅ 닉네임 변경 서버 요청
async function changeNickname(newNickname) {
  try {
    const response = await fetch("/api/users/me/nickname", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 쿠키(ACCESS-TOKEN) 자동 전송
      body: JSON.stringify({ nickname: newNickname }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "닉네임 변경 실패");
    }

    alert("닉네임이 정상적으로 변경되었습니다!");
  } catch (error) {
    console.error(error);
    errorMsg.textContent =
      error.message || "닉네임 변경 중 오류가 발생했습니다.";
  }
}

// 제출 버튼 클릭 시 → 서버 요청
submitBtn.addEventListener("click", function () {
  if (submitBtn.disabled) return;
  const newNickname = nicknameInput.value.trim();
  changeNickname(newNickname);
});

// === 프로필 이미지 (카메라 버튼) 바텀시트 ===
const sheet = document.getElementById("sheet");
const albumBtn = document.getElementById("album-btn");
const closeBtn = document.getElementById("close-btn");
const profileImgWrap = document.querySelector(".profile-img-wrap");
const albumInput = document.getElementById("album-input");

// 1. 프로필(사진/카메라) 누르면 시트 열림
profileImgWrap.addEventListener("click", function () {
  sheet.style.display = "flex";
});

// 2. 닫기 버튼
closeBtn.addEventListener("click", function () {
  sheet.style.display = "none";
  albumBtn.classList.remove("selected");
});

// 3. 앨범에서 선택 버튼 눌렀을 때 시각 효과
function activateAlbumBtn() {
  albumBtn.classList.add("selected");
}
function deactivateAlbumBtn() {
  setTimeout(() => albumBtn.classList.remove("selected"), 180);
}

// 4. "앨범에서 선택" 버튼 누르면 파일 선택창 띄우기
albumBtn.addEventListener("click", function () {
  albumInput.click();
});

albumBtn.addEventListener("mousedown", activateAlbumBtn);
albumBtn.addEventListener("mouseup", deactivateAlbumBtn);
albumBtn.addEventListener("touchstart", activateAlbumBtn);
albumBtn.addEventListener("touchend", deactivateAlbumBtn);

// === 프로필 이미지 파일 선택 처리 및 서버 업로드 ===
albumInput.addEventListener("change", async function () {
  const file = albumInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("profileImage", file); // key는 API에 맞게 변경 필요 시 조정

  try {
    const response = await fetch("/api/users/me/profile-image", {
      method: "PATCH",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "프로필 이미지 변경 실패");
    }

    const data = await response.json();

    // 성공 시 이미지 URL로 프로필 사진 즉시 변경
    profileImg.src = data.imageUrl;

    // 바텀시트 닫기 및 이미지 선택 초기화
    sheet.style.display = "none";
    albumInput.value = "";

    alert(data.message || "프로필 이미지가 정상적으로 변경되었습니다.");
  } catch (error) {
    console.error(error);
    alert(error.message || "프로필 이미지 변경 중 오류가 발생했습니다.");
  }
});

// === 초기상태 적용 ===
updateNicknameState();
