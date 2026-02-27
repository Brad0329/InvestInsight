import { useState } from 'react';
import { Link } from 'react-router-dom';
import themesData from '../data/themes.json';
import {
  getCompanyInfo,
  getDisclosureList,
  getFinancialStatement,
  extractKeyMetrics,
  fetchAllStocksFinancials,
  formatBillion,
  REPORT_CODES,
  REPORT_CODE_NAMES,
} from '../services/dartApi.js';
import { clearCache } from '../utils/cache.js';

export default function DevTestPage() {
  const [results, setResults] = useState([]);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [year, setYear] = useState('2024');
  const [reprtCode, setReprtCode] = useState(REPORT_CODES.ANNUAL);

  const addLog = (msg) =>
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runFullTest = async () => {
    setRunning(true);
    setResults([]);
    setLog([]);

    try {
      const stocks = themesData.themes[0].stocks;
      addLog(`=== 테스트 시작: 수소 테마 ${stocks.length}개 종목 ===`);
      addLog(`조회 조건: ${year}년 ${REPORT_CODE_NAMES[reprtCode]}`);
      addLog('');

      // Test 1: 기업개황
      addLog('--- [1/3] 기업개황 조회 ---');
      for (const stock of stocks) {
        try {
          addLog(`  ${stock.name} (${stock.corp_code})...`);
          const info = await getCompanyInfo(stock.corp_code);
          addLog(
            `    => ${info.corp_name} | 대표: ${info.ceo_nm || 'N/A'} | 종목코드: ${info.stock_code || 'N/A'}`,
          );
        } catch (err) {
          addLog(`    => 실패: ${err.message}`);
        }
      }
      addLog('');

      // Test 2: 공시목록
      addLog('--- [2/3] 정기공시 목록 조회 ---');
      for (const stock of stocks) {
        try {
          addLog(`  ${stock.name}...`);
          const discl = await getDisclosureList(stock.corp_code, {
            pblntfTy: 'A',
            bgnDe: `${year}0101`,
          });
          const count = discl.list?.length || 0;
          addLog(`    => 정기공시 ${count}건`);
          if (count > 0) {
            const latest = discl.list[0];
            addLog(`    => 최신: ${latest.report_nm} (${latest.rcept_dt})`);
          }
        } catch (err) {
          addLog(`    => ${err.message}`);
        }
      }
      addLog('');

      // Test 3: 재무제표 일괄 조회
      addLog(`--- [3/3] 재무제표 일괄 조회 (${year} ${REPORT_CODE_NAMES[reprtCode]}) ---`);
      const allResults = await fetchAllStocksFinancials(stocks, year, reprtCode);
      setResults(allResults);

      for (const r of allResults) {
        if (r.error) {
          addLog(`  ${r.stock.name}: 오류 — ${r.error}`);
        } else {
          const m = r.keyMetrics;
          addLog(
            `  ${r.stock.name}: 매출 ${formatBillion(m.revenue?.thstrmAmount)} | 영업이익 ${formatBillion(m.operatingIncome?.thstrmAmount)} | 자산 ${formatBillion(m.assets?.thstrmAmount)}`,
          );
        }
      }
      addLog('');

      // Test 4: 캐시 검증
      addLog('--- 캐시 검증 ---');
      try {
        const t0 = performance.now();
        await getCompanyInfo(stocks[0].corp_code);
        const t1 = performance.now();
        addLog(`  ${stocks[0].name} 재조회: ${(t1 - t0).toFixed(1)}ms (캐시 히트 시 <5ms)`);

        const t2 = performance.now();
        await getFinancialStatement(stocks[0].corp_code, year, reprtCode);
        const t3 = performance.now();
        addLog(`  ${stocks[0].name} 재무 재조회: ${(t3 - t2).toFixed(1)}ms`);
      } catch (err) {
        addLog(`  캐시 검증 스킵 (데이터 없음: ${err.message})`);
      }
      addLog('');

      addLog('=== 전체 테스트 완료 ===');
    } catch (err) {
      addLog(`!!! 예상치 못한 오류: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleClearCache = () => {
    clearCache('dart_');
    addLog('[캐시] DART 캐시 전체 삭제 완료');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Phase 1 — DART API 검증</h1>
            <p className="text-xs text-slate-500">개발 전용 페이지</p>
          </div>
          <Link to="/" className="text-sm font-medium text-sky-600 hover:text-sky-700">
            메인으로
          </Link>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="2024">2024년</option>
            <option value="2023">2023년</option>
            <option value="2025">2025년</option>
          </select>
          <select
            value={reprtCode}
            onChange={(e) => setReprtCode(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(REPORT_CODE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={runFullTest}
            disabled={running}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {running ? '실행 중...' : '전체 테스트'}
          </button>
          <button
            onClick={handleClearCache}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            캐시 삭제
          </button>
        </div>

        {/* Log */}
        <div className="mb-6 max-h-96 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-green-400">
          {log.length === 0 && <p className="text-slate-500">테스트를 실행하세요...</p>}
          {log.map((line, i) => (
            <p key={i} className={line.startsWith('  ') ? '' : 'font-bold text-green-300'}>
              {line}
            </p>
          ))}
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
              <h2 className="text-sm font-semibold text-slate-700">
                재무 요약 — {year}년 {REPORT_CODE_NAMES[reprtCode]}
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="p-3 text-left">종목명</th>
                  <th className="p-3 text-right">매출액</th>
                  <th className="p-3 text-right">영업이익</th>
                  <th className="p-3 text-right">당기순이익</th>
                  <th className="p-3 text-right">자산총계</th>
                  <th className="p-3 text-right">부채총계</th>
                  <th className="p-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const m = r.keyMetrics || {};
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-3 font-medium">{r.stock.name}</td>
                      <td className="p-3 text-right">
                        {formatBillion(m.revenue?.thstrmAmount)}
                      </td>
                      <td className="p-3 text-right">
                        {formatBillion(m.operatingIncome?.thstrmAmount)}
                      </td>
                      <td className="p-3 text-right">
                        {formatBillion(m.netIncome?.thstrmAmount)}
                      </td>
                      <td className="p-3 text-right">
                        {formatBillion(m.assets?.thstrmAmount)}
                      </td>
                      <td className="p-3 text-right">
                        {formatBillion(m.liabilities?.thstrmAmount)}
                      </td>
                      <td className="p-3 text-center">
                        {r.error ? (
                          <span className="text-xs text-red-500">{r.error}</span>
                        ) : (
                          <span className="text-xs font-medium text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
