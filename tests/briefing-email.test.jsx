//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: briefing-email.test.jsx
//  Description: The cards ticked in the briefing sent by e-mail from the reader's own mail app: a mailto:
//               link with their titles, sites and addresses, a passage of each while it stays short
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";
import {MAILTO_LIMIT, mailtoOf} from "@/features/briefing/mailto.js";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {getLatest: vi.fn(), start: vi.fn(), vote: vi.fn()},
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');

const card = (storyId, title, changes = {}) => ({
    storyId, title, summary: `The first passage of ${title}.\n\nThe second one.`, articles: [],
    lead: {source: `media${storyId}.fr`, url: `https://media${storyId}.fr/story`},
    corroboration: {media: 1, read: 1, independent: 1, agencies: []}, ...changes,
});
const bodyOf = (link) => decodeURIComponent(link.split('&body=')[1]);
const subjectOf = (link) => decodeURIComponent(link.match(/subject=([^&]*)/)[1]);

describe('mailtoOf', () => {
    it('should leave the address to the reader, and give the title, a passage, the site and address of each card', () => {
        const link = mailtoOf([card(1, 'Infantino faces a summit'), card(2, 'Vega runs', {titleTranslation: 'Vega se présente', translation: 'Le premier passage traduit.'})]);

        expect(link).toMatch(/^mailto:\?subject=/);
        expect(subjectOf(link)).toBe('2 stories from my NewsGenerator briefing');
        expect(bodyOf(link)).toBe([
            'Stories from my NewsGenerator briefing:',
            '1. Infantino faces a summit\r\n“The first passage of Infantino faces a summit.”\r\nmedia1.fr — https://media1.fr/story',
            '2. Vega se présente\r\n“Le premier passage traduit.” (machine translation)\r\nmedia2.fr — https://media2.fr/story',
        ].join('\r\n\r\n'));
    });

    it('should name a single story in the subject', () => {
        expect(subjectOf(mailtoOf([card(1, 'Infantino faces a summit')]))).toBe('Infantino faces a summit');
    });

    it('should leave out the passages that make the link too long, never a title or an address', () => {
        const long = 'word '.repeat(60);
        const cards = Array.from({length: 8}, (_, i) => card(i + 1, `Story ${i + 1}`, {summary: long}));
        const link = mailtoOf(cards);

        expect(link.length).toBeLessThanOrEqual(MAILTO_LIMIT);
        const body = bodyOf(link);
        cards.forEach((item, i) => expect(body).toContain(`${i + 1}. Story ${i + 1}\r\n`));
        cards.forEach(item => expect(body).toContain(item.lead.url));
        expect(body).toContain('“word');
        expect(body.split('“').length - 1).toBeLessThan(cards.length);
    });
});

describe('BriefingPage e-mail of the cards ticked', () => {
    afterEach(() => vi.clearAllMocks());

    const renderPage = async () => {
        BriefingApi.getLatest.mockResolvedValue({briefing: {
            id: 9, status: 'ready', hours: 24, createdAt: '2026-10-08T06:00:00.000Z', finishedAt: '2026-10-08T06:01:00.000Z',
            items: [card(1, 'First story'), card(2, 'Second story'), card(3, 'Third story')],
        }});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader'}}><BriefingPage/></WithSession></MemoryRouter>);
        await waitFor(() => expect(screen.getAllByRole('checkbox', {name: 'Add to the e-mail'})).toHaveLength(3));
        return screen.getAllByRole('checkbox', {name: 'Add to the e-mail'});
    };

    it('should open the mail app with the cards ticked, in the order of the briefing', async () => {
        const boxes = await renderPage();
        expect(screen.queryByRole('link', {name: 'Send email'})).toBeNull();

        fireEvent.click(boxes[2]);
        fireEvent.click(boxes[0]);

        expect(screen.getByText(/2 stories ticked/)).toBeInTheDocument();
        const body = bodyOf(screen.getByRole('link', {name: 'Send email'}).getAttribute('href'));
        expect(body.indexOf('1. First story')).toBeGreaterThan(0);
        expect(body).toContain('2. Third story');
        expect(body).not.toContain('Second story');
    });

    it('should tick them all, and untick them all', async () => {
        await renderPage();

        fireEvent.click(screen.getByRole('button', {name: 'tick them all'}));
        expect(screen.getByText(/3 stories ticked/)).toBeInTheDocument();
        screen.getAllByRole('checkbox', {name: 'Add to the e-mail'}).forEach(box => expect(box).toBeChecked());

        fireEvent.click(screen.getByRole('button', {name: 'Untick all'}));
        expect(screen.queryByRole('link', {name: 'Send email'})).toBeNull();
    });
});
