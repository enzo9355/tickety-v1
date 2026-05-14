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
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', paddingLeft: '8px', marginBottom: '8px' }}>
        <Activity size={24} color="var(--color-primary)" />
        執行中任務
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '24px' 
      }}>
        {tasks.map((task) => {
          const isActive = selectedTask?.id === task.id;
          const isExpanded = expandedTaskId === task.id;
          const isLogsExpanded = logExpandedTaskId === task.id;
          
          // Generate a deterministic image based on venue or URL length
          const imgId = (task.id || 1) % 10 + 10;
          const imageUrl = `https://images.unsplash.com/photo-1540039155732-d6824b2f155c?w=400&q=80`; // Generic concert
          
          return (
            <div 
              key={task.id} 
              className="glass-panel" 
              onClick={() => onTaskSelected(task)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                overflow: 'hidden',
                border: isActive ? '1px solid var(--color-primary)' : '1px solid rgba(0, 0, 0, 0.05)',
                background: isActive ? 'rgba(255, 91, 0, 0.05)' : '#FFFFFF',
                boxShadow: isActive ? '0 8px 30px rgba(255, 91, 0, 0.15)' : '0 4px 30px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'translateY(-4px)' : 'none'
              }}
            >
              {/* Image Header */}
              <div style={{ 
                height: '140px', 
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(30,20,16,0.9))'
                }} />
                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  <span style={{ 
                    background: task.status === '監控中' ? 'var(--color-secondary)' : 'var(--color-primary)', 
                    color: 'white',
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                  }}>
                    {task.status === '監控中' ? <Clock size={14} /> : <CheckCircle2 size={14} />}
                    {task.status || '監控中'}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  建立於 {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                </div>
                
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.venue || '未指定場館活動'}
                </h4>
                
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.url}
                </p>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {task.departure && <span style={{ fontSize: '0.8rem', padding: '4px 8px', background: '#F8F9FA', borderRadius: '4px', color: 'var(--color-text-muted)' }}>📍 {task.departure}</span>}
                  {task.budget && <span style={{ fontSize: '0.8rem', padding: '4px 8px', background: '#F8F9FA', borderRadius: '4px', color: 'var(--color-text-muted)' }}>💰 ${task.budget}</span>}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={(e) => toggleLogs(e, task.id)}
                    className="glass-button"
                    style={{ flex: 1, padding: '8px', fontSize: '0.9rem', background: '#F8F9FA', color: 'var(--color-text)', boxShadow: 'none' }}
                  >
                    <Terminal size={16} /> 狀態日誌
                  </button>
                  <a 
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="glass-button"
                    style={{ flex: 1, padding: '8px', fontSize: '0.9rem', textAlign: 'center', textDecoration: 'none', background: 'var(--color-primary)', color: 'white', border: 'none' }}
                  >
                    快速查看
                  </a>
                </div>

                {isLogsExpanded && (
                  <div className="animate-fade-in" onClick={e => e.stopPropagation()}>
                    <TaskLogTerminal isActive={task.status === '監控中'} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
