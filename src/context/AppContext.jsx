import { createContext, useContext, useState, useCallback } from 'react';
import themesData from '../data/themes.json';

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

  const themes = themesData.themes;

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
