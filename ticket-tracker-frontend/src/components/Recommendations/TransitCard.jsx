import React from 'react';
import { Train, Navigation, Footprints, Bus, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TransitCard({ route }) {
  const renderStepIcon = (mode) => {
    if (mode === 'WALKING') return <Footprints size={16} color="var(--color-text-muted)" />;
    if (mode === 'TRANSIT') return <Bus size={16} color="var(--color-primary)" />;
    return <Navigation size={16} color="var(--color-text-muted)" />;
  };

  return (
    <motion.div 
      className="glass-panel" 
      whileHover={{ y: -4, scale: 1.01 }}
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          borderRadius: '12px', 
          background: 'rgba(232, 86, 10, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Train size={24} color="var(--color-primary)" />
        </div>
        
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
            {route.title}
          </h4>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              ⏱ 總時長 {route.duration}
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              💰 總花費 {route.cost}
            </span>
          </div>
        </div>
      </div>

      {route.full_steps && route.full_steps.length > 0 ? (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {route.full_steps.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: idx !== route.full_steps.length - 1 ? '24px' : '0' }}>
              {/* Timeline connecting line */}
              {idx !== route.full_steps.length - 1 && (
                <div style={{ position: 'absolute', left: '15px', top: '30px', bottom: '0', width: '2px', background: 'rgba(255,255,255,0.1)' }} />
              )}
              
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.05)',
                border: '2px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}>
                {renderStepIcon(step.mode)}
              </div>
              
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>{step.instruction}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap', marginLeft: '12px' }}>{step.duration}</span>
                </div>
                {step.line && (
                  <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={12} /> 搭乘 {step.line} ({step.num_stops} 站)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
          {route.description}
        </p>
      )}
      
    </motion.div>
  );
}
