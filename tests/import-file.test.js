//
//  Author: Fabian Rostello
//  Date: 01.10.2026
//  File: import-file.test.js
//  Description: The addresses read in a list a reader imports: text or CSV, OPML, Excel
//

import {describe, expect, it} from 'vitest';
import {strToU8, zipSync} from 'fflate';
import {addressesIn, addressesOfFile, addressesOfOpml, addressesOfXlsx} from '@/features/briefing/importFile.js';

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
});

describe('addressesOfFile', () => {
    it('should refuse an old Excel file, with what to do', async () => {
        await expect(addressesOfFile(new File(['x'], 'sources.xls'))).rejects.toThrow('.xlsx or .csv');
    });

    it('should read a text file', async () => {
        const file = new File(['https://www.ft.com/sport\nhttps://www.reuters.com'], 'list.txt');
        expect(await addressesOfFile(file)).toEqual({addresses: ['https://www.ft.com/sport', 'https://www.reuters.com'], more: 0});
    });
});
