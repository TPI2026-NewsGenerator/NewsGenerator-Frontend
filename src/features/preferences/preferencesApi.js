//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: preferencesApi.js
//  Description: Calls of the display preferences kept on the account of the reader (see server/services/utils/preferences.js)
//

import {readAnswer} from "@/lib/readAnswer.js";

const API_URL = import.meta.env.VITE_API_URL;

// the session goes in its cookie (see features/auth/AuthContext.jsx): the browser sends it itself
const send = async (method, body) => {
    const response = await fetch(`${API_URL}/account/preferences`, {
        method,
        ...(body !== undefined ? {headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {}),
    });
    return await readAnswer(response);
};

export const PreferencesApi = {
    // {preferences: {layout, mailBlocks, pageBlocks, mailPresets, pagePresets, show, format, size, followingNews}}, each key only when the reader set it, or {error}
    get: () => send('GET'),
    // changes: the preferences to change, the others stay as they are -> {preferences}, all of them as now kept, or {error}
    save: (changes) => send('PUT', changes),
};
