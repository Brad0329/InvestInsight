import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ──────────────────────────────────────────
// companies
// ──────────────────────────────────────────

/** 기업 마스터 upsert */
export async function upsertCompany(companyInfo, stockCode) {
  const row = {
    corp_code: companyInfo.corp_code,
    corp_name: companyInfo.corp_name,
    stock_code: stockCode || companyInfo.stock_code || null,
    market: companyInfo.stock_type || null,
    ceo_nm: companyInfo.ceo_nm || null,
    est_dt: companyInfo.est_dt || null,
    hm_url: companyInfo.hm_url || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('companies').upsert(row, { onConflict: 'corp_code' });
  if (error) throw error;
}

/** 기업 마스터 단건 조회 */
export async function getCompany(corpCode) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('corp_code', corpCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────
// reports
// ──────────────────────────────────────────

/** 보고서 메타 upsert → report id 반환 */
export async function upsertReport({ corpCode, rcpno, reportType, bsnsYear, reprtCode, filedAt }) {
  const row = {
    corp_code: corpCode,
    rcpno,
    report_type: reportType,
    bsns_year: bsnsYear,
    reprt_code: reprtCode,
    filed_at: filedAt || null,
  };
  const { data, error } = await supabase
    .from('reports')
    .upsert(row, { onConflict: 'rcpno' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** 보고서 메타 조회 (법인코드 + 연도 + 보고서 구분) */
export async function getReport(corpCode, bsnsYear, reprtCode) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('corp_code', corpCode)
    .eq('bsns_year', bsnsYear)
    .eq('reprt_code', reprtCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────
// financials
// ──────────────────────────────────────────

/** 재무제표 수치 일괄 upsert */
export async function upsertFinancials(reportId, rows) {
  if (!rows.length) return;
  const data = rows.map((r) => ({ ...r, report_id: reportId }));
  const { error } = await supabase
    .from('financials')
    .upsert(data, { onConflict: 'report_id,fs_div,sj_div,account_id' });
  if (error) throw error;
}

/** 재무제표 조회 */
export async function getFinancials(reportId, sjDiv = null) {
  let query = supabase.from('financials').select('*').eq('report_id', reportId);
  if (sjDiv) query = query.eq('sj_div', sjDiv);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────
// report_sections (비정형 텍스트)
// ──────────────────────────────────────────

/** 섹션 텍스트 upsert */
export async function upsertReportSection(reportId, sectionKey, content) {
  const { error } = await supabase.from('report_sections').upsert(
    { report_id: reportId, section_key: sectionKey, content },
    { onConflict: 'report_id,section_key' }
  );
  if (error) throw error;
}

/** 섹션 텍스트 단건 조회 */
export async function getReportSection(reportId, sectionKey) {
  const { data, error } = await supabase
    .from('report_sections')
    .select('content')
    .eq('report_id', reportId)
    .eq('section_key', sectionKey)
    .maybeSingle();
  if (error) throw error;
  return data?.content ?? null;
}

/** 보고서의 모든 섹션 조회 */
export async function getAllReportSections(reportId) {
  const { data, error } = await supabase
    .from('report_sections')
    .select('section_key, content')
    .eq('report_id', reportId);
  if (error) throw error;
  return data; // [{ section_key, content }]
}

// ──────────────────────────────────────────
// news_items
// ──────────────────────────────────────────

/** 뉴스 일괄 upsert (중복 URL 무시) */
export async function upsertNews(corpCode, newsItems) {
  if (!newsItems.length) return;
  const rows = newsItems.map((item) => ({
    corp_code: corpCode,
    title: item.title,
    summary: item.description,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    url: item.link,
    source: 'naver',
  }));
  const { error } = await supabase.from('news_items').upsert(rows, { onConflict: 'url', ignoreDuplicates: true });
  if (error) throw error;
}

/** 종목 뉴스 목록 조회 (최신순) */
export async function getNews(corpCode, limit = 20) {
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .eq('corp_code', corpCode)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
