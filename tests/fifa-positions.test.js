//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-positions.test.js
//  Description: How a position is read and drawn: the levels come from the server (none is fixed in the page), a position the list does not
//               hold is unknown, the four categories sort every association once, opposition to one candidate never colours another,
//               Uncertain never colours
//

import {describe, expect, it} from 'vitest';
import {describe as describeMember, fineLevels, labelOf, matchesSearch, orderBySummary, orderCards, passes, positionIn, colouredStrengths, leanOf, readEntry, reasonOf, scaleOf, sideOf, statusLabel, statusOf, strengthOf, summarise, withVote} from '@/features/fifa/positions.js';

const ALL = ['soutien_declare', 'soutien_probable', 'inconnue', 'non_soutien_probable', 'non_soutien_declare'];
const COARSE = ['soutien', 'inconnue'];
const A = {qid: 'A', name: 'Candidate A', color_index: 1};
const B = {qid: 'B', name: 'Candidate B', color_index: 2};
const SUBJECTS = [A, B];
const entry = (position, extra = {}) => ({position, since: '2026-11-01T00:00:00Z', signals_count: 1, uncertain_count: 0, articles_30d: 0, media_30d: 0, ...extra});
const member = (positions, extra = {}) => ({qid: `Q${Math.random()}`, level: 'association', name: 'Testland', association: 'Testland Football Association', fifa: 'TST', iso: 'TL', confederation: 'UEFA', positions, ...extra});
const ALL_SCOPE = {mode: 'all'};

describe('sideOf, labelOf', () => {
    it('should read the side of a position, whatever its level', () => {
        expect(sideOf('soutien_declare')).toBe('yes');
        expect(sideOf('soutien')).toBe('yes');
        expect(sideOf('non_soutien_probable')).toBe('no');
        expect(sideOf('inconnue')).toBe('unknown');
        expect(sideOf(undefined)).toBe('unknown');
    });

    it('should say each level in words', () => {
        expect(labelOf('soutien_declare')).toBe('Declared support');
        expect(labelOf('soutien')).toBe('Support');
        expect(labelOf('non_soutien_declare')).toBe('Declared opposition');
        expect(labelOf('inconnue')).toBe('No known position');
    });
});

describe('the levels of the server', () => {
    it('should have the fine reading only when both a declared and a probable level are enabled', () => {
        expect(fineLevels(ALL)).toEqual({yes: true, no: true});
        expect(fineLevels(COARSE)).toEqual({yes: false, no: false});
        expect(fineLevels(['soutien_declare', 'inconnue'])).toEqual({yes: false, no: false});
    });

    it('should draw the scale from the levels enabled, the unknown one always there', () => {
        expect(scaleOf(ALL)).toEqual(['soutien_declare', 'soutien_probable', 'inconnue', 'non_soutien_probable', 'non_soutien_declare']);
        expect(scaleOf(COARSE)).toEqual(['soutien', 'inconnue']);
        expect(scaleOf([])).toEqual(['inconnue']);
    });

    it('should read a position that the levels do not hold as unknown', () => {
        expect(positionIn(entry('soutien_probable'), COARSE)).toBe('inconnue');
        expect(positionIn(entry('soutien'), COARSE)).toBe('soutien');
        expect(positionIn(undefined, ALL)).toBe('inconnue');
    });

    it('should draw a probable position with dots, whatever the other levels are, and a declared one, a merged one or a vote solid', () => {
        expect(strengthOf('soutien_probable')).toBe('soft');
        expect(strengthOf('non_soutien_probable')).toBe('soft');
        expect(strengthOf('soutien_declare')).toBe('strong');
        expect(strengthOf('non_soutien_declare')).toBe('strong');
        expect(strengthOf('soutien')).toBe('strong');
        expect(strengthOf('inconnue')).toBe('strong');
    });
});

describe('describe, the categories', () => {
    it('should be unknown without a position', () => {
        const described = describeMember(member({}), ALL_SCOPE, ALL, SUBJECTS);
        expect(described).toMatchObject({category: 'unknown', fill: 'var(--map-unknown)', ring: false, hatch: false, label: 'No known position'});
    });

    it('should colour with the colour of the candidate supported: solid when declared, a pattern of dots of that colour when probable', () => {
        const solid = describeMember(member({A: entry('soutien_declare')}), ALL_SCOPE, ALL, SUBJECTS);
        const dots = describeMember(member({A: entry('soutien_probable')}), ALL_SCOPE, ALL, SUBJECTS);
        expect(solid).toMatchObject({category: 'indicated', fill: 'var(--cand-1)'});
        // a pattern, not a lighter flat colour: the same category, another way of drawing
        expect(dots).toMatchObject({category: 'indicated', fill: 'url(#fifa-dots-1)'});
        expect(dots.fill).not.toBe(solid.fill);
        expect(dots.fill).not.toContain('color-mix');
        // the pattern follows the colour of the candidate, and an opposition never has the colour of a candidate
        expect(describeMember(member({B: entry('soutien_probable')}), ALL_SCOPE, ALL, SUBJECTS).fill).toBe('url(#fifa-dots-2)');
        const scope = {mode: 'candidate', subject: 'A'};
        expect(describeMember(member({A: entry('non_soutien_probable')}), scope, ALL, SUBJECTS).fill).toBe('url(#fifa-dots-no)');
        expect(describeMember(member({A: entry('non_soutien_declare')}), scope, ALL, SUBJECTS).fill).toBe('var(--map-no-strong)');
        // dots, hatch and ring are three ways of drawing that are never taken one for another
        const hatch = describeMember(member({A: entry('soutien_declare'), B: entry('soutien_probable')}), ALL_SCOPE, ALL, SUBJECTS);
        expect(hatch.fill).toBe('url(#fifa-hatch)');
        expect(new Set([solid.fill, dots.fill, hatch.fill]).size).toBe(3);
    });

    it('should draw a probable position with dots even when the levels hold no declared one', () => {
        const levels = ['soutien_probable', 'inconnue'];
        expect(describeMember(member({A: entry('soutien_probable')}), ALL_SCOPE, levels, SUBJECTS).fill).toBe('url(#fifa-dots-1)');
    });

    it('should draw a position that rests on a vote solid, never with dots: a vote is decisive', () => {
        const probable = describeMember(member({A: entry('soutien_probable')}), ALL_SCOPE, ALL, SUBJECTS);
        const decided = describeMember(member({A: {...entry('soutien_declare'), human: vote('for'), ai_position: 'soutien_probable'}}), ALL_SCOPE, ALL, SUBJECTS);
        expect(probable.fill).toBe('url(#fifa-dots-1)');
        expect(decided).toMatchObject({fill: 'var(--cand-1)', byReader: true});
        expect(describeMember(member({A: {...entry('non_soutien_declare'), human: vote('against'), ai_position: 'non_soutien_probable'}}), {mode: 'candidate', subject: 'A'}, ALL, SUBJECTS).fill).toBe('var(--map-no-strong)');
    });

    it('should never use a hex colour, only the variables of the theme', () => {
        const fills = [
            describeMember(member({A: entry('soutien_declare')}), ALL_SCOPE, ALL, SUBJECTS),
            describeMember(member({B: entry('soutien_probable')}), ALL_SCOPE, ALL, SUBJECTS),
            describeMember(member({A: entry('non_soutien_declare')}), {mode: 'candidate', subject: 'A'}, ALL, SUBJECTS),
        ].map(described => described.fill);
        for (const fill of fills) expect(fill).not.toMatch(/#[0-9a-f]{3,8}/i);
    });

    it('should fade a position older than 90 days and say so, keeping the way it is drawn', () => {
        const described = describeMember(member({A: entry('soutien_declare', {stale: true})}), ALL_SCOPE, ALL, SUBJECTS);
        // faded by the map (data-stale), the colour is the one of the position
        expect(described).toMatchObject({category: 'indicated', stale: true, fill: 'var(--cand-1)'});
        expect(described.label).toBe('Declared support for Candidate A (older than 90 days)');
        expect(describeMember(member({A: entry('soutien_probable', {stale: true})}), ALL_SCOPE, ALL, SUBJECTS)).toMatchObject({stale: true, fill: 'url(#fifa-dots-1)'});
    });

    it('should be conflicting, hatched, when two candidates are supported', () => {
        const described = describeMember(member({A: entry('soutien_declare'), B: entry('soutien_probable')}), ALL_SCOPE, ALL, SUBJECTS);
        expect(described).toMatchObject({category: 'conflicting', hatch: true, fill: 'url(#fifa-hatch)'});
        expect(described.label).toContain('Candidate A');
        expect(described.label).toContain('Candidate B');
    });

    it('should never give the opposition to one candidate to another in the overview', () => {
        const described = describeMember(member({A: entry('non_soutien_declare')}), ALL_SCOPE, ALL, SUBJECTS);
        expect(described).toMatchObject({category: 'unknown', fill: 'var(--map-unknown)'});
    });

    it('should show the opposition when its candidate is chosen, in a colour that is no candidate\'s', () => {
        const described = describeMember(member({A: entry('non_soutien_declare')}), {mode: 'candidate', subject: 'A'}, ALL, SUBJECTS);
        expect(described).toMatchObject({category: 'indicated', fill: 'var(--map-no-strong)', label: 'Declared opposition'});
    });

    it('should ring an association with Uncertain signals and no position, and not colour it', () => {
        const described = describeMember(member({A: entry('inconnue', {signals_count: 0, since: null, uncertain_count: 2})}), ALL_SCOPE, ALL, SUBJECTS);
        expect(described).toMatchObject({category: 'uncertain', ring: true, fill: 'var(--map-unknown)', uncertain: 2});
    });

    it('should let an Uncertain signal change no colour: the position decides', () => {
        const described = describeMember(member({A: entry('soutien_declare', {uncertain_count: 3})}), ALL_SCOPE, ALL, SUBJECTS);
        expect(described).toMatchObject({category: 'indicated', ring: false, fill: 'var(--cand-1)', uncertain: 3});
    });

    it('should read a position the levels do not hold as unknown', () => {
        const described = describeMember(member({A: entry('soutien_declare')}), ALL_SCOPE, COARSE, SUBJECTS);
        expect(described.category).toBe('unknown');
        expect(describeMember(member({A: entry('soutien')}), ALL_SCOPE, COARSE, SUBJECTS).category).toBe('indicated');
    });

    it('should keep the articles that name an association (a number, never a colour), whatever it shows', () => {
        const read = member({A: entry('inconnue', {articles_30d: 4, media_30d: 2}), B: entry('inconnue', {articles_30d: 5, media_30d: 3})});
        // with no candidate chosen: the sum; with one: the articles of that candidate; the colour stays the grey of unknown
        expect(describeMember(read, ALL_SCOPE, ALL, SUBJECTS)).toMatchObject({fill: 'var(--map-unknown)', coverage: {articles: 9, media: 5}});
        expect(describeMember(read, {mode: 'candidate', subject: 'A'}, ALL, SUBJECTS)).toMatchObject({fill: 'var(--map-unknown)', coverage: {articles: 4, media: 2}});
        // the figure the server sends on the member wins over the sum
        expect(describeMember({...read, coverage: {articles_30d: 7, media_30d: 4}}, ALL_SCOPE, ALL, SUBJECTS).coverage).toEqual({articles: 7, media: 4});
    });
});

describe('summarise', () => {
    it('should sort every association into one category and count the positions known', () => {
        const members = [
            member({A: entry('soutien_declare')}),
            member({A: entry('soutien_declare'), B: entry('soutien_declare')}),
            member({A: entry('inconnue', {uncertain_count: 1})}),
            member({}),
            member({}, {level: 'confederation'}),
        ];
        expect(summarise(members, ALL_SCOPE, ALL, SUBJECTS)).toEqual({total: 4, indicated: 1, conflicting: 1, uncertain: 1, unknown: 1, known: 2});
    });
});

describe('the filters', () => {
    it('should find an association by its country, its name, its code of FIFA or of ISO, without accents', () => {
        const turkey = member({}, {name: 'Türkiye', association: 'Turkish Football Federation', fifa: 'TUR', iso: 'TR'});
        expect(matchesSearch(turkey, 'turkiye')).toBe(true);
        expect(matchesSearch(turkey, 'FOOTBALL fed')).toBe(true);
        expect(matchesSearch(turkey, 'tur')).toBe(true);
        expect(matchesSearch(turkey, 'tr')).toBe(true);
        expect(matchesSearch(turkey, 'brazil')).toBe(false);
        expect(matchesSearch(turkey, '  ')).toBe(true);
    });

    it('should keep what passes the confederation, the level and the search together', () => {
        const one = member({A: entry('soutien_declare')}, {confederation: 'AFC'});
        const described = describeMember(one, ALL_SCOPE, ALL, SUBJECTS);
        expect(passes(one, described, {confederation: 'AFC', level: 'indicated', search: ''})).toBe(true);
        expect(passes(one, described, {confederation: 'UEFA', level: 'all', search: ''})).toBe(false);
        expect(passes(one, described, {confederation: 'all', level: 'uncertain', search: ''})).toBe(false);
        expect(passes(one, described, {confederation: 'all', level: 'all', search: 'nothing'})).toBe(false);
    });
});

// a vote of a reader: the server sends it as entry.human, entry.position is then the decisive one and entry.ai_position the reading of the news
const vote = (value, extra = {}) => ({value, by: 'Enzo', at: '2026-11-12T19:40:00Z', newer_evidence: false, ...extra});
const voted = (value, ai, extra = {}) => entry(value === 'for' ? 'soutien_declare' : value === 'against' ? 'non_soutien_declare' : 'inconnue', {human: vote(value), ai_position: ai, ...extra});

describe('a position set by a reader', () => {
    it('should decide whatever the levels of the server say: a vote is no level of the news', () => {
        expect(readEntry(voted('for', 'inconnue'), COARSE)).toMatchObject({position: 'soutien', aiPosition: 'inconnue'});
        expect(readEntry(voted('against', 'soutien_declare'), COARSE)).toMatchObject({position: 'non_soutien', aiPosition: 'inconnue'});
        expect(readEntry(voted('unknown', 'soutien_declare'), ALL)).toMatchObject({position: 'inconnue', aiPosition: 'soutien_declare'});
        expect(readEntry(entry('soutien_probable'), ALL)).toMatchObject({human: null, position: 'soutien_probable', aiPosition: 'soutien_probable'});
    });

    it('should colour like an established position, plus the mark that a reader set it', () => {
        const described = describeMember(member({A: voted('for', 'inconnue')}), ALL_SCOPE, ALL, SUBJECTS);
        expect(described).toMatchObject({category: 'indicated', fill: 'var(--cand-1)', byReader: true, label: 'Support for Candidate A (set by a reader)'});
    });

    it('should let it take the colour the news gave, and say "no position" over a support', () => {
        const none = describeMember(member({A: voted('unknown', 'soutien_declare')}), ALL_SCOPE, ALL, SUBJECTS);
        expect(none).toMatchObject({category: 'unknown', fill: 'var(--map-unknown)', ring: false, byReader: true, label: 'No position (set by a reader)'});
        const against = describeMember(member({A: voted('against', 'soutien_declare')}), ALL_SCOPE, ALL, SUBJECTS);
        expect(against.category).toBe('unknown');
    });

    it('should show an opposition voted when its candidate is chosen, and not in the overview', () => {
        const one = member({A: voted('against', 'inconnue')});
        expect(describeMember(one, {mode: 'candidate', subject: 'A'}, ALL, SUBJECTS)).toMatchObject({category: 'indicated', fill: 'var(--map-no-strong)', label: 'Opposition (set by a reader)'});
        expect(describeMember(one, ALL_SCOPE, ALL, SUBJECTS).fill).toBe('var(--map-unknown)');
    });

    it('should count in the categories like an established position, and an Uncertain signal it decided no more rings the grey', () => {
        const members = [member({A: voted('for', 'inconnue')}), member({A: voted('unknown', 'inconnue', {uncertain_count: 2})}), member({A: entry('inconnue', {uncertain_count: 1})})];
        expect(summarise(members, ALL_SCOPE, ALL, SUBJECTS)).toEqual({total: 3, indicated: 1, conflicting: 0, uncertain: 1, unknown: 1, known: 1});
        expect(describeMember(members[1], ALL_SCOPE, ALL, SUBJECTS).ring).toBe(false);
    });

    it('should not fade a vote that the news are old on, and not mark an Uncertain label as a vote', () => {
        const faded = describeMember(member({A: voted('for', 'soutien_declare', {stale: true})}), ALL_SCOPE, ALL, SUBJECTS);
        expect(faded).toMatchObject({stale: false, fill: 'var(--cand-1)'});
        const doubt = describeMember(member({A: entry('inconnue', {uncertain_count: 2}), B: voted('unknown', 'inconnue')}), ALL_SCOPE, ALL, SUBJECTS);
        expect(doubt).toMatchObject({category: 'uncertain', byReader: false});
    });

    it('should put a vote in a member, and the reading of the news back when it is taken back', () => {
        const base = member({A: entry('soutien_probable')});
        const after = withVote(base, 'A', vote('against'));
        expect(after.positions.A).toMatchObject({position: 'non_soutien_declare', ai_position: 'soutien_probable', human: {value: 'against'}});
        expect(base.positions.A.human).toBeUndefined();
        // a vote over a vote: the reading of the news is still the first one
        expect(withVote(after, 'A', vote('for')).positions.A).toMatchObject({position: 'soutien_declare', ai_position: 'soutien_probable'});
        // taken back, or another reader's vote decides: the server says so, null is none
        const back = withVote(after, 'A', null);
        expect(back.positions.A).toMatchObject({position: 'soutien_probable', human: null});
        expect(back.positions.A).not.toHaveProperty('ai_position');
        expect(describeMember(back, ALL_SCOPE, ALL, SUBJECTS)).toMatchObject({category: 'indicated', byReader: false, fill: 'url(#fifa-dots-1)'});
    });

    it('should read the news apart from a position a confirmation made solid: ai_position, with no vote', () => {
        const promoted = entry('soutien_declare', {ai_position: 'soutien_probable', confirmed: {count: 1, by: ['Enzo'], at: '2026-11-12T19:40:00Z', outdated: 0}});
        expect(readEntry(promoted, ALL)).toEqual({human: null, position: 'soutien_declare', aiPosition: 'soutien_probable', confirmedByReader: true});
        // the confirmation is of a position the news have changed since: the news' own level is back
        const outdated = entry('soutien_probable', {confirmed: {count: 0, by: ['Enzo'], at: null, outdated: 1}});
        expect(readEntry(outdated, ALL)).toEqual({human: null, position: 'soutien_probable', aiPosition: 'soutien_probable', confirmedByReader: false});
        // a vote wins over a confirmation
        const decided = {...promoted, human: vote('against'), position: 'non_soutien_declare'};
        expect(readEntry(decided, ALL)).toMatchObject({position: 'non_soutien', aiPosition: 'soutien_probable', confirmedByReader: false});
        // the levels have only the merged level: a promoted position is the same colour
        expect(readEntry(promoted, COARSE)).toMatchObject({position: 'soutien', aiPosition: 'inconnue'});
    });

    it('should draw a position of the news a reader confirmed solid at the declared level of its side, and say so', () => {
        const confirmed = {count: 1, by: ['Enzo'], at: '2026-11-12T19:40:00Z', outdated: 0};
        const probable = describeMember(member({A: entry('soutien_probable')}), ALL_SCOPE, ALL, SUBJECTS);
        const promoted = describeMember(member({A: entry('soutien_declare', {ai_position: 'soutien_probable', confirmed})}), ALL_SCOPE, ALL, SUBJECTS);
        expect(probable.fill).toBe('url(#fifa-dots-1)');
        // the same side, the solid colour, the news kept apart; a validated position never ages
        expect(promoted).toMatchObject({category: 'indicated', fill: 'var(--cand-1)', promoted: true, byReader: false, stale: false, label: 'Declared support for Candidate A (confirmed by a reader)'});
        // an opposition: the same side, the solid ink
        const against = describeMember(member({A: entry('non_soutien_declare', {ai_position: 'non_soutien_probable', confirmed})}), {mode: 'candidate', subject: 'A'}, ALL, SUBJECTS);
        expect(against).toMatchObject({fill: 'var(--map-no-strong)', promoted: true, label: 'Declared opposition (confirmed by a reader)'});
        // a declared position confirmed stays solid and is not "promoted" (the news said as much)
        const declared = describeMember(member({A: entry('soutien_declare', {ai_position: 'soutien_declare', confirmed})}), ALL_SCOPE, ALL, SUBJECTS);
        expect(declared).toMatchObject({fill: 'var(--cand-1)', promoted: false, label: 'Declared support for Candidate A'});
        // an outdated confirmation draws the news' own level
        const outdated = describeMember(member({A: entry('soutien_probable', {confirmed: {count: 0, by: ['Enzo'], at: null, outdated: 1}})}), ALL_SCOPE, ALL, SUBJECTS);
        expect(outdated).toMatchObject({fill: 'url(#fifa-dots-1)', promoted: false});
        // a vote still wins: its colour, its mark, no confirmation
        const decided = describeMember(member({A: entry('non_soutien_declare', {human: vote('against'), ai_position: 'soutien_probable', confirmed})}), {mode: 'candidate', subject: 'A'}, ALL, SUBJECTS);
        expect(decided).toMatchObject({fill: 'var(--map-no-strong)', byReader: true, promoted: false, label: 'Opposition (set by a reader)'});
        // a confirmation of "no position" promotes nothing
        const none = describeMember(member({A: entry('inconnue', {confirmed})}), ALL_SCOPE, ALL, SUBJECTS);
        expect(none).toMatchObject({category: 'unknown', fill: 'var(--map-unknown)', promoted: false});
    });

    it('should show the promoted position at once when a confirmation is answered, and the dots again when none holds any more', () => {
        const confirmed = {count: 1, by: ['Enzo'], at: '2026-11-12T19:40:00Z', outdated: 0};
        const base = member({A: entry('soutien_probable')});
        const after = withVote(base, 'A', null, confirmed);
        // same side, the declared level, the reading of the news kept; the vote that decides is none
        expect(after.positions.A).toMatchObject({position: 'soutien_declare', ai_position: 'soutien_probable', human: null, stale: false, confirmed});
        expect(describeMember(after, ALL_SCOPE, ALL, SUBJECTS)).toMatchObject({fill: 'var(--cand-1)', promoted: true});
        // the opposition of the news: the declared opposition
        expect(withVote(member({A: entry('non_soutien_probable')}), 'A', null, confirmed).positions.A).toMatchObject({position: 'non_soutien_declare', ai_position: 'non_soutien_probable'});
        // a declared position stays declared; a position with no side is not promoted
        expect(withVote(member({A: entry('soutien_declare')}), 'A', null, confirmed).positions.A).toMatchObject({position: 'soutien_declare', ai_position: 'soutien_declare'});
        expect(withVote(member({A: entry('inconnue')}), 'A', null, confirmed).positions.A).toMatchObject({position: 'inconnue', confirmed});
        expect(withVote(member({A: entry('inconnue')}), 'A', null, confirmed).positions.A).not.toHaveProperty('ai_position');
        // nobody confirms any more (a withdrawal, another reader's too): the probable position of the news is back, with its dots
        const back = withVote(after, 'A', null, null);
        expect(back.positions.A).toMatchObject({position: 'soutien_probable', human: null, confirmed: null});
        expect(back.positions.A).not.toHaveProperty('ai_position');
        expect(describeMember(back, ALL_SCOPE, ALL, SUBJECTS)).toMatchObject({fill: 'url(#fifa-dots-1)', promoted: false});
        // another reader's confirmation still holds: it stays solid
        expect(withVote(after, 'A', null, {...confirmed, by: ['Other']}).positions.A.position).toBe('soutien_declare');
        // a vote wins over the confirmation, and taking it back leaves the confirmation to decide
        const voted = withVote(after, 'A', vote('against'), confirmed);
        expect(voted.positions.A).toMatchObject({position: 'non_soutien_declare', ai_position: 'soutien_probable', human: {value: 'against'}});
        expect(withVote(voted, 'A', null, confirmed).positions.A).toMatchObject({position: 'soutien_declare', ai_position: 'soutien_probable', human: null});
        // a vote that carries no word of the confirmations leaves what was there
        expect(withVote(after, 'A', vote('for')).positions.A.confirmed).toEqual(confirmed);
        expect(withVote(after, 'A', null, null).positions.A.confirmed).toBeNull();
        // a confirmation of "no position" on a candidate nothing was said on makes an entry that is no position
        const only = withVote(member({}), 'B', null, confirmed);
        expect(only.positions.B).toMatchObject({position: 'inconnue', confirmed});
        expect(describeMember(only, ALL_SCOPE, ALL, SUBJECTS).category).toBe('unknown');
    });

    it('should make an entry of a vote on a candidate nothing was said on', () => {
        const after = withVote(member({}), 'B', vote('for'));
        expect(after.positions.B).toMatchObject({position: 'soutien_declare', ai_position: 'inconnue', signals_count: 0, uncertain_count: 0});
        expect(describeMember(after, ALL_SCOPE, ALL, SUBJECTS).fill).toBe('var(--cand-2)');
    });
});

describe('the reasons of an Uncertain sentence, the statuses and what the map colours', () => {
    it('should say each reason the server sends, in words, and an unknown one as it comes', () => {
        for (const reason of ['speaker_not_binding', 'rumour', 'request_not_position', 'rival_from_association', 'ambiguous', 'readings_disagree', 'unconfirmed', 'denied', 'past', 'other', 'colour_setting']) {
            expect(reasonOf(reason)).toMatch(/^[A-Z].*.$/);
            expect(reasonOf(reason)).not.toContain('_');
        }
        expect(reasonOf('colour_setting')).toBe('The map colours declared positions only: this probable position is not coloured.');
        expect(reasonOf('new_kind')).toBe('new kind.');
        expect(reasonOf(null)).toBe('The position is not established.');
    });

    it('should say which strengths the levels colour: declared, probable, both or the merged level', () => {
        expect(colouredStrengths(ALL)).toEqual({declared: true, probable: true});
        expect(colouredStrengths(['soutien_declare', 'inconnue', 'non_soutien_declare'])).toEqual({declared: true, probable: false});
        expect(colouredStrengths(COARSE)).toEqual({declared: true, probable: true});
        expect(colouredStrengths(['inconnue'])).toEqual({declared: false, probable: false});
    });

    it('should name the statuses of a candidate', () => {
        expect(statusLabel('withdrawn')).toBe('Withdrawn');
        expect(statusLabel('incumbent')).toBe('Incumbent');
        expect(statusLabel('other')).toBe('other');
    });
});

describe('leanOf, which candidate an association leans toward', () => {
    const subjects = [A, B, {qid: 'C', name: 'Candidate C', color_index: 3}];
    const confirmed = {count: 1, by: ['Enzo'], at: '2026-11-12T19:40:00Z', outdated: 0};

    it('should be null when no candidate is shown and no reader said "none"', () => {
        expect(leanOf(member({}), ALL, subjects)).toBeNull();
        expect(leanOf(member({A: entry('inconnue', {uncertain_count: 2})}), ALL, subjects)).toBeNull();
        // an opposition is not a candidate leaned toward
        expect(leanOf(member({A: entry('non_soutien_declare')}), ALL, subjects)).toBeNull();
    });

    it('should be the candidate shown supporting: from the news, or from a reader who chose or confirmed it', () => {
        expect(leanOf(member({A: entry('soutien_probable')}), ALL, subjects)).toMatchObject({subject_qid: 'A', source: 'news', conflicting: [], none: false, human: null, confirmedBy: []});
        const chosen = leanOf(member({B: entry('soutien_declare', {human: vote('for'), ai_position: 'inconnue'})}), ALL, subjects);
        expect(chosen).toMatchObject({subject_qid: 'B', source: 'reader', human: {by: 'Enzo'}});
        const confirmedOne = leanOf(member({A: entry('soutien_declare', {ai_position: 'soutien_probable', confirmed})}), ALL, subjects);
        expect(confirmedOne).toMatchObject({subject_qid: 'A', source: 'reader', human: null, confirmedBy: ['Enzo']});
        // a confirmation that is outdated is no reader's word
        expect(leanOf(member({A: entry('soutien_probable', {confirmed: {...confirmed, count: 0, outdated: 1}})}), ALL, subjects)).toMatchObject({source: 'news', confirmedBy: []});
    });

    it('should say several when two candidates are shown supporting, and none when a reader chose "no position"', () => {
        expect(leanOf(member({A: entry('soutien_declare'), B: entry('soutien_probable')}), ALL, subjects)).toMatchObject({subject_qid: null, conflicting: ['A', 'B'], none: false});
        const none = leanOf(member({A: entry('inconnue', {human: vote('unknown'), ai_position: 'soutien_declare'})}), ALL, subjects);
        expect(none).toMatchObject({subject_qid: null, source: 'reader', conflicting: [], none: true, human: {by: 'Enzo'}});
    });

    it('should follow a choice at once: one vote for a candidate and "no position" on the other is one candidate', () => {
        const both = member({A: entry('soutien_declare'), B: entry('soutien_probable')});
        const chosen = withVote(withVote(both, 'B', vote('for')), 'A', vote('unknown'));
        expect(leanOf(chosen, ALL, subjects)).toMatchObject({subject_qid: 'B', source: 'reader', conflicting: []});
    });
});

describe('orderCards', () => {
    const C = {qid: 'C', name: 'Candidate C', color_index: 3};
    const D = {qid: 'D', name: 'Candidate D', color_index: 4};
    const names = (subjects, positions, chosen) => orderCards(subjects, positions, ALL, chosen).map(one => one.qid).join('');

    it('should put what holds a position first, then the Uncertain signals only, then nothing; inside a group the order of the candidates', () => {
        const positions = {
            // C: a declared support; A: only Uncertain signals; B: nothing; D: a probable opposition
            C: entry('soutien_declare'),
            A: entry('inconnue', {uncertain_count: 2}),
            D: entry('non_soutien_probable'),
        };
        // declared before probable (C, D), then the Uncertain (A), then the nothing (B)
        expect(names([A, B, C, D], positions)).toBe('CDAB');
    });

    it('should count a position for or against alike, and a position set by a reader', () => {
        const positions = {
            A: entry('non_soutien_declare'),
            B: entry('inconnue', {human: {value: 'for', by: 'reader', at: '2026-11-05T00:00:00Z'}, ai_position: 'inconnue'}),
            C: entry('soutien_declare'),
        };
        // three positions (a vote is declared): the candidate order
        expect(names([C, B, A], positions)).toBe('ABC');
        // a reader's "no position" is no position: it goes with the nothing, and its Uncertain signals are decided too
        const said = {A: entry('inconnue', {human: {value: 'unknown', by: 'reader', at: '2026-11-05T00:00:00Z'}, uncertain_count: 3}), B: entry('inconnue', {uncertain_count: 1})};
        expect(names([A, B], said)).toBe('BA');
    });

    it('should put a probable position after the declared ones, whatever the colour order, and keep the order of the server for the same colour', () => {
        const positions = {A: entry('soutien_probable'), B: entry('soutien_declare')};
        expect(names([A, B], positions)).toBe('BA');
        const same = [{qid: 'X', color_index: 2}, {qid: 'Y', color_index: 2}, {qid: 'Z', color_index: 1}];
        expect(orderCards(same, {}, ALL).map(one => one.qid).join('')).toBe('ZXY');
    });

    it('should keep the candidate chosen in the list first, whatever it holds', () => {
        const positions = {A: entry('inconnue'), B: entry('soutien_declare'), C: entry('inconnue', {uncertain_count: 1})};
        expect(names([A, B, C], positions)).toBe('BCA');
        expect(names([A, B, C], positions, 'A')).toBe('ABC');
        expect(names([A, B, C], positions, 'C')).toBe('CBA');
        // a candidate that is not there changes nothing
        expect(names([A, B, C], positions, 'Q')).toBe('BCA');
    });

    it('should read a promoted position (a reader confirmed it) as declared, and tolerate no entries at all', () => {
        const promoted = {A: entry('soutien_declare', {ai_position: 'soutien_probable', confirmed: {count: 1, by: ['reader'], at: '2026-11-05T00:00:00Z', outdated: 0}}), B: entry('soutien_probable')};
        expect(names([B, A], promoted)).toBe('AB');
        expect(names([B, A], undefined)).toBe('AB');
        expect(orderCards([], {}, ALL)).toEqual([]);
        // it does not change the array it is given
        const given = [B, A];
        orderCards(given, promoted, ALL);
        expect(given).toEqual([B, A]);
    });
});

describe('orderBySummary', () => {
    const C = {qid: 'C', name: 'Candidate C', color_index: 3};
    const D = {qid: 'D', name: 'Candidate D', color_index: 4};
    const listed = (...qids) => qids.map(subject_qid => ({subject_qid}));
    const names = (subjects, summary, positions, chosen) => orderBySummary(subjects, summary, positions, ALL, chosen).map(one => one.qid).join('');

    it('should follow the order of the summary, whatever the positions say', () => {
        // the positions would give C, D, A, B (declared, probable, Uncertain, nothing); the summary of the server lists B first
        const positions = {C: entry('soutien_declare'), A: entry('inconnue', {uncertain_count: 2}), D: entry('non_soutien_probable')};
        expect(names([A, B, C, D], listed('B', 'D', 'C'), positions)).toBe('BDCA');
    });

    it('should put the candidates the summary does not hold last, in the order of orderCards', () => {
        const positions = {C: entry('soutien_declare'), A: entry('inconnue', {uncertain_count: 2})};
        // the summary holds D only: the others follow as orderCards gives them (C, A, B)
        expect(names([A, B, C, D], listed('D'), positions)).toBe('DCAB');
        expect(names([A, B, C, D], [], positions)).toBe('CABD');
    });

    it('should keep the candidate chosen in the list first, and be orderCards with no summary', () => {
        const positions = {C: entry('soutien_declare'), D: entry('soutien_probable')};
        expect(names([A, B, C, D], listed('C', 'D'), positions, 'B')).toBe('BCDA');
        expect(names([A, B, C, D], null, positions)).toBe('CDAB');
        expect(names([A, B, C, D], undefined, positions, 'A')).toBe('ACDB');
    });

    it('should ignore a candidate of the summary that is not among the subjects, and not change the arrays it is given', () => {
        const given = [A, B];
        const summary = listed('Q', 'B');
        expect(names(given, summary, {})).toBe('BA');
        expect(given).toEqual([A, B]);
        expect(summary).toEqual(listed('Q', 'B'));
    });
});

describe('statusOf', () => {
    it('should say what the news read, with the same words as the rest of the page', () => {
        expect(statusOf(entry('soutien_declare'), ALL)).toEqual({label: 'Declared support', known: true, human: false, confirmed: false});
        expect(statusOf(entry('soutien_probable'), ALL)).toMatchObject({label: 'Probable support', known: true});
        expect(statusOf(entry('non_soutien_declare'), ALL)).toMatchObject({label: 'Declared opposition', known: true});
        expect(statusOf(entry('non_soutien_probable'), ALL)).toMatchObject({label: 'Probable opposition', known: true});
    });

    it('should say "No known position" for a candidate with no entry (the news say nothing of it), and for a position the levels do not hold', () => {
        expect(statusOf(undefined, ALL)).toEqual({label: 'No known position', known: false, human: false, confirmed: false});
        expect(statusOf(null, ALL)).toMatchObject({label: 'No known position', known: false});
        expect(statusOf(entry('inconnue'), ALL)).toMatchObject({label: 'No known position', known: false});
        expect(statusOf(entry('soutien_declare'), COARSE)).toMatchObject({label: 'No known position', known: false});
    });

    it('should say "Uncertain: signals, no position" when only Uncertain signals exist, never over a position or a decision of a reader', () => {
        expect(statusOf(entry('inconnue', {uncertain_count: 2}), ALL)).toMatchObject({label: 'Uncertain: signals, no position', known: false});
        expect(statusOf(entry('soutien_declare', {uncertain_count: 2}), ALL)).toMatchObject({label: 'Declared support', known: true});
        const decided = entry('inconnue', {uncertain_count: 2, human: {value: 'unknown', by: 'reader', at: '2026-11-05T00:00:00Z'}, ai_position: 'inconnue'});
        expect(statusOf(decided, ALL)).toMatchObject({label: 'No known position', known: false, human: true});
    });

    it('should say that a reader set the position, as a vote reads: Support, Opposition, no position', () => {
        const vote = (value) => entry('inconnue', {human: {value, by: 'reader', at: '2026-11-05T00:00:00Z'}, ai_position: 'inconnue'});
        expect(statusOf(vote('for'), ALL)).toEqual({label: 'Support', known: true, human: true, confirmed: false});
        expect(statusOf(vote('against'), ALL)).toMatchObject({label: 'Opposition', known: true, human: true});
        expect(statusOf(vote('unknown'), ALL)).toMatchObject({label: 'No known position', known: false, human: true});
    });

    it('should say that a reader confirmed the position the news read, which is then solid', () => {
        const confirmed = entry('soutien_declare', {ai_position: 'soutien_probable', confirmed: {count: 1, by: ['reader'], at: '2026-11-05T00:00:00Z', outdated: 0}});
        expect(statusOf(confirmed, ALL)).toEqual({label: 'Declared support', known: true, human: false, confirmed: true});
        // a confirmation older than the news that changed the position counts no more
        const outdated = entry('soutien_probable', {confirmed: {count: 0, by: [], at: '2026-11-05T00:00:00Z', outdated: 1}});
        expect(statusOf(outdated, ALL)).toMatchObject({label: 'Probable support', confirmed: false});
    });
});
