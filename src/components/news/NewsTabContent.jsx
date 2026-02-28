import { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppContext';
import { useNewsData } from '../../hooks/useNewsData';
import NewsCard from './NewsCard';
import DisclosureList from './DisclosureList';

const SUB_TABS = [
  { id: 'news', label: '뉴스' },
  { id: 'disclosure', label: '공시' },
];

export default function NewsTabContent() {
  const { selectedStock, selectedCorpCode } = useAppState();
  const [subTab, setSubTab] = useState('news');
  const { news, disclosures, loading, error, fetchNews, fetchDisclosures } = useNewsData();

  // 공시 조회 시작일: 3년 전 1월 1일
  const disclosureBgnDe = `${new Date().getFullYear() - 3}0101`;

  // 종목 변경 시 데이터 로드
  useEffect(() => {
    if (!selectedCorpCode || !selectedStock) return;
    if (subTab === 'news') {
      fetchNews(selectedCorpCode, selectedStock.name);
    } else {
      fetchDisclosures(selectedCorpCode, { bgnDe: disclosureBgnDe });
    }
  }, [selectedCorpCode, selectedStock, subTab, fetchNews, fetchDisclosures, disclosureBgnDe]);

  // 종목 미선택
  if (!selectedStock) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        <p className="text-sm">좌측에서 종목을 선택하세요.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 서브탭 */}
      <div className="flex border-b border-slate-700 px-3 pt-2 gap-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
              subTab === t.id
                ? 'text-sky-400 border-b-2 border-sky-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto pb-1.5 flex items-end">
          <RefreshButton
            onClick={() => {
              if (subTab === 'news') fetchNews(selectedCorpCode, selectedStock.name);
              else fetchDisclosures(selectedCorpCode, { bgnDe: disclosureBgnDe });
            }}
            loading={loading}
          />
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            불러오는 중...
          </div>
        )}

        {!loading && error && (
          <div className="p-4 text-sm text-red-400 bg-red-900/20 m-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && subTab === 'news' && (
          <div className="p-3 flex flex-col gap-2">
            {news.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">뉴스가 없습니다.</p>
            ) : (
              news.map((item) => <NewsCard key={item.id || item.url} item={item} />)
            )}
          </div>
        )}

        {!loading && !error && subTab === 'disclosure' && (
          <DisclosureList items={disclosures} />
        )}
      </div>
    </div>
  );
}

function RefreshButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
      title="새로고침"
    >
      <svg
        className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}
