import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';

const steps = [
  { id: 1, title: "票券連結" },
  { id: 2, title: "場館與定位" },
  { id: 3, title: "預算與住宿" },
  { id: 4, title: "啟動監控" }
];

export default function TaskInput({ onTaskAdded, onError, initialUrl }) {
  const { isMobile } = useMediaQuery();
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
        setFormData({ url: '', email: '', venue: '', departure: '', budget: '', needsAccommodation: false });
        setCurrentStep(1);
        setSubmitState('idle');
      }, 1000);
      
    } catch (error) {
      console.error("Failed to create task", error);
      const errorMsg = error.response?.data?.detail || error.message || '連線至後端失敗，請確認 API 伺服器是否運行中。';
      onError(`建立任務失敗：${errorMsg}`);
      setSubmitState('idle');
    }
  };

  const getSubmitButtonText = () => {
    switch (submitState) {
      case 'parsing': return '🔍 解析中...';
      case 'creating': return '⚙️ 建立任務...';
      case 'success': return '✅ 監控已啟動';
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
      
      {/* Stepper Header */}
      <div className="flex justify-between items-center mb-2">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.id || (currentStep === 4 && submitState === 'success');
          const isActive = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`
                flex items-center justify-center rounded-full font-bold transition-all duration-300
                ${isMobile ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'}
                ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}
              `}>
                {isCompleted ? <span className="material-symbols-outlined text-[16px] text-white">check</span> : step.id}
              </div>
              
              {idx < steps.length - 1 && !isMobile && (
                <div className={`
                  flex-1 h-[2px] mx-3 transition-all duration-300
                  ${isCompleted ? 'bg-green-500' : 'bg-surface-container-high'}
                `} />
              )}
              {idx < steps.length - 1 && isMobile && (
                <div className="flex-1 min-w-[8px]" />
              )}
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
                  <span className="material-symbols-outlined absolute left-4 top-[14px] text-on-surface-variant text-[18px]">link</span>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    placeholder="貼上拓元等售票網站網址..."
                    className="glass-input pl-11 text-lg w-full"
                    autoFocus
                  />
                </div>
                <p className="text-on-surface-variant text-sm m-0">系統將自動解析網頁並抓取活動資訊。</p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-[14px] text-on-surface-variant text-[18px]">location_on</span>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    placeholder="目標場館 (選填，若留空將自動解析)"
                    className="glass-input pl-11 w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-[14px] text-on-surface-variant text-[18px]">location_on</span>
                    <input
                      type="text"
                      name="departure"
                      value={formData.departure}
                      onChange={handleChange}
                      placeholder="您的出發地"
                      className="glass-input pl-11 w-full"
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
                  <span className="material-symbols-outlined absolute left-4 top-[14px] text-on-surface-variant text-[18px]">attach_money</span>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="總預算 (TWD)"
                    className="glass-input pl-11 w-full"
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
                  <span className="text-base text-on-surface">需要安排周邊住宿推薦</span>
                </label>
              </div>
            )}

            {currentStep === 4 && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-[14px] text-on-surface-variant text-[18px]">mail</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="接收通知的 Email"
                    className="glass-input pl-11 text-lg w-full"
                  />
                </div>
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
            className={`glass-button ${isMobile ? 'w-full' : 'w-40'}`}
          >
            {getSubmitButtonText()}
          </button>
        )}
      </div>

    </div>
  );
}
