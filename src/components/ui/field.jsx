//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: field.jsx
//  Description: The form fields: text on a rule, labels in small caps, errors said under the field
//

import {forwardRef} from "react";
import {Check} from "lucide-react";
import {cn} from "@/lib/utils.js";

export const Label = ({className, ...props}) => (
    <label className={cn('kicker block text-ink', className)} {...props}/>
);

export const Help = ({className, ...props}) => (
    <p className={cn('caption mt-2 max-w-[60ch]', className)} {...props}/>
);

export const FieldError = ({children, id}) => children
    ? <p id={id} role="alert" className="caption mt-2 !text-accent-ink">{children}</p>
    : null;

export const Input = forwardRef(({className, invalid, ...props}, ref) => (
    <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
            'h-11 w-full border-0 border-b border-ink/40 bg-transparent px-0 text-[1.0625rem] text-ink outline-none transition-colors',
            'placeholder:text-ink-mute/70 focus:border-ink focus-visible:outline-none aria-invalid:border-accent-ink disabled:opacity-50',
            className,
        )}
        {...props}
    />
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({className, invalid, ...props}, ref) => (
    <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
            'block w-full resize-y border border-rule bg-transparent p-4 text-[1.0625rem] leading-relaxed text-ink outline-none transition-colors',
            'placeholder:text-ink-mute/70 focus:border-ink focus-visible:outline-none aria-invalid:border-accent-ink disabled:opacity-50',
            className,
        )}
        {...props}
    />
));
Textarea.displayName = 'Textarea';

// a native select, so the phone shows its own list; options: [{value, label}]
export const Select = forwardRef(({className, options = [], placeholder, invalid, ...props}, ref) => (
    <div className={cn('relative', className)}>
        <select
            ref={ref}
            aria-invalid={invalid || undefined}
            className={cn(
                'h-11 w-full cursor-pointer appearance-none border-0 border-b border-ink/40 bg-transparent py-0 pr-7 pl-0 text-[1.0625rem] text-ink outline-none',
                'focus:border-ink focus-visible:outline-none aria-invalid:border-accent-ink disabled:cursor-not-allowed disabled:opacity-50',
            )}
            {...props}
        >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[0.7rem] text-ink-mute">▼</span>
    </div>
));
Select.displayName = 'Select';

// a native checkbox drawn as an ink square, ticked in paper: the keyboard and the screen readers keep it
export const Checkbox = ({className, children, ...props}) => (
    <label className={cn('inline-flex cursor-pointer items-start gap-2.5 py-1 text-[1rem] leading-snug', className)}>
        <span className="relative mt-[0.2em] inline-flex size-[1.05rem] shrink-0">
            <input type="checkbox" className={cn(
                'peer absolute inset-0 m-0 size-full cursor-pointer appearance-none border border-ink/50 bg-transparent transition-colors',
                'checked:border-ink checked:bg-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink',
                'disabled:cursor-not-allowed disabled:opacity-45',
            )} {...props}/>
            <Check aria-hidden strokeWidth={3} className="pointer-events-none absolute inset-0 m-auto size-3 text-paper opacity-0 transition-opacity peer-checked:opacity-100"/>
        </span>
        <span>{children}</span>
    </label>
);

// each choice in a frame of its own, the ones ticked in ink: choices read as answers to pick
const CHIP = 'border border-rule px-3 py-2 transition-colors hover:border-ink has-checked:border-ink has-checked:bg-accent';

// a group of checkboxes held as a list of values. chips: each choice framed; selectAll: a button ticks
// them all, then unticks them all
export const CheckboxGroup = ({legend, options, value, onChange, className, invalid, error, help, chips = false, selectAll = false}) => {
    const toggle = (option, checked) => onChange(checked ? [...value, option] : value.filter(other => other !== option));
    const all = options.length > 0 && options.every(option => value.includes(option.value));
    return (
        <fieldset className={cn('min-w-0 border-0 p-0', className)} aria-invalid={invalid || undefined}>
            {legend && <legend className="kicker mb-2 text-ink">{legend}</legend>}
            {selectAll && options.length > 1 && (
                <button type="button" className="caption mb-3 cursor-pointer underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
                        aria-label={`${all ? 'Untick all' : 'Tick all'}: ${legend}`}
                        onClick={() => onChange(all ? [] : options.map(option => option.value))}>
                    {all ? 'Untick all' : 'Tick all'}
                </button>
            )}
            <div className={chips ? 'flex flex-wrap gap-2' : 'flex flex-wrap gap-x-6 gap-y-1'}>
                {options.map(option => (
                    <Checkbox key={option.value} checked={value.includes(option.value)} className={chips ? CHIP : undefined}
                              onChange={event => toggle(option.value, event.target.checked)}>
                        {option.label}
                    </Checkbox>
                ))}
            </div>
            {help && <Help>{help}</Help>}
            <FieldError>{error}</FieldError>
        </fieldset>
    );
};
