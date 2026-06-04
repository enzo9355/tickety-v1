import React from 'react';
import { motion } from 'framer-motion';

export default function AccommodationCard({ hotel }) {
  return (
    <motion.div 
      className="glass-card rounded-xl p-md flex gap-4" 
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div className="w-[80px] h-[80px] rounded-xl flex items-center justify-center bg-[rgba(242,169,59,0.2)] shrink-0">
        <span className="material-symbols-rounded text-[32px] text-[var(--color-text)]">home</span>
      </div>

      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-[1.1rem] mb-1 m-0">{hotel.name}</h4>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button px-3 py-1 text-[0.85rem] w-auto bg-black/5 text-[var(--color-text)] no-underline rounded-lg whitespace-nowrap"
            >
              查看/訂房
            </a>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-warning)] text-[0.85rem]">
            <span className="material-symbols-rounded text-[14px]">star</span>
            <span>{hotel.rating} ({hotel.reviews} reviews)</span>
          </div>
        </div>
        
        <div className="flex justify-between items-end mt-2">
          <span className="text-[var(--color-text-muted)] text-[0.85rem]">
            距離場地 {hotel.distance}
          </span>
          <span className="text-[var(--color-primary)] font-semibold">
            {hotel.price} / 晚
          </span>
        </div>
      </div>
    </motion.div>
  );
}
