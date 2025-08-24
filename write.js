/*
카테고리와 감정색 연동
민원(MINWON)/문화(MUNHWA) 카테고리 버튼 OK

문화 선택 후 setMunhwaSentimentColor('POSITIVE'/'NEGATIVE') 호출해서 색상 동작,
(실제 AI 결과로 해당 함수 호출만 하면 됨)

위치 직접 선택 연동
addressInput 클릭 시 openMap() 작동 

setLocation 함수에서 주소, 위도, 경도 세팅

map.html(지도)에서 onPlaceSelected로 부모창에 값 전달

폼 유효성 검사 및 제출
제목, 카테고리, 위치, 사진 전부 검사 OK

submit 버튼 상태(색/활성화) 관리 OK

모두 입력 시만 업로드

전송 데이터 및 필드 체크
formData에 필수 정보(제목, 내용, 타입, 주소, lat, lng, kakaoPlaceId, 이미지) 모두 정상 포함

type: selectedType
→ **MINWON/MUNHWA(둘 다 대문자/백엔드와 일치!)**만 들어가면 정상

lat/lng는 hidden input으로 값 채워주기 필수 (여기서 잘 처리)

카테고리 버튼 중복 코드
질문 예시코드 내에서

categoryBtns.forEach(...) 클릭 이벤트 2번(위/아래) 중복으로 걸려있는데,

1군데(e.g. munhwaBtn, minwonBtn 따로 할 거면 아래쪽 코드만 쓰고 위쪽은 지워도 됩니다.)
*/

// 뒤로가기 버튼 기능

document.querySelector(".header svg").addEventListener("click", () => {

  window.history.back();
});

// 피드 작성 form
const writeForm = document.getElementById('feedForm');

// === 카테고리 버튼 관련 ===
const minwonBtn = document.getElementById('minwonBtn');
const munhwaBtn = document.getElementById('munhwaBtn');
const categoryBtns = [minwonBtn, munhwaBtn];

let selectedType = 'MINWON'; // 기본값

// 카테고리 버튼 클릭(토글 및 감정 색상 해제)
categoryBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    categoryBtns.forEach((b) =>
      b.classList.remove('selected', 'munhwa-positive', 'munhwa-negative')
    );
    btn.classList.add('selected');
    selectedType = btn.dataset.type;
    // 문화 선택 시(감정 분석 결과 대비, 초기 감정색 없앰)
    if (selectedType === 'MUNHWA') {
      // setMunhwaSentimentColor("POSITIVE" / "NEGATIVE")는
      // 실제 AI 로직에서 따로 호출해줍니다.
    }
    updateButtonColor();
  });
});

// === 위치 지도 연동 ===
function openMap() {
  window.open('map.html', 'mapWindow');
}
document.getElementById('addressInput').addEventListener('click', openMap);

function setLocation(address, lat, lng) {
  document.querySelector('#addressInput').value = address;
  document.querySelector('#latInput').value = lat;
  document.querySelector('#lngInput').value = lng;
}

// map.html → write.html 값 전달
function onPlaceSelected(address, lat, lng) {
  if (window.opener && typeof window.opener.setLocation === 'function') {
    window.opener.setLocation(address, lat, lng);
    window.close();
  } else {
    alert('위치 정보를 전달할 수 없습니다.');
  }
}

// === 감정 분석 결과(문화) 색상 반영 함수 ===
function setMunhwaSentimentColor(sentiment) {
  // 문화 버튼 선택 상태일 때만 적용
  munhwaBtn.classList.remove('munhwa-positive', 'munhwa-negative');
  if (selectedType === 'MUNHWA') {
    if (sentiment === 'POSITIVE') {
      munhwaBtn.classList.add('munhwa-positive');
    } else if (sentiment === 'NEGATIVE') {
      munhwaBtn.classList.add('munhwa-negative');
    }
  }
}

// === form 유효성 검사/상태제어 ===
const titleInput = writeForm.querySelector('input[name="title"]');
const locationInput = writeForm.querySelector('input[name="address"]');
const photoInput = writeForm.querySelector('input[type="file"]');

const photoUploadBox = document.querySelector(".photo-upload"); //사진 업로드 미리보기
const submitBtn = writeForm.querySelector(".submit-btn");


function isFormValid() {
  const isTitle = titleInput.value.trim() !== '';
  const isCategory = categoryBtns.some((btn) =>
    btn.classList.contains('selected')
  );
  const isLocation = locationInput.value.trim() !== '';
  const isPhoto = photoInput.files && photoInput.files.length > 0;
  return isTitle && isCategory && isLocation && isPhoto;
}

function updateButtonColor() {
  if (isFormValid()) {
    submitBtn.style.background = '#F87171';
    submitBtn.style.color = '#fff';
    submitBtn.disabled = false;
  } else {
    submitBtn.style.background = '#FEF2F2';
    submitBtn.style.color = '#f43f5e';
    submitBtn.disabled = true;
  }
}

// 유효성 검사 이벤트 바인딩
[titleInput, locationInput].forEach((input) => {
  input.addEventListener('input', updateButtonColor);
});
categoryBtns.forEach((btn) => {
  btn.addEventListener('click', updateButtonColor);
});
photoInput.addEventListener('change', updateButtonColor);

// === 피드 등록(이미지/데이터) ===
function getAccessTokenFromCookie() {
  const cookies = document.cookie.split('; ');
  for (const c of cookies) {
    if (c.startsWith('ACCESS-TOKEN=')) {
      return c.split('=')[1];
    }
  }
  return null;
}

// 피드 작성(글쓰기) api
async function createFeedWithImages(feedData, imageFiles) {
  try {
    const formData = new FormData();
    formData.append('feed', JSON.stringify(feedData));
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        formData.append('images', file);
      }
    }

    const response = await fetch('https://sorimap.it.com/api/feeds', {
      method: 'POST',
      headers: {
        'ACCESS-TOKEN': getAccessTokenFromCookie(),
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`피드 작성 실패: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('피드 작성 중 오류:', error);
    throw error;
  }
}

// 사진 미리보기 이미지 컨테이너 생성

let previewContainer = document.querySelector(".photo-preview");

photoInput.addEventListener("change", function () {
  // 최대 8개 제한
  const files = Array.from(photoInput.files);
  if (files.length > 8) {
    alert("사진은 최대 8장까지 업로드할 수 있습니다.");
    photoInput.value = ""; // 파일 선택 초기화
    previewContainer.innerHTML = "";

    updateButtonColor();
    return;
  }

  // 기존 미리보기 삭제

  previewContainer.innerHTML = "";

  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement("img");

      img.src = e.target.result;
      previewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

//제출버튼
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
    kakaoPlaceId: parseInt(writeForm.kakaoPlaceId?.value, 10),
  };
  const images = writeForm.images.files;

  try {
    const createdFeed = await createFeedWithImages(feedData, images);
    alert('피드가 성공적으로 작성되었습니다!');
    console.log('작성 완료된 피드:', createdFeed);
    // 리다이렉트/폼 초기화 등 필요에 따라 추가
  } catch (error) {
    alert('피드 작성 중 오류가 발생했습니다: ' + error.message);
  }
});

// === 초기 상태 세팅 ===
updateButtonColor();
