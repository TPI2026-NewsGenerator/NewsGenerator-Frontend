//
//  Author: Fabian Rostello
//  Date: 01.10.2026
//  File: importFile.js
//  Description: The addresses of the sites in a list a reader imports: a sheet of Excel, a CSV, an
//               OPML file of another reader of feeds, or any text. Read here, in the browser: the
//               file never goes to the server, only its addresses
//

import {unzipSync} from "fflate";

export const MAX_SITES = 1000;

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

const RELATIONS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// An Excel file is a zip of XML files: the texts of its cells are in sharedStrings.xml (or in the
// sheet itself), the targets of their links in the relations of each sheet. The text of a cell
// linked to a site is often its name ("Kicker"), its link the address. Read row by row, a line each,
// so the feed of a row is taken rather than its site; a text or a link of no cell found after them
const textOfXlsx = (bytes) => {
    const files = unzipSync(bytes, {
        filter: file => file.name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/(_rels\/)?sheet\d+\.xml(\.rels)?$/.test(file.name),
    });
    const decoder = new TextDecoder();
    const xml = (name) => files[name] ? new DOMParser().parseFromString(decoder.decode(files[name]), 'application/xml') : null;
    const textOf = (node) => [...node.getElementsByTagName('t')].map(text => text.textContent ?? '').join('');

    const shared = [...(xml('xl/sharedStrings.xml')?.getElementsByTagName('si') ?? [])].map(textOf);
    const usedShared = new Set();
    const lines = [];
    for (const name of Object.keys(files).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))) {
        const sheet = xml(name);
        const targets = new Map([...(xml(name.replace('worksheets/', 'worksheets/_rels/') + '.rels')?.getElementsByTagName('Relationship') ?? [])]
            .filter(relation => relation.getAttribute('TargetMode') === 'External')
            .map(relation => [relation.getAttribute('Id'), relation.getAttribute('Target') ?? '']));
        const links = new Map();        // cell ("B2") -> id of its link
        for (const link of sheet.getElementsByTagName('hyperlink')) {
            links.set(link.getAttribute('ref'), link.getAttributeNS(RELATIONS, 'id') || link.getAttribute('r:id'));
        }
        const usedLinks = new Set();

        for (const row of sheet.getElementsByTagName('row')) {
            const cells = [...row.getElementsByTagName('c')].map(cell => {
                const value = cell.getElementsByTagName('v')[0]?.textContent ?? '';
                let text = value;
                if (cell.getAttribute('t') === 's') {
                    usedShared.add(Number(value));
                    text = shared[Number(value)] ?? '';
                } else if (cell.getAttribute('t') === 'inlineStr') {
                    text = textOf(cell);
                }
                const link = links.get(cell.getAttribute('r'));
                if (targets.has(link)) usedLinks.add(link);
                return [text, targets.get(link)].filter(Boolean).join('\t');
            });
            lines.push(cells.join('\t'));
        }
        lines.push(...[...targets].filter(([id]) => !usedLinks.has(id)).map(([, target]) => target));
    }
    lines.push(...shared.filter((_, index) => !usedShared.has(index)));
    return lines.join('\n');
};
export const addressesOfXlsx = (bytes) => addressesIn(textOfXlsx(bytes));

// the addresses of a file the reader picked, MAX_SITES at most: {addresses, more, besideFeed} where
// more is how many were left out over it, besideFeed how many for a feed of their line
export const addressesOfFile = async (file) => {
    const name = file.name.toLowerCase();
    let text;
    if (/\.xlsx$|\.xlsm$/.test(name)) {
        text = textOfXlsx(new Uint8Array(await file.arrayBuffer()));
    } else if (/\.xls$|\.ods$|\.numbers$/.test(name)) {
        throw new Error('Save this sheet as .xlsx or .csv first: its format can not be read here.');
    } else if (/\.opml$/.test(name) || (/\.xml$/.test(name) && /<opml/i.test(await file.slice(0, 2000).text()))) {
        text = textOfOpml(await file.text());
    } else {
        text = await file.text();
    }
    const {addresses, besideFeed} = read(text);
    return {addresses: addresses.slice(0, MAX_SITES), more: Math.max(0, addresses.length - MAX_SITES), besideFeed};
};
