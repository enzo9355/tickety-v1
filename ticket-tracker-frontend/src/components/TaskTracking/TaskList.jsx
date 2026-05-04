import React from 'react';
import { Clock, CheckCircle2, Activity } from 'lucide-react';

export default function TaskList({ tasks, selectedTask, onTaskSelected }) {
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
        
        return (
          <div 
            key={task.id} 
            className="glass-panel" 
            onClick={() => onTaskSelected(task)}
            style={{ 
              padding: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer',
              border: isActive ? '1px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: isActive ? 'rgba(176, 38, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)',
              boxShadow: isActive ? '0 0 15px rgba(176, 38, 255, 0.2)' : '0 4px 30px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
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
              
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'flex', gap: '16px' }}>
                <span>✉ {task.email}</span>
                {task.departure && <span>📍 由 {task.departure} 出發</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
