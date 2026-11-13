//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: useFifaState.js
//  Description: What the reader chose on the page "The FIFA presidency", all of it in the address of the page, so the six views show the
//               same thing, a reload keeps it and a link carries it: the candidate, the confederation, the
//               position level, the search, the view and the association whose sheet is open; and, for the tables of the views List,
//               Confederations and Presidents, the column sorted (sort, dir) and the filters of the columns (one parameter each, f_conf=CAF,UEFA).
//               A value that is the default is left out of the address
//

import {useCallback, useMemo} from "react";
import {useSearchParams} from "react-router-dom";
import {CONFEDERATIONS, LEVEL_FILTERS} from "@/features/fifa/positions.js";

export const VIEWS = [
    {value: 'map', label: 'Map'},
    {value: 'maplist', label: 'Map & list'},
    {value: 'list', label: 'List'},
    {value: 'timeline', label: 'Timeline'},
    {value: 'confederations', label: 'Confederations'},
    {value: 'presidents', label: 'Presidents'},
];

// the views that are tables: they have their own search bar, sortable columns and filters of columns
export const TABLE_VIEWS = ['list', 'confederations', 'presidents'];

const DEFAULTS = {candidate: 'all', confederation: 'all', level: 'all', search: '', view: 'map', association: '', sort: '', dir: 'asc'};
// the name of each choice in the address
const PARAMS = {candidate: 'c', confederation: 'conf', level: 'level', search: 'q', view: 'view', association: 'a', sort: 'sort', dir: 'dir'};
// a filter of a column is the parameter f_{key}, its values separated by commas
const FILTER_PREFIX = 'f_';

const oneOf = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

// the filters of the columns in the address: {conf: ['CAF', 'UEFA']}; which values a view knows is for the view to say
const filtersOf = (params) => Object.fromEntries(
    [...params.entries()]
        .filter(([name, value]) => name.startsWith(FILTER_PREFIX) && value !== '')
        .map(([name, value]) => [name.slice(FILTER_PREFIX.length), value.split(',').filter(Boolean)])
        .filter(([, values]) => values.length > 0),
);

// the choices read from the address; a value the page does not know is the default (a link from an older page, a typing mistake).
// The candidate is checked later, against the candidates the server lists; the column sorted, against the columns of the view
export const readState = (params) => ({
    candidate: params.get(PARAMS.candidate) || DEFAULTS.candidate,
    confederation: oneOf(params.get(PARAMS.confederation), CONFEDERATIONS, DEFAULTS.confederation),
    level: oneOf(params.get(PARAMS.level), LEVEL_FILTERS.map(one => one.value), DEFAULTS.level),
    search: params.get(PARAMS.search) ?? DEFAULTS.search,
    view: oneOf(params.get(PARAMS.view), VIEWS.map(one => one.value), DEFAULTS.view),
    association: params.get(PARAMS.association) ?? DEFAULTS.association,
    sort: params.get(PARAMS.sort) ?? DEFAULTS.sort,
    dir: oneOf(params.get(PARAMS.dir), ['asc', 'desc'], DEFAULTS.dir),
    filters: filtersOf(params),
});

// The choices and how to change them. set({level: 'uncertain'}) changes the ones it names and keeps the others;
// opening a sheet or changing the view is a step of the history (Back closes the sheet), the filters replace the step they are on.
// A candidate in the address that the server does not list (a removed one, an old link, a typing mistake) is the overview: the page passes the
// qids of the candidates it knows. reset() clears the filters of the page (the candidate, the confederation, the level, the search), not the view nor the sheet.
// setFilter('conf', ['CAF']) chooses the values of the filter of a column (none: the filter is off); clearColumns() clears the filters of the columns
// and the sort, and nothing else
export const useFifaState = (candidates) => {
    const [params, setParams] = useSearchParams();
    const state = useMemo(() => {
        const read = readState(params);
        return candidates && read.candidate !== DEFAULTS.candidate && !candidates.includes(read.candidate) ? {...read, candidate: DEFAULTS.candidate} : read;
    }, [params, candidates]);

    const set = useCallback((patch) => {
        setParams(previous => {
            const next = new URLSearchParams(previous);
            for (const [key, value] of Object.entries(patch)) {
                if (value === DEFAULTS[key] || value === null || value === undefined) next.delete(PARAMS[key]);
                else next.set(PARAMS[key], value);
            }
            return next;
        }, {replace: !('view' in patch) && !('association' in patch)});
    }, [setParams]);

    const reset = useCallback(() => set({candidate: 'all', confederation: 'all', level: 'all', search: ''}), [set]);

    const setFilter = useCallback((key, values) => {
        setParams(previous => {
            const next = new URLSearchParams(previous);
            if (values.length === 0) next.delete(FILTER_PREFIX + key);
            else next.set(FILTER_PREFIX + key, values.join(','));
            return next;
        }, {replace: true});
    }, [setParams]);

    const clearColumns = useCallback(() => {
        setParams(previous => {
            const next = new URLSearchParams(previous);
            for (const name of [...next.keys()]) if (name.startsWith(FILTER_PREFIX)) next.delete(name);
            next.delete(PARAMS.sort);
            next.delete(PARAMS.dir);
            return next;
        }, {replace: true});
    }, [setParams]);

    const filtered = state.candidate !== DEFAULTS.candidate || state.confederation !== DEFAULTS.confederation
        || state.level !== DEFAULTS.level || state.search !== DEFAULTS.search;

    return {state, set, reset, filtered, setFilter, clearColumns};
};
