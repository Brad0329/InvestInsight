import { inflateRawSync } from 'node:zlib';

/**
 * DART 사업보고서 원문 다운로드 프록시
 * document.xml ZIP → HTML 파일 목록 추출 → JSON 반환
 * Node.js 런타임 (ZIP 해제 필요)
 *
 * GET /api/dart-doc?rcpNo={rcpNo}
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DART API 키가 서버에 설정되지 않았습니다' });
  }

  const { rcpNo } = req.query;
  if (!rcpNo) {
    return res.status(400).json({ error: 'rcpNo 파라미터가 필요합니다' });
  }

  try {
    // 1. DART document.xml ZIP 다운로드
    const dartUrl = `https://opendart.fss.or.kr/api/document.xml?rcept_no=${rcpNo}&crtfc_key=${apiKey}`;
    const response = await fetch(dartUrl);
    if (!response.ok) {
      return res.status(502).json({ error: `DART API 오류: ${response.status}` });
    }

    // DART가 오류를 JSON으로 반환하는 경우 처리
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json') || contentType.includes('xml')) {
      const text = await response.text();
      // XML 오류 응답 처리
      const statusMatch = text.match(/<status>(\d+)<\/status>/);
      const msgMatch = text.match(/<message>([^<]*)<\/message>/);
      if (statusMatch && statusMatch[1] !== '000') {
        return res.status(422).json({
          status: statusMatch[1],
          message: msgMatch ? msgMatch[1] : '알 수 없는 오류',
        });
      }
    }

    const zipBuffer = Buffer.from(await response.arrayBuffer());

    // 2. ZIP에서 모든 HTML/HTM 파일 추출
    const files = extractAllFiles(zipBuffer);
    const htmlFiles = files.filter(
      (f) => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm')
    );

    // 3. HTML 파일별 플레인 텍스트 추출 후 반환
    const sections = htmlFiles.map((f) => ({
      name: f.name,
      title: extractTitle(f.content),
      text: stripHtml(f.content),
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐시
    return res.status(200).json({ rcpNo, count: sections.length, sections });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ──────────────────────────────────────────
// ZIP 다중 파일 추출
// ──────────────────────────────────────────

/**
 * ZIP 버퍼에서 모든 파일 추출
 * Central Directory 기반 탐색 (Data Descriptor 플래그 대응)
 * @returns {{ name: string, content: string }[]}
 */
function extractAllFiles(buffer) {
  // 1. EOCD(End of Central Directory) 탐색
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('ZIP EOCD를 찾을 수 없습니다');

  const cdTotalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  // 2. Central Directory 순회
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

    // 디렉토리 엔트리 스킵
    if (fileName.endsWith('/') || uncompressedSize === 0) continue;

    try {
      const content = extractFileFromLocalHeader(buffer, localHeaderOffset, compressedSize, compressionMethod);
      files.push({ name: fileName, content });
    } catch {
      // 개별 파일 추출 실패 시 스킵
    }
  }

  return files;
}

/**
 * Local File Header에서 단일 파일 추출
 */
function extractFileFromLocalHeader(buffer, offset, compressedSize, compressionMethod) {
  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error('Local File Header 시그니처 불일치');
  }
  const fnameLen = buffer.readUInt16LE(offset + 26);
  const extraLen = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fnameLen + extraLen;
  const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) return compressedData.toString('utf-8');
  if (compressionMethod === 8) return inflateRawSync(compressedData).toString('utf-8');
  throw new Error(`지원하지 않는 압축 방식: ${compressionMethod}`);
}

// ──────────────────────────────────────────
// HTML 파싱 유틸
// ──────────────────────────────────────────

/** <title> 태그에서 제목 추출 */
function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : '';
}

/** HTML 태그 제거 → 플레인 텍스트 (공백 정규화) */
function stripHtml(html) {
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
