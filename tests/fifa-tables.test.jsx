//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-tables.test.jsx
//  Description: The three views that are tables (List, Confederations, Presidents) as a reader uses them, against the invented answers of
//               bench/fifa/mock-data.mjs: the ONE search bar bound to q, the header that cycles aria-sort (none, ascending, descending) and writes
//               sort and dir in the address, a filter of a column that combines with the filters of the page, "Clear filters" that clears the
//               columns and the sort only, a confederation that opens on the members the search finds, the empty state, and a phone, where the
//               rows are cards, the sort a select and the filters a sheet
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {useEffect} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {buildMock} from '../bench/fifa/mock-data.mjs';
import {compareConfederations, confederationItems} from '@/features/fifa/confederationsModel.js';
import {describe as describePosition} from '@/features/fifa/positions.js';

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
const show = (url) => render(<MemoryRouter initialEntries={[url]}><Spy/><FifaBoard reader="reader"/></MemoryRouter>);

// what the mock says, to compare the tables with
const mock = buildMock();
const {levels, subjects} = mock.map;
const associations = mock.map.members.filter(member => member.level === 'association');
const described = (member) => describePosition(member, {mode: 'all'}, levels, subjects);
const inConfederation = (code) => associations.filter(member => member.confederation === code);
const confederationRows = confederationItems({
    confederations: mock.confederations.confederations, associations: associations.map(member => ({member, described: described(member)})),
    members: mock.map.members, levels, subjects,
});
const presidentsOf = (code) => mock.presidents.presidents.filter(one => inConfederation(code).some(member => member.qid === one.member_qid));
const byName = (a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'});

// the rows of a table, the head, the empty state and the members opened under a confederation left out; the first cell of a row
const tableNamed = (name) => screen.findByRole('table', {name});
const rowsOf = (table) => [...table.querySelectorAll('tbody > tr')].filter(row => !row.querySelector('td[colspan]'));
const firstOf = (row) => {
    const cell = row.querySelector('td');
    return cell.querySelector('button')?.textContent ?? cell.textContent;
};
const namesOf = (table) => rowsOf(table).map(firstOf);
// the count of a table, read aloud as it changes (the page has another status while a candidate is being read)
const countOf = () => screen.getAllByRole('status').find(one => /\d+ of \d+ \w+/.test(one.textContent) && !/being read/.test(one.textContent)).textContent;
const sortButton = (table, name) => within(table).getByRole('button', {name});
const choose = (table, column, option) => {
    fireEvent.click(within(table).getByRole('button', {name: new RegExp(`^Filter ${column}`)}));
    fireEvent.click(screen.getByRole('checkbox', {name: option}));
};

beforeEach(() => {
    seen.search = '';
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => mock.association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
});

describe('the List table', () => {
    const open = async (url = '/fifa?view=list&conf=OFC') => {
        show(url);
        return tableNamed(/^The associations/);
    };

    it('should be a real table: a caption, a column header with a scope and an aria-sort on each column that sorts', async () => {
        const table = await open();
        const heads = within(table).getAllByRole('columnheader');
        expect(heads.map(head => head.textContent.replace(/\s+/g, ' '))).toEqual([
            'Association', 'Confederation', 'Candidate', 'Position', 'Last signal', 'Articles, 30 days', 'Established signals', 'Uncertain signals',
        ].map(label => expect.stringContaining(label)));
        for (const head of heads) {
            expect(head).toHaveAttribute('scope', 'col');
            expect(head).toHaveAttribute('aria-sort', 'none');
        }
        expect(table.querySelector('caption')).toHaveTextContent('The associations');
    });

    it('should start in the logical order: a candidate indicated first, the unknown last', async () => {
        const table = await open('/fifa?view=list&conf=CONMEBOL');
        const categories = rowsOf(table).map(row => described(associations.find(member => member.name === firstOf(row))).category);
        const rank = {indicated: 0, conflicting: 1, uncertain: 2, unknown: 3};
        expect(categories).toHaveLength(10);
        expect(categories.map(one => rank[one])).toEqual([...categories.map(one => rank[one])].sort((a, b) => a - b));
        expect(categories[0]).toBe('indicated');
    });

    it('should cycle the sort of a column with its header: ascending, descending, none, and write it in the address', async () => {
        const table = await open();
        const button = sortButton(table, 'Association');
        const head = button.closest('th');
        const expected = inConfederation('OFC').map(member => member.name).sort(byName);
        expect(button.tagName).toBe('BUTTON');
        button.focus();
        expect(button).toHaveFocus();

        fireEvent.click(button);
        await waitFor(() => expect(head).toHaveAttribute('aria-sort', 'ascending'));
        expect(namesOf(table)).toEqual(expected);
        expect(params()).toMatchObject({sort: 'name'});
        expect(params().dir).toBeUndefined();

        fireEvent.click(button);
        await waitFor(() => expect(head).toHaveAttribute('aria-sort', 'descending'));
        expect(namesOf(table)).toEqual([...expected].reverse());
        expect(params()).toMatchObject({sort: 'name', dir: 'desc'});

        fireEvent.click(button);
        await waitFor(() => expect(head).toHaveAttribute('aria-sort', 'none'));
        expect(params().sort).toBeUndefined();
        expect(params().dir).toBeUndefined();
        // the other headers never said anything else than none
        expect(within(table).getAllByRole('columnheader').filter(one => one.getAttribute('aria-sort') !== 'none')).toHaveLength(0);
    });

    it('should sort one column at a time, and show the arrow of the column sorted', async () => {
        const table = await open();
        fireEvent.click(sortButton(table, 'Articles, 30 days'));
        await waitFor(() => expect(sortButton(table, 'Articles, 30 days').closest('th')).toHaveAttribute('aria-sort', 'ascending'));
        fireEvent.click(sortButton(table, 'Association'));
        await waitFor(() => expect(sortButton(table, 'Association').closest('th')).toHaveAttribute('aria-sort', 'ascending'));
        expect(sortButton(table, 'Articles, 30 days').closest('th')).toHaveAttribute('aria-sort', 'none');
        expect(params().sort).toBe('name');
        // an arrow is drawn in the header of the column sorted (the icons of the others are fainter)
        expect(sortButton(table, 'Association').querySelector('svg.lucide-arrow-up')).not.toBeNull();
        expect(sortButton(table, 'Articles, 30 days').querySelector('svg.lucide-arrow-up-down')).not.toBeNull();
    });

    it('should keep the sort and the filters of the columns when the view changes and after a reload', async () => {
        const first = show('/fifa?view=list&conf=OFC&sort=articles&dir=desc&f_pos=unknown');
        const table = await tableNamed(/^The associations/);
        expect(sortButton(table, 'Articles, 30 days').closest('th')).toHaveAttribute('aria-sort', 'descending');
        fireEvent.mouseDown(screen.getByRole('tab', {name: 'Presidents'}));
        const presidents = await tableNamed(/^The presidents/);
        // the same column exists among the presidents, with the same sort; the filter of the position too
        expect(sortButton(presidents, 'Articles, 30 days').closest('th')).toHaveAttribute('aria-sort', 'descending');
        expect(params()).toMatchObject({view: 'presidents', conf: 'OFC', sort: 'articles', dir: 'desc', f_pos: 'unknown'});
        fireEvent.mouseDown(screen.getByRole('tab', {name: 'List'}));
        await tableNamed(/^The associations/);
        const address = `/fifa${seen.search}`;
        first.unmount();
        show(address);
        const again = await tableNamed(/^The associations/);
        expect(sortButton(again, 'Articles, 30 days').closest('th')).toHaveAttribute('aria-sort', 'descending');
        expect(screen.getByRole('list', {name: 'Active filters'})).toHaveTextContent('Position: Unknown');
        expect(namesOf(again).length).toBe(inConfederation('OFC').filter(member => described(member).category === 'unknown').length);
    });

    it('should combine the filter of a column with the filters of the page (AND), and say the count', async () => {
        const table = await open('/fifa?view=list&conf=CONMEBOL');
        const south = inConfederation('CONMEBOL');
        const indicated = south.filter(member => described(member).category === 'indicated');
        expect(indicated.length).toBeGreaterThan(0);
        expect(indicated.length).toBeLessThan(south.length);
        choose(table, 'Position', 'Candidate indicated');
        await waitFor(() => expect(rowsOf(table)).toHaveLength(indicated.length));
        expect(params().f_pos).toBe('indicated');
        expect(countOf()).toBe(`${indicated.length} of 211 associations`);
        expect(within(screen.getByRole('list', {name: 'Active filters'})).getByText('Position: Candidate indicated')).toBeInTheDocument();
        expect(namesOf(table).sort()).toEqual(indicated.map(member => member.name).sort());

        // the position level of the page says Unknown: nothing is both, and the table says so
        fireEvent.change(screen.getByRole('combobox', {name: 'Position level'}), {target: {value: 'unknown'}});
        expect(await within(table).findByText(/No association matches these choices\./)).toBeInTheDocument();
        expect(countOf()).toBe('0 of 211 associations');
        // and "Clear filters" clears the filter of the column only: the level of the page stays
        fireEvent.click(within(table).getByRole('button', {name: 'Clear filters'}));
        await waitFor(() => expect(rowsOf(table)).toHaveLength(south.filter(member => described(member).category === 'unknown').length));
        expect(params()).toMatchObject({conf: 'CONMEBOL', level: 'unknown'});
        expect(params().f_pos).toBeUndefined();
    });

    it('should clear the filters of the columns and the sort and nothing else with "Clear filters", and take a chip off by itself', async () => {
        const table = await open('/fifa?view=list&conf=CONMEBOL&q=a&c=QMOCK1&sort=name&dir=desc&f_art=yes,no&f_pos=indicated,unknown');
        const chips = within(screen.getByRole('list', {name: 'Active filters'}));
        expect(chips.getAllByRole('listitem')).toHaveLength(4);
        fireEvent.click(chips.getByRole('button', {name: 'Remove filter Position: Unknown'}));
        await waitFor(() => expect(params().f_pos).toBe('indicated'));
        fireEvent.click(screen.getByRole('button', {name: 'Clear filters'}));
        await waitFor(() => expect(params()).toEqual({view: 'list', conf: 'CONMEBOL', q: 'a', c: 'QMOCK1'}));
        expect(screen.queryByRole('list', {name: 'Active filters'})).toBeNull();
        expect(screen.queryByRole('button', {name: 'Clear filters'})).toBeNull();
        expect(within(table).getAllByRole('columnheader').every(head => head.getAttribute('aria-sort') === 'none')).toBe(true);
    });

    it('should ignore a column or a filter value it does not know in the address', async () => {
        const table = await open('/fifa?view=list&conf=OFC&sort=nonsense&dir=desc&f_pos=bogus&f_unknownfilter=x');
        expect(rowsOf(table)).toHaveLength(11);
        expect(within(table).getAllByRole('columnheader').every(head => head.getAttribute('aria-sort') === 'none')).toBe(true);
        expect(screen.queryByRole('list', {name: 'Active filters'})).toBeNull();
    });

    it('should say that nothing matches, in the count and in the table, with the way out', async () => {
        const table = await open('/fifa?view=list&q=zzzzzz');
        expect(await within(table).findByText(/No association matches these choices\./)).toBeInTheDocument();
        expect(countOf()).toBe('0 of 211 associations');
        expect(rowsOf(table)).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', {name: 'Reset'}));
        await waitFor(() => expect(rowsOf(table)).toHaveLength(211));
    });
});

describe('the ONE search bar', () => {
    it('should be the only search field on the screen in each table view, and share its text (q) across the six views', async () => {
        show('/fifa?view=list');
        await tableNamed(/^The associations/);
        expect(screen.getAllByRole('searchbox')).toHaveLength(1);
        const box = screen.getByRole('searchbox', {name: 'Search associations'});
        fireEvent.change(box, {target: {value: 'chile'}});
        await waitFor(async () => expect(namesOf(await tableNamed(/^The associations/))).toEqual(['Chile']));
        expect(params().q).toBe('chile');

        fireEvent.mouseDown(screen.getByRole('tab', {name: 'Presidents'}));
        await tableNamed(/^The presidents/);
        expect(screen.getAllByRole('searchbox')).toHaveLength(1);
        expect(screen.getByRole('searchbox', {name: 'Search presidents'})).toHaveValue('chile');

        fireEvent.mouseDown(screen.getByRole('tab', {name: 'Confederations'}));
        await tableNamed(/^The confederations/);
        expect(screen.getAllByRole('searchbox')).toHaveLength(1);
        expect(screen.getByRole('searchbox', {name: 'Search confederations and their members'})).toHaveValue('chile');

        // the views that are no tables have the search of the filters of the page, which holds the same text
        fireEvent.mouseDown(screen.getByRole('tab', {name: 'Map'}));
        await waitFor(() => expect(screen.getByRole('searchbox', {name: 'Search an association, a country or a FIFA code'})).toHaveValue('chile'));
        expect(screen.getAllByRole('searchbox')).toHaveLength(1);
    });

    it('should clear its text with its own button', async () => {
        show('/fifa?view=list&q=chile');
        await tableNamed(/^The associations/);
        fireEvent.click(screen.getByRole('button', {name: 'Clear the search'}));
        await waitFor(() => expect(params().q).toBeUndefined());
        expect(screen.getByRole('searchbox')).toHaveValue('');
    });
});

describe('the Confederations table', () => {
    const open = async (url = '/fifa?view=confederations') => {
        show(url);
        return tableNamed(/^The confederations/);
    };
    const expectedOrder = [...confederationRows].sort(compareConfederations).map(item => item.code);

    it('should list the six confederations, the most members first, with a column for each candidate', async () => {
        const table = await open();
        expect(namesOf(table)).toEqual(expectedOrder);
        const heads = within(table).getAllByRole('columnheader').map(head => head.textContent);
        for (const label of ['Confederation', 'President', 'Own position', 'Members', 'Conflicting', 'Uncertain', 'No position', ...subjects.map(subject => subject.name)]) {
            expect(heads.some(text => text.includes(label))).toBe(true);
        }
        // the counts of the first row are the ones of the model
        const first = confederationRows.find(item => item.code === expectedOrder[0]);
        expect(rowsOf(table)[0]).toHaveTextContent(String(first.total));
        expect(countOf()).toBe('6 of 6 confederations');
    });

    it('should sort by the members, the other way round, and by the support of a candidate', async () => {
        const table = await open();
        fireEvent.click(sortButton(table, 'Members'));
        await waitFor(() => expect(sortButton(table, 'Members').closest('th')).toHaveAttribute('aria-sort', 'ascending'));
        expect(namesOf(table)).toEqual([...confederationRows].sort((a, b) => a.total - b.total || compareConfederations(a, b)).map(item => item.code));
        fireEvent.click(sortButton(table, 'Mock candidate A'));
        await waitFor(() => expect(sortButton(table, 'Mock candidate A').closest('th')).toHaveAttribute('aria-sort', 'ascending'));
        expect(params().sort).toBe('support:QMOCK1');
        fireEvent.click(sortButton(table, 'Mock candidate A'));
        await waitFor(() => expect(params().dir).toBe('desc'));
        const supports = namesOf(table).map(code => confederationRows.find(item => item.code === code).support.QMOCK1);
        expect(supports).toEqual([...supports].sort((a, b) => b - a));
    });

    it('should open a confederation on the members the search finds, say how many, and hide the others', async () => {
        const table = await open();
        fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'brazil'}});
        await waitFor(() => expect(namesOf(table)).toEqual(['CONMEBOL']));
        const opener = within(table).getByRole('button', {name: 'CONMEBOL'});
        expect(opener).toHaveAttribute('aria-expanded', 'true');
        expect(table).toHaveTextContent('1 matching association');
        const members = table.querySelector('#members-CONMEBOL');
        expect(within(members).getByRole('button', {name: /^Brazil, BRA/})).toBeInTheDocument();
        // only the member found, not the nine others
        expect(within(members).getAllByRole('button', {name: /Open the sheet|^[A-Z][a-z]+, [A-Z]{3}/})).toHaveLength(1);
        expect(countOf()).toBe('1 of 6 confederations');
        expect(params().q).toBe('brazil');

        // a reader who closes it keeps it closed while the search stays
        fireEvent.click(opener);
        await waitFor(() => expect(opener).toHaveAttribute('aria-expanded', 'false'));
        expect(table.querySelector('#members-CONMEBOL')).toBeNull();

        // without the search the six come back, closed
        fireEvent.click(screen.getByRole('button', {name: 'Clear the search'}));
        await waitFor(() => expect(namesOf(table)).toEqual(expectedOrder));
    });

    it('should find a confederation by its president, or an association by the name of its president', async () => {
        const table = await open();
        fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'Mock president UEFA'}});
        await waitFor(() => expect(namesOf(table)).toEqual(['UEFA']));
        // the confederation matches itself: it is not opened on its members
        expect(within(table).getByRole('button', {name: 'UEFA'})).toHaveAttribute('aria-expanded', 'false');
        fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'president bra'}});
        await waitFor(() => expect(table.querySelector('#members-CONMEBOL')).not.toBeNull());
        expect(namesOf(table)).toEqual(['CONMEBOL']);
        expect(within(table.querySelector('#members-CONMEBOL')).getByRole('button', {name: /^Brazil, BRA/})).toBeInTheDocument();
    });

    it('should open the sheet of a member listed under a confederation', async () => {
        const table = await open('/fifa?view=confederations&q=brazil');
        fireEvent.click(await within(table).findByRole('button', {name: /^Brazil, BRA/}));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(params().a).toBeTruthy();
    });

    it('should filter by the support of a candidate with the filter of the column Members, combined with the confederation of the page', async () => {
        const table = await open();
        const supporting = confederationRows.filter(item => item.support.QMOCK1 > 0).map(item => item.code);
        expect(supporting.length).toBeGreaterThan(0);
        choose(table, 'Members', 'Mock candidate A');
        await waitFor(() => expect(namesOf(table).sort()).toEqual([...supporting].sort()));
        expect(params().f_supp).toBe('QMOCK1');
        expect(within(screen.getByRole('list', {name: 'Active filters'})).getByText('Supports: Mock candidate A')).toBeInTheDocument();
        // the confederation of the page keeps one of them, and the filter of the column still holds
        fireEvent.change(screen.getByRole('combobox', {name: 'Confederation'}), {target: {value: supporting[0]}});
        await waitFor(() => expect(namesOf(table)).toEqual([supporting[0]]));
        fireEvent.change(screen.getByRole('combobox', {name: 'Confederation'}), {target: {value: 'all'}});
        fireEvent.click(screen.getByRole('button', {name: 'Clear filters'}));
        await waitFor(() => expect(namesOf(table)).toEqual(expectedOrder));
        expect(params().f_supp).toBeUndefined();
    });

    it('should filter by the own position of the confederation', async () => {
        show('/fifa?view=confederations&f_ownpos=unknown');
        const table = await tableNamed(/^The confederations/);
        const unknown = confederationRows.filter(item => item.ownCategory === 'unknown').map(item => item.code);
        expect(namesOf(table).sort()).toEqual([...unknown].sort());
        expect(countOf()).toBe(`${unknown.length} of 6 confederations`);
        // the members of a confederation that opens follow the position level of the page
        expect(screen.getByRole('list', {name: 'Active filters'})).toHaveTextContent('Own position: Unknown');
    });

    it('should say that nothing matches, with the way out', async () => {
        const table = await open('/fifa?view=confederations&q=zzzzzz');
        expect(await within(table).findByText(/No confederation matches these choices\./)).toBeInTheDocument();
        expect(countOf()).toBe('0 of 6 confederations');
    });

    it('should keep "Show … on the map" among the members of a confederation that is open', async () => {
        const table = await open();
        fireEvent.click(within(table).getByRole('button', {name: 'OFC'}));
        fireEvent.click(await within(table).findByRole('button', {name: 'Show OFC on the map'}));
        await waitFor(() => expect(params()).toMatchObject({conf: 'OFC'}));
        expect(params().view).toBeUndefined();
    });
});

describe('the Presidents table', () => {
    const open = async (url = '/fifa?view=presidents&conf=OFC') => {
        show(url);
        return tableNamed(/^The presidents/);
    };

    it('should cycle the sort of the column President, A to Z and Z to A, and fall back to the default order', async () => {
        const table = await open();
        const names = presidentsOf('OFC').map(one => one.name);
        const defaultOrder = namesOf(table);
        expect(defaultOrder).toHaveLength(names.length);
        const button = sortButton(table, 'President');
        fireEvent.click(button);
        await waitFor(() => expect(button.closest('th')).toHaveAttribute('aria-sort', 'ascending'));
        expect(namesOf(table)).toEqual([...names].sort(byName));
        fireEvent.click(button);
        await waitFor(() => expect(button.closest('th')).toHaveAttribute('aria-sort', 'descending'));
        expect(namesOf(table)).toEqual([...names].sort(byName).reverse());
        fireEvent.click(button);
        await waitFor(() => expect(button.closest('th')).toHaveAttribute('aria-sort', 'none'));
        expect(namesOf(table)).toEqual(defaultOrder);
    });

    it('should sort by the position, the articles, the latest mention and the year, with the rows that have none last', async () => {
        const table = await open('/fifa?view=presidents&conf=UEFA');
        fireEvent.click(sortButton(table, 'Latest mention'));
        fireEvent.click(sortButton(table, 'Latest mention'));
        await waitFor(() => expect(sortButton(table, 'Latest mention').closest('th')).toHaveAttribute('aria-sort', 'descending'));
        const dates = rowsOf(table).map(row => row.querySelectorAll('td')[5].textContent);
        const withDate = dates.filter(text => text !== '—').map(text => text.slice(0, 10));
        // the newest first, and every row with no mention after the last one that has one
        expect(withDate.length).toBeGreaterThan(0);
        expect(withDate).toEqual([...withDate].sort().reverse());
        expect(dates.slice(withDate.length).every(text => text === '—')).toBe(true);
        fireEvent.click(sortButton(table, 'Since'));
        await waitFor(() => expect(params().sort).toBe('since'));
    });

    it('should filter by the source with the filter of its column, and combine it with the column Mentions', async () => {
        const table = await open('/fifa?view=presidents&conf=UEFA');
        const all = presidentsOf('UEFA');
        choose(table, 'Source', 'Wikidata');
        await waitFor(() => expect(rowsOf(table)).toHaveLength(all.filter(one => one.source === 'wikidata').length));
        expect(params().f_source).toBe('wikidata');
        choose(table, 'Articles, 30 days', 'With mentions');
        await waitFor(() => expect(rowsOf(table)).toHaveLength(all.filter(one => one.source === 'wikidata' && one.articles_30d > 0).length));
        // the total is the presidents there are, not the ones of the confederation of the page
        expect(countOf()).toBe(`${all.filter(one => one.source === 'wikidata' && one.articles_30d > 0).length} of 211 presidents`);
    });
});

describe('on a phone', () => {
    const desktop = window.matchMedia;
    beforeEach(() => {
        window.matchMedia = query => ({
            matches: query === '(max-width: 767px)', media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
        });
    });
    afterEach(() => { window.matchMedia = desktop; });

    it('should show the associations as cards, sort them with a "Sort by" select and filter them in a sheet', async () => {
        show('/fifa?view=list&conf=OFC');
        const list = await screen.findByRole('list', {name: '11 associations'});
        expect(screen.queryByRole('table')).toBeNull();
        const select = screen.getByRole('combobox', {name: 'Sort by'});
        expect(select).toHaveValue('');
        expect([...select.options].map(option => option.textContent).slice(0, 3)).toEqual(['Default order', 'Association, ascending', 'Association, descending']);
        fireEvent.change(select, {target: {value: 'name:desc'}});
        await waitFor(() => expect(params()).toMatchObject({sort: 'name', dir: 'desc'}));
        const expected = inConfederation('OFC').map(member => member.name).sort(byName).reverse();
        await waitFor(() => expect(within(screen.getByRole('list', {name: '11 associations'})).getAllByRole('button').map(button => button.getAttribute('aria-label').split(',')[0])).toEqual(expected));
        expect(list).toBeInTheDocument();

        // the filters of the columns open in a sheet
        fireEvent.click(screen.getByRole('button', {name: /^Filters/}));
        const sheet = await screen.findByRole('dialog', {name: 'Filters'});
        fireEvent.click(within(sheet).getByRole('checkbox', {name: 'Unknown'}));
        await waitFor(() => expect(params().f_pos).toBe('unknown'));
        // the button of the page is behind the sheet while it is open
        expect(screen.getByRole('button', {name: /^Filters \(1\)/, hidden: true})).toBeInTheDocument();
        fireEvent.click(within(sheet).getByRole('button', {name: 'Clear filters'}));
        await waitFor(() => expect(params()).toEqual({view: 'list', conf: 'OFC'}));
    });

    it('should show the confederations as cards, and sort them by the support of a candidate through the select', async () => {
        show('/fifa?view=confederations');
        const list = await screen.findByRole('list', {name: 'Confederations'});
        expect(screen.queryByRole('table')).toBeNull();
        expect(within(list).getAllByRole('heading', {level: 3}).map(heading => heading.textContent)).toEqual([...confederationRows].sort(compareConfederations).map(item => item.code));
        fireEvent.change(screen.getByRole('combobox', {name: 'Sort by'}), {target: {value: 'support:QMOCK1:desc'}});
        await waitFor(() => expect(params()).toMatchObject({sort: 'support:QMOCK1', dir: 'desc'}));
        const supports = within(list).getAllByRole('heading', {level: 3}).map(heading => confederationRows.find(item => item.code === heading.textContent).support.QMOCK1);
        expect(supports).toEqual([...supports].sort((a, b) => b - a));
        // a card opens on its members
        fireEvent.click(within(list).getAllByRole('button', {name: 'Show the members'})[0]);
        expect(await within(list).findByRole('button', {name: /^Its sheet/})).toBeInTheDocument();
    });

    it('should show the presidents as cards with the same search, sort and filters', async () => {
        show('/fifa?view=presidents&conf=OFC');
        const list = await screen.findByRole('list', {name: 'Presidents'});
        expect(screen.queryByRole('table')).toBeNull();
        expect(within(list).getAllByRole('listitem')).toHaveLength(presidentsOf('OFC').length);
        expect(screen.getAllByRole('searchbox')).toHaveLength(1);
        fireEvent.change(screen.getByRole('combobox', {name: 'Sort by'}), {target: {value: 'name:asc'}});
        await waitFor(() => expect(params()).toMatchObject({sort: 'name'}));
        const names = within(screen.getByRole('list', {name: 'Presidents'})).getAllByRole('listitem').map(card => card.querySelector('p').textContent);
        expect(names).toEqual([...names].sort(byName));
    });
});
