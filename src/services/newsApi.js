const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * 네이버 뉴스 검색 API 래퍼
 * 로컬 개발: Vite proxy → /api/news
 * 프로덕션: Vercel Edge Function → /api/news
 */
export async function searchNews(query, display = 10, sort = 'date') {
  const params = new URLSearchParams({ query, display, sort });
  const url = `${BASE_URL}/api/news?${params}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`News API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
