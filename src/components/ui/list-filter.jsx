//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: list-filter.jsx
//  Description: The filter of a long list the reader types in (their sources: a hundred and more, to
//               look through one by one before), and how many it keeps
//

import {Input, Label} from "@/components/ui/field.jsx";

// shown only for a list long enough to need it; the list itself is filtered by the caller (matchesQuery)
export const ListFilter = ({id, label, value, onChange, shown, total, from = 8}) => total < from ? null : (
    <div className="mb-4 grid-12 items-end gap-y-2">
        <div className="col-span-12 sm:col-span-6">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type="text" enterKeyHint="search" value={value} placeholder="a name, an address, a category"
                   autoComplete="off" onChange={event => onChange(event.target.value)}/>
        </div>
        <p className="caption col-span-12 sm:col-span-6 sm:text-right" aria-live="polite">
            {value.trim() ? `${shown} of ${total}` : `${total} sources`}
        </p>
    </div>
);
