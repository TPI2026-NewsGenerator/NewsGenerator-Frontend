//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: sourceChecks.js
//  Description: What a reader's SOURCE is on the page "The FIFA presidency": the link of a page that says what they chose, joined to their choice. The server
//               reads the page with the AI in the background and never changes a colour because of it; the sheet says what the AI made of it (the
//               check), in words that never call a source wrong when the AI only could not confirm it. Pure data and two small functions
//

// the sheet reads again once after this long while a source is still being read (the AI takes 10 to 60 s), up to MAX_RECHECKS times
export const RECHECK_AFTER_MS = 30000;
export const MAX_RECHECKS = 2;

// The words of each check. tone: the Badge; says: the sentence under it, when the AI found one ('found'), that it quotes
//   pending      the AI is reading the page
//   says         the page says what the reader chose (found = its sentence)
//   contradicts  the page says the OTHER thing (found = its sentence): a warning, the reader may have chosen wrongly or linked the wrong page
//   unclear      the AI could not confirm it: neutral, NOT wrong
//   unreadable   the page could not be read
export const CHECKS = {
    pending: {label: 'Checking…', tone: 'quiet', says: null},
    says: {label: 'The page says it', tone: 'official', says: 'The page says: '},
    contradicts: {label: 'The page says the opposite', tone: 'warn', says: 'The page says: '},
    unclear: {label: 'Could not be confirmed', tone: 'quiet', says: null, note: 'The AI could not confirm it from the page. That does not make it wrong.'},
    unreadable: {label: 'The page could not be read', tone: 'quiet', says: null, note: 'The page could not be opened or read.'},
};

// whether any source is still being read
export const anyPending = (sources) => (sources ?? []).some(one => one.check === 'pending');

// The `source` of a request from what the reader typed: {source: 'https://...'} or {} when they typed nothing (the link is sent as it is, the server says what
// is wrong with it). Only a choice that is for or against carries one
export const sourceOf = (text, value = 'for') => {
    const link = (text ?? '').trim();
    return link !== '' && (value === 'for' || value === 'against') ? {source: link} : {};
};

// What the AI made of a PAGE a reader added on its own (not joined to a choice). It reads the page like a news, for every candidate, and what it finds counts for the
// positions: 'says' has readings (shown as such, no badge); the others have no reading
//   pending      the AI is reading the page
//   unclear      the AI found no clear position in it
//   unreadable   the page could not be read
export const PAGE_CHECKS = {
    pending: {label: 'Checking…', tone: 'quiet'},
    says: null,
    unclear: {label: 'The AI found no clear position in this page', tone: 'quiet'},
    unreadable: {label: 'Could not read the page', tone: 'quiet'},
};

// the page has readings (a position the AI found, for one candidate or several)
export const hasReadings = (source) => (source.readings ?? []).length > 0;

// the stance of a reading in the words of a reader: "for" or "against" (the server says support / oppose, or for / against)
export const stanceWord = (reading) => ['support', 'for', 'yes'].includes(reading.stance) ? 'for' : ['oppose', 'against', 'no'].includes(reading.stance) ? 'against' : reading.stance ?? '';

// A page source goes under the position of a candidate when the AI read something in it and the candidate is on the map; every other page (being read, unclear,
// unreadable, a candidate that is not on the map any more) is in the list of the sheet
export const placedUnder = (source, subjects) => hasReadings(source) && source.subject_qid !== null && subjects.some(one => one.qid === source.subject_qid);
