//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: usePhone.js
//  Description: Is the screen a phone's (under 768 px, the "md" of the styles): for what is not the same thing in two sizes but another thing,
//               a matrix of eleven columns that does not fit a phone being a card for each row there
//

import {useSyncExternalStore} from "react";

const QUERY = '(max-width: 767px)';

const subscribe = (notify) => {
    const media = window.matchMedia(QUERY);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
};

// a screen that does not tell its width is not taken for a phone
export const usePhone = () => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
