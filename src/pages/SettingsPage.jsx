import { Link } from 'react-router-dom';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">설정</h1>
          <p className="text-xs text-slate-500 mt-0.5">API 키 및 기본 설정을 관리합니다</p>
        </div>
        <Link to="/" className="text-sm text-sky-600 hover:text-sky-700 font-medium">
          메인으로 돌아가기
        </Link>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        <p className="text-slate-400 text-center py-20">Phase 6에서 구현 예정</p>
      </main>
    </div>
  );
}
