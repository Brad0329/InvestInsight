export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const params = new URLSearchParams(url.search);

  const naverUrl = `https://openapi.naver.com/v1/search/news.json?${params}`;

  try {
    const res = await fetch(naverUrl, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      },
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
