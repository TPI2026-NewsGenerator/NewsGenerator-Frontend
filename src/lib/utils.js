//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: utils.js
//  Description: Class names joined, the later Tailwind classes winning over the earlier ones, and
//               the address of a feed as the reader is shown it
//

import {clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export const cn = (...inputs) => twMerge(clsx(inputs));

// A site without a feed is read from its web page through our RSS-Bridge: its address is ours,
// meaningless for the reader, so it is said in words instead
export const feedAddress = (url) => /[?&]action=display\b/.test(url ?? '') ? 'read from its web page' : url;
