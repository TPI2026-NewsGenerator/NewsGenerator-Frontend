//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: field.jsx
//  Description: The form fields: a rounded field on a hairline, a short label over it, errors said
//               under the field
//

import {forwardRef} from "react";
import {Check, ChevronDown} from "lucide-react";
import {cn} from "@/lib/utils.js";

export const Label = ({className, ...props}) => (
    <label className={cn('mb-1.5 block text-[0.875rem] font-medium text-ink', className)} {...props}/>
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
            'h-11 w-full rounded-xl border border-rule bg-paper px-3.5 text-[1.0625rem] text-ink outline-none transition-[border-color,box-shadow] duration-200',
            'placeholder:text-ink-mute/70 focus:border-action focus:ring-4 focus:ring-action/15 focus-visible:outline-none aria-invalid:border-accent-ink disabled:opacity-50',
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
            'block w-full resize-y rounded-xl border border-rule bg-paper px-3.5 py-3 text-[1.0625rem] leading-relaxed text-ink outline-none transition-[border-color,box-shadow] duration-200',
            'placeholder:text-ink-mute/70 focus:border-action focus:ring-4 focus:ring-action/15 focus-visible:outline-none aria-invalid:border-accent-ink disabled:opacity-50',
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
                'h-11 w-full cursor-pointer appearance-none rounded-xl border border-rule bg-paper py-0 pr-9 pl-3.5 text-[1.0625rem] text-ink outline-none transition-[border-color,box-shadow] duration-200',
                'focus:border-action focus:ring-4 focus:ring-action/15 focus-visible:outline-none aria-invalid:border-accent-ink disabled:cursor-not-allowed disabled:opacity-50',
            )}
            {...props}
        >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"/>
    </div>
));
Select.displayName = 'Select';

// a native checkbox drawn as a rounded square, filled blue when ticked: the keyboard and the screen readers keep it
export const Checkbox = ({className, children, ...props}) => (
    <label className={cn('inline-flex cursor-pointer items-start gap-2.5 py-1 text-[1rem] leading-snug', className)}>
        <span className="relative mt-[0.2em] inline-flex size-[1.05rem] shrink-0">
            <input type="checkbox" className={cn(
                'peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-[5px] border border-ink-mute/60 bg-paper transition-colors duration-200',
                'checked:border-action checked:bg-action hover:border-ink-mute focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
                'disabled:cursor-not-allowed disabled:opacity-45',
            )} {...props}/>
            <Check aria-hidden strokeWidth={3} className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"/>
        </span>
        <span>{children}</span>
    </label>
);

// each choice a pill of its own, the ones ticked tinted blue: choices read as answers to pick
const CHIP = 'rounded-full border border-rule px-3.5 py-1.5 transition-colors duration-200 hover:border-ink-mute has-checked:border-action has-checked:bg-action/8';

// a group of checkboxes held as a list of values. chips: each choice framed; selectAll: a button ticks
// them all, then unticks them all
export const CheckboxGroup = ({legend, options, value, onChange, className, invalid, error, help, chips = false, selectAll = false}) => {
    const toggle = (option, checked) => onChange(checked ? [...value, option] : value.filter(other => other !== option));
    const all = options.length > 0 && options.every(option => value.includes(option.value));
    return (
        <fieldset className={cn('min-w-0 border-0 p-0', className)} aria-invalid={invalid || undefined}>
            {legend && <legend className="mb-2 text-[0.875rem] font-medium text-ink">{legend}</legend>}
            {selectAll && options.length > 1 && (
                <button type="button" className="link mb-3 cursor-pointer text-[0.8125rem]"
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
