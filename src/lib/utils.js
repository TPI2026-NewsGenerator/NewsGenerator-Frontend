//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: utils.js
//  Description: Class names joined, the later Tailwind classes winning over the earlier ones
//

import {clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export const cn = (...inputs) => twMerge(clsx(inputs));
