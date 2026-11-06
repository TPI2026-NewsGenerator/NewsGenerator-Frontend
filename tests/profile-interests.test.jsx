//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: profile-interests.test.jsx
//  Description: The interests of the profile as the AI read them, folded at first (the user, 06.11.2026): the reader opens them to correct
//               one, to make it main or secondary, or to remove it; the keywords that find their sources are the server's, not shown
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/components/RecommendedSources.jsx', () => ({RecommendedSources: () => null}));
vi.mock('@/features/briefing/components/AddSources.jsx', () => ({AddSources: () => null}));
vi.mock('@/features/briefing/components/SourceList.jsx', () => ({SourceList: () => null}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const PROFILE = {id: 7, name: 'Enzo', text: "Je suis l'arbitrage européen.", language: 'fr', watchTerms: [], discovery: {status: 'done'}};
const INTERESTS = [
    {id: 1, text: "Gouvernance du football : l'UEFA et ses 55 associations", weight: 1, keywords: 'UEFA governance, FIFA elections'},
    {id: 2, text: "Arbitrage : l'évolution du VAR", weight: 0.85, keywords: 'football refereeing, VAR technology'},
];

// what the server answers to a change of an interest: the profile again
const ANSWER = {profile: PROFILE, profiles: [{id: 7, name: 'Enzo'}], interests: INTERESTS, sources: []};

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {
        list: vi.fn(async () => ({profiles: []})),
        getOptions: vi.fn(async () => ({languages: ['en', 'fr']})),
        get: vi.fn(),
        updateInterest: vi.fn(async () => ANSWER),
        deleteInterest: vi.fn(async () => ANSWER),
    },
}));
vi.mock('@/features/search/api/feedApi.js', () => ({FeedApi: {getUserFeeds: vi.fn(async () => ({feeds: []}))}}));
vi.mock('@/features/search/api/searchApi.js', () => ({SearchApi: {getCategories: vi.fn(async () => ({categories: []}))}}));

const {ProfileApi} = await import('@/features/briefing/api/briefingApi.js');
const {ProfilePage} = await import('@/pages/Profile.jsx');

const open = async () => {
    ProfileApi.get.mockResolvedValue(ANSWER);
    render(
        <MemoryRouter initialEntries={['/profile']}>
            <WithSession user={{id: 482, username: 'enzo', email: 'enzo@example.org', admin: false}}>
                <ProfilePage/>
            </WithSession>
        </MemoryRouter>
    );
    await screen.findByRole('heading', {name: 'Your interests'});
};
const section = () => screen.getByRole('heading', {name: 'Your interests'}).closest('section');

beforeEach(() => { window.location.hash = ''; });
afterEach(() => vi.clearAllMocks());

describe('ProfilePage, its interests', () => {
    it('should fold them at first, saying how many there are and how many weigh less', async () => {
        await open();
        expect(within(section()).getByText(/2 interests · 1 secondary/)).toBeInTheDocument();
        expect(within(section()).queryByRole('textbox')).toBeNull();
        expect(within(section()).queryByRole('button', {name: 'Make it secondary'})).toBeNull();
        expect(within(section()).getByRole('button', {name: 'Show and correct the interests'})).toHaveAttribute('aria-expanded', 'false');
    });

    it('should open them with their text, main or secondary and remove, and fold them again', async () => {
        await open();
        fireEvent.click(within(section()).getByRole('button', {name: 'Show and correct the interests'}));
        expect(within(section()).getAllByRole('textbox')).toHaveLength(2);
        expect(within(section()).getByRole('button', {name: 'Make it secondary'})).toBeInTheDocument();
        expect(within(section()).getByRole('button', {name: 'Make it main'})).toBeInTheDocument();
        expect(within(section()).getAllByRole('button', {name: 'Remove'})).toHaveLength(2);

        fireEvent.click(within(section()).getByRole('button', {name: 'Hide the interests'}));
        expect(within(section()).queryByRole('textbox')).toBeNull();
    });

    it('should not show the keywords that find the sources: they are the server\'s', async () => {
        await open();
        fireEvent.click(within(section()).getByRole('button', {name: 'Show and correct the interests'}));
        expect(screen.queryByText(/Keywords used to find/)).toBeNull();
        expect(screen.queryByText(/UEFA governance/)).toBeNull();
    });

    it('should still weigh an interest, and remove one, once they are open', async () => {
        await open();
        fireEvent.click(within(section()).getByRole('button', {name: 'Show and correct the interests'}));
        fireEvent.click(within(section()).getByRole('button', {name: 'Make it secondary'}));
        await waitFor(() => expect(ProfileApi.updateInterest).toHaveBeenCalledWith(1, {weight: 0.85}));
        fireEvent.click(within(section()).getAllByRole('button', {name: 'Remove'})[1]);
        await waitFor(() => expect(ProfileApi.deleteInterest).toHaveBeenCalledWith(2));
    });

    it('should be open when the page is reached by its link, #interests', async () => {
        window.location.hash = '#interests';
        await open();
        expect(within(section()).getAllByRole('textbox')).toHaveLength(2);
    });
});
