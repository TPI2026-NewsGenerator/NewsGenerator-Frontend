//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: feedApi.js
//  Description: Feeds added by the user, private to them
//

const API_URL = import.meta.env.VITE_API_URL;

// the session goes in its cookie (see features/auth/AuthContext.jsx): the browser sends it itself
const HEADERS = {'Content-Type': 'application/json'};

export const FeedApi = {
    getUserFeeds: async () => {
        const response = await fetch(`${API_URL}/feeds`, {method: 'GET', headers: HEADERS});
        return await response.json();
    },
    // site: the address of a website ("fortune.com"), the server finds its feed
    addUserFeed: async ({site, category, language}) => {
        const response = await fetch(`${API_URL}/feeds`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({site, category, language}),
        });
        return await response.json();
    },
    // media covering the last search that are missing from the sources of the user
    suggestSources: async ({keywords, timeframe, language}) => {
        const response = await fetch(`${API_URL}/feeds/suggestions`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({keywords, timeframe, language}),
        });
        return await response.json();
    },
    // {sources}: from 'directory' the feeds named like the query ("premier league") or of a site,
    // from 'web' the media publishing on it lately (about half a minute)
    searchSources: async (query, language = 'en', from = 'directory') => {
        const response = await fetch(`${API_URL}/feeds/search`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({query, language, from}),
        });
        return await response.json();
    },
    // {sites}: the feed found for each address of a list the reader imports (25 at most), with its
    // status: ready, bridge, asleep, flood, added or none. Nothing is added
    checkSites: async (sites, language = 'en') => {
        const response = await fetch(`${API_URL}/feeds/check`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({sites, language}),
        });
        return await response.json();
    },
    // add several suggested sources at once: [{site, feed, category}]
    // the language and the keywords are sent with them: a site that publishes no feed has its own
    // read again by the server, and they tell it which section of the site to read
    importSources: async (sources, language = 'en', subject = null) => {
        const response = await fetch(`${API_URL}/feeds/import`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({sources, language, subject}),
        });
        return await response.json();
    },
    deleteUserFeed: async (id) => {
        const response = await fetch(`${API_URL}/feeds/${id}`, {method: 'DELETE', headers: HEADERS});
        return await response.json();
    },
    // a source added by hand, {trusted} and/or {shared}. Trusted: its stories come first in the
    // briefing. Shared: it can be recommended to the other readers whose interests it publishes on
    updateFeed: async (id, changes) => {
        const response = await fetch(`${API_URL}/feeds/${id}`, {
            method: 'PATCH',
            headers: HEADERS,
            body: JSON.stringify(changes),
        });
        return await response.json();
    },
    // {sources}: feeds found for other readers, or shared by them, that publish on the interests of this one
    getRecommended: async () => {
        const response = await fetch(`${API_URL}/feeds/recommended`, {method: 'GET', headers: HEADERS});
        return await response.json();
    },
    // {feeds, errors}: the recommended sources added, by their id
    addRecommended: async (ids) => {
        const response = await fetch(`${API_URL}/feeds/recommended`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ids}),
        });
        return await response.json();
    },
}
