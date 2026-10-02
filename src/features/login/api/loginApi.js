//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: loginApi.js
//  Description: Call Rest API for login
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
    },

    // {username, email, password, text, language, topics} -> {id_user, token}, as the login: the
    // profile is read by the AI before the account is created
    register: async (account) => {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(account),
        });

        return await response.json();
    },
}
