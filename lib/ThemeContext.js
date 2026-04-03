import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

export const lightTheme = {
  bg: '#F0F2F8',
  card: '#FFFFFF',
  text: '#1A1A1A',
  subText: '#757575',
  primary: '#5C6BC0',
  primaryLight: '#EEF0FF',
  border: '#E0E0E0',
  inputBg: '#F5F6FA',
  success: '#4CAF50',
  successLight: '#E8F5E9',
  danger: '#E53935',
  dangerLight: '#FFEBEE',
  warning: '#F57F17',
  warningLight: '#FFF8E1',
  tabBarBg: '#FFFFFF',
};

export const darkTheme = {
  bg: '#0F0F13',
  card: '#1C1C24',
  text: '#F0F0F5',
  subText: '#9E9E9E',
  primary: '#7986CB',
  primaryLight: '#252840',
  border: '#2C2C3A',
  inputBg: '#252530',
  success: '#66BB6A',
  successLight: '#1B2E1E',
  danger: '#EF5350',
  dangerLight: '#2E1B1B',
  warning: '#FFA726',
  warningLight: '#2E2410',
  tabBarBg: '#1C1C24',
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [manualOverride, setManualOverride] = useState(null); // null=システム依存

  const isDark = manualOverride !== null ? manualOverride : systemScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => setManualOverride(prev => prev === null ? !isDark : !prev);
  const resetToSystem = () => setManualOverride(null);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, resetToSystem, manualOverride, cardShadow }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}