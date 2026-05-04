import React from 'react';
import { Home, Star } from 'lucide-react';

export default function AccommodationCard({ hotel }) {
  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', transition: 'transform 0.3s ease' }} 
         onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
         onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
      
      <div style={{ 
        width: '80px', 
        height: '80px', 
        borderRadius: '12px', 
        background: 'rgba(0, 170, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Home size={32} color="var(--color-text)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
        <div>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{hotel.name}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)', fontSize: '0.85rem' }}>
            <Star size={14} fill="currentColor" />
            <span>{hotel.rating} ({hotel.reviews} reviews)</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            距離場地 {hotel.distance}
          </span>
          <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
            {hotel.price} / 晚
          </span>
        </div>
      </div>
    </div>
  );
}
