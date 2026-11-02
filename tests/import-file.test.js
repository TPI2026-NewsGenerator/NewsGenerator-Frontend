//
//  Author: Fabian Rostello
//  Date: 01.10.2026
//  File: import-file.test.js
//  Description: The addresses read in a list a reader imports: text or CSV, OPML, Excel (whole, or by the
//               column of a sheet)
//

import {describe, expect, it} from 'vitest';
import {strToU8, zipSync} from 'fflate';
import {addressesIn, addressesOfFile, addressesOfOpml, addressesOfXlsx, openFile} from '@/features/briefing/importFile.js';

describe('addressesIn', () => {
    it('should find the addresses of any column of a CSV, once each', () => {
        const csv = 'Number,Country,Name,Website URL,RSS\n'
            + '1,ALB,Panorama Sport,https://www.panorama.com.al/sport/,No\n'
            + ',,Sport Ekspres,https://sportekspres.com,\n'
            + '21,GER,Kicker,"www.kicker.de",Yes\n'
            + ',,Panorama again,http://panorama.com.al/sport,\n';
        expect(addressesIn(csv)).toEqual([
            'https://www.panorama.com.al/sport/',
            'https://sportekspres.com',
            'https://www.kicker.de',
        ]);
    });

    it('should take the feed of a line rather than its site, the site of a line without a feed', () => {
        const csv = 'nom,url_site,categorie,flux_rss\r\n'
            + '24chasa,https://www.24chasa.bg/sport,sport,https://www.24chasa.bg/rss\r\n'
            + 'BBC,https://www.bbc.com/sport/football,sport,https://feeds.bbci.co.uk/sport/football/rss.xml\r\n'
            + '20min,https://www.20min.ch/sport,sport,\r\n'
            + 'Observatory,https://football-observatory.com,sport,https://football-observatory.com/spip.php?page=backend\r\n'
            + 'Two sites,https://www.a.example,https://www.b.example,\r\n';
        expect(addressesIn(csv)).toEqual([
            'https://www.24chasa.bg/rss',
            'https://feeds.bbci.co.uk/sport/football/rss.xml',
            'https://www.20min.ch/sport',
            'https://football-observatory.com/spip.php?page=backend',
            'https://www.a.example',
            'https://www.b.example',
        ]);
    });

    it('should keep every address of a line naming many sites', () => {
        expect(addressesIn('See https://a.example, https://b.example, https://c.example, https://d.example and https://e.example/rss'))
            .toHaveLength(5);
    });

    it('should leave the punctuation of a sentence out of the address', () => {
        expect(addressesIn('Read https://www.uefa.com. And (https://sofoot.com)!')).toEqual(['https://www.uefa.com', 'https://sofoot.com']);
    });
});

describe('addressesOfOpml', () => {
    it('should take the feed of each outline, else its site', () => {
        const opml = `<?xml version="1.0"?><opml version="2.0"><body>
            <outline text="Football"><outline text="Kicker" xmlUrl="https://newsfeed.kicker.de/news/aktuell" htmlUrl="https://www.kicker.de"/>
            <outline text="So Foot" htmlUrl="https://www.sofoot.com"/></outline></body></opml>`;
        expect(addressesOfOpml(opml)).toEqual(['https://newsfeed.kicker.de/news/aktuell', 'https://www.sofoot.com']);
    });
});

describe('addressesOfXlsx', () => {
    // the parts of an Excel file that hold texts and links, the others are not read
    const xlsx = () => zipSync({
        'xl/sharedStrings.xml': strToU8('<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Source Name</t></si><si><t>Der Standard</t></si><si><t>https://www.derstandard.at/sport</t></si><si><t>Kicker</t></si></sst>'),
        'xl/worksheets/sheet1.xml': strToU8('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row><c t="inlineStr"><is><t>sport.err.ee</t></is></c><c t="inlineStr"><is><t>www.tipsbladet.dk</t></is></c></row></sheetData></worksheet>'),
        'xl/worksheets/_rels/sheet1.xml.rels': strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.kicker.de/" TargetMode="External"/></Relationships>'),
        'xl/styles.xml': strToU8('<styleSheet><t>https://not-a-cell.example</t></styleSheet>'),
    });

    it('should read the texts of the cells and the targets of their links, not the namespaces', () => {
        expect(addressesOfXlsx(xlsx())).toEqual(expect.arrayContaining([
            'https://www.derstandard.at/sport', 'https://www.tipsbladet.dk', 'https://www.kicker.de/',
        ]));
        expect(addressesOfXlsx(xlsx())).toHaveLength(3);
    });

    it('should read a sheet row by row: the feed of a row rather than its site, the link of a cell on its row', () => {
        const bytes = zipSync({
            'xl/sharedStrings.xml': strToU8('<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>https://www.24chasa.bg/sport</t></si><si><t>https://www.24chasa.bg/rss</t></si><si><t>Kicker</t></si></sst>'),
            'xl/worksheets/sheet1.xml': strToU8('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>'
                + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
                + '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="inlineStr"><is><t>https://newsfeed.kicker.de/news/aktuell</t></is></c></row>'
                + '</sheetData><hyperlinks><hyperlink ref="A2" r:id="rId1"/></hyperlinks></worksheet>'),
            'xl/worksheets/_rels/sheet1.xml.rels': strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.kicker.de/" TargetMode="External"/></Relationships>'),
        });
        expect(addressesOfXlsx(bytes)).toEqual(['https://www.24chasa.bg/rss', 'https://newsfeed.kicker.de/news/aktuell']);
    });
});

// A workbook of two sheets as a program that prefixes the namespace writes it (<x:row>, <x:c>), the cells
// as texts of their own (t="str"), the sheets named by workbook.xml: the "Sources" sheet lists sites,
// their feed (some) and a page of proof, "Notes" lists a link
const prefixed = () => {
    const cell = (reference, text) => `<x:c r="${reference}" t="str"><x:v>${text}</x:v></x:c>`;
    const sheet = (rows) => `<x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData>${rows}</x:sheetData></x:worksheet>`;
    return zipSync({
        'xl/workbook.xml': strToU8('<x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheets>'
            + '<x:sheet name="Notes" sheetId="2" r:id="rIdB" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>'
            + '<x:sheet name="Sources" sheetId="1" r:id="rIdA" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></x:sheets></x:workbook>'),
        'xl/_rels/workbook.xml.rels': strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + '<Relationship Id="rIdA" Type="x" Target="/xl/worksheets/sheet1.xml"/><Relationship Id="rIdB" Type="x" Target="worksheets/sheet2.xml"/></Relationships>'),
        'xl/worksheets/sheet1.xml': strToU8(sheet(
            `<x:row r="1">${cell('A1', 'Name')}${cell('B1', 'URL to follow')}${cell('C1', 'RSS / Atom')}${cell('D1', 'Proof')}</x:row>`
            + `<x:row r="2">${cell('A2', 'Kicker')}${cell('B2', 'https://www.kicker.de/')}${cell('C2', 'https://newsfeed.kicker.de/news/aktuell')}${cell('D2', 'https://web.archive.org/kicker')}</x:row>`
            + `<x:row r="3">${cell('A3', 'So Foot')}${cell('B3', 'https://www.sofoot.com/')}${cell('D3', 'https://web.archive.org/sofoot')}</x:row>`
            + `<x:row r="4">${cell('A4', 'Marca')}${cell('B4', 'https://www.marca.com/')}${cell('D4', 'https://web.archive.org/marca')}</x:row>`)),
        'xl/worksheets/sheet2.xml': strToU8(sheet(`<x:row r="1">${cell('A1', 'See https://www.uefa.com/')}</x:row>`)),
    });
};

describe('openFile on an Excel file', () => {
    const open = (bytes) => openFile(new File([bytes], 'sources.xlsx'));

    it('should list the sheets by name, in the order of the workbook, with the columns that hold an address', async () => {
        const opened = await open(prefixed());
        expect(opened.sheets.map(sheet => [sheet.name, sheet.count])).toEqual([['Notes', 1], ['Sources', 5]]);
        expect(opened.sheets[1].columns).toEqual([
            {index: 1, label: 'URL to follow (column B)', count: 3},
            {index: 2, label: 'RSS / Atom (column C)', count: 1},
            {index: 3, label: 'Proof (column D)', count: 3},
        ]);
        expect(opened.sheets[1].best).toBe(1);
    });

    it('should guess the column holding the most addresses, the first one on a tie', async () => {
        const opened = await open(prefixed());
        expect(opened.guess).toEqual({sheet: 1, column: 1});
    });

    it('should read only the column chosen', async () => {
        const opened = await open(prefixed());
        expect(opened.addresses({sheet: 1, column: 1}).addresses).toEqual(['https://www.kicker.de/', 'https://www.sofoot.com/', 'https://www.marca.com/']);
        expect(opened.addresses({sheet: 1, column: 2}).addresses).toEqual(['https://newsfeed.kicker.de/news/aktuell']);
        expect(opened.addresses({sheet: 0, column: 0}).addresses).toEqual(['https://www.uefa.com/']);
    });

    it('should read every column of a sheet by rows, and the whole file by default', async () => {
        const opened = await open(prefixed());
        // the feed of a row rather than its site and its proof; the site and the proof of a row without a feed
        const sheet = [
            'https://newsfeed.kicker.de/news/aktuell',
            'https://www.sofoot.com/', 'https://web.archive.org/sofoot',
            'https://www.marca.com/', 'https://web.archive.org/marca',
        ];
        expect(opened.addresses({sheet: 1}).addresses).toEqual(sheet);
        expect(opened.addresses().addresses).toEqual(['https://www.uefa.com/', ...sheet]);
    });

    it('should name a column by its letter when the text over it is an address or too long', async () => {
        const cell = (reference, text) => `<c r="${reference}" t="inlineStr"><is><t>${text}</t></is></c>`;
        const bytes = zipSync({
            'xl/worksheets/sheet1.xml': strToU8('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
                + `<row r="1">${cell('A1', 'https://www.first.example/')}${cell('C1', 'A title that goes on and on for far longer than a name of a column does')}</row>`
                + `<row r="2">${cell('A2', 'https://www.second.example/')}${cell('C2', 'https://www.third.example/')}</row>`
                + '</sheetData></worksheet>'),
        });
        const opened = await open(bytes);
        expect(opened.sheets).toHaveLength(1);
        expect(opened.sheets[0].name).toBe('Sheet 1');
        expect(opened.sheets[0].columns.map(column => column.label)).toEqual(['Column A', 'Column C']);
    });

    it('should place a cell by its reference, and a cell without one after the one before it', async () => {
        const bytes = zipSync({
            'xl/worksheets/sheet1.xml': strToU8('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
                + '<row r="1"><c r="B1" t="inlineStr"><is><t>https://www.b.example/</t></is></c><c t="inlineStr"><is><t>https://www.c.example/</t></is></c></row>'
                + '<row r="2"><c r="AA2" t="inlineStr"><is><t>https://www.aa.example/</t></is></c></row>'
                + '</sheetData></worksheet>'),
        });
        const opened = await open(bytes);
        expect(opened.sheets[0].columns.map(column => [column.index, column.count])).toEqual([[1, 1], [2, 1], [26, 1]]);
    });

    it('should keep the sheets of a workbook without a list of them, in the order of their numbers', async () => {
        const sheet = (address) => strToU8(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row><c t="inlineStr"><is><t>${address}</t></is></c></row></sheetData></worksheet>`);
        const opened = await open(zipSync({'xl/worksheets/sheet10.xml': sheet('https://ten.example/'), 'xl/worksheets/sheet2.xml': sheet('https://two.example/')}));
        expect(opened.sheets.map(each => each.name)).toEqual(['Sheet 1', 'Sheet 2']);
        expect(opened.addresses({sheet: 0, column: 0}).addresses).toEqual(['https://two.example/']);
    });

    it('should offer no sheet for a file read whole', async () => {
        const opened = await openFile(new File(['https://www.ft.com/sport'], 'list.txt'));
        expect(opened.sheets).toEqual([]);
        expect(opened.addresses().addresses).toEqual(['https://www.ft.com/sport']);
    });
});

describe('addressesOfFile', () => {
    it('should refuse an old Excel file, with what to do', async () => {
        await expect(addressesOfFile(new File(['x'], 'sources.xls'))).rejects.toThrow('.xlsx or .csv');
    });

    it('should read a text file', async () => {
        const file = new File(['https://www.ft.com/sport\nhttps://www.reuters.com'], 'list.txt');
        expect(await addressesOfFile(file)).toEqual({addresses: ['https://www.ft.com/sport', 'https://www.reuters.com'], more: 0, besideFeed: 0});
    });
});
