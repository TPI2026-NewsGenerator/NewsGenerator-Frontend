//
//  Author: Fabian Rostello
//  Date: 03.10.2026
//  File: windows.js
//  Description: The hours of news a briefing can be written from, as the server takes them (see
//               briefing-service.js on the server)
//

// 3 days instead of 2 since 14.10.2026
export const WINDOWS = [
    {hours: 24, label: '24 hours'},
    {hours: 72, label: '3 days'},
    {hours: 168, label: '7 days'},
];
export const DEFAULT_HOURS = 72;

// the window to ask for, after a briefing of these hours: the default for one no longer offered (2 days)
export const windowAfter = (hours) => WINDOWS.some(window => window.hours === hours) ? hours : DEFAULT_HOURS;

// "3 days": what the reader chose, said in the texts of the page; "2 days" for a briefing of before
export const spanOf = (hours) => WINDOWS.find(window => window.hours === hours)?.label
    ?? (hours > 24 && hours % 24 === 0 ? `${hours / 24} days` : `${hours} hours`);
