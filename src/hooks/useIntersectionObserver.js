import { useState, useEffect, useRef } from 'react';

/**
 * useIntersectionObserver Hook
 * 
 * Detects when an element enters or leaves the viewport.
 * Useful for lazy loading, infinite scroll, and animations.
 * 
 * @param {Object} options - IntersectionObserver options
 * @returns {[React.RefObject, boolean]} - [ref, isIntersecting]
 * 
 * @example
 * const [ref, isVisible] = useIntersectionObserver({
 *   threshold: 0.5,
 *   rootMargin: '0px'
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {isVisible ? <Component /> : <Placeholder />}
 *   </div>
 * );
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      
      // Track if element has ever intersected (useful for one-time animations)
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, {
      threshold: options.threshold || 0,
      rootMargin: options.rootMargin || '0px',
      root: options.root || null
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.threshold, options.rootMargin, options.root, hasIntersected]);

  return [ref, isIntersecting, hasIntersected];
};

/**
 * useInfiniteScroll Hook
 * 
 * Detects when user scrolls to bottom for infinite scrolling.
 * 
 * @param {Function} callback - Function to call when scrolled to bottom
 * @param {Object} options - Options for intersection observer
 * @returns {React.RefObject} - Ref to attach to bottom element
 * 
 * @example
 * const bottomRef = useInfiniteScroll(() => {
 *   loadMoreData();
 * });
 * 
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={bottomRef}>Loading more...</div>
 *   </div>
 * );
 */
export const useInfiniteScroll = (callback, options = {}) => {
  const [ref, isIntersecting] = useIntersectionObserver(options);

  useEffect(() => {
    if (isIntersecting) {
      callback();
    }
  }, [isIntersecting, callback]);

  return ref;
};

export default useIntersectionObserver;