//
//  Author: Fabian Rostello
//  Date: 25.09.2026
//  File: useSeenCards.js
//  Description: Which cards of the briefing the reader really saw: a card seen is not shown again in
//               the next briefings, the others can come back
//

import {useCallback, useEffect, useRef} from "react";
import {BriefingApi} from "@/features/briefing/api/briefingApi.js";

const VISIBLE_RATIO = 0.5;      // at least half of the card on the screen
const SEEN_MS = 2000;           // for this long: time to read a title, not to scroll past it
const SEND_MS = 3000;           // the cards seen are sent together, at most this often

// observe(storyId) gives the ref of the element of a card
export const useSeenCards = (briefing, token) => {
    const elements = useRef(new Map());     // element -> storyId
    const timers = useRef(new Map());       // storyId -> timer running while it is on the screen
    const waiting = useRef(new Set());      // seen, not sent yet
    const known = useRef(new Set());        // seen before or sent: never sent again
    const observer = useRef(null);
    const refs = useRef(new Map());         // storyId -> its ref, the same at every render

    const ready = briefing?.status === 'ready' ? briefing : null;
    const briefingId = ready?.id;

    const send = useCallback((keepalive = false) => {
        if (!briefingId || waiting.current.size === 0) return;
        const storyIds = [...waiting.current];
        waiting.current.clear();
        // lost on a network error: the card may come back once, which costs less than a card missed
        BriefingApi.markSeen(briefingId, storyIds, token, {keepalive}).catch(() => {});
    }, [briefingId, token]);

    // the cards as they are now: a thumb changes the briefing, it must not start the watching again
    const items = useRef([]);
    useEffect(() => {
        items.current = ready?.items ?? [];
    });

    useEffect(() => {
        if (!briefingId) return undefined;
        known.current = new Set(items.current.filter(item => item.seenAt).map(item => item.storyId));
        const running = timers.current;
        const onScreen = new Set();         // cards half on the screen now, seen or not yet

        // the time on the screen counts only while the page is shown: a tab left behind another one,
        // or a page hidden with its cards on the screen, starts counting again once shown
        const count = (storyId) => {
            if (known.current.has(storyId) || running.has(storyId) || document.visibilityState !== 'visible') return;
            running.set(storyId, setTimeout(() => {
                running.delete(storyId);
                known.current.add(storyId);
                waiting.current.add(storyId);
            }, SEEN_MS));
        };
        const stop = (storyId) => {
            clearTimeout(running.get(storyId));
            running.delete(storyId);
        };
        observer.current = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const storyId = elements.current.get(entry.target);
                if (storyId === undefined) continue;
                if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
                    onScreen.add(storyId);
                    count(storyId);
                } else {
                    onScreen.delete(storyId);
                    stop(storyId);
                }
            }
        }, {threshold: [0, VISIBLE_RATIO, 1]});
        for (const element of elements.current.keys()) observer.current.observe(element);

        const interval = setInterval(send, SEND_MS);
        // hidden: what was seen is sent at once (keepalive lets it finish while the page closes) and
        // the counting stops; shown again: it starts again for the cards on the screen
        const visibility = () => {
            if (document.visibilityState === 'hidden') {
                for (const storyId of [...running.keys()]) stop(storyId);
                send(true);
            } else {
                for (const storyId of onScreen) count(storyId);
            }
        };
        document.addEventListener('visibilitychange', visibility);

        return () => {
            observer.current?.disconnect();
            observer.current = null;
            for (const timer of running.values()) clearTimeout(timer);
            running.clear();
            clearInterval(interval);
            document.removeEventListener('visibilitychange', visibility);
            send(true);
        };
    }, [briefingId, send]);

    return useCallback((storyId) => {
        if (!refs.current.has(storyId)) {
            refs.current.set(storyId, (element) => {
                if (element) {
                    elements.current.set(element, storyId);
                    observer.current?.observe(element);
                    return;
                }
                for (const [observed, id] of elements.current) {
                    if (id !== storyId) continue;
                    observer.current?.unobserve(observed);
                    elements.current.delete(observed);
                }
            });
        }
        return refs.current.get(storyId);
    }, []);
};
