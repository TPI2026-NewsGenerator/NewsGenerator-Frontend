//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: importNames.js
//  Description: A list of names to follow, from the first column of an Excel file: the names read, looked
//               for in Wikidata by lots, and what the reader's choices make of them (the items to follow
//               and the names to follow as written)
//

// the names a request asks of the server at most (see CHECK_MAX of entity-service.js on the server)
export const CHECK_LOT = 10;

// A cell as a name: the text, or a number written out; quotes and commas out (a name is searched as an exact
// phrase), the spaces of a sheet made one. '' for a cell that holds none
const nameOfCell = (cell) => {
    const text = typeof cell === 'string' ? cell : typeof cell === 'number' ? String(cell) : '';
    return text.replace(/["“”,\s]+/g, ' ').trim();
};

// The names of the first column of a sheet (rows: [[cell, ...]], as readSheet gives them), in order, once
// each whatever the case, the empty cells left out. skipFirst: the first row is a title
export const namesOfSheet = (rows, {skipFirst = false} = {}) => {
    const seen = new Set();
    const names = [];
    for (const row of (rows ?? []).slice(skipFirst ? 1 : 0)) {
        const name = nameOfCell(row?.[0]);
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        names.push(name);
    }
    return names;
};

// Waiting, that a click on Cancel (stop()) cuts short
const delay = (ms, stop = null) => new Promise(resolve => {
    const end = Date.now() + ms;
    const tick = () => {
        const left = end - Date.now();
        if (left <= 0 || stop?.()) resolve();
        else setTimeout(tick, Math.min(250, left));
    };
    tick();
});

// A failure worth asking again: what stands before the server did not answer (a page, a 502, a 524, no network),
// the server is busy or asked to go slower (429, 408), or Wikidata did not answer it. Not a call the server
// refused (400, 403, 404): asking again would be refused again. An answer with no status is a failure of the call
// itself, before the server (no network)
export const isTransient = (data) => data?.status === undefined || data.status === 0 || data.status >= 500 || data.status === 429 || data.status === 408;

// 4, 8, 16, 32 s then 60 s: the longer a failure lasts, the less it is pressed
const backoff = (failures) => Math.min(60e3, 4e3 * 2 ** (failures - 1));
const MOST_WAIT = 120e3;
// the time spent waiting, in all, before a call is given up (10 minutes); every answer that comes resets it
export const PATIENCE_MS = 10 * 60e3;

// A call asked again by itself when it fails for a reason that passes (see isTransient), after a wait that grows
// and that follows what the server asked (retryIn of Wikidata, retryAfter of the limit), without losing what the
// caller has already. call(): answers {error, status?, retryIn?} or the data; onWait({ms, error, failures}) before each
// wait, for the page to say it; stop(): true to leave off, then null; sleep(ms, stop): the wait, given for the
// tests; patienceMs: the time to wait in all before giving up. Throws the error of a call that is refused, or that
// failed for too long
export const withRetry = async (call, {onWait = null, stop = null, sleep = delay, patienceMs = PATIENCE_MS} = {}) => {
    let failures = 0;
    let waited = 0;
    for (;;) {
        if (stop?.()) return null;
        let data;
        try {
            data = await call();
        } catch (err) {
            data = {error: err.message, status: 0};
        }
        if (!data?.error) return data;
        if (!isTransient(data)) throw new Error(data.error);
        failures++;
        const asked = Math.min(MOST_WAIT, data.retryIn ?? (data.retryAfter ?? 0) * 1000);
        const wait = Math.max(asked, backoff(failures));
        if (waited + wait > patienceMs) throw new Error(`${data.error} (tried again for ${Math.round(waited / 60e3)} minutes)`);
        onWait?.({ms: wait, error: data.error, failures});
        await sleep(wait, stop);
        waited += wait;
    }
};

// The names looked for in Wikidata, CHECK_LOT a request, one request after the other: Map name -> the result
// of the server ({name, status, item?, items?, famous?, themed?}). check(lot): the call, answering {results, retryIn?} or
// {error}; onResult(done): once each lot is back; stop(): true to leave off before the next lot; onWait, sleep,
// patienceMs: see withRetry. A call that fails for a reason that passes is asked again by itself after a wait,
// nothing lost: it never asks the reader to click again before patienceMs of waiting. The server may answer for
// the first names of a lot only (it stops after 30 s, or Wikidata stopped the search and says how long to wait,
// retryIn): the others are asked again with the next lot, after the wait. A lot that fails for good throws, the
// results already had are in 'results', the same map given again carries on from where it stopped
export const checkNames = async (names, check, {results = new Map(), onResult = null, stop = null, onWait = null, sleep = delay, patienceMs = PATIENCE_MS} = {}) => {
    let wanted = names.filter(name => !results.has(name));
    while (wanted.length > 0) {
        if (stop?.()) break;
        const lot = wanted.slice(0, CHECK_LOT);
        const data = await withRetry(() => check(lot), {onWait, stop, sleep, patienceMs});
        if (data === null) break;
        const answered = Array.isArray(data?.results) ? data.results.slice(0, lot.length) : [];
        if (answered.length === 0) throw new Error('The answer of the server is incomplete.');
        answered.forEach((result, j) => results.set(lot[j], result));
        wanted = wanted.slice(answered.length);
        onResult?.(results.size);
        // Wikidata asked to wait: the names after the ones told are asked again then
        if (data.retryIn && wanted.length > 0) {
            onWait?.({ms: Math.min(MOST_WAIT, data.retryIn), error: 'Wikidata asked to wait', failures: 0});
            await sleep(Math.min(MOST_WAIT, data.retryIn), stop);
        }
    }
    return results;
};

// What the results and the choices make of the names. results: Map name -> result; choices: Map name -> the
// qid chosen among the items of a name ('none' for the name as written); a name to choose that has no choice
// is followed as written.
// {qids, words, toChoose, linked, counts: {total, known, linked, word, toChoose, invalid, unchecked}}
export const planOf = (names, results, choices) => {
    const qids = [];
    const words = [];
    const toChoose = [];
    const linked = [];
    const counts = {total: names.length, known: 0, linked: 0, word: 0, toChoose: 0, invalid: 0, unchecked: 0};
    for (const name of names) {
        const result = results.get(name);
        if (!result) counts.unchecked++;
        else if (result.status === 'known') counts.known++;
        else if (result.status === 'invalid') counts.invalid++;
        else if (result.status === 'linked') {
            qids.push(result.item.qid);
            linked.push({name, item: result.item, famous: Boolean(result.famous), themed: result.themed ?? null});
            counts.linked++;
        } else if (result.status === 'word') {
            words.push(result.name);
            counts.word++;
        } else if (result.status === 'choose') {
            toChoose.push({name, items: result.items});
            counts.toChoose++;
            const choice = choices.get(name);
            if (choice && choice !== 'none') qids.push(choice);
            else words.push(result.name);
        }
    }
    return {qids: [...new Set(qids)], words, toChoose, linked, counts};
};
