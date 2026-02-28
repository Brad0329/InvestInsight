/**
 * 공시 목록 컴포넌트
 * DART 공시 목록 테이블 표시
 */
export default function DisclosureList({ items }) {
  if (!items.length) {
    return <p className="text-sm text-slate-400 p-4">공시 내역이 없습니다.</p>;
  }

  return (
    <div className="divide-y divide-slate-700">
      {items.map((d) => (
        <DisclosureRow key={d.rcept_no} item={d} />
      ))}
    </div>
  );
}

function DisclosureRow({ item }) {
  const dartUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`;
  const date = formatDate(item.rcept_dt);

  return (
    <a
      href={dartUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-700/50 transition-colors"
    >
      <span className="shrink-0 text-xs text-slate-500 w-20 pt-0.5">{date}</span>
      <div className="min-w-0">
        <p className="text-sm text-slate-200 line-clamp-2 leading-snug">{item.report_nm}</p>
        {item.flr_nm && (
          <p className="text-xs text-slate-500 mt-0.5">{item.flr_nm}</p>
        )}
      </div>
    </a>
  );
}

function formatDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length < 8) return yyyymmdd || '';
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}
