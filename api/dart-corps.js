import { inflateRawSync } from 'node:zlib';

/**
 * DART 기업코드 목록 API
 * corpCode.xml ZIP 다운로드 → 파싱 → 상장사만 JSON 반환
 * Node.js 런타임 (Edge 아님 — ZIP 해제 필요)
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

  try {
    // 1. DART corpCode.xml ZIP 다운로드
    const dartUrl = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`;
    const response = await fetch(dartUrl);
    if (!response.ok) {
      return res.status(502).json({ error: `DART API 오류: ${response.status}` });
    }

    const zipBuffer = Buffer.from(await response.arrayBuffer());

    // 2. ZIP에서 단일 파일 추출 (외부 라이브러리 없이)
    const xml = unzipSingleFile(zipBuffer);

    // 3. XML 파싱 → 상장사만 필터
    const corps = parseCorpCodeXml(xml);

    // 4. JSON 반환 (24시간 캐시)
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).json({ count: corps.length, list: corps });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * ZIP 파일에서 첫 번째 파일 추출 (Node.js zlib 사용, 외부 라이브러리 불필요)
 */
function unzipSingleFile(buffer) {
  // ZIP Local File Header 검증
  const signature = buffer.readUInt32LE(0);
  if (signature !== 0x04034b50) {
    throw new Error('유효하지 않은 ZIP 파일입니다');
  }

  const flags = buffer.readUInt16LE(6);
  const compressionMethod = buffer.readUInt16LE(8);
  let compressedSize = buffer.readUInt32LE(18);
  const fnameLen = buffer.readUInt16LE(26);
  const extraLen = buffer.readUInt16LE(28);
  const dataStart = 30 + fnameLen + extraLen;

  // Data Descriptor 플래그(bit 3) 사용 시 Local Header의 크기가 0
  // → Central Directory에서 실제 크기를 읽어야 함
  if ((flags & 0x08) !== 0 && compressedSize === 0) {
    compressedSize = getCompressedSizeFromCD(buffer);
  }

  const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) {
    return compressedData.toString('utf-8'); // 비압축
  }
  if (compressionMethod === 8) {
    return inflateRawSync(compressedData).toString('utf-8'); // deflate
  }
  throw new Error(`지원하지 않는 압축 방식: ${compressionMethod}`);
}

/**
 * End of Central Directory → Central Directory → CompressedSize 읽기
 * DART ZIP은 data descriptor 플래그를 사용하여 Local Header에 크기가 0으로 기록됨
 */
function getCompressedSizeFromCD(buffer) {
  // EOCD 시그니처(0x06054b50) 역방향 탐색
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('ZIP EOCD를 찾을 수 없습니다');
  }

  // EOCD → Central Directory 시작 오프셋 (EOCD + 16)
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  // Central Directory 첫 번째 엔트리 검증
  if (buffer.readUInt32LE(cdOffset) !== 0x02014b50) {
    throw new Error('Central Directory 시그니처가 올바르지 않습니다');
  }

  // Central Directory 엔트리에서 CompressedSize (CD + 20)
  return buffer.readUInt32LE(cdOffset + 20);
}

/**
 * CORPCODE.xml 파싱 — 상장사(stock_code 있는 것)만 추출
 */
function parseCorpCodeXml(xml) {
  const corps = [];
  const regex =
    /<list>\s*<corp_code>(\d+)<\/corp_code>\s*<corp_name>([^<]*)<\/corp_name>\s*<corp_eng_name>[^<]*<\/corp_eng_name>\s*<stock_code>([^<]*)<\/stock_code>\s*<modify_date>(\d*)<\/modify_date>\s*<\/list>/g;

  let match;
  while ((match = regex.exec(xml)) !== null) {
    const stockCode = match[3].trim();
    if (stockCode) {
      // 상장사만 (stock_code가 있는 것)
      corps.push({
        corp_code: match[1],
        corp_name: match[2].trim(),
        stock_code: stockCode,
        modify_date: match[4],
      });
    }
  }

  return corps;
}
