import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskPanel from './components/TaskTracking/TaskPanel';
import RecommendationSection from './components/Recommendations/RecommendationSection';
import ConcertSection from './components/Recommendations/ConcertSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Ticket, AlertCircle, X, Bell, ExternalLink } from 'lucide-react';
import apiClient from './api/client';

function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('檢查中...');
  const [concerts, setConcerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [visibleToasts, setVisibleToasts] = useState([]);

  // Auto clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    // Check server health
    apiClient.get('/health')
      .then(res => setServerStatus(res.data.status === 'ok' ? '良好' : '異常'))
      .catch(() => setServerStatus('離線'));

    // Fetch concerts
    apiClient.get('/api/concerts')
      .then(res => setConcerts(res.data || []))
      .catch(() => setConcerts([]));
      
    // Poll notifications every 10 seconds
    const pollInterval = setInterval(() => {
      apiClient.get('/api/notifications')
        .then(res => {
          const newNotifs = res.data || [];
          setNotifications(prev => {
            const prevIds = new Set(prev.map(n => n.id));
            const actuallyNew = newNotifs.filter(n => !prevIds.has(n.id));
            if (actuallyNew.length > 0) {
              setVisibleToasts(current => [...current, ...actuallyNew]);
            }
            return newNotifs;
          });
        })
        .catch(console.error);
    }, 10000);
    
    return () => clearInterval(pollInterval);
  }, []);

  const handleTaskAdded = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
    setSelectedTask(newTask); // Auto select the new task
  };

  const handleTaskSelected = (task) => {
    setSelectedTask(task);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', position: 'relative' }}>
      
      {/* Global Error Toast */}
      {error && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: 'rgba(255, 68, 68, 0.15)', border: '1px solid rgba(255, 68, 68, 0.4)',
          padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '320px',
          boxShadow: '0 8px 32px rgba(255, 0, 0, 0.2)'
        }}>
          <AlertCircle color="var(--color-danger)" size={24} />
          <span style={{ flex: 1, color: '#fff', fontSize: '0.95rem' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', color: '#fff', opacity: 0.6 }}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Ticket Notifications */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <AnimatePresence>
          {visibleToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass-panel"
              style={{
                width: '350px',
                padding: '20px',
                background: 'rgba(42,28,20,0.95)',
                border: '1px solid var(--color-primary)',
                boxShadow: '0 8px 32px rgba(232, 86, 10, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'var(--color-primary)', borderRadius: '50%', padding: '6px' }}>
                  <Bell size={16} color="white" />
                </div>
                <strong style={{ color: 'white', flex: 1 }}>發現釋票！</strong>
                <button 
                  onClick={() => setVisibleToasts(current => current.filter(t => t.id !== toast.id))}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ margin: 0 }}><strong>活動：</strong> {toast.title}</p>
                <p style={{ margin: 0 }}><strong>時間：</strong> {toast.time}</p>
              </div>
              <a 
                href={toast.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass-button"
                style={{ textDecoration: 'none', fontSize: '0.95rem', padding: '10px' }}
              >
                直達購票連結 <ExternalLink size={16} />
              </a>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header style={{ marginBottom: '32px', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '300px', height: '100px', background: 'radial-gradient(circle, rgba(232,86,10,0.15) 0%, rgba(242,169,59,0) 70%)',
          filter: 'blur(20px)', zIndex: 0, pointerEvents: 'none'
        }} />
        <h1 className="animate-fade-in" style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '12px', fontSize: '2.8rem', fontWeight: 700 }}>
          <Ticket size={40} color="var(--color-primary)" />
          <span className="text-gradient">Tickety</span>
        </h1>
        <p className="animate-fade-in animate-delay-1" style={{ position: 'relative', zIndex: 1, color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '1.1rem' }}>
          全自動背景監控票券，智慧推薦周邊住宿與交通
        </p>
      </header>

      {/* System Status Bar */}
      <div className="animate-fade-in" style={{ 
        display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px', flexWrap: 'wrap'
      }}>
        <div style={{ background: 'rgba(42,28,20,0.8)', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(245,239,230,0.08)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: serverStatus === '良好' ? 'var(--color-success)' : 'var(--color-danger)' }}></span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>伺服器狀態</span>
          <strong style={{ color: 'white' }}>{serverStatus}</strong>
        </div>
        <div style={{ background: 'rgba(42,28,20,0.8)', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(245,239,230,0.08)' }}>
          <span style={{ color: 'var(--color-secondary)' }}>🔍</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>監控中任務數</span>
          <strong style={{ color: 'white' }}>{tasks.filter(t => t.status === '監控中').length}</strong>
        </div>
        <div style={{ background: 'rgba(42,28,20,0.8)', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(245,239,230,0.08)' }}>
          <span style={{ color: 'var(--color-accent)' }}>🎫</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>近期演唱會場數</span>
          <strong style={{ color: 'white' }}>{concerts.length}</strong>
        </div>
      </div>

      <ErrorBoundary>
        <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
          {/* Left Column: Task Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <TaskPanel 
              tasks={tasks}
              selectedTask={selectedTask}
              onTaskAdded={handleTaskAdded}
              onTaskSelected={handleTaskSelected}
              onError={setError}
            />
          </div>

          {/* Right Column: Recommendations */}
          <div style={{ position: 'sticky', top: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <RecommendationSection selectedTask={selectedTask} />
            <ConcertSection concerts={concerts} />
          </div>
        </main>
      </ErrorBoundary>
      
    </div>
  );
}

export default App;
