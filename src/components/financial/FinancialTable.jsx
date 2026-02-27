import { parseAmount, formatBillion } from '../../services/dartApi';

export default function FinancialTable({ items, title }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-sm">{title} 데이터가 없습니다</p>
      </div>
    );
  }

  // 기간 명칭 추출 (첫 번째 아이템에서)
  const first = items[0];
  const periods = [
    { key: 'thstrm_amount', label: first.thstrm_nm || '당기' },
    { key: 'frmtrm_amount', label: first.frmtrm_nm || '전기' },
    { key: 'bfefrmtrm_amount', label: first.bfefrmtrm_nm || '전전기' },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="text-left py-2 px-3 font-medium">항목</th>
              {periods.map((p) => (
                <th key={p.key} className="text-right py-2 px-3 font-medium whitespace-nowrap">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={`${item.account_id}-${idx}`}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="py-2 px-3 text-slate-700">{item.account_nm}</td>
                {periods.map((p) => (
                  <td key={p.key} className="py-2 px-3 text-right text-slate-600 tabular-nums">
                    {formatBillion(parseAmount(item[p.key]))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
