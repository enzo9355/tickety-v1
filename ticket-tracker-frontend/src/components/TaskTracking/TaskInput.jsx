import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

// Feature 3: expanded platform list
const VALID_DOMAINS = ['kktix', 'tixcraft', 'ticketplus', 'ibon', 'ticket.com.tw', 'kham', 'books.com.tw', 'ticketmaster'];

const steps = [
  { id: 1, title: '票券連結',    shortLabel: 'URL' },
  { id: 2, title: '場館與定位', shortLabel: 'Venue' },
  { id: 3, title: '預算與住宿', shortLabel: 'Budget' },
  { id: 4, title: '啟動監控',   shortLabel: 'Email' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

export default function TaskInput({ onTaskAdded, onError, initialUrl }) {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    url: '',
    email: '',
    venue: '',
    departure: '',
    budget: '',
    needsAccommodation: false,
    // Feature 2: price filter
    minPrice: '',
    maxPrice: '',
    // Feature 5: time window
    enableTimeWindow: false,
    monitorStart: 18,
    monitorEnd: 23,
  });
  const [submitState, setSubmitState] = useState('idle');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (initialUrl && initialUrl !== formData.url) {
      setFormData(prev => ({ ...prev, url: initialUrl }));
    }
  }, [initialUrl]);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [isAuthenticated, user]);

  const handleLocate = () => {
    if (!navigator.geolocation) { onError('您的瀏覽器不支援地理位置功能。'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await apiClient.get(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (res.data?.address) setFormData(prev => ({ ...prev, departure: res.data.address }));
        } catch { onError('自動定位失敗，無法取得地址。'); }
        finally { setIsLocating(false); }
      },
      () => { setIsLocating(false); onError('無法取得您的位置，請確認已授權 GPS 權限。'); }
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.url) return false;
      try {
        const u = new URL(formData.url.startsWith('http') ? formData.url : `https://${formData.url}`);
        return VALID_DOMAINS.some(d => u.hostname.toLowerCase().includes(d));
      } catch { return false; }
    }
    if (step === 4) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    return true;
  };

  const nextStep = () => { if (currentStep < 4) setCurrentStep(c => c + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(c => c - 1); };

  const handleSubmit = async () => {
    if (!formData.url || !formData.email) return;
    setSubmitState('parsing');
    try {
      setTimeout(() => setSubmitState('creating'), 1500);
      const payload = {
        url: formData.url,
        email: formData.email,
        venue: formData.venue,
        departure: formData.departure,
        budget: formData.budget ? Number(formData.budget) : null,
        needsAccommodation: formData.needsAccommodation,
        minPrice: formData.minPrice ? Number(formData.minPrice) : null,
        maxPrice: formData.maxPrice ? Number(formData.maxPrice) : null,
        monitorStart: formData.enableTimeWindow ? formData.monitorStart : null,
        monitorEnd: formData.enableTimeWindow ? formData.monitorEnd : null,
      };
      const res = await apiClient.post('/tasks', payload);
      setSubmitState('success');
      setTimeout(() => {
        onTaskAdded(res.data);
        setFormData({
          url: '', email: isAuthenticated && user?.email ? user.email : '',
          venue: '', departure: '', budget: '', needsAccommodation: false,
          minPrice: '', maxPrice: '', enableTimeWindow: false, monitorStart: 18, monitorEnd: 23,
        });
        setCurrentStep(1);
        setSubmitState('idle');
      }, 1000);
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || '建立任務失敗，請稍後再試。';
      onError(`建立任務失敗：${msg}`);
      setSubmitState('idle');
    }
  };

  const submitLabel = { parsing: '📄 解析中...', creating: '⚙️ 建立任務中...', success: '✅ 已啟動監控', idle: '🚀 啟動監控' }[submitState];

  const variants = {
    enter:  (d) => ({ x: d > 0 ? 20 : -20, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit:   (d) => ({ zIndex: 0, x: d < 0 ? 20 : -20, opacity: 0 }),
  };

  // Detect platform label for hint
  const platformHint = (() => {
    try {
      const u = new URL(formData.url.startsWith('http') ? formData.url : `https://${formData.url}`);
      const h = u.hostname.toLowerCase();
      if (h.includes('kktix')) return 'KKTIX';
      if (h.includes('tixcraft')) return '拓元';
      if (h.includes('ibon')) return 'ibon';
      if (h.includes('ticket.com.tw')) return '年代售票';
      if (h.includes('kham')) return '寬宏';
      if (h.includes('books')) return '博客來';
      if (h.includes('ticketmaster')) return 'Ticketmaster';
    } catch {}
    return null;
  })();

  return (
    <div className="glass-card rounded-xl p-lg flex flex-col gap-6 min-w-0 w-full">
      <h2 className="font-headline-md text-headline-md m-0 text-on-surface">新增監控任務</h2>

      {/* Stepper */}
      <div className="flex items-start justify-between relative mb-xl">
        <div className="absolute left-4 right-4 top-4 h-[2px] bg-surface-container-high z-0" />
        <div
          className="absolute left-4 top-4 h-[2px] bg-primary-container z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * (100 - 8)}%` }}
        />
        {steps.map((step) => {
          const done = currentStep > step.id || (currentStep === 4 && submitState === 'success');
          const active = currentStep === step.id;
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-sm">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 border-2 border-white ${done ? 'bg-primary-container text-white shadow-sm' : active ? 'bg-primary-container text-white shadow-sm ring-4 ring-primary-fixed/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {done ? <span className="material-symbols-outlined text-[16px] text-white">check</span>
                       : active ? <div className="w-2 h-2 rounded-full bg-white" /> : null}
              </div>
              <span className={`font-label-sm text-label-sm whitespace-nowrap ${active ? 'text-primary-container font-semibold' : 'text-on-surface-variant'}`}>
                {step.shortLabel}
              </span>
            </div>
          );
        })}
      </div>

      <h2 className="text-2xl font-semibold m-0 text-on-surface">{steps[currentStep - 1].title}</h2>

      <div className="relative">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div key={currentStep} custom={1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="w-full relative">

            {/* Step 1: URL */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">link</span>
                  <input type="url" name="url" value={formData.url} onChange={handleChange} placeholder="貼上票務網站連結..." className="glass-input pl-10 text-lg w-full" autoFocus />
                </div>
                {platformHint && (
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                    偵測到平台：<span className="font-semibold text-tertiary">{platformHint}</span>
                  </div>
                )}
                <p className="text-on-surface-variant text-sm m-0">
                  支援 <span className="font-medium">拓元、KKTIX、ibon、年代、寬宏、博客來、Ticketmaster</span> 等主要售票平台。
                </p>
              </div>
            )}

            {/* Step 2: Venue / Location */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">stadium</span>
                  <input type="text" name="venue" value={formData.venue} onChange={handleChange} placeholder="場館名稱（選填，若留空將自動解析）" className="glass-input pl-10 w-full" />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">location_on</span>
                    <input type="text" name="departure" value={formData.departure} onChange={handleChange} placeholder="您的出發地（用於交通建議）" className="glass-input pl-10 w-full" />
                  </div>
                  <button type="button" onClick={handleLocate} disabled={isLocating} className="glass-button w-auto bg-surface-container text-secondary shadow-none hover:bg-surface-container-high">
                    {isLocating ? '定位中...' : '📍 定位'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Budget + Feature 2 (price) + Feature 5 (time window) */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-5">
                {/* Accommodation budget */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">hotel</span>
                  <input type="number" name="budget" value={formData.budget} onChange={handleChange} placeholder="住宿預算 (TWD，選填)" className="glass-input pl-10 w-full" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" name="needsAccommodation" checked={formData.needsAccommodation} onChange={handleChange} className="glass-checkbox" />
                  <span className="text-base text-on-surface">需要推薦附近住宿與交通</span>
                </label>

                {/* Feature 2: Ticket price range */}
                <div className="flex flex-col gap-2 pt-2 border-t border-surface-container-high">
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                    票價篩選（選填）
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">NT$</span>
                      <input type="number" name="minPrice" value={formData.minPrice} onChange={handleChange} placeholder="最低票價" className="glass-input pl-10 w-full text-sm" />
                    </div>
                    <span className="text-on-surface-variant">—</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">NT$</span>
                      <input type="number" name="maxPrice" value={formData.maxPrice} onChange={handleChange} placeholder="最高票價" className="glass-input pl-10 w-full text-sm" />
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant m-0">留空代表不限制票價區間</p>
                </div>

                {/* Feature 5: Time window */}
                <div className="flex flex-col gap-3 pt-2 border-t border-surface-container-high">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="enableTimeWindow" checked={formData.enableTimeWindow} onChange={handleChange} className="glass-checkbox" />
                    <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      設定監控時段（節省效能）
                    </div>
                  </label>
                  <AnimatePresence>
                    {formData.enableTimeWindow && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 items-center overflow-hidden">
                        <div className="flex-1">
                          <label className="text-xs text-on-surface-variant mb-1 block">開始時間</label>
                          <select name="monitorStart" value={formData.monitorStart} onChange={handleChange} className="glass-input py-2 text-sm w-full">
                            {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <span className="text-on-surface-variant mt-5">→</span>
                        <div className="flex-1">
                          <label className="text-xs text-on-surface-variant mb-1 block">結束時間</label>
                          <select name="monitorEnd" value={formData.monitorEnd} onChange={handleChange} className="glass-input py-2 text-sm w-full">
                            {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {formData.enableTimeWindow && (
                    <p className="text-xs text-on-surface-variant m-0">
                      系統只會在 <span className="font-medium text-primary">{String(formData.monitorStart).padStart(2,'0')}:00 – {String(formData.monitorEnd).padStart(2,'0')}:00</span> 期間輪詢，其餘時段暫停以降低伺服器負擔。
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Email */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-4">
                {isAuthenticated && user?.email ? (
                  <div className="glass-input flex items-center gap-3 px-4 py-3 bg-surface-container rounded-xl cursor-default">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">verified_user</span>
                    <div className="flex flex-col">
                      <span className="text-on-surface font-medium text-base">{user.email}</span>
                      <span className="text-on-surface-variant text-xs">通知將寄送至此 Email</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">mail</span>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="接收通知的 Email" className="glass-input pl-10 text-lg w-full" />
                  </div>
                )}
                {/* Summary */}
                <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-2 text-sm text-on-surface-variant">
                  <p className="m-0 font-semibold text-on-surface">確認設定</p>
                  <p className="m-0 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">link</span>
                    {formData.url.length > 40 ? formData.url.slice(0, 40) + '...' : formData.url}
                  </p>
                  {(formData.minPrice || formData.maxPrice) && (
                    <p className="m-0 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                      票價 {formData.minPrice ? `NT$${formData.minPrice}` : '不限'} – {formData.maxPrice ? `NT$${formData.maxPrice}` : '不限'}
                    </p>
                  )}
                  {formData.enableTimeWindow && (
                    <p className="m-0 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      監控時段 {String(formData.monitorStart).padStart(2,'0')}:00 – {String(formData.monitorEnd).padStart(2,'0')}:00
                    </p>
                  )}
                </div>
                <p className="text-on-surface-variant text-sm m-0">當票券狀態改變或開賣時，我們將第一時間寄送 Email 通知您。</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-auto pt-4">
        {currentStep > 1
          ? <button type="button" onClick={prevStep} className="glass-button bg-surface-container text-on-surface shadow-none hover:bg-surface-container-high flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">chevron_left</span> 返回</button>
          : <div />}
        {currentStep < 4
          ? <button type="button" onClick={nextStep} disabled={!validateStep(currentStep)} className="glass-button flex items-center gap-1">下一步 <span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          : <button type="button" onClick={handleSubmit} disabled={submitState !== 'idle' || !validateStep(4)} className="glass-button w-full md:w-40">{submitLabel}</button>
        }
      </div>
    </div>
  );
}
