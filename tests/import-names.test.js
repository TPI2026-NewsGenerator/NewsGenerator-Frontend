//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: import-names.test.js
//  Description: A list of names from an Excel file: the first column read, the names looked for in Wikidata
//               by lots and asked again by themselves when it does not answer, and what the choices of the
//               reader make of them
//

import {describe, expect, it, vi} from 'vitest';
import {CHECK_LOT, checkNames, isTransient, namesOfSheet, planOf, withRetry} from '@/features/entities/importNames.js';

// the waits of the tests are not waited
const noWait = () => vi.fn(async () => {});

describe('namesOfSheet', () => {
    it('should take the first column, once each whatever the case, without the empty cells nor the quotes', () => {
        const rows = [['Gianni Infantino', 'FIFA'], ['  Aleksander   Čeferin '], [null], ['gianni infantino'], ['"Roberto Rosetti"'], [''], [2026], []];
        expect(namesOfSheet(rows)).toEqual(['Gianni Infantino', 'Aleksander Čeferin', 'Roberto Rosetti', '2026']);
    });

    it('should leave out the first row when it is a title', () => {
        expect(namesOfSheet([['Names'], ['Lise Klaveness']], {skipFirst: true})).toEqual(['Lise Klaveness']);
        expect(namesOfSheet(undefined)).toEqual([]);
    });
});

describe('isTransient', () => {
    it('should ask again what passes: a page, a 5xx, no network, a limit to go slower; not what the server refused', () => {
        expect([0, 408, 429, 500, 502, 524, undefined].map(status => isTransient({error: 'x', status}))).toEqual(Array(7).fill(true));
        expect([400, 401, 403, 404].map(status => isTransient({error: 'x', status}))).toEqual([false, false, false, false]);
    });
});

describe('withRetry', () => {
    it('should give the data of a call that goes well, without waiting', async () => {
        const sleep = noWait();
        expect(await withRetry(async () => ({results: []}), {sleep})).toEqual({results: []});
        expect(sleep).not.toHaveBeenCalled();
    });

    it('should ask again by itself after a wait that grows, 4, 8, 16 s, and tell each wait', async () => {
        const sleep = noWait();
        const waits = [];
        const call = vi.fn()
            .mockResolvedValueOnce({error: 'The server answered 524', status: 524})
            .mockResolvedValueOnce({error: 'Wikidata could not be searched', status: 502})
            .mockResolvedValueOnce({error: 'Wikidata could not be searched', status: 502})
            .mockResolvedValue({results: [1]});

        expect(await withRetry(call, {sleep, onWait: wait => waits.push([wait.ms, wait.failures])})).toEqual({results: [1]});
        expect(waits).toEqual([[4000, 1], [8000, 2], [16000, 3]]);
        expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([4000, 8000, 16000]);
    });

    it('should wait what the server asks when it is more: Wikidata asking to wait, the limit of the requests', async () => {
        const sleep = noWait();
        await withRetry(vi.fn().mockResolvedValueOnce({error: 'Wikidata', status: 502, retryIn: 30000})
            .mockResolvedValueOnce({error: 'Too many', status: 429, retryAfter: 45}).mockResolvedValue({}), {sleep});
        // at most two minutes, whatever it asks
        await withRetry(vi.fn().mockResolvedValueOnce({error: 'Wikidata', status: 502, retryIn: 900000}).mockResolvedValue({}), {sleep});
        expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([30000, 45000, 120000]);
    });

    it('should ask again a call that failed before the server, with no network', async () => {
        const sleep = noWait();
        const call = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue({results: []});
        expect(await withRetry(call, {sleep})).toEqual({results: []});
        expect(call).toHaveBeenCalledTimes(2);
    });

    it('should throw at once the error of a call the server refused', async () => {
        const sleep = noWait();
        await expect(withRetry(async () => ({error: 'Forbidden, invalid or expired token', status: 403}), {sleep})).rejects.toThrow('Forbidden');
        await expect(withRetry(async () => ({error: 'names: 1 to 10 names.', status: 400}), {sleep})).rejects.toThrow('names');
        expect(sleep).not.toHaveBeenCalled();
    });

    it('should give up when it has waited its patience, and say for how long it tried', async () => {
        const sleep = noWait();
        // 4 + 8 + 16 + 32 = 60 s, then 60 s each: past 150 s it stops
        await expect(withRetry(async () => ({error: 'Wikidata could not be searched', status: 502}), {sleep, patienceMs: 150e3}))
            .rejects.toThrow(/Wikidata could not be searched \(tried again for \d+ minutes\)/);
        expect(sleep.mock.calls.reduce((sum, [ms]) => sum + ms, 0)).toBeLessThanOrEqual(150e3);
    });

    it('should leave off, giving nothing, when asked to stop', async () => {
        let stopped = false;
        const call = vi.fn(async () => ({error: 'busy', status: 502}));
        const sleep = vi.fn(async () => { stopped = true; });
        expect(await withRetry(call, {sleep, stop: () => stopped})).toBeNull();
        expect(call).toHaveBeenCalledTimes(1);
    });
});

describe('checkNames', () => {
    const names = Array.from({length: 23}, (_, i) => `Name ${i}`);
    const answer = (lot) => ({results: lot.map(name => ({name, status: 'word'}))});

    it('should ask the names by lots, one lot after the other, and tell how many are done', async () => {
        const check = vi.fn(async (lot) => answer(lot));
        const done = [];
        const results = await checkNames(names, check, {onResult: count => done.push(count)});

        expect(check.mock.calls.map(([lot]) => lot.length)).toEqual([CHECK_LOT, CHECK_LOT, 3]);
        expect(done).toEqual([10, 20, 23]);
        expect(results.get('Name 22')).toEqual({name: 'Name 22', status: 'word'});
    });

    it('should carry on by itself when a lot fails for a reason that passes, the names told kept and none asked twice', async () => {
        const sleep = noWait();
        const waits = [];
        const check = vi.fn(async (lot) => answer(lot));
        check.mockResolvedValueOnce(answer(names.slice(0, 10))).mockResolvedValueOnce({error: 'Wikidata could not be searched', status: 502, retryIn: 30000});
        const results = await checkNames(names, check, {sleep, onWait: wait => waits.push(wait.ms)});

        expect(results.size).toBe(23);
        expect(waits).toEqual([30000]);
        // the lot that failed was asked again, the first not
        expect(check.mock.calls.map(([lot]) => lot[0])).toEqual(['Name 0', 'Name 10', 'Name 10', 'Name 20']);
    });

    it('should keep the results when it gives up, for the reader to carry on with the same map', async () => {
        const sleep = noWait();
        const check = vi.fn(async (lot) => answer(lot));
        check.mockResolvedValueOnce(answer(names.slice(0, 10))).mockResolvedValue({error: 'The server answered 524 with a page, not data', status: 524});
        const results = new Map();
        await expect(checkNames(names, check, {results, sleep, patienceMs: 20e3})).rejects.toThrow('524');
        expect(results.size).toBe(10);

        check.mockImplementation(async (lot) => answer(lot));
        await checkNames(names, check, {results, sleep});
        expect(results.size).toBe(23);
    });

    it('should ask again the names an answer left out, and wait the time Wikidata asked when it stopped the search', async () => {
        const sleep = noWait();
        const waits = [];
        // the server tells the first names only: Wikidata stopped the search, 20 s to wait
        const check = vi.fn(async (lot) => ({results: lot.slice(0, 2).map(name => ({name, status: 'word'})), ...(lot.length > 2 ? {retryIn: 20000} : {})}));
        const results = await checkNames(['A', 'B', 'C', 'D', 'E'], check, {sleep, onWait: wait => waits.push(wait.ms)});

        expect([...results.keys()]).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(check.mock.calls.map(([lot]) => lot)).toEqual([['A', 'B', 'C', 'D', 'E'], ['C', 'D', 'E'], ['E']]);
        // waited twice, after the answers that were not whole; none for the last
        expect(waits).toEqual([20000, 20000]);
    });

    it('should refuse an answer that tells none, and leave off when asked to', async () => {
        await expect(checkNames(['A', 'B'], async () => ({results: []}), {sleep: noWait()})).rejects.toThrow('incomplete');
        await expect(checkNames(['A'], async () => ({}), {sleep: noWait()})).rejects.toThrow('incomplete');

        const check = vi.fn(async (lot) => answer(lot));
        await checkNames(names, check, {stop: () => check.mock.calls.length >= 1});
        expect(check).toHaveBeenCalledTimes(1);
    });

    it('should throw at once when the server refuses the call, whatever the patience', async () => {
        const sleep = noWait();
        await expect(checkNames(['A'], async () => ({error: 'Forbidden', status: 403}), {sleep})).rejects.toThrow('Forbidden');
        expect(sleep).not.toHaveBeenCalled();
    });
});

describe('planOf', () => {
    const names = ['Infantino', 'Mbappé', 'Oliver', 'LFF', 'Nobody', 'Known', 'x', 'Unchecked'];
    const item = (qid, label) => ({qid, label, description: null});
    const results = new Map([
        ['Infantino', {name: 'Infantino', status: 'linked', item: item('Q1', 'Gianni Infantino')}],
        ['Mbappé', {name: 'Mbappé', status: 'linked', item: item('Q2', 'Kylian Mbappé'), famous: true}],
        ['Oliver', {name: 'Oliver', status: 'choose', items: [item('Q3', 'Michael Oliver'), item('Q4', 'Michael Oliver')]}],
        ['LFF', {name: 'LFF', status: 'choose', items: [item('Q5', 'Lucasfilm')]}],
        ['Nobody', {name: 'Nobody', status: 'word'}],
        ['Known', {name: 'Known', status: 'known'}],
        ['x', {name: 'x', status: 'invalid'}],
    ]);

    it('should follow the items linked, the names with none as written, and a name to choose as written until a choice is made', () => {
        const plan = planOf(names, results, new Map());
        expect(plan.qids).toEqual(['Q1', 'Q2']);
        expect(plan.words).toEqual(['Oliver', 'LFF', 'Nobody']);
        expect(plan.counts).toEqual({total: 8, known: 1, linked: 2, word: 1, toChoose: 2, invalid: 1, unchecked: 1});
        expect(plan.toChoose.map(choice => choice.name)).toEqual(['Oliver', 'LFF']);
        expect(plan.linked.map(link => [link.name, link.famous])).toEqual([['Infantino', false], ['Mbappé', true]]);
    });

    it('should follow the item chosen among several, and as written the ones the reader says none of', () => {
        const plan = planOf(names, results, new Map([['Oliver', 'Q3'], ['LFF', 'none']]));
        expect(plan.qids).toEqual(['Q1', 'Q2', 'Q3']);
        expect(plan.words).toEqual(['LFF', 'Nobody']);
    });

    it('should follow an item once however many names are linked to it', () => {
        const same = new Map([['A', {name: 'A', status: 'linked', item: item('Q1', 'X')}], ['B', {name: 'B', status: 'linked', item: item('Q1', 'X')}]]);
        expect(planOf(['A', 'B'], same, new Map()).qids).toEqual(['Q1']);
    });
});
