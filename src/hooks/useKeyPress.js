import { useState, useEffect } from 'react';

/**
 * useKeyPress Hook
 * 
 * Detects when a specific key is pressed.
 * Useful for keyboard shortcuts and accessibility.
 * 
 * @param {string} targetKey - Key to detect (e.g., 'Enter', 'Escape', 'ArrowDown')
 * @param {Function} handler - Optional callback when key is pressed
 * @returns {boolean} - Whether the key is currently pressed
 * 
 * @example
 * const enterPressed = useKeyPress('Enter');
 * 
 * useEffect(() => {
 *   if (enterPressed) {
 *     handleSubmit();
 *   }
 * }, [enterPressed]);
 * 
 * // Or with callback
 * useKeyPress('Escape', () => {
 *   closeModal();
 * });
 */
export const useKeyPress = (targetKey, handler = null) => {
  const [keyPressed, setKeyPressed] = useState(false);

  useEffect(() => {
    const downHandler = ({ key }) => {
      if (key === targetKey) {
        setKeyPressed(true);
        if (handler) {
          handler();
        }
      }
    };

    const upHandler = ({ key }) => {
      if (key === targetKey) {
        setKeyPressed(false);
      }
    };

    // Add event listeners
    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey, handler]);

  return keyPressed;
};

/**
 * useKeyCombo Hook
 * 
 * Detects keyboard combinations (e.g., Ctrl+S, Cmd+K)
 * 
 * @param {Object} keys - Keys to detect { ctrl, shift, alt, key }
 * @param {Function} handler - Callback when combo is pressed
 * 
 * @example
 * useKeyCombo({ ctrl: true, key: 's' }, (e) => {
 *   e.preventDefault();
 *   handleSave();
 * });
 */
export const useKeyCombo = (keys, handler) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const { ctrl = false, shift = false, alt = false, meta = false, key } = keys;

      const ctrlPressed = ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftPressed = shift ? event.shiftKey : !event.shiftKey;
      const altPressed = alt ? event.altKey : !event.altKey;
      const metaPressed = meta ? event.metaKey : !event.metaKey;
      const keyPressed = key ? event.key.toLowerCase() === key.toLowerCase() : true;

      if (ctrlPressed && shiftPressed && altPressed && metaPressed && keyPressed) {
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keys, handler]);
};

export default useKeyPress;