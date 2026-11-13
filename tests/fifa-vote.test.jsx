//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-vote.test.jsx
//  Description: A reader sets the position of an association on a candidate ("Your vote": For, Against, No position, Remove my vote) and the
//               last vote of any reader decides for everyone: the vote is sent, the colour, the list and the tooltip follow it, the reading
//               of the news stays under it, taking the vote back falls back to that reading, a newer reading never changes the colour on
//               its own, a refusal is said. The votes and the answers are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ALL_LEVELS, COARSE_LEVELS, MOCK_SUBJECTS, answerVote, buildMock} from '../bench/fifa/mock-data.mjs';

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
// and a wait for what comes after a step is longer than the 1 s of the library
configure({asyncUtilTimeout: 10000});

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

// the votes given in a test, answered as the server would: the sheets and the answer to a vote are built again with them
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
const show = (url = '/fifa') => render(<MemoryRouter initialEntries={[url]}><FifaBoard reader="reader"/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
const qidOf = (fifa) => buildMock().map.members.find(member => member.fifa === fifa).qid;
// the sheet, read on its first candidate
const openSheet = async (fifa) => {
    fireEvent.click(shape(fifa));
    const sheet = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
    await within(sheet).findAllByRole('region', {name: /^Mock candidate [A-E]$/});
    return sheet;
};
// the control of a candidate: it is under "Or change the position", which is opened when it is not
const control = (sheet, candidate = 'A') => {
    const card = within(sheet).getByRole('region', {name: `Mock candidate ${candidate}`});
    const toggle = within(card).getByRole('button', {name: 'Or change the position'});
    if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
    return within(card).getByRole('group', {name: /^Your vote: /});
};

beforeEach(() => {
    given = [];
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the map with the votes of readers in it', () => {
    it('should colour an association the news say nothing of by the vote that was set, and say so', async () => {
        show();
        await mapReady();
        // Mexico: no reading of the news, a reader voted For Mock candidate A
        expect(shape('MEX')).toHaveAttribute('data-kind', 'indicated');
        expect(shape('MEX')).toHaveAccessibleName('Mexico, MEX, CONCACAF: Support for Mock candidate A (set by a reader)');
        expect(shape('MEX').style.fill).toBe('var(--cand-1)');
    });

    it('should let a vote of "no position" or "against" take the colour the news gave, the news staying in the sheet', async () => {
        show();
        await mapReady();
        // Qatar: declared support in the news, a reader says "no position"; France: probable support for B, a reader says against
        expect(shape('QAT')).toHaveAttribute('data-kind', 'unknown');
        expect(shape('QAT')).toHaveAccessibleName('Qatar, QAT, AFC: No position (set by a reader)');
        expect(shape('FRA')).toHaveAttribute('data-kind', 'unknown');
        const sheet = await openSheet('QAT');
        const card = within(sheet).getByRole('region', {name: 'Mock candidate A'});
        expect(within(card).getByText('Set by Mock reader 1', {exact: false})).toBeInTheDocument();
        expect(within(card).getByText('AI reading from the news:')).toBeInTheDocument();
        expect(within(card).getAllByText('Declared support').length).toBeGreaterThan(0);
        // read-only: no button of a vote here, the reader chooses in the block above
        expect(within(card).queryByRole('button', {name: 'Or change the position'})).toBeNull();
    });

    it('should count a voted position like an established one in the filters and the counters', async () => {
        show('/fifa?level=indicated');
        await mapReady();
        // the votes: Mexico in (voted For), Qatar and France out (voted "no position" and against)
        expect(screen.queryByRole('button', {name: /^Mexico, MEX/})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /^Qatar, QAT/})).toBeNull();
        expect(screen.queryByRole('button', {name: /^France, FRA/})).toBeNull();
        expect(screen.getByText('12 of 211 associations match.')).toBeInTheDocument();
    });

    it('should show against as an opposition when its candidate is chosen, in a colour that is no candidate\'s', async () => {
        show('/fifa?c=QMOCK2');
        await mapReady();
        expect(shape('FRA')).toHaveAttribute('data-kind', 'indicated');
        expect(shape('FRA')).toHaveAccessibleName('France, FRA, UEFA: Opposition (set by a reader)');
        expect(shape('FRA').style.fill).toBe('var(--map-no-strong)');
    });

    it('should say in the legend how many positions a reader set, and the opposition only a reader gave when the news read none', async () => {
        serve(COARSE_LEVELS);
        show('/fifa?c=QMOCK2');
        await mapReady();
        const legend = screen.getByRole('list', {name: 'Legend'});
        expect(within(legend).getByText('Opposition (set by a reader)')).toBeInTheDocument();
        expect(screen.getByText(/positions? (was|were) set by a reader: the last vote of any reader decides/)).toBeInTheDocument();
    });

    it('should draw a vote whatever the levels the server enables: it is no level of the news', async () => {
        serve(COARSE_LEVELS);
        show();
        await mapReady();
        expect(shape('MEX')).toHaveAttribute('data-kind', 'indicated');
        expect(shape('MEX').style.fill).toBe('var(--cand-1)');
        // Kenya: the news read "probable support", not a level of the server here: unknown; a reader voted For
        expect(shape('KEN')).toHaveAttribute('data-kind', 'indicated');
    });

    it('should mark a position set by a reader in the list', async () => {
        show('/fifa?view=list&c=QMOCK1&level=indicated');
        const table = await screen.findByRole('table', {name: /^The associations/});
        const rowOf = (name) => within(table).getByRole('button', {name}).closest('tr');
        expect(within(rowOf(/^Mexico, MEX/)).getByText('Set by a reader')).toBeInTheDocument();
        expect(rowOf(/^Brazil, BRA/).textContent).not.toContain('Set by a reader');
    });
});

describe('the sheet, Your vote', () => {
    it('should offer For, Against, No position and Remove my vote on the candidate chosen in the list, and only on it', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        // Albania: the news hold something on A, B and C (a card each)
        const sheet = await openSheet('ALB');
        const group = control(sheet, 'A');
        for (const name of ['For', 'Against', 'No position']) expect(within(group).getByRole('button', {name})).toBeEnabled();
        // nothing to take back yet
        expect(within(group).getByRole('button', {name: 'Remove my vote'})).toBeDisabled();
        // the other candidates are read-only: no fold, no button of a vote (the chips show the candidate chosen only: "All" shows them)
        fireEvent.click(within(sheet).getByRole('radio', {name: 'All'}));
        for (const candidate of ['B', 'C']) {
            const card = within(sheet).getByRole('region', {name: `Mock candidate ${candidate}`});
            expect(within(card).queryByRole('button', {name: 'Or change the position'})).toBeNull();
            expect(within(card).queryByRole('button', {name: /^Confirm/})).toBeNull();
        }
        // and the block of the candidate leaned toward is not there: a candidate is chosen
        expect(within(sheet).queryByRole('heading', {name: /lean towards/})).toBeNull();
    });

    it('should send the vote, then the colour, the sheet and the tooltip follow it, the reading of the news staying under it', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        expect(shape('GER')).toHaveAttribute('data-kind', 'unknown');
        const sheet = await openSheet('GER');
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'For'}));
        await waitFor(() => expect(api.vote).toHaveBeenCalledWith({subject: 'QMOCK1', member: qidOf('GER'), value: 'for'}));
        await waitFor(() => expect(shape('GER')).toHaveAttribute('data-kind', 'indicated'));
        expect(shape('GER').style.fill).toBe('var(--cand-1)');
        expect(shape('GER')).toHaveAccessibleName('Germany, GER, UEFA: Support (set by a reader)');
        // the sheet read again: who set it, the news under it, the vote pressed
        expect(await within(sheet).findByText('Set by reader', {exact: false})).toBeInTheDocument();
        expect(within(within(sheet).getByRole('region', {name: 'Mock candidate A'})).getByText('AI reading from the news:')).toBeInTheDocument();
        expect(within(control(sheet)).getByRole('button', {name: 'For'})).toHaveAttribute('aria-pressed', 'true');
        expect(within(control(sheet)).getByRole('button', {name: 'Remove my vote'})).toBeEnabled();
        // the counters of the page
        expect(screen.getByText(/13 positions known/)).toBeInTheDocument();
    });

    it('should let a vote of "against" take a colour the news gave, and taking it back fall back to the reading of the news', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        // Brazil: declared support for A in the news
        expect(shape('BRA')).toHaveAccessibleName('Brazil, BRA, CONMEBOL: Declared support, 1 uncertain signal');
        const sheet = await openSheet('BRA');
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'Against'}));
        await waitFor(() => expect(api.vote).toHaveBeenLastCalledWith({subject: 'QMOCK1', member: qidOf('BRA'), value: 'against'}));
        // a candidate is chosen: against is shown, in the ink (never the colour of a candidate)
        await waitFor(() => expect(shape('BRA').style.fill).toBe('var(--map-no-strong)'));
        expect(shape('BRA')).toHaveAccessibleName(/^Brazil, BRA, CONMEBOL: Opposition \(set by a reader\)/);

        await waitFor(() => expect(within(control(sheet)).getByRole('button', {name: 'Remove my vote'})).toBeEnabled());
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'Remove my vote'}));
        await waitFor(() => expect(api.vote).toHaveBeenLastCalledWith({subject: 'QMOCK1', member: qidOf('BRA'), value: 'withdraw'}));
        await waitFor(() => expect(shape('BRA')).toHaveAttribute('data-kind', 'indicated'));
        expect(shape('BRA')).toHaveAccessibleName('Brazil, BRA, CONMEBOL: Declared support, 1 uncertain signal');
        expect(shape('BRA').style.fill).toBe('var(--cand-1)');
        expect(within(sheet).queryByText('AI reading from the news:')).toBeNull();
    });

    it('should leave the decisive vote of another reader standing when this reader takes theirs back', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        // Mexico: Reader 1 decides (Reader 2 took their vote back). This reader votes against, then takes it back: Reader 1 decides again
        const sheet = await openSheet('MEX');
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'Against'}));
        await waitFor(() => expect(shape('MEX').style.fill).toBe('var(--map-no-strong)'));
        await waitFor(() => expect(within(control(sheet)).getByRole('button', {name: 'Remove my vote'})).toBeEnabled());
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'Remove my vote'}));
        await waitFor(() => expect(shape('MEX').style.fill).toBe('var(--cand-1)'));
        expect(shape('MEX')).toHaveAccessibleName('Mexico, MEX, CONCACAF: Support (set by a reader)');
    });

    it('should say there is new evidence since the vote, and never change the colour on its own', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        const before = shape('KEN').style.fill;
        const sheet = await openSheet('KEN');
        const note = await within(sheet).findByText('New evidence since the vote.');
        expect(note.closest('[role=status]')).toHaveTextContent('vote again if the vote no longer holds');
        expect(shape('KEN').style.fill).toBe(before);
        expect(shape('KEN')).toHaveAccessibleName('Kenya, KEN, CAF: Support (set by a reader)');
        // no other candidate has the note
        expect(within(sheet).getAllByText('New evidence since the vote.')).toHaveLength(1);
    });

    it('should list the votes, who, when, what, the ones taken back too, in the tab Notes', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        const sheet = await openSheet('MEX');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
        const history = await within(sheet).findByRole('region', {name: 'Position history'});
        const lines = within(history).getAllByRole('listitem').map(item => item.textContent);
        expect(lines).toHaveLength(3);
        expect(lines[0]).toMatch(/Mock reader 1 · For · Mock candidate A/);
        expect(lines[1]).toMatch(/Mock reader 2 · Took the vote back · Mock candidate A/);
        expect(lines[2]).toMatch(/Mock reader 2 · For · Mock candidate A/);
    });

    it('should say a refusal under the control and change nothing: signed out, too many votes, anything else', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        const sheet = await openSheet('GER');
        const press = async (name) => {
            fireEvent.click(within(control(sheet)).getByRole('button', {name}));
            return await within(control(sheet)).findByRole('alert');
        };
        api.vote.mockResolvedValueOnce({error: 'Forbidden, invalid or expired', status: 401});
        expect(await press('For')).toHaveTextContent('Sign in to vote.');
        api.vote.mockResolvedValueOnce({error: 'Too many votes: wait a moment.', status: 429});
        expect(await press('For')).toHaveTextContent('Too many votes in a short time. Wait a moment and try again.');
        api.vote.mockResolvedValueOnce({error: 'Unknown association, candidate or value.', status: 400});
        expect(await press('Against')).toHaveTextContent('Unknown association, candidate or value.');
        api.vote.mockRejectedValueOnce(new Error('network'));
        expect(await press('For')).toHaveTextContent('The vote could not be sent');
        expect(shape('GER')).toHaveAttribute('data-kind', 'unknown');
        expect(within(control(sheet)).getByRole('button', {name: 'Remove my vote'})).toBeDisabled();
    });
});
