//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: settings-pill.jsx
//  Description: A setting changed now and then (the days of the news, the cards of a briefing) kept out of
//               a toolbar: a grey pill saying its value, opening a panel with its controls
//

import {Popover} from "radix-ui";
import {SlidersHorizontal} from "lucide-react";

// label: what the pill shows ("2 days · 10 cards"); ariaLabel: what it says to the screen readers;
// title: the head of the panel, none by default; children: its controls
export const SettingsPill = ({label, ariaLabel, title, children}) => (
    <Popover.Root>
        <Popover.Trigger aria-label={ariaLabel}
                         className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full bg-paper-deep px-3.5 text-[0.8125rem] whitespace-nowrap text-ink transition-colors duration-200 hover:bg-rule/60 data-[state=open]:bg-rule/60">
            <SlidersHorizontal aria-hidden className="size-3.5 text-ink-mute" strokeWidth={1.75}/>
            {label}
        </Popover.Trigger>
        <Popover.Portal>
            {/* opened on its first control: on the first "i", the focus opened its tip over the panel */}
            <Popover.Content align="end" sideOffset={8} collisionPadding={16}
                             onOpenAutoFocus={event => {
                                 event.preventDefault();
                                 event.currentTarget.querySelector('[role="slider"], [role="radio"], input, button:not([aria-label^="What"])')?.focus();
                             }}
                             className="raised z-50 w-72 space-y-5 rounded-2xl bg-paper p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-1 ring-rule/60 outline-none animate-in fade-in-0 zoom-in-[0.98]">
                {title && <p className="text-[0.9375rem] font-semibold tracking-[-0.01em]">{title}</p>}
                {children}
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>
);
