//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: affairApi.js
//  Description: Calls of the affairs a reader follows, and of the devices told when one moves
//

import {withProfile} from "@/features/profiles/activeProfile.js";
import {readAnswer} from "@/lib/readAnswer.js";

const API_URL = import.meta.env.VITE_API_URL;
const HEADERS = {'Content-Type': 'application/json'};

// the answer as data, a 204 as null, a refusal as {error}
const send = async (path, {method = 'GET', body} = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: withProfile(HEADERS),
        ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
    });
    if (response.status === 204) return null;
    return await readAnswer(response);
};

export const AffairApi = {
    // {affairs: [{id, title, followedAt, lastEventAt, unread, events, key, media, last}], unread}
    list: () => send('/affairs'),
    // {unread}: the alerts not read, over all the affairs followed (the badge of the bar)
    unread: () => send('/affairs/unread'),
    // {id, title, followedAt, lastEventAt, events, coverage, alerts: [{id, at, read, event}]}
    detail: (id) => send(`/affairs/${id}`),
    // the affair behind a card of a briefing: {id, already}
    follow: (briefingId, storyId) => send('/affairs', {method: 'POST', body: {briefingId, storyId}}),
    // the reader opened it: its alerts are read (null)
    seen: (id) => send(`/affairs/${id}/seen`, {method: 'POST'}),
    // the reader stops following it (null)
    unfollow: (id) => send(`/affairs/${id}`, {method: 'DELETE'}),
    // {enabled, publicKey}: whether the server can send, and the key a browser subscribes with
    pushKey: () => send('/affairs/push/key'),
    // the device, as the browser gave it (null)
    subscribe: (subscription) => send('/affairs/push/subscription', {method: 'POST', body: subscription}),
    unsubscribe: (endpoint) => send('/affairs/push/subscription', {method: 'DELETE', body: {endpoint}}),
};
