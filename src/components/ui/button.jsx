//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: button.jsx
//  Description: The buttons of the pages: one filled blue for the action of a place, a grey pill for the
//               others, plain text for what is quiet
//

import {forwardRef} from "react";
import {Loader2} from "lucide-react";
import {cn} from "@/lib/utils.js";

const VARIANTS = {
    primary: 'bg-action text-white hover:bg-action-hover',
    quiet: 'bg-paper-deep text-ink hover:bg-rule/60',
    subtle: 'bg-transparent text-ink-mute hover:text-ink',
    link: 'link bg-transparent !px-0 !h-auto',
};

const SIZES = {
    sm: 'h-8 px-3.5 text-[0.875rem]',
    md: 'h-10 px-5 text-[0.9375rem]',
};

// loading: the button is disabled and a turning mark tells it works
export const Button = forwardRef(({variant = 'quiet', size = 'md', loading = false, disabled, className, children, type = 'button', ...props}, ref) => (
    <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
            'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-normal whitespace-nowrap transition-colors duration-200',
            'disabled:cursor-not-allowed disabled:opacity-40',
            SIZES[size], VARIANTS[variant], className,
        )}
        {...props}
    >
        {loading && <Loader2 aria-hidden className="size-4 animate-spin"/>}
        {children}
    </button>
));
Button.displayName = 'Button';

// an icon only button: its label is read by screen readers, and shown when hovered
export const IconButton = forwardRef(({label, pressed, className, children, ...props}, ref) => (
    <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        title={props.title ?? label}
        className={cn(
            'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-mute transition-colors duration-200 hover:bg-paper-deep hover:text-ink',
            'aria-pressed:bg-paper-deep aria-pressed:text-action-text disabled:cursor-not-allowed disabled:opacity-40',
            className,
        )}
        {...props}
    >
        {children}
    </button>
));
IconButton.displayName = 'IconButton';
