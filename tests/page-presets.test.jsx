//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: page-presets.test.jsx
//  Description: The cards of the briefing in the preset the reader chose in the toolbar (the user, 06.11.2026): "Everything" at first, the
//               whole card as the page always showed it, then "Short" and "Standard" with what the reader set for each in the settings
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
const choice = () => screen.getByRole('group', {name: 'Show'});

beforeEach(() => localStorage.clear());
afterEach(() => vi.clearAllMocks());

describe('the preset the page shows its cards in', () => {
    it('should show the whole card at first: "Everything" is the preset chosen', async () => {
        const container = await open();
        expect(within(choice()).getByRole('radio', {name: 'Everything'})).toHaveAttribute('data-state', 'on');
        expect(container.querySelector('article img')).not.toBeNull();
        expect(screen.getByRole('button', {name: /^Angles/})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^Coverage/})).toBeInTheDocument();
    });

    it('should offer the three presets, next to the way to read the cards', async () => {
        await open();
        expect(within(choice()).getAllByRole('radio').map(radio => radio.textContent)).toEqual(['Short', 'Standard', 'Everything']);
        expect(screen.getByRole('group', {name: 'Read as'})).toBeInTheDocument();
    });

    it('should leave out of the cards what "Short" does not contain, and keep the choice in the browser', async () => {
        const container = await open();
        fireEvent.click(within(choice()).getByRole('radio', {name: 'Short'}));
        expect(within(choice()).getByRole('radio', {name: 'Short'})).toHaveAttribute('data-state', 'on');
        expect(container.querySelector('article img')).toBeNull();
        expect(screen.queryByRole('button', {name: /^Angles/})).toBeNull();
        expect(screen.queryByRole('button', {name: /^Coverage/})).toBeNull();
        // the title and the text are always there
        expect(screen.getByText('First story')).toBeInTheDocument();
        expect(screen.getByText('The first passage.')).toBeInTheDocument();
        expect(localStorage.getItem('newsgenerator.briefing-show')).toBe('short');
    });

    it('should read the choice again when the page is opened again', async () => {
        localStorage.setItem('newsgenerator.briefing-show', 'short');
        const container = await open();
        expect(within(choice()).getByRole('radio', {name: 'Short'})).toHaveAttribute('data-state', 'on');
        expect(container.querySelector('article img')).toBeNull();
    });

    it('should show what the reader set for a preset in the settings', async () => {
        // "Short" with the picture and the angles, "Everything" without the coverage
        localStorage.setItem('newsgenerator.page-presets', JSON.stringify({
            short: ['picture', 'angles', 'media'],
            everything: ['picture', 'countries', 'media', 'contested', 'official', 'unconfirmed', 'names', 'analysis', 'angles', 'affair'],
        }));
        const container = await open();
        expect(screen.queryByRole('button', {name: /^Coverage/})).toBeNull();
        expect(screen.getByRole('button', {name: /^Angles/})).toBeInTheDocument();

        fireEvent.click(within(choice()).getByRole('radio', {name: 'Short'}));
        expect(container.querySelector('article img')).not.toBeNull();
        expect(screen.getByRole('button', {name: /^Angles/})).toBeInTheDocument();
    });
});
