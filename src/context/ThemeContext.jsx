import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';

const ThemeContext = createContext({});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize state synchronously to eliminate flashing
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  
  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem('fontSize') || 'normal';
  });
  
  const [compactMode, setCompactModeState] = useState(() => {
    return localStorage.getItem('compactMode') === 'true';
  });
  
  const [colorScheme, setColorSchemeState] = useState(() => {
    return localStorage.getItem('colorScheme') || 'blue';
  });
  
  // Track visual state
  const [isDark, setIsDark] = useState(() => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return currentTheme === 'dark';
  });

  // --- CORE APPLY FUNCTIONS ---

  const applyTheme = useCallback((newTheme) => {
    let resolvedTheme = newTheme;

    if (newTheme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    setIsDark(resolvedTheme === 'dark');

    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0f172a' : '#f8fafc');
    }
  }, []);

  const applyFontSize = useCallback((size) => {
    const sizes = { small: '14px', normal: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[size] || sizes.normal;
  }, []);

  const applyCompactMode = useCallback((isCompact) => {
    if (isCompact) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }
  }, []);

  const applyColorScheme = useCallback((color) => {
    const root = document.documentElement;
    root.setAttribute('data-color-scheme', color);
    const colors = {
      blue: '#3b82f6', green: '#10b981', purple: '#8b5cf6', 
      orange: '#f59e0b', red: '#ef4444', indigo: '#6366f1'
    };
    root.style.setProperty('--primary-color', colors[color] || colors.blue);
  }, []);

  // --- SYNCHRONOUS DOM UPDATE ON LOAD ---
  // This layout effect runs exactly ONCE before paint to catch any stored settings
  useLayoutEffect(() => {
    // Read directly from localStorage here to absolutely guarantee the DOM matches storage before paint
    applyTheme(localStorage.getItem('theme') || 'light');
    applyFontSize(localStorage.getItem('fontSize') || 'normal');
    applyCompactMode(localStorage.getItem('compactMode') === 'true');
    applyColorScheme(localStorage.getItem('colorScheme') || 'blue');
    // We intentionally leave the dependency array empty so this only fires on mount before paint.
    // The state setter functions below will handle subsequent updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- OS LISTENER ---
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, applyTheme]);

  // --- STATE SETTERS (Exposed to UI) ---

  const setThemeMode = useCallback((mode) => {
    if (!['light', 'dark', 'system'].includes(mode)) return;
    setThemeState(mode);
    localStorage.setItem('theme', mode);
    applyTheme(mode); // Apply immediately to DOM
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    setThemeMode(newTheme);
  }, [isDark, setThemeMode]);

  const changeFontSize = useCallback((size) => {
    if (!['small', 'normal', 'large'].includes(size)) return;
    setFontSizeState(size);
    localStorage.setItem('fontSize', size);
    applyFontSize(size); // Apply immediately to DOM
  }, [applyFontSize]);

  const toggleCompactMode = useCallback(() => {
    setCompactModeState((prev) => {
      const newVal = !prev;
      localStorage.setItem('compactMode', newVal.toString());
      applyCompactMode(newVal); // Apply immediately to DOM
      return newVal;
    });
  }, [applyCompactMode]);

  const changeColorScheme = useCallback((color) => {
    setColorSchemeState(color);
    localStorage.setItem('colorScheme', color);
    applyColorScheme(color); // Apply immediately to DOM
  }, [applyColorScheme]);

  const resetTheme = useCallback(() => {
    setThemeMode('light');
    changeFontSize('normal');
    
    setCompactModeState(false);
    localStorage.setItem('compactMode', 'false');
    applyCompactMode(false);
    
    changeColorScheme('blue');
  }, [setThemeMode, changeFontSize, changeColorScheme, applyCompactMode]);

  const getColors = useCallback(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      primary: root.getPropertyValue('--primary-color').trim() || root.getPropertyValue('--primary-600').trim(),
      background: root.getPropertyValue('--background').trim(),
      surface: root.getPropertyValue('--surface').trim(),
      text: root.getPropertyValue('--text-primary').trim()
    };
  }, []);

  // Exported Context Values
  const value = {
    theme,
    fontSize,
    compactMode,
    isDark, 
    colorScheme,
    setColorScheme: changeColorScheme, 
    toggleTheme,
    setTheme: setThemeMode, // Maps cleanly for AppearanceSettings.jsx!
    changeFontSize,
    toggleCompactMode,
    resetTheme,
    getColors
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;