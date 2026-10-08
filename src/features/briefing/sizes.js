//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: sizes.js
//  Description: How many cards a briefing can have, as the server takes them (BRIEFING_SIZES of
//               profile-ai.js on the server), and the last one the reader chose
//

export const SIZES = [10, 20, 30];
export const DEFAULT_SIZE = 10;
const KEY = 'newsgenerator.briefing-size';

// the size the reader chose last, kept in the browser
export const keptSize = () => {
    try {
        const value = Number(localStorage.getItem(KEY));
        return SIZES.includes(value) ? value : DEFAULT_SIZE;
    } catch {
        return DEFAULT_SIZE;
    }
};
export const keepSize = (size) => {
    try {
        localStorage.setItem(KEY, String(size));
    } catch {
        // kept for the page only
    }
};
