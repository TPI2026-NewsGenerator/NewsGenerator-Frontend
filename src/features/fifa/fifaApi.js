//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifaApi.js
//  Description: Calls of the page "The FIFA presidency": the map with the position of every association, the sheet of one, the
//               presidents and the confederations (see bench/fifa/README.md for the shapes)
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

export const FifaApi = {
    // {generated_at, levels: [the positions the server stands behind], subjects: [{qid, name, color_index, status, state, positions_known,
    // uncertain_count}], members: [{qid, fifa, name, association, level, confederation, iso, lat, lng, leader, positions, coverage}]}
    map: () => send('/fifa/map'),
    // the sheet of one member: {member, positions, signals: [...], history: [...], leader, votes: [{subject_qid, value, by, at, note, source}], sources:
    // [{subject_qid, value, by, at, note, url, medium, check, found, checked_at}], notes: [{id, by, at, text, mine}]} (votes: newest first, the withdrawn
    // ones too, value 'withdraw'; sources: the ones of the choices that stand (kind 'choice') and the pages readers added on their own (kind 'page', with
    // id, readings, mine), newest first; check: 'pending' | 'says' | 'contradicts' | 'unclear' | 'unreadable'; notes: newest first; signals carry added_by and
    // source_id when they come from a page a reader added)
    // It also carries `summary` {candidates: [{subject_qid, name, color_index, status, position, ai_position, since, previous, changed, stale, signals_count, uncertain_count,
    // articles_30d, media_30d, human, confirmed, sides: [{stance, declared, probable, first_at, last_at, media, speakers: [{name, role, binds}], key: [{id, sentence, url, medium,
    // published_at, level, speaker, role, binds}]}], latest_change}]} built by the code (positions first; sides[0] is the side the position stands on), `context` null | {confederation:
    // {qid, fifa, name}, own: {[subject_qid]: {position, since}}, associations: {[subject_qid]: {for, against, unknown, total}}}, `ai_summary` null | {claims: [{text, facts: [ids]}],
    // facts: [{id, kind, text, url?, medium?, date?}], model, generated_at, by, current} and `ai_summary_available` (false when there is nothing to summarise or it is switched off)
    association: (qid) => send(`/fifa/associations/${encodeURIComponent(qid)}`),
    // A reader asks the AI to summarise a sheet, no body: it takes 5 to 20 seconds, 5 an hour at most -> 200 {ai_summary, generated}; a refusal is {error, status}: 409 nothing to
    // summarise, 502 the AI gave nothing usable (try again), 403 switched off, 429 after 5 an hour, 401 signed out
    summarise: (qid) => send(`/fifa/associations/${encodeURIComponent(qid)}/summary`, {method: 'POST'}),
    // The news of the last 30 days that name the president of an association, newest first, a page at a time (the same news the president's "articles in 30 days" count):
    // GET .../leader/news?scope=football|all&limit=1..100&offset= -> {leader: {name, person_qid} | null, scope, total (of the scope asked), total_all, total_football, limit, offset,
    // articles: [{id, title, description, medium, url, lang, published_at, relevant}]}; scope football (the default) keeps the news that also name the association, its
    // confederation or FIFA, or hold a football word (relevant: it would pass that filter, true for all of them in scope football); leader null and an empty list when the
    // association has no president; 404 unknown, 422, 429 after 30 requests a minute ({error, status})
    leaderNews: (qid, {scope = 'football', limit = 50, offset = 0} = {}) => send(`/fifa/associations/${encodeURIComponent(qid)}/leader/news?scope=${scope}&limit=${limit}&offset=${offset}`),
    // {presidents: [{person_qid, name, role, since, checked_at, member_qid}]}
    presidents: () => send('/fifa/presidents'),
    // {confederations: [member of level 'confederation' + members_count]}
    confederations: () => send('/fifa/confederations'),
    // {subjects: [...]}
    subjects: () => send('/fifa/subjects'),
    // Persons of Wikidata a reader can add as a candidate: {people: [{qid, name, description}]}; 422 under 2 letters, 429 'Too many searches...'
    people: (q) => send(`/fifa/people?q=${encodeURIComponent(q)}`),
    // A reader adds a candidate, no one has to validate it: body {qid, status?: 'declared' | 'rumoured' | 'withdrawn'} -> {subject, already} (201 added,
    // 200 already there); a refusal is {error, status} (409 six candidates and none withdrawn, 422 not a person, 429 three a day)
    addSubject: (body) => send('/fifa/subjects', {method: 'POST', body}),
    // Any signed-in reader removes a candidate from the map (the system can be wrong), with no administrator to validate it: null when done (204); everything read for it
    // (signals, votes, the sources joined to the votes) is deleted and the news never bring it back (a reader can add it again by hand). A refusal is {error, status}:
    // 403 the president in office (only an administrator removes him), 404 unknown, 429 after 10 removals an hour, 401 signed out
    removeSubject: (qid) => send(`/fifa/subjects/${encodeURIComponent(qid)}`, {method: 'DELETE'}),
    // Any reader changes the status of a candidate: 'declared' | 'rumoured' | 'withdrawn' | 'incumbent' (null when done)
    setStatus: (qid, status) => send(`/fifa/subjects/${encodeURIComponent(qid)}`, {method: 'PATCH', body: {status}}),
    // A reader sets the position of an association on a candidate (the last vote of any reader decides for everyone) or takes their vote back.
    // body: {subject, member, value: 'for' | 'against' | 'unknown' | 'withdraw', note?}; answers {ok, human: {value, by, at, newer_evidence} | null},
    // the vote that decides now (with its source {url, medium, check, found, checked_at} or null); a refusal is {error, status} (401 signed out, 429 too many
    // votes). Optional: source {url} or the url as a string, only with value 'for' or 'against' (422 with the others, and 422 not an address, a password in it or over 500
    // characters, 400 a private address, 429 after 20 a day: the message of the server is said) and note (up to 280 characters)
    vote: (body) => send('/fifa/votes', {method: 'POST', body}),
    // A reader adds the link of a PAGE about an association, with no candidate chosen: body {member, source: url (or {url}), note?} (up to 280 characters) ->
    // {source: {id, kind: 'page', subject_qid, value, by, at, note, url, medium, check, found, checked_at, readings: [{subject_qid, stance, level, found}], mine}} (201);
    // the AI reads it like a news in the background and what it finds COUNTS for the positions. A refusal is {error, status}: 422 not an address, 400 a private
    // address, 429 after 20 sources a day (shared with the sources of the choices) or 10 in 10 minutes: the message of the server is said
    addSource: (body) => send('/fifa/sources', {method: 'POST', body}),
    // The reader who added a page, or an administrator, deletes it, and the signals it gave with it: null when done (204); a refusal is {error, status} (403, 404)
    deleteSource: (id) => send(`/fifa/sources/${encodeURIComponent(id)}`, {method: 'DELETE'}),
    // A reader writes a note on an association, every reader sees it: body {member, text} (1 to 500 characters, trimmed) -> {note: {id, by, at, text, mine}}
    // (201); a refusal is {error, status} (422 / 429 ten notes an hour)
    addNote: (body) => send('/fifa/notes', {method: 'POST', body}),
    // The author of a note, or an administrator, deletes it: null when done (204); a refusal is {error, status} (403 not theirs, 404)
    deleteNote: (id) => send(`/fifa/notes/${encodeURIComponent(id)}`, {method: 'DELETE'}),
};
