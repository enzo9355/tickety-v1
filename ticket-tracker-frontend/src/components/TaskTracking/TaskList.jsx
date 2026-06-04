import React, { useState, useEffect, useRef } from 'react';

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
        const newLog = { id: Date.now(), time: timeStr, text: "持續在背景分析網頁內容與售票狀態..." };
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
    <div className="mt-3 bg-surface-container-highest/50 rounded p-2 font-mono text-xs text-on-surface-variant h-20 overflow-hidden overflow-y-auto">
      {logs.map((log) => (
        <div key={log.id} className="mb-1 flex gap-2">
          <span className="opacity-70">[{log.time}]</span>
          <span className="text-primary">{log.text}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export default function TaskList({ tasks, selectedTask, onTaskSelected }) {
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [logExpandedTaskId, setLogExpandedTaskId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpandedTaskId(prev => prev === id ? null : id);
  };
  
  const toggleLogs = (e, id) => {
    e.stopPropagation();
    setLogExpandedTaskId(prev => prev === id ? null : id);
  };

  const detectPlatform = (url) => {
    if (!url) return '其他';
    const lower = url.toLowerCase();
    if (lower.includes('tixcraft')) return '拓元';
    if (lower.includes('kktix')) return 'KKTIX';
    if (lower.includes('ticketplus')) return 'TicketPlus';
    return '其他';
  };

  const platforms = [...new Set(tasks.map(t => detectPlatform(t.url)))];

  const filteredTasks = tasks.filter(task => {
    const matchStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchPlatform = platformFilter === 'all' || detectPlatform(task.url) === platformFilter;
    return matchStatus && matchPlatform;
  });

  if (!tasks || tasks.length === 0) {
    return (
      <div className="glass-card rounded-xl p-lg text-center text-on-surface-variant animate-fade-in animate-delay-1">
        目前沒有監控中的任務
      </div>
    );
  }

  return (
    <div className="animate-fade-in animate-delay-1 flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-xl pl-2 m-0 text-on-surface">
        <span className="material-symbols-outlined text-primary text-[24px]">monitoring</span>
        執行中任務
        <span className="text-sm text-on-surface-variant font-normal">({filteredTasks.length}/{tasks.length})</span>
      </h3>
      
      <div className="flex gap-2 pl-2 flex-nowrap overflow-x-auto touch-pan-x md:flex-wrap md:overflow-visible">
        {['all', '監控中', '已發現'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`
              px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 border whitespace-nowrap
              ${statusFilter === status 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-surface-variant bg-surface text-on-surface-variant hover:bg-surface-container'}
            `}
          >
            {status === 'all' ? '全部狀態' : status}
          </button>
        ))}

        <div className="w-[1px] bg-surface-variant mx-1" />

        {platforms.map(platform => {
          const isActive = platformFilter === platform;
          return (
            <button
              key={platform}
              onClick={() => setPlatformFilter(prev => prev === platform ? 'all' : platform)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 border whitespace-nowrap
                ${isActive 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-surface-variant bg-surface text-on-surface-variant hover:bg-surface-container'}
              `}
            >
              {platform}
            </button>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {filteredTasks.map((task) => {
          const isActive = selectedTask?.id === task.id;
          const isLogsExpanded = logExpandedTaskId === task.id;
          
          const imageUrl = `https://images.unsplash.com/photo-1540039155732-d6824b2f155c?w=400&q=80`;
          
          return (
            <div 
              key={task.id} 
              className={`
                glass-card rounded-xl p-md flex flex-col cursor-pointer transition-all duration-300 gap-3
                ${isActive ? 'border-primary bg-primary/5 shadow-[0_8px_30px_rgba(var(--color-primary-rgb),0.15)] -translate-y-1' : 'border-black/5 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'}
              `}
              onClick={() => onTaskSelected(task)}
            >
              {/* Image Header */}
              <div 
                className="relative bg-cover bg-center rounded-lg overflow-hidden h-[100px] md:h-[120px]"
                style={{ backgroundImage: `url(${imageUrl})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white/60" />
                <div className="absolute top-2 right-2">
                  <span className={`
                    text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm
                    ${task.status === '監控中' ? 'bg-secondary' : 'bg-primary'}
                  `}>
                    {task.status === '監控中' ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse-green"></div>
                        <span>監控中</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>{task.status || '已發現'}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex flex-col gap-2 flex-1">
                <div className="text-on-surface-variant text-xs">
                  建立於 {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                </div>
                
                <h4 className="m-0 text-lg font-semibold text-on-surface whitespace-nowrap overflow-hidden text-ellipsis">
                  {task.venue || '未指定場館活動'}
                </h4>
                
                <p className="m-0 text-sm text-on-surface-variant whitespace-nowrap overflow-hidden text-ellipsis">
                  {task.url}
                </p>
                
                <div className="flex gap-2 flex-wrap mt-1">
                  {task.departure && <span className="text-xs px-2 py-1 bg-surface-container-low rounded text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> {task.departure}</span>}
                  {task.budget && <span className="text-xs px-2 py-1 bg-surface-container-low rounded text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">attach_money</span> {task.budget}</span>}
                </div>

                <div className="mt-auto pt-3 flex gap-2">
                  <button 
                    onClick={(e) => toggleLogs(e, task.id)}
                    className="glass-button flex-1 p-2 text-sm bg-surface-container-low text-on-surface shadow-none hover:bg-surface-container flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">terminal</span> 狀態日誌
                  </button>
                  <a 
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="glass-button flex-1 p-2 text-sm text-center no-underline bg-primary text-white border-none hover:opacity-90"
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
