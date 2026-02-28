import { useEffect, useRef } from 'react';
import { ensureReport } from '../services/dartDocService.js';

const REPRT_CODE_ANNUAL = '11011'; // 사업보고서

/**
 * 종목 선택 시 최신 사업보고서를 백그라운드에서 자동 수집 → DB 저장
 * - UI에 영향 없이 조용히 실행 (에러 무시)
 * - 세션 내 중복 수집 방지 (collectedRef)
 *
 * 향후: 종목 등록(admin) 시점으로 이동 예정
 */
export function useAutoCollect({ corpCode, stockCode, companyInfo }) {
  // 세션 내 이미 수집한 종목 추적 (컴포넌트 리렌더링에도 유지)
  const collectedRef = useRef(new Set());

  useEffect(() => {
    if (!corpCode) return;

    // 직전 사업연도 (3월 이전이면 2년 전, 이후면 1년 전)
    const now = new Date();
    const bsnsYear = String(
      now.getMonth() < 3 ? now.getFullYear() - 2 : now.getFullYear() - 1
    );

    const key = `${corpCode}_${bsnsYear}`;
    if (collectedRef.current.has(key)) return;
    collectedRef.current.add(key);

    // 백그라운드 실행 — await 없이
    ensureReport({
      corpCode,
      stockCode,
      bsnsYear,
      reprtCode: REPRT_CODE_ANNUAL,
      companyInfo: companyInfo || null,
    })
      .then((id) => console.log(`[AutoCollect] 수집 완료 corp=${corpCode} year=${bsnsYear} reportId=${id}`))
      .catch((err) => {
        console.error(`[AutoCollect] 수집 실패 corp=${corpCode} year=${bsnsYear}:`, err.message);
        // 실패 시 다음 선택 때 재시도 가능하도록 키 제거
        collectedRef.current.delete(key);
      });
  }, [corpCode, stockCode, companyInfo]);
}
