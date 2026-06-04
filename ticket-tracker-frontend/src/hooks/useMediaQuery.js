import { useState, useEffect } from 'react';

export function useMediaQuery() {
  const [screenSize, setScreenSize] = useState({
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    width: window.innerWidth
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setScreenSize({
        isMobile: w < 768,
        isTablet: w >= 768 && w < 1024,
        isDesktop: w >= 1024,
        width: w
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}
