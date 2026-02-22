import { useState, useEffect, useCallback } from 'react';

/**
 * useAsync Hook
 * 
 * Handles async operations with loading, error, and data states.
 * Automatically manages the lifecycle of async functions.
 * 
 * @param {Function} asyncFunction - Async function to execute
 * @param {boolean} immediate - Execute immediately on mount (default: true)
 * @returns {Object} - { execute, loading, data, error, reset }
 * 
 * @example
 * const { execute, loading, data, error } = useAsync(fetchUsers);
 * 
 * useEffect(() => {
 *   execute();
 * }, []);
 * 
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * return <UserList users={data} />;
 */
export const useAsync = (asyncFunction, immediate = true) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // The execute function wraps asyncFunction and handles setting state
  const execute = useCallback(
    async (...params) => {
      setLoading(true);
      setError(null);

      try {
        const response = await asyncFunction(...params);
        setData(response);
        return response;
      } catch (error) {
        setError(error.message || 'An error occurred');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction]
  );

  // Reset function to clear state
  const reset = useCallback(() => {
    setLoading(false);
    setData(null);
    setError(null);
  }, []);

  // Call execute if we want to fire it right away
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, loading, data, error, reset };
};

export default useAsync;