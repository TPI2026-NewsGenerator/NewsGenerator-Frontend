//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: source-list.test.jsx
//  Description: The sources of the reader in one list (found, added, left out), and the ways to add some
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {SourceList} from '@/features/briefing/components/SourceList.jsx';
import {sourceRows} from '@/features/briefing/sourceRows.js';
import {AddSources} from '@/features/briefing/components/AddSources.jsx';

const limits = {profileFeeds: 60, relevanceDays: 14};
// the key is opaque for the client (a hash of the address on the server): any string unique per feed
const found = (id, site, more = {}) => ({id, key: `k-${site}-rss`, site, url: `https://${site}/rss`, category: 'sport', language: 'en', trusted: false, relevant: 3, ...more});
const own = (id, site, more = {}) => ({id, key: `k-${site}-feed`, site, url: `https://${site}/feed`, category: 'sport', origin: 'user', trusted: false, shared: false, ...more});
const handlers = () => ({onTrust: vi.fn(), onShare: vi.fn(), onRemove: vi.fn(), onKeep: vi.fn(), onRestore: vi.fn()});

describe('sourceRows', () => {
    it('should list the sources found and added by name, marking the ones left out', () => {
        const rows = sourceRows([found(1, 'goal.com')], [own(7, 'arbitre.fr')],
            [{key: 'k-goal.com-rss', url: 'https://goal.com/rss', site: 'goal.com', refused: 4, liked: 0}]);
        expect(rows.map(row => [row.site, row.origin, Boolean(row.leftOut)])).toEqual([
            ['arbitre.fr', 'user', false],
            ['goal.com', 'profile', true],
        ]);
    });

    it('should keep a source left out that is no longer among the others', () => {
        const rows = sourceRows([], [], [{key: 'k-old', url: 'https://old.com/rss', site: 'old.com', refused: 5, liked: 1}]);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({site: 'old.com', origin: 'profile', leftOut: {refused: 5}});
    });

    it('should match a source read through the bridge, sent without its address, by its key', () => {
        const page = found(1, 'lematin.ch', {key: 'k-bridge-1', url: null});
        const rows = sourceRows([page, found(2, 'rts.ch', {key: 'k-bridge-2', url: null})], [],
            [{key: 'k-bridge-1', url: null, site: 'lematin.ch', refused: 3, liked: 0}]);
        expect(rows.map(row => [row.site, Boolean(row.leftOut)])).toEqual([['lematin.ch', true], ['rts.ch', false]]);
        expect(rows.every(row => row.url === null)).toBe(true);
    });
});

describe('SourceList', () => {
    it('should show the sources found and added in one list, and filter them by where they come from', () => {
        render(<SourceList found={[found(1, 'goal.com'), found(2, 'tribuna.com')]} own={[own(7, 'arbitre.fr')]} refused={[]}
                           limits={limits} {...handlers()}/>);

        expect(screen.getByText('goal.com')).toBeInTheDocument();
        expect(screen.getByText('arbitre.fr')).toBeInTheDocument();
        expect(screen.getByRole('radio', {name: /All 3/})).toBeInTheDocument();
        // no source left out: no such choice
        expect(screen.queryByRole('radio', {name: /Left out/})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', {name: /Added by you 1/}));
        expect(screen.getByText('arbitre.fr')).toBeInTheDocument();
        expect(screen.queryByText('goal.com')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', {name: /Found for you 2/}));
        expect(screen.getByText('tribuna.com')).toBeInTheDocument();
        expect(screen.queryByText('arbitre.fr')).not.toBeInTheDocument();
    });

    it('should trust and remove any source, and share none: every source is read for every reader', () => {
        const told = handlers();
        render(<SourceList found={[found(1, 'goal.com')]} own={[own(7, 'arbitre.fr')]} refused={[]} limits={limits} {...told}/>);

        expect(screen.queryByRole('button', {name: /^Share/})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Remove arbitre.fr'}));
        fireEvent.click(screen.getByRole('button', {name: 'Remove goal.com'}));
        fireEvent.click(screen.getByRole('button', {name: 'Trust goal.com'}));
        expect(told.onRemove).toHaveBeenCalledWith(expect.objectContaining({id: 7, origin: 'user'}));
        expect(told.onRemove).toHaveBeenCalledWith(expect.objectContaining({id: 1, origin: 'profile'}));
        expect(told.onTrust).toHaveBeenCalledWith(expect.objectContaining({id: 1, origin: 'profile'}));
    });

    it('should list a source found and removed among the ones left out, and bring it back', () => {
        const told = handlers();
        render(<SourceList found={[found(1, 'goal.com')]} own={[]} refused={[]} limits={limits} {...told}
                           removed={[{key: 'a1b2', site: 'amnesty.org', url: 'https://amnesty.org/rss', category: 'world', language: 'en'}]}/>);

        // not among the ones found for the reader any more
        expect(screen.getByRole('radio', {name: /Found for you 1/})).toBeInTheDocument();
        fireEvent.click(screen.getByRole('radio', {name: /Left out 1/}));
        expect(screen.getByText('removed by you')).toBeInTheDocument();
        expect(screen.queryByText('goal.com')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Remove amnesty.org'})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Bring it back'}));
        expect(told.onRestore).toHaveBeenCalledWith(expect.objectContaining({removedKey: 'a1b2'}));
    });

    it('should show all the sources again once the last one left out is brought back', () => {
        const removed = [{key: 'a1b2', site: 'amnesty.org', url: 'https://amnesty.org/rss', category: 'world', language: 'en'}];
        const {rerender} = render(<SourceList found={[found(1, 'goal.com')]} own={[]} refused={[]} removed={removed}
                                              limits={limits} {...handlers()}/>);
        fireEvent.click(screen.getByRole('radio', {name: /Left out 1/}));

        rerender(<SourceList found={[found(1, 'goal.com'), found(2, 'amnesty.org')]} own={[]} refused={[]} removed={[]}
                             limits={limits} {...handlers()}/>);
        expect(screen.getByRole('radio', {name: /All 2/})).toHaveAttribute('data-state', 'on');
        expect(screen.getByText('amnesty.org')).toBeInTheDocument();
    });

    it('should mark a source left out by the thumbs, and keep it', () => {
        const told = handlers();
        render(<SourceList found={[found(1, 'goal.com'), found(2, 'tribuna.com')]} own={[]} limits={limits} {...told}
                           refused={[{key: 'k-goal.com-rss', url: 'https://goal.com/rss', site: 'goal.com', refused: 4, liked: 0}]}/>);

        fireEvent.click(screen.getByRole('radio', {name: /Left out 1/}));
        expect(screen.getByText('left out: 4 not for me')).toBeInTheDocument();
        expect(screen.queryByText('tribuna.com')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Keep it'}));
        expect(told.onKeep).toHaveBeenCalledWith(expect.objectContaining({leftOut: expect.objectContaining({key: 'k-goal.com-rss'})}));
    });

    it('should say a source read through the bridge is read from its web page, and keep it by its key', () => {
        const told = handlers();
        render(<SourceList found={[found(1, 'lematin.ch', {key: 'k-bridge', url: null})]} own={[]} limits={limits} {...told}
                           refused={[{key: 'k-bridge', url: null, site: 'lematin.ch', refused: 3, liked: 0}]}/>);

        expect(screen.getByText('read from its web page')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Keep it'}));
        expect(told.onKeep).toHaveBeenCalledWith(expect.objectContaining({url: null, leftOut: expect.objectContaining({key: 'k-bridge'})}));
    });

    it('should say which sources give far more news than the others, and only those', () => {
        render(<SourceList found={[found(1, 'si.com', {newsPerDay: 740, flood: true})]}
                           own={[own(7, 'agenzianova.com', {newsPerDay: 7440, flood: true}), own(8, 'arbitre.fr', {newsPerDay: 12, flood: false})]}
                           refused={[]} limits={limits} {...handlers()}/>);
        expect(screen.getByText('7,440 news a day: prepared last')).toBeInTheDocument();
        expect(screen.getByText('740 news a day: prepared last')).toBeInTheDocument();
        expect(screen.queryByText(/12 news a day/)).not.toBeInTheDocument();
    });

    it('should find a source of a long list by its name, whatever the case and the accents', () => {
        const many = Array.from({length: 12}, (_, i) => own(i + 1, `media${String(i + 1).padStart(2, '0')}.com`));
        many[3] = {...many[3], site: 'lequipe.fr', url: 'https://www.lequipe.fr/rss/actu_rss_Football.xml'};
        render(<SourceList found={[]} own={many} refused={[]} limits={limits} {...handlers()}/>);
        expect(screen.getByText('12 sources')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Find a source'), {target: {value: 'ÉQUIPE'}});
        expect(screen.getByText('1 of 12')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Remove lequipe.fr'})).toBeInTheDocument();
        expect(screen.queryByText('media01.com')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Find a source'), {target: {value: 'nothing'}});
        expect(screen.getByText(/No source matches/)).toBeInTheDocument();
    });

    it('should show no filter for a short list', () => {
        render(<SourceList found={[found(1, 'goal.com')]} own={[]} refused={[]} limits={limits} {...handlers()}/>);
        expect(screen.queryByLabelText('Find a source')).not.toBeInTheDocument();
    });
});

describe('AddSources', () => {
    it('should add a website in the language picked', async () => {
        const onLanguage = vi.fn();
        const onAdded = vi.fn();
        const feed = own(9, 'lequipe.fr');
        const api = {addUserFeed: vi.fn().mockResolvedValue({feed, sample: ['Un titre']})};
        render(<AddSources categories={['sport']} api={api} language="fr" onAdded={onAdded}
                           languages={[{value: 'en', label: 'English'}, {value: 'fr', label: 'French'}]} onLanguage={onLanguage}/>);

        fireEvent.change(screen.getByLabelText('Its language'), {target: {value: 'en'}});
        expect(onLanguage).toHaveBeenCalledWith('en');

        fireEvent.change(screen.getByLabelText('Add a website'), {target: {value: 'lequipe.fr'}});
        fireEvent.change(screen.getByLabelText('Category'), {target: {value: 'sport'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add'}));
        await waitFor(() => expect(onAdded).toHaveBeenCalledWith([feed]));
        expect(api.addUserFeed).toHaveBeenCalledWith({site: 'lequipe.fr', category: 'sport', language: 'fr'});
    });

    it('should show the directory first, complete it with the web, and read a web medium on the words searched', async () => {
        let answerWeb;
        const named = {site: 'rugbyrama.fr', name: 'Rugbyrama Top 14', key: 'k-top14', feed: 'https://rugbyrama.fr/top14.xml', readers: 900, via: 'directory'};
        const api = {
            searchSources: vi.fn((query, language, from) => from === 'web'
                ? new Promise(resolve => { answerWeb = resolve; })
                : Promise.resolve({sources: [named]})),
            importSources: vi.fn().mockResolvedValue({feeds: [], errors: []}),
        };
        render(<AddSources categories={['sport']} api={api}/>);

        fireEvent.change(screen.getByLabelText('Or search a site, a feed or a subject'), {target: {value: 'rugby top 14'}});
        fireEvent.click(screen.getByRole('button', {name: 'Search'}));
        expect(await screen.findByText('Rugbyrama Top 14')).toBeInTheDocument();
        expect(screen.getByText(/Looking on the web/)).toBeInTheDocument();

        // the same medium found on the web is listed once
        answerWeb({sources: [
            {...named, name: 'Rugbyrama', key: 'k-rugbyrama', feed: 'https://rugbyrama.fr/rss', news: 12, via: 'web'},
            {site: 'midi-olympique.fr', name: 'Midi Olympique', key: 'k-midi', feed: 'https://midi-olympique.fr/rss', news: 8, sample: 'Un titre', via: 'web'},
        ]});
        expect(await screen.findByText('Midi Olympique')).toBeInTheDocument();
        expect(screen.queryByText('Rugbyrama')).not.toBeInTheDocument();
        expect(screen.queryByText(/Looking on the web/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Midi Olympique'));
        fireEvent.change(screen.getByLabelText('Category'), {target: {value: 'sport'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add 1 source'}));
        await waitFor(() => expect(api.importSources).toHaveBeenCalledWith(
            [{site: 'midi-olympique.fr', feed: 'https://midi-olympique.fr/rss', category: 'sport'}], 'en', ['rugby top 14']));
    });

    it('should add a site read from its page, offered without its address, and take it out of the list', async () => {
        const onAdded = vi.fn();
        const sources = [
            {site: 'lematin.ch', name: 'Le Matin', key: 'k-bridge', feed: null, via: 'directory'},
            {site: 'rts.ch', name: 'RTS', key: 'k-rts', feed: 'https://rts.ch/rss', via: 'directory'},
        ];
        const api = {
            searchSources: vi.fn().mockResolvedValue({sources}),
            importSources: vi.fn().mockResolvedValue({
                // read from its web page: sent with its key, never the address on the bridge
                feeds: [{id: 3, key: 'k-bridge', url: null, site: 'lematin.ch', category: 'world'}],
                errors: [{site: 'rts.ch', error: 'This feed has no news.'}],
            }),
        };
        render(<AddSources categories={['world']} api={api} onAdded={onAdded}/>);

        fireEvent.change(screen.getByLabelText('Or search a site, a feed or a subject'), {target: {value: 'suisse'}});
        fireEvent.click(screen.getByRole('button', {name: 'Search'}));
        fireEvent.click(await screen.findByText('Le Matin'));
        fireEvent.click(screen.getByText('RTS'));
        fireEvent.change(screen.getByLabelText('Category'), {target: {value: 'world'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add 2 sources'}));

        await waitFor(() => expect(onAdded).toHaveBeenCalled());
        expect(api.importSources).toHaveBeenCalledWith([
            {site: 'lematin.ch', feed: null, category: 'world'},
            {site: 'rts.ch', feed: 'https://rts.ch/rss', category: 'world'},
        ], 'en', null);
        await waitFor(() => expect(screen.queryByText('Le Matin')).not.toBeInTheDocument());
        // the one that failed stays, to be added again
        expect(screen.getByText('RTS')).toBeInTheDocument();
    });
});
