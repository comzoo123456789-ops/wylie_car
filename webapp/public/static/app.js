// WYLIE Car System - Frontend Logic
lucide.createIcons();

// 2026년 대한민국 공휴일 및 기념일 (대체공휴일, 지방선거일, 제헌절 포함)
const holidays2026 = {
    "01-01": "신정",
    "02-16": "설날", "02-17": "설날", "02-18": "설날", "02-19": "대체공휴일",
    "03-01": "삼일절", "03-02": "대체공휴일",
    "05-05": "어린이날",
    "05-24": "부처님오신날", "05-25": "대체공휴일",
    "06-03": "지방선거일",
    "06-06": "현충일",
    "07-17": "제헌절",
    "08-15": "광복절", "08-17": "대체공휴일",
    "09-24": "추석", "09-25": "추석", "09-26": "추석", "09-27": "대체공휴일",
    "10-03": "개천절", "10-05": "대체공휴일",
    "10-09": "한글날",
    "12-25": "성탄절"
};

// 로컬 스토리지 키
const STORAGE_KEY = 'wylie_car_vFinal_vX';

const DEFAULT_CARS = [
    { id: 1, num: "187너4662", model: "제네시스 G90", user: "이재욱", insFee: "2,340,000", insDate: "2026-12-31", rentFee: "1,050,000", startKm: 128765, commuteKm: 10, logs: {}, maint: [], currentPhoto: null }
];

let cars = loadCars();
let currentCarId = cars[0] ? cars[0].id : 1;
let currentMonth = 5;
let currentYear = 2026;

function loadCars() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach(c => {
                    if (!c.logs) c.logs = {};
                    if (!c.maint) c.maint = [];
                    if (!c.insDate) c.insDate = "";
                    if (c.currentPhoto === undefined) c.currentPhoto = null;
                });
                return parsed;
            }
        }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CARS));
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
    } catch (e) {
        console.error('저장 실패 (용량 초과 가능):', e);
        alert('저장 실패 - 사진 용량이 너무 큰 경우 일부 데이터가 저장되지 않을 수 있습니다.');
    }
}

// logs 구조 헬퍼: {data: [...], photo: base64, timestamp?: number}
function getLogEntry(car, month) {
    const entry = car.logs[month];
    if (!entry) return null;
    if (Array.isArray(entry)) return { data: entry, photo: null, timestamp: null };
    return entry;
}

function getLogData(car, month) {
    const entry = getLogEntry(car, month);
    return entry ? (entry.data || []) : [];
}

// 휴일 판단
function isHolidayDay(month, day) {
    const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holidayName = holidays2026[dateKey];
    const dow = new Date(currentYear, month - 1, day).getDay();
    const isWeekend = (dow === 0 || dow === 6);
    return {
        isHoliday: !!holidayName || isWeekend,
        name: holidayName || (isWeekend ? (dow === 0 ? '일요일' : '토요일') : '')
    };
}

// 탭 전환
function tab(name) {
    ['view-log', 'view-maint', 'view-admin'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(`view-${name}`).classList.remove('hidden');

    ['tab-log', 'tab-maint', 'tab-admin'].forEach(id => {
        const btn = document.getElementById(id);
        btn.classList.toggle('text-blue-700', id === `tab-${name}`);
        btn.classList.toggle('text-gray-400', id !== `tab-${name}`);
    });

    if (name === 'admin') renderAdmin();
    if (name === 'maint') renderMaint();

    setTimeout(() => lucide.createIcons(), 0);
}

// 차량 탭 렌더링
function renderTabs() {
    const container = document.getElementById('car-tabs');
    container.innerHTML = cars.map(c => `
        <button onclick="selectCar(${c.id})" class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all ${currentCarId === c.id ? 'bg-[#1a237e] text-white shadow-lg' : 'bg-gray-100 text-gray-400'}">
            ${c.num}
        </button>
    `).join('');
    updateUI();
}

function updateUI() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    document.getElementById('card-model').innerText = `${car.model} (${car.num})`;
    document.getElementById('card-user').innerText = car.user;
    document.getElementById('card-ins-fee').innerText = car.insFee + "원";
    document.getElementById('card-ins-date').innerText = car.insDate || '-';
    document.getElementById('card-rent').innerText = car.rentFee + "원";
    document.getElementById('card-start-km').innerText = Number(car.startKm).toLocaleString();
    document.getElementById('card-commute').innerText = car.commuteKm;
    document.getElementById('month-display').innerText = currentMonth;

    const maintTitle = document.getElementById('maint-title-display');
    if (maintTitle) maintTitle.innerText = `${car.num} 정비 내역`;

    const preview = document.getElementById('photo-preview');
    if (preview) {
        if (car.currentPhoto) {
            preview.style.backgroundImage = `url(${car.currentPhoto})`;
            preview.classList.remove('hidden');
        } else {
            preview.style.backgroundImage = '';
            preview.classList.add('hidden');
        }
    }

    const finalInput = document.getElementById('final-km-input');
    if (finalInput) finalInput.value = '';

    renderTable();
    renderSavedPhoto();
}

function renderSavedPhoto() {
    const car = cars.find(c => c.id === currentCarId);
    const area = document.getElementById('saved-photo-area');
    const img = document.getElementById('saved-photo-img');
    const timeEl = document.getElementById('saved-photo-time');
    if (!area || !img) return;

    const entry = getLogEntry(car, currentMonth);
    if (entry && entry.photo) {
        img.src = entry.photo;
        if (entry.timestamp) {
            const d = new Date(entry.timestamp);
            timeEl.innerText = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } else {
            timeEl.innerText = '저장됨';
        }
        area.classList.remove('hidden');
    } else {
        area.classList.add('hidden');
    }
}

// 사진 미리보기
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const car = cars.find(c => c.id === currentCarId);
            car.currentPhoto = e.target.result;
            const preview = document.getElementById('photo-preview');
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 사진 크게 보기
function viewSavedPhoto() {
    const car = cars.find(c => c.id === currentCarId);
    const entry = getLogEntry(car, currentMonth);
    if (!entry || !entry.photo) return;
    document.getElementById('photo-modal-img').src = entry.photo;
    document.getElementById('photo-modal').classList.remove('hidden');
}

function closePhotoModal() {
    document.getElementById('photo-modal').classList.add('hidden');
}

// ===== 월별 도미노 누적 거리 연동 =====
// 특정 월의 시작 거리를 가져오는 함수 (연동의 핵심)
function getStartKmForMonth(car, month) {
    if (month === 1) return Number(car.startKm); // 1월은 마스터 설정값 사용

    // 바로 전 달(month - 1)의 데이터를 확인
    const prevMonth = month - 1;
    const prevEntry = getLogEntry(car, prevMonth);

    // 전 달 데이터가 있으면 그 달의 '최종 누적 주행거리'를 반환
    if (prevEntry && prevEntry.finalTotalKm) {
        return Number(prevEntry.finalTotalKm);
    }

    // 재귀: 전 달이 비어있어도 그 이전 달들에서 누적값을 추적
    return getStartKmForMonth(car, prevMonth);
}

// 실시간 연쇄 계산 함수 (1월~12월 도미노 효과)
function updateAllMonthsChain() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    let lastFinalKm = Number(car.startKm);

    for (let m = 1; m <= 12; m++) {
        const entry = getLogEntry(car, m);
        // 이번 달 시작 거리는 지난달 마지막 거리 (1월은 마스터값)
        let monthlyRunningAcc = (m === 1) ? Number(car.startKm) : lastFinalKm;

        if (entry && entry.data && entry.data.length > 0) {
            entry.data.forEach(day => {
                monthlyRunningAcc += (Number(day.commute) || 0) + (Number(day.business) || 0);
            });
            // 이번 달 최종 거리를 저장해서 다음 달이 쓰게 함
            entry.finalTotalKm = monthlyRunningAcc;
        }

        lastFinalKm = monthlyRunningAcc;
    }

    save();
}

// 운행기록 테이블 렌더링
function renderTable() {
    const tbody = document.getElementById('log-table-body');
    tbody.innerHTML = "";
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;
    const days = new Date(currentYear, currentMonth, 0).getDate();
    const savedLog = getLogData(car, currentMonth);

    // 도미노 연동: 이번 달 시작 km는 지난달 최종 km
    const monthStartKm = getStartKmForMonth(car, currentMonth);
    let acc = monthStartKm;
    let html = "";

    for (let i = 1; i <= days; i++) {
        const dateKey = `${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const { isHoliday, name } = isHolidayDay(currentMonth, i);

        const log = savedLog[i - 1] || {
            commute: 0,
            business: 0,
            etc: name || '-'
        };

        const commute = Number(log.commute) || 0;
        const business = Number(log.business) || 0;
        acc += (commute + business);

        const showAcc = (commute + business) > 0 ? acc : monthStartKm;

        html += `
            <tr class="${isHoliday ? 'holiday' : ''}" data-idx="${i - 1}">
                <td class="p-2 border-b bg-gray-50 text-[10px] font-medium">${dateKey}</td>
                <td class="p-2 border-b font-bold">${showAcc.toLocaleString()}</td>
                <td class="p-2 border-b text-blue-600 font-bold editable-cell" contenteditable="${!isHoliday}" oninput="onCellEdit(${i - 1}, 'commute', this)">${commute}</td>
                <td class="p-2 border-b text-green-600 font-bold editable-cell" contenteditable="${!isHoliday}" oninput="onCellEdit(${i - 1}, 'business', this)">${business}</td>
                <td class="p-2 border-b text-gray-400 text-[10px] editable-cell" contenteditable="true" oninput="onCellEdit(${i - 1}, 'etc', this)">${log.etc}</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

// 셀 편집: 메모리(cars) 즉시 동기화
function syncRowToMemory(idx, commute, business, etc) {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;
    const days = new Date(currentYear, currentMonth, 0).getDate();

    let entry = car.logs[currentMonth];
    if (!entry || Array.isArray(entry)) {
        entry = {
            data: Array.isArray(entry) ? entry : new Array(days).fill(null).map(() => ({ commute: 0, business: 0, etc: '-' })),
            photo: entry && entry.photo ? entry.photo : null,
            timestamp: entry && entry.timestamp ? entry.timestamp : null
        };
        car.logs[currentMonth] = entry;
    }
    if (!entry.data || entry.data.length === 0) {
        entry.data = new Array(days).fill(null).map(() => ({ commute: 0, business: 0, etc: '-' }));
    }
    if (!entry.data[idx]) {
        entry.data[idx] = { commute: 0, business: 0, etc: '-' };
    }
    if (commute !== undefined) entry.data[idx].commute = commute;
    if (business !== undefined) entry.data[idx].business = business;
    if (etc !== undefined) entry.data[idx].etc = etc || '-';
}

// 모든 날짜 실시간 누적 계산 + 주말/공휴일 0 강제 처리 + 월별 도미노 연동
function updateCumulativeDistances() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    const rows = document.querySelectorAll('#log-table-body tr');
    // 이번 달 시작 km는 도미노 연동값 (이전 달 최종 km)
    let currentAcc = getStartKmForMonth(car, currentMonth);

    rows.forEach((row, index) => {
        const isHoliday = row.classList.contains('holiday'); // 주말/공휴일 체크

        let commute = 0;
        let business = 0;

        if (isHoliday) {
            // [핵심] 주말/공휴일은 무조건 0으로 초기화하고 수정 불가
            if (row.cells[2].innerText !== '0') row.cells[2].innerText = '0';
            if (row.cells[3].innerText !== '0') row.cells[3].innerText = '0';
        } else {
            commute = parseInt(row.cells[2].innerText) || 0;
            business = parseInt(row.cells[3].innerText) || 0;
        }

        currentAcc += (commute + business);

        row.cells[1].innerText = currentAcc.toLocaleString();

        // 메모리 동기화
        const etcVal = row.cells[4] ? row.cells[4].innerText.trim() : '-';
        syncRowToMemory(index, commute, business, etcVal);
    });

    // 월 데이터 변경 후 1월~12월 도미노 재계산 (이번 달 변경이 이후 모든 달에 전파)
    updateAllMonthsChain();
}

// 셀 편집 핸들러 (즉시 실행)
function onCellEdit(idx, field, el) {
    updateCumulativeDistances();
}

// 호환용 (기존 호출부 유지)
function refreshAccumulated() {
    updateCumulativeDistances();
}

function moveMonth(delta) {
    currentMonth = Math.max(1, Math.min(12, currentMonth + delta));
    updateUI();
}

function resetData() {
    if (confirm("이 달의 주행 기록과 사진을 초기화하시겠습니까?")) {
        const car = cars.find(c => c.id === currentCarId);
        delete car.logs[currentMonth];
        car.currentPhoto = null;
        document.getElementById('final-km-input').value = "";
        // 도미노 연동: 1월~12월 최종 km 재계산
        updateAllMonthsChain();
        updateUI();
    }
}

// 자동 분배 + 사진 통합 저장
function distributeData() {
    const finalInput = parseInt(document.getElementById('final-km-input').value);
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    // 도미노 연동: 이번 달 시작 km는 이전 달 최종 km
    const monthStartKm = getStartKmForMonth(car, currentMonth);

    if (!finalInput || finalInput <= monthStartKm) {
        return alert(`${monthStartKm.toLocaleString()}보다 큰 숫자를 입력하세요.`);
    }

    const totalDist = finalInput - monthStartKm;
    const days = new Date(currentYear, currentMonth, 0).getDate();

    let workIndices = [];
    for (let i = 1; i <= days; i++) {
        const { isHoliday } = isHolidayDay(currentMonth, i);
        if (!isHoliday) workIndices.push(i - 1);
    }

    if (workIndices.length === 0) return alert("이번 달은 영업일이 없습니다.");

    const commuteTotal = workIndices.length * car.commuteKm;
    const businessTotal = totalDist - commuteTotal;
    if (businessTotal < 0) {
        return alert(`입력한 거리가 기본 출퇴근 합계(${commuteTotal.toLocaleString()}km)보다 작습니다.`);
    }

    let weights = workIndices.map(() => Math.random() + 0.3);
    let weightSum = weights.reduce((a, b) => a + b, 0);
    let busVals = workIndices.map((_, i) => Math.round((weights[i] / weightSum) * businessTotal));

    let diff = businessTotal - busVals.reduce((a, b) => a + b, 0);
    busVals[busVals.length - 1] += diff;
    if (busVals[busVals.length - 1] < 0) busVals[busVals.length - 1] = 0;

    let logs = new Array(days).fill(null).map((_, i) => {
        const { isHoliday, name } = isHolidayDay(currentMonth, i + 1);
        if (isHoliday) return { commute: 0, business: 0, etc: name || '-' };
        const wIdx = workIndices.indexOf(i);
        return { commute: car.commuteKm, business: busVals[wIdx], etc: '-' };
    });

    const prevPhoto = (car.logs[currentMonth] && !Array.isArray(car.logs[currentMonth]))
        ? car.logs[currentMonth].photo
        : null;

    car.logs[currentMonth] = {
        data: logs,
        photo: car.currentPhoto || prevPhoto || null,
        timestamp: new Date().getTime()
    };
    car.currentPhoto = null;

    // 도미노 연동: 1월~12월 최종 km 재계산
    updateAllMonthsChain();
    renderTable();
    renderSavedPhoto();

    const preview = document.getElementById('photo-preview');
    if (preview) {
        preview.style.backgroundImage = '';
        preview.classList.add('hidden');
    }

    alert(`데이터 및 사진 저장 완료\n총 ${totalDist.toLocaleString()}km (출퇴근 ${commuteTotal.toLocaleString()}km + 업무용 ${businessTotal.toLocaleString()}km)`);
}

// 엑셀 내보내기 (단일 월)
function exportExcel() {
    const car = cars.find(c => c.id === currentCarId);
    const table = document.querySelector("#view-log table");
    const wb = XLSX.utils.table_to_book(table, { sheet: `${currentMonth}월` });
    XLSX.writeFile(wb, `WYLIE_${car.num}_${currentYear}-${String(currentMonth).padStart(2, '0')}.xlsx`);
}

// 통합 엑셀 다운로드: 운행기록(이어서) + 차량별 정비 시트
async function downloadFullSystemExcel() {
    const start = parseInt(document.getElementById('start-month').value);
    const end = parseInt(document.getElementById('end-month').value);
    const car = cars.find(c => c.id === currentCarId);

    if (start > end) return alert("시작 월이 종료 월보다 클 수 없습니다.");
    if (!car) return alert("차량이 선택되지 않았습니다.");
    if (typeof XLSX === 'undefined') return alert("XLSX 라이브러리가 로드되지 않았습니다.");

    // 도미노 연동 최신 상태 보장
    updateAllMonthsChain();

    const wb = XLSX.utils.book_new();

    // --- [시트 1] 선택한 차량의 통합 운행기록 (모든 월 이어서) ---
    const driveData = [
        ["WYLIE 법인차량 통합 운행기록부"],
        [`차량번호: ${car.num} / 사용자: ${car.user}`],
        [`기간: ${currentYear}년 ${start}월 ~ ${end}월`],
        [""],
        ["일자", "주행후 계기판", "출퇴근(km)", "업무용(km)", "비고"]
    ];

    let hasAny = false;
    for (let m = start; m <= end; m++) {
        const logEntry = getLogEntry(car, m);
        if (!logEntry || !logEntry.data || logEntry.data.length === 0) continue;
        hasAny = true;

        driveData.push([`▶ ${m}월 기록 시작`, "", "", "", ""]);
        let acc = getStartKmForMonth(car, m);

        logEntry.data.forEach((d, i) => {
            const c = Number(d.commute) || 0;
            const b = Number(d.business) || 0;
            acc += (c + b);
            const dateStr = `${currentYear}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            driveData.push([dateStr, acc, c, b, d.etc || '-']);
        });
        driveData.push(["", "", "", "", ""]); // 월 구분 빈 줄
    }

    if (!hasAny) return alert("해당 기간에 저장된 운행기록이 없습니다.");

    const wsDrive = XLSX.utils.aoa_to_sheet(driveData);
    // 열 너비 지정
    wsDrive['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsDrive, "통합운행기록");

    // --- [시트 2~N] 차량별 독립 정비 내역 시트 생성 ---
    cars.forEach(c => {
        if (c.maint && c.maint.length > 0) {
            const maintData = [
                [`${c.num} (${c.user}) 정비 관리 내역`],
                [""],
                ["정비일자", "항목", "주행거리(km)", "비용(원)", "비고"]
            ];

            c.maint.forEach(m => {
                const item = m.content || m.item || '-';
                const km = m.km ? Number(String(m.km).replace(/,/g, '')) : 0;
                const cost = m.cost ? Number(String(m.cost).replace(/,/g, '')) : 0;
                maintData.push([m.date, item, km, cost, m.etc || "-"]);
            });

            const wsMaint = XLSX.utils.aoa_to_sheet(maintData);
            wsMaint['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];

            // 시트 이름 31자 제한 + 특수문자 제거
            const safeName = `${c.num}_정비`.replace(/[\\/?*\[\]:]/g, '').substring(0, 31);
            XLSX.utils.book_append_sheet(wb, wsMaint, safeName);
        }
    });

    XLSX.writeFile(wb, `WYLIE_차량통합관리_${car.num}_${start}-${end}월.xlsx`);
}

// 기간 지정 일괄 ZIP 다운로드
async function downloadPeriodZip() {
    const start = parseInt(document.getElementById('start-month').value);
    const end = parseInt(document.getElementById('end-month').value);
    const car = cars.find(c => c.id === currentCarId);

    if (start > end) return alert("시작 월이 종료 월보다 클 수 없습니다.");
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        return alert("필요한 라이브러리(JSZip/FileSaver)가 로드되지 않았습니다. 새로고침 후 다시 시도해주세요.");
    }

    const zip = new JSZip();
    let hasAnyData = false;

    for (let m = start; m <= end; m++) {
        const entry = getLogEntry(car, m);
        if (!entry || !entry.data || entry.data.length === 0) continue;
        hasAnyData = true;

        const wsData = [["일자", "주행후", "출퇴근(km)", "업무용(km)", "비고"]];
        // 도미노 연동: 해당 월의 시작 km는 이전 달 최종 km
        let acc = getStartKmForMonth(car, m);
        const monthStart = acc;
        entry.data.forEach((d, i) => {
            const c = Number(d.commute) || 0;
            const b = Number(d.business) || 0;
            acc += (c + b);
            const showAcc = (c + b) > 0 ? acc : monthStart;
            const dateStr = `${currentYear}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            wsData.push([dateStr, showAcc, c, b, d.etc || '-']);
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), `${m}월`);
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        zip.file(`${String(m).padStart(2, '0')}월_운행기록_${car.num}.xlsx`, excelBuffer);

        if (entry.photo) {
            const parts = entry.photo.split(',');
            const imgData = parts.length > 1 ? parts[1] : parts[0];
            const mimeMatch = entry.photo.match(/data:image\/(\w+);/);
            const ext = mimeMatch ? mimeMatch[1] : 'png';
            zip.file(`${String(m).padStart(2, '0')}월_계기판사진_${car.num}.${ext}`, imgData, { base64: true });
        }
    }

    if (!hasAnyData) return alert("해당 기간에 저장된 데이터가 없습니다.");

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `WYLIE_${car.num}_${start}-${end}월_증빙자료.zip`);
}

// ====== 정비관리 ======
function renderMaint() {
    const container = document.getElementById('maint-list');
    const car = cars.find(c => c.id === currentCarId);
    if (!car || !car.maint || car.maint.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-300 text-xs p-10 border-2 border-dashed rounded-2xl">등록된 정비 내역이 없습니다.</div>`;
        return;
    }
    container.innerHTML = car.maint.map((m, idx) => `
        <div class="bg-white border p-4 rounded-xl shadow-sm relative">
            <div class="flex justify-between text-[10px] font-bold text-blue-600 mb-1">
                <span>${m.date} ${m.km ? ' · ' + Number(m.km).toLocaleString() + 'km' : ''}</span>
                <span>${m.cost ? Number(String(m.cost).replace(/,/g, '')).toLocaleString() + '원' : '0원'}</span>
            </div>
            <div class="text-sm font-bold text-gray-800">${m.content}</div>
            <div class="text-[10px] text-gray-400 mt-1">${m.etc || '-'}</div>
            <button onclick="deleteMaint(${idx})" class="absolute top-3 right-3 text-red-400" title="삭제"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
        </div>
    `).join('');
    setTimeout(() => lucide.createIcons(), 0);
}

function openMaintModal() {
    document.getElementById('m-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('m-content').value = '';
    document.getElementById('m-km').value = '';
    document.getElementById('m-cost').value = '';
    document.getElementById('m-etc').value = '';
    document.getElementById('maint-modal').classList.remove('hidden');
}

function closeMaintModal() {
    document.getElementById('maint-modal').classList.add('hidden');
}

function submitMaint() {
    const date = document.getElementById('m-date').value;
    const content = document.getElementById('m-content').value;
    const km = document.getElementById('m-km').value;
    const cost = document.getElementById('m-cost').value;
    const etc = document.getElementById('m-etc').value;
    if (!date || !content) return alert("일자와 정비 내용은 필수입니다.");

    const car = cars.find(c => c.id === currentCarId);
    if (!car.maint) car.maint = [];
    car.maint.unshift({ date, content, km: km || '0', cost: cost || '0', etc: etc || '-' });
    save();
    closeMaintModal();
    renderMaint();
}

function deleteMaint(idx) {
    if (!confirm("이 정비 내역을 삭제하시겠습니까?")) return;
    const car = cars.find(c => c.id === currentCarId);
    car.maint.splice(idx, 1);
    save();
    renderMaint();
}

// ====== 차량관리 ======
function renderAdmin() {
    const container = document.getElementById('admin-list');
    container.innerHTML = cars.map(car => `
        <div class="bg-white border p-5 rounded-2xl shadow-sm border-gray-100 relative">
            <button onclick="deleteCar(${car.id})" class="absolute top-4 right-4 text-red-500 font-bold text-xs">삭제</button>
            <div class="font-bold mb-4 text-[#1a237e] border-b pb-2">${car.num} 설정</div>
            <div class="grid grid-cols-2 gap-4 text-[11px]">
                <div class="flex flex-col">
                    <span class="text-gray-400 font-bold">차량번호</span>
                    <input type="text" value="${car.num}" onchange="updateCar(${car.id}, 'num', this.value)" class="border-b py-1 outline-none font-bold" />
                </div>
                <div class="flex flex-col">
                    <span class="text-gray-400 font-bold">사용자(성함/직함)</span>
                    <input type="text" value="${car.user}" onchange="updateCar(${car.id}, 'user', this.value)" class="border-b py-1 outline-none font-bold" />
                </div>
                <div class="flex flex-col">
                    <span class="text-gray-400 font-bold">차종</span>
                    <input type="text" value="${car.model}" onchange="updateCar(${car.id}, 'model', this.value)" class="border-b py-1 outline-none font-bold" />
                </div>
                <div class="flex flex-col">
                    <span class="text-blue-600 font-bold underline">기본 출퇴근 거리(km)</span>
                    <input type="number" value="${car.commuteKm}" onchange="updateCar(${car.id}, 'commuteKm', Number(this.value))" class="border-b py-1 outline-none font-black text-blue-900 bg-blue-50" />
                </div>
                <div class="flex flex-col">
                    <span class="text-gray-400 font-bold">보험료</span>
                    <input type="text" value="${car.insFee}" onchange="updateCar(${car.id}, 'insFee', this.value)" class="border-b py-1 outline-none font-bold" />
                </div>
                <div class="flex flex-col">
                    <span class="text-red-500 font-bold underline">보험 만료일</span>
                    <input type="date" value="${car.insDate || ''}" onchange="updateCar(${car.id}, 'insDate', this.value)" class="border-b py-1 outline-none font-bold" />
                </div>
                <div class="flex flex-col">
                    <span class="text-gray-400 font-bold">월 렌탈료</span>
                    <input type="text" value="${car.rentFee}" onchange="updateCar(${car.id}, 'rentFee', this.value)" class="border-b py-1 outline-none font-bold" />
                </div>
                <div class="flex flex-col">
                    <span class="text-gray-400 font-bold">시작 주행거리(km)</span>
                    <input type="number" value="${car.startKm}" onchange="updateCar(${car.id}, 'startKm', Number(this.value))" class="border-b py-1 outline-none font-bold text-indigo-600" />
                </div>
            </div>
        </div>
    `).join('');
}

function addNewCar() {
    const newId = cars.length > 0 ? Math.max(...cars.map(c => c.id)) + 1 : 1;
    cars.push({
        id: newId,
        num: "새 번호",
        model: "차종",
        user: "이름",
        insFee: "0",
        insDate: "",
        rentFee: "0",
        startKm: 0,
        commuteKm: 10,
        logs: {},
        maint: [],
        currentPhoto: null
    });
    save();
    renderAdmin();
    renderTabs();
}

function deleteCar(id) {
    if (cars.length <= 1) return alert("최소 한 대는 유지해야 합니다.");
    if (!confirm("삭제하시겠습니까? (해당 차량의 운행/정비/사진 기록도 모두 삭제됩니다)")) return;
    cars = cars.filter(c => c.id !== id);
    if (currentCarId === id) currentCarId = cars[0].id;
    save();
    renderAdmin();
    renderTabs();
}

function updateCar(id, field, value) {
    const car = cars.find(c => c.id === id);
    if (!car) return;
    car[field] = value;
    // startKm 변경 시 도미노 전체 재계산
    if (field === 'startKm') {
        const prevCarId = currentCarId;
        currentCarId = id;
        updateAllMonthsChain();
        currentCarId = prevCarId;
    } else {
        save();
    }
    if (field === 'num') renderTabs();
    else updateUI();
}

function selectCar(id) {
    currentCarId = id;
    // 차량 변경 시 도미노 재계산
    updateAllMonthsChain();
    renderTabs();
}

// 전역 노출
window.tab = tab;
window.moveMonth = moveMonth;
window.resetData = resetData;
window.distributeData = distributeData;
window.exportExcel = exportExcel;
window.downloadPeriodZip = downloadPeriodZip;
window.downloadFullSystemExcel = downloadFullSystemExcel;
window.selectCar = selectCar;
window.updateCar = updateCar;
window.addNewCar = addNewCar;
window.deleteCar = deleteCar;
window.openMaintModal = openMaintModal;
window.closeMaintModal = closeMaintModal;
window.submitMaint = submitMaint;
window.deleteMaint = deleteMaint;
window.onCellEdit = onCellEdit;
window.previewImage = previewImage;
window.viewSavedPhoto = viewSavedPhoto;
window.closePhotoModal = closePhotoModal;

// 초기 도미노 계산 + 렌더
updateAllMonthsChain();
renderTabs();
