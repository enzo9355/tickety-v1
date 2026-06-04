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

      <header className="bg-surface/90 backdrop-blur-xl docked full-width top-0 z-50 shadow-sm flex justify-between items-center w-full px-gutter py-md max-w-container-max mx-auto border-b border-white/50 sticky">
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

      <main className="max-w-container-max mx-auto px-gutter py-lg flex flex-col gap-md">
        
        {/* Hero Section */}
        <div className="glass-card animate-fade-in animate-delay-1 max-w-[800px] mx-auto w-full flex flex-col gap-4 relative z-10 p-6 lg:p-8 rounded-[24px] mb-4 border border-white/40 shadow-sm bg-white/40">
          <div className="text-center mb-2">
            <p className="text-text-muted mt-2 text-base lg:text-lg">
              全自動背景監控票券，智慧推薦周邊住宿與交通
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
            <div className="flex items-center px-4 text-gray-400">
              <span className="material-symbols-outlined text-2xl">search</span>
            </div>
            <input 
              type="url"
              placeholder="貼上拓元、KKTIX 等售票連結，立即開啟智能監控..."
              value={heroSearchUrl}
              onChange={e => setHeroSearchUrl(e.target.value)}
              className="flex-1 bg-transparent border-none text-gray-900 text-base lg:text-lg outline-none py-3 lg:py-4 w-full"
            />
            <button 
              className="bg-primary text-white border-none px-8 py-3 lg:py-0 text-base lg:text-lg rounded-xl whitespace-nowrap cursor-pointer hover:bg-[#E8560A] transition-colors font-medium mt-2 lg:mt-0"
              onClick={() => {
                document.getElementById('task-input-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              開始追蹤
            </button>
          </div>
          
          <div className="flex justify-center gap-3 flex-nowrap lg:flex-wrap overflow-x-auto lg:overflow-x-visible whitespace-nowrap lg:whitespace-normal pb-2 lg:pb-0 scrollbar-hide">
            <span className="text-text-muted text-sm flex items-center shrink-0">熱門監控標籤：</span>
            {['#五月天', '#Blackpink', '#周杰倫', '#宇多田光'].map(tag => (
              <button 
                key={tag}
                onClick={() => {
                  setHeroSearchUrl(`https://tixcraft.com/activity/detail/${tag.replace('#', '')}`);
                  document.getElementById('task-input-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 text-secondary text-sm cursor-pointer hover:bg-gray-200 transition-colors shrink-0"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* System Status Bar */}
        <div className="animate-fade-in flex justify-center gap-4 mb-4 flex-wrap">
          <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-2 border border-white/50 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${serverStatus === '良好' ? 'bg-success' : 'bg-danger'}`}></span>
            <span className="text-text-muted text-sm">伺服器狀態</span>
            <strong className="text-gray-900">{serverStatus}</strong>
          </div>
          <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-2 border border-white/50 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
            <span className="material-symbols-outlined text-secondary text-[20px]">search</span>
            <span className="text-text-muted text-sm">監控中任務數</span>
            <strong className="text-gray-900">{tasks.filter(t => t.status === '監控中').length}</strong>
          </div>
          <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-2 border border-white/50 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
            <span className="material-symbols-outlined text-accent text-[20px]">local_activity</span>
            <span className="text-text-muted text-sm">近期演唱會場數</span>
            <strong className="text-gray-900">{concerts.length}</strong>
          </div>
        </div>

        <ErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Left Column: Task Panel */}
            <div className={`lg:col-span-8 flex-col gap-lg ${activePanel === 'tasks' ? 'flex' : 'hidden lg:flex'}`}>
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
            <div className={`lg:col-span-4 flex-col gap-gutter ${activePanel === 'recommendations' ? 'flex' : 'hidden lg:flex'}`}>
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
