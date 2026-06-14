import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pgms_theme') || 'dark';
  });

  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('pgms_primary_color') || '#4f46e5';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.style.setProperty('--bg-dark', '#f8fafc');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--text-main', '#0f172a');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--modal-overlay', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--modal-bg', '#ffffff');
    } else {
      root.style.setProperty('--bg-dark', '#0f172a');
      root.style.setProperty('--card-bg', '#1e293b');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border', '#334155');
      root.style.setProperty('--modal-overlay', 'rgba(15, 23, 42, 0.7)');
      root.style.setProperty('--modal-bg', '#1e293b');
    }

    root.style.setProperty('--primary', primaryColor);
    
    localStorage.setItem('pgms_theme', theme);
    localStorage.setItem('pgms_primary_color', primaryColor);
  }, [theme, primaryColor]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
