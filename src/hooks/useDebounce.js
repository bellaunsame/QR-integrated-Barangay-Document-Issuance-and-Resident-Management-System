import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * 
 * Delays updating a value until after a specified delay.
 * Useful for search inputs, API calls, and performance optimization.
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 500ms)
 * @returns {any} - The debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // This will only run 500ms after user stops typing
 *   searchAPI(debouncedSearch);
 * }, [debouncedSearch]);
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function - cancel the timeout if value changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;