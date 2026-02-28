import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppContext';
import {
  upsertTheme,
  deleteTheme,
  upsertThemeStock,
  deleteThemeStock,
} from '../services/dbApi';
import { searchCorpByName } from '../services/dartApi';

// ─── ThemeList ───────────────────────────────────────────────────────────────

function ThemeList({ themes, selectedId, onSelect, onAdd }) {
  return (
    <div className="w-52 shrink-0 border-r border-slate-200 flex flex-col bg-white">
      <div className="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        테마 목록
      </div>
      <div className="flex-1 overflow-y-auto">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`w-full text-left px-4 py-2.5 text-sm border-b border-slate-100 transition-colors ${
              selectedId === t.id
                ? 'bg-sky-50 text-sky-700 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.name}
            <span className="text-xs text-slate-400 ml-1.5">({t.stocks.length})</span>
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={onAdd}
          className="w-full text-sm text-center text-sky-600 hover:text-sky-700 py-1.5 border border-sky-200 rounded-md hover:bg-sky-50 transition-colors"
        >
          + 새 테마
        </button>
      </div>
    </div>
  );
}

// ─── ThemeEditor ─────────────────────────────────────────────────────────────

function StageRow({ stage, onChange, onDelete }) {
  return (
    <div className="flex gap-1.5 items-center mb-1.5">
      <input
        className="border border-slate-200 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:border-sky-400"
        placeholder="id (영문)"
        value={stage.id}
        onChange={(e) => onChange({ ...stage, id: e.target.value })}
      />
      <input
        className="border border-slate-200 rounded px-2 py-1 text-xs w-20 focus:outline-none focus:border-sky-400"
        placeholder="라벨"
        value={stage.label}
        onChange={(e) => onChange({ ...stage, label: e.target.value })}
      />
      <input
        className="border border-slate-200 rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:border-sky-400"
        placeholder="설명 (sub)"
        value={stage.sub || ''}
        onChange={(e) => onChange({ ...stage, sub: e.target.value })}
      />
      <button
        onClick={onDelete}
        className="text-red-400 hover:text-red-600 text-sm px-1 leading-none"
      >
        ✕
      </button>
    </div>
  );
}

function ThemeEditor({ theme, onSave, onDelete }) {
  const [name, setName] = useState(theme.name);
  const [description, setDescription] = useState(theme.description || '');
  const [stages, setStages] = useState(theme.value_chain_stages || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // theme.id 변경 시 폼 초기화
  useEffect(() => {
    setName(theme.name);
    setDescription(theme.description || '');
    setStages(theme.value_chain_stages || []);
    setMsg('');
  }, [theme.id]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ id: theme.id, name: name.trim(), description: description.trim(), stages });
      setMsg('저장됨');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('오류: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStage = (i, updated) =>
    setStages(stages.map((s, idx) => (idx === i ? updated : s)));

  const removeStage = (i) => setStages(stages.filter((_, idx) => idx !== i));

  const addStage = () => setStages([...stages, { id: '', label: '', sub: '' }]);

  return (
    <section className="mb-6 pb-6 border-b border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">테마 정보</h3>

      <div className="space-y-2 mb-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">테마명</label>
          <input
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-sky-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">설명</label>
          <textarea
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm w-full h-16 resize-none focus:outline-none focus:border-sky-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600">밸류체인 스테이지</span>
          <button onClick={addStage} className="text-xs text-sky-600 hover:text-sky-700">
            + 추가
          </button>
        </div>
        {stages.length === 0 && (
          <p className="text-xs text-slate-400 mb-2">스테이지가 없습니다.</p>
        )}
        {stages.map((s, i) => (
          <StageRow
            key={i}
            stage={s}
            onChange={(updated) => updateStage(i, updated)}
            onDelete={() => removeStage(i)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm px-4 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
        {msg && (
          <span className={`text-xs ${msg.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>
            {msg}
          </span>
        )}
        <div className="flex-1" />
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">
          테마 삭제
        </button>
      </div>
    </section>
  );
}

// ─── StockList ────────────────────────────────────────────────────────────────

function StockList({ theme, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (corpCode, name) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`'${name}' 종목을 삭제할까요?`)) return;
    setDeleting(corpCode);
    try {
      await deleteThemeStock(theme.id, corpCode);
      await onRefresh();
    } catch (e) {
      // eslint-disable-next-line no-alert
      window.alert('삭제 오류: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        종목 목록
        <span className="text-xs font-normal text-slate-400 ml-1.5">({theme.stocks.length}개)</span>
      </h3>
      {theme.stocks.length === 0 ? (
        <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-md">
          등록된 종목이 없습니다
        </p>
      ) : (
        <div className="border border-slate-200 rounded-md overflow-hidden">
          {theme.stocks.map((s) => (
            <div
              key={s.corp_code}
              className="flex items-center px-3 py-2.5 border-b border-slate-100 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{s.name}</span>
                  {s.code && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {s.code}
                    </span>
                  )}
                  {s.stage_id && (
                    <span className="text-xs text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                      {theme.value_chain_stages?.find((st) => st.id === s.stage_id)?.label ||
                        s.stage_id}
                    </span>
                  )}
                </div>
                {s.value_chain && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{s.value_chain}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(s.corp_code, s.name)}
                disabled={deleting === s.corp_code}
                className="text-xs text-red-400 hover:text-red-600 ml-3 shrink-0 disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── StockAddPanel ────────────────────────────────────────────────────────────

function StockAddPanel({ themeId, stages, onAdded }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stageId, setStageId] = useState('');
  const [valueChain, setValueChain] = useState('');
  const [memo, setMemo] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchCorpByName(query.trim());
      setResults(res.slice(0, 10));
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (corp) => {
    setSelected(corp);
    setQuery(corp.corp_name);
    setResults([]);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await upsertThemeStock({
        theme_id: themeId,
        corp_code: selected.corp_code,
        corp_name: selected.corp_name,
        stock_code: selected.stock_code || '',
        stage_id: stageId,
        value_chain: valueChain,
        ir_url: '',
        memo,
      });
      await onAdded();
      // 폼 초기화
      setQuery('');
      setResults([]);
      setSelected(null);
      setStageId('');
      setValueChain('');
      setMemo('');
      setMsg('추가됨');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('오류: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm text-sky-600 hover:text-sky-700 py-2 border border-dashed border-sky-200 rounded-md hover:bg-sky-50 transition-colors"
      >
        + 종목 추가
      </button>
    );
  }

  return (
    <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-600">종목 추가</h4>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          닫기
        </button>
      </div>

      {/* 검색 */}
      <div className="flex gap-2 mb-2">
        <input
          className="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm flex-1 focus:outline-none focus:border-sky-400 bg-white"
          placeholder="기업명 또는 종목코드"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="text-sm px-3 py-1.5 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {searching ? '…' : '검색'}
        </button>
      </div>

      {/* 검색 결과 */}
      {results.length > 0 && (
        <div className="border border-slate-200 rounded-md bg-white mb-3 max-h-36 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.corp_code}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
            >
              <span className="font-medium text-slate-800">{r.corp_name}</span>
              {r.stock_code && (
                <span className="text-slate-400 ml-2">{r.stock_code}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 선택 후 상세 입력 */}
      {selected && (
        <div className="space-y-2">
          <div className="text-xs text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-md font-medium">
            ✓ {selected.corp_name}
            {selected.stock_code && ` (${selected.stock_code})`}
          </div>
          <select
            className="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-sky-400"
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
          >
            <option value="">-- 스테이지 선택 (선택 사항) --</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            className="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm w-full focus:outline-none focus:border-sky-400 bg-white"
            placeholder="밸류체인 설명 (예: 연료전지 부품)"
            value={valueChain}
            onChange={(e) => setValueChain(e.target.value)}
          />
          <input
            className="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm w-full focus:outline-none focus:border-sky-400 bg-white"
            placeholder="메모 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="text-sm px-4 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중…' : '추가'}
            </button>
            {msg && (
              <span
                className={`text-xs ${msg.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}
              >
                {msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { themes, themesLoading, refreshThemes } = useAppState();
  const [selectedId, setSelectedId] = useState(null);

  // themes 로드 후 첫 테마 자동 선택 / 삭제 후 재선택
  useEffect(() => {
    if (themes.length === 0) {
      setSelectedId(null);
      return;
    }
    const exists = themes.find((t) => t.id === selectedId);
    if (!exists) setSelectedId(themes[0].id);
  }, [themes, selectedId]);

  const selectedTheme = themes.find((t) => t.id === selectedId) || null;

  const handleAddTheme = async () => {
    // eslint-disable-next-line no-alert
    const name = window.prompt('새 테마 이름:');
    if (!name?.trim()) return;
    const rawId = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    const id = rawId || `theme_${Date.now()}`;
    try {
      await upsertTheme({ id, name: name.trim(), description: '', stages: [] });
      await refreshThemes();
      setSelectedId(id);
    } catch (e) {
      // eslint-disable-next-line no-alert
      window.alert('테마 추가 오류: ' + e.message);
    }
  };

  const handleSaveTheme = async (themeData) => {
    await upsertTheme(themeData);
    await refreshThemes();
  };

  const handleDeleteTheme = async () => {
    if (!selectedTheme) return;
    // eslint-disable-next-line no-alert
    if (
      !window.confirm(
        `'${selectedTheme.name}' 테마를 삭제할까요?\n소속 종목(${selectedTheme.stocks.length}개)도 모두 삭제됩니다.`
      )
    )
      return;
    try {
      await deleteTheme(selectedTheme.id);
      await refreshThemes();
    } catch (e) {
      // eslint-disable-next-line no-alert
      window.alert('테마 삭제 오류: ' + e.message);
    }
  };

  const handleExportJson = () => {
    const payload = {
      themes: themes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        value_chain_stages: t.value_chain_stages,
        stocks: t.stocks,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'themes_export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">테마 / 종목 관리</h1>
          <p className="text-xs text-slate-500 mt-0.5">테마 및 종목 데이터를 관리합니다</p>
        </div>
        <Link to="/" className="text-sm text-sky-600 hover:text-sky-700 font-medium">
          ← 메인으로
        </Link>
      </header>

      {/* 바디 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 테마 목록 */}
        {themesLoading ? (
          <div className="w-52 shrink-0 flex items-center justify-center text-slate-400 text-sm border-r border-slate-200 bg-white">
            로딩 중…
          </div>
        ) : (
          <ThemeList
            themes={themes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={handleAddTheme}
          />
        )}

        {/* 우측: 편집 영역 */}
        {selectedTheme ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              <ThemeEditor
                key={selectedTheme.id}
                theme={selectedTheme}
                onSave={handleSaveTheme}
                onDelete={handleDeleteTheme}
              />
              <StockList theme={selectedTheme} onRefresh={refreshThemes} />
              <StockAddPanel
                themeId={selectedTheme.id}
                stages={selectedTheme.value_chain_stages}
                onAdded={refreshThemes}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            {themesLoading ? '로딩 중…' : '← 테마를 선택하거나 새로 추가하세요'}
          </div>
        )}
      </div>

      {/* 푸터 */}
      <footer className="border-t border-slate-200 bg-white px-6 py-3 flex gap-3 shrink-0">
        <button
          onClick={handleExportJson}
          className="text-sm px-4 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 transition-colors"
        >
          JSON 내보내기
        </button>
      </footer>
    </div>
  );
}
