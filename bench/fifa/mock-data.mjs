//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: mock-data.mjs
//  Description: MADE-UP answers of the API of the page "The FIFA presidency" (GET /api/fifa/...), to build and test the page before the
//               server answers. The members are the real ones (name, FIFA code, ISO code, confederation: facts); the CANDIDATES, THE
//               PERSONS, THE SENTENCES AND THE POSITIONS ARE INVENTED ("Mock candidate A", "[Mock] ..."): nothing here says what a real
//               association or a real person thinks. It lives in bench/ for that reason, never in src/, and every answer carries
//               mock: true (the page prints a banner when it sees it). The contract it follows is in bench/fifa/README.md
//

import REFERENTIAL from './mock-members.json' with {type: 'json'};

// The candidates of the map. origin: 'seed' (the president in office), 'reader' (a reader added the person) or 'news' (the server found the person in the news);
// found: null, or for origin 'news' what it found {status: 'declared' | 'rumoured', articles, media, quote, at}; state: 'computing' while the news of the last 30 days
// are being read for a new candidate (its positions fill in as they are read)
export const MOCK_SUBJECTS = [
    {qid: 'QMOCK1', name: 'Mock candidate A', color_index: 1, status: 'incumbent', state: 'ready', origin: 'seed', found: null},
    {qid: 'QMOCK2', name: 'Mock candidate B', color_index: 2, status: 'declared', state: 'ready', origin: 'reader', found: null},
    {qid: 'QMOCK3', name: 'Mock candidate C', color_index: 3, status: 'rumoured', state: 'computing', origin: 'reader', found: null},
];
const [A, B, C] = MOCK_SUBJECTS.map(subject => subject.qid);
const D = 'QMOCK4';

// INVENTED persons a reader can find to add as a candidate (GET /fifa/people): no real name
export const MOCK_PEOPLE = [
    {qid: 'QMOCKPERSON1', name: 'Mock Alvarez', description: 'invented person, football administrator'},
    {qid: 'QMOCKPERSON2', name: 'Mock Alvarado', description: 'invented person, former player'},
    {qid: 'QMOCKPERSON3', name: 'Mock Bergstrom', description: 'invented person, coach'},
    {qid: 'QMOCKPERSON4', name: 'Mock Chen', description: 'invented person, federation president'},
    {qid: 'QMOCKPERSON5', name: 'Mock Dubois', description: 'invented person, politician'},
    {qid: 'QMOCKPERSON6', name: 'Mock Eriksen', description: 'invented person, businessperson'},
    {qid: 'QMOCKPERSON7', name: 'Mock Fofana', description: 'invented person, former player'},
    {qid: 'QMOCKPERSON8', name: 'Mock Haddad', description: 'invented person, football administrator'},
    {qid: 'QMOCKPERSON9', name: 'Mock Ibarra', description: 'invented person, referee'},
];

// The words of a position, as the page says them (the summary of the sheet is written with them)
const POSITION_WORDS = {
    soutien_declare: 'Declared support', soutien_probable: 'Probable support', inconnue: 'No known position', non_soutien_probable: 'Probable opposition', non_soutien_declare: 'Declared opposition',
    soutien: 'Support', non_soutien: 'Opposition',
};
// What a summary holds, as one text: when the sheet changes in a way the summary shows, the text changes (an AI summary written before is no longer current)
export const summarySignature = (summary) => JSON.stringify(summary.candidates.map(one => [
    one.subject_qid, one.position, one.signals_count, one.uncertain_count, one.human?.at ?? null, one.sides.map(side => [side.stance, side.declared, side.probable]),
]));
// The summary an AI would write from the facts of the summary built by the code (invented: [Mock AI]): claims, each with the ids of the facts that hold it, and the facts word for word
export const writeAiSummary = (summary, {by, now = Date.now()} = {}) => {
    const facts = [];
    const claims = [];
    const fact = (kind, text, extra = {}) => { const id = `f${facts.length + 1}`; facts.push({id, kind, text, ...extra}); return id; };
    for (const one of summary.candidates) {
        const ids = [fact('position', `${POSITION_WORDS[one.position] ?? one.position} on ${one.name}${one.since ? ` since ${one.since.slice(0, 10)}` : ''}`)];
        for (const side of one.sides) for (const key of side.key) ids.push(fact('sentence', key.sentence, {url: key.url, medium: key.medium, date: key.published_at}));
        const both = one.sides.length > 1;
        claims.push({
            text: `[Mock AI] On ${one.name}: ${POSITION_WORDS[one.position]?.toLowerCase() ?? one.position}${both ? '; the news point both ways' : ''}.`,
            facts: ids,
        });
    }
    return {claims, facts, model: 'mock-model', generated_at: new Date(now).toISOString(), by, signature: summarySignature(summary)};
};
// The AI summaries that exist at the start of the mock API: Spain has one written two days ago by a reader, that is no longer current (its signature is an older one)
export const seedAiSummaries = (now = Date.now()) => {
    const esp = REFERENTIAL.members.find(member => member.fifa === 'ESP');
    return {
        [esp.qid]: {
            claims: [
                {text: '[Mock AI] Spain declared support for Mock candidate A, and its position on Mock candidate B is only probable.', facts: ['f1', 'f2']},
                {text: '[Mock AI] The news do not all point the same way on Mock candidate A.', facts: ['f3']},
            ],
            facts: [
                {id: 'f1', kind: 'position', text: 'Declared support on Mock candidate A since 2026-10-21'},
                {id: 'f2', kind: 'position', text: 'Probable support on Mock candidate B since 2026-11-08'},
                {id: 'f3', kind: 'sentence', text: '[Mock sentence in en] The association will not back Mock candidate A yet.', url: 'https://example.test/mock/ESP/c', medium: 'Mock Gazette', date: new Date(now - 60 * DAY).toISOString()},
            ],
            model: 'mock-model', generated_at: new Date(now - 2 * DAY).toISOString(), by: 'Mock reader 2', signature: 'an older sheet',
        },
    };
};

// the associations the mock API gives no president (the sheet says so, the list of the presidents has 210 of them)
export const MOCK_LEADERLESS = ['GIB'];

export const ALL_LEVELS = ['soutien_declare', 'soutien_probable', 'inconnue', 'non_soutien_probable', 'non_soutien_declare'];
export const COARSE_LEVELS = ['soutien', 'inconnue'];

const DAY = 24 * 3600e3;

// The candidates the server finds in the news once a day, invented. D was found a few days ago and is read (an association nominated it); E was found just now: its news are
// being read, it has no position yet. The list of candidates is never fixed: the mock API adds E some time after it starts (see MOCK_FOUND_AFTER_MS)
export const MOCK_NEWS_SUBJECTS = [
    {
        qid: D, name: 'Mock candidate D', color_index: 4, status: 'declared', state: 'ready', origin: 'news',
        found: {status: 'declared', articles: 7, media: 4, quote: '[Mock] The federation will nominate Mock Tashima for the presidency of FIFA.', at: new Date(Date.now() - 4 * DAY).toISOString()},
    },
    {
        qid: 'QMOCK5', name: 'Mock candidate E', color_index: 5, status: 'rumoured', state: 'computing', origin: 'news',
        found: {status: 'rumoured', articles: 2, media: 2, quote: '[Mock] Several sources name Mock Ibanez as a possible candidate.', at: new Date(Date.now() - 3600e3).toISOString()},
    },
];

// [fifa code, subject, position, days since, extras]: the invented positions (about 16 associations, one with two candidates)
const POSITIONS = [
    ['BRA', A, 'soutien_declare', 20, {uncertain: 1}],
    ['NGA', A, 'soutien_declare', 9],
    ['EGY', A, 'soutien_probable', 3, {previous: 'soutien_declare', changed: true, kind: 'weakened'}],
    ['QAT', A, 'soutien_declare', 41],
    ['IND', A, 'soutien_declare', 14],
    ['KEN', A, 'soutien_probable', 6],
    ['MAR', A, 'soutien_probable', 12],
    ['UZB', A, 'soutien_probable', 118, {stale: true}],
    ['PER', A, 'soutien_probable', 26],
    ['NOR', A, 'non_soutien_probable', 4, {previous: 'soutien_probable', changed: true, kind: 'reversal'}],
    ['DEN', A, 'non_soutien_declare', 17],
    ['ESP', A, 'soutien_declare', 22, {counter: 1}],
    ['ESP', B, 'soutien_probable', 5],
    ['JPN', B, 'soutien_declare', 8],
    ['FRA', B, 'soutien_probable', 11],
    ['SCO', B, 'soutien_declare', 15],
    ['ENG', C, 'soutien_probable', 2],
    // the candidate found in the news (only on a map that has it)
    ['CHN', D, 'soutien_declare', 6],
    ['THA', D, 'soutien_probable', 3],
];
// associations with signals that name the election and the association but no established position: [fifa code, subject, count, reasons]
const UNCERTAIN = [
    ['TUR', A, 2, ['speaker_not_binding', 'rumour']],
    ['GRE', A, 1, ['request_not_position']],
    ['CHI', A, 1, ['ambiguous']],
    ['GHA', A, 3, ['rumour', 'rumour', 'speaker_not_binding']],
    ['AUS', B, 1, ['readings_disagree']],
    ['NZL', C, 1, ['rival_from_association']],
    ['KOR', A, 1, ['speaker_not_binding']],
];
// The votes of readers, invented: [fifa code, subject, value, by, days ago, newer evidence, position seen (a confirmation only)]. The last vote
// of any reader decides for everyone; a reader who withdrew is out. A confirmation ("Confirm this position") is no decision: it records that a
// reader checked the position of the news and which one they saw (so one older than the news that changed it is told apart, "outdated"). It is a
// validation by hand, the heaviest word there is: a position of the news that a reader confirmed (and that no vote overrides) is sent PROMOTED to the
// solid declared level of its side, the news' own reading kept as ai_position, stale false. MEX: Reader 1 decides (Reader 2 withdrew). FRA: against, over the reading of the news. QAT: "no position",
// over a declared support. KEN: for, and the news have said more since.
// The last element of a row is the SOURCE a reader joined to their choice (the link of a page that says it), {url}: what the AI made of the page comes from a word of
// the address (see SOURCE_READ_MS): MEX the page says it, KEN the page says the opposite, FRA the AI could not confirm it
const SEED_VOTES = [
    ['MEX', A, 'for', 'Mock reader 2', 8, false],
    ['MEX', A, 'withdraw', 'Mock reader 2', 6, false],
    ['MEX', A, 'for', 'Mock reader 1', 3, false, undefined, {url: 'https://www.mockdaily.example/source-says/mex-congress'}],
    ['FRA', B, 'against', 'Mock reader 2', 2, false, undefined, {url: 'https://mockgazette.example/source-unclear/fra-interview'}],
    ['QAT', A, 'unknown', 'Mock reader 1', 5, false],
    ['KEN', A, 'against', 'Mock reader 2', 12, false],
    ['KEN', A, 'for', 'Mock reader 3', 9, true, undefined, {url: 'https://mocksport.example/source-contradicts/ken-statement'}],
    // NGA: two readers confirmed the declared support (it stays declared). MAR: a reader confirmed a PROBABLE support: it is sent declared (solid).
    // EGY: a reader confirmed "declared support" before it weakened to probable (outdated: the news' own level is drawn). GER: a reader confirmed
    // "no position" (the pair has no other row, nothing is promoted)
    ['MAR', A, 'confirm', 'Mock reader 3', 4, false, 'soutien_probable'],
    ['NGA', A, 'confirm', 'Mock reader 1', 2, false, 'soutien_declare'],
    ['NGA', A, 'confirm', 'Mock reader 3', 1, false, 'soutien_declare'],
    ['EGY', A, 'confirm', 'Mock reader 2', 20, false, 'soutien_declare'],
    ['GER', B, 'confirm', 'Mock reader 1', 3, false, 'inconnue'],
];
export const VOTE_VALUES = ['for', 'against', 'unknown', 'withdraw', 'confirm'];

// The notes of readers on an association (any reader sees them), invented: [fifa code, by, days ago, text]. The author or an administrator deletes one
const SEED_NOTES = [
    ['BRA', 'Mock reader 2', 6, '[Mock] The federation said it will decide after its own congress.'],
    ['BRA', 'Mock reader 1', 2, '[Mock] A second note, written by another reader, to see the list.'],
    ['NGA', 'Mock reader 3', 9, '[Mock] Check the statement of the spokesperson, not the one of the vice-president.'],
];
// the notes of the mock as the server keeps them: [{id, member_qid, by, at, text}], newest first
export const seedNotes = (now = Date.now()) => {
    const byFifa = new Map(REFERENTIAL.members.map(member => [member.fifa, member]));
    return SEED_NOTES.map(([fifa, by, days, text], index) => ({id: `mock-note-${index + 1}`, member_qid: byFifa.get(fifa).qid, by, at: new Date(now - days * DAY).toISOString(), text}))
        .sort((a, b) => b.at.localeCompare(a.at));
};

// The SOURCE a reader joins to a choice (the link of a page that says it). The server reads the page with the AI in the background (10 to 60 s) and never
// changes a colour because of it. The mock decides what the AI "found" from a word of the address: "contradicts" (the page says the other thing), "unclear" (the AI
// could not confirm it), "unreadable" (the page could not be read), anything else "says"; until SOURCE_READ_MS after the choice, the check is 'pending'
export const SOURCE_READ_MS = Number(globalThis.process?.env?.MOCK_SOURCE_READ_MS ?? 15000);
export const SOURCE_CHECKS = ['pending', 'says', 'contradicts', 'unclear', 'unreadable'];
const outcomeOfUrl = (url) => ['contradicts', 'unclear', 'unreadable'].find(word => url.toLowerCase().includes(word)) ?? 'says';
export const mediumOf = (url) => new URL(url).hostname.replace(/^www\./, '');
const PRIVATE_HOST = /^(localhost|.*\.(local|internal|localdomain)|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?)$/i;
// The `source` of a request: {url} or a plain string. Answers {url} or {status, error} as the server does: 422 not an address / a password in the address / more
// than 500 characters, 400 a private address
export const readSourceInput = (input) => {
    const text = typeof input === 'string' ? input : typeof input?.url === 'string' ? input.url : null;
    if (text === null) return {status: 422, error: 'The source is the link of a page.'};
    const url = text.trim();
    if (url.length > 500) return {status: 422, error: 'The link is longer than 500 characters.'};
    let parsed;
    try { parsed = new URL(url); } catch { parsed = null; }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) return {status: 422, error: 'This is not a web address: it starts with http:// or https://.'};
    if (parsed.username || parsed.password) return {status: 422, error: 'The link holds a password: give the address of the page alone.'};
    if (PRIVATE_HOST.test(parsed.hostname)) return {status: 400, error: 'This address is private: give the link of a public page.'};
    return {url};
};
// the source as the server records it with the row of a choice: what the AI will make of it, and when it will have read it
export const recordSource = ({url}, at) => ({url, medium: mediumOf(url), outcome: outcomeOfUrl(url), readyAt: Date.parse(at) + SOURCE_READ_MS});

// A PAGE a reader adds on its own (POST /fifa/sources: the link of a page about an association, no candidate chosen). The AI reads it like a news, for EVERY candidate
// of the map, in the background (10 to 60 s); the signals it gives (established, or Uncertain when the page has no usable date) are kept like the signals of the news
// and COUNT for the positions: a page can give a position where the news gave none, and deleting the page takes its signals away. The mock decides what the AI makes of
// a page from words of the address: "unclear" (no clear position: no signal), "unreadable" (the page could not be read), "nodate" (it says something, but no usable
// date: only Uncertain signals, reason 'other'), anything else "says". "for-b" / "against-a" (the letter of a candidate) says which candidate it speaks of and what,
// "both" a support of the first candidate and an opposition to the second; without a word, the candidate is drawn from the address
export const PAGE_OUTCOMES = ['says', 'nodate', 'unclear', 'unreadable'];
const pageOutcomeOfUrl = (url) => ['nodate', 'unclear', 'unreadable'].find(word => url.toLowerCase().includes(word)) ?? 'says';
const LETTERS = 'abcdef';
// the readings of a page: [{subject_qid, stance: 'support' | 'oppose', level, found}], one for each candidate the page speaks of
export const pageReadingsOf = (url, candidates) => {
    const text = url.toLowerCase();
    const wanted = [];
    for (const [, word, letter] of text.matchAll(/(for|against)-([a-f])(?![a-z])/g)) {
        const subject = candidates[LETTERS.indexOf(letter)];
        if (subject) wanted.push({subject, stance: word === 'for' ? 'support' : 'oppose'});
    }
    if (wanted.length === 0 && /(^|[^a-z])both([^a-z]|$)/.test(text) && candidates.length >= 2) wanted.push({subject: candidates[0], stance: 'support'}, {subject: candidates[1], stance: 'oppose'});
    if (wanted.length === 0 && candidates.length > 0) wanted.push({subject: candidates[Math.floor(hash(text) * candidates.length)], stance: 'support'});
    return wanted.map(({subject, stance}) => ({
        subject_qid: subject.qid, stance, level: 'declared',
        found: `[Mock sentence in en] The page says the association ${stance === 'support' ? 'will back' : 'will not back'} ${subject.name}.`,
    }));
};
// the page as the server keeps it: who added it, when, and when the AI will have read it
export const recordPage = ({url, note}, {id, member_qid, by, at}) => ({id, member_qid, by, at, note: note ?? null, url, medium: mediumOf(url), outcome: pageOutcomeOfUrl(url), readyAt: Date.parse(at) + SOURCE_READ_MS});

// the pages of the mock, invented: [fifa code, by, days ago, url, note]. ARG: read, the page says Mock candidate B (it gives Argentina a declared support for B); BOL: the AI
// found no clear position; URU: not read yet (it stays pending); PAR: a page with no usable date (its sentence is Uncertain)
const SEED_PAGES = [
    ['ARG', 'Mock reader 2', 3, 'https://www.mockdaily.example/pages/for-b/arg-interview', '[Mock] Interview of the president of the federation.'],
    ['BOL', 'Mock reader 1', 1, 'https://mocksport.example/pages/unclear/bol-statement', null],
    ['URU', 'Mock reader 3', 0, 'https://mockgazette.example/pages/uru-press-release', '[Mock] Press release, not read yet.'],
    ['PAR', 'Mock reader 2', 2, 'https://mockpost.example/pages/nodate/for-a/par-article', null],
];
// the seed pages (the mock API starts with them; buildMock() has none unless they are given, so the tests keep their counts)
export const seedPages = (now = Date.now()) => {
    const byFifa = new Map(REFERENTIAL.members.map(member => [member.fifa, member]));
    return SEED_PAGES.map(([fifa, by, days, url, note], index) => ({
        ...recordPage({url, note}, {id: `mock-page-${index + 1}`, member_qid: byFifa.get(fifa).qid, by, at: new Date(now - days * DAY).toISOString()}),
        // the third was added a moment ago and the AI never gets to it
        ...(fifa === 'URU' ? {readyAt: Infinity} : {}),
    }));
};
// a probable position the levels do not colour (they hold no probable level, nor a merged one)
const notColoured = (found, levels) => Boolean(found) && found[2].endsWith('_probable') && !levels.some(level => level.endsWith('_probable') || level === 'soutien' || level === 'non_soutien');
// the declared level of the side of a position of the news (what a confirmation makes of it); the merged levels are declared already
const declaredOf = (position) => position === 'soutien' || position === 'non_soutien' ? position : sideOf(position) === 'yes' ? 'soutien_declare' : sideOf(position) === 'no' ? 'non_soutien_declare' : 'inconnue';
// the date of a row written now: never the same twice, so the rows of a choice keep their order
let lastStamp = 0;
const stamp = () => {
    lastStamp = Math.max(Date.now(), lastStamp + 1);
    return new Date(lastStamp).toISOString();
};
// which candidate an association leans toward, as the server says it: the one it is shown supporting (it has one vote); two at once: conflicting
const leanFor = (positions) => {
    const supported = Object.entries(positions).filter(([, entry]) => sideOf(entry.position) === 'yes').map(([qid]) => qid);
    if (supported.length === 0) return null;
    if (supported.length > 1) return {subject_qid: null, source: 'news', conflicting: supported};
    const entry = positions[supported[0]];
    return {subject_qid: supported[0], source: entry.human || ((entry.confirmed?.count ?? 0) > 0 && entry.ai_position) ? 'reader' : 'news', conflicting: []};
};
const VOTED_POSITION = {for: 'soutien_declare', against: 'non_soutien_declare', unknown: 'inconnue'};

const UNCERTAIN_LABELS = {
    speaker_not_binding: 'the speaker does not bind the association',
    rumour: 'a rumour, not confirmed',
    request_not_position: 'a request, not a position',
    rival_from_association: 'a rival who comes from the association',
    ambiguous: 'ambiguous wording',
    readings_disagree: 'the readings of the sentence disagree',
};
const MEDIA = ['Mock Daily', 'Mock Times', 'Mock Sport', 'Mock Gazette', 'Mock Herald', 'Mock Post'];
const LANGS = ['en', 'es', 'fr', 'ar', 'pt'];

// a number from 0 to 1 that always comes out the same for the same text
const hash = (text) => {
    let h = 2166136261;
    for (const char of text) h = Math.imul(h ^ char.codePointAt(0), 16777619);
    return ((h >>> 0) % 10000) / 10000;
};

const sideOf = (position) => position.startsWith('non_') ? 'no' : position === 'inconnue' ? 'unknown' : 'yes';

// a position the server does not stand behind is not sent: it merges into the coarse level or goes back to unknown
const inLevels = (position, levels) => {
    if (levels.includes(position)) return position;
    if (levels.includes('soutien') && sideOf(position) === 'yes') return 'soutien';
    if (levels.includes('non_soutien') && sideOf(position) === 'no') return 'non_soutien';
    return 'inconnue';
};

// votes: the ones given while the mock runs, [{member_qid, subject_qid, value, by, at, note, source}], on top of the seed ones
// candidates: the subjects of the map, [{qid, name, color_index, status, state}] (the ones a reader added have no position: the news are being read)
// notes: the notes of readers, [{id, member_qid, by, at, text}] (the seed ones by default); reader: the name of the reader of the session (their notes are "mine")
// pages: the pages readers added on their own, as recordPage keeps them (none by default; seedPages() for the ones of the mock API)
// leaderless: the FIFA codes of the associations that have no president listed (none by default: the tests count 211 of them; the mock API has MOCK_LEADERLESS)
// aiSummaries: the AI summaries written, by association: {[qid]: {claims, facts, model, generated_at, by, signature}} (none by default); aiOff: the AI summary is switched off
export const buildMock = ({levels = ALL_LEVELS, now = Date.now(), votes = [], candidates = MOCK_SUBJECTS, notes = seedNotes(now), reader = '', pages = [], leaderless = [], aiSummaries = {}, aiOff = false} = {}) => {
    const iso = (days) => new Date(now - days * DAY).toISOString();
    const byFifa = new Map(REFERENTIAL.members.map(member => [member.fifa, member]));
    for (const [fifa] of [...POSITIONS, ...UNCERTAIN, ...SEED_VOTES]) if (!byFifa.has(fifa)) throw new Error(`mock: no member ${fifa}`);

    // every vote, newest first: the seed ones and the ones of this run
    const events = [
        ...SEED_VOTES.map(([fifa, subject, value, by, days, newer, seen, source]) => ({
            member_qid: byFifa.get(fifa).qid, subject_qid: subject, value, by, at: iso(days), note: null, newer, ...(seen ? {seen} : {}),
            // a seed source was read long ago
            ...(source ? {source: recordSource(source, iso(days))} : {}),
        })),
        ...votes,
    // the votes of a candidate that is not on the map any more went with it (and the sources joined to them)
    ].filter(event => candidates.some(subject => subject.qid === event.subject_qid)).sort((a, b) => b.at.localeCompare(a.at));
    // The source of a row as the server sends it: {url, medium, check, found, checked_at}, null without one. 'pending' while the AI reads the page; then what it
    // made of it: 'says' (the page says what the reader chose; found = the sentence), 'contradicts' (it says the OTHER thing; found), 'unclear' (the AI could not
    // confirm it: not wrong), 'unreadable' (the page could not be read)
    const sourceOf = (event) => {
        const one = event.source;
        if (!one) return null;
        if (now < one.readyAt) return {url: one.url, medium: one.medium, check: 'pending', found: null, checked_at: null};
        const backs = (event.value === 'for') === (one.outcome === 'says');
        const name = candidates.find(subject => subject.qid === event.subject_qid)?.name ?? event.subject_qid;
        const found = one.outcome === 'says' || one.outcome === 'contradicts' ? `[Mock sentence in en] The association ${backs ? 'will back' : 'will not back'} ${name}.` : null;
        return {url: one.url, medium: one.medium, check: one.outcome, found, checked_at: new Date(one.readyAt).toISOString()};
    };
    // The pages the AI has read (the newest first): what it read in them, for every candidate, counts like a news. rows: [{page, member_qid, subject, stance, level, found,
    // certain}]; certain: the page has a usable date (the signal is established), else Uncertain
    const pageRows = [...pages].sort((a, b) => b.at.localeCompare(a.at)).filter(page => now >= page.readyAt && ['says', 'nodate'].includes(page.outcome))
        .flatMap(page => pageReadingsOf(page.url, candidates).map(reading => ({page, member_qid: page.member_qid, subject: reading.subject_qid, stance: reading.stance, level: reading.level, found: reading.found, certain: page.outcome === 'says'})));
    const pageRowsOf = (memberQid, subjectQid) => pageRows.filter(row => row.member_qid === memberQid && row.subject === subjectQid);
    // A page as the server sends it in the sources of the sheet: {id, kind: 'page', subject_qid, value, by, at, note, url, medium, check, found, checked_at, readings, mine}.
    // check: 'pending' (the AI is reading), 'says' (it found a position: readings), 'unclear' (no clear position), 'unreadable'; subject_qid / value / found: the first reading
    const pageSourceOf = (page) => {
        const base = {id: page.id, kind: 'page', by: page.by, at: page.at, note: page.note, url: page.url, medium: page.medium, mine: page.by === reader};
        if (now < page.readyAt) return {...base, subject_qid: null, value: null, check: 'pending', found: '', checked_at: null, readings: []};
        const checked_at = new Date(page.readyAt).toISOString();
        const readings = ['says', 'nodate'].includes(page.outcome) ? pageReadingsOf(page.url, candidates) : [];
        if (readings.length === 0) return {...base, subject_qid: null, value: null, check: page.outcome === 'unreadable' ? 'unreadable' : 'unclear', found: '', checked_at, readings: []};
        return {...base, subject_qid: readings[0].subject_qid, value: readings[0].stance === 'support' ? 'for' : 'against', check: 'says', found: readings[0].found, checked_at, readings};
    };
    // the vote that decides: the last one of the readers who have not withdrawn (a reader's last word is the one that counts); a confirmation is no
    // decision, so it is passed over: a confirm after a "for" keeps the "for"
    const decisiveOf = (memberQid, subjectQid) => {
        const last = new Map();
        for (const event of events) {
            if (event.member_qid === memberQid && event.subject_qid === subjectQid && event.value !== 'confirm' && !last.has(event.by)) last.set(event.by, event);
        }
        const standing = [...last.values()].filter(event => event.value !== 'withdraw');
        const top = standing[0];
        return top ? {value: top.value, by: top.by, at: top.at, newer_evidence: Boolean(top.newer), source: sourceOf(top)} : null;
    };
    // The sources of the choices that STAND on an association, newest first: the last decision of each reader on each candidate, when it is for or against and
    // carries a source (a withdrawal, a "no position" or a later choice of the same reader takes it out)
    const sourcesOf = (memberQid) => {
        const done = new Set();
        const rows = [];
        for (const event of events) {
            if (event.member_qid !== memberQid || event.value === 'confirm') continue;
            const key = `${event.subject_qid}|${event.by}`;
            if (done.has(key)) continue;
            done.add(key);
            if (!['for', 'against'].includes(event.value) || !event.source) continue;
            rows.push({subject_qid: event.subject_qid, value: event.value, by: event.by, at: event.at, note: event.note, ...sourceOf(event)});
        }
        return rows;
    };
    // The confirmations that hold for the position of the news, and the ones of a position that changed since (outdated): {count, by, at, outdated} or null.
    // A reader's confirmation counts from their last withdrawal on (a withdrawal takes back both the decision and the confirmation); by: the readers
    // whose confirmation holds, newest first, then the outdated ones
    const confirmedOf = (memberQid, subjectQid, news) => {
        const holding = [];
        const stale = [];
        const done = new Set();
        for (const event of events) {
            if (event.member_qid !== memberQid || event.subject_qid !== subjectQid || done.has(event.by)) continue;
            if (event.value === 'withdraw') { done.add(event.by); continue; }
            if (event.value !== 'confirm') continue;
            done.add(event.by);
            (event.seen === news ? holding : stale).push(event);
        }
        if (holding.length + stale.length === 0) return null;
        return {count: holding.length, by: [...holding, ...stale].map(event => event.by), at: holding[0]?.at ?? null, outdated: stale.length};
    };
    // the reading of the news of an entry: under a vote, ai_position
    const ai = (one) => one.ai_position ?? one.position;

    // every association has a president (the page of FIFA names one, Wikidata the others) but the ones asked to have none; Wikidata names the same person for about half of them
    const leaderOf = (member, index) => leaderless.includes(member.fifa) ? null : ({
        name: `Mock president ${member.fifa}`, role: 'President', person_qid: index % 2 === 0 ? `QMOCKP${member.fifa}` : null, since: index % 11 === 0 ? null : iso(400 + (index % 9) * 150),
    });

    // the articles and the media that name an association with a candidate over 30 days: most of them none
    const coverageOf = (fifa, subject, boost) => {
        const draw = hash(`${fifa}/${subject}`);
        const factor = subject === A ? 1 : subject === B ? 0.45 : 0.15;
        // three associations in ten are named at all
        const named = hash(`n/${fifa}`) < 0.3 || boost > 0;
        const articles = named ? Math.floor(draw ** 2 * 70 * factor) + boost : 0;
        return {articles_30d: articles, media_30d: articles === 0 ? 0 : Math.max(1, Math.ceil(articles * (0.3 + hash(`m/${fifa}`) * 0.3)))};
    };

    const all = REFERENTIAL.members.map((member, index) => {
        const positions = {};
        const own = POSITIONS.filter(([fifa]) => fifa === member.fifa);
        const doubt = UNCERTAIN.filter(([fifa]) => fifa === member.fifa);
        for (const subject of candidates) {
            const found = own.find(([, one]) => one === subject.qid);
            const unsure = doubt.find(([, one]) => one === subject.qid);
            const extras = found?.[4] ?? {};
            // the server set to colour declared positions only: a probable one is not coloured, it is kept as Uncertain (reason colour_setting)
            const uncertain_count = (unsure?.[2] ?? 0) + (extras.uncertain ?? 0) + (notColoured(found, levels) ? 1 : 0);
            const coverage = coverageOf(member.fifa, subject.qid, found ? 6 : unsure ? 3 : 0);
            const human = decisiveOf(member.qid, subject.qid);
            // what the pages a reader added say about this candidate counts like the news: a position when the news gave none, a signal more otherwise, an Uncertain
            // signal when the page has no usable date
            const fromPages = pageRowsOf(member.qid, subject.qid);
            const pageSure = fromPages.filter(row => row.certain);
            const pageNews = !found && pageSure.length > 0 ? pageSure[0] : null;
            const position = found ? inLevels(found[2], levels) : pageNews ? inLevels(pageNews.stance === 'support' ? 'soutien_declare' : 'non_soutien_declare', levels) : 'inconnue';
            // the confirmations hold for the reading of the news (not for a vote, nor for what a confirmation made of it)
            const confirmed = confirmedOf(member.qid, subject.qid, position);
            // promoted: no vote, a confirmation that holds, a position with a side whose declared level the server stands behind
            const promoted = !human && (confirmed?.count ?? 0) > 0 ? inLevels(declaredOf(position), levels) : 'inconnue';
            const isPromoted = promoted !== 'inconnue';
            // an association that no signal names with this candidate and that no reader decided or confirmed has no row for it at all
            if (!found && !unsure && !human && !confirmed && coverage.articles_30d === 0 && fromPages.length === 0) continue;
            positions[subject.qid] = {
                confirmed,
                // under a vote, position is the decisive one; promoted by a confirmation, the declared level; ai_position the reading of the news
                position: human ? VOTED_POSITION[human.value] : isPromoted ? promoted : position,
                ...(human || isPromoted ? {ai_position: position} : {}),
                human,
                since: found ? iso(found[3]) : pageNews ? pageNews.page.at : null,
                previous: found && extras.previous ? inLevels(extras.previous, levels) : null,
                changed: Boolean(extras.changed),
                // a validated position never ages
                stale: isPromoted ? false : Boolean(extras.stale),
                signals_count: (found ? 1 + Math.floor(hash(`s/${member.fifa}`) * 4) : 0) + pageSure.length,
                last_signal_at: [found ? iso(Math.max(1, found[3] - 2)) : unsure ? iso(2 + Math.floor(hash(member.fifa) * 20)) : null, ...fromPages.map(row => row.page.at)].filter(Boolean).sort().at(-1) ?? null,
                uncertain_count: uncertain_count + (fromPages.length - pageSure.length),
                ...coverage,
                // the sources that explain the colour: what the tooltip names
                basis: found ? [0, 1].slice(0, 1 + Math.floor(hash(`b/${member.fifa}`) * 2)).map(i => ({
                    medium: MEDIA[Math.floor(hash(`${member.fifa}/${i}`) * MEDIA.length)],
                    published_at: iso(Math.max(1, found[3] - i * 3)),
                    url: `https://example.test/mock/${member.fifa}/${i}`,
                })) : pageNews ? [{medium: pageNews.page.medium, published_at: pageNews.page.at, url: pageNews.page.url}] : [],
            };
        }
        const sum = (key) => Object.values(positions).reduce((total, one) => total + one[key], 0);
        return {
            qid: member.qid, fifa: member.fifa, name: member.name, association: member.association, level: 'association',
            confederation: member.confederation, iso: member.iso, lat: member.lat, lng: member.lng,
            leader: leaderOf(member, index),
            positions,
            lean: leanFor(positions),
            // the articles and media of all the candidates together (a medium that names two candidates counts once)
            coverage: {articles_30d: sum('articles_30d'), media_30d: Math.min(sum('media_30d'), sum('articles_30d'))},
        };
    });

    // How many news of the last 30 days name the president of an association: most of them none; France has 145 (three pages of 50)
    const mentionsOf = (member) => member.fifa === 'FRA' ? 145 : hash(`pm/${member.fifa}`) < 0.33 ? 1 + Math.floor(hash(`pa/${member.fifa}`) ** 2 * 14) : 0;
    // The news that name the president of an association, newest first: [{id, title, description, medium, url, lang, published_at, relevant}]. relevant: the news is about football
    // (it also names the association, its confederation or FIFA, or holds a football word); the others name the person in another context. France: 145 in all, 126 about football
    const leaderNewsOf = (member) => {
        const total = mentionsOf(member);
        const away = new Set(member.fifa === 'FRA' ? Array.from({length: 19}, (_, i) => 3 + i * 7) : Array.from({length: Math.floor(total / 4)}, (_, i) => 3 + i * 4).filter(n => n < total));
        return Array.from({length: total}, (_, n) => {
            const lang = LANGS[Math.floor(hash(`ll/${member.fifa}/${n}`) * LANGS.length)];
            const relevant = !away.has(n);
            return {
                id: `${member.fifa}-n${n}`,
                title: relevant ? `[Mock] ${member.leader.name} speaks about the election of the president of FIFA (${n + 1})` : `[Mock] ${member.leader.name} opens a school in the region (${n + 1})`,
                // one in five has no description; the others are long enough to be cut
                description: n % 5 === 4 ? '' : `[Mock] A few lines of the article, to see how the description is cut when it is long: the federation will meet before the end of the month, the \
agenda holds the election and the rules of the vote, and nothing is decided yet (${n + 1}).`,
                medium: MEDIA[Math.floor(hash(`lm/${member.fifa}/${n}`) * MEDIA.length)],
                url: `https://example.test/mock/news/${member.fifa}/${n}`, lang, published_at: iso(0.2 + (n / Math.max(1, total)) * 29.5), relevant,
            };
        });
    };

    const confederations = REFERENTIAL.confederations.map((one, index) => {
        const positions = {};
        if (one.fifa === 'AFC') positions[A] = {position: inLevels('soutien_declare', levels), since: iso(30), previous: null, changed: false, stale: false, signals_count: 2, last_signal_at: iso(30), uncertain_count: 0, articles_30d: 14, media_30d: 6, basis: [{medium: 'Mock Daily', published_at: iso(30), url: 'https://example.test/mock/AFC/0'}]};
        if (one.fifa === 'CAF') positions[A] = {position: inLevels('soutien_probable', levels), since: iso(19), previous: null, changed: false, stale: false, signals_count: 1, last_signal_at: iso(19), uncertain_count: 0, articles_30d: 7, media_30d: 4, basis: [{medium: 'Mock Sport', published_at: iso(19), url: 'https://example.test/mock/CAF/0'}]};
        if (one.fifa === 'UEFA') positions[B] = {position: 'inconnue', since: null, previous: null, changed: false, stale: false, signals_count: 0, last_signal_at: iso(6), uncertain_count: 2, articles_30d: 9, media_30d: 5, basis: []};
        return {
            qid: one.qid, fifa: one.fifa, name: one.name, level: 'confederation', confederation: one.fifa, iso: null, lat: null, lng: null,
            leader: {name: `Mock president ${one.fifa}`, role: 'President', person_qid: `QMOCKP${one.fifa}`, since: iso(900 + index * 100)},
            positions,
            lean: leanFor(positions),
            coverage: {articles_30d: Object.values(positions).reduce((n, one) => n + one.articles_30d, 0), media_30d: Object.values(positions).reduce((n, one) => n + one.media_30d, 0)},
        };
    });

    const members = [...all, ...confederations];
    const generated_at = new Date(now).toISOString();
    const subjects = candidates.map(subject => ({
        ...subject,
        positions_known: members.filter(member => member.level === 'association' && sideOf(member.positions[subject.qid]?.position ?? 'inconnue') !== 'unknown').length,
        uncertain_count: members.filter(member => member.level === 'association' && (member.positions[subject.qid]?.uncertain_count ?? 0) > 0).length,
    }));

    const signalsOf = (member) => {
        const signals = [];
        let id = 0;
        for (const [subject, one] of Object.entries(member.positions)) {
            const name = candidates.find(candidate => candidate.qid === subject).name;
            const side = sideOf(ai(one));
            const lang = LANGS[Math.floor(hash(`l/${member.fifa}`) * LANGS.length)];
            const medium = (i) => MEDIA[Math.floor(hash(`${member.fifa}/${i}`) * MEDIA.length)];
            if (side !== 'unknown') {
                const wording = side === 'yes' ? `will back ${name}` : `will not back ${name}`;
                const probable = ai(one).endsWith('_probable');
                for (let i = 0; i < Math.min(2, one.signals_count - pageRowsOf(member.qid, subject).filter(row => row.certain).length); i++) {
                    // a declared position can hold an older signal that was only probable
                    const level = probable || i > 0 ? 'probable' : 'declared';
                    signals.push({
                        id: `${member.fifa}-${++id}`, subject_qid: subject, certainty: 'established', uncertain_reason: null,
                        stance: side === 'yes' ? 'support' : 'oppose', level,
                        mark: i === 0 && !probable ? 'official' : 'reported',
                        speaker: {name: `Mock speaker ${i + 1}`, role: i === 0 ? 'President of the association' : 'Spokesperson', binds: i === 0},
                        sentence: `[Mock sentence in ${lang}] The association ${wording}.`,
                        translation: lang === 'en' ? null : `[Mock translation] The association ${wording}.`,
                        url: `https://example.test/mock/${member.fifa}/${i}`, medium: medium(i), published_at: iso(Math.max(1, (one.since ? Math.round((now - Date.parse(one.since)) / DAY) : 5) - i * 3)), lang,
                        added_by: null, source_id: null,
                    });
                }
            }
            const setting = notColoured(POSITIONS.find(([fifa, who]) => fifa === member.fifa && who === subject), levels);
            const reasons = [
                ...(UNCERTAIN.find(([fifa, who]) => fifa === member.fifa && who === subject)?.[3]
                    ?? Array.from({length: Math.max(0, one.uncertain_count - pageRowsOf(member.qid, subject).filter(row => !row.certain).length - (setting ? 1 : 0))}, () => 'ambiguous')),
                ...(setting ? ['colour_setting'] : []),
            ];
            reasons.forEach((reason, i) => signals.push({
                id: `${member.fifa}-${++id}`, subject_qid: subject, certainty: 'uncertain', uncertain_reason: reason, stance: null, level: 'none', mark: reason === 'rumour' ? 'reported' : 'reported',
                speaker: {name: `Mock speaker ${i + 3}`, role: reason === 'speaker_not_binding' ? 'Vice-president' : null, binds: false},
                sentence: `[Mock sentence in ${lang}] Words about the election of the FIFA president and ${name} (${UNCERTAIN_LABELS[reason]}).`,
                translation: lang === 'en' ? null : '[Mock translation] Words about the election of the FIFA president.',
                url: `https://example.test/mock/${member.fifa}/u${i}`, medium: medium(i + 2), published_at: iso(2 + i * 4 + Math.floor(hash(member.fifa) * 6)), lang,
                added_by: null, source_id: null,
            }));
            // a sentence on the other side (older, probable) for a candidate whose news point both ways: the summary shows both sides
            if (POSITIONS.find(([fifa, who]) => fifa === member.fifa && who === subject)?.[4]?.counter && side !== 'unknown') {
                const against = side === 'yes';
                signals.push({
                    id: `${member.fifa}-counter`, subject_qid: subject, certainty: 'established', uncertain_reason: null, stance: against ? 'oppose' : 'support', level: 'probable', mark: 'reported',
                    speaker: {name: 'Mock speaker 9', role: 'Vice-president', binds: false},
                    sentence: `[Mock sentence in ${lang}] The association ${against ? 'will not back' : 'will back'} ${name} yet.`,
                    translation: lang === 'en' ? null : `[Mock translation] The association ${against ? 'will not back' : 'will back'} ${name} yet.`,
                    url: `https://example.test/mock/${member.fifa}/c`, medium: medium(3), published_at: iso(60), lang, added_by: null, source_id: null,
                });
            }
            // what the AI read in the pages readers added: signals like the others, with who added the page and the id of the source
            for (const row of pageRowsOf(member.qid, subject)) {
                signals.push({
                    id: `${row.page.id}-${subject}`, subject_qid: subject, certainty: row.certain ? 'established' : 'uncertain', uncertain_reason: row.certain ? null : 'other',
                    stance: row.certain ? row.stance : null, level: row.certain ? row.level : 'none', mark: 'reported', speaker: {name: null, role: null, binds: false},
                    sentence: row.found, translation: null, url: row.page.url, medium: row.page.medium, published_at: row.page.at, lang: 'en', added_by: row.page.by, source_id: row.page.id,
                });
            }
        }
        return signals.sort((a, b) => b.published_at.localeCompare(a.published_at));
    };

    // The key moments of the positions of an association. Each carries the article of the signal that made the change, {url, medium}, or both null when the signal
    // has none (the dot is then a plain marker): the first position and a reversal have one, a weakening has none in the mock
    const historyOf = (member, signals) => {
        const history = [];
        const article = (subject, oldest) => {
            const found = signals.filter(signal => signal.subject_qid === subject && signal.certainty === 'established');
            const one = oldest ? found.at(-1) : found[0];
            return one ? {url: one.url, medium: one.medium} : {url: null, medium: null};
        };
        for (const [subject, one] of Object.entries(member.positions)) {
            const side = sideOf(ai(one));
            if (side === 'unknown' || !one.since) continue;
            if (one.previous) {
                const kind = sideOf(one.previous) !== side ? 'reversal' : 'weakened';
                history.push({subject_qid: subject, date: iso(Math.round((now - Date.parse(one.since)) / DAY) + 40), from: null, to: one.previous, kind: 'first', ...article(subject, true)});
                history.push({subject_qid: subject, date: one.since, from: one.previous, to: ai(one), kind, ...(kind === 'weakened' ? {url: null, medium: null} : article(subject, false))});
            } else {
                history.push({subject_qid: subject, date: one.since, from: null, to: ai(one), kind: 'first', ...article(subject, true)});
            }
        }
        return history.sort((a, b) => a.date.localeCompare(b.date));
    };

    // ---- the summary of a sheet, BUILT BY THE CODE from what the sheet holds (nothing in it is written by an AI)
    const KEY_SENTENCES = 2;
    const sidesOf = (member, subject, entry, signals, history) => {
        const mine = signals.filter(signal => signal.subject_qid === subject.qid && signal.certainty === 'established');
        const make = (stance, group) => ({
            stance,
            declared: group.filter(signal => signal.level === 'declared').length,
            probable: group.filter(signal => signal.level !== 'declared').length,
            first_at: group.length > 0 ? group.map(signal => signal.published_at).sort()[0] : null,
            last_at: group.length > 0 ? group.map(signal => signal.published_at).sort().at(-1) : null,
            media: new Set(group.map(signal => signal.medium)).size,
            speakers: [...new Map(group.filter(signal => signal.speaker?.name).map(signal => [signal.speaker.name, {name: signal.speaker.name, role: signal.speaker.role, binds: Boolean(signal.speaker.binds)}])).values()],
            key: group.slice(0, KEY_SENTENCES).map(signal => ({
                id: signal.id, sentence: signal.sentence, url: signal.url, medium: signal.medium, published_at: signal.published_at, level: signal.level,
                speaker: signal.speaker?.name ?? null, role: signal.speaker?.role ?? null, binds: Boolean(signal.speaker?.binds),
            })),
        });
        const sides = ['for', 'against'].map(stance => make(stance, mine.filter(signal => (signal.stance === 'support') === (stance === 'for')))).filter(side => side.declared + side.probable > 0);
        // a reversal: the reading before it was the other side, one sentence of the article of the first position
        const first = history.find(one => one.subject_qid === subject.qid && one.kind === 'first');
        if (entry.previous && first && sideOf(entry.previous) !== 'unknown' && sideOf(entry.previous) !== sideOf(ai(entry))) {
            const stance = sideOf(entry.previous) === 'yes' ? 'for' : 'against';
            if (!sides.some(side => side.stance === stance)) {
                sides.push({
                    stance, declared: entry.previous.endsWith('_probable') ? 0 : 1, probable: entry.previous.endsWith('_probable') ? 1 : 0, first_at: first.date, last_at: first.date, media: 1, speakers: [],
                    key: [{
                        id: `${member.fifa}-${subject.qid}-first`, sentence: `[Mock sentence in en] The association ${stance === 'for' ? 'will back' : 'will not back'} ${subject.name}.`, url: first.url, medium: first.medium,
                        published_at: first.date, level: entry.previous.endsWith('_probable') ? 'probable' : 'declared', speaker: null, role: null, binds: false,
                    }],
                });
            }
        }
        // the side the position stands on comes first (an empty one when only a reader says it)
        const standing = sideOf(entry.position) === 'yes' ? 'for' : sideOf(entry.position) === 'no' ? 'against' : null;
        if (standing && !sides.some(side => side.stance === standing)) sides.push(make(standing, []));
        return sides.sort((a, b) => (b.stance === standing) - (a.stance === standing));
    };
    // The candidates that hold something, positions first (set by a reader or declared, then probable, then only Uncertain signals); the ones with nothing are not there
    const summaryOf = (member, signals, history) => ({
        candidates: candidates
            .map(subject => ({subject, entry: member.positions[subject.qid]}))
            .filter(({entry}) => entry)
            .map(({subject, entry}) => ({subject, entry, rank: sideOf(entry.position) !== 'unknown' ? (entry.position.endsWith('_probable') ? 1 : 0) : (entry.uncertain_count > 0 && !entry.human ? 2 : 3)}))
            .filter(({rank}) => rank < 3)
            .sort((a, b) => a.rank - b.rank || a.subject.color_index - b.subject.color_index)
            .map(({subject, entry}) => ({
                subject_qid: subject.qid, name: subject.name, color_index: subject.color_index, status: subject.status, position: entry.position, ai_position: entry.ai_position ?? entry.position,
                since: entry.since, previous: entry.previous, changed: entry.changed, stale: entry.stale, signals_count: entry.signals_count, uncertain_count: entry.uncertain_count,
                articles_30d: entry.articles_30d, media_30d: entry.media_30d,
                human: entry.human ? {value: entry.human.value, by: entry.human.by, at: entry.human.at, newer_evidence: entry.human.newer_evidence} : null,
                confirmed: entry.confirmed ?? null,
                sides: sidesOf(member, subject, entry, signals, history),
                latest_change: (({subject_qid, date, from, to, kind, url, medium}) => ({subject_qid, date, from, to, kind, url, medium}))(
                    history.filter(one => one.subject_qid === subject.qid && one.kind !== 'first').at(-1) ?? {}),
            }))
            .map(one => ({...one, latest_change: one.latest_change.date ? one.latest_change : null})),
    });
    // where the confederation stands on each candidate and how many OTHER associations of it are shown for / against: null for a confederation
    const contextOf = (member) => {
        const home = member.level === 'association' ? confederations.find(one => one.fifa === member.confederation) : null;
        if (!home) return null;
        const others = all.filter(one => one.confederation === member.confederation && one.qid !== member.qid);
        const own = {};
        const associations = {};
        for (const subject of candidates) {
            const entry = home.positions[subject.qid];
            if (entry && sideOf(entry.position) !== 'unknown') own[subject.qid] = {position: entry.position, since: entry.since};
            const counts = {for: 0, against: 0, unknown: 0, total: others.length};
            for (const one of others) {
                const side = sideOf(one.positions[subject.qid]?.position ?? 'inconnue');
                counts[side === 'yes' ? 'for' : side === 'no' ? 'against' : 'unknown'] += 1;
            }
            associations[subject.qid] = counts;
        }
        return {confederation: {qid: home.qid, fifa: home.fifa, name: home.name}, own, associations};
    };

    return {
        map: {mock: true, generated_at, levels, subjects, members},
        // what the server answers to a vote: the vote that decides now, or null
        humanAfter: (memberQid, subjectQid) => decisiveOf(memberQid, subjectQid),
        // what the server answers to a vote: the confirmations of the position shown now, or null
        confirmedAfter: (memberQid, subjectQid) => members.find(member => member.qid === memberQid)?.positions[subjectQid]?.confirmed ?? null,
        // the row of a vote as the server records it: a confirmation records the position the reader saw (the position shown now)
        // source: {url} validated (readSourceInput), joined to a for or against
        eventFor: (memberQid, subjectQid, value, by, note = null, source = null) => {
            const at = stamp();
            return {
            member_qid: memberQid, subject_qid: subjectQid, value, by, at, note, ...(source ? {source: recordSource(source, at)} : {}),
            // a confirmation records the position of the NEWS the reader saw (not what a vote or an earlier confirmation made of it)
            ...(value === 'confirm' ? {seen: (({ai_position, position}) => ai_position ?? position)(members.find(member => member.qid === memberQid)?.positions[subjectQid] ?? {position: 'inconnue'})} : {}),
            };
        },
        subjects: {mock: true, generated_at, subjects},
        // The news that name the president of an association (GET /fifa/associations/:qid/leader/news): scope 'football' (the default) or 'all', a page of limit from offset, newest
        // first; null for an association that is not known. total: the count of the scope asked, total_all and total_football both. relevant is true for all of them in scope 'football'
        leaderNews: (qid, {scope = 'football', limit = 50, offset = 0} = {}) => {
            const member = members.find(one => one.qid === qid);
            if (!member) return null;
            if (!member.leader) return {mock: true, leader: null, scope, total: 0, total_all: 0, total_football: 0, limit, offset, articles: []};
            const everything = member.level === 'association' ? leaderNewsOf(member) : [];
            const football = everything.filter(article => article.relevant);
            const wanted = scope === 'all' ? everything : football;
            return {
                mock: true, leader: {name: member.leader.name, person_qid: member.leader.person_qid}, scope, total: wanted.length, total_all: everything.length, total_football: football.length, limit, offset,
                articles: wanted.slice(offset, offset + limit).map(article => ({...article, relevant: scope === 'football' ? true : article.relevant})),
            };
        },
        association: (qid) => {
            const member = members.find(one => one.qid === qid);
            if (!member) return null;
            const signals = signalsOf(member);
            const history = historyOf(member, signals);
            const summary = summaryOf(member, signals, history);
            const written = aiSummaries[qid];
            return {
                mock: true, member, positions: member.positions, signals, history, leader: member.leader, lean: member.lean,
                // the summary built by the code, the confederation around it, and the summary an AI wrote when a reader asked (current: the sheet has not changed since)
                summary, context: contextOf(member),
                ai_summary: written ? {claims: written.claims, facts: written.facts, model: written.model, generated_at: written.generated_at, by: written.by, current: written.signature === summarySignature(summary)} : null,
                ai_summary_available: !aiOff && summary.candidates.length > 0,
                // newest first, the withdrawn ones too
                votes: events.filter(event => event.member_qid === qid).map(event => ({
                    subject_qid: event.subject_qid, value: event.value, by: event.by, at: event.at, note: event.note, ...(event.seen ? {seen: event.seen} : {}), source: sourceOf(event),
                })),
                // the sources of the choices that stand, newest first (the sheet lists them under each candidate's position)
                // choices' sources (kind 'choice') and pages added on their own (kind 'page'), newest first
                sources: [...sourcesOf(qid).map(one => ({kind: 'choice', ...one})), ...pages.filter(page => page.member_qid === qid).map(pageSourceOf)].sort((a, b) => b.at.localeCompare(a.at)),
                // the notes of readers, newest first; mine: written by the reader of the session
                notes: notes.filter(note => note.member_qid === qid).sort((a, b) => b.at.localeCompare(a.at)).map(({id, by, at, text}) => ({id, by, at, text, mine: by === reader})),
            };
        },
        presidents: {
            mock: true, generated_at,
            // 211 presidents: the one the public page of FIFA names (source 'fifa'), or, for an association whose page names none, the one only Wikidata
            // knew (source 'wikidata', no page). articles_30d: the articles of the last 30 days that name him, 0 for about two in three; last_mention: the latest
            presidents: all.filter(member => member.leader).map((member, index) => {
                const wikidata = index % 27 === 3;
                const mentions = mentionsOf(member);
                const medium = MEDIA[Math.floor(hash(`pd/${member.fifa}`) * MEDIA.length)].toLowerCase().replace(/ /g, '');
                return {
                    person_qid: member.leader.person_qid, name: member.leader.name, role: member.leader.role, since: member.leader.since ? member.leader.since.slice(0, 10) : null,
                    checked_at: generated_at, member_qid: member.qid,
                    source: wikidata ? 'wikidata' : 'fifa', source_url: wikidata ? '' : `https://example.test/mock/fifa-page/${member.fifa}`,
                    articles_30d: mentions,
                    last_mention: mentions === 0 ? null : {
                        at: iso(1 + Math.floor(hash(`pl/${member.fifa}`) * 25)), medium: `${medium}.example`, url: `https://example.test/mock/president/${member.fifa}`,
                        title: `[Mock] ${member.leader.name} speaks about the election`,
                    },
                };
            }),
        },
        confederations: {mock: true, generated_at, confederations: confederations.map(one => ({...one, members_count: all.filter(member => member.confederation === one.fifa).length}))},
    };
};

// What the server does with a vote: records it in `given` and answers {ok, human, confirmed}: the vote that decides after it, and the confirmations of the
// position shown (a confirmation changes neither). body: {subject, member, value, note?, source?: {url}} (the source already read by readSourceInput); by: the name
// of the reader
export const answerVote = ({levels, candidates, given, body, by}) => {
    const before = buildMock({levels, votes: given, candidates});
    given.push(before.eventFor(body.member, body.subject, body.value, by, body.note ?? null, body.source ?? null));
    const after = buildMock({levels, votes: given, candidates});
    return {ok: true, human: after.humanAfter(body.member, body.subject), confirmed: after.confirmedAfter(body.member, body.subject)};
};

// What the server does when a reader says which candidate an association leans toward (an association has one vote): records the rows and answers
// {ok, positions, lean, written}: the entries of the association after the choice. body: {member, subject: a candidate | 'none' | 'withdraw'}.
//   a candidate X  sets the association FOR X (a vote, solid) and "no position" (a vote) on every other candidate it was shown supporting; opposition is
//                  never touched; a choice that already stands (X is the one shown, chosen by a reader) writes nothing, unless a source or a note comes with it:
//                  they are joined to the FOR vote of X (body.source {url} already read by readSourceInput, body.note <= 280 characters)
//   'none'         "no position" on every candidate it was shown supporting
//   'withdraw'     the reader takes back everything they wrote on this association (their decisions and their confirmations)
export const answerLean = ({levels, candidates, given, body, by}) => {
    const before = buildMock({levels, votes: given, candidates});
    const member = before.map.members.find(one => one.qid === body.member);
    const shown = Object.entries(member.positions).filter(([, entry]) => sideOf(entry.position) === 'yes').map(([qid]) => qid);
    const write = (subject, value, note = null, source = null) => given.push(before.eventFor(body.member, subject, value, by, note, source));
    let written = 0;
    if (body.subject === 'withdraw') {
        const mine = before.association(body.member).votes;
        for (const one of candidates) {
            const last = mine.find(vote => vote.subject_qid === one.qid && vote.by === by);
            if (last && last.value !== 'withdraw') { write(one.qid, 'withdraw'); written += 1; }
        }
    } else if (body.subject === 'none') {
        for (const qid of shown) { write(qid, 'unknown'); written += 1; }
    } else if (body.source || body.note || !(shown.length === 1 && shown[0] === body.subject && member.positions[body.subject].human?.value === 'for')) {
        write(body.subject, 'for', body.note ?? null, body.source ?? null);
        written += 1;
        for (const qid of shown) if (qid !== body.subject) { write(qid, 'unknown'); written += 1; }
    }
    const after = buildMock({levels, votes: given, candidates}).map.members.find(one => one.qid === body.member);
    return {ok: true, positions: after.positions, lean: after.lean, written};
};
