// q&ai.js

// ===== 엘리먼트 =====
const input = document.querySelector('.input-wrap input');
const app = document.querySelector('.app');

// ===== 오류 메시지 요소 생성 =====
const err = document.createElement('p');
err.className = 'email-error';
err.style.cssText = `
  margin: 8px 4px 0;
  width: 100%;
  text-align: center;
  font-size: 14px;
  color: #e74c3c;
  line-height: 1.4;
  display: none;
`;
err.setAttribute('role', 'alert');
err.setAttribute('aria-live', 'polite');
input.closest('.input-wrap').appendChild(err);

// ===== 검증 =====
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@g\.eulji\.ac\.kr$/i;

function validateEmail(v) {
  return EMAIL_RE.test(v.trim());
}

function showError(msg) {
  err.textContent = msg;
  err.style.display = 'block';
  input.setAttribute('aria-invalid', 'true');
  input.style.borderColor = '#e74c3c';
  input.style.boxShadow = '0 0 0 4px rgba(231,76,60,.02)';
}

function clearError() {
  err.textContent = '';
  err.style.display = 'none';
  input.removeAttribute('aria-invalid');
  input.style.borderColor = '#d6e3f6';
  input.style.boxShadow = 'none';
}

// ===== 가려짐 방지 (모바일 키보드 대응) =====
function ensureVisible(el) {
  const vv = window.visualViewport;
  const rect = el.getBoundingClientRect();
  const vh = vv ? vv.height : window.innerHeight;
  const topOffset = vv ? vv.offsetTop : 0;
  const bottomLimit = topOffset + vh - 12;
  const needsScroll = rect.bottom > bottomLimit || rect.top < topOffset + 12;
  if (needsScroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// 포커스 시: 오류 즉시 숨기고 가려짐 방지
input.addEventListener('focus', () => {
  clearError();
  setTimeout(() => ensureVisible(input), 150);
});

// 입력 시작 시: 실시간 검증 없이 오류만 즉시 숨김
input.addEventListener('input', () => {
  clearError();
});

// 키보드가 올라오며 뷰포트가 바뀔 때도 보이도록
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const kbOverlap = Math.max(
      0,
      (window.innerHeight || document.documentElement.clientHeight) -
        window.visualViewport.height
    );
    app.style.paddingBottom = kbOverlap
      ? Math.min(kbOverlap, 120) + 'px'
      : '0px';
    ensureVisible(input);
  });
}

// 엔터로 제출
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') trySubmit();
});

// ===== 제출(추후 백엔드 연동 지점) =====
async function trySubmit() {
  const value = input.value.trim();

  if (!validateEmail(value)) {
    showError('올바른 형식의 이메일을 입력하십시오');
    ensureVisible(input);
    return;
  }

  clearError();
  input.disabled = true;

  try {
    // TODO: 실제 API로 교체
    // const res = await fetch('/api/auth/verify-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email: value })
    // });
    // const data = await res.json();
    // if (!res.ok) throw new Error(data.message || '서버 오류');

    // 데모 지연
    await new Promise((r) => setTimeout(r, 400));
    console.log('Email OK -> backend 연동 위치:', value);

    // 다음 화면 이동 등
    // location.href = '/next.html';
  } catch (e) {
    console.error(e);
    showError('잠시 후 다시 시도해 주세요.');
  } finally {
    input.disabled = false;
  }
}
