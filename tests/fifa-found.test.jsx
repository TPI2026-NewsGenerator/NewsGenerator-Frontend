//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-found.test.jsx
//  Description: The list of candidates is not fixed: the server looks in the news once a day for persons named as candidates and adds them by itself, so it can
//               grow between two visits. The map (and its subjects) is asked again when the page is focused and every five minutes, a candidate in the
//               address that the list does not have reads as All candidates (and is a candidate again when the list gets it), a candidate found in the news
//               carries the tag "Found in the news" (with the words of the news) in the list of candidates of the dialog only (not in the select, the legend nor the sheet), and
//               "Reading the news…" while its news are being read
//
//  The candidates, the news and the answers are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {useEffect} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {ALL_LEVELS, MOCK_NEWS_SUBJECTS, MOCK_SUBJECTS, answerVote, buildMock} from '../bench/fifa/mock-data.mjs';
import {FOUND_TAG, READING_TAG, foundLine, isFound, isReading, optionLabel} from '@/features/fifa/candidates.js';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn(), addSubject: vi.fn(), setStatus: vi.fn(), people: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));
// the map is asked again every 5 minutes, and when the page is focused unless it was asked less than 30 s ago: here 700 ms and 500 ms, to see it happen
vi.mock('@/features/fifa/refreshTiming.js', () => ({REFRESH_EVERY_MS: 700, REFRESH_MIN_GAP_MS: 500}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const [A, B, C] = MOCK_SUBJECTS;
const [D, E] = MOCK_NEWS_SUBJECTS;
const SMALL = [A, B, C];
const WITH_D = [A, B, C, D];
const GROWN = [A, B, C, D, E];

// what the server answers to the map, by the list of candidates it has now; the votes given in a test are in it
let given = [];
let candidates = SMALL;
const serve = () => {
    api.map.mockImplementation(async () => buildMock({candidates, votes: given}).map);
    api.association.mockImplementation(async qid => buildMock({candidates, votes: given}).association(qid));
    api.presidents.mockResolvedValue(buildMock().presidents);
    api.confederations.mockResolvedValue(buildMock().confederations);
    api.vote.mockImplementation(async body => answerVote({levels: ALL_LEVELS, candidates, given, body, by: 'reader'}));
};
const seen = {search: ''};
const Spy = () => {
    const {search} = useLocation();
    useEffect(() => { seen.search = search; });
    return null;
};
const params = () => Object.fromEntries(new URLSearchParams(seen.search));
const show = (url = '/fifa') => render(<MemoryRouter initialEntries={[url]}><Spy/><FifaBoard reader="reader"/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet or a dialog is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
const qidOf = (fifa) => buildMock().map.members.find(member => member.fifa === fifa).qid;
const select = () => screen.getByRole('combobox', {name: 'Candidate', hidden: true});
const optionsOf = () => [...select().options].map(option => option.textContent);
const wait = (ms) => new Promise(done => setTimeout(done, ms));
// the visibility of the tab, as the page reads it
const visibility = (state) => Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => state});
// the clock of the page: the time since the last ask is moved by hand, the timer is the real one
let clock = 0;
const later = (ms) => { clock += ms; };
// the number of times the map was asked, and a focus of the window (what the page does synchronously)
const asked = () => api.map.mock.calls.length;
const focus = () => window.dispatchEvent(new Event('focus'));

beforeEach(() => {
    clock = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    given = [];
    candidates = SMALL;
    seen.search = '';
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});
afterEach(() => {
    delete document.visibilityState;
    vi.mocked(Date.now).mockRestore();
});

describe('the words', () => {
    it('should tag a candidate found in the news, and one whose news are being read', () => {
        expect([isFound(A), isFound(B), isFound(D), isFound(E)]).toEqual([false, false, true, true]);
        expect([isReading(A), isReading(C), isReading(D), isReading(E)]).toEqual([false, true, false, true]);
        expect(optionLabel(A)).toBe('Mock candidate A');
        // a candidate found in the news is not told so in the select (the user's choice): only the state of its reading is
        expect(optionLabel(D)).toBe('Mock candidate D');
        expect(optionLabel(E)).toBe(`Mock candidate E · ${READING_TAG}`);
        expect(optionLabel({...C, status: 'withdrawn'})).toBe(`Mock candidate C (withdrawn) · ${READING_TAG}`);
        expect(FOUND_TAG).toBe('Found in the news');
        expect(READING_TAG).toBe('Reading the news…');
    });

    it('should say what the news said: how many media and articles, and their words', () => {
        expect(foundLine(D)).toBe('Named as a candidate in 4 media (7 articles): “[Mock] The federation will nominate Mock Tashima for the presidency of FIFA.”');
        expect(foundLine({...D, found: {...D.found, media: 1, articles: 1}})).toBe('Named as a candidate in 1 medium (1 article): “[Mock] The federation will nominate Mock Tashima for the presidency of FIFA.”');
        // nothing to say for a candidate the news did not bring, or when the server sent nothing
        expect(foundLine(A)).toBeNull();
        expect(foundLine({...D, found: null})).toBeNull();
        expect(foundLine({...D, found: {status: 'declared', articles: 3, media: 2, quote: '', at: D.found.at}})).toBe('Named as a candidate in 2 media (3 articles)');
    });

    it('should be in the mock: origin on every candidate, found for the ones of the news, one being read', () => {
        expect(SMALL.map(one => one.origin)).toEqual(['seed', 'reader', 'reader']);
        expect(SMALL.every(one => one.found === null)).toBe(true);
        expect(D).toMatchObject({origin: 'news', state: 'ready', found: {status: 'declared', articles: 7, media: 4}});
        expect(D.found.quote).toMatch(/^\[Mock\]/);
        expect(D.found.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(E).toMatchObject({origin: 'news', state: 'computing', found: {status: 'rumoured'}});
        // the map carries them, and the candidate of the news has positions
        const map = buildMock({candidates: GROWN}).map;
        expect(map.subjects.map(one => [one.name, one.origin, one.state])).toEqual([
            ['Mock candidate A', 'seed', 'ready'], ['Mock candidate B', 'reader', 'ready'], ['Mock candidate C', 'reader', 'computing'],
            ['Mock candidate D', 'news', 'ready'], ['Mock candidate E', 'news', 'computing'],
        ]);
        expect(map.subjects[3].positions_known).toBe(2);
        expect(map.subjects[4].positions_known).toBe(0);
        // a map without them has no position on them
        expect(buildMock().map.members.find(member => member.fifa === 'CHN').positions.QMOCK4).toBeUndefined();
    });
});

describe('the tags', () => {
    it('should name a candidate being read in the select, and not say that one was found in the news (the user did not want it there)', async () => {
        candidates = GROWN;
        show();
        await mapReady();
        expect(optionsOf()).toEqual([
            'All candidates', 'Mock candidate A', 'Mock candidate B', `Mock candidate C · ${READING_TAG}`,
            'Mock candidate D', `Mock candidate E · ${READING_TAG}`,
        ]);
        // nothing to add for a reader: a candidate found needs no "add" click, it is a choice like the others
        fireEvent.change(select(), {target: {value: 'QMOCK4'}});
        await waitFor(() => expect(params().c).toBe('QMOCK4'));
    });

    it('should tag them in the list of candidates of the dialog, with the words of the news, and say that the news are being read', async () => {
        candidates = GROWN;
        show();
        await mapReady();
        fireEvent.click(screen.getByRole('button', {name: 'Add a candidate'}));
        const dialog = await screen.findByRole('dialog');
        const list = within(dialog).getByRole('heading', {name: 'List of candidates'}).closest('section');
        const rowOf = (name) => within(list).getByText(name, {selector: 'span'}).closest('li');
        const found = rowOf('Mock candidate D');
        const badge = within(found).getByText(FOUND_TAG);
        expect(badge).toHaveAttribute('title', foundLine(D));
        expect(found).toHaveTextContent(foundLine(D));
        expect(within(found).queryByText(READING_TAG)).toBeNull();
        // one found and being read
        const reading = rowOf('Mock candidate E');
        expect(within(reading).getByText(FOUND_TAG)).toBeInTheDocument();
        expect(within(reading).getByText(READING_TAG)).toBeInTheDocument();
        // one a reader added, being read: no tag of the news
        const added = rowOf('Mock candidate C');
        expect(within(added).queryByText(FOUND_TAG)).toBeNull();
        expect(within(added).getByText(READING_TAG)).toBeInTheDocument();
        // the president in office has neither
        expect(rowOf('Mock candidate A')).not.toHaveTextContent(/Found in the news|Reading the news/);
        // no status menu on a row, whatever the origin: a cross takes the candidate off the list
        expect(within(found).queryByRole('combobox')).toBeNull();
        expect(within(found).getByRole('button', {name: 'Remove Mock candidate D'})).toBeInTheDocument();
    });

    it('should not say in the legend of the overview that a candidate was found in the news (the user wanted it in the list of candidates only)', async () => {
        candidates = WITH_D;
        show();
        await mapReady();
        const legend = screen.getByRole('list', {name: 'Legend'});
        const item = within(legend).getByText(/Mock candidate D/).closest('li');
        expect(item).toHaveTextContent('Mock candidate D');
        expect(item).not.toHaveTextContent(/found in the news/i);
        expect(legend).not.toHaveTextContent(/found in the news/i);
    });

    it('should not say it on the card of the sheet either (only that a candidate is being read), nor give the words of the news there', async () => {
        candidates = GROWN;
        show();
        await mapReady();
        fireEvent.click(shape('CHN'));
        const sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        // the detail of a candidate is under the strip, one at a time: select D, then E
        const strip = await within(sheet).findByRole('group', {name: 'Candidates and their status'});
        fireEvent.click(within(strip).getByRole('button', {name: /^Mock candidate D( |$)/}));
        const card = await within(sheet).findByRole('region', {name: 'Mock candidate D'});
        expect(within(card).queryByText(FOUND_TAG)).toBeNull();
        expect(within(card).queryByText(foundLine(D))).toBeNull();
        expect(within(card).queryByText(READING_TAG)).toBeNull();
        // the strip does not say it either, and the card of the candidate being read says so
        expect(within(strip).queryByText(FOUND_TAG)).toBeNull();
        fireEvent.click(within(strip).getByRole('button', {name: /^Mock candidate E( |$)/}));
        const reading = within(sheet).getByRole('region', {name: 'Mock candidate E'});
        expect(within(reading).getByText(READING_TAG)).toBeInTheDocument();
        expect(within(reading).queryByText(FOUND_TAG)).toBeNull();
        expect(sheet).not.toHaveTextContent(/found in the news/i);
    });

    it('should colour the map with the candidate found in the news like any other', async () => {
        candidates = WITH_D;
        show('/fifa?c=QMOCK4');
        await mapReady();
        // China: declared support for it
        expect(shape('CHN')).toHaveAccessibleName('China, CHN, AFC: Declared support');
        expect(shape('THA')).toHaveAttribute('data-kind', 'indicated');
    });
});

describe('the map asked again', () => {
    it('should ask the map again every few minutes while the page is open, and show the candidates the server has found since', async () => {
        show();
        await mapReady();
        expect(optionsOf()).toHaveLength(4);
        // the server found a candidate in the news since
        candidates = GROWN;
        await waitFor(() => expect(optionsOf()).toHaveLength(6));
        expect(asked()).toBeGreaterThanOrEqual(2);
        expect(optionsOf()).toContain(`Mock candidate D`);
        // the page stayed as it was: the map is there, no "Reading the map…", no error
        expect(await mapReady()).toBeInTheDocument();
        expect(screen.queryByText('The map did not load')).toBeNull();
    });

    it('should ask it again when the window is focused, not more than once in the time that was set', async () => {
        show();
        await mapReady();
        candidates = WITH_D;
        // just asked: a focus does nothing
        const before = asked();
        focus();
        expect(asked()).toBe(before);
        // after the gap it asks
        later(600);
        focus();
        expect(asked()).toBe(before + 1);
        await waitFor(() => expect(optionsOf()).toContain(`Mock candidate D`));
        // and not again at once (the timer may have asked meanwhile: what a focus adds is counted from here)
        const now = asked();
        focus();
        expect(asked()).toBe(now);
    });

    it('should ask it again when the tab becomes visible again, and not while it is hidden', async () => {
        show();
        await mapReady();
        visibility('hidden');
        candidates = WITH_D;
        const before = asked();
        // hidden: neither the timer (it ticked more than once) nor a focus asks
        await wait(1000);
        later(600);
        focus();
        expect(asked()).toBe(before);
        visibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(asked()).toBe(before + 1);
        await waitFor(() => expect(optionsOf()).toContain(`Mock candidate D`));
    });

    it('should keep what it shows when the map cannot be read again, and never ask twice at once', async () => {
        show();
        await mapReady();
        let release;
        api.map.mockImplementation(() => new Promise((done) => { release = done; }));
        later(600);
        focus();
        await waitFor(() => expect(release).toBeDefined());
        const before = asked();
        // the ask is on its way: neither the timer (it ticks) nor a focus asks again
        await wait(1000);
        later(600);
        focus();
        expect(asked()).toBe(before);
        // it fails: the page stays as it was, with no message
        release({error: 'The server answered 502: it may be restarting or busy. Try again in a moment.', status: 502});
        await wait(100);
        expect(optionsOf()).toHaveLength(4);
        expect(screen.queryByText('The map did not load')).toBeNull();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(await mapReady()).toBeInTheDocument();
    });
});

describe('the candidate in the address, when the list changes', () => {
    it('should read a candidate the list does not have as All candidates, and as that candidate when the list gets it', async () => {
        show('/fifa?c=QMOCK4');
        await mapReady();
        expect(select()).toHaveValue('all');
        expect(screen.queryByRole('button', {name: 'Reset'})).toBeNull();
        // the server finds it: the address is valid now, with no click
        candidates = WITH_D;
        await waitFor(() => expect(select()).toHaveValue('QMOCK4'));
        expect(params().c).toBe('QMOCK4');
        expect(screen.getByRole('button', {name: 'Reset'})).toBeInTheDocument();
        expect(shape('CHN')).toHaveAccessibleName('China, CHN, AFC: Declared support');
    });

    it('should read a candidate the list lost (an administrator removed it) as All candidates, with no error', async () => {
        candidates = WITH_D;
        show('/fifa?c=QMOCK4');
        await mapReady();
        expect(select()).toHaveValue('QMOCK4');
        candidates = SMALL;
        await waitFor(() => expect(select()).toHaveValue('all'));
        expect(optionsOf()).toEqual(['All candidates', 'Mock candidate A', 'Mock candidate B', `Mock candidate C · ${READING_TAG}`]);
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByRole('list', {name: 'Legend'})).toHaveTextContent('Mock candidate A');
    });

    it('should keep the candidate chosen when the list grows around it', async () => {
        show('/fifa?c=QMOCK2');
        await mapReady();
        candidates = GROWN;
        await waitFor(() => expect(optionsOf()).toHaveLength(6));
        expect(select()).toHaveValue('QMOCK2');
        expect(params().c).toBe('QMOCK2');
    });
});

describe('what the reader did on the page, when the map is asked again', () => {
    const vote = async () => {
        fireEvent.click(shape('GER'));
        const sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        const card = await within(sheet).findByRole('region', {name: 'Mock candidate A'});
        fireEvent.click(within(card).getByRole('button', {name: /^Supported by /}));
    };

    it('should follow the server after the map is asked again: a vote of another reader since is not hidden by the answer to the reader\'s own', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        await vote();
        await waitFor(() => expect(shape('GER')).toHaveAccessibleName(/Support/));
        // another reader votes against, later: the server has it, the page does not know yet
        given.push(buildMock().eventFor(qidOf('GER'), 'QMOCK1', 'against', 'Mock reader 9'));
        // the map asked again replaces what the page had patched in it before (what the reader did is in the map now)
        later(1000);
        focus();
        await waitFor(() => expect(shape('GER')).toHaveAccessibleName(/Opposition/i));
    });

    it('should keep what the reader does while the map is being asked: the answer to an ask that began before the vote does not take it away', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        // the map is asked again: the answer is on its way
        let release;
        api.map.mockImplementation(() => new Promise((done) => { release = done; }));
        later(600);
        focus();
        await waitFor(() => expect(release).toBeDefined());
        // the reader votes meanwhile
        later(10);
        await vote();
        await waitFor(() => expect(shape('GER')).toHaveAccessibleName(/Support/));
        // the answer of the ask that began before the vote comes, without it: the vote stays
        release(buildMock({candidates}).map);
        await wait(150);
        expect(shape('GER')).toHaveAccessibleName(/Support/);
        expect(shape('GER')).toHaveAttribute('data-kind', 'indicated');
    });
});
