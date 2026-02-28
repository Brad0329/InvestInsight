import { formatBillion } from '../services/dartApi';

const REPORT_NAMES = {
  '11013': '1분기보고서',
  '11012': '반기보고서',
  '11014': '3분기보고서',
  '11011': '사업보고서',
};

/**
 * AI 채팅용 시스템 프롬프트 생성
 */
export function buildSystemPrompt({
  stock,
  companyInfo,
  keyMetrics,
  theme,
  bsnsYear,
  reprtCode,
}) {
  const parts = [];

  parts.push(
    '당신은 투자 분석 전문가입니다. 현재 사용자가 분석 중인 종목 정보와 재무 데이터를 바탕으로 전문적이고 구체적인 투자 분석을 제공하세요.',
  );
  parts.push('답변은 한국어로 작성하되, 재무 용어는 정확하게 사용하세요.');

  if (stock) {
    parts.push('\n## 분석 대상 종목');
    parts.push(`- 종목명: ${stock.name}`);
    parts.push(`- 종목코드: ${stock.code}`);
    if (stock.value_chain)
      parts.push(`- 밸류체인 포지션: ${stock.value_chain}`);
    if (stock.memo) parts.push(`- 참고: ${stock.memo}`);
  }

  if (theme) {
    parts.push(`\n## 소속 테마: ${theme.name}`);
    if (theme.description) parts.push(`- ${theme.description}`);
    const stages = theme.value_chain_stages?.map((s) => s.label).join(' → ');
    if (stages) parts.push(`- 밸류체인: ${stages}`);
  }

  if (companyInfo) {
    parts.push('\n## 기업 개황');
    if (companyInfo.ceo_nm) parts.push(`- 대표이사: ${companyInfo.ceo_nm}`);
    if (companyInfo.corp_cls) {
      const market =
        companyInfo.corp_cls === 'Y'
          ? '코스피'
          : companyInfo.corp_cls === 'K'
            ? '코스닥'
            : companyInfo.corp_cls;
      parts.push(`- 시장: ${market}`);
    }
    if (companyInfo.est_dt) parts.push(`- 설립일: ${companyInfo.est_dt}`);
    if (companyInfo.hm_url) parts.push(`- 홈페이지: ${companyInfo.hm_url}`);
  }

  const reportName = REPORT_NAMES[reprtCode] || reprtCode;

  if (keyMetrics && Object.keys(keyMetrics).length > 0) {
    parts.push(`\n## 주요 재무 지표 (${bsnsYear}년 ${reportName})`);
    for (const [, metric] of Object.entries(keyMetrics)) {
      const cur = formatBillion(metric.thstrmAmount);
      const prev = formatBillion(metric.frmtrmAmount);
      const prevPrev = formatBillion(metric.bfefrmtrmAmount);
      parts.push(
        `- ${metric.label}: 당기 ${cur} / 전기 ${prev} / 전전기 ${prevPrev}`,
      );
    }
  }

  parts.push('\n## 응답 지침');
  parts.push(
    '- 위 재무 데이터를 참고하되, 데이터에 없는 사항은 추측이라고 명시하세요.',
  );
  parts.push('- 투자 권유가 아닌 분석 관점에서 답변하세요.');
  parts.push('- 구체적인 수치를 인용하며 답변하세요.');
  parts.push('- 전문 용어에는 괄호 안에 쉬운 설명을 추가하세요.');

  return parts.join('\n');
}
