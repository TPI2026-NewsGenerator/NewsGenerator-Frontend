//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: briefing-tabs.test.jsx
//  Description: The briefing and the news of the names and terms followed, a tab each, the briefing
//               first; the tab chosen kept in the address (#terms)
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, useLocation} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {getLatest: vi.fn(), start: vi.fn(), vote: vi.fn(), email: vi.fn()},
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
}));

vi.mock('@/features/entities/entityApi.js', () => ({
    EntityApi: {list: vi.fn(async () => ({entities: [], words: []}))},
}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');

const card = (storyId, title, changes = {}) => ({
    storyId, title, summary: `The first passage of ${title}.`, articles: [],
    lead: {source: `media${storyId}.fr`, url: `https://media${storyId}.fr/story`},
    corroboration: {media: 1, read: 1, independent: 1, agencies: []}, ...changes,
});
const watched = [
    {term: 'VAR', count: 2, news: [{title: 'A VAR news', url: 'https://x/1', source: 'x.fr'}, {title: 'Another VAR news', url: 'https://x/2', source: 'x.fr'}]},
    {term: 'Dario Amodei', count: 1, news: [{title: 'Dario Amodei speaks', url: 'https://y/1', source: 'y.com'}]},
];
const briefingWith = (changes = {}) => ({
    id: 9, status: 'ready', hours: 24, createdAt: '2026-10-08T06:00:00.000Z', finishedAt: '2026-10-08T06:01:00.000Z',
    items: [card(1, 'First story'), card(2, 'The VAR story', {found: [{term: 'VAR', angle: false}], marks: {title: [[4, 7]]}})],
    watched, ...changes,
});

let shownAt = null;
const Address = () => {
    shownAt = useLocation();
    return null;
};
// the page loaded, on the tab the address opens: the briefing shows its first story, the tab of the
// terms its first news (waiting for the story there took the whole time of the test)
const renderPage = async (briefing, entry = '/briefing') => {
    BriefingApi.getLatest.mockResolvedValue({briefing, mail: true});
    render(<MemoryRouter initialEntries={[entry]}><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/><Address/></WithSession></MemoryRouter>);
    await screen.findByText(entry.endsWith('#terms') ? 'A VAR news' : 'First story');
};

describe('BriefingPage tabs', () => {
    afterEach(() => vi.clearAllMocks());

    it('should open on the briefing, and show the news of the terms in their own tab, kept in the address', async () => {
        await renderPage(briefingWith());
        expect(screen.getByRole('tab', {name: 'Briefing'})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', {name: 'Following 3'})).toBeInTheDocument();
        expect(screen.queryByText('A VAR news')).toBeNull();

        fireEvent.mouseDown(screen.getByRole('tab', {name: 'Following 3'}));
        expect(screen.getByText('A VAR news')).toBeInTheDocument();
        expect(screen.queryByText('First story')).toBeNull();
        expect(shownAt.hash).toBe('#terms');
    });

    it('should open on the tab of the terms from the address', async () => {
        await renderPage(briefingWith(), '/briefing#terms');
        expect(await screen.findByText('A VAR news')).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: 'Following 3'})).toHaveAttribute('aria-selected', 'true');
    });

    it('should send from the tab of the terms to the stories of the briefing naming them, alone and marked', async () => {
        await renderPage(briefingWith(), '/briefing#terms');
        fireEvent.click(await screen.findByRole('button', {name: '1 story of your briefing names them'}));

        expect(screen.getByRole('tab', {name: 'Briefing'})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', {name: 'The VAR story'})).toBeInTheDocument();
        expect(screen.queryByText('First story')).toBeNull();
        expect(document.querySelectorAll('mark')).toHaveLength(1);
        expect(shownAt.hash).toBe('');
    });

    it('should keep the bar of the e-mail to the tab of the briefing', async () => {
        await renderPage(briefingWith());
        fireEvent.click(screen.getAllByRole('checkbox', {name: 'Add to the e-mail'})[0]);
        expect(screen.getByRole('button', {name: 'Send email'})).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByRole('tab', {name: 'Following 3'}));
        expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull();
    });

    it('should say the news wanted for each term and that the search goes back up to a month, for a new briefing', async () => {
        await renderPage(briefingWith({watched: watched.map(group => ({...group, hours: 720, limit: 50}))}), '/briefing#terms');
        expect(screen.getByText(/up to 50 for each, going back as far as 30 days to find them/)).toBeInTheDocument();
        // and for each tab the days the search went back
        expect(screen.getByText(/2 stories name “VAR” in the last 30 days\./)).toBeInTheDocument();
    });

    it('should say the window of the briefing for the news of the terms of a briefing written before the month', async () => {
        await renderPage(briefingWith(), '/briefing#terms');
        expect(screen.getByText(/of your sources of the last 24 hours that names one/)).toBeInTheDocument();
    });

    it('should tell how far back the news listed reach when more name the term than are listed', async () => {
        const capped = [{term: 'UEFA', qid: 'Q35572', count: 4907, hours: 24, limit: 100, news: [
            {title: 'UEFA fines a club', url: 'https://x/1', source: 'x.fr', publishedAt: '2026-10-31T12:00:00.000Z'},
            {title: 'UEFA opens a case', url: 'https://x/2', source: 'x.fr', publishedAt: '2026-10-28T12:00:00.000Z'},
        ]}];
        await renderPage(briefingWith({watched: capped}));
        fireEvent.mouseDown(screen.getByRole('tab', {name: 'Following 4907'}));
        expect(screen.getByText('UEFA fines a club')).toBeInTheDocument();
        expect(screen.getByText(/The 2 newest are listed, back to 28 Oct\./)).toBeInTheDocument();
        // a single term has no tab: the days are told in its heading
        expect(screen.getByText('4907 stories in 24 hours')).toBeInTheDocument();
    });

    it('should have no tab when the profile follows no term', async () => {
        await renderPage(briefingWith({watched: []}));
        expect(screen.queryByRole('tab')).toBeNull();
        expect(screen.getByText('First story')).toBeInTheDocument();
    });
});
