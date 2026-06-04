import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Static venue → nearby facilities mapping
// In production, this would come from Google Places API
const VENUE_FACILITIES = {
  '台北小巨蛋': {
    convenienceStores: [
      { name: '7-ELEVEN 小巨蛋門市', distance: '步行 1 分鐘', address: '台北市松山區南京東路四段 2 號' },
      { name: '全家 南京小巨蛋店', distance: '步行 2 分鐘', address: '台北市松山區南京東路四段 10 號' },
      { name: '萊爾富 松山南京店', distance: '步行 3 分鐘', address: '台北市松山區南京東路四段 50 號' }
    ],
    restrooms: [
      { name: '小巨蛋 1F 公共廁所', distance: '場內', note: '入場後右側' },
      { name: '小巨蛋 2F 公共廁所', distance: '場內', note: '電扶梯旁' },
      { name: '捷運台北小巨蛋站 廁所', distance: '步行 1 分鐘', note: '站內付費區' }
    ],
    chargingStations: [
      { name: 'ChargeSPOT 小巨蛋站', distance: '場內 1F', type: 'ChargeSPOT' },
      { name: 'ChargeSPOT 南京復興站', distance: '步行 5 分鐘', type: 'ChargeSPOT' }
    ]
  },
  '台北流行音樂中心': {
    convenienceStores: [
      { name: '7-ELEVEN 南港展覽門市', distance: '步行 3 分鐘', address: '台北市南港區經貿二路 1 號' },
      { name: '全家 南港軟體園區店', distance: '步行 5 分鐘', address: '台北市南港區園區街 3 號' }
    ],
    restrooms: [
      { name: '北流 1F 大廳廁所', distance: '場內', note: '大廳左側' },
      { name: '北流 2F 廁所', distance: '場內', note: '表演廳入口旁' }
    ],
    chargingStations: [
      { name: 'ChargeSPOT 北流大廳', distance: '場內 1F', type: 'ChargeSPOT' }
    ]
  },
  '高雄巨蛋': {
    convenienceStores: [
      { name: '7-ELEVEN 巨蛋門市', distance: '步行 2 分鐘', address: '高雄市左營區博愛二路 9 號' },
      { name: '全家 左營巨蛋店', distance: '步行 3 分鐘', address: '高雄市左營區博愛二路 366 號' }
    ],
    restrooms: [
      { name: '巨蛋 1F 公共廁所', distance: '場內', note: '東側入口' },
      { name: '巨蛋體育館 B1 廁所', distance: '場內', note: 'B1 美食街旁' }
    ],
    chargingStations: [
      { name: 'ChargeSPOT 巨蛋站', distance: '步行 1 分鐘', type: 'ChargeSPOT' }
    ]
  },
  '國家體育場': {
    convenienceStores: [
      { name: '7-ELEVEN 世運門市', distance: '步行 5 分鐘', address: '高雄市左營區世運大道 100 號' }
    ],
    restrooms: [
      { name: '國家體育場 公共廁所', distance: '場內', note: '各入口皆有' }
    ],
    chargingStations: []
  }
};

// Fallback: find best match from venue keywords
function findFacilities(venue) {
  if (!venue) return null;
  // Exact match
  if (VENUE_FACILITIES[venue]) return VENUE_FACILITIES[venue];
  // Partial match
  const key = Object.keys(VENUE_FACILITIES).find(k => venue.includes(k) || k.includes(venue));
  if (key) return VENUE_FACILITIES[key];
  return null;
}

const CATEGORY_CONFIG = [
  { key: 'convenienceStores', label: '便利商店', icon: 'store', color: '#10b981', emoji: '🏪' },
  { key: 'restrooms', label: '廁所', icon: 'wc', color: '#3B82F6', emoji: '🚻' },
  { key: 'chargingStations', label: '行動電源租借', icon: 'battery_charging_full', color: '#F59E0B', emoji: '🔋' }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function VenueFacilities({ selectedTask }) {
  const [activeCategory, setActiveCategory] = useState('convenienceStores');
  const [isExpanded, setIsExpanded] = useState(true);

  const venue = selectedTask?.venue;
  const facilities = findFacilities(venue);

  if (!venue || !facilities) {
    return null; // Don't render if no matching venue data
  }

  const currentItems = facilities[activeCategory] || [];
  const activeCfg = CATEGORY_CONFIG.find(c => c.key === activeCategory);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="glass-card rounded-xl p-md flex flex-col gap-4"
    >
      {/* Section Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="flex items-center gap-2 text-xl m-0">
          <span className="material-symbols-outlined text-2xl text-[var(--color-secondary)]">location_on</span>
          場館周邊設施
        </h3>
        <div className="flex items-center gap-2">
          <span className="badge bg-[var(--color-secondary)] text-white px-2 py-0.5 rounded text-[0.7rem] font-bold">
            {venue}
          </span>
          {isExpanded ? (
            <span className="material-symbols-outlined text-xl text-[var(--color-text-muted)]">expand_less</span>
          ) : (
            <span className="material-symbols-outlined text-xl text-[var(--color-text-muted)]">expand_more</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Category Tabs */}
          <div className="flex gap-2">
            {CATEGORY_CONFIG.map(cat => {
              const count = (facilities[cat.key] || []).length;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className="flex-1 px-2 py-2.5 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all duration-200"
                  style={{
                    border: isActive ? `1px solid ${cat.color}` : '1px solid #E9ECEF',
                    background: isActive ? `${cat.color}10` : '#FFFFFF'
                  }}
                >
                  <span className="text-[1.2rem]">{cat.emoji}</span>
                  <span className="text-[0.75rem]" style={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? cat.color : 'var(--color-text-muted)'
                  }}>
                    {cat.label} ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Facility List */}
          <motion.div
            key={activeCategory}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2.5"
          >
            {currentItems.length > 0 ? currentItems.map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className="glass-panel p-3.5 flex items-center gap-3 cursor-pointer relative overflow-hidden"
                onClick={() => {
                  const query = item.address || item.name;
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                }}
              >
                {/* Color accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: activeCfg.color }} />

                {/* Icon */}
                <div 
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: `${activeCfg.color}12` }}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ color: activeCfg.color }}>{activeCfg.icon}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[0.9rem] text-[var(--color-text)]">
                    {item.name}
                  </div>
                  <div className="text-[0.78rem] text-[var(--color-text-muted)] mt-[2px]">
                    {item.address || item.note || ''}
                  </div>
                </div>

                {/* Distance */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="material-symbols-outlined text-[12px]" style={{ color: activeCfg.color }}>near_me</span>
                  <span className="text-[0.78rem] font-semibold whitespace-nowrap" style={{ color: activeCfg.color }}>
                    {item.distance}
                  </span>
                </div>
              </motion.div>
            )) : (
              <div className="glass-panel p-5 text-center text-[var(--color-text-muted)] text-[0.9rem]">
                此場館暫無 {activeCfg.label} 資料
              </div>
            )}
          </motion.div>

          {/* Google Maps CTA */}
          <motion.a
            variants={itemVariants}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue + ' 附近便利商店')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-[10px] bg-white border border-[#E9ECEF] text-[var(--color-text-muted)] text-[0.85rem] no-underline transition-all duration-200 cursor-pointer hover:bg-[#F8F9FA] hover:border-[var(--color-secondary)]"
          >
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            在 Google Maps 上查看更多設施
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </motion.a>
        </>
      )}
    </motion.div>
  );
}
