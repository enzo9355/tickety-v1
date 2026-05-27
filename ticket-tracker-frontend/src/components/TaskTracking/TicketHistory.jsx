import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, History, Ticket, RefreshCw } from 'lucide-react';
import apiClient from '../../api/client';

// Zone color mapping — maps zone keywords to colors
const ZONE_COLORS = {
  '綠': { bg: '#10b981', text: '#FFFFFF' },
  '紅': { bg: '#ef4444', text: '#FFFFFF' },
  '橙': { bg: '#f97316', text: '#FFFFFF' },
  '黃': { bg: '#eab308', text: '#212529' },
  '藍': { bg: '#3b82f6', text: '#FFFFFF' },
  '紫': { bg: '#8b5cf6', text: '#FFFFFF' },
  '粉': { bg: '#ec4899', text: '#FFFFFF' },
  '白': { bg: '#e5e7eb', text: '#212529' },
  'VIP': { bg: '#FF5B00', text: '#FFFFFF' },
  'A': { bg: '#00B3CC', text: '#FFFFFF' },
  'B': { bg: '#6C63FF', text: '#FFFFFF' },
  'C': { bg: '#10b981', text: '#FFFFFF' },
};

function getZoneColor(zone) {
  if (!zone) return { bg: '#5A626A', text: '#FFFFFF' };
  for (const [key, colors] of Object.entries(ZONE_COLORS)) {
    if (zone.includes(key)) return colors;
  }
  return { bg: '#5A626A', text: '#FFFFFF' };
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
    // Auto-refresh every 30s if the task is still monitoring
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
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Section Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', margin: 0 }}>
          <History size={24} color="var(--color-primary)" />
          歷史紀錄
          {records.length > 0 && (
            <span className="badge" style={{
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {records.length}
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); fetchRecords(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
              padding: '4px'
            }}
            title="重新整理"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {isExpanded
            ? <ChevronUp size={20} color="var(--color-text-muted)" />
            : <ChevronDown size={20} color="var(--color-text-muted)" />
          }
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {records.length === 0 ? (
              <div className="glass-panel" style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Ticket size={32} color="var(--color-text-muted)" style={{ opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {taskStatus === '監控中'
                    ? '尚未偵測到可購買票券，系統持續監控中...'
                    : '此任務沒有票券偵測紀錄'
                  }
                </p>
                {taskStatus === '監控中' && (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    (當偵測到釋票時，歷史紀錄將自動更新)
                  </p>
                )}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}
              >
                {records.map((record, idx) => {
                  const zoneColor = getZoneColor(record.zone || record.raw_text);
                  return (
                    <motion.div
                      key={record.id || idx}
                      variants={itemVariants}
                      className="glass-panel"
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      {/* Timestamp */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.82rem'
                      }}>
                        <Clock size={14} />
                        <span>時間: {formatTime(record.detected_at)}</span>
                      </div>

                      {/* Ticket Info Badge */}
                      <div style={{
                        background: zoneColor.bg,
                        color: zoneColor.text,
                        padding: '10px 24px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '1rem',
                        textAlign: 'center',
                        width: '100%',
                        maxWidth: '320px',
                        boxShadow: `0 2px 8px ${zoneColor.bg}40`
                      }}>
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

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </motion.div>
  );
}
