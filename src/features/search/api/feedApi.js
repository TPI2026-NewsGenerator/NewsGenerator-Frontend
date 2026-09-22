//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: feedApi.js
//  Description: Feeds added by the user, private to them
//

const API_URL = import.meta.env.VITE_API_URL;

const headers = (token) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
});

export const FeedApi = {
    getUserFeeds: async (token) => {
        const response = await fetch(`${API_URL}/feeds`, {method: 'GET', headers: headers(token)});
        return await response.json();
    },
    // site: the address of a website ("fortune.com"), the server finds its feed
    addUserFeed: async ({site, category}, token) => {
        const response = await fetch(`${API_URL}/feeds`, {
            method: 'POST',
            headers: headers(token),
            body: JSON.stringify({site, category}),
        });
        return await response.json();
    },
    // media covering the last search that are missing from the sources of the user
    suggestSources: async ({keywords, timeframe}, token) => {
        const response = await fetch(`${API_URL}/feeds/suggestions`, {
            method: 'POST',
            headers: headers(token),
            body: JSON.stringify({keywords, timeframe}),
        });
        return await response.json();
    },
    // add several suggested sources at once: [{site, feed, category}]
    importSources: async (sources, token) => {
        const response = await fetch(`${API_URL}/feeds/import`, {
            method: 'POST',
            headers: headers(token),
            body: JSON.stringify({sources}),
        });
        return await response.json();
    },
    deleteUserFeed: async (id, token) => {
        const response = await fetch(`${API_URL}/feeds/${id}`, {method: 'DELETE', headers: headers(token)});
        return await response.json();
    },
}
