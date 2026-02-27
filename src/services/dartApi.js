import { getCached, setCache } from '../utils/cache.js';
import { DartApiError, DART_STATUS, validateDartResponse } from './dartErrors.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// === Cache TTL ===
const CACHE_TTL = {
  CORP_CODES: 7 * 24 * 60 * 60 * 1000, // 7일 (기업코드 목록, 변경 드묾)
  COMPANY_INFO: 30 * 24 * 60 * 60 * 1000, // 30일 (기본정보는 거의 안 변함)
  DISCLOSURE_LIST: 1 * 60 * 60 * 1000, // 1시간 (공시 목록은 자주 업데이트)
  FINANCIAL: 7 * 24 * 60 * 60 * 1000, // 7일 (분기 재무제표는 확정 후 불변)
};

// =========================================================
// 내부 유틸
// =========================================================

/**
 * DART API 공통 호출 함수
 * - 로컬: Vite proxy가 crtfc_key 주입
 * - 프로덕션: Vercel Edge Function이 crtfc_key 주입
 */
async function dartFetch(endpoint, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}/api/dart/${endpoint}${query ? '?' + query : ''}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`네트워크 오류: DART API에 연결할 수 없습니다. (${err.message})`);
  }

  if (!res.ok) {
    throw new Error(`DART API HTTP 오류: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return validateDartResponse(data, endpoint);
}

/**
 * 캐시 우선 DART API 호출
 */
async function cachedFetch(cacheKey, ttl, fetchFn) {
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  setCache(cacheKey, data, ttl);
  return data;
}

// =========================================================
// 상수
// =========================================================

/** 보고서 코드 */
export const REPORT_CODES = {
  Q1: '11013', // 1분기보고서
  HALF: '11012', // 반기보고서
  Q3: '11014', // 3분기보고서
  ANNUAL: '11011', // 사업보고서
};

/** 보고서 코드 → 한글 명칭 */
export const REPORT_CODE_NAMES = {
  '11013': '1분기보고서',
  '11012': '반기보고서',
  '11014': '3분기보고서',
  '11011': '사업보고서',
};

/** 재무제표 구분 코드 */
export const STATEMENT_TYPES = {
  BS: 'BS', // 재무상태표
  IS: 'IS', // 손익계산서
  CIS: 'CIS', // 포괄손익계산서
  CF: 'CF', // 현금흐름표
  SCE: 'SCE', // 자본변동표
};

// =========================================================
// 기업코드 목록 (corpCode.xml)
// =========================================================

/**
 * 전체 상장사 기업코드 목록 다운로드
 * 서버(프록시)에서 DART corpCode.xml을 다운받아 파싱한 결과를 반환
 * @returns {Promise<Array<{corp_code, corp_name, stock_code, modify_date}>>}
 */
export async function getCorpCodeList() {
  return cachedFetch('dart_corp_codes', CACHE_TTL.CORP_CODES, async () => {
    const url = `${BASE_URL}/api/dart-corps`;
    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new Error(`기업코드 목록 다운로드 실패: ${err.message}`);
    }
    if (!res.ok) {
      throw new Error(`기업코드 목록 HTTP 오류: ${res.status}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data.list;
  });
}

/**
 * 기업명으로 기업코드 검색
 * @param {string} keyword - 검색 키워드 (회사명 또는 종목코드)
 * @param {number} [limit=20] - 최대 결과 수
 * @returns {Promise<Array<{corp_code, corp_name, stock_code}>>}
 */
export async function searchCorpByName(keyword, limit = 20) {
  const list = await getCorpCodeList();
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];

  return list
    .filter(
      (c) =>
        c.corp_name.toLowerCase().includes(kw) ||
        c.stock_code === kw,
    )
    .slice(0, limit);
}

// =========================================================
// Public API Functions
// =========================================================

/**
 * 기업 개황 조회
 * @param {string} corpCode - 기업 고유번호 (8자리, 예: '00958451')
 * @returns {Promise<Object>} - { corp_code, corp_name, stock_code, ceo_nm, corp_cls, ... }
 */
export async function getCompanyInfo(corpCode) {
  return cachedFetch(`dart_company_${corpCode}`, CACHE_TTL.COMPANY_INFO, () =>
    dartFetch('company.json', { corp_code: corpCode }),
  );
}

/**
 * 공시 목록 조회
 * @param {string} corpCode - 기업 고유번호
 * @param {Object} [options]
 * @param {string} [options.pblntfTy='A'] - 공시유형 (A:정기, B:주요사항, F:기타 등)
 * @param {string} [options.bgnDe] - 검색 시작일 (YYYYMMDD)
 * @param {string} [options.endDe] - 검색 종료일 (YYYYMMDD)
 * @param {number} [options.pageCount=100] - 페이지당 건수 (최대 100)
 * @returns {Promise<Object>} - { status, message, total_count, list: [...] }
 */
export async function getDisclosureList(corpCode, options = {}) {
  const { pblntfTy = 'A', bgnDe, endDe, pageCount = 100 } = options;

  const params = {
    corp_code: corpCode,
    pblntf_ty: pblntfTy,
    page_count: String(pageCount),
  };
  if (bgnDe) params.bgn_de = bgnDe;
  if (endDe) params.end_de = endDe;

  const cacheKey = `dart_discl_${corpCode}_${pblntfTy}_${bgnDe || ''}_${endDe || ''}`;

  return cachedFetch(cacheKey, CACHE_TTL.DISCLOSURE_LIST, () =>
    dartFetch('list.json', params),
  );
}

/**
 * 단일회사 전체 재무제표 조회
 * @param {string} corpCode - 기업 고유번호
 * @param {string} bsnsYear - 사업연도 (예: '2024')
 * @param {string} reprtCode - 보고서 코드 (REPORT_CODES 참조)
 * @param {string} [fsDiv='OFS'] - 'OFS':개별재무제표, 'CFS':연결재무제표
 * @returns {Promise<Object>} - { status, message, list: [...] }
 */
export async function getFinancialStatement(corpCode, bsnsYear, reprtCode, fsDiv = 'OFS') {
  const cacheKey = `dart_fin_${corpCode}_${bsnsYear}_${reprtCode}_${fsDiv}`;

  return cachedFetch(cacheKey, CACHE_TTL.FINANCIAL, () =>
    dartFetch('fnlttSinglAcntAll.json', {
      corp_code: corpCode,
      bsns_year: bsnsYear,
      reprt_code: reprtCode,
      fs_div: fsDiv,
    }),
  );
}

// =========================================================
// 데이터 파싱 헬퍼
// =========================================================

/**
 * 재무제표 응답에서 특정 구분의 계정 항목들을 추출
 * @param {Array} list - fnlttSinglAcntAll 응답의 list 배열
 * @param {string} sjDiv - 재무제표 구분 ('BS', 'IS', 'CF' 등)
 */
export function filterByStatementType(list, sjDiv) {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item.sj_div === sjDiv);
}

/**
 * 금액 문자열을 숫자로 변환
 * DART는 금액을 문자열로 반환 (예: "50000000000", "-1234567", "")
 */
export function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '' || amountStr.trim() === '-') {
    return null;
  }
  const num = Number(amountStr.replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * 금액을 억원 단위 문자열로 포맷
 * @param {number|null} amount - 원 단위 금액
 * @returns {string} - "123억" 또는 "-45억" 또는 "-"
 */
export function formatBillion(amount) {
  if (amount === null || amount === undefined) return '-';
  const billion = amount / 1e8;
  if (Math.abs(billion) >= 1) {
    return `${billion >= 0 ? '' : '-'}${Math.abs(Math.round(billion)).toLocaleString()}억`;
  }
  // 1억 미만은 백만원 단위
  const million = amount / 1e6;
  return `${Math.round(million).toLocaleString()}백만`;
}

// 주요 재무지표 매핑 (account_id → 키)
const KEY_ACCOUNTS = {
  // 재무상태표 (BS)
  assets: {
    sj_divs: ['BS'],
    ids: ['ifrs-full_Assets'],
    label: '자산총계',
  },
  currentAssets: {
    sj_divs: ['BS'],
    ids: ['ifrs-full_CurrentAssets'],
    label: '유동자산',
  },
  liabilities: {
    sj_divs: ['BS'],
    ids: ['ifrs-full_Liabilities'],
    label: '부채총계',
  },
  equity: {
    sj_divs: ['BS'],
    ids: ['ifrs-full_Equity'],
    label: '자본총계',
  },
  // 손익계산서 (IS 또는 CIS — 회사마다 다름)
  revenue: {
    sj_divs: ['IS', 'CIS'],
    ids: ['ifrs-full_Revenue'],
    label: '매출액',
  },
  operatingIncome: {
    sj_divs: ['IS', 'CIS'],
    ids: ['ifrs-full_ProfitLossFromOperatingActivities', 'dart_OperatingIncomeLoss'],
    label: '영업이익',
  },
  netIncome: {
    sj_divs: ['IS', 'CIS'],
    ids: ['ifrs-full_ProfitLoss', 'ifrs-full_ProfitLossAttributableToOwnersOfParent'],
    label: '당기순이익',
  },
};

/**
 * 주요 재무 지표 추출
 * @param {Array} list - fnlttSinglAcntAll 응답의 list 배열
 * @returns {Object} - { assets: { label, thstrmAmount, frmtrmAmount, ... }, ... }
 */
export function extractKeyMetrics(list) {
  if (!Array.isArray(list)) return {};

  const metrics = {};

  for (const [key, config] of Object.entries(KEY_ACCOUNTS)) {
    // 여러 가능한 sj_div × account_id 조합 중 첫 번째 매치를 사용
    let item = null;
    for (const id of config.ids) {
      item = list.find(
        (row) => config.sj_divs.includes(row.sj_div) && row.account_id === id,
      );
      if (item) break;
    }

    if (item) {
      metrics[key] = {
        label: config.label,
        accountNm: item.account_nm,
        thstrmAmount: parseAmount(item.thstrm_amount),
        frmtrmAmount: parseAmount(item.frmtrm_amount),
        bfefrmtrmAmount: parseAmount(item.bfefrmtrm_amount),
        thstrmNm: item.thstrm_nm || '',
        frmtrmNm: item.frmtrm_nm || '',
        bfefrmtrmNm: item.bfefrmtrm_nm || '',
      };
    }
  }

  return metrics;
}

/**
 * 수소 테마 4종목 재무 데이터 일괄 조회
 * @param {Array} stocks - themes.json의 stocks 배열
 * @param {string} bsnsYear - 사업연도
 * @param {string} reprtCode - 보고서 코드
 * @returns {Promise<Array<{stock, companyInfo, financials, keyMetrics, error?}>>}
 */
export async function fetchAllStocksFinancials(stocks, bsnsYear, reprtCode) {
  const results = await Promise.allSettled(
    stocks.map(async (stock) => {
      const companyInfo = await getCompanyInfo(stock.corp_code);

      let financials = null;
      try {
        financials = await getFinancialStatement(stock.corp_code, bsnsYear, reprtCode);
      } catch (err) {
        if (err instanceof DartApiError && err.isNoData) {
          financials = { status: DART_STATUS.NO_DATA, list: [] };
        } else {
          throw err;
        }
      }

      return {
        stock,
        companyInfo,
        financials,
        keyMetrics: financials?.list ? extractKeyMetrics(financials.list) : {},
      };
    }),
  );

  return results.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      stock: stocks[idx],
      companyInfo: null,
      financials: null,
      keyMetrics: {},
      error: result.reason?.message || '알 수 없는 오류',
    };
  });
}

// 에러 타입 re-export
export { DartApiError, DART_STATUS };
