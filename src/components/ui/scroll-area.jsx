//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: scroll-area.jsx
//  Description: A frame of a fixed height that scrolls, for the long lists (the ScrollArea of shadcn,
//               on Radix): a reader with 60 sources found had a page of them
//

import {ScrollArea as RadixScrollArea} from "radix-ui";
import {cn} from "@/lib/utils.js";

// the list inside scrolls past 'className' height (max-h-…), with a hairline scrollbar; the frame can
// be reached with the keyboard and named for the screen readers (label)
export const ScrollFrame = ({label, className, children}) => (
    <RadixScrollArea.Root type="auto" className="relative overflow-hidden border-y border-rule">
        <RadixScrollArea.Viewport tabIndex={0} aria-label={label}
                                  className={cn('size-full max-h-[32rem] overscroll-contain pr-4 outline-none focus-visible:ring-1 focus-visible:ring-ink', className)}>
            {children}
        </RadixScrollArea.Viewport>
        <RadixScrollArea.Scrollbar orientation="vertical" className="flex w-2 touch-none p-px select-none">
            <RadixScrollArea.Thumb className="relative flex-1 rounded-full bg-ink/45 hover:bg-ink/70"/>
        </RadixScrollArea.Scrollbar>
        <RadixScrollArea.Corner/>
    </RadixScrollArea.Root>
);
