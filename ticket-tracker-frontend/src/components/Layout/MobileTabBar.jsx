import React from 'react';

export default function MobileTabBar({ activeTab, onTabChange, isMobile }) {
  if (!isMobile) return null;

  const tabs = [
    { id: 'tasks', icon: '🎯', label: '我的任務' },
    { id: 'recommendations', icon: '💡', label: '推薦資訊' }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '60px',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid #E9ECEF',
      display: 'flex',
      alignItems: 'center',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            height: '100%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === tab.id ? 'var(--color-primary, #FF5B00)' : '#9CA3AF',
            transition: 'color 0.2s ease',
            padding: 0
          }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{tab.icon}</span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: activeTab === tab.id ? 600 : 400,
            lineHeight: 1
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
