//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: briefingApi.js
//  Description: Calls of the daily briefing and of the profile it is written for
//

import {withProfile} from "@/features/profiles/activeProfile.js";

const API_URL = import.meta.env.VITE_API_URL;

// the session goes in its cookie (see features/auth/AuthContext.jsx): the browser sends it itself
const HEADERS = {'Content-Type': 'application/json'};

const send = async (path, {method = 'GET', body} = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: withProfile(HEADERS),
        ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
    });
    return await response.json();
};

export const BriefingApi = {
    // the last briefing, {briefing: null} before the first one
    getLatest: () => send('/briefing'),
    // a new briefing of the news of the last hours (24, 48 or 168), of 'size' cards (10, 20 or 30),
    // written in background: getLatest until its status is 'ready' or 'failed'
    start: (hours, size) => send('/briefing', {method: 'POST', body: {hours, size}}),
    // the cards of the briefing ticked (their storyId) sent to the address 'to', the one of the account
    // when not given (204, no body)
    email: async (briefingId, storyIds, to) => {
        const response = await fetch(`${API_URL}/briefing/${briefingId}/email`, {
            method: 'POST',
            headers: withProfile(HEADERS),
            body: JSON.stringify({storyIds, to}),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`);
    },
    // the thumb of the reader on a card: 'up', 'down' or null to take it back (204, no body)
    vote: async (briefingId, storyId, vote) => {
        const response = await fetch(`${API_URL}/briefing/${briefingId}/vote`, {
            method: 'POST',
            headers: withProfile(HEADERS),
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
    // a source the thumbs left out, kept by its key: it comes back for good. Answers the profile
    keepSource: (key) => send('/profile/kept-sources', {method: 'POST', body: {key}}),
    // a source found for the profile removed: it is not found again. Answers the profile
    removeSource: (id) => send(`/profile/sources/${id}`, {method: 'DELETE'}),
    // a source removed brought back, by its key. Answers the profile
    restoreSource: (key) => send('/profile/removed-sources/restore', {method: 'POST', body: {key}}),
    // the names or words whose news are always shown. Answers the profile
    setWatchTerms: (terms) => send('/profile/watch-terms', {method: 'PUT', body: {terms}}),
    // the profiles of the reader: {profiles: [{id, name}]}
    list: () => send('/profile/profiles'),
    // {name, text, language}: another profile, answered as the profile shown
    create: (profile) => send('/profile/profiles', {method: 'POST', body: profile}),
    rename: (id, name) => send(`/profile/profiles/${id}`, {method: 'PATCH', body: {name}}),
    // answers the profiles left
    remove: (id) => send(`/profile/profiles/${id}`, {method: 'DELETE'}),
};
