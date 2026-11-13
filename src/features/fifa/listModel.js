//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: listModel.js
//  Description: The rows of the view List as data: what each association says in each column (the candidate it leans toward, the position and its level,
//               the last signal, the articles of 30 days, the signals), the default order (what has something to say first, the most recent first),
//               the sorts of the columns and the filters of the columns. Pure functions, the table draws them
//

import {CATEGORY_ORDER, CONFEDERATIONS, leanOf} from "@/features/fifa/positions.js";
import {daysSince} from "@/features/fifa/table.js";

export const CATEGORIES = [
    {value: 'indicated', label: 'Candidate indicated'},
    {value: 'conflicting', label: 'Conflicting'},
    {value: 'uncertain', label: 'Uncertain'},
    {value: 'unknown', label: 'Unknown'},
];

const time = (at) => {
    const value = Date.parse(at ?? '');
    return Number.isNaN(value) ? null : value;
};

// A row of the table from a row of the page ({member, described}): scope is the one of the page, levels and subjects the ones of the map.
//   category  the one of the position (indicated, conflicting, uncertain, unknown); level: 'declared' | 'probable' | null (a vote and a confirmation are declared)
//   lean      the candidate it leans toward (leanOf); candidates: the qids it is shown supporting (several when conflicting)
//   origin    'reader' when a reader chose or confirmed the position, 'news' when the news show it, null when it shows nothing
//   lastSignal  the date of the last signal (ms) on the candidate chosen, or on any; articles: the articles of 30 days; established, uncertain: signals
export const itemOf = (row, scope, levels, subjects, now = Date.now()) => {
    const {member, described} = row;
    const entries = scope.mode === 'candidate'
        ? [member.positions?.[scope.subject]].filter(Boolean)
        : Object.values(member.positions ?? {});
    const signals = entries.map(entry => time(entry.last_signal_at)).filter(one => one !== null);
    const lastSignal = signals.length > 0 ? Math.max(...signals) : null;
    const lean = leanOf(member, levels, subjects);
    const counted = described.candidates;
    return {
        ...row,
        key: member.qid,
        name: member.name,
        category: described.category,
        level: counted.length === 0 ? null : counted.every(reading => reading.strength === 'soft') ? 'probable' : 'declared',
        lean,
        candidates: lean?.subject_qid ? [lean.subject_qid] : (lean?.conflicting ?? []),
        // the word of the column Candidate: the position on the candidate chosen, else the candidate it leans toward (none: nothing to say)
        candidateText: scope.mode === 'candidate' ? (counted.length > 0 || described.byReader ? described.label : null)
            : lean?.subject_qid ? subjects.find(subject => subject.qid === lean.subject_qid)?.name ?? lean.subject_qid
                : lean?.conflicting.length > 0 ? 'Conflicting' : lean?.none ? 'Undecided' : null,
        origin: described.byReader || described.promoted ? 'reader' : (counted.length > 0 || described.category === 'uncertain') ? 'news' : null,
        lastSignal,
        age: daysSince(lastSignal, now),
        articles: described.coverage.articles,
        established: entries.reduce((total, entry) => total + (entry.signals_count ?? 0), 0),
        uncertain: entries.reduce((total, entry) => total + (entry.uncertain_count ?? 0), 0),
    };
};

// the default order: what has something to say first: the category, then the last signal (the newest first), then the articles (the most first), then the name
export const compareList = (a, b) => {
    const category = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (category !== 0) return category;
    if (a.lastSignal !== b.lastSignal) {
        if (a.lastSignal === null) return 1;
        if (b.lastSignal === null) return -1;
        return b.lastSignal - a.lastSignal;
    }
    return b.articles - a.articles || a.name.localeCompare(b.name, 'en', {sensitivity: 'base'});
};

// the sorts of the columns: the value of a row in each
export const LIST_SORTS = {
    name: item => item.name,
    conf: item => item.member.confederation,
    // the candidate it leans toward, by name; with a candidate chosen, the position on it (a word)
    cand: item => item.candidateText,
    pos: item => CATEGORY_ORDER[item.category] * 2 + (item.level === 'probable' ? 1 : 0),
    last: item => item.lastSignal,
    articles: item => item.articles,
    established: item => item.established,
    uncertain: item => item.uncertain,
};

const days = (item) => item.age;

// The filters of the columns: key -> {label, options, matches}. subjects: the candidates, for the one of the candidate
export const listFilters = (subjects) => ({
    conf: {label: 'Confederation', options: CONFEDERATIONS.map(one => ({value: one, label: one})), matches: (item, values) => values.includes(item.member.confederation)},
    pos: {label: 'Position', options: CATEGORIES, matches: (item, values) => values.includes(item.category)},
    lvl: {
        label: 'Level', options: [{value: 'declared', label: 'Declared'}, {value: 'probable', label: 'Probable'}],
        matches: (item, values) => item.level !== null && values.includes(item.level),
    },
    cand: {
        label: 'Candidate', options: subjects.map(subject => ({value: subject.qid, label: subject.name})),
        matches: (item, values) => item.candidates.some(qid => values.includes(qid)),
    },
    origin: {
        label: 'Source', options: [{value: 'news', label: 'News'}, {value: 'reader', label: 'Reader'}],
        matches: (item, values) => item.origin !== null && values.includes(item.origin),
    },
    last: {
        label: 'Last signal',
        options: [{value: '7', label: 'Last 7 days'}, {value: '30', label: 'Last 30 days'}, {value: 'older', label: 'Older'}, {value: 'none', label: 'None'}],
        matches: (item, values) => values.some(value => value === 'none' ? days(item) === null
            : value === 'older' ? days(item) !== null && days(item) > 30
                : days(item) !== null && days(item) <= Number(value)),
    },
    art: {
        label: 'Has articles', options: [{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}],
        matches: (item, values) => values.includes(item.articles > 0 ? 'yes' : 'no'),
    },
});

// which filters each column has: the head of the column offers them
export const LIST_COLUMN_FILTERS = {conf: ['conf'], cand: ['cand'], pos: ['pos', 'lvl', 'origin'], last: ['last'], articles: ['art']};
