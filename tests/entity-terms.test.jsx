//
//  Author: Fabian Rostello
//  Date: 12.10.2026
//  File: entity-terms.test.jsx
//  Description: The names of an item of Wikidata the reader ticks added to the terms of the profile from
//               its page: its news then in the briefing. Ticked at first, the names that found news
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";

const NAMES = ['Union des associations européennes de football', 'UEFA', 'Europese voetbalbond'];
const entity = (inTerms, termsLeft = 18) => ({qid: 'Q35572', label: NAMES[0], description: 'organisation', kind: 'organisation',
    followed: false, names: NAMES, addedNames: [], removedNames: [], inTerms, termsLeft,
    nameCounts: {[NAMES[0]]: 2, UEFA: 152, 'Europese voetbalbond': 0}});
const page = (...args) => ({entity: entity(...args), hours: 48, count: 0, news: [], links: []});

vi.mock('@/features/entities/entityApi.js', () => ({EntityApi: {page: vi.fn(), toTerms: vi.fn()}}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {EntityApi} = await import('@/features/entities/entityApi.js');
const {toast} = await import('@/lib/toast.js');
const {EntityPage} = await import('@/pages/Entity.jsx');

const renderPage = () => render(
    <MemoryRouter initialEntries={['/following/Q35572']}>
        <WithSession user={{id: 482, username: 'enzo'}}>
            <Routes><Route path="/following/:qid" element={<EntityPage/>}/></Routes>
        </WithSession>
    </MemoryRouter>
);

describe('EntityPage, its names in the briefing', () => {
    afterEach(() => vi.clearAllMocks());

    it('should tick the names that found news, the most found first, and add the ones ticked', async () => {
        EntityApi.page.mockResolvedValue(page([]));
        EntityApi.toTerms.mockResolvedValue({terms: ['UEFA'], added: ['UEFA'], already: [], left: []});
        renderPage();

        const uefa = await screen.findByRole('checkbox', {name: /^UEFA/});
        expect(uefa).toBeChecked();
        expect(screen.getByRole('checkbox', {name: new RegExp(`^${NAMES[0]}`)})).toBeChecked();
        expect(screen.getByRole('checkbox', {name: /^Europese voetbalbond/, hidden: true})).not.toBeChecked();
        expect(screen.getByText('1 name with no news of the last 2 days')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', {name: new RegExp(`^${NAMES[0]}`)}));
        fireEvent.click(screen.getByRole('button', {name: 'Add this name to my briefing'}));

        await waitFor(() => expect(EntityApi.toTerms).toHaveBeenCalledWith('Q35572', ['UEFA']));
        expect(toast.success).toHaveBeenCalledWith('In your briefing from the next one: UEFA.');
        expect(await screen.findByText(/Terms already: UEFA\./)).toBeInTheDocument();
        expect(screen.getByText(/17 terms left/)).toBeInTheDocument();
    });

    it('should say when its names are all terms, or when the profile has no room left', async () => {
        EntityApi.page.mockResolvedValueOnce(page(NAMES));
        const {unmount} = renderPage();
        expect(await screen.findByText(/Its names are terms of your profile/)).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Your terms'})).toHaveAttribute('href', '/profile#terms');
        unmount();

        EntityApi.page.mockResolvedValueOnce(page([], 0));
        renderPage();
        expect(await screen.findByText(/Your profile follows 20 terms, the most/)).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /to my briefing/})).not.toBeInTheDocument();
    });

    it('should say which names found no room among the terms', async () => {
        EntityApi.page.mockResolvedValue(page([], 1));
        EntityApi.toTerms.mockResolvedValue({terms: Array.from({length: 20}, (_, i) => `t${i}`), added: ['UEFA'], already: [], left: [NAMES[0]]});
        renderPage();

        // one term left: only the name most found is ticked
        await screen.findByRole('checkbox', {name: /^UEFA/});
        fireEvent.click(screen.getByRole('checkbox', {name: new RegExp(`^${NAMES[0]}`)}));
        expect(screen.getByText('Only the first 1 ticked fit.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Add these 2 names to my briefing'}));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(`Not added, 20 terms at most: ${NAMES[0]}. Remove some on your profile.`));
    });
});
