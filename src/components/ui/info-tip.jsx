//
//  Author: Fabian Rostello
//  Date: 03.10.2026
//  File: info-tip.jsx
//  Description: A small "i" saying what a label means (the Tooltip of shadcn, on Radix): shown when
//               hovered or focused, and on a tap, where nothing is hovered. A title attribute said it
//               on a computer only, and nothing showed it was there
//

import {useState} from "react";
import {Tooltip} from "radix-ui";

// label: what it explains, read by the screen readers on the button; children: the explanation
export const InfoTip = ({label, children}) => {
    const [open, setOpen] = useState(false);

    return (
        <Tooltip.Provider delayDuration={150}>
            <Tooltip.Root open={open} onOpenChange={setOpen}>
                <Tooltip.Trigger asChild>
                    <button type="button" aria-label={`What “${label}” means`} onClick={() => setOpen(!open)}
                            className="ml-1.5 inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full bg-paper-deep align-[0.1em] text-[0.625rem] leading-none font-semibold text-ink-mute ring-1 ring-rule transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-action">
                        i
                    </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content side="top" sideOffset={6} collisionPadding={16}
                                     className="z-50 max-w-[34ch] rounded-xl bg-ink px-3 py-2 text-[0.8125rem] leading-snug text-paper shadow-lg">
                        {children}
                        <Tooltip.Arrow className="fill-ink"/>
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
};
