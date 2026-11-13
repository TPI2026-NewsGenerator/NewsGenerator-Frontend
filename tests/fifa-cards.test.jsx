//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-cards.test.jsx
//  Description: The strip of the candidates at the top of the tab Positions of the sheet of an association (the tab the sheet opens on), on EVERY sheet: one card for EVERY candidate
//               of the map, the ones the news say nothing of too, each with the colour of the candidate on its left edge, its name, its status for the association in the words of
//               the rest of the page ("Declared support", "Uncertain: signals, no position", "No known position", "Set by a reader", "Confirmed by a reader") and "Review →"
//               ("Take a position →" when no position is known); in the order of the summary of the sheet. The strip is the FILTER of the tab: a card is a button that selects the
//               candidate (one at a time, a second click unselects it). With none selected: one line under the strip, then the rundown, one READ ONLY card after the other for every
//               candidate the news say something of (or the line "No position is known for {country} yet" when they say nothing); with one selected: its detail only, with the
//               vote ("Supported by {country}", "Not supported", "No position", "Remove my vote"), for a candidate the news say nothing of the vote and a line that says so
//
//  The associations, the candidates and the positions are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {ALL_LEVELS, MOCK_NEWS_SUBJECTS, MOCK_SUBJECTS, answerVote, buildMock} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const [A] = MOCK_SUBJECTS;
const FIVE = [...MOCK_SUBJECTS, ...MOCK_NEWS_SUBJECTS];

// the candidates of the map, the votes given in a test, and the sheet the server answers (replaceable by a test)
let candidates = MOCK_SUBJECTS;
let given = [];
let answerOf = null;
const serve = () => {
    const mock = buildMock({candidates});
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => {
        const sheet = buildMock({candidates, votes: given, reader: 'reader'}).association(qid);
        return answerOf ? answerOf(sheet) : sheet;
    });
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
    api.vote.mockImplementation(async body => answerVote({levels: ALL_LEVELS, candidates, given, body, by: 'reader'}));
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
const qidOf = (fifa) => buildMock().map.members.find(member => member.fifa === fifa).qid;
// the sheet of an association on the tab it opens on (Positions), once it has been read
const openSheet = async (fifa) => {
    await mapReady();
    fireEvent.click(shape(fifa));
    const sheet = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
    await within(sheet).findByRole('group', {name: 'Candidates and their status'});
    return sheet;
};
const stripOf = (sheet) => within(sheet).getByRole('group', {name: 'Candidates and their status'});
const buttons = (sheet) => within(stripOf(sheet)).getAllByRole('button');
// what a card says: its name, its status, the mark of a reader, its link
const nameOf = (button) => button.children[0].textContent;
const statusOfCard = (button) => button.children[1].textContent;
const linkOf = (button) => button.lastElementChild.textContent;
const markOf = (button) => button.children.length === 4 ? button.children[2].textContent : null;
const letters = (sheet) => buttons(sheet).map(button => nameOf(button).replace('Mock candidate ', ''));
const cardOfLetter = (sheet, candidate) => buttons(sheet).find(button => nameOf(button) === `Mock candidate ${candidate}`);
const pressed = (sheet) => buttons(sheet).filter(button => button.getAttribute('aria-pressed') === 'true').map(button => nameOf(button).replace('Mock candidate ', ''));
// the cards of the candidates under the strip: the detail of the one selected, or the rundown of all (the ones the news say something of)
const detailsOf = (sheet) => within(sheet).queryAllByRole('region', {name: /^Mock candidate [A-E]$/}).map(card => card.getAttribute('aria-label').replace('Mock candidate ', ''));
// the candidates the news hold something on for an association, in the order of the strip
// the candidates the news (or a reader) say something of on this association: an entry of the sheet that holds something to show (an entry of the map can hold nothing: a reading of
// the news that left everything out)
const newsOf = (sheet, fifa) => {
    const answer = buildMock({candidates}).association(qidOf(fifa));
    const held = Object.entries(answer.positions)
        .filter(([qid, entry]) => entry.position !== 'inconnue' || entry.human || entry.confirmed || entry.signals_count > 0 || entry.uncertain_count > 0
            || (answer.signals ?? []).some(one => one.subject_qid === qid) || (answer.history ?? []).some(one => one.subject_qid === qid)
            || (answer.sources ?? []).some(one => one.subject_qid === qid))
        .map(([qid]) => qid);
    return letters(sheet).filter(letter => held.includes(candidates.find(subject => subject.name === `Mock candidate ${letter}`).qid));
};
const regionOf = (sheet, candidate) => within(sheet).getByRole('region', {name: `Mock candidate ${candidate}`});
const FOLLOWS = Node.DOCUMENT_POSITION_FOLLOWING;
const select = (sheet, candidate) => { fireEvent.click(cardOfLetter(sheet, candidate)); return within(sheet).getByRole('region', {name: `Mock candidate ${candidate}`}); };

beforeEach(() => {
    candidates = MOCK_SUBJECTS;
    given = [];
    answerOf = null;
    seen.search = '';
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the strip of the candidates', () => {
    it('should be the first thing of the tab Positions, above the line that says what is shown, the cards and the control "Add a source"', async () => {
        show();
        const sheet = await openSheet('ESP');
        const panel = within(sheet).getByRole('tabpanel');
        expect(panel.firstElementChild).toBe(stripOf(sheet));
        // no block "Which candidate does {country} lean towards?" on any sheet: the strip does what it did (vote, source, confirm, none, remove)
        expect(within(sheet).queryByRole('region', {name: /lean towards/})).toBeNull();
        expect(within(sheet).queryByRole('button', {name: 'None / undecided'})).toBeNull();
        expect(within(sheet).queryByRole('button', {name: 'Remove my choice'})).toBeNull();
        const sources = within(sheet).getByRole('region', {name: 'Sources'});
        expect(stripOf(sheet).compareDocumentPosition(sources) & FOLLOWS).toBeTruthy();
        // no field for a source before a candidate is selected: the one of the vote is in its detail
        expect(within(sheet).queryAllByLabelText('Add a source (link)')).toHaveLength(0);
    });

    it('should have a card for every candidate, the ones the news say nothing of too, with their status (Spain: declared on A, probable on B, nothing on C)', async () => {
        show();
        const sheet = await openSheet('ESP');
        expect(letters(sheet)).toEqual(['A', 'B', 'C']);
        expect(buttons(sheet).map(statusOfCard)).toEqual(['Declared support', 'Probable support', 'No known position']);
        expect(buttons(sheet).map(linkOf)).toEqual(['Review →', 'Review →', 'Take a position →']);
        // nothing is selected: the rundown of the candidates the news say something of (not C)
        expect(pressed(sheet)).toEqual([]);
        expect(detailsOf(sheet)).toEqual(['A', 'B']);
    });

    it('should say "No known position" on every card when the news say nothing of any candidate (the United States), and keep the strip with a line that says so', async () => {
        show();
        const sheet = await openSheet('USA');
        expect(letters(sheet)).toEqual(['A', 'B', 'C']);
        expect(buttons(sheet).map(statusOfCard)).toEqual(['No known position', 'No known position', 'No known position']);
        expect(buttons(sheet).map(linkOf)).toEqual(['Take a position →', 'Take a position →', 'Take a position →']);
        expect(within(sheet).getByText('No position is known for United States yet. Select a candidate above to take one.')).toBeInTheDocument();
        expect(within(sheet).queryByText('No candidate is on the map yet.')).toBeNull();
        // no card under the strip, and nothing that is the block of the choice
        expect(detailsOf(sheet)).toEqual([]);
        expect(within(sheet).queryByRole('region', {name: /lean towards/})).toBeNull();
        // the control "Add a source" stays at the bottom of the tab
        expect(within(sheet).getByRole('region', {name: 'Sources'})).toBeInTheDocument();
    });

    it('should say "Uncertain: signals, no position" when the news hold only Uncertain signals on a candidate (Turkey: A)', async () => {
        show();
        const sheet = await openSheet('TUR');
        expect(buttons(sheet).map(statusOfCard)).toEqual(['Uncertain: signals, no position', 'No known position', 'No known position']);
        expect(buttons(sheet).map(linkOf)).toEqual(['Take a position →', 'Take a position →', 'Take a position →']);
    });

    it('should say the position a reader set, with the mark "Set by a reader" (France: a vote against B)', async () => {
        show();
        const sheet = await openSheet('FRA');
        expect(letters(sheet)).toEqual(['B', 'A', 'C']);
        const card = cardOfLetter(sheet, 'B');
        expect(statusOfCard(card)).toBe('Opposition');
        expect(markOf(card)).toBe('Set by a reader');
        expect(linkOf(card)).toBe('Review →');
        // the others carry no mark
        expect(markOf(cardOfLetter(sheet, 'A'))).toBeNull();
        expect(markOf(cardOfLetter(sheet, 'C'))).toBeNull();
    });

    it('should say "Set by a reader" for a reader\'s "no position" too, and keep the news out of the status (Qatar: declared for A in the news)', async () => {
        show();
        const sheet = await openSheet('QAT');
        const card = cardOfLetter(sheet, 'A');
        expect(statusOfCard(card)).toBe('No known position');
        expect(markOf(card)).toBe('Set by a reader');
    });

    it('should say "Confirmed by a reader" when a reader\'s confirmation makes the position solid (Morocco: A)', async () => {
        show();
        const sheet = await openSheet('MAR');
        const card = cardOfLetter(sheet, 'A');
        expect(statusOfCard(card)).toBe('Declared support');
        expect(markOf(card)).toBe('Confirmed by a reader');
    });

    it('should put the colour of the candidate on the left edge of its card, and the name first', async () => {
        candidates = FIVE;
        serve();
        show();
        const sheet = await openSheet('CHN');
        const colours = Object.fromEntries(FIVE.map(subject => [subject.name.replace('Mock candidate ', ''), subject.color_index]));
        for (const button of buttons(sheet)) {
            const letter = nameOf(button).replace('Mock candidate ', '');
            expect(button).toHaveStyle({borderLeftColor: `var(--cand-${colours[letter]})`});
        }
        expect(buttons(sheet).every(button => button.type === 'button')).toBe(true);
    });

    it('should list them in the order of the summary: what the news hold first, then the others in their order (China, five candidates: D, then A, B, C, E)', async () => {
        candidates = FIVE;
        serve();
        show();
        const sheet = await openSheet('CHN');
        expect(letters(sheet)).toEqual(['D', 'A', 'B', 'C', 'E']);
        expect(statusOfCard(cardOfLetter(sheet, 'D'))).toBe('Declared support');
    });

    it('should follow the order the server gives in summary.candidates, and the order of the candidates when the sheet has no summary (an older server)', async () => {
        // the server lists B before A
        answerOf = (sheet) => ({...sheet, summary: {candidates: [...sheet.summary.candidates].reverse()}});
        show();
        const sheet = await openSheet('ESP');
        expect(letters(sheet)).toEqual(['B', 'A', 'C']);
        fireEvent.keyDown(sheet, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        answerOf = (one) => {
            const older = {...one};
            for (const field of ['summary', 'context', 'ai_summary', 'ai_summary_available']) delete older[field];
            return older;
        };
        const second = await openSheet('ESP');
        expect(letters(second)).toEqual(['A', 'B', 'C']);
    });

    it('should be buttons you can reach with the keyboard, in two columns that become three when the panel is wide, at least 44 px tall, with a visible focus', async () => {
        show();
        const sheet = await openSheet('ESP');
        const grid = stripOf(sheet).firstElementChild;
        expect(stripOf(sheet)).toHaveClass('@container');
        expect(grid).toHaveClass('grid-cols-2');
        expect(grid.className).toMatch(/@xl:grid-cols-3/);
        for (const button of buttons(sheet)) {
            expect(button.tagName).toBe('BUTTON');
            expect(button).not.toHaveAttribute('tabindex', '-1');
            expect(button).toHaveClass('min-h-11');
            expect(button.className).toMatch(/focus-visible:outline-2/);
            button.focus();
            expect(button).toHaveFocus();
        }
        // pressed or not: a toggle for the screen readers
        expect(buttons(sheet).every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    });
});

describe('selecting a candidate', () => {
    it('should select the card clicked, show the detail of that candidate only, and leave the page\'s filter and address alone', async () => {
        show();
        const sheet = await openSheet('IND');
        const detail = select(sheet, 'A');
        expect(pressed(sheet)).toEqual(['A']);
        expect(detailsOf(sheet)).toEqual(['A']);
        expect(within(detail).getByRole('heading', {name: 'Mock candidate A'})).toBeInTheDocument();
        // another card: the selection moves, the detail is the one of the new candidate
        select(sheet, 'B');
        expect(pressed(sheet)).toEqual(['B']);
        expect(detailsOf(sheet)).toEqual(['B']);
        // only the sheet changed: not the select of the page nor its address
        expect(screen.getByRole('combobox', {name: 'Candidate', hidden: true})).toHaveValue('all');
        expect(new URLSearchParams(seen.search).get('c')).toBeNull();
    });

    it('should unselect the candidate on a second click on its card: the rundown of all again', async () => {
        show();
        const sheet = await openSheet('IND');
        select(sheet, 'A');
        expect(detailsOf(sheet)).toEqual(['A']);
        fireEvent.click(cardOfLetter(sheet, 'A'));
        expect(pressed(sheet)).toEqual([]);
        // the rundown of all comes back: the candidates the news say something of
        expect(detailsOf(sheet)).toEqual(newsOf(sheet, 'IND'));
    });

    it('should start with the candidate chosen in the list of the page selected, whether or not the news say something of it', async () => {
        show('/fifa?c=QMOCK3');
        const sheet = await openSheet('ESP');
        expect(pressed(sheet)).toEqual(['C']);
        expect(detailsOf(sheet)).toEqual(['C']);
        // the others are one click away
        expect(letters(sheet)).toEqual(['A', 'B', 'C']);
        expect(within(sheet).queryByRole('region', {name: /lean towards/})).toBeNull();
        select(sheet, 'A');
        expect(pressed(sheet)).toEqual(['A']);
        expect(new URLSearchParams(seen.search).get('c')).toBe('QMOCK3');
    });

    it('should start with nothing selected when no candidate is chosen, and the selection starts again with the next association', async () => {
        show();
        const first = await openSheet('IND');
        expect(pressed(first)).toEqual([]);
        select(first, 'C');
        fireEvent.keyDown(first, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const second = await openSheet('ESP');
        expect(pressed(second)).toEqual([]);
        expect(detailsOf(second)).toEqual(['A', 'B']);
    });

    it('should show the whole detail of a candidate the news hold something on: its position, the button that confirms it, the vote with no fold, the sentences', async () => {
        show();
        const sheet = await openSheet('NGA');
        const detail = select(sheet, 'A');
        expect(within(detail).getAllByText('Declared support').length).toBeGreaterThan(0);
        expect(within(detail).getByRole('button', {name: /^Confirm/})).toBeInTheDocument();
        // the vote is open: no fold to open
        expect(within(detail).queryByRole('button', {name: 'Or change the position'})).toBeNull();
        const vote = within(detail).getByRole('group', {name: /^Your vote: /});
        expect(within(vote).getAllByRole('button').map(button => button.textContent)).toEqual(['Supported by Nigeria', 'Not supported', 'No position', 'Remove my vote']);
        expect(within(detail).getByRole('group', {name: 'Declared sentences on Mock candidate A'})).toBeInTheDocument();
        expect(within(detail).queryByText(/^No news name this association with/)).toBeNull();
    });

    it('should show only the vote and a line that says so for a candidate the news say nothing of (Spain: C)', async () => {
        show();
        const sheet = await openSheet('ESP');
        const detail = select(sheet, 'C');
        expect(within(detail).getByText('No news name this association with Mock candidate C yet.')).toBeInTheDocument();
        const vote = within(detail).getByRole('group', {name: 'Your vote: the position of Spain on Mock candidate C'});
        expect(within(vote).getAllByRole('button').map(button => button.textContent)).toEqual(['Supported by Spain', 'Not supported', 'No position', 'Remove my vote']);
        expect(within(vote).getByRole('button', {name: 'Remove my vote'})).toBeDisabled();
        // nothing to confirm, no figures of the news, no sentences
        expect(within(detail).queryByRole('button', {name: /^Confirm/})).toBeNull();
        expect(within(detail).queryByText('Established')).toBeNull();
        expect(within(detail).queryByRole('group', {name: /sentences on/})).toBeNull();
    });
});

describe('the rundown with no card selected', () => {
    it('should draw a card for every candidate the news say something of, in the order of the strip and under the line that says what is shown (Spain: A and B)', async () => {
        show();
        const sheet = await openSheet('ESP');
        expect(detailsOf(sheet)).toEqual(['A', 'B']);
        const line = within(sheet).getByText('All the candidates the news name with this association. Select a card to see one alone and to take a position.');
        expect(stripOf(sheet).compareDocumentPosition(line) & FOLLOWS).toBeTruthy();
        expect(line.compareDocumentPosition(regionOf(sheet, 'A')) & FOLLOWS).toBeTruthy();
        expect(regionOf(sheet, 'A').compareDocumentPosition(regionOf(sheet, 'B')) & FOLLOWS).toBeTruthy();
        // the control "Add a source" comes last
        expect(regionOf(sheet, 'B').compareDocumentPosition(within(sheet).getByRole('region', {name: 'Sources'})) & FOLLOWS).toBeTruthy();
        // C, which the news say nothing of, has a card in the strip but none here
        expect(within(sheet).queryByRole('region', {name: 'Mock candidate C'})).toBeNull();
    });

    it('should not draw a candidate whose entry holds nothing to show, and say no position is known when none holds anything (Gibraltar: read in the news, nothing left)', async () => {
        show();
        const sheet = await openSheet('GIB');
        // the strip has a card for every candidate; the rundown has none: no position, no signal, nothing Uncertain, no vote
        expect(buttons(sheet).length).toBeGreaterThan(0);
        expect(detailsOf(sheet)).toEqual([]);
        expect(within(sheet).queryByText('0 signals')).toBeNull();
        expect(within(sheet).getByText('No position is known for Gibraltar yet. Select a candidate above to take one.')).toBeInTheDocument();
    });

    it('should show in each card the position, the sentences grouped with the link of the medium and who spoke, then the dated signals (Spain: A)', async () => {
        show();
        const sheet = await openSheet('ESP');
        const card = regionOf(sheet, 'A');
        expect(within(card).getAllByText('Declared support').length).toBeGreaterThan(0);
        const declared = within(card).getByRole('group', {name: 'Declared sentences on Mock candidate A'});
        expect(within(declared).getAllByRole('link').length).toBeGreaterThan(0);
        for (const link of within(declared).getAllByRole('link')) expect(link).toHaveAttribute('href', expect.stringMatching(/^https?:\/\//));
        expect(within(declared).getAllByText(/speaks for the association|Speaker not named|does not speak for the association/).length).toBeGreaterThan(0);
        expect(within(card).getByRole('group', {name: 'Mock candidate A: dated signals'})).toBeInTheDocument();
        // the figures of the news
        expect(within(card).getByText('Established')).toBeInTheDocument();
        // the probable position of B is read apart, with its own group of sentences
        expect(within(regionOf(sheet, 'B')).getByRole('group', {name: 'Probable sentences on Mock candidate B'})).toBeInTheDocument();
    });

    it('should be read only: no button that confirms, no vote, no field for a source, the strip above is how a reader goes to the vote', async () => {
        show();
        const sheet = await openSheet('ESP');
        for (const letter of ['A', 'B']) {
            const card = regionOf(sheet, letter);
            expect(within(card).queryByRole('button', {name: /^Confirm/})).toBeNull();
            expect(within(card).queryByRole('group', {name: /^Your vote: /})).toBeNull();
            expect(within(card).queryByRole('button', {name: /^Supported by /})).toBeNull();
            expect(within(card).queryByLabelText('Add a source (link)')).toBeNull();
        }
        expect(api.vote).not.toHaveBeenCalled();
        // one click on a card of the strip: the same candidate, with the button that confirms and the vote
        const detail = select(sheet, 'A');
        expect(within(detail).getByRole('button', {name: /^Confirm/})).toBeInTheDocument();
        expect(within(detail).getByRole('group', {name: /^Your vote: /})).toBeInTheDocument();
    });

    it('should show one candidate alone when its card is selected, with a line that says so, and all of them again with a second click', async () => {
        show();
        const sheet = await openSheet('ESP');
        select(sheet, 'B');
        expect(detailsOf(sheet)).toEqual(['B']);
        expect(within(sheet).getByText('Only Mock candidate B. Select its card again to see all the candidates.')).toBeInTheDocument();
        expect(within(sheet).queryByText(/^All the candidates the news name/)).toBeNull();
        fireEvent.click(cardOfLetter(sheet, 'B'));
        expect(detailsOf(sheet)).toEqual(['A', 'B']);
        expect(within(sheet).getByText(/^All the candidates the news name/)).toBeInTheDocument();
    });

    it('should show a candidate the news say nothing of only when its card is selected: the vote and the line that says so', async () => {
        show();
        const sheet = await openSheet('ESP');
        const detail = select(sheet, 'C');
        expect(detailsOf(sheet)).toEqual(['C']);
        expect(within(detail).getByText('No news name this association with Mock candidate C yet.')).toBeInTheDocument();
        expect(within(detail).getByRole('group', {name: /^Your vote: /})).toBeInTheDocument();
    });

    it('should show the candidates a reader voted on even when the news say nothing of them (Qatar: a vote of "no position" on A)', async () => {
        show();
        const sheet = await openSheet('QAT');
        expect(detailsOf(sheet)).toEqual(newsOf(sheet, 'QAT'));
        expect(detailsOf(sheet)).toContain('A');
    });

    it('should say there are no candidate on the map, not that no position is known, when the map has none', async () => {
        candidates = [];
        serve();
        show();
        await mapReady();
        fireEvent.click(shape('ESP'));
        const sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        await within(sheet).findByText('No candidate is on the map yet.');
        expect(within(sheet).getByText('No candidate is on the map yet.')).toBeInTheDocument();
        expect(within(sheet).queryByText(/^No position is known for/)).toBeNull();
        expect(detailsOf(sheet)).toEqual([]);
    });
});

describe('the vote of the detail', () => {
    const choose = (detail, name) => fireEvent.click(within(within(detail).getByRole('group', {name: /^Your vote: /})).getByRole('button', {name}));

    it('should send for, against and no position with the right candidate and association, whatever the news hold', async () => {
        show();
        const sheet = await openSheet('ESP');
        const detail = select(sheet, 'C');
        choose(detail, 'Supported by Spain');
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(1));
        expect(api.vote.mock.calls[0][0]).toEqual({subject: 'QMOCK3', member: qidOf('ESP'), value: 'for'});
        // the sheet reads itself again and the selection stays: the detail is still the one of C
        await waitFor(() => expect(statusOfCard(cardOfLetter(sheet, 'C'))).toBe('Support'));
        expect(markOf(cardOfLetter(sheet, 'C'))).toBe('Set by a reader');
        expect(pressed(sheet)).toEqual(['C']);
        choose(within(sheet).getByRole('region', {name: 'Mock candidate C'}), 'Not supported');
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(2));
        expect(api.vote.mock.calls[1][0]).toEqual({subject: 'QMOCK3', member: qidOf('ESP'), value: 'against'});
        await waitFor(() => expect(statusOfCard(cardOfLetter(sheet, 'C'))).toBe('Opposition'));
        choose(within(sheet).getByRole('region', {name: 'Mock candidate C'}), 'No position');
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(3));
        expect(api.vote.mock.calls[2][0]).toEqual({subject: 'QMOCK3', member: qidOf('ESP'), value: 'unknown'});
        await waitFor(() => expect(statusOfCard(cardOfLetter(sheet, 'C'))).toBe('No known position'));
        expect(markOf(cardOfLetter(sheet, 'C'))).toBe('Set by a reader');
        expect(pressed(sheet)).toEqual(['C']);
    });

    it('should send the vote on the candidate selected, not on another one (Spain: B, then A)', async () => {
        show();
        const sheet = await openSheet('ESP');
        choose(select(sheet, 'B'), 'Not supported');
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(1));
        expect(api.vote.mock.calls[0][0]).toMatchObject({subject: 'QMOCK2', value: 'against'});
        await waitFor(() => expect(statusOfCard(cardOfLetter(sheet, 'B'))).toBe('Opposition'));
        choose(select(sheet, 'A'), 'Supported by Spain');
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(2));
        expect(api.vote.mock.calls[1][0]).toMatchObject({subject: 'QMOCK1', value: 'for'});
    });

    it('should take the vote back with "Remove my vote", and the card goes back to what the news read', async () => {
        show();
        const sheet = await openSheet('ESP');
        choose(select(sheet, 'C'), 'Supported by Spain');
        await waitFor(() => expect(statusOfCard(cardOfLetter(sheet, 'C'))).toBe('Support'));
        await waitFor(() => expect(within(within(sheet).getByRole('region', {name: 'Mock candidate C'})).getByRole('button', {name: 'Remove my vote'})).toBeEnabled());
        choose(within(sheet).getByRole('region', {name: 'Mock candidate C'}), 'Remove my vote');
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(2));
        expect(api.vote.mock.calls[1][0]).toMatchObject({subject: 'QMOCK3', value: 'withdraw'});
        await waitFor(() => expect(statusOfCard(cardOfLetter(sheet, 'C'))).toBe('No known position'));
        expect(markOf(cardOfLetter(sheet, 'C'))).toBeNull();
    });
});

describe('the candidates of the map', () => {
    it('should have a card for a single candidate too', async () => {
        candidates = [A];
        serve();
        show();
        const single = await openSheet('NGA');
        expect(letters(single)).toEqual(['A']);
        expect(statusOfCard(buttons(single)[0])).toBe('Declared support');
    });

    it('should have a card for each of five candidates', async () => {
        candidates = FIVE;
        serve();
        show();
        const sheet = await openSheet('USA');
        expect(letters(sheet)).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(buttons(sheet).map(statusOfCard)).toEqual(Array(5).fill('No known position'));
    });
});
