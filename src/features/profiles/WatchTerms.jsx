//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: WatchTerms.jsx
//  Description: The names or words the reader follows: every news of the window that names one is
//               shown in a section of the briefing of its own, whatever the AI chose
//

import {useState} from "react";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Help, Input, Label} from "@/components/ui/field.jsx";

// terms: the ones saved; max: how many at most; onSave(terms) answers once the server did. A term added
// or removed is saved at once: added to the list only, it looked followed and was not
export const WatchTerms = ({terms, max = 20, busy, onSave}) => {
    const [draft, setDraft] = useState('');
    // the terms being saved, shown at once: the saved ones again once the server answers, whatever it says
    const [saving, setSaving] = useState(null);
    const list = saving ?? terms;

    const save = async (next) => {
        setSaving(next);
        try {
            await onSave(next);
        } finally {
            setSaving(null);
        }
    };

    const add = () => {
        const term = draft.replace(/["\s]+/g, ' ').trim();
        if (busy || term.length < 2 || list.some(other => other.toLowerCase() === term.toLowerCase()) || list.length >= max) return;
        setDraft('');
        save([...list, term]);
    };

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
                    <Button onClick={add} loading={busy} disabled={busy || draft.trim().length < 2 || list.length >= max}>Add</Button>
                </div>
                <Help>
                    Found as a whole word in the titles and descriptions, accents and case aside. A short word in
                    capitals (VAR, UEFA) is found only in capitals. Up to {max}. Saved as soon as you add or remove one.
                </Help>
            </div>

            {list.length > 0 && (
                <ul className="flex list-none flex-wrap gap-2 p-0" aria-label="The terms you follow">
                    {list.map(term => (
                        <li key={term} className="inline-flex items-center gap-1 border border-ink py-1 pr-1 pl-2.5 text-[0.9375rem]">
                            {term}
                            <button type="button" onClick={() => save(list.filter(other => other !== term))} disabled={busy}
                                    aria-label={`Stop following ${term}`} className="cursor-pointer p-0.5 text-ink-mute hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-45">
                                <X aria-hidden className="size-3.5"/>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
