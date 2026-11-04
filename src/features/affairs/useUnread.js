//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: useUnread.js
//  Description: How many alerts of the affairs followed the reader has not read, for the badge of the bar. Asked when the
//               bar appears, every few minutes, and when a page says something changed (an affair followed, opened)
//

import {useEffect, useState} from "react";
import {AffairApi} from "@/features/affairs/affairApi.js";

const EVENT = 'affairs-changed';
const EVERY_MS = 5 * 60e3;

// a page followed, unfollowed or opened an affair: the bar asks again
export const changed = () => window.dispatchEvent(new Event(EVENT));

// 0 without a user, while it is not known, or when the server does not answer: the badge never says wrong
export const useUnread = (signedIn) => {
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!signedIn) return undefined;
        let current = true;
        const ask = () => AffairApi.unread()
            .then(data => { if (current) setUnread(Number.isInteger(data?.unread) ? data.unread : 0); })
            .catch(() => {});
        ask();
        const timer = setInterval(ask, EVERY_MS);
        window.addEventListener(EVENT, ask);
        return () => {
            current = false;
            clearInterval(timer);
            window.removeEventListener(EVENT, ask);
        };
    }, [signedIn]);

    return signedIn ? unread : 0;
};
