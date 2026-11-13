//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-pages.test.jsx
//  Description: A reader adds the link of a PAGE about an association with no candidate chosen ("Add a source"): a link, an optional note, no candidate. The AI reads it
//               like a news for every candidate and what it finds COUNTS for the positions: the sheet shows the page under the position of the candidate it speaks
//               of with what the AI read (candidate, for or against, the sentence), or in the list "Sources" of the sheet when the AI is reading it, found nothing
//               clear in it or could not read it; the sentences it gave carry "Added by X from a page"; the page can be deleted (with the signals it gave); the map
//               is asked again when the AI has finished reading a page and when a page is deleted
//
//  The associations, the pages and the answers are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {MOCK_SUBJECTS, SOURCE_READ_MS, buildMock, pageReadingsOf, readSourceInput, recordPage, seedPages} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn(), lean: vi.fn(), addSource: vi.fn(), deleteSource: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));
// the sheet reads itself again 30 s after a source was found pending, twice at most: here after 60 ms, and for as long as the page is pending, to see it happen
vi.mock('@/features/fifa/sourceChecks.js', async (original) => ({...(await original()), RECHECK_AFTER_MS: 60, MAX_RECHECKS: 1000}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const LINK = 'https://www.newspaper.example/pages/for-b/ger-interview';
const qidOf = (fifa) => buildMock().map.members.find(member => member.fifa === fifa).qid;

// the pages the server keeps, and whether the reader is an administrator
let pages = [];
let nextId = 0;
const serve = ({admin = false} = {}) => {
    const mock = () => buildMock({pages, reader: 'reader'});
    api.map.mockImplementation(async () => mock().map);
    api.association.mockImplementation(async qid => mock().association(qid));
    api.presidents.mockResolvedValue(buildMock().presidents);
    api.confederations.mockResolvedValue(buildMock().confederations);
    // the same checks as the mock API: 422 / 400 for the link, a note up to 280 characters
    api.addSource.mockImplementation(async ({member, source, note}) => {
        const read = readSourceInput(source);
        if (read.error) return {error: read.error, status: read.status};
        if (note && note.length > 280) return {error: 'The note is longer than 280 characters.', status: 422};
        const page = recordPage({url: read.url, note}, {id: `new-${++nextId}`, member_qid: member, by: 'reader', at: new Date().toISOString()});
        pages.push(page);
        return {source: mock().association(member).sources.find(one => one.id === page.id)};
    });
    api.deleteSource.mockImplementation(async (id) => {
        const at = pages.findIndex(one => one.id === id);
        if (at < 0) return {error: 'Unknown source.', status: 404};
        if (pages[at].by !== 'reader' && !admin) return {error: 'Only the reader who added a source or an administrator can delete it.', status: 403};
        pages.splice(at, 1);
        return null;
    });
};
const show = (url = '/fifa', props = {}) => render(<MemoryRouter initialEntries={[url]}><FifaBoard reader="reader" {...props}/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
// the sheet of an association, on the tab Positions (the one it opens on), once it has been read: an association the news say nothing of has no card, so the sheet is read when
// the accordion "Sources" (always there) is
const readSheet = async (sheet) => {
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
    await within(sheet).findByRole('region', {name: 'Sources'});
    return sheet;
};
const openSheet = async (fifa) => {
    await mapReady();
    fireEvent.click(shape(fifa));
    return readSheet(await screen.findByRole('dialog'));
};
// the strip of the tab Positions has a card for every candidate: selecting one shows its detail under the strip (the vote, the news), one candidate at a time
const pick = (sheet, candidate) => {
    const name = `Mock candidate ${candidate}`;
    const card = within(within(sheet).getByRole('group', {name: 'Candidates and their status'})).getByRole('button', {name: new RegExp(`^${name}( |$)`)});
    if (card.getAttribute('aria-pressed') !== 'true') fireEvent.click(card);
    return within(sheet).getByRole('region', {name});
};
const cardOf = (sheet, candidate = 'A') => pick(sheet, candidate);
const pagesOf = (card, name = 'Mock candidate A') => within(card).queryByRole('group', {name: `Pages added about ${name}`});
const listOf = (sheet) => within(sheet).queryByRole('list', {name: 'Pages added'});
// the accordion "Sources" (closed at first): opened when it is asked for its content
const sourcesHeader = (sheet) => within(within(sheet).getByRole('region', {name: 'Sources'})).getByRole('button', {name: /^Sources/});
const sourcesSection = (sheet) => {
    const section = within(sheet).getByRole('region', {name: 'Sources'});
    const header = within(section).getByRole('button', {name: /^Sources/});
    if (header.getAttribute('aria-expanded') === 'false') fireEvent.click(header);
    return section;
};
const wait = (ms) => new Promise(done => setTimeout(done, ms));

beforeEach(() => {
    pages = seedPages();
    nextId = 0;
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the mock: pages', () => {
    it('should read a page for every candidate: the candidate and the stance from the address, else drawn', () => {
        const subjects = MOCK_SUBJECTS;
        expect(pageReadingsOf('https://x.example/pages/for-b/a', subjects)).toEqual([expect.objectContaining({subject_qid: 'QMOCK2', stance: 'support', level: 'declared'})]);
        expect(pageReadingsOf('https://x.example/against-c', subjects)[0]).toMatchObject({subject_qid: 'QMOCK3', stance: 'oppose', found: '[Mock sentence in en] The page says the association will not back Mock candidate C.'});
        const both = pageReadingsOf('https://x.example/both/page', subjects);
        expect(both.map(one => [one.subject_qid, one.stance])).toEqual([['QMOCK1', 'support'], ['QMOCK2', 'oppose']]);
        // no word: one candidate, the same one each time
        const drawn = pageReadingsOf('https://x.example/page', subjects);
        expect(drawn).toHaveLength(1);
        expect(pageReadingsOf('https://x.example/page', subjects)).toEqual(drawn);
    });

    it('should have no page by default (the tests keep their counts), and four seed pages for the mock API', () => {
        const plain = buildMock();
        expect(plain.association(qidOf('ARG')).sources).toEqual([]);
        expect(plain.association(qidOf('ARG')).signals.some(one => one.source_id)).toBe(false);
        expect(seedPages().map(one => [one.id, one.outcome])).toEqual([['mock-page-1', 'says'], ['mock-page-2', 'unclear'], ['mock-page-3', 'says'], ['mock-page-4', 'nodate']]);
    });

    it('should send the pages in the sources of the sheet, newest first: pending, says (with a reading), unclear, no date', () => {
        const mock = buildMock({pages: seedPages(), reader: 'Mock reader 2'});
        const one = (fifa) => mock.association(qidOf(fifa)).sources[0];
        expect(one('URU')).toMatchObject({kind: 'page', check: 'pending', subject_qid: null, value: null, found: '', checked_at: null, readings: [], mine: false});
        expect(one('ARG')).toMatchObject({kind: 'page', check: 'says', subject_qid: 'QMOCK2', value: 'for', by: 'Mock reader 2', mine: true, medium: 'mockdaily.example'});
        expect(one('ARG').readings).toEqual([{subject_qid: 'QMOCK2', stance: 'support', level: 'declared', found: '[Mock sentence in en] The page says the association will back Mock candidate B.'}]);
        expect(one('ARG').found).toBe(one('ARG').readings[0].found);
        expect(one('ARG').checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(one('BOL')).toMatchObject({check: 'unclear', subject_qid: null, readings: []});
        expect(one('PAR')).toMatchObject({check: 'says', subject_qid: 'QMOCK1', readings: [expect.objectContaining({subject_qid: 'QMOCK1'})]});
        // newest first, the choices' sources among them (kind 'choice')
        const kinds = buildMock({pages: seedPages()}).association(qidOf('MEX')).sources.map(source => source.kind);
        expect(kinds).toEqual(['choice']);
    });

    it('should count what the AI read in a page for the positions, and take it away with the page', () => {
        const ger = qidOf('GER');
        const page = recordPage({url: LINK}, {id: 'p1', member_qid: ger, by: 'Mock reader 4', at: new Date(Date.now() - 3600e3).toISOString()});
        // still being read: nothing changes
        const reading = buildMock({pages: [{...page, readyAt: Date.now() + 1e9}]});
        expect(reading.map.members.find(member => member.fifa === 'GER').positions.QMOCK2.position).toBe('inconnue');
        // read: Germany supports Mock candidate B (it had no news position), with a signal that says who added the page
        const read = buildMock({pages: [page]});
        const entry = read.map.members.find(member => member.fifa === 'GER').positions.QMOCK2;
        expect(entry).toMatchObject({position: 'soutien_declare', signals_count: 1, since: page.at});
        expect(entry.basis).toEqual([{medium: 'newspaper.example', published_at: page.at, url: LINK}]);
        const sheet = read.association(ger);
        expect(sheet.signals.filter(one => one.source_id)).toEqual([expect.objectContaining({
            id: 'p1-QMOCK2', subject_qid: 'QMOCK2', certainty: 'established', stance: 'support', level: 'declared', added_by: 'Mock reader 4', source_id: 'p1', url: LINK,
        })]);
        expect(sheet.history.find(one => one.subject_qid === 'QMOCK2')).toMatchObject({kind: 'first', to: 'soutien_declare', url: LINK, medium: 'newspaper.example'});
        expect(read.map.subjects.find(one => one.qid === 'QMOCK2').positions_known).toBe(buildMock().map.subjects.find(one => one.qid === 'QMOCK2').positions_known + 1);
        // the page is deleted: its signals and the position go with it
        const back = buildMock({pages: []});
        expect(back.map.members.find(member => member.fifa === 'GER').positions.QMOCK2.position).toBe('inconnue');
        expect(back.association(ger).signals.some(one => one.source_id)).toBe(false);
    });

    it('should add a signal to a position the news gave, and give an Uncertain signal only when the page has no usable date', () => {
        const nor = qidOf('NOR');
        const at = new Date(Date.now() - 3600e3).toISOString();
        // Norway: the news give A an opposition: a page that says "for A" adds a signal, the position stays the news'
        const dated = recordPage({url: 'https://x.example/pages/for-a/nor'}, {id: 'p2', member_qid: nor, by: 'Mock reader 4', at});
        const withPage = buildMock({pages: [dated]});
        const base = buildMock().map.members.find(member => member.fifa === 'NOR').positions.QMOCK1;
        const entry = withPage.map.members.find(member => member.fifa === 'NOR').positions.QMOCK1;
        expect(entry.position).toBe(base.position);
        expect(entry.signals_count).toBe(base.signals_count + 1);
        // a page with no usable date: an Uncertain signal, reason 'other', and no position
        const undated = recordPage({url: 'https://x.example/pages/nodate/for-b/ger'}, {id: 'p3', member_qid: qidOf('GER'), by: 'Mock reader 4', at});
        const mock = buildMock({pages: [undated]});
        const ger = mock.map.members.find(member => member.fifa === 'GER').positions.QMOCK2;
        expect(ger.position).toBe('inconnue');
        expect(ger.uncertain_count).toBe(buildMock().map.members.find(member => member.fifa === 'GER').positions.QMOCK2.uncertain_count + 1);
        expect(mock.association(qidOf('GER')).signals.filter(one => one.source_id)).toEqual([expect.objectContaining({certainty: 'uncertain', uncertain_reason: 'other', added_by: 'Mock reader 4', source_id: 'p3'})]);
    });

    it('should read a page for the candidates it speaks of: several readings, the first one is the page\'s', () => {
        const ger = qidOf('GER');
        const page = recordPage({url: 'https://x.example/both/ger'}, {id: 'p4', member_qid: ger, by: 'Mock reader 4', at: new Date(Date.now() - 3600e3).toISOString()});
        const mock = buildMock({pages: [page]});
        const source = mock.association(ger).sources[0];
        expect(source).toMatchObject({subject_qid: 'QMOCK1', value: 'for', check: 'says'});
        expect(source.readings.map(one => [one.subject_qid, one.stance])).toEqual([['QMOCK1', 'support'], ['QMOCK2', 'oppose']]);
        // and it counts for both candidates
        const positions = mock.map.members.find(member => member.fifa === 'GER').positions;
        expect([positions.QMOCK1.position, positions.QMOCK2.position]).toEqual(['soutien_declare', 'non_soutien_declare']);
    });

    it('should wait for the AI: a page is pending until the time the AI takes, then it is read', () => {
        const page = recordPage({url: LINK}, {id: 'p5', member_qid: qidOf('GER'), by: 'reader', at: new Date().toISOString()});
        expect(buildMock({pages: [page]}).association(qidOf('GER')).sources[0].check).toBe('pending');
        expect(buildMock({pages: [page], now: Date.now() + SOURCE_READ_MS + 1000}).association(qidOf('GER')).sources[0].check).toBe('says');
    });
});

describe('the accordion "Sources"', () => {
    it('should be closed at first: one line, with no form and no list, taking little room', async () => {
        show();
        const sheet = await openSheet('ARG');
        const header = sourcesHeader(sheet);
        expect(header).toHaveAttribute('aria-expanded', 'false');
        expect(header).not.toHaveAttribute('aria-controls');
        const section = within(sheet).getByRole('region', {name: 'Sources'});
        expect(within(section).queryByRole('button', {name: 'Add a source'})).toBeNull();
        expect(within(section).queryByRole('list', {name: 'Pages added'})).toBeNull();
        expect(within(section).queryByLabelText('Link of the page')).toBeNull();
        // nothing but the line: the title and what is in the list
        expect(within(section).getAllByRole('button')).toHaveLength(1);
        expect(within(section).getByRole('heading', {level: 3})).toBe(header.parentElement);
    });

    it('should say on its line how many pages are in it and how many the AI is reading, and what to do when there is none', async () => {
        show();
        // Argentina: its page is under the candidate the AI read, none in the list
        const argentina = await openSheet('ARG');
        expect(sourcesHeader(argentina)).toHaveTextContent('Sources');
        expect(sourcesHeader(argentina)).toHaveTextContent('Add a page about this association');
        fireEvent.keyDown(argentina, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        // Uruguay: a page being read
        fireEvent.click(shape('URU'));
        const uruguay = await readSheet(await screen.findByRole('dialog'));
        expect(sourcesHeader(uruguay)).toHaveTextContent('1 page · 1 being read');
    });

    it('should open and close with its line, and show the control and the list when it is open', async () => {
        show();
        const sheet = await openSheet('URU');
        const header = sourcesHeader(sheet);
        fireEvent.click(header);
        expect(header).toHaveAttribute('aria-expanded', 'true');
        const section = within(sheet).getByRole('region', {name: 'Sources'});
        expect(header).toHaveAttribute('aria-controls', section.querySelector('div[id$="-body"]').id);
        expect(within(section).getByRole('button', {name: 'Add a source'})).toBeInTheDocument();
        expect(within(within(section).getByRole('list', {name: 'Pages added'})).getAllByRole('listitem')).toHaveLength(1);
        fireEvent.click(header);
        expect(header).toHaveAttribute('aria-expanded', 'false');
        expect(within(section).queryByRole('button', {name: 'Add a source'})).toBeNull();
    });

    it('should stay open while a page is added, and update its line (the page is being read)', async () => {
        show();
        const sheet = await openSheet('GER');
        const section = sourcesSection(sheet);
        expect(sourcesHeader(sheet)).toHaveTextContent('Add a page about this association');
        fireEvent.click(within(section).getByRole('button', {name: 'Add a source'}));
        fireEvent.change(within(section).getByLabelText('Link of the page'), {target: {value: LINK}});
        fireEvent.click(within(section).getByRole('button', {name: 'Add the source'}));
        await waitFor(() => expect(listOf(sheet)).not.toBeNull());
        expect(sourcesHeader(sheet)).toHaveAttribute('aria-expanded', 'true');
        expect(sourcesHeader(sheet)).toHaveTextContent('1 page · 1 being read');
    });
});

describe('the control "Add a source"', () => {
    it('should be in the sheet with no candidate to choose, apart from the lean block, with what it does said under it', async () => {
        show();
        const sheet = await openSheet('GER');
        const section = sourcesSection(sheet);
        const button = within(section).getByRole('button', {name: 'Add a source'});
        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(within(section).getByText('The AI reads the page like a news: what it finds about this association counts for the positions.')).toBeInTheDocument();
        // the field of the lean block is the other one, for a choice
        const block = within(sheet).getByRole('region', {name: /^Which candidate does .* lean towards\?$/});
        expect(within(block).getByLabelText('Add a source (link)')).toBeInTheDocument();
        expect(block.contains(button)).toBe(false);
        // under it: the strip of the candidates comes first in the tab Positions, then the block of the choice, then the control to add a source
        expect(block.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(within(sheet).getByRole('group', {name: 'Candidates and their status'}).compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should be there with a candidate chosen in the list too', async () => {
        show('/fifa?c=QMOCK1');
        const sheet = await openSheet('GER');
        expect(within(sourcesSection(sheet)).getByRole('button', {name: 'Add a source'})).toBeInTheDocument();
        expect(within(sheet).queryByRole('region', {name: /lean towards/})).toBeNull();
    });

    it('should open a form with a link and a note, and close it with Cancel or the same button', async () => {
        show();
        const sheet = await openSheet('GER');
        const section = sourcesSection(sheet);
        const button = within(section).getByRole('button', {name: 'Add a source'});
        fireEvent.click(button);
        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(within(section).getByLabelText('Link of the page')).toHaveValue('');
        expect(within(section).getByLabelText('Link of the page')).toHaveAttribute('placeholder', 'https://…');
        expect(within(section).getByLabelText('Note (optional)')).toHaveValue('');
        expect(within(section).getByText('0 / 280')).toBeInTheDocument();
        expect(within(section).getByRole('button', {name: 'Add the source'})).toBeDisabled();
        fireEvent.click(within(section).getByRole('button', {name: 'Cancel'}));
        expect(within(section).queryByLabelText('Link of the page')).toBeNull();
        fireEvent.click(button);
        fireEvent.click(button);
        expect(within(section).queryByLabelText('Link of the page')).toBeNull();
    });

    it('should send the link and the note, trimmed, with no candidate, then show the page as being read, the reader\'s own', async () => {
        show();
        const sheet = await openSheet('GER');
        const section = sourcesSection(sheet);
        fireEvent.click(within(section).getByRole('button', {name: 'Add a source'}));
        fireEvent.change(within(section).getByLabelText('Link of the page'), {target: {value: `   ${LINK}  `}});
        fireEvent.change(within(section).getByLabelText('Note (optional)'), {target: {value: '  The interview of the president  '}});
        fireEvent.click(within(section).getByRole('button', {name: 'Add the source'}));
        await waitFor(() => expect(api.addSource).toHaveBeenCalledWith({member: qidOf('GER'), source: LINK, note: 'The interview of the president'}));
        // the form is closed, the page is in the list of the sheet, being read
        await waitFor(() => expect(listOf(sheet)).not.toBeNull());
        const item = within(listOf(sheet)).getAllByRole('listitem')[0];
        expect(within(item).getByRole('link', {name: /newspaper\.example/})).toHaveAttribute('href', LINK);
        expect(item).toHaveTextContent('Added by reader (you)');
        expect(item).toHaveTextContent('The interview of the president');
        expect(within(item).getByRole('status')).toHaveTextContent('Checking…');
        expect(within(item).getByRole('button', {name: /^Delete the source newspaper\.example/})).toBeInTheDocument();
        expect(within(section).queryByLabelText('Link of the page')).toBeNull();
    });

    it('should not send an empty note, an empty link, nor a note over 280 characters', async () => {
        show();
        const sheet = await openSheet('GER');
        const section = sourcesSection(sheet);
        fireEvent.click(within(section).getByRole('button', {name: 'Add a source'}));
        const send = within(section).getByRole('button', {name: 'Add the source'});
        fireEvent.change(within(section).getByLabelText('Link of the page'), {target: {value: '    '}});
        expect(send).toBeDisabled();
        fireEvent.change(within(section).getByLabelText('Link of the page'), {target: {value: LINK}});
        expect(send).toBeEnabled();
        fireEvent.change(within(section).getByLabelText('Note (optional)'), {target: {value: 'x'.repeat(281)}});
        expect(send).toBeDisabled();
        expect(within(section).getByText('281 / 280')).toHaveClass('!text-accent-ink');
        fireEvent.change(within(section).getByLabelText('Note (optional)'), {target: {value: '   '}});
        fireEvent.click(send);
        await waitFor(() => expect(api.addSource).toHaveBeenCalledTimes(1));
        // a note of spaces is no note
        expect(api.addSource.mock.calls[0][0]).toEqual({member: qidOf('GER'), source: LINK});
    });

    it('should say the words of the server when it refuses, and keep the link in the field', async () => {
        show();
        const sheet = await openSheet('GER');
        const section = sourcesSection(sheet);
        fireEvent.click(within(section).getByRole('button', {name: 'Add a source'}));
        const press = async (link) => {
            fireEvent.change(within(section).getByLabelText('Link of the page'), {target: {value: link}});
            fireEvent.click(within(section).getByRole('button', {name: 'Add the source'}));
            return await within(section).findByRole('alert');
        };
        expect(await press('not a link')).toHaveTextContent('This is not a web address: it starts with http:// or https://.');
        expect(within(section).getByLabelText('Link of the page')).toHaveValue('not a link');
        expect(await press('http://192.168.1.4/a')).toHaveTextContent('This address is private: give the link of a public page.');
        api.addSource.mockResolvedValueOnce({error: 'You joined 20 sources today: try again tomorrow.', status: 429});
        expect(await press(LINK)).toHaveTextContent('You joined 20 sources today: try again tomorrow.');
        api.addSource.mockResolvedValueOnce({error: 'You added 10 pages in the last 10 minutes: wait a little.', status: 429});
        expect(await press(LINK)).toHaveTextContent('You added 10 pages in the last 10 minutes: wait a little.');
        api.addSource.mockResolvedValueOnce({error: 'Forbidden, invalid or expired', status: 401});
        expect(await press(LINK)).toHaveTextContent('Sign in to add a source.');
        api.addSource.mockRejectedValueOnce(new Error('offline'));
        expect(await press(LINK)).toHaveTextContent('The source could not be sent. Try again in a moment.');
        expect(within(section).getByLabelText('Link of the page')).toHaveValue(LINK);
        expect(pages.some(one => one.id.startsWith('new-'))).toBe(false);
    });
});

describe('the pages in the sheet', () => {
    it('should show a page the AI read under the position of the candidate it speaks of, with what it read (Argentina)', async () => {
        show();
        const sheet = await openSheet('ARG');
        const group = pagesOf(cardOf(sheet, 'B'), 'Mock candidate B');
        expect(group).not.toBeNull();
        expect(within(group).getByRole('link', {name: /mockdaily\.example/})).toHaveAttribute('href', 'https://www.mockdaily.example/pages/for-b/arg-interview');
        expect(group).toHaveTextContent('Added by Mock reader 2');
        expect(group).toHaveTextContent('[Mock] Interview of the president of the federation.');
        // what the AI read: the candidate, for, the sentence
        const readings = within(group).getByRole('list', {name: 'What the AI read in the page'});
        expect(within(readings).getAllByRole('listitem')).toHaveLength(1);
        expect(readings).toHaveTextContent('Mock candidate B');
        expect(readings).toHaveTextContent('for');
        expect(readings).toHaveTextContent('“[Mock sentence in en] The page says the association will back Mock candidate B.”');
        // no badge (the readings say it), no caption saying it never changes a colour: it counts
        expect(within(group).queryByRole('status')).toBeNull();
        expect(group).not.toHaveTextContent(/Checking|no clear position|Could not read/);
        expect(group).not.toHaveTextContent(/never changes a colour/);
        // not in the list of the sheet, and the page counts: Argentina supports Mock candidate B
        sourcesSection(sheet);
        expect(listOf(sheet)).toBeNull();
        expect(within(cardOf(sheet, 'B')).getByText('Declared support')).toBeInTheDocument();
    });

    it('should put the pages with no reading in the list "Sources" of the sheet: being read, no clear position, could not read', async () => {
        pages.push({...recordPage({url: 'https://mockpost.example/pages/unreadable/ger'}, {id: 'unreadable', member_qid: qidOf('BOL'), by: 'Mock reader 4', at: new Date(Date.now() - 3600e3).toISOString()}), readyAt: 0});
        show();
        const bolivia = await openSheet('BOL');
        sourcesSection(bolivia);
        const items = within(listOf(bolivia)).getAllByRole('listitem');
        expect(items).toHaveLength(2);
        const unreadable = items.find(one => one.textContent.includes('Mock reader 4'));
        expect(unreadable).toHaveTextContent('Could not read the page');
        const unclear = items.find(one => one.textContent.includes('Mock reader 1'));
        expect(unclear).toHaveTextContent('The AI found no clear position in this page');
        expect(within(unclear).queryByRole('list', {name: 'What the AI read in the page'})).toBeNull();
    });

    it('should say that the AI is still reading a page: "Checking…" in the list', async () => {
        show();
        const sheet = await openSheet('URU');
        sourcesSection(sheet);
        const item = within(listOf(sheet)).getAllByRole('listitem')[0];
        expect(within(item).getByRole('status')).toHaveTextContent('Checking…');
        expect(item).toHaveTextContent('[Mock] Press release, not read yet.');
        expect(within(sourcesSection(sheet)).getByRole('link', {name: /mockgazette\.example/})).toHaveAttribute('href', 'https://mockgazette.example/pages/uru-press-release');
    });

    it('should say when a page had no date: its sentences are shown as Uncertain (Paraguay)', async () => {
        show();
        const sheet = await openSheet('PAR');
        const group = pagesOf(cardOf(sheet, 'A'));
        expect(group).toHaveTextContent('No date found on this page: its sentences are shown as Uncertain.');
        expect(within(group).getByRole('list', {name: 'What the AI read in the page'})).toHaveTextContent('Mock candidate A');
        // it gave an Uncertain sentence, not a position
        const uncertain = within(cardOf(sheet, 'A')).getByRole('group', {name: 'Uncertain sentences on Mock candidate A'});
        expect(within(uncertain).getByText('Why Uncertain:', {exact: false})).toBeInTheDocument();
        expect(within(uncertain).getByRole('button', {name: 'Added by Mock reader 2 from a page'})).toBeInTheDocument();
        expect(within(cardOf(sheet, 'A')).getByText('No known position')).toBeInTheDocument();
    });

    it('should list every candidate a page speaks of: several readings, under the first one', async () => {
        pages.push({...recordPage({url: 'https://newspaper.example/pages/both/ger'}, {id: 'both', member_qid: qidOf('GER'), by: 'Mock reader 4', at: new Date(Date.now() - 3600e3).toISOString()}), readyAt: 0});
        show();
        const sheet = await openSheet('GER');
        const group = pagesOf(cardOf(sheet, 'A'));
        const readings = within(within(group).getByRole('list', {name: 'What the AI read in the page'})).getAllByRole('listitem');
        expect(readings).toHaveLength(2);
        expect(readings[0]).toHaveTextContent('Mock candidate A');
        expect(readings[0]).toHaveTextContent('for');
        expect(readings[1]).toHaveTextContent('Mock candidate B');
        expect(readings[1]).toHaveTextContent('against');
        expect(readings[1]).toHaveTextContent('will not back Mock candidate B');
        // the page is listed once, under the first candidate
        expect(pagesOf(cardOf(sheet, 'B'), 'Mock candidate B')).toBeNull();
        expect(within(group).getAllByRole('link')).toHaveLength(1);
    });
});

describe('the sentences a page gave', () => {
    it('should carry a neutral tag "Added by X from a page" that leads to the source in the sheet', async () => {
        show();
        const sheet = await openSheet('ARG');
        const declared = within(cardOf(sheet, 'B')).getByRole('group', {name: 'Declared sentences on Mock candidate B'});
        const tag = within(declared).getByRole('button', {name: 'Added by Mock reader 2 from a page'});
        expect(tag).toHaveAttribute('title', 'Go to its source');
        expect(tag).toHaveClass('bg-paper-deep');
        expect(declared).toHaveTextContent('Read by the AI in a page a reader added');
        expect(declared).toHaveTextContent('“[Mock sentence in en] The page says the association will back Mock candidate B.”');
        // a click goes to the page in the list of the sources
        fireEvent.click(tag);
        const target = sheet.querySelector('#source-mock-page-1');
        expect(target).not.toBeNull();
        expect(target).toHaveFocus();
        expect(pagesOf(cardOf(sheet, 'B'), 'Mock candidate B').contains(target)).toBe(true);
    });

    it('should not tag the sentences of the news', async () => {
        show();
        const sheet = await openSheet('BRA');
        cardOf(sheet, 'A');
        expect(within(sheet).queryByRole('button', {name: /from a page/})).toBeNull();
        expect(within(sheet).getAllByText('Read by the AI; the sentence is the article\'s own').length).toBeGreaterThan(0);
    });
});

describe('deleting a page', () => {
    const writeOne = async (sheet) => {
        const section = sourcesSection(sheet);
        fireEvent.click(within(section).getByRole('button', {name: 'Add a source'}));
        fireEvent.change(within(section).getByLabelText('Link of the page'), {target: {value: LINK}});
        fireEvent.click(within(section).getByRole('button', {name: 'Add the source'}));
        await waitFor(() => expect(listOf(sheet)).not.toBeNull());
    };

    it('should not offer the delete control on the page of another reader', async () => {
        show();
        const sheet = await openSheet('ARG');
        // the page is under the candidate the AI read a position about: select it in the strip
        cardOf(sheet, 'B');
        expect(within(sheet).getAllByRole('link', {name: /mockdaily\.example/}).length).toBeGreaterThan(0);
        expect(within(sheet).queryAllByRole('button', {name: /^Delete the source/})).toHaveLength(0);
    });

    it('should offer the delete control on the pages of the reader', async () => {
        show();
        const sheet = await openSheet('GER');
        await writeOne(sheet);
        expect(within(sheet).getAllByRole('button', {name: /^Delete the source/})).toHaveLength(1);
        expect(within(sheet).getByRole('button', {name: /^Delete the source newspaper\.example added by reader/})).toBeInTheDocument();
    });

    it('should offer it on every page to an administrator', async () => {
        serve({admin: true});
        show('/fifa', {admin: true});
        const sheet = await openSheet('ARG');
        cardOf(sheet, 'B');
        expect(within(sheet).getByRole('button', {name: 'Delete the source mockdaily.example added by Mock reader 2'})).toBeInTheDocument();
    });

    it('should ask first, delete with "Yes, delete", take the signals the page gave with it, and ask the map again', async () => {
        show();
        const sheet = await openSheet('GER');
        await writeOne(sheet);
        // the AI has read it (it is quick here): the sheet shows the page under its candidate, the map has the position the page gave
        pages.find(one => one.id.startsWith('new-')).readyAt = 0;
        await waitFor(() => expect(pagesOf(cardOf(sheet, 'B'), 'Mock candidate B')).not.toBeNull());
        await waitFor(() => expect(shape('GER')).toHaveAccessibleName(/Declared support for Mock candidate B/));
        const asks = api.map.mock.calls.length;
        fireEvent.click(within(sheet).getByRole('button', {name: /^Delete the source newspaper\.example/}));
        expect(within(sheet).getByText(/Delete this source\? What the AI read in it goes too\./)).toBeInTheDocument();
        fireEvent.click(within(sheet).getByRole('button', {name: 'Keep it'}));
        expect(api.deleteSource).not.toHaveBeenCalled();
        fireEvent.click(within(sheet).getByRole('button', {name: /^Delete the source newspaper\.example/}));
        fireEvent.click(within(sheet).getByRole('button', {name: 'Yes, delete'}));
        await waitFor(() => expect(api.deleteSource).toHaveBeenCalledWith('new-1'));
        await waitFor(() => expect(within(sheet).queryByRole('link', {name: /newspaper\.example/})).toBeNull());
        // the map was asked again, the sheet read again: the signals are gone and the position with them
        await waitFor(() => expect(api.map.mock.calls.length).toBeGreaterThan(asks));
        expect(pages.some(one => one.id.startsWith('new-'))).toBe(false);
        expect(within(sheet).queryByRole('button', {name: /from a page/})).toBeNull();
        await waitFor(() => expect(shape('GER')).toHaveAccessibleName('Germany, GER, UEFA: No known position'));
    });

    it('should say the refusal of the server and keep the page: a 403, a network failure', async () => {
        show();
        const sheet = await openSheet('GER');
        await writeOne(sheet);
        const ask = () => {
            fireEvent.click(within(sheet).getByRole('button', {name: /^Delete the source newspaper\.example/}));
            fireEvent.click(within(sheet).getByRole('button', {name: 'Yes, delete'}));
        };
        api.deleteSource.mockResolvedValueOnce({error: 'Only the reader who added a source or an administrator can delete it.', status: 403});
        ask();
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('Only the reader who added a source or an administrator can delete it.');
        expect(within(sheet).getByRole('link', {name: /newspaper\.example/})).toBeInTheDocument();
        api.deleteSource.mockRejectedValueOnce(new Error('offline'));
        fireEvent.click(within(sheet).getByRole('button', {name: 'Yes, delete'}));
        await waitFor(() => expect(within(sheet).getByRole('alert')).toHaveTextContent('The source could not be deleted. Try again in a moment.'));
        expect(within(sheet).getByRole('link', {name: /newspaper\.example/})).toBeInTheDocument();
    });
});

describe('a page the AI has just finished reading', () => {
    it('should ask the map again when a page goes from pending to read, and the colour follows: what the page says counts', async () => {
        // Germany: the news and the reader say nothing of Mock candidate B; a page about it is being read
        const page = {...recordPage({url: LINK}, {id: 'slow', member_qid: qidOf('GER'), by: 'Mock reader 4', at: new Date().toISOString()}), readyAt: Date.now() + 1e9};
        pages.push(page);
        show();
        const sheet = await openSheet('GER');
        await waitFor(() => expect(within(sourcesSection(sheet)).getByRole('status')).toHaveTextContent('Checking…'));
        expect(shape('GER')).toHaveAccessibleName('Germany, GER, UEFA: No known position');
        const asks = api.map.mock.calls.length;
        // the AI finishes
        page.readyAt = 0;
        await waitFor(() => expect(within(sheet).queryByRole('status')).toBeNull());
        await waitFor(() => expect(api.map.mock.calls.length).toBeGreaterThan(asks));
        // the page is under the candidate now, and the map shows what it said
        await waitFor(() => expect(pagesOf(cardOf(sheet, 'B'), 'Mock candidate B')).not.toBeNull());
        await waitFor(() => expect(shape('GER')).toHaveAccessibleName(/Support for Mock candidate B|Declared support for Mock candidate B/));
        expect(listOf(sheet)).toBeNull();
    });

    it('should not ask the map again for a page that was read before the sheet was opened', async () => {
        show();
        const sheet = await openSheet('ARG');
        const asks = api.map.mock.calls.length;
        await wait(250);
        expect(api.map.mock.calls.length).toBe(asks);
        expect(sheet).toBeInTheDocument();
    });
});
