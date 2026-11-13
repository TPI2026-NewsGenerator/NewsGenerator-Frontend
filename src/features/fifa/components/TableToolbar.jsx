//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: TableToolbar.jsx
//  Description: The header of a table of the page "The FIFA presidency": the search bar, how many rows are shown ("N of 211 associations", read by
//               screen readers as it changes), the filters on as chips that come off one by one, and "Clear filters" (the filters of the columns and the
//               sort, nothing else). On a phone the rows are cards: the sort is a "Sort by" select and the filters of the columns open in a sheet
//

import {useState} from "react";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Label, Select} from "@/components/ui/field.jsx";
import {Sheet} from "@/components/ui/sheet.jsx";
import {FilterOptions} from "@/features/fifa/components/ColumnFilter.jsx";
import {SearchBar} from "@/features/fifa/components/SearchBar.jsx";

// chips: [{key, value, text}] from chipsOf; onRemove(chip); sortColumns: [{key, label}] the columns that sort (a phone sorts through a select);
// defs / selected / onFilter: the filters of the table (a phone chooses them in a sheet); onClear: clears the filters of the columns and the sort
export const TableToolbar = ({
    searchLabel, searchPlaceholder, search, onSearch, count, total, noun, chips, onRemove, sorted, onClear,
    phone, sortColumns, sort, dir, onSort, defs, selected, onFilter,
}) => {
    const [open, setOpen] = useState(false);
    const choice = sort ? `${sort}:${dir}` : '';
    const options = [
        {value: '', label: 'Default order'},
        ...sortColumns.flatMap(column => [
            {value: `${column.key}:asc`, label: `${column.label}, ascending`},
            {value: `${column.key}:desc`, label: `${column.label}, descending`},
        ]),
    ];

    return (
        <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <SearchBar label={searchLabel} placeholder={searchPlaceholder} value={search} onChange={onSearch}/>
                {phone && (
                    <>
                        <div className="w-full">
                            <Label htmlFor="table-sort-by" className="!mb-1 !text-[0.8125rem] !text-ink-mute">Sort by</Label>
                            <Select id="table-sort-by" value={choice} options={options}
                                    onChange={event => {
                                        // the key of a column may hold a colon (support:Q12): the direction is after the last one
                                        const value = event.target.value;
                                        const cut = value.lastIndexOf(':');
                                        onSort(cut < 0 ? '' : value.slice(0, cut), cut < 0 ? 'asc' : value.slice(cut + 1));
                                    }}/>
                        </div>
                        <Button size="sm" onClick={() => setOpen(true)}>Filters{chips.length > 0 && ` (${chips.length})`}</Button>
                    </>
                )}
                <p role="status" className="caption pb-3">{count} of {total} {noun}</p>
            </div>

            {(chips.length > 0 || sorted) && (
                <div className="flex flex-wrap items-center gap-2">
                    {chips.length > 0 && (
                        <ul aria-label="Active filters" className="flex flex-wrap gap-2">
                            {chips.map(chip => (
                                <li key={`${chip.key}:${chip.value}`} className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper-deep py-0.5 pr-1 pl-3 text-[0.8125rem]">
                                    {chip.text}
                                    <button type="button" aria-label={`Remove filter ${chip.text}`} onClick={() => onRemove(chip)}
                                            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-rule/60 hover:text-ink">
                                        <X aria-hidden className="size-3.5"/>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button type="button" onClick={onClear} className="link cursor-pointer text-[0.8125rem]">Clear filters</button>
                </div>
            )}

            {phone && (
                <Sheet open={open} onOpenChange={setOpen} title="Filters" description="Filters of the columns">
                    <div className="space-y-6 pb-4">
                        {Object.keys(defs).map(key => <FilterOptions key={key} def={defs[key]} values={selected[key] ?? []} onChange={values => onFilter(key, values)}/>)}
                        {(chips.length > 0 || sorted) && <button type="button" onClick={onClear} className="link cursor-pointer text-[0.875rem]">Clear filters</button>}
                    </div>
                </Sheet>
            )}
        </div>
    );
};
