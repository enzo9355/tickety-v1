import React, { useState } from 'react';
import { Send, MapPin, DollarSign, Mail, Link as LinkIcon } from 'lucide-react';
import apiClient from '../../api/client';

export default function TaskInput({ onTaskAdded, onError }) {
  const [formData, setFormData] = useState({
    url: '',
    email: '',
    venue: '',
    departure: '',
    budget: '',
    needsAccommodation: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.url || !formData.email) return;

    setIsLoading(true);
    try {
      // 實際打 API
      const response = await apiClient.post('/tasks', formData);
      onTaskAdded(response.data);
      
      // Reset form on success
      setFormData({
        url: '',
        email: '',
        venue: '',
        departure: '',
        budget: '',
        needsAccommodation: false
      });
    } catch (error) {
      console.error("Failed to create task", error);
      // 若連線失敗或後端回傳錯誤
      const errorMsg = error.response?.data?.detail || error.message || '連線至後端失敗，請確認 API 伺服器是否運行中。';
      onError(`建立任務失敗：${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--color-primary)' }}>●</span> 新增追蹤任務
      </h2>
      
      <div style={{ position: 'relative' }}>
        <LinkIcon size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
        <input
          type="url"
          name="url"
          value={formData.url}
          onChange={handleChange}
          placeholder="目標售票網站網址"
          className="glass-input"
          style={{ paddingLeft: '40px' }}
          required
        />
      </div>

      <div style={{ position: 'relative' }}>
        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="使用者 Email (接收通知)"
          className="glass-input"
          style={{ paddingLeft: '40px' }}
          required
        />
      </div>

      <div style={{ position: 'relative' }}>
        <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
        <input
          type="text"
          name="venue"
          value={formData.venue}
          onChange={handleChange}
          placeholder="目標場館 (選填)"
          className="glass-input"
          style={{ paddingLeft: '40px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              name="departure"
              value={formData.departure}
              onChange={handleChange}
              placeholder="出發地"
              className="glass-input"
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>
          <button 
            type="button" 
            onClick={handleLocate}
            disabled={isLocating}
            className="glass-button" 
            style={{ width: 'auto', padding: '0 12px', background: 'rgba(255,255,255,0.1)', fontSize: '0.9rem' }}
            title="自動定位目前位置"
          >
            {isLocating ? 'Loading...' : '📍 定位'}
          </button>
        </div>
        
        <div style={{ position: 'relative' }}>
          <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            placeholder="總預算"
            className="glass-input"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      <label className="glass-checkbox-wrapper" style={{ marginTop: '4px' }}>
        <input
          type="checkbox"
          name="needsAccommodation"
          checked={formData.needsAccommodation}
          onChange={handleChange}
          className="glass-checkbox"
        />
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>需要安排住宿</span>
      </label>

      <button type="submit" className="glass-button" disabled={isLoading} style={{ marginTop: '8px' }}>
        <Send size={18} />
        {isLoading ? '處理中...' : '啟動監控'}
      </button>
    </form>
  );
}
