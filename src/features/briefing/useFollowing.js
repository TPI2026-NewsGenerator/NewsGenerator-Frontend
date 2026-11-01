//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: useFollowing.js
//  Description: The news of what the profile follows, asked of the server when the tab of the page is
//               opened and again when the number wanted for each, or the profile, changes: not part of
//               the briefing written
//

import {useEffect, useRef, useState} from "react";
import {BriefingApi} from "@/features/briefing/api/briefingApi.js";

// active: the tab is opened; limit: 10 to 100; profile: the one read; expired(data): the session check.
// {groups, error, loading}: groups [{term, qid, count, hours, limit, news}] once read for this limit and
// profile, null before; the error of the call, until another one is asked
export const useFollowing = (active, limit, profile, expired) => {
    const key = `${profile ?? ''} ${limit}`;
    const [answer, setAnswer] = useState({key: null, groups: null, error: null, errorKey: null});
    // the last one asked: an answer to a number or a profile no longer wanted is left out
    const asked = useRef(null);

    useEffect(() => {
        if (!active || asked.current === key) return;
        asked.current = key;
        BriefingApi.following(limit)
            .then(data => {
                if (asked.current !== key || expired?.(data)) return;
                if (data.error) throw new Error(data.error);
                setAnswer({key, groups: data.groups, error: null, errorKey: null});
            })
            .catch(err => {
                if (asked.current !== key) return;
                // asked again when the tab is opened again
                asked.current = null;
                setAnswer(previous => ({...previous, error: err.message, errorKey: key}));
            });
    }, [active, key, limit, expired]);

    const loaded = answer.key === key;
    const error = answer.errorKey === key ? answer.error : null;
    return {groups: loaded ? answer.groups : null, error, loading: !loaded && !error};
};
