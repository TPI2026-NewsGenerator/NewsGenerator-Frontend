//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-presidents.test.jsx
//  Description: The view of the presidents as a table: one row for each of the 211, with the association, its position, the articles of the last 30 days
//               that name him, the latest mention (a link, the title as its tooltip), where the name comes from (the page of FIFA, or Wikidata), the
//               counters, the filter "Mentions" in the head of its column (all, with mentions, without), the default order (the most named first,
//               then the latest mention, then the name) and the search bar that finds a president or an association
//
//  The presidents are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {useEffect} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {buildMock} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const seen = {search: ''};
const Spy = () => {
    const {search} = useLocation();
    useEffect(() => { seen.search = search; });
    return null;
};
const params = () => Object.fromEntries(new URLSearchParams(seen.search));
const show = (url = '/fifa?view=presidents') => render(<MemoryRouter initialEntries={[url]}><Spy/><FifaBoard reader="reader"/></MemoryRouter>);

const mock = buildMock();
const presidents = mock.presidents.presidents;
const mentioned = presidents.filter(one => one.articles_30d > 0);
// the rows of the body of the table, the head and the empty state left out. Read from the DOM: 211 rows asked by role are slow in jsdom
const tableOf = () => screen.findByRole('table', {name: /^The presidents/});
const rowsOf = async () => [...(await tableOf()).querySelectorAll('tbody > tr')].filter(row => !row.querySelector('td[colspan]'));
const cellOf = (row, index) => row.querySelectorAll('td')[index];
const namesOf = (rows) => rows.map(row => cellOf(row, 0).textContent);
const wait = async (count) => waitFor(async () => expect(await rowsOf()).toHaveLength(count));
const tick = (name) => fireEvent.click(screen.getByRole('checkbox', {name}));
// the count of the table, read aloud as it changes (the page has another status when a candidate is still being read)
const countOf = () => screen.getAllByRole('status').find(one => /\d+ of \d+ presidents/.test(one.textContent));
const openFilter = (label) => fireEvent.click(screen.getByRole('button', {name: new RegExp(`^Filter ${label}`)}));

beforeEach(() => {
    seen.search = '';
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => mock.association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
});

describe('the mock', () => {
    it('should carry 211 presidents, about a third with mentions, a few from Wikidata only', () => {
        expect(presidents).toHaveLength(211);
        expect(mentioned.length).toBeGreaterThan(40);
        expect(mentioned.length).toBeLessThan(110);
        const wikidata = presidents.filter(one => one.source === 'wikidata');
        expect(wikidata.length).toBeGreaterThanOrEqual(5);
        expect(wikidata.length).toBeLessThan(20);
        expect(wikidata.every(one => one.source_url === '')).toBe(true);
        expect(presidents.filter(one => one.source === 'fifa').every(one => one.source_url.startsWith('https://'))).toBe(true);
        expect(mentioned.every(one => one.last_mention && /^\d{4}-\d{2}-\d{2}T/.test(one.last_mention.at))).toBe(true);
        expect(presidents.filter(one => one.articles_30d === 0).every(one => one.last_mention === null)).toBe(true);
    });
});

describe('PresidentsView', () => {
    it('should show a row for each of the 211 presidents, with the counters and the count of the table', async () => {
        show();
        expect(await rowsOf()).toHaveLength(211);
        expect(screen.getByText('presidents with mentions').previousElementSibling).toHaveTextContent(String(mentioned.length));
        expect(screen.getByText('associations with a president').previousElementSibling).toHaveTextContent('211 / 211');
        expect(countOf()).toHaveTextContent('211 of 211 presidents');
    });

    it('should have a column for the president, the association, the confederation, the position, the articles, the latest mention, the source and the year', async () => {
        show();
        await rowsOf();
        const heads = screen.getAllByRole('columnheader');
        expect(heads.map(head => head.textContent)).toEqual(['President', 'Association', 'Confederation', 'Position', 'Articles, 30 days', 'Latest mention', 'Source', 'Since']);
        expect(heads.every(head => head.getAttribute('scope') === 'col')).toBe(true);
    });

    it('should say the name, the association, the articles and the latest mention of a president named in the news', async () => {
        show();
        const rows = await rowsOf();
        // the most named one
        const first = [...mentioned].sort((a, b) => b.articles_30d - a.articles_30d || b.last_mention.at.localeCompare(a.last_mention.at))[0];
        const member = mock.map.members.find(one => one.qid === first.member_qid);
        const row = rows[0];
        expect(cellOf(row, 0)).toHaveTextContent(first.name);
        expect(within(cellOf(row, 1)).getByRole('button', {name: new RegExp(`^${member.name}`)})).toHaveTextContent(member.name);
        expect(cellOf(row, 1)).toHaveTextContent(member.fifa);
        expect(cellOf(row, 2)).toHaveTextContent(member.confederation);
        expect(cellOf(row, 4)).toHaveTextContent(String(first.articles_30d));
        const link = within(row).getByRole('link', {name: `${first.last_mention.at.slice(0, 10)} · ${first.last_mention.medium}`});
        expect(link).toHaveAttribute('href', first.last_mention.url);
        expect(link).toHaveAttribute('title', first.last_mention.title);
        expect(within(row).getByRole('link', {name: /^Source: (FIFA|Wikidata)$/})).toHaveAttribute('href', first.source_url);
    });

    it('should say 0 and a dash on a president no article names, with no latest mention', async () => {
        show('/fifa?view=presidents&f_ment=without');
        const rows = await rowsOf();
        expect(rows).toHaveLength(211 - mentioned.length);
        for (const row of rows) {
            expect(cellOf(row, 4)).toHaveTextContent(/^0$/);
            expect(cellOf(row, 5)).toHaveTextContent('—');
            expect(within(row).queryByRole('link', {name: / · /})).toBeNull();
        }
    });

    it('should say the source: a link to the page of FIFA, or Wikidata with no page', async () => {
        show();
        const rows = await rowsOf();
        const wikidata = presidents.find(one => one.source === 'wikidata');
        const row = rows.find(one => cellOf(one, 0).textContent === wikidata.name);
        expect(cellOf(row, 6)).toHaveTextContent('Wikidata');
        expect(within(row).queryByRole('link', {name: /^Source:/})).toBeNull();
        const fifa = presidents.find(one => one.source === 'fifa');
        const other = rows.find(one => cellOf(one, 0).textContent === fifa.name);
        expect(within(other).getByRole('link', {name: 'Source: FIFA'})).toHaveAttribute('href', fifa.source_url);
    });

    it('should keep the presidents named in the news with the filter of the column, the others with the other value, and keep it in the address', async () => {
        show();
        await rowsOf();
        openFilter('Articles, 30 days');
        tick('With mentions');
        await wait(mentioned.length);
        expect(params().f_ment).toBe('with');
        expect(countOf()).toHaveTextContent(`${mentioned.length} of 211 presidents`);
        expect(within(screen.getByRole('list', {name: 'Active filters'})).getByText('Mentions: With mentions')).toBeInTheDocument();
        tick('With mentions');
        tick('Without mentions');
        await wait(211 - mentioned.length);
        expect(params().f_ment).toBe('without');
        tick('Without mentions');
        await wait(211);
        expect(params().f_ment).toBeUndefined();
        // the counters are of all the presidents, whatever is shown
        expect(screen.getByText('presidents with mentions').previousElementSibling).toHaveTextContent(String(mentioned.length));
    });

    it('should find a president by his name or an association by its name, its country or its code, with the one search bar of the page', async () => {
        show();
        await rowsOf();
        expect(screen.getAllByRole('searchbox')).toHaveLength(1);
        const box = screen.getByRole('searchbox', {name: 'Search presidents'});
        // a president: "Mock president BRA"
        fireEvent.change(box, {target: {value: 'president bra'}});
        await waitFor(async () => expect(namesOf(await rowsOf())).toEqual(['Mock president BRA']));
        expect(params().q).toBe('president bra');
        // an association: by its country, then by its code of FIFA
        fireEvent.change(box, {target: {value: 'brazil'}});
        await waitFor(async () => expect(namesOf(await rowsOf())).toEqual(['Mock president BRA']));
        fireEvent.change(box, {target: {value: 'ARG'}});
        await waitFor(async () => expect(namesOf(await rowsOf())).toContain('Mock president ARG'));
        fireEvent.change(box, {target: {value: 'zzzzz'}});
        expect(await screen.findByText('No president matches these choices.')).toBeInTheDocument();
        expect(countOf()).toHaveTextContent('0 of 211 presidents');
    });

    it('should keep the confederation of the page and the filter of a column together, and reset them', async () => {
        show('/fifa?view=presidents&conf=CONMEBOL&f_ment=with');
        const south = new Set(mock.map.members.filter(one => one.confederation === 'CONMEBOL').map(one => one.qid));
        const rows = await rowsOf();
        expect(rows).toHaveLength(mentioned.filter(one => south.has(one.member_qid)).length);
        // "Reset" is the one of the page (the confederation, the level, the search); "Clear filters" is the one of the columns
        fireEvent.click(screen.getByRole('button', {name: 'Reset'}));
        await wait(mentioned.length);
        expect(params()).toEqual({view: 'presidents', f_ment: 'with'});
        fireEvent.click(screen.getByRole('button', {name: 'Clear filters'}));
        await wait(211);
        expect(params()).toEqual({view: 'presidents'});
    });

    it('should open the sheet of the association of a president', async () => {
        show();
        const rows = await rowsOf();
        const top = namesOf(rows)[0];
        const member = mock.map.members.find(one => one.qid === presidents.find(one => one.name === top).member_qid);
        fireEvent.click(within(rows[0]).getByRole('button', {name: new RegExp(`^${member.name}`)}));
        const sheet = await screen.findByRole('dialog');
        expect(within(sheet).getByRole('heading', {name: member.name})).toBeInTheDocument();
        expect(params().a).toBe(member.qid);
    });

    it('should say the position of the association on each row, with the words', async () => {
        show('/fifa?view=presidents&q=brazil');
        const [row] = await rowsOf();
        expect(cellOf(row, 3)).toHaveTextContent('Declared support for Mock candidate A');
    });
});
