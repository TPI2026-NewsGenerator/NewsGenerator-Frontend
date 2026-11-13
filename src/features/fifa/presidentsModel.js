//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: presidentsModel.js
//  Description: The rows of the view Presidents as data: a president, the association he leads and the position of that association, the articles of 30
//               days that name him, his latest mention, where his name comes from. The default order (the most named first, then the latest
//               mention, then the name), the sorts of the columns and the filters of the columns. Pure functions, the table draws them
//

import {CATEGORY_ORDER, CONFEDERATIONS, matchesSearch, plain} from "@/features/fifa/positions.js";
import {CATEGORIES} from "@/features/fifa/listModel.js";

const time = (at) => {
    const value = Date.parse(at ?? '');
    return Number.isNaN(value) ? null : value;
};

// a row of the table from a president of the server and the row of the page of his association ({member, described})
export const presidentItem = (president, row) => ({
    key: president.member_qid,
    president,
    row,
    member: row.member,
    described: row.described,
    name: president.name,
    category: row.described.category,
    articles: president.articles_30d ?? 0,
    latest: time(president.last_mention?.at),
    since: president.since ?? null,
    source: president.source,
});

// the default order: the most named first, then the latest mention (the newest first), then the name of the president
export const comparePresidents = (a, b) => {
    if (a.articles !== b.articles) return b.articles - a.articles;
    if (a.latest !== b.latest) {
        if (a.latest === null) return 1;
        if (b.latest === null) return -1;
        return b.latest - a.latest;
    }
    return a.name.localeCompare(b.name, 'en', {sensitivity: 'base'});
};

export const PRESIDENT_SORTS = {
    name: item => item.name,
    assoc: item => item.member.name,
    conf: item => item.member.confederation,
    pos: item => CATEGORY_ORDER[item.category],
    articles: item => item.articles,
    latest: item => item.latest,
    source: item => item.source,
    since: item => item.since,
};

export const presidentFilters = () => ({
    conf: {label: 'Confederation', options: CONFEDERATIONS.map(one => ({value: one, label: one})), matches: (item, values) => values.includes(item.member.confederation)},
    ment: {
        label: 'Mentions', options: [{value: 'with', label: 'With mentions'}, {value: 'without', label: 'Without mentions'}],
        matches: (item, values) => values.includes(item.articles > 0 ? 'with' : 'without'),
    },
    source: {
        label: 'Source', options: [{value: 'fifa', label: 'FIFA'}, {value: 'wikidata', label: 'Wikidata'}],
        matches: (item, values) => values.includes(item.source),
    },
    pos: {label: 'Position', options: CATEGORIES, matches: (item, values) => values.includes(item.category)},
});

export const PRESIDENT_COLUMN_FILTERS = {conf: ['conf'], pos: ['pos'], articles: ['ment'], source: ['source']};

// the search of the page: a president, or the association he leads (its name, its country, its code of FIFA)
export const presidentMatches = (item, search) => {
    const needle = plain(search).trim();
    return !needle || plain(item.name).includes(needle) || matchesSearch(item.member, search);
};
