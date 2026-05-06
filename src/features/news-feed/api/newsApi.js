//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: newsApi.js
//  Description: Fetch news api for news feed component
//

const API_URL = import.meta.env.VITE_API_URL;

export const NewsApi = {
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
    }
}
