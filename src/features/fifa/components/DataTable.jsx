//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: DataTable.jsx
//  Description: A table of the page "The FIFA presidency": a real <table>, each sortable column a <th scope="col" aria-sort> whose button cycles none, ascending,
//               descending (a visible arrow, the keyboard works), a filter in the head of the columns that have one, a clear empty state. The rows are
//               given sorted and filtered: the table only draws them
//

import {Fragment} from "react";
import {ArrowDown, ArrowUp, ArrowUpDown} from "lucide-react";
import {ColumnFilter} from "@/features/fifa/components/ColumnFilter.jsx";
import {ariaSortOf} from "@/features/fifa/table.js";
import {cn} from "@/lib/utils.js";

const ARROWS = {ascending: ArrowUp, descending: ArrowDown, none: ArrowUpDown};

// columns: [{key, label, sortable (default true), filters: [keys], className, render(item)}]; items: the rows; itemKey(item); sort / dir / onSort(key);
// defs / selected / onFilter(key, values): the filters of the columns; renderExtra(item): a row under a row (a confederation opens its members);
// empty: what to say when no row is left (with a button that clears the filters)
export const DataTable = ({caption, columns, items, itemKey, sort, dir, onSort, defs, selected, onFilter, renderExtra, rowClass, empty}) => (
    <div className="overflow-x-auto rounded-2xl border border-rule">
        <table className="w-full min-w-[52rem] border-collapse text-left text-[0.875rem]">
            <caption className="sr-only">{caption}</caption>
            <thead className="border-b border-rule bg-paper-deep/60 text-[0.8125rem] font-medium text-ink-mute">
                <tr>
                    {columns.map(column => {
                        const sortable = column.sortable !== false;
                        const state = ariaSortOf(sort, dir, column.key);
                        const Arrow = ARROWS[state];
                        return (
                            <th key={column.key} scope="col" aria-sort={sortable ? state : undefined} className={cn('px-3 py-2.5 align-bottom', column.className)}>
                                <div className="flex items-center gap-0.5">
                                    {sortable
                                        ? (
                                            <button type="button" onClick={() => onSort(column.key)}
                                                    className={cn('inline-flex cursor-pointer items-center gap-1 rounded-md py-1 text-left leading-tight transition-colors hover:text-ink', state !== 'none' && 'text-ink')}>
                                                {column.label}
                                                <Arrow aria-hidden className={cn('size-3.5 shrink-0', state === 'none' && 'opacity-40')}/>
                                            </button>
                                        )
                                        : <span className="py-1 leading-tight">{column.label}</span>}
                                    {column.filters && <ColumnFilter label={column.label} keys={column.filters} defs={defs} selected={selected} onFilter={onFilter}/>}
                                </div>
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody>
                {items.length === 0 && (
                    <tr><td colSpan={columns.length} className="px-3 py-12 text-center text-[1rem] text-ink-mute">{empty}</td></tr>
                )}
                {items.map(item => (
                    <Fragment key={itemKey(item)}>
                        <tr className={cn('border-b border-rule align-top last:border-b-0', rowClass?.(item))}>
                            {columns.map(column => <td key={column.key} className={cn('px-3 py-3', column.className)}>{column.render(item)}</td>)}
                        </tr>
                        {renderExtra?.(item)}
                    </Fragment>
                ))}
            </tbody>
        </table>
    </div>
);
