//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: useFollowing.js
//  Description: The news of what the profile follows, asked of the server when the tab of the page is
//               opened and again when the number wanted for each, or the profile, changes: not part of
//               the briefing written. A long list is searched in background, minutes for 300 names, and
//               asked again every few seconds until it ends
//

import {useEffect, useRef, useState} from "react";
import {BriefingApi} from "@/features/briefing/api/briefingApi.js";

const POLL_MS = 2000;

// active: the tab is opened; limit: 10 to 100; profile: the one read; expired(data): the session check.
// {groups, partial, progress, error, loading}: groups [{term, qid, count, hours, limit, news}] once read for
// this limit and profile, null before; partial: the search stopped before every name went back as far as
// needed; progress {finished, total}: the names done while it runs; the error of the call, until another one is asked
export const useFollowing = (active, limit, profile, expired) => {
    const key = `${profile ?? ''} ${limit}`;
    const [answer, setAnswer] = useState({key: null, groups: null, partial: false, error: null, errorKey: null, progress: null, progressKey: null});
    // the last one asked: an answer to a number or a profile no longer wanted is left out
    const asked = useRef(null);
    const timer = useRef(null);

    useEffect(() => () => clearTimeout(timer.current), []);

    useEffect(() => {
        if (!active || asked.current === key) return;
        asked.current = key;
        clearTimeout(timer.current);
        const ask = () => BriefingApi.following(limit)
            .then(data => {
                if (asked.current !== key || expired?.(data)) return;
                if (data.error) throw new Error(data.error);
                if (data.status === 'running') {
                    setAnswer(previous => ({...previous, progress: data.progress ?? null, progressKey: key}));
                    timer.current = setTimeout(ask, POLL_MS);
                    return;
                }
                setAnswer({key, groups: data.groups, partial: Boolean(data.partial), error: null, errorKey: null, progress: null, progressKey: null});
            })
            .catch(err => {
                if (asked.current !== key) return;
                // asked again when the tab is opened again
                asked.current = null;
                setAnswer(previous => ({...previous, error: err.message, errorKey: key}));
            });
        ask();
    }, [active, key, limit, expired]);

    const loaded = answer.key === key;
    const error = answer.errorKey === key ? answer.error : null;
    return {groups: loaded ? answer.groups : null, partial: loaded && answer.partial, error, loading: !loaded && !error,
        progress: answer.progressKey === key ? answer.progress : null};
};
