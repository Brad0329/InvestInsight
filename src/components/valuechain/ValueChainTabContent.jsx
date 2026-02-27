import { useAppState } from '../../context/AppContext';
import ValueChainDiagram from './ValueChainDiagram';

export default function ValueChainTabContent() {
  const { selectedTheme } = useAppState();

  if (!selectedTheme) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        <div className="text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-lg font-medium">테마를 선택하세요</p>
          <p className="text-sm mt-1">좌측 패널에서 테마를 선택하면 밸류체인을 시각화합니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* 테마 헤더 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {selectedTheme.name} 밸류체인
        </h2>
        <p className="text-sm text-slate-500">
          {selectedTheme.description}
          <span className="ml-2 text-slate-400">
            · {selectedTheme.stocks?.length || 0}개 종목
          </span>
        </p>
      </div>

      {/* 밸류체인 다이어그램 */}
      <ValueChainDiagram theme={selectedTheme} />

      {/* 종목 클릭 안내 */}
      <p className="text-xs text-slate-400 mt-4 text-center">
        종목 노드를 클릭하면 재무 탭으로 이동합니다
      </p>
    </div>
  );
}
