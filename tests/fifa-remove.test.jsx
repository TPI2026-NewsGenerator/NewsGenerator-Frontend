//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-remove.test.jsx
//  Description: Any reader can remove a candidate from the map (the system can be wrong: a person the news named who is no candidate), with no administrator to validate it:
//               a cross (X icon, "Remove {name}") at the right of each row of "List of candidates" in the dialog "Add a candidate" (none on the president in office, unless the
//               reader is an administrator), ONE confirmation before it is sent, the map asked again after it, and All candidates when the candidate removed was the one chosen
//
//  The candidates and the answers are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {useEffect} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {MOCK_NEWS_SUBJECTS, MOCK_SUBJECTS, buildMock} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), removeSubject: vi.fn(), setStatus: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const FIVE = [...MOCK_SUBJECTS, ...MOCK_NEWS_SUBJECTS];

// the candidates the server has, and whether the reader is an administrator
let candidates = FIVE;
const serve = ({admin = false} = {}) => {
    api.map.mockImplementation(async () => buildMock({candidates}).map);
    api.association.mockImplementation(async qid => buildMock({candidates}).association(qid));
    api.presidents.mockResolvedValue(buildMock().presidents);
    api.confederations.mockResolvedValue(buildMock().confederations);
    // what the server does: 204 for any reader, 403 for the president in office (the seed, or the status incumbent) unless an administrator, 404 unknown
    api.removeSubject.mockImplementation(async (qid) => {
        const found = candidates.find(one => one.qid === qid);
        if (!found) return {error: 'Unknown candidate.', status: 404};
        if ((found.origin === 'seed' || found.status === 'incumbent') && !admin) return {error: 'Only an administrator can remove the president in office.', status: 403};
        candidates = candidates.filter(one => one.qid !== qid);
        return null;
    });
};
const seen = {search: ''};
const Spy = () => {
    const {search} = useLocation();
    useEffect(() => { seen.search = search; });
    return null;
};
const params = () => Object.fromEntries(new URLSearchParams(seen.search));
const show = (url = '/fifa', props = {}) => render(<MemoryRouter initialEntries={[url]}><Spy/><FifaBoard reader="reader" {...props}/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
const select = () => screen.getByRole('combobox', {name: 'Candidate', hidden: true});
const optionsOf = () => [...select().options].map(option => option.textContent);
// the dialog "Add a candidate", and the list "List of candidates" in it
const openList = async () => {
    await mapReady();
    fireEvent.click(screen.getByRole('button', {name: 'Add a candidate'}));
    const dialog = await screen.findByRole('dialog');
    return {dialog, list: within(dialog).getByRole('heading', {name: 'List of candidates'}).closest('section')};
};
const rowOf = (list, name) => within(list).getByText(name, {selector: 'span'}).closest('li');
const removeButton = (list, name) => within(list).queryByRole('button', {name: `Remove ${name}`});
const confirmation = (list, name) => within(list).queryByRole('group', {name: `Remove ${name} from the map?`});
const wait = (ms) => new Promise(done => setTimeout(done, ms));

beforeEach(() => {
    candidates = FIVE;
    seen.search = '';
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the mock: what goes with a candidate that is removed', () => {
    it('should take its positions, its votes and the sources joined to them away: nothing is read for a candidate that is not on the map', () => {
        const full = buildMock({candidates: MOCK_SUBJECTS});
        const without = buildMock({candidates: [MOCK_SUBJECTS[0], MOCK_SUBJECTS[2]]});
        const member = (mock, fifa) => mock.map.members.find(one => one.fifa === fifa);
        // France: a vote against B, with a source the AI could not confirm
        expect(full.association(member(full, 'FRA').qid).votes.some(vote => vote.subject_qid === 'QMOCK2')).toBe(true);
        expect(full.association(member(full, 'FRA').qid).sources.some(source => source.subject_qid === 'QMOCK2')).toBe(true);
        const sheet = without.association(member(without, 'FRA').qid);
        expect(sheet.votes.some(vote => vote.subject_qid === 'QMOCK2')).toBe(false);
        expect(sheet.sources.some(source => source.subject_qid === 'QMOCK2')).toBe(false);
        expect(sheet.positions.QMOCK2).toBeUndefined();
        expect(sheet.signals.some(signal => signal.subject_qid === 'QMOCK2')).toBe(false);
        // the others keep theirs (Mexico: a vote for A with a source)
        expect(without.association(member(without, 'MEX').qid).sources).toHaveLength(1);
        expect(without.map.subjects.map(one => one.qid)).toEqual(['QMOCK1', 'QMOCK3']);
    });
});

describe('the cross "Remove"', () => {
    it('should be on each candidate but the president in office (the seed)', async () => {
        show();
        const {list} = await openList();
        for (const name of ['Mock candidate B', 'Mock candidate C', 'Mock candidate D', 'Mock candidate E']) expect(removeButton(list, name)).toBeInTheDocument();
        expect(removeButton(list, 'Mock candidate A')).toBeNull();
        expect(within(rowOf(list, 'Mock candidate A')).queryByRole('button', {name: /^Remove/})).toBeNull();
        // no status menu on any row any more
        expect(within(list).queryAllByRole('combobox')).toEqual([]);
    });

    it('should be a cross at the right of the row, an icon button with the name of the candidate, a pointer cursor and a visible focus', async () => {
        show();
        const {list} = await openList();
        const row = rowOf(list, 'Mock candidate B');
        const cross = removeButton(list, 'Mock candidate B');
        // the text of the old button is gone: an icon only (an svg), named for screen readers and by its tooltip
        expect(cross.textContent).toBe('');
        expect(cross.querySelector('svg')).not.toBeNull();
        expect(cross).toHaveAttribute('title', 'Remove Mock candidate B');
        expect(cross).toHaveClass('cursor-pointer');
        expect(cross.className).toMatch(/focus-visible:outline/);
        // at the right of the name: the last thing of the row's line, after the name (the confirmation is a block under it)
        const line = [...row.children].filter(child => child.getAttribute('role') !== 'group');
        expect(line[0]).toContainElement(within(row).getByText('Mock candidate B', {selector: 'span'}));
        expect(line.at(-1)).toBe(cross);
        expect(within(list).queryByRole('button', {name: 'Remove'})).toBeNull();
        // the reader can reach it with the keyboard
        cross.focus();
        expect(cross).toHaveFocus();
    });

    it('should not be on a candidate whose status is incumbent either (only an administrator removes the president in office)', async () => {
        candidates = FIVE.map(one => one.qid === 'QMOCK2' ? {...one, status: 'incumbent'} : one);
        serve();
        show();
        const {list} = await openList();
        expect(removeButton(list, 'Mock candidate B')).toBeNull();
        expect(removeButton(list, 'Mock candidate C')).toBeInTheDocument();
    });

    it('should be on the president in office too when the reader is an administrator', async () => {
        serve({admin: true});
        show('/fifa', {admin: true});
        const {list} = await openList();
        expect(removeButton(list, 'Mock candidate A')).toBeInTheDocument();
        fireEvent.click(removeButton(list, 'Mock candidate A'));
        fireEvent.click(within(confirmation(list, 'Mock candidate A')).getByRole('button', {name: 'Remove'}));
        await waitFor(() => expect(api.removeSubject).toHaveBeenCalledWith('QMOCK1'));
        await waitFor(() => expect(optionsOf()).not.toContain('Mock candidate A'));
    });
});

describe('the confirmation', () => {
    it('should ask once before anything is sent, with what is deleted, and Cancel sends nothing', async () => {
        show();
        const {list} = await openList();
        expect(confirmation(list, 'Mock candidate B')).toBeNull();
        fireEvent.click(removeButton(list, 'Mock candidate B'));
        const group = confirmation(list, 'Mock candidate B');
        expect(group).toHaveTextContent('Remove Mock candidate B from the map? What was read for this candidate (positions, votes, sources) is deleted and the news will not bring the candidate back. You can add the candidate again by hand.');
        expect(within(group).getByRole('button', {name: 'Remove'})).toBeInTheDocument();
        expect(api.removeSubject).not.toHaveBeenCalled();
        fireEvent.click(within(group).getByRole('button', {name: 'Cancel'}));
        expect(confirmation(list, 'Mock candidate B')).toBeNull();
        expect(api.removeSubject).not.toHaveBeenCalled();
        expect(optionsOf()).toContain('Mock candidate B');
    });

    it('should ask for one candidate at a time', async () => {
        show();
        const {list} = await openList();
        fireEvent.click(removeButton(list, 'Mock candidate B'));
        fireEvent.click(removeButton(list, 'Mock candidate C'));
        expect(confirmation(list, 'Mock candidate B')).toBeNull();
        expect(confirmation(list, 'Mock candidate C')).not.toBeNull();
    });

    it('should send the removal on the one confirmation, ask the map again, and take the candidate out of the select and of the list', async () => {
        show();
        const {list} = await openList();
        const asks = api.map.mock.calls.length;
        fireEvent.click(removeButton(list, 'Mock candidate B'));
        fireEvent.click(within(confirmation(list, 'Mock candidate B')).getByRole('button', {name: 'Remove'}));
        await waitFor(() => expect(api.removeSubject).toHaveBeenCalledTimes(1));
        expect(api.removeSubject).toHaveBeenCalledWith('QMOCK2');
        await waitFor(() => expect(api.map.mock.calls.length).toBeGreaterThan(asks));
        await waitFor(() => expect(optionsOf()).not.toContain('Mock candidate B'));
        expect(optionsOf()).toEqual(['All candidates', 'Mock candidate A', 'Mock candidate C · Reading the news…', 'Mock candidate D', 'Mock candidate E · Reading the news…']);
        expect(within(list).queryByText('Mock candidate B', {selector: 'span'})).toBeNull();
        expect(confirmation(list, 'Mock candidate B')).toBeNull();
        // the dialog stays open on the others
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(removeButton(list, 'Mock candidate C')).toBeInTheDocument();
    });

    it('should show it on the map: the candidate is gone from the legend and from the columns that follow it', async () => {
        show();
        const {list} = await openList();
        fireEvent.click(removeButton(list, 'Mock candidate D'));
        fireEvent.click(within(confirmation(list, 'Mock candidate D')).getByRole('button', {name: 'Remove'}));
        await waitFor(() => expect(optionsOf()).not.toContain('Mock candidate D'));
        expect(within(screen.getByRole('list', {name: 'Legend', hidden: true})).queryByText(/Mock candidate D/)).toBeNull();
    });
});

describe('the candidate chosen when it is removed', () => {
    it('should leave the candidate chosen in the list and in the address that was removed: All candidates', async () => {
        show('/fifa?c=QMOCK2');
        const {list} = await openList();
        expect(select()).toHaveValue('QMOCK2');
        fireEvent.click(removeButton(list, 'Mock candidate B'));
        fireEvent.click(within(confirmation(list, 'Mock candidate B')).getByRole('button', {name: 'Remove'}));
        await waitFor(() => expect(optionsOf()).not.toContain('Mock candidate B'));
        await waitFor(() => expect(select()).toHaveValue('all'));
        // the address says it too
        await waitFor(() => expect(params().c).toBeUndefined());
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('should keep the candidate chosen when another one is removed', async () => {
        show('/fifa?c=QMOCK2');
        const {list} = await openList();
        fireEvent.click(removeButton(list, 'Mock candidate C'));
        fireEvent.click(within(confirmation(list, 'Mock candidate C')).getByRole('button', {name: 'Remove'}));
        await waitFor(() => expect(optionsOf()).not.toContain('Mock candidate C · Reading the news…'));
        expect(select()).toHaveValue('QMOCK2');
        expect(params().c).toBe('QMOCK2');
    });
});

describe('what the server refuses', () => {
    const press = async (list, name) => {
        if (!confirmation(list, name)) fireEvent.click(removeButton(list, name));
        fireEvent.click(within(confirmation(list, name)).getByRole('button', {name: 'Remove'}));
        return await within(confirmation(list, name)).findByRole('alert');
    };

    it('should say the words of the server and keep the candidate: 403, 404, 429; and a message of its own when signed out or when the call fails', async () => {
        show();
        const {list} = await openList();
        api.removeSubject.mockResolvedValueOnce({error: 'Only an administrator can remove the president in office.', status: 403});
        expect(await press(list, 'Mock candidate B')).toHaveTextContent('Only an administrator can remove the president in office.');
        api.removeSubject.mockResolvedValueOnce({error: 'Unknown candidate.', status: 404});
        expect(await press(list, 'Mock candidate B')).toHaveTextContent('Unknown candidate.');
        api.removeSubject.mockResolvedValueOnce({error: 'You removed 10 candidates in the last hour: try again later.', status: 429});
        expect(await press(list, 'Mock candidate B')).toHaveTextContent('You removed 10 candidates in the last hour: try again later.');
        api.removeSubject.mockResolvedValueOnce({error: 'Forbidden, invalid or expired', status: 401});
        expect(await press(list, 'Mock candidate B')).toHaveTextContent('Sign in to remove a candidate.');
        api.removeSubject.mockRejectedValueOnce(new Error('offline'));
        expect(await press(list, 'Mock candidate B')).toHaveTextContent('The candidate could not be removed. Try again in a moment.');
        // nothing changed: the candidate is there, the confirmation is open, the map was not asked again for it
        expect(optionsOf()).toContain('Mock candidate B');
        expect(confirmation(list, 'Mock candidate B')).not.toBeNull();
        // and the next try goes through
        fireEvent.click(within(confirmation(list, 'Mock candidate B')).getByRole('button', {name: 'Remove'}));
        await waitFor(() => expect(optionsOf()).not.toContain('Mock candidate B'));
    });

    it('should say that the candidate was removed but the map could not be read again, when that is what happened', async () => {
        show();
        const {list} = await openList();
        api.map.mockResolvedValueOnce({error: 'The server answered 502: it may be restarting or busy. Try again in a moment.', status: 502});
        const alert = await press(list, 'Mock candidate B');
        expect(alert).toHaveTextContent('Mock candidate B was removed, but the map could not be read again:');
        expect(api.removeSubject).toHaveBeenCalledTimes(1);
    });

    it('should wait for the server: the buttons are off while it is sent', async () => {
        let release;
        api.removeSubject.mockImplementation(() => new Promise((done) => { release = done; }));
        show();
        const {list} = await openList();
        fireEvent.click(removeButton(list, 'Mock candidate B'));
        const group = confirmation(list, 'Mock candidate B');
        fireEvent.click(within(group).getByRole('button', {name: 'Remove'}));
        await waitFor(() => expect(within(group).getByRole('button', {name: 'Cancel'})).toBeDisabled());
        expect(within(group).getByRole('button', {name: 'Remove'})).toBeDisabled();
        await wait(50);
        expect(api.removeSubject).toHaveBeenCalledTimes(1);
        release(null);
        await waitFor(() => expect(confirmation(list, 'Mock candidate B')).toBeNull());
    });
});
