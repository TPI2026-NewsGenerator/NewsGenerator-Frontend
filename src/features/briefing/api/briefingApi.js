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
    // a new briefing of the news of the last hours (1 to 7 days: 24, 48, ... 168), of 'size' cards (10, 20 or 30),
    // written in background: getLatest until its status is 'ready' or 'failed'
    start: (hours, size) => send('/briefing', {method: 'POST', body: {hours, size}}),
    // the news of what the profile follows, read now and not part of a briefing: 'limit' (10 to 100) for each
    // name or word, the search going back up to 30 days to find them. {limit, groups: [{term, qid, count,
    // hours, limit, news: [{storyId, title, url, source, language, publishedAt, media, excerpt, marks}]}]}
    following: (limit) => send(`/briefing/following?limit=${limit}`),
    // the cards of the briefing ticked (their storyId) sent to the address 'to', the one of the account
    // when not given (204, no body). pictures: {storyId: null | {url} | {data}}, the picture of the
    // cards the reader changed: taken out, an image of the web, a file of theirs in base64. titles:
    // {storyId: title}, the ones the reader wrote for the e-mail; removed: {storyId: {contested: [index],
    // angles: [index], official: [index], why: [index], next: [index], timeline: [index]}}, the denials,
    // other angles, official sources and lines of the AI analysis they took out; format: the way their
    // sentences are shown, 'points', 'digest' or 'passages' (see formats.js), the key passages when not
    // given; ai: the storyIds of the cards sent in their AI version; texts: {storyId: [paragraph]}, the
    // points or paragraphs the reader wrote instead of the card's in that way
    email: async (briefingId, storyIds, to, pictures, titles, removed, format, ai, texts) => {
        const some = (map) => map && Object.keys(map).length > 0;
        const response = await fetch(`${API_URL}/briefing/${briefingId}/email`, {
            method: 'POST',
            headers: withProfile(HEADERS),
            body: JSON.stringify({storyIds, to, ...(some(pictures) ? {pictures} : {}), ...(some(titles) ? {titles} : {}), ...(some(removed) ? {removed} : {}),
                ...(format ? {format} : {}), ...(ai?.length ? {ai} : {}), ...(some(texts) ? {texts} : {})}),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`);
    },
    // a news added at the end of the briefing by its link: answers {item, analysis}, its card and, when it was
    // copied from another briefing of the reader with its analysis, that analysis ({why, next, timeline}),
    // else null (see importNews on the server)
    addNews: async (briefingId, url) => {
        const response = await fetch(`${API_URL}/briefing/${briefingId}/news`, {
            method: 'POST',
            headers: withProfile(HEADERS),
            body: JSON.stringify({url}),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
        return {item: data.item, analysis: data.analysis ?? null};
    },
    // a news added taken out again (204, no body)
    removeNews: async (briefingId, storyId) => {
        const response = await fetch(`${API_URL}/briefing/${briefingId}/news/${storyId}`, {method: 'DELETE', headers: withProfile(HEADERS)});
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`);
    },
    // {pictures: [{url, source}]}: the pictures of a card the reader can put in the e-mail instead
    pictures: (briefingId, storyId) => send(`/briefing/${briefingId}/stories/${storyId}/pictures`),
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
    // A profile written with the AI, before the account too, nothing saved. {start, rounds, language},
    // rounds: [[{question, options, chosen, free}]] answered so far -> {enough, questions: [{question,
    // options}]}, the next round; then -> {text}, the profile written from the answers
    funnelQuestions: (funnel) => send('/profile/funnel/questions', {method: 'POST', body: funnel}),
    funnelText: (funnel) => send('/profile/funnel/text', {method: 'POST', body: funnel}),
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
    // The projects of the profile, written with the AI as a profile is ({start, rounds} -> {enough,
    // questions}, then -> {text}); saved ({name, text, endsOn}), their last day changed, deleted. Each
    // answers the profile
    projectQuestions: (funnel) => send('/profile/projects/funnel/questions', {method: 'POST', body: funnel}),
    projectText: (funnel) => send('/profile/projects/funnel/text', {method: 'POST', body: funnel}),
    createProject: (project) => send('/profile/projects', {method: 'POST', body: project}),
    setProjectEnd: (id, endsOn) => send(`/profile/projects/${id}`, {method: 'PATCH', body: {endsOn}}),
    removeProject: (id) => send(`/profile/projects/${id}`, {method: 'DELETE'}),
    // the profiles of the reader: {profiles: [{id, name}]}
    list: () => send('/profile/profiles'),
    // {name, text, language}: another profile, answered as the profile shown
    create: (profile) => send('/profile/profiles', {method: 'POST', body: profile}),
    rename: (id, name) => send(`/profile/profiles/${id}`, {method: 'PATCH', body: {name}}),
    // answers the profiles left
    remove: (id) => send(`/profile/profiles/${id}`, {method: 'DELETE'}),
};
