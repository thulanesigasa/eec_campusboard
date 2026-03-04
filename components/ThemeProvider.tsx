import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightColors = {
    background: '#FFFFFF', // User requested white background
    card: '#f9f9f9',
    cardLight: '#f0f0f0',
    text: '#275d64', // Dark Teal text
    textSecondary: 'rgba(39,93,100,0.6)',
    border: 'rgba(39,93,100,0.1)',
    primary: '#156B76', // Teal
    accent: '#156B76', // Teal
    danger: '#CC2128' // Red
};

export const darkColors = {
    background: '#0d181a',
    card: '#152528',
    cardLight: 'rgba(255,255,255,0.05)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    border: 'rgba(255,255,255,0.1)',
    primary: '#ffffff',
    accent: '#F4B436', // Yellow for dark mode pop
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
