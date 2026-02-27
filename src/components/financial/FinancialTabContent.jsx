import { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppContext';
import { useDartData } from '../../hooks/useDartData';
import { filterByStatementType, formatBillion, REPORT_CODE_NAMES } from '../../services/dartApi';
import FinancialTable from './FinancialTable';

const SUB_TABS = [
  { id: 'BS', label: '재무상태표' },
  { id: 'IS', label: '손익계산서' },
];

export default function FinancialTabContent() {
  const { selectedCorpCode, selectedStock, bsnsYear, reprtCode } = useAppState();
  const { companyInfo, financials, keyMetrics, loading, error, fetchCompanyInfo, fetchFinancials } =
    useDartData(selectedCorpCode);
  const [subTab, setSubTab] = useState('BS');

  // 종목 변경 시 기업 개황 + 재무제표 자동 조회
  useEffect(() => {
    if (!selectedCorpCode) return;
    fetchCompanyInfo();
    fetchFinancials(bsnsYear, reprtCode);
  }, [selectedCorpCode, bsnsYear, reprtCode, fetchCompanyInfo, fetchFinancials]);

  if (!selectedCorpCode) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        <div className="text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-lg font-medium">종목을 선택하세요</p>
          <p className="text-sm mt-1">좌측 패널에서 종목을 클릭하면 재무 데이터를 조회합니다</p>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-3 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-3" />
          <p className="text-sm">재무 데이터를 조회하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 p-8">
        <div className="text-center">
          <p className="text-sm font-medium">오류 발생</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // 재무제표 항목 필터링
  const list = financials?.list || [];
  let filteredItems;
  if (subTab === 'IS') {
    // IS(손익계산서) 또는 CIS(포괄손익계산서) - 회사마다 다름
    filteredItems = filterByStatementType(list, 'IS');
    if (filteredItems.length === 0) {
      filteredItems = filterByStatementType(list, 'CIS');
    }
  } else {
    filteredItems = filterByStatementType(list, subTab);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* 기업 요약 헤더 */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="text-xl font-bold text-slate-900">
            {selectedStock?.name || companyInfo?.corp_name || ''}
          </h2>
          <span className="text-sm text-slate-400">{selectedStock?.code}</span>
        </div>
        <p className="text-sm text-slate-500">
          {bsnsYear}년 {REPORT_CODE_NAMES[reprtCode] || ''}
          {selectedStock?.value_chain && ` · ${selectedStock.value_chain}`}
        </p>
      </div>

      {/* 주요 지표 카드 */}
      {keyMetrics && Object.keys(keyMetrics).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Object.entries(keyMetrics).map(([key, metric]) => (
            <div key={key} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">{metric.label}</p>
              <p className="text-lg font-semibold text-slate-800 tabular-nums">
                {formatBillion(metric.thstrmAmount)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 서브 탭 */}
      <div className="flex gap-1 mb-4">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              subTab === tab.id
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 재무제표 테이블 */}
      <FinancialTable
        items={filteredItems}
        title={SUB_TABS.find((t) => t.id === subTab)?.label || ''}
      />
    </div>
  );
}
