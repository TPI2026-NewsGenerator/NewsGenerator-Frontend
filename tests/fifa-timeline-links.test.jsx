//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-timeline-links.test.jsx
//  Description: The circles of the timeline in the sheet of an association open the article: a dot whose event has a url is a real link (a new tab, keyboard
//               focusable, a title that says where it goes, and a click that does nothing else), a dot with no url stays a plain marker. The small dots are the
//               sentences of the news, the big ones the key moments of the history (the article of the signal that made the change). The timeline of all the
//               associations (the view Timeline) is not changed: it chooses an association
//
//  The associations, the sentences and the articles are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {buildMock} from '../bench/fifa/mock-data.mjs';
import {PositionTimeline} from '@/features/fifa/components/PositionTimeline.jsx';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const FILL = 'var(--cand-1)';
const events = [
    {id: 'first', at: '2026-09-20T00:00:00Z', kind: 'key', label: 'First position: Declared support', title: '20 Sep 2026: First position, Declared support, africasoccer.com', fill: FILL, weight: 4, url: 'https://africasoccer.com/first'},
    {id: 'bare', at: '2026-09-28T00:00:00Z', kind: 'key', label: 'Weakened: Probable support', title: '28 Sep 2026: Weakened, Probable support', fill: FILL, weight: 4, url: null},
    {id: 'read', at: '2026-10-10T00:00:00Z', kind: 'minor', title: '10 Oct 2026: mockpost.example', fill: FILL, url: 'https://mockpost.example/article'},
    {id: 'doubt', at: '2026-10-12T00:00:00Z', kind: 'minor', title: '12 Oct 2026: nowhere.example (Uncertain)', fill: FILL, hollow: true},
    {id: 'doubtful', at: '2026-10-14T00:00:00Z', kind: 'minor', title: '14 Oct 2026: unclear.example (Uncertain)', fill: FILL, hollow: true, url: 'https://unclear.example/article'},
];
const draw = (props = {}) => render(<PositionTimeline events={events} lanes={2} opensOn="start" label="Mock candidate A: dated signals" {...props}/>);

describe('a dot with an article', () => {
    it('should be a real link to it, in a new tab, with a title that says where it goes', () => {
        draw();
        const link = screen.getByRole('link', {name: '10 Oct 2026: mockpost.example. Opens the article'});
        expect(link).toHaveAttribute('href', 'https://mockpost.example/article');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link.getAttribute('rel').split(' ').sort()).toEqual(['noopener', 'noreferrer']);
        expect(link).toHaveAttribute('title', '10 Oct 2026: mockpost.example. Opens the article');
        expect(link).toHaveStyle({cursor: 'pointer'});
    });

    it('should be reachable with the keyboard', () => {
        draw();
        const link = screen.getByRole('link', {name: /^10 Oct 2026: mockpost\.example/});
        expect(link).not.toHaveAttribute('tabindex', '-1');
        link.focus();
        expect(link).toHaveFocus();
    });

    it('should keep the mention of an Uncertain signal in what it says', () => {
        draw();
        const link = screen.getByRole('link', {name: '14 Oct 2026: unclear.example (Uncertain). Opens the article'});
        expect(link).toHaveAttribute('href', 'https://unclear.example/article');
        // it keeps its look: hollow and dashed
        expect(link).toHaveStyle({borderStyle: 'dashed'});
    });

    it('should be the big dot of a key moment too, with the medium of the article in its title', () => {
        draw();
        const link = screen.getByRole('link', {name: '20 Sep 2026: First position, Declared support, africasoccer.com. Opens the article'});
        expect(link).toHaveAttribute('href', 'https://africasoccer.com/first');
        expect(link.style.width).toBe(link.style.height);
        // the label of the key moment is still there, above it
        expect(screen.getByText('First position: Declared support')).toBeInTheDocument();
    });

    it('should open the article and do nothing else: no handler around it hears the click, nor does the timeline choose the event', () => {
        const above = vi.fn();
        const select = vi.fn();
        render(<div onClick={above}><PositionTimeline events={events} onSelect={select} label="timeline"/></div>);
        const link = screen.getByRole('link', {name: /^10 Oct 2026: mockpost\.example/});
        // the browser would navigate: here the click is let through but not followed
        link.addEventListener('click', event => event.preventDefault());
        fireEvent.click(link);
        expect(above).not.toHaveBeenCalled();
        expect(select).not.toHaveBeenCalled();
    });
});

describe('a dot with no article', () => {
    it('should not be a link: the markers keep their behaviour of today', () => {
        draw();
        expect(screen.getAllByRole('link')).toHaveLength(3);
        expect(screen.queryByRole('link', {name: /nowhere\.example/})).toBeNull();
        expect(screen.queryByRole('link', {name: /Weakened/})).toBeNull();
        // plain markers: not in the order of the keyboard, the pointer left alone, titles as before (no "Opens the article")
        for (const name of ['12 Oct 2026: nowhere.example (Uncertain)', '28 Sep 2026: Weakened, Probable support']) {
            const marker = screen.getByRole('button', {name});
            expect(marker).toHaveAttribute('tabindex', '-1');
            expect(marker).toHaveStyle({cursor: 'default'});
            expect(marker).toHaveAttribute('title', name);
        }
    });

    it('should still choose the event when the timeline has onSelect (the view Timeline), and nothing without it', () => {
        const select = vi.fn();
        const above = vi.fn();
        render(<div onClick={above}><PositionTimeline events={events} onSelect={select} label="timeline"/></div>);
        fireEvent.click(screen.getByRole('button', {name: '12 Oct 2026: nowhere.example (Uncertain)'}));
        expect(select).toHaveBeenCalledTimes(1);
        expect(select.mock.calls[0][0]).toMatchObject({id: 'doubt'});
        expect(screen.getByRole('button', {name: '12 Oct 2026: nowhere.example (Uncertain)'})).toHaveAttribute('tabindex', '0');
        fireEvent.click(screen.getByRole('button', {name: '28 Sep 2026: Weakened, Probable support'}));
        expect(select).toHaveBeenCalledTimes(2);
    });

    it('should do nothing on a click when the timeline has no onSelect', () => {
        const above = vi.fn();
        render(<div onClick={above}><PositionTimeline events={events} label="timeline"/></div>);
        fireEvent.click(screen.getByRole('button', {name: '12 Oct 2026: nowhere.example (Uncertain)'}));
        // a plain marker does nothing of its own; the click is the one of the page
        expect(above).toHaveBeenCalledTimes(1);
    });
});

describe('the mock: the articles of the key moments', () => {
    const history = (fifa) => buildMock().association(buildMock().map.members.find(member => member.fifa === fifa).qid).history;

    it('should give the article of the signal that made the change, and none for a weakening', () => {
        expect(history('NOR').map(one => [one.kind, one.url, one.medium])).toEqual([
            ['first', 'https://example.test/mock/NOR/0', 'Mock Herald'],
            ['reversal', 'https://example.test/mock/NOR/1', 'Mock Daily'],
        ]);
        expect(history('EGY').map(one => [one.kind, Boolean(one.url), one.medium])).toEqual([['first', true, 'Mock Post'], ['weakened', false, null]]);
        expect(history('EGY')[1]).toMatchObject({url: null, medium: null});
        // the entries keep what they had
        expect(history('BRA')[0]).toMatchObject({subject_qid: 'QMOCK1', kind: 'first', from: null, to: 'soutien_declare'});
    });
});

describe('the sheet of an association', () => {
    beforeEach(() => {
        Object.values(api).forEach(fn => fn.mockReset());
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
        const mock = buildMock();
        api.map.mockResolvedValue(mock.map);
        api.association.mockImplementation(async qid => buildMock().association(qid));
        api.presidents.mockResolvedValue(mock.presidents);
        api.confederations.mockResolvedValue(mock.confederations);
    });
    const open = async (fifa) => {
        render(<MemoryRouter initialEntries={['/fifa']}><FifaBoard reader="reader"/></MemoryRouter>);
        await screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
        fireEvent.click(screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true}));
        const sheet = await screen.findByRole('dialog');
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        await within(sheet).findByRole('region', {name: 'Mock candidate A'});
        return sheet;
    };

    it('should make the dots of the timeline links to the articles: the sentences and the key moments', async () => {
        const sheet = await open('NOR');
        const timeline = within(sheet).getByRole('group', {name: 'Mock candidate A: dated signals'});
        const links = within(timeline).getAllByRole('link');
        // Norway: two key moments (first position, reversal), both with an article, and the dated sentences
        expect(links.length).toBeGreaterThanOrEqual(3);
        for (const link of links) {
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\/example\.test\/mock\/NOR\//));
            expect(link.getAttribute('aria-label')).toMatch(/\. Opens the article$/);
        }
        const names = links.map(link => link.getAttribute('aria-label'));
        expect(names.some(name => /First position, .*, Mock Herald\. Opens the article$/.test(name))).toBe(true);
        expect(names.some(name => /Reversal, .*, Mock Daily\. Opens the article$/.test(name))).toBe(true);
        // the small dots say the medium of the sentence
        expect(names.some(name => /^\d+ \w+ 2026: Mock \w+\. Opens the article$/.test(name))).toBe(true);
    });

    it('should keep a key moment with no article a plain marker (Egypt: the weakening)', async () => {
        const sheet = await open('EGY');
        const timeline = within(sheet).getByRole('group', {name: 'Mock candidate A: dated signals'});
        // the first position has its article, the weakening has none
        const first = within(timeline).getByRole('link', {name: /First position, .*, Mock Post\. Opens the article$/});
        expect(first).toHaveAttribute('href', 'https://example.test/mock/EGY/0');
        expect(within(timeline).queryByRole('link', {name: /Weakened/})).toBeNull();
        const plain = within(timeline).getByRole('button', {name: /Weakened, Probable support$/});
        expect(plain).toHaveAttribute('tabindex', '-1');
        expect(plain.getAttribute('title')).not.toMatch(/Opens the article/);
    });

    it('should say that a link comes from an Uncertain sentence in its title', async () => {
        const sheet = await open('TUR');
        const timeline = within(sheet).getByRole('group', {name: 'Mock candidate A: dated signals'});
        const uncertain = within(timeline).getAllByRole('link').filter(link => /\(Uncertain\)\. Opens the article$/.test(link.getAttribute('aria-label')));
        expect(uncertain.length).toBeGreaterThan(0);
        expect(uncertain[0]).toHaveStyle({borderStyle: 'dashed'});
    });

    it('should not follow a click on a dot with anything else: the sheet stays open and the page does not move', async () => {
        const sheet = await open('NOR');
        const timeline = within(sheet).getByRole('group', {name: 'Mock candidate A: dated signals'});
        const link = within(timeline).getAllByRole('link')[0];
        link.addEventListener('click', event => event.preventDefault());
        fireEvent.click(link);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(within(screen.getByRole('dialog')).getByRole('heading', {name: 'Norway'})).toBeInTheDocument();
    });
});

describe('the view Timeline (all the associations)', () => {
    it('should not be changed: its dots choose an association, none is a link', async () => {
        Object.values(api).forEach(fn => fn.mockReset());
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
        const mock = buildMock();
        api.map.mockResolvedValue(mock.map);
        api.association.mockImplementation(async qid => buildMock().association(qid));
        api.presidents.mockResolvedValue(mock.presidents);
        api.confederations.mockResolvedValue(mock.confederations);
        render(<MemoryRouter initialEntries={['/fifa?view=timeline']}><FifaBoard reader="reader"/></MemoryRouter>);
        const timeline = await screen.findByRole('group', {name: 'Positions of the associations on a timeline'});
        expect(within(timeline).queryAllByRole('link')).toHaveLength(0);
        const markers = within(timeline).getAllByRole('button');
        expect(markers.length).toBeGreaterThan(5);
        // a dot opens the sheet of its association
        fireEvent.click(markers[0]);
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
});
