import { useState } from 'react';
import LeftPanel from '../components/layout/LeftPanel';
import CenterPanel from '../components/layout/CenterPanel';
import RightPanel from '../components/layout/RightPanel';

export default function MainPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-3 left-3 z-30 md:hidden bg-white border border-slate-200 rounded-lg p-2 shadow-sm"
      >
        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* LEFT PANEL */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transform transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <LeftPanel />
      </div>

      {/* CENTER PANEL */}
      <CenterPanel />

      {/* RIGHT PANEL - 데스크톱만 */}
      <div className="hidden lg:block">
        <RightPanel />
      </div>
    </div>
  );
}
