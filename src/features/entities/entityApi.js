//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: entityApi.js
//  Description: Calls of the clubs, people and organisations the profile follows, as Wikidata knows them
//

import {withProfile} from "@/features/profiles/activeProfile.js";

const API_URL = import.meta.env.VITE_API_URL;
const HEADERS = {'Content-Type': 'application/json'};

const send = async (path, {method = 'GET', body} = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: withProfile(HEADERS),
        ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
    });
    return await response.json();
};

export const EntityApi = {
    // {items: [{qid, label, description}]}: the items of Wikidata named so
    search: (q) => send(`/entities/search?${new URLSearchParams({q})}`),
    // {entities: [{qid, label, description, kind, names, followed, links}]}
    list: () => send('/entities'),
    follow: (qid) => send('/entities', {method: 'POST', body: {qid}}),
    unfollow: (qid) => send(`/entities/${encodeURIComponent(qid)}`, {method: 'DELETE'}),
    // {entity, hours, count, news, links: [{qid, label, description, kind, relation, count, news}]}
    page: (qid, hours) => send(`/entities/${encodeURIComponent(qid)}?hours=${hours}`),
    // added: names of the reader; removed: names of Wikidata taken out. {entity}
    setNames: (qid, added, removed) => send(`/entities/${encodeURIComponent(qid)}/names`, {method: 'PUT', body: {added, removed}}),
};
