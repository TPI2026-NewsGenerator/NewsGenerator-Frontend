//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: accountApi.js
//  Description: Calls of the settings of an account: its username, its email and its password
//

const API_URL = import.meta.env.VITE_API_URL;

// the session goes in its cookie, which the server starts again with the account changed
const put = async (path, body) => {
    const response = await fetch(`${API_URL}${path}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
    });
    return await response.json().catch(() => ({error: `The server answered ${response.status}.`}));
};

export const AccountApi = {
    // {id, username, email, role}, or {error}
    rename: ({username, password}) => put('/account/username', {username, password}),
    changeEmail: ({email, password}) => put('/account/email', {email, password}),
    changePassword: ({password, newPassword}) => put('/account/password', {password, newPassword}),
};
