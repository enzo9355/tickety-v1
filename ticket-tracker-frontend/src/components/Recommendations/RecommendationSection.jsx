import React from 'react';
import AccommodationCard from './AccommodationCard';
import TransitCard from './TransitCard';
import { Map, BedDouble, Info, Loader2 } from 'lucide-react';

export default function RecommendationSection({ selectedTask }) {
  
  if (!selectedTask) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <Info size={48} color="rgba(255,255,255,0.2)" />
        <p>請在左側選擇任務以查看推薦內容</p>
      </div>
    );
  }

  // 安全地使用 Optional Chaining 解析資料
  const venue = selectedTask?.venue;
  const accommodations = selectedTask?.accommodations || [];
  const transits = selectedTask?.transits || [];

  if (!venue) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <Loader2 size={48} color="var(--color-primary)" className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
        <p>正在分析售票網站與場地資訊中...<br/>請稍候</p>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {selectedTask?.needsAccommodation && (
        <div className="animate-fade-in animate-delay-1">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', marginBottom: '16px' }}>
            <BedDouble size={24} color="var(--color-primary)" />
            推薦住宿 ({venue})
          </h3>
          
          {accommodations && accommodations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {accommodations.map((hotel, idx) => (
                <AccommodationCard key={hotel.id || idx} hotel={hotel} />
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              尚未找到鄰近推薦住宿
            </div>
          )}
        </div>
      )}

      <div className="animate-fade-in animate-delay-2">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', marginBottom: '16px' }}>
          <Map size={24} color="var(--color-primary)" />
          交通建議
        </h3>
        
        {transits && transits.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {transits.map((route, idx) => (
              <TransitCard key={route.id || idx} route={route} />
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            尚未生成交通建議
          </div>
        )}
      </div>
    </div>
  );
}
