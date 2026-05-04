import React from 'react';
import { Train, Navigation } from 'lucide-react';

export default function TransitCard({ route }) {
  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', transition: 'transform 0.3s ease' }}
         onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
         onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
      
      <div style={{ 
        width: '60px', 
        height: '60px', 
        borderRadius: '12px', 
        background: 'rgba(176, 38, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Train size={24} color="var(--color-primary)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
        <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={16} color="var(--color-text-muted)" />
          {route.title}
        </h4>
        
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
          {route.description}
        </p>
        
        <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            ⏱ 預估 {route.duration}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            💰 約 {route.cost}
          </span>
        </div>
      </div>
    </div>
  );
}
