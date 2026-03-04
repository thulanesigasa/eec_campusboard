import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightColors = {
    background: '#f2f2f7',
    card: '#ffffff',
    cardLight: '#f9f9f9',
    text: '#000000',
    textSecondary: 'rgba(0,0,0,0.6)',
    border: 'rgba(0,0,0,0.1)',
    primary: '#141414',
    accent: '#8EB32D', // Darker green for contrast on light mode
    danger: '#ff3b30'
};

export const darkColors = {
    background: '#0D0D0D',
    card: '#141414',
    cardLight: 'rgba(255,255,255,0.04)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    border: 'rgba(255,255,255,0.1)',
    primary: '#ffffff',
    accent: '#9CC222',
    danger: '#ff6b6b'
};

type ThemeColors = typeof lightColors;

export const ThemeContext = createContext<{
    isDark: boolean;
    toggleTheme: () => void;
    colors: ThemeColors;
}>({
    isDark: true,
    toggleTheme: () => { },
    colors: lightColors as ThemeColors
});

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem('appTheme').then(saved => {
            if (saved === 'light') setIsDark(false);
        });
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        AsyncStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
    };

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
