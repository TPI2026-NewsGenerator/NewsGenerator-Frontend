//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-summary.test.jsx
//  Description: The tab "Summary" of the sheet of an association, the second one (the sheet opens on Positions): what the association says of each candidate in plain lines BUILT BY THE
//               CODE (position and since when, set by a reader or changed from, the sentences declared and probable with the media and the last date, who said it, the key
//               sentences word for word with their medium as a link, the other side, the confederation and the other associations), and the summary an AI writes ONLY when a reader
//               asks for it (the button, the wait, what the server refuses, the claims with their numbered chips, a summary written before the sheet changed, a summary asked by
//               another reader). The tab Positions follows the order of the summary, and leaves out the candidates the news say nothing of for the association (but the
//               one chosen in the list of the page). Information only: nothing here confirms or votes
//
//  The associations, the readers and the AI summaries are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ALL_LEVELS, MOCK_SUBJECTS, buildMock, seedAiSummaries, summarySignature, writeAiSummary} from '../bench/fifa/mock-data.mjs';
import {labelOf, readEntry} from '@/features/fifa/positions.js';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), vote: vi.fn(), summarise: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const D = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
const KINDS = {first: 'First position', reversal: 'Reversal', weakened: 'Weakened'};

// the AI summaries the server keeps (by association), whether the AI summary is switched off, and the sheet the server answers (replaceable by a test)
let store = {};
let off = false;
let answerOf = null;
const sheetOf = (fifa, options = {}) => {
    const mock = buildMock({reader: 'reader', aiSummaries: store, aiOff: off, ...options});
    return mock.association(mock.map.members.find(member => member.fifa === fifa).qid);
};
const serve = () => {
    const mock = buildMock();
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => {
        const sheet = buildMock({reader: 'reader', aiSummaries: store, aiOff: off}).association(qid);
        return answerOf ? answerOf(sheet) : sheet;
    });
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
};
const show = (url = '/fifa') => render(<MemoryRouter initialEntries={[url]}><FifaBoard reader="reader"/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
// the sheet of an association, once it has been read, on the tab asked (Summary by default; the sheet opens on Positions: null leaves it there)
const openSheet = async (fifa, tab = 'Summary') => {
    await mapReady();
    fireEvent.click(shape(fifa));
    const sheet = await screen.findByRole('dialog');
    await waitFor(() => expect(within(sheet).queryByText('Reading the sheet…')).toBeNull());
    if (tab) fireEvent.mouseDown(within(sheet).getByRole('tab', {name: tab}));
    return sheet;
};
const cardOf = (sheet, candidate = 'A') => within(sheet).getByRole('region', {name: `Mock candidate ${candidate}: summary`});
const deferred = () => {
    let resolveIt;
    const promise = new Promise(done => { resolveIt = done; });
    return {promise, resolve: resolveIt};
};
// what the server answers to a request for the summary: the one the mock writes (current: it was just written from this sheet)
const writtenFor = (fifa, by = 'reader') => {
    const written = writeAiSummary(sheetOf(fifa).summary, {by});
    return {ai_summary: {claims: written.claims, facts: written.facts, model: written.model, generated_at: written.generated_at, by: written.by, current: true}, generated: true};
};
const askButton = (sheet) => within(sheet).getByRole('button', {name: 'Summarise with the AI'});

beforeEach(() => {
    store = {};
    off = false;
    answerOf = null;
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the mock: summary', () => {
    it('should list the candidates that hold something, positions first, and none when there is nothing', () => {
        const esp = sheetOf('ESP').summary.candidates;
        expect(esp.map(one => [one.name, one.position])).toEqual([['Mock candidate A', 'soutien_declare'], ['Mock candidate B', 'soutien_probable']]);
        // only Uncertain sentences: a candidate with an unknown position and no side
        const tur = sheetOf('TUR').summary.candidates;
        expect(tur.map(one => [one.name, one.position, one.sides.length])).toEqual([['Mock candidate A', 'inconnue', 0]]);
        expect(tur[0].uncertain_count).toBeGreaterThan(0);
        expect(sheetOf('GER').summary).toEqual({candidates: []});
    });

    it('should carry the fields of the contract on a candidate, a side and a key sentence', () => {
        const one = sheetOf('ESP').summary.candidates[0];
        expect(Object.keys(one).sort()).toEqual([
            'ai_position', 'articles_30d', 'changed', 'color_index', 'confirmed', 'human', 'latest_change', 'media_30d', 'name', 'position', 'previous', 'sides', 'signals_count', 'since',
            'stale', 'status', 'subject_qid', 'uncertain_count',
        ]);
        expect(Object.keys(one.sides[0]).sort()).toEqual(['declared', 'first_at', 'key', 'last_at', 'media', 'probable', 'speakers', 'stance']);
        expect(Object.keys(one.sides[0].key[0]).sort()).toEqual(['binds', 'id', 'level', 'medium', 'published_at', 'role', 'sentence', 'speaker', 'url']);
        expect(Object.keys(one.sides[0].speakers[0]).sort()).toEqual(['binds', 'name', 'role']);
    });

    it('should put the side the position stands on first, both sides when the news go both ways', () => {
        expect(sheetOf('ESP').summary.candidates[0].sides.map(side => side.stance)).toEqual(['for', 'against']);
        // a reversal: the position is now against, the first reading was for
        const nor = sheetOf('NOR').summary.candidates[0];
        expect(nor.position).toBe('non_soutien_probable');
        expect(nor.sides.map(side => side.stance)).toEqual(['against', 'for']);
        expect(nor.latest_change).toMatchObject({kind: 'reversal', subject_qid: nor.subject_qid});
        // a reader set the position against while the news say for: the side of the vote is first, with nothing in it
        const fra = sheetOf('FRA').summary.candidates.find(one => one.name === 'Mock candidate B');
        expect(fra.human).toMatchObject({value: 'against'});
        expect(fra.sides[0]).toMatchObject({stance: 'against', declared: 0, probable: 0, key: []});
    });

    it('should give the context of an association and none for a confederation', () => {
        const esp = sheetOf('ESP').context;
        expect(esp.confederation).toMatchObject({fifa: 'UEFA'});
        for (const subject of MOCK_SUBJECTS) expect(esp.associations[subject.qid].total).toBe(54);
        expect(sheetOf('IND').context.own).toMatchObject({QMOCK1: {position: 'soutien_declare'}});
        expect(sheetOf('AFC').context).toBeNull();
    });

    it('should write the AI summary on demand: none by default, current only until the sheet changes, never when there is nothing to summarise', () => {
        expect(sheetOf('ESP').ai_summary).toBeNull();
        expect(sheetOf('ESP').ai_summary_available).toBe(true);
        // the one seeded in the mock server was written before the sheet changed
        const seeded = sheetOf('ESP', {aiSummaries: seedAiSummaries()});
        expect(seeded.ai_summary).toMatchObject({current: false, by: 'Mock reader 2', model: 'mock-model'});
        // written from the sheet as it is now: current, its claims cite facts it holds
        const written = writeAiSummary(sheetOf('NOR').summary, {by: 'reader'});
        const kept = sheetOf('NOR', {aiSummaries: {[sheetOf('NOR').member.qid]: written}}).ai_summary;
        expect(kept.current).toBe(true);
        const ids = kept.facts.map(fact => fact.id);
        expect(kept.claims.length).toBeGreaterThan(0);
        for (const claim of kept.claims) for (const id of claim.facts) expect(ids).toContain(id);
        expect(written.signature).toBe(summarySignature(sheetOf('NOR').summary));
        expect(sheetOf('GER').ai_summary_available).toBe(false);
        expect(sheetOf('ESP', {aiOff: true}).ai_summary_available).toBe(false);
    });
});

describe('the tab Summary: the lines the code builds', () => {
    it('should be the second tab: the sheet opens on Positions, then Summary, Leadership profile, Notes', async () => {
        show();
        const sheet = await openSheet('ESP', null);
        expect(within(sheet).getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Positions', 'Summary', 'Leadership profile', 'Notes']);
        expect(within(sheet).getByRole('tab', {name: 'Positions'})).toHaveAttribute('aria-selected', 'true');
        expect(within(sheet).getByRole('tab', {name: 'Summary'})).toHaveAttribute('aria-selected', 'false');
        // the cards of Positions are in the page, the lines of the summary are not
        expect(within(sheet).getAllByRole('region', {name: /^Mock candidate [A-E]$/}).length).toBeGreaterThan(0);
        expect(within(sheet).queryByRole('region', {name: /: summary$/})).toBeNull();
        expect(within(sheet).queryByRole('heading', {name: 'AI summary'})).toBeNull();
        // one click opens the summary: the candidates of the summary, in its order; nothing of the tab Positions is in the page any more
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Summary'}));
        expect(within(sheet).getByRole('tab', {name: 'Summary'})).toHaveAttribute('aria-selected', 'true');
        expect(within(sheet).getAllByRole('region', {name: /: summary$/}).map(card => card.getAttribute('aria-label'))).toEqual(['Mock candidate A: summary', 'Mock candidate B: summary']);
        expect(within(sheet).queryByRole('region', {name: 'Mock candidate A'})).toBeNull();
        expect(within(sheet).getByText(/built by the code from the sheet: no AI wrote them/i)).toBeInTheDocument();
        // information only: no button that confirms or votes
        expect(within(sheet).queryByRole('button', {name: /^Confirm/})).toBeNull();
        expect(within(sheet).queryByRole('button', {name: 'Or change the position'})).toBeNull();
    });

    it('should say the position and since when, with the same words as the rest of the page', async () => {
        const one = sheetOf('BRA').summary.candidates[0];
        show();
        const sheet = await openSheet('BRA');
        const card = cardOf(sheet);
        expect(within(card).getByRole('heading', {name: 'Mock candidate A'})).toBeInTheDocument();
        expect(within(card).getByText('Declared support', {selector: 'span'})).toBeInTheDocument();
        expect(within(card).getByText(`Declared support on Mock candidate A since ${D(one.since)}`)).toBeInTheDocument();
    });

    it('should say "set by a reader", and what the news read, when a reader decided', async () => {
        const one = sheetOf('KEN').summary.candidates.find(candidate => candidate.human);
        show();
        const sheet = await openSheet('KEN');
        const card = cardOf(sheet, one.name.slice(-1));
        expect(within(card).getByText('Set by a reader')).toBeInTheDocument();
        // a vote reads as "Support" / "Opposition" / "No position", the same words as the cards of the tab Positions
        const voted = labelOf(readEntry(one, ALL_LEVELS).position);
        expect(within(card).getByText('Support', {selector: 'span'})).toBeInTheDocument();
        expect(within(card).getByText(`${voted} on ${one.name}, set by a reader (${one.human.by}) on ${D(one.human.at)}`)).toBeInTheDocument();
        expect(within(card).getByText(`AI reading from the news: ${labelOf(one.ai_position)}`)).toBeInTheDocument();
    });

    it('should say what the position was before when it changed', async () => {
        const one = sheetOf('EGY').summary.candidates[0];
        expect(one).toMatchObject({changed: true, previous: 'soutien_declare'});
        show();
        const sheet = await openSheet('EGY');
        const card = cardOf(sheet);
        expect(within(card).getByText(`${labelOf(one.position)} on ${one.name} since ${D(one.since)}, changed from ${labelOf(one.previous)}`)).toBeInTheDocument();
    });

    it('should count the sentences declared and probable, the media and the last date, and say who spoke for the association', async () => {
        const one = sheetOf('DEN').summary.candidates[0];
        const side = one.sides[0];
        const total = side.declared + side.probable;
        show();
        const sheet = await openSheet('DEN');
        const group = within(cardOf(sheet)).getByRole('group', {name: `${side.stance === 'for' ? 'For' : 'Against'} ${one.name}`});
        expect(within(group).getByText(`${side.declared} declared and ${side.probable} probable ${total === 1 ? 'sentence' : 'sentences'} in ${side.media} ${side.media === 1 ? 'medium' : 'media'}, last on ${D(side.last_at)}`)).toBeInTheDocument();
        const binding = side.speakers.find(speaker => speaker.binds);
        const other = side.speakers.find(speaker => !speaker.binds);
        expect(binding).toBeTruthy();
        expect(within(group).getByText(`Said by ${binding.name} (${binding.role}, speaks for the association)`)).toBeInTheDocument();
        // a speaker who does not bind the association is named without that
        if (other) expect(within(group).getByText(`Said by ${other.name} (${other.role})`)).toBeInTheDocument();
    });

    it('should quote the key sentences word for word, with the medium as a link to the article and the date', async () => {
        const side = sheetOf('ESP').summary.candidates[0].sides[0];
        show();
        const sheet = await openSheet('ESP');
        const group = within(cardOf(sheet)).getByRole('group', {name: 'For Mock candidate A'});
        for (const key of side.key) {
            expect(within(group).getByText(`“${key.sentence}”`)).toBeInTheDocument();
            const link = within(group).getByRole('link', {name: key.medium});
            expect(link).toHaveAttribute('href', key.url);
            expect(link).toHaveAttribute('target', '_blank');
            expect(link.closest('p')).toHaveTextContent(D(key.published_at));
            expect(link.closest('p')).toHaveTextContent(key.speaker);
        }
    });

    it('should give both sides when the news go both ways, the side the position stands on first, and no side with nothing in it', async () => {
        show();
        let sheet = await openSheet('ESP');
        expect(within(cardOf(sheet)).getAllByRole('group', {name: /^(For|Against) Mock candidate A$/}).map(group => group.getAttribute('aria-label'))).toEqual(['For Mock candidate A', 'Against Mock candidate A']);
        // the side that is not the position's is read too, with its own sentence
        const against = sheetOf('ESP').summary.candidates[0].sides[1];
        expect(within(within(cardOf(sheet)).getByRole('group', {name: 'Against Mock candidate A'})).getByText(`“${against.key[0].sentence}”`)).toBeInTheDocument();
        // only one candidate of the sheet has two sides: B has the one
        expect(within(cardOf(sheet, 'B')).getAllByRole('group').length).toBe(1);
        fireEvent.keyDown(sheet, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        // the position is against (a reversal): the side against is first
        sheet = await openSheet('NOR');
        expect(within(cardOf(sheet)).getAllByRole('group', {name: /^(For|Against) Mock candidate A$/}).map(group => group.getAttribute('aria-label'))).toEqual(['Against Mock candidate A', 'For Mock candidate A']);
    });

    it('should say no position is established when there are only Uncertain sentences, and give no side', async () => {
        const one = sheetOf('TUR').summary.candidates[0];
        show();
        const sheet = await openSheet('TUR');
        const card = cardOf(sheet);
        expect(within(card).getByText(`No established position: ${one.uncertain_count} ${one.uncertain_count === 1 ? 'sentence' : 'sentences'} about the election and this association that ${one.uncertain_count === 1 ? 'does' : 'do'} not say one`)).toBeInTheDocument();
        expect(within(card).getByText('No known position', {selector: 'span'})).toBeInTheDocument();
        expect(within(card).queryAllByRole('group')).toEqual([]);
    });

    it('should say the latest change with the article that made it', async () => {
        const one = sheetOf('NOR').summary.candidates[0];
        const change = one.latest_change;
        show();
        const sheet = await openSheet('NOR');
        const card = cardOf(sheet);
        const line = within(card).getByText(`Latest change, ${D(change.date)}: ${KINDS[change.kind]}, ${change.from ? `${labelOf(change.from)} → ` : ''}${labelOf(change.to)}`);
        expect(line).toBeInTheDocument();
        expect(within(line.closest('p')).getByRole('link', {name: change.medium})).toHaveAttribute('href', change.url);
    });

    it('should say who confirmed the position, and that an old position is kept for the record', async () => {
        const confirmed = sheetOf('MAR').summary.candidates.find(one => one.confirmed?.count > 0);
        show();
        let sheet = await openSheet('MAR');
        const holding = confirmed.confirmed.by.slice(0, confirmed.confirmed.count);
        expect(within(cardOf(sheet, confirmed.name.slice(-1))).getByText(`Confirmed by ${holding.join(', ')}`)).toBeInTheDocument();
        fireEvent.keyDown(sheet, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const stale = sheetOf('UZB').summary.candidates.find(one => one.stale);
        sheet = await openSheet('UZB');
        expect(within(cardOf(sheet, stale.name.slice(-1))).getByText('Older than 90 days: kept for the record.')).toBeInTheDocument();
    });

    it('should say where the confederation and the other associations of it stand, for a candidate that has something', async () => {
        const context = sheetOf('ESP').context;
        const counts = context.associations.QMOCK1;
        show();
        const sheet = await openSheet('ESP');
        expect(within(cardOf(sheet)).getByText(`UEFA itself: ${labelOf(context.own.QMOCK1?.position)}. Other associations of UEFA: ${counts.for} for, ${counts.against} against (of ${counts.total})`)).toBeInTheDocument();
    });

    it('should say the position of the confederation itself when it has one', async () => {
        const context = sheetOf('IND').context;
        const counts = context.associations.QMOCK1;
        expect(context.own.QMOCK1).toBeTruthy();
        show();
        const sheet = await openSheet('IND');
        expect(within(cardOf(sheet)).getByText(`AFC itself: ${labelOf(context.own.QMOCK1.position)}. Other associations of AFC: ${counts.for} for, ${counts.against} against (of ${counts.total})`)).toBeInTheDocument();
    });

    it('should give no context line on the sheet of a confederation', async () => {
        // a confederation is not a shape of the map: its sheet is opened by its address
        show(`/fifa?a=${sheetOf('AFC').member.qid}`);
        const sheet = await screen.findByRole('dialog');
        await waitFor(() => expect(within(sheet).queryByText('Reading the sheet…')).toBeNull());
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Summary'}));
        expect(within(sheet).getAllByRole('region', {name: /: summary$/}).length).toBeGreaterThan(0);
        expect(within(sheet).queryByText(/ itself: /)).toBeNull();
        expect(within(sheet).queryByText(/Other associations of/)).toBeNull();
    });

    it('should say there is nothing to summarise when no candidate holds anything, with no button for the AI', async () => {
        show();
        const sheet = await openSheet('GER');
        expect(within(sheet).getByText('Nothing to summarise yet: no sentence of the news ties this association to a candidate.')).toBeInTheDocument();
        expect(within(sheet).queryByRole('region', {name: /: summary$/})).toBeNull();
        expect(within(sheet).queryByRole('button', {name: 'Summarise with the AI'})).toBeNull();
        expect(within(sheet).queryByRole('heading', {name: 'AI summary'})).toBeNull();
    });
});

describe('the tab Positions follows the order of the summary (the candidates left out: see fifa-cards.test.jsx)', () => {
    const cards = (sheet) => within(sheet).getAllByRole('region', {name: /^Mock candidate [A-E]$/}).map(card => card.getAttribute('aria-label').replace('Mock candidate ', ''));
    const chips = (sheet) => within(within(sheet).getByRole('radiogroup', {name: 'Candidate shown'})).getAllByRole('radio').map(chip => chip.closest('label').textContent);

    it('should open on Positions, with the cards in the order the summary lists the candidates', async () => {
        // the server lists B before A on this sheet
        answerOf = (sheet) => ({...sheet, summary: {candidates: [...sheet.summary.candidates].reverse()}});
        show();
        const sheet = await openSheet('ESP', null);
        await within(sheet).findAllByRole('region', {name: /^Mock candidate [A-E]$/});
        expect(cards(sheet)).toEqual(['B', 'A']);
        expect(chips(sheet)).toEqual(['All', 'Mock candidate B', 'Mock candidate A']);
        // and the summary lists them in the same order
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Summary'}));
        expect(within(sheet).getAllByRole('region', {name: /: summary$/}).map(card => card.getAttribute('aria-label'))).toEqual(['Mock candidate B: summary', 'Mock candidate A: summary']);
    });

    it('should keep the order it had with no summary on the sheet (an older server)', async () => {
        answerOf = (sheet) => {
            const older = {...sheet};
            for (const field of ['summary', 'context', 'ai_summary', 'ai_summary_available']) delete older[field];
            return older;
        };
        show();
        const sheet = await openSheet('ESP', null);
        await within(sheet).findAllByRole('region', {name: /^Mock candidate [A-E]$/});
        expect(cards(sheet)).toEqual(['A', 'B']);
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Summary'}));
        expect(within(sheet).getByText('Nothing to summarise yet: no sentence of the news ties this association to a candidate.')).toBeInTheDocument();
    });
});

describe('the AI summary', () => {
    it('should offer to summarise with the AI when none was written, and say nothing of an AI that is not there', async () => {
        show();
        const sheet = await openSheet('NOR');
        expect(within(sheet).getByRole('heading', {name: 'AI summary'})).toBeInTheDocument();
        expect(askButton(sheet)).toBeEnabled();
        expect(within(sheet).queryByText('Written by the AI from the facts below: it can be wrong')).toBeNull();
    });

    it('should hide the button when the AI summary is switched off', async () => {
        off = true;
        show();
        const sheet = await openSheet('NOR');
        expect(within(sheet).queryByRole('button', {name: 'Summarise with the AI'})).toBeNull();
        expect(within(sheet).queryByRole('heading', {name: 'AI summary'})).toBeNull();
        // the lines of the code are still there
        expect(within(sheet).getAllByRole('region', {name: /: summary$/}).length).toBeGreaterThan(0);
    });

    it('should show a summary someone else asked for, labelled as the AI\'s, with who asked and when, and say the sheet changed since', async () => {
        store = seedAiSummaries();
        const ai = sheetOf('ESP').ai_summary;
        expect(ai).toMatchObject({current: false, by: 'Mock reader 2'});
        show();
        const sheet = await openSheet('ESP');
        expect(within(sheet).getByText('Written by the AI from the facts below: it can be wrong')).toBeInTheDocument();
        expect(within(sheet).getByText(`by ${ai.by}, ${D(ai.generated_at)}`)).toBeInTheDocument();
        expect(within(sheet).getByRole('status')).toHaveTextContent('The sheet has changed since this summary was written.');
        expect(within(sheet).getByRole('button', {name: 'Write it again'})).toBeEnabled();
        expect(within(sheet).queryByRole('button', {name: 'Summarise with the AI'})).toBeNull();
        // the claims as a short list, each followed by the chips of its facts
        const claims = within(within(sheet).getByRole('list', {name: 'Claims'})).getAllByRole('listitem');
        expect(claims.length).toBe(ai.claims.length);
        expect(claims[0]).toHaveTextContent(ai.claims[0].text);
        expect(within(claims[0]).getAllByRole('button').map(chip => chip.getAttribute('aria-label'))).toEqual(['Fact 1', 'Fact 2']);
        expect(within(claims[1]).getAllByRole('button').map(chip => chip.getAttribute('aria-label'))).toEqual(['Fact 3']);
    });

    it('should list the facts, the sentences word for word with their medium as a link and the date', async () => {
        store = seedAiSummaries();
        const ai = sheetOf('ESP').ai_summary;
        show();
        const sheet = await openSheet('ESP');
        const facts = within(within(sheet).getByRole('list', {name: 'Facts'})).getAllByRole('listitem');
        expect(facts.length).toBe(ai.facts.length);
        const sentence = ai.facts.find(fact => fact.kind === 'sentence');
        const item = facts[ai.facts.indexOf(sentence)];
        expect(item).toHaveTextContent(`“${sentence.text}”`);
        expect(within(item).getByRole('link', {name: sentence.medium})).toHaveAttribute('href', sentence.url);
        expect(item).toHaveTextContent(D(sentence.date));
        // a position the code read has no link
        expect(facts[0]).toHaveTextContent(ai.facts[0].text);
        expect(within(facts[0]).queryByRole('link')).toBeNull();
    });

    it('should take the reader to the fact a chip numbers', async () => {
        store = seedAiSummaries();
        show();
        const sheet = await openSheet('ESP');
        const ai = sheetOf('ESP').ai_summary;
        const chip = within(within(sheet).getByRole('list', {name: 'Claims'})).getAllByRole('button', {name: 'Fact 3'})[0];
        fireEvent.click(chip);
        expect(document.activeElement).toHaveTextContent(ai.facts[2].text);
        expect(document.activeElement.tagName).toBe('LI');
    });

    it('should say when it was written, and not ask again, while it is current', async () => {
        const mock = buildMock();
        const member = mock.map.members.find(one => one.fifa === 'ESP');
        store = {[member.qid]: writeAiSummary(sheetOf('ESP').summary, {by: 'Mock reader 2'})};
        const ai = sheetOf('ESP').ai_summary;
        expect(ai.current).toBe(true);
        show();
        const sheet = await openSheet('ESP');
        const button = within(sheet).getByRole('button', {name: `Written ${D(ai.generated_at)}`});
        expect(button).toBeDisabled();
        expect(within(sheet).queryByText('The sheet has changed since this summary was written.')).toBeNull();
        expect(within(sheet).queryByRole('button', {name: 'Write it again'})).toBeNull();
        expect(within(sheet).getByText('Written by the AI from the facts below: it can be wrong')).toBeInTheDocument();
    });

    it('should wait for the AI, once, and show the summary it wrote, with the button saying when', async () => {
        const wait = deferred();
        api.summarise.mockReturnValue(wait.promise);
        show();
        const sheet = await openSheet('NOR');
        const member = sheetOf('NOR').member;
        fireEvent.click(askButton(sheet));
        // the wait: the button is off and busy, the sheet says it takes a while, and a second click does nothing
        await waitFor(() => expect(within(sheet).getByRole('button', {name: /Summarise with the AI/})).toBeDisabled());
        expect(within(sheet).getByRole('button', {name: /Summarise with the AI/})).toHaveAttribute('aria-busy', 'true');
        expect(within(sheet).getByRole('status')).toHaveTextContent('The AI is writing the summary: it takes 5 to 20 seconds.');
        fireEvent.click(within(sheet).getByRole('button', {name: /Summarise with the AI/}));
        expect(api.summarise).toHaveBeenCalledTimes(1);
        expect(api.summarise).toHaveBeenCalledWith(member.qid);
        const answer = writtenFor('NOR');
        wait.resolve(answer);
        expect(await within(sheet).findByText('Written by the AI from the facts below: it can be wrong')).toBeInTheDocument();
        expect(within(sheet).getByText(`by reader, ${D(answer.ai_summary.generated_at)}`)).toBeInTheDocument();
        expect(within(sheet).getByRole('button', {name: `Written ${D(answer.ai_summary.generated_at)}`})).toBeDisabled();
        expect(within(sheet).queryByText('The sheet has changed since this summary was written.')).toBeNull();
        expect(within(sheet).queryByRole('status')).toBeNull();
        expect(within(within(sheet).getByRole('list', {name: 'Claims'})).getAllByRole('listitem').length).toBe(answer.ai_summary.claims.length);
        expect(within(within(sheet).getByRole('list', {name: 'Facts'})).getAllByRole('listitem').length).toBe(answer.ai_summary.facts.length);
    });

    it('should write it again when the sheet has changed, and replace the old summary', async () => {
        store = seedAiSummaries();
        api.summarise.mockResolvedValue(writtenFor('ESP', 'reader'));
        show();
        const sheet = await openSheet('ESP');
        fireEvent.click(within(sheet).getByRole('button', {name: 'Write it again'}));
        expect(await within(sheet).findByRole('button', {name: /^Written /})).toBeDisabled();
        expect(within(sheet).queryByText('The sheet has changed since this summary was written.')).toBeNull();
        expect(within(sheet).getByText(/^by reader, /)).toBeInTheDocument();
        expect(within(sheet).queryByText(/^by Mock reader 2/)).toBeNull();
    });

    it('should go on with the request when the reader opens another tab, and show the summary when they come back', async () => {
        const wait = deferred();
        api.summarise.mockReturnValue(wait.promise);
        show();
        const sheet = await openSheet('NOR');
        fireEvent.click(askButton(sheet));
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
        await within(sheet).findByRole('heading', {name: 'Notes'});
        // back on the summary before the AI has finished: still waiting, never a second request
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Summary'}));
        const waiting = await within(sheet).findByRole('button', {name: /Summarise with the AI/});
        expect(waiting).toBeDisabled();
        expect(waiting).toHaveAttribute('aria-busy', 'true');
        // the AI finishes while another tab is open
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Notes'}));
        await within(sheet).findByRole('heading', {name: 'Notes'});
        wait.resolve(writtenFor('NOR'));
        await waitFor(() => expect(api.summarise).toHaveBeenCalledTimes(1));
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Summary'}));
        expect(await within(sheet).findByText('Written by the AI from the facts below: it can be wrong')).toBeInTheDocument();
        expect(within(sheet).getByRole('button', {name: /^Written /})).toBeDisabled();
    });

    it.each([
        [409, 'There is nothing to summarise on this sheet yet.'],
        [502, 'The AI did not answer: try again in a moment.'],
        [403, 'The AI summary is switched off.'],
        [429, 'You asked for 5 summaries in the last hour: try again later.'],
    ])('should say what the server says when it refuses with %i, and let the reader try again', async (status, message) => {
        api.summarise.mockResolvedValueOnce({error: message, status}).mockResolvedValueOnce(writtenFor('NOR'));
        show();
        const sheet = await openSheet('NOR');
        fireEvent.click(askButton(sheet));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent(message);
        // no summary was written, the button is back
        expect(within(sheet).queryByText('Written by the AI from the facts below: it can be wrong')).toBeNull();
        expect(askButton(sheet)).toBeEnabled();
        // another try works, and the message goes
        fireEvent.click(askButton(sheet));
        expect(await within(sheet).findByText('Written by the AI from the facts below: it can be wrong')).toBeInTheDocument();
        expect(within(sheet).queryByRole('alert')).toBeNull();
    });

    it('should ask a signed-out reader to sign in', async () => {
        api.summarise.mockResolvedValue({error: 'Forbidden, invalid or expired', status: 401});
        show();
        const sheet = await openSheet('NOR');
        fireEvent.click(askButton(sheet));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('Sign in to ask for a summary.');
        expect(askButton(sheet)).toBeEnabled();
    });

    it('should say the summary could not be written when the request itself fails', async () => {
        api.summarise.mockRejectedValue(new Error('network'));
        show();
        const sheet = await openSheet('NOR');
        fireEvent.click(askButton(sheet));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('The summary could not be written. Try again in a moment.');
        expect(askButton(sheet)).toBeEnabled();
    });
});
