//
//  Author: Fabian Rostello
//  Date: 01.10.2026
//  File: translation.js
//  Description: A search reads every language and shows its cards in the one chosen: the title and
//               description of a card in another language are translated when the reader reaches it,
//               a few cards in one request, and shown marked as translated
//

import {createContext, useContext, useEffect, useRef, useSyncExternalStore} from "react";

// what one request asks at most (the server refuses more), the cards first
const MAX_NEWS = 30;
const MAX_TITLES = 60;
const MAX_EXCERPTS = 30;
// the cards reached in this time are asked together
const WAIT_MS = 150;
// a card is asked a little before it is on the screen
const AHEAD = '600px';

// The translations of one search: request(url, withDescription) asks one, get(url) answers it
// (undefined while asked, null when there is none), subscribe(listener) for the cards waiting for it.
// translate({news, titles, excerpts?}) is the request to the server, answering [{url, language, title, description}]
// and, for the passages asked, [{url, text, language, excerpt}]. requestExcerpt(url, text) asks the words of a
// description around a name followed (the page of what a profile follows), getExcerpt(url, text) answers it
// like get. known: [[url, translation | null]] the translations of this search already had (see keptSearch.js),
// answered without asking; known() gives them back
export const createTranslator = (language, translate, known = []) => {
    const results = new Map(known);
    const listeners = new Set();
    const waiting = {news: new Set(), titles: new Set(), excerpts: new Map()};
    const passages = new Map();
    const keyOf = (url, text) => `${url}\n${text}`;
    // each news asked, true when its description was asked too: the fact of a card in its affair asks
    // the title of the card first, the card must still ask its description
    const asked = new Map(known.map(([url, translation]) => [url, translation === null || Boolean(translation.description)]));
    let timer = null;

    const notify = () => listeners.forEach(listener => listener());

    const send = async () => {
        timer = null;
        const news = [...waiting.news].slice(0, MAX_NEWS);
        const titles = [...waiting.titles].slice(0, MAX_TITLES);
        const excerpts = [...waiting.excerpts].slice(0, MAX_EXCERPTS);
        news.forEach(url => waiting.news.delete(url));
        titles.forEach(url => waiting.titles.delete(url));
        excerpts.forEach(([key]) => waiting.excerpts.delete(key));
        if (waiting.news.size + waiting.titles.size + waiting.excerpts.size > 0) timer = setTimeout(send, 0);

        const translations = (await translate({news, titles, ...(excerpts.length > 0 ? {excerpts: excerpts.map(([, passage]) => passage)} : {})}).catch(() => [])) ?? [];
        const byUrl = new Map(translations.filter(translation => translation.excerpt === undefined).map(translation => [translation.url, translation]));
        const byPassage = new Map(translations.filter(translation => translation.excerpt !== undefined).map(translation => [keyOf(translation.url, translation.text), translation]));
        // a news without a translation shows its own text, and is not asked again
        for (const url of [...news, ...titles]) results.set(url, byUrl.get(url) ?? null);
        for (const [key] of excerpts) passages.set(key, byPassage.get(key) ?? null);
        notify();
    };

    return {
        language,
        request: (url, withDescription) => {
            if (asked.has(url) && (asked.get(url) || !withDescription)) return;
            asked.set(url, withDescription);
            if (withDescription) waiting.titles.delete(url);
            (withDescription ? waiting.news : waiting.titles).add(url);
            if (!timer) timer = setTimeout(send, WAIT_MS);
        },
        get: (url) => results.get(url),
        requestExcerpt: (url, text) => {
            const key = keyOf(url, text);
            if (passages.has(key) || waiting.excerpts.has(key)) return;
            waiting.excerpts.set(key, {url, text});
            if (!timer) timer = setTimeout(send, WAIT_MS);
        },
        getExcerpt: (url, text) => passages.get(keyOf(url, text)),
        known: () => [...results],
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
};

// the translator of the search shown, given to its cards (TranslationContext.Provider value={translator})
export const TranslationContext = createContext(null);

const nothing = () => () => {};

// The translation of a news written in another language than the one searched, asked when its element
// (ref) comes near the screen: {ref, translation, excerpt}. The card shows the title as written under it.
// excerpt: the words of its description around a name followed that the row shows (the page of what a profile
// follows), asked with the title; its translation answered in 'excerpt' (a text), null before and without one
export const useTranslation = (url, language, {withDescription = true, excerpt = null} = {}) => {
    const translator = useContext(TranslationContext);
    const needed = Boolean(translator && url && language && language !== translator.language);
    const ref = useRef(null);

    useEffect(() => {
        if (!needed || !ref.current) return;
        const ask = () => {
            translator.request(url, withDescription);
            if (excerpt) translator.requestExcerpt(url, excerpt);
        };
        if (typeof IntersectionObserver === 'undefined') {
            ask();
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            ask();
            observer.disconnect();
        }, {rootMargin: AHEAD});
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [needed, translator, url, withDescription, excerpt]);

    const translation = useSyncExternalStore(needed ? translator.subscribe : nothing, () => needed ? translator.get(url) ?? null : null);
    const passage = useSyncExternalStore(needed ? translator.subscribe : nothing, () => needed && excerpt ? translator.getExcerpt(url, excerpt)?.excerpt ?? null : null);
    return {ref, translation, excerpt: passage};
};
