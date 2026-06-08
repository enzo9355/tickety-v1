import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';

export default function ShareModal({ task, onClose }) {
  const [shares, setShares] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/tasks/${task.id}/shares`);
      setShares(res.data || []);
    } catch (e) {
      setError('無法載入共享名單');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShares(); }, [task.id]);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post(`/api/tasks/${task.id}/shares`, { email: email.trim() });
      setSuccess(`✅ ${email} 已加入，有票時將一同通知`);
      setEmail('');
      fetchShares();
    } catch (e) {
      setError(e.response?.data?.detail || '新增失敗，請確認 Email 格式');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (shareEmail) => {
    try {
      await apiClient.delete(`/api/tasks/${task.id}/shares/${encodeURIComponent(shareEmail)}`);
      setShares(prev => prev.filter(s => s.email !== shareEmail));
    } catch {
      setError('移除失敗，請稍後再試');
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-[2000]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-modal rounded-[20px] p-8 max-w-[440px] w-[90%] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">group_add</span>
            </div>
            <div>
              <h3 className="m-0 text-lg font-bold text-gray-900">共享監控任務</h3>
              <p className="m-0 text-xs text-gray-500">
                {task.url.length > 40 ? task.url.slice(0, 40) + '...' : task.url}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600 p-1">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Add email */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">mail</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="輸入 Email 加入共同監控"
              className="w-full py-2.5 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !email.trim()}
            className="glass-button px-4 py-2.5 text-sm whitespace-nowrap"
          >
            {adding ? '新增中...' : '新增'}
          </button>
        </div>

        {/* Feedback */}
        {error && <p className="text-red-500 text-sm m-0">{error}</p>}
        {success && <p className="text-green-600 text-sm m-0">{success}</p>}

        {/* Shared list */}
        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 m-0">目前共享成員 ({shares.length})</p>
          {loading ? (
            <p className="text-sm text-gray-400">載入中...</p>
          ) : shares.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm flex flex-col items-center gap-2 bg-gray-50 rounded-xl">
              <span className="material-symbols-outlined text-[28px] opacity-40">group</span>
              尚未有共享成員
            </div>
          ) : (
            shares.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {s.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="m-0 text-sm font-medium text-gray-900">{s.email}</p>
                    <p className="m-0 text-xs text-gray-400">
                      加入於 {new Date(s.invited_at).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(s.email)}
                  className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="移除"
                >
                  <span className="material-symbols-outlined text-[18px]">remove_circle_outline</span>
                </button>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-gray-400 m-0 text-center">被加入的成員無需帳號，偵測到釋票時會直接收到 Email 通知。</p>
      </motion.div>
    </>
  );
}
