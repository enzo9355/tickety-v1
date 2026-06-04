import React from 'react';

export default function MobileTabBar({ activeTab, onTabChange, isMobile }) {
  if (!isMobile) return null;

  const tabs = [
    { id: 'tasks', icon: 'ads_click', label: '我的任務' },
    { id: 'recommendations', icon: 'lightbulb', label: '推薦資訊' }
  ];

  return (
    <div className="lg:hidden fixed bottom-6 left-4 right-4 flex justify-around items-center h-16 bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-full z-50">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center justify-center gap-1 border-none cursor-pointer ${
            activeTab === tab.id
              ? 'bg-primary-container/20 text-primary rounded-full px-6 py-2 scale-110 transition-all'
              : 'text-on-surface-variant px-6 py-2 hover:bg-primary/5 transition-colors rounded-full'
          }`}
        >
          <span className="material-symbols-outlined text-2xl leading-none">{tab.icon}</span>
          <span className={`text-xs leading-none ${activeTab === tab.id ? 'font-semibold' : 'font-normal'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
