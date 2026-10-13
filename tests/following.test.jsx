//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: following.test.jsx
//  Description: What the profile follows, in one list: an item of Wikidata found and followed, a name
//               or a word followed as written, the names of the cards suggested, the news of an item in
//               the briefing or not; the page of an item, its news, the ones of its links and the names
//               it is found by; the page of a name as written; the names of a card opening their page
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({ProfileApi: {list: vi.fn(async () => ({profiles: []}))}}));
vi.mock('@/features/entities/entityApi.js', async (importOriginal) => ({
    ...await importOriginal(),
    EntityApi: {
        list: vi.fn(async () => ({entities: [], words: [], limits: {entities: 30, words: 20}})),
        search: vi.fn(async () => ({items: [{qid: 'Q483020', label: 'Paris Saint-Germain FC', description: 'club de football français'}]})),
        follow: vi.fn(async () => ({entities: [{qid: 'Q483020', label: 'Paris Saint-Germain FC', kind: 'club', names: [], links: 38, inBriefing: true}]})),
        unfollow: vi.fn(async () => ({entities: []})),
        setInBriefing: vi.fn(async (qid, on) => ({entity: {qid, inBriefing: on}})),
        addWord: vi.fn(async (word) => ({words: [word]})),
        removeWord: vi.fn(async () => ({words: []})),
        suggestions: vi.fn(async () => ({names: []})),
        namePage: vi.fn(),
        page: vi.fn(),
        setNames: vi.fn(async () => ({entity: {}})),
    },
}));

const {EntityApi} = await import('@/features/entities/entityApi.js');
const {FollowingPage} = await import('@/pages/Following.jsx');
const {EntityPage} = await import('@/pages/Entity.jsx');
const {NamePage} = await import('@/pages/Name.jsx');
const {BriefingCard} = await import('@/features/briefing/components/BriefingCard.jsx');

const news = (id, title) => ({storyId: id, title, url: `https://m.example/${id}`, source: 'm.example', language: 'fr', publishedAt: '2026-10-08T10:00:00.000Z', media: 1});
const PAGE = {
    entity: {qid: 'Q483020', label: 'Paris Saint-Germain FC', description: 'club de football français', kind: 'club', followed: true, inBriefing: true,
        names: ['Paris Saint-Germain', 'PSG'], wikidataNames: ['Paris Saint-Germain', 'PSG', 'Paris'], addedNames: [], removedNames: ['Paris']},
    hours: 48, count: 2, news: [news(1, 'Le PSG gagne'), news(2, 'Paris Saint-Germain en Ligue 1')],
    links: [
        {qid: 'Q1', label: 'Ousmane Dembélé', kind: 'person', relation: 'player', count: 1, news: [news(3, 'Dembélé au repos')]},
        {qid: 'Q2', label: 'Luis Enrique', kind: 'person', relation: 'coach', count: 0, news: []},
    ],
};
const user = {id: 4, username: 'fab', admin: true};
const renderFollowing = () => render(<MemoryRouter><WithSession user={user}><FollowingPage/></WithSession></MemoryRouter>);

describe('FollowingPage', () => {
    afterEach(() => vi.clearAllMocks());

    it('should find an item of Wikidata by its name, and follow it, its news in the briefing', async () => {
        renderFollowing();
        expect(await screen.findByText('Nothing yet: look one up above.')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('A club, a person, an organisation, a word'), {target: {value: 'Paris Saint'}});
        fireEvent.click(await screen.findByRole('button', {name: 'Follow Paris Saint-Germain FC'}, {timeout: 3000}));
        expect(EntityApi.search).toHaveBeenCalledWith('Paris Saint');

        await waitFor(() => expect(EntityApi.follow).toHaveBeenCalledWith('Q483020'));
        expect(await screen.findByRole('button', {name: 'Stop following Paris Saint-Germain FC'})).toBeInTheDocument();
        expect(screen.getByText('38 links')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: 'Its news in my briefing'})).toBeChecked();
    });

    it('should follow a word as written, and take its news out of the briefing for an item', async () => {
        EntityApi.list.mockResolvedValueOnce({entities: [{qid: 'Q483020', label: 'Paris Saint-Germain FC', kind: 'club', names: [], links: 0, inBriefing: true}],
            words: ['VAR'], limits: {entities: 30, words: 20}});
        renderFollowing();
        expect(await screen.findByRole('link', {name: '“VAR”'})).toHaveAttribute('href', '/following/name/VAR');

        fireEvent.click(screen.getByRole('checkbox', {name: 'Its news in my briefing'}));
        await waitFor(() => expect(EntityApi.setInBriefing).toHaveBeenCalledWith('Q483020', false));
        await waitFor(() => expect(screen.getByRole('checkbox', {name: 'Its news in my briefing'})).not.toBeChecked());

        fireEvent.change(screen.getByLabelText('A club, a person, an organisation, a word'), {target: {value: ' "LFF" '}});
        fireEvent.click(screen.getByRole('button', {name: 'Follow “LFF” as written'}));
        await waitFor(() => expect(EntityApi.addWord).toHaveBeenCalledWith('LFF'));
    });

    it('should suggest the names of the cards, followed as an item when linked to one, else as written', async () => {
        EntityApi.suggestions.mockResolvedValueOnce({names: [
            {name: 'Gianni Infantino', qid: 'Q124138', kind: 'person', cards: 3},
            {name: 'LFF', qid: null, kind: 'organization', cards: 2},
        ]});
        renderFollowing();
        expect(await screen.findByRole('link', {name: 'Gianni Infantino'})).toHaveAttribute('href', '/following/Q124138');
        expect(screen.getByText('on 3 cards')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Follow Gianni Infantino'}));
        await waitFor(() => expect(EntityApi.follow).toHaveBeenCalledWith('Q124138'));
        fireEvent.click(await screen.findByRole('button', {name: 'Follow LFF'}));
        await waitFor(() => expect(EntityApi.addWord).toHaveBeenCalledWith('LFF'));
        await waitFor(() => expect(screen.queryByRole('list', {name: 'Suggested'})).toBeNull());
    });
});

describe('EntityPage', () => {
    afterEach(() => vi.clearAllMocks());

    const renderPage = async () => {
        EntityApi.page.mockResolvedValue(PAGE);
        render(<MemoryRouter initialEntries={['/following/Q483020']}><WithSession user={user}>
            <Routes><Route path="/following/:qid" element={<EntityPage/>}/></Routes>
        </WithSession></MemoryRouter>);
        await screen.findByText('2 stories name it');
    };

    it('should show the news naming it, and the ones of the first link named', async () => {
        await renderPage();
        expect(EntityApi.page).toHaveBeenCalledWith('Q483020', 48);
        expect(screen.getByText('Le PSG gagne')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /Ousmane Dembélé/})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Dembélé au repos')).toBeInTheDocument();
        // a link no news named is not one to choose
        expect(screen.queryByRole('button', {name: /Luis Enrique/})).toBeNull();
        expect(screen.getByText('1 named by no news of the last 2 days')).toBeInTheDocument();
    });

    it('should put its news in the briefing or take them out', async () => {
        await renderPage();
        fireEvent.click(screen.getByRole('checkbox', {name: 'Its news in my briefing'}));
        await waitFor(() => expect(EntityApi.setInBriefing).toHaveBeenCalledWith('Q483020', false));
    });

    it('should take a name out, look for one again, and add one of the reader', async () => {
        await renderPage();
        fireEvent.click(screen.getByRole('button', {name: 'Do not look for “PSG”'}));
        await waitFor(() => expect(EntityApi.setNames).toHaveBeenCalledWith('Q483020', [], ['Paris', 'PSG']));

        fireEvent.click(screen.getByRole('button', {name: 'Look for “Paris” again'}));
        await waitFor(() => expect(EntityApi.setNames).toHaveBeenLastCalledWith('Q483020', [], []));

        fireEvent.change(screen.getByLabelText('Another name'), {target: {value: 'Les Parisiens'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add'}));
        await waitFor(() => expect(EntityApi.setNames).toHaveBeenLastCalledWith('Q483020', ['Les Parisiens'], ['Paris']));
    });
});

describe('NamePage', () => {
    afterEach(() => vi.clearAllMocks());

    const renderName = (path) => render(<MemoryRouter initialEntries={[path]}><WithSession user={user}>
        <Routes>
            <Route path="/following/name/:name" element={<NamePage/>}/>
            <Route path="/following/:qid" element={<p>Page of the item</p>}/>
        </Routes>
    </WithSession></MemoryRouter>);

    it('should show the news of a name as written, and follow it', async () => {
        EntityApi.namePage.mockResolvedValue({name: 'Vadims Ļašenko', qid: null, followed: false, wordsLeft: 19, hours: 48, count: 1,
            news: [news(4, 'Ļašenko says third place remains the target')]});
        renderName('/following/name/Vadims%20%C4%BBa%C5%A1enko');
        expect(await screen.findByText('1 story name it')).toBeInTheDocument();
        expect(EntityApi.namePage).toHaveBeenCalledWith('Vadims Ļašenko', 48);
        expect(screen.getByText('Ļašenko says third place remains the target')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Follow'}));
        await waitFor(() => expect(EntityApi.addWord).toHaveBeenCalledWith('Vadims Ļašenko'));
        expect(await screen.findByRole('button', {name: 'Stop following'})).toBeInTheDocument();
    });

    it('should open the page of the item the tagger linked the name to', async () => {
        EntityApi.namePage.mockResolvedValue({name: 'UEFA', qid: 'Q35572', followed: false, wordsLeft: 20, hours: 48, count: 0, news: []});
        renderName('/following/name/UEFA');
        expect(await screen.findByText('Page of the item')).toBeInTheDocument();
    });
});

describe('BriefingCard, who it is about', () => {
    it('should open the page of the item of a name, or of the name as written', () => {
        const item = {storyId: 1, title: 'La LFF soutient Infantino', summary: 'Riga.', articles: [],
            names: [{name: 'Gianni Infantino', qid: 'Q124138', kind: 'person'}, {name: 'LFF', qid: null, kind: 'organization'}]};
        render(<MemoryRouter><BriefingCard item={item}/></MemoryRouter>);
        expect(screen.getByRole('link', {name: 'Gianni Infantino'})).toHaveAttribute('href', '/following/Q124138');
        expect(screen.getByRole('link', {name: 'LFF'})).toHaveAttribute('href', '/following/name/LFF');
    });
});
