/**
 * 전역 상태 관리
 */
let timerInterval = null;
let timeLeft = 0;
let totalSetTime = 0;
let isPaused = false;
let isRunning = false;
let plantData = [];
let currentPlant = null;

// DOM 요소 참조 객체
const els = {
    setup: document.getElementById('setup-area'),
    focus: document.getElementById('focus-area'),
    minIn: document.getElementById('min-input'),
    secIn: document.getElementById('sec-input'),
    display: document.getElementById('timer-display'),
    img: document.getElementById('plant-image'),
    status: document.getElementById('status-text'),
    modal: document.getElementById('inventory-modal'),
    invList: document.getElementById('inventory-list'),
    empty: document.getElementById('empty-msg')
};

/**
 * [초기화] 데이터 로드 및 이벤트 바인딩
 */
async function init() {
    try {
        // plants.json 파일 로드[cite: 2]
        const res = await fetch('plants.json');
        if (!res.ok) throw new Error("파일을 찾을 수 없습니다.");
        const data = await res.json();
        plantData = data.plantTypes;
    } catch (e) {
        console.error("데이터 로드 실패. 서버 환경(Live Server 등)에서 실행 중인지 확인하세요.[cite: 3]");
        els.status.innerText = "Data Load Failed";
    }

    // 버튼 클릭 이벤트 바인딩[cite: 3]
    document.getElementById('start-btn').onclick = startFocus;
    document.getElementById('pause-btn').onclick = togglePause;
    document.getElementById('giveup-btn').onclick = handleGiveUp;
    document.getElementById('open-inventory-btn').onclick = () => toggleModal(true);
    document.getElementById('close-inventory-btn').onclick = () => toggleModal(false);

    // 모달 바깥 클릭 시 닫기[cite: 3]
    window.onclick = (e) => { if(e.target === els.modal) toggleModal(false); };
}

/**
 * [타이머 시작] 설정 -> 집중 화면 전환
 */
function startFocus() {
    const mins = parseInt(els.minIn.value) || 0;
    const secs = parseInt(els.secIn.value) || 0;
    timeLeft = (mins * 60) + secs;

    // 1. 시간 설정 확인[cite: 3]
    if (timeLeft <= 0) {
        alert("시간을 설정해주세요!");
        return;
    }

    // 2. 데이터 로드 확인 (중요: 이 부분이 비어있으면 실행 안 됨)[cite: 3]
    if (plantData.length === 0) {
        alert("식물 데이터를 불러오는 중입니다. 잠시 후 다시 시도하거나 서버 환경을 확인하세요.");
        return;
    }

    // 랜덤 식물 선정 및 상태 초기화[cite: 3]
    currentPlant = plantData[Math.floor(Math.random() * plantData.length)];
    totalSetTime = timeLeft;
    isRunning = true;
    isPaused = false;

    // UI 전환[cite: 3, 4]
    els.setup.classList.add('hidden');
    els.focus.classList.remove('hidden');
    els.status.innerText = `${currentPlant.name} 성장을 시작합니다!`;
    
    updateTimerUI();

    // 기존 타이머가 있다면 제거 후 새로 시작[cite: 3]
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
}

/**
 * [타이머 갱신] 1초마다 실행
 */
function tick() {
    if (isPaused) return;

    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        handleComplete();
    }
}

/**
 * [UI 업데이트] 시간 및 식물 성장 단계 반영
 */
function updateTimerUI() {
    // 1. 시간 텍스트 업데이트[cite: 3]
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    els.display.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    // 2. 식물 이미지 단계 업데이트 (전체 시간 대비 남은 시간 비율 계산)[cite: 3]
    const progress = ((totalSetTime - timeLeft) / totalSetTime) * 100;
    const stageCount = currentPlant.stages.length;
    let stageIdx = Math.floor((progress / 100) * stageCount);
    
    if (stageIdx >= stageCount) stageIdx = stageCount - 1;
    els.img.src = currentPlant.stages[stageIdx];
}

/**
 * [제어 기능] 멈추기, 포기하기, 완료
 */
function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pause-btn');
    btn.innerText = isPaused ? "RESUME" : "STOP";
    els.status.innerText = isPaused ? "잠시 멈춤" : "집중 유지 중...";
}

function handleGiveUp() {
    if (confirm("정말 포기하시겠습니까? 지금까지의 성장이 사라집니다.[cite: 3]")) {
        clearInterval(timerInterval);
        resetToMain();
    }
}

function handleComplete() {
    const finalImg = currentPlant.stages[currentPlant.stages.length - 1];
    els.img.src = finalImg;
    els.status.innerText = "성장 완료! 수집되었습니다.";

    setTimeout(() => {
        saveToInventory({ name: currentPlant.name, img: finalImg });
        alert(`${currentPlant.name} 수집 완료![cite: 3]`);
        resetToMain();
    }, 1000);
}

function resetToMain() {
    isRunning = false;
    els.focus.classList.add('hidden');
    els.setup.classList.remove('hidden');
    document.getElementById('pause-btn').innerText = "STOP";
}

/**
 * [데이터 관리] 로컬 스토리지 저장 및 도감 출력
 */
function toggleModal(show) {
    if (show) renderInventory();
    els.modal.classList.toggle('hidden', !show);
}

function saveToInventory(obj) {
    const inv = JSON.parse(localStorage.getItem('pixel_inv_v2') || "[]");
    inv.push(obj);
    localStorage.setItem('pixel_inv_v2', JSON.stringify(inv));
}

function renderInventory() {
    const inv = JSON.parse(localStorage.getItem('pixel_inv_v2') || "[]");
    els.empty.classList.toggle('hidden', inv.length > 0);
    els.invList.innerHTML = inv.map(p => `
        <div class="collected-item"><img src="${p.img}" title="${p.name}"></div>
    `).join('');
}

/**
 * [외부 함수] 설정 화면 시간 화살표 조절
 */
window.adjustTime = (type, amt) => {
    const input = (type === 'min') ? els.minIn : els.secIn;
    let val = parseInt(input.value) + amt;
    const max = (type === 'min') ? 99 : 59;

    if (val < 0) val = max;
    if (val > max) val = 0;
    
    input.value = String(val).padStart(2, '0');
};

// 앱 시작[cite: 3]
init();