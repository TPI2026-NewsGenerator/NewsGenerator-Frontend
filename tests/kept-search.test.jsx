//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: kept-search.test.jsx
//  Description: The last search kept a day in the browser: shown again when the reader comes back,
//               said to be the one kept, never to another reader
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";
import {forgetSearch, keepSearch, keptSearch, KEEP_MS} from '@/features/search/keptSearch.js';

vi.mock('@/features/search/api/searchApi.js', () => ({
    SearchApi: {
        getCategories: vi.fn(async () => ({categories: ['sport']})),
        getNews: vi.fn(),
    },
}));
vi.mock('@/features/search/api/feedApi.js', () => ({FeedApi: {}}));
vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {get: vi.fn(async () => ({profile: {language: 'en'}}))},
}));
vi.mock('@/features/custom-search/api/customSearchApi.js', () => ({
    CustomSearchApi: {getUserCustomSearch: vi.fn(async () => []), postUserCustomSearch: vi.fn(), deleteUserCustomSearch: vi.fn()},
}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {SearchApi} = await import('@/features/search/api/searchApi.js');
const {SearchPage} = await import('@/pages/Search.jsx');

const READER = {id: 4, username: 'reader'};
const news = (title) => ({
    url: `https://example.com/${encodeURIComponent(title)}`, source: 'example.com', title, description: '',
    publishedAt: '2026-10-02T10:00:00.000Z', thumbnail: null, topic: null, hedged: null, sources: [],
    corroboration: {media: 1, wordings: 1},
});
const FORM = {id: null, title: '', keyword: 'referee decisions', category: ['sport'], timeframe: 'd', language: 'en'};
const kept = (changes = {}) => ({
    form: FORM, range: null, at: Date.now(), news: [news('The referee explains his decision')],
    search: {category: ['sport'], keywords: ['referee decisions'], language: 'en', timeframe: {}},
    wider: null, mode: {mode: 'meaning', checked: true, web: false}, summaries: [], translations: [],
    ...changes,
});

const renderPage = () => render(<MemoryRouter><WithSession user={READER}><SearchPage/></WithSession></MemoryRouter>);

describe('keptSearch', () => {
    afterEach(() => forgetSearch());

    it('should give the search back to its reader for a day, never to another one', () => {
        keepSearch(4, kept());
        expect(keptSearch(4)?.form.keyword).toBe('referee decisions');
        expect(keptSearch(5)).toBeNull();
        expect(keptSearch(4, Date.now() + KEEP_MS + 1000)).toBeNull();
        // older than a day, it is gone
        expect(keptSearch(4)).toBeNull();
    });

    it('should forget it at the sign out', () => {
        keepSearch(4, kept());
        forgetSearch();
        expect(keptSearch(4)).toBeNull();
    });
});

describe('SearchPage and the search kept', () => {
    afterEach(() => {
        forgetSearch();
        vi.clearAllMocks();
    });

    it('should show again the search kept, its form and its news, said to be the one kept', async () => {
        keepSearch(4, kept());
        renderPage();

        expect(await screen.findByText('The referee explains his decision')).toBeInTheDocument();
        expect(screen.getByLabelText('What are you looking for?')).toHaveValue('referee decisions');
        expect(screen.getByText(/kept for a day: the news published since are not in it/)).toBeInTheDocument();
    });

    it('should keep a search just made, and say no more it is an old one', async () => {
        keepSearch(4, kept());
        SearchApi.getNews.mockResolvedValue({news: [news('A new decision of the referees')], mode: 'meaning'});
        renderPage();

        fireEvent.click(await screen.findByRole('button', {name: 'Search again'}));
        expect(await screen.findByText('A new decision of the referees')).toBeInTheDocument();
        expect(screen.queryByText(/kept for a day/)).not.toBeInTheDocument();
        await waitFor(() => expect(keptSearch(4)?.news.map(item => item.title)).toEqual(['A new decision of the referees']));
    });

    it('should not show again a search that found nothing', async () => {
        keepSearch(4, kept());
        SearchApi.getNews.mockResolvedValue({news: []});
        renderPage();

        fireEvent.click(await screen.findByRole('button', {name: 'Search again'}));
        await waitFor(() => expect(keptSearch(4)).toBeNull());
    });
});
