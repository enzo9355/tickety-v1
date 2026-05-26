import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ChevronDown, ChevronUp, ExternalLink, Percent, Tag } from 'lucide-react';

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
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Section Header */}
      <div 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', margin: 0 }}>
          <CreditCard size={24} color="var(--color-primary)" />
          刷卡優惠推薦
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {detectedPlatform && (
            <span className="badge" style={{
              background: PLATFORM_MAP[detectedPlatform].color,
              color: '#FFFFFF',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {PLATFORM_MAP[detectedPlatform].name} 專屬
            </span>
          )}
          {isExpanded ? <ChevronUp size={20} color="var(--color-text-muted)" /> : <ChevronDown size={20} color="var(--color-text-muted)" />}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Platform Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterPlatform('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                border: filterPlatform === 'all' ? '1px solid var(--color-primary)' : '1px solid #E9ECEF',
                background: filterPlatform === 'all' ? 'rgba(255, 91, 0, 0.08)' : '#FFFFFF',
                color: filterPlatform === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              全部平台
            </button>
            {Object.entries(PLATFORM_MAP).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setFilterPlatform(prev => prev === key ? 'all' : key)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: filterPlatform === key ? `1px solid ${val.color}` : '1px solid #E9ECEF',
                  background: filterPlatform === key ? `${val.color}12` : '#FFFFFF',
                  color: filterPlatform === key ? val.color : 'var(--color-text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {val.name}
              </button>
            ))}
          </div>

          {/* Cards */}
          <motion.div variants={containerVariants} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredDeals.map(deal => (
              <motion.div
                key={deal.id}
                variants={itemVariants}
                whileHover={{ y: -2, boxShadow: '0 6px 24px rgba(0,0,0,0.1)' }}
                className="glass-panel"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => window.open(deal.link, '_blank')}
              >
                {/* Bank Color Accent */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                  background: deal.color
                }} />

                {/* Icon */}
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: `${deal.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CreditCard size={24} color={deal.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                      {deal.bank} {deal.card}
                    </span>
                    {deal.highlight && (
                      <span className="badge" style={{
                        background: 'var(--color-warning)',
                        color: '#FFFFFF',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold'
                      }}>
                        推薦
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    {deal.description}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {deal.platforms.map(p => (
                      <span key={p} style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: `${PLATFORM_MAP[p].color}12`,
                        color: PLATFORM_MAP[p].color,
                        fontWeight: 500
                      }}>
                        {PLATFORM_MAP[p].name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Discount Badge */}
                <div style={{
                  textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px'
                }}>
                  <span style={{
                    color: deal.color,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    whiteSpace: 'nowrap'
                  }}>
                    {deal.discount}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    至 {deal.validUntil}
                  </span>
                </div>

                <ExternalLink size={16} color="var(--color-text-muted)" style={{ flexShrink: 0, opacity: 0.5 }} />
              </motion.div>
            ))}
          </motion.div>

          {/* Disclaimer */}
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: 0, opacity: 0.7 }}>
            ⚠️ 優惠資訊僅供參考，實際回饋以各銀行公告為準
          </p>
        </>
      )}
    </motion.div>
  );
}
