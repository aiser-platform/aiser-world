import { useState, useEffect } from 'react';

export const useDarkMode = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('darkMode');
            if (stored !== null) {
                return JSON.parse(stored);
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    return [isDarkMode, setIsDarkMode] as const;
};
