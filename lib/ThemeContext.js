import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const lightTheme = {
  bg: '#F5F5F5',
  card: '#FFFFFF',
  text: '#1A1A1A',
  subText: '#757575',
  primary: '#5C6BC0',
  border: '#E0E0E0',
  inputBg: '#F5F5F5',
};

export const darkTheme = {
  bg: '#121212',
  card: '#1E1E1E',
  text: '#F5F5F5',
  subText: '#9E9E9E',
  primary: '#7986CB',
  border: '#333333',
  inputBg: '#2C2C2C',
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [manualOverride, setManualOverride] = useState(null); // null=システム依存

  const isDark = manualOverride !== null ? manualOverride : systemScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => setManualOverride(prev => prev === null ? !isDark : !prev);
  const resetToSystem = () => setManualOverride(null);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, resetToSystem, manualOverride }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}