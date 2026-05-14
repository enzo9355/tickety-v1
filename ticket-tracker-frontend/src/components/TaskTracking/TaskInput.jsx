import React, { useState, useEffect } from 'react';
import { Send, MapPin, DollarSign, Mail, Link as LinkIcon, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';

const steps = [
  { id: 1, title: "票券連結" },
  { id: 2, title: "場館與定位" },
  { id: 3, title: "預算與住宿" },
  { id: 4, title: "啟動監控" }
];

export default function TaskInput({ onTaskAdded, onError, initialUrl }) {
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
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Stepper Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        {steps.map((step, idx) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: currentStep > step.id || (currentStep === 4 && submitState === 'success') ? 'var(--color-success)' : currentStep === step.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
              color: 'white', fontWeight: 'bold', fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}>
              {currentStep > step.id || (currentStep === 4 && submitState === 'success') ? <Check size={16} /> : step.id}
            </div>
            {idx < steps.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 12px',
                background: currentStep > step.id ? 'var(--color-success)' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease'
              }} />
            )}
          </div>
        ))}
      </div>
      
      <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>{steps[currentStep - 1].title}</h2>

      {/* Form Content */}
      <div style={{ position: 'relative', minHeight: '180px' }}>
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            style={{ width: '100%', position: 'absolute' }}
          >
            {currentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <LinkIcon size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    placeholder="貼上拓元等售票網站網址..."
                    className="glass-input"
                    style={{ paddingLeft: '44px', fontSize: '1.1rem' }}
                    autoFocus
                  />
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>系統將自動解析網頁並抓取活動資訊。</p>
              </div>
            )}

            {currentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    placeholder="目標場館 (選填，若留空將自動解析)"
                    className="glass-input"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                    <input
                      type="text"
                      name="departure"
                      value={formData.departure}
                      onChange={handleChange}
                      placeholder="您的出發地"
                      className="glass-input"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleLocate}
                    disabled={isLocating}
                    className="glass-button" 
                    style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', color: 'var(--color-secondary)' }}
                  >
                    {isLocating ? 'Loading...' : '📍 定位'}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="總預算 (TWD)"
                    className="glass-input"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
                
                <label className="glass-checkbox-wrapper" style={{ padding: '8px 4px' }}>
                  <input
                    type="checkbox"
                    name="needsAccommodation"
                    checked={formData.needsAccommodation}
                    onChange={handleChange}
                    className="glass-checkbox"
                  />
                  <span style={{ fontSize: '1rem', color: 'white' }}>需要安排周邊住宿推薦</span>
                </label>
              </div>
            )}

            {currentStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="接收通知的 Email"
                    className="glass-input"
                    style={{ paddingLeft: '44px', fontSize: '1.1rem' }}
                  />
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>當票券狀態改變或開賣時，我們將第一時間寄送 Email 通知您。</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '16px' }}>
        {currentStep > 1 ? (
          <button type="button" onClick={prevStep} className="glass-button" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <ChevronLeft size={18} /> 返回
          </button>
        ) : <div />}
        
        {currentStep < 4 ? (
          <button 
            type="button" 
            onClick={nextStep} 
            disabled={!validateStep(currentStep)}
            className="glass-button"
          >
            下一步 <ChevronRight size={18} />
          </button>
        ) : (
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitState !== 'idle' || !validateStep(4)}
            className="glass-button"
            style={{ width: '160px' }}
          >
            {getSubmitButtonText()}
          </button>
        )}
      </div>

    </div>
  );
}
