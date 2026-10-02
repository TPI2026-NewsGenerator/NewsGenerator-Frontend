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
const found = (id, site, more = {}) => ({id, site, url: `https://${site}/rss`, category: 'sport', language: 'en', trusted: false, relevant: 3, ...more});
const own = (id, site, more = {}) => ({id, site, url: `https://${site}/feed`, category: 'sport', origin: 'user', trusted: false, shared: false, ...more});
const handlers = () => ({onTrust: vi.fn(), onShare: vi.fn(), onRemove: vi.fn(), onKeep: vi.fn()});

describe('sourceRows', () => {
    it('should list the sources found and added by name, marking the ones left out', () => {
        const rows = sourceRows([found(1, 'goal.com')], [own(7, 'arbitre.fr')],
            [{url: 'https://goal.com/rss', site: 'goal.com', refused: 4, liked: 0}]);
        expect(rows.map(row => [row.site, row.origin, Boolean(row.leftOut)])).toEqual([
            ['arbitre.fr', 'user', false],
            ['goal.com', 'profile', true],
        ]);
    });

    it('should keep a source left out that is no longer among the others', () => {
        const rows = sourceRows([], [], [{url: 'https://old.com/rss', site: 'old.com', refused: 5, liked: 1}]);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({site: 'old.com', origin: 'profile', leftOut: {refused: 5}});
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

    it('should share and remove only a source added by hand, and trust any', () => {
        const told = handlers();
        render(<SourceList found={[found(1, 'goal.com')]} own={[own(7, 'arbitre.fr')]} refused={[]} limits={limits} {...told}/>);

        expect(screen.queryByRole('button', {name: 'Share goal.com'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Remove goal.com'})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Share arbitre.fr'}));
        fireEvent.click(screen.getByRole('button', {name: 'Remove arbitre.fr'}));
        fireEvent.click(screen.getByRole('button', {name: 'Trust goal.com'}));
        expect(told.onShare).toHaveBeenCalledWith(expect.objectContaining({id: 7}));
        expect(told.onRemove).toHaveBeenCalledWith(expect.objectContaining({id: 7}));
        expect(told.onTrust).toHaveBeenCalledWith(expect.objectContaining({id: 1, origin: 'profile'}));
    });

    it('should mark a source left out by the thumbs, and keep it', () => {
        const told = handlers();
        render(<SourceList found={[found(1, 'goal.com'), found(2, 'tribuna.com')]} own={[]} limits={limits} {...told}
                           refused={[{url: 'https://goal.com/rss', site: 'goal.com', refused: 4, liked: 0}]}/>);

        fireEvent.click(screen.getByRole('radio', {name: /Left out 1/}));
        expect(screen.getByText('left out: 4 not for me')).toBeInTheDocument();
        expect(screen.queryByText('tribuna.com')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Keep it'}));
        expect(told.onKeep).toHaveBeenCalledWith(expect.objectContaining({url: 'https://goal.com/rss'}));
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
        const named = {site: 'rugbyrama.fr', name: 'Rugbyrama Top 14', feed: 'https://rugbyrama.fr/top14.xml', readers: 900, via: 'directory'};
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
            {...named, name: 'Rugbyrama', feed: 'https://rugbyrama.fr/rss', news: 12, via: 'web'},
            {site: 'midi-olympique.fr', name: 'Midi Olympique', feed: 'https://midi-olympique.fr/rss', news: 8, sample: 'Un titre', via: 'web'},
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
});
