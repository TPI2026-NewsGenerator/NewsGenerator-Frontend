//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: table.js
//  Description: What the tables of the views List, Presidents and Confederations have in common, as pure functions: the sort of a column (none, then
//               ascending, then descending, then none again; what has no value is always last; a tie falls to the logical default order of the
//               table), the column filters (a list of values, any of them keeps a row; the filters of different columns combine with AND, with the
//               filters of the page too), and the chips that say which filters are on
//

// aria-sort of the column `key` when the table is sorted by `sort` in the direction `dir`
export const ariaSortOf = (sort, dir, key) => sort === key ? (dir === 'desc' ? 'descending' : 'ascending') : 'none';

// What a click on the head of a column does: none -> ascending -> descending -> none (the logical default order comes back)
export const nextSort = (sort, dir, key) => {
    if (sort !== key) return {sort: key, dir: 'asc'};
    return dir === 'asc' ? {sort: key, dir: 'desc'} : {sort: '', dir: 'asc'};
};

const empty = (value) => value === null || value === undefined || value === '' || (typeof value === 'number' && Number.isNaN(value));

// numbers as numbers, anything else as text in the way of the language
export const compareValues = (a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'en', {sensitivity: 'base'});

// The items sorted. sorts: {key: (item) => value}, the columns that sort; sort / dir: the choice of the reader ('' = none); tie(a, b): the default
// order of the table, which decides alone when nothing is chosen and settles what the chosen column leaves equal. A row with no value in the column is
// last, in either direction
export const sortItems = (items, sorts, sort, dir, tie) => {
    const value = sorts[sort];
    const factor = dir === 'desc' ? -1 : 1;
    return [...items].sort((a, b) => {
        if (value) {
            const x = value(a);
            const y = value(b);
            if (empty(x) !== empty(y)) return empty(x) ? 1 : -1;
            if (!empty(x)) {
                const compared = compareValues(x, y);
                if (compared !== 0) return compared * factor;
            }
        }
        return tie(a, b);
    });
};

// the values chosen that the filters know, by filter key: {conf: ['CAF', 'UEFA']}. defs: {key: {label, options: [{value, label}], matches(item, values)}}
export const pickFilters = (all, defs) => Object.fromEntries(
    Object.keys(defs)
        .map(key => [key, (all[key] ?? []).filter(value => defs[key].options.some(option => option.value === value))])
        .filter(([, values]) => values.length > 0),
);

// the items that every filter keeps (a filter with no value chosen keeps all)
export const filterItems = (items, defs, selected) => items.filter(item => Object.entries(selected)
    .every(([key, values]) => values.length === 0 || !defs[key] || defs[key].matches(item, values)));

// the chips under the toolbar, one for each value chosen: [{key, value, text: "Confederation: CAF"}]
export const chipsOf = (defs, selected) => Object.entries(selected).flatMap(([key, values]) => values.map(value => ({
    key, value, text: `${defs[key].label}: ${defs[key].options.find(option => option.value === value)?.label ?? value}`,
})));

// the days since a date (the dates are ISO strings or milliseconds), null without one
export const daysSince = (at, now = Date.now()) => {
    const time = typeof at === 'number' ? at : Date.parse(at ?? '');
    return Number.isNaN(time) ? null : Math.floor((now - time) / 86400e3);
};
