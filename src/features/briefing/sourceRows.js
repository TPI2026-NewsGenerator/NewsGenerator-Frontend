//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: sourceRows.js
//  Description: The sources of the reader as the one list of the profile page (see SourceList)
//

// the sources as one list, by name: found [{id, key, site, url, category, language, trusted, error, relevant,
// newsPerDay, flood}] of the profile, own [{id, key, site, url, category, trusted, shared, error, newsPerDay,
// flood}] added by hand, refused
// [{key, url, site, refused, liked}] left out by the thumbs, marked when they are among the others, removed
// [{key, site, url, category, language}] found for the profile and removed by the reader.
// A source is matched by its key: a site read from its web page comes with no url (the address of the
// RSS-Bridge of the server is never sent)
export const sourceRows = (found = [], own = [], refused = [], removed = []) => {
    const leftOut = new Map(refused.map(source => [source.key, source]));
    const listed = new Set([...found, ...own].map(source => source.key));
    const rows = [
        ...found.map(source => ({...source, key: `profile:${source.id}`, origin: 'profile', leftOut: leftOut.get(source.key)})),
        ...own.map(feed => ({...feed, key: `user:${feed.id}`, origin: 'user', leftOut: leftOut.get(feed.key)})),
    ];
    for (const source of refused.filter(source => !listed.has(source.key))) {
        rows.push({key: `left:${source.key}`, site: source.site, url: source.url, origin: 'profile', leftOut: source});
    }
    for (const source of removed) {
        rows.push({...source, key: `removed:${source.key}`, removedKey: source.key, origin: 'profile', removed: true});
    }
    return rows.sort((a, b) => a.site.localeCompare(b.site));
};
