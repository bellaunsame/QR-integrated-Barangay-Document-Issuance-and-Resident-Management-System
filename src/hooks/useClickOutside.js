import { useEffect, useRef } from 'react';

/**
 * useClickOutside Hook
 * 
 * Detects clicks outside of a specified element.
 * Useful for modals, dropdowns, and popups.
 * 
 * @param {Function} handler - Function to call when clicked outside
 * @returns {React.RefObject} - Ref to attach to the element
 * 
 * @example
 * const ref = useClickOutside(() => {
 *   setIsOpen(false);
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {isOpen && <Dropdown />}
 *   </div>
 * );
 */
export const useClickOutside = (handler) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handler(event);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handler]);

  return ref;
};

export default useClickOutside;