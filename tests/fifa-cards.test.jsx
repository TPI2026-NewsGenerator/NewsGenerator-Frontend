//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-cards.test.jsx
//  Description: The cards of the candidates in the tab Positions of the sheet (the tab the sheet opens on): in the order of what they hold (a position first, declared before probable,
//               then the Uncertain signals only; the candidate chosen in the list of the page first), the candidates the news say nothing of left out (no card, no chip) except the
//               one chosen in the list, and the chips above them that choose which card is shown ("All" and one chip for each candidate with a card, one choice, local to the sheet,
//               the candidate chosen in the list by default, none when there is a single card)
//
//  The associations, the candidates and the positions are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {MOCK_NEWS_SUBJECTS, MOCK_SUBJECTS, buildMock} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const [A] = MOCK_SUBJECTS;
const FIVE = [...MOCK_SUBJECTS, ...MOCK_NEWS_SUBJECTS];

let candidates = MOCK_SUBJECTS;
const serve = () => {
    const mock = buildMock({candidates});
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => buildMock({candidates}).association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
};
const seen = {search: ''};
const Spy = () => {
    const {search} = useLocation();
    seen.search = search;
    return null;
};
const show = (url = '/fifa') => render(<MemoryRouter initialEntries={[url]}><Spy/><FifaBoard reader="reader"/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
const openSheet = async (fifa) => {
    await mapReady();
    fireEvent.click(shape(fifa));
    const sheet = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
    await within(sheet).findAllByRole('region', {name: /^Mock candidate [A-E]$/});
    return sheet;
};
// the cards of the sheet, in the order they are in
const cards = (sheet) => within(sheet).queryAllByRole('region', {name: /^Mock candidate [A-E]$/}).map(card => card.getAttribute('aria-label').replace('Mock candidate ', ''));
const bar = (sheet) => within(sheet).queryByRole('radiogroup', {name: 'Candidate shown'});
const chips = (sheet) => within(bar(sheet)).getAllByRole('radio').map(chip => chip.closest('label').textContent);

beforeEach(() => {
    candidates = MOCK_SUBJECTS;
    seen.search = '';
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the order of the cards', () => {
    it('should put the position first, and leave out the candidates the news say nothing of (Turkey: Uncertain on A, nothing on B and C)', async () => {
        show();
        const sheet = await openSheet('TUR');
        expect(cards(sheet)).toEqual(['A']);
    });

    it('should put a candidate with a position before the ones with Uncertain signals only, whatever its colour (China: a declared support for D, Uncertain on A, C and E, nothing on B)', async () => {
        candidates = FIVE;
        serve();
        show();
        const sheet = await openSheet('CHN');
        // D (colour 4) is first, the others keep their order, B is left out
        expect(cards(sheet)).toEqual(['D', 'A', 'C', 'E']);
    });

    it('should put declared before probable and a position before the Uncertain ones (Spain: declared on A, probable on B, Uncertain on D and E; Thailand: probable on D)', async () => {
        candidates = FIVE;
        serve();
        show();
        const spain = await openSheet('ESP');
        expect(cards(spain)).toEqual(['A', 'B', 'D', 'E']);
        fireEvent.keyDown(spain, {key: 'Escape'});
        await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const thailand = await openSheet('THA');
        expect(cards(thailand)).toEqual(['D', 'A', 'B', 'C']);
    });

    it('should count a position a reader set (France: a vote against B, a reading of the news that was probable): the one card, A and C hold nothing', async () => {
        show();
        const sheet = await openSheet('FRA');
        // B holds a vote against (a position); A and C hold nothing, so they have no card
        expect(cards(sheet)).toEqual(['B']);
    });

    it('should keep the candidate chosen in the list of the page first, as before, even when the news say nothing of it', async () => {
        show('/fifa?c=QMOCK3');
        const sheet = await openSheet('FRA');
        // C holds nothing on France and is chosen: its card is the one shown, then B (A is left out)
        expect(cards(sheet)).toEqual(['C']);
        fireEvent.click(within(sheet).getByRole('radio', {name: 'All'}));
        expect(cards(sheet)).toEqual(['C', 'B']);
    });

    it('should follow what the cards hold after a reading of the sheet (the order is the one of the positions of the sheet)', async () => {
        show();
        const sheet = await openSheet('NGA');
        // Nigeria: a declared support for A, the others hold nothing
        expect(cards(sheet)).toEqual(['A']);
    });
});

describe('the candidates the news say nothing of', () => {
    it('should have no card and no chip, and the sheet does not say there is nothing (Spain: A and B, none on C)', async () => {
        show();
        const sheet = await openSheet('ESP');
        expect(cards(sheet)).toEqual(['A', 'B']);
        expect(chips(sheet)).toEqual(['All', 'Mock candidate A', 'Mock candidate B']);
        expect(within(sheet).queryByRole('region', {name: 'Mock candidate C'})).toBeNull();
        expect(within(sheet).queryByRole('radio', {name: 'Mock candidate C'})).toBeNull();
        expect(within(sheet).queryByText('No news name this association with a candidate yet.')).toBeNull();
    });

    it('should keep the card of the candidate chosen in the list, with the buttons of a vote, and its chip', async () => {
        show('/fifa?c=QMOCK3');
        const sheet = await openSheet('ESP');
        const card = within(sheet).getByRole('region', {name: 'Mock candidate C'});
        expect(within(card).getByRole('button', {name: /^Confirm/})).toBeInTheDocument();
        expect(within(card).getByRole('button', {name: 'Or change the position'})).toBeInTheDocument();
        expect(within(bar(sheet)).getByRole('radio', {name: 'Mock candidate C'})).toBeChecked();
        expect(chips(sheet)).toEqual(['All', 'Mock candidate C', 'Mock candidate A', 'Mock candidate B']);
    });

    it('should say so, and keep the block with which the reader chooses a candidate, when no candidate has news on the association (the United States)', async () => {
        show();
        await mapReady();
        fireEvent.click(shape('USA'));
        const sheet = await screen.findByRole('dialog');
        expect(await within(sheet).findByText('No news name this association with a candidate yet.')).toBeInTheDocument();
        expect(cards(sheet)).toEqual([]);
        expect(bar(sheet)).toBeNull();
        expect(within(sheet).getByRole('region', {name: /^Which candidate does .* lean towards\?$/})).toBeInTheDocument();
    });

    it('should show the card of the candidate chosen in the list when nothing is known on the association, and not say there is nothing (the United States, A chosen)', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        fireEvent.click(shape('USA'));
        const sheet = await screen.findByRole('dialog');
        const card = await within(sheet).findByRole('region', {name: 'Mock candidate A'});
        expect(within(card).getByRole('button', {name: 'Or change the position'})).toBeInTheDocument();
        expect(cards(sheet)).toEqual(['A']);
        expect(within(sheet).queryByText('No news name this association with a candidate yet.')).toBeNull();
    });

    it('should show every card, and a chip for each, when the news hold something on every candidate (Albania)', async () => {
        show();
        const sheet = await openSheet('ALB');
        expect(cards(sheet)).toEqual(['A', 'B', 'C']);
        expect(chips(sheet)).toEqual(['All', 'Mock candidate A', 'Mock candidate B', 'Mock candidate C']);
        expect(within(sheet).queryByText('No news name this association with a candidate yet.')).toBeNull();
    });
});

describe('the chips above the cards', () => {
    it('should be "All" and a chip for each candidate with a card and its colour, in the order of the cards, one choice, All chosen', async () => {
        candidates = FIVE;
        serve();
        show();
        const sheet = await openSheet('CHN');
        expect(chips(sheet)).toEqual(['All', 'Mock candidate D', 'Mock candidate A', 'Mock candidate C', 'Mock candidate E']);
        const radios = within(bar(sheet)).getAllByRole('radio');
        expect(radios[0]).toBeChecked();
        expect(radios.filter(radio => radio.checked)).toHaveLength(1);
        // one group for the keyboard: the same name, and each chip is a real radio button
        expect(new Set(radios.map(radio => radio.name)).size).toBe(1);
        expect(radios.every(radio => radio.type === 'radio')).toBe(true);
        // a colour mark beside each name, none beside All
        const chipsOf = [...bar(sheet).querySelectorAll('label')];
        expect(chipsOf[0].querySelector('[aria-hidden]')).toBeNull();
        expect(chipsOf[1].querySelector('[aria-hidden]')).toHaveStyle({background: 'var(--cand-4)'});
        // every card is shown
        expect(cards(sheet)).toHaveLength(4);
    });

    it('should show only the card of the candidate picked, and every card again with All', async () => {
        show();
        // India: the news hold something on A, B and C
        const sheet = await openSheet('IND');
        fireEvent.click(within(bar(sheet)).getByRole('radio', {name: 'Mock candidate B'}));
        expect(cards(sheet)).toEqual(['B']);
        expect(within(bar(sheet)).getByRole('radio', {name: 'Mock candidate B'})).toBeChecked();
        fireEvent.click(within(bar(sheet)).getByRole('radio', {name: 'Mock candidate C'}));
        expect(cards(sheet)).toEqual(['C']);
        fireEvent.click(within(bar(sheet)).getByRole('radio', {name: 'All'}));
        expect(cards(sheet)).toEqual(['A', 'B', 'C']);
        expect(within(bar(sheet)).getByRole('radio', {name: 'All'})).toBeChecked();
    });

    it('should show the whole card of a candidate: its position, its sentences, its sources, its timeline', async () => {
        // Mexico holds a vote for A only: B is the candidate chosen in the list, so that there are two chips to pick between
        show('/fifa?c=QMOCK2');
        const sheet = await openSheet('MEX');
        fireEvent.click(within(bar(sheet)).getByRole('radio', {name: 'Mock candidate A'}));
        const card = within(sheet).getByRole('region', {name: 'Mock candidate A'});
        // Mexico: a vote for A, with a source the page says
        expect(within(card).getByText('Set by a reader')).toBeInTheDocument();
        expect(within(card).getByRole('group', {name: 'Sources joined to the choices on Mock candidate A'})).toBeInTheDocument();
        fireEvent.click(within(bar(sheet)).getByRole('radio', {name: 'Mock candidate B'}));
        expect(within(sheet).queryByRole('group', {name: 'Sources joined to the choices on Mock candidate A'})).toBeNull();
    });

    it('should choose the candidate chosen in the list of the page by default, and leave the page\'s filter alone when another is picked', async () => {
        show('/fifa?c=QMOCK2');
        // Nigeria holds A only: B is the candidate chosen, it has its card all the same
        const sheet = await openSheet('NGA');
        expect(within(bar(sheet)).getByRole('radio', {name: 'Mock candidate B'})).toBeChecked();
        expect(cards(sheet)).toEqual(['B']);
        // another chip: only the sheet changes, not the page (its select, its address)
        fireEvent.click(within(bar(sheet)).getByRole('radio', {name: 'Mock candidate A'}));
        expect(cards(sheet)).toEqual(['A']);
        expect(screen.getByRole('combobox', {name: 'Candidate', hidden: true})).toHaveValue('QMOCK2');
        expect(new URLSearchParams(seen.search).get('c')).toBe('QMOCK2');
        fireEvent.click(within(bar(sheet)).getByRole('radio', {name: 'All'}));
        expect(cards(sheet)).toEqual(['B', 'A']);
        expect(new URLSearchParams(seen.search).get('c')).toBe('QMOCK2');
    });

    it('should start again with the page\'s choice for the next association (the choice of the chips is the sheet\'s own)', async () => {
        show();
        const first = await openSheet('IND');
        fireEvent.click(within(bar(first)).getByRole('radio', {name: 'Mock candidate C'}));
        expect(cards(first)).toEqual(['C']);
        fireEvent.keyDown(first, {key: 'Escape'});
        await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const second = await openSheet('ESP');
        expect(within(bar(second)).getByRole('radio', {name: 'All'})).toBeChecked();
        expect(cards(second)).toEqual(['A', 'B']);
    });

    it('should not be there when there is a single candidate, and the card is shown', async () => {
        candidates = [A];
        serve();
        show();
        const sheet = await openSheet('NGA');
        expect(bar(sheet)).toBeNull();
        expect(cards(sheet)).toEqual(['A']);
    });

    it('should not be there either when the news hold something on a single candidate: one card, no chip (Nigeria)', async () => {
        show();
        const sheet = await openSheet('NGA');
        expect(bar(sheet)).toBeNull();
        expect(cards(sheet)).toEqual(['A']);
    });

    it('should wrap on a phone and be reachable with the keyboard: a group of radio buttons, hidden only visually', async () => {
        show();
        const sheet = await openSheet('IND');
        expect(bar(sheet)).toHaveClass('flex-wrap');
        for (const radio of within(bar(sheet)).getAllByRole('radio')) {
            expect(radio).toHaveClass('sr-only');
            expect(radio).not.toHaveAttribute('tabindex', '-1');
        }
        // it is above the first card and under the block of the choice of a candidate
        const block = within(sheet).getByRole('region', {name: /^Which candidate does .* lean towards\?$/});
        expect(block.compareDocumentPosition(bar(sheet)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(bar(sheet).compareDocumentPosition(within(sheet).getByRole('region', {name: 'Mock candidate A'})) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});
