import React, { useState } from 'react';
import { motion } from 'framer-motion';

const CREDIT_CARD_DEALS = [
  {
    id: 1,
    bank: '國泰世華',
    card: 'CUBE 卡',
    color: '#00695C',
    platforms: ['tixcraft', 'kktix'],
    discount: '最高 3% 回饋',
    description: '於拓元、KKTIX 刷卡購票，小樹點最高 3 倍回饋',
    validUntil: '2026/12/31',
    link: 'https://www.cathaybk.com.tw/cathaybk/',
    highlight: true
  },
  {
    id: 2,
    bank: '中國信託',
    card: 'LINE Pay 卡',
    color: '#06C755',
    platforms: ['tixcraft', 'ticketplus', 'kktix'],
    discount: 'LINE Points 2%',
    description: '所有售票平台消費享 LINE Points 2% 點數回饋',
    validUntil: '2026/12/31',
    link: 'https://www.ctbcbank.com/',
    highlight: false
  },
  {
    id: 3,
    bank: '玉山銀行',
    card: 'U Bear 卡',
    color: '#1A237E',
    platforms: ['tixcraft'],
    discount: '拓元 5% 回饋',
    description: '拓元售票獨家合作，新戶首刷最高享 5% 現金回饋',
    validUntil: '2026/09/30',
    link: 'https://www.esunbank.com/',
    highlight: true
  },
  {
    id: 4,
    bank: '台新銀行',
    card: 'FlyGo 卡',
    color: '#E65100',
    platforms: ['kktix', 'ticketplus'],
    discount: '最高 2.8% 回饋',
    description: 'KKTIX、TicketPlus 消費享現金回饋 2.8%，無上限',
    validUntil: '2026/12/31',
    link: 'https://www.taishinbank.com.tw/',
    highlight: false
  },
  {
    id: 5,
    bank: '永豐銀行',
    card: 'DAWHO 卡',
    color: '#4A148C',
    platforms: ['tixcraft', 'kktix'],
    discount: '國內 2% / 海外 3%',
    description: '售票平台購票享國內 2% 回饋，海外表演票券 3% 回饋',
    validUntil: '2026/12/31',
    link: 'https://dawho.tw/',
    highlight: false
  }
];

const PLATFORM_MAP = {
  tixcraft: { name: '拓元', color: '#FF5B00' },
  kktix: { name: 'KKTIX', color: '#00B3CC' },
  ticketplus: { name: 'TicketPlus', color: '#6C63FF' }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

export default function CreditCardDeals({ selectedTask }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState('all');

  // Detect platform from task URL
  const detectedPlatform = selectedTask?.url
    ? Object.keys(PLATFORM_MAP).find(p => selectedTask.url.toLowerCase().includes(p))
    : null;

  const activePlatform = filterPlatform !== 'all' ? filterPlatform : detectedPlatform;

  const filteredDeals = activePlatform
    ? CREDIT_CARD_DEALS.filter(deal => deal.platforms.includes(activePlatform))
    : CREDIT_CARD_DEALS;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="glass-card rounded-xl p-md flex flex-col justify-between gap-4"
    >
      {/* Section Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="flex items-center gap-2 text-xl m-0">
          <span className="material-symbols-outlined text-2xl text-[var(--color-primary)]">credit_card</span>
          刷卡優惠推薦
        </h3>
        <div className="flex items-center gap-2">
          {detectedPlatform && (
            <span className="badge text-white px-2 py-0.5 rounded text-[0.7rem] font-bold" style={{ background: PLATFORM_MAP[detectedPlatform].color }}>
              {PLATFORM_MAP[detectedPlatform].name} 專屬
            </span>
          )}
          {isExpanded ? (
            <span className="material-symbols-outlined text-xl text-[var(--color-text-muted)]">expand_less</span>
          ) : (
            <span className="material-symbols-outlined text-xl text-[var(--color-text-muted)]">expand_more</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Platform Filter Chips */}
          <div className="flex gap-2 flex-nowrap overflow-x-auto touch-pan-x no-scrollbar md:flex-wrap md:overflow-visible">
            <button
              onClick={() => setFilterPlatform('all')}
              className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-200"
              style={{
                border: filterPlatform === 'all' ? '1px solid var(--color-primary)' : '1px solid #E9ECEF',
                background: filterPlatform === 'all' ? 'rgba(255, 91, 0, 0.08)' : '#FFFFFF',
                color: filterPlatform === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)'
              }}
            >
              全部平台
            </button>
            {Object.entries(PLATFORM_MAP).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setFilterPlatform(prev => prev === key ? 'all' : key)}
                className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-200"
                style={{
                  border: filterPlatform === key ? `1px solid ${val.color}` : '1px solid #E9ECEF',
                  background: filterPlatform === key ? `${val.color}12` : '#FFFFFF',
                  color: filterPlatform === key ? val.color : 'var(--color-text-muted)'
                }}
              >
                {val.name}
              </button>
            ))}
          </div>

          {/* Cards */}
          <motion.div variants={containerVariants} className="flex flex-col gap-3">
            {filteredDeals.map(deal => (
              <motion.div
                key={deal.id}
                variants={itemVariants}
                whileHover={{ y: -2, boxShadow: '0 6px 24px rgba(0,0,0,0.1)' }}
                className="glass-panel relative overflow-hidden cursor-pointer"
                onClick={() => window.open(deal.link, '_blank')}
              >
                <div className="flex flex-col items-start gap-3 p-3.5 md:flex-row md:items-center md:gap-4 md:p-4">
                  {/* Bank Color Accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: deal.color }} />

                  {/* Icon */}
                  <div 
                    className="flex items-center justify-center shrink-0 w-9 h-9 rounded-lg md:w-12 md:h-12 md:rounded-xl"
                    style={{ background: `${deal.color}15` }}
                  >
                    <span className="material-symbols-outlined text-[18px] md:text-[24px]" style={{ color: deal.color }}>credit_card</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[0.95rem] text-[var(--color-text)]">
                        {deal.bank} {deal.card}
                      </span>
                      {deal.highlight && (
                        <span className="badge bg-[var(--color-warning)] text-white px-1.5 py-[1px] rounded-[3px] text-[0.65rem] font-bold">
                          推薦
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-[0.82rem] text-[var(--color-text-muted)] leading-snug">
                      {deal.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {deal.platforms.map(p => (
                        <span key={p} className="text-[0.7rem] px-1.5 py-[1px] rounded-[3px] font-medium" style={{ background: `${PLATFORM_MAP[p].color}12`, color: PLATFORM_MAP[p].color }}>
                          {PLATFORM_MAP[p].name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Discount Badge */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="font-bold text-[0.95rem] whitespace-nowrap" style={{ color: deal.color }}>
                      {deal.discount}
                    </span>
                    <span className="text-[0.7rem] text-[var(--color-text-muted)]">
                      至 {deal.validUntil}
                    </span>
                  </div>

                  <span className="material-symbols-outlined shrink-0 opacity-50 text-[16px] text-[var(--color-text-muted)]">open_in_new</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Disclaimer */}
          <p className="text-[0.75rem] text-[var(--color-text-muted)] text-center m-0 opacity-70">
            ⚠️ 優惠資訊僅供參考，實際回饋以各銀行公告為準
          </p>
        </>
      )}
    </motion.div>
  );
}
