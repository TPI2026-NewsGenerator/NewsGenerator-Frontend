//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-board.test.jsx
//  Description: The page "The FIFA presidency" as a whole, against the invented answers of bench/fifa/mock-data.mjs: its counters, a click on the
//               map that opens the sheet of an association, the badge Uncertain and its reason in the sheet, and what the reader chose
//               (the candidate, the filters, the view, the association) kept in the address when the view changes and after a reload
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {useEffect} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {ALL_LEVELS, COARSE_LEVELS, MOCK_SUBJECTS, answerVote, buildMock} from '../bench/fifa/mock-data.mjs';

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
// and a wait for what comes after a step is longer than the 1 s of the library
configure({asyncUtilTimeout: 10000});

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

// the address of the page, as the last render saw it
const seen = {search: ''};
const Spy = () => {
    const {search} = useLocation();
    useEffect(() => { seen.search = search; });
    return null;
};
const show = (url = '/fifa') => render(<MemoryRouter initialEntries={[url]}><Spy/><FifaBoard reader="reader"/></MemoryRouter>);
const params = () => Object.fromEntries(new URLSearchParams(seen.search));

// the votes given in a test, answered as the server would: the map and the sheets are built again with them
let given = [];
const serve = (levels = ALL_LEVELS) => {
    const mock = buildMock({levels});
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => buildMock({levels, votes: given}).association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
    api.vote.mockImplementation(async body => answerVote({levels, candidates: MOCK_SUBJECTS, given, body, by: 'reader'}));
    return mock;
};
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});

beforeEach(() => {
    given = [];
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('FifaBoard', () => {
    it('should say what the map knows, and that it is mock data', async () => {
        show();
        await mapReady();
        expect(screen.getByText('Mock data')).toBeInTheDocument();
        const counters = screen.getByText(/positions? known · .* with Uncertain signals · the rest unknown/);
        expect(counters).toHaveTextContent('13 positions known · 7 associations with Uncertain signals · the rest unknown');
        expect(screen.getByText('A public statement is not a guaranteed vote.', {exact: false})).toBeInTheDocument();
        expect(screen.getByText('211 of 211 associations match.')).toBeInTheDocument();
    });

    it('should open the sheet of an association on a click on the map, with its positions', async () => {
        show();
        await mapReady();
        fireEvent.click(screen.getByRole('button', {name: /^Brazil, BRA/}));
        const sheet = await screen.findByRole('dialog');
        expect(await within(sheet).findByText('Declared support')).toBeInTheDocument();
        expect(within(sheet).getByRole('heading', {name: 'Brazil'})).toBeInTheDocument();
        // the sheet opens on the summary, the first tab
        expect(within(sheet).getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Summary', 'Positions', 'Leadership profile', 'Notes']);
        expect(within(sheet).getByRole('tab', {name: 'Summary'})).toHaveAttribute('aria-selected', 'true');
        expect(within(sheet).getByRole('tab', {name: 'Positions'})).toBeInTheDocument();
        expect(within(sheet).getByRole('tab', {name: 'Leadership profile'})).toBeInTheDocument();
        expect(within(sheet).getByRole('tab', {name: 'Notes'})).toBeInTheDocument();
        // the sources are under the positions: no tab of sources any more
        expect(within(sheet).queryByRole('tab', {name: /Sources/})).toBeNull();
        expect(params().a).toBeTruthy();
        expect(api.association).toHaveBeenCalledWith(params().a);
    });

    it('should show the badge Uncertain and its reason on a sentence that is not a position, in the sheet', async () => {
        show('/fifa');
        await mapReady();
        // Türkiye has signals on the election, none that is a position
        fireEvent.click(screen.getByRole('button', {name: /^Turkey, TUR.*Uncertain/}));
        const sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        await within(sheet).findAllByText('No known position');
        // the sentences are under the position of the candidate, in the group Uncertain
        const group = await within(sheet).findByRole('group', {name: 'Uncertain sentences on Mock candidate A'});
        expect(within(group).getByRole('heading', {level: 4}).firstElementChild).toHaveClass('border-dashed');
        expect(within(sheet).getAllByText(/Why Uncertain:/).length).toBe(2);
        expect(within(sheet).getByText('The speaker does not bind the association.')).toBeInTheDocument();
        expect(within(sheet).getByText('A rumour or an unconfirmed report.')).toBeInTheDocument();
        // the notice stays at the foot of the tab Notes
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
        expect(await within(sheet).findByText('A public statement is not a guaranteed vote.')).toBeInTheDocument();
    });

    it('should keep the candidate, the filters and the association when the view changes', async () => {
        show('/fifa?c=QMOCK1&conf=AFC&level=indicated&q=in');
        await mapReady();
        fireEvent.click(screen.getByRole('button', {name: /^India, IND/}));
        await screen.findByRole('dialog');
        const kept = {c: 'QMOCK1', conf: 'AFC', level: 'indicated', q: 'in'};
        expect(params()).toMatchObject(kept);
        fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'});
        for (const view of ['List', 'Timeline', 'Confederations', 'Presidents', 'Map & list', 'Map']) {
            fireEvent.mouseDown(screen.getByRole('tab', {name: view}));
            expect(params()).toMatchObject(kept);
        }
        expect(params().view).toBeUndefined();
        expect(screen.getByRole('combobox', {name: 'Candidate'})).toHaveValue('QMOCK1');
        expect(screen.getByRole('combobox', {name: 'Confederation'})).toHaveValue('AFC');
        expect(screen.getByRole('combobox', {name: 'Position level'})).toHaveValue('indicated');
        expect(screen.getByRole('searchbox')).toHaveValue('in');
    });

    it('should read the retired "Source coverage", or a candidate nobody lists, in the address as All candidates, with no error', async () => {
        const first = show('/fifa');
        await mapReady();
        const overview = screen.getByText(/positions? known · .* with Uncertain signals/).textContent;
        first.unmount();
        for (const address of ['/fifa?c=coverage', '/fifa?c=QNOBODY']) {
            const view = show(address);
            await mapReady();
            const select = screen.getByRole('combobox', {name: 'Candidate'});
            expect(select).toHaveValue('all');
            expect([...select.options].map(option => option.textContent)).toEqual(['All candidates', 'Mock candidate A', 'Mock candidate B', 'Mock candidate C · Reading the news…']);
            // the overview: the same counters and the legend of the candidates; the page does not count it as a filter chosen (no "Reset")
            expect(screen.getByText(/positions? known · .* with Uncertain signals/)).toHaveTextContent(overview);
            expect(screen.getByRole('list', {name: 'Legend'})).toHaveTextContent('Mock candidate A');
            expect(screen.queryByRole('button', {name: 'Reset'})).toBeNull();
            expect(screen.queryByRole('alert')).toBeNull();
            view.unmount();
        }
    });

    it('should come back as it was after a reload, from the address alone', async () => {
        const first = show('/fifa?c=QMOCK2&conf=UEFA&view=list&a=Q47508');
        await mapReady().catch(() => null);
        const address = `/fifa${seen.search}`;
        first.unmount();
        show(address);
        expect(await screen.findByRole('combobox', {name: 'Candidate'})).toHaveValue('QMOCK2');
        expect(screen.getByRole('combobox', {name: 'Confederation'})).toHaveValue('UEFA');
        expect(screen.getByRole('tab', {name: 'List'})).toHaveAttribute('aria-selected', 'true');
    });

    it('should list the associations in a table, the accessible twin of the map, and follow the filters', async () => {
        show('/fifa?view=list&conf=CONMEBOL');
        const table = await screen.findByRole('table', {name: /^The associations/});
        const body = () => within(table).getAllByRole('row').slice(1);
        expect(body()).toHaveLength(10);
        expect(screen.getAllByRole('status').find(one => /of 211 associations/.test(one.textContent))).toHaveTextContent('10 of 211 associations');
        // the positions known first
        expect(within(body()[0]).getAllByRole('button')[0]).toHaveAccessibleName(/Peru|Brazil/);
        fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'chile'}});
        await waitFor(() => expect(body()).toHaveLength(1));
        expect(screen.getAllByRole('status').find(one => /of 211 associations/.test(one.textContent))).toHaveTextContent('1 of 211 associations');
        expect(params().q).toBe('chile');
        fireEvent.click(screen.getByRole('button', {name: 'Reset'}));
        expect(params()).toEqual({view: 'list'});
        await waitFor(() => expect(body()).toHaveLength(211));
    });

    it('should colour the map by the candidate chosen and filter by position level', async () => {
        show('/fifa?c=QMOCK1&level=uncertain');
        await mapReady();
        const shown = [...document.querySelectorAll('[data-qid]:not([data-dim])')];
        expect(shown.length).toBe(5);
        expect(shown.every(shape => shape.dataset.kind === 'uncertain')).toBe(true);
    });

    it('should draw its legend and filters from the levels the server enables', async () => {
        serve(COARSE_LEVELS);
        show('/fifa?c=QMOCK1');
        await mapReady();
        const legend = screen.getByRole('list', {name: 'Legend'});
        expect(within(legend).getByText('Support')).toBeInTheDocument();
        expect(within(legend).queryByText('Declared support')).toBeNull();
        expect(within(legend).queryByText('Probable support')).toBeNull();
        // a position the levels do not hold is unknown: Norway, a probable opposition, is grey
        expect(screen.getByRole('button', {name: /^Norway, NOR.*No known position/})).toBeInTheDocument();
    });

    it('should say why the map is not there when the server does not answer, and ask again', async () => {
        api.map.mockResolvedValueOnce({error: 'The server answered 502: it may be restarting or busy. Try again in a moment.', status: 502});
        show();
        expect(await screen.findByText('The map did not load')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Try again'}));
        await mapReady();
        await waitFor(() => expect(api.map).toHaveBeenCalledTimes(2));
    });

    it('should list the confederations with their member associations, saying they do not vote', async () => {
        show('/fifa?view=confederations');
        const table = await screen.findByRole('table', {name: /^The confederations/});
        expect(within(table).getAllByRole('row').slice(1)).toHaveLength(6);
        expect(screen.getByText(/Confederations do not vote/)).toBeInTheDocument();
        // a row opens to list its members, and leads to the map of the confederation
        fireEvent.click(within(table).getByRole('button', {name: /^AFC/}));
        fireEvent.click(await within(table).findByRole('button', {name: 'Show AFC on the map'}));
        expect(params()).toMatchObject({conf: 'AFC'});
        expect(params().view).toBeUndefined();
    });

    it('should list the presidents with the association and its position', async () => {
        show('/fifa?view=presidents');
        const table = await screen.findByRole('table', {name: /^The presidents/});
        expect(within(table).getAllByRole('button', {name: /Open the sheet/}).length).toBeGreaterThan(100);
        expect(within(table).getAllByText(/Declared support/).length).toBeGreaterThan(0);
    });
});
