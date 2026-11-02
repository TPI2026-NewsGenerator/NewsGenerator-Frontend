//
//  Author: Fabian Rostello
//  Date: 01.10.2026
//  File: importFile.js
//  Description: The addresses of the sites in a list a reader imports: a sheet of Excel, a CSV, an
//               OPML file of another reader of feeds, or any text. Read here, in the browser: the
//               file never goes to the server, only its addresses. An Excel file is read whole, or
//               by the column of a sheet the reader names
//

import {unzipSync} from "fflate";

// what the server checks in an hour for an account (SITES_CHECKED_PER_HOUR of feed-router.js): past it a
// list would make the reader wait for the next hour
export const MAX_SITES = 2000;

// "https://www.kicker.de/", "www.kicker.de" and "kicker.de" in a sentence. Not the addresses of the
// format itself (the namespaces of an Excel file are read out before)
const ADDRESS = /\b(?:https?:\/\/|www\.)[^\s"'<>()[\]{},;|]+/gi;

// a list names one site several times, as "https://www.x.com/sport" and "http://x.com/sport/"
const keyOf = (url) => {
    try {
        const {host, pathname, search} = new URL(url);
        return `${host.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}${search}`.toLowerCase();
    } catch {
        return null;
    }
};

// the address of a feed names it: "/rss", "/feed", ".xml", "atom", "backend" (SPIP), "feeds.bbci.co.uk",
// "newsfeed.kicker.de"
const FEED = /rss|feed|atom|\.xml\b|backend/i;
const looksFeed = (url) => {
    try {
        const {host, pathname, search} = new URL(url);
        return FEED.test(pathname + search) || /^[a-z]*(feeds?|rss)\./i.test(host);
    } catch {
        return false;
    }
};

// A list often gives a site and its feed on one line ("24chasa.bg/sport" and "24chasa.bg/rss"): only
// the feed is checked, the site led the server to the same feed or to another section. Checked twice,
// a list of 865 sources gave 1469 addresses, cut at MAX_SITES. Only on the line of a table: a text
// naming many sites on one line keeps them all.
// {addresses, besideFeed}: once each, in their order, and how many were left out for a feed of their line
const ROW_ADDRESSES = 4;
const read = (text) => {
    const seen = new Set();
    const addresses = [];
    let besideFeed = 0;
    for (const line of text.split(/\r\n|\r|\n/)) {
        const urls = (line.match(ADDRESS) ?? []).map(match => {
            const address = match.replace(/[.:!?'"]+$/, '');
            return /^https?:\/\//i.test(address) ? address : `https://${address}`;
        });
        const feeds = urls.filter(looksFeed);
        const kept = feeds.length > 0 && urls.length <= ROW_ADDRESSES ? feeds : urls;
        besideFeed += urls.length - kept.length;
        for (const url of kept) {
            const key = keyOf(url);
            if (!key || !key.includes('.') || seen.has(key)) continue;
            seen.add(key);
            addresses.push(url);
        }
    }
    return {addresses, besideFeed};
};

// the addresses in a text, once each, in their order, the feed of a line rather than its site
export const addressesIn = (text) => read(text).addresses;

// OPML, the list a reader of feeds exports: the feed of each outline, else its site
const textOfOpml = (text) => {
    const document = new DOMParser().parseFromString(text, 'application/xml');
    const outlines = [...document.getElementsByTagName('outline')];
    return outlines
        .map(outline => outline.getAttribute('xmlUrl') || outline.getAttribute('htmlUrl') || '')
        .join('\n');
};
export const addressesOfOpml = (text) => addressesIn(textOfOpml(text));

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const PACKAGE = 'http://schemas.openxmlformats.org/package/2006/relationships';
const RELATIONS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// The elements of a name in a namespace, whatever prefix the program that wrote the file gave it: some
// write <x:row> and <x:c>, which a search by the name "row" never finds
const within = (node, space, name) => [...(node?.getElementsByTagNameNS(space, name) ?? [])];

// "F2" -> 5, "AB12" -> 27 (the position of a column, from 0)
const columnOf = (reference) => [...reference.replace(/\d+/g, '')]
    .reduce((position, letter) => position * 26 + letter.toUpperCase().charCodeAt(0) - 64, 0) - 1;

// 5 -> "F", 27 -> "AB"
const letterOf = (column) => {
    let letters = '';
    for (let position = column + 1; position > 0; position = Math.floor((position - 1) / 26)) {
        letters = String.fromCharCode(65 + (position - 1) % 26) + letters;
    }
    return letters;
};

// An Excel file is a zip of XML files: the texts of its cells are in sharedStrings.xml (or in the
// sheet itself), the targets of their links in the relations of each sheet, the names of the sheets in
// workbook.xml. The text of a cell linked to a site is often its name ("Kicker"), its link the address.
// {sheets: [{name, rows: [[cell, ...]]}], loose}: a cell is its text and the target of its link, a row
// has a cell for each column up to its last; loose are the links and the texts of no cell found
const readXlsx = (bytes) => {
    const files = unzipSync(bytes, {
        filter: file => file.name === 'xl/sharedStrings.xml' || /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels)$/.test(file.name)
            || /^xl\/worksheets\/(_rels\/)?[^/]+\.xml(\.rels)?$/.test(file.name),
    });
    const decoder = new TextDecoder();
    const xml = (name) => files[name] ? new DOMParser().parseFromString(decoder.decode(files[name]), 'application/xml') : null;
    const textOf = (node) => within(node, MAIN, 't').map(text => text.textContent ?? '').join('');

    // the sheets as the workbook lists them; else the files of the sheets, in their order
    const paths = new Map(within(xml('xl/_rels/workbook.xml.rels'), PACKAGE, 'Relationship')
        .map(relation => [relation.getAttribute('Id'), relation.getAttribute('Target') ?? '']));
    let listed = within(xml('xl/workbook.xml'), MAIN, 'sheet').map(sheet => {
        const target = paths.get(sheet.getAttributeNS(RELATIONS, 'id') || sheet.getAttribute('r:id'));
        return {name: sheet.getAttribute('name') ?? '', path: !target ? '' : target.startsWith('/') ? target.slice(1) : `xl/${target}`};
    }).filter(sheet => files[sheet.path]);
    if (listed.length === 0) {
        listed = Object.keys(files)
            .filter(name => /^xl\/worksheets\/[^/]+\.xml$/.test(name))
            .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))
            .map((path, index) => ({name: `Sheet ${index + 1}`, path}));
    }

    const shared = within(xml('xl/sharedStrings.xml'), MAIN, 'si').map(textOf);
    const usedShared = new Set();
    const loose = [];
    const sheets = listed.map(({name, path}) => {
        const sheet = xml(path);
        const targets = new Map(within(xml(path.replace(/([^/]+)$/, '_rels/$1.rels')), PACKAGE, 'Relationship')
            .filter(relation => relation.getAttribute('TargetMode') === 'External')
            .map(relation => [relation.getAttribute('Id'), relation.getAttribute('Target') ?? '']));
        // cell ("B2") -> id of its link
        const links = new Map(within(sheet, MAIN, 'hyperlink')
            .map(link => [link.getAttribute('ref'), link.getAttributeNS(RELATIONS, 'id') || link.getAttribute('r:id')]));
        const usedLinks = new Set();

        const rows = within(sheet, MAIN, 'row').map(row => {
            const cells = [];
            let column = 0;     // a cell may come with no reference: it follows the one before
            for (const cell of within(row, MAIN, 'c')) {
                const reference = cell.getAttribute('r');
                if (reference) column = columnOf(reference);
                const value = within(cell, MAIN, 'v')[0]?.textContent ?? '';
                let text = value;
                if (cell.getAttribute('t') === 's') {
                    usedShared.add(Number(value));
                    text = shared[Number(value)] ?? '';
                } else if (cell.getAttribute('t') === 'inlineStr') {
                    text = textOf(cell);
                }
                const link = links.get(reference);
                if (targets.has(link)) usedLinks.add(link);
                cells[column++] = [text, targets.get(link)].filter(Boolean).join('\t');
            }
            return Array.from(cells, cell => cell ?? '');
        });
        loose.push(...[...targets].filter(([id]) => !usedLinks.has(id)).map(([, target]) => target));
        return {name, rows};
    });
    loose.push(...shared.filter((_, index) => !usedShared.has(index)));
    return {sheets, loose};
};

const textOfRows = (rows) => rows.map(row => row.join('\t')).join('\n');
const textOfColumn = (rows, column) => rows.map(row => row[column] ?? '').join('\n');
const textOfBook = ({sheets, loose}) => [...sheets.map(sheet => textOfRows(sheet.rows)), ...loose].join('\n');

// read row by row, a line each, so the feed of a row is taken rather than its site
export const addressesOfXlsx = (bytes) => addressesIn(textOfBook(readXlsx(bytes)));

// the name of a column: the text over it when it is short and no address ("URL à suivre"), else its letter
const TITLE_MAX = 40;
const labelOf = (rows, column) => {
    const title = (rows.find(row => row.some(Boolean))?.[column] ?? '').split('\t')[0].trim();
    const letter = letterOf(column);
    return title && title.length <= TITLE_MAX && !title.match(ADDRESS) ? `${title} (column ${letter})` : `Column ${letter}`;
};

// the column holding the most addresses (the first one on a tie)
const mostOf = (columns) => columns.reduce((most, column) => column.count > (most?.count ?? 0) ? column : most, null);

// the sheets of an Excel file that hold an address, and in each the columns that do:
// [{name, rows, count, best, columns: [{index, label, count}]}] where count is how many addresses and
// best the index of the column holding the most
const sheetsToChoose = ({sheets}) => sheets.map(({name, rows}) => {
    const width = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
    const columns = Array.from({length: width}, (_, index) => ({index, label: labelOf(rows, index), count: read(textOfColumn(rows, index)).addresses.length}))
        .filter(column => column.count > 0);
    return {name, rows, count: read(textOfRows(rows)).addresses.length, columns, best: mostOf(columns)?.index ?? null};
}).filter(sheet => sheet.columns.length > 0);

const capped = ({addresses, besideFeed}) => ({addresses: addresses.slice(0, MAX_SITES), more: Math.max(0, addresses.length - MAX_SITES), besideFeed});

// A file the reader picked, opened: {sheets, guess, addresses(pick)}. sheets are those of an Excel file
// that hold an address (none for any other file, read whole), see sheetsToChoose; guess the sheet and the
// column most likely to list the sites, {sheet, column} as pick. addresses({sheet, column}) are the
// addresses of one column of a sheet (sheet: its position in sheets, column: its index in the sheet),
// of every column of a sheet (column: null), of the whole file (sheet: null, and by default), MAX_SITES
// at most: {addresses, more, besideFeed} where more is how many were left out over it, besideFeed how
// many for a feed of their line
export const openFile = async (file) => {
    const name = file.name.toLowerCase();
    if (/\.xlsx$|\.xlsm$/.test(name)) {
        const book = readXlsx(new Uint8Array(await file.arrayBuffer()));
        const sheets = sheetsToChoose(book);
        const guess = sheets
            .map((sheet, at) => ({sheet: at, column: mostOf(sheet.columns)}))
            .reduce((best, pick) => pick.column.count > (best?.column.count ?? 0) ? pick : best, null);
        return {
            sheets: sheets.map(({name, count, columns, best}) => ({name, count, columns, best})),
            guess: guess ? {sheet: guess.sheet, column: guess.column.index} : {sheet: null, column: null},
            addresses: ({sheet = null, column = null} = {}) => capped(read(
                sheet === null ? textOfBook(book)
                    : column === null ? textOfRows(sheets[sheet].rows)
                        : textOfColumn(sheets[sheet].rows, column))),
        };
    }

    let text;
    if (/\.xls$|\.ods$|\.numbers$/.test(name)) {
        throw new Error('Save this sheet as .xlsx or .csv first: its format can not be read here.');
    } else if (/\.opml$/.test(name) || (/\.xml$/.test(name) && /<opml/i.test(await file.slice(0, 2000).text()))) {
        text = textOfOpml(await file.text());
    } else {
        text = await file.text();
    }
    return {sheets: [], guess: {sheet: null, column: null}, addresses: () => capped(read(text))};
};

// the addresses of a file the reader picked, as openFile gives them
export const addressesOfFile = async (file, pick) => (await openFile(file)).addresses(pick);
