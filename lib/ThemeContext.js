import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const lightTheme = {
  bg: '#F5F5F5',
  card: '#ffffff',
  text: '#212121',
  subText: '#888888',
  border: '#dddddd',
  primary: '#5C6BC0',
  inputBg: '#F5F5F5',
};

export const darkTheme = {
  bg: '#121212',
  card: '#1E1E1E',
  text: '#EEEEEE',
  subText: '#AAAAAA',
  border: '#333333',
  primary: '#7986CB',
  inputBg: '#2C2C2C',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark(prev => !prev);
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);