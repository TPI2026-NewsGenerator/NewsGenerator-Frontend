//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: briefingApi.js
//  Description: Calls of the daily briefing and of the profile it is written for
//

const API_URL = import.meta.env.VITE_API_URL;

const headers = (token) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
});

const send = async (path, token, {method = 'GET', body} = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: headers(token),
        ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
    });
    return await response.json();
};

export const BriefingApi = {
    // the last briefing, {briefing: null} before the first one
    getLatest: (token) => send('/briefing', token),
    // a new briefing, written in background: getLatest until its status is 'ready' or 'failed'
    start: (token) => send('/briefing', token, {method: 'POST'}),
    // the thumb of the reader on a card: 'up', 'down' or null to take it back (204, no body)
    vote: async (briefingId, storyId, vote, token) => {
        const response = await fetch(`${API_URL}/briefing/${briefingId}/vote`, {
            method: 'POST',
            headers: headers(token),
            body: JSON.stringify({storyId, vote}),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`);
    },
};

export const ProfileApi = {
    // {profile, interests, sources}, profile null before the user wrote one
    get: (token) => send('/profile', token),
    // the topics and languages a profile can choose
    getOptions: async () => {
        const response = await fetch(`${API_URL}/profile/options`);
        return await response.json();
    },
    // {text, topics, language}: the AI splits it into interests, the sources are found in background
    save: (profile, token) => send('/profile', token, {method: 'PUT', body: profile}),
    updateInterest: (id, changes, token) => send(`/profile/interests/${id}`, token, {method: 'PATCH', body: changes}),
    deleteInterest: (id, token) => send(`/profile/interests/${id}`, token, {method: 'DELETE'}),
    rediscover: (token) => send('/profile/discover', token, {method: 'POST'}),
    // a source the thumbs left out, kept: it comes back for good. Answers the profile
    keepSource: (url, token) => send('/profile/kept-sources', token, {method: 'POST', body: {url}}),
};
