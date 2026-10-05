//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: sourceRows.js
//  Description: The sources of the reader as the one list of the profile page (see SourceList)
//

// the sources as one list, by name: found [{id, site, url, category, language, trusted, error, relevant,
// newsPerDay, flood}] of the profile, own [{id, site, url, category, trusted, shared, error, newsPerDay,
// flood}] added by hand, refused
// [{url, site, refused, liked}] left out by the thumbs, marked when they are among the others
export const sourceRows = (found = [], own = [], refused = []) => {
    const leftOut = new Map(refused.map(source => [source.url, source]));
    const rows = [
        ...found.map(source => ({...source, key: `profile:${source.id}`, origin: 'profile', leftOut: leftOut.get(source.url)})),
        ...own.map(feed => ({...feed, key: `user:${feed.id}`, origin: 'user', leftOut: leftOut.get(feed.url)})),
    ];
    const listed = new Set(rows.map(row => row.url));
    for (const source of refused.filter(source => !listed.has(source.url))) {
        rows.push({key: `left:${source.url}`, site: source.site, url: source.url, origin: 'profile', leftOut: source});
    }
    return rows.sort((a, b) => a.site.localeCompare(b.site));
};
