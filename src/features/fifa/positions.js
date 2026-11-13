//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: positions.js
//  Description: What a position of an association is on the map of the FIFA presidency, as the server sends it (GET /api/fifa/map), and
//               how it is drawn. The levels are NOT fixed here: the server sends the ones it stands behind after measuring them
//               (`levels`: some of soutien_declare, soutien_probable, soutien, inconnue, non_soutien_probable, non_soutien,
//               non_soutien_declare), and the legend, the scale and the filters follow that list. A position the list does not hold
//               is read as unknown. Pure functions: the map, the list and the sheet all ask them
//

export const CANDIDATE_COLOURS = 6;

// from the "yes" side to the "no" side: the order of the scale
const SCALE = ['soutien_declare', 'soutien', 'soutien_probable', 'inconnue', 'non_soutien_probable', 'non_soutien', 'non_soutien_declare'];

const LABELS = {
    soutien_declare: 'Declared support',
    soutien: 'Support',
    soutien_probable: 'Probable support',
    inconnue: 'No known position',
    non_soutien_probable: 'Probable opposition',
    non_soutien: 'Opposition',
    non_soutien_declare: 'Declared opposition',
};

export const UNKNOWN = 'inconnue';

// 'yes', 'no' or 'unknown'
export const sideOf = (position) => !position || position === UNKNOWN ? 'unknown' : position.startsWith('non_') ? 'no' : 'yes';

export const labelOf = (position) => LABELS[position ?? UNKNOWN] ?? LABELS[UNKNOWN];

// what the server can say about the strength of a side: both a declared and a probable level (the fine reading), or one level only
export const fineLevels = (levels) => ({
    yes: levels.includes('soutien_declare') && levels.includes('soutien_probable'),
    no: levels.includes('non_soutien_declare') && levels.includes('non_soutien_probable'),
});

// the levels, from "yes" to "no", the unknown one always there: the scale of a candidate chosen
export const scaleOf = (levels) => SCALE.filter(level => level === UNKNOWN || levels.includes(level));

// which strengths of a position the map colours: {declared, probable} (a merged level holds both). The sheet says so under each group of sentences
export const colouredStrengths = (levels) => ({
    declared: levels.some(level => level.endsWith('_declare') || level === 'soutien' || level === 'non_soutien'),
    probable: levels.some(level => level.endsWith('_probable') || level === 'soutien' || level === 'non_soutien'),
});

// whether the server stands behind opposition at all
export const hasOpposition = (levels) => levels.some(level => sideOf(level) === 'no');

// a position of an entry as the levels allow: one the list does not hold is unknown
export const positionIn = (entry, levels) => entry && levels.includes(entry.position) ? entry.position : UNKNOWN;

// A reader can set the position of an association on a candidate: the last vote of any reader is decisive for everyone, and the AI reading
// (the position computed from the news) stays beside it. The server sends it as entry.human {value: 'for' | 'against' | 'unknown', by, at,
// newer_evidence} and, when it is set, entry.position is already the decisive one and entry.ai_position the computed one. A vote is not a
// level the server measured: it counts whatever `levels` says, as a plain support, opposition or no position (never "declared")
const VOTED = {for: 'soutien', against: 'non_soutien', unknown: UNKNOWN};
export const VOTE_VALUES = [
    {value: 'for', label: 'For'},
    {value: 'against', label: 'Against'},
    {value: 'unknown', label: 'No position'},
];
export const decisiveOf = (value) => VOTED[value] ?? UNKNOWN;

// A reader can also CONFIRM the position the news give ("Confirm this position ✓"): a validation by hand, the heaviest word there is. A position of the
// news that at least one reader has confirmed (entry.confirmed.count > 0) and that no vote has overridden is drawn at the solid declared level of its
// side: the server sends it promoted (`position` is soutien_declare / non_soutien_declare, `ai_position` the reading of the news, `human` null,
// `stale` false: a validated position never ages). A confirmation counts for the position it was given on: once the news change it, confirmed.count is
// 0 and `position` is the news' own again. A confirmation of "no position" promotes nothing. A vote still wins over everything
export const promotedOf = (position) => position === 'soutien' || position === 'non_soutien' ? position
    : sideOf(position) === 'yes' ? 'soutien_declare' : sideOf(position) === 'no' ? 'non_soutien_declare' : UNKNOWN;
export const holdsConfirmation = (entry) => (entry?.confirmed?.count ?? 0) > 0;

// The position of an entry as the page draws it: {human, position, aiPosition, confirmedByReader}. position: the vote when there is one, else the one
// of the entry (kept only when the levels hold it; a promoted one falls back to the merged level when that is what the levels have); aiPosition: what
// the news say, kept apart by the server (ai_position) when a vote or a confirmation drew another position; confirmedByReader: a reader's confirmation
// holds and no vote overrides it
export const readEntry = (entry, levels) => {
    const human = entry?.human ?? null;
    const ai = entry?.ai_position ?? (human ? undefined : entry?.position);
    const aiPosition = ai && levels.includes(ai) ? ai : UNKNOWN;
    const confirmedByReader = !human && holdsConfirmation(entry);
    let position = human ? decisiveOf(human.value) : positionIn(entry, levels);
    if (confirmedByReader && position === UNKNOWN && entry?.ai_position && sideOf(entry.position) !== 'unknown') {
        // promoted, and the levels have no declared level: the merged one is the same colour
        const merged = sideOf(entry.position) === 'yes' ? 'soutien' : 'non_soutien';
        if (levels.includes(merged)) position = merged;
    }
    return {human, position, aiPosition, confirmedByReader};
};

// An entry that nothing has been said on yet: the vote of a reader makes it
const BLANK = {position: UNKNOWN, since: null, previous: null, changed: false, stale: false, signals_count: 0, last_signal_at: null, uncertain_count: 0, articles_30d: 0, media_30d: 0, basis: [], confirmed: null};

// The member with a vote set, or taken back (human null) on a candidate: what the server answered to a vote, put in the map without asking
// for the whole map again. Withdrawn, the position goes back to the AI reading. confirmed: the confirmations of the position shown, as the server
// answered them ({count, by, at, outdated} or null); left as it is when undefined. A confirmation is no decision, but it makes the position of the news
// solid (see promotedOf): with no vote and a confirmation that holds, the declared level of the same side is shown, the reading of the news kept as
// ai_position; once nobody confirms any more (a withdrawal), the dots of the news' own level come back
export const withVote = (member, subject, human, confirmed) => {
    const entry = member.positions?.[subject] ?? BLANK;
    // the reading of the news, whatever a vote or a confirmation made of the position
    const ai = entry.ai_position ?? (entry.human ? UNKNOWN : entry.position);
    const confirmedNow = confirmed !== undefined ? confirmed : entry.confirmed ?? null;
    const next = {...entry, human: human ?? null, confirmed: confirmedNow};
    if (human) {
        next.ai_position = ai;
        next.position = human.value === 'for' ? 'soutien_declare' : human.value === 'against' ? 'non_soutien_declare' : UNKNOWN;
    } else if ((confirmedNow?.count ?? 0) > 0 && sideOf(ai) !== 'unknown') {
        next.ai_position = ai;
        next.position = promotedOf(ai);
        // a validated position never ages
        next.stale = false;
    } else {
        next.position = ai;
        delete next.ai_position;
    }
    return {...member, positions: {...member.positions, [subject]: next}};
};

// 'soft' for a probable position (drawn with dots, not a flat lighter colour), else 'strong' (solid): a declared one, the merged level, a vote.
// `levels` is not asked: a probable position the server sends is a probable one, whatever the other levels are
export const strengthOf = (position) => sideOf(position) !== 'unknown' && position.endsWith('_probable') ? 'soft' : 'strong';

// The order of the cards of the candidates in the sheet of an association, by what each holds: first the ones that have a position (declared before probable, for or against
// alike; a position a reader set counts), then the ones that have only Uncertain signals, then the ones with nothing. Inside a group the order of the candidates (their colour,
// then the order the server gave). The candidate chosen in the list of the page stays first. positions: the entries of the sheet, by candidate
export const orderCards = (subjects, positions, levels, chosen = null) => {
    const rankOf = (subject) => {
        const entry = positions?.[subject.qid];
        const {position, human} = readEntry(entry, levels);
        if (sideOf(position) !== 'unknown') return strengthOf(position) === 'soft' ? 1 : 0;
        // the Uncertain signals of an entry a reader decided are decided too
        return (entry?.uncertain_count ?? 0) > 0 && !human ? 2 : 3;
    };
    return subjects.map((subject, index) => ({subject, index, rank: rankOf(subject)}))
        .sort((a, b) => (b.subject.qid === chosen) - (a.subject.qid === chosen) || a.rank - b.rank || a.subject.color_index - b.subject.color_index || a.index - b.index)
        .map(({subject}) => subject);
};

// The same cards in the order of the summary of the sheet (summary.candidates: the server built it, positions first, the candidates with nothing absent): the candidate chosen in the
// list of the page first, then the candidates of the summary as it lists them, then the ones it does not hold (nothing on them) in the order orderCards gives. With no summary (null) it is orderCards
export const orderBySummary = (subjects, summaryCandidates, positions, levels, chosen = null) => {
    const base = orderCards(subjects, positions, levels, chosen);
    if (!summaryCandidates) return base;
    const rank = new Map(summaryCandidates.map((one, index) => [one.subject_qid, index]));
    return base.map((subject, index) => ({subject, index}))
        .sort((a, b) => (b.subject.qid === chosen) - (a.subject.qid === chosen)
            || (rank.get(a.subject.qid) ?? rank.size) - (rank.get(b.subject.qid) ?? rank.size) || a.index - b.index)
        .map(({subject}) => subject);
};

// the colour of a candidate, as the style of an SVG shape or a swatch takes it: a variable of the theme, never a hex
export const candidateFill = (colourIndex, strength = 'strong') => {
    const colour = `var(--cand-${((colourIndex - 1) % CANDIDATE_COLOURS) + 1})`;
    return strength === 'soft' ? `color-mix(in srgb, ${colour} 45%, var(--paper))` : colour;
};

export const sideFill = (side, strength) => side === 'no'
    ? (strength === 'soft' ? 'var(--map-no-soft)' : 'var(--map-no-strong)')
    : 'var(--map-unknown)';

export const HATCH = 'url(#fifa-hatch)';

// A probable position is drawn with a fine pattern of dots of the colour of its candidate on a light base of the same hue (an SVG pattern of the
// map, see components/Patterns.jsx), a declared one with the solid colour: the two read apart at a glance and not by lightness alone. The key of
// a pattern: the number of the colour of a candidate (1 to 6) or 'no' (an opposition: the ink, never the colour of a candidate)
export const patternKeyOf = (side, colourIndex) => side === 'no' ? 'no' : String(((colourIndex - 1) % CANDIDATE_COLOURS) + 1);
// the colour of the dots of each key: a candidate, an opposition (the ink), or neutral (the key of the legend)
export const DOT_COLOURS = {
    1: 'var(--cand-1)',
    2: 'var(--cand-2)',
    3: 'var(--cand-3)',
    4: 'var(--cand-4)',
    5: 'var(--cand-5)',
    6: 'var(--cand-6)',
    no: 'var(--map-no-strong)',
    neutral: 'var(--ink-mute)',
};
export const DOT_KEYS = Object.keys(DOT_COLOURS);
export const dotsFill = (key) => `url(#fifa-dots-${key})`;
export const isDots = (fill) => typeof fill === 'string' && fill.startsWith('url(#fifa-dots-');
// the fill of a position of a side on the map and in its swatches: solid when strong, dots when soft
export const mapFill = (side, colourIndex, strength) => {
    if (side === 'unknown') return 'var(--map-unknown)';
    if (strength === 'soft') return dotsFill(patternKeyOf(side, colourIndex));
    return side === 'no' ? 'var(--map-no-strong)' : candidateFill(colourIndex);
};

// the articles and media that name the association with a candidate (all of them when no one is chosen)
export const coverageOf = (member, scope) => {
    if (scope.mode === 'candidate') {
        const entry = member.positions?.[scope.subject];
        return {articles: entry?.articles_30d ?? 0, media: entry?.media_30d ?? 0};
    }
    if (member.coverage) return {articles: member.coverage.articles_30d ?? 0, media: member.coverage.media_30d ?? 0};
    const entries = Object.values(member.positions ?? {});
    return {
        articles: entries.reduce((total, entry) => total + (entry.articles_30d ?? 0), 0),
        media: entries.reduce((total, entry) => total + (entry.media_30d ?? 0), 0),
    };
};

// How a member is shown for what the reader chose. scope: {mode: 'all' | 'candidate', subject}; subjects: the candidates.
// Answers {category, fill, hatch, ring, label, byReader, promoted, candidates, uncertain, coverage}
//   category  'conflicting' (two candidates are supported), 'indicated' (a position is established), 'uncertain' (signals about the
//             election and the association, no position established) or 'unknown': the four sort every member, exactly once
//   candidates  [{subject, name, position, side, strength}] the established positions that count for the scope
//   In the overview only support counts: opposition to one candidate is never given to another, so it does not colour the map
export const describe = (member, scope, levels, subjects) => {
    const entries = Object.entries(member.positions ?? {});
    const readings = entries.map(([qid, entry]) => {
        const {human, position, aiPosition, confirmedByReader} = readEntry(entry, levels);
        const subject = subjects.find(one => one.qid === qid);
        // promoted: a reader's confirmation made the position of the news solid (it is drawn at the declared level, the news say less)
        const promoted = confirmedByReader && sideOf(aiPosition) !== 'unknown' && aiPosition !== position;
        return {subject: qid, name: subject?.name ?? qid, colour: subject?.color_index ?? 1, position, side: sideOf(position), strength: strengthOf(position, levels), entry, human, aiPosition, confirmedByReader, promoted};
    });
    const counted = scope.mode === 'candidate'
        ? readings.filter(reading => reading.subject === scope.subject && reading.side !== 'unknown')
        : readings.filter(reading => reading.side === 'yes');
    const inScope = scope.mode === 'candidate' ? readings.filter(reading => reading.subject === scope.subject) : readings;
    // the Uncertain signals of an entry a reader has decided are decided too: they do not ring the grey
    const uncertain = inScope.reduce((total, reading) => total + (reading.human ? 0 : reading.entry.uncertain_count ?? 0), 0);
    // the colour is a reader's vote (or the grey is: a vote can say "no position")
    const byReader = (counted.length > 0 ? counted : inScope).some(reading => reading.human);
    const coverage = coverageOf(member, scope);

    let category = 'unknown';
    if (counted.length >= 2) category = 'conflicting';
    else if (counted.length === 1) category = 'indicated';
    else if (uncertain > 0) category = 'uncertain';

    let fill = 'var(--map-unknown)';
    let label = 'No known position';
    if (category === 'conflicting') {
        fill = HATCH;
        label = `Conflicting indications: ${counted.map(reading => reading.name).join(', ')}`;
    } else if (category === 'indicated') {
        const [one] = counted;
        fill = mapFill(one.side, one.colour, one.strength);
        label = scope.mode === 'candidate' ? labelOf(one.position) : `${labelOf(one.position)} for ${one.name}`;
        // a position older than 90 days is kept, faded by the map (`stale`): it may not be the association's any more (a vote does not age)
        if (one.entry.stale && !one.human) label += ' (older than 90 days)';
        // a position of the news made solid by a reader's confirmation says so
        if (one.promoted) label += ' (confirmed by a reader)';
    } else if (category === 'uncertain') {
        label = `Uncertain: ${uncertain} ${uncertain === 1 ? 'signal' : 'signals'} on the election, no position established`;
    } else if (byReader) {
        label = 'No position';
    }
    const decidedByReader = byReader && category !== 'uncertain';
    if (decidedByReader) label += ' (set by a reader)';
    return {
        category,
        fill,
        hatch: category === 'conflicting',
        // a dotted ring on the grey: signals, and no position to colour
        ring: category === 'uncertain',
        label,
        stale: category === 'indicated' && Boolean(counted[0].entry.stale) && !counted[0].human,
        byReader: decidedByReader,
        // a reader's confirmation made the position solid (the news read it as probable)
        promoted: category === 'indicated' && counted[0].promoted,
        candidates: counted,
        readings,
        uncertain,
        coverage,
    };
};

// How many members are in each category, and in the position they are in: [{association}] only
export const summarise = (members, scope, levels, subjects) => {
    const counts = {total: 0, indicated: 0, conflicting: 0, uncertain: 0, unknown: 0};
    for (const member of members) {
        if (member.level !== 'association') continue;
        counts.total += 1;
        counts[describe(member, scope, levels, subjects).category] += 1;
    }
    return {...counts, known: counts.indicated + counts.conflicting};
};

export const plain = (text) => String(text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// the association, its country, its code of FIFA or of ISO: any part of what was typed
export const matchesSearch = (member, search) => {
    const needle = plain(search).trim();
    if (!needle) return true;
    return [member.name, member.association, member.fifa, member.iso].some(text => plain(text).includes(needle));
};

export const LEVEL_FILTERS = [
    {value: 'all', label: 'All positions'},
    {value: 'indicated', label: 'Candidate indicated'},
    {value: 'conflicting', label: 'Conflicting indications'},
    {value: 'uncertain', label: 'Uncertain'},
    {value: 'unknown', label: 'Unknown'},
];

// the status of a candidate, in the order a reader reads them
export const STATUSES = [
    {value: 'incumbent', label: 'Incumbent'},
    {value: 'declared', label: 'Declared'},
    {value: 'rumoured', label: 'Rumoured'},
    {value: 'withdrawn', label: 'Withdrawn'},
];
export const statusLabel = (status) => STATUSES.find(one => one.value === status)?.label ?? status;

export const CONFEDERATIONS = ['AFC', 'CAF', 'CONCACAF', 'CONMEBOL', 'OFC', 'UEFA'];

// whether a member passes the filters of the page (the confederation, the position level, the search); described: describe(member, ...)
export const passes = (member, described, {confederation, level, search}) =>
    (confederation === 'all' || member.confederation === confederation)
    && (level === 'all' || described.category === level)
    && matchesSearch(member, search);

// The reasons of an Uncertain signal are a closed list decided by the code of the server; unknown ones are said as they come
const REASONS = {
    unconfirmed: 'The report is not confirmed.',
    denied: 'The sentence is denied or contested.',
    past: 'It speaks of a position of the past, not of the present.',
    other: 'The sentence is not read as a position.',
    colour_setting: 'The map colours declared positions only: this probable position is not coloured.',
    speaker_not_binding: 'The speaker does not bind the association.',
    rumour: 'A rumour or an unconfirmed report.',
    request_not_position: 'A request, not a position.',
    rival_from_association: 'A rival who comes from the association, not the association.',
    ambiguous: 'The wording is ambiguous.',
    readings_disagree: 'The readings of the sentence disagree.',
};
export const reasonOf = (reason) => REASONS[reason] ?? (reason ? `${reason.replace(/_/g, ' ')}.` : 'The position is not established.');

// the order of the categories of a position: a candidate indicated, then conflicting, then Uncertain, then Unknown
export const CATEGORY_ORDER = {indicated: 0, conflicting: 1, uncertain: 2, unknown: 3};

// the date of the last signal of an association (ms) on any candidate, null without one
const lastSignalOf = (member) => {
    const times = Object.values(member.positions ?? {}).map(entry => Date.parse(entry.last_signal_at ?? '')).filter(time => !Number.isNaN(time));
    return times.length > 0 ? Math.max(...times) : null;
};

// rows [{member, described}] in the logical order, what has something to say first: the category (a candidate indicated, conflicting, Uncertain, Unknown),
// then the last signal (the newest first), then the articles of 30 days (the most first), then the name. The default order of the table of the list
export const sortedRows = (rows) => [...rows].sort((a, b) => {
    const category = CATEGORY_ORDER[a.described.category] - CATEGORY_ORDER[b.described.category];
    if (category !== 0) return category;
    const x = lastSignalOf(a.member);
    const y = lastSignalOf(b.member);
    if (x !== y) return x === null ? 1 : y === null ? -1 : y - x;
    return b.described.coverage.articles - a.described.coverage.articles || a.member.name.localeCompare(b.member.name, 'en', {sensitivity: 'base'});
});

// Which candidate an association leans toward. An association has ONE vote, so it leans toward at most one candidate: the one it is shown supporting.
// Derived from the positions the page draws, so it stays right after a vote, a confirmation or a choice, whatever the server said of it at the start.
// Answers null when no candidate is shown and no reader said "none", else
//   {subject_qid, source: 'reader' | 'news', conflicting: [qids], none, human, confirmedBy}
//   subject_qid  the candidate it is shown supporting; null when several are (conflicting: their qids: the page draws "conflicting indications")
//   source       'reader' when a reader chose it (a vote "for") or confirmed it, else 'news'
//   none         no candidate is shown and a reader chose "none / undecided" (a vote "no position")
//   human, confirmedBy  the vote that decides it ({value, by, at}) and the readers whose confirmation holds, of the candidate supported
export const leanOf = (member, levels, subjects) => {
    const supported = [];
    let undecided = null;
    for (const subject of subjects) {
        const entry = member.positions?.[subject.qid];
        if (!entry) continue;
        const read = readEntry(entry, levels);
        if (sideOf(read.position) === 'yes') supported.push({subject, read, entry});
        else if (read.human?.value === 'unknown' && !undecided) undecided = read.human;
    }
    if (supported.length === 0) return undecided ? {subject_qid: null, source: 'reader', conflicting: [], none: true, human: undecided, confirmedBy: []} : null;
    if (supported.length > 1) return {subject_qid: null, source: 'news', conflicting: supported.map(one => one.subject.qid), none: false, human: null, confirmedBy: []};
    const [{subject, read, entry}] = supported;
    return {
        subject_qid: subject.qid, source: read.human || read.confirmedByReader ? 'reader' : 'news', conflicting: [], none: false, human: read.human,
        confirmedBy: read.confirmedByReader ? entry.confirmed.by.slice(0, entry.confirmed.count) : [],
    };
};
