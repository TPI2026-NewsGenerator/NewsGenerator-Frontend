//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-notes.test.jsx
//  Description: The tab "Notes" of the sheet of an association (it was "Sources and notes": the sources are under the positions now): the notes every reader can
//               write with the "+" button (1 to 500 characters), newest first, a delete control on the notes of the reader (on all of them for an administrator),
//               what the server refuses said under the form, and the history of the votes with the notes written with a vote
//
//  The associations, the readers and the notes are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ALL_LEVELS, MOCK_SUBJECTS, answerVote, buildMock, seedNotes} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn(), addNote: vi.fn(), deleteNote: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

// the notes the server keeps, the votes it keeps, and whether the reader is an administrator
let notes = [];
let given = [];
let nextId = 0;
const serve = ({admin = false} = {}) => {
    const mock = buildMock();
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => buildMock({votes: given, notes, reader: 'reader'}).association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
    api.vote.mockImplementation(async body => answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body, by: 'reader'}));
    // what the server does: 1 to 500 characters trimmed (422), the note is the reader's (mine), 201
    api.addNote.mockImplementation(async ({member, text}) => {
        const trimmed = String(text ?? '').trim();
        if (trimmed.length < 1 || trimmed.length > 500) return {error: 'A note has 1 to 500 characters.', status: 422};
        const note = {id: `new-${++nextId}`, member_qid: member, by: 'reader', at: new Date().toISOString(), text: trimmed};
        notes.push(note);
        return {note: {id: note.id, by: note.by, at: note.at, text: note.text, mine: true}};
    });
    // the author or an administrator (403 otherwise), 204
    api.deleteNote.mockImplementation(async (id) => {
        const at = notes.findIndex(one => one.id === id);
        if (at < 0) return {error: 'Unknown note.', status: 404};
        if (notes[at].by !== 'reader' && !admin) return {error: 'Only the author of a note or an administrator can delete it.', status: 403};
        notes.splice(at, 1);
        return null;
    });
};
const show = (url = '/fifa', props = {}) => render(<MemoryRouter initialEntries={[url]}><FifaBoard reader="reader" {...props}/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
const qidOf = (fifa) => buildMock().map.members.find(member => member.fifa === fifa).qid;
// the sheet of an association, on its tab Notes
const openNotes = async (fifa) => {
    await mapReady();
    fireEvent.click(shape(fifa));
    const sheet = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
    await within(sheet).findByRole('group', {name: 'Candidates and their status'});
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
    await within(sheet).findByRole('heading', {name: 'Notes'});
    return sheet;
};
const listOf = (sheet) => within(sheet).queryByRole('list', {name: 'Notes'});
const textsOf = (sheet) => within(listOf(sheet)).getAllByRole('listitem').map(item => item.querySelector('p').textContent);
const openForm = (sheet) => {
    fireEvent.click(within(sheet).getByRole('button', {name: 'Add a note'}));
    return within(sheet).getByRole('textbox', {name: 'Your note'});
};

beforeEach(() => {
    notes = seedNotes();
    given = [];
    nextId = 0;
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the mock: notes', () => {
    it('should carry the notes of readers on the association, newest first, and say which are the reader\'s', () => {
        const sheet = buildMock({reader: 'Mock reader 1'}).association(qidOf('BRA'));
        expect(sheet.notes.map(note => [note.id, note.by, note.mine])).toEqual([['mock-note-2', 'Mock reader 1', true], ['mock-note-1', 'Mock reader 2', false]]);
        expect(buildMock({reader: 'nobody'}).association(qidOf('BRA')).notes.every(note => note.mine === false)).toBe(true);
        expect(buildMock().association(qidOf('IND')).notes).toEqual([]);
        for (const note of sheet.notes) expect(Object.keys(note).sort()).toEqual(['at', 'by', 'id', 'mine', 'text']);
    });
});

describe('the tab Notes', () => {
    it('should be called Notes, and the sources are no tab any more', async () => {
        show();
        await mapReady();
        fireEvent.click(shape('BRA'));
        const sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        await within(sheet).findByRole('group', {name: 'Candidates and their status'});
        expect(within(sheet).getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Positions', 'Summary', 'Leadership profile', 'Notes']);
    });

    it('should list the notes newest first, with who wrote them and when, and the "+" button, and no sources', async () => {
        show();
        const sheet = await openNotes('BRA');
        expect(textsOf(sheet)).toEqual([
            '[Mock] A second note, written by another reader, to see the list.',
            '[Mock] The federation said it will decide after its own congress.',
        ]);
        expect(listOf(sheet)).toHaveTextContent('Mock reader 1 ·');
        expect(listOf(sheet)).toHaveTextContent('Mock reader 2 ·');
        expect(within(sheet).getByRole('button', {name: 'Add a note'})).toHaveAttribute('aria-expanded', 'false');
        expect(within(sheet).getByText('A note is visible to every reader. It is not a position: it never changes a colour.')).toBeInTheDocument();
        // only notes (and the history of the votes): no list of sources, no sentences of the news
        expect(within(sheet).queryByRole('heading', {name: /Sources/})).toBeNull();
        expect(within(sheet).queryByRole('heading', {name: 'Sentences of the news'})).toBeNull();
        expect(within(sheet).getByRole('region', {name: 'Position history'})).toBeInTheDocument();
    });

    it('should say that there is no note yet', async () => {
        show();
        const sheet = await openNotes('IND');
        expect(listOf(sheet)).toBeNull();
        expect(within(sheet).getByText('No reader has written a note on this association yet.')).toBeInTheDocument();
    });

    it('should keep the notes written with a vote in the history of the votes, as before', async () => {
        answerVote({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: qidOf('GER'), subject: 'QMOCK1', value: 'for', note: 'I heard it at the congress'}, by: 'Mock reader 4'});
        show();
        const sheet = await openNotes('GER');
        expect(within(within(sheet).getByRole('region', {name: 'Position history'})).getByText('I heard it at the congress')).toBeInTheDocument();
        // not among the notes of the tab
        expect(listOf(sheet)).toBeNull();
    });
});

describe('adding a note', () => {
    it('should open a form with the "+" button, and close it with Cancel or the same button', async () => {
        show();
        const sheet = await openNotes('IND');
        const plus = within(sheet).getByRole('button', {name: 'Add a note'});
        const box = openForm(sheet);
        expect(plus).toHaveAttribute('aria-expanded', 'true');
        expect(box).toHaveValue('');
        expect(within(sheet).getByText('0 / 500')).toBeInTheDocument();
        expect(within(sheet).getByRole('button', {name: 'Add the note'})).toBeDisabled();
        fireEvent.click(within(sheet).getByRole('button', {name: 'Cancel'}));
        expect(within(sheet).queryByRole('textbox', {name: 'Your note'})).toBeNull();
        openForm(sheet);
        fireEvent.click(plus);
        expect(within(sheet).queryByRole('textbox', {name: 'Your note'})).toBeNull();
    });

    it('should send the note trimmed, show it first as the reader\'s, close the form, and keep it after the sheet is read again', async () => {
        show();
        const sheet = await openNotes('BRA');
        const box = openForm(sheet);
        fireEvent.change(box, {target: {value: '   A note of mine.  '}});
        expect(within(sheet).getByText('15 / 500')).toBeInTheDocument();
        fireEvent.click(within(sheet).getByRole('button', {name: 'Add the note'}));
        await waitFor(() => expect(api.addNote).toHaveBeenCalledWith({member: qidOf('BRA'), text: 'A note of mine.'}));
        await waitFor(() => expect(textsOf(sheet)[0]).toBe('A note of mine.'));
        expect(textsOf(sheet)).toHaveLength(3);
        expect(listOf(sheet).querySelector('li')).toHaveTextContent('reader (you) ·');
        expect(within(sheet).queryByRole('textbox', {name: 'Your note'})).toBeNull();
        // the sheet read again (another tab, another sheet) gives it back: the server has it
        const again = await api.association(qidOf('BRA'));
        expect(again.notes[0]).toMatchObject({text: 'A note of mine.', mine: true});
    });

    it('should not send an empty note, a note of spaces, nor one over 500 characters', async () => {
        show();
        const sheet = await openNotes('IND');
        const box = openForm(sheet);
        const send = within(sheet).getByRole('button', {name: 'Add the note'});
        fireEvent.change(box, {target: {value: '    '}});
        expect(send).toBeDisabled();
        fireEvent.change(box, {target: {value: 'x'.repeat(500)}});
        expect(send).toBeEnabled();
        fireEvent.change(box, {target: {value: 'x'.repeat(501)}});
        expect(send).toBeDisabled();
        expect(within(sheet).getByText('501 / 500')).toHaveClass('!text-accent-ink');
        expect(api.addNote).not.toHaveBeenCalled();
    });

    it('should say what the server refuses under the form and keep what was typed: 422, 429, signed out, a network failure', async () => {
        show();
        const sheet = await openNotes('IND');
        const box = openForm(sheet);
        fireEvent.change(box, {target: {value: 'My note'}});
        const press = async () => {
            fireEvent.click(within(sheet).getByRole('button', {name: 'Add the note'}));
            return await within(sheet).findByRole('alert');
        };
        api.addNote.mockResolvedValueOnce({error: 'You wrote 10 notes in the last hour: try again later.', status: 429});
        expect(await press()).toHaveTextContent('You wrote 10 notes in the last hour: try again later.');
        expect(box).toHaveValue('My note');
        api.addNote.mockResolvedValueOnce({error: 'A note has 1 to 500 characters.', status: 422});
        expect(await press()).toHaveTextContent('A note has 1 to 500 characters.');
        api.addNote.mockResolvedValueOnce({error: 'Forbidden, invalid or expired', status: 401});
        expect(await press()).toHaveTextContent('Sign in to write a note.');
        api.addNote.mockRejectedValueOnce(new Error('offline'));
        expect(await press()).toHaveTextContent('The note could not be sent. Try again in a moment.');
        expect(listOf(sheet)).toBeNull();
        expect(box).toHaveValue('My note');
    });
});

describe('deleting a note', () => {
    const writeOne = async (sheet) => {
        fireEvent.change(openForm(sheet), {target: {value: 'To delete'}});
        fireEvent.click(within(sheet).getByRole('button', {name: 'Add the note'}));
        await waitFor(() => expect(textsOf(sheet)[0]).toBe('To delete'));
    };

    it('should offer the delete control on the notes of the reader only', async () => {
        show();
        const sheet = await openNotes('BRA');
        // the notes of the others: none
        expect(within(sheet).queryAllByRole('button', {name: /^Delete the note of/})).toHaveLength(0);
        await writeOne(sheet);
        const buttons = within(sheet).getAllByRole('button', {name: /^Delete the note of/});
        expect(buttons).toHaveLength(1);
        expect(buttons[0]).toHaveAccessibleName(/^Delete the note of reader,/);
        expect(listOf(sheet).querySelector('li').contains(buttons[0])).toBe(true);
    });

    it('should ask first, delete with "Yes, delete", and forget the note', async () => {
        show();
        const sheet = await openNotes('BRA');
        await writeOne(sheet);
        fireEvent.click(within(sheet).getByRole('button', {name: /^Delete the note of reader/}));
        expect(within(sheet).getByText('Delete this note?')).toBeInTheDocument();
        // "Keep it" takes it back
        fireEvent.click(within(sheet).getByRole('button', {name: 'Keep it'}));
        expect(within(sheet).queryByText('Delete this note?')).toBeNull();
        expect(api.deleteNote).not.toHaveBeenCalled();
        fireEvent.click(within(sheet).getByRole('button', {name: /^Delete the note of reader/}));
        fireEvent.click(within(sheet).getByRole('button', {name: 'Yes, delete'}));
        await waitFor(() => expect(api.deleteNote).toHaveBeenCalledWith('new-1'));
        await waitFor(() => expect(textsOf(sheet)).not.toContain('To delete'));
        expect(textsOf(sheet)).toHaveLength(2);
        expect(notes.some(one => one.text === 'To delete')).toBe(false);
    });

    it('should say the refusal of the server and keep the note: a 403, a network failure', async () => {
        show();
        const sheet = await openNotes('BRA');
        await writeOne(sheet);
        fireEvent.click(within(sheet).getByRole('button', {name: /^Delete the note of reader/}));
        api.deleteNote.mockResolvedValueOnce({error: 'Only the author of a note or an administrator can delete it.', status: 403});
        fireEvent.click(within(sheet).getByRole('button', {name: 'Yes, delete'}));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('Only the author of a note or an administrator can delete it.');
        expect(textsOf(sheet)).toContain('To delete');
        api.deleteNote.mockRejectedValueOnce(new Error('offline'));
        fireEvent.click(within(sheet).getByRole('button', {name: 'Yes, delete'}));
        await waitFor(() => expect(within(sheet).getByRole('alert')).toHaveTextContent('The note could not be deleted. Try again in a moment.'));
        expect(textsOf(sheet)).toContain('To delete');
    });

    it('should offer it on every note to an administrator, and delete one of another reader', async () => {
        serve({admin: true});
        show('/fifa', {admin: true});
        const sheet = await openNotes('BRA');
        const buttons = within(sheet).getAllByRole('button', {name: /^Delete the note of/});
        expect(buttons).toHaveLength(2);
        fireEvent.click(within(sheet).getByRole('button', {name: /^Delete the note of Mock reader 1/}));
        fireEvent.click(within(sheet).getByRole('button', {name: 'Yes, delete'}));
        await waitFor(() => expect(api.deleteNote).toHaveBeenCalledWith('mock-note-2'));
        await waitFor(() => expect(textsOf(sheet)).toEqual(['[Mock] The federation said it will decide after its own congress.']));
    });
});
