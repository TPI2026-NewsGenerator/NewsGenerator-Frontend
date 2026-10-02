//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: searchApi.js
//  Description: Fetch news api for news feed component
//

const API_URL = import.meta.env.VITE_API_URL;

export const CustomSearchApi = {
    // the user is identified by the session, no userId is sent
    getUserCustomSearch: async () => {
        const response = await fetch(`${API_URL}/customsearch`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        return await response.json();
    },
    postUserCustomSearch: async (query) => {
        const response = await fetch(`${API_URL}/customsearch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(query),
        });

        return await response.json();
    },
    deleteUserCustomSearch: async (query) => {
        const response = await fetch(`${API_URL}/customsearch`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(query),
        });

        return await response.json();
    }
}
