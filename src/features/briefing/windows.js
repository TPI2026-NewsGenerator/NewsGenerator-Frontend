//
//  Author: Fabian Rostello
//  Date: 03.10.2026
//  File: windows.js
//  Description: The hours of news a briefing can be written from, as the server takes them (see
//               briefing-service.js on the server)
//

// 1 to 7 days, chosen on a bar since 14.10.2026 (24 hours, 2 or 7 days before), 2 days by default
export const MIN_DAYS = 1;
export const MAX_DAYS = 7;
export const DEFAULT_HOURS = 48;

// the window to ask for after a briefing of these hours: the default for one the bar does not give
export const windowAfter = (hours) =>
    Number.isInteger(hours) && hours % 24 === 0 && hours >= MIN_DAYS * 24 && hours <= MAX_DAYS * 24 ? hours : DEFAULT_HOURS;

// The news each name or word followed should have in the briefing, 10 to 100 on a bar since 1.11.2026, 100
// by default (see WATCH_LIMITS on the server): the search goes back, up to 30 days, until it finds them
export const MIN_WATCH = 10;
export const MAX_WATCH = 100;
export const WATCH_STEP = 10;
export const DEFAULT_WATCH = 100;

// the number to ask for after a briefing that wanted this many: the default for one that did not say
export const watchLimitAfter = (limit) =>
    Number.isInteger(limit) && limit % WATCH_STEP === 0 && limit >= MIN_WATCH && limit <= MAX_WATCH ? limit : DEFAULT_WATCH;

// "24 hours", "3 days": what the reader chose, said in the texts of the page
export const spanOf = (hours) => hours > 24 && hours % 24 === 0 ? `${hours / 24} days` : `${hours} hours`;
