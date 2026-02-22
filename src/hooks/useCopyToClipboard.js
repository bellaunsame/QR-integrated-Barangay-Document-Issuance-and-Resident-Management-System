import { useState, useCallback } from 'react';

/**
 * useCopyToClipboard Hook
 * 
 * Copies text to clipboard with success/error feedback.
 * 
 * @returns {[string|null, Function]} - [copiedText, copy]
 * 
 * @example
 * const [copiedText, copy] = useCopyToClipboard();
 * 
 * const handleCopy = () => {
 *   copy('Text to copy')
 *     .then(() => toast.success('Copied!'))
 *     .catch(() => toast.error('Failed to copy'));
 * };
 * 
 * return (
 *   <button onClick={handleCopy}>
 *     {copiedText ? 'Copied!' : 'Copy'}
 *   </button>
 * );
 */
export const useCopyToClipboard = () => {
  const [copiedText, setCopiedText] = useState(null);

  const copy = useCallback(async (text) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }

    // Try to save to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      
      // Reset copied text after 2 seconds
      setTimeout(() => {
        setCopiedText(null);
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopiedText(null);
      return false;
    }
  }, []);

  return [copiedText, copy];
};

export default useCopyToClipboard;