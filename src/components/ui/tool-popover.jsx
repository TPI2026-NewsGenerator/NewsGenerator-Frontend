//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: tool-popover.jsx
//  Description: A tool of a toolbar that needs a panel (a field, a list) kept to one round icon: the panel opens under it, so what
//               the page offers does not take a band of the page
//

import {useState} from "react";
import {Popover} from "radix-ui";
import {IconButton} from "@/components/ui/button.jsx";
import {cn} from "@/lib/utils.js";

// icon: the icon, drawn (<Sparkles/>); label: what it says to the screen readers and when hovered; busy: a pulsing dot on the icon while
// something goes on (the AI writing); children: the panel, or (close) => the panel when it must close itself
export const ToolPopover = ({icon, label, busy = false, className, children}) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <IconButton label={label} className="relative data-[state=open]:bg-paper-deep data-[state=open]:text-ink">
                    {icon}
                    {busy && <span aria-hidden className="absolute top-1.5 right-1.5 size-1.5 animate-pulse rounded-full bg-accent-ink"/>}
                </IconButton>
            </Popover.Trigger>
            <Popover.Portal>
                {/* a field in the panel takes the focus, so the reader can type at once */}
                <Popover.Content align="end" sideOffset={8} collisionPadding={16}
                                 onOpenAutoFocus={event => {
                                     const field = event.currentTarget.querySelector('input');
                                     if (!field) return;
                                     event.preventDefault();
                                     field.focus();
                                 }}
                                 className={cn('raised z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-paper p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-1 ring-rule/60 outline-none animate-in fade-in-0 zoom-in-[0.98]', className)}>
                    {typeof children === 'function' ? children(() => setOpen(false)) : children}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
