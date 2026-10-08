//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: button.jsx
//  Description: The buttons of the pages: ink outlined, never a filled coloured block
//

import {forwardRef} from "react";
import {cn} from "@/lib/utils.js";
import {buttonClass} from "./button-class.js";

// the variants and sizes are in button-class.js
// loading: the button is disabled and a running rule tells it works
export const Button = forwardRef(({variant = 'quiet', size = 'md', loading = false, disabled, className, children, type = 'button', ...props}, ref) => (
    <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={buttonClass({variant, size, className})}
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
