/**
 * 뉴스 카드 컴포넌트
 * Naver 뉴스 API 또는 DB news_items 데이터 표시
 */
export default function NewsCard({ item }) {
  const title = stripHtml(item.title || '');
  const summary = stripHtml(item.summary || item.description || '');
  const date = formatDate(item.published_at || item.pubDate);
  const url = item.url || item.link;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg border border-slate-700 hover:border-sky-500 hover:bg-slate-700/50 transition-colors"
    >
      <p className="text-sm font-medium text-slate-100 line-clamp-2 leading-snug">{title}</p>
      {summary && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-snug">{summary}</p>
      )}
      <p className="text-xs text-slate-500 mt-1.5">{date}</p>
    </a>
  );
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

function formatDate(val) {
  if (!val) return '';
  try {
    return new Date(val).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return String(val).slice(0, 10);
  }
}
