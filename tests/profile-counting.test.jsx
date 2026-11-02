//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: profile-counting.test.jsx
//  Description: The news on the interests of the sources the reader added are counted by the server in the
//               background: the profile page asks the list again until they are there, then stops
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

const PROFILE = {id: 7, name: 'Enzo', text: "Je suis l'arbitrage européen.", language: 'fr', discovery: {status: 'done'}};

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {
        list: vi.fn(async () => ({profiles: []})),
        getOptions: vi.fn(async () => ({languages: ['en', 'fr']})),
        get: vi.fn(async () => ({profile: PROFILE, profiles: [{id: 7, name: 'Enzo'}], interests: [], sources: []})),
        save: vi.fn(),
    },
}));
vi.mock('@/features/search/api/feedApi.js', () => ({FeedApi: {getUserFeeds: vi.fn()}}));
vi.mock('@/features/search/api/searchApi.js', () => ({SearchApi: {getCategories: vi.fn(async () => ({categories: []}))}}));
vi.mock('@/features/briefing/components/RecommendedSources.jsx', () => ({RecommendedSources: () => null}));
vi.mock('@/features/briefing/components/AddSources.jsx', () => ({AddSources: () => null}));
vi.mock('@/features/briefing/components/SourceList.jsx', () => ({
    SourceList: ({own, counting}) => <p data-testid="sources">{counting ? 'counting' : 'counted'}: {own.map(feed => `${feed.site} ${feed.relevant ?? '-'}`).join(', ')}</p>,
}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {FeedApi} = await import('@/features/search/api/feedApi.js');
const {ProfilePage} = await import('@/pages/Profile.jsx');

const feed = (more = {}) => ({id: 819, site: 'agenzianova.com', url: 'https://www.agenzianova.com/news/feed/', origin: 'user', ...more});
const renderPage = () => render(
    <MemoryRouter initialEntries={['/profile']}>
        <WithSession user={{id: 482, username: 'enzo', admin: true}}>
            <ProfilePage/>
        </WithSession>
    </MemoryRouter>
);

describe('ProfilePage, the sources added counted on the interests', () => {
    beforeEach(() => vi.useFakeTimers({shouldAdvanceTime: true}));
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should ask the sources again every 15 s while the server counts, then show the counts and stop asking', async () => {
        FeedApi.getUserFeeds
            .mockResolvedValueOnce({feeds: [feed()], relevance: {ready: false, days: 14}})
            .mockResolvedValue({feeds: [feed({news: 1064, relevant: 126})], relevance: {ready: true, days: 14}});
        renderPage();

        expect(await screen.findByText('counting: agenzianova.com -')).toBeInTheDocument();
        expect(FeedApi.getUserFeeds).toHaveBeenCalledTimes(1);

        await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
        expect(await screen.findByText('counted: agenzianova.com 126')).toBeInTheDocument();
        expect(FeedApi.getUserFeeds).toHaveBeenCalledTimes(2);

        await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
        expect(FeedApi.getUserFeeds).toHaveBeenCalledTimes(2);
    });

    it('should give up after 12 more tries when the count never comes', async () => {
        FeedApi.getUserFeeds.mockResolvedValue({feeds: [feed()], relevance: {ready: false, days: 14}});
        renderPage();
        await screen.findByText('counting: agenzianova.com -');

        await act(async () => { await vi.advanceTimersByTimeAsync(15000 * 20); });
        // the first ask and 12 more
        expect(FeedApi.getUserFeeds).toHaveBeenCalledTimes(13);
        expect(screen.getByTestId('sources')).toHaveTextContent('counted');
    });

    it('should ask once when the answer says nothing of the count', async () => {
        FeedApi.getUserFeeds.mockResolvedValue({feeds: [feed()]});
        renderPage();
        await screen.findByText('counted: agenzianova.com -');

        await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
        expect(FeedApi.getUserFeeds).toHaveBeenCalledTimes(1);
    });
});
