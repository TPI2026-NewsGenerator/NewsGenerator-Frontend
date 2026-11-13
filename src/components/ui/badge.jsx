//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: badge.jsx
//  Description: A badge: a short word with an icon, in a pill whose tone says what kind of word it is. A button when it leads somewhere
//               (the badges of the glance of a card), a plain label when it does not (the marks of a position)
//

import {cn} from "@/lib/utils.js";

// tone 'warn' (orange) for what is said against the news or what the article itself says is not confirmed, 'official' (green) for
// what a party said itself, 'uncertain' for what is known to be about the subject but not known to be a position: an outline and
// no fill, dotted as the ring it has on the map of the FIFA presidency, so it is never read as a verdict; 'quiet' for a plain note
const BADGE_TONES = {
    warn: 'border-accent-ink/30 bg-accent-ink/10 text-accent-ink',
    official: 'border-official/30 bg-official/10 text-official',
    uncertain: 'border-dashed border-ink-mute bg-transparent text-ink-mute',
    quiet: 'border-transparent bg-paper-deep text-ink-mute',
};
// what a badge that is a button does under the pointer
const HOVER = {
    warn: 'hover:bg-accent-ink/15',
    official: 'hover:bg-official/15',
    uncertain: 'hover:text-ink',
    quiet: 'hover:text-ink',
};

const BADGE = 'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors';

// onClick: the badge is a button; without it a label
export const Badge = ({icon, tone, onClick, className, children, ...props}) => onClick
    ? (
        <button type="button" onClick={onClick} className={cn(BADGE, 'cursor-pointer', BADGE_TONES[tone], HOVER[tone], className)} {...props}>
            {icon}
            {children}
        </button>
    )
    : (
        <span className={cn(BADGE, BADGE_TONES[tone], className)} {...props}>
            {icon}
            {children}
        </span>
    );
