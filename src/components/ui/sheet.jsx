//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: sheet.jsx
//  Description: A panel that opens from the right edge over a dimmed page, for the sheet of one thing (an association of the FIFA map) the
//               reader reads beside the page it came from. On a phone it fills the screen. The frame of the Dialog of overlay.jsx
//               (the same radius, ring and shadow, a step lighter in the dark), anchored to a side instead of the middle
//

import {Dialog as RadixDialog} from "radix-ui";
import {X} from "lucide-react";
import {cn} from "@/lib/utils.js";
import {usePhone} from "@/lib/usePhone.js";

// title: the name of the thing; kicker: what it is; description: read by screen readers when no visible one is given; onCloseAutoFocus: where
// the focus goes when the sheet closes (the default: the button that opened it)
export const Sheet = ({open, onOpenChange, title, kicker, description, children, className, onCloseAutoFocus}) => {
    const phone = usePhone();
    return (
        <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
            <RadixDialog.Portal>
                <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0"/>
                <RadixDialog.Content onCloseAutoFocus={onCloseAutoFocus}
                    className={cn('raised fixed z-50 flex flex-col bg-paper outline-none data-[state=open]:animate-in',
                        phone
                            ? 'inset-0 data-[state=open]:slide-in-from-bottom-4 data-[state=open]:fade-in-0'
                            : 'top-3 right-3 bottom-3 w-[min(34rem,calc(100vw-1.5rem))] rounded-[22px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] dark:ring-1 dark:ring-rule data-[state=open]:slide-in-from-right-8 data-[state=open]:fade-in-0',
                        className)}>
                    <div className="flex items-start justify-between gap-6 px-6 pt-6 pb-4 md:px-8 md:pt-8">
                        <div className="min-w-0">
                            {kicker && <p className="kicker kicker-rule mb-2">{kicker}</p>}
                            <RadixDialog.Title className="text-[1.625rem] leading-tight font-semibold tracking-[-0.025em] text-balance">{title}</RadixDialog.Title>
                        </div>
                        <RadixDialog.Close aria-label="Close"
                                           className="-mt-1 -mr-2 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper-deep text-ink-mute transition-colors hover:text-ink">
                            <X aria-hidden className="size-4"/>
                        </RadixDialog.Close>
                    </div>
                    <RadixDialog.Description className="sr-only">{description ?? title}</RadixDialog.Description>
                    {/* the body scrolls, the head stays */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 md:px-8">{children}</div>
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
};
