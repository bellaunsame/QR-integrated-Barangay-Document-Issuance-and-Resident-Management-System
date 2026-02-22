import { format, formatDistance, formatRelative, differenceInYears, differenceInDays, parseISO, isValid, addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

/**
 * Date Utilities
 * Common date formatting and manipulation functions
 */

/**
 * Format date to readable string
 */
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, formatStr);
};

/**
 * Format date to Philippine locale
 */
export const formatDatePH = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, 'MMMM dd, yyyy');
};

/**
 * Format date and time
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, 'MMM dd, yyyy h:mm a');
};

/**
 * Format time only
 */
export const formatTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, 'h:mm a');
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return formatDistance(dateObj, new Date(), { addSuffix: true });
};

/**
 * Get relative date (e.g., "yesterday at 3:00 PM")
 */
export const getRelativeDate = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return formatRelative(dateObj, new Date());
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 0;
  const birthDate = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  if (!isValid(birthDate)) return 0;
  return differenceInYears(new Date(), birthDate);
};

/**
 * Calculate days between two dates
 */
export const daysBetween = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  if (!isValid(d1) || !isValid(d2)) return 0;
  return differenceInDays(d2, d1);
};

/**
 * Check if date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return false;
  const today = new Date();
  return format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
};

/**
 * Check if date is in the past
 */
export const isPast = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return false;
  return dateObj < new Date();
};

/**
 * Check if date is in the future
 */
export const isFuture = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return false;
  return dateObj > new Date();
};

/**
 * Add days to date
 */
export const addDaysToDate = (date, days) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return new Date();
  return addDays(dateObj, days);
};

/**
 * Subtract days from date
 */
export const subtractDaysFromDate = (date, days) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return new Date();
  return subDays(dateObj, days);
};

/**
 * Get start of month
 */
export const getStartOfMonth = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfMonth(dateObj);
};

/**
 * Get end of month
 */
export const getEndOfMonth = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return endOfMonth(dateObj);
};

/**
 * Get start of year
 */
export const getStartOfYear = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfYear(dateObj);
};

/**
 * Get end of year
 */
export const getEndOfYear = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return endOfYear(dateObj);
};

/**
 * Get current date in YYYY-MM-DD format
 */
export const getCurrentDate = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Get current datetime in ISO format
 */
export const getCurrentDateTime = () => {
  return new Date().toISOString();
};

/**
 * Parse date string safely
 */
export const parseDate = (dateString) => {
  if (!dateString) return null;
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
};

/**
 * Format date for input[type="date"]
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, 'yyyy-MM-dd');
};

/**
 * Get month name
 */
export const getMonthName = (monthNumber) => {
  const date = new Date(2000, monthNumber - 1, 1);
  return format(date, 'MMMM');
};

/**
 * Get day name
 */
export const getDayName = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, 'EEEE');
};

export default {
  formatDate,
  formatDatePH,
  formatDateTime,
  formatTime,
  getRelativeTime,
  getRelativeDate,
  calculateAge,
  daysBetween,
  isToday,
  isPast,
  isFuture,
  addDaysToDate,
  subtractDaysFromDate,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
  getCurrentDate,
  getCurrentDateTime,
  parseDate,
  formatDateForInput,
  getMonthName,
  getDayName
};