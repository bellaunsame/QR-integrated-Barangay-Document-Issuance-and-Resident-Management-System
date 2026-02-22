import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import './ResidentSearch.css';

/**
 * ResidentSearch Component
 * 
 * Search and filter residents
 */
const ResidentSearch = ({ onSearch, onFilterChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    civil_status: '',
    voter_status: '',
    pwd_status: '',
    senior_citizen: '',
    age_range: ''
  });

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  const handleFilterChange = (name, value) => {
    const newFilters = {
      ...filters,
      [name]: value
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      gender: '',
      civil_status: '',
      voter_status: '',
      pwd_status: '',
      senior_citizen: '',
      age_range: ''
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(v => v !== '').length;
  };

  return (
    <div className="resident-search">
      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, address, or mobile number..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <button
          className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          Filters
          {getActiveFilterCount() > 0 && (
            <span className="filter-badge">{getActiveFilterCount()}</span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h4>Filter Residents</h4>
            {getActiveFilterCount() > 0 && (
              <button
                className="clear-filters-btn"
                onClick={handleClearFilters}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="filters-grid">
            {/* Gender Filter */}
            <div className="filter-group">
              <label htmlFor="gender-filter">Gender</label>
              <select
                id="gender-filter"
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Civil Status Filter */}
            <div className="filter-group">
              <label htmlFor="civil-status-filter">Civil Status</label>
              <select
                id="civil-status-filter"
                value={filters.civil_status}
                onChange={(e) => handleFilterChange('civil_status', e.target.value)}
              >
                <option value="">All</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>

            {/* Age Range Filter */}
            <div className="filter-group">
              <label htmlFor="age-range-filter">Age Range</label>
              <select
                id="age-range-filter"
                value={filters.age_range}
                onChange={(e) => handleFilterChange('age_range', e.target.value)}
              >
                <option value="">All</option>
                <option value="0-17">0-17 (Minor)</option>
                <option value="18-59">18-59 (Adult)</option>
                <option value="60+">60+ (Senior)</option>
              </select>
            </div>

            {/* Voter Status Filter */}
            <div className="filter-group">
              <label htmlFor="voter-filter">Voter Status</label>
              <select
                id="voter-filter"
                value={filters.voter_status}
                onChange={(e) => handleFilterChange('voter_status', e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Registered</option>
                <option value="false">Not Registered</option>
              </select>
            </div>

            {/* PWD Status Filter */}
            <div className="filter-group">
              <label htmlFor="pwd-filter">PWD Status</label>
              <select
                id="pwd-filter"
                value={filters.pwd_status}
                onChange={(e) => handleFilterChange('pwd_status', e.target.value)}
              >
                <option value="">All</option>
                <option value="true">PWD</option>
                <option value="false">Not PWD</option>
              </select>
            </div>

            {/* Senior Citizen Filter */}
            <div className="filter-group">
              <label htmlFor="senior-filter">Senior Citizen</label>
              <select
                id="senior-filter"
                value={filters.senior_citizen}
                onChange={(e) => handleFilterChange('senior_citizen', e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentSearch;