//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: searchApi.js
//  Description: Fetch news api for news feed component
//

const API_URL = import.meta.env.VITE_API_URL;

export const CustomSearchApi = {
    // the user is identified by the token, no userId is sent
    getUserCustomSearch: async (token) => {
        const response = await fetch(`${API_URL}/customsearch`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        return await response.json();
    },
    postUserCustomSearch: async (query, token) => {
        const response = await fetch(`${API_URL}/customsearch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(query),
        });

        return await response.json();
    },
    deleteUserCustomSearch: async (query, token) => {
        const response = await fetch(`${API_URL}/customsearch`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(query),
        });

        return await response.json();
    }
}
