//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: briefingApi.js
//  Description: Calls of the daily briefing and of the profile it is written for
//

const API_URL = import.meta.env.VITE_API_URL;

// the session goes in its cookie (see features/auth/AuthContext.jsx): the browser sends it itself
const HEADERS = {'Content-Type': 'application/json'};

const send = async (path, {method = 'GET', body} = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: HEADERS,
        ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
    });
    return await response.json();
};

export const BriefingApi = {
    // the last briefing, {briefing: null} before the first one
    getLatest: () => send('/briefing'),
    // a new briefing of the news of the last hours (24, 48 or 168), written in background: getLatest
    // until its status is 'ready' or 'failed'
    start: (hours) => send('/briefing', {method: 'POST', body: {hours}}),
    // the thumb of the reader on a card: 'up', 'down' or null to take it back (204, no body)
    vote: async (briefingId, storyId, vote) => {
        const response = await fetch(`${API_URL}/briefing/${briefingId}/vote`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({storyId, vote}),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`);
    },
};

export const ProfileApi = {
    // {profile, interests, sources}, profile null before the user wrote one
    get: () => send('/profile'),
    // the languages a profile can choose
    getOptions: async () => {
        const response = await fetch(`${API_URL}/profile/options`);
        return await response.json();
    },
    // {text, language}: the AI splits it into interests, the sources are found in background
    save: (profile) => send('/profile', {method: 'PUT', body: profile}),
    updateInterest: (id, changes) => send(`/profile/interests/${id}`, {method: 'PATCH', body: changes}),
    deleteInterest: (id) => send(`/profile/interests/${id}`, {method: 'DELETE'}),
    rediscover: () => send('/profile/discover', {method: 'POST'}),
    // a source the thumbs left out, kept: it comes back for good. Answers the profile
    keepSource: (url) => send('/profile/kept-sources', {method: 'POST', body: {url}}),
};
