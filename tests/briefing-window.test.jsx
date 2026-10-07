//
//  Author: Fabian Rostello
//  Date: 03.10.2026
//  File: briefing-window.test.jsx
//  Description: The news a briefing is written from: the last 24 hours, 2 days or 7 days, the ones of
//               the last briefing until the reader chooses
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {getLatest: vi.fn(), start: vi.fn(), vote: vi.fn()},
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le tennis.', language: 'fr'}}))},
}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');

const READER = {id: 4, username: 'reader'};
const ready = (hours) => ({id: 9, status: 'ready', hours, items: [], createdAt: '2026-10-03T08:00:00.000Z', finishedAt: '2026-10-03T08:01:00.000Z'});

const renderPage = () => render(<MemoryRouter><WithSession user={READER}><BriefingPage/></WithSession></MemoryRouter>);
const choice = (name) => screen.getByRole('radio', {name});

describe('BriefingPage and the news it is written from', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should ask the next briefing as the last one was, and say what the last one read', async () => {
        BriefingApi.getLatest.mockResolvedValue({briefing: ready(168)});
        renderPage();

        await waitFor(() => expect(choice('7 days')).toHaveAttribute('aria-checked', 'true'));
        expect(screen.getByText(/The news of the last 7 days/)).toBeInTheDocument();
        expect(screen.getByText(/No story of the last 7 days really fits/)).toBeInTheDocument();
    });

    it('should write the next briefing from the news the reader chose', async () => {
        BriefingApi.getLatest.mockResolvedValue({briefing: ready(48)});
        BriefingApi.start.mockResolvedValue({briefing: {id: 10, status: 'running', step: 'ranking', hours: 24, items: []}});
        renderPage();

        await waitFor(() => expect(choice('2 days')).toHaveAttribute('aria-checked', 'true'));
        fireEvent.click(choice('24 hours'));
        fireEvent.click(screen.getByRole('button', {name: 'New briefing'}));

        // and of the cards chosen last, 10 by default
        await waitFor(() => expect(BriefingApi.start).toHaveBeenCalledWith(24, 10));
        expect(await screen.findByText(/stories of the last 24 hours closest to your interests/)).toBeInTheDocument();
    });

    it('should ask the news of 2 days before any briefing', async () => {
        BriefingApi.getLatest.mockResolvedValue({briefing: null});
        renderPage();

        await waitFor(() => expect(choice('2 days')).toHaveAttribute('aria-checked', 'true'));
    });
});
