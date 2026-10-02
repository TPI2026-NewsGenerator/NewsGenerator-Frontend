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

// A site without a feed is read from its web page through our RSS-Bridge: its address is ours,
// meaningless for the reader, so it is said in words instead
export const feedAddress = (url) => /[?&]action=display\b/.test(url ?? '') ? 'read from its web page' : url;

const folded = (text) => String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// whether every word of a filter the reader typed is in one of these texts, whatever the case and the
// accents ("equipe" finds "lequipe.fr"); an empty filter keeps everything
export const matchesQuery = (query, ...texts) => {
    const words = folded(query).split(/\s+/).filter(Boolean);
    const haystack = texts.map(folded).join(' ');
    return words.every(word => haystack.includes(word));
};
