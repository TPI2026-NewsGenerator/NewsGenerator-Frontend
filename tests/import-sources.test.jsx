//
//  Author: Fabian Rostello
//  Date: 01.10.2026
//  File: import-sources.test.jsx
//  Description: A list of sites imported from a file: checked a part at a time, the feeds ready
//               ticked, the chosen ones added
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {ImportSources} from '@/features/briefing/components/ImportSources.jsx';

const checked = {
    'https://www.kicker.de': {status: 'ready', name: 'www.kicker.de', feed: 'https://newsfeed.kicker.de/news/aktuell', language: 'de', recent: 300, items: 50, sample: 'Bayern gewinnt'},
    'https://www.vi.nl': {status: 'bridge', name: 'www.vi.nl', feed: 'http://rss-bridge/?site=vi.nl', language: 'nl', recent: 10, items: 10, sample: null},
    'https://www.irishfa.com': {status: 'flood', name: 'www.irishfa.com', feed: 'https://www.irishfa.com/rss', language: 'en', recent: 900, items: 5882, sample: null},
    'https://www.uefa.com': {status: 'none', reason: 'No feed found'},
};

const api = () => ({
    checkSites: vi.fn(async (sites) => ({sites: sites.map(site => ({site, ...checked[site]}))})),
    importSources: vi.fn(async (sources) => ({
        feeds: sources.map((source, i) => ({id: i, url: source.feed, site: source.site, category: source.category})),
        errors: [],
    })),
});

const pick = (container, lines) => {
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, {target: {files: [new File([lines.join('\n')], 'sources.csv', {type: 'text/csv'})]}});
};

describe('ImportSources', () => {
    it('should tick the feeds ready only, and say why the others are not', async () => {
        const server = api();
        const {container} = render(<ImportSources token="t" api={server} language="en" category="sport" needCategory={() => true}/>);
        pick(container, Object.keys(checked));

        await screen.findByText('www.kicker.de');
        expect(server.checkSites).toHaveBeenCalledWith(Object.keys(checked), 't', 'en');
        expect(screen.getByRole('checkbox', {name: /www.kicker.de/})).toBeChecked();
        expect(screen.getByRole('checkbox', {name: /www.vi.nl/})).not.toBeChecked();
        expect(screen.getByRole('checkbox', {name: /www.irishfa.com/})).not.toBeChecked();
        expect(screen.getByText('heavy')).toBeInTheDocument();
        expect(screen.getByText(/1 without a feed or page to read/)).toBeInTheDocument();
    });

    it('should add the ticked ones in the category chosen, and take them out of the list', async () => {
        const server = api();
        const onAdded = vi.fn();
        const {container} = render(<ImportSources token="t" api={server} language="en" category="sport" needCategory={() => true} onAdded={onAdded}/>);
        pick(container, ['https://www.kicker.de', 'https://www.vi.nl']);

        fireEvent.click(await screen.findByRole('checkbox', {name: /www.vi.nl/}));
        fireEvent.click(screen.getByRole('button', {name: 'Add 2 sources'}));

        await waitFor(() => expect(onAdded).toHaveBeenCalled());
        expect(server.importSources).toHaveBeenCalledWith([
            {site: 'https://www.kicker.de', feed: 'https://newsfeed.kicker.de/news/aktuell', category: 'sport'},
            {site: 'https://www.vi.nl', feed: 'http://rss-bridge/?site=vi.nl', category: 'sport'},
        ], 't', 'en');
        await waitFor(() => expect(screen.queryByText('www.kicker.de')).not.toBeInTheDocument());
    });

    it('should add nothing without a category', async () => {
        const server = api();
        const {container} = render(<ImportSources token="t" api={server} language="en" category="" needCategory={() => false}/>);
        pick(container, ['https://www.kicker.de']);

        fireEvent.click(await screen.findByRole('button', {name: 'Add 1 source'}));
        expect(server.importSources).not.toHaveBeenCalled();
    });
});
