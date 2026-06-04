import React from 'react';
import { motion } from 'framer-motion';

export default function TransitCard({ route }) {
  const renderStepIcon = (mode) => {
    if (mode === 'WALKING') return <span className="material-symbols-rounded text-[16px] text-[var(--color-text-muted)]">directions_walk</span>;
    if (mode === 'TRANSIT') return <span className="material-symbols-rounded text-[16px] text-[var(--color-primary)]">directions_bus</span>;
    return <span className="material-symbols-rounded text-[16px] text-[var(--color-text-muted)]">near_me</span>;
  };

  return (
    <motion.div 
      className="glass-card rounded-xl p-md flex flex-col gap-5" 
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div className="flex items-center gap-4">
        <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(232,86,10,0.2)] flex items-center justify-center shrink-0">
          <span className="material-symbols-rounded text-[24px] text-[var(--color-primary)]">train</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-[1.2rem] mb-1 m-0">
            {route.title}
          </h4>
          <div className="flex gap-3 flex-wrap">
            <span className="text-[var(--color-text-muted)] text-[0.9rem]">
              ⏱ 總時長 {route.duration}
            </span>
            <span className="text-[var(--color-text-muted)] text-[0.9rem]">
              💰 總花費 {route.cost}
            </span>
          </div>
        </div>
      </div>

      {route.full_steps && route.full_steps.length > 0 ? (
        <div className="mt-2 flex flex-col gap-0">
          {route.full_steps.map((step, idx) => (
            <div key={idx} className={`flex gap-4 relative ${idx !== route.full_steps.length - 1 ? 'pb-6' : 'pb-0'}`}>
              {idx !== route.full_steps.length - 1 && (
                <div className="absolute left-[15px] top-[30px] bottom-0 w-[2px] bg-black/10" />
              )}
              
              <div className="w-[32px] h-[32px] rounded-full bg-black/5 border-2 border-black/10 flex items-center justify-center z-10 shrink-0">
                {renderStepIcon(step.mode)}
              </div>
              
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex justify-between items-start gap-3">
                  <span className="text-[0.95rem] leading-[1.4] break-words">{step.instruction}</span>
                  <span className="text-[var(--color-text-muted)] text-[0.85rem] whitespace-nowrap shrink-0">{step.duration}</span>
                </div>
                {step.line && (
                  <div className="mt-1 text-[0.85rem] text-[var(--color-primary)] flex items-center gap-1">
                    <span className="material-symbols-rounded text-[12px]">info</span>
                    搭乘 {step.line} ({step.num_stops} 站)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[var(--color-text-muted)] text-[0.9rem] leading-[1.4] m-0">
          {route.description}
        </p>
      )}
    </motion.div>
  );
}
