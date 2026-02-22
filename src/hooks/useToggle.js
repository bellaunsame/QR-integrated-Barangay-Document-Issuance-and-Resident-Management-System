import { useState, useCallback } from 'react';

/**
 * useToggle Hook
 * 
 * Simplifies boolean state management with toggle, setTrue, and setFalse helpers.
 * 
 * @param {boolean} initialValue - Initial boolean value (default: false)
 * @returns {[boolean, Object]} - [value, { toggle, setTrue, setFalse, setValue }]
 * 
 * @example
 * const [isOpen, { toggle, setTrue, setFalse }] = useToggle(false);
 * 
 * return (
 *   <>
 *     <button onClick={toggle}>Toggle</button>
 *     <button onClick={setTrue}>Open</button>
 *     <button onClick={setFalse}>Close</button>
 *     {isOpen && <Modal />}
 *   </>
 * );
 */
export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [
    value,
    {
      toggle,
      setTrue,
      setFalse,
      setValue
    }
  ];
};

export default useToggle;