import { useAppState } from '../../context/AppContext';
import TabBar from '../common/TabBar';
import FinancialTabContent from '../financial/FinancialTabContent';
import ValueChainTabContent from '../valuechain/ValueChainTabContent';

const TABS = [
  { id: 'valuechain', label: '밸류체인' },
  { id: 'financial', label: '재무' },
  { id: 'news', label: '뉴스' },
  { id: 'ir', label: 'IR' },
];

function Placeholder({ label }) {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
      <div className="text-center">
        <p className="text-lg font-medium">{label}</p>
        <p className="text-sm mt-1">이후 Phase에서 구현 예정</p>
      </div>
    </div>
  );
}

export default function CenterPanel() {
  const { activeTab, setActiveTab } = useAppState();

  return (
    <main className="flex-1 flex flex-col overflow-hidden min-w-0">
      <TabBar tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />

      {activeTab === 'financial' && <FinancialTabContent />}
      {activeTab === 'valuechain' && <ValueChainTabContent />}
      {activeTab === 'news' && <Placeholder label="뉴스" />}
      {activeTab === 'ir' && <Placeholder label="IR 자료" />}
    </main>
  );
}
