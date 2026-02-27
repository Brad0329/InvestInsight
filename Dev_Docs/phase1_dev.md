# Phase 1 — 핵심 데이터 플로우: DART API 실제 연동 (개발 히스토리)

> 작성일: 2026-02-27
> 목표: DART API를 통한 회사검색 → 공시조회 → 재무제표 조회 파이프라인 완성

---

## 1. Phase 0에서 발견된 문제점

| 문제 | 영향 | 해결 |
|------|------|------|
| Vite dev 프록시가 DART API 키를 주입하지 않음 | 로컬에서 DART 호출 불가 | vite.config.js에 `configure` 콜백 추가 |
| `searchCompany(corpName)` 잘못된 파라미터 | DART `company.json`은 `corp_code` 필요 | `getCompanyInfo(corpCode)`로 수정 |
| DART 응답 상태코드 미처리 | HTTP 200이지만 실제 에러인 경우 감지 불가 | `validateDartResponse()` + `DartApiError` 클래스 |
| 캐싱 미통합 | 매번 API 호출 → 일일 한도 소진 위험 | `cachedFetch()` 패턴으로 캐시 통합 |
| `cache.js`가 localStorage 직접 호출 | 프로젝트 규칙(storage.js 추상화) 위반 | `storage.get/set/remove` 사용으로 전환 |
| `getDisclosureList` 날짜 범위 파라미터 누락 | 조회 범위 제한 불가 | options 객체로 `bgnDe`, `endDe` 추가 |

---

## 2. 작업 상세

### 2-1. API 키 주입 (vite.config.js + .env.local)

**문제**: Vite proxy는 URL 리라이트만 수행하고, DART API 키(`crtfc_key`)를 주입하지 않음.
프로덕션에서는 Vercel Edge Function이 `process.env.DART_API_KEY`로 주입하지만, 로컬 개발에는 이 메커니즘이 없음.

**해결**:
```javascript
// vite.config.js
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // VITE_ 접두어 없는 것도 로드

  return {
    server: {
      proxy: {
        '/api/dart': {
          // ... rewrite 설정 ...
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const url = new URL(proxyReq.path, 'http://localhost');
              url.searchParams.set('crtfc_key', env.DART_API_KEY);
              proxyReq.path = url.pathname + url.search;
            });
          },
        },
      },
    },
  };
});
```

- `.env.local`에 `DART_API_KEY` 저장 (이미 `.gitignore`에 포함)
- `loadEnv(mode, cwd, '')`의 세 번째 인자 `''`는 모든 환경변수를 로드 (VITE_ 접두어 없는 것 포함)
- API 키는 Vite 프록시(Node.js 프로세스)에서만 사용 → 브라우저에 노출 안 됨

---

### 2-2. DART 에러 처리 체계 (dartErrors.js)

**신규 파일**: `src/services/dartErrors.js`

DART API 특성: HTTP 상태코드는 항상 200이고, JSON 응답의 `status` 필드로 실제 상태를 전달.

| status | 의미 | 처리 |
|--------|------|------|
| `"000"` | 정상 | 성공 처리 |
| `"013"` | 데이터 없음 | DartApiError(isNoData) — 호출부에서 빈 결과로 처리 |
| `"020"` | 요청 한도 초과 | DartApiError(isRateLimited) — 재시도 가능 |
| `"010"`, `"011"` | API 키 오류 | DartApiError(isAuthError) |
| `"100"` | 파라미터 오류 | DartApiError |
| `"800"` | 서버 처리 중 | DartApiError(isRetryable) |

**`DartApiError` 클래스**: `isNoData`, `isRateLimited`, `isAuthError`, `isRetryable` getter 제공.

---

### 2-3. 캐시 레이어 통합

**수정 파일**: `src/utils/cache.js`, `src/services/dartApi.js`

#### cache.js 수정
- `localStorage` 직접 호출 → `storage.get/set/remove` 사용
- `storage.get()`이 이미 JSON.parse 수행하므로 이중 파싱 방지
- `clearCache()`만 localStorage 직접 접근 유지 (키 순회 필요)

#### dartApi.js 캐시 통합
```javascript
async function cachedFetch(cacheKey, ttl, fetchFn) {
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;
  const data = await fetchFn();
  setCache(cacheKey, data, ttl);
  return data;
}
```

**차등 TTL 적용**:
| 데이터 | TTL | 근거 |
|--------|-----|------|
| 기업개황 | 30일 | 기본정보는 거의 변경 안 됨 |
| 공시목록 | 1시간 | 새 공시가 올라올 수 있음 |
| 재무제표 | 7일 | 분기별 확정 데이터, 불변 |

---

### 2-4. dartApi.js 전면 재작성

**수정 파일**: `src/services/dartApi.js`

#### API 함수 변경
| Before | After | 변경 사유 |
|--------|-------|----------|
| `searchCompany(corpName)` | `getCompanyInfo(corpCode)` | DART API 스펙: `company.json`은 `corp_code` 파라미터 필요 |
| `getDisclosureList(corpCode, pblntfTy)` | `getDisclosureList(corpCode, options)` | 날짜 범위, 페이지 크기 등 옵션 추가 |
| `getFinancialStatement(corpCode, bsnsYear, reprtCode)` | `getFinancialStatement(corpCode, bsnsYear, reprtCode, fsDiv)` | CFS/OFS 선택 가능 |

#### 추가된 상수
- `REPORT_CODES`: `{ Q1: '11013', HALF: '11012', Q3: '11014', ANNUAL: '11011' }`
- `REPORT_CODE_NAMES`: 한글 명칭 매핑
- `STATEMENT_TYPES`: `{ BS, IS, CIS, CF, SCE }`

#### 추가된 헬퍼 함수
- `filterByStatementType(list, sjDiv)` — 재무제표 구분별 필터
- `parseAmount(amountStr)` — DART 금액 문자열 → 숫자 변환
- `formatBillion(amount)` — 억원 단위 포맷
- `extractKeyMetrics(list)` — 주요 재무지표 추출 (매출액, 영업이익, 당기순이익, 자산총계 등)
  - `account_id` 복수 매핑: 예) 영업이익 → `ifrs-full_ProfitLossFromOperatingActivities` 또는 `dart_OperatingIncomeLoss`
- `fetchAllStocksFinancials(stocks, bsnsYear, reprtCode)` — 다종목 일괄 조회 (`Promise.allSettled`)

---

### 2-5. Vercel Edge Function 개선

**수정 파일**: `api/dart/[...path].js`

- CORS preflight (`OPTIONS`) 처리 추가
- `DART_API_KEY` 미설정 시 명확한 에러 응답 (`{ status: '010', message: '...' }`)
- 에러 응답을 DART 형식으로 통일

---

### 2-6. React 훅 (useDartData)

**신규 파일**: `src/hooks/useDartData.js`

`useDartData(corpCode)` 훅:
- `fetchCompanyInfo()`, `fetchDisclosures(options)`, `fetchFinancials(bsnsYear, reprtCode, fsDiv)`
- `loading`, `error` 상태 자동 관리
- `NO_DATA` 에러는 빈 결과로 처리 (UI에서 "데이터 없음" 표시)
- Phase 2에서 UI 컴포넌트와 직접 연동 예정

---

### 2-7. 검증 페이지 (DevTestPage)

**신규 파일**: `src/pages/DevTestPage.jsx`
**라우트**: `/dev/test` (App.jsx에 추가)

기능:
- 연도/보고서 종류 선택 (드롭다운)
- "전체 테스트" 버튼 → 4종목 기업개황 + 공시목록 + 재무제표 순차 조회
- 터미널 스타일 로그 (실시간 진행 상황)
- 결과 요약 테이블 (매출액, 영업이익, 당기순이익, 자산총계, 부채총계)
- 캐시 히트 검증 (응답시간 측정)
- "캐시 삭제" 버튼

---

## 3. 파일 변경 요약

| 파일 | 작업 | LOC |
|------|------|-----|
| `.env.local` | 생성 | 2 |
| `vite.config.js` | 수정 | 37 |
| `src/services/dartErrors.js` | 생성 | 68 |
| `src/utils/cache.js` | 수정 | 40 |
| `src/services/dartApi.js` | 전면 재작성 | 230 |
| `api/dart/[...path].js` | 수정 | 48 |
| `src/hooks/useDartData.js` | 생성 | 94 |
| `src/pages/DevTestPage.jsx` | 생성 | 200 |
| `src/App.jsx` | 수정 (1줄) | 18 |

---

## 4. 빌드 검증

```bash
npx vite build
# vite v7.3.1 building client environment for production...
# ✓ 50 modules transformed.
# dist/index.html         0.60 kB │ gzip: 0.42 kB
# dist/assets/index.css  12.46 kB │ gzip: 3.36 kB
# dist/assets/index.js  245.48 kB │ gzip: 78.91 kB
# ✓ built in 1.00s
```

---

## 5. 검증 방법

1. `.env.local`에 실제 DART API 키 입력
2. `npm run dev` → `http://localhost:5173/dev/test` 접속
3. "전체 테스트" 클릭
4. 확인 항목:
   - 4개 종목 기업개황 정상 조회
   - 공시목록 조회 건수 확인
   - 재무제표 주요 지표 표시
   - 캐시 히트 시 응답시간 <5ms

---

## 6. 트러블슈팅 기록

### 6-1. themes.json corp_code 오류

**증상**: 1분기/반기 보고서 조회 시 "013 (데이터 없음)" 반환.

**원인**: themes.json에 수동 입력된 corp_code 4개 중 3개가 잘못된 기업을 가리키고 있었음.
- 일진하이솔루스: `00862655` → 정체불명 기업. 정정: `00972503`
- LS머트리얼즈: `00126308` → 삼성E&A. 정정: `01528141`
- 아모센스: `00829089` → 에이치엠에이치홀딩스. 정정: `01012987`

**교훈**: 사용자 발견 — "증권사 앱도 항상 종목코드를 먼저 다운받고 시작한다." → **기업코드 자동 다운로드 기능 필요**.

### 6-2. "실행 중" 버튼 고착 버그

**증상**: DevTestPage에서 2025년 사업보고서 조회 시 "실행 중..." 상태에서 멈춤.

**원인**: `runFullTest()`에 최상위 try/finally가 없었음. 캐시 검증(Test 4) 구간에서 `getFinancialStatement()`가 "013" 에러를 throw하면 `setRunning(false)`가 실행되지 않음.

**수정**: 전체를 try/catch/finally로 감싸고, 캐시 검증 구간에 별도 try/catch 추가.

### 6-3. Vite 프록시 경로 충돌

**증상**: `/api/dart-corps` 요청이 DART API 프록시(`/api/dart`)에 매칭됨.

**원인**: `/api/dart` 패턴이 `/api/dart-corps`에도 매칭.

**수정**: 프록시 경로를 `/api/dart/`(trailing slash)로 변경.

### 6-4. ZIP Data Descriptor 문제

**증상**: corpCode.xml ZIP 해제 시 "unexpected end of file" 에러.

**원인**: DART ZIP 파일은 Data Descriptor 플래그(bit 3)를 사용. 이 경우 Local File Header의 CompressedSize가 0으로 기록됨.

**수정**: End of Central Directory(EOCD) → Central Directory → CompressedSize 순으로 실제 압축 크기를 읽도록 변경. `vite.config.js`와 `api/dart-corps.js` 양쪽 수정.

### 6-5. XML 스키마 변경 (corp_eng_name)

**증상**: ZIP 해제 성공 후 regex 매칭 0건.

**원인**: DART corpCode.xml에 `<corp_eng_name>` 필드가 `<corp_name>`과 `<stock_code>` 사이에 추가됨. 기존 regex에 해당 필드 매칭이 없었음.

**수정**: regex에 `<corp_eng_name>[^<]*<\/corp_eng_name>` 패턴 추가.

---

## 7. 기업코드 자동 다운로드 기능

### 7-1. 구현

| 파일 | 작업 | 설명 |
|------|------|------|
| `api/dart-corps.js` | 생성 | Vercel Node.js 함수 — ZIP 다운로드/해제/파싱 |
| `vite.config.js` | 수정 | dev 미들웨어 `/api/dart-corps` 추가 |
| `src/services/dartApi.js` | 수정 | `getCorpCodeList()`, `searchCorpByName()` 추가 |

### 7-2. 흐름

1. 클라이언트 → `/api/dart-corps` 요청
2. 서버(Vite 미들웨어 또는 Vercel 함수) → DART `corpCode.xml` ZIP 다운로드
3. ZIP 해제 (Central Directory에서 크기 읽기) → XML 파싱
4. 상장사만 필터 (stock_code가 있는 것) → JSON 반환
5. 클라이언트에서 7일간 캐시 (CACHE_TTL.CORP_CODES)

### 7-3. 검증 결과

```
/api/dart-corps → { count: 3946, list: [...] }
```

3,946개 상장사 목록 정상 반환 확인.

### 6-6. 손익계산서 sj_div 불일치 (IS vs CIS)

**증상**: 재무제표 조회 시 매출액, 영업이익, 당기순이익이 모두 `-`로 표시. 자산/부채 등 재무상태표(BS) 항목은 정상.

**원인**: `extractKeyMetrics()`가 손익 항목을 `sj_div: 'IS'`(손익계산서)로만 검색. 그러나 수소 테마 4종목은 모두 **CIS(포괄손익계산서)**로 보고하여 IS 항목이 0건.

**수정**: `sj_div` 단일 값 → `sj_divs` 배열로 변경. 손익 항목은 `['IS', 'CIS']` 양쪽에서 매칭.

```javascript
// Before
revenue: { sj_div: 'IS', ids: ['ifrs-full_Revenue'], ... }

// After
revenue: { sj_divs: ['IS', 'CIS'], ids: ['ifrs-full_Revenue'], ... }
```

---

## 8. 다음 단계 (Phase 2)

- 3단 레이아웃 + 테마/종목 탐색 UI
- `useDartData` 훅을 컴포넌트에 연동
- 종목 선택 → 재무 데이터 자동 로드
- React Context 또는 Zustand로 상태 관리
- 기업코드 자동 다운로드를 앱 초기화 시점에 통합

---

*작성: Claude (Anthropic) — Phase 1 개발 세션*
*최종 업데이트: 2026-02-27*
