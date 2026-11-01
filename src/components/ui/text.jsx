//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: text.jsx
//  Description: The small devices of the text: a meta mark, a note of the page, and the bar shown while
//               the server works
//

import {cn} from "@/lib/utils.js";

// what used to be a coloured tag: a small quiet word. tone 'accent' is kept for what warns
export const Meta = ({tone, className, ...props}) => (
    <span
        className={cn(
            'text-[0.8125rem] font-medium',
            tone === 'accent' ? 'text-accent-ink' : tone === 'ink' ? 'text-ink' : 'text-ink-mute',
            className,
        )}
        {...props}
    />
);

// a row of meta marks, separated by a thin dot
export const MetaLine = ({className, children}) => (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5 [&>*+*]:before:mr-2 [&>*+*]:before:text-rule [&>*+*]:before:content-["·"]', className)}>
        {children}
    </div>
);

const NOTE_LABEL = {info: 'Note', error: 'Error', success: 'Done'};

// a note of the page, on the one grey of the page
export const Notice = ({type = 'info', title, onClose, className, children}) => (
    <div role={type === 'error' ? 'alert' : 'status'}
         className={cn('rounded-xl bg-paper-deep px-5 py-4', className)}>
        <div className="flex items-baseline justify-between gap-4">
            <p className={cn('text-[0.875rem] font-semibold', type === 'error' ? 'text-accent-ink' : 'text-ink')}>{title ?? NOTE_LABEL[type]}</p>
            {onClose && (
                <button type="button" onClick={onClose} className="kicker cursor-pointer hover:text-ink">Dismiss</button>
            )}
        </div>
        <div className="mt-1 max-w-[66ch] text-[0.9375rem] leading-relaxed text-ink">{children}</div>
    </div>
);

// the server works: a bar runs on a hairline, the step is said under it
export const Working = ({children, className}) => (
    <div role="status" className={cn('max-w-[50ch]', className)}>
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-paper-deep">
            <div className="working-rule"/>
        </div>
        <p className="caption mt-3">{children}</p>
    </div>
);
