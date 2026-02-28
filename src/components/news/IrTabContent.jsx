import { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../context/AppContext';
import { getDisclosureList } from '../../services/dartApi';
import { DartApiError } from '../../services/dartErrors';

/**
 * IR 탭 — 기업설명회 공시 + IR 홈페이지 링크
 * DART pblntf_ty=F (기타) 중 '기업설명회' 관련 공시 표시
 */
export default function IrTabContent() {
  const { selectedStock, selectedCorpCode } = useAppState();
  const [irDisclosures, setIrDisclosures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchIr = useCallback(async () => {
    if (!selectedCorpCode) return;
    setLoading(true);
    setError(null);
    try {
      // 기업설명회 자료 공시 조회 (F=기타공시)
      const bgnDe = `${new Date().getFullYear() - 3}0101`;
      const result = await getDisclosureList(selectedCorpCode, { pblntfTy: 'F', bgnDe });
      // '기업설명회' 포함 공시만 필터
      const irItems = (result?.list || []).filter(
        (d) => d.report_nm?.includes('기업설명회') || d.report_nm?.includes('IR')
      );
      setIrDisclosures(irItems.slice(0, 20));
    } catch (e) {
      if (e instanceof DartApiError && e.isNoData) {
        setIrDisclosures([]);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCorpCode]);

  useEffect(() => {
    fetchIr();
  }, [fetchIr]);

  if (!selectedStock) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        <p className="text-sm">좌측에서 종목을 선택하세요.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">IR 자료</h3>
        <button
          onClick={fetchIr}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40"
        >
          새로고침
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* IR 홈페이지 링크 */}
        {selectedStock.ir_url && (
          <a
            href={selectedStock.ir_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-sky-900/30 border border-sky-700/50 hover:bg-sky-900/50 transition-colors"
          >
            <svg className="w-4 h-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="text-sm text-sky-300">{selectedStock.name} IR 홈페이지</span>
          </a>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            불러오는 중...
          </div>
        )}

        {/* 에러 */}
        {!loading && error && (
          <div className="text-sm text-red-400 bg-red-900/20 rounded-lg p-3">{error}</div>
        )}

        {/* 기업설명회 공시 목록 */}
        {!loading && !error && (
          <>
            <div>
              <p className="text-xs text-slate-400 mb-2">기업설명회 공시</p>
              {irDisclosures.length === 0 ? (
                <p className="text-sm text-slate-500">기업설명회 공시가 없습니다.</p>
              ) : (
                <div className="divide-y divide-slate-700 border border-slate-700 rounded-lg overflow-hidden">
                  {irDisclosures.map((d) => (
                    <IrRow key={d.rcept_no} item={d} />
                  ))}
                </div>
              )}
            </div>

            {/* DART 공시 바로가기 */}
            <a
              href={`https://dart.fss.or.kr/corp/searchBasicInfoR.do?corp_code=${selectedCorpCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-300 text-center"
            >
              DART에서 전체 공시 보기 →
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function IrRow({ item }) {
  const dartUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`;
  const date = item.rcept_dt
    ? `${item.rcept_dt.slice(0, 4)}.${item.rcept_dt.slice(4, 6)}.${item.rcept_dt.slice(6, 8)}`
    : '';

  return (
    <a
      href={dartUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-700/50 transition-colors"
    >
      <span className="shrink-0 text-xs text-slate-500 w-20 pt-0.5">{date}</span>
      <p className="text-sm text-slate-200 line-clamp-2">{item.report_nm}</p>
    </a>
  );
}
