import { ChevronLeft, ChevronRight } from 'lucide-react';
/*import './Pagination.css';*/

/**
 * Pagination Component
 * * Navigate through pages of data
 * * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Page change handler
 * @param {number} siblingCount - Pages to show on each side
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = ''
}) => {
  const generatePages = () => {
    const pages = [];
    const showEllipsisStart = currentPage > siblingCount + 2;
    const showEllipsisEnd = currentPage < totalPages - siblingCount - 1;

    // Always show first page
    if (totalPages > 0) {
      pages.push(1);
    }

    // Show ellipsis if needed
    if (showEllipsisStart) {
      pages.push('...');
    }

    // Show pages around current page
    const startPage = Math.max(2, currentPage - siblingCount);
    const endPage = Math.min(totalPages - 1, currentPage + siblingCount);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Show ellipsis if needed
    if (showEllipsisEnd) {
      pages.push('...');
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  const pages = generatePages();

  return (
    <div className={`pagination-container ${className}`}>
      <button
        className="page-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={16} />
        <span>Previous</span>
      </button>

      <div className="pagination-numbers">
        {pages.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="page-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={`page-${index}-${page}`}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        className="page-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <span>Next</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default Pagination;