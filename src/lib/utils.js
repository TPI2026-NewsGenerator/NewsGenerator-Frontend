//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: utils.js
//  Description: Class names joined, the later Tailwind classes winning over the earlier ones, and
//               the address of a feed as the reader is shown it, and the filter of a list
//

import {clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export const cn = (...inputs) => twMerge(clsx(inputs));

// A site without a feed is read from its web page through our RSS-Bridge: its address is ours, so the
// server sends none (url null) for the sources of the reader, and it is said in words instead
export const feedAddress = (url) => url === null || /[?&]action=display\b/.test(url ?? '') ? 'read from its web page' : url;

// Where a source reads from, short enough to tell the feeds of one site apart: "/rss/sport" when the feed
// is on the site itself, else its host and its route ("feeds.bbci.co.uk/sport/rss.xml"). The route is
// kept as it is, "/rss" and "/rss/" are two addresses. A site read from its page has none
export const feedRoute = (url, site) => {
    if (url === null || /[?&]action=display\b/.test(url ?? '')) return 'read from its web page';
    try {
        const {host, pathname, search} = new URL(url);
        const bare = (name) => String(name ?? '').replace(/^www\./i, '').toLowerCase();
        return `${bare(host) === bare(site) ? '' : host}${pathname}${search}`;
    } catch {
        return url;
    }
};

// The share of some news among others as the pages write it: "11.8%", and "<0.1%" for a few among many
export const percent = (part, whole) => {
    const share = 100 * part / whole;
    return share > 0 && share < 0.1 ? '<0.1%' : `${share.toLocaleString('en-GB', {maximumFractionDigits: 1})}%`;
};

const folded = (text) => String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// whether every word of a filter the reader typed is in one of these texts, whatever the case and the
// accents ("equipe" finds "lequipe.fr"); an empty filter keeps everything
export const matchesQuery = (query, ...texts) => {
    const words = folded(query).split(/\s+/).filter(Boolean);
    const haystack = texts.map(folded).join(' ');
    return words.every(word => haystack.includes(word));
};
