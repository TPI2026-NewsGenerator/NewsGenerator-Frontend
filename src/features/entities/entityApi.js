//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: entityApi.js
//  Description: Calls of what the profile follows: the clubs, people and organisations as Wikidata knows
//               them, and the names or words as written
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
    // a list of names (10 at most) looked for in Wikidata, one after the other: {results: [{name, status, item?, items?,
    // famous?}]}, status: known, linked (item), choose (items), word, invalid
    importCheck: (names) => send('/entities/import/check', {method: 'POST', body: {names}}),
    // a list of names followed at once: qids, the items of Wikidata, words, the names as written.
    // {added: {items, words}, left: {full, missing, invalid}, entities, words, limits}
    importNames: ({qids, words}) => send('/entities/import', {method: 'POST', body: {qids, words}}),
    // {entities: [{qid, label, description, kind, names, followed, inBriefing, links}], words, limits: {total}}
    list: () => send('/entities'),
    follow: (qid) => send('/entities', {method: 'POST', body: {qid}}),
    unfollow: (qid) => send(`/entities/${encodeURIComponent(qid)}`, {method: 'DELETE'}),
    // its news in the briefing or not: {entity}
    setInBriefing: (qid, on) => send(`/entities/${encodeURIComponent(qid)}/briefing`, {method: 'PUT', body: {on}}),
    // {entity, hours, count, news, links: [{qid, label, description, kind, relation, count, news}]}
    page: (qid, hours) => send(`/entities/${encodeURIComponent(qid)}?hours=${hours}`),
    // added: names of the reader; removed: names of Wikidata taken out. {entity}
    setNames: (qid, added, removed) => send(`/entities/${encodeURIComponent(qid)}/names`, {method: 'PUT', body: {added, removed}}),
    // a name or a word followed as written, every news writing it in the briefing: {words}
    addWord: (word) => send('/entities/words', {method: 'POST', body: {word}}),
    removeWord: (word) => send(`/entities/words/${encodeURIComponent(word)}`, {method: 'DELETE'}),
    // {name, qid, followed, wordsLeft, hours, count, news}: the page of a name as written, qid the item
    // it is when the tagger linked it to one
    namePage: (name, hours) => send(`/entities/name?${new URLSearchParams({name, hours: String(hours)})}`),
    // {names: [{name, qid, kind, cards}]}: names of its cards the profile could follow
    suggestions: () => send('/entities/suggestions'),
};

// the page of a name of a card: its item's when it has one, else the one of the name as written
export const pageOf = ({name, qid}) => qid ? `/following/${qid}` : `/following/name/${encodeURIComponent(name)}`;
