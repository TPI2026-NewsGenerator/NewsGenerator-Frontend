//
//  Author: Fabian Rostello
//  Date: 03.10.2026
//  File: windows.js
//  Description: The hours of news a briefing can be written from, as the server takes them (see
//               briefing-service.js on the server)
//

export const WINDOWS = [
    {hours: 24, label: '24 hours'},
    {hours: 48, label: '2 days'},
    {hours: 168, label: '7 days'},
];
export const DEFAULT_HOURS = 48;

// "2 days": what the reader chose, said in the texts of the page
export const spanOf = (hours) => WINDOWS.find(window => window.hours === hours)?.label ?? `${hours} hours`;
