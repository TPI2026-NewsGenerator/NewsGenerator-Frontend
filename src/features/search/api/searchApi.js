//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: searchApi.js
//  Description: Fetch news api for news feed component
//

import {withProfile} from "@/features/profiles/activeProfile.js";

const API_URL = import.meta.env.VITE_API_URL;

export const SearchApi = {
    // categories of feeds that can be searched
    // the categories are those of the sources of this language
    getCategories: async (language = 'en') => {
        const response = await fetch(`${API_URL}/news/categories?language=${encodeURIComponent(language)}`);
        return await response.json();
    },
    getNews: async (query) => {
        const response = await fetch(`${API_URL}/news`, {
            method: 'POST',
            headers: withProfile({'Content-Type': 'application/json'}),
            body: JSON.stringify(query),
        });

        return await response.json();
    },
    // full content of the selected news (urls from getNews, 10 max)
    getNewsContent: async (urls) => {
        const response = await fetch(`${API_URL}/news/content`, {
            method: 'POST',
            headers: withProfile({'Content-Type': 'application/json'}),
            body: JSON.stringify({urls}),
        });

        return await response.json();
    },
    // the titles and descriptions of the cards reached ('news', 30 max) and the titles of the facts of
    // their affairs ('titles', 60 max), translated into the language searched when written in another:
    // {translations: [{url, language, title, description}]}
    translateNews: async ({news, titles}, language) => {
        const response = await fetch(`${API_URL}/news/translations`, {
            method: 'POST',
            headers: withProfile({'Content-Type': 'application/json'}),
            body: JSON.stringify({news, titles, language}),
        });

        return await response.json();
    },
    // key passages of the cards chosen (10 max), each with the urls of its articles, its lead first,
    // written in the language searched
    getNewsSummary: async (stories, language) => {
        const response = await fetch(`${API_URL}/news/summary`, {
            method: 'POST',
            headers: withProfile({'Content-Type': 'application/json'}),
            body: JSON.stringify({stories, language}),
        });

        return await response.json();
    }
}
