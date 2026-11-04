//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: tool-popover.jsx
//  Description: A tool of a toolbar that needs a panel (a field, a list) kept to one round icon: the panel opens under it, so what
//               the page offers does not take a band of the page
//

import {forwardRef, useState} from "react";
import {Popover} from "radix-ui";
import {IconButton} from "@/components/ui/button.jsx";
import {cn} from "@/lib/utils.js";

// A round icon of a toolbar; on a phone, where the toolbar has the room, a button with its words (the user, 05.11.2026). children: the icon,
// drawn (<Link2/>); text: the words; label: what it says to the screen readers and when hovered (the words are not read twice)
export const ToolButton = forwardRef(({text, className, children, ...props}, ref) => (
    <IconButton ref={ref} className={cn('max-md:w-auto max-md:gap-1.5 max-md:bg-paper-deep max-md:px-2.5 max-md:text-[0.8125rem] max-md:text-ink', className)} {...props}>
        {children}
        {text && <span aria-hidden className="md:hidden">{text}</span>}
    </IconButton>
));
ToolButton.displayName = 'ToolButton';

// icon: the icon, drawn (<Link2/>); text: its words on a phone; label: what it says to the screen readers and when hovered; children: the
// panel, or (close) => the panel when it must close itself
export const ToolPopover = ({icon, text, label, className, children}) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <ToolButton label={label} text={text} className="relative data-[state=open]:bg-paper-deep data-[state=open]:text-ink">
                    {icon}
                </ToolButton>
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
