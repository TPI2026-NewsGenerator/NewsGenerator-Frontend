//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: SourceField.jsx
//  Description: The optional field "Add a source (link)" next to a choice of a candidate: the link of a page that says what the reader chose. It is sent with the
//               choice (the vote "Supported by {country}" or "Not supported" of the detail of a candidate); the AI reads the page in the
//               background and it never changes a colour. What the server refuses (not an address, private, too many) is said by the choice, not here
//

import {useId} from "react";
import {Input, Label} from "@/components/ui/field.jsx";

// value / onChange(text): the link typed; hint: where the link goes (it depends on the choices next to the field); disabled: a choice is being sent
export const SourceField = ({value, onChange, hint, disabled = false}) => {
    const id = useId();
    return (
        <div className="mt-3 max-w-[34rem]">
            <Label htmlFor={id} className="!mb-1 !text-[0.8125rem] !text-ink-mute">Add a source (link)</Label>
            <Input id={id} type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://…" value={value} disabled={disabled}
                   aria-describedby={`${id}-hint`} onChange={event => onChange(event.target.value)} className="!h-9 !text-[0.9375rem]"/>
            <p id={`${id}-hint`} className="caption mt-1">{hint}</p>
        </div>
    );
};
