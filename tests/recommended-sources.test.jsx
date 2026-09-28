//
//  Author: Fabian Rostello
//  Date: 25.09.2026
//  File: recommended-sources.test.jsx
//  Description: The sources a reader could add, and the sources added by hand they can share
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {RecommendedSources} from '@/features/briefing/components/RecommendedSources.jsx';
import {UserFeeds} from '@/features/briefing/components/UserFeeds.jsx';

const source = (id, site) => ({
    id, site, url: `https://${site}/rss`, category: 'sport', language: 'en', news: 40, relevant: 9,
    samples: [`${site} first title`],
});

const expired = () => false;

describe('RecommendedSources', () => {
    it('should show the recommended sources with how many of their news are on the interests', async () => {
        const api = {getRecommended: vi.fn().mockResolvedValue({sources: [source(1, 'goal.com'), source(2, 'tribuna.com')]})};
        render(<RecommendedSources token="t" api={api} expired={expired} reloadKey="done"/>);

        expect(await screen.findByText('goal.com')).toBeInTheDocument();
        expect(screen.getAllByText('9 of 40 news on your interests')).toHaveLength(2);
        expect(screen.getByText('“tribuna.com first title”')).toBeInTheDocument();
    });

    it('should add one source by its id and take it off the list', async () => {
        const api = {
            getRecommended: vi.fn().mockResolvedValue({sources: [source(1, 'goal.com'), source(2, 'tribuna.com')]}),
            addRecommended: vi.fn().mockResolvedValue({feeds: [{id: 50, url: 'https://goal.com/rss'}], errors: []}),
        };
        render(<RecommendedSources token="t" api={api} expired={expired} reloadKey="done"/>);

        fireEvent.click((await screen.findAllByRole('button', {name: 'Add'}))[0]);
        await waitFor(() => expect(screen.queryByText('goal.com')).not.toBeInTheDocument());
        expect(api.addRecommended).toHaveBeenCalledWith([1], 't');
        expect(screen.getByText('tribuna.com')).toBeInTheDocument();
    });

    it('should show nothing when no source is recommended', async () => {
        const api = {getRecommended: vi.fn().mockResolvedValue({sources: []})};
        const {container} = render(<RecommendedSources token="t" api={api} expired={expired} reloadKey="done"/>);
        await waitFor(() => expect(container).toBeEmptyDOMElement());
    });
});

describe('UserFeeds and sharing', () => {
    const feed = {id: 7, site: 'mysite.org', url: 'https://mysite.org/rss', category: 'sport', origin: 'user', trusted: false, shared: false};

    it('should share a source added by hand, and never offer it for one found for the profile', async () => {
        const api = {
            getUserFeeds: vi.fn().mockResolvedValue({feeds: [feed, {...feed, id: 8, site: 'found.com', origin: 'profile'}]}),
            updateFeed: vi.fn().mockResolvedValue({id: 7, trusted: false, shared: true}),
        };
        render(<UserFeeds token="t" categories={['sport']} api={api}/>);

        const share = await screen.findByRole('button', {name: 'Share mysite.org'});
        expect(screen.queryByRole('button', {name: 'Share found.com'})).not.toBeInTheDocument();

        fireEvent.click(share);
        expect(await screen.findByRole('button', {name: 'Stop sharing mysite.org'})).toHaveAttribute('aria-pressed', 'true');
        expect(api.updateFeed).toHaveBeenCalledWith(7, {shared: true}, 't');
    });
    it('should list on the profile only the sources added by hand, and add one in the language picked', async () => {
        const onLanguage = vi.fn();
        const api = {
            getUserFeeds: vi.fn().mockResolvedValue({feeds: [feed, {...feed, id: 8, site: 'found.com', origin: 'profile'}]}),
            addUserFeed: vi.fn().mockResolvedValue({feed: {...feed, id: 9, site: 'lequipe.fr'}, sample: ['Un titre']}),
        };
        render(<UserFeeds token="t" categories={['sport']} api={api} origin="user" language="fr"
                          languages={[{value: 'en', label: 'English'}, {value: 'fr', label: 'French'}]} onLanguage={onLanguage}/>);

        expect(await screen.findByText('mysite.org')).toBeInTheDocument();
        expect(screen.queryByText('found.com')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Its language'), {target: {value: 'en'}});
        expect(onLanguage).toHaveBeenCalledWith('en');

        fireEvent.change(screen.getByLabelText('Add a website'), {target: {value: 'lequipe.fr'}});
        fireEvent.change(screen.getByLabelText('Category'), {target: {value: 'sport'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add'}));
        await waitFor(() => expect(api.addUserFeed).toHaveBeenCalledWith({site: 'lequipe.fr', category: 'sport', language: 'fr'}, 't'));
    });
});
