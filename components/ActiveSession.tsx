import { useState } from 'react';
import { useSessionStore } from '@/stores/session';
import Captures from './Captures';
import Evaluation from './Evaluation';
import Metadata from './Metadata';

const tabs = ['Captures', 'Evaluation', 'Metadata'] as const;
type Tab = (typeof tabs)[number];

export default function ActiveSession() {
  const [activeTab, setActiveTab] = useState<Tab>('Captures');
  const session = useSessionStore((s) => s.session);

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold">{session?.toolName}</h1>
          <p className="text-xs text-gray-500 truncate max-w-60">
            {session?.toolUrl}
          </p>
        </div>
      </header>

      <nav className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`flex-1 px-3 py-2 text-xs font-medium ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'Captures' && <Captures />}
        {activeTab === 'Evaluation' && <Evaluation />}
        {activeTab === 'Metadata' && <Metadata />}
      </main>
    </div>
  );
}
