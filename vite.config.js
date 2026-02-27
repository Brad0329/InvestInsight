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
      // DART 기업코드 목록 미들웨어 (dev 전용)
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
                const url = new URL(proxyReq.path, 'http://localhost');
                url.searchParams.set('crtfc_key', dartKey);
                proxyReq.path = url.pathname + url.search;
              }
            });
          },
        },
        '/api/news': {
          target: 'https://openapi.naver.com/v1/search',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/news/, '/news.json'),
        },
      },
    },
  };
});
