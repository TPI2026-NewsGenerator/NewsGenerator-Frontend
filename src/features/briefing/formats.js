//
//  Author: Fabian Rostello
//  Date: 12.10.2026
//  File: formats.js
//  Description: The ways a card of the briefing can be read in, all of them sentences of the article as
//               published (see shorterWays of server/services/utils/extract.js), and the last one the
//               reader chose
//

// points: the 3 most important sentences, one per point; digest: the most important ones in 5 to 6
// lines; passages: the key passages, up to 5 sentences
export const FORMATS = [
    {value: 'points', label: 'Bullet points'},
    {value: 'digest', label: 'Summary'},
    {value: 'passages', label: 'Key passages'},
];
export const DEFAULT_FORMAT = 'passages';
const KEY = 'newsgenerator.briefing-format';

// the way the reader chose last, kept in the browser
export const keptFormat = () => {
    try {
        const value = localStorage.getItem(KEY);
        return FORMATS.some(format => format.value === value) ? value : DEFAULT_FORMAT;
    } catch {
        return DEFAULT_FORMAT;
    }
};
export const keepFormat = (format) => {
    try {
        localStorage.setItem(KEY, format);
    } catch {
        // kept for the page only
    }
};

// the texts of a card in a way: the field of the sentences as published and the one of their
// translation (their marks have the same names). A card of a briefing written before the shorter ways
// (12.10.2026) has its key passages only
export const fieldsOf = (item, format) => {
    if (format === 'points' && item.points) return {text: 'points', translation: 'pointsTranslation'};
    if (format === 'digest' && item.digest) return {text: 'digest', translation: 'digestTranslation'};
    return {text: 'summary', translation: 'translation'};
};
