import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, X, ArrowRight, CheckCircle2, LogOut } from 'lucide-react';

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
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid rgba(0,0,0,0.05)',
        zIndex: 2001,
        animation: 'fadeIn 0.3s ease'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {isAuthenticated ? (
          /* Logged in state */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF5B00, #FF8C00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: 'white', fontSize: '1.5rem', fontWeight: 700
            }}>
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#212529' }}>已登入</h3>
            <p style={{ margin: '0 0 24px', color: '#5A626A', fontSize: '0.9rem' }}>{user?.email}</p>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '12px',
                background: '#F3F4F6', color: '#EF4444',
                border: '1px solid #E5E7EB', borderRadius: '12px',
                cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500
              }}
            >
              <LogOut size={18} /> 登出
            </button>
          </div>
        ) : loginSent ? (
          /* Email sent confirmation */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={32} color="#10B981" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#212529' }}>登入連結已發送！</h3>
            <p style={{ margin: '0 0 8px', color: '#5A626A', fontSize: '0.9rem', lineHeight: 1.6 }}>
              我們已將登入連結寄到 <strong style={{ color: '#FF5B00' }}>{email}</strong>
            </p>
            <p style={{ margin: '0 0 24px', color: '#9CA3AF', fontSize: '0.8rem' }}>
              連結 15 分鐘內有效，請查看信箱（包含垃圾郵件）
            </p>
            <button
              onClick={() => { setEmail(''); onClose(); }}
              style={{
                width: '100%', padding: '12px',
                background: '#F3F4F6', color: '#374151',
                border: '1px solid #E5E7EB', borderRadius: '12px',
                cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500
              }}
            >
              好的，我知道了
            </button>
          </div>
        ) : (
          /* Login form */
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #FF5B00, #FF8C00)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Mail size={28} color="white" />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: '#212529' }}>登入 Tickety</h3>
              <p style={{ margin: 0, color: '#5A626A', fontSize: '0.9rem' }}>
                輸入 Email，我們會寄一封登入連結給你
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)', color: '#9CA3AF'
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    width: '100%', padding: '14px 14px 14px 42px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    color: '#212529',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FF5B00'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {error && (
                <p style={{ color: '#EF4444', fontSize: '0.85rem', margin: '0 0 12px', textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                style={{
                  width: '100%', padding: '14px',
                  background: sending ? '#9CA3AF' : 'linear-gradient(135deg, #FF5B00, #FF8C00)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: sending ? 'none' : '0 4px 15px rgba(255, 91, 0, 0.3)'
                }}
              >
                {sending ? '發送中...' : <>發送登入連結 <ArrowRight size={18} /></>}
              </button>
            </form>

            <p style={{
              textAlign: 'center', margin: '16px 0 0',
              color: '#9CA3AF', fontSize: '0.75rem'
            }}>
              無需密碼，點擊信中連結即可完成登入
            </p>
          </>
        )}
      </div>
    </>
  );
}
