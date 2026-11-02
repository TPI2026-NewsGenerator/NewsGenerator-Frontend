//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: profile-sections.test.jsx
//  Description: The sections of the profile page: its account is in the settings and the names followed on their
//               own page, neither is on the profile
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

const PROFILE = {id: 7, name: 'Enzo', text: "Je suis l'arbitrage européen.", language: 'fr', watchTerms: ['Pierluigi Collina'], discovery: {status: 'done'}};
const INTERESTS = [{id: 1, text: "L'arbitrage européen", weight: 1, keywords: 'arbitrage'}];

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {
        list: vi.fn(async () => ({profiles: []})),
        getOptions: vi.fn(async () => ({languages: ['en', 'fr']})),
        get: vi.fn(async () => ({profile: PROFILE, profiles: [{id: 7, name: 'Enzo'}], interests: INTERESTS, sources: []})),
    },
}));
vi.mock('@/features/search/api/feedApi.js', () => ({FeedApi: {getUserFeeds: vi.fn(async () => ({feeds: []}))}}));
vi.mock('@/features/search/api/searchApi.js', () => ({SearchApi: {getCategories: vi.fn(async () => ({categories: []}))}}));
vi.mock('@/features/briefing/components/RecommendedSources.jsx', () => ({RecommendedSources: () => null}));
vi.mock('@/features/briefing/components/AddSources.jsx', () => ({AddSources: () => null}));
vi.mock('@/features/briefing/components/SourceList.jsx', () => ({SourceList: () => null}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {ProfilePage} = await import('@/pages/Profile.jsx');

describe('ProfilePage, its sections', () => {
    it('should not show the account nor the names followed: they have their own pages', async () => {
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <WithSession user={{id: 482, username: 'enzo', email: 'enzo@example.org', admin: false}}>
                    <ProfilePage/>
                </WithSession>
            </MemoryRouter>
        );

        expect(await screen.findByRole('heading', {name: 'Enzo'})).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Username, email and password'})).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'What you follow'})).not.toBeInTheDocument();
        expect(screen.queryByText('enzo@example.org')).not.toBeInTheDocument();
        expect(screen.queryByText(/Pierluigi Collina/)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', {name: /Follow a club, a person/})).not.toBeInTheDocument();
    });

    it('should lead to the sections it has, six at most, with no Account and no Following', async () => {
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <WithSession user={{id: 482, username: 'enzo', email: 'enzo@example.org', admin: false}}>
                    <ProfilePage/>
                </WithSession>
            </MemoryRouter>
        );

        const bar = await screen.findByRole('navigation', {name: 'The sections of your profile'});
        const labels = within(bar).getAllByRole('link').map(link => link.textContent);
        expect(labels).toEqual(['This profile', 'Your words', 'Interests', 'Projects', 'Sources', 'Add sources']);
    });
});
