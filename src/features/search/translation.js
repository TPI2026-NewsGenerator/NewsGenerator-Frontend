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
// the cards reached in this time are asked together
const WAIT_MS = 150;
// a card is asked a little before it is on the screen
const AHEAD = '600px';

// The translations of one search: request(url, withDescription) asks one, get(url) answers it
// (undefined while asked, null when there is none), subscribe(listener) for the cards waiting for it.
// translate({news, titles}) is the request to the server, answering [{url, language, title, description}].
// known: [[url, translation | null]] the translations of this search already had (see keptSearch.js),
// answered without asking; known() gives them back
export const createTranslator = (language, translate, known = []) => {
    const results = new Map(known);
    const listeners = new Set();
    const waiting = {news: new Set(), titles: new Set()};
    // each news asked, true when its description was asked too: the fact of a card in its affair asks
    // the title of the card first, the card must still ask its description
    const asked = new Map(known.map(([url, translation]) => [url, translation === null || Boolean(translation.description)]));
    let timer = null;

    const notify = () => listeners.forEach(listener => listener());

    const send = async () => {
        timer = null;
        const news = [...waiting.news].slice(0, MAX_NEWS);
        const titles = [...waiting.titles].slice(0, MAX_TITLES);
        news.forEach(url => waiting.news.delete(url));
        titles.forEach(url => waiting.titles.delete(url));
        if (waiting.news.size + waiting.titles.size > 0) timer = setTimeout(send, 0);

        const translations = await translate({news, titles}).catch(() => []);
        const byUrl = new Map((translations ?? []).map(translation => [translation.url, translation]));
        // a news without a translation shows its own text, and is not asked again
        for (const url of [...news, ...titles]) results.set(url, byUrl.get(url) ?? null);
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
// (ref) comes near the screen: {ref, translation}. The card shows the title as written under it
export const useTranslation = (url, language, {withDescription = true} = {}) => {
    const translator = useContext(TranslationContext);
    const needed = Boolean(translator && url && language && language !== translator.language);
    const ref = useRef(null);

    useEffect(() => {
        if (!needed || !ref.current) return;
        if (typeof IntersectionObserver === 'undefined') {
            translator.request(url, withDescription);
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            translator.request(url, withDescription);
            observer.disconnect();
        }, {rootMargin: AHEAD});
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [needed, translator, url, withDescription]);

    const translation = useSyncExternalStore(needed ? translator.subscribe : nothing, () => needed ? translator.get(url) ?? null : null);
    return {ref, translation};
};
