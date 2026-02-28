# InvestInsight 개발계획서

> **테마 투자 분석 웹앱 — 단계별 개발 로드맵**
> 작성일: 2026-02-27

---

## 1. 프로젝트 요약

| 항목 | 내용 |
|------|------|
| 프로젝트명 | InvestInsight — 테마 투자 분석 웹앱 |
| 목적 | 사용자 정의 투자 테마 기반 밸류체인 시각화·DART 재무분석·AI 대화형 분석 통합 플랫폼 |
| 기술 스택 | React + Vite / Tailwind CSS / Vercel / DART OpenAPI / 네이버 뉴스 API / 멀티 AI |
| 배포 환경 | Vercel (무료 플랜) |
| 대상 사용자 | 테마 집중 투자 개인 투자자 |

---

## 2. 개발 원칙

1. **수소 테마 1개로 전체 기능 검증** → 검증 완료 후 테마 확장
2. **MVP(최소 기능 제품) 우선** → 핵심 플로우 먼저 완성, 세부 기능은 점진적 추가
3. **CORS 프록시 최우선 해결** → DART API 호출의 전제 조건
4. **프론트엔드 중심 아키텍처** → 백엔드 서버 없이 Vercel Edge Function + localStorage로 운영
5. **밸류체인 시각화는 Mermaid.js → Reactflow 순차 업그레이드**
6. **배포 유연성 확보** → 어떤 배포 방식(웹/PWA/네이티브앱/데스크톱앱)이든 전환 가능한 구조로 개발

---

## 3. 배포 유연성 전략

> **결정 시점**: 배포 방식은 개발 후반부에 확정. 단, 어떤 방식을 선택하더라도 추가 작업이 최소화되도록 **개발 초기부터 아래 원칙을 준수**한다.

### 가능한 배포 옵션

| 옵션 | 방식 | 추가 작업 | 비용 |
|------|------|----------|------|
| **A. 웹 전용** | Vercel URL 공유 + 커스텀 도메인 | 거의 없음 | 무료~저가 (도메인 비용만) |
| **B. 웹 + PWA** | 웹앱에 Service Worker + manifest 추가 → 홈화면 설치 | manifest.json, SW 등록 | 무료 |
| **C. 웹 + 안드로이드 앱** | Capacitor 또는 TWA로 웹앱 래핑 → APK/AAB 빌드 | Capacitor 설정, 서명 | Play스토어 $25 (1회) |
| **D. 웹 + 데스크톱 앱** | Tauri 또는 Electron으로 래핑 → exe/dmg 빌드 | 빌드 설정, 다운로드 페이지 | 무료 |
| **E. 전체 (B+C+D)** | 위 모든 옵션 동시 제공 | 각각 추가 작업 합산 | 합산 |

### 개발 시 지켜야 할 원칙 (배포 유연성 확보)

모든 Phase에 걸쳐 아래 원칙을 적용하여 나중에 어떤 배포 방식이든 쉽게 전환할 수 있도록 한다.

#### 1) API 호출 추상화
```
모든 외부 API 호출 → services/ 레이어에서 일원화
  ├── 웹 배포: Vercel Edge Function 프록시 경유
  ├── PWA 배포: 동일 (웹과 같음)
  ├── 네이티브/데스크톱: baseURL만 환경변수로 교체 가능하게 설계
  └── 환경별 분기: import.meta.env.VITE_API_BASE_URL
```
- API 호출 시 **하드코딩된 URL 금지**, 환경변수 기반 baseURL 사용
- 모든 API 호출은 `services/` 디렉토리의 래퍼 함수를 통해서만 수행

#### 2) 스토리지 추상화
```javascript
// utils/storage.js — 스토리지 접근을 추상화
export const storage = {
  get: (key) => JSON.parse(localStorage.getItem(key)),
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key) => localStorage.removeItem(key),
};
```
- localStorage 직접 호출 대신 **추상화 레이어** 사용
- 향후 IndexedDB, SQLite(네이티브), 또는 클라우드 DB로 교체 시 이 레이어만 수정

#### 3) 반응형 UI 필수
- 모바일(360px) ~ 태블릿(768px) ~ 데스크톱(1280px+) 전 구간 대응
- 모바일: 핵심 요약 + 채팅 중심 단일 컬럼
- PWA/네이티브 앱에서도 동일한 UI가 자연스럽게 동작해야 함

#### 4) 웹 표준 준수 + 브라우저 API만 사용
- **Cordova/Capacitor 네이티브 플러그인에 의존하지 않는 코어 기능**
- 카메라, 파일시스템 등 네이티브 전용 API는 사용하지 않음 (필요 없음)
- 이렇게 하면 Capacitor, TWA, Tauri, Electron 어디서든 래핑만으로 앱 동작

#### 5) 빌드 산출물 독립성
```
vite build → dist/
  ├── index.html
  ├── assets/
  └── (정적 파일만 포함, 서버 의존성 없음)
```
- `vite build` 결과물이 **정적 파일(SPA)**로 완결되어야 함
- Vercel Edge Function은 `/api/` 경로에만 사용, 프론트엔드 자체는 서버 불필요
- 이 구조면 Vercel 외에도 Netlify, Cloudflare Pages, S3+CloudFront, GitHub Pages 등 어디든 배포 가능

#### 6) PWA 준비 요소 (미리 구성)
Phase 0에서 아래 파일을 미리 세팅해두면 나중에 PWA 전환이 즉시 가능:

| 파일 | 역할 | 당장 활성화? |
|------|------|------------|
| `public/manifest.json` | 앱 이름, 아이콘, 테마 색상 정의 | 파일만 생성, 등록은 나중에 |
| `public/icons/` | 192x192, 512x512 앱 아이콘 | 플레이스홀더 아이콘 배치 |
| Service Worker | 오프라인 캐시, 백그라운드 동기화 | 나중에 vite-plugin-pwa로 추가 |

### Phase 0 추가 작업

| # | 작업 | 상세 |
|---|------|------|
| 0-8 | 환경변수 구조 설계 | `.env.development` / `.env.production` 분리, `VITE_API_BASE_URL` 등 |
| 0-9 | 스토리지 추상화 유틸 | `utils/storage.js` 생성 |
| 0-10 | PWA 플레이스홀더 | `manifest.json`, 앱 아이콘 placeholder 배치 |
| 0-11 | 빌드 검증 | `vite build` → 정적 파일만으로 동작 확인 |

---

## 4. 전체 개발 단계 개요

```
Phase 0  환경 구축 및 인프라
Phase 1  핵심 데이터 플로우 (DART 연동)
Phase 2  3단 레이아웃 + 테마/종목 탐색
Phase 3  밸류체인 시각화
Phase 4  AI 채팅 연동
Phase 5  뉴스 · 공시 · IR
Phase 6  관리 페이지 및 설정
Phase 7  고도화 및 최적화
```

---

## 5. Phase 0 — 환경 구축 및 인프라

> 목표: 개발 환경 세팅, Vercel 배포 파이프라인, CORS 프록시 해결

### 작업 목록

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 0-1 | 프로젝트 초기화 | `npm create vite@latest` (React + JS/TS), Tailwind CSS 설치·설정 | 🔴 |
| 0-2 | 프로젝트 구조 설계 | 디렉토리 구조 확정 (아래 참조) | 🔴 |
| 0-3 | Vercel 프로젝트 연결 | GitHub 리포 생성 → Vercel 연결 → 자동 배포 설정 | 🔴 |
| 0-4 | DART API 프록시 구축 | Vercel Edge Function (`/api/dart/[...path].js`) → DART API 프록시 | 🔴 최우선 |
| 0-5 | 네이버 뉴스 API 프록시 | Vercel Edge Function (`/api/news.js`) → 네이버 API 프록시 | 🟡 |
| 0-6 | 환경 변수 설정 | Vercel 환경변수에 DART API 키, 네이버 Client ID/Secret 등록 | 🔴 |
| 0-7 | ESLint + Prettier 설정 | 코드 품질·일관성 유지 | 🟢 |

### 디렉토리 구조 (안)

```
InvestInsight/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/           # 3단 레이아웃 (LeftPanel, CenterPanel, RightPanel)
│   │   ├── theme/            # 테마 목록, 종목 목록
│   │   ├── financial/        # 재무제표 뷰, 핵심요약 카드
│   │   ├── valuechain/       # 밸류체인 시각화
│   │   ├── news/             # 뉴스·공시 탭
│   │   ├── ir/               # IR 자료 탭
│   │   ├── chat/             # AI 채팅 패널
│   │   └── common/           # 공용 컴포넌트 (탭, 버튼, 로딩 등)
│   ├── pages/
│   │   ├── MainPage.jsx      # 메인 분석 화면 (/)
│   │   ├── AdminPage.jsx     # 테마/종목 관리 (/admin/themes)
│   │   └── SettingsPage.jsx  # 설정 (/settings)
│   ├── services/
│   │   ├── dartApi.js        # DART API 호출 래퍼
│   │   ├── newsApi.js        # 네이버 뉴스 API 래퍼
│   │   └── aiApi.js          # 멀티 AI API 호출 (Claude/GPT/DeepSeek/Gemini)
│   ├── data/
│   │   └── themes.json       # 테마·종목 마스터 데이터
│   ├── hooks/                # 커스텀 훅
│   ├── utils/                # 유틸리티 (XBRL 파서, 포맷터 등)
│   ├── App.jsx
│   └── main.jsx
├── api/                      # Vercel Edge Functions (서버리스)
│   ├── dart/
│   │   └── [...path].js      # DART API 프록시
│   └── news.js               # 네이버 뉴스 API 프록시
├── prototypes/               # 기존 프로토타입
│   └── dart-viewer.jsx
├── scripts/
│   └── kiwoom-theme-extract.py  # 키움 테마 데이터 추출 (1회성)
├── package.json
├── tailwind.config.js
├── vite.config.js
└── vercel.json
```

### 산출물
- [x] 로컬 개발 서버 동작 확인
- [x] Vercel 배포 성공
- [x] DART API 프록시 호출 테스트 통과

---

## 6. Phase 1 — 핵심 데이터 플로우 (DART 연동)

> 목표: DART API를 통한 회사검색 → 공시조회 → 재무제표 조회 파이프라인 완성

### 작업 목록

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 1-1 | DART API 서비스 모듈 | `dartApi.js` — 회사검색, 공시목록, 재무제표 조회 함수 | 🔴 |
| 1-2 | 회사 검색 기능 | `GET /company.json?corp_name=...` 연동, 응답 파싱 | 🔴 |
| 1-3 | 공시 목록 조회 | `GET /list.json` — 정기공시(A), 기타공시(F) 분류 표시 | 🔴 |
| 1-4 | 재무제표 조회 | `GET /fnlttSinglAcntAll.json` — 재무상태표·손익계산서 파싱 | 🔴 |
| 1-5 | 데이터 캐싱 레이어 | DART 응답 localStorage 캐싱 (분기별 데이터는 변경 빈도 낮음) | 🟡 |
| 1-6 | 에러 처리 | API 호출 실패, 일일 한도 초과, 데이터 없음 등 핸들링 | 🟡 |

### API 호출 흐름

```
[사용자] 종목 선택
    → dartApi.getDisclosureList(corpCode, 'A')  // 정기공시 조회
    → [공시 목록 표시]

[사용자] 분기보고서 선택
    → dartApi.getFinancialStatement(rcpNo, '11011')  // 재무상태표
    → dartApi.getFinancialStatement(rcpNo, '11012')  // 손익계산서
    → [재무 데이터 파싱 및 표시]
```

### 산출물
- [x] 수소 테마 4개 종목 재무 데이터 정상 조회 확인
- [x] 캐싱 동작 확인 (동일 요청 시 API 재호출 없음)

---

## 7. Phase 2 — 3단 레이아웃 + 테마/종목 탐색

> 목표: 메인 화면 3단 레이아웃 구현, 테마·종목 선택 플로우 완성

### 작업 목록

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 2-1 | 3단 레이아웃 컴포넌트 | Left(240px) / Center(유동) / Right(360px) 반응형 레이아웃 | 🔴 |
| 2-2 | Left Panel — 테마 목록 | `themes.json` 로드 → 테마 리스트 렌더링, 선택 상태 관리 | 🔴 |
| 2-3 | Left Panel — 종목 목록 | 선택된 테마의 종목 리스트 표시, 종목 선택 상태 관리 | 🔴 |
| 2-4 | Center Panel — 탭 구조 | `[밸류체인] [재무] [뉴스] [IR]` 탭 UI 구현 | 🔴 |
| 2-5 | 재무 탭 — 데이터 표시 | 재무상태표·손익계산서 테이블 렌더링 | 🔴 |
| 2-6 | 재무 탭 — 공시 선택 | 분기/반기/사업보고서 선택 드롭다운 | 🟡 |
| 2-7 | 수소 테마 시드 데이터 | `themes.json`에 수소 테마 4개 종목 데이터 입력 | 🔴 |
| 2-8 | 모바일 반응형 | 모바일에서는 핵심 요약 + 채팅만 표시하는 레이아웃 | 🟢 |

### 상태 관리 설계

```
AppState
├── selectedThemeId: string
├── selectedStockCode: string
├── selectedDisclosure: { rcpNo, reportNm, rcptDt }
├── activeTab: 'valuechain' | 'financial' | 'news' | 'ir'
├── financialData: { ... }   // DART API 응답 캐시
└── chatHistory: Message[]    // AI 대화 히스토리
```

> 상태 관리는 React Context 또는 Zustand 사용. 초기에는 Context로 시작, 복잡해지면 Zustand 전환.

### 산출물
- [x] 3단 레이아웃 동작 (데스크탑)
- [x] 테마 선택 → 종목 목록 → 재무 데이터 표시 플로우 동작

---

## 8. Phase 3 — 밸류체인 시각화

> 목표: 테마별 밸류체인 플로우차트 렌더링, 종목 카드 연결

### 작업 목록

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 3-1 | Mermaid.js 통합 | `react-mermaid` 또는 직접 `mermaid.init()` 호출 | 🔴 |
| 3-2 | 밸류체인 데이터 구조 | `themes.json`에 `value_chain_stages` 필드 추가 | 🔴 |
| 3-3 | 동적 다이어그램 생성 | 테마 데이터 → Mermaid 구문 자동 생성 함수 | 🔴 |
| 3-4 | 종목-노드 연결 | 각 밸류체인 단계에 소속 종목 태그 표시 | 🟡 |
| 3-5 | 노드 클릭 인터랙션 | 밸류체인 노드 클릭 → 해당 종목 선택 + 재무 탭 이동 | 🟡 |

### Mermaid 다이어그램 생성 로직 (예시)

```javascript
function generateMermaidChart(theme) {
  let chart = 'graph LR\n';
  theme.value_chain_stages.forEach((stage, i) => {
    chart += `  S${i}["${stage.label}\\n${stage.sub}"]`;
    if (i < theme.value_chain_stages.length - 1) {
      chart += ` --> S${i + 1}`;
    }
    chart += '\n';
    // 해당 단계 소속 종목 표시
    const stocks = theme.stocks.filter(s => s.stage_id === stage.id);
    stocks.forEach(stock => {
      chart += `  S${i} -.- ${stock.code}["${stock.name}"]\n`;
    });
  });
  return chart;
}
```

### 향후 업그레이드 (Phase 7에서 진행)
- Mermaid.js → **Reactflow** 전환
- 드래그, 줌, 커스텀 노드(종목 카드) 등 인터랙티브 기능

### 산출물
- [x] 수소 테마 밸류체인 다이어그램 렌더링
- [x] 종목 클릭 시 재무 탭 연동

---

## 9. Phase 4 — AI 채팅 연동

> 목표: 멀티 AI 채팅 패널 구현, 재무 데이터 컨텍스트 기반 대화

### 작업 목록

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 4-1 | AI API 서비스 모듈 | `aiApi.js` — Claude / GPT-4o / DeepSeek / Gemini 통합 호출 | 🔴 |
| 4-2 | 채팅 UI 컴포넌트 | Right Panel 채팅창 — 메시지 목록, 입력창, 스트리밍 응답 | 🔴 |
| 4-3 | AI 모델 선택 UI | 드롭다운으로 AI 모델 전환 | 🔴 |
| 4-4 | 시스템 프롬프트 구성 | 현재 선택된 종목·재무 데이터를 시스템 프롬프트에 자동 주입 | 🔴 |
| 4-5 | 대화 히스토리 관리 | 대화 배열 유지, 종목 변경 시 컨텍스트 리셋 여부 선택 | 🟡 |
| 4-6 | 질문 템플릿 UI | 8개 카테고리 · 40개 질문 버튼 → 클릭 시 입력창 자동 채움 | 🟡 |
| 4-7 | AI 핵심요약 카드 | 분기보고서 선택 시 자동 생성 (재무 탭 상단에 표시) | 🔴 |
| 4-8 | 응답 스트리밍 | SSE 기반 실시간 스트리밍 표시 (UX 개선) | 🟢 |

### 멀티 AI 호출 구조

```javascript
// aiApi.js
const AI_CONFIGS = {
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
    buildHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }),
    buildBody: (messages, systemPrompt) => ({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages
    })
  },
  gpt4o: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    // ...
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions', // OpenAI 호환
    model: 'deepseek-reasoner',
    // ...
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    // ...
  }
};
```

### AI 핵심요약 카드 (자동 생성)

분기보고서 선택 시 재무 수치를 AI에 전달 → 투자자 관점 핵심 포인트 3~5개 카드 생성:

```
📈 영업이익률 급개선 — 10.8% → 15.5% (YoY +4.7%p)
🏗️ 신공장 건설 진행중 — 건설중인자산 282억, 2025.11 완공 예정
⚠️ 전환사채 리스크 — CB 210억 발행, 부채비율 34%→63%
```

### 산출물
- [x] 4개 AI 모델 중 1개 이상 정상 대화 동작
- [x] 재무 데이터 기반 질의응답 동작
- [x] 핵심요약 카드 자동 생성 동작

---

## 10. Phase 5 — DB 구축 · 공시/뉴스 수집 · UI

> 목표: Supabase DB 구축, 사업보고서 파싱·저장, 뉴스 수집, 뉴스·공시·IR 탭 UI 구현

### 배경 및 설계 원칙

| 항목 | 결정 |
|------|------|
| DB | Supabase (PostgreSQL + pgvector + Storage) |
| 저장 대상 | 공시 조회된 종목만 On-demand 저장 (전체 상장사 사전 수집 X) |
| AI 사용 시점 | DB **저장 시** AI 없음 — 규칙 기반 파싱만 사용 / **조회 시**에만 AI 사용 |
| 텍스트 압축 | PostgreSQL TOAST 자동 처리 (별도 설정 불필요) |
| 벡터 임베딩 | content TEXT로 먼저 저장 → Phase 6에서 embedding 컬럼 추가 |
| 파티셔닝 | 현 규모(수십만 rows)에서 불필요 → B-tree 인덱스로 충분 |

### DB 스키마

```sql
-- 기업 마스터
CREATE TABLE companies (
  corp_code   TEXT PRIMARY KEY,  -- DART 기업코드
  corp_name   TEXT NOT NULL,
  stock_code  TEXT,
  market      TEXT,              -- KOSPI / KOSDAQ
  sector      TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 보고서 메타
CREATE TABLE reports (
  id          BIGSERIAL PRIMARY KEY,
  corp_code   TEXT REFERENCES companies(corp_code),
  rcpno       TEXT UNIQUE NOT NULL,  -- DART 접수번호
  report_type TEXT,                  -- 사업/반기/분기보고서
  bsns_year   TEXT,                  -- 사업연도
  filed_at    DATE,
  raw_file_url TEXT,                 -- Supabase Storage URL (원본 XML)
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 재무제표 수치 (구조화)
CREATE TABLE financials (
  id            BIGSERIAL PRIMARY KEY,
  report_id     BIGINT REFERENCES reports(id),
  fs_div        TEXT,   -- OFS(별도) / CFS(연결)
  sj_div        TEXT,   -- BS / IS / CIS / CF
  account_id    TEXT,
  account_nm    TEXT,
  curr_amount   BIGINT, -- 당기
  prev_amount   BIGINT, -- 전기
  prev2_amount  BIGINT  -- 전전기
);

-- 사업부문별 매출 (구조화)
CREATE TABLE segment_revenues (
  id            BIGSERIAL PRIMARY KEY,
  report_id     BIGINT REFERENCES reports(id),
  segment_name  TEXT,
  revenue       BIGINT,
  op_income     BIGINT,
  ratio         NUMERIC(5,2),
  bsns_year     TEXT
);

-- 생산능력 / 가동률 (구조화)
CREATE TABLE production_stats (
  id                BIGSERIAL PRIMARY KEY,
  report_id         BIGINT REFERENCES reports(id),
  product_name      TEXT,
  capacity          BIGINT,
  output            BIGINT,
  utilization_rate  NUMERIC(5,2),
  bsns_year         TEXT
);

-- 원재료 가격 (구조화)
CREATE TABLE raw_material_prices (
  id                  BIGSERIAL PRIMARY KEY,
  report_id           BIGINT REFERENCES reports(id),
  material_name       TEXT,
  unit                TEXT,
  price_curr          NUMERIC,
  price_prev          NUMERIC,
  price_change_pct    NUMERIC(5,2)
);

-- 수주잔고 (구조화)
CREATE TABLE order_backlogs (
  id               BIGSERIAL PRIMARY KEY,
  report_id        BIGINT REFERENCES reports(id),
  product_name     TEXT,
  contract_amount  BIGINT,
  backlog_amount   BIGINT,
  as_of_date       DATE
);

-- R&D 현황 (구조화)
CREATE TABLE rd_expenses (
  id                  BIGSERIAL PRIMARY KEY,
  report_id           BIGINT REFERENCES reports(id),
  total_rd_cost       BIGINT,
  rd_to_sales_ratio   NUMERIC(5,2),
  key_projects        JSONB   -- [{ name, status, expected_date }]
);

-- 비정형 텍스트 섹션 (RAG용)
CREATE TABLE report_sections (
  id           BIGSERIAL PRIMARY KEY,
  report_id    BIGINT REFERENCES reports(id),
  section_key  TEXT,   -- 'business_overview' | 'products_services' | 'market_competition'
                        -- 'risk_factors' | 'rd_pipeline' | 'management_strategy' | 'related_party'
  content      TEXT,   -- HTML 태그 제거한 원문 텍스트
  -- embedding vector(1536)  ← Phase 6에서 추가 (pgvector)
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 뉴스 (최신 맥락)
CREATE TABLE news_items (
  id           BIGSERIAL PRIMARY KEY,
  corp_code    TEXT REFERENCES companies(corp_code),
  title        TEXT,
  summary      TEXT,
  published_at TIMESTAMPTZ,
  url          TEXT,
  source       TEXT,  -- 'naver' 등
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_reports_corp ON reports(corp_code);
CREATE INDEX idx_financials_report ON financials(report_id, sj_div);
CREATE INDEX idx_sections_report ON report_sections(report_id, section_key);
CREATE INDEX idx_news_corp ON news_items(corp_code, published_at DESC);
```

### 사업보고서 섹션 추출 매핑

| section_key | DART 보고서 섹션 | AI 활용 용도 |
|-------------|-----------------|-------------|
| `business_overview` | II. 사업의 내용 > 1. 사업의 개요 | 경쟁사 대비 포지셔닝 |
| `products_services` | 2. 주요 제품 및 서비스 | 제품 믹스 변화 추론 |
| `market_competition` | 시장 환경, 경쟁 현황 | 산업 구조 이해 |
| `risk_factors` | 주요 위험 요인 | 투자 리스크 요약 |
| `rd_pipeline` | 연구개발 진행 과제 서술 | 기술 경쟁력 평가 |
| `management_strategy` | 경영진 전략 메시지 | 중장기 방향성 |
| `related_party` | 특수관계인 거래 | 지배구조 리스크 |

### 작업 목록

#### Phase 5-A: DB 인프라

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 5-1 | Supabase 프로젝트 생성 | 프로젝트 생성, 환경변수 설정 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) | 🔴 |
| 5-2 | DB 스키마 마이그레이션 | 위 DDL 실행, 인덱스 생성 | 🔴 |
| 5-3 | Supabase 클라이언트 설정 | `src/services/dbApi.js` — supabase-js 초기화 | 🔴 |

#### Phase 5-B: 공시 파싱 · 저장

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 5-4 | 사업보고서 원문 다운로드 | DART `document.xml` API 호출 → Supabase Storage 저장 | 🔴 |
| 5-5 | HTML 파싱 → 구조화 테이블 | 규칙 기반 파싱: segment_revenues, production_stats, raw_material_prices 등 INSERT | 🔴 |
| 5-6 | 섹션 텍스트 추출 | HTML 태그 제거 → report_sections INSERT | 🔴 |
| 5-7 | On-demand 수집 훅 | 종목 조회 시 DB 미존재 → DART pull → DB 저장 → 반환 | 🟡 |

#### Phase 5-C: 뉴스 수집 · UI

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 5-8 | 뉴스 수집 → DB 저장 | 네이버 뉴스 검색 → news_items INSERT | 🔴 |
| 5-9 | 뉴스 탭 — 뉴스 서브탭 | news_items 조회 → 카드형 리스트 표시 | 🔴 |
| 5-10 | 뉴스 탭 — 공시 서브탭 | DART 최신 공시 목록 표시 | 🔴 |
| 5-11 | IR 탭 구현 | DART `pblntf_ty=F` 기업설명회 자료 + IR 홈페이지 링크 | 🟡 |

### 데이터 흐름

```
사용자가 종목 선택
  └─ DB에 해당 종목 보고서 있음? ─── Yes ──→ DB에서 직접 반환
                                  └── No ──→ DART에서 다운로드
                                              → 규칙 기반 파싱
                                              → DB INSERT
                                              → 반환

AI 채팅 질문 수신 (Phase 6)
  └─ financials (수치) + report_sections (텍스트) + news_items (최신 뉴스)
     → 컨텍스트 조합 → AI에게 전달 → 답변 생성
```

### 산출물
- [ ] Supabase DB 스키마 생성 완료
- [ ] 수소 테마 4종목 사업보고서 파싱·저장 성공
- [ ] 뉴스 수집·표시 동작
- [ ] 공시 목록·IR 탭 동작

---

## 11. Phase 6 — 관리 페이지 및 설정

> 목표: 테마/종목 관리 페이지, API 키 설정 페이지 구현

### 작업 목록

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 6-1 | 라우팅 설정 | React Router — `/`, `/admin/themes`, `/settings` | 🔴 |
| 6-2 | 테마 관리 페이지 | 테마 CRUD (추가·수정·삭제) | 🔴 |
| 6-3 | 종목 관리 기능 | 종목 추가 (코드 입력 → DART 회사명 자동 조회), 밸류체인 포지션·IR URL·메모 입력, 삭제 | 🔴 |
| 6-4 | JSON Export/Import | 테마 데이터 백업·복원 기능 | 🟡 |
| 6-5 | 설정 페이지 | API 키 입력 (DART, 네이버, Claude, GPT, DeepSeek, Gemini) | 🔴 |
| 6-6 | API 키 저장 | localStorage에 저장, 마스킹 표시 | 🔴 |
| 6-7 | AI 모델 기본값 설정 | 기본 AI 모델 선택 기능 | 🟢 |

### API 키 관리 방식

```
localStorage 구조:
  investinsight_dart_key     = "xxxxxxxx"
  investinsight_naver_id     = "xxxxxxxx"
  investinsight_naver_secret = "xxxxxxxx"
  investinsight_claude_key   = "sk-ant-xxxxx"
  investinsight_gpt_key      = "sk-xxxxx"
  investinsight_deepseek_key = "sk-xxxxx"
  investinsight_gemini_key   = "AIzaxxxxx"
  investinsight_default_ai   = "claude"
```

> 개인용 앱이므로 localStorage 충분. 인증/로그인 불필요.

### 산출물
- [x] 테마·종목 관리 CRUD 동작
- [x] API 키 저장·로드 동작

---

## 12. Phase 7 — 고도화 및 최적화

> 목표: UX 개선, 성능 최적화, 추가 기능

### 작업 목록

| # | 작업 | 상세 | 우선순위 |
|---|------|------|---------|
| 7-1 | 밸류체인 Reactflow 전환 | Mermaid.js → Reactflow 업그레이드 (드래그, 줌, 커스텀 노드) | 🟡 |
| 7-2 | 종목 비교 기능 | 재무 탭에서 2~3개 종목 선택 → 재무 지표 병렬 비교 테이블 | 🟡 |
| 7-3 | XBRL 파싱 통합 | DART XBRL 파일 다운로드·파싱 → AI 컨텍스트 정밀도 향상 | 🟡 |
| 7-4 | 다크 모드 | Tailwind dark mode 적용 | 🟢 |
| 7-5 | 키움 테마 추출 스크립트 | `kiwoom-theme-extract.py` — 초기 시드 데이터 대량 추출 | 🟡 |
| 7-6 | 테마 확장 | 2차전지·반도체·AI인프라·방산 등 테마 데이터 추가 | 🟢 |
| 7-7 | 성능 최적화 | API 호출 디바운싱, 컴포넌트 메모이제이션, 코드 스플리팅 | 🟢 |
| 7-8 | PWA 지원 | 오프라인 캐시, 홈 화면 추가 | 🟢 |
| 7-9 | DB 전환 (선택) | JSON 파일 → Supabase 등 DB 전환 (멀티 디바이스 동기화) | 🟢 |

---

## 13. 마일스톤 및 일정

| 마일스톤 | Phase | 핵심 목표 | 완료 기준 |
|----------|-------|----------|----------|
| **M0 — 인프라 준비** | Phase 0 | 프로젝트 세팅, CORS 프록시 | DART API 프록시 호출 성공 |
| **M1 — 데이터 파이프라인** | Phase 1 | DART 재무 데이터 조회 | 수소 테마 4종목 재무 데이터 표시 |
| **M2 — 메인 화면** | Phase 2 | 3단 레이아웃, 테마/종목 탐색 | 테마 선택 → 종목 → 재무 플로우 |
| **M3 — 밸류체인** | Phase 3 | 밸류체인 시각화 | 수소 테마 밸류체인 다이어그램 |
| **M4 — AI 분석** | Phase 4 | AI 채팅, 핵심요약 | AI와 재무 데이터 기반 대화 가능 |
| **M5 — DB+뉴스/IR** | Phase 5 | Supabase DB, 공시 파싱·저장, 뉴스·IR UI | DB 스키마 완성, 4종목 보고서 저장, 뉴스 탭 동작 |
| **M6 — 관리 도구** | Phase 6 | 테마 관리, 설정 | 테마·종목 CRUD, API 키 관리 |
| **M7 — 고도화** | Phase 7 | Reactflow, 종목 비교 등 | 사용성 전반 개선 |

---

## 14. 미결 결정사항 및 대응 방안

| 항목 | 현재 결정 | 비고 |
|------|----------|------|
| CORS 처리 | Vercel Edge Function 프록시 | Phase 0에서 최우선 해결 |
| API 키 저장 | localStorage | 개인용 앱, 암호화 불필요 |
| 인증/로그인 | 불필요 | 개인용 |
| 데이터 캐싱 | localStorage 캐싱 | 재무 데이터 분기별 갱신, TTL 설정 |
| 테마 데이터 저장 | JSON 파일 | 추후 DB 전환 가능 (Phase 7) |
| 상태 관리 | React Context → 필요 시 Zustand | 초기 단순하게 시작 |
| 밸류체인 시각화 | Mermaid.js → Reactflow | Phase 3에서 Mermaid, Phase 7에서 Reactflow |
| AI 모델 | 멀티 AI 지원 | 사용자 선택, API 키 각자 관리 |
| **배포 방식** | **미정 (개발 후반부 결정)** | 웹/PWA/네이티브앱/데스크톱앱 모두 가능하도록 개발 (섹션 3 참조) |

---

## 15. 리스크 및 대응

| 리스크 | 영향도 | 대응 |
|--------|-------|------|
| DART API 일일 한도(10,000건) 초과 | 높음 | localStorage 캐싱으로 중복 호출 최소화 |
| DART API CORS 차단 | 높음 | Vercel Edge Function 프록시 (Phase 0 최우선) |
| AI API 호출 비용 증가 | 중간 | 사용자 본인 API 키, 토큰 사용량 표시 |
| 네이버 API 변경/중단 | 낮음 | 뉴스 기능은 보조, 핵심 기능(DART/AI)에 영향 없음 |
| 키움 OpenAPI 접근 불가 | 낮음 | 수동 데이터 입력으로 대체 가능 |
| 소형주 XBRL 데이터 미제공 | 중간 | JSON API 재무제표로 fallback |

---

## 16. 기술 참고 사항

### Vercel Edge Function — DART 프록시 예시

```javascript
// api/dart/[...path].js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const dartPath = url.pathname.replace('/api/dart/', '');
  const params = new URLSearchParams(url.search);
  params.set('crtfc_key', process.env.DART_API_KEY);

  const dartUrl = `https://opendart.fss.or.kr/api/${dartPath}?${params}`;
  const res = await fetch(dartUrl);
  const data = await res.json();

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### localStorage 캐싱 유틸 예시

```javascript
// utils/cache.js
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일 (분기 데이터용)

export function getCached(key) {
  const item = localStorage.getItem(key);
  if (!item) return null;
  const { data, timestamp } = JSON.parse(item);
  if (Date.now() - timestamp > CACHE_TTL) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
}

export function setCache(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}
```

---

*최종 업데이트: 2026-02-28*
*기반 문서: PROJECT_CONTEXT (1).md*
