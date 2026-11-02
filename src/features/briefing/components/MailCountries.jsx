//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: MailCountries.jsx
//  Description: The countries a story shows above its title in the e-mail. The server finds them from who the
//               story names and gets some wrong: the reader unticks one, puts back one they unticked, or adds
//               another of the world before sending (the user, 02.11.2026), found by typing a few letters of its name
//               in the list of the world (the user, 03.11.2026)
//

import {useMemo, useState} from "react";
import {Checkbox, Input} from "@/components/ui/field.jsx";
import {allCountries, countryName} from "@/features/briefing/countries.js";

// a text in small letters, without accents: "cote d'ivoire" finds "Côte d’Ivoire"
const plain = (text) => String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// the countries offered under what is typed
const OFFERED = 8;

// story: {storyId, title, countries: [code]} the codes the server found; chosen: the codes the e-mail shows,
// the ones found while the reader changed nothing; onChange(codes): the codes now ticked, null to go back to
// the ones found
export const MailCountries = ({story, chosen, onChange}) => {
    const found = story.countries ?? [];
    const world = useMemo(() => allCountries(), []);
    // the countries the reader added stay listed once unticked, to be put back
    const [added, setAdded] = useState([]);
    const [typed, setTyped] = useState('');
    const listed = [...new Set([...found, ...chosen, ...added])];
    const changed = chosen.length !== found.length || chosen.some(code => !found.includes(code));
    // the ones ticked in the order of the list
    const keep = (codes) => listed.filter(code => codes.includes(code));
    const toggle = (code, kept) => onChange(keep(kept ? [...chosen, code] : chosen.filter(other => other !== code)));
    const add = (code) => {
        if (!code || listed.includes(code)) return;
        setAdded(current => [...current, code]);
        onChange([...chosen, code]);
        setTyped('');
    };
    // the countries of the world not listed yet whose name has what is typed in it, or whose code it is
    const text = plain(typed);
    const offered = text
        ? world.filter(({code, name}) => !listed.includes(code) && (plain(name).includes(text) || code.toLowerCase() === text)).slice(0, OFFERED)
        : [];

    return (
        <fieldset className="mt-2 min-w-0 border border-rule p-3">
            <legend className="kicker px-1">Countries in the e-mail</legend>
            <p className="caption">
                Shown above its title. Left as found, they are left out when the title names them already; changed, they are
                shown as you choose, none ticked shows none.
            </p>
            {listed.length > 0 && (
                <div className="mt-1 flex flex-col">
                    {listed.map(code => (
                        <Checkbox key={code} checked={chosen.includes(code)} onChange={event => toggle(code, event.target.checked)}>
                            <span className="text-[0.9375rem]">{countryName(code)}</span>
                            {!found.includes(code) && <span className="caption block">added by you</span>}
                        </Checkbox>
                    ))}
                </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="relative w-64 max-w-full">
                    <Input type="search" role="combobox" aria-expanded={offered.length > 0} aria-autocomplete="list" autoComplete="off"
                           aria-label={`Add a country to “${story.title}”`} placeholder="Search a country to add…"
                           className="h-9 text-[0.9375rem]" value={typed} onChange={event => setTyped(event.target.value)}
                           onKeyDown={event => {
                               if (event.key === 'Enter') {
                                   event.preventDefault();
                                   if (offered[0]) add(offered[0].code);
                               } else if (event.key === 'Escape') setTyped('');
                           }}/>
                    {offered.length > 0 && (
                        <ul role="listbox" aria-label="Countries found" className="absolute z-10 mt-1 max-h-60 w-full list-none overflow-auto rounded-xl border border-rule bg-paper p-1 shadow-lg">
                            {offered.map(({code, name}) => (
                                <li key={code} role="option" aria-selected="false">
                                    <button type="button" onClick={() => add(code)}
                                            className="block w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-[0.9375rem] hover:bg-paper-deep">
                                        {name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {text && offered.length === 0 && <p className="caption mt-1">No country left has “{typed.trim()}” in its name.</p>}
                </div>
                {changed && (
                    <button type="button" onClick={() => onChange(null)}
                            className="caption cursor-pointer underline underline-offset-4 hover:text-ink">
                        Back to the ones found
                    </button>
                )}
            </div>
        </fieldset>
    );
};
