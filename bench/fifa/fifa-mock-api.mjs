//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-mock-api.mjs
//  Description: A local API that answers the page "The FIFA presidency" with MADE-UP data (bench/fifa/mock-data.mjs), to see it in a browser
//               before the server answers and without a session. Every answer carries mock: true. Nothing is stored, nothing is called.
//               Port 3998; MOCK_LEVELS=coarse serves only the levels ["soutien","inconnue"] (what the server does when the finer
//               ones do not pass its measure). The list of candidates is not fixed: the mock starts with A, B, C and D (D was found in the news), and E appears
//               MOCK_FOUND_AFTER_MS (90000) after it started, as if the server had found it in the news (its news are being read for 20 s); a reader can add
//               others, and any reader removes one (DELETE /fifa/subjects/:qid; 403 for the president in office, the seed one, unless MOCK_ADMIN=1: the news never bring a removed one
//               back). MOCK_SOURCE_READ_MS (15000) is how long the "AI" takes to read the page of a source; MOCK_ADMIN=1 makes
//               the reader of the session an administrator (the session says admin: true, and a note of another reader can be deleted)
//
//  node bench/fifa/fifa-mock-api.mjs
//

import {createServer} from 'node:http';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {
    ALL_LEVELS, COARSE_LEVELS, MOCK_LEADERLESS, MOCK_NEWS_SUBJECTS, MOCK_PEOPLE, MOCK_SUBJECTS, VOTE_VALUES, answerLean, answerVote, buildMock, readSourceInput, recordPage, seedAiSummaries, seedNotes, seedPages,
    writeAiSummary,
} from './mock-data.mjs';

export const PORT = Number(process.env.MOCK_PORT ?? 3998);

// the reader of the session of the mock, and a limit of votes a minute (a 429 to see)
const READER = 'mock';
const ADMIN = process.env.MOCK_ADMIN === '1';
const VOTES_A_MINUTE = 30;
// a reader joins 20 sources a day at most, writes 10 notes an hour at most (a 429 to see); a note is 1 to 500 characters, the note of a choice at most 280
const SOURCES_A_DAY = 20;
const NOTES_AN_HOUR = 10;
const NOTE_LENGTH = 500;
// a page added on its own: 10 in 10 minutes (and it counts in the 20 sources a day, like the sources of the choices), a note of up to 280 characters
const PAGES_IN_TEN_MINUTES = 10;
// a reader removes 10 candidates an hour at most
const REMOVALS_AN_HOUR = 10;
// the AI summary of a sheet: written when a reader asks (5 an hour at most), it takes SUMMARY_MS (4 s here, 5 to 20 s for the real one); MOCK_AI_SUMMARY=off switches it off
// (403, and the sheets say it is not available); the header x-mock-ai-fail: 1 makes the AI not answer (502)
const SUMMARIES_AN_HOUR = 5;
const SUMMARY_MS = Number(process.env.MOCK_SUMMARY_MS ?? 4000);
const AI_OFF = process.env.MOCK_AI_SUMMARY === 'off';
// the news that name a president: 30 requests a minute at most
const NEWS_A_MINUTE = 30;
const CHOICE_NOTE_LENGTH = 280;
// a reader adds three candidates a day at most, the map holds six, a search is limited too
const ADDS_A_DAY = 3;
const MAP_CANDIDATES = 6;
const SEARCHES_A_MINUTE = 30;
const READ_MS = 20e3;
// the server finds a candidate in the news (E of the mock) this long after the mock started
const FOUND_AFTER_MS = Number(process.env.MOCK_FOUND_AFTER_MS ?? 90e3);
const STATUSES = ['declared', 'rumoured', 'withdrawn', 'incumbent'];

export const startMockApi = (port = PORT) => {
    // the votes given while the mock runs (in memory: a restart forgets them)
    const given = [];
    const recent = [];
    // the notes of readers on the associations (the seed ones first), when sources and notes were written, and the next id of a note
    const notes = seedNotes();
    const sourceTimes = [];
    const noteTimes = [];
    let noteId = 0;
    // the pages readers added on their own (the seed ones first): the AI reads them, what it finds counts for the positions; and when they were added
    const pages = seedPages();
    const pageTimes = [];
    let pageId = 0;
    const newsTimes = [];
    // the AI summaries written (the seed one first), and when a reader asked for one
    const aiSummaries = seedAiSummaries();
    const summaryTimes = [];
    // the candidates of the map: the three of the mock, then the ones the reader adds (in memory); 'added' orders them, 'readyAt' is when the
    // news have been read for one that was just added (until then its state is 'computing')
    const candidates = [...MOCK_SUBJECTS, MOCK_NEWS_SUBJECTS[0]].map((subject, added) => ({...subject, added, readyAt: null}));
    const startedAt = Date.now();
    let foundLater = false;
    // the candidates removed (the news do not bring them back), and when
    const removed = new Set();
    const removals = [];
    const addedAt = [];
    const searches = [];
    // the server looks in the news once a day: some time after the mock started it adds a candidate by itself (its news are then read)
    const current = () => {
        const [, later] = MOCK_NEWS_SUBJECTS;
        if (!foundLater && !removed.has(later.qid) && Date.now() >= startedAt + FOUND_AFTER_MS && candidates.length < MAP_CANDIDATES) {
            foundLater = true;
            candidates.push({...later, found: {...later.found, at: new Date().toISOString()}, added: candidates.length, readyAt: Date.now() + READ_MS});
        }
        return list();
    };
    const list = () => candidates.map(({added, readyAt, ...subject}) => ({...subject, state: readyAt && Date.now() < readyAt ? 'computing' : readyAt ? 'ready' : subject.state}));
    const body = (req, done) => {
        let text = '';
        req.on('data', chunk => { text += chunk; });
        req.on('end', () => {
            try { done(text ? JSON.parse(text) : {}); } catch { done(null); }
        });
    };
    // What the server checks of the source and the note that come with a choice. Answers {source?, note?} (the source as {url}) or {status, error}.
    // withValue: the choice is a for or against (a source goes with those only); note: the longest note this route accepts, null when it takes none
    const readExtras = (data, {withValue, noteLength}) => {
        const asked = data.source !== undefined && data.source !== null && data.source !== '';
        const extras = {};
        if (asked) {
            if (!withValue) return {status: 422, error: 'A source goes with a choice of a candidate (For or Against), not with this one.'};
            const read = readSourceInput(data.source);
            if (read.error) return read;
            const now = Date.now();
            while (sourceTimes.length > 0 && now - sourceTimes[0] > 24 * 3600e3) sourceTimes.shift();
            if (sourceTimes.length >= SOURCES_A_DAY) return {status: 429, error: 'You joined 20 sources today: try again tomorrow.'};
            extras.source = {url: read.url};
        }
        if (data.note !== undefined && data.note !== null) {
            if (typeof data.note !== 'string' || data.note.length > noteLength) return {status: 422, error: `The note is longer than ${noteLength} characters.`};
            extras.note = data.note.trim() === '' ? undefined : data.note.trim();
        }
        return extras;
    };
    const server = createServer((req, res) => {
        const url = new URL(req.url, 'http://mock');
        const levels = (url.searchParams.get('levels') ?? process.env.MOCK_LEVELS) === 'coarse' ? COARSE_LEVELS : ALL_LEVELS;
        const mock = buildMock({levels, votes: given, candidates: current(), notes, pages, reader: READER, leaderless: MOCK_LEADERLESS, aiSummaries, aiOff: AI_OFF});
        const send = (status, body) => {
            res.writeHead(status, {'Content-Type': 'application/json'});
            res.end(body === null ? '' : JSON.stringify(body));
        };
        const path = url.pathname.replace(/^\/api/, '');
        if (req.method === 'GET' && path === '/fifa/people') {
            const q = (url.searchParams.get('q') ?? '').trim();
            if (q.length < 2) return send(422, {error: 'Type at least two letters.', mock: true});
            const now = Date.now();
            while (searches.length > 0 && now - searches[0] > 60e3) searches.shift();
            if (searches.length >= SEARCHES_A_MINUTE) return send(429, {error: 'Too many searches: wait a moment.', mock: true});
            searches.push(now);
            return send(200, {people: MOCK_PEOPLE.filter(person => person.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8), mock: true});
        }
        if (req.method === 'POST' && path === '/fifa/subjects') {
            body(req, (data) => {
                if (data === null) return send(400, {error: 'The request is not JSON.', mock: true});
                const person = MOCK_PEOPLE.find(one => one.qid === data.qid);
                if (!person) return send(422, {error: 'This is not a person of Wikidata, or it is not known.', mock: true});
                const status = data.status ?? 'declared';
                if (!['declared', 'rumoured', 'withdrawn'].includes(status)) return send(422, {error: 'The status is declared, rumoured or withdrawn.', mock: true});
                const there = current().find(one => one.qid === person.qid);
                if (there) return send(200, {subject: there, already: true, mock: true});
                const now = Date.now();
                // full with none withdrawn: the reader is told what to do; the oldest withdrawn one makes room by itself otherwise
                const oldest = candidates.length >= MAP_CANDIDATES ? candidates.filter(one => one.status === 'withdrawn').sort((a, b) => a.added - b.added)[0] : null;
                if (candidates.length >= MAP_CANDIDATES && !oldest) return send(409, {error: 'Six candidates are on the map: mark one as withdrawn to make room.', mock: true});
                if (addedAt.filter(at => now - at < 24 * 3600e3).length >= ADDS_A_DAY) return send(429, {error: 'You added three candidates today: try again tomorrow.', mock: true});
                if (oldest) candidates.splice(candidates.indexOf(oldest), 1);
                const used = new Set(candidates.map(one => one.color_index));
                const colour = [1, 2, 3, 4, 5, 6].find(index => !used.has(index));
                candidates.push({qid: person.qid, name: person.name, color_index: colour, status, state: 'computing', origin: 'reader', found: null, added: Math.max(...candidates.map(one => one.added)) + 1, readyAt: now + READ_MS});
                addedAt.push(now);
                return send(201, {subject: current().find(one => one.qid === person.qid), already: false, mock: true});
            });
            return undefined;
        }
        const subjectRoute = path.match(/^\/fifa\/subjects\/([^/]+)$/);
        if (req.method === 'PATCH' && subjectRoute) {
            body(req, (data) => {
                const one = candidates.find(candidate => candidate.qid === decodeURIComponent(subjectRoute[1]));
                if (!one) return send(404, {error: 'Unknown candidate.', mock: true});
                if (!data || !STATUSES.includes(data.status)) return send(422, {error: 'The status is declared, rumoured, withdrawn or incumbent.', mock: true});
                one.status = data.status;
                res.writeHead(204);
                return res.end();
            });
            return undefined;
        }
        // any signed-in reader removes a candidate (the system can be wrong: a person the news named who is no candidate): 204; 404 unknown; 403 for the president in office
        // (origin seed, or status incumbent) unless the reader is an administrator; 429 after 10 removals an hour. What was read for it goes with it
        if (req.method === 'DELETE' && subjectRoute) {
            if (req.headers['x-mock-signed-out']) return send(401, {error: 'Forbidden, invalid or expired', mock: true});
            const qid = decodeURIComponent(subjectRoute[1]);
            const at = candidates.findIndex(candidate => candidate.qid === qid);
            if (at < 0) return send(404, {error: 'Unknown candidate.', mock: true});
            if ((candidates[at].origin === 'seed' || candidates[at].status === 'incumbent') && !ADMIN && !req.headers['x-mock-admin']) {
                return send(403, {error: 'Only an administrator can remove the president in office.', mock: true});
            }
            const now = Date.now();
            while (removals.length > 0 && now - removals[0] > 3600e3) removals.shift();
            if (removals.length >= REMOVALS_AN_HOUR) return send(429, {error: 'You removed 10 candidates in the last hour: try again later.', mock: true});
            removals.push(now);
            candidates.splice(at, 1);
            removed.add(qid);
            for (let i = given.length - 1; i >= 0; i -= 1) if (given[i].subject_qid === qid) given.splice(i, 1);
            return send(204, null);
        }
        if (req.method === 'POST' && path === '/fifa/leans') {
            body(req, (data) => {
                if (req.headers['x-mock-signed-out']) return send(401, {error: 'Forbidden, invalid or expired', mock: true});
                const now = Date.now();
                while (recent.length > 0 && now - recent[0] > 60e3) recent.shift();
                if (recent.length >= VOTES_A_MINUTE) return send(429, {error: 'Too many votes: wait a moment.', mock: true});
                const member = data && mock.map.members.find(one => one.qid === data.member);
                const known = data && (['none', 'withdraw'].includes(data.subject) || mock.map.subjects.some(one => one.qid === data.subject));
                if (!member || !known) return send(422, {error: 'Unknown association or candidate.', mock: true});
                const extras = readExtras(data, {withValue: !['none', 'withdraw'].includes(data.subject), noteLength: CHOICE_NOTE_LENGTH});
                if (extras.error) return send(extras.status, {error: extras.error, mock: true});
                recent.push(now);
                if (extras.source) sourceTimes.push(now);
                return send(200, {...answerLean({levels, candidates: current(), given, body: {member: member.qid, subject: data.subject, ...extras}, by: READER}), mock: true});
            });
            return undefined;
        }
        if (req.method === 'POST' && path === '/fifa/votes') {
            let text = '';
            req.on('data', chunk => { text += chunk; });
            req.on('end', () => {
                // 401 for a request without the session cookie is the real server's: the mock has a reader always, and the header
                // x-mock-signed-out: 1 shows the refusal
                if (req.headers['x-mock-signed-out']) return send(401, {error: 'Forbidden, invalid or expired', mock: true});
                const now = Date.now();
                while (recent.length > 0 && now - recent[0] > 60e3) recent.shift();
                if (recent.length >= VOTES_A_MINUTE) return send(429, {error: 'Too many votes: wait a moment.', mock: true});
                let body;
                try { body = JSON.parse(text); } catch { return send(400, {error: 'The vote is not JSON.', mock: true}); }
                const member = mock.map.members.find(one => one.qid === body.member);
                const subject = mock.map.subjects.find(one => one.qid === body.subject);
                if (!member || !subject || !VOTE_VALUES.includes(body.value)) return send(400, {error: 'Unknown association, candidate or value.', mock: true});
                // a source goes with a for or against only (422 with a confirmation, no position or a withdrawal)
                const extras = readExtras(body, {withValue: ['for', 'against'].includes(body.value), noteLength: Infinity});
                if (extras.error) return send(extras.status, {error: extras.error, mock: true});
                recent.push(now);
                if (extras.source) sourceTimes.push(now);
                // recorded as the server does: a confirmation keeps the position it saw; answers the decision and the confirmations that stand now
                return send(200, {...answerVote({levels, candidates: current(), given, body: {subject: subject.qid, member: member.qid, value: body.value, note: extras.note ?? body.note, source: extras.source}, by: READER}), mock: true});
            });
            return undefined;
        }
        if (req.method === 'POST' && path === '/fifa/sources') {
            body(req, (data) => {
                if (req.headers['x-mock-signed-out']) return send(401, {error: 'Forbidden, invalid or expired', mock: true});
                if (data === null) return send(400, {error: 'The request is not JSON.', mock: true});
                if (!mock.map.members.some(one => one.qid === data.member && one.level === 'association')) return send(422, {error: 'Unknown association.', mock: true});
                // the same checks as the source of a choice (422 not an address or missing, 400 private), a note up to 280 characters
                if (data.source === undefined || data.source === null || data.source === '') return send(422, {error: 'A source is the link of a page.', mock: true});
                const read = readSourceInput(data.source);
                if (read.error) return send(read.status, {error: read.error, mock: true});
                if (data.note !== undefined && data.note !== null && (typeof data.note !== 'string' || data.note.length > CHOICE_NOTE_LENGTH)) {
                    return send(422, {error: `The note is longer than ${CHOICE_NOTE_LENGTH} characters.`, mock: true});
                }
                const now = Date.now();
                while (sourceTimes.length > 0 && now - sourceTimes[0] > 24 * 3600e3) sourceTimes.shift();
                while (pageTimes.length > 0 && now - pageTimes[0] > 600e3) pageTimes.shift();
                if (sourceTimes.length >= SOURCES_A_DAY) return send(429, {error: 'You joined 20 sources today: try again tomorrow.', mock: true});
                if (pageTimes.length >= PAGES_IN_TEN_MINUTES) return send(429, {error: 'You added 10 pages in the last 10 minutes: wait a little.', mock: true});
                sourceTimes.push(now);
                pageTimes.push(now);
                const page = recordPage({url: read.url, note: typeof data.note === 'string' && data.note.trim() !== '' ? data.note.trim() : null}, {id: `mock-page-new-${++pageId}`, member_qid: data.member, by: READER, at: new Date(now).toISOString()});
                pages.push(page);
                const added = buildMock({levels, votes: given, candidates: current(), notes, pages, reader: READER}).association(data.member).sources.find(one => one.id === page.id);
                return send(201, {source: added, mock: true});
            });
            return undefined;
        }
        const sourceRoute = path.match(/^\/fifa\/sources\/([^/]+)$/);
        if (req.method === 'DELETE' && sourceRoute) {
            if (req.headers['x-mock-signed-out']) return send(401, {error: 'Forbidden, invalid or expired', mock: true});
            const at = pages.findIndex(one => one.id === decodeURIComponent(sourceRoute[1]));
            if (at < 0) return send(404, {error: 'Unknown source.', mock: true});
            // the reader who added it or an administrator; the signals the page gave go with it, so the positions can change back
            if (pages[at].by !== READER && !ADMIN && !req.headers['x-mock-admin']) return send(403, {error: 'Only the reader who added a source or an administrator can delete it.', mock: true});
            pages.splice(at, 1);
            return send(204, null);
        }
        if (req.method === 'POST' && path === '/fifa/notes') {
            body(req, (data) => {
                if (req.headers['x-mock-signed-out']) return send(401, {error: 'Forbidden, invalid or expired', mock: true});
                if (data === null) return send(400, {error: 'The request is not JSON.', mock: true});
                if (!mock.map.members.some(one => one.qid === data.member)) return send(422, {error: 'Unknown association.', mock: true});
                const text = typeof data.text === 'string' ? data.text.trim() : '';
                if (text.length < 1 || text.length > NOTE_LENGTH) return send(422, {error: 'A note has 1 to 500 characters.', mock: true});
                const now = Date.now();
                while (noteTimes.length > 0 && now - noteTimes[0] > 3600e3) noteTimes.shift();
                if (noteTimes.length >= NOTES_AN_HOUR) return send(429, {error: 'You wrote 10 notes in the last hour: try again later.', mock: true});
                noteTimes.push(now);
                const note = {id: `mock-note-new-${++noteId}`, member_qid: data.member, by: READER, at: new Date(now).toISOString(), text};
                notes.push(note);
                return send(201, {note: {id: note.id, by: note.by, at: note.at, text: note.text, mine: true}, mock: true});
            });
            return undefined;
        }
        const noteRoute = path.match(/^\/fifa\/notes\/([^/]+)$/);
        if (req.method === 'DELETE' && noteRoute) {
            if (req.headers['x-mock-signed-out']) return send(401, {error: 'Forbidden, invalid or expired', mock: true});
            const at = notes.findIndex(one => one.id === decodeURIComponent(noteRoute[1]));
            if (at < 0) return send(404, {error: 'Unknown note.', mock: true});
            // the author or an administrator (the header x-mock-admin: 1, or MOCK_ADMIN=1, is an administrator)
            if (notes[at].by !== READER && !ADMIN && !req.headers['x-mock-admin']) return send(403, {error: 'Only the author of a note or an administrator can delete it.', mock: true});
            notes.splice(at, 1);
            return send(204, null);
        }
        if (path === '/session') return send(200, {id: 1, username: READER, email: 'reader@example.test', role: 'User', admin: ADMIN});
        if (path === '/profile/profiles') return send(200, {profiles: [{id: 1, name: 'Profile'}]});
        if (path === '/profile') return send(200, {profile: {id: 1, name: 'Profile', text: 'Mock', interests: [], watchTerms: []}});
        if (path === '/affairs/unread') return send(200, {unread: 0});
        if (path === '/fifa/map') return send(200, mock.map);
        if (path === '/fifa/subjects') return send(200, mock.subjects);
        if (path === '/fifa/presidents') return send(200, mock.presidents);
        if (path === '/fifa/confederations') return send(200, mock.confederations);
        // the news that name the president: scope football (default) or all, limit 1 to 100 (50 by default), offset; 404 unknown association, 429 after 30 requests a minute
        const leaderNews = path.match(/^\/fifa\/associations\/([^/]+)\/leader\/news$/);
        if (req.method === 'GET' && leaderNews) {
            const now = Date.now();
            while (newsTimes.length > 0 && now - newsTimes[0] > 60e3) newsTimes.shift();
            if (newsTimes.length >= NEWS_A_MINUTE) return send(429, {error: 'Too many requests: wait a moment.', mock: true});
            newsTimes.push(now);
            const scope = url.searchParams.get('scope') ?? 'football';
            const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 50;
            const offset = url.searchParams.has('offset') ? Number(url.searchParams.get('offset')) : 0;
            if (!['football', 'all'].includes(scope)) return send(422, {error: 'The scope is football or all.', mock: true});
            if (!Number.isInteger(limit) || limit < 1 || limit > 100) return send(422, {error: 'The limit is a number from 1 to 100.', mock: true});
            if (!Number.isInteger(offset) || offset < 0) return send(422, {error: 'The offset is a number from 0.', mock: true});
            const found = mock.leaderNews(decodeURIComponent(leaderNews[1]), {scope, limit, offset});
            return found ? send(200, found) : send(404, {error: 'Unknown association.', mock: true});
        }
        // A reader asks for the AI summary of a sheet: 200 {ai_summary, generated} after SUMMARY_MS; 404 unknown, 409 nothing to summarise, 403 switched off, 502 the AI did not answer,
        // 429 after 5 an hour, 401 signed out
        const summaryRoute = path.match(/^\/fifa\/associations\/([^/]+)\/summary$/);
        if (req.method === 'POST' && summaryRoute) {
            if (req.headers['x-mock-signed-out']) return send(401, {error: 'Forbidden, invalid or expired', mock: true});
            const qid = decodeURIComponent(summaryRoute[1]);
            const sheet = mock.association(qid);
            if (!sheet) return send(404, {error: 'Unknown association.', mock: true});
            if (AI_OFF) return send(403, {error: 'The AI summary is switched off.', mock: true});
            if (sheet.summary.candidates.length === 0) return send(409, {error: 'There is nothing to summarise on this sheet yet.', mock: true});
            const now = Date.now();
            while (summaryTimes.length > 0 && now - summaryTimes[0] > 3600e3) summaryTimes.shift();
            if (summaryTimes.length >= SUMMARIES_AN_HOUR) return send(429, {error: 'You asked for 5 summaries in the last hour: try again later.', mock: true});
            summaryTimes.push(now);
            setTimeout(() => {
                if (req.headers['x-mock-ai-fail']) return send(502, {error: 'The AI did not answer: try again in a moment.', mock: true});
                aiSummaries[qid] = writeAiSummary(sheet.summary, {by: READER});
                const written = aiSummaries[qid];
                return send(200, {
                    ai_summary: {claims: written.claims, facts: written.facts, model: written.model, generated_at: written.generated_at, by: written.by, current: true},
                    generated: true, mock: true,
                });
            }, SUMMARY_MS);
            return undefined;
        }
        const association = path.match(/^\/fifa\/associations\/([^/]+)$/);
        if (association) {
            const found = mock.association(decodeURIComponent(association[1]));
            return found ? send(200, found) : send(404, {error: 'Unknown association.', mock: true});
        }
        return send(404, {error: 'Not in the mock.', mock: true});
    });
    return new Promise(done => server.listen(port, '127.0.0.1', () => done(server)));
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    await startMockApi();
    console.log(`mock API of the FIFA page on ${PORT}`);
}
