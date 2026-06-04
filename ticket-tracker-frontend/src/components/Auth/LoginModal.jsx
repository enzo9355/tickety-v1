import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginModal({ isOpen, onClose }) {
  const { login, loginSent, user, isAuthenticated, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setSending(true);
    const result = await login(email.trim());
    setSending(false);
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-[2000] animate-[fadeIn_0.2s_ease]"
      />

      {/* Modal */}
      <div className="glass-modal rounded-[20px] p-8 max-w-[420px] w-[90%] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] animate-[fadeIn_0.3s_ease]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-gray-400 p-1 hover:text-gray-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {isAuthenticated ? (
          /* Logged in state */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF5B00] to-[#FF8C00] flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <h3 className="m-0 mb-1 text-xl text-gray-900 font-bold">已登入</h3>
            <p className="m-0 mb-6 text-gray-600 text-sm">{user?.email}</p>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full p-3 bg-gray-100 text-red-500 border border-gray-200 rounded-xl cursor-pointer text-base font-medium hover:bg-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span> 登出
            </button>
          </div>
        ) : loginSent ? (
          /* Email sent confirmation */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px] text-emerald-500">check_circle</span>
            </div>
            <h3 className="m-0 mb-2 text-xl text-gray-900 font-bold">登入連結已發送！</h3>
            <p className="m-0 mb-2 text-gray-600 text-sm leading-relaxed">
              我們已將登入連結寄到 <strong className="text-primary">{email}</strong>
            </p>
            <p className="m-0 mb-6 text-gray-400 text-xs">
              連結 15 分鐘內有效，請查看信箱（包含垃圾郵件）
            </p>
            <button
              onClick={() => { setEmail(''); onClose(); }}
              className="w-full p-3 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl cursor-pointer text-base font-medium hover:bg-gray-200 transition-colors"
            >
              好的，我知道了
            </button>
          </div>
        ) : (
          /* Login form */
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF5B00] to-[#FF8C00] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[28px] text-white">mail</span>
              </div>
              <h3 className="m-0 mb-1 text-xl text-gray-900 font-bold">登入 Tickety</h3>
              <p className="m-0 text-gray-600 text-sm">
                輸入 Email，我們會寄一封登入連結給你
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full py-3.5 pr-3.5 pl-11 bg-white border border-gray-200 rounded-xl text-base text-gray-900 outline-none transition-colors box-border focus:border-primary"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm m-0 mb-3 text-center">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                className={`w-full p-3.5 text-white border-none rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-all ${
                  sending
                    ? 'bg-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-br from-[#FF5B00] to-[#FF8C00] cursor-pointer shadow-[0_4px_15px_rgba(255,91,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,91,0,0.4)]'
                }`}
              >
                {sending ? '發送中...' : <>發送登入連結 <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>}
              </button>
            </form>

            <p className="text-center mt-4 mb-0 text-gray-400 text-xs">
              無需密碼，點擊信中連結即可完成登入
            </p>
          </>
        )}
      </div>
    </>
  );
}
