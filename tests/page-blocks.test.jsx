//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: page-blocks.test.jsx
//  Description: The cards of the briefing with the blocks the reader ticked for the page in the settings (the user, 10.11.2026: the presets "Short",
//               "Standard" and "Everything" of the toolbar are gone, one mode): the whole card at first, as the page always showed it. What a reader
//               had set for the presets before is carried over
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.setConfig({testTimeout: 20000});

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {
        affairs: vi.fn(async () => ({affairs: {}})),
        getLatest: vi.fn(), start: vi.fn(), vote: vi.fn(), neutralTitle: vi.fn(), pictures: vi.fn(async () => ({pictures: []})),
        email: vi.fn(async () => {}),
        emailPreview: vi.fn(async () => ({html: '<p>The e-mail</p>'})),
    },
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
}));
vi.mock('@/features/entities/entityApi.js', async (original) => ({...await original(), EntityApi: {list: vi.fn(async () => ({entities: [], words: []}))}}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');

const article = (n) => ({title: `Article ${n}`, url: `https://media${n}.fr/story`, source: `media${n}.fr`, publishedAt: '2026-09-24T10:00:00.000Z', language: 'en'});
const BRIEFING = {
    id: 9, status: 'ready', hours: 24, createdAt: '2026-10-08T06:00:00.000Z', finishedAt: '2026-10-08T06:01:00.000Z',
    items: [{
        storyId: 1, title: 'First story', summary: 'The first passage.', articles: [article(1), article(2)],
        points: 'A point.', digest: 'A digest.',
        lead: {source: 'media1.fr', url: 'https://media1.fr/story'}, corroboration: {media: 3, read: 3, independent: 2, agencies: []},
        thumbnail: 'https://cdn.example/a.jpg', angles: [{title: 'Another angle', source: 'rfi.fr', url: 'https://rfi.fr/n'}],
    }],
};

const open = async () => {
    BriefingApi.getLatest.mockResolvedValue({briefing: BRIEFING, mail: false});
    const {container} = render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
    await screen.findByText('First story');
    return container;
};
// the way to read the cards is in a pill of the toolbar (the user, 06.11.2026: two groups of buttons took the toolbar to two lines)
const pill = () => screen.getByRole('button', {name: /^How the cards are read/});

beforeEach(() => localStorage.clear());
afterEach(() => vi.clearAllMocks());

describe('the blocks the page shows of its cards', () => {
    it('should show the whole card at first', async () => {
        const container = await open();
        expect(container.querySelector('article img')).not.toBeNull();
        expect(screen.getByRole('button', {name: /^Angles/})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^Coverage/})).toBeInTheDocument();
    });

    it('should offer only the way to read the cards in the pill of the toolbar, and the way to the blocks in the settings', async () => {
        await open();
        // closed: one pill saying the way
        expect(screen.queryByRole('group', {name: 'Read as'})).toBeNull();
        expect(pill()).toHaveTextContent('Key passages');
        fireEvent.click(pill());
        expect(screen.getByRole('group', {name: 'Read as'})).toBeInTheDocument();
        // no preset to choose any more
        expect(screen.queryByRole('group', {name: 'Show'})).toBeNull();
        expect(screen.queryByRole('radio', {name: 'Short'})).toBeNull();
        expect(screen.queryByRole('radio', {name: 'Standard'})).toBeNull();
        expect(screen.queryByRole('radio', {name: 'Everything'})).toBeNull();
        expect(screen.getByRole('link', {name: 'your settings'})).toHaveAttribute('href', '/settings');
    });

    it('should say the way chosen in the pill, as it is chosen', async () => {
        await open();
        fireEvent.click(pill());
        fireEvent.click(within(screen.getByRole('group', {name: 'Read as'})).getByRole('radio', {name: 'Summary'}));
        expect(pill()).toHaveTextContent('Summary');
    });

    it('should leave out of the cards the blocks the reader did not tick for the page', async () => {
        // the title and the text with the picture and the angles: no coverage
        localStorage.setItem('newsgenerator.page-blocks', JSON.stringify(['picture', 'angles']));
        const container = await open();
        expect(container.querySelector('article img')).not.toBeNull();
        expect(screen.getByRole('button', {name: /^Angles/})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /^Coverage/})).toBeNull();
        // the title and the text are always there
        expect(screen.getByText('First story')).toBeInTheDocument();
        expect(screen.getByText('The first passage.')).toBeInTheDocument();
    });

    it('should show nothing but the title and the text when the reader ticked no block: an empty list is a choice', async () => {
        localStorage.setItem('newsgenerator.page-blocks', '[]');
        const container = await open();
        expect(container.querySelector('article img')).toBeNull();
        expect(screen.queryByRole('button', {name: /^Angles/})).toBeNull();
        expect(screen.queryByRole('button', {name: /^Coverage/})).toBeNull();
        expect(screen.getByText('The first passage.')).toBeInTheDocument();
    });

    it('should carry over the preset the page showed before, with the blocks the reader had ticked for it', async () => {
        // before 10.11.2026: "Short", with the picture and the angles ticked for it
        localStorage.setItem('newsgenerator.briefing-show', 'short');
        localStorage.setItem('newsgenerator.page-presets', JSON.stringify({short: ['picture', 'angles', 'media']}));
        const container = await open();
        expect(container.querySelector('article img')).not.toBeNull();
        expect(screen.getByRole('button', {name: /^Angles/})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /^Coverage/})).toBeNull();
    });

    it('should carry over the "Short" preset as it was when nothing was ticked for it', async () => {
        localStorage.setItem('newsgenerator.briefing-show', 'short');
        const container = await open();
        expect(container.querySelector('article img')).toBeNull();
        expect(screen.queryByRole('button', {name: /^Angles/})).toBeNull();
        expect(screen.queryByRole('button', {name: /^Coverage/})).toBeNull();
    });

    it('should prefer the list of the page to the presets of before', async () => {
        localStorage.setItem('newsgenerator.briefing-show', 'short');
        localStorage.setItem('newsgenerator.page-blocks', JSON.stringify(['coverage']));
        const container = await open();
        expect(container.querySelector('article img')).toBeNull();
        expect(screen.getByRole('button', {name: /^Coverage/})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /^Angles/})).toBeNull();
    });
});
