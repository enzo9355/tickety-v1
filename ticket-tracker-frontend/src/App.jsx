import React, { useState, useEffect } from 'react';
import TaskPanel from './components/TaskTracking/TaskPanel';
import RecommendationSection from './components/Recommendations/RecommendationSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Ticket, AlertCircle, X } from 'lucide-react';

function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [error, setError] = useState(null);

  // Auto clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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

      <header style={{ marginBottom: '40px', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '300px', height: '100px', background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)',
          filter: 'blur(20px)', zIndex: 0, pointerEvents: 'none'
        }} />
        <h1 className="animate-fade-in" style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '12px', fontSize: '2.8rem', background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>
          <Ticket size={40} color="#a78bfa" />
          Tickety
        </h1>
        <p className="animate-fade-in animate-delay-1" style={{ position: 'relative', zIndex: 1, color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '1.1rem' }}>
          全自動背景監控票券，智慧推薦周邊住宿與交通
        </p>
      </header>

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
          <div style={{ position: 'sticky', top: '40px' }}>
            <RecommendationSection selectedTask={selectedTask} />
          </div>
        </main>
      </ErrorBoundary>
      
    </div>
  );
}

export default App;
