import { useState, useMemo } from 'react';

/**
 * usePagination Hook
 * 
 * Handles pagination logic for lists and tables.
 * 
 * @param {Array} data - Array of data to paginate
 * @param {number} itemsPerPage - Number of items per page (default: 10)
 * @returns {Object} - Pagination state and controls
 * 
 * @example
 * const { 
 *   currentPage, 
 *   totalPages, 
 *   currentData, 
 *   nextPage, 
 *   prevPage, 
 *   goToPage 
 * } = usePagination(residents, 10);
 * 
 * return (
 *   <>
 *     <Table data={currentData} />
 *     <Pagination 
 *       currentPage={currentPage}
 *       totalPages={totalPages}
 *       onNext={nextPage}
 *       onPrev={prevPage}
 *     />
 *   </>
 * );
 */
export const usePagination = (data, itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(data.length / itemsPerPage);
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

  // Reset to first page when data changes
  useMemo(() => {
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
    setItemsPerPage: itemsPerPage // For changing items per page
  };
};

export default usePagination;