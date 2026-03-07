import { useState, useMemo, useEffect } from 'react';

/**
 * usePagination Hook
 * * Handles pagination logic for lists and tables.
 * * @param {Array} initialData - Array of data to paginate
 * @param {number} initialItemsPerPage - Number of items per page (default: 10)
 * @returns {Object} - Pagination state and controls
 */
export const usePagination = (initialData, initialItemsPerPage = 10) => {
  // FIX 1: Prevent crashes if data is undefined/null while loading
  const data = initialData || [];
  
  const [currentPage, setCurrentPage] = useState(1);
  // FIX 2: Make itemsPerPage an actual state variable so it can be changed dynamically
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(data.length / itemsPerPage));
  }, [data.length, itemsPerPage]);

  // Get current page data
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  // Navigation functions
  const nextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const prevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  // Check if navigation is available
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  // Get page range for pagination UI
  const getPageRange = (range = 5) => {
    const pages = [];
    let start = Math.max(1, currentPage - Math.floor(range / 2));
    let end = Math.min(totalPages, start + range - 1);

    // Adjust start if we're near the end
    if (end - start < range - 1) {
      start = Math.max(1, end - range + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  // FIX 3: Use useEffect (not useMemo) for side effects like resetting the page
  useEffect(() => {
    // If data filters change and leave us on a page that no longer exists, jump back to page 1
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, totalPages, currentPage]);

  return {
    currentPage,
    totalPages,
    currentData,
    itemsPerPage,
    totalItems: data.length,
    nextPage,
    prevPage,
    goToPage,
    goToFirstPage,
    goToLastPage,
    canGoNext,
    canGoPrev,
    getPageRange,
    setItemsPerPage // Now this is a proper function to change rows per page dynamically!
  };
};

export default usePagination;