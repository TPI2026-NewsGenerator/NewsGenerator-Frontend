//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: ColumnFilter.jsx
//  Description: The filter of a column of a table: a button in the head of the column that opens a popover of checkboxes, one fieldset for each
//               filter the column has (the column Position has three). A row passes when it has any of the values chosen of a filter; the filters
//               combine with AND. FilterOptions is also what the sheet of filters of a phone is made of
//

import {Popover} from "radix-ui";
import {ListFilter} from "lucide-react";
import {Checkbox} from "@/components/ui/field.jsx";
import {cn} from "@/lib/utils.js";

// def: {label, options: [{value, label}]}; values: the ones chosen; onChange(values)
export const FilterOptions = ({def, values, onChange}) => (
    <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-1 text-[0.8125rem] font-medium text-ink">{def.label}</legend>
        {def.options.map(option => (
            <div key={option.value}>
                <Checkbox checked={values.includes(option.value)} className="!text-[0.9375rem]"
                          onChange={event => onChange(event.target.checked ? [...values, option.value] : values.filter(one => one !== option.value))}>
                    {option.label}
                </Checkbox>
            </div>
        ))}
    </fieldset>
);

// label: the name of the column; keys: its filters; defs: all the filters of the table; selected: {key: values}; onFilter(key, values)
export const ColumnFilter = ({label, keys, defs, selected, onFilter}) => {
    const active = keys.reduce((total, key) => total + (selected[key]?.length ?? 0), 0);
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button type="button" aria-label={`Filter ${label}${active > 0 ? `, ${active} chosen` : ''}`}
                        className={cn('relative inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-paper-deep',
                            active > 0 ? 'text-action-text' : 'text-ink-mute hover:text-ink')}>
                    <ListFilter aria-hidden className="size-3.5"/>
                    {active > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 inline-flex min-w-3.5 items-center justify-center rounded-full bg-action px-1 text-[0.625rem] leading-3.5 font-semibold text-white">{active}</span>}
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content align="start" sideOffset={6} collisionPadding={12}
                                 className="raised z-[60] w-64 space-y-4 rounded-2xl bg-paper p-4 font-normal shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-rule/60 outline-none dark:ring-rule">
                    {keys.map(key => <FilterOptions key={key} def={defs[key]} values={selected[key] ?? []} onChange={values => onFilter(key, values)}/>)}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
