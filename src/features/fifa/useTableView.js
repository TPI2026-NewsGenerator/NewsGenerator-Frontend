//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: useTableView.js
//  Description: What a table of the page "The FIFA presidency" does with what the reader chose in the address: the filters of its columns it knows, the
//               column sorted (one it does not know is none), the rows filtered and sorted (the default order settles the ties), the chips, and
//               the actions that write back to the address: sort, remove a chip, filter, clear
//

import {useMemo} from "react";
import {chipsOf, filterItems, nextSort, pickFilters, sortItems} from "@/features/fifa/table.js";

// url: the useFifaState of the page; items: the rows (searched and filtered by the page already); defs: the filters; sorts: the sorts of the columns;
// tie: the default order
export const useTableView = ({url, items, defs, sorts, tie}) => {
    const {sort: asked, dir, filters} = url.state;
    const selected = useMemo(() => pickFilters(filters, defs), [filters, defs]);
    const sort = sorts[asked] ? asked : '';
    const filtered = useMemo(() => filterItems(items, defs, selected), [items, defs, selected]);
    const shown = useMemo(() => sortItems(filtered, sorts, sort, dir, tie), [filtered, sorts, sort, dir, tie]);
    const chips = useMemo(() => chipsOf(defs, selected), [defs, selected]);

    return {
        selected, sort, dir, shown, chips, sorted: sort !== '',
        // a click on the head of a column: none, ascending, descending, none
        onSort: (key) => url.set(nextSort(sort, dir, key)),
        // the select of a phone
        setSort: (key, direction) => url.set({sort: key, dir: direction}),
        onRemove: (chip) => url.setFilter(chip.key, (selected[chip.key] ?? []).filter(value => value !== chip.value)),
        onFilter: url.setFilter,
        onClear: url.clearColumns,
    };
};
