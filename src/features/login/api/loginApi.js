//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: newsApi.js
//  Description: LoginApi API
//

const API_URL = import.meta.env.VITE_API_URL;

export const LoginApi = {
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
