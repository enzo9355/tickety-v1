import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function SkeletonCard() {
  return (
    <div className="min-w-[80%] md:min-w-[45%] snap-center relative rounded-lg overflow-hidden h-40 bg-white/5 opacity-70 flex flex-col">
      <div className="w-full h-[140px] bg-black/5 animate-pulse" />
    </div>
  );
}

export default function ConcertSection({ concerts: propConcerts }) {
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef(null);
  const [concerts, setConcerts] = useState(propConcerts || []);
  const [personalized, setPersonalized] = useState(false);
  const [basedOn, setBasedOn] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      apiClient.get('/api/concerts/recommended')
        .then(res => {
          setConcerts(res.data.concerts || []);
          setPersonalized(res.data.personalized || false);
          setBasedOn(res.data.based_on || []);
        })
        .catch(() => setConcerts(propConcerts || []))
        .finally(() => setLoading(false));
    } else {
      setConcerts(propConcerts || []);
      setPersonalized(false);
    }
  }, [isAuthenticated, propConcerts]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  const isEmpty = !loading && (!concerts || concerts.length === 0);

  if (isEmpty) {
    return (
      <div className="opacity-50 pointer-events-none grayscale glass-card rounded-xl p-md overflow-hidden mt-10">
        <h3 className="flex items-center gap-2 text-xl mb-4 text-[var(--color-text-muted)]">
          <span className="material-symbols-outlined text-2xl">music_note</span>
          近期演唱會推薦
        </h3>
        <div className="flex overflow-x-auto no-scrollbar gap-sm snap-x">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="glass-card rounded-xl p-md overflow-hidden mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-xl m-0 text-[var(--color-text)]">
          <span className="material-symbols-outlined text-2xl text-[var(--color-secondary)]">music_note</span>
          近期演唱會推薦
        </h3>
        <div className="flex items-center gap-2">
          {personalized && basedOn.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              <span className="material-symbols-outlined text-[12px]">person</span>
              為你推薦
            </div>
          )}
          {/* Scroll buttons */}
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-surface-variant disabled:opacity-30 hover:bg-surface-container-high transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-surface-variant disabled:opacity-30 hover:bg-surface-container-high transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {personalized && basedOn.length > 0 && (
        <p className="text-xs text-on-surface-variant mb-3 m-0 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
          根據你追蹤過的 <span className="font-medium text-primary">{basedOn.filter(Boolean).slice(0, 2).join('、')}</span> 排序
        </p>
      )}

      {loading ? (
        <div className="flex overflow-x-auto no-scrollbar gap-sm snap-x">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto no-scrollbar gap-sm snap-x"
        >
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
              <div className="absolute inset-0 z-0">
                <img src={concert.imageUrl} alt={concert.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
              </div>
              <div className="relative z-10 p-4 flex flex-col gap-2 h-full justify-end">
                <h4 className="m-0 text-base font-semibold text-white line-clamp-2">{concert.title}</h4>
                <div className="flex items-center gap-1.5 text-white/80 text-[0.85rem]">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  <span className="truncate">{concert.venue}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80 text-[0.85rem]">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  <span>{concert.date}</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function SkeletonCard() {
  return (
    <div className="min-w-[80%] md:min-w-[45%] snap-center relative rounded-lg overflow-hidden h-40 bg-white/5 opacity-70 flex flex-col">
      <div className="w-full h-[140px] bg-black/5 animate-pulse" />
    </div>
  );
}

export default function ConcertSection({ concerts: propConcerts }) {
  const { isAuthenticated } = useAuth();
  // Feature 8: state for personalized concerts
  const [concerts, setConcerts] = useState(propConcerts || []);
  const [personalized, setPersonalized] = useState(false);
  const [basedOn, setBasedOn] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Feature 8: if authenticated, fetch personalized recommendations
    if (isAuthenticated) {
      setLoading(true);
      apiClient.get('/api/concerts/recommended')
        .then(res => {
          setConcerts(res.data.concerts || []);
          setPersonalized(res.data.personalized || false);
          setBasedOn(res.data.based_on || []);
        })
        .catch(() => setConcerts(propConcerts || []))
        .finally(() => setLoading(false));
    } else {
      setConcerts(propConcerts || []);
      setPersonalized(false);
    }
  }, [isAuthenticated, propConcerts]);

  const isEmpty = !loading && (!concerts || concerts.length === 0);

  if (isEmpty) {
    return (
      <div className="opacity-50 pointer-events-none grayscale glass-card rounded-xl p-md overflow-hidden mt-10">
        <h3 className="flex items-center gap-2 text-xl mb-4 text-[var(--color-text-muted)]">
          <span className="material-symbols-outlined text-2xl">music_note</span>
          近期演唱會推薦
        </h3>
        <div className="flex overflow-x-auto no-scrollbar gap-sm snap-x">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="glass-card rounded-xl p-md overflow-hidden mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-xl m-0 text-[var(--color-text)]">
          <span className="material-symbols-outlined text-2xl text-[var(--color-secondary)]">music_note</span>
          近期演唱會推薦
        </h3>
        {/* Feature 8: personalized badge */}
        {personalized && basedOn.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-[12px]">person</span>
            為你推薦
          </div>
        )}
      </div>

      {/* Feature 8: personalization hint */}
      {personalized && basedOn.length > 0 && (
        <p className="text-xs text-on-surface-variant mb-3 m-0 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
          根據你追蹤過的 <span className="font-medium text-primary">{basedOn.filter(Boolean).slice(0, 2).join('、')}</span> 排序
        </p>
      )}

      {loading ? (
        <div className="flex overflow-x-auto no-scrollbar gap-sm snap-x">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
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
              <div className="absolute inset-0 z-0">
                <img src={concert.imageUrl} alt={concert.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
              </div>
              <div className="relative z-10 p-4 flex flex-col gap-2 h-full justify-end">
                <h4 className="m-0 text-base font-semibold text-white line-clamp-2">{concert.title}</h4>
                <div className="flex items-center gap-1.5 text-white/80 text-[0.85rem]">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  <span className="truncate">{concert.venue}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80 text-[0.85rem]">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  <span>{concert.date}</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </motion.div>
  );
}
