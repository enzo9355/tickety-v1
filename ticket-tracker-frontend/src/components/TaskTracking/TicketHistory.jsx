import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';

// Zone color mapping
const ZONE_COLORS = {
  '綠': 'bg-green-500 text-white',
  '紅': 'bg-red-500 text-white',
  '橙': 'bg-orange-500 text-white',
  '黃': 'bg-yellow-500 text-gray-900',
  '藍': 'bg-blue-500 text-white',
  '紫': 'bg-purple-500 text-white',
  '粉': 'bg-pink-500 text-white',
  '白': 'bg-gray-200 text-gray-900',
  'VIP': 'bg-primary text-white',
  'A': 'bg-secondary text-white',
  'B': 'bg-tertiary text-white',
  'C': 'bg-green-500 text-white',
};

function getZoneColorClass(zone) {
  if (!zone) return 'bg-surface-variant text-white';
  for (const [key, classes] of Object.entries(ZONE_COLORS)) {
    if (zone.includes(key)) return classes;
  }
  return 'bg-surface-variant text-white';
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const period = hours >= 12 ? '下午' : '上午';
  const h12 = hours % 12 || 12;
  return `${year}/${month}/${day} ${period}${h12}:${minutes}:${seconds}`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function TicketHistory({ taskId, taskStatus }) {
  const [records, setRecords] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecords = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/api/tasks/${taskId}/ticket-records`);
      setRecords(res.data || []);
    } catch (err) {
      console.error('Failed to fetch ticket records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    if (taskStatus === '監控中') {
      const interval = setInterval(fetchRecords, 30000);
      return () => clearInterval(interval);
    }
  }, [taskId, taskStatus]);

  if (!taskId) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4 glass-card rounded-xl p-md"
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="flex items-center gap-2 text-xl m-0 text-on-surface">
          <span className="material-symbols-outlined text-primary text-[24px]">history</span>
          歷史紀錄
          {records.length > 0 && (
            <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {records.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); fetchRecords(); }}
            className="bg-transparent border-none cursor-pointer text-on-surface-variant flex items-center p-1 hover:bg-surface-container rounded-full"
            title="重新整理"
          >
            <span className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {records.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center gap-3 bg-surface-container-low rounded-xl mt-2">
                <span className="material-symbols-outlined text-[32px] opacity-40">local_activity</span>
                <p className="m-0 text-sm">
                  {taskStatus === '監控中'
                    ? '尚未偵測到可購買票券，系統持續監控中...'
                    : '此任務沒有票券偵測紀錄'
                  }
                </p>
                {taskStatus === '監控中' && (
                  <p className="m-0 text-xs opacity-70">
                    (當偵測到釋票時，歷史紀錄將自動更新)
                  </p>
                )}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="border-l-2 border-surface-container-high ml-3 pl-4 flex flex-col gap-sm max-h-[400px] overflow-y-auto pt-2 pb-2 mt-2"
              >
                {records.map((record, idx) => {
                  const zoneColorClass = getZoneColorClass(record.zone || record.raw_text);
                  return (
                    <motion.div
                      key={record.id || idx}
                      variants={itemVariants}
                      className="relative flex flex-col gap-2 mb-4 last:mb-0 group"
                    >
                      {/* Timeline Dot */}
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white group-hover:scale-110 transition-transform"></div>
                      
                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>時間: {formatTime(record.detected_at)}</span>
                      </div>

                      {/* Ticket Info Badge */}
                      <div className={`
                        ${zoneColorClass}
                        px-4 py-2.5 rounded-lg font-semibold text-base shadow-sm w-fit max-w-[320px]
                      `}>
                        {record.raw_text || `${record.zone || '未知區域'} ${record.price || ''} 剩餘 ${record.remaining || '?'}`}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
