//
//  Author: Fabian Rostello
//  Date: 09.10.2026
//  File: profile-language.test.jsx
//  Description: The language of a profile, under its name: changed on its own, the profile saved again
//               with its saved text, whatever is being written below
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

const PROFILE = {id: 7, name: 'Enzo', text: "Je suis l'arbitrage européen.", language: 'fr', discovery: {status: 'done'}};
const answer = (profile = PROFILE) => ({profile, profiles: [{id: 7, name: 'Enzo'}], interests: [], sources: []});

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {
        list: vi.fn(async () => ({profiles: []})),
        getOptions: vi.fn(async () => ({languages: ['en', 'fr', 'de']})),
        get: vi.fn(),
        save: vi.fn(),
    },
}));
vi.mock('@/features/search/api/feedApi.js', () => ({FeedApi: {getUserFeeds: vi.fn(async () => ({feeds: []}))}}));
vi.mock('@/features/search/api/searchApi.js', () => ({SearchApi: {getCategories: vi.fn(async () => ({categories: []}))}}));
vi.mock('@/features/briefing/components/RecommendedSources.jsx', () => ({RecommendedSources: () => null}));
vi.mock('@/features/briefing/components/AddSources.jsx', () => ({AddSources: () => null}));
vi.mock('@/features/briefing/components/SourceList.jsx', () => ({SourceList: () => null}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {ProfileApi} = await import('@/features/briefing/api/briefingApi.js');
const {ProfilePage} = await import('@/pages/Profile.jsx');

const renderPage = () => render(
    <MemoryRouter initialEntries={['/profile']}>
        <WithSession user={{id: 482, username: 'enzo', admin: true}}>
            <ProfilePage/>
        </WithSession>
    </MemoryRouter>
);

describe('ProfilePage, its language', () => {
    afterEach(() => vi.clearAllMocks());

    it('should save the profile again in the language chosen, with its saved text', async () => {
        ProfileApi.get.mockResolvedValue(answer());
        ProfileApi.save.mockResolvedValue(answer({...PROFILE, language: 'en'}));
        renderPage();

        const select = await screen.findByLabelText('Its language');
        await screen.findByRole('option', {name: 'English'});
        expect(select).toHaveValue('fr');
        const change = screen.getByRole('button', {name: 'Change'});
        expect(change).toBeDisabled();

        // a text being written below is not saved with it
        fireEvent.change(screen.getByLabelText('What do you want to read?'), {target: {value: 'Un texte pas encore enregistré.'}});
        fireEvent.change(select, {target: {value: 'en'}});
        fireEvent.click(change);

        await waitFor(() => expect(ProfileApi.save).toHaveBeenCalledWith({text: PROFILE.text, language: 'en'}));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Change'})).toBeDisabled());
        expect(screen.getByLabelText('What do you want to read?')).toHaveValue('Un texte pas encore enregistré.');
        expect(screen.queryByLabelText('Your language')).not.toBeInTheDocument();
    });
});
