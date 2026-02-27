# Phase 2 — 3단 레이아웃 + 테마/종목 탐색 (개발 히스토리)

> 작성일: 2026-02-27
> 목표: MainPage 3단 레이아웃을 실제 동작하는 앱으로 구현 (테마 선택 → 종목 선택 → 재무 데이터 조회/표시)

---

## 1. Phase 1 완료 상태

| 항목 | 상태 |
|------|------|
| DART API 서비스 레이어 (dartApi.js) | 완성 |
| DART 데이터 조회 훅 (useDartData.js) | 완성 |
| 테마/종목 JSON (themes.json) | 수소 테마 4종목 |
| MainPage 3단 레이아웃 | UI 껍데기만 (로직 없음) |
| 전역 상태관리 | 미구현 |

---

## 2. 구현 내용

### 2-1. 전역 상태관리 — AppContext

**파일**: `src/context/AppContext.jsx`

React Context + useState 기반 전역 상태:
- `selectedThemeId` / `selectedStockCode` / `selectedCorpCode` — 선택 상태
- `activeTab` — 탭 전환 (valuechain / financial / news / ir)
- `bsnsYear` / `reprtCode` — 재무 조회 기간

액션 함수:
- `selectTheme(themeId)` — 테마 선택 시 종목 초기화
- `selectStock(stockCode, corpCode)` — 종목 선택 시 재무 탭 자동 전환
- `setPeriod()` / `setBsnsYear()` / `setReprtCode()` — 기간 변경

`useAppState()` 훅으로 접근. `App.jsx`에서 `<AppProvider>` 래핑.

### 2-2. LeftPanel 컴포넌트

**파일**: `src/components/layout/LeftPanel.jsx`

3개 섹션:
1. **테마 목록** — themes.json에서 로드, 클릭 시 `selectTheme()`
2. **종목 목록** — 선택 테마의 stocks[] 표시, 클릭 시 `selectStock()`, value_chain 서브텍스트 표시
3. **기간 선택** — 연도 드롭다운 (최근 5년) + 보고서 유형 드롭다운 (1분기/반기/3분기/사업보고서)

하단: API 테스트 / 테마 관리 / 설정 링크

### 2-3. CenterPanel + TabBar

**파일**: `src/components/layout/CenterPanel.jsx`, `src/components/common/TabBar.jsx`

- TabBar: 재사용 가능한 탭 바 (tabs, activeTab, onSelect props)
- CenterPanel: 4개 탭 중 `financial`만 구현, 나머지는 플레이스홀더

### 2-4. 재무 탭 (FinancialTabContent + FinancialTable)

**파일**: `src/components/financial/FinancialTabContent.jsx`, `src/components/financial/FinancialTable.jsx`

FinancialTabContent:
- `useDartData(corpCode)` 훅으로 DART API 연동
- `useEffect`로 종목/기간 변경 시 자동 조회 (fetchCompanyInfo + fetchFinancials)
- 주요 지표 카드 (자산/부채/매출/영업이익/당기순이익 등) — `extractKeyMetrics()` 활용
- 서브 탭: [재무상태표] [손익계산서]
- IS/CIS 자동 폴백: IS 데이터 없으면 CIS로 시도
- 로딩 스피너 / 에러 메시지 / 빈 상태 처리

FinancialTable:
- DART list 배열 → 테이블 렌더링
- 컬럼: 항목명 | 당기 | 전기 | 전전기
- `formatBillion()` + `parseAmount()` 활용 (억원/백만원 단위)
- 기간 명칭은 DART 응답의 thstrm_nm/frmtrm_nm/bfefrmtrm_nm 사용

### 2-5. RightPanel

**파일**: `src/components/layout/RightPanel.jsx`

기존 AI 채팅 UI 유지 (input/button disabled). Phase 4에서 활성화 예정.

### 2-6. MainPage 리팩토링 + 모바일 반응형

**파일**: `src/pages/MainPage.jsx`

- LeftPanel / CenterPanel / RightPanel 조합
- 모바일 (<768px): LeftPanel 숨김 + 햄버거 토글 + 오버레이
- 태블릿 (<1280px): RightPanel 숨김
- 데스크톱 (≥1280px): 3단 모두 표시

---

## 3. 파일 구조 (Phase 2 신규)

```
src/
├── context/
│   └── AppContext.jsx           (신규) 전역 상태관리
├── components/
│   ├── layout/
│   │   ├── LeftPanel.jsx        (신규) 테마/종목/기간 선택
│   │   ├── CenterPanel.jsx      (신규) 탭 + 콘텐츠
│   │   └── RightPanel.jsx       (신규) AI 채팅 플레이스홀더
│   ├── common/
│   │   └── TabBar.jsx           (신규) 재사용 탭 바
│   └── financial/
│       ├── FinancialTabContent.jsx  (신규) 재무 탭 전체
│       └── FinancialTable.jsx       (신규) 재무제표 테이블
├── App.jsx                      (수정) AppProvider 래핑
└── pages/
    └── MainPage.jsx             (수정) 컴포넌트 조합 + 반응형
```

---

## 4. 설계 결정

| 결정 | 이유 |
|------|------|
| useState 기반 Context (useReducer 아님) | Phase 2 수준에서 충분, 간결함 |
| 종목 선택 시 자동으로 재무 탭 전환 | UX: 종목 클릭 → 즉시 재무 데이터 확인 |
| IS/CIS 폴백 로직 | 소형주는 IS 대신 CIS 사용 (Phase 1에서 발견) |
| RightPanel lg: breakpoint | 1280px 미만에서 3단은 좁음, AI 채팅 숨김 |
| 기간 선택을 LeftPanel에 배치 | 종목과 함께 컨텍스트 유지 |

---

## 5. 검증 결과

- ✅ `npm run build` 성공 (0 errors)
- ✅ ESLint 통과 (warning 1개: react-refresh/only-export-components — Context 파일 정상 패턴)
- ✅ 테마 선택 → 종목 목록 표시
- ✅ 종목 선택 → DART API 호출 → 재무 데이터 테이블 렌더링
- ✅ 서브 탭 (재무상태표/손익계산서) 전환
- ✅ 기간 변경 → 자동 재조회
- ✅ 모바일 반응형 (햄버거 토글)
