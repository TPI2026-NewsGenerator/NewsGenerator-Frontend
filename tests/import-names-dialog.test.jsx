//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: import-names-dialog.test.jsx
//  Description: The import of a list of names from an Excel file: the file read, the names looked for in
//               Wikidata, the reader choosing among the ones it could not tell, then all followed at once
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';

const sheet = vi.hoisted(() => ({readSheet: vi.fn()}));
vi.mock('read-excel-file/browser', () => sheet);
const api = vi.hoisted(() => ({importCheck: vi.fn(), importNames: vi.fn()}));
vi.mock('@/features/entities/entityApi.js', () => ({EntityApi: api}));

const {ImportNames} = await import('@/features/entities/components/ImportNames.jsx');

const item = (qid, label, description = null) => ({qid, label, description});
// what the server answers for these names, by the name
const RESULTS = {
    'Gianni Infantino': {status: 'linked', item: item('Q124138', 'Gianni Infantino', 'Swiss-Italian football administrator')},
    'Kylian Mbappé': {status: 'linked', famous: true, item: item('Q21621995', 'Kylian Mbappé', 'French footballer')},
    'Michael Oliver': {status: 'choose', items: [item('Q4333767', 'Michael Oliver', 'English football referee'), item('Q2720825', 'Michael Oliver', 'American actor')]},
    'Vadims Ļašenko': {status: 'word'},
    'Aleksander Čeferin': {status: 'known'},
};
const answer = (lot) => ({results: lot.map(name => ({name, ...(RESULTS[name] ?? {status: 'word'})}))});

const fileOf = () => new File(['x'], 'names.xlsx');
const choose = async (rows, room = 50, onImported = vi.fn(), props = {}) => {
    sheet.readSheet.mockResolvedValue(rows);
    render(<ImportNames room={room} onImported={onImported} {...props}/>);
    fireEvent.change(screen.getByLabelText('Excel file of names'), {target: {files: [fileOf()]}});
    await screen.findByText('Names found');
    return onImported;
};

describe('ImportNames', () => {
    afterEach(() => vi.clearAllMocks());

    it('should read the first column, look the names up, let the reader choose among several, and follow them all at once', async () => {
        api.importCheck.mockImplementation(async lot => answer(lot));
        api.importNames.mockResolvedValue({added: {items: 3, words: 2}, left: {full: 0, missing: 0, invalid: 0}, limits: {total: 300},
            entities: [{qid: 'Q124138'}], words: ['Vadims Ļašenko', 'Michael Oliver']});
        const imported = await choose([['Gianni Infantino'], ['Kylian Mbappé'], ['Michael Oliver'], ['Vadims Ļašenko'], ['Aleksander Čeferin'], ['Gianni Infantino']]);

        // the names found, once each, before anything is asked of Wikidata
        expect(screen.getByText((content, element) => element?.tagName === 'P' && element.textContent.startsWith('5 names in the first column'))).toBeInTheDocument();
        expect(api.importCheck).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));

        expect(await screen.findByText('Check before following')).toBeInTheDocument();
        expect(api.importCheck).toHaveBeenCalledTimes(1);
        expect(api.importCheck.mock.calls[0][0]).toEqual(['Gianni Infantino', 'Kylian Mbappé', 'Michael Oliver', 'Vadims Ļašenko', 'Aleksander Čeferin']);
        // 2 linked, 1 to choose, 1 as written, 1 already followed
        expect(screen.getByText(/to choose/).closest('p')).toHaveTextContent('2 linked to Wikidata. 1 to choose. 1 followed as written. 1 already followed.');

        // the choice among the Michael Oliver: the referee
        const which = screen.getByRole('radiogroup', {name: 'Which “Michael Oliver”?'});
        expect(within(which).getByRole('radio', {name: /None of these/})).toBeChecked();
        fireEvent.click(within(which).getByRole('radio', {name: /English football referee/}));
        expect(within(which).getByRole('radio', {name: /English football referee/})).toBeChecked();

        fireEvent.click(screen.getByRole('button', {name: 'Follow 4'}));
        await screen.findByText('Done');
        expect(api.importNames).toHaveBeenCalledWith({qids: ['Q124138', 'Q21621995', 'Q4333767'], words: ['Vadims Ļašenko']});
        expect(imported).toHaveBeenCalledWith(expect.objectContaining({added: {items: 3, words: 2}}));
        expect(screen.getByText(/read in full from Wikidata in the background/)).toBeInTheDocument();
    });

    it('should follow as written the names the reader chose none for, and pick the first of each on request', async () => {
        api.importCheck.mockImplementation(async lot => answer(lot));
        api.importNames.mockResolvedValue({added: {items: 1, words: 0}, left: {full: 0, missing: 0, invalid: 0}, limits: {total: 300}, entities: [], words: []});
        await choose([['Michael Oliver']]);
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));
        await screen.findByText('Check before following');

        fireEvent.click(screen.getByRole('button', {name: 'Pick the first of each'}));
        fireEvent.click(screen.getByRole('button', {name: 'Follow 1'}));
        await screen.findByText('Done');
        expect(api.importNames).toHaveBeenCalledWith({qids: ['Q4333767'], words: []});
    });

    it('should leave out the first row when it is a title', async () => {
        api.importCheck.mockImplementation(async lot => answer(lot));
        await choose([['Names'], ['Gianni Infantino']]);
        fireEvent.click(screen.getByRole('checkbox', {name: 'The first row is a title, not a name'}));
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));
        await screen.findByText('Check before following');
        expect(api.importCheck.mock.calls[0][0]).toEqual(['Gianni Infantino']);
    });

    it('should carry on by itself when Wikidata asks to wait, saying so, without the reader clicking', async () => {
        // the wait is held until the test lets it go, to see what the page says meanwhile
        let release;
        const sleep = vi.fn(() => new Promise(resolve => { release = resolve; }));
        api.importCheck.mockResolvedValueOnce({error: 'Wikidata could not be searched, try again in a moment.', status: 502, retryIn: 30000})
            .mockImplementation(async lot => answer(lot));
        await choose([['Gianni Infantino']], 50, vi.fn(), {sleep});
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));

        expect(await screen.findByText('Wikidata or the server is slow')).toBeInTheDocument();
        expect(screen.getByText(/Carrying on in/)).toHaveTextContent('Wikidata could not be searched, try again in a moment.. Carrying on in 30 s by itself, nothing is lost.');
        expect(sleep).toHaveBeenCalledWith(30000, expect.any(Function));
        expect(screen.queryByRole('button', {name: 'Try again'})).toBeNull();

        release();
        expect(await screen.findByText('Check before following')).toBeInTheDocument();
        expect(api.importCheck).toHaveBeenCalledTimes(2);
        expect(screen.queryByText('Wikidata or the server is slow')).toBeNull();
    });

    it('should carry on when the answer is a page of the tunnel, not data, and with the names a lot left out', async () => {
        const sleep = vi.fn(async () => {});
        const names = Array.from({length: 12}, (_, i) => [`Name ${i}`]);
        api.importCheck
            .mockResolvedValueOnce({error: 'The server answered 524 with a page, not data: it may be restarting or busy. Try again in a moment.', status: 524})
            // Wikidata stopped the search after two names of the lot, 20 s to wait
            .mockImplementationOnce(async lot => ({...answer(lot.slice(0, 2)), retryIn: 20000}))
            .mockImplementation(async lot => answer(lot));
        await choose(names, 50, vi.fn(), {sleep});
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));

        expect(await screen.findByText('Check before following')).toBeInTheDocument();
        expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([4000, 20000]);
        // the lot asked again whole, then from the name after the two told
        expect(api.importCheck.mock.calls.map(([lot]) => [lot[0], lot.length])).toEqual([['Name 0', 10], ['Name 0', 10], ['Name 2', 10]]);
        expect(screen.getByText((content, element) => element?.tagName === 'P' && element.textContent.startsWith('12 followed as written'))).toBeInTheDocument();
    });

    it('should give up after a long time without an answer, keep what it knows, and offer to try again', async () => {
        const sleep = vi.fn(async () => {});
        const failing = {error: 'Wikidata could not be searched, try again in a moment.', status: 502};
        // twelve names: the first lot of ten is told, then nothing answers for longer than the patience
        api.importCheck.mockImplementationOnce(async lot => answer(lot)).mockResolvedValue(failing);
        await choose(Array.from({length: 12}, (_, i) => [`Name ${i}`]), 50, vi.fn(), {sleep, patienceMs: 5000});
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));

        expect(await screen.findByText(/tried again for/)).toBeInTheDocument();
        // the ten told are kept: the reader goes on with the two that are left
        expect(screen.getByText('10 of 12 names')).toBeInTheDocument();
        api.importCheck.mockReset();
        api.importCheck.mockImplementation(async lot => answer(lot));
        fireEvent.click(screen.getByRole('button', {name: 'Try again'}));
        expect(await screen.findByText('Check before following')).toBeInTheDocument();
        expect(api.importCheck).toHaveBeenCalledTimes(1);
        expect(api.importCheck.mock.calls[0][0]).toEqual(['Name 10', 'Name 11']);
    });

    it('should not ask again what the server refuses, such as a session that has ended', async () => {
        const sleep = vi.fn(async () => {});
        api.importCheck.mockResolvedValue({error: 'Forbidden, invalid or expired token... Please try to log in', status: 403});
        await choose([['Gianni Infantino']], 50, vi.fn(), {sleep});
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));

        expect(await screen.findByText(/Forbidden, invalid or expired token/)).toBeInTheDocument();
        expect(sleep).not.toHaveBeenCalled();
        expect(api.importCheck).toHaveBeenCalledTimes(1);
    });

    it('should carry on by itself when the following of the names fails for a reason that passes, nothing followed twice', async () => {
        const sleep = vi.fn(async () => {});
        api.importCheck.mockImplementation(async lot => answer(lot));
        api.importNames.mockResolvedValueOnce({error: 'The server answered 502 with a page, not data: it may be restarting or busy. Try again in a moment.', status: 502})
            .mockResolvedValue({added: {items: 1, words: 0}, left: {full: 0, missing: 0, invalid: 0}, limits: {total: 300}, entities: [], words: []});
        const imported = await choose([['Gianni Infantino']], 50, vi.fn(), {sleep});
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));
        await screen.findByText('Check before following');

        fireEvent.click(screen.getByRole('button', {name: 'Follow 1'}));
        expect(await screen.findByText('Done')).toBeInTheDocument();
        expect(api.importNames).toHaveBeenCalledTimes(2);
        expect(api.importNames).toHaveBeenLastCalledWith({qids: ['Q124138'], words: []});
        expect(imported).toHaveBeenCalledTimes(1);
        expect(sleep).toHaveBeenCalledWith(4000, expect.any(Function));
    });

    it('should tell how many fit when the list is longer than the place left, and follow only the room left', async () => {
        api.importCheck.mockImplementation(async lot => answer(lot));
        await choose([['Gianni Infantino'], ['A one'], ['B two'], ['C three']], 3);
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));
        await screen.findByText('Check before following');

        expect(screen.getByText('More than you can follow')).toBeInTheDocument();
        expect(screen.getByText(/You can follow 3 more and this makes 4/)).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Follow 3'})).toBeInTheDocument();
    });

    it('should say when the file is no Excel file, or holds no name', async () => {
        sheet.readSheet.mockRejectedValue(new Error('not a zip'));
        render(<ImportNames room={50}/>);
        fireEvent.change(screen.getByLabelText('Excel file of names'), {target: {files: [fileOf()]}});
        expect(await screen.findByText(/must be an Excel file/)).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Look them up'})).toBeDisabled();
    });

    it('should not offer the import when nothing more can be followed', () => {
        render(<ImportNames room={0}/>);
        expect(screen.getByRole('button', {name: 'Import from an Excel file'})).toBeDisabled();
    });

    it('should leave off the search when the reader closes the window', async () => {
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        api.importCheck.mockImplementation(async lot => { await gate; return answer(lot); });
        await choose(Array.from({length: 25}, (_, i) => [`Name ${i}`]));
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));
        await screen.findByText('Looking up in Wikidata…');

        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
        release();
        await waitFor(() => expect(screen.queryByText('Looking up in Wikidata…')).toBeNull());
        // the second lot is not asked
        expect(api.importCheck).toHaveBeenCalledTimes(1);
    });
});
