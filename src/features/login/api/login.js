//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: news.js
//  Description: Login API
//

const API_URL = import.meta.env.VITE_API_URL;

export const Login = {
    authUser: async (query) => {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query),
        });

        return await response.json();
    }
}
