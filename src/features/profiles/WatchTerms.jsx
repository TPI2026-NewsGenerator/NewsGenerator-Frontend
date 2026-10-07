//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: WatchTerms.jsx
//  Description: The names or words the reader follows: every news of the window that names one is
//               shown in a section of the briefing of its own, whatever the AI chose
//

import {useEffect, useState} from "react";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Help, Input, Label} from "@/components/ui/field.jsx";

// terms: the ones saved; max: how many at most; onSave(terms) answers once saved
export const WatchTerms = ({terms, max = 20, busy, onSave}) => {
    const [list, setList] = useState(terms);
    const [draft, setDraft] = useState('');
    useEffect(() => setList(terms), [terms]);

    const add = () => {
        const term = draft.replace(/["\s]+/g, ' ').trim();
        if (term.length < 2 || list.some(other => other.toLowerCase() === term.toLowerCase()) || list.length >= max) return;
        setList([...list, term]);
        setDraft('');
    };
    const changed = list.join('\n') !== terms.join('\n');

    return (
        <div className="max-w-[60ch] space-y-4">
            <div>
                <Label htmlFor="watch-term">A name or a term</Label>
                <div className="mt-2 flex gap-2">
                    <Input id="watch-term" value={draft} maxLength={60} placeholder="Infantino, Lise Klaveness, VAR…"
                           onChange={event => setDraft(event.target.value)}
                           onKeyDown={event => {
                               if (event.key === 'Enter') {
                                   event.preventDefault();
                                   add();
                               }
                           }}/>
                    <Button onClick={add} disabled={draft.trim().length < 2 || list.length >= max}>Add</Button>
                </div>
                <Help>
                    Found as a whole word in the titles and descriptions, accents and case aside. A short word in
                    capitals (VAR, UEFA) is found only in capitals. Up to {max}.
                </Help>
            </div>

            {list.length > 0 && (
                <ul className="flex list-none flex-wrap gap-2 p-0" aria-label="The terms you follow">
                    {list.map(term => (
                        <li key={term} className="inline-flex items-center gap-1 border border-ink py-1 pr-1 pl-2.5 text-[0.9375rem]">
                            {term}
                            <button type="button" onClick={() => setList(list.filter(other => other !== term))}
                                    aria-label={`Stop following ${term}`} className="cursor-pointer p-0.5 text-ink-mute hover:text-accent-ink">
                                <X aria-hidden className="size-3.5"/>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <Button variant="primary" disabled={!changed || busy} loading={busy} onClick={() => onSave(list)}>
                Save the terms
            </Button>
        </div>
    );
};
