//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: searchApi.js
//  Description: Fetch news api for news feed component
//

const API_URL = import.meta.env.VITE_API_URL;

export const SearchApi = {
    // categories of feeds that can be searched
    // the categories are those of the sources of this language
    getCategories: async (language = 'en') => {
        const response = await fetch(`${API_URL}/news/categories?language=${encodeURIComponent(language)}`);
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
    // AI resume of the cards chosen (10 max), each with the urls of its articles, its lead first,
    // written in the language searched
    getNewsSummary: async (stories, language, token) => {
        const response = await fetch(`${API_URL}/news/summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({stories, language}),
        });

        return await response.json();
    }
}
