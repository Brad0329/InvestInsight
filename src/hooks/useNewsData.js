import { useState, useCallback, useRef } from 'react';
import { searchNews } from '../services/newsApi.js';
import { getNews, upsertNews } from '../services/dbApi.js';
import { getDisclosureList } from '../services/dartApi.js';
import { DartApiError } from '../services/dartErrors.js';

/**
 * 뉴스 + 공시 데이터 훅
 * - 뉴스: 네이버 검색 → DB 저장 → DB 조회
 * - 공시: DART 공시 목록 직접 조회
 */
export function useNewsData() {
  const [news, setNews] = useState([]);
  const [disclosures, setDisclosures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastCorpRef = useRef(null);

  /**
   * 뉴스 로드: DB 우선 → 없으면 네이버 검색 후 DB 저장
   */
  const fetchNews = useCallback(async (corpCode, corpName) => {
    if (!corpCode || !corpName) return;
    setLoading(true);
    setError(null);
    try {
      // 1. DB에서 최신 뉴스 조회
      let items = await getNews(corpCode, 20);

      // 2. DB가 비어있거나 너무 오래된 경우 → 네이버 검색 후 저장
      const isStale = !items.length || _isOlderThanHours(items[0]?.created_at, 6);
      if (isStale) {
        const result = await searchNews(corpName, 20);
        if (result?.items?.length) {
          await upsertNews(corpCode, result.items);
          items = await getNews(corpCode, 20);
        }
      }

      setNews(items);
    } catch (e) {
      const msg = e.message?.includes('401')
        ? '네이버 뉴스 API 키가 설정되지 않았습니다. 설정 페이지에서 키를 등록해주세요.'
        : e.message;
      setError(msg);
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 공시 목록 로드 (DART API 직접 조회)
   */
  const fetchDisclosures = useCallback(async (corpCode, options = {}) => {
    if (!corpCode) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getDisclosureList(corpCode, {
        pblntfTy: options.pblntfTy || 'A', // A=정기공시, B=주요사항보고, F=기타
        ...options,
      });
      setDisclosures(list?.list || []);
    } catch (e) {
      if (e instanceof DartApiError && e.isNoData) {
        setDisclosures([]);
      } else {
        setError(e.message);
        setDisclosures([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 종목 변경 시 뉴스+공시 한꺼번에 로드
   */
  const fetchAll = useCallback(
    async (corpCode, corpName) => {
      if (!corpCode || lastCorpRef.current === corpCode) return;
      lastCorpRef.current = corpCode;
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchNews(corpCode, corpName), fetchDisclosures(corpCode)]);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [fetchNews, fetchDisclosures]
  );

  const reset = useCallback(() => {
    lastCorpRef.current = null;
    setNews([]);
    setDisclosures([]);
    setError(null);
  }, []);

  return { news, disclosures, loading, error, fetchNews, fetchDisclosures, fetchAll, reset };
}

/** created_at이 N시간보다 오래됐는지 확인 */
function _isOlderThanHours(isoStr, hours) {
  if (!isoStr) return true;
  return Date.now() - new Date(isoStr).getTime() > hours * 3600 * 1000;
}
