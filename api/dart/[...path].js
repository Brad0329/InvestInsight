export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ status: '010', message: 'DART API 키가 서버에 설정되지 않았습니다' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const url = new URL(req.url);
  const dartPath = url.pathname.replace('/api/dart/', '');
  const params = new URLSearchParams(url.search);
  params.set('crtfc_key', apiKey);

  const dartUrl = `https://opendart.fss.or.kr/api/${dartPath}?${params}`;

  try {
    const res = await fetch(dartUrl);
    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ status: '900', message: `프록시 오류: ${error.message}` }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
