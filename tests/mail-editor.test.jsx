//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: mail-editor.test.jsx
//  Description: The editor of the e-mail with the blocks a story can carry (the user, 05.11.2026): put on or off for one story or for
//               all of them, the e-mail as it will be sent drawn beside them, and the two layouts of the editor
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.setConfig({testTimeout: 20000});

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {
        affairs: vi.fn(async () => ({affairs: {1: {title: 'The Infantino affair', stories: 3, media: 8, followed: null}}})),
        getLatest: vi.fn(), start: vi.fn(), vote: vi.fn(), neutralTitle: vi.fn(), pictures: vi.fn(async () => ({pictures: []})),
        email: vi.fn(async () => {}),
        emailPreview: vi.fn(async () => ({html: '<p>The e-mail</p>'})),
    },
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
}));
vi.mock('@/features/entities/entityApi.js', async (original) => ({...await original(), EntityApi: {list: vi.fn(async () => ({entities: [], words: []}))}}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');
const {DEFAULT_BLOCKS} = await import('@/features/briefing/mailBlocks.js');

const article = (n) => ({title: `Article ${n}`, url: `https://media${n}.fr/story`, source: `media${n}.fr`, publishedAt: '2026-09-24T10:00:00.000Z', language: 'en'});
const card = (storyId, title, extra = {}) => ({
    storyId, title, summary: `The first passage of ${title}.`, articles: [article(storyId), article(storyId + 10)],
    lead: {source: `media${storyId}.fr`, url: `https://media${storyId}.fr/story`},
    corroboration: {media: 3, read: 3, independent: 2, agencies: []}, ...extra,
});
// the first story has everything to carry, the second nothing but its text
const FIRST = card(1, 'First story', {
    names: [{name: 'FIFA'}, {name: 'UEFA'}],
    contested: [{by: 'Infantino', sentence: 'No.', translation: 'Non.', source: 'bild.de'}],
    official: [{party: 'UEFA', title: 'A post', url: 'https://www.uefa.com/n', channel: 'site', publishedAt: null}],
    hedged: 'selon nos informations',
    angles: [{title: 'Another angle', source: 'rfi.fr', url: 'https://rfi.fr/n'}],
});
const BRIEFING = {
    id: 9, status: 'ready', hours: 24, createdAt: '2026-10-08T06:00:00.000Z', finishedAt: '2026-10-08T06:01:00.000Z',
    items: [FIRST, {...card(2, 'Second story'), articles: []}],
    analysis: {status: 'ready', picked: [{storyId: 1}], model: 'm', cards: {1: {why: ['It matters.'], next: [], timeline: []}}},
};

const user = {id: 4, username: 'reader', email: 'reader@example.org'};
const open = async () => {
    BriefingApi.getLatest.mockResolvedValue({briefing: BRIEFING, mail: true});
    render(<MemoryRouter><WithSession user={user}><BriefingPage/></WithSession></MemoryRouter>);
    await screen.findByText('First story');
    fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
    fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
};
const carries = (title) => screen.getByRole('group', {name: `What “${title}” carries in the e-mail`});
const everyStory = () => screen.getByRole('group', {name: 'What every story carries in the e-mail'});
const lastBlocks = () => BriefingApi.email.mock.calls.at(-1)[11];

beforeEach(() => localStorage.clear());
afterEach(() => vi.clearAllMocks());

describe('the editor of the e-mail, three frames', () => {
    it('should start with every story, and the blocks at first: the e-mail of before, the badges and who it is about', async () => {
        await open();
        expect(everyStory()).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()).toEqual({1: DEFAULT_BLOCKS, 2: DEFAULT_BLOCKS});
        // the affair and its coverage only when asked for
        expect(DEFAULT_BLOCKS).toMatchObject({affair: false, coverage: false, angles: true, analysis: true, names: true, media: true});
    });

    it('should put a block on or off for one story, and say there is none where a story has none', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        const first = within(carries('First story'));
        expect(first.getByRole('checkbox', {name: 'Contested'})).toBeChecked();
        expect(first.getByRole('checkbox', {name: 'Official source'})).toBeChecked();
        expect(first.getByRole('checkbox', {name: 'Unconfirmed'})).toBeChecked();
        expect(first.getByRole('checkbox', {name: 'Told by 3 media'})).toBeChecked();
        expect(first.getByRole('checkbox', {name: 'This affair'})).not.toBeChecked();
        expect(first.getByRole('checkbox', {name: 'Coverage'})).not.toBeChecked();

        fireEvent.click(first.getByRole('checkbox', {name: 'Contested'}));
        fireEvent.click(first.getByRole('checkbox', {name: 'This affair'}));
        fireEvent.click(first.getByRole('checkbox', {name: 'Coverage'}));
        fireEvent.click(first.getByRole('checkbox', {name: 'Angles'}));

        // the second has nothing but its text: its boxes are there, none to tick
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        const second = within(carries('Second story'));
        for (const name of ['Contested', 'Official source', 'Unconfirmed', 'Who it is about', 'AI analysis', 'Angles', 'This affair', 'Coverage']) {
            expect(second.getByRole('checkbox', {name})).toBeDisabled();
        }

        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()[1]).toEqual({...DEFAULT_BLOCKS, contested: false, affair: true, coverage: true, angles: false});
        expect(lastBlocks()[2]).toEqual(DEFAULT_BLOCKS);
    });

    it('should offer the affair only to a story that is one, and say how long it takes', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        expect(within(carries('First story')).getByRole('checkbox', {name: 'This affair'})).toBeEnabled();
        expect(carries('First story')).toHaveTextContent('about 20 s the first time');
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        expect(carries('Second story')).toHaveTextContent('not an affair');
    });

    it('should keep the lines of the analysis and of the angles for the reader to tick, as before', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        fireEvent.click(screen.getByRole('button', {name: 'Show the details of Angles'}));
        const angles = screen.getByRole('group', {name: 'The other angles of “First story”'});
        fireEvent.click(within(angles).getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', {name: 'Show the details of AI analysis'}));
        fireEvent.click(within(screen.getByRole('group', {name: 'The lines of the analysis of “First story”'})).getByRole('checkbox', {name: /It matters/}));
        expect(screen.getByText(/1 angle taken out · 1 analysis line taken out/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(BriefingApi.email.mock.calls.at(-1)[5]).toEqual({1: {angles: [0], why: [0]}});
    });

    it('should set a block for every story from "All the stories", and keep what each of them was given', async () => {
        await open();
        // one story changed first
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        fireEvent.click(within(carries('First story')).getByRole('checkbox', {name: 'Angles'}));
        fireEvent.click(screen.getByRole('button', {name: /All the stories/}));

        const all = within(everyStory());
        // the story that has it: "0 of 1", the one that has none counts for nothing
        expect(all.getByRole('checkbox', {name: 'Angles'})).not.toBeChecked();
        expect(all.getByRole('checkbox', {name: 'Angles'}).closest('div.flex')).toHaveTextContent('0 of 1');
        fireEvent.click(all.getByRole('checkbox', {name: 'Coverage'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()[1]).toMatchObject({angles: false, coverage: true});
        // the second story has no article to cover: its box was not touched
        expect(lastBlocks()[2].coverage).toBe(false);
    });

    it('should put the blocks of a preset on for every story that has them, the others off', async () => {
        await open();
        fireEvent.click(within(everyStory()).getByRole('button', {name: 'Short'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()[1]).toEqual({media: true, contested: true, official: true, unconfirmed: true, names: false, analysis: false, angles: false, affair: false, coverage: false});
    });

    it('should put everything on with the preset "Everything", the affair and its coverage too', async () => {
        await open();
        fireEvent.click(within(everyStory()).getByRole('button', {name: 'Everything'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()[1]).toEqual({media: true, contested: true, official: true, unconfirmed: true, names: true, analysis: true, angles: true, affair: true, coverage: true});
    });

    it('should reset what was set when the e-mail is opened again', async () => {
        await open();
        fireEvent.click(within(everyStory()).getByRole('button', {name: 'Short'}));
        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()[1]).toEqual(DEFAULT_BLOCKS);
    });
});

describe('the e-mail as it will be sent, beside the editor', () => {
    it('should draw the e-mail a moment after the editor opens, in a frame where nothing runs', async () => {
        await open();
        const frame = await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000});
        expect(frame).toHaveAttribute('srcdoc', '<p>The e-mail</p>');
        expect(frame.getAttribute('sandbox')).not.toMatch(/allow-scripts|allow-same-origin/);
        const [id, sent] = BriefingApi.emailPreview.mock.calls.at(-1);
        expect(id).toBe(9);
        expect(sent).toMatchObject({storyIds: [1, 2], theme: 'light', blocks: {1: DEFAULT_BLOCKS, 2: DEFAULT_BLOCKS}});
        // nothing was sent
        expect(BriefingApi.email).not.toHaveBeenCalled();
    });

    it('should draw it again with what the reader changed, once and not for each change', async () => {
        await open();
        await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000});
        const before = BriefingApi.emailPreview.mock.calls.length;
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        fireEvent.click(within(carries('First story')).getByRole('checkbox', {name: 'Coverage'}));
        fireEvent.click(within(carries('First story')).getByRole('checkbox', {name: 'This affair'}));
        fireEvent.click(within(screen.getByRole('group', {name: 'E-mail colours'})).getByRole('radio', {name: 'Dark'}));
        await waitFor(() => expect(BriefingApi.emailPreview.mock.calls.length).toBe(before + 1), {timeout: 4000});
        expect(BriefingApi.emailPreview.mock.calls.at(-1)[1]).toMatchObject({theme: 'dark', blocks: {1: {affair: true, coverage: true}}});
    });

    it('should say when the e-mail could not be drawn, and keep the last one it had', async () => {
        await open();
        const frame = await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000});
        BriefingApi.emailPreview.mockRejectedValueOnce(new Error('The AI is busy'));
        fireEvent.click(within(everyStory()).getByRole('button', {name: 'Short'}));
        expect(await screen.findByText('The AI is busy', {}, {timeout: 4000})).toBeInTheDocument();
        expect(screen.getByTitle('The e-mail as it will be sent')).toBe(frame);
    });
});

describe('the editor of the e-mail, matrix', () => {
    beforeEach(() => localStorage.setItem('newsgenerator.mail-editor', 'matrix'));

    it('should have the stories in rows and what they carry in columns, a box at each crossing that has one', async () => {
        await open();
        const table = screen.getByRole('table', {name: 'What each story carries in the e-mail'});
        const first = within(table).getByRole('row', {name: /First story/});
        expect(within(first).getByRole('checkbox', {name: 'Contested, First story'})).toBeChecked();
        expect(within(first).getByRole('checkbox', {name: 'This affair, First story'})).not.toBeChecked();
        // the second story has none of them
        const second = within(table).getByRole('row', {name: /Second story/});
        expect(within(second).queryByRole('checkbox', {name: 'Contested, Second story'})).toBeNull();
        expect(within(second).getByRole('checkbox', {name: 'Picture, Second story'})).toBeInTheDocument();
    });

    it('should put a block on for one story with its box, and send it', async () => {
        await open();
        fireEvent.click(screen.getByRole('checkbox', {name: 'Coverage, First story'}));
        fireEvent.click(screen.getByRole('checkbox', {name: 'Angles, First story'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()[1]).toEqual({...DEFAULT_BLOCKS, coverage: true, angles: false});
    });

    it('should put a block on, or off, for every story with the head of its column, saying how many have it', async () => {
        await open();
        const head = screen.getByRole('button', {name: 'Put on “Coverage” for every story'});
        expect(head).toHaveTextContent('0/1');
        fireEvent.click(head);
        expect(screen.getByRole('button', {name: 'Put off “Coverage” for every story'})).toHaveTextContent('1/1');
        fireEvent.click(screen.getByRole('button', {name: 'Put off “Coverage” for every story'}));
        expect(screen.getByRole('checkbox', {name: 'Coverage, First story'})).not.toBeChecked();
    });

    it('should set every story with a preset, then open a story to change its title and the lines it carries', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Everything'}));
        expect(screen.getByRole('checkbox', {name: 'This affair, First story'})).toBeChecked();
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        fireEvent.change(screen.getByLabelText('Its title in the e-mail'), {target: {value: 'A shorter title'}});
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(BriefingApi.email.mock.calls.at(-1)[4]).toEqual({1: 'A shorter title'});
        expect(lastBlocks()[1].affair).toBe(true);
    });

    it('should show the e-mail as it will be sent under the matrix when the reader asks', async () => {
        await open();
        fireEvent.click(screen.getByRole('tab', {name: 'Preview'}));
        expect(await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000})).toHaveAttribute('srcdoc', '<p>The e-mail</p>');
    });

    it('should leave the order of the stories to the arrows of their rows', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Move “First story” down'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(BriefingApi.email.mock.calls.at(-1)[1]).toEqual([2, 1]);
    });
});
