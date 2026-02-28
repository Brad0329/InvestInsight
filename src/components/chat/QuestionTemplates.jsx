import { useState } from 'react';

const TEMPLATES = [
  {
    category: '재무 분석',
    icon: '📊',
    questions: [
      '최근 3년 매출과 영업이익 추이를 분석해주세요',
      '부채비율 변화와 재무 건전성을 평가해주세요',
      '영업이익률이 개선/악화된 원인을 추정해주세요',
    ],
  },
  {
    category: '밸류체인',
    icon: '🔗',
    questions: [
      '밸류체인 내 이 회사의 경쟁력과 대체 리스크는?',
      '테마 성장 시 가장 큰 수혜를 받는 구간인가요?',
      '핵심 고객사 의존도와 매출 집중 리스크를 분석해주세요',
    ],
  },
  {
    category: '투자 판단',
    icon: '💡',
    questions: [
      '이 종목의 주요 투자 리스크 3가지를 정리해주세요',
      '현재 재무 데이터 기준 투자 매력도를 평가해주세요',
      '6개월~1년 내 주목할 체크포인트는 무엇인가요?',
    ],
  },
];

export default function QuestionTemplates({ onSelect }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">
        아래 질문을 선택하거나 직접 입력하세요
      </p>
      {TEMPLATES.map((cat) => (
        <div key={cat.category}>
          <button
            className="w-full text-left text-xs font-medium text-slate-700 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            onClick={() =>
              setExpanded(expanded === cat.category ? null : cat.category)
            }
          >
            <span>{cat.icon}</span>
            <span>{cat.category}</span>
            <span className="ml-auto text-slate-400">
              {expanded === cat.category ? '▾' : '▸'}
            </span>
          </button>
          {expanded === cat.category && (
            <div className="ml-2 mt-1 space-y-1">
              {cat.questions.map((q) => (
                <button
                  key={q}
                  className="w-full text-left text-xs text-slate-600 px-2 py-1.5 rounded border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition-colors"
                  onClick={() => onSelect(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
