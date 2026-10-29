//
//  Author: Fabian Rostello
//  Date: 29.10.2026
//  File: useClearance.js
//  Description: Room a list needs under a menu hanging beside the page (see Opening, hanging): the menu
//               pushes nothing when it appears, the list starts under its end
//

import {useEffect} from "react";

// Adds the space needed above `listRef` (as its padding) so that it starts under `asideRef`: none where the
// menu is not hanging (small screens: it is in the flow there) or ends above the list already. Measured
// again when the menu or the page changes size. Written on the element itself, not through a state: a page
// rendered again for it made the tabs of Radix render again, over and over
export const useClearance = (asideRef, listRef, gap = 24) => {
    useEffect(() => {
        const measure = () => {
            const aside = asideRef.current;
            const list = listRef.current;
            if (!list) return;
            let missing = 0;
            if (aside && getComputedStyle(aside).position === 'absolute') {
                // the room is the padding of the list: its box starts where it did, the cards start after it
                missing = Math.max(0, Math.ceil(aside.getBoundingClientRect().bottom + gap - list.getBoundingClientRect().top));
            }
            const padding = `${missing}px`;
            if (list.style.paddingTop !== padding) list.style.paddingTop = padding;
        };
        measure();
        const observer = new ResizeObserver(measure);
        for (const element of [asideRef.current, listRef.current, document.body]) if (element) observer.observe(element);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    });
};
