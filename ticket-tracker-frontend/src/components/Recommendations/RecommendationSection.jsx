import React from 'react';
import { motion } from 'framer-motion';
import AccommodationCard from './AccommodationCard';
import TransitCard from './TransitCard';
import { Map, BedDouble, Info, Loader2 } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function SkeletonCard() {
  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', opacity: 0.7 }}>
      <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(0,0,0,0.04)' }} className="animate-pulse" />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', justifyContent: 'center' }}>
        <div style={{ width: '60%', height: '16px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px' }} className="animate-pulse" />
        <div style={{ width: '40%', height: '12px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px' }} className="animate-pulse" />
      </div>
    </div>
  );
}

export default function RecommendationSection({ selectedTask }) {
  
  if (!selectedTask) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Info size={32} color="#5A626A" />
          <p>請在左側選擇或建立任務以查看智慧推薦</p>
        </div>
        
        {/* Skeleton Previews */}
        <div style={{ opacity: 0.5, pointerEvents: 'none', filter: 'grayscale(1)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            <BedDouble size={24} />
            推薦住宿預覽
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  const venue = selectedTask?.venue;
  let accommodations = selectedTask?.accommodations || [];
  let transits = selectedTask?.transits || [];

  // Smart filtering simulation based on keywords
  const isConcert = venue && (venue.includes('巨蛋') || venue.includes('演唱會') || venue.includes('中心') || venue.includes('Arena'));
  if (isConcert) {
    // Simulate highlighting or boosting certain recommendations for concerts
    accommodations = accommodations.slice(0, 2); // Show top 2 for focused view
  }

  if (!venue) {
    return (
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Loader2 size={48} color="var(--color-primary)" className="animate-spin" />
        <p>正在透過 AI 解析售票網站與場地資訊中...<br/>請稍候</p>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .animate-spin { animation: spin 2s linear infinite; }
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        `}</style>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 2s linear infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>

      {selectedTask?.needsAccommodation && (
        <motion.div variants={itemVariants}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', margin: 0 }}>
              <BedDouble size={24} color="var(--color-primary)" />
              推薦住宿 ({venue})
            </h3>
            <span className="badge" style={{ 
              background: '#FF5B00', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' 
            }}>由 Agoda 推薦</span>
          </div>
          
          {accommodations && accommodations.length > 0 ? (
            <motion.div variants={containerVariants} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {accommodations.map((hotel, idx) => (
                <motion.div key={hotel.id || idx} variants={itemVariants}>
                  <AccommodationCard hotel={hotel} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              尚未找到鄰近推薦住宿
            </div>
          )}
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', margin: 0 }}>
            <Map size={24} color="var(--color-primary)" />
            交通建議
          </h3>
          <span className="badge" style={{ 
            background: '#00B3CC', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' 
          }}>由 Klook 推薦</span>
        </div>
        
        {transits && transits.length > 0 ? (
          <motion.div variants={containerVariants} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {transits.map((route, idx) => (
              <motion.div key={route.id || idx} variants={itemVariants}>
                <TransitCard route={route} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            尚未生成交通建議
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
