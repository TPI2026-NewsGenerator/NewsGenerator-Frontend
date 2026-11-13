//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-state.test.jsx
//  Description: What the reader chose on the page "The FIFA presidency" lives in the address: it survives a change of view and a reload,
//               a default is left out, a value the page does not know is the default, the filters reset and the view and the sheet stay
//

import '@testing-library/jest-dom';
import {describe, expect, it} from 'vitest';
import {useEffect} from 'react';
import {act, renderHook} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {readState, useFifaState} from '@/features/fifa/useFifaState.js';

// the address of the page, as the last render saw it
const seen = {search: ''};
const Spy = () => {
    const {search} = useLocation();
    useEffect(() => { seen.search = search; });
    return null;
};
const wrapperAt = (url) => ({children}) => <MemoryRouter initialEntries={[url]}><Spy/>{children}</MemoryRouter>;
const hookAt = (url) => renderHook(() => useFifaState(), {wrapper: wrapperAt(url)});

describe('readState', () => {
    it('should give the defaults for an empty address', () => {
        expect(readState(new URLSearchParams(''))).toEqual({candidate: 'all', confederation: 'all', level: 'all', search: '', view: 'map', association: '', sort: '', dir: 'asc', filters: {}});
    });

    it('should read every choice from its parameter', () => {
        const state = readState(new URLSearchParams('c=Q1&conf=UEFA&level=uncertain&q=bra&view=timeline&a=Q42&sort=articles&dir=desc&f_conf=CAF,UEFA&f_art=yes'));
        expect(state).toEqual({
            candidate: 'Q1', confederation: 'UEFA', level: 'uncertain', search: 'bra', view: 'timeline', association: 'Q42', sort: 'articles', dir: 'desc',
            filters: {conf: ['CAF', 'UEFA'], art: ['yes']},
        });
    });

    it('should take a confederation, a level or a view the page does not know for the default', () => {
        const state = readState(new URLSearchParams('conf=XYZ&level=maybe&view=globe'));
        expect(state).toMatchObject({confederation: 'all', level: 'all', view: 'map'});
        // a direction the page does not know is ascending; an empty filter of a column is no filter
        expect(readState(new URLSearchParams('dir=sideways&f_conf=')).dir).toBe('asc');
        expect(readState(new URLSearchParams('f_conf=&f_pos=,')).filters).toEqual({});
    });
});

describe('useFifaState', () => {
    it('should start from the address', () => {
        const {result} = hookAt('/fifa?c=QMOCK1&view=list&a=Q5');
        expect(result.current.state).toMatchObject({candidate: 'QMOCK1', view: 'list', association: 'Q5'});
        expect(result.current.filtered).toBe(true);
    });

    it('should write a choice in the address and keep the others', () => {
        const {result} = hookAt('/fifa?view=list');
        act(() => result.current.set({candidate: 'QMOCK2'}));
        act(() => result.current.set({level: 'uncertain', search: 'bra'}));
        expect(new URLSearchParams(seen.search).get('view')).toBe('list');
        expect(Object.fromEntries(new URLSearchParams(seen.search))).toEqual({view: 'list', c: 'QMOCK2', level: 'uncertain', q: 'bra'});
        expect(result.current.state).toMatchObject({candidate: 'QMOCK2', level: 'uncertain', search: 'bra', view: 'list'});
    });

    it('should leave a default out of the address', () => {
        const {result} = hookAt('/fifa?c=QMOCK1&view=list');
        act(() => result.current.set({candidate: 'all', view: 'map'}));
        expect(seen.search).toBe('');
    });

    it('should keep the candidate, the filters and the sheet when the view changes', () => {
        const {result} = hookAt('/fifa?c=QMOCK1&conf=AFC&level=indicated&a=Q7');
        act(() => result.current.set({view: 'confederations'}));
        act(() => result.current.set({view: 'timeline'}));
        expect(result.current.state).toEqual({
            candidate: 'QMOCK1', confederation: 'AFC', level: 'indicated', search: '', view: 'timeline', association: 'Q7', sort: '', dir: 'asc', filters: {},
        });
    });

    it('should reset the filters but neither the view nor the open sheet', () => {
        const {result} = hookAt('/fifa?c=QMOCK1&conf=AFC&level=uncertain&q=ger&view=list&a=Q7&sort=name&dir=desc&f_conf=CAF');
        act(() => result.current.reset());
        expect(result.current.state).toEqual({
            candidate: 'all', confederation: 'all', level: 'all', search: '', view: 'list', association: 'Q7', sort: 'name', dir: 'desc', filters: {conf: ['CAF']},
        });
        expect(result.current.filtered).toBe(false);
    });

    it('should come back the same after a reload (a new render on the same address)', () => {
        const first = hookAt('/fifa?c=QMOCK3&conf=CAF&level=conflicting&q=nig&view=maplist&a=Q9&sort=members&dir=desc&f_ownpos=indicated,unknown');
        const address = `/fifa${seen.search}`;
        first.unmount();
        const second = hookAt(address);
        expect(second.result.current.state).toEqual({
            candidate: 'QMOCK3', confederation: 'CAF', level: 'conflicting', search: 'nig', view: 'maplist', association: 'Q9', sort: 'members', dir: 'desc',
            filters: {ownpos: ['indicated', 'unknown']},
        });
    });
});

describe('a candidate the page does not know', () => {
    const hookKnowing = (url, candidates) => renderHook(() => useFifaState(candidates), {wrapper: wrapperAt(url)});

    it('should be the overview: a link that names a candidate the server does not list reads as All candidates, and is no filter', () => {
        const known = ['QMOCK1', 'QMOCK2'];
        for (const url of ['/fifa?c=coverage', '/fifa?c=QGONE']) {
            const {result} = hookKnowing(url, known);
            expect(result.current.state.candidate).toBe('all');
            expect(result.current.filtered).toBe(false);
        }
    });

    it('should keep a candidate the server lists, and leave the address alone when it is not asked about its candidates', () => {
        expect(hookKnowing('/fifa?c=QMOCK2', ['QMOCK1', 'QMOCK2']).result.current.state.candidate).toBe('QMOCK2');
        expect(hookKnowing('/fifa?c=anything', undefined).result.current.state.candidate).toBe('anything');
    });
});

describe('the sort and the filters of the columns', () => {
    it('should write the sort and a filter of a column in the address, and leave the default out', () => {
        const {result} = hookAt('/fifa?view=list');
        act(() => result.current.set({sort: 'articles', dir: 'desc'}));
        act(() => result.current.setFilter('conf', ['CAF', 'UEFA']));
        expect(Object.fromEntries(new URLSearchParams(seen.search))).toEqual({view: 'list', sort: 'articles', dir: 'desc', f_conf: 'CAF,UEFA'});
        act(() => result.current.setFilter('conf', []));
        act(() => result.current.set({sort: '', dir: 'asc'}));
        expect(Object.fromEntries(new URLSearchParams(seen.search))).toEqual({view: 'list'});
    });

    it('should clear the filters of the columns and the sort, and nothing else', () => {
        const {result} = hookAt('/fifa?view=presidents&c=QMOCK1&conf=AFC&q=bra&a=Q7&sort=name&dir=desc&f_ment=with&f_source=fifa');
        act(() => result.current.clearColumns());
        expect(Object.fromEntries(new URLSearchParams(seen.search))).toEqual({view: 'presidents', c: 'QMOCK1', conf: 'AFC', q: 'bra', a: 'Q7'});
        expect(result.current.state.filters).toEqual({});
        expect(result.current.state.sort).toBe('');
    });

    it('should keep the search, the sort and the filters when the view changes', () => {
        const {result} = hookAt('/fifa?view=list&q=bra&sort=articles&dir=desc&f_conf=CAF');
        act(() => result.current.set({view: 'presidents'}));
        expect(result.current.state).toMatchObject({view: 'presidents', search: 'bra', sort: 'articles', dir: 'desc', filters: {conf: ['CAF']}});
        act(() => result.current.set({view: 'confederations'}));
        expect(Object.fromEntries(new URLSearchParams(seen.search))).toEqual({view: 'confederations', q: 'bra', sort: 'articles', dir: 'desc', f_conf: 'CAF'});
    });
});
