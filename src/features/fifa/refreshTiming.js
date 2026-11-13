//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: refreshTiming.js
//  Description: How often the page "The FIFA presidency" asks the map again while it is open. The map carries the list of candidates, and that list can grow between two
//               visits (the server adds the candidates it finds in the news): it is asked again when the page is focused, and about every five minutes
//

// the map is asked again this often while the page is open and visible
export const REFRESH_EVERY_MS = 5 * 60e3;
// and when the page is focused again (the window, or the tab becoming visible), unless it was asked less than this long ago
export const REFRESH_MIN_GAP_MS = 30e3;
