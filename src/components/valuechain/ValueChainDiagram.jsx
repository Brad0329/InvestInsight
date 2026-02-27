import { useEffect, useRef, useCallback, useState } from 'react';
import mermaid from 'mermaid';
import { generateMermaidChart } from '../../utils/mermaidGenerator';
import { useAppState } from '../../context/AppContext';

let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      fontSize: '14px',
      fontFamily: 'Pretendard, system-ui, sans-serif',
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 16,
      nodeSpacing: 40,
      rankSpacing: 60,
    },
    securityLevel: 'loose', // 클릭 이벤트 허용
  });
  mermaidInitialized = true;
}

export default function ValueChainDiagram({ theme }) {
  const containerRef = useRef(null);
  const { selectStock, selectedStockCode } = useAppState();
  const [renderKey, setRenderKey] = useState(0);

  // 종목 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (e) => {
      const node = e.target.closest('[id*="stock_"]');
      if (!node) return;

      // 노드 ID에서 종목코드 추출: flowchart-stock_452280-XX 또는 stock_452280
      const match = node.id.match(/stock_(\d+)/);
      if (!match) return;

      const stockCode = match[1];
      const stock = theme.stocks.find((s) => s.code === stockCode);
      if (stock) {
        selectStock(stock.code, stock.corp_code);
      }
    },
    [theme, selectStock],
  );

  // 다이어그램 렌더링
  useEffect(() => {
    if (!theme || !containerRef.current) return;

    initMermaid();
    const diagramDef = generateMermaidChart(theme);
    if (!diagramDef) return;

    const id = `mermaid-${Date.now()}`;

    mermaid
      .render(id, diagramDef)
      .then(({ svg }) => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = svg;

        // 선택된 종목 노드 하이라이트
        if (selectedStockCode) {
          const nodes = containerRef.current.querySelectorAll(
            `[id*="stock_${selectedStockCode}"]`,
          );
          nodes.forEach((n) => {
            const rect = n.querySelector('rect, .basic');
            if (rect) {
              rect.style.fill = '#dbeafe';
              rect.style.stroke = '#2563eb';
              rect.style.strokeWidth = '2px';
            }
          });
        }

        // 종목 노드에 커서 포인터 추가
        const stockNodes = containerRef.current.querySelectorAll('[id*="stock_"]');
        stockNodes.forEach((n) => {
          n.style.cursor = 'pointer';
        });
      })
      .catch((err) => {
        console.error('Mermaid render error:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<p class="text-red-400 text-sm">다이어그램 렌더링 실패</p>';
        }
      });
  }, [theme, selectedStockCode, renderKey]);

  // 클릭 이벤트 위임
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('click', handleNodeClick);
    return () => el.removeEventListener('click', handleNodeClick);
  }, [handleNodeClick]);

  // 컨테이너 리사이즈 시 재렌더링
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      setRenderKey((k) => k + 1);
    });

    // 부모 요소 관찰 — 패널 크기 변경 감지
    const parent = containerRef.current.parentElement;
    if (parent) observer.observe(parent);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl border border-slate-200 p-6 overflow-x-auto min-h-[200px] flex items-center justify-center"
    />
  );
}
