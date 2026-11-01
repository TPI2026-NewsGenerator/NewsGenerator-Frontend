//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: import-names.test.js
//  Description: A list of names from an Excel file: the first column read, the names looked for in Wikidata
//               by lots, and what the choices of the reader make of them
//

import {describe, expect, it, vi} from 'vitest';
import {CHECK_LOT, checkNames, namesOfSheet, planOf} from '@/features/entities/importNames.js';

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

    it('should carry on from where a failed lot stopped when given the results again', async () => {
        const check = vi.fn(async (lot) => answer(lot));
        check.mockResolvedValueOnce(answer(names.slice(0, 10))).mockResolvedValueOnce({error: 'Wikidata could not be searched'});
        const results = new Map();
        await expect(checkNames(names, check, {results})).rejects.toThrow('Wikidata could not be searched');
        expect(results.size).toBe(10);

        await checkNames(names, check, {results});
        expect(results.size).toBe(23);
        // the lot that failed was asked again, the first not
        expect(check.mock.calls.map(([lot]) => lot[0])).toEqual(['Name 0', 'Name 10', 'Name 10', 'Name 20']);
    });

    it('should refuse an answer that does not tell every name, and leave off when asked to', async () => {
        await expect(checkNames(['A', 'B'], async () => ({results: [{name: 'A', status: 'word'}]}))).rejects.toThrow('incomplete');

        const check = vi.fn(async (lot) => answer(lot));
        await checkNames(names, check, {stop: () => check.mock.calls.length >= 1});
        expect(check).toHaveBeenCalledTimes(1);
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
