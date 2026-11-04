//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: affair-panel.test.jsx
//  Description: The tab "This affair" of a card: its events and its coverage are read in the tab itself, no pop-up, built when the tab
//               is opened and not before
//

import '@testing-library/jest-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BriefingCard} from '@/features/briefing/components/BriefingCard.jsx';

const {affair} = vi.hoisted(() => ({affair: vi.fn()}));

vi.mock('@/features/briefing/api/briefingApi.js', () => ({BriefingApi: {affair}}));
vi.mock('@/features/affairs/affairApi.js', () => ({AffairApi: {follow: vi.fn(), unfollow: vi.fn()}}));
vi.mock('@/features/affairs/components/AffairTimeline.jsx', () => ({AffairTimeline: ({events}) => <div data-testid="timeline">{events.length} events</div>}));
vi.mock('@/features/affairs/components/AffairCoverage.jsx', () => ({AffairCoverage: ({coverage}) => <div data-testid="coverage">{coverage.media} media</div>}));

const article = (n) => ({title: `Article ${n}`, url: `https://media${n}.fr/story`, source: `media${n}.fr`, publishedAt: '2026-09-24T10:00:00.000Z'});
const item = (changes = {}) => ({
    storyId: 7, title: 'Infantino and the FIFA files', summary: 'Premier paragraphe.', topic: 'sport', sourcing: null, hedged: null,
    publishedAt: '2026-09-24T10:00:00.000Z', corroboration: {media: 3, read: 3, independent: 2, agencies: []},
    articles: [article(1), article(2), article(3)], ...changes,
});
const chip = {title: 'Legal and financial scandals around Infantino', stories: 14, media: 31, followed: null};
const card = (props = {}, changes = {}) => render(
    <MemoryRouter><BriefingCard item={item(changes)} briefingId={3} affair={chip} {...props}/></MemoryRouter>
);
const tab = () => screen.getByRole('button', {name: 'This affair'});

beforeEach(() => affair.mockReset());

describe('BriefingCard, the tab "This affair"', () => {
    it('should not build the affair until the reader opens its tab, even when it comes first', () => {
        card();
        // no analysis and no angles: the coverage is the tab open at first, not the affair
        expect(tab()).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByRole('button', {name: /^Coverage/})).toHaveAttribute('aria-expanded', 'true');
        expect(affair).not.toHaveBeenCalled();
    });

    it('should show the events and the coverage in the tab itself, with no pop-up and no button to open one', async () => {
        affair.mockResolvedValue({affair: true, events: [{id: 1}, {id: 2}, {id: 3}], coverage: {media: 31}});
        card();
        fireEvent.click(tab());
        expect(screen.getByText(/Reading a month of news/)).toBeInTheDocument();
        expect(await screen.findByTestId('timeline')).toHaveTextContent('3 events');
        expect(screen.getByTestId('coverage')).toHaveTextContent('31 media');
        expect(affair).toHaveBeenCalledWith(3, 7);
        expect(screen.getByText('14 stories told by 31 media, over the last 30 days.')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.queryByRole('button', {name: /Show events and coverage/})).toBeNull();
    });

    it('should say so when the AI finds no single affair behind the card', async () => {
        affair.mockResolvedValue({affair: false});
        card();
        fireEvent.click(tab());
        expect(await screen.findByText(/found no single affair/)).toBeInTheDocument();
        expect(screen.queryByTestId('timeline')).toBeNull();
    });

    it('should say why the affair could not be built, and ask again on "Try again"', async () => {
        affair.mockRejectedValueOnce(new Error('The AI is busy')).mockResolvedValueOnce({affair: true, events: [{id: 1}], coverage: {media: 4}});
        card();
        fireEvent.click(tab());
        expect(await screen.findByText(/The AI is busy/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Try again'}));
        expect(await screen.findByTestId('timeline')).toHaveTextContent('1 events');
        expect(affair).toHaveBeenCalledTimes(2);
    });

    it('should lead to the page of the affair, for what it gave since, only when the reader follows it', async () => {
        affair.mockResolvedValue({affair: true, events: [{id: 1}], coverage: {media: 4}});
        const {unmount} = card();
        fireEvent.click(tab());
        await waitFor(() => expect(screen.getByTestId('timeline')).toBeInTheDocument());
        expect(screen.queryByRole('link', {name: 'What it gave since you follow it'})).toBeNull();
        unmount();

        card({affair: {...chip, followed: 12}});
        fireEvent.click(tab());
        await waitFor(() => expect(screen.getByTestId('timeline')).toBeInTheDocument());
        expect(screen.getByRole('link', {name: 'What it gave since you follow it'})).toHaveAttribute('href', '/affairs/12');
    });

    it('should name the affair the same way in the column beside the card and in the tab', () => {
        card();
        expect(screen.getAllByText('This affair').length).toBeGreaterThanOrEqual(2);
        expect(screen.queryByText('The affair')).toBeNull();
    });
});
