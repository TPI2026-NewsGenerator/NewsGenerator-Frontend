//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: useFollowed.js
//  Description: How many affairs the reader follows, for the tab "Affairs" of the briefing: asked when the page opens and
//               when a page says something changed (an affair followed or stopped)
//

import {useEffect, useState} from "react";
import {AffairApi} from "@/features/affairs/affairApi.js";
import {CHANGED} from "@/features/affairs/useUnread.js";

// 0 until the answer, and when the server does not give one: the tab then shows only when the briefing has an affair
export const useFollowed = (signedIn) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!signedIn) return undefined;
        let current = true;
        const ask = () => AffairApi.list()
            .then(data => { if (current) setCount(Array.isArray(data?.affairs) ? data.affairs.length : 0); })
            .catch(() => {});
        ask();
        window.addEventListener(CHANGED, ask);
        return () => {
            current = false;
            window.removeEventListener(CHANGED, ask);
        };
    }, [signedIn]);

    return signedIn ? count : 0;
};
