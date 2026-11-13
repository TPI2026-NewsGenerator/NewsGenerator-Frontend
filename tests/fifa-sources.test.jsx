//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-sources.test.jsx
//  Description: A reader joins a SOURCE (the link of a page that says it) to their choice: the optional field "Add a source (link)" in the block "which candidate
//               does it lean towards" and in the card of the candidate chosen ("Or change the position"), sent with the candidate chosen or the For / Against
//               (never with Confirm, No position or None), the refusals of the server said under the control, the sources listed under the position of each
//               candidate with what the AI made of the page (Checking…, The page says it, The page says the opposite, Could not be confirmed, The page could
//               not be read), and the sheet that reads itself again while a source is being read
//
//  The associations, the readers, the sources and the answers are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ALL_LEVELS, MOCK_SUBJECTS, SOURCE_READ_MS, answerLean, answerVote, buildMock, readSourceInput} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn(), lean: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));
// the sheet reads itself again 30 s after a source was found pending: here after 60 ms, to see it happen
vi.mock('@/features/fifa/sourceChecks.js', async (original) => ({...(await original()), RECHECK_AFTER_MS: 60}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

// what the server does with the source of a request: the same checks as the mock API (422 / 400), then the choice is recorded with it
const refuse = (body) => {
    if (body.source === undefined) return null;
    if (!['for', 'against'].includes(body.value ?? 'for')) return {error: 'A source goes with a choice of a candidate (For or Against), not with this one.', status: 422};
    const read = readSourceInput(body.source);
    return read.error ? {error: read.error, status: read.status} : null;
};
const recorded = (body) => ({...body, ...(body.source !== undefined ? {source: {url: readSourceInput(body.source).url}} : {})});

let given = [];
const serve = () => {
    const mock = buildMock();
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => buildMock({votes: given}).association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
    api.vote.mockImplementation(async body => refuse(body) ?? answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: recorded(body), by: 'reader'}));
    api.lean.mockImplementation(async body => refuse({...body, value: body.subject === 'none' || body.subject === 'withdraw' ? 'none' : 'for'})
        ?? answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: recorded(body), by: 'reader'}));
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
const cardOf = (sheet, candidate = 'A') => within(sheet).getByRole('region', {name: `Mock candidate ${candidate}`});
// the control of a candidate, under "Or change the position"
const control = (sheet, candidate = 'A') => {
    const card = cardOf(sheet, candidate);
    const toggle = within(card).getByRole('button', {name: 'Or change the position'});
    if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
    return within(card).getByRole('group', {name: /^Your vote: /});
};
const blockOf = (sheet) => within(sheet).getByRole('region', {name: /^Which candidate does .* lean towards\?$/});
const sourcesOf = (card, name = 'Mock candidate A') => within(card).queryByRole('group', {name: `Sources joined to the choices on ${name}`});
const FIELD = 'Add a source (link)';
// a control is disabled while its choice is being sent
const enabled = (get) => waitFor(() => expect(get()).toBeEnabled());
const LINK = 'https://www.newspaper.example/gabon-article';

beforeEach(() => {
    given = [];
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the mock: sources', () => {
    it('should check the link as the server does: 422 not an address, a password, over 500 characters; 400 a private address', () => {
        expect(readSourceInput(LINK)).toEqual({url: LINK});
        expect(readSourceInput({url: `  ${LINK} `})).toEqual({url: LINK});
        for (const bad of ['nope', 'ftp://files.example/a', 'javascript:alert(1)', '', 12, {}]) expect(readSourceInput(bad)).toMatchObject({status: 422});
        expect(readSourceInput('https://reader:secret@newspaper.example/a')).toMatchObject({status: 422});
        expect(readSourceInput(`https://newspaper.example/${'a'.repeat(500)}`)).toMatchObject({status: 422});
        for (const home of ['http://localhost/a', 'http://127.0.0.1/a', 'http://10.1.2.3/a', 'http://192.168.0.5/a', 'http://172.20.0.1/a', 'http://169.254.1.1/a', 'http://printer.local/a']) {
            expect(readSourceInput(home)).toMatchObject({status: 400});
        }
    });

    it('should keep the source with the choice: pending while the AI reads, then what it made of the page', () => {
        const mock = buildMock();
        answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: qidOf('GER'), subject: 'QMOCK1', value: 'for', source: {url: LINK}}, by: 'reader'});
        const sheet = (now) => buildMock({votes: given, now}).association(qidOf('GER'));
        expect(sheet(Date.now()).sources).toEqual([expect.objectContaining({subject_qid: 'QMOCK1', value: 'for', by: 'reader', url: LINK, medium: 'newspaper.example', check: 'pending', found: null, checked_at: null})]);
        const later = sheet(Date.now() + SOURCE_READ_MS + 1000);
        expect(later.sources[0]).toMatchObject({check: 'says', found: '[Mock sentence in en] The association will back Mock candidate A.'});
        expect(later.sources[0].checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        // the same source on the decision that stands, and on the row of the vote
        expect(buildMock({votes: given}).map.members.find(member => member.fifa === 'GER').positions.QMOCK1.human.source).toMatchObject({url: LINK, check: 'pending'});
        expect(sheet(Date.now()).votes[0].source).toMatchObject({url: LINK});
        expect(mock.association(qidOf('GER')).sources).toEqual([]);
    });

    it('should say what the page says from a word of its address: the opposite, unclear, unreadable', () => {
        const checks = {};
        for (const word of ['contradicts', 'unclear', 'unreadable', 'plain']) {
            given.length = 0;
            answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: qidOf('GER'), subject: 'QMOCK2', value: 'against', source: {url: `https://newspaper.example/${word}`}}, by: 'reader'});
            checks[word] = buildMock({votes: given, now: Date.now() + SOURCE_READ_MS + 1000}).association(qidOf('GER')).sources[0];
        }
        expect(checks.contradicts).toMatchObject({check: 'contradicts', found: '[Mock sentence in en] The association will back Mock candidate B.'});
        expect(checks.plain).toMatchObject({check: 'says', found: '[Mock sentence in en] The association will not back Mock candidate B.'});
        expect(checks.unclear).toMatchObject({check: 'unclear', found: null});
        expect(checks.unreadable).toMatchObject({check: 'unreadable', found: null});
    });

    it('should list only the sources of the choices that stand: a withdrawal, a "no position" or a later choice takes one out', () => {
        const ger = qidOf('GER');
        const say = (body) => answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: ger, subject: 'QMOCK1', ...body}, by: 'reader'});
        say({value: 'for', source: {url: LINK}});
        expect(buildMock({votes: given}).association(ger).sources).toHaveLength(1);
        say({value: 'confirm'});
        expect(buildMock({votes: given}).association(ger).sources).toHaveLength(1);
        say({value: 'unknown'});
        expect(buildMock({votes: given}).association(ger).sources).toHaveLength(0);
        say({value: 'against', source: {url: `${LINK}-2`}});
        say({value: 'withdraw'});
        expect(buildMock({votes: given}).association(ger).sources).toHaveLength(0);
        // the sources of the seed: Mexico (the page says it), Kenya (the opposite), France (unclear), newest first
        const seed = (fifa) => buildMock().association(qidOf(fifa)).sources.map(one => [one.by, one.check]);
        expect(seed('MEX')).toEqual([['Mock reader 1', 'says']]);
        expect(seed('KEN')).toEqual([['Mock reader 3', 'contradicts']]);
        expect(seed('FRA')).toEqual([['Mock reader 2', 'unclear']]);
    });

    it('should join a source and a note to the FOR vote of the candidate chosen, even when the choice already stands', () => {
        const mex = qidOf('MEX');
        const first = answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: mex, subject: 'QMOCK2', source: {url: LINK}, note: 'seen on the radio'}, by: 'reader'});
        expect(first.positions.QMOCK2.human).toMatchObject({value: 'for', by: 'reader', source: {url: LINK}});
        expect(buildMock({votes: given}).association(mex).sources[0]).toMatchObject({subject_qid: 'QMOCK2', value: 'for', note: 'seen on the radio'});
        // the same choice again, with a link: it is written (it carries the link)
        expect(answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: mex, subject: 'QMOCK2', source: {url: `${LINK}-b`}}, by: 'reader'}).written).toBe(1);
    });
});

describe('the field in the card of a candidate (a candidate chosen in the list)', () => {
    it('should be under "Or change the position", optional, with what it does said under it', async () => {
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        const group = control(sheet);
        const field = within(group).getByLabelText(FIELD);
        expect(field).toHaveValue('');
        expect(field).toHaveAttribute('placeholder', 'https://…');
        expect(within(group).getByText(/Optional: the link of a page that says it\. It goes with For or Against/)).toBeInTheDocument();
        // not in the block of the choice, that a candidate chosen does not have
        expect(within(sheet).queryByRole('region', {name: /lean towards/})).toBeNull();
    });

    it('should send the link with For and empty the field, then list the source under the candidate, being checked', async () => {
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        fireEvent.change(within(control(sheet)).getByLabelText(FIELD), {target: {value: `  ${LINK}  `}});
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'For'}));
        await waitFor(() => expect(api.vote).toHaveBeenCalledWith({subject: 'QMOCK1', member: qidOf('GER'), value: 'for', source: LINK}));
        const sources = await waitFor(() => { const found = sourcesOf(cardOf(sheet)); expect(found).not.toBeNull(); return found; });
        const link = within(sources).getByRole('link', {name: /newspaper\.example/});
        expect(link).toHaveAttribute('href', LINK);
        expect(link).toHaveAttribute('target', '_blank');
        expect(sources).toHaveTextContent('For · by reader');
        expect(within(sources).getByRole('status')).toHaveTextContent('Checking…');
        // the field is empty again
        expect(within(control(sheet)).getByLabelText(FIELD)).toHaveValue('');
        // the map is untouched by the page: the colour is the vote's, never the check's
        expect(shape('GER')).toHaveAttribute('data-kind', 'indicated');
    });

    it('should send the link with Against too, but never with No position, Remove my vote or Confirm', async () => {
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        fireEvent.change(within(control(sheet)).getByLabelText(FIELD), {target: {value: LINK}});
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'No position'}));
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(1));
        expect(api.vote.mock.calls[0][0]).toEqual({subject: 'QMOCK1', member: qidOf('GER'), value: 'unknown'});
        // the link is still in the field: nothing took it
        expect(within(control(sheet)).getByLabelText(FIELD)).toHaveValue(LINK);
        fireEvent.click(within(cardOf(sheet)).getByRole('button', {name: /^Confirm/}));
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(2));
        expect(api.vote.mock.calls[1][0]).not.toHaveProperty('source');
        await enabled(() => within(control(sheet)).getByRole('button', {name: 'Against'}));
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'Against'}));
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(3));
        expect(api.vote.mock.calls[2][0]).toEqual({subject: 'QMOCK1', member: qidOf('GER'), value: 'against', source: LINK});
    });

    it('should not send an empty link, or one made of spaces', async () => {
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        fireEvent.change(within(control(sheet)).getByLabelText(FIELD), {target: {value: '   '}});
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'For'}));
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(1));
        expect(api.vote.mock.calls[0][0]).toEqual({subject: 'QMOCK1', member: qidOf('GER'), value: 'for'});
    });

    it('should say the words of the server when it refuses the link, and keep the link in the field: not an address, a private one, too many a day', async () => {
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        const press = async (link) => {
            fireEvent.change(within(control(sheet)).getByLabelText(FIELD), {target: {value: link}});
            fireEvent.click(within(control(sheet)).getByRole('button', {name: 'For'}));
            return await within(control(sheet)).findByRole('alert');
        };
        expect(await press('not a link')).toHaveTextContent('This is not a web address: it starts with http:// or https://.');
        expect(within(control(sheet)).getByLabelText(FIELD)).toHaveValue('not a link');
        expect(await press('http://192.168.1.4/a')).toHaveTextContent('This address is private: give the link of a public page.');
        expect(await press('https://u:p@newspaper.example/a')).toHaveTextContent('The link holds a password');
        // the server limits the sources a day: its message is said, not the one of the votes a minute
        api.vote.mockResolvedValueOnce({error: 'You joined 20 sources today: try again tomorrow.', status: 429});
        expect(await press(LINK)).toHaveTextContent('You joined 20 sources today: try again tomorrow.');
        expect(within(control(sheet)).getByLabelText(FIELD)).toHaveValue(LINK);
        // nothing was written
        expect(given).toHaveLength(0);
        // without a link a 429 is still the one of the votes
        fireEvent.change(within(control(sheet)).getByLabelText(FIELD), {target: {value: ''}});
        api.vote.mockResolvedValueOnce({error: 'Too many votes: wait a moment.', status: 429});
        fireEvent.click(within(control(sheet)).getByRole('button', {name: 'For'}));
        expect(await within(control(sheet)).findByRole('alert')).toHaveTextContent('Too many votes in a short time. Wait a moment and try again.');
    });
});

describe('the field in the block "which candidate does it lean towards?" (no candidate chosen)', () => {
    it('should be in the block, saying that it goes with the candidate chosen and not with Confirm or None', async () => {
        show();
        const sheet = await openSheet('GER');
        const block = blockOf(sheet);
        expect(within(block).getByLabelText(FIELD)).toBeInTheDocument();
        expect(within(block).getByText(/It goes with the candidate you choose below \(not with Confirm nor None\)/)).toBeInTheDocument();
        // the cards below only read: no field there (Germany: a card for B only, the news hold nothing on A)
        expect(within(cardOf(sheet, 'B')).queryByLabelText(FIELD)).toBeNull();
    });

    it('should send the link with the candidate chosen, join it to the FOR vote, and list it under that candidate', async () => {
        show();
        const sheet = await openSheet('GER');
        fireEvent.change(within(blockOf(sheet)).getByLabelText(FIELD), {target: {value: LINK}});
        fireEvent.click(within(blockOf(sheet)).getByRole('button', {name: 'Mock candidate B'}));
        await waitFor(() => expect(api.lean).toHaveBeenCalledWith({member: qidOf('GER'), subject: 'QMOCK2', source: LINK}));
        const sources = await waitFor(() => { const found = sourcesOf(cardOf(sheet, 'B'), 'Mock candidate B'); expect(found).not.toBeNull(); return found; });
        expect(sources).toHaveTextContent('For · by reader');
        expect(within(sources).getByRole('link', {name: /newspaper\.example/})).toHaveAttribute('href', LINK);
        // under that candidate only: the one link of the sheet is in its list (Germany has no card for A, the news hold nothing on it)
        expect(within(sheet).getAllByRole('link', {name: /newspaper\.example/})).toHaveLength(1);
        expect(within(sheet).queryByRole('region', {name: 'Mock candidate A'})).toBeNull();
        expect(within(blockOf(sheet)).getByLabelText(FIELD)).toHaveValue('');
    });

    it('should not send the link with "Confirm" nor with "None / undecided", and keep it for the candidate chosen next', async () => {
        show();
        // India: the news show Mock candidate A (declared)
        const sheet = await openSheet('IND');
        fireEvent.change(within(blockOf(sheet)).getByLabelText(FIELD), {target: {value: LINK}});
        // Confirm goes through /votes, without the link
        fireEvent.click(within(blockOf(sheet)).getByRole('button', {name: 'Confirm Mock candidate A ✓'}));
        await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(1));
        expect(api.vote.mock.calls[0][0]).toEqual({subject: 'QMOCK1', member: qidOf('IND'), value: 'confirm'});
        expect(within(blockOf(sheet)).getByLabelText(FIELD)).toHaveValue(LINK);
        await enabled(() => within(blockOf(sheet)).getByRole('button', {name: 'None / undecided'}));
        fireEvent.click(within(blockOf(sheet)).getByRole('button', {name: 'None / undecided'}));
        await waitFor(() => expect(api.lean).toHaveBeenCalledTimes(1));
        expect(api.lean.mock.calls[0][0]).toEqual({member: qidOf('IND'), subject: 'none'});
        expect(within(blockOf(sheet)).getByLabelText(FIELD)).toHaveValue(LINK);
        // the block offers every candidate again: the one chosen takes the link
        const again = await within(blockOf(sheet)).findByRole('button', {name: 'Mock candidate A'});
        await enabled(() => within(blockOf(sheet)).getByRole('button', {name: 'Mock candidate A'}));
        fireEvent.click(again);
        await waitFor(() => expect(api.lean).toHaveBeenCalledTimes(2));
        expect(api.lean.mock.calls[1][0]).toEqual({member: qidOf('IND'), subject: 'QMOCK1', source: LINK});
    });

    it('should send nothing of the sort when the field is empty, and say the refusals of the server under the block', async () => {
        show();
        const sheet = await openSheet('GER');
        fireEvent.click(within(blockOf(sheet)).getByRole('button', {name: 'Mock candidate A'}));
        await waitFor(() => expect(api.lean).toHaveBeenCalledTimes(1));
        expect(api.lean.mock.calls[0][0]).toEqual({member: qidOf('GER'), subject: 'QMOCK1'});
        await enabled(() => within(blockOf(sheet)).getByRole('button', {name: 'Mock candidate B'}));
        fireEvent.change(within(blockOf(sheet)).getByLabelText(FIELD), {target: {value: 'http://localhost:3000/a'}});
        fireEvent.click(within(blockOf(sheet)).getByRole('button', {name: 'Mock candidate B'}));
        expect(await within(blockOf(sheet)).findByRole('alert')).toHaveTextContent('This address is private: give the link of a public page.');
        expect(within(blockOf(sheet)).getByLabelText(FIELD)).toHaveValue('http://localhost:3000/a');
    });
});

describe('the sources listed under the position of a candidate', () => {
    it('should say the medium as a link, who chose, when, and that the page says it, with its sentence (Mexico)', async () => {
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('MEX');
        const sources = sourcesOf(cardOf(sheet));
        const link = within(sources).getByRole('link', {name: /mockdaily\.example/});
        expect(link).toHaveAttribute('href', 'https://www.mockdaily.example/source-says/mex-congress');
        expect(sources).toHaveTextContent('For · by Mock reader 1');
        expect(within(sources).getByText('The page says it')).toBeInTheDocument();
        expect(sources).toHaveTextContent('The page says: “[Mock sentence in en] The association will back Mock candidate A.”');
        expect(sources).toHaveTextContent('The AI reads each page in the background. A source never changes a colour.');
        // it is no "Checking…" any more
        expect(within(sources).queryByRole('status')).toBeNull();
    });

    it('should warn when the page says the OTHER thing (Kenya), with the sentence it found', async () => {
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('KEN');
        const sources = sourcesOf(cardOf(sheet));
        const badge = within(sources).getByText('The page says the opposite');
        expect(badge).toHaveClass('text-accent-ink');
        expect(sources).toHaveTextContent('The page says: “[Mock sentence in en] The association will not back Mock candidate A.”');
    });

    it('should say "Could not be confirmed" as neutral and not wrong when the AI could not confirm it (France)', async () => {
        show('/fifa?c=QMOCK2');
        const sheet = await openSheet('FRA');
        const sources = sourcesOf(cardOf(sheet, 'B'), 'Mock candidate B');
        expect(sources).toHaveTextContent('Against · by Mock reader 2');
        const badge = within(sources).getByText('Could not be confirmed');
        expect(badge).toHaveClass('bg-paper-deep');
        expect(badge).not.toHaveClass('text-accent-ink');
        expect(sources).toHaveTextContent('The AI could not confirm it from the page. That does not make it wrong.');
        expect(within(sources).queryByText(/The page says:/)).toBeNull();
    });

    it('should say that the page could not be read', async () => {
        answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: qidOf('GER'), subject: 'QMOCK1', value: 'for', source: {url: 'https://newspaper.example/unreadable'}}, by: 'reader'});
        // read after the AI had time to read it
        api.association.mockImplementation(async qid => buildMock({votes: given, now: Date.now() + SOURCE_READ_MS + 1000}).association(qid));
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        const sources = sourcesOf(cardOf(sheet));
        expect(within(sources).getByText('The page could not be read')).toBeInTheDocument();
        expect(sources).toHaveTextContent('The page could not be opened or read.');
    });

    it('should show no list under a candidate that has none, and the sources of a candidate only under it', async () => {
        // Mexico holds a vote for A only: B is the candidate chosen in the list, so that it has a card too ("All" shows both)
        show('/fifa?c=QMOCK2');
        const sheet = await openSheet('MEX');
        fireEvent.click(within(sheet).getByRole('radio', {name: 'All'}));
        expect(sourcesOf(cardOf(sheet, 'A'))).not.toBeNull();
        expect(sourcesOf(cardOf(sheet, 'B'), 'Mock candidate B')).toBeNull();
        // the tab Notes does not list sources any more
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
        expect(await within(sheet).findByRole('heading', {name: 'Notes'})).toBeInTheDocument();
        expect(within(sheet).queryByText('mockdaily.example')).toBeNull();
    });

    it('should list them with the card of a candidate that is read-only too (no candidate chosen)', async () => {
        show();
        const sheet = await openSheet('KEN');
        expect(within(sourcesOf(cardOf(sheet))).getByText('The page says the opposite')).toBeInTheDocument();
    });
});

describe('a source being read', () => {
    it('should read the sheet again while one is pending, and show what the AI made of it, then stop', async () => {
        // the choice was written a moment ago: the first reading says pending, the next ones after the AI had time
        answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: qidOf('GER'), subject: 'QMOCK1', value: 'for', source: {url: LINK}}, by: 'reader'});
        let reads = 0;
        // the second reading is held until the test has seen "Checking…": the AI "takes its time", whatever the speed of the machine
        let release;
        const held = new Promise((done) => { release = done; });
        api.association.mockImplementation(async (qid) => {
            reads += 1;
            if (reads >= 2) await held;
            return buildMock({votes: given, now: Date.now() + (reads >= 2 ? SOURCE_READ_MS + 1000 : 0)}).association(qid);
        });
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        expect(within(sourcesOf(cardOf(sheet))).getByRole('status')).toHaveTextContent('Checking…');
        await waitFor(() => expect(reads).toBe(2));
        release();
        await waitFor(() => expect(within(sourcesOf(cardOf(sheet))).getByText('The page says it')).toBeInTheDocument());
        expect(reads).toBe(2);
        // nothing pending any more: no more readings
        await new Promise(done => setTimeout(done, 250));
        expect(reads).toBe(2);
    });

    it('should read again at most twice for a source that stays pending, then leave it as "Checking…"', async () => {
        answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: qidOf('GER'), subject: 'QMOCK1', value: 'for', source: {url: LINK}}, by: 'reader'});
        let reads = 0;
        api.association.mockImplementation(async (qid) => { reads += 1; return buildMock({votes: given, now: Date.now()}).association(qid); });
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        await waitFor(() => expect(reads).toBe(3));
        await new Promise(done => setTimeout(done, 300));
        expect(reads).toBe(3);
        expect(within(sourcesOf(cardOf(sheet))).getByRole('status')).toHaveTextContent('Checking…');
    });

    it('should not read again while an answer is still on its way: the wait starts from what the sheet has read', async () => {
        answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: qidOf('GER'), subject: 'QMOCK1', value: 'for', source: {url: LINK}}, by: 'reader'});
        let reads = 0;
        let release;
        const held = new Promise((done) => { release = done; });
        api.association.mockImplementation(async (qid) => {
            reads += 1;
            if (reads >= 2) await held;
            return buildMock({votes: given, now: Date.now()}).association(qid);
        });
        show('/fifa?c=QMOCK1');
        await openSheet('GER');
        await waitFor(() => expect(reads).toBe(2));
        // far longer than the wait (60 ms here): the second answer has not come, no third reading is asked
        await new Promise(done => setTimeout(done, 400));
        expect(reads).toBe(2);
        release();
        await waitFor(() => expect(reads).toBe(3));
    });

    it('should not read again when no source is pending', async () => {
        let reads = 0;
        api.association.mockImplementation(async (qid) => { reads += 1; return buildMock({votes: given}).association(qid); });
        show('/fifa?c=QMOCK1');
        await openSheet('MEX');
        await new Promise(done => setTimeout(done, 250));
        expect(reads).toBe(1);
    });

    it('should wait 30 seconds and read again at most twice, as the contract says', async () => {
        const {RECHECK_AFTER_MS, MAX_RECHECKS} = await vi.importActual('@/features/fifa/sourceChecks.js');
        expect(RECHECK_AFTER_MS).toBe(30000);
        expect(MAX_RECHECKS).toBe(2);
    });
});
