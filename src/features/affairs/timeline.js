//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: timeline.js
//  Description: Where the events of an affair stand on its horizontal line: the date of each one as a distance,
//               the labels of the key events on lanes so that none covers another, the minor ones stacked, the
//               days of the axis and the bars of the coverage under them
//

export const DAY_MS = 24 * 3600e3;
// a day is at least this wide: an affair of a month is a line of about 1 100 px, read by scrolling on a phone
export const DAY_PX = 36;
export const LABEL_PX = 176;
export const LABEL_LANES = 3;
const DOT_BUCKET_PX = 10;
const DOT_ROWS = 4;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// "2026-10-13" as that day in the browser's time, midnight
export const localDay = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// The axis: from the day of the first event (or of the first day of the coverage) to the day after the last,
// 'width' px at least. x(at): the distance of a date from the left; ticks: [{x, label, month}], a tick every
// 'step' days so that two are 56 px apart at least, the month said on the first of each and on the first tick
export const axisOf = (events, coverageDays = [], width = 0) => {
    const times = [...events.map(event => new Date(event.at)), ...coverageDays.map(day => localDay(day.day))].filter(date => !Number.isNaN(+date));
    if (times.length === 0) return null;
    const start = startOfDay(new Date(Math.min(...times)));
    const lastDay = startOfDay(new Date(Math.max(...times)));
    const end = new Date(+lastDay + DAY_MS * 1.5);
    const days = Math.max(3, Math.round((+end - +start) / DAY_MS));
    const total = Math.max(width, days * DAY_PX);
    const perDay = total / days;
    const x = (at) => ((+new Date(at) - +start) / (+end - +start)) * total;
    const step = Math.max(1, Math.ceil(56 / perDay));
    const ticks = [];
    for (let i = 0; i < days; i += step) {
        const date = new Date(+start + i * DAY_MS);
        ticks.push({x: i * perDay, label: String(date.getDate()), month: i === 0 || date.getDate() <= step ? date.toLocaleDateString('en-GB', {month: 'short'}) : null});
    }
    return {start, end, days, width: total, perDay, x, ticks};
};

// The lane (0 to lanes - 1) of the label of each key event, none for the ones with no room: a label is
// 'labelWidth' wide from its marker, and takes the first lane free at that distance. Map event id -> lane
export const labelLanes = (events, x, {labelWidth = LABEL_PX, lanes = LABEL_LANES} = {}) => {
    const taken = Array.from({length: lanes}, () => -Infinity);
    const placed = new Map();
    for (const event of events.filter(one => one.kind === 'key')) {
        const left = x(event.at);
        const lane = taken.findIndex(end => end + 8 <= left);
        if (lane === -1) continue;
        taken[lane] = left + labelWidth;
        placed.set(event.id, lane);
    }
    return placed;
};

// The row (0 to rows - 1) of each minor event, so that those of the same moment do not hide one another:
// events within DOT_BUCKET_PX of each other go one under the other. Map event id -> row
export const dotRows = (events, x) => {
    const rows = new Map();
    let last = -Infinity;
    let row = 0;
    for (const event of events.filter(one => one.kind !== 'key')) {
        const left = x(event.at);
        row = left - last < DOT_BUCKET_PX ? (row + 1) % DOT_ROWS : 0;
        last = left;
        rows.set(event.id, row);
    }
    return rows;
};

// The radius of a marker: grows with the media that told the event, 5 px for one and 13 for a hundred or more
export const radiusOf = (media) => Math.round(5 + 8 * Math.min(1, Math.log10(Math.max(1, media)) / 2));

// The bars of the coverage: [{x, width, height, day, media, news}], the tallest day 'maxHeight' px. A day with
// nobody is a bar of nothing: the gap is the information
export const barsOf = (coverageDays, axis, maxHeight = 56) => {
    const peak = Math.max(1, ...coverageDays.map(day => day.media));
    return coverageDays.map(day => ({
        ...day,
        x: axis.x(localDay(day.day)),
        width: Math.max(2, axis.perDay - 3),
        height: day.media === 0 ? 0 : Math.max(2, Math.round((day.media / peak) * maxHeight)),
    }));
};

// How far the line is scrolled when the wheel turns over it: the turn of a mouse wheel (vertical) moves it sideways, until the
// line is at its end that way, when the page scrolls instead; a sideways swipe is left to the browser. Answers the new
// scrollLeft, or null to leave the event alone. node: {scrollLeft, scrollWidth, clientWidth}
export const wheelScrolled = ({deltaX, deltaY, deltaMode = 0}, {scrollLeft, scrollWidth, clientWidth}) => {
    if (Math.abs(deltaX) >= Math.abs(deltaY)) return null;
    const most = scrollWidth - clientWidth;
    if (most <= 0) return null;
    // a wheel that counts in lines (Firefox) or in pages
    const delta = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * clientWidth : deltaY;
    if ((delta < 0 && scrollLeft <= 0) || (delta > 0 && scrollLeft >= most - 1)) return null;
    return Math.min(most, Math.max(0, scrollLeft + delta));
};

// The mouse moves this far before it is a drag and no click on a marker
export const DRAG_PX = 4;

// The scrollLeft of a line dragged with the mouse: it follows the hand, as a sheet pulled
export const draggedTo = (startLeft, startX, x) => startLeft - (x - startX);
