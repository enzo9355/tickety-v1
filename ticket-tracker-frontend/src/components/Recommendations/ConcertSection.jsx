import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function SkeletonConcertCard() {
  return (
    <div className="min-w-[80%] md:min-w-[45%] snap-center relative rounded-lg overflow-hidden h-40 bg-white/5 opacity-70 flex flex-col">
      <div className="w-full h-[140px] bg-black/5 animate-pulse" />
      <div className="p-4 flex flex-col gap-3">
        <div className="w-4/5 h-4 bg-black/5 rounded animate-pulse" />
        <div className="w-1/2 h-3 bg-black/5 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function ConcertSection({ concerts }) {
  if (!concerts || concerts.length === 0) {
    return (
      <div className="opacity-50 pointer-events-none grayscale glass-card rounded-xl p-md overflow-hidden mt-10">
        <h3 className="flex items-center gap-2 text-xl mb-4 text-[var(--color-text-muted)]">
          <span className="material-symbols-outlined text-2xl">music_note</span>
          近期演唱會推薦
        </h3>
        <div className="flex overflow-x-auto no-scrollbar gap-sm snap-x">
          <SkeletonConcertCard />
          <SkeletonConcertCard />
          <SkeletonConcertCard />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="glass-card rounded-xl p-md overflow-hidden mt-10">
      <h3 className="flex items-center gap-2 text-xl mb-4 text-[var(--color-text)]">
        <span className="material-symbols-outlined text-2xl text-[var(--color-secondary)]">music_note</span>
        近期演唱會推薦
      </h3>
      <div className="flex overflow-x-auto no-scrollbar gap-sm snap-x">
        {concerts.map((concert, idx) => (
          <motion.a 
            key={idx}
            href={concert.url}
            target="_blank"
            rel="noopener noreferrer"
            variants={itemVariants}
            whileHover={{ y: -4, borderColor: 'rgba(232,86,10,0.5)' }}
            className="min-w-[80%] md:min-w-[45%] snap-center relative rounded-lg overflow-hidden h-40 flex flex-col no-underline text-inherit glass-panel"
          >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <img src={concert.imageUrl} alt={concert.title} className="w-full h-full object-cover" />
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
            </div>
            
            {/* Content layered on top */}
            <div className="relative z-10 p-4 flex flex-col gap-2 h-full justify-end">
              <h4 className="m-0 text-base font-semibold text-white line-clamp-2">{concert.title}</h4>
              <div className="flex items-center gap-1.5 text-white/80 text-[0.85rem]">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{concert.venue}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80 text-[0.85rem]">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                <span>{concert.date}</span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
}
