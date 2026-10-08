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

// a site read from its page comes with no address (the one of the bridge of the server), only its key
const checked = {
    'https://www.kicker.de': {status: 'ready', name: 'www.kicker.de', key: 'k-kicker', feed: 'https://newsfeed.kicker.de/news/aktuell', language: 'de', recent: 300, items: 50, sample: 'Bayern gewinnt'},
    'https://www.vi.nl': {status: 'bridge', name: 'www.vi.nl', key: 'k-vi', feed: null, language: 'nl', recent: 10, items: 10, sample: null},
    'https://www.irishfa.com': {status: 'flood', name: 'www.irishfa.com', key: 'k-irishfa', feed: 'https://www.irishfa.com/rss', language: 'en', recent: 900, items: 5882, sample: null},
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
        const {container} = render(<ImportSources api={server} language="en" category="sport" needCategory={() => true}/>);
        pick(container, Object.keys(checked));

        await screen.findByText('www.kicker.de');
        expect(server.checkSites).toHaveBeenCalledWith(Object.keys(checked), 'en');
        expect(screen.getByRole('checkbox', {name: /www.kicker.de/})).toBeChecked();
        expect(screen.getByRole('checkbox', {name: /www.vi.nl/})).not.toBeChecked();
        expect(screen.getByRole('checkbox', {name: /www.irishfa.com/})).not.toBeChecked();
        expect(screen.getByText('heavy')).toBeInTheDocument();
        expect(screen.getByText(/1 without a feed or page to read/)).toBeInTheDocument();
    });

    it('should add the ticked ones in the category chosen, and take them out of the list', async () => {
        const server = api();
        const onAdded = vi.fn();
        const {container} = render(<ImportSources api={server} language="en" category="sport" needCategory={() => true} onAdded={onAdded}/>);
        pick(container, ['https://www.kicker.de', 'https://www.vi.nl']);

        fireEvent.click(await screen.findByRole('checkbox', {name: /www.vi.nl/}));
        fireEvent.click(screen.getByRole('button', {name: 'Add 2 sources'}));

        await waitFor(() => expect(onAdded).toHaveBeenCalled());
        expect(server.importSources).toHaveBeenCalledWith([
            {site: 'https://www.kicker.de', feed: 'https://newsfeed.kicker.de/news/aktuell', category: 'sport'},
            {site: 'https://www.vi.nl', feed: null, category: 'sport'},
        ], 'en');
        await waitFor(() => expect(screen.queryByText('www.kicker.de')).not.toBeInTheDocument());
        expect(screen.queryByText('www.vi.nl')).not.toBeInTheDocument();
    });

    it('should show the sites leading to one feed as one line, even checked apart, and add it once', async () => {
        const same = {...checked['https://www.kicker.de'], name: 'kicker.de'};
        const server = api();
        // 30 sites: two parts of 25 checked one after the other, the two kicker in each
        const others = Array.from({length: 28}, (_, i) => `https://site${i}.example`);
        server.checkSites.mockImplementation(async (sites) => ({sites: sites.map(site => site.includes('kicker')
            ? {site, ...same}
            : {site, status: 'none', reason: 'No feed found'})}));
        const {container} = render(<ImportSources api={server} language="en" category="sport" needCategory={() => true}/>);
        pick(container, ['https://www.kicker.de', ...others, 'https://kicker.de/news']);

        await waitFor(() => expect(server.checkSites).toHaveBeenCalledTimes(2));
        await screen.findByText(/Same feed as kicker.de\/news in your list/);
        expect(screen.getAllByRole('checkbox', {name: /kicker.de/})).toHaveLength(1);
        expect(screen.getByText(/1 leading to a feed listed already/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Add 1 source'}));
        await waitFor(() => expect(server.importSources).toHaveBeenCalledWith([
            {site: 'https://www.kicker.de', feed: 'https://newsfeed.kicker.de/news/aktuell', category: 'sport'},
        ], 'en'));
    });

    it('should leave a feed unticked by the reader unticked when the next part of the list names it again', async () => {
        const server = api();
        let release;
        const second = new Promise(resolve => { release = resolve; });
        const others = Array.from({length: 24}, (_, i) => `https://site${i}.example`);
        server.checkSites.mockImplementation(async (sites) => {
            if (!sites.includes('https://www.kicker.de')) await second;
            return {sites: sites.map(site => site.includes('kicker')
                ? {site, ...checked['https://www.kicker.de']}
                : {site, status: 'none', reason: 'No feed found'})};
        });
        const {container} = render(<ImportSources api={server} language="en" category="sport" needCategory={() => true}/>);
        pick(container, ['https://www.kicker.de', ...others, 'https://kicker.de/news']);

        fireEvent.click(await screen.findByRole('checkbox', {name: /www.kicker.de/}));
        release();
        await screen.findByText(/Same feed as kicker.de\/news/);
        expect(screen.getByRole('checkbox', {name: /www.kicker.de/})).not.toBeChecked();
    });

    it('should keep the sites checked when the server checks no more this hour, say when, and check the others then', async () => {
        const server = api();
        const others = Array.from({length: 30}, (_, i) => `https://site${i}.example`);
        let full = true;
        server.checkSites.mockImplementation(async (sites) => sites.includes('https://www.kicker.de') || !full
            ? {sites: sites.map(site => checked[site] ? {site, ...checked[site]} : {site, status: 'none', reason: 'No feed found'})}
            : {error: 'You checked 2000 sites in the last hour, the most the server checks for you.', retryAfter: 600});
        const {container} = render(<ImportSources api={server} language="en" category="sport" needCategory={() => true}/>);
        pick(container, ['https://www.kicker.de', ...others]);

        expect(await screen.findByText('25 of 31 addresses checked')).toBeInTheDocument();
        expect(screen.getByText(/You checked 2000 sites in the last hour.*The 6 others can be checked from/)).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: /www.kicker.de/})).toBeChecked();

        full = false;
        fireEvent.click(screen.getByRole('button', {name: 'Check the 6 others'}));
        await waitFor(() => expect(server.checkSites).toHaveBeenLastCalledWith(others.slice(24), 'en'));
        await waitFor(() => expect(screen.queryByText(/addresses checked/)).toBeNull());
        expect(screen.getByRole('checkbox', {name: /www.kicker.de/})).toBeChecked();
        expect(screen.getByText(/30 without a feed or page to read/)).toBeInTheDocument();
    });

    it('should check the feed of a line of the list rather than its site, and say so', async () => {
        const server = api();
        const {container} = render(<ImportSources api={server} language="en" category="sport" needCategory={() => true}/>);
        pick(container, ['nom,url_site,flux_rss', 'Kicker,https://www.kicker.de/news,https://www.kicker.de', 'Irish FA,https://www.irishfa.com/news,https://www.irishfa.com/rss']);

        await screen.findByText('www.kicker.de');
        expect(server.checkSites).toHaveBeenCalledWith(['https://www.kicker.de/news', 'https://www.kicker.de', 'https://www.irishfa.com/rss'], 'en');
        expect(screen.getByText('1 site of your list left out: the feed given on the same line is checked instead.')).toBeInTheDocument();
    });

    it('should add nothing without a category', async () => {
        const server = api();
        const {container} = render(<ImportSources api={server} language="en" category="" needCategory={() => false}/>);
        pick(container, ['https://www.kicker.de']);

        fireEvent.click(await screen.findByRole('button', {name: 'Add 1 source'}));
        expect(server.importSources).not.toHaveBeenCalled();
    });
});
