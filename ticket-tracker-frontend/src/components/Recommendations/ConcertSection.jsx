import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Music } from 'lucide-react';

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
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: 0.7 }}>
      <div style={{ width: '100%', height: '140px', background: 'rgba(255,255,255,0.05)' }} className="animate-pulse" />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '80%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} className="animate-pulse" />
        <div style={{ width: '50%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} className="animate-pulse" />
      </div>
    </div>
  );
}

export default function ConcertSection({ concerts }) {
  if (!concerts || concerts.length === 0) {
    return (
      <div style={{ opacity: 0.5, pointerEvents: 'none', filter: 'grayscale(1)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', marginBottom: '16px', color: 'var(--color-text-muted)' }}>
          <Music size={24} />
          近期演唱會推薦
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <SkeletonConcertCard />
          <SkeletonConcertCard />
          <SkeletonConcertCard />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ marginTop: '40px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', marginBottom: '16px', color: 'var(--color-text)' }}>
        <Music size={24} color="var(--color-secondary)" />
        近期演唱會推薦
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {concerts.map((concert, idx) => (
          <motion.a 
            key={idx}
            href={concert.url}
            target="_blank"
            rel="noopener noreferrer"
            variants={itemVariants}
            whileHover={{ y: -4, borderColor: 'rgba(232,86,10,0.5)' }}
            className="glass-panel"
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
          >
            <img src={concert.imageUrl} alt={concert.title} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{concert.title}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 'auto' }}>
                <MapPin size={14} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{concert.venue}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                <Calendar size={14} /> {concert.date}
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
}
