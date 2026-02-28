import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '../utils/storage';
import { getAvailableModels } from '../services/aiApi';

const API_KEY_CONFIGS = [
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    keyName: 'investinsight_claude_key',
    placeholder: 'sk-ant-api03-...',
    helpUrl: 'https://console.anthropic.com/',
  },
  {
    id: 'gpt4o',
    label: 'GPT-4o (OpenAI)',
    keyName: 'investinsight_gpt_key',
    placeholder: 'sk-proj-...',
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    keyName: 'investinsight_deepseek_key',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.deepseek.com/',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    keyName: 'investinsight_gemini_key',
    placeholder: 'AIza...',
    helpUrl: 'https://aistudio.google.com/apikey',
  },
];

function ApiKeyInput({ config }) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const existing = storage.get(config.keyName);
    if (existing) {
      setSaved(true);
      setValue('');
    }
  }, [config.keyName]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    storage.set(config.keyName, trimmed);
    setSaved(true);
    setEditing(false);
    setValue('');
  };

  const handleDelete = () => {
    storage.remove(config.keyName);
    setSaved(false);
    setValue('');
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-800">{config.label}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {saved ? '저장됨' : '미설정'}
        </span>
      </div>

      {saved && !editing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-md">
            ••••••••••••••••
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            변경
          </button>
          <button
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-600 font-medium"
          >
            삭제
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="px-3 py-2 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            저장
          </button>
          {editing && (
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
            >
              취소
            </button>
          )}
        </div>
      )}

      <a
        href={config.helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-2 text-xs text-slate-400 hover:text-slate-600"
      >
        API 키 발급 →
      </a>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">설정</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            API 키 및 기본 설정을 관리합니다
          </p>
        </div>
        <Link
          to="/"
          className="text-sm text-sky-600 hover:text-sky-700 font-medium"
        >
          메인으로 돌아가기
        </Link>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            AI API 키 관리
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            키는 브라우저 로컬 저장소에만 저장되며 서버로 전송되지 않습니다
          </p>
          <div className="space-y-3">
            {API_KEY_CONFIGS.map((config) => (
              <ApiKeyInput key={config.id} config={config} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
