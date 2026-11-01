//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: theme.js
//  Description: Light or dark: the one the system says, or the one the reader chose, kept in this
//               browser. index.html sets it before the page is drawn, so it does not flash
//

import {useSyncExternalStore} from "react";

const KEY = 'theme';
export const THEMES = ['system', 'light', 'dark'];

const listeners = new Set();

const read = () => {
    try {
        const theme = localStorage.getItem(KEY);
        return THEMES.includes(theme) ? theme : 'system';
    } catch {
        return 'system';
    }
};

// the class on <html>: 'light' or 'dark' wins over the system (see index.css), none follows it
const apply = (theme) => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
};

let current = read();

export const setTheme = (theme) => {
    current = THEMES.includes(theme) ? theme : 'system';
    try {
        if (current === 'system') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, current);
    } catch {
        // no storage (a private window): the choice holds until the page is closed
    }
    apply(current);
    listeners.forEach(listener => listener());
};

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const useTheme = () => useSyncExternalStore(subscribe, () => current, () => current);
