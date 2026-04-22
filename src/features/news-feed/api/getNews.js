"use strict"

// Fetch
//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: getNews.js
//  Description: Fetch news api for news feed component
//

const API_URL = import.meta.env.VITE_API_URL;

export const getNews = async (query) => {
    const response = await fetch(`${API_URL}/news`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
    });

    return await response.json();
}