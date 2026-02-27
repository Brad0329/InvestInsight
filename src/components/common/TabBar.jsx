export default function TabBar({ tabs, activeTab, onSelect }) {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-3 flex items-center gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === tab.id
              ? 'bg-sky-50 text-sky-700'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
