//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: briefing-tabs.test.jsx
//  Description: The briefing and the news of the names and terms followed, a tab each, the briefing
//               first; the tab chosen kept in the address (#terms). The news of the terms are searched
//               when their tab is opened, not read in the briefing, as many as the reader wants for each
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, useLocation} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {getLatest: vi.fn(), start: vi.fn(), vote: vi.fn(), email: vi.fn(), following: vi.fn()},
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
}));

const entities = vi.hoisted(() => ({list: vi.fn()}));
vi.mock('@/features/entities/entityApi.js', () => ({EntityApi: entities}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');
const {keptWatchLimit} = await import('@/features/briefing/windows.js');

const card = (storyId, title, changes = {}) => ({
    storyId, title, summary: `The first passage of ${title}.`, articles: [],
    lead: {source: `media${storyId}.fr`, url: `https://media${storyId}.fr/story`},
    corroboration: {media: 1, read: 1, independent: 1, agencies: []}, ...changes,
});
const groups = [
    {term: 'VAR', count: 2, hours: 720, limit: 100, news: [{title: 'A VAR news', url: 'https://x/1', source: 'x.fr'}, {title: 'Another VAR news', url: 'https://x/2', source: 'x.fr'}]},
    {term: 'Dario Amodei', count: 1, hours: 720, limit: 100, news: [{title: 'Dario Amodei speaks', url: 'https://y/1', source: 'y.com'}]},
];
const briefingWith = (changes = {}) => ({
    id: 9, status: 'ready', hours: 24, createdAt: '2026-10-08T06:00:00.000Z', finishedAt: '2026-10-08T06:01:00.000Z',
    items: [card(1, 'First story'), card(2, 'The VAR story', {found: [{term: 'VAR', angle: false}], marks: {title: [[4, 7]]}})],
    ...changes,
});
// the profile follows an item in its briefing and a word
const follows = () => entities.list.mockResolvedValue({entities: [{qid: 'Q1', inBriefing: true}], words: ['VAR']});

let shownAt = null;
const Address = () => {
    shownAt = useLocation();
    return null;
};
// the page loaded, on the tab the address opens: the briefing shows its first story, the tab of the
// terms its first news (waiting for the story there took the whole time of the test)
const renderPage = async (briefing = briefingWith(), entry = '/briefing') => {
    BriefingApi.getLatest.mockResolvedValue({briefing, mail: true});
    render(<MemoryRouter initialEntries={[entry]}><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/><Address/></WithSession></MemoryRouter>);
    await screen.findByText(entry.endsWith('#terms') ? 'A VAR news' : 'First story');
};
const followingTab = () => screen.findByRole('tab', {name: /^Following/});

describe('BriefingPage tabs', () => {
    afterEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should open on the briefing, and search the news of the terms when their tab is opened, kept in the address', async () => {
        follows();
        BriefingApi.following.mockResolvedValue({limit: 100, groups});
        await renderPage();
        expect(screen.getByRole('tab', {name: 'Briefing'})).toHaveAttribute('aria-selected', 'true');
        const tab = await followingTab();
        // not part of the briefing: nothing is asked until the tab is opened
        expect(BriefingApi.following).not.toHaveBeenCalled();
        expect(screen.queryByText('A VAR news')).toBeNull();

        fireEvent.mouseDown(tab);
        expect(await screen.findByText('A VAR news')).toBeInTheDocument();
        expect(BriefingApi.following).toHaveBeenCalledWith(100);
        expect(screen.getByRole('tab', {name: 'Following 3'})).toBeInTheDocument();
        expect(screen.queryByText('First story')).toBeNull();
        expect(shownAt.hash).toBe('#terms');
    });

    it('should open on the tab of the terms from the address', async () => {
        follows();
        BriefingApi.following.mockResolvedValue({limit: 100, groups});
        await renderPage(briefingWith(), '/briefing#terms');
        expect(await screen.findByText('A VAR news')).toBeInTheDocument();
        expect(await screen.findByRole('tab', {name: 'Following 3'})).toHaveAttribute('aria-selected', 'true');
    });

    it('should give the news of the terms to a profile with a briefing still to write, or none yet', async () => {
        follows();
        BriefingApi.following.mockResolvedValue({limit: 100, groups});
        BriefingApi.getLatest.mockResolvedValue({briefing: null, mail: true});
        render(<MemoryRouter initialEntries={['/briefing#terms']}><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        expect(await screen.findByText('A VAR news')).toBeInTheDocument();
    });

    it('should send from the tab of the terms to the stories of the briefing naming them, alone and marked', async () => {
        follows();
        BriefingApi.following.mockResolvedValue({limit: 100, groups});
        await renderPage(briefingWith(), '/briefing#terms');
        fireEvent.click(await screen.findByRole('button', {name: '1 story of your briefing names them'}));

        expect(screen.getByRole('tab', {name: 'Briefing'})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', {name: 'The VAR story'})).toBeInTheDocument();
        expect(screen.queryByText('First story')).toBeNull();
        expect(document.querySelectorAll('mark')).toHaveLength(1);
        expect(shownAt.hash).toBe('');
    });

    it('should keep the bar of the e-mail to the tab of the briefing', async () => {
        follows();
        BriefingApi.following.mockResolvedValue({limit: 100, groups});
        await renderPage();
        fireEvent.click(screen.getAllByRole('checkbox', {name: 'Add to the e-mail'})[0]);
        expect(screen.getByRole('button', {name: 'Send email'})).toBeInTheDocument();

        fireEvent.mouseDown(await followingTab());
        expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull();
    });

    it('should ask the number of news wanted for each name again when the bar is moved, and keep it for the next visit', async () => {
        follows();
        BriefingApi.following.mockResolvedValue({limit: 100, groups});
        await renderPage(briefingWith(), '/briefing#terms');
        const wanted = await screen.findByRole('slider', {name: 'News wanted for each name you follow'});
        expect(wanted).toHaveAttribute('aria-valuenow', '100');
        expect(wanted).toHaveAttribute('aria-valuemin', '10');
        expect(wanted).toHaveAttribute('aria-valuemax', '100');

        BriefingApi.following.mockResolvedValue({limit: 90, groups: groups.slice(0, 1)});
        fireEvent.keyDown(wanted, {key: 'ArrowLeft'});
        await waitFor(() => expect(BriefingApi.following).toHaveBeenLastCalledWith(90));
        expect(await screen.findByRole('tab', {name: 'Following 2'})).toBeInTheDocument();
        expect(keptWatchLimit()).toBe(90);
    });

    it('should ask the number the reader chose the last time', async () => {
        localStorage.setItem('newsgenerator.following-news', '40');
        follows();
        BriefingApi.following.mockResolvedValue({limit: 40, groups});
        await renderPage(briefingWith(), '/briefing#terms');
        expect(BriefingApi.following).toHaveBeenCalledWith(40);
        expect(await screen.findByRole('slider', {name: 'News wanted for each name you follow'})).toHaveAttribute('aria-valuenow', '40');
    });

    it('should say the days each tab went back, and the news listed reach when more name the term than are listed', async () => {
        follows();
        const many = [
            {term: 'UEFA', qid: 'Q35572', count: 137, hours: 48, limit: 20, news: [
                {title: 'UEFA fines a club', url: 'https://x/1', source: 'x.fr', publishedAt: '2026-10-31T12:00:00.000Z'},
                {title: 'UEFA opens a case', url: 'https://x/2', source: 'x.fr', publishedAt: '2026-10-28T12:00:00.000Z'},
            ]},
            {term: 'Roberto Rosetti', qid: 'Q296229', count: 2, hours: 720, limit: 20, news: [{title: 'Rosetti speaks', url: 'https://y/1', source: 'y.com'}]},
        ];
        BriefingApi.following.mockResolvedValue({limit: 20, groups: many});
        await renderPage();
        fireEvent.mouseDown(await followingTab());
        expect(await screen.findByText('UEFA fines a club')).toBeInTheDocument();
        expect(screen.getByText(/137 stories name UEFA in the last 2 days\./)).toBeInTheDocument();
        expect(screen.getByText(/The 2 newest are listed, back to 28 Oct\./)).toBeInTheDocument();
        fireEvent.mouseDown(screen.getByRole('tab', {name: /Roberto Rosetti/}));
        expect(screen.getByText(/2 stories name Roberto Rosetti in the last 30 days\./)).toBeInTheDocument();
    });

    it('should say the days in the heading of a single term, which has no tab', async () => {
        follows();
        BriefingApi.following.mockResolvedValue({limit: 100, groups: [{...groups[0], count: 137, hours: 24}]});
        await renderPage(briefingWith(), '/briefing#terms');
        expect(await screen.findByText('137 stories in 24 hours')).toBeInTheDocument();
    });

    it('should say when the news could not be searched, and search again when the tab is opened again', async () => {
        follows();
        BriefingApi.following.mockRejectedValueOnce(new Error('Too many searches')).mockResolvedValue({limit: 100, groups});
        await renderPage();
        fireEvent.mouseDown(await followingTab());
        expect(await screen.findByText(/could not be searched: Too many searches/)).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByRole('tab', {name: 'Briefing'}));
        fireEvent.mouseDown(screen.getByRole('tab', {name: /^Following/}));
        expect(await screen.findByText('A VAR news')).toBeInTheDocument();
        expect(BriefingApi.following).toHaveBeenCalledTimes(2);
    });

    it('should have no tab when the profile follows nothing, and search nothing', async () => {
        entities.list.mockResolvedValue({entities: [{qid: 'Q1', inBriefing: false}], words: []});
        await renderPage();
        expect(screen.queryByRole('tab')).toBeNull();
        expect(screen.getByText('First story')).toBeInTheDocument();
        expect(BriefingApi.following).not.toHaveBeenCalled();
    });
});
