//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: SearchBar.jsx
//  Description: The search bar of the views that are tables (List, Confederations, Presidents): a label, a field whose placeholder names what it finds,
//               a button that clears it. It is the ONE search of the page while one of those views is open (the bar of the filters of the page
//               leaves its own): the text is the `q` of the address, shared by the six views
//

import {useId} from "react";
import {X} from "lucide-react";
import {Input, Label} from "@/components/ui/field.jsx";

// label: what the bar is for ("Search associations"); placeholder: what it finds; value / onChange: the text
export const SearchBar = ({label, placeholder, value, onChange}) => {
    const id = useId();
    return (
        <div role="search" className="min-w-0 flex-1 sm:max-w-md">
            <Label htmlFor={id} className="!mb-1 !text-[0.8125rem] !text-ink-mute">{label}</Label>
            <div className="relative">
                <Input id={id} type="search" value={value} placeholder={placeholder} autoComplete="off" onChange={event => onChange(event.target.value)}
                       className="pr-11 [&::-webkit-search-cancel-button]:appearance-none"/>
                {value && (
                    <button type="button" aria-label="Clear the search" onClick={() => onChange('')}
                            className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink">
                        <X aria-hidden className="size-4"/>
                    </button>
                )}
            </div>
        </div>
    );
};
