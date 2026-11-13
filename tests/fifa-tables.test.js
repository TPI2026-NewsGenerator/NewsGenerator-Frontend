//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-tables.test.js
//  Description: The logic of the tables of the views List, Presidents and Confederations as pure functions: the cycle of a sort and its aria-sort, the
//               default order of each table with its ties (a tie falls to the next rule, a row with no value is last), the filters of the columns
//               (any value of a filter keeps a row, the filters combine with AND), the chips, and the search that finds a confederation or its members
//

import {describe, expect, it} from 'vitest';
import {buildMock} from '../bench/fifa/mock-data.mjs';
import {
    CONFEDERATION_COLUMN_FILTERS, compareConfederations, confederationFilters, confederationItems, confederationSorts, searchConfederation,
} from '@/features/fifa/confederationsModel.js';
import {LIST_COLUMN_FILTERS, LIST_SORTS, compareList, listFilters} from '@/features/fifa/listModel.js';
import {PRESIDENT_COLUMN_FILTERS, PRESIDENT_SORTS, comparePresidents, presidentFilters, presidentMatches} from '@/features/fifa/presidentsModel.js';
import {describe as describePosition} from '@/features/fifa/positions.js';
import {ariaSortOf, chipsOf, filterItems, nextSort, pickFilters, sortItems} from '@/features/fifa/table.js';

const order = (items, key = 'name') => items.map(item => item[key]);

describe('the sort of a column', () => {
    it('should cycle none, ascending, descending, none on the same column', () => {
        let state = {sort: '', dir: 'asc'};
        const seen = [];
        for (let step = 0; step < 4; step += 1) {
            state = nextSort(state.sort, state.dir, 'articles');
            seen.push(state);
        }
        expect(seen).toEqual([
            {sort: 'articles', dir: 'asc'},
            {sort: 'articles', dir: 'desc'},
            {sort: '', dir: 'asc'},
            {sort: 'articles', dir: 'asc'},
        ]);
    });

    it('should start another column ascending, whatever the first one was', () => {
        expect(nextSort('articles', 'desc', 'name')).toEqual({sort: 'name', dir: 'asc'});
    });

    it('should say aria-sort for the column sorted only', () => {
        expect(ariaSortOf('articles', 'asc', 'articles')).toBe('ascending');
        expect(ariaSortOf('articles', 'desc', 'articles')).toBe('descending');
        expect(ariaSortOf('articles', 'desc', 'name')).toBe('none');
        expect(ariaSortOf('', 'asc', 'name')).toBe('none');
    });

    it('should compare numbers as numbers and words in the way of the language, and put what has no value last in either direction', () => {
        const items = [{n: 10, w: 'zebra'}, {n: 9, w: 'Émile'}, {n: null, w: ''}, {n: 100, w: 'apple'}];
        const tie = () => 0;
        expect(order(sortItems(items, {n: item => item.n}, 'n', 'asc', tie), 'n')).toEqual([9, 10, 100, null]);
        expect(order(sortItems(items, {n: item => item.n}, 'n', 'desc', tie), 'n')).toEqual([100, 10, 9, null]);
        expect(order(sortItems(items, {w: item => item.w}, 'w', 'asc', tie), 'w')).toEqual(['apple', 'Émile', 'zebra', '']);
    });

    it('should settle what the column leaves equal with the default order of the table, in either direction', () => {
        const items = [
            {name: 'Cee', articles: 3}, {name: 'Abe', articles: 3}, {name: 'Bee', articles: 5}, {name: 'Dee', articles: 3},
        ];
        const tie = (a, b) => a.name.localeCompare(b.name);
        const sorts = {articles: item => item.articles};
        expect(order(sortItems(items, sorts, 'articles', 'desc', tie))).toEqual(['Bee', 'Abe', 'Cee', 'Dee']);
        // descending reverses the column, not the default order that settles the ties
        expect(order(sortItems(items, sorts, 'articles', 'asc', tie))).toEqual(['Abe', 'Cee', 'Dee', 'Bee']);
    });

    it('should use the default order alone when no column is sorted, or one the table does not know', () => {
        const items = [{name: 'B'}, {name: 'A'}];
        const tie = (a, b) => a.name.localeCompare(b.name);
        expect(order(sortItems(items, {}, '', 'asc', tie))).toEqual(['A', 'B']);
        expect(order(sortItems(items, {}, 'nonsense', 'desc', tie))).toEqual(['A', 'B']);
    });

    it('should not change the array it is given', () => {
        const items = [{name: 'B'}, {name: 'A'}];
        sortItems(items, {}, '', 'asc', (a, b) => a.name.localeCompare(b.name));
        expect(order(items)).toEqual(['B', 'A']);
    });
});

describe('the default order of the list', () => {
    const row = (name, category, lastSignal, articles) => ({name, category, lastSignal, articles, member: {confederation: 'CAF'}});
    const items = [
        row('Zed', 'unknown', 5, 9),
        row('Bee', 'indicated', null, 0),
        row('Cee', 'uncertain', 10, 1),
        row('Dee', 'conflicting', 1, 1),
        row('Eve', 'indicated', 100, 2),
        row('Fay', 'indicated', 100, 7),
        row('Abe', 'indicated', 100, 7),
        row('Gus', 'unknown', null, 3),
        row('Hal', 'unknown', null, 3),
    ];

    it('should put a candidate indicated first, then conflicting, then Uncertain, then Unknown', () => {
        const sorted = sortItems(items, LIST_SORTS, '', 'asc', compareList);
        expect(order(sorted, 'category')).toEqual(['indicated', 'indicated', 'indicated', 'indicated', 'conflicting', 'uncertain', 'unknown', 'unknown', 'unknown']);
    });

    it('should settle a category by the last signal (the newest first, none last), then the articles (the most first), then the name', () => {
        const sorted = sortItems(items, LIST_SORTS, '', 'asc', compareList);
        // indicated: three with the same last signal (articles 7, 7, 2 -> Abe before Fay by name), then the one with no signal at all
        expect(order(sorted).slice(0, 4)).toEqual(['Abe', 'Fay', 'Eve', 'Bee']);
        // then conflicting, Uncertain, and Unknown: the newest signal first, the ones with none settled by the articles (equal) then the name
        expect(order(sorted).slice(4)).toEqual(['Dee', 'Cee', 'Zed', 'Gus', 'Hal']);
    });

    it('should not depend on the order the rows come in', () => {
        const expected = order(sortItems(items, LIST_SORTS, '', 'asc', compareList));
        expect(order(sortItems([...items].reverse(), LIST_SORTS, '', 'asc', compareList))).toEqual(expected);
    });

    it('should sort by the last signal with the rows with none last, in either direction', () => {
        expect(order(sortItems(items, LIST_SORTS, 'last', 'asc', compareList)).slice(-3)).toEqual(['Bee', 'Gus', 'Hal']);
        expect(order(sortItems(items, LIST_SORTS, 'last', 'desc', compareList)).slice(-3)).toEqual(['Bee', 'Gus', 'Hal']);
    });
});

describe('the default order of the presidents', () => {
    const president = (name, articles, latest) => ({name, articles, latest, member: {name: `Assoc ${name}`, confederation: 'UEFA'}, category: 'unknown', source: 'fifa', since: null});
    const items = [
        president('Zoe', 0, null), president('Ann', 3, 100), president('Bob', 3, 200), president('Cal', 9, 50),
        president('Dan', 3, null), president('Eli', 3, null), president('Fay', 0, null),
    ];

    it('should put the most named first, then the latest mention (the newest first, none last), then the name', () => {
        expect(order(sortItems(items, PRESIDENT_SORTS, '', 'asc', comparePresidents))).toEqual(['Cal', 'Bob', 'Ann', 'Dan', 'Eli', 'Fay', 'Zoe']);
    });

    it('should fall back to the default order when the column sorted has the same value everywhere', () => {
        expect(order(sortItems(items, PRESIDENT_SORTS, 'conf', 'asc', comparePresidents))).toEqual(['Cal', 'Bob', 'Ann', 'Dan', 'Eli', 'Fay', 'Zoe']);
    });

    it('should find a president by his name or his association by its name, its country or its code, without the accents', () => {
        const one = {name: 'José Álvarez', member: {name: 'Bolivia', association: 'Federación Boliviana', fifa: 'BOL', iso: 'BO'}};
        for (const search of ['jose', 'ALVAREZ', 'bolivia', 'federacion', 'bol', '']) expect(presidentMatches(one, search)).toBe(true);
        expect(presidentMatches(one, 'peru')).toBe(false);
    });
});

describe('the default order of the confederations', () => {
    it('should put the most members first, then the code', () => {
        const items = [
            {code: 'OFC', total: 11}, {code: 'UEFA', total: 55}, {code: 'CAF', total: 54}, {code: 'AFC', total: 47}, {code: 'CONCACAF', total: 35}, {code: 'CONMEBOL', total: 10},
            {code: 'XXX', total: 11},
        ];
        const sorts = {code: item => item.code};
        expect(order(sortItems(items, sorts, '', 'asc', compareConfederations), 'code')).toEqual(['UEFA', 'CAF', 'AFC', 'CONCACAF', 'OFC', 'XXX', 'CONMEBOL']);
    });
});

describe('the filters of the columns', () => {
    const defs = presidentFilters();
    const row = (name, confederation, articles, source) => ({name, articles, source, category: 'unknown', member: {confederation}});
    const items = [row('a', 'CAF', 2, 'fifa'), row('b', 'UEFA', 0, 'fifa'), row('c', 'CAF', 0, 'wikidata'), row('d', 'AFC', 4, 'wikidata'), row('e', 'UEFA', 6, 'fifa')];

    it('should keep a row that has any value chosen of a filter', () => {
        expect(order(filterItems(items, defs, {conf: ['CAF', 'UEFA']}))).toEqual(['a', 'b', 'c', 'e']);
    });

    it('should combine the filters of different columns with AND', () => {
        expect(order(filterItems(items, defs, {conf: ['CAF', 'UEFA'], ment: ['with'], source: ['fifa']}))).toEqual(['a', 'e']);
        expect(order(filterItems(items, defs, {conf: ['AFC'], ment: ['without']}))).toEqual([]);
    });

    it('should keep every row when no value is chosen', () => {
        expect(filterItems(items, defs, {})).toHaveLength(5);
        expect(filterItems(items, defs, {conf: []})).toHaveLength(5);
    });

    it('should only know the filters and the values the table has', () => {
        expect(pickFilters({conf: ['CAF', 'ZZZ'], bogus: ['x'], ment: ['with']}, defs)).toEqual({conf: ['CAF'], ment: ['with']});
        expect(pickFilters({conf: ['ZZZ']}, defs)).toEqual({});
    });

    it('should say each value chosen in a chip, with the name of its filter', () => {
        expect(chipsOf(defs, {conf: ['CAF', 'UEFA'], ment: ['without']})).toEqual([
            {key: 'conf', value: 'CAF', text: 'Confederation: CAF'},
            {key: 'conf', value: 'UEFA', text: 'Confederation: UEFA'},
            {key: 'ment', value: 'without', text: 'Mentions: Without mentions'},
        ]);
    });

    it('should give the columns the filters the spec lists', () => {
        const subjects = [{qid: 'Q1', name: 'One'}];
        expect(Object.keys(listFilters(subjects))).toEqual(['conf', 'pos', 'lvl', 'cand', 'origin', 'last', 'art']);
        expect(LIST_COLUMN_FILTERS).toEqual({conf: ['conf'], cand: ['cand'], pos: ['pos', 'lvl', 'origin'], last: ['last'], articles: ['art']});
        expect(Object.keys(presidentFilters())).toEqual(['conf', 'ment', 'source', 'pos']);
        expect(PRESIDENT_COLUMN_FILTERS).toEqual({conf: ['conf'], pos: ['pos'], articles: ['ment'], source: ['source']});
        expect(Object.keys(confederationFilters(subjects))).toEqual(['ownpos', 'supp']);
        expect(CONFEDERATION_COLUMN_FILTERS).toEqual({own: ['ownpos'], members: ['supp']});
    });
});

describe('the rows of the confederations and their search', () => {
    const mock = buildMock();
    const {levels, subjects} = mock.map;
    const members = mock.map.members;
    const associations = members.filter(member => member.level === 'association')
        .map(member => ({member, described: describePosition(member, {mode: 'all'}, levels, subjects)}));
    const items = confederationItems({confederations: mock.confederations.confederations, associations, members, levels, subjects});

    it('should make a row for each confederation, with its members counted once', () => {
        expect(items).toHaveLength(6);
        expect(items.reduce((total, item) => total + item.total, 0)).toBe(211);
        for (const item of items) {
            expect(item.rows).toHaveLength(item.total);
            expect(item.conflicting + item.uncertain + item.none).toBeLessThanOrEqual(item.total);
            expect(Object.keys(item.support).sort()).toEqual(subjects.map(subject => subject.qid).sort());
        }
    });

    it('should sort by the members counted, the candidates supported, and its own position', () => {
        const sorts = confederationSorts(subjects);
        expect(Object.keys(sorts)).toEqual(['code', 'president', 'own', 'members', ...subjects.map(subject => `support:${subject.qid}`), 'conflicting', 'uncertain', 'none']);
        const byMembers = sortItems(items, sorts, 'members', 'desc', compareConfederations);
        expect(order(byMembers, 'total')).toEqual([...order(byMembers, 'total')].sort((a, b) => b - a));
        const bySupport = sortItems(items, sorts, `support:${subjects[0].qid}`, 'desc', compareConfederations);
        expect(bySupport.map(item => item.support[subjects[0].qid])).toEqual(bySupport.map(item => item.support[subjects[0].qid]).sort((a, b) => b - a));
    });

    it('should find a confederation by its code, its name or its president, and say it matches itself', () => {
        const caf = items.find(item => item.code === 'CAF');
        expect(searchConfederation(caf, 'caf', new Map())).toMatchObject({self: true, active: true});
        expect(searchConfederation(caf, 'mock president caf', new Map()).self).toBe(true);
        expect(searchConfederation(caf, caf.confederation.name.slice(0, 6), new Map()).self).toBe(true);
    });

    it('should find a member by its name, its country, its code or its president, and keep only the ones that match', () => {
        const south = items.find(item => item.code === 'CONMEBOL');
        const brazil = south.rows.find(row => row.member.fifa === 'BRA').member;
        const found = searchConfederation(south, 'brazil', new Map());
        expect(found.active).toBe(true);
        expect(found.members.map(row => row.member.fifa)).toEqual(['BRA']);
        const byPresident = searchConfederation(south, 'ferreira', new Map([[brazil.qid, 'Ana Ferreira']]));
        expect(byPresident.members.map(row => row.member.fifa)).toEqual(['BRA']);
        // another confederation has no member of that name
        const caf = items.find(item => item.code === 'CAF');
        expect(searchConfederation(caf, 'brazil', new Map())).toMatchObject({self: false, members: []});
    });

    it('should leave a confederation whole when nothing is searched', () => {
        const uefa = items.find(item => item.code === 'UEFA');
        const found = searchConfederation(uefa, '  ', new Map());
        expect(found).toMatchObject({self: true, active: false});
        expect(found.members).toHaveLength(uefa.total);
    });
});
