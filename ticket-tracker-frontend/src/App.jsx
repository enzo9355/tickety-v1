import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskPanel from './components/TaskTracking/TaskPanel';
import RecommendationSection from './components/Recommendations/RecommendationSection';
import CreditCardDeals from './components/Recommendations/CreditCardDeals';
import VenueFacilities from './components/Recommendations/VenueFacilities';
import TicketHistory from './components/TaskTracking/TicketHistory';
import ConcertSection from './components/Recommendations/ConcertSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import apiClient from './api/client';
import MobileTabBar from './components/Layout/MobileTabBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginModal from './components/Auth/LoginModal';

function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('檢查中...');
  const [concerts, setConcerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [visibleToasts, setVisibleToasts] = useState([]);
  const [heroSearchUrl, setHeroSearchUrl] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, isAuthenticated, verifyToken, loading: authLoading } = useAuth();
  const [activePanel, setActivePanel] = useState('tasks');

  // Handle magic link verification from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      verifyToken(token).then(result => {
        if (result.success) {
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          setError(result.error);
        }
      });
    }
  }, []);

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
    <div className="relative pb-20 lg:pb-0 min-h-screen">
      
      {/* Global Error Toast */}
      {error && (
        <div className="fixed top-6 left-4 right-4 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 z-[1000] bg-red-500/15 border border-red-500/40 py-4 px-6 flex items-center gap-3 w-[calc(100%-32px)] lg:w-auto lg:min-w-[320px] shadow-[0_8px_32px_rgba(255,0,0,0.2)] rounded-2xl backdrop-blur-md animate-fade-in">
          <span className="material-symbols-outlined text-danger text-2xl">error</span>
          <span className="flex-1 text-gray-900 text-[0.95rem]">{error}</span>
          <button onClick={() => setError(null)} className="bg-transparent text-text-muted opacity-60 border-none cursor-pointer hover:opacity-100 transition-opacity p-0 flex">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}

      {/* Ticket Notifications */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 left-4 lg:left-auto z-[1000] flex flex-col gap-3">
        <AnimatePresence>
          {visibleToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass-panel w-full lg:w-[350px] p-5 bg-white/95 border border-gray-200 shadow-[0_8px_32px_rgba(232,86,10,0.3)] flex flex-col gap-3 rounded-2xl"
            >
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-full p-1.5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-base">notifications</span>
                </div>
                <strong className="text-gray-900 flex-1">發現釋票！</strong>
                <button 
                  onClick={() => setVisibleToasts(current => current.filter(t => t.id !== toast.id))}
                  className="bg-transparent border-none text-text-muted cursor-pointer hover:text-gray-800 transition-colors p-0 flex"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <div className="text-text-muted text-sm flex flex-col gap-1">
                <p className="m-0"><strong>活動：</strong> {toast.title}</p>
                <p className="m-0"><strong>時間：</strong> {toast.time}</p>
              </div>
              <a 
                href={toast.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass-button no-underline text-[0.95rem] p-2.5 flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-xl font-medium hover:bg-primary/20 transition-colors"
              >
                直達購票連結 <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="bg-white/90 backdrop-blur-xl top-0 z-50 shadow-sm flex justify-between items-center w-full px-6 py-3 border-b border-white/50 sticky">
        <h1 className="animate-fade-in m-0 relative z-10 inline-flex items-center gap-3 text-2xl lg:text-4xl font-bold">
          <span className="material-symbols-outlined text-[32px] lg:text-[40px] text-primary">local_activity</span>
          <span className="text-gradient">Tickety</span>
        </h1>
        <div className="relative z-10">
          <button
            onClick={() => setShowLoginModal(true)}
            className={`flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-full cursor-pointer text-sm font-medium transition-all backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.06)] border ${
              isAuthenticated 
                ? 'bg-[#FF5B00]/10 border-primary text-primary' 
                : 'bg-white/90 border-gray-200 text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-base">person</span>
            {isAuthenticated ? (
              <span className="hidden lg:inline">{user?.email?.split('@')[0]}</span>
            ) : (
              <>
                <span className="lg:hidden">登入</span>
                <span className="hidden lg:inline">登入帳號</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-container-max mx-auto px-gutter pt-md pb-lg flex flex-col gap-sm">
        
        {/* Hero Section - compact */}
        <div className="glass-card animate-fade-in animate-delay-1 w-full flex flex-col gap-3 relative z-10 p-4 lg:p-5 rounded-2xl mb-2 border border-white/40 shadow-sm bg-white/40">
          <div className="flex flex-col lg:flex-row bg-white/60 backdrop-blur-xl rounded-xl border border-white/60 p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="flex items-center px-3 text-gray-400">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input 
              type="url"
              placeholder="貼上拓元、KKTIX 等售票連結，立即開啟智能監控..."
              value={heroSearchUrl}
              onChange={e => setHeroSearchUrl(e.target.value)}
              className="flex-1 bg-transparent border-none text-gray-900 text-sm lg:text-base outline-none py-2.5 lg:py-3 w-full"
            />
            <button 
              className="bg-primary-container text-white border-none px-6 py-2.5 text-sm lg:text-base rounded-xl whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity font-medium mt-1.5 lg:mt-0"
              onClick={() => {
                document.getElementById('task-input-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              開始追蹤
            </button>
          </div>
          
          <div className="flex gap-2 flex-nowrap lg:flex-wrap overflow-x-auto lg:overflow-x-visible whitespace-nowrap lg:whitespace-normal no-scrollbar">
            <span className="text-on-surface-variant text-xs flex items-center shrink-0">熱門監控標籤：</span>
            {['#五月天', '#Blackpink', '#周杰倫', '#宇多田光'].map(tag => (
              <button 
                key={tag}
                onClick={() => {
                  setHeroSearchUrl(`https://tixcraft.com/activity/detail/${tag.replace('#', '')}`);
                  document.getElementById('task-input-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-primary-fixed/30 text-primary-container font-label-sm text-label-sm px-4 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-primary-fixed/50 transition-colors shrink-0 border border-primary-fixed/20"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* System Status Bar - compact inline */}
        <div className="animate-fade-in flex gap-2 mb-2 flex-wrap">
          <div className="bg-white/75 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-1.5 border border-white/50 shadow-sm text-xs">
            <span className={`inline-block w-2 h-2 rounded-full ${serverStatus === '良好' ? 'bg-tertiary' : 'bg-error'}`}></span>
            <span className="text-on-surface-variant">伺服器</span>
            <strong className="text-on-surface">{serverStatus}</strong>
          </div>
          <div className="bg-white/75 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-1.5 border border-white/50 shadow-sm text-xs">
            <span className="material-symbols-outlined text-secondary-container text-[16px]">search</span>
            <span className="text-on-surface-variant">監控中任務</span>
            <strong className="text-on-surface">{tasks.filter(t => t.status === '監控中').length}</strong>
          </div>
          <div className="bg-white/75 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-1.5 border border-white/50 shadow-sm text-xs">
            <span className="material-symbols-outlined text-primary text-[16px]">local_activity</span>
            <span className="text-on-surface-variant">近期演唱會</span>
            <strong className="text-on-surface">{concerts.length} 場</strong>
          </div>
        </div>

          <ErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Left Column: Task Panel */}
            <div className={`lg:col-span-8 flex-col gap-md ${activePanel === 'tasks' ? 'flex' : 'hidden lg:flex'}`}>
              <TaskPanel 
                tasks={tasks}
                selectedTask={selectedTask}
                onTaskAdded={handleTaskAdded}
                onTaskSelected={handleTaskSelected}
                onError={setError}
                initialUrl={heroSearchUrl}
              />
            </div>

            {/* Right Column: Recommendations */}
            <div className={`lg:col-span-4 flex-col gap-md ${activePanel === 'recommendations' ? 'flex' : 'hidden lg:flex'}`}>
              {selectedTask && (
                <TicketHistory taskId={selectedTask.id} taskStatus={selectedTask.status} />
              )}
              <RecommendationSection selectedTask={selectedTask} />
              <VenueFacilities selectedTask={selectedTask} />
              <CreditCardDeals selectedTask={selectedTask} />
              <ConcertSection concerts={concerts} />
            </div>
          </div>
          </ErrorBoundary>

      </main>

      <MobileTabBar 
        activeTab={activePanel} 
        onTabChange={setActivePanel} 
      />

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      
    </div>
  );
}

// Wrapper that provides AuthContext
function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithAuth;
