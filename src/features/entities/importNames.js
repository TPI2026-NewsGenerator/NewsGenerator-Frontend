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

// The names looked for in Wikidata, CHECK_LOT a request, one request after the other: Map name -> the result
// of the server ({name, status, item?, items?, famous?}). check(lot): the call, answering {results} or {error};
// onResult(done): once each lot is back; stop(): true to leave off before the next lot. A lot that fails throws,
// the results already had are in 'results', the same map given again carries on from where it stopped. The
// server may answer for the first names of a lot only (it stops after 30 s, Wikidata being slow): the others
// are asked again with the next lot
export const checkNames = async (names, check, {results = new Map(), onResult = null, stop = null} = {}) => {
    let wanted = names.filter(name => !results.has(name));
    while (wanted.length > 0) {
        if (stop?.()) break;
        const lot = wanted.slice(0, CHECK_LOT);
        const data = await check(lot);
        if (data?.error) throw new Error(data.error);
        const answered = Array.isArray(data?.results) ? data.results.slice(0, lot.length) : [];
        if (answered.length === 0) throw new Error('The answer of the server is incomplete.');
        answered.forEach((result, j) => results.set(lot[j], result));
        wanted = wanted.slice(answered.length);
        onResult?.(results.size);
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
            linked.push({name, item: result.item, famous: Boolean(result.famous)});
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
