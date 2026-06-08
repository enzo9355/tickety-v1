import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import ShareModal from './ShareModal';

function TaskLogTerminal({ isActive }) {
  const [logs, setLogs] = useState([]);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    if (!isActive) return;
    const now = new Date();
    setLogs([{ id: Date.now(), time: now.toLocaleTimeString(), text: '啟動任務監控程序...' }]);
    const interval = setInterval(() => {
      setLogs(prev => {
        const t = new Date().toLocaleTimeString();
        const updated = [...prev, { id: Date.now(), time: t, text: '持續在背景分析網頁內容與售票狀態...' }];
        return updated.length > 20 ? updated.slice(-20) : updated;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [isActive]);

  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
  if (!isActive) return null;

  return (
    <div className="mt-3 bg-surface-container-highest/50 rounded p-2 font-mono text-xs text-on-surface-variant h-20 overflow-y-auto">
      {logs.map(log => (
        <div key={log.id} className="mb-1 flex gap-2">
          <span className="opacity-70">[{log.time}]</span>
          <span className="text-primary">{log.text}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// Feature 3: extended platform detection
function detectPlatform(url) {
  if (!url) return '其他';
  const l = url.toLowerCase();
  if (l.includes('tixcraft'))     return '拓元';
  if (l.includes('kktix'))        return 'KKTIX';
  if (l.includes('ticketplus'))   return 'TicketPlus';
  if (l.includes('ibon'))         return 'ibon';
  if (l.includes('ticket.com.tw')) return '年代';
  if (l.includes('kham'))         return '寬宏';
  if (l.includes('books.com.tw')) return '博客來';
  if (l.includes('ticketmaster')) return 'Ticketmaster';
  return '其他';
}

const PLATFORM_COLORS = {
  '拓元': 'bg-blue-100 text-blue-700',
  'KKTIX': 'bg-red-100 text-red-700',
  'ibon': 'bg-green-100 text-green-700',
  '年代': 'bg-purple-100 text-purple-700',
  '寬宏': 'bg-orange-100 text-orange-700',
  'TicketPlus': 'bg-sky-100 text-sky-700',
  '博客來': 'bg-yellow-100 text-yellow-700',
  'Ticketmaster': 'bg-pink-100 text-pink-700',
  '其他': 'bg-gray-100 text-gray-500',
};

export default function TaskList({ tasks, selectedTask, onTaskSelected }) {
  const [logExpandedId, setLogExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [shareTask, setShareTask] = useState(null); // Feature 6: task to share

  const toggleLog = (e, id) => { e.stopPropagation(); setLogExpandedId(prev => prev === id ? null : id); };

  const platforms = [...new Set(tasks.map(t => detectPlatform(t.url)))];

  const filtered = tasks.filter(t => {
    const ms = statusFilter === 'all' || t.status === statusFilter;
    const mp = platformFilter === 'all' || detectPlatform(t.url) === platformFilter;
    return ms && mp;
  });

  if (!tasks || tasks.length === 0) {
    return (
      <div className="glass-card rounded-xl p-lg text-center text-on-surface-variant animate-fade-in animate-delay-1">
        目前沒有監控中的任務
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in animate-delay-1 flex flex-col gap-4">
        <h3 className="flex items-center gap-2 text-xl pl-2 m-0 text-on-surface">
          <span className="material-symbols-outlined text-primary text-[24px]">monitoring</span>
          執行中任務
          <span className="text-sm text-on-surface-variant font-normal">({filtered.length}/{tasks.length})</span>
        </h3>

        {/* Filters */}
        <div className="flex gap-2 pl-2 flex-nowrap overflow-x-auto touch-pan-x md:flex-wrap md:overflow-visible">
          {['all', '監控中', '已通知'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border whitespace-nowrap ${statusFilter === s ? 'border-primary bg-primary/10 text-primary' : 'border-surface-variant bg-surface text-on-surface-variant hover:bg-surface-container'}`}>
              {s === 'all' ? '全部狀態' : s}
            </button>
          ))}
          <div className="w-[1px] bg-surface-variant mx-1" />
          {platforms.map(p => (
            <button key={p} onClick={() => setPlatformFilter(prev => prev === p ? 'all' : p)}
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border whitespace-nowrap ${platformFilter === p ? 'border-primary bg-primary/10 text-primary' : 'border-surface-variant bg-surface text-on-surface-variant hover:bg-surface-container'}`}>
              {p}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {filtered.map(task => {
            const isActive = selectedTask?.id === task.id;
            const platform = detectPlatform(task.url);
            const platformColor = PLATFORM_COLORS[platform] || PLATFORM_COLORS['其他'];

            return (
              <div key={task.id}
                className={`glass-card rounded-xl p-md flex flex-col cursor-pointer transition-all duration-300 gap-3 ${isActive ? 'border-primary bg-primary/5 shadow-[0_8px_30px_rgba(168,57,0,0.15)] -translate-y-1' : 'border-black/5 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'}`}
                onClick={() => onTaskSelected(task)}
              >
                {/* Image header */}
                <div className="relative bg-cover bg-center rounded-lg overflow-hidden h-[100px] md:h-[120px]"
                  style={{ backgroundImage: `url(https://images.unsplash.com/photo-1540039155732-d6824b2f155c?w=400&q=80)` }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white/60" />
                  {/* Platform badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${platformColor}`}>{platform}</span>
                  </div>
                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${task.status === '監控中' ? 'bg-secondary' : 'bg-primary'}`}>
                      {task.status === '監控中'
                        ? <><div className="w-2 h-2 rounded-full bg-tertiary animate-pulse-green" /><span>監控中</span></>
                        : <><span className="material-symbols-outlined text-[14px]">check_circle</span><span>{task.status}</span></>}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-2 flex-1">
                  <div className="text-on-surface-variant text-xs">
                    建立於 {task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-TW') : '今日'}
                  </div>
                  <h4 className="m-0 text-lg font-semibold text-on-surface truncate">{task.venue || '未指定場館'}</h4>
                  <p className="m-0 text-sm text-on-surface-variant truncate">{task.url}</p>

                  {/* Tags row */}
                  <div className="flex gap-2 flex-wrap mt-1">
                    {task.departure && (
                      <span className="text-xs px-2 py-1 bg-surface-container-low rounded text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>{task.departure}
                      </span>
                    )}
                    {(task.minPrice || task.maxPrice) && (
                      <span className="text-xs px-2 py-1 bg-orange-50 rounded text-orange-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                        {task.minPrice ? `NT$${task.minPrice}` : '不限'} – {task.maxPrice ? `NT$${task.maxPrice}` : '不限'}
                      </span>
                    )}
                    {(task.monitorStart != null && task.monitorEnd != null) && (
                      <span className="text-xs px-2 py-1 bg-blue-50 rounded text-blue-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {String(task.monitorStart).padStart(2,'0')}–{String(task.monitorEnd).padStart(2,'0')}時
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-3 flex gap-2">
                    <button onClick={e => toggleLog(e, task.id)}
                      className="glass-button flex-1 p-2 text-sm bg-surface-container-low text-on-surface shadow-none hover:bg-surface-container flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">terminal</span> 日誌
                    </button>
                    {/* Feature 6: share button */}
                    <button
                      onClick={e => { e.stopPropagation(); setShareTask(task); }}
                      className="glass-button p-2 text-sm bg-surface-container-low text-on-surface shadow-none hover:bg-surface-container flex items-center justify-center gap-1"
                      title="共享此任務">
                      <span className="material-symbols-outlined text-[16px]">group_add</span>
                    </button>
                    <a href={task.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="glass-button flex-1 p-2 text-sm text-center no-underline bg-primary text-white border-none hover:opacity-90 flex items-center justify-center">
                      快速查看
                    </a>
                  </div>

                  {logExpandedId === task.id && (
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

      {/* Feature 6: Share modal */}
      <AnimatePresence>
        {shareTask && <ShareModal task={shareTask} onClose={() => setShareTask(null)} />}
      </AnimatePresence>
    </>
  );
}
