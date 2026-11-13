//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-candidates.test.jsx
//  Description: A reader adds a candidate with no one to validate it (search a person after two letters and a pause, pick one, Add), the map
//               is asked again and the new candidate chosen, its news being read, and no status is asked (only {qid} is sent); the list of candidates of the dialog
//               has no status menu; the text of a refusal is shown as it comes. And the sheet of an association, when a country is chosen: the sentences of a candidate
//               in apart groups, Declared and Probable each with its own badge, then Uncertain (never coloured)
//
//  The persons, the candidates and the sentences are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useEffect} from 'react';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {ALL_LEVELS, COARSE_LEVELS, MOCK_PEOPLE, MOCK_SUBJECTS, buildMock} from '../bench/fifa/mock-data.mjs';

// the dialog and the sheet draw a 211-shape map again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
// and a wait for what comes after a step is longer than the 1 s of the library
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn(), people: vi.fn(), addSubject: vi.fn(), setStatus: vi.fn()}}));
// (setStatus stays in the object so that a call of it can be told: the page never makes one)
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const seen = {search: ''};
const Spy = () => {
    const {search} = useLocation();
    useEffect(() => { seen.search = search; });
    return null;
};
const params = () => Object.fromEntries(new URLSearchParams(seen.search));
const show = (url = '/fifa') => render(<MemoryRouter initialEntries={[url]}><Spy/><FifaBoard reader="reader"/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});

// the candidates of the map, as the server holds them: a reader adds one, the map is asked again and has it
let candidates = [];
const serve = (levels = ALL_LEVELS) => {
    api.map.mockImplementation(async () => buildMock({levels, candidates}).map);
    api.association.mockImplementation(async qid => buildMock({levels, candidates}).association(qid));
    api.presidents.mockResolvedValue(buildMock().presidents);
    api.confederations.mockResolvedValue(buildMock().confederations);
    api.people.mockImplementation(async q => ({people: MOCK_PEOPLE.filter(person => person.name.toLowerCase().includes(q.toLowerCase()))}));
    // the server makes a new candidate declared when no status is sent
    api.addSubject.mockImplementation(async ({qid, status = 'declared'}) => {
        const person = MOCK_PEOPLE.find(one => one.qid === qid);
        const subject = {qid, name: person.name, color_index: 4, status, state: 'computing'};
        candidates = [...candidates, subject];
        return {subject, already: false};
    });
};

beforeEach(() => {
    candidates = MOCK_SUBJECTS.map(one => ({...one}));
    seen.search = '';
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

const openDialog = async () => {
    // the view may be one with no map: the control is what is waited for
    fireEvent.click(await screen.findByRole('button', {name: 'Add a candidate'}));
    return await screen.findByRole('dialog');
};
const search = async (dialog, text) => {
    fireEvent.change(within(dialog).getByRole('searchbox', {name: 'Search a person'}), {target: {value: text}});
};

describe('Add a candidate', () => {
    it('should ask the server only from two letters, after a pause, and list the persons found', async () => {
        show();
        const dialog = await openDialog();
        await search(dialog, 'a');
        expect(within(dialog).getByText('Two letters at least.')).toBeInTheDocument();
        await new Promise(done => setTimeout(done, 450));
        expect(api.people).not.toHaveBeenCalled();
        // typed letter by letter: one call, for what is typed at the end of the pause
        await search(dialog, 'al');
        await search(dialog, 'alv');
        await search(dialog, 'alva');
        const list = await within(dialog).findByRole('list', {name: 'People found'});
        expect(api.people).toHaveBeenCalledTimes(1);
        expect(api.people).toHaveBeenCalledWith('alva');
        expect(within(list).getAllByRole('button').map(button => button.textContent)).toEqual([
            'Mock Alvarezinvented person, football administrator',
            'Mock Alvaradoinvented person, former player',
        ]);
    });

    it('should say when no person is found', async () => {
        show();
        const dialog = await openDialog();
        await search(dialog, 'zzzz');
        expect(await within(dialog).findByText('No person found.')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', {name: 'Add'})).toBeDisabled();
    });

    it('should add the person picked, ask the map again and choose the new candidate, which is then said to be read', async () => {
        show('/fifa?conf=UEFA&view=list');
        const dialog = await openDialog();
        await search(dialog, 'alvar');
        const list = await within(dialog).findByRole('list', {name: 'People found'});
        // nothing is picked: nothing to add
        expect(within(dialog).getByRole('button', {name: 'Add'})).toBeDisabled();
        fireEvent.click(within(list).getByRole('button', {name: /Mock Alvarado/}));
        expect(within(list).getByRole('button', {name: /Mock Alvarado/})).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Add'}));

        await waitFor(() => expect(api.addSubject).toHaveBeenCalledWith({qid: 'QMOCKPERSON2'}));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        // the map was asked again, the page stayed as it was (the view, the confederation), the new candidate is chosen
        expect(api.map).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(params().c).toBe('QMOCKPERSON2'));
        expect(params()).toMatchObject({conf: 'UEFA', view: 'list'});
        const selector = screen.getByRole('combobox', {name: 'Candidate'});
        expect(within(selector).getByRole('option', {name: 'Mock Alvarado · Reading the news…'})).toBeInTheDocument();
        await waitFor(() => expect(selector).toHaveValue('QMOCKPERSON2'));
        expect(screen.getByText(/Mock candidate C, Mock Alvarado are still being read/)).toBeInTheDocument();
    });

    it('should ask no status when adding: no menu before the Add button, and only the qid is sent', async () => {
        show();
        const dialog = await openDialog();
        await search(dialog, 'chen');
        fireEvent.click(await within(dialog).findByRole('button', {name: /Mock Chen/}));
        // the Add button follows the list of the persons found, with no status menu before it
        expect(within(dialog).queryByRole('combobox', {name: 'Status of the new candidate'})).toBeNull();
        expect(within(dialog).queryAllByRole('combobox')).toEqual([]);
        fireEvent.click(within(dialog).getByRole('button', {name: 'Add'}));
        await waitFor(() => expect(api.addSubject).toHaveBeenCalledTimes(1));
        expect(api.addSubject.mock.calls[0]).toEqual([{qid: 'QMOCKPERSON4'}]);
        expect(Object.keys(api.addSubject.mock.calls[0][0])).toEqual(['qid']);
        // the server made it a declared candidate
        await waitFor(() => expect(candidates.find(one => one.qid === 'QMOCKPERSON4')).toMatchObject({status: 'declared'}));
    });

    it('should choose a candidate that is already on the map and say so, without adding it twice', async () => {
        show();
        const dialog = await openDialog();
        api.addSubject.mockResolvedValueOnce({subject: {...MOCK_SUBJECTS[1]}, already: true});
        await search(dialog, 'mock');
        fireEvent.click(await within(dialog).findByRole('button', {name: /Mock Alvarez/}));
        fireEvent.click(within(dialog).getByRole('button', {name: 'Add'}));
        await waitFor(() => expect(params().c).toBe('QMOCK2'));
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('should show the text of a refusal as it comes: map full, not a person, three a day', async () => {
        show();
        const dialog = await openDialog();
        await search(dialog, 'mock');
        fireEvent.click(await within(dialog).findByRole('button', {name: /Mock Alvarez/}));
        const add = async (answer) => {
            api.addSubject.mockResolvedValueOnce(answer);
            fireEvent.click(within(dialog).getByRole('button', {name: 'Add'}));
            return await within(dialog).findByRole('alert');
        };
        expect(await add({error: 'Six candidates are on the map: mark one as withdrawn to make room.', status: 409})).toHaveTextContent('Six candidates are on the map: mark one as withdrawn to make room.');
        expect(await add({error: 'This is not a person of Wikidata, or it is not known.', status: 422})).toHaveTextContent('This is not a person of Wikidata, or it is not known.');
        expect(await add({error: 'You added three candidates today: try again tomorrow.', status: 429})).toHaveTextContent('You added three candidates today: try again tomorrow.');
        api.addSubject.mockRejectedValueOnce(new Error('network'));
        fireEvent.click(within(dialog).getByRole('button', {name: 'Add'}));
        expect(await within(dialog).findByText('The candidate could not be added. Try again in a moment.')).toBeInTheDocument();
        // nothing changed: the dialog is open, the map was not asked again, no candidate was chosen
        expect(api.map).toHaveBeenCalledTimes(1);
        expect(params().c).toBeUndefined();
    });

    it('should show the text of a refused search as it comes', async () => {
        show();
        const dialog = await openDialog();
        api.people.mockResolvedValueOnce({error: 'Too many searches: wait a moment.', status: 429});
        await search(dialog, 'wen');
        expect(await within(dialog).findByRole('alert')).toHaveTextContent('Too many searches: wait a moment.');
    });
});

describe('the list of candidates of the dialog', () => {
    it('should be called "List of candidates", with one short line, and no status menu on any row', async () => {
        show('/fifa?c=QMOCK2');
        const dialog = await openDialog();
        const list = within(dialog).getByRole('heading', {name: 'List of candidates'}).closest('section');
        expect(list).toHaveAttribute('aria-labelledby', 'candidate-list');
        expect(within(list).getByText('Take a candidate off with the cross if the news named a person who is not a candidate.')).toBeInTheDocument();
        // the old title and its caption are gone
        expect(within(dialog).queryByRole('heading', {name: 'Status of the candidates'})).toBeNull();
        expect(within(dialog).queryByText(/Any reader can change it/)).toBeNull();
        // one row for each candidate of the map; no menu at all in the dialog
        expect(within(list).getAllByRole('listitem').map(row => row.querySelector('span').textContent)).toEqual(expect.arrayContaining(['Mock candidate A', 'Mock candidate B']));
        expect(within(dialog).queryAllByRole('combobox')).toEqual([]);
        expect(within(dialog).queryByRole('combobox', {name: /^Status of /})).toBeNull();
        // the description of the dialog says what it does now
        expect(within(dialog).getByText('Search a person and add them as a candidate, or take one off the list.')).toBeInTheDocument();
        expect(within(dialog).queryByText(/change the status of a candidate/)).toBeNull();
        // nothing changes a status any more
        expect(api.setStatus).not.toHaveBeenCalled();
    });
});

describe('the sheet, the sentences of a candidate in groups', () => {
    const sheetOf = async (fifa, url = '/fifa') => {
        show(url);
        await mapReady();
        fireEvent.click(screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`)}));
        const sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        await within(sheet).findByRole('group', {name: 'Candidates and their status'});
        // the sentences are in the detail of the candidate: select A
        fireEvent.click(within(within(sheet).getByRole('group', {name: 'Candidates and their status'})).getByRole('button', {name: /^Mock candidate A( |$)/}));
        await within(sheet).findByRole('region', {name: 'Mock candidate A'});
        return sheet;
    };
    const signalsOf = (fifa, levels = ALL_LEVELS) => {
        const mock = buildMock({levels});
        const member = mock.map.members.find(one => one.fifa === fifa);
        return mock.association(member.qid).signals.filter(signal => signal.subject_qid === 'QMOCK1');
    };
    const groupOf = (sheet, title) => within(sheet).getByRole('group', {name: `${title} sentences on Mock candidate A`});
    const after = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    it('should put the declared and the probable sentences of a candidate apart, each group with its own badge', async () => {
        // Nigeria: declared support for A, with an older sentence that was only probable
        const signals = signalsOf('NGA');
        const declared = signals.filter(signal => signal.certainty === 'established' && signal.level === 'declared');
        const probable = signals.filter(signal => signal.certainty === 'established' && signal.level === 'probable');
        expect(declared.length).toBeGreaterThan(0);
        expect(probable.length).toBeGreaterThan(0);
        const sheet = await sheetOf('NGA');

        const declaredGroup = groupOf(sheet, 'Declared');
        const probableGroup = groupOf(sheet, 'Probable');
        expect(within(declaredGroup).getByRole('heading', {name: 'Declared'})).toBeInTheDocument();
        expect(within(probableGroup).getByRole('heading', {name: 'Probable'})).toBeInTheDocument();
        expect(within(declaredGroup).getAllByRole('listitem')).toHaveLength(declared.length);
        expect(within(probableGroup).getAllByRole('listitem')).toHaveLength(probable.length);
        expect(declaredGroup).toHaveTextContent('Solid colour on the map.');
        expect(probableGroup).toHaveTextContent('Dots on the map.');
        // each badge draws its own way: solid for Declared, dots for Probable
        expect(declaredGroup.querySelector('[id^=fifa-dots-key]')).toBeNull();
        expect(probableGroup.querySelector('[id="fifa-dots-key-1"]')).not.toBeNull();
        // the two are not mixed: Probable under Declared
        expect(after(declaredGroup, probableGroup)).toBe(true);
        // nothing Uncertain here
        expect(within(sheet).queryByRole('group', {name: 'Uncertain sentences on Mock candidate A'})).toBeNull();
        // no group on a candidate nothing was said on
        expect(within(sheet).queryByRole('group', {name: /sentences on Mock candidate C$/})).toBeNull();
    });

    it('should put what is not a position under Uncertain, below, in its own badge, with the reason, never coloured', async () => {
        // Brazil: declared support for A, and one sentence that is about the election and the association but no position
        const signals = signalsOf('BRA');
        const uncertain = signals.filter(signal => signal.certainty === 'uncertain');
        const established = signals.filter(signal => signal.certainty === 'established');
        expect(uncertain.length).toBeGreaterThan(0);
        const sheet = await sheetOf('BRA');
        const uncertainGroup = groupOf(sheet, 'Uncertain');
        expect(within(uncertainGroup).getByRole('heading', {name: 'Uncertain'})).toBeInTheDocument();
        expect(within(uncertainGroup).getByText('Uncertain')).toHaveClass('border-dashed');
        expect(uncertainGroup).toHaveTextContent('Never coloured');
        expect(within(uncertainGroup).getAllByRole('listitem')).toHaveLength(uncertain.length);
        expect(within(uncertainGroup).getAllByText(/Why Uncertain:/)).toHaveLength(uncertain.length);
        // below the established ones, whatever their level
        expect(established.length).toBeGreaterThan(0);
        expect(after(groupOf(sheet, 'Declared'), uncertainGroup)).toBe(true);
        // an established sentence is in one group only
        expect(within(groupOf(sheet, 'Declared')).queryByText(/Why Uncertain:/)).toBeNull();
    });

    it('should show Probable and no Declared for a probable position, and nothing for a candidate with no sentence', async () => {
        // Egypt: probable support for A (weakened from declared)
        const established = signalsOf('EGY').filter(signal => signal.certainty === 'established');
        expect(established.every(signal => signal.level === 'probable')).toBe(true);
        const sheet = await sheetOf('EGY');
        expect(within(sheet).queryByRole('group', {name: 'Declared sentences on Mock candidate A'})).toBeNull();
        expect(within(groupOf(sheet, 'Probable')).getAllByRole('listitem')).toHaveLength(established.length);
    });

    it('should keep a probable sentence apart and say it is not coloured, when the server colours declared positions only', async () => {
        const levels = ['soutien_declare', 'inconnue', 'non_soutien_declare'];
        api.map.mockImplementation(async () => buildMock({levels, candidates}).map);
        api.association.mockImplementation(async qid => buildMock({levels, candidates}).association(qid));
        const sheet = await sheetOf('NGA');
        expect(groupOf(sheet, 'Declared')).toHaveTextContent('Coloured on the map.');
        expect(groupOf(sheet, 'Probable')).toHaveTextContent('Not coloured on the map: it colours declared positions only.');
    });

    it('should show a probable position the server does not colour as Uncertain, with the reason colour_setting', async () => {
        const levels = ['soutien_declare', 'inconnue', 'non_soutien_declare'];
        api.map.mockImplementation(async () => buildMock({levels, candidates}).map);
        api.association.mockImplementation(async qid => buildMock({levels, candidates}).association(qid));
        const sheet = await sheetOf('EGY');
        // Egypt: probable support: not coloured, kept as Uncertain
        expect(within(sheet).queryByRole('group', {name: 'Probable sentences on Mock candidate A'})).toBeNull();
        const uncertainGroup = groupOf(sheet, 'Uncertain');
        expect(within(uncertainGroup).getByText('The map colours declared positions only: this probable position is not coloured.')).toBeInTheDocument();
    });

    it('should say the strong and light colour only when both levels are there, and colour the merged level', async () => {
        serve(COARSE_LEVELS);
        const sheet = await sheetOf('NGA');
        expect(groupOf(sheet, 'Declared')).toHaveTextContent('Coloured on the map.');
        expect(groupOf(sheet, 'Declared')).not.toHaveTextContent('Solid colour');
        expect(groupOf(sheet, 'Probable')).toHaveTextContent('Coloured on the map.');
    });

    it('should keep the sentences under the positions only: the tab Notes has no flat list of them any more', async () => {
        expect(signalsOf('NGA').length).toBeGreaterThan(0);
        const sheet = await sheetOf('NGA');
        // the groups of the candidate hold them
        expect(groupOf(sheet, 'Declared')).toBeInTheDocument();
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
        expect(await within(sheet).findByRole('heading', {name: 'Notes'})).toBeInTheDocument();
        expect(within(sheet).queryByRole('heading', {name: 'Sentences of the news'})).toBeNull();
        expect(within(sheet).queryByRole('blockquote')).toBeNull();
    });
});
