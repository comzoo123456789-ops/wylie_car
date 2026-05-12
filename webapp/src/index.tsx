import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

// 차량 마스터 데이터 (추후 D1/KV 연동 가능)
const carMaster = [
  { id: 1, num: "187너4662", model: "제네시스 G90", user: "이재욱", insFee: "2,340,000", insDate: "2026-12-31", rentFee: "1,050,000", startKm: 128765, commuteKm: 10 }
]

app.get('/api/cars', (c) => c.json({ success: true, data: carMaster }))
app.get('/api/cars/:id', (c) => {
  const id = Number(c.req.param('id'))
  const car = carMaster.find(x => x.id === id)
  if (!car) return c.json({ success: false, message: '차량을 찾을 수 없습니다.' }, 404)
  return c.json({ success: true, data: car })
})

// 메인 페이지
app.get('/', (c) => {
  return c.render(
    <div id="app" class="w-full max-w-md bg-white min-h-screen relative shadow-2xl">
      <header class="bg-[#1a237e] p-5 text-white sticky top-0 z-50 flex justify-center items-center">
        <h1 class="text-lg font-bold italic tracking-wider">WYLIE Car System</h1>
      </header>

      <main class="p-4">
        <div class="flex space-x-2 overflow-x-auto pb-3 no-scrollbar" id="car-tabs"></div>

        {/* 운행일지 뷰 */}
        <div id="view-log">
          <section class="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100 shadow-sm">
            <div class="flex justify-between items-start mb-2">
              <h2 class="font-bold text-blue-900 text-sm" id="card-model">-</h2>
              <span class="text-[10px] bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-bold" id="card-user">-</span>
            </div>
            <div class="grid grid-cols-2 gap-y-2 text-[10px] text-blue-700">
              <div>보험료: <span id="card-ins-fee" class="font-bold">-</span></div>
              <div>보험만료: <span id="card-ins-date" class="font-bold text-red-600">-</span></div>
              <div>월 렌탈료: <span id="card-rent" class="font-bold">-</span></div>
              <div>시작 주행거리: <span id="card-start-km" class="font-bold text-indigo-900">-</span></div>
              <div class="col-span-2">기본 출퇴근 거리: <span id="card-commute" class="font-black text-xs">10</span>km</div>
            </div>
          </section>

          {/* 입력 + 사진 촬영 + 자동분배 */}
          <section class="bg-white rounded-2xl border-2 border-gray-100 p-4 mb-4 shadow-sm">
            <div class="flex flex-col gap-3">
              <div>
                <label class="text-[10px] text-gray-400 font-bold uppercase">당월 최종 계기판 거리 (km)</label>
                <input type="number" id="final-km-input" class="w-full bg-gray-50 border-0 p-3 mt-1 rounded-xl text-xl font-bold focus:ring-2 focus:ring-blue-600 outline-none" placeholder="0" />
              </div>

              <div class="flex gap-2">
                <button onclick="document.getElementById('photo-upload').click()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-dashed border-gray-300">
                  <i data-lucide="camera" class="w-4 h-4"></i> 사진 촬영 / 선택
                </button>
                <input type="file" id="photo-upload" accept="image/*" class="hidden" onchange="previewImage(this)" />
                <div id="photo-preview" class="w-12 h-12 bg-gray-200 rounded-lg hidden bg-cover bg-center border border-gray-300"></div>
              </div>

              <button onclick="distributeData()" class="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition">데이터 자동 분배 및 사진 저장</button>
            </div>
          </section>

          {/* 기간 지정 일괄 ZIP 다운로드 */}
          <section class="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 shadow-sm">
            <h3 class="text-[10px] font-bold text-green-800 uppercase mb-2">기간 지정 일괄 다운로드 (엑셀 + 사진)</h3>
            <div class="flex items-center gap-2">
              <select id="start-month" class="flex-1 text-xs p-2 rounded-lg border border-green-200">
                <option value="1">1월</option><option value="2">2월</option><option value="3">3월</option>
                <option value="4">4월</option><option value="5" selected>5월</option><option value="6">6월</option>
                <option value="7">7월</option><option value="8">8월</option><option value="9">9월</option>
                <option value="10">10월</option><option value="11">11월</option><option value="12">12월</option>
              </select>
              <span class="text-gray-400">~</span>
              <select id="end-month" class="flex-1 text-xs p-2 rounded-lg border border-green-200">
                <option value="1">1월</option><option value="2">2월</option><option value="3">3월</option>
                <option value="4">4월</option><option value="5" selected>5월</option><option value="6">6월</option>
                <option value="7">7월</option><option value="8">8월</option><option value="9">9월</option>
                <option value="10">10월</option><option value="11">11월</option><option value="12">12월</option>
              </select>
              <button onclick="downloadPeriodZip()" class="bg-green-600 text-white px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap">ZIP 다운</button>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <button onclick="downloadFullSystemExcel()" class="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap">통합 엑셀 다운 (운행+정비)</button>
            </div>
          </section>

          <div class="flex justify-between items-center mb-3 px-1">
            <div class="flex items-center gap-2">
              <button onclick="moveMonth(-1)" class="p-1 text-gray-400"><i data-lucide="chevron-left"></i></button>
              <h3 class="font-bold text-sm text-gray-700"><span id="month-display">5</span>월 기록</h3>
              <button onclick="moveMonth(1)" class="p-1 text-gray-400"><i data-lucide="chevron-right"></i></button>
              <button onclick="resetData()" class="ml-2 p-1 text-gray-300 hover:text-red-500 transition" title="초기화"><i data-lucide="refresh-ccw" class="w-4 h-4"></i></button>
            </div>
            <button onclick="exportExcel()" class="text-[11px] text-green-600 font-bold flex items-center gap-1">
              <i data-lucide="download" class="w-3 h-3"></i> 엑셀
            </button>
          </div>

          {/* 저장된 사진 표시 영역 */}
          <div id="saved-photo-area" class="hidden mb-3 px-1">
            <div class="bg-white border rounded-xl p-3 shadow-sm flex items-center gap-3">
              <img id="saved-photo-img" class="w-16 h-16 object-cover rounded-lg border" alt="저장된 계기판 사진" />
              <div class="flex-1">
                <div class="text-[10px] text-gray-400">이 달의 저장된 계기판 사진</div>
                <div class="text-[11px] font-bold text-gray-700" id="saved-photo-time">-</div>
              </div>
              <button onclick="viewSavedPhoto()" class="text-[10px] text-blue-600 font-bold border border-blue-200 px-2 py-1 rounded">크게 보기</button>
            </div>
          </div>

          <div class="bg-white border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
            <table class="w-full text-[11px] text-center border-collapse">
              <thead class="bg-gray-50 text-gray-400">
                <tr>
                  <th class="p-2 border-b">일자</th>
                  <th class="p-2 border-b">주행후</th>
                  <th class="p-2 border-b">출퇴근</th>
                  <th class="p-2 border-b">업무용</th>
                  <th class="p-2 border-b">비고</th>
                </tr>
              </thead>
              <tbody id="log-table-body"></tbody>
            </table>
          </div>
        </div>

        {/* 정비관리 뷰 */}
        <div id="view-maint" class="hidden">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold text-gray-800" id="maint-title-display">정비 내역</h2>
            <button onclick="openMaintModal()" class="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg font-bold shadow-md">+ 추가</button>
          </div>
          <div id="maint-list" class="space-y-3"></div>
        </div>

        {/* 차량관리 뷰 */}
        <div id="view-admin" class="hidden">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-800">차량 관리</h2>
            <button onclick="addNewCar()" class="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg font-bold shadow-md">+ 차량 추가</button>
          </div>
          <div id="admin-list" class="space-y-4"></div>
        </div>
      </main>

      {/* 정비 추가 모달 */}
      <div id="maint-modal" class="hidden fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl">
          <h3 class="font-bold text-base text-gray-800 mb-4">신규 정비 등록</h3>
          <div class="space-y-3">
            <div class="flex flex-col">
              <label class="text-[10px] text-gray-400 font-bold mb-1">일자</label>
              <input type="date" id="m-date" class="border rounded-lg p-2 text-xs" />
            </div>
            <div class="flex flex-col">
              <label class="text-[10px] text-gray-400 font-bold mb-1">정비 내용</label>
              <input type="text" id="m-content" placeholder="예: 엔진오일 교체" class="border rounded-lg p-2 text-xs" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="flex flex-col">
                <label class="text-[10px] text-gray-400 font-bold mb-1">주행거리(km)</label>
                <input type="number" id="m-km" placeholder="0" class="border rounded-lg p-2 text-xs" />
              </div>
              <div class="flex flex-col">
                <label class="text-[10px] text-gray-400 font-bold mb-1">비용(원)</label>
                <input type="text" id="m-cost" placeholder="0" class="border rounded-lg p-2 text-xs" />
              </div>
            </div>
            <div class="flex flex-col">
              <label class="text-[10px] text-gray-400 font-bold mb-1">비고</label>
              <input type="text" id="m-etc" placeholder="-" class="border rounded-lg p-2 text-xs" />
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button onclick="closeMaintModal()" class="flex-1 border py-2 rounded-lg text-xs font-bold text-gray-500">취소</button>
            <button onclick="submitMaint()" class="flex-1 bg-[#1a237e] text-white py-2 rounded-lg text-xs font-bold">등록</button>
          </div>
        </div>
      </div>

      {/* 사진 크게 보기 모달 */}
      <div id="photo-modal" class="hidden fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onclick="closePhotoModal()">
        <img id="photo-modal-img" class="max-w-full max-h-full rounded-lg" alt="계기판 사진" />
      </div>

      <nav class="bottom-nav">
        <button onclick="tab('log')" id="tab-log" class="flex-1 flex flex-col items-center py-3 text-blue-700 font-bold">
          <i data-lucide="clipboard-list"></i>
          <span class="text-[10px] mt-1">운행일지</span>
        </button>
        <button onclick="tab('maint')" id="tab-maint" class="flex-1 flex flex-col items-center py-3 text-gray-400 font-bold">
          <i data-lucide="wrench"></i>
          <span class="text-[10px] mt-1">정비관리</span>
        </button>
        <button onclick="tab('admin')" id="tab-admin" class="flex-1 flex flex-col items-center py-3 text-gray-400 font-bold">
          <i data-lucide="user-cog"></i>
          <span class="text-[10px] mt-1">차량관리</span>
        </button>
      </nav>

      <script src="/static/app.js"></script>
    </div>
  )
})

export default app
