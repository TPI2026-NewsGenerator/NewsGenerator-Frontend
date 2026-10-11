//
//  Author: Fabian Rostello
//  Date: 12.10.2026
//  File: profile-account.test.jsx
//  Description: The account on the profile page: its username and its email shown, never its password,
//               and the way to the settings where the three are changed
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";

const PROFILE = {id: 7, name: 'Enzo', text: "Je suis l'arbitrage européen.", language: 'fr', discovery: {status: 'done'}};

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {
        list: vi.fn(async () => ({profiles: []})),
        getOptions: vi.fn(async () => ({languages: ['en', 'fr']})),
        get: vi.fn(async () => ({profile: PROFILE, profiles: [{id: 7, name: 'Enzo'}], interests: [], sources: []})),
    },
}));
vi.mock('@/features/search/api/feedApi.js', () => ({FeedApi: {getUserFeeds: vi.fn(async () => ({feeds: []}))}}));
vi.mock('@/features/search/api/searchApi.js', () => ({SearchApi: {getCategories: vi.fn(async () => ({categories: []}))}}));
vi.mock('@/features/briefing/components/RecommendedSources.jsx', () => ({RecommendedSources: () => null}));
vi.mock('@/features/briefing/components/AddSources.jsx', () => ({AddSources: () => null}));
vi.mock('@/features/briefing/components/SourceList.jsx', () => ({SourceList: () => null}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {ProfilePage} = await import('@/pages/Profile.jsx');

describe('ProfilePage, the account', () => {
    it('should show the username and the email, and lead to the settings to change them', async () => {
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <WithSession user={{id: 482, username: 'enzo', email: 'enzo@example.org', admin: false}}>
                    <Routes>
                        <Route path="/profile" element={<ProfilePage/>}/>
                        <Route path="/settings" element={<p>The settings</p>}/>
                    </Routes>
                </WithSession>
            </MemoryRouter>
        );

        expect(await screen.findByRole('heading', {name: 'Username, email and password'})).toBeInTheDocument();
        expect(screen.getByText('enzo@example.org')).toBeInTheDocument();
        expect(screen.getByText('hidden')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Change them'}));
        expect(await screen.findByText('The settings')).toBeInTheDocument();
    });
});
