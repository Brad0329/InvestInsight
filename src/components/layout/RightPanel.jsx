export default function RightPanel() {
  return (
    <aside className="w-90 shrink-0 border-l border-slate-200 bg-white flex flex-col">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-semibold text-sm">AI 분석 채팅</h2>
        <select className="text-xs border border-slate-200 rounded-md px-2 py-1">
          <option>Claude</option>
          <option>GPT-4o</option>
          <option>DeepSeek</option>
          <option>Gemini</option>
        </select>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-400 p-4">
        <p className="text-sm text-center">종목을 선택하면 AI와 대화할 수 있습니다</p>
      </div>
      <div className="p-3 border-t border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="질문을 입력하세요..."
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            disabled
          />
          <button
            className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
            disabled
          >
            전송
          </button>
        </div>
      </div>
    </aside>
  );
}
