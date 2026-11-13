//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: confederationsModel.js
//  Description: The rows of the view Confederations as data: a confederation, its president, its own position, how many members it has and how many of
//               them support each candidate, are conflicting, Uncertain or have no position. The default order (the most members first, then the
//               code), the sorts, the filters, and the search that finds a confederation or its members. Pure functions, the table draws them
//

import {CATEGORY_ORDER, describe, matchesSearch, plain} from "@/features/fifa/positions.js";
import {CATEGORIES} from "@/features/fifa/listModel.js";

const ALL_SCOPE = {mode: 'all'};

// The rows. confederations: the ones the server lists ({qid, fifa, name, leader, ...}); associations: [{member, described}] of the map; members: the members
// of the map with the votes given on the page (the confederations are read through them). Counts do not follow the candidate chosen in the list:
// they say what the members show as a whole
export const confederationItems = ({confederations, associations, members, levels, subjects}) => {
    const described = associations.map(row => ({row, all: describe(row.member, ALL_SCOPE, levels, subjects)}));
    return confederations.map(confederation => {
        const member = members.find(one => one.qid === confederation.qid) ?? confederation;
        // a confederation that shows conflicting indications has indicated a candidate: the filter has three words
        const own = describe(member, ALL_SCOPE, levels, subjects);
        const ownCategory = own.category === 'conflicting' ? 'indicated' : own.category;
        const list = described.filter(one => one.row.member.confederation === confederation.fifa);
        const support = Object.fromEntries(subjects.map(subject => [subject.qid, 0]));
        let conflicting = 0;
        let uncertain = 0;
        let none = 0;
        for (const {all} of list) {
            for (const reading of all.readings) if (reading.side === 'yes' && reading.subject in support) support[reading.subject] += 1;
            if (all.category === 'conflicting') conflicting += 1;
            else if (all.category === 'uncertain') uncertain += 1;
            else if (all.category === 'unknown') none += 1;
        }
        return {
            key: confederation.fifa,
            confederation,
            member,
            own,
            ownCategory,
            code: confederation.fifa,
            president: confederation.leader?.name ?? null,
            rows: list.map(one => one.row),
            total: list.length,
            support,
            conflicting,
            uncertain,
            none,
        };
    });
};

// the default order: the most members first, then the code
export const compareConfederations = (a, b) => b.total - a.total || a.code.localeCompare(b.code, 'en', {sensitivity: 'base'});

// the sorts of the columns; one for each candidate, 'support:{qid}'
export const confederationSorts = (subjects) => ({
    code: item => item.code,
    president: item => item.president,
    own: item => CATEGORY_ORDER[item.ownCategory],
    members: item => item.total,
    ...Object.fromEntries(subjects.map(subject => [`support:${subject.qid}`, item => item.support[subject.qid]])),
    conflicting: item => item.conflicting,
    uncertain: item => item.uncertain,
    none: item => item.none,
});

export const confederationFilters = (subjects) => ({
    ownpos: {
        label: 'Own position', options: CATEGORIES.filter(one => one.value !== 'conflicting'),
        matches: (item, values) => values.includes(item.ownCategory),
    },
    supp: {
        label: 'Supports', options: subjects.map(subject => ({value: subject.qid, label: subject.name})),
        matches: (item, values) => values.some(qid => (item.support[qid] ?? 0) > 0),
    },
});

export const CONFEDERATION_COLUMN_FILTERS = {own: ['ownpos'], members: ['supp']};

// The search of the page in this view: the confederation itself (its code, its name, its president) and its members (association, country, code of FIFA,
// its president). Answers {self, members: [row]}: whether the confederation matches, and the members that do. presidentOf: Map member qid -> name
export const searchConfederation = (item, search, presidentOf = new Map()) => {
    const needle = plain(search).trim();
    if (!needle) return {self: true, members: item.rows, active: false};
    const self = [item.code, item.confederation.name, item.president].some(text => plain(text).includes(needle));
    const members = item.rows.filter(row => matchesSearch(row.member, search) || plain(presidentOf.get(row.member.qid)).includes(needle));
    return {self, members, active: true};
};
