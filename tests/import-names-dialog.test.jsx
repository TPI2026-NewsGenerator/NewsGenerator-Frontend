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
const choose = async (rows, room = 50, onImported = vi.fn()) => {
    sheet.readSheet.mockResolvedValue(rows);
    render(<ImportNames room={room} onImported={onImported}/>);
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

    it('should say when Wikidata could not be asked and carry on from there when the reader tries again', async () => {
        api.importCheck.mockResolvedValueOnce({error: 'Wikidata could not be searched, try again in a moment.'}).mockImplementation(async lot => answer(lot));
        await choose([['Gianni Infantino']]);
        fireEvent.click(screen.getByRole('button', {name: 'Look them up'}));

        expect(await screen.findByText(/Wikidata could not be searched/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Try again'}));
        expect(await screen.findByText('Check before following')).toBeInTheDocument();
        expect(api.importCheck).toHaveBeenCalledTimes(2);
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
