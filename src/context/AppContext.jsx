import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import themesData from '../data/themes.json';
import { getThemes } from '../services/dbApi';

const AppContext = createContext(null);

const currentYear = new Date().getFullYear();

const initialState = {
  selectedThemeId: null,
  selectedStockCode: null,
  selectedCorpCode: null,
  activeTab: 'valuechain',
  bsnsYear: String(currentYear - 1),
  reprtCode: '11011', // 사업보고서
};

export function AppProvider({ children }) {
  const [selectedThemeId, setSelectedThemeId] = useState(initialState.selectedThemeId);
  const [selectedStockCode, setSelectedStockCode] = useState(initialState.selectedStockCode);
  const [selectedCorpCode, setSelectedCorpCode] = useState(initialState.selectedCorpCode);
  const [activeTab, setActiveTab] = useState(initialState.activeTab);
  const [bsnsYear, setBsnsYear] = useState(initialState.bsnsYear);
  const [reprtCode, setReprtCode] = useState(initialState.reprtCode);

  // themes: themes.json을 폴백 초기값으로, Supabase 로드 후 갱신
  const [themes, setThemes] = useState(themesData.themes);
  const [themesLoading, setThemesLoading] = useState(true);

  useEffect(() => {
    getThemes()
      .then((rows) => { if (rows?.length) setThemes(rows); })
      .catch(() => {}) // Supabase 미설정 시 themes.json 폴백 유지
      .finally(() => setThemesLoading(false));
  }, []);

  const refreshThemes = useCallback(() => {
    setThemesLoading(true);
    return getThemes()
      .then((rows) => { if (rows?.length) setThemes(rows); })
      .catch(() => {})
      .finally(() => setThemesLoading(false));
  }, []);

  const selectedTheme = themes.find((t) => t.id === selectedThemeId) || null;
  const selectedStock =
    selectedTheme?.stocks.find((s) => s.code === selectedStockCode) || null;

  const selectTheme = useCallback((themeId) => {
    setSelectedThemeId(themeId);
    setSelectedStockCode(null);
    setSelectedCorpCode(null);
  }, []);

  const selectStock = useCallback(
    (stockCode, corpCode) => {
      setSelectedStockCode(stockCode);
      setSelectedCorpCode(corpCode);
      setActiveTab('financial');
    },
    [],
  );

  const setPeriod = useCallback((year, code) => {
    setBsnsYear(year);
    setReprtCode(code);
  }, []);

  return (
    <AppContext.Provider
      value={{
        themes,
        themesLoading,
        refreshThemes,
        selectedThemeId,
        selectedTheme,
        selectedStockCode,
        selectedCorpCode,
        selectedStock,
        activeTab,
        bsnsYear,
        reprtCode,
        selectTheme,
        selectStock,
        setActiveTab,
        setPeriod,
        setBsnsYear,
        setReprtCode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
