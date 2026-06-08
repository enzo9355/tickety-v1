import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';

// ─── Zone color helpers ───────────────────────────────────
const ZONE_COLORS = {
  '綠': 'bg-green-500 text-white',   '紅': 'bg-red-500 text-white',
  '橙': 'bg-orange-500 text-white',  '黃': 'bg-yellow-500 text-gray-900',
  '藍': 'bg-blue-500 text-white',    '紫': 'bg-purple-500 text-white',
  '粉': 'bg-pink-500 text-white',    '白': 'bg-gray-200 text-gray-900',
  'VIP': 'bg-primary text-white',    'A': 'bg-secondary text-white',
  'B': 'bg-tertiary text-white',     'C': 'bg-green-500 text-white',
};
function getZoneColor(zone) {
  if (!zone) return 'bg-surface-variant text-white';
  for (const [k, v] of Object.entries(ZONE_COLORS)) if (zone.includes(k)) return v;
  return 'bg-surface-variant text-on-surface';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'), s = String(d.getSeconds()).padStart(2, '0');
  const p = h >= 12 ? '下午' : '上午';
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${p}${h % 12 || 12}:${m}:${s}`;
}

// ─── Feature 4: SVG Line Chart ────────────────────────────
const CHART_COLORS = ['#FF5B00', '#006C49', '#4F46E5', '#0891B2', '#D97706'];

function TicketChart({ records }) {
  const PAD = { top: 16, right: 16, bottom: 48, left: 44 };
  const W = 320, H = 180;
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const withData = records.filter(r => r.remaining != null && r.detected_at);
  if (withData.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant text-sm gap-2">
        <span className="material-symbols-outlined text-[28px] opacity-40">show_chart</span>
        <span>需至少 2 筆紀錄才能顯示趨勢圖</span>
      </div>
    );
  }

  const sorted = [...withData].sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));
  const zones = [...new Set(sorted.map(r => r.zone || '未知'))];

  const times = sorted.map(r => new Date(r.detected_at).getTime());
  const allVals = sorted.map(r => r.remaining);
  const tMin = Math.min(...times), tMax = Math.max(...times);
  const vMin = 0, vMax = Math.max(...allVals, 1);

  const sx = t => ((t - tMin) / (tMax - tMin || 1)) * cW;
  const sy = v => cH - ((v - vMin) / (vMax - vMin || 1)) * cH;

  const yTicks = [0, Math.ceil(vMax / 2), vMax];
  const xTicks = times.length > 1 ? [tMin, Math.round((tMin + tMax) / 2), tMax] : [tMin];

  const zonePaths = zones.map((zone, zi) => {
    const pts = sorted
      .filter(r => (r.zone || '未知') === zone)
      .map(r => ({ x: sx(new Date(r.detected_at).getTime()), y: sy(r.remaining), v: r.remaining }));
    const d = pts.length ? `M${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}` : '';
    return { zone, color: CHART_COLORS[zi % CHART_COLORS.length], pts, d };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 240, height: 180 }}>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid + Y labels */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={0} y1={sy(v)} x2={cW} y2={sy(v)} stroke="#e4beb1" strokeWidth={0.5} strokeDasharray="3 3" />
              <text x={-6} y={sy(v) + 4} textAnchor="end" fontSize={9} fill="#907065">{v}</text>
            </g>
          ))}
          {/* Y axis label */}
          <text x={-34} y={cH / 2} textAnchor="middle" fontSize={8} fill="#907065" transform={`rotate(-90 -34 ${cH / 2})`}>剩餘張數</text>

          {/* X axis ticks */}
          {xTicks.map((t, i) => (
            <text key={i} x={sx(t)} y={cH + 14} textAnchor="middle" fontSize={8} fill="#907065">
              {new Date(t).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </text>
          ))}

          {/* Lines + dots */}
          {zonePaths.map(({ zone, color, pts, d }) => (
            <g key={zone}>
              <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} stroke="white" strokeWidth={1}>
                  <title>剩餘 {p.v} 張</title>
                </circle>
              ))}
            </g>
          ))}

          {/* Legend */}
          {zonePaths.map(({ zone, color }, i) => (
            <g key={i} transform={`translate(${i * 80}, ${cH + 30})`}>
              <rect x={0} y={-5} width={12} height={4} rx={2} fill={color} />
              <text x={15} y={0} fontSize={9} fill="#5b4137">{zone}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function TicketHistory({ taskId, taskStatus }) {
  const [records, setRecords] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'chart'

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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4 glass-card rounded-xl p-md">
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="flex items-center gap-2 text-xl m-0 text-on-surface">
          <span className="material-symbols-outlined text-primary text-[24px]">history</span>
          歷史紀錄
          {records.length > 0 && (
            <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs font-bold">{records.length}</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); fetchRecords(); }} className="bg-transparent border-none cursor-pointer text-on-surface-variant flex items-center p-1 hover:bg-surface-container rounded-full" title="重新整理">
            <span className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant">{isExpanded ? 'expand_less' : 'expand_more'}</span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {records.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center gap-3 bg-surface-container-low rounded-xl mt-2">
                <span className="material-symbols-outlined text-[32px] opacity-40">local_activity</span>
                <p className="m-0 text-sm">
                  {taskStatus === '監控中' ? '尚未偵測到可購買票券，系統持續監控中...' : '此任務沒有票券偵測紀錄'}
                </p>
              </div>
            ) : (
              <>
                {/* Feature 4: View toggle */}
                <div className="flex gap-2 mt-2 mb-3">
                  {[{ id: 'list', icon: 'format_list_bulleted', label: '清單' }, { id: 'chart', icon: 'show_chart', label: '趨勢圖' }].map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${view === tab.id ? 'border-primary bg-primary/10 text-primary' : 'border-surface-variant bg-surface text-on-surface-variant hover:bg-surface-container'}`}>
                      <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Chart view */}
                {view === 'chart' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface-container-low rounded-xl p-3 mt-1">
                    <p className="text-xs text-on-surface-variant mb-2 m-0">剩餘票數趨勢</p>
                    <TicketChart records={records} />
                  </motion.div>
                )}

                {/* List view */}
                {view === 'list' && (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible"
                    className="border-l-2 border-surface-container-high ml-3 pl-4 flex flex-col gap-sm max-h-[400px] overflow-y-auto pt-2 pb-2 mt-1">
                    {records.map((record, idx) => (
                      <motion.div key={record.id || idx} variants={itemVariants} className="relative flex flex-col gap-2 mb-4 last:mb-0 group">
                        <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white group-hover:scale-110 transition-transform" />
                        <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>{formatTime(record.detected_at)}</span>
                        </div>
                        <div className={`${getZoneColor(record.zone || record.raw_text)} px-4 py-2.5 rounded-lg font-semibold text-base shadow-sm w-fit max-w-[320px]`}>
                          {record.raw_text || `${record.zone || '未知區域'} 剩餘 ${record.remaining ?? '?'}`}
                        </div>
                        {record.price > 0 && (
                          <span className="text-xs text-on-surface-variant">NT$ {record.price.toLocaleString()}</span>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
