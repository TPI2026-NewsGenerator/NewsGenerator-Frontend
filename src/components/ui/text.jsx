//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: text.jsx
//  Description: The small editorial devices: a meta mark in small caps, a note set on a rule, and
//               the running rule shown while the server works
//

import {cn} from "@/lib/utils.js";

// what used to be a coloured tag: a word in small caps. tone 'accent' is kept for what warns
export const Meta = ({tone, className, ...props}) => (
    <span
        className={cn(
            'text-[0.9375rem] font-semibold tracking-[0.08em] [font-variant-caps:all-small-caps]',
            tone === 'accent' ? 'text-accent-ink' : tone === 'ink' ? 'text-ink' : 'text-ink-mute',
            className,
        )}
        {...props}
    />
);

// a row of meta marks, separated by a thin dot
export const MetaLine = ({className, children}) => (
    <div className={cn('flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 [&>*+*]:before:mr-2.5 [&>*+*]:before:text-rule [&>*+*]:before:content-["·"]', className)}>
        {children}
    </div>
);

const NOTE_LABEL = {info: 'Note', error: 'Error', success: 'Done'};

// a note of the page, on a rule in the margin: never a coloured box
export const Notice = ({type = 'info', title, onClose, className, children}) => (
    <div role={type === 'error' ? 'alert' : 'status'}
         className={cn('border-l-2 py-1 pl-5', type === 'error' ? 'border-accent-ink' : 'border-ink', className)}>
        <div className="flex items-baseline justify-between gap-4">
            <p className={cn('kicker', type === 'error' && '!text-accent-ink')}>{title ?? NOTE_LABEL[type]}</p>
            {onClose && (
                <button type="button" onClick={onClose} className="kicker cursor-pointer hover:text-ink">Dismiss</button>
            )}
        </div>
        <div className="mt-1 max-w-[66ch] text-[1rem] leading-relaxed">{children}</div>
    </div>
);

// the server works: a rule runs, the step is said in italic
export const Working = ({children, className}) => (
    <div role="status" className={cn('max-w-[50ch]', className)}>
        <div className="h-px w-full bg-rule">
            <div className="working-rule w-full"/>
        </div>
        <p className="caption mt-3 italic">{children}</p>
    </div>
);
