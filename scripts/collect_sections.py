#!/usr/bin/env python3
"""
DART 사업보고서 텍스트 섹션 수집 스크립트

DART 전자공시 뷰어에서 사업보고서 HTML을 파싱하여
Supabase report_sections 테이블에 저장합니다.

사전 준비:
    pip install -r requirements.txt

사용법:
    python collect_sections.py                   # themes.json 전체 종목
    python collect_sections.py --corp 00958451   # 특정 종목만
    python collect_sections.py --year 2023       # 특정 사업연도
    python collect_sections.py --dry-run         # DB 저장 없이 결과만 출력
"""

import os
import sys
import json
import time
import argparse
import re
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

# ── 환경 설정 ─────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / '.env.local')

DART_API_KEY  = os.getenv('DART_API_KEY')
SUPABASE_URL  = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY  = os.getenv('VITE_SUPABASE_ANON_KEY')

if not all([DART_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    print('ERROR: .env.local에 DART_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 필요')
    sys.exit(1)

supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── 상수 ──────────────────────────────────────────────────────────────
DART_API    = 'https://opendart.fss.or.kr/api'
DART_VIEWER = 'https://dart.fss.or.kr'

HTTP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'Referer': 'https://dart.fss.or.kr/',
}

# dartDocService.js의 SECTION_KEY_MAP과 동일 + DART TOC 최상위 섹션 패턴 추가
SECTION_KEY_MAP = [
    {'key': 'business_overview',  'patterns': [
        '사업의 개요', '사업개요', '사업의 내용',
        'II. 사업의 내용',
    ]},
    {'key': 'products_services',  'patterns': [
        '주요 제품', '제품 및 서비스', '주요제품', '사업부문별 현황',
        '제품 및 서비스 현황',
    ]},
    {'key': 'market_competition', 'patterns': [
        '시장 환경', '경쟁 현황', '판매경로', '시장 및 경쟁',
    ]},
    {'key': 'risk_factors',       'patterns': [
        '위험관리', '위험 요인', '사업위험', '회사위험',
        'XI. 그 밖에 투자자',
    ]},
    {'key': 'rd_pipeline',        'patterns': [
        '연구개발', '연구 개발', 'R&D', '개발 과제',
    ]},
    {'key': 'management_strategy', 'patterns': [
        '경영진단', '경영전략', '전략', '중장기',
        'IV. 이사의 경영',
    ]},
    {'key': 'related_party',      'patterns': [
        '특수관계인', '이해관계자', '계열회사',
    ]},
]

# ── DART API ──────────────────────────────────────────────────────────

def get_latest_annual_report(corp_code: str, bsns_year: str) -> dict | None:
    """DART API에서 최신 사업보고서 공시 정보 조회 (rcpNo 포함)"""
    resp = requests.get(
        f'{DART_API}/list.json',
        params={
            'crtfc_key': DART_API_KEY,
            'corp_code':  corp_code,
            'pblntf_ty':  'A',   # 정기공시
            'bgn_de':     f'{bsns_year}0101',
            'end_de':     f'{int(bsns_year)+1}0331',
            'page_count': 20,
        },
        timeout=30,
    )
    data = resp.json()
    if data.get('status') != '000':
        print(f'    DART API 오류: {data.get("message")}')
        return None

    for item in data.get('list', []):
        nm = item.get('report_nm', '')
        # 원본 사업보고서만 (정정 제외)
        if '사업보고서' in nm and '정정' not in nm:
            return item
    return None

# ── DART 뷰어 HTML 파싱 ───────────────────────────────────────────────

def get_document_list(rcpno: str) -> list[dict]:
    """
    DART 뷰어에서 문서 목록(TOC) 파싱
    반환: [{'title': str, 'dcm_no': str, 'ele_id': str}, ...]
    """
    # 1. 메인 뷰어 페이지 요청
    resp = requests.get(
        f'{DART_VIEWER}/dsaf001/main.do',
        params={'rcpNo': rcpno},
        headers=HTTP_HEADERS,
        timeout=30,
    )
    if resp.status_code != 200:
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')

    # 2. 모든 frame/iframe URL 수집
    frame_urls = []
    for frame in soup.find_all(['frame', 'iframe']):
        src = frame.get('src', '')
        if not src or src.startswith('javascript') or src == '#':
            continue
        if src.startswith('/'):
            src = DART_VIEWER + src
        elif not src.startswith('http'):
            src = f'{DART_VIEWER}/dsaf001/{src}'
        frame_urls.append(src)

    print(f'    [TOC] 프레임 {len(frame_urls)}개: {frame_urls}')

    # 3. 각 프레임에서 가장 많은 노드를 가진 결과 수집
    candidates = []

    # 메인 페이지 후보 (최후 폴백용 — 노드 수가 적을 가능성 있음)
    main_docs = _parse_toc_from_html(resp.text, rcpno)
    if main_docs:
        candidates.append(main_docs)

    for url in frame_urls:
        time.sleep(0.5)
        try:
            fr = requests.get(url, headers=HTTP_HEADERS, timeout=30)
            docs = _parse_toc_from_html(fr.text, rcpno)
            if docs:
                print(f'    [TOC] {url} → {len(docs)}개 노드')
                candidates.append(docs)
        except Exception:
            continue

    # 4. DART가 TOC를 반환하는 알려진 엔드포인트 직접 시도
    known_toc_paths = [
        f'/dsaf001/selectToc.do?rcpNo={rcpno}',
        f'/dsaf001/tocView.do?rcpNo={rcpno}',
        f'/dsaf001/viewDoc.do?rcpNo={rcpno}',
    ]
    for path in known_toc_paths:
        time.sleep(0.5)
        try:
            tr = requests.get(DART_VIEWER + path, headers=HTTP_HEADERS, timeout=30)
            if tr.status_code == 200:
                docs = _parse_toc_from_html(tr.text, rcpno)
                if docs:
                    print(f'    [TOC] {path} → {len(docs)}개 노드')
                    candidates.append(docs)
        except Exception:
            continue

    if not candidates:
        print(f'    [TOC] 모든 경로에서 node 변수 미발견')
        return []

    # 노드 수가 가장 많은 후보 선택 (실제 TOC가 가장 많은 항목을 가짐)
    best = max(candidates, key=len)
    print(f'    [TOC] 최종 선택: {len(best)}개 노드')
    return best


def _parse_toc_from_html(html: str, rcpno: str) -> list[dict]:
    """HTML에서 DART 뷰어 TOC 파싱 (JavaScript node 변수 우선, HTML 링크 폴백)"""
    docs = []
    seen = set()

    # ── 1. JavaScript node 변수 파싱 (DART 뷰어 jsTree 방식) ──────────
    # DART 페이지는 여러 블록에서 node1, node2...를 반복 사용하므로
    # node1이 재등장하면 현재 블록을 flush하고 새 블록 시작
    prop_pattern = re.compile(
        r"(node\d+)\['(text|dcmNo|eleId|offset|length)'\]\s*=\s*[\"']([^\"']*)[\"']"
    )

    def _flush(block: dict) -> None:
        for props in block.values():
            text   = props.get('text', '').strip()
            dcm_no = props.get('dcmNo', '').strip()
            ele_id = props.get('eleId', '0').strip()
            offset = props.get('offset', '0').strip()
            length = props.get('length', '-1').strip()
            if not text or not dcm_no:
                continue
            key = (dcm_no, ele_id)
            if key not in seen:
                seen.add(key)
                docs.append({
                    'title': text, 'dcm_no': dcm_no, 'ele_id': ele_id,
                    'offset': offset, 'length': length,
                })

    current_block: dict = {}
    for m in prop_pattern.finditer(html):
        node_name, prop, value = m.group(1), m.group(2), m.group(3)
        # node1['text']가 다시 나타나면 이전 블록 flush
        if node_name == 'node1' and prop == 'text' and current_block:
            _flush(current_block)
            current_block = {}
        if node_name not in current_block:
            current_block[node_name] = {}
        current_block[node_name][prop] = value
    _flush(current_block)  # 마지막 블록

    if docs:
        return docs

    # ── 2. HTML 링크 폴백 (구형 DART 뷰어) ───────────────────────────
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup.find_all(['a', 'li', 'span', 'td']):
        text = tag.get_text(strip=True)
        if not text:
            continue

        href    = tag.get('href', '')
        onclick = tag.get('onclick', '')
        raw     = href + ' ' + onclick

        dcm_match = re.search(r'dcmNo[=,\s(\'\"]+(\d+)', raw)
        ele_match = re.search(r'eleId[=,\s(\'\"]+(\d+)', raw)

        if not dcm_match:
            params = re.search(
                r"goView\(['\"]?" + re.escape(rcpno) + r"['\"]?\s*,\s*['\"]?(\d+)['\"]?\s*,\s*['\"]?(\d+)['\"]?",
                raw
            )
            if params:
                dcm_no = params.group(1)
                ele_id = params.group(2)
            else:
                continue
        else:
            dcm_no = dcm_match.group(1)
            ele_id = ele_match.group(1) if ele_match else '0'

        key = (dcm_no, ele_id)
        if key in seen:
            continue
        seen.add(key)
        docs.append({'title': text, 'dcm_no': dcm_no, 'ele_id': ele_id})

    return docs


def get_section_text(rcpno: str, dcm_no: str, ele_id: str = '0',
                     offset: str = '0', length: str = '-1') -> str:
    """DART 뷰어에서 개별 섹션 HTML을 가져와 플레인 텍스트로 변환"""
    resp = requests.get(
        f'{DART_VIEWER}/report/viewer.do',
        params={
            'rcpNo':  rcpno,
            'dcmNo':  dcm_no,
            'eleId':  ele_id,
            'offset': offset,
            'length': length,
            'dtd':    'dart3.dtd',
        },
        headers=HTTP_HEADERS,
        timeout=60,
    )
    if resp.status_code != 200:
        return ''

    soup = BeautifulSoup(resp.text, 'html.parser')
    for tag in soup(['script', 'style', 'head', 'nav']):
        tag.decompose()

    lines = [line.strip() for line in soup.get_text(separator='\n').splitlines()]
    lines = [l for l in lines if l]
    return '\n\n'.join(lines)

# ── 섹션 키 매핑 ──────────────────────────────────────────────────────

def guess_section_key(title: str) -> str | None:
    """섹션 제목 → section_key (없으면 None)"""
    for item in SECTION_KEY_MAP:
        if any(p in title for p in item['patterns']):
            return item['key']
    return None

# ── Supabase 저장 ─────────────────────────────────────────────────────

def get_or_create_report_id(corp_code: str, rcpno: str, report_nm: str,
                             bsns_year: str, rcept_dt: str) -> int | None:
    """reports 테이블에서 report_id 조회, 없으면 INSERT"""
    # companies 레코드 보장 (없으면 최소 정보로 생성)
    supabase_client.table('companies').upsert(
        {'corp_code': corp_code, 'corp_name': corp_code},
        on_conflict='corp_code',
    ).execute()

    # reports 조회
    rows = supabase_client.table('reports') \
        .select('id') \
        .eq('corp_code', corp_code) \
        .eq('bsns_year', bsns_year) \
        .eq('reprt_code', '11011') \
        .execute()

    if rows.data:
        return rows.data[0]['id']

    # 없으면 INSERT
    filed_at = None
    if rcept_dt and len(rcept_dt) == 8:
        filed_at = f'{rcept_dt[:4]}-{rcept_dt[4:6]}-{rcept_dt[6:]}'

    result = supabase_client.table('reports').insert({
        'corp_code':   corp_code,
        'rcpno':       rcpno,
        'report_type': report_nm,
        'bsns_year':   bsns_year,
        'reprt_code':  '11011',
        'filed_at':    filed_at,
    }).execute()

    return result.data[0]['id'] if result.data else None


def upsert_section(report_id: int, section_key: str, content: str) -> None:
    """report_sections upsert (report_id + section_key 기준)"""
    supabase_client.table('report_sections').upsert(
        {
            'report_id':   report_id,
            'section_key': section_key,
            'content':     content,
        },
        on_conflict='report_id,section_key',
    ).execute()

# ── 메인 수집 로직 ────────────────────────────────────────────────────

def collect_company(stock: dict, bsns_year: str, dry_run: bool = False) -> int:
    """
    단일 종목 사업보고서 텍스트 수집
    반환: 저장된 섹션 수
    """
    corp_code = stock['corp_code']
    corp_name = stock['name']
    print(f'\n▶ [{corp_name}] corp_code={corp_code} year={bsns_year}')

    # 1. 사업보고서 rcpNo 조회
    report_info = get_latest_annual_report(corp_code, bsns_year)
    if not report_info:
        print('  ✗ 사업보고서를 찾을 수 없음')
        return 0

    rcpno     = report_info['rcept_no']
    report_nm = report_info['report_nm']
    rcept_dt  = report_info.get('rcept_dt', '')
    print(f'  rcpNo={rcpno}  ({report_nm})')

    # 2. report_id 조회/생성
    if not dry_run:
        report_id = get_or_create_report_id(corp_code, rcpno, report_nm, bsns_year, rcept_dt)
        if not report_id:
            print('  ✗ report_id 생성 실패')
            return 0
        print(f'  report_id={report_id}')

    # 3. 문서 목록(TOC) 파싱
    time.sleep(1)
    docs = get_document_list(rcpno)
    print(f'  문서 항목 수={len(docs)}')

    if not docs:
        print('  ✗ 문서 목록을 가져올 수 없음 (DART 뷰어 구조 변경 가능성)')
        return 0

    # 4. 관련 섹션 필터링 → 텍스트 추출 → 저장
    saved = 0
    processed_keys = set()

    for doc in docs:
        title = doc['title']
        key   = guess_section_key(title)
        if not key or key in processed_keys:
            continue

        print(f'  → [{title}] section_key={key}')
        time.sleep(1)

        text = get_section_text(
            rcpno, doc['dcm_no'], doc['ele_id'],
            offset=doc.get('offset', '0'),
            length=doc.get('length', '-1'),
        )

        if len(text) < 100:
            print(f'    텍스트 부족 (len={len(text)}), 건너뜀')
            continue

        content = text[:10000]
        print(f'    텍스트 len={len(text)} → 저장 {len(content)}자')

        if not dry_run:
            upsert_section(report_id, key, content)

        processed_keys.add(key)
        saved += 1

    print(f'  완료: {saved}개 섹션 {"(dry-run)" if dry_run else "저장"}')
    return saved


def main():
    parser = argparse.ArgumentParser(description='DART 사업보고서 텍스트 섹션 수집')
    parser.add_argument('--corp',    help='특정 corp_code만 처리 (예: 00958451)')
    parser.add_argument('--year',    help='사업연도 4자리 (기본: 직전 사업연도)')
    parser.add_argument('--dry-run', action='store_true', help='DB 저장 없이 결과만 출력')
    args = parser.parse_args()

    # 사업연도 결정 (3월 이전이면 전전년도, 이후면 전년도)
    now = datetime.now()
    if args.year:
        bsns_year = args.year
    else:
        bsns_year = str(now.year - 2 if now.month < 3 else now.year - 1)

    print(f'=== DART 사업보고서 섹션 수집 ===')
    print(f'대상 사업연도: {bsns_year}')
    print(f'dry-run: {args.dry_run}')

    # themes.json 로드
    themes_path = ROOT / 'src' / 'data' / 'themes.json'
    with open(themes_path, 'r', encoding='utf-8') as f:
        themes = json.load(f)

    stocks = []
    for theme in themes['themes']:
        stocks.extend(theme['stocks'])

    # 특정 종목 필터
    if args.corp:
        stocks = [s for s in stocks if s['corp_code'] == args.corp]
        if not stocks:
            print(f'ERROR: corp_code={args.corp} 를 themes.json에서 찾을 수 없음')
            sys.exit(1)

    print(f'처리 종목 수: {len(stocks)}')

    total_saved = 0
    for stock in stocks:
        try:
            saved = collect_company(stock, bsns_year, dry_run=args.dry_run)
            total_saved += saved
        except Exception as e:
            print(f'  ✗ 오류: {e}')
        time.sleep(2)  # 종목 간 대기

    print(f'\n=== 완료: 총 {total_saved}개 섹션 저장 ===')


if __name__ == '__main__':
    main()
