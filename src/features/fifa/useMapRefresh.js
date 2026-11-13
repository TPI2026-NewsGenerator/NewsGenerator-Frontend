//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: useMapRefresh.js
//  Description: Asks the map of the page "The FIFA presidency" again while the page is open, without leaving it: when the window is focused or the tab becomes visible
//               again (not more than once in REFRESH_MIN_GAP_MS), and every REFRESH_EVERY_MS while the tab is visible. What the page shows stays as it is until
//               the answer comes and when it fails. Never two asks at once
//

import {useEffect, useRef} from "react";
import {REFRESH_EVERY_MS, REFRESH_MIN_GAP_MS} from "@/features/fifa/refreshTiming.js";

const visible = () => document.visibilityState !== 'hidden';

// refresh(): asks the map again, resolves {ok} or {error}; onFresh(startedAt): called with the time (ms) the ask began, when it was answered: what the reader did on
// the page before that is in the map now
export const useMapRefresh = (refresh, onFresh) => {
    const last = useRef(Date.now());
    const busy = useRef(false);

    useEffect(() => {
        const run = async () => {
            if (busy.current) return;
            busy.current = true;
            const startedAt = Date.now();
            last.current = startedAt;
            try {
                const done = await refresh();
                if (done?.ok) onFresh(startedAt);
            } finally {
                busy.current = false;
            }
        };
        const timer = setInterval(() => { if (visible()) run(); }, REFRESH_EVERY_MS);
        const wake = () => { if (visible() && Date.now() - last.current >= REFRESH_MIN_GAP_MS) run(); };
        window.addEventListener('focus', wake);
        document.addEventListener('visibilitychange', wake);
        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', wake);
            document.removeEventListener('visibilitychange', wake);
        };
    }, [refresh, onFresh]);
};
