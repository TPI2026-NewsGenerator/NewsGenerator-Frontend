//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: overlay.jsx
//  Description: What opens above the page: a dialog, and the short notes of the toaster
//

import {useSyncExternalStore} from "react";
import {Dialog as RadixDialog} from "radix-ui";
import {cn} from "@/lib/utils.js";
import {currentNotes, dismiss, subscribe} from "@/lib/toast.js";

// a sheet of paper over the page, with a hairline and no shadow
export const Dialog = ({open, onOpenChange, title, description, children, footer}) => (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
        <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/35 data-[state=open]:animate-in data-[state=open]:fade-in-0"/>
            <RadixDialog.Content
                className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border border-ink bg-paper p-6 md:p-8 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                <RadixDialog.Title className="section-head">{title}</RadixDialog.Title>
                {description
                    ? <RadixDialog.Description className="caption mt-2">{description}</RadixDialog.Description>
                    : <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>}
                <div className="mt-6">{children}</div>
                {footer && <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-rule pt-5">{footer}</div>}
            </RadixDialog.Content>
        </RadixDialog.Portal>
    </RadixDialog.Root>
);

const NOTE_LABEL = {info: 'Note', error: 'Error', success: 'Done'};

export const Toaster = () => {
    const notes = useSyncExternalStore(subscribe, currentNotes, currentNotes);
    return (
        <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-3 md:left-auto md:w-[26rem]">
            {notes.map(note => (
                <div key={note.id} role={note.type === 'error' ? 'alert' : 'status'}
                     className={cn('pointer-events-auto w-full border border-ink bg-paper px-5 py-4 animate-in fade-in-0 slide-in-from-bottom-2',
                         note.type === 'error' && 'border-accent-ink')}>
                    <div className="flex items-baseline justify-between gap-4">
                        <p className={cn('kicker', note.type === 'error' && '!text-accent-ink')}>{NOTE_LABEL[note.type]}</p>
                        <button type="button" onClick={() => dismiss(note.id)} className="kicker cursor-pointer hover:text-ink">Close</button>
                    </div>
                    <div className="mt-1 text-[0.975rem] leading-snug">{note.text}</div>
                </div>
            ))}
        </div>
    );
};
