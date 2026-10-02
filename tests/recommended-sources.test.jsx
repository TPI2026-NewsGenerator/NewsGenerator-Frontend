//
//  Author: Fabian Rostello
//  Date: 25.09.2026
//  File: recommended-sources.test.jsx
//  Description: The sources a reader could add, read by other readers on their interests
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {RecommendedSources} from '@/features/briefing/components/RecommendedSources.jsx';

const source = (id, site) => ({
    id, site, url: `https://${site}/rss`, category: 'sport', language: 'en', news: 40, relevant: 9,
    samples: [`${site} first title`],
});

const expired = () => false;

describe('RecommendedSources', () => {
    it('should show the recommended sources with how many of their news are on the interests', async () => {
        const api = {getRecommended: vi.fn().mockResolvedValue({sources: [source(1, 'goal.com'), source(2, 'tribuna.com')]})};
        render(<RecommendedSources api={api} expired={expired} reloadKey="done"/>);

        expect(await screen.findByText('goal.com')).toBeInTheDocument();
        expect(screen.getAllByText('9 of 40 news on your interests')).toHaveLength(2);
        expect(screen.getByText('“tribuna.com first title”')).toBeInTheDocument();
    });

    it('should show a title given twice once', async () => {
        const rts = {...source(3, 'rts.ch'), samples: ['Mise au Point', 'Mise au Point']};
        const api = {getRecommended: vi.fn().mockResolvedValue({sources: [rts]})};
        render(<RecommendedSources api={api} expired={expired} reloadKey="done"/>);

        expect(await screen.findAllByText('“Mise au Point”')).toHaveLength(1);
    });

    it('should add one source by its id and take it off the list', async () => {
        const api = {
            getRecommended: vi.fn().mockResolvedValue({sources: [source(1, 'goal.com'), source(2, 'tribuna.com')]}),
            addRecommended: vi.fn().mockResolvedValue({feeds: [{id: 50, url: 'https://goal.com/rss'}], errors: []}),
        };
        render(<RecommendedSources api={api} expired={expired} reloadKey="done"/>);

        fireEvent.click((await screen.findAllByRole('button', {name: 'Add'}))[0]);
        await waitFor(() => expect(screen.queryByText('goal.com')).not.toBeInTheDocument());
        expect(api.addRecommended).toHaveBeenCalledWith([1]);
        expect(screen.getByText('tribuna.com')).toBeInTheDocument();
    });

    it('should show nothing when no source is recommended', async () => {
        const api = {getRecommended: vi.fn().mockResolvedValue({sources: []})};
        const {container} = render(<RecommendedSources api={api} expired={expired} reloadKey="done"/>);
        await waitFor(() => expect(container).toBeEmptyDOMElement());
    });
});
