//
//  Author: Fabian Rostello
//  Date: 03.11.2026
//  File: following-mail.test.jsx
//  Description: The news of the names followed can be put in the e-mail of the briefing (the user, 03.11.2026):
//               added as a card at the end of the briefing, ticked, or, when a card tells that news already,
//               ticked from the list
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {getLatest: vi.fn(), start: vi.fn(), vote: vi.fn(), email: vi.fn(), following: vi.fn(), addNews: vi.fn(), pictures: vi.fn(async () => [])},
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
}));
const entities = vi.hoisted(() => ({list: vi.fn()}));
vi.mock('@/features/entities/entityApi.js', () => ({EntityApi: entities}));
const translate = vi.hoisted(() => ({translateNews: vi.fn()}));
vi.mock('@/features/search/api/searchApi.js', () => ({SearchApi: translate}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');

const card = (storyId, title) => ({
    storyId, title, summary: `The first passage of ${title}.`, articles: [],
    lead: {source: `media${storyId}.fr`, url: `https://media${storyId}.fr/story`},
    corroboration: {media: 1, read: 1, independent: 1, agencies: []},
});
const groups = [{term: 'Infantino', qid: 'Q1', count: 2, hours: 24, limit: 100, news: [
    {storyId: 2, title: 'Infantino answers', url: 'https://y.com/answers', source: 'y.com'},
    {storyId: 77, title: 'Infantino pays his taxes', url: 'https://x.com/taxes', source: 'x.com'},
]}];
const briefing = {
    id: 9, status: 'ready', hours: 24, createdAt: '2026-11-02T06:00:00.000Z', finishedAt: '2026-11-02T06:01:00.000Z',
    items: [card(1, 'First story'), card(2, 'Second story')],
};

const renderTab = async (mail = true) => {
    entities.list.mockResolvedValue({entities: [{qid: 'Q1', inBriefing: true}], words: []});
    BriefingApi.following.mockResolvedValue({limit: 100, groups});
    BriefingApi.getLatest.mockResolvedValue({briefing, mail});
    render(<MemoryRouter initialEntries={['/briefing#terms']}><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
    await screen.findByText('Infantino pays his taxes');
};

describe('The news of the names followed, in the e-mail', () => {
    afterEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should add a news that no card tells at the end of the briefing, ticked for the e-mail', async () => {
        // a news added by its link has that address for its lead article
        BriefingApi.addNews.mockResolvedValue({item: {...card(-1, 'Infantino pays his taxes'), imported: true,
            lead: {source: 'x.com', url: 'https://x.com/taxes'}}, analysis: null});
        await renderTab();
        // the card of the briefing telling the first one is not added again
        const buttons = screen.getAllByRole('button', {name: 'Add to the e-mail'});
        expect(buttons).toHaveLength(1);

        fireEvent.click(buttons[0]);
        await waitFor(() => expect(BriefingApi.addNews).toHaveBeenCalledWith(9, 'https://x.com/taxes'));
        expect(await screen.findByText(/Added to the briefing/)).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Ticked for the e-mail, untick'})).toBeInTheDocument();
    });

    it('should tick the card that tells the news already instead of adding it', async () => {
        await renderTab();
        expect(screen.getByText(/Card 2 of the briefing/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Tick it for the e-mail'}));
        expect(await screen.findByRole('button', {name: 'Ticked for the e-mail, untick'})).toHaveAttribute('aria-pressed', 'true');
        expect(BriefingApi.addNews).not.toHaveBeenCalled();
    });

    it('should show no button to a reader who cannot send e-mails', async () => {
        await renderTab(false);
        expect(screen.queryByRole('button', {name: 'Add to the e-mail'})).toBeNull();
        expect(screen.queryByText(/Card 2 of the briefing/)).toBeNull();
    });
});
