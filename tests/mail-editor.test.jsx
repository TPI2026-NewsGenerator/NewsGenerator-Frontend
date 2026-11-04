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

describe('the story chosen in the list', () => {
    it('should say whose blocks the frame on the right shows, with its place in the e-mail', async () => {
        await open();
        expect(everyStory()).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        expect(screen.queryByRole('group', {name: 'What every story carries in the e-mail'})).toBeNull();
        expect(carries('Second story')).toHaveTextContent('Story 02, in the e-mail');
        expect(carries('Second story')).toHaveTextContent('Second story');
        expect(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'})).toHaveAttribute('aria-pressed', 'true');
        // and back to every story
        fireEvent.click(screen.getByRole('button', {name: /All the stories/}));
        expect(everyStory()).toBeInTheDocument();
    });

    // the frame of the e-mail is scrolled to the story, a line drawn around it; jsdom draws nothing, so the document of the frame is faked
    it('should show the story in the e-mail: scrolled to, a line around it, and the e-mail from its top for every story', async () => {
        await open();
        const frame = await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000});
        const scrollTo = vi.fn();
        const cell = {style: {outline: ''}};
        const card = {firstElementChild: cell, getBoundingClientRect: () => ({top: 300})};
        Object.defineProperty(frame, 'contentDocument', {configurable: true, value: {
            defaultView: {scrollTo, scrollY: 40},
            querySelectorAll: () => [cell],
            getElementById: id => id === 'story-2' ? card : null,
        }});

        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        expect(scrollTo).toHaveBeenLastCalledWith({top: 328, behavior: 'smooth'});
        expect(cell.style.outline).toBe('2px solid #2997FF');

        fireEvent.click(screen.getByRole('button', {name: /All the stories/}));
        expect(scrollTo).toHaveBeenLastCalledWith({top: 0, behavior: 'smooth'});
        expect(cell.style.outline).toBe('');
    });

    // the line is there for a second (the user, 05.11.2026), and not at each drawing of the e-mail after a change
    it('should take the line away after a second, and not draw it again when the e-mail is drawn again', async () => {
        await open();
        const frame = await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000});
        const cell = {style: {outline: ''}};
        const card = {firstElementChild: cell, getBoundingClientRect: () => ({top: 300})};
        Object.defineProperty(frame, 'contentDocument', {configurable: true, value: {
            defaultView: {scrollTo: vi.fn(), scrollY: 0}, querySelectorAll: () => [cell], getElementById: id => id === 'story-2' ? card : null,
        }});

        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
        try {
            fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
            expect(cell.style.outline).toBe('2px solid #2997FF');
            vi.advanceTimersByTime(999);
            expect(cell.style.outline).toBe('2px solid #2997FF');
            vi.advanceTimersByTime(1);
            expect(cell.style.outline).toBe('');

            // the e-mail drawn again (a change of the reader): scrolled to the story, no line
            fireEvent.load(frame);
            expect(cell.style.outline).toBe('');
            vi.advanceTimersByTime(2000);
            expect(cell.style.outline).toBe('');

            // a story chosen while the line of another is there: the old one goes at once, the new one has its second
            fireEvent.click(screen.getByRole('button', {name: /All the stories/}));
            fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
            vi.advanceTimersByTime(600);
            fireEvent.click(screen.getByRole('button', {name: /All the stories/}));
            expect(cell.style.outline).toBe('');
        } finally {
            vi.useRealTimers();
        }
    });
});

// the pictures of the e-mail come after the e-mail and push its cards down: the story is put back at the top as each one arrives
describe('the story chosen, while the pictures of the e-mail come', () => {
    it('should put the story back at the top when a picture arrives, and not when the reader has chosen another place since', async () => {
        await open();
        const frame = await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000});
        const scrollTo = vi.fn();
        const arrivals = [];
        const card = {firstElementChild: {style: {outline: ''}}, getBoundingClientRect: () => ({top: 300})};
        Object.defineProperty(frame, 'contentDocument', {configurable: true, value: {
            defaultView: {scrollTo, scrollY: 0},
            querySelectorAll: () => [],
            getElementById: id => id === 'story-2' ? card : null,
            images: [{complete: false, addEventListener: (type, handler) => arrivals.push(handler)}, {complete: true, addEventListener: vi.fn()}],
        }});

        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        expect(scrollTo).toHaveBeenLastCalledWith({top: 288, behavior: 'smooth'});
        // only the picture still coming is waited for, once it has come the card is put back at the top, at once
        expect(arrivals).toHaveLength(1);
        arrivals[0]();
        expect(scrollTo).toHaveBeenLastCalledWith({top: 288, behavior: 'auto'});

        // another place chosen meanwhile: the late picture does not take the e-mail back to the old story
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        fireEvent.click(screen.getByRole('button', {name: /All the stories/}));
        const calls = scrollTo.mock.calls.length;
        arrivals[0]();
        expect(scrollTo.mock.calls.length).toBe(calls);
    });
});

describe('the e-mail as it will be sent, beside the editor', () => {
    it('should draw the e-mail a moment after the editor opens, in a frame where nothing runs', async () => {
        await open();
        const frame = await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000});
        expect(frame).toHaveAttribute('srcdoc', '<p>The e-mail</p>');
        // nothing in it runs: of the page's own origin so the page can scroll it to a story, but with no script
        expect(frame.getAttribute('sandbox')).not.toMatch(/allow-scripts/);
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

// on a phone the e-mail is shown alone, the list of the stories and what the story carries closed, each opening from its side over 90% of
// the screen, the e-mail dimmed beside it (the user, 05.11.2026)
describe('the editor of the e-mail, three frames on a phone', () => {
    const wide = window.matchMedia;
    beforeEach(() => {
        window.matchMedia = query => ({matches: query === '(max-width: 767px)', media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}});
    });
    afterEach(() => {
        window.matchMedia = wide;
    });
    const stories = () => screen.queryByRole('region', {name: 'The stories'});
    const carried = () => screen.queryByRole('region', {name: 'What the e-mail carries'});

    it('should show the e-mail alone at first, the list of the stories and what they carry both closed', async () => {
        await open();
        expect(stories()).toBeNull();
        expect(carried()).toBeNull();
        expect(screen.queryByRole('navigation', {name: 'The stories of the e-mail, in their order'})).toBeNull();
        expect(screen.queryByRole('group', {name: /carries in the e-mail/})).toBeNull();
        expect(await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Stories'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Edit'})).toBeInTheDocument();
        // no tab to choose between frames any more
        expect(screen.queryByRole('tablist')).toBeNull();
    });

    it('should open the list of the stories from the left over 90% of the screen, and close it with its button', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Stories'}));
        const list = within(stories());
        expect(list.getByRole('navigation', {name: 'The stories of the e-mail, in their order'})).toBeInTheDocument();
        expect(list.getByRole('button', {name: 'Edit “First story” in the e-mail'})).toBeInTheDocument();
        // its own title and way back, 90% of the width, on the left
        expect(stories().className).toMatch(/w-\[90%\]/);
        expect(stories().className).toMatch(/left-0/);
        fireEvent.click(screen.getByRole('button', {name: 'Close the stories'}));
        expect(stories()).toBeNull();
    });

    it('should close a frame with a tap on the e-mail beside it', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Stories'}));
        fireEvent.click(document.querySelector('[data-drawer-backdrop]'));
        expect(stories()).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
        expect(carried()).not.toBeNull();
        fireEvent.click(document.querySelector('[data-drawer-backdrop]'));
        expect(carried()).toBeNull();
    });

    it('should close the list on the e-mail when a story is chosen, which then is the one the frame of its blocks shows', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Stories'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        expect(stories()).toBeNull();
        // the e-mail is the one in view, with the story chosen in it
        expect(await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000})).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
        expect(within(carried()).getByRole('group', {name: 'What “Second story” carries in the e-mail'})).toBeInTheDocument();
    });

    it('should open what the e-mail carries from the right over 90% of the screen: every story at first, and the blocks put on or off from there', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
        expect(carried().className).toMatch(/w-\[90%\]/);
        expect(carried().className).toMatch(/right-0/);
        expect(within(carried()).getByRole('group', {name: 'What every story carries in the e-mail'})).toBeInTheDocument();
        fireEvent.click(within(carried()).getByRole('button', {name: 'Everything'}));
        fireEvent.click(screen.getByRole('button', {name: 'Close what the e-mail carries'}));
        expect(carried()).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()[1].affair).toBe(true);
    });

    it('should keep the address and the button to send under the e-mail', async () => {
        await open();
        expect(screen.getByLabelText(/Send the 2 stories to/)).toHaveValue('reader@example.org');
        expect(screen.getByRole('button', {name: 'Send'})).toBeInTheDocument();
    });
});

// on a phone eleven columns do not fit (the user, 05.11.2026): a card for each story, its blocks as buttons
describe('the editor of the e-mail, matrix on a phone', () => {
    const wide = window.matchMedia;
    beforeEach(() => {
        localStorage.setItem('newsgenerator.mail-editor', 'matrix');
        window.matchMedia = query => ({matches: query === '(max-width: 767px)', media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}});
    });
    afterEach(() => {
        window.matchMedia = wide;
    });

    it('should have a card for each story and no table, the blocks of the story as buttons that are on or off', async () => {
        await open();
        expect(screen.queryByRole('table')).toBeNull();
        const cards = within(screen.getByRole('list', {name: 'What each story carries in the e-mail'})).getAllByRole('listitem');
        expect(cards).toHaveLength(2);
        expect(within(cards[0]).getByRole('button', {name: 'Contested, First story'})).toHaveAttribute('aria-pressed', 'true');
        expect(within(cards[0]).getByRole('button', {name: 'This affair, First story'})).toHaveAttribute('aria-pressed', 'false');
        // the second story has none of those blocks: its card has no button for them
        expect(within(cards[1]).queryByRole('button', {name: 'Contested, Second story'})).toBeNull();
        expect(within(cards[1]).getByRole('button', {name: 'Picture, Second story'})).toBeInTheDocument();
    });

    it('should put a block on or off with its button, and send it', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Coverage, First story'}));
        fireEvent.click(screen.getByRole('button', {name: 'Angles, First story'}));
        expect(screen.getByRole('button', {name: 'Coverage, First story'})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', {name: 'Angles, First story'})).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(lastBlocks()[1]).toEqual({...DEFAULT_BLOCKS, coverage: true, angles: false});
    });

    it('should open what the story carries inside its card, and close it with a second tap', async () => {
        await open();
        const edit = screen.getByRole('button', {name: 'Edit “First story” in the e-mail'});
        fireEvent.click(edit);
        const card = edit.closest('li');
        expect(within(card).getByRole('group', {name: 'What “First story” carries in the e-mail'})).toBeInTheDocument();
        expect(within(screen.getAllByRole('listitem')[1]).queryByRole('group', {name: /carries in the e-mail/})).toBeNull();
        fireEvent.click(edit);
        expect(within(card).queryByRole('group', {name: /carries in the e-mail/})).toBeNull();
    });

    it('should set every story with a preset, and have the e-mail as it will be sent in a tab of its own', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Everything'}));
        expect(screen.getByRole('button', {name: 'This affair, First story'})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('tab', {name: 'Stories'})).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('tab', {name: 'Preview'}));
        expect(await screen.findByTitle('The e-mail as it will be sent', {}, {timeout: 4000})).toHaveAttribute('srcdoc', '<p>The e-mail</p>');
    });

    it('should leave the order of the stories to the arrows of their cards', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', {name: 'Move “First story” down'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
        expect(BriefingApi.email.mock.calls.at(-1)[1]).toEqual([2, 1]);
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
