import { useAppState } from '../../context/AppContext';
import TabBar from '../common/TabBar';
import FinancialTabContent from '../financial/FinancialTabContent';
import ValueChainTabContent from '../valuechain/ValueChainTabContent';
import NewsTabContent from '../news/NewsTabContent';
import IrTabContent from '../news/IrTabContent';

const TABS = [
  { id: 'valuechain', label: '밸류체인' },
  { id: 'financial', label: '재무' },
  { id: 'news', label: '뉴스' },
  { id: 'ir', label: 'IR' },
];

export default function CenterPanel() {
  const { activeTab, setActiveTab } = useAppState();

  return (
    <main className="flex-1 flex flex-col overflow-hidden min-w-0">
      <TabBar tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />

      {activeTab === 'financial' && <FinancialTabContent />}
      {activeTab === 'valuechain' && <ValueChainTabContent />}
      {activeTab === 'news' && <NewsTabContent />}
      {activeTab === 'ir' && <IrTabContent />}
    </main>
  );
}
