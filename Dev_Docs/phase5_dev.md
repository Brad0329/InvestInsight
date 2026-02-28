# Phase 5 개발 일지 — DB 구축 · 공시/뉴스 수집 · UI

> 작업일: 2026-02-28

---

## 완료 작업

### 5-A: DB 인프라

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 5-1 | Supabase 프로젝트 생성 | (수동) | 사용자 진행 중 |
| 5-2 | DB 스키마 마이그레이션 | `supabase/migrations/001_initial_schema.sql` | ✅ |
| 5-3 | Supabase 클라이언트 설정 | `src/services/dbApi.js` | ✅ |

### 5-B: 공시 파싱 · 저장

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 5-4 | 사업보고서 원문 다운로드 | `api/dart-doc.js` | ✅ |
| 5-5 | HTML 파싱 → 섹션 텍스트 추출 | `src/services/dartDocService.js` | ✅ |
| 5-6 | 섹션 텍스트 → report_sections INSERT | `src/services/dartDocService.js` | ✅ |
| 5-7 | On-demand 수집 훅 (`ensureReport`) | `src/services/dartDocService.js` | ✅ |
| 5-12 | Python 배치 수집 스크립트 | `scripts/collect_sections.py` | ✅ |
| 5-13 | 4개 종목 사업보고서 섹션 DB 저장 완료 | Supabase `report_sections` | ✅ |

### 5-C: 뉴스 수집 · UI

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 5-8 | 뉴스 수집 → DB 저장 | `src/hooks/useNewsData.js` + `src/services/dbApi.js` | ✅ |
| 5-9 | 뉴스 탭 — 뉴스 서브탭 | `src/components/news/NewsTabContent.jsx` | ✅ |
| 5-10 | 뉴스 탭 — 공시 서브탭 | `src/components/news/DisclosureList.jsx` | ✅ |
| 5-11 | IR 탭 구현 | `src/components/news/IrTabContent.jsx` | ✅ |

---

## 설치 패키지

```
@supabase/supabase-js
```

---

## 환경변수 추가 (.env.local)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...
NAVER_CLIENT_ID=xxxx
NAVER_CLIENT_SECRET=xxxx
```

---

## 아키텍처 설계 결정

### DB vs localStorage 역할 분리
- **localStorage** : DART API 응답 단기 캐싱 (기존 유지, TTL 기반)
- **Supabase** : 영구 저장 — companies, reports, financials, report_sections, news_items
- **흐름** : 종목 선택 → DB 확인 → 없으면 DART 수집 → DB 저장 → 반환

### 뉴스 DB 저장 전략
- 6시간마다 자동 갱신 (`_isOlderThanHours(created_at, 6)`)
- 중복 URL은 `ignoreDuplicates: true`로 처리
- DB에 없으면 네이버 검색 → upsert → 재조회

### 사업보고서 섹션 파싱

**브라우저 On-demand 경로 (dartDocService.js)**
- DART `document.xml` API → ZIP 다운로드 → HTML 파일 추출
- 단, 최신 상장사 보고서는 XBRL XML만 반환 → report_sections 저장 불가 (한계)
- 파싱 실패해도 전체 흐름 막지 않음 (try/catch 격리)

**Python 배치 수집 경로 (scripts/collect_sections.py)**
- DART 뷰어 HTML (`dsaf001/main.do`) 직접 파싱
- JavaScript `nodeX['text'/'dcmNo'/'eleId'/'offset'/'length']` 블록 단위 파싱
  - `node1['text']` 재등장 시 새 블록 시작 (DART가 15개 블록에서 node1~nodeN 재사용)
- `viewer.do?rcpNo=&dcmNo=&eleId=&offset=&length=` 로 섹션별 HTML 개별 취득
- HTML 태그 제거 → 플레인텍스트 → 10,000자 제한 후 Supabase upsert
- `SECTION_KEY_MAP` 패턴: `사업의 내용`, `경영진단`, `계열회사`, `그 밖에 투자자` 등
- 4개 종목 × 4개 섹션 = 16개 저장 완료 (2026-02-28)

**⚠️ 알려진 한계**
- `business_overview` 섹션 원문 ~34,000자 → 10,000자로 잘림
- Phase 6 개선 예정: 제한 완화 또는 AI 요약 후 저장

---

## 신규 파일 목록

```
supabase/migrations/001_initial_schema.sql
src/services/dbApi.js
src/services/dartDocService.js
api/dart-doc.js
src/hooks/useNewsData.js
src/hooks/useAutoCollect.js
src/components/news/NewsCard.jsx
src/components/news/DisclosureList.jsx
src/components/news/NewsTabContent.jsx
src/components/news/IrTabContent.jsx
scripts/collect_sections.py
scripts/requirements.txt
```

## 수정 파일 목록

```
src/components/layout/CenterPanel.jsx  — 뉴스/IR 플레이스홀더 → 실제 컴포넌트 교체
vite.config.js                         — dart-doc 미들웨어 추가, news proxy 헤더 주입
vercel.json                            — env 변수 참조 추가
```

---

## Supabase 설정 순서 (수동)

1. [supabase.com](https://supabase.com) → New Project 생성
2. Project Settings → API → `Project URL` + `anon public` key 복사
3. `.env.local`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가
4. Supabase SQL Editor → `supabase/migrations/001_initial_schema.sql` 전체 실행
5. Vercel 환경변수에도 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록

---

## 미완료 (Phase 6 예정)
- `report_sections` 텍스트 잘림 개선: 10,000자 제한 완화 또는 AI 요약 저장
- `report_sections` → AI 시스템 프롬프트 연결 (현재 저장만 됨, 읽기 미구현)
- `useAutoCollect` 호출 위치를 종목 등록(admin) 시점으로 이동
- financials 저장 후 localStorage 캐시 동기화 여부 결정
- segment_revenues, production_stats 등 구조화 테이블 파싱 로직
