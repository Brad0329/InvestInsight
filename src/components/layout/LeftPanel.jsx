import { Link } from 'react-router-dom';
import { useAppState } from '../../context/AppContext';
import { REPORT_CODES, REPORT_CODE_NAMES } from '../../services/dartApi';

const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 - i));

const reportOptions = Object.entries(REPORT_CODE_NAMES).map(([code, name]) => ({
  code,
  name,
}));

export default function LeftPanel() {
  const {
    themes,
    selectedThemeId,
    selectedTheme,
    selectedStockCode,
    bsnsYear,
    reprtCode,
    selectTheme,
    selectStock,
    setBsnsYear,
    setReprtCode,
  } = useAppState();

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-900">InvestInsight</h1>
        <p className="text-xs text-slate-500 mt-0.5">테마 투자 분석</p>
      </div>

      {/* 테마 목록 */}
      <nav className="p-3 space-y-1 text-sm">
        <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          테마 목록
        </div>
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => selectTheme(theme.id)}
            className={`w-full text-left px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              selectedThemeId === theme.id
                ? 'bg-sky-50 text-sky-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {theme.name}
          </button>
        ))}
      </nav>

      {/* 종목 목록 */}
      {selectedTheme && (
        <div className="px-3 pb-3 space-y-1 text-sm border-t border-slate-100 pt-3">
          <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            종목 ({selectedTheme.stocks.length})
          </div>
          {selectedTheme.stocks.map((stock) => (
            <button
              key={stock.code}
              onClick={() => selectStock(stock.code, stock.corp_code)}
              className={`w-full text-left px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedStockCode === stock.code
                  ? 'bg-sky-50 text-sky-700 font-medium border-l-3 border-sky-500'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div>{stock.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stock.value_chain}</div>
            </button>
          ))}
        </div>
      )}

      {/* 기간 선택 */}
      {selectedStockCode && (
        <div className="px-3 pb-3 space-y-2 text-sm border-t border-slate-100 pt-3">
          <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            조회 기간
          </div>
          <select
            value={bsnsYear}
            onChange={(e) => setBsnsYear(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={reprtCode}
            onChange={(e) => setReprtCode(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {reportOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div className="mt-auto p-3 border-t border-slate-200 text-xs space-y-1">
        <Link
          to="/dev/test"
          className="block px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          API 테스트
        </Link>
        <Link
          to="/admin/themes"
          className="block px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          테마 관리
        </Link>
        <Link
          to="/settings"
          className="block px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          설정
        </Link>
      </div>
    </aside>
  );
}
