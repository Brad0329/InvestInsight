# Phase 6 개발 일지 — 테마/종목 관리 페이지 + Supabase 이전

> 작업일: 2026-02-28

---

## 완료 작업

### 6-A: DB 스키마 추가

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 6-1 | themes + theme_stocks 테이블 생성 | `supabase/migrations/002_themes.sql` | ✅ |
| 6-2 | 수소 테마 시드 데이터 (4종목) | `supabase/migrations/002_themes.sql` | ✅ |

### 6-B: 서비스 레이어

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 6-3 | 테마 CRUD 함수 (`getThemes`, `upsertTheme`, `deleteTheme`) | `src/services/dbApi.js` | ✅ |
| 6-4 | 종목 CRUD 함수 (`upsertThemeStock`, `deleteThemeStock`) | `src/services/dbApi.js` | ✅ |

### 6-C: AppContext Supabase 연동

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 6-5 | themes 정적 임포트 → Supabase 비동기 로딩 | `src/context/AppContext.jsx` | ✅ |
| 6-6 | `themesLoading`, `refreshThemes` Context 노출 | `src/context/AppContext.jsx` | ✅ |

### 6-D: AdminPage CRUD UI

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 6-7 | 테마 목록 (ThemeList) — 선택/추가 | `src/pages/AdminPage.jsx` | ✅ |
| 6-8 | 테마 편집 (ThemeEditor) — 이름/설명/스테이지 | `src/pages/AdminPage.jsx` | ✅ |
| 6-9 | 종목 목록 (StockList) — 표시/삭제 | `src/pages/AdminPage.jsx` | ✅ |
| 6-10 | 종목 추가 (StockAddPanel) — 검색→선택→저장 | `src/pages/AdminPage.jsx` | ✅ |
| 6-11 | JSON 내보내기 | `src/pages/AdminPage.jsx` | ✅ |

---

## 설치 패키지

없음 (기존 패키지 재사용)

---

## 아키텍처 설계 결정

### themes/theme_stocks 테이블 구조

```
themes
  id TEXT PK           -- 영문 slug (예: 'hydrogen')
  name TEXT            -- 한국어 테마명
  description TEXT
  stages JSONB         -- [{id, label, sub}, ...] 밸류체인 스테이지 배열

theme_stocks
  theme_id TEXT FK → themes(id) CASCADE DELETE
  corp_code TEXT       -- DART 기업코드 8자리
  corp_name TEXT       -- 표시용 비정규화 (companies 미등록 종목도 표시)
  stock_code TEXT      -- 종목코드 5자리 (표시용)
  stage_id TEXT        -- 밸류체인 스테이지 id
  value_chain TEXT
  ir_url TEXT
  memo TEXT
  UNIQUE(theme_id, corp_code)
```

### corp_name/stock_code 비정규화 이유
- companies 테이블은 On-demand 방식 (사용자가 종목 조회 시점에 저장)
- AdminPage에서 종목 추가 직후 목록에 이름 표시를 위해 corp_name/stock_code를 theme_stocks에 함께 저장
- JOIN 없이 getThemes() 단순화

### AppContext 폴백 전략
- 초기값: `themes.json` (Supabase 미설정/오프라인 시 기본 동작 보장)
- Supabase 로드 성공 시 → setThemes(rows)로 갱신
- `refreshThemes()`: AdminPage CRUD 후 전역 테마 상태 동기화

### AdminPage 컴포넌트 구조 (단일 파일)
```
AdminPage
├── ThemeList         — 좌측 패널 (테마 목록 + "+ 새 테마")
├── ThemeEditor       — 우측 상단 (이름/설명/스테이지 편집)
│   └── StageRow      — 스테이지 행 컴포넌트
├── StockList         — 우측 중단 (종목 목록 + 삭제)
└── StockAddPanel     — 우측 하단 (기업명 검색→선택→추가 아코디언)
```

---

## 신규 파일 목록

```
supabase/migrations/002_themes.sql
Dev_Docs/phase6_dev.md
```

## 수정 파일 목록

```
src/services/dbApi.js          — 테마 CRUD 5개 함수 추가
src/context/AppContext.jsx     — Supabase 비동기 themes 로딩 + themesLoading/refreshThemes
src/pages/AdminPage.jsx        — 전체 CRUD UI 구현
```

---

## Supabase 마이그레이션 실행 (수동)

Supabase SQL Editor에서 실행:

```sql
-- supabase/migrations/002_themes.sql 전체 붙여넣기
```

---

## 검증 방법

1. Supabase SQL Editor에서 `002_themes.sql` 실행 → themes/theme_stocks 테이블 및 시드 확인
2. 개발 서버 실행 (`npm run dev`) → `/admin/themes` 접속
3. 테마 선택 → 이름/설명 수정 → 저장 → 새로고침 후 유지 확인
4. 종목 검색 (예: `한선엔지니어링`) → 선택 → 저장 → 목록에 추가 확인
5. 종목 삭제 → 목록에서 제거 확인
6. 메인 화면 LeftPanel에서 편집된 테마/종목 반영 확인
7. JSON 내보내기 → 파일 다운로드 → 형식 확인

---

## 미완료 (Phase 7 예정)

- `report_sections` → AI 시스템 프롬프트 연결 (섹션 내용 읽기 + systemPrompt 주입)
- `business_overview` 텍스트 잘림 개선 (10,000자 → 확대 또는 AI 요약 저장)
- AdminPage JSON 가져오기 (현재는 내보내기만 구현)
- AdminPage 종목 편집 (현재는 삭제 후 재추가)
