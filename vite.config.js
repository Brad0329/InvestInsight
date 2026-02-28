import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { inflateRawSync } from 'node:zlib';

export default defineConfig(({ mode }) => {
  // .env, .env.local 등에서 모든 환경변수 로드 (VITE_ 접두어 없는 것 포함)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),

      // ── DART 기업코드 목록 미들웨어 (dev 전용) ──────────────────
      {
        name: 'dart-corps-middleware',
        configureServer(server) {
          server.middlewares.use('/api/dart-corps', async (req, res) => {
            const dartKey = env.DART_API_KEY;
            if (!dartKey) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'DART_API_KEY not set' }));
            }

            try {
              const dartUrl = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${dartKey}`;
              const response = await fetch(dartUrl);
              const zipBuffer = Buffer.from(await response.arrayBuffer());

              // ZIP 해제 (단일 파일)
              const signature = zipBuffer.readUInt32LE(0);
              if (signature !== 0x04034b50) throw new Error('Invalid ZIP');
              const flags = zipBuffer.readUInt16LE(6);
              const method = zipBuffer.readUInt16LE(8);
              let compSize = zipBuffer.readUInt32LE(18);
              const fnameLen = zipBuffer.readUInt16LE(26);
              const extraLen = zipBuffer.readUInt16LE(28);
              const dataStart = 30 + fnameLen + extraLen;

              // Data Descriptor 플래그(bit 3) → Central Directory에서 크기 읽기
              if ((flags & 0x08) !== 0 && compSize === 0) {
                let eocd = -1;
                for (let i = zipBuffer.length - 22; i >= 0; i--) {
                  if (zipBuffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
                }
                if (eocd === -1) throw new Error('ZIP EOCD not found');
                const cdOff = zipBuffer.readUInt32LE(eocd + 16);
                compSize = zipBuffer.readUInt32LE(cdOff + 20);
              }

              const compressed = zipBuffer.subarray(dataStart, dataStart + compSize);
              const xml =
                method === 8
                  ? inflateRawSync(compressed).toString('utf-8')
                  : compressed.toString('utf-8');

              // XML → 상장사만 추출
              const corps = [];
              const regex =
                /<list>\s*<corp_code>(\d+)<\/corp_code>\s*<corp_name>([^<]*)<\/corp_name>\s*<corp_eng_name>[^<]*<\/corp_eng_name>\s*<stock_code>([^<]*)<\/stock_code>\s*<modify_date>(\d*)<\/modify_date>\s*<\/list>/g;
              let match;
              while ((match = regex.exec(xml)) !== null) {
                const stockCode = match[3].trim();
                if (stockCode) {
                  corps.push({
                    corp_code: match[1],
                    corp_name: match[2].trim(),
                    stock_code: stockCode,
                    modify_date: match[4],
                  });
                }
              }

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=86400',
              });
              res.end(JSON.stringify({ count: corps.length, list: corps }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        },
      },

      // ── DART 사업보고서 원문 미들웨어 (dev 전용) ────────────────
      {
        name: 'dart-doc-middleware',
        configureServer(server) {
          server.middlewares.use('/api/dart-doc', async (req, res) => {
            const dartKey = env.DART_API_KEY;
            if (!dartKey) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'DART_API_KEY not set' }));
            }

            const url = new URL(req.url, 'http://localhost');
            const rcpNo = url.searchParams.get('rcpNo');
            if (!rcpNo) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'rcpNo 파라미터가 필요합니다' }));
            }

            try {
              const dartUrl = `https://opendart.fss.or.kr/api/document.xml?rcept_no=${rcpNo}&crtfc_key=${dartKey}`;
              const response = await fetch(dartUrl);
              if (!response.ok) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: `DART API 오류: ${response.status}` }));
              }

              const contentType = response.headers.get('content-type') || '';
              if (contentType.includes('json') || contentType.includes('xml')) {
                const text = await response.text();
                const statusMatch = text.match(/<status>(\d+)<\/status>/);
                const msgMatch = text.match(/<message>([^<]*)<\/message>/);
                if (statusMatch && statusMatch[1] !== '000') {
                  res.writeHead(422, { 'Content-Type': 'application/json' });
                  return res.end(JSON.stringify({
                    status: statusMatch[1],
                    message: msgMatch ? msgMatch[1] : '알 수 없는 오류',
                  }));
                }
              }

              const zipBuffer = Buffer.from(await response.arrayBuffer());
              const files = extractAllZipFiles(zipBuffer);
              const htmlFiles = files.filter(
                (f) => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm')
              );

              const sections = htmlFiles.map((f) => ({
                name: f.name,
                title: extractHtmlTitle(f.content),
                text: stripHtmlTags(f.content),
              }));

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=86400',
              });
              res.end(JSON.stringify({ rcpNo, count: sections.length, sections }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        },
      },
    ],

    server: {
      port: 5173,
      proxy: {
        '/api/dart/': {
          target: 'https://opendart.fss.or.kr/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dart\//, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const dartKey = env.DART_API_KEY;
              if (dartKey) {
                const u = new URL(proxyReq.path, 'http://localhost');
                u.searchParams.set('crtfc_key', dartKey);
                proxyReq.path = u.pathname + u.search;
              }
            });
          },
        },
        '/api/news': {
          target: 'https://openapi.naver.com/v1/search',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/news/, '/news.json'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const clientId = env.NAVER_CLIENT_ID;
              const clientSecret = env.NAVER_CLIENT_SECRET;
              if (clientId) proxyReq.setHeader('X-Naver-Client-Id', clientId);
              if (clientSecret) proxyReq.setHeader('X-Naver-Client-Secret', clientSecret);
            });
          },
        },
      },
    },
  };
});

// ──────────────────────────────────────────
// ZIP 다중 파일 추출 (vite.config 내부 헬퍼)
// ──────────────────────────────────────────

function extractAllZipFiles(buffer) {
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) throw new Error('ZIP EOCD를 찾을 수 없습니다');

  const cdTotalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  const files = [];
  let cdPos = cdOffset;

  for (let i = 0; i < cdTotalEntries; i++) {
    if (buffer.readUInt32LE(cdPos) !== 0x02014b50) break;

    const compressionMethod = buffer.readUInt16LE(cdPos + 10);
    const compressedSize = buffer.readUInt32LE(cdPos + 20);
    const uncompressedSize = buffer.readUInt32LE(cdPos + 24);
    const fnameLen = buffer.readUInt16LE(cdPos + 28);
    const extraLen = buffer.readUInt16LE(cdPos + 30);
    const commentLen = buffer.readUInt16LE(cdPos + 32);
    const localHeaderOffset = buffer.readUInt32LE(cdPos + 42);
    const fileName = buffer.subarray(cdPos + 46, cdPos + 46 + fnameLen).toString('utf-8');
    cdPos += 46 + fnameLen + extraLen + commentLen;

    if (fileName.endsWith('/') || uncompressedSize === 0) continue;

    try {
      const localFnameLen = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFnameLen + localExtraLen;
      const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

      let content;
      if (compressionMethod === 0) content = compressedData.toString('utf-8');
      else if (compressionMethod === 8) content = inflateRawSync(compressedData).toString('utf-8');
      else continue;

      files.push({ name: fileName, content });
    } catch {
      // 개별 파일 추출 실패 스킵
    }
  }
  return files;
}

function extractHtmlTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : '';
}

function stripHtmlTags(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}
