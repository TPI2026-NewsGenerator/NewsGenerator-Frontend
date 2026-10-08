//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: briefing-email.test.jsx
//  Description: The cards ticked in the briefing sent by the server to the address of the account, the
//               boxes shown only when the server has an e-mail account
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {getLatest: vi.fn(), start: vi.fn(), vote: vi.fn(), email: vi.fn(async () => {})},
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');

const card = (storyId, title) => ({
    storyId, title, summary: `The first passage of ${title}.`, articles: [],
    lead: {source: `media${storyId}.fr`, url: `https://media${storyId}.fr/story`},
    corroboration: {media: 1, read: 1, independent: 1, agencies: []},
});
const BRIEFING = {
    id: 9, status: 'ready', hours: 24, createdAt: '2026-10-08T06:00:00.000Z', finishedAt: '2026-10-08T06:01:00.000Z',
    items: [card(1, 'First story'), card(2, 'Second story'), card(3, 'Third story')],
};
const BOX = {name: 'Add to the e-mail'};

const renderPage = async (mail = true) => {
    BriefingApi.getLatest.mockResolvedValue({briefing: BRIEFING, mail});
    render(<MemoryRouter><WithSession user={{id: 4, username: 'reader'}}><BriefingPage/></WithSession></MemoryRouter>);
    await screen.findByText('First story');
};

describe('BriefingPage e-mail of the cards ticked', () => {
    afterEach(() => vi.clearAllMocks());

    it('should send the cards ticked to the address of the account, then untick them', async () => {
        await renderPage();
        expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull();

        const boxes = screen.getAllByRole('checkbox', BOX);
        fireEvent.click(boxes[2]);
        fireEvent.click(boxes[0]);
        expect(screen.getByText(/2 stories ticked/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [3, 1]));
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull());
        screen.getAllByRole('checkbox', BOX).forEach(box => expect(box).not.toBeChecked());
    });

    it('should keep the cards ticked when the server could not send them', async () => {
        BriefingApi.email.mockRejectedValueOnce(new Error('The e-mail could not be sent, try again later.'));
        await renderPage();

        fireEvent.click(screen.getAllByRole('checkbox', BOX)[1]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [2]));
        expect(screen.getByText(/1 story ticked/)).toBeInTheDocument();
    });

    it('should tick them all, and untick them all', async () => {
        await renderPage();

        fireEvent.click(screen.getByRole('button', {name: 'tick them all'}));
        expect(screen.getByText(/3 stories ticked/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Untick all'}));
        expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull();
    });

    it('should show no box when the server has no e-mail account', async () => {
        await renderPage(false);
        expect(screen.queryAllByRole('checkbox', BOX)).toHaveLength(0);
        expect(screen.queryByRole('button', {name: 'tick them all'})).toBeNull();
    });
});
