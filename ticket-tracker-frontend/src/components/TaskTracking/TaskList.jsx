import React, { useState } from 'react';
import { Clock, CheckCircle2, Activity, ChevronDown, ChevronUp } from 'lucide-react';

export default function TaskList({ tasks, selectedTask, onTaskSelected }) {
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpandedTaskId(prev => prev === id ? null : id);
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
              border: isActive ? '1px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: isActive ? 'rgba(176, 38, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)',
              boxShadow: isActive ? '0 0 15px rgba(176, 38, 255, 0.2)' : '0 4px 30px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ 
                  background: task.status === '監控中' ? 'rgba(176, 38, 255, 0.2)' : 'rgba(0, 255, 170, 0.2)', 
                  color: task.status === '監控中' ? 'var(--color-primary-hover)' : 'var(--color-success)',
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
              
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span>✉ {task.email}</span>
                {task.departure && <span>📍 由 {task.departure} 出發</span>}
                
                <button 
                  onClick={(e) => toggleExpand(e, task.id)}
                  className="glass-button"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0', height: 'auto', marginLeft: 'auto' }}
                >
                  詳細資訊 {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {isExpanded && (
                <div className="animate-fade-in" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <p style={{ margin: '4px 0' }}><strong>建立時間：</strong> {task.createdAt ? new Date(task.createdAt).toLocaleString() : '未知'}</p>
                  <p style={{ margin: '4px 0' }}><strong>出發地：</strong> {task.departure || '未填寫'}</p>
                  <p style={{ margin: '4px 0' }}><strong>預算：</strong> {task.budget ? `$${task.budget}` : '未填寫'}</p>
                  <p style={{ margin: '4px 0' }}><strong>目標場館：</strong> {task.venue || '系統自動解析'}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
