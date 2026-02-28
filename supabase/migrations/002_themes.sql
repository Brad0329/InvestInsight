-- ── 테마 마스터 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS themes (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  stages      JSONB        DEFAULT '[]',
  created_at  TIMESTAMPTZ  DEFAULT now(),
  updated_at  TIMESTAMPTZ  DEFAULT now()
);

-- ── 테마별 종목 ──────────────────────────────────────────────
-- corp_name / stock_code 는 표시용 비정규화 컬럼 (companies 미등록 종목도 표시 가능)
CREATE TABLE IF NOT EXISTS theme_stocks (
  id          BIGSERIAL    PRIMARY KEY,
  theme_id    TEXT         REFERENCES themes(id) ON DELETE CASCADE,
  corp_code   TEXT         NOT NULL,
  corp_name   TEXT         DEFAULT '',
  stock_code  TEXT         DEFAULT '',
  stage_id    TEXT,
  value_chain TEXT         DEFAULT '',
  ir_url      TEXT         DEFAULT '',
  memo        TEXT         DEFAULT '',
  created_at  TIMESTAMPTZ  DEFAULT now(),
  UNIQUE(theme_id, corp_code)
);

-- ── 인덱스 ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_theme_stocks_theme_id  ON theme_stocks(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_stocks_corp_code ON theme_stocks(corp_code);

-- ── 시드: 수소 테마 ──────────────────────────────────────────
INSERT INTO themes (id, name, description, stages) VALUES (
  'hydrogen',
  '수소',
  '수소 생산·저장·운송·활용 밸류체인 전반',
  '[
    {"id":"production","label":"생산","sub":"그린/블루수소"},
    {"id":"storage","label":"저장/운송","sub":"압축/액화/암모니아"},
    {"id":"fuel_cell","label":"연료전지","sub":"SOFC/PEMFC"},
    {"id":"mobility","label":"모빌리티","sub":"수소차/버스/선박"},
    {"id":"power","label":"발전/산업용","sub":"혼소발전/제철"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO theme_stocks
  (theme_id, corp_code, corp_name, stock_code, stage_id, value_chain, memo)
VALUES
  ('hydrogen','00958451','한선엔지니어링','452280','fuel_cell','연료전지 부품 (SOFC 배관 모듈)','블룸SK퓨얼셀 1차 벤더, 2021년 선정'),
  ('hydrogen','00972503','일진하이솔루스','271940','storage','수소 저장 (Type 4 압력용기)',''),
  ('hydrogen','01528141','LS머트리얼즈','417200','fuel_cell','연료전지 부품 (탈황장치 캐니스터)','자회사 LS알스코 통해 블룸SK 공급'),
  ('hydrogen','01012987','아모센스','357580','fuel_cell','연료전지 소재 (전해질 기판)','')
ON CONFLICT (theme_id, corp_code) DO NOTHING;
