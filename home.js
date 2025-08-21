// POST 요청
async function postFeed(formData, accessToken) {
  try {
    const response = await fetch("http://localhost:8080/api/feeds", {
      method: "POST",
      headers: {
        "ACCESS-TOKEN": accessToken,
      },
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("네트워크 응답이 이상합니다: " + response.statusText);
    }
    const data = await response.json(); // 응답
    return data;
  } catch (error) {
    console.error("피드 전송 중 오류 발생:", error);
    throw error;
  }
}

// 피드 등록 함수
async function submitFeed(accessToken) {
  // 각 입력값 가져오기 (querySelector 또는 getElementById 등 자유)
  const title = document.querySelector(".title-input").value;
  const content = document.querySelector(".content-input").value;
  const type = document.querySelector(".type-input").value;
  const address = document.querySelector(".address-input").value;
  const lat = parseFloat(document.querySelector(".lat-input").value);
  const lng = parseFloat(document.querySelector(".lng-input").value);
  const locationId = parseInt(
    document.querySelector(".locationId-input").value,
    10
  );
  const imagesInput = document.querySelector(".images-input");

  // feed 객체 생성하여 JSON문자열 변환
  const feedObj = {
    title,
    content,
    type,
    address,
    lat,
    lng,
    locationId,
  };
  const feedJSON = JSON.stringify(feedObj);

  // FormData 생성 및 값 넣기
  const formData = new FormData();
  formData.append("feed", feedJSON); // feed는 JSON string

  // 이미지 여러 장 첨부 (images라는 key로 여러 번 추가)
  if (imagesInput && imagesInput.files.length > 0) {
    for (let i = 0; i < imagesInput.files.length; i++) {
      formData.append("images", imagesInput.files[i]);
    }
  }

  // 전송 함수 호출 (ACCESS-TOKEN 필요)
  await postFeed(formData, accessToken);
}

// 글쓰기 버튼 클릭 시 write.html로 이동
document.getElementById("writeBtn").addEventListener("click", function () {
  window.location.href = "write.html";
});
