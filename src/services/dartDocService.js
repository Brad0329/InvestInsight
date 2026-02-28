import { getReport, upsertReport, upsertCompany, upsertReportSection, upsertFinancials } from './dbApi.js';
import { getDisclosureList, getFinancialStatement } from './dartApi.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ──────────────────────────────────────────
// 섹션 키 매핑 — 보고서 HTML 파일 title → section_key
// ──────────────────────────────────────────
const SECTION_KEY_MAP = [
  { key: 'business_overview', patterns: ['사업의 개요', '사업개요', '1. 사업의 내용'] },
  { key: 'products_services', patterns: ['주요 제품', '제품 및 서비스', '주요제품'] },
  { key: 'market_competition', patterns: ['시장 환경', '경쟁 현황', '기타 참고사항', '판매경로'] },
  { key: 'risk_factors', patterns: ['위험관리', '위험 요인', '사업위험', '회사위험'] },
  { key: 'rd_pipeline', patterns: ['연구개발', '연구 개발', 'R&D', '개발 과제'] },
  { key: 'management_strategy', patterns: ['경영진', '경영전략', '전략', '중장기'] },
  { key: 'related_party', patterns: ['특수관계인', '이해관계자와의 거래', '계열회사 현황'] },
];

/**
 * 보고서 HTML 섹션 title로 section_key 추정
 */
function guessSectionKey(title) {
  for (const { key, patterns } of SECTION_KEY_MAP) {
    if (patterns.some((p) => title.includes(p))) return key;
  }
  return null;
}

// ──────────────────────────────────────────
// 사업보고서 On-demand 수집 파이프라인
// ──────────────────────────────────────────

/**
 * 종목 사업보고서 On-demand 수집
 * DB에 없으면 DART에서 내려받아 파싱 → DB 저장 → report id 반환
 *
 * @param {string} corpCode  DART 기업코드
 * @param {string} stockCode 종목코드 (종목 마스터 upsert 용)
 * @param {string} bsnsYear  사업연도 (예: '2023')
 * @param {string} reprtCode 보고서 구분 ('11011'=사업, '11012'=반기, '11013'=1Q, '11014'=3Q)
 * @param {object} companyInfo DART 기업개황 응답 (선택 — 없으면 companies upsert 생략)
 * @returns {Promise<number>} report id
 */
export async function ensureReport({ corpCode, stockCode, bsnsYear, reprtCode, companyInfo = null }) {
  // 1. DB에 이미 있으면 바로 반환
  const existing = await getReport(corpCode, bsnsYear, reprtCode);
  if (existing) return existing.id;

  // 2. companies upsert (기업 마스터)
  if (companyInfo) {
    await upsertCompany(companyInfo, stockCode);
  } else {
    // 최소한의 회사 정보로 upsert
    const { error } = await import('./dbApi.js').then((m) =>
      m.supabase.from('companies').upsert(
        { corp_code: corpCode, corp_name: stockCode || corpCode, stock_code: stockCode, updated_at: new Date().toISOString() },
        { onConflict: 'corp_code' }
      )
    );
    if (error) throw error;
  }

  // 3. 공시 목록에서 해당 보고서의 rcpNo 조회
  const disclosures = await getDisclosureList(corpCode, {
    pblntfTy: 'A', // 정기공시
    bgnDe: `${bsnsYear}0101`,
    endDe: `${parseInt(bsnsYear) + 1}0331`,
  });

  const reprtCodeNames = { '11011': '사업보고서', '11012': '반기보고서', '11013': '분기보고서', '11014': '분기보고서' };
  const targetName = reprtCodeNames[reprtCode] || '사업보고서';
  // bsns_year 필드는 DART list 응답에 없을 수 있으므로 report_nm 매칭만 사용
  // (이미 bgnDe/endDe로 날짜 범위를 좁혔으므로 추가 필터 불필요)
  const disclosure = disclosures?.list?.find((d) => d.report_nm?.includes(targetName));

  if (!disclosure) throw new Error(`${bsnsYear}년 ${targetName}를 찾을 수 없습니다 (후보: ${disclosures?.list?.map(d=>d.report_nm).join(', ')})`);

  // 4. reports upsert
  const reportId = await upsertReport({
    corpCode,
    rcpno: disclosure.rcept_no,
    reportType: disclosure.report_nm,
    bsnsYear,
    reprtCode,
    filedAt: disclosure.rcept_dt
      ? `${disclosure.rcept_dt.slice(0, 4)}-${disclosure.rcept_dt.slice(4, 6)}-${disclosure.rcept_dt.slice(6, 8)}`
      : null,
  });

  // 5. 재무제표 수치 저장 (DART API에서 가져와 구조화 저장)
  await _saveFinancials(reportId, corpCode, bsnsYear, reprtCode);

  // 6. 사업보고서 섹션 텍스트 저장 (사업보고서만)
  if (reprtCode === '11011') {
    await _saveSections(reportId, disclosure.rcept_no);
  }

  return reportId;
}

/**
 * 재무제표 수치를 DART API에서 가져와 financials 테이블에 저장
 */
async function _saveFinancials(reportId, corpCode, bsnsYear, reprtCode) {
  try {
    const stmt = await getFinancialStatement(corpCode, bsnsYear, reprtCode);
    if (!stmt?.list?.length) return;

    const rows = stmt.list.map((item) => ({
      fs_div: item.fs_div,
      sj_div: item.sj_div,
      account_id: item.account_id,
      account_nm: item.account_nm,
      curr_amount: parseAmount(item.thstrm_amount),
      prev_amount: parseAmount(item.frmtrm_amount),
      prev2_amount: parseAmount(item.bfefrmtrm_amount),
    }));

    await upsertFinancials(reportId, rows);
  } catch {
    // 재무제표 저장 실패는 전체 흐름을 막지 않음
  }
}

/**
 * 사업보고서 HTML 섹션 텍스트를 다운로드·파싱하여 report_sections에 저장
 */
async function _saveSections(reportId, rcpNo) {
  try {
    const res = await fetch(`${BASE_URL}/api/dart-doc?rcpNo=${rcpNo}`);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.warn(`[Sections] dart-doc HTTP ${res.status} rcpNo=${rcpNo}`, errBody);
      return;
    }

    const body = await res.json();
    const { sections } = body;
    if (!sections?.length) return;

    let saved = 0;
    for (const section of sections) {
      const key = guessSectionKey(section.title);
      if (!key || !section.text?.trim()) continue;
      if (section.text.length < 50) continue;
      const content = section.text.slice(0, 10000);
      await upsertReportSection(reportId, key, content);
      saved++;
    }
  } catch (err) {
    console.error(`[Sections] 저장 실패 rcpNo=${rcpNo}:`, err.message);
  }
}

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────

/** DART 금액 문자열 → 정수 (원 단위) */
function parseAmount(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}
