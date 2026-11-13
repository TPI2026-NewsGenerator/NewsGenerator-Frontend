//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: candidates.js
//  Description: Where a candidate on the map comes from, in words. The list of candidates is not fixed: the server looks in the news once a day for persons named
//               as candidates and adds them by itself (origin 'news', with what it found), a reader adds the ones the news did not bring (origin 'reader'),
//               the president in office is the seed. A new candidate has its news of the last 30 days read (state 'computing') and its positions fill in as they
//               are read. These are the words the select, the list of candidates, the legend and the sheet use for that
//

export const FOUND_TAG = 'Found in the news';
export const READING_TAG = 'Reading the news…';

// the candidate was found in the news by the server (no reader added it)
export const isFound = (subject) => subject?.origin === 'news';
// the news of the last 30 days are being read for it: its positions fill in as they are read
export const isReading = (subject) => subject?.state === 'computing';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// What the news said, as one line: "Named as a candidate in 4 media (7 articles): “quote”"; null when the candidate was not found in the news or the server sent
// nothing ({status: 'declared' | 'rumoured', articles, media, quote, at})
export const foundLine = (subject) => {
    const found = isFound(subject) ? subject.found : null;
    if (!found) return null;
    return `Named as a candidate in ${count(found.media ?? 0, 'medium', 'media')} (${count(found.articles ?? 0, 'article', 'articles')})${found.quote ? `: “${found.quote}”` : ''}`;
};

// the label of a candidate in the select of the page: its name, then what is worth knowing about it ("Found in the news" is not said here: the user did not want it in the select;
// the list of candidates, the legend and the sheet still say it)
export const optionLabel = (subject) => [
    `${subject.name}${subject.status === 'withdrawn' ? ' (withdrawn)' : ''}`,
    isReading(subject) && READING_TAG,
].filter(Boolean).join(' · ');
