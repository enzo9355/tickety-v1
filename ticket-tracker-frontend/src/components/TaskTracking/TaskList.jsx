import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, Activity, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

function TaskLogTerminal({ isActive }) {
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    
    // Initial log
    const now = new Date();
    setLogs([{ id: Date.now(), time: now.toLocaleTimeString(), text: "啟動任務監控程序..." }]);

    const interval = setInterval(() => {
      setLogs(prev => {
        const timeStr = new Date().toLocaleTimeString();
        const newLog = { id: Date.now(), time: timeStr, text: "檢查售票狀態... 尚無餘票" };
        const updated = [...prev, newLog];
        if (updated.length > 20) return updated.slice(updated.length - 20);
        return updated;
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isActive) return null;

  return (
    <div style={{ marginTop: '16px', background: '#0a0a0f', borderRadius: '8px', padding: '12px', border: '1px solid rgba(245,239,230,0.08)', maxHeight: '150px', overflowY: 'auto', fontFamily: 'monospace' }}>
      {logs.map((log) => (
        <div key={log.id} style={{ color: '#39FF14', fontSize: '0.8rem', marginBottom: '4px', display: 'flex', gap: '8px' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>[{log.time}]</span>
          <span>{log.text}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export default function TaskList({ tasks, selectedTask, onTaskSelected }) {
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [logExpandedTaskId, setLogExpandedTaskId] = useState(null);

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpandedTaskId(prev => prev === id ? null : id);
  };
  
  const toggleLogs = (e, id) => {
    e.stopPropagation();
    setLogExpandedTaskId(prev => prev === id ? null : id);
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="glass-panel animate-fade-in animate-delay-1" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        目前沒有監控中的任務
      </div>
    );
  }

  return (
    <div className="animate-fade-in animate-delay-1" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', paddingLeft: '8px' }}>
        <Activity size={20} color="var(--color-primary)" />
        執行中任務
      </h3>
      
      {tasks.map((task) => {
        const isActive = selectedTask?.id === task.id;
        const isExpanded = expandedTaskId === task.id;
        const isLogsExpanded = logExpandedTaskId === task.id;
        
        return (
          <div 
            key={task.id} 
            className="glass-panel" 
            onClick={() => onTaskSelected(task)}
            style={{ 
              padding: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              cursor: 'pointer',
              border: isActive ? '1px solid var(--color-primary)' : '1px solid rgba(245, 239, 230, 0.08)',
              background: isActive ? 'rgba(232, 86, 10, 0.05)' : 'rgba(255, 255, 255, 0.03)',
              boxShadow: isActive ? '0 0 15px rgba(232, 86, 10, 0.2)' : '0 4px 30px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ 
                  background: task.status === '監控中' ? 'rgba(232, 86, 10, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
                  color: task.status === '監控中' ? 'var(--color-secondary)' : 'var(--color-success)',
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {task.status === '監控中' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                  {task.status || '監控中'}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  {task.createdAt ? new Date(task.createdAt).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>
              
              <a 
                href={task.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()} 
                style={{ color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}
              >
                {task.url}
              </a>
              
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                <span>✉ {task.email}</span>
                {task.departure && <span>📍 由 {task.departure} 出發</span>}
                
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={(e) => toggleLogs(e, task.id)}
                    className="glass-button"
                    style={{ background: 'transparent', border: '1px solid rgba(245,239,230,0.1)', color: 'var(--color-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 8px', fontSize: '0.8rem', height: 'auto', borderRadius: '6px' }}
                  >
                    <Terminal size={14} /> 日誌
                  </button>
                  <button 
                    onClick={(e) => toggleExpand(e, task.id)}
                    className="glass-button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0', height: 'auto' }}
                  >
                    詳細資訊 {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="animate-fade-in" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(245,239,230,0.08)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <p style={{ margin: '4px 0' }}><strong>建立時間：</strong> {task.createdAt ? new Date(task.createdAt).toLocaleString() : '未知'}</p>
                  <p style={{ margin: '4px 0' }}><strong>出發地：</strong> {task.departure || '未填寫'}</p>
                  <p style={{ margin: '4px 0' }}><strong>預算：</strong> {task.budget ? `$${task.budget}` : '未填寫'}</p>
                  <p style={{ margin: '4px 0' }}><strong>目標場館：</strong> {task.venue || '系統自動解析'}</p>
                </div>
              )}

              {isLogsExpanded && (
                <div className="animate-fade-in">
                  <TaskLogTerminal isActive={task.status === '監控中'} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
