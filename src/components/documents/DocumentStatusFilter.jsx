import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import './DocumentStatusFilter.css';

/**
 * DocumentStatusFilter Component
 * 
 * Filter document requests by status
 */
const DocumentStatusFilter = ({ onFilterChange, counts = {} }) => {
  const [activeStatus, setActiveStatus] = useState('all');

  const statusOptions = [
    { value: 'all', label: 'All Requests', color: '#6b7280', count: counts.all || 0 },
    { value: 'pending', label: 'Pending', color: '#f59e0b', count: counts.pending || 0 },
    { value: 'processing', label: 'Processing', color: '#3b82f6', count: counts.processing || 0 },
    { value: 'approved', label: 'Approved', color: '#10b981', count: counts.approved || 0 },
    { value: 'rejected', label: 'Rejected', color: '#ef4444', count: counts.rejected || 0 },
    { value: 'completed', label: 'Completed', color: '#8b5cf6', count: counts.completed || 0 },
    { value: 'released', label: 'Released', color: '#10b981', count: counts.released || 0 }
  ];

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    onFilterChange(status === 'all' ? null : status);
  };

  const handleClearFilter = () => {
    setActiveStatus('all');
    onFilterChange(null);
  };

  return (
    <div className="document-status-filter">
      <div className="filter-header">
        <div className="filter-title">
          <Filter size={20} />
          <span>Filter by Status</span>
        </div>
        {activeStatus !== 'all' && (
          <button
            className="clear-filter-btn"
            onClick={handleClearFilter}
          >
            <X size={16} />
            Clear Filter
          </button>
        )}
      </div>

      <div className="filter-options">
        {statusOptions.map(option => (
          <button
            key={option.value}
            className={`filter-option ${activeStatus === option.value ? 'active' : ''}`}
            onClick={() => handleStatusChange(option.value)}
            style={{
              '--status-color': option.color,
              '--status-bg': `${option.color}10`,
              '--status-border': `${option.color}30`
            }}
          >
            <span className="option-label">{option.label}</span>
            <span 
              className="option-count"
              style={{ backgroundColor: option.color }}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DocumentStatusFilter;
