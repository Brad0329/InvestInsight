-- InvestInsight Phase 5 — 초기 스키마
-- Supabase SQL Editor에서 실행

-- ──────────────────────────────────────────
-- 기업 마스터
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  corp_code   TEXT PRIMARY KEY,          -- DART 기업코드
  corp_name   TEXT NOT NULL,
  stock_code  TEXT,                       -- 종목코드 (비상장사는 NULL)
  market      TEXT,                       -- KOSPI / KOSDAQ
  sector      TEXT,
  ceo_nm      TEXT,
  est_dt      TEXT,                       -- 설립일 YYYYMMDD
  hm_url      TEXT,                       -- 홈페이지 URL
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────
-- 보고서 메타
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id            BIGSERIAL PRIMARY KEY,
  corp_code     TEXT REFERENCES companies(corp_code),
  rcpno         TEXT UNIQUE NOT NULL,     -- DART 접수번호
  report_type   TEXT,                     -- 사업보고서 / 반기보고서 / 분기보고서
  bsns_year     TEXT,                     -- 사업연도 (4자리)
  reprt_code    TEXT,                     -- 11011/11012/11013/11014
  filed_at      DATE,
  raw_file_url  TEXT,                     -- Supabase Storage URL (원본 XML, 선택)
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────
-- 재무제표 수치 (구조화)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financials (
  id            BIGSERIAL PRIMARY KEY,
  report_id     BIGINT REFERENCES reports(id) ON DELETE CASCADE,
  fs_div        TEXT,                     -- OFS(별도) / CFS(연결)
  sj_div        TEXT,                     -- BS / IS / CIS / CF
  account_id    TEXT,
  account_nm    TEXT,
  curr_amount   BIGINT,                   -- 당기 (원 단위)
  prev_amount   BIGINT,                   -- 전기
  prev2_amount  BIGINT,                   -- 전전기
  CONSTRAINT uq_financials UNIQUE (report_id, fs_div, sj_div, account_id)
);

-- ──────────────────────────────────────────
-- 사업부문별 매출 (구조화)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS segment_revenues (
  id            BIGSERIAL PRIMARY KEY,
  report_id     BIGINT REFERENCES reports(id) ON DELETE CASCADE,
  segment_name  TEXT,
  revenue       BIGINT,
  op_income     BIGINT,
  ratio         NUMERIC(5,2),
  bsns_year     TEXT
);

-- ──────────────────────────────────────────
-- 생산능력 / 가동률 (구조화)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_stats (
  id                BIGSERIAL PRIMARY KEY,
  report_id         BIGINT REFERENCES reports(id) ON DELETE CASCADE,
  product_name      TEXT,
  capacity          BIGINT,
  output            BIGINT,
  utilization_rate  NUMERIC(5,2),
  bsns_year         TEXT
);

-- ──────────────────────────────────────────
-- 원재료 가격 (구조화)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raw_material_prices (
  id                  BIGSERIAL PRIMARY KEY,
  report_id           BIGINT REFERENCES reports(id) ON DELETE CASCADE,
  material_name       TEXT,
  unit                TEXT,
  price_curr          NUMERIC,
  price_prev          NUMERIC,
  price_change_pct    NUMERIC(5,2)
);

-- ──────────────────────────────────────────
-- 수주잔고 (구조화)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_backlogs (
  id               BIGSERIAL PRIMARY KEY,
  report_id        BIGINT REFERENCES reports(id) ON DELETE CASCADE,
  product_name     TEXT,
  contract_amount  BIGINT,
  backlog_amount   BIGINT,
  as_of_date       DATE
);

-- ──────────────────────────────────────────
-- R&D 현황 (구조화)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rd_expenses (
  id                  BIGSERIAL PRIMARY KEY,
  report_id           BIGINT REFERENCES reports(id) ON DELETE CASCADE,
  total_rd_cost       BIGINT,
  rd_to_sales_ratio   NUMERIC(5,2),
  key_projects        JSONB     -- [{ name, status, expected_date }]
);

-- ──────────────────────────────────────────
-- 비정형 텍스트 섹션 (RAG용)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_sections (
  id           BIGSERIAL PRIMARY KEY,
  report_id    BIGINT REFERENCES reports(id) ON DELETE CASCADE,
  section_key  TEXT,
  -- 'business_overview' | 'products_services' | 'market_competition'
  -- 'risk_factors' | 'rd_pipeline' | 'management_strategy' | 'related_party'
  content      TEXT,           -- HTML 태그 제거한 원문 텍스트
  -- embedding vector(1536)   ← Phase 6에서 추가 (pgvector)
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_report_sections UNIQUE (report_id, section_key)
);

-- ──────────────────────────────────────────
-- 뉴스 (최신 맥락)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_items (
  id           BIGSERIAL PRIMARY KEY,
  corp_code    TEXT REFERENCES companies(corp_code) ON DELETE CASCADE,
  title        TEXT,
  summary      TEXT,
  published_at TIMESTAMPTZ,
  url          TEXT,
  source       TEXT,           -- 'naver' 등
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_news_url UNIQUE (url)
);

-- ──────────────────────────────────────────
-- 인덱스
-- ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_corp       ON reports(corp_code);
CREATE INDEX IF NOT EXISTS idx_reports_year       ON reports(corp_code, bsns_year, reprt_code);
CREATE INDEX IF NOT EXISTS idx_financials_report  ON financials(report_id, sj_div);
CREATE INDEX IF NOT EXISTS idx_sections_report    ON report_sections(report_id, section_key);
CREATE INDEX IF NOT EXISTS idx_news_corp          ON news_items(corp_code, published_at DESC);
