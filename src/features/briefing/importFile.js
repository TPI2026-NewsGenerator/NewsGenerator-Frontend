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

// the addresses in a text, once each, in their order
export const addressesIn = (text) => {
    const seen = new Set();
    const addresses = [];
    for (let match of text.match(ADDRESS) ?? []) {
        const address = match.replace(/[.:!?'"]+$/, '');
        const url = /^https?:\/\//i.test(address) ? address : `https://${address}`;
        const key = keyOf(url);
        if (!key || !key.includes('.') || seen.has(key)) continue;
        seen.add(key);
        addresses.push(url);
    }
    return addresses;
};

// OPML, the list a reader of feeds exports: the feed of each outline, else its site
export const addressesOfOpml = (text) => {
    const document = new DOMParser().parseFromString(text, 'application/xml');
    const outlines = [...document.getElementsByTagName('outline')];
    return addressesIn(outlines
        .map(outline => outline.getAttribute('xmlUrl') || outline.getAttribute('htmlUrl') || '')
        .join('\n'));
};

// An Excel file is a zip of XML files: the texts of its cells are in sharedStrings.xml (or in the
// sheet itself), the targets of their links in the relations of each sheet. The text of a cell
// linked to a site is often its name ("Kicker"), its link the address
export const addressesOfXlsx = (bytes) => {
    const files = unzipSync(bytes, {
        filter: file => file.name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/(_rels\/)?sheet\d+\.xml(\.rels)?$/.test(file.name),
    });
    const decoder = new TextDecoder();
    const texts = [];
    for (let [name, content] of Object.entries(files)) {
        const document = new DOMParser().parseFromString(decoder.decode(content), 'application/xml');
        if (name.endsWith('.rels')) {
            for (let relation of document.getElementsByTagName('Relationship')) {
                if (relation.getAttribute('TargetMode') === 'External') texts.push(relation.getAttribute('Target') ?? '');
            }
        } else {
            for (let text of document.getElementsByTagName('t')) texts.push(text.textContent ?? '');
        }
    }
    return addressesIn(texts.join('\n'));
};

// the addresses of a file the reader picked, MAX_SITES at most: {addresses, more} where more is how
// many were left out
export const addressesOfFile = async (file) => {
    const name = file.name.toLowerCase();
    let addresses;
    if (/\.xlsx$|\.xlsm$/.test(name)) {
        addresses = addressesOfXlsx(new Uint8Array(await file.arrayBuffer()));
    } else if (/\.xls$|\.ods$|\.numbers$/.test(name)) {
        throw new Error('Save this sheet as .xlsx or .csv first: its format can not be read here.');
    } else if (/\.opml$/.test(name) || (/\.xml$/.test(name) && /<opml/i.test(await file.slice(0, 2000).text()))) {
        addresses = addressesOfOpml(await file.text());
    } else {
        addresses = addressesIn(await file.text());
    }
    return {addresses: addresses.slice(0, MAX_SITES), more: Math.max(0, addresses.length - MAX_SITES)};
};
