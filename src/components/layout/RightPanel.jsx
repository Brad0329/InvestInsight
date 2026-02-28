import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../context/AppContext';
import { useDartData } from '../../hooks/useDartData';
import { useChat } from '../../hooks/useChat';
import { getAvailableModels } from '../../services/aiApi';
import { buildSystemPrompt } from '../../utils/systemPrompt';
import ChatMessage from '../chat/ChatMessage';
import QuestionTemplates from '../chat/QuestionTemplates';

export default function RightPanel() {
  const {
    selectedCorpCode,
    selectedStockCode,
    selectedStock,
    selectedTheme,
    bsnsYear,
    reprtCode,
  } = useAppState();

  const { companyInfo, keyMetrics, fetchCompanyInfo, fetchFinancials } =
    useDartData(selectedCorpCode);

  const {
    messages,
    loading,
    error,
    selectedModel,
    setSelectedModel,
    send,
    clearHistory,
  } = useChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const prevStockRef = useRef(null);

  const models = getAvailableModels();
  const currentModel = models.find((m) => m.id === selectedModel);
  const hasKey = currentModel?.hasKey ?? false;
  const hasStock = !!selectedStockCode;

  // 종목 변경 시 대화 초기화 + 재무 데이터 로드
  useEffect(() => {
    if (prevStockRef.current !== null && prevStockRef.current !== selectedStockCode) {
      clearHistory();
    }
    prevStockRef.current = selectedStockCode;

    if (selectedCorpCode) {
      fetchCompanyInfo();
      fetchFinancials(bsnsYear, reprtCode);
    }
  }, [selectedStockCode, selectedCorpCode, bsnsYear, reprtCode, clearHistory, fetchCompanyInfo, fetchFinancials]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !hasStock) return;

    const systemPrompt = buildSystemPrompt({
      stock: selectedStock,
      companyInfo,
      keyMetrics,
      theme: selectedTheme,
      bsnsYear,
      reprtCode,
    });

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await send(text, systemPrompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // textarea 자동 높이
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleTemplateSelect = (question) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  return (
    <aside className="w-90 shrink-0 border-l border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm shrink-0">AI 분석</h2>
        <select
          className="text-xs border border-slate-200 rounded-md px-2 py-1 min-w-0"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.hasKey ? '' : ' (키 미설정)'}
            </option>
          ))}
        </select>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-slate-400 hover:text-slate-600 shrink-0"
            title="대화 초기화"
          >
            초기화
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!hasStock ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-sm text-slate-400 text-center">
              종목을 선택하면 AI와 대화할 수 있습니다
            </p>
          </div>
        ) : !hasKey ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">
                {currentModel?.label} API 키가 설정되지 않았습니다
              </p>
              <Link
                to="/settings"
                className="text-xs text-sky-600 hover:text-sky-700 font-medium"
              >
                설정 페이지에서 API 키 입력 →
              </Link>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div>
            <div className="mb-4 p-3 bg-sky-50 rounded-lg">
              <p className="text-xs font-medium text-sky-800">
                {selectedStock?.name} 분석 준비 완료
              </p>
              <p className="text-xs text-sky-600 mt-1">
                재무 데이터가 컨텍스트로 제공됩니다
              </p>
            </div>
            <QuestionTemplates onSelect={handleTemplateSelect} />
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-500 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">·</span>
                    <span className="animate-bounce [animation-delay:0.1s]">
                      ·
                    </span>
                    <span className="animate-bounce [animation-delay:0.2s]">
                      ·
                    </span>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-600 break-words">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-200">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              hasStock ? '질문을 입력하세요...' : '종목을 먼저 선택하세요'
            }
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
            rows={1}
            disabled={!hasStock || !hasKey}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || !hasStock || !hasKey}
            className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? '...' : '전송'}
          </button>
        </div>
      </div>
    </aside>
  );
}
