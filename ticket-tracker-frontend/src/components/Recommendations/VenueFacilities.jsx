import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Bath, BatteryCharging, MapPin, ChevronDown, ChevronUp, ExternalLink, Navigation } from 'lucide-react';

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
  { key: 'convenienceStores', label: '便利商店', icon: Store, color: '#10b981', emoji: '🏪' },
  { key: 'restrooms', label: '廁所', icon: Bath, color: '#3B82F6', emoji: '🚻' },
  { key: 'chargingStations', label: '行動電源租借', icon: BatteryCharging, color: '#F59E0B', emoji: '🔋' }
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
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Section Header */}
      <div 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', margin: 0 }}>
          <MapPin size={24} color="var(--color-secondary)" />
          場館周邊設施
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge" style={{
            background: 'var(--color-secondary)',
            color: '#FFFFFF',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}>
            {venue}
          </span>
          {isExpanded ? <ChevronUp size={20} color="var(--color-text-muted)" /> : <ChevronDown size={20} color="var(--color-text-muted)" />}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {CATEGORY_CONFIG.map(cat => {
              const count = (facilities[cat.key] || []).length;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '12px',
                    border: isActive ? `1px solid ${cat.color}` : '1px solid #E9ECEF',
                    background: isActive ? `${cat.color}10` : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{cat.emoji}</span>
                  <span style={{
                    fontSize: '0.75rem',
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
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {currentItems.length > 0 ? currentItems.map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className="glass-panel"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => {
                  const query = item.address || item.name;
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                }}
              >
                {/* Color accent bar */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                  background: activeCfg.color
                }} />

                {/* Icon */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: `${activeCfg.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <activeCfg.icon size={20} color={activeCfg.color} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {item.address || item.note || ''}
                  </div>
                </div>

                {/* Distance */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  flexShrink: 0
                }}>
                  <Navigation size={12} color={activeCfg.color} />
                  <span style={{ fontSize: '0.78rem', color: activeCfg.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {item.distance}
                  </span>
                </div>
              </motion.div>
            )) : (
              <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
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
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1px solid #E9ECEF',
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            whileHover={{ background: '#F8F9FA', borderColor: 'var(--color-secondary)' }}
          >
            <MapPin size={16} /> 在 Google Maps 上查看更多設施 <ExternalLink size={14} />
          </motion.a>
        </>
      )}
    </motion.div>
  );
}
