//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: activeProfile.js
//  Description: The profile the reader reads now, among theirs: kept in the browser and sent with
//               every call (the header X-Profile, see server/services/utils/active-profile.js)
//

import {useSyncExternalStore} from "react";

const KEY = 'newsgenerator.profile';
const listeners = new Set();

// the storage may be refused (a private window): the profile is then kept for the page only
const read = () => {
    try {
        const value = Number.parseInt(localStorage.getItem(KEY) ?? '', 10);
        return Number.isInteger(value) ? value : null;
    } catch {
        return null;
    }
};

let current = read();

export const activeProfileId = () => current;

// id: one of the profiles of the reader, null for the first one (the server's choice)
export const setActiveProfile = (id) => {
    if (id === current) return;
    current = id ?? null;
    try {
        if (current === null) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, String(current));
    } catch {
        // kept for the page only
    }
    listeners.forEach(listener => listener());
};

// the headers of a call, with the profile chosen when there is one
export const withProfile = (headers = {}) => current === null ? headers : {...headers, 'X-Profile': String(current)};

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// the profile chosen, a page reads its data again when it changes
export const useActiveProfile = () => useSyncExternalStore(subscribe, activeProfileId);

// a new list of profiles was saved (one written, renamed or deleted): the switcher reads it again
const changes = new Set();
export const profilesChanged = () => changes.forEach(listener => listener());
export const onProfilesChanged = (listener) => {
    changes.add(listener);
    return () => changes.delete(listener);
};
