//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: sizes.js
//  Description: How many cards a briefing can have, as the server takes them (BRIEFING_SIZES of
//               profile-ai.js on the server), and the last one the reader chose, kept in the browser and on the account (see
//               features/preferences)
//

import {preference} from "@/features/preferences/preferences.js";

export const SIZES = [10, 20, 30];
export const DEFAULT_SIZE = 10;

// the size the reader chose last, kept in the browser and on the account
export const sizePreference = preference({
    name: 'size',
    key: 'newsgenerator.briefing-size',
    fallback: DEFAULT_SIZE,
    parse: (text) => SIZES.includes(Number(text)) ? Number(text) : undefined,
});
export const keptSize = () => sizePreference.kept();
export const keepSize = (size) => sizePreference.keep(size);
