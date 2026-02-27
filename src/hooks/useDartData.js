import { useState, useCallback } from 'react';
import {
  getCompanyInfo,
  getDisclosureList,
  getFinancialStatement,
  extractKeyMetrics,
  DartApiError,
  DART_STATUS,
} from '../services/dartApi.js';

/**
 * DART 데이터 조회 훅
 * @param {string} corpCode - 기업 고유번호
 */
export function useDartData(corpCode) {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [disclosures, setDisclosures] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [keyMetrics, setKeyMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCompanyInfo = useCallback(async () => {
    if (!corpCode) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanyInfo(corpCode);
      setCompanyInfo(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [corpCode]);

  const fetchDisclosures = useCallback(
    async (options = {}) => {
      if (!corpCode) return null;
      setLoading(true);
      setError(null);
      try {
        const data = await getDisclosureList(corpCode, options);
        setDisclosures(data);
        return data;
      } catch (err) {
        if (err instanceof DartApiError && err.isNoData) {
          setDisclosures({ list: [] });
          return { list: [] };
        }
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [corpCode],
  );

  const fetchFinancials = useCallback(
    async (bsnsYear, reprtCode, fsDiv = 'OFS') => {
      if (!corpCode) return null;
      setLoading(true);
      setError(null);
      try {
        const data = await getFinancialStatement(corpCode, bsnsYear, reprtCode, fsDiv);
        setFinancials(data);
        if (data?.list) {
          setKeyMetrics(extractKeyMetrics(data.list));
        }
        return data;
      } catch (err) {
        if (err instanceof DartApiError && err.isNoData) {
          setFinancials({ status: DART_STATUS.NO_DATA, list: [] });
          setKeyMetrics({});
          return { list: [] };
        }
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [corpCode],
  );

  const reset = useCallback(() => {
    setCompanyInfo(null);
    setDisclosures(null);
    setFinancials(null);
    setKeyMetrics(null);
    setError(null);
  }, []);

  return {
    companyInfo,
    disclosures,
    financials,
    keyMetrics,
    loading,
    error,
    fetchCompanyInfo,
    fetchDisclosures,
    fetchFinancials,
    reset,
  };
}
