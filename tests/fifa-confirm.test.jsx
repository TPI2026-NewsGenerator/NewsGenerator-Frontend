//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-confirm.test.jsx
//  Description: "Confirm this position ✓", the main action of the card of a candidate in the sheet of an association: a reader validates by hand the
//               position the news give, the heaviest word there is, so the map draws it SOLID (the declared level of the same side) while the
//               confirmation holds, and who confirmed is said. It is no decision (no "Set by a reader"): a vote still wins over it. A confirmation of a
//               position that has since changed is told apart ("before the latest news") and draws the news' own level again. The choices of a vote
//               (For, Against, No position, Remove my vote) are under "Or change the position", closed; taking one's vote back takes both away,
//               and the dots come back when nobody else confirmed
//
//  The positions, the readers and their confirmations are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ALL_LEVELS, MOCK_SUBJECTS, answerVote, buildMock} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
// and a wait for what comes after a step is longer than the 1 s of the library
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

// the votes given in a test, answered as the server would
let given = [];
const serve = () => {
    const mock = buildMock();
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => buildMock({votes: given}).association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
    api.vote.mockImplementation(async body => answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body, by: 'reader'}));
};
// the button and the fold are in the card of the candidate chosen in the list: Mock candidate A, but where it is said
const show = (url = '/fifa?c=QMOCK1') => render(<MemoryRouter initialEntries={[url]}><FifaBoard reader="reader"/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
const qidOf = (fifa) => buildMock().map.members.find(member => member.fifa === fifa).qid;
const dateOf = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});

const openCard = async (fifa, candidate = 'A') => {
    fireEvent.click(shape(fifa));
    const sheet = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
    return await within(sheet).findByRole('region', {name: `Mock candidate ${candidate}`});
};
const confirmButton = (card) => within(card).getByRole('button', {name: /^Confirm/});
const toggleOf = (card) => within(card).getByRole('button', {name: 'Or change the position'});
const choices = (card) => within(card).getByRole('group', {name: /^Your vote: /});
const openFold = (card) => { if (toggleOf(card).getAttribute('aria-expanded') === 'false') fireEvent.click(toggleOf(card)); return choices(card); };

beforeEach(() => {
    given = [];
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the button "Confirm this position ✓"', () => {
    it('should be the main action of the card, "Confirm: no position" when the position is unknown', async () => {
        show();
        await mapReady();
        // Brazil: declared support for A. Germany: no position on A
        const brazil = await openCard('BRA');
        expect(confirmButton(brazil)).toHaveAccessibleName('Confirm this position ✓');
        fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'});
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const germany = await openCard('GER');
        expect(confirmButton(germany)).toHaveAccessibleName('Confirm: no position');
        // a button of the primary kind, before the fold
        expect(confirmButton(germany).className).toContain('bg-action');
        expect(toggleOf(germany).compareDocumentPosition(confirmButton(germany)) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it('should send "confirm", then say who confirmed and when, and show "Confirmed ✓" for the reader\'s own confirmation', async () => {
        show();
        await mapReady();
        const card = await openCard('BRA');
        expect(within(card).queryByText(/^Confirmed by/)).toBeNull();
        fireEvent.click(confirmButton(card));
        await waitFor(() => expect(api.vote).toHaveBeenCalledWith({subject: 'QMOCK1', member: qidOf('BRA'), value: 'confirm'}));
        const line = await within(card).findByText(/^Confirmed by reader/);
        expect(line).toHaveTextContent(`Confirmed by reader · ${dateOf(new Date())}`);
        const done = within(card).getByRole('button', {name: 'Confirmed ✓'});
        expect(done).toBeDisabled();
        expect(within(card).queryByRole('button', {name: /^Confirm this position/})).toBeNull();
    });

    it('should say a confirmed declared position is confirmed, and draw it solid as before: no "Set by a reader", the counters as they were', async () => {
        show();
        await mapReady();
        const before = {label: shape('BRA').getAttribute('aria-label'), fill: shape('BRA').style.fill, kind: shape('BRA').dataset.kind};
        const counters = screen.getByText(/positions? known · /).textContent;
        const card = await openCard('BRA');
        expect(within(card).queryByText('Confirmed by a reader')).toBeNull();
        fireEvent.click(confirmButton(card));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        // the news said declared already: the same solid colour, the same words on the map, and no "promoted"
        expect(shape('BRA').getAttribute('aria-label')).toBe(before.label);
        expect(shape('BRA').style.fill).toBe(before.fill);
        expect(shape('BRA').dataset.kind).toBe(before.kind);
        expect(shape('BRA')).not.toHaveAttribute('data-pattern');
        expect(screen.getByText(/positions? known · /).textContent).toBe(counters);
        // the card: a reader confirmed it, nobody decided it, the news under it
        expect(await within(card).findByText('Confirmed by a reader')).toBeInTheDocument();
        expect(within(card).queryByText(/^Set by /)).toBeNull();
        expect(within(card).queryByText('Set by a reader')).toBeNull();
        expect(within(card).getByText('AI reading from the news:').parentElement).toHaveTextContent('Declared support');
    });

    it('should make a probable position solid when a reader confirms it, on the same side, and say what the news read', async () => {
        show();
        await mapReady();
        // Peru, next to Brazil: probable support for A, drawn with dots
        expect(shape('PER')).toHaveAttribute('data-pattern', 'fifa-dots-1');
        expect(shape('PER')).toHaveAccessibleName(/^Peru, PER, CONMEBOL: Probable support$/);
        const counters = screen.getByText(/positions? known · /).textContent;
        const card = await openCard('PER');
        expect(within(card).getByText('Probable support')).toBeInTheDocument();
        expect(within(card).queryByText('Confirmed by a reader')).toBeNull();
        fireEvent.click(confirmButton(card));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        // solid now: the colour of the candidate, no pattern, the declared level of the same side
        await waitFor(() => expect(shape('PER')).not.toHaveAttribute('data-pattern'));
        expect(shape('PER').style.fill).toBe('var(--cand-1)');
        expect(shape('PER')).toHaveAccessibleName('Peru, PER, CONMEBOL: Declared support (confirmed by a reader)');
        expect(shape('PER')).toHaveAttribute('data-kind', 'indicated');
        // the same positions known: a confirmation changes the way it is drawn, not whether it is one
        expect(screen.getByText(/positions? known · /).textContent).toBe(counters);
        // the card: the declared position, "Confirmed by a reader", and under it what the news read (dots)
        expect(await within(card).findByText('Confirmed by a reader')).toBeInTheDocument();
        expect(within(card).getByText('Declared support')).toBeInTheDocument();
        const news = within(card).getByText('AI reading from the news:').parentElement;
        expect(news).toHaveTextContent('Probable support');
        expect(news.querySelector('[id="fifa-dots-key-1"]')).not.toBeNull();
        // no decision: nothing "set by a reader", no choice pressed
        expect(within(card).queryByText('Set by a reader')).toBeNull();
        expect(shape('PER').getAttribute('aria-label')).not.toContain('set by a reader');
    });

    it('should make a probable opposition solid on the same side, never a candidate\'s colour', async () => {
        show('/fifa?c=QMOCK1');
        await mapReady();
        // Norway: probable opposition to A
        expect(shape('NOR')).toHaveAttribute('data-pattern', 'fifa-dots-no');
        const card = await openCard('NOR');
        fireEvent.click(confirmButton(card));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        await waitFor(() => expect(shape('NOR')).not.toHaveAttribute('data-pattern'));
        expect(shape('NOR').style.fill).toBe('var(--map-no-strong)');
        expect(shape('NOR')).toHaveAccessibleName('Norway, NOR, UEFA: Declared opposition (confirmed by a reader)');
    });

    it('should come with a position a reader confirmed already solid, the news said apart', async () => {
        show();
        await mapReady();
        // Morocco: probable support in the news, confirmed by a reader: sent declared
        expect(shape('MAR')).not.toHaveAttribute('data-pattern');
        expect(shape('MAR').style.fill).toBe('var(--cand-1)');
        expect(shape('MAR')).toHaveAccessibleName('Morocco, MAR, CAF: Declared support (confirmed by a reader)');
        const card = await openCard('MAR');
        expect(within(card).getByText('Confirmed by a reader')).toBeInTheDocument();
        expect(within(card).getByText('AI reading from the news:').parentElement).toHaveTextContent('Probable support');
        // the sentences are the news': read as probable, and said to be drawn solid
        expect(within(card).getByRole('group', {name: 'Probable sentences on Mock candidate A'})).toHaveTextContent('drawn solid on the map: a reader confirmed this position');
        expect(within(card).queryByRole('group', {name: 'Declared sentences on Mock candidate A'})).toBeNull();
    });

    it('should mark a position of the list that a confirmation made solid', async () => {
        show('/fifa?view=list&c=QMOCK1&level=indicated');
        const table = await screen.findByRole('table', {name: /^The associations/});
        const rowOf = (name) => within(table).getByRole('button', {name}).closest('tr');
        expect(within(rowOf(/^Morocco, MAR/)).getByText('Confirmed by a reader')).toBeInTheDocument();
        // Nigeria: confirmed by two readers, declared already: nothing was made solid
        expect(rowOf(/^Nigeria, NGA/).textContent).not.toContain('Confirmed by a reader');
    });

    it('should say what other readers confirmed, and still offer the button to a reader who did not', async () => {
        show();
        await mapReady();
        // Nigeria: two readers confirmed the declared support
        const expected = buildMock().map.members.find(member => member.fifa === 'NGA').positions.QMOCK1.confirmed;
        expect(expected.count).toBe(2);
        const card = await openCard('NGA');
        expect(within(card).getByText(/^Confirmed by Mock reader 3, Mock reader 1/)).toHaveTextContent(`Confirmed by Mock reader 3, Mock reader 1 · ${dateOf(expected.at)}`);
        expect(confirmButton(card)).toHaveAccessibleName('Confirm this position ✓');
        expect(confirmButton(card)).toBeEnabled();
        // joining them: the three names, the newest first
        fireEvent.click(confirmButton(card));
        expect(await within(card).findByText(/^Confirmed by reader, Mock reader 3, Mock reader 1/)).toBeInTheDocument();
        expect(within(card).getByRole('button', {name: 'Confirmed ✓'})).toBeDisabled();
    });

    it('should say "Confirmed before the latest news" when only a confirmation of a position that has changed stands, draw the news\' own level, and offer the button again', async () => {
        show();
        await mapReady();
        // Egypt: a reader confirmed "declared support", the news have weakened it to probable since: dots, the news' own level
        expect(shape('EGY')).toHaveAttribute('data-pattern', 'fifa-dots-1');
        const card = await openCard('EGY');
        expect(within(card).getByText('Confirmed before the latest news')).toBeInTheDocument();
        expect(within(card).queryByText(/^Confirmed by/)).toBeNull();
        expect(within(card).queryByText('Confirmed by a reader')).toBeNull();
        expect(within(card).getByText('Probable support')).toBeInTheDocument();
        expect(confirmButton(card)).toHaveAccessibleName('Confirm this position ✓');
        // confirmed again, on the position of today: the note goes, the line comes, the colour is solid
        fireEvent.click(confirmButton(card));
        await within(card).findByText(/^Confirmed by reader/);
        expect(within(card).queryByText('Confirmed before the latest news')).toBeNull();
        await waitFor(() => expect(shape('EGY')).not.toHaveAttribute('data-pattern'));
        expect(shape('EGY')).toHaveAccessibleName(/^Egypt, EGY, CAF: Declared support \(confirmed by a reader\)/);
    });

    it('should show a pair with nothing but a confirmation of "no position", and promote nothing', async () => {
        show('/fifa?c=QMOCK2');
        await mapReady();
        // Germany on B: a reader confirmed that there is no position
        const card = await openCard('GER', 'B');
        expect(within(card).getByText(/^Confirmed by Mock reader 1/)).toBeInTheDocument();
        expect(confirmButton(card)).toHaveAccessibleName('Confirm: no position');
        // a confirmation of "no position" makes nothing solid
        expect(shape('GER')).toHaveAttribute('data-kind', 'unknown');
        expect(shape('GER').style.fill).toBe('var(--map-unknown)');
    });

    it('should say a refusal under the button and change nothing', async () => {
        show();
        await mapReady();
        const card = await openCard('BRA');
        api.vote.mockResolvedValueOnce({error: 'Too many votes: wait a moment.', status: 429});
        fireEvent.click(confirmButton(card));
        expect(await within(card).findByRole('alert')).toHaveTextContent('Too many votes in a short time. Wait a moment and try again.');
        expect(confirmButton(card)).toBeEnabled();
        expect(within(card).queryByText(/^Confirmed by reader/)).toBeNull();
    });
});

describe('Or change the position', () => {
    it('should hide the choices of a vote until it is opened, and hide them again', async () => {
        show();
        await mapReady();
        const card = await openCard('GER');
        expect(toggleOf(card)).toHaveAttribute('aria-expanded', 'false');
        expect(within(card).queryByRole('group', {name: /^Your vote: /})).toBeNull();
        for (const name of ['For', 'Against', 'No position', 'Remove my vote']) expect(within(card).queryByRole('button', {name})).toBeNull();
        fireEvent.click(toggleOf(card));
        expect(toggleOf(card)).toHaveAttribute('aria-expanded', 'true');
        for (const name of ['For', 'Against', 'No position', 'Remove my vote']) expect(within(choices(card)).getByRole('button', {name})).toBeInTheDocument();
        fireEvent.click(toggleOf(card));
        expect(within(card).queryByRole('group', {name: /^Your vote: /})).toBeNull();
    });

    it('should keep a decision when it is confirmed after: a confirmation is no decision, the choice stays pressed', async () => {
        show();
        await mapReady();
        const card = await openCard('GER');
        fireEvent.click(within(openFold(card)).getByRole('button', {name: 'For'}));
        await waitFor(() => expect(shape('GER')).toHaveAttribute('data-kind', 'indicated'));
        await within(card).findByText(/^Set by reader/);
        fireEvent.click(confirmButton(card));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        // the decision stands, the colour is the one of the vote, For is still the choice pressed
        expect(shape('GER')).toHaveAccessibleName('Germany, GER, UEFA: Support (set by a reader)');
        expect(within(choices(card)).getByRole('button', {name: 'For'})).toHaveAttribute('aria-pressed', 'true');
        expect(within(card).getByText('Set by a reader')).toBeInTheDocument();
    });

    it('should not take a confirmation for a decision: after only a confirmation no choice is pressed', async () => {
        show();
        await mapReady();
        const card = await openCard('BRA');
        fireEvent.click(confirmButton(card));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        for (const name of ['For', 'Against', 'No position']) expect(within(openFold(card)).getByRole('button', {name})).toHaveAttribute('aria-pressed', 'false');
    });

    it('should let "Remove my vote" take a confirmation away, and a decision and a confirmation together', async () => {
        show();
        await mapReady();
        const card = await openCard('GER');
        // nothing of this reader yet: nothing to remove
        expect(within(openFold(card)).getByRole('button', {name: 'Remove my vote'})).toBeDisabled();
        // a confirmation alone can be removed
        fireEvent.click(confirmButton(card));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        await waitFor(() => expect(within(choices(card)).getByRole('button', {name: 'Remove my vote'})).toBeEnabled());
        fireEvent.click(within(choices(card)).getByRole('button', {name: 'Remove my vote'}));
        await waitFor(() => expect(api.vote).toHaveBeenLastCalledWith({subject: 'QMOCK1', member: qidOf('GER'), value: 'withdraw'}));
        await waitFor(() => expect(within(card).queryByRole('button', {name: 'Confirmed ✓'})).toBeNull());
        expect(confirmButton(card)).toBeEnabled();
        // a decision and a confirmation: both go
        fireEvent.click(within(choices(card)).getByRole('button', {name: 'Against'}));
        await waitFor(() => expect(within(choices(card)).getByRole('button', {name: 'Against'})).toHaveAttribute('aria-pressed', 'true'));
        fireEvent.click(confirmButton(card));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        fireEvent.click(within(choices(card)).getByRole('button', {name: 'Remove my vote'}));
        await waitFor(() => expect(within(card).queryByRole('button', {name: 'Confirmed ✓'})).toBeNull());
        await waitFor(() => expect(within(choices(card)).getByRole('button', {name: 'Against'})).toHaveAttribute('aria-pressed', 'false'));
        expect(within(card).queryByText(/^Set by /)).toBeNull();
        expect(shape('GER')).toHaveAttribute('data-kind', 'unknown');
    });
});

describe('what a confirmation makes solid, a vote, a withdrawal', () => {
    it('should bring the dots back when the reader takes their confirmation away and nobody else confirmed', async () => {
        show();
        await mapReady();
        const card = await openCard('PER');
        fireEvent.click(confirmButton(card));
        await waitFor(() => expect(shape('PER')).not.toHaveAttribute('data-pattern'));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        await waitFor(() => expect(within(openFold(card)).getByRole('button', {name: 'Remove my vote'})).toBeEnabled());
        fireEvent.click(within(choices(card)).getByRole('button', {name: 'Remove my vote'}));
        await waitFor(() => expect(api.vote).toHaveBeenLastCalledWith({subject: 'QMOCK1', member: qidOf('PER'), value: 'withdraw'}));
        // the probable position of the news, with its dots, and nothing confirmed
        await waitFor(() => expect(shape('PER')).toHaveAttribute('data-pattern', 'fifa-dots-1'));
        expect(shape('PER')).toHaveAccessibleName(/^Peru, PER, CONMEBOL: Probable support$/);
        await waitFor(() => expect(within(card).queryByText('Confirmed by a reader')).toBeNull());
        expect(within(card).queryByRole('button', {name: 'Confirmed ✓'})).toBeNull();
        expect(within(card).queryByText('AI reading from the news:')).toBeNull();
        expect(confirmButton(card)).toBeEnabled();
    });

    it('should leave it solid when another reader\'s confirmation still holds after this reader took theirs away', async () => {
        show();
        await mapReady();
        // Morocco: confirmed by another reader; this reader confirms too, then takes theirs back
        const card = await openCard('MAR');
        fireEvent.click(confirmButton(card));
        expect(await within(card).findByText(/^Confirmed by reader, Mock reader 3/)).toBeInTheDocument();
        await waitFor(() => expect(within(openFold(card)).getByRole('button', {name: 'Remove my vote'})).toBeEnabled());
        fireEvent.click(within(choices(card)).getByRole('button', {name: 'Remove my vote'}));
        await waitFor(() => expect(within(card).getByRole('button', {name: /^Confirm this position/})).toBeEnabled());
        expect(within(card).getByText(/^Confirmed by Mock reader 3/)).toBeInTheDocument();
        expect(shape('MAR')).not.toHaveAttribute('data-pattern');
        expect(shape('MAR').style.fill).toBe('var(--cand-1)');
    });

    it('should let a decisive vote win over a confirmation: its colour and its mark, no "Confirmed by a reader"; taking it back lets the confirmation decide', async () => {
        show();
        await mapReady();
        // Morocco: probable in the news, confirmed by a reader (solid). This reader votes against
        const card = await openCard('MAR');
        expect(within(card).getByText('Confirmed by a reader')).toBeInTheDocument();
        fireEvent.click(within(openFold(card)).getByRole('button', {name: 'Against'}));
        await waitFor(() => expect(shape('MAR')).toHaveAccessibleName(/^Morocco, MAR, CAF: Opposition \(set by a reader\)/));
        await within(card).findByText('Set by a reader');
        expect(within(card).queryByText('Confirmed by a reader')).toBeNull();
        expect(within(card).getByText('AI reading from the news:').parentElement).toHaveTextContent('Probable support');
        // the confirmation is still said, and still counted
        expect(within(card).getByText(/^Confirmed by Mock reader 3/)).toBeInTheDocument();
        // the vote taken back: the confirmation holds, solid again
        await waitFor(() => expect(within(choices(card)).getByRole('button', {name: 'Remove my vote'})).toBeEnabled());
        fireEvent.click(within(choices(card)).getByRole('button', {name: 'Remove my vote'}));
        await waitFor(() => expect(shape('MAR')).toHaveAccessibleName('Morocco, MAR, CAF: Declared support (confirmed by a reader)'));
        await waitFor(() => expect(within(card).queryByText('Set by a reader')).toBeNull());
        expect(within(card).getByText('Confirmed by a reader')).toBeInTheDocument();
    });
});

describe('the history of the votes', () => {
    it('should list the confirmations too, with the position the reader saw', async () => {
        show();
        await mapReady();
        const card = await openCard('NGA');
        const sheet = card.closest('[role=dialog]');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
        const history = await within(sheet).findByRole('region', {name: 'Position history'});
        const lines = within(history).getAllByRole('listitem').map(item => item.textContent);
        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatch(/Mock reader 3 · Confirmed ✓ \(saw: Declared support\) · Mock candidate A/);
        expect(lines[1]).toMatch(/Mock reader 1 · Confirmed ✓ \(saw: Declared support\) · Mock candidate A/);
    });

    it('should add the confirmation of the reader to it, and the withdrawal that takes it back', async () => {
        show();
        await mapReady();
        const card = await openCard('BRA');
        const sheet = card.closest('[role=dialog]');
        fireEvent.click(confirmButton(card));
        await within(card).findByRole('button', {name: 'Confirmed ✓'});
        fireEvent.click(within(openFold(card)).getByRole('button', {name: 'Remove my vote'}));
        await waitFor(() => expect(within(card).queryByRole('button', {name: 'Confirmed ✓'})).toBeNull());
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
        const history = await within(sheet).findByRole('region', {name: 'Position history'});
        const lines = within(history).getAllByRole('listitem').map(item => item.textContent);
        expect(lines[0]).toMatch(/reader · Took the vote back · Mock candidate A/);
        expect(lines[1]).toMatch(/reader · Confirmed ✓ \(saw: Declared support\) · Mock candidate A/);
    });
});
