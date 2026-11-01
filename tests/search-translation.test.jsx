//
//  Author: Fabian Rostello
//  Date: 01.10.2026
//  File: search-translation.test.jsx
//  Description: A search reads every language: the cards written in another than the one searched
//               are translated when reached, a few in one request, and marked as translated
//

import '@testing-library/jest-dom';
import { it, expect, describe, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Article } from '@/features/search/components/article/Article.jsx';
import { createTranslator, TranslationContext } from '@/features/search/translation.js';

const news = (url, title, language, extra = {}) => ({
    url, title, language,
    source: 'kicker.de',
    publishedAt: '2026-10-01T10:00:00.000Z',
    description: 'Der VAR griff in der 80. Minute ein.',
    thumbnail: null,
    sources: [],
    corroboration: {media: 1, wordings: 1},
    ...extra,
});

describe('createTranslator', () => {
    it('should ask the cards reached together, each once, the facts for their title only', async () => {
        vi.useFakeTimers();
        const translate = vi.fn(async () => [{url: 'https://a.test', language: 'de', title: 'Le titre', description: null}]);
        const translator = createTranslator('fr', translate);

        translator.request('https://a.test', true);
        translator.request('https://b.test', true);
        translator.request('https://c.test', false);
        translator.request('https://a.test', true);
        await act(async () => vi.runAllTimersAsync());

        expect(translate).toHaveBeenCalledTimes(1);
        expect(translate).toHaveBeenCalledWith({news: ['https://a.test', 'https://b.test'], titles: ['https://c.test']});
        expect(translator.get('https://a.test').title).toBe('Le titre');
        // asked, no translation: shown as written and not asked again
        expect(translator.get('https://b.test')).toBeNull();
        translator.request('https://b.test', true);
        await act(async () => vi.runAllTimersAsync());
        expect(translate).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });

    it('should still ask the description of a card whose title its affair asked first', async () => {
        vi.useFakeTimers();
        const translate = vi.fn(async ({news, titles}) => [...news, ...titles].map(url => ({url, language: 'en', title: 'Le titre', description: news.includes(url) ? 'La description' : null})));
        const translator = createTranslator('fr', translate);

        translator.request('https://a.test', false);
        await act(async () => vi.runAllTimersAsync());
        translator.request('https://a.test', true);
        translator.request('https://b.test', false);
        translator.request('https://b.test', true);
        await act(async () => vi.runAllTimersAsync());

        expect(translate).toHaveBeenCalledTimes(2);
        expect(translate).toHaveBeenLastCalledWith({news: ['https://a.test', 'https://b.test'], titles: []});
        expect(translator.get('https://a.test').description).toBe('La description');
        vi.useRealTimers();
    });
});

describe('createTranslator for the passages of a description', () => {
    it('should ask the passages with the titles, each once, and keep the answer by news and text', async () => {
        vi.useFakeTimers();
        const translate = vi.fn(async ({titles, excerpts}) => [
            ...titles.map(url => ({url, language: 'de', title: 'Le titre', description: null})),
            {url: 'https://a.test', text: '…Der VAR griff ein…', language: 'de', excerpt: '…Le VAR est intervenu…'},
        ]);
        const translator = createTranslator('fr', translate);

        translator.request('https://a.test', false);
        translator.requestExcerpt('https://a.test', '…Der VAR griff ein…');
        translator.requestExcerpt('https://a.test', '…Der VAR griff ein…');
        translator.requestExcerpt('https://b.test', 'Ein anderer Satz');
        await act(async () => vi.runAllTimersAsync());

        expect(translate).toHaveBeenCalledTimes(1);
        expect(translate).toHaveBeenCalledWith({news: [], titles: ['https://a.test'], excerpts: [
            {url: 'https://a.test', text: '…Der VAR griff ein…'}, {url: 'https://b.test', text: 'Ein anderer Satz'}]});
        // the title and the passage of one news do not take the place of each other
        expect(translator.get('https://a.test').title).toBe('Le titre');
        expect(translator.getExcerpt('https://a.test', '…Der VAR griff ein…').excerpt).toBe('…Le VAR est intervenu…');
        // asked, no translation: shown as written and not asked again
        expect(translator.getExcerpt('https://b.test', 'Ein anderer Satz')).toBeNull();
        translator.requestExcerpt('https://b.test', 'Ein anderer Satz');
        await act(async () => vi.runAllTimersAsync());
        expect(translate).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });

    it('should not send the passages when there are none', async () => {
        vi.useFakeTimers();
        const translate = vi.fn(async () => []);
        createTranslator('fr', translate).request('https://a.test', true);
        await act(async () => vi.runAllTimersAsync());
        expect(translate).toHaveBeenCalledWith({news: ['https://a.test'], titles: []});
        vi.useRealTimers();
    });
});

describe('Article in another language', () => {
    it('should show the translation, marked, with the title as written under it', async () => {
        const translate = vi.fn(async () => [{url: 'https://kicker.test/1', language: 'de',
            title: 'Penalty sifflé après la vidéo', description: 'Le VAR est intervenu à la 80e minute.'}]);
        render(
            <TranslationContext.Provider value={createTranslator('fr', translate)}>
                <Article id="https://kicker.test/1" onSelect={() => true} news={news('https://kicker.test/1', 'Elfmeter nach Videobeweis', 'de')}/>
            </TranslationContext.Provider>
        );

        expect(await screen.findByText('Penalty sifflé après la vidéo')).toBeInTheDocument();
        expect(screen.getByText('Le VAR est intervenu à la 80e minute.')).toBeInTheDocument();
        expect(screen.getByText('translated from German')).toBeInTheDocument();
        expect(screen.getByText('“Elfmeter nach Videobeweis”')).toBeInTheDocument();
    });

    it('should ask nothing for a card in the language searched', async () => {
        const translate = vi.fn(async () => []);
        render(
            <TranslationContext.Provider value={createTranslator('fr', translate)}>
                <Article id="https://lequipe.test/2" onSelect={() => true} news={news('https://lequipe.test/2', 'La VAR annule le but', 'fr')}/>
            </TranslationContext.Provider>
        );

        await waitFor(() => expect(screen.getByText('La VAR annule le but')).toBeInTheDocument());
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(translate).not.toHaveBeenCalled();
        expect(screen.queryByText(/translated from/)).not.toBeInTheDocument();
    });
});
