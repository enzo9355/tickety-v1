import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const steps = [
  { id: 1, title: "票券連結",    shortLabel: "URL" },
  { id: 2, title: "場館與定位", shortLabel: "Departure" },
  { id: 3, title: "預算與住宿", shortLabel: "Budget" },
  { id: 4, title: "啟動監控",   shortLabel: "Email" }
];

export default function TaskInput({ onTaskAdded, onError, initialUrl }) {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    url: '',
    email: '',
    venue: '',
    departure: '',
    budget: '',
    needsAccommodation: false
  });
  
  const [submitState, setSubmitState] = useState('idle'); // idle | parsing | creating | success
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (initialUrl && initialUrl !== formData.url) {
      setFormData(prev => ({ ...prev, url: initialUrl }));
    }
  }, [initialUrl]);

  // Auto-fill email when user is logged in
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [isAuthenticated, user]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      onError("您的瀏覽器不支援地理位置功能。");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await apiClient.get(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (response.data && response.data.address) {
            setFormData(prev => ({ ...prev, departure: response.data.address }));
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          onError("自動定位失敗，無法取得地址。");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        onError("無法取得您的位置，請確認已授權 GPS 權限。");
      }
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.url) return false;
      try {
        const urlObj = new URL(formData.url.startsWith('http') ? formData.url : `https://${formData.url}`);
        const validDomains = ['kktix', 'tixcraft', 'ticketplus'];
        return validDomains.some(domain => urlObj.hostname.toLowerCase().includes(domain));
      } catch {
        return false;
      }
    }
    if (step === 4) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(formData.email);
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1 && !formData.url) return;
    if (currentStep < 4) setCurrentStep(c => c + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.url || !formData.email) return;

    setSubmitState('parsing');
    try {
      // Simulate multiple loading stages
      setTimeout(() => setSubmitState('creating'), 1500);
      
      const response = await apiClient.post('/tasks', formData);
      
      setSubmitState('success');
      setTimeout(() => {
        onTaskAdded(response.data);
        setFormData({ url: '', email: isAuthenticated && user?.email ? user.email : '', venue: '', departure: '', budget: '', needsAccommodation: false });
        setCurrentStep(1);
        setSubmitState('idle');
      }, 1000);
      
    } catch (error) {
      console.error("Failed to create task", error);
      const errorMsg = error.response?.data?.detail || error.message || '建立任務失敗，請稍後再試或確認 API 服務是否正常。';
      onError(`建立任務失敗：${errorMsg}`);
      setSubmitState('idle');
    }
  };

  const getSubmitButtonText = () => {
    switch (submitState) {
      case 'parsing': return '📄 解析中...';
      case 'creating': return '⚙️ 建立任務中...';
      case 'success': return '✅ 已啟動監控';
      default: return '🚀 啟動監控';
    }
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 20 : -20,
      opacity: 0
    })
  };

  return (
    <div className="glass-card rounded-xl p-lg flex flex-col gap-6 min-w-0 w-full">
      
      <h2 className="font-headline-md text-headline-md m-0 text-on-surface">新增監控任務</h2>

      {/* Stepper */}
      <div className="flex items-start justify-between relative mb-xl">
        {/* Background connector line */}
        <div className="absolute left-4 right-4 top-4 h-[2px] bg-surface-container-high z-0" />
        {/* Active progress line */}
        <div
          className="absolute left-4 top-4 h-[2px] bg-primary-container z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * (100 - 8)}%` }}
        />

        {steps.map((step) => {
          const isCompleted = currentStep > step.id || (currentStep === 4 && submitState === 'success');
          const isActive = currentStep === step.id;
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-sm">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 border-2 border-white
                ${isCompleted ? 'bg-primary-container text-white shadow-sm' : isActive ? 'bg-primary-container text-white shadow-sm ring-4 ring-primary-fixed/30' : 'bg-surface-container-high text-on-surface-variant'}
              `}>
                {isCompleted
                  ? <span className="material-symbols-outlined text-[16px] text-white">check</span>
                  : isActive
                    ? <div className="w-2 h-2 rounded-full bg-white" />
                    : null
                }
              </div>
              <span className={`font-label-sm text-label-sm whitespace-nowrap ${
                isActive ? 'text-primary-container font-semibold' : 'text-on-surface-variant'
              }`}>
                {step.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
      
      <h2 className="text-2xl font-semibold m-0 text-on-surface">{steps[currentStep - 1].title}</h2>

      {/* Form Content */}
      <div className="relative">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="w-full relative"
          >
            {currentStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">link</span>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    placeholder="貼上拓元或 KKTIX 等售票網站連結..."
                    className="glass-input pl-10 text-lg w-full"
                    autoFocus
                  />
                </div>
                <p className="text-on-surface-variant text-sm m-0">支援的售票平台包括拓元、KKTIX 等國內主要票務系統。</p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">location_on</span>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    placeholder="標場館 (選填，若留空將自動解析)"
                    className="glass-input pl-10 w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">location_on</span>
                    <input
                      type="text"
                      name="departure"
                      value={formData.departure}
                      onChange={handleChange}
                      placeholder="您的出發地"
                      className="glass-input pl-10 w-full"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleLocate}
                    disabled={isLocating}
                    className="glass-button w-auto bg-surface-container text-secondary shadow-none hover:bg-surface-container-high"
                  >
                    {isLocating ? 'Loading...' : '📍 定位'}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">attach_money</span>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="住宿預算 (TWD)"
                    className="glass-input pl-10 w-full"
                  />
                </div>
                
                <label className="glass-checkbox-wrapper py-2 px-1 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="needsAccommodation"
                    checked={formData.needsAccommodation}
                    onChange={handleChange}
                    className="glass-checkbox"
                  />
                  <span className="text-base text-on-surface">需要推薦附近住宿與交通</span>
                </label>
              </div>
            )}

            {currentStep === 4 && (
              <div className="flex flex-col gap-4">
                {isAuthenticated && user?.email ? (
                  // Logged-in: show read-only email info card
                  <div className="glass-input flex items-center gap-3 px-4 py-3 bg-surface-container rounded-xl cursor-default">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">verified_user</span>
                    <div className="flex flex-col">
                      <span className="text-on-surface font-medium text-base">{user.email}</span>
                      <span className="text-on-surface-variant text-xs">通知將寄送至此 Email</span>
                    </div>
                  </div>
                ) : (
                  // Not logged-in: show email input
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">mail</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="接收通知的 Email"
                      className="glass-input pl-10 text-lg w-full"
                    />
                  </div>
                )}
                <p className="text-on-surface-variant text-sm m-0">當票券狀態改變或開賣時，我們將第一時間寄送 Email 通知您。</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-auto pt-4">
        {currentStep > 1 ? (
          <button type="button" onClick={prevStep} className="glass-button bg-surface-container text-on-surface shadow-none hover:bg-surface-container-high flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span> 返回
          </button>
        ) : <div />}
        
        {currentStep < 4 ? (
          <button 
            type="button" 
            onClick={nextStep} 
            disabled={!validateStep(currentStep)}
            className="glass-button flex items-center gap-1"
          >
            下一步 <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        ) : (
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitState !== 'idle' || !validateStep(4)}
            className="glass-button w-full md:w-40"
          >
            {getSubmitButtonText()}
          </button>
        )}
      </div>

    </div>
  );
}
