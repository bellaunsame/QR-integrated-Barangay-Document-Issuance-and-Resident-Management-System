/**
 * Array Utilities
 * Common array manipulation and transformation functions
 */

/**
 * Remove duplicates from array
 */
export const unique = (arr) => {
  return [...new Set(arr)];
};

/**
 * Remove duplicates by property
 */
export const uniqueBy = (arr, key) => {
  return [...new Map(arr.map(item => [item[key], item])).values()];
};

/**
 * Group array by property
 */
export const groupBy = (arr, key) => {
  return arr.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

/**
 * Sort array by property
 */
export const sortBy = (arr, key, order = 'asc') => {
  return [...arr].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Chunk array into smaller arrays
 */
export const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Flatten nested array
 */
export const flatten = (arr) => {
  return arr.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
};

/**
 * Shuffle array randomly
 */
export const shuffle = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Get random item from array
 */
export const randomItem = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Get random items from array
 */
export const randomItems = (arr, count) => {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, Math.min(count, arr.length));
};

/**
 * Paginate array
 */
export const paginate = (arr, page, perPage) => {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return arr.slice(start, end);
};

/**
 * Find item by property value
 */
export const findBy = (arr, key, value) => {
  return arr.find(item => item[key] === value);
};

/**
 * Filter array by multiple properties
 */
export const filterBy = (arr, filters) => {
  return arr.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (Array.isArray(value)) {
        return value.includes(item[key]);
      }
      return item[key] === value;
    });
  });
};

/**
 * Pluck property values from array of objects
 */
export const pluck = (arr, key) => {
  return arr.map(item => item[key]);
};

/**
 * Sum array of numbers
 */
export const sum = (arr) => {
  return arr.reduce((total, num) => total + num, 0);
};

/**
 * Sum array property values
 */
export const sumBy = (arr, key) => {
  return arr.reduce((total, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    return total + (Number(value) || 0);
  }, 0);
};

/**
 * Get average of array
 */
export const average = (arr) => {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
};

/**
 * Get average by property
 */
export const averageBy = (arr, key) => {
  if (arr.length === 0) return 0;
  return sumBy(arr, key) / arr.length;
};

/**
 * Get min value
 */
export const min = (arr) => {
  return Math.min(...arr);
};

/**
 * Get max value
 */
export const max = (arr) => {
  return Math.max(...arr);
};

/**
 * Get min by property
 */
export const minBy = (arr, key) => {
  return arr.reduce((min, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    const minValue = typeof key === 'function' ? key(min) : min[key];
    return value < minValue ? item : min;
  });
};

/**
 * Get max by property
 */
export const maxBy = (arr, key) => {
  return arr.reduce((max, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    const maxValue = typeof key === 'function' ? key(max) : max[key];
    return value > maxValue ? item : max;
  });
};

/**
 * Count occurrences
 */
export const countBy = (arr, key) => {
  return arr.reduce((counts, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
};

/**
 * Partition array by condition
 */
export const partition = (arr, predicate) => {
  return arr.reduce(
    ([pass, fail], item) => {
      return predicate(item) 
        ? [[...pass, item], fail] 
        : [pass, [...fail, item]];
    },
    [[], []]
  );
};

/**
 * Difference between two arrays
 */
export const difference = (arr1, arr2) => {
  return arr1.filter(item => !arr2.includes(item));
};

/**
 * Intersection of two arrays
 */
export const intersection = (arr1, arr2) => {
  return arr1.filter(item => arr2.includes(item));
};

/**
 * Union of two arrays
 */
export const union = (arr1, arr2) => {
  return unique([...arr1, ...arr2]);
};

/**
 * Check if arrays are equal
 */
export const isEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((item, index) => item === arr2[index]);
};

/**
 * Remove falsy values
 */
export const compact = (arr) => {
  return arr.filter(Boolean);
};

/**
 * Take first n items
 */
export const take = (arr, n) => {
  return arr.slice(0, n);
};

/**
 * Take last n items
 */
export const takeLast = (arr, n) => {
  return arr.slice(-n);
};

/**
 * Drop first n items
 */
export const drop = (arr, n) => {
  return arr.slice(n);
};

/**
 * Drop last n items
 */
export const dropLast = (arr, n) => {
  return arr.slice(0, -n);
};

/**
 * Rotate array
 */
export const rotate = (arr, n = 1) => {
  const len = arr.length;
  n = ((n % len) + len) % len;
  return [...arr.slice(n), ...arr.slice(0, n)];
};

/**
 * Insert item at index
 */
export const insertAt = (arr, index, item) => {
  return [...arr.slice(0, index), item, ...arr.slice(index)];
};

/**
 * Remove item at index
 */
export const removeAt = (arr, index) => {
  return [...arr.slice(0, index), ...arr.slice(index + 1)];
};

/**
 * Move item from one index to another
 */
export const moveItem = (arr, fromIndex, toIndex) => {
  const item = arr[fromIndex];
  const without = removeAt(arr, fromIndex);
  return insertAt(without, toIndex, item);
};

/**
 * Create range array
 */
export const range = (start, end, step = 1) => {
  const result = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
};

export default {
  unique,
  uniqueBy,
  groupBy,
  sortBy,
  chunk,
  flatten,
  shuffle,
  randomItem,
  randomItems,
  paginate,
  findBy,
  filterBy,
  pluck,
  sum,
  sumBy,
  average,
  averageBy,
  min,
  max,
  minBy,
  maxBy,
  countBy,
  partition,
  difference,
  intersection,
  union,
  isEqual,
  compact,
  take,
  takeLast,
  drop,
  dropLast,
  rotate,
  insertAt,
  removeAt,
  moveItem,
  range
};