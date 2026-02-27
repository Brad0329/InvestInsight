# Phase 0 — 환경 구축 및 인프라 (개발 히스토리)

> 작성일: 2026-02-27
> 목표: 개발 환경 세팅, Vercel 배포 파이프라인 준비, CORS 프록시 해결, 배포 유연성 확보

---

## 1. 작업 순서 및 상세 기록

### 1-1. 프로젝트 초기화 (0-1)

**시도 1 — `npm create vite@latest` 실패**
```bash
npm create vite@latest . -- --template react
```
- 결과: `Operation cancelled`
- 원인: 프로젝트 디렉토리에 기존 파일(`PROJECT_CONTEXT (1).md`, `InvestInsight_DEV_Plan.md`)이 존재하여 create-vite가 비어있지 않은 디렉토리를 거부함

**시도 2 — 수동 초기화 (성공)**
```bash
npm init -y
```
- `package.json` 생성 후, 필요한 필드를 수동 편집:
  - `"private": true` — 실수로 npm에 퍼블리시하지 않도록
  - `"type": "module"` — ESM 모듈 시스템 사용
  - scripts: `dev`, `build`, `preview`

**의존성 설치 (병렬 실행)**
```bash
# 런타임 의존성
npm install react react-dom react-router-dom

# 개발 의존성
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
```

**최종 설치된 패키지 버전:**
| 패키지 | 버전 | 구분 |
|--------|------|------|
| react | ^19.2.4 | dependencies |
| react-dom | ^19.2.4 | dependencies |
| react-router-dom | ^7.13.1 | dependencies |
| vite | ^7.3.1 | devDependencies |
| @vitejs/plugin-react | ^5.1.4 | devDependencies |
| tailwindcss | ^4.2.1 | devDependencies |
| @tailwindcss/vite | ^4.2.1 | devDependencies |

---

### 1-2. 프로젝트 구조 설계 (0-2)

DEV_Plan.md에 정의된 디렉토리 구조를 기반으로 전체 폴더 트리를 생성.

```bash
mkdir -p public/icons \
  src/components/{layout,theme,financial,valuechain,news,ir,chat,common} \
  src/hooks \
  prototypes \
  scripts
```

**생성된 최종 구조:**
```
InvestInsight/
├── public/
│   ├── favicon.svg              # SVG 파비콘 (II 로고)
│   ├── manifest.json            # PWA 매니페스트 (플레이스홀더)
│   └── icons/
│       ├── icon-192.png         # PWA 아이콘 플레이스홀더
│       └── icon-512.png         # PWA 아이콘 플레이스홀더
├── src/
│   ├── main.jsx                 # 앱 엔트리포인트
│   ├── index.css                # Tailwind CSS 임포트
│   ├── App.jsx                  # 라우팅 설정 (React Router)
│   ├── components/
│   │   ├── layout/              # 3단 레이아웃 컴포넌트 (Phase 2)
│   │   ├── theme/               # 테마/종목 목록 (Phase 2)
│   │   ├── financial/           # 재무제표 뷰 (Phase 2)
│   │   ├── valuechain/          # 밸류체인 시각화 (Phase 3)
│   │   ├── news/                # 뉴스·공시 탭 (Phase 5)
│   │   ├── ir/                  # IR 자료 탭 (Phase 5)
│   │   ├── chat/                # AI 채팅 패널 (Phase 4)
│   │   └── common/              # 공용 컴포넌트
│   ├── pages/
│   │   ├── MainPage.jsx         # 메인 분석 화면 (/)
│   │   ├── AdminPage.jsx        # 테마/종목 관리 (/admin/themes)
│   │   └── SettingsPage.jsx     # 설정 (/settings)
│   ├── services/
│   │   ├── dartApi.js           # DART API 호출 래퍼
│   │   ├── newsApi.js           # 네이버 뉴스 API 래퍼
│   │   └── aiApi.js             # 멀티 AI API 호출 (Claude/GPT/DeepSeek/Gemini)
│   ├── data/
│   │   └── themes.json          # 수소 테마 시드 데이터 (4종목)
│   ├── hooks/                   # 커스텀 훅 (추후 추가)
│   └── utils/
│       ├── storage.js           # 스토리지 추상화 레이어
│       └── cache.js             # localStorage 캐싱 유틸
├── api/                         # Vercel Edge Functions (서버리스)
│   ├── dart/
│   │   └── [...path].js         # DART API 프록시
│   └── news.js                  # 네이버 뉴스 API 프록시
├── prototypes/                  # 기존 프로토타입 (향후 보관)
├── scripts/                     # 유틸 스크립트 (키움 추출 등)
├── Dev_Docs/                    # 개발 히스토리 문서
├── index.html                   # SPA 엔트리 HTML
├── vite.config.js               # Vite 설정
├── vercel.json                  # Vercel 배포 설정
├── eslint.config.js             # ESLint flat config
├── .prettierrc                  # Prettier 설정
├── .env.development             # 개발 환경변수
├── .env.production              # 프로덕션 환경변수
└── .gitignore                   # Git 무시 파일
```

---

### 1-3. 핵심 설정 파일 작성

#### vite.config.js
- React 플러그인 + Tailwind CSS v4 Vite 플러그인 등록
- 개발 서버 포트: 5173
- **CORS 프록시 설정** (로컬 개발용):
  - `/api/dart/*` → `https://opendart.fss.or.kr/api/*`
  - `/api/news` → `https://openapi.naver.com/v1/search/news.json`

#### index.html
- `lang="ko"` 설정
- SVG 파비콘 연결
- viewport + description 메타태그
- SPA 엔트리포인트 (`/src/main.jsx`)

#### Tailwind CSS (v4 방식)
- `src/index.css`에서 `@import "tailwindcss";` 한 줄로 설정 완료
- Tailwind v4는 별도 `tailwind.config.js` 불필요 (CSS-first configuration)

---

### 1-4. 환경변수 구조 설계 (0-8)

| 파일 | 용도 |
|------|------|
| `.env.development` | 로컬 개발 — `VITE_API_BASE_URL` 비워둠 (Vite proxy가 처리) |
| `.env.production` | Vercel 배포 — `VITE_API_BASE_URL` 비워둠 (같은 도메인 Edge Function) |

**설계 원칙:**
- 모든 API 호출은 `VITE_API_BASE_URL` 환경변수 기반
- 로컬 개발: Vite dev server proxy가 CORS 처리
- 프로덕션: Vercel Edge Function이 동일 도메인에서 프록시

---

### 1-5. DART API 프록시 구축 (0-4) — 최우선 과제

#### 로컬 개발용 (vite.config.js proxy)
```javascript
proxy: {
  '/api/dart': {
    target: 'https://opendart.fss.or.kr/api',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/dart/, ''),
  },
}
```

#### 프로덕션용 (Vercel Edge Function)
**파일:** `api/dart/[...path].js`
- Vercel의 catch-all 라우팅 활용 (`[...path]`)
- 클라이언트 요청에서 경로 추출 → DART API로 전달
- `process.env.DART_API_KEY`를 서버 측에서 주입 (클라이언트에 키 노출 방지)
- CORS 헤더 + 1시간 캐시 헤더 설정
- 에러 시 502 응답 반환

---

### 1-6. 네이버 뉴스 API 프록시 (0-5)

#### 로컬 개발용 (vite.config.js proxy)
```javascript
proxy: {
  '/api/news': {
    target: 'https://openapi.naver.com/v1/search',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/news/, '/news.json'),
  },
}
```

#### 프로덕션용 (Vercel Edge Function)
**파일:** `api/news.js`
- 네이버 API 인증 헤더를 서버 측에서 주입:
  - `X-Naver-Client-Id` ← `process.env.NAVER_CLIENT_ID`
  - `X-Naver-Client-Secret` ← `process.env.NAVER_CLIENT_SECRET`
- 5분 캐시 설정

---

### 1-7. Vercel 배포 설정 (vercel.json)

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```
- `/api/` 경로 외 모든 요청을 `index.html`로 리다이렉트 (SPA 라우팅)
- Edge Function은 `/api/dart/...`, `/api/news` 경로에서 자동 실행

---

### 1-8. 서비스 레이어 구현

#### dartApi.js
- `dartFetch(endpoint, params)` — 공통 호출 함수
- `searchCompany(corpName)` — 회사 검색
- `getDisclosureList(corpCode, pblntfTy)` — 공시 목록 조회
- `getFinancialStatement(corpCode, bsnsYear, reprtCode)` — 재무제표 조회
- 모든 호출은 `VITE_API_BASE_URL` 기반 상대 경로 사용

#### newsApi.js
- `searchNews(query, display, sort)` — 네이버 뉴스 검색
- 동일하게 환경변수 기반 baseURL

#### aiApi.js
- 4개 AI 모델 통합 설정 객체 (`AI_CONFIGS`):
  - **Claude**: Anthropic API (`claude-sonnet-4-6`)
  - **GPT-4o**: OpenAI API
  - **DeepSeek**: OpenAI 호환 API (`deepseek-reasoner`)
  - **Gemini**: Google Generative AI API (`gemini-2.0-flash`)
- 각 모델별 `buildHeaders`, `buildBody`, `parseResponse` 분리
- `getAvailableModels()` — 설정된 API 키 유무 확인
- `sendMessage(modelId, messages, systemPrompt)` — 통합 호출 인터페이스
- API 키는 `storage` 추상화 레이어에서 읽기

---

### 1-9. 스토리지 추상화 유틸 (0-9)

#### utils/storage.js
```javascript
export const storage = {
  get(key)           // JSON.parse + fallback to raw string
  set(key, value)    // JSON.stringify 후 저장
  remove(key)        // 삭제
  clear()            // 전체 초기화
};
```
- 현재: `localStorage` 기반
- 향후 교체 시 이 파일만 수정 (IndexedDB, SQLite, 클라우드 DB)

#### utils/cache.js
- `getCached(key)` — TTL 기반 캐시 조회 (기본 7일)
- `setCache(key, data, ttl)` — 타임스탬프와 함께 저장
- `clearCache(keyPrefix)` — 접두어 기반 일괄 삭제
- 키 형식: `cache_{key}`로 일반 스토리지와 구분

---

### 1-10. PWA 플레이스홀더 (0-10)

| 파일 | 상태 | 설명 |
|------|------|------|
| `public/manifest.json` | 생성 완료 | 앱 이름, 테마 색상(#0ea5e9), 아이콘 경로 정의 |
| `public/icons/icon-192.png` | 플레이스홀더 | 실제 이미지는 추후 교체 필요 |
| `public/icons/icon-512.png` | 플레이스홀더 | 실제 이미지는 추후 교체 필요 |
| Service Worker | 미생성 | Phase 7에서 `vite-plugin-pwa`로 추가 예정 |

> manifest.json은 index.html에 아직 링크하지 않음 (PWA 활성화는 나중에)

---

### 1-11. 페이지 컴포넌트 (스캐폴딩)

#### App.jsx — 라우팅 설정
```
/              → MainPage    (메인 분석 화면)
/admin/themes  → AdminPage   (테마/종목 관리)
/settings      → SettingsPage (API 키 설정)
```

#### MainPage.jsx — 3단 레이아웃 프리뷰
- **Left Panel** (w-60, 240px): 테마 목록 + 종목 목록 + 하단 네비게이션
- **Center Panel** (flex-1): 탭 바(밸류체인/재무/뉴스/IR) + 빈 콘텐츠 영역
- **Right Panel** (w-90, 360px): AI 모델 선택 드롭다운 + 채팅 영역 + 입력창
- 수소/2차전지/반도체 테마 하드코딩 (Phase 2에서 데이터 바인딩)

#### AdminPage.jsx / SettingsPage.jsx
- 헤더 + "Phase 6에서 구현 예정" 플레이스홀더
- 메인으로 돌아가기 링크

---

### 1-12. 시드 데이터 (themes.json)

수소 테마 4개 종목:

| 종목명 | 코드 | corp_code | 밸류체인 단계 |
|--------|------|-----------|-------------|
| 한선엔지니어링 | 452280 | 00958451 | fuel_cell (연료전지 부품) |
| 일진하이솔루스 | 271940 | 00862655 | storage (수소 저장) |
| LS머트리얼즈 | 417200 | 00126308 | fuel_cell (연료전지 부품) |
| 아모센스 | 357580 | 00829089 | fuel_cell (연료전지 소재) |

밸류체인 단계 5개: 생산 → 저장/운송 → 연료전지 → 모빌리티 → 발전/산업용

---

### 1-13. ESLint + Prettier 설정 (0-7)

**ESLint 설치 시 버전 충돌 이슈:**
```bash
# 실패 — ESLint 10 + eslint-plugin-react-hooks 호환성 문제
npm install -D eslint @eslint/js eslint-plugin-react-hooks ...
# → ERESOLVE: eslint-plugin-react-hooks가 eslint ^9까지만 지원

# 해결 — ESLint 9로 고정
npm install -D eslint@^9 @eslint/js@^9 eslint-plugin-react-hooks@^5 \
  eslint-plugin-react-refresh@^0.4 globals prettier
```

**최종 설치된 버전:**
| 패키지 | 버전 |
|--------|------|
| eslint | ^9.39.3 |
| @eslint/js | ^9.39.3 |
| eslint-plugin-react-hooks | ^5.2.0 |
| eslint-plugin-react-refresh | ^0.4.26 |
| globals | ^17.3.0 |
| prettier | ^3.8.1 |

**ESLint 설정 (flat config 방식):**
- `dist`, `api` 디렉토리 제외
- React Hooks 규칙 적용
- React Refresh 경고 활성화

**Prettier 설정:**
- 싱글 쿼트, trailing comma, 탭 너비 2, 세미콜론 사용, 줄 너비 100

---

### 1-14. 빌드 검증 (0-11)

```bash
npx vite build
```
```
vite v7.3.1 building client environment for production...
✓ 44 modules transformed.
dist/index.html                   0.60 kB │ gzip:  0.43 kB
dist/assets/index-DpDwzGaA.css   11.36 kB │ gzip:  3.09 kB
dist/assets/index-uPM0MM_J.js  234.01 kB │ gzip: 74.68 kB
✓ built in 1.13s
```
- 정적 파일만으로 완결 (서버 의존성 없음)
- `dist/` 디렉토리에 index.html + assets 생성
- Vercel, Netlify, Cloudflare Pages, S3+CloudFront 등 어디든 배포 가능

**개발 서버 검증:**
```bash
npx vite --host
# → http://localhost:5173/ → HTTP 200 응답 확인
```

---

## 2. 배포 유연성 원칙 적용 현황

DEV_Plan.md §3에서 정의한 6가지 원칙의 Phase 0 적용 상태:

| 원칙 | 적용 상태 | 구현 위치 |
|------|----------|----------|
| API 호출 추상화 | 적용 완료 | `services/dartApi.js`, `newsApi.js`, `aiApi.js` — `VITE_API_BASE_URL` 기반 |
| 스토리지 추상화 | 적용 완료 | `utils/storage.js` — localStorage 직접 호출 없이 래퍼 사용 |
| 반응형 UI 필수 | 기반 준비 | Tailwind CSS 설치, 3단 레이아웃 기초 구현 |
| 웹 표준 준수 | 적용 완료 | 네이티브 플러그인 의존 없음, 브라우저 API만 사용 |
| 빌드 산출물 독립성 | 검증 완료 | `vite build` → 순수 정적 파일, Edge Function은 `/api/`에만 사용 |
| PWA 준비 요소 | 파일 생성 | `manifest.json` + 아이콘 플레이스홀더 배치, 활성화는 추후 |

---

## 3. 미해결 사항 및 다음 단계

### Phase 0에서 남은 작업
| 항목 | 상태 | 비고 |
|------|------|------|
| GitHub 리포 생성 + Vercel 연결 (0-3) | 미완료 | GitHub 리포 생성 및 push 후 Vercel 연결 필요 |
| Vercel 환경변수 등록 (0-6) | 미완료 | DART_API_KEY, NAVER_CLIENT_ID/SECRET 등록 필요 |
| PWA 아이콘 실제 이미지 | 미완료 | 플레이스홀더 → 실제 192x192, 512x512 PNG로 교체 |

### Phase 1 진행 예정 항목
- DART API 실제 호출 테스트 (API 키 필요)
- 회사 검색 → 공시 목록 → 재무제표 조회 파이프라인
- 수소 테마 4개 종목 재무 데이터 정상 조회 확인
- 캐싱 레이어 동작 확인

---

## 4. 트러블슈팅 로그

### Issue #1: create-vite 비어있지 않은 디렉토리 거부
- **증상**: `npm create vite@latest . -- --template react` → `Operation cancelled`
- **원인**: 프로젝트 디렉토리에 기획 문서(.md)가 이미 존재
- **해결**: `npm init -y`로 수동 초기화 후 직접 의존성 설치

### Issue #2: ESLint 10 + react-hooks 플러그인 호환성
- **증상**: `npm install -D eslint @eslint/js eslint-plugin-react-hooks` → `ERESOLVE could not resolve`
- **원인**: ESLint 10.x가 최신 릴리즈되었으나, `eslint-plugin-react-hooks@7`은 `eslint ^9`까지만 peer dependency 지원
- **해결**: `eslint@^9`로 버전 고정하여 설치

---

*작성: Claude (Anthropic) — Phase 0 개발 세션*
*최종 업데이트: 2026-02-27*
