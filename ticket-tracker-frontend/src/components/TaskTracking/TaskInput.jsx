import React, { useState } from 'react';
import { Send, MapPin, DollarSign, Mail, Link as LinkIcon } from 'lucide-react';
import apiClient from '../../api/client';

export default function TaskInput({ onTaskAdded, onError }) {
  const [formData, setFormData] = useState({
    url: '',
    email: '',
    departure: '',
    budget: '',
    needsAccommodation: false
  });
  const [isLoading, setIsLoading] = useState(false);

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            name="departure"
            value={formData.departure}
            onChange={handleChange}
            placeholder="出發地"
            className="glass-input"
            style={{ paddingLeft: '40px' }}
          />
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
