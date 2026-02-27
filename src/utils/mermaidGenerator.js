/**
 * 테마 데이터를 Mermaid graph LR 다이어그램 문법으로 변환
 */
export function generateMermaidChart(theme) {
  if (!theme?.value_chain_stages?.length) return '';

  const lines = ['graph LR'];

  theme.value_chain_stages.forEach((stage, i) => {
    const stageId = `S${i}`;
    // 스테이지 노드 (라벨 + 부가설명)
    lines.push(`  ${stageId}["<b>${stage.label}</b><br/><small>${stage.sub}</small>"]`);

    // 스테이지 간 화살표 연결
    if (i < theme.value_chain_stages.length - 1) {
      lines.push(`  ${stageId} --> S${i + 1}`);
    }

    // 해당 스테이지에 속한 종목 노드 (점선 연결)
    const stageStocks = (theme.stocks || []).filter((s) => s.stage_id === stage.id);
    stageStocks.forEach((stock) => {
      // 노드 ID에 stock_ 접두어 — 클릭 이벤트에서 종목코드 추출용
      lines.push(`  stock_${stock.code}("${stock.name}")`);
      lines.push(`  ${stageId} -.- stock_${stock.code}`);
    });
  });

  // 스타일: 스테이지 노드 — 진한 배경
  theme.value_chain_stages.forEach((_, i) => {
    lines.push(`  style S${i} fill:#0ea5e9,stroke:#0284c7,color:#fff,rx:8`);
  });

  // 스타일: 종목 노드 — 밝은 배경
  (theme.stocks || []).forEach((stock) => {
    lines.push(
      `  style stock_${stock.code} fill:#f0f9ff,stroke:#7dd3fc,color:#0c4a6e,rx:16`,
    );
  });

  return lines.join('\n');
}

/**
 * 선택된 종목을 하이라이트하는 스타일 오버라이드 문자열 생성
 */
export function getSelectedStockStyle(stockCode) {
  return `stock_${stockCode}`;
}
