//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: button.jsx
//  Description: The buttons of the pages: ink outlined, never a filled coloured block
//

import {forwardRef} from "react";
import {cn} from "@/lib/utils.js";

const VARIANTS = {
    primary: 'border border-ink text-ink hover:bg-ink hover:text-paper',
    quiet: 'border border-rule text-ink hover:border-ink',
    subtle: 'border border-transparent text-ink-mute hover:text-ink',
    link: 'link border-0 !px-0 !h-auto',
};

const SIZES = {
    sm: 'h-8 px-3 text-[0.9375rem]',
    md: 'h-10 px-5 text-[1.0625rem]',
};

// loading: the button is disabled and a running rule tells it works
export const Button = forwardRef(({variant = 'quiet', size = 'md', loading = false, disabled, className, children, type = 'button', ...props}, ref) => (
    <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
            'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 bg-transparent font-semibold tracking-[0.06em] [font-variant-caps:all-small-caps] transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-inherit',
            SIZES[size], VARIANTS[variant], className,
        )}
        {...props}
    >
        {children}
        {loading && <span aria-hidden className="working-rule absolute inset-x-0 bottom-0"/>}
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
            'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center border border-transparent text-ink-mute transition-colors hover:border-rule hover:text-ink',
            'aria-pressed:border-ink aria-pressed:text-accent-ink disabled:cursor-not-allowed disabled:opacity-45',
            className,
        )}
        {...props}
    >
        {children}
    </button>
));
IconButton.displayName = 'IconButton';
