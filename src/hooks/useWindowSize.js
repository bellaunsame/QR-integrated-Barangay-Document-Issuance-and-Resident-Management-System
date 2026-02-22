import { useState, useEffect } from 'react';

/**
 * useWindowSize Hook
 * 
 * Tracks window dimensions and provides breakpoint helpers.
 * 
 * @returns {Object} - { width, height, isMobile, isTablet, isDesktop }
 * 
 * @example
 * const { width, height, isMobile } = useWindowSize();
 * 
 * if (isMobile) {
 *   return <MobileView />;
 * }
 * 
 * return <DesktopView />;
 */
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  // Breakpoint helpers
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const isDesktop = windowSize.width >= 1024;

  return {
    width: windowSize.width,
    height: windowSize.height,
    isMobile,
    isTablet,
    isDesktop
  };
};

export default useWindowSize;