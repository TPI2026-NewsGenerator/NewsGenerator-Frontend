//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: button-class.js
//  Description: The look of the buttons of the pages (see button.jsx), for a link that does what a
//               button would (the e-mail of the briefing opens the mail app)
//

import {cn} from "@/lib/utils.js";

const VARIANTS = {
    primary: 'border border-ink text-ink hover:bg-ink hover:text-paper',
    quiet: 'border border-rule text-ink hover:border-ink',
    subtle: 'border border-transparent text-ink-mute hover:text-ink',
    link: 'link border-0 !px-0 !h-auto',
};

const SIZES = {
    sm: 'h-8 px-3 text-[0.9375rem]',
    md: 'h-10 px-5 text-[1.0625rem]',
};

export const buttonClass = ({variant = 'quiet', size = 'md', className} = {}) => cn(
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 bg-transparent font-semibold tracking-[0.06em] [font-variant-caps:all-small-caps] transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-inherit',
    SIZES[size], VARIANTS[variant], className,
);
