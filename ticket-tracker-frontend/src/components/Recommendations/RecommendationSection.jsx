import React from 'react';
import { motion } from 'framer-motion';
import AccommodationCard from './AccommodationCard';
import TransitCard from './TransitCard';

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
    <div className="glass-panel flex gap-4 p-5 opacity-70">
      <div className="w-[60px] h-[60px] rounded-xl bg-black/5 animate-pulse" />
      <div className="flex flex-col flex-1 gap-3 justify-center">
        <div className="w-[60%] h-4 bg-black/5 rounded animate-pulse" />
        <div className="w-[40%] h-3 bg-black/5 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function RecommendationSection({ selectedTask }) {
  
  if (!selectedTask) {
    return (
      <div className="flex flex-col gap-md">
        <div className="glass-panel p-8 text-center text-[var(--color-text-muted)] flex flex-col items-center gap-3">
          <span className="material-symbols-rounded text-3xl text-[#5A626A]">info</span>
          <p>請在左側選擇或建立任務以查看智慧推薦</p>
        </div>
        
        {/* Skeleton Previews */}
        <div className="opacity-50 pointer-events-none grayscale">
          <h3 className="flex items-center gap-2 text-xl mb-4 text-[var(--color-text-muted)]">
            <span className="material-symbols-rounded text-2xl">bed</span>
            推薦住宿預覽
          </h3>
          <div className="flex flex-col gap-4">
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
      <div className="glass-panel p-[60px] text-center text-[var(--color-text-muted)] flex flex-col items-center gap-4">
        <span className="material-symbols-rounded text-5xl text-[var(--color-primary)] animate-spin">progress_activity</span>
        <p>正在透過 AI 解析售票網站與場地資訊中...<br/>請稍候</p>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-md"
    >
      {selectedTask?.needsAccommodation && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="flex items-center gap-2 text-xl m-0">
              <span className="material-symbols-rounded text-2xl text-[var(--color-primary)]">bed</span>
              推薦住宿 ({venue})
            </h3>
            <span className="badge bg-[#FF5B00] text-white px-2 py-0.5 rounded text-[0.7rem] font-bold">由 Agoda 推薦</span>
          </div>
          
          {accommodations && accommodations.length > 0 ? (
            <motion.div variants={containerVariants} className="flex flex-col gap-4">
              {accommodations.map((hotel, idx) => (
                <motion.div key={hotel.id || idx} variants={itemVariants}>
                  <AccommodationCard hotel={hotel} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="glass-panel p-5 text-center text-[var(--color-text-muted)]">
              尚未找到鄰近推薦住宿
            </div>
          )}
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="flex items-center gap-2 text-xl m-0">
            <span className="material-symbols-rounded text-2xl text-[var(--color-primary)]">map</span>
            交通建議
          </h3>
          <span className="badge bg-[#00B3CC] text-white px-2 py-0.5 rounded text-[0.7rem] font-bold">由 Klook 推薦</span>
        </div>
        
        {transits && transits.length > 0 ? (
          <motion.div variants={containerVariants} className="flex flex-col gap-4">
            {transits.map((route, idx) => (
              <motion.div key={route.id || idx} variants={itemVariants}>
                <TransitCard route={route} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="glass-panel p-5 text-center text-[var(--color-text-muted)]">
            尚未生成交通建議
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
