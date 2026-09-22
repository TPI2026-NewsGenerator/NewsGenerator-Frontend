//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: searchApi.js
//  Description: Fetch news api for news feed component
//

const API_URL = import.meta.env.VITE_API_URL;

export const SearchApi = {
    // topics given by the AI to the news, usable in the "topics" filter
    getTopics: async () => {
        const response = await fetch(`${API_URL}/news/topics`);
        return await response.json();
    },
    getNews: async (query, token) => {
        const response = await fetch(`${API_URL}/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(query),
        });

        return await response.json();
    },
    // full content of the selected news (urls from getNews, 10 max)
    getNewsContent: async (urls, token) => {
        const response = await fetch(`${API_URL}/news/content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({urls}),
        });

        return await response.json();
    },
    // AI resume of the selected news (urls from getNews, 10 max)
    getNewsSummary: async (urls, token) => {
        const response = await fetch(`${API_URL}/news/summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({urls}),
        });

        return await response.json();
    }
}
