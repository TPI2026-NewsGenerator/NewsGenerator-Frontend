//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: keptSearch.js
//  Description: The last search of the reader kept in their browser for a day: its form, its news,
//               their key passages and translations. The reader who left the page found it empty
//

const KEY = 'newsgenerator.search';
export const KEEP_MS = 24 * 3600e3;

// in a private window, a full storage or a browser refusing it, nothing is kept: never an error
const storage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

// state: {form, range, news, search, wider, mode, summaries, translations, at}; at: when its news were found
export const keepSearch = (userId, state) => {
    try {
        storage()?.setItem(KEY, JSON.stringify({userId, ...state}));
    } catch {
        // too big for the storage: the search is not kept
        forgetSearch();
    }
};

// the search kept for this reader, null when none, of another reader or older than a day
export const keptSearch = (userId, now = Date.now()) => {
    try {
        const kept = JSON.parse(storage()?.getItem(KEY) ?? 'null');
        if (!kept || kept.userId !== userId || !(now - kept.at < KEEP_MS)) {
            if (kept) forgetSearch();
            return null;
        }
        return kept;
    } catch {
        return null;
    }
};

// at the sign out: on a shared computer, the next reader does not see it
export const forgetSearch = () => {
    try {
        storage()?.removeItem(KEY);
    } catch {
        // nothing kept
    }
};
