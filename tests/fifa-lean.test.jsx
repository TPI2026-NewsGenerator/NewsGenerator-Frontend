//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-lean.test.jsx
//  Description: "Which candidate does {country} lean towards?": with no candidate chosen in the list, the sheet of an association has one block at the top
//               of the tab Positions. An association has one vote. The four states: the news show a candidate (the reader confirms it, or chooses
//               another or none), a reader chose or confirmed it, the news show several (choose one), none is shown (choose). The choice is
//               sent to /leans, the answer's entries replace the ones of the map, "Remove my choice" takes it all back. The cards of the candidates
//               under it only read; with one candidate chosen in the list the sheet has its card with "Confirm this position ✓" and the fold
//
//  The associations, the readers and the answers are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ALL_LEVELS, MOCK_SUBJECTS, answerLean, answerVote, buildMock} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn(), lean: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

// the rows the choices write, answered as the server would
let given = [];
const serve = () => {
    const mock = buildMock();
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => buildMock({votes: given}).association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
    api.vote.mockImplementation(async body => answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body, by: 'reader'}));
    api.lean.mockImplementation(async body => answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body, by: 'reader'}));
};
const show = (url = '/fifa') => render(<MemoryRouter initialEntries={[url]}><FifaBoard reader="reader"/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
const qidOf = (fifa) => buildMock().map.members.find(member => member.fifa === fifa).qid;

const openSheet = async (fifa) => {
    await mapReady();
    fireEvent.click(shape(fifa));
    const sheet = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
    await within(sheet).findAllByRole('region', {name: /^Mock candidate [A-E]$/});
    return sheet;
};
const blockOf = (sheet) => within(sheet).getByRole('region', {name: /^Which candidate does .* lean towards\?$/});
const cardOf = (sheet, candidate = 'A') => within(sheet).getByRole('region', {name: `Mock candidate ${candidate}`});
const choose = (block, name) => fireEvent.click(within(block).getByRole('button', {name}));
const counters = () => screen.getByText(/positions? known · /).textContent;

beforeEach(() => {
    given = [];
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the mock: which candidate an association leans toward', () => {
    it('should say it in the map and in the sheet: the candidate shown, who set it, several, none', () => {
        const members = buildMock().map.members;
        const lean = (fifa) => members.find(member => member.fifa === fifa).lean;
        expect(lean('IND')).toEqual({subject_qid: 'QMOCK1', source: 'news', conflicting: []});
        expect(lean('NGA')).toEqual({subject_qid: 'QMOCK1', source: 'reader', conflicting: []});
        expect(lean('ESP')).toEqual({subject_qid: null, source: 'news', conflicting: ['QMOCK1', 'QMOCK2']});
        expect(lean('GER')).toBeNull();
    });

    it('should set the association for the candidate chosen and "no position" on the others it was shown supporting, never touching an opposition', () => {
        const mock = buildMock();
        const esp = mock.map.members.find(member => member.fifa === 'ESP').qid;
        const first = answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: esp, subject: 'QMOCK2'}, by: 'reader'});
        expect(first.written).toBe(2);
        expect(first.positions.QMOCK2.human).toMatchObject({value: 'for', by: 'reader'});
        expect(first.positions.QMOCK1.human).toMatchObject({value: 'unknown', by: 'reader'});
        expect(first.lean).toEqual({subject_qid: 'QMOCK2', source: 'reader', conflicting: []});
        // a choice that already stands writes nothing
        expect(answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: esp, subject: 'QMOCK2'}, by: 'reader'}).written).toBe(0);
        // an opposition is never touched: Norway is against A (probable), the reader leans it toward B
        const nor = mock.map.members.find(member => member.fifa === 'NOR').qid;
        const second = answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: nor, subject: 'QMOCK2'}, by: 'reader'});
        expect(second.written).toBe(1);
        expect(second.positions.QMOCK1.human).toBeNull();
        expect(second.positions.QMOCK1.position).toBe('non_soutien_probable');
        // "none": no position on the candidate it was shown supporting
        const ind = mock.map.members.find(member => member.fifa === 'IND').qid;
        expect(answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: ind, subject: 'none'}, by: 'reader'}).lean).toBeNull();
        // "withdraw": everything the reader wrote on the association goes
        const back = answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: esp, subject: 'withdraw'}, by: 'reader'});
        expect(back.written).toBe(2);
        expect(back.lean).toEqual({subject_qid: null, source: 'news', conflicting: ['QMOCK1', 'QMOCK2']});
    });
});

describe('the block, with no candidate chosen', () => {
    it('should be at the top of the tab Positions, before the cards', async () => {
        show();
        const sheet = await openSheet('BRA');
        const block = blockOf(sheet);
        expect(within(block).getByRole('heading', {name: 'Which candidate does Brazil lean towards?'})).toBeInTheDocument();
        expect(block.compareDocumentPosition(cardOf(sheet)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should not be there when a candidate is chosen: the card of that candidate has "Confirm this position ✓" and the fold, first', async () => {
        show('/fifa?c=QMOCK2');
        await mapReady();
        fireEvent.click(shape('FRA'));
        const sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        const first = await within(sheet).findByRole('region', {name: 'Mock candidate B'});
        expect(within(sheet).queryByRole('region', {name: /lean towards/})).toBeNull();
        expect(within(first).getByRole('button', {name: /^Confirm/})).toBeInTheDocument();
        expect(within(first).getByRole('button', {name: 'Or change the position'})).toBeInTheDocument();
        // the chips show the candidate chosen only: all of them with "All"; the candidate chosen comes first, the others only read
        fireEvent.click(within(sheet).getByRole('radio', {name: 'All'}));
        expect(within(sheet).getAllByRole('region').filter(one => /^Mock candidate/.test(one.getAttribute('aria-label') ?? ''))[0]).toBe(first);
        expect(within(cardOf(sheet, 'A')).queryByRole('button', {name: /^Confirm/})).toBeNull();
    });

    it('should leave the cards of the candidates read-only: what the news read, no button of a vote, the sentences and the groups kept', async () => {
        show();
        const sheet = await openSheet('NGA');
        for (const candidate of ['A', 'B', 'C']) {
            const card = cardOf(sheet, candidate);
            expect(within(card).queryByRole('button', {name: 'Or change the position'})).toBeNull();
            expect(within(card).queryByRole('button', {name: /^Confirm/})).toBeNull();
            expect(within(card).queryByRole('group', {name: /^Your vote/})).toBeNull();
        }
        // the position, who confirmed it, the groups of sentences stay
        const card = cardOf(sheet);
        expect(within(card).getAllByText('Declared support').length).toBeGreaterThan(0);
        expect(within(card).getByText(/^Confirmed by Mock reader 3, Mock reader 1/)).toBeInTheDocument();
        expect(within(card).getByRole('group', {name: 'Declared sentences on Mock candidate A'})).toBeInTheDocument();
        // the block is the only place with a Confirm button
        expect(within(sheet).getAllByRole('button', {name: /^Confirm/})).toHaveLength(1);
    });
});

describe('the four states of the block', () => {
    it('should, when the news show a candidate, offer "Confirm {candidate} ✓" and under it "Not this one?" with the others and none', async () => {
        show();
        // India: declared support for A, in the news, nobody confirmed
        const sheet = await openSheet('IND');
        const block = blockOf(sheet);
        expect(within(block).getByRole('button', {name: 'Confirm Mock candidate A ✓'}).className).toContain('bg-action');
        expect(within(block).getByText('Read from the news')).toBeInTheDocument();
        expect(within(block).getByText('Not this one? Choose another candidate:')).toBeInTheDocument();
        const others = within(within(block).getByRole('group', {name: 'Candidates'})).getAllByRole('button').map(button => button.textContent);
        expect(others).toEqual(['Mock candidate B', 'Mock candidate C', 'None / undecided']);
    });

    it('should, when a reader chose or confirmed it, say by whom, and keep the other candidates available', async () => {
        show();
        // Nigeria: confirmed by two readers; this reader is not one of them
        let sheet = await openSheet('NGA');
        let block = blockOf(sheet);
        expect(within(block).getByText('Confirmed by Mock reader 3, Mock reader 1')).toBeInTheDocument();
        expect(within(block).getByRole('button', {name: 'Confirm Mock candidate A ✓'})).toBeEnabled();
        expect(within(within(block).getByRole('group', {name: 'Candidates'})).getAllByRole('button')).toHaveLength(3);
        fireEvent.keyDown(sheet, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        // Mexico: chosen by a reader (a vote for A)
        fireEvent.click(shape('MEX'));
        sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        await within(sheet).findByRole('region', {name: 'Mock candidate A'});
        block = blockOf(sheet);
        expect(within(block).getByText('Chosen by Mock reader 1')).toBeInTheDocument();
        expect(within(block).queryByText('Read from the news')).toBeNull();
    });

    it('should, when the news show several, offer no Confirm button, only "choose one"', async () => {
        show();
        // Spain: declared support for A and probable for B
        const sheet = await openSheet('ESP');
        const block = blockOf(sheet);
        expect(within(block).getByText('The news point to several: choose one.')).toBeInTheDocument();
        expect(within(block).queryByRole('button', {name: /^Confirm/})).toBeNull();
        expect(within(within(block).getByRole('group', {name: 'Candidates'})).getAllByRole('button').map(button => button.textContent))
            .toEqual(['Mock candidate A', 'Mock candidate B', 'Mock candidate C', 'None / undecided']);
    });

    it('should, when no candidate is shown, say so and offer no Confirm button', async () => {
        show();
        // Germany: nothing on any candidate
        const sheet = await openSheet('GER');
        const block = blockOf(sheet);
        expect(within(block).getByText('No candidate is shown yet. Which one does it lean towards?')).toBeInTheDocument();
        expect(within(block).queryByRole('button', {name: /^Confirm/})).toBeNull();
        expect(within(within(block).getByRole('group', {name: 'Candidates'})).getAllByRole('button')).toHaveLength(4);
        // nothing of this reader to take back
        expect(within(block).getByRole('button', {name: 'Remove my choice'})).toBeDisabled();
    });

    it('should, when a reader chose "none / undecided", say so and show that choice pressed', async () => {
        show();
        // Qatar: a reader said "no position" on the candidate it was shown supporting
        const sheet = await openSheet('QAT');
        const block = blockOf(sheet);
        expect(within(block).getByText('Undecided, set by Mock reader 1. Which candidate does it lean towards?')).toBeInTheDocument();
        expect(within(block).getByRole('button', {name: 'None / undecided'})).toHaveAttribute('aria-pressed', 'true');
        expect(within(block).queryByRole('button', {name: /^Confirm/})).toBeNull();
    });
});

describe('what a choice does', () => {
    it('should send the candidate chosen, and the entries of the answer replace the ones of the map: several become one', async () => {
        show();
        await mapReady();
        const before = counters();
        expect(shape('ESP')).toHaveAttribute('data-kind', 'conflicting');
        const sheet = await openSheet('ESP');
        choose(blockOf(sheet), 'Mock candidate B');
        await waitFor(() => expect(api.lean).toHaveBeenCalledWith({member: qidOf('ESP'), subject: 'QMOCK2'}));
        // the map, with no new call for it: the colour of B, solid, set by a reader; the vote on A is "no position"
        await waitFor(() => expect(shape('ESP')).toHaveAttribute('data-kind', 'indicated'));
        expect(shape('ESP')).toHaveAccessibleName('Spain, ESP, UEFA: Support for Mock candidate B (set by a reader)');
        expect(shape('ESP').style.fill).toBe('var(--cand-2)');
        expect(api.map).toHaveBeenCalledTimes(1);
        // still one position known: it was a position of the news and is one of a reader
        expect(counters()).toBe(before);
        // the sheet, read again: the block says who chose, the card of A says it is no position now
        expect(await within(blockOf(sheet)).findByText('Chosen by reader')).toBeInTheDocument();
        expect(within(blockOf(sheet)).getByRole('button', {name: 'Confirm Mock candidate B ✓'})).toBeEnabled();
        const cardA = cardOf(sheet, 'A');
        await waitFor(() => expect(within(cardA).getByText('Set by a reader')).toBeInTheDocument());
        expect(within(cardA).getByText('No known position')).toBeInTheDocument();
    });

    it('should give a country no candidate was shown for the candidate chosen, and count the position', async () => {
        show();
        await mapReady();
        const before = counters();
        const sheet = await openSheet('GER');
        choose(blockOf(sheet), 'Mock candidate C');
        await waitFor(() => expect(api.lean).toHaveBeenCalledWith({member: qidOf('GER'), subject: 'QMOCK3'}));
        await waitFor(() => expect(shape('GER')).toHaveAttribute('data-kind', 'indicated'));
        expect(shape('GER')).toHaveAccessibleName('Germany, GER, UEFA: Support for Mock candidate C (set by a reader)');
        expect(counters()).not.toBe(before);
        expect(await within(blockOf(sheet)).findByText('Chosen by reader')).toBeInTheDocument();
    });

    it('should make an association undecided with "None / undecided", the news kept in its card', async () => {
        show();
        const sheet = await openSheet('IND');
        choose(blockOf(sheet), 'None / undecided');
        await waitFor(() => expect(api.lean).toHaveBeenCalledWith({member: qidOf('IND'), subject: 'none'}));
        await waitFor(() => expect(shape('IND')).toHaveAttribute('data-kind', 'unknown'));
        expect(shape('IND')).toHaveAccessibleName(/^India, IND, AFC: No position \(set by a reader\)/);
        expect(await within(blockOf(sheet)).findByText(/^Undecided, set by reader/)).toBeInTheDocument();
        expect(within(blockOf(sheet)).getByRole('button', {name: 'None / undecided'})).toHaveAttribute('aria-pressed', 'true');
        expect(within(cardOf(sheet)).getByText('AI reading from the news:').parentElement).toHaveTextContent('Declared support');
    });

    it('should write nothing when the choice already stands', async () => {
        show();
        const sheet = await openSheet('GER');
        choose(blockOf(sheet), 'Mock candidate C');
        await within(blockOf(sheet)).findByText('Chosen by reader');
        // the same candidate again, from the "Not this one?" list of another state: ask the server for the same choice
        const standing = await api.lean.mock.results[0].value;
        expect(standing.written).toBe(1);
        const again = await answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: qidOf('GER'), subject: 'QMOCK3'}, by: 'reader'});
        expect(again.written).toBe(0);
    });

    it('should confirm the candidate shown with a vote of "confirm", and make a position the news read as probable solid', async () => {
        show();
        await mapReady();
        // Peru: probable support for A, in the news
        expect(shape('PER')).toHaveAttribute('data-pattern', 'fifa-dots-1');
        const sheet = await openSheet('PER');
        fireEvent.click(within(blockOf(sheet)).getByRole('button', {name: 'Confirm Mock candidate A ✓'}));
        await waitFor(() => expect(api.vote).toHaveBeenCalledWith({subject: 'QMOCK1', member: qidOf('PER'), value: 'confirm'}));
        expect(api.lean).not.toHaveBeenCalled();
        await waitFor(() => expect(shape('PER')).not.toHaveAttribute('data-pattern'));
        expect(shape('PER')).toHaveAccessibleName('Peru, PER, CONMEBOL: Declared support for Mock candidate A (confirmed by a reader)');
        // the block: confirmed, by this reader, nothing left to confirm
        expect(await within(blockOf(sheet)).findByText('Confirmed by reader')).toBeInTheDocument();
        expect(within(blockOf(sheet)).getByRole('button', {name: 'Confirmed ✓'})).toBeDisabled();
        // the others are still there to change it
        expect(within(within(blockOf(sheet)).getByRole('group', {name: 'Candidates'})).getAllByRole('button')).toHaveLength(3);
    });

    it('should override the news with another candidate from "Not this one?"', async () => {
        show();
        const sheet = await openSheet('IND');
        choose(blockOf(sheet), 'Mock candidate C');
        await waitFor(() => expect(api.lean).toHaveBeenCalledWith({member: qidOf('IND'), subject: 'QMOCK3'}));
        await waitFor(() => expect(shape('IND')).toHaveAccessibleName('India, IND, AFC: Support for Mock candidate C (set by a reader)'));
        // A, which the news showed, is "no position" now
        const cardA = cardOf(sheet, 'A');
        await waitFor(() => expect(within(cardA).getByText('Set by a reader')).toBeInTheDocument());
    });

    it('should take the whole choice back with "Remove my choice", the news coming back where nobody else decided', async () => {
        show();
        const sheet = await openSheet('ESP');
        choose(blockOf(sheet), 'Mock candidate B');
        await within(blockOf(sheet)).findByText('Chosen by reader');
        expect(shape('ESP')).toHaveAttribute('data-kind', 'indicated');
        await waitFor(() => expect(within(blockOf(sheet)).getByRole('button', {name: 'Remove my choice'})).toBeEnabled());
        fireEvent.click(within(blockOf(sheet)).getByRole('button', {name: 'Remove my choice'}));
        await waitFor(() => expect(api.lean).toHaveBeenLastCalledWith({member: qidOf('ESP'), subject: 'withdraw'}));
        // the two positions of the news, as they were
        await waitFor(() => expect(shape('ESP')).toHaveAttribute('data-kind', 'conflicting'));
        expect(await within(blockOf(sheet)).findByText('The news point to several: choose one.')).toBeInTheDocument();
        expect(within(blockOf(sheet)).getByRole('button', {name: 'Remove my choice'})).toBeDisabled();
    });

    it('should say a refusal under the block and change nothing: signed out, too many votes, anything else', async () => {
        show();
        const sheet = await openSheet('GER');
        const press = async (name) => {
            choose(blockOf(sheet), name);
            return await within(blockOf(sheet)).findByRole('alert');
        };
        api.lean.mockResolvedValueOnce({error: 'Forbidden, invalid or expired', status: 401});
        expect(await press('Mock candidate A')).toHaveTextContent('Sign in to vote.');
        api.lean.mockResolvedValueOnce({error: 'Too many votes: wait a moment.', status: 429});
        expect(await press('Mock candidate A')).toHaveTextContent('Too many votes in a short time. Wait a moment and try again.');
        api.lean.mockResolvedValueOnce({error: 'Unknown association or candidate.', status: 422});
        expect(await press('None / undecided')).toHaveTextContent('Unknown association or candidate.');
        api.lean.mockRejectedValueOnce(new Error('network'));
        expect(await press('Mock candidate B')).toHaveTextContent('The choice could not be sent');
        expect(shape('GER')).toHaveAttribute('data-kind', 'unknown');
    });
});
