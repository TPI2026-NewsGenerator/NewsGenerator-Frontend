//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: following.test.jsx
//  Description: The clubs, people and organisations followed: found in Wikidata and followed, and the
//               page of one, its news, the ones of its links, and the names it is found by
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({ProfileApi: {list: vi.fn(async () => ({profiles: []}))}}));
vi.mock('@/features/entities/entityApi.js', () => ({
    EntityApi: {
        list: vi.fn(async () => ({entities: []})),
        search: vi.fn(async () => ({items: [{qid: 'Q483020', label: 'Paris Saint-Germain FC', description: 'club de football français'}]})),
        follow: vi.fn(async () => ({entities: [{qid: 'Q483020', label: 'Paris Saint-Germain FC', kind: 'club', names: [], links: 38}]})),
        unfollow: vi.fn(async () => ({entities: []})),
        page: vi.fn(),
        setNames: vi.fn(async () => ({entity: {}})),
    },
}));

const {EntityApi} = await import('@/features/entities/entityApi.js');
const {FollowingPage} = await import('@/pages/Following.jsx');
const {EntityPage} = await import('@/pages/Entity.jsx');

const news = (id, title) => ({storyId: id, title, url: `https://m.example/${id}`, source: 'm.example', language: 'fr', publishedAt: '2026-10-08T10:00:00.000Z', media: 1});
const PAGE = {
    entity: {qid: 'Q483020', label: 'Paris Saint-Germain FC', description: 'club de football français', kind: 'club', followed: true,
        names: ['Paris Saint-Germain', 'PSG'], wikidataNames: ['Paris Saint-Germain', 'PSG', 'Paris'], addedNames: [], removedNames: ['Paris']},
    hours: 48, count: 2, news: [news(1, 'Le PSG gagne'), news(2, 'Paris Saint-Germain en Ligue 1')],
    links: [
        {qid: 'Q1', label: 'Ousmane Dembélé', kind: 'person', relation: 'player', count: 1, news: [news(3, 'Dembélé au repos')]},
        {qid: 'Q2', label: 'Luis Enrique', kind: 'person', relation: 'coach', count: 0, news: []},
    ],
};
const user = {id: 4, username: 'fab', admin: true};

describe('FollowingPage', () => {
    afterEach(() => vi.clearAllMocks());

    it('should find an item of Wikidata by its name, and follow it', async () => {
        render(<MemoryRouter><WithSession user={user}><FollowingPage/></WithSession></MemoryRouter>);
        expect(await screen.findByText('None yet: look one up above.')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('A club, a person, an organisation'), {target: {value: 'Paris Saint'}});
        fireEvent.click(await screen.findByRole('button', {name: 'Follow Paris Saint-Germain FC'}, {timeout: 3000}));
        expect(EntityApi.search).toHaveBeenCalledWith('Paris Saint');

        await waitFor(() => expect(EntityApi.follow).toHaveBeenCalledWith('Q483020'));
        expect(await screen.findByRole('button', {name: 'Stop following Paris Saint-Germain FC'})).toBeInTheDocument();
        expect(screen.getByText('38 links')).toBeInTheDocument();
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
