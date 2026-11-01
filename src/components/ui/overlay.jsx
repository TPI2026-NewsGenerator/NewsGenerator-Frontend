//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: overlay.jsx
//  Description: What opens above the page: a dialog, and the short notes of the toaster
//

import {useSyncExternalStore} from "react";
import {Dialog as RadixDialog} from "radix-ui";
import {X} from "lucide-react";
import {cn} from "@/lib/utils.js";
import {currentNotes, dismiss, subscribe} from "@/lib/toast.js";

// a rounded sheet over a dimmed page. wide: a reading sheet, for long texts
export const Dialog = ({open, onOpenChange, title, kicker, description, children, footer, wide = false}) => (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
        <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0"/>
            <RadixDialog.Content
                className={cn('raised fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[22px] bg-paper shadow-[0_24px_80px_rgba(0,0,0,0.22)] dark:ring-1 dark:ring-rule data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]',
                    wide ? 'max-w-6xl p-6 md:p-12' : 'max-w-lg p-6 md:p-8')}>
                <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                        {kicker && <p className="kicker kicker-rule mb-2">{kicker}</p>}
                        <RadixDialog.Title className={cn('font-semibold tracking-[-0.025em] text-balance', wide ? 'section-head' : 'text-[1.625rem] leading-tight')}>{title}</RadixDialog.Title>
                    </div>
                    <RadixDialog.Close aria-label="Close"
                                       className="-mt-1 -mr-2 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper-deep text-ink-mute transition-colors hover:text-ink">
                        <X aria-hidden className="size-4"/>
                    </RadixDialog.Close>
                </div>
                {description
                    ? <RadixDialog.Description className="caption mt-2 text-[0.9375rem]">{description}</RadixDialog.Description>
                    : <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>}
                <div className="mt-6">{children}</div>
                {footer && <div className="mt-8 flex flex-wrap justify-end gap-3">{footer}</div>}
            </RadixDialog.Content>
        </RadixDialog.Portal>
    </RadixDialog.Root>
);

const NOTE_LABEL = {info: 'Note', error: 'Error', success: 'Done'};

export const Toaster = () => {
    const notes = useSyncExternalStore(subscribe, currentNotes, currentNotes);
    return (
        <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-3 md:left-auto md:w-[24rem]">
            {notes.map(note => (
                <div key={note.id} role={note.type === 'error' ? 'alert' : 'status'}
                     className="raised pointer-events-auto w-full rounded-2xl bg-paper px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-1 ring-rule/60 animate-in fade-in-0 slide-in-from-bottom-2">
                    <div className="flex items-baseline justify-between gap-4">
                        <p className={cn('text-[0.8125rem] font-semibold', note.type === 'error' ? 'text-accent-ink' : 'text-ink')}>{NOTE_LABEL[note.type]}</p>
                        <button type="button" onClick={() => dismiss(note.id)} className="kicker cursor-pointer hover:text-ink">Close</button>
                    </div>
                    <div className="mt-1 text-[0.9375rem] leading-snug">{note.text}</div>
                </div>
            ))}
        </div>
    );
};
