import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pgms_theme') || 'dark';
  });

  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('pgms_primary_color') || '#4f46e5';
  });

  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem('pgms_font_family') || 'Inter';
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('pgms_font_size') || '16px';
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
    
    // Set typography CSS Variables
    // Using a fallback stack for the fonts
    const fontStack = fontFamily === 'Inter' ? "'Inter', system-ui, sans-serif" :
                      fontFamily === 'Roboto' ? "'Roboto', system-ui, sans-serif" :
                      fontFamily === 'Poppins' ? "'Poppins', system-ui, sans-serif" :
                      fontFamily === 'Open Sans' ? "'Open Sans', system-ui, sans-serif" :
                      fontFamily === 'Montserrat' ? "'Montserrat', system-ui, sans-serif" :
                      fontFamily === 'Lato' ? "'Lato', system-ui, sans-serif" :
                      fontFamily === 'Nunito' ? "'Nunito', system-ui, sans-serif" :
                      fontFamily === 'Playfair Display' ? "'Playfair Display', serif" :
                      fontFamily === 'Merriweather' ? "'Merriweather', serif" :
                      fontFamily === 'Ubuntu' ? "'Ubuntu', system-ui, sans-serif" :
                      "'Inter', system-ui, sans-serif";
                      
    root.style.setProperty('--font-family', fontStack);
    root.style.setProperty('--font-size-base', fontSize);
    
    localStorage.setItem('pgms_theme', theme);
    localStorage.setItem('pgms_primary_color', primaryColor);
    localStorage.setItem('pgms_font_family', fontFamily);
    localStorage.setItem('pgms_font_size', fontSize);
  }, [theme, primaryColor, fontFamily, fontSize]);

  return (
    <ThemeContext.Provider value={{ 
      theme, setTheme, 
      primaryColor, setPrimaryColor,
      fontFamily, setFontFamily,
      fontSize, setFontSize
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
