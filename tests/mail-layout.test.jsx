//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: mail-layout.test.jsx
//  Description: The layout of the editor of the e-mail chosen in the settings, with its drawings, the three frames at first; and the
//               blocks a story can carry, which it has and which the editor opens with (the lists of the settings: see block-lists.test.jsx)
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";
import {MailLayoutChoice} from '@/features/briefing/components/MailLayoutChoice.jsx';
import {DEFAULT_LAYOUT, keepLayout, keptLayout} from '@/features/briefing/mailEditorLayout.js';
import {BLOCKS, countOf, DEFAULT_BLOCKS, hasBlock, PRESETS, SERVER_BLOCKS, startingChoices} from '@/features/briefing/mailBlocks.js';

vi.mock('@/features/auth/accountApi.js', () => ({AccountApi: {rename: vi.fn(), changeEmail: vi.fn(), changePassword: vi.fn()}}));
const {SettingsPage} = await import('@/pages/Settings.jsx');

vi.setConfig({testTimeout: 20000});

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('the layout of the editor of the e-mail', () => {
    it('should be the three frames at first, and the matrix once the reader chooses it, kept in the browser', () => {
        expect(keptLayout()).toBe('frames');
        expect(DEFAULT_LAYOUT).toBe('frames');
        keepLayout('matrix');
        expect(keptLayout()).toBe('matrix');
        // a value nobody wrote is no layout
        localStorage.setItem('newsgenerator.mail-editor', 'carousel');
        expect(keptLayout()).toBe('frames');
    });

    it('should offer the two as cards with a drawing each, the three frames chosen and said to be the one at first', () => {
        const {container} = render(<MailLayoutChoice/>);
        const group = screen.getByRole('radiogroup', {name: 'The editor of the e-mail'});
        expect(group).toBeInTheDocument();
        expect(screen.getByRole('radio', {name: /Three frames/})).toBeChecked();
        expect(screen.getByRole('radio', {name: /Matrix/})).not.toBeChecked();
        expect(screen.getByRole('radio', {name: /Three frames/})).toHaveTextContent('at first');
        // a drawing in each, hidden from the screen readers: the words say it
        expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    });

    it('should keep the choice, and read it again when the page is opened again', () => {
        const {unmount} = render(<MailLayoutChoice/>);
        fireEvent.click(screen.getByRole('radio', {name: /Matrix/}));
        expect(screen.getByRole('radio', {name: /Matrix/})).toBeChecked();
        expect(localStorage.getItem('newsgenerator.mail-editor')).toBe('matrix');
        unmount();

        render(<MailLayoutChoice/>);
        expect(screen.getByRole('radio', {name: /Matrix/})).toBeChecked();
        expect(screen.getByRole('radio', {name: /Three frames/})).not.toBeChecked();
    });

    it('should be a section of the settings of the account', () => {
        render(
            <MemoryRouter initialEntries={['/settings']}>
                <WithSession user={{id: 1, username: 'reader', email: 'reader@example.org', role: 2}} refresh={vi.fn()}>
                    <Routes><Route path="/settings" element={<SettingsPage/>}/></Routes>
                </WithSession>
            </MemoryRouter>
        );
        expect(screen.getByRole('heading', {name: 'The editor of the e-mail'})).toBeInTheDocument();
        expect(screen.getByRole('radio', {name: /Three frames/})).toBeChecked();
        // and the blocks ticked for the e-mail and for the page, under it (the user, 05.11.2026; one list each instead of three presets, 10.11.2026)
        expect(screen.getByRole('heading', {name: 'What a story carries in the e-mail'})).toBeInTheDocument();
        expect(screen.getByRole('table', {name: 'What a story carries in the e-mail'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'What a story carries on the page'})).toBeInTheDocument();
        expect(screen.getByRole('table', {name: 'What a story carries on the page'})).toBeInTheDocument();
        expect(screen.queryByRole('table', {name: /presets/})).toBeNull();
    });
});

describe('the blocks a story can carry in the e-mail', () => {
    const story = {thumbnail: 'a.jpg', countries: ['FR'], media: 3, contested: [{by: 'X'}], official: [], hedged: null, names: ['FIFA'], analysis: {why: ['A.'], next: [], timeline: []},
        angles: [], affair: true, hasArticles: true};

    it('should list the picture, the countries, the four badges, who it is about, the analysis, the angles, the affair and its coverage', () => {
        expect(BLOCKS.map(block => block.label)).toEqual(['Picture', 'Countries', 'Told by', 'Contested', 'Officially confirmed', 'Unconfirmed', 'Who it is about',
            'AI analysis', 'Angles', 'This affair', 'Coverage']);
        expect(BLOCKS.filter(block => block.badge).map(block => block.key)).toEqual(['media', 'contested', 'official', 'unconfirmed']);
    });

    it('should send to the server the blocks it takes, not the picture and the countries, which have their own choice', () => {
        expect(SERVER_BLOCKS).toEqual(['media', 'contested', 'official', 'unconfirmed', 'names', 'analysis', 'angles', 'affair', 'coverage']);
        expect(Object.keys(DEFAULT_BLOCKS)).toEqual(SERVER_BLOCKS);
    });

    it('should know which blocks a story has: the ones it has data for', () => {
        const has = BLOCKS.filter(block => hasBlock(story, block.key)).map(block => block.key);
        expect(has).toEqual(['picture', 'countries', 'media', 'contested', 'names', 'analysis', 'affair', 'coverage']);
        // a story with nothing but its text carries a picture, nothing more
        expect(BLOCKS.filter(block => hasBlock({}, block.key)).map(block => block.key)).toEqual(['picture']);
        expect(hasBlock({analysis: {why: [], next: [], timeline: []}}, 'analysis')).toBe(false);
    });

    it('should count how many stories have a block and how many of them have it on', () => {
        const stories = [story, {...story, affair: false}, {}];
        const on = (one, key) => key === 'affair' && one === story;
        expect(countOf(stories, 'affair', on)).toEqual({having: 1, on: 1});
        expect(countOf(stories, 'media', on)).toEqual({having: 2, on: 0});
        expect(countOf(stories, 'angles', on)).toEqual({having: 0, on: 0});
    });

    // the presets are gone from the editor and the page (10.11.2026): they are read only to carry over what a reader had set
    it('should keep the three presets of before, each putting on the blocks of the one before and more', () => {
        const [short, standard, everything] = PRESETS;
        expect(PRESETS.map(preset => preset.label)).toEqual(['Short', 'Standard', 'Everything']);
        expect(short.on).toEqual(['media', 'contested', 'official', 'unconfirmed']);
        for (const key of short.on) expect(standard.on).toContain(key);
        for (const key of standard.on) expect(everything.on).toContain(key);
        expect(standard.on).toEqual(expect.arrayContaining(['picture', 'countries', 'names', 'analysis']));
        expect(standard.on).not.toContain('angles');
        expect(everything.on).toHaveLength(BLOCKS.length);
    });
});

describe('startingChoices, what the editor opens with', () => {
    const rich = {storyId: 1, thumbnail: 'https://cdn.example/a.jpg', countries: ['FR'], media: 3, names: [{name: 'FIFA'}], angles: [{title: 'x'}], hasArticles: true};
    const bare = {storyId: 2};

    it('should put the blocks of the list on and the others off for a story that has them, and leave the others as they are', () => {
        const {blocks, choices, countries} = startingChoices([rich, bare], ['media', 'names', 'picture']);
        expect(blocks[1]).toEqual({...DEFAULT_BLOCKS, media: true, names: true, angles: false, coverage: false});
        // a story with nothing to carry has nothing set
        expect(blocks[2]).toBeUndefined();
        // the picture is on in the list, the countries are not: they are taken off
        expect(choices).toEqual({});
        expect(countries).toEqual({1: []});
    });

    it('should leave the picture out of every story when the list has none, and take no countries off a story that has none', () => {
        const {choices, countries} = startingChoices([rich, bare], ['media']);
        expect(choices).toEqual({1: {kind: 'none'}, 2: {kind: 'none'}});
        expect(countries).toEqual({1: []});
    });

    it('should give the same as the list when it has everything', () => {
        const everything = BLOCKS.map(block => block.key);
        const {blocks, choices, countries} = startingChoices([rich], everything);
        expect(blocks[1]).toMatchObject({media: true, names: true, angles: true, coverage: true});
        expect(choices).toEqual({});
        expect(countries).toEqual({});
    });
});
